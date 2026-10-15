// ============================================================================
// Demo 3: Fuzzy Tactical Threat Assessment & Hybrid AI
// (src/examples/fuzzy_tactical/fuzzy_tactical.js)
//
// Demonstrates how Fuzzy Logic solves combinatorial explosion in tactical RPG
// and action-game AI by combining multiple continuous battlefield variables:
//   1. OwnHealth     (0 .. 100%)
//   2. EnemyThreat   (0 .. 100, derived from player proximity & power aura)
//   3. AllySupport   (0 .. 4 nearby allied support drones)
//
// Into a single continuous tactical utility output:
//   4. Aggression    (0 .. 100: Retreat -> Defensive -> Tactical -> Berserk)
//
// The continuous Aggression index smoothly governs the AI Commander's desired
// standoff distance, healing shrine retreat, shield energy, and fire cadence.
// ============================================================================

// #region Tactical FuzzyModule Builder

function BuildTacticalFuzzyModule() {
    const fm = new FuzzyModule();

    // 1. OwnHealth (0..100%)
    const hp = fm.CreateFLV('OwnHealth');
    const hpCritical = hp.AddLeftShoulderSet('Critical', 0, 22, 45);
    const hpWounded  = hp.AddTriangularSet('Wounded', 25, 55, 80);
    const hpHealthy  = hp.AddRightShoulderSet('Healthy', 60, 82, 100);

    // 2. EnemyThreat (0..100)
    const threat = fm.CreateFLV('EnemyThreat');
    const threatLow      = threat.AddLeftShoulderSet('Low', 0, 25, 50);
    const threatModerate = threat.AddTriangularSet('Mod', 25, 55, 82);
    const threatExtreme  = threat.AddRightShoulderSet('Extreme', 60, 85, 100);

    // 3. AllySupport (0..4 squad drones)
    const allies = fm.CreateFLV('AllySupport');
    const isolated   = allies.AddLeftShoulderSet('Isolated', 0, 0.5, 2.0);
    const supported  = allies.AddTriangularSet('Supported', 0.8, 2.0, 3.2);
    const reinforced = allies.AddRightShoulderSet('Squad', 2.2, 3.5, 4.0);

    // 4. Output: Tactical Aggression Index (0..100)
    const aggr = fm.CreateFLV('Aggression');
    const retreat   = aggr.AddLeftShoulderSet('Retreat', 0, 15, 35);
    const defensive = aggr.AddTriangularSet('Defend', 20, 42, 65);
    const tactical  = aggr.AddTriangularSet('Engage', 45, 68, 88);
    const berserk   = aggr.AddRightShoulderSet('Berserk', 72, 88, 100);

    // --- Rulebase combining Health, Threat, and Squad Support (with hedges!) ---
    // Critical health: retreat unless enemy threat is very low and we have full squad
    fm.AddRule(new FzAnd(hpCritical, new FzOr(threatModerate, threatExtreme)), retreat, 'IF Critical & Threat>=Mod -> Retreat');
    fm.AddRule(new FzAnd(hpCritical, isolated), retreat, 'IF Critical & Isolated -> Retreat');
    fm.AddRule(new FzAnd(hpCritical, threatLow, reinforced), defensive, 'IF Critical & LowThreat & Squad -> Defend');

    // Wounded health: posture depends on enemy threat and squad support
    fm.AddRule(new FzAnd(hpWounded, threatExtreme, isolated), retreat, 'IF Wounded & Extreme & Isolated -> Retreat');
    fm.AddRule(new FzAnd(hpWounded, threatExtreme, new FzOr(supported, reinforced)), defensive, 'IF Wounded & Extreme & Allies -> Defend');
    fm.AddRule(new FzAnd(hpWounded, threatModerate), defensive, 'IF Wounded & ModThreat -> Defend');
    fm.AddRule(new FzAnd(hpWounded, threatLow), tactical, 'IF Wounded & LowThreat -> Engage');

    // Healthy: press the advantage, or go Berserk when reinforced or threat is low
    fm.AddRule(new FzAnd(hpHealthy, threatLow), berserk, 'IF Healthy & LowThreat -> Berserk');
    fm.AddRule(new FzAnd(hpHealthy, threatModerate, reinforced), berserk, 'IF Healthy & Mod & Squad -> Berserk');
    fm.AddRule(new FzAnd(hpHealthy, threatModerate, new FzOr(isolated, supported)), tactical, 'IF Healthy & Mod -> Engage');
    fm.AddRule(new FzAnd(hpHealthy, new FzVery(threatExtreme), isolated), defensive, 'IF Healthy & VERY(Extreme) & Isolated -> Defend');
    fm.AddRule(new FzAnd(hpHealthy, threatExtreme, new FzOr(supported, reinforced)), tactical, 'IF Healthy & Extreme & Allies -> Engage');

    return fm;
}

// #endregion

// #region Entities: Player Hero & AI Tactical Commander

class TacticalHero extends GameObject {
    constructor(position) {
        super(position);
        this.speed = 215;
        this.overcharged = false;
        this.radius = 18;
    }

    Update(dt) {
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

        if (Input.mouse.down && Input.mouse.x > 30 && Input.mouse.x < 555 && Input.mouse.y > 55 && Input.mouse.y < 530) {
            this.position.x = Input.mouse.x;
            this.position.y = Input.mouse.y;
        }

        this.position.x = Clamp(this.position.x, 40, 540);
        this.position.y = Clamp(this.position.y, 70, 520);
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        if (this.overcharged) {
            const pulse = 28 + Math.sin(totalTime * 8) * 5;
            renderer.DrawFillCircle(x, y, pulse, new Color(1.0, 0.25, 0.45, 0.22));
            renderer.DrawStrokeCircle(x, y, pulse, new Color(1.0, 0.35, 0.55, 0.75), 2);
        }

        renderer.DrawFillCircle(x, y, this.radius, this.overcharged ? new Color(1.0, 0.30, 0.45, 1) : new Color(0.25, 0.75, 1.0, 1));
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 2);
        renderer.DrawFillText(
            this.overcharged ? 'PLAYER [OVERCHARGED!]' : 'PLAYER HERO',
            x, y - 27,
            'bold 10px monospace',
            this.overcharged ? new Color(1, 0.5, 0.6, 1) : new Color(0.65, 0.9, 1, 1),
            'center', 'middle'
        );
    }
}

class TacticalCommander extends GameObject {
    constructor(position, hero, shrinePos) {
        super(position);
        this.hero = hero;
        this.shrinePos = shrinePos;
        this.fm = BuildTacticalFuzzyModule();
        this.defuzzifyMethod = FuzzyModule.DefuzzifyMethod.MaxAv;

        this.hp = 78;
        this.allyCount = 2;
        this.enemyThreat = 35;
        this.aggression = 60;
        this.postureLabel = 'ENGAGE';
        this.orbitAngle = 0;
        this.fireTimer = 0;
    }

    Update(dt) {
        this.orbitAngle += dt * 1.6;

        // 1. Compute crisp EnemyThreat (0..100) from player proximity + Overcharge state
        const dx = this.hero.position.x - this.position.x;
        const dy = this.hero.position.y - this.position.y;
        const dist = Math.hypot(dx, dy);
        const proximityFactor = Clamp(1 - (dist - 50) / 340, 0, 1) * 65;
        const auraBonus = this.hero.overcharged ? 35 : 0;
        this.enemyThreat = Clamp(proximityFactor + auraBonus, 0, 100);

        // 2. Fuzzify all 3 tactical inputs & Defuzzify Aggression
        this.fm.Fuzzify('OwnHealth', this.hp);
        this.fm.Fuzzify('EnemyThreat', this.enemyThreat);
        this.fm.Fuzzify('AllySupport', this.allyCount);
        this.aggression = this.fm.DeFuzzify('Aggression', this.defuzzifyMethod);

        // 3. Determine posture label & continuous behavioral parameters from Aggression (0..100)
        if (this.aggression < 30) {
            this.postureLabel = 'RETREAT TO SHRINE';
        } else if (this.aggression < 55) {
            this.postureLabel = 'DEFENSIVE SKIRMISH';
        } else if (this.aggression < 78) {
            this.postureLabel = 'TACTICAL ENGAGE';
        } else {
            this.postureLabel = 'BERSERK ASSAULT';
        }

        // Movement: blend between retreating to healing shrine vs maintaining ideal combat standoff
        if (this.aggression < 30) {
            // Retreat toward Shrine and regenerate HP
            const sdx = this.shrinePos.x - this.position.x;
            const sdy = this.shrinePos.y - this.position.y;
            const sdist = Math.hypot(sdx, sdy);
            if (sdist > 8) {
                this.position.x += (sdx / sdist) * 145 * dt;
                this.position.y += (sdy / sdist) * 145 * dt;
            }
            if (sdist < 55) {
                this.hp = Math.min(100, this.hp + 12 * dt);
            }
        } else {
            // Continuous standoff radius: 220px at Aggression=30 down to 85px at Aggression=100
            const t = (this.aggression - 30) / 70;
            const desiredDist = Lerp(220, 85, Clamp(t, 0, 1));
            const moveSpeed = Lerp(95, 175, Clamp(t, 0, 1));

            if (dist > 1) {
                const dirX = dx / dist;
                const dirY = dy / dist;
                const radialErr = dist - desiredDist;
                // Radial approach/kite + slight tactical strafe
                const strafeX = -dirY * 0.45;
                const strafeY = dirX * 0.45;
                const radialFactor = Clamp(radialErr / 60, -1, 1);

                this.position.x += (dirX * radialFactor + strafeX) * moveSpeed * dt;
                this.position.y += (dirY * radialFactor + strafeY) * moveSpeed * dt;
            }
        }

        this.position.x = Clamp(this.position.x, 45, 535);
        this.position.y = Clamp(this.position.y, 75, 515);

        // Fire plasma bolts at cadence governed by Aggression
        this.fireTimer -= dt;
        const fireInterval = Lerp(1.1, 0.25, this.aggression / 100);
        if (this.fireTimer <= 0 && this.aggression >= 22) {
            this.fireTimer = fireInterval;
            const aimAngle = Math.atan2(dy, dx);
            this.game.SpawnPulse(this.position.x, this.position.y, aimAngle, this.aggression);
        }
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        // Posture color interpolated from Cyan (Defensive) -> Green (Engage) -> Gold/Red (Berserk)
        let col;
        if (this.aggression < 30) col = new Color(0.35, 0.78, 1.0, 1);
        else if (this.aggression < 55) col = new Color(0.25, 0.92, 0.65, 1);
        else if (this.aggression < 78) col = new Color(1.0, 0.80, 0.22, 1);
        else col = new Color(1.0, 0.32, 0.36, 1);

        // Defensive Aegis Shield ring when in Defensive/Retreat posture
        if (this.aggression < 58) {
            const shieldAlpha = Clamp((65 - this.aggression) / 65, 0.15, 0.65);
            renderer.DrawStrokeCircle(x, y, 30, new Color(0.35, 0.85, 1.0, shieldAlpha), 2.5);
        }

        // Draw orbiting Allied Squad Drones
        for (let i = 0; i < this.allyCount; i++) {
            const a = this.orbitAngle + (i * Math.PI * 2) / Math.max(1, this.allyCount);
            const ax = x + Math.cos(a) * 42;
            const ay = y + Math.sin(a) * 42;
            renderer.DrawLine(x, y, ax, ay, new Color(0.35, 0.9, 0.55, 0.25), 1);
            renderer.DrawFillCircle(ax, ay, 6, new Color(0.30, 0.95, 0.55, 1));
            renderer.DrawStrokeCircle(ax, ay, 6, Color.white, 1);
        }

        // Commander body
        renderer.DrawFillCircle(x, y, 21, new Color(0.14, 0.18, 0.26, 1));
        renderer.DrawStrokeCircle(x, y, 21, col, 3);
        renderer.DrawFillCircle(x, y, 8, col);

        // Mini HP bar above Commander
        const bw = 46;
        renderer.DrawFillBasicRectangle(x - bw * 0.5, y - 34, bw, 5, new Color(0.1, 0.1, 0.15, 0.9));
        renderer.DrawFillBasicRectangle(x - bw * 0.5, y - 34, bw * (this.hp / 100), 5, new Color(0.25, 0.95, 0.45, 1));
        renderer.DrawFillText(`${this.postureLabel} (${this.aggression.toFixed(0)}%)`, x, y - 44, 'bold 10px monospace', col, 'center', 'middle');
    }
}

// #endregion

// #region Main Game Controller

class FuzzyTacticalGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({ screenWidth: 920, screenHeight: 620 });
    }

    Start() {
        super.Start();
        this.shrinePos = new Vector2(115, 135);
        this.pulses = [];

        this.hero = this.AddGameObject(new TacticalHero(new Vector2(390, 350)));
        this.commander = this.AddGameObject(new TacticalCommander(new Vector2(230, 230), this.hero, this.shrinePos));
    }

    SpawnPulse(x, y, angle, aggression) {
        const isBerserk = aggression >= 78;
        const count = isBerserk ? 3 : 1;
        for (let i = 0; i < count; i++) {
            const offset = count === 1 ? 0 : (i - 1) * 0.18;
            const a = angle + offset;
            this.pulses.push({
                x, y,
                vx: Math.cos(a) * (isBerserk ? 380 : 300),
                vy: Math.sin(a) * (isBerserk ? 380 : 300),
                life: 0.9,
                color: isBerserk ? new Color(1, 0.35, 0.35, 1) : new Color(1, 0.82, 0.25, 1)
            });
        }
    }

    Update(dt) {
        // Classroom Controls to manipulate tactical inputs live
        if (Input.IsKeyDown(KEY_1)) this.commander.hp = Clamp(this.commander.hp - 15, 5, 100);
        if (Input.IsKeyDown(KEY_2)) this.commander.hp = Clamp(this.commander.hp + 15, 5, 100);
        if (Input.IsKeyDown(KEY_3)) this.commander.allyCount = Clamp(this.commander.allyCount - 1, 0, 4);
        if (Input.IsKeyDown(KEY_4)) this.commander.allyCount = Clamp(this.commander.allyCount + 1, 0, 4);
        if (Input.IsKeyDown(KEY_E)) this.hero.overcharged = !this.hero.overcharged;

        if (Input.IsKeyDown(KEY_M)) {
            this.commander.defuzzifyMethod =
                this.commander.defuzzifyMethod === FuzzyModule.DefuzzifyMethod.MaxAv
                    ? FuzzyModule.DefuzzifyMethod.Centroid
                    : FuzzyModule.DefuzzifyMethod.MaxAv;
        }

        super.Update(dt);

        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (Math.hypot(p.x - this.hero.position.x, p.y - this.hero.position.y) < this.hero.radius + 4) {
                p.life = 0;
            }
            if (p.life <= 0) this.pulses.splice(i, 1);
        }
    }

    Draw() {
        const r = this.renderer;
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, new Color(0.05, 0.07, 0.11, 1));

        // Healing Sanctuary Shrine in top-left of arena
        r.DrawFillCircle(this.shrinePos.x, this.shrinePos.y, 48, new Color(0.15, 0.55, 0.45, 0.18));
        r.DrawStrokeCircle(this.shrinePos.x, this.shrinePos.y, 48, new Color(0.25, 0.90, 0.65, 0.55), 1.5);
        r.DrawFillText('HEALING SHRINE', this.shrinePos.x, this.shrinePos.y - 56, 'bold 9px monospace', new Color(0.35, 0.95, 0.70, 0.9), 'center', 'middle');

        for (const p of this.pulses) {
            r.DrawFillCircle(p.x, p.y, 4, p.color);
        }

        super.Draw();

        // Top Banner
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, 42, new Color(0.08, 0.12, 0.19, 0.96));
        r.DrawFillText(
            'FUZZY LOGIC DEMO 3: TACTICAL THREAT ASSESSMENT & HYBRID AI',
            14, 14, 'bold 13px monospace', new Color(0.45, 0.88, 1.0, 1), 'left', 'middle'
        );
        r.DrawFillText(
            'WASD/Drag: Move Hero | [1/2]: -/+ Boss HP | [3/4]: -/+ Squad Allies | [E]: Toggle Hero Overcharge | [M]: Method',
            14, 31, '10px monospace', new Color(0.75, 0.82, 0.92, 1), 'left', 'middle'
        );

        // Bottom Tactical Dashboard
        r.DrawFillBasicRectangle(14, 540, 546, 68, new Color(0.08, 0.11, 0.17, 0.95));
        r.DrawStrokeBasicRectangle(14, 540, 546, 68, new Color(0.24, 0.34, 0.48, 0.9), 1);

        r.DrawFillText(
            `INPUTS  -> OwnHealth: ${this.commander.hp.toFixed(0)}% | EnemyThreat: ${this.commander.enemyThreat.toFixed(0)} | AllySupport: ${this.commander.allyCount} Drones`,
            24, 558, '10px monospace', new Color(0.82, 0.90, 1.0, 1), 'left', 'middle'
        );
        r.DrawFillText(
            `OUTPUT  -> Aggression Index: ${this.commander.aggression.toFixed(1)} / 100  ==>  Posture: ${this.commander.postureLabel}`,
            24, 578, 'bold 11px monospace', new Color(1.0, 0.84, 0.28, 1), 'left', 'middle'
        );
        r.DrawFillText(
            'Notice how Aggression smoothly blends Standoff Distance, Shrine Retreat, Shielding, and Fire Rate!',
            24, 596, '9px monospace', new Color(0.62, 0.72, 0.86, 1), 'left', 'middle'
        );

        // Right-side Live Fuzzy Inspector
        this.commander.fm.DrawFuzzyInspector(r, 572, 48, {
            width: 336,
            graphHeight: 64,
            title: `TACTICAL EVALUATOR (${this.commander.defuzzifyMethod})`,
            variables: ['OwnHealth', 'EnemyThreat', 'AllySupport', 'Aggression'],
            outputs: ['Aggression'],
            showRules: true,
            force: true
        });
    }
}

window.onload = () => {
    Init(FuzzyTacticalGame);
};

// #endregion

