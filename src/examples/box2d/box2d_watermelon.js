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
            drawColliders: false
        })
    
        this.graphicAssets = {
            bg:     { path: 'src/examples/box2d/assets/watermelon_bg.avif',  img: null },
            jar:    { path: 'src/examples/box2d/assets/watermelon_jar.avif', img: null },
            fruits: { path: 'src/examples/box2d/assets/watermelon.png', img: null }
        }

        this.launchLineY = jarLimits.y - jarLimits.height + 50;
    }

    Start() {
        // create the physics simulated world
        super.Start();

        // and some physic objects
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

        // spawn the first fruit (id=0)
        this.currentFruit = null;
        this.spawnTimer = 0;
        this.SpawnNextFruit(0);
    }

    Update(deltaTime) {
        // update physics and gameObjects
        super.Update(deltaTime);
        
        if (this.currentFruit) {
            // Update horizontal position based on mouse
            const fruitRadius = fruits[this.currentFruit.step].radius * this.physicsWorld.scale;
            const minX = 110 + fruitRadius; // Left wall
            const maxX = canvas.width - 110 - fruitRadius; // Right wall
            
            let targetX = Input.mouse.x;
            if (targetX < minX)
                targetX = minX;
            if (targetX > maxX)
                targetX = maxX;
            
            // Keep the fruit suspended at 50 pixels from the top
            this.currentFruit.position = new Vector2(Lerp(this.currentFruit.position.x, targetX, 0.25), this.launchLineY);
            
            if (Input.IsMouseUp()) {
                // Drop the fruit
                this.currentFruit.Drop();
                this.currentFruit = null;
                this.spawnTimer = 1.0; // Wait 1 second before spawning the next one
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

        this.renderer.DrawFillText("Move the mouse to aim and click to drop!", 10, this.screenHeight - 20, "20px Arial", Color.black, "start");
    }

    SpawnFruit(step, position, rotation, impulse=0) {
        const newFruit = new Fruit(position, rotation, this.physicsWorld, this.graphicAssets.fruits.img, step);
        this.gameObjects.push(newFruit);
        newFruit.ApplyImpulse(impulse * RandomBetweenFloat(0, 0.2), 0);
    }

    SpawnNextFruit(fruitId=RandomBetweenInt(0, 2)) { // Random fruit from the first 3
        this.currentFruit = new Fruit(new Vector2(this.screenHalfWidth, this.launchLineY), 0, this.physicsWorld, this.graphicAssets.fruits.img, fruitId, true);
        this.gameObjects.push(this.currentFruit);
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

            game.Destroy(this);
            game.Destroy(other);
        }
    }
}

// initialize the game
window.onload = () => {
    Init(Box2DWatermelon);
}