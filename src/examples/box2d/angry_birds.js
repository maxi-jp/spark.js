const BIRD_STATE = {
    IDLE: 0,
    DRAGGING: 1,
    FLYING: 2
};

const LEVELS = [
    {
        // Level 1 - The Classic
        blocks: [
            {x: 550, y: 470, w: 20, h: 60},
            {x: 650, y: 470, w: 20, h: 60},
            {x: 600, y: 430, w: 140, h: 20},
            {x: 570, y: 390, w: 20, h: 60},
            {x: 630, y: 390, w: 20, h: 60},
            {x: 600, y: 350, w: 100, h: 20}
        ],
        pigs: [
            {x: 600, y: 480},
            {x: 600, y: 400}
        ]
    },
    {
        // Level 2 - Twin Towers
        blocks: [
            {x: 500, y: 470, w: 20, h: 60},
            {x: 580, y: 470, w: 20, h: 60},
            {x: 540, y: 430, w: 100, h: 20},
            {x: 660, y: 470, w: 20, h: 60},
            {x: 740, y: 470, w: 20, h: 60},
            {x: 700, y: 430, w: 100, h: 20},
            {x: 620, y: 390, w: 220, h: 20},
            {x: 620, y: 350, w: 20, h: 60}
        ],
        pigs: [
            {x: 540, y: 480},
            {x: 700, y: 480},
            {x: 620, y: 360}
        ]
    },
    {
        // Level 3 - The Heavy Pillar
        blocks: [
            {x: 620, y: 470, w: 20, h: 60},
            {x: 620, y: 410, w: 20, h: 60},
            {x: 560, y: 470, w: 20, h: 60},
            {x: 680, y: 470, w: 20, h: 60},
            {x: 620, y: 370, w: 180, h: 20}
        ],
        pigs: [
            {x: 560, y: 480},
            {x: 680, y: 480},
            {x: 620, y: 340}
        ]
    }
];

class AngryBirdsClone extends Box2DGame {
    constructor(renderer) {
        // scale: 100 (1m = 100px), gravity: -9.8 m/s^2, doSleep: true
        super(renderer, 100, { x: 0, y: -9.8 }, true);
        
        this.Configure({
            screenWidth: 800,
            screenHeight: 600,
            drawColliders: false,
            collidersOnly: false,
            imageSmoothingEnabled: true,
            fillWindow: 'mobile'
        });

        this.slingshotPos = new Vector2(150, 400);
        this.maxDragDistance = 100;
        this.bird = null;
        this.state = BIRD_STATE.IDLE;
        this.impulseForce = 2.0 / this.physicsScale;
        this.settleTimer = 0.5;
        this.settleTimerAux = 0;
        this.pigs = [];
        this.blocks = [];
        this.currentLevelIndex = 0;
        this.score = 0;
    }

    Start() {
        super.Start();
        this.DestroyAllGameObjects();

        // Create static floor at Canvas Y = 500
        // Box2D coordinates: X = 4 (400px), Y = 1 (600 - 500 = 100px = 1m)
        CreateEdge(this.physicsWorld, 4, 1, {
            p1x: -4, p1y: 0, p2x: 4, p2y: 0,
            type: b2Body.b2_staticBody, 
            friction: 5.0
        });

        this.pigs = [];
        this.blocks = [];

        this.SpawnBird();
        this.BuildLevel();

        this.levelTime = 0;
    }

    SpawnBird() {
        this.bird = new Bird(this.slingshotPos, this.physicsWorld);
        this.AddGameObject(this.bird);
        this.state = BIRD_STATE.IDLE;

        this.settleTimer = 1.0;
        this.settleTimerAux = 0;
    }

    BuildLevel() {
        const levelData = LEVELS[this.currentLevelIndex];

        for (let b of levelData.blocks) {
            const block = new Block(new Vector2(b.x, b.y), b.w, b.h, this.physicsWorld);
            this.blocks.push(block);
            this.AddGameObject(block);
        }

        for (let p of levelData.pigs) {
            const pig = new Pig(new Vector2(p.x, p.y), this.physicsWorld);
            this.pigs.push(pig);
            this.AddGameObject(pig);
        }
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        this.levelTime += deltaTime;

        if (this.state === BIRD_STATE.IDLE) {
            // Check if mouse clicks near the bird
            if (Input.IsMouseDown()) {
                const dist = Vector2.Magnitude(Input.mouse, this.slingshotPos);
                if (dist < 40) {
                    this.state = BIRD_STATE.DRAGGING;
                }
            }
        } 
        else if (this.state === BIRD_STATE.DRAGGING) {
            // Calculate drag vector
            let dragVec = new Vector2(Input.mouse.x - this.slingshotPos.x, Input.mouse.y - this.slingshotPos.y);
            
            // Clamp drag to maximum stretch
            if (dragVec.Length() > this.maxDragDistance) {
                dragVec.Normalize().MultiplyScalar(this.maxDragDistance);
            }
            
            // Visually move the bird
            this.bird.position.Set(this.slingshotPos.x + dragVec.x, this.slingshotPos.y + dragVec.y);

            if (Input.IsMouseUp()) {
                // Launch the bird!
                this.state = BIRD_STATE.FLYING;
                this.bird.body.SetActive(true);

                // Apply impulse opposite to the drag direction
                this.bird.ApplyImpulse(
                    -dragVec.x * this.impulseForce, 
                     dragVec.y * this.impulseForce
                );
            }
        } 
        else if (this.state === BIRD_STATE.FLYING) {
            let allAsleep = true;
            
            const dynamicObjects = [this.bird, ...this.pigs, ...this.blocks];

            // Check our tracked physics objects to see if the scene has settled
            for (let i = 0; i < dynamicObjects.length; i++) {
                const go = dynamicObjects[i];
                if (go.active && go.body) {
                    // If an object falls completely out of bounds, safely destroy it
                    if (go.position.x < -200 || go.position.x > this.screenWidth + 200 || go.position.y > this.screenHeight + 100) {
                        if (go instanceof Pig)
                            go.Die();
                        else if (go instanceof Block)
                            go.Die();
                        else
                            this.Destroy(go);

                        continue;
                    }
                    
                    if (go.body.IsAwake()) {
                        allAsleep = false;
                    }
                }
            }

            // Once everything is asleep, wait a moment and spawn the next bird
            if (allAsleep) {
                this.settleTimerAux += deltaTime;
                if (this.settleTimerAux > this.settleTimer) {
                    
                    // Check if all pigs are dead
                    const alivePigsCount = this.pigs.filter(p => p.active).length;
                    
                    if (alivePigsCount === 0) {
                        // Level complete! Move to next and reset world
                        this.currentLevelIndex = (this.currentLevelIndex + 1) % LEVELS.length;
                        this.Start();
                    }
                    else {
                        // Level not over, spawn next bird
                        if (this.bird && this.bird.active) {
                            this.Destroy(this.bird);
                        }
                        this.SpawnBird();
                    }
                }
            }
            else {
                this.settleTimerAux = 0;
            }
        }

        // Reset level binding
        if (Input.IsKeyDown(KEY_R)) {
            this.currentLevelIndex = 0;
            this.score = 0;
            this.Start();
        }

        if (Input.IsKeyDown(KEY_A)) {
            this.config.drawColliders = !this.config.drawColliders;
            this.config.collidersOnly = !this.config.collidersOnly;
        }
    }

    Draw() {
        // Sky
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, new Color(0.5, 0.8, 1.0));
        
        // Floor
        this.renderer.DrawFillBasicRectangle(0, 500, this.screenWidth, 100, new Color(0.3, 0.8, 0.3));

        // Slingshot base
        this.renderer.DrawFillBasicRectangle(this.slingshotPos.x - 5, this.slingshotPos.y + 10, 10, 90, new Color(0.4, 0.2, 0.05));

        // Rubber band (back layer)
        if (this.state === BIRD_STATE.DRAGGING) {
            this.renderer.DrawLine(this.slingshotPos.x - 15, this.slingshotPos.y, this.bird.position.x, this.bird.position.y, new Color(0.2, 0.1, 0), 4);
        }

        // Draw physics objects (Birds, Pigs, Blocks)
        super.Draw();

        // Rubber band (front layer)
        if (this.state === BIRD_STATE.DRAGGING) {
            this.renderer.DrawLine(this.slingshotPos.x + 15, this.slingshotPos.y, this.bird.position.x, this.bird.position.y, new Color(0.2, 0.1, 0), 4);
        }

        this.renderer.DrawFillText(`Level: ${this.currentLevelIndex + 1}   Score: ${this.score}   Time: ${Math.floor(this.levelTime)}s`, this.screenHalfWidth, 30, "bold 20px Arial", Color.black, "center");
        
        this.renderer.DrawFillText("Drag the red bird to shoot! Press 'R' to restart game.", 20, this.screenHeight - 30, "18px Arial", Color.black, "left");
        this.renderer.DrawFillText("Press 'A' to toggle rigid bodies visualization.", 20, this.screenHeight - 10, "18px Arial", Color.black, "left");
    }
}

class Bird extends Box2DGameObject {
    constructor(position, physicsWorld) {
        super(position, physicsWorld, PhysicsObjectType.Circle, {
                radius: 0.15, density: 2.0, friction: 0.5, restitution: 0.4,
                angularDamping: 2.0, linearDamping: 0.2,
                type: b2Body.b2_dynamicBody
            }
        );
        this.drawRadius = 15;
        this.body.SetActive(false); // disable physics initially so it stays in the slingshot
    }

    Draw(renderer) {
        renderer.DrawFillCircle(this.position.x, this.position.y, this.drawRadius, Color.red);
        renderer.DrawStrokeCircle(this.position.x, this.position.y, this.drawRadius, Color.black, 2);
        // Simple Angry Face
        renderer.DrawFillCircle(this.position.x + 5, this.position.y - 3, 3, Color.white);
        renderer.DrawFillCircle(this.position.x + 5, this.position.y - 3, 1, Color.black);
        renderer.DrawLine(this.position.x + 1, this.position.y - 7, this.position.x + 10, this.position.y - 5, Color.black, 2); 
    }
}

class Pig extends Box2DGameObject {
    constructor(position, physicsWorld) {
        super(position, physicsWorld, PhysicsObjectType.Circle, {
                radius: 0.15, density: 1.0, friction: 0.5, restitution: 0.3,
                angularDamping: 2.0, linearDamping: 0.2,
                type: b2Body.b2_dynamicBody
            }
        );
        this.drawRadius = 15;
        this.maxHealth = 100;
        this.health = this.maxHealth;
    }

    OnContactDetected(other, contactPoint) {
        if (!this.active || !other)
            return;

        // Calculate relative velocity as a proxy for impact force
        const myVel = this.body.GetLinearVelocity();
        const otherVel = other.body ? other.body.GetLinearVelocity() : new b2Vec2(0, 0);
        
        const relVx = myVel.x - otherVel.x;
        const relVy = myVel.y - otherVel.y;
        const impactVelocity = Math.sqrt(relVx * relVx + relVy * relVy);

        // Treat static bodies (like the ground) as having a baseline heavy mass
        let otherMass = 2.0; 
        if (other.body && other.body.GetType() === b2Body.b2_dynamicBody) {
            otherMass = other.body.GetMass() * 10.0; // Extract actual mass in Kg and scale it up
        }

        // Calculate actual kinetic impact force (velocity * mass)
        const impactForce = impactVelocity * otherMass;

        // Apply damage only for significant impacts
        if (impactForce > 2.0) {
            this.health -= impactForce * 6; 
            if (this.health <= 0)
                this.Die();
        }
    }

    Die() {
        if (!this.active)
            return;
        game.score += 5000;

        game.AddGameObject(new PuffExplosion(new Vector2(this.position.x, this.position.y), 5000));
        game.Destroy(this);
    }

    Draw(renderer) {
        renderer.DrawFillCircle(this.position.x, this.position.y, this.drawRadius, Color.lime);
        renderer.DrawStrokeCircle(this.position.x, this.position.y, this.drawRadius, Color.black, 2);
        // Simple Pig Face
        renderer.DrawFillCircle(this.position.x + 4, this.position.y - 2, 2, Color.white);
        renderer.DrawFillCircle(this.position.x + 4, this.position.y - 2, 1, Color.black);

        if (this.health < this.maxHealth) {
            const healthPct = Math.max(0, this.health / this.maxHealth);
            const barW = this.drawRadius * 2;
            const barH = 4;
            const barX = this.position.x - barW / 2;
            const barY = this.position.y - this.drawRadius - 10;
            renderer.DrawFillBasicRectangle(barX, barY, barW, barH, Color.red);
            renderer.DrawFillBasicRectangle(barX, barY, barW * healthPct, barH, Color.green);
            renderer.DrawStrokeBasicRectangle(barX, barY, barW, barH, Color.black, 1);
        }
    }
}

class Block extends Box2DRectangleGO {
    constructor(position, width, height, physicsWorld) {
        super(position, physicsWorld, PhysicsObjectType.Box, {
                width: width / physicsWorld.scale, height: height / physicsWorld.scale,
                density: 1.5, friction: 0.8, restitution: 0.1,
                type: b2Body.b2_dynamicBody
            },
            width, height, Color.orange
        );
        this.maxHealth = 150;
        this.health = this.maxHealth;
    }

    OnContactDetected(other, contactPoint) {
        if (!this.active || !other)
            return;

        // Calculate relative velocity as a proxy for impact force
        const myVel = this.body.GetLinearVelocity();
        const otherVel = other.body ? other.body.GetLinearVelocity() : new b2Vec2(0, 0);
        
        const relVx = myVel.x - otherVel.x;
        const relVy = myVel.y - otherVel.y;
        const impactVelocity = Math.sqrt(relVx * relVx + relVy * relVy);

        // Treat static bodies (like the ground) as having a baseline heavy mass
        let otherMass = 2.0; 
        if (other.body && other.body.GetType() === b2Body.b2_dynamicBody) {
            otherMass = other.body.GetMass() * 10.0;
        }

        // Calculate actual kinetic impact force (velocity * mass)
        const impactForce = impactVelocity * otherMass;

        // Apply damage only for significant impacts
        if (impactForce > 3.0) {
            this.health -= impactForce * 6; 
            if (this.health <= 0) this.Die();
        }
    }

    Die() {
        if (!this.active)
            return;
        game.score += 500;

        game.AddGameObject(new PuffExplosion(new Vector2(this.position.x, this.position.y), 500));
        game.Destroy(this);
    }

    Draw(renderer) {
        renderer.DrawFillRectangle(this.position.x, this.position.y, this.width, this.height, this.color, this.rotation);
        renderer.DrawStrokeRectangle(this.position.x, this.position.y, this.width, this.height, Color.black, 2, this.rotation);

        if (this.health < this.maxHealth) {
            const healthPct = Math.max(0, this.health / this.maxHealth);
            const barW = this.width;
            const barH = 4;
            const barX = this.position.x - barW / 2;
            const barY = this.position.y - this.height / 2 - 10;
            renderer.DrawFillBasicRectangle(barX, barY, barW, barH, Color.red);
            renderer.DrawFillBasicRectangle(barX, barY, barW * healthPct, barH, Color.green);
            renderer.DrawStrokeBasicRectangle(barX, barY, barW, barH, Color.black, 1);
        }
    }
}

class PuffExplosion extends GameObject {
    constructor(position, points = 5000) {
        super(position);
        this.timer = 0;
        this.duration = 0.5;
        this.points = points;
        
        // Generate a random cluster of cloud particles
        this.particles = [];
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                offsetX: RandomBetweenFloat(-10, 10),
                offsetY: RandomBetweenFloat(-10, 10),
                radius: RandomBetweenFloat(10, 20),
                speedX: RandomBetweenFloat(-40, 40),
                speedY: RandomBetweenFloat(-40, 40)
            });
        }
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        
        this.timer += deltaTime;
        if (this.timer >= this.duration) {
            game.Destroy(this);
            return;
        }

        for (let p of this.particles) {
            p.offsetX += p.speedX * deltaTime;
            p.offsetY += p.speedY * deltaTime;
        }
    }

    Draw(renderer) {
        const progress = this.timer / this.duration;
        const alpha = 1 - progress;
        
        for (let p of this.particles) {
            const r = p.radius * (0.5 + progress * 0.5); // expand slightly over time
            renderer.DrawFillCircle(this.position.x + p.offsetX, this.position.y + p.offsetY, r, new Color(1, 1, 1, alpha * 0.8));
        }
        
        // Rising score text
        renderer.DrawFillText(this.points.toString(), this.position.x, this.position.y - 15 - (progress * 25), "bold 16px Arial", new Color(1, 1, 1, alpha), "center");
    }
}

window.onload = () => {
    Init(AngryBirdsClone);
}