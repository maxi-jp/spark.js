const blocks = [
    {x: 10, y: 6, t: 1},
    {x: 14, y: 6, t: 0},
    {x: 15, y: 6, t: 1},
    {x: 16, y: 6, t: 0},
    {x: 16, y: 2, t: 1},
    {x: 17, y: 6, t: 1},
    {x: 18, y: 6, t: 0},
];

const blockSize = 42;

class Box2DPlatformer extends Box2DGame {
    constructor(renderer) {
        super(renderer, 100, { x: 0, y: -9.8 }, false); // 1 pixel = 1/100 meter, gravity in m/s^2, allow bodies to sleep

        debugMode = false;

        this.config = { imageSmoothingEnabled: false };

        this.graphicAssets = {
            mario: {
                path: "src/examples/box2d/assets/SuperMarioBrosCrossover_Mario_SML2.png",
                img: null
            },
            blocks: {
                path: "src/examples/box2d/assets/SMB1_AS_blocks.png",
                img: null
            },
            bg0: {
                path: "src/examples/box2d/assets/SMB1_AS_bg0.png",
                img: null
            },
            bg1: {
                path: "src/examples/box2d/assets/SMB1_AS_bg1.png",
                img: null
            }
        };

        this.Configure({
            drawColliders: true
        });

        this.player = null;
        this.camera = null;
        this.background = null;

        this.coins = [];
        this.blocks = [];

        // game state variables
        this.coinsCounter = 0;

        // UI
        this.coinsCounterSprite = null;
        this.coinsCounterLabel = null;
    }

    Start() {
        // create the physics simulated this.physicsWorld
        super.Start();

        // physic objects
        // static floor
        this.floor = CreateEdge(
            this.physicsWorld,
            0, // x coordinate
            0, // y coordinate
            {
                p1x: 0, // start point x
                p1y: blockSize * 2 / this.physicsScale, // start point y
                p2x: blockSize * 200 / this.physicsScale,  // end point x,
                p2y: blockSize * 2 / this.physicsScale, // end point y
                type: b2Body.b2_staticBody,
                friction: 5,
                restitution: 0
            } // physic options
        );
        this.floor.SetUserData("floor");
        // left wall
        CreateEdge(this.physicsWorld, 0, 0, {
            p1x: 0, p1y: 0, p2x: 0, p2y: 4.8,
            type: b2Body.b2_staticBody,
            friction: 0.02,
            retitution: 0
        });
        // right wall
        // CreateEdge(this.physicsWorld, 6.4, 0, {
        //     p1x: 0, p1y: 0, p2x: 0, p2y: 4.8,
        //     type: b2Body.b2_staticBody
        // });
        // top wall
        // CreateEdge(this.physicsWorld, 3.2, 4.8, {
        //     p1x: -3.2, p1y: 0, p2x: 3.2, p2y: 0,
        //     type: b2Body.b2_staticBody
        // });

        // game state variables
        this.coinsCounter = 0;

        // create the player
        this.player = new Player(new Vector2(100, 200), this.graphicAssets.mario.img, this.physicsWorld);
        this.player.Start();
        this.gameObjects.push(this.player);

        // create the camera
        this.camera = new FollowCameraBasic(Vector2.Zero(), this.player, new Vector2(100, -160));
        this.camera.Start();

        // create the background
        const bgLayer0 = new SpriteBackgroundLayer(this.graphicAssets.bg0.img, new Vector2(-100, -200), 0, 3, new Vector2(0.02, 0.01), new Rect(18, 18, 1000, 256));
        const bgLayer1 = new SpriteBackgroundLayer(this.graphicAssets.bg1.img, new Vector2(-100, -160), 0, 3, new Vector2(0.1, 0.015), new Rect(18, 18, 1000, 214));
        this.background = new BackgroundLayers(this.camera, [bgLayer0, bgLayer1]);
        this.background.Start();

        // create a coin
        const coin = new Coin(new Vector2(300, 250), this.graphicAssets.blocks.img, this.physicsWorld);
        this.coins.push(coin);
        this.gameObjects.push(coin);

        // scene blocks
        blocks.forEach(block => {
            let newBlock;
            if (block.t == 0)
                newBlock = new Block(new Vector2(block.x * blockSize, block.y * blockSize), this.graphicAssets.blocks.img, this.physicsWorld);
            else if (block.t == 1)
                newBlock = new BlockSpecial(new Vector2(block.x * blockSize, block.y * blockSize), this.graphicAssets.blocks.img, this.physicsWorld);
            this.blocks.push(newBlock);
            this.gameObjects.push(newBlock);
        });

        // UI
        this.coinsCounterSprite = new SSAnimationObjectComplex(new Vector2(275, 26), 0, 2, this.graphicAssets.blocks.img, [[new Rect(70, 38, 10, 14), new Rect(81, 38, 10, 14), new Rect(92, 38, 10, 14)]], [1/4]);
        this.coinsCounterLabel = new TextLabel(this.coinsCounter.toString(), new Vector2(this.coinsCounterSprite.position.x + 20, this.coinsCounterSprite.position.y + 4), "30px Comic Sans MS", "white", "start", "middle");
    }

    Update(deltaTime) {
        // update physics and gameObjects
        super.Update(deltaTime);

        // update the camera
        this.camera.Update(deltaTime);

        // update the background
        this.background.Update(deltaTime);

        // UI
        this.coinsCounterSprite.Update(deltaTime);
    }

    Draw() {
        this.camera.PreDraw(this.renderer);

        // draw the background
        this.background.Draw(this.renderer);

        // draw the gameObjects
        super.Draw();

        this.camera.PostDraw(this.renderer);

        // UI
        this.coinsCounterSprite.Draw(this.renderer);
        this.coinsCounterLabel.Draw(this.renderer);
    }

    PlayerTookCoin(coin) {
        this.coinsCounter++;
        this.coinsCounterLabel.text = this.coinsCounter.toString();

        this.Destroy(coin);
    }
}

const PlayerAnimationState = {
    IDLE : 0,
    MOVE : 1,
    JUMP : 2
}

class Player extends Box2DSSAnimationObjectComplex {
    constructor(position, img, physicsWorld) {
        super(position, 0, 3, img, [
            [new Rect(37, 1, 32, 26)], // idle
            [new Rect(72, 1, 32, 26), new Rect(107, 1, 32, 26), new Rect(142, 1, 32, 26)], // run
            [new Rect(212, 30, 32, 24)], // jump
        ], [
            1 / 8, 1 / 8, 1 / 8
        ], PhysicsObjectType.Box, physicsWorld, {
            width: 0.4,
            height: 0.6,
            type: b2Body.b2_dynamicBody,
            density: 1.0,
            friction: 0.5,
            restitution: 0,
            linearDamping: 1,
            fixedRotation: true
        });

        this.onFloor = false;

        this.isGoingLeft = false;

        // movement attr
        this.maxHorizontalVel = 3;
        this.maxVerticalVel = 10;
        this.jumpForce = 8;

        // movement flags
        this.moveLeft = false;
        this.moveRight = false;

        this.canJump = false;
    }

    Start() {
        super.Start();

        this.PlayAnimationLoop(PlayerAnimationState.IDLE);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // clear movement flag
        this.moving = false;

        if (Input.IsKeyPressed(KEY_LEFT) || Input.IsKeyPressed(KEY_A))
            this.moveLeft = true;

        if (Input.IsKeyPressed(KEY_RIGHT) || Input.IsKeyPressed(KEY_D))
            this.moveRight = true;

        this.moving = this.moveLeft || this.moveRight;

        if (Input.IsKeyDown(KEY_UP) || Input.IsKeyDown(KEY_W) || Input.IsKeyDown(KEY_SPACE)) {
            // want to begin jump during this frame
            this.Jump();
        }

        // movement
        if (this.moveRight) {
            // move animation
            if (this.onFloor) {
                this.PlayAnimationLoop(PlayerAnimationState.MOVE, false);
            }
            
            this.ApplyVelocity(new b2Vec2(1, 0));
            this.moveRight = false;
            this.isGoingLeft = false;
        }

        if (this.moveLeft) {
            // move animation
            if (this.onFloor) {
                this.PlayAnimationLoop(PlayerAnimationState.MOVE, false);
            }

            this.ApplyVelocity(new b2Vec2(-1, 0));
            this.moveLeft = false;
            this.isGoingLeft = true;
        }

        // check if falling
        if (this.body.GetLinearVelocity().y < -0.1) {
            this.PlayAnimationLoop(PlayerAnimationState.JUMP, false);
        }
        // return to idle (if !moving && !jumping && !attacking && !dying && !onWard)
        else if (!this.jumping && !this.moving) {
            // play the idle animation
            this.PlayAnimationLoop(PlayerAnimationState.IDLE);
        }

        // if going left -> flip the sprite
        this.animation.flipX = this.isGoingLeft;
    }

    Draw(renderer) {
        super.Draw(renderer);
    }

    OnContactDetected(other) {
        if (other === "floor" || (other instanceof Block && other.body.GetPosition().y < this.body.GetPosition().y)) {
            const playerLinearVelocity = this.body.GetLinearVelocity();
        
            this.body.SetLinearVelocity(new b2Vec2(playerLinearVelocity.x, 0));

            this.canJump = true;
            this.onFloor = true;

            this.jumping = false;

            // play the idle animation
            this.PlayAnimationLoop(PlayerAnimationState.IDLE);
        }
        if (other instanceof Coin) {
            game.PlayerTookCoin(other);
        }
    }

    ApplyVelocity(vel) {
        let bodyVel = this.body.GetLinearVelocity();
        bodyVel.Add(vel);

        // horizontal movement cap
        if (Math.abs(bodyVel.x) > this.maxHorizontalVel)
            bodyVel.x = this.maxHorizontalVel * bodyVel.x / Math.abs(bodyVel.x);

        // vertical movement cap
        if (Math.abs(bodyVel.y) > this.maxVerticalVel)
            bodyVel.y = this.maxVerticalVel * bodyVel.y / Math.abs(bodyVel.y);

        this.body.SetLinearVelocity(bodyVel);
    }

    Jump() {
        if (Math.abs(this.body.GetLinearVelocity().y) > 0.1 || !this.canJump)
            return false;

        this.canJump = false;

        this.ApplyVelocity(new b2Vec2(0, this.jumpForce));
        this.onFloor = false;
        this.jumping = true;
        
        this.PlayAnimationLoop(PlayerAnimationState.JUMP);
    }
}

class Coin extends Box2DSSAnimationObjectComplex {
    constructor(position, img, physicsWorld) {
        super(position, 0, 2, img,
            [ [new Rect(6, 52, 14, 18), new Rect(26, 52, 14, 18), new Rect(46, 52, 14, 18), new Rect(68, 52, 14, 18)] ],
            [1 / 8],
            PhysicsObjectType.Box, physicsWorld, {
                width: 0.3,
                height: 0.3,
                type: b2Body.b2_kinematicBody,
                fixedRotation: true,
                isSensor: true
            }
        );
    }
}

class Block extends Box2DSpriteObject {
    constructor(position, img, physicsWorld) {
        super(position, 0, 3, img, PhysicsObjectType.Box, physicsWorld, {
            width: blockSize / physicsWorld.scale,
            height: blockSize / physicsWorld.scale,
            friction: 5,
            restitution: 0,
            type: b2Body.b2_staticBody
        });
    }

    Draw(renderer) {
        this.DrawSection(renderer, 20, 113, 16, 16)
    }
}

class BlockSpecial extends Block {
    constructor(position, img, physicsWorld) {
        super(position, img, physicsWorld);
    }

    Draw(renderer) {
        this.DrawSection(renderer, 2, 96, 16, 16)
    }
}

// initialize the game
window.onload = () => {
    Init(Box2DPlatformer);
}