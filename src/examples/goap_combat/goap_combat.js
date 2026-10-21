// ============================================================================
// spark.js — GOAP Demo 2: F.E.A.R.-Style Tactical Combat AI
// Inspired by Jeff Orkin's GDC 2006 paper "Three States and a Plan: The AI of F.E.A.R."
// Demonstrates:
//   - Dynamic goal preemption (Survive > EliminateTarget > Patrol)
//   - Cost-driven tactical branches (FlushWithGrenade [cost 2] vs FlankTarget [cost 5])
//   - Multi-step weapon logistics (PickupAmmo -> ReloadWeapon -> ShootTarget)
//   - Procedural preconditions (MeleeCharge fallback when ammo crates are empty)
//   - Live DrawGOAPInspector telemetry overlay
// ============================================================================

debugMode = true;

class TacticalSoldier extends GameObject {
    constructor(position, scene) {
        super(position);
        this.scene = scene;

        // Tactical stats
        this.hp = 100;
        this.maxHp = 100;
        this.clip = 6;
        this.maxClip = 6;
        this.reserveAmmo = 12;
        this.grenades = 2;
        this.speed = 115;

        // World state flags
        this.inCover = false;
        this.patrolled = false;
        this.currentCoverNode = null;
        this.statusBanner = "Scanning tactical arena...";
        this.workProgress = 0;

        this.goap = this.BuildGOAP();
    }

    BuildGOAP() {
        const agent = new GOAPAgent(this);
        agent.replanInterval = 0.35;

        // --------------------------------------------------------------------
        // 1. SENSORS: Synchronize continuous arena state into symbolic facts
        // --------------------------------------------------------------------
        agent.AddSensor((soldier, state) => {
            const target = soldier.scene.target;
            state.Set('targetDead', target.hp <= 0);
            state.Set('targetVisible', !target.cloaked && target.hp > 0);
            state.Set('targetInCover', target.inCover && target.hp > 0);
            state.Set('inCover', soldier.inCover);
            state.Set('weaponLoaded', soldier.clip > 0);
            state.Set('hasAmmo', soldier.clip > 0 || soldier.reserveAmmo > 0);
            state.Set('hasGrenade', soldier.grenades > 0);
            state.Set('lowHealth', soldier.hp <= 40);
            state.Set('patrolled', soldier.patrolled);
        });

        // --------------------------------------------------------------------
        // 2. GOALS: Competing tactical objectives
        // --------------------------------------------------------------------
        agent.AddGoals([
            new GOAPGoal('Survive', { lowHealth: false, inCover: true }, (owner, ws) => {
                return ws.Get('lowHealth') ? 100 : 0;
            }),
            new GOAPGoal('EliminateTarget', { targetDead: true }, (owner, ws) => {
                return !ws.Get('targetDead') ? 80 : 0;
            }),
            new GOAPGoal('PatrolArena', { patrolled: true }, 20)
        ]);

        // --------------------------------------------------------------------
        // 3. ACTIONS: Decoupled tactical building blocks
        // --------------------------------------------------------------------
        const scene = this.scene;

        // Action 1: Direct fire at exposed target
        const shootTarget = new GOAPAction('ShootTarget', {
            cost: 2,
            preconditions: { targetVisible: true, weaponLoaded: true, targetInCover: false },
            effects: { targetDead: true },
            onEnter: (s) => { s.workTimer = 0; },
            onUpdate: (dt, s) => {
                const target = scene.target;
                if (target.inCover)
                    return GOAPStatus.FAILURE; // Target ducked into cover! Replan!

                if (s.clip <= 0)
                    return GOAPStatus.FAILURE;

                s.workTimer += dt;
                s.workProgress = Math.min(1, s.workTimer / 0.55);
                s.statusBanner = "Firing burst at exposed target!";

                if (s.workTimer >= 0.55) {
                    s.workTimer = 0;
                    s.clip = Math.max(0, s.clip - 2);
                    scene.SpawnBullet(s.position.x, s.position.y, target.position.x, target.position.y, '#ffdd55');
                    target.TakeDamage(35);
                    if (target.hp <= 0) {
                        s.workProgress = 0;
                        
                        return GOAPStatus.SUCCESS;
                    }
                }

                return GOAPStatus.RUNNING;
            }
        });

        // Action 2: Flush target out of cover with a frag grenade (low cost = 2)
        const flushGrenade = new GOAPAction('FlushWithGrenade', {
            cost: 2,
            preconditions: { targetInCover: true, hasGrenade: true },
            effects: { targetInCover: false, targetVisible: true },
            proceduralPrecondition: (s) => s.grenades > 0,
            onEnter: (s) => { s.workTimer = 0; },
            onUpdate: (dt, s) => {
                const target = scene.target;
                s.workTimer += dt;
                s.workProgress = Math.min(1, s.workTimer / 0.8);
                s.statusBanner = "Throwing frag grenade to flush target from cover!";

                if (s.workTimer >= 0.8) {
                    s.grenades--;
                    s.workProgress = 0;
                    scene.SpawnGrenade(s.position.x, s.position.y, target.position.x, target.position.y);
                    target.FlushFromCover();
                    target.TakeDamage(20);

                    return GOAPStatus.SUCCESS;
                }

                return GOAPStatus.RUNNING;
            }
        });

        // Action 3: Flank around cover when out of grenades (higher cost = 5)
        const flankTarget = new GOAPAction('FlankTarget', {
            cost: 5,
            preconditions: { targetInCover: true },
            effects: { targetInCover: false, targetVisible: true },
            onEnter: (s) => {
                s.flankSpot = scene.GetFlankPosition(scene.target.position);
            },
            onUpdate: (dt, s) => {
                s.inCover = false;
                s.statusBanner = "Flanking wide to negate target cover...";
                if (s.MoveTowards(s.flankSpot, dt)) {
                    scene.target.inCover = false; // Flanking angle exposes target

                    return GOAPStatus.SUCCESS;
                }

                return GOAPStatus.RUNNING;
            }
        });

        // Action 4: Move to tactical cover
        const takeCover = new GOAPAction('TakeCover', {
            cost: 2,
            preconditions: {},
            effects: { inCover: true },
            onEnter: (s) => {
                s.targetCover = scene.FindBestCoverForSoldier(s.position, scene.target.position);
            },
            onUpdate: (dt, s) => {
                s.statusBanner = "Moving to tactical barricade cover...";
                if (s.MoveTowards(s.targetCover, dt)) {
                    s.inCover = true;

                    return GOAPStatus.SUCCESS;
                }

                return GOAPStatus.RUNNING;
            }
        });

        // Action 5: Reload weapon from reserve ammo
        const reloadWeapon = new GOAPAction('ReloadWeapon', {
            cost: 2,
            preconditions: { hasAmmo: true, weaponLoaded: false },
            effects: { weaponLoaded: true },
            proceduralPrecondition: (s) => s.reserveAmmo > 0,
            onEnter: (s) => { s.workTimer = 0; },
            onUpdate: (dt, s) => {
                s.workTimer += dt;
                s.workProgress = Math.min(1, s.workTimer / 0.85);
                s.statusBanner = "Reloading rifle magazine...";
                if (s.workTimer >= 0.85) {
                    const needed = s.maxClip - s.clip;
                    const loaded = Math.min(needed, s.reserveAmmo);
                    s.clip += loaded;
                    s.reserveAmmo -= loaded;
                    s.workProgress = 0;
                    scene.SpawnFloatingText("RELOADED!", s.position.x, s.position.y - 25, '#66ccff');
                    
                    return GOAPStatus.SUCCESS;
                }

                return GOAPStatus.RUNNING;
            }
        });

        // Action 6: Resupply at an Ammo Crate
        const pickupAmmo = new GOAPAction('PickupAmmo', {
            cost: 4,
            preconditions: { hasAmmo: false },
            effects: { hasAmmo: true },
            proceduralPrecondition: () => scene.ammoCratesAvailable,
            onEnter: (s) => { s.workTimer = 0; },
            onUpdate: (dt, s) => {
                if (!scene.ammoCratesAvailable)
                    return GOAPStatus.FAILURE;

                s.inCover = false;
                s.statusBanner = "Sprinting to Ammo Crate to resupply...";
                if (s.MoveTowards(scene.landmarks.ammoCrate, dt)) {
                    s.workTimer += dt;
                    s.workProgress = Math.min(1, s.workTimer / 0.5);
                    if (s.workTimer >= 0.5) {
                        s.reserveAmmo = 12;
                        s.workProgress = 0;
                        scene.SpawnFloatingText("+12 AMMO", s.position.x, s.position.y - 25, '#ffcc44');
                        
                        return GOAPStatus.SUCCESS;
                    }
                }

                return GOAPStatus.RUNNING;
            }
        });

        // Action 7: Desperate Melee Charge (high cost = 9, only chosen when out of ammo & crates unavailable!)
        const meleeCharge = new GOAPAction('MeleeCharge', {
            cost: 9,
            preconditions: { targetVisible: true },
            effects: { targetDead: true },
            onUpdate: (dt, s) => {
                const target = scene.target;
                s.inCover = false;
                s.statusBanner = "OUT OF AMMO! Charging target for melee takedown!";
                if (s.MoveTowards(target.position, dt, 26)) {
                    target.TakeDamage(100);
                    scene.SpawnFloatingText("MELEE TAKEDOWN!", target.position.x, target.position.y - 25, '#ff5555');
                    
                    return GOAPStatus.SUCCESS;
                }

                return GOAPStatus.RUNNING;
            }
        });

        // Action 8: Heal at Medkit Station
        const healWithMedkit = new GOAPAction('HealWithMedkit', {
            cost: 2,
            preconditions: { lowHealth: true },
            effects: { lowHealth: false },
            onEnter: (s) => { s.workTimer = 0; },
            onUpdate: (dt, s) => {
                s.inCover = false;
                s.statusBanner = "Retreating to Medkit Station for emergency trauma heal!";
                if (s.MoveTowards(scene.landmarks.medkit, dt)) {
                    s.workTimer += dt;
                    s.workProgress = Math.min(1, s.workTimer / 0.7);
                    if (s.workTimer >= 0.7) {
                        s.hp = s.maxHp;
                        s.workProgress = 0;
                        scene.SpawnFloatingText("+100 HP HEALED", s.position.x, s.position.y - 25, '#55ff88');
                        
                        return GOAPStatus.SUCCESS;
                    }
                }

                return GOAPStatus.RUNNING;
            }
        });

        // Action 9: Recon Scan to spot cloaked/hidden target
        const reconScan = new GOAPAction('ReconScan', {
            cost: 3,
            preconditions: { targetVisible: false },
            effects: { targetVisible: true },
            onEnter: (s) => { s.workTimer = 0; },
            onUpdate: (dt, s) => {
                s.workTimer += dt;
                s.workProgress = Math.min(1, s.workTimer / 0.8);
                s.statusBanner = "Running thermal recon pulse to reveal target...";
                if (s.workTimer >= 0.8) {
                    scene.target.cloaked = false;
                    s.workProgress = 0;
                    scene.SpawnFloatingText("TARGET SPOTTED!", s.position.x, s.position.y - 25, '#66e0ff');
                    
                    return GOAPStatus.SUCCESS;
                }

                return GOAPStatus.RUNNING;
            }
        });

        // Action 10: Patrol Arena when target is neutralized
        const patrolArena = new GOAPAction('PatrolSweep', {
            cost: 2,
            preconditions: {},
            effects: { patrolled: true },
            onEnter: (s) => {
                s.patrolIdx = ((s.patrolIdx || 0) + 1) % scene.patrolWaypoints.length;
            },
            onUpdate: (dt, s) => {
                const wp = scene.patrolWaypoints[s.patrolIdx || 0];
                s.statusBanner = "Target neutralized. Sweeping sector perimeter...";
                if (s.MoveTowards(wp, dt)) {
                    s.patrolIdx = ((s.patrolIdx || 0) + 1) % scene.patrolWaypoints.length;
                }

                return GOAPStatus.RUNNING;
            }
        });

        agent.AddActions([
            shootTarget,
            flushGrenade,
            flankTarget,
            takeCover,
            reloadWeapon,
            pickupAmmo,
            meleeCharge,
            healWithMedkit,
            reconScan,
            patrolArena
        ]);

        return agent;
    }

    MoveTowards(targetPos, dt, stopDist = 14) {
        const dx = targetPos.x - this.position.x;
        const dy = targetPos.y - this.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= stopDist)
            return true;

        const step = Math.min(dist, this.speed * dt);
        this.position.x += (dx / dist) * step;
        this.position.y += (dy / dist) * step;
        return dist - step <= stopDist;
    }

    Update(dt) {
        super.Update(dt);
        this.goap.Update(dt);
    }

    Draw(renderer) {
        if (!TacticalSoldier._colors) {
            TacticalSoldier._colors = {
                shadow: new Color(0, 0, 0, 0.35),
                visionFill: new Color(96, 165, 250, 0.08),
                visionStroke: new Color(96, 165, 250, 0.22),
                coverHalo: new Color(80, 200, 255, 0.65),
                bodyNormal: Color.FromHex('#3b82f6'),
                bodyLowHp: Color.FromHex('#ff6655'),
                visor: Color.FromHex('#93c5fd'),
                hpBg: new Color(0, 0, 0, 0.7),
                hpOk: Color.FromHex('#44dd88'),
                hpLow: Color.FromHex('#ff5555'),
                progress: Color.FromHex('#ffcc33')
            };
        }
        const c = TacticalSoldier._colors;

        // Ground shadow ellipse
        renderer.DrawFillEllipse(this.position.x, this.position.y + 11, 14, 5, c.shadow);

        // Tactical FOV vision cone toward target
        const target = this.scene.target;
        const angle = Math.atan2(target.position.y - this.position.y, target.position.x - this.position.x);
        renderer.DrawFillArc(this.position.x, this.position.y, 85, angle - 0.38, angle + 0.38, c.visionFill);
        renderer.DrawStrokeArc(this.position.x, this.position.y, 85, angle - 0.38, angle + 0.38, c.visionStroke, 1);

        // Cover shield halo
        if (this.inCover) {
            renderer.DrawStrokeCircle(this.position.x, this.position.y, 20, c.coverHalo, 2.5);
        }

        // Soldier body
        renderer.DrawFillCircle(this.position.x, this.position.y, 13, this.hp <= 40 ? c.bodyLowHp : c.bodyNormal);
        renderer.DrawStrokeCircle(this.position.x, this.position.y, 13, Color.white, 2);

        // Visor facing target
        renderer.DrawFillCircle(this.position.x + Math.cos(angle) * 6, this.position.y + Math.sin(angle) * 6, 4.5, c.visor);

        // HP bar above soldier
        const bw = 34;
        renderer.DrawFillBasicRectangle(this.position.x - bw / 2, this.position.y - 26, bw, 5, c.hpBg);
        renderer.DrawFillBasicRectangle(this.position.x - bw / 2, this.position.y - 26, bw * (this.hp / this.maxHp), 5, this.hp <= 40 ? c.hpLow : c.hpOk);

        // Progress bar if performing timed action
        if (this.workProgress > 0 && this.workProgress < 1) {
            renderer.DrawFillBasicRectangle(this.position.x - bw / 2, this.position.y - 33, bw * this.workProgress, 4, c.progress);
        }

        // GOAP Floating Label
        this.goap.DrawDebug(renderer, this.position.x, this.position.y - 36);
    }
}

class TacticalTarget {
    static _colors = {
        shadow: new Color(0, 0, 0, 0.35),
        deadCross: Color.FromHex('#774444'),
        deadText: Color.FromHex('#aa6666'),
        coverHalo: new Color(1, 0.745, 0.235, 0.8),
        bodyNormal: new Color(0.937, 0.27, 0.27, 1.0),
        bodyCloaked: new Color(0.937, 0.27, 0.27, 0.35),
        strokeCloaked: new Color(1, 1, 1, 0.35),
        hpBg: new Color(0, 0, 0, 0.75),
        hpFill: Color.FromHex('#ff6666'),
        label: Color.FromHex('#fca5a5')
    };

    constructor(x, y) {
        this.position = new Vector2(x, y);
        this.hp = 100;
        this.maxHp = 100;
        this.inCover = true;
        this.cloaked = false;
    }

    TakeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
    }

    FlushFromCover() {
        this.inCover = false;
    }

    Draw(renderer) {
        const c = TacticalTarget._colors;

        if (this.hp <= 0) {
            renderer.DrawLine(this.position.x - 10, this.position.y - 10, this.position.x + 10, this.position.y + 10, c.deadCross, 3);
            renderer.DrawLine(this.position.x + 10, this.position.y - 10, this.position.x - 10, this.position.y + 10, c.deadCross, 3);
            renderer.DrawFillText('TARGET DOWN ([R] Respawn)', this.position.x, this.position.y + 24, 'bold 10px monospace', c.deadText, 'center', 'alphabetic');
            return;
        }

        renderer.DrawFillEllipse(this.position.x, this.position.y + 11, 14, 5, c.shadow);

        if (this.inCover) {
            renderer.DrawStrokeCircle(this.position.x, this.position.y, 21, c.coverHalo, 2);
        }

        const bodyCol = this.cloaked ? c.bodyCloaked : c.bodyNormal;
        const strokeCol = this.cloaked ? c.strokeCloaked : Color.white;
        renderer.DrawFillCircle(this.position.x, this.position.y, 13, bodyCol);
        renderer.DrawStrokeCircle(this.position.x, this.position.y, 13, strokeCol, 2);

        // HP bar
        const bw = 34;
        renderer.DrawFillBasicRectangle(this.position.x - bw / 2, this.position.y - 25, bw, 5, c.hpBg);
        renderer.DrawFillBasicRectangle(this.position.x - bw / 2, this.position.y - 25, bw * (this.hp / this.maxHp), 5, c.hpFill);

        const tag = this.inCover ? 'TARGET [IN COVER]' : (this.cloaked ? 'TARGET [CLOAKED]' : 'TARGET [EXPOSED]');
        renderer.DrawFillText(tag, this.position.x, this.position.y + 26, 'bold 10px monospace', c.label, 'center', 'alphabetic');
    }
}

class GOAPCombatScene extends Game {
    static _colors = {
        bg: Color.FromHex('#0b101b'),
        headerBg: Color.FromHex('#111927'),
        headerTitle: Color.FromHex('#60a5fa'),
        headerSub: Color.FromHex('#94a3b8'),
        arenaBg: Color.FromHex('#141e30'),
        arenaBorder: Color.FromHex('#2d3f5e'),
        barricadeFill: Color.FromHex('#334155'),
        barricadeStroke: Color.FromHex('#64748b'),
        crateReady: Color.FromHex('#f59e0b'),
        crateEmpty: Color.FromHex('#475569'),
        medkit: Color.FromHex('#10b981'),
        landmarkText: Color.FromHex('#e2e8f0'),
        grenadeBlast: new Color(1, 0.55, 0.16, 0.55),
        hudBg: new Color(0.04, 0.06, 0.1, 0.85),
        btnBg: Color.FromHex('#1e293b'),
        btnStroke: Color.FromHex('#475569'),
        btnText: Color.FromHex('#f8fafc')
    };

    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth: 980,
            screenHeight: 560,
            fillWindow: false
        });

        this.landmarks = {
            ammoCrate: { x: 100, y: 425, label: 'Ammo Crate', color: '#f59e0b' },
            medkit:    { x: 425, y: 425, label: 'Medkit Station', color: '#10b981' }
        };
        this.barricades = [
            { x: 185, y: 170, w: 145, h: 18 },
            { x: 165, y: 310, w: 175, h: 18 }
        ];
        this.coverNodes = [
            { x: 255, y: 345, label: 'South Bunker' },
            { x: 130, y: 245, label: 'West Pillar' },
            { x: 390, y: 245, label: 'East Pillar' }
        ];
        this.patrolWaypoints = [
            { x: 110, y: 140 },
            { x: 410, y: 140 },
            { x: 410, y: 370 },
            { x: 110, y: 370 }
        ];
        this.ammoCratesAvailable = true;
        this.projectiles = [];
        this.floatingTexts = [];
        this.buttons = [];
    }

    Start() {
        super.Start();
        this.projectiles = [];
        this.floatingTexts = [];
        this.ammoCratesAvailable = true;

        this.target = new TacticalTarget(255, 135);
        this.soldier = new TacticalSoldier(new Vector2(255, 345), this);
        this.soldier.inCover = true;
        this.gameObjects = [this.soldier];
        this.soldier.goap.Plan('Initial Combat Plan');

        this.SetupButtons();
    }

    SetupButtons() {
        const y = 510;
        const h = 34;
        this.buttons = [
            { key: '1', label: '[1] Hurt Soldier (-65 HP)', x: 20,  y, w: 145, h, action: () => this.HurtSoldier() },
            { key: '2', label: '[2] Empty Clip',            x: 173, y, w: 105, h, action: () => this.EmptyClip() },
            { key: '3', label: '[3] Empty All Ammo',        x: 286, y, w: 125, h, action: () => this.EmptyAllAmmo() },
            { key: '4', label: '[4] Toggle Target Cover',   x: 419, y, w: 145, h, action: () => this.ToggleTargetCover() },
            { key: '5', label: '[5] Toggle Grenades',       x: 572, y, w: 130, h, action: () => this.ToggleGrenades() },
            { key: '6', label: '[6] Toggle Ammo Crate',     x: 710, y, w: 140, h, action: () => this.ToggleAmmoCrates() },
            { key: 'R', label: '[R] Reset Arena',           x: 858, y, w: 102, h, action: () => this.ResetArena() }
        ];
    }

    FindBestCoverForSoldier(soldierPos) {
        let best = this.coverNodes[0];
        let bestDist = Infinity;
        for (const node of this.coverNodes) {
            const d = Math.hypot(node.x - soldierPos.x, node.y - soldierPos.y);
            if (d < bestDist) {
                bestDist = d;
                best = node;
            }
        }
        return best;
    }

    GetFlankPosition(targetPos) {
        return { x: targetPos.x > 260 ? 110 : 410, y: targetPos.y + 15 };
    }

    HurtSoldier() {
        this.soldier.hp = Math.max(15, this.soldier.hp - 65);
        this.soldier.inCover = false;
        this.SpawnFloatingText("-65 HP! CRITICAL!", this.soldier.position.x, this.soldier.position.y - 25, '#ff4444');
        this.soldier.goap.Plan();
    }

    EmptyClip() {
        this.soldier.clip = 0;
        this.SpawnFloatingText("CLIP EMPTY!", this.soldier.position.x, this.soldier.position.y - 25, '#ffcc44');
        this.soldier.goap.Plan();
    }

    EmptyAllAmmo() {
        this.soldier.clip = 0;
        this.soldier.reserveAmmo = 0;
        this.SpawnFloatingText("OUT OF ALL AMMO!", this.soldier.position.x, this.soldier.position.y - 25, '#ff6644');
        this.soldier.goap.Plan();
    }

    ToggleTargetCover() {
        if (this.target.hp <= 0)
            this.target.hp = 100;

        this.target.inCover = !this.target.inCover;
        this.SpawnFloatingText(this.target.inCover ? "TARGET IN COVER" : "TARGET EXPOSED", this.target.position.x, this.target.position.y - 25, '#ffbb33');
        this.soldier.goap.Plan();
    }

    ToggleGrenades() {
        this.soldier.grenades = this.soldier.grenades > 0 ? 0 : 2;
        this.SpawnFloatingText(`GRENADES: ${this.soldier.grenades}`, this.soldier.position.x, this.soldier.position.y - 25, '#66e0ff');
        this.soldier.goap.Plan();
    }

    ToggleAmmoCrates() {
        this.ammoCratesAvailable = !this.ammoCratesAvailable;
        this.SpawnFloatingText(this.ammoCratesAvailable ? "CRATE ACTIVE" : "CRATE DEPLETED", this.landmarks.ammoCrate.x, this.landmarks.ammoCrate.y - 20, '#f59e0b');
        this.soldier.goap.Plan();
    }

    ResetArena() {
        this.target.hp = 100;
        this.target.inCover = true;
        this.target.cloaked = false;
        this.soldier.hp = 100;
        this.soldier.clip = 6;
        this.soldier.reserveAmmo = 12;
        this.soldier.grenades = 2;
        this.soldier.inCover = true;
        this.soldier.position.Set(255, 345);
        this.ammoCratesAvailable = true;
        this.soldier.goap.Plan();
    }

    SpawnBullet(x1, y1, x2, y2, color) {
        const col = typeof color === 'string' ? Color.FromHex(color) : color;
        this.projectiles.push({ type: 'bullet', x1, y1, x2, y2, color: col, timer: 0.18 });
    }

    SpawnGrenade(x1, y1, x2, y2) {
        this.projectiles.push({ type: 'grenade', x: x2, y: y2, timer: 0.45 });
    }

    SpawnFloatingText(text, x, y, color = '#ffffff') {
        const col = typeof color === 'string' ? Color.FromHex(color) : color;
        this.floatingTexts.push({ text, x, y, color: col, timer: 1.2 });
    }

    Update(dt) {
        super.Update(dt);

        if (Input.IsKeyDown(KEY_1)) this.HurtSoldier();
        if (Input.IsKeyDown(KEY_2)) this.EmptyClip();
        if (Input.IsKeyDown(KEY_3)) this.EmptyAllAmmo();
        if (Input.IsKeyDown(KEY_4)) this.ToggleTargetCover();
        if (Input.IsKeyDown(KEY_5)) this.ToggleGrenades();
        if (Input.IsKeyDown(KEY_6)) this.ToggleAmmoCrates();
        if (Input.IsKeyDown(KEY_R)) this.ResetArena();

        if (Input.IsMouseDown()) {
            const mx = Input.mouse.x;
            const my = Input.mouse.y;
            for (const btn of this.buttons) {
                if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                    btn.action();
                }
            }
        }

        // Update visual effects
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].timer -= dt;
            if (this.projectiles[i].timer <= 0)
                this.projectiles.splice(i, 1);
        }
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].y -= 22 * dt;
            this.floatingTexts[i].timer -= dt;
            if (this.floatingTexts[i].timer <= 0)
                this.floatingTexts.splice(i, 1);
        }
    }

    Draw() {
        const r = this.renderer;
        const c = GOAPCombatScene._colors;

        // Background
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, c.bg);

        // Header bar
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, 46, c.headerBg);
        r.DrawFillText('GOAP DEMO 2: F.E.A.R. Tactical Combat Squad (Forward State-Space A*)', 20, 20, 'bold 15px monospace', c.headerTitle, 'left', 'alphabetic');
        r.DrawFillText(this.soldier.statusBanner, 20, 38, '11px monospace', c.headerSub, 'left', 'alphabetic');

        // Tactical Arena viewport
        r.DrawFillBasicRoundRectangle(20, 55, 495, 440, 6, c.arenaBg);
        r.DrawStrokeBasicRoundRectangle(20, 55, 495, 440, 6, c.arenaBorder, 2);

        // Draw Barricades
        for (const b of this.barricades) {
            r.DrawFillBasicRoundRectangle(b.x, b.y, b.w, b.h, 4, c.barricadeFill);
            r.DrawStrokeBasicRoundRectangle(b.x, b.y, b.w, b.h, 4, c.barricadeStroke, 1);
        }

        // Draw Landmarks (Ammo Crate & Medkit)
        const crate = this.landmarks.ammoCrate;
        r.DrawFillBasicRoundRectangle(crate.x - 14, crate.y - 12, 28, 24, 4, this.ammoCratesAvailable ? c.crateReady : c.crateEmpty);
        r.DrawFillText(this.ammoCratesAvailable ? 'Ammo Crate' : 'Crate Empty', crate.x, crate.y + 24, '10px monospace', c.landmarkText, 'center', 'alphabetic');

        const med = this.landmarks.medkit;
        r.DrawFillBasicRoundRectangle(med.x - 14, med.y - 12, 28, 24, 4, c.medkit);
        r.DrawFillText('Medkit', med.x, med.y + 24, '10px monospace', c.landmarkText, 'center', 'alphabetic');

        // Draw Target & Soldier
        this.target.Draw(r);
        super.Draw();

        // Draw Projectiles
        for (const p of this.projectiles) {
            if (p.type === 'bullet') {
                r.DrawLine(p.x1, p.y1, p.x2, p.y2, p.color, 2.5);
            }
            else if (p.type === 'grenade') {
                r.DrawFillCircle(p.x, p.y, 36 * (1 - p.timer), c.grenadeBlast);
            }
        }

        // Draw Floating Texts
        for (const ft of this.floatingTexts) {
            r.DrawFillText(ft.text, ft.x, ft.y, 'bold 11px monospace', ft.color, 'center', 'alphabetic');
        }

        // Soldier Equipment Bar inside Arena
        r.DrawFillBasicRoundRectangle(28, 62, 478, 28, 4, c.hudBg);
        r.DrawFillText(
            `SOLDIER HP: ${this.soldier.hp}/100 | CLIP: ${this.soldier.clip}/${this.soldier.maxClip} | RESERVE: ${this.soldier.reserveAmmo} | GRENADES: ${this.soldier.grenades} | CRATE: ${this.ammoCratesAvailable ? 'READY' : 'EMPTY'}`,
            36, 80, '11px monospace', c.landmarkText, 'left', 'alphabetic'
        );

        // Draw Interactive Sandbox Buttons
        for (const btn of this.buttons) {
            r.DrawFillBasicRoundRectangle(btn.x, btn.y, btn.w, btn.h, 5, c.btnBg);
            r.DrawStrokeBasicRoundRectangle(btn.x, btn.y, btn.w, btn.h, 5, c.btnStroke, 1.5);
            r.DrawFillText(btn.label, btn.x + btn.w / 2, btn.y + 21, '11px monospace', c.btnText, 'center', 'alphabetic');
        }

        // Draw GOAP Inspector Panel on the Right
        DrawGOAPInspector(r, this.soldier.goap, 530, 55, {
            width: 430,
            title: 'GOAP TACTICAL INSPECTOR (F.E.A.R. AI)'
        });
    }
}

window.onload = () => {
    Init(GOAPCombatScene, 'canvas');
};
