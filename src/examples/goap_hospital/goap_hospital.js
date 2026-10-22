// ============================================================================
// spark.js — GOAP Demo 4: Autonomous Hospital Multi-Agent Simulation Scene
//   - Coordinates queues (Reception, X-Ray, 4 Specialist Waiting Rooms, 3 Restrooms)
//   - Renders floorplan, top interactive toolbar, Hospital Telemetry dashboard,
//     and click-to-inspect GOAP & FSM Inspector
//   - Split across:
//       * hospital_defs.js     (Departments, Ailments, HospitalNavGrid, Floorplan)
//       * hospital_npc_base.js (3-state Locomotion/Action FSM & HospitalNPC base)
//       * hospital_agents.js   (ReceptionistNPC, DoctorNPC, PatientNPC GOAP brains)
//       * goap_hospital.js     (GOAPHospitalScene main Game class)
// See README.md for full architectural documentation.
// ============================================================================

debugMode = true;

class GOAPHospitalScene extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({
            screenWidth: 1280,
            screenHeight: 720
        });
    }

    Start() {
        super.Start();

        this.simulationTime = 0;
        this.nextPatientId = 1;
        this.autoSpawnMode = 1; // 0 = Paused, 1 = Normal (every 4.8s), 2 = Rush Hour (every 2.4s)
        this.spawnTimer = 1.2;
        this.maxActivePatients = 14;
        this.showAllPaths = false;
        this.showNavGrid = false;

        this.floatingTexts = [];
        this.receptionQueue = [];
        this.xrayQueue = [];
        this.departmentQueues = {
            general: [],
            ophthalmology: [],
            orthopedics: [],
            maternity: []
        };

        // Hospital State & Telemetry Counters
        this.stats = {
            totalArrived: 0,
            totalTriaged: 0,
            totalXRayScans: 0,
            totalDischarged: 0,
            sections: {
                general:       { treated: 0, waitTimeSum: 0, waitCount: 0, avgWait: 0 },
                ophthalmology: { treated: 0, waitTimeSum: 0, waitCount: 0, avgWait: 0 },
                orthopedics:   { treated: 0, waitTimeSum: 0, waitCount: 0, avgWait: 0 },
                maternity:     { treated: 0, waitTimeSum: 0, waitCount: 0, avgWait: 0 }
            },
            restrooms: {
                west:  { name: 'West Lobby WC',  uses: 0 },
                north: { name: 'North Wing WC', uses: 0 },
                south: { name: 'South Wing WC', uses: 0 }
            }
        };

        // Build floorplan geometry, restrooms, and A* pathfinder (defined in hospital_defs.js)
        const floorplan = BuildHospitalFloorplan();
        this.navGrid = floorplan.navGrid;
        this.layout = floorplan.layout;
        this.allRestroomStalls = floorplan.allRestroomStalls;
        this.pathfinder = floorplan.pathfinder;

        this.SpawnInitialStaffAndPatients();
        this.BuildControlButtons();
    }

    // ------------------------------------------------------------------------
    // Staff & Patient Spawning
    // ------------------------------------------------------------------------
    SpawnInitialStaffAndPatients() {
        this.staffNPCs = [];
        this.patients = [];

        // 1. Receptionist
        this.receptionist = new ReceptionistNPC(
            new Vector2(this.layout.reception.staffPos.x, this.layout.reception.staffPos.y),
            this
        );
        this.staffNPCs.push(this.receptionist);

        // 2. Four Specialist Doctors
        this.doctors = {};
        const deptKeys = Object.keys(HOSPITAL_DEPARTMENTS);
        for (let i = 0; i < deptKeys.length; i++) {
            const key = deptKeys[i];
            const deptCfg = HOSPITAL_DEPARTMENTS[key];
            const room = this.layout.departments[key];
            const doc = new DoctorNPC(
                new Vector2(room.doctorExamPos.x, room.doctorExamPos.y),
                this,
                deptCfg,
                room
            );
            this.doctors[key] = doc;
            this.staffNPCs.push(doc);
        }

        this.selectedNPC = this.doctors.orthopedics;

        // Spawn 4 initial patients with diverse ailments (including an X-Ray fracture patient)
        this.SpawnPatient(PATIENT_AILMENTS[5]); // Radius Fracture (needs X-Ray -> Orthopedics)
        this.SpawnPatient(PATIENT_AILMENTS[0]); // Common Cold (General Medicine)
        this.SpawnPatient(PATIENT_AILMENTS[2]); // Blurred Vision (Ophthalmology)
        this.SpawnPatient(PATIENT_AILMENTS[6]); // Prenatal Checkup (Maternity)

        if (this.patients.length > 0) {
            this.selectedNPC = this.patients[0];
        }
    }

    SpawnPatient(forcedAilment = null) {
        if (this.patients.length >= this.maxActivePatients)
            return null;

        const ailment = forcedAilment || PATIENT_AILMENTS[Math.floor(Math.random() * PATIENT_AILMENTS.length)];
        const jitterY = (Math.random() - 0.5) * 24;
        const startPos = new Vector2(this.layout.entrancePos.x, this.layout.entrancePos.y + jitterY);
        const pt = new PatientNPC(startPos, this, ailment, this.nextPatientId++);

        this.patients.push(pt);
        this.stats.totalArrived++;
        return pt;
    }

    // ------------------------------------------------------------------------
    // Queue & Restroom Coordination Helpers
    // ------------------------------------------------------------------------
    AddToReceptionQueue(pt) {
        if (!this.receptionQueue.includes(pt)) {
            this.receptionQueue.push(pt);
        }
    }

    RemoveFromReceptionQueue(pt) {
        const idx = this.receptionQueue.indexOf(pt);
        if (idx !== -1) {
            this.receptionQueue.splice(idx, 1);
        }
    }

    GetReceptionSlotPosition(pt) {
        let idx = this.receptionQueue.indexOf(pt);
        if (idx === -1)
            idx = this.receptionQueue.length;
        const slots = this.layout.reception.queueSlots;
        return slots[Math.min(idx, slots.length - 1)];
    }

    GetHeadReceptionPatient() {
        if (this.receptionQueue.length === 0)
            return null;
        const head = this.receptionQueue[0];
        const slot0 = this.layout.reception.queueSlots[0];
        const dist = Math.hypot(head.position.x - slot0.x, head.position.y - slot0.y);
        return dist <= 18 ? head : null;
    }

    // X-Ray Queue
    AddToXRayQueue(pt) {
        if (!this.xrayQueue.includes(pt)) {
            this.xrayQueue.push(pt);
        }
    }

    RemoveFromXRayQueue(pt) {
        const idx = this.xrayQueue.indexOf(pt);
        if (idx !== -1) {
            this.xrayQueue.splice(idx, 1);
        }
    }

    GetActiveXRayPatient() {
        return this.xrayQueue.length > 0 ? this.xrayQueue[0] : null;
    }

    GetXRaySlotPosition(pt) {
        const idx = Math.max(0, this.xrayQueue.indexOf(pt) - 1);
        const slots = this.layout.xrayRoom.queueSlots;
        return slots[Math.min(idx, slots.length - 1)];
    }

    CompleteXRayForPatient(pt) {
        this.RemoveFromXRayQueue(pt);
        this.stats.totalXRayScans++;
    }

    // Department Waiting Room Queues
    AddToDepartmentQueue(deptId, pt) {
        const q = this.departmentQueues[deptId];
        if (q && !q.includes(pt)) {
            q.push(pt);
        }
    }

    RemoveFromDepartmentQueue(deptId, pt) {
        const q = this.departmentQueues[deptId];
        if (!q)
            return;
        const idx = q.indexOf(pt);
        if (idx !== -1) {
            q.splice(idx, 1);
        }
    }

    GetDepartmentQueueSlotPosition(deptId, pt) {
        const q = this.departmentQueues[deptId] || [];
        let idx = q.indexOf(pt);
        if (idx === -1)
            idx = q.length;
        const slots = this.layout.departments[deptId].queueSlots;
        return slots[Math.min(idx, slots.length - 1)];
    }

    GetDepartmentReadyQueueCount(deptId) {
        const q = this.departmentQueues[deptId] || [];
        let ready = 0;
        const slots = this.layout.departments[deptId].queueSlots;
        for (let i = 0; i < q.length; i++) {
            const pt = q[i];
            const slotPos = slots[Math.min(i, slots.length - 1)];
            if (Math.hypot(pt.position.x - slotPos.x, pt.position.y - slotPos.y) <= 24) {
                ready++;
            }
        }
        return ready;
    }

    PopNextDepartmentPatient(deptId, doctor) {
        const q = this.departmentQueues[deptId] || [];
        const slots = this.layout.departments[deptId].queueSlots;
        for (let i = 0; i < q.length; i++) {
            const pt = q[i];
            const slotPos = slots[Math.min(i, slots.length - 1)];
            if (Math.hypot(pt.position.x - slotPos.x, pt.position.y - slotPos.y) <= 28) {
                q.splice(i, 1);
                pt.inSpecialistQueue = false;
                pt.isCalledByDoctor = true;
                pt.assignedDoctor = doctor;

                // Record wait time telemetry for this department
                if (pt.deptQueueEnterTime > 0) {
                    const waited = Math.max(0.5, this.simulationTime - pt.deptQueueEnterTime);
                    const secStat = this.stats.sections[deptId];
                    secStat.waitTimeSum += waited;
                    secStat.waitCount++;
                    secStat.avgWait = secStat.waitTimeSum / secStat.waitCount;
                }
                return pt;
            }
        }
        return null;
    }

    RecordDepartmentTreatment(deptId) {
        if (this.stats.sections[deptId]) {
            this.stats.sections[deptId].treated++;
        }
    }

    // Restroom Stalls
    FindBestRestroomStall(fromPos, npc) {
        let best = null;
        let bestDist = Infinity;
        for (let i = 0; i < this.allRestroomStalls.length; i++) {
            const st = this.allRestroomStalls[i];
            if (!st.occupant || st.occupant === npc) {
                const d = Math.hypot(st.pos.x - fromPos.x, st.pos.y - fromPos.y);
                if (d < bestDist) {
                    bestDist = d;
                    best = st;
                }
            }
        }
        return best;
    }

    ClaimNearestRestroomStall(npc) {
        if (npc.claimedRestroomStall && npc.claimedRestroomStall.occupant === npc) {
            return npc.claimedRestroomStall;
        }
        const best = this.FindBestRestroomStall(npc.position, npc);
        if (best) {
            best.occupant = npc;
            return best;
        }
        return null;
    }

    GetNearestRestroomWaitPos(fromPos) {
        let bestPos = this.layout.restrooms[0].waitPos;
        let bestDist = Infinity;
        for (let i = 0; i < this.layout.restrooms.length; i++) {
            const rr = this.layout.restrooms[i];
            const d = Math.hypot(rr.waitPos.x - fromPos.x, rr.waitPos.y - fromPos.y);
            if (d < bestDist) {
                bestDist = d;
                bestPos = rr.waitPos;
            }
        }
        return bestPos;
    }

    RecordRestroomUse(restroomId) {
        if (this.stats.restrooms[restroomId]) {
            this.stats.restrooms[restroomId].uses++;
        }
    }

    SpawnFloatingText(text, x, y, colorHex = '#38bdf8') {
        this.floatingTexts.push({
            text,
            x,
            y,
            color: Color.FromHex(colorHex),
            alpha: 1.0,
            life: 1.35
        });
    }

    // ------------------------------------------------------------------------
    // Interactive Top Toolbar & Controls
    // ------------------------------------------------------------------------
    BuildControlButtons() {
        this.buttons = [
            {
                key: KEY_1,
                x: 12, y: 10, w: 118, h: 32,
                getLabel: () => '[1] +Patient',
                colorHex: '#2dd4bf',
                onClick: () => {
                    const pt = this.SpawnPatient();
                    if (pt) {
                        this.selectedNPC = pt;
                        this.SpawnFloatingText(`+${pt.ailment.name}`, pt.position.x + 24, pt.position.y - 10, pt.ailment.colorHex);
                    }
                }
            },
            {
                key: KEY_2,
                x: 136, y: 10, w: 148, h: 32,
                getLabel: () => '[2] +Fracture (X-Ray)',
                colorHex: '#fb923c',
                onClick: () => {
                    const pt = this.SpawnPatient(PATIENT_AILMENTS[5]); // Radius Fracture
                    if (pt) {
                        this.selectedNPC = pt;
                        this.SpawnFloatingText('+Fracture (Needs X-Ray)', pt.position.x + 30, pt.position.y - 10, '#fb923c');
                    }
                }
            },
            {
                key: KEY_3,
                x: 290, y: 10, w: 158, h: 32,
                getLabel: () => '[3] Coffee Surge (+WC)',
                colorHex: '#eab308',
                onClick: () => {
                    const all = [...this.staffNPCs, ...this.patients];
                    for (let i = 0; i < all.length; i++) {
                        all[i].bladder = Math.min(98, all[i].bladder + 38);
                    }
                    this.SpawnFloatingText('☕ +38% Bladder to all NPCs!', 450, 340, '#facc15');
                }
            },
            {
                key: KEY_4,
                x: 454, y: 10, w: 146, h: 32,
                getLabel: () => {
                    const modes = ['Paused', 'Normal', 'Rush Hour'];
                    return `[4] Spawn: ${modes[this.autoSpawnMode]}`;
                },
                colorHex: '#38bdf8',
                onClick: () => {
                    this.autoSpawnMode = (this.autoSpawnMode + 1) % 3;
                }
            },
            {
                key: KEY_5,
                x: 606, y: 10, w: 118, h: 32,
                getLabel: () => '[5] Next NPC',
                colorHex: '#c084fc',
                onClick: () => this.CycleSelectedNPC()
            },
            {
                key: KEY_6,
                x: 730, y: 10, w: 106, h: 32,
                getLabel: () => `[6] Paths:${this.showAllPaths ? 'ON' : 'OFF'}`,
                colorHex: '#60a5fa',
                onClick: () => {
                    this.showAllPaths = !this.showAllPaths;
                    this.showNavGrid = this.showAllPaths;
                }
            },
            {
                key: KEY_R,
                x: 842, y: 10, w: 58, h: 32,
                getLabel: () => '[R] Rst',
                colorHex: '#f87171',
                onClick: () => this.Start()
            }
        ];
    }

    CycleSelectedNPC() {
        const all = [...this.staffNPCs, ...this.patients];
        if (all.length === 0)
            return;
        const idx = all.indexOf(this.selectedNPC);
        this.selectedNPC = all[(idx + 1) % all.length];
    }

    HandleInput() {
        for (let i = 0; i < this.buttons.length; i++) {
            if (Input.IsKeyDown(this.buttons[i].key)) {
                this.buttons[i].onClick();
            }
        }

        if (Input.IsMouseDown(0)) {
            const mx = Input.mouse.x;
            const my = Input.mouse.y;

            // Check top toolbar buttons
            for (let i = 0; i < this.buttons.length; i++) {
                const b = this.buttons[i];
                if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                    b.onClick();
                    return;
                }
            }

            // Check click on any NPC in the hospital to inspect their GOAP + FSM brain
            const allNPCs = [...this.staffNPCs, ...this.patients];
            let closest = null;
            let closestDist = 22;
            for (let i = 0; i < allNPCs.length; i++) {
                const npc = allNPCs[i];
                const d = Math.hypot(npc.position.x - mx, npc.position.y - my);
                if (d < closestDist) {
                    closestDist = d;
                    closest = npc;
                }
            }
            if (closest) {
                this.selectedNPC = closest;
            }
        }
    }

    // ------------------------------------------------------------------------
    // Main Simulation Update Loop
    // ------------------------------------------------------------------------
    Update(deltaTime) {
        const dt = Math.min(deltaTime, 0.05);
        super.Update(dt);

        this.simulationTime += dt;
        this.HandleInput();

        // Auto-spawn patients based on arrival mode
        if (this.autoSpawnMode > 0 && this.patients.length < this.maxActivePatients) {
            const interval = this.autoSpawnMode === 2 ? 2.4 : 4.8;
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.SpawnPatient();
                this.spawnTimer = interval;
            }
        }

        // Update Staff NPCs (Receptionist + 4 Specialist Doctors)
        for (let i = 0; i < this.staffNPCs.length; i++) {
            this.staffNPCs[i].Update(dt);
        }

        // Update Patient NPCs and remove discharged patients who exited the building
        for (let i = this.patients.length - 1; i >= 0; i--) {
            const pt = this.patients[i];
            pt.Update(dt);

            if (pt.discharged) {
                pt.ReleaseRestroomStall();
                this.LeaveAllQueues(pt);
                this.stats.totalDischarged++;
                this.patients.splice(i, 1);

                if (this.selectedNPC === pt) {
                    this.selectedNPC = this.patients[0] || this.doctors.orthopedics;
                }
            }
        }

        // Update floating text notifications
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 18 * dt;
            ft.life -= dt;
            ft.alpha = Math.max(0, ft.life / 1.35);
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    LeaveAllQueues(pt) {
        this.RemoveFromReceptionQueue(pt);
        this.RemoveFromXRayQueue(pt);
        const deptKeys = Object.keys(this.departmentQueues);
        for (let i = 0; i < deptKeys.length; i++) {
            this.RemoveFromDepartmentQueue(deptKeys[i], pt);
        }
    }

    // ------------------------------------------------------------------------
    // Main Render Method (100% Spark.js Renderer API — Canvas2D & WebGL Ready)
    // ------------------------------------------------------------------------
    Draw() {
        const r = this.renderer;

        // 1. Background & Hospital Floor
        r.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.FromHex('#070b14'));
        this.DrawTopToolbar(r);
        this.DrawHospitalBuilding(r);

        // 2. Draw all NPCs (Patients + Receptionist + Doctors)
        for (let i = 0; i < this.patients.length; i++) {
            this.patients[i].Draw(r);
        }
        for (let i = 0; i < this.staffNPCs.length; i++) {
            this.staffNPCs[i].Draw(r);
        }

        // 3. Floating event notifications
        for (let i = 0; i < this.floatingTexts.length; i++) {
            const ft = this.floatingTexts[i];
            r.DrawFillText(ft.text, ft.x, ft.y, 'bold 11px monospace', ft.color, 'center', 'alphabetic');
        }

        // 4. Right-Hand Sidebar: Hospital Telemetry + Live GOAP & FSM Inspector
        this.DrawRightSidebar(r);
    }

    DrawTopToolbar(r) {
        for (let i = 0; i < this.buttons.length; i++) {
            const b = this.buttons[i];
            const accent = Color.FromHex(b.colorHex);
            r.DrawFillBasicRoundRectangle(b.x, b.y, b.w, b.h, 5, new Color(0.09, 0.13, 0.22, 0.94));
            r.DrawStrokeBasicRoundRectangle(b.x, b.y, b.w, b.h, 5, accent, 1.4);
            r.DrawFillText(b.getLabel(), b.x + b.w / 2, b.y + 20, 'bold 10px monospace', accent, 'center', 'alphabetic');
        }
    }

    DrawHospitalBuilding(r) {
        // Outer hospital floorplate (x: 12..902, y: 52..704)
        r.DrawFillBasicRoundRectangle(12, 52, 890, 652, 8, Color.FromHex('#0f172a'));
        r.DrawStrokeBasicRoundRectangle(12, 52, 890, 652, 8, Color.FromHex('#334155'), 2);

        // Central Corridor & Lobby tiles
        r.DrawFillBasicRectangle(16, 296, 882, 120, Color.FromHex('#131c31'));
        r.DrawFillText('MAIN HOSPITAL CORRIDOR  (Click any Patient, Doctor, or Receptionist to inspect their GOAP + FSM)', 470, 360, 'bold 11px monospace', new Color(0.58, 0.64, 0.72, 0.45), 'center', 'alphabetic');

        // Entrance / Exit zone on far left of corridor
        r.DrawFillBasicRoundRectangle(16, 308, 66, 96, 4, new Color(0.13, 0.77, 0.37, 0.12));
        r.DrawStrokeBasicRoundRectangle(16, 308, 66, 96, 4, Color.FromHex('#22c55e'), 1.2);
        r.DrawFillText('🚑 ENTRY', 49, 342, 'bold 9px monospace', Color.FromHex('#4ade80'), 'center', 'alphabetic');
        r.DrawFillText('🚪 EXIT', 49, 376, 'bold 9px monospace', Color.FromHex('#86efac'), 'center', 'alphabetic');

        // 1. Reception & Triage Area
        const rec = this.layout.reception;
        r.DrawFillBasicRectangle(rec.rect.x, rec.rect.y, rec.rect.w, rec.rect.h, new Color(0.66, 0.33, 0.97, 0.08));
        r.DrawStrokeBasicRectangle(rec.rect.x, rec.rect.y, rec.rect.w, rec.rect.h, Color.FromHex('#9333ea'), 2);
        r.DrawFillText('🛎️ RECEPTION & TRIAGE', rec.rect.x + 10, rec.rect.y + 18, 'bold 11px monospace', Color.FromHex('#d8b4fe'), 'left', 'alphabetic');

        // Reception Desk
        r.DrawFillBasicRoundRectangle(rec.deskRect.x, rec.deskRect.y, rec.deskRect.w, rec.deskRect.h, 4, Color.FromHex('#3b0764'));
        r.DrawStrokeBasicRoundRectangle(rec.deskRect.x, rec.deskRect.y, rec.deskRect.w, rec.deskRect.h, 4, Color.FromHex('#c084fc'), 1.5);
        r.DrawFillText('TRIAGE DESK', rec.deskRect.x + rec.deskRect.w / 2, rec.deskRect.y + 21, 'bold 9px monospace', Color.FromHex('#f3e8ff'), 'center', 'alphabetic');

        // Reception Queue slots
        for (let i = 0; i < rec.queueSlots.length; i++) {
            const s = rec.queueSlots[i];
            r.DrawStrokeCircle(s.x, s.y, 8, new Color(0.75, 0.52, 0.98, 0.35), 1);
            r.DrawFillText(String(i + 1), s.x, s.y + 3, '8px monospace', new Color(0.75, 0.52, 0.98, 0.55), 'center', 'alphabetic');
        }

        // 2. X-Ray Diagnostic Room
        const xr = this.layout.xrayRoom;
        r.DrawFillBasicRectangle(xr.rect.x, xr.rect.y, xr.rect.w, xr.rect.h, new Color(0.02, 0.71, 0.83, 0.09));
        r.DrawStrokeBasicRectangle(xr.rect.x, xr.rect.y, xr.rect.w, xr.rect.h, Color.FromHex('#06b6d4'), 2);
        r.DrawFillText('☢️ X-RAY DIAGNOSTICS', xr.rect.x + 10, xr.rect.y + 18, 'bold 11px monospace', Color.FromHex('#67e8f9'), 'left', 'alphabetic');

        // X-Ray Scanner Bed
        const activeXRayPt = this.GetActiveXRayPatient();
        const scannerGlow = activeXRayPt && activeXRayPt.fsm.currentStateName === 'PerformingAction'
            ? Color.FromHex('#22d3ee')
            : Color.FromHex('#155e75');
        r.DrawFillBasicRoundRectangle(xr.scannerRect.x, xr.scannerRect.y, xr.scannerRect.w, xr.scannerRect.h, 5, Color.FromHex('#083344'));
        r.DrawStrokeBasicRoundRectangle(xr.scannerRect.x, xr.scannerRect.y, xr.scannerRect.w, xr.scannerRect.h, 5, scannerGlow, 2);
        r.DrawFillText('X-RAY SCANNER', xr.scannerRect.x + xr.scannerRect.w / 2, xr.scannerRect.y - 6, 'bold 9px monospace', Color.FromHex('#67e8f9'), 'center', 'alphabetic');

        for (let i = 0; i < xr.queueSlots.length; i++) {
            const s = xr.queueSlots[i];
            r.DrawStrokeCircle(s.x, s.y, 7, new Color(0.02, 0.71, 0.83, 0.4), 1);
        }

        // 3. Four Medical Departments (Waiting Room + Consultation Room + Exam Table + Record PC)
        const deptKeys = Object.keys(this.layout.departments);
        for (let i = 0; i < deptKeys.length; i++) {
            const key = deptKeys[i];
            const dLayout = this.layout.departments[key];
            const cfg = HOSPITAL_DEPARTMENTS[key];
            const doc = this.doctors[key];
            const isTop = dLayout.rect.y < 300;

            // Waiting Room half
            r.DrawFillBasicRectangle(dLayout.waitRect.x, dLayout.waitRect.y, dLayout.waitRect.w, dLayout.waitRect.h, cfg.bgTint);
            r.DrawStrokeBasicRectangle(dLayout.waitRect.x, dLayout.waitRect.y, dLayout.waitRect.w, dLayout.waitRect.h, cfg.borderCol, 1.8);

            // Consultation Room half
            r.DrawFillBasicRectangle(dLayout.consultRect.x, dLayout.consultRect.y, dLayout.consultRect.w, dLayout.consultRect.h, cfg.bgTint);
            r.DrawStrokeBasicRectangle(dLayout.consultRect.x, dLayout.consultRect.y, dLayout.consultRect.w, dLayout.consultRect.h, cfg.borderCol, 1.8);

            // Section Title Banner
            const headerY = isTop ? dLayout.rect.y + 18 : dLayout.rect.y + dLayout.rect.h - 10;
            r.DrawFillText(`${cfg.icon} ${cfg.shortName.toUpperCase()}`, dLayout.waitRect.x + 8, headerY, 'bold 10px monospace', Color.FromHex(cfg.accentHex), 'left', 'alphabetic');
            r.DrawFillText(`CONSULTATION (${cfg.doctorName})`, dLayout.consultRect.x + 8, headerY, 'bold 10px monospace', Color.FromHex(cfg.accentHex), 'left', 'alphabetic');

            // Waiting Room Queue Chairs
            r.DrawFillText('WAITING QUEUE', dLayout.waitRect.x + 58, isTop ? dLayout.waitRect.y + 68 : dLayout.waitRect.y + 78, '9px monospace', Color.FromHex('#94a3b8'), 'center', 'alphabetic');
            for (let c = 0; c < dLayout.queueSlots.length; c++) {
                const chair = dLayout.queueSlots[c];
                r.DrawFillBasicRoundRectangle(chair.x - 9, chair.y - 9, 18, 18, 3, new Color(0.12, 0.16, 0.24, 0.85));
                r.DrawStrokeBasicRoundRectangle(chair.x - 9, chair.y - 9, 18, 18, 3, cfg.borderCol, 1);
            }

            // Consultation Exam Bed
            const bed = dLayout.examBedRect;
            r.DrawFillBasicRoundRectangle(bed.x, bed.y, bed.w, bed.h, 4, Color.FromHex('#1e293b'));
            r.DrawStrokeBasicRoundRectangle(bed.x, bed.y, bed.w, bed.h, 4, Color.FromHex(cfg.accentHex), 1.5);
            r.DrawFillText('EXAM BED', bed.x + bed.w / 2, bed.y + 21, 'bold 8px monospace', Color.FromHex('#e2e8f0'), 'center', 'alphabetic');

            // Medical Record Computer Desk
            const pc = dLayout.pcDeskRect;
            const pcActive = doc && doc.isLoggingAtPC;
            r.DrawFillBasicRoundRectangle(pc.x, pc.y, pc.w, pc.h, 3, pcActive ? Color.FromHex('#0284c7') : Color.FromHex('#1e293b'));
            r.DrawStrokeBasicRoundRectangle(pc.x, pc.y, pc.w, pc.h, 3, pcActive ? Color.FromHex('#38bdf8') : Color.FromHex('#64748b'), 1.5);
            r.DrawFillText(pcActive ? '💻 SAVING...' : '💻 MED PC', pc.x + pc.w / 2, pc.y + 17, 'bold 8px monospace', pcActive ? Color.FromHex('#fef08a') : Color.FromHex('#cbd5e1'), 'center', 'alphabetic');

            // Carve visual doorway gaps in room borders
            const allDoors = [...dLayout.waitDoorways, ...dLayout.consultDoorways];
            for (let dw = 0; dw < allDoors.length; dw++) {
                const door = allDoors[dw];
                r.DrawFillBasicRectangle(door.x - door.w / 2, door.y - 4, door.w, 8, Color.FromHex('#131c31'));
            }
        }

        // 4. Distributed Restrooms (West, North-East, South-East)
        for (let i = 0; i < this.layout.restrooms.length; i++) {
            const rr = this.layout.restrooms[i];
            r.DrawFillBasicRectangle(rr.rect.x, rr.rect.y, rr.rect.w, rr.rect.h, new Color(0.22, 0.74, 0.97, 0.07));
            r.DrawStrokeBasicRectangle(rr.rect.x, rr.rect.y, rr.rect.w, rr.rect.h, Color.FromHex('#0284c7'), 1.8);
            r.DrawFillText('🚻 WC', rr.rect.x + rr.rect.w / 2, rr.rect.y + 16, 'bold 10px monospace', Color.FromHex('#7dd3fc'), 'center', 'alphabetic');

            for (let s = 0; s < rr.stalls.length; s++) {
                const st = rr.stalls[s];
                const occupied = Boolean(st.occupant);
                r.DrawFillBasicRoundRectangle(
                    st.rect.x, st.rect.y, st.rect.w, st.rect.h, 4,
                    occupied ? new Color(0.94, 0.27, 0.27, 0.22) : new Color(0.13, 0.77, 0.37, 0.14)
                );
                r.DrawStrokeBasicRoundRectangle(
                    st.rect.x, st.rect.y, st.rect.w, st.rect.h, 4,
                    occupied ? Color.FromHex('#ef4444') : Color.FromHex('#22c55e'), 1.2
                );
                r.DrawFillText(
                    occupied ? 'BUSY' : 'FREE',
                    st.rect.x + st.rect.w / 2,
                    st.rect.y + 13,
                    'bold 8px monospace',
                    occupied ? Color.FromHex('#fca5a5') : Color.FromHex('#86efac'),
                    'center',
                    'alphabetic'
                );
            }

            // Carve restroom doorway
            for (let dw = 0; dw < rr.doorways.length; dw++) {
                const door = rr.doorways[dw];
                r.DrawFillBasicRectangle(door.x - door.w / 2, door.y - 4, door.w, 8, Color.FromHex('#131c31'));
            }
        }

        // Carve Reception & X-Ray doorways
        r.DrawFillBasicRectangle(148 - 28, 296 - 4, 56, 8, Color.FromHex('#131c31'));
        r.DrawFillBasicRectangle(164 - 28, 416 - 4, 56, 8, Color.FromHex('#131c31'));

        // Optional A* Navigation Grid overlay
        if (this.showNavGrid) {
            for (let row = 0; row < this.navGrid.height; row++) {
                for (let col = 0; col < this.navGrid.width; col++) {
                    if (!this.navGrid.walkable[row][col]) {
                        const wx = this.navGrid.originX + col * this.navGrid.cellSize;
                        const wy = this.navGrid.originY + row * this.navGrid.cellSize;
                        r.DrawFillBasicRectangle(wx + 1, wy + 1, this.navGrid.cellSize - 2, this.navGrid.cellSize - 2, new Color(0.94, 0.27, 0.27, 0.18));
                    }
                }
            }
        }
    }

    // ------------------------------------------------------------------------
    // Right-Hand Sidebar: Hospital State Telemetry + Live GOAP & FSM Inspector
    // ------------------------------------------------------------------------
    DrawRightSidebar(r) {
        const panelX = 910;
        const panelW = 360;

        // ── Panel 1: Hospital State & Live Telemetry (y: 10..248) ─────────
        const statH = 236;
        r.DrawFillBasicRoundRectangle(panelX, 10, panelW, statH, 6, new Color(0.05, 0.07, 0.12, 0.94));
        r.DrawStrokeBasicRoundRectangle(panelX, 10, panelW, statH, 6, new Color(0.22, 0.74, 0.97, 0.45), 1.5);

        r.DrawFillBasicRoundRectangle(panelX + 1, 11, panelW - 2, 26, [6, 6, 0, 0], new Color(0.12, 0.16, 0.23, 0.96));
        r.DrawFillText('🏥 HOSPITAL STATE & TELEMETRY', panelX + 10, 28, 'bold 12px monospace', Color.FromHex('#38bdf8'), 'left', 'alphabetic');

        // Global summary counters
        r.DrawFillText(
            `Active Pts: ${this.patients.length}/${this.maxActivePatients} | Triaged: ${this.stats.totalTriaged} | X-Rays: ${this.stats.totalXRayScans} | Discharged: ${this.stats.totalDischarged}`,
            panelX + 10, 50, '10px monospace', Color.FromHex('#cbd5e1'), 'left', 'alphabetic'
        );
        r.DrawFillText(
            `Reception Queue: ${this.receptionQueue.length} waiting | X-Ray Queue: ${this.xrayQueue.length} waiting`,
            panelX + 10, 65, '10px monospace', Color.FromHex('#94a3b8'), 'left', 'alphabetic'
        );

        // Department Telemetry Table
        r.DrawFillText('SECTION          QUEUE   TREATED   AVG WAIT   DOCTOR STATUS', panelX + 10, 84, 'bold 9px monospace', Color.FromHex('#64748b'), 'left', 'alphabetic');

        const deptKeys = Object.keys(HOSPITAL_DEPARTMENTS);
        let rowY = 90;
        for (let i = 0; i < deptKeys.length; i++) {
            const key = deptKeys[i];
            const cfg = HOSPITAL_DEPARTMENTS[key];
            const secStat = this.stats.sections[key];
            const qLen = this.departmentQueues[key].length;
            const doc = this.doctors[key];
            const docAction = doc && doc.goap && doc.goap.GetCurrentAction()
                ? doc.goap.GetCurrentAction().name.replace('TreatPatientAilment', 'Treating').replace('LogMedicalRecordAtPC', 'Logging PC').replace('CallNextPatientFromQueue', 'Calling Pt').replace('UseNearestRestroom', 'In Restroom').slice(0, 12)
                : 'Standby';

            r.DrawFillBasicRoundRectangle(panelX + 8, rowY, panelW - 16, 20, 3, new Color(0.11, 0.15, 0.23, 0.7));
            r.DrawFillText(`${cfg.icon} ${cfg.shortName}`, panelX + 12, rowY + 14, 'bold 10px monospace', Color.FromHex(cfg.accentHex), 'left', 'alphabetic');
            r.DrawFillText(`${qLen}`, panelX + 124, rowY + 14, 'bold 10px monospace', qLen > 0 ? Color.FromHex('#facc15') : Color.FromHex('#94a3b8'), 'center', 'alphabetic');
            r.DrawFillText(`${secStat.treated}`, panelX + 174, rowY + 14, 'bold 10px monospace', Color.FromHex('#4ade80'), 'center', 'alphabetic');
            r.DrawFillText(secStat.waitCount > 0 ? `${secStat.avgWait.toFixed(1)}s` : '—', panelX + 230, rowY + 14, '10px monospace', Color.FromHex('#e2e8f0'), 'center', 'alphabetic');
            r.DrawFillText(docAction, panelX + panelW - 12, rowY + 14, '9px monospace', Color.FromHex('#cbd5e1'), 'right', 'alphabetic');
            rowY += 23;
        }

        // Restroom Usage Telemetry Bar
        rowY += 6;
        r.DrawFillText('🚻 RESTROOM USAGE FREQUENCY:', panelX + 10, rowY + 8, 'bold 9px monospace', Color.FromHex('#7dd3fc'), 'left', 'alphabetic');
        rowY += 13;

        const rrKeys = ['west', 'north', 'south'];
        const cellW = (panelW - 28) / 3;
        for (let i = 0; i < rrKeys.length; i++) {
            const rk = rrKeys[i];
            const rStat = this.stats.restrooms[rk];
            const rrLayout = this.layout.restrooms[i];
            const busyCount = rrLayout.stalls.filter(s => Boolean(s.occupant)).length;
            const bx = panelX + 8 + i * (cellW + 6);

            r.DrawFillBasicRoundRectangle(bx, rowY, cellW, 32, 4, new Color(0.09, 0.14, 0.22, 0.85));
            r.DrawStrokeBasicRoundRectangle(bx, rowY, cellW, 32, 4, busyCount > 0 ? Color.FromHex('#38bdf8') : Color.FromHex('#334155'), 1);
            r.DrawFillText(rStat.name, bx + cellW / 2, rowY + 13, 'bold 9px monospace', Color.FromHex('#e2e8f0'), 'center', 'alphabetic');
            r.DrawFillText(`Uses: ${rStat.uses} (${busyCount}/2 busy)`, bx + cellW / 2, rowY + 26, '9px monospace', Color.FromHex('#38bdf8'), 'center', 'alphabetic');
        }

        // ── Panel 2: Live GOAP & FSM Inspector for Selected NPC (y: 254..) ──
        const npc = this.selectedNPC;
        if (npc && npc.goap) {
            const roleDetail = npc.role === 'Patient'
                ? `Patient (${npc.ailment.name})`
                : npc.role === 'Doctor'
                    ? `Specialist (${HOSPITAL_DEPARTMENTS[npc.department].shortName})`
                    : 'Reception Triage Staff';

            const subtitle = `${roleDetail} | FSM: ${npc.fsm.currentStateName} | Bladder: ${Math.round(npc.bladder)}%`;

            npc.goap.DrawGOAPInspector(r, panelX, 254, {
                width: panelW,
                title: `${npc.name} — GOAP Inspector`,
                subtitle: subtitle,
                compact: true,
                showWorldState: true,
                showGoals: true,
                showPlan: true
            });
        }
    }
}

window.onload = () => {
    Init(GOAPHospitalScene);
};
