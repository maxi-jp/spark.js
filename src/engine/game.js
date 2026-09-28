/**
 * Base class for all games. Extend this class and override `Start()`, `Update()`, and `Draw()`.
 *
 * @example
 * class MyGame extends Game {
 *   constructor(renderer) {
 *     super(renderer);
 *     this.Configure({ screenWidth: 800, screenHeight: 600 });
 *     this.graphicAssets = { player: { path: 'player.png', img: null } };
 *   }
 *   Start() { this.player = this.AddGameObject(new SpriteObject(...)); }
 *   Update(dt) { super.Update(dt); }
 *   Draw()    { super.Draw(); }
 * }
 */
class Game {
    /** @type {boolean} Whether audio playback is enabled. Toggle to mute/unmute all sounds. */
    _audioActive = true;

    /**
     * @param {Renderer} renderer - The renderer instance created by the engine.
     */
    constructor(renderer) {
        /**
         * Game configuration object. Pass values to `Configure()` in the constructor.
         * @type {{
         *   screenWidth?: number,
         *   screenHeight?: number,
         *   imageSmoothingEnabled?: boolean,
         *   fillWindow?: boolean | "mobile",
         *   matchNativeResolution?: boolean,
         *   preserveAspectRatio?: boolean,
         *   useDevicePixelRatio?: boolean,
         *   audioAnalyzer?: boolean,
         *   analyzerfftSize?: number,
         *   analyzerSmoothing?: number,
         *   drawColliders?: boolean,
         *   collidersOnly?: boolean,
         *   mobileSupport?: boolean,
         *   autoFullscreen?: boolean
         * }}
         */
        this.config = {
            // Screen configuration
            screenWidth: 640,
            screenHeight: 480,
            imageSmoothingEnabled: true,
            
            // Audio configuration
            audioAnalyzer: false,
            
            // Debug configuration
            drawColliders: false,
            collidersOnly: false,

            // Mobile support
            mobileSupport: false,
            autoFullscreen: false
        };
        // config example:
        // {
        //     screenWidth: 1280,          // initial canvas width
        //     screenHeight: 720,          // initial canvas height
        //     imageSmoothingEnabled: true, // enable/disable image smoothing on the canvas context
        //     fillWindow: false,      // make the game canvas to fill the entire window
        //                             // false: never fill window (pixel-perfect on all devices)
        //                             // true: always fill window (on both desktop and mobile)
        //                             // "mobile": fill window only on mobile/touch devices
        //     matchNativeResolution: false, // if fillWindow is enabled, this controls how the canvas behaves when filling window (true: updates the canvas internal resolution to match window size | false: keeps existing resolution and stretches to fit window)
        //     preserveAspectRatio: true,    // if fillWindow is enabled and matchNativeResolution=false, maintains canvas aspect ratio when scaling to fit window
        //     useDevicePixelRatio: false,   // Use device pixel ratio for crisp rendering on high DPI displays
        //     audioAnalyzer: true,    // if true it will create an audio analyzer when loading the audio assets
        //     analyzerfftSize: 128,   // size of the audio analyzer fft, default is 128
        //     analyzerSmoothing: 0.5, // smoothing of the audio analyzer, default is 0.5
        //     drawColliders: false,   // draw collision shapes for debugging
        //     mobileSupport: false,   // mobile support is activated automatically on touch-capable
        //                             // devices. Set to false to suppress it (e.g. hybrid laptops).
        //                             // Set to true to force it on non-touch devices (e.g. for testing).
        //     autoFullscreen: false   // automatically requests fullscreen on first interaction on mobile
        // };

        /**
         * Graphic assets to preload. Assign in the constructor before the engine calls `Start()`.
         * Format: `{ key: { path: 'path/to/image.png', img: null } }`
         * @type {Object.<string, {path: string, img: HTMLImageElement|null}>|null}
         */
        this.graphicAssets = null;

        /**
         * Audio assets to preload. Assign in the constructor before the engine calls `Start()`.
         * Format: `{ key: { path: 'path/to/sound.mp3', audio: null } }`
         * @type {Object.<string, {path: string, audio: *}>|null}
         */
        this.audioAssets = null;

        /**
         * Tled's JSON assets to preload. Assign in the constructor before the engine calls `Start()`.
         * Format: `{ key: { path: 'path/to/map.json', data: null } }`
         */
        this.tiledAssets = null;

        /** @type {Renderer} The active renderer (Canvas2D or WebGL). */
        this.renderer = renderer;

        /** @type {GameObject[]} All active game objects managed by this game. */
        this.gameObjects = [];
        this.colliders = [];
        this.collidersById = new Map(); // Maps collider.id to Collider instance for quick lookups
        this.lastCollisions = new Set(); // ids of colliding pairs detected the last frame
        this.detectedCollisions = new Set(); // collisions detected on this frame
        this._objectsToDestroy = new Set(); // gameObjects queued to be destroyed
        
        /** @type {Timer[]} Active timers managed by the game. */
        this._timers = [];
        this._timersById = new Map(); // Maps timer.id to Timer instance for quick lookups
    }

    /** @returns {number} Current canvas width in pixels. */
    get screenWidth() {
        return this.renderer.width;
    }
    /** @returns {number} Current canvas height in pixels. */
    get screenHeight() {
        return this.renderer.height;
    }
    /** @returns {number} Half of the canvas width — useful for centering objects. */
    get screenHalfWidth() {
        return this.renderer.halfWidth;
    }
    /** @returns {number} Half of the canvas height — useful for centering objects. */
    get screenHalfHeight() {
        return this.renderer.halfHeight;
    }
    /** @returns {boolean} Whether audio playback is currently enabled. */
    get audioActive() {
        return this._audioActive;
    }

    set screenWidth(value) {
        this.renderer.width = value;
    }
    set screenHeight(value) {
        this.renderer.height = value;
    }
    set audioActive(value) {
        this._audioActive = value;
    }

    /** Called once when the game starts. Override to set up your scene. */
    Start() {
        // Set initial screen size from config
        this.renderer.width = this.config.screenWidth ?? canvas.width;
        this.renderer.height = this.config.screenHeight ?? canvas.height;
        
        // Configure renderer settings
        if (this.config.imageSmoothingEnabled !== undefined) {
            this.renderer.imageSmoothingEnabled = this.config.imageSmoothingEnabled;
        }

        // Fill window if configured
        // Supports: false (never), true (always), or "mobile" (mobile devices only)
        const shouldFillWindow = this.config.fillWindow === true || 
                                 (this.config.fillWindow === "mobile" && mobileWithTouchScreen);
        
        if (shouldFillWindow) {
            this.renderer.SetCanvasFillWindow(
                this.config.matchNativeResolution || false, 
                this.config.useDevicePixelRatio || false,
                this.config.preserveAspectRatio !== false // default to true
            );
        }

        // Enable mobile support automatically when the device's primary pointer is coarse
        // (i.e. finger/touch), which correctly identifies phones and tablets while excluding
        // hybrid laptops that have a touchscreen but use a mouse as their primary input.
        // Set mobileSupport:false to suppress it even on touch-first devices.
        // Set mobileSupport:true to force it on (e.g. for testing on desktop).
        // mobileWithTouchScreen is a global set in main.js and can be queried any time.
        if (mobileWithTouchScreen || this.config.mobileSupport) {
            // Prevent the browser from handling touch gestures (scroll, pinch-zoom) on
            // the canvas, and suppress long-press text selection on the page.
            canvas.style.touchAction = 'none';
            document.body.style.userSelect = 'none';
    
            // Inject viewport meta tag if not already present so the page scales correctly
            // on mobile devices instead of rendering as a zoomed-out desktop page.
            if (!document.querySelector('meta[name="viewport"]')) {
                const meta = document.createElement('meta');
                meta.name = 'viewport';
                meta.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
                document.head.appendChild(meta);
            }

            // Register touch events — mirrors the primary finger into Input.mouse so all
            // existing mouse-based game code works on mobile without any modifications.
            Input.SetupTouchEvents(canvas);
        }
        
        this.gameObjects = [];
        this.colliders = [];
        this.collidersById.clear();
        this.lastCollisions.clear();
        this.detectedCollisions.clear();
        this._objectsToDestroy.clear();
        this._timers = [];
        this._timersById.clear();

        this._setupFocusEvents();
    }
    
    /**
     * Called every frame. Override to update your game logic.
     * @param {number} deltaTime - Elapsed time since the last frame, in seconds.
     */
    Update(deltaTime) {
        // Update timers
        if (this._timers.length > 0) {
            this._updateTimers(deltaTime);
        }

        // Update active game objects
        this.gameObjects.forEach((gameObject) => {
            if (gameObject.active)
                gameObject.Update(deltaTime);
        });

        // Colliders onClick events
        this.colliders.forEach((collider) => {
            if (collider.enabled && Input.mouse.down) {
                if (collider.IsPointInside(Input.mouse.x, Input.mouse.y)) {
                    collider.OnClick();
                }
            }
        });

        // Collision Detection and Event Dispatching
        this.detectedCollisions.clear();

        for (let i = 0; i < this.colliders.length; i++) {
            const colliderA = this.colliders[i];
            // Skip disabled colliders
            if (!colliderA.enabled)
                continue;
            
            for (let j = i + 1; j < this.colliders.length; j++) {
                const colliderB = this.colliders[j];
                // Skip disabled colliders
                if (!colliderB.enabled)
                    continue;

                // Ensure consistent pair ID regardless of order
                const pairId = colliderA.id < colliderB.id ?
                    `${colliderA.id}-${colliderB.id}` :
                    `${colliderB.id}-${colliderA.id}`;

                // Broad-phase: check if bounding circles overlap (performance optimization)
                if (CheckCollisionTwoCircles(colliderA.position, colliderA.boundingRadius, colliderB.position, colliderB.boundingRadius)) {
                    // Narrow-phase: detailed collision check
                    if (CollisionManager.Check(colliderA, colliderB)) {
                        this.detectedCollisions.add(pairId);

                        // new collision, not active the last frame
                        if (!this.lastCollisions.has(pairId)) {
                            const gameObjectA = colliderA.go;
                            const gameObjectB = colliderB.go;

                            if (gameObjectA) {
                                gameObjectA.OnCollisionEnter(colliderA, colliderB);
                            }
                            if (gameObjectB) {
                                gameObjectB.OnCollisionEnter(colliderB, colliderA);
                            }

                            colliderA.isColliding = colliderB.isColliding = true;
                            colliderA.color = colliderB.color = Collider.collisionColor;
                        }
                    }
                }
            }
        }

        // Check for ended collisions (collisions that were active but are no longer)
        for (const pairId of this.lastCollisions) {
            if (!this.detectedCollisions.has(pairId)) {
                // Collision has ended
                const [colliderAId, colliderBId] = pairId.split('-').map(Number);
                
                const colliderA = this.collidersById.get(colliderAId);
                const colliderB = this.collidersById.get(colliderBId);

                if (colliderA && colliderB) {
                    const gameObjectA = colliderA.go;
                    const gameObjectB = colliderB.go;

                    if (gameObjectA) {
                        gameObjectA.OnCollisionExit(colliderA, colliderB);
                    }
                    if (gameObjectB) {
                        gameObjectB.OnCollisionExit(colliderB, colliderA);
                    }

                    colliderA.isColliding = colliderB.isColliding = false;
                    colliderA.color = colliderB.color = Collider.defaultColor;
                }
            }
        }

        this.lastCollisions = this.detectedCollisions;
        this.detectedCollisions = new Set();

        // Process deferred destruction
        if (this._objectsToDestroy.size > 0) {
            this._objectsToDestroy.forEach((gameObject) => {
                const index = this.gameObjects.indexOf(gameObject);
                if (index !== -1) {
                    const collider = gameObject.collider;
                    if (collider) {
                        this.RemoveCollider(collider);
                    }

                    // Cancel all timers owned by this game object
                    this.CancelAllInvokes(gameObject);
                    
                    gameObject.Destroy();
                    this.gameObjects.splice(index, 1);
                }
            });
            this._objectsToDestroy.clear();
        }
    }
    
    /** Called every frame after `Update()`. Override to draw custom graphics using `this.renderer`. */
    Draw() {
        if (!this.config.collidersOnly) {
            this.gameObjects.forEach((gameObject) => {
                if (gameObject.active)
                    gameObject.Draw(this.renderer);
            });
        }

        if (this.config.drawColliders || this.config.collidersOnly) {
            this.colliders.forEach((collider) => {
                collider.Draw(this.renderer);
            });
        }
    }

    /**
     * Adds a game object to the game and calls its `Start()` method.
     * This is the preferred way to add objects at runtime — it ensures proper initialization.
     * 
     * @param {GameObject} gameObject - The game object to add.
     * @returns {GameObject} The same game object (for chaining/inline creation).
     * 
     * @example
     * // Basic usage
     * this.player = this.AddGameObject(new SpriteObject(new Vector2(100, 100), 0, 1, playerImg));
     * 
     * @example
     * // Inline with configuration
     * this.enemy = this.AddGameObject(new Enemy(spawnPos, enemyImg));
     * this.enemy.speed = 200;
     */
    AddGameObject(gameObject) {
        this.gameObjects.push(gameObject);
        gameObject.Start();
        return gameObject;
    }

    /**
     * Removes a game object from the game, cleans up its collider, and calls its `Destroy()` method.
     * @param {GameObject} gameObject - The game object to remove.
     */
    Destroy(gameObject) {
        if (this.gameObjects.indexOf(gameObject) !== -1) {
            // Mark as inactive immediately so it stops updating/drawing
            gameObject.active = false;
            // Add to the deferred destruction queue
            this._objectsToDestroy.add(gameObject);
        }
        else
            console.warn("Error when destroying the gameObjet: GO not found in the gameObjects array.", gameObject);
    }

    /**
     * Moves a game object to the end of the gameObjects array so it is drawn last (on top).
     * @param {GameObject} gameObject - The game object to move.
     */
    MoveGameObjectToEnd(gameObject) {
        const index = this.gameObjects.indexOf(gameObject);
        if (index !== -1)
            this.gameObjects.push(this.gameObjects.splice(index, 1)[0]);
        else
            console.warn("Error when moving the gameObjet to the end: GO not found in the gameObjects array.");
    }

    /**
     * Removes all game objects from the game, safely destroying them and clearing colliders.
     * Uses deferred deletion to queue all objects for safe removal at the end of the frame.
     */
    DestroyAllGameObjects() {
        this.gameObjects.forEach(gameObject => this.Destroy(gameObject));
    }

    /**
     * Registers a collider with the collision system so it participates in collision detection.
     * @param {Collider} collider - The collider to add.
     */
    AddCollider(collider) {
        this.colliders.push(collider);
        this.collidersById.set(collider.id, collider);
    }

    /**
     * Removes a collider from the collision system.
     * @param {Collider} collider - The collider to remove.
     */
    RemoveCollider(collider) {
        const index = this.colliders.indexOf(collider);
        if (index !== -1) {
            this.colliders.splice(index, 1);
            this.collidersById.delete(collider.id);

            // check if the collider has collisions pending
            const idToRemove = collider.id;

            // Fire OnCollisionExit on active pairs and clean up both sets in one pass
            for (const pairId of this.lastCollisions) {
                const ids = pairId.split('-');
                if (ids[0] == idToRemove || ids[1] == idToRemove) {
                    const otherId = Number(ids[0] == idToRemove ? ids[1] : ids[0]);
                    const otherCollider = this.collidersById.get(otherId);
                    if (otherCollider) {
                        otherCollider.isColliding = false;
                        otherCollider.color = Collider.defaultColor;
                        if (otherCollider.go) {
                            otherCollider.go.OnCollisionExit(otherCollider, collider);
                        }
                    }
                    this.lastCollisions.delete(pairId);
                    this.detectedCollisions.delete(pairId);
                }
            }
        }
    }

    /**
     * Enables fill-window mode on the renderer at runtime.
     * @param {boolean} [matchNativeResolution=true] - If true, canvas pixel size matches window size.
     * @param {boolean} [useDevicePixelRatio=false] - If true, scales for HiDPI/retina displays.
     * @param {boolean} [preserveAspectRatio=true] - If true, letterboxes; otherwise stretches to fill.
     */
    SetFillWindow(matchNativeResolution = true, useDevicePixelRatio = false, preserveAspectRatio = true) {
        this.renderer.SetCanvasFillWindow(matchNativeResolution, useDevicePixelRatio, preserveAspectRatio);
    }

    /**
     * Resizes the canvas to the given dimensions.
     * @param {number} width - New canvas width in pixels.
     * @param {number} height - New canvas height in pixels.
     */
    SetScreenSize(width, height) {
        this.renderer.SetScreenSize(width, height);
    }

    /**
     * Merges new values into `this.config`. Call this in the constructor to set up the game.
     * @param {{
     *   screenWidth?: number,
     *   screenHeight?: number,
     *   imageSmoothingEnabled?: boolean,
     *   fillWindow?: boolean | "mobile",
     *   matchNativeResolution?: boolean,
     *   preserveAspectRatio?: boolean,
     *   useDevicePixelRatio?: boolean,
     *   audioAnalyzer?: boolean,
     *   analyzerfftSize?: number,
     *   analyzerSmoothing?: number,
     *   drawColliders?: boolean,
     *   collidersOnly?: boolean,
     *   mobileSupport?: boolean,
     *   autoFullscreen?: boolean
     *   
     * }} newConfig - Config properties to merge. All fields are optional.
     */
    Configure(newConfig) {
        // Merge new configuration with existing config
        Object.assign(this.config, newConfig);
    }

    /**
     * Called by the engine whenever the browser window is resized (only when `fillWindow` is active).
     * Override to reposition UI elements or adjust layout.
     */
    WindowResized() {}

    /**
     * Called when the game window genuinely loses focus (tab switch, app switch, home button).
     * The engine already filters out the spurious blur that mobile browsers fire when the
     * address bar toggles on first touch — this callback only fires on real focus loss.
     * Override to pause the game, mute audio, etc.
     */
    OnFocusLost() {}

    /**
     * Called when the game window regains focus after a real focus-loss event.
     * Override to resume the game, restore audio, etc.
     */
    OnFocusGained() {}

    // #region Timer System

    /**
     * Executes a callback after a delay. Similar to Unity's Invoke.
     * Callbacks are automatically bound to the owner if provided (preserves 'this' context).
     * @param {Function} callback - The function to execute.
     * @param {number} delay - Delay in seconds before execution.
     * @param {GameObject} [owner=null] - Optional GameObject owner (for automatic cleanup and binding).
     * @returns {Timer} The timer instance (can be used with CancelInvoke).
     * @example
     * // From GameObject (auto-bound to 'this'):
     * this.Invoke(this.Attack, 2.0);
     * // From non-GameObject:
     * game.Invoke(this.method, 2.0, this);
     */
    Invoke(callback, delay, owner = null) {
        // Auto-bind callback to owner if provided (Unity-style behavior)
        if (owner && typeof callback === 'function') {
            callback = callback.bind(owner);
        }
        const timer = new Timer(callback, delay, 0, owner);
        this._timers.push(timer);
        this._timersById.set(timer.id, timer);
        return timer;
    }

    /**
     * Executes a callback repeatedly at an interval. Similar to Unity's InvokeRepeating.
     * Callbacks are automatically bound to the owner if provided (preserves 'this' context).
     * @param {Function} callback - The function to execute.
     * @param {number} delay - Delay in seconds before first execution.
     * @param {number} interval - Interval in seconds between repetitions.
     * @param {GameObject} [owner=null] - Optional GameObject owner (for automatic cleanup and binding).
     * @returns {Timer} The timer instance (can be used with CancelInvoke).
     * @example
     * // From GameObject (auto-bound to 'this'):
     * this.InvokeRepeating(this.Shoot, 0, 0.5);
     * // From non-GameObject:
     * game.InvokeRepeating(this.method, 2.0, 1.0, this);
     */
    InvokeRepeating(callback, delay, interval, owner = null) {
        // Auto-bind callback to owner if provided (Unity-style behavior)
        if (owner && typeof callback === 'function') {
            callback = callback.bind(owner);
        }
        const timer = new Timer(callback, delay, interval, owner);
        this._timers.push(timer);
        this._timersById.set(timer.id, timer);
        return timer;
    }

    /**
     * Cancels a specific timer.
     * @param {Timer} timer - The timer instance returned by Invoke or InvokeRepeating.
     */
    CancelInvoke(timer) {
        if (timer && timer.active) {
            timer.Cancel();
        }
    }

    /**
     * Cancels all timers owned by a specific GameObject.
     * Called automatically when a GameObject is destroyed.
     * @param {GameObject} owner - The GameObject whose timers should be cancelled.
     */
    CancelAllInvokes(owner) {
        this._timers.forEach(timer => {
            if (timer.owner === owner) {
                timer.Cancel();
            }
        });
    }

    /**
     * Updates all active timers. Called internally by Game.Update().
     * @param {number} deltaTime - Time elapsed since last frame in seconds.
     * @private
     */
    _updateTimers(deltaTime) {
        // Update timers and remove completed/cancelled ones
        // Using reverse iteration to safely remove during iteration
        for (let i = this._timers.length - 1; i >= 0; i--) {
            const timer = this._timers[i];
            
            // Update returns false when timer should be removed
            if (!timer.Update(deltaTime)) {
                this._timersById.delete(timer.id);
                this._timers.splice(i, 1);
            }
        }
    }

    // #endregion

    // Sets up window blur/focus and visibilitychange listeners with a mobile touch guard.
    _setupFocusEvents() {
        // Android Chrome fires window.blur when the address bar toggles on first touch.
        // Track active touches so we can ignore those spurious blur events.
        let touchInProgress = false;
        document.addEventListener('touchstart', () => { touchInProgress = true; }, { passive: true });
        document.addEventListener('touchend',   () => { setTimeout(() => { touchInProgress = false; }, 300); }, { passive: true });

        window.addEventListener('blur', () => {
            if (touchInProgress)
                return;
            
            this.OnFocusLost();
        });
        window.addEventListener('focus', () => {
            this.OnFocusGained();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.OnFocusLost();
            }
            else {
                this.OnFocusGained();
            }
        });
    }
}