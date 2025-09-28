The Leaf-Long Journey — a Three.js demo scene (previously "punch-the-rec").

Assets include example environments under `assets/` and a project logo at `assets/Gemini_Generated_logo_fall_background.png`.

Change log (2025-09-21):
- Increased player movement speed constants in `main.js` to give a quicker "moment" feel:
  - `speed` changed to 9.0 m/s
  - `runSpeed` changed to 14.0 m/s
  - `accel` changed to 28.0 m/s^2
  - `rotationLerp` changed to 18.0

How to tweak movement:
- Open `main.js` and search for the movement constants near the player controller comment block. Adjust `speed` and `accel` to taste.

How to test locally:
- Serve the folder with a static server (e.g., `npx http-server .` or `python3 -m http.server`) and open `index.html` in a browser.
- Start the scene with the Start button and use WASD / arrow keys to move. Adjust constants and reload to iterate.

Notes:
- The file `main.js` imports modules from CDNs and is intended for browser execution; Node `--check` will not parse those ESM imports unless configured for ESM.

Collision testing and tuning:
- The road model (`assets/road.glb`) now has a Cannon Trimesh added at physics init so the player should not pass through the road geometry.
  - To test collisions: start a static server and open the scene, then try to walk into parts of the road model. The player is represented by an invisible capsule-shaped physics body (capsule approximated with cylinder + sphere caps). If you clip through geometry, try increasing `PLAYER_RADIUS` or ensure the road Trimesh was added without errors (check DevTools console for "Road trimesh added to physics world at init").
- Tuning player physics in `main.js`:
  - `PLAYER_RADIUS` (default 0.45) controls collision clearance — increase to make the player bulkier.
  - `PLAYER_MASS` affects inertia when colliding with dynamic bodies (static road is mass 0).
  - `playerBody.linearDamping` (default 0.15) controls sliding friction; increase to reduce sliding.

Sprint and collision improvements:
- Sprint is now bound to the Shift key (hold Shift to use `runSpeed`).
- The player collision shape was improved: a capsule-like compound (cylinder + sphere caps) is used for smoother, less snaggy collisions.
- Camera FOV increased to 70 for a wider view. Adjust `new THREE.PerspectiveCamera(70, ...)` in `main.js` to change the FOV.

Road texture:
- The image `assets/Untitled_0.png` is now applied as the diffuse (albedo) texture for `assets/road.glb` when UVs are present.
- If the texture appears stretched or tiled, edit `main.js` where `roadTexture` is loaded and set `roadTexture.repeat.set(x,y)` and `roadTexture.offset.set(u,v)` to adjust tiling/placement. Also ensure `c.geometry.attributes.uv` is present on the mesh (GLB usually has UVs baked in).
