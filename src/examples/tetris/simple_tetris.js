class SimpleTetris extends Game {
    constructor(renderer) {
        super(renderer);

        this.grid = null;
        this.gridSize = { rows: 20, cols: 10 };
        this.gridPosition = { x: 220, y: 20 };
        this.squareSize = 20;

        this.initialPiecePosition = { x: 3, y: 0 };
        
        this.pieces = [
            { type: 'I', color: Color.red,    shape: [[1, 1, 1, 1]] },
            { type: 'J', color: Color.blue,   shape: [[1, 0, 0], [1, 1, 1]] },
            { type: 'L', color: Color.green,  shape: [[0, 0, 1], [1, 1, 1]] },
            { type: 'O', color: Color.yellow, shape: [[1, 1], [1, 1]] },
            { type: 'S', color: Color.purple, shape: [[0, 1, 1], [1, 1, 0]] },
            { type: 'T', color: Color.orange, shape: [[0, 1, 0], [1, 1, 1]] },
            { type: 'Z', color: Color.cyan,   shape: [[1, 1, 0], [0, 1, 1]] }
        ];
        
        this.currentPiece = null;
        this.nextPiece = null;
        
        this.currentDropTime = 0; // time passed since the last drop
        this.dropTime = 0.5; // time to drop a piece in seconds

        this.minTimeToMove = 0.05; // minimum time to move a piece in milliseconds
        this.minTimeToMoveSinceLastMove = 0.35; // minimum time to repeat movement since the first key down
        this.lastTimeMoved = 0; // last time the piece was moved
        this.repeatedMovement = false;
        
        this.totalLinesCleared = 0;
        this.scoreTable = [0, 40, 100, 300, 1200];
        this.score = 0;

        // UI elements
        this.scoreLabel = null;
        this.keysLabel = null;
    }
    
    Start() {
        super.Start();
        
        this.lastTime = 0;
        this.InitializeGrid(this.gridSize.rows, this.gridSize.cols);
        
        // Initialize the first piece
        this.currentPiece = this.CreateRandomPiece();
        this.currentPiece.position.x = this.initialPiecePosition.x;
        this.currentPiece.position.y = this.initialPiecePosition.y;
        
        this.nextPiece = this.CreateRandomPiece();
        
        this.totalLinesCleared = 0;
        this.score = 0;

        this.scoreLabel = new TextLabel("Score: 0", new Vector2(20, 420), "20px Comic Sans MS", Color.black, "left", "middle", false);
        this.keysLabel = new TextLabel("Keys: A (left) | D (right) | Space (rotate) | W (instant fall)", new Vector2(20, 460), "16px Comic Sans MS", Color.grey, "left", "middle", false);

        // center the grid in the canvas
        this.gridPosition.x = Math.floor((this.screenWidth - this.gridSize.cols * this.squareSize) / 2);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        this.HandleInput(deltaTime);
        
        this.currentDropTime += deltaTime;
        if (this.currentDropTime > this.dropTime) {
            this.Drop();
        }
    }

    Draw() {
        super.Draw();

        // Draw the grid
        // Fallen pieces of the grid
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                if (this.grid[y][x] !== 0) {
                    this.renderer.DrawFillBasicRectangle(this.gridPosition.x + x * this.squareSize, this.gridPosition.y + y * this.squareSize, this.squareSize, this.squareSize, Color.grey);
                    this.renderer.DrawStrokeBasicRectangle(this.gridPosition.x + x * this.squareSize, this.gridPosition.y + y * this.squareSize, this.squareSize, this.squareSize, Color.black, 1);
                }
            }
        }

        // Draw the current piece
        this.DrawPiece(renderer, this.currentPiece, this.gridPosition.x + this.currentPiece.position.x * this.squareSize, this.gridPosition.y + this.currentPiece.position.y * this.squareSize);
        
        // Border of the grid
        this.renderer.DrawStrokeBasicRectangle(this.gridPosition.x, this.gridPosition.y, this.gridSize.cols * this.squareSize, this.gridSize.rows * this.squareSize, Color.black, 2);
        
        // Draw the next piece
        this.renderer.DrawStrokeBasicRectangle(this.gridPosition.x + this.gridSize.cols * this.squareSize + 20, this.gridPosition.y, 6 * this.squareSize, 4 * this.squareSize, Color.black, 2);
        this.DrawPiece(renderer, this.nextPiece, this.gridPosition.x + (this.gridSize.cols + 1) * this.squareSize + 20, this.gridPosition.y + 20);
        
        // UI
        this.keysLabel.Draw(renderer);
        this.scoreLabel.Draw(renderer);
    }
    
    InitializeGrid(rows, cols) {
        this.grid = [];
        while (rows--) {
            this.grid.push(new Array(cols).fill(0));
        }
    }

    CreateRandomPiece() {
        const randomId = RandomBetweenInt(0, this.pieces.length - 1);

        return {
            type: this.pieces[randomId].type,
            color: this.pieces[randomId].color,
            shape: this.pieces[randomId].shape,
            position: { x: 0, y: 0 }
        };
    }

    CheckPieceGridCollision(piece) {
        const [m, o] = [piece.shape, piece.position];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (this.grid[y + o.y] &&
                    this.grid[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    MergePieceIntoGrid(piece) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.grid[y + piece.position.y][x + piece.position.x] = value;
                }
            });
        });
    }

    RotatePiece(piece) {
        // transpose the matrix
        const rows = piece.shape.length;
        const cols = piece.shape[0].length;
        const newShape = [];

        for (let y = 0; y < cols; ++y) {
            newShape[y] = [];
            for (let x = 0; x < rows; ++x) {
                newShape[y][x] = piece.shape[rows - 1 - x][y];
            }
        }
        piece.shape = newShape;
    }

    RotateCurrentPiece() {
        const originalPosition = this.currentPiece.position.x;
        let offset = 1;
        this.RotatePiece(this.currentPiece);
        
        while (this.CheckPieceGridCollision(this.currentPiece)) {
            this.currentPiece.position.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.currentPiece.shape[0].length) {
                this.RotatePiece(this.currentPiece); // rotate back
                this.currentPiece.position.x = originalPosition;
                return;
            }
        }
    }

    MoveCurrentPiece(offset) {
        this.currentPiece.position.x += offset;
        if (this.CheckPieceGridCollision(this.currentPiece)) {
            this.currentPiece.position.x -= offset;
        }
    }

    HandleInput(deltaTime) {
        this.lastTimeMoved += deltaTime;
        // left-right movement
        if (Input.IsKeyDown(KEY_LEFT) || Input.IsKeyDown(KEY_A)) {
            this.MoveCurrentPiece(-1);
            this.lastTimeMoved = 0;
            this.repeatedMovement = true;
        }
        if (Input.IsKeyDown(KEY_RIGHT) || Input.IsKeyDown(KEY_D)) {
            this.MoveCurrentPiece(1);
            this.lastTimeMoved = 0;
            this.repeatedMovement = true;
        }
        // continuous press movement
        if (Input.IsKeyPressed(KEY_LEFT) || Input.IsKeyPressed(KEY_A)) {
            if ((this.repeatedMovement && this.lastTimeMoved > this.minTimeToMoveSinceLastMove) || (!this.repeatedMovement && this.lastTimeMoved > this.minTimeToMove)) {
                this.MoveCurrentPiece(-1);
                this.lastTimeMoved = 0;
                this.repeatedMovement = false;
            }
        }
        if (Input.IsKeyPressed(KEY_RIGHT) || Input.IsKeyPressed(KEY_D)) {
            if ((this.repeatedMovement && this.lastTimeMoved > this.minTimeToMoveSinceLastMove) || (!this.repeatedMovement && this.lastTimeMoved > this.minTimeToMove)) {
                this.MoveCurrentPiece(1);
                this.lastTimeMoved = 0;
                this.repeatedMovement = false;
            }
        }

        // drop movement
        if ((Input.IsKeyPressed(KEY_DOWN) || Input.IsKeyPressed(KEY_S)) && this.lastTimeMoved > this.minTimeToMove) {
            this.Drop();
            this.lastTimeMoved = 0;
        }

        // rotate
        if (Input.IsKeyDown(KEY_SPACE) || Input.IsMouseDown()) {
            this.RotateCurrentPiece();
        }

        // Full fall
        if (Input.IsKeyDown(KEY_W)) {
            this.FullFall();
        }
    }

    Drop() {
        this.currentPiece.position.y++;
        if (this.CheckPieceGridCollision(this.currentPiece)) {
            this.currentPiece.position.y--;

            this.MergePieceIntoGrid(this.currentPiece);
            this.CheckAndClearLines();

            this.currentPiece = this.nextPiece;
            this.currentPiece.position.x = this.initialPiecePosition.x;
            this.currentPiece.position.y = this.initialPiecePosition.y;

            if (this.CheckPieceGridCollision(this.currentPiece)) {
                // check for game over
                this.Start();
            }
            else {
                this.nextPiece = this.CreateRandomPiece();
            }
        }
        this.currentDropTime = 0;
    }

    CheckAndClearLines() {
        let linesCleared = 0;
        outer: for (let y = this.grid.length - 1; y >= 0; y--) {
            for (let x = 0; x < this.grid[y].length; x++) {
                if (this.grid[y][x] === 0) {
                    continue outer;
                }
            }
            const row = this.grid.splice(y, 1)[0].fill(0);
            this.grid.unshift(row);
            linesCleared++;
            y++;
        }

        this.totalLinesCleared += linesCleared;
        this.UpdateScore(linesCleared);
    }

    UpdateScore(linesCleared) {
        this.score += this.scoreTable[linesCleared];
        this.scoreLabel.text = `Score: ${this.score}`;
    }

    DrawPiece(renderer, piece, x, y) {
        // Debug bounding box
        renderer.DrawStrokeBasicRectangle(x, y, this.squareSize * 4, this.squareSize * 4, Color.grey, 1);

        for (let j = 0; j < piece.shape.length; j++) {
            for (let i = 0; i < piece.shape[j].length; i++) {
                if (piece.shape[j][i] !== 0) {
                    const coordX = x + i * this.squareSize;
                    const coordY = y + j * this.squareSize;

                    renderer.DrawFillBasicRectangle(coordX, coordY, this.squareSize, this.squareSize, piece.color);
                    renderer.DrawStrokeBasicRectangle(coordX, coordY, this.squareSize, this.squareSize, Color.black, 1);
                }
            }
        }
    }

    FullFall() {
        while (!this.CheckPieceGridCollision(this.currentPiece)) {
            this.currentPiece.position.y++;
        }
        this.currentPiece.position.y--;

        this.MergePieceIntoGrid(this.currentPiece);
        this.CheckAndClearLines();

        this.currentPiece = this.nextPiece;
        this.currentPiece.position.x = this.initialPiecePosition.x;
        this.currentPiece.position.y = this.initialPiecePosition.y;

        if (this.CheckPieceGridCollision(this.currentPiece)) {
            // check for game over
            this.Start();
        }
        else {
            this.nextPiece = this.CreateRandomPiece();
        }
            
        this.currentDropTime = 0;
    }
}
