# Fuzzy Logic Demo 1 — Arena Bot Weapon Selection

**[▶ Run Live Demo](../../fuzzy-weapon.html)**

This example demonstrates **Mat Buckland's classic Arena Bot Weapon Selection architecture** (*Programming Game AI by Example*, Chapter 10). Instead of brittle `if/else` thresholds that cause an AI bot to jitter between weapons at fixed distance cutoffs, each weapon owns an independent **`FuzzyModule`** that computes a continuous **Desirability score ($0\text{–}100$)** every frame.

---

## Architectural Overview

Each of the 4 weapons (**Shotgun**, **Assault Rifle**, **Rocket Launcher**, **Sniper Railgun**) evaluates two crisp inputs:
1. **`DistToTarget`** ($0\text{–}450\text{ px}$): Partitioned into `Close` (Left Shoulder), `Medium` (Triangle), and `Far` (Right Shoulder).
2. **`AmmoStatus`** ($0\text{–}\text{maxAmmo}$): Partitioned into `Low` (Left Shoulder), `Okay` (Triangle), and `Loads` (Right Shoulder).

And produces one defuzzified crisp output:
3. **`Desirability`** ($0\text{–}100$): Partitioned into `Undesirable`, `Desirable`, and `VeryDesirable`.

### Why Each Weapon Behaves Differently
- **Shotgun**: `VeryDesirable` when `Close`, `Undesirable` when `Far`.
- **Assault Rifle**: Balanced mid-range workhorse; `VeryDesirable` at `Medium` distance with `Loads` of ammo.
- **Rocket Launcher**: `VeryDesirable` at `Medium` range, but **`Undesirable` when `Close`** (to avoid splash self-damage!).
- **Sniper Railgun**: `VeryDesirable` at `Far` range; uses the concentration hedge `new FzVery(far)` so that even with `Low` ammo, extreme distance still yields `Desirable`.

---

## Interactive Controls

| Input | Action |
|---|---|
| **WASD / Arrow Keys** or **Mouse Drag** | Move the Target Dummy around the arena |
| **`[1]` `[2]` `[3]` `[4]`** | Select which weapon's `FuzzyModule` is plotted in the right-hand Inspector |
| **`[Q]` / `[E]`** | Decrease / Increase ammo of the currently inspected weapon |
| **`[R]`** | Reload all 4 weapons to full ammo |
| **`[M]`** | Toggle Defuzzification method between **`MaxAv`** and **`Centroid`** |
| **`[Space]`** | Toggle auto-firing of the bot's active weapon |

