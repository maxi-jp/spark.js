# GOAP Demo 2: F.E.A.R.-Style Tactical Combat AI

**Entry File:** [`goap-combat.html`](../../../goap-combat.html)  
**Source File:** [`src/examples/goap_combat/goap_combat.js`](goap_combat.js)

## Overview

Inspired by Jeff Orkin's landmark GDC 2006 paper *"Three States and a Plan: The AI of F.E.A.R."*, this demo showcases how a **Goal-Oriented Action Planning (`GOAPAgent`)** soldier coordinates cover, weapon logistics, flanking maneuvers, frag grenades, and emergency trauma healing without a single hardcoded transition graph.

Instead of wiring dozens of FSM transitions (`ReloadInCover -> ThrowGrenade -> Shoot -> RetreatToMedkit`), each tactical behavior is declared as an independent `GOAPAction` with symbolic **preconditions**, **effects**, and a **cost**.

---

## Competing Goals

| Goal | Desired State | Dynamic Priority |
|------|---------------|------------------|
| `Survive` | `{ lowHealth: false, inCover: true }` | `100` when `lowHealth === true` (`hp <= 40`), else `0` |
| `EliminateTarget` | `{ targetDead: true }` | `80` when `targetDead === false`, else `0` |
| `PatrolArena` | `{ patrolled: true }` | `20` (baseline fallback when target is neutralized) |

---

## Decoupled Tactical Action Matrix

| Action | Cost | Preconditions | Effects | Procedural Precondition |
|--------|------|---------------|---------|-------------------------|
| `ShootTarget` | `2` | `{ targetVisible: true, weaponLoaded: true, targetInCover: false }` | `{ targetDead: true }` | — |
| `FlushWithGrenade` | `2` | `{ targetInCover: true, hasGrenade: true }` | `{ targetInCover: false, targetVisible: true }` | `soldier.grenades > 0` |
| `FlankTarget` | `5` | `{ targetInCover: true }` | `{ targetInCover: false, targetVisible: true }` | — |
| `TakeCover` | `2` | `{}` | `{ inCover: true }` | — |
| `ReloadWeapon` | `2` | `{ hasAmmo: true, weaponLoaded: false }` | `{ weaponLoaded: true }` | `soldier.reserveAmmo > 0` |
| `PickupAmmo` | `4` | `{ hasAmmo: false }` | `{ hasAmmo: true }` | `scene.ammoCratesAvailable === true` |
| `MeleeCharge` | `9` | `{ targetVisible: true }` | `{ targetDead: true }` | — |
| `HealWithMedkit` | `2` | `{ lowHealth: true }` | `{ lowHealth: false }` | — |
| `ReconScan` | `3` | `{ targetVisible: false }` | `{ targetVisible: true }` | — |
| `PatrolSweep` | `2` | `{}` | `{ patrolled: true }` | — |

---

## Interactive Classroom Experiments

Use the keyboard shortcuts or click the bottom HUD buttons to perturb the combat state in real time:

1. **Grenade Flush vs. Wide Flank (`[4]` & `[5]`):**
   - When the target is in cover (`targetInCover: true`) and the soldier has grenades (`grenades > 0`), A\* selects `FlushWithGrenade (cost 2) -> ShootTarget (cost 2)` (total cost `4`).
   - Press **`[5]` Toggle Grenades** to set grenades to `0`. The planner immediately switches to `FlankTarget (cost 5) -> ShootTarget (cost 2)` (total cost `7`)!
2. **Multi-Step Ammo Logistics (`[2]` & `[3]`):**
   - Press **`[2]` Empty Clip**: The planner prepends `ReloadWeapon -> ShootTarget`.
   - Press **`[3]` Empty All Ammo**: The planner synthesizes a 3-step chain: `PickupAmmo -> ReloadWeapon -> ShootTarget`.
3. **Desperate Melee Charge Fallback (`[6]` + `[3]`):**
   - Press **`[6]` Toggle Ammo Crate** to disable the ammo crate, then press **`[3]` Empty All Ammo**. Because `PickupAmmo`'s procedural precondition returns `false`, A\* automatically falls back to `MeleeCharge (cost 9)`!
4. **Survival Preemption (`[1]`):**
   - Press **`[1]` Hurt Soldier (-65 HP)** mid-firefight. `lowHealth` becomes `true`, raising `Survive` to priority `100` and preempting combat with `HealWithMedkit -> TakeCover`.

