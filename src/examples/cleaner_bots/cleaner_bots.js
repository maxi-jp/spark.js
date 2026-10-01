/**
 * Cleaner Bots — Three AI Architectures Compared
 *
 * Six autonomous bots compete to collect rubbish within a limited vision range.
 * This demo showcases three fundamentally different AI approaches side-by-side:
 *
 *   ● FSMBTRobot (4 instances) — Two-Layer Hybrid
 *     FSM (mode layer) controls WHEN the bot works:
 *       ACTIVE     → BT ticks; battery drains; rare random breakdown
 *       LOW_BATT   → BT suspended; steers to charger
 *       CHARGING   → Recharges on pad
 *       BROKEN     → Frozen 5s, then auto-repairs
 *     BT (decision layer) controls WHAT/HOW:
 *       BTReactiveSelector
 *         ├── BTReactiveSequence 'Collect'
 *         │     ├── BTAction 'AcquireTarget'  — find & claim nearest visible rubbish
 *         │     ├── BTAction 'NavigateTo'     — drive toward it
 *         │     └── BTAction 'PickUp'         — collect, score++
 *         └── BTAction 'Wander'              — drift when nothing in range
 *
 *   ■ FSMBot (1 instance) — FSM-Only
 *     Pure state machine. All logic lives in state Update() methods.
 *     Four states: Idle (search for rubbish), Seek (navigate to target),
 *     LowBattery (drive to charger), Charging (recharge).
 *     No behavior tree — state transitions are explicit and declarative.
 *
 *   ◆ BTBot (1 instance) — BT-Only
 *     Pure reactive behavior tree. Handles ALL behavior (including battery)
 *     in the tree with no separate FSM layer. Mode changes emerge from
 *     BT priority: ChargeCycle > Collect > Wander.
 *
 * All bots share:
 *   • visionRange = 200px (only perceive nearby rubbish)
 *   • same battery/charging mechanics
 *   • same collision/scoring system
 *   • position bounds clamping
 *
 * Controls:
 *   Click bot / [SPACE]  → select bot to inspect
 *   [D]                  → toggle debug mode (shows vision circles & state labels)
 *   [E]                  → drain selected bot's battery (test low-battery transition)
 *   [B]                  → force selected bot to break (FSMBTRobot only)
 */

// ── Colors ────────────────────────────────────────────────────────────────────

const RUBBISH_PALETTE = [
    [ new Color(0.92, 0.92, 0.86), new Color(0.92, 0.92, 0.86, 0.38) ], // paper
    [ new Color(0.70, 0.72, 0.76), new Color(0.70, 0.72, 0.76, 0.38) ], // can
    [ new Color(0.38, 0.68, 0.30), new Color(0.38, 0.68, 0.30, 0.38) ], // organic
    [ new Color(0.82, 0.52, 0.24), new Color(0.82, 0.52, 0.24, 0.38) ]  // cardboard
];

// ── World Entities ─────────────────────────────────────────────────────────────

class RubbishItem {
    static transparentWhite = new Color(1, 1, 1, 0.3);

    constructor(x, y) {
        this.position  = new Vector2(x, y);
        this.color     = RUBBISH_PALETTE[RandomBetweenInt(0, RUBBISH_PALETTE.length - 1)];
        this.claimedBy = null;
        this.collected = false;
    }

    Draw(renderer) {
        if (this.collected)
            return;

        const col = this.claimedBy ? this.color[0] : this.color[1];
        renderer.DrawFillBasicRectangle(this.position.x - 5, this.position.y - 5, 10, 10, col);

        if (!this.claimedBy) {
            renderer.DrawStrokeBasicRectangle(this.position.x - 5, this.position.y - 5, 10, 10, this.transparentWhite, 1);
        }
    }
}

class ChargingPad {
    static pulseColor  = new Color(0.2, 0.5, 1.0, 0.13);
    static innerColor  = new Color(0.07, 0.20, 0.52);
    static strokeColor = new Color(0.35, 0.65, 1.0);
    static labelColor  = new Color(0.4, 0.7, 1.0);

    constructor(x, y) {
        this.position = new Vector2(x, y);
        this.radius   = 26;
        this.textLabel = new TextLabel('⚡ CHARGE ⚡', new Vector2(this.position.x, this.position.y - 26), 'bold 10px monospace', ChargingPad.labelColor, 'center');
    }

    Draw(renderer) {
        const pulse = 22 + Math.sin(Date.now() * 0.005) * 5;

        renderer.DrawFillCircle(this.position.x, this.position.y, pulse, ChargingPad.pulseColor);
        renderer.DrawFillCircle(this.position.x, this.position.y, 18, ChargingPad.innerColor);
        renderer.DrawStrokeCircle(this.position.x, this.position.y, 18, ChargingPad.strokeColor, 2);

        this.textLabel.Draw(renderer);
    }
}

// ── Base CleanerRobot ─────────────────────────────────────────────────────────────
// Common properties and helpers for all bot types

class CleanerRobot extends GameObject {
    constructor(name, x, y, world) {
        super(new Vector2(x, y), 0, 1);
        this.name       = name;
        this.world      = world;
        this.radius     = 12;
        this.moveSpeed  = 85;
        this.battery    = 100;
        this.score      = 0;
        this.stateColor = new Color(1, 1, 1);  // subclasses override
        this.visionRange = 200;
    }

    _SteerAndMove(targetPos, speed, dt) {
        const dx = targetPos.x - this.position.x;
        const dy = targetPos.y - this.position.y;
        this.rotation = Math.atan2(dy, dx);
        this.position.x += Math.cos(this.rotation) * speed * dt;
        this.position.y += Math.sin(this.rotation) * speed * dt;
    }

    _ClampPosition() {
        this.position.x = Clamp(this.position.x, 20, this.game.screenWidth - 20);
        this.position.y = Clamp(this.position.y, 60, this.game.screenHeight - 20);
    }
}

// region FSM + BT Robot
// ── FSMBTRobot (BT + FSM) ─────────────────────────────────────────────────────────
// Two-layer AI: FSM controls when BT runs

const FSMBT_BOT_COLORS = {
    active:     new Color(0.25, 0.88, 0.45),
    lowBattery: new Color(1.0,  0.72, 0.1),
    charging:   new Color(0.2,  0.55, 1.0),
    broken:     new Color(0.9,  0.2,  0.2),
};

// ────── FSM States ────────────────────────────────────────────────────────────────

class FSMBTActiveState extends FSMState {
    constructor() {
        super();
        this.AddTransition('lowBattery', owner => owner.battery < 20);
    }

    Enter(owner, prev) {
        owner.stateColor = FSMBT_BOT_COLORS.active;
        owner.bt.active  = true;
    }

    Update(dt, owner, fsm) {
        // ~0.015% chance per frame ≈ rare breakdown during a long run
        if (Math.random() < 0.00015) {
            fsm.Transition('broken');
            return;
        }
        owner.battery = Math.max(0, owner.battery - 4 * dt);
        owner.bt.Update(dt);
    }

    Exit(owner, next) {
        owner._ReleaseClaim();
        owner.bt.Abort();
        owner.bt.Reset();
        owner.bt.active = false;
    }
}

class FSMBTLowBatteryState extends FSMState {
    Enter(owner, prev) {
        owner.stateColor = FSMBT_BOT_COLORS.lowBattery;
    }

    Update(dt, owner, fsm) {
        owner.battery = Math.max(0, owner.battery - 1.5 * dt);
        owner._SteerAndMove(owner.world.charger.position, owner.moveSpeed, dt);
        if (Vector2.Magnitude(owner.position, owner.world.charger.position) < owner.world.charger.radius) {
            fsm.Transition('charging');
        }
    }
}

class FSMBTChargingState extends FSMState {
    constructor() {
        super();
        this.AddTransition('active', owner => owner.battery >= 100);
    }

    Enter(owner, prev) {
        owner.stateColor = FSMBT_BOT_COLORS.charging;
    }

    Update(dt, owner, fsm) {
        owner.battery = Math.min(100, owner.battery + 28 * dt);
    }
}

class FSMBTBrokenState extends FSMState {
    constructor() {
        super();
        this._repairTimer = 0;
    }

    Enter(owner, prev) {
        owner.stateColor  = FSMBT_BOT_COLORS.broken;
        this._repairTimer = 0;
    }

    Update(dt, owner, fsm) {
        this._repairTimer += dt;
        if (this._repairTimer >= 5.0) {
            owner.battery = Clamp(owner.battery + 15, 0, 100);
            fsm.Transition('active');
        }
    }
}

// ────── FSMBTRobot Class ─────────────────────────────────────────────────────────

class FSMBTRobot extends CleanerRobot {
    constructor(name, x, y, world) {
        super(name, x, y, world);
        this.stateColor = FSMBT_BOT_COLORS.active;

        this.fsm = null;
        this.blackboard = null;
        this.bt = null;

        this._BuildBT();   // must exist before FSM.Start() fires Enter()
        this._BuildFSM();
    }

    _BuildFSM() {
        this.fsm = new FSM(this, 'active')
            .AddState('active',     new FSMBTActiveState())
            .AddState('lowBattery', new FSMBTLowBatteryState())
            .AddState('charging',   new FSMBTChargingState())
            .AddState('broken',     new FSMBTBrokenState())
            .Start();
    }

    _BuildBT() {
        this.blackboard = new BTBlackboard();

        // ┌──────────────────────────────────────────────────────────────────────┐
        // │  CleanerBot BT — ticks only while FSM is in 'active' state          │
        // │                                                                      │
        // │  BTReactiveSelector re-evaluates top-down every tick.               │
        // │  BTReactiveSequence makes AcquireTarget re-check each tick so a     │
        // │  stolen or already-collected target is dropped without waiting.      │
        // └──────────────────────────────────────────────────────────────────────┘
        this.bt = new BehaviorTree(this,
            new BTReactiveSelector('CleanerBrain', [

                new BTReactiveSequence('Collect', [
                    new BTAction('AcquireTarget', (dt, bot, bb) => bot._AcquireTarget(bb)),
                    new BTAction('NavigateTo',    (dt, bot, bb) => bot._ActionNavigateTo(dt, bb)),
                    new BTAction('PickUp',        (dt, bot, bb) => bot._ActionPickUp(bb))
                ]),

                new BTAction('Wander', (dt, bot, bb) => bot._ActionWander(dt, bb))

            ]),
            this.blackboard
        );

        // BT starts suspended; FSMBTActiveState.Enter() enables it
        this.bt.active = false;
    }

    // ── BT Action Implementations ──────────────────────────────────────────────

    _AcquireTarget(bb) {
        const current = bb.Get('target');

        // Fast-path: existing claim is still valid
        if (current && !current.collected && current.claimedBy === this) {
            return BTStatus.SUCCESS;
        }

        // Release stale claim before searching
        if (current) {
            if (current.claimedBy === this)
                current.claimedBy = null;

            bb.Delete('target');
        }

        // Claim the nearest unclaimed rubbish item within vision range
        let best = null, bestSq = Infinity;
        const visionSq = this.visionRange * this.visionRange;
        for (const r of this.world.rubbish) {
            if (r.collected || r.claimedBy)
                continue;

            const sq = Vector2.SqrMagnitude(this.position, r.position);
            if (sq <= visionSq && sq < bestSq) {
                bestSq = sq;
                best = r;
            }
        }

        if (!best)
            return BTStatus.FAILURE;

        best.claimedBy = this;
        bb.Set('target', best);

        return BTStatus.SUCCESS;
    }

    _ActionNavigateTo(dt, bb) {
        const target = bb.Get('target');
        if (!target || target.collected) {
            bb.Delete('target');
            return BTStatus.FAILURE;
        }

        if (Vector2.Magnitude(this.position, target.position) < 14) {
            return BTStatus.SUCCESS;
        }

        this._SteerAndMove(target.position, this.moveSpeed, dt);

        return BTStatus.RUNNING;
    }

    _ActionPickUp(bb) {
        const target = bb.Get('target');
        if (target && !target.collected) {
            target.collected = true;
            target.claimedBy = null;
            this.score++;
        }
        bb.Delete('target');
        return BTStatus.SUCCESS;
    }

    _ActionWander(dt, bb) {
        // Persist wander destination in blackboard to avoid per-frame jitter
        let wp = bb.Get('wanderTarget');
        if (!wp || Vector2.Magnitude(this.position, wp) < 12) {
            wp = new Vector2(
                RandomBetweenFloat(50, this.game.screenWidth - 50),
                RandomBetweenFloat(70, this.game.screenHeight - 50)
            );
            bb.Set('wanderTarget', wp);
        }
        this._SteerAndMove(wp, this.moveSpeed * 0.38, dt);
        return BTStatus.RUNNING;
    }

    _ReleaseClaim() {
        const target = this.blackboard.Get('target');
        if (target && target.claimedBy === this) target.claimedBy = null;
        this.blackboard.Delete('target');
    }

    // ── Update & Draw ──────────────────────────────────────────────────────────

    Update(dt) {
        super.Update(dt);
        this.fsm.Update(dt);
        this._ClampPosition();
    }

    Draw(renderer) {
        const { x, y } = this.position;

        // Flicker when broken
        if (this.fsm.currentStateName === 'broken' && Math.floor(Date.now() / 180) % 2 === 0) return;

        // Debug: vision range circle
        if (debugMode) {
            renderer.DrawStrokeCircle(x, y, this.visionRange, new Color(0.25, 0.88, 0.45, 0.15), 1);
        }

        // Body
        renderer.DrawFillCircle(x, y, this.radius, this.stateColor);
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 1.5);

        // Direction nose
        renderer.DrawLine(
            x, y,
            x + Math.cos(this.rotation) * (this.radius + 4),
            y + Math.sin(this.rotation) * (this.radius + 4),
            Color.white, 2
        );

        // Battery bar
        const bw = 26, bh = 4, bx = x - 13, by = y - this.radius - 10;
        const pct = this.battery / 100;
        renderer.DrawFillBasicRectangle(bx, by, bw, bh, new Color(0.15, 0.15, 0.15, 0.85));
        renderer.DrawFillBasicRectangle(bx, by, bw * pct, bh,
            pct > 0.5 ? Color.lime : pct > 0.2 ? Color.yellow : Color.red);
        renderer.DrawStrokeBasicRectangle(bx, by, bw, bh, Color.black, 1);

        // Name + score
        renderer.DrawFillText(
            `${this.name}  ${this.score}🗑`,
            x, by - 13, 'bold 11px monospace', Color.white, 'center'
        );

        // Target line: to rubbish or charger
        const target = this.blackboard.Get('target');
        if (target && !target.collected) {
            renderer.DrawLine(x, y, target.position.x, target.position.y, new Color(0.25, 0.88, 0.45, 0.4), 1);
        } else if (this.battery < 30) {
            renderer.DrawLine(x, y, this.world.charger.position.x, this.world.charger.position.y, new Color(1.0, 0.72, 0.1, 0.4), 1);
        }

        // Debug overlays — FSM state label + BT active-leaf label
        this.fsm.DrawDebug(renderer, x, y + this.radius + 12);
        this.bt.DrawDebug(renderer, x, y + this.radius + 24);
    }
}

// endregion

// region FSM Robot
// ── FSM-only Bot ─────────────────────────────────────────────────────────────────
// One AI layer only: an explicit state machine. Each state owns its logic directly.
// Shape: square  Color scheme: amber/yellow

const FSM_BOT_COLORS = {
    idle:       new Color(0.85, 0.55, 0.2),
    seek:       new Color(0.95, 0.85, 0.2),
    lowBattery: new Color(0.85, 0.35, 0.1),
    charging:   new Color(0.2,  0.55, 1.0),
};

class FSMIdleState extends FSMState {
    constructor() {
        super();
        this.AddTransition('lowBattery', owner => owner.battery < 20);
    }

    Enter(owner, prev) { owner.stateColor = FSM_BOT_COLORS.idle; }

    Update(dt, owner, fsm) {
        owner.battery = Math.max(0, owner.battery - 3.5 * dt);
        let best = null, bestSq = Infinity;
        const visionSq = owner.visionRange * owner.visionRange;
        for (const r of owner.world.rubbish) {
            if (r.collected || r.claimedBy) continue;
            const sq = Vector2.SqrMagnitude(owner.position, r.position);
            if (sq <= visionSq && sq < bestSq) { bestSq = sq; best = r; }
        }
        if (best) {
            best.claimedBy = owner;
            owner._target = best;
            fsm.Transition('seek');
            return;
        }
        // No rubbish visible — explore the arena so new rubbish enters vision range
        if (!owner._wanderTarget || Vector2.Magnitude(owner.position, owner._wanderTarget) < 12) {
            owner._wanderTarget = new Vector2(
                RandomBetweenFloat(50, owner.game.screenWidth - 50),
                RandomBetweenFloat(70, owner.game.screenHeight - 50)
            );
        }
        owner._SteerAndMove(owner._wanderTarget, owner.moveSpeed * 0.38, dt);
    }
}

class FSMSeekState extends FSMState {
    constructor() {
        super();
        this.AddTransition('lowBattery', owner => owner.battery < 20);
    }

    Enter(owner, prev) { owner.stateColor = FSM_BOT_COLORS.seek; }

    Update(dt, owner, fsm) {
        owner.battery = Math.max(0, owner.battery - 3.5 * dt);
        const target = owner._target;
        if (!target || target.collected) {
            owner._target = null;
            fsm.Transition('idle');
            return;
        }
        if (Vector2.Magnitude(owner.position, target.position) < 14) {
            target.collected = true;
            target.claimedBy = null;
            owner.score++;
            owner._target = null;
            fsm.Transition('idle');
            return;
        }
        owner._SteerAndMove(target.position, owner.moveSpeed, dt);
    }

    // Release claim on any exit (low battery, or target gone/picked up)
    Exit(owner, next) {
        if (owner._target && owner._target.claimedBy === owner) owner._target.claimedBy = null;
        owner._target = null;
    }
}

class FSMLowBatteryState extends FSMState {
    Enter(owner, prev) { owner.stateColor = FSM_BOT_COLORS.lowBattery; }

    Update(dt, owner, fsm) {
        owner.battery = Math.max(0, owner.battery - 1.5 * dt);
        owner._SteerAndMove(owner.world.charger.position, owner.moveSpeed, dt);
        if (Vector2.Magnitude(owner.position, owner.world.charger.position) < owner.world.charger.radius) {
            fsm.Transition('charging');
        }
    }
}

class FSMChargingState extends FSMState {
    constructor() {
        super();
        this.AddTransition('idle', owner => owner.battery >= 100);
    }

    Enter(owner, prev) { owner.stateColor = FSM_BOT_COLORS.charging; }

    Update(dt, owner, fsm) {
        owner.battery = Math.min(100, owner.battery + 28 * dt);
    }
}

class FSMBot extends CleanerRobot {
    constructor(name, x, y, world) {
        super(name, x, y, world);
        this.moveSpeed  = 82;
        this.stateColor = FSM_BOT_COLORS.idle;
        this._target    = null;

        this.fsm = new FSM(this, 'idle')
            .AddState('idle',       new FSMIdleState())
            .AddState('seek',       new FSMSeekState())
            .AddState('lowBattery', new FSMLowBatteryState())
            .AddState('charging',   new FSMChargingState())
            .Start();
    }

    Update(dt) {
        super.Update(dt);
        this.fsm.Update(dt);
        this._ClampPosition();
    }

    Draw(renderer) {
        const { x, y } = this.position;
        const hw = 11;

        // Debug: vision range circle
        if (debugMode) {
            renderer.DrawStrokeCircle(x, y, this.visionRange, new Color(0.85, 0.55, 0.2, 0.15), 1);
        }

        renderer.DrawFillBasicRectangle(x - hw, y - hw, hw * 2, hw * 2, this.stateColor);
        renderer.DrawStrokeBasicRectangle(x - hw, y - hw, hw * 2, hw * 2, Color.white, 1.5);
        renderer.DrawLine(x, y, x + Math.cos(this.rotation) * (hw + 4), y + Math.sin(this.rotation) * (hw + 4), Color.white, 2);
        const bw = 26, bh = 4, bx = x - 13, by = y - hw - 10;
        const pct = this.battery / 100;
        renderer.DrawFillBasicRectangle(bx, by, bw, bh, new Color(0.15, 0.15, 0.15, 0.85));
        renderer.DrawFillBasicRectangle(bx, by, bw * pct, bh, pct > 0.5 ? Color.lime : pct > 0.2 ? Color.yellow : Color.red);
        renderer.DrawStrokeBasicRectangle(bx, by, bw, bh, Color.black, 1);
        renderer.DrawFillText(`${this.name}  ${this.score}🗑`, x, by - 13, 'bold 11px monospace', Color.white, 'center');
        renderer.DrawFillText('[FSM]', x, by - 24, '9px monospace', FSM_BOT_COLORS.seek, 'center');

        // Target line: to rubbish or charger
        if (this._target && !this._target.collected) {
            renderer.DrawLine(x, y, this._target.position.x, this._target.position.y, new Color(0.95, 0.85, 0.2, 0.4), 1);
        } else if (this.battery < 30) {
            renderer.DrawLine(x, y, this.world.charger.position.x, this.world.charger.position.y, new Color(0.85, 0.35, 0.1, 0.4), 1);
        }

        this.fsm.DrawDebug(renderer, x, y + hw + 12);
    }
}

// endregion

// region BT Bot
// ── BT-only Bot ─────────────────────────────────────────────────────────────────
// One AI layer only: a reactive behavior tree handles all decisions including
// battery management. No FSM — mode changes emerge from BT priority.
// Shape: diamond  Color scheme: teal

const BT_BOT_COLORS = {
    collect:  new Color(0.15, 0.85, 0.85),
    charge:   new Color(0.35, 0.55, 1.0),
    wander:   new Color(0.45, 0.80, 0.65),
};

class BTBot extends CleanerRobot {
    constructor(name, x, y, world) {
        super(name, x, y, world);
        this.moveSpeed  = 80;
        this.stateColor = BT_BOT_COLORS.wander;

        this.blackboard = new BTBlackboard();

        // ┌──────────────────────────────────────────────────────────────────────┐
        // │  BTBot BT — handles ALL behaviour including battery in one tree.    │
        // │                                                                      │
        // │  ChargeCycle uses plain BTSequence (not reactive) so it commits to  │
        // │  a full charge once started — NeedsCharge is not re-checked mid-run.│
        // └──────────────────────────────────────────────────────────────────────┘
        this.bt = new BehaviorTree(this,
            new BTReactiveSelector('BTBotBrain', [

                new BTSequence('ChargeCycle', [
                    new BTCondition('NeedsCharge', (bot)          => bot.battery < 20),
                    new BTAction('GoToCharger',    (dt, bot, bb)  => bot._ActionGoToCharger(dt, bb)),
                    new BTAction('Recharge',        (dt, bot, bb)  => bot._ActionRecharge(dt))
                ]),

                new BTReactiveSequence('Collect', [
                    new BTAction('AcquireTarget', (dt, bot, bb) => bot._AcquireTarget(bb)),
                    new BTAction('NavigateTo',    (dt, bot, bb) => bot._ActionNavigateTo(dt, bb)),
                    new BTAction('PickUp',        (dt, bot, bb) => bot._ActionPickUp(bb))
                ]),

                new BTAction('Wander', (dt, bot, bb) => bot._ActionWander(dt, bb))

            ]),
            this.blackboard
        );
    }

    _ActionGoToCharger(dt, bb) {
        // Release held claim when entering charge mode
        const t = bb.Get('target');
        if (t && t.claimedBy === this) t.claimedBy = null;
        bb.Delete('target');
        this.stateColor = BT_BOT_COLORS.charge;
        this._SteerAndMove(this.world.charger.position, this.moveSpeed, dt);
        return Vector2.Magnitude(this.position, this.world.charger.position) < this.world.charger.radius
            ? BTStatus.SUCCESS : BTStatus.RUNNING;
    }

    _ActionRecharge(dt) {
        this.stateColor = BT_BOT_COLORS.charge;
        // +31.5/s to offset the 3.5/s passive drain in Update() → net +28/s while sitting on pad
        this.battery = Math.min(100, this.battery + 31.5 * dt);
        return this.battery >= 100 ? BTStatus.SUCCESS : BTStatus.RUNNING;
    }

    _AcquireTarget(bb) {
        const current = bb.Get('target');
        
        if (current && !current.collected && current.claimedBy === this)
            return BTStatus.SUCCESS;  // still ours

        if (current) {
            if (current.claimedBy === this)
                current.claimedBy = null;  // release our claim

            bb.Delete('target');  // always cleanup stale or stolen targets
        }

        let best = null, bestSq = Infinity;
        const visionSq = this.visionRange * this.visionRange;
        for (const r of this.world.rubbish) {
            if (r.collected || r.claimedBy)
                continue;

            const sq = Vector2.SqrMagnitude(this.position, r.position);
            if (sq <= visionSq && sq < bestSq) {
                bestSq = sq;
                best = r;
            }
        }
        if (!best)
            return BTStatus.FAILURE;

        best.claimedBy = this;
        bb.Set('target', best);
        
        return BTStatus.SUCCESS;
    }

    _ActionNavigateTo(dt, bb) {
        const target = bb.Get('target');
        if (!target || target.collected) { bb.Delete('target'); return BTStatus.FAILURE; }
        this.stateColor = BT_BOT_COLORS.collect;
        if (Vector2.Magnitude(this.position, target.position) < 14) return BTStatus.SUCCESS;
        this._SteerAndMove(target.position, this.moveSpeed, dt);
        return BTStatus.RUNNING;
    }

    _ActionPickUp(bb) {
        const target = bb.Get('target');
        if (target && !target.collected) { target.collected = true; target.claimedBy = null; this.score++; }
        bb.Delete('target');
        return BTStatus.SUCCESS;
    }

    _ActionWander(dt, bb) {
        this.stateColor = BT_BOT_COLORS.wander;
        let wp = bb.Get('wanderTarget');
        if (!wp || Vector2.Magnitude(this.position, wp) < 12) {
            wp = new Vector2(
                RandomBetweenFloat(50, this.game.screenWidth - 50),
                RandomBetweenFloat(70, this.game.screenHeight - 50)
            );
            bb.Set('wanderTarget', wp);
        }
        this._SteerAndMove(wp, this.moveSpeed * 0.38, dt);
        return BTStatus.RUNNING;
    }

    Update(dt) {
        super.Update(dt);
        this.battery = Math.max(0, this.battery - 3.5 * dt);
        this.bt.Update(dt);
        this._ClampPosition();
    }

    Draw(renderer) {
        const { x, y } = this.position;
        const d = 15; // half-diagonal of diamond
        const s = d * Math.SQRT2;

        // Debug: vision range circle
        if (debugMode) {
            renderer.DrawStrokeCircle(x, y, this.visionRange, new Color(0.45, 0.80, 0.65, 0.15), 1);
        }

        renderer.DrawFillRectangle(x, y, s, s, this.stateColor, Math.PI / 4);
        renderer.DrawStrokeRectangle(x, y, s, s, Color.white, 1.5, Math.PI / 4);
        renderer.DrawLine(x, y, x + Math.cos(this.rotation) * (d + 4), y + Math.sin(this.rotation) * (d + 4), Color.white, 2);
        const bw = 26, bh = 4, bx = x - 13, by = y - d - 10;
        const pct = this.battery / 100;
        renderer.DrawFillBasicRectangle(bx, by, bw, bh, new Color(0.15, 0.15, 0.15, 0.85));
        renderer.DrawFillBasicRectangle(bx, by, bw * pct, bh, pct > 0.5 ? Color.lime : pct > 0.2 ? Color.yellow : Color.red);
        renderer.DrawStrokeBasicRectangle(bx, by, bw, bh, Color.black, 1);
        renderer.DrawFillText(`${this.name}  ${this.score}🗑`, x, by - 13, 'bold 11px monospace', Color.white, 'center');
        renderer.DrawFillText('[BT]', x, by - 24, '9px monospace', BT_BOT_COLORS.collect, 'center');

        // Target line: to rubbish or charger
        const target = this.blackboard.Get('target');
        if (target && !target.collected) {
            renderer.DrawLine(x, y, target.position.x, target.position.y, new Color(0.45, 0.80, 0.65, 0.4), 1);
        } else if (this.battery < 30) {
            renderer.DrawLine(x, y, this.world.charger.position.x, this.world.charger.position.y, new Color(0.35, 0.55, 1.0, 0.4), 1);
        }

        this.bt.DrawDebug(renderer, x, y + d + 12);
    }
}

// endregion

// region Game
// ── Game ──────────────────────────────────────────────────────────────────────

class CleanerGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({ screenWidth: 960, screenHeight: 620 });
        this.graphicAssets = {};
        debugMode = true;
    }

    Start() {
        super.Start();

        this.charger = new ChargingPad(480, 76);
        this.rubbish = [];
        this._SpawnRubbish(28);

        const world = { charger: this.charger, rubbish: this.rubbish };

        this.bots = [
            this.AddGameObject(new FSMBTRobot('BOT-A', 200, 310, world)),
            this.AddGameObject(new FSMBTRobot('BOT-B', 760, 310, world)),
            this.AddGameObject(new FSMBTRobot('BOT-C', 480, 175, world)),
            this.AddGameObject(new FSMBTRobot('BOT-D', 480, 455, world)),
            this.AddGameObject(new FSMBot('FSM-1',  130, 530, world)),
            this.AddGameObject(new BTBot('BT-1',    830, 530, world)),
        ];

        // Stagger batteries so bots don't all rush the charger at once
        this.bots[1].battery = 68;
        this.bots[2].battery = 45;
        this.bots[3].battery = 82;
        this.bots[4].battery = 60;
        this.bots[5].battery = 75;

        this.selectedBot    = this.bots[0];
        this._prevMouseDown = false;
    }

    _SpawnRubbish(count) {
        // Prune already-collected items to prevent unbounded array growth
        for (let i = this.rubbish.length - 1; i >= 0; i--) {
            if (this.rubbish[i].collected) this.rubbish.splice(i, 1);
        }

        const clusters = [
            { x: 160, y: 220 }, { x: 800, y: 200 },
            { x: 160, y: 500 }, { x: 800, y: 490 },
            { x: 480, y: 345 }
        ];
        for (let i = 0; i < count; i++) {
            const c = clusters[i % clusters.length];
            const x = Clamp(c.x + RandomBetweenFloat(-110, 110), 40, 920);
            const y = Clamp(c.y + RandomBetweenFloat(-90, 90), 70, 580);
            this.rubbish.push(new RubbishItem(x, y));
        }
    }

    Update(dt) {
        super.Update(dt);

        // Respawn when fewer than 8 items remain
        if (this.rubbish.filter(r => !r.collected).length < 8) {
            this._SpawnRubbish(16);
        }

        // Click → select nearest bot for BT inspector
        const mouseDown = Input.mouse.down || Input.IsMouseDown();
        if (mouseDown && !this._prevMouseDown) {
            let nearest = null, nearestSq = 50 * 50;
            for (const bot of this.bots) {
                const sq = Vector2.SqrMagnitude(Input.mouse, bot.position);
                if (sq < nearestSq) { nearestSq = sq; nearest = bot; }
            }
            if (nearest) this.selectedBot = nearest;
        }
        this._prevMouseDown = mouseDown;

        // [SPACE] → cycle selection
        if (Input.IsKeyDown(KEY_SPACE)) {
            const idx = this.bots.indexOf(this.selectedBot);
            this.selectedBot = this.bots[(idx + 1) % this.bots.length];
        }

        // [D] → toggle debug overhead labels
        if (Input.IsKeyDown(KEY_D)) debugMode = !debugMode;

        // [E] → drain selected bot battery (test LOW_BATT transition)
        if (Input.IsKeyDown(KEY_E) && this.selectedBot) {
            this.selectedBot.battery = 5;
        }

        // [B] → force selected bot to break (FSMBTRobot only — FSMBot and BTBot have no broken state)
        if (Input.IsKeyDown(KEY_B) && this.selectedBot instanceof FSMBTRobot &&
            this.selectedBot.fsm.currentStateName === 'active') {
            this.selectedBot.fsm.Transition('broken');
        }
    }

    Draw() {
        // Background
        renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight,
            new Color(0.07, 0.09, 0.12));

        // Subtle grid
        for (let x = 0; x <= this.screenWidth; x += 60)
            renderer.DrawLine(x, 0, x, this.screenHeight, new Color(1, 1, 1, 0.032), 1);
        for (let y = 0; y <= this.screenHeight; y += 60)
            renderer.DrawLine(0, y, this.screenWidth, y, new Color(1, 1, 1, 0.032), 1);

        // World
        this.charger.Draw(renderer);
        for (const r of this.rubbish) r.Draw(renderer);

        // Bots (game objects)
        super.Draw();

        // UI
        this._DrawHeader();
        this._DrawLeaderboard();
        this._DrawInspector();
    }

    _DrawHeader() {
        renderer.DrawFillText(
            'Cleaner Bots — AI Comparison: ● BT+FSM  ■ FSM-only  ◆ BT-only',
            this.screenWidth / 2, 16,
            'bold 13px monospace', Color.cyan, 'center'
        );
        renderer.DrawFillText(
            'Click/[SPACE] select  [D] debug  [E] drain battery  [B] break (● only)',
            this.screenWidth / 2, 30,
            '10px monospace', new Color(0.55, 0.65, 0.75), 'center'
        );
    }

    _DrawLeaderboard() {
        const sorted = [...this.bots].sort((a, b) => b.score - a.score);
        const px = this.screenWidth - 164, py = 55;
        const bw = 150, lh = 20;
        const bh = sorted.length * lh + 30;

        renderer.DrawFillBasicRectangle(px - 8, py - 8, bw + 16, bh,
            new Color(0.05, 0.08, 0.12, 0.9));
        renderer.DrawStrokeBasicRectangle(px - 8, py - 8, bw + 16, bh,
            new Color(0.2, 0.35, 0.5, 0.8), 1);
        renderer.DrawFillText('LEADERBOARD', px + bw / 2, py + 6,
            'bold 11px monospace', Color.cyan, 'center');

        sorted.forEach((bot, i) => {
            const ly = py + 22 + i * lh;
            const isSelected = bot === this.selectedBot;
            const icon = bot instanceof FSMBTRobot ? '●' : bot instanceof FSMBot ? '■' : '◆';
            renderer.DrawFillText(
                `${i + 1}. ${icon} ${bot.name}`,
                px + 2, ly, '10px monospace',
                isSelected ? Color.yellow : bot.stateColor, 'left'
            );
            renderer.DrawFillText(
                `${bot.score}`,
                px + bw - 2, ly, '10px monospace', Color.white, 'right'
            );
        });
    }

    _DrawInspector() {
        if (!this.selectedBot) return;
        const bot = this.selectedBot;
        if (bot.bt) {
            const fsmPart = bot.fsm ? `  [${(bot.fsm.currentStateName ?? '').toUpperCase()}]` : '';
            const typeLabel = bot.fsm ? '● BT+FSM' : '◆ BT-only';
            bot.bt.DrawTreeInspector(renderer, 14, 55, {
                width: 295,
                title: `${typeLabel} — ${bot.name}${fsmPart}`,
                force: true
            });
        } else {
            this._DrawFSMPanel(bot);
        }
    }

    _DrawFSMPanel(bot) {
        const px = 14, py = 55, bw = 240;
        const states = ['idle', 'seek', 'lowBattery', 'charging'];
        const bh = states.length * 20 + 46;
        renderer.DrawFillBasicRectangle(px - 6, py - 6, bw + 12, bh, new Color(0.05, 0.08, 0.12, 0.9));
        renderer.DrawStrokeBasicRectangle(px - 6, py - 6, bw + 12, bh, new Color(0.2, 0.35, 0.5, 0.8), 1);
        renderer.DrawFillText(`■ FSM-only — ${bot.name}`, px, py + 8, 'bold 11px monospace', Color.cyan, 'left');
        states.forEach((state, i) => {
            const ly = py + 26 + i * 20;
            const isActive = bot.fsm.currentStateName === state;
            renderer.DrawFillText(
                isActive ? `▶ ${state}` : `  ${state}`,
                px, ly, '11px monospace',
                isActive ? bot.stateColor : new Color(0.38, 0.38, 0.38), 'left'
            );
        });
        renderer.DrawFillText(
            `battery: ${Math.floor(bot.battery)}%   score: ${bot.score}`,
            px, py + bh - 16, '10px monospace', Color.lightGrey, 'left'
        );
    }
}

// endregion

window.onload = () => Init(CleanerGame, 'canvas');
