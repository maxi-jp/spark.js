// =====================================================================
// Death Rally — Main Menu
// Extends HTMLMenu. Shows the game title and top-level navigation.
// Requires: htmlmenu.js, death_rally_defs.js
// =====================================================================

class MainMenu extends HTMLMenu {
    constructor(game) {
        super(game, '#main-menu', '#canvasContainer', canvas, true, false);
        this.Start();
        this.SetupButtons([
            { selector: '#btn-start-game', callback: () => game.OnStartGame()    },
            { selector: '#btn-playground', callback: () => game.OnPlayground()   },
            { selector: '#btn-main-credits', callback: () => game.OnCredits()    },
        ]);
        this.Hide();
    }

    Show() { this.container.style.display = 'flex'; }
    Hide() { this.container.style.display = 'none'; }
}
