// #region Boss: MECHA-COLOSSUS MK-IV

class BossMechaColossus extends GameObject {
    constructor(position) {
        super(position);

        // Sub-components HP
        this.maxCoreHp = 220;
        this.coreHp = 220;

        this.maxLauncherHp = 60;
        this.launcherHp = 60;
        this.launcherDestroyed = false;

        this.maxCannonHp = 60;
        this.cannonHp = 60;
        this.cannonDestroyed = false;

        this.isDead = false;
        this.phase = 1; // 1 = Normal, 2 = Overdrive (Core Exposed)
        this.width = 150;
        this.height = 115;

        // Sub-component relative positions
        this.coreOffset = new Vector2(-12, -6);
        this.launcherOffset = new Vector2(-35, -55);
        this.cannonOffset = new Vector2(-45, 32);

        // Hitboxes (radius)
        this.coreRadius = 32;
        this.launcherRadius = 24;
        this.cannonRadius = 24;

        // State Machine
        this.state = 'IDLE'; // 'IDLE', 'ROCKETS', 'SWEEP_BEAM', 'OVERDRIVE_BARRAGE', 'DEFEATED'
        this.stateTimer = 2.0;
        this.attackCooldown = 2.5;

        // Visual flash timers
        this.coreFlash = 0;
        this.launcherFlash = 0;
        this.cannonFlash = 0;

        // Defeat sequence
        this.defeatTimer = 0;
        this.defeatExplosionCount = 0;
    }

    Start() {
        super.Start();
    }

    Update(deltaTime) {
        if (this.isDead) return;
        super.Update(deltaTime);

        // Flash timers
        if (this.coreFlash > 0) this.coreFlash -= deltaTime;
        if (this.launcherFlash > 0) this.launcherFlash -= deltaTime;
        if (this.cannonFlash > 0) this.cannonFlash -= deltaTime;

        // If defeated, run cinematic destruction
        if (this.state === 'DEFEATED') {
            this._updateDefeatSequence(deltaTime);
            return;
        }

        // Check Phase 2 transition
        if (this.phase === 1 && (this.coreHp <= 110 || (this.launcherDestroyed && this.cannonDestroyed))) {
            this._enterPhase2();
        }

        // Attack cycle state machine
        this.stateTimer -= deltaTime;
        if (this.stateTimer <= 0) {
            this._pickNextAttack();
        }
    }

    _enterPhase2() {
        this.phase = 2;
        retroAudio.PlayBossAlert();
        if (this.game) {
            this.game.camera.Shake(0.8, 50, 10);
            this.game.ShowFloatingText('WARNING: BOSS CORE OVERDRIVE!', this.position.x - 120, this.position.y - 70, '#ff0055');
            // Trigger blast on body
            this.game.TriggerExplosion(this.position.x - 20, this.position.y, 60, 0, false);
        }
    }

    _pickNextAttack() {
        if (this.phase === 1) {
            // Pick between active arms
            const choices = [];
            if (!this.launcherDestroyed) choices.push('ROCKETS');
            if (!this.cannonDestroyed) choices.push('SWEEP_BEAM');
            choices.push('REINFORCE');

            const next = choices[Math.floor(Math.random() * choices.length)];
            this._executeAttack(next);
        } else {
            // Phase 2 Overdrive Attacks
            const p2Choices = ['OVERDRIVE_BARRAGE', 'CORE_LASER_SALVO', 'MORTAR_RAIN'];
            const next = p2Choices[Math.floor(Math.random() * p2Choices.length)];
            this._executeAttack(next);
        }
    }

    _executeAttack(attackType) {
        this.state = attackType;

        switch (attackType) {
            case 'ROCKETS':
                this.stateTimer = 2.8;
                this._fireRocketSalvo();
                break;

            case 'SWEEP_BEAM':
                this.stateTimer = 2.2;
                this._fireSweepBeam();
                break;

            case 'REINFORCE':
                this.stateTimer = 2.0;
                this._spawnReinforcements();
                break;

            case 'OVERDRIVE_BARRAGE':
                this.stateTimer = 2.6;
                this._fireOverdriveBarrage();
                break;

            case 'CORE_LASER_SALVO':
                this.stateTimer = 2.4;
                this._fireCoreLaserSalvo();
                break;

            case 'MORTAR_RAIN':
                this.stateTimer = 3.0;
                this._fireMortarRain();
                break;

            default:
                this.stateTimer = 1.5;
                break;
        }
    }

    _fireRocketSalvo() {
        if (!this.game) return;
        const lx = this.position.x + this.launcherOffset.x;
        const ly = this.position.y + this.launcherOffset.y;

        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (this.isDead || this.launcherDestroyed) return;
                const player = this.game?.player;
                const targetX = player ? player.position.x : lx - 200;
                const targetY = player ? player.position.y : ly;

                const dir = new Vector2(targetX - lx, targetY - ly);
                dir.Normalize();

                this.game.SpawnEnemyBullet(lx, ly, dir, 350, 1);
                retroAudio.PlayShootRocket();
            }, i * 350);
        }
    }

    _fireSweepBeam() {
        if (!this.game) return;
        const cx = this.position.x + this.cannonOffset.x;
        const cy = this.position.y + this.cannonOffset.y;

        // 4 rapid plasma bolts angled downward across the floor
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                if (this.isDead || this.cannonDestroyed) return;
                const angle = Math.PI - 0.1 - (i * 0.08); // Spread downward
                const dir = new Vector2(Math.cos(angle), Math.sin(angle));
                this.game.SpawnEnemyBullet(cx, cy, dir, 420, 1);
                retroAudio.PlayShootLaser();
            }, i * 200);
        }
    }

    _spawnReinforcements() {
        if (!this.game) return;
        // Spawn a flying drone or grunt soldier
        const spawnX = this.position.x - 20;
        const spawnY = this.position.y - 120;
        this.game.SpawnReinforcement(spawnX, spawnY);
    }

    _fireOverdriveBarrage() {
        if (!this.game) return;
        const cx = this.position.x + this.coreOffset.x;
        const cy = this.position.y + this.coreOffset.y;

        retroAudio.PlayShootSpread();
        if (this.game.camera) this.game.camera.Shake(0.4, 40, 5);

        // 7-way spread of plasma orbs
        for (let i = -3; i <= 3; i++) {
            const angle = Math.PI + (i * 0.18);
            const dir = new Vector2(Math.cos(angle), Math.sin(angle));
            this.game.SpawnEnemyBullet(cx, cy, dir, 380, 1);
        }
    }

    _fireCoreLaserSalvo() {
        if (!this.game) return;
        const cx = this.position.x + this.coreOffset.x;
        const cy = this.position.y + this.coreOffset.y;

        const player = this.game.player;
        if (!player) return;

        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (this.isDead) return;
                const dx = player.position.x - cx;
                const dy = player.position.y - cy;
                const dir = new Vector2(dx, dy);
                dir.Normalize();

                this.game.SpawnEnemyBullet(cx, cy, dir, 460, 1);
                retroAudio.PlayShootLaser();
            }, i * 160);
        }
    }

    _fireMortarRain() {
        if (!this.game) return;
        const lx = this.position.x - 20;
        const ly = this.position.y - 40;

        retroAudio.PlayShootRocket();
        if (this.game.camera) this.game.camera.Shake(0.5, 45, 6);

        // Launch 3 heavy mortars into the air towards arena zones
        const groundY = this.game.stage ? this.game.stage.groundY : 600;
        [-320, -180, -50].forEach((xOffset, idx) => {
            setTimeout(() => {
                if (this.isDead) return;
                const targetX = this.position.x + xOffset;
                const vx = (targetX - lx) * 0.9;
                const vy = -480;
                this.game.SpawnBossMortar(lx, ly, vx, vy, groundY);
            }, idx * 280);
        });
    }

    TakeComponentDamage(component, amount) {
        if (this.isDead || this.state === 'DEFEATED') return;

        if (component === 'LAUNCHER' && !this.launcherDestroyed) {
            this.launcherHp -= amount;
            this.launcherFlash = 0.12;
            if (this.launcherHp <= 0) {
                this.launcherDestroyed = true;
                retroAudio.PlayExplosion(1.2);
                if (this.game) {
                    this.game.TriggerExplosion(this.position.x + this.launcherOffset.x, this.position.y + this.launcherOffset.y, 50, 0, false);
                    this.game.player.score += 1500;
                }
            }
        } else if (component === 'CANNON' && !this.cannonDestroyed) {
            this.cannonHp -= amount;
            this.cannonFlash = 0.12;
            if (this.cannonHp <= 0) {
                this.cannonDestroyed = true;
                retroAudio.PlayExplosion(1.2);
                if (this.game) {
                    this.game.TriggerExplosion(this.position.x + this.cannonOffset.x, this.position.y + this.cannonOffset.y, 50, 0, false);
                    this.game.player.score += 1500;
                }
            }
        } else {
            // Core damage
            this.coreHp -= amount;
            this.coreFlash = 0.12;
            if (this.coreHp <= 0) {
                this.coreHp = 0;
                this.TriggerDefeat();
            }
        }
    }

    TriggerDefeat() {
        if (this.state === 'DEFEATED') return;
        this.state = 'DEFEATED';
        this.defeatTimer = 0;
        this.defeatExplosionCount = 0;

        retroAudio.PlayBossDefeat();
        if (this.game) {
            this.game.camera.Shake(3.0, 50, 14);
            if (this.game.player) {
                this.game.player.score += 10000;
            }
        }
    }

    _updateDefeatSequence(deltaTime) {
        this.defeatTimer += deltaTime;

        // Periodic explosions across body
        if (this.defeatTimer > this.defeatExplosionCount * 0.28 && this.defeatExplosionCount < 10) {
            this.defeatExplosionCount++;
            const rx = this.position.x + (Math.random() - 0.7) * 120;
            const ry = this.position.y + (Math.random() - 0.5) * 90;
            if (this.game) {
                this.game.TriggerExplosion(rx, ry, 50 + Math.random() * 25, 0, false);
            }
        }

        // Final huge blast & level complete
        if (this.defeatTimer >= 3.2 && !this.isDead) {
            this.isDead = true;
            this.active = false;
            if (this.game) {
                this.game.TriggerExplosion(this.position.x, this.position.y, 120, 0, false);
                this.game.OnBossDefeated();
            }
        }
    }

    Draw(renderer) {
        if (this.isDead) return;

        const bx = Math.round(this.position.x);
        const by = Math.round(this.position.y);

        // 1. Draw Armored Body
        if (ArcadeSprites.boss.body) {
            renderer.DrawImage(ArcadeSprites.boss.body, bx, by, 1, 1, 0);
        } else {
            renderer.DrawFillRectangle(bx, by, this.width, this.height, Color.darkGrey);
        }

        // 2. Draw Rocket Launcher (if not destroyed)
        if (!this.launcherDestroyed) {
            const lx = bx + this.launcherOffset.x;
            const ly = by + this.launcherOffset.y;
            if (ArcadeSprites.boss.launcher) {
                renderer.DrawImage(ArcadeSprites.boss.launcher, lx, ly, 1, 1, 0);
            }
            if (this.launcherFlash > 0) {
                renderer.DrawFillRectangle(lx, ly, 54, 34, new Color(1, 1, 1, 0.7));
            }
        }

        // 3. Draw Plasma Cannon (if not destroyed)
        if (!this.cannonDestroyed) {
            const cx = bx + this.cannonOffset.x;
            const cy = by + this.cannonOffset.y;
            if (ArcadeSprites.boss.cannon) {
                renderer.DrawImage(ArcadeSprites.boss.cannon, cx, cy, 1, 1, 0);
            }
            if (this.cannonFlash > 0) {
                renderer.DrawFillRectangle(cx, cy, 66, 28, new Color(1, 1, 1, 0.7));
            }
        }

        // 4. Draw Core
        const coreX = bx + this.coreOffset.x;
        const coreY = by + this.coreOffset.y;
        if (ArcadeSprites.boss.core) {
            // Pulse core in Phase 2
            const scale = (this.phase === 2) ? 1.0 + Math.sin(totalTime * 14) * 0.15 : 1.0;
            renderer.DrawImage(ArcadeSprites.boss.core, coreX, coreY, scale, scale, 0);
        } else {
            renderer.DrawFillCircle(coreX, coreY, this.coreRadius, Color.red);
        }

        if (this.coreFlash > 0) {
            renderer.DrawFillCircle(coreX, coreY, this.coreRadius + 2, new Color(1, 1, 1, 0.8));
        }
    }
}

// #endregion
