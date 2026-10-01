const ENEMY_TYPE = {
    NORMAL: 0,
    KAMIKAZE: 1,
    ASTEROID: 2,
    WAVER: 3,
    STRAFER: 4,
    TANK: 5
}

class Enemy extends SpriteObject {
    static colliderColor = new Color(1, 0, 0, 0.25);
    static spawnColor = new Color(0, 0, 1, 0.25);

    constructor(initialPosition, img, player, sceneLimits) {
        super(initialPosition, 0, 1, img);

        this.player = player;
        this.sceneLimits = sceneLimits;

        this.speed = 100;
        this.life = 1;
        this.score = 1;
        this.collisionDamage = 1;
        this.spawnTime = 2;
        this.spawnBlinkTime = 1;

        this.boundingRadious = 18;
        this.boundingRadious2 = this.boundingRadious * this.boundingRadious;
    }

    Start() {
        this.collider = new CircleCollider(Vector2.Zero(), this.boundingRadious, this);
        this.game.AddCollider(this.collider);

        super.Start();
    }

    Update(deltaTime) {
        super.Update(deltaTime); // updates collider position
        
        // update spawn time
        if (this.spawnTime > 0) {
            this.spawnTime -= deltaTime;
            if (this.spawnTime < 0) {                   
                this.spawnTime = 0;
                this.sprite.alpha = 1;
            }
        }

        this.UpdateSpawnBlinkSprite();
    }

    Draw(renderer) {
        const colliderColor = this.IsSpawning() ? Enemy.spawnColor : Enemy.colliderColor;
        renderer.DrawFillCircle(this.position.x, this.position.y, this.boundingRadious, colliderColor);
    }
    
    UpdateSpawnBlinkSprite() {
        if (this.spawnTime > 0) {
            const spawnAlpha =  1 - ModDecimal(this.spawnTime,this.spawnBlinkTime);
            this.sprite.alpha = spawnAlpha;
        }
    }

    IsSpawning(){
        return this.spawnTime > 0 
    }

    Damage(damage) {
        this.life -= damage;
        if (this.life <= 0) {
            this.life = 0;
            return true;
        }
        return false;
    }

    OnCollisionEnter(myCollider, otherCollider) {
        if (this.IsSpawning())
            return; // invulnerable while spawning

        if (!(otherCollider.go instanceof Bullet))
            return;

        const bullet = otherCollider.go;
        bullet.active = false;

        if (this.Damage(bullet.damage)) {
            this.game.EnemyKilled(this);
        }
    }
}

class EnemyBasic extends Enemy {

    constructor(initialPosition, img, player, sceneLimits) {
        super(initialPosition, img, player, sceneLimits);

        this.speed = 110;
        this.life = 1;
        this.score = 1;
        this.collisionDamage = 1;

        this.boundingRadious = 18;
        this.boundingRadious2 = this.boundingRadious * this.boundingRadious;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // always face the player
        this.rotation = Math.atan2(
            this.player.position.y - this.position.y,
            this.player.position.x - this.position.x
        ) + PIH;
        
        // move forwards
        this.position.x += Math.cos(this.rotation - PIH) * this.speed * deltaTime;
        this.position.y += Math.sin(this.rotation - PIH) * this.speed * deltaTime;
    }

    Draw(renderer) {
        super.DrawSection(renderer, 149, 182, 31, 46);

        super.Draw(renderer);
    }
}

const KamikazeState = {
    looking: 0,
    kamikaze: 1
}

// #region EnemyKamikaze
// EnemyKamikaze states

class EnemyLookingState extends FSMState {
    constructor() {
        super();
        
        this.timer = 0;
    }

    Enter(owner, prev) {
        this.timer = 0;
    }

    Update(dt, owner, fsm) {
        // look for the player
        owner.rotation = Math.atan2(
            owner.player.position.y - owner.position.y,
            owner.player.position.x - owner.position.x
        ) + PIH;

        if (owner.IsSpawning())
            return;

        this.timer += dt;

        // Imperative transition: looking duration elapsed → kamikaze
        if (this.timer >= owner.lookingTime) {
            fsm.Transition('kamikaze');
        }
    }
}

class EnemyKamikazeState extends FSMState {
    constructor() {
        super();

        this.AddTransition('looking', owner => {
            if (owner.hasEnteredScene) {
                // check scene limits
                // left wall
                if (owner.position.x < owner.sceneLimits.position.x + owner.boundingRadious) {
                    owner.position.x = owner.sceneLimits.position.x + owner.boundingRadious;
                    return true;
                }
                // right wall
                if (owner.position.x > owner.sceneLimits.position.x + owner.sceneLimits.width - owner.boundingRadious) {
                    owner.position.x = owner.sceneLimits.position.x + owner.sceneLimits.width - owner.boundingRadious;
                    return true;
                }
                // top wall
                if (owner.position.y < owner.sceneLimits.position.y + owner.boundingRadious) {
                    owner.position.y = owner.sceneLimits.position.y + owner.boundingRadious;
                    return true;
                }
                // bottom wall
                if (owner.position.y > owner.sceneLimits.position.y + owner.sceneLimits.height - owner.boundingRadious) {
                    owner.position.y = owner.sceneLimits.position.y + owner.sceneLimits.height - owner.boundingRadious;
                    return true;
                }
            }
            return false;
        });
    }

    Update(dt, owner, fsm) {
        // Move forwards
        owner.position.x += Math.cos(owner.rotation - PIH) * owner.speed * dt;
        owner.position.y += Math.sin(owner.rotation - PIH) * owner.speed * dt;

        // Check if it has entered the scene
        if (!owner.hasEnteredScene) {
            if (owner.position.x >= owner.sceneLimits.position.x + owner.boundingRadious &&
                owner.position.x <= owner.sceneLimits.position.x + owner.sceneLimits.width - owner.boundingRadious &&
                owner.position.y >= owner.sceneLimits.position.y + owner.boundingRadious &&
                owner.position.y <= owner.sceneLimits.position.y + owner.sceneLimits.height - owner.boundingRadious) {
                owner.hasEnteredScene = true;
            }
        }
    }
}

class EnemyKamikaze extends Enemy {
    constructor(initialPosition, img, player, sceneLimits) {
        super(initialPosition, img, player, sceneLimits);

        this.fsm = new FSM(this, 'looking')
            .AddState('looking',  new EnemyLookingState())
            .AddState('kamikaze', new EnemyKamikazeState());

        this.lookingTime = 2;

        this.speed = 850;
        this.score = 2;

        this.thrustFireSprite = new Sprite(img, initialPosition, 0, 0.66);
        this.thrustFireSprite.alpha = 1;
        this.thrustFirePosition = new Vector2(-40, 0);

        this.hasEnteredScene = false;
    }

    Start() {
        super.Start();
        this.fsm.Start();
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.thrustFireSprite.rotation = this.rotation;
        const firePosition = RotatePointAroundPoint({x: this.position.x + this.thrustFirePosition.x, y: this.position.y + this.thrustFirePosition.y}, this.position, this.rotation - PIH);
        this.thrustFireSprite.position.Set(firePosition.x, firePosition.y);

        this.thrustFireSprite.alpha = (Math.cos(totalTime * 20) + 1) / 2;
        this.thrustFireSprite.alpha += (Math.cos(totalTime * 54.67) + 1) / 2;

        this.fsm.Update(deltaTime);
    }

    Draw(renderer) {
        this.thrustFireSprite.DrawSection(renderer, 180, 182, 32, 76);
        
        super.DrawSection(renderer, 149, 182, 31, 46);

        super.Draw(renderer);
    }
}

// #endregion

// #region EnemyAsteroid

class EnemyAsteroid extends Enemy {
    constructor(initialPosition, img, player, sceneLimits, direction, small) {
        super(initialPosition, img, player, sceneLimits);
        
        this.speed = 24;
        this.rotationSpeed = RandomBetweenFloat(-2, 2);
        this.score = 1;

        if (typeof(direction) === 'undefined') {
            this.direction = new Vector2(player.position.x - this.position.x, player.position.y - this.position.y);
            this.direction.Normalize();
        }
        else
            this.direction = direction;

        this.small = typeof(small) !== 'undefined' ? small : false;

        this.boundingRadious = this.small ? 16 : 22;
        this.boundingRadious2 = this.boundingRadious * this.boundingRadious;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.rotation += this.rotationSpeed * deltaTime;

        if (this.IsSpawning())
            return;

        // move forwards
        this.position.x += this.direction.x * this.speed * deltaTime;
        this.position.y += this.direction.y * this.speed * deltaTime;

        // remove it if its too far from the scene
        if ((this.position.x < this.sceneLimits.position.x - 200) || // west
            (this.position.x > this.sceneLimits.position.x + this.sceneLimits.width + 200) || // east
            (this.position.y < this.sceneLimits.position.y - 200) || // north
            (this.position.y > this.sceneLimits.position.y + this.sceneLimits.height + 200)) { // south
            this.game.RemoveEnemy(this);
        }
    }

    Draw(renderer) {   
        this.UpdateSpawnBlinkSprite();

        if (this.small)
            super.DrawSection(renderer, 144, 476, 32, 32);
        else
            super.DrawSection(renderer, 144, 428, 48, 48);

        super.Draw(renderer);
    }

    Damage(damage) {
        const dead = super.Damage(damage);
        if (dead && !this.small) {
            // spawn two small asteroids
            const smallAsteroidA = new EnemyAsteroid(Vector2.Copy(this.position), this.sprite.img, this.player, this.sceneLimits, new Vector2(-this.direction.y, this.direction.x), true);
            // Instantly spawn
            smallAsteroidA.spawnTime = 0;

            const smallAsteroidB = new EnemyAsteroid(Vector2.Copy(this.position), this.sprite.img, this.player, this.sceneLimits, new Vector2(this.direction.y, -this.direction.x), true);
            // Instantly spawn
            smallAsteroidB.spawnTime = 0;
            
            this.game.AddEnemy(smallAsteroidA);
            this.game.AddEnemy(smallAsteroidB);
        }

        return dead;
    }
}

// #endregion

// #region EnemyWaver

class EnemyWaver extends Enemy {
    constructor(initialPosition, img, player, sceneLimits) {
        super(initialPosition, img, player, sceneLimits);

        this.speed = 188;
        this.score = 2;

        this.waveFreq = RandomBetweenFloat(4.2, 6.5);
        this.waveAmplitude = RandomBetweenFloat(0.45, 0.8);
        this.waveTime = RandomBetweenFloat(0, PI2);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (this.IsSpawning())
            return;

        this.waveTime += deltaTime * this.waveFreq;

        const toPlayer = new Vector2(
            this.player.position.x - this.position.x,
            this.player.position.y - this.position.y
        );
        toPlayer.Normalize();

        const perp = new Vector2(-toPlayer.y, toPlayer.x);
        const wave = Math.sin(this.waveTime) * this.waveAmplitude;

        const move = new Vector2(
            toPlayer.x + perp.x * wave,
            toPlayer.y + perp.y * wave
        );
        move.Normalize();

        this.rotation = Math.atan2(move.y, move.x) + PIH;
        this.position.x += move.x * this.speed * deltaTime;
        this.position.y += move.y * this.speed * deltaTime;
    }

    Draw(renderer) {
        super.DrawSection(renderer, 149, 182, 31, 46);
        super.Draw(renderer);
    }
}

// #endregion

// #region EnemyStrafer

class EnemyStrafer extends Enemy {
    constructor(initialPosition, img, player, sceneLimits) {
        super(initialPosition, img, player, sceneLimits);

        this.speed = 150;
        this.score = 3;
        this.orbitRadius = 220;
        this.strafeDirection = Math.random() < 0.5 ? -1 : 1;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (this.IsSpawning())
            return;

        const toPlayer = new Vector2(
            this.player.position.x - this.position.x,
            this.player.position.y - this.position.y
        );
        const distance = toPlayer.Length();
        toPlayer.Normalize();

        const tangent = new Vector2(-toPlayer.y * this.strafeDirection, toPlayer.x * this.strafeDirection);
        const radialWeight = distance > this.orbitRadius ? 0.55 : distance < this.orbitRadius - 45 ? -0.55 : 0.0;

        const move = new Vector2(
            tangent.x + toPlayer.x * radialWeight,
            tangent.y + toPlayer.y * radialWeight
        );
        move.Normalize();

        this.rotation = Math.atan2(move.y, move.x) + PIH;
        this.position.x += move.x * this.speed * deltaTime;
        this.position.y += move.y * this.speed * deltaTime;
    }

    Draw(renderer) {
        super.DrawSection(renderer, 149, 182, 31, 46);
        super.Draw(renderer);
    }
}

// #endregion

// #EnemyTank

class EnemyTank extends Enemy {
    constructor(initialPosition, img, player, sceneLimits) {
        super(initialPosition, img, player, sceneLimits);

        this.speed = 84;
        this.life = 3;
        this.score = 5;
        this.collisionDamage = 2;
        this.boundingRadious = 26;
        this.boundingRadious2 = this.boundingRadious * this.boundingRadious;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (this.IsSpawning())
            return;

        this.rotation = Math.atan2(
            this.player.position.y - this.position.y,
            this.player.position.x - this.position.x
        ) + PIH;

        this.position.x += Math.cos(this.rotation - PIH) * this.speed * deltaTime;
        this.position.y += Math.sin(this.rotation - PIH) * this.speed * deltaTime;
    }

    Draw(renderer) {
        // Reuse asteroid body as a heavier silhouette for tank enemies.
        super.DrawSection(renderer, 124, 20, 48, 48);
        super.Draw(renderer);
    }
}

// #endregion