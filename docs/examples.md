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
- [Fuzzy Logic — Weapon Selection Advisor](../fuzzy-weapon.html ':ignore :target=_blank') — interactive AI weapon utility evaluator based on Mat Buckland's *Programming Game AI by Example* (Ch. 10). Evaluates 4 weapons (Rocket Launcher, Shotgun, Pistol, Railgun) using distance and ammo linguistic variables, compares `MaxAv` vs `Centroid` defuzzification live, and plots real-time membership curves with `DrawFuzzyInspector`. See the project's [README](../src/examples/fuzzy_weapon/README.md ':ignore :target=_blank') and [fuzzy-logic.md](fuzzy-logic.md) for full documentation.
- [Fuzzy Logic — Autonomous Driver & Obstacle Avoidance](../fuzzy-driver.html ':ignore :target=_blank') — continuous fuzzy control demo pitting a smooth **Fuzzy Logic Car** against a rule-threshold **Crisp Car** on a circuit with movable obstacles. Uses 2 coupled `FuzzyModule` brains (Lane/Obstacle Steering and Speed/Throttle) with 5-ray proximity sensors. See the project's [README](../src/examples/fuzzy_driver/README.md ':ignore :target=_blank') and [fuzzy-logic.md](fuzzy-logic.md) for full documentation.
- [Fuzzy Logic — Tactical Threat & Hybrid AI](../fuzzy-tactical.html ':ignore :target=_blank') — tactical arena demonstrating how continuous **Fuzzy Logic** perception (`ThreatLevel`, `AggressionDesire`) and linguistic hedges (`FzVery`, `FzFairly`) feed into a discrete **FSM** or **Behavior Tree** action brain (switchable live). See the project's [README](../src/examples/fuzzy_tactical/README.md ':ignore :target=_blank') and [fuzzy-logic.md](fuzzy-logic.md) for full documentation.
- [GOAP — Autonomous Survival Crafter & Economy](../goap-survival.html ':ignore :target=_blank') — autonomous survivor gathers wood and iron ore, smelts iron bars at a furnace, crafts axes at an anvil, cooks food at a campfire, and sleeps in a cabin using a 12-action `GOAPPlanner`. Demonstrates dynamic multi-step dependency chains, cost-driven tool optimization (2-step bare-handed chopping vs. 5-step iron axe crafting), and live sabotage/resource injection with `DrawGOAPInspector`. See the project's [README](../src/examples/goap_survival/README.md ':ignore :target=_blank') and [goap.md](goap.md) for full documentation.
- [GOAP — Tactical Combat Squad (F.E.A.R. Style)](../goap-combat.html ':ignore :target=_blank') — tactical arena inspired by Jeff Orkin's GDC 2006 *F.E.A.R.* architecture. Elite GOAP soldiers evaluate cover nodes, suppress the player, flank, throw grenades to flush cover, reload, and retreat to medkits, while a side-by-side comparison mode pits the GOAP Squad against a rigid FSM Grunt. See the project's [README](../src/examples/goap_combat/README.md ':ignore :target=_blank') and [goap.md](goap.md) for full documentation.
- [GOAP — Multi-Room Dungeon Heist & Deep $A^*$ Chaining](../goap-dungeon.html ':ignore :target=_blank') — stealth rogue infiltrates a multi-room dungeon with locked doors, laser grids, patrolling guards, and a treasure vault. Demonstrates deep 7-step $A^*$ causal planning (`PickUpCrowbar → BreakCrate → PickUpRustyKey → UnlockArmory → DisableLaserPower → OpenVault → StealGem → Escape`) and instantaneous alternative route synthesis when a Shortcut Bomb is spawned (`cost 9` vs `cost 18`). See the project's [README](../src/examples/goap_dungeon/README.md ':ignore :target=_blank') and [goap.md](goap.md) for full documentation.
- [GOAP — Autonomous Hospital Simulation](../goap-hospital.html ':ignore :target=_blank') — multi-agent hospital simulation combining **GOAP**, a **3-state FSM** (`Waiting`, `MovingTo`, `PerformingAction`), and **A\* Pathfinding**. Features Patients with 8 ailments, a Triage Receptionist, 4 Specialist Doctors (General Medicine, Ophthalmology, Orthopedics, Maternity), an X-Ray diagnostic room, post-consultation computer record logging, shared restroom queues (`bladder` preemption), live hospital telemetry, and click-to-inspect NPC debugging. Organized into a modular 4-script codebase (`hospital_defs.js`, `hospital_npc_base.js`, `hospital_agents.js`, `goap_hospital.js`). See the project's [README](../src/examples/goap_hospital/README.md ':ignore :target=_blank') and [goap.md](goap.md) for full documentation.

---

## Example Games

- [Death Rally](../death-rally.html ':ignore :target=_blank') — vehicular combat arcade game inspired by the 1996 classic. A fully-featured multi-circuit playground featuring:
  - **Arcade car physics** — frame-rate-independent lateral-friction drift model; 4 vehicle types with distinct handling profiles
  - **5 surface types** — asphalt, gravel, dirt, grass and oil slick, each affecting grip and top speed differently
  - **Circuit system** — `CircuitLoader` normalises both inline JS (`Option A`) and Tiled `.tmj` maps (`Option B`) to the same runtime contract; includes `RaceManager` state machine (countdown → racing → results) and `CheckpointZone` triggers with strict lap validation
  - **Two circuits** — open cross-shaped Playground and a barrier-enclosed Oval Track; switchable at runtime from the debug menu
  - **Weapons** — machine gun (×10 rounds), missile (×1), and mine (×3), all as ground pickups; health packs and money pickups also scattered on-track
  - **Waypoint-following AI** — enemies race the track via an ordered waypoint loop, attack when aimed at the player, and wait for the green light like the player does
  - **HTMLMenu HUD** — health bar, weapon slot, ammo, lap counter, race position, speed and surface name, and a full debug panel (swap vehicle, equip weapons, restart race, toggle debug/collider overlays, switch track live)
  - **Split codebase** — `circuit.js`, `death_rally_defs.js`, `game_objects.js`, `cars.js`, `death_rally_game.js`, `circuits/playground.js`, `circuits/oval_track.js`
  - See the project's [README](../src/examples/death_rally/README.md ':ignore :target=_blank') for implementation notes and design decisions

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
