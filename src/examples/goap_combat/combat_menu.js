// ============================================================================
// CombatMenu
// HTML+CSS HUD, Top Header, Equipment Bar, Sandbox Toolbar & Live GOAP
// Inspector overlay for the Tactical Combat Squad demo. Extends HTMLMenu.
// ============================================================================

class CombatMenu extends HTMLMenu {
    /**
     * @param {GOAPCombatScene} game
     * @param {HTMLCanvasElement} canvas
     */
    constructor(game, canvas) {
        super(game, '#combat-ui', '#canvasContainer', canvas, true, true);

        this._lastBanner = '';
        this._lastEquip = '';
    }

    Start() {
        super.Start();

        this.SetupElements([
            '#combat-header',
            '#comb-status-banner',
            '#combat-equipment',
            '#combat-goap-inspector',
            '#combat-toolbar'
        ]);

        this.SetupButtons([
            {
                selector: '#comb-btn-hurt',
                callback: () => this.game.HurtSoldier()
            },
            {
                selector: '#comb-btn-clip',
                callback: () => this.game.EmptyClip()
            },
            {
                selector: '#comb-btn-ammo',
                callback: () => this.game.EmptyAllAmmo()
            },
            {
                selector: '#comb-btn-cover',
                callback: () => this.game.ToggleTargetCover()
            },
            {
                selector: '#comb-btn-grenades',
                callback: () => this.game.ToggleGrenades()
            },
            {
                selector: '#comb-btn-crate',
                callback: () => this.game.ToggleAmmoCrates()
            },
            {
                selector: '#comb-btn-reset',
                callback: () => this.game.ResetArena()
            }
        ]);

        this.SyncState();
    }

    SyncState() {
        const g = this.game;
        const s = g.soldier;
        if (!s)
            return;

        const bannerEl = this.elements['#comb-status-banner'];
        if (bannerEl && s.statusBanner !== this._lastBanner) {
            this._lastBanner = s.statusBanner;
            bannerEl.textContent = s.statusBanner;
        }

        const equipEl = this.elements['#combat-equipment'];
        if (equipEl) {
            const equipText =
                `SOLDIER HP: ${s.hp}/100 | CLIP: ${s.clip}/${s.maxClip} | ` +
                `RESERVE: ${s.reserveAmmo} | GRENADES: ${s.grenades} | ` +
                `CRATE: ${g.ammoCratesAvailable ? 'READY' : 'EMPTY'}`;
            if (equipText !== this._lastEquip) {
                this._lastEquip = equipText;
                equipEl.textContent = equipText;
            }
        }

        const inspectorEl = this.elements['#combat-goap-inspector'];
        if (inspectorEl) {
            DrawGOAPInspectorHTML(s.goap, inspectorEl, {
                title: 'GOAP TACTICAL INSPECTOR (F.E.A.R. AI)'
            });
        }
    }
}
