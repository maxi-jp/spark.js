/** Minimal duck-typed grid for use with AStarPathfinder. */
class DemoGrid {
    constructor(cols, rows, cellSize) {
        this.width = cols;
        this.height = rows;
        this.cellSize = cellSize;
        // true = walkable, false = wall
        this.cells = Array.from({ length: rows }, () => new Array(cols).fill(true));
    }

    IsInBounds(col, row) {
        return col >= 0 && col < this.width && row >= 0 && row < this.height;
    }

    IsWalkable(col, row) {
        return this.IsInBounds(col, row) && this.cells[row][col];
    }

    Set(col, row, walkable) {
        if (this.IsInBounds(col, row)) this.cells[row][col] = walkable;
    }

    WorldToGrid(pos) {
        return {
            col: Math.floor(pos.x / this.cellSize),
            row: Math.floor(pos.y / this.cellSize)
        };
    }

    GridToWorld(col, row) {
        return new Vector2((col + 0.5) * this.cellSize, (row + 0.5) * this.cellSize);
    }

    Clear() {
        for (let r = 0; r < this.height; r++)
            for (let c = 0; c < this.width; c++)
                this.cells[r][c] = true;
    }

    Randomize(density = 0.28) {
        this.Clear();
        for (let r = 0; r < this.height; r++)
            for (let c = 0; c < this.width; c++)
                this.cells[r][c] = Math.random() > density;
    }

    /** Paint a rectangular block of walls. */
    FillRect(col, row, w, h, walkable = false) {
        for (let r = row; r < row + h; r++)
            for (let c = col; c < col + w; c++)
                this.Set(c, r, walkable);
    }
}

const _PF_COLS = 25;
const _PF_ROWS = 18;
const _PF_CELL = 32;
const _PF_HEURISTICS = ['Manhattan', 'Octile', 'Euclidean'];

class PathfindingDemo extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({
            screenWidth:  _PF_COLS * _PF_CELL,
            screenHeight: _PF_ROWS * _PF_CELL + 44,
            imageSmoothingEnabled: false,
        });
    }

    Start() {
        super.Start();

        this.grid = new DemoGrid(_PF_COLS, _PF_ROWS, _PF_CELL);

        // Default maze-like layout
        this._PlaceDefaultWalls();

        this.startCell = { col: 1, row: 9 };
        this.endCell   = { col: 23, row: 9 };

        this.heuristicIndex = 1; // Octile
        this.allowDiagonals = true;
        this.smoothPath     = true;

        this.path   = [];
        this.lastMs = 0;

        this.dragOp     = null; // 'paint' | 'erase'
        this.lastDragCell = null;

        this._BuildPathfinder();
        this._Recalculate();

        // Pre-compute colors once — Color construction is cheap but we reuse them every frame
        this._col = {
            walkable:   Color.FromRGB(28, 28, 38),
            wall:       Color.FromRGB(12, 12, 18),
            grid:       Color.FromRGBA(55, 55, 75, 0.5),
            start:      Color.FromRGB(34, 197, 94),
            end:        Color.FromRGB(239, 68, 68),
            pathLine:   Color.FromRGBA(251, 191, 36, 0.45),
            pathDot:    Color.FromRGB(251, 191, 36),
            uiBg:       Color.FromRGB(10, 10, 16),
            uiText:     Color.FromRGB(200, 200, 220),
            uiDim:      Color.FromRGB(95, 95, 115),
            labelBlack: Color.FromRGB(10, 10, 10),
        };
    }

    _PlaceDefaultWalls() {
        // Vertical walls forming corridors
        this.grid.FillRect(5,  1, 1, 6);
        this.grid.FillRect(5, 10, 1, 7);
        this.grid.FillRect(10, 0, 1, 7);
        this.grid.FillRect(10, 9, 1, 8);
        this.grid.FillRect(15, 1, 1, 5);
        this.grid.FillRect(15,10, 1, 6);
        this.grid.FillRect(20, 2, 1, 4);
        this.grid.FillRect(20,10, 1, 5);
        // Horizontal walls
        this.grid.FillRect(6,  8, 4, 1);
        this.grid.FillRect(11, 8, 4, 1);
        this.grid.FillRect(16, 8, 4, 1);
    }

    _BuildPathfinder() {
        const hName = _PF_HEURISTICS[this.heuristicIndex];
        this.pathfinder = new AStarPathfinder(this.grid, {
            allowDiagonals: this.allowDiagonals,
            smoothPath:     this.smoothPath,
            heuristic:      AStarPathfinder.Heuristic[hName],
        });
    }

    _Recalculate() {
        const s = this.grid.GridToWorld(this.startCell.col, this.startCell.row);
        const e = this.grid.GridToWorld(this.endCell.col,   this.endCell.row);
        const t0 = performance.now();
        this.path = this.pathfinder.FindPath(s, e);
        this.lastMs = performance.now() - t0;
    }

    _CellAt(x, y) {
        const col = Math.floor(x / _PF_CELL);
        const row = Math.floor(y / _PF_CELL);
        if (col >= 0 && col < _PF_COLS && row >= 0 && row < _PF_ROWS) return { col, row };
        return null;
    }

    _SameCell(a, b) { return a && b && a.col === b.col && a.row === b.row; }

    _IsReserved(cell) {
        return this._SameCell(cell, this.startCell) || this._SameCell(cell, this.endCell);
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        let dirty = false;
        const cell = this._CellAt(Input.mouse.x, Input.mouse.y);

        // Left-click / drag → paint or erase walls
        if (Input.IsMouseDown(0) && cell && !this._IsReserved(cell)) {
            this.dragOp = this.grid.IsWalkable(cell.col, cell.row) ? 'paint' : 'erase';
        }

        if (Input.IsMousePressed(0) && this.dragOp && cell && !this._IsReserved(cell)) {
            if (!this._SameCell(cell, this.lastDragCell)) {
                this.grid.Set(cell.col, cell.row, this.dragOp === 'erase');
                this.lastDragCell = cell;
                dirty = true;
            }
        }

        if (Input.IsMouseUp(0)) {
            this.dragOp = null;
            this.lastDragCell = null;
        }

        // Right-click → move start marker
        if (Input.IsMouseDown(1) && cell && !this._IsReserved(cell) && this.grid.IsWalkable(cell.col, cell.row)) {
            this.startCell = cell;
            dirty = true;
        }

        // Middle-click → move end marker
        if (Input.IsMouseDown(2) && cell && !this._IsReserved(cell) && this.grid.IsWalkable(cell.col, cell.row)) {
            this.endCell = cell;
            dirty = true;
        }

        // [H] cycle heuristic
        if (Input.IsKeyDown(KEY_H)) {
            this.heuristicIndex = (this.heuristicIndex + 1) % _PF_HEURISTICS.length;
            this._BuildPathfinder();
            dirty = true;
        }

        // [D] toggle diagonals
        if (Input.IsKeyDown(KEY_D)) {
            this.allowDiagonals = !this.allowDiagonals;
            this._BuildPathfinder();
            dirty = true;
        }

        // [P] toggle path smoothing
        if (Input.IsKeyDown(KEY_P)) {
            this.smoothPath = !this.smoothPath;
            this._BuildPathfinder();
            dirty = true;
        }

        // [C] clear all walls
        if (Input.IsKeyDown(KEY_C)) {
            this.grid.Clear();
            dirty = true;
        }

        // [R] randomize walls
        if (Input.IsKeyDown(KEY_R)) {
            this.grid.Randomize(0.28);
            dirty = true;
        }

        // [L] restore default layout
        if (Input.IsKeyDown(KEY_L)) {
            this.grid.Clear();
            this._PlaceDefaultWalls();
            dirty = true;
        }

        if (dirty) this._Recalculate();
    }

    Draw() {
        super.Draw();
        const cs = _PF_CELL;
        const c  = this._col;

        // --- Grid cells ---
        for (let r = 0; r < _PF_ROWS; r++) {
            for (let col = 0; col < _PF_COLS; col++) {
                const x = col * cs, y = r * cs;
                this.renderer.DrawFillBasicRectangle(x, y, cs, cs, this.grid.IsWalkable(col, r) ? c.walkable : c.wall);
                this.renderer.DrawStrokeBasicRectangle(x, y, cs, cs, c.grid, 0.5);
            }
        }

        // --- Path ---
        if (this.path.length >= 2) {
            for (let i = 1; i < this.path.length; i++)
                this.renderer.DrawLine(this.path[i - 1].x, this.path[i - 1].y, this.path[i].x, this.path[i].y, c.pathLine, 2.5);
            for (const p of this.path)
                this.renderer.DrawFillCircle(p.x, p.y, 4, c.pathDot);
        }

        // --- Start / End markers ---
        const sx = this.startCell.col * cs, sy = this.startCell.row * cs;
        const ex = this.endCell.col   * cs, ey = this.endCell.row   * cs;
        const inset = 4;
        this.renderer.DrawFillBasicRectangle(sx + inset, sy + inset, cs - inset * 2, cs - inset * 2, c.start);
        this.renderer.DrawFillBasicRectangle(ex + inset, ey + inset, cs - inset * 2, cs - inset * 2, c.end);
        this.renderer.DrawFillText('S', sx + cs / 2, sy + cs / 2 + 5, 'bold 14px monospace', c.labelBlack, 'center');
        this.renderer.DrawFillText('E', ex + cs / 2, ey + cs / 2 + 5, 'bold 14px monospace', c.labelBlack, 'center');

        // --- UI bar ---
        const uiY = _PF_ROWS * cs;
        this.renderer.DrawFillBasicRectangle(0, uiY, _PF_COLS * cs, 44, c.uiBg);

        const hName = _PF_HEURISTICS[this.heuristicIndex];
        const status = `[H] Heuristic: ${hName}  |  [D] Diagonals: ${this.allowDiagonals ? 'ON' : 'OFF'}  |  [P] Smooth: ${this.smoothPath ? 'ON' : 'OFF'}  |  Waypoints: ${this.path.length}  |  ${this.lastMs.toFixed(3)} ms`;
        this.renderer.DrawFillText(status, (_PF_COLS * cs) / 2, uiY + 16, '13px monospace', c.uiText, 'center');
        this.renderer.DrawFillText('[LMB] draw/erase walls   [RMB] move start   [MMB] move end   [C] clear   [R] randomize   [L] reset layout', (_PF_COLS * cs) / 2, uiY + 34, '11px monospace', c.uiDim, 'center');
    }
}

// #endregion

window.onload = () => Init(PathfindingDemo, "canvas");
