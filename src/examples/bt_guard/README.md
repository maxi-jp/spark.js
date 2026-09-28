# Behavior Tree Demo — Stealth Guard AI

**Entry point:** [`bt-guard.html`](../../../bt-guard.html)  
**Engine module:** [`src/engine/bt.js`](../../engine/bt.js)  
**Full API reference:** [`docs/ai.md`](../../../docs/ai.md#behavior-trees-btjs)

---

## What this example demonstrates

Two autonomous guard drones patrol a facility using a **Behavior Tree (BT)**. The player controls a stealth **Intruder** via the mouse cursor and can throw sound distractions by clicking the floor.

| Concept | Where to look |
|---|---|
| **Class-based Behavior Tree** | `StealthGuard._BuildBehaviorTree()` in `bt_guard.js` |
| **Reactive Priority Preemption (`BTReactiveSelector`)** | Evaluates combat chase & noise investigation every frame, cleanly interrupting routine patrol |
| **Multi-step procedural logic (`BTSequence`)** | Investigate noise → Walk to sound point → Look around with `BTWait` → Clear memory |
| **Decoupled memory sharing (`BTBlackboard`)** | Guards store and query `noisePos` and `lastKnownPos` without tight coupling |
| **Dual Sensory Perception** | Directional FOV vision cone + 360° close-quarters awareness + hearing distance |
| **Live On-Screen Tree Inspector (`DrawTreeInspector`)** | Real-time hierarchical visualization showing live node execution with colored status badges |
| **Overhead Entity Debug (`DrawDebug`)** | World-space badge above each guard indicating the active leaf node and state |

---

## Controls

| Input | Action |
|---|---|
| **Move the mouse** | Move the stealth intruder crosshair |
| **Left Click** | Drop a distraction sound pebble (creates expanding acoustic ripple) |
| **[TAB]** or **[SPACE]** | Switch inspected guard (Drone Alpha ↔ Drone Beta) |
| **[T]** | Toggle the live Behavior Tree Inspector panel on/off |

---

## Behavior Tree vs Finite State Machine (FSM)

In an **FSM**, states are rigid islands connected by transitions. As behaviors grow (e.g. adding noise distractions, search timers, and combat alerts), the number of transition wires multiplies exponentially (the *"transition explosion"* problem).

In a **Behavior Tree**, behaviors are arranged hierarchically as a tree:
1. **Composites** (`BTSelector`, `BTSequence`, `BTParallel`) dictate the control flow.
2. **Leaves** (`BTAction`, `BTCondition`, `BTWait`) execute concrete gameplay actions and queries.
3. **Decoupling**: New branches can be plugged in or reordered without editing existing branches.

### The Guard's Behavior Tree Hierarchy

```
BTReactiveSelector: GuardBrain
├── 1. BTSequence: CombatChase (Priority 1)
│   ├── BTCondition: CanSeeIntruder
│   └── BTAction: ChaseIntruder
│
├── 2. BTSequence: InvestigateNoise (Priority 2)
│   ├── BTCondition: HasHeardNoise
│   ├── BTAction: WalkToNoise
│   ├── BTWait: ScanNoiseArea (2.0s)
│   └── BTAction: ClearNoiseMemory
│
├── 3. BTSequence: SearchLastSeen (Priority 3)
│   ├── BTCondition: HasLostTarget
│   ├── BTAction: WalkToLastKnown
│   ├── BTWait: SearchArea (2.5s)
│   └── BTAction: GiveUpSearch
│
└── 4. BTSequence: PatrolRoutine (Priority 4)
    ├── BTAction: WalkToWaypoint
    └── BTWait: GuardPostPause (1.5s)
```

### How Reactive Interruption Works
Because the root node is a **`BTReactiveSelector`**, it evaluates children from top to bottom on **every single tick**:
- If a guard is peacefully executing `GuardPostPause` in the `PatrolRoutine`, and the player clicks the floor within hearing range, `HasHeardNoise` becomes true.
- The tree immediately aborts `PatrolRoutine` and switches to `InvestigateNoise`!
- While walking to the noise point, if the intruder accidentally enters the guard's field-of-view cone, `CanSeeIntruder` becomes true.
- The higher-priority `CombatChase` branch immediately preempts the noise investigation and initiates a chase!
- When the intruder slips around a corner, dashes behind the guard, or pulls beyond maximum chase range ($>235\text{px}$), visual contact is broken.
- `ChaseIntruder` returns `BTStatus.FAILURE`, causing `CombatChase` to end.
- The `BTReactiveSelector` falls down to **Priority 3 (`SearchLastSeen`)**:
  1. `HasLostTarget` detects that `lastKnownPos` is recorded in the blackboard.
  2. The guard dashes to the purple `? LAST SEEN` marker where the player was last spotted.
  3. Upon reaching the spot, the guard sweeps its sensor head left and right while `BTWait: SearchArea (2.5s)` runs.
  4. Once 2.5 seconds elapse without re-spotting the player, `GiveUpSearch` removes `lastKnownPos` and returns `SUCCESS`.
  5. The tree falls back to **Priority 4 (`PatrolRoutine`)**, and the guard peacefully resumes its route.
