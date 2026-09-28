class BrokeOut extends Game {
    constructor(renderer) {
        super(renderer);

        this.playerScore = 0;
        this.playerScoreLabel = null;

        this.playerBall = null;
        this.playerPaddle = null;

        this.bricks = [];
    }

    Start() {
        super.Start();

        this.screenWidth = 320;
        this.screenHeight = 480;

        this.playerScore = 0;
        this.playerScoreLabel = new TextLabelFillAndStroke(this.playerScore, new Vector2(this.screenWidth / 2, 50), "40px Comic Sans MS", Color.white, Color.black, "center", "bottom");

        // initialize the ball
        this.ball = new Ball(new Vector2(this.screenHalfWidth, this.screenHalfHeight), 400, new Vector2(RandomBetweenFloat(-0.5, 0.5), 1));
        this.AddGameObject(this.ball);

        // initialize the paddle
        this.playerPaddle = new Paddle(new Vector2(this.screenHalfWidth, this.screenHeight - 50), 70, 20, 300);
        this.AddGameObject(this.playerPaddle);

        // initialize the bricks
        this.bricks = [];
        const xBricks = 5;
        const yBricks = 10;
        const brickWidth = this.screenWidth / xBricks;
        const brickHeight = 20;
        for (let j = 0; j < yBricks; j++) {
            for (let i = 0; i < xBricks; i++) {
                const newBrick = new Brick(
                    new Vector2(i * brickWidth, j * brickHeight),
                    brickWidth,
                    brickHeight,
                    Color.Random(),
                    1
                );
                this.bricks.push(newBrick);
            }
        }
    }

    Update(deltaTime) {
        // update the game objects
        super.Update(deltaTime);

        // check ball-paddle collision
        this.ball.CheckPlayerPaddleCollision(this.playerPaddle);

        // check ball-bricks collision
        for (let i = 0; i < this.bricks.length; i++) {
            if (this.ball.CheckBrickCollision(this.bricks[i])) {
                const brickBroken = this.bricks[i].Hit();
                if (brickBroken) {
                    this.playerScore += this.bricks[i].score;
                    this.playerScoreLabel.text = this.playerScore;

                    this.bricks.splice(i, 1);
                    i--;
                }
            }
        }
    }

    Draw() {
        // black background
        this.renderer.DrawFillRectangle(this.screenHalfWidth, this.screenHalfHeight, this.screenWidth, this.screenHeight, Color.black)

        // draw the game objects
        super.Draw();

        // draw the bricks
        this.bricks.forEach(brick => brick.Draw(this.renderer));

        this.playerScoreLabel.Draw(this.renderer);
    }

}

class Ball extends GameObject {
    constructor(position, speed, initialDirection) {
        super(position);
        
        this.speed = speed;
        this.direction = initialDirection;
        this.direction.Normalize();

        this.circle = null;

        this.radius = 5;

        this.displacementVector = Vector2.Zero();
    }

    Start() {
        this.circle = new Circle(this.position, this.radius, Color.white, false);
        this.displacementVector.Set(0, 0);
    }

    Update(deltaTime) {
        const nextX = this.position.x + (this.direction.x * this.speed * deltaTime);
        const nextY = this.position.y + (this.direction.y * this.speed * deltaTime);

        // check walls collision
        const distToLeftWall  = this.position.x;
        const distToRightWall = game.screenWidth - this.position.x;
        const distToTopWall   = this.position.y;
        const distToDownWall  = game.screenHeight - this.position.y;

        if (this.direction.y > 0) {
            // going down
            if (this.direction.x > 0) {
                // going right
                if (distToRightWall < distToDownWall && nextX > canvas.width) {
                    this.direction.x = -this.direction.x;
                }
                else if (distToRightWall > distToDownWall && nextY > canvas.height) {
                    this.direction.y = -this.direction.y;
                }
            }
            else {
                // going left
                if (distToLeftWall < distToDownWall && nextX < 0) {
                    this.direction.x = -this.direction.x;
                }
                else if (distToLeftWall > distToDownWall && nextY > canvas.height) {
                    this.direction.y = -this.direction.y;
                }
            }
        }
        else {
            // going up
            if (this.direction.x > 0) {
                // going right
                if (distToRightWall < distToTopWall && nextX > canvas.width) {
                    this.direction.x = -this.direction.x;
                }
                else if (distToRightWall > distToTopWall && nextY < 0) {
                    this.direction.y = -this.direction.y;
                }
            }
            else {
                // going left
                if (distToLeftWall < distToTopWall && nextX < 0) {
                    this.direction.x = -this.direction.x;
                }
                else if (distToLeftWall > distToTopWall && nextY < 0) {
                    this.direction.y = -this.direction.y;
                }
            }
        }
        this.displacementVector.x = this.direction.x * this.speed * deltaTime;
        this.displacementVector.y = this.direction.y * this.speed * deltaTime;
        
        this.position.x += this.displacementVector.x;
        this.position.y += this.displacementVector.y;
    }

    Draw(renderer) {
        this.circle.Draw(renderer);
    }

    CheckPlayerPaddleCollision(paddle) {
        if (CheckPointInsideRect(this.position, paddle.rectangle)) {
            const difX = (this.direction.x > 0) ? this.position.x - paddle.position.x : paddle.position.x + paddle.rectangle.width - this.position.x;
            const difY = (this.direction.y > 0) ? this.position.y - paddle.position.y : paddle.position.y + paddle.rectangle.height - this.position.y;

            if (difY < difX) {
                if (this.direction.y > 0) {
                    this.position.y = paddle.position.y - this.radius;
                    
                    const propX = (this.position.x - paddle.position.x) / paddle.rectangle.width;
                    if (propX < -0.1666) {
                        this.direction.x -= (0.1666 - propX) * 1;
                    }
                    else if (propX > 0.1666) {
                        this.direction.x += (0.1666 + propX) * 1;
                    }
                    this.direction.Normalize();
                    
                    if (this.direction.x < -0.9)
                        this.direction.x = -0.6;
                    if (this.direction.x > 0.9)
                        this.direction.x = 0.6;
                    this.direction.Normalize();
                }
                else if (this.direction.y < 0)
                    this.position.y = paddle.position.y + paddle.rectangle.height + this.radius;

                this.direction.y = -this.direction.y;
            }
            else { // difY > difX
                if (this.direction.x > 0) {
                    this.position.x = paddle.position.x - this.radius;

                    if (paddle.move == -1) {
                        this.position.x -= paddle.speed * globalDT;
                    }
                    else {
                        this.direction.x = -this.direction.x;
                    }
                }                    
                else if (this.direction.x < 0)
                {
                    this.position.x = paddle.position.x + paddle.rectangle.width + this.radius;

                    if (paddle.move == 1) {
                        this.position.x += paddle.speed * globalDT;
                    }
                    else {
                        this.direction.x = -this.direction.x;
                    }
                }
            }
        }
    }

    CheckBrickCollision(brick) {
        if(CheckPointInsideRect(this.position, brick.rectangle)) {
            const difX = (this.direction.x > 0) ? this.position.x - brick.position.x : brick.position.x + brick.rectangle.width - this.position.x;
            const difY = (this.direction.y > 0) ? this.position.y - brick.position.y : brick.position.y + brick.rectangle.height - this.position.y;

            if (difY < difX) {
                if (this.direction.y > 0)
                    this.position.y = brick.position.y - this.radius;
                else if (this.direction.y < 0)
                    this.position.y = brick.position.y + brick.rectangle.height + this.radius;

                this.direction.y = -this.direction.y;
            }
            else { // difY > difX
                if (this.direction.x > 0)
                    this.position.x = brick.position.x - this.radius;       
                else if (this.direction.x < 0)
                    this.position.x = brick.position.x + brick.rectangle.width + this.radius;
                this.direction.x = -this.direction.x;
            }

            return true;
        }
        else
            return false;
    }
}

class Paddle extends RectangleGO {
    constructor(position, width, height, speed) {
        super(position, width, height, Color.red);

        // set the pivot point in the top-left corner
        this.pivot = { x: -width/2, y: -height/2 };

        this.initialPosition = Vector2.Copy(position);

        this.speed = speed;
        this.movement = 0;
    }

    Start() {
        this.position.Set(this.initialPosition.x, this.initialPosition.y);
    }

    Update(deltaTime) {
        this.movement = 0;

        if (Input.IsKeyPressed(KEY_A) || Input.IsKeyPressed(KEY_LEFT)) {
            this.position.x -= this.speed * deltaTime;
            this.move -= 1;
        }

        if (Input.IsKeyPressed(KEY_D) || Input.IsKeyPressed(KEY_RIGHT)) {
            this.position.x += this.speed * deltaTime;
            this.move += 1;
        }

        // check left-right limits
        if (this.position.x < 0)
            this.position.x = 0;
        else if (this.position.x + this.width > game.screenWidth)
            this.position.x = game.screenWidth - this.width;
    }
}

class Brick extends RectangleGO {
    constructor(position, width, height, color, strengh=1) {
        super(position, width, height, color);
        
        // set the pivot point in the top-left corner
        this.pivot = { x: -width/2, y: -height/2 };

        this.strengh = strengh;
        this.score = strengh;
    }

    Update(deltaTime) {}

    Hit(hitPower = 1) {
        this.strengh -= hitPower;
        return this.strengh <= 0;
    }
}

window.onload = () => {
    Init(BrokeOut);
}