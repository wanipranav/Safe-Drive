import cv2
import dlib
import numpy as np
import imutils
import winsound
from collections import deque

# ---------- Config ----------
PREDICTOR_PATH = "shape_predictor_68_face_landmarks.dat"

DROWSY_ALARM_SOUND = "beep.wav"    # drowsiness
DISTRACT_ALARM_SOUND = "alarm.wav" # distraction

# thresholds tuned from your face & sensitivity settings
EAR_THRESH = 0.24               # eyes: below this => likely closed
MAR_THRESH = 0.18               # mouth: above this => likely yawn

EAR_CONSEC_FRAMES = 5           # how long eyes must stay closed
SMOOTH_WINDOW = 6               # smoothing window for EAR/MAR

# distraction thresholds (sensitive)
DISTRACT_OFFSET_THRESH = 0.18   # how far from center (0–1)
DISTRACT_CONSEC_FRAMES = 10     # frames looking to side
NO_FACE_CONSEC_FRAMES = 8       # frames with no face at all

# dlib 68-point indices
LEFT_EYE_IDX = [42, 43, 44, 45, 46, 47]
RIGHT_EYE_IDX = [36, 37, 38, 39, 40, 41]
MOUTH_IDX = [60, 61, 62, 63, 64, 65, 66, 67]


# ---------- Helper functions ----------
def euclidean(p1, p2):
    return np.linalg.norm(p1 - p2)


def eye_aspect_ratio(eye):
    A = euclidean(eye[1], eye[5])
    B = euclidean(eye[2], eye[4])
    C = euclidean(eye[0], eye[3])
    if C == 0:
        return 0.0
    return (A + B) / (2.0 * C)


def mouth_aspect_ratio(mouth):
    A = euclidean(mouth[2], mouth[6])
    B = euclidean(mouth[3], mouth[5])
    C = euclidean(mouth[0], mouth[4])
    if C == 0:
        return 0.0
    return (A + B) / (2.0 * C)


def shape_to_np(shape, num_points=68):
    coords = np.zeros((num_points, 2), dtype="int")
    for i in range(num_points):
        coords[i] = (shape.part(i).x, shape.part(i).y)
    return coords


# ---------- Alarm system using WAV files ----------
alarm_state = "none"   # "none", "drowsy", "distract"


def start_alarm(sound_file: str):
    # loop sound asynchronously until stopped
    winsound.PlaySound(
        sound_file,
        winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_LOOP
    )


def stop_alarm():
    winsound.PlaySound(None, winsound.SND_PURGE)


# ---------- Init ----------
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(PREDICTOR_PATH)

eye_counter = 0
ear_history = deque(maxlen=SMOOTH_WINDOW)
mar_history = deque(maxlen=SMOOTH_WINDOW)

distract_counter = 0          # for side offset
no_face_counter = 0           # for face completely gone

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = imutils.resize(frame, width=800)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = frame.shape[:2]

    # -------- Face detection (with upsample) --------
    faces = detector(gray, 0)
    if len(faces) == 0:
        faces = detector(gray, 1)

    alert_text = ""
    new_state = "none"

    if len(faces) == 0:
        no_face_counter += 1
        cv2.putText(frame, "No face detected", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        if no_face_counter >= NO_FACE_CONSEC_FRAMES:
            new_state = "distract"
            alert_text = "Alert: Driver not in view – Focus on road!"
    else:
        no_face_counter = 0
        face = faces[0]

        # ------------- Landmarks -------------
        shape = predictor(gray, face)
        shape = shape_to_np(shape)

        left_eye = shape[LEFT_EYE_IDX]
        right_eye = shape[RIGHT_EYE_IDX]
        mouth = shape[MOUTH_IDX]

        left_ear = eye_aspect_ratio(left_eye)
        right_ear = eye_aspect_ratio(right_eye)
        ear = (left_ear + right_ear) / 2.0
        mar = mouth_aspect_ratio(mouth)

        ear_history.append(ear)
        mar_history.append(mar)
        ear_smooth = float(np.mean(ear_history))
        mar_smooth = float(np.mean(mar_history))

        # ---------- Distraction: left/right offset ----------
        face_center_x = (face.left() + face.right()) / 2.0
        frame_center_x = w / 2.0
        offset_norm = abs(face_center_x - frame_center_x) / frame_center_x

        if offset_norm > DISTRACT_OFFSET_THRESH:
            distract_counter += 1
        else:
            distract_counter = 0

        distracted_side = distract_counter >= DISTRACT_CONSEC_FRAMES

        # ---------- Debug text ----------
        cv2.putText(frame, f"EAR: {ear_smooth:.2f} (thr {EAR_THRESH:.2f})",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        cv2.putText(frame, f"MAR: {mar_smooth:.2f} (thr {MAR_THRESH:.2f})",
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        cv2.putText(frame, f"Offset: {offset_norm:.2f}",
                    (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

        # ---------- Drowsiness logic ----------
        eyes_closed = ear_smooth < EAR_THRESH
        mouth_wide = mar_smooth > MAR_THRESH

        if eyes_closed:
            eye_counter += 1
        else:
            eye_counter = 0

        drowsy_eyes = eye_counter >= EAR_CONSEC_FRAMES
        drowsy_yawn = mouth_wide
        drowsy = drowsy_eyes or drowsy_yawn

        # ---------- Decide state (priority: drowsy > distracted) ----------
        if drowsy:
            new_state = "drowsy"
            if drowsy_eyes:
                alert_text = "Alert: Drowsy (eyes closed) – Get Up!"
            elif drowsy_yawn:
                alert_text = "Alert: Drowsy (yawning) – Get Up!"
        elif distracted_side:
            new_state = "distract"
            side = "left" if face_center_x < frame_center_x else "right"
            alert_text = f"Alert: Eyes off road ({side}) – Focus!"

    # ---------- Alarm state machine ----------
    if new_state != alarm_state:
        # stop previous sound
        stop_alarm()
        if new_state == "drowsy":
            start_alarm(DROWSY_ALARM_SOUND)
        elif new_state == "distract":
            start_alarm(DISTRACT_ALARM_SOUND)
        alarm_state = new_state

    # ---------- Draw alert text (bottom-center) ----------
    if alert_text:
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.8
        thickness = 2
        text_size, _ = cv2.getTextSize(alert_text, font, font_scale, thickness)
        text_x = (w - text_size[0]) // 2
        text_y = h - 40
        cv2.putText(frame, alert_text, (text_x, text_y),
                    font, font_scale, (0, 0, 255), thickness + 1)

    # -------- Show frame & handle exit --------
    cv2.imshow("SafeDrive - Drowsiness & Distraction", frame)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('q') or key == 27:
        break
    if cv2.getWindowProperty("SafeDrive - Drowsiness & Distraction",
                             cv2.WND_PROP_VISIBLE) < 1:
        break

cap.release()
stop_alarm()
cv2.destroyAllWindows()
