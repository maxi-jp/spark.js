class DinoGame extends Game {
    constructor(renderer) {
        super(renderer);

        this.graphicAssets = {
            dino: {
                img: null,
                path: "src/examples/dino/assets/dino.png",
            },
            dino_ss: {
                img: null,
                path: "src/examples/dino/assets/dino_ss.png",
            }
        }

        this.groundY = 160;
        this.player = null; // will be a SpriteObject-based PlayerDino
        this.obstacles = [];
        this.obstacleTimer = 0;
        this.minObstacleInterval = 0.9;
        this.maxObstacleInterval = 1.8;
        this.nextObstacleInterval = 1.2;
        this.scrollSpeed = 260;
        this.baseSpeed = 260;
        this.speedIncreasePerSecond = 8;

        this.score = 0;
        this.highScore = 0;
        this.scoreLabel = null;
        this.highScoreLabel = null;

        this.gameOver = false;
        this.started = false;

        this.jumpKeyLatch = false;

        this.Restart();
    }

    Start() {
        super.Start();

        this.Restart();
    }

    Restart() {
        // Clear any existing game objects
        this.DestroyAllGameObjects();

        // Create player using engine GameObject / SpriteObject pattern
        this.player = new PlayerDino(new Vector2(60, this.groundY - 46), this.graphicAssets.dino_ss.img);
        this.player.groundY = this.groundY;
        this.AddGameObject(this.player);

        this.obstacles = [];
        this.obstacleTimer = 0;
        this.nextObstacleInterval = 1.2;
        this.scrollSpeed = this.baseSpeed;
        this.score = 0;
        this.gameOver = false;
        this.started = false;

        try {
            this.highScore = parseInt(localStorage.getItem("dino_highscore") || "0");
        } catch (e) {
            this.highScore = 0;
        }

        this.scoreLabel = new TextLabel("Score: 0", new Vector2(10, 20), "18px Comic Sans MS", Color.black, "left", "middle", false);
        this.highScoreLabel = new TextLabel("Hi: " + this.highScore, new Vector2(10, 40), "16px Comic Sans MS", Color.darkGrey, "left", "middle", false);
    }

    HandleInputStartOrJump() {
        if (!this.started) {
            this.started = true;
            return;
        }
        if (this.player.onGround) {
            this.player.vy = this.player.jumpSpeed;
            this.player.onGround = false;
        }
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (!this.started) {
            if (Input.IsKeyDown(KEY_SPACE) || Input.IsKeyDown(KEY_UP) || Input.IsMouseDown()) {
                this.HandleInputStartOrJump();
            }
            return;
        }

        if (this.gameOver) {
            if (Input.IsKeyDown(KEY_SPACE) || Input.IsMouseDown()) {
                this.Restart();
            }
            return;
        }

        if (Input.IsKeyDown(KEY_SPACE) || Input.IsKeyDown(KEY_UP) || Input.IsMouseDown()) {
            if (!this.jumpKeyLatch) {
                this.HandleInputStartOrJump();
                this.jumpKeyLatch = true;
            }
        } else {
            this.jumpKeyLatch = false;
        }

        this.scrollSpeed += this.speedIncreasePerSecond * deltaTime;

        // Player physics
        this.player.vy += this.player.gravity * deltaTime;
        this.player.position.y += this.player.vy * deltaTime;
        if (this.player.position.y >= this.groundY - this.player.height) {
            this.player.position.y = this.groundY - this.player.height;
            this.player.vy = 0;
            this.player.onGround = true;
        }

        // Obstacles spawn and movement
        this.obstacleTimer += deltaTime;
        if (this.obstacleTimer >= this.nextObstacleInterval) {
            this.obstacleTimer = 0;
            this.SpawnObstacle();
            const t = Math.max(0.2, 1.5 - this.score * 0.002);
            this.nextObstacleInterval = RandomBetweenFloat(this.minObstacleInterval * t, this.maxObstacleInterval * t);
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.scrollSpeed * deltaTime;
            if (obs.x + obs.w < -10) {
                this.obstacles.splice(i, 1);
                continue;
            }

            if (this.RectsOverlap(this.player, obs)) {
                this.OnGameOver();
            }
        }

        this.score += this.scrollSpeed * deltaTime * 0.05;
        this.scoreLabel.text = "Score: " + Math.floor(this.score).toString();
        this.highScoreLabel.text = "Hi: " + this.highScore;
    }

    RectsOverlap(a, b) {
        // a is PlayerDino (GameObject), b is obstacle rect
        const ax = a.position.x;
        const ay = a.position.y;
        const aw = a.width;
        const ah = a.height;
        return !(ax + aw < b.x || ax > b.x + b.w || ay + ah < b.y || ay > b.y + b.h);
    }

    SpawnObstacle() {
        const kind = Math.random();
        if (kind < 0.5) {
            const h = RandomBetweenInt(30, 60);
            const w = RandomBetweenInt(16, 30);
            const x = this.screenWidth + 20;
            const y = this.groundY - h;
            this.obstacles.push({ x, y, w, h });
        } else {
            const h = RandomBetweenInt(30, 50);
            const w = RandomBetweenInt(50, 80);
            const x = this.screenWidth + 40;
            const y = this.groundY - h;
            this.obstacles.push({ x, y, w, h });
        }
    }

    OnGameOver() {
        this.gameOver = true;
        const intScore = Math.floor(this.score);
        if (intScore > this.highScore) {
            this.highScore = intScore;
            try {
                localStorage.setItem("dino_highscore", this.highScore.toString());
            } catch (e) {}
        }
    }

    Draw() {
        // clear with white
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.white);

        // ground line
        this.renderer.DrawStrokeBasicRectangle(0, this.groundY, this.screenWidth, 1, Color.black, 2);

        // let Game base draw any GameObjects (player)
        super.Draw();

        // obstacles
        for (const obs of this.obstacles) {
            this.renderer.DrawFillBasicRectangle(obs.x, obs.y, obs.w, obs.h, Color.black);
        }

        // score labels
        this.scoreLabel.Draw(this.renderer);
        this.highScoreLabel.Draw(this.renderer);

        if (!this.started) {
            this.renderer.DrawText("Press SPACE, UP or click/tap to start", this.screenHalfWidth, 60, "16px Comic Sans MS", Color.darkGrey, "center", "middle");
        } else if (this.gameOver) {
            this.renderer.DrawText("Game Over - press SPACE or click to restart", this.screenHalfWidth, 60, "16px Comic Sans MS", Color.black, "center", "middle");
        }
    }
}

// Simple player GameObject using SpriteObject as base for future sprite-based animations
// class PlayerDino extends SpriteObject {
//     constructor(position, img) {
//         // For now we don't use an actual image; pass null and draw a rectangle in Draw()
//         super(position, 0, 0.4, img, 1.0);

//         this.pivot = {x: -50, y: -50}; // top-left corner pivot

//         this.width = 40;
//         this.height = 46;

//         this.vy = 0;
//         this.gravity = 1700;
//         this.jumpSpeed = -560;
//         this.onGround = true;
//         this.groundY = 160;
//     }

//     get x() { return this.position.x; }
//     get y() { return this.position.y; }

//     Draw(renderer) {
//         // Temporarily ignore sprite image and just draw a black rectangle
//         // renderer.DrawFillBasicRectangle(this.position.x, this.position.y, this.width, this.height, Color.black);

//         super.Draw(renderer);
//     }
// }

// A more complex player GameObject using SSAnimationObjectBasic as base for future sprite-based animations
class PlayerDino extends SSAnimationObjectBasic {
    constructor(position, img) {
        // For now we don't use an actual image; pass null and draw a rectangle in Draw()
        super(position, 0, 0.4, img, 192, 192, [2], 1/8);

        this.pivot = {x: -50, y: -50}; // top-left corner pivot

        this.width = 40;
        this.height = 46;

        this.vy = 0;
        this.gravity = 1700;
        this.jumpSpeed = -560;
        this.onGround = true;
        this.groundY = 160;
    }

    get x() { return this.position.x; }
    get y() { return this.position.y; }

    Draw(renderer) {
        // Temporarily ignore sprite image and just draw a black rectangle
        // renderer.DrawFillBasicRectangle(this.position.x, this.position.y, this.width, this.height, Color.black);

        super.Draw(renderer);
    }
}