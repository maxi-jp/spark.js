// ============================================================================
// GuardMenu
// HTML+CSS HUD, Legend & Live Behavior Tree Inspector overlay for the
// Stealth Guard AI demo. Extends HTMLMenu.
// ============================================================================

class GuardMenu extends HTMLMenu {
    /**
     * @param {BTGuardGame} game
     * @param {HTMLCanvasElement} canvas
     */
    constructor(game, canvas) {
        super(game, '#guard-ui', '#canvasContainer', canvas, true, true);

        this._lastShowTree = null;
    }

    Start() {
        super.Start();

        this.SetupElements([
            '#guard-header',
            '#guard-tree-inspector',
            '#guard-legend'
        ]);

        this.SyncState();
    }

    SyncState() {
        const g = this.game;
        const treeEl = this.elements['#guard-tree-inspector'];
        if (!treeEl)
            return;

        const selected = g.guards ? g.guards[g.selectedGuardIndex] : null;
        if (g.showTreeInspector && selected) {
            selected.bt.DrawTreeInspectorHTML(treeEl, {
                title: `Live BT: ${selected.name}`
            });
        }
        else if (this._lastShowTree !== false) {
            DrawTreeInspectorHTML(null, treeEl);
        }
        this._lastShowTree = g.showTreeInspector;
    }
}
