/**
 * Base class for all game objects. Extend this and override `Start()`, `Update()`, and `Draw()`.
 */
class GameObject {
    /** @type {boolean} */
    _active = true;
    /** @type {Vector2} */
    _position;
    /** @type {number} */
    _rotation = 0;
    /** @type {Vector2} */
    _scale = new Vector2(1, 1);
    /** @type {{x: number, y: number}} */
    _pivot = { x: 0, y: 0 };
    /** @type {Collider|undefined} */
    _collider;

    /** @param {Vector2} position - Initial world position. */
    constructor(position) {
        this._position = Vector2.Copy(position);
    }

    get active() {
        return this._active;
    }
    get position() {
        return this._position;
    }
    get rotation() {
        return this._rotation;
    }
    get scale() {
        return this._scale;
    }
    get x() {
        return this._position.x;
    }
    get y() {
        return this._position.y;
    }
    get pivot() {
        return this._pivot;
    }
    get collider() {
        return this._collider;
    }

    set active(value) {
        this._active = value;
    }
    set position(value) {
        this._position = Vector2.Copy(value);
    }
    set rotation(value) {
        this._rotation = value;
    }
    set scale(value) {
        if (typeof(value) === 'number')
            this._scale.Set(value, value);
        else
            this._scale = value;
    }
    set x(value) {
        this._position.x = value;
    }
    set y(value) {
        this._position.y = value;
    }
    set pivot(value) {
        this._pivot.x = value.x;
        this._pivot.y = value.y;
    }
    set collider(value) {
        this._collider = value;
    }

    /** Called once when the game starts. Override to initialise the object. */
    Start() { }

    /**
     * Called every frame. Override to update game logic.
     * @param {number} deltaTime - Elapsed time since the last frame, in seconds.
     */
    Update(deltaTime) {
        this._collider?.UpdateFromGO();
    }

    /**
     * Called every frame after `Update()`. Override to draw the object.
     * @param {Renderer} renderer
     */
    Draw(renderer) { }

    /** Called from the game when the game object is removed from it */
    Destroy() {}

    /**
     * Called when this object's collider first touches another collider.
     * @param {Collider} myCollider - This object's collider.
     * @param {Collider} otherCollider - The collider it collided with.
     */
    OnCollisionEnter(myCollider, otherCollider) { }

    /**
     * Called when this object's collider stops touching another collider.
     * @param {Collider} myCollider - This object's collider.
     * @param {Collider} otherCollider - The collider it stopped colliding with.
     */
    OnCollisionExit(myCollider, otherCollider) { }

    /** Called when the player clicks on this object's collider. */
    OnClick() { }
}

/**
 * A game object that renders a rectangle.
 */
class RectangleGO extends GameObject {
    /**
     * @param {Vector2} position
     * @param {number} [width=100]
     * @param {number} [height=100]
     * @param {Color} [color]
     * @param {boolean} [stroke=false] - If true, draws as outline only.
     * @param {number} [lineWidth=1]
     */
    constructor(position, width=100, height=100, color=Color.red, stroke=false, lineWidth=1) {
        super(position);
        this.rectangle = new Rectangle(this._position, width, height, color, stroke, lineWidth);
    }

    get width() {
        return this.rectangle.width;
    }
    get height() {
        return this.rectangle.height;
    }
    get color() {
        return this.rectangle.color;
    }

    set width(value) {
        this.rectangle.width = value;
    }
    set height(value) {
        this.rectangle.height = value;
    }
    set color(value) {
        this.rectangle.color = value;
    }

    Draw(renderer) {
        renderer.DrawRectangle(this.position.x, this.position.y, this.rectangle.width, this.rectangle.height, this.rectangle.color, this.rectangle.stroke, this.rectangle.lineWidth, this.rotation, this.pivot);
    }
}

/**
 * A game object that renders a circle.
 */
class CircleGO extends GameObject {
    /**
     * @param {Vector2} position
     * @param {number} [radius=100]
     * @param {Color} [color]
     * @param {boolean} [stroke=false] - If true, draws as outline only.
     * @param {number} [lineWidth=1]
     */
    constructor(position, radius=100, color=Color.red, stroke=false, lineWidth=1) {
        super(position);
        this.circle = new Circle(this._position, radius, color, stroke=false, lineWidth=1)
    }

    get color() {
        return this.circle.color;
    }
    get radius() {
        return this.circle.radius;
    }

    set color(value) {
        this.circle.color = value;
    }
    set radius(value) {
        this.circle.radius = value;
    }

    Draw(renderer) {
        renderer.DrawCircle(this.position.x, this.position.y, this.circle.radius, this.circle.color, this.circle.stroke, this.circle.lineWidth);
    }
}

/**
 * A game object that renders a sprite image. Supports scale, rotation, flip, and alpha.
 */
class SpriteObject extends GameObject {
    /**
     * @param {Vector2} position - World position (center of sprite).
     * @param {number} rotation - Initial rotation in radians.
     * @param {number|Vector2} scale - Uniform scale (number) or per-axis scale (Vector2).
     * @param {HTMLImageElement} img - The image to display.
     * @param {number} [alpha=1.0] - Opacity (0 = invisible, 1 = fully opaque).
     */
    constructor(position, rotation, scale, img, alpha=1.0) {
        super(position);
        
        this.sprite = new Sprite(img, this._position, this._rotation, this._scale, alpha);
        this._rotation = rotation;
        this.scale = scale;

        this.flipX = false;
        this.flipY = false;
    }

    get img() {
        return this.sprite.img;
    }

    get position() {
        return this._position;
    }

    get rotation() {
        return this._rotation;
    }

    get scale() {
        return this._scale;
    }

    get flipX() {
        return this.sprite.flipX;
    }
    get flipY() {
        return this.sprite.flipY;
    }

    set img(newImg) {
        this.sprite.img = newImg;
    }

    set position(newPosition) {
        this._position = newPosition;
        this.sprite.position = this._position;
    }

    set rotation(newRotation) {
        this._rotation = newRotation;
        this.sprite.rotation = this._rotation;
    }

    set scale(newScale) {
        if (typeof(newScale) === 'number')
            this._scale.Set(newScale, newScale);
        else
            this._scale = newScale;
        this.sprite.scale = this._scale;
    }

    set flipX(value) {
        this.sprite.flipX = value;
    }
    set flipY(value) {
        this.sprite.flipY = value;
    }

    set pivot(value) {
        this._pivot = value.x;
        this._pivot = value.y;
        this.sprite.pivot.x = value.x;
        this.sprite.pivot.y = value.y;
    }

    Draw(renderer) {
        this.sprite.Draw(renderer);
    }

    DrawSection(renderer, sx, sy, sw, sh) {
        this.sprite.DrawSection(renderer, sx, sy, sw, sh);
    }
}

/**
 * A sprite object with simple sprite-sheet animation. All frames are the same size,
 * arranged in a grid (columns = frames per animation, rows = animation index).
 */
class SSAnimationObjectBasic extends SpriteObject {
    /**
     * @param {Vector2} position
     * @param {number} rotation - Initial rotation in radians.
     * @param {number|Vector2} scale
     * @param {HTMLImageElement} img - The full sprite sheet.
     * @param {number} frameWidth - Width of a single frame in pixels.
     * @param {number} frameHeight - Height of a single frame in pixels.
     * @param {number[]} frameCount - Array where each index is an animation row and the value is its frame count.
     * @param {number} framesDuration - Time per frame in seconds.
     */
    constructor(position, rotation, scale, img, frameWidth, frameHeight, frameCount, framesDuration) {
        super(position, rotation, scale, img);

        this.framesDuration = framesDuration;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameCount = frameCount;
        this.actualAnimation = 0;
        this.actualFrame = 0;
        this.actualFrameCountTime = 0;

        this.spritePosition = new Vector2(0, 0); // only used if debugMode
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.actualFrameCountTime += deltaTime;
        if (this.actualFrameCountTime >= this.framesDuration) {
            // update the animation with the new frame
            this.actualFrame = (this.actualFrame + 1) % this.frameCount[this.actualAnimation];

            this.actualFrameCountTime = 0;
        }

        this.spritePosition.Set(
            this.position.x - this.frameWidth * this.scale.x * 0.5,
            this.position.y - this.frameHeight * this.scale.y * 0.5
        );
    }

    Draw(renderer) {
        this.sprite.DrawSection(renderer, this.actualFrame * this.frameWidth, this.actualAnimation * this.frameHeight, this.frameWidth, this.frameHeight, 0, 0, this.frameWidth, this.frameHeight);
    }

    /**
     * Switches to the given animation row.
     * @param {number} animationId - Row index in the sprite sheet.
     * @param {boolean} [resetToFrame0=true] - Whether to restart from frame 0.
     */
    PlayAnimationLoop(animationId, resetToFrame0=true) {
        this.actualAnimation = animationId;

        if (resetToFrame0 || this.actualFrame >= this.frameCount[this.actualAnimation].length) {
            // reset the frame count
            this.actualFrame = 0;
            this.actualFrameCountTime = 0;
        }
    }
}

/**
 * A sprite object with complex sprite-sheet animation. Each frame can have a different
 * size and position within the sheet, defined by an array of rectangles per animation.
 */
class SSAnimationObjectComplex extends SpriteObject {
    /**
     * @param {Vector2} position
     * @param {number} rotation - Initial rotation in radians.
     * @param {number|Vector2} scale
     * @param {HTMLImageElement} img - The full sprite sheet.
     * @param {Array<Array<{x:number, y:number, w:number, h:number}>>} animationsRectangles
     *   - Outer array = animations; inner array = frames; each frame is a source rect.
     * @param {number[]} framesDurations - Time per frame (seconds) for each animation.
     */
    constructor(position, rotation, scale, img, animationsRectangles, framesDurations) {
        super(position, rotation, scale, img);

        this.animationsRectangles = animationsRectangles;
        this.framesDurations = framesDurations;
        
        this.actualAnimationIndex = 0;
        this.actualFrame = 0;
        this.actualRectFrame = this.animationsRectangles[this.actualAnimationIndex][this.actualFrame];
        this.actualFrameCountTime = 0;

        this.spritePosition = new Vector2(0, 0);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.actualFrameCountTime += deltaTime;
        if (this.actualFrameCountTime >= this.framesDurations[this.actualAnimationIndex]) {
            // update the animation with the new frame
            this.actualFrame = (this.actualFrame + 1) % this.animationsRectangles[this.actualAnimationIndex].length;
            this.actualRectFrame = this.animationsRectangles[this.actualAnimationIndex][this.actualFrame];

            this.actualFrameCountTime = 0;
        }

        this.spritePosition.Set(
            this.position.x - this.actualRectFrame.w * this.scale.x * 0.5,
            this.position.y - this.actualRectFrame.h * this.scale.y * 0.5
        );
    }

    Draw(renderer) {
        this.sprite.DrawSection(renderer, this.actualRectFrame.x, this.actualRectFrame.y, this.actualRectFrame.w, this.actualRectFrame.h, 0, 0, this.actualRectFrame.w, this.actualRectFrame.h);

        if (debugMode) {
            renderer.DrawStrokeBasicRectangle(this.spritePosition.x, this.spritePosition.y, this.actualRectFrame.w * this.scale.x, this.actualRectFrame.h * this.scale.y);
        }
    }

    /**
     * Switches to the given animation.
     * @param {number} animationId - Index into `animationsRectangles`.
     * @param {boolean} [resetToFrame0=true] - Whether to restart from frame 0.
     */
    PlayAnimationLoop(animationId, resetToFrame0=true) {
        this.actualAnimationIndex = animationId;

        if (resetToFrame0 || this.actualFrame >= this.animationsRectangles[this.actualAnimationIndex].length) {
            // reset the frame count
            this.actualFrame = 0;
            this.actualFrameCountTime = 0;
        }

        this.actualRectFrame = this.animationsRectangles[this.actualAnimationIndex][this.actualFrame];
    }
}

/**
 * A game object that renders a tile map from a sprite sheet.
 */
class Tileset extends GameObject {
    /**
     * @param {HTMLImageElement} img - The tile sheet image.
     * @param {Vector2} position - Top-left draw position.
     * @param {number|Vector2} scale - Scale factor applied to tiles.
     * @param {Object.<number, {rect: {x:number, y:number, w:number, h:number}}>} tilesetConfig
     *   - Maps tile IDs to their source rect in the sheet.
     * @param {number[][]} tilesetMap - 2D array of tile IDs (0 = empty).
     * @param {number} tileWidth - Tile width in pixels.
     * @param {number} tileHeight - Tile height in pixels.
     */
    constructor(img, position, scale, tilesetConfig, tilesetMap, tileWidth, tileHeight) {
        super(position);

        this.sprite = new Sprite(img, position, 0, scale);

        this.tilesetMap = tilesetMap; // 2D array representing the map layout
        this.tilesetConfig = tilesetConfig; // Mapping from tile ID to source Rect
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
    }

    Draw(renderer) {
        // The base position of the layer is updated by the Update method for parallax
        const basePosX = this.position.x;
        const basePosY = this.position.y;
        
        // The sprite's scale is used for drawing
        const scaleX = this.sprite.scale.x;
        const scaleY = this.sprite.scale.y;

        this.tilesetMap.forEach((row, rowIndex) => {
            row.forEach((tileId, colIndex) => {
                // A tileId of 0 (or any other falsy value) can represent an empty tile
                if (!tileId) {
                    return;
                }

                const tileConfig = this.tilesetConfig[tileId];
                if (!tileConfig) {
                    return; // Skip if no configuration for this tile ID
                }

                const sourceRect = tileConfig.rect;

                // Calculate the position to draw this tile on the canvas (top-left corner).
                const drawX = basePosX + (colIndex * this.tileWidth * scaleX);
                const drawY = basePosY + (rowIndex * this.tileHeight * scaleY);

                // Use the sprite's method to draw the specific tile section at the calculated position.
                this.sprite.DrawSectionBasicAt(renderer, sourceRect.x, sourceRect.y, sourceRect.w, sourceRect.h, drawX, drawY);
            });
        });
    }
}

//#region Cameras

class Camera {
    _position;
    _rotation = 0;
    _scale = 1;

    // zoom
    _zoomTarget   = 1;
    _zoomFrom     = 1;
    _zoomTime     = 0;
    _zoomDuration = 1;

    constructor(position) {
        this._position = Vector2.Copy(position);
        this.lastState = { x: 0, y: 0, r: 0, s: 1 };
    }

    get position() {
        return this._position;
    }
    get rotation() {
        return this._rotation;
    }
    get scale() {
        return this._scale;
    }
    get x() {
        return this._position.x;
    }
    get y() {
        return this._position.y;
    }

    set position(value) {
        this._position = Vector2.Copy(value);
    }
    set rotation(value) {
        this._rotation = value;
    }
    set scale(value) {
        this._scale = value;
    }
    set x(value) {
        this._position.x = value;
    }
    set y(value) {
        this._position.y = value;
    }

    Start() {}

    Update(deltaTime) {
        if (this._zoomTime > 0) {
            this._zoomTime -= deltaTime;
            const t    = 1 - Math.max(0, this._zoomTime) / this._zoomDuration;
            const ease = t * t * (3 - 2 * t); // smoothstep
            this._scale = this._zoomFrom + (this._zoomTarget - this._zoomFrom) * ease;
            if (this._zoomTime <= 0) {
                this._scale   = this._zoomTarget;
                this._zoomTime = 0;
            }
        }
    }

    /**
     * Smoothly animates the camera zoom to a target scale.
     * @param {number} targetScale  Destination scale (1 = normal, >1 zoom in, <1 zoom out).
     * @param {number} [duration=0] Transition time in seconds. 0 = instant.
     */
    Zoom(targetScale, duration = 0) {
        if (duration <= 0) {
            this._scale      = targetScale;
            this._zoomTarget = targetScale;
            this._zoomTime   = 0;
            return;
        }
        this._zoomFrom     = this._scale;
        this._zoomTarget   = targetScale;
        this._zoomDuration = duration;
        this._zoomTime     = duration;
    }

    /**
     * Instantly jumps to a scale then smoothly returns to 1. Great for impact feedback.
     * @param {number} punchScale   Scale applied immediately (e.g. 1.08 or 0.92).
     * @param {number} [returnDuration=0.3] Time in seconds to ease back to scale 1.
     */
    ZoomPunch(punchScale, returnDuration = 0.3) {
        this._scale        = punchScale;
        this._zoomFrom     = punchScale;
        this._zoomTarget   = 1.0;
        this._zoomDuration = returnDuration;
        this._zoomTime     = returnDuration;
    }

    PreDraw(renderer) {
        renderer.ApplyCameraTransform(this);
    }

    PostDraw(renderer) {
        renderer.RestoreCameraTransform();
    }
}

class FollowCameraBasic extends Camera {
    constructor(position, target, offset=Vector2.Zero()) {
        super(position);

        this.target = target;
        this.offset = offset;
    }

    Start() {
        this.position.Set(
            this.target.position.x - (canvas.width  / 2) + this.offset.x,
            this.target.position.y - (canvas.height / 2) + this.offset.y
        );
    }

    Update(deltaTime) {
        this.position.Set(
            this.target.position.x - (canvas.width  / 2) + this.offset.x,
            this.target.position.y - (canvas.height / 2) + this.offset.y
        );
    }
}

class FollowCamera extends Camera {
    constructor(position, target, minX, maxX, minY, maxY, smoothingSpeed=5, offset=Vector2.Zero()) {
        super(position);

        this.target = target;
        this.targetPosition = Vector2.Zero();

        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;

        this.smoothingSpeed = smoothingSpeed;
        this.offset = offset;

        // shake
        this.shakingValue = Vector2.Zero();
        this.shakingTime = 0;
        this.shakingSpeed = 40;
        this.shakingSize = 5;
        this.shakeInitRandom = Vector2.Zero();
    }

    Start() {
        this.position.Set(
            this.target.position.x - (canvas.width  / 2) + this.offset.x,
            this.target.position.y - (canvas.height / 2) + this.offset.y
        );
    }

    Update(deltaTime) {
        this.targetPosition.x = this.target.position.x - canvas.width / 2;
        this.targetPosition.y = this.target.position.y - canvas.height / 2;

        if (this.targetPosition.x < this.minX)
            this.targetPosition.x = this.minX;
        if (this.targetPosition.x > this.maxX)
            this.targetPosition.x = this.maxX;

        if (this.targetPosition.y < this.minY)
            this.targetPosition.y = this.minY;
        if (this.targetPosition.y > this.maxY)
            this.targetPosition.y = this.maxY;

        this.shakingValue.Set(0, 0);
        if (this.shakingTime > 0) {
            this.shakingTime -= deltaTime;

            this.shakingValue.x = Math.cos(this.shakeInitRandom.x + this.shakingTime * this.shakingSpeed) * this.shakingSize;
            this.shakingValue.y = Math.sin(this.shakeInitRandom.y + this.shakingTime * this.shakingSpeed) * this.shakingSize;
        }

        const smoothStep = this.smoothingSpeed * deltaTime;

        // TODO apply offset
        this.position.x += ((this.targetPosition.x - this.position.x) * smoothStep) + this.shakingValue.x;
        this.position.y += ((this.targetPosition.y - this.position.y) * smoothStep) + this.shakingValue.y;

        super.Update(deltaTime); // handles zoom animation
    }

    Shake(time, speed, size) {
        this.shakingTime = time;
        this.shakingSpeed = speed;
        this.shakingSize = size;
        this.shakeInitRandom.Randomize();
    }
}

// #endregion

// #region Object Pool

class Pool {
    static semiTransparentRed = new Color(1, 0, 0, 0.5);

    constructor(owner, maxSize, objectConstructor, constructorParams=[]) {
        this.owner = owner;
        this.maxSize = maxSize;
        this.objectConstructor = objectConstructor;
        this.constructorParams = constructorParams;

        this.objects = [];

        this.drawDebug = false;

        // initialize the bullet pool array
        for (let i = maxSize; i > 0; i--) {
            const object = new this.objectConstructor(...constructorParams);
            object.owner = this.owner;
            object.active = false;

            this.objects.push(object);
        }
    }

    Update(deltaTime) {
        this.objects.forEach(object => {
            if (object.active)
                object.Update(deltaTime);
        });
    }

    Draw(renderer) {
        this.objects.forEach(object => {
            if (object.active)
                object.Draw(renderer);
        });

        if (this.drawDebug) {
            // draw the state of the object pool
            for (let i = 0; i < this.objects.length; i++) {
                if (this.objects[i].active) {
                    renderer.DrawFillBasicRectangle(10 + 20 * i, 10, 20, 20, Pool.semiTransparentRed);
                }
                renderer.DrawStrokeBasicRectangle(10 + 20 * i, 10, 20, 20, Color.white);
            }
        }
    }

    Activate() {
        let object = null;

        // search for the first object in the objects array no-activated
        let i = 0;
        while(object == null && i < this.objects.length) {
            if (!this.objects[i].active) {
                object = this.objects[i];
            }
            else {
                i++;
            }
        }
        
        if (object == null) {
            // theres is no object non-active in the pool
            // lets create a new one
            object = new this.objectConstructor(...this.constructorParams);
            object.owner = this.owner;

            this.objects.push(object);
        }

        object.active = true;
        
        return object;
    }

    DisableAll() {
        this.objects.forEach(object => {
            object.active = false;
        });
    }
}

// #endregion

// #region BackgroundLayers

class BackgroundLayer {
    constructor(position, speed) {
        this.position = position;
        this.speed = speed;
        this.camera = null;

        this.initialPosition = new Vector2(position.x, position.y);
    }

    Update(deltaTime) {
        this.position.x = this.initialPosition.x + (this.camera.position.x * (1 - this.speed.x));
        this.position.y = this.initialPosition.y + (this.camera.position.y * (1 - this.speed.y));
    }

    Draw(renderer) {}
}

class StaticColorLayer {
    constructor(color) {
        this.color = color;
        this.camera = null;
    }

    Update() {}

    Draw(renderer) {
        renderer.DrawFillBasicRectangle(this.camera.x, this.camera.y, canvas.width, canvas.height, this.color);
    }
}

class StaticGradientLayer {
    constructor(renderer, direction, colorStops) {
        this.gradient = new LinearGradient(renderer, direction, colorStops);
        this.camera = null;
    }

    Update() {}

    Draw(renderer) {
        renderer.DrawGradientRectangle(this.camera.x, this.camera.y, canvas.width, canvas.height, this.gradient);
    }
}

class ColorRectangleLayer extends BackgroundLayer {
    constructor(color, position, width, height, speed=Vector2.Zero()) {
        super(position, speed);
        
        this.color = color;
        this.width = width;
        this.height = height;

        this.camera = null;
    }

    Draw(renderer) {
        renderer.DrawFillBasicRectangle(this.camera.x, this.camera.y, this.width, this.height, this.color);
    }
}

class GradientRectangleLayer extends BackgroundLayer {
    constructor(renderer, direction, colorStops, position, width, height, speed=Vector2.Zero()) {
        super(position, speed);

        this.gradient = new LinearGradient(renderer, direction, colorStops);
        this.width = width;
        this.height = height;

        this.camera = null;
    }

    Draw(renderer) {
        renderer.DrawGradientRectangle(this.camera.x, this.camera.y, this.width, this.height, this.gradient);
    }
}

class SpriteBackgroundLayer extends BackgroundLayer {
    constructor(img, position, rotation, scale, speed=Vector2.Zero(), section=null) {
        super(position, speed);

        this.sprite = null;
        if (section === null)
            this.sprite = new Sprite(img, position, rotation, scale);
        else
            this.sprite = new SpriteSection(img, position, rotation, scale, section);
    }

    Draw(renderer) {
        this.sprite.DrawBasic(renderer);
    }
}

class MultispritesBackgroundLayer extends BackgroundLayer {
    constructor(position, sprites, speed=Vector2.Zero()) {
        super(position, speed);
        
        this.sprites = sprites;
    }

    Start() {
        this.sprites.forEach(sprite => {
            sprite.initialPosition = new Vector2(sprite.x, sprite.y);
        });
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.sprites.forEach(sprite => {
            sprite.position.Set(sprite.initialPosition.x + this.position.x, sprite.initialPosition.y + this.position.y);
        });
    }

    Draw(renderer) {
        this.sprites.forEach(sprite => {
            sprite.DrawBasic(renderer);
        });
    }
}

class TilesetBackgroundLayer extends BackgroundLayer {
    constructor(img, position, scale, speed, tilesetConfig, tilesetMap, tileWidth, tileHeight) {
        super(position, speed);
        
        this.tileset = new Tileset(img, position, scale, tilesetConfig, tilesetMap, tileWidth, tileHeight);
    }

    Update(deltaTime) {
        this.position.x = this.initialPosition.x + (this.camera.position.x * (1 - this.speed.x));
        this.position.y = this.initialPosition.y + (this.camera.position.y * (1 - this.speed.y));

        this.tileset.position.Set(this.position.x, this.position.y);
    }

    Draw(renderer) {
        this.tileset.Draw(renderer);
    }
}

class BackgroundLayers {
    constructor(camera, layers=[]) {
        this.camera = camera;
        this.layers = layers;
    }

    InsertLayer(layer) {
        this.layers.push(layer);
        layer.camera = this.camera;
    }

    Start() {
        this.layers.forEach(layer => {
            layer.camera = this.camera;
            if (layer.Start)
                layer.Start()
        });
    }

    Update(deltaTime) {
        this.layers.forEach(layer => layer.Update(deltaTime));
    }

    Draw(renderer) {
        this.layers.forEach(layer => layer.Draw(renderer));
    }

    DrawLayer(renderer, layerIndex) {
        this.layers[layerIndex].Draw(renderer);
    }

    DrawLayers(renderer, lastLayerIndex) {
        for (let i = 0; i <= lastLayerIndex; i++) {
            this.layers[i].Draw(renderer);
        }
    }
}

// #endregion
