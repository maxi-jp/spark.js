const fruits = [
    {
        radius: 0.175,
    }, 
    {
        radius: 0.33,
    }, 
    {
        radius: 0.45,
    }, 
    {
        radius: 0.6,
    }, 
    {
        radius: 0.75,
    }
];

const jarLimits = {
    x: 640 / 2,
    y: 800 - 60,
    width: 500,
    height: 700
};

const GAME_OVER_DELAY = 3; // seconds

class Box2DWatermelon extends Box2DGame {
    constructor(renderer) {
        super(renderer, 100, { x: 0, y: -9.8 }, false); // 1 pixel = 1/100 meter, gravity in m/s^2, allow bodies to sleep

        this.Configure({
            screenWidth: 640,
            screenHeight: 800,
            // fillWindow: true,
            drawColliders: true,
            mobileSupport: true // enable touch events; behavior adapts via mobileWithTouchScreen
        });

        this.launchLineY = jarLimits.y - jarLimits.height + 50;

        this.gameOverZone = null; // Box2DTrigger that detects fruits above the danger line
    }

    Start() {
        // create the physics simulated world
        super.Start();

        // Jar walls
        this.SetupBoundaries();

        // start the game
        this.StartGame();
    }

    StartGame() {
        // Clean up previous game objects (fruits and game over zone)
        this.DestroyAllGameObjects();

        // Game-over danger zone — a thin sensor that spans the jar opening at the launch line.
        // Any non-suspended fruit that stays inside for >= 3 seconds triggers game over.
        this.gameOverZone = new GameOverZone(
            new Vector2(jarLimits.x, this.launchLineY),
            this.physicsWorld,
            this.physicsScale
        );
        this.gameObjects.push(this.gameOverZone);

        this.nextFruitId = 0;
        this.currentFruit = null;
        this.spawnTimer = 0;

        this.SpawnNextFruit();
    }

    Update(deltaTime) {
        // update physics and gameObjects
        super.Update(deltaTime);
        
        if (this.currentFruit) {
            // Clamp target X inside the jar walls
            const fruitRadius = fruits[this.currentFruit.step].radius * this.physicsWorld.scale;
            const minX = jarLimits.x - jarLimits.width / 2 + fruitRadius;
            const maxX = jarLimits.x + jarLimits.width / 2 - fruitRadius;
            
            let targetX = Input.mouse.x;
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
        super.Draw();
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

    SpawnFruit(step, position, impulse=0) {
        const newFruit = new Fruit(position, this.physicsWorld, step);
        this.gameObjects.push(newFruit);
        newFruit.ApplyImpulse(impulse * RandomBetweenFloat(0, 0.2), 0);
    }

    SpawnNextFruit() {
        const fruitId = this.nextFruitId;
        // Pick the fruit that will come *after* this one (random from first 3)
        this.nextFruitId = RandomBetweenInt(0, 2);
        this.currentFruit = new Fruit(new Vector2(this.screenHalfWidth, this.launchLineY), this.physicsWorld, fruitId, true);
        this.gameObjects.push(this.currentFruit);
    }
}

class Fruit extends Box2DGameObject {
    constructor(position, world, step=0, isSuspended=false) {
        super(position, world, PhysicsObjectType.Circle, {
            radius: fruits[step].radius,
            restitution: 0.4, // low bouncing rate
            type: b2Body.b2_dynamicBody
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

    OnContactDetected(other, contactPoint) {
        if (!this.active || this.isSuspended)
            return;

        if (other && other instanceof Fruit && other.step === this.step) {
            if (!other.active || other.isSuspended)
                return;

            const nextStep = this.step + 1;
            if (nextStep < fruits.length) {
                const canvasPos = Box2DToCanvasPosition(canvas, contactPoint, this.world.scale);
                game.SpawnFruit(nextStep, canvasPos, this.body.GetLinearVelocity().x + other.body.GetLinearVelocity().x);
            }

            game.Destroy(this);
            game.Destroy(other);
        }
    }
}

/**
 * Thin sensor box that spans the jar opening at the launch line.
 * Any non-suspended Fruit that remains inside for GAME_OVER_DELAY seconds
 * triggers Box2DWatermelon.GameOver().
 */
class GameOverZone extends Box2DTrigger {
    constructor(position, physicsWorld, physicsScale) {
        super(position, physicsWorld, PhysicsObjectType.Box, {
            width:  jarLimits.width / physicsScale, // spans the full jar opening
            height: 0.5                             // 50 px tall in game space
        });
        // Maximum seconds any non-suspended fruit has been inside this frame.
        this.maxTimeInside = 0;
    }

    Update(deltaTime) {
        super.Update(deltaTime); // processes enter/exit queues and calls OnTriggerStay

        // Compute the longest time any non-suspended fruit has been in the zone
        this.maxTimeInside = 0;
        for (const [other, data] of this._overlapping) {
            if (other instanceof Fruit && !other.isSuspended)
                this.maxTimeInside = Math.max(this.maxTimeInside, data.time);
        }
    }

    OnTriggerStay(other, timeInside) {
        if (other instanceof Fruit && !other.isSuspended && timeInside >= GAME_OVER_DELAY)
            game.Start();
    }
}

// initialize the game
window.onload = () => {
    Init(Box2DWatermelon);
}