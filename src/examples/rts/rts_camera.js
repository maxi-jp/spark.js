class RTSCamera extends Camera {
    constructor(position, game, mapWidth, mapHeight, options = {}) {
        super(position);
        this.game = game;

        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;

        this.keyboardPanSpeed = options.keyboardPanSpeed || 500;
        this.edgePanSpeed = options.edgePanSpeed || 800;
        this.edgeMargin = options.edgeMargin || 20;
        this.edgeExponent = options.edgeExponent || 1.75;

        this.minZoom = options.minZoom || 0.5;
        this.maxZoom = options.maxZoom || 2.0;
        this.zoomStep = options.zoomStep || 0.1;

        this.dragPanEnabled = options.dragPanEnabled !== undefined ? options.dragPanEnabled : true;
        this.isDragging = false;
        this.lastDragMouseX = 0;
        this.lastDragMouseY = 0;

        this.debugEnabled = options.debugEnabled !== undefined ? options.debugEnabled : true;
        this.debugTextColor = options.debugTextColor || Color.white;
        this.debugPanelColor = options.debugPanelColor || new Color(0, 0, 0, 0.65);
        this.debugBounds = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0
        };
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        this.UpdateMiddleMouseDrag();
        this.UpdatePanning(deltaTime);
        this.UpdateZoom();
        this.ClampToBounds();
    }

    UpdateMiddleMouseDrag() {
        if (!this.dragPanEnabled)
            return;

        if (Input.mouse.middle.down) {
            this.isDragging = true;
            this.lastDragMouseX = Input.mouse.x;
            this.lastDragMouseY = Input.mouse.y;
        }

        if (Input.mouse.middle.up) {
            this.isDragging = false;
        }

        if (!this.isDragging || !Input.mouse.middle.pressed)
            return;

        const dx = Input.mouse.x - this.lastDragMouseX;
        const dy = Input.mouse.y - this.lastDragMouseY;

        this.lastDragMouseX = Input.mouse.x;
        this.lastDragMouseY = Input.mouse.y;

        if (dx === 0 && dy === 0)
            return;

        // Screen-space drag converted to world-space movement under current zoom.
        this.x -= dx / this.scale;
        this.y -= dy / this.scale;
    }

    UpdatePanning(deltaTime) {
        const keyboardDir = this.GetArrowDirection();
        const edgeDir = this.isDragging ? Vector2.Zero() : this.GetEdgePanDirection();

        this.ApplyDirectionalPan(keyboardDir, this.keyboardPanSpeed, deltaTime);
        this.ApplyDirectionalPan(edgeDir, this.edgePanSpeed, deltaTime);
    }

    UpdateZoom() {
        const wheel = Input.mouse.wheel;
        if (wheel === 0)
            return;

        const oldScale = this.scale;
        const zoomFactor = wheel < 0 ? (1 + this.zoomStep) : (1 - this.zoomStep);
        const newScale = Clamp(oldScale * zoomFactor, this.minZoom, this.maxZoom);

        if (Math.abs(newScale - oldScale) < 0.0001)
            return;

        const mouseX = Input.mouse.x;
        const mouseY = Input.mouse.y;
        const halfW = this.game.screenHalfWidth;
        const halfH = this.game.screenHalfHeight;

        const worldX = ((mouseX - halfW) / oldScale) + this.x + halfW;
        const worldY = ((mouseY - halfH) / oldScale) + this.y + halfH;

        this.scale = newScale;

        this.x = worldX - halfW - ((mouseX - halfW) / newScale);
        this.y = worldY - halfH - ((mouseY - halfH) / newScale);
    }

    GetArrowDirection() {
        let x = 0;
        let y = 0;

        if (Input.IsKeyPressed(KEY_LEFT)  || Input.IsKeyPressed(KEY_A)) x -= 1;
        if (Input.IsKeyPressed(KEY_RIGHT) || Input.IsKeyPressed(KEY_D)) x += 1;
        if (Input.IsKeyPressed(KEY_UP)    || Input.IsKeyPressed(KEY_W)) y -= 1;
        if (Input.IsKeyPressed(KEY_DOWN)  || Input.IsKeyPressed(KEY_S)) y += 1;

        return new Vector2(x, y);
    }

    GetEdgePanDirection() {
        const x = Input.mouse.x;
        const y = Input.mouse.y;

        const screenW = this.game.screenWidth;
        const screenH = this.game.screenHeight;

        let panX = 0;
        let panY = 0;

        if (x < this.edgeMargin) {
            const t = Clamp((this.edgeMargin - x) / this.edgeMargin, 0, 1);
            panX = -Math.pow(t, this.edgeExponent);
        }
        else if (x > screenW - this.edgeMargin) {
            const t = Clamp((x - (screenW - this.edgeMargin)) / this.edgeMargin, 0, 1);
            panX = Math.pow(t, this.edgeExponent);
        }

        if (y < this.edgeMargin) {
            const t = Clamp((this.edgeMargin - y) / this.edgeMargin, 0, 1);
            panY = -Math.pow(t, this.edgeExponent);
        }
        else if (y > screenH - this.edgeMargin) {
            const t = Clamp((y - (screenH - this.edgeMargin)) / this.edgeMargin, 0, 1);
            panY = Math.pow(t, this.edgeExponent);
        }

        return new Vector2(panX, panY);
    }

    ClampToBounds() {
        const halfW = this.game.screenHalfWidth;
        const halfH = this.game.screenHalfHeight;
        const scale = this.scale;

        // Renderer applies zoom around screen center, so camera bounds must be
        // computed in camera-space, not simple top-left view size math.
        let minX = -halfW + (halfW / scale);
        let maxX = this.mapWidth - halfW - (halfW / scale);
        let minY = -halfH + (halfH / scale);
        let maxY = this.mapHeight - halfH - (halfH / scale);

        // If the visible area is larger than the map on an axis, lock camera to center.
        if (maxX < minX) {
            const centerX = (this.mapWidth * 0.5) - halfW;
            minX = centerX;
            maxX = centerX;
        }

        if (maxY < minY) {
            const centerY = (this.mapHeight * 0.5) - halfH;
            minY = centerY;
            maxY = centerY;
        }

        this.debugBounds.minX = minX;
        this.debugBounds.maxX = maxX;
        this.debugBounds.minY = minY;
        this.debugBounds.maxY = maxY;

        this.x = Clamp(this.x, minX, maxX);
        this.y = Clamp(this.y, minY, maxY);
    }

    DrawDebug(renderer) {
        if (!this.debugEnabled)
            return;

        const lines = [
            `Cam x:${this.x.toFixed(1)} y:${this.y.toFixed(1)} z:${this.scale.toFixed(2)}`,
            `Drag:${this.isDragging ? "ON" : "OFF"}`,
            `Clamp x:[${this.debugBounds.minX.toFixed(1)}, ${this.debugBounds.maxX.toFixed(1)}]`,
            `Clamp y:[${this.debugBounds.minY.toFixed(1)}, ${this.debugBounds.maxY.toFixed(1)}]`
        ];

        const panelX = 8;
        const panelY = 80;
        const panelW = 360;
        const panelH = 70;

        renderer.DrawFillBasicRectangle(panelX, panelY, panelW, panelH, this.debugPanelColor);

        renderer.DrawFillText(lines[0], panelX + 8, panelY + 16, "12px monospace", this.debugTextColor, "left", "middle");
        renderer.DrawFillText(lines[1], panelX + 8, panelY + 32, "12px monospace", this.debugTextColor, "left", "middle");
        renderer.DrawFillText(lines[2], panelX + 8, panelY + 48, "12px monospace", this.debugTextColor, "left", "middle");
        renderer.DrawFillText(lines[3], panelX + 8, panelY + 64, "12px monospace", this.debugTextColor, "left", "middle");
    }

    ApplyDirectionalPan(dir, speed, deltaTime) {
        const magSq = dir.x * dir.x + dir.y * dir.y;
        if (magSq <= 0)
            return;

        if (magSq > 1) {
            const invMag = 1 / Math.sqrt(magSq);
            dir = new Vector2(dir.x * invMag, dir.y * invMag);
        }

        this.x += dir.x * speed * deltaTime;
        this.y += dir.y * speed * deltaTime;
    }
}
