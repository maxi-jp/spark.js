# Utilities

- `utils_math.js` — `Vector2` class, random helpers, and geometry math functions
- `utils_classes.js` — `Color`, `TextLabel`, `Sprite`, colliders, and drawing helpers

---

## `Vector2`

A 2D vector used throughout the engine for positions, directions, and velocities.

```javascript
const pos  = new Vector2(100, 200);
const zero = Vector2.Zero();
const copy = Vector2.Copy(pos);
```

### Instance methods

| Method | Description |
|---|---|
| `Set(x, y)` | Set both components in one call |
| `Length()` | Returns the magnitude |
| `SqrLength()` | Returns the squared magnitude (cheaper than `Length()`) |
| `Normalize()` | Normalises the vector in place; returns `this` for chaining |
| `Add(v)` | Adds `v` in place |
| `Sub(v)` | Subtracts `v` in place |
| `MultiplyScalar(s)` | Multiplies both components by scalar `s`; returns `this` |
| `DotProduct(v)` | Returns the dot product with `v` |
| `Angle()` | Returns the angle in radians via `Math.atan2(y, x)` |
| `AngleBetween(v)` | Returns the angle (radians) between this and normalised `v` |
| `IsZero()` | Returns `true` if both components are `0` |
| `Randomize()` | Sets components to random values in `[-1, 1]` |
| `RandomNormalized()` | Randomises and normalises |

### Static methods

| Method | Description |
|---|---|
| `Vector2.Zero()` | Returns `new Vector2(0, 0)` |
| `Vector2.Copy(v)` | Returns a new copy of `v` |
| `Vector2.Random()` | Returns a random vector with components in `[-1, 1]` |
| `Vector2.Magnitude(v1, v2)` | Distance between two vectors |
| `Vector2.SqrMagnitude(v1, v2)` | Squared distance between two vectors |

### Common patterns

```javascript
// Direction from A to B, normalised
const dir = new Vector2(target.x - this.x, target.y - this.y);
dir.Normalize();

// Move toward target at a fixed speed
this.x += dir.x * speed * deltaTime;
this.y += dir.y * speed * deltaTime;

// Aim rotation at the mouse
this.rotation = Math.atan2(
    Input.mouse.y - this.y,
    Input.mouse.x - this.x
);
```

---

## `Color`

RGBA color where R, G, B are in `0.0`–`1.0` and A defaults to `1.0`.

### Constructors and factories

```javascript
new Color(r, g, b, a)             // normalised 0–1 components
Color.FromRGB(255, 128, 0)        // integer 0–255
Color.FromRGBA(255, 128, 0, 0.5)  // integer RGB + 0–1 alpha
Color.FromHex("#ff8000")          // 6-digit hex
Color.FromHexA("#ff800080")       // 8-digit hex with alpha
Color.Lerp(colorA, colorB, 0.5)   // interpolate (static)
```

### Instance methods

| Method | Description |
|---|---|
| `toString()` | Returns `"rgba(r,g,b,a)"` for use with the Canvas API |
| `Desaturate(value)` | Desaturates toward grey by `value` (0 = no change, 1 = full grey); returns `this` |

### Predefined static colors

`Color.red`, `Color.green`, `Color.blue`, `Color.black`, `Color.white`, `Color.yellow`, `Color.transparent`, `Color.black`, and more.

---

## `TextLabel`

Draws text on the canvas. Works with both the Canvas 2D and WebGL renderers (the WebGL renderer caches text as a texture automatically).

```javascript
const label = new TextLabel(
    "Score: 0",            // text
    new Vector2(8, 8),     // position
    "18px Arial",          // CSS font string
    Color.white,           // color
    "left",                // align: "left" | "center" | "right"
    "top",                 // baseline: "top" | "middle" | "bottom"
    false,                 // stroke (optional)
    1                      // lineWidth (optional)
);

// Update text at any time
label.text = `Score: ${this.score}`;

// Draw in your Game's Draw()
label.Draw(this.renderer);
```

> `TextLabelFillAndStroke` is a simpler variant that draws both fill and stroke with separate colors in one call: `new TextLabelFillAndStroke(text, position, font, fillColor, strokeColor, align, baseline)`.

---

## Colliders

The collision system works in two modes:

- **Standalone** — a collider at a fixed or manually updated position, not tied to any `GameObject`
- **Attached to a GameObject** — pass the `GameObject` as the last constructor argument; the collider automatically follows the object's `position` (and `rotation` for `PolygonCollider`) every frame

All colliders must be registered with `this.AddCollider(collider)` in your `Game.Start()`. The base `Game.Update()` then handles all overlap detection and fires `OnCollisionEnter` / `OnCollisionExit` callbacks automatically.

### Supported collision pairs

All combinations are handled by the engine:

| | Rectangle | Circle | Polygon |
|---|---|---|---|
| **Rectangle** | ✔ AABB | ✔ | ✔ |
| **Circle** | ✔ | ✔ | ✔ |
| **Polygon** | ✔ | ✔ | ✔ SAT |

### `RectangleCollider`

Axis-aligned bounding box. The `position` is the **centre** of the rectangle.

```javascript
// Standalone
const wall = new RectangleCollider(new Vector2(320, 480), 640, 20);
this.AddCollider(wall);

// Attached to a RectangleGO
const box = new RectangleGO(new Vector2(100, 300), 100, 60, Color.blue);
const boxCollider = new RectangleCollider(
    Vector2.Zero(),        // offset from the GO's position
    box.rectangle.width,
    box.rectangle.height,
    box                    // pass the GameObject → collider follows it
);
box.collider = boxCollider;
this.AddCollider(boxCollider);
this.gameObjects.push(box);
```

### `CircleCollider`

```javascript
// Standalone — follows the mouse cursor
const cursor = new CircleCollider(new Vector2(0, 0), 20);
this.AddCollider(cursor);

// In Update(), move it manually:
cursor.UpdatePosition(Input.mouse);
```

### `PolygonCollider`

Arbitrary convex polygon defined as an array of `{x, y}` points **relative to the collider's position**. Supports rotation.

```javascript
// Triangle (standalone, auto-rotating)
const triangle = new PolygonCollider(
    new Vector2(300, 200), // position
    0,                     // initial rotation (radians)
    [
        { x:   0, y: -50 },
        { x:  50, y:  40 },
        { x: -50, y:  40 }
    ]
);
this.AddCollider(triangle);

// In Update(), reposition and rotate:
this.angle += deltaTime;
triangle.UpdatePositionAndRotation(triangle.position, this.angle);

// Attached to a SpriteObject with a custom shape (e.g. a rupee gem)
const rupee = new SpriteObject(new Vector2(500, 300), 0, 0.5, img);
const rupeeCollider = new PolygonCollider(
    Vector2.Zero(), 0,
    [
        { x:   0, y: -54 },
        { x:  29, y: -26 },
        { x:  29, y:  24 },
        { x:   0, y:  50 },
        { x: -29, y:  24 },
        { x: -29, y: -26 }
    ],
    rupee   // attached — follows rupee's position and rotation
);
rupee.collider = rupeeCollider;
this.AddCollider(rupeeCollider);
this.gameObjects.push(rupee);
```

### Collision callbacks

There are two ways to react to collisions:

**1. Override on the `GameObject`** (preferred when the collider is attached):

```javascript
class Player extends SpriteObject {
    OnCollisionEnter(myCollider, otherCollider) {
        if (otherCollider.go instanceof Enemy) {
            this.TakeDamage();
        }
    }

    OnCollisionExit(myCollider, otherCollider) {
        // called the frame the overlap ends
    }
}
```

> **Real-world example:** the <a href="https://maxi-jp.github.io/spark.js/superpang.html" target="_blank">Super Pang</a> example uses both collider types together. `PangBall` has a `CircleCollider` and `PangShot` has a `RectangleCollider` whose size is updated every frame to match the wire's current length. Collision is detected on the ball side — `OnCollisionEnter` checks `otherCollider.go instanceof PangShot` and triggers the pop-and-split logic. The wire collider also demonstrates updating a collider's `position`, `rect`, and `boundingRadius` manually each frame for non-standard shapes.

**2. Set a callback directly on the collider** (useful for standalone colliders):

```javascript
wall.onCollisionEnterCallback = (otherCollider) => {
    console.log("something hit the wall");
};
```

### Click callbacks

Any collider can also respond to mouse clicks via `onClickCallback`:

```javascript
const button = new RectangleCollider(new Vector2(320, 240), 200, 60);
button.onClickCallback = () => { this.StartGame(); };
this.AddCollider(button);
```

### Updating standalone colliders manually

| Method | Description |
|---|---|
| `UpdatePosition(newPosition)` | Move the collider to a new `{x, y}` position |
| `UpdatePositionAndRotation(newPosition, newRotation)` | Move and rotate (`PolygonCollider` only) |

### Debug visualisation

Set `drawColliders: true` in your game config to draw all registered colliders on top of the normal game visuals every frame:

```javascript
this.Configure({ drawColliders: true });
```

For pure hitbox debugging — skipping all game object drawing entirely — use `collidersOnly: true` instead:

```javascript
this.Configure({ collidersOnly: true });
```

Colliders are drawn in **red** when not colliding and switch to **green** when overlapping.

> Live demo: [Colliders test](https://maxi-jp.github.io/spark.js/colliders.html)

---

## `Pool` (Object Pooling)

`Pool` (in `gameobjects.js`) pre-allocates a fixed set of objects and reuses them instead of creating and destroying GameObjects every frame. Ideal for bullets, particles, enemies, etc.

### Main methods

| Method | Description |
|---|---|
| `Activate()` | Returns the first inactive object and marks it active. Creates a new object only if the pool is exhausted. |
| `Update(deltaTime)` | Updates all active pooled objects. |
| `Draw(renderer)` | Draws all active pooled objects. |
| `DisableAll()` | Sets every pooled object to `active = false` in one call. Useful on reset, scene transitions, or game over. |

```javascript
// In Game constructor:
this.bulletPool = new Pool(this, 20, Bullet, [constructorArg1, constructorArg2]);

// In Game Update:
this.bulletPool.Update(deltaTime);

// In Game Draw:
this.bulletPool.Draw(this.renderer);

// To fire a bullet — grabs the first inactive object from the pool:
const bullet = this.bulletPool.Activate();
bullet.Launch(this.player.position, this.player.rotation);

// To instantly return all bullets to the pool (e.g. level restart):
this.bulletPool.DisableAll();
```

Objects in the pool are created with `active = false` upfront. Call `object.active = false` inside the object's own `Update` to return it to the pool (e.g. when it goes off-screen).

> See the [Object Pooling demo](https://maxi-jp.github.io/spark.js/object_pooling.html) for a complete example.

---

## Math helpers (`utils_math.js`)

Global functions available throughout the engine:

| Function | Description |
|---|---|
| `RandomBetweenInt(min, max)` | Random integer in `[min, max]` inclusive |
| `RandomBetweenFloat(min, max)` | Random float in `[min, max)` |
| `Lerp(start, end, t)` | Linear interpolation |
| `LerpRotation(current, target, t)` | Lerp between angles, wrapping correctly through `±π` |
| `NormalizeAngle(angle)` | Normalises an angle to `[-π, π]` |
| `RotatePointAroundPoint(point, origin, angle)` | Rotates a point around an origin |
| `IntersectionBetweenLines(l1p1, l1p2, l2p1, l2p2)` | Returns the intersection point of two line segments |
| `DistanceSquaredPointToPoint(x1,y1,x2,y2)` | Squared distance (avoids `sqrt`) |
