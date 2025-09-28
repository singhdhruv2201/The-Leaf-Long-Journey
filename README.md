
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
