const sticksHistoricPointsSize = 2000;

class InputAsset {
    constructor(id, position, width, height, key, value=null) {
        this.id = id;
        this.position = position;
        this.width = width;
        this.height = height;
        this.key = key;
        this.color = Color.transparent;
        this.pressedColor = Color.FromHTMLColorName("lightgreen");
        this.keyDownCount = 0;
        this.keyUpCount = 0;
        this.pressed = false;
        this.value = value;
        this.historic = [];
    }

    DawAsRectangle(renderer) {
        // rectangles fill
        renderer.DrawFillBasicRectangle(this.position.x, this.position.y, this.width, this.height, this.color);

        // rectangles stroke line
        renderer.DrawStrokeBasicRectangle(this.position.x, this.position.y, this.width, this.height, Color.black, 1);

        // rectangles text
        renderer.DrawFillText(this.key, this.position.x + this.width / 2, this.position.y + this.height - 12, "bold 32px Arial", Color.black, "center");

        renderer.DrawFillText("↓" + this.keyDownCount, this.position.x + 1, this.position.y + 12, "normal 12px Arial", Color.black, "left");
        renderer.DrawFillText("↑" + this.keyUpCount, this.position.x + this.width - 2, this.position.y + 12, "normal 12px Arial", Color.black, "right");
    }

    DrawAsCircle(renderer) {
        // circle fill
        renderer.DrawFillCircle(this.position.x, this.position.y, this.width, this.color);

        // circle stroke
        renderer.DrawStrokeCircle(this.position.x, this.position.y, this.width);

        // circles text
        renderer.DrawFillText(this.key, this.position.x, this.position.y + 13, "bold 22px Arial", Color.black, "center");
        
        renderer.DrawFillText("↓" + this.keyDownCount, this.position.x - 15, this.position.y - 6, "normal 10px Arial", Color.black, "left");
        renderer.DrawFillText("↑" + this.keyUpCount, this.position.x + 14, this.position.y - 6, "normal 10px Arial", Color.black, "right");
    }

    UpdateAsKeyboard() {
        // key pressed event
        this.pressed = Input.IsKeyPressed(this.id);
        if (this.pressed)
            this.color = this.pressedColor;
        else
            this.color = Color.transparent;

        // keydown event
        if (Input.IsKeyDown(this.id))
            this.keyDownCount++;
        // keyup event
        if (Input.IsKeyUp(this.id))
            this.keyUpCount++;
    }

    UpdateAsGamepadButton() {
        // buttonpressed event
        this.pressed = Input.IsGamepadButtonPressed(0, this.id);
        if (this.pressed)
            this.color = this.pressedColor;
        else
            this.color = Color.transparent;

        // buttondown event
        if (Input.IsGamepadButtonDown(0, this.id))
            this.keyDownCount++;
        // buttonup event
        if (Input.IsGamepadButtonUp(0, this.id))
            this.keyUpCount++;
    }
}

class GamepadTester extends Game {
    constructor(renderer) {
        super(renderer);

        this.gamePadCenter = Vector2.Zero();

        this.gamepadButtonCircles = [];
        this.gamepadTriggers = [];
        this.gamepadStickCircles = [];
        this.gamepadButtons = [];

        this.rumbleActive = false;

        this.infoTextLabel = null;
        this.rumbleCheckboxTextLabel = null;
        this.rumbleCheckBoxRectangle = null;

        this.bgGradient = null;
        this.lastGamepadId = "";

        this.lightOrange = Color.FromHex("#ffd28f");

        drawStats = false;
    }

    Start() {
        super.Start();

        this.gamePadCenter.Set(this.screenHalfWidth, this.screenHalfHeight);

        this.gamepadButtonCircles = [
            new InputAsset("DPAD_DOWN",  new Vector2(this.gamePadCenter.x -  76, this.gamePadCenter.y - 20), 20, 20, "↓"),
            new InputAsset("DPAD_RIGHT", new Vector2(this.gamePadCenter.x -  36, this.gamePadCenter.y - 55), 20, 20, "→"),
            new InputAsset("DPAD_LEFT",  new Vector2(this.gamePadCenter.x - 116, this.gamePadCenter.y - 55), 20, 20, "←"),
            new InputAsset("DPAD_UP",    new Vector2(this.gamePadCenter.x -  76, this.gamePadCenter.y - 90), 20, 20, "↑"),

            new InputAsset("FACE_DOWN",  new Vector2(this.gamePadCenter.x +  74, this.gamePadCenter.y - 20), 20, 20, "A"),
            new InputAsset("FACE_RIGHT", new Vector2(this.gamePadCenter.x + 114, this.gamePadCenter.y - 55), 20, 20, "B"),
            new InputAsset("FACE_LEFT",  new Vector2(this.gamePadCenter.x +  34, this.gamePadCenter.y - 55), 20, 20, "X"),
            new InputAsset("FACE_UP",    new Vector2(this.gamePadCenter.x +  74, this.gamePadCenter.y - 90), 20, 20, "Y"),

            new InputAsset("BACK",  new Vector2(this.gamePadCenter.x - 26, this.gamePadCenter.y - 130), 20, 20, "b"),
            new InputAsset("START", new Vector2(this.gamePadCenter.x + 24, this.gamePadCenter.y - 130), 20, 20, "s"),

            new InputAsset("HOME", new Vector2(this.gamePadCenter.x, this.gamePadCenter.y), 20, 20, "H"),

            new InputAsset("LB", new Vector2(this.gamePadCenter.x - 146, this.gamePadCenter.y - 120), 20, 20, "LB"),
            new InputAsset("RB", new Vector2(this.gamePadCenter.x + 144, this.gamePadCenter.y - 120), 20, 20, "RB"),
        ];
        
        this.gamepadTriggers = [
            new InputAsset("LT", new Vector2(this.gamePadCenter.x - 186, this.gamePadCenter.y - 94), 40, 60, "LT"),
            new InputAsset("RT", new Vector2(this.gamePadCenter.x + 144, this.gamePadCenter.y - 94), 40, 60, "RT")
        ];
        this.gamepadTriggers[0].pressedColor = this.gamepadTriggers[1].pressedColor = new Color(0, 1, 0, 0.5);

        this.gamepadStickCircles = [
            new InputAsset("LS", new Vector2(this.gamePadCenter.x - 76, this.gamePadCenter.y + 60), 40, 40, "LS", {x: 0, y: 0}),
            new InputAsset("RS", new Vector2(this.gamePadCenter.x + 74, this.gamePadCenter.y + 60), 40, 40, "RS", {x: 0, y: 0})
        ];

        this.gamepadButtons = [...this.gamepadButtonCircles, ...this.gamepadStickCircles, ...this.gamepadTriggers];

        this.infoTextLabel = new TextLabel("No gamepad detected.", new Vector2(10, 10), "16px Comic Sans MS", Color.black, "left", "top");

        // rumble checkbox rectangle & label
        this.rumbleCheckboxTextLabel = new TextLabel("<- click to enable rumble", new Vector2(60, this.screenHeight - 30), "Comic Sans MS 20px", Color.black, "left");

        this.rumbleCheckBoxRectangle = new RectangleGO(new Vector2(40, this.screenHeight - 40), 30, 30, Color.red);
        const rectCheckboxCollider = new RectangleCollider(Vector2.Zero(), this.rumbleCheckBoxRectangle.rectangle.width, this.rumbleCheckBoxRectangle.rectangle.height, this.rumbleCheckBoxRectangle);
        this.rumbleCheckBoxRectangle.collider = rectCheckboxCollider;
        this.AddCollider(rectCheckboxCollider);
        rectCheckboxCollider.OnClick = () => {
            this.rumbleActive = !this.rumbleActive;
            this.rumbleCheckboxTextLabel.text = this.rumbleActive ? "Rumble enabled! use L/R triggers to rumble (left = strong, right = weak)." : "<- click to enable rumble";
            this.rumbleCheckBoxRectangle.color = this.rumbleActive ? Color.lime : Color.red;
        }
        this.AddGameObject(this.rumbleCheckBoxRectangle);

        // background gradient
        this.bgGradient = new LinearGradient(this.renderer, new Vector2(this.screenWidth, this.screenHeight).Normalize(), [[0, Color.white], [1, Color.grey]]);

        // sticks history
        this.gamepadStickCircles[0].historic = [{x: 0, y: 0}];
        this.gamepadStickCircles[1].historic = [{x: 0, y: 0}];
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // gamepad buttons events
        this.gamepadButtons.forEach(button => {
            button.UpdateAsGamepadButton();
        });

        // gamepad sticks values
        this.gamepadStickCircles[0].value = Input.GetGamepadStickValue(0, "LS");
        this.gamepadStickCircles[0].horizontalValue = Input.GetGamepadStickAxisValue(0, "LS", 0);
        this.gamepadStickCircles[0].verticalValue = Input.GetGamepadStickAxisValue(0, "LS", 1);
        this.gamepadStickCircles[1].value = Input.GetGamepadStickValue(0, "RS");
        this.gamepadStickCircles[1].horizontalValue = Input.GetGamepadStickAxisValue(0, "RS", 0);
        this.gamepadStickCircles[1].verticalValue = Input.GetGamepadStickAxisValue(0, "RS", 1);


        if (this.gamepadStickCircles[0].historic.length < sticksHistoricPointsSize &&
            Vector2.SqrMagnitude(this.gamepadStickCircles[0].historic[this.gamepadStickCircles[0].historic.length - 1], this.gamepadStickCircles[0].value) > 0.005) {
            this.gamepadStickCircles[0].historic.push(this.gamepadStickCircles[0].value);
        }
        if (this.gamepadStickCircles[1].historic.length < sticksHistoricPointsSize &&
            Vector2.SqrMagnitude(this.gamepadStickCircles[1].historic[this.gamepadStickCircles[1].historic.length - 1], this.gamepadStickCircles[1].value) > 0.005) {
            this.gamepadStickCircles[1].historic.push(this.gamepadStickCircles[1].value);
        }

        // gamepad triggers values
        this.gamepadTriggers.forEach(trigger => {
            trigger.value = Input.GetGamepadTriggerValue(0, trigger.id);
        });

        // rumble: LT drives the strong (low-freq) motor, RT drives the weak (high-freq) motor
        if (this.rumbleActive) {
            const lt = this.gamepadTriggers[0].value;
            const rt = this.gamepadTriggers[1].value;
            if (lt > 0.05 || rt > 0.05) {
                Input.RumbleGamepad(0, lt, rt, 100);
            }
        }

        this.infoTextLabel.text = Input.gamepads.length === 0 ? "No gamepad detected." : `Gamepad detected: ${Input.gamepads[0].gamepad.id}`;
        
        // update background gradient colors
        if (Input.gamepads.length > 0) {
            const gamepadId = Input.gamepads[0].gamepad.id.toLowerCase();

            if (gamepadId !== this.lastGamepadId) {
                this.lastGamepadId = gamepadId;

                if (gamepadId.includes("pro controller")) {
                    // Nintendo red
                    this.bgGradient.SetColorStop(0, Color.FromHex("#e60012"));
                    this.bgGradient.SetColorStop(1, Color.FromHex("#e60012"));
                }
                else if (gamepadId.includes("dualsense")) {
                    // PlayStation blues
                    this.bgGradient.SetColorStop(0, Color.FromHex("#003697"));
                    this.bgGradient.SetColorStop(1, Color.FromHex("#0084f0"));
                }
                else if (gamepadId.includes("xbox")) {
                    // Xbox green
                    this.bgGradient.SetColorStop(0, Color.FromHex("#107c10"));
                    this.bgGradient.SetColorStop(1, Color.FromHex("#107c10"));
                }
                else {
                    this.bgGradient.SetColorStop(0, Color.white);
                    this.bgGradient.SetColorStop(1, Color.grey);
                }
            }
        }
        else {
            this.bgGradient.SetColorStop(0, Color.white);
            this.bgGradient.SetColorStop(1, Color.grey);
        }
    }

    Draw() {
        this.renderer.DrawGradientRectangle(0, 0, this.screenWidth, this.screenHeight, this.bgGradient);
        
        super.Draw();

        // gamepad buttons
        this.gamepadButtonCircles.forEach(buttonCircle => {
            buttonCircle.DrawAsCircle(this.renderer)
        }, this);
        // gamepad stick

        this.gamepadStickCircles.forEach(stick => {
            // stick orange historic values
            stick.historic.forEach(value => {
                this.renderer.DrawFillCircle(stick.position.x + (value.x * 40), stick.position.y + (value.y * 40), 2, this.lightOrange);
            });

            stick.DrawAsCircle(this.renderer);

            // axis values
            this.renderer.DrawFillText("x = " + stick.horizontalValue.toFixed(3), stick.position.x, stick.position.y + 22, "normal 12px Arial", Color.black, "center");
            this.renderer.DrawFillText("y = " + stick.verticalValue.toFixed(3), stick.position.x, stick.position.y + 30, "normal 12px Arial", Color.black, "center");

            // pink dot
            this.renderer.DrawFillCircle(stick.position.x + (stick.value.x * 40), stick.position.y + (stick.value.y * 40), 3, Color.pink);
        }, this)
        // gamepad triggers
        this.gamepadTriggers.forEach(trigger => {     
            this.renderer.DrawFillBasicRectangle(trigger.position.x, trigger.position.y, trigger.width, trigger.value * trigger.height, Color.blue);

            trigger.DawAsRectangle(this.renderer);

            this.renderer.DrawFillText(trigger.value.toFixed(3), trigger.position.x + trigger.width / 2, trigger.position.y + trigger.height - 2, "normal 12px Arial", Color.black, "center");
        }, this);

        this.infoTextLabel.Draw(this.renderer);

        this.rumbleCheckboxTextLabel.Draw(this.renderer);
    }
}

window.onload = () => {
    Init(GamepadTester);
}