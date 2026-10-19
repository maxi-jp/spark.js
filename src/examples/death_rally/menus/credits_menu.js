// =====================================================================
// Death Rally — Credits Menu
// Extends HTMLMenu.
// =====================================================================

class CreditsMenu extends HTMLMenu {
    constructor(game) {
        super(game, '#credits-panel', '#canvasContainer', canvas, true, false);
        this.Start();
        this.SetupButtons([
            { selector: '#btn-credits-back', callback: () => game.OnCreditsBack() },
        ]);
        this.Hide();
    }

    Show() { this.container.style.display = 'flex'; }
    Hide() { this.container.style.display = 'none'; }
}
