/**
 * FSM Demo — Guard Patrol
 *
 * Three guards patrol between two waypoints each. When the mouse cursor (the "intruder")
 * enters a guard's detection radius, the guard transitions through the states:
 *
 *   Patrol → Alert → Chase → Return → Patrol
 *
 * Demonstrates:
 *   - Class-based FSMState (Style B)
 *   - Declarative transition guards (AddTransition) — evaluated before Update()
 *   - Imperative transitions (fsm.Transition()) — called from within Update()
 *   - Hysteresis on boundary conditions to prevent state flicker
 *   - FSM.DrawDebug() for state labels (shown because debugMode = true)
 */

// ── State colours ─────────────────────────────────────────────────────────────

const GUARD_COLORS = {
    patrol: new Color(0.2, 0.5, 1.0),
    alert:  Color.yellow,
    chase:  Color.red,
    return: Color.cyan
};

// ── States ────────────────────────────────────────────────────────────────────

class GuardPatrolState extends FSMState {
    constructor() {
        super();
        // Declarative guard: intruder within detection radius → Alert
        this.AddTransition('alert', owner =>
            Vector2.Magnitude(owner.position, Input.mouse) < owner.detectionRadius
        );
    }

    Enter(owner, prev) {
        owner.drawColor = GUARD_COLORS.patrol;
        owner.currentWP = owner.GetClosestWaypointIndex();
    }

    Update(dt, owner, fsm) {
        const wp = owner.waypoints[owner.currentWP];
        const dx = wp.x - owner.position.x;
        const dy = wp.y - owner.position.y;
        const distSq = SqrLength(dx, dy);

        if (distSq < 6 * 6) {
            owner.currentWP = (owner.currentWP + 1) % owner.waypoints.length;
        }
        else {
            const dist = Math.sqrt(distSq);
            owner.position.x += (dx / dist) * owner.patrolSpeed * dt;
            owner.position.y += (dy / dist) * owner.patrolSpeed * dt;
        }
    }
}

class GuardAlertState extends FSMState {
    constructor() {
        super();
        this._timer      = 0;
        this._flashTimer = 0;
        this._flashOn    = false;

        // Declarative guard: intruder leaves — 1.1× hysteresis prevents boundary flicker
        this.AddTransition('patrol', owner =>
            Vector2.Magnitude(owner.position, Input.mouse) > owner.detectionRadius * 1.1
        );
    }

    Enter(owner, prev) {
        owner.drawColor  = GUARD_COLORS.alert;
        this._timer      = 0;
        this._flashTimer = 0;
        this._flashOn    = false;
    }

    Update(dt, owner, fsm) {
        this._timer      += dt;
        this._flashTimer += dt;

        if (this._flashTimer > 0.12) {
            this._flashTimer = 0;
            this._flashOn    = !this._flashOn;
            owner.drawColor  = this._flashOn ? Color.yellow : Color.orange;
        }

        // Imperative transition: alert duration elapsed → Chase
        if (this._timer >= owner.alertDuration) {
            fsm.Transition('chase');
        }
    }

    Exit(owner, next) {
        owner.drawColor = GUARD_COLORS[next] || Color.white;
    }
}

class GuardChaseState extends FSMState {
    constructor() {
        super();

        // Declarative guard: intruder too far → Return to post
        this.AddTransition('return', owner =>
            Vector2.Magnitude(owner.position, Input.mouse) > owner.chaseRadius
        );
    }

    Enter(owner, prev) {
        owner.drawColor = GUARD_COLORS.chase;
    }

    Update(dt, owner, fsm) {
        const dx = Input.mouse.x - owner.position.x;
        const dy = Input.mouse.y - owner.position.y;
        const dist = Length(dx, dy);

        if (dist > 1) {
            owner.position.x += (dx / dist) * owner.chaseSpeed * dt;
            owner.position.y += (dy / dist) * owner.chaseSpeed * dt;
        }
    }
}

class GuardReturnState extends FSMState {
    Enter(owner, prev) {
        owner.drawColor    = GUARD_COLORS.return;
        owner.returnTarget = Vector2.Copy(owner.waypoints[owner.GetClosestWaypointIndex()]);
    }

    Update(dt, owner, fsm) {
        const wp   = owner.returnTarget;
        const dx   = wp.x - owner.position.x;
        const dy   = wp.y - owner.position.y;
        const distSq = SqrLength(dx, dy);

        if (distSq < 6 * 6) {
            // Imperative transition: reached the waypoint → resume Patrol
            owner.currentWP = owner.GetClosestWaypointIndex();
            fsm.Transition('patrol');
        }
        else {
            const dist = Math.sqrt(distSq);
            owner.position.x += (dx / dist) * owner.returnSpeed * dt;
            owner.position.y += (dy / dist) * owner.returnSpeed * dt;
        }
    }
}

// ── GuardBot ──────────────────────────────────────────────────────────────────

class GuardBot extends GameObject {
    /**
     * @param {Vector2}   position   Starting position.
     * @param {Vector2[]} waypoints  Two patrol waypoints (A and B).
     * @param {object}    [opts]
     */
    constructor(position, waypoints, opts = {}) {
        super(position, 0, 1);

        this.waypoints       = waypoints;
        this.currentWP       = 0;
        this.returnTarget    = Vector2.Zero();

        this.patrolSpeed     = opts.patrolSpeed  || 70;
        this.chaseSpeed      = opts.chaseSpeed   || 130;
        this.returnSpeed     = opts.returnSpeed  || 95;
        this.detectionRadius = opts.detection    || 90;
        this.chaseRadius     = opts.chaseRange   || 165;
        this.alertDuration   = opts.alertFor     || 1.5;

        this.radius    = 11;
        this.drawColor = GUARD_COLORS.patrol;

        this.fsm = new FSM(this, 'patrol')
            .AddState('patrol', new GuardPatrolState())
            .AddState('alert',  new GuardAlertState())
            .AddState('chase',  new GuardChaseState())
            .AddState('return', new GuardReturnState());
    }

    Start() {
        this.fsm.Start();
    }

    GetClosestWaypointIndex() {
        let minD = Infinity, idx = 0;
        for (let i = 0; i < this.waypoints.length; i++) {
            const d = Vector2.Magnitude(this.position, this.waypoints[i]);
            if (d < minD) {
                minD = d;
                idx = i;
            }
        }
        return idx;
    }

    Update(dt) {
        super.Update(dt);

        this.fsm.Update(dt);

        this.position.x = Clamp(this.position.x, this.radius, game.config.screenWidth  - this.radius);
        this.position.y = Clamp(this.position.y, this.radius, game.config.screenHeight - this.radius);
    }

    Draw(renderer) {
        const state = this.fsm.currentStateName;
        const x = this.position.x;
        const y = this.position.y;

        // Faint patrol path
        if (state === 'patrol' || state === 'return') {
            const pathColor = new Color(1, 1, 1, 0.07);
            for (let i = 0; i < this.waypoints.length; i++) {
                const a = this.waypoints[i];
                const b = this.waypoints[(i + 1) % this.waypoints.length];
                renderer.DrawLine(a.x, a.y, b.x, b.y, pathColor, 1);
            }

            this.waypoints.forEach(wp =>
                renderer.DrawStrokeCircle(wp.x, wp.y, 4, new Color(1, 1, 1, 0.18), 1)
            );
        }

        // Detection / chase radius ring
        if (state === 'patrol' || state === 'alert') {
            renderer.DrawStrokeCircle(x, y, this.detectionRadius, new Color(1, 1, 0.3, 0.1), 1);
        }
        else if (state === 'chase') {
            renderer.DrawStrokeCircle(x, y, this.chaseRadius, new Color(1, 0.2, 0.2, 0.1), 1);
        }

        // Body
        renderer.DrawFillCircle(x, y, this.radius, this.drawColor);
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 1.5);

        // State label (only when debugMode is true — set at top of this file)
        this.fsm.DrawDebug(renderer, x, y - this.radius - 7);
    }
}


// ── Game ──────────────────────────────────────────────────────────────────────

class FsmBasicGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({ screenWidth: 800, screenHeight: 600 });

        this.bgColor = new Color(0.07, 0.07, 0.12);

        this.textFSMDiagram = [
            'Patrol  →[in range]→    Alert',
            'Alert   →[timer]→       Chase',
            'Alert   →[left range]→ Patrol',
            'Chase   →[too far]→    Return',
            'Return  →[at post]→    Patrol',
        ];

        this.textLegendEntries = [
            ['Patrol  — patrols between waypoints',    GUARD_COLORS.patrol],
            ['Alert   — intruder spotted, 1.5s timer', GUARD_COLORS.alert],
            ['Chase   — pursuing the intruder',        GUARD_COLORS.chase],
            ['Return  — back to patrol post',          GUARD_COLORS.return],
        ];

        debugMode = true; // enable FSM state labels
    }

    Start() {
        super.Start();

        // Guard 1 — left vertical path
        this.AddGameObject(new GuardBot(
            new Vector2(160, 200),
            [new Vector2(160, 165), new Vector2(160, 435)],
            { patrolSpeed: 65, detection: 90, chaseRange: 165 }
        ));

        // Guard 2 — centre vertical path, wider detection
        this.AddGameObject(new GuardBot(
            new Vector2(400, 130),
            [new Vector2(400, 130), new Vector2(400, 470)],
            { patrolSpeed: 75, detection: 105, chaseRange: 185, alertFor: 1.2 }
        ));

        // Guard 3 — right vertical path
        this.AddGameObject(new GuardBot(
            new Vector2(640, 435),
            [new Vector2(640, 165), new Vector2(640, 435)],
            { patrolSpeed: 70, detection: 90, chaseRange: 165 }
        ));
    }

    Update(dt) {
        super.Update(dt);
    }

    Draw() {
        renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this.bgColor);

        super.Draw();

        // Intruder crosshair at mouse position
        const mx = Input.mouse.x;
        const my = Input.mouse.y;
        renderer.DrawStrokeCircle(mx, my, 7, Color.lime, 1.5);
        renderer.DrawLine(mx - 12, my, mx + 12, my, Color.lime, 1);
        renderer.DrawLine(mx, my - 12, mx, my + 12, Color.lime, 1);

        // Title + instructions
        renderer.DrawFillText(
            'FSM Demo — Guard Patrol',
            this.screenWidth / 2, 24,
            'bold 18px Arial', Color.white, 'center'
        );
        renderer.DrawFillText(
            'Move the mouse cursor near a guard to trigger state changes',
            this.screenWidth / 2, 46,
            '13px Arial', new Color(0.65, 0.65, 0.65), 'center'
        );

        this._DrawLegend(renderer);
        this._DrawTransitionDiagram(renderer);
    }

    _DrawLegend(renderer) {
        const lx = 16;
        let   ly = this.screenHeight - 94;
        renderer.DrawFillText('States:', lx, ly, 'bold 12px monospace', Color.white, 'left');
        ly += 18;
        for (const [label, color] of this.textLegendEntries) {
            renderer.DrawFillCircle(lx + 5, ly - 4, 5, color);
            renderer.DrawFillText(label, lx + 16, ly, '11px monospace', Color.white, 'left');
            ly += 16;
        }
    }

    _DrawTransitionDiagram(renderer) {
        // Small text diagram of the FSM in the top-right corner
        const rx = this.screenWidth - 16;
        let   ry = 65;
        const dim = new Color(0.55, 0.55, 0.55);
        renderer.DrawFillText('Transition graph:', rx, ry, 'bold 11px monospace', dim, 'right');
        ry += 16;
        for (const line of this.textFSMDiagram) {
            renderer.DrawFillText(line, rx, ry, '10px monospace', dim, 'right');
            ry += 14;
        }
    }
}

window.onload = () => Init(FsmBasicGame, "canvas");
