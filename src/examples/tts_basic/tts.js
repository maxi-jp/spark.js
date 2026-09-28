class TTS extends Game {
    constructor(renderer) {
        super(renderer);
        this.graphicAssets = {
            ships: {
                path: "src/examples/tts/assets/simpleSpace_sheet.png",
                img: null
            },
            crosshair: {
                path: "src/examples/tts/assets/crosshair060.png",
                img: null
            }
        };

        // background gradient
        this.bgGrad = null;

        this.mouseCircle = null;
        this.player = null;
        this.enemies = [];
        this.camera = null;

        this.sceneLimits = new Rectangle(Vector2.Zero(), 800, 640, Color.white, true, 2);

        this.timeToSpawnEnemy = 1;
        this.timeToSpawnEnemyAux = 0;
        this.enemiesSpawnPoints = [
            new Vector2(50, 50),
            new Vector2(this.sceneLimits.width - 50, 50),
            new Vector2(50, this.sceneLimits.height - 50),
            new Vector2(this.sceneLimits.width - 50, this.sceneLimits.height - 50),
            new Vector2(this.sceneLimits.width / 2, 50),
            new Vector2(this.sceneLimits.width / 2, this.sceneLimits.height - 50)
        ]

        this.playerScore = 0;
        this.playerScoreLabel = new TextLabel("0", new Vector2(this.screenWidth / 2, 50), "40px Comic Sans MS", "white", "center", "bottom");
    }

    Start() {
        super.Start();

        // configure background gradient
        this.bgGrad = new LinearGradient(this.renderer, new Vector2(0, 1), [
            [0, "#191200"],
            [0.1, "#000000"],
            [0.35, "#07073e"],
            [0.95, "#22375e"],
            [1, "#274f98"]
        ]);

        this.mouseCircle = new Circle(new Vector2(0, 0), 5, Color.red, 1);

        this.player = new PlayerShip(new Vector2(this.screenWidth / 2, this.screenHeight / 2), 0, 1, this.graphicAssets.ships.img, this.sceneLimits);

        this.camera = new FollowCameraBasic(Vector2.Zero(), this.player);
        this.camera.Start();

        this.AddGameObject(this.player);

        // initialize the starting enemies
        this.enemies = [];
        const enemy = new EnemyAsteroid(new Vector2(50, 50), this.graphicAssets.ships.img, this.player, this.sceneLimits, new Vector2(2, 1), false);
        this.AddEnemy(enemy);
    }

    Update(deltaTime) {
        // update the game objects
        super.Update(deltaTime);

        // update the camera
        this.camera.Update(deltaTime);

        this.mouseCircle.position.Set(Input.mouse.x, Input.mouse.y);

        // check bullets-enemies collisions
        const bullets = this.player.bulletPool.objects;
        for (let i = 0; i < bullets.length; i++) {
            const bullet = bullets[i];
            if (bullet.active) {
                for (let j = 0; j < this.enemies.length; j++) {
                    // check bullets[i] - enemies[j] collision
                    const collision = CheckPointInsideCircle(bullet.position.x, bullet.position.y, this.enemies[j].position, this.enemies[j].boundingRadious2);

                    if (collision) {
                        if (this.enemies[j].Damage(bullet.damage)) {
                            this.playerScore += this.enemies[j].score;
                            this.playerScoreLabel.text = this.playerScore;

                            this.RemoveEnemy(this.enemies[j], j);

                            bullet.active = false;
                            break; // exit the bullets loop
                        }
                    }
                }
            }
        }

        // check player enemies collisions
        for (let i = 0; i < this.enemies.length; i++) {
            const difX = this.enemies[i].position.x - this.player.position.x;
            const difY = this.enemies[i].position.y - this.player.position.y;
            let pointToCircleDistance2 = difX * difX + difY * difY;

            if(pointToCircleDistance2 < this.enemies[i].boundingRadious2 + this.player.boundingRadious2) {
                this.playerScore -= this.enemies[i].score;
                this.playerScoreLabel.text = this.playerScore;
                this.RemoveEnemy(this.enemies[i], i);
            }

        }

        // enemy spawning
        this.timeToSpawnEnemyAux += deltaTime;
        if (this.timeToSpawnEnemyAux >= this.timeToSpawnEnemy) {
            this.timeToSpawnEnemyAux = 0;
            this.SpawnRandomEnemy();
        }
    }

    Draw() {
        // background
        this.renderer.DrawGradientRectangle(0, 0, this.screenWidth, this.screenHeight, this.bgGrad);

        this.camera.PreDraw(this.renderer);

        // background grid
        // horizontal lines
        const verticalStep = 50;
        const horizontalLines = this.sceneLimits.height / verticalStep;
        for (let i = 0; i < horizontalLines; i++) {
            this.renderer.DrawLine(this.sceneLimits.position.x, this.sceneLimits.position.y + verticalStep * i, this.sceneLimits.position.x + this.sceneLimits.width, this.sceneLimits.position.y + verticalStep * i, Color.grey, 1);
        }
        // vertical lines
        const horizontalStep = 50;
        const verticalLines = this.sceneLimits.width / horizontalStep;
        for (let i = 0; i < verticalLines; i++) {
            this.renderer.DrawLine(this.sceneLimits.position.x + horizontalStep * i, this.sceneLimits.position.y, this.sceneLimits.position.x + horizontalStep * i, this.sceneLimits.position.y + this.sceneLimits.height, Color.grey, 1);
        }

        this.sceneLimits.Draw(renderer);

        // draw the game objects
        super.Draw();

        this.camera.PostDraw(this.renderer);

        // draw the mouse position
        this.mouseCircle.Draw(renderer);

        this.playerScoreLabel.Draw(renderer);
    }

    AddEnemy(enemy) {
        this.enemies.push(enemy);
        this.AddGameObject(enemy);
    }

    RemoveEnemy(enemy, index) {
        if (index === undefined) {
            this.enemies.splice(this.enemies.indexOf(enemy), 1);
            this.gameObjects.splice(this.gameObjects.indexOf(enemy), 1);
        }
        else {
            this.gameObjects.splice(this.gameObjects.indexOf(this.enemies[index]), 1);
            this.enemies.splice(index, 1);
        }
    }

    SpawnRandomEnemy() {
        const random = Math.random();
        let enemy = null;
        const spawnPoint = this.enemiesSpawnPoints[RandomBetweenInt(0, this.enemiesSpawnPoints.length - 1)];
        if (random < 0.33) {
            enemy = new Enemy(spawnPoint, this.graphicAssets.ships.img, this.player, this.sceneLimits);
        }
        else if (random < 0.66) {
            enemy = new EnemyKamikaze(spawnPoint, this.graphicAssets.ships.img, this.player, this.sceneLimits);
        }
        else {
            enemy = new EnemyAsteroid(spawnPoint, this.graphicAssets.ships.img, this.player, this.sceneLimits);
        }

        this.timeToSpawnEnemy *= 0.97;
        if (this.timeToSpawnEnemy < 0.15)
            this.timeToSpawnEnemy = 0.15

        this.AddEnemy(enemy);
    }
}

window.onload = () => {
    Init(TTS);
}