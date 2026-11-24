const Direction = PacMonConstants.DIRECTIONS;

// #region Visual Game View (spark.js)

class PacMon extends Game {
    constructor(renderer) {
        super(renderer);

        this.graphicAssets = {
            spritesheet: {
                path: "src/examples/mspacmonvsghosts/assets/pacman.png",
                img: null,
                bgColor: "#000000",
                atlasJsonPath: "src/examples/mspacmonvsghosts/assets/pacman.json",
                atlas: null
            }
        };

        this.spriteAtlas = null;
        this.config.imageSmoothingEnabled = false;

        this.nodeSize = 2;
        this.mazePosition = new Vector2(8, 64);

        /** @type {MazeGraph|null} */
        this.mazeGraph = null;
        /** @type {PacManState|null} */
        this.state = null;

        this.pacManControllers = {
            human: new HumanPacManController(),
            starter: new StarterPacManController()
        };
        this.ghostControllers = {
            starter: new StarterGhostsController(),
            legacy: new LegacyGhostsController()
        };
        this.pacManController = this.pacManControllers.human;
        this.ghostsController = this.ghostControllers.legacy;

        this.tickDuration = PacMonConstants.DELAY / 1000; // 0.04s (25 ticks/sec)
        this.tickAccumulator = 0;

        this.background = null;
        this.scoreTextLabel = null;
        this.levelTextLabel = null;
        this.controllersTextLabel = null;
        this.gameOverTextLabel = null;
        this.lifeSprite = null;

        this.pacmanSprite = null;
        this.ghostSprites = [];
        this.pillSprites = [];
        this.powerPelletSprites = [];

        drawStats = false;
    }

    Start() {
        super.Start();

        this.spriteAtlas = new SpriteAtlas(this.graphicAssets.spritesheet.atlas);
        const img = this.graphicAssets.spritesheet.img;

        this.background = new SpriteSection(
            img,
            new Vector2(this.mazePosition.x, this.mazePosition.y),
            0,
            1,
            this.spriteAtlas.get("bg_lv1")
        );

        this.mazeGraph = new MazeGraph(
            PacMonData.level1Maze,
            PacMonData.level1Data,
            this.nodeSize
        );

        this.scoreTextLabel = new TextLabel(
            "SCORE: 0",
            new Vector2(10, 14),
            "16px Courier New",
            Color.white,
            "left",
            "top"
        );
        this.levelTextLabel = new TextLabel(
            "LVL: 1",
            new Vector2(160, 14),
            "16px Courier New",
            Color.white,
            "left",
            "top"
        );
        this.controllersTextLabel = new TextLabel(
            "",
            new Vector2(10, 322),
            "12px Courier New",
            Color.FromRGB(180, 180, 180),
            "left",
            "top"
        );
        this.gameOverTextLabel = new TextLabel(
            "GAME OVER - Press R to Restart",
            new Vector2(120, 188),
            "14px Courier New",
            Color.yellow,
            "center",
            "middle"
        );
        this.lifeSprite = new SpriteSection(
            img,
            Vector2.Zero(),
            0,
            1,
            this.spriteAtlas.get("pm_r_1") || new Rect(471, 0, 16, 16)
        );

        this._initVisualEntities();
        this.ResetGame();
    }

    _initVisualEntities() {
        const img = this.graphicAssets.spritesheet.img;

        // Pill sprites indexed by pillIndex
        this.pillSprites = [];
        for (let i = 0; i < this.mazeGraph.numPills; i++) {
            const p = this.mazeGraph.nodeToPixel(this.mazeGraph.pillNodeIndices[i], this.mazePosition);
            const pill = new Pill(new Vector2(p.x, p.y), img);
            this.AddGameObject(pill);
            this.pillSprites.push(pill);
        }

        // Power pellet sprites indexed by powerPillIndex
        this.powerPelletSprites = [];
        for (let i = 0; i < this.mazeGraph.numPowerPills; i++) {
            const p = this.mazeGraph.nodeToPixel(this.mazeGraph.powerPillNodeIndices[i], this.mazePosition);
            const pellet = new PowerPellet(new Vector2(p.x, p.y), img);
            this.AddGameObject(pellet);
            this.powerPelletSprites.push(pellet);
        }

        // 4 Ghost visual objects
        const ghostConfigs = [
            { prefix: "blinky", fallbackTint: null },
            { prefix: "pinky",  fallbackTint: null },
            { prefix: "inky",   fallbackTint: Color.FromRGB(0, 255, 255) },
            { prefix: "clyde",  fallbackTint: Color.FromRGB(255, 184, 82) }
        ];
        this.ghostSprites = [];
        for (let g = 0; g < PacMonConstants.GHOST_COUNT; g++) {
            const ghostSprite = new GhostView(img, this.spriteAtlas, ghostConfigs[g]);
            this.AddGameObject(ghostSprite);
            this.ghostSprites.push(ghostSprite);
        }

        // Pac-Man visual object
        this.pacmanSprite = new PacmanView(img, this.spriteAtlas);
        this.AddGameObject(this.pacmanSprite);
    }

    ResetGame(seed = Date.now()) {
        this.state = new PacManState(this.mazeGraph, seed);
        this.pacManController.Reset();
        this.tickAccumulator = 0;
        this._syncViewFromState();
    }

    Update(deltaTime) {
        // Switch Pac-Man controller: [1] Human, [2] StarterPacMan
        if (Input.IsKeyDown(KEY_1)) {
            this.pacManController = this.pacManControllers.human;
            this.pacManController.Reset();
            this._syncViewFromState();
        } else if (Input.IsKeyDown(KEY_2)) {
            this.pacManController = this.pacManControllers.starter;
            this._syncViewFromState();
        }

        // Switch Ghost controller: [3] StarterGhosts, [4] LegacyGhosts
        if (Input.IsKeyDown(KEY_3)) {
            this.ghostsController = this.ghostControllers.starter;
            this._syncViewFromState();
        } else if (Input.IsKeyDown(KEY_4)) {
            this.ghostsController = this.ghostControllers.legacy;
            this._syncViewFromState();
        }

        // Toggle graph / junction debug overlay with G
        if (Input.IsKeyDown(KEY_G)) {
            debugMode = !debugMode;
        }

        // Restart with R
        if (Input.IsKeyDown(KEY_R)) {
            this.ResetGame();
            return;
        }

        // Poll human input every render frame so quick taps are never missed between ticks
        this.pacManController.PollInput();

        // Advance simulation on fixed deterministic ticks
        if (!this.state.isGameOver()) {
            this.tickAccumulator += deltaTime;
            while (this.tickAccumulator >= this.tickDuration && !this.state.isGameOver()) {
                this.tickAccumulator -= this.tickDuration;
                const pacDir = this.pacManController.getMove(this.state);
                const ghostDirs = this.ghostsController.getMove(this.state);
                this.state.advanceGame(pacDir, ghostDirs);
            }
            this._syncViewFromState();
        }

        // Update sprite animations
        super.Update(deltaTime);
    }

    _syncViewFromState() {
        const s = this.state;
        const maze = s.maze;

        // Sync pills & power pellets visibility
        for (let i = 0; i < this.pillSprites.length; i++) {
            this.pillSprites[i].active = s.isPillStillAvailable(i);
        }
        for (let i = 0; i < this.powerPelletSprites.length; i++) {
            this.powerPelletSprites[i].active = s.isPowerPillStillAvailable(i);
        }

        // Sync Pac-Man
        const pacPos = maze.nodeToPixel(s.getPacmanCurrentNodeIndex(), this.mazePosition);
        this.pacmanSprite.position.Set(pacPos.x, pacPos.y);
        this.pacmanSprite.SetDirection(s.getPacmanLastMoveMade());
        this.pacmanSprite.active = !s.isGameOver();

        // Sync Ghosts
        for (let g = 0; g < this.ghostSprites.length; g++) {
            const view = this.ghostSprites[g];
            const inLair = s.getGhostLairTime(g) > 0;
            view.active = !inLair;
            if (!inLair) {
                const pos = maze.nodeToPixel(s.getGhostCurrentNodeIndex(g), this.mazePosition);
                view.position.Set(pos.x, pos.y);
                view.SyncState(
                    s.getGhostLastMoveMade(g),
                    s.getGhostEdibleTime(g),
                    s.getTotalTime()
                );
            }
        }

        // Sync HUD
        this.scoreTextLabel.text = "SCORE: " + s.getScore();
        this.levelTextLabel.text = "LVL: " + (s.getCurrentLevel() + 1);
        this.controllersTextLabel.text = `[1/2] PacMan: ${this.pacManController.name} | [3/4] Ghosts: ${this.ghostsController.name} | [R] Reset | [G] Graph`;
    }

    Draw() {
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);
        this.background.DrawBasic(this.renderer);

        // Draw active game objects
        super.Draw();

        // Draw graph & junctions only in debug mode (press G to toggle)
        if (debugMode) {
            this.mazeGraph.Draw(this.renderer, this.mazePosition);
        }

        this.scoreTextLabel.Draw(this.renderer);
        this.levelTextLabel.Draw(this.renderer);
        this.controllersTextLabel.Draw(this.renderer);

        const lives = this.state.getPacmanNumberOfLivesRemaining();
        for (let i = 0; i < lives; i++) {
            this.lifeSprite.DrawBasicAt(this.renderer, 16 + (18 * i), 38);
        }

        if (this.state.isGameOver()) {
            this.renderer.DrawFillBasicRectangle(8, 172, 224, 32, Color.FromRGBA(0, 0, 0, 200));
            this.gameOverTextLabel.Draw(this.renderer);
        }
    }
}

// #endregion

// #region Visual Entities

class PacmanView extends SSAnimationObjectComplex {
    constructor(img, spriteAtlas) {
        super(
            Vector2.Zero(),
            0,
            1,
            img,
            [
                [spriteAtlas.get("pm_u_0"), spriteAtlas.get("pm_u_1"), spriteAtlas.get("pm_u_2")],
                [spriteAtlas.get("pm_r_0"), spriteAtlas.get("pm_r_1"), spriteAtlas.get("pm_r_2")],
                [spriteAtlas.get("pm_b_0"), spriteAtlas.get("pm_b_1"), spriteAtlas.get("pm_b_2")],
                [spriteAtlas.get("pm_l_0"), spriteAtlas.get("pm_l_1"), spriteAtlas.get("pm_l_2")]
            ],
            [0.08, 0.08, 0.08, 0.08]
        );
        this._animDir = -1;
    }

    Start() {
        super.Start();
        this.SetDirection(Direction.LEFT);
    }

    SetDirection(dir) {
        if (dir >= 0 && dir <= 3 && this._animDir !== dir) {
            this._animDir = dir;
            this.PlayAnimationLoop(dir, false);
        }
    }
}

class GhostView extends SSAnimationObjectComplex {
    constructor(img, spriteAtlas, config) {
        const hasOwnSprites = spriteAtlas.get(`${config.prefix}_u_0`) !== null;
        const p = hasOwnSprites ? config.prefix : "blinky";

        super(
            Vector2.Zero(),
            0,
            1,
            img,
            [
                [spriteAtlas.get(`${p}_u_0`), spriteAtlas.get(`${p}_u_1`)],
                [spriteAtlas.get(`${p}_r_0`), spriteAtlas.get(`${p}_r_1`)],
                [spriteAtlas.get(`${p}_b_0`), spriteAtlas.get(`${p}_b_1`)],
                [spriteAtlas.get(`${p}_l_0`), spriteAtlas.get(`${p}_l_1`)]
            ],
            [0.125, 0.125, 0.125, 0.125]
        );

        this.baseTint = hasOwnSprites ? null : config.fallbackTint;
        this.tint = this.baseTint;
        this._animDir = -1;
    }

    Start() {
        super.Start();
        this.PlayAnimationLoop(Direction.LEFT, true);
        this._animDir = Direction.LEFT;
    }

    SyncState(dir, edibleTime, totalTime) {
        if (dir >= 0 && dir <= 3 && this._animDir !== dir) {
            this._animDir = dir;
            this.PlayAnimationLoop(dir, false);
        }

        // Visual feedback for edible mode until dedicated frightened sprites are mapped in pacman.json
        if (edibleTime > 0) {
            const flash = edibleTime <= PacMonConstants.EDIBLE_ALERT && ((totalTime >> 2) & 1) === 1;
            this.tint = flash ? Color.white : Color.FromRGB(50, 90, 255);
        } else {
            this.tint = this.baseTint;
        }
    }
}

class Pill extends SpriteObject {
    constructor(position, img) {
        super(position, 0, 1, img);
    }

    Draw(renderer) {
        if (!this.active) return;
        super.DrawSection(renderer, 8, 8, 8, 8);
    }
}

class PowerPellet extends SpriteObject {
    constructor(position, img) {
        super(position, 0, 1, img);
    }

    Draw(renderer) {
        if (!this.active) return;
        super.DrawSection(renderer, 8, 24, 8, 8);
    }
}

// #endregion
