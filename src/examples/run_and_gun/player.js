// #region Player Character (Commando - 720p HD Arcade)

class Player extends GameObject {
    constructor(position) {
        super(position);

        // Movement physics (tuned for 1280x720 resolution)
        this.velocity = new Vector2(0, 0);
        this.speed = 280;
        this.jumpForce = -520;
        this.gravity = 1200;
        this.isGrounded = false;
        this.facingRight = true;

        // Bounding box for collisions
        this.width = 36;
        this.height = 48;
        this.duckHeight = 32;

        // States
        this.isDucking = false;
        this.isDead = false;
        this.invulnerableTimer = 0;
        this.invulnerableDuration = 1.6;
        this.barrierTimer = 0;

        // Stats
        this.lives = 3;
        this.maxHp = 3;
        this.hp = 3;
        this.score = 0;

        // Weapons
        this.weaponKey = 'RIFLE';
        this.currentWeapon = Object.assign({}, WEAPON_DATA.RIFLE);
        this.fireCooldown = 0;
        this.muzzleFlashTimer = 0;
        this.muzzlePos = new Vector2(0, 0);

        // Aim Vector (normalized)
        this.aimDir = new Vector2(1, 0);

        // Animation
        this.animTimer = 0;
        this.runFrame = 0;

        // Platform drop-through
        this.dropThroughTimer = 0;
    }

    Start() {
        super.Start();
    }

    Respawn(spawnX, spawnY) {
        this.position.Set(spawnX, spawnY);
        this.velocity.Set(0, 0);
        this.hp = this.maxHp;
        this.isDead = false;
        this.invulnerableTimer = 2.5;
        this.weaponKey = 'RIFLE';
        this.currentWeapon = Object.assign({}, WEAPON_DATA.RIFLE);
    }

    Update(deltaTime) {
        if (this.isDead)
            return;

        super.Update(deltaTime);

        // Timers
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= deltaTime;
        if (this.barrierTimer > 0) this.barrierTimer -= deltaTime;
        if (this.fireCooldown > 0) this.fireCooldown -= deltaTime;
        if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer -= deltaTime;
        if (this.dropThroughTimer > 0) this.dropThroughTimer -= deltaTime;

        this._handleInput(deltaTime);
        this._applyPhysics(deltaTime);
        this._updateAnimation(deltaTime);
    }

    _handleInput(deltaTime) {
        // Movement & Aim Axes (Keyboard, Gamepad Left Stick/D-Pad, Virtual Joystick)
        const rawX = Input.GetAxis('MoveH');
        const rawY = Input.GetAxis('MoveV');

        const moveX = Math.abs(rawX) > 0.2 ? rawX : 0;
        const up = rawY < -0.3;
        const down = rawY > 0.3;

        // Facing direction
        if (moveX !== 0) {
            this.facingRight = (moveX > 0);
        }

        // Crouching / Ducking
        this.isDucking = (this.isGrounded && down && moveX === 0);

        // Movement Velocity
        this.velocity.x = this.isDucking ? 0 : moveX * this.speed;

        // Calculate 8-Way Aim Direction
        this._computeAimDirection(moveX, up, down);

        // Jumping & Platform Drop-through
        if (Input.GetActionDown('Jump') && this.isGrounded) {
            if (down) {
                // Drop through one-way platforms
                this.dropThroughTimer = 0.3;
                this.position.y += 4;
                this.isGrounded = false;
            }
            else {
                // Jump
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
                retroAudio.PlayJump();
            }
        }

        // Shooting
        if (Input.GetAction('Fire') && this.fireCooldown <= 0) {
            this._fireWeapon();
        }
    }

    _computeAimDirection(moveX, up, down) {
        const dirX = this.facingRight ? 1 : -1;

        if (this.isGrounded) {
            if (this.isDucking) {
                this.aimDir.Set(dirX, 0);
            }
            else if (up) {
                if (moveX !== 0)
                    this.aimDir.Set(dirX * 0.707, -0.707);
                else
                    this.aimDir.Set(0, -1);
            }
            else {
                this.aimDir.Set(dirX, 0);
            }
        }
        else {
            if (up) {
                if (moveX !== 0)
                    this.aimDir.Set(dirX * 0.707, -0.707);
                else
                    this.aimDir.Set(0, -1);
            }
            else if (down) {
                if (moveX !== 0)
                    this.aimDir.Set(dirX * 0.707, 0.707);
                else
                    this.aimDir.Set(0, 1);
            }
            else {
                this.aimDir.Set(dirX, 0);
            }
        }
    }

    _fireWeapon() {
        if (!this.game) return;

        this.fireCooldown = this.currentWeapon.fireRate;
        this.muzzleFlashTimer = 0.06;

        // Calculate muzzle tip position
        const offsetX = this.aimDir.x * 30;
        const offsetY = (this.isDucking ? 6 : -8) + this.aimDir.y * 24;
        const spawnX = this.position.x + offsetX;
        const spawnY = this.position.y + offsetY;
        this.muzzlePos.Set(spawnX, spawnY);

        // Sound trigger
        switch (this.weaponKey) {
            case 'SPREAD': retroAudio.PlayShootSpread(); break;
            case 'LASER': retroAudio.PlayShootLaser(); break;
            case 'MACHINE': retroAudio.PlayShootMachineGun(); break;
            case 'ROCKET': retroAudio.PlayShootRocket(); break;
            default: retroAudio.PlayShootRifle(); break;
        }

        // Spawn bullets based on weapon type
        if (this.weaponKey === 'SPREAD') {
            const baseAngle = Math.atan2(this.aimDir.y, this.aimDir.x);
            const spreadStep = this.currentWeapon.spreadSpread;
            for (let i = -2; i <= 2; i++) {
                const angle = baseAngle + i * spreadStep;
                const dir = new Vector2(Math.cos(angle), Math.sin(angle));
                this.game.SpawnPlayerBullet(spawnX, spawnY, dir, this.currentWeapon.speed, this.currentWeapon.damage, 'S');
            }
        }
        else if (this.weaponKey === 'MACHINE') {
            const jitter = (Math.random() - 0.5) * this.currentWeapon.spreadJitter;
            const angle = Math.atan2(this.aimDir.y, this.aimDir.x) + jitter;
            const dir = new Vector2(Math.cos(angle), Math.sin(angle));
            this.game.SpawnPlayerBullet(spawnX, spawnY, dir, this.currentWeapon.speed, this.currentWeapon.damage, 'M');
        }
        else if (this.weaponKey === 'ROCKET') {
            this.game.SpawnPlayerBullet(spawnX, spawnY, this.aimDir, this.currentWeapon.speed, this.currentWeapon.damage, 'G', false, this.currentWeapon.blastRadius);
        }
        else if (this.weaponKey === 'LASER') {
            this.game.SpawnPlayerBullet(spawnX, spawnY, this.aimDir, this.currentWeapon.speed, this.currentWeapon.damage, 'L', true);
        }
        else {
            this.game.SpawnPlayerBullet(spawnX, spawnY, this.aimDir, this.currentWeapon.speed, this.currentWeapon.damage, 'R');
        }

        if (this.currentWeapon.ammo !== Infinity) {
            this.currentWeapon.ammo--;
            if (this.currentWeapon.ammo <= 0) {
                this.EquipWeapon('RIFLE');
            }
        }
    }

    EquipWeapon(key) {
        if (!WEAPON_DATA[key])
            return;

        this.weaponKey = key;
        this.currentWeapon = Object.assign({}, WEAPON_DATA[key]);
        retroAudio.PlayPowerup();
        if (this.game) {
            this.game.ShowFloatingText(`WEAPON: ${this.currentWeapon.name}`, this.position.x, this.position.y - 40, '#00f5d4');
        }
    }

    GiveBarrier() {
        this.barrierTimer = 10.0;
        retroAudio.PlayPowerup();
        if (this.game) {
            this.game.ShowFloatingText('BARRIER SHIELD ACTIVE!', this.position.x, this.position.y - 40, '#3a86ff');
        }
    }

    TakeDamage(amount = 1) {
        if (this.isDead || this.invulnerableTimer > 0 || this.barrierTimer > 0)
            return;

        this.hp -= amount;
        this.invulnerableTimer = this.invulnerableDuration;
        retroAudio.PlayPlayerHit();

        if (this.game) {
            this.game.camera.Shake(0.3, 40, 8);
            this.game.SpawnSpark(this.position.x, this.position.y, 12, '#ff0033');
        }

        if (this.hp <= 0) {
            this.Die();
        }
    }

    Die() {
        this.isDead = true;
        this.lives--;
        retroAudio.PlayExplosion(1.2);
        retroAudio.PlayGameOver();

        if (this.game) {
            this.game.TriggerExplosion(this.position.x, this.position.y, 50, 0, false);
            this.game.OnPlayerDied();
        }
    }

    _applyPhysics(deltaTime) {
        // Gravity
        this.velocity.y += this.gravity * deltaTime;

        // Apply velocities
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Stage Platform Collision
        if (this.game && this.game.stage) {
            this.game.stage.ResolvePlayerCollision(this);
        }

        // Boundary clamp to camera viewport
        if (this.game && this.game.camera) {
            const camLeft = this.game.camera.position.x;
            const viewW = this.game.renderer ? this.game.renderer.width : 1280;
            if (this.position.x - this.width / 2 < camLeft + 18) {
                this.position.x = camLeft + 18 + this.width / 2;
                this.velocity.x = Math.max(0, this.velocity.x);
            }
            if (this.position.x + this.width / 2 > camLeft + viewW - 18) {
                this.position.x = camLeft + viewW - 18 - this.width / 2;
                this.velocity.x = Math.min(0, this.velocity.x);
            }
        }

        // Pit fall death
        if (this.position.y > 800 && !this.isDead) {
            this.hp = 0;
            this.Die();
        }
    }

    _updateAnimation(deltaTime) {
        if (Math.abs(this.velocity.x) > 10 && this.isGrounded) {
            this.animTimer += deltaTime * 12;
            this.runFrame = Math.floor(this.animTimer) % 4;
        }
        else {
            this.animTimer = 0;
            this.runFrame = 0;
        }
    }

    Draw(renderer) {
        if (this.isDead)
            return;

        // Invulnerability flicker
        if (this.invulnerableTimer > 0 && Math.floor(totalTime * 20) % 2 === 0) {
            return;
        }

        const currentHeight = this.isDucking ? this.duckHeight : this.height;
        const drawX = Math.round(this.position.x);
        const feetY = this.position.y + this.height / 2;

        let sprite = ArcadeSprites.player.idle;

        if (this.isDucking) {
            sprite = ArcadeSprites.player.duck;
        }
        else if (!this.isGrounded) {
            if (this.aimDir.y > 0.5)
                sprite = ArcadeSprites.player.aimDiagDown;
            else if (this.aimDir.y < -0.5)
                sprite = ArcadeSprites.player.aimUp;
            else
                sprite = ArcadeSprites.player.jump;
        }
        else {
            if (this.aimDir.y < -0.6) {
                sprite = ArcadeSprites.player.aimUp;
            }
            else if (this.aimDir.y < -0.2) {
                sprite = ArcadeSprites.player.aimDiagUp;
            }
            else if (Math.abs(this.velocity.x) > 10) {
                sprite = ArcadeSprites.player.run[this.runFrame] || ArcadeSprites.player.idle;
            }
            else {
                sprite = ArcadeSprites.player.idle;
            }
        }

        const drawY = sprite
            ? Math.round(feetY - sprite.halfHeight)
            : Math.round(feetY - currentHeight / 2);

        if (sprite) {
            const scaleX = this.facingRight ? 1 : -1;
            renderer.DrawImage(sprite, drawX, drawY, scaleX, 1, 0);
        }
        else {
            renderer.DrawFillRectangle(drawX, drawY, this.width, currentHeight, Color.blue);
        }

        // Draw Muzzle Flash
        if (this.muzzleFlashTimer > 0 && ArcadeSprites.muzzleFlash) {
            renderer.DrawImage(ArcadeSprites.muzzleFlash, this.muzzlePos.x, this.muzzlePos.y, 1, 1, 0);
        }

        // Draw Barrier Shield if active
        if (this.barrierTimer > 0) {
            const shieldAlpha = 0.4 + Math.sin(totalTime * 12) * 0.2;
            const shieldCol = new Color(0.2, 0.6, 1.0, shieldAlpha);
            renderer.DrawStrokeCircle(drawX, drawY, 36, shieldCol, 4);
            renderer.DrawFillCircle(drawX, drawY, 34, new Color(0.2, 0.7, 1.0, 0.15));
        }
    }
}

// #endregion
