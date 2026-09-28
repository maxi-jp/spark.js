# RTS Implementation Guide: Task-by-Task Breakdown

**Purpose:** This document breaks the GDD phases into actionable 2-4 hour work sessions that Copilot can complete without losing context. Each session has 3-5 concrete deliverables and can be resumed easily.

**How to Use This Guide:**
1. Start at the current phase
2. Complete one session before moving to the next
3. Update the "Current Status" section after each session
4. If stuck >30 minutes, mark the blocker and move to next parallel task
5. Test after every session before continuing

---

## 📍 Current Status Tracker

**See `PROGRESS.md` for detailed status tracking.**

**Current Phase:** Phase 2 - Economy Sandbox  
**Last Completed Session:** Phase 1 Session 1.6 - Unit Movement & Commands  
**Next Session:** Phase 2 Session 2.1  
**Known Blockers:** None  

*(Brief status here; full details in PROGRESS.md)*

---

## Phase 1: Playable Movement Sandbox (Est. 2-3 days)

**Goal:** Prove that pathfinding, selection, and camera work. No economy, no combat, just units moving.

### Session 1.1: Project Structure & Map Loading (~2-3 hours)

**Files to Create:**
1. `src/examples/rts/rts_game.js` - Empty RTSGame class extending Game
2. `rts.html` - HTML file with all engine script tags + rts_game.js
3. `src/examples/rts/assets/map/test_map.json` - Simple 32x32 Tiled map (or copy from tileset example)

**Tasks:**
- [ ] Copy `tileset.html` as starting template for `rts.html`
- [ ] Create `RTSGame extends Game` class with empty constructor
- [ ] Load test map using `TiledLoader.Parse()` in `Start()`
- [ ] Create and render tilesets from parsed map data
- [ ] Configure camera: `fillWindow: true, preserveAspectRatio: true`
- [ ] Test: Map renders, can open in browser, no console errors

**Acceptance Criteria:**
- ✅ Browser shows rendered tileset map
- ✅ Map is at least 32x32 cells (1024x1024 pixels)
- ✅ Console shows no errors
- ✅ FPS counter visible and showing 60 FPS

**Copilot Prompt Template:**
```
I'm starting Phase 1 Session 1 of the RTS project. I need to:
1. Create the base RTSGame class
2. Load a simple Tiled map using TiledLoader
3. Get basic rendering working

Current files: [list existing files]
Reference: tileset.html and tileset.js for TiledLoader examples
```

---

### Session 1.2: Camera Controls (~2 hours)

**Files to Modify:**
1. `src/examples/rts/rts_game.js` - Add camera movement logic

**Tasks:**
- [ ] Implement arrow key camera panning (800 px/second base speed)
- [ ] Implement edge-panning (20px dead zone, acceleration curve)
- [ ] Implement mouse wheel zoom (0.5x to 2.0x, zoom-to-cursor)
- [ ] Add middle-mouse click + drag panning
- [ ] Clamp camera to map bounds
- [ ] Test: Can navigate entire map smoothly

**Acceptance Criteria:**
- ✅ Arrow keys pan camera at consistent speed
- ✅ Moving mouse to screen edges pans camera
- ✅ Mouse wheel zooms in/out targeting cursor position
- ✅ Middle-mouse click + drag pans camera smoothly
- ✅ Cannot scroll beyond map edges
- ✅ Camera movement feels smooth (no jitter)

**Code Structure Hint:**
```javascript
class RTSGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.edgePanSpeed = 800;
        this.edgePanMargin = 20;
    }
    
    Update(deltaTime) {
        super.Update(deltaTime);
        this.UpdateCameraControls(deltaTime);
    }
    
    UpdateCameraControls(deltaTime) {
        // Arrow keys
        // Edge panning
        // Zoom
        // Clamp
    }
}
```

**Copilot Prompt Template:**
```
Phase 1 Session 2: Implementing camera controls for RTS.
I need edge-panning (with dead zone), arrow key panning, middle-mouse drag panning, and zoom-to-cursor.
Reference the copilot-instructions.md Camera API section.
Camera should be clamped to map bounds.
```

---

### Session 1.3: Grid System & Unit Spawning (~3 hours)

**Files to Create:**
1. `src/examples/rts/grid_map.js` - GridMap class for pathfinding
2. `src/examples/rts/entities.js` - Base Entity and Unit classes

**Tasks:**
- [x] Create `GridMap` class: tracks `walkable`, `buildable`, `occupied` per cell
- [x] Parse Tiled map to populate grid (water = not walkable, grass = walkable)
- [x] Create `Entity extends SpriteObject` base class (health, ownerId, visionRadius)
- [x] Create `Unit extends Entity` (currentCommand, commandQueue, speed)
- [x] Spawn 5 test units at fixed positions (use simple sprite placeholder)
- [x] Render units with Y-sorting (sort gameObjects by y position before Draw)
- [x] Test: Units appear on map at correct positions

**Acceptance Criteria:**
- ✅ GridMap correctly identifies walkable vs blocked cells
- ✅ 5 units visible on map
- ✅ Units occlude correctly based on Y position
- ✅ Can zoom and pan, units remain correctly positioned

**Data Structure:**
```javascript
class GridMap {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize; // 32
        this.cells = []; // [row][col] -> { walkable, buildable, occupied, occupant }
    }
    
    WorldToGrid(worldPos) { /* Convert Vector2 to {col, row} */ }
    GridToWorld(col, row) { /* Convert to Vector2 center of cell */ }
    IsWalkable(col, row) { /* Check walkable && !occupied */ }
}
```

**Copilot Prompt:**
```
Phase 1 Session 3: Creating grid system and basic entity classes.
Need GridMap class with world<->grid conversion.
Need Entity and Unit base classes (see GDD Section 4.4).
Spawn 5 test units as placeholders.
Grid should be 32x32 pixel cells.
```

---

### Session 1.4: Selection System (~2-3 hours)

**Files to Create:**
1. `src/examples/rts/selection_manager.js` - Handles box selection and clicks

**Files to Modify:**
1. `src/examples/rts/rts_game.js` - Integrate SelectionManager
2. `src/examples/rts/entities.js` - Add selection visuals

**Tasks:**
- [x] Create `SelectionManager` class with `selectedEntities[]` array
- [x] Implement single-click selection (raycast to units via colliders)
- [x] Implement click-and-drag box selection (track mouseDown -> mouseDrag -> mouseUp)
- [x] Draw selection rectangle during drag (green stroke)
- [x] Filter selection to only friendly units (ownerId === player's ID)
- [x] Draw selection rings under selected units (green circle, `DrawStrokeCircle`)
- [x] Clear selection on empty terrain click
- [x] Test: Can select individual units, can box-select multiple units

**Acceptance Criteria:**
- ✅ Left-click selects single unit, shows green ring
- ✅ Click-drag draws selection box
- ✅ Box selects all units inside rectangle
- ✅ Clicking empty ground clears selection
- ✅ Selection limit of 60 units enforced
- ✅ Selected units visually distinct (rings visible)

**Code Skeleton:**
```javascript
class SelectionManager {
    constructor(game) {
        this.game = game;
        this.selectedEntities = [];
        this.selectionStart = null;
        this.isDragging = false;
    }
    
    Update(deltaTime) {
        if (Input.IsMouseButtonPressed(0)) this.OnMouseDown();
        if (Input.IsMouseButtonDown(0) && this.isDragging) this.OnMouseDrag();
        if (Input.IsMouseButtonReleased(0)) this.OnMouseUp();
    }
    
    Draw(renderer) {
        if (this.isDragging) this.DrawSelectionBox(renderer);
    }
    
    OnMouseDown() { /* Start selection */ }
    OnMouseDrag() { /* Update box */ }
    OnMouseUp() { /* Finalize selection */ }
    SelectEntitiesInBox(start, end) { /* Box selection logic */ }
    ClearSelection() { /* Clear array */ }
}
```

**Copilot Prompt:**
```
Phase 1 Session 4: Implementing RTS-style selection system.
Need box selection with click-and-drag.
Single click selects one unit.
Draw green selection rings under selected units.
Reference AoE2-style selection (GDD Section 3.1).
```

---

### Session 1.5: A* Pathfinding Implementation (~3-4 hours)

**Files to Create:**
1. `src/examples/rts/pathfinder.js` - A* algorithm implementation

**Tasks:**
- [x] Implement A* pathfinding class with `FindPath(startPos, endPos)` method
- [x] Use Manhattan distance heuristic for RTS movement
- [x] Return array of Vector2 waypoints
- [x] Handle unreachable destinations (return closest reachable cell)
- [x] Add basic path smoothing (optional: skip waypoints in straight lines)
- [x] Test: Calculate path from one corner of map to opposite corner
- [x] Verify paths avoid water/obstacles correctly

**Acceptance Criteria:**
- ✅ `Pathfinder.FindPath()` returns valid waypoint array
- ✅ Paths avoid blocked cells (water, cliffs)
- ✅ Paths are reasonably optimal (not obviously inefficient)
- ✅ Handles unreachable targets gracefully (no infinite loops)
- ✅ Performance: <10ms for 32x32 map, <50ms for 128x128 map

**Algorithm Reference:**
```javascript
class Pathfinder {
    constructor(gridMap) {
        this.grid = gridMap;
    }
    
    FindPath(startWorld, endWorld) {
        const start = this.grid.WorldToGrid(startWorld);
        const end = this.grid.WorldToGrid(endWorld);
        
        // A* implementation
        // openSet, closedSet, parent tracking
        // Return array of Vector2 world positions
    }
    
    Heuristic(a, b) {
        return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
    }
}
```

**Copilot Prompt:**
```
Phase 1 Session 5: Implementing A* pathfinding for RTS.
Need FindPath(start, end) that returns Vector2[] waypoints.
Grid is 32x32 cells, cells have walkable property.
Use Manhattan distance heuristic.
Handle unreachable destinations gracefully.
Target performance: <10ms for small maps.
```

---

### Session 1.6: Unit Movement & Commands (~3 hours)

**Files to Create:**
1. `src/examples/rts/commands.js` - Command classes (MoveCommand, etc.)

**Files to Modify:**
1. `src/examples/rts/entities.js` - Add Unit FSM and movement logic

**Tasks:**
- [x] Create `Command` base class with `Validate()` and `Execute()` methods
- [x] Create `MoveCommand(targetPosition)` class
- [x] Add Unit states: `Idle`, `Moving`
- [x] Implement `Unit.AssignCommand(command)` - sets currentCommand
- [x] Implement movement logic: follow waypoint array, move toward next waypoint
- [x] When reaching final waypoint, transition to Idle
- [x] Right-click terrain assigns MoveCommand to selected units
- [x] Test: Select units, right-click, watch them path and move
- [x] Debug visualization: Draw path waypoints as red dots

**Acceptance Criteria:**
- ✅ Right-clicking terrain moves selected units to that location
- ✅ Units follow paths around obstacles
- ✅ Units stop at destination and return to Idle
- ✅ Multiple units can move simultaneously without conflicts
- ✅ Movement speed matches spec (60 pixels/second base)
- ✅ Debug mode shows pathfinding waypoints

**Code Structure:**
```javascript
class MoveCommand {
    constructor(targetPos, pathfinder, gridMap) {
        this.targetPos = targetPos;
        this.path = pathfinder.FindPath(unit.position, targetPos);
        this.currentWaypointIndex = 0;
    }
    
    Validate(unit) {
        return this.path && this.path.length > 0;
    }
    
    Execute(unit, deltaTime) {
        // Move toward current waypoint
        // If reached, increment index
        // If final waypoint reached, return COMMAND.complete
    }
}

class Unit extends Entity {
    Update(deltaTime) {
        if (this.currentCommand) {
            if (!this.currentCommand.Validate(this)) {
                this.currentCommand = null;
                this.state = 'Idle';
            } else {
                const status = this.currentCommand.Execute(this, deltaTime);
                if (status === COMMAND.complete) {
                    this.currentCommand = this.commandQueue.shift() || null;
                }
            }
        }
    }
}
```

**Copilot Prompt:**
```
Phase 1 Session 6: Implementing unit movement with commands.
Need Command pattern (see GDD Section 4.5).
Right-click terrain -> MoveCommand -> Unit follows A* path.
Units move at 60 px/s.
Show debug waypoints as red circles.
Multiple units should move independently.
```

---

### Phase 1 Completion Checklist

Before moving to Phase 2, verify:

- [ ] Map loads and renders at 60 FPS
- [ ] Camera pans with arrow keys and edge-panning
- [ ] Camera zooms with mouse wheel (zoom-to-cursor)
- [ ] Can spawn 20+ units on map
- [ ] Can box-select multiple units (green selection rings visible)
- [ ] Can right-click terrain to move units
- [ ] Units pathfind around obstacles correctly
- [ ] Units stop at destination (don't jitter or overshoot)
- [ ] Multiple units can move simultaneously
- [ ] Debug mode shows grid, paths, and colliders
- [ ] No console errors
- [ ] Performance: 60 FPS with 20 moving units

**Git Commit Message:** `Phase 1 Complete: Movement sandbox with selection, pathfinding, and camera`

---

## Phase 2: Economy Sandbox (Est. 3-4 days)

**Goal:** Full resource gathering loop. Villagers gather from nodes and deposit at Town Center.

### Session 2.1: Resource Nodes & Visual Assets (~2 hours)

**Files to Create:**
1. `src/examples/rts/resources.js` - ResourceNode class
2. `src/examples/rts/assets/` - Placeholder sprites for trees, gold, food

**Tasks:**
- [ ] Create `ResourceNode extends Entity` (resourceType, amount, depleted flag)
- [ ] Spawn 10 trees (100 wood each) near starting area
- [ ] Spawn 2 food bushes (150 food each)
- [ ] Spawn 1 gold mine (800 gold)
- [ ] Use placeholder sprites (simple colored rectangles if no art yet)
- [ ] Nodes mark their grid cells as occupied (not walkable)
- [ ] Test: Nodes visible on map, units path around them

**Acceptance Criteria:**
- ✅ 10+ resource nodes visible on map
- ✅ Nodes have CircleCollider for clicking
- ✅ Nodes block pathfinding correctly
- ✅ Each node type visually distinct (color-coded placeholders OK)

---

### Session 2.2: Player Resource State & HUD (~2 hours)

**Files to Create:**
1. `src/examples/rts/player.js` - Player class
2. `src/examples/rts/ui/hud.js` - RTSHUD class extending HTMLMenu

**Tasks:**
- [ ] Create `Player` class: `{ id, resources: {wood, food, gold, stone}, population, populationCap }`
- [ ] Create two players: Player 1 (human), Player 2 (AI placeholder)
- [ ] Create HUD overlay: Top bar showing "Food: 200 | Wood: 100 | Gold: 0 | Stone: 0 | Pop: 6/10"
- [ ] Use HTMLMenu with CSS styling (see menu example)
- [ ] Update HUD every frame based on player.resources
- [ ] Test: HUD displays starting resources correctly

**Acceptance Criteria:**
- ✅ HUD visible at top of screen
- ✅ Shows all 4 resource types and population
- ✅ Resources update in real-time when changed manually via console
- ✅ HUD doesn't block game input (click-through layer)

---

### Session 2.3: Villager Gathering State (~3 hours)

**Files to Modify:**
1. `src/examples/rts/commands.js` - Add GatherCommand
2. `src/examples/rts/entities.js` - Add Villager class, Gathering state

**Tasks:**
- [ ] Create `Villager extends Unit` with carryCapacity (10), carriedResource
- [ ] Create `GatherCommand(resourceNodeId)` class
- [ ] Implement Gathering state machine:
  1. Move to resource node
  2. Extract resource (1/second, add to carried amount)
  3. When full (10 units), auto-transition to returning to drop-off
  4. Move to Town Center
  5. Deposit resources (add to player.resources)
  6. Return to resource node (auto-loop)
- [ ] Right-click resource node assigns GatherCommand
- [ ] Show gathered resource amount above Villager (debug text)
- [ ] Test: Villager gathers wood, returns to Town Center, resources increment

**Acceptance Criteria:**
- ✅ Right-clicking a tree assigns gather command
- ✅ Villager moves to tree and extracts wood
- ✅ After 10 wood gathered, Villager auto-returns to Town Center
- ✅ Player's wood resource increases when Villager deposits
- ✅ Villager automatically returns to same tree and continues gathering
- ✅ Resource node depletes and is destroyed at 0 remaining

---

### Session 2.4: Town Center & Multiple Villagers (~2 hours)

**Files to Create:**
1. `src/examples/rts/buildings.js` - Building and TownCenter classes

**Tasks:**
- [ ] Create `Building extends Entity` (isComplete, occupies grid cells)
- [ ] Create `TownCenter extends Building` (static sprite, 3x3 grid footprint)
- [ ] Spawn one Town Center for player at starting position
- [ ] Spawn 6 Villagers near Town Center
- [ ] Town Center acts as drop-off point for all resource types
- [ ] Test: Assign 3 Villagers to wood, 3 to food, watch resources accumulate

**Acceptance Criteria:**
- ✅ Town Center visible on map (3x3 cells)
- ✅ 6 Villagers spawn nearby
- ✅ Villagers can deposit at Town Center
- ✅ Economy runs: resources accumulate over time
- ✅ Town Center blocks pathfinding correctly

---

### Session 2.5: Resource Camps (Drop-off Buildings) (~2 hours)

**Files to Modify:**
1. `src/examples/rts/buildings.js` - Add LumberCamp, MiningCamp

**Tasks:**
- [ ] Create `LumberCamp` (drop-off for wood)
- [ ] Create `MiningCamp` (drop-off for gold and stone)
- [ ] Place one of each near respective resource clusters
- [ ] Villagers auto-find nearest valid drop-off for their carried resource
- [ ] Test: Villager gathering wood deposits at Lumber Camp instead of Town Center

**Acceptance Criteria:**
- ✅ Lumber Camp and Mining Camp visible on map
- ✅ Villagers deposit wood at Lumber Camp (closer than Town Center)
- ✅ Villagers deposit gold at Mining Camp
- ✅ Food still deposits at Town Center only

---

### Phase 2 Completion Checklist

- [ ] Resource nodes spawn correctly (trees, bushes, mines)
- [ ] HUD shows resources and updates in real-time
- [ ] 6 Villagers can gather from different resource types simultaneously
- [ ] Villagers auto-path to nodes, extract, return, deposit, repeat
- [ ] Resource nodes deplete and are destroyed when empty
- [ ] Player resources accumulate correctly (can reach 500+ wood in ~5 minutes)
- [ ] Drop-off buildings work (Lumber Camp, Mining Camp, Town Center)
- [ ] No pathfinding bugs (Villagers don't get stuck)

**Git Commit:** `Phase 2 Complete: Economy sandbox with gathering and resource management`

---

## Phase 3: Base Construction (Est. 4-5 days)

### Session 3.1: Building Placement System (~3 hours)

**Files to Create:**
1. `src/examples/rts/build_manager.js` - Handles building placement preview

**Tasks:**
- [ ] Create "Build Mode" state: player selects building type from UI (for now, hardcode a key)
- [ ] Show translucent building sprite that follows mouse cursor
- [ ] Snap preview to grid (align to 32px cells)
- [ ] Check if placement valid: all cells walkable+buildable, not occupied
- [ ] Show green tint if valid, red tint if blocked
- [ ] Left-click confirms placement, creates foundation, deducts resources
- [ ] Foundation immediately reserves grid cells (occupied = true)
- [ ] Test: Can place House foundation, grid cells are blocked

---

### Session 3.2: Construction System (~3 hours)

**Tasks:**
- [ ] Create `BuildCommand(foundationId)` class
- [ ] Villager right-click foundation → BuildCommand assigned
- [ ] Villager moves adjacent to foundation and "builds"
- [ ] Construction progress increases over time (progressPerSecond * numBuilders)
- [ ] Building health increases proportionally with progress
- [ ] At 100% progress, building completes (isComplete = true)
- [ ] Draw progress bar above foundations
- [ ] Test: Villager builds House from 0% to 100%

---

### Session 3.3: Population System & Training Queue (~3 hours)

**Tasks:**
- [ ] House increases populationCap by 5
- [ ] Town Center has production queue (max 5 items)
- [ ] UI button to train Villager (costs 50 food, 15 seconds)
- [ ] Training deducts resources immediately, reserves population
- [ ] After build time, spawn Villager at rally point
- [ ] Can't train if population >= populationCap
- [ ] Test: Train 5 Villagers in queue, population increases

---

### Phase 3 Completion Checklist

- [ ] Can place building foundations (House, Barracks)
- [ ] Grid placement validation works (green/red preview)
- [ ] Villagers build foundations with progress bars
- [ ] Buildings complete and become functional
- [ ] Population cap system enforced
- [ ] Town Center trains Villagers via queue
- [ ] Can build Houses to increase pop cap
- [ ] Multiple Villagers build same foundation (speeds up)
- [ ] Can cancel foundations (refunds resources)

**Git Commit:** `Phase 3 Complete: Base construction with building placement and training queues`

---

## Phase 4-7: Abbreviated (Full Detail Available on Request)

**Phase 4:** Add Barracks, Infantry, combat, health bars, attack commands  
**Phase 5:** Implement AI macro loop (gather, build, train, attack)  
**Phase 6:** Age system, Archery Range, Archers, balance pass, win/loss, restart  
**Phase 7:** Fog of War, particles, audio, minimap  

---

## 🔄 Session Resume Protocol

If a Copilot session is interrupted, resume with:

1. **Read current status** from `PROGRESS.md`
2. **Check last commit message** to see what was completed
3. **Run the game** to verify existing functionality
4. **Pick up at next unchecked task** in the current session
5. **Prompt template:** 
   ```
   Resuming RTS project at [Phase X Session Y].
   Last completed: [description from PROGRESS.md]
   Next task: [first unchecked item]
   Files involved: [list]
   Current blockers: [any known issues]
   ```

---

## 🐛 Common Blockers & Solutions

### Blocker: Pathfinding is too slow
**Solution:** Cache paths, only recalculate when grid changes or every 0.5 seconds

### Blocker: Units get stuck in tight spaces
**Solution:** Increase unit separation radius, add collision pushback

### Blocker: Selection is laggy with many units
**Solution:** Use spatial partitioning (grid-based entity lookup)

### Blocker: Too many files, losing context
**Solution:** Work on one system at a time. Complete Sessions 1.1-1.6 before reading Phase 2.

### Blocker: UI isn't updating
**Solution:** Check HTMLMenu is added to `game.htmlMenus` array, verify CSS doesn't have `pointer-events: none`

---

## 📊 Progress Tracking Template

After each session, update this table:

| Phase | Session | Status | Time Spent | Blockers | Commit Hash |
|-------|---------|--------|------------|----------|-------------|
| 1 | 1.1 | ⬜ Not Started | - | - | - |
| 1 | 1.2 | ⬜ Not Started | - | - | - |
| 1 | 1.3 | ⬜ Not Started | - | - | - |

*Legend: ⬜ Not Started | 🟡 In Progress | ✅ Complete | ❌ Blocked*

---

## 🎯 Copilot Context Management Tips

1. **One system at a time:** Don't mix pathfinding with UI work in same session
2. **File limits:** Keep <5 files open simultaneously
3. **Test before proceeding:** Every session ends with working functionality
4. **Commit frequently:** After each session, commit with descriptive message
5. **Use workspace search:** Find existing implementations with grep before asking
6. **Reference GDD:** Link to specific GDD sections in prompts
7. **Document decisions:** Store architectural decisions in `DECISIONS.md`
