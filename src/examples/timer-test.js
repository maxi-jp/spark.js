class TimerTestGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.Configure({
            screenWidth: 640,
            screenHeight: 480,
            imageSmoothingEnabled: true
        });

        this.footerLabelText = null;
    }

    Start() {
        super.Start();
        
        this.messages = [];
        this.messageY = 50;

        this.footerLabelText = new TextLabel('Timer System Test - Check console and screen for results', new Vector2(this.screenHalfWidth, this.screenHeight - 16), '16px monospace', 'orange', 'center');
        
        // Test 1: One-shot timer from game
        this.AddMessage("Game starting...");
        this.Invoke(() => {
            this.AddMessage("Game timer: 2 seconds elapsed");
        }, 2.0);
        
        // Test 2: Repeating timer from game
        let count = 0;
        this.repeatingTimer = this.InvokeRepeating(() => {
            count++;
            this.AddMessage(`Repeating timer: ${count}`);
            if (count >= 5) {
                this.CancelInvoke(this.repeatingTimer);
                this.AddMessage("Repeating timer cancelled");
            }
        }, 3.0, 1.0);
        
        // Test 3: GameObject with timers
        this.testObject = new TestObject(new Vector2(this.screenHalfWidth, this.screenHalfHeight));
        this.AddGameObject(this.testObject);
        
        // Test 4: Multiple one-shot timers
        this.Invoke(() => this.AddMessage("Timer A (1s)"), 1.0);
        this.Invoke(() => this.AddMessage("Timer B (1.5s)"), 1.5);
        this.Invoke(() => this.AddMessage("Timer C (2.5s)"), 2.5);
        
        // Test 5: Destroy object with active timers (cleanup test)
        this.Invoke(() => {
            this.AddMessage("Destroying test object...");
            this.Destroy(this.testObject);
        }, 8.0);
    }

    AddMessage(text) {
        this.messages.push({ text, time: totalTime });
        console.log(text);
    }

    Draw() {
        super.Draw();
        
        let y = 20;
        const maxMessages = 15;
        const startIdx = Math.max(0, this.messages.length - maxMessages);
        
        for (let i = startIdx; i < this.messages.length; i++) {
            const msg = this.messages[i];
            const time = msg.time.toFixed(1);
            this.renderer.DrawFillText(`[${time}s] ${msg.text}`, 10, y, '16px monospace', 'black', 'left');
            y += 20;
        }
        
        // Draw instructions
        this.footerLabelText.Draw(this.renderer);
    }
}

class TestObject extends GameObject {
    constructor(position) {
        super(position);
        this.color = Color.FromRGB(0, 255, 0);
        this.size = 50;
        
        // Timer with arrow function
        this.Invoke(() => {
            game.AddMessage("GameObject timer: 4 seconds");
        }, 4.0);
        
        // Test direct method reference (Unity-style - no arrow function needed!)
        this.Invoke(this.TestDirectMethod, 4.5);
        
        // Repeating timer with direct method reference
        this.colorTimer = this.InvokeRepeating(this.ChangeColor, 5.0, 0.5);
    }
    
    TestDirectMethod() {
        // "this" is automatically bound to the TestObject instance
        game.AddMessage("GameObject: direct method call works!");
    }
    
    ChangeColor() {
        // "this" correctly refers to the TestObject
        this.color = new Color(Math.random(), Math.random(), Math.random());
        game.AddMessage("GameObject: color changed");
    }

    Draw(renderer) {
        renderer.DrawRectangle(
            this.position.x,
            this.position.y,
            this.size,
            this.size,
            this.color
        );
    }

    Destroy() {
        game.AddMessage("GameObject destroyed (timers auto-cancelled)");
    }
}

window.onload = () => { Init(TimerTestGame); }