// Pure, immutable maze graph with precomputed junctions and all-pairs shortest-path distances.
// Zero DOM / Renderer dependency so it can run in both browser (spark.js) and headless Node.js.

class MazeNode {
    /**
     * @param {number} id - Unique integer index (0..N-1).
     * @param {number} x - Graph-space X coordinate (tileX * nodesPerTile + subOffset).
     * @param {number} y - Graph-space Y coordinate (tileY * nodesPerTile + subOffset).
     * @param {boolean} [mainNode=false] - True if this node is a tile's primary node.
     * @param {number} [tileType=1] - Raw maze tile value (1: empty, 2: pill, 3: power pellet).
     */
    constructor(id, x, y, mainNode = false, tileType = 1) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.position = { x, y };
        this.mainNode = mainNode;
        this.tileType = tileType;

        /** Neighbor node IDs indexed by Direction [UP, RIGHT, DOWN, LEFT]; -1 if none. */
        this.neighbors = [-1, -1, -1, -1];

        /** Index into MazeGraph.pillNodeIndices (-1 if no pill on this node). */
        this.pillIndex = -1;
        /** Index into MazeGraph.powerPillNodeIndices (-1 if no power pill on this node). */
        this.powerPillIndex = -1;

        // Precomputed by MazeGraph._finalize()
        this.numNeighbors = 0;
        this.isJunction = false;
        /** @type {number[]} Valid directions from this node. */
        this.allPossibleMoves = [];
        /** @type {number[][]} Valid directions indexed by lastMoveMade (0..4), excluding reversal. */
        this.possibleMovesByLastDir = [[], [], [], [], []];
    }

    AddNeighbor(neighborNode, dir) {
        this.neighbors[dir] = neighborNode.id;
    }
}

class MazeGraph {
    /**
     * @param {number[][]} mazeLayout - 2D tile grid (0=wall, 1=empty, 2=pill, 3=power pellet).
     * @param {{pacMonInitialNode: number, ghostsInitialNode: number, lairNode?: number}} levelData
     * @param {number} [nodeSize=2] - Pixel size per graph node (classic = 2px).
     * @param {number} [nodesPerTile=4] - Graph nodes per maze tile (classic = 4).
     */
    constructor(mazeLayout, levelData, nodeSize = 2, nodesPerTile = 4) {
        this.nodeSize = nodeSize;
        this.nodesPerTile = nodesPerTile;
        this.tileWidth = mazeLayout[0].length;
        this.tileHeight = mazeLayout.length;

        /** @type {MazeNode[]} All nodes indexed by node.id. */
        this.nodes = [];
        /** @type {(MazeNode|null)[][]} 2D grid [y][x] of tile primary nodes. */
        this.mainNodes = [];

        this.pacManInitialNode = levelData.pacMonInitialNode;
        this.ghostsInitialNode = levelData.ghostsInitialNode;
        this.lairNode = levelData.lairNode ?? levelData.ghostsInitialNode;

        /** @type {Int32Array} Node IDs containing regular pills. */
        this.pillNodeIndices = new Int32Array(0);
        /** @type {Int32Array} Node IDs containing power pills. */
        this.powerPillNodeIndices = new Int32Array(0);
        /** @type {Int32Array} Node IDs that are junctions (numNeighbors > 2). */
        this.junctionIndices = new Int32Array(0);

        /**
         * Lower-triangular flat Int16Array of all-pairs shortest-path distances.
         * Index for (a, b) with a >= b is (a * (a + 1)) / 2 + b.
         * @type {Int16Array}
         */
        this._shortestPathDistances = new Int16Array(0);

        this._buildFromLayout(mazeLayout);
        this._finalize();
        this._precomputeShortestPaths();
    }

    // #region Graph Construction

    _buildFromLayout(mazeLayout) {
        const nodesPerTile = this.nodesPerTile;
        const height = mazeLayout.length;
        const width = mazeLayout[0].length;

        this.mainNodes = new Array(height);
        for (let y = 0; y < height; y++) {
            this.mainNodes[y] = new Array(width).fill(null);
        }

        const pillNodes = [];
        const powerPillNodes = [];
        let nodeId = 0;

        const addNode = (x, y, mainNode = false, tileType = 1) => {
            const node = new MazeNode(nodeId++, x, y, mainNode, tileType);
            this.nodes.push(node);
            return node;
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = mazeLayout[y][x];
                if (cell <= 0) continue;

                const mainNode = addNode(x * nodesPerTile, y * nodesPerTile, true, cell);
                this.mainNodes[y][x] = mainNode;

                if (cell === 2) {
                    mainNode.pillIndex = pillNodes.length;
                    pillNodes.push(mainNode.id);
                } else if (cell === 3) {
                    mainNode.powerPillIndex = powerPillNodes.length;
                    powerPillNodes.push(mainNode.id);
                }

                // Path to the right (or horizontal wrap-around tunnel): insert 3 intermediate nodes
                const hasRight = (x + 1 < width && mazeLayout[y][x + 1] > 0) ||
                                 (x === width - 1 && mazeLayout[y][0] > 0);
                if (hasRight) {
                    const n1 = addNode(x * nodesPerTile + 1, y * nodesPerTile);
                    mainNode.AddNeighbor(n1, 1);
                    n1.AddNeighbor(mainNode, 3);

                    const n2 = addNode(x * nodesPerTile + 2, y * nodesPerTile);
                    n1.AddNeighbor(n2, 1);
                    n2.AddNeighbor(n1, 3);

                    const n3 = addNode(x * nodesPerTile + 3, y * nodesPerTile);
                    n2.AddNeighbor(n3, 1);
                    n3.AddNeighbor(n2, 3);
                }

                // Path up: insert 3 intermediate nodes and connect to tile above
                if (y > 0 && mazeLayout[y - 1][x] > 0) {
                    const n1 = addNode(x * nodesPerTile, y * nodesPerTile - 1);
                    mainNode.AddNeighbor(n1, 0);
                    n1.AddNeighbor(mainNode, 2);

                    const n2 = addNode(x * nodesPerTile, y * nodesPerTile - 2);
                    n1.AddNeighbor(n2, 0);
                    n2.AddNeighbor(n1, 2);

                    const n3 = addNode(x * nodesPerTile, y * nodesPerTile - 3);
                    n2.AddNeighbor(n3, 0);
                    n3.AddNeighbor(n2, 2);

                    const upperNode = this.mainNodes[y - 1][x];
                    if (upperNode) {
                        n3.AddNeighbor(upperNode, 0);
                        upperNode.AddNeighbor(n3, 2);
                    }
                }

                // Connect current main node to the 3rd intermediate node of the tile to the left
                if (x > 0 && this.mainNodes[y][x - 1]) {
                    const leftMain = this.mainNodes[y][x - 1];
                    const r1 = leftMain.neighbors[1];
                    const r2 = r1 !== -1 ? this.nodes[r1].neighbors[1] : -1;
                    const r3 = r2 !== -1 ? this.nodes[r2].neighbors[1] : -1;
                    if (r3 !== -1) {
                        const leftNode = this.nodes[r3];
                        mainNode.AddNeighbor(leftNode, 3);
                        leftNode.AddNeighbor(mainNode, 1);
                    }
                }

                // Connect right-left tunnel wrap-around
                if (x === width - 1 && this.mainNodes[y][0]) {
                    const wrapTarget = this.mainNodes[y][0];
                    const r1 = mainNode.neighbors[1];
                    const r2 = r1 !== -1 ? this.nodes[r1].neighbors[1] : -1;
                    const r3 = r2 !== -1 ? this.nodes[r2].neighbors[1] : -1;
                    if (r3 !== -1) {
                        const rightEnd = this.nodes[r3];
                        rightEnd.AddNeighbor(wrapTarget, 1);
                        wrapTarget.AddNeighbor(rightEnd, 3);
                    }
                }
            }
        }

        this.pillNodeIndices = Int32Array.from(pillNodes);
        this.powerPillNodeIndices = Int32Array.from(powerPillNodes);
    }

    _finalize() {
        const junctions = [];
        // Standard Pac-Man tie-break order: UP, LEFT, DOWN, RIGHT (matches classic priority)
        const dirOrder = [0, 3, 2, 1];

        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const moves = [];
            for (let d = 0; d < 4; d++) {
                const dir = dirOrder[d];
                if (node.neighbors[dir] !== -1) {
                    moves.push(dir);
                }
            }

            node.numNeighbors = moves.length;
            node.isJunction = moves.length > 2;
            node.allPossibleMoves = moves;

            if (node.isJunction) {
                junctions.push(node.id);
            }

            // Precompute non-reversing moves for each possible lastMoveMade (0..4)
            for (let lastDir = 0; lastDir <= 4; lastDir++) {
                if (lastDir === 4) {
                    node.possibleMovesByLastDir[lastDir] = moves.slice();
                } else {
                    const opp = (lastDir + 2) & 3;
                    const filtered = moves.filter(m => m !== opp);
                    // Dead-end fallback: allow reversing if no other move exists
                    node.possibleMovesByLastDir[lastDir] = filtered.length > 0 ? filtered : moves.slice();
                }
            }
        }

        this.junctionIndices = Int32Array.from(junctions);
    }

    _precomputeShortestPaths() {
        const n = this.nodes.length;
        const tableSize = (n * (n + 1)) >> 1;
        const distTable = new Int16Array(tableSize);
        distTable.fill(-1);

        // Reusable BFS buffers (zero allocations inside loop)
        const queue = new Int32Array(n);
        const dist = new Int16Array(n);

        for (let src = 0; src < n; src++) {
            dist.fill(-1);
            dist[src] = 0;
            let head = 0;
            let tail = 0;
            queue[tail++] = src;

            while (head < tail) {
                const u = queue[head++];
                const nextDist = dist[u] + 1;
                const nbrs = this.nodes[u].neighbors;

                for (let d = 0; d < 4; d++) {
                    const v = nbrs[d];
                    if (v !== -1 && dist[v] === -1) {
                        dist[v] = nextDist;
                        queue[tail++] = v;
                    }
                }
            }

            // Store lower triangle (row = src, col = 0..src)
            const rowOffset = (src * (src + 1)) >> 1;
            for (let dst = 0; dst <= src; dst++) {
                distTable[rowOffset + dst] = dist[dst];
            }
        }

        this._shortestPathDistances = distTable;
    }

    // #endregion

    // #region Query API

    get numNodes() {
        return this.nodes.length;
    }

    get numPills() {
        return this.pillNodeIndices.length;
    }

    get numPowerPills() {
        return this.powerPillNodeIndices.length;
    }

    getNode(nodeId) {
        return this.nodes[nodeId] || null;
    }

    /**
     * Returns neighbor node ID in `direction`, or -1 if blocked.
     * @param {number} nodeId
     * @param {number} direction - 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
     * @returns {number}
     */
    getNeighbor(nodeId, direction) {
        if (direction < 0 || direction > 3) return -1;
        const node = this.nodes[nodeId];
        return node ? node.neighbors[direction] : -1;
    }

    /**
     * Returns the opposite direction (NEUTRAL -> NEUTRAL).
     * @param {number} direction
     * @returns {number}
     */
    static getOppositeMove(direction) {
        return (direction >= 0 && direction <= 3) ? ((direction + 2) & 3) : 4;
    }

    /**
     * True if nodeId is a junction (more than 2 neighbors).
     * @param {number} nodeId
     * @returns {boolean}
     */
    isJunction(nodeId) {
        const node = this.nodes[nodeId];
        return node ? node.isJunction : false;
    }

    /**
     * Returns legal directions from `nodeId`. If `lastDir` is 0..3, excludes reversal
     * (unless at a dead-end).
     * @param {number} nodeId
     * @param {number} [lastDir=4]
     * @returns {number[]}
     */
    getPossibleMoves(nodeId, lastDir = 4) {
        const node = this.nodes[nodeId];
        if (!node) return [];
        const idx = (lastDir >= 0 && lastDir <= 4) ? lastDir : 4;
        return node.possibleMovesByLastDir[idx];
    }

    /**
     * O(1) lookup of exact shortest-path distance (in graph edges) between two nodes.
     * Returns -1 if unreachable.
     * @param {number} fromId
     * @param {number} toId
     * @returns {number}
     */
    getShortestPathDistance(fromId, toId) {
        if (fromId === toId) return 0;
        const a = fromId > toId ? fromId : toId;
        const b = fromId > toId ? toId : fromId;
        return this._shortestPathDistances[((a * (a + 1)) >> 1) + b];
    }

    /**
     * Manhattan distance in graph coordinates.
     * @param {number} fromId
     * @param {number} toId
     * @returns {number}
     */
    getManhattanDistance(fromId, toId) {
        const a = this.nodes[fromId];
        const b = this.nodes[toId];
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Euclidean distance in graph coordinates.
     * @param {number} fromId
     * @param {number} toId
     * @returns {number}
     */
    getEuclideanDistance(fromId, toId) {
        const a = this.nodes[fromId];
        const b = this.nodes[toId];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Distance between two nodes using the given PacMonConstants.DM measure.
     * @param {number} fromId
     * @param {number} toId
     * @param {number} [distanceMeasure=0] - 0=PATH, 1=MANHATTAN, 2=EUCLID
     * @returns {number}
     */
    getDistance(fromId, toId, distanceMeasure = 0) {
        if (distanceMeasure === 0) return this.getShortestPathDistance(fromId, toId);
        if (distanceMeasure === 1) return this.getManhattanDistance(fromId, toId);
        return this.getEuclideanDistance(fromId, toId);
    }

    /**
     * Returns the move from `fromId` that minimizes distance to `toId`, respecting
     * `lastDir` (no immediate reversal). Ties follow UP, LEFT, DOWN, RIGHT priority.
     * @param {number} fromId
     * @param {number} toId
     * @param {number} [lastDir=4]
     * @param {number} [distanceMeasure=0]
     * @returns {number}
     */
    getNextMoveTowardsTarget(fromId, toId, lastDir = 4, distanceMeasure = 0) {
        const moves = this.getPossibleMoves(fromId, lastDir);
        if (moves.length === 0) return 4;
        if (moves.length === 1) return moves[0];

        let bestMove = moves[0];
        let minDist = Infinity;
        const nbrs = this.nodes[fromId].neighbors;

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const d = this.getDistance(nbrs[move], toId, distanceMeasure);
            if (d >= 0 && d < minDist) {
                minDist = d;
                bestMove = move;
            }
        }
        return bestMove;
    }

    /**
     * Returns the move from `fromId` that maximizes distance from `toId`, respecting
     * `lastDir` (no immediate reversal).
     * @param {number} fromId
     * @param {number} toId
     * @param {number} [lastDir=4]
     * @param {number} [distanceMeasure=0]
     * @returns {number}
     */
    getNextMoveAwayFromTarget(fromId, toId, lastDir = 4, distanceMeasure = 0) {
        const moves = this.getPossibleMoves(fromId, lastDir);
        if (moves.length === 0) return 4;
        if (moves.length === 1) return moves[0];

        let bestMove = moves[0];
        let maxDist = -Infinity;
        const nbrs = this.nodes[fromId].neighbors;

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const d = this.getDistance(nbrs[move], toId, distanceMeasure);
            if (d > maxDist) {
                maxDist = d;
                bestMove = move;
            }
        }
        return bestMove;
    }

    /**
     * Reconstructs a shortest path of node IDs from `fromId` (exclusive) to `toId` (inclusive).
     * @param {number} fromId
     * @param {number} toId
     * @param {number} [lastDir=4]
     * @returns {number[]}
     */
    getShortestPath(fromId, toId, lastDir = 4) {
        if (fromId === toId) return [];
        const path = [];
        let curr = fromId;
        let dir = lastDir;
        const maxSteps = this.nodes.length;

        for (let step = 0; step < maxSteps && curr !== toId; step++) {
            const nextDir = this.getNextMoveTowardsTarget(curr, toId, dir, 0);
            if (nextDir === 4) break;
            curr = this.nodes[curr].neighbors[nextDir];
            path.push(curr);
            dir = nextDir;
        }
        return path;
    }

    /**
     * Converts a node ID to pixel coordinates given a maze top-left offset.
     * @param {number} nodeId
     * @param {{x: number, y: number}} mazePosition
     * @returns {{x: number, y: number}}
     */
    nodeToPixel(nodeId, mazePosition) {
        const node = this.nodes[nodeId];
        return {
            x: 4 + node.x * this.nodeSize + mazePosition.x,
            y: 4 + node.y * this.nodeSize + mazePosition.y
        };
    }

    /**
     * Debug visualization of graph nodes, junctions, and main nodes.
     * @param {Renderer} renderer
     * @param {{x: number, y: number}} mazePosition
     */
    Draw(renderer, mazePosition) {
        const initX = 4 + mazePosition.x;
        const initY = 4 + mazePosition.y;

        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const px = initX + node.x * this.nodeSize;
            const py = initY + node.y * this.nodeSize;
            if (node.isJunction) {
                renderer.DrawFillCircle(px, py, 2, Color.yellow);
            } else {
                renderer.DrawFillRectangle(px - 1, py - 1, 1, 1, Color.red);
            }
        }
    }

    // #endregion
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { MazeNode, MazeGraph };
}
