class RTSGame extends Game {
    constructor(renderer) {
        super(renderer);

        // Phase 1 Configuration
        this.Configure({
            screenWidth: 1024,
            screenHeight: 768,
            fillWindow: true,
            preserveAspectRatio: true,
            imageSmoothingEnabled: false, // Disabled for a crisp, classic RTS pixel-art look
            drawColliders: false,         // Will be tied to our custom debugMode flag later
        });

        // Map and tileset assets (paths relative to HTML file location)
        this.tiledAssets = {
            map: { path: "src/examples/rts/assets/rts_map.json", data: null }
        };

        this.graphicAssets = {
            rts_tileset: { path: "src/examples/rts/assets/rts_tileset.png", img: null }
        };

        this.testUnits = [];
        this.gridMap = null;
        this.pathfinder = null;
        this.debugPath = [];         // Vector2[] — visualized when non-empty
        this.playerOwnerId = 1;
        this.selectionManager = null;
        this.showGridDebugOverlay = true;
        this.gridDebugColors = {
            grass: Color.FromRGBA(34, 197, 94, 0.22),
            shore: Color.FromRGBA(245, 158, 11, 0.22),
            water: Color.FromRGBA(59, 130, 246, 0.28),
            defaultType: Color.FromRGBA(107, 114, 128, 0.2),
            occupiedStroke: Color.FromRGBA(239, 68, 68, 0.65)
        };
        
        // Camera controls
        this.edgePanSpeed = 800;        // Pixels per second
        this.keyboardPanSpeed = 500;    // Slower keyboard pan for precise control
        this.edgePanMargin = 20;        // Pixels from screen edge to trigger panning
        this.cameraBounds = null;       // Will be set after map loads
    }

    Start() {
        super.Start();
        console.log("RTSGame Started - Phase 1 Session 1.3");

        // Parse the Tiled map and create the tilesets
        const mapData = TiledLoader.Parse(this.tiledAssets.map.data, this.graphicAssets);
        this.tilesets = TiledLoader.CreateTilesets(mapData, Vector2.Zero(), 1);

        this.tilesets.forEach(tileset => {
            this.AddGameObject(tileset);
        });

        // Store map dimensions for camera bounds
        this.mapWidth = mapData.width * mapData.tileWidth;
        this.mapHeight = mapData.height * mapData.tileHeight;
        this.cameraBounds = new Rect(0, 0, this.mapWidth, this.mapHeight);

        this.gridMap = GridMap.FromTiledMap(mapData, {
            layerName: "Ground",
            cellSize: 32,
            walkableGids: [3]
        });

        this.SpawnTestUnits();

        this.pathfinder = new AStarPathfinder(this.gridMap);

        this.selectionManager = new SelectionManager(this, {
            friendlyOwnerId: this.playerOwnerId,
            maxSelection: 60
        });
        
        console.log(`Map loaded: ${mapData.width}x${mapData.height} tiles (${this.mapWidth}x${this.mapHeight} pixels)`);

        // Initialize the camera at the center of the screen
        this.camera = new RTSCamera(new Vector2(this.screenHalfWidth, this.screenHalfHeight), this, this.mapWidth, this.mapHeight, {
            keyboardPanSpeed: this.keyboardPanSpeed,
            edgePanSpeed: this.edgePanSpeed,
            edgeMargin: this.edgePanMargin,
            minZoom: 0.5,
            maxZoom: 2.0,
            zoomStep: 0.1,
            edgeExponent: 1.75,
            debugEnabled: true
        });
        this.camera.Start();
        
        console.log("Phase 1 Session 1.3 complete: Grid and units initialized");
    }

    SpawnTestUnits() {
        const desiredSpawnCells = [
            { col: 8, row: 8 },
            { col: 10, row: 9 },
            { col: 12, row: 10 },
            { col: 14, row: 11 },
            { col: 16, row: 12 }
        ];

        const spawnedCells = [];

        desiredSpawnCells.forEach((cellPos) => {
            if (this.gridMap.IsWalkable(cellPos.col, cellPos.row)) {
                spawnedCells.push(cellPos);
            }
        });

        // Keep filling to 5 by scanning the map for additional walkable cells.
        if (spawnedCells.length < 5) {
            for (let row = 0; row < this.gridMap.height && spawnedCells.length < 5; row++) {
                for (let col = 0; col < this.gridMap.width && spawnedCells.length < 5; col++) {
                    if (!this.gridMap.IsWalkable(col, row)) {
                        continue;
                    }

                    const alreadyChosen = spawnedCells.some((c) => c.col === col && c.row === row);
                    if (!alreadyChosen) {
                        spawnedCells.push({ col, row });
                    }
                }
            }
        }

        spawnedCells.slice(0, 5).forEach((cellPos) => {
            const worldPos = this.gridMap.GridToWorld(cellPos.col, cellPos.row);
            const unit = new Unit(worldPos, null, {
                ownerId: 1,
                health: 100,
                maxHealth: 100,
                visionRadius: 5 * 32,
                speed: 60,
                scale: 1,
                placeholderRadius: 8,
                placeholderFillStyle: "#facc15",
                placeholderStrokeStyle: "#1f2937"
            });

            this.gridMap.SetOccupied(cellPos.col, cellPos.row, true, unit);
            this.testUnits.push(unit);
            this.AddGameObject(unit);
        });

        if (this.testUnits.length < 5) {
            console.warn(`Spawned ${this.testUnits.length}/5 test units. Check grid walkable setup.`);
        }
        else {
            console.log(`Spawned ${this.testUnits.length} test units`);
        }
    }

    ScreenToWorld(screenX, screenY) {
        const halfW = this.screenHalfWidth;
        const halfH = this.screenHalfHeight;
        return new Vector2(
            ((screenX - halfW) / this.camera.scale) + this.camera.x + halfW,
            ((screenY - halfH) / this.camera.scale) + this.camera.y + halfH
        );
    }

    IssueMoveCommand(targetPos) {
        const units = this.selectionManager.selectedEntities;
        for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            unit.ClearCommands();
            unit.AssignCommand(new MoveCommand(targetPos, this.pathfinder, unit.position));
        }
    }

    SortGameObjectsByY() {
        this.gameObjects.sort((a, b) => {
            const aY = a && a.position ? a.position.y : -Infinity;
            const bY = b && b.position ? b.position.y : -Infinity;

            if (aY === bY) {
                const aIsUnit = a instanceof Unit ? 1 : 0;
                const bIsUnit = b instanceof Unit ? 1 : 0;
                return aIsUnit - bIsUnit;
            }

            return aY - bY;
        });
    }

    DrawGridDebugOverlay() {
        if (!this.showGridDebugOverlay || !this.gridMap) {
            return;
        }

        const cellSize = this.gridMap.cellSize;
        for (let row = 0; row < this.gridMap.height; row++) {
            for (let col = 0; col < this.gridMap.width; col++) {
                const cell = this.gridMap.GetCell(col, row);
                if (!cell) {
                    continue;
                }

                const x = col * cellSize;
                const y = row * cellSize;
                const color = this.gridDebugColors[cell.terrainType] || this.gridDebugColors.defaultType;

                this.renderer.DrawFillBasicRectangle(x, y, cellSize, cellSize, color);

                if (cell.occupied) {
                    this.renderer.DrawStrokeBasicRectangle(x, y, cellSize, cellSize, this.gridDebugColors.occupiedStroke, 1);
                }
            }
        }
    }

    DrawDebugPath() {
        if (this.debugPath.length < 2) return;
        const dotColor = Color.FromRGB(239, 68, 68);
        const lineColor = Color.FromRGBA(239, 68, 68, 0.5);
        for (let i = 0; i < this.debugPath.length; i++) {
            const p = this.debugPath[i];
            this.renderer.DrawFillCircle(p.x, p.y, 4, dotColor);
            if (i > 0) {
                const prev = this.debugPath[i - 1];
                this.renderer.DrawLine(prev.x, prev.y, p.x, p.y, lineColor, 1.5);
            }
        }
    }

    DrawMovingUnitPaths() {
        const dotColor = Color.FromRGB(239, 68, 68);
        const lineColor = Color.FromRGBA(239, 68, 68, 0.5);
        for (let i = 0; i < this.gameObjects.length; i++) {
            const go = this.gameObjects[i];
            if (!(go instanceof Unit) || !go.active || !go.isSelected) continue;
            const cmd = go.currentCommand;
            if (!(cmd instanceof MoveCommand) || !cmd.path || cmd.path.length === 0) continue;

            const startIdx = cmd.waypointIndex;
            if (startIdx >= cmd.path.length) continue;

            const firstWp = cmd.path[startIdx];
            this.renderer.DrawLine(go.position.x, go.position.y, firstWp.x, firstWp.y, lineColor, 1.5);

            for (let j = startIdx; j < cmd.path.length; j++) {
                const p = cmd.path[j];
                this.renderer.DrawFillCircle(p.x, p.y, 3, dotColor);
                if (j > startIdx) {
                    const prev = cmd.path[j - 1];
                    this.renderer.DrawLine(prev.x, prev.y, p.x, p.y, lineColor, 1.5);
                }
            }
        }
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (Input.IsKeyDown(KEY_G)) {
            this.showGridDebugOverlay = !this.showGridDebugOverlay;
            console.log(`Grid debug overlay: ${this.showGridDebugOverlay ? "ON" : "OFF"}`);
        }

        // Right-click terrain to move selected units
        if (Input.IsMouseDown(1) && this.selectionManager.selectedEntities.length > 0) {
            const worldPos = this.ScreenToWorld(Input.mouse.x, Input.mouse.y);
            this.IssueMoveCommand(worldPos);
        }

        // Press P to test A* from first unit to the opposite map corner
        if (Input.IsKeyPressed(KEY_P) && this.pathfinder && this.testUnits.length > 0) {
            const start = this.testUnits[0].position;
            const end = new Vector2(this.mapWidth - 32, this.mapHeight - 32);
            const t0 = performance.now();
            this.debugPath = this.pathfinder.FindPath(start, end);
            const ms = (performance.now() - t0).toFixed(2);
            console.log(`A* path: ${this.debugPath.length} waypoints in ${ms}ms`);
        }
        
        // Update camera controls and zoom
        this.camera.Update(deltaTime);

        // SelectionManager updates
        this.selectionManager.Update(deltaTime);
    }

    Draw() {
        this.SortGameObjectsByY();

        // Draw a base background color before rendering the map
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.black);
        
        // Apply camera transform for world-space rendering
        this.camera.PreDraw(this.renderer);
        
        super.Draw();
        this.DrawGridDebugOverlay();
        
        this.DrawDebugPath();
        this.DrawMovingUnitPaths();

        // Restore screen-space transform for UI
        this.camera.PostDraw(this.renderer);

        this.selectionManager.Draw(this.renderer);

        if (this.camera.DrawDebug) {
            this.camera.DrawDebug(this.renderer);
        }
    }
}