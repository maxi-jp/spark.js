// ============================================================
// Particle System – Interactive Showcase & Preset Explorer
// ============================================================
// Categories:
//   1. SCENES (6 Multi-Emitter & Gameplay Showcases)
//      - Spaceship Combat (Starfield + Local Shield + Thruster + 4x4 Smoke Wake + Torpedoes)
//      - Campfire & Torch (4-Layer Hearth Fire + 2-Layer Mouse Torch + Log Stoke Burst)
//      - Fireworks Finale (Rocket Trails + 3-Layer Peony/Ring/Glitter Shell Bursts)
//      - Thunderstorm & Camera (Scrolling Camera + relativeArea Rain, Puddle Splashes, Fog & Lightning)
//      - Sci-Fi Laser & Singularity (Inward Black Hole Ring + Dynamic Line Laser + Impact Sparks)
//      - Combat VFX Lab (Directional Blood/Hit Spatter + Spinning Rect Debris + Healing Totem)
//
//   2. PRESETS (17 Single-Emitter Configurations)
//      - Inspect individual configs, switch renderShape live (1-4), toggle sprite-sheet
//        frameMode (X), and spawn pooled ParticleSystemGO bursts on Click / Space.
//
// Controls:
//   Mouse Click Sidebar – Switch Category, Scene/Preset, Shape (1-4), or Renderer (Canvas2D / WebGL)
//   Up / Down Arrows    – Previous / Next Scene or Preset
//   Tab                 – Switch between [Scenes] and [Presets] categories
//   R                   – Toggle live between Canvas2DRenderer and WebGLRenderer
//   V                   – Show / Hide Sidebar UI (Full-screen view)
//   Click / Space       – Trigger scene interaction or pooled ParticleSystemGO burst
//   1 / 2 / 3 / 4       – Switch renderShape ("sprite" / "circle" / "rect" / "line") in Presets
//   A S D F G H J K L Z C B N M P Q E – Direct keyboard shortcuts for Presets
// ============================================================

// Disable the default top-left engine stats box so our unified HUD header displays
// FPS, frame delta, active renderer, WebGL draw calls, and particle pool telemetry cleanly.
drawStats = false;

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — SINGLE-EMITTER PRESET CONFIGURATIONS (Copy-Paste Ready)
// ═══════════════════════════════════════════════════════════════════════════

const smokeAreaConfig = {
    // Inherits defaultParticleConfig — full-screen drifting smoke cloud
    prewarm: true,
    prewarmTime: 2.0
};

const smokePointConfig = {
    maxParticleCount: 200,
    globalCompositeOperation: "overlay",
    emitterType: emitterType.point,

    MIN_INITIAL_VELOCITY: 15,
    MAX_INITIAL_VELOCITY: 70,

    MIN_DIRECTION_X: -1,
    MAX_DIRECTION_X:  1,
    MIN_DIRECTION_Y: -1,
    MAX_DIRECTION_Y:  1,

    // Thermal buoyancy (rises upward) & gentle air drag
    GRAVITY_X: 0,
    GRAVITY_Y: -35,
    VELOCITY_DAMPING: 0.4,

    MIN_OPACITY_INCREMENT_VELOCITY: 1.5,
    MAX_OPACITY_INCREMENT_VELOCITY: 4.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 0.5,
    MAX_OPACITY_DECREMENT_VELOCITY: 1.5,

    // Soft translucent smoke peak opacity & linger hold time
    MIN_MAX_OPACITY: 0.35,
    MAX_MAX_OPACITY: 0.65,
    MIN_HOLD_TIME: 0.2,
    MAX_HOLD_TIME: 0.5,

    MIN_INITIAL_SCALE: 0.05,
    MAX_INITIAL_SCALE: 0.5,
    MIN_SCALE_VELOCITY: 0.25,
    MAX_SCALE_VELOCITY: 0.5,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,
    MIN_ROTATION_VELOCITY: 0.05,
    MAX_ROTATION_VELOCITY: 0.15,

    MIN_TIME_TO_SPAWN_PARTICLE: 0.01,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.1
};

// Single-puff 4x4 sprite-sheet smoke (~1 particle/sec) to clearly observe the 16-frame animation
const spriteSheetSmokeConfig = {
    maxParticleCount: 250,
    globalCompositeOperation: "source-over",
    sheetColumns: 4,
    sheetRows: 4,
    frameMode: "animate",
    emitterType: emitterType.circle,

    EMISSION_RADIUS: 18,
    radialVelocity: false,

    MIN_INITIAL_VELOCITY: 144,
    MAX_INITIAL_VELOCITY: 144,

    directionMode: "polar",
    MIN_ANGLE: -1.95,
    MAX_ANGLE: -1.19,

    GRAVITY_X: 12,
    GRAVITY_Y: -90,
    VELOCITY_DAMPING: 0.1,

    MIN_OPACITY_INCREMENT_VELOCITY: 3.5,
    MAX_OPACITY_INCREMENT_VELOCITY: 7,
    MIN_MAX_OPACITY: 1,
    MAX_MAX_OPACITY: 1,
    MIN_HOLD_TIME: 0.16,
    MAX_HOLD_TIME: 0.38,
    MIN_OPACITY_DECREMENT_VELOCITY: 1,
    MAX_OPACITY_DECREMENT_VELOCITY: 2,

    MIN_INITIAL_SCALE: 0.4,
    MAX_INITIAL_SCALE: 0.6,

    MIN_SCALE_VELOCITY: 1,
    MAX_SCALE_VELOCITY: 1.5,

    MIN_INITIAL_ROTATION: -0.25,
    MAX_INITIAL_ROTATION: 0.25,

    MIN_ROTATION_VELOCITY: -0.1,
    MAX_ROTATION_VELOCITY: 0.1,

    emitCountPerSpawn: 1,
    MIN_TIME_TO_SPAWN_PARTICLE: 1,
    MAX_TIME_TO_SPAWN_PARTICLE: 1.5
};

// Continuous billowing smoke column using smoke2.png (4x4 grid of 256x256 frames)
const spriteSheetSmokeStreamConfig = {
    maxParticleCount: 250,
    globalCompositeOperation: "source-over",
    sheetColumns: 4,
    sheetRows: 4,
    frameMode: "animate",
    emitterType: emitterType.circle,

    EMISSION_RADIUS: 18,
    radialVelocity: false,

    MIN_INITIAL_VELOCITY: 120,
    MAX_INITIAL_VELOCITY: 150,

    directionMode: "polar",
    MIN_ANGLE: -1.95,
    MAX_ANGLE: -1.19,

    GRAVITY_X: 14,
    GRAVITY_Y: -90,
    VELOCITY_DAMPING: 0.35,

    MIN_OPACITY_INCREMENT_VELOCITY: 3.5,
    MAX_OPACITY_INCREMENT_VELOCITY: 7.0,
    MIN_MAX_OPACITY: 0.85,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.16,
    MAX_HOLD_TIME: 0.38,
    MIN_OPACITY_DECREMENT_VELOCITY: 0.9,
    MAX_OPACITY_DECREMENT_VELOCITY: 1.8,

    MIN_INITIAL_SCALE: 0.32,
    MAX_INITIAL_SCALE: 0.52,
    MIN_SCALE_VELOCITY: 0.65,
    MAX_SCALE_VELOCITY: 1.1,

    MIN_INITIAL_ROTATION: -0.25,
    MAX_INITIAL_ROTATION:  0.25,
    MIN_ROTATION_VELOCITY: -0.1,
    MAX_ROTATION_VELOCITY:  0.1,

    emitCountPerSpawn: 1,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.06,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.12
};

const rainConfig = {
    maxParticleCount: 2000,
    globalCompositeOperation: "source-over",
    emitterType: emitterType.line,
    relativeArea: true,

    AREA_X1: -200, AREA_Y1: -100,
    AREA_X2:  1124, AREA_Y2: -100,

    MIN_INITIAL_VELOCITY: 450,
    MAX_INITIAL_VELOCITY: 820,

    MIN_DIRECTION_X: 0.15,
    MAX_DIRECTION_X: 0.25,
    MIN_DIRECTION_Y: 1,
    MAX_DIRECTION_Y: 1,

    MIN_OPACITY_INCREMENT_VELOCITY: 1.5,
    MAX_OPACITY_INCREMENT_VELOCITY: 2.5,
    MIN_OPACITY_DECREMENT_VELOCITY: 0.2,
    MAX_OPACITY_DECREMENT_VELOCITY: 0.8,

    MIN_INITIAL_SCALE: 0.25,
    MAX_INITIAL_SCALE: 0.33,
    MIN_SCALE_VELOCITY: 0,
    MAX_SCALE_VELOCITY: 0,

    MIN_INITIAL_ROTATION: -1.5708,
    MAX_INITIAL_ROTATION: -1.5708,
    alignToVelocity: true,

    MIN_ROTATION_VELOCITY: 0,
    MAX_ROTATION_VELOCITY: 0,

    MIN_TIME_TO_SPAWN_PARTICLE: 0.001,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.002,

    prewarm: true,
    prewarmTime: 1.5
};

const snowConfig = {
    maxParticleCount: 1000,
    globalCompositeOperation: "source-over",
    emitterType: emitterType.area,
    relativeArea: true,

    AREA_X1: -100, AREA_Y1: -100,
    AREA_X2:  1124, AREA_Y2: -100,

    MIN_INITIAL_VELOCITY: 30,
    MAX_INITIAL_VELOCITY: 60,

    MIN_DIRECTION_X: -0.25,
    MAX_DIRECTION_X:  0.25,
    MIN_DIRECTION_Y: 1,
    MAX_DIRECTION_Y: 1,

    MIN_OPACITY_INCREMENT_VELOCITY: 0.1,
    MAX_OPACITY_INCREMENT_VELOCITY: 0.30,
    MIN_OPACITY_DECREMENT_VELOCITY: 0.05,
    MAX_OPACITY_DECREMENT_VELOCITY: 0.15,

    MIN_INITIAL_SCALE: 0.05,
    MAX_INITIAL_SCALE: 0.25,
    MIN_SCALE_VELOCITY: 0,
    MAX_SCALE_VELOCITY: 0.01,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,
    MIN_ROTATION_VELOCITY: 0.1,
    MAX_ROTATION_VELOCITY: 0.5,

    MIN_TIME_TO_SPAWN_PARTICLE: 0.01,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.02,

    prewarm: true,
    prewarmTime: 15.0
};

const fountainConfig = {
    maxParticleCount: 400,
    globalCompositeOperation: "lighter",
    renderShape: "line",
    PARTICLE_SIZE: 80,
    emitterType: emitterType.point,

    MIN_INITIAL_VELOCITY: 220,
    MAX_INITIAL_VELOCITY: 380,

    // Launch upward in a polar cone; gravity pulls particles down in a parabolic arc
    directionMode: "polar",
    MIN_ANGLE: -Math.PI * 0.65,
    MAX_ANGLE: -Math.PI * 0.35,

    GRAVITY_X: 0,
    GRAVITY_Y: 550,
    VELOCITY_DAMPING: 0.2,

    MIN_OPACITY_INCREMENT_VELOCITY: 12.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 20.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.2,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.2,

    // Hold full brightness while arcing, then fade out
    MIN_MAX_OPACITY: 0.85,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.2,
    MAX_HOLD_TIME: 0.45,

    MIN_INITIAL_SCALE: 0.04,
    MAX_INITIAL_SCALE: 0.10,
    MIN_SCALE_VELOCITY: 0.02,
    MAX_SCALE_VELOCITY: 0.08,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: 0,
    alignToVelocity: true,

    MIN_ROTATION_VELOCITY: 0,
    MAX_ROTATION_VELOCITY: 0,

    emitCountPerSpawn: 2,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.008,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.02,

    // Color-over-lifetime: white-hot gold -> deep fiery orange
    startColor: "#fff078",
    endColor:   "#ff3c00"
};

const thrusterConfig = {
    maxParticleCount: 400,
    globalCompositeOperation: "lighter",
    emitterType: emitterType.point,

    MIN_INITIAL_VELOCITY: 240,
    MAX_INITIAL_VELOCITY: 420,

    // Narrow directional polar cone [-12.5°, +12.5°], rotated at runtime via SetRotation(angle)
    directionMode: "polar",
    MIN_ANGLE: -0.22,
    MAX_ANGLE:  0.22,

    GRAVITY_X: 0,
    GRAVITY_Y: -40,
    VELOCITY_DAMPING: 1.8,

    MIN_OPACITY_INCREMENT_VELOCITY: 12.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 20.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.2,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.4,

    MIN_INITIAL_SCALE: 0.04,
    MAX_INITIAL_SCALE: 0.10,
    MIN_SCALE_VELOCITY: 0.18,
    MAX_SCALE_VELOCITY: 0.35,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,
    MIN_ROTATION_VELOCITY: -1.5,
    MAX_ROTATION_VELOCITY:  1.5,

    emitCountPerSpawn: 2,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.012,

    // Color-over-lifetime: bright yellow-orange -> dark ember red
    startColor: "#ffe066",
    endColor:   "#d92600"
};

const circleCampfireConfig = {
    maxParticleCount: 400,
    globalCompositeOperation: "lighter",
    emitterType: emitterType.circle,

    // Uniform random disk of radius 60px centered on emitter.position
    EMISSION_RADIUS: 60,
    radialVelocity: false,

    MIN_INITIAL_VELOCITY: 15,
    MAX_INITIAL_VELOCITY: 55,

    // Gently drift inward/upward while rising under thermal buoyancy
    directionMode: "polar",
    MIN_ANGLE: -Math.PI * 0.7,
    MAX_ANGLE: -Math.PI * 0.3,

    GRAVITY_X: 0,
    GRAVITY_Y: -90,
    VELOCITY_DAMPING: 0.6,

    MIN_OPACITY_INCREMENT_VELOCITY: 6.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 12.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.0,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.2,

    MIN_MAX_OPACITY: 0.6,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.1,
    MAX_HOLD_TIME: 0.25,

    MIN_INITIAL_SCALE: 0.06,
    MAX_INITIAL_SCALE: 0.16,
    MIN_SCALE_VELOCITY: 0.05,
    MAX_SCALE_VELOCITY: 0.18,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,
    MIN_ROTATION_VELOCITY: -1.0,
    MAX_ROTATION_VELOCITY:  1.0,

    emitCountPerSpawn: 2,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.006,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.015,

    // Color-over-lifetime: bright amber flame -> dark crimson smoke
    startColor: "#ffb833",
    endColor:   "#801500"
};

const portalRingConfig = {
    maxParticleCount: 450,
    globalCompositeOperation: "lighter",
    emitterType: emitterType.ring,

    // Annulus ring between 75px and 90px around emitter.position
    EMISSION_INNER_RADIUS: 75,
    EMISSION_RADIUS: 90,
    radialVelocity: true,

    // Expand radially outward from the ring circumference, braked by air drag
    MIN_INITIAL_VELOCITY: 60,
    MAX_INITIAL_VELOCITY: 150,

    GRAVITY_X: 0,
    GRAVITY_Y: 0,
    VELOCITY_DAMPING: 2.2,

    MIN_OPACITY_INCREMENT_VELOCITY: 12.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 20.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.2,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.4,

    MIN_MAX_OPACITY: 0.75,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.15,
    MAX_HOLD_TIME: 0.35,

    MIN_INITIAL_SCALE: 0.05,
    MAX_INITIAL_SCALE: 0.12,
    MIN_SCALE_VELOCITY: 0.04,
    MAX_SCALE_VELOCITY: 0.12,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,
    MIN_ROTATION_VELOCITY: -2.0,
    MAX_ROTATION_VELOCITY:  2.0,

    emitCountPerSpawn: 3,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.006,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.014,

    // Color-over-lifetime: electric cyan -> deep arcane violet
    startColor: "#00f0ff",
    endColor:   "#9b1dff"
};

const firewallLineConfig = {
    maxParticleCount: 500,
    globalCompositeOperation: "lighter",
    emitterType: emitterType.line,

    // Diagonal energy / flame barrier segment across the screen
    AREA_X1: 350, AREA_Y1: 680,
    AREA_X2: 850, AREA_Y2: 220,

    MIN_INITIAL_VELOCITY: 30,
    MAX_INITIAL_VELOCITY: 95,

    directionMode: "polar",
    MIN_ANGLE: -Math.PI * 0.65,
    MAX_ANGLE: -Math.PI * 0.35,

    GRAVITY_X: 0,
    GRAVITY_Y: -80,
    VELOCITY_DAMPING: 0.8,

    MIN_OPACITY_INCREMENT_VELOCITY: 8.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 16.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.2,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.5,

    MIN_MAX_OPACITY: 0.7,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.1,
    MAX_HOLD_TIME: 0.3,

    MIN_INITIAL_SCALE: 0.05,
    MAX_INITIAL_SCALE: 0.13,

    MIN_SCALE_VELOCITY: 0.06,
    MAX_SCALE_VELOCITY: 0.16,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,

    MIN_ROTATION_VELOCITY: -1.5,
    MAX_ROTATION_VELOCITY:  1.5,

    emitCountPerSpawn: 3,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.012,

    // Color-over-lifetime: bright neon green -> teal-blue
    startColor: "#50ff64",
    endColor:   "#0066ff"
};

const localAuraConfig = {
    maxParticleCount: 350,
    globalCompositeOperation: "lighter",
    renderShape: "circle",
    PARTICLE_SIZE: 18,

    // Local simulation space: particles move & rotate rigidly with the emitter
    simulationSpace: "local",
    emitterType: emitterType.ring,
    EMISSION_INNER_RADIUS: 42,
    EMISSION_RADIUS: 52,
    radialVelocity: true,

    MIN_INITIAL_VELOCITY: 12,
    MAX_INITIAL_VELOCITY: 28,
    VELOCITY_DAMPING: 1.5,

    MIN_OPACITY_INCREMENT_VELOCITY: 4.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 7.0,
    MIN_HOLD_TIME: 0.2,
    MAX_HOLD_TIME: 0.45,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.8,
    MAX_OPACITY_DECREMENT_VELOCITY: 3.0,
    MIN_MAX_OPACITY: 0.55,
    MAX_MAX_OPACITY: 0.9,

    MIN_INITIAL_SCALE: 0.5,
    MAX_INITIAL_SCALE: 1.0,
    MIN_SCALE_VELOCITY: -0.4,
    MAX_SCALE_VELOCITY: -0.1,

    MIN_TIME_TO_SPAWN_PARTICLE: 0.008,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.015,

    startColor: "#5bf2ff",
    endColor:   "#2f5bff"
};

// NEW 12: Black Hole Singularity (Ring emitter + negative radialVelocity imploding inward)
const blackHoleConfig = {
    maxParticleCount: 500,
    globalCompositeOperation: "lighter",
    emitterType: emitterType.ring,

    EMISSION_INNER_RADIUS: 95,
    EMISSION_RADIUS: 120,
    radialVelocity: true,

    // Negative speed with radialVelocity pulls particles inward toward the center
    MIN_INITIAL_VELOCITY: -155,
    MAX_INITIAL_VELOCITY: -85,

    GRAVITY_X: 0,
    GRAVITY_Y: 0,
    VELOCITY_DAMPING: 0.35,

    MIN_OPACITY_INCREMENT_VELOCITY: 3.5,
    MAX_OPACITY_INCREMENT_VELOCITY: 6.5,
    MIN_MAX_OPACITY: 0.75,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.35,
    MAX_HOLD_TIME: 0.65,
    MIN_OPACITY_DECREMENT_VELOCITY: 2.5,
    MAX_OPACITY_DECREMENT_VELOCITY: 4.5,

    MIN_INITIAL_SCALE: 0.10,
    MAX_INITIAL_SCALE: 0.20,
    MIN_SCALE_VELOCITY: -0.14,
    MAX_SCALE_VELOCITY: -0.05,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,
    MIN_ROTATION_VELOCITY: -3.5,
    MAX_ROTATION_VELOCITY:  3.5,

    emitCountPerSpawn: 3,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.012,

    startColor: "#9b30ff",
    endColor:   "#e0ffff"
};

// NEW 13: Healing / Buff Aura (Circle disk + rising procedural "rect" particles)
const healingAuraConfig = {
    maxParticleCount: 300,
    globalCompositeOperation: "lighter",
    renderShape: "rect",
    PARTICLE_SIZE: 16,
    emitterType: emitterType.circle,

    EMISSION_RADIUS: 65,
    radialVelocity: false,

    MIN_INITIAL_VELOCITY: 25,
    MAX_INITIAL_VELOCITY: 65,

    directionMode: "polar",
    MIN_ANGLE: -Math.PI * 0.58,
    MAX_ANGLE: -Math.PI * 0.42,

    GRAVITY_X: 0,
    GRAVITY_Y: -55,
    VELOCITY_DAMPING: 0.5,

    MIN_OPACITY_INCREMENT_VELOCITY: 4.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 7.0,
    MIN_MAX_OPACITY: 0.7,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.3,
    MAX_HOLD_TIME: 0.6,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.2,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.0,

    MIN_INITIAL_SCALE: 0.45,
    MAX_INITIAL_SCALE: 0.95,
    MIN_SCALE_VELOCITY: -0.35,
    MAX_SCALE_VELOCITY: -0.10,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: 0,
    MIN_ROTATION_VELOCITY: 0,
    MAX_ROTATION_VELOCITY: 0,

    emitCountPerSpawn: 2,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.012,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.028,

    startColor: "#2bff88",
    endColor:   "#e6ff66"
};

// NEW 14: Confetti Cannon (Upward polar cone + spinning "rect" paper + air drag + gravity)
const confettiConfig = {
    maxParticleCount: 500,
    globalCompositeOperation: "source-over",
    renderShape: "rect",
    PARTICLE_SIZE: 16,
    emitterType: emitterType.point,

    MIN_INITIAL_VELOCITY: 260,
    MAX_INITIAL_VELOCITY: 520,

    directionMode: "polar",
    MIN_ANGLE: -Math.PI * 0.72,
    MAX_ANGLE: -Math.PI * 0.28,

    GRAVITY_X: 0,
    GRAVITY_Y: 320,
    VELOCITY_DAMPING: 1.8,

    MIN_OPACITY_INCREMENT_VELOCITY: 20.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 30.0,
    MIN_MAX_OPACITY: 0.9,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.8,
    MAX_HOLD_TIME: 1.5,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.0,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.0,

    MIN_INITIAL_SCALE: 0.5,
    MAX_INITIAL_SCALE: 1.0,
    MIN_SCALE_VELOCITY: -0.15,
    MAX_SCALE_VELOCITY:  0.0,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,
    MIN_ROTATION_VELOCITY: -9.0,
    MAX_ROTATION_VELOCITY:  9.0,

    emitCountPerSpawn: 3,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.01,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.025,

    startColor: "#ff4da6",
    endColor:   "#ffe600"
};

// NEW 15: Blood / Hit Spatter (High-velocity polar spray + strong air drag + shrinking droplets)
const bloodSpatterConfig = {
    maxParticleCount: 350,
    globalCompositeOperation: "source-over",
    renderShape: "circle",
    PARTICLE_SIZE: 20,
    emitterType: emitterType.point,

    MIN_INITIAL_VELOCITY: 160,
    MAX_INITIAL_VELOCITY: 460,

    directionMode: "polar",
    MIN_ANGLE: -0.48,
    MAX_ANGLE:  0.48,

    GRAVITY_X: 0,
    GRAVITY_Y: 360,
    VELOCITY_DAMPING: 4.2,

    MIN_OPACITY_INCREMENT_VELOCITY: 25.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 35.0,
    MIN_MAX_OPACITY: 0.85,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.12,
    MAX_HOLD_TIME: 0.30,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.8,
    MAX_OPACITY_DECREMENT_VELOCITY: 3.2,

    MIN_INITIAL_SCALE: 0.35,
    MAX_INITIAL_SCALE: 0.90,
    MIN_SCALE_VELOCITY: -0.65,
    MAX_SCALE_VELOCITY: -0.20,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: 0,
    MIN_ROTATION_VELOCITY: 0,
    MAX_ROTATION_VELOCITY: 0,

    emitCountPerSpawn: 4,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.008,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.02,

    startColor: "#ff1e1e",
    endColor:   "#4a0000"
};

// NEW 16: Magic Fairy Dust / Sparkles (Shrinking spinning diamonds trailing the cursor)
const magicSparklesConfig = {
    maxParticleCount: 400,
    globalCompositeOperation: "lighter",
    renderShape: "rect",
    PARTICLE_SIZE: 15,
    emitterType: emitterType.circle,

    EMISSION_RADIUS: 18,
    radialVelocity: false,

    MIN_INITIAL_VELOCITY: 15,
    MAX_INITIAL_VELOCITY: 75,

    directionMode: "polar",
    MIN_ANGLE: 0,
    MAX_ANGLE: PI2,

    GRAVITY_X: 0,
    GRAVITY_Y: 35,
    VELOCITY_DAMPING: 1.4,

    MIN_OPACITY_INCREMENT_VELOCITY: 15.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 25.0,
    MIN_MAX_OPACITY: 0.8,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.1,
    MAX_HOLD_TIME: 0.3,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.8,
    MAX_OPACITY_DECREMENT_VELOCITY: 3.2,

    MIN_INITIAL_SCALE: 0.45,
    MAX_INITIAL_SCALE: 1.0,
    MIN_SCALE_VELOCITY: -0.85,
    MAX_SCALE_VELOCITY: -0.35,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,
    MIN_ROTATION_VELOCITY: -6.0,
    MAX_ROTATION_VELOCITY:  6.0,

    emitCountPerSpawn: 3,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.006,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.015,

    startColor: "#ff80ff",
    endColor:   "#ffee55"
};

// NEW 17: Tesla Electric Arcs (High-speed velocity-aligned "line" streaks with extreme damping)
const electricSparksConfig = {
    maxParticleCount: 450,
    globalCompositeOperation: "lighter",
    renderShape: "line",
    PARTICLE_SIZE: 54,
    emitterType: emitterType.ring,

    EMISSION_INNER_RADIUS: 8,
    EMISSION_RADIUS: 24,
    radialVelocity: false,

    MIN_INITIAL_VELOCITY: 280,
    MAX_INITIAL_VELOCITY: 620,

    directionMode: "polar",
    MIN_ANGLE: 0,
    MAX_ANGLE: PI2,

    GRAVITY_X: 0,
    GRAVITY_Y: 0,
    VELOCITY_DAMPING: 6.5,

    MIN_OPACITY_INCREMENT_VELOCITY: 30.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 45.0,
    MIN_MAX_OPACITY: 0.85,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.02,
    MAX_HOLD_TIME: 0.08,
    MIN_OPACITY_DECREMENT_VELOCITY: 4.5,
    MAX_OPACITY_DECREMENT_VELOCITY: 8.5,

    MIN_INITIAL_SCALE: 0.06,
    MAX_INITIAL_SCALE: 0.16,
    MIN_SCALE_VELOCITY: -0.15,
    MAX_SCALE_VELOCITY:  0.05,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: 0,
    alignToVelocity: true,
    MIN_ROTATION_VELOCITY: 0,
    MAX_ROTATION_VELOCITY: 0,

    emitCountPerSpawn: 5,
    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.012,

    startColor: "#b8ffff",
    endColor:   "#0044ff"
};

// One-shot explosion burst config (used with Pool<ParticleSystemGO>)
const explosionBurstConfig = {
    maxParticleCount: 80,
    globalCompositeOperation: "lighter",
    emitterType: emitterType.point,
    autoDeactivateWhenEmpty: true,

    // High initial blast speed that rapidly brakes due to VELOCITY_DAMPING
    MIN_INITIAL_VELOCITY: 180,
    MAX_INITIAL_VELOCITY: 520,

    // Uniform 360° polar radial distribution (no 45° diagonal box bias)
    directionMode: "polar",
    MIN_ANGLE: 0,
    MAX_ANGLE: PI2,

    GRAVITY_X: 0,
    GRAVITY_Y: 160,
    VELOCITY_DAMPING: 3.5,

    MIN_OPACITY_INCREMENT_VELOCITY: 20.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 30.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 1.8,
    MAX_OPACITY_DECREMENT_VELOCITY: 3.2,

    // Instant bright flash that holds briefly while decelerating
    MIN_MAX_OPACITY: 0.9,
    MAX_MAX_OPACITY: 1.0,
    MIN_HOLD_TIME: 0.15,
    MAX_HOLD_TIME: 0.35,

    MIN_INITIAL_SCALE: 0.05,
    MAX_INITIAL_SCALE: 0.14,
    MIN_SCALE_VELOCITY: 0.08,
    MAX_SCALE_VELOCITY: 0.22,

    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,
    MIN_ROTATION_VELOCITY: -1.5,
    MAX_ROTATION_VELOCITY:  1.5,

    // Color-over-lifetime: white-yellow blast flash -> fiery orange-red
    startColor: "#fff599",
    endColor:   "#ff2a00"
};

// Shockwave ring burst config (paired with explosion bursts)
const shockwaveBurstConfig = {
    maxParticleCount: 45,
    globalCompositeOperation: "lighter",
    renderShape: "circle",
    PARTICLE_SIZE: 18,
    emitterType: emitterType.ring,
    EMISSION_INNER_RADIUS: 8,
    EMISSION_RADIUS: 14,
    radialVelocity: true,
    autoDeactivateWhenEmpty: true,

    MIN_INITIAL_VELOCITY: 240,
    MAX_INITIAL_VELOCITY: 320,
    VELOCITY_DAMPING: 3.2,

    MIN_OPACITY_INCREMENT_VELOCITY: 25.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 35.0,
    MIN_HOLD_TIME: 0.08,
    MAX_HOLD_TIME: 0.18,
    MIN_OPACITY_DECREMENT_VELOCITY: 2.2,
    MAX_OPACITY_DECREMENT_VELOCITY: 3.5,

    MIN_INITIAL_SCALE: 0.5,
    MAX_INITIAL_SCALE: 0.9,
    MIN_SCALE_VELOCITY: -0.4,
    MAX_SCALE_VELOCITY: -0.1,

    startColor: "#80f5ff",
    endColor:   "#2050ff"
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — CATALOG DEFINITIONS (SCENES & PRESETS)
// ═══════════════════════════════════════════════════════════════════════════

const SCENE_ITEMS = [
    {
        id: "scene-spaceship",
        title: "1. Spaceship Combat",
        badge: "LOCAL + TRAIL",
        desc: "Starfield (prewarm) + Local Shield Aura (simulationSpace: 'local') + Polar Ion Thruster (SetRotation) + 4x4 Smoke Wake.",
        hint: "Click / Space: Fire Plasma Torpedo  |  [M]: Toggle Autopilot / Mouse Steer"
    },
    {
        id: "scene-campfire",
        title: "2. Campfire & Torch",
        badge: "4-LAYER FIRE",
        desc: "4-layer hearth fire (4x4 Smoke Column + Outer Flame + Hot Core + Rising Embers) + 2-layer interactive Mouse Torch.",
        hint: "Move Mouse: Wave Hand Torch  |  Click / Space: Stoke Campfire Embers"
    },
    {
        id: "scene-fireworks",
        title: "3. Fireworks Finale",
        badge: "MULTI-BURST",
        desc: "Ascending rockets with velocity-aligned spark tails detonating into 3-layer Peony, Ring & Glitter bursts.",
        hint: "Click / Space: Launch Aerial Shell to Cursor  |  Auto-launches every 0.65s"
    },
    {
        id: "scene-storm",
        title: "4. Storm & Camera",
        badge: "RELATIVE AREA",
        desc: "Scrolling Camera + relativeArea Slanted Rain, Ground Puddle Splashes & Rolling Storm Fog.",
        hint: "Click / Space: Lightning Bolt Strike  |  Left / Right Arrows: Pan Camera"
    },
    {
        id: "scene-scifi",
        title: "5. Laser & Black Hole",
        badge: "INWARD RADIAL",
        desc: "Imploding Black Hole Singularity (radialVelocity < 0) + Plasma Laser Beam (emitterType.line) + Welder Sparks.",
        hint: "Move Mouse: Aim Laser Beam  |  Click / Space: Plasma Overload Blast"
    },
    {
        id: "scene-combat",
        title: "6. Combat & Gore Lab",
        badge: "GORE & DEBRIS",
        desc: "Directional Blood/Hit Spatter (high damping) + Spinning Rect Crate Shrapnel + Sanctuary Healing Totem.",
        hint: "Click Left Side: Shoot Target Dummy  |  Click Right / Space: Shatter Crate"
    }
];

const PRESET_ITEMS = [
    { id: "area-smoke",        key: KEY_A, keyLabel: "A", title: "Area Smoke (Default)",       img: "smoke",     config: smokeAreaConfig,              follow: false, desc: "Full-screen area emitter with 2s prewarm." },
    { id: "point-smoke",       key: KEY_S, keyLabel: "S", title: "Rising Point Smoke",         img: "smoke",     config: smokePointConfig,             follow: true,  desc: "Point emitter with thermal upward buoyancy & 'overlay' blend." },
    { id: "spritesheet-smoke", key: KEY_Z, keyLabel: "Z", title: "Sprite-Sheet 4x4 (1/sec)",   img: "smoke2",    config: spriteSheetSmokeConfig,       follow: true,  desc: "1 particle/sec 16-frame smoke2.png flipbook. [X] toggles frameMode." },
    { id: "spritesheet-smoke-stream", key: KEY_W, keyLabel: "W", title: "Sprite-Sheet 4x4 (Stream)", img: "smoke2", config: spriteSheetSmokeStreamConfig, follow: true,  desc: "Continuous billowing 16-frame smoke2.png column. [X] toggles frameMode." },
    { id: "rain",              key: KEY_D, keyLabel: "D", title: "Slanted Rain (Prewarm)",     img: "waterdrop", config: rainConfig,                   follow: false, desc: "High-speed velocity-aligned line emitter along top edge." },
    { id: "snow",              key: KEY_F, keyLabel: "F", title: "Snowfall (15s Prewarm)",     img: "snow",      config: snowConfig,             follow: false, desc: "Area emitter with gentle flutter & 15s prewarm." },
    { id: "fountain",          key: KEY_G, keyLabel: "G", title: "Sparks Fountain (Line)",     img: "smoke",     config: fountainConfig,         follow: true,  desc: "Procedural 'line' streaks in a polar cone with parabolic gravity arc." },
    { id: "thruster",          key: KEY_H, keyLabel: "H", title: "Rotating Jet Thruster",      img: "smoke",     config: thrusterConfig,         follow: false, desc: "Narrow polar cone at center aimed at the mouse via SetRotation()." },
    { id: "circle-campfire",   key: KEY_J, keyLabel: "J", title: "Campfire Disk (Circle)",     img: "smoke",     config: circleCampfireConfig,   follow: true,  desc: "Uniform disk sampling (emitterType.circle) with thermal buoyancy." },
    { id: "portal-ring",       key: KEY_K, keyLabel: "K", title: "Portal Shockwave (Ring)",    img: "smoke",     config: portalRingConfig,       follow: true,  desc: "Annulus ring (75..90px) with outward radialVelocity: true." },
    { id: "firewall-line",     key: KEY_L, keyLabel: "L", title: "Flame Barrier (Line)",       img: "smoke",     config: firewallLineConfig,     follow: false, desc: "Dynamic line segment anchored at (380, 560) tracking the cursor." },
    { id: "local-aura",        key: KEY_C, keyLabel: "C", title: "Shield Aura (Local Space)",  img: null,        config: localAuraConfig,        follow: true,  desc: "simulationSpace: 'local' — particles move & rotate rigidly with emitter." },
    { id: "black-hole",        key: KEY_B, keyLabel: "B", title: "Black Hole (Inward Ring)",   img: "smoke",     config: blackHoleConfig,        follow: true,  desc: "Ring emitter with negative speed (-155..-85) imploding inward." },
    { id: "healing-aura",      key: KEY_N, keyLabel: "N", title: "Healing / Buff Aura",        img: null,        config: healingAuraConfig,      follow: true,  desc: "Circle emitter spawning rising emerald-to-gold 'rect' particles." },
    { id: "confetti",          key: KEY_M, keyLabel: "M", title: "Confetti Cannon (Rainbow)",  img: null,        config: confettiConfig,         follow: true,  desc: "Upward polar cone of spinning 'rect' confetti cycling SetColor()." },
    { id: "blood-spatter",     key: KEY_P, keyLabel: "P", title: "Blood / Hit Spatter",        img: null,        config: bloodSpatterConfig,     follow: false, desc: "High-speed polar spray aimed at mouse with strong VELOCITY_DAMPING." },
    { id: "magic-sparkles",    key: KEY_Q, keyLabel: "Q", title: "Magic Fairy Dust",           img: null,        config: magicSparklesConfig,    follow: true,  desc: "Shrinking, fast-spinning 'rect' sparkles trailing the cursor." },
    { id: "electric-sparks",   key: KEY_E, keyLabel: "E", title: "Tesla Electric Arcs",        img: null,        config: electricSparksConfig,   follow: true,  desc: "High-speed velocity-aligned 'line' streaks with extreme damping." }
];

const FIREWORK_PALETTES = [
    { start: "#00f5ff", end: "#ff00a0" }, // Cyan -> Magenta
    { start: "#fff066", end: "#ff2200" }, // Gold -> Crimson
    { start: "#66ff66", end: "#0088ff" }, // Emerald -> Cobalt
    { start: "#ff99ff", end: "#7b1dff" }, // Pink -> Arcane Violet
    { start: "#ffffff", end: "#ff8800" }  // White-Hot -> Amber
];

const CONFETTI_PALETTE = [
    ["#ff3366", "#ffcc00"],
    ["#00e5ff", "#7b2cbf"],
    ["#39ff14", "#00b4d8"],
    ["#ff9e00", "#ff0055"],
    ["#ffee32", "#ff4d6d"]
];

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — MAIN SHOWCASE GAME CLASS
// ═══════════════════════════════════════════════════════════════════════════

class ParticlesShowcase extends Game {
    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth:  1920,
            screenHeight: 1080,
            fillWindow: true,
            matchNativeResolution: true,
            imageSmoothingEnabled: true
        });

        this.graphicAssets = {
            smoke:     { path: "./src/examples/particles/assets/smoke.png",     img: null },
            smoke2:    { path: "./src/examples/particles/assets/smoke2.png",    img: null },
            snow:      { path: "./src/examples/particles/assets/snow.png",      img: null },
            waterdrop: { path: "./src/examples/particles/assets/waterdrop.png", img: null }
        };

        // UI & navigation state (managed via ParticlesShowcaseMenu extends HTMLMenu)
        this.sidebarWidth = 272;
        this.showUI       = true;
        this.category     = "scenes"; // "scenes" | "presets"
        this.sceneIndex   = 0;
        this.presetIndex  = 0;
        this._mode        = SCENE_ITEMS[0].id;
        this.menu         = null;

        // Telemetry string cache (updated every 0.15s to avoid WebGL text cache churn)
        this._telemetryTimer = 0;
        this._telemetryLine1 = "";
        this._telemetryLine2 = "";
        this._lastDrawCalls  = 0;

        // Shared burst pools
        this._explosionPool = null;
        this._shockwavePool = null;

        // Preset mode single emitter
        this._particleSystem = null;
        this._confettiColorIdx = 0;

        // Multi-emitter scene state
        this._sceneEmitters = [];
        this._sceneTime     = 0;

        // Scene 1: Spaceship state
        this._shipPos       = new Vector2(640, 384);
        this._shipAngle     = 0;
        this._shipAutoPilot = true;
        this._torpedoes     = [];

        // Scene 3: Fireworks state
        this._fireworkRockets = [];
        this._fireworkTimer   = 0.25;

        // Scene 4: Storm & Camera state
        this._stormCamera     = { x: 0, y: 0, scale: 1, rotation: 0 };
        this._stormAutoPan    = true;
        this._lightningBolts  = [];
        this._lightningFlash  = 0;
        this._lightningTimer  = 2.2;

        // Scene 6: Combat Lab state
        this._dummyHitFlash   = 0;
        this._crateShake      = 0;

        // Reusable scene colors
        this._colBgDark       = Color.FromHex("#121324");
        this._colBgSpace      = Color.FromHex("#090b16");
        this._colBgCampfire   = Color.FromHex("#0e0c18");
        this._colBgStorm      = Color.FromHex("#101828");
        this._colAccentCyan   = Color.FromHex("#4df0ff");
        this._colAccentGold   = Color.FromHex("#ffd166");
        this._colTextMuted    = new Color(0.68, 0.75, 0.88, 1.0);
        this._colTextDim      = new Color(0.48, 0.55, 0.68, 1.0);
    }

    Start() {
        super.Start();

        // Hide default WebGL stats overlay if main.js created it
        const statsEl = document.getElementById("engine-stats-container");
        if (statsEl)
            statsEl.style.display = "none";
        
        if (this.renderer._textCacheMax !== undefined) {
            this.renderer._textCacheMax = 256;
        }

        // Reusable pools of ParticleSystemGO instances for one-shot explosions & shockwaves
        this._explosionPool = new Pool(
            this,
            8,
            ParticleSystemGO,
            [Vector2.Zero(), this.graphicAssets.smoke.img, explosionBurstConfig]
        );
        this._shockwavePool = new Pool(
            this,
            8,
            ParticleSystemGO,
            [Vector2.Zero(), null, shockwaveBurstConfig]
        );

        // HTML+CSS HUD & Sidebar overlay (ParticlesShowcaseMenu extends HTMLMenu)
        this.menu = new ParticlesShowcaseMenu(this, canvas);
        this.menu.Start();

        // Start in the featured Spaceship Combat scene
        this._selectScene(0);
        this._updateTelemetryStrings(true);
    }

    // ── Mode & Category Switching ──────────────────────────────────────────

    _selectScene(index) {
        this.category   = "scenes";
        this.sceneIndex = (index + SCENE_ITEMS.length) % SCENE_ITEMS.length;
        this._mode      = SCENE_ITEMS[this.sceneIndex].id;
        this._sceneTime = 0;
        this._particleSystem = null;
        this._initActiveScene();
        this._updateTelemetryStrings(true);
        this.menu.SyncState();
    }

    _selectPreset(index) {
        this.category    = "presets";
        this.presetIndex = (index + PRESET_ITEMS.length) % PRESET_ITEMS.length;
        const item       = PRESET_ITEMS[this.presetIndex];
        this._mode       = item.id;
        this._sceneEmitters.length = 0;
        this._torpedoes.length = 0;
        this._fireworkRockets.length = 0;

        const img = item.img ? this.graphicAssets[item.img].img : null;
        const cx  = this._getViewportCenterX();
        const cy  = this.screenHeight * 0.5;

        let cfg = item.config;
        if (this._mode === "rain") {
            cfg = Object.assign({}, item.config, { AREA_X1: -200, AREA_X2: this.screenWidth + 200 });
        } else if (this._mode === "snow") {
            cfg = Object.assign({}, item.config, { AREA_X1: -100, AREA_X2: this.screenWidth + 100 });
        } else if (this._mode === "area-smoke") {
            cfg = Object.assign({}, item.config, { AREA_X2: this.screenWidth, AREA_Y2: this.screenHeight });
        }

        const pos = item.follow
            ? new Vector2(Input.mouse.x > this.sidebarWidth ? Input.mouse.x : cx, Input.mouse.y || cy)
            : (cfg.relativeArea ? new Vector2(0, 0) : new Vector2(cx, cy));

        this._particleSystem = new ParticleSystem(img, cfg, pos);
        if (this._mode === "firewall-line") {
            this._particleSystem.emitter.area.x1 = cx - 180;
            this._particleSystem.emitter.area.y1 = cy + 120;
            this._particleSystem.emitter.area.x2 = cx + 180;
            this._particleSystem.emitter.area.y2 = cy - 120;
        }
        this._updateTelemetryStrings(true);
        this.menu.SyncState();
    }

    _getViewportCenterX() {
        return this.showUI ? (this.sidebarWidth + (this.screenWidth - this.sidebarWidth) * 0.5) : (this.screenWidth * 0.5);
    }

    WindowResized() {
        super.WindowResized();
        if (this.category === "presets" && this._particleSystem) {
            if (this._mode === "rain") {
                this._particleSystem.emitter.area.x1 = -200;
                this._particleSystem.emitter.area.x2 = this.screenWidth + 200;
            }
            else if (this._mode === "snow") {
                this._particleSystem.emitter.area.x1 = -100;
                this._particleSystem.emitter.area.x2 = this.screenWidth + 100;
            }
            else if (this._mode === "area-smoke") {
                this._particleSystem.emitter.area.x2 = this.screenWidth;
                this._particleSystem.emitter.area.y2 = this.screenHeight;
            }
        } else if (this.category === "scenes" && this._mode === "scene-storm") {
            const groundY = Math.max(460, this.screenHeight - 143);
            const fogPS = this._getScenePS("fog");
            if (fogPS) {
                fogPS.emitter.area.x2 = this.screenWidth + 150;
                fogPS.emitter.area.y1 = groundY - 245;
                fogPS.emitter.area.y2 = groundY + 35;
            }
            const rainPS = this._getScenePS("stormRain");
            if (rainPS) {
                rainPS.emitter.area.x2 = this.screenWidth + 200;
            }
            const splashPS = this._getScenePS("splash");
            if (splashPS) {
                splashPS.emitter.area.x2 = this.screenWidth;
                splashPS.emitter.area.y1 = groundY;
                splashPS.emitter.area.y2 = groundY + 70;
            }
        }
    }

    // ── Live Canvas2D ⇄ WebGL Renderer Switcher ────────────────────────────

    _toggleRenderer() {
        const wantWebGL = !(this.renderer instanceof WebGLRenderer);
        const freshCanvas = document.createElement("canvas");
        freshCanvas.id     = canvas.id || "myCanvas";
        freshCanvas.width  = this.screenWidth;
        freshCanvas.height = this.screenHeight;
        canvas.replaceWith(freshCanvas);
        canvas = freshCanvas;

        // Clear cached WebGL textures on all loaded images so a new GL context uploads cleanly
        for (const key in this.graphicAssets) {
            const img = this.graphicAssets[key]?.img;
            if (img)
                img._webglTexture = null;
        }

        let newRenderer = null;
        if (wantWebGL) {
            const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (gl) {
                newRenderer = new WebGLRenderer(canvas, gl);
                newRenderer._textCacheMax = 256;
            }
        }
        if (!newRenderer) {
            newRenderer = new Canvas2DRenderer(canvas);
        }

        renderer = newRenderer;
        this.renderer = newRenderer;
        this.Configure({
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
            imageSmoothingEnabled: true
        });
        Input.SetupMouseEvents(canvas);

        // Refresh color caches on active emitters
        if (this._particleSystem) this._particleSystem._syncColors();
        for (const em of this._sceneEmitters) em.ps._syncColors();
        for (const fx of this._explosionPool.objects) fx.particleSystem._syncColors();
        for (const fx of this._shockwavePool.objects) fx.particleSystem._syncColors();

        this.menu.SetCanvas(freshCanvas);
        this._updateTelemetryStrings(true);
    }

    // ── Multi-Emitter Scene Initialization ─────────────────────────────────

    _initActiveScene() {
        this._sceneEmitters = [];
        this._torpedoes     = [];
        this._fireworkRockets = [];
        this._lightningBolts  = [];
        this._lightningFlash  = 0;

        const smokeImg  = this.graphicAssets.smoke.img;
        const smoke2Img = this.graphicAssets.smoke2.img;
        const rainImg   = this.graphicAssets.waterdrop.img;
        const cx        = this._getViewportCenterX();
        const cy        = this.screenHeight * 0.5;

        if (this._mode === "scene-spaceship") {
            this._shipPos.Set(cx, cy);
            this._shipAngle = 0;

            // 1. Deep-space parallax starfield (prewarmed area emitter)
            const starfieldPS = new ParticleSystem(null, {
                maxParticleCount: 220,
                globalCompositeOperation: "lighter",
                renderShape: "circle",
                PARTICLE_SIZE: 6,
                emitterType: emitterType.area,
                AREA_X1: 0, AREA_Y1: 0,
                AREA_X2: this.screenWidth, AREA_Y2: this.screenHeight,
                MIN_INITIAL_VELOCITY: 18,
                MAX_INITIAL_VELOCITY: 55,
                directionMode: "polar",
                MIN_ANGLE: Math.PI,
                MAX_ANGLE: Math.PI,
                MIN_OPACITY_INCREMENT_VELOCITY: 1.5,
                MAX_OPACITY_INCREMENT_VELOCITY: 3.0,
                MIN_HOLD_TIME: 2.0,
                MAX_HOLD_TIME: 4.0,
                MIN_OPACITY_DECREMENT_VELOCITY: 0.8,
                MAX_OPACITY_DECREMENT_VELOCITY: 1.5,
                MIN_INITIAL_SCALE: 0.3,
                MAX_INITIAL_SCALE: 1.0,
                MIN_SCALE_VELOCITY: 0,
                MAX_SCALE_VELOCITY: 0,
                emitCountPerSpawn: 2,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.04,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.08,
                startColor: "#b8dcff",
                endColor: "#6699ff",
                prewarm: true,
                prewarmTime: 6.0
            });

            // 2. World-space 4x4 animated smoke wake left behind the ship
            const wakeSmokePS = new ParticleSystem(smoke2Img, {
                maxParticleCount: 180,
                globalCompositeOperation: "source-over",
                sheetColumns: 4,
                sheetRows: 4,
                frameMode: "animate",
                emitterType: emitterType.point,
                MIN_INITIAL_VELOCITY: 20,
                MAX_INITIAL_VELOCITY: 55,
                directionMode: "polar",
                MIN_ANGLE: -0.35,
                MAX_ANGLE:  0.35,
                VELOCITY_DAMPING: 1.2,
                MIN_OPACITY_INCREMENT_VELOCITY: 6.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 10.0,
                MIN_MAX_OPACITY: 0.45,
                MAX_MAX_OPACITY: 0.70,
                MIN_HOLD_TIME: 0.1,
                MAX_HOLD_TIME: 0.25,
                MIN_OPACITY_DECREMENT_VELOCITY: 1.1,
                MAX_OPACITY_DECREMENT_VELOCITY: 1.8,
                MIN_INITIAL_SCALE: 0.12,
                MAX_INITIAL_SCALE: 0.22,
                MIN_SCALE_VELOCITY: 0.35,
                MAX_SCALE_VELOCITY: 0.65,
                MIN_INITIAL_ROTATION: 0,
                MAX_INITIAL_ROTATION: PI2,
                MIN_ROTATION_VELOCITY: -0.8,
                MAX_ROTATION_VELOCITY:  0.8,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.018,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.032,
                startColor: "#7088b0",
                endColor: "#252a40"
            }, this._shipPos);

            // 3. Directional Ion Thruster Flame (polar cone rotated via SetRotation)
            const thrusterPS = new ParticleSystem(smokeImg, Object.assign({}, thrusterConfig, {
                maxParticleCount: 300,
                MIN_INITIAL_VELOCITY: 180,
                MAX_INITIAL_VELOCITY: 340,
                MIN_INITIAL_SCALE: 0.035,
                MAX_INITIAL_SCALE: 0.085,
                MIN_SCALE_VELOCITY: 0.12,
                MAX_SCALE_VELOCITY: 0.24,
                startColor: "#fff280",
                endColor: "#ff2a00"
            }), this._shipPos);

            // 4. Local-Space Energy Shield Ring (carries particles rigidly with ship position & rotation)
            const shieldPS = new ParticleSystem(null, Object.assign({}, localAuraConfig, {
                EMISSION_INNER_RADIUS: 38,
                EMISSION_RADIUS: 46
            }), this._shipPos);

            this._sceneEmitters.push(
                { id: "starfield", ps: starfieldPS },
                { id: "wake",      ps: wakeSmokePS },
                { id: "thruster",  ps: thrusterPS },
                { id: "shield",    ps: shieldPS }
            );
        }
        else if (this._mode === "scene-campfire") {
            const fireX = cx;
            const fireY = 610;

            // Layer 1: High rising 4x4 dark smoke column above the flames
            const hearthSmokePS = new ParticleSystem(smoke2Img, {
                maxParticleCount: 220,
                globalCompositeOperation: "source-over",
                sheetColumns: 4,
                sheetRows: 4,
                frameMode: "animate",
                emitterType: emitterType.circle,
                EMISSION_RADIUS: 22,
                MIN_INITIAL_VELOCITY: 65,
                MAX_INITIAL_VELOCITY: 110,
                directionMode: "polar",
                MIN_ANGLE: -1.85,
                MAX_ANGLE: -1.30,
                GRAVITY_X: 18,
                GRAVITY_Y: -75,
                VELOCITY_DAMPING: 0.25,
                MIN_OPACITY_INCREMENT_VELOCITY: 2.5,
                MAX_OPACITY_INCREMENT_VELOCITY: 4.5,
                MIN_MAX_OPACITY: 0.45,
                MAX_MAX_OPACITY: 0.75,
                MIN_HOLD_TIME: 0.3,
                MAX_HOLD_TIME: 0.7,
                MIN_OPACITY_DECREMENT_VELOCITY: 0.5,
                MAX_OPACITY_DECREMENT_VELOCITY: 1.0,
                MIN_INITIAL_SCALE: 0.22,
                MAX_INITIAL_SCALE: 0.38,
                MIN_SCALE_VELOCITY: 0.45,
                MAX_SCALE_VELOCITY: 0.85,
                MIN_INITIAL_ROTATION: -0.4,
                MAX_INITIAL_ROTATION:  0.4,
                MIN_ROTATION_VELOCITY: -0.2,
                MAX_ROTATION_VELOCITY:  0.2,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.045,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.085,
                startColor: "#6e5a4f",
                endColor:   "#22202a",
                prewarm: true,
                prewarmTime: 3.0
            }, new Vector2(fireX, fireY - 35));

            // Layer 2: Wide outer flame body
            const outerFlamePS = new ParticleSystem(smokeImg, Object.assign({}, circleCampfireConfig, {
                EMISSION_RADIUS: 52,
                GRAVITY_Y: -115,
                startColor: "#ff8811",
                endColor:   "#660800",
                prewarm: true,
                prewarmTime: 1.5
            }), new Vector2(fireX, fireY));

            // Layer 3: Intense white-hot inner flame core
            const innerCorePS = new ParticleSystem(smokeImg, {
                maxParticleCount: 220,
                globalCompositeOperation: "lighter",
                emitterType: emitterType.circle,
                EMISSION_RADIUS: 24,
                MIN_INITIAL_VELOCITY: 15,
                MAX_INITIAL_VELOCITY: 45,
                directionMode: "polar",
                MIN_ANGLE: -Math.PI * 0.65,
                MAX_ANGLE: -Math.PI * 0.35,
                GRAVITY_Y: -95,
                VELOCITY_DAMPING: 0.8,
                MIN_OPACITY_INCREMENT_VELOCITY: 8.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 14.0,
                MIN_MAX_OPACITY: 0.75,
                MAX_MAX_OPACITY: 1.0,
                MIN_HOLD_TIME: 0.08,
                MAX_HOLD_TIME: 0.2,
                MIN_OPACITY_DECREMENT_VELOCITY: 1.8,
                MAX_OPACITY_DECREMENT_VELOCITY: 3.0,
                MIN_INITIAL_SCALE: 0.04,
                MAX_INITIAL_SCALE: 0.11,
                MIN_SCALE_VELOCITY: 0.02,
                MAX_SCALE_VELOCITY: 0.10,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.008,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.018,
                startColor: "#fff8b0",
                endColor:   "#ff5500",
                prewarm: true,
                prewarmTime: 1.0
            }, new Vector2(fireX, fireY + 6));

            // Layer 4: Crackling rising spark embers
            const embersPS = new ParticleSystem(null, {
                maxParticleCount: 250,
                globalCompositeOperation: "lighter",
                renderShape: "circle",
                PARTICLE_SIZE: 9,
                emitterType: emitterType.circle,
                EMISSION_RADIUS: 44,
                MIN_INITIAL_VELOCITY: 40,
                MAX_INITIAL_VELOCITY: 130,
                directionMode: "polar",
                MIN_ANGLE: -Math.PI * 0.75,
                MAX_ANGLE: -Math.PI * 0.25,
                GRAVITY_X: 14,
                GRAVITY_Y: -150,
                VELOCITY_DAMPING: 0.4,
                MIN_OPACITY_INCREMENT_VELOCITY: 15.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 25.0,
                MIN_HOLD_TIME: 0.3,
                MAX_HOLD_TIME: 0.8,
                MIN_OPACITY_DECREMENT_VELOCITY: 1.0,
                MAX_OPACITY_DECREMENT_VELOCITY: 2.2,
                MIN_INITIAL_SCALE: 0.5,
                MAX_INITIAL_SCALE: 1.0,
                MIN_SCALE_VELOCITY: -0.35,
                MAX_SCALE_VELOCITY: -0.10,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.015,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.035,
                startColor: "#fff088",
                endColor:   "#ff2200",
                prewarm: true,
                prewarmTime: 2.0
            }, new Vector2(fireX, fireY));

            // Layer 5 & 6: Interactive Mouse Hand Torch (flame + sparks)
            const torchFlamePS = new ParticleSystem(smokeImg, {
                maxParticleCount: 220,
                globalCompositeOperation: "lighter",
                emitterType: emitterType.circle,
                EMISSION_RADIUS: 12,
                MIN_INITIAL_VELOCITY: 20,
                MAX_INITIAL_VELOCITY: 60,
                directionMode: "polar",
                MIN_ANGLE: -Math.PI * 0.65,
                MAX_ANGLE: -Math.PI * 0.35,
                GRAVITY_Y: -110,
                VELOCITY_DAMPING: 0.8,
                MIN_OPACITY_INCREMENT_VELOCITY: 10.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 18.0,
                MIN_HOLD_TIME: 0.05,
                MAX_HOLD_TIME: 0.15,
                MIN_OPACITY_DECREMENT_VELOCITY: 2.0,
                MAX_OPACITY_DECREMENT_VELOCITY: 3.5,
                MIN_INITIAL_SCALE: 0.035,
                MAX_INITIAL_SCALE: 0.085,
                MIN_SCALE_VELOCITY: 0.04,
                MAX_SCALE_VELOCITY: 0.12,
                emitCountPerSpawn: 2,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.006,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.014,
                startColor: "#ffe875",
                endColor:   "#cc1800"
            }, new Vector2(cx + 160, 420));

            this._sceneEmitters.push(
                { id: "hearthSmoke", ps: hearthSmokePS },
                { id: "outerFlame",  ps: outerFlamePS },
                { id: "innerCore",   ps: innerCorePS },
                { id: "embers",      ps: embersPS },
                { id: "torchFlame",  ps: torchFlamePS }
            );
        }
        else if (this._mode === "scene-fireworks") {
            // Rocket ascending spark trail emitter (Burst-driven per rocket)
            const trailPS = new ParticleSystem(null, {
                maxParticleCount: 500,
                globalCompositeOperation: "lighter",
                renderShape: "line",
                PARTICLE_SIZE: 36,
                emitterType: emitterType.point,
                MIN_INITIAL_VELOCITY: 15,
                MAX_INITIAL_VELOCITY: 65,
                directionMode: "polar",
                MIN_ANGLE: Math.PI * 0.35,
                MAX_ANGLE: Math.PI * 0.65,
                GRAVITY_Y: 160,
                VELOCITY_DAMPING: 1.5,
                MIN_OPACITY_INCREMENT_VELOCITY: 25.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 35.0,
                MIN_HOLD_TIME: 0.05,
                MAX_HOLD_TIME: 0.15,
                MIN_OPACITY_DECREMENT_VELOCITY: 2.8,
                MAX_OPACITY_DECREMENT_VELOCITY: 4.5,
                MIN_INITIAL_SCALE: 0.08,
                MAX_INITIAL_SCALE: 0.16,
                MIN_SCALE_VELOCITY: -0.1,
                MAX_SCALE_VELOCITY: 0,
                alignToVelocity: true,
                startColor: "#fff099",
                endColor:   "#ff5500"
            });
            trailPS.active = false;

            // Main Chrysanthemum / Peony shell burst emitter
            const peonyPS = new ParticleSystem(smokeImg, {
                maxParticleCount: 900,
                globalCompositeOperation: "lighter",
                renderShape: "circle",
                PARTICLE_SIZE: 16,
                emitterType: emitterType.point,
                MIN_INITIAL_VELOCITY: 110,
                MAX_INITIAL_VELOCITY: 340,
                directionMode: "polar",
                MIN_ANGLE: 0,
                MAX_ANGLE: PI2,
                GRAVITY_Y: 115,
                VELOCITY_DAMPING: 2.3,
                MIN_OPACITY_INCREMENT_VELOCITY: 25.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 35.0,
                MIN_HOLD_TIME: 0.25,
                MAX_HOLD_TIME: 0.55,
                MIN_OPACITY_DECREMENT_VELOCITY: 1.1,
                MAX_OPACITY_DECREMENT_VELOCITY: 2.0,
                MIN_INITIAL_SCALE: 0.45,
                MAX_INITIAL_SCALE: 0.95,
                MIN_SCALE_VELOCITY: -0.35,
                MAX_SCALE_VELOCITY: -0.10,
                startColor: "#00f5ff",
                endColor:   "#ff00a0"
            });
            peonyPS.active = false;

            // Crackling glitter sub-sparks emitter
            const glitterPS = new ParticleSystem(null, {
                maxParticleCount: 600,
                globalCompositeOperation: "lighter",
                renderShape: "rect",
                PARTICLE_SIZE: 10,
                emitterType: emitterType.circle,
                EMISSION_RADIUS: 45,
                MIN_INITIAL_VELOCITY: 40,
                MAX_INITIAL_VELOCITY: 180,
                directionMode: "polar",
                MIN_ANGLE: 0,
                MAX_ANGLE: PI2,
                GRAVITY_Y: 140,
                VELOCITY_DAMPING: 3.0,
                MIN_OPACITY_INCREMENT_VELOCITY: 20.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 30.0,
                MIN_HOLD_TIME: 0.35,
                MAX_HOLD_TIME: 0.75,
                MIN_OPACITY_DECREMENT_VELOCITY: 1.8,
                MAX_OPACITY_DECREMENT_VELOCITY: 3.2,
                MIN_INITIAL_SCALE: 0.4,
                MAX_INITIAL_SCALE: 0.9,
                MIN_SCALE_VELOCITY: -0.4,
                MAX_SCALE_VELOCITY: -0.1,
                MIN_ROTATION_VELOCITY: -8,
                MAX_ROTATION_VELOCITY:  8,
                startColor: "#ffffff",
                endColor:   "#ffd166"
            });
            glitterPS.active = false;

            this._sceneEmitters.push(
                { id: "trail",   ps: trailPS },
                { id: "peony",   ps: peonyPS },
                { id: "glitter", ps: glitterPS }
            );
            this._fireworkTimer = 0.1;
        }
        else if (this._mode === "scene-storm") {
            this._stormCamera.x = 0;
            this._stormCamera.y = 0;
            const groundY = Math.max(460, this.screenHeight - 143);

            // 1. Rolling Storm Fog (relativeArea: true)
            const fogPS = new ParticleSystem(smokeImg, {
                maxParticleCount: 90,
                globalCompositeOperation: "source-over",
                emitterType: emitterType.area,
                relativeArea: true,
                AREA_X1: -150, AREA_Y1: groundY - 245,
                AREA_X2: this.screenWidth + 150, AREA_Y2: groundY + 35,
                MIN_INITIAL_VELOCITY: 25,
                MAX_INITIAL_VELOCITY: 55,
                directionMode: "polar",
                MIN_ANGLE: -0.1,
                MAX_ANGLE:  0.1,
                MIN_OPACITY_INCREMENT_VELOCITY: 0.2,
                MAX_OPACITY_INCREMENT_VELOCITY: 0.4,
                MIN_MAX_OPACITY: 0.12,
                MAX_MAX_OPACITY: 0.24,
                MIN_HOLD_TIME: 1.5,
                MAX_HOLD_TIME: 3.0,
                MIN_OPACITY_DECREMENT_VELOCITY: 0.15,
                MAX_OPACITY_DECREMENT_VELOCITY: 0.3,
                MIN_INITIAL_SCALE: 0.7,
                MAX_INITIAL_SCALE: 1.3,
                MIN_SCALE_VELOCITY: 0.05,
                MAX_SCALE_VELOCITY: 0.12,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.08,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.16,
                startColor: "#627d98",
                endColor:   "#334e68",
                prewarm: true,
                prewarmTime: 5.0
            });

            // 2. Heavy Slanted Rain (relativeArea: true)
            const stormRainPS = new ParticleSystem(rainImg, Object.assign({}, rainConfig, {
                maxParticleCount: 1600,
                AREA_X1: -250, AREA_Y1: -80,
                AREA_X2: this.screenWidth + 200, AREA_Y2: -80
            }));

            // 3. Ground Puddle Splashes (relativeArea: true along road strip)
            const splashPS = new ParticleSystem(null, {
                maxParticleCount: 450,
                globalCompositeOperation: "lighter",
                renderShape: "circle",
                PARTICLE_SIZE: 7,
                emitterType: emitterType.area,
                relativeArea: true,
                AREA_X1: 0, AREA_Y1: groundY,
                AREA_X2: this.screenWidth, AREA_Y2: groundY + 70,
                MIN_INITIAL_VELOCITY: 45,
                MAX_INITIAL_VELOCITY: 110,
                directionMode: "polar",
                MIN_ANGLE: -Math.PI * 0.78,
                MAX_ANGLE: -Math.PI * 0.22,
                GRAVITY_Y: 420,
                MIN_OPACITY_INCREMENT_VELOCITY: 20.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 30.0,
                MIN_MAX_OPACITY: 0.5,
                MAX_MAX_OPACITY: 0.85,
                MIN_HOLD_TIME: 0.04,
                MAX_HOLD_TIME: 0.10,
                MIN_OPACITY_DECREMENT_VELOCITY: 3.5,
                MAX_OPACITY_DECREMENT_VELOCITY: 5.5,
                MIN_INITIAL_SCALE: 0.4,
                MAX_INITIAL_SCALE: 0.9,
                MIN_SCALE_VELOCITY: -0.5,
                MAX_SCALE_VELOCITY: -0.1,
                emitCountPerSpawn: 3,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.006,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.014,
                startColor: "#bceeff",
                endColor:   "#4da6ff",
                prewarm: true,
                prewarmTime: 1.0
            });

            // 4. Lightning Strike Ground Sparks (one-shot Burst on strike)
            const thunderSparksPS = new ParticleSystem(null, Object.assign({}, fountainConfig, {
                maxParticleCount: 250,
                PARTICLE_SIZE: 65,
                MIN_INITIAL_VELOCITY: 180,
                MAX_INITIAL_VELOCITY: 460,
                MIN_ANGLE: -Math.PI * 0.88,
                MAX_ANGLE: -Math.PI * 0.12,
                GRAVITY_Y: 620,
                startColor: "#ffffff",
                endColor:   "#00d9ff"
            }));
            thunderSparksPS.active = false;

            this._sceneEmitters.push(
                { id: "fog",           ps: fogPS },
                { id: "rain",          ps: stormRainPS },
                { id: "splash",        ps: splashPS },
                { id: "thunderSparks", ps: thunderSparksPS }
            );
        }
        else if (this._mode === "scene-scifi") {
            const vortexPos = new Vector2(cx - 120, 320);
            const turretPos = new Vector2(cx + 150, 620);

            // 1. Black Hole Singularity (inward radialVelocity ring)
            const bhRingPS = new ParticleSystem(smokeImg, blackHoleConfig, vortexPos);

            // 2. Black Hole Accretion Core (tight spinning ring)
            const bhCorePS = new ParticleSystem(null, {
                maxParticleCount: 200,
                globalCompositeOperation: "lighter",
                renderShape: "circle",
                PARTICLE_SIZE: 14,
                emitterType: emitterType.ring,
                EMISSION_INNER_RADIUS: 18,
                EMISSION_RADIUS: 28,
                radialVelocity: true,
                MIN_INITIAL_VELOCITY: 15,
                MAX_INITIAL_VELOCITY: 35,
                VELOCITY_DAMPING: 2.5,
                MIN_OPACITY_INCREMENT_VELOCITY: 10.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 18.0,
                MIN_HOLD_TIME: 0.1,
                MAX_HOLD_TIME: 0.25,
                MIN_OPACITY_DECREMENT_VELOCITY: 2.5,
                MAX_OPACITY_DECREMENT_VELOCITY: 4.0,
                MIN_INITIAL_SCALE: 0.5,
                MAX_INITIAL_SCALE: 1.0,
                MIN_SCALE_VELOCITY: -0.5,
                MAX_SCALE_VELOCITY: -0.2,
                emitCountPerSpawn: 2,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.008,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.016,
                startColor: "#ffffff",
                endColor:   "#aa00ff"
            }, vortexPos);

            // 3. Laser Beam Line Emitter (stretches from turret muzzle to cursor)
            const laserBeamPS = new ParticleSystem(smokeImg, {
                maxParticleCount: 400,
                globalCompositeOperation: "lighter",
                emitterType: emitterType.line,
                AREA_X1: turretPos.x, AREA_Y1: turretPos.y,
                AREA_X2: cx,          AREA_Y2: 260,
                MIN_INITIAL_VELOCITY: 8,
                MAX_INITIAL_VELOCITY: 30,
                directionMode: "polar",
                MIN_ANGLE: 0,
                MAX_ANGLE: PI2,
                VELOCITY_DAMPING: 2.0,
                MIN_OPACITY_INCREMENT_VELOCITY: 25.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 35.0,
                MIN_HOLD_TIME: 0.04,
                MAX_HOLD_TIME: 0.10,
                MIN_OPACITY_DECREMENT_VELOCITY: 4.0,
                MAX_OPACITY_DECREMENT_VELOCITY: 6.5,
                MIN_INITIAL_SCALE: 0.04,
                MAX_INITIAL_SCALE: 0.09,
                MIN_SCALE_VELOCITY: -0.08,
                MAX_SCALE_VELOCITY:  0.04,
                emitCountPerSpawn: 5,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.004,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.008,
                startColor: "#80ffff",
                endColor:   "#0055ff"
            });

            // 4. Laser Impact Welder Sparks at cursor
            const impactSparksPS = new ParticleSystem(null, Object.assign({}, fountainConfig, {
                maxParticleCount: 350,
                PARTICLE_SIZE: 60,
                MIN_INITIAL_VELOCITY: 140,
                MAX_INITIAL_VELOCITY: 360,
                MIN_ANGLE: 0,
                MAX_ANGLE: PI2,
                GRAVITY_Y: 500,
                VELOCITY_DAMPING: 0.8,
                emitCountPerSpawn: 3,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.006,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.014,
                startColor: "#ffffff",
                endColor:   "#00e5ff"
            }), new Vector2(cx, 260));

            this._sceneEmitters.push(
                { id: "bhRing",       ps: bhRingPS },
                { id: "bhCore",       ps: bhCorePS },
                { id: "laserBeam",    ps: laserBeamPS },
                { id: "impactSparks", ps: impactSparksPS }
            );
        }
        else if (this._mode === "scene-combat") {
            // 1. Center Sanctuary Healing Totem (continuous)
            const healPS = new ParticleSystem(null, healingAuraConfig, new Vector2(cx, 560));

            // 2. Directional Blood Spatter Emitter (Burst-triggered when shooting Left Dummy)
            const bloodPS = new ParticleSystem(null, Object.assign({}, bloodSpatterConfig, {
                maxParticleCount: 450
            }), new Vector2(cx - 180, 340));
            bloodPS.active = false;

            // 3. Fine Blood Mist Puff (Burst-triggered with blood spatter)
            const bloodMistPS = new ParticleSystem(smokeImg, {
                maxParticleCount: 150,
                globalCompositeOperation: "source-over",
                emitterType: emitterType.circle,
                EMISSION_RADIUS: 14,
                MIN_INITIAL_VELOCITY: 20,
                MAX_INITIAL_VELOCITY: 85,
                directionMode: "polar",
                MIN_ANGLE: 0,
                MAX_ANGLE: PI2,
                GRAVITY_Y: 40,
                VELOCITY_DAMPING: 2.5,
                MIN_OPACITY_INCREMENT_VELOCITY: 18.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 28.0,
                MIN_MAX_OPACITY: 0.45,
                MAX_MAX_OPACITY: 0.70,
                MIN_HOLD_TIME: 0.1,
                MAX_HOLD_TIME: 0.25,
                MIN_OPACITY_DECREMENT_VELOCITY: 1.5,
                MAX_OPACITY_DECREMENT_VELOCITY: 2.5,
                MIN_INITIAL_SCALE: 0.06,
                MAX_INITIAL_SCALE: 0.14,
                MIN_SCALE_VELOCITY: 0.15,
                MAX_SCALE_VELOCITY: 0.30,
                startColor: "#cc0000",
                endColor:   "#380000"
            }, new Vector2(cx - 180, 340));
            bloodMistPS.active = false;

            // 4. Spinning Crate Debris / Shrapnel Emitter (Burst-triggered on Right Crate)
            const debrisPS = new ParticleSystem(null, {
                maxParticleCount: 400,
                globalCompositeOperation: "source-over",
                renderShape: "rect",
                PARTICLE_SIZE: 16,
                emitterType: emitterType.circle,
                EMISSION_RADIUS: 18,
                MIN_INITIAL_VELOCITY: 140,
                MAX_INITIAL_VELOCITY: 420,
                directionMode: "polar",
                MIN_ANGLE: -Math.PI * 0.9,
                MAX_ANGLE: -Math.PI * 0.1,
                GRAVITY_Y: 580,
                VELOCITY_DAMPING: 1.2,
                MIN_OPACITY_INCREMENT_VELOCITY: 25.0,
                MAX_OPACITY_INCREMENT_VELOCITY: 35.0,
                MIN_HOLD_TIME: 0.35,
                MAX_HOLD_TIME: 0.75,
                MIN_OPACITY_DECREMENT_VELOCITY: 1.5,
                MAX_OPACITY_DECREMENT_VELOCITY: 2.8,
                MIN_INITIAL_SCALE: 0.4,
                MAX_INITIAL_SCALE: 1.0,
                MIN_SCALE_VELOCITY: -0.2,
                MAX_SCALE_VELOCITY:  0.0,
                MIN_INITIAL_ROTATION: 0,
                MAX_INITIAL_ROTATION: PI2,
                MIN_ROTATION_VELOCITY: -10.0,
                MAX_ROTATION_VELOCITY:  10.0,
                startColor: "#e09f3e",
                endColor:   "#5c3a18"
            }, new Vector2(cx + 180, 340));
            debrisPS.active = false;

            this._sceneEmitters.push(
                { id: "heal",      ps: healPS },
                { id: "blood",     ps: bloodPS },
                { id: "bloodMist", ps: bloodMistPS },
                { id: "debris",    ps: debrisPS }
            );
        }
    }

    _getScenePS(id) {
        for (let i = 0; i < this._sceneEmitters.length; i++) {
            if (this._sceneEmitters[i].id === id) return this._sceneEmitters[i].ps;
        }
        return null;
    }

    // ── Main Update Loop ───────────────────────────────────────────────────

    Update(deltaTime) {
        this._sceneTime += deltaTime;

        // Global UI & navigation hotkeys
        if (Input.IsKeyDown(KEY_V)) {
            this.showUI = !this.showUI;
            this.menu.SyncState();
        }
        if (Input.IsKeyDown(KEY_R)) {
            this._toggleRenderer();
            return;
        }
        if (Input.IsKeyDown(KEY_TAB)) {
            if (this.category === "scenes") {
                this._selectPreset(this.presetIndex);
            } else {
                this._selectScene(this.sceneIndex);
            }
        }
        if (Input.IsKeyDown(KEY_UP)) {
            if (this.category === "scenes") this._selectScene(this.sceneIndex - 1);
            else this._selectPreset(this.presetIndex - 1);
        }
        if (Input.IsKeyDown(KEY_DOWN)) {
            if (this.category === "scenes") this._selectScene(this.sceneIndex + 1);
            else this._selectPreset(this.presetIndex + 1);
        }

        // Direct preset letter shortcuts (work anytime, except M in spaceship scene where M toggles autopilot)
        for (let i = 0; i < PRESET_ITEMS.length; i++) {
            const p = PRESET_ITEMS[i];
            if (p.key === KEY_M && this.category === "scenes" && this._mode === "scene-spaceship") {
                continue;
            }
            if (Input.IsKeyDown(p.key)) {
                this._selectPreset(i);
                break;
            }
        }

        const clickedUI = false;

        if (this.category === "scenes") {
            this._updateActiveScene(deltaTime, clickedUI);
        } else {
            this._updateActivePreset(deltaTime, clickedUI);
        }

        this._explosionPool.Update(deltaTime);
        this._shockwavePool.Update(deltaTime);

        this._telemetryTimer += deltaTime;
        if (this._telemetryTimer >= 0.15) {
            this._telemetryTimer = 0;
            this._updateTelemetryStrings(false);
        }
    }

    // ── Update: Multi-Emitter Scenes ───────────────────────────────────────

    _updateActiveScene(dt, clickedUI) {
        const mx = Input.mouse.x;
        const my = Input.mouse.y;
        const cx = this._getViewportCenterX();
        const cy = this.screenHeight * 0.5;
        const triggerAction = (!clickedUI && Input.IsMouseDown(0)) || Input.IsKeyDown(KEY_SPACE);

        if (this._mode === "scene-spaceship") {
            if (Input.IsKeyDown(KEY_M)) {
                this._shipAutoPilot = !this._shipAutoPilot;
                this.menu.SyncState();
            }

            const prevX = this._shipPos.x;
            const prevY = this._shipPos.y;

            if (this._shipAutoPilot) {
                // Smooth Lissajous figure-8 flight path
                const t = this._sceneTime * 1.35;
                this._shipPos.x = cx + Math.sin(t) * 240;
                this._shipPos.y = cy + Math.sin(t * 2) * 145;
                const vx = Math.cos(t) * 240 * 1.35;
                const vy = Math.cos(t * 2) * 145 * 2.7;
                this._shipAngle = Math.atan2(vy, vx);
            } else {
                // Steer smoothly toward mouse cursor
                const tx = mx > this.sidebarWidth ? mx : cx;
                const ty = my;
                const dx = tx - prevX;
                const dy = ty - prevY;
                if (dx * dx + dy * dy > 9) {
                    this._shipAngle = Math.atan2(dy, dx);
                }
                this._shipPos.x += dx * Math.min(1, dt * 6.5);
                this._shipPos.y += dy * Math.min(1, dt * 6.5);
            }

            // Rear exhaust nozzle offset (-26px behind ship center)
            const rearX = this._shipPos.x - Math.cos(this._shipAngle) * 26;
            const rearY = this._shipPos.y - Math.sin(this._shipAngle) * 26;

            const shieldPS   = this._getScenePS("shield");
            const thrusterPS = this._getScenePS("thruster");
            const wakePS     = this._getScenePS("wake");

            if (shieldPS) {
                shieldPS.SetPosition(this._shipPos.x, this._shipPos.y);
                shieldPS.SetRotation(this._shipAngle);
            }
            if (thrusterPS) {
                thrusterPS.SetPosition(rearX, rearY);
                thrusterPS.SetRotation(this._shipAngle + Math.PI);
            }
            if (wakePS) {
                wakePS.SetPosition(rearX, rearY);
                wakePS.SetRotation(this._shipAngle + Math.PI);
            }

            // Fire Plasma Torpedo on Click / Space
            if (triggerAction) {
                const targetX = mx > this.sidebarWidth + 16 ? mx : (this._shipPos.x + Math.cos(this._shipAngle) * 320);
                const targetY = mx > this.sidebarWidth + 16 ? my : (this._shipPos.y + Math.sin(this._shipAngle) * 320);
                const noseX   = this._shipPos.x + Math.cos(this._shipAngle) * 28;
                const noseY   = this._shipPos.y + Math.sin(this._shipAngle) * 28;
                const angle   = Math.atan2(targetY - noseY, targetX - noseX);

                const trail = new ParticleSystem(this.graphicAssets.smoke.img, {
                    maxParticleCount: 90,
                    globalCompositeOperation: "lighter",
                    emitterType: emitterType.point,
                    MIN_INITIAL_VELOCITY: 10,
                    MAX_INITIAL_VELOCITY: 45,
                    VELOCITY_DAMPING: 2.0,
                    MIN_OPACITY_INCREMENT_VELOCITY: 20.0,
                    MAX_OPACITY_INCREMENT_VELOCITY: 30.0,
                    MIN_HOLD_TIME: 0.05,
                    MAX_HOLD_TIME: 0.12,
                    MIN_OPACITY_DECREMENT_VELOCITY: 3.0,
                    MAX_OPACITY_DECREMENT_VELOCITY: 4.5,
                    MIN_INITIAL_SCALE: 0.04,
                    MAX_INITIAL_SCALE: 0.08,
                    MIN_SCALE_VELOCITY: -0.05,
                    MAX_SCALE_VELOCITY: 0.05,
                    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
                    MAX_TIME_TO_SPAWN_PARTICLE: 0.010,
                    startColor: "#80ffff",
                    endColor:   "#ff3300"
                }, new Vector2(noseX, noseY));

                this._torpedoes.push({
                    x: noseX,
                    y: noseY,
                    vx: Math.cos(angle) * 560,
                    vy: Math.sin(angle) * 560,
                    tx: targetX,
                    ty: targetY,
                    life: 1.1,
                    trail
                });
            }

            // Update active torpedoes
            for (let i = this._torpedoes.length - 1; i >= 0; i--) {
                const t = this._torpedoes[i];
                t.x += t.vx * dt;
                t.y += t.vy * dt;
                t.life -= dt;
                t.trail.SetPosition(t.x, t.y);
                t.trail.Update(dt);

                const distSq = (t.x - t.tx) * (t.x - t.tx) + (t.y - t.ty) * (t.y - t.ty);
                if (distSq <= 24 * 24 || t.life <= 0) {
                    this._spawnDoubleExplosion(t.x, t.y);
                    this._torpedoes.splice(i, 1);
                }
            }
        }
        else if (this._mode === "scene-campfire") {
            const torchPS = this._getScenePS("torchFlame");
            const tx = mx > this.sidebarWidth + 12 ? mx : cx + 170;
            const ty = mx > this.sidebarWidth + 12 ? my : 400;
            if (torchPS) {
                torchPS.SetPosition(tx, ty);
            }

            if (triggerAction) {
                // Stoke the campfire: burst of bright embers & flames at the hearth
                const embersPS = this._getScenePS("embers");
                const outerPS  = this._getScenePS("outerFlame");
                if (embersPS) embersPS.Burst(60, cx, 605);
                if (outerPS)  outerPS.Burst(35, cx, 605);
            }
        }
        else if (this._mode === "scene-fireworks") {
            this._fireworkTimer -= dt;
            if (this._fireworkTimer <= 0) {
                this._fireworkTimer = RandomBetweenFloat(0.55, 0.90);
                const launchX = RandomBetweenFloat(cx - 240, cx + 240);
                const targetX = launchX + RandomBetweenFloat(-70, 70);
                const targetY = RandomBetweenFloat(130, 340);
                this._launchFirework(launchX, 700, targetX, targetY);
            }

            if (triggerAction) {
                const targetX = mx > this.sidebarWidth + 20 ? mx : cx + RandomBetweenFloat(-180, 180);
                const targetY = mx > this.sidebarWidth + 20 ? Math.min(540, my) : RandomBetweenFloat(140, 320);
                this._launchFirework(cx + RandomBetweenFloat(-120, 120), 700, targetX, targetY);
            }

            const trailPS   = this._getScenePS("trail");
            const peonyPS   = this._getScenePS("peony");
            const glitterPS = this._getScenePS("glitter");

            for (let i = this._fireworkRockets.length - 1; i >= 0; i--) {
                const r = this._fireworkRockets[i];
                r.x += r.vx * dt;
                r.y += r.vy * dt;
                r.vy += 120 * dt; // gentle gravity during ascent
                r.timer -= dt;

                if (trailPS) {
                    trailPS.Burst(2, r.x, r.y);
                }

                if (r.timer <= 0 || r.vy >= 0) {
                    const pal = r.palette;
                    if (peonyPS) {
                        peonyPS.SetColor(pal.start, pal.end);
                        peonyPS.Burst(85, r.x, r.y);
                    }
                    if (glitterPS) {
                        glitterPS.Burst(45, r.x, r.y);
                    }
                    const ring = this._shockwavePool.Activate();
                    ring.particleSystem.SetColor(pal.start, "#ffffff");
                    ring.PlayBurst(32, r.x, r.y);
                    this._fireworkRockets.splice(i, 1);
                }
            }
        }
        else if (this._mode === "scene-storm") {
            // Pan camera manually with Left/Right arrows or smoothly auto-pan
            if (Input.IsKeyPressed(KEY_LEFT)) {
                this._stormAutoPan = false;
                this._stormCamera.x -= 280 * dt;
            } else if (Input.IsKeyPressed(KEY_RIGHT)) {
                this._stormAutoPan = false;
                this._stormCamera.x += 280 * dt;
            } else if (this._stormAutoPan) {
                this._stormCamera.x = Math.sin(this._sceneTime * 0.45) * 450 + 450;
            }

            // Keep all relativeArea weather emitters anchored to the camera's top-left
            for (let i = 0; i < this._sceneEmitters.length; i++) {
                const em = this._sceneEmitters[i];
                if (em.ps.config.relativeArea) {
                    em.ps.SetPosition(this._stormCamera.x, this._stormCamera.y);
                }
            }

            // Periodic or manual lightning strikes
            this._lightningTimer -= dt;
            if (triggerAction || this._lightningTimer <= 0) {
                this._lightningTimer = RandomBetweenFloat(2.2, 4.0);
                const screenStrikeX = (triggerAction && mx > this.sidebarWidth + 20)
                    ? mx
                    : RandomBetweenFloat(this.sidebarWidth + 80, this.screenWidth - 80);
                const worldStrikeX = screenStrikeX + this._stormCamera.x;
                const groundY      = Math.max(460, this.screenHeight - 143) + 20;
                this._spawnLightningBolt(worldStrikeX, groundY);
            }

            if (this._lightningFlash > 0) {
                this._lightningFlash = Math.max(0, this._lightningFlash - dt * 3.2);
            }
            for (let i = this._lightningBolts.length - 1; i >= 0; i--) {
                this._lightningBolts[i].life -= dt;
                if (this._lightningBolts[i].life <= 0) {
                    this._lightningBolts.splice(i, 1);
                }
            }
        }
        else if (this._mode === "scene-scifi") {
            const turretX = cx + 150;
            const turretY = 620;
            const targetX = mx > this.sidebarWidth + 16 ? mx : cx;
            const targetY = mx > this.sidebarWidth + 16 ? my : 260;

            const angle   = Math.atan2(targetY - turretY, targetX - turretX);
            const muzzleX = turretX + Math.cos(angle) * 34;
            const muzzleY = turretY + Math.sin(angle) * 34;

            const laserBeamPS    = this._getScenePS("laserBeam");
            const impactSparksPS = this._getScenePS("impactSparks");

            if (laserBeamPS) {
                laserBeamPS.emitter.area.x1 = muzzleX;
                laserBeamPS.emitter.area.y1 = muzzleY;
                laserBeamPS.emitter.area.x2 = targetX;
                laserBeamPS.emitter.area.y2 = targetY;
            }
            if (impactSparksPS) {
                impactSparksPS.SetPosition(targetX, targetY);
                impactSparksPS.SetRotation(angle + Math.PI);
            }

            if (triggerAction) {
                this._spawnDoubleExplosion(targetX, targetY);
            }
        }
        else if (this._mode === "scene-combat") {
            const dummyX = cx - 180;
            const dummyY = 340;
            const crateX = cx + 180;
            const crateY = 340;

            if (this._dummyHitFlash > 0) this._dummyHitFlash = Math.max(0, this._dummyHitFlash - dt * 5);
            if (this._crateShake > 0)    this._crateShake    = Math.max(0, this._crateShake - dt * 5);

            if (triggerAction) {
                const hitLeft = !Input.IsKeyDown(KEY_SPACE) && mx > this.sidebarWidth && mx < cx;
                if (hitLeft) {
                    // Directional Blood / Gore Spatter on Target Dummy
                    const bloodPS     = this._getScenePS("blood");
                    const bloodMistPS = this._getScenePS("bloodMist");
                    const sprayAngle  = Math.atan2(my - dummyY, mx - dummyX);
                    if (bloodPS) {
                        bloodPS.SetRotation(sprayAngle);
                        bloodPS.Burst(55, dummyX, dummyY);
                    }
                    if (bloodMistPS) {
                        bloodMistPS.Burst(18, dummyX, dummyY);
                    }
                    this._dummyHitFlash = 1.0;
                } else {
                    // Spinning Rect Debris Shrapnel + Explosion on Supply Crate
                    const debrisPS = this._getScenePS("debris");
                    if (debrisPS) {
                        debrisPS.Burst(50, crateX, crateY);
                    }
                    this._spawnDoubleExplosion(crateX, crateY);
                    this._crateShake = 1.0;
                }
            }
        }

        for (let i = 0; i < this._sceneEmitters.length; i++) {
            this._sceneEmitters[i].ps.Update(dt);
        }
    }

    _launchFirework(x0, y0, tx, ty) {
        const flightTime = RandomBetweenFloat(0.65, 0.95);
        const vx = (tx - x0) / flightTime;
        const vy = (ty - y0 - 0.5 * 120 * flightTime * flightTime) / flightTime;
        const palette = FIREWORK_PALETTES[RandomBetweenInt(0, FIREWORK_PALETTES.length - 1)];
        this._fireworkRockets.push({
            x: x0,
            y: y0,
            vx,
            vy,
            timer: flightTime,
            palette
        });
    }

    _spawnLightningBolt(worldX, groundY) {
        const segments = [];
        let curX = worldX + RandomBetweenFloat(-60, 60);
        let curY = -20;
        const steps = 14;
        const stepY = (groundY - curY) / steps;

        for (let i = 1; i <= steps; i++) {
            const nextY = curY + stepY;
            const nextX = (i === steps) ? worldX : (curX + RandomBetweenFloat(-38, 38));
            segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY, main: true });

            // Occasional fork branch
            if (i > 2 && i < steps - 2 && Math.random() < 0.35) {
                const bx = nextX + RandomBetweenFloat(-75, 75);
                const by = nextY + RandomBetweenFloat(45, 95);
                segments.push({ x1: nextX, y1: nextY, x2: bx, y2: by, main: false });
            }
            curX = nextX;
            curY = nextY;
        }

        this._lightningBolts.push({ segments, life: 0.28 });
        this._lightningFlash = 0.65;

        const sparksPS = this._getScenePS("thunderSparks");
        if (sparksPS) {
            sparksPS.Burst(60, worldX, groundY);
        }
    }

    _spawnDoubleExplosion(x, y) {
        const fx = this._explosionPool.Activate();
        fx.PlayBurst(55, x, y);
        const ring = this._shockwavePool.Activate();
        ring.particleSystem.SetColor("#80f5ff", "#2050ff");
        ring.PlayBurst(30, x, y);
    }

    // ── Update: Single-Emitter Presets ─────────────────────────────────────

    _updateActivePreset(dt, clickedUI) {
        const ps = this._particleSystem;
        if (!ps) return;

        // Toggle sprite-sheet frameMode with X
        if (Input.IsKeyDown(KEY_X) && (this._mode === "spritesheet-smoke" || this._mode === "spritesheet-smoke-stream")) {
            const cfg = ps.config;
            const nextMode = cfg.frameMode === "animate" ? "random" : "animate";
            ps.SetFrames(cfg.sheetColumns, cfg.sheetRows, nextMode);
            this.menu.SyncState();
        }

        // Switch particle renderShape live (1 = sprite, 2 = circle, 3 = rect, 4 = line)
        if (Input.IsKeyDown(KEY_1)) this._setPresetShape("sprite");
        if (Input.IsKeyDown(KEY_2)) this._setPresetShape("circle");
        if (Input.IsKeyDown(KEY_3)) this._setPresetShape("rect");
        if (Input.IsKeyDown(KEY_4)) this._setPresetShape("line");

        // Trigger a pooled one-shot ParticleSystemGO explosion burst on Left Click or Space
        const mx = Input.mouse.x;
        const my = Input.mouse.y;
        const cx = this._getViewportCenterX();
        const cy = this.screenHeight * 0.5;

        if ((!clickedUI && Input.IsMouseDown(0)) || Input.IsKeyDown(KEY_SPACE)) {
            const bx = mx > this.sidebarWidth ? mx : cx;
            const by = mx > this.sidebarWidth ? my : cy;
            const fx = this._explosionPool.Activate();
            fx.SetRenderShape(ps.config.renderShape || "sprite");
            fx.PlayBurst(55, bx, by);
        }

        const item = PRESET_ITEMS[this.presetIndex];
        if (item && item.follow) {
            if (mx > this.sidebarWidth + 8 || !this.showUI) {
                ps.SetPosition(mx, my);
            }
            if (this._mode === "local-aura") {
                ps.SetRotation(this._sceneTime * 1.8);
            }
        }
        else if (this._mode === "thruster" || this._mode === "blood-spatter") {
            ps.SetPosition(cx, cy);
            const angle = Math.atan2(my - cy, mx - cx);
            ps.SetRotation(angle);
        }
        else if (this._mode === "firewall-line") {
            ps.emitter.area.x1 = cx - 180;
            ps.emitter.area.y1 = cy + 120;
            if (mx > this.sidebarWidth + 8 || !this.showUI) {
                ps.emitter.area.x2 = mx;
                ps.emitter.area.y2 = my;
            }
        }

        // Cycle festive confetti colors dynamically
        if (this._mode === "confetti") {
            this._confettiColorIdx = (this._confettiColorIdx + 1) % CONFETTI_PALETTE.length;
            const pair = CONFETTI_PALETTE[this._confettiColorIdx];
            ps.SetColor(pair[0], pair[1]);
        }

        ps.Update(dt);
    }

    _setPresetShape(shape) {
        if (!this._particleSystem) return;
        if (shape === "sprite" && !this._particleSystem.img) {
            this._particleSystem.img = this.graphicAssets.smoke.img;
        }
        this._particleSystem.SetRenderShape(shape);
        this._explosionPool.objects.forEach(fx => fx.SetRenderShape(shape));
        this.menu.SyncState();
    }

    // ── Main Draw Loop ─────────────────────────────────────────────────────

    Draw() {
        const r = this.renderer;

        if (this.category === "scenes") {
            this._drawActiveScene(r);
        }
        else {
            r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this._colBgDark);
            if (this._particleSystem) {
                this._particleSystem.Draw(r);
            }
        }

        this._explosionPool.Draw(r);
        this._shockwavePool.Draw(r);

        // Record WebGL batch draw-call count for the particles & scene
        this._lastDrawCalls = r.drawCallCount;
    }

    _drawActiveScene(r) {
        const cx = this._getViewportCenterX();
        const cy = this.screenHeight * 0.5;

        if (this._mode === "scene-spaceship") {
            r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this._colBgSpace);

            // Draw starfield, wake, and thruster behind the ship hull
            const starPS     = this._getScenePS("starfield");
            const wakePS     = this._getScenePS("wake");
            const thrusterPS = this._getScenePS("thruster");
            const shieldPS   = this._getScenePS("shield");

            if (starPS)     starPS.Draw(r);
            if (wakePS)     wakePS.Draw(r);
            if (thrusterPS) thrusterPS.Draw(r);

            // Draw active torpedoes & their particle trails
            for (let i = 0; i < this._torpedoes.length; i++) {
                const t = this._torpedoes[i];
                t.trail.Draw(r);
                r.DrawFillCircle(t.x, t.y, 5, this._colAccentCyan);
            }

            // Draw vector Spaceship Hull & Cockpit rotated along _shipAngle
            const sx  = this._shipPos.x;
            const sy  = this._shipPos.y;
            const cos = Math.cos(this._shipAngle);
            const sin = Math.sin(this._shipAngle);
            const rotPt = (lx, ly) => ({
                x: sx + lx * cos - ly * sin,
                y: sy + lx * sin + ly * cos
            });

            const hullPts = [
                rotPt(26, 0),
                rotPt(-18, -18),
                rotPt(-10, 0),
                rotPt(-18, 18)
            ];
            r.DrawPolygon(hullPts, this._colAccentCyan, 2, true, Color.FromHex("#1f3a68"));
            const cockpitPt = rotPt(6, 0);
            r.DrawFillCircle(cockpitPt.x, cockpitPt.y, 6, this._colAccentCyan);

            // Draw local-space shield aura around the ship
            if (shieldPS) shieldPS.Draw(r);
        }
        else if (this._mode === "scene-campfire") {
            r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this._colBgCampfire);

            // Night ground & stone hearth logs
            r.DrawFillBasicRectangle(0, 610, this.screenWidth, 158, Color.FromHex("#14111d"));
            r.DrawFillRectangle(cx - 18, 618, 86, 16, Color.FromHex("#4a2c18"),  0.22);
            r.DrawFillRectangle(cx + 18, 618, 86, 16, Color.FromHex("#5c371e"), -0.22);
            for (let i = -3; i <= 3; i++) {
                r.DrawFillCircle(cx + i * 22, 626 + Math.abs(i) * 2, 12, Color.FromHex("#3a3d4a"));
            }

            // Draw 4-layer campfire + mouse torch
            for (let i = 0; i < this._sceneEmitters.length; i++) {
                this._sceneEmitters[i].ps.Draw(r);
            }

            // Draw torch handle at cursor
            const torchPS = this._getScenePS("torchFlame");
            if (torchPS) {
                const tx = torchPS.emitter.position.x;
                const ty = torchPS.emitter.position.y;
                r.DrawFillRectangle(tx - 6, ty + 24, 8, 44, Color.FromHex("#6b4226"), 0.25);
            }
        }
        else if (this._mode === "scene-fireworks") {
            r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this._colBgSpace);

            // Night city skyline silhouette across the full canvas width
            const bldgColor = Color.FromHex("#11162b");
            const skylineProfile = [
                [65, 138], [55, 178], [70, 123], [62, 203], [80, 153], [58, 188],
                [75, 133], [68, 213], [64, 158], [72, 183], [80, 138]
            ];
            let bx = 0;
            let bi = 0;
            while (bx < this.screenWidth) {
                const [bw, bh] = skylineProfile[bi % skylineProfile.length];
                r.DrawFillBasicRectangle(bx, this.screenHeight - bh, bw, bh, bldgColor);
                bx += bw;
                bi++;
            }

            // Draw firework particle systems
            for (let i = 0; i < this._sceneEmitters.length; i++) {
                this._sceneEmitters[i].ps.Draw(r);
            }

            // Draw ascending rocket heads
            for (let i = 0; i < this._fireworkRockets.length; i++) {
                const rk = this._fireworkRockets[i];
                r.DrawFillCircle(rk.x, rk.y, 3.5, Color.white);
            }
        }
        else if (this._mode === "scene-storm") {
            r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this._colBgStorm);
            if (this._lightningFlash > 0) {
                r.DrawFillBasicRectangle(
                    0, 0, this.screenWidth, this.screenHeight,
                    new Color(0.75, 0.88, 1.0, this._lightningFlash * 0.45)
                );
            }

            r.ApplyCameraTransform(this._stormCamera);

            // Scrolling world ground, road, and street lamps across the full visible camera span
            const groundY    = Math.max(460, this.screenHeight - 143);
            const worldLeft  = Math.floor((this._stormCamera.x - 400) / 320) * 320;
            const worldWidth = this.screenWidth + 800;

            r.DrawFillBasicRectangle(worldLeft, groundY, worldWidth, this.screenHeight - groundY + 40, Color.FromHex("#111722"));
            r.DrawFillBasicRectangle(worldLeft, groundY + 20, worldWidth, 55, Color.FromHex("#1b2230"));
            const stripeCol = Color.FromHex("#4a5568");
            const lampPostCol = Color.FromHex("#2d3748");
            const lampGlowCol = new Color(1.0, 0.85, 0.45, 0.25);

            for (let wx = worldLeft; wx <= worldLeft + worldWidth; wx += 160) {
                r.DrawFillBasicRectangle(wx, groundY + 45, 70, 5, stripeCol);
            }
            for (let wx = worldLeft; wx <= worldLeft + worldWidth; wx += 320) {
                r.DrawFillBasicRectangle(wx - 4, groundY - 135, 8, 140, lampPostCol);
                r.DrawFillBasicRectangle(wx - 4, groundY - 135, 28, 6, lampPostCol);
                r.DrawFillCircle(wx + 20, groundY - 129, 36, lampGlowCol);
                r.DrawFillCircle(wx + 20, groundY - 129, 6, this._colAccentGold);
            }

            // Draw Lightning Bolts in world space
            const boltMainCol = new Color(0.85, 0.96, 1.0, 0.95);
            const boltSubCol  = new Color(0.45, 0.80, 1.0, 0.70);
            for (let i = 0; i < this._lightningBolts.length; i++) {
                const b = this._lightningBolts[i];
                for (let j = 0; j < b.segments.length; j++) {
                    const s = b.segments[j];
                    r.DrawLine(s.x1, s.y1, s.x2, s.y2, s.main ? boltMainCol : boltSubCol, s.main ? 3 : 1.5);
                }
            }

            // Draw weather emitters inside camera transform
            for (let i = 0; i < this._sceneEmitters.length; i++) {
                this._sceneEmitters[i].ps.Draw(r);
            }

            r.RestoreCameraTransform();
        }
        else if (this._mode === "scene-scifi") {
            r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this._colBgSpace);

            // Black Hole dark event horizon center
            const bhPos = this._getScenePS("bhRing")?.emitter.position;
            if (bhPos) {
                r.DrawFillCircle(bhPos.x, bhPos.y, 32, Color.black);
                r.DrawStrokeCircle(bhPos.x, bhPos.y, 34, Color.FromHex("#b84dff"), 2);
            }

            // Draw emitters
            for (let i = 0; i < this._sceneEmitters.length; i++) {
                this._sceneEmitters[i].ps.Draw(r);
            }

            // Draw Plasma Turret Base & Barrel at (cx + 150, 620)
            const turretX = cx + 150;
            const turretY = 620;
            const mx = Input.mouse.x > this.sidebarWidth + 16 ? Input.mouse.x : cx;
            const my = Input.mouse.x > this.sidebarWidth + 16 ? Input.mouse.y : 260;
            const angle = Math.atan2(my - turretY, mx - turretX);

            // Core laser line + turret geometry
            r.DrawLine(
                turretX + Math.cos(angle) * 30,
                turretY + Math.sin(angle) * 30,
                mx, my,
                Color.white, 2.5
            );
            r.DrawFillRectangle(
                turretX + Math.cos(angle) * 18,
                turretY + Math.sin(angle) * 18,
                42, 12, Color.FromHex("#3b82f6"), angle
            );
            r.DrawFillCircle(turretX, turretY, 22, Color.FromHex("#1e293b"));
            r.DrawStrokeCircle(turretX, turretY, 22, this._colAccentCyan, 2);
        }
        else if (this._mode === "scene-combat") {
            r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this._colBgDark);

            const dummyX = cx - 180;
            const dummyY = 340;
            const crateX = cx + 180 + (this._crateShake > 0 ? Math.sin(this._sceneTime * 60) * 6 * this._crateShake : 0);
            const crateY = 340;

            // Left: Combat Target Dummy
            const dummyCol = this._dummyHitFlash > 0 ? Color.FromHex("#ff4d4d") : Color.FromHex("#8d6e63");
            r.DrawFillBasicRectangle(dummyX - 6, dummyY + 20, 12, 55, Color.FromHex("#4e342e"));
            r.DrawFillBasicRoundRectangle(dummyX - 24, dummyY - 22, 48, 52, 8, dummyCol);
            r.DrawFillCircle(dummyX, dummyY - 40, 18, dummyCol);
            r.DrawFillText("TARGET DUMMY", dummyX, dummyY + 95, "bold 11px monospace", this._colTextMuted, "center");
            r.DrawFillText("(Click: Blood Spatter)", dummyX, dummyY + 111, "10px monospace", this._colTextDim, "center");

            // Right: Supply Crate
            r.DrawFillBasicRoundRectangle(crateX - 34, crateY - 34, 68, 68, 4, Color.FromHex("#b07d3b"));
            r.DrawStrokeBasicRoundRectangle(crateX - 34, crateY - 34, 68, 68, 4, Color.FromHex("#f4a261"), 2);
            r.DrawLine(crateX - 32, crateY - 32, crateX + 32, crateY + 32, Color.FromHex("#6c471c"), 3);
            r.DrawLine(crateX + 32, crateY - 32, crateX - 32, crateY + 32, Color.FromHex("#6c471c"), 3);
            r.DrawFillText("SUPPLY CRATE", cx + 180, crateY + 95, "bold 11px monospace", this._colTextMuted, "center");
            r.DrawFillText("(Click / Space: Shatter)", cx + 180, crateY + 111, "10px monospace", this._colTextDim, "center");

            // Center: Sanctuary Healing Pad
            r.DrawFillCircle(cx, 560, 65, new Color(0.1, 0.8, 0.4, 0.12));
            r.DrawStrokeCircle(cx, 560, 65, Color.FromHex("#2bff88"), 1.5);
            r.DrawFillText("SANCTUARY HEALING TOTEM", cx, 646, "bold 11px monospace", Color.FromHex("#2bff88"), "center");

            // Draw emitters
            for (let i = 0; i < this._sceneEmitters.length; i++) {
                this._sceneEmitters[i].ps.Draw(r);
            }
        }
    }

    // ── Telemetry Calculation & Sidebar HUD ────────────────────────────────

    _updateTelemetryStrings(force) {
        let alive = 0;
        let maxCap = 0;
        let emitterCount = 0;

        if (this.category === "scenes") {
            for (let i = 0; i < this._sceneEmitters.length; i++) {
                const ps = this._sceneEmitters[i].ps;
                alive  += ps.activeCount;
                maxCap += ps.config.maxParticleCount;
                emitterCount++;
            }
            for (let i = 0; i < this._torpedoes.length; i++) {
                alive  += this._torpedoes[i].trail.activeCount;
                maxCap += this._torpedoes[i].trail.config.maxParticleCount;
                emitterCount++;
            }
        } else if (this._particleSystem) {
            alive  += this._particleSystem.activeCount;
            maxCap += this._particleSystem.config.maxParticleCount;
            emitterCount = 1;
        }

        for (let i = 0; i < this._explosionPool.objects.length; i++) {
            const fx = this._explosionPool.objects[i];
            if (fx.active) {
                alive += fx.activeCount;
                emitterCount++;
            }
        }
        for (let i = 0; i < this._shockwavePool.objects.length; i++) {
            const fx = this._shockwavePool.objects[i];
            if (fx.active) {
                alive += fx.activeCount;
                emitterCount++;
            }
        }

        const isWebGL = this.renderer instanceof WebGLRenderer;
        const dcPart  = isWebGL ? ` | DrawCalls: ${this._lastDrawCalls}` : "";
        this._telemetryLine1 = `FPS: ${fps} | DT: ${((globalDT || 0.016) * 1000).toFixed(1)}ms${dcPart}`;
        this._telemetryLine2 = `Particles: ${alive} / ${maxCap} | Emitters: ${emitterCount}`;

        this.menu.UpdateTelemetry(this._telemetryLine1, this._telemetryLine2);
    }
}

window.onload = () => {
    Init(ParticlesShowcase);
};
