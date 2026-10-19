# Death Rally — Vehicular Combat Playground

A top-down vehicular combat arcade game inspired by the 1996 classic *Death Rally*. This is a **playground / prototype** scene built with spark.js to test vehicle physics, surface-based friction, weapons, and game systems before building a full race mode.

---

## How to run

Open `death-rally.html` from the project root in a local web server (e.g. VS Code Live Server, `npx serve .`).

---

## Controls

| Key | Action |
|-----|--------|
| **W** / **↑** | Throttle / accelerate |
| **S** / **↓** | Brake / reverse |
| **A** / **←** | Steer left |
| **D** / **→** | Steer right |
| **Space** / **LCtrl** | Fire current weapon |
| **Tab** | Toggle debug panel |

---

## Physics model — why no Box2D

Box2D was evaluated and **deliberately not used**. Here is the reasoning:

### Box2D strengths that don't apply here
Box2D excels at gravity-driven simulations: falling objects, ragdolls, stacked bodies, joints/chains. None of those apply to a top-down racer. Its wheel/friction system also requires a `b2WheelJoint` + `b2FrictionJoint` setup that is complex to configure and hard to tune for an arcade feel.

### Custom lateral-friction model (what was used instead)

The core insight is that top-down car handling reduces to **one physical phenomenon: lateral tyre grip**. Every frame, the car's velocity is split into a *forward* component and a *lateral* (sideways) component. The lateral component is exponentially damped according to the surface:

```
vFwd = dot(velocity, forward)
vLat = dot(velocity, right)

grip    = surface.lateralFriction × vehicle.lateralFrictionMult
newVLat = vLat × Math.pow(1 − grip, dt)          // frame-rate-independent decay

velocity = vFwd × forward + newVLat × right
```

`Math.pow(1 − grip, dt)` gives **identical behaviour at any frame rate** — the physics is not tied to 60 fps.

### Why this gives better results for arcade gameplay

| Concern | Box2D | Custom model |
|---------|-------|--------------|
| Drift feel per surface | Requires re-configuring friction/damping properties at runtime | Single `lateralFriction` float, easy to tune |
| Speed cap feel | Requires applying counter-forces | Direct forward-component cap |
| Reverse | Separate body type or impulse override | Same code path, cap at 42% of forward speed |
| Impact damage | `b2ContactListener` impulse magnitude | Computed from relative velocity dot-product in `OnCollisionEnter` |
| Steering | Requires angular damping + motor joints | `rotation += steer × steerSpeed × speedFactor × dt` |
| Off-road slowdown | Fixture material swap | Multiply `topSpeedMult` from surface def |

The engine's built-in `CircleCollider` / `RectangleCollider` + `OnCollisionEnter` callbacks provide all the collision *detection* that is needed. The *response* (bounce, damage) is computed manually, which gives full control over the arcade feel.

---

## World layout (2400 × 1800 px)

The playground is a 2400 × 1800 world with a 1024 × 768 viewport scrolled by a `FollowCamera`.

```
┌─────────────────────────────────────────┐
│ GRAVEL │         ASPHALT         │GRAVEL │  ← y 0–550
│        │      (vertical road)    │       │
├────────┼─────────────────────────┼───────┤
│  DIRT  │   ASPHALT (horizontal)  │ DIRT  │  ← y 550–1300
├────────┼─────────────────────────┼───────┤
│ GRAVEL │         ASPHALT         │GRAVEL │  ← y 1300–1800
│        │      (vertical road)    │       │
└─────────────────────────────────────────┘
```

Small **oil slick** patches (very low friction) are scattered on the asphalt road.

**Surface properties:**

| Surface | Lateral friction | Top speed | Effect |
|---------|-----------------|-----------|--------|
| Asphalt | 0.88 | 100% | Grippy, full speed |
| Gravel  | 0.60 | 84%  | Noticeably slidey, slower |
| Dirt    | 0.46 | 73%  | Strong drift, much slower |
| Grass   | 0.55 | 65%  | Off-road penalty |
| Oil     | 0.10 | 96%  | Almost no grip — car slides freely |

The *lateral friction* value means: **fraction of sideways velocity removed per second**.
A grip of 0.88 → 12% of lateral velocity remains after 1 second (asphalt = very grippy).
A grip of 0.10 → 90% remains after 1 second (oil = almost frictionless).

---

## Vehicles

| Vehicle | Top speed | Accel | Steer | Mass | Health | Character |
|---------|-----------|-------|-------|------|--------|-----------|
| Sports Car | 500 px/s | 460 | 2.8 rad/s | 1.0 | 100 | Fast and nimble, low health |
| Muscle Car | 440 px/s | 400 | 2.3 rad/s | 1.5 | 150 | Balanced, heavier collisions |
| Heavy Truck | 300 px/s | 260 | 1.8 rad/s | 2.5 | 240 | Slow bulldozer, very tanky |
| Buggy | 470 px/s | 500 | 3.2 rad/s | 0.8 | 80 | Quickest steering, fragile |

`lateralFrictionMult` is a per-vehicle multiplier on surface grip — the Buggy has 0.82, meaning it oversteers more than a Sports Car (1.0) regardless of surface.

---

## Weapons

| Weapon | Ammo | Damage | Fire rate | Notes |
|--------|------|--------|-----------|-------|
| Machine Gun | ×10 | 10 / bullet | 0.12 s | Hold Space to rapid-fire |
| Missile | ×1 | 65 | 1.5 s cooldown | Screen shake on hit, exhaust trail |
| Mine | ×3 | 45 | 0.4 s | Drops behind car, arms after 1.2 s, blinks when armed |

Weapons are **picked up from the ground** — each pickup grants the listed ammo count. Ammo depletes with each shot. When ammo reaches 0 the slot reverts to *None*.

**Projectile lifetime:** bullets live 1.2 s, missiles 4 s; both are destroyed on impact with any car or obstacle.

---

## Pickups

Pickups are rendered as bobbing circles with text labels:

| Pickup | Label | Effect |
|--------|-------|--------|
| Machine Gun | MG | Equips MG with 10 rounds |
| Missile | M | Equips Missile |
| Mine | B | Equips Mine (3 charges) |
| Health | + | Heals a fixed HP amount |
| Money | $ | Adds cash to the player wallet |

Only the **player car** collects pickups (enemies ignore them by design in this prototype).

---

## Car health & damage

Each car has a health bar rendered in world space (always above the car, visible through the camera). Color transitions: green → orange → red.

Damage sources:

| Source | Damage formula |
|--------|----------------|
| Bullet hit | 10 HP per bullet |
| Missile hit | 65 HP |
| Mine detonation | 45 HP |
| Collision with another car | `max(0, relativeImpactSpeed × 0.07 − 2)` — light taps deal nothing |
| Collision with obstacle | `max(0, (speed − 60) × 0.04)` — only fast impacts hurt |

A **collision cooldown** (0.25–0.3 s) prevents rapid repeated damage from sustained contact.

When health reaches 0 the car is flagged `isDead`:
- **Player**: rendered grey, stops responding to input; use Debug → **Heal** to respawn
- **Enemy**: stops moving and shooting but remains on-screen as wreckage

---

## Enemy AI

Each `EnemyCar` runs a simple two-step AI loop every frame:

1. **Steer** — compute the shortest-arc angle difference between the car's current heading and the direction toward the player; clamp to `[−1, 1]` and apply as steer input.
2. **Shoot** — fire when the player is within 350 px and the aim angle error is < 0.35 rad (~20°); a random cooldown of 0.6–2.2 s prevents constant fire.

The AI uses the same `_updatePhysics()` path as the player, so it behaves correctly on all surfaces.

---

## HUD (HTMLMenu)

The HUD is an `HTMLMenu` overlay that covers the canvas with `pointer-events: none`, preventing it from blocking mouse input to the game.

| Element | Position | Updates |
|---------|----------|---------|
| Health bar | Top-left | CSS width + background color via `_updateHUD()` each frame |
| Timer | Top-centre | Formatted `m:ss` |
| Money | Top-right | `$` + amount |
| Weapon + ammo | Bottom-left | Weapon name + `×N` count |
| Speed / Surface | Bottom-right | `km/h` + surface name |

---

## Debug panel (HTMLMenu, Tab to toggle)

Also an `HTMLMenu` full-canvas overlay. The visible panel is a child `div` with `pointer-events: auto` so buttons remain clickable even though the parent overlay has `pointer-events: none`.

| Button | Action |
|--------|--------|
| Sports / Muscle / Truck / Buggy | Swap player vehicle; HP ratio is preserved |
| Machine Gun / Missile / Mine | Instantly equip weapon with full ammo |
| Heal | Restore player to full health; clears `isDead` flag (respawn) |
| +$500 | Add $500 to player wallet |
| Spawn Enemy | Spawn a random enemy car at a random world position |

---

## File structure

```
death-rally.html                         Entry point
src/examples/death_rally/
  death_rally.js                         All game logic (~950 lines)
  death_rally.css                        HUD + debug panel styles
  README.md                              This file
```

### Class hierarchy

```
Game
└── DeathRallyGame

GameObject
├── Obstacle         Static wall or barrel; RectangleCollider or CircleCollider
├── Pickup           Bobbing weapon/health/money collectible
├── Projectile       Bullet or missile (straight-line, timed lifetime)
├── Mine             Dropped behind car, armed after 1.2 s
├── Car              Base: arcade physics, health, weapons, collision response
│   ├── PlayerCar    Keyboard input + pickup collection + vehicle swap
│   └── EnemyCar     Chase AI + auto-fire
└── Explosion        Spark particles (no collider; fades out and self-destroys)
```

---

## Renderer pivot convention

`DrawFillRectangle(x, y, w, h, color, rot, pivot)` rotates around **(x, y)** and draws the rectangle offset from there by the pivot:

```
// Rotation path (rot ≠ 0):
ctx.translate(x, y);
ctx.rotate(rot);
ctx.fillRect(-w/2 − pivot.x,  -h/2 − pivot.y,  w, h);
```

| pivot value | rectangle centre in local space | effect |
|-------------|--------------------------------|--------|
| `{0, 0}` (default) | `(0, 0)` = at (x, y) | **centred on (x,y)** ✓ |
| `{-w/2, -h/2}` | `(w/2, h/2)` = offset right+down | top-left of rect at (x,y), rotation around top-left |

All `DrawFillRectangle` calls in this project omit the pivot to use the default `{0,0}`, keeping (x,y) as the true centre.

---



- **No race loop** — this is a free-roaming sandbox. A full Death Rally game would add a track, a lap counter, a finish line, and opposing AI racers on a scripted path.
- **No audio** — `audioAssets` is not populated; sound effects and engine audio are out of scope for this playground.
- **No sprites** — all graphics are geometric primitives. Sprite assets would replace the rectangles/circles.
- **Simple AI** — enemies chase the player directly with no pathfinding, obstacle avoidance, or weapon strategy.
- **No money progression** — money is collected but only logged in the HUD; an upgrade/repair shop screen is not yet implemented.
