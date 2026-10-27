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
            MIN_TIME_TO_SPAWN_PARTICLE: 0.0001,
            MAX_TIME_TO_SPAWN_PARTICLE: 0.005,
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
        builtinImg: 'smoke2',
        bgPreset: '#1a1a2e',
        motion: 'manual',
        config: {
            maxParticleCount: 300,
            globalCompositeOperation: 'lighter',
            emitterType: emitterType.point,
            AREA_X1: 0, AREA_Y1: 0, AREA_X2: 800, AREA_Y2: 640,
            MIN_INITIAL_VELOCITY: 40,
            MAX_INITIAL_VELOCITY: 120,
            MIN_DIRECTION_X: -0.35,
            MAX_DIRECTION_X:  0.35,
            MIN_DIRECTION_Y: -1,
            MAX_DIRECTION_Y: -0.4,
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
    'AREA_X1', 'AREA_Y1', 'AREA_X2', 'AREA_Y2',
    'MIN_INITIAL_VELOCITY', 'MAX_INITIAL_VELOCITY',
    'MIN_DIRECTION_X', 'MAX_DIRECTION_X',
    'MIN_DIRECTION_Y', 'MAX_DIRECTION_Y',
    'MIN_OPACITY_INCREMENT_VELOCITY', 'MAX_OPACITY_INCREMENT_VELOCITY',
    'MIN_OPACITY_DECREMENT_VELOCITY', 'MAX_OPACITY_DECREMENT_VELOCITY',
    'MIN_INITIAL_SCALE', 'MAX_INITIAL_SCALE',
    'MIN_SCALE_VELOCITY', 'MAX_SCALE_VELOCITY',
    'MIN_INITIAL_ROTATION', 'MAX_INITIAL_ROTATION',
    'MIN_ROTATION_VELOCITY', 'MAX_ROTATION_VELOCITY',
    'MIN_TIME_TO_SPAWN_PARTICLE', 'MAX_TIME_TO_SPAWN_PARTICLE',
];

const MIN_MAX_PAIRS = [
    ['MIN_INITIAL_VELOCITY',           'MAX_INITIAL_VELOCITY'],
    ['MIN_DIRECTION_X',                'MAX_DIRECTION_X'],
    ['MIN_DIRECTION_Y',                'MAX_DIRECTION_Y'],
    ['MIN_OPACITY_INCREMENT_VELOCITY', 'MAX_OPACITY_INCREMENT_VELOCITY'],
    ['MIN_OPACITY_DECREMENT_VELOCITY', 'MAX_OPACITY_DECREMENT_VELOCITY'],
    ['MIN_INITIAL_SCALE',              'MAX_INITIAL_SCALE'],
    ['MIN_SCALE_VELOCITY',             'MAX_SCALE_VELOCITY'],
    ['MIN_INITIAL_ROTATION',           'MAX_INITIAL_ROTATION'],
    ['MIN_ROTATION_VELOCITY',          'MAX_ROTATION_VELOCITY'],
    ['MIN_TIME_TO_SPAWN_PARTICLE',     'MAX_TIME_TO_SPAWN_PARTICLE'],
];

// #endregion

// #region ---- STATE ----

const canvas   = document.getElementById('editor-canvas');
const wrap     = document.getElementById('canvas-wrap');
const renderer = new Canvas2DRenderer(canvas);

let currentImage     = null;
let currentImageName = 'smoke.png';
let currentConfig    = Object.assign({}, PRESETS.missileSmoke.config);
let particleSystem   = null;

// Simulation & preview state
let paused         = false;
let emitterActive  = true;
let showGizmos     = true;
let bgMode         = '#414146'; // hex color or 'checker'
let motionMode     = 'circle';  // 'manual' | 'mouse' | 'circle' | 'figure8' | 'projectile'
let motionSpeed    = 280;       // px/sec for animated emitter modes
let motionTime     = 0;
let emitterPos     = new Vector2(400, 300);
let emitterHeading = 0;         // radians, for drawing directional gizmo on moving emitter

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

    const img = new Image();
    img.src = off.toDataURL('image/png');
    img.width = size;
    img.height = size;
    img.halfWidth = half;
    img.halfHeight = half;
    return img;
}

function applyParticleImage(img, name) {
    img.halfWidth  = img.width  / 2;
    img.halfHeight = img.height / 2;
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
    }
}

function loadBuiltInImage(key) {
    if (key === 'procedural') {
        const proc = createProceduralImage(128);
        proc.onload = () => applyParticleImage(proc, 'soft_circle.png');
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

/** Updates the live ParticleSystem in-place when any parameter changes. */
function applyConfigChange(changedKey) {
    if (!particleSystem) {
        rebuildParticleSystem();
        return;
    }

    // Copy all config values into the live particleSystem.config
    Object.assign(particleSystem.config, currentConfig);

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

    // Show/hide area bounds sub-panel
    const isArea = currentConfig.emitterType === emitterType.area;
    document.getElementById('area-bounds-panel').style.display = isArea ? 'block' : 'none';

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
        emitterType: Number(currentConfig.emitterType),
    };

    if (out.emitterType === emitterType.area) {
        out.AREA_X1 = Math.round(currentConfig.AREA_X1);
        out.AREA_Y1 = Math.round(currentConfig.AREA_Y1);
        out.AREA_X2 = Math.round(currentConfig.AREA_X2);
        out.AREA_Y2 = Math.round(currentConfig.AREA_Y2);
    }

    out.MIN_INITIAL_VELOCITY           = Number(currentConfig.MIN_INITIAL_VELOCITY);
    out.MAX_INITIAL_VELOCITY           = Number(currentConfig.MAX_INITIAL_VELOCITY);
    out.MIN_DIRECTION_X                = Number(currentConfig.MIN_DIRECTION_X);
    out.MAX_DIRECTION_X                = Number(currentConfig.MAX_DIRECTION_X);
    out.MIN_DIRECTION_Y                = Number(currentConfig.MIN_DIRECTION_Y);
    out.MAX_DIRECTION_Y                = Number(currentConfig.MAX_DIRECTION_Y);
    out.MIN_OPACITY_INCREMENT_VELOCITY = Number(currentConfig.MIN_OPACITY_INCREMENT_VELOCITY);
    out.MAX_OPACITY_INCREMENT_VELOCITY = Number(currentConfig.MAX_OPACITY_INCREMENT_VELOCITY);
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
    out.MIN_TIME_TO_SPAWN_PARTICLE     = Number(currentConfig.MIN_TIME_TO_SPAWN_PARTICLE);
    out.MAX_TIME_TO_SPAWN_PARTICLE     = Number(currentConfig.MAX_TIME_TO_SPAWN_PARTICLE);

    return out;
}

function formatJSConfigSnippet() {
    const rawName = document.getElementById('config-name').value.trim() || 'particleConfig';
    const safeName = rawName.replace(/[^a-zA-Z0-9_$]/g, '_');
    const c = getExportableConfig();
    const emTypeStr = c.emitterType === emitterType.point ? 'emitterType.point' : 'emitterType.area';
    const maxRotStr = Math.abs(c.MAX_INITIAL_ROTATION - PI2) < 0.005 ? 'PI2' : c.MAX_INITIAL_ROTATION;

    const lines = [
        `const ${safeName} = {`,
        `    maxParticleCount: ${c.maxParticleCount},`,
        `    globalCompositeOperation: "${c.globalCompositeOperation}",`,
        `    emitterType: ${emTypeStr},`,
    ];

    if (c.emitterType === emitterType.area) {
        lines.push(
            ``,
            `    AREA_X1: ${c.AREA_X1},`,
            `    AREA_Y1: ${c.AREA_Y1},`,
            `    AREA_X2: ${c.AREA_X2},`,
            `    AREA_Y2: ${c.AREA_Y2},`
        );
    }

    lines.push(
        ``,
        `    MIN_INITIAL_VELOCITY: ${c.MIN_INITIAL_VELOCITY},`,
        `    MAX_INITIAL_VELOCITY: ${c.MAX_INITIAL_VELOCITY},`,
        ``,
        `    MIN_DIRECTION_X: ${c.MIN_DIRECTION_X},`,
        `    MAX_DIRECTION_X: ${c.MAX_DIRECTION_X},`,
        `    MIN_DIRECTION_Y: ${c.MIN_DIRECTION_Y},`,
        `    MAX_DIRECTION_Y: ${c.MAX_DIRECTION_Y},`,
        ``,
        `    MIN_OPACITY_INCREMENT_VELOCITY: ${c.MIN_OPACITY_INCREMENT_VELOCITY},`,
        `    MAX_OPACITY_INCREMENT_VELOCITY: ${c.MAX_OPACITY_INCREMENT_VELOCITY},`,
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
    renderer.width  = wrap.clientWidth;
    renderer.height = wrap.clientHeight;
    if (emitterPos.x === 400 && emitterPos.y === 300 && wrap.clientWidth > 0) {
        emitterPos.Set(wrap.clientWidth / 2, wrap.clientHeight / 2);
    }
}

function updateEmitterMotion(dt) {
    if (currentConfig.emitterType !== emitterType.point) return;

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
    }
}

function drawGizmos(ctx) {
    if (!showGizmos) return;

    ctx.save();
    if (currentConfig.emitterType === emitterType.point) {
        const x = emitterPos.x;
        const y = emitterPos.y;

        // Direction range indicator vector
        const avgDirX = (currentConfig.MIN_DIRECTION_X + currentConfig.MAX_DIRECTION_X) * 0.5;
        const avgDirY = (currentConfig.MIN_DIRECTION_Y + currentConfig.MAX_DIRECTION_Y) * 0.5;
        const dirLen  = Math.hypot(avgDirX, avgDirY);

        if (dirLen > 0.05) {
            const nx = avgDirX / dirLen;
            const ny = avgDirY / dirLen;
            ctx.strokeStyle = 'rgba(255, 152, 0, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + nx * 36, y + ny * 36);
            ctx.stroke();
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

        // Point emitter crosshair
        ctx.strokeStyle = '#5b8cff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, PI2);
        ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y);
        ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12);
        ctx.stroke();
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
    const spawnRate = avgSpawn > 0 ? (1 / avgSpawn).toFixed(1) : '∞';

    const avgInc = (currentConfig.MIN_OPACITY_INCREMENT_VELOCITY + currentConfig.MAX_OPACITY_INCREMENT_VELOCITY) * 0.5;
    const avgDec = (currentConfig.MIN_OPACITY_DECREMENT_VELOCITY + currentConfig.MAX_OPACITY_DECREMENT_VELOCITY) * 0.5;
    const avgLife = ((avgInc > 0 ? 1 / avgInc : 0) + (avgDec > 0 ? 1 / avgDec : 0)).toFixed(2);

    const poolWarn = alive >= max ? `<span class="warn">⚠ POOL FULL</span>` : '';

    document.getElementById('coord-bar').innerHTML = [
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
        renderer.ctx.fillStyle = bgMode;
        renderer.ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (particleSystem) {
        particleSystem.Draw(renderer);
    }

    drawGizmos(renderer.ctx);
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

function hitTestAreaHandle(mx, my) {
    const x1 = currentConfig.AREA_X1;
    const y1 = currentConfig.AREA_Y1;
    const x2 = currentConfig.AREA_X2;
    const y2 = currentConfig.AREA_Y2;
    const tol = 10;

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

    if (currentConfig.emitterType === emitterType.point) {
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
        // Area emitter dragging / resizing
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

    if (isDraggingPos && currentConfig.emitterType === emitterType.point) {
        const dx = pt.x - emitterPos.x;
        const dy = pt.y - emitterPos.y;
        if (dx * dx + dy * dy > 1) {
            emitterHeading = Math.atan2(dy, dx);
        }
        emitterPos.Set(pt.x, pt.y);
        if (particleSystem) particleSystem.SetPosition(pt.x, pt.y);
    }
    else if (areaDragMode && areaDragStart && currentConfig.emitterType === emitterType.area) {
        const dx = Math.round(pt.x - areaDragStart.mx);
        const dy = Math.round(pt.y - areaDragStart.my);

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
            currentConfig.AREA_X1 = Math.round(Math.min(areaDragStart.mx, pt.x));
            currentConfig.AREA_Y1 = Math.round(Math.min(areaDragStart.my, pt.y));
            currentConfig.AREA_X2 = Math.round(Math.max(areaDragStart.mx, pt.x));
            currentConfig.AREA_Y2 = Math.round(Math.max(areaDragStart.my, pt.y));
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
            }
        }

        if (preset.motion) {
            motionMode = preset.motion;
            document.getElementById('select-motion').value = preset.motion;
            document.getElementById('motion-speed-group').style.display =
                (motionMode === 'circle' || motionMode === 'figure8' || motionMode === 'projectile') ? 'flex' : 'none';
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

    // Canvas overlay controls (Motion, Background, Gizmos)
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
        if (bgMode.startsWith('#')) bgColor.value = bgMode;
    });
    bgColor.addEventListener('input', () => {
        bgMode = bgColor.value;
    });

    const chkGizmo = document.getElementById('chk-gizmo');
    chkGizmo.addEventListener('change', () => {
        showGizmos = chkGizmo.checked;
    });

    // Composite operation & emitter type selects
    document.getElementById('cfg-globalCompositeOperation').addEventListener('change', e => {
        currentConfig.globalCompositeOperation = e.target.value;
        applyConfigChange('globalCompositeOperation');
    });

    document.getElementById('cfg-emitterType').addEventListener('change', e => {
        currentConfig.emitterType = Number(e.target.value);
        document.getElementById('area-bounds-panel').style.display =
            currentConfig.emitterType === emitterType.area ? 'block' : 'none';
        applyConfigChange('emitterType');
    });

    // Area helper buttons
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

    // Direction quick preset buttons
    document.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = btn.dataset.dir;
            if (dir === 'omni') {
                currentConfig.MIN_DIRECTION_X = -1; currentConfig.MAX_DIRECTION_X = 1;
                currentConfig.MIN_DIRECTION_Y = -1; currentConfig.MAX_DIRECTION_Y = 1;
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
            syncUIFromConfig();
            applyConfigChange('DIRECTION');
        });
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

