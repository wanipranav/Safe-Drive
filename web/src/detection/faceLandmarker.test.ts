import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FACE_LANDMARKER_MODEL_PATH,
  FaceLandmarkerLoadError,
  MEDIAPIPE_WASM_PATH,
  createFaceLandmarker,
} from './faceLandmarker'

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: vi.fn() },
  FaceLandmarker: { createFromOptions: vi.fn() },
}))

const forVisionTasks = vi.mocked(FilesetResolver.forVisionTasks)
const createFromOptions = vi.mocked(FaceLandmarker.createFromOptions)
const fileset = { wasmLoaderPath: 'loader.js', wasmBinaryPath: 'binary.wasm' }
const fakeLandmarker = { close: vi.fn() } as unknown as FaceLandmarker

beforeEach(() => {
  vi.resetAllMocks()
  forVisionTasks.mockResolvedValue(fileset)
})

describe('createFaceLandmarker', () => {
  it('loads self-hosted assets with the GPU delegate in VIDEO mode', async () => {
    createFromOptions.mockResolvedValue(fakeLandmarker)

    const result = await createFaceLandmarker()

    expect(result).toEqual({ landmarker: fakeLandmarker, delegate: 'GPU' })
    expect(forVisionTasks).toHaveBeenCalledWith('/mediapipe/wasm')
    expect(createFromOptions).toHaveBeenCalledTimes(1)
    expect(createFromOptions).toHaveBeenCalledWith(
      fileset,
      expect.objectContaining({
        baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate: 'GPU' },
        runningMode: 'VIDEO',
        outputFacialTransformationMatrixes: true,
      }),
    )
  })

  it('falls back to the CPU delegate when GPU initialization fails', async () => {
    createFromOptions
      .mockRejectedValueOnce(new Error('WebGL unavailable'))
      .mockResolvedValueOnce(fakeLandmarker)

    const result = await createFaceLandmarker()

    expect(result.delegate).toBe('CPU')
    expect(createFromOptions).toHaveBeenLastCalledWith(
      fileset,
      expect.objectContaining({
        baseOptions: expect.objectContaining({ delegate: 'CPU' }),
      }),
    )
  })

  it('throws a FaceLandmarkerLoadError when both delegates fail', async () => {
    createFromOptions.mockRejectedValue(new Error('model fetch failed'))

    await expect(createFaceLandmarker()).rejects.toBeInstanceOf(FaceLandmarkerLoadError)
    expect(createFromOptions).toHaveBeenCalledTimes(2)
  })

  it('throws a FaceLandmarkerLoadError when the Wasm runtime fails to load', async () => {
    forVisionTasks.mockRejectedValue(new Error('404'))

    await expect(createFaceLandmarker()).rejects.toThrow('Failed to load the MediaPipe runtime.')
    expect(createFromOptions).not.toHaveBeenCalled()
  })

  it('exposes asset paths relative to the Vite base URL', () => {
    expect(MEDIAPIPE_WASM_PATH).toBe('/mediapipe/wasm')
    expect(FACE_LANDMARKER_MODEL_PATH).toBe('/models/face_landmarker.task')
  })
})
