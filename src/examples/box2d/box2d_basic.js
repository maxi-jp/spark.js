class Box2DBasic extends Box2DGame {
    constructor(renderer) {
        super(renderer, 100, { x: 0, y: -9.8 }, true); // 1 pixel = 1/100 meter, gravity in m/s^2, allow bodies to sleep
    
        this.Configure({
            drawColliders: true
        });
    }

    Start() {
        // create the physics simulated world
        super.Start();

        // and some physic objects
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
                type: b2Body.b2_staticBody,
                restitution: 0
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
        // a box
        CreateBox(
            this.physicsWorld,
            this.screenHalfWidth / this.physicsScale, // x coordinate
            3, // y coordinate
            {
                width: 1,
                height: 1,
                type: b2Body.b2_dynamicBody
            } // physic options
        );
        // one circle
        CreateCircle(
            this.physicsWorld,
            1, // x coordinate
            2, // y coordinate
            {
                radius: 0.25, // radius in meters
                restitution: 0,
                type: b2Body.b2_dynamicBody
            } // physic options
        );

        // a polygon
        CreatePolygon(
            this.physicsWorld,
            4, // x coordinate
            2.5, // y coordinate
            {
                type: b2Body.b2_staticBody,
                vertices: [
                    { x: 0, y: 0.3 },
                    { x: -0.6, y: -0.3 },
                    { x: 0.6, y: -0.3 }
                ]
            }
        )

        CreateEdge(this.physicsWorld, 1.2, 1.7, {
            p1x: -0.33, p1y: 0, p2x: 0.33, p2y: 0.66,
            type: b2Body.b2_staticBody
        });
    }

    Update(deltaTime) {
        // update physics and gameObjects
        super.Update(deltaTime);
        
        if (Input.IsMousePressed()) {
            // spawn more circles
            CreateCircle(
                this.physicsWorld,
                Input.mouse.x / this.physicsScale, // x coordinate
                (this.screenHeight - Input.mouse.y) / this.physicsScale, // y coordinate
                {
                    radius: RandomBetweenFloat(0.05, 0.2), // radius in meters
                    restitution: 0.8, // high bouncing rate
                    type: b2Body.b2_dynamicBody
                } // physic options
            );
        }
    }

    Draw() {
        super.Draw();

        this.renderer.DrawFillText("Click on the screen to spawn balls!", 10, this.screenHeight - 20, "20px Arial", Color.black, "start");
    }
}

// initialize the game
window.onload = () => {
    Init(Box2DBasic);
}