var FloppyDerpGameState = {
    menu: 0,
    playing: 1,
    gameover: 2
}

var FloppyDerpMenuState = {
    init: 0,
    credits: 1,
    static: 2
}

class FloppyDerp extends Game {
    constructor(renderer) {
        super(renderer);

        this.showDebug = false;
        this.graphicAssets = {
            player: {
                path: "./src/examples/floppyderp/assets/player_sprites.png",
                img: null
            },
            title: {
                path: "./src/examples/floppyderp/assets/Title_logo.png",
                img: null
            },
            credits: {
                path: "./src/examples/floppyderp/assets/Title_credits.png",
                img: null
            },
            gameover: {
                path: "./src/examples/floppyderp/assets/game_over.png",
                img: null
            },
            soundMute: {
                path: "./src/examples/floppyderp/assets/sound_mute.png",
                img: null
            },
            tube1: {
                path: "./src/examples/floppyderp/assets/tube1.png", // top sprite of the tube
                img: null
            },
            tube2: {
                path: "./src/examples/floppyderp/assets/tube2.png", // bottom sprite of the tube
                img: null
            },
            tube3: {
                path: "./src/examples/floppyderp/assets/tube3.png", // middle sprite of the tube
                img: null
            }
        };

        this.audioAssets = {
            jump: {
                path: "./src/examples/floppyderp/assets/jump.m4a",
                audio: null
            },
            dead: {
                path: "./src/examples/floppyderp/assets/dead.m4a",
                audio: null
            }
        };

        this.audioJump; // jump audio
        this.audioDead; // death audio

        this.actualScore = 0;
        this.maxScore = 0;
        this.newRecord = false; // flag that indicates the record was reached the last game

        this.gravityValue = 800;    // gravity strengh
        this.gravityAc = 1.8;       // aceleration for the gravity
        this.scrollVelocity = 250.0;  // horizontal scroll speed
        this.initialPlayerPosition = Vector2.Zero(); // Initial player position
        this.timeSinceLastJump = 0; // elapsed time since the last jump
        this.jumpsCount = 0;

        this.tubeGap = 120;     // pixeles del hueco entre tubos
        this.tubeGapYMin = 100; // posición inferior mínima del hueco entre tubos
        this.tubeGapYMax = this.screenHeight - this.tubeGapYMin; // posición superior máxima del hueco
        this.tubeGapDif = this.tubeGapYMax - this.tubeGapYMin; // margen en el que puede situarse el próximo hueco

        this.tubeSpawnMin = 0.75; // min time (in seconds) to spawn a new pair of tubes
        this.tubeSpawnMax = 1.25; // max time (in seconds) to spawn a new pair of tubes
        this.tubeSpawnDif = this.tubeSpawnMax - this.tubeSpawnMin;
        this.nextTubeSpawn = 0.0; // next time a new pair of tubes will spawn

        // background colors
        this.bgColors = [
            new Color(0.5, 0, 1),
            new Color(0, 1, 1),
            new Color(1, 0.77, 0)
        ]
        this.bgColorMixed = Color.Black();
        this.bgColorVar = 0.0; // color mix in the current step
        this.bgColorStep = 0; // mix step, 0: 1-2, 1: 2-3, 2: 3-0
        this.bgColorVarVelocity = 1; // color variation speed
        this.bgGradient = null; // background LinearGradient object

        this.gameState = FloppyDerpGameState.menu;
        this.menuState = FloppyDerpMenuState.init;

        // game objects
        this.player = null;
        this.tubes = [];

        // UI sprites and labels
        this.titleSprite = null;
        this.creditsSprite = null;
        this.gameoverSprite = null;
        this.soundMuteSprite = null;

        this.scoreLabel = null;
        this.newRecordLabel = null;
    }

    Start() {
        super.Start();

        this.screenWidth = 320;
        this.screenHeight = 480;

        this.initialPlayerPosition.Set(36, this.screenHalfHeight);
        this.player = new FloppyDerpPlayer(this.initialPlayerPosition, this.graphicAssets.player.img);
        this.AddGameObject(this.player);

        // reset game state variables
        this.actualScore = 0;
        this.timeSinceLastJump = 0;
        this.jumpsCount = 0;
        this.nextTubeSpawn = 0.0;
        this.bgColorVar = 0.0;
        this.bgColorStep = 0;
        this.bgGradient = new LinearGradient(this.renderer, new Vector2(0, 1), [
            [ 0.0, Color.FromHex('#040311') ],
            [ 0.05, Color.Black() ],
            [ 1.0, this.bgColorMixed ]
        ]);

        this.tubes = [];
        
        this.titleSprite = new SpriteObject(new Vector2(this.screenHalfWidth, -this.graphicAssets.title.img.height), 0, 1, this.graphicAssets.title.img);
        this.creditsSprite = new SpriteObject(new Vector2(this.screenHalfWidth, -this.graphicAssets.credits.img.height), 0, 1, this.graphicAssets.credits.img);
        this.gameoverSprite = new SpriteObject(new Vector2(this.screenHalfWidth, this.screenHalfHeight - 92), 0, 1, this.graphicAssets.gameover.img);
        this.soundMuteSprite = new SpriteObject(new Vector2(this.screenWidth - 40, this.screenHeight - 40), 0, 1, this.graphicAssets.soundMute.img);

        this.scoreLabel = new TextLabel("Score: " + this.actualScore, new Vector2(this.screenWidth - 8, 6), "18px Arial", "white", "right", "top", false);
        this.newRecordLabel = new TextLabel("New Record!!! " + this.actualScore, new Vector2(this.screenHalfWidth, this.screenHalfHeight), "24px Arial", "white", "center", "bottom", false);

        this.gameState = FloppyDerpGameState.menu;
        this.menuState = FloppyDerpMenuState.init;
    }

    Update(deltaTime) {
        //super.Update(deltaTime);

        // mute/unmute
        let soundSpriteClicked = false;
        if (Input.IsKeyDown(KEY_M) ||
            Input.IsMouseDown() && CheckPointInsideRectangle(Input.mouse.x, Input.mouse.y, this.soundMuteSprite.position.x - 16, this.soundMuteSprite.position.y - 16, 32, 32)) {
            this.audioActive = !this.audioActive;
            soundSpriteClicked = true;
        }

        switch(this.gameState) {
            case 0: // menu
                this.UpdateMenu(deltaTime);

                if ((Input.IsMouseDown() && !soundSpriteClicked) || Input.IsKeyDown(KEY_SPACE)) {
                    // start the game!
                    this.gameState = 1;
                }
                break;
                
            case 1: // game
                this.nextTubeSpawn -= deltaTime;

                if (this.nextTubeSpawn <= 0) {
                    // calculate the Y spawn point
                    let randomGap = Math.random() * this.tubeGapDif;
                    let gapY = this.tubeGapYMin + randomGap;
                    let tube1Y = gapY + this.tubeGap / 2;
                    let tube2Y = gapY - this.tubeGap / 2 - this.graphicAssets.tube2.img.height;
                    
                    // spawn a new tube
                    const newTube = new FloppyDerpTube(new Vector2(this.screenWidth, gapY), this.tubeGap, tube1Y, tube2Y, this.graphicAssets.tube1.img, this.graphicAssets.tube2.img, this.graphicAssets.tube3.img);
                    this.tubes.push(newTube);
                    
                    // calculate the new nextTubeSpawn value
                    let randomSpawn = Math.random() * this.tubeSpawnDif;
                    this.nextTubeSpawn = this.tubeSpawnMin + randomSpawn;
                }
                
                // player update
                this.player.Update(deltaTime);
                
                // tubes update
                for (let i = 0; i < this.tubes.length; i++)
                    this.tubes[i].Update(deltaTime);
                
                if (this.tubes.length > 0) {
                    const tubeWidth = this.tubes[0].img1.width;
                    // check if the player is colliding with the older tube
                    if ( (this.player.position.x + this.player.colliderW >= this.tubes[0].position.x) &&
                        (this.player.position.x <= this.tubes[0].position.x + tubeWidth) &&
                        !((this.player.position.y + 8 > this.tubes[0].t2Y + tubeWidth) &&
                        (this.player.position.y + this.player.colliderH < this.tubes[0].t1Y)) ) {

                        if (this.player.state != 2)
                            this.PlayerDead();
                    }
                    // check if the older tube is outside the screen
                    if (this.tubes[0].position.x <= -tubeWidth) {
                        if (this.player.state != 2) {

                            this.actualScore++;
                            this.scoreLabel.text = "Score: " + this.actualScore;

                            this.tubes.shift();
                        }
                    }
                }
                break;
            
            case 2: // gameover menu
                if (Input.IsMouseDown() || Input.IsKeyDown(KEY_SPACE)) {
                    this.gameState = 1;
                    this.Reset();
                }
                break;
        }

        // background color variation
        this.bgColorVar += this.bgColorVarVelocity * deltaTime;
        if (this.bgColorVar >= 1.0) {
            this.bgColorStep = (this.bgColorStep + 1) % this.bgColors.length;
            this.bgColorVar = 0;
        }

        // set gameplay variables
        const leftShipfPreshed = Input.IsKeyPressed(KEY_LSHIFT);
        if (Input.IsKeyDown(KEY_LSHIFT))
            console.log("wat")
        if (Input.IsKeyDown(KEY_1)) {
            if (leftShipfPreshed)
                this.gravityValue -= 0.1;
            else
                this.gravityValue += 0.1;
        }
        if (Input.IsKeyDown(KEY_2)) {
            if (leftShipfPreshed)
                this.gravityAc -= 0.1;
            else
                this.gravityAc += 0.1;
        }
        if (Input.IsKeyDown(KEY_3)) {
            if (leftShipfPreshed)
                this.scrollVelocity -= 1;
            else
                this.scrollVelocity += 1;
        }
        if (Input.IsKeyDown(KEY_4)) {
            if (leftShipfPreshed)
                this.tubeGap -= 5;
            else
                this.tubeGap += 5;
        }
        if (Input.IsKeyDown(KEY_5)) {
            if (leftShipfPreshed)
                this.tubeGapYMin -= 5;
            else
                this.tubeGapYMin += 5;
        }
        if (Input.IsKeyDown(KEY_6)) {
            if (leftShipfPreshed)
                this.tubeSpawnMin -= 0.05;
            else
                this.tubeSpawnMin += 0.05;
        }
        if (Input.IsKeyDown(KEY_7)) {
            if (leftShipfPreshed)
                this.tubeSpawnMax -= 0.05;
            else
                this.tubeSpawnMax += 0.05;
        }
        if (Input.IsKeyDown(KEY_3)) {
            if (leftShipfPreshed)
                this.player.jumpVelocityPower -= 1;
            else
                this.player.jumpVelocityPower += 1;
        }
    }

    Draw() {
        const ctx = this.renderer.ctx;
        // background
        this.renderer.DrawFillRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);
        this.DrawBg();
        
        switch(this.gameState) {
            case 0: // menú
                this.DrawMenu();
                break;
            
            case 1: // juego
                // tubes
                for (let i = 0; i < this.tubes.length; i++)
                    this.tubes[i].Draw(renderer);

                this.player.Draw(renderer);
                
                // score
                this.scoreLabel.Draw(renderer);
                
                break;
            
            case 2: // menú GameOver
                this.gameoverSprite.Draw(renderer);
                
                if (this.newRecord) {
                    this.newRecordLabel.Draw(renderer);
                }
                break;
        }
            
        this.soundMuteSprite.DrawSection(this.renderer, this.audioActive ? 0 : 32, 0, 32, 32);
        
        if (this.showDebug) {
            // draw gameplay variables
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(1, 30, 100, 124);

            ctx.font = "10px Arial";
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            
            ctx.fillText("gravityValue=" + this.gravityValue, 4, 66);
            ctx.fillText("gravityAc=" + this.gravityAc, 4, 78);
            ctx.fillText("scrollVelocity=" + this.scrollVelocity, 4, 90);
            ctx.fillText("tubeGap=" + this.tubeGap, 4, 102);
            ctx.fillText("tubeGapYMin=" + this.tubeGapYMin, 4, 114);
            ctx.fillText("tubeSpawnMin=" + this.tubeSpawnMin, 4, 126);
            ctx.fillText("tubeSpawnMax=" + this.tubeSpawnMax, 4, 138);
            ctx.fillText("jumpVelocity=" + this.player.jumpVelocityPower, 4, 150);
        }
    }

    DrawBg() {
        // compute the actual background color
        const actualColor = this.bgColors[this.bgColorStep];
        const nextColor = this.bgColors[(this.bgColorStep + 1) % this.bgColors.length];
        
        this.bgColorMixed = Color.Lerp(actualColor, nextColor, this.bgColorVar);

        this.bgGradient.SetColorStop(2, this.bgColorMixed);
        this.renderer.DrawGradientRectangle(0, 0, this.screenWidth, this.screenHeight, this.bgGradient);
    }

    UpdateMenu(deltaTime) {
        if (this.menuState == 0) { // intro
            this.titleSprite.position.y += 100 * deltaTime;
            if (this.titleSprite.position.y >= this.screenHalfHeight - 100)
                this.menuState = 1;
        }
        else if (this.menuState == 1) { // credits
            this.titleSprite.rotation += Math.cos(totalTime) * 0.002 + 0.00015;

            this.creditsSprite.position.y += 50 * deltaTime;
            if (this.creditsSprite.position.y >= 240)
                this.menuState = 2;
        }
        else if (this.menuState == 2) { // static
            this.titleSprite.rotation += Math.cos(totalTime) * 0.002 + 0.00015;
        }
    }

    DrawMenu() {
        if (this.menuState == 0) {
            // title sprite
            this.titleSprite.Draw(this.renderer);
        }
        else if (this.menuState == 1) {
            // title and credits sprites
            this.titleSprite.Draw(this.renderer);
            this.creditsSprite.Draw(this.renderer);
        }
        else if (this.menuState == 2) {  
            // title and credits sprites                  
            this.titleSprite.Draw(this.renderer);
            this.creditsSprite.Draw(this.renderer);
        }
    }
    
    PlayerDead() {
        if (this.audioActive)
            audioPlayer.PlayAudio("dead");
        
        this.player.Die();
    }

    Reset() {
        this.actualScore = 0;
        this.player.Reset();
        this.tubes = [];
    }

    GameOver() {
        if (this.actualScore > this.maxScore) {
            this.maxScore = this.actualScore;
            this.newRecord = true;
            this.newRecordLabel.text = "New Record!!! " + this.actualScore;
        }
        else
            this.newRecord = false;

        this.gameState = 2;
    }
}

class FloppyDerpPlayer extends SSAnimationObjectBasic {
    constructor(position, img) {
        super(position,  0, 1, img, 24, 24, [10, 10], 0.01);
        this.animationT1 = 0.03; // frame time of animation 1
        this.animationT2 = 0.15;  // frame time of animation 2
        this.framesDuration = this.animationT1;

        this.initialPosition = Vector2.Copy(position);

        this.jumpVelocityPower = 700.0;
        this.jumpVelocity = 10.0;
        this.jumpPunch = 2.5 * game.gravityValue * game.gravityAc; // jump force
        this.colliderW = 16;
        this.colliderH = 16;
        this.fallVelocity = 0.0; // fall speed

        this.state = 0; // 0=falling, 1=jumping, 2=dying
    }

    Start() {
        super.Start();
        this.state = 0;
        this.position.Set(this.initialPosition.x, this.initialPosition.y);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (this.state != 2 && (Input.IsMouseDown() || Input.IsKeyDown(KEY_SPACE))) {
            // jump!
            this.Jump();
        }

        switch (this.state) {
            case 0: // falling
                this.fallVelocity += game.gravityValue * game.gravityAc * deltaTime;
                this.position.y += this.fallVelocity * deltaTime;;
            
                if (this.position.y >= game.screenHeight)
                    this.Reset();
                    
                break;
            
            case 1: // jumping
                this.jumpVelocity -= this.jumpPunch * deltaTime;
                this.position.y -= this.jumpVelocity * deltaTime;;
                
                if (this.position.y <= 0)
                    this.Reset();
                    
                if (this.jumpVelocity <= 0.0) {
                    this.jumpVelocity = this.jumpVelocityPower;
                    this.fallVelocity = 0.0;

                    this.state = 0; // falling
                }
            
                break;
                
            case 2: // dying
                this.fallVelocity += game.gravityValue * game.gravityAc * deltaTime * 0.25;
                this.position.y += this.fallVelocity * deltaTime;
            
                if (this.position.y >= game.screenHeight)
                    game.GameOver();
                    
                break;
        }
    }

    Draw(renderer) {
        super.Draw(renderer);
    }
    
    Reset() {
        this.position.Set(this.initialPosition.x, this.initialPosition.y);
        this.fallVelocity = 0.0; // reset fall velocity
        this.jumpVelocity = this.jumpVelocityPower;
        this.state = 0;

        this.PlayAnimationLoop(0);
        this.framesDuration = this.animationT1;
    }

    Jump() {
        this.jumpVelocity = this.jumpVelocityPower;
        this.state = 1;

        if (game.audioActive) {   
            audioPlayer.PlayFromTheStart("jump");
        }
    }

    Die() {
        this.state = 2;

        this.PlayAnimationOnce(1);
        this.framesDuration = this.animationT2;
    }
}

class FloppyDerpTube extends GameObject {
    constructor(position, tubeGap, tube1Y, tube2Y, tubeImg1, tubeImg2, tubeImg3) {
        super(position);

        this.gap = tubeGap;
        this.t1Y = tube1Y;
        this.t2Y = tube2Y;
        this.img1 = tubeImg1;
        this.img2 = tubeImg2;
        this.img3 = tubeImg3;
    }

    Draw(renderer) {
        renderer.DrawImageBasic(this.img1, this.position.x, this.t1Y);
        renderer.DrawImageBasic(this.img3, this.position.x, this.t1Y + 32, 32, 300);
        renderer.DrawImageBasic(this.img2, this.position.x, this.t2Y);
        renderer.DrawImageBasic(this.img3, this.position.x, this.t2Y, 32, -300);
    }

    Update(deltaTime) {
        this.position.x -= game.scrollVelocity * deltaTime;
    }
}

window.onload = () => {
    Init(FloppyDerp);
}