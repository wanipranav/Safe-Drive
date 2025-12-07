# 🚗 SafeDrive – Real-Time Drowsiness & Distraction Detection

SafeDrive is an AI-powered driver safety system that detects **drowsiness**, **yawning**, **eye closure**, and **driver distraction** (looking left/right for too long) using your laptop webcam. It offers *real-time monitoring*, *audio alerts*, and a highly accurate algorithm built with **OpenCV**, **Dlib**, and **ML-based facial landmark detection**.

---

## 🎯 Features

### ✅ **Drowsiness Detection**
- Eye Aspect Ratio (EAR) monitoring  
- Detects slow blinking & eye closure  
- Dynamic calibration for higher accuracy  
- Continuous beep (from `beep.wav`) until eyes open  

### 😮 **Yawning Detection**
- Mouth Aspect Ratio (MAR) monitoring  
- Detects wide mouth opening or yawns  
- Beeps immediately if MAR exceeds threshold  

### 👀 **Driver Distraction Detection**
- Head pose estimation using 68 facial landmarks  
- Detects if you look **left**, **right**, **up**, or **down** for too long  
- Plays a separate alert (`alarm.wav`)  

### 🖥️ **Live On-Screen Dashboard**
- EAR, MAR, distraction status  
- Colored indicators for alert conditions  
- Centered red warning text:  
  **"⚠️ ALERT: YOU ARE DROWSY"**  
  **"⚠️ ALERT: DISTRACTION DETECTED"**

### 🔊 **Custom System Audio**
- `beep.wav` for drowsiness  
- `alarm.wav` for distraction  

---

## 📂 Project Structure

