# Physics (Box2D)

The engine integrates with Box2D for robust 2D physics simulations. Extend `Box2DGame` for your game class and use `Box2DRectangleGO` / `Box2DCircleGO` for physics-enabled game objects.

## Initial Configuration

In your `index.html`, add the Box2D scripts after the core engine scripts:

```html
<!-- core engine scripts first -->
<script src="engine/renderer.js"></script>
<!-- ... -->
<script src="engine/gameobjects.js"></script>

<!-- then Box2D -->
<script src="lib/Box2D.js"></script>
<script src="engine/box2d_helper.js"></script>
<script src="engine/box2d_game.js"></script>
<script src="engine/box2d_gameobjects.js"></script>

<script src="src/my-game.js"></script>
```

## Game class with Box2D

```javascript
class MyBox2DGame extends Box2DGame {
    constructor(renderer) {
        // super(renderer, pixelsPerMeter, gravityVector, allowSleep)
        super(renderer, 100, { x: 0, y: -9.8 }, false);
    }

    Start() {
        super.Start(); // creates this.physicsWorld

        // this.gameObjects.push(new MyPhysicsBox(new Vector2(100, 100), this.physicsWorld));
    }
}
```

## GameObjects with a Box2D body

```javascript
class MyPhysicsBox extends Box2DRectangleGO {
    constructor(position, physicsWorld) {
        // super(position, physicsWorld, PhysicsObjectType, { width, height }, friction, restitution, color)
        super(position, physicsWorld, PhysicsObjectType.Box, { width: 1, height: 1, density: 1 }, 1, 0.5, Color.green);
    }

    OnContactDetected(other) {
        console.log("Collision with:", other.name);
    }
}
```

---

## API Reference

### `Box2DGame`

Extends the base `Game` class to manage the Box2D physics world.

#### `constructor(renderer, pixelsPerMeter, gravityVector, allowSleep)`

- `renderer` — the engine renderer instance
- `pixelsPerMeter` — conversion factor (e.g. `100` means 100 px = 1 m)
- `gravityVector` — `{x, y}` gravity in m/s² (e.g. `{x: 0, y: -9.8}`)
- `allowSleep` — whether bodies can sleep to save CPU

#### `physicsWorld`
The Box2D `b2World` instance. Use for advanced physics operations.

#### Debug Drawing
To visualise physics bodies, joints, and collision shapes overlaid on the canvas, set `drawColliders: true` in your game's config during `this.Configure()`.

#### `AddBody(bodyDef)` / `RemoveBody(body)`
Add or remove a `b2Body` from the world. Typically called internally by `Box2DGameObject`s.

#### `SetGravity(gravityVector)`
Changes the gravity vector at runtime.

---

### `Box2DGameObject` classes

Base class for all physics-enabled game objects. Subclasses: `Box2DRectangleGO`, `Box2DSpriteObject`, `Box2DSSAnimationObjectBasic`, `Box2DSSAnimationObjectComplex`.

#### `constructor(position, physicsWorld, objectType, bodyOptions, ...)`

- `position` — `Vector2` initial position
- `physicsWorld` — the `b2World` from `Box2DGame`
- `objectType` — `PhysicsObjectType.Box` or `PhysicsObjectType.Circle`
- `bodyOptions` — Object containing physics properties (`density`, `friction`, `restitution`, `type`, `offset`, `radius`, `width`, `height`, etc.)
- Additional parameters for rendering (e.g. `width`, `height`, `color`, `img`, `scale`)

#### `body`
The underlying `b2Body` instance.

#### `OnContactDetected(otherGameObject, contactPoint)`
Called when this object's body begins contact with another `Box2DGameObject`. `contactPoint` is a `b2Vec2` representing the exact world coordinate of the impact.

> **Note:** If you need to destroy an object during a collision, just use `game.Destroy(this)`. The engine uses deferred deletion (a kill queue) at the end of the frame, making it 100% safe to destroy bodies inside Box2D contact callbacks!

#### `OnContactEnded(otherGameObject)`
Called when contact ends.

#### `SetLinearVelocity(x, y)` / `GetLinearVelocity()`
Set or get the body's linear velocity in m/s.

#### `SetAngularVelocity(radiansPerSecond)` / `GetAngularVelocity()`
Set or get the body's angular velocity.

#### `ApplyForce(forceX, forceY, pointX, pointY)`
Applies a continuous force at a world point (affects acceleration).

#### `ApplyImpulse(impulseX, impulseY, pointX, pointY)`
Applies an instantaneous impulse (affects velocity directly).

#### `SetFixedRotation(fixed)`
Pass `true` to prevent the body from rotating.

#### `SetSensor(isSensor)`
Sensors detect collisions but don't apply physics responses.

#### `SetCategoryBits(bits)` / `SetMaskBits(bits)`
Configure collision filtering categories and masks.

---

### Helper functions (`box2d_helper.js`)

#### `CanvasToBox2DPosition(canvas, canvasPos, scale)`
Converts a `Vector2` pixel coordinate from the canvas space to a `b2Vec2` in the Box2D physics world space (inverts the Y-axis).

#### `Box2DToCanvasPosition(canvas, box2DPos, scale)`
Converts a `b2Vec2` coordinate from the physics world back to a pixel `Vector2` for canvas rendering.
