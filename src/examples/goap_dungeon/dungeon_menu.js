// ============================================================================
// DungeonMenu
// HTML+CSS HUD, Top Header, Inventory Bar, Sandbox Toolbar & Live GOAP
// Inspector overlay for the Dungeon Heist demo. Extends HTMLMenu so layout,
// pointer passthrough, and canvas resize/fillWindow syncing are engine-managed.
// ============================================================================

class DungeonMenu extends HTMLMenu {
    /**
     * @param {GOAPDungeonScene} game
     * @param {HTMLCanvasElement} canvas
     */
    constructor(game, canvas) {
        super(game, '#dungeon-ui', '#canvasContainer', canvas, true, true);

        this._lastBanner = '';
        this._lastInventory = '';
    }

    Start() {
        super.Start();

        this.SetupElements([
            '#dungeon-header',
            '#dung-status-banner',
            '#dungeon-inventory',
            '#dungeon-goap-inspector',
            '#dungeon-toolbar'
        ]);

        this.SetupButtons([
            {
                selector: '#dung-btn-key',
                callback: () => this.game.ToggleRustyKey()
            },
            {
                selector: '#dung-btn-bomb',
                callback: () => this.game.GrantBomb()
            },
            {
                selector: '#dung-btn-laser',
                callback: () => this.game.ToggleLaserTrap()
            },
            {
                selector: '#dung-btn-teleporter',
                callback: () => this.game.ToggleTeleporter()
            },
            {
                selector: '#dung-btn-reset',
                callback: () => this.game.ResetHeist()
            }
        ]);

        this.SyncState();
    }

    SyncState() {
        const g = this.game;
        const r = g.rogue;
        if (!r)
            return;

        const bannerEl = this.elements['#dung-status-banner'];
        if (bannerEl && r.statusBanner !== this._lastBanner) {
            this._lastBanner = r.statusBanner;
            bannerEl.textContent = r.statusBanner;
        }

        const invEl = this.elements['#dungeon-inventory'];
        if (invEl) {
            const invText =
                `INVENTORY: RustyKey:${r.hasRustyKey ? 'YES' : 'NO'} | ` +
                `Bomb:${r.hasBomb ? 'YES' : 'NO'} | ` +
                `VaultKey:${r.hasVaultKey ? 'YES' : 'NO'} | ` +
                `Idol:${r.hasIdol ? 'YES' : 'NO'} | ` +
                `Heists:${g.heistsCompleted}`;
            if (invText !== this._lastInventory) {
                this._lastInventory = invText;
                invEl.textContent = invText;
            }
        }

        const inspectorEl = this.elements['#dungeon-goap-inspector'];
        if (inspectorEl) {
            DrawGOAPInspectorHTML(r.goap, inspectorEl, {
                title: 'GOAP HEIST PLANNER (8-STEP CHAIN)'
            });
        }
    }
}
