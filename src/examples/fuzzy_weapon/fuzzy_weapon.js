// ============================================================================
// Demo 1: Fuzzy Logic Weapon Selection (src/examples/fuzzy_weapon/fuzzy_weapon.js)
//
// Demonstrates Mat Buckland's classic Arena Bot Weapon Selection architecture
// ("Programming Game AI by Example", Chapter 10).
//
// Each weapon owns a dedicated FuzzyModule with two crisp inputs:
//   1. DistToTarget (0 .. 450 px)
//   2. AmmoStatus   (0 .. maxAmmo)
// And one defuzzified crisp output:
//   3. Desirability (0 .. 100)
//
// Every frame, the bot evaluates all 4 weapons and equips the one with the
// highest Desirability score.
// ============================================================================

// #region Weapon Definitions & Fuzzy Modules

class FuzzyWeapon {
    /**
     * @param {object} cfg
     * @param {string} cfg.name
     * @param {string} cfg.shortName
     * @param {number} cfg.maxAmmo
     * @param {number} cfg.startAmmo
     * @param {number} cfg.fireRate     Seconds between shots
     * @param {Color}  cfg.color
     * @param {function(FuzzyModule, number): void} cfg.configureFuzzy
     */
    constructor(cfg) {
        this.name = cfg.name;
        this.shortName = cfg.shortName;
        this.maxAmmo = cfg.maxAmmo;
        this.ammo = cfg.startAmmo;
        this.fireRate = cfg.fireRate;
        this.color = cfg.color;
        this.lastScore = 0;

        this.fm = new FuzzyModule();
        cfg.configureFuzzy(this.fm, this.maxAmmo);
    }

    /**
     * Evaluates the FuzzyModule for the given target distance and current ammo.
     * @param {number} distance
     * @param {string} method    FuzzyModule.DefuzzifyMethod.MaxAv or Centroid
     * @returns {number} Crisp desirability score in [0, 100]
     */
    EvaluateDesirability(distance, method) {
        if (this.ammo <= 0) {
            this.fm.Fuzzify('DistToTarget', distance);
            this.fm.Fuzzify('AmmoStatus', 0);
            this.fm.DeFuzzify('Desirability', method);
            this.lastScore = 0;
            return 0;
        }
        this.fm.Fuzzify('DistToTarget', distance);
        this.fm.Fuzzify('AmmoStatus', this.ammo);
        this.lastScore = this.fm.DeFuzzify('Desirability', method);
        return this.lastScore;
    }
}

/**
 * Helper to create the standard 3-set Desirability output variable on a FuzzyModule.
 */
function CreateDesirabilityFLV(fm) {
    const des = fm.CreateFLV('Desirability');
    const undesirable   = des.AddLeftShoulderSet('Undesirable', 0, 25, 50);
    const desirable     = des.AddTriangularSet('Desirable', 25, 50, 75);
    const veryDesirable = des.AddRightShoulderSet('VeryDesirable', 50, 75, 100);
    return { undesirable, desirable, veryDesirable };
}

/**
 * Helper to create the standard 3-set DistanceToTarget input variable (0..450 px).
 */
function CreateDistanceFLV(fm) {
    const dist = fm.CreateFLV('DistToTarget');
    const close  = dist.AddLeftShoulderSet('Close', 0, 45, 150);
    const medium = dist.AddTriangularSet('Medium', 45, 175, 310);
    const far    = dist.AddRightShoulderSet('Far', 175, 310, 450);
    return { close, medium, far };
}

/**
 * Builds the 4 distinct Arena Bot weapons with their fuzzy rulebases.
 */
function CreateArenaWeapons() {
    // 1. SHOTGUN — Lethal up close, weak at medium range, useless far away
    const shotgun = new FuzzyWeapon({
        name: 'Shotgun',
        shortName: 'SHOTGUN',
        maxAmmo: 16,
        startAmmo: 12,
        fireRate: 0.65,
        color: new Color(1.0, 0.58, 0.18, 1.0),
        configureFuzzy: (fm, maxAmmo) => {
            const { close, medium, far } = CreateDistanceFLV(fm);
            const ammo = fm.CreateFLV('AmmoStatus');
            const low   = ammo.AddLeftShoulderSet('Low', 0, 2, 6);
            const okay  = ammo.AddTriangularSet('Okay', 2, 7, 12);
            const loads = ammo.AddRightShoulderSet('Loads', 7, 12, maxAmmo);
            const { undesirable, desirable, veryDesirable } = CreateDesirabilityFLV(fm);

            fm.AddRule(new FzAnd(close, loads), veryDesirable);
            fm.AddRule(new FzAnd(close, okay),  veryDesirable);
            fm.AddRule(new FzAnd(close, low),   desirable);

            fm.AddRule(new FzAnd(medium, loads), desirable);
            fm.AddRule(new FzAnd(medium, okay),  undesirable);
            fm.AddRule(new FzAnd(medium, low),   undesirable);

            fm.AddRule(new FzAnd(far, loads), undesirable);
            fm.AddRule(new FzAnd(far, okay),  undesirable);
            fm.AddRule(new FzAnd(far, low),   undesirable);
        }
    });

    // 2. ASSAULT RIFLE — All-around mid-range workhorse
    const assaultRifle = new FuzzyWeapon({
        name: 'Assault Rifle',
        shortName: 'RIFLE',
        maxAmmo: 40,
        startAmmo: 32,
        fireRate: 0.16,
        color: new Color(0.25, 0.90, 0.52, 1.0),
        configureFuzzy: (fm, maxAmmo) => {
            const { close, medium, far } = CreateDistanceFLV(fm);
            const ammo = fm.CreateFLV('AmmoStatus');
            const low   = ammo.AddLeftShoulderSet('Low', 0, 5, 14);
            const okay  = ammo.AddTriangularSet('Okay', 5, 18, 30);
            const loads = ammo.AddRightShoulderSet('Loads', 18, 30, maxAmmo);
            const { undesirable, desirable, veryDesirable } = CreateDesirabilityFLV(fm);

            fm.AddRule(new FzAnd(close, loads), desirable);
            fm.AddRule(new FzAnd(close, okay),  desirable);
            fm.AddRule(new FzAnd(close, low),   undesirable);

            fm.AddRule(new FzAnd(medium, loads), veryDesirable);
            fm.AddRule(new FzAnd(medium, okay),  desirable);
            fm.AddRule(new FzAnd(medium, low),   desirable);

            fm.AddRule(new FzAnd(far, loads), desirable);
            fm.AddRule(new FzAnd(far, okay),  undesirable);
            fm.AddRule(new FzAnd(far, low),   undesirable);
        }
    });

    // 3. ROCKET LAUNCHER — Devastating at medium range, dangerous up close (splash damage!)
    const rocketLauncher = new FuzzyWeapon({
        name: 'Rocket Launcher',
        shortName: 'ROCKET',
        maxAmmo: 15,
        startAmmo: 10,
        fireRate: 0.85,
        color: new Color(0.98, 0.32, 0.38, 1.0),
        configureFuzzy: (fm, maxAmmo) => {
            const { close, medium, far } = CreateDistanceFLV(fm);
            const ammo = fm.CreateFLV('AmmoStatus');
            const low   = ammo.AddLeftShoulderSet('Low', 0, 1, 5);
            const okay  = ammo.AddTriangularSet('Okay', 1, 6, 11);
            const loads = ammo.AddRightShoulderSet('Loads', 6, 11, maxAmmo);
            const { undesirable, desirable, veryDesirable } = CreateDesirabilityFLV(fm);

            // Too close -> splash self-damage makes it Undesirable!
            fm.AddRule(new FzAnd(close, loads), undesirable);
            fm.AddRule(new FzAnd(close, okay),  undesirable);
            fm.AddRule(new FzAnd(close, low),   undesirable);

            // Sweet spot at medium range
            fm.AddRule(new FzAnd(medium, loads), veryDesirable);
            fm.AddRule(new FzAnd(medium, okay),  veryDesirable);
            fm.AddRule(new FzAnd(medium, low),   desirable);

            // Slow rockets are harder to land at far range unless we have plenty of ammo
            fm.AddRule(new FzAnd(far, loads), desirable);
            fm.AddRule(new FzAnd(far, okay),  undesirable);
            fm.AddRule(new FzAnd(far, low),   undesirable);
        }
    });

    // 4. SNIPER RAILGUN — High-velocity precision beam for long-range targets
    const railgun = new FuzzyWeapon({
        name: 'Sniper Railgun',
        shortName: 'RAILGUN',
        maxAmmo: 10,
        startAmmo: 7,
        fireRate: 1.05,
        color: new Color(0.38, 0.78, 1.0, 1.0),
        configureFuzzy: (fm, maxAmmo) => {
            const { close, medium, far } = CreateDistanceFLV(fm);
            const ammo = fm.CreateFLV('AmmoStatus');
            const low   = ammo.AddLeftShoulderSet('Low', 0, 1, 3);
            const okay  = ammo.AddTriangularSet('Okay', 1, 4, 7);
            const loads = ammo.AddRightShoulderSet('Loads', 4, 7, maxAmmo);
            const { undesirable, desirable, veryDesirable } = CreateDesirabilityFLV(fm);

            fm.AddRule(new FzAnd(close, loads), undesirable);
            fm.AddRule(new FzAnd(close, okay),  undesirable);
            fm.AddRule(new FzAnd(close, low),   undesirable);

            fm.AddRule(new FzAnd(medium, loads), desirable);
            fm.AddRule(new FzAnd(medium, okay),  desirable);
            fm.AddRule(new FzAnd(medium, low),   undesirable);

            // Uses linguistic hedge FzVery(far) to boost long-range priority even with low ammo
            fm.AddRule(new FzAnd(far, loads), veryDesirable);
            fm.AddRule(new FzAnd(far, okay),  veryDesirable);
            fm.AddRule(new FzAnd(new FzVery(far), low), desirable);
            fm.AddRule(new FzAnd(far, low),   undesirable);
        }
    });

    return [shotgun, assaultRifle, rocketLauncher, railgun];
}

// #endregion

// #region Target Dummy & Arena Bot Entities

class TargetDummy extends GameObject {
    constructor(position) {
        super(position);
        this.radius = 18;
        this.speed = 210;
        this.hitFlash = 0;
    }

    Update(dt) {
        if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 3);

        let mx = 0, my = 0;
        if (Input.IsKeyPressed(KEY_W) || Input.IsKeyPressed(KEY_UP))    my -= 1;
        if (Input.IsKeyPressed(KEY_S) || Input.IsKeyPressed(KEY_DOWN))  my += 1;
        if (Input.IsKeyPressed(KEY_A) || Input.IsKeyPressed(KEY_LEFT))  mx -= 1;
        if (Input.IsKeyPressed(KEY_D) || Input.IsKeyPressed(KEY_RIGHT)) mx += 1;

        if (mx !== 0 || my !== 0) {
            const len = Math.hypot(mx, my);
            this.position.x += (mx / len) * this.speed * dt;
            this.position.y += (my / len) * this.speed * dt;
        }

        // Allow dragging target dummy inside the arena viewport (left of inspector panel)
        const arenaMaxX = 560;
        if (Input.mouse.down && Input.mouse.x < arenaMaxX && Input.mouse.y > 54 && Input.mouse.y < 520) {
            this.position.x = Input.mouse.x;
            this.position.y = Input.mouse.y;
        }

        this.position.x = Clamp(this.position.x, 40, arenaMaxX - 25);
        this.position.y = Clamp(this.position.y, 70, 505);
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;
        const pulse = 1 + Math.sin(totalTime * 5) * 0.08;

        // Outer target reticle
        renderer.DrawStrokeCircle(x, y, this.radius * 1.45 * pulse, new Color(1, 0.35, 0.35, 0.45), 1.5);
        renderer.DrawFillCircle(x, y, this.radius, this.hitFlash > 0 ? Color.white : new Color(0.92, 0.25, 0.30, 1));
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 2);
        renderer.DrawStrokeCircle(x, y, this.radius * 0.5, new Color(1, 1, 1, 0.8), 1.5);
        renderer.DrawFillText('TARGET', x, y - 28, 'bold 10px monospace', new Color(1, 0.65, 0.65, 1), 'center', 'middle');
    }
}

class ArenaBot extends GameObject {
    constructor(position, target, weapons) {
        super(position);
        this.target = target;
        this.weapons = weapons;
        this.activeWeaponIndex = 0;
        this.defuzzifyMethod = FuzzyModule.DefuzzifyMethod.MaxAv;
        this.fireTimer = 0;
        this.autoFire = true;
        this.distanceToTarget = 0;
    }

    get currentWeapon() {
        return this.weapons[this.activeWeaponIndex];
    }

    Update(dt) {
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        this.distanceToTarget = Math.hypot(dx, dy);
        this.rotation = Math.atan2(dy, dx);

        // Evaluate all 4 weapons via their FuzzyModules
        let bestIdx = 0;
        let bestScore = -1;
        for (let i = 0; i < this.weapons.length; i++) {
            const score = this.weapons[i].EvaluateDesirability(this.distanceToTarget, this.defuzzifyMethod);
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }
        this.activeWeaponIndex = bestIdx;

        // Fire active weapon when autoFire is enabled
        if (this.fireTimer > 0) this.fireTimer -= dt;
        const wpn = this.currentWeapon;
        if (this.autoFire && this.fireTimer <= 0 && wpn.ammo > 0) {
            this.fireTimer = wpn.fireRate;
            wpn.ammo = Math.max(0, wpn.ammo - 1);
            this.game.SpawnWeaponEffect(this.position.x, this.position.y, this.rotation, wpn, this.target);
        }
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;
        const wpn = this.currentWeapon;

        // Range zone rings (Close = 150, Far = 310)
        renderer.DrawStrokeCircle(x, y, 150, new Color(1.0, 0.58, 0.18, 0.18), 1);
        renderer.DrawFillText('Close (150px)', x, y - 150 + 10, '9px monospace', new Color(1.0, 0.58, 0.18, 0.45), 'center', 'middle');

        renderer.DrawStrokeCircle(x, y, 310, new Color(0.38, 0.78, 1.0, 0.18), 1);
        renderer.DrawFillText('Far (310px)', x, y - 310 + 10, '9px monospace', new Color(0.38, 0.78, 1.0, 0.45), 'center', 'middle');

        // Line of sight to target
        renderer.DrawLine(x, y, this.target.position.x, this.target.position.y, new Color(wpn.color.r, wpn.color.g, wpn.color.b, 0.30), 1.5);
        const midX = (x + this.target.position.x) * 0.5;
        const midY = (y + this.target.position.y) * 0.5;
        renderer.DrawFillText(`${this.distanceToTarget.toFixed(0)} px`, midX, midY - 8, 'bold 10px monospace', Color.white, 'center', 'middle');

        // Gun barrel
        const bx = x + Math.cos(this.rotation) * 28;
        const by = y + Math.sin(this.rotation) * 28;
        renderer.DrawLine(x, y, bx, by, wpn.color, 6);

        // Bot chassis
        renderer.DrawFillCircle(x, y, 20, new Color(0.14, 0.20, 0.30, 1));
        renderer.DrawStrokeCircle(x, y, 20, wpn.color, 3);
        renderer.DrawFillCircle(x, y, 7, wpn.color);

        renderer.DrawFillText(`BOT [${wpn.shortName}]`, x, y - 30, 'bold 11px monospace', wpn.color, 'center', 'middle');
    }
}

// #endregion

// #region Main Game Controller

class FuzzyWeaponGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({ screenWidth: 920, screenHeight: 620 });
    }

    Start() {
        super.Start();
        this.weapons = CreateArenaWeapons();
        this.inspectedWeaponIndex = 2; // Default to Rocket Launcher (Buckland's classic walkthrough)
        this.effects = [];

        this.target = this.AddGameObject(new TargetDummy(new Vector2(390, 260)));
        this.bot = this.AddGameObject(new ArenaBot(new Vector2(210, 290), this.target, this.weapons));
    }

    SpawnWeaponEffect(x, y, angle, weapon, target) {
        if (weapon.shortName === 'SHOTGUN') {
            // 6 pellet spread
            for (let i = -2.5; i <= 2.5; i++) {
                const a = angle + i * 0.09;
                this.effects.push({
                    type: 'pellet',
                    x, y,
                    vx: Math.cos(a) * 480,
                    vy: Math.sin(a) * 480,
                    life: 0.32,
                    color: weapon.color
                });
            }
        } else if (weapon.shortName === 'RIFLE') {
            const spread = (Math.random() - 0.5) * 0.05;
            this.effects.push({
                type: 'bullet',
                x, y,
                vx: Math.cos(angle + spread) * 620,
                vy: Math.sin(angle + spread) * 620,
                life: 0.65,
                color: weapon.color
            });
        } else if (weapon.shortName === 'ROCKET') {
            this.effects.push({
                type: 'rocket',
                x, y,
                vx: Math.cos(angle) * 340,
                vy: Math.sin(angle) * 340,
                life: 1.2,
                color: weapon.color
            });
        } else if (weapon.shortName === 'RAILGUN') {
            target.hitFlash = 1.0;
            this.effects.push({
                type: 'beam',
                x1: x, y1: y,
                x2: target.position.x, y2: target.position.y,
                life: 0.25,
                maxLife: 0.25,
                color: weapon.color
            });
        }
    }

    Update(dt) {
        // Hotkeys for classroom exploration
        if (Input.IsKeyDown(KEY_1)) this.inspectedWeaponIndex = 0;
        if (Input.IsKeyDown(KEY_2)) this.inspectedWeaponIndex = 1;
        if (Input.IsKeyDown(KEY_3)) this.inspectedWeaponIndex = 2;
        if (Input.IsKeyDown(KEY_4)) this.inspectedWeaponIndex = 3;

        // [R] Refill all weapon ammo
        if (Input.IsKeyDown(KEY_R)) {
            for (const w of this.weapons) w.ammo = w.maxAmmo;
        }

        // [Q] / [E] Adjust ammo of currently inspected weapon
        if (Input.IsKeyDown(KEY_Q)) {
            const w = this.weapons[this.inspectedWeaponIndex];
            w.ammo = Math.max(0, w.ammo - 2);
        }
        if (Input.IsKeyDown(KEY_E)) {
            const w = this.weapons[this.inspectedWeaponIndex];
            w.ammo = Math.min(w.maxAmmo, w.ammo + 2);
        }

        // [M] Toggle MaxAv vs Centroid defuzzification
        if (Input.IsKeyDown(KEY_M)) {
            this.bot.defuzzifyMethod =
                this.bot.defuzzifyMethod === FuzzyModule.DefuzzifyMethod.MaxAv
                    ? FuzzyModule.DefuzzifyMethod.Centroid
                    : FuzzyModule.DefuzzifyMethod.MaxAv;
        }

        // [SPACE] Toggle auto-firing
        if (Input.IsKeyDown(KEY_SPACE)) {
            this.bot.autoFire = !this.bot.autoFire;
        }

        super.Update(dt);

        // Update visual projectiles
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const ef = this.effects[i];
            ef.life -= dt;
            if (ef.vx !== undefined) {
                ef.x += ef.vx * dt;
                ef.y += ef.vy * dt;
                const dist = Math.hypot(ef.x - this.target.position.x, ef.y - this.target.position.y);
                if (dist < this.target.radius + 6) {
                    this.target.hitFlash = 1.0;
                    if (ef.type === 'rocket') {
                        this.effects.push({
                            type: 'explosion',
                            x: ef.x, y: ef.y,
                            life: 0.3, maxLife: 0.3,
                            color: ef.color
                        });
                    }
                    ef.life = 0;
                }
            }
            if (ef.life <= 0) this.effects.splice(i, 1);
        }
    }

    Draw() {
        const r = this.renderer;
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, new Color(0.05, 0.07, 0.11, 1));

        // Subtle arena grid on left side
        for (let gx = 40; gx < 560; gx += 40) {
            r.DrawLine(gx, 48, gx, 520, new Color(0.10, 0.14, 0.20, 0.6), 1);
        }
        for (let gy = 80; gy < 520; gy += 40) {
            r.DrawLine(20, gy, 560, gy, new Color(0.10, 0.14, 0.20, 0.6), 1);
        }

        // Draw projectiles & beams
        for (const ef of this.effects) {
            if (ef.type === 'beam') {
                const alpha = ef.life / ef.maxLife;
                r.DrawLine(ef.x1, ef.y1, ef.x2, ef.y2, new Color(ef.color.r, ef.color.g, ef.color.b, alpha), 4);
            } else if (ef.type === 'explosion') {
                const progress = 1 - ef.life / ef.maxLife;
                r.DrawStrokeCircle(ef.x, ef.y, 10 + progress * 38, new Color(1, 0.55, 0.2, 1 - progress), 3);
            } else {
                r.DrawFillCircle(ef.x, ef.y, ef.type === 'rocket' ? 5 : 3, ef.color);
            }
        }

        super.Draw();

        // Top Banner
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, 42, new Color(0.08, 0.12, 0.19, 0.96));
        r.DrawFillText(
            'FUZZY LOGIC DEMO 1: ARENA BOT WEAPON SELECTION',
            14, 14, 'bold 13px monospace', new Color(0.45, 0.88, 1.0, 1), 'left', 'middle'
        );
        r.DrawFillText(
            'WASD/Drag: Move Target | [1-4]: Inspect Weapon | [Q/E]: -/+ Ammo | [R]: Reload All | [M]: Method | [Space]: Fire',
            14, 31, '10px monospace', new Color(0.75, 0.82, 0.92, 1), 'left', 'middle'
        );

        // Bottom Comparison Cards for all 4 weapons
        const cardW = 132;
        const cardH = 82;
        const startX = 14;
        const cardY = 528;

        for (let i = 0; i < this.weapons.length; i++) {
            const w = this.weapons[i];
            const cx = startX + i * (cardW + 8);
            const isEquipped = i === this.bot.activeWeaponIndex;
            const isInspected = i === this.inspectedWeaponIndex;

            r.DrawFillBasicRectangle(cx, cardY, cardW, cardH, new Color(0.08, 0.11, 0.17, 0.95));
            r.DrawStrokeBasicRectangle(
                cx, cardY, cardW, cardH,
                isEquipped ? w.color : (isInspected ? Color.white : new Color(0.22, 0.30, 0.42, 0.8)),
                isEquipped ? 2.5 : 1.2
            );

            r.DrawFillText(`[${i + 1}] ${w.shortName}`, cx + 8, cardY + 14, 'bold 11px monospace', w.color, 'left', 'middle');
            if (isEquipped) {
                r.DrawFillText('ACTIVE', cx + cardW - 6, cardY + 14, 'bold 9px monospace', Color.lime, 'right', 'middle');
            } else if (isInspected) {
                r.DrawFillText('VIEW', cx + cardW - 6, cardY + 14, '9px monospace', Color.white, 'right', 'middle');
            }

            // Ammo bar
            r.DrawFillText(`Ammo: ${w.ammo}/${w.maxAmmo}`, cx + 8, cardY + 33, '10px monospace', new Color(0.82, 0.88, 0.96, 1), 'left', 'middle');

            // Desirability bar
            const barW = cardW - 16;
            r.DrawFillBasicRectangle(cx + 8, cardY + 46, barW, 12, new Color(0.04, 0.06, 0.09, 1));
            r.DrawFillBasicRectangle(cx + 8, cardY + 46, barW * (w.lastScore / 100), 12, w.color);
            r.DrawStrokeBasicRectangle(cx + 8, cardY + 46, barW, 12, new Color(0.3, 0.4, 0.55, 1), 1);
            r.DrawFillText(`Score: ${w.lastScore.toFixed(1)}`, cx + 8, cardY + 69, 'bold 10px monospace', Color.white, 'left', 'middle');
        }

        // Right-side Live Fuzzy Inspector for the currently inspected weapon
        const inspected = this.weapons[this.inspectedWeaponIndex];
        inspected.fm.DrawFuzzyInspector(r, 574, 48, {
            width: 334,
            graphHeight: 74,
            title: `INSPECTING [${this.inspectedWeaponIndex + 1}]: ${inspected.name.toUpperCase()} (${this.bot.defuzzifyMethod})`,
            variables: ['DistToTarget', 'AmmoStatus', 'Desirability'],
            outputs: ['Desirability'],
            showRules: true,
            force: true
        });
    }
}

window.onload = () => {
    Init(FuzzyWeaponGame);
};

// #endregion

