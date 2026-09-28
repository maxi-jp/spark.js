# spark_RTS Project - Game Design Document (GDD)

## 1. Concept Overview
A real-time strategy (RTS) game in the vein of *Age of Empires*. The player gathers resources, constructs a base, researches technologies, trains an army, and commands units to defeat rival factions.

**Core Loop:**
Explore Map -> Gather Resources -> Expand Base -> Train Army -> Destroy Enemy.

### 1.0 Development Philosophy: Iterative Showcase
This project is an **engine demonstration**, not a commercial RTS. Development will follow a strict **"simplest functional version first"** approach:

**Iteration Strategy:**
- **Phase Goal**: Get one vertical slice working before adding breadth
- **No Placeholder Systems**: Every feature implemented must be fully functional (no "TODO" systems)
- **Performance Monitoring**: Track FPS/memory, but don't over-optimize until needed
- **Simplest Rules First**: Start with basic formulas, add complexity only if showcase requires it
- **Visual First**: If a feature isn't visible/audible, it has lower priority

**Version Markers Used Throughout:**
- **V1 Core**: Minimum playable RTS (Player vs AI, one match start to finish)
- **V1.x Polish**: Engine showcase features (particles, audio, minimap, polish)
- **V2 Future**: Expansions beyond showcase scope (campaigns, more factions, advanced AI)

### 1.1 Player Fantasy & Design Pillars
The game aims to capture the nostalgic, methodical pacing of classic 90s RTS games. The first 10 minutes should evoke a feeling of "quiet expansion" — starting with a small group of villagers in an unexplored wilderness, establishing an economic engine, and gradually transitioning into the tension of scouting and early skirmishes.

**Design Pillars:**
*   **Clarity over Clutter:** Visuals and UI must instantly communicate unit roles, selection states, and economy health.
*   **Deliberate Pacing:** Movement, gathering, and building take time. Tactical positioning and base layout matter more than APM (Actions Per Minute).
*   **Engine as the Star:** Every mechanic is explicitly designed to showcase a feature of `spark.js` (e.g., A* pathfinding, pooling, audio, canvas rendering).

### 1.2 Scope & Non-Goals
Because RTS games can easily explode in scope, and this project is primarily an engine showcase for `spark.js`, we explicitly define the boundaries. We divide the project goals into **Core Gameplay V1** (the minimum playable RTS slice) and **Showcase & Polish V1.x** (features explicitly added to demonstrate engine capabilities, such as particle systems and minimaps).

**V1 / V1.x does NOT include:**
*   **Multiplayer / Networking:** Strictly single-player against a local AI.
*   **Save/Load Functionality:** Matches are meant to be played in a single session.
*   **Campaign Mode:** Standard 1v1 skirmish mode only.
*   **Multiple Maps or Procedural Generation:** A single, predefined map loaded via `TiledLoader` will be used.
*   **Diplomacy & Trading:** Strictly 1v1 combat; no allied factions or market mechanics.
*   **Naval Units:** Land-based units and combat only.
*   **Terrain Deformation / Elevation:** Map geometry is flat and static.
*   **Advanced AI:** The opponent uses a basic macro-level state machine, not a dynamic learning or highly reactive AI.
*   **Garrisoning:** Units cannot enter buildings for protection or healing.
*   **Multiple Factions:** V1 implements a single base civilization template. Distinct asymmetrical factions are excluded.
*   **Advanced Units & Structures:** Cavalry, Spearmen, Siege engines, and Constructed Farms are excluded to keep the initial roster compact.
*   **Advanced Commands:** Military commands like Patrol, Guard, and complex group formations are excluded.
*   **Fog of War Memory:** All enemy entities (including static buildings) disappear completely in the Fog of War; visualizing their "last known state" is excluded.

---

## 2. Gameplay Mechanics

### 2.1 Match Lifecycle & Win/Lose Conditions
*   **Match Format:** Standard 1v1 (Player vs. AI).
*   **Win Condition:** Destroy the opponent's Town Center.
*   **Lose Condition:** The player's own Town Center is destroyed.
*   **Edge Cases & Soft-Locks:**
    *   *Economic Soft-Lock:* If a player loses all Villagers and lacks the food to train more, they are economically defeated. However, V1 does not force an auto-resign; the match continues until the Town Center is destroyed. *(V1.x could add a "You have no Villagers" warning notification).*
    *   *Army Wipe:* If a player loses all military units while the enemy's base stands, they must scramble to train more with their remaining economy.
    *   *Resource Exhaustion:* All map resources are strictly finite. If the map is completely mined out, the match enters a sudden-death attrition phase using only remaining forces.
*   **Match States:**
    *   *Game Start:* Map parses via `TiledLoader`, starting entities (Town Centers, Villagers) spawn, and faction resources initialize.
    *   *Game Running:* The core simulation and input loops are active.
    *   *Victory / Defeat:* Triggered immediately when a Town Center reaches 0 HP. Unit commands are halted, audio fanfares play, and the HTML UI results overlay appears.
    *   *Restart:* The player can click "Play Again" on the results screen to instantly restart the match without refreshing the browser page.
*   **Engine Stress Test (Memory Cleanup):** The in-game restart mechanic serves as a crucial stress test for `spark.js` memory management. To restart successfully without memory leaks or ghost behaviors, the implementation must cleanly:
    *   Call `game.DestroyAllGameObjects()` to clear all active entities and tilesets.
    *   Ensure all `Invoke` and `InvokeRepeating` timers attached to the Game class are canceled.
    *   Call `DisableAll()` on all `Pool` instances (projectiles, particles).
    *   Reset the `Macro-AI` state machine and `SelectionManager` control groups.
    *   Clear and rebuild the `GridMap` arrays and Fog of War data.
    *   Reset transient event state and remove `GameEventBus` subscriptions belonging to the previous match, while ensuring persistent engine systems (like the HUD and Audio) remain correctly subscribed.

### 2.2 Economy & Resources
*   **Wood:** Gathered from trees. Used for basic buildings and ranged units.
*   **Food:** Gathered from natural resource nodes (bushes, animals). Used to train units (Villagers, Infantry). *(Note: Constructed Farms are scoped for future extensions).*
*   **Gold:** Gathered from mines. Used for advanced units and upgrades.
*   **Stone:** Gathered from natural quarry nodes already present on the map. Used for defensive structures (Towers, Walls).

**Economy Rules & Mechanics:**
*   **Starting State:** 1 Town Center, 6 Villagers, 200 Food, 100 Wood, 0 Gold, 0 Stone.
*   **Resource Nodes:** All natural resources (trees, bushes, mines) are finite. When a node's resource amount reaches 0, the entity is destroyed and removed from the map.
*   **Gathering Rate:** Villagers gather at a base rate (e.g., 1 resource per second), which can be increased via tech upgrades.
*   **Carry Capacity:** Villagers can carry a maximum amount of a single resource type (e.g., 10 units). Once full, they automatically move to the nearest valid drop-off building.
*   **Drop-off Mechanics:** Resources are only added to the player's bank when the Villager deposits them at a Town Center or respective Resource Camp.
*   **Auto-Resume:** After dropping off, Villagers will automatically return to the nearest available node of the same type to continue gathering.
*   **Node Crowding:** Multiple Villagers can gather from the same node, but they will use the collision system to push each other, inherently creating a small efficiency penalty if too many crowd a single tree or bush.
*   **Resource Allocation & Reservation:** When a unit, technology, or building placement is queued, its cost is checked and **immediately subtracted** from the player's bank. If the action is canceled before completion, the resources are fully refunded. *(Note: If a building foundation is destroyed by an enemy, the resources are lost).* This strict reservation system prevents double-spending and simplifies the macro-AI logic.
*   **Death Resource Loss (V1 Simple Rule):** When a Villager dies while carrying resources, those resources disappear entirely. *(V2: Could drop as collectable pickup).*

**Resource Node Quantities (V1 Map Balance):**
| Node Type | Resources per Node | Nodes per Starting Base | Nodes in Contested Center | Total Map Resources |
|-----------|-------------------|------------------------|--------------------------|--------------------|
| **Tree** | 100 Wood | ~30 trees | ~20 trees | ~5000 Wood |
| **Food Bush** | 150 Food | 4 bushes | 2 bushes | ~900 Food |
| **Gold Mine** | 800 Gold | 1 mine | 2 mines | ~3200 Gold |
| **Stone Quarry** | 600 Stone | 1 quarry | 2 quarries | ~2400 Stone |

*Design Note: Total resources allow for approximately 15-20 minutes of continuous economy before exhaustion forces decisive combat.*

### 2.3 Ages & Progression
The age factor greatly impacts game progression. Players start in Age 1 and can advance up to Age 4.
*   **Advancement:** To reach the next age, players must meet specific resource and building requirements, which vary depending on the chosen faction and current age.
*   **Trigger:** Age advancement is treated as a major research technology initiated at the main base (Town Center).
*   **Benefits:** Reaching a new age unlocks advanced units, stronger buildings, and powerful upgrades.
*   **Tech Tree:** Buildings can research specific upgrades (e.g., Blacksmith for +1 damage, Lumber Camp for +20% wood gathering speed) that apply globally to the player's faction.

**V1 Age Progression (Simplified):**
| Age | Cost | Build Time | Required Buildings | Key Unlocks |
|-----|------|-----------|-------------------|-------------|
| **Age 1** (Dark Age) | — | — | — | Villager, House, Town Center |
| **Age 2** (Feudal) | 500 Food | 60s | None | Barracks, Lumber Camp, Infantry |
| **Age 3** (Castle) | 800 Food, 200 Gold | 90s | Barracks | Archery Range, Archer, Infantry Upgrade |
| **Age 4** (Imperial) | *V1.x Extension* | — | — | Elite units, advanced techs |

*V1 Design Note: Only Ages 1-3 are required for the core loop. Age 4 is reserved for V1.x polish if time permits.*

### 2.4 Factions
*(Note: Multiple distinct factions are scoped for future extensions. For V1, we will implement a single base template).*

### 2.5 Unit Types (V1 Base Roster)
*   **Villager:** Worker unit. Can gather resources, construct buildings, and repair. Weak in combat.
*   **Infantry:** Basic melee combatant. Good general-purpose fighter and effective against buildings.
*   **Archer:** Ranged combatant. High damage, low health. Uses projectiles.

*(Note: Advanced units such as Cavalry, Spearmen, and Siege engines are scoped for future extensions to keep V1 compact).*

### 2.6 Building Types
*   **Town Center:** Drops off all resources, trains Villagers. If destroyed, the player is severely crippled.
*   **House:** Increases population cap.
*   **Barracks:** Trains Infantry.
*   **Archery Range:** Trains Archers.
*   **Resource Camps (Lumber/Mining):** Drop-off points for Wood, Gold, and Stone. *(Note: To keep V1 simple, Food is exclusively dropped off at the Town Center).*

---

## 3. Core Systems

### 3.1 Selection & Input (Control Scheme)
The game employs a classic *Age of Empires* style control scheme, emphasizing quick macro-management and precise unit micro.

**Mouse Controls:**
*   **Left Click:** Selects a single friendly unit or building. Clicking on empty terrain clears the current selection. *(Note: Enemy entities are not selectable in V1).*
*   **Double-Click (Left):** Selects all friendly units of the exact same type currently visible on the screen.
*   **Left Click & Drag (Box Selection):** Exclusively selects friendly mobile units (Villagers and Military) within the drawn box. Buildings are ignored. **V1 Selection Limit:** 60 units max (engine showcase constraint, not a feature).
*   **Right Click:** Context-sensitive command (Move to terrain, Gather resource, Attack enemy, Build foundation, Repair building).
*   **Mixed Selection & Right-Click Resolution:** When a mixed group (Villagers + Military) is selected, right-click actions resolve intelligently: clicking an enemy commands all to Attack; clicking a resource or construction site commands Villagers to Gather/Build while Military units execute a Move command to guard the location.
*   **Shift + Command (Right Click):** Adds the issued command to the unit's task queue (e.g., "Build a house, *then* move to the forest"). Crucial for advanced Villager management.

**Visual Command Feedback (V1.x Polish):**
*   V1 Core: Basic right-click targeting works, no visual indicators beyond unit movement.
*   V1.x Additions:
    *   Green checkmark particles on ground where Move command was issued.
    *   Red crosshair particles when issuing Attack commands.
    *   Cursor changes icon when hovering enemies (sword) vs resources (tool) vs terrain (arrow).
    *   Waypoint trail visualization for Shift-queued commands.

**Keyboard Hotkeys & Shortcuts:**
| Hotkey | Action | Context / Requirement |
| :--- | :--- | :--- |
| **`A`** | Attack-Move | Press `A`, then Left-Click terrain to issue an `AttackMoveCommand`. |
| **`S`** | Stop | Halts the selected unit(s), clears their command queue, and returns them to `Idle`. |
| **`B`** | Build Menu (Economic) | Opens the Economic building menu (Houses, Camps) when a Villager is selected. |
| **`V`** | Build Menu (Military) | Opens the Military building menu (Barracks, Ranges) when a Villager is selected. |
| **`Escape`** | Cancel / Deselect | Closes menus, cancels building placement, cancels an incomplete building foundation (refunding cost), or clears the current selection. |
| **`Delete`** | Scuttle / Destroy | Destroys the currently selected allied unit or building. |
| **`.` (Period)** | Select Idle Villager | Selects and centers the camera on an inactive Villager. |
| **`,` (Comma)** | Select Idle Military | Selects and centers the camera on an inactive Military unit. |
| **`H`** | Select Town Center | Selects the Town Center and snaps the camera to it. |
| **`Ctrl` + `[0-9]`** | Create Control Group | Binds the currently selected units **or buildings** (e.g., binding Barracks for quick production) to the chosen number key. |
| **`[0-9]`** | Select Control Group | Selects the previously bound group of units or buildings. |
| **Double-tap `[0-9]`** | Snap to Control Group| Selects the bound group and snaps the camera to their location. |
| **`Shift` + Click/Drag** | Add to Selection | Adds newly targeted units to the existing selection instead of clearing it. |

### 3.2 Map Structure & Pathfinding (V1 Core)

**V1 Simplification Strategy:** Start with basic A* and grid collision. Add optimizations only if performance drops below 60 FPS with 50 units.
*   **Coordinate System Conventions:**
    *   **Grid Scale:** 1 Grid Cell = 32x32 pixels. Internal pathfinding and map state logic operate on integer coordinates (e.g., `col 5, row 10`), while game objects and rendering operate on pixel coordinates (e.g., `x: 160, y: 320`).
    *   **World Origin:** `(0, 0)` is the absolute top-left corner of the map.
    *   **Entity Alignment:** Buildings are top-left aligned to the pixel grid to simplify multi-cell footprint placement and grid reservations. Mobile units are center-aligned (logical `position` represents their center of mass/feet) to ensure smooth A* movement and accurate radius-based collision.
*   **Top-Down 2D Grid & Tileset:** The map is rendered in a standard top-down 2D perspective using the engine's `Tileset` class. Terrain is divided into a uniform square cell matrix of nodes (e.g., grass, water, cliffs). This keeps coordinate and placement logic straightforward for V1.
*   **Grid Node Properties:** Rather than mutually exclusive states, each grid cell tracks independent properties to provide maximum flexibility (e.g., decorative terrain might be walkable but not buildable):
    *   `walkable`: Boolean. True if units can move through this cell.
    *   `buildable`: Boolean. True if structures can be placed here.
    *   `occupied`: Boolean. True if a dynamic entity currently claims this cell. (An occupied cell temporarily blocks pathfinding and construction, regardless of base terrain).
    *   `terrainType`: String/Enum. The underlying base terrain (e.g., grass, water, cliff).
    *   `occupant`: Reference. Points to the specific `Entity` (e.g., `Building` or `ResourceNode`) occupying the cell, enabling instant lookup for interactions.
*   **A* Algorithm (A-Star):** Pathfinding operates on the square 2D grid. The algorithm calculates the shortest path while avoiding natural obstacles (water, cliffs) and dynamic obstacles (placed buildings). The navigation grid updates dynamically when buildings are constructed or destroyed.
*   **Path Caching (V1.x Optimization):** Initially, recalculate paths on every blocked node. If performance suffers, add path caching and invalidation on grid changes.
*   **Pathfinding Edge Cases (V1 Simple Rules):**
    *   **Dynamic Blocking:** If a unit's path is blocked by a new building, recalculate immediately (no waiting).
    *   **Unreachable Destination:** If A* fails to find a path, the unit moves to the closest reachable cell and stops (no infinite retry loop).
    *   **Stuck Unit Recovery:** If a unit hasn't moved in 5 seconds while pathing, clear command and return to Idle. *(Acceptable for V1 showcase).*
    *   **Chokepoint Congestion:** Units will naturally queue due to collision. No special flow field logic for V1.
    *   **Path Smoothing:** V1 uses raw A* waypoints (no funnel algorithm). *(V1.x: Add smoothing if paths look too jagged).*
*   **Local Avoidance:** Simple steering behaviors (like separation) ensure units don't clump perfectly on top of each other when moving in groups or converging on a target.
*   **Group Movement & Formations (V1):** Moving multiple selected units uses a simple destination allocation strategy. When a group move is issued: *Calculate a basic grid of formation slots around the target destination -> Assign one unique slot per unit -> Each unit independently uses A* to navigate to its slot*. The slots are spaced using the units' `selectionRadius` multiplied by two plus a small padding buffer. Upon arrival, all units snap to face the average direction of travel. Strict maintaining of rigid military formations during transit is excluded for V1.
*   **Map Specification (V1 Predefined Map):** To faithfully emulate the *Age of Empires* experience while providing a robust testbed for the engine, the V1 map will be designed in Tiled with the following parameters:
    *   *Dimensions:* 128x128 cells. This provides a substantial 1v1 arena that thoroughly exercises camera panning, A* performance across long distances, and the rendering pipeline.
    *   *Symmetry & Layout:* "Natural Symmetry". Start locations and total resource values are perfectly mirrored for competitive fairness, but terrain contours (forest shapes, cliff edges) vary slightly to feel organic and natural.
    *   *Starting Positions:* Players start at opposite corners (e.g., Top-Left vs. Bottom-Right). Each base includes a standard, safe economic cluster: the Town Center, close Food (bushes), a primary Gold mine, a primary Stone quarry, and a nearby Woodline.
    *   *Contested Zones:* The center of the map holds extra, heavily contested Gold and Stone nodes to force mid-to-late game map control conflicts.
    *   *Terrain Features:* The map explicitly includes dense, impassable forests, unbuildable water bodies, and winding cliff formations. These elements intentionally create natural chokepoints and labyrinthine valleys to stress-test the A* algorithm, unit local avoidance in tight spaces, and the visual unveiling of the Fog of War.

### 3.3 Combat
*   **Entity & Unit Ranges:** Distinct radii govern visibility and combat behavior across different entity types:
    *   `visionRadius` (All Entities): The distance up to which the entity (unit or building) clears the Fog of War, making cells **VISIBLE**.
    *   `attackRange` (Military Units): The maximum distance at which the unit can execute its attack (melee is effectively adjacent, ranged varies).
    *   `aggroRange` (Military Units): The distance within which an Idle or Gathering unit will autonomously acquire a hostile target.
*   **Targeting & Aggro Logic:**
    *   *If Idle/Gathering:* Units scan for the nearest hostile target within their `aggroRange`. Crucially, the target must also reside in a currently **VISIBLE** Fog of War cell (an *EXPLORED* cell is not sufficient). If attacked, units will automatically retaliate against the attacker.
    *   *If Attacking:* Units continue attacking their current target unless: the target dies, the target leaves the `leashRange` (typically `aggroRange * 1.5`), or a new player command is issued. If a target is lost, the unit reverts to Idle logic.
    *   *Target Priority:* Military units automatically prioritize enemy military entities over buildings and villagers unless explicitly commanded otherwise by the player.
*   **Attack Semantics & Range:** Melee units must reach adjacency (colliders touching) to attack. Ranged units fire from within their `attackRange`. Attacks execute on an interval based on the unit's `attackRate`. Issuing a new command (like Move) immediately interrupts the attack cycle.
*   **Attack Animation Timing (V1):** Damage is applied at the **midpoint** of the attack animation. Use `Invoke()` with half the animation duration to trigger damage/projectile spawn. *(Example: 1.5s attack animation → damage at 0.75s mark).*
*   **Overkill Prevention (V1.x Polish):** V1 allows overkill (all targeting archers will shoot). V1.x can add target health checking before firing.
*   **Projectiles:** Use the engine's `Pool` system. They have a fixed `speed` and, for V1, track the moving target perfectly (no missing). Damage is applied when the projectile intersects the target's `CircleCollider`.
*   **Damage & Armor Formula (V1 Simplified):** Uses a simple minimum-clamped subtraction system: `Actual Damage = max(1, Base Damage - Target Armor + Bonus Damage)`.
*   **Bonus Damage (V1):** Applied via lookup: `unit.bonusDamage[targetArmorType] || 0`. Example: Infantry have `bonusDamage = { building: 2 }`, so they deal `baseDamage + 2` vs structures.

### 3.4 Fog of War (Grid-Based Visibility)
The fog of war operates on a data model utilizing the map grid, demonstrating an efficient grid-based visibility system in `spark.js`. Each cell tracks its visibility state per player:
*   **UNEXPLORED:** The cell is completely black. Neither terrain nor entities are rendered.
*   **EXPLORED:** The terrain is visible (drawn), but enemy entities and dynamic changes are hidden. This state is applied when a cell was previously VISIBLE but no longer has allied units nearby. *(Note: Visualizing the "last known state" of enemy structures in the Fog of War is scoped for future extensions).*
*   **VISIBLE:** The cell is actively within the vision radius of an allied unit or building. Both terrain and all entities (allied and enemy) are rendered.

### 3.5 Unit Hierarchical Finite State Machine (HFSM) & Command System
Units operate using a **Hierarchical Finite State Machine (HFSM)** driven by a generic **Command** model. Instead of hardcoding monolithic behaviors, the HFSM separates universal unit logic from role-specific actions. The input system generates `Command` objects that the active state interprets and executes in the `Update(deltaTime)` loop.

*   **Animation State Mapping:** To ensure visual feedback remains perfectly synchronized with gameplay logic, the unit's active HFSM state strictly dictates its playing animation via the engine's `SSAnimationObjectComplex`. State transitions automatically trigger the corresponding animation:
    *   `Idle` → Idle animation.
    *   `Moving` / `Attack-Moving` → Walk animation.
    *   `Gathering` → Gather animation (can be context-sensitive, e.g., chopping wood vs. mining gold).
    *   `Building` / `Repairing` → Build animation.
    *   `Attacking` → Attack animation (damage application or projectile spawning is paced with this animation cycle).
    *   `Dead` → Death animation (plays once and pauses on the final frame).

*   **Command Queue:** Units maintain a `currentCommand` and a `commandQueue[]` array. Holding `Shift` pushes new commands to the queue instead of overwriting `currentCommand`. When a command finishes, the unit pops the next one.

*   **Base FSM (Shared across ALL units):**
    *   **Idle:** Default state (e.g., executing a `Stop` command). The unit stands still.
    *   **Moving:** Executing a `Move` command. The unit traverses the A* path array, handling local avoidance. Transitions to Idle upon arrival.
    *   **Dead:** Triggered when health reaches 0. Plays death animation, drops aggro, clears command queues, and defers to `game.Destroy(this)`.

*   **Villager HFSM (Extends Base):**
    *   **Gathering:** Executing a `Gather` command. A complex sub-loop: *Move to Node -> Extract Resource -> Move to Drop-off -> Deposit -> Return to Node*.
    *   **Building/Repairing:** Executing a `Build` or `Repair` command. *Move to Construction Site -> Perform Build Action -> Increase Progress -> Finish*.

*   **Military HFSM (Extends Base):**
    *   **Attack-Moving:** Executing an `AttackMove` command. The unit traverses the path exactly like in `Moving`, but continuously scans for enemies within its `aggroRange`. If a valid enemy is found, it transitions to `Attacking` until the target is dead or out of leash range, then seamlessly resumes the `AttackMove` toward the original destination.
    *   **Attacking:** Executing an `Attack` command, or automatically triggered from `Idle` if an enemy enters aggro range. *Move into Range -> Perform Attack Action -> Deal Damage / Spawn Projectile -> Repeat*.

*(Note: Advanced RTS military commands such as Patrol and Guard are scoped for future extensions).*

### 3.6 Building Production & Queues
*   **Production Queue:** Buildings can queue up to 5 units or technologies at a time. Resources are paid upfront upon entering the queue. Tasks are processed sequentially using the engine's timer system. Canceling an item in the queue refunds its cost and shifts the remaining items forward.
*   **Population Reservation:** Population capacity is consumed as soon as a unit enters the production queue. If the queue item is canceled or the building is destroyed, the population space is freed. This prevents players or AI from bypassing the population cap by queueing multiple units right before reaching the limit.
*   **Rally Points:** Right-clicking the terrain while a building is selected sets a `rallyPoint` Vector2. Newly spawned units will automatically receive a "Move" command to this location.
*   *(Note: Garrisoning units inside buildings is scoped for future extensions).*

### 3.7 Building Placement & Construction Mechanics
Proper grid management is essential for pathfinding and base building.
*   **Footprint & Terrain:** A building's entire grid footprint (e.g., 3x3 cells) must consist exclusively of nodes where `buildable` is true and `occupied` is false. Buildings cannot overlap resources, cliffs, water, or other structures.
*   **Grid Reservation:** When a building placement is confirmed by the player, its footprint's cells are *immediately* marked with `occupied = true` and `occupant = this`.
*   **Resource Payment:** The full construction cost is deducted from the player's bank the exact moment placement is confirmed.
*   **Concurrent Orders:** The player (or AI) can place multiple building foundations simultaneously as long as they have the upfront resources.
*   **Incomplete Structures & Health:** A newly placed building foundation starts at 1 HP. As Villagers work on it, its health increases proportionally with its construction progress until it reaches 100%.
*   **Multi-Villager Construction (V1):** Multiple Villagers can build the same foundation. Construction speed formula: `progressPerSecond = baseRate * numActiveBuilders`. *(Example: 1 Villager = 30s, 3 Villagers = 10s).* V1 uses linear stacking with no diminishing returns.
*   **Construction & Repair Mechanics (V1):**
    *   **Build:** Costs nothing beyond initial placement. Increases both construction progress and current HP simultaneously.
    *   **Repair:** Costs 50% of original resources proportional to missing HP. Only available on completed buildings. Uses same rate as construction.
    *   **Visual Feedback:** V1 uses a simple progress bar above the building. *(V1.x: Add scaffolding sprites or particle effects).*
*   **Attacking Foundations:** Enemies can target and attack unfinished buildings. If the foundation's health drops to 0, it is destroyed, the grid footprint is freed, and the initial cost is **lost entirely** (no refund). This ensures that defending construction sites is economically important.
*   **Cancellation:** The player can manually select an incomplete building and issue a "Cancel" command. The foundation is instantly destroyed, the grid freed, and the cost fully refunded.
*   **Damaged Construction:** If a foundation takes damage while being constructed, Villagers will continue their "Build" command until the construction progress reaches 100%. The building will finish incomplete in health (Max Health minus the damage taken) and will require a separate "Repair" command (costing additional resources) to restore to full HP.
*   **Pathfinding Interaction:** Partially constructed buildings block movement exactly like finished buildings. Villagers cannot walk through construction sites; they must stand adjacent to the footprint to build.
*   **Spacing:** There is no strict minimum distance rule between buildings. Adjacency to the Town Center or other structures is permitted as long as the footprint is clear. However, players must leave at least 1 cell of Walkable space if they want units to navigate between them.

### 3.8 AI Opponent (Macro-AI)
To demonstrate that the engine supports fully autonomous players, the computer opponent will utilize a simplified macro-AI state machine. It does not cheat; it interacts with the game by issuing the exact same `Command` objects to its units as a human player would.
*   **Strict Architectural Separation:** The AI acts purely as an input controller (`Decision making -> Commands -> Normal game systems`). It evaluates the game state to generate commands, but is strictly forbidden from directly manipulating resources, altering entity properties, or bypassing standard game mechanics. This perfectly demonstrates the game architecture's separation of decision-making from execution.
*   **Macro-AI Loop:** Every 3 seconds, the AI evaluates its state and issues commands: *Gather* (assign idle villagers), *Build* (place structures if resources allow), *Produce* (queue units), *Research* (queue upgrades), and *Attack*.

**V1 AI Rules (Simple but Functional):**

*   **Villager Management:**
    *   Target distribution: 40% Wood, 40% Food, 10% Gold, 10% Stone.
    *   Assign idle Villagers to nearest underworked resource type.
    *   Continuously train Villagers until population 30 or military phase begins.
    
*   **Building Placement (V1 Simple):**
    *   Houses: Place adjacent to Town Center in a spiral pattern when population is within 3 of cap.
    *   Resource Camps: Place at the closest valid cell next to the largest resource cluster.
    *   Military Buildings: Place in a designated "production zone" near the Town Center (first valid 5x5 grid area).
    *   No defensive positioning or wall construction in V1.
    
*   **Progression Triggers:**
    1.  **Economy Phase** (0-5 min): Villager count < 20 → Train Villagers, build Houses.
    2.  **Age 2 Trigger** (5-8 min): Food ≥ 500 → Research Age 2, build Barracks.
    3.  **Military Phase** (8-12 min): Age 2 complete → Build Archery Range, train Infantry (60%) + Archers (40%) continuously.
    4.  **Age 3 Trigger** (10-12 min): Food ≥ 800 AND Gold ≥ 200 → Research Age 3.
    5.  **Attack Phase** (12+ min): Military unit count ≥ 15 → Issue `AttackMoveCommand` to player's last known Town Center location.
    
*   **Combat Behavior (V1):**
    *   No micro-management (units use default aggro/attack logic).
    *   If entire army is wiped: Return to Military Phase, rebuild to 10 units, attack again.
    *   No retreating or tactical positioning.
    
*   **Scouting (V1.x):** V1 skips dedicated scouts. AI discovers resources naturally via Villager movement. *(V1.x: Send one Villager to explore at game start).*

*   **Progression Flow:**
    1.  **Early Game:** Focus heavily on Food/Wood. Continuous Villager production. Build Houses to avoid population caps.
    2.  **Economy:** Construct Resource Camps. Reach a target Villager threshold.
    3.  **Age Up:** As soon as resource and building requirements are met, research the next Age.
    4.  **Military Production:** Transition resource focus to Gold/Wood/Food. Build Barracks/Archery Ranges and continuously train combat units.
    5.  **Attack:** Once the military unit count reaches a specific threshold, issue an `AttackCommand` or `AttackMoveCommand` for the entire army targeting the enemy Town Center.

### 3.9 Camera & Viewport
As a primary demonstration of the engine's 2D coordinate system and `Camera` class, the viewport management includes:
*   **Movement Controls:** Edge-panning, directional Arrow keys, and Middle-mouse drag (click and hold to pan the world). Edge-panning triggers within a defined dead-zone margin (e.g., 20px) of the screen boundaries, utilizing an acceleration curve rather than instant max speed for a smoother UX.
*   **Camera Speed:** A defined base movement speed (e.g., 800 pixels/second) applied via `deltaTime` and scaled by the current zoom level to maintain consistent perceived panning speed.
*   **Camera Follow & Snapping:** Pressing specific hotkeys (like `H` for Town Center or double-tapping a Control Group) instantly snaps the camera's center to the target. *(Note: Continuous lock-on following of moving units is scoped for future extensions).*
*   **Map Bounds:** The camera's position is strictly clamped to the map's grid dimensions; players cannot scroll beyond the outer edges of the generated terrain.
*   **Zooming:** The mouse wheel adjusts the camera's `scale` property smoothly. Crucially, zooming targets the *current mouse cursor position* rather than the screen center, keeping the player's point of interest securely in view. This is bounded by a `minZoom` (e.g., 0.5x, for a wide base overview) and a `maxZoom` (e.g., 2.0x, for close-up micro-management).
*   **Resolution Adaptation:** Leverages the engine's `Configure({ fillWindow: true, preserveAspectRatio: true })` setup to automatically handle dynamic browser resizing while seamlessly maintaining exact world-to-screen coordinate translations for input clicks.
*   **Touch / Mobile Support:** While V1 is strictly optimized for traditional desktop mouse and keyboard RTS controls, the camera logic will be built leveraging the engine's generic abstractions to anticipate future mobile enhancements (e.g., multi-touch drag-to-pan and pinch-to-zoom).

---

## 4. Engine Integration & Class Architecture

Based on `spark.js`, here is the proposed class structure:

### 4.1 Game Core
*   `RTSGame extends Game`
    *   Manages the map grid, player factions, and global state.
    *   Holds the `Camera` and handles edge-panning logic (moving camera when mouse is at screen edge).

### 4.2 Player / Faction State
*   `Player`
    *   A class managing the overarching state of a participant (human or AI).
    *   **Properties:**
        *   `id`: Number or String (e.g., 1 for Player, 2 for AI).
        *   `faction`: Reference to `Faction Data`.
        *   `resources`: Object tracking current stock (`{ wood: 0, food: 0, gold: 0, stone: 0 }`).
        *   `population`: Current population count (includes active living units AND units currently in production queues).
        *   `populationCap`: Maximum allowed population based on constructed houses/Town Centers.
        *   `age`: Current age level (1 to 4).
        *   `ownedEntities`: Array tracking all living units and buildings belonging to this player. *(Note: This is an indexed cache strictly maintained by the entity lifecycle. When an entity is created or destroyed, it must actively add/remove itself from this list to prevent dangling references).*
        *   `researchedUpgrades`: Array of unlocked technology IDs.

### 4.3 UI & HUD (HTML + Canvas)
The UI is split between HTML/CSS overlays (for screen-space panels) and Canvas rendering (for world-space elements). A strict architectural distinction is maintained between **UI state** (e.g., what the local player currently has selected, build menus open) and **Game state** (the actual deterministic simulation).

*   **HTML/CSS Overlays (`RTSHUD extends HTMLMenu`)**:
    *   **Top Bar:** Displays global player state: current Resources, Population (current/cap), and current Age.
    *   **Bottom Panel:** Displays context-sensitive UI state:
        *   *Selection Info:* Stats and portrait of the currently selected unit(s) or building.
        *   *Commands:* Action buttons (Build, Train, Attack, Stop) that dispatch generic `Command` objects to the selected entities.
        *   *Production Queue:* Icons showing active and queued training/research tasks for the selected building.
    *   **Minimap (Showcase Extension V1.x):** A condensed, interactive view of the explored grid.

*   **Canvas UI (World-Space rendering)**:
    *   **Selection Rectangle:** Drawn by the `SelectionManager` during click-and-drag.
    *   **Selection Rings:** Rendered beneath selected entities in `GameObject.Draw()` using `renderer.DrawStrokeCircle()`.
    *   **Status Bars:** Floating bars above entities to indicate health, drawn via `renderer.DrawFillBasicRectangle()`.
    *   **Construction Progress:** Visual indicators (bars or sprite masking) over unfinished buildings.

### 4.4 Entities (GameObjects)
*   `Entity extends SpriteObject`
    *   Base class for anything selectable and attackable.
    *   **Properties:** `health`, `maxHealth`, `ownerId` (Player 1, Player 2), `selectionRadius`, `visionRadius`.
    *   **Components:** Uses `CircleCollider` or `RectangleCollider` for selection, mouse-click detection, and spacing.

*   `Unit extends Entity`
    *   Movable entities. Contains a State Machine driven by commands.
    *   **Properties:** `currentCommand`, `commandQueue[]`.
    *   **Methods:** `AssignCommand(command, queue = false)`, `ProcessNextCommand()`.
    *   *Note:* Avoid Box2D for standard RTS units as strict physics can break formation pathfinding. We'll use custom kinematic movement based on A* paths.

*   `Building extends Entity`
    *   Static entities. Occupies grid spaces to block pathfinding.
    *   **Timers & Queues:** Maintains an array of queued tasks. Uses `this.Invoke()` based on the `buildTime` of the active task to spawn units or apply upgrades.

*   `ResourceNode extends Entity`
    *   Trees, Gold Veins, etc. Neutral owner. Contains a `resourceAmount`.

### 4.5 Command Architecture
A generic command model separates player input from unit execution. The `SelectionManager` produces these objects based on right-clicks and UI interactions, passing them to the selected units.

*   **Command Lifecycle & Validation:** To prevent the unit's HFSM from becoming cluttered with defensive edge-case checks, every `Command` object manages its own validity. If a command becomes invalid, the unit drops it and transitions back to `Idle`.
    *   `Validate(unit)`: Checks if the command can be started or continued (e.g., does the player have enough resources? Is the target entity still alive? Is the resource node depleted?).
    *   `Execute(unit, deltaTime)`: Applies the actual logic (pathing, attacking, gathering) assuming validation passes.
    *   `Cancel(unit)`: Cleans up any state (e.g., clearing reserved paths or dropping aggro) when a command is interrupted by the player or fails validation.
*   **Edge Case Handling (Validation Failures):**
    *   *Mid-Execution Invalidation:* If a target is destroyed or depleted while a unit is en-route (e.g., an enemy destroys a building foundation while Villagers are walking to it), `Validate()` fails on the next tick. The unit drops the command and seamlessly reverts to `Idle`.
    *   *Pathfinding Failures:* If A* cannot find a valid path to a destination (e.g., completely walled off by terrain and buildings), the command fails validation instantly. If a path is dynamically blocked mid-transit, the unit attempts a recalculation; if still unreachable, the command is dropped.
    *   *Queue Scrubbing:* If a queued command becomes invalid *before* it becomes active (e.g., a shift-queued attack target is killed by another unit), it is silently popped and discarded, and the unit proceeds to the next valid command in the queue.

*   **Command Types:**
    *   `MoveCommand`: Requires `targetVector`. Validation fails if the path becomes completely and permanently blocked.
    *   `AttackCommand`: Requires `targetEntityId`. Validation fails if the target is destroyed, removed, or becomes an invalid type.
    *   `AttackMoveCommand`: Requires `targetVector`. Moves toward the target location while automatically acquiring hostile units encountered along the route.
    *   `GatherCommand`: Requires `resourceNodeId`. Validation fails if the node is depleted/destroyed, or if the unit is full and no valid drop-off exists.
    *   `BuildCommand`: Requires `targetFoundationId`. Validation fails if the foundation is destroyed, fully constructed, or permanently unreachable. *(Note: Resource affordability, grid obstruction, and age requirements are validated and paid during the placement phase, prior to this command being issued).*
    *   `RepairCommand`: Requires `targetBuildingId`. Validation fails if the building is fully repaired or destroyed.
    *   `TrainCommand`: Requires `unitId`. Issued to buildings. Validation fails instantly if the player lacks resources, the population cap is reached, or the age requirements are unmet.
    *   `ResearchCommand`: Requires `upgradeId`. Issued to buildings. Validation fails instantly if the player lacks resources, the upgrade is already researched/queued, or the age requirements are unmet.
    *   `StopCommand`: Clears queues and halts the unit immediately.

### 4.6 Systems & Managers
*   `GameEventBus`
    *   A central publisher/subscriber system to fully decouple game logic from presentation layers and secondary systems.
    *   Instead of hardcoding calls to the audio or particle managers, entities emit events (e.g., `unitDeath`, `buildingCompleted`).
    *   Systems like `AudioPlayer`, `HUD`, `ParticleManager`, and `Macro-AI` subscribe to these events and react independently.

**GameEventBus V1 Implementation:**
```javascript
// Event catalog (V1 Core events)
GameEventBus.Events = {
    UNIT_CREATED: 'unit_created',       // { entity, playerId }
    UNIT_DIED: 'unit_died',             // { entity, killerId, position }
    BUILDING_PLACED: 'building_placed', // { building, playerId }
    BUILDING_COMPLETED: 'building_completed', // { building, playerId }
    BUILDING_DESTROYED: 'building_destroyed', // { building, position }
    RESOURCE_DEPOSITED: 'resource_deposited', // { type, amount, villager }
    TECH_RESEARCHED: 'tech_researched', // { upgradeId, playerId }
    AGE_ADVANCED: 'age_advanced',       // { newAge, playerId }
    MATCH_ENDED: 'match_ended',         // { winnerId, reason }
    UNIT_SELECTED: 'unit_selected'      // { entities[] }
};

// Usage example:
// In Unit.OnDestroy():
GameEventBus.Emit('unit_died', { entity: this, killerId: attacker?.ownerId, position: this.position });

// In AudioPlayer setup (V1.x):
GameEventBus.Subscribe('unit_died', (data) => {
    audioPlayer.PlayAudio(data.entity.deathSound, { pan: CalculatePan(data.position) });
});

// Subscription cleanup for restart:
GameEventBus.transientSubscriptions = []; // Cleared on RestartMatch()
GameEventBus.persistentSubscriptions = []; // UI/Audio systems, survive restarts
```

*   `SelectionManager`
    *   Reads `Input.mouse` to create a selection box (tracking mouse down to mouse up).
    *   Filters `gameObjects` to strictly select friendly `Unit`s inside the box (ignoring buildings and enemies). Handles the `Shift` modifier for additive selection and clears selection if empty terrain is clicked.
    *   Listens for keyboard input (`0-9`) to save and recall unit arrays.
*   `Pathfinder`
    *   Standalone utility class. Given a start and end `Vector2`, returns an array of `Vector2` waypoints.
*   `ProjectileManager`
    *   Uses the engine's `Pool` class to manage arrows and spells efficiently without garbage collection spikes.
    *   `Arrow extends SpriteObject` (activated from Pool, moves towards target, applies damage on impact, returns to Pool).

### 4.7 Data Structures & Configuration
To keep the game easily tunable, core stats for Units, Buildings, Factions, and Ages will be defined in static data objects (e.g., JSON or static JS dictionaries) rather than hardcoded into the classes.

*   **Effective Stats Calculation:** To prevent bugs where one player's research accidentally upgrades the enemy's units (since both might share the same base data definitions), the static data objects are **strictly immutable**. Entities compute their actual gameplay values dynamically (or via a cached modifier state on the `Player` object) using the formula:
    `Effective Stat = Base Stat (from Data) + Faction Modifiers + Player Research Modifiers`.
*   **UnitStats Data:** Defines the immutable base properties of unit types.
    *   `id`: String (e.g., "human_villager")
    *   `name`: String
    *   `cost`: Object (`{ food: 50, wood: 0, gold: 0, stone: 0 }`)
    *   `buildTime`: Number (seconds)
    *   `health`: Number
    *   `visionRadius`: Number (in grid cells or pixels)
    *   `speed`: Number (pixels per second)
    *   `combat`: Object (`{ damage: 3, range: 1, attackRate: 1.5, type: "melee" }`)
*   **BuildingStats Data:** Defines properties for structures.
    *   `id`: String (e.g., "human_barracks")
    *   `cost`: Object (`{ wood: 175 }`)
    *   `buildTime`: Number (seconds)
    *   `health`: Number
    *   `visionRadius`: Number (in grid cells or pixels)
    *   `gridSize`: Vector2 (e.g., 3x3 cells)
    *   `providesPopulation`: Number (e.g., 5 for Houses)
    *   `trains`: Array of unit IDs
    *   `researches`: Array of upgrade IDs
*   **UpgradeStats Data:** Defines technologies.
    *   `id`: String (e.g., "infantry_weapons_1")
    *   `cost`: Object (`{ food: 100, gold: 50 }`)
    *   `buildTime`: Number (seconds)
    *   `effects`: Object defining stat modifiers (e.g., `{ target: "infantry", stat: "damage", value: 1 }`)
*   **Age Progression Data:** Defines requirements and unlocks for reaching new ages.
    *   `ageLevel`: Number (1 to 4)
    *   `name`: String (e.g., "Age 2: Feudal Era")
    *   `cost`: Object (`{ food: 500, gold: 0 }`)
    *   `requiredBuildings`: Array of building IDs (e.g., requires 2 buildings from the previous age)
    *   `unlocks`: Array of unit and building IDs that become available to construct/train.
*   **Faction Data:** Brings everything together for a specific civilization.
    *   `id`: String (e.g., "humans")
    *   `name`: String
    *   `unitRoster`: Dictionary mapping abstract roles to faction-specific `UnitStats` IDs.
    *   `buildingRoster`: Dictionary mapping abstract roles to faction-specific `BuildingStats` IDs.
    *   `ages`: Array of `Age Progression Data` specific to this faction.

### 4.8 Rendering & Engine Showcase Requirements
Since this project serves as a premier showcase for the `spark.js` engine, it must explicitly exercise and validate the following rendering capabilities:
*   **Tile Rendering:** Utilizing the `Tileset` class and `TiledLoader` to render the base map grid (grass, water, cliffs) efficiently.
*   **Sprite Rendering:** Rendering static sprites for structures, resource nodes, and environmental details using `SpriteObject`.
*   **Sprite Animation:** Handling complex, multi-state animations for units (walking, gathering, attacking, dying) using `SSAnimationObjectComplex` and packed sprite-sheet atlases.
*   **Layer/Depth Ordering:** Implementing dynamic Y-sorting (e.g., using `MoveGameObjectToEnd` or custom sorting before `Draw()`) to ensure units appearing "in front" of buildings or other units are drawn correctly.
*   **Selection Indicators:** Using basic shape primitives (`DrawStrokeCircle` or `DrawStrokeRectangle`) rendered under units to indicate selection status cleanly.
*   **Health Bars:** Drawing dynamic, layered UI elements in world-space using `DrawFillBasicRectangle` directly attached to entities.
*   **Projectiles:** Rendering fast-moving, rotated sprites (e.g., arrows) managed by the engine's `Pool` system.
*   **Particles (V1.x):** Integrating the `ParticleSystem` for visual flair (e.g., dust when buildings collapse, blood/sparks in combat, smoke from damaged structures).
*   **Fog Overlay:** A custom world-space overlay or tile-shading system to obscure unexplored/unseen areas, demonstrating grid-based rendering logic.
*   **UI Overlay:** Seamless HTML/CSS integration via `HTMLMenu` layered perfectly over the canvas for menus, HUD, and production queues.
*   **Minimap (V1.x):** A secondary rendering mechanism (or UI abstraction) showcasing the ability to draw a scaled-down representation of the world state and camera viewport.

**V1.x Particle Effects Table:**
| Event | Particle Effect | Implementation |
|-------|----------------|----------------|
| Unit Death (melee) | Blood splatter | 5-8 red particles, gravity, fade |
| Unit Death (ranged) | Generic collapse | 3-5 dust puffs |
| Building Destroyed | Debris burst | 10-15 rock particles, radial explosion |
| Building Completed | Dust poof | Single expanding cloud |
| Tree Depleted | Wood chips | 5-8 brown particles, short arc |
| Projectile Impact | Spark/dust | 3-4 yellow/gray particles |
| Age Advance | Glow aura | Expanding ring from Town Center |

*V1 Core: No particles (focus on gameplay). V1.x: Add after Phase 6 completion.*

### 4.9 Audio System Integration (V1.x Polish)
The game will utilize the engine's `AudioPlayer` to provide feedback and atmosphere. Rather than being hardcoded into gameplay logic, the audio system will subscribe to the `GameEventBus` to trigger sound effects, demonstrating a clean and decoupled architecture.

**Key Audio Events:**
*   `unitSelected`: Voice barks or selection sounds unique to the unit type.
*   `unitCreated`: Audio cue when a unit finishes training and spawns.
*   `buildingCompleted`: Construction finished sound (e.g., ringing a town bell).
*   `attack`: Weapon sounds (sword clash, arrow loose) triggering precisely during the `Attacking` state.
*   `unitDeath`: Death cries and collapsing structure sounds.
*   `ageUp`: Grand, triumphant fanfare when advancing to a new age.
*   `victory` / `defeat`: End-game music and resolution sound effects.

**Engine Showcase Goals:**
*   **Spatial Audio:** Adjusting the `pan` parameter based on the event's world space relative to the `Camera` center (e.g., combat happening on the right edge of the screen will pan right).
*   **Looping & Music:** Using `PlayLoop` for continuous background music.
*   **One-Shot SFX:** Using `PlayFromTheStart` for combat and UI interactions to ensure crisp, overlapping triggers without sudden cutoff.

**V1.x Audio Asset List (Simplified Showcase):**
| Category | Asset | Quantity | Notes |
|----------|-------|----------|-------|
| **Villager** | Selection barks | 3 variations | "Yes?", "Ready", "Awaiting orders" |
| | Task acknowledgement | 3 variations | "Right away", "I'll get to work" |
| | Death sound | 1 | Generic grunt |
| **Infantry** | Selection | 2 variations | Armor clank |
| | Move command | 2 variations | "On my way" |
| | Attack | 2 variations | Sword swing/clash |
| | Death | 1 | Scream |
| **Archer** | Selection | 2 variations | Bow creak |
| | Attack | 2 variations | Arrow loose + whistle |
| | Death | 1 | Scream |
| **Buildings** | Completed | 1 | Bell toll |
| | Destroyed | 1 | Collapse crash |
| **UI/Progression** | Age advance | 1 | Triumphant horn fanfare |
| | Victory | 1 | Epic choir sting |
| | Defeat | 1 | Somber low brass |
| **Ambient** | Background music | 1 loop | Medieval atmospheric (3-5 min loop) |

*V1 Core: No audio. V1.x: Add audio after gameplay is stable.*

---

## 5. Testing & Debugging Tools
Because this project is an engine showcase, built-in visual debugging tools are just as important as the gameplay features. They will accelerate development and demonstrate how to leverage `spark.js` for complex state visualization.

**Debug Mode Toggle:**
When the engine's global `debugMode` flag is active, the `RTSGame` will render the following overlays:
*   **Grid State:** Draw the navigation grid matrix, highlighting cells based on their `walkable`, `buildable`, and `occupied` properties.
*   **A* Paths:** Draw line segments (`renderer.DrawLine`) connecting the waypoint vectors of a selected unit's active path.
*   **Entity Colliders:** Use the engine's built-in `drawColliders: true` config to automatically render all collision and selection hitboxes.
*   **Unit Radii:** Draw colored stroke circles (`renderer.DrawStrokeCircle`) indicating a selected unit's `visionRadius` (blue), `attackRange` (red), and `aggroRange` (yellow).
*   **HFSM State & Command:** Display the unit's active state (e.g., `[State: Gathering]`) and current `Command` type directly above their sprite using a `TextLabel`.
*   **AI State:** Display the current Macro-AI state and strategic objectives (e.g., `[AI: ECONOMY | Goal: AGE_UP]`) on the HUD or floating above the enemy Town Center.
*   **Performance Monitoring:** Ensure the engine's built-in `drawStats` (FPS and frame-time overlay) remains visible to monitor performance during heavy unit counts.

**V1 Performance Targets (Showcase Quality, Not AAA):**
| Metric | Target | Acceptable | Action if Below Acceptable |
|--------|--------|------------|---------------------------|
| **FPS** | 60 | 45 | Profile and optimize hottest code path |
| **50 Units Moving** | 60 FPS | 50 FPS | Enable pathfinding cache |
| **100 Total Entities** | 60 FPS | 45 FPS | Add spatial partitioning for queries |
| **A* Calculation (128x128)** | <5ms | <10ms | Switch to hierarchical A* or flow fields |
| **Fog of War Update** | <2ms | <5ms | Update every other frame instead |
| **Memory Growth** | 0 MB/min | <5 MB/min | Fix entity pooling or event leaks |
| **Restart Test** | 5 clean restarts | 3 restarts | Check timer cleanup and event unsub |

*Philosophy: If performance is acceptable, ship it. Don't over-optimize before proving there's a problem.*

---

## 6. Development Roadmap (Iterative Delivery)

**Guiding Principle:** Each phase must produce a **playable, git-committable build**. No placeholder systems.

**Phase 1: Playable Movement Sandbox** *(~2-3 days)*
*   **Goal:** Prove pathfinding and camera work.
*   Map renders (using `TiledLoader` and `Tileset`).
*   Camera works (edge-panning, arrow keys, zoom).
*   One unit type (Villager sprite) can be selected (click and drag box).
*   Unit can move (A* pathfinding and right-click).
*   **Success Criteria:** Can select 10 units, right-click across map, units navigate around static obstacles. FPS ≥ 60.

**Phase 2: Economy Sandbox** *(~3-4 days)*
*   **Goal:** Full resource gathering loop functional.
*   Resource nodes spawn (Trees, Food Bushes, Gold Mines).
*   Villager `Gathering` state implemented (move to node, extract, auto-return to Town Center).
*   Town Center building (static sprite, drop-off point).
*   Basic HTML HUD with live resource counters (Food, Wood, Gold, Stone).
*   **Success Criteria:** Can assign 6 Villagers to different resources, watch economy grow, resources increment correctly.

**Phase 3: Base Construction** *(~4-5 days)*
*   **Goal:** Build and train new units.
*   Building placement preview (green/red grid overlay) and grid reservation.
*   Villager `Building` state (move to foundation, apply construction progress).
*   Houses implemented (increases pop cap).
*   Town Center trains Villagers (production queue UI).
*   Population cap logic working (can't train beyond cap).
*   **Success Criteria:** Can place House foundation, Villagers auto-build it, train new Villagers from Town Center, population system enforced.

**Phase 4: First Combat Loop** *(~5-6 days)*
*   **Goal:** Military units kill each other and buildings.
*   Barracks building (trains Infantry).
*   Infantry unit (melee, `Attacking` state, deals damage).
*   Attack command (right-click enemy), aggro logic, health bars.
*   Unit death and removal.
*   Victory/Defeat condition (Destroying the enemy Town Center triggers end-game overlay).
*   **Success Criteria:** Can build Barracks, train Infantry, attack enemy Town Center (placed manually for testing), destroy it, see Victory screen.

**Phase 5: AI Opponent** *(~6-7 days)*
*   **Goal:** Full autonomous enemy that plays the game.
*   Macro-AI state machine implemented (uses Section 3.8 rules).
*   Enemy faction spawns with own Town Center + starting Villagers.
*   AI autonomously gathers, builds Houses/Barracks, trains units.
*   AI attacks player when threshold reached.
*   **Success Criteria:** Can start match, do nothing, watch AI build economy and eventually attack. AI can be defeated. Restart button works cleanly (no memory leaks).

**Phase 6: Complete Vertical Slice (V1 Core Done)** *(~3-4 days)*
*   **Goal:** Polished, balanced, winnable/loseable match.
*   Age 2 & Age 3 advancement working (Archery Range, Archers).
*   Fog of War grid logic (unexplored/explored/visible).
*   Balance pass: resource quantities, unit costs, AI timings.
*   Bug fixes and edge case handling.
*   **Success Criteria:** Full match playable from start to finish. Flow: Start -> Gather -> Build -> Age Up -> Train Army -> Fight AI -> Destroy Town Center -> Victory/Defeat -> Restart works perfectly. Match duration 12-20 minutes.

**Phase 7: Showcase & Polish (V1.x Extensions)** *(~4-5 days)*
*   **Goal:** Demonstrate advanced engine features.
*   Particle systems (building destruction, combat effects, age-up aura).
*   Audio integration (unit barks, combat sounds, BGM loop, spatial panning).
*   Minimap implementation (scaled-down map view, clickable, FoW overlay).
*   Debug visualizations polished (grid overlay, pathfinding display).
*   **Success Criteria:** Game feels polished. Every major engine feature is demonstrated visibly/audibly.

**Total Estimated Timeline:** ~4-5 weeks of focused development.

**Iteration Safety Net:** If any phase takes >2x estimated time, cut scope from that phase and move complexity to V1.x or V2.

---

## 7. Appendix: Example Data Tables
To ground the mechanics and provide a clear baseline for V1 implementation and balancing, here are concrete examples of the static data dictionaries. *(Note: Distances assume a standard grid where 1 cell = 32 pixels).*

### 7.1 UnitStats Example
```javascript
const UnitData = {
    "human_villager": {
        name: "Villager",
        cost: { food: 50, wood: 0, gold: 0, stone: 0 },
        buildTime: 15,
        health: 25,
        visionRadius: 160, // 5 cells
        speed: 60,         // pixels per second
        combat: { 
            damage: 1, 
            range: 10,        // Effectively melee (must be adjacent)
            aggroRange: 0,    // Villagers don't auto-aggro
            attackRate: 2.0,  // 2 seconds between attacks
            type: "melee",
            armor: 0,
            armorType: "light",
            bonusDamage: {}   // No combat bonuses
        }
    },
    "human_infantry": {
        name: "Infantry",
        cost: { food: 60, wood: 0, gold: 20, stone: 0 },
        buildTime: 20,
        health: 40,
        visionRadius: 160,
        speed: 64,
        combat: { 
            damage: 4, 
            range: 10,        // Melee range
            aggroRange: 160,  // 5 cells auto-aggro
            attackRate: 1.5,  // Fast attack speed
            type: "melee",
            armor: 1,         // Light armor
            armorType: "infantry",
            bonusDamage: { building: 2 }  // +2 vs structures
        }
    },
    "human_archer": {
        name: "Archer",
        cost: { food: 0, wood: 25, gold: 45, stone: 0 },
        buildTime: 25,
        health: 30,
        visionRadius: 224, // 7 cells
        speed: 64,
        combat: { 
            damage: 3, 
            range: 160, 
            aggroRange: 192, 
            attackRate: 2.0, 
            type: "ranged",
            armor: 0,
            armorType: "light",
            bonusDamage: {} // No bonuses for archers in V1
        }
    }
};

// V1 Note: All units use simplified armor (0 for light units, structures have armor values).
// Bonus damage system: Infantry get { building: 2 }, meaning +2 damage vs structures.
```

### 7.2 BuildingStats Example
```javascript
const BuildingData = {
    "human_town_center": {
        name: "Town Center",
        cost: { food: 0, wood: 400, gold: 0, stone: 0 },
        buildTime: 60,
        health: 1200,
        visionRadius: 256, // 8 cells
        gridSize: { x: 3, y: 3 },
        providesPopulation: 10,
        trains: ["human_villager"],
        researches: ["age_2"]
    },
    "human_house": {
        name: "House",
        cost: { food: 0, wood: 25, gold: 0, stone: 0 },
        buildTime: 15,
        health: 200,
        visionRadius: 64,  // 2 cells
        gridSize: { x: 2, y: 2 },
        providesPopulation: 5,
        trains: [],
        researches: []
    },
    "human_barracks": {
        name: "Barracks",
        cost: { food: 0, wood: 175, gold: 0, stone: 0 },
        buildTime: 30,
        health: 600,
        visionRadius: 96,  // 3 cells
        gridSize: { x: 3, y: 3 },
        providesPopulation: 0,
        trains: ["human_infantry"],
        researches: ["infantry_weapons_1"]
    }
};
```

### 7.3 Age Progression Example
```javascript
const AgeData = {
    "age_1": {
        ageLevel: 1,
        name: "Age 1: Dark Age",
        cost: { food: 0, wood: 0, gold: 0, stone: 0 },
        requiredBuildings: [],
        unlocks: ["human_villager", "human_house", "human_lumber_camp", "human_mining_camp"]
    },
    "age_2": {
        ageLevel: 2,
        name: "Age 2: Feudal Era",
        cost: { food: 500, wood: 0, gold: 0, stone: 0 },
        researchTime: 60, // seconds
        requiredBuildings: [], // V1 simplifies requirements
        unlocks: ["human_barracks", "human_infantry"]
    },
    "age_3": {
        ageLevel: 3,
        name: "Age 3: Castle Era",
        cost: { food: 800, wood: 0, gold: 200, stone: 0 },
        researchTime: 90,
        requiredBuildings: ["human_barracks"], // Must have at least one Barracks
        unlocks: ["human_archery_range", "human_archer", "infantry_weapons_1"]
    },
    // Age 4 reserved for V2 expansion
};
```
