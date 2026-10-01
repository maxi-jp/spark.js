# AI Comparison — Vision-Limited Autonomous Rubbish Collection

**Entry point:** [`cleaner_bots.html`](../../../cleaner_bots.html)  
**Engine modules:** [`src/engine/fsm.js`](../../engine/fsm.js), [`src/engine/bt.js`](../../engine/bt.js)  
**Full API reference:** [`docs/ai.md`](../../../docs/ai.md)

---

## What this example demonstrates

Different autonomous robots compete to collect vision-limited rubbish scattered across an arena. They must also manage battery levels and return to a central charging pad. This example showcases **three fundamentally different AI architectures** solving the same problem domain, all operating under identical constraints.

| Approach | Bot Type | Count | Key Insight |
|---|---|---|---|
| **Hybrid FSM + BT** | FSMBTRobot (A/B/C/D) | 4 | Mode management (FSM) + decision sequences (BT) |
| **FSM-only** | FSMBot | 1 | Simpler, stateful decision-making without trees |
| **BT-only** | BTBot | 1 | Pure reactive behavior; all state in blackboard |

**Key constraints** (all bots have equal opportunity):
- **Vision Range:** 200 pixels — bots only see rubbish within this radius
- **Battery Management:** Passive drain (3.5/s), active drain while moving, recharge at pad (28/s net)
- **Fair Spawning:** Rubbish clusters spawn randomly; no bot has a map advantage
- **Score Tracking:** Leaderboard shows real-time collection counts (🗑 icon)

---

## Controls

| Input | Action |
|---|---|
| **Click on a bot** | Select that bot for inspection |
| **[SPACE]** | Cycle to the next bot |
| **[D]** | Toggle **Debug Mode** (shows vision range circles, state labels, BT tree) |
| **[E]** | Emergency drain: Drop selected bot's battery to 5% |
| **[B]** | Break selected bot (if FSMBTRobot): Trigger a 5-second breakdown |

---

## Three AI Architectures, One Problem

### Architecture 1: Hybrid FSM + BT (FSMBTRobot)

**Philosophy:** FSM decides *mode*, BT decides *action*.

```
FSM State Machine (mode layer)
├── Active       ──→ BT decides: Collect or Wander
│                    (Battery: -4/s, rare random breaks)
├── LowBattery   ──→ BT: Drive to charger
│                    (Battery: -1.5/s)
├── Charging     ──→ Recharge until 100%
│                    (Battery: +28/s)
└── Broken       ──→ Frozen for 5 seconds
                     (Battery: unchanged)

Active Mode Behavior Tree
├── BTReactiveSelector
    ├── Collect Routine
    │   ├── Acquire Target (find nearest rubbish in vision range)
    │   ├── Navigate To Target
    │   └── Pick Up
    └── Wander (fallback when no target visible)
```

**Strengths:**
- Separation of concerns: FSM handles broad mode logic, BT handles tactical sequences
- Robust to mid-action interruptions (battery drop, new targets)
- Easy to add new modes (sleep, idle, lost…) without touching BT

**Weaknesses:**
- More boilerplate (two systems to understand and debug)
- Potential disconnect if FSM and BT disagree about capability

---

### Architecture 2: FSM-only (FSMBot)

**Philosophy:** All behaviour encoded in states; use FSM's declarative guards for transitions.

```
FSM State Machine
├── Idle
│   ├── Scan vision range for rubbish
│   ├── If found: claim it and transition to Seek
│   ├── If not: wander slowly (38% speed) with persistent target
│   └── Battery: -3.5/s
├── Seek
│   ├── Drive toward claimed target
│   ├── Pick up when <14px away
│   ├── Exit releases claim on failure
│   └── Battery: -3.5/s
├── LowBattery
│   ├── Steer to charger (ignore rubbish)
│   └── Battery: -1.5/s
└── Charging
    ├── Dock at pad
    └── Battery: +28/s
```

**Strengths:**
- Simpler mental model: only one system to debug
- Fewer symbols (no BT nodes to understand)
- Responsive to declarative guards (immediate state flip)

**Weaknesses:**
- All logic lives in state Enter/Update/Exit — can get crowded
- Harder to add complex decision trees (long if/else chains in Update)
- No tree visualization for debugging intricate behaviours

---

### Architecture 3: BT-only (BTBot)

**Philosophy:** All behaviour, including mode selection, as a behavior tree with blackboard memory.

```
Behavior Tree (root: BTReactiveSelector)
├── Phase 1: Charge Cycle
│   ├── Condition: Battery ≤ 20%
│   ├── Sequence
│   │   ├── Release any claimed target
│   │   ├── Drive to charger
│   │   └── Recharge until 100%
├── Phase 2: Collect Cycle
│   ├── Condition: Battery > 20%
│   └── Reactive Sequence
│       ├── Acquire Target
│       ├── Navigate To
│       └── Pick Up
└── Phase 3: Wander (fallback)
    └── Explore with 38% speed
```

**Strengths:**
- Single, unified behavior system — pure composition
- Blackboard is a clean state store (no scattered properties)
- Reactive selectors naturally preempt lower-priority actions
- Tree structure is visually debuggable

**Weaknesses:**
- More nodes to write (charge decision appears as explicit Condition + Sequence, not mode container)
- Blackboard cleanup is critical (stale state = bugs)
- Tree can feel verbose for simple decisions

---

## When to Use Each Approach

| Scenario | Recommendation | Why |
|---|---|---|
| **Simple, linear AI** (patrol, chase, flee) | FSM | States are self-contained; guards are natural |
| **Mode switching** (exploring → alert → attacking → sleeping) | Hybrid FSM + BT | FSM layers cleanly; BT fills each mode's action detail |
| **Complex, nested decision trees** (plan recovery, conditional ability locks) | BT-only | Tree structure mirrors problem; composites handle complexity |
| **Many concurrent sub-goals** (attack + defend + orbit) | BT-only + BTParallel | Parallel nodes express simultaneity elegantly |
| **Strict state machine** (elevator states, traffic lights) | FSM | No ambiguity; every frame has one exact state |
| **Highly reactive, no memory** (particle systems, shader effects) | Neither; use direct Update() | FSM/BT overhead unjustified |

---

## Fairness: Vision Range & Battery Mechanics

All six bots operate under **identical constraints** to ensure fair competition:

### Vision Range (200 px)
```javascript
visionRange = 200;  // Only targets within 200px are visible
// Target acquisition uses squared distance for efficiency:
if (Vector2.SqrMagnitude(this.position, rubbish.position) <= visionSq) {
    // Rubbish is visible
}
```

### Battery Drain
| State | Drain Rate | Rationale |
|---|---|---|
| **Idle/Seeking** | -3.5/s (or -4/s for FSMBTRobot) | Passive thinking + minor movement |
| **LowBattery** | -1.5/s | Slow drift to charger (no thrashing) |
| **Charging** | +28/s (offset by -3.5 drain) = +24.5/s net | Incentivizes charging over constant seeking |
| **Broken** | 0/s | Frozen, no drain or charge |

### Spawning Logic
```javascript
// Respawn 5 rubbish in clusters when total collected < 8
_SpawnRubbish(5) {
    // Pick random anchor, scatter ±110px X, ±90px Y
    // Ensures variety without central bias
}
```

---

## Code Walkthrough

### FSMBTRobot: Hybrid Architecture

**Constructor:**
```javascript
constructor(name, position, world) {
    super(name, position, world);
    this.moveSpeed = 85;
    this.blackboard = new BTBlackboard();
    this._BuildFSM();    // FSM layer (mode)
    this._BuildBT();     // BT layer (action)
}
```

**FSM Layer** — Mode Container:
```javascript
_BuildFSM() {
    this.fsm = new FSM(this, 'active')
        .AddState('active',     new FSMBTActiveState(this))
        .AddState('lowBattery', new FSMBTLowBatteryState(this))
        .AddState('charging',   new FSMBTChargingState(this))
        .AddState('broken',     new FSMBTBrokenState(this))
        .Start();
}
```

**BT Layer** — Decision Sequences (only runs during 'active' mode):
```javascript
_BuildBT() {
    const root = new BTReactiveSelector('TitanCollectAI');
    
    // Try to collect; fall back to wander
    root.AddChild(new BTSequence('Collect')
        .AddChild(new BTAction('AcquireTarget', (dt, o, bb) => this._AcquireTarget(bb)))
        .AddChild(new BTAction('NavigateTo', (dt, o, bb) => this._ActionNavigateTo(dt, bb)))
        .AddChild(new BTAction('PickUp', (dt, o, bb) => this._ActionPickUp(bb)))
    );
    
    root.AddChild(new BTAction('Wander', (dt, o, bb) => this._ActionWander(dt, bb)));
    
    this.bt = new BehaviorTree(this, root, this.blackboard);
}
```

**FSM Active State** — Ticks the BT:
```javascript
class FSMBTActiveState extends FSMState {
    constructor(robot) {
        super();
        this.robot = robot;
        this.AddTransition('lowBattery', owner => owner.battery <= 20);
        this.AddTransition('broken', owner => RandomBetweenFloat(0, 1) < 0.0008 * owner.Battery);
    }
    
    Update(dt, owner, fsm) {
        owner.battery -= 4 * dt;  // Active drain
        owner.bt.Update(dt);       // ← BT ticks here
        owner._UpdatePosition();
    }
}
```

### FSMBot: FSM-only

**State Flow:**
```javascript
class FSMIdleState extends FSMState {
    constructor() {
        super();
        this.AddTransition('seek', owner => owner._target !== null);
        this.AddTransition('lowBattery', owner => owner.battery <= 20);
    }
    
    Update(dt, owner, fsm) {
        owner.battery -= 3.5 * dt;
        
        // Scan for rubbish in vision range
        owner._target = owner.world.rubbish.find(r =>
            !r.collected && !r.claimedBy &&
            Vector2.SqrMagnitude(owner.position, r.position) <= owner.visionSq
        );
        
        if (!owner._target) {
            // No target visible → wander
            if (!owner._wanderTarget || owner.position.distance(owner._wanderTarget) < 12) {
                // Pick new waypoint
                owner._wanderTarget = new Vector2(
                    RandomBetweenInt(30, 960 - 30),
                    RandomBetweenInt(30, 620 - 30)
                );
            }
            owner._SteerAndMove(owner._wanderTarget, owner.moveSpeed * 0.38, dt);
        }
        
        owner._UpdatePosition();
    }
}

class FSMSeekState extends FSMState {
    constructor() {
        super();
        this.AddTransition('idle', owner =>
            owner._target === null || owner._target.collected || owner._target.claimedBy !== owner
        );
        this.AddTransition('lowBattery', owner => owner.battery <= 20);
    }
    
    Update(dt, owner, fsm) {
        owner.battery -= 3.5 * dt;
        owner._SteerAndMove(owner._target.position, owner.moveSpeed, dt);
        
        if (Vector2.SqrMagnitude(owner.position, owner._target.position) < 14 * 14) {
            // Pickup!
            owner._target.collected = true;
            owner.score++;
        }
        
        owner._UpdatePosition();
    }
    
    Exit(owner, next) {
        // Release claim when leaving (in case target was lost)
        if (owner._target) {
            owner._target.claimedBy = null;
        }
    }
}
```

### BTBot: BT-only

**Tree Construction:**
```javascript
_BuildBT() {
    const root = new BTReactiveSelector('CleanerAI');
    
    // Phase 1: Low battery → Charge
    const chargeCycle = new BTSequence('ChargeCycle');
    chargeCycle.AddChild(new BTCondition('NeedsCharge', (o, bb) =>
        o.battery <= 20 ? BTStatus.SUCCESS : BTStatus.FAILURE
    ));
    chargeCycle.AddChild(new BTAction('ReleaseTarget', (dt, o, bb) => {
        bb.Delete('target');
        return BTStatus.SUCCESS;
    }));
    chargeCycle.AddChild(new BTAction('GoToCharger', (dt, o, bb) =>
        this._ActionGoToCharger(dt, bb)
    ));
    chargeCycle.AddChild(new BTAction('Recharge', (dt, o, bb) =>
        this._ActionRecharge(dt)
    ));
    root.AddChild(chargeCycle);
    
    // Phase 2: Collect
    const collectCycle = new BTReactiveSequence('Collect');
    collectCycle.AddChild(new BTAction('AcquireTarget', (dt, o, bb) =>
        this._AcquireTarget(bb)
    ));
    collectCycle.AddChild(new BTAction('NavigateTo', (dt, o, bb) =>
        this._ActionNavigateTo(dt, bb)
    ));
    collectCycle.AddChild(new BTAction('PickUp', (dt, o, bb) =>
        this._ActionPickUp(bb)
    ));
    root.AddChild(collectCycle);
    
    // Phase 3: Fallback
    root.AddChild(new BTAction('Wander', (dt, o, bb) =>
        this._ActionWander(dt, bb)
    ));
    
    this.bt = new BehaviorTree(this, root, this.blackboard);
}
```

---

## Debug Visualization

### Real-Time Tree Inspector (BT bots only)
Press **[D]** to enable:
- Full hierarchy with node names
- Live status indicators: ✓ SUCCESS / ✗ FAILURE / ► RUNNING / ○ IDLE
- Cooldown timers for decorators
- Blackboard contents

### FSM State Panel (FSM bots only)
Press **[D]** to enable:
- Four state boxes: Idle / Seek / LowBattery / Charging
- Active state marked with ▶ indicator
- Current battery % displayed
- Current score

### Vision Range Circles (all bots, debug mode)
- Semi-transparent circle at 200px radius
- Green tint for FSMBTRobot
- Yellow tint for FSMBot
- Teal tint for BTBot

### Goal Lines (all bots, debug mode)
- Green/orange/teal line from bot to current target rubbish
- Blue line from bot to charging pad (when battery < 30%)

---

## Using These Patterns in Your Own Game

### Use the Hybrid (FSM + BT) When:
- You have **natural operational modes** (idle, alert, attacking, retreating)
- Each mode has **complex decision trees** as sub-behavior
- You want **easy visualization** of high-level behavior

```javascript
class Enemy extends GameObject {
    constructor(pos, player) {
        super(pos, 0, 1);
        this.player = player;
        this.bb = new BTBlackboard();
        
        // FSM handles the "what should I be doing?" question
        this.fsm = new FSM(this, 'patrol')
            .AddState('patrol', new PatrolState())
            .AddState('alert',  new AlertState())
            .AddState('attack', new AttackState())  // ← each mode has a BT inside
            .Start();
    }
    
    Update(dt) {
        this.fsm.Update(dt);
        // If in attack mode, the AttackState's BT is ticking
    }
}

class AttackState extends FSMState {
    constructor(enemy) {
        this.enemy = enemy;
    }
    
    Enter(owner, prev) {
        // Build and start the attack BT when entering combat
        const root = new BTSelector('Combat')
            .AddChild(/* dodge if player aims */)
            .AddChild(/* charge attack if ready */)
            .AddChild(/* circle strafe */);
        this.bt = new BehaviorTree(owner, root, owner.bb);
    }
    
    Update(dt, owner, fsm) {
        this.bt.Update(dt);
        if (owner.health <= 0) fsm.Transition('flee');
    }
}
```

### Use FSM-Only When:
- Behavior is **simple and linear** (small state count)
- You want **maximum simplicity** and minimal boilerplate
- Transitions are **more important** than complex action sequences

```javascript
class TrafficLight extends FSMState {
    constructor() {
        super();
        this.fsm = new FSM(this, 'red')
            .AddState('red', new RedState())
            .AddState('green', new GreenState())
            .AddState('yellow', new YellowState())
            .Start();
    }
}

class RedState extends FSMState {
    constructor() {
        super();
        this.timer = 0;
    }
    Update(dt, owner, fsm) {
        this.timer += dt;
        if (this.timer >= 5.0) fsm.Transition('green');
    }
}
```

### Use BT-Only When:
- You have **deeply nested decisions** (compound conditions)
- You want **reactive re-evaluation** (BTReactiveSelector/Sequence)
- **Blackboard state** is sufficient (no need for mode containers)
- You want **visual tree debugging** built-in

```javascript
class AIBot extends GameObject {
    constructor(pos) {
        super(pos, 0, 1);
        this.bb = new BTBlackboard();
        
        const root = new BTReactiveSelector('BotBrain');
        
        // High priority: survive
        root.AddChild(new BTSequence('Survive')
            .AddChild(new BTCondition('LowHealth', (o, bb) => o.health < 20))
            .AddChild(new BTAction('RunAway', ...))
        );
        
        // Mid priority: gather resources
        root.AddChild(new BTSequence('Gather')
            .AddChild(new BTCondition('NeedsResources', (o, bb) => o.resources < 50))
            .AddChild(new BTAction('FindResource', ...))
        );
        
        // Low priority: explore
        root.AddChild(new BTAction('Explore', ...));
        
        this.bt = new BehaviorTree(this, root, this.bb);
    }
    
    Update(dt) {
        this.bt.Update(dt);
    }
    
    Draw(renderer) {
        // Real-time tree visualization
        this.bt.DrawTreeInspector(renderer, 10, 10, { maxDepth: 4 });
    }
}
```

---

## Summary

| Pattern | Complexity | Reusability | Debuggability |
|---|---|---|---|
| **FSM** | Low | High (copy states) | Good (state labels) |
| **BT** | High | Very High (compose nodes) | Excellent (tree inspector) |
| **Hybrid** | Medium | High (mix modes + trees) | Very Good (both tools) |

**The cleaner_bots competition shows**:
- All three approaches can solve the same problem
- **Fairness** comes from constraints (vision, battery mechanics), not AI design
- **Emergent dynamics** arise naturally when three systems compete under pressure
- Real-time debugging tools (tree inspector, state panels, goal lines) are essential for understanding behavior

Pick the pattern that **best matches your problem shape**, not the one that "feels" most powerful. Simplicity often wins.
