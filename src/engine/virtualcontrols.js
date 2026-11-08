// ============================================================
// Virtual Controls
// On-screen touch controls: VirtualJoystick and VirtualButton.
// Registered via Input.RegisterVirtualJoystick() / Input.RegisterVirtualButton().
// Globals provided: VirtualControlls, VirtualJoystick, VirtualButton
// Requires: utils_classes.js (Vector2), renderer.js
// ============================================================

// #region VirtualControlls
const VirtualControlls = {
    virtualControlls: [],

    AddVirtualControl: function(virtualControl) {
        this.virtualControlls.push(virtualControl);
    },

    Draw: function(renderer) {
        this.virtualControlls.forEach(v => v.Draw(renderer));       
    }
}
// #endregion

// #region VirtualJoystick

/**
 * An on-screen analog stick for touch input.
 * Create via `Input.RegisterVirtualJoystick(id, x, y, baseRadius)`.
 * Read `axisX` / `axisY` directly, or use an axis binding:
 *   `{ type: 'virtualjoystick', id: 'move', axis: 0 }` (axis 0 = X, 1 = Y)
 */
class VirtualJoystick {
    /**
     * @param {number} x           - Center X in canvas space.
     * @param {number} y           - Center Y in canvas space.
     * @param {number} baseRadius  - Radius of the outer ring.
     * @param {number} knobRadius  - Radius of the draggable knob.
     */
    constructor(x, y, baseRadius, knobRadius = Math.round(baseRadius * 0.4)) {
        this.x          = x;
        this.y          = y;
        this.baseRadius = baseRadius;
        this.knobRadius = knobRadius;

        this._touchId = null;
        this._axisX   = 0;
        this._axisY   = 0;

        // Visual style — replace these Color instances to customise appearance.
        this.baseColor    = new Color(1, 1, 1, 0.12);
        this.rimColor     = new Color(1, 1, 1, 0.35);
        this.knobColor    = new Color(1, 1, 1, 0.55);
        this.rimLineWidth = 3;
        this.visible      = true;

        VirtualControlls.AddVirtualControl(this);
    }

    /** Normalised horizontal deflection: -1.0 (left) → 1.0 (right). */
    get axisX() { return this._axisX; }
    /** Normalised vertical deflection: -1.0 (up) → 1.0 (down). */
    get axisY() { return this._axisY; }
    /** True while a finger is actively touching this joystick. */
    get active() { return this._touchId !== null; }

    _tryClaimTouch(id, touch) {
        const dx = touch.x - this.x;
        const dy = touch.y - this.y;
        if (dx * dx + dy * dy <= this.baseRadius * this.baseRadius) {
            this._touchId = id;
            this._updateActive(touch);
            return true;
        }
        return false;
    }

    _updateActive(touch) {
        const dx   = touch.x - this.x;
        const dy   = touch.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            const maxDist     = this.baseRadius - this.knobRadius;
            const clampedDist = Math.min(dist, maxDist);
            this._axisX = (dx / dist) * (clampedDist / maxDist);
            this._axisY = (dy / dist) * (clampedDist / maxDist);
        } else {
            this._axisX = 0;
            this._axisY = 0;
        }
    }

    _release() {
        this._touchId = null;
        this._axisX   = 0;
        this._axisY   = 0;
    }

    /** Called by `Input.DrawVirtualControls(renderer)`. */
    Draw(renderer) {
        if (!this.visible)
            return;

        const kx = this.x + this._axisX * (this.baseRadius - this.knobRadius);
        const ky = this.y + this._axisY * (this.baseRadius - this.knobRadius);
        renderer.DrawFillCircle(this.x,   this.y,  this.baseRadius, this.baseColor);
        renderer.DrawStrokeCircle(this.x, this.y,  this.baseRadius, this.rimColor, this.rimLineWidth);
        renderer.DrawFillCircle(kx, ky, this.knobRadius, this.knobColor);
    }
}

// #endregion

// #region VirtualButton

/**
 * An on-screen button for touch input.
 * Create via `Input.RegisterVirtualButton(id, x, y, radius, label)`.
 * Read `pressed` / `down` / `up` directly, or use an action binding:
 *   `{ type: 'virtualbutton', id: 'fire' }`
 */
class VirtualButton {
    /**
     * @param {number} x      - Center X in canvas space.
     * @param {number} y      - Center Y in canvas space.
     * @param {number} radius - Hit-test and visual radius.
     * @param {string} label  - Text rendered inside the button.
     */
    constructor(x, y, radius, label = '') {
        this.x      = x;
        this.y      = y;
        this.radius = radius;
        this.label  = label;

        this._touchId = null;
        /** True only on the single frame the button was first pressed. */
        this.down    = false;
        /** True every frame the button is held down. */
        this.pressed = false;
        /** True only on the single frame the button was released. */
        this.up      = false;

        // Visual style
        this.color        = new Color(1, 1, 1, 0.12);
        this.pressedColor = new Color(1, 1, 1, 0.40);
        this.rimColor     = new Color(1, 1, 1, 0.50);
        this.labelColor   = new Color(1, 1, 1, 0.90);
        this.rimLineWidth = 3;
        /** Override to set a specific font. Defaults to auto-sized from `radius`. */
        this.labelFont    = null;
        this.visible      = true;

        VirtualControlls.AddVirtualControl(this);
    }

    /** True while a finger is pressing this button. */
    get active() { return this._touchId !== null; }

    _tryClaimTouch(id, touch) {
        const dx = touch.x - this.x;
        const dy = touch.y - this.y;
        if (dx * dx + dy * dy <= this.radius * this.radius) {
            this._touchId = id;
            this.down    = true;
            this.pressed = true;
            return true;
        }
        return false;
    }

    _updateActive(_touch) {
        // Button state doesn't change based on finger position once claimed.
    }

    _release() {
        this._touchId = null;
        this.pressed  = false;
        this.up       = true;
    }

    /** Called by `Input.DrawVirtualControls(renderer)`. */
    Draw(renderer) {
        if (!this.visible)
            return;

        const fill = this.pressed ? this.pressedColor : this.color;
        renderer.DrawFillCircle(this.x,   this.y, this.radius, fill);
        renderer.DrawStrokeCircle(this.x, this.y, this.radius, this.rimColor, this.rimLineWidth);
        if (this.label) {
            const font = this.labelFont ?? `bold ${Math.round(this.radius * 0.5)}px sans-serif`;
            renderer.DrawFillText(this.label, this.x, this.y, font, this.labelColor, 'center', 'middle');
        }
    }
}

// #endregion