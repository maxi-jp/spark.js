/**
 * Behavior Tree Demo — Stealth Guard AI
 *
 * Demonstrates:
 *   - Class-based Behavior Tree architecture (BTNode, BTComposite, BTDecorator, BTAction, BTCondition, BTWait)
 *   - Reactive decision making via BTReactiveSelector (priority interruption)
 *   - Multi-step procedural behaviors via BTSequence
 *   - Blackboard memory sharing (noise events, last known target position)
 *   - Dual sensory perception (Vision cone + directional FOV, and Sound/Hearing detection)
 *   - Real-time Visual Tree Inspector (DrawTreeInspector) and overhead debug labels (DrawDebug)
 */

// ── Colors ────────────────────────────────────────────────────────────────────

const GUARD_COLORS = {
    patrol:      new Color(0.2, 0.6, 1.0),
    investigate: new Color(1.0, 0.75, 0.1),
    chase:       new Color(1.0, 0.25, 0.25),
    search:      new Color(0.8, 0.3, 0.9),
    body:        new Color(0.15, 0.2, 0.3),
    intruder:    Color.lime
};

// ── StealthGuard ──────────────────────────────────────────────────────────────

class StealthGuard extends GameObject {
    /**
     * @param {string} name
     * @param {Vector2} position
     * @param {Vector2[]} waypoints
     * @param {object} [opts]
     */
    constructor(name, position, waypoints, opts = {}) {
        super(Vector2.Copy(position), 0, 1);

        this.name = name;
        this.waypoints = waypoints;
        this.currentWP = 0;

        // Speeds (pixels per second)
        this.patrolSpeed      = opts.patrolSpeed ?? 65;
        this.investigateSpeed = opts.investigateSpeed ?? 95;
        this.chaseSpeed       = opts.chaseSpeed ?? 140;
        this.turnSpeed        = opts.turnSpeed ?? 4.2; // rad/s

        // Perception settings
        this.visionRange      = opts.visionRange ?? 170;
        this.visionAngle      = (opts.visionAngleDeg ?? 65) * Math.PI / 180;
        this.hearingRange     = opts.hearingRange ?? 230;
        this.proximityRange   = opts.proximityRange ?? 35; // 360-degree close-quarters awareness

        this.radius = 12;
        this.currentSpeed = this.patrolSpeed;
        this.stateColor = GUARD_COLORS.patrol;

        // Target rotation for smooth facing
        this.targetRotation = 0;

        // Setup the Behavior Tree
        this._BuildBehaviorTree();
    }

    /**
     * Constructs the guard's AI brain using pure declarative BT nodes.
     * @private
     */
    _BuildBehaviorTree() {
        this.blackboard = new BTBlackboard();

        // ┌────────────────────────────────────────────────────────────────────────┐
        // │                         Guard Behavior Tree                            │
        // │                                                                        │
        // │  BTReactiveSelector: Evaluates priority top-to-bottom every frame.    │
        // │  Higher branches immediately abort lower branches when valid!         │
        // └────────────────────────────────────────────────────────────────────────┘
        this.bt = new BehaviorTree(this,
            new BTReactiveSelector('GuardBrain', [

                // ── Priority 1: Combat / Active Chase ────────────────────────────
                new BTSequence('CombatChase', [
                    new BTCondition('CanSeeIntruder', (owner) => owner.CanSeeIntruder()),
                    new BTAction('ChaseIntruder', (dt, owner, bb) => owner.ActionChase(dt, bb))
                ]),

                // ── Priority 2: Investigate Distraction Noise ────────────────────
                new BTSequence('InvestigateNoise', [
                    new BTCondition('HasHeardNoise', (owner, bb) => bb.Has('noisePos')),
                    new BTAction('WalkToNoise', (dt, owner, bb) => owner.ActionWalkToNoise(dt, bb)),
                    new BTWait('ScanNoiseArea', 2.0),
                    new BTAction('ClearNoiseMemory', (dt, owner, bb) => {
                        bb.Delete('noisePos');
                        return BTStatus.SUCCESS;
                    })
                ]),

                // ── Priority 3: Search Last Known Position ───────────────────────
                new BTSequence('SearchLastSeen', [
                    new BTCondition('HasLostTarget', (owner, bb) => bb.Has('lastKnownPos')),
                    new BTAction('WalkToLastKnown', (dt, owner, bb) => owner.ActionWalkToLastKnown(dt, bb)),
                    new BTWait('SearchArea', 2.5),
                    new BTAction('GiveUpSearch', (dt, owner, bb) => {
                        bb.Delete('lastKnownPos');
                        return BTStatus.SUCCESS;
                    })
                ]),

                // ── Priority 4: Standard Routine Patrol ──────────────────────────
                new BTSequence('PatrolRoutine', [
                    new BTAction('WalkToWaypoint', (dt, owner, bb) => owner.ActionWalkToWaypoint(dt)),
                    new BTWait('GuardPostPause', 1.5)
                ])

            ]),
            this.blackboard
        );
    }

    // ── Perception Queries ───────────────────────────────────────────────────

    /**
     * Checks if the intruder (mouse cursor) is currently detectable via vision.
     * @returns {boolean}
     */
    CanSeeIntruder() {
        const intruder = Input.mouse;
        const dx = intruder.x - this.position.x;
        const dy = intruder.y - this.position.y;
        const distSq = dx * dx + dy * dy;

        // Proximity detection (too close from behind)
        if (distSq <= this.proximityRange * this.proximityRange) {
            return true;
        }

        // Outside vision range
        if (distSq > this.visionRange * this.visionRange) {
            return false;
        }

        // Angle check within forward field of view
        const angleToIntruder = Math.atan2(dy, dx);
        let angleDiff = NormalizeAngle(angleToIntruder - this.rotation);

        return Math.abs(angleDiff) <= this.visionAngle / 2;
    }

    /**
     * Checks if the guard can maintain visual contact while actively pursuing.
     * Allows a slightly wider peripheral view and chase distance before losing sight.
     * If the intruder runs beyond max chase distance or slips behind the guard, visual is broken.
     * @returns {boolean}
     */
    CanMaintainVisualContact() {
        const intruder = Input.mouse;
        const dx = intruder.x - this.position.x;
        const dy = intruder.y - this.position.y;
        const distSq = dx * dx + dy * dy;

        // Unconditional detection if touching guard
        if (distSq <= this.proximityRange * this.proximityRange) {
            return true;
        }

        // Intruder ran too far away: visual contact broken!
        const maxChaseDist = this.visionRange * 1.35;
        if (distSq > maxChaseDist * maxChaseDist) {
            return false;
        }

        // Angle check: while chasing, guard has a wider field of attention (~90 deg)
        const angleToIntruder = Math.atan2(dy, dx);
        const angleDiff = Math.abs(NormalizeAngle(angleToIntruder - this.rotation));
        const chaseHalfAngle = (this.visionAngle * 1.35) / 2;

        return angleDiff <= chaseHalfAngle;
    }

    /**
     * Called when a sound occurs in the world.
     * @param {Vector2} soundPos
     */
    OnHeardSound(soundPos) {
        const d = Vector2.Magnitude(this.position, soundPos);
        if (d <= this.hearingRange) {
            this.blackboard.Set('noisePos', Vector2.Copy(soundPos));
        }
    }

    // ── Behavior Actions ─────────────────────────────────────────────────────

    /**
     * Action: Pursue visible intruder at top speed.
     * If intruder escapes line of sight, fails so the tree transitions to SearchLastSeen.
     */
    ActionChase(dt, bb) {
        // Did intruder escape our vision or run too far?
        if (!this.CanMaintainVisualContact()) {
            // Visual contact lost!
            // lastKnownPos was saved on previous frames while in sight.
            // Returning FAILURE causes CombatChase sequence to fail,
            // dropping evaluation down to SearchLastSeen!
            return BTStatus.FAILURE;
        }

        const intruder = Input.mouse;
        this.stateColor = GUARD_COLORS.chase;
        this.currentSpeed = this.chaseSpeed;

        // Continuously update last known spot while target is visible
        bb.Set('lastKnownPos', new Vector2(intruder.x, intruder.y));

        this._SteerAndMove(intruder, this.chaseSpeed, dt);

        // Keep running while actively chasing
        return BTStatus.RUNNING;
    }

    /**
     * Action: Move toward a heard sound location.
     */
    ActionWalkToNoise(dt, bb) {
        const target = bb.Get('noisePos');
        if (!target) return BTStatus.FAILURE;

        this.stateColor = GUARD_COLORS.investigate;
        this.currentSpeed = this.investigateSpeed;

        const dist = Vector2.Magnitude(this.position, target);
        if (dist < 12) {
            return BTStatus.SUCCESS; // Reached noise location; advances to scan wait
        }

        this._SteerAndMove(target, this.investigateSpeed, dt);
        return BTStatus.RUNNING;
    }

    /**
     * Action: Move to where the intruder was last seen before losing sight.
     */
    ActionWalkToLastKnown(dt, bb) {
        const target = bb.Get('lastKnownPos');
        if (!target) return BTStatus.FAILURE;

        this.stateColor = GUARD_COLORS.search;
        this.currentSpeed = this.investigateSpeed;

        const dist = Vector2.Magnitude(this.position, target);
        if (dist < 14) {
            return BTStatus.SUCCESS; // Reached search position; advances to search wait
        }

        this._SteerAndMove(target, this.investigateSpeed, dt);
        return BTStatus.RUNNING;
    }

    /**
     * Action: Walk toward the current waypoint.
     */
    ActionWalkToWaypoint(dt) {
        if (!this.waypoints || this.waypoints.length === 0) return BTStatus.FAILURE;

        this.stateColor = GUARD_COLORS.patrol;
        this.currentSpeed = this.patrolSpeed;

        const target = this.waypoints[this.currentWP];
        const dist = Vector2.Magnitude(this.position, target);

        if (dist < 10) {
            // Reached waypoint; advance to next for next cycle
            this.currentWP = (this.currentWP + 1) % this.waypoints.length;
            return BTStatus.SUCCESS; // Advances to post pause wait
        }

        this._SteerAndMove(target, this.patrolSpeed, dt);
        return BTStatus.RUNNING;
    }

    /**
     * Steers guard toward a world position and translates forward.
     * @private
     */
    _SteerAndMove(targetPos, speed, dt) {
        const dx = targetPos.x - this.position.x;
        const dy = targetPos.y - this.position.y;
        const targetAngle = Math.atan2(dy, dx);

        // Smooth turning
        this.rotation = SmoothRotation(this.rotation, targetAngle, this.turnSpeed * dt);

        // Move forward along facing direction
        const vx = Math.cos(this.rotation);
        const vy = Math.sin(this.rotation);
        this.position.x += vx * speed * dt;
        this.position.y += vy * speed * dt;
    }

    // ── Update & Draw ────────────────────────────────────────────────────────

    Update(dt) {
        super.Update(dt);

        // Tick Behavior Tree
        this.bt.Update(dt);

        // If waiting at a search/noise spot, scan head left and right
        const activeLeaf = this.bt.activeLeafNode;
        if (activeLeaf && (activeLeaf.name === 'SearchArea' || activeLeaf.name === 'ScanNoiseArea')) {
            this.rotation += Math.sin(Date.now() * 0.005) * 2.0 * dt;
        }

        // Clamp to arena bounds
        this.position.x = Clamp(this.position.x, this.radius + 10, game.config.screenWidth - this.radius - 10);
        this.position.y = Clamp(this.position.y, this.radius + 10, game.config.screenHeight - this.radius - 10);
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;

        // 1. Draw waypoints & path
        if (this.waypoints && this.waypoints.length > 1) {
            const pathColor = new Color(1, 1, 1, 0.08);
            for (let i = 0; i < this.waypoints.length; i++) {
                const a = this.waypoints[i];
                const b = this.waypoints[(i + 1) % this.waypoints.length];
                renderer.DrawLine(a.x, a.y, b.x, b.y, pathColor, 1);
                renderer.DrawStrokeCircle(a.x, a.y, 4, new Color(1, 1, 1, 0.2), 1);
            }
        }

        // 2. Draw Hearing radius (faint ring)
        renderer.DrawStrokeCircle(x, y, this.hearingRange, new Color(1, 1, 1, 0.04), 1);

        // 3. Draw blackboard markers (last known position / heard noise)
        if (this.blackboard.Has('lastKnownPos') && this.stateColor === GUARD_COLORS.search) {
            const lkp = this.blackboard.Get('lastKnownPos');
            renderer.DrawStrokeCircle(lkp.x, lkp.y, 9, GUARD_COLORS.search, 1.5);
            renderer.DrawFillText('?', lkp.x, lkp.y + 4, 'bold 11px monospace', GUARD_COLORS.search, 'center');
            renderer.DrawFillText('LAST SEEN', lkp.x, lkp.y + 17, '9px monospace', GUARD_COLORS.search, 'center');
            renderer.DrawLine(x, y, lkp.x, lkp.y, new Color(GUARD_COLORS.search.r, GUARD_COLORS.search.g, GUARD_COLORS.search.b, 0.25), 1);
        }

        if (this.blackboard.Has('noisePos') && this.stateColor === GUARD_COLORS.investigate) {
            const np = this.blackboard.Get('noisePos');
            renderer.DrawStrokeCircle(np.x, np.y, 7, GUARD_COLORS.investigate, 1.5);
            renderer.DrawFillText('!', np.x, np.y + 4, 'bold 11px monospace', GUARD_COLORS.investigate, 'center');
            renderer.DrawFillText('NOISE', np.x, np.y + 16, '9px monospace', GUARD_COLORS.investigate, 'center');
            renderer.DrawLine(x, y, np.x, np.y, new Color(GUARD_COLORS.investigate.r, GUARD_COLORS.investigate.g, GUARD_COLORS.investigate.b, 0.25), 1);
        }

        // 4. Draw Vision Cone
        this._DrawVisionCone(renderer);

        // 5. Draw Guard Body
        renderer.DrawFillCircle(x, y, this.radius, this.stateColor);
        renderer.DrawStrokeCircle(x, y, this.radius, Color.white, 1.5);

        // Directional nose / sensor indicator
        const frontX = x + Math.cos(this.rotation) * (this.radius + 4);
        const frontY = y + Math.sin(this.rotation) * (this.radius + 4);
        renderer.DrawLine(x, y, frontX, frontY, Color.white, 2);

        // 6. Name & World-Space Status (DrawDebug)
        renderer.DrawFillText(this.name, x, y - this.radius - 18, 'bold 11px monospace', Color.white, 'center');
        this.bt.DrawDebug(renderer, x, y - this.radius - 7);
    }

    /**
     * Draws the directional field-of-view cone.
     * @private
     */
    _DrawVisionCone(renderer) {
        const x = this.position.x;
        const y = this.position.y;
        const halfFOV = this.visionAngle / 2;
        const leftAngle = this.rotation - halfFOV;
        const rightAngle = this.rotation + halfFOV;

        const leftX = x + Math.cos(leftAngle) * this.visionRange;
        const leftY = y + Math.sin(leftAngle) * this.visionRange;
        const rightX = x + Math.cos(rightAngle) * this.visionRange;
        const rightY = y + Math.sin(rightAngle) * this.visionRange;

        // Vision boundary rays
        const coneColor = Color.Copy(this.stateColor);
        coneColor.a = 0.25;
        renderer.DrawLine(x, y, leftX, leftY, coneColor, 1);
        renderer.DrawLine(x, y, rightX, rightY, coneColor, 1);

        // Fill cone area using canvas 2D context
        if (renderer.ctx) {
            const ctx = renderer.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, this.visionRange, leftAngle, rightAngle, false);
            ctx.closePath();
            ctx.fillStyle = `rgba(${Math.round(this.stateColor.r * 255)}, ${Math.round(this.stateColor.g * 255)}, ${Math.round(this.stateColor.b * 255)}, 0.08)`;
            ctx.fill();
            ctx.restore();
        }

        // Proximity detection ring
        renderer.DrawStrokeCircle(x, y, this.proximityRange, new Color(this.stateColor.r, this.stateColor.g, this.stateColor.b, 0.15), 1);
    }
}

// ── Game ──────────────────────────────────────────────────────────────────────

class BTGuardGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({ screenWidth: 860, screenHeight: 620 });

        this.bgColor = new Color(0.06, 0.08, 0.12);
        this.gridColor = new Color(1, 1, 1, 0.03);

        /** @type {StealthGuard[]} */
        this.guards = [];
        this.selectedGuardIndex = 0;
        this.showTreeInspector = true;

        /** @type {Array<{x: number, y: number, radius: number, maxRadius: number, alpha: number}>} */
        this.soundRipples = [];

        debugMode = true; // Enable BT visual debuggers
    }

    Start() {
        super.Start();

        // Guard Alpha (Patrols left & centre corridors)
        const guardAlpha = new StealthGuard(
            'Drone Alpha',
            new Vector2(220, 260),
            [
                new Vector2(200, 150),
                new Vector2(430, 150),
                new Vector2(430, 480),
                new Vector2(200, 480)
            ],
            { patrolSpeed: 65, chaseSpeed: 140, visionRange: 175 }
        );

        // Guard Beta (Patrols right sector)
        const guardBeta = new StealthGuard(
            'Drone Beta',
            new Vector2(660, 450),
            [
                new Vector2(660, 490),
                new Vector2(660, 160),
                new Vector2(500, 320)
            ],
            { patrolSpeed: 70, chaseSpeed: 145, visionRange: 185 }
        );

        this.guards = [guardAlpha, guardBeta];
        this.AddGameObject(guardAlpha);
        this.AddGameObject(guardBeta);
    }

    Update(dt) {
        super.Update(dt);

        // 1. Mouse Click creates a Distraction Sound
        if (Input.mouse.down || Input.IsMouseDown()) {
            this.TriggerSound(Input.mouse.x, Input.mouse.y);
        }

        // 2. Toggle Tree Inspector on [T] key
        if (Input.IsKeyDown(KEY_T)) {
            this.showTreeInspector = !this.showTreeInspector;
        }

        // 3. Switch inspected guard on [TAB] or [SPACE]
        if (Input.IsKeyDown(KEY_TAB) || Input.IsKeyDown(KEY_SPACE)) {
            this.selectedGuardIndex = (this.selectedGuardIndex + 1) % this.guards.length;
        }

        // 4. Update Sound Ripples
        for (let i = this.soundRipples.length - 1; i >= 0; i--) {
            const rip = this.soundRipples[i];
            rip.radius += 180 * dt;
            rip.alpha -= 1.1 * dt;
            if (rip.alpha <= 0) {
                this.soundRipples.splice(i, 1);
            }
        }
    }

    TriggerSound(x, y) {
        // Add visual ripple
        this.soundRipples.push({
            x: x,
            y: y,
            radius: 8,
            maxRadius: 240,
            alpha: 1.0
        });

        // Broadcast to all guards
        const soundPos = new Vector2(x, y);
        for (const guard of this.guards) {
            guard.OnHeardSound(soundPos);
        }
    }

    Draw() {
        // Arena background
        renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, this.bgColor);

        // Grid floor pattern
        this._DrawGrid();

        // Sound Ripples
        for (const rip of this.soundRipples) {
            renderer.DrawStrokeCircle(rip.x, rip.y, rip.radius, new Color(1, 0.75, 0.1, rip.alpha), 1.5);
        }

        // Game objects (Guards)
        super.Draw();

        // Mouse Intruder Crosshair
        this._DrawIntruder();

        // Header Title & Controls
        this._DrawHeader();

        // Real-Time Behavior Tree Inspector HUD
        if (this.showTreeInspector && this.guards[this.selectedGuardIndex]) {
            const selected = this.guards[this.selectedGuardIndex];
            selected.bt.DrawTreeInspector(renderer, 16, 80, {
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

    _DrawIntruder() {
        const mx = Input.mouse.x;
        const my = Input.mouse.y;

        // Stealth Crosshair
        renderer.DrawStrokeCircle(mx, my, 8, Color.lime, 1.5);
        renderer.DrawLine(mx - 14, my, mx - 4, my, Color.lime, 1.5);
        renderer.DrawLine(mx + 4, my, mx + 14, my, Color.lime, 1.5);
        renderer.DrawLine(mx, my - 14, mx, my - 4, Color.lime, 1.5);
        renderer.DrawLine(mx, my + 4, mx, my + 14, Color.lime, 1.5);

        // Label
        renderer.DrawFillText('INTRUDER', mx, my + 18, 'bold 10px monospace', Color.lime, 'center');
    }

    _DrawHeader() {
        renderer.DrawFillText(
            'Behavior Tree Demo — Stealth Guard AI',
            this.screenWidth / 2, 22,
            'bold 18px Arial', Color.white, 'center'
        );
        renderer.DrawFillText(
            'Move mouse as Intruder • Click to create Distraction Noise • [TAB/SPACE] Switch Guard • [T] Toggle Tree Inspector',
            this.screenWidth / 2, 44,
            '12px Arial', new Color(0.7, 0.75, 0.85), 'center'
        );
    }

    _DrawLegend() {
        const lx = this.screenWidth - 250;
        let   ly = 80;

        renderer.DrawFillBasicRectangle(lx - 10, ly - 10, 244, 180, new Color(0.05, 0.07, 0.1, 0.85));
        renderer.DrawStrokeBasicRectangle(lx - 10, ly - 10, 244, 180, new Color(0.2, 0.3, 0.4, 0.7), 1);

        renderer.DrawFillText('AI Priorities (BTReactiveSelector):', lx, ly + 4, 'bold 11px monospace', Color.cyan, 'left');
        ly += 22;

        const items = [
            ['1. Combat Chase', GUARD_COLORS.chase, 'Intruder in vision cone'],
            ['2. Investigate Noise', GUARD_COLORS.investigate, 'Sound click heard'],
            ['3. Search Last Seen', GUARD_COLORS.search, 'Lost sight of intruder'],
            ['4. Patrol Routine', GUARD_COLORS.patrol, 'Waypoints + wait pauses']
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

window.onload = () => Init(BTGuardGame, "canvas");
