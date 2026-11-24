// Deterministic, headless Pac-Man simulation core modeled after the classic Java
// Ms. Pac-Man vs. Ghosts framework (Rohlfshagen & Lucas).
// Zero DOM / Renderer dependency: runs identically in spark.js and headless Node.js.

class SeededRNG {
    /**
     * Mulberry32 deterministic PRNG with O(1) state cloning.
     * @param {number} [seed=1]
     */
    constructor(seed = 1) {
        this.state = (seed >>> 0) || 1;
    }

    /**
     * Returns a deterministic float in [0, 1).
     * @returns {number}
     */
    next() {
        let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns a deterministic integer in [0, max).
     * @param {number} max
     * @returns {number}
     */
    nextInt(max) {
        return Math.floor(this.next() * max);
    }

    /**
     * Returns an exact clone that will generate the same future sequence.
     * @returns {SeededRNG}
     */
    copy() {
        const clone = new SeededRNG(1);
        clone.state = this.state;
        return clone;
    }
}

class PacManState {
    /**
     * @param {MazeGraph | MazeGraph[]} mazeOrMazes - One MazeGraph or an array of MazeGraphs cycled per level.
     * @param {number} [seed=Date.now()] - PRNG seed for deterministic simulation.
     * @param {Object} [options={}] - Optional overrides for PacMonConstants fields.
     */
    constructor(mazeOrMazes, seed = Date.now(), options = {}) {
        // Internal fast-path for copy()
        if (mazeOrMazes === null) return;

        this.mazes = Array.isArray(mazeOrMazes) ? mazeOrMazes : [mazeOrMazes];
        this.constants = Object.assign({}, PacMonConstants, options);
        this.initialSeed = seed;
        this.rng = new SeededRNG(seed);

        this.level = 0;
        this.maze = this.mazes[0];

        this.score = 0;
        this.lives = this.constants.NUM_LIVES;
        this.totalTime = 0;
        this.currentLevelTime = 0;
        this.extraLifeAwarded = false;
        this.gameOver = false;

        // Pac-Man state
        this.pacmanNode = this.maze.pacManInitialNode;
        this.pacmanLastDir = this.constants.DIRECTIONS.LEFT;

        // Ghost state (fixed 4 ghosts: BLINKY=0, PINKY=1, INKY=2, CLYDE=3)
        const nGhosts = this.constants.GHOST_COUNT;
        this.ghostNodes = new Int32Array(nGhosts);
        this.ghostLastDirs = new Int8Array(nGhosts);
        this.ghostEdibleTimes = new Int16Array(nGhosts);
        this.ghostLairTimes = new Int16Array(nGhosts);
        this.ghostEatMultiplier = 1;

        // Pill state (1 = active, 0 = eaten)
        this.activePills = new Uint8Array(this.maze.numPills);
        this.activePillsCount = 0;
        this.activePowerPills = new Uint8Array(this.maze.numPowerPills);
        this.activePowerPillsCount = 0;

        // Per-tick event flags (useful for rendering, audio, and RL/IL rewards)
        this.pacmanWasEaten = false;
        this.pillWasEaten = false;
        this.powerPillWasEaten = false;
        this.ghostsEaten = new Uint8Array(nGhosts);
        this.levelCompleted = false;
        this.globalReversalOccurred = false;
        this.lastScoreDelta = 0;

        this._resetPills();
        this._resetEntities(true);
    }

    // #region Copy & Reset

    /**
     * Creates a deep copy of all mutable simulation state while sharing immutable MazeGraphs.
     * Safe for tree search, MCTS, and rollouts.
     * @returns {PacManState}
     */
    copy() {
        const clone = new PacManState(null);
        clone.mazes = this.mazes;
        clone.constants = this.constants;
        clone.initialSeed = this.initialSeed;
        clone.rng = this.rng.copy();

        clone.level = this.level;
        clone.maze = this.maze;

        clone.score = this.score;
        clone.lives = this.lives;
        clone.totalTime = this.totalTime;
        clone.currentLevelTime = this.currentLevelTime;
        clone.extraLifeAwarded = this.extraLifeAwarded;
        clone.gameOver = this.gameOver;

        clone.pacmanNode = this.pacmanNode;
        clone.pacmanLastDir = this.pacmanLastDir;

        clone.ghostNodes = new Int32Array(this.ghostNodes);
        clone.ghostLastDirs = new Int8Array(this.ghostLastDirs);
        clone.ghostEdibleTimes = new Int16Array(this.ghostEdibleTimes);
        clone.ghostLairTimes = new Int16Array(this.ghostLairTimes);
        clone.ghostEatMultiplier = this.ghostEatMultiplier;

        clone.activePills = new Uint8Array(this.activePills);
        clone.activePillsCount = this.activePillsCount;
        clone.activePowerPills = new Uint8Array(this.activePowerPills);
        clone.activePowerPillsCount = this.activePowerPillsCount;

        clone.pacmanWasEaten = this.pacmanWasEaten;
        clone.pillWasEaten = this.pillWasEaten;
        clone.powerPillWasEaten = this.powerPillWasEaten;
        clone.ghostsEaten = new Uint8Array(this.ghostsEaten);
        clone.levelCompleted = this.levelCompleted;
        clone.globalReversalOccurred = this.globalReversalOccurred;
        clone.lastScoreDelta = this.lastScoreDelta;

        return clone;
    }

    _resetPills() {
        this.activePills = new Uint8Array(this.maze.numPills);
        this.activePills.fill(1);
        this.activePillsCount = this.maze.numPills;

        this.activePowerPills = new Uint8Array(this.maze.numPowerPills);
        this.activePowerPills.fill(1);
        this.activePowerPillsCount = this.maze.numPowerPills;
    }

    _resetEntities(isNewLevel) {
        const c = this.constants;
        this.pacmanNode = this.maze.pacManInitialNode;
        this.pacmanLastDir = c.DIRECTIONS.LEFT;
        this.ghostEatMultiplier = 1;

        const lairScale = Math.pow(c.LAIR_REDUCTION, this.level);
        for (let g = 0; g < c.GHOST_COUNT; g++) {
            const baseLair = c.GHOST_INITIAL_LAIR_TIMES[g] ?? (c.COMMON_LAIR_TIME * (g + 1));
            const lairTime = Math.floor(baseLair * lairScale);
            this.ghostLairTimes[g] = lairTime;
            this.ghostEdibleTimes[g] = 0;
            this.ghostLastDirs[g] = c.DIRECTIONS.NEUTRAL;
            this.ghostNodes[g] = lairTime > 0 ? this.maze.lairNode : this.maze.ghostsInitialNode;
        }

        if (isNewLevel) {
            this.currentLevelTime = 0;
        }
    }

    _newLevel() {
        this.level++;
        this.maze = this.mazes[this.level % this.mazes.length];
        this._resetPills();
        this._resetEntities(true);
    }

    // #endregion

    // #region Core Tick Simulation

    /**
     * Advances the simulation by exactly one discrete tick.
     * Matches the classic Java Ms. Pac-Man vs. Ghosts tick order:
     * Pac-Man move -> eat pill -> eat power pill -> ghosts move -> feast -> progression.
     *
     * @param {number} pacManDir - Desired Pac-Man direction (0=UP, 1=RIGHT, 2=DOWN, 3=LEFT, 4=NEUTRAL).
     * @param {number[]|Int8Array|null} [ghostDirs=null] - Array of 4 desired ghost directions.
     */
    advanceGame(pacManDir, ghostDirs = null) {
        this._clearTickEvents();
        if (this.gameOver) return;

        const scoreBefore = this.score;

        this._updatePacMan(pacManDir);
        this._eatPill();
        this._eatPowerPill();
        this._updateGhosts(ghostDirs);
        this._feast();
        this._checkProgression();

        this.lastScoreDelta = this.score - scoreBefore;
    }

    _clearTickEvents() {
        this.pacmanWasEaten = false;
        this.pillWasEaten = false;
        this.powerPillWasEaten = false;
        this.ghostsEaten.fill(0);
        this.levelCompleted = false;
        this.globalReversalOccurred = false;
        this.lastScoreDelta = 0;
    }

    _updatePacMan(pacManDir) {
        const NEUTRAL = this.constants.DIRECTIONS.NEUTRAL;
        let nextNode = -1;

        // Try requested direction first
        if (pacManDir !== undefined && pacManDir !== null && pacManDir !== NEUTRAL) {
            nextNode = this.maze.getNeighbor(this.pacmanNode, pacManDir);
            if (nextNode !== -1) {
                this.pacmanNode = nextNode;
                this.pacmanLastDir = pacManDir;
                return;
            }
        }

        // Otherwise continue in last direction if possible
        if (this.pacmanLastDir !== NEUTRAL) {
            nextNode = this.maze.getNeighbor(this.pacmanNode, this.pacmanLastDir);
            if (nextNode !== -1) {
                this.pacmanNode = nextNode;
            }
        }
    }

    _eatPill() {
        const node = this.maze.nodes[this.pacmanNode];
        const pillIdx = node.pillIndex;
        if (pillIdx !== -1 && this.activePills[pillIdx] === 1) {
            this.activePills[pillIdx] = 0;
            this.activePillsCount--;
            this.score += this.constants.PILL;
            this.pillWasEaten = true;
        }
    }

    _eatPowerPill() {
        const node = this.maze.nodes[this.pacmanNode];
        const ppIdx = node.powerPillIndex;
        if (ppIdx !== -1 && this.activePowerPills[ppIdx] === 1) {
            this.activePowerPills[ppIdx] = 0;
            this.activePowerPillsCount--;
            this.score += this.constants.POWER_PILL;
            this.powerPillWasEaten = true;

            const c = this.constants;
            const edibleDuration = Math.floor(c.EDIBLE_TIME * Math.pow(c.EDIBLE_TIME_REDUCTION, this.level));
            this.ghostEatMultiplier = 1;

            for (let g = 0; g < c.GHOST_COUNT; g++) {
                if (this.ghostLairTimes[g] === 0) {
                    this.ghostEdibleTimes[g] = edibleDuration;
                    this.ghostLastDirs[g] = MazeGraph.getOppositeMove(this.ghostLastDirs[g]);
                }
            }
        }
    }

    _updateGhosts(ghostDirs) {
        const c = this.constants;
        const NEUTRAL = c.DIRECTIONS.NEUTRAL;

        // Global random reversal event (classic Java Ms. Pac-Man vs. Ghosts mechanic)
        const triggerGlobalReversal = !this.powerPillWasEaten && this.rng.next() < c.GHOST_REVERSAL;
        if (triggerGlobalReversal) {
            this.globalReversalOccurred = true;
        }

        for (let g = 0; g < c.GHOST_COUNT; g++) {
            // Ghost still in lair
            if (this.ghostLairTimes[g] > 0) {
                this.ghostLairTimes[g]--;
                if (this.ghostLairTimes[g] === 0) {
                    this.ghostNodes[g] = this.maze.ghostsInitialNode;
                    this.ghostLastDirs[g] = NEUTRAL;
                }
                continue;
            }

            // Apply global reversal to active ghosts
            if (triggerGlobalReversal) {
                this.ghostLastDirs[g] = MazeGraph.getOppositeMove(this.ghostLastDirs[g]);
            }

            // Handle edible timer & half-speed movement
            const isEdible = this.ghostEdibleTimes[g] > 0;
            if (isEdible) {
                this.ghostEdibleTimes[g]--;
                if (this.totalTime % c.GHOST_SPEED_REDUCTION !== 0) {
                    continue;
                }
            }

            // Choose legal non-reversing move
            const possibleMoves = this.maze.getPossibleMoves(this.ghostNodes[g], this.ghostLastDirs[g]);
            if (possibleMoves.length === 0) continue;

            let chosenDir = (ghostDirs && ghostDirs[g] !== undefined && ghostDirs[g] !== null)
                ? ghostDirs[g]
                : NEUTRAL;

            // Validate chosenDir against legal moves; fall back to continuing straight or first legal move
            if (possibleMoves.indexOf(chosenDir) === -1) {
                if (possibleMoves.indexOf(this.ghostLastDirs[g]) !== -1) {
                    chosenDir = this.ghostLastDirs[g];
                } else {
                    chosenDir = possibleMoves[0];
                }
            }

            const nextNode = this.maze.getNeighbor(this.ghostNodes[g], chosenDir);
            if (nextNode !== -1) {
                this.ghostNodes[g] = nextNode;
                this.ghostLastDirs[g] = chosenDir;
            }
        }
    }

    _feast() {
        const c = this.constants;
        const respawnLairTime = Math.floor(c.COMMON_LAIR_TIME * Math.pow(c.LAIR_REDUCTION, this.level));

        for (let g = 0; g < c.GHOST_COUNT; g++) {
            if (this.ghostLairTimes[g] > 0) continue;

            const dist = this.maze.getShortestPathDistance(this.pacmanNode, this.ghostNodes[g]);
            if (dist >= 0 && dist <= c.EAT_DISTANCE) {
                if (this.ghostEdibleTimes[g] > 0) {
                    // Pac-Man eats ghost
                    this.score += c.GHOST_EAT_SCORE * this.ghostEatMultiplier;
                    this.ghostEatMultiplier *= 2;
                    this.ghostEdibleTimes[g] = 0;
                    this.ghostLairTimes[g] = respawnLairTime;
                    this.ghostNodes[g] = this.maze.lairNode;
                    this.ghostLastDirs[g] = c.DIRECTIONS.NEUTRAL;
                    this.ghostsEaten[g] = 1;
                } else {
                    // Ghost eats Pac-Man
                    this.pacmanWasEaten = true;
                }
            }
        }
    }

    _checkProgression() {
        const c = this.constants;

        // Extra life check
        if (!this.extraLifeAwarded && this.score >= c.EXTRA_LIFE_SCORE) {
            this.lives++;
            this.extraLifeAwarded = true;
        }

        this.totalTime++;
        this.currentLevelTime++;

        if (this.pacmanWasEaten) {
            this.lives--;
            if (this.lives <= 0) {
                this.gameOver = true;
            } else {
                this._resetEntities(false);
            }
            return;
        }

        // Level complete (all pills & power pills eaten, or level time limit reached)
        if ((this.activePillsCount === 0 && this.activePowerPillsCount === 0) ||
            this.currentLevelTime >= c.LEVEL_LIMIT) {
            this.levelCompleted = true;
            this._newLevel();
            return;
        }

        if (this.totalTime >= c.MAX_TIME) {
            this.gameOver = true;
        }
    }

    // #endregion

    // #region Java-Style Query API

    getScore() { return this.score; }
    getCurrentLevel() { return this.level; }
    getCurrentLevelTime() { return this.currentLevelTime; }
    getTotalTime() { return this.totalTime; }
    getPacmanNumberOfLivesRemaining() { return this.lives; }
    isGameOver() { return this.gameOver; }

    getPacmanCurrentNodeIndex() { return this.pacmanNode; }
    getPacmanLastMoveMade() { return this.pacmanLastDir; }

    getGhostCurrentNodeIndex(ghostIndex) { return this.ghostNodes[ghostIndex]; }
    getGhostLastMoveMade(ghostIndex) { return this.ghostLastDirs[ghostIndex]; }
    getGhostEdibleTime(ghostIndex) { return this.ghostEdibleTimes[ghostIndex]; }
    getGhostLairTime(ghostIndex) { return this.ghostLairTimes[ghostIndex]; }
    isGhostEdible(ghostIndex) { return this.ghostEdibleTimes[ghostIndex] > 0; }

    /**
     * True if the ghost is out of the lair, able to move on this tick, and at a junction.
     * Matches Java `Game.doesGhostRequireAction(GHOST)`.
     * @param {number} ghostIndex
     * @returns {boolean}
     */
    doesGhostRequireAction(ghostIndex) {
        if (this.ghostLairTimes[ghostIndex] > 0) return false;
        if (this.ghostEdibleTimes[ghostIndex] > 0 &&
            this.totalTime % this.constants.GHOST_SPEED_REDUCTION !== 0) {
            return false;
        }
        return this.maze.isJunction(this.ghostNodes[ghostIndex]);
    }

    isPillStillAvailable(pillIndex) {
        return this.activePills[pillIndex] === 1;
    }

    isPowerPillStillAvailable(powerPillIndex) {
        return this.activePowerPills[powerPillIndex] === 1;
    }

    /** @returns {number[]} Node IDs of all remaining regular pills. */
    getActivePillsIndices() {
        const result = [];
        const nodes = this.maze.pillNodeIndices;
        for (let i = 0; i < nodes.length; i++) {
            if (this.activePills[i] === 1) result.push(nodes[i]);
        }
        return result;
    }

    /** @returns {number[]} Node IDs of all remaining power pills. */
    getActivePowerPillsIndices() {
        const result = [];
        const nodes = this.maze.powerPillNodeIndices;
        for (let i = 0; i < nodes.length; i++) {
            if (this.activePowerPills[i] === 1) result.push(nodes[i]);
        }
        return result;
    }

    getNumberOfActivePills() { return this.activePillsCount; }
    getNumberOfActivePowerPills() { return this.activePowerPillsCount; }

    getPossibleMoves(nodeIndex, lastDir = 4) {
        return this.maze.getPossibleMoves(nodeIndex, lastDir);
    }

    getShortestPathDistance(fromId, toId) {
        return this.maze.getShortestPathDistance(fromId, toId);
    }

    getDistance(fromId, toId, dm = 0) {
        return this.maze.getDistance(fromId, toId, dm);
    }

    getNextMoveTowardsTarget(fromId, toId, lastDir = 4, dm = 0) {
        return this.maze.getNextMoveTowardsTarget(fromId, toId, lastDir, dm);
    }

    getNextMoveAwayFromTarget(fromId, toId, lastDir = 4, dm = 0) {
        return this.maze.getNextMoveAwayFromTarget(fromId, toId, lastDir, dm);
    }

    wasPacManEaten() { return this.pacmanWasEaten; }
    wasPillEaten() { return this.pillWasEaten; }
    wasPowerPillEaten() { return this.powerPillWasEaten; }
    wasGhostEaten(ghostIndex) { return this.ghostsEaten[ghostIndex] === 1; }

    // #endregion
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { SeededRNG, PacManState };
}
