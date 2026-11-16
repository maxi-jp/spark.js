// ============================================================================
// WorkerMenu
// HTML+CSS HUD, Legend & Live Behavior Tree Inspector overlay for the
// Autonomous Resource Worker AI demo. Extends HTMLMenu.
// ============================================================================

class WorkerMenu extends HTMLMenu {
    /**
     * @param {BTWorkerGame} game
     * @param {HTMLCanvasElement} canvas
     */
    constructor(game, canvas) {
        super(game, '#worker-ui', '#canvasContainer', canvas, true, true);

        this._lastShowTree = null;
    }

    Start() {
        super.Start();

        this.SetupElements([
            '#worker-header',
            '#worker-tree-inspector',
            '#worker-legend'
        ]);

        this.SyncState();
    }

    SyncState() {
        const g = this.game;
        const treeEl = this.elements['#worker-tree-inspector'];
        if (!treeEl)
            return;

        const selected = g.workers ? g.workers[g.selectedWorkerIndex] : null;
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
