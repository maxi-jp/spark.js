class BouncingRectangleGO extends RectangleGO {
    constructor(position, width, height, color, velocity) {
        super(position, width, height, color);
        this.velocity = velocity;
        this.rotationSpeed = RandomBetweenFloat(-2, 2);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // Move the object
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.rotation += this.rotationSpeed * deltaTime;

        // Bounce off the screen edges
        if (this.position.x - this.width / 2 < 0) {
            this.position.x = this.width / 2;
            this.velocity.x *= -1;
        }
        if (this.position.x + this.width / 2 > game.screenWidth) {
            this.position.x = game.screenWidth - this.width / 2;
            this.velocity.x *= -1;
        }
        if (this.position.y - this.height / 2 < 0) {
            this.position.y = this.height / 2;
            this.velocity.y *= -1;
        }
        if (this.position.y + this.height / 2 > game.screenHeight) {
            this.position.y = game.screenHeight - this.height / 2;
            this.velocity.y *= -1;
        }
    }
}

class BouncingSpriteGO extends SpriteObject {
    constructor(position, img, velocity) {
        super(position, 0, 1, img, RandomBetweenFloat(0.5, 1.0));
        this.velocity = velocity;
        this.rotationSpeed = RandomBetweenFloat(-2, 2);
        this.randomScaleSeed = Math.random() * 500;
        this.randomScaleSize = Math.random() * 4;

        this.width = img.width;
        this.height = img.height;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // Move the object
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.rotation += this.rotationSpeed * deltaTime;
        
        this.scale = Math.sin(totalTime + this.randomScaleSeed) * this.randomScaleSize;

        // Bounce off the screen edges
        if (this.position.x - this.width / 2 < 0) {
            this.position.x = this.width / 2;
            this.velocity.x *= -1;
        }
        if (this.position.x + this.width / 2 > game.screenWidth) {
            this.position.x = game.screenWidth - this.width / 2;
            this.velocity.x *= -1;
        }
        if (this.position.y - this.height / 2 < 0) {
            this.position.y = this.height / 2;
            this.velocity.y *= -1;
        }
        if (this.position.y + this.height / 2 > game.screenHeight) {
            this.position.y = game.screenHeight - this.height / 2;
            this.velocity.y *= -1;
        }
    }
}

class PerformanceTest extends Game {
    constructor(renderer) {
        super(renderer);

        this.config = {
            imageSmoothingEnabled: false,
            drawColliders: false
        };

        this.numObjects = 4000; // High number of objects to stress the renderer
        this.infoLabel = null;
    }

    Start() {
        super.Start();

        const rendererType = this.renderer instanceof WebGLRenderer ? "WebGL" : "2D Canvas";
        this.infoLabel = new TextLabel(
            `${rendererType} - ${this.numObjects} objects`,
            new Vector2(this.screenHalfWidth, 20),
            "16px monospace",
            Color.white, "center", "middle"
        );
    }

    Draw() {
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.darkGrey);
        super.Draw();
        this.infoLabel.Draw(this.renderer);
    }
}

class PerformanceTestRectangles extends PerformanceTest {
    constructor(renderer) {
        super(renderer);
    }

    Start() {
        super.Start();

        for (let i = 0; i < this.numObjects; i++) {
            const size = RandomBetweenInt(10, 40);
            const position = new Vector2(
                RandomBetweenFloat(size, this.screenWidth - size),
                RandomBetweenFloat(size, this.screenHeight - size)
            );
            const velocity = new Vector2(RandomBetweenFloat(-150, 150), RandomBetweenFloat(-150, 150));
            const color = Color.Random();
            color.a = RandomBetweenFloat(0.5, 1.0); // Test alpha blending

            this.AddGameObject(new BouncingRectangleGO(position, size, size, color, velocity));
        }
    }
}

class PerformanceTestSprites extends PerformanceTest {
    constructor(renderer) {
        super(renderer);

        this.graphicAssets = {
            snake: {
                path: "src/examples/common_assets/snake.png",
                img: null
            }
        };
    }

    Start() {
        super.Start();

        const width = this.graphicAssets.snake.img.width;
        const height = this.graphicAssets.snake.img.height;

        for (let i = 0; i < this.numObjects; i++) {
            const position = new Vector2(
                RandomBetweenFloat(width, this.screenWidth - width),
                RandomBetweenFloat(height, this.screenHeight - height)
            );
            const velocity = new Vector2(RandomBetweenFloat(-150, 150), RandomBetweenFloat(-150, 150));

            this.AddGameObject(new BouncingSpriteGO(position, this.graphicAssets.snake.img, velocity));
        }
    }
}