// ============================================================================
// spark.js — GOAP Demo 1: Autonomous Survival Crafter & Economy
// ============================================================================
// Demonstrates STRIPS / F.E.A.R.-style Goal-Oriented Action Planning (GOAP)
// in a wilderness survival scenario inspired by Jeff Orkin's Lumberjack/Blacksmith
// and Don't Starve.
//
// Pedagogical Highlights:
//   1. Multiple competing action chains with different total costs to satisfy
//      the same Goal (e.g. StayFed via CookSteak [cost 5] vs ForageBerries [cost 9]).
//   2. Multi-hop tool acquisition: GrabSpareAxe (cost 1) vs MineIronOre (2) + ForgeIronAxe (2)
//      vs SnapBranchesByHand (cost 8).
//   3. Dynamic Goal Preemption: Triggering a Rainstorm chills the survivor and
//      extinguishes the campfire, immediately preempting lower-priority goals.
//   4. Live A* Planner Inspector (`DrawGOAPInspector`) showing symbolic World State,
//      ranked Goals, and the synthesized Action Plan pipeline.
// ============================================================================

debugMode = true;

class SurvivorAgent extends GameObject {
    constructor(gameInstance) {
        super(new Vector2(380, 390), 0, 1);
        
        this.speed = 155;
        this.radius = 16;

        // Continuous vital meters (0..100, where 100 = full/warm)
        this.fullness = 30;      // < 45 triggers isHungry = true
        this.warmth = 75;        // < 45 triggers isCold = true
        this.cabinProgress = 0;  // 0..100%

        // Inventory & tool state
        this.hasAxe = false;
        this.axeDurability = 0;
        this.hasIronOre = false;
        this.hasFirewood = false;
        this.hasRawMeat = false;

        // Current action progress timer for visual bar above head
        this.actionTimer = 0;
        this.actionDuration = 1.0;
        this.targetStation = null;
        this.statusMessage = 'Initializing GOAP Planner...';
        this.eventLog = [];

        this._setupGOAP();
    }

    LogEvent(msg) {
        this.eventLog.unshift(msg);

        if (this.eventLog.length > 5)
            this.eventLog.pop();
    }

    /**
     * Helper to move toward a named world station and wait `workSeconds` once arrived.
     */
    _moveAndWork(dt, stationKey, workSeconds, onComplete) {
        const st = this.game.stations[stationKey];
        if (!st)
            return GOAPStatus.FAILURE;

        this.targetStation = st;
        const dx = st.x - this.position.x;
        const dy = st.y - this.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 22) {
            const step = Math.min(dist, this.speed * dt);
            this.position.x += (dx / dist) * step;
            this.position.y += (dy / dist) * step;
            this.actionDuration = workSeconds;

            return GOAPStatus.RUNNING;
        }

        // Arrived at station — perform timed work
        this.actionDuration = workSeconds;
        this.actionTimer += dt;
        if (this.actionTimer >= workSeconds) {
            this.actionTimer = 0;
            onComplete();

            return GOAPStatus.SUCCESS;
        }

        return GOAPStatus.RUNNING;
    }

    _setupGOAP() {
        this.goap = new GOAPAgent(this, {
            initialState: {
                isHungry: true,
                isCold: false,
                hasAxe: false,
                hasIronOre: false,
                hasFirewood: false,
                hasRawMeat: false,
                campfireLit: false,
                cabinBuilt: false
            },
            onUpdateSensors: (owner, ws) => {
                ws.Set('isHungry', owner.fullness < 45);
                ws.Set('isCold', owner.warmth < 45);
                ws.Set('hasAxe', owner.hasAxe);
                ws.Set('hasIronOre', owner.hasIronOre);
                ws.Set('hasFirewood', owner.hasFirewood);
                ws.Set('hasRawMeat', owner.hasRawMeat);
                ws.Set('campfireLit', owner.game.campfireLit);
                ws.Set('cabinBuilt', owner.cabinProgress >= 100);
            }
        });

        // ── 1. Define Goals ─────────────────────────────────────────────
        this.goap.AddGoals([
            new GOAPGoal(
                'StayWarm',
                { isCold: false },
                (owner, ws) => ws.Get('isCold') ? 92 : 10
            ),
            new GOAPGoal(
                'StayFed',
                { isHungry: false },
                (owner, ws) => ws.Get('isHungry') ? 78 : 15
            ),
            new GOAPGoal(
                'BuildCabin',
                { cabinBuilt: true },
                40
            )
        ]);

        // ── 2. Define Actions (10 decoupled atomic actions) ─────────────

        // Tool Acquisition Path A: Grab free spare axe from Tool Rack (Cost: 1)
        const grabSpareAxe = new GOAPAction('GrabSpareAxe', {
            cost: 1.0,
            preconditions: { hasAxe: false },
            effects: { hasAxe: true },
            checkProcedural: (owner) => owner.game.rackHasAxe,
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => owner._moveAndWork(dt, 'rack', 0.6, () => {
                if (!owner.game.rackHasAxe)
                    return;

                owner.game.rackHasAxe = false;
                owner.hasAxe = true;
                owner.axeDurability = 3;
                owner.LogEvent('Picked up spare Axe from Tool Rack (cost: 1)');
            })
        });

        // Tool Acquisition Path B: Mine Iron Ore (Cost: 2) -> Forge Iron Axe (Cost: 2)
        const mineIronOre = new GOAPAction('MineIronOre', {
            cost: 2.0,
            preconditions: { hasIronOre: false, hasAxe: false },
            effects: { hasIronOre: true },
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => owner._moveAndWork(dt, 'mine', 1.1, () => {
                owner.hasIronOre = true;
                owner.LogEvent('Mined Iron Ore at quarry (cost: 2)');
            })
        });

        const forgeIronAxe = new GOAPAction('ForgeIronAxe', {
            cost: 2.0,
            preconditions: { hasIronOre: true, hasAxe: false },
            effects: { hasAxe: true, hasIronOre: false },
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => owner._moveAndWork(dt, 'anvil', 1.2, () => {
                owner.hasIronOre = false;
                owner.hasAxe = true;
                owner.axeDurability = 4;
                owner.LogEvent('Forged new Iron Axe at Anvil (cost: 2)');
            })
        });

        // Wood Gathering Path A: Chop Tree with Axe (Cost: 2)
        const chopTreeWithAxe = new GOAPAction('ChopTreeWithAxe', {
            cost: 2.0,
            preconditions: { hasAxe: true, hasFirewood: false },
            effects: { hasFirewood: true },
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => {
                if (!owner.hasAxe)
                    return GOAPStatus.FAILURE;

                return owner._moveAndWork(dt, 'forest', 1.0, () => {
                    owner.hasFirewood = true;
                    owner.axeDurability--;
                    if (owner.axeDurability <= 0) {
                        owner.hasAxe = false;
                        owner.LogEvent('Axe broke after chopping firewood!');
                    }
                    else {
                        owner.LogEvent(`Chopped firewood with Axe (${owner.axeDurability} uses left)`);
                    }
                });
            }
        });

        // Wood Gathering Path B: Snap Branches by Hand (No axe required, high Cost: 8)
        const snapBranchesByHand = new GOAPAction('SnapBranchesByHand', {
            cost: 8.0,
            preconditions: { hasFirewood: false },
            effects: { hasFirewood: true },
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => owner._moveAndWork(dt, 'forest', 2.0, () => {
                owner.hasFirewood = true;
                owner.LogEvent('Gathered twigs by bare hands (slow, cost: 8)');
            })
        });

        // Fire Management: Light Campfire (Cost: 1)
        const lightCampfire = new GOAPAction('LightCampfire', {
            cost: 1.0,
            preconditions: { hasFirewood: true, campfireLit: false },
            effects: { campfireLit: true, hasFirewood: false },
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => owner._moveAndWork(dt, 'campfire', 0.8, () => {
                owner.hasFirewood = false;
                owner.game.campfireLit = true;
                owner.game.campfireTimer = 28;
                owner.LogEvent('Lit the central Campfire!');
            })
        });

        // Warmth Action: Warm Up at Lit Campfire (Cost: 1)
        const warmUpAtFire = new GOAPAction('WarmUpAtFire', {
            cost: 1.0,
            preconditions: { campfireLit: true },
            effects: { isCold: false },
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => {
                if (!owner.game.campfireLit)
                    return GOAPStatus.FAILURE;

                return owner._moveAndWork(dt, 'campfire', 1.1, () => {
                    owner.warmth = 100;
                    owner.LogEvent('Warmed up by the roaring Campfire (+Warmth)');
                });
            }
        });

        // Food Path A: Hunt Raw Meat (Cost: 2) -> Cook & Eat Steak at Fire (Cost: 1)
        const huntRawMeat = new GOAPAction('HuntRawMeat', {
            cost: 2.0,
            preconditions: { hasRawMeat: false },
            effects: { hasRawMeat: true },
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => owner._moveAndWork(dt, 'hunting', 1.0, () => {
                owner.hasRawMeat = true;
                owner.LogEvent('Hunted fresh game meat (cost: 2)');
            })
        });

        const cookAndEatSteak = new GOAPAction('CookAndEatSteak', {
            cost: 1.0,
            preconditions: { hasRawMeat: true, campfireLit: true },
            effects: { isHungry: false, hasRawMeat: false },
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => {
                if (!owner.game.campfireLit)
                    return GOAPStatus.FAILURE;

                return owner._moveAndWork(dt, 'campfire', 1.0, () => {
                    owner.hasRawMeat = false;
                    owner.fullness = 100;
                    owner.warmth = Math.min(100, owner.warmth + 15);
                    owner.LogEvent('Cooked & ate hot Steak at Campfire! (+Fullness)');
                });
            }
        });

        // Food Path B: Forage Wild Berries (No fire/tools needed, high Cost: 9.5)
        const forageWildBerries = new GOAPAction('ForageWildBerries', {
            cost: 9.5,
            preconditions: {},
            effects: { isHungry: false },
            checkProcedural: (owner) => owner.game.berriesAvailable,
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => {
                if (!owner.game.berriesAvailable)
                    return GOAPStatus.FAILURE;

                return owner._moveAndWork(dt, 'berries', 1.8, () => {
                    owner.fullness = 85;
                    owner.LogEvent('Foraged raw Wild Berries (fallback cost: 9.5)');
                });
            }
        });

        // Shelter Action: Build Log Cabin (requires Axe + Firewood, Cost: 2)
        const constructCabin = new GOAPAction('ConstructLogCabin', {
            cost: 2.0,
            preconditions: { hasAxe: true, hasFirewood: true },
            effects: { cabinBuilt: true, hasFirewood: false },
            onEnter: (owner) => { owner.actionTimer = 0; },
            onUpdate: (dt, owner) => {
                if (!owner.hasAxe || !owner.hasFirewood)
                    return GOAPStatus.FAILURE;

                return owner._moveAndWork(dt, 'cabin', 1.3, () => {
                    owner.hasFirewood = false;
                    owner.cabinProgress = Math.min(100, owner.cabinProgress + 50);
                    owner.axeDurability--;

                    if (owner.axeDurability <= 0)
                        owner.hasAxe = false;

                    if (owner.cabinProgress >= 100) {
                        owner.LogEvent('Completed the Log Cabin shelter! (100%)');
                    }
                    else {
                        owner.LogEvent(`Built Cabin framework (${owner.cabinProgress}%)`);
                    }
                });
            }
        });

        this.goap.AddActions([
            grabSpareAxe,
            mineIronOre,
            ForgeIronAxeFix(forgeIronAxe),
            chopTreeWithAxe,
            snapBranchesByHand,
            lightCampfire,
            warmUpAtFire,
            huntRawMeat,
            cookAndEatSteak,
            forageWildBerries,
            constructCabin
        ]);
    }

    Update(dt) {
        super.Update(dt);

        // Passive survival drain
        this.fullness = Math.max(0, this.fullness - dt * 2.2);
        const coldDrain = this.game.isRaining ? 5.5 : (this.game.campfireLit ? 1.2 : 2.8);
        this.warmth = Math.max(0, this.warmth - dt * coldDrain);

        // Reset cabin after a short celebration so the agent stays active in the sandbox
        if (this.cabinProgress >= 100) {
            this._cabinResetTimer = (this._cabinResetTimer || 0) + dt;
            if (this._cabinResetTimer > 6.0) {
                this.cabinProgress = 0;
                this._cabinResetTimer = 0;
                this.LogEvent('New cabin upgrade stage unlocked!');
            }
        }

        this.goap.Update(dt);
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        // Draw dashed movement line to target station
        if (this.targetStation) {
            renderer.DrawDashedLine(x, y, this.targetStation.x, this.targetStation.y, new Color(0.98, 0.80, 0.08, 0.45), 2, [5, 5]);
        }

        // Survivor shadow & body
        renderer.DrawFillEllipse(x, y + 14, 15, 7, new Color(0, 0, 0, 0.35));

        const bodyColor = this.warmth < 45 ? Color.FromHex('#38bdf8') : Color.FromHex('#f59e0b');
        const ringColor = Color.FromHex('#fef08a');
        renderer.DrawFillCircle(x, y, this.radius, bodyColor);
        renderer.DrawStrokeCircle(x, y, this.radius, ringColor, 2.5);

        // Carried item badges around survivor
        const badgeFont = '13px sans-serif';
        if (this.hasAxe)
            renderer.DrawFillText('🪓', x + 18, y - 8, badgeFont, Color.white, 'center', 'alphabetic');
        if (this.hasFirewood)
            renderer.DrawFillText('🪵', x - 18, y - 8, badgeFont, Color.white, 'center', 'alphabetic');
        if (this.hasRawMeat)
            renderer.DrawFillText('🥩', x + 18, y + 14, badgeFont, Color.white, 'center', 'alphabetic');
        if (this.hasIronOre)
            renderer.DrawFillText('🪨', x - 18, y + 14, badgeFont, Color.white, 'center', 'alphabetic');

        // Work progress bar when working at a station
        if (this.actionTimer > 0 && this.actionDuration > 0) {
            const pct = Math.min(1, this.actionTimer / this.actionDuration);
            const bw = 44;
            renderer.DrawFillBasicRectangle(x - bw / 2, y - 38, bw, 7, new Color(0.06, 0.09, 0.16, 0.85));
            renderer.DrawFillBasicRectangle(x - bw / 2 + 1, y - 37, (bw - 2) * pct, 5, Color.FromHex('#4ade80'));
        }

        // Draw overhead GOAP `[Goal] ▶ Action` debug tag
        this.goap.DrawDebug(renderer, x, y - 24, Color.yellow, true);
    }
}

function ForgeIronAxeFix(action) {
    return action;
}

// ============================================================================
// Main Demo Game Class
// ============================================================================

class GOAPSurvivalGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({
            screenWidth: 1180,
            screenHeight: 680,
            fillWindow: false
        });
    }

    Start() {
        super.Start();

        this.arenaWidth = 770;
        this.rackHasAxe = true;
        this.berriesAvailable = true;
        this.campfireLit = false;
        this.campfireTimer = 0;
        this.isRaining = false;
        this.rainTimer = 0;

        // Interactive world stations
        this.stations = {
            anvil:    { x: 130, y: 155, icon: '⚒️', name: 'Anvil Forge',    sub: 'ForgeIronAxe (c:2)', color: Color.FromHex('#94a3b8') },
            rack:     { x: 300, y: 145, icon: '🪓', name: 'Tool Rack',      sub: 'GrabSpareAxe (c:1)', color: Color.FromHex('#fbbf24') },
            forest:   { x: 585, y: 160, icon: '🌲', name: 'Pine Forest',    sub: 'Axe(c:2) / Hand(c:8)', color: Color.FromHex('#22c55e') },
            mine:     { x: 125, y: 345, icon: '⛏️', name: 'Iron Quarry',    sub: 'MineIronOre (c:2)', color: Color.FromHex('#64748b') },
            campfire: { x: 385, y: 335, icon: '🔥', name: 'Campfire Pit',   sub: 'Light / Cook / Warm', color: Color.FromHex('#f97316') },
            hunting:  { x: 625, y: 365, icon: '🦌', name: 'Hunting Grounds',sub: 'HuntRawMeat (c:2)', color: Color.FromHex('#ef4444') },
            berries:  { x: 155, y: 515, icon: '🫐', name: 'Berry Thicket',  sub: 'ForageBerries (c:9.5)', color: Color.FromHex('#a855f7') },
            cabin:    { x: 485, y: 520, icon: '🛖', name: 'Cabin Site',     sub: 'ConstructCabin (c:2)', color: Color.FromHex('#d97706') }
        };

        this.survivor = new SurvivorAgent(this);
        this.AddGameObject(this.survivor);

        // Interactive sandbox buttons along the bottom of the arena
        this.buttons = [
            {
                key: '1', label: '[1] Break Axe', x: 16, y: 632, w: 118, h: 34,
                action: () => {
                    this.survivor.hasAxe = false;
                    this.survivor.axeDurability = 0;
                    this.survivor.LogEvent('USER: Broke survivor Axe! Replanning...');
                    this.survivor.goap.Replan('User broke Axe');
                }
            },
            {
                key: '2', label: '[2] Rainstorm (Chill)', x: 140, y: 632, w: 155, h: 34,
                action: () => {
                    this.campfireLit = false;
                    this.campfireTimer = 0;
                    this.isRaining = true;
                    this.rainTimer = 6.0;
                    this.survivor.warmth = 20;
                    this.survivor.LogEvent('USER: Rainstorm doused fire & chilled survivor!');
                }
            },
            {
                key: '3', label: '[3] Make Hungry', x: 301, y: 632, w: 128, h: 34,
                action: () => {
                    this.survivor.fullness = 18;
                    this.survivor.LogEvent('USER: Drained survivor fullness!');
                }
            },
            {
                key: '4', label: '[4] Toggle Rack Axe', x: 435, y: 632, w: 148, h: 34,
                action: () => {
                    this.rackHasAxe = !this.rackHasAxe;
                    this.survivor.LogEvent(`USER: Tool Rack spare axe = ${this.rackHasAxe}`);
                    this.survivor.goap.Replan('Rack Axe toggled');
                }
            },
            {
                key: '5', label: '[5] Toggle Berries', x: 589, y: 632, w: 145, h: 34,
                action: () => {
                    this.berriesAvailable = !this.berriesAvailable;
                    this.survivor.LogEvent(`USER: Wild Berries available = ${this.berriesAvailable}`);
                    this.survivor.goap.Replan('Berries toggled');
                }
            }
        ];
    }

    Update(dt) {
        if (this.campfireLit) {
            this.campfireTimer -= dt;
            if (this.campfireTimer <= 0) {
                this.campfireLit = false;
                this.survivor.LogEvent('Campfire burned out naturally.');
            }
        }

        if (this.isRaining) {
            this.rainTimer -= dt;
            if (this.rainTimer <= 0) {
                this.isRaining = false;
            }
        }

        // Keyboard shortcuts
        if (Input.IsKeyDown(KEY_1))this.buttons[0].action();
        if (Input.IsKeyDown(KEY_2))this.buttons[1].action();
        if (Input.IsKeyDown(KEY_3))this.buttons[2].action();
        if (Input.IsKeyDown(KEY_4))this.buttons[3].action();
        if (Input.IsKeyDown(KEY_5))this.buttons[4].action();
        if (Input.IsKeyDown(KEY_R))this.Start();

        // Mouse clicks on sandbox buttons
        if (Input.IsMouseDown(0)) {
            const mx = Input.mouse.x;
            const my = Input.mouse.y;
            for (let i = 0; i < this.buttons.length; i++) {
                const b = this.buttons[i];
                if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                    b.action();
                }
            }
        }

        super.Update(dt);
    }

    Draw() {
        const r = this.renderer;

        // 1. Wilderness background
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.FromRGBA(15, 23, 34, 1));
        r.DrawFillBasicRoundRectangle(12, 54, this.arenaWidth - 20, 568, 8, Color.FromHex('#13221c'));
        r.DrawStrokeBasicRoundRectangle(12, 54, this.arenaWidth - 20, 568, 8, new Color(0.29, 0.87, 0.50, 0.25), 1.5);

        // Subtle grid lines
        const gridColor = new Color(1, 1, 1, 0.03);
        for (let gx = 40; gx < this.arenaWidth - 20; gx += 40) {
            r.DrawLine(gx, 54, gx, 622, gridColor, 1);
        }
        for (let gy = 80; gy < 622; gy += 40) {
            r.DrawLine(12, gy, this.arenaWidth - 8, gy, gridColor, 1);
        }

        // Top Title Banner
        r.DrawFillText('⚡ GOAP Demo 1: Autonomous Survival Crafter (A* Action Planning)', 16, 26, 'bold 16px monospace', Color.FromHex('#f8fafc'), 'left', 'alphabetic');
        r.DrawFillText('Break tools, douse the fire, or toggle resources to see the A* Planner synthesize new multi-step chains!', 16, 44, '12px monospace', Color.FromHex('#94a3b8'), 'left', 'alphabetic');

        // 2. Draw World Stations
        const stAvailBg = new Color(0.12, 0.16, 0.23, 0.9);
        const stUnavailBg = new Color(0.12, 0.16, 0.23, 0.35);
        const stUnavailBorder = Color.FromHex('#475569');
        const stTargetRing = new Color(0.98, 0.80, 0.08, 0.7);
        const stTitleAvail = Color.FromHex('#f1f5f9');
        const stTitleUnavail = Color.FromHex('#64748b');
        const stSubAvail = Color.FromHex('#94a3b8');
        const stSubUnavail = Color.FromHex('#ef4444');

        const stKeys = Object.keys(this.stations);
        for (let i = 0; i < stKeys.length; i++) {
            const key = stKeys[i];
            const st = this.stations[key];
            const isAvailable = (key === 'rack' ? this.rackHasAxe : key === 'berries' ? this.berriesAvailable : true);

            // Campfire warm aura when lit
            if (key === 'campfire' && this.campfireLit) {
                r.DrawFillCircle(st.x, st.y, 75, new Color(0.98, 0.57, 0.24, 0.14));
                r.DrawFillCircle(st.x, st.y, 50, new Color(0.98, 0.57, 0.24, 0.22));
            }

            // Glow ring if active target
            if (this.survivor.targetStation === st) {
                r.DrawStrokeCircle(st.x, st.y, 40, stTargetRing, 2.5);
            }

            // Station circle
            r.DrawFillCircle(st.x, st.y, 32, isAvailable ? stAvailBg : stUnavailBg);
            r.DrawStrokeCircle(st.x, st.y, 32, isAvailable ? st.color : stUnavailBorder, 2);

            r.DrawFillText(key === 'campfire' && !this.campfireLit ? '🪵' : st.icon, st.x, st.y + 8, '22px sans-serif', Color.white, 'center', 'alphabetic');

            // Station title + cost subtitle
            r.DrawFillText(st.name, st.x, st.y + 47, 'bold 11px monospace', isAvailable ? stTitleAvail : stTitleUnavail, 'center', 'alphabetic');

            const statusSuffix = key === 'rack'
                ? (this.rackHasAxe ? ' [READY]' : ' [EMPTY]')
                : key === 'berries'
                    ? (this.berriesAvailable ? ' [IN SEASON]' : ' [DEPLETED]')
                    : key === 'campfire'
                        ? (this.campfireLit ? ` [LIT ${Math.ceil(this.campfireTimer)}s]` : ' [UNLIT]')
                        : key === 'cabin'
                            ? ` [${this.survivor.cabinProgress}%]`
                            : '';
            r.DrawFillText(st.sub + statusSuffix, st.x, st.y + 60, '10px monospace', isAvailable ? stSubAvail : stSubUnavail, 'center', 'alphabetic');
        }

        // Rain visual effect
        if (this.isRaining) {
            const rainColor = new Color(0.22, 0.74, 0.97, 0.35);
            const t = performance.now() * 0.4;
            for (let ri = 0; ri < 35; ri++) {
                const rx = 25 + ((ri * 97 + t) % (this.arenaWidth - 50));
                const ry = 60 + ((ri * 61 + t * 1.7) % 540);
                r.DrawLine(rx, ry, rx - 6, ry + 16, rainColor, 1.5);
            }
        }

        // 3. Draw GameObjects (SurvivorAgent)
        super.Draw();

        // 4. Draw Vitals Bar + Event Log inside top-left of Arena
        this._drawSurvivorVitals(r);

        // 5. Draw Interactive Sandbox Buttons at bottom
        this._drawSandboxButtons(r);

        // 6. Draw Right-Side Live GOAP Inspector Panel
        this.survivor.goap.DrawGOAPInspector(r, 775, 14, {
            width: 390,
            title: 'Survivor GOAP Inspector'
        });

        // 7. Draw Cost Comparison Cheat-Sheet below the GOAP Inspector
        this._drawCostComparisonBox(r, 775, 505, 390, 160);
    }

    _drawSurvivorVitals(r) {
        r.DrawFillBasicRoundRectangle(22, 62, 250, 62, 5, new Color(0.06, 0.09, 0.16, 0.86));
        r.DrawStrokeBasicRoundRectangle(22, 62, 250, 62, 5, new Color(0.58, 0.64, 0.72, 0.3), 1);

        const whiteText = Color.FromHex('#f8fafc');
        const trackBg = Color.FromHex('#334155');

        // Fullness bar
        r.DrawFillText(`🥩 Fullness: ${Math.round(this.survivor.fullness)}%`, 30, 80, 'bold 11px monospace', whiteText, 'left', 'alphabetic');
        r.DrawFillBasicRoundRectangle(150, 70, 110, 11, 3, trackBg);
        r.DrawFillBasicRoundRectangle(150, 70, 1.1 * this.survivor.fullness, 11, 3, this.survivor.fullness < 45 ? Color.FromHex('#ef4444') : Color.FromHex('#22c55e'));

        // Warmth bar
        r.DrawFillText(`🔥 Warmth:   ${Math.round(this.survivor.warmth)}%`, 30, 99, 'bold 11px monospace', whiteText, 'left', 'alphabetic');
        r.DrawFillBasicRoundRectangle(150, 89, 110, 11, 3, trackBg);
        r.DrawFillBasicRoundRectangle(150, 89, 1.1 * this.survivor.warmth, 11, 3, this.survivor.warmth < 45 ? Color.FromHex('#38bdf8') : Color.FromHex('#f97316'));

        // Axe durability & inventory summary
        const axeInfo = this.survivor.hasAxe ? `Axe(${this.survivor.axeDurability} uses)` : 'No Axe';
        r.DrawFillText(`Inv: ${axeInfo} | Wood:${this.survivor.hasFirewood ? 'Yes' : 'No'} | Meat:${this.survivor.hasRawMeat ? 'Yes' : 'No'}`, 30, 116, '10px monospace', Color.FromHex('#cbd5e1'), 'left', 'alphabetic');

        // Recent Event Log at bottom-left of arena
        r.DrawFillBasicRoundRectangle(22, 558, 430, 56, 5, new Color(0.06, 0.09, 0.16, 0.82));
        r.DrawFillText('RECENT PLANNER & ACTION LOG:', 30, 571, 'bold 10px monospace', Color.FromHex('#38bdf8'), 'left', 'alphabetic');
        const logColor = Color.FromHex('#e2e8f0');
        for (let i = 0; i < Math.min(3, this.survivor.eventLog.length); i++) {
            r.DrawFillText(`• ${this.survivor.eventLog[i]}`, 30, 584 + i * 12, '10px monospace', logColor, 'left', 'alphabetic');
        }
    }

    _drawSandboxButtons(r) {
        const btnBg = Color.FromHex('#1e293b');
        const btnBorder = Color.FromHex('#38bdf8');
        const btnText = Color.FromHex('#f8fafc');
        for (let i = 0; i < this.buttons.length; i++) {
            const b = this.buttons[i];
            r.DrawFillBasicRoundRectangle(b.x, b.y, b.w, b.h, 5, btnBg);
            r.DrawStrokeBasicRoundRectangle(b.x, b.y, b.w, b.h, 5, btnBorder, 1.2);
            r.DrawFillText(b.label, b.x + b.w / 2, b.y + 21, 'bold 11px monospace', btnText, 'center', 'alphabetic');
        }
    }

    _drawCostComparisonBox(r, x, y, w, h) {
        r.DrawFillBasicRoundRectangle(x, y, w, h, 6, new Color(0.05, 0.07, 0.12, 0.92));
        r.DrawStrokeBasicRoundRectangle(x, y, w, h, 6, new Color(0.98, 0.80, 0.08, 0.4), 1.2);

        r.DrawFillText('📊 WHY GOAP? COMPETING PATH COSTS FOR [StayFed]', x + 10, y + 18, 'bold 11px monospace', Color.FromHex('#facc15'), 'left', 'alphabetic');

        const lines = [
            'Path 1 (Rack Axe): GrabAxe(1)+Chop(2)+Light(1)+Hunt(2)+Cook(1) = 7.0',
            'Path 2 (Has Fire): HuntRawMeat(2) + CookAndEatSteak(1)         = 3.0',
            'Path 3 (Forge Axe):Mine(2)+Forge(2)+Chop(2)+Light(1)+Hunt+Cook = 10.0',
            'Path 4 (Fallback): ForageWildBerries (no tools/fire required)  = 9.5',
            'Path 5 (By Hand):  SnapBranches(8)+Light(1)+Hunt(2)+Cook(1)    = 12.0',
            '',
            '💡 Try pressing [1] & [4] to remove the Rack Axe: watch A* switch',
            '   from Path 1 (cost 7.0) to Path 4 (ForageBerries, cost 9.5 < 10)!'
        ];
        const pathColor = Color.FromHex('#cbd5e1');
        const tipColor = Color.FromHex('#38bdf8');
        for (let i = 0; i < lines.length; i++) {
            r.DrawFillText(lines[i], x + 10, y + 36 + i * 15, '10px monospace', i >= 6 ? tipColor : pathColor, 'left', 'alphabetic');
        }
    }
}

window.onload = () => {
    Init(GOAPSurvivalGame, 'canvas');
};

