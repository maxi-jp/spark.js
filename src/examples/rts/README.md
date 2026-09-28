# spark.js RTS Example - Project Overview

A simplified Age of Empires 2-style real-time strategy game built to showcase the spark.js engine's capabilities.

---

## 📁 Project Structure

```
src/examples/rts/
├── README.md                    ← You are here
├── RTS_GDD.md                   ← Complete game design document
├── IMPLEMENTATION_GUIDE.md      ← Task-by-task development roadmap
├── SESSION_TEMPLATE.md          ← Quick-start template for Copilot sessions
├── rts.html                     ← Entry point (to be created)
├── rts_game.js                  ← Main game class (to be created)
├── assets/                      ← Graphics and audio (to be created)
│   ├── map/
│   ├── units/
│   ├── buildings/
│   └── audio/
└── [additional .js files created during implementation]
```

---

## 🎯 Documentation Guide

### Start Here

1. **New to the project?**  
   → Read `RTS_GDD.md` Section 1 (Concept Overview)  
   → Skim `IMPLEMENTATION_GUIDE.md` Phase 1 to understand first steps

2. **Ready to start coding?**  
   → Open `IMPLEMENTATION_GUIDE.md`  
   → Follow Phase 1, Session 1.1  
   → Use `SESSION_TEMPLATE.md` for Copilot prompts

3. **Resuming after a break?**  
   → Read `PROGRESS.md` (current status)  
   → Check `IMPLEMENTATION_GUIDE.md` progress table  
   → Use "Resuming After Interruption" prompt from `SESSION_TEMPLATE.md`

4. **Making a design decision?**  
   → Check `DECISIONS.md` for existing ADRs  
   → Consult `RTS_GDD.md` for specifications  
   → Add new ADR if making architectural choice

---

## 📖 Document Purposes

### `RTS_GDD.md` - The "What" and "Why"
- **Complete game design specifications**
- Mechanics, systems, balance values
- Scope definitions (V1 / V1.x / V2)
- Data tables (unit stats, buildings, resources)
- **Use when:** Implementing features, answering design questions

### `IMPLEMENTATION_GUIDE.md` - The "How" and "When"
- **Task-by-task implementation roadmap**
- Broken into 2-4 hour work sessions
- File creation order and dependencies
- Acceptance criteria for each session
- **Use when:** Starting work, tracking progress, staying focused

### `SESSION_TEMPLATE.md` - The "Quick Reference"
- **Copilot prompt templates**
- Common code patterns
- Debugging checklist
- Session start/end procedures
- **Use when:** Beginning any work session

### `PROGRESS.md` - The "Status"
- **Current development state**
- What's done, what's next
- Known issues and blockers
- **Update after:** Every work session

### `DECISIONS.md` - The "Rationale"
- **Architectural decision records (ADRs)**
- Why certain approaches were chosen
- Trade-offs and alternatives
- **Add to:** When making significant design choices

---

## 🚀 Quick Start (First Time Setup)

### Phase 0: Before Writing Code

1. ✅ Read `RTS_GDD.md` Sections 1-3 (concept, mechanics, systems)
2. ✅ Read `IMPLEMENTATION_GUIDE.md` Phase 1 overview
3. ✅ Check that spark.js engine is working:
   ```bash
   # From project root
   python -m http.server 8000
   # Open http://localhost:8000/tileset.html to verify engine works
   ```

### Phase 1: First Session

1. Open `IMPLEMENTATION_GUIDE.md`
2. Go to **Phase 1, Session 1.1**
3. Follow the task list step-by-step
4. Use the Copilot prompt template from `SESSION_TEMPLATE.md`
5. Test after each major task
6. Commit when session is complete

---

## 🎓 Development Philosophy

This project follows **iterative showcase development**:

1. **Simplest functional version first** - No placeholder systems
2. **One session at a time** - Complete before moving forward
3. **Test frequently** - Every session produces working code
4. **Commit after sessions** - Clear progress checkpoints
5. **Context-aware** - Limited file scope per session (≤5 files)

### Version Markers

- **V1 Core** = Minimum playable RTS (Phase 1-6)
- **V1.x Polish** = Engine showcase features (Phase 7)
- **V2 Future** = Post-showcase expansions (not in scope)

---

## 📊 Development Timeline

| Phase | Duration | Goal | Status |
|-------|----------|------|--------|
| **Phase 1** | 2-3 days | Movement sandbox (units + camera) | ⬜ |
| **Phase 2** | 3-4 days | Economy (gather + resources) | ⬜ |
| **Phase 3** | 4-5 days | Construction (build + train) | ⬜ |
| **Phase 4** | 5-6 days | Combat (attack + destroy) | ⬜ |
| **Phase 5** | 6-7 days | AI opponent | ⬜ |
| **Phase 6** | 3-4 days | Vertical slice (balance + ages) | ⬜ |
| **Phase 7** | 4-5 days | Polish (particles + audio + minimap) | ⬜ |

**Total:** 4-5 weeks of focused development

---

## 🎮 Core Features

### V1 Core (Playable Game)
- ✅ Unit selection (box selection, control groups)
- ✅ Pathfinding with A* around obstacles
- ✅ Resource gathering (wood, food, gold, stone)
- ✅ Base construction (buildings, population system)
- ✅ Combat (melee + ranged units, damage system)
- ✅ AI opponent (autonomous economy + military)
- ✅ Age progression (3 ages with unlocks)
- ✅ Win/loss conditions (destroy Town Center)
- ✅ In-game restart (memory leak test)

### V1.x Polish (Engine Showcase)
- Fog of War (grid-based visibility)
- Particle effects (destruction, combat, age-up)
- Audio system (spatial sounds, music, voice barks)
- Minimap (interactive, clickable)
- Debug visualizations (paths, FSM states, grids)

### V2 Future (Not in Initial Scope)
- Multiple factions
- Campaign mode
- Advanced military commands (patrol, guard)
- Constructed farms
- Naval units
- Save/load

---

## 🛠️ Tech Stack

- **Engine:** spark.js (plain JavaScript, no bundler)
- **Pathfinding:** A* algorithm on 32x32 grid
- **Rendering:** Canvas 2D (HTML5 canvas)
- **UI:** HTML/CSS overlays via HTMLMenu
- **Architecture:** Command pattern, FSM, event bus
- **Map Editor:** Tiled Map Editor (JSON export)

---

## 🧩 Key Systems Overview

### 1. Grid System
- 32x32 pixel cells
- Tracks walkable, buildable, occupied state
- Used by pathfinding, building placement, fog of war

### 2. Command System
- Units execute Command objects
- Supports command queuing (Shift+Click)
- Validates commands before execution
- AI and player use same commands

### 3. Entity Hierarchy
```
GameObject (spark.js base)
└── Entity (health, owner, vision)
    ├── Unit (commands, movement, FSM)
    │   ├── Villager (gathering, building)
    │   └── MilitaryUnit (combat, aggro)
    ├── Building (grid footprint, production)
    └── ResourceNode (amount, depletion)
```

### 4. Game Event Bus
- Decouples systems
- Audio, particles, UI subscribe to gameplay events
- Enables clean restart/reset

---

## 🎯 Copilot Usage Tips

### Staying Focused
1. **Work on one session at a time** - Don't skip ahead
2. **Keep <5 files open** - Reduce context overload
3. **Test after each task** - Catch issues early
4. **Commit after sessions** - Clear checkpoints
5. **Use provided prompts** - Templates in `SESSION_TEMPLATE.md`

### When Stuck
1. Check `RTS_GDD.md` for specifications
2. Check `DECISIONS.md` for rationale
3. Search existing spark.js examples for patterns
4. Refer to `.github/copilot-instructions.md` for engine API
5. Use "Debugging a Problem" prompt from `SESSION_TEMPLATE.md`

### Context Management
- Reference specific GDD sections in prompts
- Link to Implementation Guide session numbers
- Mention relevant ADRs from decisions log
- Describe what's already working
- State clear next step

---

## 📚 Related Documentation

- **spark.js Engine Docs:** `docs/` folder in project root
- **Engine API Reference:** `.github/copilot-instructions.md`
- **Tiled Integration Guide:** `docs/tiled-integration.md`
- **Input System:** `docs/input-system.md`
- **Timer System:** `docs/timers.md`

---

## 🎉 Getting Help

If you're truly stuck:

1. **Check console errors** - 90% of issues show there
2. **Enable debug mode** - Press `D` in-game to see overlays
3. **Compare to working examples** - Browse `src/examples/`
4. **Read engine source** - `src/engine/` has implementation details
5. **Review ADRs** - `DECISIONS.md` explains "why"

---

## 📝 Contributing to This Project

When adding to the codebase:

1. ✅ Follow the Implementation Guide sequence
2. ✅ Update progress in `PROGRESS.md`
3. ✅ Add ADRs to `DECISIONS.md` for design choices
4. ✅ Keep code consistent with existing examples
5. ✅ Test before committing
6. ✅ Write descriptive commit messages

---

## 🎮 Final Product Vision

By the end of Phase 6, you'll have:

- A fully playable 1v1 RTS match
- Player vs AI opponent
- Start → Gather → Build → Age Up → Train Army → Fight → Win/Lose → Restart
- 15-20 minute match duration
- Solid 60 FPS performance
- Clean architecture demonstrating spark.js capabilities

By the end of Phase 7, you'll add:

- Polish and visual effects
- Audio feedback
- Advanced UI features
- A production-quality showcase piece

---

**Ready to build an RTS? Start with Phase 1, Session 1.1 in `IMPLEMENTATION_GUIDE.md`!** 🚀
