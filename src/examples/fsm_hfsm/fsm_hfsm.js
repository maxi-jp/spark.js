/**
 * HFSM Demo — Sentry AI
 *
 * Two sentry NPCs guard an area using a Hierarchical FSM. Each NPC has:
 *
 *   Top-level FSM:
 *     patrol  ←→  combat  →  flee  →  patrol
 *
 *   Combat composite state (nested sub-FSM):
 *     approach  →  attack  →  cooldown  →  approach  (loop)
 *
 * Interactions:
 *   Left-click       — move the threat to that position
 *   Right-click NPC  — deal 25 damage (triggers Flee when health < 30%)
 *
 * Demonstrates:
 *   - FSMCompositeState for hierarchical (HFSM) behaviour
 *   - Parent-level declarative guards overriding nested sub-states
 *   - Sub-state declarative guards (approach → attack)
 *   - Imperative transitions from within Update() (attack → cooldown, cooldown → approach)
 *   - Two-level debug labels via FSM.DrawDebug()
 */

// ── Combat sub-states ─────────────────────────────────────────────────────────

class SentryApproachState extends FSMState {
    constructor() {
        super();
        // Declarative guard: within attack range → Attack
        this.AddTransition('attack', owner =>
            owner.threat && !owner.threat.isDead &&
            Vector2.Magnitude(owner.position, owner.threat.position) < owner.attackRange
        );
    }

    Update(dt, owner, fsm) {
        const threat = owner.threat;
        if (!threat || threat.isDead)
            return;

        const dx   = threat.position.x - owner.position.x;
        const dy   = threat.position.y - owner.position.y;
        const dist = Length(dx, dy);

        if (dist > 1) {
            owner.position.x += (dx / dist) * owner.speed * dt;
            owner.position.y += (dy / dist) * owner.speed * dt;
        }
    }
}

class SentryAttackState extends FSMState {
    constructor() {
        super();
        this._timer       = 0;
        this._attacksDone = 0;
        this._maxAttacks  = 3;
        this._interval    = 1.5;  // seconds between attacks
        this._flashTimer  = 0;

        // Declarative guard: target left attack range (e.g., threat was moved) → re-approach
        this.AddTransition('approach', owner =>
            !owner.threat || owner.threat.isDead ||
            Vector2.Magnitude(owner.position, owner.threat.position) > owner.attackRange * 1.3
        );
    }

    Enter(owner, prev) {
        this._timer       = 0;
        this._attacksDone = 0;
        this._flashTimer  = 0;
        owner.attackFlash = false;
    }

    Update(dt, owner, fsm) {
        this._timer      += dt;
        this._flashTimer  = Math.max(0, this._flashTimer - dt);
        owner.attackFlash = this._flashTimer > 0;

        if (this._timer >= this._interval) {
            this._timer -= this._interval;
            this._attacksDone++;
            this._flashTimer = 0.2;

            if (owner.threat && !owner.threat.isDead) {
                owner.threat.TakeDamage(owner.attackDamage);
            }

            // Imperative: attack burst complete → Cooldown
            if (this._attacksDone >= this._maxAttacks) {
                fsm.Transition('cooldown');
            }
        }
    }

    Exit(owner, next) {
        owner.attackFlash = false;
    }
}

class SentryCooldownState extends FSMState {
    constructor() {
        super();
        this._timer    = 0;
        this._duration = 2.0;
    }

    Enter(owner, prev) {
        this._timer = 0;
    }

    Update(dt, owner, fsm) {
        this._timer += dt;
        // Imperative: cooldown elapsed → back to Approach
        if (this._timer >= this._duration) {
            fsm.Transition('approach');
        }
    }
}

// ── Combat composite state (wraps the attack sub-FSM) ─────────────────────────

class SentryCombatState extends FSMCompositeState {
    /**
     * @param {*} owner  The NPC that owns this state (needed to wire the sub-FSM owner).
     */
    constructor(owner) {
        super();
        this.subFSM = new FSM(owner, 'approach')
            .AddState('approach', new SentryApproachState())
            .AddState('attack',   new SentryAttackState())
            .AddState('cooldown', new SentryCooldownState());
        // Sub-FSM is started/stopped automatically by FSMCompositeState.Enter/Exit.
    }

    Enter(owner, prev) {
        super.Enter(owner, prev); // starts subFSM from 'approach'
    }

    Update(dt, owner, fsm) {
        super.Update(dt, owner, fsm); // ticks subFSM
    }

    Exit(owner, next) {
        super.Exit(owner, next); // stops subFSM, cleanly exits active sub-state
    }
}

// ── Top-level states ──────────────────────────────────────────────────────────

class SentryPatrolState extends FSMState {
    constructor() {
        super();
        // Declarative guard: threat detected → Combat
        this.AddTransition('combat', owner =>
            owner.threat && !owner.threat.isDead &&
            Vector2.Magnitude(owner.position, owner.threat.position) < owner.detectionRadius
        );
    }

    Enter(owner, prev) {
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
            owner.position.x += (dx / dist) * owner.speed * dt;
            owner.position.y += (dy / dist) * owner.speed * dt;
        }
    }
}

class SentryFleeState extends FSMState {
    Update(dt, owner, fsm) {
        const home = owner.safeZone;
        const dx   = home.x - owner.position.x;
        const dy   = home.y - owner.position.y;
        const distSq = SqrLength(dx, dy);

        if (distSq < 14 * 14) {
            // Heal at safe zone
            owner.health = Math.min(owner.maxHealth, owner.health + owner.healRate * dt);

            // Imperative: healthy and threat is gone or far → Patrol
            if (owner.health >= owner.maxHealth * 0.7) {
                const threat    = owner.threat;
                const threatFar = !threat || threat.isDead ||
                    Vector2.Magnitude(owner.position, threat.position) > owner.detectionRadius * 2;
                
                if (threatFar)
                    fsm.Transition('patrol');
            }
        }
        else {
            const dist = Math.sqrt(distSq);
            owner.position.x += (dx / dist) * owner.fleeSpeed * dt;
            owner.position.y += (dy / dist) * owner.fleeSpeed * dt;
        }
    }
}

// ── SentryNPC ─────────────────────────────────────────────────────────────────

class SentryNPC extends GameObject {
    /**
     * @param {Vector2}   position
     * @param {Vector2[]} waypoints       Two or more patrol waypoints.
     * @param {Vector2}   safeZone        Position to flee to.
     * @param {object}    [opts]
     */
    constructor(position, waypoints, safeZone, opts = {}) {
        super(position, 0, 1);

        this.maxHealth       = 100;
        this.health          = 100;
        this.healRate        = 15; // HP/s while at safe zone
        this.speed           = 80;
        this.fleeSpeed       = 140;
        this.detectionRadius = opts.detectionRadius || 130;
        this.attackRange     = opts.attackRange     || 55;
        this.attackDamage    = 15;
        this.fleeThreshold   = 0.3;
        this.radius          = 11;

        this.waypoints   = waypoints;
        this.currentWP   = 0;
        this.safeZone    = safeZone;
        this.threat      = null;   // wired up by the game after construction
        this.attackFlash = false;

        this.bodyColor = {
            patrol: new Color(0.2, 0.5, 1.0),
            combat: Color.red,
            flee:   Color.orange
        };
        this.detectionRingColor = new Color(1, 1, 1, 0.07);
        this.attackRingColor = new Color(1, 0.2, 0.2, 0.18);

        // Build the HFSM
        const combatState = new SentryCombatState(this);

        // Parent-level guards on the Combat state — checked BEFORE the sub-FSM updates
        combatState.AddTransition('flee', owner =>
            owner.health < owner.maxHealth * owner.fleeThreshold
        );
        combatState.AddTransition('patrol', owner => {
            if (!owner.threat || owner.threat.isDead)
                return true;

            // Hysteresis: 1.5× detection radius prevents rapid patrol/combat oscillation
            return Vector2.Magnitude(owner.position, owner.threat.position) > owner.detectionRadius * 1.5;
        });

        this.fsm = new FSM(this, 'patrol')
            .AddState('patrol', new SentryPatrolState())
            .AddState('combat', combatState)
            .AddState('flee',   new SentryFleeState());
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

    TakeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }

    Update(dt) {
        super.Update(dt);
        this.fsm.Update(dt);

        this.position.x = Clamp(this.position.x, this.radius, game.screenWidth  - this.radius);
        this.position.y = Clamp(this.position.y, this.radius, game.screenHeight - this.radius);
    }

    Draw(renderer) {
        const state = this.fsm.currentStateName;
        const x = this.position.x;
        const y = this.position.y;

        // Detection radius ring
        renderer.DrawStrokeCircle(x, y, this.detectionRadius, this.detectionRingColor, 1);

        // Attack range ring (only in Combat)
        if (state === 'combat') {
            renderer.DrawStrokeCircle(x, y, this.attackRange, this.attackRingColor, 1);
        }

        // Safe zone indicator (only when fleeing)
        if (state === 'flee') {
            renderer.DrawStrokeCircle(this.safeZone.x, this.safeZone.y, 22, Color.orange, 1);
            renderer.DrawLine(x, y, this.safeZone.x, this.safeZone.y, new Color(1, 0.5, 0, 0.3), 1);
        }

        // Body
        const bodyColor = this.attackFlash ? Color.yellow : (this.bodyColor[state] || Color.white);
        renderer.DrawFillCircle(x, y, this.radius, bodyColor);
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 1.5);

        // HP bar
        const barW     = 46;
        const pct      = this.health / this.maxHealth;
        const barColor = pct > 0.5 ? Color.lime : pct > 0.3 ? Color.orange : Color.red;
        renderer.DrawFillBasicRectangle(x - barW / 2, y + this.radius + 3, barW, 5, new Color(0.25, 0.25, 0.25));
        renderer.DrawFillBasicRectangle(x - barW / 2, y + this.radius + 3, barW * pct, 5, barColor);

        // Top-level state label
        this.fsm.DrawDebug(renderer, x, y - this.radius - 7, Color.yellow);

        // Sub-state label when in Combat (shown below the top-level label)
        if (state === 'combat') {
            const combatState = this.fsm.currentState;
            if (combatState && combatState.subFSM) {
                combatState.subFSM.DrawDebug(renderer, x, y - this.radius - 20, Color.cyan);
            }
        }
    }
}

// ── ThreatMarker ──────────────────────────────────────────────────────────────

class ThreatMarker extends GameObject {
    constructor() {
        super(new Vector2(400, 300), 0, 1);
        this.maxHealth  = 100;
        this.health     = 100;
        this.regenRate  = 4;   // HP/s
        this.isDead     = false;
        this.radius     = 14;
        this._flashTimer = 0;
    }

    Update(dt) {
        super.Update(dt);
        this._flashTimer = Math.max(0, this._flashTimer - dt);

        if (this.isDead) {
            // Slowly regenerate and auto-revive at 30%
            this.health = Math.min(this.maxHealth, this.health + this.regenRate * dt);

            if (this.health >= this.maxHealth * 0.3)
                this.isDead = false;
        }
        else {
            this.health = Math.min(this.maxHealth, this.health + this.regenRate * dt);
        }

        // Left-click moves the threat
        if (Input.IsMouseDown(0)) {
            this.position.Set(Input.mouse.x, Input.mouse.y);
        }
    }

    Draw(renderer) {
        const hit   = this._flashTimer > 0;
        const color = this.isDead ? Color.grey : (hit ? Color.white : Color.red);
        const s     = this.radius;
        const x     = this.position.x;
        const y     = this.position.y;

        renderer.DrawLine(x - s, y - s, x + s, y + s, color, 2.5);
        renderer.DrawLine(x + s, y - s, x - s, y + s, color, 2.5);
        renderer.DrawStrokeCircle(x, y, s, color, 1.5);

        // HP bar
        const barW     = 46;
        const pct      = this.health / this.maxHealth;
        const barColor = this.isDead ? Color.grey : Color.red;
        renderer.DrawFillBasicRectangle(x - barW / 2, y + s + 3, barW, 5, new Color(0.25, 0.25, 0.25));
        renderer.DrawFillBasicRectangle(x - barW / 2, y + s + 3, barW * pct, 5, barColor);

        renderer.DrawFillText(
            this.isDead ? 'THREAT (reviving…)' : 'THREAT',
            x, y - s - 6, '10px monospace', color, 'center'
        );
    }

    TakeDamage(amount) {
        if (this.isDead)
            return;
        
        this.health      = Math.max(0, this.health - amount);
        this._flashTimer = 0.18;

        if (this.health <= 0)
            this.isDead = true;
    }
}


// ── Game ──────────────────────────────────────────────────────────────────────

class FsmHfsmGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({ screenWidth: 800, screenHeight: 600 });

        this.bgColor = new Color(0.07, 0.07, 0.12);
        this.safeZoneColor = new Color(1, 0.5, 0, 0.15);

        this.textFSMDiagram = [
            'patrol →[detected]→       combat',
            'combat →[flee threshold]→   flee',
            'combat →[lost/dead]→      patrol',
            'flee   →[healthy + safe]→ patrol',
            '',
            'combat sub-FSM:',
            '  approach →[in range]→     attack',
            '  attack   →[burst done]→ cooldown',
            '  attack   →[out range]→  approach',
            '  cooldown →[elapsed]→    approach',
        ];

        this.textLegendEntries = [
            ['Patrol             (blue)',    new Color(0.2, 0.5, 1.0)],
            ['Combat             (red)',     Color.red],
            ['  ↳ approach sub-state',       Color.orange],
            ['  ↳ attack sub-state',         Color.yellow],
            ['  ↳ cooldown sub-state',       Color.cyan],
            ['Flee (< 30% HP)    (orange)',  Color.orange],
        ];

        debugMode = true; // enable FSM state labels
    }

    Start() {
        super.Start();

        // Threat marker (left-click to reposition)
        this.threat = this.AddGameObject(new ThreatMarker());

        // NPC 1 — top-left patrol area
        this.npc1 = this.AddGameObject(new SentryNPC(
            new Vector2(165, 175),
            [new Vector2(110, 140), new Vector2(320, 270)],
            new Vector2(38, 38),
            { detectionRadius: 130, attackRange: 55 }
        ));
        this.npc1.threat = this.threat;

        // NPC 2 — bottom-right patrol area, slightly tighter detection
        this.npc2 = this.AddGameObject(new SentryNPC(
            new Vector2(635, 430),
            [new Vector2(490, 355), new Vector2(720, 475)],
            new Vector2(762, 562),
            { detectionRadius: 115, attackRange: 50 }
        ));
        this.npc2.threat = this.threat;

        this._npcs = [this.npc1, this.npc2];
    }

    Update(dt) {
        super.Update(dt);

        // Right-click within 55px of an NPC deals 25 damage (demonstrates flee)
        if (Input.mouse.right.down) {
            for (const npc of this._npcs) {
                if (Vector2.SqrMagnitude(npc.position, Input.mouse) < 55 * 55) {
                    npc.TakeDamage(25);
                    break;
                }
            }
        }
    }

    Draw() {
        renderer.DrawFillBasicRectangle(0, 0, this.config.screenWidth, this.config.screenHeight, this.bgColor);

        // Faint safe-zone rings (always visible as landmarks)
        for (const npc of this._npcs) {
            renderer.DrawStrokeCircle(npc.safeZone.x, npc.safeZone.y, 20, this.safeZoneColor, 1);
        }

        super.Draw();

        // Title + instructions
        renderer.DrawFillText(
            'HFSM Demo — Sentry AI',
            this.screenWidth / 2, 24,
            'bold 18px Arial', Color.white, 'center'
        );
        const instColor = new Color(0.6, 0.6, 0.6);
        renderer.DrawFillText(
            'Left-click: move threat   Right-click near NPC: deal 25 damage (trigger flee)',
            this.screenWidth / 2, 46,
            '12px Arial', instColor, 'center'
        );

        this._DrawLegend(renderer);
        this._DrawHFSMDiagram(renderer);
    }

    _DrawLegend(renderer) {
        const lx = 16;
        let   ly = this.screenHeight - 122;
        renderer.DrawFillText('NPC States:', lx, ly, 'bold 12px monospace', Color.white, 'left');
        ly += 18;
        for (const [label, color] of this.textLegendEntries) {
            renderer.DrawFillCircle(lx + 5, ly - 4, 4, color);
            renderer.DrawFillText(label, lx + 16, ly, '11px monospace', Color.white, 'left');
            ly += 16;
        }
    }

    _DrawHFSMDiagram(renderer) {
        const rx = this.screenWidth - 14;
        let   ry = 65;
        const dim = new Color(0.5, 0.5, 0.5);
        renderer.DrawFillText('HFSM structure:', rx, ry, 'bold 11px monospace', dim, 'right');
        ry += 15;
        for (const line of this.textFSMDiagram) {
            renderer.DrawFillText(line, rx, ry, '10px monospace', dim, 'right');
            ry += 13;
        }
    }
}

window.onload = () => Init(FsmHfsmGame, "canvas");
