// #region Run-and-Gun Enemies & Hazards

class Enemy extends GameObject {
    constructor(position) {
        super(position);
        this.velocity = new Vector2(0, 0);
        this.hp = 20;
        this.maxHp = 20;
        this.scoreValue = 100;
        this.width = 34;
        this.height = 44;
        this.isDead = false;
        this.hurtTimer = 0;
        this.facingRight = false;
    }

    TakeDamage(amount) {
        if (this.isDead) return;

        this.hp -= amount;
        this.hurtTimer = 0.12;

        if (this.game) {
            this.game.SpawnSpark(this.position.x, this.position.y, 4, '#ffdd00');
        }

        if (this.hp <= 0) {
            this.Die();
        }
    }

    Die(triggerSound = true) {
        this.isDead = true;
        this.active = false;

        if (this.game) {
            if (this.game.player) {
                this.game.player.score += this.scoreValue;
            }
            this.game.TriggerExplosion(this.position.x, this.position.y, 35, 0, false);
        }

        if (triggerSound) {
            retroAudio.PlayExplosion(0.8);
        }
    }

    Update(deltaTime) {
        if (this.isDead) return;
        super.Update(deltaTime);
        if (this.hurtTimer > 0) this.hurtTimer -= deltaTime;
    }
}

// ── 1. GRUNT SOLDIER ──────────────────────────────────────────
class GruntSoldier extends Enemy {
    constructor(position) {
        super(position);
        this.hp = 18;
        this.maxHp = 18;
        this.scoreValue = 150;
        this.speed = 140;
        this.gravity = 1200;
        this.isGrounded = false;

        this.state = 'RUN'; // 'RUN', 'SHOOT', 'WAIT'
        this.stateTimer = 0;
        this.shootCooldown = 2.0 + Math.random() * 1.5;
        this.animTimer = 0;
        this.runFrame = 0;
    }

    Update(deltaTime) {
        if (this.isDead) return;
        super.Update(deltaTime);

        const player = this.game?.player;
        if (!player) return;

        // Face player
        this.facingRight = (player.position.x > this.position.x);

        // State Machine
        this.shootCooldown -= deltaTime;
        const distToPlayer = Math.abs(player.position.x - this.position.x);

        if (this.shootCooldown <= 0 && distToPlayer < 550 && distToPlayer > 80) {
            this.state = 'SHOOT';
            this.stateTimer = 0.5;
            this.shootCooldown = 2.4 + Math.random() * 1.2;
            this._fireAtPlayer();
        }

        if (this.state === 'SHOOT') {
            this.velocity.x = 0;
            this.stateTimer -= deltaTime;
            if (this.stateTimer <= 0) {
                this.state = 'RUN';
            }
        } else {
            // Run towards player
            const dir = this.facingRight ? 1 : -1;
            this.velocity.x = dir * this.speed;

            this.animTimer += deltaTime * 8;
            this.runFrame = Math.floor(this.animTimer) % 2;
        }

        // Apply physics
        this.velocity.y += this.gravity * deltaTime;
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Platform collision
        if (this.game.stage) {
            this.game.stage.ResolveEnemyCollision(this);
        }

        // Pit death
        if (this.position.y > 750) {
            this.isDead = true;
            this.active = false;
        }

        // Despawn if left far behind camera
        if (this.game.camera && this.position.x < this.game.camera.position.x - 350) {
            this.active = false;
        }
    }

    _fireAtPlayer() {
        if (!this.game.player)
            return;

        const spawnX = this.position.x + (this.facingRight ? 22 : -22);
        const spawnY = this.position.y - 2;

        const dir = new Vector2(this.game.player.position.x - spawnX, this.game.player.position.y - spawnY);
        dir.Normalize();

        this.game.SpawnEnemyBullet(spawnX, spawnY, dir, 400, 1);
        retroAudio.PlayShootRifle();
    }

    Draw(renderer) {
        if (this.isDead) return;

        const drawX = Math.round(this.position.x);
        const drawY = Math.round(this.position.y);

        let sprite = ArcadeSprites.grunt.idle;
        if (this.state === 'SHOOT') {
            sprite = ArcadeSprites.grunt.shoot;
        } else if (Math.abs(this.velocity.x) > 5) {
            sprite = ArcadeSprites.grunt.run[this.runFrame] || ArcadeSprites.grunt.idle;
        }

        if (sprite) {
            const scaleX = this.facingRight ? 1 : -1;
            renderer.DrawImage(sprite, drawX, drawY, scaleX, 1, 0);
        } else {
            renderer.DrawFillRectangle(drawX, drawY, this.width, this.height, Color.red);
        }

        // Hurt flash
        if (this.hurtTimer > 0) {
            renderer.DrawFillRectangle(drawX, drawY, this.width, this.height, new Color(1, 1, 1, 0.6));
        }
    }
}

// ── 2. SNIPER TURRET ──────────────────────────────────────────
class SniperTurret extends Enemy {
    constructor(position) {
        super(position);
        this.hp = 35;
        this.maxHp = 35;
        this.scoreValue = 250;
        this.shootTimer = 2.0;
        this.aimAngle = 0;
        this.barrelLen = 30;
        this.width = 44;
        this.height = 34;
    }

    Update(deltaTime) {
        if (this.isDead) return;
        super.Update(deltaTime);

        const player = this.game?.player;
        if (!player) return;

        // Smoothly track player
        const dx = player.position.x - this.position.x;
        const dy = player.position.y - this.position.y;
        const targetAngle = Math.atan2(dy, dx);
        this.aimAngle = targetAngle;

        this.shootTimer -= deltaTime;
        if (this.shootTimer <= 0 && Math.abs(dx) < 700) {
            this.shootTimer = 2.2 + Math.random() * 0.8;
            this._fire();
        }
    }

    _fire() {
        if (!this.game) return;
        const spawnX = this.position.x + Math.cos(this.aimAngle) * this.barrelLen;
        const spawnY = this.position.y + Math.sin(this.aimAngle) * this.barrelLen;
        const dir = new Vector2(Math.cos(this.aimAngle), Math.sin(this.aimAngle));

        this.game.SpawnEnemyBullet(spawnX, spawnY, dir, 420, 1);
        retroAudio.PlayShootSpread();
    }

    Draw(renderer) {
        if (this.isDead) return;

        const drawX = Math.round(this.position.x);
        const drawY = Math.round(this.position.y);

        // Draw Base
        if (ArcadeSprites.turretBase) {
            renderer.DrawImage(ArcadeSprites.turretBase, drawX, drawY + 6, 1, 1, 0);
        } else {
            renderer.DrawFillRectangle(drawX, drawY, 44, 30, Color.darkGrey);
        }

        // Draw Rotating Barrel
        if (ArcadeSprites.turretBarrel) {
            renderer.DrawImage(ArcadeSprites.turretBarrel, drawX, drawY, 1, 1, this.aimAngle, { x: -10, y: 0 });
        }

        // Hurt flash
        if (this.hurtTimer > 0) {
            renderer.DrawFillRectangle(drawX, drawY, 44, 34, new Color(1, 1, 1, 0.6));
        }
    }
}

// ── 3. FLYING DRONE ───────────────────────────────────────────
class FlyingDrone extends Enemy {
    constructor(position) {
        super(position);
        this.hp = 15;
        this.maxHp = 15;
        this.scoreValue = 200;
        this.baseY = position.y;
        this.waveTimer = Math.random() * Math.PI * 2;
        this.width = 44;
        this.height = 28;
        this.speedX = -130;
        this.bombTimer = 2.5;
    }

    Update(deltaTime) {
        if (this.isDead) return;
        super.Update(deltaTime);

        this.waveTimer += deltaTime * 3;
        this.position.y = this.baseY + Math.sin(this.waveTimer) * 45;
        this.position.x += this.speedX * deltaTime;

        // Drop bomb when over player
        const player = this.game?.player;
        if (player) {
            this.bombTimer -= deltaTime;
            if (this.bombTimer <= 0 && Math.abs(player.position.x - this.position.x) < 60) {
                this.bombTimer = 3.0;
                this.game.SpawnEnemyBullet(this.position.x, this.position.y + 16, new Vector2(0, 1), 320, 1);
                retroAudio.PlayShootRifle();
            }
        }

        // Despawn if far behind camera
        if (this.game?.camera && this.position.x < this.game.camera.position.x - 200) {
            this.active = false;
        }
    }

    Draw(renderer) {
        if (this.isDead) return;
        const drawX = Math.round(this.position.x);
        const drawY = Math.round(this.position.y);

        if (ArcadeSprites.drone) {
            renderer.DrawImage(ArcadeSprites.drone, drawX, drawY, 1, 1, 0);
        } else {
            renderer.DrawFillCircle(drawX, drawY, 18, Color.cyan);
        }

        if (this.hurtTimer > 0) {
            renderer.DrawFillCircle(drawX, drawY, 20, new Color(1, 1, 1, 0.6));
        }
    }
}

// ── 4. ITEM CARRIER BLIMP ─────────────────────────────────────
class ItemCarrierBlimp extends Enemy {
    constructor(position, powerupType = 'S') {
        super(position);
        this.hp = 12;
        this.maxHp = 12;
        this.scoreValue = 300;
        this.powerupType = powerupType;
        this.width = 54;
        this.height = 30;
        this.speedX = 150;
        this.baseY = position.y;
    }

    Update(deltaTime) {
        if (this.isDead) return;
        super.Update(deltaTime);

        this.position.x += this.speedX * deltaTime;
        this.position.y = this.baseY + Math.sin(totalTime * 4) * 18;

        // Despawn if too far ahead or behind
        if (this.game?.camera) {
            const camX = this.game.camera.position.x;
            if (this.speedX > 0 && this.position.x > camX + 1500) {
                this.active = false;
            } else if (this.speedX < 0 && this.position.x < camX - 250) {
                this.active = false;
            }
        }
    }

    Die() {
        super.Die(true);
        // Drop power-up item
        if (this.game) {
            this.game.SpawnPowerup(this.position.x, this.position.y, this.powerupType);
        }
    }

    Draw(renderer) {
        if (this.isDead) return;
        const drawX = Math.round(this.position.x);
        const drawY = Math.round(this.position.y);

        if (ArcadeSprites.itemPod) {
            renderer.DrawImage(ArcadeSprites.itemPod, drawX, drawY, 1, 1, 0);
        } else {
            renderer.DrawFillRectangle(drawX, drawY, 54, 28, Color.yellow);
        }

        if (this.hurtTimer > 0) {
            renderer.DrawFillRectangle(drawX, drawY, 54, 30, new Color(1, 1, 1, 0.6));
        }
    }
}

// ── 5. EXPLOSIVE BARREL ───────────────────────────────────────
class ExplosiveBarrel extends GameObject {
    constructor(position) {
        super(position);
        this.hp = 20;
        this.maxHp = 20;
        this.isDead = false;
        this.width = 32;
        this.height = 42;
        this.flashTimer = 0;
    }

    TakeDamage(amount) {
        if (this.isDead) return;
        this.hp -= amount;
        this.flashTimer = 0.15;
        if (this.hp <= 0) {
            this.Detonate();
        }
    }

    Detonate() {
        if (this.isDead) return;
        this.isDead = true;
        this.active = false;

        retroAudio.PlayExplosion(1.5);
        if (this.game) {
            this.game.camera.Shake(0.5, 45, 12);
            this.game.TriggerExplosion(this.position.x, this.position.y, 110, 70, true);
        }
    }

    Update(deltaTime) {
        if (this.isDead) return;
        super.Update(deltaTime);
        if (this.flashTimer > 0) this.flashTimer -= deltaTime;
    }

    Draw(renderer) {
        if (this.isDead) return;
        const drawX = Math.round(this.position.x);
        const drawY = Math.round(this.position.y);

        if (ArcadeSprites.barrel) {
            renderer.DrawImage(ArcadeSprites.barrel, drawX, drawY, 1, 1, 0);
        } else {
            renderer.DrawFillRectangle(drawX, drawY, this.width, this.height, Color.red);
        }

        if (this.flashTimer > 0) {
            renderer.DrawFillRectangle(drawX, drawY, this.width, this.height, new Color(1, 1, 1, 0.7));
        }
    }
}

// #endregion
