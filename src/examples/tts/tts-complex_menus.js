class MainMenu extends HTMLMenu {
    constructor(game, canvas) {
        super(game, "#mainMenu", "#container", canvas, true, true, true);

        this.phase = 0;
        this.timer = 0;
    }

    Start() {
        super.Start();

        this.SetupElements([
            // "#menuStart",
            '#press-to-start',
            '.neon-logo',
            '#press-to-start-2'
        ]);

        // this.SetupButtons([
        //     { selector: "#menuStart", callback: this.StartButton.bind(this) }
        // ]);

        this.timer = 0;
    }

    PressToStart() {
        this.elements[".neon-logo"].classList.remove("hidden");
        this.elements["#press-to-start"].classList.add("hidden");

        game.Invoke(this.ShowPressAgain, 4, this);

        this.phase = 1;
        this.timer = 0;
    }

    StartButton() {
        this.SetContainerStyle('top: -100%; opacity: 0;');

        this.game.OnMenuStartButton();
    }
    
    ShowMenu() {
        this.SetContainerStyle('top: 0%; opacity: 1;');
    }

    ShowPressAgain() {
        this.elements["#press-to-start-2"].classList.remove("hidden");
    }
}

class PauseMenu extends HTMLMenu {
    constructor(game, canvas) {
        super(game, "#pauseMenu", "#container", canvas, true, true, true);
    }

    Start() {
        super.Start();

        // this.SetupElements([
        //     "#menuResume"
        // ]);

        this.SetupButtons([
            { selector: "#menuResume", callback: this.ResumeButton.bind(this) }
        ]);
    }

    ResumeButton() {
        this.game.PauseGame(false);
    }
    
    ShowMenu() {
        this.RemoveClassFromContainer("hidden");
        this.SetContainerStyle('top: 0%; opacity: 1;');
    }

    HideMenu() {
        this.AddClassToContainer("hidden");
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
        this.RemoveClassFromContainer("hidden");
        this.SetContainerStyle('top: 0%; opacity: 1;');
    }

    HideMenu() {
        this.AddClassToContainer("hidden");
        this.SetContainerStyle('top: -100%; opacity: 0;');
    }
}

class DebugMenu extends HTMLMenu {
    constructor(game, canvas) {
        super(game, "#debugMenu", "#container", canvas, true, true, true);

        this.visible = false;
    }

    Start() {
        super.Start();

        this.container.setAttribute('pointerEvents', 'auto');

        this.SetupElements([
            "#debug-state",
            "#debug-score",
            "#debug-lives",
            "#debug-time",
            "#debug-enemies",
            "#debug-boss",
            "#debug-player-health",
            "#debug-player-pos",
            "#debug-player-boost",
            "#debug-player-invincible"
        ]);

        this.SetupButtons([
            { selector: "#btn-spawn-basic", callback: () => this.SpawnEnemy(0) },
            { selector: "#btn-spawn-kamikaze", callback: () => this.SpawnEnemy(1) },
            { selector: "#btn-spawn-asteroid", callback: () => this.SpawnEnemy(2) },
            { selector: "#btn-spawn-waver", callback: () => this.SpawnEnemy(3) },
            { selector: "#btn-spawn-strafer", callback: () => this.SpawnEnemy(4) },
            { selector: "#btn-spawn-tank", callback: () => this.SpawnEnemy(5) },
            { selector: "#btn-spawn-boss", callback: () => this.SpawnEnemy(6) },
            { selector: "#btn-kill-all-enemies", callback: this.KillAllEnemies.bind(this) },
            { selector: "#btn-add-life", callback: this.AddLife.bind(this) },
            { selector: "#btn-add-score", callback: this.AddScore.bind(this) },
            { selector: "#btn-pause-toggle", callback: this.TogglePause.bind(this) },
            { selector: "#btn-toggle-invincible", callback: this.ToggleInvincible.bind(this) }
        ]);

        if (this.visible)
            this.ShowMenu();
        else
            this.HideMenu();
    }

    Update() {
        // Update game state display
        this.UpdateGameState();
        this.UpdatePlayerInfo();
    }

    UpdateGameState() {
        const stateNames = ["MAIN_MENU", "INTRO", "GAME", "GAME_OVER"];
        this.elements["#debug-state"].textContent = stateNames[this.game.state] || "UNKNOWN";
        this.elements["#debug-score"].textContent = this.game.playerScore || 0;
        this.elements["#debug-lives"].textContent = this.game.lives || 0;

        const secs = Math.floor(this.game.timeSinceStart || 0);
        const ms = Math.floor(((this.game.timeSinceStart || 0) % 1) * 100);
        this.elements["#debug-time"].textContent = 
            String(secs).padStart(2, '0') + ":" + String(ms).padStart(2, '0');

        this.elements["#debug-enemies"].textContent = (this.game.enemies ? this.game.enemies.length : 0);
        this.elements["#debug-boss"].textContent = this.game.currentBoss ? 
            `Yes (HP: ${this.game.currentBoss.life}/${this.game.currentBoss.maxLife})` : "No";
    }

    UpdatePlayerInfo() {
        const player = this.game.player;

        if (!player) {
            this.elements["#debug-player-health"].textContent = "-";
            this.elements["#debug-player-pos"].textContent = "-";
            this.elements["#debug-player-boost"].textContent = "-";
            this.elements["#debug-player-invincible"].textContent = "-";

            return;
        }

        this.elements["#debug-player-health"].textContent = player.life || 0;
        this.elements["#debug-player-pos"].textContent = 
            `(${Math.round(player.position.x)}, ${Math.round(player.position.y)})`;
        
        const boostPercent = Math.round((player.speedBoostFuel || 0) / (player.maxSpeedBoostFuel || 1) * 100);
        this.elements["#debug-player-boost"].textContent = boostPercent + "%";
        
        this.elements["#debug-player-invincible"].textContent = player.invincible ? "ON ✓" : "OFF";
    }

    SpawnEnemy(type) {
        if (this.game.state !== GAME_STATE.GAME)
            return;

        // Spawn at random spawn point
        const spawnPoint = this.game.enemiesSpawnPoints[
            RandomBetweenInt(0, this.game.enemiesSpawnPoints.length - 1)
        ];
        
        this.game.SpawnEnemy(type, spawnPoint);
    }

    KillAllEnemies() {
        if (!this.game.enemies)
            return;

        const enemies = [...this.game.enemies];
        for (let enemy of enemies) {
            this.game.EnemyKilled(enemy);
        }
    }

    AddLife() {
        this.game.lives = Math.min(this.game.lives + 1, 10);
        this.UpdateGameState();
    }

    AddScore() {
        this.game.playerScore = (this.game.playerScore || 0) + 1000;
        if (this.game.playerScoreLabel)
            this.game.playerScoreLabel.text = this.game.playerScore;

        this.UpdateGameState();
    }

    TogglePause() {
        this.game.PauseGame(!this.game.gamePaused);
    }

    ToggleInvincible() {
        if (this.game.player) {
            this.game.player.invincible = !this.game.player.invincible;
            this.UpdatePlayerInfo();
        }
    }

    ShowMenu() {
        this.RemoveClassFromContainer("hidden");
    }

    HideMenu() {
        this.AddClassToContainer("hidden");
    }

    Toggle() {
        this.visible = !this.visible;
        
        if (this.visible)
            this.ShowMenu();
        else
            this.HideMenu();
    }
}