const Direction = PacMonData.directions;

class Node {
    constructor(id, position, mainNode=false, pill=0) {
        this.id = id;
        this.position = position;
        this.mainNode = mainNode;
        this.neighbors = [];
        this.pill = pill; // 0: no pill, 1: pill, 2: power pellet
    }

    AddNeighbor(node, dir) {
        this.neighbors[dir] = node;
    }

    Up() {
        return this.neighbors[0];
    }
    Right() {
        return this.neighbors[1];
    }
    Down() {
        return this.neighbors[2];
    }
    Left() {
        return this.neighbors[3];
    }
}

class Graph {
    constructor(nodeSize) {
        this.nodes = [];
        this.nodeSize = nodeSize;

        this.mainNodes = [];
    }

    InitializeMainNodes(width, height) {
        for (let y = 0; y < height; y++) {
            this.mainNodes[y] = [];
            for (let x = 0; x < width; x++) {
                this.mainNodes[y][x] = null;
            }
        }
    }

    AddNode(node) {
        this.nodes.push(node);
    }

    AddMainNode(node, x, y) {
        this.mainNodes[y][x] = node;
    }

    FindNodeById(nodeId) {
        return this.nodes.find(node => node.id === nodeId);
    }

    FindNodeByPosition(position) {
        return this.nodes.find(node => node.position.x === position.x && node.position.y === position.y);
    }
    
    GetNeighborNode(currentNode, direction) {
        return currentNode.neighbors[direction];
    }

    Draw(renderer) {
        const initX = 4 + game.mazePosition.x;
        const initY = 4 + game.mazePosition.y;
        // Draw connections
        /*for (const node of this.nodes) {
            for (const neighbor of node.neighbors) {
                renderer.DrawLine(initX + node.position.x * this.nodeSize, initY + node.position.y * this.nodeSize, initX + neighbor.position.x * this.nodeSize, initY + neighbor.position.y * this.nodeSize, Color.blue);
            }
        }*/

        // Draw nodes
        for (const node of this.nodes) {
            //renderer.DrawFillCircle(initX + node.position.x * this.nodeSize, initY + node.position.y * this.nodeSize, 1, Color.red);
            renderer.DrawFillRectangle(initX + node.position.x * this.nodeSize - 1, initY + node.position.y * this.nodeSize - 1, 1, 1, Color.red);
        }

        // Draw main nodes
        for (let y = 0; y < this.mainNodes.length; y++) {
            for (let x = 0; x < this.mainNodes[y].length; x++) {
                if (this.mainNodes[y][x]) {
                    renderer.DrawFillCircle(260 + this.mainNodes[y][x].position.x * this.nodeSize, 4 + this.mainNodes[y][x].position.y * this.nodeSize, 2, Color.green);
                    //renderer.DrawFillRectangle(initX + this.mainNodes[y][x].position.x * this.nodeSize - 1, initY + this.mainNodes[y][x].position.y * this.nodeSize - 1, 1, 1, Color.green);
                }
            }
        }
    }
}

class PacMon extends Game {
    constructor(renderer) {
        super(renderer);
        this.graphicAssets = {
            spritesheet: {
                path: "src/examples/pacmon/assets/pacman.png",
                img: null
            }
        };

        this.config.imageSmoothingEnabled = false;

        this.playerScore = 0;
        this.scoreTextLabel = null;
        this.playerLives = 3;
        this.lifeSprite = null;

        this.pacman = null;

        this.blinky = null;
        this.pinky = null;
        this.inky = null;
        this.clyde = null;
        this.ghosts = [];

        this.pills = [];
        this.powerPellets = [];
        
        this.background = null;

        this.nodeSize = 2; // size (in pixels) of each node of the graph (2x2 in the original game)
        this.graph = null;

        this.mazePosition = new Vector2(8, 64);
        
        drawStats = false;
    }
    
    Start() {
        super.Start();
        
        this.background = new Sprite(
            this.graphicAssets.spritesheet.img,
            new Vector2(112 + this.mazePosition.x, 124 + this.mazePosition.y),
            0,
            1,
        );
        this.dummyBackground = new Sprite(
            this.graphicAssets.spritesheet.img,
            new Vector2(112 + this.mazePosition.x, 124 + this.mazePosition.y),
            0,
            1,
        );
        
        this.graph = new Graph(this.nodeSize);
        this.BuildGraph();

        this.pacman = new Pacman(this.graphicAssets.spritesheet.img, this.graph, PacMonData.level1Data.pacMonInitialNode, this.mazePosition);

        this.blinky = new Ghost(this.graphicAssets.spritesheet.img, this.graph, PacMonData.level1Data.ghostsInitialNode, this.mazePosition, this.pacman);

        // this.pinky = new Ghost(this.graphicAssets.spritesheet.img, this.graph, 3, this.mazePosition);
        // this.inky = new Ghost(this.graphicAssets.spritesheet.img, this.graph, 3, this.mazePosition);
        // this.clyde = new Ghost(this.graphicAssets.spritesheet.img, this.graph, 3, this.mazePosition);

        this.ghosts.push(this.blinky);
        // this.ghosts.push(this.pinky);
        // this.ghosts.push(this.inky);
        // this.ghosts.push(this.clyde);
        
        this.AddGameObject(this.blinky);
        // this.AddGameObject(this.pinky);
        // this.AddGameObject(this.inky);
        // this.AddGameObject(this.clyde);
        
        this.score = 0;
        this.scoreTextLabel = new TextLabel("SCORE: " + this.playerScore, new Vector2(10, 20), "16px Courier New", Color.white, "left", "top"
        );
        this.playerLives = 3;
        this.lifeSprite = new SpriteSection(
            this.graphicAssets.spritesheet.img,
            Vector2.Zero(),
            0, 1, new Rect(470, 0, 16, 16) // Pac-Man icon (mouth half-open, facing right)
        );
        
        this.AddGameObject(this.pacman);
    }
    
    BuildGraph() {
        const mazeLayout = PacMonData.level1Maze;
        const nodesPerTile = 4;
        const pixelsPerTile = nodesPerTile * this.nodeSize;

        this.graph.InitializeMainNodes(mazeLayout[0].length, mazeLayout.length);

        let nodeId = 0;
        for (let y = 0; y < mazeLayout.length; y++) {
            for (let x = 0; x < mazeLayout[y].length; x++) {
                if (mazeLayout[y][x] > 0) {
                    // add the main node (left-down corner of the tile)
                    const node = new Node(nodeId++, new Vector2(x * nodesPerTile, y * nodesPerTile), true, mazeLayout[y][x]);
                    this.graph.AddNode(node);

                    this.graph.AddMainNode(node, x, y);

                    // create pills and power pellets
                    if (mazeLayout[y][x] == 2) {
                        const pill = new Pill(node, new Vector2(x * pixelsPerTile + 4 + this.mazePosition.x, y * pixelsPerTile + 4 + this.mazePosition.y), this.graphicAssets.spritesheet.img);
                        this.AddGameObject(pill);
                        this.pills.push(pill);
                    }
                    else if (mazeLayout[y][x] == 3) {
                        const powerPellet = new PowerPellet(node, new Vector2(x * pixelsPerTile + 4 + this.mazePosition.x, y * pixelsPerTile + 4 + this.mazePosition.y), this.graphicAssets.spritesheet.img);
                        this.AddGameObject(powerPellet);
                        this.powerPellets.push(powerPellet);
                    }


                    // build neighbors nodes
                    // path to the right, insert 3 nodes
                    if (mazeLayout[y][x + 1] > 0 || (x == mazeLayout[y].length - 1 && mazeLayout[y][0] > 0)) {
                        const node1 = new Node(nodeId++, new Vector2(x * nodesPerTile + 1, y * nodesPerTile));
                        this.graph.AddNode(node1);
                        node.AddNeighbor(node1, 1);
                        node1.AddNeighbor(node, 3);

                        const node2 = new Node(nodeId++, new Vector2(x * nodesPerTile + 2, y * nodesPerTile));
                        this.graph.AddNode(node2);
                        node1.AddNeighbor(node2, 1);
                        node2.AddNeighbor(node1, 3);

                        const node3 = new Node(nodeId++, new Vector2(x * nodesPerTile + 3, y * nodesPerTile));
                        this.graph.AddNode(node3);
                        node2.AddNeighbor(node3, 1);
                        node3.AddNeighbor(node2, 3);
                    }
                    // path up, insert 3 nodes
                    if (mazeLayout[y - 1][x] > 0) {
                        const node1 = new Node(nodeId++, new Vector2(x * nodesPerTile, y * nodesPerTile - 1));
                        this.graph.AddNode(node1);
                        node.AddNeighbor(node1, 0);
                        node1.AddNeighbor(node, 2);

                        const node2 = new Node(nodeId++, new Vector2(x * nodesPerTile, y * nodesPerTile - 2));
                        this.graph.AddNode(node2);
                        node1.AddNeighbor(node2, 0);
                        node2.AddNeighbor(node1, 2);

                        const node3 = new Node(nodeId++, new Vector2(x * nodesPerTile, y * nodesPerTile - 3));
                        this.graph.AddNode(node3);
                        node2.AddNeighbor(node3, 0);
                        node3.AddNeighbor(node2, 2);

                        // conect node 3 with the one of the tile above
                        const upperNode = this.graph.mainNodes[y - 1][x];
                        //const upperNode = this.graph.FindNodeByPosition(new Vector2(x * nodesPerTile, y * nodesPerTile - 4));
                        if (upperNode) {
                            node3.AddNeighbor(upperNode, 0);
                            upperNode.AddNeighbor(node3, 2);
                        }
                        else  {
                            console.warn(`Error building the node graph: upper node not found for node ${node3.id}`);
                        }
                    }

                    // connect the current node with the one of the tile to the left
                    const leftNode = this.graph.mainNodes[y][x - 1]?.Right()?.Right().Right();
                    //const leftNode = this.graph.FindNodeByPosition(new Vector2(x * nodesPerTile - 1, y * nodesPerTile));
                    if (leftNode) {
                        node.AddNeighbor(leftNode, 3);
                        leftNode.AddNeighbor(node, 1);
                    }

                    // connect right-left teleport
                    if (x == mazeLayout[y].length - 1) {
                        const rightLeftNode = this.graph.mainNodes[y][0];
                        if (rightLeftNode) {
                            const rightNode = node.Right().Right().Right()
                            rightNode.AddNeighbor(rightLeftNode, 1);
                            rightLeftNode.AddNeighbor(rightNode, 3);
                        }
                    }
                }
            }
        }
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // check Pacman pills collision
        for (let i = 0; i < this.pills.length; i++) {
            if (this.pacman.currentNode == this.pills[i].node) {
                this.playerScore += this.pills[i].score;
                this.scoreTextLabel.text = "SCORE: " + this.playerScore;
                this.gameObjects.splice(this.gameObjects.indexOf(this.pills[i]), 1);
                this.pills.splice(i, 1);
                i--;
            }
        }
        // Pacman - power pellets collision
        for (let i = 0; i < this.powerPellets.length; i++) {
            if (this.pacman.currentNode == this.powerPellets[i].node) {
                this.playerScore += this.powerPellets[i].score;
                this.scoreTextLabel.text = "SCORE: " + this.playerScore;
                this.gameObjects.splice(this.gameObjects.indexOf(this.powerPellets[i]), 1);
                this.powerPellets.splice(i, 1);
                i--;
            }
        }
        
        // Test losing a life
        if (Input.IsKeyDown(KEY_Q) && this.playerLives > 0) {
            this.LoseLife();
        }
    }

    MoveGhosts(deltaTime) {
        for (const ghost of this.ghosts) {
            // TODO: implement pathfinding logic
        }
    }

    LoseLife() {
        this.playerLives--;

        if (this.playerLives <= 0) {
            // Game Over logic
            alert("GAME OVER!");
            if (this.pacman)
                this.pacman.active = false;
        }
    }

    Draw() {
        this.renderer.DrawFillBasicRectangle(0, 0, 800, 600, Color.black);

        //this.dummyBackground.DrawSection(ctx, 0, 0, 224, 248);
        this.background.DrawSection(this.renderer, 228, 0, 224, 248);

        // Draw the game objects
        super.Draw();

        // Draw the graph for visualization
        this.graph.Draw(this.renderer);

        this.scoreTextLabel.Draw(this.renderer);

        for (let i = 0; i < this.playerLives; i++) {
            this.lifeSprite.DrawBasicAt(this.renderer, 40 + (16 * i), 40);
        }
    }
}

class Pacman extends SSAnimationObjectComplex {
    constructor(img, mazeGraph, initialNodeId, mazePosition) {
        const initialNode = mazeGraph.FindNodeById(initialNodeId);

        super(
            new Vector2(4 + initialNode.position.x * mazeGraph.nodeSize + mazePosition.x, 4 + initialNode.position.y * mazeGraph.nodeSize + mazePosition.y),
            0,
            1,
            img,
            [ [new Rect(454, 0, 16, 16), new Rect(470, 0, 16, 16), new Rect(486, 0, 16, 16)] ],
            [0.1]
        );

        this.mazeGraph = mazeGraph;

        this.currentNode = initialNode;
        this.mazePosition = mazePosition;

        this.speed = 0.025; // time (in seconds) to move from one node to another
        this.currentTimeStep = 0;

        this.direction = Direction.NEUTRAL; // current movement direction
        this.nextDirection = Direction.NEUTRAL; // direction to switch to when possible
    }

    Start() {
        super.Start();

        this.direction = Direction.LEFT;
        this.flipX = true;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // Handle player input
        this.HandleInput();

        this.currentTimeStep -= deltaTime;
        if (this.currentTimeStep <= 0) {
            this.currentTimeStep += this.speed;

            let nextNode = null;

            if (this.nextDirection != Direction.NEUTRAL) {
                // player has set the next direction
                nextNode = this.mazeGraph.GetNeighborNode(this.currentNode, this.nextDirection);
                if (nextNode) {
                    this.direction = this.nextDirection;
                    this.flipX = this.direction == Direction.LEFT;
                    this.rotation = this.direction == Direction.UP ? -PIH : this.direction == Direction.DOWN ? PIH : 0;
                }
            }
            
            if (this.direction != Direction.NEUTRAL) {
                if (this.currentNode.id == 615)
                    console.log(this.currentNode.id);
                // move Pacman in the current direction
                nextNode = this.mazeGraph.GetNeighborNode(this.currentNode, this.direction);
                if (nextNode) {
                    this.currentNode = nextNode; // Update currentNode
                    this.position.Set(4 + this.currentNode.position.x * this.mazeGraph.nodeSize + this.mazePosition.x, 4 + this.currentNode.position.y * this.mazeGraph.nodeSize + this.mazePosition.y);
                }
                else {
                    // stop movement if no valid next node exists
                    //this.direction = Direction.NEUTRAL;
                }
            }
        }
    }

    HandleInput() {
        //this.nextDirection = Direction.NEUTRAL;

        if (Input.IsKeyPressed(KEY_UP) || Input.IsKeyPressed(KEY_W)) {
            this.nextDirection = Direction.UP;
        }
        else if (Input.IsKeyPressed(KEY_DOWN) || Input.IsKeyPressed(KEY_S)) {
            this.nextDirection = Direction.DOWN;
        }
        else if (Input.IsKeyPressed(KEY_LEFT) || Input.IsKeyPressed(KEY_A)) {
            this.nextDirection = Direction.LEFT;
        }
        else if (Input.IsKeyPressed(KEY_RIGHT) || Input.IsKeyPressed(KEY_D)) {
            this.nextDirection = Direction.RIGHT;
        }
    }

    Draw(rederer) {
        super.Draw(rederer);
    }
}

class Pill extends SpriteObject {
    constructor(node, position, img) {
        super(position, 0, 1, img);

        this.node = node;

        this.score = 1;
    }

    Draw(rederer) {
        super.DrawSection(rederer, 8, 8, 8, 8);
    }
}

class PowerPellet extends SpriteObject {
    constructor(node, position, img) {
        super(position, 0, 1, img);

        this.node = node;

        this.edibleTime = 10;
        this.score = 10;
    }

    Draw(rederer) {
        super.DrawSection(rederer, 8, 24, 8, 8);
    }
}

class Ghost extends SSAnimationObjectComplex {
    constructor(img, mazeGraph, initialNodeId, mazePosition, pacman) {
        const initialNode = mazeGraph.FindNodeById(initialNodeId);

        super(
            new Vector2(4 + initialNode.position.x * mazeGraph.nodeSize + mazePosition.x, 4 + initialNode.position.y * mazeGraph.nodeSize + mazePosition.y),
            0,
            1,
            img,
            [
                [new Rect(519, 64, 16, 16), new Rect(535, 64, 16, 16)], // up
                [new Rect(455, 64, 16, 16), new Rect(471, 64, 16, 16)], // right
                [new Rect(551, 64, 16, 16), new Rect(567, 64, 16, 16)],  // down
                [new Rect(487, 64, 16, 16), new Rect(503, 64, 16, 16)] // left
            ],
            [0.125, 0.125, 0.125, 0.125]
        );

        this.mazeGraph = mazeGraph;

        this.currentNode = initialNode;
        this.targetNode = null;
        this.mazePosition = mazePosition;
        this.pacman = pacman;

        this.speed = 0.025;
        
        this.currentTimeStep = 0;
        
        this.direction = Direction.NEUTRAL; // current movement direction
        this.lastDirection = Direction.NEUTRAL; // Direction used in the last successful step to reach current node
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // Blinky will try to take the path that minimizes the straight-line distance to Pac-Man at every intersection, without turning back on itself unless it's a dead end.

        // test the animation
        // if (Input.IsKeyPressed(KEY_UP) || Input.IsKeyPressed(KEY_W)) {
        //     this.direction = Direction.UP;
        // }
        // else if (Input.IsKeyPressed(KEY_DOWN) || Input.IsKeyPressed(KEY_S)) {
        //     this.direction = Direction.DOWN;
        // }
        // else if (Input.IsKeyPressed(KEY_LEFT) || Input.IsKeyPressed(KEY_A)) {
        //     this.direction = Direction.LEFT;
        // }
        // else if (Input.IsKeyPressed(KEY_RIGHT) || Input.IsKeyPressed(KEY_D)) {
        //     this.direction = Direction.RIGHT;
        // }

        // if (this.direction !== Direction.NEUTRAL)
        //     this.PlayAnimationLoop(this.direction, false);

        if (!this.pacman || !this.pacman.currentNode || !this.active || !this.currentNode) {
            return; // Pacman not ready, game over, or ghost inactive/misconfigured
        }
        this.targetNode = this.pacman.currentNode;

        this.currentTimeStep -= deltaTime;
        if (this.currentTimeStep <= 0) {
            this.currentTimeStep += this.speed;

            // --- Decision Making for Blinky ---
            const possibleMoves = [];
            const oppositeOfHowGhostArrived = (this.lastDirection + 2) % 4;
            // Standard Pac-Man ghost tie-breaking order when choosing paths: Up, Left, Down, Right
            const directionPriority = [Direction.UP, Direction.LEFT, Direction.DOWN, Direction.RIGHT];

            for (const dir of directionPriority) {
                const neighbor = this.currentNode.neighbors[dir];
                if (neighbor) {
                    let isReverseMove = (dir === oppositeOfHowGhostArrived);
                    if (isReverseMove && this.lastDirection !== Direction.NEUTRAL) { // Don't forbid reverse if just started
                        let otherChoicesExist = false;
                        for (const check_dir of directionPriority) {
                            if (check_dir !== dir && this.currentNode.neighbors[check_dir]) {
                                otherChoicesExist = true;
                                break;
                            }
                        }
                        if (otherChoicesExist) continue; // Skip this reverse move, prefer others
                    }
                    possibleMoves.push({ direction: dir, node: neighbor });
                }
            }
            
            let newDirection = Direction.NEUTRAL;

            if (possibleMoves.length === 0) {
                // Ghost is stuck (e.g., 1x1 tunnel end). Try to reverse if that's an option.
                if (this.currentNode.neighbors[oppositeOfHowGhostArrived] && this.lastDirection !== Direction.NEUTRAL) {
                    newDirection = oppositeOfHowGhostArrived;
                } else {
                    newDirection = Direction.NEUTRAL; // Truly stuck
                }
            } else if (possibleMoves.length === 1) {
                newDirection = possibleMoves[0].direction;
            } else {
                // Multiple choices: Blinky targets Pac-Man directly.
                // Find move that minimizes Euclidean distance to targetNode, respecting priority for ties.
                // possibleMoves is already sorted by directionPriority.
                let bestMoveForTargeting = null;
                let minDistanceSqToTarget = Infinity;

                for (const move of possibleMoves) {
                    const distSq = Vector2.SqrMagnitude(move.node.position, this.targetNode.position);
                    if (distSq < minDistanceSqToTarget) {
                        minDistanceSqToTarget = distSq;
                        bestMoveForTargeting = move;
                    }
                    // If distSq === minDistanceSqToTarget, the current bestMoveForTargeting is kept
                    // because possibleMoves was already sorted by UP, LEFT, DOWN, RIGHT priority.
                }

                if (bestMoveForTargeting) {
                    newDirection = bestMoveForTargeting.direction;
                } else {
                     // Fallback, should not happen if possibleMoves.length > 1
                    newDirection = possibleMoves[0].direction;
                }
            }
            
            this.lastDirection = newDirection;
            // --- End Decision Making ---

            // Update animation based on the chosen direction
            if (this.lastDirection !== Direction.NEUTRAL) {
                 if (this.actualAnimationIndex !== this.lastDirection) {
                    this.PlayAnimationLoop(this.lastDirection, false);
                 }
            }

            // Move to the next node if a direction is set
            const nextNodeToMoveTo = this.currentNode.neighbors[this.lastDirection];
            if (nextNodeToMoveTo) {
                this.lastDirection = this.lastDirection; // Record how we are moving
                this.currentNode = nextNodeToMoveTo;
                this.position.Set(
                    4 + this.currentNode.position.x * this.mazeGraph.nodeSize + this.mazePosition.x,
                    4 + this.currentNode.position.y * this.mazeGraph.nodeSize + this.mazePosition.y
                );
            } else {
                // If chosen direction leads nowhere (e.g., waiting at intersection, or error)
                // Ghost effectively stops or waits. lastDirection isn't updated if no move is made.
            }
        }
    }

    Draw(rederer) {
        super.Draw(rederer);
    }
}
