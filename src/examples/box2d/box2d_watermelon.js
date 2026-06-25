const fruits = [
    { // cherry
        radius: 0.175,
        tileset: { x: 110, y: 80, w: 90, h: 120 },
        offset: { x: 0, y: -0.1 },
        scale: 1.4
    }, 
    { // strawberry
        radius: 0.29,
        tileset: { x: 419, y: 70, w: 122, h: 148 },
        offset: { x: 0, y: -0.03 },
        scale: 1.5
    }, 
    { // grape
        radius: 0.31,
        tileset: { x: 814, y: 68, w: 132, h: 158 },
        offset: { x: 0, y: 0.0 },
        scale: 1.6
    }, 
    { // dekopon
        radius: 0.42,
        tileset: { x: 1136, y: 30, w: 180, h: 218 },
        offset: { x: 0, y: -0.18 },
        scale: 1.7
    }, 
    { // permison
        radius: 0.42,
        tileset: { x: 72, y: 300, w: 176, h: 164 },
        offset: { x: 0, y: -0.01 },
        scale: 2.0
    }, 
    { // apple
        radius: 0.42,
        tileset: { x: 390, y: 288, w: 176, h: 180 },
        offset: { x: 0, y: -0.025 },
        scale: 2.2
    }, 
    { // pear
        radius: 0.38,
        tileset: { x: 750, y: 278, w: 176, h: 194 },
        offset: { x: 0, y: -0.3 },
        scale: 2.6
    }, 
    { // peach
        radius: 0.42,
        tileset: { x: 1138, y: 290, w: 178, h: 180 },
        offset: { x: 0, y: -0.0 },
        scale: 2.6
    },
    { // pineapple
        radius: 0.39,
        tileset: { x: 77, y: 520, w: 170, h: 207 },
        offset: { x: 0, y: -0.3 },
        scale: 2.8
    },
    { // melon
        radius: 0.44,
        tileset: { x: 384, y: 516, w: 182, h: 210 },
        offset: { x: 0, y: -0.25 },
        scale: 2.8
    },
    { // watermelon
        radius: 0.55,
        tileset: { x: 715, y: 514, w: 226, h: 222 },
        offset: { x: 0, y: 0.0 },
        scale: 2.8
    }
];

const jarLimits = {
    x: 720 / 2,
    y: 1280 - 200,
    width: 560,
    height: 800
}

class Box2DWatermelon extends Box2DGame {
    constructor(renderer) {
        super(renderer, 100, { x: 0, y: -9.8 }, false); // 1 pixel = 1/100 meter, gravity in m/s^2, allow bodies to sleep

        this.Configure({
            screenWidth: 720,
            screenHeight: 1280,
            fillWindow: true,
            drawColliders: true,
            mobileSupport: true // enable touch events; behavior adapts via mobileWithTouchScreen
        })
    
        this.graphicAssets = {
            bg:     { path: 'src/examples/box2d/assets/watermelon_bg.avif',  img: null },
            jar:    { path: 'src/examples/box2d/assets/watermelon_jar.avif', img: null },
            fruits: { path: 'src/examples/box2d/assets/watermelon.png', img: null }
        };

        this.audioAssets = {
            backgroundMusic: { path: "src/examples/box2d/assets/Glass_Pieces_at_Noon.mp3" }
        };

        this.launchLineY = jarLimits.y - jarLimits.height + 50;

        // Score tracking
        this.score = 0;
        this.bestScore = 0;
        this.nextFruitId = 0; // 0 = cherry; updated each spawn
        this.ui = null;       // HTMLMenu reference, set up in Start()
    }

    Start() {
        // create the physics simulated world
        super.Start();

        // Jar walls
        this.SetupBoundaries();

        // spawn the first fruit (cherry) and prepare the queue
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('wm_best') || '0');

        // HTML score UI — syncWithCanvas=true mirrors the canvas fillWindow transform
        this.ui = new WatermelonUI(this, canvas);
        this.ui.Start();
        this.ui.UpdateScoreDisplay();

        this.nextFruitId = 0; // first fruit is always a cherry
        this.currentFruit = null;
        this.spawnTimer = 0;
        this.SpawnNextFruit();

        audioPlayer.PlayLoop("backgroundMusic");
    }

    Update(deltaTime) {
        // update physics and gameObjects
        super.Update(deltaTime);
        
        if (this.currentFruit) {
            // Clamp target X inside the jar walls
            const fruitRadius = fruits[this.currentFruit.step].radius * this.physicsWorld.scale;
            const minX = jarLimits.x - jarLimits.width / 2 + fruitRadius;
            const maxX = jarLimits.x + jarLimits.width / 2 - fruitRadius;

            // Desktop: always follow the mouse.
            // Mobile:  follow the finger only while it's on screen; otherwise stay centred.
            let targetX;
            if (mobileWithTouchScreen) {
                targetX = Input.touch.any ? Input.mouse.x : this.screenHalfWidth;
            }
            else {
                targetX = Input.mouse.x;
            }
            targetX = Math.max(minX, Math.min(maxX, targetX));

            // Keep the fruit suspended at the launch line
            this.currentFruit.position = new Vector2(Lerp(this.currentFruit.position.x, targetX, 0.25), this.launchLineY);

            // Drop: left-click release on desktop, finger lift on mobile (touch mirrors to mouse)
            if (Input.IsMouseUp()) {
                this.currentFruit.Drop();
                this.currentFruit = null;
                this.spawnTimer = 1.0; // wait 1 second before spawning the next one
            }
        }
        else {
            // Handle the spawn timer
            this.spawnTimer -= deltaTime;
            if (this.spawnTimer <= 0) {
                this.SpawnNextFruit();
            }
        }
    }

    Draw() {
        // background image
        renderer.DrawImageBasic(this.graphicAssets.bg.img, 0, 0);
        renderer.DrawImageSectionBasic(this.graphicAssets.jar.img, -12, -290, 0, 0, this.graphicAssets.jar.img.width, 700, 1, 1);

        super.Draw();

        // jar image
        // renderer.DrawImageBasic(this.graphicAssets.jar.img, -12, -290, this.graphicAssets.jar.img.width, this.graphicAssets.jar.img.height, 0.5);
        renderer.DrawImageSectionBasic(this.graphicAssets.jar.img, -12, 410, 0, 700, this.graphicAssets.jar.img.width, this.graphicAssets.jar.img.height - 700, 1, 1, 0.5);

        const hint = mobileWithTouchScreen
            ? "Touch to aim — lift finger to drop!"
            : "Move mouse to aim — click to drop!";
        this.renderer.DrawFillText(hint, this.screenHalfWidth, this.screenHeight - 20, "20px Arial", Color.black, "center");
    }

    SetupBoundaries() {
        // static floor
        CreateEdge(
            this.physicsWorld,
            jarLimits.x / this.physicsScale, // x coordinate
            (this.screenHeight - jarLimits.y) / this.physicsScale, // y coordinate
            {
                p1x: -(jarLimits.width / 2 / this.physicsScale), // start point x
                p1y: 0, // start point y
                p2x: jarLimits.width / 2 / this.physicsScale, // end point x,
                p2y: 0, // end point y
                type: b2Body.b2_staticBody,
                restitution: 0
            } // physic options
        );
        // left wall
        CreateEdge(
            this.physicsWorld,
            (jarLimits.x - jarLimits.width / 2) / this.physicsScale,
            (canvas.height - jarLimits.y) / this.physicsScale,
            {
                p1x: 0, p1y: 0,
                p2x: 0, p2y: jarLimits.height / this.physicsScale,
                type: b2Body.b2_staticBody
            }
        );
        // right wall
        CreateEdge(
            this.physicsWorld,
            (jarLimits.x + jarLimits.width / 2) / this.physicsScale,
            (canvas.height - jarLimits.y) / this.physicsScale,
            {
                p1x: 0, p1y: 0,
                p2x: 0, p2y: jarLimits.height / this.physicsScale,
                type: b2Body.b2_staticBody
            }
        );
        // top wall
        CreateEdge(
            this.physicsWorld,
            jarLimits.x / this.physicsScale, // x coordinate
            (this.screenHeight - jarLimits.y + jarLimits.height) / this.physicsScale, // y coordinate
            {
                p1x: -(jarLimits.width / 2 / this.physicsScale), // start point x
                p1y: 0, // start point y
                p2x: jarLimits.width / 2 / this.physicsScale, // end point x,
                p2y: 0, // end point y
                type: b2Body.b2_staticBody
            }
        );
        // bottom-left corner
        CreateEdge(
            this.physicsWorld,
            (jarLimits.x - jarLimits.width / 2) / this.physicsScale,
            (canvas.height - jarLimits.y) / this.physicsScale,
            {
                p1x: 0, p1y: 0.45,
                p2x: 0.3, p2y: 0,
                type: b2Body.b2_staticBody
            }
        );
        // bottom-right corner
        CreateEdge(
            this.physicsWorld,
            (jarLimits.x + jarLimits.width / 2) / this.physicsScale,
            (canvas.height - jarLimits.y) / this.physicsScale,
            {
                p1x: 0, p1y: 0.45,
                p2x: -0.3, p2y: 0,
                type: b2Body.b2_staticBody
            }
        );
    }

    SpawnFruit(step, position, rotation, impulse=0) {
        const newFruit = new Fruit(position, rotation, this.physicsWorld, this.graphicAssets.fruits.img, step);
        this.gameObjects.push(newFruit);
        newFruit.ApplyImpulse(impulse * RandomBetweenFloat(0, 0.2), 0);
    }

    /**
     * Add points to the current score and persist the best score.
     * Scoring follows triangular numbers: merging two fruits of step N
     * awards (N+1)*(N+2)/2 points — cherry merge=1, strawberry=3, grape=6, …
     * @param {number} pts
     */
    AddScore(pts) {
        this.score += pts;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('wm_best', this.bestScore);
        }
        this.ui.UpdateScoreDisplay();
    }

    SpawnNextFruit() {
        const fruitId = this.nextFruitId;
        // Pick the fruit that will come *after* this one (random from first 5)
        this.nextFruitId = RandomBetweenInt(0, 4);
        this.currentFruit = new Fruit(new Vector2(this.screenHalfWidth, this.launchLineY), 0, this.physicsWorld, this.graphicAssets.fruits.img, fruitId, true);
        this.gameObjects.push(this.currentFruit);
        this.ui.UpdateNextFruitPreview();
    }
}

class Fruit extends Box2DSpriteObject {
    constructor(position, rotation, world, img, step=0, isSuspended=false) {
        super(position, rotation, 0.5 * fruits[step].scale, img, PhysicsObjectType.Circle, world, {
            radius: fruits[step].radius * fruits[step].scale,
            restitution: 0.4, // low bouncing rate
            type: b2Body.b2_dynamicBody,
            offset: fruits[step].offset
        });

        this.step = step;
        this.isSuspended = isSuspended;

        if (this.isSuspended) {
            this.body.SetActive(false);
        }
    }

    Drop() {
        this.isSuspended = false;
        this.body.SetActive(true);
        this.body.SetLinearVelocity(new b2Vec2(0, 0));
        this.body.SetAwake(true);
    }

    Draw(renderer) {
        super.DrawSection(renderer, fruits[this.step].tileset.x, fruits[this.step].tileset.y, fruits[this.step].tileset.w, fruits[this.step].tileset.h);
    }

    OnContactDetected(other, contactPoint) {
        if (!this.active || this.isSuspended)
            return;

        if (other && other instanceof Fruit && other.step === this.step) {
            if (!other.active || other.isSuspended)
                return;

            const nextStep = this.step + 1;
            if (nextStep < fruits.length) {
                const canvasPos = Box2DToCanvasPosition(canvas, contactPoint, this.world.scale);
                game.SpawnFruit(nextStep, canvasPos, (this.rotation + other.rotation) / 2, this.body.GetLinearVelocity().x + other.body.GetLinearVelocity().x);
            }

            // Award points: triangular sequence — cherry merge=1, strawberry=3, grape=6, …
            game.AddScore(nextStep * (nextStep + 1) / 2);
            game.Destroy(this);
            game.Destroy(other);
        }
    }
}

class WatermelonUI extends HTMLMenu {
    constructor(game, canvas) {
        super(game, '#wm-ui', '#wm-container', canvas, true, true);
    }

    Start() {
        super.Start();

        this.SetupElements([
            '#wm-score',
            '#wm-best',
            '#wm-next-fruit'
        ]);
    }

    UpdateScoreDisplay() {
        const scoreEl = this.elements['#wm-score'];
        if (scoreEl.textContent !== this.game.score.toString()) {
            scoreEl.textContent = this.game.score;
            this.PopBubble(scoreEl.parentElement);
        }

        const bestEl = this.elements['#wm-best'];
        if (bestEl.textContent !== this.game.bestScore.toString()) {
            bestEl.textContent = this.game.bestScore;
            this.PopBubble(bestEl.parentElement);
        }
    }

    PopBubble(bubbleElement) {
        bubbleElement.classList.remove('pop');
        void bubbleElement.offsetWidth; // Trigger reflow to restart transition
        bubbleElement.classList.add('pop');

        setTimeout(() => bubbleElement.classList.remove('pop'), 200);
    }

    /** Updates the NEXT fruit preview using CSS background-image sprite technique. */
    UpdateNextFruitPreview() {
        const div = this.elements['#wm-next-fruit'];
        const img = this.game.graphicAssets.fruits.img;

        const ft   = fruits[this.game.nextFruitId];
        const divW = div.offsetWidth  || 70;
        const divH = div.offsetHeight || 70;

        // Scale the tile to fill the preview div (with a small margin)
        const S = Math.min(divW / ft.tileset.w, divH / ft.tileset.h) * 0.85;

        // Scale the entire sheet by the same factor so background-position lines up
        const sheetW = img.naturalWidth  * S;
        const sheetH = img.naturalHeight * S;

        // Offset so the tile is centred inside the div
        const posX = -ft.tileset.x * S + (divW - ft.tileset.w * S) / 2;
        const posY = -ft.tileset.y * S + (divH - ft.tileset.h * S) / 2;

        div.style.backgroundImage    = `url('${img.src}')`;
        div.style.backgroundSize     = `${sheetW}px ${sheetH}px`;
        div.style.backgroundPosition = `${posX}px ${posY}px`;
    }
}

// initialize the game
window.onload = () => {
    Init(Box2DWatermelon);
}