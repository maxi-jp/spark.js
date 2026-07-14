class TTSCPlayer extends SpriteObject {
    constructor(position, rotation, scale, img, sceneLimits) {
        super(position, rotation, scale, img);

        this.camera = null;

        this.speed = 280;
        this.speedMult = 1.5;
        this.speedMultRecoveryTime = 2.0;
        this.speedMultRecoveryTimeAyx = this.speedMultRecoveryTime;

        this.speedRotation = 5;

        this.life = 100;

        this.movement = Vector2.Zero();

        this.boundingRadious = 24;
        this.boundingRadious2 = this.boundingRadious * this.boundingRadious;

        this.fireRate = 0.1;
        this.fireRateAux = 0;

        this.cannonOffset = new Vector2(24, 0);

        this.bulletPool = new Pool(this, 10, Bullet, []);

        this.sceneLimits = sceneLimits;
    }

    Start() {
        this.camera = game.camera;
        this.life = 100;

        this.collider = new CircleCollider(Vector2.Zero(), this.boundingRadious, this);
        game.AddCollider(this.collider);
    }

    Update(deltaTime) {
        super.Update(deltaTime); // updates collider position

        const gamepad = Input.gamepads.length > 0;
        const aimJoystick = Input.GetVirtualJoystick('aim');

        // rotation — priority: gamepad RS → touch aim stick → mouse
        if (gamepad) {
            const rightStickValue = Input.GetGamepadStickValue(0, "RS");
            if (Math.abs(rightStickValue.x) > 0.33 || Math.abs(rightStickValue.y) > 0.33) {
                this.rotation = Math.atan2(
                    rightStickValue.y,
                    rightStickValue.x
                ) + PIH;
            }
        }
        else if (aimJoystick && aimJoystick.active) {
            // Aim joystick deflection maps directly to world-space direction
            if (Math.abs(aimJoystick.axisX) > 0.2 || Math.abs(aimJoystick.axisY) > 0.2) {
                this.rotation = Math.atan2(aimJoystick.axisY, aimJoystick.axisX) + PIH;
            }
        }
        else {
            this.rotation = Math.atan2(
                Input.mouse.y - this.position.y + this.camera.position.y,
                Input.mouse.x - this.position.x + this.camera.position.x
            ) + PIH;
        }

        // movement
        this.movement.Set(Input.GetAxis("MoveHorizontal"), Input.GetAxis("MoveVertical"));
        if (this.movement.Length() > 1)
            this.movement.Normalize();

        // speed multiply
        if (Input.IsKeyPressed(KEY_LSHIFT)) {
            this.movement.MultiplyScalar(this.speedMult);
        }

        // apply the movement
        this.position.x += this.movement.x * this.speed * deltaTime;
        this.position.y += this.movement.y * this.speed * deltaTime;

        // shooting!
        this.fireRateAux -= deltaTime;

        // Auto-fire while the aim stick is actively deflected
        const aimActive = aimJoystick && aimJoystick.active &&
            (Math.abs(aimJoystick.axisX) > 0.2 || Math.abs(aimJoystick.axisY) > 0.2);
        if (this.fireRateAux <= 0 && (Input.GetAction("Shot") || aimActive)) {
            const bullet = this.bulletPool.Activate();
            if (bullet) {
                // TODO play shoot audio

                let cannonPosition = new Vector2(
                    this.position.x + this.cannonOffset.x,
                    this.position.y + this.cannonOffset.y
                );
                cannonPosition = RotatePointAroundPoint(cannonPosition, this.position, this.rotation - PIH);
                bullet.position.x = cannonPosition.x;
                bullet.position.y = cannonPosition.y;
                bullet.rotation = this.rotation - PIH;

                this.fireRateAux = this.fireRate;

                // game.camera.Shake(0.08, 120, 1.5);
            }
        }

        // update the bullets
        this.bulletPool.Update(deltaTime);

        // check bullets scene limits
        this.bulletPool.objects.forEach(bullet => {
            if (bullet.active) {
                if (bullet.position.x < this.sceneLimits.position.x ||
                    bullet.position.x > this.sceneLimits.position.x + this.sceneLimits.width ||
                    bullet.position.y < this.sceneLimits.position.y ||
                    bullet.position.y > this.sceneLimits.position.y + this.sceneLimits.height
                ) {
                    bullet.active = false;
                }
            }
        });

        // check scene limits
        // left wall
        if (this.position.x < this.sceneLimits.position.x + this.boundingRadious)
            this.position.x = this.sceneLimits.position.x + this.boundingRadious;
        // right wall
        if (this.position.x > this.sceneLimits.position.x + this.sceneLimits.width - this.boundingRadious)
            this.position.x = this.sceneLimits.position.x + this.sceneLimits.width - this.boundingRadious;
        // top wall
        if (this.position.y < this.sceneLimits.position.y + this.boundingRadious)
            this.position.y = this.sceneLimits.position.y + this.boundingRadious;
        // bottom wall
        if (this.position.y > this.sceneLimits.position.y + this.sceneLimits.height - this.boundingRadious)
            this.position.y = this.sceneLimits.position.y + this.sceneLimits.height - this.boundingRadious;
    }

    Draw(renderer) {
        super.DrawSection(renderer, 52, 244, 48, 48);

        // draw the bullets
        this.bulletPool.Draw(renderer);
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
        if (!(otherCollider.go instanceof Enemy))
            return;

        const enemy = otherCollider.go;
        
        // Dont collide with spawning enemy
        if (enemy.IsSpawning()) return;
        
        this.Damage(enemy.collisionDamage);

        game.EnemyCollidesWithPlayer(enemy);
    }
}

class SpeedMultBar extends Rectangle {
    constructor(position, width, height) {
        super(position, width, height, Color.black);

        this.innerRectangle = new Rectangle(position, width, height, Color.green);
    }

    Draw(renderer) {
        super.Draw(renderer);

        this.innerRectangle.Draw(renderer);
    
        renderer.DrawStrokeBasicRectangle(this.position.x, this.position.y, this.width, this.height, Color.white, 2)
    }
}