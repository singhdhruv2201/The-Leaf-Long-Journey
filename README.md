
# The Leaf Long Journey

A small, cozy Three.js exploration prototype. Wander a few autumn-themed micro-scenes — Road, Autumn Nest, Gravity Falls, and House on the Hill — while enjoying a soft, frosted UI, gentle motion-led transitions, and simple physics-driven movement.

Key features
- In-scene controls and three visual modes (Day / Afternoon / Night).
- Lightweight Motion One-based animations with a local shim fallback.

Quick start
1. Serve the project folder with a static server (examples):

```bash
# using node
npx http-server .
# or python
python3 -m http.server 5500
```

2. Open the landing page in your browser: http://localhost:8080/index.html (or the port your server uses).
3. Use the Start panel to Play → open the menu and choose an environment.
4. Controls: WASD / arrow keys to move, Shift to sprint, Space to jump, mouse to look (click to lock pointer).

Developer notes
- Animation: the project uses a small local Motion One shim (`assets/motion.min.js`) and falls back to CDN. Animations are guarded so the app works without Motion One.
- Styling: a compact Tailwind-like CSS file (`assets/tailwind.css`) provides utilities used across pages. For production, consider integrating the official Tailwind CLI/PostCSS build to purge unused CSS.
- Assets: models and thumbnails live in `assets/`. Credits for several models are shown in frosted modals on the menu page — keep attribution when reusing assets.

Tweaks & tuning
- Player movement and physics constants live in `main.js` near the player controller — edit `speed`, `runSpeed`, `accel`, and `PLAYER_RADIUS` to change feel and collision size.
- GLTF loading: model paths are defined in `main.js` (envToPath). Ensure those files exist or add graceful fallbacks if you replace assets.

Known issues & next steps
- Accessibility: modal focus trapping, ESC-to-close, and full keyboard navigation need improvement.
- Performance: consider texture compression, LODs, and a production Tailwind build.
- Robustness: add more explicit handling for failed GLTF loads and fallback thumbnails.

Credits
- Prototype and code: singhdhruv2201
- Models: individual credits are shown in the menu cards (Autumn Nest, House on the Hill, etc.). See each modal for exact attribution and license (usually CC-BY-4.0).

License
- This repository contains mixed content (user-provided assets). Check individual model credits before redistribution.

## Run inside Electron (desktop)

You can run the project as a desktop app with Electron for a self-contained experience.

1. Install dependencies:

```bash
npm install
```

2. Start Electron:

```bash
npm start
```

The Electron main entry (`electron-main.js`) will load `index.html` from the project root. A small `preload.js` exposes `window.electronAPI.openExternal(url)` for opening external links from the web code.

Note: If you see `npm run electron-dev` failing, ensure `electron` is installed (run `npm install`), and if you're on macOS you may need to grant permission to open the app the first time.

Note about Tailwind

The repository contains a `build:css` script for generating `assets/tailwind.css`. To avoid blocking `npm install` for developers who don't need to run the Tailwind build, the `tailwindcss` package was removed from `devDependencies`. If you need to rebuild the CSS, install a compatible Tailwind version and then run the build script:

```bash
# example: install a compatible Tailwind v3 version
npm install -D tailwindcss@^3.4.0
npm run build:css
```

Packaging a macOS DMG
---------------------

This repo includes an `electron-builder` configuration in `package.json` so you can create a macOS `.dmg` installer.

1. Install dev dependencies (if you haven't already):

```bash
npm install
```

2. Build the DMG:

```bash
npm run dist
```

Notes:
- Building a signed DMG and distributing via Gatekeeper requires Apple Developer signing keys and optional notarization. If you don't have a signing identity, `electron-builder` will still produce an unsigned `.dmg` in the `dist/` folder.
- To sign and notarize: set the appropriate `CSC_LINK` / `CSC_KEY_PASSWORD` env vars or configure the mac `identity` in `package.json` build settings per `electron-builder` docs.
- Building on macOS is recommended for macOS builds. Cross-building macOS packages from Linux/Windows is not supported for signed builds.
