// Prepares the self-hosted MediaPipe assets before `dev` and `build`:
//   1. Copies the Tasks Vision Wasm runtime from node_modules into public/,
//      so the app never depends on a third-party CDN at runtime.
//   2. Verifies the committed face landmarker model against a known SHA-256.
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const WASM_SRC = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const WASM_DEST = join(root, 'public', 'mediapipe', 'wasm')
// FilesetResolver.forVisionTasks() picks the SIMD build when supported and
// falls back to the no-SIMD build otherwise; the ES-module variant is unused.
const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

// Source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
const MODEL_PATH = join(root, 'public', 'models', 'face_landmarker.task')
const MODEL_SHA256 = '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff'

async function copyWasm() {
  await mkdir(WASM_DEST, { recursive: true })
  for (const file of WASM_FILES) {
    await copyFile(join(WASM_SRC, file), join(WASM_DEST, file))
  }
  console.log(`[setup-mediapipe] Copied ${WASM_FILES.length} Wasm files to public/mediapipe/wasm`)
}

async function verifyModel() {
  let data
  try {
    data = await readFile(MODEL_PATH)
  } catch {
    throw new Error(`Model not found at ${MODEL_PATH}. See public/models/README.md.`)
  }
  const hash = createHash('sha256').update(data).digest('hex')
  if (hash !== MODEL_SHA256) {
    throw new Error(`Model checksum mismatch: expected ${MODEL_SHA256}, got ${hash}`)
  }
  console.log('[setup-mediapipe] Verified face_landmarker.task checksum')
}

try {
  await copyWasm()
  await verifyModel()
} catch (err) {
  console.error(`[setup-mediapipe] ${err instanceof Error ? err.message : err}`)
  process.exit(1)
}
