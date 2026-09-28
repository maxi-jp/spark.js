class CollidersTest extends Game {
    constructor(renderer) {
        super(renderer);

        this.graphicAssets = {
            rupee: {
                path: "./src/examples/common_assets/green_rupee.png",
                img: null
            }
        };

        this.config.drawColliders = true;

        // basic colliders (without game object)
        this.box = null;
        this.boxPosition = new Vector2(200, 150);
        this.circle1 = null;
        this.circle1Position = new Vector2(400, 300);
        this.circle2 = null;
        this.circle2Position = new Vector2(400, 400);
        this.polygon = null;
        this.polygonPosition = new Vector2(500, 100);
        this.polygonRotation = 0;

        // game objects with collider
        this.rectGO1 = null;
        this.rupee = null;

        // text labels
        this.textLabel1 = new TextLabel("Press numbers to change the moving item (now moving 0)", new Vector2(10, this.screenHeight - 40), "14px Arial", Color.black, "left", "bottom"); 
        this.textLabel2 = new TextLabel("Move the selected object with WASD rotate with QE", new Vector2(10, this.screenHeight - 20), "14px Arial", Color.black, "left", "bottom");
        this.textLabel3 = new TextLabel("Press SPACE to toggle collider enabled/disabled", new Vector2(10, this.screenHeight - 60), "14px Arial", Color.black, "left", "bottom"); 
    }

    Start() {
        super.Start();

        this.box = new RectangleCollider(this.boxPosition, 120, 80);
        this.box.onClickCallback = () => { alert("blox clicked"); }
        this.circle1 = new CircleCollider(this.circle1Position, 50);
        this.circle2 = new CircleCollider(this.circle2Position, 25);
        this.circle2.onClickCallback = () => { alert("circle clicked"); }
        this.polygon = new PolygonCollider(this.polygonPosition, 0, [
            { x:   0, y: -50 },
            { x:  50, y:  40 },
            { x: -50, y:  40 }
        ]);
        this.polygon.onClickCallback = () => { alert("polygon clicked"); }

        this.AddCollider(this.box);
        this.AddCollider(this.circle1);
        this.AddCollider(this.circle2);
        this.AddCollider(this.polygon);

        this.rectGO1 = new RectangleGO(new Vector2(100, 300), 100, 60, new Color(1, 0, 1, 0.5));
        const rectGO1Collider = new RectangleCollider(Vector2.Zero(), this.rectGO1.rectangle.width, this.rectGO1.rectangle.height, this.rectGO1);
        this.rectGO1.collider = rectGO1Collider;
        this.AddCollider(rectGO1Collider);
        this.AddGameObject(this.rectGO1);

        this.rupee = new SpriteObject(new Vector2(500, 300), 0, 0.5, this.graphicAssets.rupee.img);
        const rupeeCollider = new PolygonCollider(Vector2.Zero(), 0, [
            { x:   0, y: -54 },
            { x:  29, y: -26 },
            { x:  29, y:  24 },
            { x:   0, y:  50 },
            { x: -29, y:  24 },
            { x: -29, y: -26 }
        ], this.rupee);
        this.rupee.collider = rupeeCollider;
        this.AddCollider(rupeeCollider);
        this.AddGameObject(this.rupee);

        this.movingObjects = [
            { name: "box collider", object: this.box },
            { name: "circle collider", object: this.circle2 },
            { name: "polygon collider", object: this.polygon },
            { name: "rect game object", object: this.rectGO1 },
            { name: "rupee (polygon game object)", object: this.rupee }
        ];
        this.movingObjectId = 0;
        this.movingObject = this.movingObjects[this.movingObjectId];
        this.textLabel1.text = `Press 1..5 to change the moving item (now moving '${ this.movingObject.name}')`;
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (Input.IsKeyDown(KEY_1)) {
            this.movingObject = this.movingObjects[0];
            this.textLabel1.text = `Press 1..5 to change the moving item (now moving '${ this.movingObject.name}')`;
        }
        else if (Input.IsKeyDown(KEY_2)) {
            this.movingObject = this.movingObjects[1];
            this.textLabel1.text = `Press 1..5 to change the moving item (now moving '${ this.movingObject.name}')`;
        }
        else if (Input.IsKeyDown(KEY_3)) {
            this.movingObject = this.movingObjects[2];
            this.textLabel1.text = `Press 1..5 to change the moving item (now moving '${ this.movingObject.name}')`;
        }
        else if (Input.IsKeyDown(KEY_4)) {
            this.movingObject = this.movingObjects[3];
            this.textLabel1.text = `Press 1..5 to change the moving item (now moving '${ this.movingObject.name}')`;
        }
        else if (Input.IsKeyDown(KEY_5)) {
            this.movingObject = this.movingObjects[4];
            this.textLabel1.text = `Press 1..5 to change the moving item (now moving '${ this.movingObject.name}')`;
        }

        // move the selected object with WASD
        if (Input.IsKeyPressed(KEY_A)) {
            this.movingObject.object.x -= 100 * deltaTime;
        }
        if (Input.IsKeyPressed(KEY_D)) {
            this.movingObject.object.x += 100 * deltaTime;
        }
        if (Input.IsKeyPressed(KEY_W)) {
            this.movingObject.object.y -= 100 * deltaTime;
        }
        if (Input.IsKeyPressed(KEY_S)) {
            this.movingObject.object.y += 100 * deltaTime;
        }

        // rotate the rupee width QE
        if (Input.IsKeyPressed(KEY_Q)) {
            this.movingObject.object.rotation -= 2 * deltaTime;
        }
        if (Input.IsKeyPressed(KEY_E)) {
            this.movingObject.object.rotation += 2 * deltaTime;
        }

        // toggle collider enabled/disabled with SPACE
        if (Input.IsKeyDown(KEY_SPACE)) {
            // Get the collider - handle both standalone colliders and game objects with colliders
            const collider = this.movingObject.object.collider || this.movingObject.object;
            if (collider) {
                collider.enabled = !collider.enabled;
                console.log(`Collider for '${this.movingObject.name}' is now ${collider.enabled ? 'ENABLED' : 'DISABLED'}`);
            }
        }

        this.polygonRotation += 1 * deltaTime;
        this.polygon.UpdatePositionAndRotation(this.polygonPosition, this.polygonRotation);

        // move the circle1 with the mouse position
        this.circle1.UpdatePosition(Input.mouse);
    }

    Draw() {
        super.Draw();

        this.textLabel1.Draw(this.renderer);
        this.textLabel2.Draw(this.renderer);
        this.textLabel3.Draw(this.renderer);
    }
}
