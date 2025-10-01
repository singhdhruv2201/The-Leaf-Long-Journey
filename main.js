// main.js as an ES module. Imports Three.js and OrbitControls from the ESM builds.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.0/build/three.module.js';
import { CSS2DRenderer, CSS2DObject } from 'https://cdn.jsdelivr.net/npm/three@0.152.0/examples/jsm/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.0/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

// recruiter and ragdoll removed from this build
// old top-left controls removed — menu overlay handles start/reset now
// main.js — Three.js POV scene with toon shading and a simple cartoon office

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('glcanvas');
  if (!canvas) { console.error('Canvas element not found'); return; }
  // Landing overlay behavior: animate logo then reveal menu
  try {
    const landingOverlay = document.getElementById('landingOverlay');
    const landingMenu = document.getElementById('landingMenu');
    const logoWrap = document.getElementById('logoWrap');
    if (landingOverlay && landingMenu && logoWrap) {
      // initial pop animation for logo
      logoWrap.style.transform = 'scale(0.6)';
      logoWrap.style.opacity = '0';
      requestAnimationFrame(() => {
        setTimeout(() => {
          logoWrap.style.transition = 'transform 700ms cubic-bezier(.22,.9,.32,1), opacity 420ms ease';
          logoWrap.style.transform = 'scale(1)';
          logoWrap.style.opacity = '1';
          // after logo pops, reveal menu
          setTimeout(() => { landingMenu.classList.add('menu-visible'); landingMenu.setAttribute('aria-hidden', 'false'); }, 800);
        }, 120);
      });
    }
    // wire menu buttons
    const startBtn = document.getElementById('menuStart');
    const creditsBtn = document.getElementById('menuCredits');
    if (startBtn) startBtn.addEventListener('click', () => {
      gameStarted = true;
      if (landingOverlay) landingOverlay.style.display = 'none';
      const gameActions = document.getElementById('gameActions');
      if (gameActions) {
        gameActions.style.display = 'block';
        const b = document.getElementById('punchBtn');
        if (b) { b.disabled = false; try { b.focus(); } catch (e) {} }
      }
      try {
        // Recruiter removed — show any existing DOM health label fallback if present
        const healthWrap = document.querySelector('.health-label');
        if (healthWrap) healthWrap.style.display = 'block';
      } catch (e) { /* ignore */ }
      // request pointer lock so mouse movement controls the camera without click-hold
      try { if (canvas && canvas.requestPointerLock) canvas.requestPointerLock(); } catch (e) { /* ignore */ }
    });
    if (creditsBtn) creditsBtn.addEventListener('click', () => {
      // lightweight credits modal — replace with a nicer UI if you want
      alert('Credits:\nPrototype by you. Assets: user-provided GLBs.');
    });
  } catch (e) { console.warn('Landing overlay init failed', e); }
  // enable alpha so the page background gradient is visible behind the canvas
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
// clock used by the animation loop
const clock = new THREE.Clock();
  // improve tone mapping to get richer colors
  try {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
  } catch (e) { /* ignore if not available */ }

  // CSS2D renderer for DOM labels attached to objects (health bar above head)
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  // raise z-index to ensure labelRenderer sits above all UI layers (debugging visibility)
  labelRenderer.domElement.style.zIndex = '99999';
  document.body.appendChild(labelRenderer.domElement);

  // TUNABLE: world-space vertical offset for the health label (meters)
  // Edit this value to raise/lower the label in world units. Start with small steps (0.05).
  const HEALTH_WORLD_OFFSET_Y = 0.10;

  // label references (populated after head is created)
  let labelFillEl = null;
  let labelValEl = null;
  // Game now launches as its own page (menu is separate). Start in game mode by default.
  let gameStarted = true;
  // hide any pre-attached health labels on startup (defensive)
  try { const pre = document.querySelectorAll('.health-label'); pre.forEach(p => { p.style.display = 'none'; if (p.parentNode) p.parentNode.removeChild(p); }); } catch (e) { /* ignore */ }
  // (glove/punch feature removed)

const scene = new THREE.Scene();
// Use a transparent WebGL canvas so the page background gradient shows through.
scene.background = null;
// apply a CSS gradient to the page to create a dark->light sunset background
  // Day / night background gradients
  const DAY_BG = 'linear-gradient(to bottom, #4b1a00 0%, #ff9f4d 100%)';
  const NIGHT_BG = 'linear-gradient(to bottom, #031026 0%, #07101af5 100%)';
  // determine initial mode (use persisted preference if present) but don't apply lighting yet
  let __initialNightMode = false;
  try {
    const saved = localStorage.getItem('ptr_bg_mode');
    __initialNightMode = (saved === 'night');
  } catch (e) { __initialNightMode = false; }

  // Add a bottom-left mode toggle buttons to switch between day/night backgrounds
  // Only create the UI controls when a 3D environment is actually loaded (selectedEnv present).
  let dayBtn = null;
  let nightBtn = null;
  let afternoonBtn = null;
  let isNight = __initialNightMode;
  function setNightMode(on) {
    try {
      if (on) {
        // dark/night visuals
        document.body.style.background = NIGHT_BG;
        localStorage.setItem('ptr_bg_mode', 'night');
        isNight = true;
        try { if (nightBtn) nightBtn.setAttribute('aria-pressed', 'true'); } catch (e) {}
        try { if (dayBtn) dayBtn.setAttribute('aria-pressed', 'false'); } catch (e) {}
        try { if (ambient) { ambient.color.set(0x172136); ambient.intensity = 0.40; } } catch (e) {}
        try { if (hemi) { hemi.color.set(0x223244); hemi.groundColor.set(0x071018); hemi.intensity = 0.28; } } catch (e) {}
        try { if (dirLight) { dirLight.color.set(0xa3bff4); dirLight.intensity = 0.7; } } catch (e) {}
        try { if (scene && scene.fog) { scene.fog.color.set(0x071025); scene.fog.density = 0.02; } } catch (e) {}
        try { if (renderer) renderer.toneMappingExposure = 0.75; } catch (e) {}
      } else {
        // day visuals
        document.body.style.background = DAY_BG;
        localStorage.setItem('ptr_bg_mode', 'day');
  isNight = false;
  try { if (nightBtn) nightBtn.setAttribute('aria-pressed', 'false'); } catch (e) {}
  try { if (dayBtn) dayBtn.setAttribute('aria-pressed', 'true'); } catch (e) {}
        try { if (ambient) { ambient.color.set(0xffe1b3); ambient.intensity = 0.6; } } catch (e) {}
        try { if (hemi) { hemi.color.set(0xffc98d); hemi.groundColor.set(0x332211); hemi.intensity = 0.5; } } catch (e) {}
        try { if (dirLight) { dirLight.color.set(0xffd6a3); dirLight.intensity = 2.0; } } catch (e) {}
        try { if (scene && scene.fog) { scene.fog.color.set(0xffb86b); scene.fog.density = 0.02; } } catch (e) {}
        try { if (renderer) renderer.toneMappingExposure = 1.2; } catch (e) {}
      }
    } catch (e) { /* ignore storage errors */ }
  }

// pointer lock state flags
let pointerIsLocked = false;
let awaitingEnterOnLock = false; // set when user clicks the Start button and we wait for lock event to call enterGame

  // Create a fullscreen overlay to crossfade the page background gradients smoothly
  const bgOverlay = document.createElement('div');
  bgOverlay.id = 'ptr-bg-overlay';
  Object.assign(bgOverlay.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '100000', transition: 'opacity 0.6s ease', opacity: '0'
  });
  document.body.appendChild(bgOverlay);

  // Transition state for smooth lighting/fog/background changes
  let transitionActive = false;
  let transitionStart = 0;
  let transitionDuration = 0.7; // seconds
  let transitionFromNight = false;
  let transitionToNight = false;
  // support multi-target transitions (day, night, afternoon)
  let transitionSource = null; // 'day' | 'night' | 'afternoon'
  let transitionTarget = null; // 'day' | 'night' | 'afternoon'
  // track whether we're currently in afternoon mode
  let isAfternoon = false;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpColor(cFrom, cTo, t) {
    const rf = (cFrom >> 16) & 0xff, gf = (cFrom >> 8) & 0xff, bf = cFrom & 0xff;
    const rt = (cTo >> 16) & 0xff, gt = (cTo >> 8) & 0xff, bt = cTo & 0xff;
    const r = Math.round(lerp(rf, rt, t)), g = Math.round(lerp(gf, gt, t)), b = Math.round(lerp(bf, bt, t));
    return (r << 16) | (g << 8) | b;
  }

  // Start a transition which will be animated in the main loop
  function startModeTransition(toNight, durationSec = 0.7) {
    if (transitionActive) return; // ignore while running
    transitionActive = true;
    transitionStart = (typeof clock !== 'undefined') ? clock.getElapsedTime() : (performance.now() / 1000);
    transitionDuration = Math.max(0.05, durationSec);
    transitionFromNight = isNight;
    transitionToNight = !!toNight;
  transitionSource = isAfternoon ? 'afternoon' : (isNight ? 'night' : 'day');
    transitionTarget = transitionToNight ? 'night' : 'day';
    // To produce a clean crossfade: set the overlay to show the CURRENT background,
    // then immediately switch the body's background to the TARGET. Fade the overlay out
    // to reveal the target background under it.
    try {
      const currentBg = isNight ? NIGHT_BG : DAY_BG;
      const targetBg = transitionToNight ? NIGHT_BG : DAY_BG;
      bgOverlay.style.background = currentBg;
      // ensure overlay visible initially (covers the body)
      bgOverlay.style.opacity = '1';
      // force a reflow so the overlay opacity is applied before body background changes
      // eslint-disable-next-line no-unused-expressions
      bgOverlay.offsetHeight;
      // set the body's background to the target so the overlay can fade away to reveal it
      document.body.style.background = targetBg;
    } catch (e) { /* ignore */ }
  }

  // Afternoon transition (instant-ish but we allow a short crossfade)
  function startAfternoonTransition(durationSec = 0.5) {
    try {
      // we reuse the background overlay approach: show current, set target, fade overlay
      const currentBg = isNight ? NIGHT_BG : DAY_BG;
      bgOverlay.style.background = currentBg;
      bgOverlay.style.opacity = '1';
      // ensure overlay applied
      // eslint-disable-next-line no-unused-expressions
      bgOverlay.offsetHeight;
      // set body background to a soft sky-blue for afternoon (visual target)
      const AFTERNOON_BG = '#87CEEB'; // skyblue
      document.body.style.background = AFTERNOON_BG;
      // start a smooth transition towards afternoon visuals
      transitionActive = true;
      transitionStart = (typeof clock !== 'undefined') ? clock.getElapsedTime() : (performance.now() / 1000);
      transitionDuration = Math.max(0.05, durationSec);
      transitionSource = isAfternoon ? 'afternoon' : (isNight ? 'night' : 'day');
      transitionTarget = 'afternoon';
      transitionFromNight = isNight;
      transitionToNight = false;
    } catch (e) { console.warn('startAfternoonTransition failed', e); }
  }

  // Apply afternoon visuals
  function setAfternoonMode(on) {
    try {
      if (on) {
        // remove fog entirely for clear afternoon
        try { if (scene) scene.fog = null; } catch (e) {}
        // ambient and hemisphere: soft neutral light
  // reduce intensities to make the afternoon setting less overpowering
  try { if (ambient) { ambient.color.set(0xbfdfff); ambient.intensity = 0.55; } } catch (e) {}
  try { if (hemi) { hemi.color.set(0xcfefff); hemi.groundColor.set(0xd0eaff); hemi.intensity = 0.35; } } catch (e) {}
        // directional light: overhead sun (from Y positive straight down)
        try {
          if (dirLight) {
            dirLight.color.set(0xffffff);
            // softer directional intensity for a calmer afternoon
            dirLight.intensity = 1.1;
            dirLight.position.set(0, 200, 0);
            dirLight.target.position.set(0, 0, 0);
            dirLight.updateMatrixWorld && dirLight.updateMatrixWorld();
          }
        } catch (e) {}
        // renderer exposure
  try { if (renderer) renderer.toneMappingExposure = 0.95; } catch (e) {}
      } else {
        // revert to default day mode
        try { setNightMode(false); } catch (e) {}
      }
    } catch (e) { console.warn('setAfternoonMode failed', e); }
  }

// vertical offset to tweak scene ground position (positive moves ground up, negative moves it down)
// Make this more negative to lower the entire environment so the player can stand on it.
const sceneGroundYOffset = -6.0; // lowered further so large environments sit well below the player start
// runtime computed world Y for the scene ground (set when road model loads)
let sceneGroundY = 0;

// Camera: set slightly higher and pulled back so the scene is framed correctly
// Increased FOV for a wider, more immersive feel
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 800);
// pulled back to frame a much larger environment
camera.position.set(0, 1.7, 18);
// Camera framing notes

// Lights for toon/cel shading
// sunset lighting: warm ambient and sky colors
const ambient = new THREE.AmbientLight(0xffe1b3, 0.6);
scene.add(ambient);

// warm hemisphere: warm sky and cooler ground for contrast
const hemi = new THREE.HemisphereLight(0xffc98d, 0x332211, 0.5);
scene.add(hemi);

// strong warm directional light mimicking the setting sun
// Shadows produce a large rectangular projection that can look like an overlay
// in this stylized scene. Disable shadows for the directional light to remove
// the large rectangular dark area while keeping the warm lighting color.
const dirLight = new THREE.DirectionalLight(0xffd6a3, 2.0);
dirLight.position.set(-8, 6, 4);
// disable shadow casting to avoid a large rectangular shadow projection
dirLight.castShadow = false;
// clear any heavy shadow map settings that are unnecessary when shadows are disabled
if (dirLight.shadow && dirLight.shadow.mapSize) {
  try { dirLight.shadow.mapSize.set(512, 512); } catch (e) { /* ignore */ }
}
scene.add(dirLight);

// mild exponential fog for atmospheric feel at sunset
scene.fog = new THREE.FogExp2(0xffb86b, 0.02);

// slightly warm tone mapping exposure for sunset
try { renderer.toneMappingExposure = 1.2; } catch (e) { /* ignore */ }

// Apply initial day/night lighting state (uses persisted preference)
try { setNightMode(__initialNightMode); } catch (e) { /* ignore if setNightMode not ready */ }

  // OrbitControls are available for development but disabled by default
  let controls = null;
  import('https://cdn.jsdelivr.net/npm/three@0.152.0/examples/jsm/controls/OrbitControls.js').then((m) => {
    try { controls = new m.OrbitControls(camera, renderer.domElement); controls.enabled = false; } catch (e) { /* ignore */ }
  }).catch(() => { /* ignore */ });

// Floor and walls (simple flat-shaded shapes)
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(6, 6),
  new THREE.MeshToonMaterial({ color: 0xf6e7c3 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// initially hide built-in floor; the road GLB will provide the environment
floor.visible = false;

// Back wall
const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(6, 3),
  new THREE.MeshToonMaterial({ color: 0xfff0d6 })
);
wall.position.set(0, 1.5, -3);
scene.add(wall);

// hide the back wall since we're using the road environment
wall.visible = false;

// Desk geometry
// Removed previous desk/monitor/paper props — this environment will use a road GLB model.

// Road GLB will be loaded after gltfLoader and texLoader are created further down

// Model loader
const gltfLoader = new GLTFLoader();
// read environment selection from query param (e.g. index.html?env=road)
function getQueryParam(name) {
  try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; }
}
const selectedEnv = getQueryParam('env') || null;
function envToPath(env) {
  switch ((env || '').toLowerCase()) {
    case 'scene': return 'assets/scene.glb';
    case 'leafs': return 'assets/leafs_scene.gltf';
    case 'autumn_nest':
    case 'autumn':
      return 'assets/autumn_nest/scene.gltf';
    case 'house_on_the_hill':
    case 'house-on-the-hill':
      return 'assets/house_on_the_hill/scene.gltf';
    case 'gravity-falls':
    case 'gravityfalls':
      return 'assets/gravity-falls/source/_WORLD_MODEL_gltf/GravityFalls.gltf';
    case 'road':
    default: return 'assets/road.glb';
  }
}

// Start a transition to Day (useful for switching back from Afternoon)
function startDayTransition(durationSec = 0.6) {
  if (transitionActive) return;
  transitionActive = true;
  transitionStart = (typeof clock !== 'undefined') ? clock.getElapsedTime() : (performance.now() / 1000);
  transitionDuration = Math.max(0.05, durationSec);
  transitionFromNight = isNight;
  transitionToNight = false;
  transitionSource = isAfternoon ? 'afternoon' : (isNight ? 'night' : 'day');
  transitionTarget = 'day';
  // overlay crossfade: show current and set body to day background
  try {
    const currentBg = isNight ? NIGHT_BG : (isAfternoon ? '#87CEEB' : DAY_BG);
    bgOverlay.style.background = currentBg;
    bgOverlay.style.opacity = '1';
    // force reflow
    // eslint-disable-next-line no-unused-expressions
    bgOverlay.offsetHeight;
    document.body.style.background = DAY_BG;
  } catch (e) { /* ignore */ }
}

// Toggle Afternoon on/off (exposed to UI)
function toggleAfternoon() {
  try {
    if (isAfternoon) {
      // go back to day
      startDayTransition(0.6);
    } else {
      startAfternoonTransition(0.6);
    }
  } catch (e) { console.warn('toggleAfternoon failed', e); }
}

// expose toggle helper for UI or debugging
try { window.toggleAfternoon = toggleAfternoon; } catch (e) {}
let envModelPath = null;
if (selectedEnv) {
  envModelPath = envToPath(selectedEnv);
} else {
  // No environment requested — the page should have redirected to menu.html, but handle
  // the case where the user opened index.html directly in the browser or disabled JS.
  console.log('No environment selected; landing page active.');
  // No environment notice removed to keep the landing page clean. Use the Menu page to choose environments.
}
// texture loader for road
const texLoader = new THREE.TextureLoader();
let roadTexture = null;
// load the road texture (Untitled_0.png) early so it's available when the GLB loads
texLoader.load('assets/Untitled_0.png', (tex) => {
  try {
    // GLTF expects textures with flipY = false usually
    tex.flipY = false;
    // new API: use colorSpace instead of encoding
    try { tex.colorSpace = THREE.SRGBColorSpace; } catch (e) { tex.encoding = THREE.sRGBEncoding; }
  } catch (e) { /* ignore */ }
  roadTexture = tex;
  console.log('Road texture loaded');
}, undefined, (err) => { console.warn('Failed to load road texture:', err); });

  // Environment HUD removed per UX request (no env name shown on top-left)

// --- Model loading area ---
// Loading of `assets/scene.gltf` is currently disabled because that file
// references external .bin and texture resources that are not present in
// `assets/` on the dev server (they caused 404s). Use the preview loader
// for `scene.glb` later in the file to test the new model, or place the
// missing resources into `assets/` and re-enable this loader.

  // camera will look at origin for sensible framing
  camera.lookAt(new THREE.Vector3(0,0,0));
// (glove model and texture loading removed)

// Now that gltfLoader and texLoader exist, load the road environment
let roadModel = null;

// Apply per-environment default day/night mode immediately when loading begins
try {
  const envKey = (selectedEnv || '').toLowerCase();
  if (envKey === 'gravity-falls' || envKey === 'gravityfalls') {
    // For the Gravity Falls environment, use the Afternoon preset by default
    // Use the transition helper to provide a short crossfade and apply visuals
    try { startAfternoonTransition(0.6); } catch (e) { /* fallback */ }
    try { setAfternoonMode(true); } catch (e) { /* ignore */ }
  } else if (envKey === 'house_on_the_hill' || envKey === 'house-on-the-hill' || envKey === 'houseonthehill') {
    // For the House on the Hill environment, default to Afternoon as well
    try { startAfternoonTransition(0.6); } catch (e) { /* fallback */ }
    try { setAfternoonMode(true); } catch (e) { /* ignore */ }
  } else if (envKey === 'autumn_nest' || envKey === 'autumn') {
    setNightMode(true);
  } else {
    setNightMode(false);
  }
} catch (e) { /* ignore */ }

if (envModelPath) {
  // Ensure GLTFLoader will resolve external resources (bin / images) relative
  // to the model's folder when running on static hosts like GitHub Pages.
  // We extract the base directory and filename, set the loader's resource/path
  // and then load by filename so the loader uses the configured base for
  // additional resource requests.
  try {
    const normalized = (envModelPath || '').replace(/\\\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    const resourceBase = lastSlash >= 0 ? normalized.substring(0, lastSlash + 1) : '';
    const modelFile = lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
    try { if (typeof gltfLoader.setResourcePath === 'function') gltfLoader.setResourcePath(resourceBase); } catch (e) {}
    try { if (typeof gltfLoader.setPath === 'function') gltfLoader.setPath(resourceBase); } catch (e) {}
    // load using the filename so the loader will prefix requests with the setPath/resourcePath
    gltfLoader.load(modelFile, (gltf) => {
  console.log('Environment GLTF loaded:', selectedEnv, gltf);
  roadModel = gltf.scene.clone();
  // auto-scale and center road model if necessary
  const bbox = new THREE.Box3().setFromObject(roadModel);
  const size = new THREE.Vector3(); bbox.getSize(size);
  const center = new THREE.Vector3(); bbox.getCenter(center);
  if (size.length() > 0.0001) {
    // recenter
    roadModel.position.sub(center);
    // optional auto-scale: keep scale unless extremely large/small
    const maxDim = Math.max(size.x, size.y, size.z);
  const desired = 80.0; // target approximate scene size (much larger environment)
    const s = desired / maxDim;
    // allow larger upscales for very large environment models
  // allow smaller clamped scales for very large models but cap the upper scale
    let sClamped = Math.max(0.005, Math.min(s, 20));
    // Per-environment override: Gravity Falls needs a larger autoscale to feel world-sized
    try {
      if ((selectedEnv || '').toLowerCase() === 'gravity-falls' || (selectedEnv || '').toLowerCase() === 'gravityfalls') {
        // multiply the computed scale to make the Gravity Falls model larger in the scene
        sClamped = Math.min(sClamped * 4.0, 80); // cap absolute scale to avoid extreme values
      }
      // Per-environment override: make House on the Hill larger so it feels
      // correctly proportioned to the player perspective
      try {
        const key = (selectedEnv || '').toLowerCase();
        if (key === 'house_on_the_hill' || key === 'house-on-the-hill' || key === 'houseonthehill') {
          // modest multiplier so interior/exterior scale feels right
          sClamped = Math.min(sClamped * 3.0, 80);
        }
      } catch (e) {}
    } catch (e) {}
    roadModel.scale.setScalar(sClamped);
    console.log('Auto-scaled road model by', s, 'clamped to', sClamped);
  }
  // apply stylized MeshToonMaterial that preserves the original material color or vertex colors
  roadModel.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
      try {
        // capture original color if present
        let baseColor = new THREE.Color(0xffffff);
        let useVertexColors = false;
        if (c.material && c.material.color) baseColor.copy(c.material.color);
        if (c.geometry && c.geometry.attributes && c.geometry.attributes.color) useVertexColors = true;
        // build a MeshToonMaterial to match the flat-shaded reference
        const matOpts = {
          color: baseColor,
          side: THREE.DoubleSide,
        };
        if (useVertexColors) matOpts.vertexColors = true;
        // Preserve common texture maps if the original material supplied them.
        // Also normalize texture settings so alpha/cutout maps render correctly (no black silhouettes),
        // and ensure color maps use sRGB encoding while others stay linear.
        try {
          if (c.material) {
            const src = c.material;
            // helper to normalize a copied texture
            const normalizeTex = (tex, isColor) => {
              try {
                if (tex) {
                  tex.flipY = false;
                  if (isColor) {
                    try { tex.colorSpace = THREE.SRGBColorSpace; } catch (e) { try { tex.encoding = THREE.sRGBEncoding; } catch (ee) {} }
                  } else {
                    // non-color maps should remain linear
                    try { tex.colorSpace = THREE.LinearSRGBColorSpace; } catch (e) { /* ignore */ }
                  }
                  tex.needsUpdate = true;
                }
              } catch (e) {}
              return tex;
            };

            // base color / albedo
            if (src.map && c.geometry && c.geometry.attributes && c.geometry.attributes.uv) {
              matOpts.map = normalizeTex(src.map, true);
            }
            // normal map (linear)
            if (src.normalMap) matOpts.normalMap = normalizeTex(src.normalMap, false);
            // ambient occlusion map (linear) - ensure uv2 exists when AO is used
            if (src.aoMap) {
              matOpts.aoMap = normalizeTex(src.aoMap, false);
              try {
                if (c.geometry && !c.geometry.attributes.uv2 && c.geometry.attributes.uv) {
                  c.geometry.setAttribute('uv2', c.geometry.attributes.uv.clone());
                }
              } catch (e) {}
            }
            // metalness / roughness maps (linear)
            if (src.metalnessMap) matOpts.metalnessMap = normalizeTex(src.metalnessMap, false);
            if (src.roughnessMap) matOpts.roughnessMap = normalizeTex(src.roughnessMap, false);
            // emissive map (color)
            if (src.emissiveMap) matOpts.emissiveMap = normalizeTex(src.emissiveMap, true);
            // alpha map / hair/trim textures
            if (src.alphaMap) matOpts.alphaMap = normalizeTex(src.alphaMap, false);

            // If the original material had transparency or an alpha test configured, carry that through
            try {
              if (('alphaTest' in src) && src.alphaTest) matOpts.alphaTest = src.alphaTest;
              if (('transparent' in src) && src.transparent) matOpts.transparent = !!src.transparent;
              if (('depthWrite' in src)) matOpts.depthWrite = !!src.depthWrite;
              if (('premultipliedAlpha' in src)) matOpts.premultipliedAlpha = !!src.premultipliedAlpha;
            } catch (e) {}

            // If the color map contains an alpha channel (RGBA), enable alpha/cutout defaults
            try {
              if (matOpts.map && matOpts.map.format && matOpts.map.format === THREE.RGBAFormat) {
                matOpts.transparent = true;
                if (!('alphaTest' in matOpts)) matOpts.alphaTest = 0.45; // cutout default
                if (typeof matOpts.depthWrite === 'undefined') matOpts.depthWrite = false;
              }
            } catch (e) {}
          }
        } catch (e) { /* ignore map copy errors */ }

  // Heuristic: if this mesh appears to be a tree/foliage/leaf by name, preserve its original
  // material so we don't accidentally desaturate or remove its albedo maps. This helps
  // prevent tree canopies from appearing too dark under alternate lighting modes.
  const meshName = (c.name || '').toLowerCase();
  const isFoliage = /tree|leaf|foliage|pine|spruce|branch|trunk/.test(meshName);

  // Apply the road texture only to meshes whose material indicates 'road' (legacy behavior)
        const matName = (c.material && c.material.name) ? c.material.name.toLowerCase() : '';
        if (!matOpts.map && roadTexture && c.geometry && c.geometry.attributes && c.geometry.attributes.uv && matName.includes('road')) {
          matOpts.map = roadTexture;
          try { matOpts.map.colorSpace = THREE.SRGBColorSpace; } catch (e) { try { matOpts.map.encoding = THREE.sRGBEncoding; } catch (ee) {} }
        }

        // If foliage detected, avoid replacing the original material. Instead, normalize
        // any existing color map on the original material to sRGB and reuse it.
        let newMat = null;
        if (isFoliage && c.material) {
          try {
            // normalize any color map on the existing material
            if (c.material.map) {
              try { c.material.map.flipY = false; try { c.material.map.colorSpace = THREE.SRGBColorSpace; } catch (e) { c.material.map.encoding = THREE.sRGBEncoding; } } catch (e) {}
              c.material.map.needsUpdate = true;
            }
            newMat = c.material; // reuse original material
          } catch (e) { /* fallback to toon material below if reuse fails */ }
        }
        if (!newMat) newMat = new THREE.MeshToonMaterial(matOpts);
        // set flat shading after creation to avoid warning from setValues
        try { newMat.flatShading = true; newMat.needsUpdate = true; } catch (e) { /* ignore */ }
        // preserve transparency/alpha if original material had it
        try {
          if (c.material && ('transparent' in c.material)) newMat.transparent = !!c.material.transparent;
        } catch (e) {}
        // ensure copied maps are ready for use
        try {
          if (newMat.map) { newMat.map.needsUpdate = true; }
          if (newMat.normalMap) { newMat.normalMap.needsUpdate = true; }
          if (newMat.aoMap) { newMat.aoMap.needsUpdate = true; }
          if (newMat.metalnessMap) { newMat.metalnessMap.needsUpdate = true; }
          if (newMat.roughnessMap) { newMat.roughnessMap.needsUpdate = true; }
          if (newMat.emissiveMap) { newMat.emissiveMap.needsUpdate = true; }
        } catch (e) {}
        // replace material
        try { c.material.dispose && c.material.dispose(); } catch (e) {}
        c.material = newMat;
      } catch (e) { console.warn('Failed to apply toon material to road mesh', e); }
    }
  });
  // ensure road rests on y=0
  const finalBbox = new THREE.Box3().setFromObject(roadModel);
  if (isFinite(finalBbox.min.y)) {
    // shift road so its base sits at sceneGroundYOffset
    roadModel.position.y -= finalBbox.min.y - sceneGroundYOffset;
    // compute world-level Y for the ground
    // After shifting, the model base is aligned with sceneGroundYOffset.
    // Use the configured offset as the authoritative ground Y.
    sceneGroundY = sceneGroundYOffset;
    // We compute `sceneGroundY` so other systems can reference the road's ground level,
    // but we intentionally do NOT change the player's Y here. Leave the player where they
    // are so lowering `sceneGroundYOffset` visibly moves the environment relative to the user.
  }
  console.log('Road positioning: sceneGroundY=', sceneGroundY, 'roadModel.position.y=', roadModel.position.y, 'finalBbox.min.y=', finalBbox.min.y);
  scene.add(roadModel);
  // Create and append the mode / afternoon buttons only when an environment is loaded.
  try {
    if (selectedEnv) {
      // Create separate Day and Night circular buttons (match menu button size/color)
  // Day button (toggle to day)
      dayBtn = document.createElement('button');
      dayBtn.id = 'ptr-day-btn';
      dayBtn.title = 'Switch to Day';
      dayBtn.textContent = '🌤️';
      Object.assign(dayBtn.style, {
        position: 'fixed', left: '72px', bottom: '12px', width: '48px', height: '48px', padding: '0', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '999px', zIndex: '100002', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
      });
      dayBtn.setAttribute('aria-label', 'Switch to day');
      document.body.appendChild(dayBtn);
      dayBtn.addEventListener('click', (e) => { try { startModeTransition(false, 0.7); } catch (err) {} });

  // Night button (toggle to night) — place above the day button
      nightBtn = document.createElement('button');
      nightBtn.id = 'ptr-night-btn';
      nightBtn.title = 'Switch to Night';
      nightBtn.textContent = '🌙';
      Object.assign(nightBtn.style, {
        position: 'fixed', left: '132px', bottom: '12px', width: '48px', height: '48px', padding: '0', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '999px', zIndex: '100002', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
      });
      nightBtn.setAttribute('aria-label', 'Switch to night');
      document.body.appendChild(nightBtn);
      nightBtn.addEventListener('click', (e) => { try { startModeTransition(true, 0.7); } catch (err) {} });

      // Afternoon button only for in-game exploration — make it a circular button matching the menu button
      afternoonBtn = document.createElement('button');
      afternoonBtn.id = 'ptr-afternoon-btn';
      // Use the sun emoji as the label and center it
      afternoonBtn.textContent = '☀️';
      Object.assign(afternoonBtn.style, {
        position: 'fixed', left: '12px', bottom: '12px', width: '48px', height: '48px', padding: '0', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '999px', zIndex: '100004', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
      });
      // ensure the emoji remains visible on dark background
      afternoonBtn.setAttribute('aria-label', 'Afternoon mode');
      document.body.appendChild(afternoonBtn);
  afternoonBtn.addEventListener('click', () => { try { toggleAfternoon(); } catch (e) { console.warn(e); } });

      // Top-left circular menu button
      const circleMenuBtn = document.createElement('button');
      circleMenuBtn.id = 'ptr-circle-menu';
      circleMenuBtn.title = 'Menu';
      Object.assign(circleMenuBtn.style, {
        position: 'fixed', left: '12px', top: '12px', width: '48px', height: '48px', padding: '8px', background: 'rgba(20, 20, 20, 0.6)', color: '#fff', border: 'none', borderRadius: '999px', zIndex: '100005', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
      });
      // insert SVG icon centered (keep inverted so it appears white)
      const img = document.createElement('img'); img.src = 'assets/svg/menu.svg'; img.alt = 'Menu'; img.style.width = '24px'; img.style.height = '24px'; img.style.display = 'block'; img.style.filter = 'invert(0)';
      circleMenuBtn.appendChild(img);
      circleMenuBtn.addEventListener('click', () => { window.location.href = 'menu.html'; });
      document.body.appendChild(circleMenuBtn);
    }
  } catch (e) { /* ignore UI creation errors */ }
  // Debug: compute world bbox after adding and log useful info
  try {
    const worldBbox = new THREE.Box3().setFromObject(roadModel);
    const worldSize = new THREE.Vector3(); worldBbox.getSize(worldSize);
    const worldCenter = new THREE.Vector3(); worldBbox.getCenter(worldCenter);
    console.log('Model world bbox center=', worldCenter, 'size=', worldSize);
    // If the player is far from the model or falling, teleport the player near the model center
    try {
      // Only set spawn to model center when the user hasn't provided an explicit per-environment spawn.
      // Respect explicit spawn overrides (e.g., Autumn Nest) so we don't teleport the player away from the intended start.
      const isAutumn = (selectedEnv || '').toLowerCase() === 'autumn_nest' || (selectedEnv || '').toLowerCase() === 'autumn';
      const initialPlayerX = 0; const initialPlayerY = 0; const initialPlayerZ = 10; // player initial values set earlier
      const spawnIsDefault = (Math.abs(spawn.x - initialPlayerX) < 1e-6 && Math.abs(spawn.y - initialPlayerY) < 1e-6 && Math.abs(spawn.z - initialPlayerZ) < 1e-6);
      if (!isAutumn && spawnIsDefault) {
        // set spawn to model center at a safe height above the computed ground
        const desiredFeetY = sceneGroundY + 0.6; // small clearance above ground
        // If this is the 'road' environment, try to find a car/vehicle mesh and
        // place the spawn beside it so the player starts next to the vehicle.
        const envKey = (selectedEnv || '').toLowerCase();
        if (envKey === 'road' && roadModel) {
          let best = null; let bestVol = 0;
          const vehicleRegex = /car|vehicle|kart|cart|truck|van|auto|kart_clutter|kart-clutter/i;
          roadModel.traverse((m) => {
            if (!m.isMesh) return;
            const name = (m.name || '') + '';
            if (!vehicleRegex.test(name)) return;
            // compute world bbox and use volume as score
            try {
              const b = new THREE.Box3().setFromObject(m);
              const s = new THREE.Vector3(); b.getSize(s);
              const vol = Math.abs(s.x * s.y * s.z);
              if (vol > bestVol) { bestVol = vol; best = { mesh: m, bbox: b }; }
            } catch (e) { /* ignore */ }
          });
          if (best && best.bbox) {
            const vc = new THREE.Vector3(); best.bbox.getCenter(vc);
            // offset to the side so the player doesn't spawn inside the vehicle
            const offset = 3.0; // meters to the side
            spawn.x = vc.x + offset; spawn.y = desiredFeetY; spawn.z = vc.z;
            console.log('Spawn set beside detected vehicle at', vc, 'spawn=', spawn);
            // attempt immediate reposition if physics and player exist
            try { resetPlayerToSpawn(); } catch (e) { /* will be handled later */ }
          } else {
            // fallback to world center; also log mesh names for debugging vehicle detection
            spawn.x = worldCenter.x; spawn.y = desiredFeetY; spawn.z = worldCenter.z;
            try {
              const names = [];
              roadModel.traverse((m) => { if (m.isMesh) { names.push({ name: m.name || '<noname>', bbox: (new THREE.Box3().setFromObject(m)).getSize(new THREE.Vector3()).toArray() }); } });
              console.log('Vehicle detection: no vehicle match found. Mesh sample:', names.slice(0,20));
            } catch (e) { console.log('Vehicle detection: failed to enumerate meshes', e); }
          }
        } else {
          spawn.x = worldCenter.x; spawn.y = desiredFeetY; spawn.z = worldCenter.z;
        }
      }
      // if physics body exists, move the body to the spawn location safely
      if (playerBody) {
        playerBody.position.set(spawn.x, spawn.y + (PLAYER_HEIGHT / 2), spawn.z);
        try { playerBody.velocity.set(0,0,0); } catch (e) {}
        playerBody.wakeUp && playerBody.wakeUp();
      }
      if (player) player.position.set(spawn.x, spawn.y, spawn.z);
      console.log('Player spawn moved to model center:', spawn);
    } catch (e) { console.warn('Failed to reposition player to model center', e); }
  } catch (e) { /* ignore bbox errors */ }
  // create physics collision shape (Trimesh) for the road if physics is initialized
  try {
    const addRoadTrimesh = (world) => {
      // Build a physics Trimesh by including only triangles whose face normal
      // faces sufficiently upward. This reduces blocking geometry like
      // vertical walls and small props that otherwise create impassable
      // surfaces for walking. If filtering yields no triangles, fall back
      // to the unfiltered trimesh.
  // Per-environment heuristics
  const envKey = (selectedEnv || '').toLowerCase();
  // Default threshold for what counts as 'walkable' (face normal Y component).
  // House environments may need a lower threshold to include slightly sloped floors.
  const WALKABLE_NORMAL_Y = (envKey === 'house_on_the_hill' || envKey === 'house-on-the-hill') ? 0.35 : 0.5; // threshold for upward-facing normal (0..1)
  // Exclude small decorative meshes (props) that cause blocking collisions in house scenes.
  const PROP_NAME_EXCLUDE = /fence|railing|post|lamp|pole|wire|prop|deco|plant|chair|table|cupboard|book|books|leaf|branch|grass|bush/i;
  const MIN_MESH_VOLUME = (envKey === 'house_on_the_hill' || envKey === 'house-on-the-hill') ? 0.001 : 1e-9; // world-space bbox volume threshold
      const filteredVerts = [];
      const filteredIndices = [];

      // helper tmp vectors to reduce allocations
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nrm = new THREE.Vector3();

  // iterate meshes and produce triangle list (we duplicate vertices per-triangle
  // for simplicity of index remapping)
  let totalTriangles = 0;
      roadModel.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.geometry || !mesh.geometry.isBufferGeometry) return;
        // Determine if this mesh should be skipped for collision generation based on
        // name heuristics or very small bounding boxes (common for props).
        const meshName = (mesh.name || '').toLowerCase();
        // compute world bbox volume to detect tiny props after world transform
        mesh.updateWorldMatrix(true, false);
        const mbbox = new THREE.Box3().setFromObject(mesh);
        let skipMesh = false;
        try {
          const extents = new THREE.Vector3(); mbbox.getSize(extents);
          const volume = Math.abs(extents.x * extents.y * extents.z);
          if (volume > 0 && volume < MIN_MESH_VOLUME) skipMesh = true;
        } catch (e) { /* ignore bbox errors */ }
        if (meshName && PROP_NAME_EXCLUDE.test(meshName)) skipMesh = true;
        if (skipMesh) return;
        const geom = mesh.geometry;
        const posAttr = geom.attributes.position;
        if (!posAttr) return;
        const wm = mesh.matrixWorld;

        if (geom.index) {
          const idx = geom.index.array;
          for (let i = 0; i < idx.length; i += 3) {
            const ia = idx[i], ib = idx[i + 1], ic = idx[i + 2];
            a.fromBufferAttribute(posAttr, ia).applyMatrix4(wm);
            b.fromBufferAttribute(posAttr, ib).applyMatrix4(wm);
            c.fromBufferAttribute(posAttr, ic).applyMatrix4(wm);
            ab.subVectors(b, a);
            ac.subVectors(c, a);
            nrm.crossVectors(ab, ac);
            // skip degenerate triangles
            if (nrm.lengthSq() < 1e-8) continue;
            nrm.normalize();
            totalTriangles++;
            if (nrm.y >= WALKABLE_NORMAL_Y) {
              const base = filteredVerts.length / 3;
              filteredVerts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
              filteredIndices.push(base, base + 1, base + 2);
            }
          }
        } else {
          // non-indexed geometry: vertices come in sequential triples
          for (let i = 0; i < posAttr.count; i += 3) {
            a.fromBufferAttribute(posAttr, i).applyMatrix4(wm);
            b.fromBufferAttribute(posAttr, i + 1).applyMatrix4(wm);
            c.fromBufferAttribute(posAttr, i + 2).applyMatrix4(wm);
            ab.subVectors(b, a);
            ac.subVectors(c, a);
            nrm.crossVectors(ab, ac);
            if (nrm.lengthSq() < 1e-8) continue;
            nrm.normalize();
            if (nrm.y >= WALKABLE_NORMAL_Y) {
              const base = filteredVerts.length / 3;
              filteredVerts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
              filteredIndices.push(base, base + 1, base + 2);
            }
          }
        }
      });

  // Debug: log filtering results so we can tune WALKABLE_NORMAL_Y
  console.log('Trimesh building: totalTriangles=', totalTriangles, 'keptTriangles=', filteredIndices.length / 3, 'threshold=', WALKABLE_NORMAL_Y);

  // If filtering removed everything (too strict threshold), fall back to original
  if (filteredIndices.length === 0) {
        // Build unfiltered trimesh (original behavior)
        const verts = [];
        const indices = [];
        let indexOffset = 0;
        roadModel.traverse((c) => {
          if (c.isMesh && c.geometry && c.geometry.isBufferGeometry) {
            const geom = c.geometry;
            const pos = geom.attributes.position;
            if (!pos) return;
            const worldMatrix = new THREE.Matrix4();
            c.updateWorldMatrix(true, false);
            worldMatrix.copy(c.matrixWorld);
            const v = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
              v.fromBufferAttribute(pos, i).applyMatrix4(worldMatrix);
              verts.push(v.x, v.y, v.z);
            }
            if (geom.index) {
              for (let i = 0; i < geom.index.count; i += 3) {
                indices.push(
                  geom.index.getX(i) + indexOffset,
                  geom.index.getX(i + 1) + indexOffset,
                  geom.index.getX(i + 2) + indexOffset
                );
              }
            } else {
              for (let i = 0; i < pos.count; i += 3) {
                indices.push(indexOffset + i, indexOffset + i + 1, indexOffset + i + 2);
              }
            }
            indexOffset += pos.count;
          }
        });
  if (verts.length === 0 || indices.length === 0) return null;
  console.log('Trimesh fallback: using unfiltered geometry. triangles=', indices.length / 3);
        const trimesh = new CANNON.Trimesh(verts, indices);
        const body = new CANNON.Body({ mass: 0, material: groundMaterial });
        body.addShape(trimesh);
        world.addBody(body);
        return body;
      }

  if (filteredVerts.length === 0 || filteredIndices.length === 0) return null;
  console.log('Trimesh built: walkable triangles=', filteredIndices.length / 3);
      const trimesh = new CANNON.Trimesh(filteredVerts, filteredIndices);
      const body = new CANNON.Body({ mass: 0, material: groundMaterial });
      body.addShape(trimesh);
      world.addBody(body);
      return body;
    };

    if (physicsWorld) {
      const roadBody = addRoadTrimesh(physicsWorld);
      if (roadBody) {
        console.log('Added road Trimesh to physics world. bodies=', physicsWorld.bodies.length);
        try {
          // remove the fallback plane if it exists
          if (typeof groundBody !== 'undefined' && groundBody && physicsWorld.bodies.includes(groundBody)) {
            physicsWorld.removeBody(groundBody);
            console.log('Removed flat ground body; bodies=', physicsWorld.bodies.length);
          }
        } catch (e) { /* ignore */ }

        // Snap the player's physics body to the visible road surface under the player's X/Z
        try {
          if (playerBody && typeof roadModel !== 'undefined' && roadModel) {
            // Raycast down from well above the scene at the player's X/Z to find the road surface
            const ray = new THREE.Raycaster();
            const px = playerBody.position.x;
            const pz = playerBody.position.z;
            // Start the ray high above the road to ensure intersection (use sceneGroundY as a baseline)
            const rayOrigin = new THREE.Vector3(px, sceneGroundY + 100.0, pz);
            ray.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            const hits = ray.intersectObject(roadModel, true);
            let surfaceY = null;
            if (hits && hits.length > 0) {
              surfaceY = hits[0].point.y;
            } else {
              // fallback to the computed sceneGroundY (road model base)
              surfaceY = sceneGroundY;
            }
            // compute clearance so the player's feet sit noticeably above the surface to avoid the camera
            // being visually inside geometry. Increase default clearance to give visible space.
            // Use a slightly larger clearance in house scenes to avoid visual clipping
            const DEFAULT_CLEARANCE = ((selectedEnv || '').toLowerCase().includes('house_on_the_hill') || (selectedEnv || '').toLowerCase().includes('house-on-the-hill')) ? 0.40 : 0.30; // meters above the surface
            const clearance = DEFAULT_CLEARANCE;
            // record for debug overlay
            lastSnapClearance = clearance;
            const feetY = surfaceY + clearance;
            const centerY = feetY + (PLAYER_HEIGHT / 2);
            // For dynamic player bodies, avoid hard teleport unless penetration is large.
            const currentFeetY = playerBody.position.y - (PLAYER_HEIGHT / 2);
            const penetration = feetY - currentFeetY; // positive if feet should be higher than current
            if (penetration > 0.5) {
              // large penetration: teleport upwards to avoid being deeply embedded
              playerBody.position.set(playerBody.position.x, centerY, playerBody.position.z);
              // zero vertical velocity to avoid immediate re-penetration
              try { playerBody.velocity.y = 0; } catch (e) { /* ignore */ }
            } else if (penetration > 0.02) {
              // small penetration: apply a quick upward impulse to nudge body out of geometry
              try {
                const upImpulse = Math.min(PLAYER_MASS * 2.0, penetration * PLAYER_MASS * 4.0);
                playerBody.applyImpulse(new CANNON.Vec3(0, upImpulse, 0), playerBody.position);
              } catch (e) { /* ignore */ }
            }

            // Immediately step physics a few short steps to let the solver settle contacts
            try {
              if (physicsWorld) {
                // small sub-steps to resolve collisions without a visible drop
                const settleSteps = 6;
                const settleDt = 1 / 240; // small timestep
                for (let si = 0; si < settleSteps; si++) physicsWorld.step(settleDt);
              }
            } catch (e) { /* ignore settle errors */ }

            // sync Three.js player origin (feet-level) and ensure camera local Y is eye height + bob
            if (player) player.position.set(playerBody.position.x, feetY, playerBody.position.z);
            if (camera) camera.position.y = PLAYER_EYE_HEIGHT + currentBob;
            // reset bob so we start stable
            currentBob = 0;
            // No enforced camera-world-Y adjustment here. Camera will follow the physics body
            // (player is parent of camera) and camera.local.y will be set to PLAYER_EYE_HEIGHT in init.
            console.log('Snapped and settled player to road surface at y=', surfaceY.toFixed(3), 'centerY=', centerY.toFixed(3));
          }
        } catch (e) { console.warn('Failed to snap playerBody after adding road trimesh', e); }
      }
    } else {
      // if physics isn't ready yet, stash a ref to add it inside initPhysics
      roadModel.userData._deferredAddTrimesh = addRoadTrimesh;
    }
  } catch (e) { console.warn('Failed to add road trimesh to physics world', e); }
  }, (xhr) => {
  try {
    // xhr.loaded/xhr.total may be undefined for some loaders; guard and show percent when available
    const hud = document.getElementById('ptr-load-hud');
      if (hud) {
      if (xhr && xhr.lengthComputable && xhr.total) {
        // Guard against cases where loaded may exceed total (server chunking / multiple requests)
        let pct = Math.round((xhr.loaded / xhr.total) * 100);
        if (!Number.isFinite(pct)) pct = 0;
        pct = Math.max(0, Math.min(100, pct));
        hud.textContent = `Loading: ${pct}%`;
      } else if (xhr && typeof xhr.loaded === 'number') {
        hud.textContent = `Loading...`;
      }
    }
  } catch (e) {}
  }, (err) => { console.warn('Failed to load road model:', err); });
  } catch (e) { console.warn('GLTFLoader path set failed', e); }
} else {
  // No environment selected — skip GLTF loading to avoid loader errors when envModelPath is null
  console.log('Skipping GLTF load: envModelPath is not set.');
}

// (recruiter group and preview removed)

// --- Physics state (ragdoll removed) ---
let physicsWorld = null;
let physicsBodies = [];
let physicsVisuals = [];
let physicsConstraints = [];
// physics body for the player (so collisions with road trimesh block movement)
let playerBody = null;
// fallback flat ground plane body (module-level so loaders can remove it when a Trimesh is added)
let groundBody = null;
// last clearance used when snapping the player to the road (for debug overlay)
let lastSnapClearance = null;
// user-adjustable clearance from the debug slider (meters). If null, use default snap clearance.
let userClearance = null;
// Shared materials so we can tune friction/restitution between player and ground/trimesh
let groundMaterial = new CANNON.Material('groundMaterial');
let playerMaterial = new CANNON.Material('playerMaterial');

function applyClearanceNow(c) {
  if (!playerBody) return;
  // compute the surface under the player's X/Z using raycast against roadModel if available
  let surfaceY = sceneGroundY;
  try {
    if (roadModel) {
      const rr = new THREE.Raycaster();
      const px = playerBody.position.x; const pz = playerBody.position.z;
      rr.set(new THREE.Vector3(px, sceneGroundY + 100.0, pz), new THREE.Vector3(0, -1, 0));
      const hits = rr.intersectObject(roadModel, true);
      if (hits && hits.length > 0) surfaceY = hits[0].point.y;
    }
  } catch (e) { /* ignore ray errors */ }
  const clearance = (typeof c === 'number' && !isNaN(c)) ? c : 0.30;
  lastSnapClearance = clearance;
  const feetY = surfaceY + clearance;
  const centerY = feetY + (PLAYER_HEIGHT / 2);
  // For dynamic bodies avoid a hard teleport unless the penetration is large.
  try {
    const currentFeetY = playerBody.position.y - (PLAYER_HEIGHT / 2);
    const penetration = feetY - currentFeetY;
    if (playerBody.type === CANNON.Body.KINEMATIC) {
      playerBody.position.set(playerBody.position.x, centerY, playerBody.position.z);
    } else {
      if (penetration > 0.5) {
        playerBody.position.set(playerBody.position.x, centerY, playerBody.position.z);
        if (playerBody.velocity) playerBody.velocity.y = 0;
      } else if (penetration > 0.01) {
        // small push upward
        try { playerBody.applyImpulse(new CANNON.Vec3(0, Math.min(PLAYER_MASS * 2.0, penetration * PLAYER_MASS * 4.0), 0), playerBody.position); } catch (e) {}
      }
    }
  } catch (e) { /* ignore */ }
  // sync visuals
  if (player) player.position.set(playerBody.position.x, feetY, playerBody.position.z);
  if (camera) camera.position.y = PLAYER_EYE_HEIGHT + currentBob;
}

function initPhysics() {
  physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  physicsWorld.broadphase = new CANNON.NaiveBroadphase();
  // increase solver iterations to improve contact resolution with Trimesh
  physicsWorld.solver.iterations = 20;
  // add a large static ground so bodies land on something matching the scene
  // Use the shared groundMaterial so we can tune friction
  groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
  const groundShape = new CANNON.Plane();
  groundBody.addShape(groundShape);
  // rotate plane to be horizontal (facing up)
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  // position at y=0 to match road GLB placement
  groundBody.position.set(0, 0, 0);
  physicsWorld.addBody(groundBody);
  console.log('Physics init: added ground body. bodies=', physicsWorld.bodies.length);
  // create a simple physics body for the player so collisions are resolved by cannon
  try {
    // create or recreate the player body using the helper so sizes use the PLAYER_* constants
    if (playerBody) {
      try { physicsWorld.removeBody(playerBody); } catch (e) { /* ignore */ }
      playerBody = null;
    }
    createPlayerBody();
  } catch (e) { console.warn('Failed to create player physics body', e); }
  // if roadModel provided a deferred function to add a trimesh, call it now
  try {
    if (typeof roadModel !== 'undefined' && roadModel && roadModel.userData && roadModel.userData._deferredAddTrimesh) {
      const adder = roadModel.userData._deferredAddTrimesh;
      const tb = adder(physicsWorld);
      if (tb) {
        console.log('Road trimesh added to physics world at init');
        // optional: remove the flat plane fallback so collisions use the trimesh
        try { physicsWorld.removeBody(groundBody); } catch (e) { /* ignore */ }
      }
      delete roadModel.userData._deferredAddTrimesh;
    }
  } catch (e) { console.warn('Failed to add deferred road trimesh in initPhysics', e); }
  // Create a contact material between player and ground so friction is applied
  try {
    const contact = new CANNON.ContactMaterial(playerMaterial, groundMaterial, {
      // reduce friction so the player doesn't stick to geometry
      friction: 0.28,
      restitution: 0.0,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 3
    });
    physicsWorld.addContactMaterial(contact);
  } catch (e) { /* ignore contact material errors */ }
}

// Top-level helper to (re)create the player physics body using current PLAYER_* constants.
// This is declared at module/block scope so initPhysics can call it regardless of other
// inner-block helpers that may have also defined a similar function.
function createPlayerBody() {
  if (!physicsWorld) return;
  try {
    // If an existing body is present, remove it first
    if (playerBody) {
      try { physicsWorld.removeBody(playerBody); } catch (e) { /* ignore */ }
      playerBody = null;
    }
    playerBody = new CANNON.Body({ mass: PLAYER_MASS, material: playerMaterial });
    const cylHeight = Math.max(0.01, PLAYER_HEIGHT - 2 * PLAYER_RADIUS);
    try {
      const cyl = new CANNON.Cylinder(PLAYER_RADIUS, PLAYER_RADIUS, cylHeight, 8);
      const q = new CANNON.Quaternion();
      q.setFromEuler(Math.PI / 2, 0, 0, 'XYZ');
      playerBody.addShape(cyl, new CANNON.Vec3(0, 0, 0), q);
    } catch (e) {
      playerBody.addShape(new CANNON.Sphere(PLAYER_RADIUS));
    }
    const capOffset = cylHeight / 2;
    playerBody.addShape(new CANNON.Sphere(PLAYER_RADIUS), new CANNON.Vec3(0, capOffset, 0));
    playerBody.addShape(new CANNON.Sphere(PLAYER_RADIUS), new CANNON.Vec3(0, -capOffset, 0));
    // position will be set relative to the Three.js player object if available
    const px = (typeof player !== 'undefined' && player) ? player.position.x : 0;
    const py = (typeof player !== 'undefined' && player) ? player.position.y : 0;
    const pz = (typeof player !== 'undefined' && player) ? player.position.z : 0;
    playerBody.position.set(px, py + PLAYER_HEIGHT / 2, pz);
    playerBody.fixedRotation = true;
    playerBody.updateMassProperties();
    playerBody.allowSleep = false;
  // lower linear damping so movement feels more responsive and avoids sticky stops
  playerBody.linearDamping = 0.06;
    physicsWorld.addBody(playerBody);
    playerBody.userData = playerBody.userData || {};
    console.log('Player physics body created at', playerBody.position.toString());
  } catch (e) { console.warn('createPlayerBody failed', e); }
}

// Helper: determine if the player is standing on (or very near) the ground/road
function isGrounded() {
  if (!playerBody) return false;
  const GROUNDED_EPS = 0.35; // meters tolerance for considering 'grounded'
  try {
    if (roadModel) {
      const rr = new THREE.Raycaster();
      const px = playerBody.position.x; const pz = playerBody.position.z;
      // start a little above player's feet
      // Ray from the player's center straight down and compare the hit Y to the player's feet
      const origin = new THREE.Vector3(px, playerBody.position.y, pz);
      rr.set(origin, new THREE.Vector3(0, -1, 0));
      const hits = rr.intersectObject(roadModel, true);
      if (hits && hits.length > 0) {
        const hitY = hits[0].point.y;
        const feetY = playerBody.position.y - (PLAYER_HEIGHT / 2);
        const delta = feetY - hitY; // how far the feet are above the hit point
        if (delta <= GROUNDED_EPS) return true;
      }
    }
  } catch (e) { /* ignore ray errors */ }
  // fallback: compare feet Y to computed scene ground Y
  try {
    const feetY = playerBody.position.y - (PLAYER_HEIGHT / 2);
    if (feetY <= sceneGroundY + GROUNDED_EPS) return true;
    // small vertical velocity and near-ground -> treat as grounded
    if (playerBody.velocity && Math.abs(playerBody.velocity.y) < 0.4 && feetY <= sceneGroundY + 1.0) return true;
  } catch (e) { /* ignore */ }
  return false;
}

// Ragdoll functions removed per project cleanup.

// Camera frames the origin by default
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Add the camera to the scene so any children attached to camera (gloves/debug markers)
// are included in rendering. This allows us to parent HUD-like objects to the camera.
scene.add(camera);

  // --- Simple player/camera controls for debugging ---
  // We'll treat `player` as the camera's parent so movement is applied to player and
  // mouse rotates the camera locally (pitch) while player yaw rotates the parent.
  const player = new THREE.Object3D();
  // Start the player slightly pulled back so the environment and recruiter are visible
  player.position.set(0, 0, 10);
  scene.add(player);
  // Parent the camera to the player so it follows the physics body vertically.
  // Camera local Y will be set to PLAYER_EYE_HEIGHT once that constant is defined.
  player.add(camera);
  // initial local forward offset; Y will be initialized after constants
  camera.position.set(0, 0, 0.2);

  // spawn point tracking: default to the player's initial position (feet-level)
  const spawn = { x: player.position.x, y: player.position.y, z: player.position.z };
  // If Autumn Nest, override the spawn to the requested coordinates
  try {
    if ((selectedEnv || '').toLowerCase() === 'autumn_nest' || (selectedEnv || '').toLowerCase() === 'autumn') {
      spawn.x = -106.932;
      spawn.y = -1.281;
      spawn.z = 700.884;
    }
    // If Gravity Falls, place the player at the requested spawn inside the model
    if ((selectedEnv || '').toLowerCase() === 'gravity-falls' || (selectedEnv || '').toLowerCase() === 'gravityfalls') {
      spawn.x = 1;
      spawn.y = -0.615;
      spawn.z = 4.910;
    }
  } catch (e) {}
  function resetPlayerToSpawn() {
    try {
      // compute a safe surface Y at spawn.x/z (raycast against roadModel if available)
      let surfaceY = sceneGroundY;
      try {
        if (roadModel) {
          const rr = new THREE.Raycaster();
          // ray origin well above expected scene height
          rr.set(new THREE.Vector3(spawn.x, sceneGroundY + 200.0, spawn.z), new THREE.Vector3(0, -1, 0));
          const hits = rr.intersectObject(roadModel, true);
          if (hits && hits.length > 0) surfaceY = hits[0].point.y;
        }
      } catch (e) { /* ignore ray errors */ }

      const clearance = (typeof userClearance === 'number' && !isNaN(userClearance)) ? userClearance : 0.30;
      const feetY = surfaceY + clearance;
      const centerY = feetY + (PLAYER_HEIGHT / 2);

      // reset physics body position and velocity to a safe location above the surface
      if (playerBody) {
        try {
          // teleport the body to the spawn X/Z and computed centerY
          playerBody.position.set(spawn.x, centerY, spawn.z);
          // clear velocities to avoid immediate re-penetration
          if (playerBody.velocity) playerBody.velocity.set(0, 0, 0);
          if (playerBody.angularVelocity) playerBody.angularVelocity.set(0, 0, 0);
          // wake the body and step the world a few times to settle contacts
          playerBody.wakeUp && playerBody.wakeUp();
          if (physicsWorld) {
            const settleSteps = 6;
            const settleDt = 1 / 240;
            for (let si = 0; si < settleSteps; si++) physicsWorld.step(settleDt);
          }
          // If still penetrating (feet below desired feetY), nudge upward with a small impulse
          try {
            const currentFeetY = playerBody.position.y - (PLAYER_HEIGHT / 2);
            const penetration = feetY - currentFeetY;
            if (penetration > 0.01) {
              // small upward impulse proportional to penetration but capped
              const upImpulse = Math.min(PLAYER_MASS * 1.5, penetration * PLAYER_MASS * 2.0);
              try { playerBody.applyImpulse(new CANNON.Vec3(0, upImpulse, 0), playerBody.position); } catch (e) {}
            }
          } catch (e) { /* ignore */ }
        } catch (e) { console.warn('Failed to reposition playerBody to spawn safely', e); }
      }

      // reset visual player to foot-level; camera is parented to player so it follows
      if (player) player.position.set(spawn.x, feetY, spawn.z);
      // reset camera bob and orientation
      yaw = 0; pitch = 0; currentBob = 0; walkBobTimer = 0;
    } catch (e) { console.warn('resetPlayerToSpawn failed', e); }
  }

  // debug overlay for movement state (helps when DevTools is closed)
  // ...existing code...

  let moveState = { forward: false, back: false, left: false, right: false };
  // sprint flag toggled by Shift key
  let isSprinting = false;
  let yaw = 0; // horizontal rotation on player
  let pitch = 0; // camera local pitch

  // movement speed (meters per second). Increased so movement is visually noticeable.
  // Tweak this value to make movement faster/slower during debugging.
  // movement speed (meters per second). Set to a realistic walking speed and
  // use a velocity-based system below for smooth acceleration/deceleration.
  // tuned movement: faster and snappier rotation
  // Increased speeds to give the player a brisker movement / "moment" feel.
  // Adjust these values if you want slower or faster movement.
  const speed = 14.0; // meters/second (increased walk speed)
  const runSpeed = 19.0; // optional sprint speed
  const accel = 28.0; // m/s^2 acceleration toward target speed (quicker ramp)
  const rotationLerp = 18.0; // higher = snappier camera yaw/pitch

  // Jump state & tuning
  let wantJump = false;
  let lastJumpTime = -1e9;
  let jumpRequestedAt = -1e9;
  const JUMP_COOLDOWN = 0.18; // seconds between accepted jump inputs (prevents auto-repeat)
  const JUMP_STRENGTH = 6.0; // approximate target vertical velocity (m/s) -> impulse = mass * strength
  const JUMP_REQUEST_WINDOW = 0.28; // seconds during which a jump request stays valid

  // Falling leaf system
  const LEAF_COUNT = 36;
  const LEAF_AREA_RADIUS = 40.0; // horizontal spawn radius around scene origin
  const LEAF_MIN_HEIGHT = 8.0; // relative above sceneGroundY
  const LEAF_MAX_HEIGHT = 30.0;
  const LEAF_MIN_SPEED = 0.3; // m/s
  const LEAF_MAX_SPEED = 2.2;
  let leaves = []; // { mesh, baseX, baseZ, speed, swayAmp, swayFreq, phase, rotSpeed }
  let leafTexture = null;

  function initLeaves() {
    try {
      texLoader.load('assets/leaf.png', (tex) => {
        try { tex.flipY = false; try { tex.colorSpace = THREE.SRGBColorSpace; } catch (e) { tex.encoding = THREE.sRGBEncoding; } } catch (e) {}
        leafTexture = tex;
        spawnLeavesWithTexture(tex);
      }, undefined, (err) => {
        console.warn('Leaf texture failed to load (assets/leaf.png), using fallback color', err);
        spawnLeavesWithTexture(null);
      });
    } catch (e) {
      console.warn('Leaf init error', e);
      spawnLeavesWithTexture(null);
    }
  }

  function spawnLeavesWithTexture(tex) {
    const geom = new THREE.PlaneGeometry(0.9, 0.9);
    for (let i = 0; i < LEAF_COUNT; i++) {
      const matOpts = { side: THREE.DoubleSide, transparent: true, depthWrite: false };
      if (tex) matOpts.map = tex; else matOpts.color = new THREE.Color(0x8fbf5c);
      const mat = tex ? new THREE.MeshLambertMaterial(matOpts) : new THREE.MeshBasicMaterial(matOpts);
      if (tex) { mat.alphaTest = 0.5; }
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = false; mesh.receiveShadow = false;
      // random horizontal base around origin
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * LEAF_AREA_RADIUS;
      const baseX = Math.cos(angle) * radius;
      const baseZ = Math.sin(angle) * radius;
      const y = sceneGroundY + (LEAF_MIN_HEIGHT + Math.random() * (LEAF_MAX_HEIGHT - LEAF_MIN_HEIGHT));
      mesh.position.set(baseX, y, baseZ);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const speed = LEAF_MIN_SPEED + Math.random() * (LEAF_MAX_SPEED - LEAF_MIN_SPEED);
      const swayAmp = 0.6 + Math.random() * 1.4; // meters
      const swayFreq = 0.2 + Math.random() * 1.2; // Hz
      const phase = Math.random() * Math.PI * 2;
      const rotSpeed = (Math.random() - 0.5) * 2.0; // rad/s
      mesh.userData = { baseX, baseZ, speed, swayAmp, swayFreq, phase, rotSpeed, startY: y };
      leaves.push(mesh);
      scene.add(mesh);
    }
  }

  // Toggle to enable verbose physics debug prints (default: false to avoid console spam)
  const DEBUG_PHYS = false;

  // Player physical dimensions (used by physics body and camera alignment)
  const PLAYER_RADIUS = 0.50; // meters (slightly wider for stability)
  const PLAYER_HEIGHT = 3.1; // meters (taller player)
  const PLAYER_MASS = 80.0; // kg
  const PLAYER_EYE_HEIGHT = 1.8; // camera local height from feet (meters)
  // initialize camera local Y so it sits at the player's eye height when parented
  try { camera.position.y = PLAYER_EYE_HEIGHT; } catch (e) { /* ignore if camera not yet added */ }

  // Camera bobbing state
  let walkBobTimer = 0;
  let currentBob = 0;
  const WALK_BOB_FREQ = 1.8; // steps per second ~Hz
  const WALK_BOB_AMP = 0.13; // vertical bob amplitude (meters)
  const SPRINT_BOB_FREQ = 2.6;
  const SPRINT_BOB_AMP = 0.16;
  const BOB_RETURN_LERP = 6.0; // how fast camera returns to rest when stopping

  // runtime movement state
  const currentVelocity = new THREE.Vector3(0, 0, 0); // m/s
  const targetVelocity = new THREE.Vector3(0, 0, 0);
  let smoothedYaw = yaw;
  let smoothedPitch = pitch;

  if (selectedEnv) {
    // Debug UI removed for production build: No-clip, collision debug, and debug overlay removed
  }

  // keyboard
  window.addEventListener('keydown', (e) => {
    // Only log when the state actually changes (prevents repeated logs from key auto-repeat)
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { if (!moveState.forward) { moveState.forward = true; console.log('move: forward down', e.code); } }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { if (!moveState.back) { moveState.back = true; console.log('move: back down', e.code); } }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { if (!moveState.left) { moveState.left = true; console.log('move: left down', e.code); } }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { if (!moveState.right) { moveState.right = true; console.log('move: right down', e.code); } }
    // Sprint (Shift)
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (!isSprinting) { isSprinting = true; console.log('sprint: down'); } }
    // Jump (Space)
    if (e.code === 'Space') {
      // mark an intent to jump; actual jump will only occur when grounded inside the animate loop
      if (!wantJump) {
        wantJump = true;
        try { jumpRequestedAt = clock.getElapsedTime(); } catch (ee) { jumpRequestedAt = performance.now() / 1000; }
        // avoid page scroll on Space in some browsers when canvas not focused
        try { e.preventDefault(); } catch (ee) {}
        console.log('jump: requested');
      }
    }
    // ...existing code...
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { if (moveState.forward) { moveState.forward = false; console.log('move: forward up', e.code); } }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { if (moveState.back) { moveState.back = false; console.log('move: back up', e.code); } }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { if (moveState.left) { moveState.left = false; console.log('move: left up', e.code); } }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { if (moveState.right) { moveState.right = false; console.log('move: right up', e.code); } }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (isSprinting) { isSprinting = false; console.log('sprint: up'); } }
  });

  // on-screen buttons
  const moveUpBtn = document.getElementById('moveUp');
  const moveDownBtn = document.getElementById('moveDown');
  const moveLeftBtn = document.getElementById('moveLeft');
  const moveRightBtn = document.getElementById('moveRight');
  if (moveUpBtn) moveUpBtn.addEventListener('pointerdown', () => moveState.forward = true);
  if (moveUpBtn) moveUpBtn.addEventListener('pointerup', () => moveState.forward = false);
  if (moveDownBtn) moveDownBtn.addEventListener('pointerdown', () => moveState.back = true);
  if (moveDownBtn) moveDownBtn.addEventListener('pointerup', () => moveState.back = false);
  if (moveLeftBtn) moveLeftBtn.addEventListener('pointerdown', () => moveState.left = true);
  if (moveLeftBtn) moveLeftBtn.addEventListener('pointerup', () => moveState.left = false);
  if (moveRightBtn) moveRightBtn.addEventListener('pointerdown', () => moveState.right = true);
  if (moveRightBtn) moveRightBtn.addEventListener('pointerup', () => moveState.right = false);

  // mouse drag to look
  let dragging = false; let lastX = 0; let lastY = 0;
  window.addEventListener('pointerdown', (e) => { if (e.button === 0) { dragging = true; lastX = e.clientX; lastY = e.clientY; } });
  window.addEventListener('pointerup', () => { dragging = false; });
  // pointermove: support pointer lock (movementX/Y) when active, otherwise use drag
  window.addEventListener('pointermove', (e) => {
    try {
      // if pointer locked, movementX/Y are relative and available even when not dragging
      if (pointerIsLocked && document.pointerLockElement === canvas) {
        const dx = (e.movementX || e.mozMovementX || 0) * 0.0025;
        const dy = (e.movementY || e.mozMovementY || 0) * 0.0025;
        yaw -= dx; pitch -= dy;
      } else {
        // Not pointer-locked: do not rotate camera. Keep dragging state only for UI interactions.
        return;
      }
      pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, pitch));
    } catch (e) { /* ignore */ }
  });

  // Pointer lock change handlers: hide cursor and enable continuous mouse look
  document.addEventListener('pointerlockchange', () => {
    const pl = document.pointerLockElement === canvas;
    pointerIsLocked = !!pl;
    try { document.body.style.cursor = pl ? 'none' : 'default'; } catch (e) {}
    // when pointer lock ends, ensure dragging is false so legacy drag doesn't persist
    if (!pl) dragging = false;
    // if pointer lock is released, cancel any pending enterGame waiting for lock
    if (!pl) awaitingEnterOnLock = false;
  });
  document.addEventListener('pointerlockerror', (e) => { console.warn('Pointer lock error', e); });

  // If user clicks the canvas itself, request pointer lock as an additional gesture
  try {
    if (canvas) canvas.addEventListener('click', () => { try { if (canvas.requestPointerLock) canvas.requestPointerLock(); } catch (e) {} });
  } catch (e) { /* ignore */ }

  // forward-declare enterGame so UI handlers can call it before the full menu wiring is executed later in the file
  var enterGame = function() {
    try {
      if (landingOverlay) landingOverlay.style.display = 'none';
    } catch (e) {}
    try {
      if (menuOverlay) menuOverlay.style.display = 'none';
    } catch (e) {}
    try {
      if (gameActions) gameActions.style.display = 'block';
    } catch (e) {}
    try { setNightMode(false); } catch (e) {}
  };

  // Create a simple Start overlay that appears when an env is selected and waits for a user gesture
  try {
    if (selectedEnv) {
      const startOverlay = document.createElement('div');
      Object.assign(startOverlay.style, { position: 'fixed', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', zIndex: '100005' });
      const startBox = document.createElement('div');
      Object.assign(startBox.style, { background: 'rgba(255,255,255,0.04)', padding: '18px 20px', borderRadius: '10px', color: '#fff', textAlign: 'center', fontFamily: 'sans-serif' });
  // Display a clean environment name (capitalize words and replace separators)
  const envNameRaw = String(selectedEnv || 'Environment');
  const displayName = envNameRaw.replace(/[-_]/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  startBox.innerHTML = `<div style="font-size:20px;font-weight:600;margin-bottom:8px">${displayName}</div><div style="margin-bottom:12px;color:#cbd5e1">Click to play. Your cursor will be locked for mouse-look. Press ESC to release.</div>`;
  const startBtn = document.createElement('button');
  startBtn.textContent = 'Play';
      Object.assign(startBtn.style, { padding: '10px 14px', fontSize: '14px', borderRadius: '8px', background: 'linear-gradient(180deg,#1f2937,#111827)', color: '#fff', border: 'none', cursor: 'pointer' });
      startBox.appendChild(startBtn);
  // small loader HUD inside the overlay to show loading progress
  const loadHud = document.createElement('div');
  loadHud.id = 'ptr-load-hud';
  loadHud.style.marginTop = '10px';
  loadHud.style.fontSize = '13px';
  loadHud.style.color = '#cbd5e1';
  loadHud.textContent = 'Loading...';
  startBox.appendChild(loadHud);
      startOverlay.appendChild(startBox);
      document.body.appendChild(startOverlay);

      startBtn.addEventListener('click', (ev) => {
        try {
          // request pointer lock first; when pointerlockchange runs it will set pointerIsLocked
          if (canvas && canvas.requestPointerLock) {
            awaitingEnterOnLock = true;
            canvas.requestPointerLock();
          } else {
            // fallback: if pointer lock not supported, enter the game but keep camera disabled
            startOverlay.style.display = 'none';
            enterGame();
          }
        } catch (e) { startOverlay.style.display = 'none'; enterGame(); }
      });

      // when pointer is locked and awaitingEnterOnLock is true, remove the overlay and enterGame
      document.addEventListener('pointerlockchange', () => {
        if (awaitingEnterOnLock && document.pointerLockElement === canvas) {
          awaitingEnterOnLock = false;
          try { startOverlay.style.display = 'none'; } catch (e) {}
          enterGame();
        }
      });
    }
  } catch (e) { /* ignore start overlay errors */ }


// Model loading for gloves/road handled elsewhere in this file
/*
gltfLoader.load('assets/man_in_a_suit.glb', (gltf) => {
  ...old loader + ragMeshes + mapping code...
});
*/

// Instead, load the new preview model `scene.glb` here (this replaces the old man_in_a_suit load)
  {
  const previewGlbPath = 'assets/scene.glb';
  const previewGltfPath = 'assets/scene.gltf';

    // Helper: normalize and fix a loaded model so it is visible even when textures are missing.
    // - recenters to its geometric center
    // - auto-scales to a target height
    // - shifts so its min.y sits at 0 (ground)
    // - replaces materials that have no textures with a readable MeshToonMaterial fallback
    function normalizeAndFixModel(model, desiredHeight = 1.6) {
      try {
        // compute bbox and center
        const bbox = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3(); bbox.getSize(size);
        const center = new THREE.Vector3(); bbox.getCenter(center);

        if (size.length() > 1e-5) {
          // recenter around origin
          model.position.sub(center);
          // scale to desiredHeight (based on Y axis)
          const maxDim = Math.max(size.x, size.y, size.z);
          const s = desiredHeight / maxDim;
          const sClamped = Math.max(0.02, Math.min(s, 10.0));
          model.scale.setScalar(sClamped);
        } else {
          model.scale.setScalar(1.0);
        }

        // After scaling, recompute bbox and lift so min.y === 0
        const postB = new THREE.Box3().setFromObject(model);
        if (isFinite(postB.min.y)) {
          model.position.y -= postB.min.y;
        }

        // Replace materials that have no map/textures with a MeshToon fallback
        model.traverse((c) => {
          if (c.isMesh) {
            try {
              c.castShadow = true;
              c.receiveShadow = true;
              c.visible = true;
              const mat = c.material;
              // If material has no map (texture) or map failed to load, create a readable fallback
              if (!mat || (!mat.map && (!mat.color || (mat.color && mat.color.equals(new THREE.Color(0xffffff)) && !mat.name)))) {
                const fallbackColor = (mat && mat.color) ? mat.color.clone() : new THREE.Color(0x999999);
                const newMat = new THREE.MeshToonMaterial({ color: fallbackColor, side: THREE.DoubleSide });
                try { newMat.flatShading = true; newMat.needsUpdate = true; } catch (e) {}
                c.material = newMat;
              } else if (mat && !mat.map && mat.color) {
                // keep color but convert to MeshToonMaterial for consistent look
                const newMat = new THREE.MeshToonMaterial({ color: mat.color.clone(), side: THREE.DoubleSide });
                try { newMat.flatShading = true; newMat.needsUpdate = true; } catch (e) {}
                c.material = newMat;
              }
            } catch (e) { /* ignore per-mesh errors */ }
          }
        });
      } catch (e) { console.warn('normalizeAndFixModel failed', e); }
    }

    // Helper to (re)create the player physics body using current PLAYER_* constants.
    function createPlayerBody() {
      if (!physicsWorld) return;
      try {
        playerBody = new CANNON.Body({ mass: PLAYER_MASS, material: playerMaterial });
        const cylHeight = Math.max(0.01, PLAYER_HEIGHT - 2 * PLAYER_RADIUS);
        try {
          const cyl = new CANNON.Cylinder(PLAYER_RADIUS, PLAYER_RADIUS, cylHeight, 8);
          const q = new CANNON.Quaternion();
          q.setFromEuler(Math.PI / 2, 0, 0, 'XYZ');
          playerBody.addShape(cyl, new CANNON.Vec3(0, 0, 0), q);
        } catch (e) {
          playerBody.addShape(new CANNON.Sphere(PLAYER_RADIUS));
        }
        const capOffset = cylHeight / 2;
        playerBody.addShape(new CANNON.Sphere(PLAYER_RADIUS), new CANNON.Vec3(0, capOffset, 0));
        playerBody.addShape(new CANNON.Sphere(PLAYER_RADIUS), new CANNON.Vec3(0, -capOffset, 0));
        playerBody.position.set(player.position.x, player.position.y + PLAYER_HEIGHT / 2, player.position.z);
        playerBody.fixedRotation = true;
        playerBody.updateMassProperties();
        playerBody.allowSleep = false;
        playerBody.linearDamping = 0.15;
        physicsWorld.addBody(playerBody);
        playerBody.userData = playerBody.userData || {};
        console.log('Player physics body created at', playerBody.position.toString());
      } catch (e) { console.warn('createPlayerBody failed', e); }
    }
  // animation loop start: compute time and delta
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const delta = clock.getDelta();
    // clamp extremely small deltas (can happen if clock was reset or tab thrashing)
    const dt = Math.max(delta, 1 / 60); // assume at least 1/60s per frame for movement

    // Animate mode transition if active
    try {
      if (transitionActive) {
          const now = (typeof clock !== 'undefined') ? clock.getElapsedTime() : (performance.now() / 1000);
          const elapsed = Math.max(0, now - transitionStart);
          const p = Math.min(1, elapsed / transitionDuration);
          const ease = p * (2 - p); // easeOut

          // helper to get visual params for a named mode
          const visualParamsFor = (mode) => {
            // return a minimal set of colors/intensities for interpolation
            switch (mode) {
              case 'night': return {
                ambientColor: 0x172136, ambientIntensity: 0.40,
                hemiColor: 0x223244, hemiGround: 0x071018, hemiIntensity: 0.28,
                dirColor: 0xa3bff4, dirIntensity: 0.7,
                fogColor: 0x071025, fogDensity: 0.02,
                exposure: 0.75
              };
              case 'afternoon': return {
                ambientColor: 0xbfdfff, ambientIntensity: 0.55,
                hemiColor: 0xcfefff, hemiGround: 0xd0eaff, hemiIntensity: 0.35,
                dirColor: 0xffffff, dirIntensity: 1.1,
                fogColor: 0xffb86b, fogDensity: 0.0, // afternoon clears fog
                exposure: 0.95
              };
              case 'day':
              default: return {
                ambientColor: 0xffe1b3, ambientIntensity: 0.6,
                hemiColor: 0xffc98d, hemiGround: 0x332211, hemiIntensity: 0.5,
                dirColor: 0xffd6a3, dirIntensity: 2.0,
                fogColor: 0xffb86b, fogDensity: 0.02,
                exposure: 1.2
              };
            }
          };

          try {
            const from = visualParamsFor(transitionSource || (isNight ? 'night' : (isAfternoon ? 'afternoon' : 'day')));
            const to = visualParamsFor(transitionTarget || (transitionToNight ? 'night' : 'day'));
            // ambient
            const ambCol = lerpColor(from.ambientColor, to.ambientColor, ease);
            if (ambient) { ambient.color.set(ambCol); ambient.intensity = lerp(from.ambientIntensity, to.ambientIntensity, ease); }
            // hemisphere
            const hemiCol = lerpColor(from.hemiColor, to.hemiColor, ease);
            if (hemi) { hemi.color.set(hemiCol); hemi.groundColor.set(lerpColor(from.hemiGround, to.hemiGround, ease)); hemi.intensity = lerp(from.hemiIntensity, to.hemiIntensity, ease); }
            // directional
            const dirCol = lerpColor(from.dirColor, to.dirColor, ease);
            if (dirLight) { dirLight.color.set(dirCol); dirLight.intensity = lerp(from.dirIntensity, to.dirIntensity, ease); }
            // fog: interpolate color and density; if target density == 0 treat as clearing fog
            try {
              const fogFrom = typeof from.fogColor !== 'undefined' ? from.fogColor : 0x000000;
              const fogTo = typeof to.fogColor !== 'undefined' ? to.fogColor : 0x000000;
              const fogCol = lerpColor(fogFrom, fogTo, ease);
              const fogDensity = lerp(from.fogDensity || 0.0, to.fogDensity || 0.0, ease);
              if (scene) {
                if (fogDensity <= 0.00001) {
                  // keep a minimal fog object while transitioning to fully clear so shader state is stable
                  try { if (scene.fog) { scene.fog.color.set(fogCol); scene.fog.density = Math.max(0.0, fogDensity); } else { scene.fog = new THREE.FogExp2(fogCol, Math.max(0.0, fogDensity)); } } catch (e) {}
                } else {
                  try { if (!scene.fog) scene.fog = new THREE.FogExp2(fogCol, Math.max(0.0, fogDensity)); else { scene.fog.color.set(fogCol); scene.fog.density = Math.max(0.0, fogDensity); } } catch (e) {}
                }
              }
            } catch (e) {}
            // renderer exposure
            try { if (renderer) renderer.toneMappingExposure = lerp(from.exposure, to.exposure, ease); } catch (e) {}
            // overlay opacity: fade out as we near end
            try { bgOverlay.style.opacity = String(1 - ease); } catch (e) {}
          } catch (e) { /* ignore per-visual errors */ }

          if (p >= 1.0) {
            // finalize and set stable mode
            transitionActive = false;
            try {
              if (transitionTarget === 'afternoon') {
                setAfternoonMode(true);
                isAfternoon = true;
                isNight = false;
              } else if (transitionTarget === 'night') {
                setNightMode(true);
                isNight = true;
                isAfternoon = false;
              } else {
                // day
                setNightMode(false);
                isNight = false;
                isAfternoon = false;
              }
            } catch (e) { /* ignore finalization errors */ }
            try { bgOverlay.style.opacity = '0'; } catch (e) {}
          }
      }
    } catch (e) { /* ignore transition errors */ }

  // recruiter placeholder removed — no breathing/tilt animations

  renderer.render(scene, camera);
  // render CSS2D labels on top
  if (typeof labelRenderer !== 'undefined') labelRenderer.render(scene, camera);
  // (glove/punch animation removed)
  // update player/camera from moveState and mouse look
  try {
    // apply rotations
    player.rotation.y = yaw;
    camera.rotation.x = pitch;
    // movement in local-space
    const dir = new THREE.Vector3();
    if (moveState.forward) dir.z -= 1;
    if (moveState.back) dir.z += 1;
    if (moveState.left) dir.x -= 1;
    if (moveState.right) dir.x += 1;
      if (playerBody) {
        if (dir.lengthSq() > 0) {
          dir.normalize();
          // transform direction by player yaw to world-space
          const dirWorld = new THREE.Vector3(dir.x, 0, dir.z).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
          // compute target speed in m/s (use sprint speed if sprinting)
          const moveSpeed = isSprinting ? runSpeed : speed;
          // compute desired horizontal velocity vector
          targetVelocity.copy(dirWorld).multiplyScalar(moveSpeed);
          // accelerate currentVelocity toward target
          const t = Math.min(1, accel * dt);
          currentVelocity.lerp(targetVelocity, t);
          // apply horizontal velocity to the physics body (preserve vertical velocity)
          try {
            playerBody.velocity.x = currentVelocity.x;
            playerBody.velocity.z = currentVelocity.z;
          } catch (e) { /* ignore if body doesn't have velocity yet */ }

          // small step-up helper: if a small obstacle is directly in front, attempt to step up
          try {
            const MAX_STEP = 0.34; // meters the player can step up
            const STEP_RAY_DIST = 0.6; // forward probe distance
            const probeOrigin = new THREE.Vector3(playerBody.position.x, playerBody.position.y + 0.05, playerBody.position.z);
            const forward = new THREE.Vector3(currentVelocity.x, 0, currentVelocity.z);
            if (forward.lengthSq() > 1e-6) {
              forward.normalize();
              const probePos = probeOrigin.clone().add(forward.clone().multiplyScalar(STEP_RAY_DIST));
              const upProbe = new THREE.Raycaster(probePos, new THREE.Vector3(0, -1, 0), 0, MAX_STEP + 0.02);
              const hits = roadModel ? upProbe.intersectObject(roadModel, true) : [];
              if (hits && hits.length > 0) {
                const hitY = hits[0].point.y;
                const feetY = playerBody.position.y - (PLAYER_HEIGHT / 2);
                const stepHeight = hitY - feetY;
                if (stepHeight > 0.02 && stepHeight <= MAX_STEP) {
                  // nudge player up smoothly to climb the step
                  playerBody.position.y += Math.min(stepHeight + 0.02, MAX_STEP);
                  if (playerBody.velocity) playerBody.velocity.y = 0;
                }
              }
            }
          } catch (e) { /* non-fatal */ }

          // STUCK DETECTION & SAFE NUDGE: if player is inputting move but horizontal speed is very low,
          // attempt a small, safe nudge forward so they can escape invisible traps.
          try {
            // configurable thresholds
            const STUCK_SPEED_THRESH = 0.2; // m/s considered 'stuck'
            const STUCK_FRAMES_REQUIRED = 10; // frames of low speed while input present
            const NUDGE_DISTANCE = 0.22; // meters to nudge forward
            const NUDGE_UP = 0.08; // small upward nudge to avoid embedding

            // track stuck frames on the playerBody.userData
            playerBody.userData = playerBody.userData || {};
            const horizSpeed = Math.hypot(playerBody.velocity.x || 0, playerBody.velocity.z || 0);
            const isTryingToMove = dir.lengthSq() > 0;
            if (isTryingToMove && horizSpeed < STUCK_SPEED_THRESH) {
              playerBody.userData._stuckFrames = (playerBody.userData._stuckFrames || 0) + 1;
            } else {
              playerBody.userData._stuckFrames = 0;
            }

            if ((playerBody.userData._stuckFrames || 0) >= STUCK_FRAMES_REQUIRED) {
              // probe ahead to ensure we won't nudge into a wall
              const forwardDir = new THREE.Vector3(currentVelocity.x, 0, currentVelocity.z);
              if (forwardDir.lengthSq() > 1e-6) {
                forwardDir.normalize();
                const probeOrigin = new THREE.Vector3(playerBody.position.x, playerBody.position.y + 0.2, playerBody.position.z);
                const probe = new THREE.Raycaster(probeOrigin, forwardDir, 0.05, NUDGE_DISTANCE + 0.05);
                const hits = roadModel ? probe.intersectObject(roadModel, true) : [];
                if (!hits || hits.length === 0) {
                  // safe to nudge forward
                  const nudge = forwardDir.clone().multiplyScalar(NUDGE_DISTANCE);
                  playerBody.position.x += nudge.x;
                  playerBody.position.z += nudge.z;
                  playerBody.position.y += NUDGE_UP;
                  if (playerBody.velocity) playerBody.velocity.set(0, 0.08, 0);
                  console.warn('Auto-unstuck: nudged player forward by', NUDGE_DISTANCE, 'after', playerBody.userData._stuckFrames, 'frames');
                  // reset counter so we don't repeat immediately
                  playerBody.userData._stuckFrames = 0;
                  // update debug overlay counter
                  playerBody.userData._unstuckCount = (playerBody.userData._unstuckCount || 0) + 1;
                }
              }
            }
          } catch (e) { /* ignore unstick errors */ }
        } else {
          // no input: decay horizontal velocity smoothly toward zero
          const t0 = Math.min(1, accel * dt);
          currentVelocity.lerp(new THREE.Vector3(0,0,0), t0);
          try {
            playerBody.velocity.x = currentVelocity.x;
            playerBody.velocity.z = currentVelocity.z;
          } catch (e) { /* ignore */ }
        }

        // sync Three.js player to physics body (place player's origin at the feet)
        const feetY = playerBody.position.y - (PLAYER_HEIGHT / 2);
        player.position.set(playerBody.position.x, feetY, playerBody.position.z);

          // If the player falls far below the spawn point, reset them to spawn
          try {
            const fallThreshold = 20.0; // meters below spawn to trigger reset
            if (feetY < (spawn.y - fallThreshold)) {
              console.log('Player fell below threshold, resetting to spawn');
              resetPlayerToSpawn();
            }
          } catch (e) { /* ignore */ }

  // camera bobbing: small vertical motion when walking/sprinting
      if (dir.lengthSq() > 0) {
        walkBobTimer += dt;
        const freq = isSprinting ? SPRINT_BOB_FREQ : WALK_BOB_FREQ;
        const amp = isSprinting ? SPRINT_BOB_AMP : WALK_BOB_AMP;
        const bob = Math.sin(walkBobTimer * 2 * Math.PI * freq) * amp;
        currentBob = THREE.MathUtils.lerp(currentBob, bob, Math.min(1, 12 * dt));
      } else {
        // return to rest
        currentBob = THREE.MathUtils.lerp(currentBob, 0, Math.min(1, BOB_RETURN_LERP * dt));
      }
      // apply camera local Y to eye height + bob
      camera.position.y = PLAYER_EYE_HEIGHT + currentBob;
    } else {
  // fallback: previous kinematic movement if physics body isn't available
      if (dir.lengthSq() > 0) {
        dir.normalize();
        const dirWorld = new THREE.Vector3(dir.x, 0, dir.z).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
        targetVelocity.copy(dirWorld).multiplyScalar(speed);
        const t = Math.min(1, accel * dt);
        currentVelocity.lerp(targetVelocity, t);
        const moveStep = currentVelocity.clone().multiplyScalar(dt);
        player.position.add(moveStep);
      } else {
        const t0 = Math.min(1, accel * dt);
        currentVelocity.lerp(new THREE.Vector3(0,0,0), t0);
        if (currentVelocity.lengthSq() > 1e-6) player.position.add(currentVelocity.clone().multiplyScalar(dt));
      }
    }

    // smooth yaw/pitch for camera
    smoothedYaw = THREE.MathUtils.lerp(smoothedYaw, yaw, Math.min(1, rotationLerp * dt));
    smoothedPitch = THREE.MathUtils.lerp(smoothedPitch, pitch, Math.min(1, rotationLerp * dt));
    player.rotation.y = smoothedYaw;
    camera.rotation.x = smoothedPitch;
  } catch (e) { /* defensive: player might not be defined early */ }

  // debug overlay removed

    // Coordinate HUD update removed (no 'pos:' UI element present)

  // update falling leaves
  try {
    if (leaves && leaves.length > 0) {
      for (let i = 0; i < leaves.length; i++) {
        const m = leaves[i];
        const ud = m.userData;
        // move down by speed
        const fall = ud.speed * dt;
        m.position.y -= fall;
        // sway horizontally
        const sway = Math.sin((t + ud.phase) * ud.swayFreq * 2 * Math.PI) * ud.swayAmp;
        m.position.x = ud.baseX + sway;
        m.position.z = ud.baseZ + Math.cos((t + ud.phase) * 0.5) * 0.3;
        // rotate slowly
        m.rotation.z += ud.rotSpeed * dt;
        // fade/loop: if below ground, lift to top and randomize some params
        if (m.position.y <= sceneGroundY - 1.0) {
          m.position.y = sceneGroundY + (LEAF_MIN_HEIGHT + Math.random() * (LEAF_MAX_HEIGHT - LEAF_MIN_HEIGHT));
          ud.speed = LEAF_MIN_SPEED + Math.random() * (LEAF_MAX_SPEED - LEAF_MIN_SPEED);
          ud.swayAmp = 0.4 + Math.random() * 1.6;
          ud.swayFreq = 0.2 + Math.random() * 1.2;
          ud.phase = Math.random() * Math.PI * 2;
          ud.rotSpeed = (Math.random() - 0.5) * 2.0;
        }
      }
    }
  } catch (e) { /* ignore leaf update errors */ }

  // step physics world and sync visuals
  // Physics stepping and visual sync (ragdoll removed). Keep basic body->visual sync.
  if (physicsWorld) {
    // Before stepping, handle jump requests by applying an upward impulse when grounded
    try {
      if (wantJump && playerBody) {
        const now = (typeof clock !== 'undefined') ? clock.getElapsedTime() : (performance.now() / 1000);
        // expire the request if it's too old
        if (now - jumpRequestedAt > JUMP_REQUEST_WINDOW) {
          wantJump = false;
        } else if (now - lastJumpTime > JUMP_COOLDOWN && isGrounded()) {
          // compute impulse: mass * desired velocity change
          const desiredVy = JUMP_STRENGTH; // m/s
          const impulse = Math.max(0, PLAYER_MASS * desiredVy);
          try {
            playerBody.applyImpulse(new CANNON.Vec3(0, impulse, 0), playerBody.position);
            lastJumpTime = now;
            wantJump = false; // consumed
            console.log('jump: applied impulse=', impulse.toFixed(2));
            if (DEBUG_PHYS) console.info('Jump applied impulse=', impulse.toFixed(2));
          } catch (e) { console.warn('Failed to apply jump impulse', e); }
        }
      }
    } catch (e) { /* ignore jump errors */ }

    const fixedStep = 1 / 60;
    // allow more substeps to improve collision stability when frame delta is large
    physicsWorld.step(fixedStep, dt, 5);
    try {
      // debug: log player body vertical state for a few frames to confirm gravity
      // Single-shot physics debug output when DEBUG_PHYS=true. This avoids spamming the console.
      try {
        if (!physicsWorld._physDebugPrinted && playerBody) {
          if (DEBUG_PHYS) {
            try {
              console.info('PHYS DEBUG (one-time): player pos.y=', playerBody.position.y.toFixed(3), 'vel.y=', (playerBody.velocity ? playerBody.velocity.y.toFixed(3) : 'n/a'));
            } catch (e) { console.info('PHYS DEBUG (one-time): player pos.y=', playerBody.position.y.toFixed(3)); }
          }
          physicsWorld._physDebugPrinted = true;
        }
      } catch (e) { /* ignore debug errors */ }
      for (let i = 0; i < physicsBodies.length; i++) {
        const b = physicsBodies[i];
        const m = physicsVisuals[i];
        if (m) {
          m.position.set(b.position.x, b.position.y, b.position.z);
          m.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
        }
      }
      // sync player object to playerBody if present (ensure feet-level origin)
      if (playerBody && player) {
        const feetY = playerBody.position.y - (PLAYER_HEIGHT / 2);
        player.position.set(playerBody.position.x, feetY, playerBody.position.z);
        // camera is parented to player; set local Y to eye height + bob so it follows body vertically
        camera.position.y = PLAYER_EYE_HEIGHT + currentBob;
      }
    } catch (e) { console.warn('Failed to sync physics visuals', e); }
  }
}
  // Menu and game action elements — support either the legacy `menuOverlay` or the new `landingOverlay`.
  const menuOverlay = document.getElementById('menuOverlay');
  const landingOverlay = document.getElementById('landingOverlay');
  const gameActions = document.getElementById('gameActions');
  // punch button removed from DOM; keep a safe reference if present for legacy flows
  const punchBtn = document.getElementById('punchBtn');

  // default enterGame that other code can wrap or replace
  enterGame = function() {
    if (landingOverlay) landingOverlay.style.display = 'none';
    if (menuOverlay) menuOverlay.style.display = 'none';
    if (gameActions) gameActions.style.display = 'block';
    // punchBtn removed; no focus/enable to perform
    // For autumn_nest we want dark mode by default, otherwise default to day on enter
    try {
      if ((selectedEnv || '').toLowerCase() === 'autumn_nest' || (selectedEnv || '').toLowerCase() === 'autumn') {
        setNightMode(true);
      } else {
        setNightMode(false);
      }
    } catch (e) {}
  };

  // If landing overlay exists, it manages visibility; otherwise fall back to legacy menuOverlay wiring
  if (landingOverlay) {
  // ensure starting visibility for legacy gameActions
  if (gameActions) gameActions.style.display = 'none';
    // the landing Start button is wired earlier in the landing init code; nothing more to do here
  } else if (menuOverlay) {
    const menuStart = document.getElementById('menuStart');
    if (menuStart && gameActions) {
      menuOverlay.style.display = 'flex';
      gameActions.style.display = 'none';
      // punchBtn removed; no need to disable
      // override enterGame with legacy behavior so the wrapper below can call origEnter
      enterGame = function() {
        menuOverlay.style.display = 'none';
        gameActions.style.display = 'block';
        // punchBtn removed; nothing to focus
      };
      menuStart.addEventListener('pointerdown', (e) => { e.preventDefault(); enterGame(); });
      menuStart.addEventListener('click', enterGame);
    } else {
      console.warn('Legacy menu elements missing; landing overlay not found either.');
    }
  } else {
    console.warn('No menu overlay found — ensure landing overlay or legacy menu exists.');
  }

  // Health state
    let bossHealth = 100;

    function updateHealthUI() {
      if (labelFillEl) labelFillEl.style.width = `${bossHealth}%`;
      if (labelValEl) labelValEl.textContent = String(bossHealth);
      if (bossHealth <= 0) {
        // boss defeated — update any label UI only
      }
    }

    // fade-in behavior when entering game
    const origEnter = enterGame;
    enterGame = function() {
      origEnter();
      bossHealth = 100;
      updateHealthUI();
    };

    // (glove/punch UI removed)

    // start loop once initialization finished
    // initialize physics and start loop
    try {
      initPhysics();
    } catch (e) {
      console.warn('Physics init failed:', e);
    }
    try {
      // Disable decorative falling leaves for the Gravity Falls environment (they don't fit that scene)
      if ((selectedEnv || '').toLowerCase() !== 'gravity-falls' && (selectedEnv || '').toLowerCase() !== 'gravityfalls') {
        initLeaves();
      } else {
        console.log('Skipping leaf spawn for Gravity Falls');
      }
    } catch (e) { console.warn('Failed to init leaves', e); }
    // begin animation
    if (typeof animate === 'function') requestAnimationFrame(animate);
  }
  }); // end window.DOMContentLoaded

// End of DOMContentLoaded initialization
// NOTE: global export already assigned inside DOMContentLoaded. Removed duplicate to avoid
// ReferenceError when script is parsed before DOM initialization.
