# Fuzzy Logic System (`src/engine/fuzzy.js`)

The `fuzzy.js` module provides a complete, zero-dependency **Mamdani Fuzzy Logic Inference System** tailored for real-time game AI and university game development courses. Its architecture follows the canonical game AI formulation presented by **Mat Buckland** (*Programming Game AI by Example*, Chapter 10) and **Ian Millington & John Funge** (*Artificial Intelligence for Games*).

---

## 1. Why Fuzzy Logic in Video Games?

In game AI, **Finite State Machines (`fsm.js`)** and **Behavior Trees (`bt.js`)** excel at *discrete* decision-making (*"Should the guard Patrol or Chase?"*). However, game worlds are full of *continuous* quantities: distance, health, ammo count, steering angle, speed, and threat level.

When developers rely on crisp boolean `if/else` thresholds for continuous problems, two classic issues arise:

1. **Boundary Jitter & Bang-Bang Oscillation**:
   Suppose a racing AI uses `if (angle < -7) steerLeft(); else if (angle > 7) steerRight();`. When the angle hovers around `7.0°`, the car snaps violently between hard turns every frame. Similarly, an NPC deciding whether to retreat at `hp < 30` will oscillate unnaturally if its health regenerates between `29` and `31`.
2. **Combinatorial Explosion**:
   Combining 3 continuous inputs (e.g., *Distance*, *Ammo*, *Health*) with crisp `if/else` branches quickly balloons into dozens of brittle, deeply nested conditionals.

### How Fuzzy Logic Solves Both
Instead of asking *"Is distance close? (true/false)"*, Fuzzy Logic asks **"To what degree ($\mu \in [0, 1]$) is the distance Close, Medium, or Far?"** Because membership sets overlap, a single distance of `120 px` might be simultaneously `0.35 Close` and `0.65 Medium`. Multiple rules fire in parallel and blend smoothly into a proportional, continuous output.

| AI Paradigm | Module | Best Used For | Output Nature |
|---|---|---|---|
| **Finite State Machine** | `src/engine/fsm.js` | Character states, mode switching, structured state graphs | Discrete active state |
| **Behavior Tree** | `src/engine/bt.js` | Hierarchical task execution, multi-step sequences, boss phases | Active leaf action (`SUCCESS`/`FAILURE`/`RUNNING`) |
| **Fuzzy Logic** | `src/engine/fuzzy.js` | Weapon selection, autonomous steering, threat/utility scoring | Continuous crisp number (e.g., `60.42`, `-18.5°`) |

---

## 2. The 3-Stage Fuzzy Inference Pipeline

Every frame (or decision tick), a `FuzzyModule` transforms crisp game metrics into a crisp control or utility value in three steps:

```text
  Crisp Inputs                 Fuzzy Sets (DOMs)             Clipped Output Sets           Crisp Output
 (e.g. Dist = 200,  ───────►  Dist_Medium = 0.67  ───────►  IF Medium AND Okay   ───────►  MaxAv = 60.42
       Ammo = 8)    1.Fuzzify  Dist_Far    = 0.33  2.Rules   THEN VeryDesirable  3.Defuzz  (or Centroid)
                              Ammo_Low    = 0.20  Inference (DOM = min(0.67,0.80))
                              Ammo_Okay   = 0.80
```

1. **Fuzzification (`fm.Fuzzify(varName, crispValue)`)**: Converts each raw number into **Degrees of Membership (DOM, $\mu \in [0, 1]$)** across the linguistic sets of that variable.
2. **Rule Inference (`FuzzyRule.Calculate()`)**: Evaluates each rule's `IF` antecedent using fuzzy operators (`FzAnd`, `FzOr`, `FzNot`, `FzVery`, `FzFairly`) and accumulates the firing strength into the `THEN` consequent set via Zadeh OR ($\max$).
3. **Defuzzification (`fm.DeFuzzify(varName, method)`)**: Converts the resulting consequent set confidences back into a single crisp number using either **Maximum Average (`MaxAv`)** or **Geometric Centroid (`Centroid`)**.

---

## 3. Script Load Order

Load `src/engine/fuzzy.js` after `src/engine/game.js` and before `src/engine/main.js`:

```html
<script src="src/engine/utils_math.js"></script>
<script src="src/engine/utils_classes.js"></script>
<script src="src/engine/renderer.js"></script>
<script src="src/engine/gameobjects.js"></script>
<script src="src/engine/input.js"></script>
<script src="src/engine/audioplayer.js"></script>
<script src="src/engine/particlesystem.js"></script>
<script src="src/engine/htmlmenu.js"></script>
<script src="src/engine/virtualcontrols.js"></script>
<script src="src/engine/game.js"></script>
<script src="src/engine/fuzzy.js"></script> <!-- Fuzzy Logic module -->
<script src="src/engine/main.js"></script>
```

---

## 4. Class Hierarchy & Membership Functions (`FuzzySet`)

```text
FuzzyTerm
├── FuzzySet
│   ├── FuzzySetTriangle       (min, peak, max)
│   ├── FuzzySetLeftShoulder   (min, peak, max)
│   ├── FuzzySetRightShoulder  (min, peak, max)
│   ├── FuzzySetTrapezoid      (min, leftPeak, rightPeak, max)
│   ├── FuzzySetSingleton      (min, peak, max)
│   └── FuzzySetSCurve         (min, peak, max, rising)
├── FzSet                      (optional wrapper around a FuzzySet)
├── FzAnd                      (min of terms)
├── FzOr                       (max of terms)
├── FzNot                      (1 - term)
├── FzVery                     (term^2 — concentration hedge)
└── FzFairly                   (sqrt(term) — dilation hedge)
```

> **Ergonomic Design Note**: In `spark.js`, `FuzzySet` directly extends `FuzzyTerm`. That means any set returned by `flv.AddTriangularSet(...)` can be passed **directly** into `fm.AddRule(...)`, `new FzAnd(...)`, or `new FzVery(...)` without needing wrapper boilerplate.

### Built-in `FuzzySet` Shapes

```text
Left Shoulder              Triangle                 Trapezoid             Right Shoulder
1.0 ──────┐                   /\                    ┌───────┐                   ┌────── 1.0
          │\                 /  \                  /         \                 /│
0.0 ──────┴─\──          ───/────\───          ───/───────────\───         ───/─┴────── 0.0
   min  peak max           min peak max          min  L     R  max           min peak max
```

| Class / `FuzzyVariable` Helper | Parameters | `representativeValue` | Typical Game Use Case |
|---|---|---|---|
| `FuzzySetLeftShoulder` / `flv.AddLeftShoulderSet` | `(name, min, peak, max)` | `(min + peak) / 2` | Low boundary terms: *Close, LowAmmo, CriticalHP, HardLeft* |
| `FuzzySetTriangle` / `flv.AddTriangularSet` | `(name, min, peak, max)` | `peak` | Intermediate terms: *Medium, Okay, Ahead, Cruise* |
| `FuzzySetRightShoulder` / `flv.AddRightShoulderSet` | `(name, min, peak, max)` | `(peak + max) / 2` | High boundary terms: *Far, LoadsOfAmmo, Healthy, HardRight* |
| `FuzzySetTrapezoid` / `flv.AddTrapezoidSet` | `(name, min, leftPeak, rightPeak, max)` | `(leftPeak + rightPeak) / 2` | Ranges with a wide optimal plateau (e.g., *OptimalRange*) |
| `FuzzySetSingleton` / `flv.AddSingletonSet` | `(name, min, peak, max)` | `peak` | Crisp step/impulse intervals |
| `FuzzySetSCurve` / `flv.AddSCurveSet` | `(name, min, peak, max, rising=true)` | `peak` | Smooth $C^1$ cosine sigmoid transitions |

---

## 5. Fuzzy Linguistic Variables (`FuzzyVariable`)

A **Fuzzy Linguistic Variable (FLV)** groups the sets that partition a numeric domain (such as `DistToTarget` over $[0, 450]$). Create an FLV via `fm.CreateFLV(name)`:

```javascript
const fm = new FuzzyModule();

// Create the "DistToTarget" Linguistic Variable (domain [0, 400] is inferred automatically)
const dist = fm.CreateFLV('DistToTarget');
const targetClose  = dist.AddLeftShoulderSet('Close',  0,  25, 150);
const targetMedium = dist.AddTriangularSet('Medium',  25, 150, 300);
const targetFar    = dist.AddRightShoulderSet('Far', 150, 300, 400);
```

### `FuzzyVariable` Methods

| Method | Description |
|---|---|
| `AddLeftShoulderSet(name, min, peak, max)` | Adds and returns a `FuzzySetLeftShoulder`, expanding `[minRange, maxRange]` |
| `AddTriangularSet(name, min, peak, max)` | Adds and returns a `FuzzySetTriangle` |
| `AddRightShoulderSet(name, min, peak, max)` | Adds and returns a `FuzzySetRightShoulder` |
| `AddTrapezoidSet(name, min, leftPeak, rightPeak, max)` | Adds and returns a `FuzzySetTrapezoid` |
| `AddSingletonSet(name, min, peak, max)` | Adds and returns a `FuzzySetSingleton` |
| `AddSCurveSet(name, min, peak, max, rising)` | Adds and returns a `FuzzySetSCurve` |
| `AddSet(customFuzzySet)` | Registers any custom `FuzzySet` subclass |
| `GetSet(name)` | Looks up a registered `FuzzySet` by name |
| `Fuzzify(crispValue)` | Clamps `crispValue` to `[minRange, maxRange]` and updates `dom` on every set |
| `DeFuzzifyMaxAv()` | Computes the crisp output via Maximum Average |
| `DeFuzzifyCentroid(numSamples = 15)` | Computes the crisp output via Centroid numerical integration |

---

## 6. Operators & Linguistic Hedges

Following Lotfi Zadeh's standard fuzzy logic operators, `fuzzy.js` provides composable `FuzzyTerm` classes that can be nested arbitrarily:

| Class | Mathematical Formula | Description & Example |
|---|---|---|
| `new FzAnd(t1, t2, ...)` | $\min(\mu_1, \mu_2, \dots)$ | Logical **AND** intersection. Accepts any number of terms: `new FzAnd(close, ammoLoads)` |
| `new FzOr(t1, t2, ...)` | $\max(\mu_1, \mu_2, \dots)$ | Logical **OR** union: `new FzOr(hardLeft, dangerRight)` |
| `new FzNot(term)` | $1.0 - \mu$ | Logical **NOT** complement: `new FzNot(targetClose)` |
| `new FzVery(term)` | $\mu^2$ | **Concentration hedge**: narrows a set so only values very close to the peak produce strong activation (e.g., $\mu = 0.5 \rightarrow 0.25$) |
| `new FzFairly(term)` | $\sqrt{\mu}$ | **Dilation hedge**: broadens a set so partial memberships gain higher weight (e.g., $\mu = 0.25 \rightarrow 0.50$) |

```javascript
// Example: Nested operators and hedges in a single rule
fm.AddRule(
    new FzAnd(hpHealthy, new FzVery(threatExtreme), new FzNot(supported)),
    defensivePosture
);
```

---

## 7. Defuzzification Methods: `MaxAv` vs `Centroid`

When `fm.DeFuzzify(varName, method)` is called, the module clears all consequent DOMs, fires every rule in `this.rules`, and converts the resulting output set activations into a single crisp number.

### 1. `FuzzyModule.DefuzzifyMethod.MaxAv` (Default)
**Maximum Average (Mean of Maxima)** weights each output set's `representativeValue` by its active DOM:

$$\text{Output}_{\text{MaxAv}} = \frac{\sum_{i} \left(\text{representativeValue}_i \times \text{DOM}_i\right)}{\sum_{i} \text{DOM}_i}$$

- **Pros**: $O(N)$ in the number of sets (typically 3–5 additions/multiplications); zero loop overhead. Recommended by Mat Buckland for 99% of game AI use cases.

### 2. `FuzzyModule.DefuzzifyMethod.Centroid`
**Center of Mass (Centroid)** samples the Mamdani-clipped composite output polygon at `numSamples` (default `15`) evenly spaced points across `[minRange, maxRange]`:

$$\text{Output}_{\text{Centroid}} = \frac{\sum_{s=1}^{S} x_s \cdot \max_{i} \min\!\big(\text{DOM}_i,\; \mu_i(x_s)\big)}{\sum_{s=1}^{S} \max_{i} \min\!\big(\text{DOM}_i,\; \mu_i(x_s)\big)}$$

- **Pros**: Accounts for the full geometric area and asymmetry of each output set.
- **Classroom Tip**: In all three interactive demos, press **`[M]`** at runtime to toggle between `MaxAv` and `Centroid` and observe how closely `MaxAv` approximates the true geometric `Centroid`!

### Worked Textbook Walkthrough (Buckland Ch. 10)
Consider a **Rocket Launcher** evaluated at `DistToTarget = 200` and `AmmoStatus = 8`:
1. **Fuzzification**:
   - `DistToTarget = 200`: `Close = 0.0`, `Medium = 0.67`, `Far = 0.33`
   - `AmmoStatus = 8`: `Low = 0.20`, `Okay = 0.80`, `Loads = 0.0`
2. **Rule Evaluation**:
   - `IF Medium AND Okay THEN VeryDesirable` $\rightarrow \min(0.67, 0.80) = 0.67$
   - `IF Medium AND Low THEN Desirable` $\rightarrow \min(0.67, 0.20) = 0.20$
   - `IF Far AND Okay THEN Undesirable` $\rightarrow \min(0.33, 0.80) = 0.33$
   - `IF Far AND Low THEN Undesirable` $\rightarrow \min(0.33, 0.20) = 0.20$ (ORed with $0.33 \rightarrow \max(0.33, 0.20) = 0.33$)
3. **Defuzzification (`MaxAv`)**:
   - Representative values: `Undesirable = 12.5`, `Desirable = 50.0`, `VeryDesirable = 87.5`
   - $\text{Desirability} = \frac{(12.5 \times 0.333) + (50.0 \times 0.20) + (87.5 \times 0.667)}{0.333 + 0.20 + 0.667} = \frac{72.5}{1.2} = \mathbf{60.42}$

---

## 8. Live Visual Debugging (`DrawFuzzyInspector`)

Debugging fuzzy rules without visual feedback is difficult. `FuzzyModule` includes three built-in rendering helpers:

### 1. Full Inspector Panel (`DrawFuzzyInspector`)
Renders a complete HUD panel plotting the membership curves of every variable, shaded active Mamdani regions, crisp input/output needles, and a live firing-strength bar chart for every rule:

```javascript
this.fm.DrawFuzzyInspector(renderer, 570, 48, {
    width: 336,
    graphHeight: 72,
    title: 'ROCKET LAUNCHER BRAIN (MaxAv)',
    variables: ['DistToTarget', 'AmmoStatus', 'Desirability'],
    outputs: ['Desirability'], // Draws gold output needle on Desirability
    showRules: true,
    force: true                // Render even when global debugMode is false
});
```

### 2. Single Variable Plot (`DrawVariableGraph`)
Renders a single `FuzzyVariable` membership graph anywhere on screen:

```javascript
this.fm.DrawVariableGraph(renderer, 'DistToTarget', 20, 20, 260, 80, {
    isOutput: false,
    title: 'Distance To Target (px)'
});
```

### 3. Compact Entity Label (`DrawDebug`)
Draws a world-space status label above a `GameObject` when `debugMode` is active:

```javascript
this.fm.DrawDebug(renderer, this.x, this.y - 30, `Aggr: ${this.aggression.toFixed(0)}%`);
```

---

## 9. Interactive Engine Demos

| Demo | Live Link | Source Code | Key Concepts Demonstrated |
|---|---|---|---|
| **1. Bot Weapon Selection** | [fuzzy-weapon.html](../fuzzy-weapon.html ':ignore :target=_blank') | [`src/examples/fuzzy_weapon/`](../src/examples/fuzzy_weapon/fuzzy_weapon.js) | Parallel `FuzzyModule` evaluation across 4 weapons (Shotgun, Rifle, Rocket, Railgun), `FzVery` hedge, `MaxAv` vs `Centroid` |
| **2. Autonomous Steering & Avoidance** | [fuzzy-driver.html](../fuzzy-driver.html ':ignore :target=_blank') | [`src/examples/fuzzy_driver/`](../src/examples/fuzzy_driver/fuzzy_driver.js) | Continuous multi-output control (`Steering` + `Throttle`), obstacle feeler avoidance, side-by-side **Fuzzy vs. Crisp** car comparison |
| **3. Tactical Threat Assessment** | [fuzzy-tactical.html](../fuzzy-tactical.html ':ignore :target=_blank') | [`src/examples/fuzzy_tactical/`](../src/examples/fuzzy_tactical/fuzzy_tactical.js) | 3-input tactical utility scoring (`OwnHealth`, `EnemyThreat`, `AllySupport` $\rightarrow$ `Aggression`), hybrid continuous + discrete posture control |

---

## 10. Combining Fuzzy Logic with FSMs & Behavior Trees

In production game AI, Fuzzy Logic rarely replaces FSMs or Behavior Trees — instead, they **complement** one another:

- **Fuzzy Logic inside a Behavior Tree (`BTAction` / `BTCondition`)**:
  Use a `FuzzyModule` each tick to compute a continuous utility score (like `Aggression` or `CoverQuality`), store it in the `BTBlackboard`, and let your Behavior Tree branches or action nodes use that score to scale movement speed, weapon choice, or tactical posture.
- **Fuzzy Logic with Hysteresis in an FSM**:
  Instead of transitioning on raw noisy sensor values, transition on a defuzzified threat score with hysteresis (e.g., enter `CombatState` when `threatScore > 65`, return to `PatrolState` when `threatScore < 35`).

