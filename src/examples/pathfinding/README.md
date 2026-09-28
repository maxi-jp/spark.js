# A* Pathfinding — ⚡spark.js Example

**Entry point:** [`pathfinding.html`](../../pathfinding.html)  
**Engine module:** [`src/engine/ai.js`](../engine/ai.js)  
**Full API reference:** [`docs/ai.md`](../../docs/ai.md)

---

## What this example demonstrates

This is an **interactive visualiser** for the engine's built-in `AStarPathfinder`. Every time you change the grid — by painting walls, moving the start or end marker, or toggling an algorithm option — the path is recalculated immediately and the result is drawn on screen. The status bar shows the active heuristic, waypoint count, and how many milliseconds the search took.

The goal is to make the internal mechanics of pathfinding tangible: you can directly observe how different heuristics produce different search behaviour, how diagonal movement changes the shape of a path, and how line-of-sight smoothing collapses a staircase of grid steps into a straight diagonal line.

---

## Controls

| Input | Action |
|---|---|
| **LMB click / drag** | Toggle cells as walls (first cell clicked determines paint vs. erase mode) |
| **RMB click** | Move the **S** (start) marker to a walkable cell |
| **MMB click** | Move the **E** (end) marker to a walkable cell |
| **H** | Cycle heuristic: Manhattan → Octile → Euclidean |
| **D** | Toggle diagonal movement ON / OFF |
| **P** | Toggle line-of-sight path smoothing ON / OFF |
| **C** | Clear all walls |
| **R** | Randomize walls (~28% density) |
| **L** | Restore the default corridor layout |

The path recalculates automatically after every interaction — no confirmation step needed.

---

## How A* works

A* (pronounced "A-star") is an informed graph search algorithm. It finds the shortest path between two cells on a grid by always expanding the node that has the lowest estimated total cost:

$$f(n) = g(n) + h(n)$$

| Symbol | Meaning |
|---|---|
| $g(n)$ | Actual cost to reach node $n$ from the start |
| $h(n)$ | **Heuristic** — estimated cost from $n$ to the goal |
| $f(n)$ | Total estimated cost of the cheapest path through $n$ |

The algorithm maintains two sets:

- **Open set** — cells discovered but not yet fully evaluated (sorted by $f$, implemented as a binary min-heap for $O(\log n)$ operations).
- **Closed set** — cells whose cheapest path from the start is already confirmed.

At each step the cell with the lowest $f$ is popped from the open set, its neighbours are evaluated, and if a cheaper route to a neighbour is found its $g$ score is updated. This continues until the goal is reached or the open set is exhausted.

### Why the heuristic matters

The heuristic $h$ controls the trade-off between **optimality** and **speed**. It must be *admissible* — it must never overestimate the true remaining cost — to guarantee the shortest path is found.

| Heuristic | Formula | Use when |
|---|---|---|
| **Manhattan** | $\|dx\| + \|dy\|$ | 4-directional movement only (no diagonals). Overestimates on 8-dir grids → non-optimal. |
| **Octile** *(default)* | $\max(dx, dy) + (\sqrt{2}-1)\min(dx, dy)$ | 8-directional movement where diagonal cost = $\sqrt{2}$. Perfectly admissible. |
| **Euclidean** | $\sqrt{dx^2 + dy^2}$ | Any movement model. Always admissible but underestimates on grids, so the search explores more nodes. |

Press **H** in the demo to cycle through all three and observe how the path and waypoint count change.

---

## Diagonal movement and corner cutting

When diagonals are enabled (press **D**), each of the 8 neighbours is reachable. Diagonal moves are assigned a cost of $\sqrt{2} \approx 1.414$ to reflect the longer physical distance.

A special rule prevents **corner cutting** — moving diagonally through the gap between two diagonally adjacent walls:

```
  ##          ##
  ##  ← gap   ##
```

Even though the diagonal destination cell is walkable, the move is rejected if either of the two cells that "bracket" the corner is a wall. This avoids agents clipping through geometry.

Press **D** to disable diagonals and watch the path shift to cardinal-only steps.

---

## Path smoothing

The raw A* output on a grid is a sequence of cell-centre waypoints. On open terrain these form a characteristic "staircase" — alternating cardinal and diagonal steps — even when a straight diagonal line would be shorter and look more natural.

After the search completes, the pathfinder optionally runs a **line-of-sight post-process** (press **P** to toggle):

1. Start at waypoint $i$.
2. Try to draw a straight line from $i$ to the farthest waypoint $j$ using **Bresenham's line algorithm**.
3. If every cell the line crosses is walkable, remove all waypoints between $i$ and $j$.
4. Advance $i = j$ and repeat.

The result is a minimal set of waypoints that still avoids all walls. The effect is most dramatic on open terrain — a 10-step staircase may reduce to 2 waypoints — and has no effect on tight corridors where every turn is necessary.

---

## Unreachable targets

Two fallback strategies ensure `FindPath` always returns a useful result:

1. **Blocked target cell** — If the destination cell is a wall, a BFS expands outward from the target until a walkable cell is found, then paths to that cell instead.
2. **Isolated region / iteration cap** — If the search exhausts the open set or reaches the 20 000-iteration safety cap without finding the goal, the algorithm returns the path to the *closest cell it did reach* (lowest $h$ score seen during the search).

In both cases `FindPath` returns either a valid `Vector2[]` path or `[]` (if the start cell itself is isolated). It never throws and never loops infinitely.

---

## Code walkthrough

### `DemoGrid`

A minimal grid implementation created specifically for this demo. It satisfies the duck-typed interface required by `AStarPathfinder`:

```javascript
IsWalkable(col, row)   // → boolean
IsInBounds(col, row)   // → boolean
WorldToGrid(pos)       // → {col, row}
GridToWorld(col, row)  // → Vector2
width, height
```

Any object with these members can be passed to `AStarPathfinder` — the engine's `GridMap` class used in the RTS example satisfies the same interface.

### `PathfindingDemo`

The game class. Its key responsibilities:

| Method | What it does |
|---|---|
| `_PlaceDefaultWalls()` | Seeds the initial corridor layout using `DemoGrid.FillRect()` |
| `_BuildPathfinder()` | Creates a new `AStarPathfinder` with the current settings (heuristic, diagonals, smoothing) |
| `_Recalculate()` | Calls `pathfinder.FindPath()` and records the elapsed time |
| `Update(deltaTime)` | Handles all input; sets `dirty = true` when the grid or options change, triggering a recalculate |
| `Draw()` | Renders cells, path lines, waypoint dots, start/end markers, and the status bar |

The pathfinder is **rebuilt** (not just recalculated) when algorithm options change, because `allowDiagonals`, `smoothPath`, and `heuristic` are constructor-time settings. For a production game you would typically fix these at startup and only call `FindPath` again when the grid or goal changes.

### Reactivity pattern

```javascript
let dirty = false;

// ... input checks set dirty = true when something changes ...

if (dirty) this._Recalculate();
```

`FindPath` is only called when the grid or algorithm options have actually changed — not every frame. This keeps the CPU cost negligible even on slower machines.

---

## Using `AStarPathfinder` in your own game

```javascript
// 1. Create (or reuse) a grid that satisfies the interface
const grid = new MyGrid(cols, rows);

// 2. Instantiate the pathfinder — do this once, not every frame
const pathfinder = new AStarPathfinder(grid);

// 3. Find a path whenever a unit receives a move command
const waypoints = pathfinder.FindPath(unit.position, targetPosition);
// waypoints is a Vector2[] — follow them in sequence

// 4. Override defaults when needed
const pf4dir = new AStarPathfinder(grid, { allowDiagonals: false });
const pfFast = new AStarPathfinder(grid, {
    smoothPath: false,
    heuristic: AStarPathfinder.Heuristic.Euclidean,
});
```

For a complete production integration — including a `GridMap` class built from a Tiled map and units that follow the returned waypoints — see the [RTS example](../rts/).
