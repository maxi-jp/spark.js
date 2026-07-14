class MenuExample extends Game {
    constructor(renderer) {
        super(renderer);

        this.mainMenu = null;

        this.openMenuLabel = null;

        this.onMenu = false;
    }

    Start() {
        this.screenWidth = 480;
        this.screenHeight = 480;

        this.openMenuLabel = new TextLabel("Press ESC to open the menu", new Vector2(10, 300), "30px Comic Sans MS", "white", "left");

        this.mainMenu = new MainMenu(this, canvas);
        this.mainMenu.Start();
        this.onMenu = true;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (Input.IsKeyUp(KEY_ESCAPE)) {
            this.mainMenu.ShowMenu();
            this.onMenu = true;
        }
    }

    Draw() {
        super.Draw();

        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);

        if (!this.onMenu)
            this.openMenuLabel.Draw(this.renderer);
    }

    OnMenuStartButton() {
        this.onMenu = false;
    }
}

class MainMenu extends HTMLMenu {
    constructor(game, canvas) {
        super(game, "#mainMenu", "#container", canvas);
    }

    Start() {
        super.Start();

        this.SetupElements([
            "#menuStart",
            "#menuCredits",
            '#credits'
        ]);

        this.SetupButtons([
            { selector: "#menuStart", callback: this.StartButton.bind(this) },
            { selector: "#menuCredits", callback: this.ShowCredits.bind(this)  },
        ]);
    }

    StartButton() {
        this.SetContainerStyle('left: -100%');
        this.game.OnMenuStartButton();
    }
    
    ShowMenu() {
        this.SetContainerStyle('left: 0%');
    }

    ShowCredits() {
        const creditsElement = this.elements["#credits"];

        const transitionDuration = parseFloat(window.getComputedStyle(creditsElement).transitionDuration) * 1000 || 1000;

        creditsElement.setAttribute('style', 'display: block; animation-play-state: running;');
        setTimeout(() => creditsElement.classList.add('show'), 0);

        creditsElement.onanimationend = () => {
            creditsElement.classList.remove('show');
            creditsElement.setAttribute('style', 'display: block; animation-play-state: paused;');
            setTimeout(() => {
                creditsElement.setAttribute('style', 'display: none; animation-play-state: paused;');
            }, transitionDuration);
        };
    }
}

// initialize the game
window.onload = () => {
    Init(MenuExample);
}