class Parallax extends Game {
    constructor(renderer) {
        super(renderer);

        this.config = { ...this.config, imageSmoothingEnabled: false };

        this.graphicAssets = {
            mountain: {
                path: "src/examples/parallax/assets/mountain.png",
                img: null
            },
            trees: {
                path: "src/examples/parallax/assets/trees.png",
                img: null
            },
            tileset: {
                path: "src/examples/parallax/assets/Textures.png",
                img: null
            }
        };

        this.box = null;
        this.camera = null;
        this.background = null;

        this.floorLevelY = 382;
    }

    Start() {
        super.Start();
        this.box = new RectangleGO(new Vector2(this.screenHalfWidth, this.floorLevelY), 60, 100);
        this.box.pivot.y = 50;
        this.AddGameObject(this.box);

        // create the camera
        this.camera = new FollowCameraBasic(Vector2.Zero(), this.box, new Vector2(100, -146));
        this.camera.Start();

        // create the parallax background -----------------------------------------------------
        // layer 0: static black
        const bgLayer0 = new StaticColorLayer(Color.FromHex("#284050"));
        // layer 1: a "night sky" gradient (transparent to dark blue "#365B93")  (0.2, 1)
        const bgLayer1 = new GradientRectangleLayer(this.renderer, new Vector2(0.1, 1), [[0, Color.FromHex("#003b5e")], [0.3, Color.FromHex("#02142a")], [0.8, Color.FromHex("#511539")]], Vector2.Zero(), this.screenWidth, 400);
        // layer 2: mountains in a full-size-sprite
        const bgLayerMountain = new SpriteBackgroundLayer(this.graphicAssets.mountain.img, new Vector2(-100, this.screenHeight - this.graphicAssets.mountain.img.height - 70), 0, 1, new Vector2(0.05, 0.025));
        // layer 3: a set of individual sprite trees
        const bgLayerTrees = new MultispritesBackgroundLayer(
            new Vector2(0, 176),
            [
                new SpriteSection(this.graphicAssets.trees.img, new Vector2(0, -4), 0, 1, new Rect(0, 0, 193, 240)), // tree 1
                new SpriteSection(this.graphicAssets.trees.img, new Vector2(300, 0), 0, 1, new Rect(193, 0, 194, 240)), // tree 2
                new SpriteSection(this.graphicAssets.trees.img, new Vector2(600, 0), 0, 1, new Rect(386, 0, 142, 240)), // tree 3
                new SpriteSection(this.graphicAssets.trees.img, new Vector2(900, 0), 0, 1, new Rect(528, 0, 216, 240)) // tree 4
            ],
            new Vector2(0.8, 0.9)
        );
        // layer 4: a set of tiles
        const TILE_WIDTH = 24;
        const TILE_HEIGHT = 24;
        const bgLayerTiles = new TilesetBackgroundLayer(
            this.graphicAssets.tileset.img,
            new Vector2(0, this.screenHeight - TILE_HEIGHT * 6), // position
            1, // scale
            new Vector2(1.0, 1.0), { // velocity
                1: { rect: new Rect(313,  85, TILE_WIDTH, TILE_HEIGHT) }, // grass
                2: { rect: new Rect(313, 109, TILE_WIDTH, TILE_HEIGHT) }, // dirt A
                3: { rect: new Rect(313, 133, TILE_WIDTH, TILE_HEIGHT) }, // dirt B
                4: { rect: new Rect(313, 157, TILE_WIDTH, TILE_HEIGHT) }, // dirt C
                5: { rect: new Rect(313, 181, TILE_WIDTH, TILE_HEIGHT) }, // dirt D
            }, [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
                [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
                [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
                [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
            ],
            TILE_WIDTH,
            TILE_HEIGHT
        );
        // finally componse all the layers in the background
        this.background = new BackgroundLayers(this.camera, [bgLayer0, bgLayer1, bgLayerMountain, bgLayerTrees, bgLayerTiles]);
        this.background.Start();
    }

    Update(deltaTime) {
        // update physics and gameObjects
        super.Update(deltaTime);

        if (Input.IsKeyPressed(KEY_A))
            this.box.position.x -= 100 * deltaTime;
        if (Input.IsKeyPressed(KEY_D))
            this.box.position.x += 100 * deltaTime;
        if (Input.IsKeyPressed(KEY_W))
            this.box.position.y -= 100 * deltaTime;
        if (Input.IsKeyPressed(KEY_S))
            this.box.position.y += 100 * deltaTime;

        if (this.box.position.y > this.floorLevelY)
            this.box.position.y = this.floorLevelY;


        // update the camera
        this.camera.Update(deltaTime);

        // update the background
        this.background.Update(deltaTime);
    }

    Draw() {
        this.camera.PreDraw(this.renderer);

        // draw the background
        // this.background.Draw(this.renderer); // this will draw all the layers
        this.background.DrawLayers(this.renderer, 3); // this will draw layers from 0 to 3

        // draw the gameObjects
        super.Draw();

        this.background.DrawLayer(this.renderer, 4); // this will draw layer 4

        this.camera.PostDraw(this.renderer);

        renderer.DrawFillText(`Camera: ${this.camera.x}, ${this.camera.y}`, 10, this.screenHeight - 20, '12px Arial', Color.white, "left");
    }
}

window.onload = () => {
    Init(Parallax);
}