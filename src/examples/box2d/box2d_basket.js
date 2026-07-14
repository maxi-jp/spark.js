class Box2DBasket extends Box2DGame {
    constructor(renderer) {
        super(renderer, 100, { x: 0, y: -9.8 }, true); // 1 pixel = 1/100 meter, gravity in m/s^2, allow bodies to sleep

        this.graphicAssets = {
            ball: {
                path: "src/examples/box2d/assets/ball.png",
                img: null
            }
        };

        this.Configure({
            drawColliders: true
        });

        this.ball = null;
        this.basketSensor = null;
    }

    Start() {
        // create the physics simulated this.physicsWorld
        super.Start();

        // phisics objects
        // static floor
        CreateEdge(
            this.physicsWorld,
            3.2, // x coordinate
            0.5, // y coordinate
            {
                p1x: -3.2, // start point x
                p1y: 0,    // start point y
                p2x: 3.2,  // end point x,
                p2y: 0,    // end point y
                type: b2Body.b2_staticBody
            } // physic options
        );
        // left wall
        CreateEdge(this.physicsWorld, 0, 0, {
            p1x: 0, p1y: 0, p2x: 0, p2y: 4.8,
            type: b2Body.b2_staticBody
        });
        // right wall
        CreateEdge(this.physicsWorld, 6.4, 0, {
            p1x: 0, p1y: 0, p2x: 0, p2y: 4.8,
            type: b2Body.b2_staticBody
        });
        // top wall
        CreateEdge(this.physicsWorld, 3.2, 4.8, {
            p1x: -3.2, p1y: 0, p2x: 3.2, p2y: 0,
            type: b2Body.b2_staticBody
        });

        // basket edges
        const basketPosition = new Vector2(5.8, 2.6);
        CreateEdge(this.physicsWorld, basketPosition.x, basketPosition.y, {
            p1x: -0.3, p1y: 0.6, p2x: 0, p2y: 0,
            type: b2Body.b2_staticBody
        });
        this.basketSensor = CreateEdge(this.physicsWorld, basketPosition.x, basketPosition.y, {
            p1x: 0, p1y: 0, p2x: 0.6, p2y: 0,
            type: b2Body.b2_staticBody,
            isSensor: true
        });
        this.basketSensor.SetUserData("basket");

        // create the ball
        this.ball = new Ball(new Vector2(100, 200), this.graphicAssets.ball.img, this.physicsWorld, new Vector2(0.33, 0.33));
        this.ball.Start();
        this.gameObjects.push(this.ball);
    }

    Update(deltaTime) {
        // update physics and gameObjects
        super.Update(deltaTime);
    }

    Draw() {
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black)
        
        super.Draw();
    }
}

class Ball extends Box2DSpriteObject {
    constructor(position, img, physicsWorld) {
        super(position, 0, 0.25, img, PhysicsObjectType.Circle, physicsWorld, {
            radius: 0.2, // radius in meters
            type: b2Body.b2_dynamicBody,
            density: 1.0,
            friction: 0.5,
            restitution: 0.7,
            linearDamping: 0.0,
            angularDamping: 0.1,
            fixedRotation: false
        });

        this.impulseForce = 0.6;
        this.lastBallLaunchPosition = null;
    }

    Start() {
        super.Start();
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (Input.IsMouseDown()) {
            const mousePos = CanvasToBox2DPosition(canvas, Input.mouse, this.world.scale);
            const ballPosition = this.body.GetPosition();
    
            const impulse = new b2Vec2(
                (mousePos.x - ballPosition.x) * this.impulseForce,
                (mousePos.y - ballPosition.y) * this.impulseForce
            );
    
            this.body.ApplyImpulse(impulse, ballPosition);
            this.lastBallLaunchPosition = new b2Vec2(ballPosition.x, ballPosition.y);
        }

        // reset the ball
        if (Input.IsKeyDown(KEY_A)) {
            this.Reset();
        }
    }

    OnContactDetected(other) {
        if (other === "basket") {
            // reset the ball position
            this.Reset();
        }
    }

    Reset() {
        this.body.SetPosition(new b2Vec2(Math.random() + 1, Math.random() + 2));
        this.body.SetAngularVelocity(0);
        this.body.SetLinearVelocity(new b2Vec2(0, 0));
    }
}

// initialize the game
window.onload = () => {
    Init(Box2DBasket);
}