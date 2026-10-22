// ============================================================================
// spark.js — GOAP Demo 4: Low-Level FSM States & Base HospitalNPC Class
//   - NPCWaitingState, NPCMovingToState, NPCPerformingActionState (src/engine/fsm.js)
//   - HospitalNPC base class (shared A* movement, 3-state FSM, bladder fullness,
//     CreateUseRestroomAction(), and 100% Renderer-based character drawing)
// ============================================================================

// ============================================================================
// 1. LOW-LEVEL LOCOMOTION & EXECUTION FSM STATES (Using src/engine/fsm.js)
// ============================================================================
// Each NPC uses a 3-state FSM (`Waiting`, `MovingTo`, `PerformingAction`)
// controlled by the high-level GOAPAction currently active in `npc.goap`.

class NPCWaitingState extends FSMState {
    Enter(npc) {
        npc.isMoving = false;
    }

    Update(dt, npc) {
        npc.bobPhase += dt * 2.2;
    }
}

class NPCMovingToState extends FSMState {
    Enter(npc) {
        npc.isMoving = true;
        npc.RecomputePath();
    }

    Update(dt, npc, fsm) {
        if (!npc.moveTarget) {
            npc.hasArrived = true;
            fsm.Transition('Waiting');
            return;
        }

        // Follow A* waypoints
        if (npc.path && npc.pathIndex < npc.path.length) {
            const wp = npc.path[npc.pathIndex];
            const dx = wp.x - npc.position.x;
            const dy = wp.y - npc.position.y;
            const dist = Math.hypot(dx, dy);
            const reachRadius = npc.pathIndex === npc.path.length - 1
                ? npc.arrivalRadius
                : 8;

            if (dist <= reachRadius) {
                npc.pathIndex++;
                if (npc.pathIndex >= npc.path.length) {
                    npc.position.x = npc.moveTarget.x;
                    npc.position.y = npc.moveTarget.y;
                    npc.hasArrived = true;
                    npc.isMoving = false;
                    fsm.Transition(npc.nextStateAfterArrival || 'Waiting');
                    return;
                }
            }
            else {
                const step = Math.min(dist, npc.moveSpeed * dt);
                npc.position.x += (dx / dist) * step;
                npc.position.y += (dy / dist) * step;
                npc.facingAngle = Math.atan2(dy, dx);
                npc.bobPhase += dt * 10;
            }
        }
        else {
            // Direct fallback if path array is empty
            const dx = npc.moveTarget.x - npc.position.x;
            const dy = npc.moveTarget.y - npc.position.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= npc.arrivalRadius) {
                npc.position.x = npc.moveTarget.x;
                npc.position.y = npc.moveTarget.y;
                npc.hasArrived = true;
                npc.isMoving = false;
                fsm.Transition(npc.nextStateAfterArrival || 'Waiting');
            }
            else {
                const step = Math.min(dist, npc.moveSpeed * dt);
                npc.position.x += (dx / dist) * step;
                npc.position.y += (dy / dist) * step;
                npc.facingAngle = Math.atan2(dy, dx);
                npc.bobPhase += dt * 10;
            }
        }
    }

    Exit(npc) {
        npc.isMoving = false;
    }
}

class NPCPerformingActionState extends FSMState {
    Enter(npc) {
        npc.isMoving = false;
    }

    Update(dt, npc) {
        npc.bobPhase += dt * 4.5;
        if (npc.actionDuration > 0) {
            npc.actionTimer += dt;
            npc.actionProgress = Math.min(1, npc.actionTimer / npc.actionDuration);
        }
    }
}

// ============================================================================
// 2. BASE HOSPITAL NPC CLASS (Shared FSM + Restroom GOAP Mechanics + Rendering)
// ============================================================================

class HospitalNPC extends GameObject {
    constructor(position, scene, config = {}) {
        super(position);
        this.scene = scene;
        this.id = config.id || Math.floor(Math.random() * 100000);
        this.name = config.name || 'NPC';
        this.role = config.role || 'Patient'; // 'Patient' | 'Doctor' | 'Receptionist'
        this.roleBadge = config.roleBadge || '';
        this.bodyColor = Color.FromHex(config.colorHex || '#38bdf8');
        this.outlineColor = Color.FromHex(config.outlineHex || '#0f172a');
        this.moveSpeed = config.moveSpeed || 115;

        // Physiological state: universal bladder fullness (0..100%)
        this.bladder = config.initialBladder !== undefined ? config.initialBladder : (15 + Math.random() * 35);
        this.bladderRate = config.bladderRate || (1.8 + Math.random() * 1.4); // % per second
        this.bladderUrgentThreshold = config.bladderUrgentThreshold || 76;
        this.claimedRestroomStall = null;

        // Locomotion & A* path state
        this.moveTarget = null;
        this.arrivalRadius = 6;
        this.hasArrived = false;
        this.nextStateAfterArrival = 'Waiting';
        this.path = [];
        this.pathIndex = 0;
        this.isMoving = false;
        this.facingAngle = 0;
        this.bobPhase = Math.random() * Math.PI * 2;

        // Timed interaction state (driven by PerformingAction FSM state)
        this.actionTimer = 0;
        this.actionDuration = 0;
        this.actionProgress = 0;
        this.statusBubble = 'Idle';
        this.activityIcon = '';

        // Lock flag preventing restroom preemption right in the middle of a surgical/exam lock
        this.inCriticalLock = false;

        // Build low-level 3-state FSM (`Waiting`, `MovingTo`, `PerformingAction`)
        this.fsm = new FSM(this, 'Waiting')
            .AddState('Waiting', new NPCWaitingState())
            .AddState('MovingTo', new NPCMovingToState())
            .AddState('PerformingAction', new NPCPerformingActionState())
            .Start();

        this.goap = null;
    }

    /** Command the low-level FSM to navigate to `targetPos` via A* pathfinding. */
    NavigateTo(targetPos, arrivalState = 'Waiting', radius = 6) {
        if (!targetPos)
            return true;

        this.arrivalRadius = radius;
        this.nextStateAfterArrival = arrivalState;
        const dist = Math.hypot(targetPos.x - this.position.x, targetPos.y - this.position.y);

        if (dist <= radius) {
            this.position.x = targetPos.x;
            this.position.y = targetPos.y;
            this.hasArrived = true;
            this.path = [];
            if (this.fsm.currentStateName !== arrivalState) {
                this.fsm.Transition(arrivalState);
            }
            return true;
        }

        // Only recompute A* if target changed significantly or not currently moving
        const targetChanged = !this.moveTarget ||
            Math.hypot(this.moveTarget.x - targetPos.x, this.moveTarget.y - targetPos.y) > 4;

        this.moveTarget = new Vector2(targetPos.x, targetPos.y);
        this.hasArrived = false;

        if (targetChanged || this.fsm.currentStateName !== 'MovingTo') {
            this.fsm.Transition('MovingTo');
        }
        return false;
    }

    /** Compute A* path across the hospital floorplan grid. */
    RecomputePath() {
        if (!this.moveTarget || !this.scene.pathfinder) {
            this.path = [];
            this.pathIndex = 0;
            return;
        }
        const computed = this.scene.pathfinder.FindPath(this.position, this.moveTarget);
        if (computed && computed.length > 0) {
            // Skip index 0 if it's the cell we're already standing in
            this.path = computed.slice(computed.length > 1 ? 1 : 0);
            this.path[this.path.length - 1] = new Vector2(this.moveTarget.x, this.moveTarget.y);
        }
        else {
            this.path = [new Vector2(this.moveTarget.x, this.moveTarget.y)];
        }
        this.pathIndex = 0;
    }

    /** Begin a timed interaction in the `PerformingAction` FSM state. */
    StartTimedAction(duration, icon = '') {
        this.actionTimer = 0;
        this.actionDuration = duration;
        this.actionProgress = 0;
        this.activityIcon = icon;
        if (this.fsm.currentStateName !== 'PerformingAction') {
            this.fsm.Transition('PerformingAction');
        }
    }

    /** Release any restroom stall claimed by this NPC. */
    ReleaseRestroomStall() {
        if (this.claimedRestroomStall) {
            if (this.claimedRestroomStall.occupant === this) {
                this.claimedRestroomStall.occupant = null;
            }
            this.claimedRestroomStall = null;
        }
    }

    /**
     * Shared GOAP Action factory: every NPC in the hospital can use the nearest
     * available restroom stall when their `RelieveBladder` goal activates.
     */
    CreateUseRestroomAction() {
        return new GOAPAction('UseNearestRestroom', {
            cost: 2,
            preconditions: { bladderRelieved: false },
            effects: { bladderRelieved: true },
            getCost: (npc) => {
                const stall = npc.scene.FindBestRestroomStall(npc.position, npc);
                if (!stall)
                    return 12;
                const d = Math.hypot(stall.pos.x - npc.position.x, stall.pos.y - npc.position.y);
                return 1.5 + d / 220;
            },
            onEnter: (npc) => {
                npc.actionTimer = 0;
                npc.actionDuration = 2.2;
                npc.actionProgress = 0;
                npc.claimedRestroomStall = npc.scene.ClaimNearestRestroomStall(npc);
                // If NPC is a patient waiting in a queue, temporarily step out of queue
                if (npc.role === 'Patient' && typeof npc.LeaveCurrentQueue === 'function') {
                    npc.LeaveCurrentQueue();
                }
            },
            onUpdate: (dt, npc) => {
                if (!npc.claimedRestroomStall) {
                    npc.claimedRestroomStall = npc.scene.ClaimNearestRestroomStall(npc);
                }

                // If all stalls are currently occupied, walk to the nearest restroom waiting spot
                if (!npc.claimedRestroomStall) {
                    const waitPos = npc.scene.GetNearestRestroomWaitPos(npc.position);
                    npc.statusBubble = 'Waiting for free restroom...';
                    npc.activityIcon = '🚻';
                    npc.NavigateTo(waitPos, 'Waiting', 10);
                    return GOAPStatus.RUNNING;
                }

                const stall = npc.claimedRestroomStall;
                npc.statusBubble = `Going to ${stall.restroomName}...`;
                npc.activityIcon = '🚻';

                if (npc.NavigateTo(stall.pos, 'PerformingAction', 6)) {
                    npc.actionDuration = 2.0;
                    npc.statusBubble = `Using ${stall.label}...`;
                    if (npc.actionTimer >= npc.actionDuration) {
                        npc.bladder = 0;
                        npc.activityIcon = '';
                        npc.scene.RecordRestroomUse(stall.restroomId);
                        npc.scene.SpawnFloatingText('🚻 Relieved!', npc.position.x, npc.position.y - 22, '#38bdf8');
                        npc.ReleaseRestroomStall();
                        npc.fsm.Transition('Waiting');
                        return GOAPStatus.SUCCESS;
                    }
                }
                return GOAPStatus.RUNNING;
            },
            onExit: (npc) => {
                npc.ReleaseRestroomStall();
                npc.activityIcon = '';
            }
        });
    }

    Update(dt) {
        super.Update(dt);

        // Increase bladder fullness over time
        if (!this.claimedRestroomStall || this.fsm.currentStateName !== 'PerformingAction') {
            this.bladder = Math.min(100, this.bladder + this.bladderRate * dt);
        }

        // 1. Update high-level GOAP Agent (polls sensors, evaluates goals, steps plan)
        if (this.goap) {
            this.goap.Update(dt);
        }

        // 2. Update low-level Locomotion/Action FSM
        if (this.fsm) {
            this.fsm.Update(dt);
        }
    }

    Draw(renderer) {
        const x = this.position.x;
        const y = this.position.y;
        const isSelected = this.scene.selectedNPC === this;

        // Draw A* path if selected or if global path overlay is enabled
        if ((isSelected || this.scene.showAllPaths) && this.path && this.pathIndex < this.path.length) {
            const pathCol = isSelected
                ? new Color(0.98, 0.80, 0.08, 0.85)
                : new Color(0.22, 0.74, 0.97, 0.38);

            let prevX = x;
            let prevY = y;
            for (let i = this.pathIndex; i < this.path.length; i++) {
                const pt = this.path[i];
                renderer.DrawDashedLine(prevX, prevY, pt.x, pt.y, pathCol, isSelected ? 2 : 1.2, [4, 3]);
                renderer.DrawFillCircle(pt.x, pt.y, isSelected ? 3 : 2, pathCol);
                prevX = pt.x;
                prevY = pt.y;
            }
        }

        // Selection ring
        if (isSelected) {
            const pulse = 15 + Math.sin(this.bobPhase * 1.5) * 2.5;
            renderer.DrawStrokeCircle(x, y, pulse, Color.FromHex('#facc15'), 2.2);
            renderer.DrawFillCircle(x, y, pulse, new Color(0.98, 0.80, 0.08, 0.14));
        }

        // Subtle shadow
        const bobOffset = this.isMoving ? Math.sin(this.bobPhase) * 1.8 : 0;
        renderer.DrawFillEllipse(x, y + 9, 9, 4.5, new Color(0, 0, 0, 0.35));

        // Character body circle
        const radius = this.role === 'Doctor' ? 10.5 : this.role === 'Receptionist' ? 10 : 9;
        renderer.DrawFillCircle(x, y + bobOffset, radius, this.bodyColor);
        renderer.DrawStrokeCircle(x, y + bobOffset, radius, isSelected ? Color.FromHex('#facc15') : this.outlineColor, isSelected ? 2 : 1.5);

        // Role-specific visual details (Doctor white coat cross / Reception headset / Patient symptom badge)
        if (this.role === 'Doctor') {
            renderer.DrawFillCircle(x, y + bobOffset, radius - 3, Color.FromHex('#f8fafc'));
            renderer.DrawFillText(this.roleBadge || '✚', x, y + bobOffset + 3.5, 'bold 10px monospace', this.bodyColor, 'center', 'alphabetic');
        }
        else if (this.role === 'Receptionist') {
            renderer.DrawFillText('🛎️', x, y + bobOffset + 3.5, '10px sans-serif', Color.white, 'center', 'alphabetic');
        }
        else if (this.role === 'Patient') {
            renderer.DrawFillText(this.ailment.symptomIcon, x, y + bobOffset + 3.5, '10px sans-serif', Color.white, 'center', 'alphabetic');
        }

        // Mini bladder urgency indicator when bladder >= 60%
        if (this.bladder >= 60) {
            const urgentCol = this.bladder >= this.bladderUrgentThreshold
                ? Color.FromHex('#ef4444')
                : Color.FromHex('#eab308');
            renderer.DrawFillCircle(x + radius - 1, y - radius + 1, 4.5, urgentCol);
            renderer.DrawStrokeCircle(x + radius - 1, y - radius + 1, 4.5, Color.FromHex('#0f172a'), 1);
        }

        // Timed action progress bar above head when in PerformingAction state
        if (this.fsm.currentStateName === 'PerformingAction' && this.actionDuration > 0 && this.actionProgress > 0) {
            const bw = 28;
            const bh = 4;
            const bx = x - bw / 2;
            const by = y - radius - 10;
            renderer.DrawFillBasicRoundRectangle(bx, by, bw, bh, 2, new Color(0.06, 0.09, 0.16, 0.88));
            renderer.DrawFillBasicRoundRectangle(bx, by, bw * this.actionProgress, bh, 2, Color.FromHex('#4ade80'));
            renderer.DrawStrokeBasicRoundRectangle(bx, by, bw, bh, 2, Color.FromHex('#1e293b'), 1);
        }

        // Overhead compact name / status tag
        const labelY = y - radius - 14;
        const shortLabel = isSelected
            ? `${this.name} [${this.fsm.currentStateName}]`
            : this.name;
        renderer.DrawFillText(
            shortLabel,
            x,
            labelY,
            isSelected ? 'bold 10px monospace' : '9px monospace',
            isSelected ? Color.FromHex('#fef08a') : Color.FromHex('#cbd5e1'),
            'center',
            'alphabetic'
        );

        // If selected, also draw the built-in GOAP overhead debug tag below the NPC
        if (isSelected && this.goap) {
            this.goap.DrawDebug(renderer, x, y + radius + 16, Color.FromHex('#38bdf8'), true);
        }
    }
}

