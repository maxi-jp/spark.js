class TilesetGame extends Game {
    constructor(renderer) {
        super(renderer);

        this.config = { imageSmoothingEnabled: false };

        this.graphicAssets = {
            squirrel: {
                path: "src/examples/tileset/assets/forest/squirrel.png",
                img: null
            },
            beach_tileset: {
                path: "src/examples/tileset/assets/rpg/beach_tileset.png",
                img: null
            }
        };

        // Tiled JSON assets (loaded automatically by the engine)
        this.tiledAssets = {
            forestMap: {
                path: "src/examples/tileset/assets/forest/forest.json",
                data: null
            },
            islandMap: {
                path: "src/examples/tileset/assets/rpg/island.json",
                data: null
            }
        };

        this.box = null;
        this.squirrel = null;
        this.camera = null;
        this.tilesets = []; // Now we can have multiple layers
        this.bgLayers = null;

        this.titleTextLabel = null;
        this.keysTextLabel = null;
        this.spaceTextLabel = null;
        this.currentMapLabel = null;

        this.currentMap = "forest"; // island
    }

    Start() {
        super.Start();

        this.titleTextLabel = new TextLabel(`Tiled Map Loader Example`, new Vector2(10, 80), '16px Arial', Color.black, "left");
        this.keysTextLabel = new TextLabel(`Use Arrow Keys or WASD to move`, new Vector2(10, 100), '12px Arial', Color.black, "left");
        this.spaceTextLabel = new TextLabel(`Press Space to switch maps`, new Vector2(10, 114), '12px Arial', Color.black, "left");
        this.currentMapLabel = new TextLabel(`Current map: ${this.currentMap}.`, new Vector2(10, 138), '16px Arial', Color.black, "left");

        this.box = new RectangleGO(Vector2.Zero(), 16, 24);
        this.box.pivot.y = 12;
        this.AddGameObject(this.box);

        // Create the camera
        this.camera = new FollowCameraBasic(Vector2.Zero(), this.box, new Vector2(100, -40));
        this.camera.Start();
        
        if (this.currentMap === "forest")
            this.LoadForest();
        else if (this.currentMap === "island")
            this.LoadIsland();
    }

    Update(deltaTime) {
        // update physics and gameObjects
        super.Update(deltaTime);

        const speed = 100;
        
        if (Input.IsKeyPressed(KEY_A) || Input.IsKeyPressed(KEY_LEFT))
            this.box.position.x -= speed * deltaTime;
        if (Input.IsKeyPressed(KEY_D) || Input.IsKeyPressed(KEY_RIGHT))
            this.box.position.x += speed * deltaTime;
        if (Input.IsKeyPressed(KEY_W) || Input.IsKeyPressed(KEY_UP))
            this.box.position.y -= speed * deltaTime;
        if (Input.IsKeyPressed(KEY_S) || Input.IsKeyPressed(KEY_DOWN))
            this.box.position.y += speed * deltaTime;

        if (Input.IsKeyDown(KEY_SPACE)) {
            // switch Tiled maps
            if (this.currentMap === "forest") {
                this.currentMap = "island";
                this.LoadIsland();
            }
            else {
                this.currentMap = "forest";
                this.LoadForest();
            }

            this.currentMapLabel.text = `Current map: ${this.currentMap}.`;
        }

        // update the camera
        this.camera.Update(deltaTime);

        // Background layers update their parallax based on the camera position
        if (this.bgLayers) {
            this.bgLayers.Update(deltaTime);
        }
    }

    Draw() {
        this.camera.PreDraw(this.renderer);

        // Draw backgrounds inside the camera transform so parallax math works correctly
        if (this.bgLayers) {
            this.bgLayers.Draw(this.renderer);
        }

        // draw the gameObjects
        super.Draw();

        this.camera.PostDraw(this.renderer);

        // Draw UI
        this.titleTextLabel.Draw(this.renderer);
        this.keysTextLabel.Draw(this.renderer);
        this.spaceTextLabel.Draw(this.renderer);
        this.currentMapLabel.Draw(this.renderer);

        this.renderer.DrawFillText(`Camera: ${Math.round(this.camera.x)}, ${Math.round(this.camera.y)}`, 10, this.screenHeight - 20, '12px Arial', Color.black, "left");
        this.renderer.DrawFillText(`Layers loaded: ${this.tilesets.length}`, 10, this.screenHeight - 40, '12px Arial', Color.black, "left");
    }

    LoadForest() {
        // Clean up previous map objects (keep the player box)
        this.gameObjects.forEach(go => {
            if (go !== this.box) {
                this.Destroy(go);
            }
        });

        // Parse the Tiled JSON map
        const mapData = TiledLoader.Parse(
            this.tiledAssets.forestMap.data,
            this.graphicAssets
        );
        
        console.log("Loaded Tiled map:", mapData);
        console.log(`Map size: ${mapData.width}x${mapData.height}`);
        console.log(`Tile size: ${mapData.tileWidth}x${mapData.tileHeight}`);
        console.log(`Layers: ${mapData.layers.length}`);
        
        // Create Tileset objects for each layer (position at 0,0, scale 2x)
        this.tilesets = TiledLoader.CreateTilesets(mapData, new Vector2(0, 0), 2);
        
        // Add all tilesets to game objects
        this.tilesets.forEach(tileset => {
            console.log(`Adding layer: ${tileset.layerName}`);
            this.AddGameObject(tileset);
        });

        // Extract the Object named "squirrel" and spawn a Squirrel
        const animData = TiledLoader.GetAnimationDataByName(this.tiledAssets.forestMap.data, mapData, "squirrel", new Vector2(0, 0), 2);
        if (animData) {
            this.squirrel = new Squirrel(2, animData);
            this.AddGameObject(this.squirrel);
        }
        else {
            console.error("No squirrel object with valid animation data found in the Tiled project.");
        }

        // center the red box on the squirrel
        this.box.position.Set(this.squirrel.x, this.squirrel.y);

        // Extract background layers from the Tiled project
        this.bgLayers = new BackgroundLayers(this.camera);
        
        const bgLayerNames = ["bg0", "bg1", "bg2"];
        for (const layerName of bgLayerNames) {
            const bgLayer = TiledLoader.CreateGameObjectsBackgroundLayer(this.tiledAssets.forestMap.data, mapData, layerName, new Vector2(0, 0), 2);
            
            if (bgLayer)
                this.bgLayers.InsertLayer(bgLayer);
            else
                console.error(`Failed to load background layer '${layerName}' from the Tiled project.`)
        }
        this.bgLayers.Start();

        // Ensure the player box is drawn last (on top of the newly loaded map)
        this.MoveGameObjectToEnd(this.box);
    }

    LoadIsland() {
        // Clean up previous map objects (keep the player box)
        this.gameObjects.forEach(go => {
            if (go !== this.box) {
                this.Destroy(go);
            }
        });

        // Parse the Tiled JSON map
        const mapData = TiledLoader.Parse(
            this.tiledAssets.islandMap.data,
            this.graphicAssets
        );
        
        console.log("Loaded Tiled map:", mapData);
        console.log(`Map size: ${mapData.width}x${mapData.height}`);
        console.log(`Tile size: ${mapData.tileWidth}x${mapData.tileHeight}`);
        console.log(`Layers: ${mapData.layers.length}`);

        // Create Tileset objects for each layer (position at 0,0, scale 2x)
        this.tilesets = TiledLoader.CreateTilesets(mapData, new Vector2(0, 0), 2);

        // Add all tilesets to game objects
        this.tilesets.forEach(tileset => {
            console.log(`Adding layer: ${tileset.layerName}`);
            this.AddGameObject(tileset);
        });

        // The island map uses Tile Layers for the environment instead of parallax Object Layers
        this.bgLayers = null;

        // Move the player box to the "Starting Point" object defined in Tiled
        const startPos = TiledLoader.GetObjectPositionByName(this.tiledAssets.islandMap.data, "Starting Point", Vector2.Zero(), 2);
        if (startPos) {
            this.box.position.Set(startPos.x, startPos.y);
        }

        // Ensure the player box is drawn last (on top of the newly loaded map)
        this.MoveGameObjectToEnd(this.box);
    }
}

class Squirrel extends SSAnimationObjectComplex {
    constructor(scale, animData) {
        super(animData.position, animData.rotation || 0, scale, animData.image, animData.rects, animData.durations);
        this.flipX = animData.flipX || false;
        this.flipY = animData.flipY || false;
        this.PlayAnimationLoop(0);
    }
}

window.onload = () => {
    Init(TilesetGame, "myCanvas");
};