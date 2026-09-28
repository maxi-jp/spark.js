# FSM Demo — Guard Patrol

**Entry point:** [`fsm-basic.html`](../../../fsm-basic.html)  
**Engine module:** [`src/engine/fsm.js`](../../engine/fsm.js)  
**Full API reference:** [`docs/ai.md`](../../../docs/ai.md#fsm--hfsm-fsmjs)

---

## What this example demonstrates

Three guards patrol between waypoints. The mouse cursor is the **intruder**. Move it near a guard to trigger a chain of state changes.

Each guard is driven by a **Finite State Machine** with four states and two kinds of transitions:

| Concept | Where to look |
|---|---|
| Class-based states (extending `FSMState`) | Every `Guard*State` class |
| Declarative transition guards (`AddTransition`) | `GuardPatrolState`, `GuardAlertState`, `GuardChaseState` constructors |
| Imperative transition (`fsm.Transition()`) | `GuardAlertState.Update()`, `GuardReturnState.Update()` |
| Hysteresis to prevent state flicker | `GuardAlertState` constructor |
| Debug state labels | `GuardBot.Draw()` → `this.fsm.DrawDebug(...)` |

---

## Controls

| Input | Action |
|---|---|
| **Move the mouse** | Move the "intruder" that guards react to |

No clicks needed — just hover the cursor over or away from the guards.

---

## What is a Finite State Machine?

A **Finite State Machine (FSM)** is a design pattern that organises behaviour as a fixed set of **states**. At any moment, only **one state is active**. The machine switches between states via **transitions** when specific conditions are met.

This is much cleaner than a long chain of `if/else` statements because:
- Each state only worries about its own behaviour.
- Transition conditions are explicit and visible.
- Adding a new state doesn't break the others.

### The guard's state diagram

```
                [intruder in range]
         ┌──────────────────────────────┐
         │                              ▼
      Patrol  ◄──[intruder leaves]──  Alert  ──[1.5 s]──►  Chase
         ▲                                                     │
         │                                                     │ [intruder too far]
         │                                                     ▼
         └──────────────────────[at waypoint]────────────  Return
```

Reading this diagram:
- **Patrol** is the default state. The guard walks between two waypoints.
- When the intruder enters the detection radius, the guard enters **Alert** — it stops and flashes.
- If the intruder leaves before the timer ends, the guard goes back to **Patrol** (no memory of the alert).
- After 1.5 seconds of alertness, the guard transitions to **Chase** and pursues the intruder.
- When the intruder moves far enough away, the guard gives up and enters **Return**.
- Once back at the nearest waypoint, the guard resumes **Patrol**.

---

## Two kinds of transitions

### 1. Declarative transition guards

A **declarative guard** is a condition function registered on a state. The FSM checks it automatically every frame, **before** running the state's action. If it returns `true`, the transition fires immediately and the current state's `Update()` is skipped.

```javascript
class GuardPatrolState extends FSMState {
    constructor() {
        super();
        // Register the guard in the constructor.
        // The FSM will evaluate this every frame while Patrol is active.
        this.AddTransition('alert', owner =>
            _dist(owner.position, _mousePos()) < owner.detectionRadius
        );
    }
    // ...
}
```

This approach comes from the academic FSM model (*Millington & Funge — AI for Games*). It makes the full transition graph visible in one place, which is great for debugging and visualising.

### 2. Imperative transition

An **imperative transition** is a direct call to `fsm.Transition(name)` from inside `Update()`. Use this when the condition involves stateful logic (like a running timer) that can't be expressed as a simple one-liner.

```javascript
class GuardAlertState extends FSMState {
    Update(dt, owner, fsm) {
        this._timer += dt;
        if (this._timer >= owner.alertDuration) {
            fsm.Transition('chase'); // imperative: called explicitly when ready
        }
    }
}
```

The transition is **deferred** — it takes effect after `Update()` returns, so you can safely set up any final state before leaving.

Both styles can be combined on the same state, as the `GuardAlertState` does: a declarative guard handles "intruder leaves early" while an imperative call handles "timer expired".

---

## Hysteresis — preventing state flicker

Without care, a guard standing exactly on the edge of the detection radius would oscillate between **Patrol** and **Alert** every frame — it would switch in one frame, then immediately switch back the next.

The solution is **hysteresis**: the condition to *leave* Alert uses a slightly larger radius than the condition to *enter* it:

```javascript
// Enter Alert when distance < 90 px
this.AddTransition('alert', owner =>
    _dist(owner.position, _mousePos()) < owner.detectionRadius      // 90
);

// Leave Alert only when distance > 99 px  (90 × 1.1)
this.AddTransition('patrol', owner =>
    _dist(owner.position, _mousePos()) > owner.detectionRadius * 1.1
);
```

This 10% buffer ensures the guard has genuinely moved away before the transition fires.

---

## Code walkthrough

### The state classes

Each state is a separate class extending `FSMState`. The lifecycle has three methods:

| Method | When it runs |
|---|---|
| `Enter(owner, prev)` | Once, when the state becomes active. Good for setup (reset timers, set colour…). |
| `Update(dt, owner, fsm)` | Every frame while active. This is where the behaviour lives. |
| `Exit(owner, next)` | Once, when leaving the state. Good for cleanup. |

`owner` is the `GuardBot` that owns the FSM — states access the guard's data through it.

```javascript
class GuardChaseState extends FSMState {
    constructor() {
        super();
        // Declarative: intruder left chase range → Return
        this.AddTransition('return', owner =>
            _dist(owner.position, _mousePos()) > owner.chaseRadius
        );
    }

    Enter(owner, prev) {
        owner.drawColor = GUARD_COLORS.chase; // turn red
    }

    Update(dt, owner, fsm) {
        // Move toward the mouse each frame
        const mouse = _mousePos();
        const dx = mouse.x - owner.position.x;
        const dy = mouse.y - owner.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
            owner.position.x += (dx / dist) * owner.chaseSpeed * dt;
            owner.position.y += (dy / dist) * owner.chaseSpeed * dt;
        }
    }
}
```

### The `GuardBot` class

`GuardBot` owns the FSM. It builds it in the constructor and ticks it in `Update()`:

```javascript
class GuardBot extends GameObject {
    constructor(position, waypoints, opts = {}) {
        super(position, 0, 1);
        // ... set up stats ...

        // Build and start the FSM
        this.fsm = new FSM(this, 'patrol')   // 'patrol' is the initial state
            .AddState('patrol', new GuardPatrolState())
            .AddState('alert',  new GuardAlertState())
            .AddState('chase',  new GuardChaseState())
            .AddState('return', new GuardReturnState())
            .Start();                        // enters 'patrol' immediately
    }

    Update(dt) {
        super.Update(dt);
        this.fsm.Update(dt); // tick the FSM every frame
    }

    Draw(renderer) {
        // ...
        // Draw the active state name above the guard when debugMode = true
        this.fsm.DrawDebug(renderer, this.position.x, this.position.y - this.radius - 7);
    }
}
```

The `FSM` constructor receives `this` (the guard) as the **owner**. Every state callback will receive this guard object as `owner`, which is how states read and modify the guard's data without a direct reference to it.

### The game class

`FsmBasicGame` creates three guards with slightly different radii and speeds to give visual variety:

```javascript
Start() {
    this.AddGameObject(new GuardBot(
        new Vector2(160, 200),
        [new Vector2(160, 165), new Vector2(160, 435)],
        { patrolSpeed: 65, detection: 90, chaseRange: 165 }
    ));
    // ...two more guards...
}
```

Each guard is independent — they share no state and each has its own `FSM` instance with its own state objects.

---

## Using `FSM` in your own game

```javascript
// 1. Define states by extending FSMState
class IdleState extends FSMState {
    Enter(owner, prev)     { owner.velocity = Vector2.Zero(); }
    Update(dt, owner, fsm) { if (owner.energy > 50) fsm.Transition('run'); }
}

class RunState extends FSMState {
    constructor() {
        super();
        // Declarative guard — checked before Update() each frame
        this.AddTransition('idle', owner => owner.energy <= 0);
    }
    Update(dt, owner, fsm) {
        owner.energy -= dt * 10;
        owner.position.x += owner.speed * dt;
    }
}

// 2. Build the FSM on your game object
class Player extends GameObject {
    constructor(pos) {
        super(pos, 0, 1);
        this.energy = 100;
        this.speed  = 120;

        this.fsm = new FSM(this, 'idle')
            .AddState('idle', new IdleState())
            .AddState('run',  new RunState())
            .Start();
    }

    Update(dt) {
        super.Update(dt);
        this.fsm.Update(dt); // always tick the FSM
    }
}
```

For more complex behaviour with nested states, see the **HFSM demo** (`fsm-hfsm.html`) and the [full API reference](../../../docs/ai.md).
