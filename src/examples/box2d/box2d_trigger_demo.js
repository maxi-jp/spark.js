/**
 * Box2DTrigger demo — shows all three trigger callbacks in action:
 *
 *  CountZone   — OnTriggerEnter: increments a counter for every ball that enters
 *  TimerZone   — OnTriggerStay:  tracks the longest time any ball has been inside
 *  DestroyZone — OnTriggerStay:  removes balls that stay inside for >= 2 seconds
 *
 * Click / tap above the zones to spawn coloured balls.
 */

const DEMO_SCALE   = 50;  // pixels per metre
const ZONE_W       = 3.4; // zone width  in metres (170 px)
const ZONE_H       = 2.0; // zone height in metres (100 px)
const BALL_RADIUS  = 0.3; // ball radius in metres (15 px)
const DESTROY_TIME = 2.0; // seconds before DestroyZone removes a ball
const MAX_BALLS    = 15;  // cap to keep things readable

// ── Spawnable ball ────────────────────────────────────────────────────────────

class DemoBall extends Box2DGameObject {
    constructor(position, world) {
        super(position, world, PhysicsObjectType.Circle, {
            radius:        BALL_RADIUS,
            restitution:   0.5,
            friction:      0.4,
            linearDamping: 0.05
        });
        this.drawRadius = BALL_RADIUS * world.scale;
        this.color = new Color(
            RandomBetweenFloat(0.3, 1.0),
            RandomBetweenFloat(0.3, 1.0),
            RandomBetweenFloat(0.3, 1.0)
        );
    }

    Draw(renderer) {
        renderer.DrawFillCircle  (this.position.x, this.position.y, this.drawRadius, this.color);
        renderer.DrawStrokeCircle(this.position.x, this.position.y, this.drawRadius, Color.black, 1.5);
    }
}

// ── CountZone — OnTriggerEnter ────────────────────────────────────────────────

class CountZone extends Box2DTrigger {
    constructor(position, world) {
        super(position, world, PhysicsObjectType.Box, { width: ZONE_W, height: ZONE_H });
        this.enterCount = 0;
    }

    OnTriggerEnter(other) {
        this.enterCount++;
    }

    Draw(renderer) {
        const hw = ZONE_W * this.world.scale / 2;
        const hh = ZONE_H * this.world.scale / 2;
        const x  = this.position.x;
        const y  = this.position.y;

        renderer.DrawFillBasicRectangle  (x - hw, y - hh, hw * 2, hh * 2, new Color(0.2, 0.5, 1, 0.2));
        renderer.DrawStrokeBasicRectangle(x - hw, y - hh, hw * 2, hh * 2, new Color(0.1, 0.3, 0.9, 0.9), 2);

        renderer.DrawFillText("COUNT ZONE",            x, y - 22, "bold 13px Arial", new Color(0.05, 0.15, 0.7), "center");
        renderer.DrawFillText(`Entries: ${this.enterCount}`,  x, y,      "16px Arial",      new Color(0.05, 0.15, 0.7), "center");
        renderer.DrawFillText(`Inside: ${this.overlapCount}`, x, y + 20, "13px Arial",      new Color(0.05, 0.15, 0.7), "center");
    }
}

// ── TimerZone — OnTriggerStay (time tracking) ─────────────────────────────────

class TimerZone extends Box2DTrigger {
    constructor(position, world) {
        super(position, world, PhysicsObjectType.Box, { width: ZONE_W, height: ZONE_H });
        this.currentMaxTime = 0;
    }

    Update(deltaTime) {
        // Reset before super.Update() calls OnTriggerStay for each overlapping body
        this.currentMaxTime = 0;
        super.Update(deltaTime);
    }

    OnTriggerStay(other, timeInside) {
        if (timeInside > this.currentMaxTime)
            this.currentMaxTime = timeInside;
    }

    Draw(renderer) {
        const hw = ZONE_W * this.world.scale / 2;
        const hh = ZONE_H * this.world.scale / 2;
        const x  = this.position.x;
        const y  = this.position.y;

        // Colour interpolates green → red as time inside grows
        const t = Math.min(this.currentMaxTime / 5, 1);
        renderer.DrawFillBasicRectangle  (x - hw, y - hh, hw * 2, hh * 2, new Color(t, 1 - t, 0, 0.2));
        renderer.DrawStrokeBasicRectangle(x - hw, y - hh, hw * 2, hh * 2, new Color(t, 1 - t, 0, 0.9), 2);

        renderer.DrawFillText("TIMER ZONE",                          x, y - 22, "bold 13px Arial", new Color(0.1, 0.35, 0.1), "center");
        renderer.DrawFillText(`Max: ${this.currentMaxTime.toFixed(1)}s`, x, y,      "16px Arial",      new Color(0.1, 0.35, 0.1), "center");
        renderer.DrawFillText(`Inside: ${this.overlapCount}`,            x, y + 20, "13px Arial",      new Color(0.1, 0.35, 0.1), "center");
    }
}

// ── DestroyZone — OnTriggerStay (destruction) ────────────────────────────────

class DestroyZone extends Box2DTrigger {
    constructor(position, world) {
        super(position, world, PhysicsObjectType.Box, { width: ZONE_W, height: ZONE_H });
        this.destroyedCount = 0;
    }

    OnTriggerStay(other, timeInside) {
        if (other instanceof DemoBall && other.active && timeInside >= DESTROY_TIME) {
            this.destroyedCount++;
            game.Destroy(other);
        }
    }

    Draw(renderer) {
        const hw = ZONE_W * this.world.scale / 2;
        const hh = ZONE_H * this.world.scale / 2;
        const x  = this.position.x;
        const y  = this.position.y;

        // Pulse the fill when a ball is inside
        const pulse = this.overlapCount > 0
            ? 0.15 + 0.25 * Math.abs(Math.sin(totalTime * 4))
            : 0.15;
        renderer.DrawFillBasicRectangle  (x - hw, y - hh, hw * 2, hh * 2, new Color(1, 0.4, 0, pulse));
        renderer.DrawStrokeBasicRectangle(x - hw, y - hh, hw * 2, hh * 2, new Color(0.85, 0.25, 0, 0.9), 2);

        renderer.DrawFillText("DESTROY ZONE",              x, y - 22, "bold 13px Arial", new Color(0.55, 0.15, 0), "center");
        renderer.DrawFillText(`${DESTROY_TIME}s → removed`, x, y,      "14px Arial",      new Color(0.55, 0.15, 0), "center");
        renderer.DrawFillText(`Destroyed: ${this.destroyedCount}`, x, y + 20, "13px Arial", new Color(0.55, 0.15, 0), "center");
    }
}

// ── Main game ─────────────────────────────────────────────────────────────────

class Box2DTriggerDemo extends Box2DGame {
    constructor(renderer) {
        super(renderer, DEMO_SCALE, { x: 0, y: -9.8 }, true);
        this.Configure({ screenWidth: 640, screenHeight: 480 });
    }

    Start() {
        super.Start();

        const S = this.physicsScale; // 50
        const W = this.screenWidth;  // 640
        const H = this.screenHeight; // 480

        // Static floor at canvas y = 460
        CreateEdge(this.physicsWorld,
            W / 2 / S, (H - 460) / S,
            { p1x: -W / 2 / S, p1y: 0, p2x: W / 2 / S, p2y: 0, type: b2Body.b2_staticBody }
        );
        // Left wall
        CreateEdge(this.physicsWorld,
            0, H / 2 / S,
            { p1x: 0, p1y: -H / 2 / S, p2x: 0, p2y: H / 2 / S, type: b2Body.b2_staticBody }
        );
        // Right wall
        CreateEdge(this.physicsWorld,
            W / S, H / 2 / S,
            { p1x: 0, p1y: -H / 2 / S, p2x: 0, p2y: H / 2 / S, type: b2Body.b2_staticBody }
        );

        // Three trigger zones at canvas y = 400 (bottom)
        const zoneY = 400;
        this.gameObjects.push(
            new CountZone  (new Vector2(107, zoneY), this.physicsWorld),
            new TimerZone  (new Vector2(320, zoneY), this.physicsWorld),
            new DestroyZone(new Vector2(533, zoneY), this.physicsWorld)
        );
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // Count active balls (deducting those pending destruction)
        const ballCount = this.gameObjects.filter(go => go instanceof DemoBall && go.active).length;

        // Spawn a ball where the user clicks/taps, above the zones
        if (Input.IsMouseDown() && Input.mouse.y < 230 && ballCount < MAX_BALLS) {
            this.gameObjects.push(new DemoBall(
                new Vector2(Input.mouse.x, Input.mouse.y),
                this.physicsWorld
            ));
        }

        this._ballCount = ballCount; // cache for Draw
    }

    Draw() {
        // Background
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, new Color(0.92, 0.92, 0.92));

        // Game objects — draws balls and trigger zone visuals
        super.Draw();

        // Floor visual
        this.renderer.DrawFillBasicRectangle(0, 460, this.screenWidth, 20, new Color(0.35, 0.25, 0.15));

        // Callback labels beneath each zone
        this.renderer.DrawFillText("OnTriggerEnter",     107, 318, "bold 11px Arial", new Color(0.05, 0.15, 0.7), "center");
        this.renderer.DrawFillText("counts all entries", 107, 332, "11px Arial",      new Color(0.3,  0.3,  0.5), "center");

        this.renderer.DrawFillText("OnTriggerStay",      320, 318, "bold 11px Arial", new Color(0.1, 0.35, 0.1), "center");
        this.renderer.DrawFillText("tracks time inside", 320, 332, "11px Arial",      new Color(0.3,  0.5, 0.3), "center");

        this.renderer.DrawFillText("OnTriggerStay",      533, 318, "bold 11px Arial", new Color(0.55, 0.15, 0), "center");
        this.renderer.DrawFillText(`destroys after ${DESTROY_TIME}s`, 533, 332, "11px Arial", new Color(0.6, 0.3, 0.1), "center");

        // Instructions
        const ballMsg = this._ballCount >= MAX_BALLS
            ? `Max balls reached (${MAX_BALLS}) — DestroyZone will clear some`
            : `Click above the zones to spawn a ball  (${this._ballCount ?? 0} / ${MAX_BALLS})`;
        const msgColor = this._ballCount >= MAX_BALLS ? Color.red : Color.black;
        this.renderer.DrawFillText(ballMsg, this.screenHalfWidth, 26, "14px Arial", msgColor, "center");
    }
}

window.onload = () => { Init(Box2DTriggerDemo); }
