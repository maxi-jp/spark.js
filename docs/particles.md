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

- **Activation (`Particle.Activate`)**:
  - When spawned, a particle starts at `opacity = 0` with `active = true` and `appearing = true`.
  - Its initial position, fade-in speed (`opacityIncrementVelocity`), peak opacity target (`maxOpacity`), hold duration (`holdTime`), fade-out speed (`opacityDecrementVelocity`), initial scale, scale velocity, initial rotation, rotation velocity, and velocity vector (`direction`) are randomized within the `[MIN_*, MAX_*]` ranges defined in the config.
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

    globalCompositeOperation: "source-over",  // Canvas 2D blending mode ("source-over", "lighter", "overlay", etc.)

    // Visual particle shape: "sprite" | "circle" | "rect" | "line" (defaults to "circle" if img is null)
    renderShape: "sprite",

    // Base size in pixels for procedural shapes ("circle", "rect", "line") at scale = 1.0
    PARTICLE_SIZE: 64,

    // Color tinting / Color-over-Lifetime (hex string "#rrggbb", Color instance, or null for untinted)
    // Also supports shorthand tintColor: "#rrggbb" for a flat tint across the entire particle lifetime
    startColor: null,
    endColor: null,

    emitterType: emitterType.area,            // point (0), area (1), circle (2), ring (3), or line (4)

    // Area / Line emitter bounds in pixels (used when emitterType === area or emitterType === line)
    AREA_X1: 0,   AREA_Y1: 0,
    AREA_X2: 800, AREA_Y2: 640,

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

    // Initial rotation range (radians)
    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,

    // Angular velocity range (radians / sec)
    MIN_ROTATION_VELOCITY: 0.05,
    MAX_ROTATION_VELOCITY: 0.15,

    // Time between spawn ticks (seconds)
    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.05,

    // Number of particles spawned on each timer tick
    emitCountPerSpawn: 1,

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
| `Burst(count = 1, x, y)` | `number` | Immediately activates up to `count` particles from the pool and returns the number actually spawned. Works even when `this.active === false`. Optional `(x, y)` overrides the emitter's spawn point for that burst. Logs a `console.warn` if the pool is exhausted. |
| `Reset()` | `void` | Immediately deactivates all alive particles and resets the spawn countdown. |
| `Update(deltaTime)` | `void` | If `this.active` is `true`, advances the spawn timer and emits particles; then updates all currently active particles. Call once per frame in `Update(deltaTime)`. |
| `Draw(renderer)` | `void` | Applies `config.globalCompositeOperation` (on `Canvas2DRenderer`), draws all active particles, and restores `"source-over"`. Call once per frame in `Draw()`. |

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

### 3. Interactive Demo (`src/examples/particles/particles_example.js`)

The included demo project ([`particles_example.js`](../src/examples/particles/particles_example.js ':ignore')) demonstrates switching between preset configurations at runtime using keyboard keys:

- **`A` — Area Smoke (`smokeAreaConfig`)**: Uses `defaultParticleConfig` (`emitterType.area` across `0..800 × 0..640`) to fill the screen with drifting smoke clouds.
- **`S` — Mouse-Following Smoke (`smokePointConfig`)**: Uses `emitterType.point` with `globalCompositeOperation: "overlay"`, thermal upward buoyancy (`GRAVITY_Y: -35`), gentle air drag (`VELOCITY_DAMPING: 0.4`), and soft peak opacity (`0.35–0.65`), updating `SetPosition(Input.mouse.x, Input.mouse.y)` every frame.
- **`D` — Rain (`rainConfig`)**: Uses `emitterType.line` spawning along a line segment above the top of the screen (`AREA_X1: -200, AREA_Y1: -100, AREA_X2: 700, AREA_Y2: -100`), high downward speed (`400–800 px/s`), slight wind slant (`MIN_DIRECTION_X: 0.15, MAX_DIRECTION_X: 0.25, MIN_DIRECTION_Y: 1, MAX_DIRECTION_Y: 1`), zero scale growth, and fast spawn interval (`0.001–0.002s` with `maxParticleCount: 1000`).
- **`F` — Snow (`snowConfig`)**: Spawns above the canvas (`AREA_Y1: -100, AREA_Y2: -100`), gentle downward speed (`30–60 px/s`), horizontal flutter (`MIN_DIRECTION_X: -0.25, MAX_DIRECTION_X: 0.25`), slow fade-in/out, and continuous rotation (`0.1–0.5 rad/s`).
- **`G` — Sparks Fountain (`fountainConfig`)**: Point emitter following the mouse that launches procedural velocity-aligned spark streaks (`renderShape: "line", PARTICLE_SIZE: 80`) upward in a polar cone (`directionMode: "polar", MIN_ANGLE: -Math.PI * 0.65, MAX_ANGLE: -Math.PI * 0.35`) and pulls them down in a parabolic arc using `GRAVITY_Y: 550` and `VELOCITY_DAMPING: 0.2`.
- **`H` — Rotating Thruster / Flamethrower (`thrusterConfig`)**: Narrow directional polar cone (`MIN_ANGLE: -0.22, MAX_ANGLE: 0.22`) at the screen center that rotates every frame via `SetRotation(angleToMouse)` to aim a stream of fire toward the mouse cursor.
- **`J` — Campfire / Fire Aura (`circleCampfireConfig`)**: Uses `emitterType.circle` (`EMISSION_RADIUS: 60`) following the mouse cursor with uniform disk sampling (`r = R * Math.max(Math.random(), Math.random())`) and upward thermal buoyancy (`GRAVITY_Y: -90`).
- **`K` — Portal Ring / Shockwave (`portalRingConfig`)**: Uses `emitterType.ring` (`EMISSION_INNER_RADIUS: 75, EMISSION_RADIUS: 90`) following the mouse cursor with `radialVelocity: true` so particles expand radially outward from the ring perimeter and decelerate under `VELOCITY_DAMPING: 2.2`.
- **`L` — Flame Barrier (`firewallLineConfig`)**: Uses `emitterType.line` anchored at `(150, 480)` with its second endpoint `(AREA_X2, AREA_Y2)` tracking the mouse cursor in real time, spawning a rising wall of fire along the segment.
- **`1 / 2 / 3 / 4` — Live Particle Shape Switch (`renderShape`)**: Switches the active emitter and burst emitter live between `"sprite"` (`1`), `"circle"` (`2`), `"rect"` (`3`), and `"line"` (`4`).
- **`Click / Space` — Explosion Burst (`explosionBurstConfig`)**: Fires a 55-particle one-shot `Burst()` at the cursor using a uniform 360° polar distribution (`MIN_ANGLE: 0, MAX_ANGLE: PI2`) and high initial speed (`180–520 px/s`) that rapidly decelerates mid-air via `VELOCITY_DAMPING: 3.5` while drifting downward under `GRAVITY_Y: 160`.

---

## Particle System Editor

The standalone **[Particle System Editor](../particle-system-editor.html ':ignore :target=_blank')** (`particle-system-editor.html`, implemented in `src/examples/particle_system_editor/particle_system_editor.js`) runs the actual engine `Canvas2DRenderer` and `ParticleSystem` so visual previews match in-game rendering 1:1.

### Editor Capabilities

- **Particle Textures (Built-in & Custom)**:
  - Switch between 4 built-in sample assets (`smoke.png`, `smoke2.png`, `snow.png`, `waterdrop.png`) and a procedural radial-gradient fallback (`Built-in: Soft Circle`).
  - Load any custom image via the **Load Image** button, by clicking the sprite thumbnail preview, or by dragging and dropping an image file anywhere onto the window.
- **12 Built-in Presets**:
  - *Missile Smoke (Death Rally)* (`missileSmokeConfig`)
  - *Default (Area Smoke)* (`smokeAreaConfig`)
  - *Point Smoke* (`smokePointConfig`)
  - *Fire / Exhaust* (`fireExhaustConfig` — additive `"lighter"` blending with upward thermal buoyancy `GRAVITY_Y: -60`)
  - *Jet Thruster (Polar Cone + Rotation)* (`jetThrusterConfig` — narrow polar cone on an orbiting emitter with `Auto-Path` exhaust rotation)
  - *Sparks Fountain (Gravity)* (`sparksFountainConfig` — polar upward cone + parabolic gravity arc with `GRAVITY_Y: 550`)
  - *Explosion / Debris (Drag + Gravity)* (`explosionBurstConfig` — 360° polar bursts braked by `VELOCITY_DAMPING: 3.5`)
  - *Campfire / Aura (Circle Emitter)* (`circleCampfireConfig` — `emitterType.circle` disk with rising buoyancy)
  - *Portal / Shockwave (Ring + Radial)* (`portalRingConfig` — `emitterType.ring` annulus with `radialVelocity: true`)
  - *Flame Barrier (Line Emitter)* (`firewallLineConfig` — `emitterType.line` segment with draggable endpoints)
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

#### 8. Velocity-Aligned Particle Rotation (`alignToVelocity`)
- **Status**: `[ ] Pending`
- **Motivation**: Directional particles like rain streaks, sparks, arrows, or shrapnel should point in the direction they are currently moving—especially once gravity (`GRAVITY_Y`) curves their trajectory along a parabolic arc.
- **Proposed Config Key**:
  - `alignToVelocity: false` (when `true`, sets `particle.rotation = Math.atan2(particle.direction.y, particle.direction.x) + config.rotationOffset` each frame instead of integrating `rotationVelocity`).

#### 9. Sprite Sheet / `SpriteAtlas` Frame Support
- **Status**: `[ ] Pending`
- **Motivation**: Using a single static image per `ParticleSystem` means every debris chunk or leaf looks identical, and flipbook animations (like animated fire/explosion sheets) aren't supported.
- **Proposed Config Keys**:
  - Support passing an array of crop rects (`frames: [{ x, y, w, h }, ...]`) or a `SpriteAtlas` to `ParticleSystem`.
  - Two frame modes:
    - `"random"`: Each particle picks a random sprite frame from the sheet upon `Activate()` (great for varied rock debris, foliage, shell casings, orgore/sparks).
    - `"animate"`: Each particle steps through the frames over its lifetime from `0` to `frames.length - 1`.

#### 10. Local vs. World Simulation Space (`simulationSpace`)
- **Status**: `[ ] Pending`
- **Motivation**: Currently all particles are simulated in `"world"` space—once spawned, they stay behind in the world when the emitter moves (ideal for smoke trails). However, effects like a character aura, shield glow, or torch flame attached to a moving platform often need `"local"` space, where particles move together with the emitter's position/rotation.
- **Proposed Config Key**:
  - `simulationSpace: "world"` (`"world"` | `"local"`).

#### 11. Prewarm Simulation (`Prewarm(seconds, step)` / `prewarm: true`)
- **Status**: `[ ] Pending`
- **Motivation**: For ambient environmental effects like `rainConfig`, `snowConfig`, or `smokeAreaConfig`, starting the scene (or switching modes in `particles_example.js`) begins with a blank screen while the first wave of particles slowly falls from the top.
- **Proposed API & Config Key**:
  - `prewarm: false` (or `prewarmTime: 0` in config) and method `particleSystem.Prewarm(duration = 2.0, fixedStep = 0.05)`: runs `Update(fixedStep)` in a fast loop during initialization so ambient weather/smoke is already in steady state on frame 1.

---

### Phase 3 — Performance & Zero-Allocation Optimizations

#### 12. Eliminate Per-Spawn `Vector2` Heap Allocations
- **Status**: `[ ] Pending`
- **Motivation**: Although `Particle` instances are pooled, spawning a single particle currently allocates **2 to 3 new `Vector2` objects** on the heap:
  1. `ParticleEmitter.GetSpawnPoint()` allocates `Vector2.Copy(this.position)` or `new Vector2(x, y)`.
  2. `ParticleEmitter.GetInitialVelocity()` allocates `new Vector2(...)`.
  3. `Particle.Activate()` calls `this.position = Vector2.Copy(initialPosition)`.
  - At high spawn rates (e.g. `1,000` particles/sec in `rainConfig`), this creates `~3,000` short-lived objects per second, triggering avoidable garbage collection pauses.
- **Proposed Solution**:
  - Change `ParticleEmitter` helpers to write directly into the target particle's existing `Vector2` fields (`this.emitter.WriteSpawnPoint(particle.position)` and `this.emitter.WriteInitialVelocity(particle.direction)`), and update `Particle.Activate` to mutate `this.position.Set(x, y)` and `this.direction.Set(vx, vy)` in-place. Zero objects allocated per spawn!

#### 13. $O(1)$ Incremental `activeCount` Tracking
- **Status**: `[ ] Pending`
- **Motivation**: `get activeCount()` currently executes `this.particles.filter(p => p.active).length`. Because `Array.prototype.filter` allocates a new array and scans all `maxParticleCount` elements every time it is read (such as every frame in the HUD of `particles_example.js` and `particle-system-editor.html`), it adds unnecessary per-frame work and GC churn.
- **Proposed Solution**:
  - Maintain an integer `this._activeCount = 0` on `ParticleSystem`, incremented when a particle is activated and decremented when a particle deactivates. `get activeCount()` becomes an $O(1)$ property read with zero allocations.

#### 14. $O(1)$ Ring-Cursor / Free-List Pool Lookup
- **Status**: `[ ] Pending`
- **Motivation**: `_spawnSingleParticle` currently scans `this.particles` from index `0` on every spawn (`for (let i = 0; i < this.particles.length; i++)`). When 900 out of 1,000 particles are active, spawning a burst of 50 particles performs up to `45,000` iterations.
- **Proposed Solution**:
  - Maintain a `this._searchCursor = 0` index that wraps around `this.particles.length` (or an explicit free-list stack of inactive indices), reducing average particle lookup time from $O(N)$ to $O(1)$.

---

### Phase 4 — Renderer, Documentation & Editor Polish

#### 15. WebGL Blend Mode Support (`SetBlendMode` / Additive Particles in WebGL)
- **Status**: `[ ] Pending`
- **Motivation**: `ParticleSystem.Draw` currently applies `renderer.ctx.globalCompositeOperation = this.config.globalCompositeOperation`, which only affects `Canvas2DRenderer`. When running with `?webgl` (`WebGLRenderer`), additive particle effects (`"lighter"`, `"screen"`) render with standard alpha blending.
- **Proposed Solution**:
  - Add a `SetBlendMode(mode)` method on `Renderer` (`Canvas2DRenderer` sets `ctx.globalCompositeOperation`; `WebGLRenderer` flushes the current batch and switches `gl.blendFunc` between `gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA` for `"source-over"` and `gl.SRC_ALPHA, gl.ONE` for `"lighter"` / `"screen"`).

#### 16. Camera Transform & Culling Awareness
- **Status**: `[ ] Pending`
- **Motivation**: Verify and document how `ParticleSystem` interacts with `renderer.ApplyCameraTransform(camera)` in scrolling worlds (such as *Run & Gun* or *Death Rally*), and optionally allow an area emitter's bounds to be relative to `emitter.position` (`relativeArea: true`) so an area emitter can follow the camera viewport automatically for infinite world rain/snow.

#### 17. Sync `README.md` Quick-Start Snippet
- **Status**: `[ ] Pending`
- **Motivation**: The particle system snippet in `README.md` currently references legacy methods (`SetPointPosition`, `Start()`, `Draw(this.renderer.ctx)`) instead of `SetPosition(x, y)` and `Draw(this.renderer)`.

---

## Live Demo & Tools

- **Interactive Editor:** [Particle System Editor](../particle-system-editor.html ':ignore :target=_blank') (`src/examples/particle_system_editor/`)
- **Live Example:** [Particle System Demo](../particles.html ':ignore :target=_blank') (`src/examples/particles/particles_example.js`) — showcases smoke (area and point emitters), rain, and snow presets.
