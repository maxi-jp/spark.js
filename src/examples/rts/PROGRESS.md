# RTS Project Progress Tracker

**Last Updated:** 2026-09-04  
**Current Phase:** Phase 2 - Economy Sandbox  
**Next Action:** Start Phase 2 Session 2.1 — Resource Nodes & Visual Assets

## Quick Status
- ✅ GDD Complete
- ✅ Implementation Guide Created
- ✅ Phase 1 Session 1.1: Project Structure & Map Loading
- ✅ Phase 1 Session 1.2: Camera Controls
- ✅ Phase 1 Session 1.3: Grid System & Unit Spawning
- ✅ Phase 1 Session 1.4: Selection System
- ✅ Phase 1 Session 1.5: A* Pathfinding Implementation
- ✅ Phase 1 Session 1.6: Unit Movement & Commands
- ⬜ Phase 2: Economy Sandbox
- ⬜ Phase 3: Base Construction
- ⬜ Phase 4: Combat
- ⬜ Phase 5: AI
- ⬜ Phase 6: Vertical Slice
- ⬜ Phase 7: Polish

## Deferred / Carry-Over Items

- [x] Implement camera middle-mouse click + drag panning (`RTSCamera`)  
	Owner/Target: Phase 1 Session 1.2 follow-up  
	Resolution: Implemented in `RTSCamera.UpdateMiddleMouseDrag()` with zoom-aware movement and edge-pan suppression while dragging.

## Session Log

### 2026-09-04 - Phase 1 Session 1.6: Unit Movement & Commands
**Status:** Complete

**Completed:**
- ✅ Created `src/examples/rts/commands.js` — `Command` base class + `MoveCommand`
- ✅ `CommandStatus` frozen enum (`running: 0`, `complete: 1`) replaces magic strings/null
- ✅ `MoveCommand` computes A* path on construction, drives unit along waypoints at `unit.speed` px/s
- ✅ `Unit.Update()` FSM: executes current command each frame, transitions `Idle` ↔ `Moving`
- ✅ Right-click terrain → `IssueMoveCommand()` → each selected unit gets independent path
- ✅ `RTSGame.ScreenToWorld()` handles camera zoom/pan offset for correct world coordinate conversion
- ✅ `DrawMovingUnitPaths()` renders red dots + lines for selected moving units (world-space, inside camera transform)
- ✅ `rts.html` updated with `commands.js` script include (between `grid_map.js` and `entities.js`)

**Files Created/Modified:**
- `src/examples/rts/commands.js` — new file: `CommandStatus`, `Command`, `MoveCommand`
- `src/examples/rts/entities.js` — `Unit.Update()` extended with command execution FSM
- `src/examples/rts/rts_game.js` — `ScreenToWorld`, `IssueMoveCommand`, `DrawMovingUnitPaths`, right-click handler
- `rts.html` — added `commands.js` script include

**Key Design Decisions:**
- `CommandStatus = Object.freeze({running, complete})` — standard plain-JS enum idiom; integer values for fast comparison
- Each unit computes its own independent A* path to the same target (no shared path)
- `ClearCommands()` called before `AssignCommand()` on right-click — replaces queue immediately (AoE2 behavior)
- `DrawMovingUnitPaths()` scoped to selected units only to avoid visual noise

**Next Steps:**
1. Start Phase 2 Session 2.1 (Resource Nodes & Visual Assets)
2. Verify Phase 1 completion checklist before moving to Phase 2

---

### 2026-09-02 - Phase 1 Session 1.5: A* Pathfinding Implementation
**Status:** Complete

**Completed:**
- ✅ Created `src/engine/ai.js` — reusable engine-level AI utility module
- ✅ Implemented `AStarPathfinder` class with `FindPath(startWorld, endWorld)` → `Vector2[]`
- ✅ 8-directional movement with corner-cut prevention; Chebyshev heuristic
- ✅ Line-of-sight path smoothing via Bresenham's line (removes redundant waypoints)
- ✅ Nearest-walkable BFS fallback for blocked target cells
- ✅ Iteration cap (20 000) prevents runaway searches on unreachable targets
- ✅ `FindPathGrid(sc, sr, ec, er)` for grid-coordinate callers
- ✅ Wired into `RTSGame`: `this.pathfinder = new AStarPathfinder(this.gridMap)`
- ✅ Debug visualization: press **P** to path from first unit → far map corner, draws red dots + lines

**Files Created/Modified:**
- `src/engine/ai.js` — `AStarPathfinder` + `_MinHeap` (new engine module)
- `src/examples/rts/rts_game.js` — pathfinder instantiation, `DrawDebugPath()`, P-key test
- `rts.html` — added `<script src="src/engine/ai.js"></script>` after `tiled_loader.js`

**Key Design Decisions:**
- Placed in `src/engine/` (not `src/examples/rts/`) so any future game can reuse it
- Grid interface is duck-typed (`IsWalkable`, `IsInBounds`, `WorldToGrid`, `GridToWorld`) — works with any compatible grid
- `_MinHeap` is a private internal class (prefixed `_`) not intended for direct use

**Next Steps:**
1. Start Phase 1 Session 1.6 (Unit Movement & Commands)
2. Create `MoveCommand` that stores the A* path and drives unit movement
3. Wire right-click → `MoveCommand` assignment on selected units

---

### 2026-09-02 - Phase 1 Session 1.2 Follow-up: Middle-Mouse Drag Panning
**Status:** Complete

**Completed:**
- ✅ Implemented middle-mouse click + drag panning in `RTSCamera`
- ✅ Added zoom-aware drag movement (`delta / camera.scale`) for consistent feel across zoom levels
- ✅ Disabled edge-panning while dragging to prevent control conflict
- ✅ Added drag state visibility (`Drag: ON/OFF`) in camera debug overlay

**Files Modified:**
- `src/examples/rts/rts_camera.js` - Added drag state, `UpdateMiddleMouseDrag()`, and debug status line

**Validation Outcome:**
- ✅ Drag panning works with current camera controls (keyboard, edge-pan, zoom-to-cursor)
- ✅ No diagnostics errors after integration

---

### 2026-09-02 - Phase 1 Session 1.4: Selection System
**Status:** Complete

**Completed:**
- ✅ Created `SelectionManager` with `selectedEntities[]`, drag state, and max selection cap (60)
- ✅ Implemented single-click selection via collider-based world hit testing
- ✅ Implemented click-and-drag box selection finalized on left mouse release
- ✅ Added selection rectangle rendering (green translucent fill + stroke)
- ✅ Filtered selection to friendly units only (`ownerId === playerOwnerId`)
- ✅ Added Unit colliders for raycast/selection support
- ✅ Preserved selected visual rings on units
- ✅ Clear selection on empty terrain click

**Files Created/Modified:**
- `src/examples/rts/selection_manager.js` - selection logic, box rendering, screen->world conversion
- `src/examples/rts/rts_game.js` - SelectionManager integration in `Start`, `Update`, and `Draw`
- `src/examples/rts/entities.js` - Unit collider lifecycle (`Start`/`Destroy`) for hit testing
- `rts.html` - Added `selection_manager.js` script include

**Next Steps:**
1. Start Phase 1 Session 1.5 (A* Pathfinding)
2. Implement `Pathfinder.FindPath(startWorld, endWorld)`
3. Use Manhattan heuristic and return world-space waypoints
4. Handle unreachable goals gracefully and benchmark on current map

---

### 2026-09-02 - Phase 1 Session 1.3: Grid System & Unit Spawning
**Status:** Complete

**Completed:**
- ✅ Created `GridMap` with `walkable`, `buildable`, `occupied`, and `occupant` per cell
- ✅ Added world/grid conversion helpers (`WorldToGrid`, `GridToWorld`)
- ✅ Parsed Tiled `Ground` layer into terrain types (`grass`, `shore`, `water`)
- ✅ Created `Entity` and `Unit` base classes for RTS gameplay entities
- ✅ Spawned 5 test units at fixed/preferred grid cells with occupancy registration
- ✅ Added Y-sorting for world objects prior to draw
- ✅ Added grid debug overlay (semi-transparent terrain colors + occupied cell outline)
- ✅ Added `G` key toggle for live grid overlay debugging

**Files Created/Modified:**
- `src/examples/rts/grid_map.js` - Grid data model and conversion utilities
- `src/examples/rts/entities.js` - Entity/Unit base classes and deterministic placeholder rendering
- `src/examples/rts/rts_game.js` - Grid integration, unit spawn, Y-sort, grid debug overlay
- `rts.html` - Added script includes for `grid_map.js` and `entities.js`

**Next Steps:**
1. Start Phase 1 Session 1.4 (Selection System)
2. Add selection colliders/raycast handling for units
3. Implement click and drag-box selection
4. Draw selection rectangle and selected unit rings

---

### 2026-09-01 - Phase 1 Session 1.2: Camera Controls
**Status:** Complete

**Completed:**
- ✅ Added dedicated `RTSCamera` class extending engine `Camera`
- ✅ Implemented keyboard panning (arrow keys + WASD)
- ✅ Implemented edge-panning with 20px dead zone and acceleration curve
- ✅ Implemented mouse wheel zoom-to-cursor (0.5x to 2.0x)
- ✅ Implemented middle-mouse click + drag panning (zoom-aware)
- ✅ Implemented map-bounds clamping compatible with centered camera zoom transform
- ✅ Added live camera debug overlay (x/y/zoom + clamp min/max)
- ✅ Tuned keyboard panning to be slower than edge-panning

**Files Created/Modified:**
- `src/examples/rts/rts_camera.js` - RTS camera subclass with controls, clamp logic, debug overlay
- `src/examples/rts/rts_game.js` - Integrated `RTSCamera` into game lifecycle
- `rts.html` - Added script include for `rts_camera.js`
- `src/engine/tiled_loader.js` - Added support for embedded base64 tileset images

**Validation Outcome:**
- ✅ Current controls are stable and used as baseline for Session 1.3 integration.
- ✅ Session 1.2 follow-up completed (middle-mouse drag panning implemented).

---

### 2026-08-31 - Phase 1 Session 1.1: Project Structure & Map Loading
**Status:** Complete

**Completed:**
- ✅ Created rts.html with proper engine script loading order
- ✅ Created RTSGame class extending Game
- ✅ Configured game (1024x768, fillWindow, preserveAspectRatio)
- ✅ Set up TiledLoader integration
- ✅ Created 32x32 test map copied from the Tiled example
- ✅ Added map rendering with camera transforms
- ✅ Set up camera bounds based on map dimensions

**Files Created:**
- `rts.html` - HTML entry point
- `rts_game.js` - Main game class
- `assets/rts_map.json` - 32x32 test map (1024x1024 pixels)

**Next Steps:**
1. Open `rts.html` in browser (via http-server or Live Server)
2. Verify map renders without errors
3. Check console for confirmation messages
4. Verify FPS counter shows 60 FPS
5. Move to Session 1.2 (Camera Controls)

---

### 2026-08-31 - Planning Session
- Created comprehensive GDD with iterative development focus
- Added concrete values for resources, AI behavior, timings
- Created IMPLEMENTATION_GUIDE.md with task-by-task breakdown
- Established documentation structure for tracking progress

**Next Steps:**
1. Create rts.html from tileset.html template
2. Create RTSGame class skeleton
3. Load and render test map

## Known Issues
- None currently blocking Phase 1 progression.

## Performance Baseline
*To be established after Phase 1 Session 1*

## Files Created So Far

**Project Documentation:**
- `README.md` - Project overview and navigation guide
- `RTS_GDD.md` - Complete game design document (iterative, with V1/V1.x markers)
- `IMPLEMENTATION_GUIDE.md` - Task-by-task implementation roadmap (2-4 hour sessions)
- `SESSION_TEMPLATE.md` - Copilot prompt templates and quick reference
- `PROGRESS.md` - This file (current status tracker)
- `DECISIONS.md` - Architectural decision records (ADRs)

**Runtime/Gameplay:**
- `rts.html` - RTS example HTML entry point
- `src/examples/rts/rts_game.js` - RTSGame bootstrap, map loading, draw/update loop
- `src/examples/rts/rts_camera.js` - RTS camera controls and debug overlay
- `src/examples/rts/grid_map.js` - Grid map model and terrain/cell state parsing
- `src/examples/rts/entities.js` - RTS entity and unit base classes
- `src/examples/rts/assets/rts_map.json` - Test map used for Session 1
- `src/examples/rts/assets/rts_tileset.png` - Temporary tileset for map rendering
