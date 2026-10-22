// ============================================================================
// spark.js — GOAP Demo 4: Specialized Hospital GOAP Agents
//   - ReceptionistNPC (Triage intake + Restroom preemption)
//   - DoctorNPC (Call patient -> Treat -> Log medical record at PC + Restroom)
//   - PatientNPC (5- or 6-step causal workflow including X-Ray sub-workflow)
// ============================================================================

// ============================================================================
// 1. RECEPTION STAFF NPC (Triage Intake + Restroom Preemption)
// ============================================================================

class ReceptionistNPC extends HospitalNPC {
    constructor(position, scene) {
        super(position, scene, {
            name: 'Recep. Elena',
            role: 'Receptionist',
            colorHex: '#a855f7',
            outlineHex: '#3b0764',
            moveSpeed: 120,
            initialBladder: 22,
            bladderRate: 1.6,
            bladderUrgentThreshold: 75
        });

        this.deskPos = new Vector2(position.x, position.y);
        this.activeTriagePatient = null;
        this.goap = this.BuildGOAP();
    }

    BuildGOAP() {
        const agent = new GOAPAgent(this, {
            initialState: {
                atReceptionPost: true,
                hasPatientWaitingAtDesk: false,
                patientTriagedCycle: false,
                bladderRelieved: true
            },
            onUpdateSensors: (rec, ws) => {
                const distToDesk = Math.hypot(rec.position.x - rec.deskPos.x, rec.position.y - rec.deskPos.y);
                const headPatient = rec.scene.GetHeadReceptionPatient();
                const urgentBladder = rec.bladder >= rec.bladderUrgentThreshold && !rec.inCriticalLock;

                ws.Set('atReceptionPost', distToDesk <= 10 && !rec.claimedRestroomStall);
                ws.Set('hasPatientWaitingAtDesk', Boolean(headPatient));
                ws.Set('patientTriagedCycle', false);
                ws.Set('bladderRelieved', !urgentBladder);
            }
        });

        // Goals
        agent.AddGoals([
            new GOAPGoal('RelieveBladder', { bladderRelieved: true }, (rec, ws) => {
                return ws.Get('bladderRelieved') ? 0 : 95;
            }),
            new GOAPGoal('TriageWaitingPatients', { patientTriagedCycle: true }, (rec, ws) => {
                return ws.Get('hasPatientWaitingAtDesk') ? 80 : 0;
            }),
            new GOAPGoal('ManReceptionDesk', { atReceptionPost: true }, 35)
        ]);

        // Actions
        const returnToDesk = new GOAPAction('ReturnToReceptionDesk', {
            cost: 2,
            preconditions: { atReceptionPost: false },
            effects: { atReceptionPost: true },
            onUpdate: (dt, rec) => {
                rec.statusBubble = 'Walking to reception desk...';
                rec.activityIcon = '🛎️';
                if (rec.NavigateTo(rec.deskPos, 'Waiting', 6)) {
                    rec.statusBubble = 'Ready at reception desk';
                    rec.activityIcon = '';
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            }
        });

        const triagePatient = new GOAPAction('PerformPatientTriage', {
            cost: 1,
            preconditions: { atReceptionPost: true, hasPatientWaitingAtDesk: true },
            effects: { patientTriagedCycle: true },
            proceduralPrecondition: (rec) => Boolean(rec.scene.GetHeadReceptionPatient()),
            onEnter: (rec) => {
                rec.activeTriagePatient = rec.scene.GetHeadReceptionPatient();
                rec.inCriticalLock = true;
                rec.StartTimedAction(1.25, '📋');
            },
            onUpdate: (dt, rec) => {
                const pt = rec.activeTriagePatient || rec.scene.GetHeadReceptionPatient();
                if (!pt || pt.isTriaged) {
                    rec.inCriticalLock = false;
                    return GOAPStatus.FAILURE;
                }
                rec.activeTriagePatient = pt;
                rec.statusBubble = `Triaging ${pt.name} (${pt.ailment.name})...`;

                if (rec.fsm.currentStateName !== 'PerformingAction') {
                    rec.StartTimedAction(1.25, '📋');
                }

                if (rec.actionTimer >= rec.actionDuration) {
                    // Complete triage and direct patient to X-Ray or Specialist waiting room
                    pt.CompleteTriage();
                    rec.scene.RemoveFromReceptionQueue(pt);
                    rec.scene.stats.totalTriaged++;

                    const routeLabel = pt.ailment.needsXRay
                        ? `X-Ray → ${HOSPITAL_DEPARTMENTS[pt.ailment.department].shortName}`
                        : HOSPITAL_DEPARTMENTS[pt.ailment.department].shortName;
                    rec.scene.SpawnFloatingText(`📋 → ${routeLabel}`, rec.position.x, rec.position.y - 22, '#c084fc');

                    rec.activeTriagePatient = null;
                    rec.inCriticalLock = false;
                    rec.fsm.Transition('Waiting');
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            },
            onExit: (rec) => {
                rec.inCriticalLock = false;
                rec.activeTriagePatient = null;
                rec.activityIcon = '';
            }
        });

        agent.AddActions([
            this.CreateUseRestroomAction(),
            returnToDesk,
            triagePatient
        ]);

        return agent;
    }
}

// ============================================================================
// 2. DOCTOR NPC (Call Patient -> Treat Ailment -> Log Record at PC + Restroom)
// ============================================================================

class DoctorNPC extends HospitalNPC {
    constructor(position, scene, deptConfig, roomLayout) {
        super(position, scene, {
            name: deptConfig.doctorName,
            role: 'Doctor',
            roleBadge: deptConfig.icon,
            colorHex: deptConfig.accentHex,
            outlineHex: '#0f172a',
            moveSpeed: 122,
            initialBladder: 18 + Math.random() * 30,
            bladderRate: 1.45 + Math.random() * 0.5,
            bladderUrgentThreshold: 78
        });

        this.department = deptConfig.id;
        this.deptConfig = deptConfig;
        this.roomLayout = roomLayout;

        // Workflow state
        this.currentPatient = null;
        this.hasUnrecordedRecord = false;
        this.lastTreatedPatientName = '';
        this.isLoggingAtPC = false;

        this.goap = this.BuildGOAP();
    }

    BuildGOAP() {
        const agent = new GOAPAgent(this, {
            initialState: {
                atConsultChair: true,
                atComputerDesk: false,
                hasWaitingPatient: false,
                hasActivePatient: false,
                patientAtExamSpot: false,
                hasUnrecordedRecord: false,
                patientTreatedCycle: false,
                bladderRelieved: true
            },
            onUpdateSensors: (doc, ws) => {
                const distChair = Math.hypot(doc.position.x - doc.roomLayout.doctorExamPos.x, doc.position.y - doc.roomLayout.doctorExamPos.y);
                const distPC = Math.hypot(doc.position.x - doc.roomLayout.doctorPCPos.x, doc.position.y - doc.roomLayout.doctorPCPos.y);
                const waitingCount = doc.scene.GetDepartmentReadyQueueCount(doc.department);

                // Validate currentPatient is still active
                if (doc.currentPatient && (doc.currentPatient.isTreated || doc.currentPatient.discharged)) {
                    doc.currentPatient = null;
                }

                const ptAtExam = Boolean(
                    doc.currentPatient &&
                    Math.hypot(doc.currentPatient.position.x - doc.roomLayout.patientExamPos.x, doc.currentPatient.position.y - doc.roomLayout.patientExamPos.y) <= 16
                );

                const urgentBladder = doc.bladder >= doc.bladderUrgentThreshold && !doc.inCriticalLock && !doc.currentPatient;

                ws.Set('atConsultChair', distChair <= 10);
                ws.Set('atComputerDesk', distPC <= 10);
                ws.Set('hasWaitingPatient', waitingCount > 0 || Boolean(doc.currentPatient));
                ws.Set('hasActivePatient', Boolean(doc.currentPatient));
                ws.Set('patientAtExamSpot', ptAtExam);
                ws.Set('hasUnrecordedRecord', doc.hasUnrecordedRecord);
                ws.Set('patientTreatedCycle', false);
                ws.Set('bladderRelieved', !urgentBladder);
            }
        });

        // Goals:
        // 1. RelieveBladder (95)
        // 2. LogMedicalRecord (90) — Immediately after discharging a patient, log data at PC!
        // 3. TreatSectionPatient (75) — Call & treat next waiting patient in specialty section
        // 4. StandbyInConsultRoom (25) — Wait at consultation station when idle
        agent.AddGoals([
            new GOAPGoal('RelieveBladder', { bladderRelieved: true }, (doc, ws) => {
                return ws.Get('bladderRelieved') ? 0 : 95;
            }),
            new GOAPGoal('LogMedicalRecord', { hasUnrecordedRecord: false }, (doc, ws) => {
                return ws.Get('hasUnrecordedRecord') ? 90 : 0;
            }),
            new GOAPGoal('TreatSectionPatient', { patientTreatedCycle: true }, (doc, ws) => {
                return (!ws.Get('hasUnrecordedRecord') && ws.Get('hasWaitingPatient')) ? 75 : 0;
            }),
            new GOAPGoal('StandbyInConsultRoom', { atConsultChair: true }, 25)
        ]);

        // Actions:
        // 1. MoveToConsultStation
        const moveToConsultChair = new GOAPAction('MoveToConsultStation', {
            cost: 1.5,
            preconditions: { atConsultChair: false },
            effects: { atConsultChair: true, atComputerDesk: false },
            onUpdate: (dt, doc) => {
                doc.statusBubble = 'Moving to exam station...';
                doc.activityIcon = doc.deptConfig.icon;
                if (doc.NavigateTo(doc.roomLayout.doctorExamPos, 'Waiting', 6)) {
                    doc.statusBubble = 'Ready at consultation station';
                    doc.activityIcon = '';
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            }
        });

        // 2. CallNextPatientFromQueue
        const callNextPatient = new GOAPAction('CallNextPatientFromQueue', {
            cost: 1.5,
            preconditions: {
                atConsultChair: true,
                hasWaitingPatient: true,
                hasActivePatient: false,
                hasUnrecordedRecord: false
            },
            effects: { hasActivePatient: true },
            proceduralPrecondition: (doc) => doc.scene.GetDepartmentReadyQueueCount(doc.department) > 0,
            onEnter: (doc) => {
                doc.StartTimedAction(0.55, '📢');
            },
            onUpdate: (dt, doc) => {
                doc.statusBubble = 'Calling next patient...';
                if (doc.actionTimer >= doc.actionDuration) {
                    const pt = doc.scene.PopNextDepartmentPatient(doc.department, doc);
                    if (!pt) {
                        return GOAPStatus.FAILURE;
                    }
                    doc.currentPatient = pt;
                    doc.scene.SpawnFloatingText(`📢 Calling ${pt.name}`, doc.position.x, doc.position.y - 22, doc.deptConfig.accentHex);
                    doc.fsm.Transition('Waiting');
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            }
        });

        // 3. AwaitPatientEntry (waits while called patient walks from waiting room chair to exam table)
        const awaitPatientEntry = new GOAPAction('AwaitPatientInConsultRoom', {
            cost: 1.5,
            preconditions: {
                atConsultChair: true,
                hasActivePatient: true,
                patientAtExamSpot: false
            },
            effects: { patientAtExamSpot: true },
            onUpdate: (dt, doc) => {
                if (!doc.currentPatient || doc.currentPatient.discharged) {
                    doc.currentPatient = null;
                    return GOAPStatus.FAILURE;
                }
                doc.statusBubble = `Waiting for ${doc.currentPatient.name} to enter...`;
                doc.activityIcon = '⏳';
                const dist = Math.hypot(
                    doc.currentPatient.position.x - doc.roomLayout.patientExamPos.x,
                    doc.currentPatient.position.y - doc.roomLayout.patientExamPos.y
                );
                if (dist <= 16) {
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            }
        });

        // 4. TreatPatientAilment (Consult duration depends on the patient's specific ailment)
        const treatPatient = new GOAPAction('TreatPatientAilment', {
            cost: 2.0,
            preconditions: {
                atConsultChair: true,
                hasActivePatient: true,
                patientAtExamSpot: true
            },
            effects: {
                patientTreatedCycle: true,
                hasUnrecordedRecord: true
            },
            onEnter: (doc) => {
                const dur = doc.currentPatient ? doc.currentPatient.ailment.treatmentDuration : 2.8;
                doc.inCriticalLock = true;
                doc.StartTimedAction(dur, doc.deptConfig.icon);
                if (doc.currentPatient) {
                    doc.currentPatient.inCriticalLock = true;
                    doc.currentPatient.StartTimedAction(dur, '💊');
                }
            },
            onUpdate: (dt, doc) => {
                const pt = doc.currentPatient;
                if (!pt) {
                    doc.inCriticalLock = false;
                    return GOAPStatus.FAILURE;
                }

                doc.statusBubble = `Treating ${pt.name} (${pt.ailment.name})...`;
                if (doc.fsm.currentStateName !== 'PerformingAction') {
                    doc.StartTimedAction(pt.ailment.treatmentDuration, doc.deptConfig.icon);
                }

                if (doc.actionTimer >= doc.actionDuration) {
                    // Discharge patient!
                    doc.lastTreatedPatientName = pt.name;
                    pt.CompleteTreatment();
                    doc.currentPatient = null;
                    doc.hasUnrecordedRecord = true;
                    doc.inCriticalLock = false;

                    doc.scene.SpawnFloatingText('✔ Discharged!', doc.position.x, doc.position.y - 22, '#4ade80');
                    doc.fsm.Transition('Waiting');
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            },
            onExit: (doc) => {
                doc.inCriticalLock = false;
                doc.activityIcon = '';
            }
        });

        // 5. SitAtMedicalComputer (moves to the consultation room's PC desk)
        const moveToPC = new GOAPAction('SitAtMedicalComputer', {
            cost: 1.5,
            preconditions: { atComputerDesk: false, hasUnrecordedRecord: true },
            effects: { atComputerDesk: true, atConsultChair: false },
            onUpdate: (dt, doc) => {
                doc.statusBubble = 'Walking to Medical Record PC...';
                doc.activityIcon = '💻';
                if (doc.NavigateTo(doc.roomLayout.doctorPCPos, 'Waiting', 6)) {
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            }
        });

        // 6. LogMedicalRecordAtPC (spends a few seconds entering patient data at the computer)
        const logMedicalRecord = new GOAPAction('LogMedicalRecordAtPC', {
            cost: 1.5,
            preconditions: { atComputerDesk: true, hasUnrecordedRecord: true },
            effects: { hasUnrecordedRecord: false },
            onEnter: (doc) => {
                doc.isLoggingAtPC = true;
                doc.inCriticalLock = true;
                doc.StartTimedAction(2.1, '⌨️');
            },
            onUpdate: (dt, doc) => {
                doc.isLoggingAtPC = true;
                doc.statusBubble = `Logging ${doc.lastTreatedPatientName || 'patient'} record at PC...`;
                if (doc.fsm.currentStateName !== 'PerformingAction') {
                    doc.StartTimedAction(2.1, '⌨️');
                }
                if (doc.actionTimer >= doc.actionDuration) {
                    doc.hasUnrecordedRecord = false;
                    doc.isLoggingAtPC = false;
                    doc.inCriticalLock = false;
                    doc.scene.RecordDepartmentTreatment(doc.department);
                    doc.scene.SpawnFloatingText('💾 Record Saved', doc.position.x, doc.position.y - 22, '#38bdf8');
                    doc.fsm.Transition('Waiting');
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            },
            onExit: (doc) => {
                doc.isLoggingAtPC = false;
                doc.inCriticalLock = false;
                doc.activityIcon = '';
            }
        });

        agent.AddActions([
            this.CreateUseRestroomAction(),
            moveToConsultChair,
            callNextPatient,
            awaitPatientEntry,
            treatPatient,
            moveToPC,
            logMedicalRecord
        ]);

        return agent;
    }
}

// ============================================================================
// 3. PATIENT NPC (Multi-Step A* GOAP Workflow + X-Ray Sub-Workflow + Restroom)
// ============================================================================

class PatientNPC extends HospitalNPC {
    constructor(position, scene, ailment, indexId) {
        const patientName = `${PATIENT_NAMES[indexId % PATIENT_NAMES.length]} #${indexId}`;
        super(position, scene, {
            id: indexId,
            name: patientName,
            role: 'Patient',
            colorHex: ailment.colorHex,
            outlineHex: '#0f172a',
            moveSpeed: 108 + (indexId % 5) * 4,
            initialBladder: 20 + Math.random() * 42,
            bladderRate: 1.7 + Math.random() * 1.3,
            bladderUrgentThreshold: 75
        });

        this.ailment = ailment;
        this.targetDepartment = ailment.department;

        // Causal workflow flags tracked by GOAP sensors
        this.inReceptionQueue = false;
        this.isTriaged = false;
        this.xrayComplete = !ailment.needsXRay;
        this.inSpecialistQueue = false;
        this.isCalledByDoctor = false;
        this.assignedDoctor = null;
        this.isTreated = false;
        this.hasLeftHospital = false;
        this.discharged = false;

        // Wait-time telemetry tracking
        this.spawnTime = scene.simulationTime;
        this.deptQueueEnterTime = 0;

        this.goap = this.BuildGOAP();
    }

    LeaveCurrentQueue() {
        if (this.inReceptionQueue) {
            this.scene.RemoveFromReceptionQueue(this);
            this.inReceptionQueue = false;
        }
        if (this.inSpecialistQueue && !this.isCalledByDoctor) {
            this.scene.RemoveFromDepartmentQueue(this.targetDepartment, this);
            this.inSpecialistQueue = false;
        }
    }

    CompleteTriage() {
        this.isTriaged = true;
        this.inReceptionQueue = false;
    }

    CompleteTreatment() {
        this.isTreated = true;
        this.inCriticalLock = false;
    }

    BuildGOAP() {
        const agent = new GOAPAgent(this, {
            initialState: {
                inReceptionQueue: false,
                isTriaged: false,
                xrayComplete: !this.ailment.needsXRay,
                isCalledByDoctor: false,
                isTreated: false,
                hasLeftHospital: false,
                bladderRelieved: true
            },
            onUpdateSensors: (pt, ws) => {
                const urgentBladder = pt.bladder >= pt.bladderUrgentThreshold &&
                    !pt.inCriticalLock &&
                    !pt.isCalledByDoctor &&
                    !pt.isTreated;

                ws.Set('inReceptionQueue', pt.inReceptionQueue);
                ws.Set('isTriaged', pt.isTriaged);
                ws.Set('xrayComplete', pt.xrayComplete);
                ws.Set('isCalledByDoctor', pt.isCalledByDoctor);
                ws.Set('isTreated', pt.isTreated);
                ws.Set('hasLeftHospital', pt.hasLeftHospital);
                ws.Set('bladderRelieved', !urgentBladder);
            }
        });

        // Goals:
        // 1. RelieveBladder (95) — Preempts waiting/walking when bladder >= 75%!
        // 2. RecoverAndLeaveHospital (70) — Synthesizes the full 5- or 6-step hospital workflow!
        agent.AddGoals([
            new GOAPGoal('RelieveBladder', { bladderRelieved: true }, (pt, ws) => {
                return ws.Get('bladderRelieved') ? 0 : 95;
            }),
            new GOAPGoal('RecoverAndLeaveHospital', { hasLeftHospital: true }, 70)
        ]);

        // Actions:
        // Step 1: JoinReceptionQueue
        const joinReceptionQueue = new GOAPAction('JoinReceptionQueue', {
            cost: 1.5,
            preconditions: { isTriaged: false, inReceptionQueue: false },
            effects: { inReceptionQueue: true },
            onEnter: (pt) => {
                pt.scene.AddToReceptionQueue(pt);
                pt.inReceptionQueue = true;
            },
            onUpdate: (dt, pt) => {
                const slotPos = pt.scene.GetReceptionSlotPosition(pt);
                pt.statusBubble = 'Joining reception queue...';
                pt.activityIcon = '🎫';
                if (pt.NavigateTo(slotPos, 'Waiting', 7)) {
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            }
        });

        // Step 2: GetTriagedAtReception
        const getTriaged = new GOAPAction('GetTriagedAtReception', {
            cost: 2.0,
            preconditions: { inReceptionQueue: true, isTriaged: false },
            effects: { isTriaged: true },
            onUpdate: (dt, pt) => {
                if (pt.isTriaged) {
                    return GOAPStatus.SUCCESS;
                }
                if (!pt.inReceptionQueue) {
                    pt.scene.AddToReceptionQueue(pt);
                    pt.inReceptionQueue = true;
                }
                const slotPos = pt.scene.GetReceptionSlotPosition(pt);
                const idx = pt.scene.receptionQueue.indexOf(pt);
                pt.statusBubble = idx === 0
                    ? 'At Reception Desk (Triage)...'
                    : `In Reception Queue (#${idx + 1})...`;
                pt.activityIcon = idx === 0 ? '📋' : '⏳';
                pt.NavigateTo(slotPos, 'Waiting', 7);
                return GOAPStatus.RUNNING;
            }
        });

        // Step 3 (Conditional on ailment.needsXRay): UndergoXRayScan
        const undergoXRay = new GOAPAction('UndergoXRayScan', {
            cost: 2.5,
            preconditions: { isTriaged: true, xrayComplete: false },
            effects: { xrayComplete: true },
            onEnter: (pt) => {
                pt.scene.AddToXRayQueue(pt);
                pt.actionTimer = 0;
                pt.actionDuration = 2.4;
                pt.actionProgress = 0;
            },
            onUpdate: (dt, pt) => {
                const isActiveScanner = pt.scene.GetActiveXRayPatient() === pt;
                if (isActiveScanner) {
                    const scannerPos = pt.scene.layout.xrayRoom.scannerPos;
                    pt.statusBubble = 'Moving onto X-Ray Scanner...';
                    pt.activityIcon = '☢️';
                    if (pt.NavigateTo(scannerPos, 'PerformingAction', 6)) {
                        pt.inCriticalLock = true;
                        pt.actionDuration = 2.4;
                        pt.statusBubble = `Undergoing X-Ray (${pt.ailment.name})...`;
                        if (pt.actionTimer >= pt.actionDuration) {
                            pt.xrayComplete = true;
                            pt.inCriticalLock = false;
                            pt.scene.CompleteXRayForPatient(pt);
                            pt.scene.SpawnFloatingText('☢️ X-Ray Done!', pt.position.x, pt.position.y - 22, '#38bdf8');
                            pt.fsm.Transition('Waiting');
                            return GOAPStatus.SUCCESS;
                        }
                    }
                }
                else {
                    const waitSlot = pt.scene.GetXRaySlotPosition(pt);
                    pt.statusBubble = 'Waiting for X-Ray Scanner...';
                    pt.activityIcon = '☢️';
                    pt.NavigateTo(waitSlot, 'Waiting', 7);
                }
                return GOAPStatus.RUNNING;
            },
            onExit: (pt) => {
                pt.inCriticalLock = false;
                pt.scene.RemoveFromXRayQueue(pt);
            }
        });

        // Step 4: WaitInSpecialistQueue
        const waitInSpecialistQueue = new GOAPAction('WaitInSpecialistQueue', {
            cost: 2.0,
            preconditions: { isTriaged: true, xrayComplete: true, isCalledByDoctor: false },
            effects: { isCalledByDoctor: true },
            onEnter: (pt) => {
                pt.scene.AddToDepartmentQueue(pt.targetDepartment, pt);
                pt.inSpecialistQueue = true;
                if (pt.deptQueueEnterTime === 0) {
                    pt.deptQueueEnterTime = pt.scene.simulationTime;
                }
            },
            onUpdate: (dt, pt) => {
                if (pt.isCalledByDoctor) {
                    return GOAPStatus.SUCCESS;
                }
                if (!pt.inSpecialistQueue) {
                    pt.scene.AddToDepartmentQueue(pt.targetDepartment, pt);
                    pt.inSpecialistQueue = true;
                }
                const chairPos = pt.scene.GetDepartmentQueueSlotPosition(pt.targetDepartment, pt);
                const deptName = HOSPITAL_DEPARTMENTS[pt.targetDepartment].shortName;
                pt.statusBubble = `Waiting for ${deptName} Doctor...`;
                pt.activityIcon = HOSPITAL_DEPARTMENTS[pt.targetDepartment].icon;
                pt.NavigateTo(chairPos, 'Waiting', 7);
                return GOAPStatus.RUNNING;
            }
        });

        // Step 5: UndergoMedicalConsultation
        const undergoConsultation = new GOAPAction('UndergoMedicalConsultation', {
            cost: 2.0,
            preconditions: { isCalledByDoctor: true, isTreated: false },
            effects: { isTreated: true },
            onUpdate: (dt, pt) => {
                if (pt.isTreated) {
                    return GOAPStatus.SUCCESS;
                }
                const room = pt.scene.layout.departments[pt.targetDepartment];
                pt.statusBubble = `In ${HOSPITAL_DEPARTMENTS[pt.targetDepartment].shortName} Consultation...`;
                pt.activityIcon = '💊';
                pt.NavigateTo(room.patientExamPos, 'PerformingAction', 7);
                return GOAPStatus.RUNNING;
            }
        });

        // Step 6: LeaveHospitalBuilding
        const leaveHospital = new GOAPAction('LeaveHospitalBuilding', {
            cost: 1.0,
            preconditions: { isTreated: true, hasLeftHospital: false },
            effects: { hasLeftHospital: true },
            onUpdate: (dt, pt) => {
                pt.statusBubble = 'Cured! Leaving hospital...';
                pt.activityIcon = '💚';
                if (pt.NavigateTo(pt.scene.layout.exitPos, 'Waiting', 12)) {
                    pt.hasLeftHospital = true;
                    pt.discharged = true;
                    return GOAPStatus.SUCCESS;
                }
                return GOAPStatus.RUNNING;
            }
        });

        agent.AddActions([
            this.CreateUseRestroomAction(),
            joinReceptionQueue,
            getTriaged,
            undergoXRay,
            waitInSpecialistQueue,
            undergoConsultation,
            leaveHospital
        ]);

        return agent;
    }
}

