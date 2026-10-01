/**
 * Behavior Tree Demo — Resource Worker / Miner AI
 *
 * Demonstrates:
 *   - Autonomous economic loop: Find Node → Travel → Mine → Transport → Deposit
 *   - Priority-based interruption via BTReactiveSelector (Predator Flee > Rest > Deposit > Mine > Idle)
 *   - Multi-frame stamina/fatigue management with campfire resting
 *   - Blackboard memory sharing for target nodes and navigation waypoints
 *   - Live Behavior Tree hierarchy inspection with visual status badges
 */

// ── Colors ────────────────────────────────────────────────────────────────────

const WORKER_COLORS = {
    mine:       new Color(0.2, 0.8, 1.0),
    carry:      new Color(1.0, 0.8, 0.2),
    rest:       new Color(1.0, 0.45, 0.1),
    flee:       new Color(1.0, 0.2, 0.2),
    idle:       new Color(0.6, 0.8, 0.6),
    crystal:    new Color(0.2, 0.9, 0.9),
    gold:       new Color(1.0, 0.85, 0.2),
    amethyst:   new Color(0.8, 0.4, 1.0)
};

// ── World Building Entities ───────────────────────────────────────────────────

class Depository {
    constructor(x, y) {
        this.position = new Vector2(x, y);
        this.radius = 26;
        this.stockpile = 0;
    }

    Draw(renderer) {
        // Base structure
        renderer.DrawFillBasicRectangle(this.position.x - 24, this.position.y - 24, 48, 48, new Color(0.18, 0.22, 0.3));
        renderer.DrawStrokeBasicRectangle(this.position.x - 24, this.position.y - 24, 48, 48, Color.yellow, 2);

        // Roof / Banner
        renderer.DrawFillBasicRectangle(this.position.x - 20, this.position.y - 20, 40, 10, new Color(0.3, 0.35, 0.45));

        // Label
        renderer.DrawFillText('TOWN HALL', this.position.x, this.position.y - 32, 'bold 11px monospace', Color.white, 'center');
        renderer.DrawFillText(`STOCK: ${this.stockpile} 💎`, this.position.x, this.position.y + 36, 'bold 11px monospace', Color.yellow, 'center');
    }
}

class Campfire {
    constructor(x, y) {
        this.position = new Vector2(x, y);
        this.radius = 22;
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        // Warm ground glow
        const glowRadius = 35 + Math.sin(Date.now() * 0.008) * 4;
        renderer.DrawFillCircle(x, y, glowRadius, new Color(1, 0.4, 0.05, 0.12));

        // Stone circle
        renderer.DrawStrokeCircle(x, y, 16, new Color(0.4, 0.4, 0.4), 2);

        // Flame core
        const flameSize = 8 + Math.sin(Date.now() * 0.015) * 2;
        renderer.DrawFillCircle(x, y, flameSize, new Color(1, 0.5, 0.1));
        renderer.DrawFillCircle(x, y, flameSize * 0.5, Color.yellow);

        // Label
        renderer.DrawFillText('CAMPFIRE', x, y - 24, 'bold 10px monospace', Color.orange, 'center');
    }
}

class SafeTower {
    constructor(x, y) {
        this.position = new Vector2(x, y);
        this.radius = 22;
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        // Tower stone base
        renderer.DrawFillBasicRectangle(x - 18, y - 18, 36, 36, new Color(0.2, 0.25, 0.28));
        renderer.DrawStrokeBasicRectangle(x - 18, y - 18, 36, 36, Color.cyan, 1.5);

        // Shield emblem
        renderer.DrawFillCircle(x, y, 8, new Color(0.1, 0.5, 0.8));
        renderer.DrawStrokeCircle(x, y, 8, Color.white, 1);

        // Label
        renderer.DrawFillText('SAFE TOWER', x, y - 24, 'bold 10px monospace', Color.cyan, 'center');
    }
}

class ResourceNode {
    /**
     * @param {string} name
     * @param {number} x
     * @param {number} y
     * @param {Color} color
     * @param {number} [maxAmount=40]
     */
    constructor(name, x, y, color, maxAmount = 40) {
        this.name = name;
        this.position = new Vector2(x, y);
        this.color = color;
        this.maxAmount = maxAmount;
        this.amount = maxAmount;
        this.radius = 20;
        this.regenTimer = 0;
    }

    Update(dt) {
        // Slowly regenerate if depleted
        if (this.amount <= 0) {
            this.regenTimer += dt;
            if (this.regenTimer >= 8.0) {
                this.amount = this.maxAmount;
                this.regenTimer = 0;
            }
        }
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;
        const ratio = Math.max(0, this.amount / this.maxAmount);

        // Glowing crystal clusters
        const drawRadius = 10 + ratio * 10;
        renderer.DrawFillCircle(x, y, drawRadius, this.color);
        renderer.DrawStrokeCircle(x, y, drawRadius, Color.white, 1.5);

        // Inner crystal shard facet
        if (this.amount > 0) {
            renderer.DrawFillCircle(x - 3, y - 3, drawRadius * 0.4, Color.white);
        }

        // Name and count
        const label = this.amount > 0 ? `${this.name} (${this.amount})` : `${this.name} (Depleted)`;
        const textColor = this.amount > 0 ? this.color : Color.grey;
        renderer.DrawFillText(label, x, y - 24, 'bold 10px monospace', textColor, 'center');
    }
}

class Predator extends GameObject {
    constructor(x, y) {
        super(new Vector2(x, y), 0, 1);
        this.radius = 14;
        this.threatRadius = 140;
        this.speed = 85;
        this.target = new Vector2(x, y);
        this.waypoints = [
            new Vector2(480, 200),
            new Vector2(580, 420),
            new Vector2(420, 520),
            new Vector2(360, 300)
        ];
        this.currentWP = 0;
    }

    Update(dt) {
        super.Update(dt);

        // Patrol waypoints
        const wp = this.waypoints[this.currentWP];
        const dist = Vector2.Magnitude(this.position, wp);
        if (dist < 10) {
            this.currentWP = (this.currentWP + 1) % this.waypoints.length;
        }

        const dx = wp.x - this.position.x;
        const dy = wp.y - this.position.y;
        this.rotation = Math.atan2(dy, dx);

        this.position.x += Math.cos(this.rotation) * this.speed * dt;
        this.position.y += Math.sin(this.rotation) * this.speed * dt;
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        // Threat radius ring
        renderer.DrawStrokeCircle(x, y, this.threatRadius, new Color(1, 0.2, 0.2, 0.18), 1);

        // Body
        renderer.DrawFillCircle(x, y, this.radius, new Color(0.85, 0.15, 0.2));
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 1.5);

        // Direction spike / teeth
        const noseX = x + Math.cos(this.rotation) * (this.radius + 6);
        const noseY = y + Math.sin(this.rotation) * (this.radius + 6);
        renderer.DrawLine(x, y, noseX, noseY, Color.white, 2);

        // Label
        renderer.DrawFillText('🐺 PREDATOR', x, y - this.radius - 8, 'bold 10px monospace', Color.red, 'center');
    }
}

// ── WorkerBot ─────────────────────────────────────────────────────────────────

class WorkerBot extends GameObject {
    /**
     * @param {string} name
     * @param {Vector2} position
     * @param {object} worldRefs References to world structures (depository, campfire, tower, mines, predator)
     */
    constructor(name, position, worldRefs) {
        super(Vector2.Copy(position), 0, 1);

        this.name = name;
        this.world = worldRefs;

        // Stats
        this.maxStamina = 100;
        this.stamina = 100;
        this.carriedOre = 0;
        this.backpackCapacity = 5;

        // Speeds
        this.workSpeed = 90;
        this.fleeSpeed = 140;
        this.radius = 12;

        this.isResting = false;
        this.stateColor = WORKER_COLORS.idle;

        // Behavior Tree setup
        this._BuildBehaviorTree();
    }

    /**
     * Constructs the worker's decision-making behavior tree.
     * @private
     */
    _BuildBehaviorTree() {
        this.blackboard = new BTBlackboard();

        // ┌────────────────────────────────────────────────────────────────────────┐
        // │                         Worker Behavior Tree                           │
        // │                                                                        │
        // │  Priority 1: Flee from Predator threat                                 │
        // │  Priority 2: Rest at Campfire if stamina is exhausted (<20%)          │
        // │  Priority 3: Deposit cargo at Town Hall if backpack is full            │
        // │  Priority 4: Work (Find Mine → Travel → Extract Ore)                   │
        // │  Priority 5: Camp Idle                                                 │
        // └────────────────────────────────────────────────────────────────────────┘
        this.bt = new BehaviorTree(this,
            new BTReactiveSelector('WorkerBrain', [

                // ── Priority 1: Survival / Evade Threat ──────────────────────────
                new BTSequence('EvadeThreat', [
                    new BTCondition('IsThreatNear', (w) => w.IsPredatorNear()),
                    new BTAction('SprintToSafety', (dt, w, bb) => w.ActionSprintToTower(dt, bb))
                ]),

                // ── Priority 2: Rest & Recuperate ────────────────────────────────
                new BTSequence('RestRoutine', [
                    new BTCondition('NeedsRest', (w) => w.stamina < 20 || w.isResting),
                    new BTAction('WalkToCampfire', (dt, w, bb) => w.ActionWalkToCampfire(dt, bb)),
                    new BTAction('RecoverStamina', (dt, w, bb) => w.ActionRecoverStamina(dt, bb))
                ]),

                // ── Priority 3: Deposit Full Cargo ───────────────────────────────
                new BTSequence('DepositCargo', [
                    new BTCondition('IsBackpackFull', (w) => w.carriedOre >= w.backpackCapacity),
                    new BTAction('WalkToTownHall', (dt, w, bb) => w.ActionWalkToTownHall(dt, bb)),
                    new BTWait('UnloadDelay', 0.8),
                    new BTAction('DepositOre', (dt, w, bb) => w.ActionDepositOre(dt, bb))
                ]),

                // ── Priority 4: Harvest Resource Loop ────────────────────────────
                new BTSequence('HarvestOre', [
                    new BTAction('SelectBestMine', (dt, w, bb) => w.ActionSelectBestMine(dt, bb)),
                    new BTAction('WalkToMine', (dt, w, bb) => w.ActionWalkToMine(dt, bb)),
                    new BTWait('ChopAnimation', 0.5),
                    new BTAction('ExtractOreChunk', (dt, w, bb) => w.ActionExtractOreChunk(dt, bb))
                ]),

                // ── Priority 5: Standby / Ambient Idle ───────────────────────────
                new BTSequence('CampIdle', [
                    new BTAction('WanderCamp', (dt, w, bb) => w.ActionWanderCamp(dt, bb)),
                    new BTWait('IdlePause', 1.5)
                ])

            ]),
            this.blackboard
        );
    }

    // ── Perception Queries ───────────────────────────────────────────────────

    IsPredatorNear() {
        if (!this.world.predator) return false;
        const d = Vector2.Magnitude(this.position, this.world.predator.position);
        return d <= this.world.predator.threatRadius;
    }

    // ── Behavior Tree Actions ────────────────────────────────────────────────

    ActionSprintToTower(dt, bb) {
        this.stateColor = WORKER_COLORS.flee;
        const towerPos = this.world.tower.position;

        this._SteerAndMove(towerPos, this.fleeSpeed, dt);

        // Fleeing burns stamina faster
        this.stamina = Math.max(0, this.stamina - 8 * dt);

        const d = Vector2.Magnitude(this.position, towerPos);
        if (d < 15 && !this.IsPredatorNear()) {
            return BTStatus.SUCCESS;
        }

        return BTStatus.RUNNING;
    }

    ActionWalkToCampfire(dt, bb) {
        this.isResting = true;
        this.stateColor = WORKER_COLORS.rest;
        const firePos = this.world.campfire.position;

        const d = Vector2.Magnitude(this.position, firePos);
        if (d < 16) {
            return BTStatus.SUCCESS; // Arrived at fire, ready to recover
        }

        this._SteerAndMove(firePos, this.workSpeed, dt);
        return BTStatus.RUNNING;
    }

    ActionRecoverStamina(dt, bb) {
        this.stateColor = WORKER_COLORS.rest;

        // Warm up and recharge stamina
        this.stamina = Math.min(this.maxStamina, this.stamina + 28 * dt);

        if (this.stamina >= this.maxStamina) {
            this.isResting = false;
            return BTStatus.SUCCESS;
        }

        return BTStatus.RUNNING;
    }

    ActionWalkToTownHall(dt, bb) {
        this.stateColor = WORKER_COLORS.carry;
        const hallPos = this.world.depository.position;

        const d = Vector2.Magnitude(this.position, hallPos);
        if (d < 18) {
            return BTStatus.SUCCESS;
        }

        // Heavy cargo slightly lowers speed
        this._SteerAndMove(hallPos, this.workSpeed * 0.85, dt);
        this.stamina = Math.max(0, this.stamina - 3 * dt);

        return BTStatus.RUNNING;
    }

    ActionDepositOre(dt, bb) {
        this.world.depository.stockpile += this.carriedOre;
        this.carriedOre = 0;
        bb.Delete('targetMine');
        return BTStatus.SUCCESS;
    }

    ActionSelectBestMine(dt, bb) {
        // Find closest mine that is not depleted
        let bestMine = null;
        let minDist = Infinity;

        for (const mine of this.world.mines) {
            if (mine.amount > 0) {
                const d = Vector2.Magnitude(this.position, mine.position);
                if (d < minDist) {
                    minDist = d;
                    bestMine = mine;
                }
            }
        }

        if (!bestMine) return BTStatus.FAILURE; // All mines depleted

        bb.Set('targetMine', bestMine);
        return BTStatus.SUCCESS;
    }

    ActionWalkToMine(dt, bb) {
        const mine = bb.Get('targetMine');
        if (!mine || mine.amount <= 0) {
            bb.Delete('targetMine');
            return BTStatus.FAILURE;
        }

        this.stateColor = WORKER_COLORS.mine;
        const d = Vector2.Magnitude(this.position, mine.position);

        if (d < 16) {
            return BTStatus.SUCCESS; // Reached mine
        }

        this._SteerAndMove(mine.position, this.workSpeed, dt);
        this.stamina = Math.max(0, this.stamina - 2.5 * dt);

        return BTStatus.RUNNING;
    }

    ActionExtractOreChunk(dt, bb) {
        const mine = bb.Get('targetMine');
        if (!mine || mine.amount <= 0) {
            bb.Delete('targetMine');
            return BTStatus.FAILURE;
        }

        // Extract one piece
        mine.amount--;
        this.carriedOre++;
        this.stamina = Math.max(0, this.stamina - 6);

        // If backpack is full or mine depleted, finish
        if (this.carriedOre >= this.backpackCapacity || mine.amount <= 0) {
            return BTStatus.SUCCESS;
        }

        // Still has room: return SUCCESS so sequence can loop via tree or tick again
        return BTStatus.SUCCESS;
    }

    ActionWanderCamp(dt, bb) {
        this.stateColor = WORKER_COLORS.idle;
        return BTStatus.SUCCESS;
    }

    // ── Movement Helper ──────────────────────────────────────────────────────

    _SteerAndMove(targetPos, speed, dt) {
        const dx = targetPos.x - this.position.x;
        const dy = targetPos.y - this.position.y;
        this.rotation = Math.atan2(dy, dx);

        this.position.x += Math.cos(this.rotation) * speed * dt;
        this.position.y += Math.sin(this.rotation) * speed * dt;
    }

    // ── Update & Draw ────────────────────────────────────────────────────────

    Update(dt) {
        super.Update(dt);

        // Tick Behavior Tree
        this.bt.Update(dt);
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        // 1. Worker Body
        renderer.DrawFillCircle(x, y, this.radius, this.stateColor);
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 1.5);

        // Direction nose
        const noseX = x + Math.cos(this.rotation) * (this.radius + 4);
        const noseY = y + Math.sin(this.rotation) * (this.radius + 4);
        renderer.DrawLine(x, y, noseX, noseY, Color.white, 2);

        // 2. Cargo Backpack Indicator
        if (this.carriedOre > 0) {
            renderer.DrawFillCircle(x - Math.cos(this.rotation) * 8, y - Math.sin(this.rotation) * 8, 5, Color.yellow);
        }

        // 3. Stamina Bar above head
        const barW = 26;
        const barH = 4;
        const barX = x - barW / 2;
        const barY = y - this.radius - 8;
        const staminaPct = Math.max(0, this.stamina / this.maxStamina);

        renderer.DrawFillBasicRectangle(barX, barY, barW, barH, new Color(0.2, 0.2, 0.2, 0.8));
        const barColor = staminaPct > 0.5 ? Color.lime : (staminaPct > 0.2 ? Color.yellow : Color.red);
        renderer.DrawFillBasicRectangle(barX, barY, barW * staminaPct, barH, barColor);
        renderer.DrawStrokeBasicRectangle(barX, barY, barW, barH, Color.black, 1);

        // 4. Floating Labels (Backpack cargo + Name)
        renderer.DrawFillText(this.name, x, barY - 14, 'bold 11px monospace', Color.white, 'center');
        const cargoText = `🎒 ${this.carriedOre}/${this.backpackCapacity}`;
        renderer.DrawFillText(cargoText, x, barY - 4, '9px monospace', this.carriedOre >= this.backpackCapacity ? Color.yellow : Color.lightGrey, 'center');

        // 5. World-Space BT Debug
        this.bt.DrawDebug(renderer, x, y + this.radius + 12);
    }
}

// ── Game ──────────────────────────────────────────────────────────────────────

class BTWorkerGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({ screenWidth: 880, screenHeight: 620 });

        this.bgColor = new Color(0.08, 0.1, 0.12);
        this.gridColor = new Color(1, 1, 1, 0.03);

        this.depository = new Depository(150, 320);
        this.campfire = new Campfire(150, 170);
        this.tower = new SafeTower(150, 470);

        this.mines = [
            new ResourceNode('Cyan Crystal', 700, 160, WORKER_COLORS.crystal, 30),
            new ResourceNode('Gold Vein',    750, 330, WORKER_COLORS.gold, 35),
            new ResourceNode('Amethyst Gem', 680, 500, WORKER_COLORS.amethyst, 25)
        ];

        this.predator = new Predator(480, 200);

        const worldRefs = {
            depository: this.depository,
            campfire:   this.campfire,
            tower:      this.tower,
            mines:      this.mines,
            predator:   this.predator
        };

        this.workers = [
            new WorkerBot('Miner Pip', new Vector2(210, 260), worldRefs),
            new WorkerBot('Miner Bob', new Vector2(210, 380), worldRefs)
        ];

        this.selectedWorkerIndex = 0;
        this.showTreeInspector = true;

        debugMode = true;
    }

    Start() {
        super.Start();

        for (const worker of this.workers) {
            this.AddGameObject(worker);
        }
        this.AddGameObject(this.predator);
    }

    Update(dt) {
        super.Update(dt);

        // Update mines regeneration
        for (const mine of this.mines) {
            mine.Update(dt);
        }

        // Left Click moves Predator to cursor (allows testing danger reaction on demand!)
        if (Input.mouse.down || Input.IsMouseDown()) {
            this.predator.position.x = Input.mouse.x;
            this.predator.position.y = Input.mouse.y;
        }

        // [TAB] or [SPACE] switches inspected worker
        if (Input.IsKeyDown(KEY_TAB) || Input.IsKeyDown(KEY_SPACE)) {
            this.selectedWorkerIndex = (this.selectedWorkerIndex + 1) % this.workers.length;
        }

        // [T] toggles Behavior Tree Inspector HUD
        if (Input.IsKeyDown(KEY_T)) {
            this.showTreeInspector = !this.showTreeInspector;
        }

        // [E] drains stamina of selected worker to test exhaustion & rest
        if (Input.IsKeyDown(KEY_E)) {
            const selected = this.workers[this.selectedWorkerIndex];
            if (selected) selected.stamina = 5;
        }
    }

    Draw() {
        // Arena background
        renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this.bgColor);

        // Ambient ground grid
        this._DrawGrid();

        // Draw World Base Structures
        this.depository.Draw(renderer);
        this.campfire.Draw(renderer);
        this.tower.Draw(renderer);

        // Draw Resource Mines
        for (const mine of this.mines) {
            mine.Draw(renderer);
        }

        // Draw Entities (Workers & Predator)
        super.Draw();

        // Header Title & Controls
        this._DrawHeader();

        // Behavior Tree Inspector Panel
        if (this.showTreeInspector && this.workers[this.selectedWorkerIndex]) {
            const selected = this.workers[this.selectedWorkerIndex];
            selected.bt.DrawTreeInspector(renderer, 240, 75, {
                width: 320,
                title: `Live BT: ${selected.name}`
            });
        }

        // Legend
        this._DrawLegend();
    }

    _DrawGrid() {
        const step = 40;
        for (let x = 0; x < this.screenWidth; x += step) {
            renderer.DrawLine(x, 0, x, this.screenHeight, this.gridColor, 1);
        }
        for (let y = 0; y < this.screenHeight; y += step) {
            renderer.DrawLine(0, y, this.screenWidth, y, this.gridColor, 1);
        }
    }

    _DrawHeader() {
        renderer.DrawFillText(
            'Behavior Tree Demo — Autonomous Resource Worker AI',
            this.screenWidth / 2, 22,
            'bold 18px Arial', Color.white, 'center'
        );
        renderer.DrawFillText(
            'Click anywhere to place Predator (Wolf) • [E] Exhaust Stamina • [TAB/SPACE] Switch Worker • [T] Toggle Tree Inspector',
            this.screenWidth / 2, 44,
            '12px Arial', new Color(0.7, 0.75, 0.85), 'center'
        );
    }

    _DrawLegend() {
        const lx = this.screenWidth - 250;
        let   ly = 75;

        renderer.DrawFillBasicRectangle(lx - 10, ly - 10, 244, 210, new Color(0.05, 0.07, 0.1, 0.88));
        renderer.DrawStrokeBasicRectangle(lx - 10, ly - 10, 244, 210, new Color(0.2, 0.3, 0.45, 0.7), 1);

        renderer.DrawFillText('Priority Hierarchy (BTReactiveSelector):', lx, ly + 4, 'bold 11px monospace', Color.cyan, 'left');
        ly += 22;

        const items = [
            ['1. Evade Threat', WORKER_COLORS.flee, 'Predator within 140px range'],
            ['2. Rest Routine', WORKER_COLORS.rest, 'Stamina < 20% → Campfire'],
            ['3. Deposit Cargo', WORKER_COLORS.carry, 'Backpack full (5/5) → Hall'],
            ['4. Harvest Ore', WORKER_COLORS.mine, 'Find Mine → Walk → Mine'],
            ['5. Camp Idle', WORKER_COLORS.idle, 'All mines depleted / Standby']
        ];

        for (const [name, color, desc] of items) {
            renderer.DrawFillCircle(lx + 6, ly + 2, 5, color);
            renderer.DrawFillText(name, lx + 18, ly + 2, 'bold 11px monospace', Color.white, 'left', 'middle');
            renderer.DrawFillText(desc, lx + 18, ly + 15, '10px monospace', Color.grey, 'left', 'middle');
            ly += 30;
        }

        renderer.DrawFillText('Status: 🟢 SUCCESS  🔴 FAIL  🟡 RUN', lx, ly + 14, '10px monospace', Color.white, 'left');
    }
}

window.onload = () => Init(BTWorkerGame, "canvas");
