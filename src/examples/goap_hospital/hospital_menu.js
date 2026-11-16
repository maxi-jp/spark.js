// ============================================================================
// HospitalMenu
// HTML+CSS HUD, Top Toolbar, Telemetry Dashboard & Live GOAP Inspector overlay
// for the Autonomous Hospital Simulation. Extends HTMLMenu so layout, pointer
// passthrough, and canvas resize/fillWindow syncing are handled by the engine.
// ============================================================================

class HospitalMenu extends HTMLMenu {
    /**
     * @param {GOAPHospitalScene} game
     * @param {HTMLCanvasElement} canvas
     */
    constructor(game, canvas) {
        super(game, '#hospital-ui', '#canvasContainer', canvas, true, true);

        this._lastSummary1 = '';
        this._lastSummary2 = '';
        this._lastDeptKey = '';
        this._lastRestroomKey = '';
        this._lastSpawnLabel = '';
        this._lastPathsLabel = '';
    }

    Start() {
        super.Start();

        this.SetupElements([
            '#hospital-toolbar',
            '#hospital-sidebar',
            '#hosp-summary-1',
            '#hosp-summary-2',
            '#hosp-dept-rows',
            '#hosp-restroom-cards',
            '#hospital-goap-inspector'
        ]);

        this.SetupButtons([
            {
                selector: '#hosp-btn-patient',
                callback: () => this.game.ActionSpawnRandomPatient()
            },
            {
                selector: '#hosp-btn-fracture',
                callback: () => this.game.ActionSpawnFracturePatient()
            },
            {
                selector: '#hosp-btn-coffee',
                callback: () => this.game.ActionCoffeeSurge()
            },
            {
                selector: '#hosp-btn-spawn',
                callback: () => this.game.ActionCycleAutoSpawn()
            },
            {
                selector: '#hosp-btn-next-npc',
                callback: () => this.game.CycleSelectedNPC()
            },
            {
                selector: '#hosp-btn-paths',
                callback: () => this.game.ActionTogglePaths()
            },
            {
                selector: '#hosp-btn-reset',
                callback: () => this.game.Start()
            }
        ]);

        this.SyncState();
    }

    /**
     * Updates toolbar toggle labels, Hospital State & Telemetry, and the
     * selected NPC's live GOAP Inspector via `GOAPAgent.DrawGOAPInspectorHTML`.
     */
    SyncState() {
        this.SyncToolbar();
        this.SyncTelemetry();
        this.SyncGOAPInspector();
    }

    SyncToolbar() {
        const g = this.game;
        const modes = ['Paused', 'Normal', 'Rush Hour'];
        const spawnLabel = `[4] Spawn: ${modes[g.autoSpawnMode]}`;
        if (spawnLabel !== this._lastSpawnLabel) {
            this._lastSpawnLabel = spawnLabel;
            const btn = document.querySelector('#hosp-btn-spawn');
            if (btn)
                btn.textContent = spawnLabel;
        }

        const pathsLabel = `[6] Paths:${g.showAllPaths ? 'ON' : 'OFF'}`;
        if (pathsLabel !== this._lastPathsLabel) {
            this._lastPathsLabel = pathsLabel;
            const btn = document.querySelector('#hosp-btn-paths');
            if (btn) {
                btn.textContent = pathsLabel;
                btn.classList.toggle('active', g.showAllPaths);
            }
        }
    }

    SyncTelemetry() {
        const g = this.game;

        const sum1 = `Active Pts: ${g.patients.length}/${g.maxActivePatients} | Triaged: ${g.stats.totalTriaged} | X-Rays: ${g.stats.totalXRayScans} | Discharged: ${g.stats.totalDischarged}`;
        if (sum1 !== this._lastSummary1 && this.elements['#hosp-summary-1']) {
            this._lastSummary1 = sum1;
            this.elements['#hosp-summary-1'].textContent = sum1;
        }

        const sum2 = `Reception Queue: ${g.receptionQueue.length} waiting | X-Ray Queue: ${g.xrayQueue.length} waiting`;
        if (sum2 !== this._lastSummary2 && this.elements['#hosp-summary-2']) {
            this._lastSummary2 = sum2;
            this.elements['#hosp-summary-2'].textContent = sum2;
        }

        const deptContainer = this.elements['#hosp-dept-rows'];
        if (deptContainer) {
            const deptKeys = Object.keys(HOSPITAL_DEPARTMENTS);
            let deptKey = '';
            let deptHtml = '';

            for (let i = 0; i < deptKeys.length; i++) {
                const key = deptKeys[i];
                const cfg = HOSPITAL_DEPARTMENTS[key];
                const secStat = g.stats.sections[key];
                const qLen = g.departmentQueues[key].length;
                const doc = g.doctors[key];
                const docAction = doc && doc.goap && doc.goap.GetCurrentAction()
                    ? doc.goap.GetCurrentAction().name
                        .replace('TreatPatientAilment', 'Treating')
                        .replace('LogMedicalRecordAtPC', 'Logging PC')
                        .replace('CallNextPatientFromQueue', 'Calling Pt')
                        .replace('UseNearestRestroom', 'In Restroom')
                        .slice(0, 12)
                    : 'Standby';
                const waitStr = secStat.waitCount > 0 ? `${secStat.avgWait.toFixed(1)}s` : '—';

                deptKey += `${key}:${qLen}:${secStat.treated}:${waitStr}:${docAction}|`;
                deptHtml +=
                    `<div class="hosp-dept-row">` +
                        `<span class="hosp-dept-name" style="color:${cfg.accentHex}">${cfg.icon} ${cfg.shortName}</span>` +
                        `<span class="hosp-dept-queue${qLen > 0 ? ' has-queue' : ''}">${qLen}</span>` +
                        `<span class="hosp-dept-treated">${secStat.treated}</span>` +
                        `<span class="hosp-dept-wait">${waitStr}</span>` +
                        `<span class="hosp-dept-status">${docAction}</span>` +
                    `</div>`;
            }

            if (deptKey !== this._lastDeptKey) {
                this._lastDeptKey = deptKey;
                deptContainer.innerHTML = deptHtml;
            }
        }

        const rrContainer = this.elements['#hosp-restroom-cards'];
        if (rrContainer) {
            const rrKeys = ['west', 'north', 'south'];
            let rrKey = '';
            let rrHtml = '';

            for (let i = 0; i < rrKeys.length; i++) {
                const rk = rrKeys[i];
                const rStat = g.stats.restrooms[rk];
                const rrLayout = g.layout.restrooms[i];
                const busyCount = rrLayout.stalls.filter(s => Boolean(s.occupant)).length;

                rrKey += `${rk}:${rStat.uses}:${busyCount}|`;
                rrHtml +=
                    `<div class="hosp-restroom-card${busyCount > 0 ? ' is-busy' : ''}">` +
                        `<div class="hosp-restroom-name">${rStat.name}</div>` +
                        `<div class="hosp-restroom-uses">Uses: ${rStat.uses} (${busyCount}/2 busy)</div>` +
                    `</div>`;
            }

            if (rrKey !== this._lastRestroomKey) {
                this._lastRestroomKey = rrKey;
                rrContainer.innerHTML = rrHtml;
            }
        }
    }

    SyncGOAPInspector() {
        const g = this.game;
        const npc = g.selectedNPC;
        const container = this.elements['#hospital-goap-inspector'];
        if (!container)
            return;

        if (!npc || !npc.goap) {
            DrawGOAPInspectorHTML(null, container);
            return;
        }

        const roleDetail = npc.role === 'Patient'
            ? `Patient (${npc.ailment.name})`
            : npc.role === 'Doctor'
                ? `Specialist (${HOSPITAL_DEPARTMENTS[npc.department].shortName})`
                : 'Reception Triage Staff';

        const subtitle = `${roleDetail} | FSM: ${npc.fsm.currentStateName} | Bladder: ${Math.round(npc.bladder)}%`;

        npc.goap.DrawGOAPInspectorHTML(container, {
            title: `${npc.name} — GOAP Inspector`,
            subtitle: subtitle,
            compact: true,
            showWorldState: true,
            showGoals: true,
            showPlan: true
        });
    }
}
