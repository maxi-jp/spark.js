# HFSM Demo — Sentry AI

**Entry point:** [`fsm-hfsm.html`](../../../fsm-hfsm.html)  
**Engine module:** [`src/engine/fsm.js`](../../engine/fsm.js)  
**Full API reference:** [`docs/ai.md`](../../../docs/ai.md#fsm--hfsm-fsmjs)  
**Prerequisite:** Read the [Guard Patrol README](../fsm_basic/README.md) first — this demo builds on those concepts.

---

## What this example demonstrates

Two sentry NPCs guard an area. You place a **threat** by clicking. The NPCs detect it, engage, and may flee if they take enough damage. All of this is driven by a **Hierarchical FSM** — a state machine where one of the states contains its own nested state machine.

| Concept | Where to look |
|---|---|
| `FSMCompositeState` (composite / parent state) | `SentryCombatState` |
| Nested sub-FSM inside a composite state | `SentryCombatState` constructor |
| Parent-level declarative guards overriding the sub-FSM | `SentryNPC` constructor — `combatState.AddTransition(...)` |
| Sub-level declarative guards | `SentryApproachState`, `SentryAttackState` constructors |
| Sub-level imperative transitions | `SentryAttackState.Update()`, `SentryCooldownState.Update()` |
| Two-level debug labels | `SentryNPC.Draw()` |

---

## Controls

| Input | Action |
|---|---|
| **Left-click** | Move the threat (⊕) to that position |
| **Right-click near NPC** | Deal 25 damage — triggers Flee when HP drops below 30% |

The labels above each NPC show the active state (yellow = top-level, cyan = sub-state inside Combat).

---

## Why a flat FSM isn't enough

Imagine extending the Guard Patrol example with a combat system. The guard now needs to:

1. Patrol between waypoints.
2. When a threat is detected, approach it.
3. Attack when close enough.
4. Rest briefly between bursts of attacks.
5. Flee if health is low.
6. Return to patrol when the threat is gone.

With a flat FSM this becomes 6+ states with a very dense transition graph. **Patrol, Flee, and Combat are independent concerns** — but in a flat FSM every combat sub-behaviour (approach, attack, cooldown) also needs to know how to handle "threat gone" and "health low" transitions.

A **Hierarchical FSM (HFSM)** groups the related combat sub-states under a single **composite state**. The composite state has its own nested FSM. The parent machine only sees `combat` as one state; if the threat disappears, the parent handles that transition and cleanly exits whichever sub-state was active.

---

## The state diagrams

### Top-level FSM (one per NPC)

```
                 [threat detected]
     ┌──────────────────────────────────┐
     │                                  ▼
  Patrol  ◄──[threat lost / dead]──  Combat  ──[HP < 30%]──►  Flee
     ▲                                                          │
     └──────────────────────[healed + safe]───────────────-─────┘
```

### Combat sub-FSM (active only while Combat is the top-level state)

```
  Approach  ──[in attack range]──►  Attack  ──[3 attacks done]──►  Cooldown
     ▲                                 │                                │
     │       [target moved away]       │                                │
     └─────────────────────────────────┘         [2 s elapsed]          │
     └──────────────────────────────────────────────────────────────────┘
```

When the **top-level** machine leaves `Combat` (because the threat is gone or HP is low), both diagrams stop — the sub-FSM is cleanly stopped regardless of which sub-state was active.

---

## How `FSMCompositeState` works

`FSMCompositeState` is a regular `FSMState` that also owns a child `FSM`. It starts the child FSM when entered, ticks it every frame, and stops it when exited:

```javascript
class SentryCombatState extends FSMCompositeState {
    constructor(owner) {
        super();
        // Build the sub-FSM — owner is the NPC
        this.subFSM = new FSM(owner, 'approach')
            .AddState('approach', new SentryApproachState())
            .AddState('attack',   new SentryAttackState())
            .AddState('cooldown', new SentryCooldownState());
    }

    Enter(owner, prev) {
        super.Enter(owner, prev); // ← this calls this.subFSM.Start()
    }

    Update(dt, owner, fsm) {
        super.Update(dt, owner, fsm); // ← this calls this.subFSM.Update(dt)
    }

    Exit(owner, next) {
        super.Exit(owner, next); // ← this calls this.subFSM.Stop()
    }
}
```

The `super` calls do all the work. You only need to override a method if you want extra logic on top of the default lifecycle.

---

## Parent guards take priority

The **parent FSM's transition guards are checked before the sub-FSM updates**. This is the key property of a hierarchical machine: the macro-level always overrides the micro-level.

```javascript
// These guards are added to the combat state in SentryNPC's constructor.
// They belong to the PARENT FSM (top-level), not the sub-FSM.
const combatState = new SentryCombatState(this);

combatState.AddTransition('flee', owner =>
    owner.health < owner.maxHealth * owner.fleeThreshold // HP < 30%
);

combatState.AddTransition('patrol', owner => {
    if (!owner.threat || owner.threat.isDead) return true;
    // 1.5× hysteresis: don't re-enter Combat immediately after leaving it
    return _dist2(owner.position, owner.threat.position) > owner.detectionRadius * 1.5;
});
```

Each frame, the parent FSM evaluates these guards first. If `health < 30%`, the machine transitions `combat → flee` — and `SentryCombatState.Exit()` is called, which stops the sub-FSM. The NPC might have been in the middle of an `attack` sub-state, but it doesn't matter: the parent's guard fires first and the sub-state is cleanly exited.

---

## Code walkthrough

### Sub-states

The three sub-states only know about their own micro-behaviour. They transition between each other using the same declarative and imperative patterns as the basic FSM demo:

**`SentryApproachState`** — moves toward the threat. Declarative guard fires when in range:
```javascript
class SentryApproachState extends FSMState {
    constructor() {
        super();
        this.AddTransition('attack', owner =>
            owner.threat && !owner.threat.isDead &&
            _dist2(owner.position, owner.threat.position) < owner.attackRange
        );
    }

    Update(dt, owner, fsm) {
        // Move toward owner.threat
        const threat = owner.threat;
        if (!threat || threat.isDead) return;
        const dx   = threat.position.x - owner.position.x;
        const dy   = threat.position.y - owner.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        owner.position.x += (dx / dist) * owner.speed * dt;
        owner.position.y += (dy / dist) * owner.speed * dt;
    }
}
```

**`SentryAttackState`** — fires every 1.5 s, deals damage. Imperative transition after 3 attacks:
```javascript
Update(dt, owner, fsm) {
    this._timer += dt;
    if (this._timer >= this._interval) {
        this._timer -= this._interval;
        this._attacksDone++;
        if (owner.threat && !owner.threat.isDead) {
            owner.threat.TakeDamage(owner.attackDamage);
        }
        if (this._attacksDone >= this._maxAttacks) {
            fsm.Transition('cooldown'); // imperative
        }
    }
}
```

**`SentryCooldownState`** — just waits. Imperative transition when the timer expires:
```javascript
Update(dt, owner, fsm) {
    this._timer += dt;
    if (this._timer >= this._duration) {
        fsm.Transition('approach'); // imperative
    }
}
```

### `SentryNPC`

The NPC builds the full HFSM in its constructor:

```javascript
class SentryNPC extends GameObject {
    constructor(position, waypoints, safeZone, opts = {}) {
        super(position, 0, 1);
        // ... stats ...

        // 1. Build the composite combat state (it owns the sub-FSM)
        const combatState = new SentryCombatState(this);

        // 2. Add parent-level guards to the combat state
        combatState.AddTransition('flee', owner =>
            owner.health < owner.maxHealth * owner.fleeThreshold
        );
        combatState.AddTransition('patrol', owner => {
            if (!owner.threat || owner.threat.isDead) return true;
            return _dist2(owner.position, owner.threat.position) > owner.detectionRadius * 1.5;
        });

        // 3. Build the top-level FSM and start it
        this.fsm = new FSM(this, 'patrol')
            .AddState('patrol', new SentryPatrolState())
            .AddState('combat', combatState)        // ← composite state goes in like any other
            .AddState('flee',   new SentryFleeState())
            .Start();
    }

    Update(dt) {
        super.Update(dt);
        this.fsm.Update(dt); // ticks top-level FSM, which ticks sub-FSM when in Combat
    }
}
```

### Drawing two-level state labels

When in `Combat`, the NPC draws the top-level state name (yellow) and the active sub-state name (cyan) separately:

```javascript
Draw(renderer) {
    // Top-level state label
    this.fsm.DrawDebug(renderer, x, y - this.radius - 7, Color.yellow);

    // Sub-state label (only when Combat is active)
    if (this.fsm.currentStateName === 'combat') {
        const combatState = this.fsm.currentState; // the FSMCompositeState object
        if (combatState && combatState.subFSM) {
            combatState.subFSM.DrawDebug(renderer, x, y - this.radius - 20, Color.cyan);
        }
    }
}
```

`fsm.currentState` returns the active `FSMState` object. Since the active state is a `SentryCombatState`, you can access its `subFSM` property and call `DrawDebug` on the nested machine.

---

## Using `FSMCompositeState` in your own game

```javascript
// Define sub-states as normal FSMState subclasses
class ApproachState extends FSMState { /* ... */ }
class AttackState   extends FSMState { /* ... */ }

// Wrap them in a composite state
class CombatState extends FSMCompositeState {
    constructor(owner) {
        super();
        this.subFSM = new FSM(owner, 'approach')
            .AddState('approach', new ApproachState())
            .AddState('attack',   new AttackState());
    }
    Enter(owner, prev) { super.Enter(owner, prev); }
    Update(dt, owner, fsm) { super.Update(dt, owner, fsm); }
    Exit(owner, next)  { super.Exit(owner, next); }
}

// Build the top-level HFSM
const combat = new CombatState(this);
combat.AddTransition('idle', owner => !owner.target); // parent guard

this.fsm = new FSM(this, 'idle')
    .AddState('idle',   new IdleState())
    .AddState('combat', combat)
    .Start();
```

The same pattern scales to any depth — a sub-state can itself be an `FSMCompositeState` with its own sub-FSM, though in practice two levels is usually sufficient for game AI.
