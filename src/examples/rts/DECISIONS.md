# RTS Architectural Decisions Log

**Purpose:** Track key architectural decisions to maintain consistency across implementation sessions.

## Decision Format
Each entry includes: Date | Decision | Rationale | Alternatives Considered | Impact

---

## ADR-001: No Box2D Physics (2026-08-31)

**Decision:** Use kinematic movement with custom collision instead of Box2D.

**Rationale:** 
- RTS units need precise formation control and A* pathfinding
- Box2D physics can interfere with deliberate positioning
- Other spark.js examples already showcase Box2D

**Alternatives:**
- Box2D with kinematic bodies (adds complexity without benefit)
- Hybrid system (over-engineered for showcase)

**Impact:** 
- Must implement custom collision detection for unit spacing
- Simpler codebase, easier to debug pathfinding

---

## ADR-002: Grid-Based Everything (2026-08-31)

**Decision:** All spatial queries use 32x32 grid cells as the primary data structure.

**Rationale:**
- Pathfinding inherently grid-based
- Building placement naturally snaps to grid
- Fog of War maps to grid cells
- Simplifies world-to-logic conversions

**Alternatives:**
- Quadtree for spatial partitioning (adds complexity)
- Pure pixel-based coordinates (harder pathfinding)

**Impact:**
- All positions need world↔grid conversion utilities
- GridMap becomes central data structure
- Easier to implement and debug

---

## ADR-003: Command Pattern for Unit Actions (2026-08-31)

**Decision:** Units execute Command objects rather than hardcoded behaviors.

**Rationale:**
- Command queue support for Shift+Click
- Clean separation of input handling from unit logic
- Easy to add new commands without modifying Unit class
- AI can issue same commands as player (architectural showcase)

**Alternatives:**
- Direct method calls (tight coupling, no queuing)
- Event-driven system (over-engineered for V1)

**Impact:**
- Must create Command class hierarchy
- Validation logic lives in Commands
- Slightly more verbose but highly maintainable

---

## ADR-004: HTMLMenu for UI, Canvas for World (2026-08-31)

**Decision:** HUD and menus use HTML/CSS overlay; world elements render on canvas.

**Rationale:**
- HTML/CSS better for text, buttons, layouts
- Canvas better for world-space visuals (health bars, selection rings)
- Showcases spark.js HTMLMenu system
- Easier to style and iterate on UI

**Alternatives:**
- Pure canvas UI (harder to style, reinvent layout)
- Pure HTML (can't do world-space elements like health bars)

**Impact:**
- Need click-through CSS for non-interactive HUD elements
- Two rendering systems to coordinate
- Better visual quality and development speed

---

## ADR-005: Immediate Resource Deduction (2026-08-31)

**Decision:** Training/building costs deducted when queued, not when completed.

**Rationale:**
- Prevents double-spending exploits
- Simplifies AI resource management (no need to track "pending" costs)
- Matches Age of Empires 2 behavior (familiar to players)

**Alternatives:**
- Pay on completion (exploitable, complex accounting)
- Reserve resources in separate pool (unnecessary complexity)

**Impact:**
- Canceling refunds resources
- Population reserved immediately when queued
- Simpler player resource tracking

---

## ADR-006: V1 No Audio, V1.x Audio (2026-08-31)

**Decision:** Defer all audio implementation to V1.x polish phase.

**Rationale:**
- Audio doesn't block core gameplay validation
- Can be added via GameEventBus without touching core systems
- Keeps Phase 1-6 focused on mechanics
- Showcases clean event-driven architecture

**Alternatives:**
- Add audio incrementally (distracts from core loop)
- Skip audio entirely (missed showcase opportunity)

**Impact:**
- Phase 1-6 will be silent
- V1.x audio can be added in 1-2 days via event subscriptions
- No refactoring needed when audio is added

---

## ADR-007: Single Faction for V1 (2026-08-31)

**Decision:** V1 implements one base civilization; faction differentiation is V2.

**Rationale:**
- Faction balance is time-consuming and out-of-scope
- Core RTS loop doesn't require asymmetry to validate
- Data structure supports factions, just don't populate yet

**Alternatives:**
- Two factions with minor differences (scope creep risk)
- Multiple factions (completely out of scope)

**Impact:**
- "Humans" faction fully implemented
- Faction data structure exists but only has one entry
- Easy to extend in V2 by adding more faction data

---

## ADR-008: 128x128 Map for Stress Testing (2026-08-31)

**Decision:** Use a large 128x128 cell map (4096x4096 pixels).

**Rationale:**
- Tests pathfinding performance at scale
- Tests camera bounds and large-map navigation
- Tests rendering with many tiles and units
- More impressive showcase than tiny map

**Alternatives:**
- 64x64 (too small, trivial pathfinding)
- 256x256 (may have performance issues on slower machines)

**Impact:**
- Need efficient pathfinding (A* must be <50ms)
- May need path caching or hierarchical pathfinding
- Camera controls must handle large world

---

## ADR-009: Debug Mode Always Available (2026-08-31)

**Decision:** Press `D` key to toggle comprehensive debug overlays.

**Rationale:**
- Showcases engine's debugging capabilities
- Essential for development (visualize paths, grid, FSM states)
- Helpful for users learning from the example

**Alternatives:**
- Developer console only (less accessible)
- No debug mode (harder to understand example)

**Impact:**
- Must render debug overlays conditionally
- Small performance cost when enabled (acceptable)
- Adds educational value to the example

---

## ADR-010: Restart Must Be Bulletproof (2026-08-31)

**Decision:** Match restart without page reload is a P0 requirement.

**Rationale:**
- Tests spark.js memory management rigorously
- Showcases proper cleanup patterns
- Demonstrates production-quality architecture

**Alternatives:**
- Reload page to restart (easy but unimpressive)
- No restart (incomplete showcase)

**Impact:**
- Explicit cleanup checklist required
- All systems must implement proper dispose/reset
- Extra testing needed to verify no memory leaks

---

## ADR-011: Terrain Grid Overlay for Debugging (2026-09-02)

**Decision:** Add a world-space, semi-transparent grid overlay color-coded by terrain type, toggleable at runtime with `G`.

**Rationale:**
- Session 1.3 introduces terrain semantics (`grass`, `shore`, `water`) and occupancy state that must be validated visually.
- A live overlay makes pathfinding/blocking errors immediately visible without opening map data manually.
- Runtime toggle keeps the debug view accessible while preserving normal visual inspection.

**Alternatives:**
- Console-only terrain dumps (slow to interpret spatially)
- Permanent overlay always on (too noisy during regular playtests)
- External debug tooling (unnecessary setup overhead)

**Impact:**
- `RTSGame` now includes a `DrawGridDebugOverlay()` pass in camera/world space.
- Overlay colors are represented with in-engine `Color` objects for renderer consistency.
- Occupied cells are outlined distinctly to validate spawn and future unit/building reservation logic.

---

## Future Decisions

*Add new architectural decisions here as they arise during implementation.*

## Decision Review Schedule

After Phase 3: Review ADR-001 to ADR-010, verify they're still valid.  
After Phase 6: Review all decisions, document any changes made during implementation.
