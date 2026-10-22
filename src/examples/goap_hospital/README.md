# GOAP Demo 4 — Autonomous Hospital Simulation

A multi-agent simulation combining **Goal-Oriented Action Planning (`src/engine/goap.js`)**, **Finite State Machines (`src/engine/fsm.js`)**, and **A\* Pathfinding (`src/engine/ai.js`)** to run a bustling, self-organizing hospital with Receptionists, Specialist Doctors, and Patients.

**Live Demo:** [goap-hospital.html](../../../goap-hospital.html)

---

## 🎯 Pedagogical Objectives

1. **Three-Tier Game AI Architecture (`GOAP` + `FSM` + `A*`)**:
   Demonstrates Jeff Orkin's canonical *F.E.A.R.* architecture in a simulation/tycoon setting (reminiscent of *Theme Hospital* / *Two Point Hospital*):
   - **High-Level Strategic Layer (`GOAPAgent` & `GOAPPlanner`)**: Synthesizes multi-step causal plans from declarative goals and actions (`JoinReceptionQueue → CompleteTriage → UndergoXRayScan → JoinSectionQueue → ReceiveConsultation → LeaveHospital`).
   - **Mid-Level Execution Layer (`FSM` — 3 States)**: Rather than duplicating movement and timer logic inside every `GOAPAction`, actions command a 3-state Finite State Machine:
     - `Waiting`: Standing in queues, waiting on examination tables, or standby.
     - `MovingTo`: Following an A\* path through corridors and doorways (`onArrived` callback).
     - `PerformingAction`: Executing a timed activity with an overhead progress bar (`onComplete` callback).
   - **Low-Level Spatial Layer (`AStarPathfinder` + `HospitalNavGrid`)**: Computes collision-free paths around room walls and through doorways using octile distance heuristics and line-of-sight path smoothing.

2. **Multi-Agent Role Specialization & Shared Needs**:
   Every NPC class (`ReceptionistNPC`, `DoctorNPC`, `PatientNPC`) inherits from `HospitalNPC`, sharing physiological **Bladder Fullness (`0–100%`)** and the `UseRestroom` GOAP action, while pursuing distinct role-specific goals:
   - **Reception Staff (`ReceptionistNPC`)**: Mans the intake desk, triages the head of the reception queue (`TriageWaitingPatients`), assigns the patient's target department (`General`, `Ophthalmology`, `Orthopedics`, or `Maternity`) and whether an X-Ray scan is needed, and takes restroom breaks when `needsRestroom` (`bladder >= 78%`) preempts desk duty.
   - **Specialist Doctors (`DoctorNPC` × 4)**: Assigned to **General Medicine**, **Ophthalmology**, **Orthopedics**, and **Maternity**. Each doctor calls in the next waiting patient (`TreatSectionPatient`), performs the consultation, discharges the patient, and then **must sit at their office computer to enter the patient's medical record (`LogMedicalRecord`, priority `88`)** before calling the next patient.
   - **Patients (`PatientNPC`)**: Spawn with 1 of 8 ailments. Depending on their triage diagnosis (`requiresXRay`), their `GOAPPlanner` automatically synthesizes either a **5-step direct consultation plan** (`cost: 7`) or a **6-step diagnostic X-Ray + specialist plan** (`cost: 9`).

3. **Real-Time Hospital Telemetry & Click-to-Inspect GOAP HUD**:
   - **Hospital State & Telemetry Dashboard**: Tracks total patients discharged, active NPC count, per-department treated count and average wait time (`s`), and per-restroom usage frequency and stall occupancy (`0/2`, `1/2`, `2/2`).
   - **Interactive Agent Inspection**: Click any Patient, Doctor, or Receptionist on the hospital floor to inspect their live `GOAPState` world-state pills, ranked `GOAPGoal` priorities, active `A*` action chain, and current `FSM` state in the sidebar.

---

## 🏥 Hospital Sections & Patient Workflows

| Department | Specialist Doctor | Sample Ailments | Diagnostic X-Ray Required? | Synthesized Patient GOAP Plan |
|---|---|---|---|---|
| **General Medicine** | Dr. Gregory | Common Cold (`3.5s`)<br>Chest Congestion (`4.2s`) | No<br>**Yes** | 5-step (`JoinReceptionQueue → CompleteTriage → JoinSectionQueue → ReceiveConsultation → LeaveHospital`)<br>6-step (inserts `UndergoXRayScan` before `JoinSectionQueue`) |
| **Ophthalmology** | Dr. Iris | Blurred Vision (`4.0s`)<br>Corneal Scratch (`4.5s`) | No<br>No | 5-step plan |
| **Orthopedics** | Dr. Bones | Radius Fracture (`5.2s`)<br>Sprained Ankle (`3.8s`) | **Yes**<br>No | 6-step plan (routes via **X-Ray Room** first)<br>5-step plan |
| **Maternity / OB-GYN** | Dr. Clara | Prenatal Checkup (`4.4s`)<br>Trimester Scan (`4.8s`) | No<br>No | 5-step plan |

---

## 🗂️ Codebase Structure

The example is split into four modular scripts inside `src/examples/goap_hospital/`, loaded in order by `goap-hospital.html`:

| File | Responsibility |
|---|---|
| [`hospital_defs.js`](hospital_defs.js) | Static domain definitions (`HOSPITAL_DEPARTMENTS`, `PATIENT_AILMENTS`, `PATIENT_NAMES`), the `HospitalNavGrid` adapter for `AStarPathfinder`, and `BuildHospitalFloorplan()` (constructs room geometry, waiting queues, restroom stalls, and wall/doorway collision cells). |
| [`hospital_npc_base.js`](hospital_npc_base.js) | Low-level 3-state movement/activity FSM (`NPCWaitingState`, `NPCMovingToState`, `NPCPerformingActionState` extending `FSMState`) and the shared `HospitalNPC` base class (A\* path following, bladder fullness `0–100%`, shared `CreateUseRestroomAction()`, and agent rendering). |
| [`hospital_agents.js`](hospital_agents.js) | Role-specific NPC subclasses (`ReceptionistNPC`, `DoctorNPC`, `PatientNPC`) and their respective `BuildGOAP()` goal/action definitions. |
| [`goap_hospital.js`](goap_hospital.js) | `GOAPHospitalScene` (`Game` subclass managing queues, restroom stalls, patient spawning, architectural floorplan rendering, live telemetry dashboard, and the click-to-inspect GOAP/FSM HUD). |

---

## 🎮 Controls & Sandbox Interactions

| Key / Button | Effect on Simulation & Planners |
|---|---|
| **`Left-Click` on any NPC** | Selects that Receptionist, Doctor, or Patient for live inspection in the right-hand **GOAP & FSM Inspector**. |
| **`[1]` +Patient** | Spawns a new patient with a random ailment at the hospital entrance. |
| **`[2]` +Fracture (X-Ray)** | Spawns an Orthopedics fracture patient who requires the **6-step X-Ray diagnostic sub-workflow**. |
| **`[3]` Coffee Surge (+WC)** | Adds `+58%` bladder fullness to every NPC in the hospital, triggering `RelieveBladder` (`priority 95`) preemption across staff and patients. |
| **`[4]` Spawn: Paused / Normal / Rush Hour** | Cycles automatic patient arrival rate between `Paused`, `Normal`, and `Rush Hour`. |
| **`[5]` Next NPC** | Cycles the live inspector selection through all active Receptionists, Doctors, and Patients. |
| **`[6]` Paths: ON / OFF** | Toggles A\* navigation path overlays for all moving NPCs. |
| **`[R]` Rst** | Resets the entire hospital, staff, patients, and telemetry statistics. |


