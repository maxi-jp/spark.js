// ============================================================
// Particle System
// Particle, ParticleEmitter and ParticleSystem classes.
// Requires: utils_math.js (Vector2, RandomBetweenFloat, PI2)
//
// Based on: https://github.com/maxi-jp/HTML5_ParticleSystem
// ============================================================

/** Emitter shape: `point` spawns all particles at one position; `area` spawns randomly within a rectangle. */
const emitterType = {
    point: 0,
    area: 1
};

const defaultParticleConfig = {
    maxParticleCount: 500,

    globalCompositeOperation: "source-over",

    emitterType: emitterType.area,

    // Area emitter bounds (used when emitterType === area)
    AREA_X1: 0,
    AREA_Y1: 0,
    AREA_X2: 800,
    AREA_Y2: 640,

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
    emitCountPerSpawn: 1
};

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
     */
    Activate(initialPosition, opacityIncrementVelocity, opacityDecrementVelocity,
             initialScale, scaleVelocity, initialRotation, rotationVelocity,
             direction, gravityX = 0, gravityY = 0, velocityDamping = 0,
             maxOpacity = 1.0, holdTime = 0.0) {
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

    Draw(renderer) {
        renderer.DrawImage(
            this.img,
            this.position.x, this.position.y,
            this.scale, this.scale,
            this.rotation,
            Particle.pivot,
            this.opacity
        );
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

        if (this.config.emitterType === emitterType.area) {
            this.area = {
                x1: this.config.AREA_X1,
                y1: this.config.AREA_Y1,
                x2: this.config.AREA_X2,
                y2: this.config.AREA_Y2
            };
        }
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
        }
    }

    /** Returns a velocity Vector2 for the next particle. */
    GetInitialVelocity() {
        const speed = RandomBetweenFloat(this.config.MIN_INITIAL_VELOCITY, this.config.MAX_INITIAL_VELOCITY);

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
        }

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

        particle.Activate(
            overridePosition ? overridePosition : this.emitter.GetSpawnPoint(),
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
            RandomBetweenFloat(this.config.MIN_HOLD_TIME,                  this.config.MAX_HOLD_TIME)
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

        this.particles.forEach(particle => {
            if (particle.active)
                particle.Draw(renderer);
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
}