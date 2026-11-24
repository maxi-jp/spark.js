// Pluggable Pac-Man and Ghost controllers modeled after the classic Java
// Ms. Pac-Man vs. Ghosts benchmark (pacman.controllers.examples.*).
// Pure JS (except HumanPacManController.PollInput which reads spark.js Input).

// #region Pac-Man Controllers

class HumanPacManController {
    constructor() {
        this.name = "Human";
        this.bufferedDirection = PacMonConstants.DIRECTIONS.NEUTRAL;
    }

    Reset() {
        this.bufferedDirection = PacMonConstants.DIRECTIONS.NEUTRAL;
    }

    PollInput() {
        const D = PacMonConstants.DIRECTIONS;
        if (Input.IsKeyPressed(KEY_UP) || Input.IsKeyPressed(KEY_W)) {
            this.bufferedDirection = D.UP;
        } else if (Input.IsKeyPressed(KEY_DOWN) || Input.IsKeyPressed(KEY_S)) {
            this.bufferedDirection = D.DOWN;
        } else if (Input.IsKeyPressed(KEY_LEFT) || Input.IsKeyPressed(KEY_A)) {
            this.bufferedDirection = D.LEFT;
        } else if (Input.IsKeyPressed(KEY_RIGHT) || Input.IsKeyPressed(KEY_D)) {
            this.bufferedDirection = D.RIGHT;
        }
    }

    /** @param {PacManState} state */
    getMove(state) {
        return this.bufferedDirection;
    }
}

/**
 * Classic Java StarterPacMan controller:
 * 1. If any non-edible ghost is within `minDistance` (default 20), flee from the closest one.
 * 2. Otherwise, if any ghost is edible, chase the closest edible ghost.
 * 3. Otherwise, move toward the closest active pill or power pill.
 */
class StarterPacManController {
    constructor(minDistance = 20) {
        this.name = "StarterPacMan";
        this.minDistance = minDistance;
    }

    Reset() {}
    PollInput() {}

    /** @param {PacManState} state */
    getMove(state) {
        const D = PacMonConstants.DIRECTIONS;
        const DM = PacMonConstants.DM;
        const currentNode = state.getPacmanCurrentNodeIndex();

        // Strategy 1: If any non-edible ghost is too close, run away from the closest one
        let closestThreatNode = -1;
        let minThreatDist = this.minDistance;

        for (let g = 0; g < PacMonConstants.GHOST_COUNT; g++) {
            if (state.getGhostEdibleTime(g) === 0 && state.getGhostLairTime(g) === 0) {
                const ghostNode = state.getGhostCurrentNodeIndex(g);
                const dist = state.getShortestPathDistance(currentNode, ghostNode);
                if (dist >= 0 && dist < minThreatDist) {
                    minThreatDist = dist;
                    closestThreatNode = ghostNode;
                }
            }
        }

        if (closestThreatNode !== -1) {
            return state.getNextMoveAwayFromTarget(currentNode, closestThreatNode, D.NEUTRAL, DM.PATH);
        }

        // Strategy 2: Find the nearest edible ghost and go after it
        let closestEdibleNode = -1;
        let minEdibleDist = Infinity;

        for (let g = 0; g < PacMonConstants.GHOST_COUNT; g++) {
            if (state.getGhostEdibleTime(g) > 0 && state.getGhostLairTime(g) === 0) {
                const ghostNode = state.getGhostCurrentNodeIndex(g);
                const dist = state.getShortestPathDistance(currentNode, ghostNode);
                if (dist >= 0 && dist < minEdibleDist) {
                    minEdibleDist = dist;
                    closestEdibleNode = ghostNode;
                }
            }
        }

        if (closestEdibleNode !== -1) {
            return state.getNextMoveTowardsTarget(currentNode, closestEdibleNode, D.NEUTRAL, DM.PATH);
        }

        // Strategy 3: Go after the closest active pill or power pill
        let closestTargetNode = -1;
        let minTargetDist = Infinity;

        const pills = state.maze.pillNodeIndices;
        for (let i = 0; i < pills.length; i++) {
            if (state.isPillStillAvailable(i)) {
                const dist = state.getShortestPathDistance(currentNode, pills[i]);
                if (dist >= 0 && dist < minTargetDist) {
                    minTargetDist = dist;
                    closestTargetNode = pills[i];
                }
            }
        }

        const powerPills = state.maze.powerPillNodeIndices;
        for (let i = 0; i < powerPills.length; i++) {
            if (state.isPowerPillStillAvailable(i)) {
                const dist = state.getShortestPathDistance(currentNode, powerPills[i]);
                if (dist >= 0 && dist < minTargetDist) {
                    minTargetDist = dist;
                    closestTargetNode = powerPills[i];
                }
            }
        }

        if (closestTargetNode !== -1) {
            return state.getNextMoveTowardsTarget(currentNode, closestTargetNode, D.NEUTRAL, DM.PATH);
        }

        return D.NEUTRAL;
    }
}

// #endregion

// #region Ghost Controllers

/**
 * Classic Java StarterGhosts controller:
 * - Flees from Pac-Man when edible (or when Pac-Man is close to an active power pill).
 * - Otherwise chases Pac-Man with probability `consistency` (0.8), or picks a random legal move.
 * Uses `state.rng` for deterministic execution.
 */
class StarterGhostsController {
    constructor(consistency = 0.8, pillProximity = 15) {
        this.name = "StarterGhosts";
        this.consistency = consistency;
        this.pillProximity = pillProximity;
        const N = PacMonConstants.DIRECTIONS.NEUTRAL;
        this._moves = [N, N, N, N];
    }

    /** @param {PacManState} state */
    getMove(state) {
        const D = PacMonConstants.DIRECTIONS;
        const DM = PacMonConstants.DM;
        const pacNode = state.getPacmanCurrentNodeIndex();
        const closeToPower = this._isPacManCloseToPowerPill(state, pacNode);

        for (let g = 0; g < PacMonConstants.GHOST_COUNT; g++) {
            if (!state.doesGhostRequireAction(g)) {
                this._moves[g] = D.NEUTRAL;
                continue;
            }

            const ghostNode = state.getGhostCurrentNodeIndex(g);
            const lastDir = state.getGhostLastMoveMade(g);

            if (state.isGhostEdible(g) || closeToPower) {
                this._moves[g] = state.getNextMoveAwayFromTarget(ghostNode, pacNode, lastDir, DM.PATH);
            } else if (state.rng.next() < this.consistency) {
                this._moves[g] = state.getNextMoveTowardsTarget(ghostNode, pacNode, lastDir, DM.PATH);
            } else {
                const possible = state.getPossibleMoves(ghostNode, lastDir);
                this._moves[g] = possible.length > 0
                    ? possible[state.rng.nextInt(possible.length)]
                    : D.NEUTRAL;
            }
        }

        return this._moves;
    }

    _isPacManCloseToPowerPill(state, pacNode) {
        const powerNodes = state.maze.powerPillNodeIndices;
        for (let i = 0; i < powerNodes.length; i++) {
            if (state.isPowerPillStillAvailable(i)) {
                if (state.getShortestPathDistance(pacNode, powerNodes[i]) < this.pillProximity) {
                    return true;
                }
            }
        }
        return false;
    }
}

/**
 * Classic Java Legacy ghosts controller (`pacman.controllers.examples.Legacy`):
 * Each ghost uses a distinct classic metric to pursue Pac-Man:
 * - BLINKY (0): Shortest Path (`DM.PATH`)
 * - PINKY  (1): Euclidean distance (`DM.EUCLID`)
 * - INKY   (2): Manhattan distance (`DM.MANHATTAN`)
 * - CLYDE  (3): Random legal move (uses `state.rng` for determinism)
 *
 * When `fleeWhenEdible` is true (default), Blinky/Pinky/Inky flee while edible
 * using their respective distance metric; set `fleeWhenEdible: false` for raw
 * original Legacy behavior (chasing even while edible).
 */
class LegacyGhostsController {
    constructor(options = {}) {
        this.name = "LegacyGhosts";
        this.fleeWhenEdible = options.fleeWhenEdible !== false;
        const N = PacMonConstants.DIRECTIONS.NEUTRAL;
        this._moves = [N, N, N, N];
    }

    /** @param {PacManState} state */
    getMove(state) {
        const D = PacMonConstants.DIRECTIONS;
        const DM = PacMonConstants.DM;
        const G = PacMonConstants.GHOST;
        const pacNode = state.getPacmanCurrentNodeIndex();

        for (let g = 0; g < PacMonConstants.GHOST_COUNT; g++) {
            if (!state.doesGhostRequireAction(g)) {
                this._moves[g] = D.NEUTRAL;
                continue;
            }

            const ghostNode = state.getGhostCurrentNodeIndex(g);
            const lastDir = state.getGhostLastMoveMade(g);

            if (g === G.CLYDE) {
                const possible = state.getPossibleMoves(ghostNode, lastDir);
                this._moves[g] = possible.length > 0
                    ? possible[state.rng.nextInt(possible.length)]
                    : D.NEUTRAL;
                continue;
            }

            const metric = g === G.BLINKY ? DM.PATH
                         : g === G.PINKY  ? DM.EUCLID
                         : DM.MANHATTAN;

            if (this.fleeWhenEdible && state.isGhostEdible(g)) {
                this._moves[g] = state.getNextMoveAwayFromTarget(ghostNode, pacNode, lastDir, metric);
            } else {
                this._moves[g] = state.getNextMoveTowardsTarget(ghostNode, pacNode, lastDir, metric);
            }
        }

        return this._moves;
    }
}

// #endregion

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        HumanPacManController,
        StarterPacManController,
        StarterGhostsController,
        LegacyGhostsController
    };
}
