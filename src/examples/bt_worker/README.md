# Behavior Tree Demo — Autonomous Resource Worker AI

**Entry point:** [`bt-worker.html`](../../../bt-worker.html)  
**Engine module:** [`src/engine/bt.js`](../../engine/bt.js)  
**Full API reference:** [`docs/ai.md`](../../../docs/ai.md#behavior-trees-btjs)

---

## What this example demonstrates

Two autonomous miners (**Miner Pip** and **Miner Bob**) gather gems and gold from crystal mines across the map and transport them to the central Town Hall. They must balance workload, stamina/fatigue, and survive a roaming predator (Wolf).

| Concept | Where to look |
|---|---|
| **Autonomous Economic Loop** | `WorkerBot._BuildBehaviorTree()` in `bt_worker.js` |
| **Reactive Priority Preemption (`BTReactiveSelector`)** | Evaluates safety & fatigue every frame, interrupting routine mining work when threatened or exhausted |
| **Continuous Precondition Aborts (`BTReactiveSequence`)** | `EvadeThreat` and `RestRoutine` re-evaluate their condition leaves every tick so they immediately abort when danger clears or stamina recovers |
| **Sequential Step-by-Step Execution (`BTSequence`)** | Select mine → Travel → Wait/Pickaxe animation → Extract chunk |
| **Decoupled Memory (`BTBlackboard`)** | Stores dynamic `targetMine` references and pathfinding targets |
| **Live Visual Tree Inspector (`DrawTreeInspector`)** | Real-time hierarchical HUD displaying live node states (`SUCCESS`, `FAILURE`, `RUNNING`, `IDLE`) |

---

## Controls

| Input | Action |
|---|---|
| **Left Click** | Teleport the roaming **Wolf / Predator** to the mouse cursor (tests danger reaction instantly) |
| **[E]** | Drain the selected worker's stamina to 5 (tests exhaustion and campfire resting on demand) |
| **[TAB]** or **[SPACE]** | Switch inspected worker (Miner Pip ↔ Miner Bob) |
| **[T]** | Toggle the live Behavior Tree Inspector panel on/off |

---

## The Worker's Behavior Tree Hierarchy

```
BTReactiveSelector: WorkerBrain
├── 1. BTReactiveSequence: EvadeThreat (Priority 1)
│   ├── BTCondition: IsThreatNear
│   └── BTAction: SprintToSafety
│
├── 2. BTReactiveSequence: RestRoutine (Priority 2)
│   ├── BTCondition: NeedsRest (stamina < 20% or resting)
│   ├── BTAction: WalkToCampfire
│   └── BTAction: RecoverStamina
│
├── 3. BTSequence: DepositCargo (Priority 3)
│   ├── BTCondition: IsBackpackFull (cargo >= 5)
│   ├── BTAction: WalkToTownHall
│   ├── BTWait: UnloadDelay (0.8s)
│   └── BTAction: DepositOre
│
├── 4. BTSequence: HarvestOre (Priority 4)
│   ├── BTAction: SelectBestMine
│   ├── BTAction: WalkToMine
│   ├── BTWait: ChopAnimation (0.5s)
│   └── BTAction: ExtractOreChunk
│
└── 5. BTSequence: CampIdle (Priority 5)
    ├── BTAction: WanderCamp
    └── BTWait: IdlePause (1.5s)
```

---

## Key Educational Concept: `BTSequence` vs `BTReactiveSequence`

One of the most common pitfalls in game AI programming is understanding the difference between **standard sequences** and **reactive sequences**:

### 1. Standard Sequence (`BTSequence`)
- Remembers which child is currently `RUNNING`.
- On subsequent ticks, it **resumes execution directly at the running child**, skipping earlier children that already succeeded.
- **Used for**: Multi-step sequential actions like `DepositCargo` and `HarvestOre` (e.g. Travel $\rightarrow$ Wait $\rightarrow$ Deposit).

### 2. Reactive Sequence (`BTReactiveSequence`)
- Evaluates from **child 0 on every single frame**, even if a subsequent child is currently `RUNNING`.
- If an earlier precondition (e.g. `IsThreatNear` or `NeedsRest`) suddenly returns `FAILURE`, the running action (`SprintToSafety` or `WalkToCampfire`) is **immediately aborted**!
- **Used for**: Interruptible states guarded by continuous conditions (e.g. while fleeing or resting).
