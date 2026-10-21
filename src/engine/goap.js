// ============================================================================
// spark.js — Goal-Oriented Action Planning (GOAP) System (src/engine/goap.js)
// ============================================================================
// A pedagogical, zero-dependency STRIPS / F.E.A.R.-style GOAP architecture
// designed to be comprenhensive and easy to use.
//
// References:
//   - Jeff Orkin (2006), "Three States and a Plan: The A.I. of F.E.A.R.", GDC.
//   - Ian Millington & John Funge, "Artificial Intelligence for Games", Ch. 5.
// ============================================================================

/**
 * Execution status codes returned by GOAPAction.Update().
 * Mirrors BTStatus for seamless interoperability across spark.js AI modules.
 * @enum {string}
 */
const GOAPStatus = Object.freeze({
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    RUNNING: 'RUNNING',
    IDLE:    'IDLE'
});

// ============================================================================
// 1. GOAPState — Symbolic World State Representation
// ============================================================================

/**
 * Represents a symbolic world state as a dictionary of key-value facts
 * (e.g. `{ hasAxe: true, hasWood: false, isHungry: true }`).
 * Used by GOAPAgent (current world state), GOAPGoal (desired state),
 * and GOAPPlanner (simulated states during A* search).
 */
class GOAPState {
    /**
     * @param {Object|GOAPState} [initialValues={}]
     */
    constructor(initialValues = {}) {
        this.values = {};
        this.Assign(initialValues);
    }

    /**
     * Set a symbolic world state fact.
     * @param {string} key
     * @param {*} value
     * @returns {GOAPState} this (chainable)
     */
    Set(key, value) {
        this.values[key] = value;
        return this;
    }

    /**
     * Get the value of a symbolic fact.
     * @param {string} key
     * @param {*} [defaultValue=undefined]
     * @returns {*}
     */
    Get(key, defaultValue = undefined) {
        return Object.prototype.hasOwnProperty.call(this.values, key)
            ? this.values[key]
            : defaultValue;
    }

    /**
     * Check whether a key is defined in this state.
     * @param {string} key
     * @returns {boolean}
     */
    Has(key) {
        return Object.prototype.hasOwnProperty.call(this.values, key);
    }

    /**
     * Remove a key from this state.
     * @param {string} key
     */
    Delete(key) {
        delete this.values[key];
    }

    /**
     * Clear all facts from this state.
     */
    Clear() {
        this.values = {};
    }

    /**
     * Copy all facts from another GOAPState or plain object into this state.
     * @param {Object|GOAPState} source
     * @returns {GOAPState} this (chainable)
     */
    Assign(source) {
        if (!source) return this;
        const raw = source instanceof GOAPState ? source.values : source;
        for (const key of Object.keys(raw)) {
            this.values[key] = raw[key];
        }
        return this;
    }

    /**
     * Return a shallow copy of the internal key-value dictionary.
     * @returns {Object}
     */
    ToObject() {
        return Object.assign({}, this.values);
    }

    /**
     * Create an independent clone of this GOAPState.
     * @returns {GOAPState}
     */
    Clone() {
        return new GOAPState(this.values);
    }

    /**
     * Check if a single condition value matches a state value.
     * Supports exact primitive equality (`true`, `false`, numbers, strings)
     * as well as predicate functions `(actualVal) => boolean`.
     * @param {*} actualValue
     * @param {*} expectedCondition
     * @returns {boolean}
     */
    static ValueMatches(actualValue, expectedCondition) {
        if (typeof expectedCondition === 'function') {
            return Boolean(expectedCondition(actualValue));
        }
        // Treat undefined boolean facts as false when comparing against false
        if (expectedCondition === false && actualValue === undefined) {
            return true;
        }
        return actualValue === expectedCondition;
    }

    /**
     * Check whether this state satisfies all conditions in `conditions`.
     * @param {Object|GOAPState} conditions
     * @returns {boolean}
     */
    Matches(conditions) {
        if (!conditions) return true;
        const condObj = conditions instanceof GOAPState ? conditions.values : conditions;
        for (const key of Object.keys(condObj)) {
            if (!GOAPState.ValueMatches(this.values[key], condObj[key])) {
                return false;
            }
        }
        return true;
    }

    /**
     * Apply action effects to this state in-place.
     * If an effect value is a function `(currentValue, state) => newValue`, it is evaluated.
     * @param {Object|GOAPState} effects
     * @returns {GOAPState} this (chainable)
     */
    Apply(effects) {
        if (!effects) return this;
        const effObj = effects instanceof GOAPState ? effects.values : effects;
        for (const key of Object.keys(effObj)) {
            const effVal = effObj[key];
            if (typeof effVal === 'function') {
                this.values[key] = effVal(this.values[key], this);
            } else {
                this.values[key] = effVal;
            }
        }
        return this;
    }

    /**
     * Count how many conditions in `desired` are NOT satisfied by this state.
     * Used as the admissible A* heuristic h(s) in GOAPPlanner.
     * @param {Object|GOAPState} desired
     * @returns {number}
     */
    CountDifferences(desired) {
        if (!desired) return 0;
        const desObj = desired instanceof GOAPState ? desired.values : desired;
        let unsatisfied = 0;
        for (const key of Object.keys(desObj)) {
            if (!GOAPState.ValueMatches(this.values[key], desObj[key])) {
                unsatisfied++;
            }
        }
        return unsatisfied;
    }

    /**
     * Compute a canonical string signature of this state for A* closed-set hashing.
     * @returns {string}
     */
    GetSignature() {
        const keys = Object.keys(this.values).sort();
        const parts = [];
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const v = this.values[k];
            // Normalize undefined/false so equivalent boolean states hash identically
            if (v === undefined) continue;
            parts.push(`${k}:${String(v)}`);
        }
        return parts.join('|');
    }
}

// ============================================================================
// 2. GOAPGoal — Desired World State & Priority
// ============================================================================

/**
 * Represents a goal that a GOAPAgent strives to fulfill.
 * A goal defines a desired symbolic world state (e.g. `{ isHungry: false }`)
 * and a static or dynamic priority.
 */
class GOAPGoal {
    /**
     * @param {string} name - Human-readable goal identifier (e.g. 'StayFed').
     * @param {Object|GOAPState} desiredState - Symbolic conditions required to satisfy this goal.
     * @param {number|Function} [priority=1] - Static priority number or `(owner, worldState) => number`.
     * @param {Object} [options={}]
     * @param {Function} [options.isValid] - Optional `(owner, worldState) => boolean` relevance check.
     */
    constructor(name, desiredState = {}, priority = 1, options = {}) {
        this.name = name;
        this.desiredState = desiredState instanceof GOAPState
            ? desiredState.ToObject()
            : Object.assign({}, desiredState);
        this._priority = priority;
        this._isValidFn = options.isValid || null;
        this.lastEvaluatedPriority = typeof priority === 'number' ? priority : 0;
    }

    /**
     * Evaluate the current priority of this goal.
     * Return <= 0 to temporarily disable the goal.
     * @param {*} owner
     * @param {GOAPState} worldState
     * @returns {number}
     */
    GetPriority(owner, worldState) {
        if (typeof this._priority === 'function') {
            this.lastEvaluatedPriority = Number(this._priority(owner, worldState)) || 0;
        } else {
            this.lastEvaluatedPriority = Number(this._priority) || 0;
        }
        return this.lastEvaluatedPriority;
    }

    /**
     * Check whether this goal can currently be pursued.
     * @param {*} owner
     * @param {GOAPState} worldState
     * @returns {boolean}
     */
    IsValid(owner, worldState) {
        if (this._isValidFn && !this._isValidFn(owner, worldState)) {
            return false;
        }
        return this.GetPriority(owner, worldState) > 0;
    }

    /**
     * Check whether the given world state already satisfies all conditions of this goal.
     * @param {GOAPState|Object} worldState
     * @returns {boolean}
     */
    IsSatisfied(worldState) {
        const state = worldState instanceof GOAPState ? worldState : new GOAPState(worldState);
        return state.Matches(this.desiredState);
    }
}

// ============================================================================
// 3. GOAPAction — Atomic Action with Preconditions, Effects, Cost & Execution
// ============================================================================

/**
 * Base class for all GOAP actions.
 * Can be subclassed via OOP (`Enter`, `Update`, `Exit`, `GetCost`, `CheckProceduralPrecondition`)
 * OR instantiated directly using an inline configuration object.
 */
class GOAPAction {
    /**
     * @param {string} name - Action name shown in debuggers (e.g. 'ChopTree').
     * @param {Object} [config={}]
     * @param {number} [config.cost=1] - Base cost of the action (higher = less preferred by A*).
     * @param {Function} [config.getCost] - Dynamic cost function `(owner, worldState) => number`.
     * @param {Object} [config.preconditions={}] - Symbolic state required before running.
     * @param {Object} [config.effects={}] - Symbolic state changes applied when action succeeds.
     * @param {Function} [config.checkProcedural] - Runtime check `(owner, worldState) => boolean`.
     * @param {Function} [config.onEnter] - Called when action starts `(owner, worldState, action) => void`.
     * @param {Function} [config.onUpdate] - Called each tick `(dt, owner, worldState, action) => GOAPStatus`.
     * @param {Function} [config.onExit] - Called when action ends `(owner, worldState, status, action) => void`.
     */
    constructor(name, config = {}) {
        this.name = name;
        this.cost = config.cost !== undefined ? Number(config.cost) : 1;
        this.preconditions = Object.assign({}, config.preconditions || {});
        this.effects = Object.assign({}, config.effects || {});

        this._getCostFn = config.getCost || null;
        this._checkProceduralFn = config.checkProcedural || config.proceduralPrecondition || null;
        this._onEnterFn = config.onEnter || null;
        this._onUpdateFn = config.onUpdate || null;
        this._onExitFn = config.onExit || null;

        this.status = GOAPStatus.IDLE;
        this.isEntered = false;
    }

    /**
     * Fluent helper: add a symbolic precondition.
     * @param {string} key
     * @param {*} value
     * @returns {GOAPAction} this
     */
    Pre(key, value) {
        this.preconditions[key] = value;
        return this;
    }

    /**
     * Fluent helper: assign multiple preconditions.
     * @param {Object} preconditions
     * @returns {GOAPAction} this
     */
    SetPreconditions(preconditions) {
        Object.assign(this.preconditions, preconditions);
        return this;
    }

    /**
     * Fluent helper: add a symbolic effect.
     * @param {string} key
     * @param {*} value
     * @returns {GOAPAction} this
     */
    Effect(key, value) {
        this.effects[key] = value;
        return this;
    }

    /**
     * Fluent helper: assign multiple effects.
     * @param {Object} effects
     * @returns {GOAPAction} this
     */
    SetEffects(effects) {
        Object.assign(this.effects, effects);
        return this;
    }

    /**
     * Fluent helper: set a static cost or dynamic `(owner, worldState) => number` function.
     * @param {number|Function} costOrFn
     * @returns {GOAPAction} this
     */
    SetCost(costOrFn) {
        if (typeof costOrFn === 'function') {
            this._getCostFn = costOrFn;
        } else {
            this.cost = Number(costOrFn);
        }
        return this;
    }

    /**
     * Fluent helper: set a procedural precondition callback.
     * @param {Function} fn - `(owner, worldState) => boolean`
     * @returns {GOAPAction} this
     */
    SetProceduralCheck(fn) {
        this._checkProceduralFn = fn;
        return this;
    }

    /**
     * Return the cost of executing this action.
     * Override in subclasses or provide `config.getCost` for dynamic costs (e.g. distance).
     * @param {*} owner
     * @param {GOAPState} worldState
     * @returns {number}
     */
    GetCost(owner, worldState) {
        if (this._getCostFn) {
            return Math.max(0.01, Number(this._getCostFn(owner, worldState)));
        }
        return Math.max(0.01, this.cost);
    }

    /**
     * Check procedural preconditions that cannot be represented purely as symbolic booleans
     * (e.g. verifying that at least one resource node exists on the map).
     * @param {*} owner
     * @param {GOAPState} worldState
     * @returns {boolean}
     */
    CheckProceduralPrecondition(owner, worldState) {
        if (this._checkProceduralFn) {
            return Boolean(this._checkProceduralFn(owner, worldState, this));
        }
        return true;
    }

    /**
     * Check whether the given symbolic state satisfies all of this action's preconditions.
     * @param {GOAPState|Object} worldState
     * @returns {boolean}
     */
    ArePreconditionsMet(worldState) {
        const state = worldState instanceof GOAPState ? worldState : new GOAPState(worldState);
        return state.Matches(this.preconditions);
    }

    /**
     * Apply this action's symbolic effects onto a GOAPState.
     * @param {GOAPState} worldState
     */
    ApplyEffects(worldState) {
        if (worldState instanceof GOAPState) {
            worldState.Apply(this.effects);
        } else if (worldState && typeof worldState === 'object') {
            Object.assign(worldState, this.effects);
        }
    }

    /**
     * Check whether applying this action's effects actually changes at least one fact in `state`.
     * Prevents the A* planner from expanding useless no-op transitions.
     * @param {GOAPState} state
     * @returns {boolean}
     */
    HasEffectOnState(state) {
        const keys = Object.keys(this.effects);
        if (keys.length === 0) return false;
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const effVal = this.effects[k];
            if (typeof effVal === 'function') return true;
            if (!GOAPState.ValueMatches(state.Get(k), effVal)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Called once when the action begins execution in a plan.
     * @param {*} owner
     * @param {GOAPState} worldState
     */
    Enter(owner, worldState) {
        if (this._onEnterFn) {
            this._onEnterFn(owner, worldState, this);
        }
    }

    /**
     * Called every frame while this action is the active step in the plan.
     * Must return `GOAPStatus.RUNNING`, `GOAPStatus.SUCCESS`, or `GOAPStatus.FAILURE`.
     * @param {number} dt
     * @param {*} owner
     * @param {GOAPState} worldState
     * @returns {string} GOAPStatus
     */
    Update(dt, owner, worldState) {
        if (this._onUpdateFn) {
            return this._onUpdateFn(dt, owner, worldState, this);
        }
        return GOAPStatus.SUCCESS;
    }

    /**
     * Called once when the action finishes (`SUCCESS`, `FAILURE`, or plan abort).
     * @param {*} owner
     * @param {GOAPState} worldState
     * @param {string} status
     */
    Exit(owner, worldState, status) {
        if (this._onExitFn) {
            this._onExitFn(owner, worldState, status, this);
        }
    }

    /**
     * Reset internal execution flags.
     */
    Reset() {
        this.status = GOAPStatus.IDLE;
        this.isEntered = false;
    }
}

// ============================================================================
// 4. GOAPPlanner — A* State-Space Action Planner
// ============================================================================

/**
 * Synthesizes an optimal (lowest total cost) sequence of GOAPActions that
 * transforms a starting GOAPState into a state satisfying a GOAPGoal.
 *
 * Uses Forward State-Space A* Search:
 *   - g(n): cumulative action cost from initial state to node n
 *   - h(n): number of unsatisfied goal conditions remaining in node n's state
 *   - f(n) = g(n) + h(n)
 *
 * Records rich telemetry (`lastNodesExpanded`, `lastPlanCost`, `lastSearchTrace`)
 * for easy visualization and debugging.
 */
class GOAPPlanner {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.maxIterations=500] - Safety cap on A* node expansions.
     * @param {number} [options.maxPlanDepth=12] - Maximum number of actions in a single plan.
     * @param {number} [options.heuristicWeight=1.0] - Weight on h(n) (1.0 = admissible A*).
     */
    constructor(options = {}) {
        this.maxIterations = options.maxIterations || 500;
        this.maxPlanDepth = options.maxPlanDepth || 12;
        this.heuristicWeight = options.heuristicWeight !== undefined ? options.heuristicWeight : 1.0;

        // Telemetry from the most recent Plan() invocation
        this.lastPlanCost = 0;
        this.lastNodesExpanded = 0;
        this.lastConsideredActions = 0;
        this.lastSearchTrace = [];
    }

    /**
     * Compute the lowest-cost sequence of actions to satisfy `goal` starting from `startState`.
     *
     * @param {*} owner - The agent owner passed to dynamic cost & procedural checks.
     * @param {GOAPState|Object} startState - Current symbolic world state.
     * @param {GOAPGoal} goal - Target goal to satisfy.
     * @param {GOAPAction[]} availableActions - Pool of candidate actions.
     * @returns {GOAPAction[]|null} Ordered array of actions to execute, `[]` if already satisfied, or `null` if no plan exists.
     */
    Plan(owner, startState, goal, availableActions) {
        this.lastPlanCost = 0;
        this.lastNodesExpanded = 0;
        this.lastConsideredActions = 0;
        this.lastSearchTrace = [];

        if (!goal || !availableActions) return null;

        const rootState = startState instanceof GOAPState
            ? startState.Clone()
            : new GOAPState(startState);

        // If goal is already satisfied, return empty plan
        if (goal.IsSatisfied(rootState)) {
            return [];
        }

        // Filter actions that pass their procedural precondition in the current world
        const usableActions = [];
        for (let i = 0; i < availableActions.length; i++) {
            const act = availableActions[i];
            if (act.CheckProceduralPrecondition(owner, rootState)) {
                usableActions.push(act);
            }
        }
        this.lastConsideredActions = usableActions.length;

        if (usableActions.length === 0) {
            return null;
        }

        const rootH = rootState.CountDifferences(goal.desiredState) * this.heuristicWeight;
        const rootNode = {
            state: rootState,
            action: null,
            parent: null,
            g: 0,
            h: rootH,
            f: rootH,
            depth: 0
        };

        // Open list (priority queue sorted by f, tie-broken by lower h)
        const openList = [rootNode];
        // Best known g-score per state signature
        const bestG = new Map();
        bestG.set(rootState.GetSignature(), 0);

        let iterations = 0;

        while (openList.length > 0 && iterations < this.maxIterations) {
            iterations++;

            // Pop node with lowest f (and lowest h on ties)
            let bestIdx = 0;
            for (let i = 1; i < openList.length; i++) {
                const candidate = openList[i];
                const currentBest = openList[bestIdx];
                if (
                    candidate.f < currentBest.f - 1e-6 ||
                    (Math.abs(candidate.f - currentBest.f) <= 1e-6 && candidate.h < currentBest.h)
                ) {
                    bestIdx = i;
                }
            }
            const current = openList.splice(bestIdx, 1)[0];
            this.lastNodesExpanded = iterations;

            if ( current.action ) {
                this.lastSearchTrace.push({
                    actionName: current.action.name,
                    g: current.g,
                    h: current.h,
                    f: current.f,
                    depth: current.depth
                });
            }

            // Goal check: does current simulated state satisfy goal.desiredState?
            if (current.state.Matches(goal.desiredState)) {
                const plan = [];
                let curr = current;
                while (curr && curr.action !== null) {
                    plan.unshift(curr.action);
                    curr = curr.parent;
                }
                this.lastPlanCost = current.g;
                return plan;
            }

            if (current.depth >= this.maxPlanDepth) {
                continue;
            }

            // Expand neighbors by applying each applicable action
            for (let i = 0; i < usableActions.length; i++) {
                const action = usableActions[i];

                // Avoid repeating the exact same action consecutively unless state changed meaningfully
                if (current.action === action) continue;

                // 1. Symbolic preconditions must hold in current.state
                if (!action.ArePreconditionsMet(current.state)) continue;

                // 2. Action must actually change at least one fact in current.state
                if (!action.HasEffectOnState(current.state)) continue;

                // 3. Simulate next state
                const nextState = current.state.Clone();
                action.ApplyEffects(nextState);

                const stepCost = action.GetCost(owner, current.state);
                const tentativeG = current.g + stepCost;
                const sig = nextState.GetSignature();

                const previousBestG = bestG.get(sig);
                if (previousBestG !== undefined && tentativeG >= previousBestG - 1e-6) {
                    continue;
                }
                bestG.set(sig, tentativeG);

                const h = nextState.CountDifferences(goal.desiredState) * this.heuristicWeight;
                openList.push({
                    state: nextState,
                    action: action,
                    parent: current,
                    g: tentativeG,
                    h: h,
                    f: tentativeG + h,
                    depth: current.depth + 1
                });
            }
        }

        // No valid plan found
        return null;
    }
}

// ============================================================================
// 5. GOAPAgent — High-Level Decision & Plan Execution Controller
// ============================================================================

/**
 * Manages a GameObject's symbolic `worldState`, `goals`, `actions`, and `planner`.
 * Automatically selects the highest-priority unsatisfied goal, synthesizes a plan
 * via `GOAPPlanner`, executes the plan step-by-step, and replans dynamically when
 * world conditions change or an action fails.
 */
class GOAPAgent {
    /**
     * @param {*} owner - The GameObject or entity controlled by this agent.
     * @param {Object} [options={}]
     * @param {Object|GOAPState} [options.initialState={}] - Initial symbolic world state.
     * @param {Function} [options.onUpdateSensors] - Callback `(owner, worldState, agent) => void` run every Update.
     * @param {boolean} [options.autoPreempt=true] - Replan immediately if a higher-priority goal emerges.
     * @param {number} [options.replanCooldown=0.15] - Minimum seconds between failed replan attempts.
     * @param {Object} [options.plannerOptions={}] - Options forwarded to `GOAPPlanner`.
     */
    constructor(owner, options = {}) {
        this.owner = owner;
        this.worldState = new GOAPState(options.initialState || {});
        this.actions = [];
        this.goals = [];
        this.planner = new GOAPPlanner(options.plannerOptions || {});

        this.sensorFn = options.onUpdateSensors || null;
        this.autoPreempt = options.autoPreempt !== undefined ? options.autoPreempt : true;
        this.replanCooldown = options.replanCooldown !== undefined ? options.replanCooldown : 0.15;
        this._replanTimer = 0;

        // Active execution state
        this.currentGoal = null;
        this.currentPlan = [];
        this.currentStepIndex = 0;
        this.stepStatuses = [];
        this.stepCosts = [];

        // Telemetry for HUD & classroom inspection
        this.replanCount = 0;
        this.lastPlanReason = 'Initial';
        this.lastCompletedGoalName = null;
    }

    /**
     * Register a single GOAPAction.
     * @param {GOAPAction} action
     * @returns {GOAPAgent} this (chainable)
     */
    AddAction(action) {
        this.actions.push(action);
        return this;
    }

    /**
     * Register an array of GOAPActions.
     * @param {GOAPAction[]} actions
     * @returns {GOAPAgent} this (chainable)
     */
    AddActions(actions) {
        for (let i = 0; i < actions.length; i++) {
            this.actions.push(actions[i]);
        }
        return this;
    }

    /**
     * Register a single GOAPGoal.
     * @param {GOAPGoal} goal
     * @returns {GOAPAgent} this (chainable)
     */
    AddGoal(goal) {
        this.goals.push(goal);
        return this;
    }

    /**
     * Register an array of GOAPGoals.
     * @param {GOAPGoal[]} goals
     * @returns {GOAPAgent} this (chainable)
     */
    AddGoals(goals) {
        for (let i = 0; i < goals.length; i++) {
            this.goals.push(goals[i]);
        }
        return this;
    }

    /**
     * Set a sensor callback invoked at the beginning of every `Update(dt)` to
     * synchronize `this.worldState` with the live game world.
     * @param {Function} fn - `(owner, worldState, agent) => void`
     * @returns {GOAPAgent} this (chainable)
     */
    SetSensor(fn) {
        this.sensorFn = fn;
        return this;
    }

    /**
     * Alias for `SetSensor(fn)`.
     * @param {Function} fn - `(owner, worldState, agent) => void`
     * @returns {GOAPAgent} this (chainable)
     */
    AddSensor(fn) {
        this.sensorFn = fn;
        return this;
    }

    /**
     * Poll sensors immediately (if configured) and synthesize a new plan.
     * Alias for `Replan(reason)`.
     * @param {string} [reason='Manual Plan']
     * @returns {boolean}
     */
    Plan(reason = 'Manual Plan') {
        if (this.sensorFn) {
            this.sensorFn(this.owner, this.worldState, this);
        }
        return this.Replan(reason);
    }

    /**
     * Alias for `currentStepIndex`.
     * @returns {number}
     */
    get currentPlanIndex() {
        return this.currentStepIndex;
    }

    /**
     * Set a single symbolic fact on the agent's `worldState`.
     * @param {string} key
     * @param {*} value
     * @returns {GOAPAgent} this (chainable)
     */
    SetState(key, value) {
        this.worldState.Set(key, value);
        return this;
    }

    /**
     * Get a symbolic fact from the agent's `worldState`.
     * @param {string} key
     * @param {*} [defaultValue=undefined]
     * @returns {*}
     */
    GetState(key, defaultValue = undefined) {
        return this.worldState.Get(key, defaultValue);
    }

    /**
     * Return the currently executing `GOAPAction`, or `null` if idle.
     * @returns {GOAPAction|null}
     */
    GetCurrentAction() {
        if (this.currentStepIndex >= 0 && this.currentStepIndex < this.currentPlan.length) {
            return this.currentPlan[this.currentStepIndex];
        }
        return null;
    }

    /**
     * Abort the currently running plan and cleanly exit any active action.
     * @param {string} [reason='Aborted']
     */
    AbortPlan(reason = 'Aborted') {
        const activeAction = this.GetCurrentAction();
        if (activeAction && activeAction.isEntered) {
            activeAction.Exit(this.owner, this.worldState, GOAPStatus.FAILURE);
            activeAction.Reset();
        }
        this.currentGoal = null;
        this.currentPlan = [];
        this.currentStepIndex = 0;
        this.stepStatuses = [];
        this.stepCosts = [];
        this.lastPlanReason = reason;
    }

    /**
     * Evaluate all goals in descending priority order and synthesize a new plan
     * for the highest-priority unsatisfied goal that has a solvable action sequence.
     *
     * @param {string} [reason='Replan']
     * @returns {boolean} True if a valid plan was found.
     */
    Replan(reason = 'Replan') {
        const activeAction = this.GetCurrentAction();
        if (activeAction && activeAction.isEntered) {
            activeAction.Exit(this.owner, this.worldState, GOAPStatus.FAILURE);
            activeAction.Reset();
        }

        // 1. Collect all valid, unsatisfied goals and evaluate their priorities
        const candidateGoals = [];
        for (let i = 0; i < this.goals.length; i++) {
            const g = this.goals[i];
            g.GetPriority(this.owner, this.worldState);
            if (g.IsValid(this.owner, this.worldState) && !g.IsSatisfied(this.worldState)) {
                candidateGoals.push(g);
            }
        }

        // Sort descending by priority
        candidateGoals.sort((a, b) => b.lastEvaluatedPriority - a.lastEvaluatedPriority);

        // 2. Try planning for each candidate goal until a solvable plan is found
        for (let i = 0; i < candidateGoals.length; i++) {
            const goal = candidateGoals[i];
            const plan = this.planner.Plan(this.owner, this.worldState, goal, this.actions);

            if (plan && plan.length > 0) {
                this.currentGoal = goal;
                this.currentPlan = plan;
                this.currentStepIndex = 0;
                this.stepStatuses = plan.map(() => GOAPStatus.IDLE);
                this.stepCosts = [];

                // Record step costs along simulated state trajectory for HUD display
                const simState = this.worldState.Clone();
                for (let s = 0; s < plan.length; s++) {
                    plan[s].Reset();
                    this.stepCosts.push(plan[s].GetCost(this.owner, simState));
                    plan[s].ApplyEffects(simState);
                }

                this.replanCount++;
                this.lastPlanReason = reason;
                return true;
            }
        }

        // No solvable goal found
        this.currentGoal = null;
        this.currentPlan = [];
        this.currentStepIndex = 0;
        this.stepStatuses = [];
        this.stepCosts = [];
        return false;
    }

    /**
     * Tick the GOAP agent. Call once per frame from the owner's `Update(dt)`.
     * @param {number} dt - Frame delta time in seconds.
     */
    Update(dt) {
        if (this._replanTimer > 0) {
            this._replanTimer = Math.max(0, this._replanTimer - dt);
        }

        // 1. Poll sensors to update worldState
        if (this.sensorFn) {
            this.sensorFn(this.owner, this.worldState, this);
        }

        // Refresh goal priorities for HUD and preemption check
        let bestUnsatisfiedGoal = null;
        let bestPriority = -Infinity;
        for (let i = 0; i < this.goals.length; i++) {
            const g = this.goals[i];
            const p = g.GetPriority(this.owner, this.worldState);
            if (g.IsValid(this.owner, this.worldState) && !g.IsSatisfied(this.worldState)) {
                if (p > bestPriority) {
                    bestPriority = p;
                    bestUnsatisfiedGoal = g;
                }
            }
        }

        // 2. Check if current goal is already satisfied by external world changes
        if (this.currentGoal && this.currentGoal.IsSatisfied(this.worldState)) {
            this.lastCompletedGoalName = this.currentGoal.name;
            this.AbortPlan(`Goal '${this.currentGoal.name}' satisfied`);
        }

        // 3. Preempt current goal if a strictly higher-priority goal emerged
        if (
            this.autoPreempt &&
            this.currentGoal &&
            bestUnsatisfiedGoal &&
            bestUnsatisfiedGoal !== this.currentGoal &&
            bestPriority > this.currentGoal.lastEvaluatedPriority
        ) {
            this.Replan(`Preempted by '${bestUnsatisfiedGoal.name}'`);
        }

        // 4. If idle and we have an unsatisfied goal, plan now
        if ((!this.currentGoal || this.currentStepIndex >= this.currentPlan.length) && bestUnsatisfiedGoal) {
            if (this._replanTimer <= 0) {
                const ok = this.Replan('Goal selected');
                if (!ok) {
                    this._replanTimer = this.replanCooldown;
                }
            }
        }

        // 5. Execute active action step
        const action = this.GetCurrentAction();
        if (!action) return;

        if (!action.isEntered) {
            // Verify symbolic & procedural preconditions still hold before entering
            if (
                !action.ArePreconditionsMet(this.worldState) ||
                !action.CheckProceduralPrecondition(this.owner, this.worldState)
            ) {
                this.stepStatuses[this.currentStepIndex] = GOAPStatus.FAILURE;
                this.Replan(`Precondition invalidated for '${action.name}'`);
                return;
            }
            action.isEntered = true;
            action.status = GOAPStatus.RUNNING;
            this.stepStatuses[this.currentStepIndex] = GOAPStatus.RUNNING;
            action.Enter(this.owner, this.worldState);
        }

        const status = action.Update(dt, this.owner, this.worldState);
        action.status = status;
        this.stepStatuses[this.currentStepIndex] = status;

        if (status === GOAPStatus.SUCCESS) {
            action.Exit(this.owner, this.worldState, GOAPStatus.SUCCESS);
            action.ApplyEffects(this.worldState);
            action.isEntered = false;
            this.currentStepIndex++;

            // If that was the final step in the plan, record completion
            if (this.currentStepIndex >= this.currentPlan.length && this.currentGoal) {
                this.lastCompletedGoalName = this.currentGoal.name;
            }
        } else if (status === GOAPStatus.FAILURE) {
            action.Exit(this.owner, this.worldState, GOAPStatus.FAILURE);
            action.isEntered = false;
            this._replanTimer = this.replanCooldown;
            this.Replan(`Action '${action.name}' failed`);
        }
    }

    // ========================================================================
    // 6. Visual Debugging Tools (DrawDebug & DrawGOAPInspector)
    // ========================================================================

    /**
     * Draw a compact world-space label above the agent showing `[Goal] ▶ Action (step/total)`.
     * Renders when global `debugMode` is true (or always if `forceDraw = true`).
     *
     * @param {Renderer} renderer
     * @param {number} x
     * @param {number} y
     * @param {Color} [color=Color.yellow]
     * @param {boolean} [forceDraw=false]
     */
    DrawDebug(renderer, x, y, color = Color.yellow, forceDraw = false) {
        if (!forceDraw && (typeof debugMode === 'undefined' || !debugMode)) return;
        const ctx = renderer.ctx;
        if (!ctx) return;

        const goalText = this.currentGoal ? this.currentGoal.name : 'Idle';
        const act = this.GetCurrentAction();
        const actText = act
            ? ` ▶ ${act.name} (${this.currentStepIndex + 1}/${this.currentPlan.length})`
            : '';
        const label = `[${goalText}]${actText}`;

        ctx.save();
        ctx.font = 'bold 11px monospace';
        const w = ctx.measureText(label).width + 12;
        ctx.fillStyle = 'rgba(10, 14, 24, 0.82)';
        ctx.fillRect(x - w / 2, y - 13, w, 18);
        ctx.strokeStyle = color && color.ToString ? color.ToString() : String(color || '#facc15');
        ctx.lineWidth = 1;
        ctx.strokeRect(x - w / 2, y - 13, w, 18);
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y);
        ctx.restore();
    }

    /**
     * Render a comprehensive, real-time GOAP Inspector HUD panel on the Canvas:
     *   1. Header with Planner Telemetry (Replans, A* Nodes Expanded, Total Cost)
     *   2. Symbolic World State Table (live key-value badges)
     *   3. Ranked Goals with dynamic priority bars & Satisfied/Active indicators
     *   4. Active A* Synthesized Action Plan Pipeline with step statuses & costs
     *
     * @param {Renderer} renderer
     * @param {number} x
     * @param {number} y
     * @param {Object} [options={}]
     * @param {number} [options.width=350]
     * @param {string} [options.title='GOAP Planner Inspector']
     * @param {boolean} [options.showWorldState=true]
     * @param {boolean} [options.showGoals=true]
     * @param {boolean} [options.showPlan=true]
     * @returns {number} Total height of the rendered panel in pixels.
     */
    DrawGOAPInspector(renderer, x, y, options = {}) {
        const ctx = renderer.ctx;
        if (!ctx) return 0;

        const width = options.width || 350;
        const title = options.title || 'GOAP Planner Inspector';
        const showWorldState = options.showWorldState !== false;
        const showGoals = options.showGoals !== false;
        const showPlan = options.showPlan !== false;

        const stateKeys = Object.keys(this.worldState.values);
        const stateRows = showWorldState ? Math.ceil(stateKeys.length / 2) : 0;
        const goalRows = showGoals ? this.goals.length : 0;
        const planSteps = showPlan ? Math.max(1, this.currentPlan.length) : 0;

        // Calculate dynamic panel height
        let totalHeight = 52; // Title + telemetry subheader
        if (showWorldState) totalHeight += 24 + stateRows * 20 + 8;
        if (showGoals) totalHeight += 24 + goalRows * 22 + 8;
        if (showPlan) totalHeight += 28 + planSteps * 24 + 10;

        ctx.save();

        // Panel background
        ctx.fillStyle = 'rgba(13, 18, 30, 0.92)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, width, totalHeight, 8);
        } else {
            ctx.rect(x, y, width, totalHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Header bar
        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.fillRect(x + 1, y + 1, width - 2, 44);

        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'left';
        ctx.fillText(`🧠 ${title}`, x + 10, y + 19);

        // Telemetry line
        ctx.font = '11px monospace';
        ctx.fillStyle = '#94a3b8';
        const costStr = this.planner.lastPlanCost.toFixed(1);
        ctx.fillText(
            `A* Nodes: ${this.planner.lastNodesExpanded} | Plan Cost: ${costStr} | Replans: ${this.replanCount}`,
            x + 10,
            y + 37
        );

        let curY = y + 54;

        // ── Section 1: Symbolic World State ─────────────────────────────
        if (showWorldState) {
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText('WORLD STATE (FACTS)', x + 10, curY + 11);
            curY += 18;

            const colWidth = (width - 26) / 2;
            for (let i = 0; i < stateKeys.length; i++) {
                const key = stateKeys[i];
                const val = this.worldState.values[key];
                const col = i % 2;
                const row = Math.floor(i / 2);
                const cellX = x + 10 + col * (colWidth + 6);
                const cellY = curY + row * 20;

                // Fact pill
                ctx.fillStyle = val === true
                    ? 'rgba(34, 197, 94, 0.16)'
                    : val === false
                        ? 'rgba(100, 116, 139, 0.18)'
                        : 'rgba(56, 189, 248, 0.16)';
                ctx.strokeStyle = val === true
                    ? 'rgba(34, 197, 94, 0.5)'
                    : val === false
                        ? 'rgba(100, 116, 139, 0.35)'
                        : 'rgba(56, 189, 248, 0.5)';
                ctx.lineWidth = 1;
                ctx.fillRect(cellX, cellY, colWidth, 17);
                ctx.strokeRect(cellX, cellY, colWidth, 17);

                ctx.font = '10px monospace';
                ctx.fillStyle = '#e2e8f0';
                ctx.textAlign = 'left';
                const shortKey = key.length > 15 ? key.slice(0, 14) + '…' : key;
                ctx.fillText(shortKey, cellX + 5, cellY + 12);

                ctx.textAlign = 'right';
                ctx.fillStyle = val === true ? '#4ade80' : val === false ? '#94a3b8' : '#38bdf8';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(String(val), cellX + colWidth - 5, cellY + 12);
            }
            curY += stateRows * 20 + 8;
        }

        // ── Section 2: Goals Ranked by Priority ─────────────────────────
        if (showGoals) {
            ctx.textAlign = 'left';
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText('GOALS (PRIORITY & SATISFACTION)', x + 10, curY + 11);
            curY += 18;

            const sortedGoals = this.goals.slice().sort(
                (a, b) => b.lastEvaluatedPriority - a.lastEvaluatedPriority
            );

            for (let i = 0; i < sortedGoals.length; i++) {
                const g = sortedGoals[i];
                const isActive = this.currentGoal === g;
                const isSat = g.IsSatisfied(this.worldState);
                const prio = Math.max(0, Math.min(100, g.lastEvaluatedPriority));

                // Goal row box
                ctx.fillStyle = isActive
                    ? 'rgba(250, 204, 21, 0.16)'
                    : 'rgba(30, 41, 59, 0.65)';
                ctx.strokeStyle = isActive
                    ? '#facc15'
                    : isSat
                        ? 'rgba(34, 197, 94, 0.45)'
                        : 'rgba(71, 85, 105, 0.4)';
                ctx.lineWidth = isActive ? 1.5 : 1;
                ctx.fillRect(x + 10, curY, width - 20, 19);
                ctx.strokeRect(x + 10, curY, width - 20, 19);

                // Priority bar fill
                const barMaxW = 90;
                const barW = (prio / 100) * barMaxW;
                ctx.fillStyle = isActive
                    ? 'rgba(250, 204, 21, 0.35)'
                    : 'rgba(56, 189, 248, 0.25)';
                ctx.fillRect(x + 11, curY + 1, barW, 17);

                ctx.font = isActive ? 'bold 11px monospace' : '11px monospace';
                ctx.fillStyle = isActive ? '#fef08a' : '#f1f5f9';
                ctx.textAlign = 'left';
                ctx.fillText(`${isActive ? '▶ ' : '  '}${g.name}`, x + 14, curY + 13);

                ctx.textAlign = 'right';
                ctx.font = 'bold 10px monospace';
                if (isSat) {
                    ctx.fillStyle = '#4ade80';
                    ctx.fillText(`✔ SATISFIED (P:${Math.round(g.lastEvaluatedPriority)})`, x + width - 15, curY + 13);
                } else if (isActive) {
                    ctx.fillStyle = '#facc15';
                    ctx.fillText(`ACTIVE (P:${Math.round(g.lastEvaluatedPriority)})`, x + width - 15, curY + 13);
                } else {
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText(`P:${Math.round(g.lastEvaluatedPriority)}`, x + width - 15, curY + 13);
                }

                curY += 22;
            }
            curY += 6;
        }

        // ── Section 3: Synthesized A* Action Plan Pipeline ──────────────
        if (showPlan) {
            ctx.textAlign = 'left';
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#cbd5e1';
            const goalLabel = this.currentGoal ? ` → ${this.currentGoal.name}` : '';
            ctx.fillText(`ACTIVE A* ACTION PLAN${goalLabel}`, x + 10, curY + 11);
            curY += 18;

            if (this.currentPlan.length === 0) {
                ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
                ctx.fillRect(x + 10, curY, width - 20, 22);
                ctx.font = 'italic 11px monospace';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText('  (No active plan — all valid goals satisfied)', x + 14, curY + 15);
                curY += 24;
            } else {
                for (let i = 0; i < this.currentPlan.length; i++) {
                    const act = this.currentPlan[i];
                    const st = this.stepStatuses[i] || GOAPStatus.IDLE;
                    const cost = this.stepCosts[i] !== undefined ? this.stepCosts[i] : act.cost;
                    const isCurrent = i === this.currentStepIndex;

                    let bg = 'rgba(30, 41, 59, 0.55)';
                    let border = 'rgba(71, 85, 105, 0.45)';
                    let badge = '○';
                    let textColor = '#cbd5e1';

                    if (st === GOAPStatus.SUCCESS) {
                        bg = 'rgba(22, 101, 52, 0.32)';
                        border = 'rgba(74, 222, 128, 0.6)';
                        badge = '✔';
                        textColor = '#86efac';
                    } else if (st === GOAPStatus.RUNNING || isCurrent) {
                        bg = 'rgba(161, 98, 7, 0.38)';
                        border = '#facc15';
                        badge = '⏳';
                        textColor = '#fef08a';
                    } else if (st === GOAPStatus.FAILURE) {
                        bg = 'rgba(153, 27, 27, 0.38)';
                        border = '#f87171';
                        badge = '✖';
                        textColor = '#fca5a5';
                    }

                    ctx.fillStyle = bg;
                    ctx.strokeStyle = border;
                    ctx.lineWidth = isCurrent ? 1.5 : 1;
                    ctx.fillRect(x + 10, curY, width - 20, 21);
                    ctx.strokeRect(x + 10, curY, width - 20, 21);

                    ctx.font = isCurrent ? 'bold 11px monospace' : '11px monospace';
                    ctx.fillStyle = textColor;
                    ctx.textAlign = 'left';
                    ctx.fillText(`${i + 1}. ${badge} ${act.name}`, x + 16, curY + 14);

                    // Show cost + primary effect
                    const effKeys = Object.keys(act.effects);
                    const effPreview = effKeys.length > 0
                        ? `${effKeys[0]}:${act.effects[effKeys[0]]}`
                        : '';
                    ctx.font = '10px monospace';
                    ctx.fillStyle = '#94a3b8';
                    ctx.textAlign = 'right';
                    ctx.fillText(
                        `${effPreview ? '[' + effPreview + '] ' : ''}cost:${cost.toFixed(1)}`,
                        x + width - 16,
                        curY + 14
                    );

                    curY += 24;
                }
            }
        }

        ctx.restore();
        return totalHeight;
    }
}

/**
 * Standalone helper to render a GOAPAgent's inspector panel onto the canvas.
 * @param {Renderer} renderer
 * @param {GOAPAgent} agent
 * @param {number} x
 * @param {number} y
 * @param {Object} [options={}]
 * @returns {number}
 */
function DrawGOAPInspector(renderer, agent, x, y, options = {}) {
    if (!agent || typeof agent.DrawGOAPInspector !== 'function') return 0;
    return agent.DrawGOAPInspector(renderer, x, y, options);
}

