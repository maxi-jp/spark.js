// #region Keyboard key ids
const KEY_LEFT   = 37;
const KEY_UP     = 38;
const KEY_RIGHT  = 39;
const KEY_DOWN   = 40;
const KEY_ENTER  = 13;
const KEY_PAUSE  = 19;
const KEY_SPACE  = 32;
const KEY_ESCAPE = 27;
const KEY_LSHIFT = 16;
const KEY_LCTRL  = 17;
const KEY_TAB    = 9;

const KEY_Q = 81, KEY_W = 87, KEY_E = 69, KEY_R = 82, KEY_T = 84, KEY_Y = 89, KEY_U = 85, KEY_I= 73, KEY_O = 79, KEY_P = 80;
const KEY_A = 65, KEY_S = 83, KEY_D = 68, KEY_F = 70, KEY_G = 71, KEY_H = 72, KEY_J = 74;
const KEY_Z = 90, KEY_X = 88, KEY_C = 67, KEY_V = 86, KEY_B = 66, KEY_N = 78, KEY_M = 77;

const KEY_0 = 48;
const KEY_1 = 49;
const KEY_2 = 50;
const KEY_3 = 51;
const KEY_4 = 52;
const KEY_5 = 53;
const KEY_6 = 54;
const KEY_7 = 55;
const KEY_8 = 56;
const KEY_9 = 57;
// #endregion

// #region Gamepad button IDs
const directions = ["UP", "DOWN", "LEFT", "RIGHT"];

const gamepadMapping = {
    xbox: {
        buttons: {
            FACE_DOWN: 0,  // BUTTON_A
            FACE_RIGHT: 1, // BUTTON_B
            FACE_LEFT: 2,  // BUTTON_X
            FACE_UP: 3,    // BUTTON_Y
            LB: 4, // BUTTON_LB
            RB: 5, // BUTTON_RB
            LT: 6, // BUTTON_LT
            RT: 7, // BUTTON_RT
            BACK: 8,  // BUTTON_BACK
            START: 9, // BUTTON_START
            LS: 10, // BUTTON_LS Left stick click
            RS: 11, // BUTTON_RS Right stick click
            DPAD_UP: 12,    // BUTTON_DPAD_UP
            DPAD_DOWN: 13,  // BUTTON_DPAD_DOWN
            DPAD_LEFT: 14,  // BUTTON_DPAD_LEFT
            DPAD_RIGHT: 15, // BUTTON_DPAD_RIGHT
            HOME: 16, // BUTTON_HOME

            LS_LEFT: "LS_LEFT",
            LS_RIGHT: "LS_RIGHT",
            LS_UP: "LS_UP",
            LS_DOWN: "LS_DOWN",
            RS_LEFT: "RS_LEFT",
            RS_RIGHT: "RS_RIGHT",
            RS_UP: "RS_UP",
            RS_DOWN: "RS_DOWN"
        },
        axes: {
            LS: 0,
            RS: 1,
        },
        triggers: {
            LT: 6,
            RT: 7
        }
    },
    standard: {
        buttons: {
            FACE_DOWN: 0,  // BUTTON_A
            FACE_RIGHT: 1, // BUTTON_B
            FACE_LEFT: 2,  // BUTTON_X
            FACE_UP: 3,    // BUTTON_Y
            LB: 4, // BUTTON_LB
            RB: 5, // BUTTON_RB
            LT: 6, // BUTTON_LT
            RT: 7, // BUTTON_RT
            BACK: 8,  // BUTTON_BACK
            START: 9, // BUTTON_START
            LS: 10, // BUTTON_LS Left stick click
            RS: 11, // BUTTON_RS Right stick click
            DPAD_UP: 12,    // BUTTON_DPAD_UP
            DPAD_DOWN: 13,  // BUTTON_DPAD_DOWN
            DPAD_LEFT: 14,  // BUTTON_DPAD_LEFT
            DPAD_RIGHT: 15, // BUTTON_DPAD_RIGHT
            HOME: 16, // BUTTON_HOME

            LS_LEFT: "LS_LEFT",
            LS_RIGHT: "LS_RIGHT",
            LS_UP: "LS_UP",
            LS_DOWN: "LS_DOWN",
            RS_LEFT: "RS_LEFT",
            RS_RIGHT: "RS_RIGHT",
            RS_UP: "RS_UP",
            RS_DOWN: "RS_DOWN"
        },
        axes: {
            LS: 0,
            RS: 1,
        },
        triggers: {
            LT: 6,
            RT: 7
        }
    },
    eightbitdo: {
        buttons: {
            FACE_DOWN: 1,  // BUTTON_A
            FACE_RIGHT: 0, // BUTTON_B
            FACE_LEFT: 4,  // BUTTON_X
            FACE_UP: 3,    // BUTTON_Y
            LB: 6, // BUTTON_LB
            RB: 7, // BUTTON_RB
            LT: 6, // BUTTON_LT
            RT: 7, // BUTTON_RT
            BACK: 10,  // BUTTON_BACK
            START: 11, // BUTTON_START
            LS: 10, // BUTTON_LS Left stick click
            RS: 11, // BUTTON_RS Right stick click
            DPAD_UP: 12,    // BUTTON_DPAD_UP
            DPAD_DOWN: 13,  // BUTTON_DPAD_DOWN
            DPAD_LEFT: 14,  // BUTTON_DPAD_LEFT
            DPAD_RIGHT: 15, // BUTTON_DPAD_RIGHT
            HOME: 16, // BUTTON_HOME

            LS_LEFT: "LS_LEFT",
            LS_RIGHT: "LS_RIGHT",
            LS_UP: "LS_UP",
            LS_DOWN: "LS_DOWN",
            RS_LEFT: "RS_LEFT",
            RS_RIGHT: "RS_RIGHT",
            RS_UP: "RS_UP",
            RS_DOWN: "RS_DOWN"
        },
        axes: {
            LS: 0,
            RS: 1,
        },
        triggers: {
            LT: 6,
            RT: 7
        },
    }
}
// #endregion

const stickDeadzone = 0.1;

/**
 * Global input manager. Access keyboard, mouse, and gamepad state each frame.
 *
 * @example
 * // In your Game's Update():
 * if (Input.IsKeyPressed(KEY_SPACE)) { this.player.Jump(); }
 * this.player.x += Input.GetAxis("MoveH") * speed * dt;
 */
var Input = {
    /**
     * Current mouse state. Updated every frame.
     *
     * Per-button state is available on `left`, `middle`, and `right`.
     * `down`, `up`, and `pressed` are kept as aliases for `left.*` so all
     * existing code that only cares about the primary button continues to work.
     *
     * @type {{
     *   x: number,       // Mouse X in canvas space
     *   y: number,       // Mouse Y in canvas space
     *   moved: boolean,  // True if the mouse moved this frame
     *   wheel: number,   // Scroll delta this frame (positive = down / away from user)
     *   left:   { down: boolean, up: boolean, pressed: boolean },
     *   middle: { down: boolean, up: boolean, pressed: boolean },
     *   right:  { down: boolean, up: boolean, pressed: boolean },
     *   down:    boolean, // Alias for left.down
     *   up:      boolean, // Alias for left.up
     *   pressed: boolean, // Alias for left.pressed
     * }}
     */
    mouse: {
        x: 0,
        y: 0,
        moved: false,
        wheel: 0,
        left:   { down: false, up: false, pressed: false },
        middle: { down: false, up: false, pressed: false },
        right:  { down: false, up: false, pressed: false },
        // Legacy aliases — always mirror the left button so existing code keeps working.
        get down()     { return this.left.down; },
        set down(v)    { this.left.down = v; },
        get up()       { return this.left.up; },
        set up(v)      { this.left.up = v; },
        get pressed()  { return this.left.pressed; },
        set pressed(v) { this.left.pressed = v; },
    },

    /**
     * Current touch state. The primary finger (first one down) is mirrored into
     * `Input.mouse` so all existing mouse-based game code works on mobile unchanged.
     * @type {{
     *   any:     boolean,  // true every frame at least one finger is on the screen
     *   count:   number,   // number of active touch points this frame
     *   down:    boolean,  // true only on the frame the first finger touched down
     *   up:      boolean,  // true only on the frame the last finger was lifted
     *   touches: Map<number, {id:number, x:number, y:number}> // all active touch points
     * }}
     */
    touch: {
        any: false,
        count: 0,
        down: false,
        up: false,
        touches: new Map()
    },

    /**
     * Current keyboard state. Updated every frame.
     * @type {{
     *   keydown: Object<number, boolean>,    // True on the single frame a key was first pressed
     *   keyup: Object<number, boolean>,      // True on the single frame a key was released
     *   keypressed: Object<number, boolean>, // True every frame a key is held down
     *   anyKeyPressed: boolean               // True if any key is currently held
     * }}
     */
    keyboard: {
        keyup: {},
        keypressed: {},
        keydown: {},
        anyKeyPressed: false
    },

    /**
     * Array of connected gamepad descriptors. Each entry is created on `gamepadconnected`
     * and holds `{ gamepad, down[], up[], pressed[], mapping }`. Index matches the browser
     * Gamepad API index (usually 0 for the first controller).
     * @type {Array<{gamepad: Gamepad, down: boolean[], up: boolean[], pressed: boolean[], mapping: object}>}
     */
    gamepads: [
        // gamepad object structure:
        // {
        //     gamepad: null,
        //     down: [],
        //     up: [],
        //     pressed: [],
        //     mapping: {} // reference to the gamepadMapping object
        // }
    ],

    /** @type {Object<string, Array>} Named action bindings registered with `RegisterAction`. */
    actionMaps: {},
    /** @type {Object<string, Array>} Named axis bindings registered with `RegisterAxis`. */
    axisMaps: {},
    /** @type {Object<string, {strong:number, weak:number, duration:number, delay:number}>} Named rumble presets registered with `RegisterRumble`. */
    rumbleMaps: {},

    /**
     * Registered virtual on-screen controls, keyed by the id passed to
     * `RegisterVirtualJoystick` / `RegisterVirtualButton`.
     * @type {{joysticks: Map<string, VirtualJoystick>, buttons: Map<string, VirtualButton>}}
     */
    _virtualControls: {
        joysticks: new Map(),
        buttons:   new Map()
    },
    /** @type {Set<number>} Touch identifiers already claimed by a virtual control this frame. */
    _claimedTouches: new Set(),

    /** @type {HTMLCanvasElement|null} Canvas element used for coordinate normalisation. */
    _canvas: null,
    /**
     * Cached canvas-to-game-coordinate transform, updated by `UpdateCanvasTransform()`.
     * @type {{offsetX:number, offsetY:number, scaleX:number, scaleY:number, canvasWidth:number, canvasHeight:number}}
     */
    _canvasTransform: {
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        canvasWidth: 640,
        canvasHeight: 480
    },

// #region Setup Functions

    /**
     * Stores a reference to the canvas element and the logical game resolution used for
     * mouse / touch coordinate normalisation. Called automatically by `SetupMouseEvents`.
     * @param {HTMLCanvasElement} canvas
     * @param {number} [canvasWidth]  - Logical game width in pixels (defaults to `canvas.width`).
     * @param {number} [canvasHeight] - Logical game height in pixels (defaults to `canvas.height`).
     */
    SetCanvas: function(canvas, canvasWidth, canvasHeight) {
        this._canvas = canvas;
        this._canvasTransform.canvasWidth = canvasWidth || canvas.width;
        this._canvasTransform.canvasHeight = canvasHeight || canvas.height;
    },
    
    /**
     * Refreshes the cached canvas bounding-rect and scale factors used to convert pixel
     * positions to game coordinates. Called automatically when the canvas or resolution
     * changes. You can call it manually after programmatic layout changes.
     */
    UpdateCanvasTransform: function() {
        if (!this._canvas)
            return;
        
        const rect = this._canvas.getBoundingClientRect();
        this._canvasTransform.offsetX = rect.left;
        this._canvasTransform.offsetY = rect.top;
        this._canvasTransform.scaleX = this._canvasTransform.canvasWidth / rect.width;
        this._canvasTransform.scaleY = this._canvasTransform.canvasHeight / rect.height;
    },
    
    /**
     * Updates the logical game resolution used for coordinate normalisation and refreshes
     * the transform cache. Call this whenever the game's `screenWidth` / `screenHeight` changes.
     * @param {number} width  - New logical canvas width in pixels.
     * @param {number} height - New logical canvas height in pixels.
     */
    SetCanvasResolution: function(width, height) {
        this._canvasTransform.canvasWidth = width;
        this._canvasTransform.canvasHeight = height;
        // Update transforms when resolution changes
        this.UpdateCanvasTransform();
    },
    
    /**
     * Registers `keydown` and `keyup` listeners on `document`.
     * Called once during engine initialisation — you do not need to call this manually.
     */
    SetupKeyboardEvents: function() {
        AddEvent(document, "keydown", function(e) {
            //console.log(e.keyCode);
            // avoid when the key is being held down such that it is automatically repeating
            if (!e.repeat) {
                Input.keyboard.keydown[e.keyCode] = true;
                Input.keyboard.keypressed[e.keyCode] = true;
                Input.keyboard.anyKeyPressed = true;
            }
        } );
    
        AddEvent(document, "keyup", function(e) {
            Input.keyboard.keyup[e.keyCode] = true;
            Input.keyboard.keypressed[e.keyCode] = false;
        } );
    
        function AddEvent (element, eventName, func) {
            if (element.addEventListener)
                element.addEventListener(eventName, func, false);
            else if (element.attachEvent) // IE9
                element.attachEvent(eventName, func);
        }
    },

    /**
     * Registers `mousedown`, `mousemove`, and `mouseup` listeners on the canvas and stores
     * the canvas reference for coordinate normalisation.
     * Called once during engine initialisation — you do not need to call this manually.
     * @param {HTMLCanvasElement} canvas
     */
    SetupMouseEvents: function(canvas) {
        // Set canvas reference for coordinate transformation
        this.SetCanvas(canvas);

        const onMouseDown = (e) => {
            // e.button: 0=left, 1=middle, 2=right
            const btn = e.button === 0 ? Input.mouse.left
                      : e.button === 1 ? Input.mouse.middle
                      : e.button === 2 ? Input.mouse.right
                      : null;
            if (btn) {
                btn.down = true;
                btn.pressed = true;
            }
        };

        const onMouseUp = (e) => {
            const btn = e.button === 0 ? Input.mouse.left
                      : e.button === 1 ? Input.mouse.middle
                      : e.button === 2 ? Input.mouse.right
                      : null;
            if (btn) {
                btn.up = true;
                btn.pressed = false;
            }
        };

        const onMouseMove = (e) => {
            // Use normalized coordinate approach (robust with all CSS transforms)
            if (!Input._canvas)
                return;
            
            const rect = Input._canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Convert to normalized coordinates (0 to 1)
            const normalizedX = x / rect.width;
            const normalizedY = y / rect.height;
            
            // Map to internal canvas resolution
            Input.mouse.x = normalizedX * Input._canvasTransform.canvasWidth;
            Input.mouse.y = normalizedY * Input._canvasTransform.canvasHeight;
            Input.mouse.moved = true;
            //console.log(Input.mouse);
        };

        const onMouseWheel = (e) => {
            Input.mouse.wheel += e.deltaY;
        };
        
        // mouse click event
        canvas.addEventListener("mousedown", onMouseDown, false);
        // mouse move event
        canvas.addEventListener("mousemove", onMouseMove, false);
        // mouse up event
        canvas.addEventListener("mouseup", onMouseUp, false);
        // scroll wheel — accumulate delta; reset to 0 each frame in PostUpdate
        canvas.addEventListener("wheel", onMouseWheel, { passive: true });
        // suppress the right-click context menu on the canvas
        canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, false);
    },

    /**
     * Registers touch event listeners on the canvas.
     * The primary finger (first one down) is automatically mirrored into `Input.mouse`
     * so any game that already reads `Input.mouse` works on mobile with no changes.
     * Multi-touch points are tracked in `Input.touch.touches` (Map keyed by identifier).
     * Call this from `Game.Start()` when `mobileSupport` is enabled — `main.js` wires
     * it up automatically when `config.mobileSupport = true`.
     * @param {HTMLCanvasElement} canvas
     */
    SetupTouchEvents: function(canvas) {
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                const pos = Input._touchToCanvas(t);
                Input.touch.touches.set(t.identifier, { id: t.identifier, x: pos.x, y: pos.y });
            }
            Input.touch.count = Input.touch.touches.size;
            Input.touch.any = true;

            // Mirror the first finger down to mouse so mouse-based code works on mobile
            if (e.touches.length === 1) {
                const primary = Input.touch.touches.get(e.touches[0].identifier);
                Input.mouse.x = primary.x;
                Input.mouse.y = primary.y;
                Input.mouse.down = true;
                Input.mouse.pressed = true;
                Input.touch.down = true;
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                const pos = Input._touchToCanvas(t);
                const entry = Input.touch.touches.get(t.identifier);
                if (entry) {
                    entry.x = pos.x;
                    entry.y = pos.y;
                }
            }
            // Mirror primary touch movement to mouse
            const primary = Input.touch.touches.get(e.touches[0]?.identifier);
            if (primary) {
                Input.mouse.x = primary.x;
                Input.mouse.y = primary.y;
                Input.mouse.moved = true;
            }
        }, { passive: false });

        const onTouchEnd = (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                Input.touch.touches.delete(t.identifier);
            }
            Input.touch.count = Input.touch.touches.size;
            Input.touch.any = Input.touch.count > 0;

            // When all fingers are lifted, mirror mouse up
            if (Input.touch.count === 0) {
                Input.mouse.up = true;
                Input.mouse.pressed = false;
                Input.touch.up = true;
            }
        };
        canvas.addEventListener('touchend',    onTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
    },

    /**
     * Converts a Touch point to internal canvas coordinates using the same
     * normalized-coordinate approach as `MouseMove`.
     * @param {Touch} touch
     * @returns {{x: number, y: number}}
     */
    _touchToCanvas: function(touch) {
        const rect = this._canvas.getBoundingClientRect();
        const normalizedX = (touch.clientX - rect.left) / rect.width;
        const normalizedY = (touch.clientY - rect.top)  / rect.height;
        return {
            x: normalizedX * this._canvasTransform.canvasWidth,
            y: normalizedY * this._canvasTransform.canvasHeight
        };
    },

    /**
     * Registers `gamepadconnected` / `gamepaddisconnected` listeners and starts the
     * per-frame `UpdateGamepads()` polling loop.
     * Called once during engine initialisation — you do not need to call this manually.
     */
    SetupGamepadEvents: function() {
        window.addEventListener("gamepadconnected", (event) => {
            const gamepad = event.gamepad;
            let mapping = null;

            // detect the type of gamepad and apply the specific mapping
            if (gamepad.id.toLowerCase().includes("xbox")) {
                mapping = gamepadMapping.xbox;
            }
            else if (gamepad.id.includes("8Bitdo") || gamepad.id.includes("Vendor: 2dc8")) {
                mapping = gamepadMapping.eightbitdo;
            }
            else if (gamepad.id.toLowerCase().includes("standard gamepad")) {
                mapping = gamepadMapping.standard;
            }
            else {
                console.warn("Unknown gamepad type: ", gamepad.id);
            }

            this.gamepads[event.gamepad.index] = {
                gamepad: event.gamepad,
                down: [],
                up: [],
                pressed: [],
                mapping: mapping
            }

            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                event.gamepad.index, event.gamepad.id,
                event.gamepad.buttons.length, event.gamepad.axes.length);
        });

        window.addEventListener("gamepaddisconnected", (event) => {
            delete this.gamepads[event.gamepad.index];
            this.gamepads.splice(event.gamepad.index, 1);

            console.log("Gamepad disconnected from index %d: %s",
                event.gamepad.index, event.gamepad.id);
        });

        // update connected gamepads and update button states
        this.UpdateGamepads();
    },
// #endregion

// #region Input Mapping API

    /**
     * Clears all registered action and axis mappings.
     * Should be called when starting a new game or scene.
     */
    ClearMappings: function() {
        this.actionMaps = {};
        this.axisMaps = {};
        this.rumbleMaps = {};
    },

    /**
     * Registers a named action and its physical input bindings.
     * @param {string} name The name of the action (e.g., "Jump", "Fire").
     * @param {Array<Object>} bindings An array of binding objects.
     * e.g., [{ type: 'key', code: KEY_SPACE }, { type: 'gamepad', code: 'FACE_DOWN' }]
     */
    RegisterAction: function(name, bindings) {
        this.actionMaps[name] = bindings;
    },

    /**
     * Unregisters a named action and its physical input bindings.
     * @param {string} name The name of the action to unregister.
     */
    UnregisterAction: function(name) {
        delete this.actionMaps[name];
    },

    /**
     * Registers a named axis and its physical input bindings.
     * @param {string} name The name of the axis (e.g., "MoveHorizontal").
     * @param {Array<Object>} bindings An array of binding objects.
     * e.g., [{ type: 'key', positive: KEY_D, negative: KEY_A }, { type: 'gamepadaxis', stick: 'LS', axis: 0 }]
     */
    RegisterAxis: function(name, bindings) {
        this.axisMaps[name] = bindings;
    },

    /**
     * Unregisters a named axis and its physical input bindings.
     * @param {string} name The name of the axis to unregister.
     */
    UnregisterAxis: function(name) {
        delete this.axisMaps[name];
    },

    /**
     * Checks if an action was triggered in the current frame.
     * @param {string} name The name of the action.
     * @returns {boolean} True if the action was triggered this frame.
     */
    GetActionDown: function(name) {
        const bindings = this.actionMaps[name];
        if (!bindings)
            return false;

        for (const binding of bindings) {
            switch (binding.type) {
                case 'key':
                    if (this.IsKeyDown(binding.code))
                        return true;
                    break;
                case 'mouse':
                    if (this.IsMouseDown())
                        return true;
                    break;
                case 'gamepad':
                    for (let i = 0; i < this.gamepads.length; i++) {
                        if (this.gamepads[i] && this.IsGamepadButtonDown(i, binding.code))
                            return true;
                    }
                    break;
                case 'touch':
                    if (this.touch.down)
                        return true;
                    break;
                case 'virtualbutton':
                    if (this._virtualControls) {
                        const btn = this._virtualControls.buttons.get(binding.id);
                        if (btn && btn.down)
                            return true;
                    }
                    break;
            }
        }
        return false;
    },

    /**
     * Checks if an action is currently being held down.
     * @param {string} name The name of the action.
     * @returns {boolean} True if the action is being held.
     */
    GetAction: function(name) {
        const bindings = this.actionMaps[name];
        if (!bindings)
            return false;

        for (const binding of bindings) {
            switch (binding.type) {
                case 'key':
                    if (this.IsKeyPressed(binding.code))
                        return true;
                    break;
                case 'mouse':
                    if (this.IsMousePressed())
                        return true;
                    break;
                case 'gamepad':
                    for (let i = 0; i < this.gamepads.length; i++) {
                        if (this.gamepads[i] && this.IsGamepadButtonPressed(i, binding.code))
                            return true;
                    }
                    break;
                case 'touch':
                    if (this.touch.any)
                        return true;
                    break;
                case 'virtualbutton':
                    if (this._virtualControls) {
                        const btn = this._virtualControls.buttons.get(binding.id);
                        if (btn && btn.pressed)
                            return true;
                    }
                    break;
            }
        }
        return false;
    },

    /**
     * Checks if an action was released in the current frame.
     * @param {string} name The name of the action.
     * @returns {boolean} True if the action was released this frame.
     */
    GetActionUp: function(name) {
        const bindings = this.actionMaps[name];
        if (!bindings)
            return false;

        for (const binding of bindings) {
            switch (binding.type) {
                case 'key':
                    if (this.IsKeyUp(binding.code))
                        return true;
                    break;
                case 'mouse':
                    if (this.mouse.up)
                        return true;
                    break;
                case 'gamepad':
                    for (let i = 0; i < this.gamepads.length; i++) {
                        if (this.gamepads[i] && this.IsGamepadButtonUp(i, binding.code))
                            return true;
                    }
                    break;
                case 'touch':
                    if (this.touch.up)
                        return true;
                    break;
                case 'virtualbutton':
                    if (this._virtualControls) {
                        const btn = this._virtualControls.buttons.get(binding.id);
                        if (btn && btn.up)
                            return true;
                    }
                    break;
            }
        }
        return false;
    },

    /**
     * Gets the value of a registered axis, from -1.0 to 1.0.
     * @param {string} name The name of the axis.
     * @returns {number} The axis value.
     */
    GetAxis: function(name) {
        const bindings = this.axisMaps[name];
        if (!bindings)
            return 0;

        let finalAxisValue = 0.0;

        for (const binding of bindings) {
            let currentValue = 0.0;
            switch (binding.type) {
                case 'key':
                    currentValue = 0.0;
                    if (this.IsKeyPressed(binding.positive))
                        currentValue += 1.0;
                    if (this.IsKeyPressed(binding.negative))
                        currentValue -= 1.0;
                    break;
                case 'gamepadaxis':
                    for (let i = 0; i < this.gamepads.length; i++) {
                        if (!this.gamepads[i])
                            continue;

                        const stick = this.GetGamepadStickValue(i, binding.stick);
                        const axisVal = binding.axis === 0 ? stick.x : stick.y;
                        if (Math.abs(axisVal) > Math.abs(currentValue)) {
                            currentValue = axisVal;
                        }
                    }
                    break;
                case 'gamepadtrigger':
                    for (let i = 0; i < this.gamepads.length; i++) {
                        if (!this.gamepads[i])
                            continue;
                        
                        const triggerValue = this.GetGamepadTriggerValue(i, binding.trigger);
                        if (Math.abs(triggerValue) > Math.abs(currentValue)) {
                            currentValue = triggerValue;
                        }
                    }
                    break;
                case 'gamepadbutton':
                     for (let i = 0; i < this.gamepads.length; i++) {
                        if (!this.gamepads[i])
                            continue;

                        currentValue = 0.0;
                        if (this.IsGamepadButtonPressed(i, binding.positive)) {
                            currentValue += 1.0;
                            break;
                        }
                        if (this.IsGamepadButtonPressed(i, binding.negative)) {
                            currentValue -= 1.0;
                            break;
                        }
                     }
                    break;
                case 'virtualjoystick':
                    if (this._virtualControls) {
                        const joystick = this._virtualControls.joysticks.get(binding.id);
                        if (joystick) {
                            currentValue = binding.axis === 0 ? joystick.axisX : joystick.axisY;
                        }
                    }
                    break;
            }
            if (Math.abs(currentValue) > Math.abs(finalAxisValue)) {
                finalAxisValue = currentValue;
            }
        }
        
        // Apply deadzone
        if (Math.abs(finalAxisValue) < stickDeadzone)
            return 0;

        // Clamp to [-1, 1]
        return Math.max(-1.0, Math.min(1.0, finalAxisValue));
    },
    /**
     * Registers a named rumble preset.
     * @param {string} id A unique name for this preset (e.g., "Hit", "Explosion").
     * @param {number} [strong=1]    Low-frequency motor intensity, 0–1.
     * @param {number} [weak=1]      High-frequency motor intensity, 0–1.
     * @param {number} [duration=200] Duration in milliseconds.
     * @param {number} [delay=0]     Start delay in milliseconds.
     */
    RegisterRumble: function(id, strong = 1, weak = 1, duration = 200, delay = 0) {
        this.rumbleMaps[id] = {
            strong: strong,
            weak: weak,
            duration: duration,
            delay: delay
        };
    },

    /**
     * Unregisters a named rumble preset.
     * @param {string} id The id of the rumble preset to unregister.
     */
    unregisterRumble: function(id) {
        delete this.rumbleMaps[id];
    },

    /**
     * Fires a previously registered rumble preset on gamepad 0.
     * @param {string} id The id passed to RegisterRumble.
     * @param {number} [gamepadIndex=0] Target gamepad index.
     */
    ExecuteRumble: function(id, gamepadIndex = 0) {
        const preset = this.rumbleMaps[id];
        if (!preset) {
            console.warn(`Input.ExecuteRumble: unknown rumble id "${id}"`);
            return;
        }
        this.RumbleGamepad(gamepadIndex, preset.strong, preset.weak, preset.duration, preset.delay);
    },

// #endregion

// #region Keyboard and Mouse Events
    /**
     * Returns true every frame the key is held down.
     * @param {number} keycode - A `KEY_*` constant (e.g. `KEY_SPACE`, `KEY_LEFT`).
     * @returns {boolean}
     */
    IsKeyPressed: function(keycode) {
        return this.keyboard.keypressed[keycode];
    },

    /**
     * Returns true only on the single frame the key was first pressed down.
     * @param {number} keycode - A `KEY_*` constant.
     * @returns {boolean}
     */
    IsKeyDown: function(keycode) {
        return this.keyboard.keydown[keycode];
    },

    /**
     * Returns true only on the single frame the key was released.
     * @param {number} keycode - A `KEY_*` constant.
     * @returns {boolean}
     */
    IsKeyUp: function(keycode) {
        return this.keyboard.keyup[keycode];
    },

    /**
     * Returns the mouse button sub-object for the given button index.
     * 0 = left (default), 1 = right, 2 = middle (wheel click).
     * @param {number} [button=0]
     * @returns {{down:boolean, up:boolean, pressed:boolean}}
     */
    _mouseButton: function(button) {
        if (button === 1)
            return this.mouse.right;
        
        if (button === 2)
            return this.mouse.middle;

        return this.mouse.left;
    },

    /**
     * Returns `true` every frame the specified mouse button is held down.
     * @param {0|1|2} [button=0] - 0 = left (default), 1 = right, 2 = middle (wheel click).
     * @returns {boolean}
     */
    IsMousePressed: function(button = 0) {
        return this._mouseButton(button).pressed;
    },

    /**
     * Returns `true` only on the single frame the specified mouse button was first pressed.
     * @param {0|1|2} [button=0] - 0 = left (default), 1 = right, 2 = middle (wheel click).
     * @returns {boolean}
     */
    IsMouseDown: function(button = 0) {
        return this._mouseButton(button).down;
    },

    /**
     * Returns `true` only on the single frame the specified mouse button was released.
     * @param {0|1|2} [button=0] - 0 = left (default), 1 = right, 2 = middle (wheel click).
     * @returns {boolean}
     */
    IsMouseUp: function(button = 0) {
        return this._mouseButton(button).up;
    },
// #endregion

// #region Gamepad Events
    /**
     * Returns true only on the frame the gamepad button was first pressed.
     * @param {number} gamepadIndex - Index of the gamepad (0 = first connected).
     * @param {string} buttonId - A button name from `gamepadMapping`, e.g. `"FACE_DOWN"`, `"LB"`, `"DPAD_UP"`.
     * @returns {boolean}
     */
    IsGamepadButtonDown: function(gamepadIndex, buttonId) {
        const gamepad = this.gamepads[gamepadIndex];
        if (gamepad && gamepad.mapping)
            return gamepad.down[gamepad.mapping.buttons[buttonId]];
        return false;
    },

    /**
     * Returns true only on the frame the gamepad button was released.
     * @param {number} gamepadIndex @param {string} buttonId @returns {boolean}
     */
    IsGamepadButtonUp: function(gamepadIndex, buttonId) {
        const gamepad = this.gamepads[gamepadIndex];
        if (gamepad && gamepad.mapping)
            return gamepad.up[gamepad.mapping.buttons[buttonId]];
        return false;
    },

    /**
     * Returns true every frame the gamepad button is held down.
     * @param {number} gamepadIndex @param {string} buttonId @returns {boolean}
     */
    IsGamepadButtonPressed: function(gamepadIndex, buttonId) {
        const gamepad = this.gamepads[gamepadIndex];
        if (gamepad && gamepad.mapping)
            return gamepad.pressed[gamepad.mapping.buttons[buttonId]];
        return false;
    },

    /**
     * Returns the raw value of a gamepad axis by its numeric index (-1 to 1).
     * Prefer `GetGamepadStickValue` for named stick access.
     * @param {number} gamepadIndex - Index of the gamepad.
     * @param {number} axisIndex    - Raw axis index from the browser Gamepad API.
     * @returns {number}
     */
    GetGamepadAxisValue: function(gamepadIndex, axisIndex) {
        const gamepad = this.gamepads[gamepadIndex]?.gamepad;
        if (gamepad && gamepad.axes[axisIndex] !== undefined) {
            return gamepad.axes[axisIndex];
        }
        return 0;
    },

    /**
     * Returns a single axis component of a named stick.
     * @param {number} gamepadIndex
     * @param {"LS"|"RS"} stickId
     * @param {0|1} axis - `0` = X axis, `1` = Y axis.
     * @returns {number} Value in the range -1 to 1.
     */
    GetGamepadStickAxisValue: function(gamepadIndex, stickId, axis) {
        const gamepad = this.gamepads[gamepadIndex];
        if (gamepad && gamepad.mapping) {
            const axisId = gamepad.mapping.axes[stickId] * 2 + axis;
            if (gamepad.gamepad.axes[axisId] !== undefined) {
                return gamepad.gamepad.axes[axisId];
            }
        }
        return 0;
    },

    /**
     * Returns one axis component of the left stick.
     * @param {number} gamepadIndex
     * @param {0|1} axis - `0` = X, `1` = Y.
     * @returns {number} Value in the range -1 to 1.
     */
    GetGamepadLeftStickValue: function(gamepadIndex, axis) {
        return this.GetGamepadStickAxisValue(gamepadIndex, "LS", axis);
    },

    /**
     * Returns one axis component of the right stick.
     * @param {number} gamepadIndex
     * @param {0|1} axis - `0` = X, `1` = Y.
     * @returns {number} Value in the range -1 to 1.
     */
    GetGamepadRightStickValue: function(gamepadIndex, axis) {
        return this.GetGamepadStickAxisValue(gamepadIndex, "RS", axis);
    },

    /**
     * Returns the current value of a gamepad analog stick as a `{x, y}` object (values -1 to 1).
     * @param {number} gamepadIndex @param {"LS"|"RS"} stick @returns {{x: number, y: number}}
     */
    GetGamepadStickValue: function(gamepadIndex, stick) {
        const gamepad = this.gamepads[gamepadIndex];
        if (gamepad && gamepad.mapping) {
            const x = gamepad.gamepad.axes[gamepad.mapping.axes[stick] * 2] || 0;
            const y = gamepad.gamepad.axes[gamepad.mapping.axes[stick] * 2 + 1] || 0;
            return { x, y };
        }
        return { x: 0, y: 0 };
    },

    /**
     * Returns `true` if the specified stick is pushed past the deadzone in the given direction.
     * @param {number} gamepadIndex
     * @param {"LS"|"RS"} stickId
     * @param {"UP"|"DOWN"|"LEFT"|"RIGHT"} dir
     * @returns {boolean}
     */
    GetGamepadStickDirection: function(gamepadIndex, stickId, dir) {
        const gamepad = this.gamepads[gamepadIndex];
        if (gamepad && gamepad.mapping) {
            const stick = gamepad.mapping.axes[stickId];
            const x = gamepad.gamepad.axes[stick * 2] || 0;
            const y = gamepad.gamepad.axes[stick * 2 + 1] || 0;

            return x < -0.5 && dir === "LEFT"  ||
                   x >  0.5 && dir === "RIGHT" ||
                   y < -0.5 && dir === "UP"    ||
                   y >  0.5 && dir === "DOWN";
        }
        return false;
    },

    /**
     * Returns the current value of a gamepad trigger (0 to 1).
     * @param {number} gamepadIndex @param {"LT"|"RT"} trigger @returns {number}
     */
    GetGamepadTriggerValue: function(gamepadIndex, trigger) {
        const gamepad = this.gamepads[gamepadIndex];
        if (gamepad && gamepad.mapping) {
            return gamepad.gamepad.buttons[gamepad.mapping.triggers[trigger]].value || 0;
        }
        return 0;
    },

    /**
     * Triggers haptic rumble on a gamepad.
     * @param {number} gamepadIndex Index of the gamepad (usually 0).
     * @param {number} [strongMagnitude=1] Low-frequency (strong) motor intensity, 0–1.
     * @param {number} [weakMagnitude=1] High-frequency (weak) motor intensity, 0–1.
     * @param {number} [duration=200] Duration in milliseconds.
     * @param {number} [startDelay=0] Delay before the effect starts, in milliseconds.
     */
    RumbleGamepad: function(gamepadIndex, strongMagnitude = 1, weakMagnitude = 1, duration = 200, startDelay = 0) {
        const gamepad = this.gamepads[gamepadIndex];
        if (!gamepad)
            return;
        
        const actuator = gamepad.gamepad.vibrationActuator;
        if (!actuator)
            return;
        
        actuator.playEffect(actuator.type || "dual-rumble", {
            duration,
            startDelay,
            strongMagnitude: Math.max(0, Math.min(1, strongMagnitude)),
            weakMagnitude:   Math.max(0, Math.min(1, weakMagnitude)),
        });
    },
// #endregion

// #region Update functions

    /**
     * Resets all single-frame input flags (key down/up, mouse down/up, touch down/up,
     * virtual button down/up). Called automatically at the end of each engine frame —
     * you do not need to call this manually.
     */
    PostUpdate: function () {
        // clean keyboard keydown events
        for (var property in this.keyboard.keydown) {
            if (this.keyboard.keydown.hasOwnProperty(property)) {
                this.keyboard.keydown[property] = false;
            }
        }

        // clean keyboard keyup events
        for (var property in this.keyboard.keyup) {
            if (this.keyboard.keyup.hasOwnProperty(property)) {
                this.keyboard.keyup[property] = false;
            }
        }

        // clear per-button mouse down/up events (pressed persists until mouseup)
        this.mouse.left.down   = false;
        this.mouse.left.up     = false;
        this.mouse.middle.down = false;
        this.mouse.middle.up   = false;
        this.mouse.right.down  = false;
        this.mouse.right.up    = false;
        this.mouse.wheel       = 0;

        // Reset per-frame touch flags (positions and active touches persist until changed)
        this.touch.down = false;
        this.touch.up = false;

        // Reset per-frame virtual button states
        for (const b of this._virtualControls.buttons.values()) {
            b.down = false;
            b.up   = false;
        }

        // Reset mouse.moved and keyboard.anyKeyPressed flags
        this.mouse.moved = false;
        this.keyboard.anyKeyPressed = false;

        // update gamepads
        this.UpdateGamepads();
    },

    /**
     * Polls the browser Gamepad API and updates `down`, `up`, and `pressed` arrays for
     * every connected gamepad, including virtual stick-direction buttons (e.g. `"LS_LEFT"`).
     * Called automatically each frame by `PostUpdate()` — you do not need to call this manually.
     */
    UpdateGamepads: function() {
        // update current gamepad connected references
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                this.gamepads[gamepads[i].index].gamepad = gamepads[i];
            }
        }

        // Update button down and up states
        for (let gamepadIndex in this.gamepads) {
            const gamepad = this.gamepads[gamepadIndex];
            for (let buttonIndex in gamepad.gamepad.buttons) {
                const button = gamepad.gamepad.buttons[buttonIndex];

                gamepad.down[buttonIndex] = gamepad.up[buttonIndex] = false;

                if (button.pressed && !gamepad.pressed[buttonIndex]) {
                    gamepad.down[buttonIndex] = true;
                }
                if (!button.pressed && gamepad.pressed[buttonIndex]) {
                    gamepad.up[buttonIndex] = true;
                }

                gamepad.pressed[buttonIndex] = button.pressed;
            }

            // Update stick direction buttons like logic
            for (let i = 0; i < 2; i++) {
                const stick = i == 0 ? "LS" : "RS";
                directions.forEach(dir => {
                    const buttonId = `${stick}_${dir}`;
                    gamepad.down[buttonId] = gamepad.up[buttonId] = false;

                    const stickId = gamepad.mapping.axes[stick];
                    const x = gamepad.gamepad.axes[stickId * 2] || 0;
                    const y = gamepad.gamepad.axes[stickId * 2 + 1] || 0;

                    const pressed = x < -0.5 && dir === "LEFT" ||
                                    x > 0.5 && dir === "RIGHT" ||
                                    y < -0.5 && dir === "UP" ||
                                    y > 0.5 && dir === "DOWN";
                    if (pressed && !gamepad.pressed[buttonId]) {
                        gamepad.down[buttonId] = true;
                    }
                    if (!pressed && gamepad.pressed[buttonId]) {
                        gamepad.up[buttonId] = true;
                    }

                    gamepad.pressed[buttonId] = pressed;
                });
            }
        }
    },

// #endregion

// #region Virtual Controls

    /**
     * Registers a `VirtualJoystick` instance under a named id so it can be used in
     * axis bindings: `{ type: 'virtualjoystick', id, axis }`.
     * The joystick must be created first with `new VirtualJoystick(...)`, which also
     * auto-registers it for drawing via `VirtualControlls`.
     * @param {string} id                      - Unique key used in axis bindings.
     * @param {VirtualJoystick} virtualJoystick - The joystick instance to register.
     * @returns {VirtualJoystick}
     */
    RegisterVirtualJoystick: function(id, virtualJoystick) {
        this._virtualControls.joysticks.set(id, virtualJoystick);
        return virtualJoystick;
    },

    /**
     * Removes a registered `VirtualJoystick` by id.
     * @param {string} id 
     */
    RemoveVirtualJoystick: function(id) {
        this._virtualControls.joysticks.delete(id);
    },

    /**
     * Registers a `VirtualButton` instance under a named id so it can be used in
     * action bindings: `{ type: 'virtualbutton', id }`.
     * The button must be created first with `new VirtualButton(...)`, which also
     * auto-registers it for drawing via `VirtualControlls`.
     * @param {string} id                  - Unique key used in action bindings.
     * @param {VirtualButton} virtualButton - The button instance to register.
     * @returns {VirtualButton}
     */
    RegisterVirtualButton: function(id, virtualButton) {
        this._virtualControls.buttons.set(id, virtualButton);
        return virtualButton;
    },

    /**
     * Returns a registered `VirtualJoystick` by id, or `undefined` if not found.
     * @param {string} id @returns {VirtualJoystick|undefined}
     */
    GetVirtualJoystick: function(id) {
        return this._virtualControls.joysticks.get(id);
    },

    /**
     * Returns a registered `VirtualButton` by id, or `undefined` if not found.
     * @param {string} id @returns {VirtualButton|undefined}
     */
    GetVirtualButton: function(id) {
        return this._virtualControls.buttons.get(id);
    },

    /**
     * Updates all virtual control states for the current frame.
     * Called automatically by the engine loop before `game.Update()`.
     * You do not need to call this manually.
     * @note Drawing is handled separately by `VirtualControlls.Draw(renderer)` in `virtualcontrols.js`.
     */
    UpdateVirtualControls: function() {
        const { joysticks, buttons } = this._virtualControls;
        if (joysticks.size === 0 && buttons.size === 0)
            return;

        const touches = this.touch.touches;
        const claimed = this._claimedTouches;

        // Pass 1: refresh controls that already have a claimed touch, release dead ones.
        claimed.clear();
        for (const ctrl of [...joysticks.values(), ...buttons.values()]) {
            if (ctrl._touchId !== null) {
                if (touches.has(ctrl._touchId)) {
                    claimed.add(ctrl._touchId);
                    ctrl._updateActive(touches.get(ctrl._touchId));
                }
                else {
                    ctrl._release();
                }
            }
        }

        // Pass 2: let unattached controls claim new unclaimed touches.
        for (const ctrl of [...joysticks.values(), ...buttons.values()]) {
            if (ctrl._touchId !== null)
                continue;

            for (const [id, t] of touches) {
                if (claimed.has(id))
                    continue;

                if (ctrl._tryClaimTouch(id, t)) {
                    claimed.add(id);
                    break;
                }
            }
        }
    },

// #endregion
};
