# GOAP Demo 3: Multi-Room Dungeon Heist & Deep A* Chaining

**Entry File:** [`goap-dungeon.html`](../../../goap-dungeon.html)  
**Source File:** [`src/examples/goap_dungeon/goap_dungeon.js`](goap_dungeon.js)

## Overview

This demo demonstrates why **Goal-Oriented Action Planning (`GOAPPlanner`)** excels at deep causal dependency chains that would cause a combinatorial explosion in a Finite State Machine (`FSM`) or require brittle, deeply nested Selector/Sequence subtrees in a Behavior Tree (`BehaviorTree`).

A dungeon rogue starts at the entrance with a single goal:
- `HeistGoldenIdol`: `{ escapedWithIdol: true }` (Priority `100`)

To satisfy `{ escapedWithIdol: true }` from the default initial state, `GOAPPlanner.Plan()` automatically discovers an **8-step causal action sequence** via Forward State-Space A\* search:

```text
PickupRustyKey (cost 2)
  -> UnlockArmory (cost 2)
  -> PickupBomb (cost 2)
  -> BlowUpBoulder (cost 2)
  -> GrabVaultKey (cost 2)
  -> DisableLaserTrap (cost 2)
  -> StealGoldenIdol (cost 2)
  -> EscapeDungeon (cost 2)
Total Plan Cost: 16
```

---

## Action Dependency Table

| Action | Cost | Preconditions | Effects | Procedural Precondition |
|--------|------|---------------|---------|-------------------------|
| `PickupRustyKey` | `2` | `{ hasRustyKey: false }` | `{ hasRustyKey: true }` | `dungeon.rustyKeyAvailable` |
| `UnlockArmory` | `2` | `{ hasRustyKey: true, armoryUnlocked: false }` | `{ armoryUnlocked: true }` | — |
| `PickArmoryLock` | `9` | `{ armoryUnlocked: false }` | `{ armoryUnlocked: true }` | — |
| `PickupBomb` | `2` | `{ armoryUnlocked: true, hasBomb: false }` | `{ hasBomb: true }` | — |
| `BlowUpBoulder` | `2` | `{ hasBomb: true, boulderCleared: false }` | `{ boulderCleared: true, hasBomb: false }` | — |
| `GrabVaultKey` | `2` | `{ boulderCleared: true, hasVaultKey: false }` | `{ hasVaultKey: true }` | — |
| `WarpToCryptKey` | `1` | `{ teleporterActive: true, hasVaultKey: false }` | `{ hasVaultKey: true }` | — |
| `DisableLaserTrap` | `2` | `{ trapDisabled: false }` | `{ trapDisabled: true }` | — |
| `StealGoldenIdol` | `2` | `{ hasVaultKey: true, trapDisabled: true, hasIdol: false }` | `{ hasIdol: true }` | — |
| `EscapeDungeon` | `2` | `{ hasIdol: true, escapedWithIdol: false }` | `{ escapedWithIdol: true }` | — |

---

## Interactive Classroom Experiments

1. **Lockpick Fallback (`[1]` Toggle Rusty Key):**
   - By default, `PickupRustyKey (2) + UnlockArmory (2)` costs `4`, which beats `PickArmoryLock (9)`.
   - Press **`[1]`** to remove the Rusty Key from the Guard Room. `PickupRustyKey`'s procedural precondition becomes `false`, and A\* automatically substitutes `PickArmoryLock (cost 9)` without breaking the rest of the 7-step chain!
2. **Mid-Heist Inventory Injection (`[2]` Grant Bomb Directly):**
   - Press **`[2]`** while the rogue is walking toward the Guard Room or Armory. Since `hasBomb` becomes `true`, the planner immediately prunes `PickupRustyKey`, `UnlockArmory`, and `PickupBomb`, jumping straight to `BlowUpBoulder`!
3. **Dynamic Trap Re-Arming (`[3]` Re-Arm Laser Grid):**
   - After the rogue disables the laser console, press **`[3]`** to re-arm the lasers before the rogue reaches the vault. `StealGoldenIdol` returns `GOAPStatus.FAILURE`, triggering an instant replan back to `DisableLaserTrap`.
4. **Arcane Teleporter Shortcut (`[4]` Toggle Teleporter Shortcut):**
   - Press **`[4]`** to power on the Arcane Teleporter (`teleporterActive: true`). Because `WarpToCryptKey (cost 1)` satisfies `{ hasVaultKey: true }` directly for cost `1` instead of the 5-step chain (`PickupRustyKey -> UnlockArmory -> PickupBomb -> BlowUpBoulder -> GrabVaultKey`, cost `10`), A\* immediately routes through the teleporter!

