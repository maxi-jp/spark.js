// ============================================================================
// BossMenu
// HTML+CSS HUD, Boss Health Bar, Legend & Live Behavior Tree Inspector overlay
// for the Multiphase Arena Boss demo. Extends HTMLMenu.
// ============================================================================

class BossMenu extends HTMLMenu {
    /**
     * @param {BTBossGame} game
     * @param {HTMLCanvasElement} canvas
     */
    constructor(game, canvas) {
        super(game, '#boss-ui', '#canvasContainer', canvas, true, true);

        this._lastHpText = '';
        this._lastHpPct = -1;
        this._lastPhaseCss = '';
        this._lastShowTree = null;
    }

    Start() {
        super.Start();

        this.SetupElements([
            '#boss-header',
            '#boss-hp-wrap',
            '#boss-hp-fill',
            '#boss-hp-label',
            '#boss-tree-inspector',
            '#boss-legend'
        ]);

        this.SyncState();
    }

    SyncState() {
        const g = this.game;
        const boss = g.boss;
        if (!boss)
            return;

        const hpPct = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
        const hpText = `TITAN MECH: ${Math.round(boss.hp)} / ${boss.maxHp} HP`;
        const phaseCss = boss.phaseColor.toString();

        if (hpText !== this._lastHpText && this.elements['#boss-hp-label']) {
            this._lastHpText = hpText;
            this.elements['#boss-hp-label'].textContent = hpText;
        }
        if ((hpPct !== this._lastHpPct || phaseCss !== this._lastPhaseCss) && this.elements['#boss-hp-fill']) {
            this._lastHpPct = hpPct;
            this._lastPhaseCss = phaseCss;
            this.elements['#boss-hp-fill'].style.width = `${hpPct.toFixed(2)}%`;
            this.elements['#boss-hp-fill'].style.background = phaseCss;
        }

        const treeEl = this.elements['#boss-tree-inspector'];
        if (treeEl) {
            if (g.showTreeInspector) {
                boss.bt.DrawTreeInspectorHTML(treeEl, {
                    title: 'Titan Boss Behavior Tree'
                });
            }
            else if (this._lastShowTree !== false) {
                DrawTreeInspectorHTML(null, treeEl);
            }
            this._lastShowTree = g.showTreeInspector;
        }
    }
}
