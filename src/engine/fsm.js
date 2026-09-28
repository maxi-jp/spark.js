// ============================================================
// FSM — Finite State Machine
// Provides FSMState, FSM, and FSMCompositeState for building
// flat FSMs and Hierarchical FSMs (HFSMs).
// Requires: renderer.js (DrawDebug), main.js (debugMode global)
// ============================================================

// #region FSMState

/**
 * Base class for all FSM states. Extend this and override Enter(), Update(), Exit().
 *
 * Optionally register declarative transitions with AddTransition(). They are evaluated
 * each frame before Update() — if a condition fires, Update() is skipped for that frame.
 * This follows the Millington & Funge "Artificial Intelligence for Games" model.
 *
 * @example
 * class ChaseState extends FSMState {
 *   Enter(owner, prev)     { owner.speed = owner.chaseSpeed; }
 *   Update(dt, owner, fsm) { if (!owner.target) fsm.Transition('idle'); }
 *   Exit(owner, next)      { owner.speed = 0; }
 * }
 */
class FSMState {
    constructor() {
        /** @type {Array<{target: string, condition: function(*): boolean}>} */
        this._transitions = [];
    }

    /**
     * Register a declarative transition guard.
     * Guards are checked each frame before Update(); the first matching guard fires.
     * If a guard fires, Update() is skipped for the outgoing state on that frame.
     * @param {string} targetStateName  Name of the state to transition into.
     * @param {function(owner: *): boolean} condition  Returns true to fire the transition.
     * @returns {FSMState} this, for chaining.
     */
    AddTransition(targetStateName, condition) {
        this._transitions.push({ target: targetStateName, condition });
        return this;
    }

    /**
     * Called once when this state is entered.
     * @param {*} owner
     * @param {string|null} prevStateName  Name of the previous state, or null on initial entry.
     */
    Enter(owner, prevStateName) {}

    /**
     * Called every frame while this state is active.
     * May call `fsm.Transition(name)` to request an imperative transition.
     * @param {number} dt  Delta time in seconds.
     * @param {*} owner
     * @param {FSM} fsm
     */
    Update(dt, owner, fsm) {}

    /**
     * Called once when this state is exited.
     * @param {*} owner
     * @param {string|null} nextStateName  Name of the incoming state, or null on Stop().
     */
    Exit(owner, nextStateName) {}
}

// #endregion

// #region FSM

/**
 * A Finite State Machine.
 *
 * Register states with AddState(), set the initial state in the constructor, then call Start().
 * Call Update() every frame from the owner's Update(). Transitions can be:
 *   - Declarative: AddTransition() on the state object — evaluated before Update() each frame.
 *   - Imperative:  fsm.Transition() called from within a state's Update() — applied after Update() returns.
 * Declarative guards take priority; if one fires, Update() is skipped for the outgoing state.
 *
 * @example
 * this.fsm = new FSM(this, 'patrol')
 *   .AddState('patrol', new PatrolState())
 *   .AddState('chase',  new ChaseState())
 *   .Start();
 *
 * // In the owner's Update():
 * this.fsm.Update(dt);
 *
 * // In the owner's Draw():
 * this.fsm.DrawDebug(renderer, this.position.x, this.position.y - 20);
 */
class FSM {
    /**
     * @param {*} owner             Object passed as the first argument to all state callbacks.
     * @param {string} initialState Name of the state entered when Start() is called.
     */
    constructor(owner, initialState) {
        this._owner          = owner;
        this._initialState   = initialState;
        /** @type {Object.<string, FSMState>} */
        this._states         = {};
        this._currentStateName  = null;
        this._previousStateName = null;
        this._pendingTransition = null;
        this._active         = false;
    }

    /** @type {string|null} Name of the currently active state. */
    get currentStateName()  { return this._currentStateName; }

    /** @type {string|null} Name of the previously active state. */
    get previousStateName() { return this._previousStateName; }

    /** @type {FSMState|null} The active state object. */
    get currentState()      { return this._states[this._currentStateName] ?? null; }

    /**
     * Register a state under a given name. Call before Start().
     * @param {string}   name
     * @param {FSMState} state
     * @returns {FSM} this, for chaining.
     */
    AddState(name, state) {
        this._states[name] = state;
        return this;
    }

    /**
     * Activate the FSM and enter the initial state.
     * @returns {FSM} this, for chaining.
     */
    Start() {
        this._active = true;
        this._EnterState(this._initialState, null);
        return this;
    }

    /** Deactivate the FSM, exiting the current state cleanly. */
    Stop() {
        if (this._active && this._currentStateName) {
            const state = this._states[this._currentStateName];
            if (state) state.Exit(this._owner, null);
        }
        this._currentStateName  = null;
        this._pendingTransition = null;
        this._active = false;
    }

    /**
     * Request a transition to another state by name.
     * - Called from within Update(): applied after the state's Update() returns.
     * - Called from outside Update(): applied at the start of the next Update() call.
     * @param {string} name Target state name.
     */
    Transition(name) {
        if (!this._states[name]) {
            console.warn(`FSM: Unknown state "${name}"`);
            return;
        }
        this._pendingTransition = name;
    }

    /**
     * Tick the FSM. Call this from the owner's Update() every frame.
     *
     * Execution order per frame:
     *  1. Evaluate all declarative transition guards (AddTransition conditions).
     *  2. If a guard fires → apply the transition, skip Update() for the outgoing state.
     *  3. Otherwise → call the current state's Update() (which may call fsm.Transition()).
     *  4. If an imperative transition was requested during Update() → apply it.
     *
     * @param {number} dt Delta time in seconds.
     */
    Update(dt) {
        if (!this._active || !this._currentStateName) return;

        const state = this._states[this._currentStateName];

        // Step 1–2: declarative guards (Millington & Funge model)
        if (state && this._pendingTransition === null) {
            for (const t of state._transitions) {
                if (t.condition(this._owner)) {
                    this._pendingTransition = t.target;
                    break;
                }
            }
        }

        if (this._pendingTransition !== null) {
            this._ApplyTransition(this._pendingTransition);
            this._pendingTransition = null;
            return; // skip Update() of the state we just left
        }

        // Step 3: run state action
        if (state) state.Update(dt, this._owner, this);

        // Step 4: apply any imperative transition set during Update()
        if (this._pendingTransition !== null) {
            this._ApplyTransition(this._pendingTransition);
            this._pendingTransition = null;
        }
    }

    /**
     * Draw the current state name near a world-space position.
     * Only renders when the global `debugMode` variable is true.
     * @param {Renderer} renderer
     * @param {number}   x
     * @param {number}   y
     * @param {Color}    [color]
     */
    DrawDebug(renderer, x, y, color = Color.yellow) {
        if (!debugMode || !this._currentStateName) return;
        renderer.DrawFillText(this._currentStateName, x, y, '11px monospace', color, 'center');
    }

    _EnterState(name, prevName) {
        this._currentStateName = name;
        const state = this._states[name];
        if (state) state.Enter(this._owner, prevName);
    }

    _ApplyTransition(name) {
        const prevName  = this._currentStateName;
        const prevState = this._states[prevName];
        if (prevState) prevState.Exit(this._owner, name);
        this._previousStateName = prevName;
        this._EnterState(name, prevName);
    }
}

// #endregion

// #region FSMCompositeState

/**
 * A state that contains a nested FSM, enabling Hierarchical FSMs (HFSM).
 *
 * Extend this class and assign a configured FSM to `this.subFSM` in the constructor.
 * The nested FSM is automatically started on Enter(), ticked on Update(), and stopped on Exit().
 * Declarative guards registered on the parent state's FSM override the sub-FSM each frame —
 * if a parent guard fires, the sub-FSM is not updated for that frame.
 *
 * @example
 * class CombatState extends FSMCompositeState {
 *   constructor(owner) {
 *     super();
 *     this.subFSM = new FSM(owner, 'approach')
 *       .AddState('approach', new ApproachState())
 *       .AddState('attack',   new AttackState())
 *       .AddState('cooldown', new CooldownState());
 *   }
 *   Enter(owner, prev) { super.Enter(owner, prev); } // starts subFSM
 * }
 *
 * // In the parent FSM's owner constructor:
 * const combat = new CombatState(this);
 * combat.AddTransition('patrol', owner => !owner.target); // parent-level escape
 * this.fsm = new FSM(this, 'patrol').AddState('patrol', ...).AddState('combat', combat).Start();
 */
class FSMCompositeState extends FSMState {
    constructor() {
        super();
        /** @type {FSM|null} The nested FSM. Assign in the subclass constructor. */
        this.subFSM = null;
    }

    /** Starts the nested FSM. Call super.Enter() when overriding. */
    Enter(owner, prevStateName) {
        if (this.subFSM) this.subFSM.Start();
    }

    /** Ticks the nested FSM. Call super.Update() when overriding to keep sub-states running. */
    Update(dt, owner, fsm) {
        if (this.subFSM) this.subFSM.Update(dt);
    }

    /** Stops the nested FSM, cleanly exiting the active sub-state. Call super.Exit() when overriding. */
    Exit(owner, nextStateName) {
        if (this.subFSM) this.subFSM.Stop();
    }
}

// #endregion
