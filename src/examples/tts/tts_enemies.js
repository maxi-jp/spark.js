const ENEMY_TYPE = {
    NORMAL: 0,
    KAMIKAZE: 1,
    ASTEROID: 2,
    WAVER: 3,
    STRAFER: 4,
    TANK: 5,
    BOSS: 6
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

// #region boss

const BOSS_COLORS = {
    phase1:       new Color(0.2, 0.7, 1.0),   // Guardian Blue
    phase2:       new Color(1.0, 0.65, 0.1),  // Overdrive Orange
    phase3:       new Color(1.0, 0.2, 0.3),   // Berserk Crimson
    hero:         new Color(0.3, 0.9, 0.4),   // Hero Green
    heroBullet:   new Color(0.5, 1.0, 0.8),
    bossBullet:   new Color(1.0, 0.4, 0.1),
    telegraph:    new Color(1.0, 0.15, 0.15, 0.35),
    shockwave:    new Color(1.0, 0.3, 0.3)
};

class EnemyBossBullet extends GameObject {
    constructor(owner, speed, radius, damage) {
        super(Vector2.Zero());

        this.direction = Vector2.Zero();
        this.speed = speed;
        this.radius = radius;
        this.damage = damage;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.position.Set(
            this.position.x + (this.direction.x * this.speed * deltaTime),
            this.position.y + (this.direction.y * this.speed * deltaTime)
        );
    }

    Draw(renderer) {
        renderer.DrawFillCircle(this.position.x, this.position.y, this.radius, BOSS_COLORS.bossBullet);
    }
}

class EnemyBoss extends Enemy {
    // Behavior Tree Enemy based on the example project bt_boss of spark.js
    constructor(initialPosition, img, player, sceneLimits) {
        super(initialPosition, img, player, sceneLimits);

        this.speed = 110;
        this.phase1Speed = 75;
        this.maxLife = 600;
        this.life = 600;
        this.phase1Health = this.life;
        this.phase2Health = 400;
        this.phase3Health = 100;
        this.score = 100;
        this.collisionDamage = 1;

        this.bulletPool = new Pool(this, 20, EnemyBossBullet, [
            this,
            175, // speed
            7 // radius
        ]);
        
        this.radius = 30;

        this.boundingRadious = 18;
        this.boundingRadious2 = this.boundingRadious * this.boundingRadious;

        // Combat & Animation states
        this.phaseColor = BOSS_COLORS.phase1;
        this.currentPhaseName = 'Guardian';
        this.orbitalAngle = 0;

        // Telegraph & Attack properties
        this.telegraphType = null; // 'slam', 'charge', 'laser'
        this.telegraphTimer = 0;
        this.telegraphDuration = 0;
        this.chargeDir = new Vector2();
        this.chargeDistance = 190;     // Minimum charge lunge distance
        this.chargeTargetDistance = 0; // Actual distance to player when charge starts
        this.chargeSpeed = 540;        // Speed of the charge lunge attack
        this.laserAngle = 0;
        this.laserSweepProgress = 0;

        // Bullets stats
        this.phase1BulletSpeed = 220;
        this.phase1BulletRadius = 8;

        this.phase1MaxDistanceToPlayer = 180;
        this.phase1MaxDistanceToPlayerSqr = this.phase1MaxDistanceToPlayer * this.phase1MaxDistanceToPlayer;

        // Behaviour Tree
        this.blackboard = null;
        this.bt = null;
    }
    
    Start() {
        super.Start();
        
        // Construct the Behavior Tree
        this._BuildBehaviorTree();
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // Update Phase name and theme colors
        if (this.life <= 100) {
            this.currentPhaseName = 'PHASE 3: BERSERK';
            this.phaseColor = BOSS_COLORS.phase3;
        }
        else if (this.life <= 400) {
            this.currentPhaseName = 'PHASE 2: OVERDRIVE';
            this.phaseColor = BOSS_COLORS.phase2;
        }
        else {
            this.currentPhaseName = 'PHASE 1: GUARDIAN';
            this.phaseColor = BOSS_COLORS.phase1;
        }

        // Orbiting armor animation
        this.orbitalAngle += (this.life <= 300 ? 5.5 : 2.5) * deltaTime;

        // Face player smoothly
        const dx = this.player.position.x - this.position.x;
        const dy = this.player.position.y - this.position.y;
        this.rotation = Math.atan2(dy, dx);

        // Tick Behavior Tree
        if (this.life > 0) {
            this.bt.Update(deltaTime);
        }

        // Update the bullets
        this.bulletPool.Update(deltaTime);

        // Arena boundary clamp
        this.position.x = Clamp(this.position.x, 60, this.sceneLimits.width - 60);
        this.position.y = Clamp(this.position.y, 60, this.sceneLimits.height - 60);
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        // 1. Draw Telegraphs
        this._DrawTelegraphs(renderer);

        // 2. Boss Armor Plates (Orbiting)
        const plateCount = this.life <= 300 ? 5 : 4;
        const plateDist = this.radius + 12;
        for (let i = 0; i < plateCount; i++) {
            const angle = this.orbitalAngle + (i * (PI2 / plateCount));
            const px = x + Math.cos(angle) * plateDist;
            const py = y + Math.sin(angle) * plateDist;
            renderer.DrawFillCircle(px, py, 6, this.phaseColor);
            renderer.DrawStrokeCircle(px, py, 6, Color.white, 1);
        }

        // 3. Boss Main Core
        renderer.DrawFillCircle(x, y, this.radius, new Color(0.12, 0.14, 0.18));
        renderer.DrawFillCircle(x, y, this.radius * 0.75, this.phaseColor);
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 2);

        // 4. Bullets
        this.bulletPool.Draw(renderer);

        // Cannon / Facing nozzle
        const cannonX = x + Math.cos(this.rotation) * (this.radius + 8);
        const cannonY = y + Math.sin(this.rotation) * (this.radius + 8);
        renderer.DrawLine(x, y, cannonX, cannonY, Color.white, 3);

        // 5. Overhead Phase & Active Leaf debug
        renderer.DrawFillText(this.currentPhaseName, x, y - this.radius - 22, 'bold 11px monospace', this.phaseColor, 'center');
        this.bt.DrawDebug(renderer, x, y - this.radius - 9);

        super.Draw(renderer);
    }

    _BuildBehaviorTree() {
        this.blackboard = new BTBlackboard();

        // BTReactiveSelector: Top-level Phase switcher based on Boss HP.
        // Phase 3 (HP <= 100) > Phase 2 (HP <= 400) > Phase 1 (HP > 400)
        this.bt = new BehaviorTree(this,
            new BTReactiveSelector('TitanBossAI', [

                // ── Phase 3: Berserk Meltdown (HP <= 100) ────────────────────────
                new BTSequence('Phase3_Berserk', [
                    new BTCondition('IsPhase3', (b) => b.hp <= this.phase3Health),
                    new BTReactiveSelector('BerserkBranch', [

                        // Attack 1: Ground Slam Shockwave (Cooldown: 3.2s)
                        new BTCooldown('GroundSlamCooldown',
                            new BTSequence('GroundSlamCombo', [
                                new BTAction('TelegraphSlam', (dt, b) => b.ActionStartSlam(0.9)),
                                new BTWait('SlamWindup', 0.9),
                                new BTAction('ReleaseShockwave', (dt, b) => b.ActionReleaseShockwave()),
                                new BTWait('SlamRecovery', 0.4)
                            ]), 3.2
                        ),

                        // Attack 2: Radial Bullet Barrage (Cooldown: 2.2s)
                        new BTCooldown('FrenzyBarrageCooldown',
                            new BTSequence('FrenzyBarrage', [
                                new BTAction('RadialBurst1', (dt, b) => b.ActionRadialBurst(8)),
                                new BTWait('BurstGap', 0.35),
                                new BTAction('RadialBurst2', (dt, b) => b.ActionRadialBurst(10))
                            ]), 2.2
                        ),

                        // Fallback: Aggressive Pursuit
                        new BTAction('BerserkChase', (dt, b) => b.ActionChasePlayer(dt, 155))
                    ])
                ]),

                // ── Phase 2: Overdrive Enrage (300 < HP <= 400) ──────────────────
                new BTSequence('Phase2_Overdrive', [
                    new BTCondition('IsPhase2', (b) => b.hp <= this.phase2Health),
                    new BTReactiveSelector('OverdriveBranch', [

                        // Attack 1: Sweeping Plasma Laser (Cooldown: 5.0s)
                        new BTCooldown('LaserSweepCooldown',
                            new BTSequence('LaserSweepAttack', [
                                new BTAction('TelegraphLaser', (dt, b) => b.ActionStartLaser(0.8)),
                                new BTWait('LaserWindup', 0.8),
                                new BTAction('ChannelLaserSweep', (dt, b) => b.ActionChannelLaser(dt, 1.4))
                            ]), 5.0
                        ),

                        // Attack 2: Spread Shot Missiles (Cooldown: 2.8s)
                        new BTCooldown('SpreadMissileCooldown',
                            new BTSequence('SpreadMissiles', [
                                new BTAction('FireSpread', (dt, b) => b.ActionSpreadShot(5)),
                                new BTWait('SpreadCooldown', 0.5)
                            ]), 2.8
                        ),

                        // Fallback: Strafe around Player
                        new BTAction('OverdriveStrafe', (dt, b) => b.ActionStrafeAroundPlayer(dt, 105))
                    ])
                ]),

                // ── Phase 1: Guardian Mode (HP > 400) ────────────────────────────
                new BTSequence('Phase1_Guardian', [
                    new BTReactiveSelector('GuardianBranch', [
                        // TODO por aquí, este cooldown parece que no se ejecuta después de la primera vez
                        // Attack 1: Telegraph Charge Lunge (Cooldown: 4.2s)
                        new BTCooldown('ChargeLungeCooldown',
                            new BTSequence('ChargeLungeAttack', [
                                new BTAction('TelegraphCharge', (dt, b) => b.ActionStartCharge(0.85)),
                                new BTWait('ChargeWindup', 0.85),
                                new BTAction('ExecuteLunge', (dt, b) => b.ActionExecuteLunge(dt)),
                                new BTWait('PostLungeStun', 0.6)
                            ]), 4.0
                        ),

                        // Attack 2: Homing Plasma Orb (Cooldown: 2.2s)
                        new BTCooldown('PlasmaBoltCooldown',
                            new BTSequence('PlasmaBolt', [
                                new BTAction('FireBolt', (dt, b) => b.ActionFireOrb()),
                                new BTWait('BoltDelay', 0.2)
                            ]), 0.8
                        ),

                        // Fallback: Approach & Patrol
                        new BTAction('GuardianApproach', (dt, b) => b.ActionApproachPlayer(dt, this.phase1Speed))
                    ])
                ])

            ]),
            this.blackboard
        );
    }

    // ── Attack Actions ───────────────────────────────────────────────────────

    // --- Ground Slam (Phase 3) ---
    ActionStartSlam(duration) {
        this.telegraphType = 'slam';
        this.telegraphDuration = duration;
        this.telegraphTimer = 0;

        return BTStatus.SUCCESS;
    }

    ActionReleaseShockwave() {
        this.telegraphType = null;
        this.game.SpawnShockwave(this.position.x, this.position.y, 220);

        return BTStatus.SUCCESS;
    }

    // --- Radial Burst (Phase 3) ---
    ActionRadialBurst(count) {
        const step = PI2 / count;
        for (let i = 0; i < count; i++) {
            const angle = i * step + this.orbitalAngle;
            const bullet = this.bulletPool.Activate();
            bullet.position.Set(this.position.x, this.position.y);
            bullet.direction.Set(Math.cos(angle), Math.sin(angle));
            bullet.speed = 175;
            bullet.radius = 7;
        }

        return BTStatus.SUCCESS;
    }

    // --- Laser Sweep (Phase 2) ---
    ActionStartLaser(duration) {
        this.telegraphType = 'laser';
        this.telegraphDuration = duration;
        this.telegraphTimer = 0;
        this.laserAngle = this.rotation - 0.9;
        this.laserSweepProgress = 0;

        return BTStatus.SUCCESS;
    }

    ActionChannelLaser(dt, duration) {
        this.telegraphType = null;
        this.laserSweepProgress += dt / duration;
        this.laserAngle = (this.rotation - 0.9) + this.laserSweepProgress * 1.8;

        // Continuously fire laser sparks
        const lx = this.position.x + Math.cos(this.laserAngle) * 35;
        const ly = this.position.y + Math.sin(this.laserAngle) * 35;

        const bullet = this.bulletPool.Activate();
        bullet.position.Set(lx, ly);
        bullet.direction.Set(Math.cos(this.laserAngle), Math.sin(this.laserAngle));
        bullet.speed = 340;
        bullet.radius = 5;

        if (this.laserSweepProgress >= 1.0) {
            return BTStatus.SUCCESS;
        }

        return BTStatus.RUNNING;
    }

    // --- Spread Shot (Phase 2) ---
    ActionSpreadShot(count) {
        const halfSpread = 0.5;
        const step = (halfSpread * 2) / (count - 1);
        for (let i = 0; i < count; i++) {
            const angle = this.rotation - halfSpread + (i * step);

            const bullet = this.bulletPool.Activate();
            bullet.position.Set(this.position.x, this.position.y);
            bullet.direction.Set(Math.cos(angle), Math.sin(angle));
            bullet.speed = 190;
            bullet.radius = 6;
        }

        return BTStatus.SUCCESS;
    }

    // --- Charge Lunge (Phase 1) ---
    ActionStartCharge(duration) {
        this.telegraphType = 'charge';
        this.telegraphDuration = duration;
        this.telegraphTimer = 0;

        const target = this.player.position;
        const dx = target.x - this.position.x;
        const dy = target.y - this.position.y;
        const distToPlayer = Math.hypot(dx, dy) || 1;
        
        this.chargeDir.x = dx / distToPlayer;
        this.chargeDir.y = dy / distToPlayer;
        
        // Charge distance is the actual distance to player, or minimum chargeDistance
        this.chargeTargetDistance = Math.max(distToPlayer, this.chargeDistance);
        this.chargeDistanceLeft = this.chargeTargetDistance;

        return BTStatus.SUCCESS;
    }

    ActionExecuteLunge(dt) {
        this.telegraphType = null;
        const step = this.chargeSpeed * dt;
        this.position.x += this.chargeDir.x * step;
        this.position.y += this.chargeDir.y * step;
        this.chargeDistanceLeft -= step;

        // Collision with hero during lunge
        if (this.player && Vector2.Magnitude(this.position, this.player.position) < this.radius + this.player.radius) {
            this.player.TakeDamage(25);
        }

        if (this.chargeDistanceLeft <= 0) {
            return BTStatus.SUCCESS;
        }

        return BTStatus.RUNNING;
    }

    // --- Plasma Bolt (Phase 1) ---
    ActionFireOrb() {
        const bullet = this.bulletPool.Activate();
        bullet.position.Set(this.position.x, this.position.y);
        bullet.direction.Set(Math.cos(this.rotation), Math.sin(this.rotation));
        bullet.speed = this.phase1BulletSpeed;
        bullet.radius = this.phase1BulletRadius;

        return BTStatus.SUCCESS;
    }

    // --- Movement Fallbacks ---
    ActionApproachPlayer(dt, speed) {
        if (!this.player)
            return BTStatus.FAILURE;

        const dist = Vector2.SqrMagnitude(this.position, this.player.position);
        if (dist > this.phase1MaxDistanceToPlayerSqr) {
            this.position.x += Math.cos(this.rotation) * speed * dt;
            this.position.y += Math.sin(this.rotation) * speed * dt;
        }

        return BTStatus.RUNNING;
    }

    ActionStrafeAroundPlayer(dt, speed) {
        if (!this.player)
            return BTStatus.FAILURE;

        const strafeAngle = this.rotation + PIH;
        this.position.x += Math.cos(strafeAngle) * speed * dt;
        this.position.y += Math.sin(strafeAngle) * speed * dt;

        return BTStatus.RUNNING;
    }

    ActionChasePlayer(dt, speed) {
        if (!this.player)
            return BTStatus.FAILURE;

        this.position.x += Math.cos(this.rotation) * speed * dt;
        this.position.y += Math.sin(this.rotation) * speed * dt;

        return BTStatus.RUNNING;
    }

    _DrawTelegraphs(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        if (this.telegraphType === 'slam') {
            // Expanding red danger circle
            renderer.DrawFillCircle(x, y, 180, new Color(1, 0.15, 0.15, 0.12));
            renderer.DrawStrokeCircle(x, y, 180, BOSS_COLORS.phase3, 2);
            renderer.DrawFillText('⚠️ GROUND SLAM INCOMING!', x, y + 210, 'bold 12px monospace', Color.red, 'center');
        }
        else if (this.telegraphType === 'charge') {
            // Charge path line - extends to actual player position
            const endX = x + this.chargeDir.x * this.chargeTargetDistance;
            const endY = y + this.chargeDir.y * this.chargeTargetDistance;
            renderer.DrawLine(x, y, endX, endY, new Color(1, 0.2, 0.2, 0.5), 8);
            renderer.DrawStrokeCircle(endX, endY, 20, Color.red, 2);
        }
        else if (this.telegraphType === 'laser') {
            // Sweeping cone warning
            const leftX = x + Math.cos(this.laserAngle) * 320;
            const leftY = y + Math.sin(this.laserAngle) * 320;
            renderer.DrawLine(x, y, leftX, leftY, new Color(1, 0.6, 0.1, 0.6), 2);
        }
    }
}

// #endregion