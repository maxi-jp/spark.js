// =====================================================================
// Death Rally — Circuit System
// Race management: checkpoints, lap counting, race state machine,
// and circuit data loading (inline Option A  +  Tiled Option B).
//
// Load order: BEFORE death_rally.js
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
        this.nextCheckpoint   = 1;   // id expected next (0 = Start/Finish line)
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
            this.nextCheckpoint  = 1;
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
    /** @param {{ id:number, x:number, y:number, w:number, h:number }} def */
    constructor(def) {
        super(new Vector2(def.x, def.y));
        this.id       = def.id;
        this.w        = def.w;
        this.h        = def.h;
        this.isFinish = def.id === 0;
    }

    Start() {
        this._collider = new RectangleCollider(Vector2.Zero(), this.w, this.h, this);
        game.AddCollider(this._collider);
    }

    Draw(r) {
        if (!debugMode) return;
        const col = this.isFinish
            ? new Color(1, 0.84, 0, 0.30)
            : new Color(0, 0.85, 0.5, 0.25);
        r.DrawFillRectangle(this._position.x, this._position.y, this.w, this.h, col, 0);
        r.DrawStrokeRectangle(this._position.x, this._position.y, this.w, this.h,
            this.isFinish ? Color.FromRGB(255,215,0) : Color.FromRGB(0,220,140), 2, 0);
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
     * Reposition all registered cars to their spawn slots and restart the countdown.
     * Note: collected pickups are not respawned in this version.
     */
    RestartRace() {
        const spawns = this.circuit.spawns;
        let si = 0;
        for (const [car, prog] of this.progress) {
            const spawn = spawns[Math.min(si++, spawns.length - 1)];
            car._position.Set(spawn.x, spawn.y);
            car._rotation        = spawn.rotation;
            car.velocity.Set(0, 0);
            car.health           = car.maxHealth;
            car.isDead           = false;
            car.active           = true;
            car.hitFlash         = 0;
            car.currentWeapon    = 'NONE';
            car.ammo             = 0;
            prog.currentLap      = 0;
            prog.nextCheckpoint  = 1;
            prog.lapTimes        = [];
            prog.finished        = false;
        }
        this.finishOrder = [];
        this.state = RACE_STATE.IDLE;
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
 * (Option A — rapid prototyping) or a parsed Tiled JSON map (Option B — production).
 *
 * CircuitData shape:
 * {
 *   name:        string,
 *   laps:        number,
 *   checkpoints: { id, x, y, w, h }[],   // id=0 is Start/Finish
 *   spawns:      { x, y, rotation }[],   // slot 0 = player
 *   waypoints:   { x, y }[],             // ordered AI racing line
 *   surfaceZones:{ x, y, w, h, surface }[],
 *   obstacles:   { cx, cy, w, h, isBarrel?, color? }[],
 *   pickups:     { x, y, type, data }[],
 * }
 */
const CircuitLoader = {

    // ------------------------------------------------------------------
    // Option A: inline JavaScript circuit definition
    // ------------------------------------------------------------------

    /** @param {object} def - CIRCUIT_NAME constant from circuits/*.js */
    FromInline(def) {
        return {
            name:         def.name,
            laps:         def.laps         ?? 3,
            checkpoints:  def.checkpoints,
            spawns:       def.spawns,
            waypoints:    def.waypoints,
            surfaceZones: def.surfaceZones,
            obstacles:    def.obstacles    ?? [],
            pickups:      def.pickups      ?? [],
        };
    },

    // ------------------------------------------------------------------
    // Option B: Tiled Map Editor (.tmj exported from Tiled 1.11+)
    //
    // Tiled setup requirements:
    //   • Tile Layer Format: CSV
    //   • Embed tilesets: checked
    //   • Object layer "checkpoints" — rectangle objects, property {order: number}
    //   • Object layer "waypoints"   — point objects,     property {order: number}
    //   • Object layer "spawns"      — point objects,     property {slot: number, rotation?: degrees}
    //   • Tile layer "road"          — tile IDs mapped via tileToSurface
    //   • Map custom properties: name (string), laps (int)
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
            .map(o => { const p = getProps(o); return { id: p.order ?? 0, x: o.x, y: o.y, w: o.width, h: o.height }; })
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

        return {
            name: mapProps.name ?? 'Unnamed',
            laps: mapProps.laps ?? 3,
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
                        zones.push({ x: runStart * tw, y: row * th, w: (col - runStart) * tw, h: th, surface: tileToSurface[runTile] });
                    }
                    runStart = col; runTile = tid;
                }
            }
        }
        return zones;
    },
};

// #endregion
