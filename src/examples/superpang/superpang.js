// Super Pang example project

// -------------------------------------------------------
// Ball sizes: large=48, medium=32, small=20, tiny=12
// When a ball is hit it splits into two smaller ones.
// Tiny balls are destroyed when hit.
// -------------------------------------------------------

const BALL_SIZES   = [48, 32, 20, 12];
const BALL_SPEEDS  = [80,  100, 150, 170];    // horizontal speed per size
const BALL_BOUNCEV = [-600, -510, -420, -350]; // vertical bounce speed per size
const GRAVITY      = 700;

const BALL_COLORS = [
    new Color(0.9, 0.2, 0.2),   // large  - red
    new Color(0.9, 0.5, 0.1),   // medium - orange
    new Color(0.2, 0.7, 0.2),   // small  - green
    new Color(0.2, 0.4, 0.9),   // tiny  a d - blue
];

// Game states
const GameState = {
    STATE_INTRO      : 0,
    STATE_PLAYING    : 1,
    STATE_DEAD       : 2,
    STATE_WIN        : 3,
    STATE_RESPAWNING : 4,
    STATE_LEVEL_WIN  : 5
};



// -------------------------------------------------------
// Level definitions
// -------------------------------------------------------
const LEVELS = [
    { time: 60, balls: [
        { x: 150, sizeIndex: 0, dirX:  1 },
    ]},
    { time: 60, balls: [
        { x: 150, sizeIndex: 0, dirX:  1 },
        { x: 490, sizeIndex: 0, dirX: -1 },
    ]},
    { time: 55, balls: [
        { x: 150, sizeIndex: 0, dirX:  1 },
        { x: 320, sizeIndex: 1, dirX: -1 },
        { x: 490, sizeIndex: 0, dirX:  1 },
    ]},
    { time: 50, balls: [
        { x: 100, sizeIndex: 0, dirX:  1 },
        { x: 220, sizeIndex: 0, dirX: -1 },
        { x: 420, sizeIndex: 0, dirX:  1 },
        { x: 540, sizeIndex: 0, dirX: -1 },
    ]},
];

// Level background sprite source rectangle
const levelBackgroundRects = [
    { x:   8, y:   8, w: 256, h: 190 },
    { x: 272, y:   8, w: 256, h: 190 },
    { x:   8, y: 208, w: 256, h: 190 },
    { x: 272, y: 208, w: 256, h: 190 },
];

// -------------------------------------------------------
// SuperPang - main game class
// -------------------------------------------------------
class SuperPang extends Game {
    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth: 512,
            screenHeight: 424,
            imageSmoothingEnabled: false,
            collidersOnly: false,
            autoFullscreen: true,
            fillWindow: 'mobile',
            mobileSupport: true
        });

        this.graphicAssets = {
            player:      { img: null, path: 'src/examples/superpang/assets/SuperPang_player.png', bgColor: '#FF00FF' },
            balloons:    { img: null, path: 'src/examples/superpang/assets/SuperPang_balloons.png', bgColor: '#8000FF' },
            backgrounds: { img: null, path: 'src/examples/superpang/assets/SuperPang_bgs.png' },
        };

        this.player        = null;
        this.shot          = null;
        this.balls         = [];
        this.state         = GameState.STATE_PLAYING;
        this.score         = 0;
        this.lives         = 3;
        this.level         = 0;
        this.timer         = 0;
        this._respawnTimer = 0;

        this.topLine   = 15;
        this.floorLine = 368;
        this.leftWall  = 15;
        this.rightWall = 497;
        this.bgSprite  = null;

        this._introLogoY      = 0;  // current logo Y (animated)
        this._introLogoTarget = 0;  // resting Y position
        this._introLogoSpeed  = 500;

        this.livesLabel = null;
        this.scoreLabel = null;
        this.levelLabel = null;
        this.timerLabel = null;

        // debugMode = true;
    }

    Start() {
        super.Start();

        this.score  = 0;
        this.lives  = 3;

        // Allow starting from a specific level via ?level=N (0-based, clamped to valid range)
        const params = new URLSearchParams(window.location.search);
        const startLevel = parseInt(params.get('level'), 10);
        const hasLevelParam = !isNaN(startLevel) && startLevel >= 0 && startLevel < LEVELS.length;
        this.level = hasLevelParam ? startLevel : 0;

        this.shot  = null;
        this.balls = [];

        this.bgSprite = new Sprite(this.graphicAssets.backgrounds.img, new Vector2(0, 0), 0, 2);

        this.livesLabel = new TextLabel(this.lives, new Vector2(60, this.screenHeight - 2), "32px monospace", Color.yellow, "left", "bottom");
        this.scoreLabel = new TextLabel(this.score, new Vector2(170, this.screenHeight - 6), "20px monospace", Color.orange, "right", "bottom");
        this.timerLabel = new TextLabel(this.timer, new Vector2(this.screenHalfWidth + 10, this.screenHeight - 2), "32px monospace", Color.yellow, "left", "bottom");
        this.levelLabel = new TextLabel(String(this.level + 1).padStart(2, '0'), new Vector2(this.screenWidth - 80, this.screenHeight - 2), "32px monospace", Color.yellow, "right", "bottom");

        // ── Input bindings ───────────────────────────────────────────
        Input.ClearMappings();
        Input.RegisterAxis('MoveH', [
            { type: 'key', positive: KEY_RIGHT, negative: KEY_LEFT },
            { type: 'key', positive: KEY_D, negative: KEY_A },
            { type: 'gamepadaxis', stick: 'LS', axis: 0 },
            { type: 'virtualjoystick', id: 'move', axis: 0 }
        ]);

        const shootBindings = [
            { type: 'key', code: KEY_SPACE },
            { type: 'gamepad', code: 'FACE_DOWN' },
            { type: 'virtualbutton', id: 'shoot' }
        ];
        if (!mobileWithTouchScreen) {
            shootBindings.push({ type: 'mouse' });
        }
        Input.RegisterAction('Shoot', shootBindings);

        if (mobileWithTouchScreen) {
            const jsRadius = 45;
            Input.RegisterVirtualJoystick('move', new VirtualJoystick(jsRadius + 15, this.screenHeight - jsRadius - 10, jsRadius));
            
            const btn = new VirtualButton(this.screenWidth - jsRadius - 15, this.screenHeight - jsRadius - 10, jsRadius - 5, '🎯');
            btn.color = new Color(1, 0, 0, 0.2);
            btn.pressedColor = new Color(1, 0, 0, 0.6);
            btn.rimColor = new Color(1, 0, 0, 0.5);
            Input.RegisterVirtualButton('shoot', btn);
        }
        // ─────────────────────────────────────────────────────────────

        if (hasLevelParam) {
            this._startLevel();
        }
        else {
            // Show intro screen: logo drops from the top to the vertical center
            this._introLogoY      = -120;
            this._introLogoTarget = this.screenHalfHeight;
            this.state            = GameState.STATE_INTRO;
        }
    }

    _spawnBall(position, sizeIndex, dirX) {
        const ball = new PangBall(position, this.graphicAssets.balloons.img, sizeIndex, dirX);
        this.AddGameObject(ball);
        this.balls.push(ball);
    }

    _startLevel() {
        // Clean up any existing shot
        if (this.shot) {
            this.Destroy(this.shot);
            this.shot = null;
        }
        // Clean up existing balls
        [...this.balls].forEach(b => this.Destroy(b));
        this.balls = [];

        // Clean up and respawn player
        if (this.player) {
            this.Destroy(this.player);
        }
        this.player = new PangPlayer(new Vector2(
            this.screenHalfWidth - 14,
            this.floorLine - 24
        ), this.graphicAssets.player.img);

        this.AddGameObject(this.player);

        // Reset timer and state
        this.timer = LEVELS[this.level].time;
        this.timerLabel.text = String(Math.ceil(this.timer)).padStart(3, '0');
        this.state = GameState.STATE_PLAYING;

        // Spawn balls for this level
        LEVELS[this.level].balls.forEach(b => {
            this._spawnBall(
                new Vector2(b.x, this.floorLine - BALL_SIZES[b.sizeIndex]),
                b.sizeIndex,
                b.dirX
            );
        });
    }

    // Handles player death: decrements lives and either respawns or ends the game
    PlayerDied() {
        if (this.state !== GameState.STATE_PLAYING)
            return; // guard against double-trigger

        this.lives--;
        this.livesLabel.text = this.lives;

        if (this.lives <= 0) {
            this.state = GameState.STATE_DEAD;
        }
        else {
            this.state = GameState.STATE_RESPAWNING;
            this._respawnTimer = 2;
        }
    }

    // Called by PangBall when it is hit by a shot
    PopBall(ball) {
        // Save spawn data before the ball is destroyed
        const spawnX    = ball.position.x;
        const spawnY    = ball.position.y;
        const sizeIndex = ball.sizeIndex;

        // Destroy the shot
        this.DestroyShot();

        // Remove ball from game
        const idx = this.balls.indexOf(ball);
        if (idx !== -1)
            this.balls.splice(idx, 1);
        this.Destroy(ball);

        this.score += (this.balls.length === 0 ? 200 : 100) * (sizeIndex + 1);
        this.scoreLabel.text = this.score;

        // Spawn two smaller balls at the hit position
        if (sizeIndex < BALL_SIZES.length - 1) {
            const nextSize = sizeIndex + 1;
            this._spawnBall(new Vector2(spawnX, spawnY), nextSize,  1);
            this._spawnBall(new Vector2(spawnX, spawnY), nextSize, -1);
        }

        // Check win condition
        if (this.balls.length === 0) {
            if (this.level + 1 >= LEVELS.length) {
                this.state = GameState.STATE_WIN;
            }
            else {
                this.state = GameState.STATE_LEVEL_WIN;
                this._respawnTimer = 2;
            }
        }
    }

    // Destroy the active shot
    DestroyShot() {
        if (this.shot) {
            this.Destroy(this.shot);
            this.shot = null;
        }
    }

    Update(deltaTime) {
        if (Input.IsKeyDown(KEY_F))
            this.config.collidersOnly = !this.config.collidersOnly;

        switch (this.state) {
            case GameState.STATE_INTRO:
                // Animate logo dropping down
                if (this._introLogoY < this._introLogoTarget) {
                    this._introLogoY = Math.min(
                        this._introLogoY + this._introLogoSpeed * deltaTime,
                        this._introLogoTarget
                    );
                }

                // Any key / mouse click once logo has settled starts the game
                if (this._introLogoY >= this._introLogoTarget &&
                    (Input.keyboard.anyKeyPressed || Input.IsMouseDown())) {
                    this._startLevel();
                }
                break;

            case GameState.STATE_PLAYING:
                super.Update(deltaTime);

                // Countdown timer
                this.timer -= deltaTime;
                this.timerLabel.text = String(Math.ceil(this.timer)).padStart(3, '0');
                if (this.timer <= 0) {
                    this.timer = 0;
                    this.PlayerDied();
                }
            break;

            case GameState.STATE_RESPAWNING:
            case GameState.STATE_LEVEL_WIN:
                this._respawnTimer -= deltaTime;
                if (this._respawnTimer <= 0) {
                    if (this.state === GameState.STATE_LEVEL_WIN) {
                        this.level++;
                        this.levelLabel.text = String(this.level + 1).padStart(2, '0');
                    }
                    this._startLevel();
                }
            break;

            case GameState.STATE_DEAD:
            case GameState.STATE_WIN:
                // Restart on Enter only after game over or final win
                if (Input.IsKeyPressed(KEY_ENTER)) {
                    this.Start();
                }
            break;
        }
    }

    Draw() {
        // Background
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);
        const bgRect = levelBackgroundRects[this.level];
        this.bgSprite.DrawSectionBasicAt(this.renderer, bgRect.x, bgRect.y, bgRect.w, bgRect.h, 0, 0);

        if (this.state === GameState.STATE_INTRO) {
            this._drawIntro();
            return;
        }

        // Floor line
        this.renderer.DrawLine(0, this.floorLine, this.screenWidth, this.floorLine, Color.red, 1);
        // Walls
        this.renderer.DrawLine(this.leftWall, 0, this.leftWall, this.floorLine, Color.red, 1);
        this.renderer.DrawLine(this.rightWall, 0, this.rightWall, this.floorLine, Color.red, 1);
        // Top line
        this.renderer.DrawLine(0, this.topLine, this.screenWidth, this.topLine, Color.red, 1);

        // Game objects (player, shot, balls)
        super.Draw();

        // HUD
        this.livesLabel.Draw(this.renderer);
        this.scoreLabel.Draw(this.renderer);
        this.levelLabel.Draw(this.renderer);
        this.timerLabel.Draw(this.renderer);

        // Overlays
        if (this.state === GameState.STATE_DEAD) {
            this._drawOverlay("GAME OVER", "Press ENTER to restart", new Color(0.8, 0.1, 0.1, 0.75));
        }
        else if (this.state === GameState.STATE_WIN) {
            this._drawOverlay("YOU WIN!", "Press ENTER to play again", new Color(0.1, 0.6, 0.1, 0.75));
        }
        else if (this.state === GameState.STATE_RESPAWNING) {
            this._drawOverlay(`Lives: ${this.lives}`, "Get ready...", new Color(0.8, 0.5, 0.1, 0.75));
        }
        else if (this.state === GameState.STATE_LEVEL_WIN) {
            this._drawOverlay(`Level ${this.level + 1} Clear!`, "Get ready...", new Color(0.1, 0.5, 0.8, 0.75));
        }

        // Virtual controls — always on top (renders nothing on desktop unless forced)
        VirtualControlls.Draw(this.renderer);
    }

    PlayerShot() {
        this.shot = new PangShot(this.player.x);
        this.AddGameObject(this.shot);
    }

    _drawOverlay(title, subtitle, bgColor) {
        this.renderer.DrawFillBasicRectangle(0, this.screenHalfHeight - 70, this.screenWidth, 140, bgColor);
        this.renderer.DrawFillText(title,    this.screenHalfWidth, this.screenHalfHeight - 18, "bold 52px monospace", Color.white, "center", "bottom");
        this.renderer.DrawFillText(subtitle, this.screenHalfWidth, this.screenHalfHeight + 36, "20px monospace",      Color.white, "center", "bottom");
    }

    _drawIntro() {
        const cx = this.screenHalfWidth;
        const y  = this._introLogoY;

        // Logo shadow
        this.renderer.DrawFillText("SUPER PANG", cx + 4, y + 4,  "bold 72px monospace", new Color(0, 0, 0, 0.6),    "center", "middle");
        // Logo outer stroke (drawn slightly offset for a thick-border effect)
        this.renderer.DrawFillText("SUPER PANG", cx - 2, y,      "bold 72px monospace", new Color(0.6, 0.1, 0.05),  "center", "middle");
        this.renderer.DrawFillText("SUPER PANG", cx + 2, y,      "bold 72px monospace", new Color(0.6, 0.1, 0.05),  "center", "middle");
        this.renderer.DrawFillText("SUPER PANG", cx,     y - 2,  "bold 72px monospace", new Color(0.6, 0.1, 0.05),  "center", "middle");
        this.renderer.DrawFillText("SUPER PANG", cx,     y + 2,  "bold 72px monospace", new Color(0.6, 0.1, 0.05),  "center", "middle");
        // Logo fill
        this.renderer.DrawFillText("SUPER PANG", cx,     y,      "bold 72px monospace", new Color(1.0, 0.85, 0.1),  "center", "middle");

        // "Press any key" prompt — only shown once the logo has settled
        if (this._introLogoY >= this._introLogoTarget) {
            this.renderer.DrawFillText("Press any key to start", cx, y + 60, "20px monospace", Color.white, "center", "middle");
        }
    }
}

// -------------------------------------------------------
// PangPlayer - the player character
// -------------------------------------------------------
class PangPlayer extends SSAnimationObjectComplex {
    constructor(position, img) {
        super(position, img, 2, img, [
            [
                // new Rect( 0, 0, 32, 34),
                // new Rect(32, 0, 32, 34),
                // new Rect(64, 0, 32, 34),
                // new Rect(96, 0, 32, 34),
                new Rect(127, 0, 32, 34),
                // new Rect(159, 0, 32, 34)
            ], // idle

            [   // walk
                new Rect( 0, 0, 32, 34),
                new Rect(32, 0, 32, 34),
                new Rect(64, 0, 32, 34),
                new Rect(96, 0, 32, 34)
            ],
            [   // shot
                new Rect(159, 0, 32, 34),
                new Rect(127, 0, 32, 34)
            ]
        ], [1/1, 1/6, 1/2]);

        this.width  = 28;
        this.height = 44;
        this.speed  = 240;
        this.color  = Color.blue;
        this.alive  = true;

        this.collider = null;

        this.shotTime = 0.24; // time the player is freze after a shot
        this.timeSinceLastShot = 0;
    }

    Start() {
        // Create collider with zero-offset so UpdateFromGO works correctly
        this.collider = new RectangleCollider(Vector2.Zero(), this.width, this.height, this);
        game.AddCollider(this.collider);

        this.timeSinceLastShot = this.shotTime;

        this.PlayAnimationLoop(0, false);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (!this.alive)
            return;

        this.timeSinceLastShot += deltaTime;

        let move = Input.GetAxis('MoveH');

        if (this.timeSinceLastShot >= this.shotTime) {
            // move when not shooting
            this.position.x += move * this.speed * deltaTime;

            if (move > 0.1) {
                this.flipX = true;
                this.PlayAnimationLoop(1, false);
             }
            else if (move < -0.1) {
                this.flipX = false;
                this.PlayAnimationLoop(1, false);
            }
            else
                this.PlayAnimationLoop(0, false);
        }

        // Clamp to play area bounds
        this.position.x = Math.max(game.leftWall + this.width * 0.5, Math.min(this.position.x, game.rightWall - this.width * 0.5));

        // Fire shot
        if (Input.GetAction('Shoot') && !game.shot && this.timeSinceLastShot >= this.shotTime) {
            this.timeSinceLastShot = 0;
            game.PlayerShot();
            this.PlayAnimationLoop(2);
        }

        super.Update(deltaTime); // updates collider
    }

    Draw(renderer) {
        // const headR = this.width * 0.5;
        // Body
        // renderer.DrawFillRectangle(this.position.x, this.position.y, this.width, this.height, this.color);
        // Head
        // renderer.DrawFillCircle(this.position.x, this.position.y - this.height * 0.5, headR, Color.pink);

        super.Draw(renderer);
    }

    OnCollisionEnter(myCollider, otherCollider) {
        // if (otherCollider.go instanceof PangBall) {
        //     this.alive = false;
        //     game.PlayerDied();
        // }
    }
}

// -------------------------------------------------------
// PangShot - the harpoon/wire shot upward by the player
// -------------------------------------------------------
class PangShot extends GameObject {

    static _darkYellow     = new Color(0.55, 0.45, 0.0);
    static _lightYellow    = new Color(1.0 , 0.95, 0.4);
    static _arrowheadColor = new Color(1.0 , 0.85, 0.1);

    constructor(x) {
        super(new Vector2(x, game.floorLine));
        this.width  = 4;
        this.top    = game.floorLine - 10; // current top of the wire
        this.speed  = 600;
        this._shotX = x;

        this.collider = null;
    }

    Start() {
        const wireHeight = game.floorLine - this.top;
        const wireCenterY = this.top + wireHeight * 0.5;
        this.position.x = this._shotX - this.width * 0.5;
        this.collider = new RectangleCollider(Vector2.Zero(), this.width, wireHeight, this);
        game.AddCollider(this.collider);
    }

    Update(deltaTime) {
        this.top -= this.speed * deltaTime;
        if (this.top <= game.topLine) {
            this.top = game.topLine;
            game.DestroyShot();
        }
        // Update the position manually to cover the wire from top to bottom
        const wireHeight = game.floorLine - this.top;
        const wireCenterY = this.top + wireHeight * 0.5;

        this.position.y = wireCenterY;
        this.collider.height = wireHeight;

        super.Update(deltaTime); // updates collider
    }

    Draw(renderer) {
        const x       = this._shotX;
        const wireTop = this.top + 10; // wire starts just below the arrowhead
        const wireH   = game.floorLine - wireTop;

        // Wire: dark outer strip + bright center for a 3D cable look
        renderer.DrawFillBasicRectangle(x - 2, wireTop, 4, wireH, PangShot._darkYellow);
        renderer.DrawFillBasicRectangle(x - 1, wireTop, 2, wireH, PangShot._lightYellow);

        // Arrowhead triangle at the tip
        renderer.DrawPolygon([
            { x: x,     y: this.top },
            { x: x - 5, y: this.top + 10 },
            { x: x + 5, y: this.top + 10 }
        ], PangShot._darkYellow, 1, true, PangShot._arrowheadColor);
    }

    OnCollisionEnter(myCollider, otherCollider) {
        // Handled from PangBall side
    }
}

// -------------------------------------------------------
// PangBall - a bouncing ball that splits when hit
// -------------------------------------------------------
class PangBall extends SpriteObject {

    static _spriteSections = [
        {x: 2, y: 8, w: 64, h: 52},
        {x: 67, y: 13, w: 48, h: 40},
        {x: 116, y: 20, w: 32, h: 26},
        {x: 149, y: 26, w: 16, h: 12},
    ];

    // sizeIndex: 0=large, 1=medium, 2=small, 3=tiny
    constructor(position, img, sizeIndex, dirX) {
        super(position, 0, new Vector2(1.45, 1.75), img);
        this.sizeIndex = sizeIndex;
        this.radius    = BALL_SIZES[sizeIndex];
        this.color     = BALL_COLORS[sizeIndex];
        this.vx        = BALL_SPEEDS[sizeIndex] * dirX;
        this.vy        = BALL_BOUNCEV[sizeIndex] * (this.position.y + game.topLine) / (game.floorLine - game.topLine); // start moving upward (the initial upward momentum is proportional to the spawn height of the ball)

        this.spriteSection = PangBall._spriteSections[this.sizeIndex];

        this.collider = null;
    }

    Start() {
        super.Start();

        this.collider = new CircleCollider(Vector2.Zero(), this.radius, this);
        game.AddCollider(this.collider);
    }

    Update(deltaTime) {
        this.vy += GRAVITY * deltaTime;

        this.position.x += this.vx * deltaTime;
        this.position.y += this.vy * deltaTime;

        const sw = game.rightWall;
        const sh = game.floorLine;

        // Bounce off walls
        if (this.position.x - this.radius < game.leftWall) {
            this.position.x = game.leftWall + this.radius;
            this.vx = Math.abs(this.vx);
        }
        else if (this.position.x + this.radius > sw) {
            this.position.x = sw - this.radius;
            this.vx = -Math.abs(this.vx);
        }

        // Bounce off floor (always bounce back to the same height)
        if (this.position.y + this.radius >= sh) {
            this.position.y = sh - this.radius;
            this.vy = BALL_BOUNCEV[this.sizeIndex];
        }

        // Bounce off ceiling
        if (this.position.y - this.radius < game.topLine) {
            this.position.y = game.topLine + this.radius;
            this.vy = Math.abs(this.vy);
        }

        super.Update(deltaTime); // updates collider
    }

    Draw(renderer) {
        renderer.DrawFillCircle(this.position.x, this.position.y, this.radius, this.color);
        // Highlight
        renderer.DrawFillCircle(
            this.position.x - this.radius * 0.3,
            this.position.y - this.radius * 0.3,
            this.radius * 0.25,
            new Color(1, 1, 1, 0.4)
        );

        super.DrawSection(renderer, this.spriteSection.x, this.spriteSection.y, this.spriteSection.w, this.spriteSection.h);
    }

    OnCollisionEnter(myCollider, otherCollider) {
        if (otherCollider.go instanceof PangShot) {
            game.PopBall(this);
        }
    }
}

// Entry point
window.onload = function() {
    Init(SuperPang);
};
