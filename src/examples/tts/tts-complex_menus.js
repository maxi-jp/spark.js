class MainMenu extends HTMLMenu {
    constructor(game, canvas) {
        super(game, "#mainMenu", "#container", canvas, true, true, true);
    }

    Start() {
        super.Start();

        this.SetupElements([
            "#menuStart",
        ]);

        this.SetupButtons([
            { selector: "#menuStart", callback: this.StartButton.bind(this) }
        ]);
    }

    StartButton() {
        this.SetContainerStyle('top: -100%; opacity: 0;');
        this.game.OnMenuStartButton();
    }
    
    ShowMenu() {
        this.SetContainerStyle('top: 0%; opacity: 1;');
    }
}

class PauseMenu extends HTMLMenu {
    constructor(game, canvas) {
        super(game, "#pauseMenu", "#container", canvas, true, true, true);
    }

    Start() {
        super.Start();

        this.SetupElements([
            "#menuResume"
        ]);

        this.SetupButtons([
            { selector: "#menuResume", callback: this.ResumeButton.bind(this) }
        ]);
    }

    ResumeButton() {
        this.game.PauseGame(false);
    }
    
    ShowMenu() {
        this.SetContainerStyle('top: 0%; opacity: 1;');
    }

    HideMenu() {
        this.SetContainerStyle('top: -100%; opacity: 0;');
    }
}

class GameOverMenu extends HTMLMenu {
    constructor(game, canvas) {
        super(game, "#gameOverMenu", "#container", canvas, true, true, true);
    }

    Start() {
        super.Start();
        this.SetupElements(["#finalScore"]);
        this.SetupButtons([{ selector: "#btnRestart", callback: this.OnRestart.bind(this) }]);
    }

    OnRestart() {
        this.HideMenu();
        this.game.OnGameOverRestartButton();
    }

    SetScore(score) {
        this.elements["#finalScore"].textContent = score;
    }

    ShowMenu() {
        this.SetContainerStyle('top: 0%; opacity: 1;');
    }

    HideMenu() {
        this.SetContainerStyle('top: -100%; opacity: 0;');
    }
}
