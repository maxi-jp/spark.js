// ============================================================================
// SurvivalMenu
// HTML+CSS HUD, Vitals Card, Event Log, Sandbox Toolbar, Cost Comparison &
// Live GOAP Inspector overlay for the Autonomous Survival Crafter demo.
// ============================================================================

class SurvivalMenu extends HTMLMenu {
    /**
     * @param {GOAPSurvivalGame} game
     * @param {HTMLCanvasElement} canvas
     */
    constructor(game, canvas) {
        super(game, '#survival-ui', '#canvasContainer', canvas, true, true);

        this._lastFullnessText = '';
        this._lastFullnessPct = -1;
        this._lastWarmthText = '';
        this._lastWarmthPct = -1;
        this._lastInv = '';
        this._lastLogKey = '';
    }

    Start() {
        super.Start();

        this.SetupElements([
            '#survival-vitals',
            '#surv-fullness-label',
            '#surv-fullness-bar',
            '#surv-warmth-label',
            '#surv-warmth-bar',
            '#surv-inv-line',
            '#survival-log',
            '#surv-log-entries',
            '#survival-toolbar',
            '#survival-sidebar',
            '#survival-goap-inspector',
            '#survival-cost-box'
        ]);

        this.SetupButtons([
            {
                selector: '#surv-btn-axe',
                callback: () => this.game.ActionBreakAxe()
            },
            {
                selector: '#surv-btn-rain',
                callback: () => this.game.ActionRainstorm()
            },
            {
                selector: '#surv-btn-hungry',
                callback: () => this.game.ActionMakeHungry()
            },
            {
                selector: '#surv-btn-rack',
                callback: () => this.game.ActionToggleRackAxe()
            },
            {
                selector: '#surv-btn-berries',
                callback: () => this.game.ActionToggleBerries()
            },
            {
                selector: '#surv-btn-reset',
                callback: () => this.game.Start()
            }
        ]);

        this.SyncState();
    }

    SyncState() {
        const g = this.game;
        const s = g.survivor;
        if (!s)
            return;

        // Vitals: Fullness
        const fullPct = Math.max(0, Math.min(100, Math.round(s.fullness)));
        const fullText = `🥩 Fullness: ${fullPct}%`;
        if (fullText !== this._lastFullnessText && this.elements['#surv-fullness-label']) {
            this._lastFullnessText = fullText;
            this.elements['#surv-fullness-label'].textContent = fullText;
        }
        if (fullPct !== this._lastFullnessPct && this.elements['#surv-fullness-bar']) {
            this._lastFullnessPct = fullPct;
            const bar = this.elements['#surv-fullness-bar'];
            bar.style.width = `${fullPct}%`;
            bar.style.background = s.fullness < 45 ? '#ef4444' : '#22c55e';
        }

        // Vitals: Warmth
        const warmPct = Math.max(0, Math.min(100, Math.round(s.warmth)));
        const warmText = `🔥 Warmth: ${warmPct}%`;
        if (warmText !== this._lastWarmthText && this.elements['#surv-warmth-label']) {
            this._lastWarmthText = warmText;
            this.elements['#surv-warmth-label'].textContent = warmText;
        }
        if (warmPct !== this._lastWarmthPct && this.elements['#surv-warmth-bar']) {
            this._lastWarmthPct = warmPct;
            const bar = this.elements['#surv-warmth-bar'];
            bar.style.width = `${warmPct}%`;
            bar.style.background = s.warmth < 45 ? '#38bdf8' : '#f97316';
        }

        // Inventory summary
        const axeInfo = s.hasAxe ? `Axe(${s.axeDurability} uses)` : 'No Axe';
        const invText = `Inv: ${axeInfo} | Wood:${s.hasFirewood ? 'Yes' : 'No'} | Meat:${s.hasRawMeat ? 'Yes' : 'No'}`;
        if (invText !== this._lastInv && this.elements['#surv-inv-line']) {
            this._lastInv = invText;
            this.elements['#surv-inv-line'].textContent = invText;
        }

        // Event log (top 3 entries)
        const logContainer = this.elements['#surv-log-entries'];
        if (logContainer) {
            const top3 = s.eventLog.slice(0, 3);
            const logKey = top3.join('|');
            if (logKey !== this._lastLogKey) {
                this._lastLogKey = logKey;
                logContainer.innerHTML = top3
                    .map(entry => `<div>• ${GOAPAgent._escapeHTML(entry)}</div>`)
                    .join('');
            }
        }

        // GOAP Inspector
        const inspectorEl = this.elements['#survival-goap-inspector'];
        if (inspectorEl) {
            s.goap.DrawGOAPInspectorHTML(inspectorEl, {
                title: 'Survivor GOAP Inspector'
            });
        }
    }
}
