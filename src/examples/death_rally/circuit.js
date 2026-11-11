// =====================================================================
// Death Rally — Circuit System
// Race management: checkpoints, lap counting, race state machine,
// and circuit data loading (inline Option A  +  Tiled Option B).
//
// Load order: BEFORE death_rally_game.js
// Globals: RACE_STATE, RaceProgress, CheckpointZone, RaceManager, CircuitLoader
// Requires: game.js, gameobjects.js, utils_classes.js, main.js (totalTime, debugMode)
// =====================================================================

// #region ---- RACE STATE ----

/** @enum {string} */
const RACE_STATE = Object.freeze({
    IDLE:    'IDLE',
    GRID:    'GRID',      // pre-race countdown active
    RACING:  'RACING',
    RESULTS: 'RESULTS',
});

// #endregion

// #region ---- RACE PROGRESS ----

/**
 * Tracks a single car's checkpoint and lap progress.
 * Not a GameObject — owned by RaceManager (one per registered racer).
 */
class RaceProgress {
    constructor(totalCheckpoints, totalLaps) {
        this.totalCheckpoints = totalCheckpoints;
        this.totalLaps        = totalLaps;
        this.currentLap       = 0;
        this.nextCheckpoint   = totalCheckpoints > 1 ? 1 : 0;   // id expected next (0 = Start/Finish line)
        this.lapTimes         = [];
        this.lapStartTime     = 0;
        this.finished         = false;
        this.finishTime       = 0;
    }

    /**
     * Called when the owning car triggers a checkpoint.
     * Validates order; advances lap counter when S/F line (id 0) is hit after all others.
     * @param {number} id - The triggered checkpoint's id
     */
    onCheckpointHit(id) {
        if (this.finished || id !== this.nextCheckpoint) return;

        if (id === 0) {
            // S/F line — lap complete
            this.currentLap++;
            this.lapTimes.push(totalTime - this.lapStartTime);
            this.lapStartTime    = totalTime;
            this.nextCheckpoint  = this.totalCheckpoints > 1 ? 1 : 0;
            if (this.currentLap >= this.totalLaps) {
                this.finished   = true;
                this.finishTime = totalTime;
            }
        } else {
            this.nextCheckpoint = (id + 1) % this.totalCheckpoints;
        }
    }

    /**
     * Monotonically increasing value used for race-position sorting.
     * Range: 0 (race start) to totalLaps × totalCheckpoints (finished).
     */
    get overallProgress() {
        const hitsThisLap = this.nextCheckpoint === 0
            ? this.totalCheckpoints - 1
            : this.nextCheckpoint - 1;
        return this.currentLap * this.totalCheckpoints + hitsThisLap;
    }

    get lastLapTime() { return this.lapTimes.at(-1) ?? 0; }
    get bestLapTime()  { return this.lapTimes.length > 0 ? Math.min(...this.lapTimes) : 0; }
}

// #endregion

// #region ---- CHECKPOINT ZONE ----

/**
 * Invisible rectangular trigger zone. Cars must pass all checkpoints in
 * ascending id order before the S/F line (id=0) counts as a completed lap.
 * Drawn as a coloured overlay only when debugMode is true.
 *
 * Uses go.isRacer tag to avoid a circular dependency on the Car class.
 */
class CheckpointZone extends GameObject {
    /** @param {{ id:number, x:number, y:number, w:number, h:number, rotation?:number }} def */
    constructor(def) {
        super(new Vector2(def.x, def.y));
        this.id        = def.id;
        this.w         = def.w;
        this.h         = def.h;
        this._rotation = def.rotation ?? 0;
        this.isFinish  = def.id === 0;
    }

    Start() {
        if (this._rotation !== 0) {
            const hw = this.w * 0.5, hh = this.h * 0.5;
            const pts = [
                new Vector2(-hw, -hh), new Vector2( hw, -hh),
                new Vector2( hw,  hh), new Vector2(-hw,  hh),
            ];
            this._collider = new PolygonCollider(Vector2.Zero(), this._rotation, pts, this);
        } else {
            this._collider = new RectangleCollider(Vector2.Zero(), this.w, this.h, this);
        }
        game.AddCollider(this._collider);
    }

    Draw(r) {
        if (!debugMode) return;
        const col = this.isFinish
            ? new Color(1, 0.84, 0, 0.30)
            : new Color(0, 0.85, 0.5, 0.25);
        r.DrawFillRectangle(this._position.x, this._position.y, this.w, this.h, col, this._rotation);
        r.DrawStrokeRectangle(this._position.x, this._position.y, this.w, this.h,
            this.isFinish ? Color.FromRGB(255,215,0) : Color.FromRGB(0,220,140), 2, this._rotation);
        r.DrawFillText(
            this.isFinish ? 'S/F' : `CP${this.id}`,
            this._position.x, this._position.y,
            'bold 12px Arial', Color.white, 'center', 'middle'
        );
    }

    OnCollisionEnter(mine, other) {
        const go = other.go;
        if (go?.isRacer) game.raceManager.OnCheckpointHit(go, this.id);
    }
}

// #endregion

// #region ---- RACE MANAGER ----

class RaceManager {
    constructor() {
        this.state       = RACE_STATE.IDLE;
        this.circuit     = null;
        /** @type {Map<object, RaceProgress>} */
        this.progress    = new Map();
        this.finishOrder = [];

        // Countdown: steps 3 → 2 → 1 → 0 (GO!) → -1 (expired → RACING)
        this.countdownStep  = 3;
        this.countdownTimer = 0;

        this.raceStartTime  = 0;
    }

    /** @param {CircuitData} circuitData - Normalised data from CircuitLoader */
    LoadCircuit(circuitData) {
        this.circuit     = circuitData;
        this.progress    = new Map();
        this.finishOrder = [];
    }

    /** Register a racer. Must be called after LoadCircuit. */
    RegisterCar(car) {
        this.progress.set(car, new RaceProgress(
            this.circuit.checkpoints.length,
            this.circuit.laps
        ));
    }

    /** Start the pre-race countdown sequence. */
    StartRace() {
        this.state          = RACE_STATE.GRID;
        this.countdownStep  = 3;
        this.countdownTimer = 1.0;
        this.finishOrder    = [];
    }

    /**
     * Reposition all registered cars to their spawn slots, reset pickups, and restart countdown.
     */
    RestartRace() {
        if (!this.circuit)
            return;

        const spawns = this.circuit.spawns;
        let si = 0;
        for (const [car, prog] of this.progress) {
            const spawn = spawns[Math.min(si++, spawns.length - 1)] ?? { x: 400, y: 400, rotation: 0 };
            car._position.Set(spawn.x, spawn.y);
            car._rotation        = spawn.rotation ?? 0;
            car.velocity.Set(0, 0);
            car.health           = car.maxHealth;
            car.isDead           = false;
            car.active           = true;
            car.hitFlash         = 0;
            car.currentWeapon    = 'NONE';
            car.ammo             = 0;
            if ('wpIndex' in car) car.wpIndex = 0;
            prog.currentLap      = 0;
            prog.nextCheckpoint  = prog.totalCheckpoints > 1 ? 1 : 0;
            prog.lapTimes        = [];
            prog.finished        = false;
        }
        this.finishOrder = [];
        this.state = RACE_STATE.IDLE;
        if (typeof game !== 'undefined' && typeof game._resetRacePickups === 'function') {
            game._resetRacePickups();
        }
        this.StartRace();
    }

    Update(dt) {
        if (this.state !== RACE_STATE.GRID) return;

        this.countdownTimer -= dt;
        if (this.countdownTimer > 0) return;

        this.countdownStep--;

        if (this.countdownStep > 0) {
            // Still counting down (2, 1…)
            this.countdownTimer = 1.0;
        } else if (this.countdownStep === 0) {
            // "GO!" — enable player input (caller reads this state)
            this.countdownTimer = 0.75;
        } else {
            // GO! expired — switch to racing
            this.state         = RACE_STATE.RACING;
            this.raceStartTime = totalTime;
            for (const prog of this.progress.values()) prog.lapStartTime = totalTime;
        }
    }

    OnCheckpointHit(car, checkpointId) {
        if (this.state !== RACE_STATE.RACING) return;
        const prog = this.progress.get(car);
        if (!prog) return;
        prog.onCheckpointHit(checkpointId);
        if (prog.finished && !this.finishOrder.includes(car)) {
            this.finishOrder.push(car);
        }
    }

    /**
     * Returns the highest 1-based lap number currently reached by any registered racer.
     * @returns {number}
     */
    GetLeadingLap() {
        let maxLap = 1;
        for (const prog of this.progress.values()) {
            const lap1Based = prog.currentLap + 1;
            if (lap1Based > maxLap) maxLap = lap1Based;
        }
        return maxLap;
    }

    /**
     * Elapsed seconds since the race switched to RACING state (0 while in GRID/IDLE).
     * @returns {number}
     */
    get raceElapsedTime() {
        if (this.state !== RACE_STATE.RACING && this.state !== RACE_STATE.RESULTS) return 0;
        return Math.max(0, totalTime - this.raceStartTime);
    }

    /**
     * Returns all racers sorted by race position (1st = index 0).
     * @returns {{ car:object, prog:RaceProgress, position:number }[]}
     */
    GetPositions() {
        return [...this.progress.entries()]
            .sort(([, a], [, b]) => {
                if (a.finished !== b.finished) return a.finished ? -1 : 1;
                return b.overallProgress - a.overallProgress;
            })
            .map(([car, prog], i) => ({ car, prog, position: i + 1 }));
    }

    /** True when input should be locked (countdown still showing 3/2/1). */
    get inputLocked() {
        return this.state === RACE_STATE.GRID && this.countdownStep > 0;
    }
}

// #endregion

// #region ---- CIRCUIT LOADER ----

/**
 * Produces a normalised CircuitData object from either an inline JS definition
 * (Option A — rapid prototyping / Circuit Editor) or a parsed Tiled JSON map (Option B).
 *
 * CircuitData shape:
 * {
 *   name:        string,
 *   laps:        number,
 *   width:       number,                            // world width (default 2400)
 *   height:      number,                            // world height (default 1800)
 *   checkpoints: { id, x, y, w, h, rotation? }[],   // id=0 is Start/Finish
 *   spawns:      { x, y, rotation }[],              // slot 0 = player
 *   waypoints:   { x, y }[],                        // ordered AI racing line
 *   surfaceZones:{ x?, y?, w?, h?, rotation?, points?:{x,y}[], surface }[],
 *   obstacles:   { cx, cy, w, h, isBarrel?, color?, rotation? }[],
 *   pickups:     { x, y, type, data, spawnLap?, spawnTime? }[],
 * }
 */
const CircuitLoader = {

    /**
     * Resolves a surface reference (string key like 'ASPHALT' or SURFACE.* object).
     * @param {string|object} surf
     */
    ResolveSurface(surf) {
        if (!surf) return SURFACE.ASPHALT;
        if (typeof surf === 'string') return SURFACE[surf.toUpperCase()] ?? SURFACE.ASPHALT;
        if (typeof surf.id === 'string' && SURFACE[surf.id]) return SURFACE[surf.id];
        return surf;
    },

    /**
     * Resolves an obstacle color (Color instance, constant name, hex/rgb string, or {r,g,b,a} object).
     * @param {any} col
     * @param {boolean} [isBarrel=false]
     */
    ResolveObstacleColor(col, isBarrel = false) {
        const fallback = isBarrel ? C_BARREL : C_WALL;
        if (!col) return fallback;
        if (col instanceof Color) return col;
        if (typeof col === 'string') {
            if (col === 'C_WALL')      return C_WALL;
            if (col === 'C_WALL_OVAL') return C_WALL_OVAL;
            if (col === 'C_BARREL')    return C_BARREL;
            if (col === 'C_TIRE')      return C_TIRE;
            if (col === 'C_DARKROAD')  return C_DARKROAD;
            try { return Color.FromString(col); } catch (_) { return fallback; }
        }
        if (typeof col === 'object') {
            const r = col.r ?? col._r ?? ( Array.isArray(col._rgba) ? col._rgba[0] : 0.31 );
            const g = col.g ?? col._g ?? ( Array.isArray(col._rgba) ? col._rgba[1] : 0.27 );
            const b = col.b ?? col._b ?? ( Array.isArray(col._rgba) ? col._rgba[2] : 0.24 );
            const a = col.a ?? col._a ?? ( Array.isArray(col._rgba) ? col._rgba[3] : 1.0  );
            return new Color(r, g, b, a);
        }
        return fallback;
    },

    /**
     * Point-in-surface-zone query supporting axis-aligned rects, rotated rects, and arbitrary polygons.
     * @param {object} z - Normalised surfaceZone entry
     * @param {number} px - World X
     * @param {number} py - World Y
     * @returns {boolean}
     */
    IsPointInSurfaceZone(z, px, py) {
        if (Array.isArray(z.points) && z.points.length >= 3) {
            let inside = false;
            const pts = z.points;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                const xi = pts[i].x, yi = pts[i].y;
                const xj = pts[j].x, yj = pts[j].y;
                const intersect = ((yi > py) !== (yj > py)) &&
                    (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }
        if (z.rotation && z.rotation !== 0) {
            const cx = z.x + z.w * 0.5;
            const cy = z.y + z.h * 0.5;
            const dx = px - cx, dy = py - cy;
            const cosR = Math.cos(-z.rotation), sinR = Math.sin(-z.rotation);
            const lx = cosR * dx - sinR * dy;
            const ly = sinR * dx + cosR * dy;
            return Math.abs(lx) <= z.w * 0.5 && Math.abs(ly) <= z.h * 0.5;
        }
        return px >= z.x && px < z.x + z.w && py >= z.y && py < z.y + z.h;
    },

    /**
     * Renders a single surface zone using the provided spark.js renderer.
     * @param {Renderer} r
     * @param {object} z
     */
    DrawSurfaceZone(r, z) {
        const surf = CircuitLoader.ResolveSurface(z.surface);
        const col  = surf?.color ?? Color.FromRGB(65, 65, 70);
        if (Array.isArray(z.points) && z.points.length >= 3) {
            r.DrawPolygon(z.points, col, 1, true, col);
        } else if (z.rotation && z.rotation !== 0) {
            r.DrawFillRectangle(z.x + z.w * 0.5, z.y + z.h * 0.5, z.w, z.h, col, z.rotation);
        } else {
            r.DrawFillBasicRectangle(z.x, z.y, z.w, z.h, col);
        }
    },

    // ------------------------------------------------------------------
    // Option A: inline JavaScript or JSON circuit definition
    // ------------------------------------------------------------------

    /** @param {object} def - CIRCUIT_NAME constant from circuits/*.js or parsed JSON */
    FromInline(def) {
        const defaultW = typeof WORLD_W !== 'undefined' ? WORLD_W : 2400;
        const defaultH = typeof WORLD_H !== 'undefined' ? WORLD_H : 1800;

        const checkpoints = (def.checkpoints ?? []).map((cp, idx) => ({
            id:       cp.id ?? idx,
            x:        Number(cp.x) || 0,
            y:        Number(cp.y) || 0,
            w:        Number(cp.w) || 160,
            h:        Number(cp.h) || 22,
            rotation: Number(cp.rotation) || 0,
        }));

        const spawns = (def.spawns ?? []).map(s => ({
            x:        Number(s.x) || 0,
            y:        Number(s.y) || 0,
            rotation: Number(s.rotation) || 0,
        }));

        const waypoints = (def.waypoints ?? []).map(wp => ({
            x: Number(wp.x) || 0,
            y: Number(wp.y) || 0,
        }));

        const surfaceZones = (def.surfaceZones ?? []).map(z => {
            const surface = CircuitLoader.ResolveSurface(z.surface ?? z.surfaceKey);
            if (Array.isArray(z.points) && z.points.length >= 3) {
                return {
                    points:  z.points.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })),
                    surface,
                };
            }
            return {
                x:        Number(z.x) || 0,
                y:        Number(z.y) || 0,
                w:        Number(z.w) || 100,
                h:        Number(z.h) || 100,
                rotation: Number(z.rotation) || 0,
                surface,
            };
        });

        const obstacles = (def.obstacles ?? []).map(ob => {
            const isBarrel = !!ob.isBarrel;
            const rawColor = ob.color ?? (ob.colorKey === 'CUSTOM' ? ob.customHex : ob.colorKey);
            return {
                cx:       Number(ob.cx) || 0,
                cy:       Number(ob.cy) || 0,
                w:        Number(ob.w)  || (isBarrel ? 30 : 100),
                h:        Number(ob.h)  || (isBarrel ? 30 : 28),
                isBarrel,
                rotation: Number(ob.rotation) || 0,
                color:    CircuitLoader.ResolveObstacleColor(rawColor, isBarrel),
            };
        });

        const pickups = (def.pickups ?? []).map(pk => ({
            x:         Number(pk.x) || 0,
            y:         Number(pk.y) || 0,
            type:      pk.type || 'weapon',
            data:      pk.data ?? (pk.type === 'weapon' ? 'MACHINEGUN' : 40),
            spawnLap:  Math.max(1, Math.round(Number(pk.spawnLap) || 1)),
            spawnTime: Math.max(0, Number(pk.spawnTime) || 0),
        }));

        return {
            name:         def.name   ?? 'Unnamed Circuit',
            laps:         Math.max(1, Math.round(Number(def.laps) || 3)),
            width:        Math.max(600, Math.round(Number(def.width)  || defaultW)),
            height:       Math.max(600, Math.round(Number(def.height) || defaultH)),
            checkpoints,
            spawns,
            waypoints,
            surfaceZones,
            obstacles,
            pickups,
        };
    },

    // ------------------------------------------------------------------
    // Option B: Tiled Map Editor (.tmj exported from Tiled 1.11+)
    // ------------------------------------------------------------------

    /**
     * @param {object} tiledJSON     - Parsed Tiled .tmj (game.tiledAssets.*.data)
     * @param {object} tileToSurface - { [tileId]: SURFACE object }
     */
    FromTiled(tiledJSON, tileToSurface = {}) {
        const getLayer = (name) => tiledJSON.layers?.find(l => l.name === name);
        const getProps = (obj)  => Object.fromEntries(
            (obj.properties ?? []).map(p => [p.name, p.value])
        );

        // Checkpoints
        const checkpoints = (getLayer('checkpoints')?.objects ?? [])
            .map(o => { const p = getProps(o); return { id: p.order ?? 0, x: o.x, y: o.y, w: o.width, h: o.height, rotation: (o.rotation ?? 0) * Math.PI / 180 }; })
            .sort((a, b) => a.id - b.id);

        // Waypoints
        const waypoints = (getLayer('waypoints')?.objects ?? [])
            .map(o => { const p = getProps(o); return { _ord: p.order ?? 0, x: o.x, y: o.y }; })
            .sort((a, b) => a._ord - b._ord)
            .map(({ x, y }) => ({ x, y }));

        // Spawns
        const spawns = (getLayer('spawns')?.objects ?? [])
            .map(o => { const p = getProps(o); return { _slot: p.slot ?? 0, x: o.x, y: o.y, rotation: (p.rotation ?? 0) * Math.PI / 180 }; })
            .sort((a, b) => a._slot - b._slot)
            .map(({ x, y, rotation }) => ({ x, y, rotation }));

        // Surface zones from tile layer
        const surfaceZones = CircuitLoader._tiledToSurfaceZones(tiledJSON, tileToSurface);

        // Map-level properties
        const mapProps = Object.fromEntries((tiledJSON.properties ?? []).map(p => [p.name, p.value]));
        const defaultW = typeof WORLD_W !== 'undefined' ? WORLD_W : 2400;
        const defaultH = typeof WORLD_H !== 'undefined' ? WORLD_H : 1800;

        return {
            name:   mapProps.name ?? 'Unnamed',
            laps:   mapProps.laps ?? 3,
            width:  (tiledJSON.width && tiledJSON.tilewidth) ? tiledJSON.width * tiledJSON.tilewidth : defaultW,
            height: (tiledJSON.height && tiledJSON.tileheight) ? tiledJSON.height * tiledJSON.tileheight : defaultH,
            checkpoints, spawns, waypoints, surfaceZones,
            obstacles: [], pickups: [],
        };
    },

    /** Converts a Tiled tile layer to rectangle surface zones via run-length encoding. @private */
    _tiledToSurfaceZones(tiledJSON, tileToSurface) {
        const layer = tiledJSON.layers?.find(l => l.name === 'road' && l.type === 'tilelayer');
        if (!layer) return [];
        const { tilewidth: tw, tileheight: th, width: cols, height: rows } = tiledJSON;
        const data = layer.data;
        const zones = [];
        for (let row = 0; row < rows; row++) {
            let runStart = -1, runTile = 0;
            for (let col = 0; col <= cols; col++) {
                const tid = col < cols ? data[row * cols + col] : 0;
                if (tid !== runTile || col === cols) {
                    if (runTile && tileToSurface[runTile]) {
                        zones.push({ x: runStart * tw, y: row * th, w: (col - runStart) * tw, h: th, rotation: 0, surface: tileToSurface[runTile] });
                    }
                    runStart = col; runTile = tid;
                }
            }
        }
        return zones;
    },
};

// #endregion
