/**
 * Behavior Tree Demo — Multiphase Arena Boss AI
 *
 * Demonstrates:
 *   - Multiphase Boss fight driven entirely by a reactive Behavior Tree
 *   - Phase switching via BTReactiveSelector based on health thresholds
 *   - Cooldown throttling with BTCooldown (preventing ability spam)
 *   - Multi-step attack combos with BTSequence and telegraph windups (BTWait)
 *   - Real-time hierarchical visual tree inspection with live node status badges
 */

// ── Colors ────────────────────────────────────────────────────────────────────

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

// ── Hero Player ───────────────────────────────────────────────────────────────

class Hero extends GameObject {
    constructor(x, y) {
        super(new Vector2(x, y), 0, 1);
        this.radius = 11;
        this.speed = 185;
        this.maxHp = 100;
        this.hp = 100;
        this.shootCooldown = 0;
        this.invulnTimer = 0;
    }

    Update(dt) {
        super.Update(dt);

        if (this.invulnTimer > 0) {
            this.invulnTimer -= dt;
        }

        // 1. WASD / Arrow Movement
        let moveX = 0;
        let moveY = 0;
        if (Input.IsKeyPressed(KEY_W) || Input.IsKeyPressed(KEY_UP))    moveY -= 1;
        if (Input.IsKeyPressed(KEY_S) || Input.IsKeyPressed(KEY_DOWN))  moveY += 1;
        if (Input.IsKeyPressed(KEY_A) || Input.IsKeyPressed(KEY_LEFT))  moveX -= 1;
        if (Input.IsKeyPressed(KEY_D) || Input.IsKeyPressed(KEY_RIGHT)) moveX += 1;

        if (moveX !== 0 || moveY !== 0) {
            const len = Math.hypot(moveX, moveY);
            this.position.x += (moveX / len) * this.speed * dt;
            this.position.y += (moveY / len) * this.speed * dt;
        }

        // Clamp to arena
        this.position.x = Clamp(this.position.x, 30, this.game.screenWidth - 30);
        this.position.y = Clamp(this.position.y, 70, this.game.screenHeight - 30);

        // 2. Mouse Aiming
        const dx = Input.mouse.x - this.position.x;
        const dy = Input.mouse.y - this.position.y;
        this.rotation = Math.atan2(dy, dx);

        // 3. Shooting Blaster Bolts
        if (this.shootCooldown > 0) {
            this.shootCooldown -= dt;
        }

        if ((Input.mouse.down || Input.IsMouseDown() || Input.IsKeyPressed(KEY_SPACE)) && this.shootCooldown <= 0 && this.hp > 0) {
            this.game.SpawnHeroBullet(this.position.x, this.position.y, this.rotation);
            this.shootCooldown = 0.16; // rapid blaster fire
        }
    }

    TakeDamage(amount) {
        if (this.invulnTimer > 0 || this.hp <= 0) return;
        this.hp = Math.max(0, this.hp - amount);
        this.invulnTimer = 0.6; // brief grace period
    }

    Draw(renderer) {
        if (this.hp <= 0) return;

        const x = this.position.x;
        const y = this.position.y;

        // Invulnerability flicker
        if (this.invulnTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
            return;
        }

        // Body
        renderer.DrawFillCircle(x, y, this.radius, BOSS_COLORS.hero);
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 1.5);

        // Gun barrel
        const gunX = x + Math.cos(this.rotation) * (this.radius + 6);
        const gunY = y + Math.sin(this.rotation) * (this.radius + 6);
        renderer.DrawLine(x, y, gunX, gunY, Color.white, 2.5);

        // Health bar
        const barW = 28;
        const barH = 4;
        const barX = x - barW / 2;
        const barY = y - this.radius - 8;
        renderer.DrawFillBasicRectangle(barX, barY, barW, barH, new Color(0.2, 0.2, 0.2, 0.8));
        renderer.DrawFillBasicRectangle(barX, barY, barW * (this.hp / this.maxHp), barH, Color.lime);
        renderer.DrawStrokeBasicRectangle(barX, barY, barW, barH, Color.black, 1);
    }
}

// ── TitanBoss ─────────────────────────────────────────────────────────────────

class TitanBoss extends GameObject {
    constructor(x, y, gameRef) {
        super(new Vector2(x, y), 0, 1);
        this.game = gameRef;

        // Health & Phase Setup
        this.maxHp = 1000;
        this.hp = 1000;
        this.radius = 30;

        // Combat & Animation states
        this.phaseColor = BOSS_COLORS.phase1;
        this.currentPhaseName = 'Guardian';
        this.orbitalAngle = 0;

        // Telegraph & Attack properties
        this.telegraphType = null; // 'slam', 'charge', 'laser'
        this.telegraphTimer = 0;
        this.telegraphDuration = 0;
        this.chargeDir = new Vector2();
        this.laserAngle = 0;
        this.laserSweepProgress = 0;

        // Construct the Behavior Tree
        this._BuildBehaviorTree();
    }

    /**
     * Constructs the multi-phase boss Behavior Tree.
     * @private
     */
    _BuildBehaviorTree() {
        this.blackboard = new BTBlackboard();

        // ┌────────────────────────────────────────────────────────────────────────┐
        // │                         Titan Boss Behavior Tree                       │
        // │                                                                        │
        // │  BTReactiveSelector: Top-level Phase switcher based on Boss HP.        │
        // │  Phase 3 (HP <= 300) > Phase 2 (HP <= 650) > Phase 1 (HP > 650)        │
        // └────────────────────────────────────────────────────────────────────────┘
        this.bt = new BehaviorTree(this,
            new BTReactiveSelector('TitanBossAI', [

                // ── Phase 3: Berserk Meltdown (HP <= 300) ────────────────────────
                new BTSequence('Phase3_Berserk', [
                    new BTCondition('IsPhase3', (b) => b.hp <= 300),
                    new BTSelector('BerserkBranch', [

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

                // ── Phase 2: Overdrive Enrage (300 < HP <= 650) ──────────────────
                new BTSequence('Phase2_Overdrive', [
                    new BTCondition('IsPhase2', (b) => b.hp <= 650),
                    new BTSelector('OverdriveBranch', [

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

                // ── Phase 1: Guardian Mode (HP > 650) ────────────────────────────
                new BTSequence('Phase1_Guardian', [
                    new BTSelector('GuardianBranch', [

                        // Attack 1: Telegraph Charge Lunge (Cooldown: 4.2s)
                        new BTCooldown('ChargeLungeCooldown',
                            new BTSequence('ChargeLungeAttack', [
                                new BTAction('TelegraphCharge', (dt, b) => b.ActionStartCharge(0.85)),
                                new BTWait('ChargeWindup', 0.85),
                                new BTAction('ExecuteLunge', (dt, b) => b.ActionExecuteLunge(dt)),
                                new BTWait('PostLungeStun', 0.6)
                            ]), 4.2
                        ),

                        // Attack 2: Homing Plasma Orb (Cooldown: 2.2s)
                        new BTCooldown('PlasmaBoltCooldown',
                            new BTSequence('PlasmaBolt', [
                                new BTAction('FireBolt', (dt, b) => b.ActionFireOrb()),
                                new BTWait('BoltDelay', 0.35)
                            ]), 2.2
                        ),

                        // Fallback: Approach & Patrol
                        new BTAction('GuardianApproach', (dt, b) => b.ActionApproachPlayer(dt, 75))
                    ])
                ])

            ]),
            this.blackboard
        );
    }

    // ── Phase & State Logic ──────────────────────────────────────────────────

    Update(dt) {
        super.Update(dt);

        // Update Phase name and theme colors
        if (this.hp <= 300) {
            this.currentPhaseName = 'PHASE 3: BERSERK';
            this.phaseColor = BOSS_COLORS.phase3;
        } else if (this.hp <= 650) {
            this.currentPhaseName = 'PHASE 2: OVERDRIVE';
            this.phaseColor = BOSS_COLORS.phase2;
        } else {
            this.currentPhaseName = 'PHASE 1: GUARDIAN';
            this.phaseColor = BOSS_COLORS.phase1;
        }

        // Orbiting armor animation
        this.orbitalAngle += (this.hp <= 300 ? 5.5 : 2.5) * dt;

        // Face player smoothly
        if (this.game.hero) {
            const dx = this.game.hero.position.x - this.position.x;
            const dy = this.game.hero.position.y - this.position.y;
            this.rotation = Math.atan2(dy, dx);
        }

        // Tick Behavior Tree
        if (this.hp > 0) {
            this.bt.Update(dt);
        }

        // Arena boundary clamp
        this.position.x = Clamp(this.position.x, 60, this.game.screenWidth - 60);
        this.position.y = Clamp(this.position.y, 90, this.game.screenHeight - 60);
    }

    TakeDamage(amount) {
        if (this.hp <= 0) return;
        this.hp = Math.max(0, this.hp - amount);
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
        const step = (Math.PI * 2) / count;
        for (let i = 0; i < count; i++) {
            const angle = i * step + this.orbitalAngle;
            this.game.SpawnBossBullet(this.position.x, this.position.y, angle, 175, 7);
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
        this.game.SpawnBossBullet(lx, ly, this.laserAngle, 340, 5);

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
            this.game.SpawnBossBullet(this.position.x, this.position.y, angle, 190, 6);
        }
        return BTStatus.SUCCESS;
    }

    // --- Charge Lunge (Phase 1) ---
    ActionStartCharge(duration) {
        this.telegraphType = 'charge';
        this.telegraphDuration = duration;
        this.telegraphTimer = 0;
        const target = this.game.hero.position;
        const dx = target.x - this.position.x;
        const dy = target.y - this.position.y;
        const len = Math.hypot(dx, dy) || 1;
        this.chargeDir.x = dx / len;
        this.chargeDir.y = dy / len;
        this.chargeDistanceLeft = 190;
        return BTStatus.SUCCESS;
    }

    ActionExecuteLunge(dt) {
        this.telegraphType = null;
        const step = 420 * dt;
        this.position.x += this.chargeDir.x * step;
        this.position.y += this.chargeDir.y * step;
        this.chargeDistanceLeft -= step;

        // Collision with hero during lunge
        if (this.game.hero && Vector2.Magnitude(this.position, this.game.hero.position) < this.radius + this.game.hero.radius) {
            this.game.hero.TakeDamage(25);
        }

        if (this.chargeDistanceLeft <= 0) {
            return BTStatus.SUCCESS;
        }
        return BTStatus.RUNNING;
    }

    // --- Plasma Bolt (Phase 1) ---
    ActionFireOrb() {
        this.game.SpawnBossBullet(this.position.x, this.position.y, this.rotation, 190, 8);
        return BTStatus.SUCCESS;
    }

    // --- Movement Fallbacks ---
    ActionApproachPlayer(dt, speed) {
        if (!this.game.hero) return BTStatus.FAILURE;
        const dist = Vector2.Magnitude(this.position, this.game.hero.position);
        if (dist > 180) {
            this.position.x += Math.cos(this.rotation) * speed * dt;
            this.position.y += Math.sin(this.rotation) * speed * dt;
        }
        return BTStatus.RUNNING;
    }

    ActionStrafeAroundPlayer(dt, speed) {
        if (!this.game.hero) return BTStatus.FAILURE;
        const strafeAngle = this.rotation + Math.PI / 2;
        this.position.x += Math.cos(strafeAngle) * speed * dt;
        this.position.y += Math.sin(strafeAngle) * speed * dt;
        return BTStatus.RUNNING;
    }

    ActionChasePlayer(dt, speed) {
        if (!this.game.hero) return BTStatus.FAILURE;
        this.position.x += Math.cos(this.rotation) * speed * dt;
        this.position.y += Math.sin(this.rotation) * speed * dt;
        return BTStatus.RUNNING;
    }

    // ── Drawing ──────────────────────────────────────────────────────────────

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        // 1. Draw Telegraphs
        this._DrawTelegraphs(renderer);

        // 2. Boss Armor Plates (Orbiting)
        const plateCount = this.hp <= 300 ? 5 : 4;
        const plateDist = this.radius + 12;
        for (let i = 0; i < plateCount; i++) {
            const angle = this.orbitalAngle + (i * (Math.PI * 2 / plateCount));
            const px = x + Math.cos(angle) * plateDist;
            const py = y + Math.sin(angle) * plateDist;
            renderer.DrawFillCircle(px, py, 6, this.phaseColor);
            renderer.DrawStrokeCircle(px, py, 6, Color.white, 1);
        }

        // 3. Boss Main Core
        renderer.DrawFillCircle(x, y, this.radius, new Color(0.12, 0.14, 0.18));
        renderer.DrawFillCircle(x, y, this.radius * 0.75, this.phaseColor);
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 2);

        // Cannon / Facing nozzle
        const cannonX = x + Math.cos(this.rotation) * (this.radius + 8);
        const cannonY = y + Math.sin(this.rotation) * (this.radius + 8);
        renderer.DrawLine(x, y, cannonX, cannonY, Color.white, 3);

        // 4. Overhead Phase & Active Leaf debug
        renderer.DrawFillText(this.currentPhaseName, x, y - this.radius - 22, 'bold 11px monospace', this.phaseColor, 'center');
        this.bt.DrawDebug(renderer, x, y - this.radius - 9);
    }

    _DrawTelegraphs(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        if (this.telegraphType === 'slam') {
            // Expanding red danger circle
            renderer.DrawFillCircle(x, y, 180, new Color(1, 0.15, 0.15, 0.12));
            renderer.DrawStrokeCircle(x, y, 180, BOSS_COLORS.phase3, 2);
            renderer.DrawFillText('⚠️ GROUND SLAM INCOMING!', x, y + 210, 'bold 12px monospace', Color.red, 'center');
        } else if (this.telegraphType === 'charge') {
            // Charge path line
            const endX = x + this.chargeDir.x * 220;
            const endY = y + this.chargeDir.y * 220;
            renderer.DrawLine(x, y, endX, endY, new Color(1, 0.2, 0.2, 0.5), 8);
            renderer.DrawStrokeCircle(endX, endY, 20, Color.red, 2);
        } else if (this.telegraphType === 'laser') {
            // Sweeping cone warning
            const leftX = x + Math.cos(this.laserAngle) * 320;
            const leftY = y + Math.sin(this.laserAngle) * 320;
            renderer.DrawLine(x, y, leftX, leftY, new Color(1, 0.6, 0.1, 0.6), 2);
        }
    }
}

// ── Game ──────────────────────────────────────────────────────────────────────

class BTBossGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({ screenWidth: 880, screenHeight: 620 });

        this.bgColor = new Color(0.06, 0.07, 0.1);
        this.gridColor = new Color(1, 1, 1, 0.03);

        this.hero = new Hero(200, 310);
        this.boss = new TitanBoss(640, 310, this);

        /** @type {Array<{x:number, y:number, vx:number, vy:number, radius:number, life:number}>} */
        this.heroBullets = [];

        /** @type {Array<{x:number, y:number, vx:number, vy:number, radius:number, life:number}>} */
        this.bossBullets = [];

        /** @type {Array<{x:number, y:number, radius:number, maxRadius:number, alpha:number}>} */
        this.shockwaves = [];

        this.showTreeInspector = true;
        debugMode = true;
    }

    Start() {
        super.Start();
        this.AddGameObject(this.boss);
        this.AddGameObject(this.hero);
    }

    SpawnHeroBullet(x, y, angle) {
        const speed = 460;
        this.heroBullets.push({
            x: x + Math.cos(angle) * 16,
            y: y + Math.sin(angle) * 16,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 3.5,
            life: 1.8
        });
    }

    SpawnBossBullet(x, y, angle, speed, radius = 6) {
        this.bossBullets.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: radius,
            life: 3.5
        });
    }

    SpawnShockwave(x, y, maxRadius) {
        this.shockwaves.push({
            x: x,
            y: y,
            radius: 10,
            maxRadius: maxRadius,
            alpha: 1.0
        });
    }

    Update(dt) {
        super.Update(dt);

        // Debug hotkeys to skip directly to specific phases:
        if (Input.IsKeyDown(KEY_1)) {
            this.boss.hp = 900; // Phase 1
        }
        if (Input.IsKeyDown(KEY_2)) {
            this.boss.hp = 500; // Phase 2
        }
        if (Input.IsKeyDown(KEY_3)) {
            this.boss.hp = 220; // Phase 3
        }

        // [R] resets battle
        if (Input.IsKeyDown(KEY_R)) {
            this.boss.hp = this.boss.maxHp;
            this.hero.hp = this.hero.maxHp;
            this.boss.position.x = 640;
            this.boss.position.y = 310;
            this.hero.position.x = 200;
            this.hero.position.y = 310;
            this.heroBullets = [];
            this.bossBullets = [];
            this.shockwaves = [];
        }

        // [T] toggles Behavior Tree Inspector HUD
        if (Input.IsKeyDown(KEY_T)) {
            this.showTreeInspector = !this.showTreeInspector;
        }

        // Update Hero Bullets
        for (let i = this.heroBullets.length - 1; i >= 0; i--) {
            const b = this.heroBullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;

            // Hit boss?
            if (this.boss.hp > 0 && Math.hypot(b.x - this.boss.position.x, b.y - this.boss.position.y) < this.boss.radius + b.radius) {
                this.boss.TakeDamage(12);
                this.heroBullets.splice(i, 1);
                continue;
            }

            if (b.life <= 0) {
                this.heroBullets.splice(i, 1);
            }
        }

        // Update Boss Bullets
        for (let i = this.bossBullets.length - 1; i >= 0; i--) {
            const b = this.bossBullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;

            // Hit hero?
            if (this.hero.hp > 0 && Math.hypot(b.x - this.hero.position.x, b.y - this.hero.position.y) < this.hero.radius + b.radius) {
                this.hero.TakeDamage(10);
                this.bossBullets.splice(i, 1);
                continue;
            }

            if (b.life <= 0) {
                this.bossBullets.splice(i, 1);
            }
        }

        // Update Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += 240 * dt;
            sw.alpha -= 0.8 * dt;

            // Hit hero if close to expanding wavefront
            const heroDist = Math.hypot(this.hero.position.x - sw.x, this.hero.position.y - sw.y);
            if (Math.abs(heroDist - sw.radius) < 14) {
                this.hero.TakeDamage(20);
            }

            if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    Draw() {
        // Arena background
        renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this.bgColor);

        // Ground grid
        this._DrawGrid();

        // Shockwaves
        for (const sw of this.shockwaves) {
            renderer.DrawStrokeCircle(sw.x, sw.y, sw.radius, new Color(BOSS_COLORS.shockwave.r, BOSS_COLORS.shockwave.g, BOSS_COLORS.shockwave.b, sw.alpha), 3);
        }

        // Bullets
        for (const b of this.heroBullets) {
            renderer.DrawFillCircle(b.x, b.y, b.radius, BOSS_COLORS.heroBullet);
        }
        for (const b of this.bossBullets) {
            renderer.DrawFillCircle(b.x, b.y, b.radius, BOSS_COLORS.bossBullet);
        }

        // Game Objects (Boss & Hero)
        super.Draw();

        // Top Boss Health Bar
        this._DrawBossHealthBar();

        // Header Title & Controls
        this._DrawHeader();

        // Behavior Tree Inspector Panel
        if (this.showTreeInspector && this.boss) {
            this.boss.bt.DrawTreeInspector(renderer, 16, 75, {
                width: 320,
                title: 'Titan Boss Behavior Tree'
            });
        }

        // Legend
        this._DrawLegend();
    }

    _DrawGrid() {
        const step = 40;
        for (let x = 0; x < this.screenWidth; x += step) {
            renderer.DrawLine(x, 0, x, this.screenHeight, this.gridColor, 1);
        }
        for (let y = 0; y < this.screenHeight; y += step) {
            renderer.DrawLine(0, y, this.screenWidth, y, this.gridColor, 1);
        }
    }

    _DrawBossHealthBar() {
        const barW = 420;
        const barH = 16;
        const barX = this.screenWidth / 2 - barW / 2;
        const barY = 48;

        const hpRatio = Math.max(0, this.boss.hp / this.boss.maxHp);

        // Bar background
        renderer.DrawFillBasicRectangle(barX, barY, barW, barH, new Color(0.12, 0.15, 0.2, 0.9));

        // Health fill
        renderer.DrawFillBasicRectangle(barX, barY, barW * hpRatio, barH, this.boss.phaseColor);

        // Phase divider ticks at 65% (HP 650) and 30% (HP 300)
        renderer.DrawLine(barX + barW * 0.65, barY, barX + barW * 0.65, barY + barH, Color.white, 2);
        renderer.DrawLine(barX + barW * 0.30, barY, barX + barW * 0.30, barY + barH, Color.white, 2);

        // Outline
        renderer.DrawStrokeBasicRectangle(barX, barY, barW, barH, Color.white, 1.5);

        // Label
        renderer.DrawFillText(
            `TITAN MECH: ${Math.round(this.boss.hp)} / ${this.boss.maxHp} HP`,
            this.screenWidth / 2, barY + barH / 2,
            'bold 11px monospace', Color.white, 'center', 'middle'
        );
    }

    _DrawHeader() {
        renderer.DrawFillText(
            'Behavior Tree Demo — Multiphase Arena Boss AI',
            this.screenWidth / 2, 20,
            'bold 17px Arial', Color.white, 'center'
        );
        renderer.DrawFillText(
            'WASD: Move Hero • Mouse: Aim & Shoot • [1/2/3] Jump to Phase • [R] Reset Boss • [T] Toggle Tree Inspector',
            this.screenWidth / 2, 38,
            '11px Arial', new Color(0.7, 0.75, 0.85), 'center'
        );
    }

    _DrawLegend() {
        const lx = this.screenWidth - 250;
        let   ly = 75;

        renderer.DrawFillBasicRectangle(lx - 10, ly - 10, 244, 210, new Color(0.05, 0.07, 0.1, 0.88));
        renderer.DrawStrokeBasicRectangle(lx - 10, ly - 10, 244, 210, new Color(0.2, 0.3, 0.45, 0.7), 1);

        renderer.DrawFillText('Boss Phases (BTReactiveSelector):', lx, ly + 4, 'bold 11px monospace', Color.cyan, 'left');
        ly += 22;

        const items = [
            ['Phase 3: Berserk', BOSS_COLORS.phase3, 'HP ≤ 30% • Slams + Barrage'],
            ['Phase 2: Overdrive', BOSS_COLORS.phase2, 'HP ≤ 65% • Lasers + Spread'],
            ['Phase 1: Guardian', BOSS_COLORS.phase1, 'HP > 65% • Lunge + Homing']
        ];

        for (const [name, color, desc] of items) {
            renderer.DrawFillCircle(lx + 6, ly + 2, 5, color);
            renderer.DrawFillText(name, lx + 18, ly + 2, 'bold 11px monospace', Color.white, 'left', 'middle');
            renderer.DrawFillText(desc, lx + 18, ly + 15, '10px monospace', Color.grey, 'left', 'middle');
            ly += 30;
        }

        renderer.DrawFillText('Decorators: BTCooldown + BTWait', lx, ly + 8, '10px monospace', Color.yellow, 'left');
        renderer.DrawFillText('Status: 🟢 SUCCESS  🔴 FAIL  🟡 RUN', lx, ly + 24, '10px monospace', Color.white, 'left');
    }
}

window.onload = () => Init(BTBossGame, "canvas");
