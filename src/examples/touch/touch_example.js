/**
 * Virtual Controls Demo
 * ─────────────────────
 * A minimal showcase of the engine's touch input system.
 *
 * Controls (all unified through the action/axis mapping API):
 *   Desktop  — WASD / Arrow keys to move, SPACE to burst
 *   Gamepad  — Left stick to move, A button to burst
 *   Mobile   — Left virtual joystick to move, ⚡ button to burst
 *
 * To try on mobile open the page from a touch device, or simulate touches
 * in your browser's DevTools (Ctrl+Shift+M in Chrome/Firefox).
 */

const semiTransparentWhite = new Color(1, 1, 1, 0.35);
const gridColor = new Color(1, 1, 1, 0.04);
const initialCollectibles = 6;

class TouchDemo extends Game {
    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth:  720,
            screenHeight: 1280,
            fillWindow: true
        });

        // Player state
        this.player = null;

        this._collectibles = [];
        this._score        = 0;
    }

    Start() {
        super.Start();
        Input.ClearMappings();

        // ── Input bindings ─────────────────────────────────────────────────────────
        // Works identically on keyboard, gamepad, and touch — the game code never
        // needs to know which device is being used.
        Input.RegisterAxis('MoveH', [
            { type: 'key',             positive: KEY_D,     negative: KEY_A    },
            { type: 'key',             positive: KEY_RIGHT, negative: KEY_LEFT },
            { type: 'gamepadaxis',     stick: 'LS', axis: 0                    },
            { type: 'virtualjoystick', id: 'move',  axis: 0                    },
        ]);
        Input.RegisterAxis('MoveV', [
            { type: 'key',             positive: KEY_S,    negative: KEY_W  },
            { type: 'key',             positive: KEY_DOWN, negative: KEY_UP },
            { type: 'gamepadaxis',     stick: 'LS', axis: 1                 },
            { type: 'virtualjoystick', id: 'move',  axis: 1                 },
        ]);
        Input.RegisterAction('Burst', [
            { type: 'key',           code: KEY_SPACE   },
            { type: 'gamepad',       code: 'FACE_DOWN' },
            { type: 'virtualbutton', id: 'burst'       },
        ]);

        // ── Virtual controls ───────────────────────────────────────────────────────
        // Positioned for landscape-phone play (bottom-left joystick, bottom-right button).
        // On desktop they are semi-transparent overlays and don't interfere with gameplay.
        const sw = this.screenWidth;
        const sh = this.screenHeight;
        const virtualJoystick = new VirtualJoystick(110, sh - 110, 90);
        Input.RegisterVirtualJoystick('move', virtualJoystick);

        const burstBtn        = new VirtualButton(sw - 110, sh - 110, 60, '⚡');
        burstBtn.color        = new Color(1, 0.8, 0,   0.18);
        burstBtn.pressedColor = new Color(1, 0.8, 0,   0.55);
        burstBtn.rimColor     = new Color(1, 0.8, 0,   0.65);
        burstBtn.labelColor   = new Color(1, 0.95, 0.2, 1.0);
        Input.RegisterVirtualButton('burst', burstBtn);

        // ── Scene ─────────────────────────────────────────────────────────────────
        this.player = new Player(new Vector2(this.screenHalfWidth, this.screenHalfHeight));
        this.AddGameObject(this.player);

        this._score = 0;
        this._spawnCollectibles(initialCollectibles);
    }

    // ─── helpers ────────────────────────────────────────────────────────────────

    _spawnCollectibles(count) {
        this._collectibles = [];
        for (let i = 0; i < count; i++)
            this._addCollectible();
    }

    _addCollectible() {
        const margin = 55;
        const newCollectible = new Collectible(
            new Vector2(
                margin + Math.random() * (this.screenWidth  - margin * 2),
                margin + Math.random() * (this.screenHeight - margin * 2)
            ),
            14,
            new Color(
                Math.random() * 0.4 + 0.6,
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.3 + 0.3,
            )
        )
        this._collectibles.push(newCollectible);
        this.AddGameObject(newCollectible);
    }

    // ─── Update ─────────────────────────────────────────────────────────────────

    Update(deltaTime) {
        super.Update(deltaTime);

        // Collect dots
        for (let i = this._collectibles.length - 1; i >= 0; i--) {
            const c = this._collectibles[i];
            
            if (CheckCollisionTwoCircles(this.player.position, this.player.radius, c.position, c.radius)) {
                this._collectibles.splice(i, 1);
                this.Destroy(c);
                this._score++;

                // spawn a new collectible
                this._addCollectible();
            }
        }
    }

    // ─── Draw ───────────────────────────────────────────────────────────────────

    Draw() {
        const r  = this.renderer;
        const sw = this.screenWidth;
        const sh = this.screenHeight;

        // Background
        r.DrawFillBasicRectangle(0, 0, sw, sh, Color.FromHex('#0d1b2a'));

        // Subtle grid lines
        const gridStep  = 40;
        for (let x = 0; x < sw; x += gridStep)
            r.DrawLine(x, 0, x, sh, gridColor);
        for (let y = 0; y < sh; y += gridStep)
            r.DrawLine(0, y, sw, y, gridColor);

        // Collectibles & Player
        super.Draw();

        // Score
        r.DrawFillText(
            `Score: ${this._score}`,
            sw / 2, 14,
            'bold 32px sans-serif', Color.white, 'center', 'top'
        );

        // Desktop hint (bottom-centre, faint)
        r.DrawFillText(
            'WASD / ↑↓←→ to move  •  SPACE to burst',
            sw / 2, sh - 10,
            '18px sans-serif', semiTransparentWhite, 'center', 'bottom'
        );

        // Virtual controls — always on top, in screen space
        VirtualControlls.Draw(this.renderer);
    }
}

class Player extends CircleGO {
    constructor(position) {
        super(position, 30, Color.white);

        this.speed = 280;
        this.burstSpeed = 520;

        this.isBursting = false;
        this.burstTimer = 0;

        this.baseColor  = Color.FromRGB(79,  195, 247); // sky blue
        this.burstColor = Color.FromRGB(255, 235,  59); // yellow

        this.specularHighlightColor = new Color(1, 1, 1, 0.35);
        
        this.glowColor      = new Color(this.color.r, this.color.g, this.color.b, 0.15);
        this.glowBurstColor = new Color(this.burstColor.r, this.burstColor.g, this.burstColor.b, 0.15);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // Burst action
        if (Input.GetActionDown('Burst') && !this.isBursting) {
            this.isBursting = true;
            this.burstTimer = 0.45;
        }
        if (this.isBursting) {
            this.burstTimer -= deltaTime;
            if (this.burstTimer <= 0)
                this.isBursting = false;
        }

        // Movement
        const speed = this.isBursting ? this.burstSpeed : this.speed;
        const h     = Input.GetAxis('MoveH');
        const v     = Input.GetAxis('MoveV');
        this.position.x = Math.max(this.radius, Math.min(game.screenWidth  - this.radius, this.position.x + h * speed * deltaTime));
        this.position.y = Math.max(this.radius, Math.min(game.screenHeight - this.radius, this.position.y + v * speed * deltaTime));
    }

    Draw(renderer) {
        this.color = this.isBursting ? this.burstColor : this.baseColor;
        const gc = this.isBursting ? this.glowBurstColor : this.glowColor;

        // glow ring
        renderer.DrawFillCircle  (this.position.x, this.position.y, this.radius + 14, gc);
        // body
        super.Draw(renderer);
        renderer.DrawStrokeCircle(this.position.x, this.position.y, this.radius,      Color.white, 2);
        // inner specular highlight
        renderer.DrawFillCircle(this.x - this.radius * 0.28, this.y - this.radius * 0.28, this.radius * 0.28, semiTransparentWhite);
    }
}

class Collectible extends CircleGO {
    constructor(position, radius, color) {
        super(position, radius, color);

        this.colorLight = new Color(this.color.r, this.color.g, this.color.b, 0.2);
    }

    Draw(renderer) {
        // outer glow + solid dot
        renderer.DrawFillCircle(this.position.x, this.position.y, this.radius + 5, this.colorLight);

        super.Draw(renderer);
    }
}

window.onload = () => {
    Init(TouchDemo);
}