class HTMLMenu {
    /**
     * @param {Game}   game                     - The active game instance.
     * @param {string} menuContainerSelector    - CSS selector for the menu overlay div.
     * @param {string} canvasContainerSelector  - CSS selector for the div wrapping the canvas.
     * @param {HTMLCanvasElement} canvas        - The game canvas element.
     * @param {boolean} [coverCanvas=true]      - When true, positions the overlay directly
     *   above the canvas at the same size. Works in both `fillWindow` and normal-flow modes:
     *   uses `position:fixed` + z-index when the canvas is in fill-window mode, and
     *   `position:absolute` inside the canvas container otherwise.
     * @param {boolean} [syncWithCanvas=false]  - When true, keeps the overlay in sync with
     *   the canvas on every resize via `game.WindowResized`. When `fillWindow` is active
     *   the overlay matches the canvas's `position:fixed` + CSS transform so content scales
     *   identically. When `fillWindow` is not active it falls back to absolute positioning
     *   over the canvas. Safe to combine with `coverCanvas`.
     * @param {boolean} [clipToCanvasContainer=false] - When true and `fillWindow` is active,
     *   the canvas container is synced to the canvas transform and the menu overlay is placed
     *   as `position:absolute` inside that container. This lets `overflow:hidden` on the
     *   canvas container clip menu transitions while still matching canvas scale.
     */
    constructor(game, menuContainerSelector, canvasContainerSelector, canvas, coverCanvas = true, syncWithCanvas = false, clipToCanvasContainer = false) {
        this.game = game;

        this.container = document.querySelector(menuContainerSelector);
        this.canvasContainer = document.querySelector(canvasContainerSelector);

        this.elements = [];
        this.buttons = [];
        this.canvas = canvas;
        this.coverCanvas = coverCanvas;
        this.syncWithCanvas = syncWithCanvas;
        this.clipToCanvasContainer = clipToCanvasContainer;

        // Internal fixed clipping layer used when clipToCanvasContainer=true.
        this._clipLayer = null;
    }

    Start() {
        this.buttons = [];

        // Keep menu above canvas regardless of coverCanvas behavior.
        this._ensureAboveCanvas();

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

    /**
     * Ensures menu stacking order stays above the canvas even when
     * coverCanvas is disabled.
     * @private
     */
    _ensureAboveCanvas() {
        const computedCanvasStyle = getComputedStyle(this.canvas);
        const canvasZIndex = parseInt(this.canvas.style.zIndex || computedCanvasStyle.zIndex || '0') || 0;
        const canvasPosition = this.canvas.style.position || computedCanvasStyle.position;

        if ((getComputedStyle(this.container).position || 'static') === 'static') {
            this.container.style.position = 'relative';
        }

        // In fillWindow mode the canvas is fixed (out of document flow).
        // If a menu uses coverCanvas=false and keeps absolute positioning,
        // percentage sizing can resolve against a collapsed parent container.
        // Anchor such menus to the viewport so they remain visible.
        if (canvasPosition === 'fixed' && !this.coverCanvas && !this.syncWithCanvas) {
            this.container.style.position = 'fixed';
            if (!this.container.style.top) {
                this.container.style.top = '0';
            }
            if (!this.container.style.left) {
                this.container.style.left = '0';
            }
        }

        this.container.style.zIndex = String(canvasZIndex + 1);
    }

    SetupElements(elementsSelectors) {
        elementsSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            this.elements[selector] = element;
            this._enablePointerEvents(element);
        });
    }

    SetupButtons(buttonsSelectorsAndCallbacks) {
        this.buttons = buttonsSelectorsAndCallbacks.map(button => {
            const element = document.querySelector(button.selector);
            this._enablePointerEvents(element);
            return element;
        });

        for (let i = 0; i < this.buttons.length; i++) {
            if (this.buttons[i]) {
                this.buttons[i].addEventListener('click', buttonsSelectorsAndCallbacks[i].callback);
            }
        }
    }

    /**
     * Makes an element interactable when the menu container uses
     * `pointer-events: none` for canvas passthrough.
     * @param {HTMLElement|null} element
     * @private
     */
    _enablePointerEvents(element) {
        if (element) {
            element.style.pointerEvents = 'auto';
        }
    }

    SetContainerStyle(style) {
        // Apply only provided declarations so engine-managed layout styles
        // (position, transform, z-index, etc.) are not removed.
        if (!style) {
            return;
        }

        const declarations = style.split(';');
        for (let i = 0; i < declarations.length; i++) {
            const declaration = declarations[i].trim();
            if (!declaration) {
                continue;
            }

            const separatorIndex = declaration.indexOf(':');
            if (separatorIndex === -1) {
                continue;
            }

            const property = declaration.slice(0, separatorIndex).trim();
            const value = declaration.slice(separatorIndex + 1).trim();

            if (!property) {
                continue;
            }

            this.container.style.setProperty(property, value);
        }
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
        const ccs = getComputedStyle(this.canvas);
        const s  = this.container.style;

        const canvasPosition = cs.position || ccs.position;
        const canvasTop = cs.top || ccs.top || '0';
        const canvasLeft = cs.left || ccs.left || '0';
        const canvasTransform = cs.transform || ccs.transform || 'none';
        const canvasTransformOrigin = cs.transformOrigin || ccs.transformOrigin || 'center';
        const canvasZIndex = parseInt(cs.zIndex || ccs.zIndex || '0') || 0;

        // Common properties regardless of mode
        s.width         = this.canvas.width  + 'px';
        s.height        = this.canvas.height + 'px';
        s.margin        = '0';
        s.padding       = '0';
        s.boxSizing     = 'border-box';
        s.pointerEvents = 'none';

        if (canvasPosition === 'fixed') {
            if (this.clipToCanvasContainer) {
                // fillWindow + clipping mode: create a dedicated clipped overlay
                // layer and keep the menu container inside it. This clips menu
                // transitions (e.g. top/left slide-in) to the canvas bounds while
                // avoiding canvasContainer transform/pointer side effects.
                if (!this._clipLayer) {
                    this._clipLayer = document.createElement('div');
                    this._clipLayer.className = 'htmlmenu-clip-layer';

                    if (this.container.parentNode) {
                        this.container.parentNode.insertBefore(this._clipLayer, this.container);
                    }
                    this._clipLayer.appendChild(this.container);
                }

                const ls = this._clipLayer.style;
                ls.position        = 'fixed';
                ls.top             = canvasTop;
                ls.left            = canvasLeft;
                ls.width           = this.canvas.width  + 'px';
                ls.height          = this.canvas.height + 'px';
                ls.margin          = '0';
                ls.padding         = '0';
                ls.boxSizing       = 'border-box';
                ls.transform       = canvasTransform;
                ls.transformOrigin = canvasTransformOrigin;
                ls.zIndex          = String(canvasZIndex + 1);
                ls.overflow        = 'hidden';
                ls.pointerEvents   = 'none';

                s.position        = 'absolute';
                s.top             = s.top || '0';
                s.left            = s.left || '0';
                s.transform       = 'none';
                s.transformOrigin = '';
                s.zIndex          = '1';
                s.overflow        = '';
            }
            else {
                // fillWindow mode: canvas is fixed + CSS-transformed; match it exactly.
                s.position        = 'fixed';
                s.top             = canvasTop;
                s.left            = canvasLeft;
                s.transform       = canvasTransform;
                s.transformOrigin = canvasTransformOrigin;
                s.zIndex          = String(canvasZIndex + 1);
                s.overflow        = '';
            }
        }
        else {
            // Normal flow: overlay sits absolutely inside the canvas container.
            this.canvasContainer.style.position = 'relative';
            this.canvasContainer.style.width = this.canvas.width + 'px';
            this.canvasContainer.style.height = this.canvas.height + 'px';
            s.position        = 'absolute';
            s.top             = '0';
            s.left            = '0';
            s.transform       = 'none';
            s.transformOrigin = '';
            s.zIndex          = '1';
            s.overflow        = '';
        }
    }
}
