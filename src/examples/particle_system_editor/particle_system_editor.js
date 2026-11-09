// =====================================================================
// Particle System Editor — Interactive real-time particle config tool
// Uses in-engine Canvas2DRenderer and ParticleSystem (particlesystem.js)
// =====================================================================

// #region ---- PRESETS ----

const BUILTIN_IMAGES = {
    smoke:     './src/examples/particles/assets/smoke.png',
    smoke2:    './src/examples/particles/assets/smoke2.png',
    snow:      './src/examples/particles/assets/snow.png',
    waterdrop: './src/examples/particles/assets/waterdrop.png',
};

const PRESETS = {
    missileSmoke: {
        name: 'missileSmokeConfig',
        builtinImg: 'smoke',
        bgPreset: '#414146',
        motion: 'circle',
        config: {
            maxParticleCount: 200,
            globalCompositeOperation: 'overlay',
            emitterType: emitterType.point,
            AREA_X1: 0, AREA_Y1: 0, AREA_X2: 800, AREA_Y2: 640,
            MIN_INITIAL_VELOCITY: 5,
            MAX_INITIAL_VELOCITY: 20,
            MIN_DIRECTION_X: -1,
            MAX_DIRECTION_X:  1,
            MIN_DIRECTION_Y: -1,
            MAX_DIRECTION_Y:  1,
            MIN_OPACITY_INCREMENT_VELOCITY: 4.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 6.0,
            MIN_OPACITY_DECREMENT_VELOCITY: 0.5,
            MAX_OPACITY_DECREMENT_VELOCITY: 1.0,
            MIN_INITIAL_SCALE: 0.025,
            MAX_INITIAL_SCALE: 0.05,
            MIN_SCALE_VELOCITY: 0.15,
            MAX_SCALE_VELOCITY: 0.3,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: 0.05,
            MAX_ROTATION_VELOCITY: 0.15,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.04,
        }
    },
    defaultArea: {
        name: 'smokeAreaConfig',
        builtinImg: 'smoke',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: Object.assign({}, defaultParticleConfig, {
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4))
        })
    },
    pointSmoke: {
        name: 'smokePointConfig',
        builtinImg: 'smoke',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 200,
            globalCompositeOperation: 'overlay',
            emitterType: emitterType.point,
            AREA_X1: 0, AREA_Y1: 0, AREA_X2: 800, AREA_Y2: 640,
            MIN_INITIAL_VELOCITY: 10,
            MAX_INITIAL_VELOCITY: 60,
            MIN_DIRECTION_X: -1,
            MAX_DIRECTION_X:  1,
            MIN_DIRECTION_Y: -1,
            MAX_DIRECTION_Y:  1,
            MIN_OPACITY_INCREMENT_VELOCITY: 1.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 4.0,
            MIN_MAX_OPACITY: 0.35,
            MAX_MAX_OPACITY: 0.65,
            MIN_HOLD_TIME: 0.2,
            MAX_HOLD_TIME: 0.5,
            MIN_OPACITY_DECREMENT_VELOCITY: 0.5,
            MAX_OPACITY_DECREMENT_VELOCITY: 2.0,
            MIN_INITIAL_SCALE: 0.05,
            MAX_INITIAL_SCALE: 0.5,
            MIN_SCALE_VELOCITY: 0.25,
            MAX_SCALE_VELOCITY: 0.5,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: 0.05,
            MAX_ROTATION_VELOCITY: 0.15,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.01,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.1
        }
    },
    fire: {
        name: 'fireExhaustConfig',
        builtinImg: 'smoke',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 300,
            globalCompositeOperation: 'lighter',
            startColor: '#ffdd55',
            endColor: '#ff2200',
            emitterType: emitterType.point,
            AREA_X1: 0, AREA_Y1: 0, AREA_X2: 800, AREA_Y2: 640,
            MIN_INITIAL_VELOCITY: 40,
            MAX_INITIAL_VELOCITY: 120,
            MIN_DIRECTION_X: -0.35,
            MAX_DIRECTION_X:  0.35,
            MIN_DIRECTION_Y: -1,
            MAX_DIRECTION_Y: -0.4,
            GRAVITY_X: 0,
            GRAVITY_Y: -60,
            VELOCITY_DAMPING: 0.5,
            MIN_OPACITY_INCREMENT_VELOCITY: 6.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 10.0,
            MIN_OPACITY_DECREMENT_VELOCITY: 1.2,
            MAX_OPACITY_DECREMENT_VELOCITY: 2.5,
            MIN_INITIAL_SCALE: 0.04,
            MAX_INITIAL_SCALE: 0.12,
            MIN_SCALE_VELOCITY: 0.1,
            MAX_SCALE_VELOCITY: 0.35,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: -0.5,
            MAX_ROTATION_VELOCITY:  0.5,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.002,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.008
        }
    },
    jetThruster: {
        name: 'jetThrusterConfig',
        builtinImg: 'smoke',
        bgPreset: '#1a1a2e',
        motion: 'circle',
        autoRotate: true,
        config: {
            maxParticleCount: 400,
            globalCompositeOperation: 'lighter',
            startColor: '#ffe066',
            endColor: '#d92600',
            emitterType: emitterType.point,
            AREA_X1: 0, AREA_Y1: 0, AREA_X2: 800, AREA_Y2: 640,
            MIN_INITIAL_VELOCITY: 180,
            MAX_INITIAL_VELOCITY: 340,
            directionMode: 'polar',
            MIN_ANGLE: -0.22,
            MAX_ANGLE:  0.22,
            MIN_DIRECTION_X: -1,
            MAX_DIRECTION_X:  1,
            MIN_DIRECTION_Y: -1,
            MAX_DIRECTION_Y:  1,
            GRAVITY_X: 0,
            GRAVITY_Y: 0,
            VELOCITY_DAMPING: 2.2,
            MIN_OPACITY_INCREMENT_VELOCITY: 14.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 22.0,
            MIN_OPACITY_DECREMENT_VELOCITY: 1.5,
            MAX_OPACITY_DECREMENT_VELOCITY: 3.0,
            MIN_INITIAL_SCALE: 0.04,
            MAX_INITIAL_SCALE: 0.09,
            MIN_SCALE_VELOCITY: 0.15,
            MAX_SCALE_VELOCITY: 0.30,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: -1.5,
            MAX_ROTATION_VELOCITY:  1.5,
            emitCountPerSpawn: 2,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.004,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.012
        }
    },
    sparksFountain: {
        name: 'sparksFountainConfig',
        builtinImg: 'smoke',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 400,
            globalCompositeOperation: 'lighter',
            renderShape: 'line',
            PARTICLE_SIZE: 80,
            startColor: '#fff078',
            endColor: '#ff3c00',
            emitterType: emitterType.point,
            AREA_X1: 0, AREA_Y1: 0, AREA_X2: 800, AREA_Y2: 640,
            MIN_INITIAL_VELOCITY: 220,
            MAX_INITIAL_VELOCITY: 380,
            directionMode: 'polar',
            MIN_ANGLE: -2.04,
            MAX_ANGLE: -1.10,
            MIN_DIRECTION_X: -0.45,
            MAX_DIRECTION_X:  0.45,
            MIN_DIRECTION_Y: -1.0,
            MAX_DIRECTION_Y: -0.7,
            GRAVITY_X: 0,
            GRAVITY_Y: 550,
            VELOCITY_DAMPING: 0.2,
            MIN_OPACITY_INCREMENT_VELOCITY: 8.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 14.0,
            MIN_MAX_OPACITY: 0.85,
            MAX_MAX_OPACITY: 1.0,
            MIN_HOLD_TIME: 0.2,
            MAX_HOLD_TIME: 0.45,
            MIN_OPACITY_DECREMENT_VELOCITY: 0.6,
            MAX_OPACITY_DECREMENT_VELOCITY: 1.2,
            MIN_INITIAL_SCALE: 0.04,
            MAX_INITIAL_SCALE: 0.10,
            MIN_SCALE_VELOCITY: 0.02,
            MAX_SCALE_VELOCITY: 0.08,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: -2.0,
            MAX_ROTATION_VELOCITY:  2.0,
            emitCountPerSpawn: 2,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.008,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.02
        }
    },
    explosionBurst: {
        name: 'explosionBurstConfig',
        builtinImg: 'smoke',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 400,
            globalCompositeOperation: 'lighter',
            startColor: '#fff599',
            endColor: '#ff2a00',
            emitterType: emitterType.point,
            AREA_X1: 0, AREA_Y1: 0, AREA_X2: 800, AREA_Y2: 640,
            MIN_INITIAL_VELOCITY: 200,
            MAX_INITIAL_VELOCITY: 520,
            directionMode: 'polar',
            MIN_ANGLE: 0,
            MAX_ANGLE: Number(PI2.toFixed(4)),
            MIN_DIRECTION_X: -1,
            MAX_DIRECTION_X:  1,
            MIN_DIRECTION_Y: -1,
            MAX_DIRECTION_Y:  1,
            GRAVITY_X: 0,
            GRAVITY_Y: 160,
            VELOCITY_DAMPING: 3.5,
            MIN_OPACITY_INCREMENT_VELOCITY: 15.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 25.0,
            MIN_MAX_OPACITY: 0.9,
            MAX_MAX_OPACITY: 1.0,
            MIN_HOLD_TIME: 0.15,
            MAX_HOLD_TIME: 0.35,
            MIN_OPACITY_DECREMENT_VELOCITY: 0.9,
            MAX_OPACITY_DECREMENT_VELOCITY: 2.0,
            MIN_INITIAL_SCALE: 0.05,
            MAX_INITIAL_SCALE: 0.14,
            MIN_SCALE_VELOCITY: 0.08,
            MAX_SCALE_VELOCITY: 0.22,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: -1.5,
            MAX_ROTATION_VELOCITY:  1.5,
            emitCountPerSpawn: 35,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.4,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.65
        }
    },
    circleCampfire: {
        name: 'circleCampfireConfig',
        builtinImg: 'smoke',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 400,
            globalCompositeOperation: 'lighter',
            startColor: '#ffb833',
            endColor: '#801500',
            emitterType: emitterType.circle,
            EMISSION_RADIUS: 60,
            EMISSION_INNER_RADIUS: 0,
            radialVelocity: false,
            AREA_X1: 0, AREA_Y1: 0, AREA_X2: 800, AREA_Y2: 640,
            MIN_INITIAL_VELOCITY: 15,
            MAX_INITIAL_VELOCITY: 55,
            directionMode: 'polar',
            MIN_ANGLE: -2.20,
            MAX_ANGLE: -0.94,
            MIN_DIRECTION_X: -0.5,
            MAX_DIRECTION_X:  0.5,
            MIN_DIRECTION_Y: -1.0,
            MAX_DIRECTION_Y: -0.5,
            GRAVITY_X: 0,
            GRAVITY_Y: -90,
            VELOCITY_DAMPING: 0.6,
            MIN_OPACITY_INCREMENT_VELOCITY: 6.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 12.0,
            MIN_MAX_OPACITY: 0.6,
            MAX_MAX_OPACITY: 1.0,
            MIN_HOLD_TIME: 0.1,
            MAX_HOLD_TIME: 0.25,
            MIN_OPACITY_DECREMENT_VELOCITY: 1.0,
            MAX_OPACITY_DECREMENT_VELOCITY: 2.2,
            MIN_INITIAL_SCALE: 0.06,
            MAX_INITIAL_SCALE: 0.16,
            MIN_SCALE_VELOCITY: 0.05,
            MAX_SCALE_VELOCITY: 0.18,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: -1.0,
            MAX_ROTATION_VELOCITY:  1.0,
            emitCountPerSpawn: 2,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.006,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.015
        }
    },
    portalRing: {
        name: 'portalRingConfig',
        builtinImg: 'smoke',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 450,
            globalCompositeOperation: 'lighter',
            startColor: '#00f0ff',
            endColor: '#9b1dff',
            emitterType: emitterType.ring,
            EMISSION_INNER_RADIUS: 75,
            EMISSION_RADIUS: 90,
            radialVelocity: true,
            AREA_X1: 0, AREA_Y1: 0, AREA_X2: 800, AREA_Y2: 640,
            MIN_INITIAL_VELOCITY: 60,
            MAX_INITIAL_VELOCITY: 150,
            directionMode: 'polar',
            MIN_ANGLE: 0,
            MAX_ANGLE: Number(PI2.toFixed(4)),
            MIN_DIRECTION_X: -1,
            MAX_DIRECTION_X:  1,
            MIN_DIRECTION_Y: -1,
            MAX_DIRECTION_Y:  1,
            GRAVITY_X: 0,
            GRAVITY_Y: 0,
            VELOCITY_DAMPING: 2.2,
            MIN_OPACITY_INCREMENT_VELOCITY: 12.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 20.0,
            MIN_MAX_OPACITY: 0.75,
            MAX_MAX_OPACITY: 1.0,
            MIN_HOLD_TIME: 0.15,
            MAX_HOLD_TIME: 0.35,
            MIN_OPACITY_DECREMENT_VELOCITY: 1.2,
            MAX_OPACITY_DECREMENT_VELOCITY: 2.4,
            MIN_INITIAL_SCALE: 0.05,
            MAX_INITIAL_SCALE: 0.12,
            MIN_SCALE_VELOCITY: 0.04,
            MAX_SCALE_VELOCITY: 0.12,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: -2.0,
            MAX_ROTATION_VELOCITY:  2.0,
            emitCountPerSpawn: 3,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.006,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.014
        }
    },
    firewallLine: {
        name: 'firewallLineConfig',
        builtinImg: 'smoke',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 500,
            globalCompositeOperation: 'lighter',
            startColor: '#50ff64',
            endColor: '#0066ff',
            emitterType: emitterType.line,
            AREA_X1: 180, AREA_Y1: 420,
            AREA_X2: 620, AREA_Y2: 240,
            MIN_INITIAL_VELOCITY: 30,
            MAX_INITIAL_VELOCITY: 95,
            directionMode: 'polar',
            MIN_ANGLE: -2.04,
            MAX_ANGLE: -1.10,
            MIN_DIRECTION_X: -0.35,
            MAX_DIRECTION_X:  0.35,
            MIN_DIRECTION_Y: -1.0,
            MAX_DIRECTION_Y: -0.5,
            GRAVITY_X: 0,
            GRAVITY_Y: -80,
            VELOCITY_DAMPING: 0.8,
            MIN_OPACITY_INCREMENT_VELOCITY: 8.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 16.0,
            MIN_MAX_OPACITY: 0.7,
            MAX_MAX_OPACITY: 1.0,
            MIN_HOLD_TIME: 0.1,
            MAX_HOLD_TIME: 0.3,
            MIN_OPACITY_DECREMENT_VELOCITY: 1.2,
            MAX_OPACITY_DECREMENT_VELOCITY: 2.5,
            MIN_INITIAL_SCALE: 0.05,
            MAX_INITIAL_SCALE: 0.13,
            MIN_SCALE_VELOCITY: 0.06,
            MAX_SCALE_VELOCITY: 0.16,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: -1.5,
            MAX_ROTATION_VELOCITY:  1.5,
            emitCountPerSpawn: 3,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.012
        }
    },
    rain: {
        name: 'rainConfig',
        builtinImg: 'waterdrop',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 1000,
            globalCompositeOperation: 'source-over',
            emitterType: emitterType.area,
            AREA_X1: -200, AREA_Y1: -60,
            AREA_X2:  900, AREA_Y2: -10,
            MIN_INITIAL_VELOCITY: 400,
            MAX_INITIAL_VELOCITY: 800,
            MIN_DIRECTION_X: 0.15,
            MAX_DIRECTION_X: 0.25,
            MIN_DIRECTION_Y: 1,
            MAX_DIRECTION_Y: 1,
            MIN_OPACITY_INCREMENT_VELOCITY: 1.0,
            MAX_OPACITY_INCREMENT_VELOCITY: 2.0,
            MIN_OPACITY_DECREMENT_VELOCITY: 0.1,
            MAX_OPACITY_DECREMENT_VELOCITY: 1.0,
            MIN_INITIAL_SCALE: 0.25,
            MAX_INITIAL_SCALE: 0.33,
            MIN_SCALE_VELOCITY: 0,
            MAX_SCALE_VELOCITY: 0,
            MIN_INITIAL_ROTATION: -0.05,
            MAX_INITIAL_ROTATION:  0.05,
            MIN_ROTATION_VELOCITY: 0.001,
            MAX_ROTATION_VELOCITY: 0.01,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.001,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.002
        }
    },
    snow: {
        name: 'snowConfig',
        builtinImg: 'snow',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 1000,
            globalCompositeOperation: 'source-over',
            emitterType: emitterType.area,
            AREA_X1: -100, AREA_Y1: -60,
            AREA_X2:  900, AREA_Y2: -10,
            MIN_INITIAL_VELOCITY: 30,
            MAX_INITIAL_VELOCITY: 60,
            MIN_DIRECTION_X: -0.25,
            MAX_DIRECTION_X:  0.25,
            MIN_DIRECTION_Y: 1,
            MAX_DIRECTION_Y: 1,
            MIN_OPACITY_INCREMENT_VELOCITY: 0.1,
            MAX_OPACITY_INCREMENT_VELOCITY: 0.3,
            MIN_OPACITY_DECREMENT_VELOCITY: 0.05,
            MAX_OPACITY_DECREMENT_VELOCITY: 0.15,
            MIN_INITIAL_SCALE: 0.05,
            MAX_INITIAL_SCALE: 0.25,
            MIN_SCALE_VELOCITY: 0,
            MAX_SCALE_VELOCITY: 0.01,
            MIN_INITIAL_ROTATION: 0,
            MAX_INITIAL_ROTATION: Number(PI2.toFixed(4)),
            MIN_ROTATION_VELOCITY: 0.1,
            MAX_ROTATION_VELOCITY: 0.5,
            MIN_TIME_TO_SPAWN_PARTICLE: 0.001,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.002
        }
    }
};

// All numeric range parameter keys and their min/max counterparts
const NUMERIC_PARAMS = [
    'maxParticleCount',
    'PARTICLE_SIZE',
    'emitCountPerSpawn',
    'AREA_X1', 'AREA_Y1', 'AREA_X2', 'AREA_Y2',
    'EMISSION_INNER_RADIUS', 'EMISSION_RADIUS',
    'MIN_INITIAL_VELOCITY', 'MAX_INITIAL_VELOCITY',
    'MIN_DIRECTION_X', 'MAX_DIRECTION_X',
    'MIN_DIRECTION_Y', 'MAX_DIRECTION_Y',
    'MIN_ANGLE', 'MAX_ANGLE',
    'GRAVITY_X', 'GRAVITY_Y',
    'VELOCITY_DAMPING',
    'MIN_OPACITY_INCREMENT_VELOCITY', 'MAX_OPACITY_INCREMENT_VELOCITY',
    'MIN_MAX_OPACITY', 'MAX_MAX_OPACITY',
    'MIN_HOLD_TIME', 'MAX_HOLD_TIME',
    'MIN_OPACITY_DECREMENT_VELOCITY', 'MAX_OPACITY_DECREMENT_VELOCITY',
    'MIN_INITIAL_SCALE', 'MAX_INITIAL_SCALE',
    'MIN_SCALE_VELOCITY', 'MAX_SCALE_VELOCITY',
    'MIN_INITIAL_ROTATION', 'MAX_INITIAL_ROTATION',
    'MIN_ROTATION_VELOCITY', 'MAX_ROTATION_VELOCITY',
    'MIN_TIME_TO_SPAWN_PARTICLE', 'MAX_TIME_TO_SPAWN_PARTICLE',
];

const MIN_MAX_PAIRS = [
    ['EMISSION_INNER_RADIUS',          'EMISSION_RADIUS'],
    ['MIN_INITIAL_VELOCITY',           'MAX_INITIAL_VELOCITY'],
    ['MIN_DIRECTION_X',                'MAX_DIRECTION_X'],
    ['MIN_DIRECTION_Y',                'MAX_DIRECTION_Y'],
    ['MIN_ANGLE',                      'MAX_ANGLE'],
    ['MIN_OPACITY_INCREMENT_VELOCITY', 'MAX_OPACITY_INCREMENT_VELOCITY'],
    ['MIN_MAX_OPACITY',                'MAX_MAX_OPACITY'],
    ['MIN_HOLD_TIME',                  'MAX_HOLD_TIME'],
    ['MIN_OPACITY_DECREMENT_VELOCITY', 'MAX_OPACITY_DECREMENT_VELOCITY'],
    ['MIN_INITIAL_SCALE',              'MAX_INITIAL_SCALE'],
    ['MIN_SCALE_VELOCITY',             'MAX_SCALE_VELOCITY'],
    ['MIN_INITIAL_ROTATION',           'MAX_INITIAL_ROTATION'],
    ['MIN_ROTATION_VELOCITY',          'MAX_ROTATION_VELOCITY'],
    ['MIN_TIME_TO_SPAWN_PARTICLE',     'MAX_TIME_TO_SPAWN_PARTICLE'],
];

// #endregion

// #region ---- STATE ----

let canvas          = document.getElementById('editor-canvas');
const gizmoCanvas   = document.getElementById('gizmo-canvas');
const gizmoCtx      = gizmoCanvas.getContext('2d');
const wrap          = document.getElementById('canvas-wrap');
const urlWantsWebGL = new URLSearchParams(window.location.search).has('webgl');
let rendererMode    = urlWantsWebGL ? 'webgl' : 'canvas2d';

function createEditorRenderer(targetCanvas, mode) {
    if (mode === 'webgl') {
        const gl = targetCanvas.getContext('webgl2') ||
                   targetCanvas.getContext('webgl') ||
                   targetCanvas.getContext('experimental-webgl');
        if (gl) {
            return new WebGLRenderer(targetCanvas, gl);
        }
        console.warn('WebGL not supported on this browser/device; falling back to Canvas2DRenderer.');
        rendererMode = 'canvas2d';
    }
    return new Canvas2DRenderer(targetCanvas);
}

var renderer = createEditorRenderer(canvas, rendererMode);

let currentImage     = null;
let currentImageName = 'smoke.png';
let currentConfig    = Object.assign({}, defaultParticleConfig, PRESETS.missileSmoke.config);
let particleSystem   = null;

// Simulation & preview state
let paused         = false;
let emitterActive  = true;
let showGizmos     = true;
let bgMode         = '#414146'; // hex color or 'checker'
let bgColorObj     = Color.FromHex('#414146');
let motionMode     = 'circle';  // 'manual' | 'mouse' | 'circle' | 'figure8' | 'projectile'
let motionSpeed    = 280;       // px/sec for animated emitter modes
let motionTime     = 0;
let emitterPos     = new Vector2(400, 300);
let emitterHeading = 0;         // radians, for drawing directional gizmo on moving emitter
let emitterRotation = 0;        // radians, passed to particleSystem.SetRotation()
let autoRotateWithMotion = false;

// Mouse interaction state
let mousePos       = { x: 400, y: 300 };
let isDraggingPos  = false;
let areaDragMode   = null;      // null | 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'draw'
let areaDragStart  = null;

// Loop timing & FPS
let lastFrameTime = performance.now();
let fps           = 60;
let framesAccum   = 0;
let deltaAccum    = 0;

// #endregion

// #region ---- IMAGE GENERATION & LOADING ----

/** Creates a procedural soft radial-gradient puff image as an immediate/fallback sprite. */
function createProceduralImage(size = 128) {
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');
    const half = size / 2;
    const grad = octx.createRadialGradient(half, half, 2, half, half, half);
    grad.addColorStop(0,   'rgba(235, 235, 235, 1.0)');
    grad.addColorStop(0.4, 'rgba(190, 190, 190, 0.7)');
    grad.addColorStop(0.75,'rgba(140, 140, 140, 0.25)');
    grad.addColorStop(1,   'rgba(100, 100, 100, 0.0)');
    octx.fillStyle = grad;
    octx.fillRect(0, 0, size, size);

    off.halfWidth  = half;
    off.halfHeight = half;
    off.src        = off.toDataURL('image/png');
    return off;
}

function applyParticleImage(img, name) {
    img.halfWidth  = img.width  / 2;
    img.halfHeight = img.height / 2;
    img._webglTexture = null;
    currentImage     = img;
    currentImageName = name;

    document.getElementById('sprite-thumb').src = img.src;
    document.getElementById('tb-image-name').textContent = name;
    document.getElementById('tb-image-size').textContent = `${img.width} × ${img.height} px`;

    if (particleSystem) {
        particleSystem.img = img;
        for (let i = 0; i < particleSystem.particles.length; i++) {
            particleSystem.particles[i].img = img;
        }
        particleSystem._syncColors();
    }
}

function loadBuiltInImage(key) {
    if (key === 'procedural') {
        const proc = createProceduralImage(128);
        applyParticleImage(proc, 'soft_circle.png');
        return;
    }

    const path = BUILTIN_IMAGES[key];
    if (!path) return;

    const img = new Image();
    img.onload = () => {
        applyParticleImage(img, `${key}.png`);
    };
    img.onerror = () => {
        // Fallback if opened without static file access
        const proc = createProceduralImage(128);
        applyParticleImage(proc, `${key} (fallback)`);
    };
    img.src = path;
}

function loadUserImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        applyParticleImage(img, file.name);
        // Add custom option to built-in dropdown to reflect custom state
        const sel = document.getElementById('select-builtin-img');
        let customOpt = sel.querySelector('option[value="custom"]');
        if (!customOpt) {
            customOpt = document.createElement('option');
            customOpt.value = 'custom';
            sel.prepend(customOpt);
        }
        customOpt.textContent = `Custom: ${file.name}`;
        sel.value = 'custom';
    };
    img.src = url;
}

// #endregion

// #region ---- PARTICLE SYSTEM MANAGEMENT ----

function rebuildParticleSystem() {
    if (!currentImage) {
        currentImage = createProceduralImage(128);
    }
    particleSystem = new ParticleSystem(
        currentImage,
        currentConfig,
        new Vector2(emitterPos.x, emitterPos.y)
    );
    particleSystem.active = emitterActive;
    particleSystem.SetRotation(emitterRotation);
    syncEmitterArea();
}

function syncEmitterArea() {
    if (!particleSystem) return;
    particleSystem.emitter.area = {
        x1: currentConfig.AREA_X1,
        y1: currentConfig.AREA_Y1,
        x2: currentConfig.AREA_X2,
        y2: currentConfig.AREA_Y2
    };
}

/** Normalizes a color config value (hex string, Color, or null) into a "#rrggbb" hex string. */
function normalizeHexColor(val, fallback = '#ffffff') {
    const parsed = _parseParticleColor(val);
    if (!parsed) return fallback;
    const r = Math.max(0, Math.min(255, Math.round(parsed.r * 255))).toString(16).padStart(2, '0');
    const g = Math.max(0, Math.min(255, Math.round(parsed.g * 255))).toString(16).padStart(2, '0');
    const b = Math.max(0, Math.min(255, Math.round(parsed.b * 255))).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/** Updates the live ParticleSystem in-place when any parameter changes. */
function applyConfigChange(changedKey) {
    if (!particleSystem) {
        rebuildParticleSystem();
        return;
    }

    // Copy all config values into the live particleSystem.config
    Object.assign(particleSystem.config, currentConfig);
    particleSystem._syncColors();

    // Handle pool resizing if maxParticleCount changed
    if (changedKey === 'maxParticleCount') {
        const target = Math.max(1, Math.min(5000, Math.round(currentConfig.maxParticleCount)));
        currentConfig.maxParticleCount = target;
        particleSystem.config.maxParticleCount = target;

        while (particleSystem.particles.length < target) {
            particleSystem.particles.push(new Particle(currentImage));
        }
        if (particleSystem.particles.length > target) {
            particleSystem.particles.length = target;
        }
    }

    if (changedKey === 'emitCountPerSpawn') {
        const count = Math.max(1, Math.round(currentConfig.emitCountPerSpawn || 1));
        currentConfig.emitCountPerSpawn = count;
        particleSystem.config.emitCountPerSpawn = count;
    }

    // Keep area bounds synced
    syncEmitterArea();

    // If spawn interval was lowered, clamp current countdown so the user sees immediate feedback
    if (particleSystem.nextTimeToSpawnParticle > currentConfig.MAX_TIME_TO_SPAWN_PARTICLE) {
        particleSystem.nextTimeToSpawnParticle = currentConfig.MAX_TIME_TO_SPAWN_PARTICLE;
    }

    updateJsonPreview();
}

// #endregion

// #region ---- UI SYNCHRONIZATION ----

function syncUIFromConfig() {
    // Select inputs
    document.getElementById('cfg-globalCompositeOperation').value = currentConfig.globalCompositeOperation;
    document.getElementById('cfg-emitterType').value = String(currentConfig.emitterType);

    const rShape = currentConfig.renderShape || 'sprite';
    currentConfig.renderShape = rShape;
    if (currentConfig.PARTICLE_SIZE === undefined) currentConfig.PARTICLE_SIZE = 64;
    document.getElementById('cfg-renderShape').value = rShape;
    document.getElementById('particle-size-panel').style.display = rShape !== 'sprite' ? 'block' : 'none';

    // Color tinting / Color-over-Lifetime controls
    const hasTint = Boolean(currentConfig.startColor || currentConfig.endColor);
    document.getElementById('chk-enable-tint').checked = hasTint;
    document.getElementById('color-tint-panel').style.display = hasTint ? 'grid' : 'none';
    if (hasTint) {
        const startHex = normalizeHexColor(currentConfig.startColor ?? currentConfig.endColor, '#ffffff');
        const endHex   = normalizeHexColor(currentConfig.endColor   ?? currentConfig.startColor, startHex);
        currentConfig.startColor = startHex;
        currentConfig.endColor   = endHex;
        document.getElementById('cfg-startColor').value = startHex;
        document.getElementById('txt-startColor').value = startHex;
        document.getElementById('cfg-endColor').value   = endHex;
        document.getElementById('txt-endColor').value   = endHex;
    }

    const dirMode = currentConfig.directionMode === 'polar' ? 'polar' : 'cartesian';
    currentConfig.directionMode = dirMode;
    document.getElementById('cfg-directionMode').value = dirMode;
    document.getElementById('cartesian-dir-panel').style.display = dirMode === 'cartesian' ? 'grid' : 'none';
    document.getElementById('polar-dir-panel').style.display     = dirMode === 'polar'     ? 'grid' : 'none';
    document.getElementById('lbl-dir-mode').textContent =
        dirMode === 'polar' ? 'Polar Cone [MIN_ANGLE, MAX_ANGLE] (rad)' : 'Direction Range [-1, 1]';

    // Show/hide emitter shape sub-panels
    const emType = Number(currentConfig.emitterType);
    const isAreaOrLine   = emType === emitterType.area   || emType === emitterType.line;
    const isCircleOrRing = emType === emitterType.circle || emType === emitterType.ring;

    document.getElementById('area-bounds-panel').style.display   = isAreaOrLine   ? 'block' : 'none';
    document.getElementById('circle-bounds-panel').style.display = isCircleOrRing ? 'block' : 'none';

    if (isAreaOrLine) {
        const isLine = emType === emitterType.line;
        document.getElementById('lbl-area-bounds').textContent = isLine ? 'Line Segment (px)' : 'Area Bounds (px)';
        document.getElementById('btn-fit-area').style.display    = isLine ? 'none' : '';
        document.getElementById('btn-center-area').style.display = isLine ? 'none' : '';
        document.getElementById('btn-horiz-line').style.display  = isLine ? ''     : 'none';
    }
    if (isCircleOrRing) {
        const isRing = emType === emitterType.ring;
        document.getElementById('lbl-circle-bounds').textContent = isRing ? 'Ring Radii (px)' : 'Circle Radius (px)';
        document.getElementById('inner-radius-row').style.display = isRing ? 'block' : 'none';
        document.getElementById('cfg-radialVelocity').checked = Boolean(currentConfig.radialVelocity);
    }

    // Numeric inputs & sliders
    for (const key of NUMERIC_PARAMS) {
        const numEl = document.getElementById(`cfg-${key}`);
        const rngEl = document.getElementById(`rng-${key}`);
        if (numEl) numEl.value = currentConfig[key];
        if (rngEl) rngEl.value = currentConfig[key];
    }

    updateJsonPreview();
}

/** Builds the clean exportable config object. */
function getExportableConfig() {
    const out = {
        maxParticleCount: Math.round(currentConfig.maxParticleCount),
        globalCompositeOperation: currentConfig.globalCompositeOperation,
    };

    const rShape = currentConfig.renderShape || 'sprite';
    if (rShape !== 'sprite') {
        out.renderShape   = rShape;
        out.PARTICLE_SIZE = Number(currentConfig.PARTICLE_SIZE ?? 64);
    }

    if (currentConfig.startColor || currentConfig.endColor) {
        out.startColor = normalizeHexColor(currentConfig.startColor ?? currentConfig.endColor);
        out.endColor   = normalizeHexColor(currentConfig.endColor   ?? currentConfig.startColor, out.startColor);
    }

    out.emitterType = Number(currentConfig.emitterType);

    if (out.emitterType === emitterType.area || out.emitterType === emitterType.line) {
        out.AREA_X1 = Math.round(currentConfig.AREA_X1);
        out.AREA_Y1 = Math.round(currentConfig.AREA_Y1);
        out.AREA_X2 = Math.round(currentConfig.AREA_X2);
        out.AREA_Y2 = Math.round(currentConfig.AREA_Y2);
    }
    else if (out.emitterType === emitterType.circle) {
        out.EMISSION_RADIUS = Number(currentConfig.EMISSION_RADIUS ?? 50);
        out.radialVelocity  = Boolean(currentConfig.radialVelocity);
    }
    else if (out.emitterType === emitterType.ring) {
        out.EMISSION_INNER_RADIUS = Number(currentConfig.EMISSION_INNER_RADIUS ?? 0);
        out.EMISSION_RADIUS       = Number(currentConfig.EMISSION_RADIUS ?? 50);
        out.radialVelocity        = Boolean(currentConfig.radialVelocity);
    }

    out.MIN_INITIAL_VELOCITY = Number(currentConfig.MIN_INITIAL_VELOCITY);
    out.MAX_INITIAL_VELOCITY = Number(currentConfig.MAX_INITIAL_VELOCITY);

    out.directionMode = currentConfig.directionMode === 'polar' ? 'polar' : 'cartesian';
    if (out.directionMode === 'polar') {
        out.MIN_ANGLE = Number(currentConfig.MIN_ANGLE);
        out.MAX_ANGLE = Number(currentConfig.MAX_ANGLE);
    } else {
        out.MIN_DIRECTION_X = Number(currentConfig.MIN_DIRECTION_X);
        out.MAX_DIRECTION_X = Number(currentConfig.MAX_DIRECTION_X);
        out.MIN_DIRECTION_Y = Number(currentConfig.MIN_DIRECTION_Y);
        out.MAX_DIRECTION_Y = Number(currentConfig.MAX_DIRECTION_Y);
    }

    out.GRAVITY_X                      = Number(currentConfig.GRAVITY_X || 0);
    out.GRAVITY_Y                      = Number(currentConfig.GRAVITY_Y || 0);
    out.VELOCITY_DAMPING               = Number(currentConfig.VELOCITY_DAMPING || 0);
    out.MIN_OPACITY_INCREMENT_VELOCITY = Number(currentConfig.MIN_OPACITY_INCREMENT_VELOCITY);
    out.MAX_OPACITY_INCREMENT_VELOCITY = Number(currentConfig.MAX_OPACITY_INCREMENT_VELOCITY);
    out.MIN_MAX_OPACITY                = Number(currentConfig.MIN_MAX_OPACITY ?? 1.0);
    out.MAX_MAX_OPACITY                = Number(currentConfig.MAX_MAX_OPACITY ?? 1.0);
    out.MIN_HOLD_TIME                  = Number(currentConfig.MIN_HOLD_TIME ?? 0.0);
    out.MAX_HOLD_TIME                  = Number(currentConfig.MAX_HOLD_TIME ?? 0.0);
    out.MIN_OPACITY_DECREMENT_VELOCITY = Number(currentConfig.MIN_OPACITY_DECREMENT_VELOCITY);
    out.MAX_OPACITY_DECREMENT_VELOCITY = Number(currentConfig.MAX_OPACITY_DECREMENT_VELOCITY);
    out.MIN_INITIAL_SCALE              = Number(currentConfig.MIN_INITIAL_SCALE);
    out.MAX_INITIAL_SCALE              = Number(currentConfig.MAX_INITIAL_SCALE);
    out.MIN_SCALE_VELOCITY             = Number(currentConfig.MIN_SCALE_VELOCITY);
    out.MAX_SCALE_VELOCITY             = Number(currentConfig.MAX_SCALE_VELOCITY);
    out.MIN_INITIAL_ROTATION           = Number(currentConfig.MIN_INITIAL_ROTATION);
    out.MAX_INITIAL_ROTATION           = Number(currentConfig.MAX_INITIAL_ROTATION);
    out.MIN_ROTATION_VELOCITY          = Number(currentConfig.MIN_ROTATION_VELOCITY);
    out.MAX_ROTATION_VELOCITY          = Number(currentConfig.MAX_ROTATION_VELOCITY);
    out.emitCountPerSpawn              = Math.max(1, Math.round(currentConfig.emitCountPerSpawn || 1));
    out.MIN_TIME_TO_SPAWN_PARTICLE     = Number(currentConfig.MIN_TIME_TO_SPAWN_PARTICLE);
    out.MAX_TIME_TO_SPAWN_PARTICLE     = Number(currentConfig.MAX_TIME_TO_SPAWN_PARTICLE);

    return out;
}

function formatJSConfigSnippet() {
    const rawName = document.getElementById('config-name').value.trim() || 'particleConfig';
    const safeName = rawName.replace(/[^a-zA-Z0-9_$]/g, '_');
    const c = getExportableConfig();
    const emTypeNames = {
        [emitterType.point]:  'emitterType.point',
        [emitterType.area]:   'emitterType.area',
        [emitterType.circle]: 'emitterType.circle',
        [emitterType.ring]:   'emitterType.ring',
        [emitterType.line]:   'emitterType.line'
    };
    const emTypeStr = emTypeNames[c.emitterType] || 'emitterType.point';
    const maxRotStr = Math.abs(c.MAX_INITIAL_ROTATION - PI2) < 0.005 ? 'PI2' : c.MAX_INITIAL_ROTATION;

    const lines = [
        `const ${safeName} = {`,
        `    maxParticleCount: ${c.maxParticleCount},`,
        `    globalCompositeOperation: "${c.globalCompositeOperation}",`,
    ];

    if (c.renderShape && c.renderShape !== 'sprite') {
        lines.push(
            `    renderShape: "${c.renderShape}",`,
            `    PARTICLE_SIZE: ${c.PARTICLE_SIZE},`
        );
    }

    if (c.startColor || c.endColor) {
        lines.push(
            `    startColor: "${c.startColor}",`,
            `    endColor: "${c.endColor}",`
        );
    }

    lines.push(`    emitterType: ${emTypeStr},`);

    if (c.emitterType === emitterType.area || c.emitterType === emitterType.line) {
        lines.push(
            ``,
            `    AREA_X1: ${c.AREA_X1},`,
            `    AREA_Y1: ${c.AREA_Y1},`,
            `    AREA_X2: ${c.AREA_X2},`,
            `    AREA_Y2: ${c.AREA_Y2},`
        );
    }
    else if (c.emitterType === emitterType.circle) {
        lines.push(
            ``,
            `    EMISSION_RADIUS: ${c.EMISSION_RADIUS},`,
            `    radialVelocity: ${c.radialVelocity},`
        );
    }
    else if (c.emitterType === emitterType.ring) {
        lines.push(
            ``,
            `    EMISSION_INNER_RADIUS: ${c.EMISSION_INNER_RADIUS},`,
            `    EMISSION_RADIUS: ${c.EMISSION_RADIUS},`,
            `    radialVelocity: ${c.radialVelocity},`
        );
    }

    lines.push(
        ``,
        `    MIN_INITIAL_VELOCITY: ${c.MIN_INITIAL_VELOCITY},`,
        `    MAX_INITIAL_VELOCITY: ${c.MAX_INITIAL_VELOCITY},`,
        ``
    );

    if (c.directionMode === 'polar') {
        const maxAngleStr = Math.abs(c.MAX_ANGLE - PI2) < 0.005 ? 'PI2' : c.MAX_ANGLE;
        lines.push(
            `    directionMode: "polar",`,
            `    MIN_ANGLE: ${c.MIN_ANGLE},`,
            `    MAX_ANGLE: ${maxAngleStr},`
        );
    } else {
        lines.push(
            `    MIN_DIRECTION_X: ${c.MIN_DIRECTION_X},`,
            `    MAX_DIRECTION_X: ${c.MAX_DIRECTION_X},`,
            `    MIN_DIRECTION_Y: ${c.MIN_DIRECTION_Y},`,
            `    MAX_DIRECTION_Y: ${c.MAX_DIRECTION_Y},`
        );
    }

    lines.push(
        ``,
        `    GRAVITY_X: ${c.GRAVITY_X},`,
        `    GRAVITY_Y: ${c.GRAVITY_Y},`,
        `    VELOCITY_DAMPING: ${c.VELOCITY_DAMPING},`,
        ``,
        `    MIN_OPACITY_INCREMENT_VELOCITY: ${c.MIN_OPACITY_INCREMENT_VELOCITY},`,
        `    MAX_OPACITY_INCREMENT_VELOCITY: ${c.MAX_OPACITY_INCREMENT_VELOCITY},`,
        `    MIN_MAX_OPACITY: ${c.MIN_MAX_OPACITY},`,
        `    MAX_MAX_OPACITY: ${c.MAX_MAX_OPACITY},`,
        `    MIN_HOLD_TIME: ${c.MIN_HOLD_TIME},`,
        `    MAX_HOLD_TIME: ${c.MAX_HOLD_TIME},`,
        `    MIN_OPACITY_DECREMENT_VELOCITY: ${c.MIN_OPACITY_DECREMENT_VELOCITY},`,
        `    MAX_OPACITY_DECREMENT_VELOCITY: ${c.MAX_OPACITY_DECREMENT_VELOCITY},`,
        ``,
        `    MIN_INITIAL_SCALE: ${c.MIN_INITIAL_SCALE},`,
        `    MAX_INITIAL_SCALE: ${c.MAX_INITIAL_SCALE},`,
        ``,
        `    MIN_SCALE_VELOCITY: ${c.MIN_SCALE_VELOCITY},`,
        `    MAX_SCALE_VELOCITY: ${c.MAX_SCALE_VELOCITY},`,
        ``,
        `    MIN_INITIAL_ROTATION: ${c.MIN_INITIAL_ROTATION},`,
        `    MAX_INITIAL_ROTATION: ${maxRotStr},`,
        ``,
        `    MIN_ROTATION_VELOCITY: ${c.MIN_ROTATION_VELOCITY},`,
        `    MAX_ROTATION_VELOCITY: ${c.MAX_ROTATION_VELOCITY},`,
        ``,
        `    emitCountPerSpawn: ${c.emitCountPerSpawn},`,
        `    MIN_TIME_TO_SPAWN_PARTICLE: ${c.MIN_TIME_TO_SPAWN_PARTICLE},`,
        `    MAX_TIME_TO_SPAWN_PARTICLE: ${c.MAX_TIME_TO_SPAWN_PARTICLE}`,
        `};`
    );

    return lines.join('\n');
}

function updateJsonPreview() {
    const previewEl = document.getElementById('json-preview');
    if (previewEl) {
        previewEl.textContent = JSON.stringify(getExportableConfig(), null, 2);
    }
}

// #endregion

// #region ---- CANVAS RESIZE & GIZMOS ----

function resizeCanvas() {
    renderer.width     = wrap.clientWidth;
    renderer.height    = wrap.clientHeight;
    gizmoCanvas.width  = wrap.clientWidth;
    gizmoCanvas.height = wrap.clientHeight;
    if (emitterPos.x === 400 && emitterPos.y === 300 && wrap.clientWidth > 0) {
        emitterPos.Set(wrap.clientWidth / 2, wrap.clientHeight / 2);
    }
}

function setRendererMode(mode) {
    const targetMode = mode === 'webgl' ? 'webgl' : 'canvas2d';
    if (targetMode === rendererMode && renderer) return;

    // A <canvas> locks its context type after getContext() is called,
    // so replace #editor-canvas with a fresh element when switching renderers.
    const freshCanvas = document.createElement('canvas');
    freshCanvas.id = 'editor-canvas';
    canvas.replaceWith(freshCanvas);
    canvas = freshCanvas;

    rendererMode = targetMode;
    renderer = createEditorRenderer(canvas, rendererMode);
    resizeCanvas();

    // Clear any cached WebGLTexture from a previous WebGL context so it re-uploads cleanly
    if (currentImage) {
        currentImage._webglTexture = null;
    }
    if (particleSystem) {
        particleSystem._syncColors();
    }
}

function isPositionBasedEmitter() {
    const t = Number(currentConfig.emitterType);
    return t === emitterType.point || t === emitterType.circle || t === emitterType.ring;
}

function updateEmitterMotion(dt) {
    if (!isPositionBasedEmitter()) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (motionMode === 'mouse') {
        const dx = mousePos.x - emitterPos.x;
        const dy = mousePos.y - emitterPos.y;
        if (dx * dx + dy * dy > 1) {
            emitterHeading = Math.atan2(dy, dx);
        }
        emitterPos.Set(mousePos.x, mousePos.y);
    }
    else if (motionMode === 'circle') {
        const radius = Math.min(cx, cy) * 0.55;
        const angularSpeed = motionSpeed / Math.max(40, radius);
        motionTime += dt * angularSpeed;
        const nx = cx + Math.cos(motionTime) * radius;
        const ny = cy + Math.sin(motionTime) * radius;
        emitterHeading = motionTime + Math.PI / 2;
        emitterPos.Set(nx, ny);
    }
    else if (motionMode === 'figure8') {
        const rx = Math.min(cx, cy) * 0.65;
        const ry = Math.min(cx, cy) * 0.35;
        const rate = motionSpeed / Math.max(60, rx);
        motionTime += dt * rate;
        const prevX = emitterPos.x;
        const prevY = emitterPos.y;
        const nx = cx + Math.sin(motionTime) * rx;
        const ny = cy + Math.sin(motionTime * 2) * ry;
        if (Math.hypot(nx - prevX, ny - prevY) > 0.01) {
            emitterHeading = Math.atan2(ny - prevY, nx - prevX);
        }
        emitterPos.Set(nx, ny);
    }
    else if (motionMode === 'projectile') {
        emitterHeading = -0.35; // slight upward angle like a fired missile
        const vx = Math.cos(emitterHeading) * motionSpeed;
        const vy = Math.sin(emitterHeading) * motionSpeed;
        let nx = emitterPos.x + vx * dt;
        let ny = emitterPos.y + vy * dt;
        const pad = 60;
        if (nx > canvas.width + pad || nx < -pad || ny > canvas.height + pad || ny < -pad) {
            nx = cx - Math.cos(emitterHeading) * (Math.min(cx, cy) * 0.7);
            ny = cy - Math.sin(emitterHeading) * (Math.min(cx, cy) * 0.7);
        }
        emitterPos.Set(nx, ny);
    }

    if (particleSystem) {
        particleSystem.SetPosition(emitterPos.x, emitterPos.y);
        if (autoRotateWithMotion && motionMode !== 'manual') {
            // Point exhaust cone opposite the travel heading
            let exhaustAngle = emitterHeading + Math.PI;
            while (exhaustAngle >  Math.PI) exhaustAngle -= PI2;
            while (exhaustAngle < -Math.PI) exhaustAngle += PI2;
            emitterRotation = Number(exhaustAngle.toFixed(2));
            particleSystem.SetRotation(emitterRotation);
            const rotNum = document.getElementById('emitter-rot-num');
            const rotRng = document.getElementById('emitter-rot-rng');
            if (rotNum && document.activeElement !== rotNum) rotNum.value = emitterRotation;
            if (rotRng && document.activeElement !== rotRng) rotRng.value = emitterRotation;
        }
    }
}

function drawGizmos(ctx) {
    if (!showGizmos) return;

    ctx.save();
    const emType = Number(currentConfig.emitterType);

    if (isPositionBasedEmitter()) {
        const x = emitterPos.x;
        const y = emitterPos.y;

        // Draw Circle or Ring shape boundary
        if (emType === emitterType.circle || emType === emitterType.ring) {
            const outerR = Math.max(0, Number(currentConfig.EMISSION_RADIUS ?? 50));
            const innerR = emType === emitterType.ring
                ? Math.max(0, Math.min(outerR, Number(currentConfig.EMISSION_INNER_RADIUS ?? 0)))
                : 0;

            ctx.save();
            ctx.fillStyle = 'rgba(91, 140, 255, 0.08)';
            ctx.beginPath();
            ctx.arc(x, y, outerR, 0, PI2);
            if (emType === emitterType.ring && innerR > 0) {
                ctx.arc(x, y, innerR, 0, PI2, true);
            }
            ctx.fill();

            ctx.strokeStyle = 'rgba(91, 140, 255, 0.85)';
            ctx.lineWidth   = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(x, y, outerR, 0, PI2);
            ctx.stroke();

            if (emType === emitterType.ring && innerR > 0) {
                ctx.strokeStyle = 'rgba(160, 196, 255, 0.75)';
                ctx.beginPath();
                ctx.arc(x, y, innerR, 0, PI2);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Radial velocity outward spokes indicator
            if (currentConfig.radialVelocity) {
                ctx.strokeStyle = 'rgba(255, 152, 0, 0.75)';
                ctx.lineWidth   = 1.5;
                for (let i = 0; i < 8; i++) {
                    const a = (i * Math.PI * 0.25) + emitterRotation;
                    const r0 = Math.max(10, innerR > 0 ? innerR : outerR * 0.65);
                    const r1 = outerR + 14;
                    ctx.beginPath();
                    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
                    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
                    ctx.stroke();
                }
            }

            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#a0c4ff';
            const label = emType === emitterType.ring
                ? `RING r=${Math.round(innerR)}..${Math.round(outerR)}px`
                : `CIRCLE r=${Math.round(outerR)}px`;
            ctx.fillText(label, x - 36, y - outerR - 8);
            ctx.restore();
        }

        if (!currentConfig.radialVelocity || emType === emitterType.point) {
            if (currentConfig.directionMode === 'polar') {
                // Polar emission cone gizmo (sector + bisector vector)
                const a1 = (currentConfig.MIN_ANGLE || 0) + emitterRotation;
                const a2 = (currentConfig.MAX_ANGLE || 0) + emitterRotation;
                const span = Math.abs(a2 - a1);
                const r = 38;

                ctx.fillStyle   = 'rgba(255, 152, 0, 0.14)';
                ctx.strokeStyle = 'rgba(255, 152, 0, 0.8)';
                ctx.lineWidth   = 1.5;

                ctx.beginPath();
                if (span >= PI2 - 0.01) {
                    ctx.arc(x, y, r, 0, PI2);
                } else {
                    ctx.moveTo(x, y);
                    ctx.arc(x, y, r, Math.min(a1, a2), Math.max(a1, a2));
                    ctx.closePath();
                }
                ctx.fill();
                ctx.stroke();

                // Bisector arrow when cone is narrower than full circle
                if (span < PI2 - 0.05) {
                    const mid = (a1 + a2) * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + Math.cos(mid) * (r + 8), y + Math.sin(mid) * (r + 8));
                    ctx.stroke();
                }
            }
            else {
                // Cartesian direction range indicator vector (rotated by emitterRotation)
                const avgDirX = (currentConfig.MIN_DIRECTION_X + currentConfig.MAX_DIRECTION_X) * 0.5;
                const avgDirY = (currentConfig.MIN_DIRECTION_Y + currentConfig.MAX_DIRECTION_Y) * 0.5;
                const dirLen  = Math.hypot(avgDirX, avgDirY);

                if (dirLen > 0.05) {
                    const ux = avgDirX / dirLen;
                    const uy = avgDirY / dirLen;
                    const cos = Math.cos(emitterRotation);
                    const sin = Math.sin(emitterRotation);
                    const nx = ux * cos - uy * sin;
                    const ny = ux * sin + uy * cos;
                    ctx.strokeStyle = 'rgba(255, 152, 0, 0.75)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + nx * 36, y + ny * 36);
                    ctx.stroke();
                }
            }
        }

        // Gravity vector indicator (cyan dashed arrow)
        const gx = currentConfig.GRAVITY_X || 0;
        const gy = currentConfig.GRAVITY_Y || 0;
        const gLen = Math.hypot(gx, gy);
        if (gLen > 1) {
            const gnx = gx / gLen;
            const gny = gy / gLen;
            const arrowLen = Math.min(54, Math.max(20, gLen * 0.08));
            const ex = x + gnx * arrowLen;
            const ey = y + gny * arrowLen;

            ctx.save();
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
            ctx.fillStyle   = 'rgba(0, 229, 255, 0.8)';
            ctx.lineWidth   = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.setLineDash([]);

            // Arrowhead
            const gAngle = Math.atan2(gny, gnx);
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - Math.cos(gAngle - 0.5) * 6, ey - Math.sin(gAngle - 0.5) * 6);
            ctx.lineTo(ex - Math.cos(gAngle + 0.5) * 6, ey - Math.sin(gAngle + 0.5) * 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // If moving along a path, draw a small missile body ahead of the smoke point
        if (motionMode === 'circle' || motionMode === 'figure8' || motionMode === 'projectile') {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(emitterHeading);
            // Missile body ahead of exhaust point (0, 0)
            ctx.fillStyle = '#ff5014';
            ctx.beginPath();
            ctx.arc(14, 0, 6, 0, PI2);
            ctx.fill();
            ctx.fillStyle = '#ffaa30';
            ctx.beginPath();
            ctx.arc(4, 0, 3.5, 0, PI2);
            ctx.fill();
            ctx.restore();
        }

        // Point / center emitter crosshair
        ctx.strokeStyle = '#5b8cff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, PI2);
        ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y);
        ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12);
        ctx.stroke();
    }
    else if (emType === emitterType.line) {
        // Line segment emitter gizmo
        const x1 = currentConfig.AREA_X1;
        const y1 = currentConfig.AREA_Y1;
        const x2 = currentConfig.AREA_X2;
        const y2 = currentConfig.AREA_Y2;

        ctx.strokeStyle = 'rgba(91, 140, 255, 0.9)';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Endpoint handles
        ctx.fillStyle = '#5b8cff';
        ctx.fillRect(x1 - 5, y1 - 5, 10, 10);
        ctx.fillRect(x2 - 5, y2 - 5, 10, 10);

        const mx = (x1 + x2) * 0.5;
        const my = (y1 + y2) * 0.5;
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#a0c4ff';
        ctx.fillText(`LINE (${Math.round(x1)}, ${Math.round(y1)}) → (${Math.round(x2)}, ${Math.round(y2)})`, mx + 8, my - 8);
    }
    else {
        // Area emitter rectangle gizmo
        const x1 = currentConfig.AREA_X1;
        const y1 = currentConfig.AREA_Y1;
        const x2 = currentConfig.AREA_X2;
        const y2 = currentConfig.AREA_Y2;
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);

        ctx.fillStyle = 'rgba(91, 140, 255, 0.06)';
        ctx.fillRect(rx, ry, rw, rh);

        ctx.strokeStyle = 'rgba(91, 140, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.setLineDash([]);

        // Corner handles
        const corners = [
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x1, y: y2 },
            { x: x2, y: y2 }
        ];
        ctx.fillStyle = '#5b8cff';
        for (const c of corners) {
            ctx.fillRect(c.x - 4, c.y - 4, 8, 8);
        }

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#a0c4ff';
        ctx.fillText(`AREA (${Math.round(x1)}, ${Math.round(y1)}) → (${Math.round(x2)}, ${Math.round(y2)})`, rx + 6, ry + 15);
    }
    ctx.restore();
}

function updateTelemetryBar() {
    if (!particleSystem) return;
    const alive = particleSystem.activeCount;
    const max   = particleSystem.config.maxParticleCount;

    const avgSpawn = (currentConfig.MIN_TIME_TO_SPAWN_PARTICLE + currentConfig.MAX_TIME_TO_SPAWN_PARTICLE) * 0.5;
    const emitCount = Math.max(1, currentConfig.emitCountPerSpawn || 1);
    const spawnRate = avgSpawn > 0 ? (emitCount / avgSpawn).toFixed(1) : '∞';

    const avgInc   = (currentConfig.MIN_OPACITY_INCREMENT_VELOCITY + currentConfig.MAX_OPACITY_INCREMENT_VELOCITY) * 0.5;
    const avgDec   = (currentConfig.MIN_OPACITY_DECREMENT_VELOCITY + currentConfig.MAX_OPACITY_DECREMENT_VELOCITY) * 0.5;
    const avgMaxOp = ((currentConfig.MIN_MAX_OPACITY ?? 1) + (currentConfig.MAX_MAX_OPACITY ?? 1)) * 0.5;
    const avgHold  = ((currentConfig.MIN_HOLD_TIME ?? 0) + (currentConfig.MAX_HOLD_TIME ?? 0)) * 0.5;
    const avgLife  = ((avgInc > 0 ? avgMaxOp / avgInc : 0) + avgHold + (avgDec > 0 ? avgMaxOp / avgDec : 0)).toFixed(2);

    const poolWarn = alive >= max ? `<span class="warn">⚠ POOL FULL</span>` : '';
    const rendererInfo = renderer instanceof WebGLRenderer
        ? `<span>Renderer: <b>WebGL</b> (Draw calls: <b>${renderer.drawCallCount}</b>)</span>`
        : `<span>Renderer: <b>Canvas2D</b></span>`;

    document.getElementById('coord-bar').innerHTML = [
        rendererInfo,
        `<span>Particles: <b>${alive} / ${max}</b> ${poolWarn}</span>`,
        `<span>Spawn Rate: <b>~${spawnRate}/s</b></span>`,
        `<span>Avg Lifetime: <b>~${avgLife}s</b></span>`,
        `<span>Emitter: <b>${Math.round(emitterPos.x)}, ${Math.round(emitterPos.y)}</b></span>`,
        `<span>Mouse: <b>${Math.round(mousePos.x)}, ${Math.round(mousePos.y)}</b></span>`,
        `<span>FPS: <b>${fps}</b></span>`
    ].join('');
}

// #endregion

// #region ---- MAIN LOOP ----

function loop(now) {
    requestAnimationFrame(loop);

    let dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    framesAccum++;
    deltaAccum += dt;
    if (deltaAccum >= 0.5) {
        fps = Math.round(framesAccum / deltaAccum);
        framesAccum = 0;
        deltaAccum = 0;
    }

    if (dt > 0.1) dt = 0.1; // clamp large tab-switch spikes

    if (!paused) {
        updateEmitterMotion(dt);
        if (particleSystem) {
            particleSystem.Update(dt);
        }
    }

    // Render frame
    renderer.Clear();

    if (bgMode !== 'checker') {
        renderer.DrawFillBasicRectangle(0, 0, canvas.width, canvas.height, bgColorObj);
    }

    if (particleSystem) {
        particleSystem.Draw(renderer);
    }

    renderer.FlushAllBatches();

    gizmoCtx.clearRect(0, 0, gizmoCanvas.width, gizmoCanvas.height);
    drawGizmos(gizmoCtx);
    updateTelemetryBar();
}

// #endregion

// #region ---- CANVAS MOUSE INTERACTION ----

function getCanvasCoords(e) {
    const r = canvas.getBoundingClientRect();
    return {
        x: e.clientX - r.left,
        y: e.clientY - r.top
    };
}

function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function hitTestAreaHandle(mx, my) {
    const x1 = currentConfig.AREA_X1;
    const y1 = currentConfig.AREA_Y1;
    const x2 = currentConfig.AREA_X2;
    const y2 = currentConfig.AREA_Y2;
    const tol = 10;

    if (Number(currentConfig.emitterType) === emitterType.line) {
        if (Math.hypot(mx - x1, my - y1) <= tol) return 'nw';
        if (Math.hypot(mx - x2, my - y2) <= tol) return 'se';
        if (distToSegment(mx, my, x1, y1, x2, y2) <= tol) return 'move';
        return 'draw';
    }

    if (Math.hypot(mx - x1, my - y1) <= tol) return 'nw';
    if (Math.hypot(mx - x2, my - y1) <= tol) return 'ne';
    if (Math.hypot(mx - x1, my - y2) <= tol) return 'sw';
    if (Math.hypot(mx - x2, my - y2) <= tol) return 'se';

    const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
    if (mx >= rx && mx <= rx + rw && my >= ry && my <= ry + rh) return 'move';
    return 'draw';
}

wrap.addEventListener('mousedown', e => {
    if (e.target !== canvas) return;
    if (e.button !== 0) return;

    const pt = getCanvasCoords(e);
    mousePos = pt;

    if (isPositionBasedEmitter()) {
        // Switch to manual mode if user clicks canvas while in path motion
        if (motionMode !== 'manual' && motionMode !== 'mouse') {
            motionMode = 'manual';
            document.getElementById('select-motion').value = 'manual';
            document.getElementById('motion-speed-group').style.display = 'none';
        }
        isDraggingPos = true;
        emitterPos.Set(pt.x, pt.y);
        if (particleSystem) particleSystem.SetPosition(pt.x, pt.y);
    }
    else {
        // Area / Line emitter dragging / resizing
        areaDragMode = hitTestAreaHandle(pt.x, pt.y);
        areaDragStart = {
            mx: pt.x,
            my: pt.y,
            x1: currentConfig.AREA_X1,
            y1: currentConfig.AREA_Y1,
            x2: currentConfig.AREA_X2,
            y2: currentConfig.AREA_Y2
        };
    }
});

window.addEventListener('mousemove', e => {
    const pt = getCanvasCoords(e);
    mousePos = pt;

    if (isDraggingPos && isPositionBasedEmitter()) {
        const dx = pt.x - emitterPos.x;
        const dy = pt.y - emitterPos.y;
        if (dx * dx + dy * dy > 1) {
            emitterHeading = Math.atan2(dy, dx);
        }
        emitterPos.Set(pt.x, pt.y);
        if (particleSystem) particleSystem.SetPosition(pt.x, pt.y);
    }
    else if (areaDragMode && areaDragStart &&
             (currentConfig.emitterType === emitterType.area || currentConfig.emitterType === emitterType.line)) {
        const dx = Math.round(pt.x - areaDragStart.mx);
        const dy = Math.round(pt.y - areaDragStart.my);
        const isLine = currentConfig.emitterType === emitterType.line;

        if (areaDragMode === 'move') {
            currentConfig.AREA_X1 = areaDragStart.x1 + dx;
            currentConfig.AREA_Y1 = areaDragStart.y1 + dy;
            currentConfig.AREA_X2 = areaDragStart.x2 + dx;
            currentConfig.AREA_Y2 = areaDragStart.y2 + dy;
        }
        else if (areaDragMode === 'nw') {
            currentConfig.AREA_X1 = Math.round(pt.x);
            currentConfig.AREA_Y1 = Math.round(pt.y);
        }
        else if (areaDragMode === 'ne') {
            currentConfig.AREA_X2 = Math.round(pt.x);
            currentConfig.AREA_Y1 = Math.round(pt.y);
        }
        else if (areaDragMode === 'sw') {
            currentConfig.AREA_X1 = Math.round(pt.x);
            currentConfig.AREA_Y2 = Math.round(pt.y);
        }
        else if (areaDragMode === 'se') {
            currentConfig.AREA_X2 = Math.round(pt.x);
            currentConfig.AREA_Y2 = Math.round(pt.y);
        }
        else if (areaDragMode === 'draw') {
            if (isLine) {
                currentConfig.AREA_X1 = Math.round(areaDragStart.mx);
                currentConfig.AREA_Y1 = Math.round(areaDragStart.my);
                currentConfig.AREA_X2 = Math.round(pt.x);
                currentConfig.AREA_Y2 = Math.round(pt.y);
            } else {
                currentConfig.AREA_X1 = Math.round(Math.min(areaDragStart.mx, pt.x));
                currentConfig.AREA_Y1 = Math.round(Math.min(areaDragStart.my, pt.y));
                currentConfig.AREA_X2 = Math.round(Math.max(areaDragStart.mx, pt.x));
                currentConfig.AREA_Y2 = Math.round(Math.max(areaDragStart.my, pt.y));
            }
        }

        syncUIFromConfig();
        applyConfigChange('AREA');
    }
});

window.addEventListener('mouseup', () => {
    isDraggingPos = false;
    areaDragMode  = null;
    areaDragStart = null;
});

// #endregion

// #region ---- IMPORT / EXPORT ----

function exportJSON() {
    const rawName = document.getElementById('config-name').value.trim() || 'particle_config';
    const fileName = rawName.endsWith('.json') ? rawName : `${rawName}.json`;
    const json = JSON.stringify(getExportableConfig(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

function loadConfigJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const parsed = JSON.parse(e.target.result);
            const incoming = parsed.config ?? parsed;

            // Merge with defaultParticleConfig so any omitted fields have valid defaults
            currentConfig = Object.assign({}, defaultParticleConfig, incoming);
            if (incoming.directionMode === undefined && (incoming.MIN_ANGLE !== undefined || incoming.MAX_ANGLE !== undefined)) {
                currentConfig.directionMode = 'polar';
            }
            if (incoming.MAX_OPACITY !== undefined) {
                if (incoming.MIN_MAX_OPACITY === undefined) currentConfig.MIN_MAX_OPACITY = incoming.MAX_OPACITY;
                if (incoming.MAX_MAX_OPACITY === undefined) currentConfig.MAX_MAX_OPACITY = incoming.MAX_OPACITY;
            }
            if (incoming.HOLD_TIME !== undefined) {
                if (incoming.MIN_HOLD_TIME === undefined) currentConfig.MIN_HOLD_TIME = incoming.HOLD_TIME;
                if (incoming.MAX_HOLD_TIME === undefined) currentConfig.MAX_HOLD_TIME = incoming.HOLD_TIME;
            }
            if (incoming.tintColor !== undefined) {
                if (incoming.startColor === undefined) currentConfig.startColor = incoming.tintColor;
                if (incoming.endColor === undefined)   currentConfig.endColor   = incoming.tintColor;
            }

            const baseName = file.name.replace(/\.json$/i, '');
            document.getElementById('config-name').value = baseName;

            syncUIFromConfig();
            rebuildParticleSystem();
        } catch (err) {
            alert('Invalid particle config JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function copyTextWithFeedback(btnEl, text, originalLabel) {
    navigator.clipboard.writeText(text).then(() => {
        btnEl.textContent = '✓ Copied!';
        setTimeout(() => { btnEl.textContent = originalLabel; }, 1400);
    });
}

// #endregion

// #region ---- EVENT WIRING & INIT ----

function wireControls() {
    // Load image button & thumbnail click
    document.getElementById('btn-load-img').addEventListener('click', () =>
        document.getElementById('file-img').click());
    document.getElementById('thumb-drop-zone').addEventListener('click', () =>
        document.getElementById('file-img').click());
    document.getElementById('file-img').addEventListener('change', e => {
        if (e.target.files[0]) loadUserImageFile(e.target.files[0]);
    });

    // Built-in image selector
    document.getElementById('select-builtin-img').addEventListener('change', e => {
        if (e.target.value !== 'custom') {
            loadBuiltInImage(e.target.value);
        }
    });

    // Preset selector
    document.getElementById('select-preset').addEventListener('change', e => {
        const preset = PRESETS[e.target.value];
        if (!preset) return;

        currentConfig = Object.assign({}, defaultParticleConfig, preset.config);
        document.getElementById('config-name').value = preset.name;

        if (preset.builtinImg) {
            document.getElementById('select-builtin-img').value = preset.builtinImg;
            loadBuiltInImage(preset.builtinImg);
        }

        if (preset.bgPreset) {
            bgMode = preset.bgPreset;
            document.getElementById('bg-preset').value = preset.bgPreset;
            if (preset.bgPreset.startsWith('#')) {
                document.getElementById('bg-color').value = preset.bgPreset;
                bgColorObj = Color.FromHex(preset.bgPreset);
            }
        }

        if (preset.motion) {
            motionMode = preset.motion;
            document.getElementById('select-motion').value = preset.motion;
            document.getElementById('motion-speed-group').style.display =
                (motionMode === 'circle' || motionMode === 'figure8' || motionMode === 'projectile') ? 'flex' : 'none';
        }

        autoRotateWithMotion = Boolean(preset.autoRotate);
        document.getElementById('chk-auto-rotate').checked = autoRotateWithMotion;
        if (!autoRotateWithMotion) {
            emitterRotation = 0;
            document.getElementById('emitter-rot-num').value = 0;
            document.getElementById('emitter-rot-rng').value = 0;
        }

        syncUIFromConfig();
        rebuildParticleSystem();
    });

    // JSON Load / Export / Copy
    document.getElementById('btn-load-json').addEventListener('click', () =>
        document.getElementById('file-json').click());
    document.getElementById('file-json').addEventListener('change', e => {
        if (e.target.files[0]) loadConfigJSON(e.target.files[0]);
    });

    document.getElementById('btn-export').addEventListener('click', exportJSON);

    const btnCopyJs = document.getElementById('btn-copy-js');
    btnCopyJs.addEventListener('click', () => {
        copyTextWithFeedback(btnCopyJs, formatJSConfigSnippet(), 'Copy JS');
    });

    const btnCopyJsonInline = document.getElementById('btn-copy-json-inline');
    btnCopyJsonInline.addEventListener('click', () => {
        copyTextWithFeedback(btnCopyJsonInline, JSON.stringify(getExportableConfig(), null, 2), 'Copy JSON');
    });

    document.getElementById('config-name').addEventListener('input', updateJsonPreview);

    // Playback & Emitter controls
    const btnEmit = document.getElementById('btn-toggle-emit');
    btnEmit.addEventListener('click', () => {
        emitterActive = !emitterActive;
        if (particleSystem) particleSystem.active = emitterActive;
        btnEmit.textContent = emitterActive ? 'Emit: ON' : 'Emit: OFF';
        btnEmit.classList.toggle('off', !emitterActive);
    });

    document.getElementById('btn-burst').addEventListener('click', () => {
        if (!particleSystem) return;
        const count = currentConfig.emitCountPerSpawn > 1 ? currentConfig.emitCountPerSpawn : 25;
        particleSystem.Burst(count);
    });

    const btnPause = document.getElementById('btn-pause');
    btnPause.addEventListener('click', () => {
        paused = !paused;
        btnPause.textContent = paused ? '▶ Resume' : '⏸ Pause';
        btnPause.classList.toggle('primary', paused);
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        emitterPos.Set(canvas.width / 2, canvas.height / 2);
        rebuildParticleSystem();
    });

    // Canvas overlay controls (Renderer, Motion, Background, Gizmos)
    const selRenderer = document.getElementById('select-renderer');
    selRenderer.value = rendererMode;
    selRenderer.addEventListener('change', () => {
        setRendererMode(selRenderer.value);
    });

    const selMotion = document.getElementById('select-motion');
    const speedGroup = document.getElementById('motion-speed-group');
    selMotion.addEventListener('change', () => {
        motionMode = selMotion.value;
        speedGroup.style.display =
            (motionMode === 'circle' || motionMode === 'figure8' || motionMode === 'projectile') ? 'flex' : 'none';
        if (motionMode === 'manual') {
            emitterPos.Set(canvas.width / 2, canvas.height / 2);
            if (particleSystem) particleSystem.SetPosition(emitterPos.x, emitterPos.y);
        }
    });

    const rngSpeed = document.getElementById('motion-speed');
    const lblSpeed = document.getElementById('motion-speed-val');
    rngSpeed.addEventListener('input', () => {
        motionSpeed = Number(rngSpeed.value);
        lblSpeed.textContent = `${motionSpeed} px/s`;
    });

    const bgPreset = document.getElementById('bg-preset');
    const bgColor  = document.getElementById('bg-color');
    bgPreset.addEventListener('change', () => {
        bgMode = bgPreset.value;
        if (bgMode.startsWith('#')) {
            bgColor.value = bgMode;
            bgColorObj = Color.FromHex(bgMode);
        }
    });
    bgColor.addEventListener('input', () => {
        bgMode = bgColor.value;
        bgColorObj = Color.FromHex(bgMode);
    });

    const chkGizmo = document.getElementById('chk-gizmo');
    chkGizmo.addEventListener('change', () => {
        showGizmos = chkGizmo.checked;
    });

    // Composite operation & renderShape selects
    document.getElementById('cfg-globalCompositeOperation').addEventListener('change', e => {
        currentConfig.globalCompositeOperation = e.target.value;
        applyConfigChange('globalCompositeOperation');
    });

    document.getElementById('cfg-renderShape').addEventListener('change', e => {
        currentConfig.renderShape = e.target.value;
        syncUIFromConfig();
        applyConfigChange('renderShape');
    });

    // Color tinting / Color-over-Lifetime controls
    const chkEnableTint = document.getElementById('chk-enable-tint');
    const cfgStartColor = document.getElementById('cfg-startColor');
    const txtStartColor = document.getElementById('txt-startColor');
    const cfgEndColor   = document.getElementById('cfg-endColor');
    const txtEndColor   = document.getElementById('txt-endColor');

    const applyColorPreset = (startHex, endHex) => {
        currentConfig.startColor = startHex;
        currentConfig.endColor   = endHex;
        syncUIFromConfig();
        applyConfigChange('COLOR');
    };

    chkEnableTint.addEventListener('change', () => {
        if (chkEnableTint.checked) {
            applyColorPreset(cfgStartColor.value || '#ffdd55', cfgEndColor.value || '#ff2a00');
        } else {
            applyColorPreset(null, null);
        }
    });

    cfgStartColor.addEventListener('input', e => {
        currentConfig.startColor = e.target.value;
        txtStartColor.value = e.target.value;
        if (!currentConfig.endColor) currentConfig.endColor = e.target.value;
        applyConfigChange('startColor');
    });
    txtStartColor.addEventListener('change', e => {
        const hex = normalizeHexColor(e.target.value, cfgStartColor.value);
        currentConfig.startColor = hex;
        syncUIFromConfig();
        applyConfigChange('startColor');
    });

    cfgEndColor.addEventListener('input', e => {
        currentConfig.endColor = e.target.value;
        txtEndColor.value = e.target.value;
        if (!currentConfig.startColor) currentConfig.startColor = e.target.value;
        applyConfigChange('endColor');
    });
    txtEndColor.addEventListener('change', e => {
        const hex = normalizeHexColor(e.target.value, cfgEndColor.value);
        currentConfig.endColor = hex;
        syncUIFromConfig();
        applyConfigChange('endColor');
    });

    document.getElementById('btn-sync-end-color').addEventListener('click', () => {
        currentConfig.endColor = currentConfig.startColor || cfgStartColor.value;
        syncUIFromConfig();
        applyConfigChange('endColor');
    });

    document.getElementById('btn-tint-none').addEventListener('click',  () => applyColorPreset(null, null));
    document.getElementById('btn-tint-fire').addEventListener('click',  () => applyColorPreset('#ffdd55', '#ff2a00'));
    document.getElementById('btn-tint-magic').addEventListener('click', () => applyColorPreset('#00f0ff', '#9b1dff'));
    document.getElementById('btn-tint-ice').addEventListener('click',   () => applyColorPreset('#e0faff', '#1e88ff'));

    document.getElementById('cfg-emitterType').addEventListener('change', e => {
        currentConfig.emitterType = Number(e.target.value);
        syncUIFromConfig();
        applyConfigChange('emitterType');
    });

    document.getElementById('cfg-radialVelocity').addEventListener('change', e => {
        currentConfig.radialVelocity = e.target.checked;
        syncUIFromConfig();
        applyConfigChange('radialVelocity');
    });

    document.getElementById('cfg-directionMode').addEventListener('change', e => {
        currentConfig.directionMode = e.target.value;
        syncUIFromConfig();
        applyConfigChange('directionMode');
    });

    // Area & Line helper buttons
    document.getElementById('btn-fit-area').addEventListener('click', () => {
        currentConfig.AREA_X1 = 0;
        currentConfig.AREA_Y1 = 0;
        currentConfig.AREA_X2 = canvas.width;
        currentConfig.AREA_Y2 = canvas.height;
        syncUIFromConfig();
        applyConfigChange('AREA');
    });

    document.getElementById('btn-center-area').addEventListener('click', () => {
        const cx = Math.round(canvas.width / 2);
        const cy = Math.round(canvas.height / 2);
        currentConfig.AREA_X1 = cx - 120;
        currentConfig.AREA_Y1 = cy - 120;
        currentConfig.AREA_X2 = cx + 120;
        currentConfig.AREA_Y2 = cy + 120;
        syncUIFromConfig();
        applyConfigChange('AREA');
    });

    document.getElementById('btn-horiz-line').addEventListener('click', () => {
        const cx = Math.round(canvas.width / 2);
        const cy = Math.round(canvas.height / 2);
        currentConfig.AREA_X1 = cx - 220;
        currentConfig.AREA_Y1 = cy;
        currentConfig.AREA_X2 = cx + 220;
        currentConfig.AREA_Y2 = cy;
        syncUIFromConfig();
        applyConfigChange('AREA');
    });

    // Direction quick preset buttons (works for both Cartesian and Polar modes)
    document.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = btn.dataset.dir;
            if (currentConfig.directionMode === 'polar') {
                if (dir === 'omni') {
                    currentConfig.MIN_ANGLE = 0;     currentConfig.MAX_ANGLE = Number(PI2.toFixed(4));
                } else if (dir === 'up') {
                    currentConfig.MIN_ANGLE = -1.92; currentConfig.MAX_ANGLE = -1.22;
                } else if (dir === 'down') {
                    currentConfig.MIN_ANGLE =  1.22; currentConfig.MAX_ANGLE =  1.92;
                } else if (dir === 'left') {
                    currentConfig.MIN_ANGLE =  2.79; currentConfig.MAX_ANGLE =  3.49;
                } else if (dir === 'right') {
                    currentConfig.MIN_ANGLE = -0.35; currentConfig.MAX_ANGLE =  0.35;
                }
            } else {
                if (dir === 'omni') {
                    currentConfig.MIN_DIRECTION_X = -1;    currentConfig.MAX_DIRECTION_X = 1;
                    currentConfig.MIN_DIRECTION_Y = -1;    currentConfig.MAX_DIRECTION_Y = 1;
                } else if (dir === 'up') {
                    currentConfig.MIN_DIRECTION_X = -0.35; currentConfig.MAX_DIRECTION_X = 0.35;
                    currentConfig.MIN_DIRECTION_Y = -1;    currentConfig.MAX_DIRECTION_Y = -0.5;
                } else if (dir === 'down') {
                    currentConfig.MIN_DIRECTION_X = -0.35; currentConfig.MAX_DIRECTION_X = 0.35;
                    currentConfig.MIN_DIRECTION_Y = 0.5;   currentConfig.MAX_DIRECTION_Y = 1;
                } else if (dir === 'left') {
                    currentConfig.MIN_DIRECTION_X = -1;    currentConfig.MAX_DIRECTION_X = -0.5;
                    currentConfig.MIN_DIRECTION_Y = -0.35; currentConfig.MAX_DIRECTION_Y = 0.35;
                } else if (dir === 'right') {
                    currentConfig.MIN_DIRECTION_X = 0.5;   currentConfig.MAX_DIRECTION_X = 1;
                    currentConfig.MIN_DIRECTION_Y = -0.35; currentConfig.MAX_DIRECTION_Y = 0.35;
                }
            }
            syncUIFromConfig();
            applyConfigChange('DIRECTION');
        });
    });

    // Runtime Emitter Rotation (SetRotation) preview controls
    const emRotNum = document.getElementById('emitter-rot-num');
    const emRotRng = document.getElementById('emitter-rot-rng');
    const chkAutoRot = document.getElementById('chk-auto-rotate');

    const updateEmitterRotation = (val) => {
        const parsed = parseFloat(val);
        if (isNaN(parsed)) return;
        emitterRotation = parsed;
        if (emRotNum && document.activeElement !== emRotNum) emRotNum.value = emitterRotation;
        if (emRotRng && document.activeElement !== emRotRng) emRotRng.value = emitterRotation;
        if (particleSystem) particleSystem.SetRotation(emitterRotation);
    };

    emRotNum.addEventListener('input', e => updateEmitterRotation(e.target.value));
    emRotRng.addEventListener('input', e => {
        emRotNum.value = e.target.value;
        updateEmitterRotation(e.target.value);
    });
    chkAutoRot.addEventListener('change', () => {
        autoRotateWithMotion = chkAutoRot.checked;
    });
    document.getElementById('btn-emitter-rot-zero').addEventListener('click', () => {
        autoRotateWithMotion = false;
        chkAutoRot.checked = false;
        emRotNum.value = 0;
        emRotRng.value = 0;
        updateEmitterRotation(0);
    });

    // Gravity quick buttons
    document.getElementById('btn-gravity-zero').addEventListener('click', () => {
        currentConfig.GRAVITY_X = 0;
        currentConfig.GRAVITY_Y = 0;
        syncUIFromConfig();
        applyConfigChange('GRAVITY');
    });
    document.getElementById('btn-gravity-down').addEventListener('click', () => {
        currentConfig.GRAVITY_X = 0;
        currentConfig.GRAVITY_Y = 450;
        syncUIFromConfig();
        applyConfigChange('GRAVITY');
    });
    document.getElementById('btn-gravity-up').addEventListener('click', () => {
        currentConfig.GRAVITY_X = 0;
        currentConfig.GRAVITY_Y = -60;
        syncUIFromConfig();
        applyConfigChange('GRAVITY');
    });

    // Opacity & Hold quick buttons
    document.getElementById('btn-opacity-full').addEventListener('click', () => {
        currentConfig.MIN_MAX_OPACITY = 1.0;
        currentConfig.MAX_MAX_OPACITY = 1.0;
        syncUIFromConfig();
        applyConfigChange('MAX_OPACITY');
    });
    document.getElementById('btn-opacity-soft').addEventListener('click', () => {
        currentConfig.MIN_MAX_OPACITY = 0.3;
        currentConfig.MAX_MAX_OPACITY = 0.6;
        syncUIFromConfig();
        applyConfigChange('MAX_OPACITY');
    });
    document.getElementById('btn-hold-zero').addEventListener('click', () => {
        currentConfig.MIN_HOLD_TIME = 0.0;
        currentConfig.MAX_HOLD_TIME = 0.0;
        syncUIFromConfig();
        applyConfigChange('HOLD_TIME');
    });

    // Rotation quick buttons
    document.getElementById('btn-rot-zero').addEventListener('click', () => {
        currentConfig.MIN_INITIAL_ROTATION = 0;
        currentConfig.MAX_INITIAL_ROTATION = 0;
        syncUIFromConfig();
        applyConfigChange('ROTATION');
    });
    document.getElementById('btn-rot-full').addEventListener('click', () => {
        currentConfig.MIN_INITIAL_ROTATION = 0;
        currentConfig.MAX_INITIAL_ROTATION = Number(PI2.toFixed(4));
        syncUIFromConfig();
        applyConfigChange('ROTATION');
    });

    // Wire all numeric inputs and range sliders
    for (const key of NUMERIC_PARAMS) {
        const numEl = document.getElementById(`cfg-${key}`);
        const rngEl = document.getElementById(`rng-${key}`);

        const handleUpdate = (rawVal) => {
            const val = parseFloat(rawVal);
            if (isNaN(val)) return;
            currentConfig[key] = val;

            // Keep MIN <= MAX pairs coherent
            for (const [minKey, maxKey] of MIN_MAX_PAIRS) {
                if (key === minKey && currentConfig[minKey] > currentConfig[maxKey]) {
                    currentConfig[maxKey] = currentConfig[minKey];
                    const maxNum = document.getElementById(`cfg-${maxKey}`);
                    const maxRng = document.getElementById(`rng-${maxKey}`);
                    if (maxNum) maxNum.value = currentConfig[maxKey];
                    if (maxRng) maxRng.value = currentConfig[maxKey];
                }
                else if (key === maxKey && currentConfig[maxKey] < currentConfig[minKey]) {
                    currentConfig[minKey] = currentConfig[maxKey];
                    const minNum = document.getElementById(`cfg-${minKey}`);
                    const minRng = document.getElementById(`rng-${minKey}`);
                    if (minNum) minNum.value = currentConfig[minKey];
                    if (minRng) minRng.value = currentConfig[minKey];
                }
            }

            if (numEl && document.activeElement !== numEl) numEl.value = currentConfig[key];
            if (rngEl && document.activeElement !== rngEl) rngEl.value = currentConfig[key];

            applyConfigChange(key);
        };

        if (numEl) numEl.addEventListener('input', e => handleUpdate(e.target.value));
        if (rngEl) rngEl.addEventListener('input', e => {
            if (numEl) numEl.value = e.target.value;
            handleUpdate(e.target.value);
        });
    }

    // Drag & drop image or JSON anywhere onto the workspace
    const dropOverlay = document.getElementById('drop-overlay');
    window.addEventListener('dragover', e => {
        e.preventDefault();
        dropOverlay.classList.add('visible');
    });
    window.addEventListener('dragleave', e => {
        if (e.relatedTarget === null || !document.body.contains(e.relatedTarget)) {
            dropOverlay.classList.remove('visible');
        }
    });
    window.addEventListener('drop', e => {
        e.preventDefault();
        dropOverlay.classList.remove('visible');
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        if (file.type.startsWith('image/')) {
            loadUserImageFile(file);
        } else if (file.name.toLowerCase().endsWith('.json')) {
            loadConfigJSON(file);
        }
    });
}

// Initialize
new ResizeObserver(resizeCanvas).observe(wrap);
resizeCanvas();
wireControls();

// Start with Missile Smoke (Death Rally) preset & motion
document.getElementById('motion-speed-group').style.display = 'flex';
syncUIFromConfig();
rebuildParticleSystem();
loadBuiltInImage('smoke');
requestAnimationFrame(loop);

// #endregion

