/**
 * Fighting Game - a spark.js port of an example game built by Chris Courses
 * 1v1 2D fighting game
 * Original project: https://github.com/chriscourses/fighting-game
 */

// ── Fighter Configurations ───────────────────────────────────────────────────

const MACK_CONFIG = {
    scale: 2.5,
    spriteData: {
        idle:    { assetKey: 'mack_idle',    framesMax: 8, pivot: {x: 0, y: 20 } },
        run:     { assetKey: 'mack_run',     framesMax: 8, pivot: {x: 0, y: 20 } },
        jump:    { assetKey: 'mack_jump',    framesMax: 2, pivot: {x: 0, y: 20 } },
        fall:    { assetKey: 'mack_fall',    framesMax: 2, pivot: {x: 0, y: 20 } },
        attack1: { assetKey: 'mack_attack1', framesMax: 6, pivot: {x: 0, y: 20 } },
        attack2: { assetKey: 'mack_attack2', framesMax: 6, pivot: {x: 0, y: 20 } },
        takeHit: { assetKey: 'mack_takeHit', framesMax: 4, pivot: {x: 0, y: 20 } },
        death:   { assetKey: 'mack_death',   framesMax: 6, pivot: {x: 0, y: 20 } }
    },
    bodyCollider: { w: 50, h: 150 },
    attackBox: { offset: { x: 100, y: -50 }, width: 160, height: 50 },
    attackFrame: 4,
    speed: 300,
    jumpSpeed: 1200,
    actions: { left: 'P1_MoveLeft', right: 'P1_MoveRight', jump: 'P1_Jump', attack: 'P1_Attack' }
};

const KENJI_CONFIG = {
    scale: 2.5,
    spriteData: {
        idle:    { assetKey: 'kenji_idle',    framesMax: 4, pivot: {x: 0, y: 26 } },
        run:     { assetKey: 'kenji_run',     framesMax: 8, pivot: {x: 0, y: 26 } },
        jump:    { assetKey: 'kenji_jump',    framesMax: 2, pivot: {x: 0, y: 26 } },
        fall:    { assetKey: 'kenji_fall',    framesMax: 2, pivot: {x: 0, y: 26 } },
        attack1: { assetKey: 'kenji_attack1', framesMax: 4, pivot: {x: 0, y: 26 } },
        attack2: { assetKey: 'kenji_attack2', framesMax: 4, pivot: {x: 0, y: 26 } },
        takeHit: { assetKey: 'kenji_takeHit', framesMax: 3, pivot: {x: 0, y: 26 } },
        death:   { assetKey: 'kenji_death',   framesMax: 7, pivot: {x: 0, y: 26 } }
    },
    bodyCollider: { w: 50, h: 150 },
    attackBox: { offset: { x: -170, y: -50 }, width: 170, height: 50 },
    attackFrame: 2,
    speed: 300,
    jumpSpeed: 1200,
    actions: { left: 'P2_MoveLeft', right: 'P2_MoveRight', jump: 'P2_Jump', attack: 'P2_Attack' }
};

// ── FightingGame Class ───────────────────────────────────────────────────────

class FightingGame extends Game {
    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth: 1024,
            screenHeight: 576,
            imageSmoothingEnabled: false,
            drawColliders: true,
            // collidersOnly: true
        });

        this.graphicAssets = {
            background: { path: './src/examples/fighting_game/assets/background.png', img: null },
            shop:       { path: './src/examples/fighting_game/assets/shop.png',       img: null },

            kenji_idle:    { path: './src/examples/fighting_game/assets/kenji/Idle.png',     img: null },
            kenji_run:     { path: './src/examples/fighting_game/assets/kenji/Run.png',      img: null },
            kenji_jump:    { path: './src/examples/fighting_game/assets/kenji/Jump.png',     img: null },
            kenji_fall:    { path: './src/examples/fighting_game/assets/kenji/Fall.png',     img: null },
            kenji_attack1: { path: './src/examples/fighting_game/assets/kenji/Attack1.png',  img: null },
            kenji_attack2: { path: './src/examples/fighting_game/assets/kenji/Attack2.png',  img: null },
            kenji_takeHit: { path: './src/examples/fighting_game/assets/kenji/TakeHit.png', img: null },
            kenji_death:   { path: './src/examples/fighting_game/assets/kenji/Death.png',    img: null },
            
            mack_idle:    { path: './src/examples/fighting_game/assets/samuraiMack/Idle.png',    img: null },
            mack_run:     { path: './src/examples/fighting_game/assets/samuraiMack/Run.png',     img: null },
            mack_jump:    { path: './src/examples/fighting_game/assets/samuraiMack/Jump.png',    img: null },
            mack_fall:    { path: './src/examples/fighting_game/assets/samuraiMack/Fall.png',    img: null },
            mack_attack1: { path: './src/examples/fighting_game/assets/samuraiMack/Attack1.png', img: null },
            mack_attack2: { path: './src/examples/fighting_game/assets/samuraiMack/Attack2.png', img: null },
            mack_takeHit: { path: './src/examples/fighting_game/assets/samuraiMack/TakeHit-whitesilhouette.png', img: null },
            mack_death:   { path: './src/examples/fighting_game/assets/samuraiMack/Death.png',   img: null },
        }
        
        // Game state
        this.gameOver = false;
        this.uiShown = false;
        this.gameWinner = null;
        this.matchTime = 600;
        this.matchTimeDisplay = 60;

        this.ui = null;

        // Background objects
        this.bgLayer = null;
        this.shopLayer = null;
        this.bgLayers = null;

        this.player = null;
        this.enemy  = null;
        this.rect = null; // a red rectangle to test the camera

        this.floorY = 0;// this.screenHeight - 96
        this.gravity = 2500;

        this.camera = null;
    }
    
    Start() {
        super.Start();

        // Initialize our UI manager
        this.ui = new FightingUI(this, canvas);
        this.ui.Start();

        // Setup input system
        this.SetupInput();

        this.floorY = this.screenHeight - 96;

        this.rect = new RectangleGO(new Vector2(this.screenHalfWidth, this.floorY), 40, 80, Color.red);
        this.rect.pivot.y = 40;
        this.AddGameObject(this.rect);

        this.camera = new FollowCamera(Vector2.Copy(this.rect.position), this.rect, -100, 100, 160, 200, 5, new Vector2(0, -this.screenHalfHeight + 96));
        this.camera.Start();
        
        // Initialize background
        const colorLayer = new ColorRectangleLayer(Color.FromHex('#61536d'), Vector2.Zero(), this.screenWidth, this.screenHeight);
        this.bgLayer = new SpriteBackgroundLayer(this.graphicAssets.background.img, Vector2.Zero(), 0, 1, new Vector2(1, 1));
        // this.shopLayer = new SpriteBackgroundLayer(this.graphicAssets.shop.img, new Vector2(600, 128), 0, 2.75, new Vector2(0.95, 0.98));
        this.shopLayer = new GameObjectBackgroundLayer(
            new Vector2(600 + 176, 128 + 176),
            new SSAnimationObjectBasic(
                Vector2.Zero(),
                0, 2.75,
                this.graphicAssets.shop.img,
                118, 128, [6], 1/12
            ),
            new Vector2(0.95, 0.98)
        );
        this.bgLayers = new BackgroundLayers(this.camera, [colorLayer, this.bgLayer, this.shopLayer]);
        this.bgLayers.Start();

        // Create Player 1 - Samurai Mack
        this.player = new Fighter(new Vector2(50, 330), MACK_CONFIG);
        this.AddGameObject(this.player);

        // Create Player 2 - Kenji
        this.enemy = new Fighter(new Vector2(900, 330), KENJI_CONFIG);
        this.AddGameObject(this.enemy);
        
        // Start match timer
        this.StartMatchTimer();
    }
    
    Update(deltaTime) {

        // move the red rectangle to the middle between both players
        this.rect.position.Set(
            (this.player.position.x + this.enemy.position.x) / 2,
            (this.player.position.y + this.enemy.position.y) / 2
        );

        // debug move the red rectangle
        // const rectSpeed = 200;
        // if (Input.IsKeyPressed(KEY_A))
        //     this.rect.position.x -= rectSpeed * deltaTime;
        // if (Input.IsKeyPressed(KEY_D))
        //     this.rect.position.x += rectSpeed * deltaTime;
        // if (Input.IsKeyPressed(KEY_W))
        //     this.rect.position.y -= rectSpeed * deltaTime;
        // if (Input.IsKeyPressed(KEY_S))
        //     this.rect.position.y += rectSpeed * deltaTime;

        super.Update(deltaTime);

        this.bgLayers.Update(deltaTime);

        this.camera.Update(deltaTime);
        
        if (this.gameOver && !this.uiShown) {
            // If a player was defeated, wait for their death animation to finish before showing the UI
            if ((this.player.health <= 0 && this.player.dead) || 
                (this.enemy.health <= 0 && this.enemy.dead)) {
                this.EndMatch();
            }
        }
    }

    Draw() {
        this.camera.PreDraw(this.renderer);

        this.bgLayers.Draw(this.renderer);
        
        super.Draw();

        this.camera.PostDraw(this.renderer);
    }

    OnFighterHit(defender) {
        this.ui.UpdateHealthBars(this.player.health, this.enemy.health);
        
        // Check win conditions
        if (defender.health <= 0) {
            this.gameOver = true; // Stop the timer and inputs immediately
        }
    }

    SetupInput() {
        // Player 1 actions: WASD + Space
        Input.RegisterAction('P1_MoveLeft', [{ type: 'key', code: KEY_A }]);
        Input.RegisterAction('P1_MoveRight', [{ type: 'key', code: KEY_D }]);
        Input.RegisterAction('P1_Jump', [{ type: 'key', code: KEY_W }]);
        Input.RegisterAction('P1_Attack', [{ type: 'key', code: KEY_SPACE }]);
        
        // Player 2 actions: Arrow Keys + down to attack
        Input.RegisterAction('P2_MoveLeft', [{ type: 'key', code: KEY_LEFT }]);
        Input.RegisterAction('P2_MoveRight', [{ type: 'key', code: KEY_RIGHT }]);
        Input.RegisterAction('P2_Jump', [{ type: 'key', code: KEY_UP }]);
        Input.RegisterAction('P2_Attack', [{ type: 'key', code: KEY_DOWN }]);
    }
    
    /**
     * Start the 60-second match timer using engine timers
     */
    StartMatchTimer() {
        const tickTimer = () => {
            if (this.matchTime > 0 && !this.gameOver) {
                this.matchTime--;
                this.matchTimeDisplay = this.matchTime;
                this.ui.UpdateTimerDisplay(this.matchTimeDisplay);
                this.Invoke(tickTimer, 1.0);
            }
            else if (!this.gameOver) {
                this.EndMatch();
            }
        };
        tickTimer();
    }
    
    /**
     * End the match and determine winner
     */
    EndMatch() {
        this.gameOver = true;
        this.uiShown = true;
        
        let message = 'Tie';
        if (this.player.health > this.enemy.health) {
            message = 'Player 1 Wins';
        }
        else if (this.enemy.health > this.player.health) {
            message = 'Player 2 Wins';
        }
        
        this.ui.ShowEndMatchText(message);
    }
}

window.onload = () => {
    Init(FightingGame, "canvas");
};