class InputActionsTest extends Game {
    constructor(renderer) {
        super(renderer);

        this.player = null;
        this.jumpIndicator = null;
        this.fireIndicator = null;
        this.axisDisplay = null;
        this.instructions = [];
    }

    Start() {
        super.Start();

        // 1. Setup Input Mappings
        this.SetupInputActions();

        // 2. Create GameObjects for visualization
        this.player = new RectangleGO(new Vector2(this.screenHalfWidth, this.screenHalfHeight), 50, 50, Color.cyan);
        this.AddGameObject(this.player);

        this.jumpIndicator = new TextLabel("Jump!", new Vector2(150, 50), "24px Arial", Color.green, "center");
        this.jumpIndicator.color.a = 0; // Initially invisible

        this.fireIndicator = new TextLabel("Fire!", new Vector2(this.screenWidth - 150, 50), "24px Arial", Color.red, "center");
        this.fireIndicator.color.a = 0; // Initially invisible

        this.axisDisplay = new TextLabel("Axis X: 0.00, Axis Y: 0.00", new Vector2(this.screenHalfWidth, this.screenHeight - 30), "18px Arial", Color.black, "center");

        this.instructions = [
            new TextLabel("Use WASD/Arrows/Gamepad Left Stick to Move", new Vector2(this.screenHalfWidth, 30), "16px Arial", Color.black, "center"),
            new TextLabel("Press Space/Gamepad 'A' to Jump", new Vector2(this.screenHalfWidth, 50), "16px Arial", Color.black, "center"),
            new TextLabel("Click Mouse/Hold Gamepad 'B' to Fire", new Vector2(this.screenHalfWidth, 70), "16px Arial", Color.black, "center"),
            new TextLabel("Use Gamepad Right Trigger to Rotate", new Vector2(this.screenHalfWidth, 90), "16px Arial", Color.black, "center")
        ];
    }

    SetupInputActions() {
        Input.ClearMappings();

        // Register Actions
        Input.RegisterAction("Jump", [
            { type: 'key', code: KEY_SPACE },
            { type: 'gamepad', code: 'FACE_DOWN' } // 'A' on Xbox
        ]);

        Input.RegisterAction("Fire", [
            { type: 'mouse' },
            { type: 'gamepad', code: 'FACE_RIGHT' } // 'B' on Xbox
        ]);

        // Register Axes
        Input.RegisterAxis("MoveHorizontal", [
            { type: 'key', positive: KEY_D, negative: KEY_A },
            { type: 'key', positive: KEY_RIGHT, negative: KEY_LEFT },
            { type: 'gamepadaxis', stick: 'LS', axis: 0 }, // Left Stick X
            { type: 'gamepadbutton', positive: 'DPAD_RIGHT', negative: 'DPAD_LEFT' }
        ]);

        Input.RegisterAxis("MoveVertical", [
            { type: 'key', positive: KEY_S, negative: KEY_W },
            { type: 'key', positive: KEY_DOWN, negative: KEY_UP },
            { type: 'gamepadaxis', stick: 'LS', axis: 1 }, // Left Stick Y
            { type: 'gamepadbutton', positive: 'DPAD_DOWN', negative: 'DPAD_UP' }
        ]);

        Input.RegisterAxis("ClockwiseRotation", [
            { type: 'gamepadtrigger', trigger: 'RT' }
        ]);

        Input.RegisterAxis("CounterClockwiseRotation", [
            { type: 'gamepadtrigger', trigger: 'LT' }
        ]);
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        // 1. Handle Axis Input
        const moveX = Input.GetAxis("MoveHorizontal");
        const moveY = Input.GetAxis("MoveVertical");
        const moveSpeed = 200;
        const rotation = Input.GetAxis("ClockwiseRotation") - Input.GetAxis("CounterClockwiseRotation");

        this.player.x += moveX * moveSpeed * deltaTime;
        this.player.y += moveY * moveSpeed * deltaTime;
        this.player.rotation = rotation * PIH; // Rotate proportionally to trigger press

        // Clamp player position to screen bounds
        this.player.x = Math.max(this.player.width / 2, Math.min(this.screenWidth - this.player.width / 2, this.player.x));
        this.player.y = Math.max(this.player.height / 2, Math.min(this.screenHeight - this.player.height / 2, this.player.y));

        // 2. Handle Action Input
        if (Input.GetActionDown("Jump")) {
            this.jumpIndicator.color.a = 1.0; // Make it visible
        }
        if (Input.GetAction("Fire")) { // Using GetAction to show it while held
            this.fireIndicator.color.a = 1.0; // Make it visible
        }

        // 3. Update UI
        // Fade out indicators
        this.jumpIndicator.color.a = Math.max(0, this.jumpIndicator.color.a - 2 * deltaTime);
        this.fireIndicator.color.a = Math.max(0, this.fireIndicator.color.a - 2 * deltaTime);

        // Update axis display text
        this.axisDisplay.text = `MoveHorizontal: ${moveX.toFixed(2)}, MoveVertical: ${moveY.toFixed(2)}`;
    }

    Draw() {
        // Draw a background
        this.renderer.DrawFillBasicRectangle(0, 0, this.screenWidth, this.screenHeight, Color.lightGrey);

        super.Draw();

        // Draw UI elements
        this.jumpIndicator.Draw(this.renderer);
        this.fireIndicator.Draw(this.renderer);
        this.axisDisplay.Draw(this.renderer);
        this.instructions.forEach(label => label.Draw(this.renderer));
    }
}
