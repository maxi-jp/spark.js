// #region _MinHeap (internal priority queue for AStarPathfinder)

class _MinHeap {
    constructor() {
        this._data = [];
    }

    get size() { return this._data.length; }
    get isEmpty() { return this._data.length === 0; }

    Push(node) {
        this._data.push(node);
        this._BubbleUp(this._data.length - 1);
    }

    Pop() {
        const top = this._data[0];
        const last = this._data.pop();
        if (this._data.length > 0) {
            this._data[0] = last;
            this._SiftDown(0);
        }
        return top;
    }

    _BubbleUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this._data[parent].f <= this._data[i].f)
                break;

            [this._data[parent], this._data[i]] = [this._data[i], this._data[parent]];
            i = parent;
        }
    }

    _SiftDown(i) {
        const n = this._data.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1, r = 2 * i + 2;

            if (l < n && this._data[l].f < this._data[smallest].f)
                smallest = l;

            if (r < n && this._data[r].f < this._data[smallest].f)
                smallest = r;

            if (smallest === i)
                break;

            [this._data[smallest], this._data[i]] = [this._data[i], this._data[smallest]];
            i = smallest;
        }
    }
}

// #endregion

// #region AStarPathfinder

/**
 * General-purpose A* pathfinder. Works with any grid object that implements:
 *   - `IsWalkable(col, row)` → boolean
 *   - `IsInBounds(col, row)` → boolean
 *   - `WorldToGrid(Vector2)` → {col, row}
 *   - `GridToWorld(col, row)` → Vector2
 *   - `width`, `height` — grid dimensions in cells
 *
 * @example
 * const pathfinder = new AStarPathfinder(gridMap);
 * const waypoints = pathfinder.FindPath(unit.position, targetPosition);
 * // waypoints is Vector2[] — empty if unreachable
 */
class AStarPathfinder {
    /**
     * @param {object} grid
     * @param {object} [options]
     * @param {boolean} [options.allowDiagonals=true]
     * @param {number}  [options.maxIterations=20000] - Safety cap against runaway searches
     * @param {boolean} [options.smoothPath=true] - Line-of-sight path smoothing
     */
    constructor(grid, options = {}) {
        this.grid = grid;
        this.allowDiagonals = options.allowDiagonals !== false;
        this.maxIterations = options.maxIterations ?? 20000;
        this.smoothPath = options.smoothPath !== false;
        // Auto-select admissible heuristic; caller may override with a custom function
        this.heuristic = options.heuristic ??
            (this.allowDiagonals ? AStarPathfinder.Heuristic.Octile : AStarPathfinder.Heuristic.Manhattan);
    }

    /**
     * Find a world-space path between two Vector2 positions.
     * Returns the closest reachable waypoint array when the exact target is blocked.
     * @param {Vector2} startWorld
     * @param {Vector2} endWorld
     * @returns {Vector2[]}
     */
    FindPath(startWorld, endWorld) {
        const start = this.grid.WorldToGrid(startWorld);
        const end = this.grid.WorldToGrid(endWorld);

        const gridPath = this._Search(start.col, start.row, end.col, end.row);
        if (!gridPath || gridPath.length === 0)
            return [];

        const worldPath = gridPath.map(n => this.grid.GridToWorld(n.col, n.row));

        return this.smoothPath ? this._SmoothPath(worldPath) : worldPath;
    }

    /**
     * Find a path between grid coordinates.
     * @param {number} sc - Start col
     * @param {number} sr - Start row
     * @param {number} ec - End col
     * @param {number} er - End row
     * @returns {{col: number, row: number}[]}
     */
    FindPathGrid(sc, sr, ec, er) {
        return this._Search(sc, sr, ec, er) ?? [];
    }

    // -------------------------------------------------------------------------

    _Search(sc, sr, ec, er) {
        // Remap blocked target to nearest walkable cell
        if (!this.grid.IsWalkable(ec, er)) {
            const nearest = this._NearestWalkable(ec, er);
            if (!nearest)
                return null;

            ec = nearest.col;
            er = nearest.row;
        }

        if (sc === ec && sr === er)
            return [{ col: sc, row: sr }];

        const openHeap = new _MinHeap();
        const openMap = new Map();   // key → node (for g-score updates)
        const closedSet = new Set();

        const startNode = { col: sc, row: sr, g: 0, h: this._H(sc, sr, ec, er), parent: null };
        startNode.f = startNode.h;
        openHeap.Push(startNode);
        openMap.set(`${sc},${sr}`, startNode);

        let bestNode = startNode; // fallback: closest node reached
        let iterations = 0;

        while (!openHeap.isEmpty && iterations < this.maxIterations) {
            iterations++;
            const current = openHeap.Pop();
            const key = `${current.col},${current.row}`;

            if (closedSet.has(key))
                continue;

            closedSet.add(key);
            openMap.delete(key);

            if (current.h < bestNode.h)
                bestNode = current;

            if (current.col === ec && current.row === er) {
                return this._Reconstruct(current);
            }

            for (const { col: nc, row: nr, cost } of this._Neighbors(current)) {
                const nKey = `${nc},${nr}`;
                if (closedSet.has(nKey))
                    continue;

                const g = current.g + cost;
                const existing = openMap.get(nKey);
                if (!existing || g < existing.g) {
                    const h = this._H(nc, nr, ec, er);
                    const node = { col: nc, row: nr, g, h, f: g + h, parent: current };
                    openMap.set(nKey, node);
                    openHeap.Push(node);
                }
            }
        }

        // Return path to closest reachable cell rather than nothing
        return bestNode !== startNode ? this._Reconstruct(bestNode) : null;
    }

    /** Chebyshev distance — optimal heuristic for 8-directional grids. */
    _H(col, row, ec, er) {
        return this.heuristic(col, row, ec, er);
    }

    _Neighbors(node) {
        const result = [];
        const cardinals = [
            { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
            { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
        ];

        for (const { dc, dr } of cardinals) {
            const nc = node.col + dc, nr = node.row + dr;
            if (this.grid.IsWalkable(nc, nr)) result.push({ col: nc, row: nr, cost: 1 });
        }

        if (this.allowDiagonals) {
            const diags = [
                { dc: -1, dr: -1 }, { dc: 1, dr: -1 },
                { dc: -1, dr: 1 },  { dc: 1, dr: 1 },
            ];
            for (const { dc, dr } of diags) {
                const nc = node.col + dc, nr = node.row + dr;
                // Prevent corner-cutting through blocked cells
                if (this.grid.IsWalkable(nc, nr) &&
                    this.grid.IsWalkable(node.col, nr) &&
                    this.grid.IsWalkable(nc, node.row)) {
                    result.push({ col: nc, row: nr, cost: Math.SQRT2 });
                }
            }
        }

        return result;
    }

    _Reconstruct(node) {
        const path = [];
        for (let n = node; n; n = n.parent) path.push({ col: n.col, row: n.row });
        return path.reverse();
    }

    /** BFS outward to find the nearest walkable cell to a blocked target. */
    _NearestWalkable(col, row) {
        const queue = [{ col, row }];
        const visited = new Set([`${col},${row}`]);
        const dirs = [
            { dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
            { dc: -1, dr: -1 }, { dc: 1, dr: -1 }, { dc: -1, dr: 1 }, { dc: 1, dr: 1 },
        ];

        while (queue.length > 0) {
            const { col: c, row: r } = queue.shift();
            if (this.grid.IsWalkable(c, r)) return { col: c, row: r };
            for (const { dc, dr } of dirs) {
                const nc = c + dc, nr = r + dr;
                const k = `${nc},${nr}`;
                if (!visited.has(k) && this.grid.IsInBounds(nc, nr)) {
                    visited.add(k);
                    queue.push({ col: nc, row: nr });
                }
            }
        }
        return null;
    }

    /**
     * Remove redundant waypoints using line-of-sight (Bresenham's line).
     * @param {Vector2[]} worldPath
     * @returns {Vector2[]}
     */
    _SmoothPath(worldPath) {
        if (worldPath.length <= 2) return worldPath;

        const smoothed = [worldPath[0]];
        let i = 0;

        while (i < worldPath.length - 1) {
            let j = worldPath.length - 1;
            while (j > i + 1 && !this._LineOfSight(worldPath[i], worldPath[j])) j--;
            smoothed.push(worldPath[j]);
            i = j;
        }

        return smoothed;
    }

    _LineOfSight(a, b) {
        const ga = this.grid.WorldToGrid(a);
        const gb = this.grid.WorldToGrid(b);

        let { col: x0, row: y0 } = ga;
        const { col: x1, row: y1 } = gb;
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if (!this.grid.IsWalkable(x0, y0)) return false;
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
        return true;
    }
}

AStarPathfinder.Heuristic = {
    /** 4-directional grids (no diagonals). */
    Manhattan: (col, row, ec, er) => Math.abs(col - ec) + Math.abs(row - er),
    /** 8-directional grids where diagonal cost = √2 (default). */
    Octile: (col, row, ec, er) => {
        const dx = Math.abs(col - ec), dy = Math.abs(row - er);
        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    },
    /** Always admissible; use when movement cost is true Euclidean distance. */
    Euclidean: (col, row, ec, er) => Math.hypot(col - ec, row - er),
};

// #endregion
