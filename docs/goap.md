# Goal-Oriented Action Planning (GOAP)

`spark.js` includes a complete, zero-dependency **Goal-Oriented Action Planning (GOAP)** engine in [`src/engine/goap.js`](../src/engine/goap.js). Inspired by **STRIPS** (Stanford Research Institute Problem Solver, 1971), **Jeff Orkin's** landmark GDC 2006 paper *"Three States and a Plan: The A.I. of F.E.A.R."*, and **Ian Millington & John Funge's** *Artificial Intelligence for Games*, this module enables agents to dynamically synthesize multi-step action plans in real time using **State-Space A\* Search**.

```html
<script src="src/engine/goap.js"></script>
```

---

## 1. Why GOAP? Motivation & Paradigm Comparison

In reactive architectures such as **Finite State Machines (`FSM`)** and **Behavior Trees (`BehaviorTree`)**, the game designer explicitly authors *how* states or subtrees transition into one another. As the number of tools, items, and environmental interactions grows, hardcoded transitions suffer from **combinatorial explosion**:

- Adding a single new mechanic (e.g., a *Grappling Hook* or *Frag Grenade*) to an FSM with 12 states can require wiring dozens of new transition arcs.
- In a Behavior Tree, deep causal dependencies (`PickupKey -> UnlockArmory -> GrabBomb -> BlowUpBoulder -> OpenChest`) require deeply nested, rigid `Selector`/`Sequence` subtrees.

**GOAP inverts this responsibility:**
1. **Goals** declare *what* world state the agent wants to achieve (e.g. `{ isHungry: false }` or `{ targetDead: true }`), never *how* to achieve it.
2. **Actions** are self-contained building blocks declared with symbolic **preconditions** (what must be true before the action can run), **effects** (what becomes true after the action succeeds), and a **cost** (how expensive the action is).
3. **The Planner (`GOAPPlanner`)** searches the space of possible action sequences using **A\*** to automatically discover the **lowest-cost valid chain of actions** that transforms the current world state into the desired goal state.

### Game AI Decision-Making Paradigms in `spark.js`

| Paradigm | Module | Core Representation | Decision Mechanism | Best Use Cases |
|----------|--------|---------------------|--------------------|----------------|
| **Finite State Machine** | [`src/engine/fsm.js`](../src/engine/fsm.js) | Discrete states & explicit transitions | Reactive transition polling | Simple arcade enemies, animation controllers, doors/switches (3–6 states) |
| **Behavior Tree** | [`src/engine/bt.js`](../src/engine/bt.js) | Hierarchical tree of Composites, Decorators & Leaves | Priority/Sequence tick traversal from root | Structured boss phases, squad behaviors with predictable fallback hierarchies |
| **Fuzzy Logic** | [`src/engine/fuzzy.js`](../src/engine/fuzzy.js) | Continuous linguistic variables (`[0, 1]` DOM) & Mamdani rules | Parallel rule evaluation & Centroid/MaxAv defuzzification | Smooth steering, utility scoring, adaptive difficulty, nuanced threat/desirability |
| **GOAP** | [`src/engine/goap.js`](../src/engine/goap.js) | Symbolic world facts, goals, and atomic actions (Pre/Effect/Cost) | State-Space A\* graph search ($f = g + h$) | Open-ended survival/crafting, tactical combat squads (*F.E.A.R.*), multi-step puzzle solving |

> **Combining Paradigms (Hybrid AI):** In commercial games, these tools frequently work together! For example, you can use **Fuzzy Logic (`FuzzyModule`)** inside a `GOAPGoal`'s priority callback to compute a smooth urgency score (`0..100`), use **`GOAPPlanner`** to synthesize the optimal sequence of actions, and execute each action on a character whose locomotion is driven by a small **FSM** (`MoveTo`, `Animate`, `UseSmartObject`).

---

## 2. How GOAP State-Space A\* Planning Works

### Symbolic World State (`GOAPState`)
Instead of searching raw pixel coordinates or floating-point matrices, GOAP abstracts the game world into a compact dictionary of symbolic facts (`key -> boolean | number | string`), updated each frame by the agent's **sensors**:

```javascript
{
    isHungry: true,
    hasAxe: false,
    hasFirewood: false,
    campfireLit: false,
    hasRawMeat: false
}
```

### Forward State-Space A\* Search
When `GOAPPlanner.Plan(owner, startState, goal, availableActions)` is invoked:

1. **Procedural Filtering:** Each candidate `GOAPAction` is first tested via `action.CheckProceduralPrecondition(owner, startState)`. Actions whose runtime world requirement fails (e.g., no berry bushes left in the level, or ammo crate is empty) are pruned before search begins.
2. **Search Node Representation:** Each node $n$ in the A\* open list represents a **simulated world state** reached by applying a sequence of actions from `startState`:
   - $g(n)$: Cumulative cost of all actions taken from the start state to reach node $n$:
     $$g(n) = \sum_{i=1}^{k} \text{Cost}(a_i)$$
   - $h(n)$: Heuristic estimate of remaining work—the number of goal conditions in `goal.desiredState` that are still unsatisfied in node $n$'s simulated state (`state.CountDifferences(goal.desiredState)`).
   - $f(n) = g(n) + w \cdot h(n)$: Total estimated path cost (where $w = 1.0$ by default).
3. **Transition Expansion:** From the lowest-$f(n)$ state on the open list, the planner tests every usable action $a$:
   - Are $a$'s symbolic `preconditions` satisfied in `current.state`? (`action.ArePreconditionsMet(current.state)`)
   - Does applying $a$'s `effects` meaningfully change at least one fact in `current.state`? (`action.HasEffectOnState(current.state)`)
   - If both hold, a new child state `nextState = current.state.Clone().Apply(a.effects)` is generated with $g' = g(n) + a.\text{GetCost}(\text{owner}, \text{current.state})$.
4. **Closed-Set Pruning:** Each `GOAPState` produces a canonical string key via `GetSignature()`. If a simulated state signature has already been reached via an equal or cheaper $g$-cost, the duplicate branch is discarded.
5. **Plan Reconstruction:** As soon as the popped node satisfies `current.state.Matches(goal.desiredState)`, the planner walks parent pointers back to the root and returns the ordered array of `GOAPAction` instances `[a_1, a_2, ..., a_k]`.

---

## 3. Worked Classroom Trace: Competing Action Chains

Suppose a wilderness survivor starts with:
- **Initial State:** `{ isHungry: true, hasAxe: false, hasFirewood: false, campfireLit: false, hasRawMeat: false }`
- **Active Goal:** `StayFed` $\rightarrow$ `{ isHungry: false }`

And has the following actions registered:

| Action | Cost | Preconditions | Effects |
|--------|------|---------------|---------|
| `GrabSpareAxe` | `1` | `{ hasAxe: false }` | `{ hasAxe: true }` |
| `ChopTreesWithAxe` | `2` | `{ hasAxe: true, hasFirewood: false }` | `{ hasFirewood: true }` |
| `SnapBranchesByHand` | `8` | `{ hasFirewood: false }` | `{ hasFirewood: true }` |
| `LightCampfire` | `1` | `{ hasFirewood: true, campfireLit: false }` | `{ campfireLit: true, hasFirewood: false }` |
| `HuntRawMeat` | `2` | `{ hasRawMeat: false }` | `{ hasRawMeat: true }` |
| `CookAndEatSteak` | `1` | `{ hasRawMeat: true, campfireLit: true }` | `{ isHungry: false, hasRawMeat: false }` |
| `ForageWildBerries` | `9.5` | `{ isHungry: true }` | `{ isHungry: false }` |

### How A\* Evaluates the Candidate Plans:
- **Branch A (Spare Axe + Cook Steak):**
  `GrabSpareAxe (1) -> ChopTreesWithAxe (2) -> LightCampfire (1) -> HuntRawMeat (2) -> CookAndEatSteak (1)`
  **Total Cost $g = 7.0$** $\leftarrow$ **Selected as Optimal Plan!**
- **Branch B (Forage Wild Berries directly):**
  `ForageWildBerries (9.5)`
  **Total Cost $g = 9.5$** (1 step, but higher cost than 7.0).
- **Branch C (Snap Branches by Hand + Cook Steak):**
  `SnapBranchesByHand (8) -> LightCampfire (1) -> HuntRawMeat (2) -> CookAndEatSteak (1)`
  **Total Cost $g = 12.0$**.

Now suppose the player **removes the Spare Axe from the Tool Rack** (`GrabSpareAxe` fails its procedural precondition):
- Branch A is no longer valid.
- On the very next replan, A\* compares Branch B (`ForageWildBerries`, cost `9.5`) against Branch C (`SnapBranchesByHand -> ...`, cost `12.0`) and **automatically switches to `ForageWildBerries`** without a single `if/else` transition written by the programmer!

---

## 4. Core Classes & API Reference

### `GOAPStatus`
Execution status constants returned by `GOAPAction.Update(dt, owner, worldState)`:

```javascript
GOAPStatus.SUCCESS // 'SUCCESS' — Action finished; agent applies effects and advances to next step
GOAPStatus.FAILURE // 'FAILURE' — Action failed; agent aborts current plan and triggers Replan()
GOAPStatus.RUNNING // 'RUNNING' — Action still in progress; continues next frame
GOAPStatus.IDLE    // 'IDLE'    — Action has not started yet
```

---

### `GOAPState`
Stores symbolic key-value facts representing either the live world state, a goal's desired state, or an intermediate simulated state during A\* search.

```javascript
const state = new GOAPState({ hasAmmo: true, targetInCover: true });

state.Set('inCover', true);
state.Get('hasAmmo');                    // true
state.Has('targetInCover');              // true
state.Matches({ hasAmmo: true });        // true
state.CountDifferences({ hasAmmo: true, inCover: false }); // 1
const copy = state.Clone();
```

| Method | Description |
|--------|-------------|
| `Set(key, value)` | Sets a fact and returns `this` (chainable). |
| `Get(key, defaultValue)` | Returns the value of `key` (or `defaultValue` if unset). |
| `Has(key)` | Returns `true` if `key` exists in `values`. |
| `Delete(key)` / `Clear()` | Removes a single fact or clears all facts. |
| `Assign(source)` | Copies all facts from another `GOAPState` or plain object. |
| `Clone()` | Returns a deep copy of the `GOAPState`. |
| `Matches(conditions)` | Returns `true` if all key-value conditions (or predicate functions) hold. Undefined boolean facts are treated as `false` when matched against `false`. |
| `Apply(effects)` | Applies an object or `GOAPState` of effects in-place. Supports functional effects `(oldVal, state) => newVal`. |
| `CountDifferences(desired)` | Counts how many keys in `desired` are currently unsatisfied (used as the A\* heuristic $h(n)$). |
| `GetSignature()` | Returns a canonical sorted string (`"hasAxe:true|isHungry:false"`) for A\* closed-set hashing. |

---

### `GOAPGoal`
Defines a desired target state and a static or dynamic priority.

```javascript
// Static priority
const patrolGoal = new GOAPGoal('Patrol', { patrolled: true }, 20);

// Dynamic priority callback: (owner, worldState) => number
const surviveGoal = new GOAPGoal(
    'Survive',
    { lowHealth: false, inCover: true },
    (owner, ws) => ws.Get('lowHealth') ? 100 : 0
);
```

| Constructor / Method | Description |
|----------------------|-------------|
| `new GOAPGoal(name, desiredState, priority, options)` | `priority` can be a number or `(owner, worldState) => number`. `options.isValid` is an optional `(owner, worldState) => boolean` filter. |
| `GetPriority(owner, worldState)` | Evaluates and caches `lastEvaluatedPriority`. Priorities $\le 0$ disable the goal. |
| `IsValid(owner, worldState)` | Returns `true` if `options.isValid` passes and `GetPriority() > 0`. |
| `IsSatisfied(worldState)` | Returns `true` if `worldState` already matches `this.desiredState`. |

---

### `GOAPAction`
Represents a single atomic behavior with symbolic preconditions, symbolic effects, a static or dynamic cost, an optional procedural precondition, and an execution lifecycle (`Enter`, `Update`, `Exit`).

You can create actions in **two ways**:

#### Style A: Inline Configuration Object (Concise & Declarative)
```javascript
const reloadAction = new GOAPAction('ReloadWeapon', {
    cost: 2,
    preconditions: { hasAmmo: true, weaponLoaded: false },
    effects: { weaponLoaded: true },
    checkProcedural: (soldier, ws) => soldier.reserveAmmo > 0,
    onEnter: (soldier) => {
        soldier.reloadTimer = 0;
    },
    onUpdate: (dt, soldier) => {
        soldier.reloadTimer += dt;
        if (soldier.reloadTimer >= 0.8) {
            soldier.clip = soldier.maxClip;
            soldier.reserveAmmo -= soldier.maxClip;
            return GOAPStatus.SUCCESS;
        }
        return GOAPStatus.RUNNING;
    }
});
```

#### Style B: Fluent Builder or OOP Subclassing
```javascript
class ChopTreeAction extends GOAPAction {
    constructor() {
        super('ChopTree');
        this.Pre('hasAxe', true)
            .Pre('hasWood', false)
            .Effect('hasWood', true)
            .SetCost(2);
    }

    CheckProceduralPrecondition(owner, worldState) {
        return owner.game.treesRemaining > 0;
    }

    Enter(owner, worldState) {
        owner.workTimer = 0;
    }

    Update(dt, owner, worldState) {
        owner.workTimer += dt;
        return owner.workTimer >= 1.0 ? GOAPStatus.SUCCESS : GOAPStatus.RUNNING;
    }
}
```

---

### `GOAPPlanner`
The A\* state-space search engine. Automatically instantiated inside every `GOAPAgent` (`agent.planner`), or usable standalone for unit tests and puzzle solvers.

```javascript
const planner = new GOAPPlanner({
    maxIterations: 500,
    maxPlanDepth: 12,
    heuristicWeight: 1.0
});

const plan = planner.Plan(owner, startState, goal, actions);
console.log('Plan steps:', plan.map(a => a.name));
console.log('Total cost:', planner.lastPlanCost);
console.log('A* nodes expanded:', planner.lastNodesExpanded);
```

---

### `GOAPAgent`
High-level controller attached to a `GameObject`. Manages the agent's `worldState`, `goals`, `actions`, sensor synchronization, goal preemption, step-by-step action execution, and visual debugging.

```javascript
this.goap = new GOAPAgent(this, {
    initialState: { isHungry: true, hasFood: false },
    onUpdateSensors: (owner, ws) => {
        ws.Set('isHungry', owner.hunger >= 60);
        ws.Set('hasFood', owner.inventory.food > 0);
    },
    autoPreempt: true,
    replanCooldown: 0.15
});

this.goap.AddGoals([ ... ]);
this.goap.AddActions([ ... ]);
```

In your `GameObject.Update(dt)` and `Draw(renderer)`:
```javascript
Update(dt) {
    super.Update(dt);
    this.goap.Update(dt);
}

Draw(renderer) {
    super.Draw(renderer);
    // Floating overhead tag: [StayFed] ▶ CookSteak (2/3)
    this.goap.DrawDebug(renderer, this.position.x, this.position.y - 30);
}
```

---

## 5. Built-In Visual Debugging & Telemetry

`src/engine/goap.js` includes two built-in Canvas rendering tools designed for lectures, labs, and AI tuning:

1. **`agent.DrawDebug(renderer, x, y, color, forceDraw)`**:
   Draws a compact overhead badge above the character displaying `[ActiveGoal] ▶ CurrentAction (step/total)`. Respects global `debugMode` (or renders unconditionally if `forceDraw = true`).
2. **`agent.DrawGOAPInspector(renderer, x, y, options)`** (or global `DrawGOAPInspector(renderer, agent, x, y, options)`):
   Renders a full diagnostic telemetry HUD showing:
   - **A\* Planner Telemetry:** Nodes expanded (`lastNodesExpanded`), total plan cost (`lastPlanCost`), and replan counter (`replanCount`).
   - **Symbolic World State Grid:** Color-coded live key-value pills (`true` in green, `false` in slate, numbers/strings in cyan).
   - **Ranked Goals Panel:** Real-time priority bars (`0..100`) with `ACTIVE` and `✔ SATISFIED` badges.
   - **Active A\* Action Plan Pipeline:** Numbered step-by-step action queue with status icons (`✔` completed, `⏳` running, `○` queued, `✖` failed), primary effect tags, and individual step costs.

---

## 6. Interactive University Demos

Explore the three interactive GOAP laboratories included in the repository:

1. **[Demo 1 — Autonomous Survival Crafter & Economy (`goap-survival.html`)](../src/examples/goap_survival/README.md)**
   - **Source:** [`src/examples/goap_survival/goap_survival.js`](../src/examples/goap_survival/goap_survival.js)
   - **Concepts:** Multi-hop tool crafting (`MineIronOre -> ForgeIronAxe -> ChopTreesWithAxe` vs. `GrabSpareAxe` vs. `ForageWildBerries`), dynamic goal preemption during rainstorms (`StayWarm` preempting `BuildCabin`), and live cost comparisons.
2. **[Demo 2 — F.E.A.R.-Style Tactical Combat Squad (`goap-combat.html`)](../src/examples/goap_combat/README.md)**
   - **Source:** [`src/examples/goap_combat/goap_combat.js`](../src/examples/goap_combat/goap_combat.js)
   - **Concepts:** Cover tactics, cost-based tactical branching (`FlushWithGrenade [cost 2]` vs. `FlankTarget [cost 5]`), multi-step ammo logistics (`PickupAmmo -> ReloadWeapon -> ShootTarget`), and procedural fallback (`MeleeCharge [cost 9]` when all ammo crates are depleted).
3. **[Demo 3 — Multi-Room Dungeon Heist & Deep A\* Chaining (`goap-dungeon.html`)](../src/examples/goap_dungeon/README.md)**
   - **Source:** [`src/examples/goap_dungeon/goap_dungeon.js`](../src/examples/goap_dungeon/goap_dungeon.js)
   - **Concepts:** Deep 8-step causal dependency resolution (`PickupRustyKey -> UnlockArmory -> PickupBomb -> BlowUpBoulder -> GrabVaultKey -> DisableLaserTrap -> StealGoldenIdol -> EscapeDungeon`), lockpick fallbacks, and real-time shortcut discovery (`WarpToCryptKey`).

