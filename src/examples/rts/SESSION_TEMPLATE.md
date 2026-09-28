# RTS Project - Copilot Session Quick Start

**Use this template when starting or resuming work on the RTS project.**

---

## 📋 Pre-Session Checklist

Before starting work:

1. ✅ Read `PROGRESS.md` to see current status
2. ✅ Check git log for last commit message
3. ✅ Open `IMPLEMENTATION_GUIDE.md` to find current session
4. ✅ Review `RTS_GDD.md` sections relevant to current phase
5. ✅ Run the game to verify existing functionality

## 🧠 Commonly Forgotten Items

Keep this list short and update it whenever something gets missed twice.

- [ ] Debug overlays still toggle correctly (`G` for grid, `D` for debug mode)
- [ ] New gameplay objects are added with `game.AddGameObject()` (not direct push)
- [ ] Grid occupancy is updated when spawning/despawning entities

## 📌 Deferred / Carry-Over Items

When a task is discovered but intentionally left undone:

1. Add it immediately to `PROGRESS.md` under **Deferred / Carry-Over Items**.
2. Add owner/session target (for example: `Phase 1 Session 1.2 follow-up`).
3. Do not mark the original session as fully complete until the deferred item is done.
4. At next session start, resolve carry-over items before new scope.

---

## 🎯 Current Session Info

**Fill this out at start of each session:**

**Current Phase:** ___________  
**Current Session:** ___________  
**Session Goal:** ___________  
**Files to Create:** ___________  
**Files to Modify:** ___________  
**Expected Duration:** ___________  

---

## 💬 Copilot Prompt Templates

### Starting a New Session
```
I'm working on the spark.js RTS example project.

Current Phase: [Phase X - Description]
Current Session: [X.Y - Session Name]
Goal: [What this session accomplishes]

Context:
- Working from IMPLEMENTATION_GUIDE.md
- Current status tracked in PROGRESS.md
- Architectural decisions in DECISIONS.md

This session requires:
1. [Task 1]
2. [Task 2]
3. [Task 3]

Files involved: [list]

Please help me implement [specific first task].
```

### Resuming After Interruption
```
I'm resuming work on the RTS project after interruption.

Last Known State:
- Phase: [X]
- Session: [X.Y]
- Last Commit: [commit message or "uncommitted work"]
- Status: [what was working]

Current Issue/Next Task:
[Describe where you were or what broke]

Files I was working on:
[list files]

Context needed:
[Any specific files or sections I should review]

Please help me [resume work / fix issue / continue from checkpoint].
```

### Debugging a Problem
```
I'm debugging an issue in the RTS project.

Current Phase: [X]
Symptom: [What's broken]
Expected Behavior: [What should happen]
Actual Behavior: [What actually happens]
Console Errors: [any errors or "none"]

Relevant files:
[list]

Recent changes:
[what was added/modified before issue appeared]

Architectural context:
[relevant ADRs or GDD sections]

Please help me diagnose and fix this issue.
```

### Implementing a Specific Feature
```
I need to implement [feature name] for the RTS project.

Context:
- GDD Section: [X.Y - link to relevant section]
- Implementation Guide: [Phase X, Session Y]
- Dependencies: [what must exist first]

Requirements from GDD:
[paste relevant requirements]

Technical approach:
[class/file structure needed]

Please help me implement this feature following the project architecture.
```

---

## 🔍 Context Files Reference

**Always have these available:**

| File | Purpose | When to Read |
|------|---------|--------------|
| `RTS_GDD.md` | Game design specs | When implementing any feature |
| `IMPLEMENTATION_GUIDE.md` | Task breakdown | Start of every session |
| `PROGRESS.md` | Current status | Beginning and end of sessions |
| `DECISIONS.md` | Architecture decisions | When making design choices |
| `.github/copilot-instructions.md` | spark.js engine reference | When using engine features |

---

## 🎨 Common Code Patterns

### Creating a New Entity Class
```javascript
class NewEntity extends Entity {
    constructor(position, ownerId) {
        super(position, 0, 1, spriteImage);
        this.ownerId = ownerId;
        this.health = 100;
        this.maxHealth = 100;
        this.visionRadius = 160;
        this.collider = new CircleCollider(Vector2.Zero(), 16, this);
        game.AddCollider(this.collider);
    }
    
    Update(deltaTime) {
        super.Update(deltaTime);
        // Entity-specific logic
    }
    
    OnDestroy() {
        game.RemoveCollider(this.collider);
        super.OnDestroy();
    }
}
```

### Creating a New Command
```javascript
class NewCommand {
    constructor(target) {
        this.target = target;
    }
    
    Validate(unit) {
        // Check if command is still valid
        return this.target && this.target.active;
    }
    
    Execute(unit, deltaTime) {
        // Execute command logic
        // Return COMMAND.complete when finished, null when in progress
        if (conditionMet) {
            return COMMAND.complete;
        }
        return null;
    }
    
    Cancel(unit) {
        // Cleanup when command is interrupted
    }
}
```

### Adding to GameEventBus
```javascript
// Emit event
GameEventBus.Emit('event_name', { 
    data: value,
    entity: this
});

// Subscribe to event (in system setup)
GameEventBus.Subscribe('event_name', (data) => {
    // Handle event
});
```

### Grid Conversions
```javascript
// World position to grid cell
const cell = gridMap.WorldToGrid(worldPosition);

// Grid cell to world position (center of cell)
const worldPos = gridMap.GridToWorld(cell.col, cell.row);

// Check if position is walkable
const walkable = gridMap.IsWalkable(cell.col, cell.row);
```

---

## ✅ Session End Checklist

Before ending a work session:

1. [ ] Test current functionality (no regressions)
2. [ ] Update `PROGRESS.md` with status
3. [ ] Update progress table in `IMPLEMENTATION_GUIDE.md`
4. [ ] Commit changes with descriptive message
5. [ ] Note any blockers or issues for next session
6. [ ] Verify no console errors
7. [ ] Check FPS counter (should be 60 FPS)

---

## 🐛 Quick Debugging Checklist

If something isn't working:

1. **Check console** - Any errors?
2. **Check network tab** - Assets loading?
3. **Check references** - Null pointer exceptions?
4. **Check engine globals** - Is `game`, `renderer` defined?
5. **Check game loop** - Is `Update()` being called?
6. **Check drawing** - Is `Draw()` being called?
7. **Enable debug mode** - Press `D` to see overlays
8. **Check colliders** - Are they registered?
9. **Check command validity** - Is `Validate()` failing?
10. **Check grid state** - Are cells occupied correctly?

---

## 📊 Performance Monitoring

Keep these metrics visible during development:

- **FPS:** Should stay at 60 (45 acceptable under stress)
- **Entity Count:** Track units + buildings + resources
- **Active Commands:** How many units are processing commands
- **Pathfinding Calls:** Monitor A* frequency

If FPS drops below 45:
1. Check Chrome DevTools Performance profiler
2. Look for tight loops in Update()
3. Consider caching or spatial partitioning
4. Refer to GDD Section 5 performance targets

---

## 🎓 Learning Resources

If stuck on engine-specific questions:

1. **Check existing examples:** Browse `src/examples/` for patterns
2. **Check engine source:** Look at `src/engine/` for implementation details
3. **Check docs:** Read `docs/` for feature guides
4. **Check copilot instructions:** `.github/copilot-instructions.md` has API reference

---

## 🚀 Session Start Command

Copy this into terminal to verify setup:
```bash
# Check current branch
git branch

# See last commit
git log -1 --oneline

# Run the game (if server needed)
# python -m http.server 8000
# Then open http://localhost:8000/rts.html
```

---

**Ready to start? Pick your current session from IMPLEMENTATION_GUIDE.md and begin!**
