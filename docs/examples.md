# Examples

Explore the `src/examples/` directory for practical demonstrations of the engine's capabilities.

## Engine Systems

### Renderers
- [Canvas 2D render test](../render_test.html ':ignore :target=_blank') — exercises renderer methods for primitives, sprites, animations, and more
- [WebGL render test](../render_test.html?webgl ':ignore :target=_blank') — same project using the WebGL renderer
- [Canvas resizing & fullscreen](../canvas-resize.html ':ignore :target=_blank') — interactive demo of all canvas display options

### Input
- [Basic input test](../inputtest.html ':ignore :target=_blank')
- [Mouse input test](../mousetest.html ':ignore :target=_blank') — per-button events (left, right, middle), scroll wheel delta, click trail, and live crosshair
- [Input Actions test](../input_actions_test.html ':ignore :target=_blank') — abstract input system with Actions and Axes
- [Gamepad Tester](../gamepad-tester.html ':ignore :target=_blank') — interactive gamepad visualiser; shows button presses, stick positions with trail history, and trigger values; background gradient updates dynamically to match the detected controller brand (Xbox, PlayStation's DualSense, Nintendo's Switch Pro Controller)
- [Rumble Test](../rumble-test.html ':ignore :target=_blank') — demonstrates `Input.RumbleGamepad()`; four named presets (Tap, Impact, Engine, Buzz) mapped to face buttons and keyboard 1–4, plus a custom section where LT/RT control strong/weak motor intensity live
- [Rumble Test (HTML UI)](../rumble-test-html.html ':ignore :target=_blank') — same rumble tester rebuilt with an `HTMLMenu` overlay (`coverCanvas=true`); all controls are HTML/CSS while the canvas runs a ring-burst animation in the background. This example has a more [advance standalone version including a ring-burst animation in the background plus a real-time oscilloscope wave strip to the canvas](https://maxi-jp.github.io/Super-GamepadRumble-Tester/ ':ignore :target=_blank')

### Other systems
- [Audio system test](../audiotest.html ':ignore :target=_blank')
- [Colliders test](../colliders.html ':ignore :target=_blank')
- [Object pooling](../object_pooling.html ':ignore :target=_blank')
- [Particle System](../particles.html ':ignore :target=_blank') — smoke (area and point emitters), rain, and snow presets
- [Tileset](../tileset.html ':ignore :target=_blank') *(WIP)*
- [Parallax](../parallax.html ':ignore :target=_blank') *(WIP)*

---

## Example Games

- [BrokeOut](../brokeout.html ':ignore :target=_blank') — basic Breakout clone
- [Floppy Derp](../floppyderp.html ':ignore :target=_blank') — Flappy Bird-like game
- [Twin Stick Shooter](../twin-stick-shooter.html ':ignore :target=_blank')
- [Twin Stick Shooter 2](../tts-complex.html ':ignore :target=_blank') — more complex version
- [Basic Tetris](../tetrisbasic.html ':ignore :target=_blank')
- [Complex Tetris](../tetriscomplex.html ':ignore :target=_blank') — modern gameplay features
- [Snake](../snake.html ':ignore :target=_blank')
- [Columns](../columns.html ':ignore :target=_blank')
- [Puzzle Bobble](../puzzlebobble.html ':ignore :target=_blank')
- [Pacmon](../pacmon.html ':ignore :target=_blank') *(WIP)* — Pac-Man implementation
- [Super Pang](../superpang.html ':ignore :target=_blank') — arcade balloon-popping game; demonstrates `CircleCollider` + dynamically-resized `RectangleCollider`, `SpriteObject.DrawSection` with a static section lookup table, color-key transparency (`bgColor`), and a multi-level game loop with lives, timer, and HUD labels
- [Watermelon Game (Suika Game clone)](../watermelon.html ':ignore :target=_blank') *(WIP)* — A physics-based puzzle game demonstrating advanced Box2D integrations, where players drop fruits that merge into larger ones upon contact.
  **Key features demonstrated:**
  - **Suspended physics bodies:** Spawning a rigid body that ignores gravity (`body.SetActive(false)`), manually tracking the mouse position, and then "dropping" it by awakening the body (`body.SetActive(true)`).
  - **World Manifold extraction:** Capturing the exact world coordinates of an impact (`contactPoint`) to spawn the merged fruit exactly where the collision happened.
  - **Safe destruction:** Relying on the object's `active` flag to safely destroy colliding pairs of Box2D bodies, utilizing the engine's deferred deletion queue to prevent array-mutation bugs during physics steps.
  - **Scale translations:** Converting canvas pixel coordinates to Box2D meters and back using `Box2DToCanvasPosition`.

---

## UI & Menus

- [HTML + CSS main menu](../menu.html ':ignore :target=_blank')
- [HTML + CSS menu and game UI](../menu-and-ui.html ':ignore :target=_blank') — interactions between HTML menus and game layers

---

## Box2D Physics

- [Box2D basic](../box2d-basic.html ':ignore :target=_blank')
- [Box2D basket](../box2d-basket.html ':ignore :target=_blank')
- [Box2D trigger demo](../box2d-trigger.html ':ignore :target=_blank') — three side-by-side `Box2DTrigger` zones demonstrating `OnTriggerEnter`, `OnTriggerStay` with time tracking, and `OnTriggerStay` with deferred destruction
- [Box2D platformer](../box2d-platformer.html ':ignore :target=_blank') *(WIP)*
- [Box2D Watermelon Game (Suika Game clone)](../box2d-watermelon.html ':ignore :target=_blank') — A prototype for a physics-based puzzle game demonstrating advanced Box2D integrations, where players drop fruits that merge into larger ones upon contact. Reduced/simplified version of the [Watermelon Game (Suika Game clone)](../watermelon.html ':ignore :target=_blank') (with suspended physics bodies, world manifold extraction, safe destruction, and scale translations implementations).

---

## Other

- [Mode 7](../mode7.html ':ignore :target=_blank') — SNES-style pseudo-3D effect *(very WIP)*
- [Lines intersection](../linesintersection.html ':ignore :target=_blank')
