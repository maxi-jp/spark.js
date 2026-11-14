# Particle System

The particle system (`src/engine/particlesystem.js`) provides a flexible, pooled, image-based 2D particle emitter for visual effects such as smoke, fire, rain, snow, sparks, muzzle flashes, and explosions. It uses a pre-allocated internal object pool so that `Particle` instances are reused rather than created and destroyed at runtime.

> Based on the standalone [HTML5_ParticleSystem](https://github.com/maxi-jp/HTML5_ParticleSystem) project.

> 💡 **Visual Tool:** Use the standalone [Particle System Editor](../particle-system-editor.html ':ignore :target=_blank') to load or drop a particle sprite, tweak every configuration parameter in real time on an interactive canvas, test moving emitter paths, and export ready-to-use JSON or JavaScript snippets.

---

## Dependencies

`particlesystem.js` requires `utils_math.js` (`Vector2`, `RandomBetweenFloat`, `PI2`). Include it **after** `utils_math.js` and `renderer.js`:

```html
<script src="engine/utils_math.js"></script>
<script src="engine/utils_classes.js"></script>
<script src="engine/renderer.js"></script>
<!-- ... other engine scripts ... -->
<script src="engine/particlesystem.js"></script>
```

---

## Architecture & Lifecycle

The module is organized into four classes inside `src/engine/particlesystem.js`:

1. **`Particle`** — A single pooled particle instance storing transform (`position`, `scale`, `rotation`), velocity (`direction`), and lifecycle state (`active`, `appearing`, `opacity`, fade speeds, `scaleVelocity`, `rotationVelocity`). Managed internally by `ParticleSystem`.
2. **`ParticleEmitter`** — Calculates spawn positions (`GetSpawnPoint()`) for `point`, `area`, `circle`, `ring`, or `line` emitters and generates randomized initial velocity vectors (`GetInitialVelocity()`).
3. **`ParticleSystem`** — Standalone, engine-agnostic controller that merges user configuration with `defaultParticleConfig`, pre-allocates the `Particle` pool, runs the spawn timer and sub-frame catch-up loop in `Update(deltaTime)`, supports immediate one-shot `Burst()` calls, and renders active particles in `Draw(renderer)`.
4. **`ParticleSystemGO`** — `GameObject` subclass wrapping a `ParticleSystem` for seamless integration with `game.AddGameObject()` and `Pool` (including automatic one-shot cleanup via `autoDeactivateWhenEmpty` and `destroyWhenEmpty`).

### Particle Lifecycle Details

- **Thin Particle Architecture & Precomputed Physics**:
  - Each `Particle` stores only its own personal mutable state: transform (`position`, `scale`, `rotation`), kinematics (`direction`, `scaleVelocity`, `rotationVelocity`), lifecycle (`active`, `appearing`, `opacity`, `maxOpacity`, `holdTime`, `opacityIncrementVelocity`, `opacityDecrementVelocity`, `age`, `invLifetime`, `lifeProgress`), tint (`tint`), and current sprite section (`frame`).
  - System-wide properties (`renderShape`, `PARTICLE_SIZE`, `alignToVelocity`, `frames`, `animateFrames`, color endpoints) reside in `ParticleSystem` and are shared via a light reference (`this.system`), avoiding duplicating dozens of static fields across thousands of pooled particle instances.
  - Per-frame physics constants (`gdx = GRAVITY_X * dt`, `gdy = GRAVITY_Y * dt`, and air drag `drag = Math.exp(-VELOCITY_DAMPING * dt)`) are computed **once per frame** in `ParticleSystem.Update(dt)` and passed into `Particle.Update`, eliminating thousands of redundant `Math.exp()` calls every frame.
- **Activation (`Particle.Activate`)**:
  - When spawned, a particle starts at `opacity = 0` with `active = true` and `appearing = true`.
  - Its initial position, velocity (`direction`), fade-in speed (`opacityIncrementVelocity`), fade-out speed (`opacityDecrementVelocity`), peak opacity target (`maxOpacity`), hold duration (`holdTime`), initial scale, scale velocity, initial rotation, rotation velocity, and owning `system` are passed directly to `Activate(...)`.
- **Opacity State Machine (`appearing` → hold → fade-out)**:
  - **Phase 1 — Fade In (`this.appearing === true`)**: Opacity increases by `opacityIncrementVelocity * deltaTime`. Once `opacity >= this.maxOpacity`, it clamps to `this.maxOpacity` and transitions to `this.appearing = false`.
  - **Phase 2 — Hold (`this.appearing === false` and `this.holdTime > 0`)**: The particle remains at `this.maxOpacity` while `this.holdTime` counts down by `deltaTime`.
  - **Phase 3 — Fade Out (`this.appearing === false` and `this.holdTime <= 0`)**: Opacity decreases by `opacityDecrementVelocity * deltaTime`. Once `opacity <= 0.0`, the particle calls `Deactivate()` (`this.active = false`) and returns to the pool immediately.
- **Scale & Transform Update**:
  - Each frame, `scale += scaleVelocity * deltaTime`. If `scale <= 0.0` (when using a negative `scaleVelocity` to shrink particles), the particle immediately deactivates to prevent inverted sprite rendering.
  - Rotation advances by `rotationVelocity * deltaTime` (radians/sec) around `Particle.pivot` (`{ x: 0, y: 0 }`, the sprite center).
  - Position advances by `direction.x * deltaTime` and `direction.y * deltaTime` (pixels/sec).
- **Sub-Frame Spawn Catch-Up**:
  - In `ParticleSystem.Update(deltaTime)`, `nextTimeToSpawnParticle` counts down by `deltaTime`.
  - A `while (this.nextTimeToSpawnParticle <= 0.0)` loop calls `this.Burst(this.config.emitCountPerSpawn)` and adds the next randomized interval (clamped to a minimum of `0.0001s`). This guarantees accurate high-frequency emission rates even when `MIN_TIME_TO_SPAWN_PARTICLE` (e.g. `0.001s` for dense rain) is smaller than a single frame's `deltaTime` (`~0.0167s` at 60 FPS).

---

## Core Concepts

### `emitterType` & `particleShape`

Global enums defining how particle spawn positions are chosen (`emitterType`) and how each particle is rendered (`particleShape` / `renderShape`):

```javascript
const emitterType = {
    point:  0,  // all particles spawn at a single world position (emitter.position)
    area:   1,  // particles spawn at random positions inside a rectangle (AREA_X1..AREA_X2, AREA_Y1..AREA_Y2)
    circle: 2,  // particles spawn uniformly inside a filled disk of EMISSION_RADIUS centered at emitter.position
    ring:   3,  // particles spawn inside an annulus between EMISSION_INNER_RADIUS and EMISSION_RADIUS centered at emitter.position
    line:   4   // particles spawn randomly along the line segment (AREA_X1, AREA_Y1) -> (AREA_X2, AREA_Y2)
};

const particleShape = {
    sprite: "sprite",  // draws the HTMLImageElement passed to ParticleSystem (default)
    circle: "circle",  // draws a procedural filled circle of diameter PARTICLE_SIZE * scale
    rect:   "rect",    // draws a procedural rotated square of side PARTICLE_SIZE * scale
    line:   "line"     // draws a procedural velocity-aligned streak/spark scaled by PARTICLE_SIZE * scale
};
```

### `defaultParticleConfig`

Every `ParticleSystem` merges your config object with `defaultParticleConfig` via `Object.assign({}, defaultParticleConfig, config)`. You only need to pass the properties you wish to override:

```javascript
const defaultParticleConfig = {
    maxParticleCount: 500,                    // size of the pre-allocated particle pool

    // Blend mode applied during rendering ("source-over" / "normal", "lighter" / "add", "screen", "multiply", etc.)
    // Works across both Canvas2DRenderer and WebGLRenderer via renderer.SetBlendMode().
    globalCompositeOperation: "source-over",

    // Visual particle shape: "sprite" | "circle" | "rect" | "line" (defaults to "circle" if img is null)
    renderShape: "sprite",

    // Base size in pixels for procedural shapes ("circle", "rect", "line") at scale = 1.0
    PARTICLE_SIZE: 64,

    // Color tinting / Color-over-Lifetime (hex string "#rrggbb", Color instance, or null for untinted)
    // Also supports shorthand tintColor: "#rrggbb" for a flat tint across the entire particle lifetime
    startColor: null,
    endColor: null,

    emitterType: emitterType.area,            // point (0), area (1), circle (2), ring (3), or line (4)
    simulationSpace: "world",                 // "world" (particles stay in world) | "local" (particles move & rotate with emitter)

    // Area / Line emitter bounds in pixels (used when emitterType === area or emitterType === line)
    AREA_X1: 0,   AREA_Y1: 0,
    AREA_X2: 800, AREA_Y2: 640,
    relativeArea: false,                      // when true, AREA_X1..AREA_Y2 are offsets relative to emitter.position

    // Circle / Ring emitter radii in pixels (used when emitterType === circle or emitterType === ring)
    EMISSION_RADIUS: 50,
    EMISSION_INNER_RADIUS: 0,

    // When true on circle or ring emitters, initial velocity points radially outward from emitter.position
    radialVelocity: false,

    // Initial particle speed range (pixels / sec)
    MIN_INITIAL_VELOCITY: 10,
    MAX_INITIAL_VELOCITY: 60,

    // Direction mode: "cartesian" (uses MIN/MAX_DIRECTION_X/Y) or "polar" (uses MIN_ANGLE / MAX_ANGLE)
    // Auto-selects "polar" if MIN_ANGLE or MAX_ANGLE is provided in config without directionMode
    directionMode: "cartesian",

    // Un-normalised direction components [-1, 1] (used when directionMode === "cartesian")
    MIN_DIRECTION_X: -1, MAX_DIRECTION_X: 1,
    MIN_DIRECTION_Y: -1, MAX_DIRECTION_Y: 1,

    // Polar emission cone angles in radians (used when directionMode === "polar"; 0 = right, -PI/2 = up)
    MIN_ANGLE: 0,
    MAX_ANGLE: PI2,

    // Constant acceleration / gravity (pixels / sec²)
    GRAVITY_X: 0,
    GRAVITY_Y: 0,

    // Air drag / velocity damping coefficient (1 / sec; 0 = no drag)
    VELOCITY_DAMPING: 0,

    // Opacity fade-in & fade-out speeds (opacity units / sec)
    MIN_OPACITY_INCREMENT_VELOCITY: 1.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 4.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 0.5,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.0,

    // Peak opacity target range (0, 1] where fade-in stops (also supports shorthand MAX_OPACITY)
    MIN_MAX_OPACITY: 1.0,
    MAX_MAX_OPACITY: 1.0,

    // Hold duration in seconds at peak opacity before fading out (also supports shorthand HOLD_TIME)
    MIN_HOLD_TIME: 0.0,
    MAX_HOLD_TIME: 0.0,

    // Initial scale multiplier range
    MIN_INITIAL_SCALE: 0.1,
    MAX_INITIAL_SCALE: 0.5,

    // Scale growth / shrink speed (scale units / sec; negative values shrink particles)
    MIN_SCALE_VELOCITY: 0.5,
    MAX_SCALE_VELOCITY: 0.75,

    // Initial rotation range (radians; acts as angular offset when alignToVelocity is true)
    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,

    // Angular velocity range (radians / sec; ignored when alignToVelocity is true)
    MIN_ROTATION_VELOCITY: 0.05,
    MAX_ROTATION_VELOCITY: 0.15,

    // When true, particle rotation automatically tracks its velocity vector (Math.atan2(vy, vx) + initialRotation)
    alignToVelocity: false,

    // Time between spawn ticks (seconds)
    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.05,

    // Number of particles spawned on each timer tick
    emitCountPerSpawn: 1,

    // Sprite sheet / SpriteAtlas frames (renderShape === "sprite" only)
    frames: null,          // [{ x, y, w, h }, ...], a SpriteAtlas, or atlas JSON (overrides the grid below)
    sheetColumns: 1,       // uniform grid columns (1x1 = draw the full image)
    sheetRows: 1,          // uniform grid rows
    sheetFrameCount: 0,    // use only the first N grid frames (0 = sheetColumns * sheetRows)
    frameMode: "random",   // "random" (frame picked at spawn) | "animate" (frame 0 -> N-1 over lifetime)

    // Lifecycle flags for ParticleSystemGO (when emission stops and activeCount reaches 0)
    autoDeactivateWhenEmpty: false,
    destroyWhenEmpty: false
};
```

---

## API Reference

### `ParticleSystem`

The standalone particle controller class. Owns the particle pool, the `ParticleEmitter`, and the update/draw loop.

#### `constructor(img, config, position)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `img` | `HTMLImageElement \| null` | Sprite texture drawn for each particle (or `null` when using procedural shapes). |
| `config` | `Object` *(optional)* | Overrides for `defaultParticleConfig`. Missing keys fall back to defaults. |
| `position` | `Vector2` *(optional)* | Initial world-space position for `emitterType.point`, `circle`, and `ring` emitters (defaults to `Vector2.Zero()`). |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `SetPosition(x, y)` | `void` | Moves `this.emitter.position` to `(x, y)` in world space. Ideal for point emitters attached to moving objects or the mouse cursor. |
| `SetRotation(angle)` | `void` | Rotates the emitter's emission direction by `angle` (in radians). Works with both `"polar"` cones and `"cartesian"` direction ranges. |
| `SetColor(startColor, endColor = startColor)` | `void` | Updates the emitter's color tint or color-over-lifetime gradient at runtime (`"#rrggbb"`, CSS color string, `Color` instance, or `null` to disable tinting). |
| `SetRenderShape(shape)` | `void` | Updates `config.renderShape` (`"sprite" \| "circle" \| "rect" \| "line"`) at runtime and refreshes cached sprite color frames. |
| `SetFrames(framesOrColumns, rows = 1, frameMode, frameCount = 0)` | `void` | Configures sprite-sheet frames for newly spawned particles. Pass numbers for a uniform grid (`SetFrames(4, 4, "animate")`), or an array of `{ x, y, w, h }` rects / a `SpriteAtlas` / atlas JSON (`SetFrames(atlas, 1, "random")`). `SetFrames(null)` disables frames. Also available on `ParticleSystemGO`. |
| `Burst(count = 1, x, y)` | `number` | Immediately activates up to `count` particles from the pool and returns the number actually spawned. Works even when `this.active === false`. Optional `(x, y)` overrides the emitter's spawn point for that burst. Logs a `console.warn` if the pool is exhausted. |
| `Reset()` | `void` | Immediately deactivates all alive particles and resets the spawn countdown. |
| `Update(deltaTime)` | `void` | If `this.active` is `true`, advances the spawn timer and emits particles; then updates all currently active particles. Call once per frame in `Update(deltaTime)`. |
| `Draw(renderer)` | `void` | Applies `config.globalCompositeOperation` via `renderer.SetBlendMode()`, draws all active particles, and restores the previous blend mode. Call once per frame in `Draw()`. |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `active` | `boolean` | Controls continuous timer-based emission (`true` by default). Setting `active = false` stops automatic spawning while allowing already-alive particles to finish fading out (`Burst()` still works). |
| `rotation` *(getter/setter)* | `number` | Current emitter rotation angle in radians (`this.emitter.rotation`). |
| `activeCount` *(getter)* | `number` | Returns the number of particles currently alive (`active === true`). Useful for HUD telemetry and pool sizing. |
| `config` | `Object` | Merged configuration object for this instance. |
| `emitter` | `ParticleEmitter` | The internal emitter responsible for spawn points and initial velocity vectors. |
| `particles` | `Particle[]` | Pre-allocated array of pooled `Particle` instances (`length === config.maxParticleCount`). |

---

### `ParticleSystemGO`

A `GameObject` subclass that wraps a `ParticleSystem` so emitters can be added directly to `this.AddGameObject(...)` or recycled via `Pool`.

- **`this.active`** (inherited from `GameObject`) controls whether the `GameObject` is active in the scene or pool (updating and drawing).
- **`this.emitting`** (alias for `this.particleSystem.active`) controls whether the emitter is continuously spawning new particles.
- **`this.position` / `this.x` / `this.y`** and **`this.rotation`** are shared directly with `this.particleSystem.emitter` with zero per-frame copy overhead.

#### `constructor(position, img, config)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `position` | `Vector2` *(optional)* | Initial world-space position (defaults to `Vector2.Zero()`). |
| `img` | `HTMLImageElement \| null` *(optional)* | Sprite texture drawn for each particle (or `null` when using procedural shapes). |
| `config` | `Object` *(optional)* | Overrides for `defaultParticleConfig`. |

#### Additional Methods & Properties

| Member | Type / Returns | Description |
|--------|----------------|-------------|
| `Play(x, y)` | `this` | Optionally moves to `(x, y)`, sets `this.active = true`, and enables continuous emission (`this.emitting = true`). |
| `PlayBurst(count, x, y, autoDeactivate = true)` | `number` | Optionally moves to `(x, y)`, activates the `GameObject`, disables continuous emission (`this.emitting = false`), spawns `count` particles immediately, and sets `autoDeactivateWhenEmpty = autoDeactivate` so the `ParticleSystemGO` automatically returns to its `Pool` (`this.active = false`) once all burst particles fade out. |
| `Stop(autoDeactivate)` | `this` | Stops continuous spawning (`this.emitting = false`) while keeping `this.active = true` so in-flight particles finish fading out naturally. |
| `Reset()` | `this` | Immediately deactivates all alive particles and resets the spawn timer. |
| `emitting` *(getter/setter)* | `boolean` | Controls continuous particle emission (`this.particleSystem.active`). |
| `autoDeactivateWhenEmpty` | `boolean` | When `true` and `emitting === false`, automatically sets `this.active = false` once `activeCount === 0` (ideal for `Pool` recycling). |
| `destroyWhenEmpty` | `boolean` | When `true` and `emitting === false`, automatically calls `this.game.Destroy(this)` once `activeCount === 0` (ideal for fire-and-forget `AddGameObject` effects). |
| `particleSystem` | `ParticleSystem` | The underlying `ParticleSystem` instance. |

---

## Usage Examples

### 1. Continuous Point Emitter Following the Mouse

```javascript
class MyGame extends Game {
    constructor(renderer) {
        super(renderer);

        this.Configure({ screenWidth: 800, screenHeight: 640 });

        this.graphicAssets = {
            smoke: { path: "assets/smoke.png", img: null }
        };

        this.smoke = null;
    }

    Start() {
        super.Start();

        this.smoke = new ParticleSystem(
            this.graphicAssets.smoke.img,
            {
                emitterType: emitterType.point,
                maxParticleCount: 200,
                globalCompositeOperation: "overlay",
                MIN_INITIAL_VELOCITY: 10,
                MAX_INITIAL_VELOCITY: 60,
                MIN_INITIAL_SCALE: 0.05,
                MAX_INITIAL_SCALE: 0.5,
                MIN_SCALE_VELOCITY: 0.25,
                MAX_SCALE_VELOCITY: 0.5,
                MIN_TIME_TO_SPAWN_PARTICLE: 0.01,
                MAX_TIME_TO_SPAWN_PARTICLE: 0.1
            },
            new Vector2(400, 320)
        );
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.smoke.SetPosition(Input.mouse.x, Input.mouse.y);
        this.smoke.Update(deltaTime);
    }

    Draw() {
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);
        super.Draw();
        this.smoke.Draw(this.renderer);
    }
}
```

### 2. One-Shot Explosion / Impact Burst

Set `active = false` on a `ParticleSystem` to disable continuous spawning, and trigger `Burst(count, x, y)` on demand (e.g. when a projectile hits a target):

```javascript
// In Start(): create a shared burst pool with continuous spawning disabled
this.hitSparks = new ParticleSystem(this.graphicAssets.smoke2.img, {
    emitterType: emitterType.point,
    maxParticleCount: 300,
    globalCompositeOperation: "lighter",
    MIN_INITIAL_VELOCITY: 80,
    MAX_INITIAL_VELOCITY: 240,
    MIN_OPACITY_INCREMENT_VELOCITY: 10.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 20.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 2.0,
    MAX_OPACITY_DECREMENT_VELOCITY: 4.0,
    MIN_INITIAL_SCALE: 0.05,
    MAX_INITIAL_SCALE: 0.15,
    MIN_SCALE_VELOCITY: -0.05,
    MAX_SCALE_VELOCITY: 0.05
});
this.hitSparks.active = false; // only emit when Burst() is called

// When an explosion or collision occurs at (hitX, hitY):
this.hitSparks.Burst(35, hitX, hitY);
```

### 3. Sprite Sheet Frames (`smoke2.png`, 4×4 grid)

`smoke2.png` is a `1024×1024` sheet with 16 frames of `256×256` px. Split it with `sheetColumns` / `sheetRows` and choose a `frameMode`:

```javascript
this.smokeColumn = new ParticleSystem(this.graphicAssets.smoke2.img, {
    emitterType: emitterType.point,
    sheetColumns: 4,
    sheetRows: 4,
    frameMode: "animate",       // each particle plays frames 0 -> 15 over its lifetime
    MIN_INITIAL_SCALE: 0.12,    // frames are 256px: keep scales small
    MAX_INITIAL_SCALE: 0.2,
    GRAVITY_Y: -45
});

// Random variation instead of a flipbook (e.g. debris / leaves from a SpriteAtlas):
this.debris.SetFrames(new SpriteAtlas(this.graphicAssets.debris.atlas), 1, "random");
```

- Frame rects are resolved **once** (on construction, `SetFrames`, `SetColor`, `SetRenderShape`, or image change) into a shared array — no per-particle allocations.
- `"random"` picks a frame in `Activate()` with zero per-frame cost; `"animate"` reuses the same lifetime progress already tracked for color gradients.
- Works with color tinting on both renderers: `Canvas2DRenderer` crops the frame out of the pre-baked tinted sheet, and `WebGLRenderer` pushes the cropped UVs into the same tinted sprite batch.

### 4. `ParticleSystemGO` (`AddGameObject` & `Pool` Recycling)

Wrap an emitter as a `GameObject` so `Game` updates and draws it automatically (no manual `Update`/`Draw` calls needed):

```javascript
// Option A: Fire-and-forget one-shot effect via AddGameObject
const fx = new ParticleSystemGO(new Vector2(hitX, hitY), this.graphicAssets.smoke.img, {
    emitterType: emitterType.point,
    globalCompositeOperation: "lighter",
    destroyWhenEmpty: true
});
this.AddGameObject(fx);
fx.PlayBurst(40, hitX, hitY, false); // auto-destroys itself once all 40 particles fade out

// Option B: Pooled one-shot explosions (zero GC)
// In Start():
this._explosionPool = new Pool(
    this,
    6,
    ParticleSystemGO,
    [Vector2.Zero(), this.graphicAssets.smoke.img, explosionBurstConfig]
);

// On impact:
const burst = this._explosionPool.Activate();
burst.PlayBurst(55, hitX, hitY); // sets autoDeactivateWhenEmpty = true, returning to Pool when empty
```

### 5. Camera-Following Rain / Snow (`relativeArea: true`)

For scrolling worlds using `renderer.ApplyCameraTransform(this.camera)`, enable `relativeArea: true` so `area` / `line` bounds act as offsets around `emitter.position`:

```javascript
// In Start():
this.rain = new ParticleSystem(this.graphicAssets.waterdrop.img, {
    emitterType: emitterType.line,
    relativeArea: true,
    AREA_X1: -100, AREA_Y1: -50,
    AREA_X2:  900, AREA_Y2: -50,
    prewarm: true,
    prewarmTime: 1.5
});

// In Update(deltaTime): keep the rain line anchored to the camera's top-left
this.rain.SetPosition(this.camera.x, this.camera.y);
this.rain.Update(deltaTime);
```

### 6. Interactive Showcase & Preset Explorer (`src/examples/particles/particles_showcase.js`)

The included demo project ([`particles_showcase.js`](../src/examples/particles/particles_showcase.js ':ignore')) features an interactive HTML+CSS sidebar (`ParticlesShowcaseMenu extends HTMLMenu`, `[V]` to hide/show), a live **`[R]` `Canvas2DRenderer` ⇄ `WebGLRenderer`** switcher, and two browseable categories (`[Tab]` to switch, `Up`/`Down` or Mouse Click to select):

#### Category 1: 🎬 Multi-Emitter & Gameplay Showcase Scenes (6 Scenes)
1. **Spaceship Combat (`scene-spaceship`)**: Combines 4 simultaneous emitters — a prewarmed deep-space starfield (`emitterType.area`), a rigid ship shield (`simulationSpace: "local"`, `emitterType.ring`), a directional ion thruster (`directionMode: "polar"` + `SetRotation`), and a world-space 4×4 `smoke2.png` exhaust trail — plus **Click / Space** plasma torpedoes that detonate into pooled two-stage explosions (`Pool<ParticleSystemGO>`) and **`[M]`** to toggle between Figure-8 Autopilot and Mouse Steer.
2. **Campfire & Torch (`scene-campfire`)**: A 4-layer composite hearth fire (4×4 rising dark smoke column + outer flame disk + white-hot core + rising shrinking spark embers) paired with a mouse-driven hand torch and **Click / Space** ember stoking.
3. **Fireworks Finale (`scene-fireworks`)**: Auto-launching and click-targeted aerial shells with velocity-aligned `"line"` spark tails that detonate at apex into 3-layer Chrysanthemum star bursts, expanding shockwave rings, and crackling `"rect"` glitter.
4. **Thunderstorm & Camera (`scene-storm`)**: Demonstrates `relativeArea: true` synced to a scrolling `Camera` (`renderer.ApplyCameraTransform`) across a 2800px road scene with slanted heavy rain, ground puddle splashes, drifting storm fog, and **Click / Space** branching lightning strikes.
5. **Sci-Fi Laser & Black Hole (`scene-scifi`)**: Pairs an imploding Black Hole singularity (`emitterType.ring` with negative speed `MIN_INITIAL_VELOCITY: -155, MAX_INITIAL_VELOCITY: -85` and `radialVelocity: true`) with an interactive plasma turret firing a dynamic `emitterType.line` laser beam and welding impact sparks at the cursor.
6. **Combat & Gore VFX Lab (`scene-combat`)**: Interactive target dummy (directional `bloodSpatterConfig` + blood mist on click), destructible supply crate (spinning `"rect"` shrapnel debris + explosion on click/space), and a sanctuary healing totem (`healingAuraConfig`).

#### Category 2: ✨ Single-Emitter Presets (18 Presets)
- **`A` — Area Smoke (`smokeAreaConfig`)**: Uses `defaultParticleConfig` (`emitterType.area` with `prewarm: true`) to fill the screen with drifting smoke clouds.
- **`S` — Rising Point Smoke (`smokePointConfig`)**: Uses `emitterType.point` with `globalCompositeOperation: "overlay"`, thermal upward buoyancy (`GRAVITY_Y: -35`), gentle air drag (`VELOCITY_DAMPING: 0.4`), and soft peak opacity (`0.35–0.65`).
- **`Z` — Sprite-Sheet 4×4 (1/sec) (`spriteSheetSmokeConfig`)**: Spawns ~1 particle/sec (`MIN_TIME_TO_SPAWN_PARTICLE: 1, MAX_TIME_TO_SPAWN_PARTICLE: 1.5`) using `smoke2.png` split into a `4×4` grid (`sheetColumns: 4, sheetRows: 4, frameMode: "animate"`) so you can clearly observe how an individual particle steps through all 16 frames across its lifetime. Press **`X`** to toggle `frameMode` between `"animate"` and `"random"` via `SetFrames()`.
- **`W` — Sprite-Sheet 4×4 (Stream) (`spriteSheetSmokeStreamConfig`)**: Continuous billowing smoke column (`MIN_TIME_TO_SPAWN_PARTICLE: 0.06, MAX_TIME_TO_SPAWN_PARTICLE: 0.12`) using the same `4×4` `smoke2.png` sprite sheet. Press **`X`** to toggle `frameMode` between `"animate"` and `"random"`.
- **`D` — Slanted Rain (`rainConfig`)**: Uses `emitterType.line` with `relativeArea: true`, `alignToVelocity: true`, and `prewarm: true`.
- **`F` — Snowfall (`snowConfig`)**: Area emitter above the canvas with gentle horizontal flutter and `15s` prewarm.
- **`G` — Sparks Fountain (`fountainConfig`)**: Point emitter launching velocity-aligned spark streaks (`renderShape: "line", PARTICLE_SIZE: 80`) in an upward polar cone with parabolic gravity (`GRAVITY_Y: 550`).
- **`H` — Rotating Jet Thruster (`thrusterConfig`)**: Narrow directional polar cone (`MIN_ANGLE: -0.22, MAX_ANGLE: 0.22`) aimed at the mouse via `SetRotation(angle)`.
- **`J` — Campfire Disk (`circleCampfireConfig`)**: Uniform disk sampling (`emitterType.circle`, `EMISSION_RADIUS: 60`) with upward thermal buoyancy (`GRAVITY_Y: -90`).
- **`K` — Portal Shockwave (`portalRingConfig`)**: Annulus emitter (`emitterType.ring`, `75..90px`) with outward `radialVelocity: true` and air drag (`VELOCITY_DAMPING: 2.2`).
- **`L` — Flame Barrier (`firewallLineConfig`)**: Dynamic `emitterType.line` segment with its second endpoint tracking the mouse cursor.
- **`C` — Shield Aura (`localAuraConfig`)**: Uses `simulationSpace: "local"` on an `emitterType.ring` so active particles translate and rotate rigidly with the emitter.
- **`B` — Black Hole Vortex (`blackHoleConfig`)**: Uses `emitterType.ring` (`95..120px`) with `radialVelocity: true` and negative initial velocity (`-155..-85 px/s`) so particles implode inward while shrinking.
- **`N` — Healing / Buff Aura (`healingAuraConfig`)**: Uses `emitterType.circle` spawning rising procedural `"rect"` particles with an emerald-to-gold gradient (`#2bff88` → `#e6ff66`).
- **`M` — Confetti Cannon (`confettiConfig`)**: Upward polar cone launching fast-spinning procedural rectangles (`renderShape: "rect"`, `MIN/MAX_ROTATION_VELOCITY: -9..9`) with rainbow `SetColor()` cycling.
- **`P` — Blood / Hit Spatter (`bloodSpatterConfig`)**: High-speed directional polar spray (`renderShape: "circle"`) with strong `VELOCITY_DAMPING: 4.2`, gravity, and shrinking crimson droplets.
- **`Q` — Magic Fairy Dust (`magicSparklesConfig`)**: Mouse-trailing circle emitter spawning fast-spinning, rapidly shrinking `"rect"` sparkles (`#ff80ff` → `#ffee55`).
- **`E` — Tesla Electric Arcs (`electricSparksConfig`)**: High-speed velocity-aligned `"line"` streaks bursting from a small ring with extreme damping (`VELOCITY_DAMPING: 6.5`).
- **`1 / 2 / 3 / 4` — Live Particle Shape Switch (`renderShape`)**: Switches the active preset and burst pool live between `"sprite"` (`1`), `"circle"` (`2`), `"rect"` (`3`), and `"line"` (`4`).
- **`Click / Space` — Pooled Explosion Burst (`explosionBurstConfig`)**: Activates a `ParticleSystemGO` from `this._explosionPool` and triggers a 55-particle one-shot `PlayBurst()`.

---

## Particle System Editor

The standalone **[Particle System Editor](../particle-system-editor.html ':ignore :target=_blank')** (`particle-system-editor.html`, implemented in `src/examples/particle_system_editor/particle_system_editor.js`) runs the actual engine `Canvas2DRenderer` and `ParticleSystem` so visual previews match in-game rendering 1:1.

### Editor Capabilities

- **Particle Textures (Built-in & Custom)**:
  - Switch between 4 built-in sample assets (`smoke.png`, `smoke2.png`, `snow.png`, `waterdrop.png`) and a procedural radial-gradient fallback (`Built-in: Soft Circle`).
  - Load any custom image via the **Load Image** button, by clicking the sprite thumbnail preview, or by dragging and dropping an image file anywhere onto the window.
- **21 Built-in Presets**:
  - *Missile Smoke (Death Rally)* (`missileSmokeConfig`)
  - *Sprite-Sheet Smoke 1/sec (smoke2.png 4×4)* (`spriteSheetSmokeConfig` — ~1 particle/sec to inspect single-particle 16-frame flipbook animation)
  - *Sprite-Sheet Smoke Stream (smoke2.png 4×4)* (`spriteSheetSmokeStreamConfig` — continuous billowing 16-frame smoke column)
  - *Default (Area Smoke)* (`smokeAreaConfig`)
  - *Point Smoke* (`smokePointConfig`)
  - *Fire / Exhaust* (`fireExhaustConfig` — additive `"lighter"` blending with upward thermal buoyancy `GRAVITY_Y: -60`)
  - *Jet Thruster (Polar Cone + Rotation)* (`jetThrusterConfig` — narrow polar cone on an orbiting emitter with `Auto-Path` exhaust rotation)
  - *Sparks Fountain (Gravity)* (`sparksFountainConfig` — polar upward cone + parabolic gravity arc with `GRAVITY_Y: 550`)
  - *Explosion / Debris (Drag + Gravity)* (`explosionBurstConfig` — 360° polar bursts braked by `VELOCITY_DAMPING: 3.5`)
  - *Campfire / Aura (Circle Emitter)* (`circleCampfireConfig` — `emitterType.circle` disk with rising buoyancy)
  - *Portal / Shockwave (Ring + Radial)* (`portalRingConfig` — `emitterType.ring` annulus with `radialVelocity: true`)
  - *Black Hole (Ring + Inward Radial)* (`blackHoleConfig` — `emitterType.ring` with negative speed `-155..-85` imploding inward)
  - *Shield Aura (Local Space)* (`localAuraConfig` — `simulationSpace: "local"` ring)
  - *Healing Aura (Circle + Rect)* (`healingAuraConfig` — rising emerald-to-gold `"rect"` particles)
  - *Flame Barrier (Line Emitter)* (`firewallLineConfig` — `emitterType.line` segment with draggable endpoints)
  - *Confetti Cannon (Spinning Rects)* (`confettiConfig` — upward polar cone with spinning `"rect"` particles)
  - *Blood / Hit Spatter (High Drag)* (`bloodSpatterConfig` — directional polar spray with `VELOCITY_DAMPING: 4.2`)
  - *Magic Fairy Dust (Mouse Trail)* (`magicSparklesConfig` — shrinking, fast-spinning `"rect"` sparkles)
  - *Tesla Electric Arcs (Line Streaks)* (`electricSparksConfig` — velocity-aligned `"line"` streaks with `VELOCITY_DAMPING: 6.5`)
  - *Rain* (`rainConfig`)
  - *Snow* (`snowConfig`)
- **Playback & Burst Toolbar**:
  - **Emit: ON / OFF** — Toggles `particleSystem.active` to test how trails dissipate when emission stops.
  - **💥 Burst** — Fires `particleSystem.Burst(count)` on demand (`max(10, emitCountPerSpawn)`).
  - **⏸ Pause / ▶ Resume** — Freezes the simulation loop to inspect individual particles.
  - **↻ Reset** — Rebuilds the particle pool and clears all active particles.
- **Emitter Motion Preview Modes (Point, Circle & Ring Emitters)**:
  - **Click / Drag on Canvas (`manual`)** — Click or drag anywhere on the canvas to position the emitter.
  - **Follow Mouse (`mouse`)** — Emitter tracks the cursor inside the canvas.
  - **Circle Path (`circle`)** — Moves the emitter along an orbit with a simulated missile body gizmo ahead of the exhaust point.
  - **Figure-8 Path (`figure8`)** — Moves the emitter along a Lissajous figure-8 curve to test turn banking.
  - **Linear Projectile (`projectile`)** — Flies across the canvas at a slight angle and wraps around.
  - Includes a **Speed** slider (`40–700 px/s`) for the animated path modes.
- **Live Renderer Switcher (`Canvas2D` / `WebGL`)**:
  - Toggle live between `Canvas2DRenderer` and `WebGLRenderer` from the top-left **Renderer** dropdown (or open `particle-system-editor.html?webgl` to boot directly into WebGL mode) without losing your active config or particles.
  - Interactive 2D gizmos render on a dedicated transparent overlay canvas (`#gizmo-canvas`) so they work identically across both backends without inflating WebGL batch draw-call counts.
- **Interactive Canvas Gizmos & Backgrounds**:
  - **Point / Circle / Ring Gizmos**: Crosshair + dashed circle/annulus boundaries (`EMISSION_INNER_RADIUS`..`EMISSION_RADIUS`) + orange direction indicator (vector in `cartesian` mode, shaded angular sector wedge in `polar` mode, or 8 outward radial spokes when `radialVelocity` is enabled) + cyan dashed gravity vector arrow + optional projectile nose cone.
  - **Area & Line Gizmos**: Dashed bounding rectangle (with 4 draggable corner handles) or dashed line segment (with 2 draggable endpoint handles), interior/segment drag-to-move, outside drag-to-draw, plus quick-fit buttons (**Full Canvas**, **Center Box**, **Horiz Line**).
  - **Background Surfaces**: Switch between *Asphalt (`#414146`)*, *Dark Night (`#1a1a2e`)*, *Grass (`#325023`)*, *Dirt (`#785532`)*, *Pure Black (`#000000`)*, *Checkerboard*, or any custom hex color picker.
- **Real-Time Parameter Sliders & Smart Clamping**:
  - Synchronized range sliders and numeric inputs for every `defaultParticleConfig` property (including `renderShape` + `PARTICLE_SIZE`, `startColor`/`endColor` color pickers + quick gradient presets **None**, **Fire**, **Arcane**, **Ice**, `directionMode` toggle between `cartesian` and `polar`, `MIN_ANGLE`/`MAX_ANGLE`, `SetRotation` preview slider + `Auto-Path` rotation toggle, `emitCountPerSpawn`, `GRAVITY_X`, `GRAVITY_Y`, `VELOCITY_DAMPING`, `MIN_MAX_OPACITY`/`MAX_MAX_OPACITY`, `MIN_HOLD_TIME`/`MAX_HOLD_TIME`, and all 14 `MIN_*/MAX_*` pairs).
  - Direction quick-buttons (**Omni**, **↑**, **↓**, **←**, **→** — work for both Cartesian and Polar modes), gravity quick-buttons (**0**, **↓ Grav**, **↑ Buoy**), opacity & hold quick-buttons (**Full 1.0**, **Soft 0.5**, **0s Hold**), and rotation quick-buttons (**0**, **0 → 2π**).
- **Live Telemetry & Export**:
  - Bottom status bar displays active particle count (`Alive / Max` with a `⚠ POOL FULL` warning), estimated **Spawn Rate (`~N/s`)**, estimated **Avg Lifetime (`~Ns`)**, emitter coordinates, mouse coordinates, active **Renderer (`Canvas2D` or `WebGL` with live `Draw calls` count)**, and live **FPS**.
  - **Load JSON** (or drag-and-drop a `.json` file), **Copy JS** (formats a clean `const <name> = { ... };` snippet using `emitterType.*` and `PI2`), **Copy JSON**, and **Export JSON ↓**.

---

## Planned Improvements & Roadmap (TODOs)

This section tracks all completed and planned improvements for the particle system across the engine (`src/engine/particlesystem.js`), renderer (`src/engine/renderer.js`), editor (`particle-system-editor.html`), and examples (`src/examples/particles/particles_example.js`).

### Completed Milestones

- [x] **Fix negative scale sprite inversion bug & `Particle.pivot` reference** ✅ *DONE*
  - *Details*: `Particle.Update` now checks `if (this.scale <= 0.0) { this.Deactivate(); return; }` so shrinking particles (`MIN_SCALE_VELOCITY < 0`) deactivate cleanly instead of flipping upside-down with negative scale. `Particle.Draw` passes the static `Particle.pivot` (`{ x: 0, y: 0 }`) to `renderer.DrawImage`.
- [x] **One-shot bursts (`Burst(count, x, y)`), multi-particle spawn ticks (`emitCountPerSpawn`), and sub-frame catch-up loop** ✅ *DONE*
  - *Details*: Added `ParticleSystem.Burst(count = 1, x, y)` for immediate emission even when `this.active === false`, added `emitCountPerSpawn` to `defaultParticleConfig`, and replaced the single `if (this.nextTimeToSpawnParticle <= 0.0)` check in `Update(deltaTime)` with a `while` catch-up loop so sub-frame spawn intervals (`< 16.6ms`) emit the exact expected number of particles per frame.
- [x] **Gravity / Constant Acceleration (`GRAVITY_X`, `GRAVITY_Y`) & Velocity Damping (`VELOCITY_DAMPING`)** ✅ *DONE*
  - *Details*: Added `GRAVITY_X`, `GRAVITY_Y` (pixels/sec²) and `VELOCITY_DAMPING` (1/sec exponential decay via `Math.exp(-damping * dt)`) to `defaultParticleConfig` and `Particle.Update`, added `fountainConfig` (`G`) and `explosionBurstConfig` (`Click / Space`) to `particles_example.js`, and added sliders, quick-preset buttons, a cyan gravity vector gizmo, and *Sparks Fountain* / *Explosion / Debris* presets to `particle-system-editor.html`.
- [x] **Polar Emission Angles (`MIN_ANGLE`, `MAX_ANGLE`) & `SetRotation(angle)`** ✅ *DONE*
  - *Details*: Added `directionMode: "cartesian" | "polar"`, `MIN_ANGLE`, and `MAX_ANGLE` to `defaultParticleConfig` (auto-selecting `"polar"` when `MIN_ANGLE`/`MAX_ANGLE` are supplied), plus `SetRotation(angle)` and `rotation` getter/setter on `ParticleSystem` (rotating both polar cones and cartesian direction vectors). Added `thrusterConfig` (`H`) to `particles_example.js` and polar cone controls, sector gizmo, `SetRotation` live slider + `Auto-Path` toggle, and *Jet Thruster* preset to `particle-system-editor.html`.
- [x] **Explicit Particle Lifetime / Hold Time (`MIN_MAX_OPACITY`, `MAX_MAX_OPACITY`, `MIN_HOLD_TIME`, `MAX_HOLD_TIME`)** ✅ *DONE*
  - *Details*: Decoupled particle peak opacity and lifetime hold duration from fade speeds by adding `MIN_MAX_OPACITY`, `MAX_MAX_OPACITY` (plus `MAX_OPACITY` shorthand) and `MIN_HOLD_TIME`, `MAX_HOLD_TIME` (plus `HOLD_TIME` shorthand) to `defaultParticleConfig` and `Particle`. Updated `particles_example.js` presets, added sliders and quick-preset buttons to `particle-system-editor.html`, and updated the editor's **Avg Lifetime** telemetry formula to account for peak opacity and hold time.
- [x] **Additional Emitter Shapes (`emitterType.circle`, `emitterType.ring`, `emitterType.line`) & `radialVelocity`** ✅ *DONE*
  - *Details*: Expanded `emitterType` with `circle` (2, uniform disk sampling via `Math.max(Math.random(), Math.random())`), `ring` (3, annulus sampling between `EMISSION_INNER_RADIUS` and `EMISSION_RADIUS`), and `line` (4, linear interpolation along `(AREA_X1, AREA_Y1) -> (AREA_X2, AREA_Y2)`), plus `radialVelocity` for outward/inward radial velocity on `circle`/`ring` emitters (reusing the cached `_lastSpawnAngle` without `Math.atan2`). Added `J` (`circleCampfireConfig`), `K` (`portalRingConfig`), and `L` (`firewallLineConfig`) interactive demos to `particles_example.js`, and added presets, controls, and interactive circle/ring/line gizmos to `particle-system-editor.html`.
- [x] **Color Tinting & Color-over-Lifetime (`startColor`, `endColor`, `tintColor`, `SetColor`)** ✅ *DONE*
  - *Details*: Added optional `tint` (`Color`) support to `DrawImage`, `DrawImageBasic`, `DrawImageSection`, and `DrawImageSectionBasic` on both `Canvas2DRenderer` (via `_getTintedSource` offscreen canvas cache) and `WebGLRenderer` (expanding `SpriteBatchShader` vertex attributes to `vec4 a_color` for hardware-accelerated per-sprite RGB tinting), plus a dedicated 16-step pre-baked color ramp (`ParticleSystem._getCanvasColorFrames`) inside `ParticleSystem` when rendering with `Canvas2DRenderer`. Added `startColor`, `endColor` (and `tintColor` shorthand) to `defaultParticleConfig`, `SetColor(startColor, endColor)` to `ParticleSystem`, and allocation-free RGB interpolation in `Particle.Update(deltaTime)`. Updated `particles_example.js` and `particle-system-editor.html` presets and added live color gradient pickers to the editor.
- [x] **Procedural Particle Shapes (`renderShape: "sprite" | "circle" | "rect" | "line"`, `PARTICLE_SIZE`)** ✅ *DONE*
  - *Details*: Added `particleShape` enum (`sprite`, `circle`, `rect`, `line`), `renderShape: "sprite"`, and `PARTICLE_SIZE: 64` to `defaultParticleConfig` and `Particle`. Procedural shapes render via `renderer.DrawFillCircle` (`"circle"`) and `renderer.DrawFillRectangle` (`"rect"` and velocity-aligned `"line"` streaks), batching automatically in `WebGLRenderer` and requiring no external image asset (`new ParticleSystem(null, config)` defaults to `"circle"`). Added `1`/`2`/`3`/`4` live shape switching to `particles_example.js` and `renderShape` + `PARTICLE_SIZE` controls to `particle-system-editor.html`.
- [x] **`GameObject` & `Pool` Integration (`ParticleSystemGO` / One-Shot Auto-Cleanup)** ✅ *DONE*
  - *Details*: Added `ParticleSystemGO extends GameObject` to `src/engine/particlesystem.js` while keeping `ParticleSystem` standalone and engine-agnostic. Added `autoDeactivateWhenEmpty`, `destroyWhenEmpty`, `Play(x, y)`, `PlayBurst(count, x, y, autoDeactivate)`, `Stop(autoDeactivate)`, `Reset()`, and shared `Vector2` position/rotation binding. Updated `particles_example.js` to use a `Pool` of `ParticleSystemGO` instances for click/space explosions.
- [x] **Velocity-Aligned Particle Rotation (`alignToVelocity`)** ✅ *DONE*
  - *Details*: Added `alignToVelocity: false` to `defaultParticleConfig` and `Particle`. When enabled, `Particle.Activate` and `Particle.Update` set `this.rotation = Math.atan2(this.direction.y, this.direction.x) + this.initialRotation` across all render shapes (`"sprite"`, `"rect"`, `"line"`), and removed the hardcoded `Math.atan2` from the `"line"` branch in `Particle.Draw`. Enabled `alignToVelocity: true` on `fountainConfig` and `rainConfig`, and added an `alignToVelocity` toggle + `-π/2` offset quick-button to `particle-system-editor.html`.
- [x] **Sprite Sheet / `SpriteAtlas` Frame Support (`frames`, `sheetColumns`, `sheetRows`, `sheetFrameCount`, `frameMode`, `SetFrames`)** ✅ *DONE*
  - *Details*: Added `frames`, `sheetColumns`, `sheetRows`, `sheetFrameCount`, and `frameMode` (`"random"` | `"animate"`) to `defaultParticleConfig`, `ParticleSystem.ResolveFrames()`, and `SetFrames()` on both `ParticleSystem` and `ParticleSystemGO`. Supports uniform grids, `{ x, y, w, h }[]`, `SpriteAtlas` instances, or raw atlas JSON, and works with both `Canvas2DRenderer` (cropping from pre-baked `colorFrames` when tinted) and `WebGLRenderer`. Added `Z` (`spriteSheetSmokeConfig` using `smoke2.png` 4×4) + `X` (`frameMode` toggle) to `particles_example.js`, and Sprite Sheet Frames controls + *Sprite-Sheet Smoke (smoke2.png 4×4)* preset to `particle-system-editor.html`.
- [x] **Thin Particle Model & Precomputed Per-Frame System Physics ("Thin Particle, Fat System")** ✅ *DONE*
  - *Details*: Streamlined `Particle` to store only its own mutable per-instance state (`position`, `direction`, `opacity`, `scale`, `rotation`, `age`, `invLifetime`, `lifeProgress`, `tint`, `frame`). Shared system-wide properties (`renderShape`, `PARTICLE_SIZE`, `alignToVelocity`, `frames`, `animateFrames`, color bounds) are kept in `ParticleSystem` and accessed directly via the passed `system` reference with zero per-particle/per-frame fallback checks. Physics steps (`gdx = GRAVITY_X * dt`, `gdy = GRAVITY_Y * dt`, `drag = Math.exp(-damping * dt)`) are calculated **once per frame** in `ParticleSystem.Update(dt)` instead of per particle. Replaced `.filter(p => p.active).length` with an allocation-free counting loop in `activeCount`.
- [x] **Zero-Allocation Particle Spawning (`GetSpawnPoint(out)`, `GetInitialVelocity(out)`, in-place `Burst` / `Activate`)** ✅ *DONE*
  - *Details*: Updated `ParticleEmitter.GetSpawnPoint(out = Vector2.Zero())` and `ParticleEmitter.GetInitialVelocity(out = Vector2.Zero())` to write coordinates directly into the caller-supplied `Vector2` (`particle.position` / `particle.direction`), removed the `new Vector2(x, y)` allocation in `Burst(count, x, y)`, and mutated particle `Vector2` fields in-place inside `_spawnSingleParticle` and `Particle.Activate` for zero per-spawn heap allocations.
- [x] **$O(1)$ Incremental `activeCount` Tracking & Idle Early-Out** ✅ *DONE*
  - *Details*: Added `this._activeCount = 0` on `ParticleSystem`, incremented on `Particle.Activate` and decremented on `Particle.Deactivate` (and zeroed in `Reset()`). `get activeCount()` now returns `this._activeCount` in $O(1)$ time, `ParticleSystem.Update` / `Draw` skip scanning idle pools when `_activeCount === 0`, and `particle_system_editor.js` cleanly deactivates truncated particles when shrinking `maxParticleCount`.
- [x] **Prewarm Simulation (`Prewarm(duration, fixedStep)` / `prewarm`, `prewarmTime`, `prewarmStep`)** ✅ *DONE*
  - *Details*: Added `prewarm: false`, `prewarmTime: 2.0`, and `prewarmStep: 0.05` to `defaultParticleConfig`, plus `Prewarm(duration, fixedStep)` on `ParticleSystem` and `ParticleSystemGO`. Automatically runs fixed-step updates during construction when `prewarm: true` (or `prewarmTime > 0`) so ambient effects start in steady state on frame 1. Enabled on `smokeAreaConfig`, `rainConfig`, and `snowConfig` in `particles_example.js`.

---

### Phase 1 — Core Physics, Direction & Lifecycle (Repository TODOs)

#### 1. ~~Gravity / Constant Acceleration & Velocity Damping (Air Drag)~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Config Keys**: `GRAVITY_X: 0`, `GRAVITY_Y: 0`, `VELOCITY_DAMPING: 0`.

#### 2. ~~Polar Emission Angles (`MIN_ANGLE`, `MAX_ANGLE`) & `SetRotation(angle)`~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Config Keys & API**: `directionMode: "cartesian" | "polar"`, `MIN_ANGLE: 0`, `MAX_ANGLE: PI2`, `particleSystem.SetRotation(angle)` / `particleSystem.rotation`.

#### 3. ~~Explicit Particle Lifetime / Hold Time (`HOLD_TIME`, `MAX_OPACITY`)~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Config Keys**: `MIN_MAX_OPACITY: 1.0`, `MAX_MAX_OPACITY: 1.0` (or shorthand `MAX_OPACITY`), `MIN_HOLD_TIME: 0.0`, `MAX_HOLD_TIME: 0.0` (or shorthand `HOLD_TIME`).

#### 4. ~~Additional Emitter Shapes (`circle`, `ring`, `line`)~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Enum & Config Keys**: `emitterType.circle` (`2`), `emitterType.ring` (`3`), `emitterType.line` (`4`), `EMISSION_RADIUS: 50`, `EMISSION_INNER_RADIUS: 0`, `radialVelocity: false`.

#### 5. ~~Color Tinting / Color-over-Lifetime & Procedural Particle Shapes (`startColor`, `endColor`, `renderShape`, `PARTICLE_SIZE`)~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Enum, Config Keys & API**: `particleShape` (`"sprite"`, `"circle"`, `"rect"`, `"line"`), `renderShape: "sprite"`, `PARTICLE_SIZE: 64`, `startColor: null`, `endColor: null`, `tintColor: null`, `particleSystem.SetColor(startColor, endColor)`.

---

### Phase 2 — Engine & Gameplay Integration Enhancements

#### 6. ~~`GameObject` & `Pool` Integration (`ParticleSystemGO` / One-Shot Auto-Cleanup)~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Class, Config Keys & API**: `ParticleSystemGO extends GameObject`, `autoDeactivateWhenEmpty: false`, `destroyWhenEmpty: false`, `Play(x, y)`, `PlayBurst(count, x, y, autoDeactivate)`, `Stop(autoDeactivate)`, `Reset()`, `emitting`.

#### 7. Sub-Frame Trail Interpolation for Fast-Moving Emitters
- **Status**: `[ ] Pending`
- **Motivation**: When a fast-moving emitter (e.g. a missile moving at `600 px/s` or a mouse cursor flicked quickly across the screen) calls `SetPosition(x, y)` once per frame and spawns multiple particles during `Update(deltaTime)`, all particles spawned during that frame originate at the exact new `(x, y)` position. This causes visible "beading" or clumping at 60Hz intervals instead of a continuous ribbon.
- **Proposed Solution**:
  - Track `_prevPosition` inside `ParticleEmitter` / `ParticleSystem`.
  - When `SetPosition(x, y)` is called and multiple particles are spawned across sub-frame steps in `Update(deltaTime)`, linearly interpolate (`Vector2.Lerp`) the spawn origin between `_prevPosition` and `position` based on each sub-step's fractional timestamp within `deltaTime`, then update `_prevPosition` at the end of `Update()`.

#### 8. ~~Velocity-Aligned Particle Rotation (`alignToVelocity`)~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Config Key**: `alignToVelocity: false` (uses `MIN_INITIAL_ROTATION` / `MAX_INITIAL_ROTATION` as the angular offset added to `Math.atan2(direction.y, direction.x)`).

#### 9. ~~Sprite Sheet / `SpriteAtlas` Frame Support~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Config Keys & API**: `frames: null`, `sheetColumns: 1`, `sheetRows: 1`, `sheetFrameCount: 0`, `frameMode: "random" | "animate"`, `particleSystem.SetFrames(framesOrColumns, rows, frameMode, frameCount)`, `ParticleSystem.ResolveFrames(img, config)`.

#### 10. ~~Local vs. World Simulation Space (`simulationSpace`)~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Config Key**: `simulationSpace: "world"` (`"world"` | `"local"`).
- **Solution**: When `simulationSpace === "local"`, `ParticleSystem.Update(deltaTime)` tracks per-frame emitter position/rotation deltas (`dx`, `dy`, `dr`) and translates/rotates existing active particles (positions, velocities, and rotations) rigidly with the emitter before spawning new particles. Works seamlessly with `Canvas2DRenderer`, `WebGLRenderer`, `ApplyCameraTransform`, and `ParticleSystemGO`. Added `C` (`localAuraConfig`) to `particles_example.js` and the `simulationSpace` selector + *Shield Aura (Local Space)* preset to `particle-system-editor.html`.

#### 11. ~~Prewarm Simulation (`Prewarm(seconds, step)` / `prewarm: true`)~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **API & Config Keys**: `prewarm: false`, `prewarmTime: 2.0`, `prewarmStep: 0.05`, and `particleSystem.Prewarm(duration, fixedStep)` (also exposed on `ParticleSystemGO`). Runs fixed-step `Update(step)` loops during initialization when `prewarm: true` (or `prewarmTime > 0`), and is enabled on `smokeAreaConfig`, `rainConfig`, and `snowConfig` in `particles_example.js`.

---

### Phase 3 — Performance & Zero-Allocation Optimizations

#### 12. ~~Eliminate Per-Spawn `Vector2` Heap Allocations~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **API & Solution**: `ParticleEmitter.GetSpawnPoint(out = Vector2.Zero())` and `ParticleEmitter.GetInitialVelocity(out = Vector2.Zero())` write directly into the target particle's existing `particle.position` and `particle.direction` via `.Set(x, y)` in-place (preserving optional allocation only if `out` is omitted by external callers). `Burst(count, x, y)` and `_spawnSingleParticle(overrideX, overrideY)` pass numeric coordinates directly without creating a temporary `Vector2`, achieving **0 heap allocations per spawn**.

#### 13. ~~$O(1)$ Incremental `activeCount` Tracking~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Solution**: Added `this._activeCount = 0` on `ParticleSystem`, maintained incrementally in `Particle.Activate()`, `Particle.Deactivate()`, `ParticleSystem.Reset()`, and `particle_system_editor.js` pool truncation. `get activeCount()` is now an $O(1)$ property read, and `ParticleSystem.Update` / `Draw` early-return when `_activeCount === 0`.

#### 14. ~~$O(1)$ Swap-and-Pop Compact Pool~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Solution**: Replaced the $O(N)$ pool scan and full-array `Update`/`Draw`/`Reset` loops with a contiguous **Swap-and-Pop** active partition (`this.particles[0 .. _activeCount - 1]` are always active, `[_activeCount .. length - 1]` are always inactive).
  - `_spawnSingleParticle` grabs `this.particles[this._activeCount]` in $O(1)$ with zero loops.
  - `Particle.Update` returns `boolean` (`true` if alive, `false` if deactivated); `ParticleSystem.Update` swaps dead particles with the last active element and decrements `_activeCount` without advancing the loop index.
  - `ParticleSystem.Draw` and `ParticleSystem.Reset` iterate only `0 .. _activeCount - 1` with no `if (particle.active)` branch.

---

### Phase 4 — Renderer, Documentation & Editor Polish

#### 15. ~~WebGL Blend Mode Support (`SetBlendMode` / Additive Particles in WebGL)~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Solution**: Added polymorphic `SetBlendMode(mode)` and `GetBlendMode()` across `Renderer`, `Canvas2DRenderer`, and `WebGLRenderer`, plus `Renderer.NormalizeBlendMode(mode)`.
  - In `Canvas2DRenderer`, `SetBlendMode` updates `this.ctx.globalCompositeOperation`.
  - In `WebGLRenderer`, `SetBlendMode` flushes all pending batches (`FlushAllBatches()`) on transition, then switches `gl.blendFunc`:
    - `"lighter"` (or `"add"`): `gl.blendFunc(gl.ONE, gl.ONE)` (additive blending matching premultiplied shader output).
    - `"screen"`: `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR)`.
    - `"multiply"`: `gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA)`.
    - `"copy"`: `gl.blendFunc(gl.ONE, gl.ZERO)`.
    - `"source-over"` (or `"normal"`): `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)`.
    - Unsupported Canvas2D modes (e.g. `"overlay"`, `"color-dodge"`, etc.) gracefully fall back to `"source-over"` with a one-time console warning, avoiding redundant batch flushes and internal state drift.
  - In `ParticleSystem.Draw(renderer)`, replaced `renderer.ctx.globalCompositeOperation` assignments with `renderer.SetBlendMode(targetBlend)` and restored `prevBlend` after drawing, enabling additive fire, sparks, lasers, and explosions under WebGL.

#### 16. ~~Camera Transform & `relativeArea` Viewport Following~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Solution**:
  - **Camera Transforms**: Verified that `ParticleSystem.Draw(renderer)` works seamlessly between `renderer.ApplyCameraTransform(camera)` and `renderer.RestoreCameraTransform()` on both `Canvas2DRenderer` (Canvas 2D transform stack) and `WebGLRenderer` (`viewMatrix` uniform in all batch shaders, preserved across `SetBlendMode()`).
  - **`relativeArea: false`**: Added `relativeArea` to `defaultParticleConfig`. When `true` on `emitterType.area` or `emitterType.line`, `AREA_X1..AREA_Y2` are treated as offsets relative to `emitter.position` (both in `ParticleEmitter.GetSpawnPoint` and `Burst(count, x, y)`), allowing rain/snow emitters to follow a scrolling camera via `SetPosition(camera.x, camera.y)`. Enabled on `rainConfig` and `snowConfig` in `particles_example.js`, and added the `relativeArea` checkbox, gizmo offset/anchor crosshair, and motion-following support in `particle-system-editor.html` / `particle_system_editor.js`.

#### 17. ~~Sync `README.md` Quick-Start Snippet~~ ✅ *DONE*
- **Status**: `[x] Completed`
- **Solution**: Updated the `ParticleSystem` quick-start snippet in `README.md` to read `this.graphicAssets.smoke.img`, use `SetPosition(400, 320)` instead of `SetPointPosition`, remove the non-existent `Start()` call, and pass `this.renderer` to `Draw(this.renderer)` instead of `this.renderer.ctx`.

---

## Live Demo & Tools

- **Interactive Editor:** [Particle System Editor](../particle-system-editor.html ':ignore :target=_blank') (`src/examples/particle_system_editor/`)
- **Live Example:** [Particle System Showcase](../particles.html ':ignore :target=_blank') (`src/examples/particles/particles_showcase.js`, with HTML+CSS overlay in `particles_menu.js` / `particles_ui.css`) — showcases 6 multi-emitter scenes and 18 single-emitter presets.
