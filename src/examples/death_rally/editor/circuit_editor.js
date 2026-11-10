// =====================================================================
// Death Rally — Circuit Editor
// Standalone visual authoring & live-testing tool for Death Rally circuits.
// Supports surface zones (rect, rotated rect, polygon, road path builder),
// walls/barrels, checkpoints, vehicle spawns, AI waypoints, and scheduled
// power-up/pickup spawns (with spawnLap & spawnTime), plus .JS/.JSON I/O
// and one-click embedded Test Race mode.
// =====================================================================

const SURFACE_KEYS = ['ASPHALT', 'GRAVEL', 'DIRT', 'OIL', 'GRASS'];

const OBSTACLE_COLOR_PRESETS = {
    C_WALL:      { label: 'Stone Wall (C_WALL)',         color: C_WALL     , hex: '#50463c' },
    C_WALL_OVAL: { label: 'Concrete Wall (C_WALL_OVAL)', color: C_WALL_OVAL, hex: '#c8c8d2' },
    C_DARKROAD:  { label: 'Dark Barrier (C_DARKROAD)',   color: C_DARKROAD , hex: '#28282d' },
    C_BARREL:    { label: 'Hazard Barrel (C_BARREL)',    color: C_BARREL   , hex: '#be5014' },
    C_TIRE:      { label: 'Tire Barrier (C_TIRE)',       color: C_TIRE     , hex: '#c8c8c8' },
    CUSTOM:      { label: 'Custom RGB...',               color: null       , hex: '#cc3326' },
};

const SPAWN_SLOT_COLORS = ['#ff3b30', '#00b0ff', '#ffd60a', '#30d158', '#bf5af2', '#ff9f0a'];
const SPAWN_SLOT_NAMES  = ['Player (Slot 0)', 'AI #1 (Slot 1)', 'AI #2 (Slot 2)', 'AI #3 (Slot 3)'];

function roundNum(n, decimals = 1) {
    const f = Math.pow(10, decimals);
    return Math.round((Number(n) || 0) * f) / f;
}

function radToDeg(r) {
    return roundNum(((Number(r) || 0) * 180) / Math.PI, 1);
}

function degToRadNum(d) {
    return ((Number(d) || 0) * Math.PI) / 180;
}

function colorToHex(col) {
    if (!col) return '#cc3326';
    const r = Math.round(Clamp(col.r ?? 0.8, 0, 1) * 255).toString(16).padStart(2, '0');
    const g = Math.round(Clamp(col.g ?? 0.2, 0, 1) * 255).toString(16).padStart(2, '0');
    const b = Math.round(Clamp(col.b ?? 0.15, 0, 1) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

function hexToColor(hex) {
    const clean = String(hex || '#cc3326').replace('#', '');
    const num = parseInt(clean, 16);
    if (Number.isNaN(num)) return C_WALL;
    return Color.FromRGB((num >> 16) & 255, (num >> 8) & 255, num & 255);
}

function matchColorPresetKey(col, isBarrel) {
    if (!col || typeof col !== 'object') return isBarrel ? 'C_BARREL' : 'C_WALL';
    const eps = 0.03;
    const close = (a, b) => Math.abs(a.r - b.r) < eps && Math.abs(a.g - b.g) < eps && Math.abs(a.b - b.b) < eps;
    if (close(col, C_WALL))      return 'C_WALL';
    if (close(col, C_WALL_OVAL)) return 'C_WALL_OVAL';
    if (close(col, C_DARKROAD))  return 'C_DARKROAD';
    if (close(col, C_TIRE))      return 'C_TIRE';
    if (close(col, C_BARREL))    return 'C_BARREL';
    return 'CUSTOM';
}

function matchSurfaceKey(surf) {
    if (typeof surf === 'string') {
        const up = surf.toUpperCase();
        if (SURFACE[up]) return up;
    }
    if (surf && typeof surf === 'object') {
        for (const k of SURFACE_KEYS) {
            if (SURFACE[k] === surf || (surf.name && SURFACE[k].name.toLowerCase() === surf.name.toLowerCase())) {
                return k;
            }
        }
    }
    return 'ASPHALT';
}

function toConstName(name) {
    const cleaned = String(name || 'CUSTOM_CIRCUIT')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return cleaned || 'CUSTOM_CIRCUIT';
}

class CircuitEditor {
    constructor() {
        this.canvas   = /** @type {HTMLCanvasElement} */ (document.getElementById('editor-canvas'));
        this.ctx      = this.canvas.getContext('2d');
        this.viewport = document.getElementById('editor-viewport');

        // Camera state (world → screen: sx = (wx - camX) * zoom + viewW/2)
        this.camX = 1200;
        this.camY = 900;
        this.zoom = 0.45;

        // Grid & snapping
        this.showGrid = true;
        this.snapSize = 10;

        // Active tool
        this.activeTool = 'select';

        // Tool creation defaults
        this.toolDefaults = {
            surfaceKey:     'ASPHALT',
            roadWidth:      240,
            roadClosedLoop: true,
            roadMakeWps:    true,
            wallColorKey:   'C_WALL',
            wallCustomHex:  '#cc3326',
            wallChainMode:  false,
            wallThickness:  24,
            barrelDiameter: 28,
            barrelColorKey: 'C_BARREL',
            barrelCustomHex:'#be5014',
            checkpointW:    220,
            checkpointH:    26,
            spawnSlot:      0,
            pickupType:     'weapon',
            pickupWeapon:   'MACHINEGUN',
            pickupAmount:   50,
            pickupSpawnLap: 1,
            pickupSpawnTime:0,
        };

        // Layer visibility & lock state
        this.layers = {
            surfaces:    { visible: true, locked: false },
            obstacles:   { visible: true, locked: false },
            checkpoints: { visible: true, locked: false },
            spawns:      { visible: true, locked: false },
            waypoints:   { visible: true, locked: false },
            pickups:     { visible: true, locked: false },
        };

        // Selection state: { layer: string, index: number } | null
        this.selected = null;
        this.hovered  = null;

        // Interaction state
        this.isPanning      = false;
        this.spaceHeld      = false;
        this.panStartMouse  = { x: 0, y: 0 };
        this.panStartCam    = { x: 0, y: 0 };
        this.mouseWorld     = { x: 0, y: 0 };
        this.mouseSnapped   = { x: 0, y: 0 };
        this.dragAction     = null; // { type: 'move'|'resize'|'rotate'|'poly_vertex'|'create_rect'|'aim_spawn', ... }
        this.activePoints   = [];   // Used by surface_poly, road_brush, and wallChainMode

        // Undo / Redo stacks (JSON snapshots of this.circuit)
        this.undoStack = [];
        this.redoStack = [];

        // Current circuit model
        this.circuit = this._createBlankCircuit();

        // Live Test Race state
        this.isTestingRace     = false;
        this.testGameInitialized = false;
        this.telemetryTimer    = null;

        this._initUI();
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());

        // Load OVAL_TRACK by default so user immediately sees a complete example
        if (typeof OVAL_TRACK !== 'undefined') {
            this.loadFromDefinition(OVAL_TRACK, 'OVAL_TRACK', false);
        } else {
            this.loadFromDefinition(this._createBlankCircuit(), 'CUSTOM_CIRCUIT', false);
        }
        this.fitToView();
        this._requestRedraw();
    }

    _createBlankCircuit() {
        return {
            name:         'Custom Circuit',
            constName:    'CUSTOM_CIRCUIT',
            laps:         3,
            width:        2400,
            height:       1800,
            surfaceZones: [],
            obstacles:    [],
            checkpoints:  [
                { id: 0, x: 400, y: 900, w: 240, h: 28, rotation: 0 },
                { id: 1, x: 1200, y: 350, w: 28, h: 240, rotation: 0 },
                { id: 2, x: 2000, y: 900, w: 240, h: 28, rotation: 0 },
                { id: 3, x: 1200, y: 1450, w: 28, h: 240, rotation: 0 },
            ],
            spawns: [
                { x: 365, y: 960, rotation: 0 },
                { x: 435, y: 960, rotation: 0 },
                { x: 365, y: 1020, rotation: 0 },
                { x: 435, y: 1020, rotation: 0 },
            ],
            waypoints: [],
            pickups:   [],
        };
    }

    // ── Undo / Redo ──────────────────────────────────────────────────

    _pushUndo() {
        const snap = JSON.stringify(this.circuit);
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snap) {
            return;
        }
        this.undoStack.push(snap);
        if (this.undoStack.length > 60) this.undoStack.shift();
        this.redoStack = [];
        this._updateUndoRedoButtons();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        this.redoStack.push(JSON.stringify(this.circuit));
        const prev = JSON.parse(this.undoStack.pop());
        this.circuit = prev;
        this.selected = null;
        this._syncCircuitHeaderInputs();
        this._refreshAllPanels();
        this._updateUndoRedoButtons();
        this._requestRedraw();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        this.undoStack.push(JSON.stringify(this.circuit));
        const next = JSON.parse(this.redoStack.pop());
        this.circuit = next;
        this.selected = null;
        this._syncCircuitHeaderInputs();
        this._refreshAllPanels();
        this._updateUndoRedoButtons();
        this._requestRedraw();
    }

    _updateUndoRedoButtons() {
        const u = /** @type {HTMLButtonElement} */ (document.getElementById('btn-undo'));
        const r = /** @type {HTMLButtonElement} */ (document.getElementById('btn-redo'));
        if (u) u.disabled = this.undoStack.length === 0;
        if (r) r.disabled = this.redoStack.length === 0;
    }

    // ── Import / Export ──────────────────────────────────────────────

    /**
     * Normalises any inline circuit object into the editor's editable structure.
     */
    loadFromDefinition(def, constNameHint = '', recordUndo = true) {
        if (recordUndo) this._pushUndo();

        const norm = CircuitLoader.FromInline(def);
        const cName = constNameHint || def.constName || toConstName(norm.name);

        this.circuit = {
            name:      norm.name || 'Custom Circuit',
            constName: cName,
            laps:      norm.laps || 3,
            width:     norm.width || WORLD_W,
            height:    norm.height || WORLD_H,
            surfaceZones: (def.surfaceZones ?? []).map(z => {
                const surfaceKey = matchSurfaceKey(z.surfaceKey ?? z.surface);
                if (Array.isArray(z.points) && z.points.length >= 3) {
                    return {
                        points: z.points.map(pt => ({ x: roundNum(pt.x), y: roundNum(pt.y) })),
                        surfaceKey,
                    };
                }
                return {
                    x:          roundNum(z.x ?? 0),
                    y:          roundNum(z.y ?? 0),
                    w:          roundNum(Math.max(10, z.w ?? 100)),
                    h:          roundNum(Math.max(10, z.h ?? 100)),
                    rotation:   Number(z.rotation ?? 0),
                    surfaceKey,
                };
            }),
            obstacles: (norm.obstacles ?? []).map((ob, idx) => {
                const rawOb    = def.obstacles?.[idx] || {};
                const isBarrel = Boolean(ob.isBarrel);
                const colorKey = (rawOb.colorKey && OBSTACLE_COLOR_PRESETS[rawOb.colorKey])
                    ? rawOb.colorKey
                    : matchColorPresetKey(ob.color, isBarrel);
                return {
                    cx:        roundNum(ob.cx),
                    cy:        roundNum(ob.cy),
                    w:         roundNum(ob.w),
                    h:         roundNum(isBarrel ? ob.w : ob.h),
                    colorKey,
                    customHex: rawOb.customHex || colorToHex(ob.color),
                    isBarrel,
                    rotation:  Number(ob.rotation ?? 0),
                };
            }),
            checkpoints: (norm.checkpoints ?? []).map((cp, idx) => ({
                id:       cp.id ?? idx,
                x:        roundNum(cp.x),
                y:        roundNum(cp.y),
                w:        roundNum(cp.w),
                h:        roundNum(cp.h),
                rotation: Number(cp.rotation ?? 0),
            })),
            spawns: (norm.spawns ?? []).map(s => ({
                x:        roundNum(s.x),
                y:        roundNum(s.y),
                rotation: Number(s.rotation ?? 0),
            })),
            waypoints: (norm.waypoints ?? []).map(w => ({
                x: roundNum(w.x),
                y: roundNum(w.y),
            })),
            pickups: (norm.pickups ?? []).map(p => ({
                x:         roundNum(p.x),
                y:         roundNum(p.y),
                type:      p.type || 'weapon',
                data:      p.data ?? (p.type === 'weapon' ? 'MACHINEGUN' : 50),
                spawnLap:  Math.max(1, Math.round(Number(p.spawnLap ?? 1))),
                spawnTime: Math.max(0, roundNum(Number(p.spawnTime ?? 0), 1)),
            })),
        };

        this.selected = null;
        this.activePoints = [];
        this._syncCircuitHeaderInputs();
        this._refreshAllPanels();
        this._requestRedraw();
    }

    /**
     * Converts the editor's current state into a runtime definition ready for `CircuitLoader.FromInline`.
     */
    toRuntimeDefinition() {
        const c = this.circuit;
        return {
            name:   c.name,
            laps:   Number(c.laps) || 3,
            width:  Number(c.width) || WORLD_W,
            height: Number(c.height) || WORLD_H,
            checkpoints: c.checkpoints.map(cp => ({
                id:       Number(cp.id),
                x:        roundNum(cp.x),
                y:        roundNum(cp.y),
                w:        roundNum(cp.w),
                h:        roundNum(cp.h),
                rotation: Number(cp.rotation || 0),
            })),
            spawns: c.spawns.map(s => ({
                x:        roundNum(s.x),
                y:        roundNum(s.y),
                rotation: Number(s.rotation || 0),
            })),
            waypoints: c.waypoints.map(w => ({
                x: roundNum(w.x),
                y: roundNum(w.y),
            })),
            surfaceZones: c.surfaceZones.map(z => {
                const surface = SURFACE[z.surfaceKey] ?? SURFACE.ASPHALT;
                if (Array.isArray(z.points) && z.points.length >= 3) {
                    return {
                        points: z.points.map(pt => ({ x: roundNum(pt.x), y: roundNum(pt.y) })),
                        surface,
                        surfaceKey: z.surfaceKey,
                    };
                }
                return {
                    x:          roundNum(z.x),
                    y:          roundNum(z.y),
                    w:          roundNum(z.w),
                    h:          roundNum(z.h),
                    rotation:   Number(z.rotation || 0),
                    surface,
                    surfaceKey: z.surfaceKey,
                };
            }),
            obstacles: c.obstacles.map(ob => {
                const preset = OBSTACLE_COLOR_PRESETS[ob.colorKey];
                const color  = preset?.color ?? hexToColor(ob.customHex);
                return {
                    cx:       roundNum(ob.cx),
                    cy:       roundNum(ob.cy),
                    w:        roundNum(ob.w),
                    h:        roundNum(ob.isBarrel ? ob.w : ob.h),
                    color,
                    isBarrel: Boolean(ob.isBarrel),
                    rotation: Number(ob.rotation || 0),
                };
            }),
            pickups: c.pickups.map(pk => ({
                x:         roundNum(pk.x),
                y:         roundNum(pk.y),
                type:      pk.type,
                data:      pk.type === 'weapon' ? String(pk.data) : Number(pk.data),
                spawnLap:  Math.max(1, Math.round(Number(pk.spawnLap ?? 1))),
                spawnTime: Math.max(0, roundNum(Number(pk.spawnTime ?? 0), 1)),
            })),
        };
    }

    /**
     * Generates formatted `.js` source code matching `src/examples/death_rally/circuits/*.js`.
     */
    generateJSCode() {
        const c = this.circuit;
        const constName = toConstName(c.constName || c.name);
        const lines = [];

        lines.push(`// =====================================================================`);
        lines.push(`// Circuit: ${c.name}`);
        lines.push(`// Generated by spark.js Death Rally Circuit Editor`);
        lines.push(`// Requires: death_rally_defs.js (SURFACE, C_WALL, C_TIRE, C_BARREL, etc.)`);
        lines.push(`// =====================================================================`);
        lines.push(``);
        lines.push(`const ${constName} = {`);
        lines.push(`    name:   ${JSON.stringify(c.name)},`);
        lines.push(`    laps:   ${Number(c.laps) || 3},`);
        lines.push(`    width:  ${Number(c.width) || WORLD_W},`);
        lines.push(`    height: ${Number(c.height) || WORLD_H},`);
        lines.push(``);

        // Checkpoints
        lines.push(`    // ── Checkpoints (id=0 = Start/Finish) ────────────────────────────`);
        lines.push(`    checkpoints: [`);
        for (const cp of c.checkpoints) {
            lines.push(`        { id: ${cp.id}, x: ${roundNum(cp.x)}, y: ${roundNum(cp.y)}, w: ${roundNum(cp.w)}, h: ${roundNum(cp.h)}, rotation: ${roundNum(cp.rotation || 0, 4)} },`);
        }
        lines.push(`    ],`);
        lines.push(``);

        // Spawns
        lines.push(`    // ── Spawn slots (0 = Player, 1..3 = AI) ──────────────────────────`);
        lines.push(`    spawns: [`);
        for (const sp of c.spawns) {
            lines.push(`        { x: ${roundNum(sp.x)}, y: ${roundNum(sp.y)}, rotation: ${roundNum(sp.rotation || 0, 4)} },`);
        }
        lines.push(`    ],`);
        lines.push(``);

        // Waypoints
        lines.push(`    // ── AI Waypoints (ordered closed loop) ───────────────────────────`);
        lines.push(`    waypoints: [`);
        for (const wp of c.waypoints) {
            lines.push(`        { x: ${roundNum(wp.x)}, y: ${roundNum(wp.y)} },`);
        }
        lines.push(`    ],`);
        lines.push(``);

        // Surface zones
        lines.push(`    // ── Surface zones (last match wins; unmatched = GRASS) ───────────`);
        lines.push(`    surfaceZones: [`);
        for (const z of c.surfaceZones) {
            const surfExpr = `SURFACE.${z.surfaceKey || 'ASPHALT'}`;
            if (Array.isArray(z.points) && z.points.length >= 3) {
                const ptsStr = z.points.map(pt => `{ x: ${roundNum(pt.x)}, y: ${roundNum(pt.y)} }`).join(', ');
                lines.push(`        { points: [${ptsStr}], surface: ${surfExpr} },`);
            } else {
                lines.push(`        { x: ${roundNum(z.x)}, y: ${roundNum(z.y)}, w: ${roundNum(z.w)}, h: ${roundNum(z.h)}, rotation: ${roundNum(z.rotation || 0, 4)}, surface: ${surfExpr} },`);
            }
        }
        lines.push(`    ],`);
        lines.push(``);

        // Obstacles
        lines.push(`    // ── Obstacles ────────────────────────────────────────────────────`);
        lines.push(`    obstacles: [`);
        for (const ob of c.obstacles) {
            let colorExpr = ob.colorKey || (ob.isBarrel ? 'C_BARREL' : 'C_WALL');
            if (colorExpr === 'CUSTOM') {
                const col = hexToColor(ob.customHex);
                colorExpr = `Color.FromRGB(${Math.round(col.r * 255)}, ${Math.round(col.g * 255)}, ${Math.round(col.b * 255)})`;
            }
            lines.push(`        { cx: ${roundNum(ob.cx)}, cy: ${roundNum(ob.cy)}, w: ${roundNum(ob.w)}, h: ${roundNum(ob.isBarrel ? ob.w : ob.h)}, color: ${colorExpr}, isBarrel: ${Boolean(ob.isBarrel)}, rotation: ${roundNum(ob.rotation || 0, 4)} },`);
        }
        lines.push(`    ],`);
        lines.push(``);

        // Pickups
        lines.push(`    // ── Power-up & Pickup Spawns ─────────────────────────────────────`);
        lines.push(`    pickups: [`);
        for (const pk of c.pickups) {
            const dataExpr = pk.type === 'weapon' ? JSON.stringify(pk.data) : Number(pk.data);
            const sLap     = Math.max(1, Math.round(Number(pk.spawnLap ?? 1)));
            const sTime    = Math.max(0, roundNum(Number(pk.spawnTime ?? 0), 1));
            lines.push(`        { x: ${roundNum(pk.x)}, y: ${roundNum(pk.y)}, type: ${JSON.stringify(pk.type)}, data: ${dataExpr}, spawnLap: ${sLap}, spawnTime: ${sTime} },`);
        }
        lines.push(`    ],`);
        lines.push(`};`);
        lines.push(``);

        return lines.join('\n');
    }

    /**
     * Generates portable JSON string for saving/loading `.json` circuit files.
     */
    generateJSONCode() {
        return JSON.stringify(this.circuit, null, 4);
    }

    /**
     * Parses a `.js` or `.json` string and loads it into the editor.
     */
    importFromText(text, filenameHint = '') {
        const trimmed = String(text || '').trim();
        if (!trimmed) throw new Error('Empty input.');

        // 1. Try direct JSON first
        if (trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                this.loadFromDefinition(parsed, parsed.constName || toConstName(parsed.name));
                return;
            } catch (_) {
                // Fall through to JS object literal evaluation
            }
        }

        // 2. Extract const <NAME> = { ... } if present
        let constName = '';
        const match = trimmed.match(/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/);
        if (match) {
            constName = match[1];
        } else if (filenameHint) {
            constName = toConstName(filenameHint.replace(/\.(js|json)$/i, ''));
        }

        // Evaluate inside a function scope with engine constants bound
        const exprBody = match
            ? `${trimmed}\nreturn ${constName};`
            : `return (${trimmed.replace(/;+\s*$/, '')});`;

        const fn = new Function(
            'SURFACE', 'C_WALL', 'C_WALL_OVAL', 'C_DARKROAD', 'C_TIRE', 'C_BARREL',
            'C_WHITE', 'C_BLACK', 'Color', 'WORLD_W', 'WORLD_H', 'Math',
            exprBody
        );
        const result = fn(
            SURFACE, C_WALL, C_WALL_OVAL, C_DARKROAD, C_TIRE, C_BARREL,
            C_WHITE, C_BLACK, Color, WORLD_W, WORLD_H, Math
        );

        if (!result || typeof result !== 'object') {
            throw new Error('Could not evaluate a valid circuit object from the input.');
        }

        this.loadFromDefinition(result, constName || toConstName(result.name));
    }

    // ── UI Setup & Panels ────────────────────────────────────────────

    _initUI() {
        // Preset loading
        document.getElementById('btn-load-preset').addEventListener('click', () => {
            const val = /** @type {HTMLSelectElement} */ (document.getElementById('preset-select')).value;
            if (val === 'BLANK') {
                this.loadFromDefinition(this._createBlankCircuit(), 'CUSTOM_CIRCUIT');
            } else if (val === 'OVAL_TRACK' && typeof OVAL_TRACK !== 'undefined') {
                this.loadFromDefinition(OVAL_TRACK, 'OVAL_TRACK');
            } else if (val === 'FIGURE_EIGHT' && typeof FIGURE_EIGHT !== 'undefined') {
                this.loadFromDefinition(FIGURE_EIGHT, 'FIGURE_EIGHT');
            } else if (val === 'FINAL_CIRCUIT' && typeof FINAL_CIRCUIT !== 'undefined') {
                this.loadFromDefinition(FINAL_CIRCUIT, 'FINAL_CIRCUIT');
            } else if (val === 'PLAYGROUND_CIRCUIT' && typeof PLAYGROUND_CIRCUIT !== 'undefined') {
                this.loadFromDefinition(PLAYGROUND_CIRCUIT, 'PLAYGROUND_CIRCUIT');
            }
            this.fitToView();
        });

        // File load input
        const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('file-load-input'));
        fileInput.addEventListener('change', (e) => {
            const file = fileInput.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    this.importFromText(String(reader.result || ''), file.name);
                    this.fitToView();
                } catch (err) {
                    alert('Failed to load circuit file:\n' + err.message);
                }
                fileInput.value = '';
            };
            reader.readAsText(file);
        });

        // Drag & drop file onto viewport
        this.viewport.addEventListener('dragover', (e) => { e.preventDefault(); });
        this.viewport.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer?.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    this.importFromText(String(reader.result || ''), file.name);
                    this.fitToView();
                } catch (err) {
                    alert('Failed to load dropped file:\n' + err.message);
                }
            };
            reader.readAsText(file);
        });

        // Paste / View Code modal
        document.getElementById('btn-import-code').addEventListener('click', () => this._openCodeModal('import'));
        document.getElementById('btn-view-code').addEventListener('click',   () => this._openCodeModal('view'));
        document.getElementById('btn-close-modal').addEventListener('click', () => {
            document.getElementById('code-modal').style.display = 'none';
        });
        document.getElementById('btn-modal-copy').addEventListener('click', () => {
            const ta = /** @type {HTMLTextAreaElement} */ (document.getElementById('code-modal-textarea'));
            navigator.clipboard.writeText(ta.value).then(() => {
                const fb = document.getElementById('code-modal-feedback');
                fb.textContent = '✓ Copied to clipboard!';
                setTimeout(() => { fb.textContent = ''; }, 2200);
            });
        });
        document.getElementById('btn-modal-download-js').addEventListener('click', () => this.downloadJS());
        document.getElementById('btn-modal-import-apply').addEventListener('click', () => {
            const ta = /** @type {HTMLTextAreaElement} */ (document.getElementById('code-modal-textarea'));
            try {
                this.importFromText(ta.value);
                document.getElementById('code-modal').style.display = 'none';
                this.fitToView();
            } catch (err) {
                alert('Error parsing circuit code:\n' + err.message);
            }
        });

        // Export buttons
        document.getElementById('btn-export-js').addEventListener('click',   () => this.downloadJS());
        document.getElementById('btn-export-json').addEventListener('click', () => this.downloadJSON());

        // Undo / Redo
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());

        // Grid & Snap
        const chkGrid = /** @type {HTMLInputElement} */ (document.getElementById('chk-show-grid'));
        chkGrid.addEventListener('change', () => {
            this.showGrid = chkGrid.checked;
            this._requestRedraw();
        });
        const snapSel = /** @type {HTMLSelectElement} */ (document.getElementById('snap-select'));
        snapSel.addEventListener('change', () => {
            this.snapSize = Number(snapSel.value) || 0;
        });

        // Zoom controls
        document.getElementById('btn-zoom-in').addEventListener('click',  () => this._zoomBy(1.25));
        document.getElementById('btn-zoom-out').addEventListener('click', () => this._zoomBy(0.8));
        document.getElementById('zoom-label').addEventListener('click',   () => { this.zoom = 1.0; this._updateZoomLabel(); this._requestRedraw(); });
        document.getElementById('btn-zoom-fit').addEventListener('click', () => this.fitToView());

        // Active drawing banner buttons
        document.getElementById('btn-finish-drawing').addEventListener('click', () => this._commitActiveDrawing());
        document.getElementById('btn-cancel-drawing').addEventListener('click', () => this._cancelActiveDrawing());

        // Tool buttons
        document.querySelectorAll('#tool-buttons .tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.getAttribute('data-tool');
                if (tool) this.setTool(tool);
            });
        });

        // Layer visibility & lock
        document.querySelectorAll('#layer-toggles .layer-row').forEach(row => {
            const layer = row.getAttribute('data-layer');
            const visChk = /** @type {HTMLInputElement} */ (row.querySelector('.layer-vis'));
            const lockBtn = /** @type {HTMLButtonElement} */ (row.querySelector('.layer-lock-btn'));

            visChk.addEventListener('change', () => {
                this.layers[layer].visible = visChk.checked;
                if (!visChk.checked && this.selected?.layer === layer) {
                    this.selected = null;
                    this._renderInspector();
                }
                this._requestRedraw();
            });

            lockBtn.addEventListener('click', () => {
                const locked = !this.layers[layer].locked;
                this.layers[layer].locked = locked;
                lockBtn.textContent = locked ? '🔒' : '🔓';
                lockBtn.classList.toggle('locked', locked);
                if (locked && this.selected?.layer === layer) {
                    this.selected = null;
                    this._renderInspector();
                }
                this._requestRedraw();
            });
        });

        // Circuit header properties
        const nameIn  = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-name'));
        const constIn = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-const'));
        const lapsIn  = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-laps'));
        const wIn     = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-w'));
        const hIn     = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-h'));

        nameIn.addEventListener('change', () => {
            this._pushUndo();
            this.circuit.name = nameIn.value.trim() || 'Custom Circuit';
            if (!constIn.dataset.userEdited) {
                this.circuit.constName = toConstName(this.circuit.name);
                constIn.value = this.circuit.constName;
            }
        });
        constIn.addEventListener('change', () => {
            constIn.dataset.userEdited = '1';
            this.circuit.constName = toConstName(constIn.value);
            constIn.value = this.circuit.constName;
        });
        lapsIn.addEventListener('change', () => {
            this._pushUndo();
            this.circuit.laps = Math.max(1, Math.min(99, parseInt(lapsIn.value, 10) || 3));
            lapsIn.value = String(this.circuit.laps);
        });
        wIn.addEventListener('change', () => {
            this._pushUndo();
            this.circuit.width = Math.max(600, Math.min(12000, parseInt(wIn.value, 10) || 2400));
            wIn.value = String(this.circuit.width);
            this._requestRedraw();
        });
        hIn.addEventListener('change', () => {
            this._pushUndo();
            this.circuit.height = Math.max(600, Math.min(12000, parseInt(hIn.value, 10) || 1800));
            hIn.value = String(this.circuit.height);
            this._requestRedraw();
        });

        // Outliner filter
        document.getElementById('outliner-filter').addEventListener('change', () => this._renderOutliner());

        // Test Race controls
        document.getElementById('btn-test-race').addEventListener('click',  () => this.startTestRace());
        document.getElementById('btn-stop-test').addEventListener('click',  () => this.stopTestRace());
        document.getElementById('btn-restart-test').addEventListener('click', () => {
            if (game?.raceManager) game.raceManager.RestartRace();
        });
        document.getElementById('btn-test-toggle-colliders').addEventListener('click', () => {
            if (game) game.config.drawColliders = !game.config.drawColliders;
        });
        document.getElementById('btn-test-toggle-debug').addEventListener('click', () => {
            debugMode = !debugMode;
        });
        document.getElementById('btn-test-heal').addEventListener('click', () => {
            if (game?.playerCar) {
                game.playerCar.health = game.playerCar.maxHealth;
                game.playerCar.isDead = false;
            }
        });

        // Canvas & Keyboard events
        this._initCanvasEvents();
        this._renderToolOptions();
    }

    _syncCircuitHeaderInputs() {
        const nameIn  = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-name'));
        const constIn = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-const'));
        const lapsIn  = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-laps'));
        const wIn     = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-w'));
        const hIn     = /** @type {HTMLInputElement} */ (document.getElementById('prop-circuit-h'));

        if (nameIn)  nameIn.value  = this.circuit.name;
        if (constIn) constIn.value = this.circuit.constName;
        if (lapsIn)  lapsIn.value  = String(this.circuit.laps);
        if (wIn)     wIn.value     = String(this.circuit.width);
        if (hIn)     hIn.value     = String(this.circuit.height);
    }

    setTool(toolName) {
        if (this.activePoints.length > 0) {
            this._cancelActiveDrawing();
        }
        this.activeTool = toolName;
        document.querySelectorAll('#tool-buttons .tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tool') === toolName);
        });
        this._renderToolOptions();
        this._updateStatusHint();
        this._requestRedraw();
    }

    _updateStatusHint() {
        const hints = {
            select:          'Click object to select • Drag to move • Drag handles to resize/rotate • Del: Delete • Ctrl+D: Duplicate',
            surface_rect:    'Left-drag on canvas to draw a Rectangular Surface Zone',
            surface_poly:    'Click vertices to build a Polygon Surface Zone • Double-click or Enter to finish • Esc to cancel',
            road_brush:      'Click centerline points along your track • Enter or Finish button generates road strip (& optional waypoints)',
            obstacle_wall:   'Left-drag to draw a Wall Barrier (or enable Wall Chain mode to click-connect barriers)',
            obstacle_barrel: 'Click on canvas to place a circular Barrel / Tire obstacle',
            checkpoint:      'Left-drag (or click) to place a Checkpoint gate (CP #0 = Start/Finish line)',
            spawn:           'Click to place & drag to aim Vehicle Spawn slot (0 = Player, 1..3 = AI)',
            waypoint:        'Click to append AI Waypoint (or click on an existing orange segment to insert between waypoints)',
            pickup:          'Click to place a Power-Up / Pickup with configured type, value, spawnLap & spawnTime',
        };
        const el = document.getElementById('status-hint');
        if (el) el.textContent = hints[this.activeTool] || '';
    }

    _refreshAllPanels() {
        this._updateLayerCounts();
        this._renderValidation();
        this._renderInspector();
        this._renderOutliner();
    }

    _updateLayerCounts() {
        const c = this.circuit;
        const map = {
            surfaces:    c.surfaceZones.length,
            obstacles:   c.obstacles.length,
            checkpoints: c.checkpoints.length,
            spawns:      c.spawns.length,
            waypoints:   c.waypoints.length,
            pickups:     c.pickups.length,
        };
        for (const [k, v] of Object.entries(map)) {
            const el = document.getElementById(`count-${k}`);
            if (el) el.textContent = String(v);
        }
    }

    _renderValidation() {
        const c = this.circuit;
        const container = document.getElementById('validation-list');
        if (!container) return;

        const hasSF = c.checkpoints.some(cp => cp.id === 0);
        const cpCount = c.checkpoints.length;
        const spawnCount = c.spawns.length;
        const wpCount = c.waypoints.length;
        const surfCount = c.surfaceZones.length;

        const items = [
            {
                ok: hasSF && cpCount >= 2,
                text: hasSF
                    ? `Checkpoints: ${cpCount} (Start/Finish #0 ready)`
                    : `Missing Start/Finish (Checkpoint #0)`,
            },
            {
                ok: spawnCount >= 4,
                text: spawnCount >= 4
                    ? `Vehicle Spawns: ${spawnCount} (Player + 3 AI)`
                    : `Vehicle Spawns: ${spawnCount}/4 (Need 4 for full grid)`,
            },
            {
                ok: wpCount >= 4,
                text: wpCount >= 4
                    ? `AI Waypoints: ${wpCount} nodes in loop`
                    : `AI Waypoints: ${wpCount} (Add >= 4 for AI navigation)`,
            },
            {
                ok: surfCount >= 1,
                text: surfCount >= 1
                    ? `Surface Zones: ${surfCount} defined`
                    : `No Surface Zones (Entire world is Grass)`,
            },
        ];

        container.innerHTML = items.map(it =>
            `<div class="val-item ${it.ok ? 'ok' : 'warn'}">
                <span>${it.ok ? '✔' : '⚠'}</span>
                <span>${it.text}</span>
            </div>`
        ).join('');
    }

    // ── Tool Defaults Panel ──────────────────────────────────────────

    _renderToolOptions() {
        const body  = document.getElementById('tool-options-body');
        const title = document.getElementById('tool-options-title');
        if (!body || !title) return;

        const td = this.toolDefaults;
        const t  = this.activeTool;

        const surfOptions = SURFACE_KEYS.map(k =>
            `<option value="${k}" ${td.surfaceKey === k ? 'selected' : ''}>${SURFACE[k].name} (${k})</option>`
        ).join('');

        if (t === 'select') {
            title.textContent = '⚙ Quick Track Helpers';
            body.innerHTML = `
                <button class="tb-btn" id="hlp-grid-spawns" title="Places 4 car spawns in a 2x2 grid behind Checkpoint #0">
                    🏎 Auto-Place 2×2 Grid at S/F
                </button>
                <button class="tb-btn" id="hlp-reverse-wps" title="Reverses the order of AI waypoints">
                    ⇄ Reverse AI Waypoints
                </button>
                <button class="tb-btn" id="hlp-reindex-cps" title="Numbers all checkpoints 0, 1, 2... in array order">
                    🔢 Re-Index Checkpoints (0..N)
                </button>
            `;
            document.getElementById('hlp-grid-spawns')?.addEventListener('click', () => this.autoPlaceStartingGrid());
            document.getElementById('hlp-reverse-wps')?.addEventListener('click', () => {
                if (this.circuit.waypoints.length > 1) {
                    this._pushUndo();
                    const first = this.circuit.waypoints[0];
                    const rest  = this.circuit.waypoints.slice(1).reverse();
                    this.circuit.waypoints = [first, ...rest];
                    this._refreshAllPanels();
                    this._requestRedraw();
                }
            });
            document.getElementById('hlp-reindex-cps')?.addEventListener('click', () => {
                this._pushUndo();
                this.circuit.checkpoints.forEach((cp, idx) => { cp.id = idx; });
                this._refreshAllPanels();
                this._requestRedraw();
            });
            return;
        }

        if (t === 'surface_rect' || t === 'surface_poly') {
            title.textContent = t === 'surface_rect' ? '▭ Surface Rect Options' : '⬠ Surface Poly Options';
            body.innerHTML = `
                <div class="form-row">
                    <label>Terrain</label>
                    <select id="opt-surf-key" class="form-input">${surfOptions}</select>
                </div>
                <div class="inspector-note">
                    ${t === 'surface_rect'
                        ? 'Drag on the canvas to create a surface rectangle. Use the Select tool (V) to rotate or resize.'
                        : 'Click points on the canvas to define polygon corners. Press Enter or double-click to close.'}
                </div>
            `;
            document.getElementById('opt-surf-key')?.addEventListener('change', (e) => {
                td.surfaceKey = e.target.value;
            });
            return;
        }

        if (t === 'road_brush') {
            title.textContent = '🛣 Road Path Builder';
            body.innerHTML = `
                <div class="form-row">
                    <label>Terrain</label>
                    <select id="opt-road-surf" class="form-input">${surfOptions}</select>
                </div>
                <div class="form-row">
                    <label>Width (px)</label>
                    <input type="number" id="opt-road-w" class="form-input" min="40" max="800" step="10" value="${td.roadWidth}">
                </div>
                <label class="tb-checkbox-label">
                    <input type="checkbox" id="opt-road-loop" ${td.roadClosedLoop ? 'checked' : ''}> Closed Loop Track
                </label>
                <label class="tb-checkbox-label">
                    <input type="checkbox" id="opt-road-wps" ${td.roadMakeWps ? 'checked' : ''}> Also set AI Waypoints
                </label>
                <div class="inspector-note">
                    Click centerline points around the circuit. Press <b>Enter</b> or click <b>Finish</b> to generate road polygon segments!
                </div>
            `;
            document.getElementById('opt-road-surf')?.addEventListener('change', e => { td.surfaceKey = e.target.value; });
            document.getElementById('opt-road-w')?.addEventListener('change', e => {
                td.roadWidth = Math.max(40, Math.min(800, Number(e.target.value) || 240));
                this._requestRedraw();
            });
            document.getElementById('opt-road-loop')?.addEventListener('change', e => {
                td.roadClosedLoop = e.target.checked;
                this._requestRedraw();
            });
            document.getElementById('opt-road-wps')?.addEventListener('change', e => {
                td.roadMakeWps = e.target.checked;
            });
            return;
        }

        if (t === 'obstacle_wall') {
            title.textContent = '🧱 Wall Barrier Options';
            const colorOpts = Object.entries(OBSTACLE_COLOR_PRESETS).map(([k, v]) =>
                `<option value="${k}" ${td.wallColorKey === k ? 'selected' : ''}>${v.label}</option>`
            ).join('');
            const previewCss = this._resolveObstacleCss(td.wallColorKey, td.wallCustomHex);
            body.innerHTML = `
                <div class="form-row">
                    <label>Color</label>
                    <span class="layer-swatch" style="background:${previewCss};width:16px;height:16px;flex-shrink:0"></span>
                    <select id="opt-wall-col" class="form-input">${colorOpts}</select>
                </div>
                <div class="form-row" id="opt-wall-hex-row" style="display:${td.wallColorKey === 'CUSTOM' ? 'flex' : 'none'}">
                    <label>Custom</label>
                    <input type="color" id="opt-wall-hex" class="form-input" value="${td.wallCustomHex}">
                </div>
                <label class="tb-checkbox-label">
                    <input type="checkbox" id="opt-wall-chain" ${td.wallChainMode ? 'checked' : ''}> Wall Chain Mode (click-to-click)
                </label>
                <div class="form-row" id="opt-wall-thick-row" style="display:${td.wallChainMode ? 'flex' : 'none'}">
                    <label>Thickness</label>
                    <input type="number" id="opt-wall-thick" class="form-input" min="8" max="200" value="${td.wallThickness}">
                </div>
            `;
            document.getElementById('opt-wall-col')?.addEventListener('change', e => {
                td.wallColorKey = e.target.value;
                this._renderToolOptions();
            });
            document.getElementById('opt-wall-hex')?.addEventListener('change', e => {
                td.wallCustomHex = e.target.value;
                this._renderToolOptions();
            });
            document.getElementById('opt-wall-chain')?.addEventListener('change', e => {
                td.wallChainMode = e.target.checked;
                this.activePoints = [];
                this._updateDrawingBanner();
                this._renderToolOptions();
            });
            document.getElementById('opt-wall-thick')?.addEventListener('change', e => {
                td.wallThickness = Math.max(8, Number(e.target.value) || 24);
            });
            return;
        }

        if (t === 'obstacle_barrel') {
            title.textContent = '🛢 Barrel / Tire Options';
            const colorOpts = Object.entries(OBSTACLE_COLOR_PRESETS).map(([k, v]) =>
                `<option value="${k}" ${td.barrelColorKey === k ? 'selected' : ''}>${v.label}</option>`
            ).join('');
            const previewCss = this._resolveObstacleCss(td.barrelColorKey, td.barrelCustomHex);
            body.innerHTML = `
                <div class="form-row">
                    <label>Diameter</label>
                    <input type="number" id="opt-barrel-d" class="form-input" min="12" max="160" value="${td.barrelDiameter}">
                </div>
                <div class="form-row">
                    <label>Color</label>
                    <span class="layer-swatch" style="background:${previewCss};width:16px;height:16px;flex-shrink:0"></span>
                    <select id="opt-barrel-col" class="form-input">${colorOpts}</select>
                </div>
            `;
            document.getElementById('opt-barrel-d')?.addEventListener('change', e => {
                td.barrelDiameter = Math.max(12, Number(e.target.value) || 28);
            });
            document.getElementById('opt-barrel-col')?.addEventListener('change', e => {
                td.barrelColorKey = e.target.value;
                this._renderToolOptions();
            });
            return;
        }

        if (t === 'checkpoint') {
            title.textContent = '🏁 Checkpoint Options';
            body.innerHTML = `
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>Default W</label>
                        <input type="number" id="opt-cp-w" class="form-input" min="20" max="1000" value="${td.checkpointW}">
                    </div>
                    <div class="form-field">
                        <label>Default H</label>
                        <input type="number" id="opt-cp-h" class="form-input" min="20" max="1000" value="${td.checkpointH}">
                    </div>
                </div>
                <div class="inspector-note">
                    Drag on canvas to size a checkpoint, or click to place at default size. <b>id = 0</b> is the Start/Finish line.
                </div>
            `;
            document.getElementById('opt-cp-w')?.addEventListener('change', e => { td.checkpointW = Math.max(20, Number(e.target.value) || 220); });
            document.getElementById('opt-cp-h')?.addEventListener('change', e => { td.checkpointH = Math.max(20, Number(e.target.value) || 26); });
            return;
        }

        if (t === 'spawn') {
            title.textContent = '🏎 Vehicle Spawn Options';
            body.innerHTML = `
                <div class="form-row">
                    <label>Slot</label>
                    <select id="opt-spawn-slot" class="form-input">
                        <option value="0" ${td.spawnSlot === 0 ? 'selected' : ''}>Slot 0 — Player (Red)</option>
                        <option value="1" ${td.spawnSlot === 1 ? 'selected' : ''}>Slot 1 — AI #1 (Blue)</option>
                        <option value="2" ${td.spawnSlot === 2 ? 'selected' : ''}>Slot 2 — AI #2 (Yellow)</option>
                        <option value="3" ${td.spawnSlot === 3 ? 'selected' : ''}>Slot 3 — AI #3 (Green)</option>
                        <option value="-1" ${td.spawnSlot === -1 ? 'selected' : ''}>Append New Slot</option>
                    </select>
                </div>
                <button class="tb-btn" id="opt-auto-grid">⚡ Auto-Place 2×2 Grid at S/F</button>
                <div class="inspector-note">
                    Click &amp; drag on canvas to place the selected car slot and aim its starting heading.
                </div>
            `;
            document.getElementById('opt-spawn-slot')?.addEventListener('change', e => {
                td.spawnSlot = parseInt(e.target.value, 10);
            });
            document.getElementById('opt-auto-grid')?.addEventListener('click', () => this.autoPlaceStartingGrid());
            return;
        }

        if (t === 'waypoint') {
            title.textContent = '📍 AI Waypoints Options';
            body.innerHTML = `
                <div class="inspector-actions">
                    <button class="tb-btn tb-btn-sm" id="opt-wp-rev">⇄ Reverse</button>
                    <button class="tb-btn tb-btn-sm" id="opt-wp-smooth">〰 Smooth</button>
                    <button class="tb-btn tb-btn-danger tb-btn-sm" id="opt-wp-clear">🗑 Clear All</button>
                </div>
                <div class="inspector-note">
                    Click empty space to append a waypoint, or click directly on a line segment between two waypoints to insert one!
                </div>
            `;
            document.getElementById('opt-wp-rev')?.addEventListener('click', () => {
                if (this.circuit.waypoints.length > 1) {
                    this._pushUndo();
                    const first = this.circuit.waypoints[0];
                    this.circuit.waypoints = [first, ...this.circuit.waypoints.slice(1).reverse()];
                    this._refreshAllPanels();
                    this._requestRedraw();
                }
            });
            document.getElementById('opt-wp-smooth')?.addEventListener('click', () => this.smoothWaypoints());
            document.getElementById('opt-wp-clear')?.addEventListener('click', () => {
                if (this.circuit.waypoints.length > 0 && confirm('Clear all AI waypoints?')) {
                    this._pushUndo();
                    this.circuit.waypoints = [];
                    this.selected = null;
                    this._refreshAllPanels();
                    this._requestRedraw();
                }
            });
            return;
        }

        if (t === 'pickup') {
            title.textContent = '⚡ Power-Up Spawn Options';
            body.innerHTML = `
                <div class="form-row">
                    <label>Category</label>
                    <select id="opt-pk-type" class="form-input">
                        <option value="weapon" ${td.pickupType === 'weapon' ? 'selected' : ''}>Weapon</option>
                        <option value="health" ${td.pickupType === 'health' ? 'selected' : ''}>Health Repair (+HP)</option>
                        <option value="money"  ${td.pickupType === 'money'  ? 'selected' : ''}>Money Bonus ($)</option>
                    </select>
                </div>
                ${td.pickupType === 'weapon' ? `
                <div class="form-row">
                    <label>Weapon</label>
                    <select id="opt-pk-weapon" class="form-input">
                        <option value="MACHINEGUN" ${td.pickupWeapon === 'MACHINEGUN' ? 'selected' : ''}>Machine Gun</option>
                        <option value="MISSILE"    ${td.pickupWeapon === 'MISSILE'    ? 'selected' : ''}>Missile</option>
                        <option value="MINE"       ${td.pickupWeapon === 'MINE'       ? 'selected' : ''}>Land Mine</option>
                    </select>
                </div>
                ` : `
                <div class="form-row">
                    <label>${td.pickupType === 'health' ? 'HP Value' : 'Cash ($)'}</label>
                    <input type="number" id="opt-pk-amt" class="form-input" min="5" max="1000" step="5" value="${td.pickupAmount}">
                </div>
                `}
                <div class="form-row-2col">
                    <div class="form-field">
                        <label title="1 = Spawns at race start; 2+ = Appears when leading car reaches this lap">Spawn Lap</label>
                        <input type="number" id="opt-pk-lap" class="form-input" min="1" max="99" value="${td.pickupSpawnLap}">
                    </div>
                    <div class="form-field">
                        <label title="0 = Immediate; >0 = Appears after N seconds of racing">Spawn Time (s)</label>
                        <input type="number" id="opt-pk-time" class="form-input" min="0" max="600" step="1" value="${td.pickupSpawnTime}">
                    </div>
                </div>
                <div class="inspector-note">
                    Set <b>Spawn Lap &gt; 1</b> or <b>Spawn Time &gt; 0s</b> to schedule when this power-up appears during the race!
                </div>
            `;
            document.getElementById('opt-pk-type')?.addEventListener('change', e => {
                td.pickupType = e.target.value;
                if (td.pickupType === 'health' && td.pickupAmount > 100) td.pickupAmount = 25;
                if (td.pickupType === 'money'  && td.pickupAmount < 20)  td.pickupAmount = 50;
                this._renderToolOptions();
            });
            document.getElementById('opt-pk-weapon')?.addEventListener('change', e => { td.pickupWeapon = e.target.value; });
            document.getElementById('opt-pk-amt')?.addEventListener('change', e => { td.pickupAmount = Math.max(1, Number(e.target.value) || 25); });
            document.getElementById('opt-pk-lap')?.addEventListener('change', e => { td.pickupSpawnLap = Math.max(1, parseInt(e.target.value, 10) || 1); });
            document.getElementById('opt-pk-time')?.addEventListener('change', e => { td.pickupSpawnTime = Math.max(0, Number(e.target.value) || 0); });
        }
    }

    // ── Selected Object Inspector ────────────────────────────────────

    _renderInspector() {
        const body  = document.getElementById('inspector-body');
        const title = document.getElementById('inspector-title');
        if (!body || !title) return;

        if (!this.selected) {
            title.textContent = '🔍 Selected Element';
            body.innerHTML = `<div class="empty-hint">Click any object on the canvas (or in the Elements list below) to inspect and edit its properties.</div>`;
            return;
        }

        const { layer, index } = this.selected;
        const c = this.circuit;

        if (layer === 'surfaces') {
            const z = c.surfaceZones[index];
            if (!z) { this.selected = null; return this._renderInspector(); }
            const isPoly = Array.isArray(z.points);
            title.textContent = `▭ Surface Zone #${index}`;

            const surfOpts = SURFACE_KEYS.map(k =>
                `<option value="${k}" ${z.surfaceKey === k ? 'selected' : ''}>${SURFACE[k].name} (${k})</option>`
            ).join('');

            body.innerHTML = `
                <div class="form-row">
                    <label>Terrain</label>
                    <select id="insp-surf-type" class="form-input">${surfOpts}</select>
                </div>
                ${!isPoly ? `
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>Left X</label>
                        <input type="number" id="insp-surf-x" class="form-input" value="${roundNum(z.x)}">
                    </div>
                    <div class="form-field">
                        <label>Top Y</label>
                        <input type="number" id="insp-surf-y" class="form-input" value="${roundNum(z.y)}">
                    </div>
                </div>
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>Width</label>
                        <input type="number" id="insp-surf-w" class="form-input" min="10" value="${roundNum(z.w)}">
                    </div>
                    <div class="form-field">
                        <label>Height</label>
                        <input type="number" id="insp-surf-h" class="form-input" min="10" value="${roundNum(z.h)}">
                    </div>
                </div>
                <div class="form-row">
                    <label>Rotation (°)</label>
                    <input type="number" id="insp-surf-rot" class="form-input" step="5" value="${radToDeg(z.rotation || 0)}">
                </div>
                ` : `
                <div class="inspector-note">
                    Polygon with <b>${z.points.length} vertices</b>. Drag vertices on canvas to reshape, click edge midpoints (+) to insert a vertex, or right-click a vertex to remove it.
                </div>
                `}
                <div class="inspector-actions">
                    <button class="tb-btn tb-btn-sm" id="insp-z-up" title="Bring Forward in draw/query order">↑ Forward</button>
                    <button class="tb-btn tb-btn-sm" id="insp-z-down" title="Send Backward in draw/query order">↓ Backward</button>
                    <button class="tb-btn tb-btn-sm" id="insp-z-top" title="Bring to Front (highest priority)">⇈ Front</button>
                    <button class="tb-btn tb-btn-sm" id="insp-z-bot" title="Send to Back (lowest priority)">⇊ Back</button>
                    <button class="tb-btn tb-btn-sm" id="insp-dup">⧉ Duplicate</button>
                    <button class="tb-btn tb-btn-danger tb-btn-sm" id="insp-del">🗑 Delete</button>
                </div>
            `;

            document.getElementById('insp-surf-type')?.addEventListener('change', e => {
                this._pushUndo(); z.surfaceKey = e.target.value; this._renderOutliner(); this._requestRedraw();
            });
            if (!isPoly) {
                const bindNum = (id, prop, minVal = -Infinity) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.addEventListener('focus', () => this._pushUndo());
                    el.addEventListener('input', e => {
                        z[prop] = Math.max(minVal, Number(e.target.value) || 0);
                        this._renderOutliner();
                        this._requestRedraw();
                    });
                };
                bindNum('insp-surf-x', 'x');
                bindNum('insp-surf-y', 'y');
                bindNum('insp-surf-w', 'w', 10);
                bindNum('insp-surf-h', 'h', 10);
                const rotEl = document.getElementById('insp-surf-rot');
                rotEl?.addEventListener('focus', () => this._pushUndo());
                rotEl?.addEventListener('input', e => {
                    z.rotation = degToRadNum(e.target.value);
                    this._requestRedraw();
                });
            }
            document.getElementById('insp-z-up')?.addEventListener('click',   () => this._reorderSurface(index, index + 1));
            document.getElementById('insp-z-down')?.addEventListener('click', () => this._reorderSurface(index, index - 1));
            document.getElementById('insp-z-top')?.addEventListener('click',  () => this._reorderSurface(index, c.surfaceZones.length - 1));
            document.getElementById('insp-z-bot')?.addEventListener('click',  () => this._reorderSurface(index, 0));
            document.getElementById('insp-dup')?.addEventListener('click',    () => this.duplicateSelected());
            document.getElementById('insp-del')?.addEventListener('click',    () => this.deleteSelected());
            return;
        }

        if (layer === 'obstacles') {
            const ob = c.obstacles[index];
            if (!ob) { this.selected = null; return this._renderInspector(); }
            title.textContent = `${ob.isBarrel ? '🛢 Barrel' : '🧱 Wall'} Obstacle #${index}`;

            const colorOpts = Object.entries(OBSTACLE_COLOR_PRESETS).map(([k, v]) =>
                `<option value="${k}" ${ob.colorKey === k ? 'selected' : ''}>${v.label}</option>`
            ).join('');

            body.innerHTML = `
                <label class="tb-checkbox-label">
                    <input type="checkbox" id="insp-ob-barrel" ${ob.isBarrel ? 'checked' : ''}> Circular Barrel / Tire
                </label>
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>Center X</label>
                        <input type="number" id="insp-ob-cx" class="form-input" value="${roundNum(ob.cx)}">
                    </div>
                    <div class="form-field">
                        <label>Center Y</label>
                        <input type="number" id="insp-ob-cy" class="form-input" value="${roundNum(ob.cy)}">
                    </div>
                </div>
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>${ob.isBarrel ? 'Diameter' : 'Width'}</label>
                        <input type="number" id="insp-ob-w" class="form-input" min="8" value="${roundNum(ob.w)}">
                    </div>
                    ${!ob.isBarrel ? `
                    <div class="form-field">
                        <label>Height</label>
                        <input type="number" id="insp-ob-h" class="form-input" min="8" value="${roundNum(ob.h)}">
                    </div>
                    ` : `<div class="form-field"></div>`}
                </div>
                ${!ob.isBarrel ? `
                <div class="form-row">
                    <label>Rotation (°)</label>
                    <input type="number" id="insp-ob-rot" class="form-input" step="5" value="${radToDeg(ob.rotation || 0)}">
                </div>
                ` : ''}
                <div class="form-row">
                    <label>Color</label>
                    <span class="layer-swatch" style="background:${this._resolveObstacleCss(ob.colorKey, ob.customHex)};width:16px;height:16px;flex-shrink:0"></span>
                    <select id="insp-ob-col" class="form-input">${colorOpts}</select>
                </div>
                <div class="form-row" style="display:${ob.colorKey === 'CUSTOM' ? 'flex' : 'none'}">
                    <label>Custom Hex</label>
                    <input type="color" id="insp-ob-hex" class="form-input" value="${ob.customHex || '#cc3326'}">
                </div>
                <div class="inspector-actions">
                    <button class="tb-btn tb-btn-sm" id="insp-dup">⧉ Duplicate</button>
                    <button class="tb-btn tb-btn-danger tb-btn-sm" id="insp-del">🗑 Delete</button>
                </div>
            `;

            document.getElementById('insp-ob-barrel')?.addEventListener('change', e => {
                this._pushUndo();
                ob.isBarrel = e.target.checked;
                if (ob.isBarrel) { ob.h = ob.w; ob.rotation = 0; }
                this._refreshAllPanels();
                this._requestRedraw();
            });
            const bindObInput = (id, fn) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('focus', () => this._pushUndo());
                el.addEventListener('input', e => { fn(e); this._renderOutliner(); this._requestRedraw(); });
            };
            bindObInput('insp-ob-cx',  e => { ob.cx = Number(e.target.value) || 0; });
            bindObInput('insp-ob-cy',  e => { ob.cy = Number(e.target.value) || 0; });
            bindObInput('insp-ob-w',   e => { ob.w = Math.max(8, Number(e.target.value) || 24); if (ob.isBarrel) ob.h = ob.w; });
            bindObInput('insp-ob-h',   e => { ob.h = Math.max(8, Number(e.target.value) || 24); });
            bindObInput('insp-ob-rot', e => { ob.rotation = degToRadNum(e.target.value); });
            document.getElementById('insp-ob-col')?.addEventListener('change', e => {
                this._pushUndo();
                ob.colorKey = e.target.value;
                this._renderInspector();
                this._requestRedraw();
            });
            document.getElementById('insp-ob-hex')?.addEventListener('input', e => {
                ob.customHex = e.target.value;
                this._requestRedraw();
            });
            document.getElementById('insp-ob-hex')?.addEventListener('change', e => {
                this._pushUndo();
                ob.customHex = e.target.value;
                this._renderInspector();
                this._requestRedraw();
            });
            document.getElementById('insp-dup')?.addEventListener('click', () => this.duplicateSelected());
            document.getElementById('insp-del')?.addEventListener('click', () => this.deleteSelected());
            return;
        }

        if (layer === 'checkpoints') {
            const cp = c.checkpoints[index];
            if (!cp) { this.selected = null; return this._renderInspector(); }
            title.textContent = `🏁 Checkpoint #${cp.id} ${cp.id === 0 ? '(Start/Finish)' : ''}`;

            body.innerHTML = `
                <div class="form-row">
                    <label>Order ID</label>
                    <input type="number" id="insp-cp-id" class="form-input" min="0" value="${cp.id}">
                </div>
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>Center X</label>
                        <input type="number" id="insp-cp-x" class="form-input" value="${roundNum(cp.x)}">
                    </div>
                    <div class="form-field">
                        <label>Center Y</label>
                        <input type="number" id="insp-cp-y" class="form-input" value="${roundNum(cp.y)}">
                    </div>
                </div>
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>Width</label>
                        <input type="number" id="insp-cp-w" class="form-input" min="16" value="${roundNum(cp.w)}">
                    </div>
                    <div class="form-field">
                        <label>Height</label>
                        <input type="number" id="insp-cp-h" class="form-input" min="16" value="${roundNum(cp.h)}">
                    </div>
                </div>
                <div class="form-row">
                    <label>Rotation (°)</label>
                    <input type="number" id="insp-cp-rot" class="form-input" step="5" value="${radToDeg(cp.rotation || 0)}">
                </div>
                <div class="inspector-actions">
                    <button class="tb-btn tb-btn-sm" id="insp-cp-swapwh">⇄ Swap W/H</button>
                    <button class="tb-btn tb-btn-sm" id="insp-dup">⧉ Duplicate</button>
                    <button class="tb-btn tb-btn-danger tb-btn-sm" id="insp-del">🗑 Delete</button>
                </div>
            `;

            const bindCpInput = (id, fn) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('focus', () => this._pushUndo());
                el.addEventListener('input', e => { fn(e); this._renderOutliner(); this._renderValidation(); this._requestRedraw(); });
            };
            bindCpInput('insp-cp-id',  e => { cp.id = Math.max(0, parseInt(e.target.value, 10) || 0); });
            bindCpInput('insp-cp-x',   e => { cp.x  = Number(e.target.value) || 0; });
            bindCpInput('insp-cp-y',   e => { cp.y  = Number(e.target.value) || 0; });
            bindCpInput('insp-cp-w',   e => { cp.w  = Math.max(16, Number(e.target.value) || 30); });
            bindCpInput('insp-cp-h',   e => { cp.h  = Math.max(16, Number(e.target.value) || 30); });
            bindCpInput('insp-cp-rot', e => { cp.rotation = degToRadNum(e.target.value); });
            document.getElementById('insp-cp-swapwh')?.addEventListener('click', () => {
                this._pushUndo();
                const tmp = cp.w; cp.w = cp.h; cp.h = tmp;
                this._renderInspector();
                this._requestRedraw();
            });
            document.getElementById('insp-dup')?.addEventListener('click', () => this.duplicateSelected());
            document.getElementById('insp-del')?.addEventListener('click', () => this.deleteSelected());
            return;
        }

        if (layer === 'spawns') {
            const sp = c.spawns[index];
            if (!sp) { this.selected = null; return this._renderInspector(); }
            title.textContent = `🏎 ${SPAWN_SLOT_NAMES[index] || `Spawn Slot #${index}`}`;

            body.innerHTML = `
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>X</label>
                        <input type="number" id="insp-sp-x" class="form-input" value="${roundNum(sp.x)}">
                    </div>
                    <div class="form-field">
                        <label>Y</label>
                        <input type="number" id="insp-sp-y" class="form-input" value="${roundNum(sp.y)}">
                    </div>
                </div>
                <div class="form-row">
                    <label>Heading (°)</label>
                    <input type="number" id="insp-sp-rot" class="form-input" step="15" value="${radToDeg(sp.rotation || 0)}">
                </div>
                <div class="inspector-actions">
                    <button class="tb-btn tb-btn-sm" id="insp-sp-alignall" title="Copy this spawn's heading angle to all other spawn slots">🧭 Apply Heading to All Spawns</button>
                    <button class="tb-btn tb-btn-danger tb-btn-sm" id="insp-del">🗑 Delete</button>
                </div>
            `;

            const bindSpInput = (id, fn) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('focus', () => this._pushUndo());
                el.addEventListener('input', e => { fn(e); this._renderOutliner(); this._requestRedraw(); });
            };
            bindSpInput('insp-sp-x',   e => { sp.x = Number(e.target.value) || 0; });
            bindSpInput('insp-sp-y',   e => { sp.y = Number(e.target.value) || 0; });
            bindSpInput('insp-sp-rot', e => { sp.rotation = degToRadNum(e.target.value); });
            document.getElementById('insp-sp-alignall')?.addEventListener('click', () => {
                this._pushUndo();
                c.spawns.forEach(s => { s.rotation = sp.rotation; });
                this._requestRedraw();
            });
            document.getElementById('insp-del')?.addEventListener('click', () => this.deleteSelected());
            return;
        }

        if (layer === 'waypoints') {
            const wp = c.waypoints[index];
            if (!wp) { this.selected = null; return this._renderInspector(); }
            title.textContent = `📍 AI Waypoint #${index}`;

            body.innerHTML = `
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>X</label>
                        <input type="number" id="insp-wp-x" class="form-input" value="${roundNum(wp.x)}">
                    </div>
                    <div class="form-field">
                        <label>Y</label>
                        <input type="number" id="insp-wp-y" class="form-input" value="${roundNum(wp.y)}">
                    </div>
                </div>
                <div class="inspector-actions">
                    <button class="tb-btn tb-btn-sm" id="insp-wp-insert" title="Insert a new waypoint after this one">+ Insert Next</button>
                    <button class="tb-btn tb-btn-danger tb-btn-sm" id="insp-del">🗑 Delete</button>
                </div>
            `;

            const bindWpInput = (id, fn) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('focus', () => this._pushUndo());
                el.addEventListener('input', e => { fn(e); this._renderOutliner(); this._requestRedraw(); });
            };
            bindWpInput('insp-wp-x', e => { wp.x = Number(e.target.value) || 0; });
            bindWpInput('insp-wp-y', e => { wp.y = Number(e.target.value) || 0; });
            document.getElementById('insp-wp-insert')?.addEventListener('click', () => {
                this._pushUndo();
                const next = c.waypoints[(index + 1) % c.waypoints.length] || { x: wp.x + 80, y: wp.y };
                const mid  = { x: roundNum((wp.x + next.x) * 0.5), y: roundNum((wp.y + next.y) * 0.5) };
                c.waypoints.splice(index + 1, 0, mid);
                this.selected = { layer: 'waypoints', index: index + 1 };
                this._refreshAllPanels();
                this._requestRedraw();
            });
            document.getElementById('insp-del')?.addEventListener('click', () => this.deleteSelected());
            return;
        }

        if (layer === 'pickups') {
            const pk = c.pickups[index];
            if (!pk) { this.selected = null; return this._renderInspector(); }
            title.textContent = `⚡ Power-Up #${index}`;

            body.innerHTML = `
                <div class="form-row-2col">
                    <div class="form-field">
                        <label>X</label>
                        <input type="number" id="insp-pk-x" class="form-input" value="${roundNum(pk.x)}">
                    </div>
                    <div class="form-field">
                        <label>Y</label>
                        <input type="number" id="insp-pk-y" class="form-input" value="${roundNum(pk.y)}">
                    </div>
                </div>
                <div class="form-row">
                    <label>Category</label>
                    <select id="insp-pk-type" class="form-input">
                        <option value="weapon" ${pk.type === 'weapon' ? 'selected' : ''}>Weapon</option>
                        <option value="health" ${pk.type === 'health' ? 'selected' : ''}>Health (+HP)</option>
                        <option value="money"  ${pk.type === 'money'  ? 'selected' : ''}>Money ($)</option>
                    </select>
                </div>
                ${pk.type === 'weapon' ? `
                <div class="form-row">
                    <label>Weapon</label>
                    <select id="insp-pk-data" class="form-input">
                        <option value="MACHINEGUN" ${pk.data === 'MACHINEGUN' ? 'selected' : ''}>Machine Gun</option>
                        <option value="MISSILE"    ${pk.data === 'MISSILE'    ? 'selected' : ''}>Missile</option>
                        <option value="MINE"       ${pk.data === 'MINE'       ? 'selected' : ''}>Land Mine</option>
                    </select>
                </div>
                ` : `
                <div class="form-row">
                    <label>${pk.type === 'health' ? 'HP Restored' : 'Cash ($)'}</label>
                    <input type="number" id="insp-pk-data" class="form-input" min="5" max="1000" step="5" value="${Number(pk.data) || 25}">
                </div>
                `}
                <div class="form-row-2col">
                    <div class="form-field">
                        <label title="1 = Spawns immediately at Lap 1; 2+ = Spawns when leading car reaches this lap">Spawn Lap</label>
                        <input type="number" id="insp-pk-lap" class="form-input" min="1" max="99" value="${pk.spawnLap ?? 1}">
                    </div>
                    <div class="form-field">
                        <label title="0 = Spawns immediately; >0 = Spawns after N seconds of race time">Spawn Time (s)</label>
                        <input type="number" id="insp-pk-time" class="form-input" min="0" max="600" step="1" value="${pk.spawnTime ?? 0}">
                    </div>
                </div>
                <div class="inspector-note">
                    ${(pk.spawnLap > 1 || pk.spawnTime > 0)
                        ? `⏱ Scheduled: Appears at <b>${pk.spawnLap > 1 ? `Lap ${pk.spawnLap}` : ''}${(pk.spawnLap > 1 && pk.spawnTime > 0) ? ' or ' : ''}${pk.spawnTime > 0 ? `${pk.spawnTime}s` : ''}</b>.`
                        : `Spawns immediately when the race starts (Lap 1, 0s).`}
                </div>
                <div class="inspector-actions">
                    <button class="tb-btn tb-btn-sm" id="insp-dup">⧉ Duplicate</button>
                    <button class="tb-btn tb-btn-danger tb-btn-sm" id="insp-del">🗑 Delete</button>
                </div>
            `;

            const bindPkInput = (id, fn) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('focus', () => this._pushUndo());
                el.addEventListener('input', e => { fn(e); this._renderOutliner(); this._requestRedraw(); });
            };
            bindPkInput('insp-pk-x',    e => { pk.x = Number(e.target.value) || 0; });
            bindPkInput('insp-pk-y',    e => { pk.y = Number(e.target.value) || 0; });
            document.getElementById('insp-pk-type')?.addEventListener('change', e => {
                this._pushUndo();
                pk.type = e.target.value;
                pk.data = pk.type === 'weapon' ? 'MACHINEGUN' : (pk.type === 'health' ? 25 : 50);
                this._refreshAllPanels();
                this._requestRedraw();
            });
            document.getElementById('insp-pk-data')?.addEventListener('change', e => {
                this._pushUndo();
                pk.data = pk.type === 'weapon' ? e.target.value : Math.max(1, Number(e.target.value) || 25);
                this._renderOutliner();
                this._requestRedraw();
            });
            if (pk.type !== 'weapon') {
                bindPkInput('insp-pk-data', e => { pk.data = Math.max(1, Number(e.target.value) || 25); });
            }
            bindPkInput('insp-pk-lap',  e => { pk.spawnLap = Math.max(1, parseInt(e.target.value, 10) || 1); });
            bindPkInput('insp-pk-time', e => { pk.spawnTime = Math.max(0, roundNum(Number(e.target.value) || 0, 1)); });
            document.getElementById('insp-dup')?.addEventListener('click', () => this.duplicateSelected());
            document.getElementById('insp-del')?.addEventListener('click', () => this.deleteSelected());
        }
    }

    _reorderSurface(fromIdx, toIdx) {
        const arr = this.circuit.surfaceZones;
        if (toIdx < 0 || toIdx >= arr.length || fromIdx === toIdx) return;
        this._pushUndo();
        const [item] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, item);
        this.selected = { layer: 'surfaces', index: toIdx };
        this._refreshAllPanels();
        this._requestRedraw();
    }

    // ── Scene Outliner ───────────────────────────────────────────────

    _renderOutliner() {
        const list = document.getElementById('outliner-list');
        const filter = /** @type {HTMLSelectElement} */ (document.getElementById('outliner-filter'))?.value || 'all';
        if (!list) return;

        const c = this.circuit;
        const rows = [];

        const pushItem = (layer, index, badge, label) => {
            if (filter !== 'all' && filter !== layer) return;
            const isSel = this.selected?.layer === layer && this.selected?.index === index;
            rows.push(`
                <div class="outliner-item ${isSel ? 'selected' : ''}" data-layer="${layer}" data-index="${index}">
                    <span class="outliner-badge">${badge}</span>
                    <span class="outliner-title">${label}</span>
                    <button class="outliner-del" title="Delete">✕</button>
                </div>
            `);
        };

        c.surfaceZones.forEach((z, i) => {
            const shape = Array.isArray(z.points) ? `Poly(${z.points.length})` : `${Math.round(z.w)}×${Math.round(z.h)}`;
            pushItem('surfaces', i, 'SURF', `#${i} ${z.surfaceKey} — ${shape}`);
        });
        c.checkpoints.forEach((cp, i) => {
            pushItem('checkpoints', i, `CP ${cp.id}`, cp.id === 0 ? `Start / Finish (${Math.round(cp.x)}, ${Math.round(cp.y)})` : `Checkpoint #${cp.id} (${Math.round(cp.x)}, ${Math.round(cp.y)})`);
        });
        c.spawns.forEach((sp, i) => {
            pushItem('spawns', i, `CAR ${i}`, `${SPAWN_SLOT_NAMES[i] || `Slot ${i}`} (${Math.round(sp.x)}, ${Math.round(sp.y)})`);
        });
        c.pickups.forEach((pk, i) => {
            const sched = (pk.spawnLap > 1 || pk.spawnTime > 0)
                ? ` [${pk.spawnLap > 1 ? 'L' + pk.spawnLap : ''}${pk.spawnLap > 1 && pk.spawnTime > 0 ? '/' : ''}${pk.spawnTime > 0 ? pk.spawnTime + 's' : ''}]`
                : '';
            pushItem('pickups', i, 'PKUP', `${pk.type === 'weapon' ? pk.data : `${pk.type} (${pk.data})`}${sched}`);
        });
        c.obstacles.forEach((ob, i) => {
            pushItem('obstacles', i, ob.isBarrel ? 'BARL' : 'WALL', `#${i} ${ob.isBarrel ? `Ø${Math.round(ob.w)}` : `${Math.round(ob.w)}×${Math.round(ob.h)}`} at (${Math.round(ob.cx)}, ${Math.round(ob.cy)})`);
        });
        c.waypoints.forEach((wp, i) => {
            pushItem('waypoints', i, `WP ${i}`, `Node #${i} (${Math.round(wp.x)}, ${Math.round(wp.y)})`);
        });

        list.innerHTML = rows.length > 0 ? rows.join('') : `<div class="empty-hint">No elements in this view.</div>`;

        list.querySelectorAll('.outliner-item').forEach(el => {
            const layer = el.getAttribute('data-layer');
            const index = parseInt(el.getAttribute('data-index'), 10);
            el.addEventListener('click', (e) => {
                if ((/** @type {HTMLElement} */ (e.target)).classList.contains('outliner-del')) return;
                this.selected = { layer, index };
                this._renderInspector();
                this._renderOutliner();
                this._requestRedraw();
            });
            el.querySelector('.outliner-del')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selected = { layer, index };
                this.deleteSelected();
            });
        });
    }

    deleteSelected() {
        if (!this.selected) return;
        const { layer, index } = this.selected;
        const map = {
            surfaces:    this.circuit.surfaceZones,
            obstacles:   this.circuit.obstacles,
            checkpoints: this.circuit.checkpoints,
            spawns:      this.circuit.spawns,
            waypoints:   this.circuit.waypoints,
            pickups:     this.circuit.pickups,
        };
        const arr = map[layer];
        if (!arr || index < 0 || index >= arr.length) return;
        this._pushUndo();
        arr.splice(index, 1);
        this.selected = null;
        this._refreshAllPanels();
        this._requestRedraw();
    }

    duplicateSelected() {
        if (!this.selected) return;
        const { layer, index } = this.selected;
        const map = {
            surfaces:    this.circuit.surfaceZones,
            obstacles:   this.circuit.obstacles,
            checkpoints: this.circuit.checkpoints,
            spawns:      this.circuit.spawns,
            waypoints:   this.circuit.waypoints,
            pickups:     this.circuit.pickups,
        };
        const arr = map[layer];
        if (!arr || !arr[index]) return;
        this._pushUndo();
        const copy = JSON.parse(JSON.stringify(arr[index]));
        const offset = 30;
        if (Array.isArray(copy.points)) {
            copy.points.forEach(pt => { pt.x += offset; pt.y += offset; });
        } else if ('cx' in copy) {
            copy.cx += offset; copy.cy += offset;
        } else if ('x' in copy) {
            copy.x += offset; copy.y += offset;
        }
        if (layer === 'checkpoints') {
            copy.id = this.circuit.checkpoints.length;
        }
        arr.push(copy);
        this.selected = { layer, index: arr.length - 1 };
        this._refreshAllPanels();
        this._requestRedraw();
    }

    autoPlaceStartingGrid() {
        this._pushUndo();
        const sf = this.circuit.checkpoints.find(cp => cp.id === 0) || this.circuit.checkpoints[0] || { x: 400, y: 900, w: 220, h: 28, rotation: 0 };
        // Determine track heading at Start/Finish from waypoint 0..1 or checkpoint shape
        let heading = sf.rotation || 0;
        if (this.circuit.waypoints.length >= 2) {
            const wp0 = this.circuit.waypoints[0];
            const dx  = wp0.x - sf.x;
            const dy  = wp0.y - sf.y;
            if (Math.hypot(dx, dy) > 20) {
                heading = Math.atan2(dx, -dy);
            }
        } else if (sf.h > sf.w) {
            heading = Math.PI * 0.5; // Horizontal gate -> cars face right
        }

        const fwdX = Math.sin(heading),  fwdY = -Math.cos(heading);
        const rtX  = Math.cos(heading),  rtY  =  Math.sin(heading);

        // Place 2x2 grid behind the Start/Finish line
        const row1Back = -55;
        const row2Back = -115;
        const colSpread = 34;

        this.circuit.spawns = [
            {
                x: roundNum(sf.x + fwdX * row1Back - rtX * colSpread),
                y: roundNum(sf.y + fwdY * row1Back - rtY * colSpread),
                rotation: roundNum(heading, 4),
            },
            {
                x: roundNum(sf.x + fwdX * row1Back + rtX * colSpread),
                y: roundNum(sf.y + fwdY * row1Back + rtY * colSpread),
                rotation: roundNum(heading, 4),
            },
            {
                x: roundNum(sf.x + fwdX * row2Back - rtX * colSpread),
                y: roundNum(sf.y + fwdY * row2Back - rtY * colSpread),
                rotation: roundNum(heading, 4),
            },
            {
                x: roundNum(sf.x + fwdX * row2Back + rtX * colSpread),
                y: roundNum(sf.y + fwdY * row2Back + rtY * colSpread),
                rotation: roundNum(heading, 4),
            },
        ];

        this._refreshAllPanels();
        this._requestRedraw();
    }

    smoothWaypoints() {
        const wps = this.circuit.waypoints;
        if (wps.length < 4) return;
        this._pushUndo();
        const next = wps.map((p, i) => {
            const prev = wps[(i - 1 + wps.length) % wps.length];
            const succ = wps[(i + 1) % wps.length];
            return {
                x: roundNum(prev.x * 0.2 + p.x * 0.6 + succ.x * 0.2),
                y: roundNum(prev.y * 0.2 + p.y * 0.6 + succ.y * 0.2),
            };
        });
        this.circuit.waypoints = next;
        this._refreshAllPanels();
        this._requestRedraw();
    }

    // ── Camera & Coordinate Transforms ───────────────────────────────

    _resizeCanvas() {
        const rect = this.viewport.getBoundingClientRect();
        this.canvas.width  = Math.max(1, Math.floor(rect.width));
        this.canvas.height = Math.max(1, Math.floor(rect.height));
        this._requestRedraw();
    }

    worldToScreen(wx, wy) {
        return {
            x: (wx - this.camX) * this.zoom + this.canvas.width * 0.5,
            y: (wy - this.camY) * this.zoom + this.canvas.height * 0.5,
        };
    }

    screenToWorld(sx, sy) {
        return {
            x: (sx - this.canvas.width * 0.5) / this.zoom + this.camX,
            y: (sy - this.canvas.height * 0.5) / this.zoom + this.camY,
        };
    }

    snapCoord(val, altKey = false) {
        if (altKey || !this.snapSize || this.snapSize <= 0) return roundNum(val);
        return Math.round(val / this.snapSize) * this.snapSize;
    }

    _zoomBy(factor, pivotSx = this.canvas.width * 0.5, pivotSy = this.canvas.height * 0.5) {
        const before = this.screenToWorld(pivotSx, pivotSy);
        this.zoom = Clamp(this.zoom * factor, 0.12, 3.5);
        const after = this.screenToWorld(pivotSx, pivotSy);
        this.camX += (before.x - after.x);
        this.camY += (before.y - after.y);
        this._updateZoomLabel();
        this._requestRedraw();
    }

    fitToView() {
        const w = this.circuit.width || WORLD_W;
        const h = this.circuit.height || WORLD_H;
        this.camX = w * 0.5;
        this.camY = h * 0.5;
        const pad = 80;
        const zx = Math.max(200, this.canvas.width - pad * 2) / w;
        const zy = Math.max(200, this.canvas.height - pad * 2) / h;
        this.zoom = Clamp(Math.min(zx, zy), 0.15, 2.0);
        this._updateZoomLabel();
        this._requestRedraw();
    }

    _updateZoomLabel() {
        const el = document.getElementById('zoom-label');
        if (el) el.textContent = `${Math.round(this.zoom * 100)}%`;
    }

    // ── Hit-Testing & Selection Handles ──────────────────────────────

    /**
     * Returns transform handles in world coordinates for the currently selected object.
     */
    _getSelectionHandles() {
        if (!this.selected) return [];
        const { layer, index } = this.selected;
        const c = this.circuit;
        const rotDist = 28 / this.zoom;

        const makeBoxHandles = (cx, cy, w, h, rot = 0) => {
            const hw = w * 0.5, hh = h * 0.5;
            const cos = Math.cos(rot), sin = Math.sin(rot);
            const toWorld = (lx, ly) => ({
                x: cx + lx * cos - ly * sin,
                y: cy + lx * sin + ly * cos,
            });
            return [
                { id: 'nw', ...toWorld(-hw, -hh), lx: -1, ly: -1, type: 'resize' },
                { id: 'n',  ...toWorld(  0, -hh), lx:  0, ly: -1, type: 'resize' },
                { id: 'ne', ...toWorld( hw, -hh), lx:  1, ly: -1, type: 'resize' },
                { id: 'e',  ...toWorld( hw,   0), lx:  1, ly:  0, type: 'resize' },
                { id: 'se', ...toWorld( hw,  hh), lx:  1, ly:  1, type: 'resize' },
                { id: 's',  ...toWorld(  0,  hh), lx:  0, ly:  1, type: 'resize' },
                { id: 'sw', ...toWorld(-hw,  hh), lx: -1, ly:  1, type: 'resize' },
                { id: 'w',  ...toWorld(-hw,   0), lx: -1, ly:  0, type: 'resize' },
                { id: 'rot', ...toWorld(0, -hh - rotDist), type: 'rotate', cx, cy },
            ];
        };

        if (layer === 'surfaces') {
            const z = c.surfaceZones[index];
            if (!z) return [];
            if (Array.isArray(z.points)) {
                const handles = [];
                z.points.forEach((pt, vi) => {
                    handles.push({ id: `v_${vi}`, x: pt.x, y: pt.y, vi, type: 'poly_vertex' });
                    const next = z.points[(vi + 1) % z.points.length];
                    handles.push({
                        id: `mid_${vi}`,
                        x: (pt.x + next.x) * 0.5,
                        y: (pt.y + next.y) * 0.5,
                        vi,
                        type: 'poly_mid',
                    });
                });
                return handles;
            }
            return makeBoxHandles(z.x + z.w * 0.5, z.y + z.h * 0.5, z.w, z.h, z.rotation || 0);
        }

        if (layer === 'obstacles') {
            const ob = c.obstacles[index];
            if (!ob) return [];
            if (ob.isBarrel) {
                return [{ id: 'radius', x: ob.cx + ob.w * 0.5, y: ob.cy, type: 'barrel_radius' }];
            }
            return makeBoxHandles(ob.cx, ob.cy, ob.w, ob.h, ob.rotation || 0);
        }

        if (layer === 'checkpoints') {
            const cp = c.checkpoints[index];
            if (!cp) return [];
            return makeBoxHandles(cp.x, cp.y, cp.w, cp.h, cp.rotation || 0);
        }

        if (layer === 'spawns') {
            const sp = c.spawns[index];
            if (!sp) return [];
            const dist = 36;
            const fwdX = Math.sin(sp.rotation || 0), fwdY = -Math.cos(sp.rotation || 0);
            return [{ id: 'heading', x: sp.x + fwdX * dist, y: sp.y + fwdY * dist, type: 'spawn_heading', cx: sp.x, cy: sp.y }];
        }

        return [];
    }

    _hitTestHandles(wx, wy) {
        const handles = this._getSelectionHandles();
        const tol = 10 / this.zoom;
        for (const h of handles) {
            if (Math.hypot(wx - h.x, wy - h.y) <= tol) return h;
        }
        return null;
    }

    /**
     * Hit-tests all visible, unlocked layers in reverse draw priority:
     * pickups -> spawns -> waypoints -> checkpoints -> obstacles -> surfaces.
     */
    _hitTestObjects(wx, wy) {
        const c = this.circuit;
        const canHit = (layer) => this.layers[layer]?.visible && !this.layers[layer]?.locked;

        const pointInOBB = (px, py, cx, cy, w, h, rot = 0) => {
            const dx = px - cx, dy = py - cy;
            const cos = Math.cos(-rot), sin = Math.sin(-rot);
            const lx = dx * cos - dy * sin;
            const ly = dx * sin + dy * cos;
            return Math.abs(lx) <= w * 0.5 && Math.abs(ly) <= h * 0.5;
        };

        if (canHit('pickups')) {
            const r = Math.max(18, 14 / this.zoom);
            for (let i = c.pickups.length - 1; i >= 0; i--) {
                const pk = c.pickups[i];
                if (Math.hypot(wx - pk.x, wy - pk.y) <= r) return { layer: 'pickups', index: i };
            }
        }

        if (canHit('spawns')) {
            const r = Math.max(22, 16 / this.zoom);
            for (let i = c.spawns.length - 1; i >= 0; i--) {
                const sp = c.spawns[i];
                if (Math.hypot(wx - sp.x, wy - sp.y) <= r) return { layer: 'spawns', index: i };
            }
        }

        if (canHit('waypoints')) {
            const r = Math.max(15, 12 / this.zoom);
            for (let i = c.waypoints.length - 1; i >= 0; i--) {
                const wp = c.waypoints[i];
                if (Math.hypot(wx - wp.x, wy - wp.y) <= r) return { layer: 'waypoints', index: i };
            }
        }

        if (canHit('checkpoints')) {
            for (let i = c.checkpoints.length - 1; i >= 0; i--) {
                const cp = c.checkpoints[i];
                if (pointInOBB(wx, wy, cp.x, cp.y, cp.w, cp.h, cp.rotation || 0)) {
                    return { layer: 'checkpoints', index: i };
                }
            }
        }

        if (canHit('obstacles')) {
            for (let i = c.obstacles.length - 1; i >= 0; i--) {
                const ob = c.obstacles[i];
                if (ob.isBarrel) {
                    if (Math.hypot(wx - ob.cx, wy - ob.cy) <= Math.max(ob.w * 0.5, 10 / this.zoom)) {
                        return { layer: 'obstacles', index: i };
                    }
                } else if (pointInOBB(wx, wy, ob.cx, ob.cy, ob.w, ob.h, ob.rotation || 0)) {
                    return { layer: 'obstacles', index: i };
                }
            }
        }

        if (canHit('surfaces')) {
            for (let i = c.surfaceZones.length - 1; i >= 0; i--) {
                const z = c.surfaceZones[i];
                if (CircuitLoader.IsPointInSurfaceZone(z, wx, wy)) {
                    return { layer: 'surfaces', index: i };
                }
            }
        }

        return null;
    }

    /**
     * Checks if `(wx, wy)` is near a line segment between two waypoints; returns insertion index or -1.
     */
    _findWaypointSegmentHit(wx, wy) {
        const wps = this.circuit.waypoints;
        if (wps.length < 2) return -1;
        const tol = 10 / this.zoom;
        for (let i = 0; i < wps.length; i++) {
            const a = wps[i];
            const b = wps[(i + 1) % wps.length];
            const abx = b.x - a.x, aby = b.y - a.y;
            const len2 = abx * abx + aby * aby;
            if (len2 < 1) continue;
            const t = Clamp(((wx - a.x) * abx + (wy - a.y) * aby) / len2, 0.08, 0.92);
            const px = a.x + abx * t, py = a.y + aby * t;
            if (Math.hypot(wx - px, wy - py) <= tol) {
                return i + 1;
            }
        }
        return -1;
    }

    // ── Canvas Mouse & Keyboard Interaction ──────────────────────────

    _initCanvasEvents() {
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.14 : (1 / 1.14);
            this._zoomBy(factor, sx, sy);
        }, { passive: false });

        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        window.addEventListener('mousemove',      (e) => this._onMouseMove(e));
        window.addEventListener('mouseup',        (e) => this._onMouseUp(e));
        this.canvas.addEventListener('dblclick',  (e) => this._onDoubleClick(e));

        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup',   (e) => {
            if (e.code === 'Space') {
                this.spaceHeld = false;
                this.canvas.style.cursor = 'crosshair';
            }
        });
    }

    _onMouseDown(e) {
        if (this.isTestingRace) return;
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const wPos = this.screenToWorld(sx, sy);
        const snapX = this.snapCoord(wPos.x, e.altKey);
        const snapY = this.snapCoord(wPos.y, e.altKey);

        // Middle mouse, Right mouse (unless right-clicking a polygon vertex), or Space + Left mouse => Pan
        if (e.button === 1 || (e.button === 0 && this.spaceHeld)) {
            this.isPanning = true;
            this.panStartMouse = { x: e.clientX, y: e.clientY };
            this.panStartCam   = { x: this.camX, y: this.camY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (e.button === 2) {
            // Check if right-clicking a polygon vertex to delete it
            const h = this._hitTestHandles(wPos.x, wPos.y);
            if (h && h.type === 'poly_vertex' && this.selected?.layer === 'surfaces') {
                const z = this.circuit.surfaceZones[this.selected.index];
                if (z && Array.isArray(z.points) && z.points.length > 3) {
                    this._pushUndo();
                    z.points.splice(h.vi, 1);
                    this._refreshAllPanels();
                    this._requestRedraw();
                    return;
                }
            }
            // Otherwise pan with right-drag
            this.isPanning = true;
            this.panStartMouse = { x: e.clientX, y: e.clientY };
            this.panStartCam   = { x: this.camX, y: this.camY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (e.button !== 0) return;

        const tool = this.activeTool;

        // 1. Check active selection handles first (in Select tool or matching tool)
        if (this.selected) {
            const h = this._hitTestHandles(wPos.x, wPos.y);
            if (h) {
                this._pushUndo();
                if (h.type === 'poly_mid') {
                    const z = this.circuit.surfaceZones[this.selected.index];
                    z.points.splice(h.vi + 1, 0, { x: roundNum(h.x), y: roundNum(h.y) });
                    this.dragAction = { type: 'poly_vertex', vi: h.vi + 1 };
                    this._refreshAllPanels();
                    this._requestRedraw();
                    return;
                }
                if (h.type === 'poly_vertex') {
                    this.dragAction = { type: 'poly_vertex', vi: h.vi };
                    return;
                }
                if (h.type === 'rotate' || h.type === 'spawn_heading') {
                    this.dragAction = { type: h.type, cx: h.cx, cy: h.cy };
                    return;
                }
                if (h.type === 'barrel_radius') {
                    this.dragAction = { type: 'barrel_radius' };
                    return;
                }
                if (h.type === 'resize') {
                    const obj = this._getSelectedObjectRef();
                    const isTopLeftSurf = (this.selected.layer === 'surfaces');
                    const cx = isTopLeftSurf ? obj.x + obj.w * 0.5 : (obj.cx ?? obj.x);
                    const cy = isTopLeftSurf ? obj.y + obj.h * 0.5 : (obj.cy ?? obj.y);
                    this.dragAction = {
                        type: 'resize',
                        lx: h.lx,
                        ly: h.ly,
                        startCx: cx,
                        startCy: cy,
                        startW: obj.w,
                        startH: obj.h,
                        rot: obj.rotation || 0,
                        startMouse: { x: wPos.x, y: wPos.y },
                    };
                    return;
                }
            }
        }

        // 2. Tool-specific left-click behavior
        if (tool === 'select') {
            const hit = this._hitTestObjects(wPos.x, wPos.y);
            this.selected = hit;
            this._renderInspector();
            this._renderOutliner();
            this._requestRedraw();

            if (hit) {
                this._pushUndo();
                const obj = this._getSelectedObjectRef();
                this.dragAction = {
                    type: 'move',
                    startMouse: { x: wPos.x, y: wPos.y },
                    origSnapshot: JSON.parse(JSON.stringify(obj)),
                };
            }
            return;
        }

        if (tool === 'surface_rect') {
            this._pushUndo();
            const newZone = {
                x: snapX,
                y: snapY,
                w: 20,
                h: 20,
                rotation: 0,
                surfaceKey: this.toolDefaults.surfaceKey,
            };
            this.circuit.surfaceZones.push(newZone);
            this.selected = { layer: 'surfaces', index: this.circuit.surfaceZones.length - 1 };
            this.dragAction = {
                type: 'create_rect',
                target: 'surface',
                startX: snapX,
                startY: snapY,
            };
            this._refreshAllPanels();
            this._requestRedraw();
            return;
        }

        if (tool === 'surface_poly' || tool === 'road_brush') {
            // Check if clicking near first vertex to finish polygon/loop
            if (this.activePoints.length >= 3) {
                const first = this.activePoints[0];
                if (Math.hypot(wPos.x - first.x, wPos.y - first.y) <= 16 / this.zoom) {
                    this._commitActiveDrawing();
                    return;
                }
            }
            this.activePoints.push({ x: snapX, y: snapY });
            this._updateDrawingBanner();
            this._requestRedraw();
            return;
        }

        if (tool === 'obstacle_wall') {
            if (this.toolDefaults.wallChainMode) {
                if (this.activePoints.length > 0) {
                    const prev = this.activePoints[this.activePoints.length - 1];
                    const dx = snapX - prev.x, dy = snapY - prev.y;
                    const len = Math.hypot(dx, dy);
                    if (len >= 12) {
                        this._pushUndo();
                        const cx = roundNum((prev.x + snapX) * 0.5);
                        const cy = roundNum((prev.y + snapY) * 0.5);
                        const rot = Math.atan2(dy, dx);
                        this.circuit.obstacles.push({
                            cx,
                            cy,
                            w: roundNum(len),
                            h: this.toolDefaults.wallThickness || 24,
                            colorKey: this.toolDefaults.wallColorKey,
                            customHex: this.toolDefaults.wallCustomHex,
                            isBarrel: false,
                            rotation: roundNum(rot, 4),
                        });
                        this.selected = { layer: 'obstacles', index: this.circuit.obstacles.length - 1 };
                        this._refreshAllPanels();
                    }
                }
                this.activePoints.push({ x: snapX, y: snapY });
                this._updateDrawingBanner();
                this._requestRedraw();
                return;
            }

            this._pushUndo();
            const newWall = {
                cx: snapX,
                cy: snapY,
                w: 24,
                h: 24,
                colorKey: this.toolDefaults.wallColorKey,
                customHex: this.toolDefaults.wallCustomHex,
                isBarrel: false,
                rotation: 0,
            };
            this.circuit.obstacles.push(newWall);
            this.selected = { layer: 'obstacles', index: this.circuit.obstacles.length - 1 };
            this.dragAction = {
                type: 'create_rect',
                target: 'wall',
                startX: snapX,
                startY: snapY,
            };
            this._refreshAllPanels();
            this._requestRedraw();
            return;
        }

        if (tool === 'obstacle_barrel') {
            this._pushUndo();
            const d = this.toolDefaults.barrelDiameter || 28;
            this.circuit.obstacles.push({
                cx: snapX,
                cy: snapY,
                w: d,
                h: d,
                colorKey: this.toolDefaults.barrelColorKey,
                customHex: this.toolDefaults.barrelCustomHex,
                isBarrel: true,
                rotation: 0,
            });
            this.selected = { layer: 'obstacles', index: this.circuit.obstacles.length - 1 };
            this._refreshAllPanels();
            this._requestRedraw();
            return;
        }

        if (tool === 'checkpoint') {
            this._pushUndo();
            const nextId = this.circuit.checkpoints.length === 0
                ? 0
                : Math.max(...this.circuit.checkpoints.map(c => c.id)) + 1;
            const newCp = {
                id: nextId,
                x: snapX,
                y: snapY,
                w: this.toolDefaults.checkpointW || 220,
                h: this.toolDefaults.checkpointH || 26,
                rotation: 0,
            };
            this.circuit.checkpoints.push(newCp);
            this.selected = { layer: 'checkpoints', index: this.circuit.checkpoints.length - 1 };
            this.dragAction = {
                type: 'create_rect',
                target: 'checkpoint',
                startX: snapX,
                startY: snapY,
                defaultW: newCp.w,
                defaultH: newCp.h,
            };
            this._refreshAllPanels();
            this._requestRedraw();
            return;
        }

        if (tool === 'spawn') {
            this._pushUndo();
            let slot = this.toolDefaults.spawnSlot;
            if (slot < 0 || slot >= this.circuit.spawns.length) {
                this.circuit.spawns.push({ x: snapX, y: snapY, rotation: 0 });
                slot = this.circuit.spawns.length - 1;
            } else {
                this.circuit.spawns[slot].x = snapX;
                this.circuit.spawns[slot].y = snapY;
            }
            this.selected = { layer: 'spawns', index: slot };
            this.dragAction = { type: 'spawn_heading', cx: snapX, cy: snapY };
            this._refreshAllPanels();
            this._requestRedraw();
            return;
        }

        if (tool === 'waypoint') {
            // If clicking an existing waypoint, select & drag it
            const hit = this._hitTestObjects(wPos.x, wPos.y);
            if (hit && hit.layer === 'waypoints') {
                this.selected = hit;
                this._pushUndo();
                this.dragAction = {
                    type: 'move',
                    startMouse: { x: wPos.x, y: wPos.y },
                    origSnapshot: JSON.parse(JSON.stringify(this.circuit.waypoints[hit.index])),
                };
                this._refreshAllPanels();
                this._requestRedraw();
                return;
            }
            this._pushUndo();
            const segInsertIdx = this._findWaypointSegmentHit(wPos.x, wPos.y);
            if (segInsertIdx !== -1) {
                this.circuit.waypoints.splice(segInsertIdx, 0, { x: snapX, y: snapY });
                this.selected = { layer: 'waypoints', index: segInsertIdx };
            } else {
                this.circuit.waypoints.push({ x: snapX, y: snapY });
                this.selected = { layer: 'waypoints', index: this.circuit.waypoints.length - 1 };
            }
            this.dragAction = {
                type: 'move',
                startMouse: { x: wPos.x, y: wPos.y },
                origSnapshot: JSON.parse(JSON.stringify(this.circuit.waypoints[this.selected.index])),
            };
            this._refreshAllPanels();
            this._requestRedraw();
            return;
        }

        if (tool === 'pickup') {
            this._pushUndo();
            const td = this.toolDefaults;
            const newPk = {
                x: snapX,
                y: snapY,
                type: td.pickupType,
                data: td.pickupType === 'weapon' ? td.pickupWeapon : td.pickupAmount,
                spawnLap: Math.max(1, td.pickupSpawnLap || 1),
                spawnTime: Math.max(0, td.pickupSpawnTime || 0),
            };
            this.circuit.pickups.push(newPk);
            this.selected = { layer: 'pickups', index: this.circuit.pickups.length - 1 };
            this._refreshAllPanels();
            this._requestRedraw();
        }
    }

    _onMouseMove(e) {
        if (this.isTestingRace) return;
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const wPos = this.screenToWorld(sx, sy);
        this.mouseWorld   = { x: roundNum(wPos.x), y: roundNum(wPos.y) };
        this.mouseSnapped = { x: this.snapCoord(wPos.x, e.altKey), y: this.snapCoord(wPos.y, e.altKey) };

        this._updateCoordinatesHUD();

        if (this.isPanning) {
            const dx = (e.clientX - this.panStartMouse.x) / this.zoom;
            const dy = (e.clientY - this.panStartMouse.y) / this.zoom;
            this.camX = this.panStartCam.x - dx;
            this.camY = this.panStartCam.y - dy;
            this._requestRedraw();
            return;
        }

        if (!this.dragAction) {
            if (this.activePoints.length > 0) this._requestRedraw();
            return;
        }

        const act = this.dragAction;
        const obj = this._getSelectedObjectRef();
        if (!obj) { this.dragAction = null; return; }

        if (act.type === 'move') {
            const dx = this.snapCoord(wPos.x - act.startMouse.x, e.altKey);
            const dy = this.snapCoord(wPos.y - act.startMouse.y, e.altKey);
            const orig = act.origSnapshot;
            if (Array.isArray(obj.points)) {
                obj.points.forEach((pt, i) => {
                    pt.x = roundNum(orig.points[i].x + dx);
                    pt.y = roundNum(orig.points[i].y + dy);
                });
            } else if ('cx' in obj) {
                obj.cx = roundNum(orig.cx + dx);
                obj.cy = roundNum(orig.cy + dy);
            } else if ('x' in obj) {
                obj.x = roundNum(orig.x + dx);
                obj.y = roundNum(orig.y + dy);
            }
            this._renderInspector();
            this._requestRedraw();
            return;
        }

        if (act.type === 'poly_vertex') {
            if (Array.isArray(obj.points) && obj.points[act.vi]) {
                obj.points[act.vi].x = this.mouseSnapped.x;
                obj.points[act.vi].y = this.mouseSnapped.y;
                this._requestRedraw();
            }
            return;
        }

        if (act.type === 'rotate' || act.type === 'spawn_heading') {
            let angle = Math.atan2(wPos.x - act.cx, -(wPos.y - act.cy));
            if (e.shiftKey) {
                const snapRad = (15 * Math.PI) / 180;
                angle = Math.round(angle / snapRad) * snapRad;
            }
            obj.rotation = roundNum(angle, 4);
            this._renderInspector();
            this._requestRedraw();
            return;
        }

        if (act.type === 'barrel_radius') {
            const r = Math.max(6, Math.hypot(wPos.x - obj.cx, wPos.y - obj.cy));
            obj.w = obj.h = roundNum(r * 2);
            this._renderInspector();
            this._requestRedraw();
            return;
        }

        if (act.type === 'resize') {
            const dx = wPos.x - act.startMouse.x;
            const dy = wPos.y - act.startMouse.y;
            const cos = Math.cos(-act.rot), sin = Math.sin(-act.rot);
            const localDx = dx * cos - dy * sin;
            const localDy = dx * sin + dy * cos;

            const newW = act.lx !== 0
                ? Math.max(12, this.snapCoord(act.startW + localDx * act.lx * 2, e.altKey))
                : act.startW;
            const newH = act.ly !== 0
                ? Math.max(12, this.snapCoord(act.startH + localDy * act.ly * 2, e.altKey))
                : act.startH;

            if (this.selected?.layer === 'surfaces') {
                obj.w = roundNum(newW);
                obj.h = roundNum(newH);
                obj.x = roundNum(act.startCx - obj.w * 0.5);
                obj.y = roundNum(act.startCy - obj.h * 0.5);
            } else {
                obj.w = roundNum(newW);
                obj.h = roundNum(newH);
            }
            this._renderInspector();
            this._requestRedraw();
            return;
        }

        if (act.type === 'create_rect') {
            const x1 = Math.min(act.startX, this.mouseSnapped.x);
            const y1 = Math.min(act.startY, this.mouseSnapped.y);
            const x2 = Math.max(act.startX, this.mouseSnapped.x);
            const y2 = Math.max(act.startY, this.mouseSnapped.y);
            const w  = Math.max(16, x2 - x1);
            const h  = Math.max(16, y2 - y1);

            if (act.target === 'surface') {
                obj.x = roundNum(x1);
                obj.y = roundNum(y1);
                obj.w = roundNum(w);
                obj.h = roundNum(h);
            } else if (act.target === 'wall') {
                obj.cx = roundNum(x1 + w * 0.5);
                obj.cy = roundNum(y1 + h * 0.5);
                obj.w  = roundNum(w);
                obj.h  = roundNum(h);
            } else if (act.target === 'checkpoint') {
                if (Math.hypot(this.mouseSnapped.x - act.startX, this.mouseSnapped.y - act.startY) > 12) {
                    obj.x = roundNum(x1 + w * 0.5);
                    obj.y = roundNum(y1 + h * 0.5);
                    obj.w = roundNum(w);
                    obj.h = roundNum(h);
                }
            }
            this._renderInspector();
            this._requestRedraw();
        }
    }

    _onMouseUp() {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = this.spaceHeld ? 'grab' : 'crosshair';
        }
        if (this.dragAction) {
            this.dragAction = null;
            this._refreshAllPanels();
            this._requestRedraw();
        }
    }

    _onDoubleClick() {
        if (this.activePoints.length > 0) {
            this._commitActiveDrawing();
        }
    }

    _onKeyDown(e) {
        // Ignore shortcuts when typing inside inputs/textareas
        const tag = (/** @type {HTMLElement} */ (e.target))?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (this.isTestingRace) {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.stopTestRace();
            }
            return;
        }

        if (e.code === 'Space' && !this.spaceHeld) {
            this.spaceHeld = true;
            this.canvas.style.cursor = 'grab';
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) this.redo();
            else this.undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            this.redo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            this.duplicateSelected();
            return;
        }

        if (e.key === 'Enter' && this.activePoints.length > 0) {
            e.preventDefault();
            this._commitActiveDrawing();
            return;
        }
        if (e.key === 'Escape') {
            if (this.activePoints.length > 0) {
                this._cancelActiveDrawing();
            } else if (document.getElementById('code-modal')?.style.display !== 'none') {
                document.getElementById('code-modal').style.display = 'none';
            } else {
                this.selected = null;
                this._renderInspector();
                this._renderOutliner();
                this._requestRedraw();
            }
            return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.selected) {
                e.preventDefault();
                this.deleteSelected();
            }
            return;
        }

        // Single-key tool shortcuts
        const k = e.key.toLowerCase();
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            if (k === 'v') this.setTool('select');
            else if (k === 's') this.setTool('surface_rect');
            else if (k === 'p') this.setTool('surface_poly');
            else if (k === 'r') this.setTool('road_brush');
            else if (k === 'o') this.setTool('obstacle_wall');
            else if (k === 'b') this.setTool('obstacle_barrel');
            else if (k === 'c') this.setTool('checkpoint');
            else if (k === 'k') this.setTool('spawn');
            else if (k === 'w') this.setTool('waypoint');
            else if (k === 'u') this.setTool('pickup');
            else if (k === 'f') this.fitToView();
            else if (k === 'g') {
                const chk = /** @type {HTMLInputElement} */ (document.getElementById('chk-show-grid'));
                if (chk) { chk.checked = !chk.checked; this.showGrid = chk.checked; this._requestRedraw(); }
            }
        }
    }

    _getSelectedObjectRef() {
        if (!this.selected) return null;
        const { layer, index } = this.selected;
        const map = {
            surfaces:    this.circuit.surfaceZones,
            obstacles:   this.circuit.obstacles,
            checkpoints: this.circuit.checkpoints,
            spawns:      this.circuit.spawns,
            waypoints:   this.circuit.waypoints,
            pickups:     this.circuit.pickups,
        };
        return map[layer]?.[index] || null;
    }

    // ── Active Polygon / Road Path Builder ───────────────────────────

    _updateDrawingBanner() {
        const banner = document.getElementById('active-drawing-banner');
        const text   = document.getElementById('active-drawing-text');
        if (!banner || !text) return;

        if (this.activePoints.length === 0) {
            banner.style.display = 'none';
            return;
        }

        banner.style.display = 'flex';
        if (this.activeTool === 'surface_poly') {
            text.textContent = `Polygon Surface: ${this.activePoints.length} vertices placed`;
        } else if (this.activeTool === 'road_brush') {
            text.textContent = `Road Path: ${this.activePoints.length} centerline points placed`;
        } else if (this.activeTool === 'obstacle_wall') {
            text.textContent = `Wall Chain: ${this.activePoints.length} nodes placed`;
        }
    }

    _cancelActiveDrawing() {
        this.activePoints = [];
        this._updateDrawingBanner();
        this._requestRedraw();
    }

    _commitActiveDrawing() {
        const pts = this.activePoints;
        if (this.activeTool === 'surface_poly' && pts.length >= 3) {
            this._pushUndo();
            this.circuit.surfaceZones.push({
                points: pts.map(p => ({ x: roundNum(p.x), y: roundNum(p.y) })),
                surfaceKey: this.toolDefaults.surfaceKey,
            });
            this.selected = { layer: 'surfaces', index: this.circuit.surfaceZones.length - 1 };
        } else if (this.activeTool === 'road_brush' && pts.length >= 2) {
            this._pushUndo();
            const polys = this._buildRoadStripPolygons(
                pts,
                this.toolDefaults.roadWidth || 240,
                this.toolDefaults.roadClosedLoop && pts.length >= 3
            );
            for (const poly of polys) {
                this.circuit.surfaceZones.push({
                    points: poly,
                    surfaceKey: this.toolDefaults.surfaceKey,
                });
            }
            if (this.toolDefaults.roadMakeWps) {
                this.circuit.waypoints = pts.map(p => ({ x: roundNum(p.x), y: roundNum(p.y) }));
            }
            if (this.circuit.surfaceZones.length > 0) {
                this.selected = { layer: 'surfaces', index: this.circuit.surfaceZones.length - 1 };
            }
        }
        this.activePoints = [];
        this._updateDrawingBanner();
        this._refreshAllPanels();
        this._requestRedraw();
    }

    /**
     * Generates clean mitered quad polygons for each road segment along `pts`.
     */
    _buildRoadStripPolygons(pts, width, closed) {
        const n = pts.length;
        if (n < 2) return [];
        const hw = width * 0.5;

        // Compute left/right mitered offset vertices at each centerline node
        const leftPts  = [];
        const rightPts = [];

        for (let i = 0; i < n; i++) {
            const p = pts[i];
            const prev = closed ? pts[(i - 1 + n) % n] : (i > 0 ? pts[i - 1] : null);
            const next = closed ? pts[(i + 1) % n]     : (i < n - 1 ? pts[i + 1] : null);

            let nx = 0, ny = 0;
            if (prev && next) {
                const d1x = p.x - prev.x, d1y = p.y - prev.y;
                const l1  = Math.hypot(d1x, d1y) || 1;
                const n1x = -d1y / l1, n1y = d1x / l1;

                const d2x = next.x - p.x, d2y = next.y - p.y;
                const l2  = Math.hypot(d2x, d2y) || 1;
                const n2x = -d2y / l2, n2y = d2x / l2;

                let mx = n1x + n2x, my = n1y + n2y;
                const ml = Math.hypot(mx, my);
                if (ml < 0.001) {
                    nx = n1x; ny = n1y;
                } else {
                    mx /= ml; my /= ml;
                    const dot = Clamp(mx * n1x + my * n1y, 0.45, 1.0);
                    nx = mx / dot;
                    ny = my / dot;
                }
            } else if (next) {
                const dx = next.x - p.x, dy = next.y - p.y;
                const l = Math.hypot(dx, dy) || 1;
                nx = -dy / l; ny = dx / l;
            } else if (prev) {
                const dx = p.x - prev.x, dy = p.y - prev.y;
                const l = Math.hypot(dx, dy) || 1;
                nx = -dy / l; ny = dx / l;
            }

            leftPts.push({ x: roundNum(p.x + nx * hw), y: roundNum(p.y + ny * hw) });
            rightPts.push({ x: roundNum(p.x - nx * hw), y: roundNum(p.y - ny * hw) });
        }

        const segCount = closed ? n : n - 1;
        const quads = [];
        for (let i = 0; i < segCount; i++) {
            const j = (i + 1) % n;
            quads.push([leftPts[i], leftPts[j], rightPts[j], rightPts[i]]);
        }
        return quads;
    }

    _updateCoordinatesHUD() {
        const coordEl = document.getElementById('status-coords');
        if (coordEl) {
            coordEl.textContent = `X: ${Math.round(this.mouseWorld.x)}, Y: ${Math.round(this.mouseWorld.y)}`;
        }
        const surfEl = document.getElementById('status-surface');
        if (surfEl) {
            let sName = 'Grass';
            for (let i = this.circuit.surfaceZones.length - 1; i >= 0; i--) {
                const z = this.circuit.surfaceZones[i];
                if (CircuitLoader.IsPointInSurfaceZone(z, this.mouseWorld.x, this.mouseWorld.y)) {
                    sName = SURFACE[z.surfaceKey]?.name || z.surfaceKey;
                    break;
                }
            }
            surfEl.textContent = `Surface: ${sName}`;
        }
    }

    // ── Canvas Rendering ─────────────────────────────────────────────

    _resolveObstacleCss(colorKey, customHex) {
        if (colorKey && colorKey !== 'CUSTOM' && OBSTACLE_COLOR_PRESETS[colorKey]?.color) {
            return colorToHex(OBSTACLE_COLOR_PRESETS[colorKey].color);
        }
        return customHex || '#cc3326';
    }

    _requestRedraw() {
        if (this._rafPending) return;
        this._rafPending = true;
        requestAnimationFrame(() => {
            this._rafPending = false;
            this.draw();
        });
    }

    draw() {
        const ctx = this.ctx;
        const cw  = this.canvas.width;
        const ch  = this.canvas.height;
        const c   = this.circuit;
        const wW  = c.width  || WORLD_W;
        const wH  = c.height || WORLD_H;

        ctx.clearRect(0, 0, cw, ch);

        // Outer void background
        ctx.fillStyle = '#090b10';
        ctx.fillRect(0, 0, cw, ch);

        ctx.save();
        ctx.translate(cw * 0.5, ch * 0.5);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.camX, -this.camY);

        // 1. World Grass Base
        ctx.fillStyle = colorToHex(SURFACE.GRASS.color);
        ctx.fillRect(0, 0, wW, wH);

        // 2. Surface Zones
        if (this.layers.surfaces.visible) {
            for (let i = 0; i < c.surfaceZones.length; i++) {
                const z = c.surfaceZones[i];
                const surf = SURFACE[z.surfaceKey] || SURFACE.ASPHALT;
                ctx.fillStyle = colorToHex(surf.color);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
                ctx.lineWidth = 1 / this.zoom;
                if (Array.isArray(z.points) && z.points.length >= 3) {
                    ctx.beginPath();
                    ctx.moveTo(z.points[0].x, z.points[0].y);
                    for (let k = 1; k < z.points.length; k++) {
                        ctx.lineTo(z.points[k].x, z.points[k].y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                } else {
                    const rot = z.rotation || 0;
                    if (rot) {
                        const cx = z.x + z.w * 0.5, cy = z.y + z.h * 0.5;
                        ctx.save();
                        ctx.translate(cx, cy);
                        ctx.rotate(rot);
                        ctx.fillRect(-z.w * 0.5, -z.h * 0.5, z.w, z.h);
                        ctx.strokeRect(-z.w * 0.5, -z.h * 0.5, z.w, z.h);
                        ctx.restore();
                    } else {
                        ctx.fillRect(z.x, z.y, z.w, z.h);
                        ctx.strokeRect(z.x, z.y, z.w, z.h);
                    }
                }
            }
        }

        // 3. Grid Overlay
        if (this.showGrid) {
            const step = this.snapSize > 0 ? this.snapSize : 50;
            const drawStep = (step * this.zoom < 8) ? step * 4 : step;
            ctx.lineWidth = 1 / this.zoom;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.beginPath();
            for (let x = 0; x <= wW; x += drawStep) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, wH);
            }
            for (let y = 0; y <= wH; y += drawStep) {
                ctx.moveTo(0, y);
                ctx.lineTo(wW, y);
            }
            ctx.stroke();

            // Major 200px grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
            ctx.beginPath();
            for (let x = 0; x <= wW; x += 200) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, wH);
            }
            for (let y = 0; y <= wH; y += 200) {
                ctx.moveTo(0, y);
                ctx.lineTo(wW, y);
            }
            ctx.stroke();
        }

        // World Border
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2 / this.zoom;
        ctx.strokeRect(0, 0, wW, wH);

        // 4. Checkpoints & Start/Finish Line
        if (this.layers.checkpoints.visible) {
            for (let i = 0; i < c.checkpoints.length; i++) {
                const cp = c.checkpoints[i];
                const isSF = cp.id === 0;
                ctx.save();
                ctx.translate(cp.x, cp.y);
                if (cp.rotation) ctx.rotate(cp.rotation);

                const hw = cp.w * 0.5, hh = cp.h * 0.5;
                ctx.fillStyle = isSF ? 'rgba(255, 215, 0, 0.25)' : 'rgba(56, 189, 248, 0.20)';
                ctx.fillRect(-hw, -hh, cp.w, cp.h);

                if (isSF) {
                    // Checkerboard strip on Start/Finish
                    const isHorizontalTrack = cp.h > cp.w;
                    const stripThick = 14;
                    const sq = 7;
                    if (isHorizontalTrack) {
                        const rows = Math.floor(cp.h / sq);
                        const cols = Math.max(1, Math.floor(stripThick / sq));
                        for (let r = 0; r < rows; r++) {
                            for (let col = 0; col < cols; col++) {
                                ctx.fillStyle = (r + col) % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,20,0.85)';
                                ctx.fillRect(-stripThick * 0.5 + col * sq, -hh + r * sq, sq, sq);
                            }
                        }
                    } else {
                        const cols = Math.floor(cp.w / sq);
                        const rows = Math.max(1, Math.floor(stripThick / sq));
                        for (let r = 0; r < rows; r++) {
                            for (let col = 0; col < cols; col++) {
                                ctx.fillStyle = (r + col) % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,20,0.85)';
                                ctx.fillRect(-hw + col * sq, -stripThick * 0.5 + r * sq, sq, sq);
                            }
                        }
                    }
                }

                ctx.strokeStyle = isSF ? '#ffd54f' : '#38bdf8';
                ctx.lineWidth = 2 / this.zoom;
                ctx.strokeRect(-hw, -hh, cp.w, cp.h);

                // Label
                ctx.fillStyle = isSF ? '#ffd54f' : '#bae6fd';
                ctx.font = `bold ${Math.max(10, Math.round(12 / this.zoom))}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(isSF ? 'S/F (CP 0)' : `CP ${cp.id}`, 0, 0);
                ctx.restore();
            }
        }

        // 5. Obstacles (Walls & Barrels)
        if (this.layers.obstacles.visible) {
            for (let i = 0; i < c.obstacles.length; i++) {
                const ob = c.obstacles[i];
                const colCss = this._resolveObstacleCss(ob.colorKey, ob.customHex);
                ctx.save();
                ctx.translate(ob.cx, ob.cy);
                if (ob.isBarrel) {
                    const r = ob.w * 0.5;
                    ctx.fillStyle = colCss;
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.lineWidth = 2 / this.zoom;
                    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
                    ctx.stroke();
                    // Inner tire/barrel ring
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
                    ctx.stroke();
                } else {
                    if (ob.rotation) ctx.rotate(ob.rotation);
                    ctx.fillStyle = colCss;
                    ctx.fillRect(-ob.w * 0.5, -ob.h * 0.5, ob.w, ob.h);
                    ctx.lineWidth = 1.5 / this.zoom;
                    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
                    ctx.strokeRect(-ob.w * 0.5, -ob.h * 0.5, ob.w, ob.h);
                }
                ctx.restore();
            }
        }

        // 6. AI Waypoints & Racing Line
        if (this.layers.waypoints.visible && c.waypoints.length > 0) {
            const wps = c.waypoints;
            if (wps.length >= 2) {
                ctx.save();
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
                ctx.lineWidth = 2.2 / this.zoom;
                ctx.setLineDash([10 / this.zoom, 6 / this.zoom]);
                ctx.beginPath();
                ctx.moveTo(wps[0].x, wps[0].y);
                for (let i = 1; i < wps.length; i++) {
                    ctx.lineTo(wps[i].x, wps[i].y);
                }
                if (wps.length >= 3) ctx.closePath();
                ctx.stroke();
                ctx.setLineDash([]);

                // Direction chevrons at segment midpoints
                ctx.fillStyle = '#38bdf8';
                for (let i = 0; i < wps.length; i++) {
                    const a = wps[i];
                    const b = wps[(i + 1) % wps.length];
                    if (wps.length < 3 && i === wps.length - 1) break;
                    const mx = (a.x + b.x) * 0.5, my = (a.y + b.y) * 0.5;
                    const ang = Math.atan2(b.y - a.y, b.x - a.x);
                    const sz = 7 / this.zoom;
                    ctx.save();
                    ctx.translate(mx, my);
                    ctx.rotate(ang);
                    ctx.beginPath();
                    ctx.moveTo(sz, 0);
                    ctx.lineTo(-sz, -sz * 0.7);
                    ctx.lineTo(-sz * 0.4, 0);
                    ctx.lineTo(-sz, sz * 0.7);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                ctx.restore();
            }

            // Waypoint nodes
            for (let i = 0; i < wps.length; i++) {
                const wp = wps[i];
                const r = Math.max(7, 9 / this.zoom);
                ctx.fillStyle = i === 0 ? '#22c55e' : '#0284c7';
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.lineWidth = 1.5 / this.zoom;
                ctx.strokeStyle = '#e0f2fe';
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.max(9, Math.round(10 / this.zoom))}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(i), wp.x, wp.y);
            }
        }

        // 7. Vehicle Spawns
        if (this.layers.spawns.visible) {
            for (let i = 0; i < c.spawns.length; i++) {
                const sp = c.spawns[i];
                const col = SPAWN_SLOT_COLORS[i] || '#a855f7';
                ctx.save();
                ctx.translate(sp.x, sp.y);
                ctx.rotate(sp.rotation || 0);

                // Car body (22x40 matching Car collider in death_rally_cars.js)
                const cwCar = 22, chCar = 40;
                ctx.fillStyle = col;
                ctx.fillRect(-cwCar * 0.5, -chCar * 0.5, cwCar, chCar);
                ctx.lineWidth = 1.5 / this.zoom;
                ctx.strokeStyle = '#ffffff';
                ctx.strokeRect(-cwCar * 0.5, -chCar * 0.5, cwCar, chCar);

                // Windshield (near front = -Y in car local space)
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.fillRect(-cwCar * 0.36, -chCar * 0.35, cwCar * 0.72, chCar * 0.22);

                // Forward direction arrow (points along -Y in local space)
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2 / this.zoom;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -chCar * 0.82);
                ctx.lineTo(-5, -chCar * 0.62);
                ctx.moveTo(0, -chCar * 0.82);
                ctx.lineTo(5, -chCar * 0.62);
                ctx.stroke();

                ctx.restore();

                // Slot label badge
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.max(10, Math.round(11 / this.zoom))}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(i === 0 ? 'P1' : `AI${i}`, sp.x, sp.y - 24);
            }
        }

        // 8. Power-Up Pickups (with Lap / Time schedule badges)
        if (this.layers.pickups.visible) {
            for (let i = 0; i < c.pickups.length; i++) {
                const pk = c.pickups[i];
                const r = 13;
                let fill = '#ef4444';
                let glyph = 'W';
                if (pk.type === 'weapon') {
                    fill = '#ef4444';
                    glyph = pk.data === 'MISSILE' ? '🚀' : (pk.data === 'MINE' ? '💣' : '🔫');
                } else if (pk.type === 'health') {
                    fill = '#22c55e';
                    glyph = '+HP';
                } else if (pk.type === 'money') {
                    fill = '#eab308';
                    glyph = '$';
                }

                ctx.save();
                ctx.translate(pk.x, pk.y);
                ctx.fillStyle = fill;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.lineWidth = 2 / this.zoom;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.max(9, Math.round(10 / this.zoom))}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(glyph, 0, 0);

                // Schedule badge if spawnLap > 1 or spawnTime > 0
                if ((pk.spawnLap && pk.spawnLap > 1) || (pk.spawnTime && pk.spawnTime > 0)) {
                    const parts = [];
                    if (pk.spawnLap > 1) parts.push(`L${pk.spawnLap}`);
                    if (pk.spawnTime > 0) parts.push(`${pk.spawnTime}s`);
                    const badgeTxt = parts.join('/');

                    ctx.font = `bold ${Math.max(9, Math.round(10 / this.zoom))}px monospace`;
                    const tw = ctx.measureText(badgeTxt).width + 8 / this.zoom;
                    const th = 14 / this.zoom;
                    const bx = -tw * 0.5;
                    const by = r + 3 / this.zoom;

                    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                    ctx.fillRect(bx, by, tw, th);
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 1 / this.zoom;
                    ctx.strokeRect(bx, by, tw, th);

                    ctx.fillStyle = '#fbbf24';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(badgeTxt, 0, by + th * 0.5);
                }
                ctx.restore();
            }
        }

        // 9. Active Polygon / Road / Wall-Chain Preview
        if (this.activePoints.length > 0) {
            const pts = [...this.activePoints, this.mouseSnapped];
            ctx.save();
            if (this.activeTool === 'road_brush' && pts.length >= 2) {
                const previewQuads = this._buildRoadStripPolygons(
                    pts,
                    this.toolDefaults.roadWidth || 240,
                    this.toolDefaults.roadClosedLoop && pts.length >= 3
                );
                ctx.fillStyle = 'rgba(255, 152, 0, 0.26)';
                ctx.strokeStyle = '#ff9800';
                ctx.lineWidth = 1.5 / this.zoom;
                for (const q of previewQuads) {
                    ctx.beginPath();
                    ctx.moveTo(q[0].x, q[0].y);
                    for (let k = 1; k < q.length; k++) ctx.lineTo(q[k].x, q[k].y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            }

            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 2 / this.zoom;
            ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            if (this.activeTool === 'surface_poly' && pts.length >= 3) {
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 152, 0, 0.22)';
                ctx.fill();
            }
            ctx.stroke();
            ctx.setLineDash([]);

            for (const p of this.activePoints) {
                ctx.fillStyle = '#ff9800';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5 / this.zoom, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 10. Selected Element Highlight & Transform Handles
        this._drawSelectionOverlay(ctx);

        // 11. Snapped Cursor Reticle
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.55)';
        ctx.lineWidth = 1 / this.zoom;
        const cr = 5 / this.zoom;
        ctx.beginPath();
        ctx.moveTo(this.mouseSnapped.x - cr, this.mouseSnapped.y);
        ctx.lineTo(this.mouseSnapped.x + cr, this.mouseSnapped.y);
        ctx.moveTo(this.mouseSnapped.x, this.mouseSnapped.y - cr);
        ctx.lineTo(this.mouseSnapped.x, this.mouseSnapped.y + cr);
        ctx.stroke();

        ctx.restore();
    }

    _drawSelectionOverlay(ctx) {
        if (!this.selected) return;
        const { layer, index } = this.selected;
        const obj = this._getSelectedObjectRef();
        if (!obj) return;

        ctx.save();
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2 / this.zoom;

        const drawOBBOutline = (cx, cy, w, h, rot = 0) => {
            ctx.save();
            ctx.translate(cx, cy);
            if (rot) ctx.rotate(rot);
            ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);
            // Stem to rotation handle
            const rotDist = 28 / this.zoom;
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.5);
            ctx.lineTo(0, -h * 0.5 - rotDist);
            ctx.stroke();
            ctx.restore();
        };

        if (layer === 'surfaces') {
            if (Array.isArray(obj.points) && obj.points.length >= 3) {
                ctx.beginPath();
                ctx.moveTo(obj.points[0].x, obj.points[0].y);
                for (let i = 1; i < obj.points.length; i++) ctx.lineTo(obj.points[i].x, obj.points[i].y);
                ctx.closePath();
                ctx.stroke();
            } else {
                drawOBBOutline(obj.x + obj.w * 0.5, obj.y + obj.h * 0.5, obj.w, obj.h, obj.rotation || 0);
            }
        } else if (layer === 'obstacles') {
            if (obj.isBarrel) {
                ctx.beginPath();
                ctx.arc(obj.cx, obj.cy, obj.w * 0.5 + 3 / this.zoom, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                drawOBBOutline(obj.cx, obj.cy, obj.w, obj.h, obj.rotation || 0);
            }
        } else if (layer === 'checkpoints') {
            drawOBBOutline(obj.x, obj.y, obj.w, obj.h, obj.rotation || 0);
        } else if (layer === 'spawns') {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, 26, 0, Math.PI * 2);
            ctx.stroke();
            const fwdX = Math.sin(obj.rotation || 0), fwdY = -Math.cos(obj.rotation || 0);
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y);
            ctx.lineTo(obj.x + fwdX * 36, obj.y + fwdY * 36);
            ctx.stroke();
        } else if (layer === 'waypoints') {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, 15 / this.zoom, 0, Math.PI * 2);
            ctx.stroke();
        } else if (layer === 'pickups') {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, 18, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw interactive handles
        const handles = this._getSelectionHandles();
        const hs = 5 / this.zoom;
        for (const h of handles) {
            if (h.type === 'rotate' || h.type === 'spawn_heading') {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(h.x, h.y, hs * 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1.5 / this.zoom;
                ctx.stroke();
            } else if (h.type === 'poly_mid') {
                ctx.fillStyle = 'rgba(255, 152, 0, 0.65)';
                ctx.beginPath();
                ctx.arc(h.x, h.y, hs * 0.85, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#ff9800';
                ctx.lineWidth = 1.5 / this.zoom;
                ctx.fillRect(h.x - hs, h.y - hs, hs * 2, hs * 2);
                ctx.strokeRect(h.x - hs, h.y - hs, hs * 2, hs * 2);
            }
        }
        ctx.restore();
    }

    // ── Code Modal & File Export ─────────────────────────────────────

    _openCodeModal(mode) {
        this._codeModalMode = mode;
        const modal      = document.getElementById('code-modal');
        const title      = document.getElementById('code-modal-title');
        const desc       = document.getElementById('code-modal-desc');
        const textarea   = /** @type {HTMLTextAreaElement} */ (document.getElementById('code-modal-textarea'));
        const btnCopy    = document.getElementById('btn-modal-copy');
        const btnDlJs    = document.getElementById('btn-modal-download-js');
        const btnApply   = document.getElementById('btn-modal-import-apply');

        if (!modal || !textarea) return;

        if (mode === 'view' || mode === 'export') {
            title.textContent = `Export Circuit — ${this.circuit.constName}.js`;
            desc.innerHTML = `Copy this module into <code>src/examples/death_rally/circuits/</code> or download it directly.`;
            textarea.readOnly = false;
            textarea.value = this.generateJSCode();
            if (btnCopy)  btnCopy.style.display  = 'inline-flex';
            if (btnDlJs)  btnDlJs.style.display  = 'inline-flex';
            if (btnApply) btnApply.style.display = 'none';
        } else {
            title.textContent = 'Paste Circuit JS / JSON Code';
            desc.textContent  = 'Paste an existing circuit .js definition (e.g. OVAL_TRACK) or JSON object below and click Load.';
            textarea.readOnly = false;
            textarea.value    = '';
            textarea.placeholder = 'const MY_CIRCUIT = {\n  name: "My Track",\n  laps: 4,\n  ...\n};';
            if (btnCopy)  btnCopy.style.display  = 'none';
            if (btnDlJs)  btnDlJs.style.display  = 'none';
            if (btnApply) btnApply.style.display = 'inline-flex';
        }

        modal.style.display = 'flex';
        textarea.focus();
    }

    downloadJS() {
        const filename = `${(this.circuit.constName || 'custom_circuit').toLowerCase()}.js`;
        this._triggerDownload(filename, this.generateJSCode(), 'text/javascript');
    }

    downloadJSON() {
        const filename = `${(this.circuit.constName || 'custom_circuit').toLowerCase()}.json`;
        this._triggerDownload(filename, this.generateJSONCode(), 'application/json');
    }

    _triggerDownload(filename, content, mime) {
        const blob = new Blob([content], { type: mime });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ── Live Embedded Test Race ──────────────────────────────────────

    startTestRace() {
        const overlay = document.getElementById('test-race-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        this.isTestingRace = true;

        const runtimeDef = this.toRuntimeDefinition();

        const launchIntoGame = () => {
            if (!game || typeof game.TestCustomCircuit !== 'function') return;
            game.TestCustomCircuit(runtimeDef);

            if (this._testTelemetryInterval) clearInterval(this._testTelemetryInterval);
            this._testTelemetryInterval = setInterval(() => {
                const statusEl = document.getElementById('test-telemetry-status');
                if (!statusEl || !game || !game.raceManager) return;
                const t   = (game.raceManager.raceElapsedTime || 0).toFixed(1);
                const lap = game.raceManager.GetLeadingLap();
                const maxLaps = game.raceManager.circuit?.laps || 3;
                const pending = (game._pendingPickups || []).length;
                statusEl.textContent = `Time: ${t}s | Leading Lap: ${lap}/${maxLaps} | Scheduled Pickups Waiting: ${pending}`;
            }, 200);
        };

        if (!this._engineInitialized) {
            this._engineInitialized = true;
            Init(DeathRallyGame, 'canvas');
            // Wait for engine Start() to finish initializing `game.raceManager`
            const waitInit = setInterval(() => {
                if (typeof game !== 'undefined' && game && game.raceManager) {
                    clearInterval(waitInit);
                    launchIntoGame();
                }
            }, 50);
        } else {
            if (!requestAnimationFrameID) {
                time = performance.now();
                requestAnimationFrameID = requestAnimationFrame(Loop);
            }
            launchIntoGame();
        }
    }

    stopTestRace() {
        const overlay = document.getElementById('test-race-overlay');
        if (overlay) overlay.style.display = 'none';
        this.isTestingRace = false;

        if (this._testTelemetryInterval) {
            clearInterval(this._testTelemetryInterval);
            this._testTelemetryInterval = null;
        }

        if (typeof requestAnimationFrameID !== 'undefined' && requestAnimationFrameID) {
            cancelAnimationFrame(requestAnimationFrameID);
            requestAnimationFrameID = null;
        }
        this._requestRedraw();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.circuitEditor = new CircuitEditor();
});
