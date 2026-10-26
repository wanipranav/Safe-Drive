# Safe-Drive Web

Browser version of Safe-Drive, built with React, TypeScript, Vite, and MediaPipe Face Landmarker.
All camera processing runs locally in the browser.

> Work in progress. Monitoring is not implemented yet.

## Requirements

- Node.js 22.12+ or 24 LTS (the versions Vite and Vitest support)
- npm

## Scripts

Run these from the `web/` directory.

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at http://localhost:5173 |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Type-check, lint, and run unit tests |
| `npm test` | Run unit tests once (`npm run test:watch` to watch) |

`dev` and `build` first run `scripts/setup-mediapipe.mjs`. It copies the MediaPipe Wasm runtime
into `public/mediapipe/wasm/` and verifies the checksum of the bundled model in `public/models/`.

## Assets

- `public/models/face_landmarker.task`: MediaPipe face landmarker model (Apache-2.0). See
  [public/models/README.md](public/models/README.md) for its source and checksum.
- `public/mediapipe/wasm/`: generated and git-ignored.
