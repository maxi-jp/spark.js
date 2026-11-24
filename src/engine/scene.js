// ============================================================
// spark.js — Scene & Behavior Scripting System
// Provides: Behavior, ScriptRegistry, TextGO, SceneLoader,
//           SceneGame, and Box2DSceneGame (when Box2D is loaded).
// Requires: utils_math.js, utils_classes.js, renderer.js,
//           gameobjects.js, input.js, game.js
// Optional: particlesystem.js, box2d_game.js, box2d_gameobjects.js
// ============================================================

// #region Behavior Base Class

/**
 * Base class for reusable scripts attached to any GameObject via `go.AddScript(new MyBehavior())`.
 *
 * Subclasses may declare a static `inspector` metadata map so the spark.js Scene Editor
 * can auto-generate Inspector controls and serialize/deserialize custom properties:
 *
 * @example
 * class PatrolBehavior extends Behavior {
 *     static inspector = {
 *         speed:    { type: "number",  default: 120, min: 0, max: 600 },
 *         distance: { type: "number",  default: 200 },
 *         loop:     { type: "boolean", default: true }
 *     };
 *     Start() { this.startX = this.x; this.dir = 1; }
 *     Update(dt) {
 *         this.x += this.speed * this.dir * dt;
 *         if (Math.abs(this.x - this.startX) >= this.distance) this.dir *= -1;
 *     }
 * }
 * ScriptRegistry.Register("PatrolBehavior", PatrolBehavior);
 */
class Behavior {
    /**
     * Declarative inspector schema for the Scene Editor.
     * Supported types: "number" | "string" | "boolean" | "color" | "vec2" | "select" | "imageKey" | "audioKey" | "entityRef" | "prefabId"
     * @type {Object.<string, {type: string, default?: *, min?: number, max?: number, step?: number, options?: string[], label?: string}>}
     */
    static inspector = {};

    /** @type {GameObject|null} The GameObject this script is attached to. */
    gameObject = null;
    /** @type {Game|null} Reference to the owning Game instance. */
    game = null;
    /** @type {boolean} When false, Update/Draw/collision callbacks are skipped. */
    enabled = true;
    /** @type {boolean} Internal start guard. */
    _started = false;

    constructor(props = null) {
        // Apply inspector defaults first, then any passed props
        const schema = this.constructor.inspector;
        if (schema && typeof schema === 'object') {
            for (const key in schema) {
                if (!Object.prototype.hasOwnProperty.call(schema, key)) continue;
                const field = schema[key];
                if (field && field.default !== undefined) {
                    this[key] = (field.type === 'vec2' && field.default && typeof field.default === 'object')
                        ? new Vector2(field.default.x || 0, field.default.y || 0)
                        : field.default;
                }
            }
        }
        if (props && typeof props === 'object') {
            for (const key in props) {
                if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
                const val = props[key];
                const field = schema ? schema[key] : null;
                if (field && field.type === 'vec2' && val && typeof val === 'object') {
                    this[key] = new Vector2(val.x || 0, val.y || 0);
                }
                else {
                    this[key] = val;
                }
            }
        }
    }

    /** Alias for `this.gameObject`. */
    get go() { return this.gameObject; }
    get position() { return this.gameObject ? this.gameObject.position : null; }
    set position(v) { if (this.gameObject) this.gameObject.position = v; }
    get x() { return this.gameObject ? this.gameObject.x : 0; }
    set x(v) { if (this.gameObject) this.gameObject.x = v; }
    get y() { return this.gameObject ? this.gameObject.y : 0; }
    set y(v) { if (this.gameObject) this.gameObject.y = v; }
    get rotation() { return this.gameObject ? this.gameObject.rotation : 0; }
    set rotation(v) { if (this.gameObject) this.gameObject.rotation = v; }
    get scale() { return this.gameObject ? this.gameObject.scale : null; }
    set scale(v) { if (this.gameObject) this.gameObject.scale = v; }

    /** Called immediately when attached via `go.AddScript()`. */
    Awake() {}
    /** Called once before the first Update. */
    Start() {}
    /** Called every frame while enabled and `gameObject.active` is true. */
    Update(deltaTime) {}
    /** Optional overlay draw called after `gameObject.Draw(renderer)`. */
    Draw(renderer) {}
    /** Called when the owner's standard Collider enters a collision. */
    OnCollisionEnter(myCollider, otherCollider) {}
    /** Called when the owner's standard Collider exits a collision. */
    OnCollisionExit(myCollider, otherCollider) {}
    /** Called when the user clicks inside the owner's standard Collider. */
    OnClick() {}
    /** Called when a Box2DGameObject begins contact with another body. */
    OnContactDetected(other, contactPoint) {}
    /** Called when a Box2DGameObject ends contact with another body. */
    OnContactDetectEnded(other) {}
    /** Called when this script is removed or its owner GameObject is destroyed. */
    Destroy() {}

    /** Helper: schedule a delayed callback owned by this GameObject (auto-cancelled on destroy). */
    Invoke(callback, delay) {
        const g = this.game || this.gameObject?.game || game;
        return g.Invoke(callback.bind(this), delay, this.gameObject);
    }

    /** Helper: schedule a repeating callback owned by this GameObject (auto-cancelled on destroy). */
    InvokeRepeating(callback, delay, interval) {
        const g = this.game || this.gameObject?.game || game;
        return g.InvokeRepeating(callback.bind(this), delay, interval, this.gameObject);
    }

    /** Helper: look up a sibling script attached to the same GameObject. */
    GetScript(classOrName) {
        return this.gameObject ? this.gameObject.GetScript(classOrName) : null;
    }
}

// #endregion

// #region ScriptRegistry

/**
 * Global registry mapping script class names to Behavior constructors.
 * Falls back to `globalThis[name]` so scripts loaded via `<script>` tags work even without explicit registration.
 */
const ScriptRegistry = {
    _scripts: new Map(),

    /**
     * Registers a Behavior subclass by name.
     * Supports `ScriptRegistry.Register("MyScript", MyScript)` or `ScriptRegistry.Register(MyScript)`.
     * Rejects classes that do not extend `Behavior`.
     * @param {string|Function} nameOrClass
     * @param {Function} [ScriptClass]
     */
    Register(nameOrClass, ScriptClass) {
        const name = typeof nameOrClass === 'function' ? nameOrClass.name : nameOrClass;
        const cls  = typeof nameOrClass === 'function' ? nameOrClass : ScriptClass;

        if (typeof name !== 'string' || typeof cls !== 'function' || !(cls.prototype instanceof Behavior)) {
            console.warn(`ScriptRegistry.Register: "${name}" must be a class that extends Behavior.`);
            return;
        }
        this._scripts.set(name, cls);
    },

    /**
     * Resolves a Behavior class by name (checks registry first, then global scope).
     * @param {string} name
     * @returns {Function|null}
     */
    Get(name) {
        if (!name)
            return null;

        if (this._scripts.has(name)) {
            return this._scripts.get(name);
        }

        if (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function' && (globalThis[name].prototype instanceof Behavior)) {
            return globalThis[name];
        }
        
        return null;
    },

    /** Returns an array of all explicitly registered script names. */
    List() {
        return Array.from(this._scripts.keys());
    },

    /** Returns the `static inspector` schema object for a script name (or `{}`). */
    GetSchema(name) {
        const cls = this.Get(name);
        return (cls && cls.inspector && typeof cls.inspector === 'object') ? cls.inspector : {};
    },

    /** Clears all explicitly registered scripts. */
    Clear() {
        this._scripts.clear();
    }
};

// #endregion

// #region TextGO

/**
 * Lightweight GameObject that renders text at its world position.
 * Useful for world-space labels, floating scores, and scene-editor text nodes.
 */
class TextGO extends GameObject {
    /**
     * @param {Vector2} position
     * @param {string} [text="Text"]
     * @param {string} [font="20px Arial"]
     * @param {Color}  [color=Color.white]
     * @param {string} [align="center"]
     * @param {string} [baseline="middle"]
     * @param {boolean} [stroke=false]
     * @param {number} [lineWidth=1]
     */
    constructor(position, text = "Text", font = "20px Arial", color = Color.white, align = "center", baseline = "middle", stroke = false, lineWidth = 1) {
        super(position);
        this.text = text;
        this.font = font;
        this.color = color;
        this.align = align;
        this.baseline = baseline;
        this.stroke = stroke;
        this.lineWidth = lineWidth;
    }

    Draw(renderer) {
        renderer.DrawText(
            this.text,
            this.position.x,
            this.position.y,
            this.font,
            this.color,
            this.align,
            this.baseline,
            this.stroke,
            this.lineWidth
        );
    }
}

// #endregion

// #region SceneLoader

/**
 * Loads `spark.scene` v1 JSON definitions into a running `Game` (or `Box2DGame`) instance.
 */
const SceneLoader = {
    /**
     * Safely parses a color from hex string, rgba string, Color instance, or `{r,g,b,a}` object.
     * @param {*} value
     * @param {Color} [fallback=Color.white]
     * @returns {Color}
     */
    ParseColor(value, fallback = Color.white) {
        if (!value) return Color.Copy(fallback);
        if (value instanceof Color) return Color.Copy(value);
        if (typeof value === 'string') {
            const s = value.trim();
            if (s.startsWith('#') || s.startsWith('rgb') || s.includes(',')) {
                return Color.FromString(s);
            }
            return Color.FromHTMLColorName(s);
        }
        if (typeof value === 'object' && value.r !== undefined) {
            return new Color(value.r, value.g, value.b, value.a ?? 1);
        }
        return Color.Copy(fallback);
    },

    /**
     * Resolves an asset path through an optional resolver (used by Play-in-Editor for Blob/Data URLs).
     * @param {string} path
     * @param {string} kind
     * @param {string} key
     * @param {Function|null} resolver
     * @returns {string}
     */
    _resolveUrl(path, kind, key, resolver) {
        if (typeof resolver === 'function') {
            const resolved = resolver(path, kind, key);
            if (resolved) return resolved;
        }
        return path;
    },

    /**
     * Populates `game.graphicAssets`, `game.audioAssets`, `game.tilesetAssets`, and `game.particleAssets`
     * from a `spark.scene` JSON object.
     * @param {Game} gameInstance
     * @param {Object} sceneData
     * @param {Function} [assetUrlResolver=null]
     */
    PopulateAssets(gameInstance, sceneData, assetUrlResolver = null) {
        const assets = sceneData?.assets || {};

        if (assets.images && Object.keys(assets.images).length > 0) {
            gameInstance.graphicAssets = gameInstance.graphicAssets || {};
            for (const [key, entry] of Object.entries(assets.images)) {
                if (!entry || !entry.path) continue;
                const resolvedPath = this._resolveUrl(entry.path, 'image', key, assetUrlResolver);
                const existing = gameInstance.graphicAssets[key];
                const item = {
                    path: resolvedPath,
                    img: (existing && existing.path === resolvedPath) ? (existing.img || null) : null
                };
                if (entry.bgColor) item.bgColor = entry.bgColor;
                if (entry.atlasJsonPath) {
                    const resolvedAtlas = this._resolveUrl(entry.atlasJsonPath, 'atlas', key, assetUrlResolver);
                    item.atlasJsonPath = resolvedAtlas;
                    item.atlas = (existing && existing.atlasJsonPath === resolvedAtlas) ? (existing.atlas || null) : null;
                }
                else if (entry.atlas) {
                    item.atlas = entry.atlas;
                }
                gameInstance.graphicAssets[key] = item;
            }
        }

        if (assets.tilesets && Object.keys(assets.tilesets).length > 0) {
            gameInstance.tilesetAssets = gameInstance.tilesetAssets || {};
            for (const [key, entry] of Object.entries(assets.tilesets)) {
                if (!entry) continue;
                if (entry.data) {
                    gameInstance.tilesetAssets[key] = { path: entry.path || '', data: entry.data };
                }
                else if (entry.path) {
                    const resolvedPath = this._resolveUrl(entry.path, 'tileset', key, assetUrlResolver);
                    const existing = gameInstance.tilesetAssets[key];
                    gameInstance.tilesetAssets[key] = {
                        path: resolvedPath,
                        data: (existing && existing.path === resolvedPath) ? (existing.data || null) : null
                    };
                }
            }
        }

        if (assets.particles && Object.keys(assets.particles).length > 0) {
            gameInstance.particleAssets = gameInstance.particleAssets || {};
            for (const [key, entry] of Object.entries(assets.particles)) {
                if (!entry) continue;
                if (entry.data) {
                    gameInstance.particleAssets[key] = { path: entry.path || '', data: entry.data };
                }
                else if (entry.path) {
                    const resolvedPath = this._resolveUrl(entry.path, 'particle', key, assetUrlResolver);
                    const existing = gameInstance.particleAssets[key];
                    gameInstance.particleAssets[key] = {
                        path: resolvedPath,
                        data: (existing && existing.path === resolvedPath) ? (existing.data || null) : null
                    };
                }
            }
        }

        if (assets.audio && Object.keys(assets.audio).length > 0) {
            gameInstance.audioAssets = gameInstance.audioAssets || {};
            for (const [key, entry] of Object.entries(assets.audio)) {
                if (!entry || !entry.path) continue;
                const resolvedPath = this._resolveUrl(entry.path, 'audio', key, assetUrlResolver);
                const existing = gameInstance.audioAssets[key];
                gameInstance.audioAssets[key] = {
                    path: resolvedPath,
                    audio: (existing && existing.path === resolvedPath) ? (existing.audio || null) : null
                };
            }
        }
    },

    /**
     * Loads all scene asset dictionaries (`graphicAssets`, `tilesetAssets`, `particleAssets`, `audioAssets`)
     * concurrently and invokes `onComplete` once all pending loads finish.
     * @param {Game} gameInstance
     * @param {Function} onComplete
     */
    LoadAssetsParallel(gameInstance, onComplete) {
        let pending = 4;
        const done = () => {
            if (--pending === 0) onComplete();
        };

        LoadImages(gameInstance.graphicAssets, done);
        LoadJSON(gameInstance.tilesetAssets, done);
        LoadJSON(gameInstance.particleAssets, done);
        if (gameInstance.audioAssets && typeof audioPlayer !== 'undefined' && audioPlayer) {
            audioPlayer.LoadAudio(gameInstance.audioAssets, done);
        }
        else {
            done();
        }
    },

    /**
     * Merges `sceneData.config` into `gameInstance.Configure(...)`.
     * @param {Game} gameInstance
     * @param {Object} config
     */
    ApplyConfig(gameInstance, config) {
        if (config && typeof config === 'object') {
            gameInstance.Configure(config);
        }
    },

    /**
     * Registers all Input Actions and Axes defined in `sceneData.input`.
     * @param {Object} inputDef
     */
    ApplyInputMappings(inputDef) {
        if (!inputDef || typeof Input === 'undefined') return;
        Input.ClearMappings();

        if (inputDef.actions && typeof inputDef.actions === 'object') {
            for (const [name, bindings] of Object.entries(inputDef.actions)) {
                if (Array.isArray(bindings)) {
                    Input.RegisterAction(name, bindings.map(b => ({ ...b })));
                }
            }
        }

        if (inputDef.axes && typeof inputDef.axes === 'object') {
            for (const [name, bindings] of Object.entries(inputDef.axes)) {
                if (Array.isArray(bindings)) {
                    Input.RegisterAxis(name, bindings.map(b => ({ ...b })));
                }
            }
        }
    },

    /**
     * Creates a Camera (`Camera`, `FollowCameraBasic`, or `FollowCamera`) from `sceneData.camera`.
     * @param {Game} gameInstance
     * @param {Object} cameraDef
     * @returns {Camera}
     */
    CreateCamera(gameInstance, cameraDef) {
        const def = cameraDef || { type: 'Camera', x: 0, y: 0, zoom: 1 };
        const pos = new Vector2(def.x || 0, def.y || 0);
        let cam = null;

        const target = def.targetEntityId ? gameInstance.FindGameObjectById(def.targetEntityId) : null;
        const offset = new Vector2(def.offset?.x || 0, def.offset?.y || 0);

        if (def.type === 'FollowCamera' && target) {
            cam = new FollowCamera(
                pos,
                target,
                def.minX ?? -Infinity,
                def.maxX ?? Infinity,
                def.minY ?? -Infinity,
                def.maxY ?? Infinity,
                def.smoothingSpeed ?? 5,
                offset
            );
        }
        else if (def.type === 'FollowCameraBasic' && target) {
            cam = new FollowCameraBasic(pos, target, offset);
        }
        else {
            cam = new Camera(pos, gameInstance);
        }

        cam.game = gameInstance;
        if (def.zoom !== undefined && def.zoom !== 1) {
            cam.scale = def.zoom;
        }
        cam.Start();
        return cam;
    },

    /**
     * Builds a `BackgroundLayers` instance from `sceneData.backgroundLayers`.
     * @param {Game} gameInstance
     * @param {Camera} camera
     * @param {Array<Object>} layerDefs
     * @returns {BackgroundLayers|null}
     */
    CreateBackgroundLayers(gameInstance, camera, layerDefs) {
        if (!Array.isArray(layerDefs) || layerDefs.length === 0) return null;
        const bg = new BackgroundLayers(camera);

        for (const def of layerDefs) {
            if (!def || def.visible === false) continue;
            const pos = new Vector2(def.x || 0, def.y || 0);
            const speed = new Vector2(def.speedX ?? 0, def.speedY ?? 0);

            switch (def.type) {
                case 'StaticColorLayer':
                    bg.InsertLayer(new StaticColorLayer(this.ParseColor(def.color, Color.black)));
                    break;
                case 'StaticGradientLayer': {
                    const dir = new Vector2(def.dirX ?? 0, def.dirY ?? 1);
                    const stops = (def.colorStops || [[0, '#1a1a2e'], [1, '#16213e']]).map(
                        s => [s[0], this.ParseColor(s[1], Color.black)]
                    );
                    bg.InsertLayer(new StaticGradientLayer(gameInstance.renderer, dir, stops));
                    break;
                }
                case 'ColorRectangleLayer':
                    bg.InsertLayer(new ColorRectangleLayer(
                        this.ParseColor(def.color, Color.grey),
                        pos,
                        def.width || gameInstance.screenWidth,
                        def.height || gameInstance.screenHeight,
                        speed
                    ));
                    break;
                case 'GradientRectangleLayer': {
                    const dir = new Vector2(def.dirX ?? 0, def.dirY ?? 1);
                    const stops = (def.colorStops || [[0, '#1a1a2e'], [1, '#16213e']]).map(
                        s => [s[0], this.ParseColor(s[1], Color.black)]
                    );
                    bg.InsertLayer(new GradientRectangleLayer(
                        gameInstance.renderer,
                        dir,
                        stops,
                        pos,
                        def.width || gameInstance.screenWidth,
                        def.height || gameInstance.screenHeight,
                        speed
                    ));
                    break;
                }
                case 'SpriteBackgroundLayer': {
                    const img = gameInstance.graphicAssets?.[def.imageKey]?.img || null;
                    if (img) {
                        const scale = (def.scaleX !== undefined || def.scaleY !== undefined)
                            ? new Vector2(def.scaleX ?? 1, def.scaleY ?? 1)
                            : (def.scale ?? 1);
                        bg.InsertLayer(new SpriteBackgroundLayer(img, pos, def.rotation || 0, scale, speed));
                    }
                    break;
                }
                case 'TilesetBackgroundLayer': {
                    const img = gameInstance.graphicAssets?.[def.imageKey]?.img || null;
                    const tsData = gameInstance.tilesetAssets?.[def.tilesetKey]?.data || null;
                    if (img && tsData) {
                        const parsed = Tileset.Parse(tsData, img);
                        bg.InsertLayer(new TilesetBackgroundLayer(
                            img, pos, def.scale ?? 1, speed,
                            parsed.tilesetConfig, parsed.map, parsed.tileWidth, parsed.tileHeight
                        ));
                    }
                    break;
                }
            }
        }

        bg.Start();
        return bg;
    },

    /**
     * Converts a serialized Box2D bodyOptions definition into the structure expected by `CreatePhysicsObject`.
     * @param {Object} physDef
     * @param {number} worldScale
     * @returns {{shapeType: number, options: Object}}
     */
    _buildBox2DOptions(physDef, worldScale) {
        const shapeName = physDef.shape || 'Box';
        let shapeType = PhysicsObjectType.Box;
        if (shapeName === 'Circle') shapeType = PhysicsObjectType.Circle;
        else if (shapeName === 'Edge') shapeType = PhysicsObjectType.Edge;

        let b2Type = b2Body.b2_dynamicBody;
        if (physDef.bodyType === 'static') b2Type = b2Body.b2_staticBody;
        else if (physDef.bodyType === 'kinematic') b2Type = b2Body.b2_kinematicBody;

        const options = {
            type: b2Type,
            density: physDef.density ?? 1.0,
            friction: physDef.friction ?? 0.5,
            restitution: physDef.restitution ?? 0.3,
            isSensor: Boolean(physDef.isSensor),
            linearDamping: physDef.linearDamping ?? 0.0,
            angularDamping: physDef.angularDamping ?? 0.1,
            fixedRotation: Boolean(physDef.fixedRotation)
        };

        if (shapeType === PhysicsObjectType.Box) {
            options.width  = (physDef.widthPx  ?? 64) / worldScale;
            options.height = (physDef.heightPx ?? 64) / worldScale;
        }
        else if (shapeType === PhysicsObjectType.Circle) {
            options.radius = (physDef.radiusPx ?? 32) / worldScale;
        }
        else if (shapeType === PhysicsObjectType.Edge) {
            options.p1x = (physDef.p1x ?? -50) / worldScale;
            options.p1y = (physDef.p1y ?? 0)   / worldScale;
            options.p2x = (physDef.p2x ?? 50)  / worldScale;
            options.p2y = (physDef.p2y ?? 0)   / worldScale;
        }

        if (physDef.offsetX || physDef.offsetY) {
            options.offset = {
                x: (physDef.offsetX || 0) / worldScale,
                y: -(physDef.offsetY || 0) / worldScale
            };
        }

        return { shapeType, options };
    },

    /**
     * Instantiates a single entity definition, attaches collider & scripts, and adds it to `gameInstance`.
     * @param {Game} gameInstance
     * @param {Object} entityDef
     * @param {Object} [overrides=null]
     * @param {Array}  [deferredEntityRefs=null] - Internal list to resolve `entityRef` props after all entities load.
     * @returns {GameObject|null}
     */
    InstantiateEntity(gameInstance, entityDef, overrides = null, deferredEntityRefs = null) {
        if (!entityDef) return null;

        const t = Object.assign(
            { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, pivotX: 0, pivotY: 0 },
            entityDef.transform || {},
            overrides?.transform || {}
        );
        if (overrides?.x !== undefined) t.x = overrides.x;
        if (overrides?.y !== undefined) t.y = overrides.y;
        if (overrides?.rotation !== undefined) t.rotation = overrides.rotation;

        const props = Object.assign({}, entityDef.props || {}, overrides?.props || {});
        const pos = new Vector2(t.x, t.y);
        const scale = new Vector2(t.scaleX ?? 1, t.scaleY ?? 1);
        const type = entityDef.type || 'GameObject';
        const hasBox2D = Boolean(gameInstance.physicsWorld && typeof Box2DGameObject !== 'undefined');
        const physDef = entityDef.physicsBody;

        let go = null;

        // Box2D-backed instantiation when physicsWorld exists and entity is a Box2D type or has physicsBody
        if (hasBox2D && (type.startsWith('Box2D') || (physDef && physDef.enabled))) {
            const world = gameInstance.physicsWorld;
            const effectivePhys = Object.assign({
                shape: type === 'CircleGO' ? 'Circle' : 'Box',
                bodyType: 'dynamic',
                widthPx: props.width ?? 64,
                heightPx: props.height ?? 64,
                radiusPx: props.radius ?? 32
            }, physDef || {});
            const { shapeType, options } = this._buildBox2DOptions(effectivePhys, world.scale);

            if (type === 'Box2DTrigger') {
                options.isSensor = true;
                go = new Box2DTrigger(pos, world, shapeType, options);
            }
            else if (type === 'Box2DSpriteObject' || type === 'SpriteObject') {
                const img = gameInstance.graphicAssets?.[props.imageKey]?.img || null;
                if (img) {
                    go = new Box2DSpriteObject(pos, t.rotation || 0, scale, img, shapeType, world, options);
                    if (props.alpha !== undefined) go.sprite.alpha = props.alpha;
                }
                else {
                    go = new Box2DRectangleGO(pos, world, shapeType, options, props.width || 64, props.height || 64, this.ParseColor(props.color, Color.orange));
                }
            }
            else if (type === 'Box2DSSAnimationObjectBasic' || type === 'SSAnimationObjectBasic') {
                const img = gameInstance.graphicAssets?.[props.imageKey]?.img || null;
                if (img) {
                    go = new Box2DSSAnimationObjectBasic(
                        pos, t.rotation || 0, scale, img,
                        props.frameWidth || 32, props.frameHeight || 32,
                        props.frameCount || [1], props.framesDuration || 0.12,
                        shapeType, world, options
                    );
                }
                else {
                    go = new Box2DRectangleGO(pos, world, shapeType, options, props.width || 64, props.height || 64, this.ParseColor(props.color, Color.orange));
                }
            }
            else {
                const w = props.width ?? (effectivePhys.widthPx || 64);
                const h = props.height ?? (effectivePhys.heightPx || 64);
                go = new Box2DRectangleGO(pos, world, shapeType, options, w, h, this.ParseColor(props.color, Color.green));
                if (t.rotation) go.rotation = t.rotation;
            }
        }
        else {
            // Standard spark.js GameObject instantiation
            switch (type) {
                case 'RectangleGO':
                    go = new RectangleGO(
                        pos,
                        props.width ?? 64,
                        props.height ?? 64,
                        this.ParseColor(props.color, Color.red),
                        Boolean(props.stroke),
                        props.lineWidth ?? 1
                    );
                    break;

                case 'CircleGO':
                    go = new CircleGO(
                        pos,
                        props.radius ?? 32,
                        this.ParseColor(props.color, Color.blue),
                        Boolean(props.stroke),
                        props.lineWidth ?? 1
                    );
                    break;

                case 'SpriteObject': {
                    const img = gameInstance.graphicAssets?.[props.imageKey]?.img || null;
                    if (img) {
                        go = new SpriteObject(pos, t.rotation || 0, scale, img, props.alpha ?? 1.0);
                        go.flipX = Boolean(props.flipX);
                        go.flipY = Boolean(props.flipY);
                    }
                    else {
                        go = new RectangleGO(pos, 48, 48, Color.pink, true, 2);
                    }
                    break;
                }

                case 'SpriteSectionObject': {
                    const assetEntry = gameInstance.graphicAssets?.[props.imageKey];
                    const img = assetEntry?.img || null;
                    if (img) {
                        let rectData = null;
                        if (props.atlasFrame && assetEntry.atlas) {
                            const atlas = new SpriteAtlas(assetEntry.atlas);
                            rectData = atlas.get(props.atlasFrame);
                        }
                        if (!rectData) {
                            rectData = {
                                x: props.sectionX || 0,
                                y: props.sectionY || 0,
                                w: props.sectionW || img.width,
                                h: props.sectionH || img.height
                            };
                        }
                        const sectionRect = new Rect(rectData.x, rectData.y, rectData.w, rectData.h);
                        go = new SpriteSectionObject(pos, t.rotation || 0, scale, img, sectionRect, props.alpha ?? 1.0);
                        go.flipX = Boolean(props.flipX);
                        go.flipY = Boolean(props.flipY);
                    }
                    else {
                        go = new RectangleGO(pos, 48, 48, Color.pink, true, 2);
                    }
                    break;
                }

                case 'SSAnimationObjectBasic': {
                    const img = gameInstance.graphicAssets?.[props.imageKey]?.img || null;
                    if (img) {
                        go = new SSAnimationObjectBasic(
                            pos, t.rotation || 0, scale, img,
                            props.frameWidth || 32,
                            props.frameHeight || 32,
                            Array.isArray(props.frameCount) ? props.frameCount.slice() : [4],
                            props.framesDuration ?? 0.12
                        );
                        go.flipX = Boolean(props.flipX);
                        go.flipY = Boolean(props.flipY);
                        if (props.initialAnimation !== undefined) {
                            go.PlayAnimation(props.initialAnimation, props.loop !== false, true);
                        }
                    }
                    else {
                        go = new RectangleGO(pos, props.frameWidth || 32, props.frameHeight || 32, Color.orange, true, 2);
                    }
                    break;
                }

                case 'Tileset': {
                    const img = gameInstance.graphicAssets?.[props.imageKey]?.img || null;
                    const tsData = props.inlineData || gameInstance.tilesetAssets?.[props.tilesetKey]?.data || null;
                    if (img && tsData) {
                        go = Tileset.FromData(img, pos, scale, tsData, props.layerName ?? null);
                    }
                    else {
                        go = new GameObject(pos);
                    }
                    break;
                }

                case 'ParticleSystemGO': {
                    if (typeof ParticleSystemGO !== 'undefined') {
                        const img = props.imageKey ? (gameInstance.graphicAssets?.[props.imageKey]?.img || null) : null;
                        const baseCfg = props.particleKey ? (gameInstance.particleAssets?.[props.particleKey]?.data || {}) : {};
                        const cfg = Object.assign({}, baseCfg, props.config || {});
                        go = new ParticleSystemGO(pos, img, cfg);
                        go.rotation = t.rotation || 0;
                        if (props.emitting === false) go.emitting = false;
                        if (cfg.prewarm) go.Prewarm();
                    }
                    else {
                        go = new GameObject(pos);
                    }
                    break;
                }

                case 'TextGO':
                    go = new TextGO(
                        pos,
                        props.text ?? 'Text',
                        props.font ?? '20px Arial',
                        this.ParseColor(props.color, Color.white),
                        props.align ?? 'center',
                        props.baseline ?? 'middle',
                        Boolean(props.stroke),
                        props.lineWidth ?? 1
                    );
                    break;

                case 'GameObject':
                default:
                    go = new GameObject(pos);
                    break;
            }
        }

        // Common identity & transform metadata
        go.id = overrides?.id ?? entityDef.id ?? (`ent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
        go.name = overrides?.name ?? entityDef.name ?? type;
        go.tag = overrides?.tag ?? entityDef.tag ?? '';
        go.zIndex = overrides?.zIndex ?? entityDef.zIndex ?? 0;

        if (!type.startsWith('Box2D')) {
            go.rotation = t.rotation || 0;
            go.scale = scale;
            if (t.pivotX || t.pivotY) {
                go.pivot = { x: t.pivotX || 0, y: t.pivotY || 0 };
            }
        }

        // Standard (non-Box2D) Collider
        const colDef = entityDef.collider;
        if (colDef && colDef.type && colDef.type !== 'None') {
            const offset = new Vector2(colDef.offsetX || 0, colDef.offsetY || 0);
            let collider = null;
            if (colDef.type === 'RectangleCollider') {
                collider = new RectangleCollider(offset, colDef.width || 32, colDef.height || 32, go);
            }
            else if (colDef.type === 'CircleCollider') {
                collider = new CircleCollider(offset, colDef.radius || 24, go);
            }
            else if (colDef.type === 'PolygonCollider' && Array.isArray(colDef.points) && colDef.points.length >= 3) {
                const pts = colDef.points.map(p => new Vector2(p.x || 0, p.y || 0));
                collider = new PolygonCollider(offset, go.rotation || 0, pts, go);
            }
            if (collider) {
                collider.enabled = colDef.enabled !== false;
                go.collider = collider;
                gameInstance.AddCollider(collider);
            }
        }

        // Attach Behavior scripts
        const scriptsDef = entityDef.scripts;
        if (Array.isArray(scriptsDef)) {
            for (const sDef of scriptsDef) {
                if (!sDef || !sDef.className) continue;
                const ScriptClass = ScriptRegistry.Get(sDef.className);
                if (!ScriptClass) {
                    console.warn(`SceneLoader: script class "${sDef.className}" not found for entity "${go.name}".`);
                    continue;
                }
                const instance = new ScriptClass(sDef.props || null);
                instance.enabled = sDef.enabled !== false;

                // Queue any entityRef fields to resolve after all scene entities exist
                const schema = ScriptClass.inspector;
                if (schema && sDef.props) {
                    for (const [propKey, field] of Object.entries(schema)) {
                        if (field && field.type === 'entityRef' && sDef.props[propKey]) {
                            if (deferredEntityRefs) {
                                deferredEntityRefs.push({ instance, propKey, entityId: sDef.props[propKey] });
                            }
                            else {
                                instance[propKey] = gameInstance.FindGameObjectById(sDef.props[propKey]);
                            }
                        }
                    }
                }

                go.AddScript(instance);
            }
        }

        // Set active state (after collider attachment so collider.enabled mirrors it)
        go.active = (overrides?.active !== undefined) ? Boolean(overrides.active) : (entityDef.active !== false);

        gameInstance.AddGameObject(go);
        return go;
    },

    /**
     * Spawns an instance of a named prefab from `sceneData.prefabs`.
     * @param {Game} gameInstance
     * @param {Object} sceneData
     * @param {string} prefabId
     * @param {Object} [overrides=null]
     * @returns {GameObject|null}
     */
    InstantiatePrefab(gameInstance, sceneData, prefabId, overrides = null) {
        const prefab = sceneData?.prefabs?.[prefabId];
        if (!prefab) {
            console.warn(`SceneLoader.InstantiatePrefab: prefab "${prefabId}" not found.`);
            return null;
        }
        const clone = JSON.parse(JSON.stringify(prefab));
        clone.id = `inst_${prefabId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        return this.InstantiateEntity(gameInstance, clone, overrides, null);
    },

    /**
     * Immediately destroys all current GameObjects (running their `Destroy()` hooks,
     * script `Destroy()` hooks, and Box2D body cleanup) and resets scene state on `gameInstance`.
     * @param {Game} gameInstance
     */
    Unload(gameInstance) {
        for (let i = 0; i < gameInstance.gameObjects.length; i++) {
            const go = gameInstance.gameObjects[i];
            go.active = false;
            go.Destroy();
            go.game = null;
        }
        gameInstance.gameObjects = [];
        gameInstance._drawList = [];
        gameInstance._hasCustomZIndex = false;
        gameInstance._zOrderDirty = false;
        gameInstance.colliders = [];
        gameInstance.collidersById.clear();
        gameInstance.lastCollisions.clear();
        gameInstance.detectedCollisions.clear();
        gameInstance._objectsToDestroy.clear();
        gameInstance._timers = [];
        gameInstance._timersById.clear();
    },

    /**
     * Loads a complete `spark.scene` JSON object into `gameInstance`.
     * @param {Game} gameInstance
     * @param {Object} sceneData
     * @returns {{camera: Camera, backgroundLayers: BackgroundLayers|null, entitiesById: Map<string, GameObject>}}
     */
    Load(gameInstance, sceneData) {
        if (!sceneData || typeof sceneData !== 'object') {
            throw new Error('SceneLoader.Load: Invalid sceneData.');
        }

        this.ApplyConfig(gameInstance, sceneData.config);
        this.ApplyInputMappings(sceneData.input);

        const entitiesById = new Map();
        const deferredEntityRefs = [];

        if (Array.isArray(sceneData.entities)) {
            for (const entityDef of sceneData.entities) {
                const go = this.InstantiateEntity(gameInstance, entityDef, null, deferredEntityRefs);
                if (go && go.id) {
                    entitiesById.set(go.id, go);
                }
            }
        }

        // Resolve cross-entity script references now that all entities exist
        for (const ref of deferredEntityRefs) {
            ref.instance[ref.propKey] = entitiesById.get(ref.entityId) || gameInstance.FindGameObjectById(ref.entityId) || null;
        }

        const camera = this.CreateCamera(gameInstance, sceneData.camera);
        const backgroundLayers = this.CreateBackgroundLayers(gameInstance, camera, sceneData.backgroundLayers);

        return { camera, backgroundLayers, entitiesById };
    }
};

// #endregion

// #region SceneGame (and Box2DSceneGame)

/**
 * Ready-to-use `Game` subclass that loads and runs a `spark.scene` JSON file (or inline scene object).
 *
 * @example
 * class MyGame extends SceneGame {
 *     constructor(renderer) {
 *         super(renderer, "assets/level1.scene.json");
 *     }
 * }
 * window.onload = () => Init(MyGame);
 */
class SceneGame extends Game {
    /**
     * @param {Renderer} renderer
     * @param {string|Object} sceneSource - Path to a `.scene.json` file or an inline scene JSON object.
     * @param {{assetUrlResolver?: Function}} [options={}]
     */
    constructor(renderer, sceneSource, options = {}) {
        super(renderer);

        this._sceneSource = sceneSource;
        this._assetUrlResolver = options.assetUrlResolver || null;
        this.sceneData = null;
        this.camera = null;
        this.backgroundLayers = null;
        this.backgroundColor = Color.FromHex('#1a1a2e');
        this._sceneLoaded = false;

        if (typeof sceneSource === 'string') {
            this.sceneAssets = { __mainScene: { path: sceneSource, data: null } };
        }
        else if (sceneSource && typeof sceneSource === 'object') {
            this.sceneData = sceneSource;
            SceneLoader.ApplyConfig(this, sceneSource.config);
            SceneLoader.PopulateAssets(this, sceneSource, this._assetUrlResolver);
        }
    }

    Start() {
        super.Start();
        this._sceneLoaded = false;

        if (this.sceneData) {
            this._mountScene(this.sceneData);
        }
        else if (this.sceneAssets?.__mainScene?.data) {
            this.sceneData = this.sceneAssets.__mainScene.data;
            this._loadSceneAssetsAndMount(this.sceneData);
        }
    }

    /**
     * Loads a new scene at runtime (either a URL string or an inline scene JSON object).
     * @param {string|Object} sceneSource
     */
    LoadScene(sceneSource) {
        SceneLoader.Unload(this);
        this._sceneLoaded = false;

        if (typeof sceneSource === 'string') {
            fetch(sceneSource)
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                    return r.json();
                })
                .then(data => {
                    this.sceneData = data;
                    this._loadSceneAssetsAndMount(data);
                })
                .catch(err => console.error(`SceneGame.LoadScene failed for "${sceneSource}":`, err));
        }
        else if (sceneSource && typeof sceneSource === 'object') {
            this.sceneData = sceneSource;
            this._loadSceneAssetsAndMount(sceneSource);
        }
    }

    /**
     * Spawns a prefab defined in the current scene's `prefabs` dictionary.
     * @param {string} prefabId
     * @param {Object} [overrides=null]
     * @returns {GameObject|null}
     */
    SpawnPrefab(prefabId, overrides = null) {
        return SceneLoader.InstantiatePrefab(this, this.sceneData, prefabId, overrides);
    }

    _loadSceneAssetsAndMount(sceneData) {
        SceneLoader.ApplyConfig(this, sceneData.config);
        this.screenWidth  = this.config.screenWidth  ?? this.screenWidth;
        this.screenHeight = this.config.screenHeight ?? this.screenHeight;
        if (this.config.imageSmoothingEnabled !== undefined) {
            this.renderer.imageSmoothingEnabled = this.config.imageSmoothingEnabled;
        }

        SceneLoader.PopulateAssets(this, sceneData, this._assetUrlResolver);
        SceneLoader.LoadAssetsParallel(this, () => this._mountScene(sceneData));
    }

    _mountScene(sceneData) {
        this.backgroundColor = SceneLoader.ParseColor(sceneData?.meta?.backgroundColor, Color.FromHex('#1a1a2e'));
        const loaded = SceneLoader.Load(this, sceneData);
        this.camera = loaded.camera;
        this.backgroundLayers = loaded.backgroundLayers;
        this._sceneLoaded = true;
        this.OnSceneLoaded(sceneData);
    }

    /** Optional hook overridden by subclasses after the scene finishes mounting. */
    OnSceneLoaded(sceneData) {}

    Update(deltaTime) {
        if (!this._sceneLoaded) return;
        super.Update(deltaTime);
        if (this.camera) this.camera.Update(deltaTime);
        if (this.backgroundLayers) this.backgroundLayers.Update(deltaTime);
    }

    Draw() {
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this.backgroundColor);
        if (!this._sceneLoaded) return;

        if (this.camera) this.camera.PreDraw(this.renderer);
        if (this.backgroundLayers) this.backgroundLayers.Draw(this.renderer);
        super.Draw();
        if (this.camera) this.camera.PostDraw(this.renderer);
    }
}

if (typeof Box2DGame !== 'undefined') {
    /**
     * Box2D-enabled counterpart of `SceneGame`. Uses `sceneData.physics` (`scale`, `gravity`, `doSleep`)
     * to initialize the Box2D physics world automatically.
     */
    class Box2DSceneGame extends Box2DGame {
        constructor(renderer, sceneSource, options = {}) {
            const phys = (sceneSource && typeof sceneSource === 'object' && sceneSource.physics)
                ? sceneSource.physics
                : { scale: 30, gravity: { x: 0, y: -9.8 }, doSleep: true };

            super(renderer, phys.scale ?? 30, phys.gravity || { x: 0, y: -9.8 }, phys.doSleep !== false);

            this._sceneSource = sceneSource;
            this._assetUrlResolver = options.assetUrlResolver || null;
            this.sceneData = null;
            this.camera = null;
            this.backgroundLayers = null;
            this.backgroundColor = Color.FromHex('#1a1a2e');
            this._sceneLoaded = false;

            if (typeof sceneSource === 'string') {
                this.sceneAssets = { __mainScene: { path: sceneSource, data: null } };
            }
            else if (sceneSource && typeof sceneSource === 'object') {
                this.sceneData = sceneSource;
                SceneLoader.ApplyConfig(this, sceneSource.config);
                SceneLoader.PopulateAssets(this, sceneSource, this._assetUrlResolver);
            }
        }

        Start() {
            super.Start();
            this._sceneLoaded = false;

            if (this.sceneData) {
                this._mountScene(this.sceneData);
            }
            else if (this.sceneAssets?.__mainScene?.data) {
                this.sceneData = this.sceneAssets.__mainScene.data;
                const phys = this.sceneData.physics || {};
                this.physicsScale = phys.scale ?? this.physicsScale;
                this.physicsGravity = phys.gravity || this.physicsGravity;
                this.physicsDoSleep = phys.doSleep !== false;
                this.physicsWorld = CreateBox2DWorld(this.renderer, this.physicsGravity, this.physicsDoSleep, this.physicsScale);
                this._loadSceneAssetsAndMount(this.sceneData);
            }
        }

        LoadScene(sceneSource) {
            SceneLoader.Unload(this);
            this._sceneLoaded = false;

            if (typeof sceneSource === 'string') {
                fetch(sceneSource)
                    .then(r => {
                        if (!r.ok)
                            throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                        return r.json();
                    })
                    .then(data => {
                        this.sceneData = data;
                        this._loadSceneAssetsAndMount(data);
                    })
                    .catch(err => console.error(`Box2DSceneGame.LoadScene failed for "${sceneSource}":`, err));
            }
            else if (sceneSource && typeof sceneSource === 'object') {
                this.sceneData = sceneSource;
                this._loadSceneAssetsAndMount(sceneSource);
            }
        }

        SpawnPrefab(prefabId, overrides = null) {
            return SceneLoader.InstantiatePrefab(this, this.sceneData, prefabId, overrides);
        }

        _loadSceneAssetsAndMount(sceneData) {
            SceneLoader.ApplyConfig(this, sceneData.config);
            this.screenWidth  = this.config.screenWidth  ?? this.screenWidth;
            this.screenHeight = this.config.screenHeight ?? this.screenHeight;
            if (this.config.imageSmoothingEnabled !== undefined) {
                this.renderer.imageSmoothingEnabled = this.config.imageSmoothingEnabled;
            }
            SceneLoader.PopulateAssets(this, sceneData, this._assetUrlResolver);
            SceneLoader.LoadAssetsParallel(this, () => this._mountScene(sceneData));
        }

        _mountScene(sceneData) {
            this.backgroundColor = SceneLoader.ParseColor(sceneData?.meta?.backgroundColor, Color.FromHex('#1a1a2e'));
            const loaded = SceneLoader.Load(this, sceneData);
            this.camera = loaded.camera;
            this.backgroundLayers = loaded.backgroundLayers;
            this._sceneLoaded = true;
            this.OnSceneLoaded(sceneData);
        }

        OnSceneLoaded(sceneData) {}

        Update(deltaTime) {
            if (!this._sceneLoaded) return;
            super.Update(deltaTime);
            if (this.camera) this.camera.Update(deltaTime);
            if (this.backgroundLayers) this.backgroundLayers.Update(deltaTime);
        }

        Draw() {
            this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this.backgroundColor);
            if (!this._sceneLoaded) return;

            if (this.camera) this.camera.PreDraw(this.renderer);
            if (this.backgroundLayers) this.backgroundLayers.Draw(this.renderer);
            super.Draw();
            if (this.camera) this.camera.PostDraw(this.renderer);
        }
    }

    globalThis.Box2DSceneGame = Box2DSceneGame;
}

// #endregion
