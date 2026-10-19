// =====================================================================
// Death Rally — Car classes
// Globals: Car, PlayerCar, EnemyCar
// Requires: death_rally_defs.js, game_objects.js (for Obstacle ref in OnCollisionEnter)
// =====================================================================

// #region ---- CAR (base) ----

class Car extends GameObject {
    /**
     * @param {Vector2} position
     * @param {string}  vehicleKey
     * @param {object}  [upgradedDef]  Pre-computed def with upgrade bonuses applied.
     *                                  Omit to use VEHICLE_DEFS[vehicleKey] unmodified.
     */
    constructor(position, vehicleKey, upgradedDef = null) {
        super(position);
        this.vehicleKey = vehicleKey;
        this.def        = upgradedDef ?? VEHICLE_DEFS[vehicleKey];

        this.isRacer   = true;
        this.velocity  = Vector2.Zero();
        this.health    = this.def.health;
        this.maxHealth = this.def.health;  // base health never changes with upgrades

        // Upgrade-driven stats applied by the game before a race starts
        this.armour                  = 0;   // flat damage reduction per hit (from ARMOUR upgrade)
        this.collisionDamageMultiplier = 1.0; // extra damage other cars take when hitting this car (BUMPER upgrade)

        // Per-race tracking (reset each race)
        this.damageDealt             = 0;
        this.moneyCollected          = 0;
        this.raceStartHealth         = this.def.health;

        this.currentWeapon     = 'NONE';
        this.ammo              = 0;
        this.fireCooldown      = 0;
        this.surfaceType       = SURFACE.ASPHALT;
        this.isDead            = false;
        this.hitFlash          = 0;
        this.collisionCooldown = 0;
    }

    Start() {
        const r = Math.max(this.def.width, this.def.height) * 0.45;
        this._collider = new CircleCollider(Vector2.Zero(), r, this);
        game.AddCollider(this._collider);
    }

    get speed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    }

    /** Forward unit vector (Y-down canvas: rotation=0 → pointing up). */
    get heading() {
        return new Vector2(Math.sin(this._rotation), -Math.cos(this._rotation));
    }

    /**
     * Arcade car physics — call each frame with normalised throttle/steer inputs.
     * @param {number} dt
     * @param {number} throttle  -1…1   (negative = brake/reverse)
     * @param {number} steer     -1…1   (negative = left)
     */
    _updatePhysics(dt, throttle, steer) {
        const rot  = this._rotation;
        const fwdX = Math.sin(rot),   fwdY = -Math.cos(rot);
        const rtX  = Math.cos(rot),   rtY  =  Math.sin(rot);

        // Lateral grip — exponential decay, frame-rate independent via Math.pow(base, dt)
        const vFwd = this.velocity.x * fwdX + this.velocity.y * fwdY;
        const vLat = this.velocity.x * rtX  + this.velocity.y * rtY;
        const grip = this.surfaceType.lateralFriction * this.def.lateralFrictionMult;
        const newVLat = vLat * Math.pow(1 - grip, dt);
        this.velocity.x = vFwd * fwdX + newVLat * rtX;
        this.velocity.y = vFwd * fwdY + newVLat * rtY;

        // Thrust
        if (throttle !== 0) {
            const accel = throttle > 0 ? this.def.acceleration : this.def.braking;
            this.velocity.x += fwdX * throttle * accel * dt;
            this.velocity.y += fwdY * throttle * accel * dt;
        }

        // Speed cap (forward and reverse)
        const topSpd = this.def.topSpeed * this.surfaceType.topSpeedMult;
        const curFwd = this.velocity.x * fwdX + this.velocity.y * fwdY;
        if (curFwd > topSpd) {
            const e = curFwd - topSpd;
            this.velocity.x -= fwdX * e; this.velocity.y -= fwdY * e;
        } else if (curFwd < -topSpd * 0.42) {
            const e = curFwd + topSpd * 0.42;
            this.velocity.x -= fwdX * e; this.velocity.y -= fwdY * e;
        }

        // Drag (stronger when coasting)
        const drag = throttle !== 0 ? Math.pow(0.92, dt) : Math.pow(0.12, dt);
        this.velocity.x *= drag;
        this.velocity.y *= drag;

        // Steering (speed-sensitive to prevent spinning in place)
        const steerFactor = Clamp(this.speed / 40, 0.1, 1.0);
        this._rotation   += steer * this.def.steerSpeed * steerFactor * dt;

        // Move
        this._position.x += this.velocity.x * dt;
        this._position.y += this.velocity.y * dt;

        // World boundary bounce
        const margin = Math.max(this.def.width, this.def.height) * 0.5 + 2;
        if (this._position.x < margin)            { this._position.x = margin;            if (this.velocity.x < 0) this.velocity.x *= -0.25; }
        else if (this._position.x > WORLD_W - margin) { this._position.x = WORLD_W - margin; if (this.velocity.x > 0) this.velocity.x *= -0.25; }
        if (this._position.y < margin)            { this._position.y = margin;            if (this.velocity.y < 0) this.velocity.y *= -0.25; }
        else if (this._position.y > WORLD_H - margin) { this._position.y = WORLD_H - margin; if (this.velocity.y > 0) this.velocity.y *= -0.25; }
    }

    Update(dt) {
        if (this.collisionCooldown > 0) this.collisionCooldown -= dt;
        if (this.fireCooldown     > 0) this.fireCooldown     -= dt;
        if (this.hitFlash         > 0) this.hitFlash         -= dt;
        this.surfaceType = game.GetSurfaceAt(this._position.x, this._position.y);
        super.Update(dt);
    }

    _fireWeapon() {
        if (this.ammo <= 0 || this.currentWeapon === 'NONE' || this.fireCooldown > 0) return;
        const def  = WEAPON_DEFS[this.currentWeapon];
        const fwdX = Math.sin(this._rotation);
        const fwdY = -Math.cos(this._rotation);
        this.fireCooldown = def.fireRate;
        if (this.currentWeapon === 'MINE') {
            game.AddGameObject(new Mine(
                this._position.x - fwdX * this.def.height * 0.6,
                this._position.y - fwdY * this.def.height * 0.6,
                this
            ));
        } else {
            game.AddGameObject(new Projectile(
                this._position.x + fwdX * this.def.height * 0.62,
                this._position.y + fwdY * this.def.height * 0.62,
                fwdX * def.speed, fwdY * def.speed,
                this._rotation, this.currentWeapon, this
            ));
        }
        this.ammo--;
        if (this.ammo <= 0) this.currentWeapon = 'NONE';
    }

    EquipWeapon(weaponKey) {
        this.currentWeapon = weaponKey;
        this.ammo          = WEAPON_DEFS[weaponKey].ammo;
    }

    ApplyDamage(amount, attacker = null) {
        if (this.isDead) return;
        // Armour = flat reduction; minimum 1 HP always gets through
        const effective = Math.max(1, amount - this.armour);
        this.health     = Math.max(0, this.health - effective);
        this.hitFlash   = 0.15;
        if (attacker) attacker.damageDealt += effective;
        if (this.health <= 0) { this.isDead = true; this.OnDeath(); }
    }

    Heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    OnDeath() {
        game.SpawnExplosion(this._position.x, this._position.y, true);
        game.camera.Shake(0.5, 38, 9);
        this.velocity.Set(0, 0);
    }

    OnCollisionEnter(myCol, otherCol) {
        const go = otherCol.go;
        if (!go || this.isDead) return;

        if (go instanceof Car && this.collisionCooldown <= 0) {
            const dx = go._position.x - this._position.x;
            const dy = go._position.y - this._position.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / dist, ny = dy / dist;
            const impact = (this.velocity.x - go.velocity.x) * nx + (this.velocity.y - go.velocity.y) * ny;
            if (impact > 20) {
                const impulse = 1.6 * impact / (this.def.mass + go.def.mass);
                this.velocity.x -= nx * impulse * go.def.mass;
                this.velocity.y -= ny * impulse * go.def.mass;
                const rawDmg = Math.max(0, impact * 0.07 - 2);
                if (rawDmg > 0) {
                    // go's spiked bumper amplifies the damage THIS car receives from the impact
                    const dmg = rawDmg * go.collisionDamageMultiplier;
                    this.ApplyDamage(dmg, go);
                }
            }
            this.collisionCooldown = 0.3;

        } else if (go instanceof Obstacle && this.collisionCooldown <= 0) {
            let nx, ny;

            if (go.isBarrel) {
                // Circular obstacle: center-to-center is the correct separation axis
                const dx = this._position.x - go._position.x;
                const dy = this._position.y - go._position.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                nx = dx / dist;
                ny = dy / dist;
            } else {
                // Rectangular obstacle: use the closest point on the AABB to the car
                // center. This gives a correct axis-aligned normal on flat faces
                // regardless of how far the obstacle's center is from the contact point.
                const hw = go.w * 0.5, hh = go.h * 0.5;
                const ox = go._position.x,  oy = go._position.y;
                const cpx = Clamp(this._position.x, ox - hw, ox + hw);
                const cpy = Clamp(this._position.y, oy - hh, oy + hh);
                const dx  = this._position.x - cpx;
                const dy  = this._position.y - cpy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 0.5) {
                    // Car center is inside the rectangle (deep penetration).
                    // Escape along the reversed velocity direction.
                    const spd = this.speed || 1;
                    nx = -this.velocity.x / spd;
                    ny = -this.velocity.y / spd;
                } else {
                    nx = dx / dist;
                    ny = dy / dist;
                }
            }

            // Reflect only the incoming component of velocity (dot < 0 = moving into surface)
            const dot = this.velocity.x * nx + this.velocity.y * ny;
            if (dot < 0) {
                this.velocity.x -= 1.6 * dot * nx;
                this.velocity.y -= 1.6 * dot * ny;
            }

            // Push car out along the normal so it no longer overlaps
            this._position.x += nx * 8;
            this._position.y += ny * 8;

            // Throttle damage separately from the physics response
            const spd = this.speed;
            if (spd > 60) this.ApplyDamage((spd - 60) * 0.04);
            this.collisionCooldown = 0.12;
        }
    }

    Draw(r) {
        const x   = this._position.x, y = this._position.y;
        const w   = this.def.width,   h = this.def.height;
        const rot = this._rotation;

        const fwdX = Math.sin(rot), fwdY = -Math.cos(rot);
        const rtX  = Math.cos(rot), rtY  =  Math.sin(rot);

        const bodyColor = this.isDead       ? C_DARKROAD
                        : this.hitFlash > 0 ? C_WHITE
                        : this.def.color;

        r.DrawFillRectangle(x, y, w, h, bodyColor, rot);

        // Windshield strip (near front)
        r.DrawFillRectangle(
            x + fwdX * h * 0.26, y + fwdY * h * 0.26,
            w * 0.70, h * 0.20, C_HALFBLACK, rot
        );

        // Headlights
        if (!this.isDead) {
            const fd = h * 0.44, sd = w * 0.30;
            r.DrawFillCircle(x + fwdX*fd + rtX*sd, y + fwdY*fd + rtY*sd, 3, C_HEADLIGHT);
            r.DrawFillCircle(x + fwdX*fd - rtX*sd, y + fwdY*fd - rtY*sd, 3, C_HEADLIGHT);
        }

        // World-space health bar (axis-aligned, 11 px above top edge)
        const bW = w + 8, bH = 5;
        const bX = x - bW * 0.5, bY = y - h * 0.5 - 11;
        const hpF = this.health / this.maxHealth;
        r.DrawFillBasicRectangle(bX, bY, bW, bH, C_HP_BG);
        r.DrawFillBasicRectangle(bX, bY, bW * hpF, bH,
            hpF > 0.5 ? C_HP_HIGH : (hpF > 0.25 ? C_HP_MED : C_HP_LOW));

        // Armour indicator: small vertical bar perpendicular to the health bar on the left
        if (this.armour > 0) {
            const maxArmour = UPGRADE_DEFS.ARMOUR.levels[2].armourValue; // 75
            const armFrac   = Math.min(1, this.armour / maxArmour);
            const armH      = Math.round(4 + armFrac * 8); // 4–12 px tall
            r.DrawFillBasicRectangle(bX - 4, bY - Math.floor((armH - bH) * 0.5), 3, armH, C_ARMOUR);
        }
    }
}

// #endregion

// #region ---- PLAYER CAR ----

class PlayerCar extends Car {
    constructor(position, vehicleKey, upgradedDef = null) {
        super(position, vehicleKey, upgradedDef);
        this.inputDisabled = false;
    }

    Update(dt) {
        if (!this.isDead && !this.inputDisabled) {
            this._updatePhysics(dt, Input.GetAxis('throttle'), Input.GetAxis('steer'));
            if (Input.GetAction('fire')) this._fireWeapon();
        }
        super.Update(dt);
    }

    CollectPickup(pickup) {
        switch (pickup.type) {
            case 'weapon': this.EquipWeapon(pickup.data);  break;
            case 'health': this.Heal(pickup.data);          break;
            case 'money':
                this.moneyCollected += pickup.data;
                break;
        }
        game.ShowPickupMessage(pickup);
    }

    /** Swap vehicle type at runtime (debug menu). Preserves HP ratio. */
    SwapVehicle(vehicleKey) {
        const ratio     = this.health / this.maxHealth;
        this.vehicleKey = vehicleKey;
        this.def        = VEHICLE_DEFS[vehicleKey];
        this.maxHealth  = this.def.health;
        this.health     = Math.ceil(this.def.health * ratio);
        this.isDead     = false;
        game.RemoveCollider(this._collider);
        this._collider  = new CircleCollider(
            Vector2.Zero(), Math.max(this.def.width, this.def.height) * 0.45, this);
        game.AddCollider(this._collider);
    }
}

// #endregion

// #region ---- ENEMY CAR ----

class EnemyCar extends Car {
    /**
     * @param {Vector2} position
     * @param {string}  vehicleKey
     * @param {number}  [wpStartIndex=0]  Starting waypoint — stagger enemies around the circuit
     */
    constructor(position, vehicleKey, wpStartIndex = 0, upgradedDef = null) {
        super(position, vehicleKey, upgradedDef);
        this.aiTarget   = null;
        this.wpIndex    = wpStartIndex;
        this.shootTimer = RandomBetweenFloat(1.0, 2.5);
    }

    Update(dt) {
        // ── BUG FIX: enemies wait for RACING state — do not move during countdown ──
        if (!this.isDead && game.raceManager?.state === RACE_STATE.RACING) {
            const waypoints = game.raceManager?.circuit?.waypoints;
            if (waypoints?.length > 0) {
                this._followWaypoints(dt, waypoints);
            } else if (this.aiTarget) {
                this._chaseTarget(dt);
            }
        }
        super.Update(dt);
    }

    _followWaypoints(dt, waypoints) {
        const wp   = waypoints[this.wpIndex];
        const dx   = wp.x - this._position.x;
        const dy   = wp.y - this._position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) this.wpIndex = (this.wpIndex + 1) % waypoints.length;

        let angleDiff = Math.atan2(dx, -dy) - this._rotation;
        while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        this._updatePhysics(dt, 0.92, Clamp(angleDiff * 2.5, -1, 1));
        this._tryShootPlayer(dt, 300, 0.4);
    }

    _chaseTarget(dt) {
        const dx   = this.aiTarget._position.x - this._position.x;
        const dy   = this.aiTarget._position.y - this._position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angleDiff = Math.atan2(dx, -dy) - this._rotation;
        while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this._updatePhysics(dt, dist > 60 ? 0.85 : 0, Clamp(angleDiff * 2.5, -1, 1));
        this._tryShootPlayer(dt, 350, 0.35);
    }

    _tryShootPlayer(dt, maxRange, maxAngle) {
        if (!this.ammo || !this.aiTarget) return;
        const dx   = this.aiTarget._position.x - this._position.x;
        const dy   = this.aiTarget._position.y - this._position.y;
        if (Math.sqrt(dx*dx + dy*dy) > maxRange) return;
        let aim = Math.atan2(dx, -dy) - this._rotation;
        while (aim >  Math.PI) aim -= Math.PI * 2;
        while (aim < -Math.PI) aim += Math.PI * 2;
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && Math.abs(aim) < maxAngle) {
            this._fireWeapon();
            this.shootTimer = RandomBetweenFloat(0.5, 1.8);
        }
    }
}

// #endregion
