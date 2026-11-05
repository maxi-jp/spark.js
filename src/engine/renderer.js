/**
 * Base renderer class. The active instance is available as the global `renderer` and as
 * `this.renderer` inside any `Game` subclass. Use `Canvas2DRenderer` (default) or
 * `WebGLRenderer` (append `?webgl` to the URL). Both share the same API.
 */
class Renderer {
    _width = 640;
    _height = 480;
    _halfWidth = 0;
    _halfHeight = 0;
    _imageSmoothingEnabled = true;
    _fillScreen = false;
    _fillScreenMatchNativeResolution = true;
    _fillScreenUseDevicePixelRatio = false;
    _fillScreenPreserveAspectRatio = true;
    _originalCanvasState = null;

    constructor(canvas) {
        this.canvas = canvas;
        this._width = canvas.width;
        this._height = canvas.height;
        
        // Store original canvas state for restoration when toggling full screen
        this._originalCanvasState = {
            width: canvas.width,
            height: canvas.height,
            rendererWidth: this._width,
            rendererHeight: this._height,
            matchNativeResolution: true,
            useDevicePixelRatio: false,
            preserveAspectRatio: true,
            styleSet: false,
            style: {},
            body: {}
            // style: {
            //     position: canvas.style.position || '',
            //     top: canvas.style.top || '',
            //     left: canvas.style.left || '',
            //     margin: canvas.style.margin || '',
            //     padding: canvas.style.padding || '',
            //     zIndex: canvas.style.zIndex || '',
            //     width: canvas.style.width || '',
            //     height: canvas.style.height || '',
            //     transform: canvas.style.transform || '',
            //     transformOrigin: canvas.style.transformOrigin || ''
            // },
            // body: {
            //     margin: document.body.style.margin || '',
            //     padding: document.body.style.padding || '',
            //     overflow: document.body.style.overflow || ''
            // }
        };
    }

    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    get halfWidth() {
        return this._halfWidth;
    }
    get halfHeight() {
        return this._halfHeight;
    }
    get imageSmoothingEnabled() {
        return this._imageSmoothingEnabled;
    }
    get fillScreen() {
        return this._fillScreen;
    }
    get fillScreenMatchNativeResolution() {
        return this._fillScreenMatchNativeResolution;
    }
    get fillScreenUseDevicePixelRatio() {
        return this._fillScreenUseDevicePixelRatio;
    }
    get fillScreenPreserveAspectRatio() {
        return this._fillScreenPreserveAspectRatio;
    }

    set width(value) {
        this._width = value;
        this._halfWidth = value / 2;
        this.canvas.width = value;
        // Notify Input system about canvas resolution change
        if (typeof Input !== 'undefined' && Input.SetCanvasResolution) {
            Input.SetCanvasResolution(this._width, this._height);
        }
    }
    set height(value) {
        this._height = value;
        this._halfHeight = value / 2;
        this.canvas.height = value;
        // Notify Input system about canvas resolution change
        if (typeof Input !== 'undefined' && Input.SetCanvasResolution) {
            Input.SetCanvasResolution(this._width, this._height);
        }
    }
    set imageSmoothingEnabled(value) {
        this._imageSmoothingEnabled = value;
    }
    set fillScreen(value) {
        if (value)
            this.SetCanvasFillWindow(this._fillScreenMatchNativeResolution, this._fillScreenUseDevicePixelRatio, this._fillScreenPreserveAspectRatio);
        else
            this.RestoreCanvasOriginalSize();
    }
    set fillScreenMatchNativeResolution(value) {
        this._fillScreenMatchNativeResolution = value;
        if (this._fillScreen)
            this.SetCanvasFillWindow(this._fillScreenMatchNativeResolution, this._fillScreenUseDevicePixelRatio, this._fillScreenPreserveAspectRatio);
    }
    set fillScreenUseDevicePixelRatio(value) {
        this._fillScreenUseDevicePixelRatio = value;
        if (this._fillScreen)
            this.SetCanvasFillWindow(this._fillScreenMatchNativeResolution, this._fillScreenUseDevicePixelRatio, this._fillScreenPreserveAspectRatio);
    }
    set fillScreenPreserveAspectRatio(value) {
        this._fillScreenPreserveAspectRatio = value;
        if (this._fillScreen)
            this.SetCanvasFillWindow(this._fillScreenMatchNativeResolution, this._fillScreenUseDevicePixelRatio, this._fillScreenPreserveAspectRatio);
    }

    /** Clears the entire canvas. Called automatically each frame before `Draw()`. */
    Clear() {}

    /** Flushes any pending sprite batch. Overridden in WebGLRenderer. */
    FlushSpriteBatch() {}

    /** Flushes any pending colored-quad batch. Overridden in WebGLRenderer. */
    FlushRectBatch() {}

    /** Flushes any pending circle batch. Overridden in WebGLRenderer. */
    FlushCircleBatch() {}

    /** Flushes all pending batches (sprites, colored quads, circles). Overridden in WebGLRenderer. */
    FlushAllBatches() {}

    /** Number of `gl.drawArrays` calls issued in the current frame. Always 0 on Canvas2D. */
    get drawCallCount() { return 0; }

    // Draw primitives
    /**
     * Draws a line segment.
     * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
     * @param {Color} [color] @param {number} [lineWidth=1]
     */
    DrawLine(x1, y1, x2, y2, color=Color.black, lineWidth=1) {}
    /**
     * Draws a dashed line segment.
     * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
     * @param {Color} [color] @param {number} [lineWidth=1] @param {number[]} [dash=[5, 5]]
     */
    DrawDashedLine(x1, y1, x2, y2, color=Color.black, lineWidth=1, dash=[5, 5]) {}
    /**
     * Draws a closed polygon.
     * @param {{x:number,y:number}[]} points @param {Color} [strokeColor]
     * @param {number} [lineWidth=1] @param {boolean} [fill=false] @param {Color} [fillColor]
     */
    DrawPolygon(points, strokeColor=Color.black, lineWidth=1, fill=false, fillColor=Color.black) {}
    /**
     * Draws a rectangle centered on (x, y) with optional rotation.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {Color} [color] @param {boolean} [stroke=false] @param {number} [lineWidth=1]
     * @param {number} [rot=0] @param {{x:number,y:number}} [pivot]
     */
    DrawRectangle(x, y, w, h, color=Color.black, stroke=false, lineWidth=1, rot=0, pivot=coord) {}
    /**
     * Draws a stroked rectangle centered on (x, y) with optional rotation.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {Color} [color] @param {number} [lineWidth=1] @param {number} [rot=0] @param {{x:number,y:number}} [pivot]
     */
    DrawStrokeRectangle(x, y, w, h, color=Color.black, lineWidth=1, rot=0, pivot=coord) {}
    /**
     * Draws a filled rectangle centered on (x, y) with optional rotation.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {Color} [color] @param {number} [rot=0] @param {{x:number,y:number}} [pivot]
     */
    DrawFillRectangle(x, y, w, h, color=Color.black, rot=0, pivot=coord) {}
    /**
     * Draws a rectangle with top-left at (x, y). No rotation — fast path for UI and backgrounds.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {Color} [color] @param {boolean} [stroke=false] @param {number} [lineWidth=1]
     */
    DrawBasicRectangle(x, y, w, h, color=Color.black, stroke=false, lineWidth=1) {}
    /**
     * Draws a stroked rectangle with top-left at (x, y). No rotation.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {Color} [color] @param {number} [lineWidth=1]
     */
    DrawStrokeBasicRectangle(x, y, w, h, color=Color.black, lineWidth=1) {}
    /**
     * Draws a filled rectangle with top-left at (x, y). No rotation — fastest rectangle call.
     * @param {number} x @param {number} y @param {number} w @param {number} h @param {Color} [color]
     */
    DrawFillBasicRectangle(x, y, w, h, color=Color.black) {}
    /**
     * Draws a rounded rectangle centered on (x, y) with optional rotation.
     * Falls back to a standard rectangle in WebGL.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {number|number[]} [radius=4] - Corner radius in pixels.
     * @param {Color} [color] @param {boolean} [stroke=false] @param {number} [lineWidth=1]
     * @param {number} [rot=0] @param {{x:number,y:number}} [pivot]
     */
    DrawRoundRectangle(x, y, w, h, radius=4, color=Color.black, stroke=false, lineWidth=1, rot=0, pivot=coord) {}
    /**
     * Draws a stroked rounded rectangle centered on (x, y) with optional rotation.
     * Falls back to a standard stroked rectangle in WebGL.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {number|number[]} [radius=4] @param {Color} [color] @param {number} [lineWidth=1]
     * @param {number} [rot=0] @param {{x:number,y:number}} [pivot]
     */
    DrawStrokeRoundRectangle(x, y, w, h, radius=4, color=Color.black, lineWidth=1, rot=0, pivot=coord) {}
    /**
     * Draws a filled rounded rectangle centered on (x, y) with optional rotation.
     * Falls back to a standard filled rectangle in WebGL.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {number|number[]} [radius=4] @param {Color} [color]
     * @param {number} [rot=0] @param {{x:number,y:number}} [pivot]
     */
    DrawFillRoundRectangle(x, y, w, h, radius=4, color=Color.black, rot=0, pivot=coord) {}
    /**
     * Draws a rounded rectangle with top-left at (x, y). No rotation.
     * Falls back to a standard basic rectangle in WebGL.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {number|number[]} [radius=4] @param {Color} [color] @param {boolean} [stroke=false] @param {number} [lineWidth=1]
     */
    DrawBasicRoundRectangle(x, y, w, h, radius=4, color=Color.black, stroke=false, lineWidth=1) {}
    /**
     * Draws a stroked rounded rectangle with top-left at (x, y). No rotation.
     * Falls back to a standard stroked basic rectangle in WebGL.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {number|number[]} [radius=4] @param {Color} [color] @param {number} [lineWidth=1]
     */
    DrawStrokeBasicRoundRectangle(x, y, w, h, radius=4, color=Color.black, lineWidth=1) {}
    /**
     * Draws a filled rounded rectangle with top-left at (x, y). No rotation.
     * Falls back to a standard filled basic rectangle in WebGL.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {number|number[]} [radius=4] @param {Color} [color]
     */
    DrawFillBasicRoundRectangle(x, y, w, h, radius=4, color=Color.black) {}
    /**
     * Draws a circle.
     * @param {number} x @param {number} y @param {number} radius
     * @param {Color} [color] @param {boolean} [stroke=false] @param {number} [lineWidth=1]
     */
    DrawCircle(x, y, radius, color=Color.black, stroke=false, lineWidth=1) {}
    /**
     * Draws a filled circle.
     * @param {number} x @param {number} y @param {number} radius @param {Color} [color]
     */
    DrawFillCircle(x, y, radius, color=Color.black) {}
    /**
     * Draws a stroked circle.
     * @param {number} x @param {number} y @param {number} radius @param {Color} [color] @param {number} [lineWidth=1]
     */
    DrawStrokeCircle(x, y, radius, color=Color.black, lineWidth=1) {}
    /**
     * Draws an ellipse centered on (x, y) with optional rotation.
     * @param {number} x @param {number} y @param {number} radiusX @param {number} radiusY
     * @param {Color} [color] @param {boolean} [stroke=false] @param {number} [lineWidth=1] @param {number} [rot=0]
     */
    DrawEllipse(x, y, radiusX, radiusY, color=Color.black, stroke=false, lineWidth=1, rot=0) {}
    /**
     * Draws a filled ellipse centered on (x, y) with optional rotation.
     * @param {number} x @param {number} y @param {number} radiusX @param {number} radiusY
     * @param {Color} [color] @param {number} [rot=0]
     */
    DrawFillEllipse(x, y, radiusX, radiusY, color=Color.black, rot=0) {}
    /**
     * Draws a stroked ellipse centered on (x, y) with optional rotation.
     * @param {number} x @param {number} y @param {number} radiusX @param {number} radiusY
     * @param {Color} [color] @param {number} [lineWidth=1] @param {number} [rot=0]
     */
    DrawStrokeEllipse(x, y, radiusX, radiusY, color=Color.black, lineWidth=1, rot=0) {}
    /**
     * Draws a circular arc or filled sector (pie wedge / vision cone).
     * @param {number} x @param {number} y @param {number} radius
     * @param {number} startAngle - Start angle in radians.
     * @param {number} endAngle - End angle in radians.
     * @param {Color} [color] @param {boolean} [stroke=false] @param {number} [lineWidth=1]
     */
    DrawArc(x, y, radius, startAngle, endAngle, color=Color.black, stroke=false, lineWidth=1) {}
    /**
     * Draws a filled circular sector (pie wedge / vision cone) from (x, y) across [startAngle, endAngle].
     * @param {number} x @param {number} y @param {number} radius
     * @param {number} startAngle @param {number} endAngle @param {Color} [color]
     */
    DrawFillArc(x, y, radius, startAngle, endAngle, color=Color.black) {}
    /**
     * Draws a stroked circular arc along [startAngle, endAngle].
     * @param {number} x @param {number} y @param {number} radius
     * @param {number} startAngle @param {number} endAngle @param {Color} [color] @param {number} [lineWidth=1]
     */
    DrawStrokeArc(x, y, radius, startAngle, endAngle, color=Color.black, lineWidth=1) {}

    // Draw text
    /**
     * Draws text, optionally with a stroke outline.
     * @param {string} text @param {number} x @param {number} y @param {string} font - CSS font string, e.g. `"16px Arial"`.
     * @param {Color} [color] @param {string} [align="center"] - `"left"`, `"center"`, `"right"`.
     * @param {string} [baseline="alphabetic"] - `"top"`, `"middle"`, `"alphabetic"`, `"bottom"`.
     * @param {boolean} [stroke=false] @param {number} [lineWidth=1]
     */
    DrawText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic", stroke=false, lineWidth=1) {}
    /**
     * Draws filled text.
     * @param {string} text @param {number} x @param {number} y @param {string} font
     * @param {Color} [color] @param {string} [align="center"] @param {string} [baseline="alphabetic"]
     */
    DrawFillText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic") {}
    /**
     * Draws stroked (outline) text.
     * @param {string} text @param {number} x @param {number} y @param {string} font
     * @param {Color} [color] @param {string} [align="center"] @param {string} [baseline="alphabetic"]
     */
    DrawStrokeText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic") {}
    /**
     * Measures the pixel width of a text string rendered with the given CSS font.
     * @param {string} text @param {string} [font] - CSS font string, e.g. `"16px Arial"`.
     * @returns {number} Width in pixels.
     */
    MeasureText(text, font) { return 0; }

    // Draw sprites
    /**
     * Draws an image centered on (x, y) with scale, rotation, and alpha.
     * @param {HTMLImageElement} img @param {number} x @param {number} y
     * @param {number} scaleX @param {number} scaleY @param {number} [rot=0]
     * @param {{x:number,y:number}} [pivot] @param {number} [alpha=1.0]
     */
    DrawImage(img, x, y, scaleX, scaleY, rot=0, pivot=coord, alpha=1.0) {}
    /**
     * Draws an image with top-left at (x, y). No rotation — fastest image draw.
     * @param {HTMLImageElement} img @param {number} x @param {number} y
     * @param {number} [w] @param {number} [h] @param {number} [alpha=1.0]
     */
    DrawImageBasic(img, x, y, w=img.width, h=img.height, alpha=1.0) {}
    /**
     * Draws a cropped region of an image (e.g. one frame from a sprite sheet), centered on (x, y).
     * @param {HTMLImageElement} img @param {number} x @param {number} y
     * @param {number} sx - Source x in the sheet. @param {number} sy - Source y.
     * @param {number} sw - Source width. @param {number} sh - Source height.
     * @param {number} scaleX @param {number} scaleY @param {number} [rot=0]
     * @param {{x:number,y:number}} [pivot] @param {number} [alpha=1.0]
     */
    DrawImageSection(img, x, y, sx, sy, sw, sh, scaleX, scaleY, rot=0, pivot=coord, alpha=1.0) {}
    /**
     * Draws a cropped region of an image with top-left at (x, y). No rotation.
     * @param {HTMLImageElement} img @param {number} x @param {number} y
     * @param {number} sx @param {number} sy @param {number} sw @param {number} sh
     * @param {number} scaleX @param {number} scaleY @param {number} [alpha=1.0]
     */
    DrawImageSectionBasic(img, x, y, sx, sy, sw, sh, scaleX, scaleY, alpha=1.0) {}

    // other Draw methods
    /**
     * Fills a rectangle with a linear gradient.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {LinearGradient} gradient
     */
    DrawGradientRectangle(x, y, w, h, gradient) { }

    // Camera transform methods
    /**
     * Translates the draw context by the camera's offset. Call before drawing world objects.
     * @param {Camera} camera
     */
    ApplyCameraTransform(camera) {}
    /** Restores the draw context to screen space. Call after drawing world objects. */
    RestoreCameraTransform() {}

    // Other methods
    /**
     * Resizes the canvas.
     * @param {number} width @param {number} height
     */
    SetScreenSize(width, height) {
        this.width = width;
        this.height = height;
        // Notify Input system about canvas resolution change
        if (typeof Input !== 'undefined' && Input.SetCanvasResolution) {
            Input.SetCanvasResolution(width, height);
        }
    }

    /**
     * Enables fill-window mode. The canvas expands to fill the browser window.
     * A resize listener is attached to keep it in sync.
     * @param {boolean} [matchNativeResolution=true] - If true, canvas pixel size matches window size.
     * @param {boolean} [useDevicePixelRatio=false] - If true, scales for HiDPI/retina.
     * @param {boolean} [preserveAspectRatio=true] - If true, letterboxes; otherwise stretches.
     */
    SetCanvasFillWindow(matchNativeResolution=true, useDevicePixelRatio=false, preserveAspectRatio=true) {
        // Update instance variables with current parameters
        this._fillScreenMatchNativeResolution = matchNativeResolution;
        this._fillScreenUseDevicePixelRatio = useDevicePixelRatio;
        this._fillScreenPreserveAspectRatio = preserveAspectRatio;
        
        // Store current state before modifying (only if not already in fullscreen)
        if (!this._fillScreen && !this._originalCanvasState.styleSet) {
            this._originalCanvasState.styleSet = true;

            this._originalCanvasState.width = this.canvas.width;
            this._originalCanvasState.height = this.canvas.height;
            this._originalCanvasState.rendererWidth = this._width;
            this._originalCanvasState.rendererHeight = this._height;
            this._originalCanvasState.matchNativeResolution = matchNativeResolution;
            this._originalCanvasState.useDevicePixelRatio = useDevicePixelRatio;
            this._originalCanvasState.preserveAspectRatio = preserveAspectRatio;

            const style = this._originalCanvasState.style;
            style.position = canvas.style.position;
            style.top = canvas.style.top;
            style.left = canvas.style.left;
            style.margin = canvas.style.margin;
            style.padding = canvas.style.padding;
            style.zIndex = canvas.style.zIndex;
            style.width = canvas.style.width;
            style.height = canvas.style.height;
            style.transform = canvas.style.transform;
            style.transformOrigin = canvas.style.transformOrigin;

            const body = this._originalCanvasState.body;
            body.margin = document.body.style.margin;
            body.padding = document.body.style.padding;
            body.overflow = document.body.style.overflow;
        }
        
        this._fillScreen = true;

        // Set canvas style to fill window
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.margin = '0';
        this.canvas.style.padding = '0';
        this.canvas.style.zIndex = '1000';
        
        // Calculate canvas resolution
        const updateCanvasSize = () => {
            let canvasWidth = window.innerWidth;
            let canvasHeight = window.innerHeight;
            
            if (this._fillScreenUseDevicePixelRatio) {
                // Use device pixel ratio for high DPI displays
                const dpr = window.devicePixelRatio || 1;
                canvasWidth *= dpr;
                canvasHeight *= dpr;
            }
            
            if (this._fillScreenMatchNativeResolution) {
                // Set canvas native resolution (actual pixels) and update renderer dimensions
                this.width = canvasWidth;
                this.height = canvasHeight;
                this.canvas.style.width = '100vw';
                this.canvas.style.height = '100vh';
                this.canvas.style.transform = 'none';
            }
            else {
                this.width = this._originalCanvasState.width;
                this.height = this._originalCanvasState.height;

                if (this._fillScreenPreserveAspectRatio) {
                    // Maintain aspect ratio while fitting within window bounds
                    const canvasAspectRatio = this._width / this._height;
                    const windowAspectRatio = window.innerWidth / window.innerHeight;
                    
                    let scale;
                    
                    if (canvasAspectRatio > windowAspectRatio) {
                        // Canvas is wider: fit to window width
                        scale = window.innerWidth / this._width;
                    }
                    else {
                        // Canvas is taller: fit to window height  
                        scale = window.innerHeight / this._height;
                    }
                    
                    // Set canvas display size to original dimensions
                    this.canvas.style.width = this._width + 'px';
                    this.canvas.style.height = this._height + 'px';
                    
                    // Center the canvas and apply scaling
                    this.canvas.style.left = '50%';
                    this.canvas.style.top = '50%';
                    this.canvas.style.transformOrigin = 'center';
                    this.canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
                }
                else {
                    // Stretch to fit entire window (may distort aspect ratio)
                    this.canvas.style.width = '100vw';
                    this.canvas.style.height = '100vh';
                    this.canvas.style.transform = 'none';
                }
            }
            // When matchNativeResolution is false, keep existing canvas resolution
            // The CSS styling will handle stretching to fill the window
        };
        
        // Initial size setup
        updateCanvasSize();
        
        // Notify Input system about canvas transform changes
        if (typeof Input !== 'undefined' && Input.UpdateCanvasTransform) {
            Input.UpdateCanvasTransform();
        }
        
        // Store reference for cleanup
        if (!this._resizeHandler) {
            this._resizeHandler = () => {
                updateCanvasSize();

                // Notify the Game
                game?.WindowResized();

                // Notify Input system about canvas transform changes
                if (typeof Input !== 'undefined' && Input.UpdateCanvasTransform) {
                    Input.UpdateCanvasTransform();
                }
            };
        }
        
        // Add resize event listener
        window.addEventListener('resize', this._resizeHandler);
        
        // Set body style to remove margins/padding
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden';
    }

    /** Exits fill-window mode and restores the original canvas size and styles. */
    RestoreCanvasOriginalSize() {
        if (!this._fillScreen) {
            console.warn('Canvas is not in fullscreen mode');
            return;
        }

        // Remove resize event listener
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }

        // Restore canvas dimensions
        this.canvas.width = this._originalCanvasState.width;
        this.canvas.height = this._originalCanvasState.height;
        this._width = this._originalCanvasState.rendererWidth || this._originalCanvasState.width;
        this._height = this._originalCanvasState.rendererHeight || this._originalCanvasState.height;
        this._halfWidth = this._width / 2;
        this._halfHeight = this._height / 2;

        // Restore canvas styles
        const style = this._originalCanvasState.style;
        this.canvas.style.position = style.position || null;
        this.canvas.style.top = style.position || null;
        this.canvas.style.left = style.position || null;
        this.canvas.style.margin = style.position || null;
        this.canvas.style.padding = style.position || null;
        this.canvas.style.zIndex = style.position || null;
        this.canvas.style.width = style.position || null;
        this.canvas.style.height = style.position || null;
        this.canvas.style.transform = style.position || null;
        this.canvas.style.transformOrigin = style.position || null;

        // Restore body styles
        const body = this._originalCanvasState.body;
        document.body.style.margin = body.margin || null;
        document.body.style.padding = body.padding || null;
        document.body.style.overflow = body.overflow || null;

        // Update _fillScreen state
        this._fillScreen = false;

        // Notify Input system about canvas changes
        if (typeof Input !== 'undefined') {
            if (Input.SetCanvasResolution) {
                Input.SetCanvasResolution(this._width, this._height);
            }
            if (Input.UpdateCanvasTransform) {
                Input.UpdateCanvasTransform();
            }
        }

        // Notify the Game about the change
        game?.WindowResized();
    }
}

// #region Canvas2DRenderer class

class Canvas2DRenderer extends Renderer {
    constructor(canvas) {
        super(canvas);
        this.ctx = canvas.getContext("2d");
    }

    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }

    set width(value) {
        super.width = value;
        this.ctx.imageSmoothingEnabled = this._imageSmoothingEnabled;
    }
    set height(value) {
        super.height = value;
        this.ctx.imageSmoothingEnabled = this._imageSmoothingEnabled;
    }

    get imageSmoothingEnabled() {
        return this._imageSmoothingEnabled;
    }
    set imageSmoothingEnabled(value) {
        this._imageSmoothingEnabled = value;
        this.ctx.imageSmoothingEnabled = this._imageSmoothingEnabled;
    }

    Clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    DrawLine(x1, y1, x2, y2, color=Color.black, lineWidth=1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    DrawDashedLine(x1, y1, x2, y2, color=Color.black, lineWidth=1, dash=[5, 5]) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.setLineDash(dash);
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    DrawPolygon(points, strokeColor=Color.black, lineWidth=1, fill=false, fillColor=Color.black) {
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.closePath();
        if (fill) {
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
        }
        this.ctx.stroke();
    }

    DrawRectangle(x, y, w, h, color=Color.black, stroke=false, lineWidth=1, rot=0, pivot=coord) {
        if (stroke) {
            this.DrawStrokeRectangle(x, y, w, h, color, lineWidth, rot, pivot);
        }
        else {
            this.DrawFillRectangle(x, y, w, h, color, rot, pivot);
        }
    }
    
    DrawStrokeRectangle(x, y, w, h, color=Color.black, lineWidth=1, rot=0, pivot=coord) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        if (rot !== 0) {
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(rot);
            this.ctx.strokeRect(-w / 2 - pivot.x, -h / 2 - pivot.y, w, h);
            this.ctx.restore();
        }
        else {
            this.ctx.strokeRect(x - pivot.x - w / 2, y - pivot.y - h / 2, w, h);
        }
    }

    DrawFillRectangle(x, y, w, h, color=Color.black, rot=0, pivot=coord) {
        this.ctx.fillStyle = color;
        if (rot !== 0) {
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(rot);
            this.ctx.fillRect(-w / 2 - pivot.x, -h / 2 - pivot.y, w, h);
            this.ctx.restore();
        }
        else {
            this.ctx.fillRect(x - pivot.x - w / 2, y - pivot.y - h / 2, w, h);
        }
    }

    DrawBasicRectangle(x, y, w, h, color=Color.black, stroke=false, lineWidth=1) {
        if (stroke) {
            this.DrawStrokeBasicRectangle(x, y, w, h, color, lineWidth);
        }
        else {
            this.DrawFillBasicRectangle(x, y, w, h, color);
        }
    }

    DrawStrokeBasicRectangle(x, y, w, h, color=Color.black, lineWidth=1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(x, y, w, h);
    }

    DrawFillBasicRectangle(x, y, w, h, color=Color.black) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    }

    DrawRoundRectangle(x, y, w, h, radius=4, color=Color.black, stroke=false, lineWidth=1, rot=0, pivot=coord) {
        if (stroke) {
            this.DrawStrokeRoundRectangle(x, y, w, h, radius, color, lineWidth, rot, pivot);
        }
        else {
            this.DrawFillRoundRectangle(x, y, w, h, radius, color, rot, pivot);
        }
    }

    DrawStrokeRoundRectangle(x, y, w, h, radius=4, color=Color.black, lineWidth=1, rot=0, pivot=coord) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        if (rot !== 0) {
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(rot);
            this.ctx.roundRect(-w / 2 - pivot.x, -h / 2 - pivot.y, w, h, radius);
            this.ctx.stroke();
            this.ctx.restore();
        }
        else {
            this.ctx.roundRect(x - pivot.x - w / 2, y - pivot.y - h / 2, w, h, radius);
            this.ctx.stroke();
        }
    }

    DrawFillRoundRectangle(x, y, w, h, radius=4, color=Color.black, rot=0, pivot=coord) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        if (rot !== 0) {
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(rot);
            this.ctx.roundRect(-w / 2 - pivot.x, -h / 2 - pivot.y, w, h, radius);
            this.ctx.fill();
            this.ctx.restore();
        }
        else {
            this.ctx.roundRect(x - pivot.x - w / 2, y - pivot.y - h / 2, w, h, radius);
            this.ctx.fill();
        }
    }

    DrawBasicRoundRectangle(x, y, w, h, radius=4, color=Color.black, stroke=false, lineWidth=1) {
        if (stroke) {
            this.DrawStrokeBasicRoundRectangle(x, y, w, h, radius, color, lineWidth);
        }
        else {
            this.DrawFillBasicRoundRectangle(x, y, w, h, radius, color);
        }
    }

    DrawStrokeBasicRoundRectangle(x, y, w, h, radius=4, color=Color.black, lineWidth=1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, radius);
        this.ctx.stroke();
    }

    DrawFillBasicRoundRectangle(x, y, w, h, radius=4, color=Color.black) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, radius);
        this.ctx.fill();
    }
    
    DrawCircle(x, y, radius, color=Color.black, stroke=false, lineWidth=1) {
        if (stroke) {
            this.DrawStrokeCircle(x, y, radius, color, lineWidth);
        }
        else {
            this.DrawFillCircle(x, y, radius, color);
        }
    }

    DrawFillCircle(x, y, radius, color=Color.black) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, PI2, false);
        this.ctx.fill();
        this.ctx.closePath();
    }

    DrawStrokeCircle(x, y, radius, color=Color.black, lineWidth=1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, PI2, false);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    DrawEllipse(x, y, radiusX, radiusY, color=Color.black, stroke=false, lineWidth=1, rot=0) {
        if (stroke) {
            this.DrawStrokeEllipse(x, y, radiusX, radiusY, color, lineWidth, rot);
        }
        else {
            this.DrawFillEllipse(x, y, radiusX, radiusY, color, rot);
        }
    }

    DrawFillEllipse(x, y, radiusX, radiusY, color=Color.black, rot=0) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, radiusX, radiusY, rot, 0, PI2);
        this.ctx.fill();
        this.ctx.closePath();
    }

    DrawStrokeEllipse(x, y, radiusX, radiusY, color=Color.black, lineWidth=1, rot=0) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, radiusX, radiusY, rot, 0, PI2);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    DrawArc(x, y, radius, startAngle, endAngle, color=Color.black, stroke=false, lineWidth=1) {
        if (stroke) {
            this.DrawStrokeArc(x, y, radius, startAngle, endAngle, color, lineWidth);
        }
        else {
            this.DrawFillArc(x, y, radius, startAngle, endAngle, color);
        }
    }

    DrawFillArc(x, y, radius, startAngle, endAngle, color=Color.black) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.arc(x, y, radius, startAngle, endAngle, false);
        this.ctx.closePath();
        this.ctx.fill();
    }

    DrawStrokeArc(x, y, radius, startAngle, endAngle, color=Color.black, lineWidth=1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, startAngle, endAngle, false);
        this.ctx.stroke();
    }

    DrawText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic", stroke=false, lineWidth=1) {
        if (stroke) {
            this.DrawStrokeText(text, x, y, font, color, align, baseline, lineWidth);
        }
        else {
            this.DrawFillText(text, x, y, font, color, align, baseline);
        }
    }

    DrawFillText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic") {
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
    }

    DrawStrokeText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic", lineWidth=1) {
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeText(text, x, y);
    }

    MeasureText(text, font) {
        if (font) {
            this.ctx.font = font;
        }
        return this.ctx.measureText(text).width;
    }

    DrawImage(img, x, y, scaleX, scaleY, rot=0, pivot=coord, alpha=1.0) {
        this.ctx.globalAlpha = alpha;
        this.ctx.save();

        this.ctx.translate(x, y);
        this.ctx.rotate(rot);
        this.ctx.scale(scaleX, scaleY);

        this.ctx.drawImage(img, -img.halfWidth - pivot.x, -img.halfHeight - pivot.y);

        this.ctx.restore();
        this.ctx.globalAlpha = 1.0;
    }

    DrawImageBasic(img, x, y, w=img.width, h=img.height, alpha=1.0) {
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(img, x, y, w, h);
        this.ctx.globalAlpha = 1.0;
    }

    DrawImageSection(img, x, y, sx, sy, sw, sh, scaleX, scaleY, rot=0, pivot=coord, alpha=1.0) {
        this.ctx.save();
        
        this.ctx.translate(x, y);
        this.ctx.rotate(rot);
        this.ctx.scale(scaleX, scaleY);
        
        if (debugMode) {
            this.ctx.strokeStyle = "red";
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(-sw/2 - pivot.x, -sh/2 - pivot.y, sw, sh);
        }

        this.ctx.globalAlpha = alpha;

        this.ctx.drawImage(img, sx, sy, sw, sh, -sw/2 - pivot.x, -sh/2 - pivot.y, sw, sh);

        this.ctx.globalAlpha = 1.0;
        
        this.ctx.restore();
    }

    DrawImageSectionBasic(img, x, y, sx, sy, sw, sh, scaleX, scaleY, alpha=1.0) {
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(img, sx, sy, sw, sh, x, y, sw * scaleX, sh * scaleY);
        this.ctx.globalAlpha = 1.0;
    }

    DrawGradientRectangle(x, y, w, h, gradient) {
        gradient.UpdateSize(x, y, w, h);
        this.ctx.fillStyle = gradient.gradient;
        this.ctx.fillRect(x, y, w, h);
    }

    ApplyCameraTransform(camera) {
        this.ctx.save();

        this.ctx.translate(this._halfWidth, this._halfHeight);
        this.ctx.scale(camera.scale, camera.scale);
        this.ctx.rotate(camera.rotation);
        // Pixel snapping: round camera position to prevent tile seams
        this.ctx.translate(-Math.round(camera.x) - this._halfWidth, -Math.round(camera.y) - this._halfHeight);
    }

    RestoreCameraTransform() {
        this.ctx.restore();
    }
}

// #endregion

// #region WebGLRenderer class

class WebGLRenderer extends Renderer {
    constructor(canvas, gl) {
        super(canvas);
        this.gl = gl;

        this.viewMatrix = new Float32Array([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1  // -camera.x, -camera.y, 1
        ]);

        // auxiliar line vertices and buffer
        this.lineVertices = new Float32Array(4);
        this.lineBuffer = gl.createBuffer();

        // auxiliar polygon buffer
        this.polygonBuffer = gl.createBuffer();

        // auxiliar rectangle vertices
        this.auxRectVertices = [
            { x: -1, y: -1},
            { x:  1, y: -1},
            { x:  1, y:  1},
            { x: -1, y:  1}
        ];

        // auxiliar texcoord buffer for drawin a texture section (two triangles) (used in DrawImageSection)
        this.auxTexcoords = new Float32Array([
            0.0, 0,0,
            0.0, 0,0,
            0.0, 0,0,
            0.0, 0,0,
            0.0, 0,0,
            0.0, 0,0,
        ]);

        // auxiliar structure for circle vertices
        this.circleNumSegments = 64;
        this.circleVerts = new Float32Array(this.circleNumSegments * 2);
        this.circleBuffer = gl.createBuffer();

        // Pre-computed unit circle: [cos0, sin0, cos1, sin1, …] — computed once at startup
        this._unitCircle = new Float32Array(this.circleNumSegments * 2);
        for (let i = 0; i < this.circleNumSegments; i++) {
            const a = (i / this.circleNumSegments) * PI2;
            this._unitCircle[i * 2]     = Math.cos(a);
            this._unitCircle[i * 2 + 1] = Math.sin(a);
        }

        // Pre-allocated arc staging buffer — avoids a new Float32Array() per arc draw call
        this._arcVerts = new Float32Array((this.circleNumSegments + 2) * 2);

        // axuliar canvas for measure text
        this.textCanvas = document.createElement('canvas');
        this.textCanvasCtx = this.textCanvas.getContext('2d');

        // auxiliar texture for rendering text from the auxiliar canvas (very ineficient)
        this.textTexture = this.CreateTextTexture();
        this._textTexW = 0;
        this._textTexH = 0;

        // Text rasterisation cache — keyed on "text|font|color|stroke|lineWidth".
        // Maps to { texture, width, height }. LRU eviction: Map insertion order,
        // oldest entry deleted when size exceeds _textCacheMax.
        this._textCache    = new Map();
        this._textCacheMax = 128;

        // enable blending for pngs transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Shaders
        this.basicRectShader = new BasicRectShader(this.gl);
        this.spriteShader = new SpriteShader(this.gl);
        this.gradientRectShader = new GradientRectShader(this.gl);
        
        // Setup shaders to bind buffers and enable vertex attributes
        this.basicRectShader.Setup(this.gl);
        this.spriteShader.Setup(this.gl);
        this.gradientRectShader.Setup(this.gl);

        // Sprite batch shader and state
        this._spriteBatchShader = new SpriteBatchShader(this.gl);
        this._spriteBatchShader.Setup(this.gl);

        const _SPRITE_BATCH_MAX_VERTS = 8192 * 6;
        this._spriteBatchVerts    = new Float32Array(_SPRITE_BATCH_MAX_VERTS * 5);
        this._spriteBatchMaxVerts = _SPRITE_BATCH_MAX_VERTS;
        this._spriteBatchCount    = 0;
        this._spriteBatchTex      = null;
        this._spriteBatchBuf      = null;

        // Colored-quad batch state
        this._coloredQuadBatchShader = new ColoredQuadBatchShader(this.gl);
        this._coloredQuadBatchShader.Setup(this.gl);

        const _RECT_BATCH_MAX_VERTS = 8192 * 6;
        this._rectBatchVerts    = new Float32Array(_RECT_BATCH_MAX_VERTS * 6); // x,y,r,g,b,a
        this._rectBatchMaxVerts = _RECT_BATCH_MAX_VERTS;
        this._rectBatchCount    = 0;
        this._rectBatchBuf      = null;

        // Circle batch state (SDF quads — one bounding quad per filled circle)
        this._circleBatchShader = new CircleBatchShader(this.gl);
        this._circleBatchShader.Setup(this.gl);

        const _CIRCLE_BATCH_MAX_VERTS = 8192 * 6;
        this._circleBatchVerts    = new Float32Array(_CIRCLE_BATCH_MAX_VERTS * 8); // px,py,lx,ly,r,g,b,a
        this._circleBatchMaxVerts = _CIRCLE_BATCH_MAX_VERTS;
        this._circleBatchCount    = 0;
        this._circleBatchBuf      = null;

        // Draw-call counter — reset each frame in Clear(); gl.drawArrays is intercepted so
        // every draw (batched flush, primitive, text, etc.) increments it automatically.
        this._drawCallCount = 0;
        const _origDrawArrays = gl.drawArrays.bind(gl);
        gl.drawArrays = (...args) => {
            this._drawCallCount++;
            _origDrawArrays(...args);
        };

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0, 0, 0, 0); // TODO delete this after testing different pngs
    }

    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    get drawCallCount() {
        return this._drawCallCount;
    }

    set width(value) {
        super.width = value;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    set height(value) {
        super.height = value;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    GetTexture(img) {
        // helper function to create and cache textures from images
        if (!img._webglTexture) {
            const gl = this.gl;
            const tex = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, tex);
            //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); // bowsers may use premultiplied alpha when uploading pngs
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); // Do not assume the source is premultiplied
            gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); // Use the image's colorspace as is
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._imageSmoothingEnabled ? gl.LINEAR : gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this._imageSmoothingEnabled ? gl.LINEAR : gl.NEAREST);

            img._webglTexture = tex;
        }

        return img._webglTexture;
    }

    CreateTextTexture() {
        const gl = this.gl;

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.bindTexture(gl.TEXTURE_2D, null); // Unbind after setting params

        return texture;
    }

    PrepareText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic", stroke=false, lineWidth=1) {
        const textCanvas = this.textCanvas;
        const ctx = this.textCanvasCtx;

        ctx.font = font;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;

        // Measure text and resize canvas
        const metrics = ctx.measureText(text);
        const width = Math.ceil(metrics.width) + 8;

        // Extract font size in px from the font string
        let fontSize = 16; // fallback default
        const match = font.match(/(\d+)px/);
        if (match)
            fontSize = parseInt(match[1], 10);
        const height = Math.ceil(fontSize) + 8;

        textCanvas.width = width;
        textCanvas.height = height;

        // Redraw with correct size
        ctx.font = font;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        ctx.clearRect(0, 0, width, height);

        // Calculate draw position based on alignment
        let drawX = width / 2;
        let drawY = height / 2;
        let tx = x, ty = y;
        if (align === "left") {
            tx += drawX;
            drawX = 0;
        }
        if (align === "right") {
            tx -= drawX;
            drawX = width;
        }
        if (baseline === "top") {
            ty += drawY;
            drawY = 0;
        }
        if (baseline === "bottom") {
            ty -= drawY;
            drawY = height;
        }

        if (stroke) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.strokeText(text, drawX, drawY);
        }
        else {
            ctx.fillStyle = color;
            ctx.fillText(text, drawX, drawY);
        }

        return { width, height, x: tx, y: ty };
    }

    Clear() {
        this.FlushAllBatches();
        this._drawCallCount = 0;
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    DrawLine(x1, y1, x2, y2, color=Color.black, lineWidth=1) {
        this.FlushAllBatches();
        const gl = this.gl;

        // update buffer for the two points
        this.lineVertices.set([x1, y1, x2, y2]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.lineVertices, gl.STREAM_DRAW);
        
        // gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lineVertices);
        this.basicRectShader.UseForCustomBuffer(gl, this.lineBuffer);

        // // Set uniforms (no rotation/scale, just pass through)
        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, 0, 0, 0, 1, 1, 0, 0, color.rgba);

        // // Set line width (ignored on some platforms)
        gl.lineWidth(lineWidth);

        // // Draw the line
        gl.drawArrays(gl.LINES, 0, 2);
    }

    DrawDashedLine(x1, y1, x2, y2, color=Color.black, lineWidth=1, dash=[5, 5]) {
        this.FlushAllBatches();
        if (!dash || dash.length === 0) {
            this.DrawLine(x1, y1, x2, y2, color, lineWidth);
            return;
        }

        const dx = x2 - x1;
        const dy = y2 - y1;
        const totalDist = Math.hypot(dx, dy);
        if (totalDist === 0) return;

        const ux = dx / totalDist;
        const uy = dy / totalDist;

        const coords = [];
        let dist = 0;
        let stepIdx = 0;
        let drawSegment = true;

        while (dist < totalDist) {
            const stepLen = Math.max(0.5, dash[stepIdx % dash.length]);
            const nextDist = Math.min(dist + stepLen, totalDist);
            if (drawSegment) {
                coords.push(
                    x1 + ux * dist,     y1 + uy * dist,
                    x1 + ux * nextDist, y1 + uy * nextDist
                );
            }
            dist = nextDist;
            stepIdx++;
            drawSegment = !drawSegment;
        }

        if (coords.length === 0)
            return;

        const gl = this.gl;
        const vertices = new Float32Array(coords);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.polygonBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);

        this.basicRectShader.UseForCustomBuffer(gl, this.polygonBuffer);
        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, 0, 0, 0, 1, 1, 0, 0, color.rgba);
        gl.lineWidth(lineWidth);
        gl.drawArrays(gl.LINES, 0, coords.length / 2);
    }

    DrawPolygon(points, strokeColor=Color.black, lineWidth=1, fill=false, fillColor=Color.black) {
        this.FlushAllBatches();
        // for (let i = 0; i < points.length; i++) {
        //     const p1 = points[i];
        //     const p2 = points[(i + 1) % points.length];
        //     this.DrawLine(p1.x, p1.y, p2.x, p2.y, strokeColor, lineWidth);
        // }

        const gl = this.gl;

        // Convert points to a flat Float32Array
        const vertices = new Float32Array(points.flatMap(p => [p.x, p.y]));

        gl.bindBuffer(gl.ARRAY_BUFFER, this.polygonBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);

        this.basicRectShader.UseForCustomBuffer(gl, this.polygonBuffer);

        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, 0, 0, 0, 1, 1, 0, 0, strokeColor.rgba);

        // Fill polygon if requested
        if (fill && points.length >= 3) {
            gl.uniform4fv(this.basicRectShader.colorLoc, fillColor.rgba);
            gl.drawArrays(gl.TRIANGLE_FAN, 0, points.length);
        }

        // Draw stroke
        if (points.length >= 2) {
            gl.uniform4fv(this.basicRectShader.colorLoc, strokeColor.rgba);
            gl.lineWidth(lineWidth);
            gl.drawArrays(gl.LINE_LOOP, 0, points.length);
        }
    }

    DrawRectangle(x, y, w, h, color, stroke=false, lineWidth=1, rot=0, pivot=coord) {
        if (stroke) {
            this.DrawStrokeRectangle(x, y, w, h, color, lineWidth, rot, pivot);
        }
        else {
            this.DrawFillRectangle(x, y, w, h, color, rot, pivot);
        }
    }

    DrawStrokeRectangle(x, y, w, h, color, lineWidth=1, rot=0, pivot=coord) {
        this.FlushAllBatches();
        const gl = this.gl;

        this.basicRectShader.UseForCustomBuffer(gl, this.basicRectShader.outlineBuffer);

        // Set uniforms
        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, x, y, rot, w, h, pivot.x, pivot.y, color.rgba);

        // Set line width (may be ignored on some platforms)
        gl.lineWidth(lineWidth);

        // Draw the outline (5 points, LINE_STRIP)
        gl.drawArrays(gl.LINE_STRIP, 0, 5);
    }

    DrawFillRectangle(x, y, w, h, color, rot=0, pivot=coord) {
        const hw   = w / 2;
        const hh   = h / 2;
        const pivX = pivot.x;
        const pivY = pivot.y;

        const lx0 = -hw - pivX; const ly0 = -hh - pivY;
        const lx1 =  hw - pivX; const ly1 = -hh - pivY;
        const lx2 = -hw - pivX; const ly2 =  hh - pivY;
        const lx3 =  hw - pivX; const ly3 =  hh - pivY;

        let x0, y0, x1, y1, x2, y2, x3, y3;
        if (rot !== 0) {
            const cos = Math.cos(rot);
            const sin = Math.sin(rot);
            x0 = x + lx0*cos - ly0*sin;  y0 = y + lx0*sin + ly0*cos;
            x1 = x + lx1*cos - ly1*sin;  y1 = y + lx1*sin + ly1*cos;
            x2 = x + lx2*cos - ly2*sin;  y2 = y + lx2*sin + ly2*cos;
            x3 = x + lx3*cos - ly3*sin;  y3 = y + lx3*sin + ly3*cos;
        } else {
            x0 = x + lx0; y0 = y + ly0;
            x1 = x + lx1; y1 = y + ly1;
            x2 = x + lx2; y2 = y + ly2;
            x3 = x + lx3; y3 = y + ly3;
        }

        const c = color.rgba;
        this._pushColoredQuad(x0, y0, x1, y1, x2, y2, x3, y3, c[0], c[1], c[2], c[3]);
    }

    DrawBasicRectangle(x, y, w, h, color=Color.black, stroke=false, lineWidth=1) {
        if (stroke) {
            this.DrawStrokeBasicRectangle(x, y, w, h, color, lineWidth);
        }
        else {
            this.DrawFillBasicRectangle(x, y, w, h, color);
        }
    }

    DrawStrokeBasicRectangle(x, y, w, h, color=Color.black, lineWidth=1) {
        this.FlushAllBatches();
        const gl = this.gl;

        this.basicRectShader.UseForCustomBuffer(gl, this.basicRectShader.outlineBuffer);

        // Set uniforms
        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, x, y, 0, w, h, -w/2, -h/2, color.rgba);

        // Set line width (may be ignored on some platforms)
        gl.lineWidth(lineWidth);

        // Draw the outline (5 points, LINE_STRIP)
        gl.drawArrays(gl.LINE_STRIP, 0, 5);
    }

    DrawFillBasicRectangle(x, y, w, h, color=Color.black) {
        const x1 = x + w;
        const y1 = y + h;
        const c  = color.rgba;
        this._pushColoredQuad(x, y, x1, y, x, y1, x1, y1, c[0], c[1], c[2], c[3]);
    }

    DrawRoundRectangle(x, y, w, h, radius=4, color=Color.black, stroke=false, lineWidth=1, rot=0, pivot=coord) {
        this.DrawRectangle(x, y, w, h, color, stroke, lineWidth, rot, pivot);
    }

    DrawStrokeRoundRectangle(x, y, w, h, radius=4, color=Color.black, lineWidth=1, rot=0, pivot=coord) {
        this.DrawStrokeRectangle(x, y, w, h, color, lineWidth, rot, pivot);
    }

    DrawFillRoundRectangle(x, y, w, h, radius=4, color=Color.black, rot=0, pivot=coord) {
        this.DrawFillRectangle(x, y, w, h, color, rot, pivot);
    }

    DrawBasicRoundRectangle(x, y, w, h, radius=4, color=Color.black, stroke=false, lineWidth=1) {
        this.DrawBasicRectangle(x, y, w, h, color, stroke, lineWidth);
    }

    DrawStrokeBasicRoundRectangle(x, y, w, h, radius=4, color=Color.black, lineWidth=1) {
        this.DrawStrokeBasicRectangle(x, y, w, h, color, lineWidth);
    }

    DrawFillBasicRoundRectangle(x, y, w, h, radius=4, color=Color.black) {
        this.DrawFillBasicRectangle(x, y, w, h, color);
    }
    
    DrawCircle(x, y, radius, color=Color.black, stroke=false, lineWidth=1) {
        if (stroke) {
            this.DrawStrokeCircle(x, y, radius, color, lineWidth);
        }
        else {
            this.DrawFillCircle(x, y, radius, color);
        }
    }

    DrawFillCircle(x, y, radius, color=Color.black) {
        const c = color.rgba;
        this._pushCircleQuad(x, y, radius, c[0], c[1], c[2], c[3]);
    }

    DrawStrokeCircle(x, y, radius, color=Color.black, lineWidth=1) {
        this.FlushAllBatches();
        const gl   = this.gl;
        const unit = this._unitCircle;
        for (let i = 0; i < this.circleNumSegments; i++) {
            this.circleVerts[i * 2]     = x + unit[i * 2]     * radius;
            this.circleVerts[i * 2 + 1] = y + unit[i * 2 + 1] * radius;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.circleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.circleVerts, gl.STREAM_DRAW);

        // Use the shader with this custom buffer
        this.basicRectShader.UseForCustomBuffer(gl, this.circleBuffer);

        // Set uniforms
        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, 0, 0, 0, 1, 1, 0, 0, color.rgba);

        gl.lineWidth(lineWidth); // May be ignored on most platforms
        gl.drawArrays(gl.LINE_STRIP, 0, this.circleNumSegments);
    }

    DrawEllipse(x, y, radiusX, radiusY, color=Color.black, stroke=false, lineWidth=1, rot=0) {
        if (stroke) {
            this.DrawStrokeEllipse(x, y, radiusX, radiusY, color, lineWidth, rot);
        }
        else {
            this.DrawFillEllipse(x, y, radiusX, radiusY, color, rot);
        }
    }

    DrawFillEllipse(x, y, radiusX, radiusY, color=Color.black, rot=0) {
        this.FlushAllBatches();
        const gl   = this.gl;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const unit = this._unitCircle;
        for (let s = 0; s < this.circleNumSegments; s++) {
            const lx = unit[s * 2]     * radiusX;
            const ly = unit[s * 2 + 1] * radiusY;
            this.circleVerts[s * 2]     = x + (lx * cosR - ly * sinR);
            this.circleVerts[s * 2 + 1] = y + (lx * sinR + ly * cosR);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.circleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.circleVerts, gl.STREAM_DRAW);

        this.basicRectShader.UseForCustomBuffer(gl, this.circleBuffer);
        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, 0, 0, 0, 1, 1, 0, 0, color.rgba);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.circleNumSegments);
    }

    DrawStrokeEllipse(x, y, radiusX, radiusY, color=Color.black, lineWidth=1, rot=0) {
        this.FlushAllBatches();
        const gl   = this.gl;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const unit = this._unitCircle;
        for (let s = 0; s < this.circleNumSegments; s++) {
            const lx = unit[s * 2]     * radiusX;
            const ly = unit[s * 2 + 1] * radiusY;
            this.circleVerts[s * 2]     = x + (lx * cosR - ly * sinR);
            this.circleVerts[s * 2 + 1] = y + (lx * sinR + ly * cosR);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.circleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.circleVerts, gl.STREAM_DRAW);

        this.basicRectShader.UseForCustomBuffer(gl, this.circleBuffer);
        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, 0, 0, 0, 1, 1, 0, 0, color.rgba);

        gl.lineWidth(lineWidth);
        gl.drawArrays(gl.LINE_LOOP, 0, this.circleNumSegments);
    }

    DrawArc(x, y, radius, startAngle, endAngle, color=Color.black, stroke=false, lineWidth=1) {
        if (stroke) {
            this.DrawStrokeArc(x, y, radius, startAngle, endAngle, color, lineWidth);
        }
        else {
            this.DrawFillArc(x, y, radius, startAngle, endAngle, color);
        }
    }

    DrawFillArc(x, y, radius, startAngle, endAngle, color=Color.black) {
        this.FlushAllBatches();
        let sweep = endAngle - startAngle;
        if (sweep >= PI2) {
            sweep = PI2;
        }
        else if (sweep < 0) {
            sweep = (sweep % PI2) + PI2;
        }

        if (sweep === 0)
            return;

        const steps    = Math.max(8, Math.ceil((sweep / PI2) * this.circleNumSegments));
        const vertices = this._arcVerts;
        vertices[0] = x;
        vertices[1] = y;
        for (let s = 0; s <= steps; s++) {
            const angle = startAngle + (s / steps) * sweep;
            vertices[(s + 1) * 2]     = x + Math.cos(angle) * radius;
            vertices[(s + 1) * 2 + 1] = y + Math.sin(angle) * radius;
        }

        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.polygonBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices.subarray(0, (steps + 2) * 2), gl.STREAM_DRAW);

        this.basicRectShader.UseForCustomBuffer(gl, this.polygonBuffer);
        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, 0, 0, 0, 1, 1, 0, 0, color.rgba);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, steps + 2);
    }

    DrawStrokeArc(x, y, radius, startAngle, endAngle, color=Color.black, lineWidth=1) {
        this.FlushAllBatches();
        let sweep = endAngle - startAngle;
        if (sweep >= PI2) {
            sweep = PI2;
        }
        else if (sweep < 0) {
            sweep = (sweep % PI2) + PI2;
        }

        if (sweep === 0)
            return;

        const steps    = Math.max(8, Math.ceil((sweep / PI2) * this.circleNumSegments));
        const vertices = this._arcVerts;
        for (let s = 0; s <= steps; s++) {
            const angle = startAngle + (s / steps) * sweep;
            vertices[s * 2]     = x + Math.cos(angle) * radius;
            vertices[s * 2 + 1] = y + Math.sin(angle) * radius;
        }

        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.polygonBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices.subarray(0, (steps + 1) * 2), gl.STREAM_DRAW);

        this.basicRectShader.UseForCustomBuffer(gl, this.polygonBuffer);
        this.basicRectShader.SetUniforms(gl, this.canvas.width, this.canvas.height, 0, 0, 0, 1, 1, 0, 0, color.rgba);

        gl.lineWidth(lineWidth);
        gl.drawArrays(gl.LINE_STRIP, 0, steps + 1);
    }

    DrawText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic", stroke=false, lineWidth=1) {
        if (this._spriteBatchCount > 0)
            this.FlushSpriteBatch();
        if (this._rectBatchCount   > 0)
            this.FlushRectBatch();
        if (this._circleBatchCount > 0)
            this.FlushCircleBatch();

        const key = `${text}|${font}|${color}|${stroke}|${lineWidth}`;
        let entry = this._textCache.get(key);

        if (!entry) {
            // Cache miss — rasterise to the shared 2D canvas and upload to a new texture.
            const { width, height } = this.PrepareText(text, x, y, font, color, align, baseline, stroke, lineWidth);
            const gl  = this.gl;
            const tex = this.CreateTextTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.textCanvas);

            entry = { texture: tex, width, height };

            // LRU eviction: remove the oldest entry when at capacity.
            if (this._textCache.size >= this._textCacheMax) {
                console.warn(`[WebGLRenderer] Text cache full (${this._textCacheMax} entries). Evicting LRU entry. Consider using the LabelText class for text objects, reducing unique text strings or increasing _textCacheMax.`);
                const oldestKey = this._textCache.keys().next().value;
                this.gl.deleteTexture(this._textCache.get(oldestKey).texture);
                this._textCache.delete(oldestKey);
            }
            this._textCache.set(key, entry);
        }
        else {
            // Cache hit — bump to end of Map for LRU ordering.
            this._textCache.delete(key);
            this._textCache.set(key, entry);
        }

        // Compute draw centre from position + cached size + alignment.
        let tx = x, ty = y;
        const hw = entry.width  / 2;
        const hh = entry.height / 2;
        if      (align    === "left")   tx += hw;
        else if (align    === "right")  tx -= hw;
        if      (baseline === "top")    ty += hh;
        else if (baseline === "bottom") ty -= hh;

        const gl = this.gl;
        this.spriteShader.Use(gl);
        this.spriteShader.SetUniforms(gl, this.canvas.width, this.canvas.height, tx, ty, 0, entry.width, entry.height, 0, 0, 1.0);
        this.spriteShader.BindTexture(gl, entry.texture);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    DrawFillText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic") {
        this.DrawText(text, x, y, font, color, align, baseline, false);
    }

    DrawStrokeText(text, x, y, font, color=Color.black, align="center", baseline="alphabetic", lineWidth=1) {
        this.DrawText(text, x, y, font, color, align, baseline, true, lineWidth);
    }

    MeasureText(text, font) {
        if (font) {
            this.textCanvasCtx.font = font;
        }
        return this.textCanvasCtx.measureText(text).width;
    }

    // Each TextLabel owns a unique WebGL texture, so batching across labels is not possible
    // without a glyph atlas. Uses the static-buffer spriteShader path (no bufferData per call)
    // and only flushes pending batches when they actually have queued geometry.
    DrawTextCached(texture, x, y, width, height) {
        if (this._spriteBatchCount > 0) this.FlushSpriteBatch();
        if (this._rectBatchCount   > 0) this.FlushRectBatch();
        if (this._circleBatchCount > 0) this.FlushCircleBatch();

        const gl = this.gl;
        this.spriteShader.Use(gl);
        this.spriteShader.SetUniforms(gl, this.canvas.width, this.canvas.height, x, y, 0, width, height, 0, 0, 1.0);
        this.spriteShader.BindTexture(gl, texture);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    DrawImage(img, x, y, scaleX, scaleY, rot=0, pivot=coord, alpha=1.0) {
        const w    = img.width  * scaleX;
        const h    = img.height * scaleY;
        const pivX = pivot.x * scaleX;
        const pivY = pivot.y * scaleY;
        const hw = w / 2;
        const hh = h / 2;

        const lx0 = -hw - pivX; const ly0 = -hh - pivY;
        const lx1 =  hw - pivX; const ly1 = -hh - pivY;
        const lx2 = -hw - pivX; const ly2 =  hh - pivY;
        const lx3 =  hw - pivX; const ly3 =  hh - pivY;

        let x0, y0, x1, y1, x2, y2, x3, y3;
        if (rot !== 0) {
            const cos = Math.cos(rot);
            const sin = Math.sin(rot);
            x0 = x + lx0*cos - ly0*sin;  y0 = y + lx0*sin + ly0*cos;
            x1 = x + lx1*cos - ly1*sin;  y1 = y + lx1*sin + ly1*cos;
            x2 = x + lx2*cos - ly2*sin;  y2 = y + lx2*sin + ly2*cos;
            x3 = x + lx3*cos - ly3*sin;  y3 = y + lx3*sin + ly3*cos;
        } else {
            x0 = x + lx0; y0 = y + ly0;
            x1 = x + lx1; y1 = y + ly1;
            x2 = x + lx2; y2 = y + ly2;
            x3 = x + lx3; y3 = y + ly3;
        }

        this._pushSpriteQuad(img, x0, y0, x1, y1, x2, y2, x3, y3, 0, 0, 1, 1, alpha);
    }

    DrawImageBasic(img, x, y, w=img.width, h=img.height, alpha=1.0) {
        const x1 = x + w;
        const y1 = y + h;
        this._pushSpriteQuad(img, x, y, x1, y, x, y1, x1, y1, 0, 0, 1, 1, alpha);
    }

    DrawImageSection(img, x, y, sx, sy, sw, sh, scaleX, scaleY, rot=0, pivot=coord, alpha=1.0) {
        const w    = sw * scaleX;
        const h    = sh * scaleY;
        const pivX = pivot.x * scaleX;
        const pivY = pivot.y * scaleY;
        const hw = w / 2;
        const hh = h / 2;

        const lx0 = -hw - pivX; const ly0 = -hh - pivY;
        const lx1 =  hw - pivX; const ly1 = -hh - pivY;
        const lx2 = -hw - pivX; const ly2 =  hh - pivY;
        const lx3 =  hw - pivX; const ly3 =  hh - pivY;

        let x0, y0, x1, y1, x2, y2, x3, y3;
        if (rot !== 0) {
            const cos = Math.cos(rot);
            const sin = Math.sin(rot);
            x0 = x + lx0*cos - ly0*sin;  y0 = y + lx0*sin + ly0*cos;
            x1 = x + lx1*cos - ly1*sin;  y1 = y + lx1*sin + ly1*cos;
            x2 = x + lx2*cos - ly2*sin;  y2 = y + lx2*sin + ly2*cos;
            x3 = x + lx3*cos - ly3*sin;  y3 = y + lx3*sin + ly3*cos;
        } else {
            x0 = x + lx0; y0 = y + ly0;
            x1 = x + lx1; y1 = y + ly1;
            x2 = x + lx2; y2 = y + ly2;
            x3 = x + lx3; y3 = y + ly3;
        }

        const u0 = sx / img.width;
        const v0 = sy / img.height;
        const u1 = (sx + sw) / img.width;
        const v1 = (sy + sh) / img.height;

        this._pushSpriteQuad(img, x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1, alpha);
    }

    DrawImageSectionBasic(img, x, y, sx, sy, sw, sh, scaleX, scaleY, alpha=1.0) {
        const w  = sw * scaleX;
        const h  = sh * scaleY;
        const x1 = x + w;
        const y1 = y + h;
        const u0 = sx / img.width;
        const v0 = sy / img.height;
        const u1 = (sx + sw) / img.width;
        const v1 = (sy + sh) / img.height;
        this._pushSpriteQuad(img, x, y, x1, y, x, y1, x1, y1, u0, v0, u1, v1, alpha);
    }

    /**
     * Draw multiple sprites from the same texture in a single batched call.
     * @param {HTMLImageElement} img - The shared texture atlas
     * @param {Float32Array} vertices - Interleaved vertex data: [x, y, u, v, x, y, u, v, ...]
     * @param {number} count - Number of vertices (must be multiple of 6 for triangles)
     * @param {number} alpha - Global alpha for all sprites
     */
    DrawBatchedSprites(img, vertices, count, alpha = 1.0) {
        this.FlushAllBatches();
        if (count === 0)
            return;
        
        const gl = this.gl;
        const shader = this.spriteShader;
        
        shader.Use(gl);
        
        // Create batch buffer on first use
        if (!this._batchBuffer) {
            this._batchBuffer = gl.createBuffer();
        }
        
        // Upload interleaved vertex data (position + texcoord)
        gl.bindBuffer(gl.ARRAY_BUFFER, this._batchBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        
        // Setup vertex attributes (interleaved: x, y, u, v per vertex)
        const stride = 4 * 4; // 4 floats per vertex
        gl.vertexAttribPointer(shader.texPositionLoc, 2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(shader.texTexcoordLoc, 2, gl.FLOAT, false, stride, 2 * 4);
        
        // Set uniforms for identity transform (vertices are already in world space)
        gl.uniform2f(shader.texResolutionLoc, this.canvas.width, this.canvas.height);
        gl.uniform2f(shader.texTranslationLoc, 0, 0);
        gl.uniform1f(shader.texRotationLoc, 0);
        gl.uniform2f(shader.texSizeLoc, 1, 1);
        gl.uniform2f(shader.pivotLoc, 0, 0);
        gl.uniform1f(shader.texAlphaLoc, alpha);
        gl.uniformMatrix3fv(shader.viewMatrixLoc, false, this.viewMatrix);
        
        // Bind texture
        shader.BindTexture(gl, this.GetTexture(img));
        
        // Single draw call for all sprites in the batch
        gl.drawArrays(gl.TRIANGLES, 0, count);
        
        // Restore default buffers for non-batched draws
        gl.bindBuffer(gl.ARRAY_BUFFER, shader.texBuffer);
        gl.vertexAttribPointer(shader.texPositionLoc, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, shader.texcoordBuffer);
        gl.vertexAttribPointer(shader.texTexcoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
    
    DrawGradientRectangle(x, y, w, h, gradient) {
        this.FlushAllBatches();
        // TODO this would be far more optimal if instead of using a texture, it'll use vertex color
        gradient.UpdateSize(x, y, w, h);
        
        const gl = this.gl;
        const shader = this.gradientRectShader;

        shader.Use(gl);
        
        gl.uniform2f(shader.resolutionLoc, this.canvas.width, this.canvas.height);
        gl.uniform2f(shader.translationLoc, x + w/2, y + h/2);
        gl.uniform1f(shader.rotationLoc, 0);
        gl.uniform2f(shader.sizeLoc, w, h);

        // Pass gradient start and end points
        gl.uniform2f(shader.gradientStartLoc, gradient.gradientStart.x, gradient.gradientStart.y);
        gl.uniform2f(shader.gradientEndLoc, gradient.gradientEnd.x, gradient.gradientEnd.y);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, gradient.webglTexture);
        gl.uniform1i(shader.gradientLoc, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /** Flush any pending sprite batch to the GPU. Call before switching shaders or cameras. */
    FlushSpriteBatch() {
        if (this._spriteBatchCount === 0)
            return;

        const gl         = this.gl;
        const shader     = this._spriteBatchShader;
        const floatCount = this._spriteBatchCount * 5;

        if (!this._spriteBatchBuf)
            this._spriteBatchBuf = gl.createBuffer();

        gl.useProgram(shader.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._spriteBatchBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this._spriteBatchVerts.subarray(0, floatCount), gl.STREAM_DRAW);

        const stride = 5 * 4;
        gl.enableVertexAttribArray(shader.alphaLoc);
        gl.vertexAttribPointer(shader.positionLoc, 2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(shader.texcoordLoc, 2, gl.FLOAT, false, stride, 2 * 4);
        gl.vertexAttribPointer(shader.alphaLoc,    1, gl.FLOAT, false, stride, 4 * 4);

        gl.uniform2f(shader.resolutionLoc, this.canvas.width, this.canvas.height);
        gl.uniformMatrix3fv(shader.viewMatrixLoc, false, this.viewMatrix);
        shader.BindTexture(gl, this._spriteBatchTex);

        gl.drawArrays(gl.TRIANGLES, 0, this._spriteBatchCount);
        gl.disableVertexAttribArray(shader.alphaLoc);

        this._spriteBatchCount = 0;
        this._spriteBatchTex   = null;
    }

    /** Flush any pending colored-quad batch to the GPU. */
    FlushRectBatch() {
        if (this._rectBatchCount === 0) return;

        const gl     = this.gl;
        const shader = this._coloredQuadBatchShader;
        const floatCount = this._rectBatchCount * 6;

        if (!this._rectBatchBuf) {
            this._rectBatchBuf = gl.createBuffer();
        }

        gl.useProgram(shader.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._rectBatchBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this._rectBatchVerts.subarray(0, floatCount), gl.STREAM_DRAW);

        const stride = 6 * 4;
        gl.vertexAttribPointer(shader.positionLoc, 2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(shader.colorLoc,    4, gl.FLOAT, false, stride, 2 * 4);

        gl.uniform2f(shader.resolutionLoc, this.canvas.width, this.canvas.height);
        gl.uniformMatrix3fv(shader.viewMatrixLoc, false, this.viewMatrix);

        gl.drawArrays(gl.TRIANGLES, 0, this._rectBatchCount);

        this._rectBatchCount = 0;
    }

    /** Flush both sprite and colored-quad batches. */
    FlushAllBatches() {
        this.FlushSpriteBatch();
        this.FlushRectBatch();
        this.FlushCircleBatch();
    }

    /** Flush the pending circle (SDF quad) batch to the GPU. */
    FlushCircleBatch() {
        if (this._circleBatchCount === 0) return;

        const gl     = this.gl;
        const shader = this._circleBatchShader;
        const floatCount = this._circleBatchCount * 8;

        if (!this._circleBatchBuf)
            this._circleBatchBuf = gl.createBuffer();

        gl.useProgram(shader.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._circleBatchBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this._circleBatchVerts.subarray(0, floatCount), gl.STREAM_DRAW);

        const stride = 8 * 4;
        gl.vertexAttribPointer(shader.positionLoc, 2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(shader.localLoc,    2, gl.FLOAT, false, stride, 2 * 4);
        gl.enableVertexAttribArray(shader.colorLoc);
        gl.vertexAttribPointer(shader.colorLoc,    4, gl.FLOAT, false, stride, 4 * 4);

        gl.uniform2f(shader.resolutionLoc, this.canvas.width, this.canvas.height);
        gl.uniformMatrix3fv(shader.viewMatrixLoc, false, this.viewMatrix);

        gl.drawArrays(gl.TRIANGLES, 0, this._circleBatchCount);
        gl.disableVertexAttribArray(shader.colorLoc);

        this._circleBatchCount = 0;
    }

    /**
     * Append a filled circle as a bounding quad to the circle batch.
     * Uses an SDF test in the fragment shader — zero trig per call.
     */
    _pushCircleQuad(x, y, radius, r, g, b, a) {
        if (this._spriteBatchCount > 0) this.FlushSpriteBatch();
        if (this._rectBatchCount   > 0) this.FlushRectBatch();
        if (this._circleBatchCount + 6 > this._circleBatchMaxVerts) this.FlushCircleBatch();

        const buf = this._circleBatchVerts;
        let i = this._circleBatchCount * 8;

        // Bounding quad corners: TL(-1,-1), TR(+1,-1), BL(-1,+1), BR(+1,+1)
        // lx,ly are normalized local coords — fragment checks length(lx,ly) <= 1.0
        const x0 = x - radius, y0 = y - radius;
        const x1 = x + radius, y1 = y - radius;
        const x2 = x - radius, y2 = y + radius;
        const x3 = x + radius, y3 = y + radius;

        // Triangle 1: TL, TR, BL
        buf[i++]=x0; buf[i++]=y0; buf[i++]=-1; buf[i++]=-1; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        buf[i++]=x1; buf[i++]=y1; buf[i++]= 1; buf[i++]=-1; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        buf[i++]=x2; buf[i++]=y2; buf[i++]=-1; buf[i++]= 1; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        // Triangle 2: BL, TR, BR
        buf[i++]=x2; buf[i++]=y2; buf[i++]=-1; buf[i++]= 1; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        buf[i++]=x1; buf[i++]=y1; buf[i++]= 1; buf[i++]=-1; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        buf[i++]=x3; buf[i++]=y3; buf[i++]= 1; buf[i++]= 1; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;

        this._circleBatchCount += 6;
    }

    /**
     * Append a pre-computed world-space colored quad to the rect batch.
     * Corners: TL(x0,y0), TR(x1,y1), BL(x2,y2), BR(x3,y3).
     */
    _pushColoredQuad(x0, y0, x1, y1, x2, y2, x3, y3, r, g, b, a) {
        if (this._spriteBatchCount > 0) this.FlushSpriteBatch();
        if (this._circleBatchCount > 0) this.FlushCircleBatch();
        if (this._rectBatchCount + 6 > this._rectBatchMaxVerts) {
            this.FlushRectBatch();
        }

        const buf = this._rectBatchVerts;
        let i = this._rectBatchCount * 6;

        // Triangle 1: TL, TR, BL
        buf[i++]=x0; buf[i++]=y0; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        buf[i++]=x1; buf[i++]=y1; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        buf[i++]=x2; buf[i++]=y2; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        // Triangle 2: BL, TR, BR
        buf[i++]=x2; buf[i++]=y2; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        buf[i++]=x1; buf[i++]=y1; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;
        buf[i++]=x3; buf[i++]=y3; buf[i++]=r; buf[i++]=g; buf[i++]=b; buf[i++]=a;

        this._rectBatchCount += 6;
    }

    /**
     * Append a pre-computed world-space quad to the sprite batch.
     * Corners: TL(x0,y0), TR(x1,y1), BL(x2,y2), BR(x3,y3).
     * UV: top-left (u0,v0), bottom-right (u1,v1).
     */
    _pushSpriteQuad(img, x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1, alpha) {
        if (this._rectBatchCount   > 0) this.FlushRectBatch();
        if (this._circleBatchCount > 0) this.FlushCircleBatch();

        const tex = this.GetTexture(img);

        if (tex !== this._spriteBatchTex) {
            this.FlushSpriteBatch();
            this._spriteBatchTex = tex;
        }
        if (this._spriteBatchCount + 6 > this._spriteBatchMaxVerts) {
            this.FlushSpriteBatch();
            this._spriteBatchTex = tex;
        }

        const buf = this._spriteBatchVerts;
        let i = this._spriteBatchCount * 5;

        // Triangle 1: TL, TR, BL
        buf[i++]=x0; buf[i++]=y0; buf[i++]=u0; buf[i++]=v0; buf[i++]=alpha;
        buf[i++]=x1; buf[i++]=y1; buf[i++]=u1; buf[i++]=v0; buf[i++]=alpha;
        buf[i++]=x2; buf[i++]=y2; buf[i++]=u0; buf[i++]=v1; buf[i++]=alpha;
        // Triangle 2: BL, TR, BR
        buf[i++]=x2; buf[i++]=y2; buf[i++]=u0; buf[i++]=v1; buf[i++]=alpha;
        buf[i++]=x1; buf[i++]=y1; buf[i++]=u1; buf[i++]=v0; buf[i++]=alpha;
        buf[i++]=x3; buf[i++]=y3; buf[i++]=u1; buf[i++]=v1; buf[i++]=alpha;

        this._spriteBatchCount += 6;
    }

    /**
     * Append an axis-aligned textured quad using a raw WebGL texture directly (no HTMLImageElement).
     * Used by DrawTextCached so text labels go through the sprite batch instead of issuing
     * an immediate draw call each.  `x, y` is the centre of the quad.
     */
    _pushTexturedQuad(tex, x, y, w, h, alpha=1.0) {
        if (this._rectBatchCount   > 0)
            this.FlushRectBatch();

        if (this._circleBatchCount > 0)
            this.FlushCircleBatch();

        if (tex !== this._spriteBatchTex) {
            this.FlushSpriteBatch();
            this._spriteBatchTex = tex;
        }

        if (this._spriteBatchCount + 6 > this._spriteBatchMaxVerts) {
            this.FlushSpriteBatch();
            this._spriteBatchTex = tex;
        }

        const hw = w / 2, hh = h / 2;
        const buf = this._spriteBatchVerts;
        let i = this._spriteBatchCount * 5;

        // Triangle 1: TL, TR, BL
        buf[i++]=x-hw; buf[i++]=y-hh; buf[i++]=0; buf[i++]=0; buf[i++]=alpha;
        buf[i++]=x+hw; buf[i++]=y-hh; buf[i++]=1; buf[i++]=0; buf[i++]=alpha;
        buf[i++]=x-hw; buf[i++]=y+hh; buf[i++]=0; buf[i++]=1; buf[i++]=alpha;
        // Triangle 2: BL, TR, BR
        buf[i++]=x-hw; buf[i++]=y+hh; buf[i++]=0; buf[i++]=1; buf[i++]=alpha;
        buf[i++]=x+hw; buf[i++]=y-hh; buf[i++]=1; buf[i++]=0; buf[i++]=alpha;
        buf[i++]=x+hw; buf[i++]=y+hh; buf[i++]=1; buf[i++]=1; buf[i++]=alpha;

        this._spriteBatchCount += 6;
    }

    _applyViewMatrix() {
        this.gl.useProgram(this.basicRectShader.program);
        this.gl.uniformMatrix3fv(this.basicRectShader.viewMatrixLoc, false, this.viewMatrix);
        this.gl.useProgram(this.spriteShader.program);
        this.gl.uniformMatrix3fv(this.spriteShader.viewMatrixLoc, false, this.viewMatrix);
        this.gl.useProgram(this.gradientRectShader.program);
        this.gl.uniformMatrix3fv(this.gradientRectShader.viewMatrixLoc, false, this.viewMatrix);
        this.gl.useProgram(this._spriteBatchShader.program);
        this.gl.uniformMatrix3fv(this._spriteBatchShader.viewMatrixLoc, false, this.viewMatrix);
        this.gl.useProgram(this._coloredQuadBatchShader.program);
        this.gl.uniformMatrix3fv(this._coloredQuadBatchShader.viewMatrixLoc, false, this.viewMatrix);
        this.gl.useProgram(this._circleBatchShader.program);
        this.gl.uniformMatrix3fv(this._circleBatchShader.viewMatrixLoc, false, this.viewMatrix);
    }

    ApplyCameraTransform(camera) {
        this.FlushAllBatches();
        const cx   = this._halfWidth;
        const cy   = this._halfHeight;
        const cos  = Math.cos(camera.rotation) * camera.scale;
        const sin  = Math.sin(camera.rotation) * camera.scale;
        // Pixel snapping: round camera position to nearest pixel to prevent tile seams
        const camX = Math.round(camera.x) + cx;
        const camY = Math.round(camera.y) + cy;

        this.viewMatrix[0] =  cos;
        this.viewMatrix[1] =  sin;
        this.viewMatrix[2] =  0;
        this.viewMatrix[3] = -sin;
        this.viewMatrix[4] =  cos;
        this.viewMatrix[5] =  0;
        this.viewMatrix[6] = cx - cos * camX + sin * camY;
        this.viewMatrix[7] = cy - sin * camX - cos * camY;
        this.viewMatrix[8] =  1;

        this._applyViewMatrix();
    }

    RestoreCameraTransform() {
        this.FlushAllBatches();
        this.viewMatrix[0] = 1; this.viewMatrix[1] = 0; this.viewMatrix[2] = 0;
        this.viewMatrix[3] = 0; this.viewMatrix[4] = 1; this.viewMatrix[5] = 0;
        this.viewMatrix[6] = 0; this.viewMatrix[7] = 0; this.viewMatrix[8] = 1;
        this._applyViewMatrix();
    }
}

// #endregion

// #region WebGL shader objects

class BasicRectShader {
    constructor(gl) {
        // Rectangle from (-0.5, -0.5) to (0.5, 0.5)
        this.quadVerts = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
            -0.5,  0.5,
            -0.5,  0.5,
             0.5, -0.5,
             0.5,  0.5,
        ]);

        // Outline vertices for a rectangle (LINE_STRIP, 5 points to close the loop)
        // used when rendering a stroke rectangle (DrawStrokeRectangle method)
        this.outlineVerts = new Float32Array([
            -0.5, -0.5, // bottom-left
             0.5, -0.5, // bottom-right
             0.5,  0.5, // top-right
            -0.5,  0.5, // top-left
            -0.5, -0.5  // close loop
        ]);

        // Vertex shader (solid color)
        this.vsQuadSource = `
            attribute vec2 a_position;
            uniform vec2 u_resolution;
            uniform vec2 u_translation;
            uniform float u_rotation;
            uniform vec2 u_pivot;
            uniform vec2 u_size;
            uniform mat3 u_viewMatrix;
            void main() {
                // Scale - Rotate
                vec2 local = a_position * u_size - u_pivot;
                float cosR = cos(u_rotation);
                float sinR = sin(u_rotation);
                vec2 rotated = vec2(
                    local.x * cosR - local.y * sinR,
                    local.x * sinR + local.y * cosR
                );
                vec2 pos = rotated + u_translation;
                vec3 localPos = vec3(pos, 1.0);
                vec3 worldPos = u_viewMatrix * localPos;
                // Convert to clipspace
                vec2 zeroToOne = worldPos.xy / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            }
        `;

        // Fragment shader (solid color)
        this.fsSolidColorSource = `
            precision mediump float;
            uniform vec4 u_color;
            void main() {
                //gl_FragColor = u_color;
                // Premultiply the RGB components by the alpha value
                // to match the gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
                gl_FragColor = vec4(u_color.rgb * u_color.a, u_color.a);
            }
        `;

        // Compile shaders and link program
        this.program = CreateProgram(gl, this.vsQuadSource, this.fsSolidColorSource);

        // Look up locations
        this.positionLoc = gl.getAttribLocation(this.program, "a_position");
        this.resolutionLoc = gl.getUniformLocation(this.program, "u_resolution");
        this.translationLoc = gl.getUniformLocation(this.program, "u_translation");
        this.rotationLoc = gl.getUniformLocation(this.program, "u_rotation");
        this.viewMatrixLoc = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.sizeLoc = gl.getUniformLocation(this.program, "u_size");
        this.pivotLoc = gl.getUniformLocation(this.program, "u_pivot");
        this.colorLoc = gl.getUniformLocation(this.program, "u_color");

        // Create a buffer for a unit rectangle centered at (0,0)
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.quadVerts, gl.STATIC_DRAW);

        // Another buffer for the outline vertices (for the DrawStrokeRectangle method)
        this.outlineBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.outlineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.outlineVerts, gl.STATIC_DRAW);

        // Set temporal viewMatrix
        gl.useProgram(this.program);
        gl.uniformMatrix3fv(this.viewMatrixLoc, false, new Float32Array([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]));
    }

    Setup(gl) {
        gl.useProgram(this.program);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);
    }

    Use(gl) {
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);
    }

    UseForCustomBuffer(gl, buffer) {
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);
    }
    
    SetUniforms(gl, resolutionX, resolutionY, translationX, translationY, rotation, sizeX, sizeY, pivotX, pivotY, color) {
        gl.uniform2f(this.resolutionLoc, resolutionX, resolutionY);
        gl.uniform2f(this.translationLoc, translationX, translationY);
        gl.uniform1f(this.rotationLoc, rotation);
        gl.uniform2f(this.sizeLoc, sizeX, sizeY);
        gl.uniform2f(this.pivotLoc, pivotX, pivotY);
        gl.uniform4fv(this.colorLoc, color);
    }
}

class SpriteShader {
    constructor(gl) {
        // Rectangle from (-0.5, -0.5) to (0.5, 0.5)
        this.quadVerts = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
            -0.5,  0.5,
            -0.5,  0.5,
             0.5, -0.5,
             0.5,  0.5,
        ]);

        // Texture coordinates
        this.texcoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ]);

        // Vertex shader for textured quad
        this.vsTextureSource = `
            attribute vec2 a_position;
            attribute vec2 a_texcoord;
            uniform vec2 u_resolution;
            uniform vec2 u_translation;
            uniform float u_rotation;
            uniform vec2 u_size;
            uniform vec2 u_pivot;
            uniform mat3 u_viewMatrix;
            varying vec2 v_texcoord;
            void main() {
                // Scale first, then rotate
                vec2 local = a_position * u_size - u_pivot;
                float cosR = cos(u_rotation);
                float sinR = sin(u_rotation);
                vec2 rotated = vec2(
                    local.x * cosR - local.y * sinR,
                    local.x * sinR + local.y * cosR
                );
                vec2 pos = rotated + u_translation;
                vec3 localPos = vec3(pos, 1.0);
                vec3 worldPos = u_viewMatrix * localPos;
                // Convert to clipspace
                vec2 zeroToOne = worldPos.xy / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_texcoord = a_texcoord;
            }
        `;

        // Fragment shader for textured quad
        this.fsTextureSource = `
            precision mediump float;
            varying vec2 v_texcoord;
            uniform sampler2D u_texture;
            uniform float u_alpha;
            void main() {
                vec4 texColor = texture2D(u_texture, v_texcoord);
                //gl_FragColor = vec4(texColor.rgb, texColor.a * u_alpha);
                // If alpha is very low, force RGB to black
                //if (c.a < 0.9) c.rgb = vec3(0.0);
                //gl_FragColor = vec4(c.rgb * c.a, 1.0 - c.a);
                // Apply the uniform alpha to the texture's alpha.
                texColor.a *= u_alpha;
                // Premultiply the RGB components by the final alpha.
                texColor.rgb *= texColor.a;
                gl_FragColor = texColor;
            }
        `;

        // Compile shaders and link program
        this.program = CreateProgram(gl, this.vsTextureSource, this.fsTextureSource);
        
        this.texPositionLoc = gl.getAttribLocation(this.program, "a_position");
        this.texTexcoordLoc = gl.getAttribLocation(this.program, "a_texcoord");
        this.texResolutionLoc = gl.getUniformLocation(this.program, "u_resolution");
        this.texTranslationLoc = gl.getUniformLocation(this.program, "u_translation");
        this.texRotationLoc = gl.getUniformLocation(this.program, "u_rotation");
        this.viewMatrixLoc = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.texSizeLoc = gl.getUniformLocation(this.program, "u_size");
        this.pivotLoc = gl.getUniformLocation(this.program, "u_pivot");
        this.texSamplerLoc = gl.getUniformLocation(this.program, "u_texture");
        this.texAlphaLoc = gl.getUniformLocation(this.program, "u_alpha");

        // Create a buffer for quad positions
        this.texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.quadVerts, gl.STATIC_DRAW);

        // Texture coordinates buffer
        this.texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texcoords, gl.STATIC_DRAW);

        // Set temporal viewMatrix
        gl.useProgram(this.program);
        gl.uniformMatrix3fv(this.viewMatrixLoc, false, new Float32Array([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]));
    }

    Setup(gl) {
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        gl.enableVertexAttribArray(this.texPositionLoc);
        gl.vertexAttribPointer(this.texPositionLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.enableVertexAttribArray(this.texTexcoordLoc);
        gl.vertexAttribPointer(this.texTexcoordLoc, 2, gl.FLOAT, false, 0, 0);
    }

    Use(gl) {
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        gl.vertexAttribPointer(this.texPositionLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.vertexAttribPointer(this.texTexcoordLoc, 2, gl.FLOAT, false, 0, 0);
    }

    SetUniforms(gl, resolutionX, resolutionY, translationX, translationY, rotation, sizeX, sizeY, pivotX, pivotY, alpha) {
        gl.uniform2f(this.texResolutionLoc, resolutionX, resolutionY);
        gl.uniform2f(this.texTranslationLoc, translationX, translationY);
        gl.uniform1f(this.texRotationLoc, rotation);
        gl.uniform2f(this.texSizeLoc, sizeX, sizeY);
        gl.uniform2f(this.pivotLoc, pivotX, pivotY);
        gl.uniform1f(this.texAlphaLoc, alpha);
    }

    BindTexture(gl, texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(this.texSamplerLoc, 0);
    }
}

class SpriteBatchShader {
    constructor(gl) {
        this.vsSource = `
            attribute vec2 a_position;
            attribute vec2 a_texcoord;
            attribute float a_alpha;
            uniform vec2 u_resolution;
            uniform mat3 u_viewMatrix;
            varying vec2 v_texcoord;
            varying float v_alpha;
            void main() {
                vec3 worldPos = u_viewMatrix * vec3(a_position, 1.0);
                vec2 zeroToOne = worldPos.xy / u_resolution;
                vec2 clipSpace = zeroToOne * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_texcoord = a_texcoord;
                v_alpha = a_alpha;
            }
        `;

        this.fsSource = `
            precision mediump float;
            varying vec2 v_texcoord;
            varying float v_alpha;
            uniform sampler2D u_texture;
            void main() {
                vec4 c = texture2D(u_texture, v_texcoord);
                c.a *= v_alpha;
                c.rgb *= c.a;
                gl_FragColor = c;
            }
        `;

        this.program = CreateProgram(gl, this.vsSource, this.fsSource);

        this.positionLoc    = gl.getAttribLocation(this.program, "a_position");
        this.texcoordLoc    = gl.getAttribLocation(this.program, "a_texcoord");
        this.alphaLoc       = gl.getAttribLocation(this.program, "a_alpha");
        this.resolutionLoc  = gl.getUniformLocation(this.program, "u_resolution");
        this.viewMatrixLoc  = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.samplerLoc     = gl.getUniformLocation(this.program, "u_texture");

        gl.useProgram(this.program);
        gl.uniformMatrix3fv(this.viewMatrixLoc, false, new Float32Array([1,0,0, 0,1,0, 0,0,1]));
    }

    Setup(gl) {
        gl.useProgram(this.program);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.enableVertexAttribArray(this.texcoordLoc);
        // alphaLoc is unique to this shader — enable/disable locally in FlushSpriteBatch
    }

    BindTexture(gl, texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(this.samplerLoc, 0);
    }
}

class ColoredQuadBatchShader {
    constructor(gl) {
        this.vsSource = `
            attribute vec2 a_position;
            attribute vec4 a_color;
            uniform vec2 u_resolution;
            uniform mat3 u_viewMatrix;
            varying vec4 v_color;
            void main() {
                vec3 worldPos = u_viewMatrix * vec3(a_position, 1.0);
                vec2 zeroToOne = worldPos.xy / u_resolution;
                vec2 clipSpace = zeroToOne * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_color = a_color;
            }
        `;

        this.fsSource = `
            precision mediump float;
            varying vec4 v_color;
            void main() {
                gl_FragColor = vec4(v_color.rgb * v_color.a, v_color.a);
            }
        `;

        this.program = CreateProgram(gl, this.vsSource, this.fsSource);

        this.positionLoc   = gl.getAttribLocation(this.program, "a_position");
        this.colorLoc      = gl.getAttribLocation(this.program, "a_color");
        this.resolutionLoc = gl.getUniformLocation(this.program, "u_resolution");
        this.viewMatrixLoc = gl.getUniformLocation(this.program, "u_viewMatrix");

        gl.useProgram(this.program);
        gl.uniformMatrix3fv(this.viewMatrixLoc, false, new Float32Array([1,0,0, 0,1,0, 0,0,1]));
    }

    Setup(gl) {
        gl.useProgram(this.program);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.enableVertexAttribArray(this.colorLoc);
    }
}

class CircleBatchShader {
    constructor(gl) {
        this.vsSource = `
            attribute vec2 a_position;
            attribute vec2 a_local;
            attribute vec4 a_color;
            uniform vec2 u_resolution;
            uniform mat3 u_viewMatrix;
            varying vec2 v_local;
            varying vec4 v_color;
            void main() {
                vec3 worldPos = u_viewMatrix * vec3(a_position, 1.0);
                vec2 zeroToOne = worldPos.xy / u_resolution;
                vec2 clipSpace = zeroToOne * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_local = a_local;
                v_color = a_color;
            }
        `;

        this.fsSource = `
            precision mediump float;
            varying vec2 v_local;
            varying vec4 v_color;
            void main() {
                float a = v_color.a * step(length(v_local), 1.0);
                gl_FragColor = vec4(v_color.rgb * a, a);
            }
        `;

        this.program = CreateProgram(gl, this.vsSource, this.fsSource);

        this.positionLoc   = gl.getAttribLocation(this.program, "a_position");
        this.localLoc      = gl.getAttribLocation(this.program, "a_local");
        this.colorLoc      = gl.getAttribLocation(this.program, "a_color");
        this.resolutionLoc = gl.getUniformLocation(this.program, "u_resolution");
        this.viewMatrixLoc = gl.getUniformLocation(this.program, "u_viewMatrix");

        gl.useProgram(this.program);
        gl.uniformMatrix3fv(this.viewMatrixLoc, false, new Float32Array([1,0,0, 0,1,0, 0,0,1]));
    }

    Setup(gl) {
        gl.useProgram(this.program);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.enableVertexAttribArray(this.localLoc);
        // colorLoc enabled/disabled locally in FlushCircleBatch
    }
}

class GradientRectShader {
    constructor(gl) {
        // Rectangle from (-0.5, -0.5) to (0.5, 0.5)
        this.quadVerts = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
            -0.5,  0.5,
            -0.5,  0.5,
             0.5, -0.5,
             0.5,  0.5,
        ]);

        // Vertex shader: pass local position (0..1) for gradient
        this.vsSource = `
            attribute vec2 a_position;
            uniform vec2 u_resolution;
            uniform vec2 u_translation;
            uniform float u_rotation;
            uniform mat3 u_viewMatrix;
            uniform vec2 u_size;
            uniform vec2 u_gradientStart; // Original world-space gradient start
            uniform vec2 u_gradientEnd;   // Original world-space gradient end
            varying vec2 v_worldPos;
            varying vec2 v_gradientStartTransformed; // Transformed gradient start (camera space)
            varying vec2 v_gradientEndTransformed;   // Transformed gradient end (camera space)
            void main() {
                // Scale first, then rotate
                vec2 scaled = a_position * u_size;
                float cosR = cos(u_rotation);
                float sinR = sin(u_rotation);
                vec2 rotated = vec2(
                    scaled.x * cosR - scaled.y * sinR,
                    scaled.x * sinR + scaled.y * cosR
                );
                vec2 pos = rotated + u_translation;
                vec3 localPos = vec3(pos, 1.0);
                vec3 worldPos = u_viewMatrix * localPos;
                // Convert to clipspace
                vec2 zeroToOne = worldPos.xy / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

                // Pass local quad position (0..1) to fragment
                v_worldPos = worldPos.xy;
                // Transform gradient start/end points by the view matrix
                v_gradientStartTransformed = (u_viewMatrix * vec3(u_gradientStart, 1.0)).xy;
                v_gradientEndTransformed = (u_viewMatrix * vec3(u_gradientEnd, 1.0)).xy;
            }
        `;

        // Fragment shader: linear gradient following a 1D texture
        this.fsSource = `
            precision mediump float;
            varying vec2 v_worldPos;
            uniform sampler2D u_gradient;
            varying vec2 v_gradientStartTransformed; // Transformed gradient start (camera space)
            varying vec2 v_gradientEndTransformed;   // Transformed gradient end (camera space)
            void main() {
                // All calculations are now in camera space
                vec2 gradientVec = v_gradientEndTransformed - v_gradientStartTransformed;
                float gradientLenSq = dot(gradientVec, gradientVec);
                if (gradientLenSq == 0.0) {
                    gl_FragColor = texture2D(u_gradient, vec2(0.0, 0.5));
                    return;
                }
                vec2 pointVec = v_worldPos - v_gradientStartTransformed;
                float projection = dot(pointVec, gradientVec);
                float t = clamp(projection / gradientLenSq, 0.0, 1.0);
                gl_FragColor = texture2D(u_gradient, vec2(t, 0.5));
            }
        `;

        // Compile shaders and link program
        this.program = CreateProgram(gl, this.vsSource, this.fsSource);

        // Look up locations
        this.positionLoc = gl.getAttribLocation(this.program, "a_position");
        this.resolutionLoc = gl.getUniformLocation(this.program, "u_resolution");
        this.translationLoc = gl.getUniformLocation(this.program, "u_translation");
        this.rotationLoc = gl.getUniformLocation(this.program, "u_rotation");
        this.viewMatrixLoc = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.sizeLoc = gl.getUniformLocation(this.program, "u_size");
        this.gradientLoc = gl.getUniformLocation(this.program, "u_gradient");
        this.gradientStartLoc = gl.getUniformLocation(this.program, "u_gradientStart");
        this.gradientEndLoc = gl.getUniformLocation(this.program, "u_gradientEnd");

        // Create a buffer for a unit rectangle centered at (0,0)
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.quadVerts, gl.STATIC_DRAW);

        // Set temporal viewMatrix
        gl.useProgram(this.program);
        gl.uniformMatrix3fv(this.viewMatrixLoc, false, new Float32Array([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]));
    }

    // create or update a 1D gradient texture from color stops
    static CreateGradientTexture(gl, colorStops, size = 256) {
        // Create a 1D canvas and fill it with the gradient
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, size, 0);
        colorStops.forEach(cs => grad.addColorStop(cs.offset, cs.color.toString()));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, 1);

        // Upload as WebGL texture
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, ctx.getImageData(0, 0, size, 1).data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        return tex;
    }

    static CleanGradientTexture(gl, text) {
        gl.deleteTexture(text);
    }

    Setup(gl) {
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);
    }

    Use(gl) {
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);
    }
}

// #endregion

// #region WebGL helper functions

// Helper function to compile shaders and create the gl program
function CreateProgram(gl, vsSource, fsSource) {
    function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }
    const vs = compile(gl.VERTEX_SHADER, vsSource);
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
}

// #endregion