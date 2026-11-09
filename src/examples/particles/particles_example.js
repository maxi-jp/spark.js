// ============================================================
// Particle System – example / demo
// Controls:
//   A – Smoke (area, default config)
//   S – Smoke following the mouse (point emitter, rising buoyancy)
//   D – Rain (line emitter along top edge)
//   F – Snow (area emitter)
//   G – Sparks fountain (polar cone + gravity arc)
//   H – Rotating thruster / flamethrower (polar cone + SetRotation aiming at mouse)
//   J – Campfire / Fire Aura (circle emitter following mouse + upward buoyancy)
//   K – Portal Ring / Shockwave (ring emitter following mouse + radial outward velocity)
//   L – Energy Beam / Firewall (line emitter between two points + rising flames)
//   1 / 2 / 3 / 4 – Switch renderShape ("sprite" / "circle" / "rect" / "line")
//   Click / Space – Explosion burst at cursor (velocity damping + gravity)
// ============================================================

// ── Pre-set particle configurations ─────────────────────────

const smokeAreaConfig = {
    // inherits defaultParticleConfig – just a nice smoke cloud over the whole canvas
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

const rainConfig = {
    maxParticleCount: 1000,
    globalCompositeOperation: "source-over",
    emitterType: emitterType.line,

    AREA_X1: -200, AREA_Y1: -100,
    AREA_X2:  700, AREA_Y2: -100,

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
};

const snowConfig = {
    maxParticleCount: 1000,
    globalCompositeOperation: "source-over",
    emitterType: emitterType.area,

    AREA_X1: -100, AREA_Y1: -100,
    AREA_X2:  750, AREA_Y2: -100,

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

    MIN_TIME_TO_SPAWN_PARTICLE: 0.001,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.002
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
    MAX_INITIAL_ROTATION: PI2,

    MIN_ROTATION_VELOCITY: -2.0,
    MAX_ROTATION_VELOCITY:  2.0,

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
    AREA_X1: 150, AREA_Y1: 480,
    AREA_X2: 650, AREA_Y2: 240,

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

// ── Game setup ───────────────────────────────────────────────

class ParticlesExample extends Game {
    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth:  800,
            screenHeight: 640,
            imageSmoothingEnabled: true
        });

        this.graphicAssets = {
            smoke:     { path: "./src/examples/particles/assets/smoke.png",     img: null },
            smoke2:    { path: "./src/examples/particles/assets/smoke2.png",    img: null },
            snow:      { path: "./src/examples/particles/assets/snow.png",      img: null },
            waterdrop: { path: "./src/examples/particles/assets/waterdrop.png", img: null }
        };

        this._particleSystem = null;
        this._explosionPool  = null;
        this._mode = 'area-smoke';

        this.bgColor = Color.FromHex("#1a1a2e");
        this.semiTransparentBlack = new Color(0, 0, 0, 0.75);
    }

    Start() {
        super.Start();
        this._particleSystem = new ParticleSystem(
            this.graphicAssets.smoke.img,
            smokeAreaConfig
        );
        // Pool of reusable ParticleSystemGO instances for one-shot explosion bursts
        this._explosionPool = new Pool(
            this,
            6,
            ParticleSystemGO,
            [Vector2.Zero(), this.graphicAssets.smoke.img, explosionBurstConfig]
        );
        this._mode = 'area-smoke';
    }

    Update(deltaTime) {
        // Switch particle system modes
        if (Input.IsKeyPressed(KEY_A)) {
            this._particleSystem = new ParticleSystem(
                this.graphicAssets.smoke.img,
                smokeAreaConfig
            );
            this._mode = 'area-smoke';
        }
        if (Input.IsKeyPressed(KEY_S)) {
            this._particleSystem = new ParticleSystem(
                this.graphicAssets.smoke.img,
                smokePointConfig,
                new Vector2(Input.mouse.x, Input.mouse.y)
            );
            this._mode = 'point-smoke';
        }
        if (Input.IsKeyPressed(KEY_D)) {
            this._particleSystem = new ParticleSystem(
                this.graphicAssets.waterdrop.img,
                rainConfig
            );
            this._mode = 'rain';
        }
        if (Input.IsKeyPressed(KEY_F)) {
            this._particleSystem = new ParticleSystem(
                this.graphicAssets.snow.img,
                snowConfig
            );
            this._mode = 'snow';
        }
        if (Input.IsKeyPressed(KEY_G)) {
            this._particleSystem = new ParticleSystem(
                this.graphicAssets.smoke.img,
                fountainConfig,
                new Vector2(Input.mouse.x, Input.mouse.y)
            );
            this._mode = 'fountain';
        }
        if (Input.IsKeyPressed(KEY_H)) {
            this._particleSystem = new ParticleSystem(
                this.graphicAssets.smoke.img,
                thrusterConfig,
                new Vector2(this.screenWidth * 0.5, this.screenHeight * 0.5)
            );
            this._mode = 'thruster';
        }
        if (Input.IsKeyPressed(KEY_J)) {
            this._particleSystem = new ParticleSystem(
                this.graphicAssets.smoke.img,
                circleCampfireConfig,
                new Vector2(Input.mouse.x, Input.mouse.y)
            );
            this._mode = 'circle-campfire';
        }
        if (Input.IsKeyPressed(KEY_K)) {
            this._particleSystem = new ParticleSystem(
                this.graphicAssets.smoke.img,
                portalRingConfig,
                new Vector2(Input.mouse.x, Input.mouse.y)
            );
            this._mode = 'portal-ring';
        }
        if (Input.IsKeyPressed(KEY_L)) {
            this._particleSystem = new ParticleSystem(
                this.graphicAssets.smoke.img,
                firewallLineConfig
            );
            this._mode = 'firewall-line';
        }

        // Switch particle renderShape live (1 = sprite, 2 = circle, 3 = rect, 4 = line)
        if (Input.IsKeyPressed(KEY_1)) {
            this._particleSystem.SetRenderShape("sprite");
            this._explosionPool.objects.forEach(fx => fx.SetRenderShape("sprite"));
        }
        if (Input.IsKeyPressed(KEY_2)) {
            this._particleSystem.SetRenderShape("circle");
            this._explosionPool.objects.forEach(fx => fx.SetRenderShape("circle"));
        }
        if (Input.IsKeyPressed(KEY_3)) {
            this._particleSystem.SetRenderShape("rect");
            this._explosionPool.objects.forEach(fx => fx.SetRenderShape("rect"));
        }
        if (Input.IsKeyPressed(KEY_4)) {
            this._particleSystem.SetRenderShape("line");
            this._explosionPool.objects.forEach(fx => fx.SetRenderShape("line"));
        }

        // Trigger a pooled one-shot ParticleSystemGO explosion burst on Left Click or Space
        if (Input.IsMouseDown(0) || Input.IsKeyDown(KEY_SPACE)) {
            const fx = this._explosionPool.Activate();
            fx.SetRenderShape(this._particleSystem.config.renderShape || "sprite");
            fx.PlayBurst(55, Input.mouse.x, Input.mouse.y);
        }

        // Emitters that track the mouse cursor
        if (this._mode === 'point-smoke' || this._mode === 'fountain' ||
            this._mode === 'circle-campfire' || this._mode === 'portal-ring') {
            this._particleSystem.SetPosition(Input.mouse.x, Input.mouse.y);
        }
        else if (this._mode === 'thruster') {
            const cx = this.screenWidth * 0.5;
            const cy = this.screenHeight * 0.5;
            const angle = Math.atan2(Input.mouse.y - cy, Input.mouse.x - cx);
            this._particleSystem.SetRotation(angle);
        }
        else if (this._mode === 'firewall-line') {
            // Anchor start of the line at (180, 460) and track the mouse with the second endpoint
            this._particleSystem.emitter.area.x2 = Input.mouse.x;
            this._particleSystem.emitter.area.y2 = Input.mouse.y;
        }

        this._particleSystem.Update(deltaTime);
        this._explosionPool.Update(deltaTime);
    }

    Draw() {
        // Dark background
        this.renderer.DrawFillBasicRectangle(
            0, 0,
            this.screenWidth, this.screenHeight,
            this.bgColor
        );

        this._particleSystem.Draw(this.renderer);
        this._explosionPool.Draw(this.renderer);
        this._drawHUD(this.renderer.ctx);
    }

    _drawHUD(ctx) {
        this.renderer.DrawFillBasicRectangle(8, 8, 430, 226, this.semiTransparentBlack);
        this.renderer.DrawFillText("A - Area smoke (default)", 16, 28, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText("S - Smoke following mouse (buoyancy)", 16, 46, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText("D - Rain (line emitter along top)", 16, 64, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText("F - Snow (area emitter)", 16, 82, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText("G - Sparks fountain (line shape + gravity)", 16, 100, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText("H - Rotating thruster (polar + SetRotation)", 16, 118, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText("J - Campfire / Aura (circle emitter)", 16, 136, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText("K - Portal / Shockwave (ring + radial vel)", 16, 154, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText("L - Flame Barrier (line emitter to mouse)", 16, 172, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText("Click / Space - Pooled ParticleSystemGO burst", 16, 190, "13px monospace", Color.white, "left");
        const ps = this._particleSystem;
        const shape = ps.config.renderShape || "sprite";
        let burstParticles = 0;
        let activePoolGOs  = 0;
        for (let i = 0; i < this._explosionPool.objects.length; i++) {
            const fx = this._explosionPool.objects[i];
            if (fx.active) {
                activePoolGOs++;
                burstParticles += fx.activeCount;
            }
        }
        this.renderer.DrawFillText(`1-4 Shape: [${shape}] (1:sprite 2:circle 3:rect 4:line)`, 16, 208, "13px monospace", Color.white, "left");
        this.renderer.DrawFillText(`Alive: ${ps.activeCount}/${ps.config.maxParticleCount} | Burst: +${burstParticles} (Pool: ${activePoolGOs}/${this._explosionPool.objects.length})`, 16, 226, "13px monospace", Color.white, "left");
    }
}

window.onload = () => {
    Init(ParticlesExample);
};
