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

### Utilities

A collection of helper functions and classes for common tasks: vector math, collision detection, color manipulation, and more.

### Debugging Tools

Optional debug drawing for physics bodies and an FPS/stats overlay to assist during development.

### Mode 7 Renderer *(experimental)*

A specialized renderer to simulate SNES-style pseudo-3D backgrounds, reminiscent of classic games like F-Zero or Mario Kart.
