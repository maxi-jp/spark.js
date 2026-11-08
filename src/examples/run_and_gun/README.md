# Cyber Commando: Project Spark

A full-featured side-scrolling run-and-gun arcade game (in the tradition of *Contra*, *Metal Slug*, and *Gunstar Heroes*) built with **spark.js**.

Zero build tools. Zero npm dependencies. Pure JavaScript and HTML5 Canvas.

---

## 🕹️ Gameplay & Controls

| Action | Keyboard | Gamepad | Mobile Touch |
|---|---|---|---|
| **Move Left / Right** | `A` / `D` or `←` / `→` | Left Stick / D-Pad | Virtual Joystick |
| **8-Way Aim** | `W` / `S` / `A` / `D` or Arrows | Left Stick / D-Pad | Virtual Joystick |
| **Jump** | `K` / `X` / `Space` | Button `A` (Face Down) | On-screen "JUMP" button |
| **Drop Down Platforms** | `S` + Jump | Down + Button `A` | Down + "JUMP" |
| **Crouch / Duck** | Hold `S` / `↓` on ground | Hold Down | Drag Joystick Down |
| **Fire Weapon** | `J` / `Z` / Left Click | Button `X` / `RB` | On-screen "FIRE" button |
| **Mute / Unmute Audio** | `M` | — | — |

---

## 🔫 Weapon Arsenal & Power-ups

Shoot down flying item carrier blimps to collect spinning weapon capsules:

- **[R] Assault Rifle**: Standard rapid-fire rifle with infinite ammunition.
- **[S] Spread Gun**: Iconic 5-way fan spread shot that obliterates oncoming enemy infantry and airborne threats.
- **[M] Heavy Machine Gun**: High-velocity vulcan stream with devastating rapid-fire rate.
- **[L] Piercing Laser**: High-energy neon beam that cuts through multiple consecutive enemies.
- **[G] Grenade / Rocket Launcher**: Heavy projectile with smoke trail and explosive area-of-effect blast damage.
- **[B] Barrier Shield**: 10 seconds of invulnerability with an energetic deflector shield.

---

## ⚔️ Enemy Forces & Hazards

1. **Grunt Soldiers**: Cyborg infantry running along platforms, jumping down, and firing aimed rifle bursts.
2. **Sniper Turrets**: Fortified stationary emplacements with 360-degree tracking barrels firing heavy plasma bolts.
3. **Flying Drones**: Sinuous aerial drones patrolling overhead and dropping bombs when positioned above the player.
4. **Explosive Barrels**: Red TNT barrels that detonate when shot, triggering chain reactions that wipe out surrounding enemies.

---

## 🤖 Boss Encounter: "MECHA-COLOSSUS MK-IV"

A multi-phase armored mechanical battle walker at the end of Stage 1:

- **Phase 1: Armored Defense**:
  - **Top Rocket Launcher Pod**: Launches salvos of 3 arcing missiles. Destroyable separately.
  - **Bottom Plasma Cannon Arm**: Sweeps deadly plasma beams across the floor. Destroyable separately.
  - **Armored Chassis**: Heavy defensive carapace protecting the primary reactor.
- **Phase 2: Core Overdrive (Under 50% HP)**:
  - Carapace breaks off in smoke and fire.
  - Alarms blare as the glowing plasma core exposes itself.
  - Fires 7-way spread barrages, continuous targeting laser salvos, and high-arc mortar rain.
- **Defeat**: Cascading chain explosions, slow-motion freeze, and victory fanfare leading into the "MISSION ACCOMPLISHED" score breakdown.

---

## ⚡ Spark.js Systems Utilized

- **Rendering Engine** (`renderer.js`): Canvas 2D and WebGL-compatible procedural sprite rendering.
- **Camera System** (`gameobjects.js` -> `FollowCamera`): Smooth player tracking, anti-backtracking clamp, and dynamic screen shake (`camera.Shake(...)`).
- **Object Pooling** (`gameobjects.js` -> `Pool`): High-frequency pre-allocated recycling for player bullets, enemy bullets, mortar shells, spark particles, and power-up capsules using the engine's built-in `Pool` class.
- **Web Audio Synthesizer** (`audio.js`): Authentic 16-bit procedural sound effects (jump, fire, spread blast, laser, rocket whoosh, explosions, siren, boss defeat, jingles) with zero external audio files.
- **Input Actions & Axes** (`input.js` & `virtualcontrols.js`): High-level `Input.RegisterAxis` and `Input.RegisterAction` bindings unifying keyboard, mouse, gamepad, and mobile virtual controls.
- **Multi-Layer Parallax** (`stage.js`): Dual-layer depth parallax (far neon cyberpunk city + midground industrial refineries) scrolling smoothly behind foreground platforms.

