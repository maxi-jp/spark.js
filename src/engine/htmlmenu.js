class HTMLMenu {
    /**
     * @param {Game}   game                     - The active game instance.
     * @param {string} menuContainerSelector    - CSS selector for the menu overlay div.
     * @param {string} canvasContainerSelector  - CSS selector for the div wrapping the canvas.
     * @param {HTMLCanvasElement} canvas        - The game canvas element.
     * @param {boolean} [coverCanvas=false]     - When true, positions the overlay directly
     *   above the canvas at the same size. Works in both `fillWindow` and normal-flow modes:
     *   uses `position:fixed` + z-index when the canvas is in fill-window mode, and
     *   `position:absolute` inside the canvas container otherwise.
     * @param {boolean} [syncWithCanvas=false]  - When true, keeps the overlay in sync with
     *   the canvas on every resize via `game.WindowResized`. When `fillWindow` is active
     *   the overlay matches the canvas's `position:fixed` + CSS transform so content scales
     *   identically. When `fillWindow` is not active it falls back to absolute positioning
     *   over the canvas. Safe to combine with `coverCanvas`.
     */
    constructor(game, menuContainerSelector, canvasContainerSelector, canvas, coverCanvas = false, syncWithCanvas = false) {
        this.game = game;

        this.container = document.querySelector(menuContainerSelector);
        this.canvasContainer = document.querySelector(canvasContainerSelector);

        this.elements = [];
        this.buttons = [];
        this.canvas = canvas;
        this.coverCanvas = coverCanvas;
        this.syncWithCanvas = syncWithCanvas;
    }

    Start() {
        this.buttons = [];

        // Cover-canvas mode: position the overlay over the canvas.
        // _syncStyles() handles both fillWindow (position:fixed + z-index) and
        // normal-flow (position:absolute) cases automatically.
        if (this.coverCanvas) {
            this._syncStyles();
        }

        if (this.syncWithCanvas) {
            this.SetupFillWindowOverlay();
        }
    }

    SetupElements(elementsSelectors) {
        elementsSelectors.forEach(selector => {
            this.elements[selector] = document.querySelector(selector);
        });
    }

    SetupButtons(buttonsSelectorsAndCallbacks) {
        this.buttons = buttonsSelectorsAndCallbacks.map(button =>
            document.querySelector(button.selector)
        );

        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].addEventListener('click', buttonsSelectorsAndCallbacks[i].callback);
        }
    }

    SetContainerStyle(style) {
        this.container.setAttribute('style', style);
    }

    /**
     * Positions and scales the menu container to exactly overlay the canvas,
     * matching the CSS transform applied by `SetCanvasFillWindow`. Call this
     * after `Start()` when the game uses `fillWindow: true`.
     *
     * The container's z-index is set one above the canvas so it is always
     * visible, and it inherits the same `position`, `transform`, and
     * `transformOrigin`, so its content scales identically with the canvas.
     * The container itself is `pointer-events: none` so it never blocks canvas
     * input; add `pointer-events: auto` to specific child elements that need it.
     *
     * Re-syncing is hooked into `game.WindowResized()` so it stays correct
     * when the renderer recomputes the canvas scale on browser resize.
     */
    SetupFillWindowOverlay() {
        this._syncStyles();

        // Wrap game.WindowResized so we re-sync AFTER the renderer has already
        // updated the canvas CSS properties for the new window size.
        const _original = this.game.WindowResized.bind(this.game);
        this.game.WindowResized = () => {
            _original();
            this._syncStyles();
        };
    }

    /**
     * Copies the canvas CSS layout to the overlay container so it occupies
     * the same screen area. Branches on whether `fillWindow` is active:
     *
     * - **fillWindow active** (`canvas.style.position === 'fixed'`): mirrors
     *   `position`, `top`, `left`, `transform`, `transformOrigin`, and `z-index`
     *   so the overlay scales identically with the canvas.
     * - **Normal flow**: positions the overlay with `position:absolute` inside
     *   the (relatively-positioned) canvas container — no scaling applied.
     * @private
     */
    _syncStyles() {
        const cs = this.canvas.style;
        const s  = this.container.style;

        // Common properties regardless of mode
        s.width         = this.canvas.width  + 'px';
        s.height        = this.canvas.height + 'px';
        s.margin        = '0';
        s.padding       = '0';
        s.boxSizing     = 'border-box';
        s.pointerEvents = 'none';

        if (cs.position === 'fixed') {
            // fillWindow mode: canvas is fixed + CSS-transformed; match it exactly.
            s.position        = 'fixed';
            s.top             = cs.top             || '0';
            s.left            = cs.left            || '0';
            s.transform       = cs.transform       || 'none';
            s.transformOrigin = cs.transformOrigin || 'center';
            s.zIndex          = String((parseInt(cs.zIndex || '0') || 0) + 1);
        }
        else {
            // Normal flow: overlay sits absolutely inside the canvas container.
            this.canvasContainer.style.position = 'relative';
            s.position        = 'absolute';
            s.top             = '0';
            s.left            = '0';
            s.transform       = 'none';
            s.transformOrigin = '';
            s.zIndex          = '1';
        }
    }
}
