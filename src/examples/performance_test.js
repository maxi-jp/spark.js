class PerformanceTest extends Game {
    constructor(renderer) {
        super(renderer);

        this.config = {
            imageSmoothingEnabled: false,
            drawColliders: false
        };

        this.numObjects = 1000;
        this._step = 100;        // objects added/removed per key press
        this._holdTimer = 0;     // time accumulator for held-key repeat
        this._holdDelay = 0.45;  // seconds before held-key repeat starts
        this._holdRate  = 0.08;  // seconds between repeat ticks
        this.infoLabel = null;
    }

    Start() {
        super.Start();

        const rendererType = this.renderer instanceof WebGLRenderer ? "WebGL" : "2D Canvas";
        this.infoLabel = new TextLabel(
            `${rendererType} - ${this.numObjects} objects  [↑/↓ or wheel to adjust]`,
            new Vector2(this.screenHalfWidth, 20),
            "16px monospace",
            Color.white, "center", "middle"
        );

        for (let i = 0; i < this.numObjects; i++)
            this.AddGameObject(this._spawnObject());
    }

    /** Override in each subclass to return a new game object. */
    _spawnObject() { return null; }

    _addObjects(count) {
        for (let i = 0; i < count; i++)
            this.AddGameObject(this._spawnObject());

        this.numObjects = this.gameObjects.length;
        this._updateLabel();
    }

    _removeObjects(count) {
        const remove  = Math.min(count, this.gameObjects.length);
        const targets = this.gameObjects.slice(-remove);
        targets.forEach(go => this.Destroy(go));
        this.numObjects = Math.max(0, this.gameObjects.length - remove);
        this._updateLabel();
    }

    _updateLabel() {
        const rendererType = this.renderer instanceof WebGLRenderer ? "WebGL" : "2D Canvas";
        this.infoLabel.text = `${rendererType} - ${this.numObjects} objects  [↑/↓ or wheel to adjust]`;
    }

    Update(deltaTime) {
        const up   = Input.IsKeyPressed(KEY_UP)   || Input.IsKeyPressed(KEY_RIGHT);
        const down = Input.IsKeyPressed(KEY_DOWN)  || Input.IsKeyPressed(KEY_LEFT);

        if (up || down) {
            this._holdTimer += deltaTime;
            const threshold = this._holdTimer < this._holdDelay + this._holdRate
                ? this._holdDelay
                : this._holdRate;

            if (this._holdTimer >= threshold) {
                this._holdTimer -= threshold;
                if (up)   this._addObjects(this._step);
                if (down) this._removeObjects(this._step);
            }
        }
        else {
            this._holdTimer = 0;
        }

        if (Input.IsKeyDown(KEY_UP)   || Input.IsKeyDown(KEY_RIGHT)) this._addObjects(this._step);
        if (Input.IsKeyDown(KEY_DOWN) || Input.IsKeyDown(KEY_LEFT))  this._removeObjects(this._step);

        const wheel = Input.mouse.wheel;
        if (wheel < 0) this._addObjects(this._step);
        if (wheel > 0) this._removeObjects(this._step);

        super.Update(deltaTime);
    }

    Draw() {
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.darkGrey);
        super.Draw();
        this.infoLabel.Draw(this.renderer);
    }
}

// ── Rectangles ────────────────────────────────────────────────────────────────

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

class PerformanceTestRectangles extends PerformanceTest {
    constructor(renderer) {
        super(renderer);
    }

    _spawnObject() {
        const size     = RandomBetweenInt(10, 40);
        const position = new Vector2(
            RandomBetweenFloat(size, this.screenWidth - size),
            RandomBetweenFloat(size, this.screenHeight - size)
        );
        const velocity = new Vector2(RandomBetweenFloat(-150, 150), RandomBetweenFloat(-150, 150));
        const color    = Color.Random();
        color.a        = RandomBetweenFloat(0.5, 1.0);
        return new BouncingRectangleGO(position, size, size, color, velocity);
    }
}

// ── Circles ──────────────────────────────────────────────────────────────────

class BouncingCircleGO extends CircleGO {
    constructor(position, radius, color, velocity) {
        super(position, radius, color);
        this.velocity = velocity;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        if (this.position.x - this.radius < 0) {
            this.position.x = this.radius;
            this.velocity.x *= -1;
        }
        if (this.position.x + this.radius > game.screenWidth) {
            this.position.x = game.screenWidth - this.radius;
            this.velocity.x *= -1;
        }
        if (this.position.y - this.radius < 0) {
            this.position.y = this.radius;
            this.velocity.y *= -1;
        }
        if (this.position.y + this.radius > game.screenHeight) {
            this.position.y = game.screenHeight - this.radius;
            this.velocity.y *= -1;
        }
    }
}

class PerformanceTestCircles extends PerformanceTest {
    constructor(renderer) {
        super(renderer);
    }

    _spawnObject() {
        const radius   = RandomBetweenInt(5, 20);
        const position = new Vector2(
            RandomBetweenFloat(radius, this.screenWidth - radius),
            RandomBetweenFloat(radius, this.screenHeight - radius)
        );
        const velocity = new Vector2(RandomBetweenFloat(-150, 150), RandomBetweenFloat(-150, 150));
        const color    = Color.Random();
        color.a        = RandomBetweenFloat(0.5, 1.0);
        return new BouncingCircleGO(position, radius, color, velocity);
    }
}

// ── Sprites (axis-aligned, no rotation) ──────────────────────────────────────

class BouncingSpriteBasicGO extends SpriteObject {
    constructor(position, img, velocity) {
        super(position, 0, 1, img);
        this.velocity = velocity;
        this.halfW = img.width / 2;
        this.halfH = img.height / 2;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        if (this.position.x - this.halfW < 0) {
            this.position.x = this.halfW;
            this.velocity.x *= -1;
        }
        if (this.position.x + this.halfW > game.screenWidth) {
            this.position.x = game.screenWidth - this.halfW;
            this.velocity.x *= -1;
        }
        if (this.position.y - this.halfH < 0) {
            this.position.y = this.halfH;
            this.velocity.y *= -1;
        }
        if (this.position.y + this.halfH > game.screenHeight) {
            this.position.y = game.screenHeight - this.halfH;
            this.velocity.y *= -1;
        }
    }

    Draw(renderer) {
        renderer.DrawImageBasic(
            this.sprite.img,
            this.position.x - this.halfW,
            this.position.y - this.halfH
        );
    }
}

class PerformanceTestSpritesBasic extends PerformanceTest {
    constructor(renderer) {
        super(renderer);

        this.graphicAssets = {
            snake: { path: "src/examples/common_assets/snake.png", img: null }
        };
    }

    _spawnObject() {
        const position = new Vector2(
            RandomBetweenFloat(0, this.screenWidth),
            RandomBetweenFloat(0, this.screenHeight)
        );
        const velocity = new Vector2(RandomBetweenFloat(-150, 150), RandomBetweenFloat(-150, 150));
        return new BouncingSpriteBasicGO(position, this.graphicAssets.snake.img, velocity);
    }
}

// ── Rotating sprites ──────────────────────────────────────────────────────────

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

class PerformanceTestSprites extends PerformanceTest {
    constructor(renderer) {
        super(renderer);

        this.graphicAssets = {
            snake: { path: "src/examples/common_assets/snake.png", img: null }
        };
    }

    _spawnObject() {
        const img      = this.graphicAssets.snake.img;
        const position = new Vector2(
            RandomBetweenFloat(img.width, this.screenWidth - img.width),
            RandomBetweenFloat(img.height, this.screenHeight - img.height)
        );
        const velocity = new Vector2(RandomBetweenFloat(-150, 150), RandomBetweenFloat(-150, 150));
        return new BouncingSpriteGO(position, img, velocity);
    }
}