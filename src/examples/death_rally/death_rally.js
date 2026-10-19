// This file has been split into focused modules.
// It is no longer loaded by death-rally.html.
//
//   death_rally_defs.js   — SURFACE, VEHICLE_DEFS, WEAPON_DEFS, color constants
//   game_objects.js       — Obstacle, Pickup, Projectile, Mine, Explosion
//   cars.js               — Car, PlayerCar, EnemyCar
//   death_rally_game.js   — DeathRallyGame (main game class + Init call)

// #region ---- CONSTANTS ----

const WORLD_W = 2400;
const WORLD_H = 1800;
const SCREEN_W = 1024;
const SCREEN_H = 768;

// Surface types — lateralFriction: fraction of lateral velocity removed per second
// (e.g. 0.88 = asphalt keeps 12% lateral vel after 1 s → very grippy)
const SURFACE = {
    GRASS:   { id:'GRASS',   name:'Grass',     lateralFriction:0.55, topSpeedMult:0.65, color:Color.FromRGB( 50, 80, 35) },
    ASPHALT: { id:'ASPHALT', name:'Asphalt',   lateralFriction:0.88, topSpeedMult:1.00, color:Color.FromRGB( 65, 65, 70) },
    GRAVEL:  { id:'GRAVEL',  name:'Gravel',    lateralFriction:0.60, topSpeedMult:0.84, color:Color.FromRGB(145,130,100) },
    DIRT:    { id:'DIRT',    name:'Dirt',      lateralFriction:0.46, topSpeedMult:0.73, color:Color.FromRGB(120, 85, 50) },
    OIL:     { id:'OIL',     name:'Oil Slick', lateralFriction:0.10, topSpeedMult:0.96, color:Color.FromRGB( 22, 22, 38) },
};

const VEHICLE_DEFS = {
    SPORTS: { name:'Sports Car',  topSpeed:500, acceleration:460, braking:560, steerSpeed:2.8, mass:1.0, lateralFrictionMult:1.00, width:24, height:44, health:100, color:Color.FromRGB(220, 60, 60) },
    MUSCLE: { name:'Muscle Car',  topSpeed:440, acceleration:400, braking:480, steerSpeed:2.3, mass:1.5, lateralFrictionMult:0.95, width:28, height:50, health:150, color:Color.FromRGB( 60,100,220) },
    TRUCK:  { name:'Heavy Truck', topSpeed:300, acceleration:260, braking:380, steerSpeed:1.8, mass:2.5, lateralFrictionMult:0.88, width:36, height:60, health:240, color:Color.FromRGB( 60,160, 60) },
    BUGGY:  { name:'Buggy',       topSpeed:470, acceleration:500, braking:540, steerSpeed:3.2, mass:0.8, lateralFrictionMult:0.82, width:22, height:38, health: 80, color:Color.FromRGB(220,180, 40) },
};

// fireRate: minimum seconds between shots; ammo granted per pickup
const WEAPON_DEFS = {
    NONE:       { key:'NONE',       name:'None',        ammo: 0, damage: 0, fireRate:0,    speed:  0, radius: 0, color:null },
    MACHINEGUN: { key:'MACHINEGUN', name:'Machine Gun', ammo:10, damage:10, fireRate:0.12, speed:700, radius: 4, color:Color.FromRGB(255,255,100) },
    MISSILE:    { key:'MISSILE',    name:'Missile',     ammo: 1, damage:65, fireRate:1.50, speed:480, radius: 8, color:Color.FromRGB(255, 80, 20) },
    MINE:       { key:'MINE',       name:'Mine',        ammo: 3, damage:45, fireRate:0.40, speed:  0, radius:13, color:Color.FromRGB( 60, 60, 60) },
};

// Reused color constants — avoid allocating new Color objects in Draw() hot path
const C_WHITE     = new Color(1,  1,  1,  1  );
const C_BLACK     = new Color(0,  0,  0,  1  );
const C_HALFBLACK = new Color(0,  0,  0,  0.5);
const C_DARKROAD  = Color.FromRGB( 40, 40, 45);
const C_WALL      = Color.FromRGB( 80, 70, 60);
const C_BARREL    = Color.FromRGB(190, 80, 20);
const C_HP_BG     = Color.FromRGB( 40, 40, 40);
const C_HP_HIGH   = Color.FromRGB( 50,200, 50);
const C_HP_MED    = Color.FromRGB(220,180,  0);
const C_HP_LOW    = Color.FromRGB(220, 40, 40);
const C_HEADLIGHT = Color.FromRGB(255,255,200);
const C_MINE_BODY = Color.FromRGB( 50, 50, 55);
const C_MINE_RIM  = Color.FromRGB(100,100,100);
const C_MINE_LED  = Color.FromRGB(255, 50, 50);
const C_PICK_HP   = Color.FromRGB( 50,200, 80);
const C_PICK_COIN = Color.FromRGB(255,210,  0);
const C_PICK_MG   = Color.FromRGB(255,220, 50);
const C_PICK_MSL  = Color.FromRGB(255,100, 30);
const C_PICK_MINE = Color.FromRGB(100,100,100);
const C_COIN_TEXT = Color.FromRGB(130, 90,  0);
const C_WRECKED   = Color.FromRGB(255, 50, 50);

// #endregion

// #region ---- OBSTACLE ----

class Obstacle extends GameObject {
    /**
     * @param {number}  cx       Centre X
     * @param {number}  cy       Centre Y
     * @param {number}  w        Width (or diameter for barrels)
     * @param {number}  h        Height
     * @param {Color}   color
     * @param {boolean} isBarrel Render+collide as a circle (barrel/boulder)
     */
    constructor(cx, cy, w, h, color = C_WALL, isBarrel = false) {
        super(new Vector2(cx, cy));
        this.w = w;
        this.h = h;
        this.color = color;
        this.isBarrel = isBarrel;
    }

    Start() {
        this._collider = this.isBarrel
            ? new CircleCollider(Vector2.Zero(), this.w * 0.5, this)
            : new RectangleCollider(Vector2.Zero(), this.w, this.h, this);
        game.AddCollider(this._collider);
    }

    Draw(r) {
        const x = this._position.x, y = this._position.y;
        if (this.isBarrel) {
            r.DrawFillCircle(x, y, this.w * 0.5, this.color);
            r.DrawStrokeCircle(x, y, this.w * 0.5, C_DARKROAD, 2);
            r.DrawStrokeCircle(x, y, this.w * 0.22, C_DARKROAD, 1.5);
        } else {
            r.DrawFillRectangle(x, y, this.w, this.h, this.color, 0);
        }
    }
}

// #endregion

// #region ---- PICKUP ----

class Pickup extends GameObject {
    constructor(x, y, type, data) {
        super(new Vector2(x, y));
        this.type  = type;   // 'weapon' | 'health' | 'money'
        this.data  = data;   // weapon key | heal amount | cash amount
        this.bobT  = Math.random() * Math.PI * 2;
        this.taken = false;
    }

    Start() {
        this._collider = new CircleCollider(Vector2.Zero(), 18, this);
        game.AddCollider(this._collider);
    }

    Update(dt) {
        super.Update(dt);
        this.bobT += dt * 2.5;
    }

    Draw(r) {
        if (this.taken) return;
        const x  = this._position.x;
        const y  = this._position.y + Math.sin(this.bobT) * 3;
        const sz = 16;

        let bg, label, labelColor;
        if (this.type === 'health') {
            bg = C_PICK_HP; label = '+'; labelColor = C_WHITE;
        } else if (this.type === 'money') {
            bg = C_PICK_COIN; label = '$'; labelColor = C_COIN_TEXT;
        } else {
            switch (this.data) {
                case 'MACHINEGUN': bg = C_PICK_MG;   label = 'MG'; break;
                case 'MISSILE':    bg = C_PICK_MSL;  label = 'M';  break;
                default:           bg = C_PICK_MINE; label = 'B';  break;
            }
            labelColor = C_BLACK;
        }

        r.DrawFillCircle(x, y, sz, bg);
        r.DrawStrokeCircle(x, y, sz, C_WHITE, 1.5);
        r.DrawFillText(label, x, y, 'bold 12px Arial', labelColor, 'center', 'middle');
    }

    OnCollisionEnter(mine, other) {
        if (this.taken) return;
        const go = other.go;
        if (go instanceof PlayerCar) {
            this.taken = true;
            this._collider.enabled = false;
            go.CollectPickup(this);
            game.Destroy(this);
        }
    }
}

// #endregion

// #region ---- PROJECTILE ----

class Projectile extends GameObject {
    constructor(x, y, vx, vy, rotation, weaponKey, owner) {
        super(new Vector2(x, y));
        this.vel       = new Vector2(vx, vy);
        this._rotation = rotation;
        this.weaponKey = weaponKey;
        this.owner     = owner;
        this.def       = WEAPON_DEFS[weaponKey];
        this.life      = weaponKey === 'MISSILE' ? 4.0 : 1.2;
    }

    Start() {
        this._collider = new CircleCollider(Vector2.Zero(), this.def.radius, this);
        game.AddCollider(this._collider);
    }

    Update(dt) {
        this._position.x += this.vel.x * dt;
        this._position.y += this.vel.y * dt;
        this.life -= dt;
        super.Update(dt);
        if (this.life <= 0 ||
            this._position.x < 0 || this._position.x > WORLD_W ||
            this._position.y < 0 || this._position.y > WORLD_H) {
            game.Destroy(this);
        }
    }

    Draw(r) {
        const x = this._position.x, y = this._position.y, rad = this.def.radius;
        r.DrawFillCircle(x, y, rad, this.def.color);
        if (this.weaponKey === 'MISSILE') {
            // exhaust trail behind missile
            const tx = x - Math.sin(this._rotation) * rad * 2.5;
            const ty = y + Math.cos(this._rotation) * rad * 2.5;
            r.DrawFillCircle(tx, ty, rad * 0.55, C_PICK_MSL);
        }
    }

    OnCollisionEnter(mine, other) {
        const go = other.go;
        if (!go || go === this.owner) return;
        if (go instanceof Car) {
            go.ApplyDamage(this.def.damage);
            game.SpawnExplosion(this._position.x, this._position.y, this.weaponKey === 'MISSILE');
            if (this.weaponKey === 'MISSILE') game.camera.Shake(0.4, 40, 7);
            game.Destroy(this);
        } else if (go instanceof Obstacle) {
            if (this.weaponKey === 'MISSILE') {
                game.SpawnExplosion(this._position.x, this._position.y, true);
                game.camera.Shake(0.3, 40, 5);
            }
            game.Destroy(this);
        }
    }
}

// #endregion

// #region ---- MINE ----

class Mine extends GameObject {
    constructor(x, y, owner) {
        super(new Vector2(x, y));
        this.owner  = owner;
        this.armed  = false;
        this.def    = WEAPON_DEFS.MINE;
        this.blinkT = 0;
    }

    Start() {
        this._collider = new CircleCollider(Vector2.Zero(), this.def.radius, this);
        this._collider.enabled = false;
        game.AddCollider(this._collider);
        this.Invoke(this.Arm, 1.2);
    }

    Arm() {
        this.armed = true;
        this._collider.enabled = true;
    }

    Update(dt) {
        super.Update(dt);
        this.blinkT += dt;
    }

    Draw(r) {
        const x = this._position.x, y = this._position.y, rad = this.def.radius;
        r.DrawFillCircle(x, y, rad, C_MINE_BODY);
        r.DrawStrokeCircle(x, y, rad, C_MINE_RIM, 2);
        if (this.armed && Math.sin(this.blinkT * 7) > 0) {
            r.DrawFillCircle(x, y, rad * 0.35, C_MINE_LED);
        }
    }

    OnCollisionEnter(mine, other) {
        if (!this.armed) return;
        const go = other.go;
        if (go instanceof Car && go !== this.owner) {
            go.ApplyDamage(this.def.damage);
            game.SpawnExplosion(this._position.x, this._position.y, true);
            game.camera.Shake(0.45, 38, 8);
            game.Destroy(this);
        }
    }
}

// #endregion

// #region ---- CAR ----

class Car extends GameObject {
    constructor(position, vehicleKey) {
        super(position);
        this.vehicleKey = vehicleKey;
        this.def        = VEHICLE_DEFS[vehicleKey];

        this.isRacer   = true;       // tag used by CheckpointZone (avoids instanceof Car)
        this.velocity  = Vector2.Zero();
        this.health    = this.def.health;
        this.maxHealth = this.def.health;

        this.currentWeapon  = 'NONE';
        this.ammo           = 0;
        this.fireCooldown   = 0;

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

    /** Forward unit vector in Y-down canvas space (rotation=0 → pointing up) */
    get heading() {
        return new Vector2(Math.sin(this._rotation), -Math.cos(this._rotation));
    }

    /**
     * Core arcade car physics.
     * @param {number} dt
     * @param {number} throttle  -1 … 1  (negative = brake / reverse)
     * @param {number} steer     -1 … 1  (negative = left)
     */
    _updatePhysics(dt, throttle, steer) {
        const rot  = this._rotation;
        const fwdX = Math.sin(rot),   fwdY = -Math.cos(rot);
        const rtX  = Math.cos(rot),   rtY  =  Math.sin(rot);

        // --- Lateral grip (drift simulation) ---
        // Decompose velocity into forward + lateral components.
        // Lateral component decays exponentially; rate depends on surface + vehicle.
        const vFwd = this.velocity.x * fwdX + this.velocity.y * fwdY;
        const vLat = this.velocity.x * rtX  + this.velocity.y * rtY;

        const grip    = this.surfaceType.lateralFriction * this.def.lateralFrictionMult;
        const newVLat = vLat * Math.pow(1 - grip, dt);   // Math.pow(X, dt) = frame-rate-independent decay

        this.velocity.x = vFwd * fwdX + newVLat * rtX;
        this.velocity.y = vFwd * fwdY + newVLat * rtY;

        // --- Thrust ---
        if (throttle !== 0) {
            const accel = throttle > 0 ? this.def.acceleration : this.def.braking;
            this.velocity.x += fwdX * throttle * accel * dt;
            this.velocity.y += fwdY * throttle * accel * dt;
        }

        // --- Speed cap (forward and reverse) ---
        const topSpd = this.def.topSpeed * this.surfaceType.topSpeedMult;
        const curFwd = this.velocity.x * fwdX + this.velocity.y * fwdY;
        if (curFwd > topSpd) {
            const e = curFwd - topSpd;
            this.velocity.x -= fwdX * e;
            this.velocity.y -= fwdY * e;
        } else if (curFwd < -topSpd * 0.42) {
            const e = curFwd + topSpd * 0.42;
            this.velocity.x -= fwdX * e;
            this.velocity.y -= fwdY * e;
        }

        // --- Overall drag (exponential; stronger when coasting) ---
        const drag = throttle !== 0 ? Math.pow(0.92, dt) : Math.pow(0.12, dt);
        this.velocity.x *= drag;
        this.velocity.y *= drag;

        // --- Steering (speed-sensitive; minimal rotation when nearly stopped) ---
        const steerFactor = Clamp(this.speed / 40, 0.1, 1.0);
        this._rotation   += steer * this.def.steerSpeed * steerFactor * dt;

        // --- Move ---
        this._position.x += this.velocity.x * dt;
        this._position.y += this.velocity.y * dt;

        // --- World boundary clamp + bounce ---
        const margin = Math.max(this.def.width, this.def.height) * 0.5 + 2;
        if (this._position.x < margin) {
            this._position.x = margin;
            if (this.velocity.x < 0) this.velocity.x *= -0.25;
        } else if (this._position.x > WORLD_W - margin) {
            this._position.x = WORLD_W - margin;
            if (this.velocity.x > 0) this.velocity.x *= -0.25;
        }
        if (this._position.y < margin) {
            this._position.y = margin;
            if (this.velocity.y < 0) this.velocity.y *= -0.25;
        } else if (this._position.y > WORLD_H - margin) {
            this._position.y = WORLD_H - margin;
            if (this.velocity.y > 0) this.velocity.y *= -0.25;
        }
    }

    Update(dt) {
        if (this.collisionCooldown > 0) this.collisionCooldown -= dt;
        if (this.fireCooldown     > 0) this.fireCooldown     -= dt;
        if (this.hitFlash         > 0) this.hitFlash         -= dt;
        this.surfaceType = game.GetSurfaceAt(this._position.x, this._position.y);
        super.Update(dt);  // syncs collider position
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

    ApplyDamage(amount) {
        if (this.isDead) return;
        this.health   = Math.max(0, this.health - amount);
        this.hitFlash = 0.15;
        if (this.health <= 0) {
            this.isDead = true;
            this.OnDeath();
        }
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
            const dx   = go._position.x - this._position.x;
            const dy   = go._position.y - this._position.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx   = dx / dist, ny = dy / dist;

            const relVx = this.velocity.x - go.velocity.x;
            const relVy = this.velocity.y - go.velocity.y;
            const impact = relVx * nx + relVy * ny;

            if (impact > 20) {
                const totalMass = this.def.mass + go.def.mass;
                const impulse   = 1.6 * impact / totalMass;
                this.velocity.x -= nx * impulse * go.def.mass;
                this.velocity.y -= ny * impulse * go.def.mass;
                const dmg = Math.max(0, impact * 0.07 - 2);
                if (dmg > 0) this.ApplyDamage(dmg);
            }
            this.collisionCooldown = 0.3;

        } else if (go instanceof Obstacle && this.collisionCooldown <= 0) {
            const spd = this.speed;
            const dx   = this._position.x - go._position.x;
            const dy   = this._position.y - go._position.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx   = dx / dist, ny = dy / dist;
            const dot  = this.velocity.x * nx + this.velocity.y * ny;
            if (dot < 0) {
                this.velocity.x -= 1.6 * dot * nx;
                this.velocity.y -= 1.6 * dot * ny;
            }
            this._position.x += nx * 6;
            this._position.y += ny * 6;
            if (spd > 60) this.ApplyDamage((spd - 60) * 0.04);
            this.collisionCooldown = 0.25;
        }
    }

    Draw(r) {
        const x   = this._position.x, y = this._position.y;
        const w   = this.def.width,   h = this.def.height;
        const rot = this._rotation;

        const bodyColor = this.isDead       ? C_DARKROAD
                        : this.hitFlash > 0 ? C_WHITE
                        : this.def.color;

        // Direction vectors in world space
        const fwdX = Math.sin(rot), fwdY = -Math.cos(rot);
        const rtX  = Math.cos(rot), rtY  =  Math.sin(rot);

        // Car body — default pivot {0,0} centers the rect on (x,y)
        r.DrawFillRectangle(x, y, w, h, bodyColor, rot);

        // Windshield strip near the front (centered on its own position)
        r.DrawFillRectangle(
            x + fwdX * h * 0.26,
            y + fwdY * h * 0.26,
            w * 0.70, h * 0.20, C_HALFBLACK, rot
        );

        if (!this.isDead) {
            // Headlights at front corners
            const fd = h * 0.44, sd = w * 0.30;
            r.DrawFillCircle(x + fwdX*fd + rtX*sd, y + fwdY*fd + rtY*sd, 3, C_HEADLIGHT);
            r.DrawFillCircle(x + fwdX*fd - rtX*sd, y + fwdY*fd - rtY*sd, 3, C_HEADLIGHT);
        }

        // World-space health bar (axis-aligned, 11 px above top edge)
        const bW  = w + 8, bH = 5;
        const bX  = x - bW * 0.5, bY = y - h * 0.5 - 11;
        const hpF = this.health / this.maxHealth;
        r.DrawFillBasicRectangle(bX, bY, bW, bH, C_HP_BG);
        r.DrawFillBasicRectangle(bX, bY, bW * hpF, bH,
            hpF > 0.5 ? C_HP_HIGH : (hpF > 0.25 ? C_HP_MED : C_HP_LOW));
    }
}

// #endregion

// #region ---- PLAYER CAR ----

class PlayerCar extends Car {
    constructor(position, vehicleKey) {
        super(position, vehicleKey);
        this.money         = 0;
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
            case 'weapon': this.EquipWeapon(pickup.data); break;
            case 'health': this.Heal(pickup.data);        break;
            case 'money':  this.money += pickup.data;     break;
        }
        game.ShowPickupMessage(pickup);
    }

    /** Swap vehicle type at runtime (from debug menu). Preserves HP ratio. */
    SwapVehicle(vehicleKey) {
        const ratio       = this.health / this.maxHealth;
        this.vehicleKey   = vehicleKey;
        this.def          = VEHICLE_DEFS[vehicleKey];
        this.maxHealth    = this.def.health;
        this.health       = Math.ceil(this.def.health * ratio);
        this.isDead       = false;
        game.RemoveCollider(this._collider);
        this._collider = new CircleCollider(
            Vector2.Zero(),
            Math.max(this.def.width, this.def.height) * 0.45,
            this
        );
        game.AddCollider(this._collider);
    }
}

// #endregion

// #region ---- ENEMY CAR ----

class EnemyCar extends Car {
    /**
     * @param {Vector2} position
     * @param {string}  vehicleKey
     * @param {number}  wpStartIndex  - Starting waypoint index; stagger enemies around the circuit
     */
    constructor(position, vehicleKey, wpStartIndex = 0) {
        super(position, vehicleKey);
        this.aiTarget   = null;
        this.wpIndex    = wpStartIndex;
        this.shootTimer = RandomBetweenFloat(1.0, 2.5);
    }

    Update(dt) {
        if (!this.isDead) {
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
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxRange) return;

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

// #region ---- EXPLOSION ----

class Explosion extends GameObject {
    constructor(x, y, large) {
        super(new Vector2(x, y));
        const count = large ? 12 : 6;
        this.sparks = [];
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = RandomBetweenFloat(50, large ? 280 : 130);
            this.sparks.push({
                x, y,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                r:  RandomBetweenFloat(2, large ? 10 : 6),
                life: 1.0,
            });
        }
    }

    Update(dt) {
        let alive = false;
        for (const s of this.sparks) {
            if (s.life > 0) {
                alive = true;
                s.x  += s.vx * dt;
                s.y  += s.vy * dt;
                s.vx *= Math.pow(0.15, dt);
                s.vy *= Math.pow(0.15, dt);
                s.life -= dt * 1.6;
            }
        }
        if (!alive) game.Destroy(this);
    }

    Draw(r) {
        for (const s of this.sparks) {
            if (s.life > 0) {
                const a = Clamp(s.life, 0, 1);
                r.DrawFillCircle(s.x, s.y, s.r * a, new Color(1, Math.min(1, s.life * 1.6), 0, a));
            }
        }
    }
}

// #endregion

// #region ---- DEATH RALLY GAME ----

class DeathRallyGame extends Game {
    constructor(r) {
        super(r);
        this.Configure({ screenWidth: SCREEN_W, screenHeight: SCREEN_H, imageSmoothingEnabled: false });

        // ── Option B (Tiled) ────────────────────────────────────────────
        // Uncomment the block below to load the circuit from a Tiled .tmj
        // file instead of the inline PLAYGROUND_CIRCUIT definition.
        // The .tmj must be exported from Tiled with:
        //   • Tile Layer Format: CSV
        //   • Embed tilesets: checked
        //   • Object layers: checkpoints, waypoints, spawns (see circuit.js)
        // ──────────────────────────────────────────────────────────────
        // this.tiledAssets = {
        //     circuit: { path: 'src/examples/death_rally/circuits/playground.tmj', data: null }
        // };
    }

    Start() {
        super.Start();

        Input.RegisterAxis('throttle', [
            { type:'key', positive:KEY_UP,    negative:KEY_DOWN },
            { type:'key', positive:KEY_W,     negative:KEY_S    },
        ]);
        Input.RegisterAxis('steer', [
            { type:'key', positive:KEY_RIGHT, negative:KEY_LEFT },
            { type:'key', positive:KEY_D,     negative:KEY_A    },
        ]);
        Input.RegisterAction('fire', [
            { type:'key', code:KEY_SPACE }, { type:'key', code:KEY_LCTRL },
        ]);
        Input.RegisterAction('debugToggle', [
            { type:'key', code:KEY_TAB },
        ]);

        // Race system
        this.raceManager = new RaceManager();

        // ── Option B: Tiled (if tiledAssets.circuit was declared and loaded)
        // ── Option A: inline fallback (PLAYGROUND_CIRCUIT in circuits/playground.js)
        const circuitData = (this.tiledAssets?.circuit?.data)
            ? CircuitLoader.FromTiled(this.tiledAssets.circuit.data, DR_TILE_TO_SURFACE)
            : CircuitLoader.FromInline(PLAYGROUND_CIRCUIT);

        this._loadCircuit(circuitData);
        this._setupHUD();

        this.timer        = 0;
        this.msgText      = '';
        this.msgTimer     = 0;
        this.debugVisible = false;
    }

    // ---- Circuit loading ----

    /**
     * Builds the scene from a normalised CircuitData object:
     * spawns checkpoint triggers, obstacles, pickups, and cars;
     * creates the camera; starts the race countdown.
     */
    _loadCircuit(circuitData) {
        this.raceManager.LoadCircuit(circuitData);

        // Checkpoint triggers (invisible; visible in debug mode)
        for (const cp of circuitData.checkpoints) {
            this.AddGameObject(new CheckpointZone(cp));
        }

        // Static obstacles
        for (const ob of circuitData.obstacles) {
            this.AddGameObject(new Obstacle(ob.cx, ob.cy, ob.w, ob.h, ob.color ?? C_WALL, ob.isBarrel ?? false));
        }

        // Pickups
        for (const pk of circuitData.pickups) {
            this.AddGameObject(new Pickup(pk.x, pk.y, pk.type, pk.data));
        }

        // Player car — spawn slot 0
        const s0 = circuitData.spawns[0];
        this.playerCar = this.AddGameObject(new PlayerCar(new Vector2(s0.x, s0.y), 'SPORTS'));
        this.playerCar._rotation = s0.rotation;
        this.raceManager.RegisterCar(this.playerCar);

        // Enemy cars — slots 1, 2; staggered across the waypoint list
        this.enemies = [];
        const enemyDefs = [
            { slotIdx:1, vehicleKey:'MUSCLE', wpStart: 4 },
            { slotIdx:2, vehicleKey:'BUGGY',  wpStart: 8 },
        ];
        for (const ed of enemyDefs) {
            const s = circuitData.spawns[Math.min(ed.slotIdx, circuitData.spawns.length - 1)];
            const e = this._addEnemy(new Vector2(s.x, s.y), ed.vehicleKey, ed.wpStart);
            e._rotation = s.rotation;
        }

        // Camera
        this.camera = new FollowCamera(
            Vector2.Zero(), this.playerCar,
            0, WORLD_W - SCREEN_W,
            0, WORLD_H - SCREEN_H,
            6
        );
        this.camera.Start();

        this.raceManager.StartRace();
    }

    _setupHUD() {
        this.hud = new HTMLMenu(this, '#hud', '#canvasContainer', canvas, true, false);
        this.hud.Start();
        this.hud.SetupElements([
            '#hud-hp-fill', '#hud-weapon-name', '#hud-ammo',
            '#hud-money', '#hud-surface', '#hud-speed', '#hud-time',
            '#hud-lap', '#hud-position',
        ]);

        this.debugMenu = new HTMLMenu(this, '#debug-overlay', '#canvasContainer', canvas, true, false);
        this.debugMenu.Start();
        this.debugMenu.SetupButtons([
            { selector:'#dbg-sports',    callback: () => this.playerCar.SwapVehicle('SPORTS')                                         },
            { selector:'#dbg-muscle',    callback: () => this.playerCar.SwapVehicle('MUSCLE')                                         },
            { selector:'#dbg-truck',     callback: () => this.playerCar.SwapVehicle('TRUCK')                                          },
            { selector:'#dbg-buggy',     callback: () => this.playerCar.SwapVehicle('BUGGY')                                          },
            { selector:'#dbg-give-mg',   callback: () => this.playerCar.EquipWeapon('MACHINEGUN')                                     },
            { selector:'#dbg-give-msl',  callback: () => this.playerCar.EquipWeapon('MISSILE')                                        },
            { selector:'#dbg-give-mine', callback: () => this.playerCar.EquipWeapon('MINE')                                           },
            { selector:'#dbg-heal',      callback: () => { this.playerCar.health = this.playerCar.maxHealth; this.playerCar.isDead = false; } },
            { selector:'#dbg-money',     callback: () => this.playerCar.money += 500                                                  },
            { selector:'#dbg-spawn',     callback: () => this._spawnRandomEnemy()                                                     },
            { selector:'#dbg-restart',   callback: () => this.raceManager.RestartRace()                                               },
            { selector:'#dbg-colliders', callback: () => { this.config.drawColliders = !this.config.drawColliders; }                  },
            { selector:'#dbg-debug',     callback: () => { debugMode = !debugMode; }                                                  },
        ]);
        document.getElementById('debug-overlay').style.display = 'none';
    }

    // ---- Enemy helpers ----

    _addEnemy(pos, vehicleKey, wpStartIndex = 0) {
        const e = this.AddGameObject(new EnemyCar(pos, vehicleKey, wpStartIndex));
        e.aiTarget = this.playerCar;
        e.EquipWeapon('MACHINEGUN');
        this.raceManager.RegisterCar(e);
        this.enemies.push(e);
        return e;
    }

    _spawnRandomEnemy() {
        const keys = ['SPORTS','MUSCLE','TRUCK','BUGGY'];
        const wps  = this.raceManager?.circuit?.waypoints;
        this._addEnemy(
            new Vector2(RandomBetweenFloat(200, WORLD_W - 200), RandomBetweenFloat(200, WORLD_H - 200)),
            keys[RandomBetweenInt(0, keys.length - 1)],
            wps ? RandomBetweenInt(0, wps.length - 1) : 0
        );
    }

    // ---- Queries ----

    GetSurfaceAt(x, y) {
        const zones = this.raceManager?.circuit?.surfaceZones ?? [];
        for (let i = zones.length - 1; i >= 0; i--) {
            const z = zones[i];
            if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z.surface;
        }
        return SURFACE.GRASS;
    }

    SpawnExplosion(x, y, large) { this.AddGameObject(new Explosion(x, y, large)); }

    ShowPickupMessage(pickup) {
        if (pickup.type === 'weapon')      this.msgText = `+ ${WEAPON_DEFS[pickup.data].name}`;
        else if (pickup.type === 'health') this.msgText = `+ ${pickup.data} HP`;
        else                              this.msgText = `+ $${pickup.data}`;
        this.msgTimer = 2.0;
    }

    // ---- Update ----

    Update(dt) {
        super.Update(dt);
        this.timer += dt;
        if (this.msgTimer > 0) this.msgTimer -= dt;

        this.raceManager.Update(dt);
        this.camera.Update(dt);

        // Lock / unlock player input based on countdown state
        this.playerCar.inputDisabled = this.raceManager.inputLocked;

        // Detect player finishing
        if (this.raceManager.state === RACE_STATE.RACING) {
            const prog = this.raceManager.progress.get(this.playerCar);
            if (prog?.finished) this.raceManager.state = RACE_STATE.RESULTS;
        }

        if (Input.GetActionDown('debugToggle')) {
            this.debugVisible = !this.debugVisible;
            document.getElementById('debug-overlay').style.display = this.debugVisible ? 'block' : 'none';
        }

        this._updateHUD();
    }

    _updateHUD() {
        const p    = this.playerCar;
        const rm   = this.raceManager;
        const prog = rm.progress.get(p);

        const fill = document.getElementById('hud-hp-fill');
        if (fill) {
            const pct = (p.health / p.maxHealth) * 100;
            fill.style.width      = pct + '%';
            fill.style.background = pct > 50 ? '#4caf50' : (pct > 25 ? '#ff9800' : '#f44336');
        }

        const wName = document.getElementById('hud-weapon-name');
        if (wName) wName.textContent = WEAPON_DEFS[p.currentWeapon].name;

        const ammoEl = document.getElementById('hud-ammo');
        if (ammoEl) ammoEl.textContent = p.ammo > 0 ? '\u00d7' + p.ammo : '';

        const moneyEl = document.getElementById('hud-money');
        if (moneyEl) moneyEl.textContent = '$' + p.money;

        const surfEl = document.getElementById('hud-surface');
        if (surfEl) surfEl.textContent = p.surfaceType?.name ?? '';

        const spdEl = document.getElementById('hud-speed');
        if (spdEl) spdEl.textContent = Math.round(p.speed * 0.1) + ' km/h';

        const timeEl = document.getElementById('hud-time');
        if (timeEl) {
            const m = Math.floor(this.timer / 60);
            const s = Math.floor(this.timer % 60).toString().padStart(2, '0');
            timeEl.textContent = `${m}:${s}`;
        }

        const lapEl = document.getElementById('hud-lap');
        if (lapEl && prog) {
            const lap = Math.min(prog.currentLap + 1, rm.circuit.laps);
            lapEl.textContent = rm.state === RACE_STATE.RESULTS
                ? 'Finished!'
                : `Lap ${lap} / ${rm.circuit.laps}`;
        }

        const posEl = document.getElementById('hud-position');
        if (posEl && rm.state === RACE_STATE.RACING) {
            const idx = rm.GetPositions().findIndex(e => e.car === p);
            posEl.textContent = idx !== -1 ? `P${idx + 1}` : '';
        } else if (posEl && rm.state !== RACE_STATE.RACING) {
            posEl.textContent = '';
        }
    }

    // ---- Draw ----

    Draw() {
        this.camera.PreDraw(renderer);

        // World background
        renderer.DrawFillBasicRectangle(0, 0, WORLD_W, WORLD_H, SURFACE.GRASS.color);

        // Surface zones from circuit
        const zones = this.raceManager?.circuit?.surfaceZones ?? [];
        for (const z of zones) {
            renderer.DrawFillBasicRectangle(z.x, z.y, z.w, z.h, z.surface.color);
        }

        // S/F checkered line (always visible)
        this._drawStartFinishLine();

        // Debug overlays: waypoints + zone labels
        if (debugMode) {
            this._drawDebugWaypoints();
            renderer.DrawFillText('ASPHALT', 900, 480, '11px Arial', new Color(1,1,1,0.3), 'center');
            renderer.DrawFillText('GRAVEL',  160, 280, '11px Arial', new Color(1,1,1,0.3), 'center');
            renderer.DrawFillText('GRAVEL', 1870, 280, '11px Arial', new Color(1,1,1,0.3), 'center');
            renderer.DrawFillText('DIRT',     80, 920, '11px Arial', new Color(1,1,1,0.3), 'center');
            renderer.DrawFillText('DIRT',   1960, 920, '11px Arial', new Color(1,1,1,0.3), 'center');
        }

        // Game objects
        super.Draw();

        this.camera.PostDraw(renderer);
        this._drawScreenOverlay();
    }

    _drawStartFinishLine() {
        const sf = this.raceManager?.circuit?.checkpoints?.[0];
        if (!sf) return;
        const squareW = 22, squareH = sf.h;
        const count   = Math.ceil(sf.w / squareW);
        for (let i = 0; i < count; i++) {
            renderer.DrawFillBasicRectangle(
                sf.x - sf.w * 0.5 + i * squareW,
                sf.y - sf.h * 0.5,
                squareW, squareH,
                i % 2 === 0 ? C_WHITE : C_BLACK
            );
        }
    }

    _drawDebugWaypoints() {
        const wps = this.raceManager?.circuit?.waypoints;
        if (!wps) return;
        const col  = new Color(1, 0.6, 0, 0.7);
        const line = new Color(1, 0.6, 0, 0.25);
        for (let i = 0; i < wps.length; i++) {
            const a = wps[i], b = wps[(i + 1) % wps.length];
            renderer.DrawLine(a.x, a.y, b.x, b.y, line, 2);
            renderer.DrawFillCircle(a.x, a.y, 7, col);
            renderer.DrawFillText(String(i), a.x, a.y - 13, '10px Arial', C_WHITE, 'center');
        }
    }

    _drawScreenOverlay() {
        // Pickup message
        if (this.msgTimer > 0) {
            const a = Math.min(1.0, this.msgTimer);
            renderer.DrawFillText(this.msgText, SCREEN_W / 2, SCREEN_H / 2 - 70,
                'bold 22px Arial', new Color(1, 1, 0, a), 'center');
        }

        // Race countdown
        const rm = this.raceManager;
        if (rm.state === RACE_STATE.GRID) {
            const step = rm.countdownStep;
            const text = step > 0 ? String(step) : 'GO!';
            const col  = step > 0
                ? new Color(1, 0.25, 0.2, 1)
                : new Color(0.2, 1, 0.3, 1);
            // Pulse: larger at the start of each beat
            const pulse = 1 + Clamp(rm.countdownTimer - 0.5, 0, 0.5) * 0.6;
            renderer.DrawFillText(text, SCREEN_W / 2, SCREEN_H / 2,
                `bold ${Math.round(90 * pulse)}px Arial`, col, 'center', 'middle');
        }

        // Race results screen
        if (rm.state === RACE_STATE.RESULTS) {
            const positions = rm.GetPositions();
            const playerIdx = positions.findIndex(e => e.car === this.playerCar);
            const prog      = rm.progress.get(this.playerCar);
            renderer.DrawFillText('RACE FINISHED', SCREEN_W / 2, SCREEN_H / 2 - 60,
                'bold 42px Arial', Color.FromRGB(255,220,50), 'center', 'middle');
            renderer.DrawFillText(`Your position: P${playerIdx + 1}`, SCREEN_W / 2, SCREEN_H / 2,
                'bold 26px Arial', C_WHITE, 'center', 'middle');
            if (prog?.bestLapTime > 0) {
                renderer.DrawFillText(`Best lap: ${prog.bestLapTime.toFixed(2)} s`, SCREEN_W / 2, SCREEN_H / 2 + 38,
                    '18px Arial', new Color(0.8, 0.8, 0.8, 1), 'center', 'middle');
            }
            renderer.DrawFillText('Tab → Debug → Restart Race', SCREEN_W / 2, SCREEN_H / 2 + 72,
                '14px Arial', new Color(0.7, 0.7, 0.7, 0.8), 'center', 'middle');
        }

        // Wrecked notice
        if (this.playerCar.isDead && rm.state === RACE_STATE.RACING) {
            renderer.DrawFillText('WRECKED', SCREEN_W / 2, SCREEN_H / 2,
                'bold 52px Arial', C_WRECKED, 'center');
            renderer.DrawFillText('Tab → Debug → Heal to respawn',
                SCREEN_W / 2, SCREEN_H / 2 + 48, '15px Arial', new Color(1,0.6,0.6,0.9), 'center');
        }

        // Controls hint (first 6 s)
        if (this.timer < 6) {
            const a = Clamp(6 - this.timer, 0, 1);
            renderer.DrawFillText(
                'W/S \u2191\u2193 = Throttle   A/D \u2190\u2192 = Steer   Space = Fire   Tab = Debug',
                SCREEN_W / 2, SCREEN_H - 20, '13px Arial', new Color(1,1,1,a), 'center');
        }
    }
}

// #endregion

window.onload = () => { Init(DeathRallyGame); };
