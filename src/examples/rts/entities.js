function CreateRTSUnitPlaceholderImage(fillColor = "#6ee7b7", size = 18) {
    const radius = Math.max(2, Math.floor(size * 0.4));
    const center = Math.floor(size * 0.5);
    const strokeWidth = 2;
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
        `<circle cx="${center}" cy="${center}" r="${radius}" fill="${fillColor}" stroke="#0f172a" stroke-width="${strokeWidth}" />`,
        "</svg>"
    ].join("");

    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    return img;
}

class Entity extends SpriteObject {
    static nextEntityId = 1;

    constructor(position, img, options = {}) {
        super(position, options.rotation || 0, options.scale || 1, img, options.alpha || 1);

        this.entityId = Entity.nextEntityId++;
        this.maxHealth = options.maxHealth || 100;
        this.health = options.health || this.maxHealth;
        this.ownerId = options.ownerId || 1;
        this.visionRadius = options.visionRadius || 5 * 32;
        this.isSelected = false;
        this.placeholderRadius = options.placeholderRadius || 8;
        this.placeholderFillStyle = options.placeholderFillStyle || "#fde047";
        this.placeholderStrokeStyle = options.placeholderStrokeStyle || "#0f172a";
    }

    TakeDamage(amount) {
        this.health = Clamp(this.health - amount, 0, this.maxHealth);
        if (this.health <= 0) {
            this.active = false;
        }
    }

    Heal(amount) {
        this.health = Clamp(this.health + amount, 0, this.maxHealth);
    }

    Draw(renderer) {
        // Session 1.3 placeholders: deterministic primitive rendering (no image dependency).
        renderer.DrawFillCircle(this.position.x, this.position.y, this.placeholderRadius, this.placeholderFillStyle);
        renderer.DrawStrokeCircle(this.position.x, this.position.y, this.placeholderRadius, this.placeholderStrokeStyle, 2);

        if (this.isSelected) {
            renderer.DrawStrokeCircle(this.position.x, this.position.y, 14, Color.lime, 2);
        }
    }
}

class Unit extends Entity {
    constructor(position, img, options = {}) {
        super(position, img, options);

        this.currentCommand = null;
        this.commandQueue = [];
        this.speed = options.speed || 60;
        this.state = "Idle";
        this.selectionRadius = options.selectionRadius || Math.max(10, this.placeholderRadius + 2);
    }

    Start() {
        this.collider = new CircleCollider(Vector2.Zero(), this.selectionRadius, this);
        game.AddCollider(this.collider);
    }

    Destroy() {
        game.RemoveCollider(this.collider);
        this.collider = null;
    }

    AssignCommand(command) {
        this.currentCommand = command;
    }

    QueueCommand(command) {
        this.commandQueue.push(command);
    }

    ClearCommands() {
        this.currentCommand = null;
        this.commandQueue.length = 0;
        this.state = "Idle";
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (!this.currentCommand && this.commandQueue.length > 0) {
            this.currentCommand = this.commandQueue.shift();
        }

        if (this.currentCommand) {
            if (!this.currentCommand.Validate(this)) {
                this.currentCommand = this.commandQueue.shift() || null;
                if (!this.currentCommand) this.state = "Idle";
            }
            else {
                this.state = "Moving";
                const status = this.currentCommand.Execute(this, deltaTime);
                if (status === CommandStatus.complete) {
                    this.currentCommand = this.commandQueue.shift() || null;
                    if (!this.currentCommand) this.state = "Idle";
                }
            }
        }
    }
}
