// ============================================================================
// spark.js — GOAP Demo 3: Multi-Room Dungeon Heist & Deep A* Chaining
// Demonstrates:
//   - Deep 8-step causal dependency resolution via Forward State-Space A*
//   - Dynamic shortcut discovery (Teleporter vs 5-step Key/Armory/Bomb/Boulder chain)
//   - Cost-based lockpicking fallback (PickArmoryLock [cost 9] vs RustyKey [cost 2+2])
//   - Real-time plan repair when doors/traps are toggled mid-execution
// ============================================================================

debugMode = true;

class DungeonRogue extends GameObject {
    constructor(position, scene) {
        super(position);
        this.scene = scene;
        this.speed = 135;

        // Inventory / Heist state
        this.hasRustyKey = false;
        this.hasBomb = false;
        this.hasVaultKey = false;
        this.hasIdol = false;
        this.escapedWithIdol = false;

        this.workTimer = 0;
        this.workProgress = 0;
        this.statusBanner = "Synthesizing dungeon heist plan...";

        this.goap = this.BuildGOAP();
    }

    BuildGOAP() {
        const agent = new GOAPAgent(this);
        agent.replanInterval = 0.35;
        agent.planner.maxIterations = 400;

        // --------------------------------------------------------------------
        // 1. SENSORS: Synchronize dungeon & rogue inventory facts
        // --------------------------------------------------------------------
        agent.AddSensor((rogue, state) => {
            const d = rogue.scene.dungeon;
            state.Set('hasRustyKey', rogue.hasRustyKey);
            state.Set('armoryUnlocked', d.armoryUnlocked);
            state.Set('hasBomb', rogue.hasBomb);
            state.Set('boulderCleared', d.boulderCleared);
            state.Set('hasVaultKey', rogue.hasVaultKey);
            state.Set('trapDisabled', d.trapDisabled);
            state.Set('hasIdol', rogue.hasIdol);
            state.Set('escapedWithIdol', rogue.escapedWithIdol);
            state.Set('teleporterActive', d.teleporterActive);
        });

        // --------------------------------------------------------------------
        // 2. GOALS
        // --------------------------------------------------------------------
        agent.AddGoals([
            new GOAPGoal('HeistGoldenIdol', { escapedWithIdol: true }, (owner, ws) => {
                return ws.Get('escapedWithIdol') ? 0 : 100;
            }),
            new GOAPGoal('CelebrateHeist', { celebrated: true }, 10)
        ]);

        // --------------------------------------------------------------------
        // 3. ACTIONS: 10 Modular Dungeon Interactions
        // --------------------------------------------------------------------
        const scene = this.scene;

        // Step 1: Pick up Rusty Key in Guard Room (Cost 2)
        const pickupRustyKey = new GOAPAction('PickupRustyKey', {
            cost: 2,
            preconditions: { hasRustyKey: false },
            effects: { hasRustyKey: true },
            proceduralPrecondition: () => scene.dungeon.rustyKeyAvailable,
            onEnter: (r) => { r.workTimer = 0; },
            onUpdate: (dt, r) => {
                if (!scene.dungeon.rustyKeyAvailable) return GOAPStatus.FAILURE;
                r.statusBanner = "Moving to Guard Room to grab the Rusty Key...";
                if (r.MoveTowards(scene.rooms.guardRoom, dt)) {
                    r.workTimer += dt;
                    r.workProgress = Math.min(1, r.workTimer / 0.45);
                    if (r.workTimer >= 0.45) {
                        r.hasRustyKey = true;
                        r.workProgress = 0;
                        scene.SpawnFloatingText("+Rusty Key", r.position.x, r.position.y - 24, '#fbbf24');
                        return GOAPStatus.SUCCESS;
                    }
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 2A: Unlock Armory Door with Rusty Key (Cost 2)
        const unlockArmory = new GOAPAction('UnlockArmory', {
            cost: 2,
            preconditions: { hasRustyKey: true, armoryUnlocked: false },
            effects: { armoryUnlocked: true },
            onEnter: (r) => { r.workTimer = 0; },
            onUpdate: (dt, r) => {
                r.statusBanner = "Unlocking Armory Door with Rusty Key...";
                if (r.MoveTowards(scene.rooms.armoryDoor, dt)) {
                    r.workTimer += dt;
                    r.workProgress = Math.min(1, r.workTimer / 0.45);
                    if (r.workTimer >= 0.45) {
                        scene.dungeon.armoryUnlocked = true;
                        r.workProgress = 0;
                        scene.SpawnFloatingText("ARMORY UNLOCKED!", r.position.x, r.position.y - 24, '#60a5fa');
                        return GOAPStatus.SUCCESS;
                    }
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 2B: Pick Armory Lock without Key (High Cost = 9, fallback when key missing!)
        const pickArmoryLock = new GOAPAction('PickArmoryLock', {
            cost: 9,
            preconditions: { armoryUnlocked: false },
            effects: { armoryUnlocked: true },
            onEnter: (r) => { r.workTimer = 0; },
            onUpdate: (dt, r) => {
                r.statusBanner = "No Rusty Key! Picking heavy Armory lock slowly...";
                if (r.MoveTowards(scene.rooms.armoryDoor, dt)) {
                    r.workTimer += dt;
                    r.workProgress = Math.min(1, r.workTimer / 1.1);
                    if (r.workTimer >= 1.1) {
                        scene.dungeon.armoryUnlocked = true;
                        r.workProgress = 0;
                        scene.SpawnFloatingText("LOCK PICKED!", r.position.x, r.position.y - 24, '#a78bfa');
                        return GOAPStatus.SUCCESS;
                    }
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 3: Pick up Demolition Bomb inside Armory (Cost 2)
        const pickupBomb = new GOAPAction('PickupBomb', {
            cost: 2,
            preconditions: { armoryUnlocked: true, hasBomb: false },
            effects: { hasBomb: true },
            onEnter: (r) => { r.workTimer = 0; },
            onUpdate: (dt, r) => {
                if (!scene.dungeon.armoryUnlocked) return GOAPStatus.FAILURE;
                r.statusBanner = "Entering Armory to acquire Demolition Bomb...";
                if (r.MoveTowards(scene.rooms.armory, dt)) {
                    r.workTimer += dt;
                    r.workProgress = Math.min(1, r.workTimer / 0.45);
                    if (r.workTimer >= 0.45) {
                        r.hasBomb = true;
                        r.workProgress = 0;
                        scene.SpawnFloatingText("+Demolition Bomb", r.position.x, r.position.y - 24, '#f97316');
                        return GOAPStatus.SUCCESS;
                    }
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 4: Blow up Boulder blocking the Crypt (Cost 2)
        const blowUpBoulder = new GOAPAction('BlowUpBoulder', {
            cost: 2,
            preconditions: { hasBomb: true, boulderCleared: false },
            effects: { boulderCleared: true, hasBomb: false },
            onEnter: (r) => { r.workTimer = 0; },
            onUpdate: (dt, r) => {
                r.statusBanner = "Planting Demolition Bomb on Crypt Boulder...";
                if (r.MoveTowards(scene.rooms.boulder, dt)) {
                    r.workTimer += dt;
                    r.workProgress = Math.min(1, r.workTimer / 0.65);
                    if (r.workTimer >= 0.65) {
                        r.hasBomb = false;
                        scene.dungeon.boulderCleared = true;
                        r.workProgress = 0;
                        scene.SpawnFloatingText("BOOM! BOULDER CLEARED!", r.position.x, r.position.y - 24, '#ef4444');
                        return GOAPStatus.SUCCESS;
                    }
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 5A: Grab Vault Key from Crypt (Cost 2)
        const grabVaultKey = new GOAPAction('GrabVaultKey', {
            cost: 2,
            preconditions: { boulderCleared: true, hasVaultKey: false },
            effects: { hasVaultKey: true },
            onEnter: (r) => { r.workTimer = 0; },
            onUpdate: (dt, r) => {
                if (!scene.dungeon.boulderCleared) return GOAPStatus.FAILURE;
                r.statusBanner = "Retrieving Ornate Vault Key from Ancient Crypt...";
                if (r.MoveTowards(scene.rooms.crypt, dt)) {
                    r.workTimer += dt;
                    r.workProgress = Math.min(1, r.workTimer / 0.45);
                    if (r.workTimer >= 0.45) {
                        r.hasVaultKey = true;
                        r.workProgress = 0;
                        scene.SpawnFloatingText("+Ornate Vault Key", r.position.x, r.position.y - 24, '#38bdf8');
                        return GOAPStatus.SUCCESS;
                    }
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 5B: Teleporter Shortcut directly to Crypt Vault Key (Cost 1 when active!)
        const useTeleporter = new GOAPAction('WarpToCryptKey', {
            cost: 1,
            preconditions: { teleporterActive: true, hasVaultKey: false },
            effects: { hasVaultKey: true },
            onEnter: (r) => { r.workTimer = 0; },
            onUpdate: (dt, r) => {
                if (!scene.dungeon.teleporterActive) return GOAPStatus.FAILURE;
                r.statusBanner = "Taking Arcane Teleporter shortcut straight to Crypt Key!";
                if (r.MoveTowards(scene.rooms.teleporter, dt)) {
                    r.position.Set(scene.rooms.crypt.x, scene.rooms.crypt.y);
                    r.hasVaultKey = true;
                    scene.SpawnFloatingText("WARP SHORTCUT! +Vault Key", r.position.x, r.position.y - 24, '#c084fc');
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 6: Disable Laser Trap at Security Console (Cost 2)
        const disableTrap = new GOAPAction('DisableLaserTrap', {
            cost: 2,
            preconditions: { trapDisabled: false },
            effects: { trapDisabled: true },
            onEnter: (r) => { r.workTimer = 0; },
            onUpdate: (dt, r) => {
                r.statusBanner = "Hacking Security Console to disable Vault Lasers...";
                if (r.MoveTowards(scene.rooms.console, dt)) {
                    r.workTimer += dt;
                    r.workProgress = Math.min(1, r.workTimer / 0.55);
                    if (r.workTimer >= 0.55) {
                        scene.dungeon.trapDisabled = true;
                        r.workProgress = 0;
                        scene.SpawnFloatingText("LASER GRID OFFLINE", r.position.x, r.position.y - 24, '#4ade80');
                        return GOAPStatus.SUCCESS;
                    }
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 7: Steal Golden Idol from Vault (Cost 2)
        const stealIdol = new GOAPAction('StealGoldenIdol', {
            cost: 2,
            preconditions: { hasVaultKey: true, trapDisabled: true, hasIdol: false },
            effects: { hasIdol: true },
            onEnter: (r) => { r.workTimer = 0; },
            onUpdate: (dt, r) => {
                if (!scene.dungeon.trapDisabled) return GOAPStatus.FAILURE; // Trap re-armed! Replan!
                r.statusBanner = "Unlocking Inner Sanctum & claiming the Golden Idol!";
                if (r.MoveTowards(scene.rooms.vault, dt)) {
                    r.workTimer += dt;
                    r.workProgress = Math.min(1, r.workTimer / 0.55);
                    if (r.workTimer >= 0.55) {
                        r.hasIdol = true;
                        r.workProgress = 0;
                        scene.SpawnFloatingText("GOLDEN IDOL CLAIMED!", r.position.x, r.position.y - 24, '#fde047');
                        return GOAPStatus.SUCCESS;
                    }
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 8: Escape Dungeon to Extraction Portal (Cost 2)
        const escapeDungeon = new GOAPAction('EscapeDungeon', {
            cost: 2,
            preconditions: { hasIdol: true, escapedWithIdol: false },
            effects: { escapedWithIdol: true },
            onUpdate: (dt, r) => {
                r.statusBanner = "Sprinting to Extraction Stairwell with Golden Idol!";
                if (r.MoveTowards(scene.rooms.exit, dt)) {
                    r.escapedWithIdol = true;
                    scene.heistsCompleted++;
                    scene.SpawnFloatingText("HEIST COMPLETE! ([R] Reset)", r.position.x, r.position.y - 24, '#34d399');
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Victory loop
        const celebrate = new GOAPAction('VictoryLap', {
            cost: 1,
            preconditions: {},
            effects: { celebrated: true },
            onUpdate: (dt, r) => {
                r.statusBanner = "Heist complete! Press [R] or click Reset to run a new puzzle configuration.";
                return GOAPStatus.RUNNING;
            }
        });

        agent.AddActions([
            pickupRustyKey,
            unlockArmory,
            pickArmoryLock,
            pickupBomb,
            blowUpBoulder,
            grabVaultKey,
            useTeleporter,
            disableTrap,
            stealIdol,
            escapeDungeon,
            celebrate
        ]);

        return agent;
    }

    MoveTowards(targetPos, dt, stopDist = 12) {
        const dx = targetPos.x - this.position.x;
        const dy = targetPos.y - this.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= stopDist) return true;

        const step = Math.min(dist, this.speed * dt);
        this.position.x += (dx / dist) * step;
        this.position.y += (dy / dist) * step;
        return dist - step <= stopDist;
    }

    Update(dt) {
        super.Update(dt);
        this.goap.Update(dt);
    }

    Draw(renderer) {
        const ctx = renderer.ctx;
        ctx.save();

        // Rogue cloak & body
        ctx.fillStyle = this.hasIdol ? '#facc15' : '#a855f7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Progress bar
        if (this.workProgress > 0 && this.workProgress < 1) {
            const bw = 32;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(this.position.x - bw / 2, this.position.y - 25, bw, 4);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(this.position.x - bw / 2, this.position.y - 25, bw * this.workProgress, 4);
        }

        ctx.restore();
        this.goap.DrawDebug(renderer, this.position.x, this.position.y - 30);
    }
}

class GOAPDungeonScene extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({
            screenWidth: 980,
            screenHeight: 560,
            fillWindow: false
        });
        this.rooms = {
            exit:       { x: 95,  y: 125, label: '1. Entry / Exit', color: '#34d399' },
            guardRoom:  { x: 255, y: 125, label: '2. Guard Room (Rusty Key)', color: '#fbbf24' },
            teleporter: { x: 420, y: 125, label: 'Arcane Teleporter', color: '#c084fc' },
            armoryDoor: { x: 115, y: 270, label: '3. Armory Door', color: '#60a5fa' },
            armory:     { x: 255, y: 270, label: '4. Armory (Bomb)', color: '#f97316' },
            console:    { x: 420, y: 270, label: '5. Security Console', color: '#4ade80' },
            boulder:    { x: 115, y: 415, label: '6. Crypt Boulder', color: '#ef4444' },
            crypt:      { x: 255, y: 415, label: '7. Crypt (Vault Key)', color: '#38bdf8' },
            vault:      { x: 420, y: 415, label: '8. Golden Idol Vault', color: '#fde047' }
        };
        this.dungeon = {
            rustyKeyAvailable: true,
            armoryUnlocked: false,
            boulderCleared: false,
            trapDisabled: false,
            teleporterActive: false
        };
        this.heistsCompleted = 0;
        this.floatingTexts = [];
        this.buttons = [];
    }

    Start() {
        super.Start();
        this.ResetHeist();
        this.SetupButtons();
    }

    SetupButtons() {
        const y = 510;
        const h = 34;
        this.buttons = [
            { label: '[1] Toggle Rusty Key (Lockpick Fallback)', x: 20,  y, w: 220, h, action: () => this.ToggleRustyKey() },
            { label: '[2] Grant Bomb Directly',                  x: 248, y, w: 150, h, action: () => this.GrantBomb() },
            { label: '[3] Re-Arm Laser Grid',                    x: 406, y, w: 145, h, action: () => this.ToggleLaserTrap() },
            { label: '[4] Toggle Teleporter Shortcut',           x: 559, y, w: 185, h, action: () => this.ToggleTeleporter() },
            { label: '[R] Reset Dungeon Heist',                  x: 752, y, w: 208, h, action: () => this.ResetHeist() }
        ];
    }

    ResetHeist() {
        this.dungeon = {
            rustyKeyAvailable: true,
            armoryUnlocked: false,
            boulderCleared: false,
            trapDisabled: false,
            teleporterActive: false
        };
        this.floatingTexts = [];
        this.rogue = new DungeonRogue(new Vector2(this.rooms.exit.x, this.rooms.exit.y), this);
        this.gameObjects = [this.rogue];
        this.rogue.goap.Plan();
    }

    ToggleRustyKey() {
        this.dungeon.rustyKeyAvailable = !this.dungeon.rustyKeyAvailable;
        if (!this.dungeon.rustyKeyAvailable) this.rogue.hasRustyKey = false;
        this.SpawnFloatingText(
            this.dungeon.rustyKeyAvailable ? "RUSTY KEY PRESENT" : "KEY REMOVED -> LOCKPICK PLAN!",
            this.rooms.guardRoom.x, this.rooms.guardRoom.y - 20, '#fbbf24'
        );
        this.rogue.goap.Plan();
    }

    GrantBomb() {
        this.rogue.hasBomb = true;
        this.SpawnFloatingText("GRANTED BOMB! (Skipping Armory)", this.rogue.position.x, this.rogue.position.y - 20, '#f97316');
        this.rogue.goap.Plan();
    }

    ToggleLaserTrap() {
        this.dungeon.trapDisabled = !this.dungeon.trapDisabled;
        this.SpawnFloatingText(
            this.dungeon.trapDisabled ? "LASERS DISABLED" : "LASERS ARMED!",
            this.rooms.console.x, this.rooms.console.y - 20, '#4ade80'
        );
        this.rogue.goap.Plan();
    }

    ToggleTeleporter() {
        this.dungeon.teleporterActive = !this.dungeon.teleporterActive;
        this.SpawnFloatingText(
            this.dungeon.teleporterActive ? "TELEPORTER ONLINE (SHORTCUT!)" : "TELEPORTER OFFLINE",
            this.rooms.teleporter.x, this.rooms.teleporter.y - 20, '#c084fc'
        );
        this.rogue.goap.Plan();
    }

    SpawnFloatingText(text, x, y, color = '#ffffff') {
        this.floatingTexts.push({ text, x, y, color, timer: 1.35 });
    }

    Update(dt) {
        super.Update(dt);

        if (Input.IsKeyDown(KEY_1)) this.ToggleRustyKey();
        if (Input.IsKeyDown(KEY_2)) this.GrantBomb();
        if (Input.IsKeyDown(KEY_3)) this.ToggleLaserTrap();
        if (Input.IsKeyDown(KEY_4)) this.ToggleTeleporter();
        if (Input.IsKeyDown(KEY_R)) this.ResetHeist();

        if (Input.IsMouseDown()) {
            const mx = Input.mouse.x;
            const my = Input.mouse.y;
            for (const btn of this.buttons) {
                if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                    btn.action();
                }
            }
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].y -= 20 * dt;
            this.floatingTexts[i].timer -= dt;
            if (this.floatingTexts[i].timer <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    Draw() {
        const ctx = this.renderer.ctx;
        ctx.save();

        // Background
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

        // Header
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, this.screenWidth, 46);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 15px monospace';
        ctx.fillText('GOAP DEMO 3: Multi-Room Dungeon Heist (8-Step Deep A* Dependency Chain)', 20, 20);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px monospace';
        ctx.fillText(this.rogue.statusBanner, 20, 38);

        // Dungeon Floor
        ctx.fillStyle = '#131c2e';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.fillRect(20, 55, 495, 440);
        ctx.strokeRect(20, 55, 495, 440);

        // Draw corridors connecting rooms
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(95, 125); ctx.lineTo(420, 125);
        ctx.moveTo(255, 125); ctx.lineTo(255, 415);
        ctx.moveTo(115, 270); ctx.lineTo(420, 270);
        ctx.moveTo(115, 415); ctx.lineTo(420, 415);
        ctx.stroke();

        // Draw Each Room Node
        for (const key of Object.keys(this.rooms)) {
            const rm = this.rooms[key];
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = rm.color;
            ctx.lineWidth = 2;
            ctx.fillRect(rm.x - 58, rm.y - 34, 116, 68);
            ctx.strokeRect(rm.x - 58, rm.y - 34, 116, 68);

            ctx.fillStyle = rm.color;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(rm.label, rm.x, rm.y - 16);
        }

        // Room status badges
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.dungeon.rustyKeyAvailable && !this.rogue.hasRustyKey ? '#fde047' : '#64748b';
        ctx.fillText(this.dungeon.rustyKeyAvailable ? (this.rogue.hasRustyKey ? 'TAKEN' : 'KEY READY') : 'NO KEY', this.rooms.guardRoom.x, this.rooms.guardRoom.y + 14);

        ctx.fillStyle = this.dungeon.teleporterActive ? '#d8b4fe' : '#64748b';
        ctx.fillText(this.dungeon.teleporterActive ? 'ONLINE (COST 1)' : 'OFFLINE', this.rooms.teleporter.x, this.rooms.teleporter.y + 14);

        ctx.fillStyle = this.dungeon.armoryUnlocked ? '#4ade80' : '#f87171';
        ctx.fillText(this.dungeon.armoryUnlocked ? 'UNLOCKED' : 'LOCKED', this.rooms.armoryDoor.x, this.rooms.armoryDoor.y + 14);

        ctx.fillStyle = !this.rogue.hasBomb ? '#fdba74' : '#64748b';
        ctx.fillText(this.rogue.hasBomb ? 'BOMB TAKEN' : 'BOMB CRATE', this.rooms.armory.x, this.rooms.armory.y + 14);

        ctx.fillStyle = this.dungeon.trapDisabled ? '#4ade80' : '#f87171';
        ctx.fillText(this.dungeon.trapDisabled ? 'LASERS OFF' : 'LASERS ARMED', this.rooms.console.x, this.rooms.console.y + 14);

        ctx.fillStyle = this.dungeon.boulderCleared ? '#4ade80' : '#f87171';
        ctx.fillText(this.dungeon.boulderCleared ? 'CLEARED' : 'BLOCKED', this.rooms.boulder.x, this.rooms.boulder.y + 14);

        ctx.fillStyle = !this.rogue.hasVaultKey ? '#38bdf8' : '#64748b';
        ctx.fillText(this.rogue.hasVaultKey ? 'KEY TAKEN' : 'VAULT KEY', this.rooms.crypt.x, this.rooms.crypt.y + 14);

        ctx.fillStyle = !this.rogue.hasIdol ? '#fde047' : '#64748b';
        ctx.fillText(this.rogue.hasIdol ? 'STOLEN!' : 'GOLDEN IDOL', this.rooms.vault.x, this.rooms.vault.y + 14);

        // Draw planned path preview lines on dungeon map
        const plan = this.rogue.goap.currentPlan;
        if (plan.length > 0) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.rogue.position.x, this.rogue.position.y);
            const actionToRoom = {
                PickupRustyKey: this.rooms.guardRoom,
                UnlockArmory: this.rooms.armoryDoor,
                PickArmoryLock: this.rooms.armoryDoor,
                PickupBomb: this.rooms.armory,
                BlowUpBoulder: this.rooms.boulder,
                GrabVaultKey: this.rooms.crypt,
                WarpToCryptKey: this.rooms.teleporter,
                DisableLaserTrap: this.rooms.console,
                StealGoldenIdol: this.rooms.vault,
                EscapeDungeon: this.rooms.exit
            };
            for (let i = this.rogue.goap.currentPlanIndex; i < plan.length; i++) {
                const targetRm = actionToRoom[plan[i].name];
                if (targetRm) ctx.lineTo(targetRm.x, targetRm.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Rogue
        super.Draw();

        // Floating texts
        for (const ft of this.floatingTexts) {
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
        }

        // Rogue Inventory HUD inside Dungeon
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
        ctx.fillRect(28, 462, 478, 26);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '11px monospace';
        ctx.fillText(
            `INVENTORY: RustyKey:${this.rogue.hasRustyKey ? 'YES' : 'NO'} | Bomb:${this.rogue.hasBomb ? 'YES' : 'NO'} | VaultKey:${this.rogue.hasVaultKey ? 'YES' : 'NO'} | Idol:${this.rogue.hasIdol ? 'YES' : 'NO'} | Heists:${this.heistsCompleted}`,
            36, 479
        );

        // Draw Interactive Sandbox Buttons
        for (const btn of this.buttons) {
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = '#f8fafc';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 21);
        }

        ctx.restore();

        // Draw GOAP Inspector on the Right
        DrawGOAPInspector(this.renderer, this.rogue.goap, 530, 55, {
            width: 430,
            title: 'GOAP HEIST PLANNER (8-STEP CHAIN)'
        });
    }
}

window.onload = () => {
    Init(GOAPDungeonScene, 'canvas');
};
