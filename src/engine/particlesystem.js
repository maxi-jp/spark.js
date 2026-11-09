// ============================================================
// Particle System
// Particle, ParticleEmitter and ParticleSystem classes.
// Requires: utils_math.js (Vector2, RandomBetweenFloat, PI2)
//
// Based on: https://github.com/maxi-jp/HTML5_ParticleSystem
// ============================================================

/**
 * Emitter shape:
 * - `point` (0): spawns all particles at `emitter.position`
 * - `area` (1): spawns randomly within the rectangle `(AREA_X1, AREA_Y1)` to `(AREA_X2, AREA_Y2)`
 * - `circle` (2): spawns uniformly inside a disk of `EMISSION_RADIUS` centered at `emitter.position`
 * - `ring` (3): spawns within an annulus between `EMISSION_INNER_RADIUS` and `EMISSION_RADIUS` centered at `emitter.position`
 * - `line` (4): spawns randomly along the segment `(AREA_X1, AREA_Y1)` -> `(AREA_X2, AREA_Y2)`
 */
const emitterType = {
    point:  0,
    area:   1,
    circle: 2,
    ring:   3,
    line:   4
};

/**
 * Particle visual shape:
 * - `"sprite"`: draws the `HTMLImageElement` passed to `ParticleSystem`
 * - `"circle"`: draws a procedural filled circle of diameter `PARTICLE_SIZE * scale`
 * - `"rect"`: draws a procedural rotated filled square of side `PARTICLE_SIZE * scale`
 * - `"line"`: draws a procedural velocity-aligned streak/spark scaled by `PARTICLE_SIZE * scale`
 */
const particleShape = {
    sprite: "sprite",
    circle: "circle",
    rect:   "rect",
    line:   "line"
};

const defaultParticleConfig = {
    maxParticleCount: 500,

    globalCompositeOperation: "source-over",

    // Visual particle shape: "sprite" | "circle" | "rect" | "line"
    renderShape: "sprite",

    // Base size in pixels for procedural shapes ("circle", "rect", "line") at scale = 1.0
    PARTICLE_SIZE: 64,

    emitterType: emitterType.area,

    // Area / Line emitter bounds (used when emitterType === area or emitterType === line)
    AREA_X1: 0,
    AREA_Y1: 0,
    AREA_X2: 800,
    AREA_Y2: 640,

    // Circle / Ring emitter radii in pixels (used when emitterType === circle or emitterType === ring)
    EMISSION_RADIUS: 50,
    EMISSION_INNER_RADIUS: 0,

    // When true on circle or ring emitters, initial velocity points radially from emitter.position through the spawn point
    radialVelocity: false,

    // Particle velocity (pixels/sec)
    MIN_INITIAL_VELOCITY: 10,
    MAX_INITIAL_VELOCITY: 60,

    // Direction mode: "cartesian" (uses MIN/MAX_DIRECTION_X/Y) or "polar" (uses MIN_ANGLE / MAX_ANGLE)
    directionMode: "cartesian",

    // Normalised direction range [-1, 1] (used when directionMode === "cartesian")
    MIN_DIRECTION_X: -1,
    MAX_DIRECTION_X:  1,
    MIN_DIRECTION_Y: -1,
    MAX_DIRECTION_Y:  1,

    // Polar emission angle range in radians (used when directionMode === "polar"; 0 = right, -PI/2 = up)
    MIN_ANGLE: 0,
    MAX_ANGLE: PI2,

    // Constant acceleration / gravity (pixels/sec²)
    GRAVITY_X: 0,
    GRAVITY_Y: 0,

    // Velocity damping / air drag coefficient (1/sec; 0 = no drag)
    VELOCITY_DAMPING: 0,

    // Opacity fade speed (units/sec)
    MIN_OPACITY_INCREMENT_VELOCITY: 1.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 4.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 0.5,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.0,

    // Peak opacity range (0, 1] reached at the end of fade-in
    MIN_MAX_OPACITY: 1.0,
    MAX_MAX_OPACITY: 1.0,

    // Time in seconds a particle holds at peak opacity before fading out
    MIN_HOLD_TIME: 0.0,
    MAX_HOLD_TIME: 0.0,

    // Initial scale range
    MIN_INITIAL_SCALE: 0.1,
    MAX_INITIAL_SCALE: 0.5,

    // Scale growth speed (units/sec)
    MIN_SCALE_VELOCITY: 0.5,
    MAX_SCALE_VELOCITY: 0.75,

    // Initial rotation range (radians)
    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,

    // Rotation speed (radians/sec)
    MIN_ROTATION_VELOCITY: 0.05,
    MAX_ROTATION_VELOCITY: 0.15,

    // Time between particle spawns (seconds)
    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.05,

    // Number of particles spawned on each spawn tick
    emitCountPerSpawn: 1,

    // Optional color tinting / color-over-lifetime (hex string "#rrggbb" or Color instance; null = untinted)
    startColor: null,
    endColor: null,

    // Lifecycle flags for ParticleSystemGO (when emission stops and activeCount reaches 0)
    autoDeactivateWhenEmpty: false,
    destroyWhenEmpty: false
};

/**
 * Parses a hex string, CSS color string, or `Color` object into a `Color` instance (or `null`).
 * @param {string|Color|null|undefined} val
 * @returns {Color|null}
 */
function _parseParticleColor(val) {
    if (!val) return null;
    if (val instanceof Color) return Color.Copy(val);
    if (typeof val === "string") {
        const s = val.trim();
        if (!s || s === "none" || s === "null") return null;
        return Color.FromString(s);
    }
    if (typeof val === "object" && val.r !== undefined && val.g !== undefined && val.b !== undefined) {
        return new Color(val.r, val.g, val.b, val.a ?? 1);
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Particle
// ─────────────────────────────────────────────────────────────────────────────
/** Single pooled particle. Managed internally by `ParticleSystem` — do not instantiate directly. */
class Particle {
    
    static pivot = { x: 0, y: 0 };

    constructor(img) {
        this.img = img;

        this.active    = false;
        this.appearing = false;

        this.position         = Vector2.Zero();
        this.direction        = Vector2.Zero();
        this.opacity          = 0.0;
        this.maxOpacity       = 1.0;
        this.holdTime         = 0.0;
        this.opacityIncrementVelocity = 0.0;
        this.opacityDecrementVelocity = 0.0;
        this.rotation         = 0.0;
        this.rotationVelocity = 0.0;
        this.scale            = 1.0;
        this.scaleVelocity    = 0.0;
        this.gravityX         = 0.0;
        this.gravityY         = 0.0;
        this.velocityDamping  = 0.0;
        this.renderShape      = "sprite";
        this.particleSize     = 64;

        // Color-over-lifetime state
        this.age              = 0.0;
        this.invLifetime      = 0.0;
        this.lifeProgress     = 0.0;
        this.hasColorTint     = false;
        this.hasColorGradient = false;
        this.startR           = 1.0;
        this.startG           = 1.0;
        this.startB           = 1.0;
        this.endR             = 1.0;
        this.endG             = 1.0;
        this.endB             = 1.0;
        this.tint             = new Color(1, 1, 1, 1);
    }

    /**
     * Activate the particle with initial parameters.
     * @param {Vector2} initialPosition
     * @param {number}  opacityIncrementVelocity
     * @param {number}  opacityDecrementVelocity
     * @param {number}  initialScale
     * @param {number}  scaleVelocity
     * @param {number}  initialRotation
     * @param {number}  rotationVelocity
     * @param {Vector2} direction           velocity vector (pixels/sec)
     * @param {number}  [gravityX=0]        horizontal acceleration (pixels/sec²)
     * @param {number}  [gravityY=0]        vertical acceleration (pixels/sec²)
     * @param {number}  [velocityDamping=0] air drag coefficient (1/sec)
     * @param {number}  [maxOpacity=1.0]    peak opacity target in (0, 1]
     * @param {number}  [holdTime=0.0]      duration in seconds held at peak opacity
     * @param {Color|null} [startColor=null] initial RGB tint color
     * @param {Color|null} [endColor=null]   final RGB tint color over lifetime
     * @param {string}  [renderShape="sprite"] "sprite" | "circle" | "rect" | "line"
     * @param {number}  [particleSize=64]   base pixel size for procedural shapes at scale = 1.0
     */
    Activate(initialPosition, opacityIncrementVelocity, opacityDecrementVelocity,
             initialScale, scaleVelocity, initialRotation, rotationVelocity,
             direction, gravityX = 0, gravityY = 0, velocityDamping = 0,
             maxOpacity = 1.0, holdTime = 0.0, startColor = null, endColor = null,
             renderShape = "sprite", particleSize = 64) {
        this.position         = Vector2.Copy(initialPosition);
        this.opacity          = 0;
        this.maxOpacity       = maxOpacity;
        this.holdTime         = holdTime;
        this.opacityIncrementVelocity = opacityIncrementVelocity;
        this.opacityDecrementVelocity = opacityDecrementVelocity;
        this.scale            = initialScale;
        this.scaleVelocity    = scaleVelocity;
        this.rotation         = initialRotation;
        this.rotationVelocity = rotationVelocity;
        this.direction        = direction;
        this.gravityX         = gravityX;
        this.gravityY         = gravityY;
        this.velocityDamping  = velocityDamping;
        this.renderShape      = renderShape;
        this.particleSize     = particleSize;

        const cStart = startColor || endColor;
        const cEnd   = endColor   || startColor;
        if (cStart) {
            this.hasColorTint = true;
            this.lifeProgress = 0.0;
            this.startR = cStart.r;
            this.startG = cStart.g;
            this.startB = cStart.b;
            this.endR   = cEnd.r;
            this.endG   = cEnd.g;
            this.endB   = cEnd.b;
            this.tint._r = this.tint._rgba[0] = this.startR;
            this.tint._g = this.tint._rgba[1] = this.startG;
            this.tint._b = this.tint._rgba[2] = this.startB;
            this.hasColorGradient = (this.startR !== this.endR || this.startG !== this.endG || this.startB !== this.endB);
            if (this.hasColorGradient) {
                this.age = 0.0;
                const totalLife =
                    (opacityIncrementVelocity > 0 ? maxOpacity / opacityIncrementVelocity : 0) +
                    holdTime +
                    (opacityDecrementVelocity > 0 ? maxOpacity / opacityDecrementVelocity : 0);
                this.invLifetime = totalLife > 0.0001 ? 1.0 / totalLife : 0.0;
            }
        }
        else {
            this.hasColorTint     = false;
            this.hasColorGradient = false;
            this.tint._r = this.tint._rgba[0] = 1.0;
            this.tint._g = this.tint._rgba[1] = 1.0;
            this.tint._b = this.tint._rgba[2] = 1.0;
        }

        this.active           = true;
        this.appearing        = true;
    }

    Deactivate() {
        this.active = false;
    }

    Update(deltaTime) {
        if (this.appearing) {
            // Fade in up to maxOpacity
            this.opacity += this.opacityIncrementVelocity * deltaTime;
            if (this.opacity >= this.maxOpacity) {
                this.opacity   = this.maxOpacity;
                this.appearing = false;
            }
        }
        else if (this.holdTime > 0.0) {
            // Hold at peak opacity before fading out
            this.holdTime -= deltaTime;
        }
        else {
            // Fade out
            this.opacity -= this.opacityDecrementVelocity * deltaTime;
            if (this.opacity <= 0.0) {
                this.Deactivate();
                return;
            }
        }

        // Interpolate RGB tint color over particle lifetime
        if (this.hasColorGradient) {
            this.age += deltaTime;
            let t = this.age * this.invLifetime;
            if (t > 1.0)
                t = 1.0;
            this.lifeProgress = t;
            
            this.tint._r = this.tint._rgba[0] = this.startR + (this.endR - this.startR) * t;
            this.tint._g = this.tint._rgba[1] = this.startG + (this.endG - this.startG) * t;
            this.tint._b = this.tint._rgba[2] = this.startB + (this.endB - this.startB) * t;
        }

        // Update transform
        this.scale += this.scaleVelocity * deltaTime;
        if (this.scale <= 0.0) {
            this.Deactivate();
            return;
        }
        this.rotation += this.rotationVelocity * deltaTime;

        // Apply constant acceleration (gravity / wind) and velocity damping
        this.direction.x += this.gravityX * deltaTime;
        this.direction.y += this.gravityY * deltaTime;

        if (this.velocityDamping > 0) {
            const dragFactor = Math.exp(-this.velocityDamping * deltaTime);
            this.direction.x *= dragFactor;
            this.direction.y *= dragFactor;
        }

        this.position.x += this.direction.x * deltaTime;
        this.position.y += this.direction.y * deltaTime;
    }

    Draw(renderer, colorFrames = null) {
        if (this.renderShape === "sprite" && this.img) {
            if (colorFrames && this.hasColorTint) {
                const idx = this.hasColorGradient
                    ? ((this.lifeProgress * (colorFrames.length - 1) + 0.5) | 0)
                    : 0;
                renderer.DrawImage(
                    colorFrames[idx],
                    this.position.x, this.position.y,
                    this.scale, this.scale,
                    this.rotation,
                    Particle.pivot,
                    this.opacity
                );
            }
            else {
                renderer.DrawImage(
                    this.img,
                    this.position.x, this.position.y,
                    this.scale, this.scale,
                    this.rotation,
                    Particle.pivot,
                    this.opacity,
                    this.hasColorTint ? this.tint : null
                );
            }
            return;
        }

        const size = this.particleSize * this.scale;
        if (size <= 0.0)
            return;

        this.tint._a = this.tint._rgba[3] = this.opacity;

        if (this.renderShape === "rect") {
            renderer.DrawFillRectangle(
                this.position.x, this.position.y,
                size, size,
                this.tint,
                this.rotation,
                Particle.pivot
            );
        }
        else if (this.renderShape === "line") {
            const vx = this.direction.x;
            const vy = this.direction.y;
            const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : this.rotation;
            const length    = Math.max(2.0, size * 1.8);
            const thickness = Math.max(1.5, size * 0.22);
            renderer.DrawFillRectangle(
                this.position.x, this.position.y,
                length, thickness,
                this.tint,
                angle,
                Particle.pivot
            );
        }
        else {
            // "circle" (or fallback when this.img is null)
            renderer.DrawFillCircle(
                this.position.x, this.position.y,
                size * 0.5,
                this.tint
            );
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ParticleEmitter
// ─────────────────────────────────────────────────────────────────────────────
class ParticleEmitter {
    /**
     * @param {Vector2} initialPosition  world-space position for point emitters
     * @param {Object}  config           particle system config (uses defaultParticleConfig shape)
     * @param {number}  [initialRotation=0] initial emitter rotation angle in radians
     */
    constructor(initialPosition, config, initialRotation = 0) {
        this.position = initialPosition ? Vector2.Copy(initialPosition) : Vector2.Zero();
        this.rotation = initialRotation;
        this.config   = config;
        this._lastSpawnAngle = 0;

        this.area = {
            x1: this.config.AREA_X1,
            y1: this.config.AREA_Y1,
            x2: this.config.AREA_X2,
            y2: this.config.AREA_Y2
        };
    }

    /** Returns a Vector2 with the spawn position for the next particle. */
    GetSpawnPoint() {
        switch (this.config.emitterType) {
            case emitterType.point:
                return Vector2.Copy(this.position);

            case emitterType.area:
                return new Vector2(
                    RandomBetweenFloat(this.area.x1, this.area.x2),
                    RandomBetweenFloat(this.area.y1, this.area.y2)
                );

            case emitterType.circle: {
                const radius = Math.max(0, this.config.EMISSION_RADIUS);
                const angle  = RandomBetweenFloat(0, PI2);
                const r      = radius * Math.max(Math.random(), Math.random());
                this._lastSpawnAngle = angle;
                return new Vector2(
                    this.position.x + Math.cos(angle) * r,
                    this.position.y + Math.sin(angle) * r
                );
            }

            case emitterType.ring: {
                const outerR = Math.max(0, this.config.EMISSION_RADIUS);
                const innerR = Math.max(0, Math.min(outerR, this.config.EMISSION_INNER_RADIUS));
                const angle  = RandomBetweenFloat(0, PI2);
                const r      = RandomBetweenFloat(innerR, outerR);
                this._lastSpawnAngle = angle;
                return new Vector2(
                    this.position.x + Math.cos(angle) * r,
                    this.position.y + Math.sin(angle) * r
                );
            }

            case emitterType.line: {
                const t = Math.random();
                return new Vector2(
                    this.area.x1 + (this.area.x2 - this.area.x1) * t,
                    this.area.y1 + (this.area.y2 - this.area.y1) * t
                );
            }

            default:
                return Vector2.Copy(this.position);
        }
    }

    /** Returns a velocity Vector2 for the next particle. */
    GetInitialVelocity() {
        const speed = RandomBetweenFloat(this.config.MIN_INITIAL_VELOCITY, this.config.MAX_INITIAL_VELOCITY);

        if (this.config.radialVelocity &&
            (this.config.emitterType === emitterType.circle || this.config.emitterType === emitterType.ring)) {
            const angle = this._lastSpawnAngle + this.rotation;
            return new Vector2(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
        }

        if (this.config.directionMode === "polar") {
            const angle = RandomBetweenFloat(this.config.MIN_ANGLE, this.config.MAX_ANGLE) + this.rotation;
            return new Vector2(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
        }

        const direction = new Vector2(
            RandomBetweenFloat(this.config.MIN_DIRECTION_X, this.config.MAX_DIRECTION_X),
            RandomBetweenFloat(this.config.MIN_DIRECTION_Y, this.config.MAX_DIRECTION_Y)
        );
        direction.Normalize();

        if (this.rotation !== 0) {
            const cos = Math.cos(this.rotation);
            const sin = Math.sin(this.rotation);
            const rx = direction.x * cos - direction.y * sin;
            const ry = direction.x * sin + direction.y * cos;
            direction.x = rx;
            direction.y = ry;
        }

        direction.MultiplyScalar(speed);
        return direction;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ParticleSystem
// ─────────────────────────────────────────────────────────────────────────────
class ParticleSystem {
    /** Number of pre-baked offscreen canvas steps generated for `Canvas2DRenderer` color gradients. */
    static COLOR_RAMP_STEPS = 16;

    /**
     * @param {HTMLImageElement} img       sprite used for every particle
     * @param {Object}           config    overrides for defaultParticleConfig
     * @param {Vector2}          position  initial emitter position (point emitters)
     */
    constructor(img, config, position) {
        this.active = true;

        this.img = img;

        // Merge defaults with provided config overrides
        this.config = Object.assign({}, defaultParticleConfig, config);
        if (!this.img && (!config || config.renderShape === undefined)) {
            this.config.renderShape = "circle";
        }
        
        if (config) {
            if (config.directionMode === undefined &&
                (config.MIN_ANGLE !== undefined || config.MAX_ANGLE !== undefined)) {
                this.config.directionMode = "polar";
            }
            if (config.MAX_OPACITY !== undefined) {
                if (config.MIN_MAX_OPACITY === undefined)
                    this.config.MIN_MAX_OPACITY = config.MAX_OPACITY;
                if (config.MAX_MAX_OPACITY === undefined)
                    this.config.MAX_MAX_OPACITY = config.MAX_OPACITY;
            }
            if (config.HOLD_TIME !== undefined) {
                if (config.MIN_HOLD_TIME === undefined)
                    this.config.MIN_HOLD_TIME = config.HOLD_TIME;
                if (config.MAX_HOLD_TIME === undefined)
                    this.config.MAX_HOLD_TIME = config.HOLD_TIME;
            }
            if (config.tintColor !== undefined) {
                if (config.startColor === undefined)
                    this.config.startColor = config.tintColor;
                if (config.endColor === undefined)
                    this.config.endColor = config.tintColor;
            }
        }

        this._startColor  = null;
        this._endColor    = null;
        this._isSprite    = false;
        this._colorFrames = null;
        this._syncColors();

        // Create emitter
        this.emitter = new ParticleEmitter(
            position ? position : Vector2.Zero(),
            this.config
        );

        // Build the particle pool
        this.particles = [];
        for (let i = 0; i < this.config.maxParticleCount; i++) {
            this.particles.push(new Particle(this.img));
        }

        // Randomise the first spawn time
        this.nextTimeToSpawnParticle = RandomBetweenFloat(
            this.config.MIN_TIME_TO_SPAWN_PARTICLE,
            this.config.MAX_TIME_TO_SPAWN_PARTICLE
        );
    }

    /** Move the emitter to a new world position. */
    SetPosition(x, y) {
        this.emitter.position.x = x;
        this.emitter.position.y = y;
    }

    /** Rotate the emitter's emission direction by `angle` (in radians). */
    SetRotation(angle) {
        this.emitter.rotation = angle;
    }

    /** Current emitter rotation angle in radians. */
    get rotation() {
        return this.emitter.rotation;
    }

    set rotation(angle) {
        this.emitter.rotation = angle;
    }

    /** Re-parses `config.startColor` and `config.endColor` and pre-bakes Canvas2D color frames if needed. */
    _syncColors() {
        this._startColor = _parseParticleColor(this.config.startColor);
        this._endColor   = _parseParticleColor(this.config.endColor);
        this._isSprite   = (this.config.renderShape === "sprite" || !this.config.renderShape) && Boolean(this.img);

        // Pre-bake tinted offscreen canvases only when using sprite particles in Canvas2D
        const useCanvasBake = typeof WebGLRenderer === "undefined" ||
                              typeof renderer === "undefined" ||
                              !(renderer instanceof WebGLRenderer);
        this._colorFrames = (this._isSprite && useCanvasBake) ? this._bakeCanvasColorFrames() : null;
    }

    /**
     * Pre-bakes an array of tinted offscreen canvases (`1` for flat tint, `COLOR_RAMP_STEPS` for a gradient)
     * for `Canvas2DRenderer`.
     * @returns {HTMLCanvasElement[]|null}
     */
    _bakeCanvasColorFrames() {
        const cStart = this._startColor || this._endColor;
        const cEnd   = this._endColor   || this._startColor;
        if (!cStart || !this.img)
            return null;

        const w = this.img.width  || this.img.naturalWidth  || 0;
        const h = this.img.height || this.img.naturalHeight || 0;
        if (w === 0 || h === 0)
            return null;

        const isGradient = (cStart.r !== cEnd.r || cStart.g !== cEnd.g || cStart.b !== cEnd.b);
        const steps  = isGradient ? ParticleSystem.COLOR_RAMP_STEPS : 1;
        const frames = new Array(steps);
        const halfW  = this.img.halfWidth  ?? (w / 2);
        const halfH  = this.img.halfHeight ?? (h / 2);

        for (let i = 0; i < steps; i++) {
            const t = steps > 1 ? i / (steps - 1) : 0;
            const r = Math.round((cStart.r + (cEnd.r - cStart.r) * t) * 255);
            const g = Math.round((cStart.g + (cEnd.g - cStart.g) * t) * 255);
            const b = Math.round((cStart.b + (cEnd.b - cStart.b) * t) * 255);

            const off = document.createElement('canvas');
            off.width      = w;
            off.height     = h;
            off.halfWidth  = halfW;
            off.halfHeight = halfH;

            const octx = off.getContext('2d');
            octx.drawImage(this.img, 0, 0);
            octx.globalCompositeOperation = 'multiply';
            octx.fillStyle = `rgb(${r},${g},${b})`;
            octx.fillRect(0, 0, w, h);
            octx.globalCompositeOperation = 'destination-in';
            octx.drawImage(this.img, 0, 0);

            frames[i] = off;
        }

        return frames;
    }

    /**
     * Sets the visual particle shape (`"sprite" | "circle" | "rect" | "line"`) for newly spawned particles.
     * @param {string} shape
     */
    SetRenderShape(shape) {
        this.config.renderShape = shape;
        this._syncColors();
    }

    /**
     * Sets the start and end tint colors for newly spawned particles.
     * Pass `null` to disable tinting, or omit `endColor` for a constant single tint.
     * @param {string|Color|null} startColor
     * @param {string|Color|null} [endColor=startColor]
     */
    SetColor(startColor, endColor = startColor) {
        this.config.startColor = startColor;
        this.config.endColor   = endColor;
        this._syncColors();
    }

    /**
     * Internal helper that activates a single pooled particle.
     * @param {Vector2} [overridePosition]
     * @returns {boolean} true if a particle was available and activated
     */
    _spawnSingleParticle(overridePosition) {
        let particle = null;
        for (let i = 0; i < this.particles.length && particle === null; i++) {
            if (!this.particles[i].active)
                particle = this.particles[i];
        }

        if (!particle)
            return false;

        let spawnPoint;
        if (overridePosition) {
            if (this.config.emitterType === emitterType.circle || this.config.emitterType === emitterType.ring) {
                const savedX = this.emitter.position.x;
                const savedY = this.emitter.position.y;
                this.emitter.position.x = overridePosition.x;
                this.emitter.position.y = overridePosition.y;
                spawnPoint = this.emitter.GetSpawnPoint();
                this.emitter.position.x = savedX;
                this.emitter.position.y = savedY;
            }
            else {
                spawnPoint = overridePosition;
            }
        }
        else {
            spawnPoint = this.emitter.GetSpawnPoint();
        }

        particle.Activate(
            spawnPoint,
            RandomBetweenFloat(this.config.MIN_OPACITY_INCREMENT_VELOCITY, this.config.MAX_OPACITY_INCREMENT_VELOCITY),
            RandomBetweenFloat(this.config.MIN_OPACITY_DECREMENT_VELOCITY, this.config.MAX_OPACITY_DECREMENT_VELOCITY),
            RandomBetweenFloat(this.config.MIN_INITIAL_SCALE,              this.config.MAX_INITIAL_SCALE),
            RandomBetweenFloat(this.config.MIN_SCALE_VELOCITY,             this.config.MAX_SCALE_VELOCITY),
            RandomBetweenFloat(this.config.MIN_INITIAL_ROTATION,           this.config.MAX_INITIAL_ROTATION),
            RandomBetweenFloat(this.config.MIN_ROTATION_VELOCITY,          this.config.MAX_ROTATION_VELOCITY),
            this.emitter.GetInitialVelocity(),
            this.config.GRAVITY_X,
            this.config.GRAVITY_Y,
            this.config.VELOCITY_DAMPING,
            RandomBetweenFloat(this.config.MIN_MAX_OPACITY,                this.config.MAX_MAX_OPACITY),
            RandomBetweenFloat(this.config.MIN_HOLD_TIME,                  this.config.MAX_HOLD_TIME),
            this._startColor,
            this._endColor,
            this.config.renderShape,
            this.config.PARTICLE_SIZE
        );

        return true;
    }

    /**
     * Immediately spawns `count` particles from the pool (works even when `this.active === false`).
     * Optional `(x, y)` overrides the emitter spawn position for this burst.
     * @param {number} [count=1]
     * @param {number} [x]
     * @param {number} [y]
     * @returns {number} Number of particles actually spawned
     */
    Burst(count = 1, x, y) {
        const overridePos = (x !== undefined && y !== undefined) ? new Vector2(x, y) : null;
        let spawned = 0;
        for (let i = 0; i < count; i++) {
            if (this._spawnSingleParticle(overridePos)) {
                spawned++;
            }
            else {
                console.warn("ParticleSystem: pool exhausted – increase maxParticleCount.");
                break;
            }
        }
        return spawned;
    }

    Update(deltaTime) {
        if (this.active) {
            this.nextTimeToSpawnParticle -= deltaTime;

            while (this.nextTimeToSpawnParticle <= 0.0) {
                this.Burst(this.config.emitCountPerSpawn);

                const interval = Math.max(
                    0.0001,
                    RandomBetweenFloat(
                        this.config.MIN_TIME_TO_SPAWN_PARTICLE,
                        this.config.MAX_TIME_TO_SPAWN_PARTICLE
                    )
                );
                this.nextTimeToSpawnParticle += interval;
            }
        }

        // Update all active particles
        this.particles.forEach(particle => {
            if (particle.active)
                particle.Update(deltaTime);
        });
    }

    Draw(renderer) {
        // globalCompositeOperation is a Canvas 2D concept only
        if (renderer.ctx) {
            renderer.ctx.globalCompositeOperation = this.config.globalCompositeOperation;
        }

        const colorFrames = renderer.ctx ? this._colorFrames : null;

        this.particles.forEach(particle => {
            if (particle.active)
                particle.Draw(renderer, colorFrames);
        });

        // Restore defaults
        if (renderer.ctx) {
            renderer.ctx.globalCompositeOperation = 'source-over';
        }
    }

    /** Returns how many particles are currently alive. */
    get activeCount() {
        return this.particles.filter(p => p.active).length;
    }

    /** Deactivates all currently alive particles and resets the spawn countdown. */
    Reset() {
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].active = false;
        }
        this.nextTimeToSpawnParticle = RandomBetweenFloat(
            this.config.MIN_TIME_TO_SPAWN_PARTICLE,
            this.config.MAX_TIME_TO_SPAWN_PARTICLE
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ParticleSystemGO (GameObject & Pool wrapper)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * A `GameObject` wrapper around `ParticleSystem` that integrates directly with
 * `game.AddGameObject(...)` and `Pool`.
 */
class ParticleSystemGO extends (typeof GameObject !== "undefined" ? GameObject : Object) {
    /**
     * @param {Vector2} [position=Vector2.Zero()] - Initial world position.
     * @param {HTMLImageElement|HTMLCanvasElement|null} [img=null] - Sprite image for each particle (or null for procedural shapes).
     * @param {Object} [config={}] - Overrides for `defaultParticleConfig`.
     */
    constructor(position = Vector2.Zero(), img = null, config = {}) {
        super(position);

        this.particleSystem = new ParticleSystem(img, config, this._position);
        // Share the exact same Vector2 reference so mutating go.x / go.y / go.position
        // updates emitter.position with zero per-frame copy overhead
        this.particleSystem.emitter.position = this._position;

        this.autoDeactivateWhenEmpty = Boolean(this.particleSystem.config.autoDeactivateWhenEmpty);
        this.destroyWhenEmpty        = Boolean(this.particleSystem.config.destroyWhenEmpty);
    }

    get config() {
        return this.particleSystem.config;
    }

    get emitter() {
        return this.particleSystem.emitter;
    }

    get particles() {
        return this.particleSystem.particles;
    }

    get img() {
        return this.particleSystem.img;
    }

    set img(value) {
        this.particleSystem.img = value;
        for (let i = 0; i < this.particleSystem.particles.length; i++) {
            this.particleSystem.particles[i].img = value;
        }
        this.particleSystem._syncColors();
    }

    /** Number of currently active particles in this emitter. */
    get activeCount() {
        return this.particleSystem.activeCount;
    }

    /**
     * Whether continuous timer-based particle emission is enabled (`particleSystem.active`).
     * Distinct from `this.active` (which controls whether this `GameObject` updates and draws).
     */
    get emitting() {
        return this.particleSystem.active;
    }

    set emitting(value) {
        this.particleSystem.active = Boolean(value);
    }

    get position() {
        return this._position;
    }

    set position(value) {
        this._position.Set(value.x, value.y);
    }

    get rotation() {
        return this._rotation;
    }

    set rotation(value) {
        this._rotation = value;
        this.particleSystem.emitter.rotation = value;
    }

    /** Move the emitter to `(x, y)` in world space. */
    SetPosition(x, y) {
        this._position.x = x;
        this._position.y = y;
    }

    /** Rotate the emitter's emission direction by `angle` (in radians). */
    SetRotation(angle) {
        this.rotation = angle;
    }

    /** Sets the start and end tint colors for newly spawned particles. */
    SetColor(startColor, endColor = startColor) {
        this.particleSystem.SetColor(startColor, endColor);
    }

    /** Sets the visual particle shape (`"sprite" | "circle" | "rect" | "line"`) for newly spawned particles. */
    SetRenderShape(shape) {
        this.particleSystem.SetRenderShape(shape);
    }

    /** Immediately spawns `count` particles (optional `(x, y)` overrides spawn position for this burst). */
    Burst(count = 1, x, y) {
        return this.particleSystem.Burst(count, x, y);
    }

    /**
     * Activates this `ParticleSystemGO` (optionally moving it to `(x, y)`) and enables continuous emission.
     * @param {number} [x]
     * @param {number} [y]
     * @returns {this}
     */
    Play(x, y) {
        if (x !== undefined && y !== undefined) {
            this.SetPosition(x, y);
        }
        this.active = true;
        this.particleSystem.active = true;
        return this;
    }

    /**
     * Triggers a one-shot burst of `count` particles (optionally at `(x, y)`), disables continuous
     * emission, and automatically deactivates this `ParticleSystemGO` once all burst particles fade out
     * (returning it to a `Pool` automatically).
     * @param {number} [count=this.config.emitCountPerSpawn]
     * @param {number} [x]
     * @param {number} [y]
     * @param {boolean} [autoDeactivate=true]
     * @returns {number} Number of particles spawned
     */
    PlayBurst(count = this.particleSystem.config.emitCountPerSpawn, x, y, autoDeactivate = true) {
        if (x !== undefined && y !== undefined) {
            this.SetPosition(x, y);
        }
        this.active = true;
        this.particleSystem.active = false;
        this.autoDeactivateWhenEmpty = autoDeactivate;
        return this.particleSystem.Burst(count);
    }

    /**
     * Stops continuous particle emission while allowing already-spawned particles to finish fading out.
     * @param {boolean} [autoDeactivate=this.autoDeactivateWhenEmpty] If true, sets `this.active = false` once `activeCount === 0`.
     * @returns {this}
     */
    Stop(autoDeactivate = this.autoDeactivateWhenEmpty) {
        this.particleSystem.active = false;
        this.autoDeactivateWhenEmpty = autoDeactivate;
        return this;
    }

    /** Deactivates all currently alive particles and resets the spawn countdown. */
    Reset() {
        this.particleSystem.Reset();
        return this;
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        this.particleSystem.Update(deltaTime);

        if (!this.particleSystem.active && (this.autoDeactivateWhenEmpty || this.destroyWhenEmpty)) {
            if (this.particleSystem.activeCount === 0) {
                if (this.destroyWhenEmpty && this.game) {
                    this.game.Destroy(this);
                }
                else {
                    this.active = false;
                }
            }
        }
    }

    Draw(renderer) {
        this.particleSystem.Draw(renderer);
    }
}