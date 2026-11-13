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

    // Blend mode applied during rendering ("source-over" / "normal", "lighter" / "add", "screen", "multiply", etc.)
    // Works across both Canvas2DRenderer and WebGLRenderer via renderer.SetBlendMode().
    globalCompositeOperation: "source-over",

    // Visual particle shape: "sprite" | "circle" | "rect" | "line"
    renderShape: "sprite",

    // Base size in pixels for procedural shapes ("circle", "rect", "line") at scale = 1.0
    PARTICLE_SIZE: 64,

    emitterType: emitterType.area,

    // Simulation coordinate space:
    // "world" (default): spawned particles stay behind in world space when the emitter moves (smoke trails)
    // "local": active particles move and rotate together with emitter.position / emitter.rotation (auras, shields, attached flames)
    simulationSpace: "world",

    // Area / Line emitter bounds (used when emitterType === area or emitterType === line)
    AREA_X1: 0,
    AREA_Y1: 0,
    AREA_X2: 800,
    AREA_Y2: 640,
    // When true on area/line emitters, AREA_X1..AREA_Y2 are offsets relative to emitter.position
    // (ideal for infinite-world rain/snow following a scrolling camera via SetPosition(cam.x, cam.y))
    relativeArea: false,

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

    // When true, particle rotation automatically aligns with its velocity vector (Math.atan2(vy, vx) + initialRotation)
    alignToVelocity: false,

    // Time between particle spawns (seconds)
    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.05,

    // Number of particles spawned on each spawn tick
    emitCountPerSpawn: 1,

    // Optional color tinting / color-over-lifetime (hex string "#rrggbb" or Color instance; null = untinted)
    startColor: null,
    endColor: null,

    // Optional sprite sheet / SpriteAtlas frame support (used when renderShape === "sprite")
    // - frames: Array of { x, y, w, h } crop rectangles, a SpriteAtlas instance, or raw atlas JSON (null = use sheetColumns/sheetRows or full image)
    // - sheetColumns / sheetRows: uniform grid subdivisions (1x1 = full image)
    // - sheetFrameCount: optional cap on total frames in a uniform grid (0 = sheetColumns * sheetRows)
    // - frameMode: "random" (pick a random frame on spawn) | "animate" (step from frame 0 to N-1 over particle lifetime)
    frames: null,
    sheetColumns: 1,
    sheetRows: 1,
    sheetFrameCount: 0,
    frameMode: "random",

    // Prewarm simulation: fast-forwards the emitter on creation so ambient effects start in steady state
    prewarm: false,
    prewarmTime: 2.0,
    prewarmStep: 0.05,

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
    if (!val)
        return null;

    if (val instanceof Color)
        return Color.Copy(val);

    if (typeof val === "string") {
        const s = val.trim();
        if (!s || s === "none" || s === "null")
            return null;

        return Color.FromString(s);
    }

    if (typeof val === "object" &&
        val.r !== undefined &&
        val.g !== undefined &&
        val.b !== undefined) {
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

    /**
     * @param {ParticleSystem} system Owning ParticleSystem
     */
    constructor(system = null) {
        this.system = system;

        this.active    = false;
        this.appearing = false;

        this.position                 = Vector2.Zero();
        this.direction                = Vector2.Zero();
        this.opacity                  = 0.0;
        this.maxOpacity               = 1.0;
        this.holdTime                 = 0.0;
        this.opacityIncrementVelocity = 0.0;
        this.opacityDecrementVelocity = 0.0;
        this.scale                    = 1.0;
        this.scaleVelocity            = 0.0;
        this.rotation                 = 0.0;
        this.initialRotation          = 0.0;
        this.rotationVelocity         = 0.0;

        // Individual lifetime progress & tint color
        this.age          = 0.0;
        this.invLifetime  = 0.0;
        this.lifeProgress = 0.0;
        this.tint         = new Color(1, 1, 1, 1);

        // Current sprite sheet crop rectangle ({ x, y, w, h } or null for full image)
        this.frame = null;
    }

    /**
     * Activate the particle with initial spawn parameters.
     * @param {Vector2} initialPosition
     * @param {Vector2} velocity                    velocity vector (pixels/sec)
     * @param {number}  opacityIncrementVelocity    fade-in rate (units/sec)
     * @param {number}  opacityDecrementVelocity    fade-out rate (units/sec)
     * @param {number}  maxOpacity                  peak opacity in (0, 1]
     * @param {number}  holdTime                    hold duration at peak opacity (seconds)
     * @param {number}  initialScale
     * @param {number}  scaleVelocity               scale rate (units/sec)
     * @param {number}  initialRotation             radians (or angular offset when alignToVelocity is true)
     * @param {number}  rotationVelocity            radians/sec
     * @param {ParticleSystem} [system=this.system]
     */
    Activate(initialPosition, velocity,
             opacityIncrementVelocity, opacityDecrementVelocity,
             maxOpacity, holdTime,
             initialScale, scaleVelocity,
             initialRotation, rotationVelocity,
             system = this.system) {
        if (initialPosition !== this.position)
            this.position.Set(initialPosition.x, initialPosition.y);
        if (velocity !== this.direction)
            this.direction.Set(velocity.x, velocity.y);
        this.opacity                  = 0.0;
        this.maxOpacity               = maxOpacity;
        this.holdTime                 = holdTime;
        this.opacityIncrementVelocity = opacityIncrementVelocity;
        this.opacityDecrementVelocity = opacityDecrementVelocity;
        this.scale                    = initialScale;
        this.scaleVelocity            = scaleVelocity;
        this.initialRotation          = initialRotation;
        this.rotationVelocity         = rotationVelocity;

        if (system.config.alignToVelocity && (this.direction.x !== 0 || this.direction.y !== 0)) {
            this.rotation = Math.atan2(this.direction.y, this.direction.x) + initialRotation;
        }
        else {
            this.rotation = initialRotation;
        }

        // Tint initialization
        if (system._hasColorTint) {
            this.tint._r = this.tint._rgba[0] = system._startR;
            this.tint._g = this.tint._rgba[1] = system._startG;
            this.tint._b = this.tint._rgba[2] = system._startB;
        }
        else {
            this.tint._r = this.tint._rgba[0] = 1.0;
            this.tint._g = this.tint._rgba[1] = 1.0;
            this.tint._b = this.tint._rgba[2] = 1.0;
        }

        // Frame selection
        const frames = system._frames;
        if (frames) {
            this.frame = system._animateFrames
                ? frames[0]
                : frames[(Math.random() * frames.length) | 0];
        }
        else {
            this.frame = null;
        }

        this.lifeProgress = 0.0;
        if (system._trackLifeProgress) {
            this.age = 0.0;
            const totalLife =
                (opacityIncrementVelocity > 0 ? maxOpacity / opacityIncrementVelocity : 0) +
                holdTime +
                (opacityDecrementVelocity > 0 ? maxOpacity / opacityDecrementVelocity : 0);
            this.invLifetime = totalLife > 0.0001 ? 1.0 / totalLife : 0.0;
        }

        if (!this.active) {
            this.active = true;
            system._activeCount++;
        }
        this.appearing = true;
    }

    Deactivate() {
        if (this.active) {
            this.active = false;
            this.system._activeCount--;
        }
    }

    /**
     * Updates particle lifetime, transform, and kinematics.
     * @param {number} deltaTime
     * @param {number} [gdx=0] Constant horizontal acceleration step (`GRAVITY_X * dt`) precalculated by ParticleSystem
     * @param {number} [gdy=0] Constant vertical acceleration step (`GRAVITY_Y * dt`) precalculated by ParticleSystem
     * @param {number} [drag=1.0] Velocity damping multiplier (`Math.exp(-damping * dt)`) precalculated by ParticleSystem
     * @param {ParticleSystem} [system=this.system]
     * @returns {boolean} `true` if the particle remains active, `false` if it died and was deactivated
     */
    Update(deltaTime, gdx = 0, gdy = 0, drag = 1.0, system = this.system) {
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
                return false;
            }
        }

        // Advance lifetime progress for color gradients and/or sprite-sheet animation
        if (system._trackLifeProgress) {
            this.age += deltaTime;
            let t = this.age * this.invLifetime;
            if (t > 1.0)
                t = 1.0;

            this.lifeProgress = t;

            if (system._hasColorGradient) {
                this.tint._r = this.tint._rgba[0] = system._startR + (system._endR - system._startR) * t;
                this.tint._g = this.tint._rgba[1] = system._startG + (system._endG - system._startG) * t;
                this.tint._b = this.tint._rgba[2] = system._startB + (system._endB - system._startB) * t;
            }

            if (system._animateFrames) {
                const frames = system._frames;
                const last   = frames.length - 1;
                const idx    = (t * frames.length) | 0;
                this.frame   = frames[idx < last ? idx : last];
            }
        }

        // Update scale
        this.scale += this.scaleVelocity * deltaTime;
        if (this.scale <= 0.0) {
            this.Deactivate();
            return false;
        }

        // Apply precomputed constant acceleration and air drag
        this.direction.x += gdx;
        this.direction.y += gdy;

        if (drag !== 1.0) {
            this.direction.x *= drag;
            this.direction.y *= drag;
        }

        // Update rotation
        if (system.config.alignToVelocity) {
            if (this.direction.x !== 0 || this.direction.y !== 0) {
                this.rotation = Math.atan2(this.direction.y, this.direction.x) + this.initialRotation;
            }
        }
        else {
            this.rotation += this.rotationVelocity * deltaTime;
        }

        this.position.x += this.direction.x * deltaTime;
        this.position.y += this.direction.y * deltaTime;

        return true;
    }

    /**
     * Draws the particle using its owning system's visual configuration.
     * @param {Renderer} renderer
     * @param {HTMLCanvasElement[]|null} [colorFrames=null] Pre-baked Canvas2D tinted offscreen canvases
     * @param {ParticleSystem} [system=this.system]
     */
    Draw(renderer, colorFrames = null, system = this.system) {
        const shape = system.config.renderShape;
        const img   = system.img;

        if (shape === "sprite" && img) {
            let src  = img;
            let tint = null;

            if (system._hasColorTint) {
                if (colorFrames) {
                    const idx = system._hasColorGradient
                        ? ((this.lifeProgress * (colorFrames.length - 1) + 0.5) | 0)
                        : 0;
                    src = colorFrames[idx];
                }
                else {
                    tint = this.tint;
                }
            }

            const f = this.frame;
            if (f) {
                renderer.DrawImageSection(
                    src,
                    this.position.x, this.position.y,
                    f.x, f.y, f.w, f.h,
                    this.scale, this.scale,
                    this.rotation,
                    Particle.pivot,
                    this.opacity,
                    tint
                );
            }
            else {
                renderer.DrawImage(
                    src,
                    this.position.x, this.position.y,
                    this.scale, this.scale,
                    this.rotation,
                    Particle.pivot,
                    this.opacity,
                    tint
                );
            }
            return;
        }

        const size = system.config.PARTICLE_SIZE * this.scale;
        if (size <= 0.0)
            return;

        this.tint._a = this.tint._rgba[3] = this.opacity;

        if (shape === "rect") {
            renderer.DrawFillRectangle(
                this.position.x, this.position.y,
                size, size,
                this.tint,
                this.rotation,
                Particle.pivot
            );
        }
        else if (shape === "line") {
            const length    = Math.max(2.0, size * 1.8);
            const thickness = Math.max(1.5, size * 0.22);
            renderer.DrawFillRectangle(
                this.position.x, this.position.y,
                length, thickness,
                this.tint,
                this.rotation,
                Particle.pivot
            );
        }
        else {
            // "circle" (or fallback when img is null)
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

    /**
     * Writes the spawn position for the next particle into `out` (allocating a new Vector2 only if omitted).
     * @param {Vector2} [out]
     * @returns {Vector2}
     */
    GetSpawnPoint(out = Vector2.Zero()) {
        switch (this.config.emitterType) {
            case emitterType.point:
                out.Set(this.position.x, this.position.y);
                return out;

            case emitterType.area: {
                let x = RandomBetweenFloat(this.area.x1, this.area.x2);
                let y = RandomBetweenFloat(this.area.y1, this.area.y2);
                if (this.config.relativeArea) {
                    x += this.position.x;
                    y += this.position.y;
                }
                out.Set(x, y);
                return out;
            }

            case emitterType.circle: {
                const radius = Math.max(0, this.config.EMISSION_RADIUS);
                const angle  = RandomBetweenFloat(0, PI2);
                const r      = radius * Math.max(Math.random(), Math.random());
                this._lastSpawnAngle = angle;
                out.Set(
                    this.position.x + Math.cos(angle) * r,
                    this.position.y + Math.sin(angle) * r
                );
                return out;
            }

            case emitterType.ring: {
                const outerR = Math.max(0, this.config.EMISSION_RADIUS);
                const innerR = Math.max(0, Math.min(outerR, this.config.EMISSION_INNER_RADIUS));
                const angle  = RandomBetweenFloat(0, PI2);
                const r      = RandomBetweenFloat(innerR, outerR);
                this._lastSpawnAngle = angle;
                out.Set(
                    this.position.x + Math.cos(angle) * r,
                    this.position.y + Math.sin(angle) * r
                );
                return out;
            }

            case emitterType.line: {
                const t = Math.random();
                let x = this.area.x1 + (this.area.x2 - this.area.x1) * t;
                let y = this.area.y1 + (this.area.y2 - this.area.y1) * t;
                if (this.config.relativeArea) {
                    x += this.position.x;
                    y += this.position.y;
                }
                out.Set(x, y);
                return out;
            }

            default:
                out.Set(this.position.x, this.position.y);
                return out;
        }
    }

    /**
     * Writes the initial velocity (pixels/sec) for the next particle into `out` (allocating a new Vector2 only if omitted).
     * @param {Vector2} [out]
     * @returns {Vector2}
     */
    GetInitialVelocity(out = Vector2.Zero()) {
        const speed = RandomBetweenFloat(this.config.MIN_INITIAL_VELOCITY, this.config.MAX_INITIAL_VELOCITY);

        if (this.config.radialVelocity &&
            (this.config.emitterType === emitterType.circle || this.config.emitterType === emitterType.ring)) {
            const angle = this._lastSpawnAngle + this.rotation;
            out.Set(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
            return out;
        }

        if (this.config.directionMode === "polar") {
            const angle = RandomBetweenFloat(this.config.MIN_ANGLE, this.config.MAX_ANGLE) + this.rotation;
            out.Set(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
            return out;
        }

        out.Set(
            RandomBetweenFloat(this.config.MIN_DIRECTION_X, this.config.MAX_DIRECTION_X),
            RandomBetweenFloat(this.config.MIN_DIRECTION_Y, this.config.MAX_DIRECTION_Y)
        );
        out.Normalize();

        if (this.rotation !== 0) {
            const cos = Math.cos(this.rotation);
            const sin = Math.sin(this.rotation);
            const rx = out.x * cos - out.y * sin;
            const ry = out.x * sin + out.y * cos;
            out.Set(rx, ry);
        }

        out.MultiplyScalar(speed);
        return out;
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

        this._startColor        = null;
        this._endColor          = null;
        this._startR            = 1.0;
        this._startG            = 1.0;
        this._startB            = 1.0;
        this._endR              = 1.0;
        this._endG              = 1.0;
        this._endB              = 1.0;
        this._hasColorTint      = false;
        this._hasColorGradient  = false;
        this._isSprite          = false;
        this._colorFrames       = null;
        this._frames            = null;
        this._animateFrames     = false;
        this._trackLifeProgress = false;
        this._syncColors();

        // Create emitter
        this.emitter = new ParticleEmitter(
            position ? position : Vector2.Zero(),
            this.config
        );
        this._prevEmitterX   = this.emitter.position.x;
        this._prevEmitterY   = this.emitter.position.y;
        this._prevEmitterRot = this.emitter.rotation;

        // Build the particle pool
        this.particles = [];
        for (let i = 0; i < this.config.maxParticleCount; i++) {
            this.particles.push(new Particle(this));
        }
        this._activeCount = 0;

        // Randomise the first spawn time
        this.nextTimeToSpawnParticle = RandomBetweenFloat(
            this.config.MIN_TIME_TO_SPAWN_PARTICLE,
            this.config.MAX_TIME_TO_SPAWN_PARTICLE
        );

        // Prewarm simulation if requested in config
        if (this.config.prewarm || (config && config.prewarmTime > 0 && config.prewarm !== false)) {
            this.Prewarm(
                this.config.prewarmTime > 0 ? this.config.prewarmTime : 2.0,
                this.config.prewarmStep > 0 ? this.config.prewarmStep : 0.05
            );
        }
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
        // Sprite-sheet frame rects depend on the image size, so keep them in sync too
        this._syncFrames();

        this._startColor = _parseParticleColor(this.config.startColor);
        this._endColor   = _parseParticleColor(this.config.endColor);
        this._isSprite   = (this.config.renderShape === "sprite" || !this.config.renderShape) && Boolean(this.img);

        const cStart = this._startColor || this._endColor;
        const cEnd   = this._endColor   || this._startColor;
        if (cStart) {
            this._hasColorTint = true;
            this._startR = cStart.r;
            this._startG = cStart.g;
            this._startB = cStart.b;
            this._endR   = cEnd.r;
            this._endG   = cEnd.g;
            this._endB   = cEnd.b;
            this._hasColorGradient = (this._startR !== this._endR || this._startG !== this._endG || this._startB !== this._endB);
        }
        else {
            this._hasColorTint     = false;
            this._hasColorGradient = false;
            this._startR = 1.0;
            this._startG = 1.0;
            this._startB = 1.0;
            this._endR   = 1.0;
            this._endG   = 1.0;
            this._endB   = 1.0;
        }

        this._trackLifeProgress = this._hasColorGradient || this._animateFrames;

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
     * Resolves `config.frames` (array / `SpriteAtlas` / atlas JSON) or the uniform
     * `sheetColumns` × `sheetRows` grid into a flat array of `{ x, y, w, h }` crop rects,
     * stored once in `this._frames` (`null` = draw the full image).
     */
    _syncFrames() {
        this._frames            = ParticleSystem.ResolveFrames(this.img, this.config);
        this._animateFrames     = Boolean(this._frames && this._frames.length > 1 && this.config.frameMode === "animate");
        this._trackLifeProgress = this._hasColorGradient || this._animateFrames;
    }

    /**
     * Builds the crop-rect array for a particle image and config. Returns `null` when the
     * image should be drawn whole (no frames, 1×1 grid, or image not loaded yet).
     * @param {HTMLImageElement|HTMLCanvasElement|null} img
     * @param {Object} config
     * @returns {Array<{x:number,y:number,w:number,h:number}>|null}
     */
    static ResolveFrames(img, config) {
        const src = config.frames;
        if (src) {
            let list = null;
            if (Array.isArray(src)) {
                list = src;
            }
            else if (typeof src === "object") {
                // SpriteAtlas instance (_sprites), editor atlas JSON ({ sprites }), or flat { id: rect } map
                const map = src._sprites ?? src.sprites ?? src;
                list = Object.values(map);
            }
            if (list) {
                list = list.filter(r => r && r.w > 0 && r.h > 0);
                return list.length > 0 ? list : null;
            }
            return null;
        }

        const cols = Math.max(1, config.sheetColumns | 0);
        const rows = Math.max(1, config.sheetRows    | 0);
        if (cols === 1 && rows === 1)
            return null;

        const w = img ? (img.width  || img.naturalWidth  || 0) : 0;
        const h = img ? (img.height || img.naturalHeight || 0) : 0;
        if (w === 0 || h === 0)
            return null;

        const fw = Math.floor(w / cols);
        const fh = Math.floor(h / rows);
        const total = cols * rows;
        const count = config.sheetFrameCount > 0 ? Math.min(total, config.sheetFrameCount | 0) : total;

        const list = new Array(count);
        for (let i = 0; i < count; i++) {
            list[i] = { x: (i % cols) * fw, y: ((i / cols) | 0) * fh, w: fw, h: fh };
        }
        return list;
    }

    /**
     * Configures sprite-sheet frames for newly spawned particles.
     * - `SetFrames(4, 4)` → uniform 4×4 grid
     * - `SetFrames(4, 4, "animate", 14)` → 4×4 grid limited to the first 14 frames, animated over lifetime
     * - `SetFrames(atlas)` / `SetFrames([{x,y,w,h}, ...])` → explicit crop rects
     * - `SetFrames(null)` → disable frames (draw full image)
     * @param {number|Array|SpriteAtlas|Object|null} framesOrColumns
     * @param {number} [rows=1]
     * @param {string} [frameMode=this.config.frameMode] "random" | "animate"
     * @param {number} [frameCount=0] total frame cap for a uniform grid (0 = columns × rows)
     */
    SetFrames(framesOrColumns, rows = 1, frameMode = this.config.frameMode, frameCount = 0) {
        if (typeof framesOrColumns === "number") {
            this.config.frames          = null;
            this.config.sheetColumns    = framesOrColumns;
            this.config.sheetRows       = rows;
            this.config.sheetFrameCount = frameCount;
        }
        else {
            this.config.frames       = framesOrColumns;
            this.config.sheetColumns = 1;
            this.config.sheetRows    = 1;
        }
        this.config.frameMode = frameMode;
        this._syncFrames();
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
     * Internal helper that activates a single pooled particle in O(1) with zero heap allocations.
     * Active particles are kept contiguous at `particles[0 .. _activeCount - 1]`, so the next
     * available inactive slot is always `particles[_activeCount]`.
     * @param {number} [overrideX]
     * @param {number} [overrideY]
     * @returns {boolean} true if a particle was available and activated
     */
    _spawnSingleParticle(overrideX, overrideY) {
        if (this._activeCount >= this.particles.length)
            return false;

        const particle = this.particles[this._activeCount];

        if (overrideX !== undefined && overrideY !== undefined) {
            const emType = this.config.emitterType;
            if (emType === emitterType.circle || emType === emitterType.ring ||
                (this.config.relativeArea && (emType === emitterType.area || emType === emitterType.line))) {
                const savedX = this.emitter.position.x;
                const savedY = this.emitter.position.y;
                this.emitter.position.x = overrideX;
                this.emitter.position.y = overrideY;
                this.emitter.GetSpawnPoint(particle.position);
                this.emitter.position.x = savedX;
                this.emitter.position.y = savedY;
            }
            else {
                particle.position.Set(overrideX, overrideY);
            }
        }
        else {
            this.emitter.GetSpawnPoint(particle.position);
        }

        this.emitter.GetInitialVelocity(particle.direction);

        particle.Activate(
            particle.position,
            particle.direction,
            RandomBetweenFloat(this.config.MIN_OPACITY_INCREMENT_VELOCITY, this.config.MAX_OPACITY_INCREMENT_VELOCITY),
            RandomBetweenFloat(this.config.MIN_OPACITY_DECREMENT_VELOCITY, this.config.MAX_OPACITY_DECREMENT_VELOCITY),
            RandomBetweenFloat(this.config.MIN_MAX_OPACITY,                this.config.MAX_MAX_OPACITY),
            RandomBetweenFloat(this.config.MIN_HOLD_TIME,                  this.config.MAX_HOLD_TIME),
            RandomBetweenFloat(this.config.MIN_INITIAL_SCALE,              this.config.MAX_INITIAL_SCALE),
            RandomBetweenFloat(this.config.MIN_SCALE_VELOCITY,             this.config.MAX_SCALE_VELOCITY),
            RandomBetweenFloat(this.config.MIN_INITIAL_ROTATION,           this.config.MAX_INITIAL_ROTATION),
            RandomBetweenFloat(this.config.MIN_ROTATION_VELOCITY,          this.config.MAX_ROTATION_VELOCITY),
            this
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
        if (this._activeCount === 0) {
            this._prevEmitterX   = this.emitter.position.x;
            this._prevEmitterY   = this.emitter.position.y;
            this._prevEmitterRot = this.emitter.rotation;
        }
        let spawned = 0;
        for (let i = 0; i < count; i++) {
            if (this._spawnSingleParticle(x, y)) {
                spawned++;
            }
            else {
                console.warn("ParticleSystem: pool exhausted – increase maxParticleCount.");
                break;
            }
        }
        return spawned;
    }

    /**
     * Carries existing active particles along with emitter movement/rotation when `simulationSpace === "local"`.
     */
    _applyLocalDelta() {
        const ex = this.emitter.position.x;
        const ey = this.emitter.position.y;
        const er = this.emitter.rotation;

        if (this._activeCount === 0) {
            this._prevEmitterX   = ex;
            this._prevEmitterY   = ey;
            this._prevEmitterRot = er;
            return;
        }

        const prevEx = this._prevEmitterX;
        const prevEy = this._prevEmitterY;
        const dx     = ex - prevEx;
        const dy     = ey - prevEy;
        const rawDr  = er - this._prevEmitterRot;
        const dr     = rawDr !== 0 ? NormalizeAngle(rawDr) : 0;

        // Skip tiny emitter deltas: position < 1e-5 px and rotation < 1e-7 rad
        if ((dx * dx + dy * dy) < 1e-10 && Math.abs(dr) < 1e-7)
            return;

        this._prevEmitterX   = ex;
        this._prevEmitterY   = ey;
        this._prevEmitterRot = er;

        if (Math.abs(dr) < 1e-7) {
            for (let i = 0; i < this._activeCount; i++) {
                const p = this.particles[i];
                p.position.x += dx;
                p.position.y += dy;
            }
        }
        else {
            const cos = Math.cos(dr);
            const sin = Math.sin(dr);
            for (let i = 0; i < this._activeCount; i++) {
                const p  = this.particles[i];
                const rx = p.position.x - prevEx;
                const ry = p.position.y - prevEy;
                p.position.x = ex + rx * cos - ry * sin;
                p.position.y = ey + rx * sin + ry * cos;
                const vx = p.direction.x;
                const vy = p.direction.y;
                p.direction.x = vx * cos - vy * sin;
                p.direction.y = vx * sin + vy * cos;
                p.rotation   += dr;
            }
        }
    }

    Update(deltaTime) {
        if (this.config.simulationSpace === "local")
            this._applyLocalDelta();

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

        if (this._activeCount === 0)
            return;

        // Precalculate shared per-frame physics parameters once for all particles
        const dt      = deltaTime;
        const gdx     = this.config.GRAVITY_X * dt;
        const gdy     = this.config.GRAVITY_Y * dt;
        const damping = this.config.VELOCITY_DAMPING;
        const drag    = damping > 0 ? Math.exp(-damping * dt) : 1.0;

        // Update all active particles using swap-and-pop to keep the active slice contiguous
        let i = 0;
        while (i < this._activeCount) {
            const particle = this.particles[i];
            if (particle.Update(dt, gdx, gdy, drag, this)) {
                i++;
            }
            else {
                // particle.Deactivate() already decremented this._activeCount;
                // move the last active particle into slot i and inspect it on the next iteration
                const last = this._activeCount;
                if (i !== last) {
                    this.particles[i]    = this.particles[last];
                    this.particles[last] = particle;
                }
            }
        }
    }

    Draw(renderer) {
        if (this._activeCount === 0)
            return;

        const targetBlend = this.config.globalCompositeOperation || "source-over";
        const prevBlend   = renderer.GetBlendMode();
        renderer.SetBlendMode(targetBlend);

        const colorFrames = renderer.ctx ? this._colorFrames : null;

        for (let i = 0; i < this._activeCount; i++) {
            this.particles[i].Draw(renderer, colorFrames, this);
        }

        // Restore previous blend mode
        renderer.SetBlendMode(prevBlend);
    }

    /** Returns how many particles are currently alive. */
    get activeCount() {
        return this._activeCount;
    }

    /** Deactivates all currently alive particles and resets the spawn countdown. */
    Reset() {
        for (let i = 0; i < this._activeCount; i++) {
            this.particles[i].active = false;
        }
        this._activeCount = 0;

        this._prevEmitterX   = this.emitter.position.x;
        this._prevEmitterY   = this.emitter.position.y;
        this._prevEmitterRot = this.emitter.rotation;

        this.nextTimeToSpawnParticle = RandomBetweenFloat(
            this.config.MIN_TIME_TO_SPAWN_PARTICLE,
            this.config.MAX_TIME_TO_SPAWN_PARTICLE
        );
    }

    /**
     * Fast-forwards the particle simulation by `duration` seconds in `fixedStep` increments
     * so ambient effects (rain, snow, area smoke, etc.) start already in steady state on frame 1.
     * @param {number} [duration=this.config.prewarmTime || 2.0] Seconds to simulate
     * @param {number} [fixedStep=this.config.prewarmStep || 0.05] Step size in seconds
     * @returns {this}
     */
    Prewarm(duration = (this.config.prewarmTime > 0 ? this.config.prewarmTime : 2.0),
            fixedStep = (this.config.prewarmStep > 0 ? this.config.prewarmStep : 0.05)) {
        if (duration <= 0)
            return this;

        const step      = Math.max(0.001, fixedStep);
        const wasActive = this.active;
        this.active     = true;

        let remaining = duration;
        while (remaining > 0) {
            const dt = remaining < step ? remaining : step;
            this.Update(dt);
            remaining -= step;
        }

        this.active = wasActive;
        return this;
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

    /** Configures sprite-sheet frames for newly spawned particles (see `ParticleSystem.SetFrames`). */
    SetFrames(framesOrColumns, rows = 1, frameMode = this.particleSystem.config.frameMode, frameCount = 0) {
        this.particleSystem.SetFrames(framesOrColumns, rows, frameMode, frameCount);
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

    /** Fast-forwards the particle simulation by `duration` seconds in `fixedStep` increments. */
    Prewarm(duration, fixedStep) {
        this.particleSystem.Prewarm(duration, fixedStep);
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