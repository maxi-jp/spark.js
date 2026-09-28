# Core Concepts

## The Game Class

The `Game` class (`engine/game.js`) is the central hub of your game. It owns the game loop (`Start`, `Update` and `Draw` methods), the `gameObjects` array, the collision system, and all asset references. Your game is a single class that extends `Game`.

### Skeleton

```javascript
class MyGame extends Game {
    constructor(renderer) {
        super(renderer);

        // 1. Configure the canvas and engine features
        this.Configure({
            screenWidth: 640,
            screenHeight: 480,
            imageSmoothingEnabled: false,
            drawColliders: false,
        });

        // 2. Declare graphic assets — loaded automatically before Start() is called
        this.graphicAssets = {
            player:     { path: "assets/player.png", img: null },
            background: { path: "assets/bg.png",     img: null },
        };

        // 3. Declare audio assets
        this.audioAssets = {
            jump: { path: "assets/jump.m4a", audio: null },
        };

        // 4. Game flags and Game Object references
        this.score = 0;
        this.player = null;
    }

    Start() {
        super.Start(); // applies config, sets screen size, clears gameObjects/colliders

        // Assets are fully loaded here — safe to use this.graphicAssets.*.img
        this.player = this.AddGameObject(new Player(
            new Vector2(this.screenHalfWidth, this.screenHalfHeight),
            this.graphicAssets.player.img
        ));
    }

    Update(deltaTime) {
        super.Update(deltaTime); // updates all active game objects + runs collision detection

        // Game-level logic: score, state machine, spawning...
    }

    Draw() {
        super.Draw(); // draws all active game objects

        // HUD drawn on top
        this.renderer.DrawText(`Score: ${this.score}`, 8, 8, "16px Arial", Color.red);
    }
}
```

> Always call `super.Start()`, `super.Update(deltaTime)`, and `super.Draw()` — the base implementations drive the entire game object and collision pipeline.

### Asset loading

`graphicAssets` and `audioAssets` are plain objects declared in the constructor. `main.js` reads both, loads every entry, and only calls `Start()` once all assets are resolved.

```javascript
this.graphicAssets = {
    player:  { path: "assets/player.png",  img: null },
    tileset: { path: "assets/tileset.png", img: null },
};

this.audioAssets = {
    bgm:      { path: "assets/music.m4a",  audio: null },
    sfx_jump: { path: "assets/jump.wav",   audio: null },
};
```

After loading, `img` / `audio` are populated and accessible anywhere as `this.graphicAssets.player.img`.

#### Color-key transparency

Some older sprite sheets (especially from retro games) use a solid background colour instead of a proper alpha channel to mark transparent pixels. Add a `bgColor` field to any image asset entry and the engine will automatically zero out every pixel that exactly matches that hex colour before the image is used anywhere:

```javascript
this.graphicAssets = {
    player:  { path: "assets/player.png",  img: null, bgColor: "#FF00FF" },
    tileset: { path: "assets/tileset.png", img: null }, // no bgColor → loaded as-is
};
```

The colour-key pass happens once at load time (the result is cached as an offscreen `<canvas>`), so there is no per-frame cost. The processed image is a drop-in replacement for the raw `Image` — use it exactly the same way with `DrawImage`, `DrawImageSection`, `Sprite`, etc.

> **Tip:** Use an image editor's colour-picker to find the exact hex value used in your sprite sheet. Common chroma-key colours are `#FF00FF` (magenta) and `#00FF00` (green).

### Config reference

Set `this.config` in the constructor. `super.Start()` reads it to configure the renderer.

| Property | Type | Default | Description |
|---|---|---|---|
| `screenWidth` | `number` | `640` | Initial canvas / game resolution width |
| `screenHeight` | `number` | `480` | Initial canvas / game resolution height |
| `imageSmoothingEnabled` | `boolean` | `true` | Canvas image smoothing |
| `fillWindow` | `boolean \| "mobile"` | `false` | Stretch canvas to fill the browser window. `false` = never, `true` = always, `"mobile"` = only on mobile/touch devices |
| `matchNativeResolution` | `boolean` | `false` | When `fillWindow` is enabled: update internal resolution to match window size (vs. stretching) |
| `preserveAspectRatio` | `boolean` | `true` | When `fillWindow` is enabled and `matchNativeResolution=false`, maintain aspect ratio |
| `useDevicePixelRatio` | `boolean` | `false` | Multiply resolution by `devicePixelRatio` for crisp high-DPI rendering |
| `audioAnalyzer` | `boolean` | `false` | Create a Web Audio analyser node when loading audio assets |
| `analyzerFftSize` | `number` | `128` | FFT size for the audio analyser |
| `analyzerSmoothing` | `number` | `0.5` | Smoothing time constant for the audio analyser |
| `drawColliders` | `boolean` | `false` | Draw collision shapes on top of game visuals every frame (debug aid) |
| `collidersOnly` | `boolean` | `false` | Skip all game object rendering and draw **only** collision shapes — useful for pure hitbox debugging |
| `mobileSupport` | `boolean` | `false` | Controls touch/mobile setup. Touch support is activated **automatically** when the engine detects a touch-capable device (`navigator.maxTouchPoints > 0`), so you usually don't need to set this. Set to `true` to force it on non-touch devices (useful for testing on desktop). Set to `false` to suppress it even on touch devices (e.g. on hybrid laptops you want to treat as desktop-only). When active: sets `touch-action: none` on the canvas, `user-select: none` on `<body>`, injects a `<meta name="viewport">` tag if absent, and enables audio context resume on first touch. |
| `autoFullscreen`| `boolean` | `false` | When `true` and running on a mobile touch device, automatically requests fullscreen mode on the first user interaction (hiding the browser navigation bar). |

Call `this.Configure(partialConfig)` in your Game's constructor to merge new values into an already-running config.

For example, to setup a 1280 x 720 resolution game canvas presented in full screen, you can setup some of these flags like this (and then ask the player to press `F11`):

```javascript
// 1280 x 720 resolution filling the browser window
this.Configure({
    screenWidth: 1280,            // game resolution width
    screenHeight: 720,            // game resolution height
    fillWindow: true,             // make canvas fill entire window
    preserveAspectRatio: true,    // keep aspect ratio when scaling
    matchNativeResolution: false, // use window size as resolution
    useDevicePixelRatio: false,   // handle high-DPI displays
    autoFullscreen: true          // automatically go fullscreen on mobile tap
});
```

### Initialization and Canvas Resolution

The `Init()` function (from `engine/main.js`) bootstraps the engine and automatically resolves which canvas element to use. Call it in your HTML's `window.onload` with your Game class:

```javascript
window.onload = () => {
    Init(MyGame);  // Start the engine
}
```

#### Canvas resolution strategy

`Init()` accepts an optional second parameter to specify which canvas to use:

```javascript
// Option 1: Specify a canvas by ID
Init(MyGame, "gameCanvas");  // uses <canvas id="gameCanvas">

// Option 2: Auto-detect (uses the first canvas in the DOM)
Init(MyGame);

// Option 3: Create dynamically (if no canvas exists, one is created)
Init(MyGame);
```

The resolution order is:

1. **Explicit canvas ID** — If you pass a second argument and a canvas with that ID exists, it is used
2. **First canvas in DOM** — If no ID was provided, the engine searches for any `<canvas>` element
3. **Dynamic creation** — If neither is found, the engine creates a new canvas (640×480), gives it the ID `generatedCanvas`, centers it with `margin: 0 auto`, and appends it to `<body>`

This means you can now write minimal HTML files that omit the canvas element entirely:

```html
<!-- Minimal HTML — no canvas element needed -->
<!DOCTYPE html>
<html>
<head>
    <script src="engine/main.js"></script>
    <script src="src/my-game.js"></script>
</head>
<body>
    <script>window.onload = () => Init(MyGame);</script>
</body>
</html>
```

The engine will automatically create and append a canvas to the body.

### Key properties

Some properties that the base `Game` class provides and can be used in your game:

| Property | Description |
|---|---|
| `this.screenWidth` / `this.screenHeight` | Current canvas dimensions — always prefer these over `canvas.width` / `canvas.height` |
| `this.screenHalfWidth` / `this.screenHalfHeight` | Convenience shortcuts for centering objects |
| `this.gameObjects` | Array of all `GameObject` instances; iterated by the base `Update` and `Draw` |
| `this.renderer` | The active `Renderer` (Canvas 2D or WebGL) |
| `this.audioActive` | Global mute flag — check before calling `audioPlayer.Play*()` |

### Key methods

Some methods that the base `Game` class provides and can be used in your game:

| Method | Description |
|---|---|
| `Destroy(gameObject)` | Defers deletion to the end of the frame: instantly marks the object as inactive, then safely removes it from `gameObjects`, fires its `Destroy()` hook, and cleans up its collider |
| `DestroyAllGameObjects()` | Defers deletion of all current game objects by routing them through `Destroy()` |
| `MoveGameObjectToEnd(gameObject)` | Moves a game object to the end of the `gameObjects` array so it is drawn last (rendered on top) |
| `AddCollider(collider)` | Registers a collider with the collision detection system |
| `RemoveCollider(collider)` | Unregisters a collider and cleans up any pending collision pairs |
| `SetScreenSize(width, height)` | Resize the canvas at runtime |
| `SetFillWindow(matchNative, useDevicePixelRatio, preserveAspectRatio)` | Enable fill-window mode at runtime |
| `Configure(partialConfig)` | Merge new values into `this.config` |
| `WindowResized()` | Override to react to window resize events (called by the renderer automatically) |
| `OnFocusLost()` | Override to react when the game window genuinely loses focus (tab switch, app switch, home button). The engine automatically filters out the spurious `blur` that mobile browsers fire when the address bar toggles, so this only fires on real focus loss. Common use: pause the game and mute audio. |
| `OnFocusGained()` | Override to react when the game window regains focus after a real focus-loss event. Common use: resume audio, show a "tap to resume" prompt. |

## GameObjects

The `GameObject` class (`engine/gameobjects.js`) is the base class for every interactive entity. Push instances into `this.gameObjects` and the engine will call their lifecycle methods automatically.

### Lifecycle methods

Override these in your subclass to inject logic:

| Method | When it is called |
|---|---|
| `Start()` | Once, just before the first frame — same time as `Game.Start()` |
| `Update(deltaTime)` | Every frame while `active === true`; `deltaTime` is seconds since last frame |
| `Draw(renderer)` | Every frame while `active === true`, after all `Update` calls |
| `OnCollisionEnter(myCollider, otherCollider)` | First frame two registered colliders overlap |
| `OnCollisionExit(myCollider, otherCollider)` | First frame two previously overlapping colliders separate |
| `OnClick()` | When the mouse is clicked inside the object's registered collider |

> Always call `super.Update(deltaTime)` when overriding `Update` — the base implementation ticks the attached collider.

### Properties

| Property | Description |
|---|---|
| `active` | `boolean` — when `false` the object is skipped by `Update` and `Draw`. Setting this also enables/disables the attached `collider` automatically. |
| `position` | `Vector2` — world position |
| `x` / `y` | Shorthand for `position.x` / `position.y` |
| `rotation` | Rotation in radians |
| `scale` | `Vector2` or uniform `number` |
| `pivot` | `{x, y}` offset from `position` used as the rotation/scale origin |
| `collider` | Attached `Collider` instance (or `undefined` if none) |

### Built-in subclasses

| Class | Constructor highlights | Use for |
|---|---|---|
| `RectangleGO` | `(position, width, height, color, stroke, lineWidth)` | Solid or outlined rectangles |
| `CircleGO` | `(position, radius, color, stroke, lineWidth)` | Solid or outlined circles |
| `SpriteObject` | `(position, rotation, scale, img, alpha)` | Single image with `flipX` / `flipY` support |
| `SpriteSectionObject` | `(position, rotation, scale, img, sectionRect, alpha)` | A rectangular section of a sprite sheet or image (cropped region) |
| `SSAnimationObjectBasic` | `(position, rotation, scale, img, frameWidth, frameHeight, frameCount[], framesDuration)` | Regular grid sprite-sheet (all frames same size) |
| `SSAnimationObjectComplex` | `(position, rotation, scale, img, animationsRectangles[][], framesDurations[])` | Packed-atlas sprite-sheet (arbitrary frame rects per animation) |
| `Tileset` | `(img, position, scale, tilesetConfig, tilesetMap, tileWidth, tileHeight)` | Tile-map rendering. `img` is a fallback image; `tilesetConfig` tiles can optionally include their own `image` reference (for Tiled multi-image maps) |
| `GameObjectsBackgroundLayer` | `(position, gameObjects[], speed)` | A parallax background layer that manages a group of game objects and updates their positions with the camera |

**Tileset notes:**
- **Single-image maps** (traditional): Pass `img` with the tile sheet; each `tilesetConfig[id]` contains only `{rect: {x, y, w, h}}`
- **Multi-image maps** (Tiled): Each `tilesetConfig[id]` can include `{rect: {...}, image: HTMLImageElement}` to reference a different image per tile

### Minimal example

```javascript
class RotatingBox extends RectangleGO {
    constructor(position) {
        super(position, 100, 100, Color.blue);
        this.rotationSpeed = 1; // radians per second
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        this.rotation += this.rotationSpeed * deltaTime;
    }
    // Draw is handled by RectangleGO — no override needed
}
```

For step-by-step examples covering sprites, keyboard input, and sprite-sheet animations, see [Getting Started → Create GameObjects](getting-started.md#_5-create-gameobjects).

## Rendering

The `Renderer` class (from `engine/renderer.js`) provides methods for drawing shapes, sprites, and text. It is accessed via `this.renderer` inside your `Game` class.

```javascript
// In your Game's Draw method
this.renderer.DrawFillRectangle(x, y, width, height, Color.red);
this.renderer.DrawSprite(mySpriteImage, x, y, width, height);
this.renderer.DrawText("Hello World", x, y, "20px Arial", Color.white);
```

## Screen and Coordinate System

The engine uses a consistent coordinate system that works across all display modes:

- **Always use `this.screenWidth` and `this.screenHeight`** instead of `canvas.width` / `canvas.height`
- **Mouse coordinates** via `Input.mouse.x` and `Input.mouse.y` are automatically normalised
- **Fullscreen modes** preserve aspect ratios and coordinate consistency

```javascript
// ✅ Correct — works with all display modes
const centerX = this.screenWidth / 2;
const centerY = this.screenHeight / 2;

// ❌ Incorrect — breaks with fullscreen modes
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
```

---

## Cameras

The engine provides three camera classes. Call `camera.PreDraw(renderer)` before drawing the scene and `camera.PostDraw(renderer)` after to apply/restore the transform.

| Class | Description |
|---|---|
| `Camera` | Base camera. Supports smooth `Zoom(scale, duration)` and instant `ZoomPunch(scale, returnDuration)`. |
| `FollowCameraBasic` | Snaps instantly to keep a target GameObject centered. |
| `FollowCamera` | Smooth-follow with world bounds clamping and optional screen shake. |

### `FollowCamera` — typical platformer setup

```javascript
Start() {
    super.Start();

    this.camera = new FollowCamera(
        new Vector2(0, 0),  // initial position
        this.player,        // target to follow
        0,    600,          // minX, maxX world bounds
        0,    400,          // minY, maxY world bounds
        5,                  // smoothingSpeed (higher = snappier)
        Vector2.Zero()      // optional offset from target
    );
    this.AddGameObject(this.camera);
}

Update(deltaTime) {
    super.Update(deltaTime);
    this.camera.Update(deltaTime);
}

Draw() {
    this.camera.PreDraw(this.renderer);  // apply transform
    super.Draw();                         // all objects drawn in camera space
    this.camera.PostDraw(this.renderer); // restore transform
}
```

### Screen shake and zoom

```javascript
// Trigger shake on hit: (duration, oscillationSpeed, amplitude)
this.camera.Shake(0.4, 40, 6);

// Smooth zoom in over 0.5 s, then back to normal
this.camera.Zoom(1.5, 0.5);
setTimeout(() => this.camera.Zoom(1.0, 0.5), 800);

// Instant punch-zoom (great for impacts)
this.camera.ZoomPunch(1.08, 0.3);
```

---

## Background Layers

`BackgroundLayers` manages an ordered stack of parallax layers. Each layer is updated with the camera position every frame and drawn before your game objects.

```javascript
Start() {
    super.Start();

    this.bg = new BackgroundLayers(this.camera);

    // Layer 1: solid sky colour (no parallax — always fills the screen)
    this.bg.InsertLayer(new StaticColorLayer(Color.FromHex('#1a1a2e')));

    // Layer 2: distant mountains sprite (slow parallax, speed=0.2)
    this.bg.InsertLayer(new SpriteBackgroundLayer(
        this.graphicAssets.mountains.img,
        new Vector2(0, 0), 0, 1,
        new Vector2(0.2, 0)  // parallax speed — 0 = moves with camera, 1 = fixed in world
    ));

    // Layer 3: near trees (faster parallax)
    this.bg.InsertLayer(new SpriteBackgroundLayer(
        this.graphicAssets.trees.img,
        new Vector2(0, 0), 0, 1,
        new Vector2(0.6, 0)
    ));

    this.bg.Start();
    // Note: If manually calling bg.Update() and bg.Draw(), no need to add to gameObjects
}

Update(deltaTime) {
    super.Update(deltaTime);
    this.bg.Update(deltaTime);
}

Draw() {
    this.bg.Draw(this.renderer);     // draw backgrounds first
    this.camera.PreDraw(this.renderer);
    super.Draw();
    this.camera.PostDraw(this.renderer);
}
```

### Parallax speed values

The `speed` parameter on each layer is a `Vector2` parallax factor (0–1 per axis):

| `speed.x` | Effect |
|---|---|
| `0` | Layer moves with the camera (like a UI element — no parallax) |
| `0.5` | Layer moves at half the camera speed (medium depth) |
| `1` | Layer stays fixed in world space (far background) |

### Available layer types

| Class | Description |
|---|---|
| `StaticColorLayer` | Screen-filling solid colour, scrolls with camera |
| `StaticGradientLayer` | Screen-filling linear gradient |
| `ColorRectangleLayer` | Coloured rectangle with parallax |
| `GradientRectangleLayer` | Gradient rectangle with parallax |
| `SpriteBackgroundLayer` | Single sprite or sprite-sheet section with parallax |
| `MultispritesBackgroundLayer` | Group of sprites moving together with parallax |
| `TilesetBackgroundLayer` | Full tile map with parallax |

## Tiled Map Editor Integration

For complex tile-based levels, the engine includes **`TiledLoader`** — a utility that reads maps exported from the free **[Tiled Map Editor](https://www.mapeditor.org/)** and converts them into spark.js compatible `Tileset` objects.

```javascript
Start() {
    super.Start();
    
    this.tiledAssets = {
        forestMap: { path: "assets/forest/forest.json", data: null }
    };
}

// After assets load:
Start() {
    super.Start();
    
    // Parse and create tilesets from the loaded JSON
    const mapData = TiledLoader.Parse(this.tiledAssets.forestMap.data, this.graphicAssets);
    const tilesets = TiledLoader.CreateTilesets(mapData, new Vector2(0, 0), 1);
    tilesets.forEach(ts => this.AddGameObject(ts));
}
```

The `TiledLoader` handles:
- **Multiple tile layers** from a single map
- **Multiple tilesets** per map
- **Grid-based** and **Collection of Images** tileset formats
- **Embedded tilesets** (required — export with "Embed tilesets" checked)
- **Animated tiles** via frame data extraction
- **Object layers** for sprites and game object placement

> See the [Tiled integration guide](./tiled-integration.md) for full setup instructions and the [Tileset example](../tileset.html) for a complete working demo.
