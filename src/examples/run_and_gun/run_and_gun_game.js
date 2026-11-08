// #region Run-and-Gun Game (Cyber Commando: Project Spark)

const RAG_STATE = {
    TITLE: 0,
    PLAYING: 1,
    STAGE_CLEAR: 2,
    GAME_OVER: 3
};

class RunAndGunGame extends Game {
    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth: 1280,
            screenHeight: 720,
            fillWindow: false,
            mobileSupport: true,
            autoFullscreen: false
        });

        this.state = RAG_STATE.TITLE;
        this.highScore = 25000;

        // Visual Assets
        this.graphicAssets = {};
        this.audioAssets = {};

        // References
        this.player = null;
        this.camera = null;
        this.stage = null;
        this.boss = null;

        // Object Pools (using spark.js Pool class from gameobjects.js)
        this.game = this; // ensures Pool automatically binds object.game
        this.playerBulletPool = null;
        this.enemyBulletPool = null;
        this.bossMortarPool = null;
        this.sparkPool = null;
        this.powerupPool = null;
        this.floatingTexts = [];

        // Timers & States
        this.bossWarningTimer = 0;
        this.continueTimer = 9.9;
        this.stageClearTimer = 0;
        this.maxCameraX = 0;
        this.respawnTimer = 0;
    }

    get playerBullets() { return this.playerBulletPool ? this.playerBulletPool.objects : []; }
    get enemyBullets() { return this.enemyBulletPool ? this.enemyBulletPool.objects : []; }
    get bossMortars() { return this.bossMortarPool ? this.bossMortarPool.objects : []; }
    get sparks() { return this.sparkPool ? this.sparkPool.objects : []; }
    get powerups() { return this.powerupPool ? this.powerupPool.objects : []; }

    Start() {
        super.Start();

        // 1. Generate all procedural 16-bit arcade sprites
        GenerateArcadeSprites();

        // 2. Initialize Web Audio Synthesizer
        retroAudio.Init();

        // 3. Register Virtual Controls for Mobile / Touch (scaled for 1280x720)
        Input.RegisterVirtualJoystick('move', new VirtualJoystick(140, 580, 80));
        Input.RegisterVirtualButton('jump', new VirtualButton(1170, 600, 48, 'JUMP'));
        Input.RegisterVirtualButton('fire', new VirtualButton(1055, 600, 48, 'FIRE'));

        // 4a. Register Actions & Axes (high-level input abstraction)
        // ── Axes ──────────────────────────────────────────────
        Input.RegisterAxis('MoveH', [
            { type: 'key',           positive: KEY_D,      negative: KEY_A    },
            { type: 'key',           positive: KEY_RIGHT,  negative: KEY_LEFT },
            { type: 'gamepadaxis',   stick: 'LS',          axis: 0            },
            { type: 'gamepadbutton', positive: 'DPAD_RIGHT', negative: 'DPAD_LEFT' },
            { type: 'virtualjoystick', id: 'move',         axis: 0            },
        ]);
        Input.RegisterAxis('MoveV', [
            { type: 'key',           positive: KEY_S,      negative: KEY_W    },
            { type: 'key',           positive: KEY_DOWN,   negative: KEY_UP   },
            { type: 'gamepadaxis',   stick: 'LS',          axis: 1            },
            { type: 'gamepadbutton', positive: 'DPAD_DOWN', negative: 'DPAD_UP' },
            { type: 'virtualjoystick', id: 'move',         axis: 1            },
        ]);
        // ── Actions ───────────────────────────────────────────
        Input.RegisterAction('Jump', [
            { type: 'key',          code: KEY_K       },
            { type: 'key',          code: KEY_X       },
            { type: 'key',          code: KEY_SPACE   },
            { type: 'gamepad',      code: 'FACE_DOWN' },
            { type: 'virtualbutton', id: 'jump'       },
        ]);
        Input.RegisterAction('Fire', [
            { type: 'key',          code: KEY_J       },
            { type: 'key',          code: KEY_Z       },
            { type: 'mouse'                           },
            { type: 'gamepad',      code: 'FACE_LEFT' },
            { type: 'gamepad',      code: 'RB'        },
            { type: 'virtualbutton', id: 'fire'       },
        ]);
        Input.RegisterAction('Start', [
            { type: 'key',   code: KEY_ENTER },
            { type: 'key',   code: KEY_SPACE },
            { type: 'key',   code: KEY_J     },
            { type: 'mouse'                  },
            { type: 'gamepad', code: 'FACE_DOWN' },
            { type: 'gamepad', code: 'START'     },
        ]);
        Input.RegisterAction('Mute', [
            { type: 'key', code: KEY_M },
        ]);

        // 4. Pre-allocate Object Pools via engine Pool class
        this._initObjectPools();

        // 5. Setup Game Session
        this.ResetGameSession();
    }

    _initObjectPools() {
        this.playerBulletPool = new Pool(this, 150, PlayerBullet);
        this.enemyBulletPool = new Pool(this, 100, EnemyBullet);
        this.bossMortarPool = new Pool(this, 20, BossMortarShell);
        this.sparkPool = new Pool(this, 120, SparkParticle);
        this.powerupPool = new Pool(this, 20, PowerupItem);
    }

    ResetGameSession() {
        // Clear GameObjects
        this.gameObjects = [];

        // Deactivate all pools via Pool.DisableAll()
        if (this.playerBulletPool) this.playerBulletPool.DisableAll();
        if (this.enemyBulletPool) this.enemyBulletPool.DisableAll();
        if (this.bossMortarPool) this.bossMortarPool.DisableAll();
        if (this.sparkPool) this.sparkPool.DisableAll();
        if (this.powerupPool) this.powerupPool.DisableAll();
        this.floatingTexts = [];

        // Build Stage
        this.stage = new Stage(this);

        // Spawn Player at level start
        this.player = new Player(new Vector2(100, this.stage.groundY - 30));
        this.AddGameObject(this.player);

        // Setup Follow Camera
        // Left camera bound stops backtracking; right bound is level end
        this.maxCameraX = 0;
        this.camera = new FollowCamera(
            new Vector2(0, 0),
            this.player,
            0,
            this.stage.levelWidth - 1280,
            0,
            0,
            6,
            Vector2.Zero()
        );

        this.boss = null;
        this.bossWarningTimer = 0;
        this.respawnTimer = 0;
    }

    StartGame() {
        retroAudio.Resume();
        retroAudio.StartMusic();
        this.state = RAG_STATE.PLAYING;
        this.ResetGameSession();
    }

    Update(deltaTime) {
        // Mute toggle (Action: Mute)
        if (Input.GetActionDown('Mute')) {
            retroAudio.ToggleMute();
        }

        if (this.state === 'TITLE' || this.state === RAG_STATE.TITLE) {
            if (Input.GetActionDown('Start')) {
                this.StartGame();
            }
            return;
        }

        if (this.state === 'GAME_OVER' || this.state === RAG_STATE.GAME_OVER) {
            this.continueTimer -= deltaTime;
            if (Input.GetActionDown('Start')) {
                this.StartGame();
            }
            if (this.continueTimer <= 0) {
                this.state = RAG_STATE.TITLE;
            }
            return;
        }

        if (this.state === 'STAGE_CLEAR' || this.state === RAG_STATE.STAGE_CLEAR) {
            this.stageClearTimer += deltaTime;
            if (this.stageClearTimer > 4.5 && Input.GetActionDown('Start')) {
                this.state = RAG_STATE.TITLE;
            }
            return;
        }

        // Active PLAYING state
        super.Update(deltaTime);

        // Update Camera & prevent backtracking
        if (this.camera && this.player) {
            if (!this.stage || !this.stage.bossTriggered) {
                const viewW = this.renderer.width || 1280;
                const scrollThreshold = this.player.position.x - (viewW * 0.38);
                const maxLevelScroll = Math.max(0, this.stage.levelWidth - viewW);
                if (scrollThreshold > this.maxCameraX) {
                    this.maxCameraX = Math.min(scrollThreshold, maxLevelScroll);
                    this.camera.minX = this.maxCameraX;
                }
            }
            this.camera.Update(deltaTime);
        }

        // Update Stage & Spawners
        if (this.stage) {
            this.stage.Update(deltaTime);
        }

        // Update Pools
        this._updatePools(deltaTime);

        // Update Floating Texts
        this._updateFloatingTexts(deltaTime);

        // Handle Player Respawn if dead but has lives
        if (this.player && this.player.isDead && this.player.lives > 0) {
            this.respawnTimer += deltaTime;
            if (this.respawnTimer > 2.0) {
                this.respawnTimer = 0;
                const spawnX = Math.max(80, this.camera.position.x + 120);
                this.player.Respawn(spawnX, this.stage.groundY - 40);
            }
        }

        // Check Boss Warning Banner
        if (this.bossWarningTimer > 0) {
            this.bossWarningTimer -= deltaTime;
        }

        // Check Collisions (Player bullets vs Enemies/Boss, Enemy bullets vs Player, Powerups vs Player)
        this._checkCombatCollisions();
    }

    _updatePools(deltaTime) {
        if (this.playerBulletPool) this.playerBulletPool.Update(deltaTime);
        if (this.enemyBulletPool) this.enemyBulletPool.Update(deltaTime);
        if (this.bossMortarPool) this.bossMortarPool.Update(deltaTime);
        if (this.sparkPool) this.sparkPool.Update(deltaTime);
        if (this.powerupPool) this.powerupPool.Update(deltaTime);
    }

    _updateFloatingTexts(deltaTime) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 25 * deltaTime;
            ft.life -= deltaTime;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    _checkCombatCollisions() {
        const player = this.player;

        // 1. Player Bullets vs Enemies, Barrels & Boss
        const pBullets = this.playerBulletPool ? this.playerBulletPool.objects : [];
        for (let b of pBullets) {
            if (!b.active) continue;

            // vs Enemies & Barrels
            for (let go of this.gameObjects) {
                if (!go.active)
                    continue;

                if (go instanceof Enemy) {
                    const dx = Math.abs(b.position.x - go.position.x);
                    const dy = Math.abs(b.position.y - go.position.y);
                    if (dx < go.width / 2 + b.radius && dy < go.height / 2 + b.radius) {
                        if (!b.piercedTargets.has(go)) {
                            b.piercedTargets.add(go);
                            go.TakeDamage(b.damage);
                            if (!b.pierce) {
                                b.Deactivate();
                                break;
                            }
                        }
                    }
                }
                else if (go instanceof ExplosiveBarrel) {
                    const dx = Math.abs(b.position.x - go.position.x);
                    const dy = Math.abs(b.position.y - go.position.y);
                    if (dx < go.width / 2 + b.radius && dy < go.height / 2 + b.radius) {
                        go.TakeDamage(b.damage);
                        b.Deactivate();
                        break;
                    }
                }
            }

            if (!b.active)
                continue;

            // vs Boss Components
            if (this.boss && !this.boss.isDead) {
                const boss = this.boss;
                const bx = boss.position.x;
                const by = boss.position.y;

                // Check Launcher
                if (!boss.launcherDestroyed) {
                    const lx = bx + boss.launcherOffset.x;
                    const ly = by + boss.launcherOffset.y;
                    if (Vector2.Magnitude(b.position, { x: lx, y: ly }) < boss.launcherRadius + b.radius) {
                        boss.TakeComponentDamage('LAUNCHER', b.damage);
                        b.Deactivate();
                        continue;
                    }
                }

                // Check Cannon
                if (!boss.cannonDestroyed) {
                    const cx = bx + boss.cannonOffset.x;
                    const cy = by + boss.cannonOffset.y;
                    if (Vector2.Magnitude(b.position, { x: cx, y: cy }) < boss.cannonRadius + b.radius) {
                        boss.TakeComponentDamage('CANNON', b.damage);
                        b.Deactivate();
                        continue;
                    }
                }

                // Check Core
                const coreX = bx + boss.coreOffset.x;
                const coreY = by + boss.coreOffset.y;
                if (Vector2.Magnitude(b.position, { x: coreX, y: coreY }) < boss.coreRadius + b.radius) {
                    boss.TakeComponentDamage('CORE', b.damage);
                    b.Deactivate();
                    continue;
                }
            }
        }

        // 2. Enemy Bullets vs Player
        if (player && !player.isDead) {
            const pBottom = player.position.y + player.height / 2;
            const pBox = {
                left: player.position.x - player.width / 2,
                right: player.position.x + player.width / 2,
                top: pBottom - (player.isDucking ? player.duckHeight : player.height),
                bottom: pBottom
            };

            const eBullets = this.enemyBulletPool ? this.enemyBulletPool.objects : [];
            for (let eb of eBullets) {
                if (!eb.active)
                    continue;
                if (eb.position.x > pBox.left && eb.position.x < pBox.right &&
                    eb.position.y > pBox.top && eb.position.y < pBox.bottom) {
                    eb.Deactivate();
                    player.TakeDamage(eb.damage);
                }
            }

            // Enemies touching Player directly
            const pCenterY = (pBox.top + pBox.bottom) / 2;
            const pHeight = pBox.bottom - pBox.top;
            for (let go of this.gameObjects) {
                if (!go.active || !(go instanceof Enemy) || go.isDead)
                    continue;

                const dx = Math.abs(player.position.x - go.position.x);
                const dy = Math.abs(pCenterY - go.position.y);
                if (dx < (player.width + go.width) / 2 && dy < (pHeight + go.height) / 2) {
                    player.TakeDamage(1);
                }
            }
        }

        // 3. Power-ups vs Player
        if (player && !player.isDead) {
            const pUps = this.powerupPool ? this.powerupPool.objects : [];
            for (let p of pUps) {
                if (!p.active)
                    continue;

                if (Vector2.Magnitude(player.position, p.position) < player.width + p.radius) {
                    p.active = false;
                    if (p.type === 'B') {
                        player.GiveBarrier();
                    }
                    else {
                        player.EquipWeapon(
                            p.type === 'S' ? 'SPREAD' :
                            p.type === 'M' ? 'MACHINE' :
                            p.type === 'L' ? 'LASER' :
                            p.type === 'G' ? 'ROCKET' : 'RIFLE'
                        );
                    }
                    player.score += 500;
                }
            }
        }
    }

    // ── SPAWNER & FACTORY METHODS ─────────────────────────────

    SpawnPlayerBullet(x, y, dir, speed, damage, type, pierce = false, blastRadius = 0) {
        if (!this.playerBulletPool) return null;
        const b = this.playerBulletPool.Activate();
        if (b) {
            b.Spawn(x, y, dir, speed, damage, type, pierce, blastRadius);
            return b;
        }
        return null;
    }

    SpawnEnemyBullet(x, y, dir, speed, damage = 1) {
        if (!this.enemyBulletPool) return null;
        const eb = this.enemyBulletPool.Activate();
        if (eb) {
            eb.Spawn(x, y, dir, speed, damage);
            return eb;
        }
        return null;
    }

    SpawnBossMortar(x, y, vx, vy, groundY = 600) {
        if (!this.bossMortarPool) return null;
        const m = this.bossMortarPool.Activate();
        if (m) {
            m.Spawn(x, y, vx, vy, groundY);
            return m;
        }
        return null;
    }

    SpawnPowerup(x, y, type = 'S') {
        if (!this.powerupPool) return null;
        const p = this.powerupPool.Activate();
        if (p) {
            p.Spawn(x, y, type, this.stage ? this.stage.groundY : 600);
            return p;
        }
        return null;
    }

    SpawnSpark(x, y, count = 5, color = '#ffcc00') {
        if (!this.sparkPool) return;
        for (let i = 0; i < count; i++) {
            const s = this.sparkPool.Activate();
            if (s) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 40 + Math.random() * 120;
                s.Spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3, 0.35);
            }
        }
    }

    SpawnSmoke(x, y, size = 0.5) {
        this.SpawnSpark(x, y, 2, '#8899aa');
    }

    TriggerExplosion(x, y, radius, damage = 0, hurtPlayer = false) {
        retroAudio.PlayExplosion(radius > 50 ? 1.4 : 0.9);
        if (this.camera) this.camera.Shake(0.35, 45, radius > 50 ? 8 : 4);

        // Visual spark burst
        this.SpawnSpark(x, y, 16, '#ff5500');
        this.SpawnSpark(x, y, 12, '#ffdd00');

        // Area of Effect damage
        if (damage > 0) {
            // Damage enemies within radius
            for (let go of this.gameObjects) {
                if (!go.active || !(go instanceof Enemy) || go.isDead)
                    continue;

                const d = Vector2.Magnitude({ x, y }, go.position);
                if (d <= radius + go.width / 2) {
                    go.TakeDamage(damage);
                }
            }

            // Damage barrels (chain reactions)
            for (let go of this.gameObjects) {
                if (!go.active || !(go instanceof ExplosiveBarrel) || go.isDead)
                    continue;

                const d = Vector2.Magnitude({ x, y }, go.position);
                if (d <= radius + go.width / 2) {
                    go.TakeDamage(damage);
                }
            }

            // Damage Boss components
            if (this.boss && !this.boss.isDead) {
                const d = Vector2.Magnitude({ x, y }, this.boss.position);
                if (d <= radius + 50) {
                    this.boss.TakeComponentDamage('CORE', damage * 0.75);
                }
            }

            // Damage Player if in blast
            if (hurtPlayer && this.player && !this.player.isDead) {
                const d = Vector2.Magnitude({ x, y }, this.player.position);
                if (d <= radius) {
                    this.player.TakeDamage(1);
                }
            }
        }
    }

    ShowFloatingText(text, x, y, color = '#ffffff') {
        this.floatingTexts.push({ text, x, y, color, life: 1.2 });
    }

    TriggerBossEncounter() {
        this.bossWarningTimer = 3.2;
        retroAudio.PlayBossAlert();

        // Lock camera bounds to Boss Arena (arena starts at 3050, stage width 4200, camera locks at 2920)
        const arenaCamX = 2920;
        this.maxCameraX = arenaCamX;
        if (this.camera) {
            this.camera.minX = arenaCamX;
            this.camera.maxX = arenaCamX;
            this.camera.position.x = arenaCamX;
            this.camera.Shake(1.0, 45, 8);
        }

        // Spawn Mecha-Colossus MK-IV at right end of arena
        this.boss = new BossMechaColossus(new Vector2(3850, this.stage.groundY - 65));
        this.AddGameObject(this.boss);
    }

    SpawnReinforcement(x, y) {
        if (Math.random() < 0.5) {
            this.AddGameObject(new FlyingDrone(new Vector2(x, y)));
        }
        else {
            this.AddGameObject(new GruntSoldier(new Vector2(x, this.stage.groundY - 30)));
        }
    }

    OnPlayerDied() {
        if (this.player.lives <= 0) {
            this.state = RAG_STATE.GAME_OVER;
            this.continueTimer = 9.9;
            retroAudio.StopMusic();
            retroAudio.PlayGameOver();

            if (this.player.score > this.highScore) {
                this.highScore = this.player.score;
            }
        }
    }

    OnBossDefeated() {
        this.state = RAG_STATE.STAGE_CLEAR;
        this.stageClearTimer = 0;
        retroAudio.StopMusic();
        retroAudio.PlayStageClear();

        if (this.player.score > this.highScore) {
            this.highScore = this.player.score;
        }
    }

    // ── DRAWING & RENDERING ───────────────────────────────────

    Draw() {
        const r = this.renderer;

        if (this.state === 'TITLE' || this.state === RAG_STATE.TITLE) {
            this._drawTitleScreen(r);
            return;
        }

        // 1. Draw Multi-Layer Parallax Backgrounds (Screen Space)
        if (this.stage && this.camera) {
            this.stage.DrawBackground(r, this.camera);
        }

        // 2. World Space Rendering (Under Camera Transform)
        if (this.camera) {
            this.camera.PreDraw(r);
        }

        // Platforms & Environment
        if (this.stage) {
            this.stage.DrawPlatforms(r);
        }

        // GameObjects (Enemies, Boss, Player)
        super.Draw();

        // Object Pools (Projectiles, Particles, Items)
        if (this.powerupPool) this.powerupPool.Draw(r);
        if (this.playerBulletPool) this.playerBulletPool.Draw(r);
        if (this.enemyBulletPool) this.enemyBulletPool.Draw(r);
        if (this.bossMortarPool) this.bossMortarPool.Draw(r);
        if (this.sparkPool) this.sparkPool.Draw(r);

        // Floating popup texts in world space
        this._drawFloatingTexts(r);

        // Restore Camera Transform
        if (this.camera) {
            this.camera.PostDraw(r);
        }

        // 3. Screen Space Arcade HUD & Overlays
        this._drawArcadeHUD(r);

        // Mobile Virtual Controls
        if (typeof VirtualControlls !== 'undefined' && mobileWithTouchScreen) {
            VirtualControlls.Draw(r);
        }

        // Boss Warning Banner
        if (this.bossWarningTimer > 0) {
            this._drawBossWarning(r);
        }

        // Victory / Game Over Overlays
        if (this.state === RAG_STATE.STAGE_CLEAR || this.state === 'STAGE_CLEAR') {
            this._drawStageClearOverlay(r);
        } else if (this.state === RAG_STATE.GAME_OVER || this.state === 'GAME_OVER') {
            this._drawGameOverOverlay(r);
        }
    }

    _drawFloatingTexts(renderer) {
        for (let ft of this.floatingTexts) {
            const col = Color.FromHex(ft.color);
            renderer.DrawFillText(ft.text, ft.x, ft.y, "bold 13px 'Courier New', monospace", col, "center");
        }
    }

    _drawArcadeHUD(r) {
        const w = r.width || 1280;
        const h = r.height || 720;

        // Top HUD Bar Background
        r.DrawFillBasicRectangle(0, 0, w, 54, new Color(0, 0, 0, 0.72));

        // 1UP & SCORE
        const scoreStr = this.player ? this.player.score.toString().padStart(6, '0') : "000000";
        r.DrawFillText("1UP", 30, 20, "bold 14px 'Courier New', monospace", Color.red, "left");
        r.DrawFillText(scoreStr, 30, 42, "bold 22px 'Courier New', monospace", Color.white, "left");

        // HIGH SCORE
        const hiStr = this.highScore.toString().padStart(6, '0');
        r.DrawFillText("HIGH SCORE", w / 2, 20, "bold 14px 'Courier New', monospace", Color.yellow, "center");
        r.DrawFillText(hiStr, w / 2, 42, "bold 22px 'Courier New', monospace", Color.yellow, "center");

        // LIVES & HEALTH
        if (this.player) {
            // Lives counter
            r.DrawFillText(`REST: ${Math.max(0, this.player.lives)}`, w - 360, 22, "bold 15px 'Courier New', monospace", Color.cyan, "left");

            // HP Bar Segments
            r.DrawFillText("HP:", w - 360, 42, "bold 15px 'Courier New', monospace", Color.white, "left");
            for (let i = 0; i < this.player.maxHp; i++) {
                const segCol = (i < this.player.hp) ?
                    (this.player.hp === 1 ? Color.red : Color.lime) :
                    new Color(0.2, 0.2, 0.2, 0.8);
                r.DrawFillBasicRectangle(w - 325 + (i * 24), 30, 18, 15, segCol);
                r.DrawStrokeBasicRectangle(w - 325 + (i * 24), 30, 18, 15, Color.white, 1.5);
            }

            // Current Weapon Badge & Ammo
            const wep = this.player.currentWeapon;
            const wepBadge = ArcadeSprites.powerups[wep.id] || ArcadeSprites.powerups['R'];
            if (wepBadge) {
                r.DrawImageBasic(wepBadge, w - 120, 9);
            }
            const ammoStr = (wep.ammo === Infinity) ? "∞" : wep.ammo.toString();
            r.DrawFillText(ammoStr, w - 65, 36, "bold 20px 'Courier New', monospace", Color.yellow, "left");
        }

        // Boss Health Bar (if active)
        if (this.boss && !this.boss.isDead) {
            const barW = 560;
            const barH = 20;
            const barX = (w - barW) / 2;
            const barY = h - 45;

            r.DrawFillBasicRectangle(barX - 14, barY - 24, barW + 28, 48, new Color(0, 0, 0, 0.8));
            r.DrawFillText("BOSS: MECHA-COLOSSUS MK-IV", w / 2, barY - 8, "bold 14px 'Courier New', monospace", Color.red, "center");

            // Background meter
            r.DrawFillBasicRectangle(barX, barY, barW, barH, new Color(0.2, 0.05, 0.05, 0.9));

            // Core HP Ratio
            const ratio = Math.max(0, this.boss.coreHp / this.boss.maxCoreHp);
            const fillCol = (this.boss.phase === 2) ? Color.orange : Color.red;
            r.DrawFillBasicRectangle(barX, barY, barW * ratio, barH, fillCol);
            r.DrawStrokeBasicRectangle(barX, barY, barW, barH, Color.white, 1.5);
        }
    }

    _drawBossWarning(r) {
        const w = r.width || 1280;
        const h = r.height || 720;

        // Flashing red warning banner
        const blink = Math.floor(totalTime * 6) % 2 === 0;
        if (blink) {
            r.DrawFillBasicRectangle(0, h / 2 - 55, w, 110, new Color(0.9, 0.0, 0.2, 0.88));
            r.DrawFillText("⚠ WARNING: BOSS APPROACHING ⚠", w / 2, h / 2 - 12, "bold 32px 'Courier New', monospace", Color.yellow, "center");
            r.DrawFillText("ENGAGING MECHA-COLOSSUS MK-IV", w / 2, h / 2 + 25, "bold 18px 'Courier New', monospace", Color.white, "center");
        }
    }

    _drawTitleScreen(r) {
        const w = r.width || 1280;
        const h = r.height || 720;

        // Deep grid background
        r.DrawFillBasicRectangle(0, 0, w, h, new Color(0.05, 0.07, 0.14, 1));

        // Animated neon lines
        for (let y = 0; y < h; y += 45) {
            r.DrawLine(0, y, w, y, new Color(0.1, 0.2, 0.35, 0.4), 1);
        }

        // Title Logo
        r.DrawFillText("CYBER COMMANDO", w / 2, 170, "900 64px 'Impact', 'Arial Black', sans-serif", Color.yellow, "center");
        r.DrawStrokeText("CYBER COMMANDO", w / 2, 170, "900 64px 'Impact', 'Arial Black', sans-serif", Color.red, "center", "alphabetic", 3);

        r.DrawFillText("PROJECT SPARK // RUN 'N' GUN ARCADE", w / 2, 220, "bold 18px 'Courier New', monospace", Color.cyan, "center");

        // Flashing Press Start
        if (Math.floor(totalTime * 2) % 2 === 0) {
            r.DrawFillText("PRESS ENTER / SPACE / CLICK TO START", w / 2, 320, "bold 24px 'Courier New', monospace", Color.white, "center");
        }

        // Controls Box
        r.DrawFillBasicRectangle(w / 2 - 340, 380, 680, 200, new Color(0, 0, 0, 0.8));
        r.DrawStrokeBasicRectangle(w / 2 - 340, 380, 680, 200, Color.cyan, 1.5);

        r.DrawFillText("— MISSION CONTROLS —", w / 2, 412, "bold 16px 'Courier New', monospace", Color.yellow, "center");
        r.DrawFillText("MOVE: [A][D] or [LEFT][RIGHT] ARROWS / GAMEPAD D-PAD", w / 2, 442, "15px 'Courier New', monospace", Color.white, "center");
        r.DrawFillText("AIM: 8-WAY [W][S] / [UP][DOWN] ARROWS", w / 2, 472, "15px 'Courier New', monospace", Color.white, "center");
        r.DrawFillText("JUMP: [K] / [X] / [SPACE]   |   DROP DOWN: [S] + JUMP", w / 2, 502, "15px 'Courier New', monospace", Color.white, "center");
        r.DrawFillText("FIRE: [J] / [Z] / [MOUSE]   |   AUDIO MUTE: [M]", w / 2, 532, "15px 'Courier New', monospace", Color.white, "center");

        // Footer
        r.DrawFillText("POWERED BY SPARK.JS — 100% ZERO EXTERNAL DEPENDENCIES", w / 2, 680, "13px 'Courier New', monospace", new Color(0.6, 0.6, 0.6, 1), "center");
    }

    _drawStageClearOverlay(r) {
        const w = r.width || 1280;
        const h = r.height || 720;

        r.DrawFillBasicRectangle(0, 0, w, h, new Color(0, 0, 0, 0.78));

        r.DrawFillText("MISSION ACCOMPLISHED!", w / 2, 220, "bold 52px 'Impact', sans-serif", Color.yellow, "center");
        r.DrawFillText("STAGE 1: OUTPOST LIBERATED", w / 2, 275, "bold 24px 'Courier New', monospace", Color.cyan, "center");

        const finalScore = this.player ? this.player.score : 0;
        r.DrawFillText(`FINAL SCORE: ${finalScore}`, w / 2, 350, "bold 28px 'Courier New', monospace", Color.white, "center");
        r.DrawFillText("CLEAR BONUS: +10,000 PTS", w / 2, 395, "bold 20px 'Courier New', monospace", Color.lime, "center");

        if (this.stageClearTimer > 3.0 && Math.floor(totalTime * 2) % 2 === 0) {
            r.DrawFillText("PRESS ENTER TO RETURN TO TITLE", w / 2, 480, "bold 22px 'Courier New', monospace", Color.white, "center");
        }
    }

    _drawGameOverOverlay(r) {
        const w = r.width || 1280;
        const h = r.height || 720;

        r.DrawFillBasicRectangle(0, 0, w, h, new Color(0.1, 0, 0, 0.85));

        r.DrawFillText("GAME OVER", w / 2, 230, "bold 64px 'Impact', sans-serif", Color.red, "center");
        r.DrawStrokeText("GAME OVER", w / 2, 230, "bold 64px 'Impact', sans-serif", Color.black, "center", "alphabetic", 2);

        r.DrawFillText("CONTINUE?", w / 2, 310, "bold 32px 'Courier New', monospace", Color.yellow, "center");
        const count = Math.max(0, Math.ceil(this.continueTimer));
        r.DrawFillText(count.toString(), w / 2, 380, "bold 56px 'Courier New', monospace", Color.white, "center");

        r.DrawFillText("PRESS ENTER / SPACE / CLICK TO CONTINUE", w / 2, 470, "bold 20px 'Courier New', monospace", Color.cyan, "center");
    }
}

// #endregion
