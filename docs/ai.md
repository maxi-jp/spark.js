# Game AI Tools

spark.js ships two optional AI modules. Include only what your game needs.

| Module | File | What it provides |
|---|---|---|
| Pathfinding | `src/engine/ai.js` | `AStarPathfinder` — grid-based A\* with smoothing and fallbacks |
| State machines | `src/engine/fsm.js` | `FSMState`, `FSM`, `FSMCompositeState` — flat and hierarchical FSMs |

---

## `AStarPathfinder` (`ai.js`)

An A\* pathfinder that works with any grid object implementing the duck-typed interface below. It is not tied to a specific game — the same instance works for RTS games, dungeon crawlers, puzzle games, or any scenario requiring grid navigation.

### Grid interface

Your grid object must implement:

| Member | Signature | Description |
|---|---|---|
| `IsWalkable` | `(col, row) → boolean` | Whether the cell can be traversed |
| `IsInBounds` | `(col, row) → boolean` | Whether the coordinates are inside the grid |
| `WorldToGrid` | `(Vector2) → {col, row}` | Convert a world position to grid coordinates |
| `GridToWorld` | `(col, row) → Vector2` | Convert grid coordinates to a world position (typically cell centre) |
| `width` | `number` | Grid width in cells |
| `height` | `number` | Grid height in cells |

> The engine's `GridMap` class (used by the RTS example) satisfies this interface automatically.

---

### Constructor

```javascript
const pathfinder = new AStarPathfinder(grid, options);
```

| Option | Type | Default | Description |
|---|---|---|---|
| `allowDiagonals` | `boolean` | `true` | Allow 8-directional movement |
| `maxIterations` | `number` | `20000` | Safety cap — stops the search and returns the closest reachable cell |
| `smoothPath` | `boolean` | `true` | Apply line-of-sight smoothing (removes redundant intermediate waypoints) |
| `heuristic` | `function` | auto | Override the distance heuristic. Auto-selects `Octile` for 8-dir, `Manhattan` for 4-dir |

---

### Methods

#### `FindPath(startWorld, endWorld)` → `Vector2[]`

Find a world-space path between two `Vector2` positions.

- Returns an array of `Vector2` waypoints from start to end (inclusive).
- Returns `[]` if start is completely isolated.
- If the exact target cell is blocked, automatically falls back to the nearest walkable cell.

```javascript
const waypoints = pathfinder.FindPath(unit.position, targetPos);
if (waypoints.length > 0) {
    // waypoints[0] is start, waypoints[waypoints.length - 1] is (near) target
}
```

#### `FindPathGrid(sc, sr, ec, er)` → `{col, row}[]`

Same as `FindPath` but operates on grid coordinates and returns grid-coordinate objects instead of world positions. Useful when you want to reason about the path in grid space before converting.

```javascript
const gridPath = pathfinder.FindPathGrid(0, 0, 24, 17);
```

---

### Heuristics

`AStarPathfinder.Heuristic` exposes three named heuristic functions:

| Name | Best used when | Formula |
|---|---|---|
| `Manhattan` | 4-directional grids (no diagonals) | `\|dx\| + \|dy\|` |
| `Octile` | 8-directional grids with diagonal cost √2 (**default** for `allowDiagonals: true`) | `max(dx, dy) + (√2 − 1) · min(dx, dy)` |
| `Euclidean` | Continuous / any-angle movement | `√(dx² + dy²)` |

The heuristic is **auto-selected** based on `allowDiagonals`:

```javascript
// 4-directional → Manhattan selected automatically
new AStarPathfinder(grid, { allowDiagonals: false });

// 8-directional → Octile selected automatically (default)
new AStarPathfinder(grid);
```

You can override with any named heuristic or a custom function:

```javascript
// Named constant
new AStarPathfinder(grid, { heuristic: AStarPathfinder.Heuristic.Euclidean });

// Custom function (e.g. weighted A* — faster but non-optimal)
new AStarPathfinder(grid, {
    heuristic: (col, row, ec, er) => 1.5 * Math.hypot(col - ec, row - er)
});
```

---

### Path smoothing

When `smoothPath: true` (default), the pathfinder runs a post-process pass over the raw A\* waypoints using **Bresenham's line** to check line-of-sight between non-adjacent waypoints. Any intermediate waypoint that can be skipped without crossing a wall is removed.

This produces straight-line segments where possible, dramatically reducing the number of "staircase" waypoints on open terrain.

```javascript
// Disable smoothing if you need to follow exact grid cells
const pathfinder = new AStarPathfinder(grid, { smoothPath: false });
```

---

### Unreachable targets

When the target cell is blocked or surrounded, the pathfinder does two things:

1. **Blocked target cell**: runs a BFS outward from the target to find the nearest walkable cell, then paths to that cell instead.
2. **Fully surrounded / iteration cap reached**: returns the path to the closest cell reached during the search (lowest heuristic score), so the unit still moves toward the goal rather than stopping.

In both cases, `FindPath` always returns either a valid path or `[]` — it never throws or loops infinitely.

---

### Example: minimal setup

```javascript
// Any object satisfying the grid interface works:
class MyGrid {
    constructor(cols, rows) {
        this.width  = cols;
        this.height = rows;
        this.cells  = Array.from({ length: rows }, () => new Array(cols).fill(true));
    }
    IsInBounds(col, row) { return col >= 0 && col < this.width && row >= 0 && row < this.height; }
    IsWalkable(col, row) { return this.IsInBounds(col, row) && this.cells[row][col]; }
    WorldToGrid(pos)     { return { col: Math.floor(pos.x / 32), row: Math.floor(pos.y / 32) }; }
    GridToWorld(col, row){ return new Vector2((col + 0.5) * 32, (row + 0.5) * 32); }
}

const grid = new MyGrid(30, 20);
const pathfinder = new AStarPathfinder(grid);

// Find path between two world positions
const waypoints = pathfinder.FindPath(new Vector2(16, 16), new Vector2(944, 624));
```

---

### Performance notes

- Uses a **binary min-heap** internally — O(log n) push/pop for the open set.
- String keys (`"col,row"`) are used for the closed set and open map — fast for grids up to ~200×200.
- Typical times on modern hardware: **< 1 ms** for 32×32, **< 15 ms** for 128×128.
- For grids larger than ~200×200 with many dynamic obstacles, consider caching paths and only recalculating when the relevant area changes.

---

### See also

- [Interactive demo](../pathfinding.html ':ignore :target=_blank') — paint walls, move start/end markers, switch heuristics live. See the project's [README](../src/examples/pathfinding/README.md ':ignore :target=_blank') for a comprehensive description
- [RTS example](../rts.html ':ignore :target=_blank') — production usage integrated with `GridMap` and unit movement

---

## FSM & HFSM (`fsm.js`)

`src/engine/fsm.js` provides lightweight Finite State Machine (FSM) and Hierarchical FSM (HFSM) classes for game AI, character controllers, UI flows, and any other stateful logic.

### Concepts

A **Finite State Machine** models behaviour as a set of discrete states. At any point in time only one state is active. States respond to conditions by transitioning to another state.

A **Hierarchical FSM (HFSM)** extends this by allowing states to contain their own nested FSMs. The parent state manages macro behaviour; the sub-FSM manages micro behaviour inside it. When a parent-level transition fires, it cleanly exits the currently active sub-state.

#### Transition model

spark.js follows the model described in *Millington & Funge — Artificial Intelligence for Games* (3rd ed.):

1. **Declarative guards** (`AddTransition`) — condition functions registered directly on states. The FSM evaluates all outgoing guards from the active state each frame, **before** calling the state's action. If a guard fires, the transition is applied immediately and `Update()` is skipped for the departing state.
2. **Imperative transitions** (`fsm.Transition()`) — called explicitly from within `Update()`. Applied after `Update()` returns.

Both styles can coexist. Declarative guards take priority.

> **Why two styles?** Declarative guards make the FSM representable as a directed graph (useful for visual tools and data-driven design). Imperative calls handle complex logic that can't easily be expressed as a single predicate.

---

### `FSMState`

Base class for all states. Extend and override the lifecycle methods.

```javascript
class ChaseState extends FSMState {
    Enter(owner, prev)     { owner.speed = owner.chaseSpeed; }
    Update(dt, owner, fsm) { if (!owner.target) fsm.Transition('idle'); }
    Exit(owner, next)      { owner.speed = 0; }
}
```

#### Methods

| Method | Description |
|---|---|
| `Enter(owner, prevStateName)` | Called once when this state is entered. |
| `Update(dt, owner, fsm)` | Called every frame while active. May call `fsm.Transition(name)`. |
| `Exit(owner, nextStateName)` | Called once when this state is exited. |
| `AddTransition(targetName, condition)` | Register a declarative guard. `condition(owner)` returns `true` to fire. Returns `this` for chaining. |

The `owner` parameter is the object passed to the `FSM` constructor — typically the game object or NPC that owns the machine.

---

### `FSM`

The state machine itself.

```javascript
this.fsm = new FSM(this, 'idle')
    .AddState('idle',   new IdleState())
    .AddState('chase',  new ChaseState())
    .AddState('return', new ReturnState())
    .Start();

// In the owner's Update():
this.fsm.Update(dt);

// In the owner's Draw():
this.fsm.DrawDebug(renderer, this.position.x, this.position.y - 20);
```

#### Constructor

```javascript
new FSM(owner, initialStateName)
```

| Parameter | Type | Description |
|---|---|---|
| `owner` | `any` | Passed as the first argument to all state callbacks. Typically `this`. |
| `initialStateName` | `string` | State entered when `Start()` is called. |

#### Properties

| Property | Type | Description |
|---|---|---|
| `currentStateName` | `string \| null` | Name of the active state. |
| `previousStateName` | `string \| null` | Name of the most-recently exited state. |
| `currentState` | `FSMState \| null` | The active state object. |

#### Methods

| Method | Returns | Description |
|---|---|---|
| `AddState(name, state)` | `FSM` | Register a state. Call before `Start()`. Chainable. |
| `Start()` | `FSM` | Activate the machine and enter the initial state. Chainable. |
| `Stop()` | — | Deactivate, cleanly exiting the current state. |
| `Transition(name)` | — | Request a transition. Deferred until end of current `Update()`. |
| `Update(dt)` | — | Tick the machine. Call from the owner's `Update()` every frame. |
| `DrawDebug(renderer, x, y, color?)` | — | Draw the current state name. Only renders when `debugMode` is `true`. |

#### `Update()` execution order

```
Each frame:
  1. Evaluate all declarative guards on the active state (AddTransition conditions)
  2. If a guard fires → apply transition, skip Update() for this frame
  3. Otherwise → call state.Update(dt, owner, fsm)
  4. If Update() called fsm.Transition() → apply that transition
```

---

### `FSMCompositeState`

Extends `FSMState`. Holds a nested `FSM` (`this.subFSM`), enabling hierarchical behaviour. The sub-FSM is automatically started, ticked, and stopped with the parent state's lifecycle.

```javascript
class CombatState extends FSMCompositeState {
    constructor(owner) {
        super();
        this.subFSM = new FSM(owner, 'approach')
            .AddState('approach', new ApproachState())
            .AddState('attack',   new AttackState())
            .AddState('cooldown', new CooldownState());
    }
    Enter(owner, prev) { super.Enter(owner, prev); } // starts subFSM
    Update(dt, owner, fsm) { super.Update(dt, owner, fsm); } // ticks subFSM
    Exit(owner, next)  { super.Exit(owner, next);  } // stops subFSM
}
```

Assign the composite state to the parent FSM like any other state, then add parent-level transition guards:

```javascript
const combat = new CombatState(this);
combat.AddTransition('flee',   owner => owner.health < 30);
combat.AddTransition('patrol', owner => !owner.target);

this.fsm = new FSM(this, 'patrol')
    .AddState('patrol', new PatrolState())
    .AddState('combat', combat)
    .AddState('flee',   new FleeState())
    .Start();
```

Parent-level guards are checked **before** the sub-FSM updates. If a parent guard fires, the sub-FSM is not ticked for that frame and `FSMCompositeState.Exit()` cleanly stops the nested machine.

| Property | Type | Description |
|---|---|---|
| `subFSM` | `FSM \| null` | The nested FSM. Assign in the subclass constructor. |

---

### Complete example — flat FSM

```javascript
class PatrolState extends FSMState {
    constructor() {
        super();
        // Declarative guard: player enters detection radius → Alert
        this.AddTransition('alert', owner =>
            Vector2.Distance(owner.position, playerPos) < owner.detectionRadius
        );
    }
    Enter(owner, prev) { owner.currentWP = 0; }
    Update(dt, owner, fsm) {
        const wp = owner.waypoints[owner.currentWP];
        const dx = wp.x - owner.position.x;
        const dy = wp.y - owner.position.y;
        if (SqrLength(dx, dy) < 5 * 5) {
            owner.currentWP = (owner.currentWP + 1) % owner.waypoints.length;
        }
        else {
            const d = Length(dx, dy);
            owner.position.x += (dx / d) * owner.speed * dt;
            owner.position.y += (dy / d) * owner.speed * dt;
        }
    }
}

class AlertState extends FSMState {
    constructor() {
        super();
        this._timer = 0;
        // Declarative guard with 1.1× hysteresis — prevents boundary flicker
        this.AddTransition('patrol', owner =>
            Vector2.Distance(owner.position, playerPos) > owner.detectionRadius * 1.1
        );
    }
    Enter(owner, prev) { this._timer = 0; }
    Update(dt, owner, fsm) {
        this._timer += dt;
        if (this._timer >= 1.5)
            fsm.Transition('chase'); // imperative
    }
}

class Guard extends GameObject {
    constructor(pos, waypoints) {
        super(pos, 0, 1);
        this.waypoints = waypoints;
        this.detectionRadius = 90;
        this.speed = 70;

        this.fsm = new FSM(this, 'patrol')
            .AddState('patrol', new PatrolState())
            .AddState('alert',  new AlertState())
            .Start();
    }
    Update(dt) { super.Update(dt); this.fsm.Update(dt); }
    Draw(renderer) {
        // ...
        this.fsm.DrawDebug(renderer, this.position.x, this.position.y - 20);
    }
}
```

---

### Complete example — hierarchical FSM

```javascript
// Sub-states live inside the Combat composite state
class ApproachState extends FSMState {
    constructor() {
        super();
        this.AddTransition('attack', owner =>
            Vector2.Distance(owner.position, owner.target.position) < owner.attackRange
        );
    }
    Update(dt, owner, fsm) { /* move toward owner.target */ }
}

class AttackState extends FSMState {
    constructor() { super(); this._count = 0; }
    Enter(owner, prev) { this._count = 0; }
    Update(dt, owner, fsm) {
        // ...attack logic...
        if (this._count >= 3)
            fsm.Transition('cooldown');
    }
}

class CooldownState extends FSMState {
    constructor() { super(); this._t = 0; }
    Enter(owner, prev) { this._t = 0; }
    Update(dt, owner, fsm) {
        this._t += dt;
        if (this._t >= 2)
            fsm.Transition('approach');
    }
}

class CombatState extends FSMCompositeState {
    constructor(owner) {
        super();
        this.subFSM = new FSM(owner, 'approach')
            .AddState('approach', new ApproachState())
            .AddState('attack',   new AttackState())
            .AddState('cooldown', new CooldownState());
    }
    Enter(owner, prev) { super.Enter(owner, prev); }
    Update(dt, owner, fsm) { super.Update(dt, owner, fsm); }
    Exit(owner, next)  { super.Exit(owner, next); }
}

class Sentry extends GameObject {
    constructor(pos) {
        super(pos, 0, 1);
        this.target = null;

        const combat = new CombatState(this);
        combat.AddTransition('flee',   owner => owner.health < 30);
        combat.AddTransition('patrol', owner => !owner.target);

        this.fsm = new FSM(this, 'patrol')
            .AddState('patrol', new PatrolState())
            .AddState('combat', combat)
            .AddState('flee',   new FleeState())
            .Start();
    }
    Update(dt) { super.Update(dt); this.fsm.Update(dt); }
    Draw(renderer) {
        this.fsm.DrawDebug(renderer, this.position.x, this.position.y - 20);
        // Draw sub-state label when in combat
        if (this.fsm.currentStateName === 'combat') {
            const combat = this.fsm.currentState;
            if (combat.subFSM) {
                combat.subFSM.DrawDebug(renderer, this.position.x, this.position.y - 34, Color.cyan);
            }
        }
    }
}
```

---

### Debug overlay

`fsm.DrawDebug(renderer, x, y, color?)` draws the current state name as text near any world position. Only renders when the global `debugMode` variable is `true`. Set `debugMode = true` at the top of your game script to enable it during development.

---

### Script load order

```html
<script src="src/engine/game.js"></script>
<script src="src/engine/fsm.js"></script>   <!-- optional -->
<script src="src/engine/main.js"></script>
```

---

### See also

- [FSM demo — Guard Patrol](../fsm-basic.html ':ignore :target=_blank') — three guards, mouse cursor as intruder; all four transitions with a mix of declarative and imperative styles. See the project's [README](../src/examples/fsm_basic/README.md ':ignore :target=_blank') for a detailed walkthrough.
- [HFSM demo — Sentry AI](../fsm-hfsm.html ':ignore :target=_blank') — two NPCs, clickable threat; top-level patrol/combat/flee with a nested approach/attack/cooldown sub-FSM. See the project's [README](../src/examples/fsm_hfsm/README.md ':ignore :target=_blank') for a detailed walkthrough.

---

## See also

- [Examples](examples.md) — full list of demos
