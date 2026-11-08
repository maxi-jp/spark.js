// #region Run-and-Gun Weapons, Projectiles & Powerups

const WEAPON_DATA = {
    RIFLE: {
        id: 'R',
        name: 'ASSAULT RIFLE',
        fireRate: 0.15,
        speed: 880,
        damage: 12,
        color: '#ffd166',
        ammo: Infinity
    },
    SPREAD: {
        id: 'S',
        name: 'SPREAD GUN',
        fireRate: 0.25,
        speed: 760,
        damage: 10,
        spreadCount: 5,
        spreadSpread: 0.18,
        color: '#06d6a0',
        ammo: 150
    },
    LASER: {
        id: 'L',
        name: 'LASER BEAM',
        fireRate: 0.15,
        speed: 1150,
        damage: 24,
        pierce: true,
        color: '#00b4d8',
        ammo: 100
    },
    MACHINE: {
        id: 'M',
        name: 'HEAVY MACHINE GUN',
        fireRate: 0.08,
        speed: 950,
        damage: 12,
        spreadJitter: 0.07,
        color: '#ffaa00',
        ammo: 250
    },
    ROCKET: {
        id: 'G',
        name: 'GRENADE LAUNCHER',
        fireRate: 0.36,
        speed: 620,
        damage: 42,
        blastRadius: 80,
        color: '#9d4edd',
        ammo: 50
    }
};

// ── PLAYER BULLET ─────────────────────────────────────────────
class PlayerBullet {
    constructor() {
        this.position = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);
        this.active = false;
        this.radius = 8;
        this.damage = 10;
        this.lifeTime = 0;
        this.maxLifeTime = 2.0;
        this.type = 'RIFLE';
        this.pierce = false;
        this.piercedTargets = new Set();
        this.isRocket = false;
        this.blastRadius = 0;
        this.rotation = 0;
        this.owner = null;
        this.game = null;
    }

    Spawn(x, y, dir, speed, damage, type, pierce = false, blastRadius = 0) {
        this.position.Set(x, y);
        this.velocity.Set(dir.x * speed, dir.y * speed);
        this.damage = damage;
        this.type = type;
        this.pierce = pierce;
        this.piercedTargets.clear();
        this.isRocket = (type === 'G');
        this.blastRadius = blastRadius;
        this.lifeTime = 0;
        this.active = true;
        this.radius = this.isRocket ? 12 : (type === 'L' ? 10 : (type === 'S' ? 9 : 7));
        this.rotation = Math.atan2(dir.y, dir.x);
    }

    Update(deltaTime) {
        if (!this.active) return;

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.lifeTime += deltaTime;

        // Rocket smoke trail
        if (this.isRocket && this.game && Math.random() < 0.45) {
            this.game.SpawnSmoke(this.position.x - this.velocity.x * 0.02, this.position.y - this.velocity.y * 0.02, 0.5);
        }

        if (this.lifeTime >= this.maxLifeTime) {
            this.active = false;
        }
    }

    Draw(renderer) {
        if (!this.active) return;

        const img = (this.type === 'S') ? ArcadeSprites.bullets.spread :
                    (this.type === 'L') ? ArcadeSprites.bullets.laser :
                    (this.type === 'G') ? ArcadeSprites.bullets.rocket :
                    (this.type === 'M') ? ArcadeSprites.bullets.rifle :
                    ArcadeSprites.bullets.rifle;

        if (img) {
            renderer.DrawImage(img, this.position.x, this.position.y, 1, 1, this.rotation);
        } else {
            renderer.DrawFillCircle(this.position.x, this.position.y, this.radius, Color.yellow);
        }
    }

    Deactivate(spawnImpact = true) {
        this.active = false;
        if (spawnImpact && this.game) {
            if (this.isRocket) {
                this.game.TriggerExplosion(this.position.x, this.position.y, this.blastRadius, this.damage);
            } else {
                this.game.SpawnSpark(this.position.x, this.position.y, 6);
            }
        }
    }
}

// ── ENEMY BULLET ──────────────────────────────────────────────
class EnemyBullet {
    constructor() {
        this.position = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);
        this.active = false;
        this.radius = 8;
        this.damage = 1;
        this.lifeTime = 0;
        this.maxLifeTime = 3.5;
        this.owner = null;
        this.game = null;
    }

    Spawn(x, y, dir, speed, damage = 1) {
        this.position.Set(x, y);
        this.velocity.Set(dir.x * speed, dir.y * speed);
        this.damage = damage;
        this.lifeTime = 0;
        this.active = true;
    }

    Update(deltaTime) {
        if (!this.active) return;
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.lifeTime += deltaTime;

        if (this.lifeTime >= this.maxLifeTime) {
            this.active = false;
        }
    }

    Draw(renderer) {
        if (!this.active) return;
        if (ArcadeSprites.bullets.enemy) {
            renderer.DrawImage(ArcadeSprites.bullets.enemy, this.position.x, this.position.y, 1, 1, 0);
        } else {
            renderer.DrawFillCircle(this.position.x, this.position.y, 8, Color.red);
        }
    }

    Deactivate() {
        this.active = false;
        if (this.game) {
            this.game.SpawnSpark(this.position.x, this.position.y, 5, '#ff2233');
        }
    }
}

// ── BOSS MORTAR SHELL ─────────────────────────────────────────
class BossMortarShell {
    constructor() {
        this.position = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);
        this.gravity = 650;
        this.active = false;
        this.radius = 11;
        this.damage = 1;
        this.groundY = 600;
        this.owner = null;
        this.game = null;
    }

    Spawn(x, y, vx, vy, groundY = 600) {
        this.position.Set(x, y);
        this.velocity.Set(vx, vy);
        this.groundY = groundY;
        this.active = true;
    }

    Update(deltaTime) {
        if (!this.active) return;
        this.velocity.y += this.gravity * deltaTime;
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Smoke trail
        if (this.game && Math.random() < 0.35) {
            this.game.SpawnSmoke(this.position.x, this.position.y, 0.6);
        }

        // Hit ground or platforms
        if (this.position.y >= this.groundY) {
            this.active = false;
            if (this.game) {
                this.game.TriggerExplosion(this.position.x, this.groundY, 65, 1, true);
            }
        }
    }

    Draw(renderer) {
        if (!this.active) return;
        if (ArcadeSprites.bullets.mortar) {
            renderer.DrawImage(ArcadeSprites.bullets.mortar, this.position.x, this.position.y, 1, 1, 0);
        } else {
            renderer.DrawFillCircle(this.position.x, this.position.y, 11, Color.orange);
        }
    }
}

// ── POWER-UP ITEM ─────────────────────────────────────────────
class PowerupItem {
    constructor() {
        this.position = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);
        this.active = false;
        this.type = 'S';
        this.radius = 19;
        this.bounceTime = 0;
        this.groundY = 600;
        this.game = null;
    }

    Spawn(x, y, type = 'S', groundY = 600) {
        this.position.Set(x, y);
        this.velocity.Set((Math.random() - 0.5) * 100, -220);
        this.type = type;
        this.groundY = groundY;
        this.bounceTime = 0;
        this.active = true;
    }

    Update(deltaTime) {
        if (!this.active) return;

        this.velocity.y += 500 * deltaTime; // gravity
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Bounce on ground
        if (this.position.y >= this.groundY - 19) {
            this.position.y = this.groundY - 19;
            if (Math.abs(this.velocity.y) > 70) {
                this.velocity.y = -this.velocity.y * 0.5;
                this.velocity.x *= 0.7;
            } else {
                this.velocity.y = 0;
                this.velocity.x = 0;
            }
        }

        this.bounceTime += deltaTime;
    }

    Draw(renderer) {
        if (!this.active) return;

        const bob = Math.sin(this.bounceTime * 6) * 4;
        const img = ArcadeSprites.powerups[this.type];
        if (img) {
            renderer.DrawImage(img, this.position.x, this.position.y + bob, 1, 1, 0);
        } else {
            renderer.DrawFillCircle(this.position.x, this.position.y + bob, 18, Color.yellow);
            renderer.DrawFillText(this.type, this.position.x, this.position.y + 6 + bob, "bold 16px sans-serif", Color.black, "center");
        }
    }
}

// ── EXPLOSION & SPARK FX ──────────────────────────────────────
class SparkParticle {
    constructor() {
        this.position = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);
        this.color = '#ffcc00';
        this.size = 4;
        this.life = 0;
        this.maxLife = 0.45;
        this.active = false;
    }

    Spawn(x, y, vx, vy, color = '#ffcc00', size = 4, maxLife = 0.45) {
        this.position.Set(x, y);
        this.velocity.Set(vx, vy);
        this.color = color;
        this.size = size;
        this.life = 0;
        this.maxLife = maxLife;
        this.active = true;
    }

    Update(deltaTime) {
        if (!this.active) return;
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.y += 240 * deltaTime;
        this.life += deltaTime;
        if (this.life >= this.maxLife) {
            this.active = false;
        }
    }

    Draw(renderer) {
        if (!this.active) return;
        const color = Color.FromHex ? Color.FromHex(this.color) : Color.yellow;
        renderer.DrawFillRectangle(this.position.x, this.position.y, this.size, this.size, color);
    }
}

// #endregion
