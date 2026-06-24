# ⚡ spark.js - HTML5 Game Engine

A modular, object-oriented HTML5 game engine for web browsers, built with vanilla JavaScript and the HTML5 Canvas API. Originally created for a university course on web game development.

Engine's landing page, examples and documentation presents on this project are active on github pages: https://maxi-jp.github.io/spark.js/

Documentation can be consulted [here](https://maxi-jp.github.io/spark.js/docs/).

## Features

- **Modular Core**: A clean, object-oriented core that's easy to extend.
- **Rendering Engine**: 2D rendering via HTML5 Canvas with an architecture that supports other renderers (like WebGL).
- **Game Loop**: A classic, built-in main loop with fixed update and variable draw phases.
- **Sprite & Animation**: Full support for static sprites, sprite sheets, and complex animations.
- **Sprite & Animation Support**: Render static sprites, sprite sections, and both basic and complex sprite sheet animations.
- **Physics Integration**: Box2D physics support with easy-to-use Box2DGameObject classes for rectangles, sprites, and animated objects.
- **Input Handling**: A powerful, abstract input system that maps actions (e.g., "Jump") and axes (e.g., "MoveHorizontal") to keyboard, mouse, gamepad, and **touch / virtual controls** (on-screen joysticks and buttons for mobile devices).
- **Mobile Support**: Automatic touch input mirroring, viewport injection, and scroll-prevention — enabled with a single `mobileSupport` config flag (auto-detected on touch devices).
- **Audio Manager**: A simple yet powerful system to manage and play audio with optional analyzer support.
- **UI & Menus**: Use standard HTML and CSS for creating game menus and overlays.
- **Background Layers**: Create rich backgrounds with solid colors, gradients, parallax scrolling layers, and tilemaps.
- **Object Pooling**: An efficient pooling system for reusing objects like bullets or particles to improve performance.
- **Particle System**: A configurable particle emitter supporting point and area sources, with per-particle control over velocity, direction, opacity, scale, and rotation. Based on [HTML5_ParticleSystem](https://github.com/maxi-jp/HTML5_ParticleSystem).
- **Utilities**: A collection of helpers for vector math, collision detection, color manipulation, and more.
- **Debugging Tools**: Optional debug drawing for physics bodies and an FPS/stats overlay.
- **Mode 7 Renderer**: Simulate SNES-style pseudo-3D backgrounds (as in F-Zero or Mario Kart).

## Directory Structure
- engine/
  - renderer.js           # Graphic renderers (support for 2d context and WebGL)
  - main.js               # Entry point and main loop
  - game.js               # Core Game class
  - gameobjects.js        # GameObject, SpriteObject, AnimationObject, Tileset, Camera, Pool, Background Layers
  - input.js              # Keyboard, mouse, gamepad, touch, and virtual on-screen controls
  - virtualcontrols.js    # VirtualJoystick and VirtualButton class definitions
  - utils_classes.js      # Canvas drawing helpers
  - utils_math.js         # Math, vector, and collision utilities
  - audioplayer.js        # Audio system
  - htmlmenu.js           # HTML-based menu system
  - box2d_game.js         # Box2D game base class 
  - box2d_gameobjects.js  # Box2D-enabled game objects
  - box2d_helper.js       # Box2D utility functions
  - particlesystem.js     # Particle system (Particle, ParticleEmitter, ParticleSystem classes)
- examples/
  - audio_test/           # Audio system testing and examples
  - box2d/                # Box2D physics examples
    - box2d_basic.js      # Basic Box2D physics demo
    - box2d_basket.js     # Basketball-style physics game
    - box2d_platormer.js  # Platformer with Box2D physics
    - box2d_watermelon.js # Suika clone (Watermelon game) with Box2D
  - brokeout/             # Breakout clone
  - floppyderp/           # Flappy Bird-like example
  - menu/                 # HTML + CSS menu examples
  - mode7/                # Mode 7 pseudo-3D example
  - pacmon/               # Pac-Man clone (WIP)
  - parallax/             # Parallax scrolling demo
  - particles/            # Particle system demo (smoke, rain, snow effects)
  - tetris/               # Tetris implementations
    - simple_tetris.js    # Basic Tetris game
    - tetris.js           # Complex Tetris with modern features
  - tts/                  # Twin-stick shooter advanced implementation
  - tts_basic/            # Basic Twin-stick shooter game
  - canvas_resizing.js    # Canvas fullscreen and display configuration demo
  - coliders_test.js      # Collision detection testing
  - columns.js            # Columns-style puzzle game
  - gamepad_tester.js     # Interactive gamepad visualiser (buttons, sticks, triggers)
  - input_actions_test.js # Abstract input system example
  - input_test.js         # Basic input system testing
  - mouse_test.js         # Multi-button mouse events, scroll wheel, and click trail demo
  - rumble_test.js        # Gamepad haptic/rumble feedback demo
  - lines_intersection.js # Line intersection algorithms
  - object_pooling.js     # Object pooling performance demo
  - performance_test.js   # Performance benchmarking
  - puzzlebobble.js       # Puzzle Bobble clone
  - render_test.js        # Renderer feature testing
  - snake.js              # Snake game implementation

## Getting Started

1. **Clone or Download** this repository.

2. **Set up your project folder.** Create a new folder for your game. Inside it, create an `engine` folder and copy the contents of the `engine` directory from this repository into it. Your game's own JavaScript files can go in a `js` or `src` folder.

   Your project structure might look like this:
   ```
   my-game/
   ├── engine/
   │   ├── renderer.js
   │   ├── main.js
   │   ├── game.js
   │   └── ... (all other engine files from engine/)
   ├── src/
   │   └── my-game.js
   ├── lib/
   │   └── Box2D.js  (if using physics)
   └── index.html
   ```

3. **Create your `index.html`** and include the engine scripts. The order is important. You can use the following template:
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Awesome Game</title>
    <!-- ... -->
    <script src="engine/renderer.js"></script>
    <script src="engine/main.js"></script>
    <script src="engine/utils_math.js"></script>
    <script src="engine/input.js"></script>
    <script src="engine/audioplayer.js"></script>
    <script src="engine/game.js"></script>
    <script src="engine/utils_classes.js"></script>
    <script src="engine/gameobjects.js"></script>
    <!-- add this to support mobile touch + on-screen virtual controls -->
    <script src="engine/virtualcontrols.js"></script>
    <!-- add this to use particle systems -->
    <script src="engine/particlesystem.js"></script>
    <!-- add these only if you want to use box2d physics -->
    <script src="lib/Box2D.js"></script>
    <script src="engine/box2d_helper.js"></script>
    <script src="engine/box2d_game.js"></script>
    <script src="engine/box2d_gameobjects.js"></script>
    <!-- add here your game scripts -->
    <script src="src/my-game.js"></script>
</head>
<body>
    <canvas width="640" height="480" id="myCanvas"></canvas>    
</body>
</html>
```
4. Create a new script with a new class that inherits from **Game**, add it to the `index.html`, and initialize the game (the constructor must receive the renderer object and should pass it to its parent):
```javascript
class MyGame extends Game {
    constructor(renderer) {
        super(renderer);

        // You can set the screen size (canvas width and height) here
        this.Configure({
            screenWidth: 640,
            screenHeight: 480
        });

        // Declare game objects
    }

    Start() {
        // Yo can also set the screen size dynamically like this:
        this.screenWidth = 640;
        this.screenHeight = 480;

        // Initialize the game objects
    }

    Update(deltaTime) {
        super.Update(deltaTime);  // Update the game objects of this.gameObjects array
    }

    Draw() {
        // Draw a black rectangle that fills the canvas
        this.renderer.DrawFillRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);

        super.Draw(); // Draw the game objects of this.gameObjects array
    }
}

// call Init (global function defined in the main.js script) with the class of your game as parameter once the document has been loaded 
window.onload = () => {
    Init(MyGame);
}
```

5. Create GameObjects by inheriting from the classes in `gameobjects.js`, add them to the `this.gameObjects` array of your game's `Start` method, and run! (See the examples in `src/examples/`.)

## Example: Creating a GameObject

```javascript
class MyRotationBox extends RectangleGO {
    constructor(position) {
        // A 100x100 pixels blue box
        super(position, 100, 100, 'blue');

        this.rotationSpeed = 1;
    }

    Update(deltaTime) {
        this.rotation += this.rotationSpeed * deltaTime;
    }
    
    // The base class handles drawing
}
```

## Example: Using the Particle System

First, include `particlesystem.js` in your HTML after the other engine scripts:
```html
<script src="engine/particlesystem.js"></script>
```

Then create a `ParticleSystem` with a configuration and an image, and call `Update` / `Draw` each frame:

```javascript
class MyGame extends Game {
    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth:  800,
            screenHeight: 640
        });

        this.graphicAssets = {
            smoke: { path: "assets/smoke.png", img: null }
        };

        this.particles = null;
    }

    Start() {
        const config = {
            emitterType: emitterType.point,
            maxParticleCount: 200,
            MIN_INITIAL_VELOCITY: 20,
            MAX_INITIAL_VELOCITY: 80,
            // ... any other overrides
        };

        this.particles = new ParticleSystem(smokeImg, config);
        this.particles.SetPointPosition(400, 320);  // emit from canvas centre
        this.particles.Start();
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        this.particles.Update(deltaTime);
    }

    Draw() {
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);
        super.Draw();
        this.particles.Draw(this.renderer.ctx);
    }
}
```

See `src/examples/particles/particles_example.js` for a full demo with smoke, rain, and snow presets.

> The particle system is based on the standalone [HTML5_ParticleSystem](https://github.com/maxi-jp/HTML5_ParticleSystem) project.

## Example: Using Box2D Physics

### Game that uses Box2D

```javascript
class MyBox2DGame extends Box2DGame {
    constructor(renderer) {
        super(renderer, 100, { x: 0, y: -9.8 }, false); // 1 pixel = 1/100 meter, gravity in m/s^2, allow bodies to sleep
    }

    Start() {
        super.Start(); // create the physics simulated this.physicsWorld

        // create game objects with physics
    }
}
```

### GameObjects with Box2D body for this game

```javascript
class MyPhysicsBox extends Box2DRectangleGO {
    constructor(position, physicsWorld) {
        super(position, physicsWorld, PhysicsObjectType.Box, { width: 1, height: 1, density: 1 }, 1, 1, "green");
    }

    OnContactDetected(other) {
        // Handle collision
    }
}
```

## Best Practices & Tips

### Mobile & Touch
- **Enable mobile support** by passing `mobileSupport: true` in `Configure()`, or leave it unset — it auto-detects touch devices:
  ```javascript
  this.Configure({ screenWidth: 640, screenHeight: 480, mobileSupport: true });
  ```
  This injects the viewport meta tag, disables scroll/select, and calls `Input.SetupTouchEvents()` automatically.
- **Touch mirrors mouse** — the primary finger updates `Input.mouse`, so all existing mouse code works on mobile with no changes.
- **`Input.touch`** exposes raw multi-touch state: `touch.any`, `touch.count`, `touch.down`, `touch.up`, `touch.touches` (Map of active points).
- **Virtual controls** let you place on-screen joysticks and buttons, then bind them via the Actions & Axes system:
  ```javascript
  // In Start() — construct first, then register with Input for binding:
  Input.RegisterAxis('MoveH', [
      { type: 'key', positive: KEY_D, negative: KEY_A },
      { type: 'virtualjoystick', id: 'move', axis: 0 },
  ]);
  Input.RegisterAction('Fire', [
      { type: 'key', code: KEY_SPACE },
      { type: 'virtualbutton', id: 'fire' },
  ]);
  const stick = new VirtualJoystick(90, this.screenHeight - 90, 70);
  Input.RegisterVirtualJoystick('move', stick);

  const btn = new VirtualButton(this.screenWidth - 90, this.screenHeight - 90, 50, '⚡');
  Input.RegisterVirtualButton('fire', btn);

  // In Draw() — always last so controls appear on top:
  VirtualControlls.Draw(this.renderer);
  ```
  Requires `virtualcontrols.js` to be included **after** `input.js` in your HTML.

> See `src/examples/touch/touch_example.js` and `touch.html` for a working mobile demo.

### Coordinate System and Display
- **Always use `this.screenWidth` and `this.screenHeight`** instead of `canvas.width` and `canvas.height` for cross-compatibility with fullscreen modes
- **Mouse coordinates** via `Input.mouse.x` and `Input.mouse.y` are automatically normalized to your game resolution
- **Configure fullscreen behavior** using the game config object:

```javascript
class MyGame extends Game {
    constructor(renderer) {
        super(renderer);
        
        this.Configure({
            screenWidth: 640,              // Game resolution
            screenHeight: 480,
            fillWindow: true,              // Fill entire browser window
            preserveAspectRatio: true,     // Maintain aspect ratio
            matchNativeResolution: false,  // Use window size as resolution
            useDevicePixelRatio: false     // Handle high-DPI displays
        });
    }
}
```

## Third-party credits

- **Box2D physics** — the `src/lib/Box2D.js` file is [box2dweb](https://github.com/hecht-software/box2dweb) by [hecht-software](https://github.com/hecht-software), a JavaScript port of Box2D Flash / Box2D 2.1a.
- **Documentation** — built with [Docsify](https://docsify.js.org/), a lightweight documentation site generator that renders Markdown files on-the-fly with no build step.

## License

MIT License

## TODO list
- [ ] Example for a Tileset.
- [x] ~~Create an action system for the input (i.e. `Input.Action("move_left")` instead of `Input.IsKeyDown(KEY_LEFT) || Input.IsKeyDown(KEY_A) || Input.IsGamepadButtonDown(0, "DPAD_LEFT") || Input.IsGamepadButtonDown(0, "LS_LEFT")`).~~ ✅DONE
- [ ] Improve the webgl renderer (draw batching).
- [ ] Implement other physic engines.
- [x] Create a documentation page/wiki. ✅DONE (see [the documentation page](https://maxi-jp.github.io/spark.js/docs/).)
- [ ] Multiplayer with nodejs.
- [x] ~~Think on a great name for the engine (like **`wat.js`** or something like that).~~ ✅DONE (engine renamed as "spark.js"!!! ✨)
- [x] ~~Add mobile / touch-screen support with virtual on-screen controls.~~ ✅DONE

## Contributing

Contributions are welcome! If you want to help improve HTML5_Engine:

1. **Fork** this repository and create your branch from `main`.
2. **Commit** your changes with clear messages.
3. **Push** your branch and open a **pull request**.
4. For bug reports or feature requests, please [open an issue](https://github.com/maxi-jp/HTML5_Engine/issues).

**Guidelines:**
- Please keep code style consistent with the existing codebase.
- Add comments and documentation where appropriate.
- If you add new features, consider including an example or test.

Thank you for helping make HTML5_Engine better!


---

**Enjoy building games with HTML5_Engine!**
