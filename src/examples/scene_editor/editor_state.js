// =====================================================================
// spark.js Scene Editor — Central State, Undo/Redo & Built-in Samples
// =====================================================================

const EditorState = {
    /** Active `spark.scene` v1 JSON object. */
    scene: null,

    /**
     * In-memory runtime asset cache used by the Edit Viewport & Playtest iframe.
     * images:    { [key]: { img: HTMLImageElement, url: string, atlas: Object|null } }
     * tilesets:  { [key]: { data: Object } }
     * particles: { [key]: { data: Object } }
     * audio:     { [key]: { url: string } }
     */
    runtimeAssets: {
        images: {},
        tilesets: {},
        particles: {},
        audio: {}
    },

    /**
     * Project scripts stored as `{ [className]: { id, path, code, schema, error } }`.
     * Synced with `scene.assets.scripts` and local folder (if open).
     */
    scripts: {},

    /** Selection & interaction state */
    selectedIds: new Set(),
    lockedIds: new Set(),
    activeTool: 'move', // 'move' | 'rotate' | 'scale'
    showGrid: true,
    snapEnabled: false,
    gridSize: 32,
    showColliders: true,
    liveParticles: true,

    /** Viewport camera */
    zoom: 1,
    panX: 80,
    panY: 60,

    /** Play Mode state */
    playState: 'edit', // 'edit' | 'playing' | 'paused'
    playRenderer: 'canvas2d',

    /** Local Folder Handle (File System Access API) */
    folderHandle: null,
    folderName: null,

    /** Undo / Redo snapshot stacks */
    undoStack: [],
    redoStack: [],
    MAX_HISTORY: 50,
    _inTransaction: false,
    _txBeforeSnapshot: null,

    /** Listeners notified on state mutations */
    _listeners: [],

    OnChange(fn) {
        this._listeners.push(fn);
    },

    Emit(reason = 'update') {
        for (const fn of this._listeners) {
            fn(reason);
        }
    },

    // ── Undo / Redo ──────────────────────────────────────────

    _takeSnapshot() {
        return JSON.stringify({
            scene: this.scene,
            selectedIds: Array.from(this.selectedIds)
        });
    },

    _restoreSnapshot(snapStr) {
        const parsed = JSON.parse(snapStr);
        this.scene = parsed.scene;
        this.selectedIds = new Set(parsed.selectedIds || []);
        this.Emit('restore');
    },

    PushUndo() {
        this.undoStack.push(this._takeSnapshot());
        if (this.undoStack.length > this.MAX_HISTORY) this.undoStack.shift();
        this.redoStack.length = 0;
    },

    BeginTransaction() {
        if (!this._inTransaction) {
            this._inTransaction = true;
            this._txBeforeSnapshot = this._takeSnapshot();
        }
    },

    CommitTransaction() {
        if (this._inTransaction) {
            this._inTransaction = false;
            const after = this._takeSnapshot();
            if (this._txBeforeSnapshot && this._txBeforeSnapshot !== after) {
                this.undoStack.push(this._txBeforeSnapshot);
                if (this.undoStack.length > this.MAX_HISTORY) this.undoStack.shift();
                this.redoStack.length = 0;
            }
            this._txBeforeSnapshot = null;
            this.Emit('history');
        }
    },

    Undo() {
        if (this.undoStack.length === 0) return;
        this.redoStack.push(this._takeSnapshot());
        const prev = this.undoStack.pop();
        this._restoreSnapshot(prev);
    },

    Redo() {
        if (this.redoStack.length === 0) return;
        this.undoStack.push(this._takeSnapshot());
        const next = this.redoStack.pop();
        this._restoreSnapshot(next);
    },

    ClearHistory() {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
    },

    // ── Entity Helpers ───────────────────────────────────────

    GenerateId(prefix = 'ent') {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    },

    GetEntity(id) {
        if (!this.scene?.entities) return null;
        return this.scene.entities.find(e => e.id === id) || null;
    },

    GetPrimarySelected() {
        if (this.selectedIds.size === 0) return null;
        const firstId = this.selectedIds.values().next().value;
        return this.GetEntity(firstId);
    },

    SelectEntity(id, additive = false) {
        if (!additive) this.selectedIds.clear();
        if (id) {
            if (additive && this.selectedIds.has(id)) {
                this.selectedIds.delete(id);
            }
            else {
                this.selectedIds.add(id);
            }
        }
        this.Emit('selection');
    },

    CreateDefaultEntity(type, x = 200, y = 200, extraProps = {}) {
        const count = (this.scene?.entities?.length || 0) + 1;
        const base = {
            id: this.GenerateId('ent'),
            name: `${type.replace(/GO$|Object$/, '')}_${count}`,
            tag: '',
            type,
            active: true,
            zIndex: 0,
            transform: { x: Math.round(x), y: Math.round(y), rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
            props: {},
            collider: { type: 'None' },
            physicsBody: null,
            scripts: []
        };

        switch (type) {
            case 'RectangleGO':
                base.props = { width: 80, height: 80, color: '#5b8cff', stroke: false, lineWidth: 2 };
                break;
            case 'CircleGO':
                base.props = { radius: 32, color: '#ff9800', stroke: false, lineWidth: 2 };
                break;
            case 'SpriteObject': {
                const firstImg = Object.keys(this.scene?.assets?.images || {})[0] || '';
                base.props = { imageKey: firstImg, alpha: 1, flipX: false, flipY: false };
                break;
            }
            case 'SpriteSectionObject': {
                const firstImg = Object.keys(this.scene?.assets?.images || {})[0] || '';
                base.props = { imageKey: firstImg, atlasFrame: '', sectionX: 0, sectionY: 0, sectionW: 32, sectionH: 32, alpha: 1, flipX: false, flipY: false };
                break;
            }
            case 'SSAnimationObjectBasic': {
                const firstImg = Object.keys(this.scene?.assets?.images || {})[0] || '';
                base.props = { imageKey: firstImg, frameWidth: 32, frameHeight: 32, frameCount: [4], framesDuration: 0.12, initialAnimation: 0, loop: true, flipX: false, flipY: false };
                break;
            }
            case 'Tileset': {
                const firstImg = Object.keys(this.scene?.assets?.images || {})[0] || '';
                const firstTs  = Object.keys(this.scene?.assets?.tilesets || {})[0] || '';
                base.props = { imageKey: firstImg, tilesetKey: firstTs };
                base.zIndex = -10;
                break;
            }
            case 'ParticleSystemGO': {
                const firstPt = Object.keys(this.scene?.assets?.particles || {})[0] || '';
                base.props = {
                    imageKey: '',
                    particleKey: firstPt,
                    emitting: true,
                    config: {
                        renderShape: 'circle',
                        PARTICLE_SIZE: 12,
                        emitterType: 0,
                        maxParticleCount: 80,
                        globalCompositeOperation: 'lighter',
                        MIN_INITIAL_VELOCITY: 25,
                        MAX_INITIAL_VELOCITY: 70,
                        GRAVITY_Y: -40,
                        MIN_INITIAL_SCALE: 0.5,
                        MAX_INITIAL_SCALE: 1.0,
                        MIN_SCALE_VELOCITY: -0.3,
                        MAX_SCALE_VELOCITY: -0.1,
                        startColor: '#ffaa22',
                        endColor: '#ff2200',
                        MIN_TIME_TO_SPAWN_PARTICLE: 0.02,
                        MAX_TIME_TO_SPAWN_PARTICLE: 0.05
                    }
                };
                break;
            }
            case 'TextGO':
                base.props = { text: 'Hello spark.js!', font: 'bold 20px Arial', color: '#ffffff', align: 'center', baseline: 'middle', stroke: false, lineWidth: 2 };
                break;
            case 'Box2DRectangleGO':
                base.props = { width: 80, height: 80, color: '#43a047' };
                base.physicsBody = { enabled: true, shape: 'Box', bodyType: 'dynamic', widthPx: 80, heightPx: 80, density: 1, friction: 0.5, restitution: 0.3, isSensor: false, fixedRotation: false };
                break;
            case 'Box2DSpriteObject': {
                const firstImg = Object.keys(this.scene?.assets?.images || {})[0] || '';
                base.props = { imageKey: firstImg, alpha: 1 };
                base.physicsBody = { enabled: true, shape: 'Box', bodyType: 'dynamic', widthPx: 48, heightPx: 48, density: 1, friction: 0.5, restitution: 0.3, isSensor: false, fixedRotation: false };
                break;
            }
            case 'Box2DTrigger':
                base.props = { width: 96, height: 48, color: '#ffd54f' };
                base.physicsBody = { enabled: true, shape: 'Box', bodyType: 'static', widthPx: 96, heightPx: 48, density: 1, friction: 0, restitution: 0, isSensor: true, fixedRotation: true };
                break;
        }

        Object.assign(base.props, extraProps);
        return base;
    },

    AddEntity(entityDef) {
        this.PushUndo();
        this.scene.entities.push(entityDef);
        this.SelectEntity(entityDef.id, false);
        this.Emit('entities');
        return entityDef;
    },

    DuplicateSelected() {
        if (this.selectedIds.size === 0) return;
        this.PushUndo();
        const newIds = [];
        for (const id of this.selectedIds) {
            const orig = this.GetEntity(id);
            if (!orig) continue;
            const copy = JSON.parse(JSON.stringify(orig));
            copy.id = this.GenerateId('ent');
            copy.name = `${orig.name}_copy`;
            copy.transform.x += 24;
            copy.transform.y += 24;
            this.scene.entities.push(copy);
            newIds.push(copy.id);
        }
        this.selectedIds = new Set(newIds);
        this.Emit('entities');
    },

    DeleteSelected() {
        if (this.selectedIds.size === 0) return;
        this.PushUndo();
        this.scene.entities = this.scene.entities.filter(e => !this.selectedIds.has(e.id));
        this.selectedIds.clear();
        this.Emit('entities');
    },

    SaveSelectedAsPrefab() {
        const ent = this.GetPrimarySelected();
        if (!ent) return null;
        this.PushUndo();
        if (!this.scene.prefabs) this.scene.prefabs = {};
        const key = ent.name.toLowerCase().replace(/[^a-z0-9_]+/g, '_') || this.GenerateId('prefab');
        const copy = JSON.parse(JSON.stringify(ent));
        delete copy.id;
        this.scene.prefabs[key] = copy;
        this.Emit('prefabs');
        return key;
    },

    SpawnPrefabInEditor(prefabId, x = 240, y = 200) {
        const pf = this.scene?.prefabs?.[prefabId];
        if (!pf) return null;
        this.PushUndo();
        const ent = JSON.parse(JSON.stringify(pf));
        ent.id = this.GenerateId('ent');
        ent.transform = Object.assign({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 }, ent.transform || {});
        ent.transform.x = Math.round(x);
        ent.transform.y = Math.round(y);
        this.scene.entities.push(ent);
        this.SelectEntity(ent.id, false);
        this.Emit('entities');
        return ent;
    },

    // ── Asset Loading into Runtime Cache ─────────────────────

    LoadImageAsset(key, url, atlasJson = null) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                img.halfWidth = img.width / 2;
                img.halfHeight = img.height / 2;
                this.runtimeAssets.images[key] = { img, url, atlas: atlasJson };
                this.Emit('assets');
                resolve(img);
            };
            img.onerror = () => {
                this.runtimeAssets.images[key] = { img: null, url, atlas: atlasJson };
                this.Emit('assets');
                resolve(null);
            };
            img.src = url;
        });
    },

    async RefreshRuntimeAssets() {
        const assets = this.scene?.assets || {};
        const promises = [];

        if (assets.images) {
            for (const [key, entry] of Object.entries(assets.images)) {
                if (!entry) continue;
                const url = entry._dataUrl || entry.path;
                if (!url) continue;
                let atlasData = entry.atlas || null;
                if (!atlasData && entry.atlasJsonPath) {
                    try {
                        const r = await fetch(entry.atlasJsonPath);
                        if (r.ok) atlasData = await r.json();
                    } catch (_) {}
                }
                promises.push(this.LoadImageAsset(key, url, atlasData));
            }
        }

        if (assets.tilesets) {
            for (const [key, entry] of Object.entries(assets.tilesets)) {
                if (!entry) continue;
                if (entry.data) {
                    this.runtimeAssets.tilesets[key] = { data: entry.data };
                }
                else if (entry.path) {
                    try {
                        const r = await fetch(entry.path);
                        if (r.ok) this.runtimeAssets.tilesets[key] = { data: await r.json() };
                    } catch (_) {}
                }
            }
        }

        if (assets.particles) {
            for (const [key, entry] of Object.entries(assets.particles)) {
                if (!entry) continue;
                if (entry.data) {
                    this.runtimeAssets.particles[key] = { data: entry.data };
                }
                else if (entry.path) {
                    try {
                        const r = await fetch(entry.path);
                        if (r.ok) this.runtimeAssets.particles[key] = { data: await r.json() };
                    } catch (_) {}
                }
            }
        }

        await Promise.all(promises);
        this.Emit('assets');
    },

    // ── Built-in Sample Projects ─────────────────────────────

    LoadSample(sampleKey) {
        this.ClearHistory();
        this.selectedIds.clear();
        this.lockedIds.clear();
        this.runtimeAssets = { images: {}, tilesets: {}, particles: {}, audio: {} };
        this.scripts = {};

        const sample = SCENE_EDITOR_SAMPLES[sampleKey] || SCENE_EDITOR_SAMPLES.blankScene;
        this.scene = JSON.parse(JSON.stringify(sample.scene));

        // Load sample scripts into EditorScripts
        if (sample.scripts) {
            for (const [name, code] of Object.entries(sample.scripts)) {
                EditorScripts.SetScript(name, code, `scripts/${name}.js`);
            }
        }

        this.RefreshRuntimeAssets();
        this.Emit('project-loaded');
    }
};

// ── Built-in Playable Sample Projects ────────────────────────

const SCENE_EDITOR_SAMPLES = {
    arcadeCourtyard: {
        scene: {
            format: 'spark.scene',
            version: 1,
            meta: {
                name: '2D Arcade Courtyard',
                author: 'spark.js',
                gridSize: 32,
                backgroundColor: '#181c28'
            },
            config: {
                screenWidth: 800,
                screenHeight: 500,
                imageSmoothingEnabled: false,
                fillWindow: false,
                preserveAspectRatio: true,
                drawColliders: false,
                mobileSupport: false,
                fpsCap: 0,
                unlockFrameRate: false
            },
            physics: { enabled: false, scale: 30, gravity: { x: 0, y: -9.8 }, doSleep: true },
            input: {
                actions: {
                    Dash: [{ type: 'key', code: 32 }]
                },
                axes: {
                    MoveX: [
                        { type: 'key', positive: 68, negative: 65 },
                        { type: 'key', positive: 39, negative: 37 }
                    ],
                    MoveY: [
                        { type: 'key', positive: 83, negative: 87 },
                        { type: 'key', positive: 40, negative: 38 }
                    ]
                }
            },
            assets: {
                images: {
                    rupee: { path: 'src/examples/common_assets/green_rupee.png' }
                },
                tilesets: {},
                particles: {},
                audio: {},
                scripts: [
                    { id: 'PlayerController', path: 'scripts/PlayerController.js' },
                    { id: 'PatrolEnemy',      path: 'scripts/PatrolEnemy.js' },
                    { id: 'CollectibleSpin',  path: 'scripts/CollectibleSpin.js' }
                ]
            },
            camera: {
                type: 'FollowCamera',
                x: 0, y: 0, zoom: 1,
                targetEntityId: 'ent_player',
                minX: -120, maxX: 280, minY: -80, maxY: 180,
                smoothingSpeed: 6,
                offset: { x: 0, y: 0 }
            },
            backgroundLayers: [
                { type: 'StaticGradientLayer', dirX: 0, dirY: 1, colorStops: [[0, '#14192b'], [1, '#1f2940']] }
            ],
            prefabs: {
                rupee_pickup: {
                    name: 'Rupee',
                    tag: 'pickup',
                    type: 'SpriteObject',
                    active: true,
                    zIndex: 5,
                    transform: { x: 0, y: 0, rotation: 0, scaleX: 0.4, scaleY: 0.4, pivotX: 0, pivotY: 0 },
                    props: { imageKey: 'rupee', alpha: 1, flipX: false, flipY: false },
                    collider: { type: 'CircleCollider', radius: 18, offsetX: 0, offsetY: 0, enabled: true },
                    physicsBody: null,
                    scripts: [{ className: 'CollectibleSpin', enabled: true, props: { bobAmplitude: 6, bobSpeed: 4, points: 10 } }]
                }
            },
            entities: [
                {
                    id: 'ent_floor',
                    name: 'Courtyard Floor',
                    tag: 'env',
                    type: 'RectangleGO',
                    active: true,
                    zIndex: -5,
                    transform: { x: 400, y: 270, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: { width: 680, height: 380, color: '#242c3e', stroke: false, lineWidth: 2 },
                    collider: { type: 'None' },
                    physicsBody: null,
                    scripts: []
                },
                {
                    id: 'ent_border',
                    name: 'Arena Border',
                    tag: 'env',
                    type: 'RectangleGO',
                    active: true,
                    zIndex: -4,
                    transform: { x: 400, y: 270, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: { width: 680, height: 380, color: '#4c6599', stroke: true, lineWidth: 3 },
                    collider: { type: 'None' },
                    physicsBody: null,
                    scripts: []
                },
                {
                    id: 'ent_title',
                    name: 'Title Label',
                    tag: 'ui',
                    type: 'TextGO',
                    active: true,
                    zIndex: 20,
                    transform: { x: 400, y: 54, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: { text: 'WASD / Arrows to Move · Collect Rupees · Avoid Guards!', font: 'bold 16px Arial', color: '#cfe0ff', align: 'center', baseline: 'middle', stroke: false, lineWidth: 1 },
                    collider: { type: 'None' },
                    physicsBody: null,
                    scripts: []
                },
                {
                    id: 'ent_player',
                    name: 'Player',
                    tag: 'player',
                    type: 'RectangleGO',
                    active: true,
                    zIndex: 10,
                    transform: { x: 180, y: 260, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: { width: 36, height: 36, color: '#5b8cff', stroke: false, lineWidth: 2 },
                    collider: { type: 'RectangleCollider', width: 36, height: 36, offsetX: 0, offsetY: 0, enabled: true },
                    physicsBody: null,
                    scripts: [{ className: 'PlayerController', enabled: true, props: { speed: 240, dashMultiplier: 1.8 } }]
                },
                {
                    id: 'ent_guard_1',
                    name: 'Patrol Guard',
                    tag: 'enemy',
                    type: 'CircleGO',
                    active: true,
                    zIndex: 9,
                    transform: { x: 420, y: 220, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: { radius: 22, color: '#e05555', stroke: false, lineWidth: 2 },
                    collider: { type: 'CircleCollider', radius: 22, offsetX: 0, offsetY: 0, enabled: true },
                    physicsBody: null,
                    scripts: [{ className: 'PatrolEnemy', enabled: true, props: { speed: 140, distance: 110, axis: 'y' } }]
                },
                {
                    id: 'ent_rupee_1',
                    name: 'Rupee 1',
                    tag: 'pickup',
                    type: 'SpriteObject',
                    active: true,
                    zIndex: 5,
                    transform: { x: 560, y: 180, rotation: 0, scaleX: 0.4, scaleY: 0.4, pivotX: 0, pivotY: 0 },
                    props: { imageKey: 'rupee', alpha: 1, flipX: false, flipY: false },
                    collider: { type: 'CircleCollider', radius: 18, offsetX: 0, offsetY: 0, enabled: true },
                    physicsBody: null,
                    scripts: [{ className: 'CollectibleSpin', enabled: true, props: { bobAmplitude: 6, bobSpeed: 4, points: 10 } }]
                },
                {
                    id: 'ent_rupee_2',
                    name: 'Rupee 2',
                    tag: 'pickup',
                    type: 'SpriteObject',
                    active: true,
                    zIndex: 5,
                    transform: { x: 610, y: 340, rotation: 0, scaleX: 0.4, scaleY: 0.4, pivotX: 0, pivotY: 0 },
                    props: { imageKey: 'rupee', alpha: 1, flipX: false, flipY: false },
                    collider: { type: 'CircleCollider', radius: 18, offsetX: 0, offsetY: 0, enabled: true },
                    physicsBody: null,
                    scripts: [{ className: 'CollectibleSpin', enabled: true, props: { bobAmplitude: 6, bobSpeed: 4.5, points: 10 } }]
                },
                {
                    id: 'ent_fire',
                    name: 'Torch Sparks',
                    tag: 'fx',
                    type: 'ParticleSystemGO',
                    active: true,
                    zIndex: 8,
                    transform: { x: 400, y: 390, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: {
                        imageKey: '',
                        particleKey: '',
                        emitting: true,
                        config: {
                            renderShape: 'circle',
                            PARTICLE_SIZE: 14,
                            emitterType: 0,
                            maxParticleCount: 90,
                            globalCompositeOperation: 'lighter',
                            MIN_INITIAL_VELOCITY: 30,
                            MAX_INITIAL_VELOCITY: 80,
                            directionMode: 'polar',
                            MIN_ANGLE: -2.2,
                            MAX_ANGLE: -0.9,
                            GRAVITY_Y: -35,
                            MIN_INITIAL_SCALE: 0.4,
                            MAX_INITIAL_SCALE: 0.9,
                            MIN_SCALE_VELOCITY: -0.35,
                            MAX_SCALE_VELOCITY: -0.15,
                            startColor: '#ffcc33',
                            endColor: '#ff3300',
                            MIN_TIME_TO_SPAWN_PARTICLE: 0.02,
                            MAX_TIME_TO_SPAWN_PARTICLE: 0.05
                        }
                    },
                    collider: { type: 'None' },
                    physicsBody: null,
                    scripts: []
                }
            ]
        },
        scripts: {
            PlayerController: `class PlayerController extends Behavior {
    static inspector = {
        speed:          { type: "number", default: 240, min: 40, max: 600, step: 10 },
        dashMultiplier: { type: "number", default: 1.8, min: 1, max: 4, step: 0.1 }
    };

    Start() {
        this.score = 0;
        console.log("PlayerController started! Use WASD / Arrows + Space to dash.");
    }

    Update(dt) {
        const mx = Input.GetAxis("MoveX");
        const my = Input.GetAxis("MoveY");
        const mult = Input.GetAction("Dash") ? this.dashMultiplier : 1;

        this.x += mx * this.speed * mult * dt;
        this.y += my * this.speed * mult * dt;
    }

    OnCollisionEnter(myCol, otherCol) {
        const other = otherCol.go;
        if (!other) return;
        if (other.tag === "pickup") {
            this.score += 10;
            console.log("Collected " + other.name + "! Score:", this.score);
            this.game.Destroy(other);
        }
        else if (other.tag === "enemy") {
            console.warn("Hit by " + other.name + "! Respawning player.");
            this.x = 180;
            this.y = 260;
        }
    }

    Draw(renderer) {
        renderer.DrawFillText("Score: " + this.score, this.x, this.y - 28, "bold 13px Arial", Color.yellow, "center", "bottom");
    }
}
ScriptRegistry.Register("PlayerController", PlayerController);`,

            PatrolEnemy: `class PatrolEnemy extends Behavior {
    static inspector = {
        speed:    { type: "number", default: 140, min: 10, max: 500 },
        distance: { type: "number", default: 110, min: 10, max: 500 },
        axis:     { type: "select", default: "y", options: ["x", "y"] }
    };

    Start() {
        this.originX = this.x;
        this.originY = this.y;
        this.dir = 1;
    }

    Update(dt) {
        if (this.axis === "x") {
            this.x += this.speed * this.dir * dt;
            if (Math.abs(this.x - this.originX) >= this.distance) this.dir *= -1;
        }
        else {
            this.y += this.speed * this.dir * dt;
            if (Math.abs(this.y - this.originY) >= this.distance) this.dir *= -1;
        }
    }
}
ScriptRegistry.Register("PatrolEnemy", PatrolEnemy);`,

            CollectibleSpin: `class CollectibleSpin extends Behavior {
    static inspector = {
        bobAmplitude: { type: "number", default: 6, min: 0, max: 32 },
        bobSpeed:     { type: "number", default: 4, min: 0.5, max: 12 },
        points:       { type: "number", default: 10, min: 1, max: 100 }
    };

    Start() {
        this.baseY = this.y;
        this.t = Math.random() * 6.28;
    }

    Update(dt) {
        this.t += dt * this.bobSpeed;
        this.y = this.baseY + Math.sin(this.t) * this.bobAmplitude;
    }
}
ScriptRegistry.Register("CollectibleSpin", CollectibleSpin);`
        }
    },

    physicsPlayground: {
        scene: {
            format: 'spark.scene',
            version: 1,
            meta: { name: 'Box2D Physics Playground', author: 'spark.js', gridSize: 32, backgroundColor: '#161b22' },
            config: { screenWidth: 800, screenHeight: 500, imageSmoothingEnabled: true, fillWindow: false, preserveAspectRatio: true, drawColliders: true, mobileSupport: false, fpsCap: 0 },
            physics: { enabled: true, scale: 30, gravity: { x: 0, y: -9.8 }, doSleep: true },
            input: {
                actions: { Jump: [{ type: 'key', code: 32 }] },
                axes: { MoveX: [{ type: 'key', positive: 68, negative: 65 }] }
            },
            assets: {
                images: {}, tilesets: {}, particles: {}, audio: {},
                scripts: [{ id: 'Box2DJumper', path: 'scripts/Box2DJumper.js' }]
            },
            camera: { type: 'Camera', x: 0, y: 0, zoom: 1 },
            backgroundLayers: [{ type: 'StaticColorLayer', color: '#161b22' }],
            prefabs: {},
            entities: [
                {
                    id: 'ent_ground',
                    name: 'Ground Platform',
                    tag: 'ground',
                    type: 'Box2DRectangleGO',
                    active: true,
                    zIndex: 0,
                    transform: { x: 400, y: 460, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: { width: 720, height: 32, color: '#3b4a66' },
                    collider: { type: 'None' },
                    physicsBody: { enabled: true, shape: 'Box', bodyType: 'static', widthPx: 720, heightPx: 32, density: 1, friction: 0.7, restitution: 0.2, isSensor: false, fixedRotation: true },
                    scripts: []
                },
                {
                    id: 'ent_crate_1',
                    name: 'Dynamic Crate',
                    tag: 'player',
                    type: 'Box2DRectangleGO',
                    active: true,
                    zIndex: 5,
                    transform: { x: 320, y: 180, rotation: 0.15, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: { width: 54, height: 54, color: '#ff9800' },
                    collider: { type: 'None' },
                    physicsBody: { enabled: true, shape: 'Box', bodyType: 'dynamic', widthPx: 54, heightPx: 54, density: 1.2, friction: 0.5, restitution: 0.45, isSensor: false, fixedRotation: false },
                    scripts: [{ className: 'Box2DJumper', enabled: true, props: { jumpImpulse: 8, moveForce: 18 } }]
                },
                {
                    id: 'ent_crate_2',
                    name: 'Stacked Box',
                    tag: 'prop',
                    type: 'Box2DRectangleGO',
                    active: true,
                    zIndex: 4,
                    transform: { x: 480, y: 260, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: { width: 64, height: 64, color: '#43a047' },
                    collider: { type: 'None' },
                    physicsBody: { enabled: true, shape: 'Box', bodyType: 'dynamic', widthPx: 64, heightPx: 64, density: 1, friction: 0.5, restitution: 0.3, isSensor: false, fixedRotation: false },
                    scripts: []
                },
                {
                    id: 'ent_hint',
                    name: 'Instructions',
                    tag: 'ui',
                    type: 'TextGO',
                    active: true,
                    zIndex: 10,
                    transform: { x: 400, y: 40, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
                    props: { text: 'Box2D Physics — Press A / D to push orange crate, Space to jump!', font: 'bold 15px Arial', color: '#dbe8ff', align: 'center', baseline: 'middle', stroke: false, lineWidth: 1 },
                    collider: { type: 'None' },
                    physicsBody: null,
                    scripts: []
                }
            ]
        },
        scripts: {
            Box2DJumper: `class Box2DJumper extends Behavior {
    static inspector = {
        jumpImpulse: { type: "number", default: 8, min: 1, max: 30 },
        moveForce:   { type: "number", default: 18, min: 1, max: 60 }
    };

    Update(dt) {
        const mx = Input.GetAxis("MoveX");
        if (mx !== 0) {
            this.go.ApplyForce(mx * this.moveForce, 0);
        }
        if (Input.GetActionDown("Jump")) {
            this.go.ApplyImpulse(0, this.jumpImpulse);
        }
    }

    OnContactDetected(other) {
        if (other && other.name) {
            console.log("Physics contact with:", other.name);
        }
    }
}
ScriptRegistry.Register("Box2DJumper", Box2DJumper);`
        }
    },

    blankScene: {
        scene: {
            format: 'spark.scene',
            version: 1,
            meta: { name: 'Untitled Scene', author: '', gridSize: 32, backgroundColor: '#1a1a2e' },
            config: { screenWidth: 800, screenHeight: 600, imageSmoothingEnabled: true, fillWindow: false, preserveAspectRatio: true, drawColliders: false, mobileSupport: false, fpsCap: 0 },
            physics: { enabled: false, scale: 30, gravity: { x: 0, y: -9.8 }, doSleep: true },
            input: { actions: {}, axes: {} },
            assets: { images: {}, tilesets: {}, particles: {}, audio: {}, scripts: [] },
            camera: { type: 'Camera', x: 0, y: 0, zoom: 1 },
            backgroundLayers: [],
            prefabs: {},
            entities: []
        },
        scripts: {}
    }
};
