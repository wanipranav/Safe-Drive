import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// Assets are self-hosted (see scripts/setup-mediapipe.mjs); no CDN at runtime.
const BASE = import.meta.env.BASE_URL
export const MEDIAPIPE_WASM_PATH = `${BASE}mediapipe/wasm`
export const FACE_LANDMARKER_MODEL_PATH = `${BASE}models/face_landmarker.task`

export type Delegate = 'GPU' | 'CPU'

export interface FaceLandmarkerSetup {
  landmarker: FaceLandmarker
  /** Backend the model actually loaded with. */
  delegate: Delegate
}

export class FaceLandmarkerLoadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'FaceLandmarkerLoadError'
  }
}

/**
 * Loads the MediaPipe runtime and face landmarker model in VIDEO mode.
 *
 * Tries the GPU delegate first and falls back to CPU, since WebGL support
 * varies across browsers and devices. The caller owns the returned
 * landmarker and must call `landmarker.close()` when finished.
 */
export async function createFaceLandmarker(): Promise<FaceLandmarkerSetup> {
  let fileset
  try {
    fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH)
  } catch (err) {
    throw new FaceLandmarkerLoadError('Failed to load the MediaPipe runtime.', { cause: err })
  }

  const errors: unknown[] = []
  for (const delegate of ['GPU', 'CPU'] as const) {
    try {
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_PATH, delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        // Head pose comes from the transformation matrix. Blendshapes are
        // left off to save inference time on mobile devices.
        outputFacialTransformationMatrixes: true,
        outputFaceBlendshapes: false,
      })
      return { landmarker, delegate }
    } catch (err) {
      errors.push(err)
    }
  }
  throw new FaceLandmarkerLoadError('Failed to load the face landmark model.', {
    cause: new AggregateError(errors, 'GPU and CPU delegates both failed'),
  })
}
