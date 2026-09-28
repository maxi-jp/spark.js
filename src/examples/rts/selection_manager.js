class SelectionManager {
    constructor(game, options = {}) {
        this.game = game;
        this.maxSelection = options.maxSelection || 60;
        this.friendlyOwnerId = options.friendlyOwnerId || 1;
        this.dragThreshold = options.dragThreshold || 4;

        this.selectedEntities = [];
        this.selectionStartScreen = null;
        this.selectionCurrentScreen = null;
        this.isDragging = false;

        this.boxFillColor = options.boxFillColor || Color.FromRGBA(34, 197, 94, 0.15);
        this.boxStrokeColor = options.boxStrokeColor || Color.FromRGBA(34, 197, 94, 0.9);
    }

    Update(deltaTime) {
        if (Input.IsMouseDown(0)) {
            this.OnMouseDown();
        }

        if (Input.IsMousePressed(0) && this.selectionStartScreen) {
            this.OnMouseDrag();
        }

        if (Input.IsMouseUp(0)) {
            this.OnMouseUp();
        }
    }

    Draw(renderer) {
        if (!this.isDragging || !this.selectionStartScreen || !this.selectionCurrentScreen) {
            return;
        }

        const x = Math.min(this.selectionStartScreen.x, this.selectionCurrentScreen.x);
        const y = Math.min(this.selectionStartScreen.y, this.selectionCurrentScreen.y);
        const w = Math.abs(this.selectionCurrentScreen.x - this.selectionStartScreen.x);
        const h = Math.abs(this.selectionCurrentScreen.y - this.selectionStartScreen.y);

        renderer.DrawFillBasicRectangle(x, y, w, h, this.boxFillColor);
        renderer.DrawStrokeBasicRectangle(x, y, w, h, this.boxStrokeColor, 2);
    }

    OnMouseDown() {
        this.selectionStartScreen = new Vector2(Input.mouse.x, Input.mouse.y);
        this.selectionCurrentScreen = new Vector2(Input.mouse.x, Input.mouse.y);
        this.isDragging = false;
    }

    OnMouseDrag() {
        this.selectionCurrentScreen.x = Input.mouse.x;
        this.selectionCurrentScreen.y = Input.mouse.y;

        const dx = this.selectionCurrentScreen.x - this.selectionStartScreen.x;
        const dy = this.selectionCurrentScreen.y - this.selectionStartScreen.y;
        const distanceSq = (dx * dx) + (dy * dy);

        if (distanceSq >= (this.dragThreshold * this.dragThreshold)) {
            this.isDragging = true;
        }
    }

    OnMouseUp() {
        if (!this.selectionStartScreen || !this.selectionCurrentScreen) {
            return;
        }

        if (this.isDragging) {
            this.SelectEntitiesInBox(this.selectionStartScreen, this.selectionCurrentScreen);
        }
        else {
            this.SelectSingleAtScreen(Input.mouse.x, Input.mouse.y);
        }

        this.selectionStartScreen = null;
        this.selectionCurrentScreen = null;
        this.isDragging = false;
    }

    SelectSingleAtScreen(screenX, screenY) {
        const worldPos = this.ScreenToWorld(screenX, screenY);
        const entity = this.GetTopEntityAtWorld(worldPos.x, worldPos.y);

        if (!entity || entity.ownerId !== this.friendlyOwnerId) {
            this.ClearSelection();
            return;
        }

        this.ClearSelection();
        this.AddToSelection(entity);
    }

    SelectEntitiesInBox(startScreen, endScreen) {
        const worldStart = this.ScreenToWorld(startScreen.x, startScreen.y);
        const worldEnd = this.ScreenToWorld(endScreen.x, endScreen.y);

        const minX = Math.min(worldStart.x, worldEnd.x);
        const maxX = Math.max(worldStart.x, worldEnd.x);
        const minY = Math.min(worldStart.y, worldEnd.y);
        const maxY = Math.max(worldStart.y, worldEnd.y);

        this.ClearSelection();

        const candidates = this.GetEntityCandidates();
        for (let i = 0; i < candidates.length; i++) {
            const entity = candidates[i];
            if (entity.ownerId !== this.friendlyOwnerId) {
                continue;
            }

            const px = entity.position.x;
            const py = entity.position.y;
            if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
                this.AddToSelection(entity);
                if (this.selectedEntities.length >= this.maxSelection) {
                    break;
                }
            }
        }
    }

    AddToSelection(entity) {
        if (!entity || entity.isSelected) {
            return;
        }

        entity.isSelected = true;
        this.selectedEntities.push(entity);
    }

    ClearSelection() {
        for (let i = 0; i < this.selectedEntities.length; i++) {
            this.selectedEntities[i].isSelected = false;
        }

        this.selectedEntities.length = 0;
    }

    GetTopEntityAtWorld(worldX, worldY) {
        const candidates = this.GetEntityCandidates();

        for (let i = candidates.length - 1; i >= 0; i--) {
            const entity = candidates[i];
            if (entity.collider && entity.collider.enabled && entity.collider.IsPointInside(worldX, worldY)) {
                return entity;
            }
        }

        return null;
    }

    GetEntityCandidates() {
        const entities = [];

        for (let i = 0; i < this.game.gameObjects.length; i++) {
            const go = this.game.gameObjects[i];
            if (go instanceof Entity && go.active) {
                entities.push(go);
            }
        }

        return entities;
    }

    ScreenToWorld(screenX, screenY) {
        const halfW = this.game.screenHalfWidth;
        const halfH = this.game.screenHalfHeight;
        const camera = this.game.camera;

        return new Vector2(
            ((screenX - halfW) / camera.scale) + camera.x + halfW,
            ((screenY - halfH) / camera.scale) + camera.y + halfH
        );
    }
}
