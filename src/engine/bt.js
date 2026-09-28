// ============================================================
// Behavior Tree (BT)
// Provides core Behavior Tree nodes, blackboard, and runner
// for building modular, reactive, and hierarchical game AI.
// Requires: renderer.js (DrawDebug), main.js (debugMode global)
// ============================================================

// #region BTStatus

/**
 * Status results returned by Behavior Tree nodes on Tick.
 * @readonly
 * @enum {string}
 */
const BTStatus = Object.freeze({
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    RUNNING: 'RUNNING'
});

// #endregion

// #region BTBlackboard

/**
 * Shared memory repository for Behavior Tree nodes.
 * Allows decoupled communication between condition nodes, action nodes,
 * and game systems (e.g. storing targets, alert levels, waypoints, timers).
 *
 * @example
 * const bb = new BTBlackboard();
 * bb.Set('target', player);
 * if (bb.Has('target')) {
 *     const target = bb.Get('target');
 * }
 */
class BTBlackboard {
    constructor() {
        /** @type {Map<string, *>} */
        this._data = new Map();
        /** @type {Map<string, Array<function(*, *): void>>} */
        this._listeners = new Map();
    }

    /**
     * Store a value in the blackboard.
     * Triggers registered change listeners if the value changed.
     * @param {string} key
     * @param {*} value
     * @returns {*} The value stored.
     */
    Set(key, value) {
        const prev = this._data.get(key);
        this._data.set(key, value);
        if (prev !== value && this._listeners.has(key)) {
            const list = this._listeners.get(key);
            for (let i = 0; i < list.length; i++) {
                list[i](value, prev);
            }
        }
        return value;
    }

    /**
     * Retrieve a value from the blackboard.
     * @param {string} key
     * @param {*} [defaultValue=null] Value returned if key does not exist.
     * @returns {*}
     */
    Get(key, defaultValue = null) {
        return this._data.has(key) ? this._data.get(key) : defaultValue;
    }

    /**
     * Check if a key exists in the blackboard.
     * @param {string} key
     * @returns {boolean}
     */
    Has(key) {
        return this._data.has(key);
    }

    /**
     * Remove a key from the blackboard.
     * @param {string} key
     * @returns {boolean} True if the element existed and was removed.
     */
    Delete(key) {
        return this._data.delete(key);
    }

    /** Remove all keys from the blackboard. */
    Clear() {
        this._data.clear();
    }

    /**
     * Subscribe to value changes on a specific key.
     * @param {string} key
     * @param {function(newVal: *, oldVal: *): void} callback
     * @returns {function(): void} Unsubscribe function.
     */
    OnChange(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, []);
        }
        this._listeners.get(key).push(callback);
        return () => {
            const list = this._listeners.get(key);
            if (list) {
                const idx = list.indexOf(callback);
                if (idx !== -1) list.splice(idx, 1);
            }
        };
    }
}

// #endregion

// #region BTNode

/**
 * Base class for all Behavior Tree nodes.
 *
 * Implements the Template Method pattern: `Tick()` orchestrates node lifecycle
 * (`Enter`, `Update`, `Exit`), while subclasses override `Update()` and optionally `Enter()` / `Exit()`.
 *
 * @example
 * class CustomAction extends BTNode {
 *     Enter(owner, bb) { owner.playAnimation('walk'); }
 *     Update(dt, owner, bb) {
 *         return owner.reachedTarget ? BTStatus.SUCCESS : BTStatus.RUNNING;
 *     }
 *     Exit(owner, bb, status) { owner.stopAnimation(); }
 * }
 */
class BTNode {
    /**
     * @param {string} [name='BTNode'] Node label for debugging and inspection.
     */
    constructor(name = 'BTNode') {
        /** @type {string} */
        this.name = name;
        /** @type {BTStatus|null} Status returned on the most recent tick. */
        this.status = null;
        /** @type {boolean} True if Enter() was called and Exit() has not yet run. */
        this._isOpen = false;
        /** @type {number} Total times this node was ticked. */
        this._tickCount = 0;
    }

    /**
     * Ticks this node. Automatically handles Enter() and Exit() transitions.
     * @param {number} dt Delta time in seconds.
     * @param {*} owner The agent / game object owning this tree.
     * @param {BTBlackboard} blackboard Shared data repository.
     * @returns {BTStatus} SUCCESS, FAILURE, or RUNNING.
     */
    Tick(dt, owner, blackboard) {
        if (!this._isOpen) {
            this.Enter(owner, blackboard);
            this._isOpen = true;
        }

        this._tickCount++;
        this.status = this.Update(dt, owner, blackboard);

        if (this.status !== BTStatus.RUNNING) {
            this._isOpen = false;
            this.Exit(owner, blackboard, this.status);
        }

        return this.status;
    }

    /**
     * Called once when this node starts executing (transitions from inactive to active).
     * @param {*} owner
     * @param {BTBlackboard} blackboard
     */
    Enter(owner, blackboard) {}

    /**
     * Called every tick while this node is active. Subclasses must implement this.
     * @param {number} dt Delta time in seconds.
     * @param {*} owner
     * @param {BTBlackboard} blackboard
     * @returns {BTStatus}
     */
    Update(dt, owner, blackboard) {
        return BTStatus.SUCCESS;
    }

    /**
     * Called once when this node finishes with SUCCESS or FAILURE.
     * @param {*} owner
     * @param {BTBlackboard} blackboard
     * @param {BTStatus} status The completion status (SUCCESS or FAILURE).
     */
    Exit(owner, blackboard, status) {}

    /**
     * Aborts this node if it is currently running.
     * Called when a higher-priority branch interrupts an active node.
     * @param {*} owner
     * @param {BTBlackboard} blackboard
     */
    Abort(owner, blackboard) {
        if (this._isOpen) {
            this._isOpen = false;
            this.status = BTStatus.FAILURE;
            this.Exit(owner, blackboard, BTStatus.FAILURE);
        }
    }

    /**
     * Recursively resets this node's status and execution state.
     */
    Reset() {
        this.status = null;
        this._isOpen = false;
        this._tickCount = 0;
    }
}

// #endregion

// #region BTComposite

/**
 * Base class for composite nodes that control execution flow across multiple children.
 */
class BTComposite extends BTNode {
    /**
     * @param {string} [name='Composite']
     * @param {BTNode[]} [children=[]]
     */
    constructor(name = 'Composite', children = []) {
        super(name);
        /** @type {BTNode[]} */
        this.children = [...children];
        /** @type {number} Index of the child currently executing (for memory nodes). */
        this._runningChildIndex = -1;
    }

    /**
     * Add a child node to this composite.
     * @param {BTNode} node
     * @returns {BTComposite} this, for chaining.
     */
    AddChild(node) {
        this.children.push(node);
        return this;
    }

    Abort(owner, blackboard) {
        if (this._runningChildIndex >= 0 && this._runningChildIndex < this.children.length) {
            this.children[this._runningChildIndex].Abort(owner, blackboard);
        }
        this._runningChildIndex = -1;
        super.Abort(owner, blackboard);
    }

    Reset() {
        super.Reset();
        this._runningChildIndex = -1;
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].Reset();
        }
    }
}

// #endregion

// #region BTSelector

/**
 * Fallback / OR logic node.
 * Evaluates children from left to right.
 * - If a child returns SUCCESS → Selector succeeds immediately (returns SUCCESS).
 * - If a child returns RUNNING → Selector pauses here (returns RUNNING).
 * - If a child returns FAILURE → Selector moves to the next child.
 * - If all children fail → Selector fails (returns FAILURE).
 *
 * Can operate in two modes:
 * - **Memory (default, `reactive: false`)**: If a child was RUNNING, resumes directly at that child next tick.
 * - **Reactive (`reactive: true`)**: Re-evaluates from child 0 every tick. If a higher-priority child succeeds
 *   or runs, any previously running lower-priority child is cleanly aborted.
 *
 * @example
 * const root = new BTSelector('Priorities', [
 *     new BTSequence('Flee', [new BTCondition('LowHP', o => o.hp < 20), new BTAction('Run', ...)]),
 *     new BTSequence('Attack', [new BTCondition('EnemyNear', ...), new BTAction('Strike', ...)]),
 *     new BTAction('Patrol', ...)
 * ]);
 */
class BTSelector extends BTComposite {
    /**
     * @param {string} [name='Selector']
     * @param {BTNode[]} [children=[]]
     * @param {{reactive?: boolean}} [options={}]
     */
    constructor(name = 'Selector', children = [], options = {}) {
        super(name, children);
        /** @type {boolean} If true, restarts evaluation from child 0 each tick. */
        this.reactive = options.reactive ?? false;
    }

    Update(dt, owner, blackboard) {
        const startIndex = this.reactive ? 0 : Math.max(0, this._runningChildIndex);

        for (let i = startIndex; i < this.children.length; i++) {
            const child = this.children[i];
            const childStatus = child.Tick(dt, owner, blackboard);

            if (childStatus === BTStatus.RUNNING) {
                // In reactive mode, if a higher-priority child started running, abort previously running lower child
                if (this.reactive && this._runningChildIndex !== -1 && this._runningChildIndex !== i) {
                    if (this._runningChildIndex > i && this._runningChildIndex < this.children.length) {
                        this.children[this._runningChildIndex].Abort(owner, blackboard);
                    }
                }
                this._runningChildIndex = i;
                return BTStatus.RUNNING;
            }

            if (childStatus === BTStatus.SUCCESS) {
                // Abort any lower running child if we succeeded earlier in reactive mode
                if (this._runningChildIndex !== -1 && this._runningChildIndex !== i) {
                    if (this._runningChildIndex < this.children.length) {
                        this.children[this._runningChildIndex].Abort(owner, blackboard);
                    }
                }
                this._runningChildIndex = -1;
                return BTStatus.SUCCESS;
            }

            // childStatus === BTStatus.FAILURE: continue loop
        }

        this._runningChildIndex = -1;
        return BTStatus.FAILURE;
    }
}

/**
 * Convenience subclass: A Selector configured with `reactive: true`.
 * Always evaluates children from top to bottom, interrupting lower-priority tasks when
 * higher-priority conditions become true.
 */
class BTReactiveSelector extends BTSelector {
    /**
     * @param {string} [name='ReactiveSelector']
     * @param {BTNode[]} [children=[]]
     */
    constructor(name = 'ReactiveSelector', children = []) {
        super(name, children, { reactive: true });
    }
}

// #endregion

// #region BTSequence

/**
 * AND logic node.
 * Evaluates children from left to right.
 * - If a child returns FAILURE → Sequence fails immediately (returns FAILURE).
 * - If a child returns RUNNING → Sequence pauses here (returns RUNNING).
 * - If a child returns SUCCESS → Sequence moves to the next child.
 * - If all children succeed → Sequence succeeds (returns SUCCESS).
 *
 * Can operate in two modes:
 * - **Memory (default, `reactive: false`)**: If a child was RUNNING, resumes directly at that child next tick.
 * - **Reactive (`reactive: true`)**: Re-evaluates preceding conditions from index 0 each tick. If an earlier condition
 *   becomes false while a later action is running, the running action is aborted and the sequence fails.
 *
 * @example
 * const gather = new BTSequence('GatherWood', [
 *     new BTCondition('HasAxe', o => o.hasAxe),
 *     new BTAction('WalkToTree', (dt, o) => o.WalkToTree(dt)),
 *     new BTWait('Chop', 2.0),
 *     new BTAction('CollectWood', (dt, o) => o.CollectWood())
 * ]);
 */
class BTSequence extends BTComposite {
    /**
     * @param {string} [name='Sequence']
     * @param {BTNode[]} [children=[]]
     * @param {{reactive?: boolean}} [options={}]
     */
    constructor(name = 'Sequence', children = [], options = {}) {
        super(name, children);
        /** @type {boolean} If true, re-tests previous children each tick. */
        this.reactive = options.reactive ?? false;
    }

    Update(dt, owner, blackboard) {
        const startIndex = this.reactive ? 0 : Math.max(0, this._runningChildIndex);

        for (let i = startIndex; i < this.children.length; i++) {
            const child = this.children[i];
            const childStatus = child.Tick(dt, owner, blackboard);

            if (childStatus === BTStatus.RUNNING) {
                this._runningChildIndex = i;
                return BTStatus.RUNNING;
            }

            if (childStatus === BTStatus.FAILURE) {
                // If an earlier child failed while a later child was running, abort the later one
                if (this._runningChildIndex > i && this._runningChildIndex < this.children.length) {
                    this.children[this._runningChildIndex].Abort(owner, blackboard);
                }
                this._runningChildIndex = -1;
                return BTStatus.FAILURE;
            }

            // childStatus === BTStatus.SUCCESS: advance to next child
        }

        this._runningChildIndex = -1;
        return BTStatus.SUCCESS;
    }
}

/**
 * Convenience subclass: A Sequence configured with `reactive: true`.
 */
class BTReactiveSequence extends BTSequence {
    /**
     * @param {string} [name='ReactiveSequence']
     * @param {BTNode[]} [children=[]]
     */
    constructor(name = 'ReactiveSequence', children = []) {
        super(name, children, { reactive: true });
    }
}

// #endregion

// #region BTParallel

/**
 * Parallel composite node.
 * Ticks all of its children concurrently each frame until success or failure policy conditions are met.
 *
 * Useful for concurrent behaviors, e.g. moving while shooting, or playing an animation while patrolling.
 */
class BTParallel extends BTComposite {
    /**
     * Policy options for completion.
     */
    static Policy = Object.freeze({
        REQUIRE_ALL: 'REQUIRE_ALL',
        REQUIRE_ONE: 'REQUIRE_ONE'
    });

    /**
     * @param {string} [name='Parallel']
     * @param {BTNode[]} [children=[]]
     * @param {{policySuccess?: string, policyFailure?: string}} [options={}]
     */
    constructor(name = 'Parallel', children = [], options = {}) {
        super(name, children);
        this.policySuccess = options.policySuccess ?? BTParallel.Policy.REQUIRE_ALL;
        this.policyFailure = options.policyFailure ?? BTParallel.Policy.REQUIRE_ONE;
        /** @type {Map<number, BTStatus>} */
        this._childStatuses = new Map();
    }

    Enter(owner, blackboard) {
        this._childStatuses.clear();
    }

    Update(dt, owner, blackboard) {
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            let status = this._childStatuses.get(i);

            // Tick children that haven't finished yet
            if (status !== BTStatus.SUCCESS && status !== BTStatus.FAILURE) {
                status = child.Tick(dt, owner, blackboard);
                this._childStatuses.set(i, status);
            }

            if (status === BTStatus.SUCCESS) successCount++;
            if (status === BTStatus.FAILURE) failureCount++;
        }

        // Check failure policy
        if (this.policyFailure === BTParallel.Policy.REQUIRE_ONE && failureCount > 0) {
            this._AbortRunningChildren(owner, blackboard);
            return BTStatus.FAILURE;
        }
        if (this.policyFailure === BTParallel.Policy.REQUIRE_ALL && failureCount === this.children.length) {
            return BTStatus.FAILURE;
        }

        // Check success policy
        if (this.policySuccess === BTParallel.Policy.REQUIRE_ONE && successCount > 0) {
            this._AbortRunningChildren(owner, blackboard);
            return BTStatus.SUCCESS;
        }
        if (this.policySuccess === BTParallel.Policy.REQUIRE_ALL && successCount === this.children.length) {
            return BTStatus.SUCCESS;
        }

        return BTStatus.RUNNING;
    }

    Exit(owner, blackboard, status) {
        this._childStatuses.clear();
    }

    _AbortRunningChildren(owner, blackboard) {
        for (let i = 0; i < this.children.length; i++) {
            if (this._childStatuses.get(i) === BTStatus.RUNNING) {
                this.children[i].Abort(owner, blackboard);
            }
        }
    }
}

// #endregion

// #region BTRandomComposites

/**
 * Random Selector: Shuffles children randomly upon entry, then executes as a Selector.
 * Adds variety and unpredictability to ambient AI or enemy tactics.
 */
class BTRandomSelector extends BTSelector {
    Enter(owner, blackboard) {
        super.Enter(owner, blackboard);
        // Fisher-Yates shuffle
        for (let i = this.children.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = this.children[i];
            this.children[i] = this.children[j];
            this.children[j] = temp;
        }
    }
}

/**
 * Random Sequence: Shuffles children randomly upon entry, then executes as a Sequence.
 */
class BTRandomSequence extends BTSequence {
    Enter(owner, blackboard) {
        super.Enter(owner, blackboard);
        for (let i = this.children.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = this.children[i];
            this.children[i] = this.children[j];
            this.children[j] = temp;
        }
    }
}

// #endregion

// #region BTDecorator

/**
 * Base class for decorator nodes that wrap a single child node to modify its execution or result.
 */
class BTDecorator extends BTNode {
    /**
     * @param {string} [name='Decorator']
     * @param {BTNode} [child=null]
     */
    constructor(name = 'Decorator', child = null) {
        super(name);
        /** @type {BTNode|null} */
        this.child = child;
    }

    /**
     * Set or replace the child node.
     * @param {BTNode} child
     * @returns {BTDecorator} this, for chaining.
     */
    SetChild(child) {
        this.child = child;
        return this;
    }

    Abort(owner, blackboard) {
        if (this.child) {
            this.child.Abort(owner, blackboard);
        }
        super.Abort(owner, blackboard);
    }

    Reset() {
        super.Reset();
        if (this.child) {
            this.child.Reset();
        }
    }
}

/**
 * Inverts the status of its child:
 * - SUCCESS → FAILURE
 * - FAILURE → SUCCESS
 * - RUNNING → RUNNING
 */
class BTInverter extends BTDecorator {
    constructor(name = 'Inverter', child = null) {
        super(name, child);
    }

    Update(dt, owner, blackboard) {
        if (!this.child) return BTStatus.FAILURE;
        const status = this.child.Tick(dt, owner, blackboard);
        if (status === BTStatus.SUCCESS) return BTStatus.FAILURE;
        if (status === BTStatus.FAILURE) return BTStatus.SUCCESS;
        return BTStatus.RUNNING;
    }
}

/**
 * Repeats its child node a fixed number of times or indefinitely.
 */
class BTRepeater extends BTDecorator {
    /**
     * @param {string} [name='Repeater']
     * @param {BTNode} [child=null]
     * @param {number} [count=-1] Repetitions count. -1 means repeat infinitely.
     */
    constructor(name = 'Repeater', child = null, count = -1) {
        super(name, child);
        this.count = count;
        this._currentIteration = 0;
    }

    Enter(owner, blackboard) {
        this._currentIteration = 0;
    }

    Update(dt, owner, blackboard) {
        if (!this.child) return BTStatus.FAILURE;

        while (this.count === -1 || this._currentIteration < this.count) {
            const status = this.child.Tick(dt, owner, blackboard);

            if (status === BTStatus.RUNNING) {
                return BTStatus.RUNNING;
            }

            if (status === BTStatus.FAILURE) {
                return BTStatus.FAILURE;
            }

            // Succeeded: increment count and reset child for next iteration
            this._currentIteration++;
            this.child.Reset();

            if (this.count !== -1 && this._currentIteration >= this.count) {
                return BTStatus.SUCCESS;
            }

            // Yield frame so we don't block the main game loop on infinite repeaters
            return BTStatus.RUNNING;
        }

        return BTStatus.SUCCESS;
    }
}

/**
 * Repeats the child node until it returns FAILURE, then succeeds.
 */
class BTRepeatUntilFail extends BTDecorator {
    constructor(name = 'RepeatUntilFail', child = null) {
        super(name, child);
    }

    Update(dt, owner, blackboard) {
        if (!this.child) return BTStatus.FAILURE;

        const status = this.child.Tick(dt, owner, blackboard);
        if (status === BTStatus.RUNNING) return BTStatus.RUNNING;
        if (status === BTStatus.FAILURE) return BTStatus.SUCCESS;

        // Child succeeded; reset to run again next frame
        this.child.Reset();
        return BTStatus.RUNNING;
    }
}

/**
 * Repeats the child node until it returns SUCCESS, then succeeds.
 */
class BTRepeatUntilSuccess extends BTDecorator {
    constructor(name = 'RepeatUntilSuccess', child = null) {
        super(name, child);
    }

    Update(dt, owner, blackboard) {
        if (!this.child) return BTStatus.FAILURE;

        const status = this.child.Tick(dt, owner, blackboard);
        if (status === BTStatus.RUNNING) return BTStatus.RUNNING;
        if (status === BTStatus.SUCCESS) return BTStatus.SUCCESS;

        // Child failed; reset to retry next frame
        this.child.Reset();
        return BTStatus.RUNNING;
    }
}

/**
 * Always returns SUCCESS when its child completes (regardless of whether child succeeded or failed).
 */
class BTSucceeder extends BTDecorator {
    constructor(name = 'Succeeder', child = null) {
        super(name, child);
    }

    Update(dt, owner, blackboard) {
        if (!this.child) return BTStatus.SUCCESS;
        const status = this.child.Tick(dt, owner, blackboard);
        return status === BTStatus.RUNNING ? BTStatus.RUNNING : BTStatus.SUCCESS;
    }
}

/**
 * Always returns FAILURE when its child completes (regardless of whether child succeeded or failed).
 */
class BTFailer extends BTDecorator {
    constructor(name = 'Failer', child = null) {
        super(name, child);
    }

    Update(dt, owner, blackboard) {
        if (!this.child) return BTStatus.FAILURE;
        const status = this.child.Tick(dt, owner, blackboard);
        return status === BTStatus.RUNNING ? BTStatus.RUNNING : BTStatus.FAILURE;
    }
}

/**
 * Enforces a cooldown period between executions.
 * Once the child completes (with SUCCESS or FAILURE), the cooldown starts.
 * Any tick during cooldown immediately returns FAILURE without running the child.
 */
class BTCooldown extends BTDecorator {
    /**
     * @param {string} [name='Cooldown']
     * @param {BTNode} [child=null]
     * @param {number} [cooldownDuration=1.0] Duration in seconds.
     */
    constructor(name = 'Cooldown', child = null, cooldownDuration = 1.0) {
        super(name, child);
        this.cooldownDuration = cooldownDuration;
        this._timeRemaining = 0;
    }

    /** Returns true if this node is currently cooling down. */
    get isCoolingDown() {
        return this._timeRemaining > 0;
    }

    Update(dt, owner, blackboard) {
        // Decrease timer if cooling down
        if (this._timeRemaining > 0) {
            this._timeRemaining -= dt;
            if (this._timeRemaining > 0) {
                return BTStatus.FAILURE;
            }
            // Cooldown has just expired on this frame; proceed to execute child
            this._timeRemaining = 0;
        }

        if (!this.child) return BTStatus.FAILURE;

        const status = this.child.Tick(dt, owner, blackboard);

        if (status !== BTStatus.RUNNING) {
            this._timeRemaining = this.cooldownDuration;
        }

        return status;
    }

    Reset() {
        super.Reset();
        this._timeRemaining = 0;
    }
}

/**
 * Delays ticking the child node for a specified duration in seconds.
 * Returns RUNNING while waiting, then executes the child.
 */
class BTDelay extends BTDecorator {
    /**
     * @param {string} [name='Delay']
     * @param {BTNode} [child=null]
     * @param {number} [delayDuration=1.0] Delay in seconds.
     */
    constructor(name = 'Delay', child = null, delayDuration = 1.0) {
        super(name, child);
        this.delayDuration = delayDuration;
        this._elapsed = 0;
    }

    Enter(owner, blackboard) {
        this._elapsed = 0;
    }

    Update(dt, owner, blackboard) {
        if (this._elapsed < this.delayDuration) {
            this._elapsed += dt;
            return BTStatus.RUNNING;
        }

        if (!this.child) return BTStatus.SUCCESS;
        return this.child.Tick(dt, owner, blackboard);
    }

    Reset() {
        super.Reset();
        this._elapsed = 0;
    }
}

// #endregion

// #region Leaf Nodes (Action, Condition, Wait)

/**
 * Action leaf node.
 * Executes a game action callback or custom subclass logic.
 *
 * @example
 * // Inline lambda:
 * new BTAction('MoveTo', (dt, owner, bb) => {
 *     owner.x += 10 * dt;
 *     return owner.x >= 100 ? BTStatus.SUCCESS : BTStatus.RUNNING;
 * });
 *
 * // Or subclassing:
 * class AttackAction extends BTAction {
 *     Enter(owner) { owner.playSlash(); }
 *     Update(dt, owner) { return owner.slashDone ? BTStatus.SUCCESS : BTStatus.RUNNING; }
 * }
 */
class BTAction extends BTNode {
    /**
     * @param {string} [name='Action']
     * @param {function(dt: number, owner: *, bb: BTBlackboard): (BTStatus|void)} [actionFn=null]
     */
    constructor(name = 'Action', actionFn = null) {
        super(name);
        this.actionFn = actionFn;
    }

    Update(dt, owner, blackboard) {
        if (this.actionFn) {
            const result = this.actionFn(dt, owner, blackboard);
            return result !== undefined ? result : BTStatus.SUCCESS;
        }
        return BTStatus.SUCCESS;
    }
}

/**
 * Condition leaf node.
 * Evaluates a boolean predicate.
 * - Returns SUCCESS if predicate is truthy.
 * - Returns FAILURE if predicate is falsy.
 * Never returns RUNNING.
 *
 * @example
 * new BTCondition('IsTargetInSight', (owner, bb) => {
 *     const target = bb.Get('target');
 *     return target && Vector2.Distance(owner.position, target.position) < 150;
 * });
 */
class BTCondition extends BTNode {
    /**
     * @param {string} [name='Condition']
     * @param {function(owner: *, bb: BTBlackboard): boolean} predicate
     */
    constructor(name = 'Condition', predicate = null) {
        super(name);
        this.predicate = predicate;
    }

    Update(dt, owner, blackboard) {
        if (this.predicate) {
            return this.predicate(owner, blackboard) ? BTStatus.SUCCESS : BTStatus.FAILURE;
        }
        return BTStatus.SUCCESS;
    }
}

/**
 * Built-in wait action.
 * Returns RUNNING until `duration` seconds have passed, then returns SUCCESS.
 *
 * @example
 * new BTWait('RestAtCamp', 3.0);
 */
class BTWait extends BTNode {
    /**
     * @param {string} [name='Wait']
     * @param {number} [duration=1.0] Wait duration in seconds.
     */
    constructor(name = 'Wait', duration = 1.0) {
        super(name);
        this.duration = duration;
        this._elapsed = 0;
    }

    Enter(owner, blackboard) {
        this._elapsed = 0;
    }

    Update(dt, owner, blackboard) {
        this._elapsed += dt;
        if (this._elapsed >= this.duration) {
            return BTStatus.SUCCESS;
        }
        return BTStatus.RUNNING;
    }

    Reset() {
        super.Reset();
        this._elapsed = 0;
    }
}

// #endregion

// #region BehaviorTree (Controller / Runner)

/**
 * BehaviorTree manages execution of a tree structure.
 * Ticked every frame from the owner's Update(dt).
 *
 * Provides real-time execution tracking, overhead debug visualization,
 * and an interactive visual tree hierarchy inspector.
 *
 * @example
 * this.bt = new BehaviorTree(this,
 *     new BTSelector('Root', [
 *         new BTSequence('Combat', [
 *             new BTCondition('HasTarget', o => !!o.target),
 *             new BTAction('Attack', (dt, o) => o.Attack(dt))
 *         ]),
 *         new BTAction('Patrol', (dt, o) => o.Patrol(dt))
 *     ])
 * );
 *
 * // In Game / GameObject Update:
 * this.bt.Update(dt);
 *
 * // In Game / GameObject Draw:
 * this.bt.DrawDebug(renderer, this.position.x, this.position.y - 24);
 */
class BehaviorTree {
    /**
     * @param {*} owner The entity/object that owns this tree.
     * @param {BTNode} rootNode The top-level root node of the tree.
     * @param {BTBlackboard} [blackboard=new BTBlackboard()]
     */
    constructor(owner, rootNode, blackboard = new BTBlackboard()) {
        /** @type {*} */
        this.owner = owner;
        /** @type {BTNode} */
        this.root = rootNode;
        /** @type {BTBlackboard} */
        this.blackboard = blackboard;
        /** @type {BTStatus|null} Status of the tree on the most recent tick. */
        this.lastStatus = null;
        /** @type {boolean} True if the tree is currently running. */
        this._active = true;
        /** @type {BTNode|null} The most recently active leaf node. */
        this.activeLeafNode = null;
    }

    /** Returns true if tree is active. */
    get active() { return this._active; }
    set active(val) { this._active = val; }

    /**
     * Tick the behavior tree. Call this every frame from the owner's Update(dt).
     * @param {number} dt Delta time in seconds.
     * @returns {BTStatus|null}
     */
    Update(dt) {
        if (!this._active || !this.root) return null;

        this.lastStatus = this.root.Tick(dt, this.owner, this.blackboard);
        this.activeLeafNode = this._FindActiveLeaf(this.root);
        return this.lastStatus;
    }

    /**
     * Abort the active execution of the tree.
     */
    Abort() {
        if (this.root) {
            this.root.Abort(this.owner, this.blackboard);
        }
        this.activeLeafNode = null;
    }

    /**
     * Recursively reset the entire tree state.
     */
    Reset() {
        if (this.root) {
            this.root.Reset();
        }
        this.lastStatus = null;
        this.activeLeafNode = null;
    }

    /**
     * Draw overhead debug text near an entity world position.
     * Only renders when the global `debugMode` variable is true (or if options.force is true).
     *
     * @param {Renderer} renderer
     * @param {number} x World X coordinate.
     * @param {number} y World Y coordinate.
     * @param {{showStatus?: boolean, color?: Color, force?: boolean}} [options={}]
     */
    DrawDebug(renderer, x, y, options = {}) {
        if ((!debugMode && !options.force) || !renderer) return;

        const leaf = this.activeLeafNode;
        const text = leaf ? `[${leaf.name}] ${leaf.status ?? ''}` : `[BT: ${this.lastStatus ?? 'IDLE'}]`;
        const color = options.color ?? this._GetStatusColor(leaf?.status ?? this.lastStatus);

        renderer.DrawFillText(text, x, y, '11px monospace', color, 'center');
    }

    /**
     * Draw an interactive on-screen visual hierarchy tree inspector.
     * Perfect for university demos, learning, and debugging complex behavior trees.
     *
     * @param {Renderer} renderer
     * @param {number} startX Screen X coordinate (e.g. 15).
     * @param {number} startY Screen Y coordinate (e.g. 40).
     * @param {{width?: number, title?: string, force?: boolean}} [options={}]
     */
    DrawTreeInspector(renderer, startX = 15, startY = 40, options = {}) {
        if ((!debugMode && !options.force) || !renderer || !this.root) return;

        const lines = [];
        this._CollectTreeLines(this.root, '', true, lines);

        const lineHeight = 16;
        const boxWidth = options.width ?? 320;
        const boxHeight = (lines.length + 2) * lineHeight + 8;

        // Background card
        renderer.DrawFillBasicRectangle(startX - 6, startY - 6, boxWidth, boxHeight, new Color(0.05, 0.07, 0.1, 0.88));
        renderer.DrawStrokeBasicRectangle(startX - 6, startY - 6, boxWidth, boxHeight, new Color(0.2, 0.3, 0.45, 0.8), 1);

        // Title
        const title = options.title ?? `Behavior Tree [${this.lastStatus ?? 'IDLE'}]`;
        renderer.DrawFillText(title, startX, startY + 10, 'bold 12px monospace', Color.cyan, 'left', 'middle');

        // Draw lines
        for (let i = 0; i < lines.length; i++) {
            const item = lines[i];
            const lineY = startY + 28 + (i * lineHeight);

            // Indentation & tree branch graphic
            renderer.DrawFillText(item.prefix, startX, lineY, '11px monospace', Color.grey, 'left', 'middle');

            // Node name and status badge
            const textX = startX + (item.prefix.length * 6.6);
            renderer.DrawFillText(item.text, textX, lineY, '11px monospace', item.color, 'left', 'middle');
        }
    }

    // ── Internal Helpers ────────────────────────────────────────────────────────

    /**
     * Finds the currently executing leaf node in the active branch.
     * @param {BTNode} node
     * @returns {BTNode|null}
     * @private
     */
    _FindActiveLeaf(node) {
        if (!node) return null;

        if (node instanceof BTComposite) {
            const idx = node._runningChildIndex;
            if (idx >= 0 && idx < node.children.length) {
                return this._FindActiveLeaf(node.children[idx]);
            }
            // If composite just returned success/failure, check last ticked child
            for (let i = node.children.length - 1; i >= 0; i--) {
                if (node.children[i].status !== null) {
                    return this._FindActiveLeaf(node.children[i]);
                }
            }
        }
        else if (node instanceof BTDecorator) {
            if (node.child) {
                return this._FindActiveLeaf(node.child);
            }
        }

        return node;
    }

    /**
     * Collects formatted text lines representing the tree hierarchy.
     * @param {BTNode} node
     * @param {string} prefix
     * @param {boolean} isTail
     * @param {Array<{prefix: string, text: string, color: Color}>} outLines
     * @private
     */
    _CollectTreeLines(node, prefix, isTail, outLines) {
        if (!node) return;

        const branchSymbol = isTail ? '└── ' : '├── ';
        const statusBadge = this._GetStatusBadge(node.status);
        const nodeType = node.constructor.name.replace(/^BT/, '');
        const text = `${node.name} (${nodeType}) ${statusBadge}`;
        const color = this._GetStatusColor(node.status);

        outLines.push({
            prefix: prefix + branchSymbol,
            text: text,
            color: color
        });

        const newPrefix = prefix + (isTail ? '    ' : '│   ');

        if (node instanceof BTComposite) {
            for (let i = 0; i < node.children.length; i++) {
                const childTail = (i === node.children.length - 1);
                this._CollectTreeLines(node.children[i], newPrefix, childTail, outLines);
            }
        }
        else if (node instanceof BTDecorator && node.child) {
            this._CollectTreeLines(node.child, newPrefix, true, outLines);
        }
    }

    /**
     * Returns a colored icon/badge for a node status.
     * @param {BTStatus|null} status
     * @returns {string}
     * @private
     */
    _GetStatusBadge(status) {
        switch (status) {
            case BTStatus.SUCCESS: return '✔';
            case BTStatus.FAILURE: return '✖';
            case BTStatus.RUNNING: return '⏳';
            default: return '○';
        }
    }

    /**
     * Returns a Color for a node status.
     * @param {BTStatus|null} status
     * @returns {Color}
     * @private
     */
    _GetStatusColor(status) {
        switch (status) {
            case BTStatus.SUCCESS: return Color.lime ?? Color.green;
            case BTStatus.FAILURE: return Color.red;
            case BTStatus.RUNNING: return Color.yellow;
            default: return Color.lightGrey ?? Color.white;
        }
    }
}

// #endregion
