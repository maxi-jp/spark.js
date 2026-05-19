const GAME_STATE = {
    MAIN_MENU: 0,
    INTRO: 1,
    GAME: 2,
    GAME_OVER: 3
}

const SPAWN_MODE = {
    RANDOM: 0,
    FROM_XML: 1
}

class TTSC extends Game {

    get state() {
        return this._state;
    }
    set state(value) {
        this._lastState = this._state;
        this._state = value;
    }

    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth: 1280,
            screenHeight: 720,
            fillWindow: true,
            mobileSupport: true
        });

        this.graphicAssets = {
            ships: {
                path: "src/examples/tts/assets/simpleSpace_sheet.png",
                img: null
            },
            crosshair: {
                path: "src/examples/tts/assets/crosshair060.png",
                img: null
            }
        };        


        this.gamePaused = false;

        // background gradient
        this.bgGrad = null;

        this.player = null;
        this.lives = 5;
        this.enemies = [];
        this.camera = null;

        this.sceneLimits = new Rectangle(Vector2.Zero(), 1200, 640, Color.white, true, 2);

        this.timeSinceStart = 0;
        this.timeToSpawnEnemy = 1;
        this.timeToSpawnEnemyAux = 0;
        this.enemiesSpawnPoints = [
            new Vector2(50, 50),
            new Vector2(this.sceneLimits.width - 50, 50),
            new Vector2(50, this.sceneLimits.height - 50),
            new Vector2(this.sceneLimits.width - 50, this.sceneLimits.height - 50),
            new Vector2(this.sceneLimits.width / 2, 50),
            new Vector2(this.sceneLimits.width / 2, this.sceneLimits.height - 50)
        ]

        // UI and Menu related variables

        this.mainMenu = null;
        this.pauseMenu = null;

        this.playerScore = 0;
        this.playerScoreLabel = new TextLabel("0", new Vector2(this.screenWidth / 2, 50), "30px futuristic", Color.white, "center", "bottom");        

        this.playerSpeedBar = new SpeedMultBar(new Vector2(this.screenWidth - 120, 20), 100, 20);

        // Player lives UI
        this.playerLivesLabel = new TextLabel("Ships:", new Vector2(this.screenWidth * 2 - 370, 50), "30px futuristic", Color.white, "center", "bottom");
        this.playerLives = [];

    }

    _ParseXml() {
        fetch('/src/examples/tts/xml/levels.xml')
        .then(response => response.text())
        .then(str => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(str, "application/xml");
                        
            const levels = xml.getElementsByTagName("level");
            // TODO separate levels if more than 1
            const spawnsXml = levels[0];
            const spawnsArray = [...spawnsXml.getElementsByTagName("spawn")];
            this.spawns = []

            
            // parse xml objects to array
            for (let i = 0; i < spawnsArray.length; i++) {
                let spawn = 
                {   
                    time: parseInt(spawnsArray[i].getElementsByTagName("time")[0].textContent),
                    enemies: []
                }
                let enemies = spawnsArray[i].getElementsByTagName("enemy")
                for (let j = 0; j < enemies.length; j++) {
                    const enemyXml = enemies[j];
                    const position = enemyXml.getElementsByTagName("position")[0];                    
                    const type = parseInt(enemyXml.getElementsByTagName("type")[0].textContent);
                    let enemy =
                    {
                        x: parseInt(position.getElementsByTagName("x")[0].textContent),
                        y: parseInt(position.getElementsByTagName("y")[0].textContent),
                        type: type
                    }
                    spawn.enemies.push(enemy)                    
                }
                this.spawns.push(spawn)                       
            }
            
            // TODO maybe at previous parse insert ordered instead of ordering afterwards.
            // orders from less time of spawn to high
            this.spawns.sort(function(a,b){
                if (a.time < b.time)
                    return -1;
                if (b.time < a.time)
                    return 1;
                return 0;
            })
            
        })
        .catch(err => console.error(err));
    }

    Start() {
        super.Start();

        this.state = GAME_STATE.MAIN_MENU;
        this.spawnMode = SPAWN_MODE.FROM_XML; // Change this to required spawn mode
        
        // configure background gradient
        this.bgGrad = new LinearGradient(this.renderer, new Vector2(0, 1), [
            [0, "#191200"],
            [0.1, "#000000"],
            [0.35, "#07073e"],
            [0.95, "#22375e"],
            [1, "#274f98"]
        ]);                                
        
        // Initialize menus
        this.mainMenu = new MainMenu(this, canvas);
        this.mainMenu.Start();

        this.pauseMenu = new PauseMenu(this, canvas);
        this.pauseMenu.Start();
        this.pauseMenu.HideMenu();

        // Setup events to automatically pause the game when the window loses focus or the tab becomes inactive
        this.SetupPauseEvents();
        
        if (this.spawnMode == SPAWN_MODE.FROM_XML)
            this._ParseXml();
    }

    StartLvl() {
        this.state = GAME_STATE.INTRO;

        // Player's input configuration --------------------
        // Gamepad rumble
        Input.RegisterRumble("Damage", 0.4, 0.2, 150, 0);
        Input.RegisterRumble("EnemyKilled", 0, 0.25, 100, 0);
        // Enable player input for the game (disable in intro and game over states)
        this.EnablePlayerInput(true);
        // Pause action, put here to be available in the intro and game states, but only used in the game state
        Input.RegisterAction("Pause", [
            { type: 'key', code: KEY_P },
            { type: 'key', code: KEY_ESCAPE },
            { type: 'gamepad', code: 'START' }
        ]);                  

        // initialize the player in the center of the scene limits
        this.player = new TTSCPlayer(new Vector2(this.sceneLimits.width / 2, this.sceneLimits.height / 2), 0, 1, this.graphicAssets.ships.img, this.sceneLimits);
        this.gameObjects.push(this.player);        

        // configure the camera to follow the player
        this.camera = new FollowCamera(Vector2.Zero(), this.player, -200, 140, -100, 40, 5);
        this.camera.Start();

        this.player.Start();   
            
        // Initialize player lives UI
        for (let i = 0; i < this.lives; i++) {
            this.playerLives.push(new Sprite(this.graphicAssets.ships.img, new Vector2(this.screenWidth - 265 + i * 30, 33), 0, 0.5, 1));
        }
                
        if (this.state === GAME_STATE.INTRO) {
            this.camera.scale = 10;
            this.player.active = false;
        }        

        // initialize the starting enemies array
        this.enemies = [];
    }

    _ResetGame() {
        // reset player position and state
        this.player.position.Set(this.sceneLimits.width / 2, this.sceneLimits.height / 2);
        this.lives = 5;
        this.playerScore = 0;
        this.playerScoreLabel.text = this.playerScore;
        this.gameObjects.splice(this.gameObjects.indexOf(this.player), 1);  
        this.player.Destroy();
        this.player = null;

        this.timeToSpawnEnemy = 1;
        
        // reset the camera
        this.camera.position.Set(0, 0);
        this.camera.scale = 1;
        this.camera.rotation = 0;

        // destroy all existing enemies
        for (let enemy of this.enemies) {
            this.Destroy(enemy);
        }
        this.enemies = [];

        this.mainMenu.ShowMenu();
        this.EnablePlayerInput(false);
        this.state = GAME_STATE.MAIN_MENU;
        console.log("Game reset to main menu");
    }

    EnablePlayerInput(value = true) {
        if (value) {
            // Shot action
            Input.RegisterAction("Shot", [
                { type: 'key', code: KEY_SPACE },
                { type: 'mouse' },
                { type: 'gamepad', code: 'RT' }
            ]);
            // Horizontal axis
            Input.RegisterAxis("MoveHorizontal", [
                { type: 'key', positive: KEY_D, negative: KEY_A },
                { type: 'key', positive: KEY_RIGHT, negative: KEY_LEFT },
                { type: 'gamepadaxis', stick: 'LS', axis: 0 },
                { type: 'gamepadbutton', positive: 'DPAD_RIGHT', negative: 'DPAD_LEFT' },
                { type: 'virtualjoystick', id: 'move', axis: 0 }
            ]);
            // Vertical axis
            Input.RegisterAxis("MoveVertical", [
                { type: 'key', positive: KEY_S, negative: KEY_W },
                { type: 'key', positive: KEY_DOWN, negative: KEY_UP },
                { type: 'gamepadaxis', stick: 'LS', axis: 1 },
                { type: 'gamepadbutton', positive: 'DPAD_DOWN', negative: 'DPAD_UP' },
                { type: 'virtualjoystick', id: 'move', axis: 1 }
            ]);
            
            // Virtual on-screen joysticks for touch devices.
            // Left stick  → movement (bound to the 'move' axes in TTSCPlayer).
            // Right stick → aiming + auto-fire (read directly in TTSCPlayer.Update).
            if (mobileWithTouchScreen) {
                const jsRadius = Math.round(Math.min(this.screenWidth, this.screenHeight) * 0.12);
                const margin = jsRadius + 30;
                Input.RegisterVirtualJoystick('move',
                    new VirtualJoystick(margin, this.screenHeight - margin, jsRadius));
                Input.RegisterVirtualJoystick('aim',
                    new VirtualJoystick(this.screenWidth - margin, this.screenHeight - margin, jsRadius));
            }
        }
        else {
            Input.UnregisterAction("Shot");
            Input.UnregisterAxis("MoveHorizontal");
            Input.UnregisterAxis("MoveVertical");

            if (mobileWithTouchScreen) {
                Input.RemoveVirtualJoystick('move');
                Input.RemoveVirtualJoystick('aim');
            }
        }
    }

    // Pauses or resumes the game based on the provided value. 
    // When pausing, it shows the pause menu and disables input. 
    // When resuming, it hides the pause menu and re-enables input.
    PauseGame(value = true) {
        if (this.state === GAME_STATE.GAME && this.gamePaused !== value) {            
                this.gamePaused = value;
                if (value) {
                    this.pauseMenu.ShowMenu();                    
                }else {
                    this.pauseMenu.HideMenu();
                   
                }
                 this.EnablePlayerInput(!value);            
        }
    }

    SetupPauseEvents() {
        const pauseIfNeeded = () => {
            if (this.state === GAME_STATE.GAME && !this.gamePaused) {
                this.PauseGame(true);
            }
        };

        window.addEventListener('blur', pauseIfNeeded);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pauseIfNeeded();
            }
        });
    }

    Update(deltaTime) {
        switch (this.state) {
            case GAME_STATE.MAIN_MENU:
                super.Update(deltaTime);
                if (this.lastState !== GAME_STATE.MAIN_MENU) {
                    this.mainMenu.ShowMenu();
                }
                break;
            case GAME_STATE.INTRO:
                super.Update(deltaTime);
                this._updateIntro(deltaTime);
                break;
            case GAME_STATE.GAME:
                if (!this.gamePaused) {
                    super.Update(deltaTime);
                    this._updateGame(deltaTime);
                    this.camera.Update(deltaTime);
                }
                if (Input.GetActionDown("Pause")) {                    
                    this.PauseGame(!this.gamePaused);
                }
                break;
            case GAME_STATE.GAME_OVER:
                super.Update(deltaTime);
                if (this._lastState !== GAME_STATE.GAME_OVER) {
                    // reset the game to the main menu
                    this._ResetGame();
                }
                break;
        }
    }

    _updateIntro(deltaTime) {
        
        if (this.camera.scale <= 1) {
            this.camera.scale = 1;
            this.camera.rotation += 5 * deltaTime;
            if ((this.camera.rotation % PI2) <= 0.1) {
                // end of intro, start the game
                this.EnablePlayerInput(true);
                this.camera.rotation = 0;
                this.state = GAME_STATE.GAME;
                this.player.active = true;
            }
        }
        else {
            this.camera.scale -= 10 * deltaTime;
            this.camera.rotation += 4 * deltaTime;
        }
    }

    _updateGame(deltaTime) {

        if (this.spawnMode == SPAWN_MODE.RANDOM){
            // ramdom enemy spawning
            this.timeToSpawnEnemyAux += deltaTime;
            if (this.timeToSpawnEnemyAux >= this.timeToSpawnEnemy) {
                this.timeToSpawnEnemyAux = 0;
                this.SpawnRandomEnemy();
            }
        }
        else if (this.spawnMode == SPAWN_MODE.FROM_XML){
            // Update time since start
            this.timeSinceStart += deltaTime;
            // Check list of spawns at level (doing only level 1 TODO more levels)
            if (this.spawns && this.spawns.length > 0){
                if (this.spawns[0].time < this.timeSinceStart){
                    const enemies = this.spawns[0].enemies;
                    for (let i = 0; i < enemies.length; i++) {
                        const enemy = enemies[i];
                        this.SpawnEnemy(enemy.type,new Vector2(enemy.x, enemy.y))                        
                    }
                    this.spawns.shift() // Remove first element
                }
            }
        }
    }

    Draw() {
        // background
        this.renderer.DrawGradientRectangle(0, 0, this.screenWidth, this.screenHeight, this.bgGrad);

        if (this.camera)
            this.camera.PreDraw(this.renderer);

        // background grid
        // horizontal lines
        const verticalStep = 50;
        const horizontalLines = this.sceneLimits.height / verticalStep;
        for (let i = 0; i < horizontalLines; i++) {
            this.renderer.DrawLine(this.sceneLimits.position.x, this.sceneLimits.position.y + verticalStep * i, this.sceneLimits.position.x + this.sceneLimits.width, this.sceneLimits.position.y + verticalStep * i, Color.grey, 1);
        }
        // vertical lines
        const horizontalStep = 50;
        const verticalLines = this.sceneLimits.width / horizontalStep;
        for (let i = 0; i < verticalLines; i++) {
            this.renderer.DrawLine(this.sceneLimits.position.x + horizontalStep * i, this.sceneLimits.position.y, this.sceneLimits.position.x + horizontalStep * i, this.sceneLimits.position.y + this.sceneLimits.height, Color.grey, 1);
        }

        this.sceneLimits.Draw(renderer);

        // draw the game objects
        super.Draw();

        if (this.camera)
            this.camera.PostDraw(this.renderer);

        this.playerScoreLabel.Draw(renderer);

        this.playerSpeedBar.Draw(renderer);

        this.playerLivesLabel.Draw(renderer);

        // Draw player lives
        if (this.playerLives.length > 0) {
            for (let i = 0; i < this.lives; i++) {
                this.playerLives[i].DrawSection(renderer, 52, 244, 48, 48);
            }
        }

        // Virtual controls are drawn last so they always appear on top, in screen space.
        VirtualControlls.Draw(this.renderer);
    }

    AddEnemy(enemy) {
        this.enemies.push(enemy);
        this.gameObjects.push(enemy);
        enemy.Start();
    }

    SpawnRandomEnemy() {
        const random = Math.random();
        let type = random < 0.33 ? 0 : random < 0.66 ? 1 : 2;
        const spawnPoint = this.enemiesSpawnPoints[RandomBetweenInt(0, this.enemiesSpawnPoints.length - 1)];        
        
        this.SpawnEnemy(type, spawnPoint)

        this.timeToSpawnEnemy *= 0.97;
        if (this.timeToSpawnEnemy < 0.15)
            this.timeToSpawnEnemy = 0.15
        
    }
    
    SpawnEnemy(type, spawnPoint){
        let enemy = null;
        switch (type) {
            case 0: // Normal
                enemy = new Enemy(spawnPoint, this.graphicAssets.ships.img, this.player, this.sceneLimits);
                break;
            case 1: // Kamikaze
                enemy = new EnemyKamikaze(spawnPoint, this.graphicAssets.ships.img, this.player, this.sceneLimits);
                break;
            case 2: // Asteroid
                enemy = new EnemyAsteroid(spawnPoint, this.graphicAssets.ships.img, this.player, this.sceneLimits);
                break;        
            default:
                break;
        }

        if (enemy)
            this.AddEnemy(enemy)
    }

    EnemyKilled(enemy) {
        this.playerScore += enemy.score;
        this.playerScoreLabel.text = this.playerScore;

        this.camera.Shake(0.2, 200, 1.5);
        // this.camera.ZoomPunch(1.06, 0.2);
        Input.ExecuteRumble("EnemyKilled");

        this.RemoveEnemy(enemy);
    }

    RemoveEnemy(enemy) {
        const enemyIndex = this.enemies.indexOf(enemy);
        if (enemyIndex !== -1)
            this.enemies.splice(enemyIndex, 1);
        this.Destroy(enemy);
    }

    EnemyCollidesWithPlayer(enemy) {
        this.lives--;

        if (this.lives <= 0) {
            this.lives = 0;
            this.state = GAME_STATE.GAME_OVER;
            console.log("Game Over");
        }

        Input.ExecuteRumble("Damage");

        this.camera.Shake(0.3, 200, 4);
        this.camera.ZoomPunch(0.95, 0.45);

        this.RemoveEnemy(enemy);
    }

    OnMenuStartButton() {
        this.StartLvl();
    }
}

class MainMenu extends HTMLMenu {
    constructor(game, canvas) {
        super(game, "#mainMenu", "#container", canvas, true);
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
        super(game, "#pauseMenu", "#container", canvas, true);
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
        this.SetContainerStyle('top: 0%; opacity: 1; pointer-events: auto;');
    }
}

window.onload = () => {
    Init(TTSC);
}