class Box2DGame extends Game {
    constructor(renderer, scale, gravity, doSleep) {
        super(renderer);
        
        this.physicsWorld = null;
        this.physicsScale = scale; // 1 pixel = 1/scale meter
        this.physicsGravity = gravity; // gravity in m/s^2
        this.physicsDoSleep = doSleep; // allow bodies to sleep
    }

    Start() {
        super.Start();

        // create the physics simulated world
        this.physicsWorld = CreateBox2DWorld(this.renderer, this.physicsGravity, this.physicsDoSleep, this.physicsScale);
    }

    Update(deltaTime) {
        // update physics
        // Step(timestep , velocity iterations, position iterations)
        this.physicsWorld.Step(deltaTime, 8, 3);
        this.physicsWorld.ClearForces();

        // update gameObjects
        super.Update(deltaTime);
    }

    Draw() {
        // draw gameObjects
        super.Draw();

        if (this.config.drawColliders) {
            // box2d world debug
            DrawWorldDebug(this.renderer, this.physicsWorld);
        }
    }
}
