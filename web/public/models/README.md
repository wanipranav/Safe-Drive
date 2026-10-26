# Model assets

| File | Source | SHA-256 | License |
|---|---|---|---|
| `face_landmarker.task` (float16, v1) | https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task | `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` | Apache-2.0 (MediaPipe) |

The bundle contains the face detector, the 478-point face landmark model, the
blendshape model, and the geometry pipeline metadata used to produce facial
transformation matrices.

The model is committed so builds don't depend on network access. `npm run dev`
and `npm run build` verify its checksum via `scripts/setup-mediapipe.mjs`.
The MediaPipe Wasm runtime is not committed; that script copies it from
`node_modules` into `public/mediapipe/wasm/` (git-ignored).
