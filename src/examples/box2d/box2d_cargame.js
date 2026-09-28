/**
 * Box2D car game - a spark.js port of an example game built by Thomas Seng Hin Mak
 * Original project: https://github.com/makzan/HTML5-Games-Examples
 */

const levels = [
    [
        { type: "car", x: 50, y: 210, fuel: 20 },
        { type: "box", x: 250, y: 270, width: 500, height: 50, rotation: 0 },
        { type: "box", x: 500, y: 250, width: 130, height: 30, rotation: -10 },
        { type: "box", x: 600, y: 225, width: 160, height: 30, rotation: -20 },
        { type: "box", x: 950, y: 225, width: 160, height: 30, rotation: 20 },
        { type: "box", x: 1100, y: 250, width: 200, height: 30, rotation: 0 },
        { type: "win", x: 1200, y: 215, width: 30, height: 50, rotation: 0 }
    ],
    [
        { type: "car", x: 50, y: 210, fuel: 20 },
        { type: "box", x: 100, y: 270, width: 380, height: 30, rotation: 20 },
        { type: "box", x: 380, y: 320, width: 200, height: 30, rotation: -10 },
        { type: "box", x: 666, y: 285, width: 160, height: 30, rotation: -32 },
        { type: "box", x: 950, y: 295, width: 160, height: 30, rotation: 20 },
        { type: "box", x: 1100, y: 310, width: 200, height: 30, rotation: 0 },
        { type: "win", x: 1200, y: 275, width: 30, height: 50, rotation: 0 }
    ],
    [
        { type: "car", x: 50, y: 210, fuel: 20 },
        { type: "box", x: 100, y: 270, width: 380, height: 30, rotation: 20 },
        { type: "box", x: 380, y: 320, width: 200, height: 30, rotation: -10 },
        { type: "box", x: 686, y: 285, width: 160, height: 30, rotation: -32 },
        { type: "box", x: 250, y: 495, width: 160, height: 30, rotation: 40 },
        { type: "box", x: 500, y: 540, width: 400, height: 30, rotation: 0 },
        { type: "win", x: 220, y: 425, width: 30, height: 50, rotation: 23 }
    ]
];

class PhysicsCarGame extends Box2DGame {
    constructor(renderer) {
        // Gravity: -10 m/s2 down (spark.js Box2D space uses Y-up), 30 px = 1 meter, allow sleep = true
        super(renderer, 30, { x: 0, y: -10 }, true);
        
        this.Configure({
            screenWidth: 1300,
            screenHeight: 600,
            drawColliders: true // Enables built-in Box2D debug draw automatically
        });

        this.currentLevel = 0;
        this.fuel = 0;
        this.fuelMax = 0;
        
        // Game states: 1 = STARTING, 2 = PLAYING, 3 = GAME OVER
        this.state = 1;
    }

    Start() {
        super.Start();

        this.ui = new PhysicsCarUI(this, canvas);
        this.ui.Start();

        // Register engine input bindings
        Input.RegisterAction('Restart', [{ type: 'key', code: KEY_R }]);
        Input.RegisterAxis('Drive', [
            { type: 'key', positive: KEY_RIGHT, negative: KEY_LEFT },
            { type: 'key', positive: KEY_D, negative: KEY_A }
        ]);

        this.RestartGame(0);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (Input.GetActionDown('Restart')) {
            this.RestartGame(this.currentLevel);
            return;
        }

        if (this.state !== 2) return; // Only process physics while playing

        let drive = Input.GetAxis('Drive');
        if (drive !== 0 && this.fuel > 0) {
            // spark.js Box2D wrapper exposes an ApplyForce function requiring only newtons
            this.car.ApplyForce(drive * 200, 0);
            this.fuel -= Math.abs(drive) * 0.1;
            this.UpdateFuelUI();
        }
    }

    Draw() {
        super.Draw(); 

        if (this.state === 3) {
            this.renderer.DrawFillText("YOU WIN!", this.screenWidth / 2, this.screenHeight / 2, "bold 64px sans-serif", Color.FromHex("#4caf50"), "center", "middle");
        }
    }

    CreateGround(x, y, width, height, rotation) {
        let ground = new Box2DRectangleGO(
            new Vector2(x, y),
            this.physicsWorld,
            PhysicsObjectType.Box,
            {
                type: b2Body.b2_staticBody,
                width: width / this.physicsScale,
                height: height / this.physicsScale,
                restitution: 0.4,
                friction: 3.5
            },
            width, height, Color.FromString("rgba(100, 100, 100, 0.5)")
        );
        ground.rotation = rotation * degToRad;
        this.gameObjects.push(ground);
        return ground;
    }

    RestartGame(level) {
        this.currentLevel = level;
        
        if (this.currentLevel >= levels.length) {
            this.state = 3; // Game over/Win
            this.ui.SetLevelText("Game Completed!");
            return;
        }
        
        // Clean up current scene objects
        this.DestroyAllGameObjects();

        this.ui.SetLevelText("Level " + (this.currentLevel + 1));

        var levelData = levels[this.currentLevel];
        for (var i = 0; i < levelData.length; i++) {
            var obj = levelData[i];
            
            if (obj.type === "car") {
                this.car = new Car(new Vector2(obj.x, obj.y), this.physicsWorld, this.physicsScale, this);
                this.gameObjects.push(this.car);
                this.car.Start();

                this.fuelMax = obj.fuel;
                this.fuel = obj.fuel;
                this.UpdateFuelUI();

                continue;
            }
            
            var groundBody = this.CreateGround(obj.x, obj.y, obj.width, obj.height, obj.rotation);
            
            if (obj.type === "win") {
                // Style it differently or mark it for collision logic
                this.gamewinWall = groundBody;
                this.gamewinWall.color = Color.FromString("rgba(100, 200, 100, 0.8)");
            }
        }
        
        this.state = 2; // PLAYING
    }

    UpdateFuelUI() {
        let percentage = Math.max(0, (this.fuel / this.fuelMax) * 100);
        this.ui.SetFuelPercentage(percentage);
    }
}

class Car extends Box2DRectangleGO {
    constructor(position, physicsWorld, physicsScale, game) {
        // Initialize chassis
        super(
            position,
            physicsWorld,
            PhysicsObjectType.Box,
            {
                type: b2Body.b2_dynamicBody,
                width: 80 / physicsScale,
                height: 40 / physicsScale,
                density: 1.0,
                friction: 1.5,
                restitution: 0.4
            },
            80, 40, Color.FromString("rgba(50, 50, 200, 0.7)")
        );
        
        this.game = game;
        this.physicsScale = physicsScale;
        this.physicsWorld = physicsWorld;
        this.wheels = [];
        
        this.InitializeWheels(position);
    }
    
    InitializeWheels(carPosition) {
        // Create wheels
        const wheel1 = this.CreateWheel(carPosition.x - 25, carPosition.y + 20);
        const wheel2 = this.CreateWheel(carPosition.x + 25, carPosition.y + 20);
        
        this.wheels.push(wheel1, wheel2);
        
        // Connect left wheel to chassis
        let jointDef = new b2RevoluteJointDef();
        let anchor1 = CanvasToBox2DPosition(canvas, new Vector2(carPosition.x - 25, carPosition.y + 20), this.physicsScale);
        jointDef.Initialize(this.body, wheel1.body, anchor1);
        this.physicsWorld.CreateJoint(jointDef);

        // Connect right wheel to chassis
        let jointDef2 = new b2RevoluteJointDef();
        let anchor2 = CanvasToBox2DPosition(canvas, new Vector2(carPosition.x + 25, carPosition.y + 20), this.physicsScale);
        jointDef2.Initialize(this.body, wheel2.body, anchor2);
        this.physicsWorld.CreateJoint(jointDef2);
    }
    
    CreateWheel(x, y) {
        let wheel = new Box2DGameObject(
            new Vector2(x, y),
            this.physicsWorld,
            PhysicsObjectType.Circle,
            {
                type: b2Body.b2_dynamicBody,
                radius: 10 / this.physicsScale,
                density: 1.0,
                restitution: 0.1,
                friction: 4.3
            }
        );
        this.game.gameObjects.push(wheel);
        wheel.Start();
        return wheel;
    }
    
    OnContactDetected(other, contactPoint) {
        if (other === this.game.gamewinWall) {
            console.log("Level Passed!");
            this.game.RestartGame(this.game.currentLevel + 1);
        }
    }
}

class PhysicsCarUI extends HTMLMenu {
    constructor(game, canvas) {
        // game, menuContainer, canvasContainer, canvas, coverCanvas
        super(game, "#ui-layer", "#game-container", canvas, true);
    }
    
    Start() {
        super.Start();
        this.SetupElements([
            '#level',
            '#fuel-value'
        ]);
    }
    
    SetLevelText(text) {
        if (this.elements['#level']) {
            this.elements['#level'].innerText = text;
        }
    }
    
    SetFuelPercentage(percentage) {
        if (this.elements['#fuel-value']) {
            this.elements['#fuel-value'].style.width = percentage + "%";
        }
    }
}

window.onload = () => Init(PhysicsCarGame, "game");