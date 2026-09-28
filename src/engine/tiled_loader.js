/**
 * TiledLoader - Utility for loading and parsing Tiled JSON map files.
 * Converts Tiled JSON format into engine-compatible Tileset data structures.
 * 
 * @example
 * // In your game constructor:
 * this.tiledAssets = {
 *   myMap: { path: 'assets/map.json', data: null }
 * };
 * 
 * // In Start():
 * const mapData = TiledLoader.Parse(this.tiledAssets.myMap.data, this.graphicAssets);
 * this.tileset = new Tileset(
 *   mapData.image,
 *   new Vector2(0, 0),
 *   1,
 *   mapData.tilesetConfig,
 *   mapData.layers[0].data,
 *   mapData.tileWidth,
 *   mapData.tileHeight
 * );
 */
class TiledLoader {
    /**
     * Parse a Tiled JSON map and convert it to engine format.
     * Requires tilesets to be embedded in the Tiled JSON export.
     * @param {Object} tiledJSON - The parsed Tiled JSON object.
     * @param {Object} graphicAssets - Your game's graphicAssets object for image lookup.
     * @returns {{
     *   width: number,
     *   height: number,
     *   tileWidth: number,
     *   tileHeight: number,
     *   layers: Array<{name: string, data: number[][], visible: boolean, opacity: number}>,
     *   tilesets: Array<{name: string, image: HTMLImageElement, firstgid: number, columns: number}>,
     *   tilesetConfig: Object.<number, {rect: Rect}>,
     *   image: HTMLImageElement,
     *   orientation: string
     * }}
     */
    static Parse(tiledJSON, graphicAssets) {
        const result = {
            width: tiledJSON.width,
            height: tiledJSON.height,
            tileWidth: tiledJSON.tilewidth,
            tileHeight: tiledJSON.tileheight,
            orientation: tiledJSON.orientation || "orthogonal",
            layers: [],
            tilesets: [],
            tilesetConfig: {},
            image: null
        };

        // Parse tilesets
        for (const tilesetData of tiledJSON.tilesets) {
            let tilesetDef = tilesetData;
            
            // Enforce embedded tilesets
            if (tilesetData.source && !tilesetData.image && !tilesetData.tiles) {
                console.error(`TiledLoader: External tileset "${tilesetData.source}" detected. Please check "Embed tilesets" when exporting your JSON from Tiled.`);
                continue;
            }

            // Find the image in graphicAssets by matching the path
            let img = null;
            let tilesetImagePath = tilesetDef.image;
            
            // For Collection of Images format (no global image), get image from first tile
            if (!tilesetImagePath && tilesetDef.tiles && tilesetDef.tiles.length > 0) {
                tilesetImagePath = tilesetDef.tiles[0].image;
            }
            
            if (!tilesetImagePath) {
                console.warn(`TiledLoader: Could not find image source for tileset "${tilesetDef.name}"`);
                continue;
            }
            
            // Check if it's an embedded base64 image (data URI)
            if (tilesetImagePath.startsWith('data:')) {
                // Create an Image element for the base64 data
                img = new Image();
                img.src = tilesetImagePath;
                console.log(`TiledLoader: Using embedded base64 image for tileset "${tilesetDef.name}"`);
            }
            else {
                // Try to find the matching image in graphicAssets
                for (const assetKey in graphicAssets) {
                    const asset = graphicAssets[assetKey];
                    if (asset.path && asset.path.includes(tilesetImagePath.split('/').pop())) {
                        img = asset.img;
                        break;
                    }
                }

                if (!img) {
                    console.warn(`TiledLoader: Could not find image for tileset "${tilesetDef.name}" (${tilesetImagePath})`);
                    continue;
                }
            }

            const tileset = {
                name: tilesetDef.name,
                image: img,
                firstgid: tilesetDef.firstgid,
                columns: tilesetDef.columns,
                tileWidth: tilesetDef.tilewidth,
                tileHeight: tilesetDef.tileheight,
                tileCount: tilesetDef.tilecount,
                spacing: tilesetDef.spacing || 0,
                margin: tilesetDef.margin || 0,
                tiles: tilesetDef.tiles || [] // Custom tile definitions (Collection of Images)
            };

            result.tilesets.push(tileset);

            // Generate tilesetConfig for this tileset
            // Handle both grid-based and Collection of Images formats
            if (!tilesetDef.image && tileset.tiles && tileset.tiles.length > 0) {
                // Collection of Images format: each tile has custom position/size
                for (const tile of tileset.tiles) {
                    const gid = tileset.firstgid + tile.id;
                    result.tilesetConfig[gid] = {
                        rect: new Rect(tile.x || 0, tile.y || 0, tile.width || tileset.tileWidth, tile.height || tileset.tileHeight),
                        image: tileset.image
                    };
                    if (tile.animation) {
                        result.tilesetConfig[gid].animation = tile.animation;
                        result.tilesetConfig[gid].firstgid = tileset.firstgid;
                    }
                }
            } else {
                // Grid-based format: uniform tiles in rows/columns
                for (let i = 0; i < tileset.tileCount; i++) {
                    const gid = tileset.firstgid + i; // Global tile ID
                    const col = i % tileset.columns;
                    const row = Math.floor(i / tileset.columns);

                    const x = tileset.margin + col * (tileset.tileWidth + tileset.spacing);
                    const y = tileset.margin + row * (tileset.tileHeight + tileset.spacing);

                    result.tilesetConfig[gid] = {
                        rect: new Rect(x, y, tileset.tileWidth, tileset.tileHeight),
                        image: tileset.image
                    };
                }
                
                // Add metadata (like animations) for specific grid tiles
                if (tileset.tiles) {
                    for (const tile of tileset.tiles) {
                        const gid = tileset.firstgid + tile.id;
                        if (result.tilesetConfig[gid] && tile.animation) {
                            result.tilesetConfig[gid].animation = tile.animation;
                            result.tilesetConfig[gid].firstgid = tileset.firstgid;
                        }
                    }
                }
            }
        }

        // Use the first tileset's image as the default image
        if (result.tilesets.length > 0) {
            result.image = result.tilesets[0].image;
        }

        // Parse layers
        for (const layerData of tiledJSON.layers) {
            if (layerData.type === "tilelayer") {
                const layer = {
                    name: layerData.name,
                    visible: layerData.visible !== false,
                    opacity: layerData.opacity !== undefined ? layerData.opacity : 1,
                    data: []
                };

                // Convert flat array to 2D array
                if (Array.isArray(layerData.data)) {
                    for (let row = 0; row < layerData.height; row++) {
                        const start = row * layerData.width;
                        layer.data.push(layerData.data.slice(start, start + layerData.width));
                    }
                }
                else if (typeof layerData.data === "string") {
                    console.error(`TiledLoader: Layer "${layer.name}" uses Base64/Compressed format. Change "Tile Layer Format" to "CSV" in Tiled Map Properties and re-export.`);
                }

                result.layers.push(layer);
            }
        }

        return result;
    }

    /**
     * Load a Tiled JSON file from a URL.
     * @param {string} url - Path to the Tiled JSON file.
     * @returns {Promise<Object>} - Promise that resolves with the parsed JSON.
     */
    static async LoadJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load Tiled map: ${url} (${response.status})`);
            }
            return await response.json();
        } catch (error) {
            console.error(`TiledLoader: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create multiple Tileset GameObjects from a Tiled map (one per layer).
     * @param {Object} mapData - The parsed map data from TiledLoader.Parse().
     * @param {Vector2} position - World position for the tilesets.
     * @param {number|Vector2} scale - Scale factor.
     * @returns {Array<Tileset>} - Array of Tileset objects (one per layer).
     */
    static CreateTilesets(mapData, position, scale = 1) {
        const tilesets = [];

        for (const layer of mapData.layers) {
            if (!layer.visible) continue;

            const tileset = new Tileset(
                mapData.image,
                Vector2.Copy(position),
                scale,
                mapData.tilesetConfig,
                layer.data,
                mapData.tileWidth,
                mapData.tileHeight
            );

            // Store layer metadata
            tileset.layerName = layer.name;
            tileset.layerOpacity = layer.opacity;

            tilesets.push(tileset);
        }

        return tilesets;
    }


    /**
     * Helper to extract object layers (spawn points, triggers, etc.).
     * @param {Object} tiledJSON - The raw Tiled JSON.
     * @returns {Array<{name: string, objects: Array}>} - Object layers with their objects.
     */
    static GetObjectLayers(tiledJSON) {
        const objectLayers = [];

        for (const layer of tiledJSON.layers) {
            if (layer.type === "objectgroup") {
                objectLayers.push({
                    name: layer.name,
                    objects: layer.objects || []
                });
            }
        }

        return objectLayers;
    }

    /**
     * Extracts animation rectangles and duration for a given GID.
     * Useful for building custom SSAnimationObjectComplex instances from Tiled objects.
     * @param {Object} obj - The Tiled object instance.
     * @param {Object} mapData - The parsed map data from TiledLoader.Parse().
     * @param {Vector2} [position] - World position offset.
     * @param {number|Vector2} [scale] - Scale factor.
     * @returns {{rects: Array<Array<Rect>>, durations: Array<number>, image: HTMLImageElement, position: Vector2, rotation: number, flipX: boolean, flipY: boolean}|null}
     */
    static GetAnimationData(obj, mapData, position = Vector2.Zero(), scale = 1) {
        const actualGid = obj.gid & 0x1FFFFFFF;
        const config = mapData.tilesetConfig[actualGid];
        
        if (!config || !config.animation) return null;

        const framesRects = [];
        let totalDuration = 0;
        
        for (const frame of config.animation) {
            const frameGid = config.firstgid + frame.tileid;
            const frameConfig = mapData.tilesetConfig[frameGid];
            if (frameConfig) {
                framesRects.push(frameConfig.rect);
                totalDuration += frame.duration;
            }
        }

        if (framesRects.length > 0) {
            const scaleX = typeof scale === "number" ? scale : scale.x;
            const scaleY = typeof scale === "number" ? scale : scale.y;
            const objX = position.x + ((obj.x + (obj.width || 0) / 2) * scaleX);
            const objY = position.y + ((obj.y - (obj.height || 0) / 2) * scaleY);

            return {
                rects: [framesRects],
                durations: [(totalDuration / framesRects.length) / 1000],
                image: config.image || mapData.image,
                position: new Vector2(objX, objY),
                rotation: (obj.rotation || 0) * Math.PI / 180,
                flipX: (obj.gid & 0x80000000) !== 0,
                flipY: (obj.gid & 0x40000000) !== 0
            };
        }
        return null;
    }

    /**
     * Finds objects across all object layers that match a specific name.
     * @param {Object} tiledJSON - The raw Tiled JSON map.
     * @param {string} name - The name of the object to find.
     * @param {string} [layerName=null] - Optional layer name to restrict the search.
     * @returns {Array<Object>} - Array of matching Tiled objects.
     */
    static GetObjectsByName(tiledJSON, name, layerName = null) {
        const results = [];
        const objectLayers = TiledLoader.GetObjectLayers(tiledJSON);
        
        for (const layer of objectLayers) {
            if (layerName && layer.name !== layerName) continue;
            for (const obj of layer.objects) {
                if (obj.name === name) {
                    results.push(obj);
                }
            }
        }
        return results;
    }

    /**
     * Finds objects across all object layers that match a specific type (or class).
     * @param {Object} tiledJSON - The raw Tiled JSON map.
     * @param {string} type - The type (or class) of the object to find.
     * @param {string} [layerName=null] - Optional layer name to restrict the search.
     * @returns {Array<Object>} - Array of matching Tiled objects.
     */
    static GetObjectsByType(tiledJSON, type, layerName = null) {
        const results = [];
        const objectLayers = TiledLoader.GetObjectLayers(tiledJSON);
        
        for (const layer of objectLayers) {
            if (layerName && layer.name !== layerName) continue;
            for (const obj of layer.objects) {
                if (obj.type === type || obj.class === type) {
                    results.push(obj);
                }
            }
        }
        return results;
    }

    /**
     * Finds the first object matching a specific name and returns its world position.
     * Automatically handles Tiled's coordinate system differences (top-left for shapes, bottom-left for tile objects).
     * @param {Object} tiledJSON - The raw Tiled JSON map.
     * @param {string} name - The name of the object to find.
     * @param {Vector2} [position] - World position offset.
     * @param {number|Vector2} [scale] - Scale factor.
     * @param {string} [layerName=null] - Optional layer name to restrict the search.
     * @returns {Vector2|null} - The center position of the object, or null if not found.
     */
    static GetObjectPositionByName(tiledJSON, name, position = Vector2.Zero(), scale = 1, layerName = null) {
        const objs = TiledLoader.GetObjectsByName(tiledJSON, name, layerName);
        if (objs.length > 0) {
            const obj = objs[0];
            const scaleX = typeof scale === "number" ? scale : scale.x;
            const scaleY = typeof scale === "number" ? scale : scale.y;

            let objX = obj.x;
            let objY = obj.y;

            // Tiled objects with a GID (tile objects) have a bottom-left origin.
            // Standard objects (points, rects, ellipses) have a top-left origin.
            if (obj.gid) {
                objX += (obj.width || 0) / 2;
                objY -= (obj.height || 0) / 2;
            }
            else {
                objX += (obj.width || 0) / 2;
                objY += (obj.height || 0) / 2;
            }

            return new Vector2(
                position.x + (objX * scaleX),
                position.y + (objY * scaleY)
            );
        }
        return null;
    }

    /**
     * Finds the first object matching a specific name and extracts its animation data.
     * @param {Object} tiledJSON - The raw Tiled JSON map.
     * @param {Object} mapData - The parsed map data from TiledLoader.Parse().
     * @param {string} name - The name of the object to find.
     * @param {Vector2} [position] - World position offset.
     * @param {number|Vector2} [scale] - Scale factor.
     * @param {string} [layerName=null] - Optional layer name to restrict the search.
     * @returns {{rects: Array<Array<Rect>>, durations: Array<number>, image: HTMLImageElement, position: Vector2, rotation: number, flipX: boolean, flipY: boolean}|null}
     */
    static GetAnimationDataByName(tiledJSON, mapData, name, position = Vector2.Zero(), scale = 1, layerName = null) {
        const objs = TiledLoader.GetObjectsByName(tiledJSON, name, layerName);
        if (objs.length > 0) {
            return TiledLoader.GetAnimationData(objs[0], mapData, position, scale);
        }
        return null;
    }

    /**
     * Finds all objects matching a specific name and extracts their animation data.
     * @param {Object} tiledJSON - The raw Tiled JSON map.
     * @param {Object} mapData - The parsed map data from TiledLoader.Parse().
     * @param {string} name - The name of the objects to find.
     * @param {Vector2} [position] - World position offset.
     * @param {number|Vector2} [scale] - Scale factor.
     * @param {string} [layerName=null] - Optional layer name to restrict the search.
     * @returns {Array<{rects: Array<Array<Rect>>, durations: Array<number>, image: HTMLImageElement, position: Vector2, rotation: number, flipX: boolean, flipY: boolean}>}
     */
    static GetAllAnimationDataByName(tiledJSON, mapData, name, position = Vector2.Zero(), scale = 1, layerName = null) {
        const objs = TiledLoader.GetObjectsByName(tiledJSON, name, layerName);
        const animDataArray = [];
        for (const obj of objs) {
            const animData = TiledLoader.GetAnimationData(obj, mapData, position, scale);
            if (animData) {
                animDataArray.push(animData);
            }
        }
        return animDataArray;
    }

    /**
     * Extracts tile objects (sprites and animations) from object layers.
     * @param {Object} tiledJSON - The raw Tiled JSON map.
     * @param {Object} mapData - The parsed map data from TiledLoader.Parse().
     * @param {Vector2} position - World position offset.
     * @param {number|Vector2} scale - Scale factor.
     * @param {string} [layerName=null] - Optional layer name to restrict the search.
     * @returns {Array<SpriteObject>} - Array of SpriteSectionObject or SSAnimationObjectComplex.
     */
    static CreateSpriteObjects(tiledJSON, mapData, position, scale = 1, layerName = null) {
        const spriteObjects = [];
        const scaleX = typeof scale === "number" ? scale : scale.x;
        const scaleY = typeof scale === "number" ? scale : scale.y;

        const objectLayers = TiledLoader.GetObjectLayers(tiledJSON);

        for (const layer of objectLayers) {
            if (layerName && layer.name !== layerName)
                continue;

            for (const obj of layer.objects) {
                if (obj.gid) {
                    // Extract flipping bits
                    const flipX = (obj.gid & 0x80000000) !== 0;
                    const flipY = (obj.gid & 0x40000000) !== 0;
                    
                    // Strip upper 3 bits for actual GID mapping
                    const actualGid = obj.gid & 0x1FFFFFFF;

                    const config = mapData.tilesetConfig[actualGid];
                    if (config) {
                        // Convert Tiled's bottom-left origin to the Engine's center origin
                        const objX = position.x + ((obj.x + (obj.width || 0) / 2) * scaleX);
                        const objY = position.y + ((obj.y - (obj.height || 0) / 2) * scaleY);

                        if (config.animation) {
                            const animData = TiledLoader.GetAnimationData(obj, mapData, position, scale);
                            if (animData) {
                                const animObj = SSAnimationObjectComplex.FromAnimationData(scale, animData);
                                
                                animObj.layerName = layer.name;
                                
                                animObj.PlayAnimationLoop(0);
                                spriteObjects.push(animObj);
                            }
                        }
                        else {
                            // Static sprite object
                            const sprite = new SpriteSectionObject(
                                new Vector2(objX, objY),
                                (obj.rotation || 0) * Math.PI / 180,
                                scale,
                                config.image || mapData.image,
                                config.rect
                            );
                            
                            sprite.flipX = flipX;
                            sprite.flipY = flipY;
                            sprite.layerName = layer.name;
                            
                            spriteObjects.push(sprite);
                        }
                    }
                }
            }
        }

        return spriteObjects;
    }

    /**
     * Creates a GameObjectsBackgroundLayer from a specific Tiled object layer.
     * Extracts parallax factors and sprite objects automatically.
     * @param {Object} tiledJSON - The raw Tiled JSON map.
     * @param {Object} mapData - The parsed map data from TiledLoader.Parse().
     * @param {string} layerName - The name of the layer to extract.
     * @param {Vector2} [position] - World position offset.
     * @param {number|Vector2} [scale] - Scale factor.
     * @returns {GameObjectsBackgroundLayer|null}
     */
    static CreateGameObjectsBackgroundLayer(tiledJSON, mapData, layerName, position = Vector2.Zero(), scale = 1) {
        const rawLayer = tiledJSON.layers.find(l => l.name === layerName);
        if (!rawLayer)
            return null;

        // Generate sprites at LOCAL coordinates (Vector2.Zero) to avoid double-adding the world position
        const sprites = TiledLoader.CreateSpriteObjects(tiledJSON, mapData, Vector2.Zero(), scale, layerName);
        
        const speedX = rawLayer.parallaxx !== undefined ? rawLayer.parallaxx : 1;
        const speedY = rawLayer.parallaxy !== undefined ? rawLayer.parallaxy : 1;

        const scaleX = typeof scale === "number" ? scale : scale.x;
        const scaleY = typeof scale === "number" ? scale : scale.y;

        // Tiled anchors parallax to a specific origin point relative to the CENTER of the camera viewport.
        // Our engine's BackgroundLayer calculates parallax relative to the TOP-LEFT of the camera (camera.position).
        // To bridge this, we subtract half the screen size from the scaled origin to perfectly replicate Tiled's behavior.
        const parallaxOffsetX = -((tiledJSON.parallaxoriginx || 0) * scaleX - renderer.halfWidth ) * (1 - speedX);
        const parallaxOffsetY = -((tiledJSON.parallaxoriginy || 0) * scaleY - renderer.halfHeight) * (1 - speedY);

        // Also support individual layer offsets if defined in Tiled
        const layerOffsetX = (rawLayer.offsetx || 0) * scaleX;
        const layerOffsetY = (rawLayer.offsety || 0) * scaleY;

        // Final base position of the background layer
        const layerPos = new Vector2(
            position.x + parallaxOffsetX + layerOffsetX, 
            position.y + parallaxOffsetY + layerOffsetY
        );
                
        return new GameObjectsBackgroundLayer(layerPos, sprites, new Vector2(speedX, speedY));
    }
}
