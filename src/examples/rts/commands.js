const CommandStatus = Object.freeze({
    running:  0,
    complete: 1
});

class Command {
    Validate(unit) {
        return true;
    }

    Execute(unit, deltaTime) {
        return CommandStatus.complete;
    }
}

class MoveCommand extends Command {
    constructor(targetPos, pathfinder, startPos) {
        super();
        this.targetPos = targetPos;
        this.path = pathfinder.FindPath(startPos, targetPos);
        this.waypointIndex = 0;
        this.waypointReachRadius = 4;
    }

    Validate(unit) {
        return this.path !== null && this.path.length > 0;
    }

    Execute(unit, deltaTime) {
        if (this.waypointIndex >= this.path.length) {
            return CommandStatus.complete;
        }

        const target = this.path[this.waypointIndex];
        const dx = target.x - unit.position.x;
        const dy = target.y - unit.position.y;
        const distSq = SqrLength(dx, dy);
        const reachSq = this.waypointReachRadius * this.waypointReachRadius;

        if (distSq <= reachSq) {
            this.waypointIndex++;
            return this.waypointIndex >= this.path.length ? CommandStatus.complete : CommandStatus.running;
        }

        const dist = Math.sqrt(distSq);
        const move = unit.speed * deltaTime;

        if (move >= dist) {
            unit.position.x = target.x;
            unit.position.y = target.y;
            this.waypointIndex++;
            return this.waypointIndex >= this.path.length ? CommandStatus.complete : CommandStatus.running;
        }

        unit.position.x += (dx / dist) * move;
        unit.position.y += (dy / dist) * move;

        return CommandStatus.running;
    }
}
