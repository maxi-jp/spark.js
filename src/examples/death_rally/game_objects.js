// =====================================================================
// Death Rally — Non-car game objects
// Globals: Obstacle, Pickup, Projectile, Mine, Explosion
// Requires: death_rally_defs.js, utils_classes.js, gameobjects.js
// =====================================================================

// #region ---- OBSTACLE ----

class Obstacle extends GameObject {
    /**
     * @param {number}  cx       Centre X in world space
     * @param {number}  cy       Centre Y
     * @param {number}  w        Width (or diameter for barrels)
     * @param {number}  h        Height
     * @param {Color}   [color]
     * @param {boolean} [isBarrel=false]  Circle collider + round visual
     */
    constructor(cx, cy, w, h, color = C_WALL, isBarrel = false) {
        super(new Vector2(cx, cy));
        this.w        = w;
        this.h        = h;
        this.color    = color;
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
        this.data  = data;
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
            bg = C_PICK_HP;   label = '+'; labelColor = C_WHITE;
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
