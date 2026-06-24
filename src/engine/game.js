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
 *   Start() { this.player = new SpriteObject(...); }
 *   Update(dt) { this.player.Update(dt); }
 *   Draw()    { this.player.Draw(this.renderer); }
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
         *   fillWindow?: boolean,
         *   matchNativeResolution?: boolean,
         *   preserveAspectRatio?: boolean,
         *   useDevicePixelRatio?: boolean,
         *   audioAnalyzer?: boolean,
         *   analyzerfftSize?: number,
         *   analyzerSmoothing?: number,
         *   drawColliders?: boolean,
         *   collidersOnly?: boolean,
         *   mobileSupport?: boolean
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
            mobileSupport: false
        };
        // config example:
        // {
        //     screenWidth: 1280,          // initial canvas width
        //     screenHeight: 720,          // initial canvas height
        //     imageSmoothingEnabled: true, // enable/disable image smoothing on the canvas context
        //     fillWindow: false,      // make the game canvas to fill the entire window
        //     matchNativeResolution: false, // if fillWindow=true this controls how the canvas behaves when filling window (true: updates the canvas internal resolution to match window size | false: keeps existing resolution and stretches to fit window)
        //     preserveAspectRatio: true,    // if fillWindow=true and matchNativeResolution=false, maintains canvas aspect ratio when scaling to fit window
        //     useDevicePixelRatio: false,   // Use device pixel ratio for crisp rendering on high DPI displays
        //     audioAnalyzer: true,    // if true it will create an audio analyzer when loading the audio assets
        //     analyzerfftSize: 128,   // size of the audio analyzer fft, default is 128
        //     analyzerSmoothing: 0.5, // smoothing of the audio analyzer, default is 0.5
        //     drawColliders: false,   // draw collision shapes for debugging
        //     mobileSupport: false,   // mobile support is activated automatically on touch-capable
        //                             // devices. Set to false to suppress it (e.g. hybrid laptops).
        //                             // Set to true to force it on non-touch devices (e.g. for testing).
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

        /** @type {Renderer} The active renderer (Canvas2D or WebGL). */
        this.renderer = renderer;

        /** @type {GameObject[]} All active game objects managed by this game. */
        this.gameObjects = [];
        this.colliders = [];
        this.collidersById = new Map(); // Maps collider.id to Collider instance for quick lookups
        this.lastCollisions = new Set(); // ids of colliding pairs detected the last frame
        this.detectedCollisions = new Set(); // collisions detected on this frame
        this._objectsToDestroy = new Set(); // gameObjects queued to be destroyed
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
        if (this.config.fillWindow) {
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
    }
    
    /**
     * Called every frame. Override to update your game logic.
     * @param {number} deltaTime - Elapsed time since the last frame, in seconds.
     */
    Update(deltaTime) {
        // Update active game objects
        this.gameObjects.forEach((gameObject) => {
            if (gameObject.active)
                gameObject.Update(deltaTime);
        });

        // Colliders onClick events
        this.colliders.forEach((collider) => {
            if (Input.mouse.down)
                if (collider.IsPointInside(Input.mouse.x, Input.mouse.y)) {
                collider.OnClick();
            }
        });

        // Collision Detection and Event Dispatching
        this.detectedCollisions.clear();

        for (let i = 0; i < this.colliders.length; i++) {
            for (let j = i + 1; j < this.colliders.length; j++) {
                const colliderA = this.colliders[i];
                const colliderB = this.colliders[j];

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
     *   fillWindow?: boolean,
     *   matchNativeResolution?: boolean,
     *   preserveAspectRatio?: boolean,
     *   useDevicePixelRatio?: boolean,
     *   audioAnalyzer?: boolean,
     *   analyzerfftSize?: number,
     *   analyzerSmoothing?: number,
     *   drawColliders?: boolean,
     *   collidersOnly?: boolean,
     *   mobileSupport?: boolean
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
}