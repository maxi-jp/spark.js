// =====================================================================
// Standalone SceneGame Demo — Behavior Scripts
// =====================================================================

class DemoPlayerController extends Behavior {
    static inspector = {
        speed:          { type: "number", default: 240, min: 40, max: 600 },
        dashMultiplier: { type: "number", default: 1.8, min: 1, max: 4 }
    };

    Start() {
        this.score = 0;
    }

    Update(dt) {
        const mx = Input.GetAxis("MoveX");
        const my = Input.GetAxis("MoveY");
        const mult = Input.GetAction("Dash") ? this.dashMultiplier : 1;
        this.x += mx * this.speed * mult * dt;
        this.y += my * this.speed * mult * dt;
    }

    OnCollisionEnter(myCol, otherCol) {
        const other = otherCol.go;
        if (!other)
            return;

        if (other.tag === "pickup") {
            this.score += 10;
            this.game.Destroy(other);
        }
        else if (other.tag === "enemy") {
            this.x = 180;
            this.y = 260;
        }
    }

    Draw(renderer) {
        renderer.DrawFillText(`Score: ${this.score}`, this.x, this.y - 28, "bold 13px Arial", Color.yellow, "center", "bottom");
    }
}
ScriptRegistry.Register("DemoPlayerController", DemoPlayerController);

class DemoPatrolEnemy extends Behavior {
    static inspector = {
        speed:    { type: "number", default: 140 },
        distance: { type: "number", default: 110 },
        axis:     { type: "select", default: "y", options: ["x", "y"] }
    };

    Start() {
        this.originX = this.x;
        this.originY = this.y;
        this.dir = 1;
    }

    Update(dt) {
        if (this.axis === "x") {
            this.x += this.speed * this.dir * dt;
            if (Math.abs(this.x - this.originX) >= this.distance)
                this.dir *= -1;
        }
        else {
            this.y += this.speed * this.dir * dt;
            if (Math.abs(this.y - this.originY) >= this.distance)
                this.dir *= -1;
        }
    }
}
ScriptRegistry.Register("DemoPatrolEnemy", DemoPatrolEnemy);

class DemoCollectible extends Behavior {
    static inspector = {
        bobAmplitude: { type: "number", default: 6 },
        bobSpeed:     { type: "number", default: 4 }
    };

    Start() {
        this.baseY = this.y;
        this.t = Math.random() * Math.PI * 2;
    }

    Update(dt) {
        this.t += dt * this.bobSpeed;
        this.y = this.baseY + Math.sin(this.t) * this.bobAmplitude;
    }
}
ScriptRegistry.Register("DemoCollectible", DemoCollectible);
