# spark.js

A modular, object-oriented HTML5 game engine for web browsers, built with vanilla JavaScript, WebGL and the HTML5 Canvas API. Originally created for a university course on web game development.

Engine and examples are actively hosted on GitHub Pages: [https://maxi-jp.github.io/spark.js/](https://maxi-jp.github.io/spark.js/)

## Features

The engine comes packed with a variety of features to streamline your game development process:

### Modular Core

A clean, object-oriented architecture ensures that the engine is easy to understand, extend, and maintain. Components are designed to be independent yet work seamlessly together.

### Rendering Engine

The architecture supports 2D rendering via the HTML5 Canvas API and WebGL, offering flexibility for more advanced graphics.

### Game Loop

A built-in main loop with a fixed update phase for consistent physics and logic, and a variable draw phase to utilize available frame rates.

### Sprite & Animation Support

Full support for rendering static sprites, sections of sprite sheets, and complex animations. Easily create animated characters and objects using sprite sheet definitions.

### Physics Integration

Seamless integration with the Box2D physics engine. The engine provides easy-to-use `Box2DGameObject` classes for creating physics-enabled rectangles, sprites, and animated objects, simplifying collision detection and realistic movement.

### Input Handling

A powerful, abstract input system that maps high-level "Actions" (e.g., "Jump", "Fire") and continuous "Axes" (e.g., "MoveHorizontal", "Rotate") to various physical inputs: keyboard keys, mouse clicks, and gamepad buttons/axes/triggers. This system promotes clean game logic and simplifies control remapping.

### Timer System

Unity-style `Invoke` and `InvokeRepeating` methods for delayed and repeating callbacks. Timers run on game time (not wall-clock time), automatically pause when the game loses focus, and clean up automatically when GameObjects are destroyed. Perfect for cooldowns, wave spawning, delayed destruction, and any time-based game logic.

### Audio Manager

A simple yet powerful system to manage and play audio files. Supports basic playback controls and can be extended for more advanced audio features.

### UI & Menus

Leverages standard HTML and CSS for creating flexible and visually rich game menus and user interfaces, allowing developers to use familiar web technologies for UI design.

### Background Layers

Create immersive backgrounds using solid colors, gradients, parallax scrolling layers, and tilemaps. This enables the creation of deep and dynamic game environments.

### Object Pooling

An efficient object pooling system for reusing frequently created and destroyed objects (like bullets or particles), significantly reducing garbage collection overhead.

### Particle System

A configurable, image-based particle emitter that supports both **point** and **area** spawn modes. Every per-particle property — velocity, direction, opacity fade, scale, and rotation — is controlled by min/max random ranges defined in a config object. The system uses an internal object pool so no garbage is created at runtime. Based on the standalone [HTML5_ParticleSystem](https://github.com/maxi-jp/HTML5_ParticleSystem) project.

### Tiled Map Editor Integration

Load maps directly from **Tiled Map Editor** using the `TiledLoader` utility. Define tile layers visually in Tiled, export to JSON with embedded tilesets, and instantly render them in your game. The loader handles grid-based and Collection of Images tilesets automatically. See the [Tileset example](../tileset.html) and [Tiled integration guide](./tiled-integration.md) for details.

### A* Pathfinding

General-purpose grid pathfinding via `AStarPathfinder` (`ai.js`). Supports 4- and 8-directional movement, three built-in heuristics (Manhattan, Octile, Euclidean) with automatic selection, line-of-sight path smoothing, and graceful fallbacks for blocked or unreachable targets. Works with any grid object that implements the duck-typed grid interface — no coupling to a specific map format. See the [interactive demo](../pathfinding.html) and [AI utilities reference](./ai.md) for details.

### Finite State Machines (FSM & HFSM)

Organize complex AI and game logic into discrete, manageable states. The engine provides `FSMState`, `FSM`, and `FSMCompositeState` classes (`fsm.js`) supporting both flat and hierarchical state machines. Features include:
- **Declarative transition guards** — condition functions automatically evaluated each frame (Millington & Funge model)
- **Imperative transitions** — explicit state changes from within action code
- **Composite states** — nest sub-FSMs inside parent states for multi-level behavior hierarchies
- **Built-in debugging** — `DrawDebug()` overlay to visualize active states in real-time

Perfect for character controllers, game modes, NPC behavior, UI flow, and any scenario with discrete states. See the [FSM guard patrol demo](../fsm-basic.html), [HFSM sentry demo](../fsm-hfsm.html), and [FSM reference](./ai.md#fsm--hfsm-fsmjs) for details.

### Behavior Trees

A composable, reactive alternative to FSMs for complex decision-making. The engine provides a full Behavior Tree implementation (`bt.js`) with:
- **Composites** — `BTSelector` (choose one), `BTSequence` (do all), `BTParallel` (concurrent), and reactive variants (`BTReactiveSelector`, `BTReactiveSequence`) for dynamic re-evaluation and preemption
- **Decorators** — `BTCooldown`, `BTWait`, `BTDelay`, `BTInverter`, `BTRepeater`, and more for fine-grained behavior control
- **Leaf nodes** — `BTAction` and `BTCondition` for implementing concrete behaviors and checks
- **Blackboard memory** — Shared, key-value state store for nodes to coordinate and persist data
- **Live tree inspector** — `DrawTreeInspector()` displays the entire tree hierarchy with real-time status (SUCCESS, FAILURE, RUNNING, IDLE) and cooldown timers

Ideal for boss AI, autonomous agents, complex multi-stage routines, and systems requiring reactive priority interruption. See the [stealth guard demo](../bt-guard.html), [autonomous worker demo](../bt-worker.html), [multiphase boss demo](../bt-boss.html), and [BT reference](./ai.md#behavior-trees-btjs) for details.

### Fuzzy Logic

Model human-like, continuous reasoning ("somehow close", "fairly low ammo", "very dangerous") without rigid boolean threshold jumps. The engine provides a complete Mamdani Fuzzy Inference System (`fuzzy.js`) based on Mat Buckland's *Programming Game AI by Example* and Millington & Funge's *Artificial Intelligence for Games*:
- **6 Membership Set Shapes** — `FuzzySetTriangle`, `FuzzySetLeftShoulder`, `FuzzySetRightShoulder`, `FuzzySetTrapezoid`, `FuzzySetSingleton`, and `FuzzySetSCurve`
- **Composable Rule Operators & Hedges** — `FzAnd` (min), `FzOr` (max), `FzNot` ($1 - \mu$), `FzVery` ($\mu^2$ concentration), and `FzFairly` ($\sqrt{\mu}$ dilation)
- **Dual Defuzzification** — Choose between fast **Maximum Average (`MaxAv`)** or high-precision **Center of Mass (`Centroid`)** integration
- **Live Canvas Visualizers** — `DrawFuzzyInspector()` and `DrawVariableGraph()` render real-time membership function curves, crisp input vertical markers, rule firing strengths, and defuzzified outputs directly onto the game canvas

Ideal for weapon utility scoring, smooth autonomous steering, tactical threat evaluation, and hybrid architectures (Fuzzy sensors feeding FSMs or Behavior Trees). See the [Weapon Selection demo](../fuzzy-weapon.html), [Autonomous Driver demo](../fuzzy-driver.html), [Tactical Threat & Hybrid AI demo](../fuzzy-tactical.html), and the dedicated [Fuzzy Logic System Guide](./fuzzy-logic.md) for details.

### Goal-Oriented Action Planning (GOAP)

Decouple *what* an agent wants to achieve (**Goals**) from *how* to achieve it (**Actions**) and let a real-time state-space $A^*$ planner synthesize multi-step action sequences dynamically. Based on Jeff Orkin's GDC 2006 paper (*"Three States and a Plan: The A.I. of F.E.A.R."*) and Millington & Funge's *Artificial Intelligence for Games*, `goap.js` provides:
- **Symbolic World State (`GOAPState`)** — Lightweight key-value state representation with canonical hashing, goal satisfaction checks (`satisfies`), heuristic mismatch counting (`mismatchCount`), and state mutation (`apply`)
- **Priority Goals (`GOAPGoal`)** — Declarative desired world states with static or dynamic runtime priority callbacks and optional deactivation predicates (`isValid`)
- **Modular Actions (`GOAPAction`)** — Self-contained action primitives with symbolic preconditions, symbolic effects, dynamic costs, procedural environment checks (`checkProcedural`), and execution lifecycles (`onEnter`, `onUpdate`, `onExit`) supporting OOP subclassing, fluent builders, or inline config objects
- **Forward State-Space $A^*$ Planner (`GOAPPlanner`)** — Searches from current world state to goal satisfaction while recording search telemetry (`lastPlanCost`, `lastNodesExpanded`, `lastSearchTrace`) for educational inspection
- **Autonomous Agent Orchestrator (`GOAPAgent` & `DrawGOAPInspector`)** — Manages perception sensors, automatic replanning on world changes or action failures, plan execution, and real-time canvas HUD visualization of world state, goals, active plans, and $A^*$ metrics

Ideal for survival crafting economies, tactical squad combat, multi-room puzzle solving, and emergent NPC behaviors without brittle transition graphs. See the [Autonomous Survival Crafter demo](../goap-survival.html), [Tactical Combat Squad demo](../goap-combat.html), [Multi-Room Dungeon Heist demo](../goap-dungeon.html), and the dedicated [GOAP System Guide](./goap.md) for details.

### Utilities

A collection of helper functions and classes for common tasks: vector math, collision detection, color manipulation, and more.

### Debugging Tools

Optional debug drawing for physics bodies and an FPS/stats overlay to assist during development.

### Mode 7 Renderer *(experimental)*

A specialized renderer to simulate SNES-style pseudo-3D backgrounds, reminiscent of classic games like F-Zero or Mario Kart.
