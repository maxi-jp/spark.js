# GOAP Demo 1 — Autonomous Survival Crafter & Economy

An interactive demonstration of **Goal-Oriented Action Planning (`src/engine/goap.js`)** inspired by Jeff Orkin's classic *Lumberjack / Blacksmith* problem and survival crafting games like *Don't Starve*.

**Live Demo:** [goap-survival.html](../../../goap-survival.html)

---

## 🎯 Pedagogical Objectives

1. **Declarative Goals vs. Imperative Transitions**:
   Unlike a Finite State Machine (where transitions between states are hard-wired) or a Behavior Tree (where fallback branches are explicitly ordered by the designer), the `SurvivorAgent` is only given **3 Goals** and a flat pool of **10 atomic `GOAPAction`s**. The `GOAPPlanner` uses **Forward State-Space A\* Search** to automatically synthesize multi-step action sequences at runtime.
2. **Cost-Driven Emergent Routing**:
   There are multiple valid ways to obtain firewood and satisfy hunger (`isHungry: false`):
   - **If the campfire is already lit**: `HuntRawMeat (2) → CookAndEatSteak (1)` (**Total Cost = 3.0**)
   - **If a spare axe is on the Tool Rack**: `GrabSpareAxe (1) → ChopTreeWithAxe (2) → LightCampfire (1) → HuntRawMeat (2) → CookAndEatSteak (1)` (**Total Cost = 7.0**)
   - **If no spare axe is on the rack, but Wild Berries are in season**: `ForageWildBerries (9.5)` is cheaper than mining iron + forging an axe + chopping + lighting + hunting + cooking (`2 + 2 + 2 + 1 + 2 + 1 = 10.0`)!
   - **If Wild Berries are depleted AND the Tool Rack is empty**: The planner automatically discovers the 6-step metallurgy chain: `MineIronOre (2) → ForgeIronAxe (2) → ChopTreeWithAxe (2) → LightCampfire (1) → HuntRawMeat (2) → CookAndEatSteak (1)` (**Total Cost = 10.0**), beating `SnapBranchesByHand (8) + Light + Hunt + Cook` (**Cost = 12.0**)!
3. **Dynamic Goal Preemption**:
   Triggering a **Rainstorm (`[2]`)** extinguishes the campfire and chills the survivor (`isCold = true`), elevating `StayWarm` to priority `92` and immediately preempting `StayFed` (`78`) or `BuildCabin` (`40`).

---

## 🎮 Controls & Sandbox Interactions

| Key / Button | Effect on World State & Planner |
|---|---|
| **`[1]` Break Axe** | Destroys the survivor's held axe (`hasAxe = false`) mid-plan, forcing an immediate A\* replan. |
| **`[2]` Rainstorm (Chill)** | Extinguishes `campfireLit = false` and drops Warmth to `20%`, triggering `StayWarm` preemption. |
| **`[3]` Make Hungry** | Drops Fullness to `18%`, activating `StayFed` (`isHungry = true`). |
| **`[4]` Toggle Rack Axe** | Toggles whether a free axe (`cost: 1`) is available at the Tool Rack (`checkProcedural`). |
| **`[5]` Toggle Berries** | Toggles whether the Berry Thicket (`cost: 9.5`) is in season (`checkProcedural`). |
| **`[R]` Reset** | Resets the camp and agent to initial conditions. |

