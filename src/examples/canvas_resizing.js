class CanvasResizing extends Game {
    constructor(renderer) {
        super(renderer);

        this.config = {
            ...this.config,
            screenWidth: 800,
            screenHeight: 800,
        };

        this.graphicAssets = {
            checker: {
                path: "src/examples/assets/UVChecker_byValle_1K.png",
                img: null
            },
            sanic: {
                path: "src/examples/assets/sanic_ppp.png",
                img: null
            },
            aim: {
                path: "src/examples/assets/aim.png",
                img: null
            }
        };

        this.checkerSprite = null;
        this.sanicSprite = null;

        this.instructionsLabels = [];

        this.canvasConfigurationLabels = [];

        this.bgRectangle1 = null;
        this.bgRectangle2 = null;

        this.aim = null;
    }

    Start() {
        super.Start();

        // checker pattern sprite
        this.checkerSprite = new Sprite(this.graphicAssets.checker.img, Vector2.Zero(), 0, 1);

        // Sanic sprite (scaled)
        this.sanicSprite = new Sprite(this.graphicAssets.sanic.img, new Vector2(this.screenHalfWidth, this.screenHalfHeight), 0, 2);
        this.sanicSprite.pivot.x = -this.sanicSprite.width / 2;
        this.sanicSprite.pivot.y = -this.sanicSprite.height / 2;

        this.instructionsLabels = [
            new TextLabel("Press 1 to toggle 'fill screen'", new Vector2(10, 100), "20px Comic Sans MS", Color.white, "left", "top"),
            new TextLabel("Press 2 to toggle 'Match Native Resolution'", new Vector2(10, 130), "20px Comic Sans MS", Color.white, "left", "top"),
            new TextLabel("Press 3 to toggle 'Preserve Aspect Ratio'", new Vector2(10, 160), "20px Comic Sans MS", Color.white, "left", "top"),
            new TextLabel("Press 4 to toggle 'Image Smoothing Enabled'", new Vector2(10, 190), "20px Comic Sans MS", Color.white, "left", "top"),
            new TextLabel("Resize the window to show how the canvas scales", new Vector2(10, 220), "20px Comic Sans MS", Color.white, "left", "top"),
            new TextLabel("Sanic is anchored to the center", new Vector2(this.screenHalfWidth, this.screenHalfHeight + 120), "18px Comic Sans MS", Color.black, "center", "bottom")
        ];

        this.canvasConfigurationLabels = [
            new TextLabel("Current canvas configuration: ", new Vector2(10, this.screenHeight - 110), "20px Comic Sans MS", Color.white, "left", "bottom"),
            new TextLabel("Canvas internal resolution: " + this.screenWidth + "x" + this.screenHeight, new Vector2(30, this.screenHeight - 90), "16px Comic Sans MS", Color.white, "left", "bottom"),
            new TextLabel("Fill screen: " + this.renderer.fillScreen, new Vector2(30, this.screenHeight - 70), "16px Comic Sans MS", Color.white, "left", "bottom"),
            new TextLabel("Match Native Resolution: " + this.renderer.fillScreenMatchNativeResolution, new Vector2(30, this.screenHeight - 50), "16px Comic Sans MS", Color.white, "left", "bottom"),
            new TextLabel("Preserve Aspect Ratio: " + this.renderer.fillScreenPreserveAspectRatio, new Vector2(30, this.screenHeight - 30), "16px Comic Sans MS", Color.white, "left", "bottom"),
            new TextLabel("Image Smoothing Enabled: " + this.renderer.imageSmoothingEnabled, new Vector2(30, this.screenHeight - 10), "16px Comic Sans MS", Color.white, "left", "bottom")
        ];

        this.bgRectangle1 = new Rectangle(new Vector2(5, 95), 470, 150, new Color(0, 0, 0, 0.66));
        this.bgRectangle2 = new Rectangle(new Vector2(5, this.screenHeight - 135), 310, 130, new Color(0, 0, 0, 0.66));

        this.aim = new SpriteObject(Vector2.Zero(), 0, 1, this.graphicAssets.aim.img);
        this.AddGameObject(this.aim);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.aim.position.Set(Input.mouse.x, Input.mouse.y);

        if (Input.IsKeyDown(KEY_1)) {
            this.renderer.fillScreen = !this.renderer.fillScreen;
            this.canvasConfigurationLabels[1].text = "Canvas internal resolution: " + this.screenWidth + "x" + this.screenHeight;
            this.canvasConfigurationLabels[2].text = "Fill screen: " + this.renderer.fillScreen;
            this.canvasConfigurationLabels[3].text = "Match Native Resolution: " + this.renderer.fillScreenMatchNativeResolution;
            this.canvasConfigurationLabels[4].text = "Preserve Aspect Ratio: " + this.renderer.fillScreenPreserveAspectRatio;

            this.WindowResized();
        }

        if (Input.IsKeyDown(KEY_2)) {
            this.renderer.fillScreenMatchNativeResolution = !this.renderer.fillScreenMatchNativeResolution;
            this.canvasConfigurationLabels[3].text = "Match Native Resolution: " + this.renderer.fillScreenMatchNativeResolution;

            this.WindowResized();
        }

        if (Input.IsKeyDown(KEY_3)) {
            this.renderer.fillScreenPreserveAspectRatio = !this.renderer.fillScreenPreserveAspectRatio;
            this.canvasConfigurationLabels[4].text = "Preserve Aspect Ratio: " + this.renderer.fillScreenPreserveAspectRatio;

            this.WindowResized();
        }

        if (Input.IsKeyDown(KEY_4)) {
            this.renderer.imageSmoothingEnabled = !this.renderer.imageSmoothingEnabled;

            this.canvasConfigurationLabels[5].text = "Image Smoothing Enabled: " + this.renderer.imageSmoothingEnabled;
        }
    }

    Draw() {
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);

        this.checkerSprite.DrawBasicAt(this.renderer, 0, 0);
        this.sanicSprite.DrawBasic(this.renderer);
        
        super.Draw();
        
        this.bgRectangle1.Draw(this.renderer);
        this.instructionsLabels.forEach((label) => {
            label.Draw(this.renderer);
        });
        
        this.bgRectangle2.Draw(this.renderer);
        this.canvasConfigurationLabels.forEach((label) => {
            label.Draw(this.renderer);
        });
    }

    WindowResized() {
        this.canvasConfigurationLabels[1].text = "Canvas internal resolution: " + this.screenWidth + "x" + this.screenHeight;

        // label texts repositioning (bottom-left corner)
        this.bgRectangle2.position.y = this.screenHeight - 135;
        this.canvasConfigurationLabels[0].position.y = this.screenHeight - 110;
        this.canvasConfigurationLabels[1].position.y = this.screenHeight - 90;
        this.canvasConfigurationLabels[2].position.y = this.screenHeight - 70;
        this.canvasConfigurationLabels[3].position.y = this.screenHeight - 50;
        this.canvasConfigurationLabels[4].position.y = this.screenHeight - 30;
        this.canvasConfigurationLabels[5].position.y = this.screenHeight - 10;

        this.instructionsLabels[5].x = this.screenHalfWidth;
        this.instructionsLabels[5].y = this.screenHalfHeight + 120;


        // Sanic sprite repositioning
        this.sanicSprite.x = this.screenHalfWidth;
        this.sanicSprite.y = this.screenHalfHeight;
    }
}

// initialize the game
window.onload = () => {
    Init(CanvasResizing);
}