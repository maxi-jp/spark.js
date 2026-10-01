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
- [Timer System test](../timer-test.html ':ignore :target=_blank') — one-shot and repeating timers, GameObject-owned timers, and automatic cleanup on destruction
- [Object pooling](../object_pooling.html ':ignore :target=_blank')
- [Particle System](../particles.html ':ignore :target=_blank') — smoke (area and point emitters), rain, and snow presets
- [Tileset (Tiled Map Loader)](../tileset.html ':ignore :target=_blank') — Load and render maps created in the Tiled Map Editor with the `TiledLoader` utility. See [tiled-integration.md](tiled-integration.md) for full documentation.
- [A\* Pathfinding](../pathfinding.html ':ignore :target=_blank') — Interactive demo of `AStarPathfinder`. Paint walls, drag start/end markers, and switch between Manhattan, Octile, and Euclidean heuristics live. See the project's [README](../src/examples/pathfinding/README.md ':ignore :target=_blank') for a comprenhensive description and [ai.md](ai.md) for full documentation.
- [FSM demo — Guard Patrol](../fsm-basic.html ':ignore :target=_blank') — three guards patrol waypoints and react to the mouse cursor using a 4-state FSM (`Patrol → Alert → Chase → Return`). Demonstrates declarative transition guards (`AddTransition`), imperative `fsm.Transition()` calls, hysteresis on boundary conditions, and `FSM.DrawDebug()`. See the project's [README](../src/examples/fsm_basic/README.md ':ignore :target=_blank') for a detailed walkthrough and [ai.md](ai.md) for the full API reference.
- [HFSM demo — Sentry AI](../fsm-hfsm.html ':ignore :target=_blank') — interactive demo with two sentry NPCs and a left-clickable threat. Each NPC uses a Hierarchical FSM: top-level states `patrol ↔ combat ↔ flee`, with `combat` being an `FSMCompositeState` whose nested sub-FSM runs `approach → attack → cooldown`. Right-clicking near an NPC deals damage to demonstrate the flee transition. See the project's [README](../src/examples/fsm_hfsm/README.md ':ignore :target=_blank') for a detailed walkthrough and [ai.md](ai.md) for the full API reference.
- [BT demo — Stealth Guard AI](../bt-guard.html ':ignore :target=_blank') — two autonomous guard drones patrol with vision cones, hearing radius, and reactive priority interruption (`BTReactiveSelector`). Demonstrates multi-step noise investigations, line-of-sight loss and search at last known positions, and real-time visual tree inspection (`DrawTreeInspector`). See the project's [README](../src/examples/bt_guard/README.md ':ignore :target=_blank') and [ai.md](ai.md) for full documentation.
- [BT demo — Autonomous Resource Worker](../bt-worker.html ':ignore :target=_blank') — autonomous miners gather resources, haul cargo to Town Hall, manage stamina/fatigue at campfires, and evade roaming predators. Demonstrates `BTReactiveSequence` for continuous precondition aborts, procedural gathering loops, and live hierarchical tree monitoring. See the project's [README](../src/examples/bt_worker/README.md ':ignore :target=_blank') and [ai.md](ai.md) for full documentation.
- [BT demo — Multiphase Arena Boss](../bt-boss.html ':ignore :target=_blank') — action arena boss battle featuring the Titan Mech. Demonstrates dynamic phase shifts based on health thresholds, attack ability throttling via `BTCooldown`, telegraph windups via `BTWait`, multi-step combo sequences, and live inspector HUD. See the project's [README](../src/examples/bt_boss/README.md ':ignore :target=_blank') and [ai.md](ai.md) for full documentation.
- [AI Comparison — Cleaner Bots](../cleaner_bots.html ':ignore :target=_blank') — different autonomous bots competing with limited vision range, demonstrating three AI architectures side-by-side: `FSMBTRobot` (hybrid BT+FSM), `FSMBot` (FSM-only), and `BTBot` (BT-only). Showcases emergent competition, vision-limited perception, and the complementary strengths of each pattern for the same domain. See the project's [README](../src/examples/cleaner_bots/README.md ':ignore :target=_blank') for a detailed walkthrough and [ai.md](ai.md) for the full API reference.

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
- [Fighting Game](../fighting-game.html ':ignore :target=_blank') *(WIP)* — 1vs1 fighting game based on a project by [Christopher Lis](https://github.com/chriscourses/fighting-game ':ignore :target=_blank').
  **Key features demonstrated:**
  - **Camera system with virtual pivot point:** Smooth multi-target following by positioning camera at the arithmetic mean of both fighters' locations
  - **HTMLMenu overlay UI:** DOM-based HUD (health bars, timer, game-over display) positioned above the canvas using the engine's overlay system
  - **Engine timer system:** Match countdown using `game.Invoke()` for frame-accurate, game-time-based timing (not wall-clock `setInterval`)
  - **Multi-layer parallax backgrounds:** Layered rendering with `BackgroundLayers` (color base, static background, animated shop overlay) with camera-aware transformations
  - **Collision system for combat:** Dual colliders per fighter (body collider for receiving hits, attack collider for delivering damage) with frame-accurate hit detection using `actualFrame` property

---

## UI & Menus

- [HTML + CSS main menu](../menu.html ':ignore :target=_blank')
- [HTML + CSS menu and game UI](../menu-and-ui.html ':ignore :target=_blank') — interactions between HTML menus and game layers

---

## Box2D Physics

- [Box2D basic](../box2d-basic.html ':ignore :target=_blank')
- [Box2D basket](../box2d-basket.html ':ignore :target=_blank')
- [Box2D car game](../box2d-cargame.html ':ignore :target=_blank') — a port of an example game by [Thomas Seng Hin Mak](https://github.com/makzan/HTML5-Games-Examples ':ignore :target=_blank') demonstrating wheels, revolute joints, vehicle fuel mechanics, multi-level progression, and contact-based win conditions
- [Box2D trigger demo](../box2d-trigger.html ':ignore :target=_blank') — three side-by-side `Box2DTrigger` zones demonstrating `OnTriggerEnter`, `OnTriggerStay` with time tracking, and `OnTriggerStay` with deferred destruction
- [Box2D platformer](../box2d-platformer.html ':ignore :target=_blank') *(WIP)*
- [Box2D Watermelon Game (Suika Game clone)](../box2d-watermelon.html ':ignore :target=_blank') — A prototype for a physics-based puzzle game demonstrating advanced Box2D integrations, where players drop fruits that merge into larger ones upon contact. Reduced/simplified version of the [Watermelon Game (Suika Game clone)](../watermelon.html ':ignore :target=_blank') (with suspended physics bodies, world manifold extraction, safe destruction, and scale translations implementations).

---

## Other

- [Mode 7](../mode7.html ':ignore :target=_blank') — SNES-style pseudo-3D effect *(very WIP)*
- [Lines intersection](../linesintersection.html ':ignore :target=_blank')
