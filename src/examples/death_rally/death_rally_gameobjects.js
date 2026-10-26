// =====================================================================
// Death Rally — Non-car game objects
// Globals: Obstacle, Pickup, Projectile, Mine, Explosion
// Requires: death_rally_defs.js, utils_classes.js, gameobjects.js
// =====================================================================

// #region ---- OBSTACLE ----

class Obstacle extends GameObject {
    /**
     * @param {number}  cx
     * @param {number}  cy
     * @param {number}  w        Width (or diameter for barrels)
     * @param {number}  h        Height
     * @param {Color}   [color]
     * @param {boolean} [isBarrel=false]
     * @param {number}  [rotation=0]  Rotation in radians. Non-zero → PolygonCollider.
     */
    constructor(cx, cy, w, h, color = C_WALL, isBarrel = false, rotation = 0) {
        super(new Vector2(cx, cy));
        this.w        = w;
        this.h        = h;
        this.color    = color;
        this.isBarrel = isBarrel;
        this._rotation = rotation;
    }

    Start() {
        if (this.isBarrel) {
            this._collider = new CircleCollider(Vector2.Zero(), this.w * 0.5, this);
        }
        else if (this._rotation !== 0) {
            // Rotated rectangle — use PolygonCollider so the hitbox matches the visual
            const hw = this.w * 0.5, hh = this.h * 0.5;
            const pts = [
                new Vector2(-hw, -hh), new Vector2( hw, -hh),
                new Vector2( hw,  hh), new Vector2(-hw,  hh),
            ];
            this._collider = new PolygonCollider(Vector2.Zero(), this._rotation, pts, this);
        }
        else {
            this._collider = new RectangleCollider(Vector2.Zero(), this.w, this.h, this);
        }
        game.AddCollider(this._collider);
    }

    Draw(r) {
        const x = this._position.x, y = this._position.y;
        if (this.isBarrel) {
            r.DrawFillCircle(x, y, this.w * 0.5, this.color);
            r.DrawStrokeCircle(x, y, this.w * 0.5, C_DARKROAD, 2);
            r.DrawStrokeCircle(x, y, this.w * 0.22, C_DARKROAD, 1.5);
        }
        else {
            r.DrawFillRectangle(x, y, this.w, this.h, this.color, this._rotation);
        }
    }
}

// #endregion

// #region ---- PICKUP ----

class Pickup extends SpriteObject {
    constructor(x, y, type, data, img) {
        super(new Vector2(x, y), 0, 0.4, img);
        this.type  = type;   // 'weapon' | 'health' | 'money'
        this.data  = data;
        this.bobT  = Math.random() * PI2;
        this.taken = false;
        this.spriteRect = null;
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
        if (this.taken)
            return;

        const x  = this._position.x;
        const y  = this._position.y + Math.sin(this.bobT) * 3;
        // const sz = 16;

        // let bg, label, labelColor;
        // if (this.type === 'health') {
        //     bg = C_PICK_HP;   label = '+'; labelColor = C_WHITE;
        // }
        // else if (this.type === 'money') {
        //     bg = C_PICK_COIN; label = '$'; labelColor = C_COIN_TEXT;
        // }
        // else {
        //     switch (this.data) {
        //         case 'MACHINEGUN': bg = C_PICK_MG;   label = 'MG'; break;
        //         case 'MISSILE':    bg = C_PICK_MSL;  label = 'M';  break;
        //         default:           bg = C_PICK_MINE; label = 'B';  break;
        //     }
        //     labelColor = C_BLACK;
        // }

        // r.DrawFillCircle(x, y, sz, bg);
        // r.DrawStrokeCircle(x, y, sz, C_WHITE, 1.5);
        // r.DrawFillText(label, x, y, 'bold 12px Arial', labelColor, 'center', 'middle');

        this.sprite.DrawSectionAt(r, this.spriteRect.x, this.spriteRect.y, this.spriteRect.w, this.spriteRect.h, x, y);
    }

    // OnCollisionEnter(mine, other) {
    //     if (this.taken)
    //         return;

    //     const go = other.go;
    //     if (go instanceof PlayerCar) {
    //         this.taken = true;
    //         this._collider.enabled = false;
    //         go.CollectPickup(this);
    //         game.Destroy(this);
    //     }
    // }
}

class PickupMoney extends Pickup {
    constructor(x, y, quantity, img) {
        super(x, y, 'money', quantity, img);
        this.quantity = quantity;
    }

    Start() {
        super.Start();

        this.spriteRect = this.game.spriteAtlas.get('money');
    }

    OnCollisionEnter(mine, other) {
        if (this.taken)
            return;

        const go = other.go;
        if (go instanceof PlayerCar) {
            this.taken = true;
            this._collider.enabled = false;
            go.CollectMoney(this.quantity);
            this.game.Destroy(this);
        }
    }
}

class PickupHealth extends Pickup {
    constructor(x, y, quantity, img) {
        super(x, y, 'health', quantity, img);
        this.quantity = quantity;
    }

    Start() {
        super.Start();

        this.spriteRect = this.game.spriteAtlas.get('health');
    }

    OnCollisionEnter(mine, other) {
        if (this.taken)
            return;

        const go = other.go;
        if (go instanceof PlayerCar) {
            this.taken = true;
            this._collider.enabled = false;
            go.CollectHealth(this.quantity);
            this.game.Destroy(this);
        }
    }
}

class PickupWeapon extends Pickup {
    constructor(x, y, img, weaponType) {
        super(x, y, 'weapon', weaponType, img);
        this.weaponType = weaponType;
    }

    Start() {
        super.Start();

        this.spriteRect = this.game.spriteAtlas.get(this.weaponType);
    }

    OnCollisionEnter(mine, other) {
        if (this.taken)
            return;

        const go = other.go;
        if (go instanceof PlayerCar) {
            this.taken = true;
            this._collider.enabled = false;
            go.CollectWeapon(this.weaponType);
            this.game.Destroy(this);
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
        if (!go || go === this.owner)
            return;

        if (go instanceof Car) {
            go.ApplyDamage(this.def.damage, this.owner);
            game.SpawnExplosion(this._position.x, this._position.y, this.weaponKey === 'MISSILE');
            if (this.weaponKey === 'MISSILE')
                game.camera.Shake(0.4, 40, 7);

            game.Destroy(this);
        }
        else if (go instanceof Obstacle) {
            if (this.weaponKey === 'MISSILE') {
                game.SpawnExplosion(this._position.x, this._position.y, true);
                game.camera.Shake(0.3, 40, 5);
            }
            game.Destroy(this);
        }
    }
}

// #endregion


// #region ---- MISSILE ----

class Missile extends SpriteObject {
    constructor(x, y, vx, vy, rotation, owner, img) {
        super(new Vector2(x, y), Math.atan2(vy, vx) + 45 * degToRad, 0.25, img);

        this.vel   = new Vector2(vx, vy);
        this.owner = owner;
        this.def   = WEAPON_DEFS['MISSILE'];
        this.fuel  = 4.0;

        this.particleSystem = null;
        this.smokePosition  = Vector2.Zero();
        this.spriteRect     = null;

        // Flag to indicate that the missile has exploded; wait for the smoke to dissipate,
        // and then removed it from the game. 
        this.exploded = false; 
    }

    Start() {
        this._collider = new CircleCollider(Vector2.Zero(), this.def.radius, this);
        this.game.AddCollider(this._collider);

        this.particleSystem = new ParticleSystem(
            this.game.graphicAssets.smoke.img,
            missileSmokeConfig
        );
        this.spriteRect = this.game.spriteAtlas.get('MISSILE');
    }

    Update(dt) {
        if (!this.exploded) {
            this.position.Set(
                this._position.x + this.vel.x * dt,
                this._position.y + this.vel.y * dt
            );

            this.fuel -= dt;

            super.Update(dt);

            this.smokePosition.Set(
                this._position.x - Math.sin(this._rotation + 0.7853) * this.def.radius * 2.5,
                this._position.y + Math.cos(this._rotation + 0.7853) * this.def.radius * 2.5
            );
            this.particleSystem.SetPosition(this.smokePosition.x, this.smokePosition.y);

            if (this.fuel <= 0) {
                this.Explode();
            }
            else if (this._position.x < 0 || this._position.x > WORLD_W ||
                    this._position.y < 0 || this._position.y > WORLD_H) {
                this.exploded = true;
                this.particleSystem.active = false;

                this.Invoke(this.DeleteFronGame, 2.0);
            }
        }
        
        this.particleSystem.Update(dt);
    }

    Draw(r) {
        if (!this.exploded) {
            // const x = this._position.x, y = this._position.y, rad = this.def.radius;
            // r.DrawFillCircle(x, y, rad, this.def.color);
            
            // const tx = x - Math.sin(this._rotation + 0.7853) * rad * 2.5;
            // const ty = y + Math.cos(this._rotation + 0.7853) * rad * 2.5;
            // r.DrawFillCircle(tx, ty, rad * 0.55, C_PICK_MSL);

            this.DrawSection(r, this.spriteRect.x, this.spriteRect.y, this.spriteRect.w, this.spriteRect.h);
        }

        this.particleSystem.Draw(r);
    }

    OnCollisionEnter(mine, other) {
        const go = other.go;
        if (!go || go === this.owner || this.exploded)
            return;

        if (go instanceof Car) {
            go.ApplyDamage(this.def.damage, this.owner);
            this.Explode();
        }
        else if (go instanceof Obstacle) {
            this.Explode();
        }
    }

    Explode() {
        this.game.SpawnExplosion(this._position.x, this._position.y, true);
        this.game.camera.Shake(0.3, 40, 5);

        this.exploded = true;
        this.particleSystem.active = false;

        this.Invoke(this.DeleteFronGame, 2.0);
    }

    DeleteFronGame() {
        this.game.Destroy(this);
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
            go.ApplyDamage(this.def.damage, this.owner);
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
