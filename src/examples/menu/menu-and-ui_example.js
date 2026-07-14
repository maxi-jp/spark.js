class MenuAndUIExample extends Game {
    constructor(renderer) {
        super(renderer);

        this.mainMenu = null;
        this.uiMenu = null;

        this.openMenuLabel = null;
        this.openUpgradesLabel = null;
        this.upgradeInstructionsLabel = null;
        this.upgradeCostsLabel = null;

        this.onMainMenu = false;
        this.onUpgradeMenu = false;

        this.upgradeCosts = [10, 15, 20, 25, 100];
    }

    Start() {
        this.screenWidth = 480;
        this.screenHeight = 480;

        this.openMenuLabel = new TextLabel("Press ESC to open the menu", new Vector2(10, 200), "30px Comic Sans MS", "white", "left");
        this.openUpgradesLabel = new TextLabel("Press SPACE to open the upgrades menu", new Vector2(10, 260), "24px Comic Sans MS", "white", "left");
        this.upgradeInstructionsLabel = new TextLabel("Press \"1\" to \"5\" or click on the menu buttons to update each cost", new Vector2(10, 280), "15px Comic Sans MS", "white", "left");
        this.upgradeCostsLabel = new TextLabel(this.upgradeCosts.toString(), new Vector2(10, 320), "24px Comic Sans MS", "white", "left");

        this.mainMenu = new MainMenu(this, canvas);
        this.mainMenu.Start();
        this.onMainMenu = true;

        this.uiMenu = new UIMenu(this, canvas);
        this.uiMenu.Start();
        this.onUpgradeMenu = false;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (Input.IsKeyUp(KEY_ESCAPE)) {
            if (this.onUpgradeMenu)
                this.uiMenu.Hide();

            this.mainMenu.ShowMenu();
            this.onMainMenu = true;
        }

        if (Input.IsKeyDown(KEY_SPACE) && !this.onMainMenu) {
            if (this.onUpgradeMenu)
                this.uiMenu.Hide();
            else
                this.uiMenu.Show();

            this.onUpgradeMenu = !this.onUpgradeMenu;
        }

        for (let i = 0; i < 5; i++) {
            if (Input.IsKeyDown(eval("KEY_" + (i + 1)))) {
                this.upgradeCosts[i] += 5;
                // upgrade the html button text
                this.uiMenu.UpdateButtonCost(i + 1, this.upgradeCosts[i]);
                // update the label cost text
                this.upgradeCostsLabel.text = this.upgradeCosts.toString();
            }
        }
    }

    Draw() {
        super.Draw();

        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);

        if (!this.onMainMenu) {
            this.openMenuLabel.Draw(this.renderer);
            this.openUpgradesLabel.Draw(this.renderer);
            this.upgradeInstructionsLabel.Draw(this.renderer);
            this.upgradeCostsLabel.Draw(this.renderer);
        }
    }

    OnMenuStartButton() {
        this.onMainMenu = false;
    }

    OnUIUpgradeClick(upgradeId) {
        this.upgradeCosts[upgradeId - 1] += 5;
        // upgrade the html button text
        this.uiMenu.UpdateButtonCost(upgradeId, this.upgradeCosts[upgradeId - 1]);
        // update the label cost text
        this.upgradeCostsLabel.text = this.upgradeCosts.toString();
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

class UIMenu extends HTMLMenu {
    constructor(game, canvas) {
        super(game, "#ingameUI", "#container", canvas, false);
    }

    Start() {
        super.Start();

        this.SetupElements([
            "#ingameUI",
            "#upgrade1",
            "#upgrade2",
            '#upgrade3',
            '#upgrade4',
            '#upgrade5'
        ]);

        this.SetupButtons([
            { selector: "#upgrade1", callback: this.UpgradeButton.bind(this, 1) },
            { selector: "#upgrade2", callback: this.UpgradeButton.bind(this, 2)  },
            { selector: "#upgrade3", callback: this.UpgradeButton.bind(this, 3)  },
            { selector: "#upgrade4", callback: this.UpgradeButton.bind(this, 4)  },
            { selector: "#upgrade5", callback: this.UpgradeButton.bind(this, 5)  },
        ]);
    }

    Show() {
        this.elements["#ingameUI"].classList.remove('hidden');
    }

    Hide() {
        this.elements["#ingameUI"].classList.add('hidden');
    }

    UpgradeButton(upgradeId) {
        this.game.OnUIUpgradeClick(upgradeId);
    }

    UpdateButtonCost(upgradeId, newCost) {
        this.elements["#upgrade" + upgradeId].getElementsByTagName("p")[0].innerText = newCost + "€";
    }
}

// initialize the game
window.onload = () => {
    Init(MenuAndUIExample);
}