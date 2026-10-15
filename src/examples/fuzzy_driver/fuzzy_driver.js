// ============================================================================
// Demo 2: Fuzzy Autonomous Racing & Obstacle Avoidance
// (src/examples/fuzzy_driver/fuzzy_driver.js)
//
// Demonstrates continuous control using Fuzzy Logic vs. Crisp Thresholds.
//
// Inputs to the Fuzzy Driver's FuzzyModule:
//   1. TargetAngle    (-90 .. +90 degrees relative to car heading)
//   2. ObstacleBias   (-100 .. +100: negative = obstacle on left, positive = right)
//
// Defuzzified Crisp Outputs:
//   1. Steering       (-100 .. +100 -> normalized turn rate)
//   2. Throttle       (20 .. 100 -> target speed percentage)
//
// Classroom Comparison:
//   Runs a "Crisp Threshold Car" alongside the "Fuzzy Logic Car" so students
//   can observe how crisp boolean cutoffs cause bang-bang steering oscillation,
//   whereas overlapping fuzzy membership sets produce smooth, proportional curves.
// ============================================================================

// #region Fuzzy Driver Rulebase Builder

function BuildDriverFuzzyModule() {
    const fm = new FuzzyModule();

    // Input 1: Relative Angle to Next Waypoint (-90° = left, 0° = dead ahead, +90° = right)
    const angle = fm.CreateFLV('TargetAngle');
    const hardLeft    = angle.AddLeftShoulderSet('HardL', -90, -45, -18);
    const slightLeft  = angle.AddTriangularSet('SlightL', -45, -18, 0);
    const ahead       = angle.AddTriangularSet('Ahead', -18, 0, 18);
    const slightRight = angle.AddTriangularSet('SlightR', 0, 18, 45);
    const hardRight   = angle.AddRightShoulderSet('HardR', 18, 45, 90);

    // Input 2: Obstacle Threat Bias (-100 = obstacle close on left, 0 = clear, +100 = close on right)
    const obs = fm.CreateFLV('ObstacleBias');
    const dangerLeft  = obs.AddLeftShoulderSet('LeftHit', -100, -55, -12);
    const clear       = obs.AddTriangularSet('Clear', -35, 0, 35);
    const dangerRight = obs.AddRightShoulderSet('RightHit', 12, 55, 100);

    // Output 1: Steering Command (-100 = hard left turn, 0 = straight, +100 = hard right turn)
    const steer = fm.CreateFLV('Steering');
    const steerHardL = steer.AddLeftShoulderSet('TurnHardL', -100, -70, -35);
    const steerL     = steer.AddTriangularSet('TurnL', -65, -30, 0);
    const straight   = steer.AddTriangularSet('Straight', -18, 0, 18);
    const steerR     = steer.AddTriangularSet('TurnR', 0, 30, 65);
    const steerHardR = steer.AddRightShoulderSet('TurnHardR', 35, 70, 100);

    // Output 2: Throttle / Speed Target (20% .. 100%)
    const throttle = fm.CreateFLV('Throttle');
    const brake     = throttle.AddLeftShoulderSet('Slow', 20, 40, 65);
    const cruise    = throttle.AddTriangularSet('Cruise', 45, 70, 90);
    const fullSpeed = throttle.AddRightShoulderSet('Fast', 75, 92, 100);

    // --- Steering Rules when path is Clear (follow waypoint smoothly) ---
    fm.AddRule(new FzAnd(clear, hardLeft),    steerHardL, 'IF Clear & HardL -> TurnHardL');
    fm.AddRule(new FzAnd(clear, slightLeft),  steerL,     'IF Clear & SlightL -> TurnL');
    fm.AddRule(new FzAnd(clear, ahead),       straight,   'IF Clear & Ahead -> Straight');
    fm.AddRule(new FzAnd(clear, slightRight), steerR,     'IF Clear & SlightR -> TurnR');
    fm.AddRule(new FzAnd(clear, hardRight),   steerHardR, 'IF Clear & HardR -> TurnHardR');

    // --- Steering Rules when Obstacle is on Left -> Swerve Right! ---
    fm.AddRule(dangerLeft, steerHardR, 'IF LeftHit -> TurnHardR (Avoid)');
    // --- Steering Rules when Obstacle is on Right -> Swerve Left! ---
    fm.AddRule(dangerRight, steerHardL, 'IF RightHit -> TurnHardL (Avoid)');

    // --- Throttle Rules: Fast when straight & clear, Slow on sharp turns or obstacles ---
    fm.AddRule(new FzAnd(clear, ahead), fullSpeed, 'IF Clear & Ahead -> Fast');
    fm.AddRule(new FzOr(slightLeft, slightRight), cruise, 'IF SlightTurn -> Cruise');
    fm.AddRule(new FzOr(hardLeft, hardRight, dangerLeft, dangerRight), brake, 'IF HardTurn/Obstacle -> Slow');

    return fm;
}

// #endregion

// #region Autonomous Racer Entity

class RacerCar extends GameObject {
    /**
     * @param {Vector2} position
     * @param {Vector2[]} waypoints
     * @param {boolean} isFuzzy
     */
    constructor(position, waypoints, isFuzzy = true) {
        super(position);
        this.waypoints = waypoints;
        this.wpIndex = 0;
        this.isFuzzy = isFuzzy;
        this.rotation = 0;
        this.maxSpeed = 205;
        this.speed = 140;

        this.fm = isFuzzy ? BuildDriverFuzzyModule() : null;
        this.defuzzifyMethod = FuzzyModule.DefuzzifyMethod.MaxAv;

        // Telemetry for HUD & feeler visualization
        this.lastAngleDeg = 0;
        this.lastObstacleBias = 0;
        this.lastSteerOut = 0;
        this.lastThrottleOut = 80;
        this.trail = [];
        this.trailTimer = 0;
    }

    /**
     * Computes obstacle threat bias in [-100, +100] from nearby hazard pylons.
     * Negative = obstacle on left side of nose; Positive = obstacle on right side.
     */
    ComputeObstacleBias(obstacles) {
        const lookAhead = 125;
        let bias = 0;

        for (let i = 0; i < obstacles.length; i++) {
            const ob = obstacles[i];
            const dx = ob.x - this.position.x;
            const dy = ob.y - this.position.y;
            const dist = Math.hypot(dx, dy);
            if (dist > lookAhead + ob.radius || dist < 1) continue;

            const angleToObs = NormalizeAngle(Math.atan2(dy, dx) - this.rotation);
            // Only react to obstacles in the forward 140-degree cone
            if (Math.abs(angleToObs) < 1.22) {
                const proximity = 1 - Math.max(0, (dist - ob.radius) / lookAhead);
                // If angleToObs <= 0, obstacle is on our left (negative bias -> steer right)
                const sideSign = angleToObs <= 0 ? -1 : 1;
                const weight = proximity * (1 - Math.abs(angleToObs) / 1.35) * 100;
                if (Math.abs(weight) > Math.abs(bias)) {
                    bias = sideSign * weight;
                }
            }
        }
        return Clamp(bias, -100, 100);
    }

    Update(dt) {
        const wp = this.waypoints[this.wpIndex];
        const dx = wp.x - this.position.x;
        const dy = wp.y - this.position.y;
        const distToWp = Math.hypot(dx, dy);

        // Advance to next checkpoint around the circuit
        if (distToWp < 46) {
            this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        }

        const targetWp = this.waypoints[this.wpIndex];
        const desiredHeading = Math.atan2(targetWp.y - this.position.y, targetWp.x - this.position.x);
        const angleDiffRad = NormalizeAngle(desiredHeading - this.rotation);
        const angleDeg = Clamp(angleDiffRad * (180 / Math.PI), -90, 90);
        this.lastAngleDeg = angleDeg;

        const obstacles = this.game ? this.game.obstacles : [];
        const obsBias = this.ComputeObstacleBias(obstacles);
        this.lastObstacleBias = obsBias;

        if (this.isFuzzy) {
            this.fm.Fuzzify('TargetAngle', angleDeg);
            this.fm.Fuzzify('ObstacleBias', obsBias);
            this.lastSteerOut = this.fm.DeFuzzify('Steering', this.defuzzifyMethod);
            this.lastThrottleOut = this.fm.DeFuzzify('Throttle', this.defuzzifyMethod);
        } else {
            // Crisp bang-bang controller for classroom comparison:
            // Fixed boolean cutoffs cause abrupt full-lock turns!
            if (obsBias < -20) {
                this.lastSteerOut = 85;
                this.lastThrottleOut = 45;
            } else if (obsBias > 20) {
                this.lastSteerOut = -85;
                this.lastThrottleOut = 45;
            } else if (angleDeg < -7) {
                this.lastSteerOut = -75;
                this.lastThrottleOut = Math.abs(angleDeg) > 30 ? 45 : 85;
            } else if (angleDeg > 7) {
                this.lastSteerOut = 75;
                this.lastThrottleOut = Math.abs(angleDeg) > 30 ? 45 : 85;
            } else {
                this.lastSteerOut = 0;
                this.lastThrottleOut = 95;
            }
        }

        const turnRate = 3.8; // rad/s at 100% steering
        this.rotation = NormalizeAngle(this.rotation + (this.lastSteerOut / 100) * turnRate * dt);

        const targetSpeed = this.maxSpeed * (this.lastThrottleOut / 100);
        this.speed = Lerp(this.speed, targetSpeed, dt * 5);

        this.position.x += Math.cos(this.rotation) * this.speed * dt;
        this.position.y += Math.sin(this.rotation) * this.speed * dt;

        // Record breadcrumb trail to visually compare trajectory smoothness
        this.trailTimer += dt;
        if (this.trailTimer >= 0.04) {
            this.trailTimer = 0;
            this.trail.push({ x: this.position.x, y: this.position.y });
            if (this.trail.length > 75) this.trail.shift();
        }
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;
        const bodyColor = this.isFuzzy
            ? new Color(0.20, 0.88, 0.98, 1.0)
            : new Color(1.00, 0.55, 0.20, 0.85);

        // Draw trajectory ribbon
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = (i / this.trail.length) * (this.isFuzzy ? 0.55 : 0.40);
            renderer.DrawLine(
                this.trail[i - 1].x, this.trail[i - 1].y,
                this.trail[i].x, this.trail[i].y,
                new Color(bodyColor.r, bodyColor.g, bodyColor.b, alpha),
                this.isFuzzy ? 2.5 : 1.8
            );
        }

        // Sensor feelers on the Fuzzy car when enabled
        if (this.isFuzzy && this.game && this.game.showSensors) {
            const feelerAngles = [-0.48, 0, 0.48];
            for (const fa of feelerAngles) {
                const a = this.rotation + fa;
                const fx = x + Math.cos(a) * 95;
                const fy = y + Math.sin(a) * 95;
                renderer.DrawLine(x, y, fx, fy, new Color(0.3, 1.0, 0.65, 0.32), 1.2);
            }

            // Line to active waypoint
            const wp = this.waypoints[this.wpIndex];
            renderer.DrawLine(x, y, wp.x, wp.y, new Color(0.25, 0.85, 1.0, 0.25), 1);
        }

        // Car chassis (oriented polygon)
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const localPts = [
            { x: 16, y: 0 },
            { x: -11, y: -10 },
            { x: -7, y: 0 },
            { x: -11, y: 10 }
        ];
        const worldPts = localPts.map(p => ({
            x: x + p.x * cos - p.y * sin,
            y: y + p.x * sin + p.y * cos
        }));
        renderer.DrawPolygon(worldPts, Color.white, 1.5, true, bodyColor);

        renderer.DrawFillText(
            this.isFuzzy ? 'FUZZY AI' : 'CRISP AI',
            x, y - 18,
            'bold 9px monospace',
            bodyColor,
            'center',
            'middle'
        );
    }
}

// #endregion

// #region Main Game Controller

class FuzzyDriverGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({ screenWidth: 920, screenHeight: 620 });
    }

    Start() {
        super.Start();

        // Circuit waypoints inside the left arena [30..555, 65..585]
        this.waypoints = [
            new Vector2(140, 110),
            new Vector2(430, 105),
            new Vector2(510, 210),
            new Vector2(490, 390),
            new Vector2(410, 515),
            new Vector2(165, 520),
            new Vector2(85, 400),
            new Vector2(90, 220)
        ];

        // Obstacle hazard pylons (first one is movable via mouse click!)
        this.obstacles = [
            { x: 290, y: 108, radius: 22, label: 'DRAG/CLICK HAZARD' },
            { x: 495, y: 300, radius: 20, label: 'PYLON' },
            { x: 280, y: 518, radius: 20, label: 'PYLON' }
        ];

        this.showSensors = true;
        this.showCrispCar = true;

        this.crispCar = this.AddGameObject(new RacerCar(new Vector2(110, 150), this.waypoints, false));
        this.fuzzyCar = this.AddGameObject(new RacerCar(new Vector2(140, 115), this.waypoints, true));
    }

    Update(dt) {
        // Left-click in track area moves Hazard Pylon #0
        if (Input.mouse.down && Input.mouse.x > 35 && Input.mouse.x < 555 && Input.mouse.y > 55 && Input.mouse.y < 595) {
            this.obstacles[0].x = Input.mouse.x;
            this.obstacles[0].y = Input.mouse.y;
        }

        // [C] Toggle Crisp Comparison Car
        if (Input.IsKeyDown(KEY_C)) {
            this.showCrispCar = !this.showCrispCar;
            this.crispCar.active = this.showCrispCar;
        }

        // [F] Toggle sensor rays
        if (Input.IsKeyDown(KEY_F)) {
            this.showSensors = !this.showSensors;
        }

        // [M] Toggle MaxAv vs Centroid defuzzification
        if (Input.IsKeyDown(KEY_M)) {
            this.fuzzyCar.defuzzifyMethod =
                this.fuzzyCar.defuzzifyMethod === FuzzyModule.DefuzzifyMethod.MaxAv
                    ? FuzzyModule.DefuzzifyMethod.Centroid
                    : FuzzyModule.DefuzzifyMethod.MaxAv;
        }

        super.Update(dt);
    }

    Draw() {
        const r = this.renderer;
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, new Color(0.05, 0.07, 0.11, 1));

        // Draw circuit track loops & waypoints
        for (let i = 0; i < this.waypoints.length; i++) {
            const a = this.waypoints[i];
            const b = this.waypoints[(i + 1) % this.waypoints.length];
            r.DrawLine(a.x, a.y, b.x, b.y, new Color(0.16, 0.22, 0.32, 0.9), 34);
            r.DrawLine(a.x, a.y, b.x, b.y, new Color(0.28, 0.38, 0.52, 0.5), 1.5);
        }

        if (this.showSensors) {
            for (let i = 0; i < this.waypoints.length; i++) {
                const wp = this.waypoints[i];
                const isTarget = i === this.fuzzyCar.wpIndex;
                r.DrawStrokeCircle(wp.x, wp.y, isTarget ? 12 : 6, isTarget ? Color.cyan : new Color(0.4, 0.55, 0.7, 0.5), 1.5);
            }
        }

        // Draw Hazard Pylons
        for (let i = 0; i < this.obstacles.length; i++) {
            const ob = this.obstacles[i];
            r.DrawStrokeCircle(ob.x, ob.y, ob.radius + 8, new Color(1.0, 0.3, 0.3, 0.25), 1.5);
            r.DrawFillCircle(ob.x, ob.y, ob.radius, i === 0 ? new Color(0.98, 0.28, 0.32, 0.95) : new Color(0.85, 0.45, 0.18, 0.9));
            r.DrawStrokeCircle(ob.x, ob.y, ob.radius, Color.white, 1.5);
            r.DrawFillText(ob.label, ob.x, ob.y - ob.radius - 9, 'bold 9px monospace', new Color(1, 0.75, 0.75, 1), 'center', 'middle');
        }

        super.Draw();

        // Top Header Bar
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, 42, new Color(0.08, 0.12, 0.19, 0.96));
        r.DrawFillText(
            'FUZZY LOGIC DEMO 2: AUTONOMOUS STEERING & OBSTACLE AVOIDANCE',
            14, 14, 'bold 13px monospace', new Color(0.45, 0.88, 1.0, 1), 'left', 'middle'
        );
        r.DrawFillText(
            'Click/Drag on Track: Move Red Hazard | [C]: Toggle Crisp Car | [F]: Toggle Sensors | [M]: MaxAv/Centroid',
            14, 31, '10px monospace', new Color(0.75, 0.82, 0.92, 1), 'left', 'middle'
        );

        // Bottom Telemetry Bar comparing Fuzzy vs Crisp Steering
        r.DrawFillBasicRectangle(14, 554, 546, 56, new Color(0.08, 0.11, 0.17, 0.94));
        r.DrawStrokeBasicRectangle(14, 554, 546, 56, new Color(0.24, 0.34, 0.48, 0.9), 1);
        r.DrawFillText(
            `FUZZY CAR (Cyan)  — Angle: ${this.fuzzyCar.lastAngleDeg.toFixed(1)}° | Steer: ${this.fuzzyCar.lastSteerOut.toFixed(1)}% | Throttle: ${this.fuzzyCar.lastThrottleOut.toFixed(0)}%`,
            24, 571, 'bold 10px monospace', new Color(0.35, 0.92, 1.0, 1), 'left', 'middle'
        );
        r.DrawFillText(
            `CRISP CAR (Orange) — Uses hard if/else cutoffs (±7°) -> Notice the bang-bang steering oscillation!`,
            24, 593, '10px monospace', new Color(1.0, 0.65, 0.30, 1), 'left', 'middle'
        );

        // Right-Side Live Fuzzy Inspector
        this.fuzzyCar.fm.DrawFuzzyInspector(r, 572, 48, {
            width: 336,
            graphHeight: 68,
            title: `FUZZY DRIVER BRAIN (${this.fuzzyCar.defuzzifyMethod})`,
            variables: ['TargetAngle', 'ObstacleBias', 'Steering', 'Throttle'],
            outputs: ['Steering', 'Throttle'],
            showRules: true,
            force: true
        });
    }
}

window.onload = () => {
    Init(FuzzyDriverGame);
};

// #endregion

