# Particle System

The particle system (`engine/particlesystem.js`) provides a flexible, image-based particle emitter for visual effects such as smoke, fire, rain, snow, sparks, and more. It is built on an internal object pool so that no garbage is created at runtime once the system is initialised.

> Based on the standalone [HTML5_ParticleSystem](https://github.com/maxi-jp/HTML5_ParticleSystem) project.

> 💡 **Visual Tool:** Use the standalone [Particle System Editor](../particle-system-editor.html ':ignore :target=_blank') to upload a particle image, tweak every config property in real time on a live canvas, and export a ready-to-use JSON configuration.

## Dependencies

`particlesystem.js` requires `utils_math.js` (`Vector2`, `RandomBetweenFloat`, `PI2`). Include it **after** the rest of the engine scripts:

```html
<script src="engine/utils_math.js"></script>
<!-- ... other engine scripts ... -->
<script src="engine/particlesystem.js"></script>
```

---

## Core Concepts

### `emitterType`

A global constant defining how spawn positions are chosen:

```javascript
const emitterType = {
    point: 0,  // all particles spawn at a single world position
    area:  1   // particles spawn at random positions inside a rectangle
};
```

### `defaultParticleConfig`

Every `ParticleSystem` is configured by a plain object merged with `defaultParticleConfig`. Supply only the properties you want to override.

```javascript
const defaultParticleConfig = {
    maxParticleCount: 500,          // size of the internal particle pool

    globalCompositeOperation: "source-over",  // Canvas blending mode

    emitterType: emitterType.area,

    // Area emitter bounds (pixels)
    AREA_X1: 0,   AREA_Y1: 0,
    AREA_X2: 800, AREA_Y2: 640,

    // Particle speed (pixels / sec)
    MIN_INITIAL_VELOCITY: 10,
    MAX_INITIAL_VELOCITY: 60,

    // Normalised direction range [-1, 1]
    MIN_DIRECTION_X: -1, MAX_DIRECTION_X: 1,
    MIN_DIRECTION_Y: -1, MAX_DIRECTION_Y: 1,

    // Opacity fade speed (units / sec)
    MIN_OPACITY_INCREMENT_VELOCITY: 1.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 4.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 0.5,
    MAX_OPACITY_DECREMENT_VELOCITY: 2.0,

    // Initial scale range
    MIN_INITIAL_SCALE: 0.1,
    MAX_INITIAL_SCALE: 0.5,

    // Scale growth speed (units / sec)
    MIN_SCALE_VELOCITY: 0.5,
    MAX_SCALE_VELOCITY: 0.75,

    // Initial rotation range (radians)
    MIN_INITIAL_ROTATION: 0,
    MAX_INITIAL_ROTATION: PI2,

    // Rotation speed (radians / sec)
    MIN_ROTATION_VELOCITY: 0.05,
    MAX_ROTATION_VELOCITY: 0.15,

    // Spawn interval (seconds)
    MIN_TIME_TO_SPAWN_PARTICLE: 0.005,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.05
};
```

---

## API Reference

### `ParticleSystem`

The main class you interact with. Owns the particle pool, the emitter, and the update/draw cycle.

#### `constructor(img, config, position)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `img` | `HTMLImageElement` | Sprite used for every particle |
| `config` | `Object` | Overrides for `defaultParticleConfig`. Missing keys fall back to defaults. |
| `position` | `Vector2` *(optional)* | Initial emitter position for point emitters |

#### Methods

| Method | Description |
|--------|-------------|
| `SetPosition(x, y)` | Move the emitter to a new world-space position. Ideal for point emitters that follow a game object. |
| `Update(deltaTime)` | Spawns new particles and advances all active ones. Call once per frame from `Update`. |
| `Draw(renderer)` | Renders all active particles. Call once per frame from `Draw`. |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `activeCount` *(getter)* | `number` | Number of particles currently alive. Useful for debugging pool exhaustion. |

---

## Basic Usage

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

        this.smoke = new ParticleSystem(this.graphicAssets.smoke.img, {
            emitterType: emitterType.point,
            maxParticleCount: 200,
            globalCompositeOperation: "overlay",
            MIN_INITIAL_VELOCITY: 20,
            MAX_INITIAL_VELOCITY: 80,
            MIN_DIRECTION_Y: -1,
            MAX_DIRECTION_Y: -0.2,   // drift mostly upward
        });

        this.smoke.SetPosition(400, 500);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // Follow the mouse cursor
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

## Rain Preset Example

```javascript
const rainConfig = {
    maxParticleCount: 500,
    emitterType: emitterType.area,

    AREA_X1: 0,   AREA_Y1: -50,
    AREA_X2: 800, AREA_Y2: 0,       // spawn just above the canvas top

    MIN_INITIAL_VELOCITY: 300,
    MAX_INITIAL_VELOCITY: 500,

    MIN_DIRECTION_X: -0.1, MAX_DIRECTION_X: 0.1,
    MIN_DIRECTION_Y:  0.9, MAX_DIRECTION_Y: 1.0,  // fall straight down

    MIN_OPACITY_INCREMENT_VELOCITY: 4.0,
    MAX_OPACITY_INCREMENT_VELOCITY: 8.0,
    MIN_OPACITY_DECREMENT_VELOCITY: 0.3,
    MAX_OPACITY_DECREMENT_VELOCITY: 0.5,

    MIN_INITIAL_SCALE: 0.05, MAX_INITIAL_SCALE: 0.15,
    MIN_SCALE_VELOCITY: 0.0, MAX_SCALE_VELOCITY: 0.0,

    MIN_INITIAL_ROTATION: 0, MAX_INITIAL_ROTATION: 0,
    MIN_ROTATION_VELOCITY: 0.0, MAX_ROTATION_VELOCITY: 0.0,

    MIN_TIME_TO_SPAWN_PARTICLE: 0.001,
    MAX_TIME_TO_SPAWN_PARTICLE: 0.01
};

this.rain = new ParticleSystem(rainImg, rainConfig);
```

## Multiple Systems

Each `ParticleSystem` carries its own pool and configuration. Call `Update` and `Draw` for each one every frame.

```javascript
Update(deltaTime) {
    super.Update(deltaTime);
    this.smoke.Update(deltaTime);
    this.rain.Update(deltaTime);
    this.snow.Update(deltaTime);
}

Draw() {
    this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);
    super.Draw();
    this.rain.Draw(this.renderer);
    this.snow.Draw(this.renderer);
    this.smoke.Draw(this.renderer); // draw smoke on top
}
```

## Particle System Editor

Designing particle effects by hand-editing numbers in code can be tedious. The engine includes a standalone, browser-based **[Particle System Editor](../particle-system-editor.html ':ignore :target=_blank')** (`particle-system-editor.html`) that lets you build and preview effects visually:

- **Custom Particle Textures** — Upload any PNG/JPG/WebP/SVG sprite via file picker or drag-and-drop onto the canvas, or test immediately with 5 built-in procedural textures (*Soft Smoke Puff*, *Glowing Spark*, *Hard Circle*, *Star / Flame*, *Crisp Square*).
- **Real-Time Parameter Tuning** — Paired sliders and numeric inputs for every `defaultParticleConfig` property: pool size (`maxParticleCount`), blend mode (`globalCompositeOperation`), emitter type (`point` vs `area`), spawn interval, initial speed, X/Y direction cones, fade-in/out velocities, initial scale, scale growth, initial rotation, and rotation velocity.
- **Interactive Emitter Testing** — Test how your particle trail behaves in motion using three emitter modes:
  - **Static / Drag** — Drag the emitter handle (or the `AREA_X1,Y1` / `AREA_X2,Y2` bounding box corners in area mode) directly on the canvas.
  - **Follow Mouse** — Emitter tracks the cursor to simulate attached game objects (e.g. a missile smoke trail).
  - **Orbit Path** — Emitter moves automatically along a circular path at configurable speed.
- **Built-in Presets** — Jump-start effects from 6 presets (*Missile Smoke (Death Rally)*, *Fire / Torch*, *Explosion Sparks*, *Rain Storm*, *Gentle Snow*, and *Magic Portal*), then customize further.
- **JSON Import & Export** — Download the config as a `.json` file, copy the raw JSON, or copy a ready-to-paste JavaScript snippet (`const particleConfig = ...; new ParticleSystem(img, particleConfig);`), and re-import existing JSON files at any time.

---

## Live Demo & Tools

- **Interactive Editor:** [Particle System Editor](../particle-system-editor.html ':ignore :target=_blank') (`src/examples/particle_system_editor/`)

See it in action: [Particle System demo](../particles.html ':ignore :target=_blank')

Source: `src/examples/particles/particles_example.js` — showcases smoke (area and point emitters), rain, and snow presets.
