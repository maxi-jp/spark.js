// ============================================================
// Fuzzy Logic — Linguistic Variables, Membership Sets & Rule Inference
// Provides FuzzySet subclasses, FuzzyVariable (FLV), FuzzyTerm
// operators & hedges (FzAnd, FzOr, FzNot, FzVery, FzFairly),
// FuzzyRule, and FuzzyModule with MaxAv & Centroid defuzzification
// plus live canvas visualizers (DrawVariableGraph, DrawFuzzyInspector).
//
// Follows Mat Buckland ("Programming Game AI by Example", Ch. 10)
// and Millington & Funge ("Artificial Intelligence for Games").
// Requires: renderer.js, utils_math.js (Color), main.js (debugMode)
// ============================================================

// #region FuzzyTerm & Base FuzzySet

/**
 * Abstract base interface for any element that can participate in a FuzzyRule
 * (FuzzySets, composite operators FzAnd/FzOr/FzNot, and hedges FzVery/FzFairly).
 */
class FuzzyTerm {
    /**
     * Retrieves the current Degree of Membership (DOM) in [0, 1].
     * @returns {number}
     */
    GetDOM() {
        return 0;
    }

    /**
     * Clears the Degree of Membership to 0.
     */
    ClearDOM() {}

    /**
     * Combines an incoming rule firing strength with the consequent's current DOM
     * using the standard Zadeh OR (maximum) accumulation.
     * @param {number} val
     */
    ORwithDOM(val) {}

    /**
     * Human-readable expression label for debugging and rule inspection.
     * @returns {string}
     */
    GetLabel() {
        return 'Term';
    }
}

/**
 * Base class for all Fuzzy Sets (Membership Functions).
 * A FuzzySet maps a crisp number to a Degree of Membership (DOM) in [0, 1].
 *
 * FuzzySet directly implements FuzzyTerm so sets can be passed directly into
 * FuzzyRule, FzAnd, FzOr, FzNot, FzVery, and FzFairly without boilerplate wrappers.
 */
class FuzzySet extends FuzzyTerm {
    /**
     * @param {string} name                 Linguistic label (e.g. 'Close', 'LowAmmo').
     * @param {number} representativeValue  Peak/center value used by MaxAv defuzzification.
     * @param {number} minBound             Left domain bound of this set.
     * @param {number} maxBound             Right domain bound of this set.
     */
    constructor(name, representativeValue, minBound = 0, maxBound = 1) {
        super();
        this.name = name || this.constructor.name;
        this.representativeValue = representativeValue;
        this.minBound = minBound;
        this.maxBound = maxBound;
        /** @type {number} Current Degree of Membership in [0, 1]. */
        this.dom = 0;
    }

    /**
     * Pure function: returns the Degree of Membership for `val` in [0, 1]
     * without mutating `this.dom`. Override in subclasses.
     * @param {number} val  Crisp input value.
     * @returns {number}    Membership degree in [0, 1].
     */
    CalculateDOM(val) {
        return 0;
    }

    /**
     * Sets the current Degree of Membership (clamped to [0, 1]).
     * @param {number} val
     */
    SetDOM(val) {
        this.dom = Math.max(0, Math.min(1, val));
    }

    /** @override */
    GetDOM() {
        return this.dom;
    }

    /** @override */
    ClearDOM() {
        this.dom = 0;
    }

    /**
     * Standard Zadeh accumulation: takes the maximum of the existing DOM and `val`.
     * @override
     * @param {number} val
     */
    ORwithDOM(val) {
        if (val > this.dom) {
            this.dom = Math.min(1, val);
        }
    }

    /** @override */
    GetLabel() {
        return this.name;
    }
}

// #endregion

// #region Concrete FuzzySet Shapes

/**
 * Triangular membership function defined by (minBound, peak, maxBound).
 * DOM rises linearly from 0 at minBound to 1 at peak, then falls to 0 at maxBound.
 */
class FuzzySetTriangle extends FuzzySet {
    /**
     * @param {string} name
     * @param {number} minBound  Left foot where DOM = 0.
     * @param {number} peak      Apex where DOM = 1.
     * @param {number} maxBound  Right foot where DOM = 0.
     */
    constructor(name, minBound, peak, maxBound) {
        super(name, peak, minBound, maxBound);
        this.peakPoint = peak;
        this.leftOffset = peak - minBound;
        this.rightOffset = maxBound - peak;
    }

    /** @override */
    CalculateDOM(val) {
        // Handle degenerate zero-offset edges cleanly
        if ((this.rightOffset === 0 && this.peakPoint === val) ||
            (this.leftOffset === 0 && this.peakPoint === val)) {
            return 1.0;
        }

        // Left slope: rising from minBound to peakPoint
        if (val <= this.peakPoint && val >= this.minBound) {
            if (this.leftOffset === 0) return 1.0;
            const grad = 1.0 / this.leftOffset;
            return grad * (val - this.minBound);
        }
        // Right slope: falling from peakPoint to maxBound
        else if (val > this.peakPoint && val <= this.maxBound) {
            if (this.rightOffset === 0) return 0.0;
            const grad = -1.0 / this.rightOffset;
            return grad * (val - this.peakPoint) + 1.0;
        }
        // Outside support
        return 0.0;
    }
}

/**
 * Left-shoulder membership function defined by (minBound, peak, maxBound).
 * Saturates at DOM = 1.0 from minBound to peak, then falls linearly to 0.0 at maxBound.
 * Ideal for low-end linguistic terms like "Near", "Low", "Critical".
 */
class FuzzySetLeftShoulder extends FuzzySet {
    /**
     * @param {string} name
     * @param {number} minBound  Left domain boundary (DOM = 1).
     * @param {number} peak      Shoulder knee where plateau ends (DOM = 1).
     * @param {number} maxBound  Right foot where DOM reaches 0.
     */
    constructor(name, minBound, peak, maxBound) {
        // Representative value is the midpoint of the flat plateau [minBound, peak]
        super(name, (minBound + peak) / 2, minBound, maxBound);
        this.peakPoint = peak;
        this.leftOffset = peak - minBound;
        this.rightOffset = maxBound - peak;
    }

    /** @override */
    CalculateDOM(val) {
        if (this.rightOffset === 0 && this.peakPoint === val) {
            return 1.0;
        }
        // Flat plateau on the left of peakPoint (within domain)
        if (val >= this.minBound && val <= this.peakPoint) {
            return 1.0;
        }
        // Right slope falling from peakPoint to maxBound
        if (val > this.peakPoint && val < this.maxBound) {
            const grad = -1.0 / this.rightOffset;
            return grad * (val - this.peakPoint) + 1.0;
        }
        return 0.0;
    }
}

/**
 * Right-shoulder membership function defined by (minBound, peak, maxBound).
 * Rises linearly from 0.0 at minBound to 1.0 at peak, then saturates at 1.0 up to maxBound.
 * Ideal for high-end linguistic terms like "Far", "High", "Plenty".
 */
class FuzzySetRightShoulder extends FuzzySet {
    /**
     * @param {string} name
     * @param {number} minBound  Left foot where DOM starts rising from 0.
     * @param {number} peak      Shoulder knee where plateau begins (DOM = 1).
     * @param {number} maxBound  Right domain boundary (DOM = 1).
     */
    constructor(name, minBound, peak, maxBound) {
        // Representative value is the midpoint of the flat plateau [peak, maxBound]
        super(name, (peak + maxBound) / 2, minBound, maxBound);
        this.peakPoint = peak;
        this.leftOffset = peak - minBound;
        this.rightOffset = maxBound - peak;
    }

    /** @override */
    CalculateDOM(val) {
        if (this.leftOffset === 0 && this.peakPoint === val) {
            return 1.0;
        }
        // Left slope rising from minBound to peakPoint
        if (val > this.minBound && val <= this.peakPoint) {
            const grad = 1.0 / this.leftOffset;
            return grad * (val - this.minBound);
        }
        // Flat plateau on the right of peakPoint (within domain)
        if (val > this.peakPoint && val <= this.maxBound) {
            return 1.0;
        }
        return 0.0;
    }
}

/**
 * Trapezoidal membership function defined by (minBound, leftPeak, rightPeak, maxBound).
 * Rises from minBound to leftPeak, stays flat at 1.0 until rightPeak, then falls to maxBound.
 */
class FuzzySetTrapezoid extends FuzzySet {
    /**
     * @param {string} name
     * @param {number} minBound   Left foot (DOM = 0).
     * @param {number} leftPeak   Start of flat top (DOM = 1).
     * @param {number} rightPeak  End of flat top (DOM = 1).
     * @param {number} maxBound   Right foot (DOM = 0).
     */
    constructor(name, minBound, leftPeak, rightPeak, maxBound) {
        super(name, (leftPeak + rightPeak) / 2, minBound, maxBound);
        this.leftPeak = leftPeak;
        this.rightPeak = rightPeak;
        this.leftOffset = leftPeak - minBound;
        this.rightOffset = maxBound - rightPeak;
    }

    /** @override */
    CalculateDOM(val) {
        if (val < this.minBound || val > this.maxBound) {
            return 0.0;
        }
        if (val >= this.leftPeak && val <= this.rightPeak) {
            return 1.0;
        }
        if (val < this.leftPeak) {
            if (this.leftOffset === 0) return 1.0;
            return (val - this.minBound) / this.leftOffset;
        }
        if (val > this.rightPeak) {
            if (this.rightOffset === 0) return 1.0;
            return 1.0 - (val - this.rightPeak) / this.rightOffset;
        }
        return 0.0;
    }
}

/**
 * Singleton (crisp step/impulse) membership function.
 * Returns 1.0 within [minBound, maxBound], and 0.0 elsewhere.
 */
class FuzzySetSingleton extends FuzzySet {
    /**
     * @param {string} name
     * @param {number} minBound
     * @param {number} peak
     * @param {number} maxBound
     */
    constructor(name, minBound, peak, maxBound) {
        super(name, peak, minBound, maxBound);
        this.peakPoint = peak;
    }

    /** @override */
    CalculateDOM(val) {
        if (val >= this.minBound && val <= this.maxBound) {
            return 1.0;
        }
        return 0.0;
    }
}

/**
 * Smooth S-Curve (cosine sigmoid) membership function.
 * Useful when smooth C1 continuity is desired instead of piecewise linear corners.
 */
class FuzzySetSCurve extends FuzzySet {
    /**
     * @param {string}  name
     * @param {number}  minBound  Start of transition.
     * @param {number}  peak      Center / representative value.
     * @param {number}  maxBound  End of transition.
     * @param {boolean} [rising=true]  If true, rises 0 -> 1; if false, falls 1 -> 0 (Z-curve).
     */
    constructor(name, minBound, peak, maxBound, rising = true) {
        super(name, peak, minBound, maxBound);
        this.rising = rising;
    }

    /** @override */
    CalculateDOM(val) {
        if (val <= this.minBound) return this.rising ? 0.0 : 1.0;
        if (val >= this.maxBound) return this.rising ? 1.0 : 0.0;
        const span = this.maxBound - this.minBound;
        if (span <= 0) return 1.0;
        const t = (val - this.minBound) / span;
        const s = 0.5 * (1 - Math.cos(Math.PI * t));
        return this.rising ? s : 1.0 - s;
    }
}

// #endregion

// #region Fuzzy Operators & Linguistic Hedges

/**
 * Optional proxy wrapper around a FuzzySet (provided for strict Buckland API compatibility).
 * Note: FuzzySet already extends FuzzyTerm, so sets can be used directly without FzSet.
 */
class FzSet extends FuzzyTerm {
    /** @param {FuzzySet} fuzzySet */
    constructor(fuzzySet) {
        super();
        this.set = fuzzySet;
    }
    GetDOM() { return this.set.GetDOM(); }
    ClearDOM() { this.set.ClearDOM(); }
    ORwithDOM(val) { this.set.ORwithDOM(val); }
    GetLabel() { return this.set.GetLabel(); }
}

/**
 * Zadeh AND operator: returns the minimum DOM of its child terms.
 * Accepts multiple arguments `new FzAnd(t1, t2, ...)` or an array.
 */
class FzAnd extends FuzzyTerm {
    /** @param {...FuzzyTerm} terms */
    constructor(...terms) {
        super();
        this.terms = Array.isArray(terms[0]) ? terms[0] : terms;
    }

    /** @override */
    GetDOM() {
        if (this.terms.length === 0) return 0;
        let smallest = Infinity;
        for (let i = 0; i < this.terms.length; i++) {
            const dom = this.terms[i].GetDOM();
            if (dom < smallest) smallest = dom;
        }
        return smallest === Infinity ? 0 : smallest;
    }

    /** @override */
    ClearDOM() {
        for (let i = 0; i < this.terms.length; i++) {
            this.terms[i].ClearDOM();
        }
    }

    /** @override */
    ORwithDOM(val) {
        for (let i = 0; i < this.terms.length; i++) {
            this.terms[i].ORwithDOM(val);
        }
    }

    /** @override */
    GetLabel() {
        return '(' + this.terms.map(t => t.GetLabel()).join(' AND ') + ')';
    }
}

/**
 * Zadeh OR operator: returns the maximum DOM of its child terms.
 * Accepts multiple arguments `new FzOr(t1, t2, ...)` or an array.
 */
class FzOr extends FuzzyTerm {
    /** @param {...FuzzyTerm} terms */
    constructor(...terms) {
        super();
        this.terms = Array.isArray(terms[0]) ? terms[0] : terms;
    }

    /** @override */
    GetDOM() {
        if (this.terms.length === 0) return 0;
        let largest = -Infinity;
        for (let i = 0; i < this.terms.length; i++) {
            const dom = this.terms[i].GetDOM();
            if (dom > largest) largest = dom;
        }
        return largest === -Infinity ? 0 : largest;
    }

    /** @override */
    ClearDOM() {
        for (let i = 0; i < this.terms.length; i++) {
            this.terms[i].ClearDOM();
        }
    }

    /** @override */
    ORwithDOM(val) {
        for (let i = 0; i < this.terms.length; i++) {
            this.terms[i].ORwithDOM(val);
        }
    }

    /** @override */
    GetLabel() {
        return '(' + this.terms.map(t => t.GetLabel()).join(' OR ') + ')';
    }
}

/**
 * Zadeh NOT (complement) operator: returns `1.0 - term.GetDOM()`.
 */
class FzNot extends FuzzyTerm {
    /** @param {FuzzyTerm} term */
    constructor(term) {
        super();
        this.term = term;
    }

    /** @override */
    GetDOM() {
        return 1.0 - this.term.GetDOM();
    }

    /** @override */
    ClearDOM() {
        this.term.ClearDOM();
    }

    /** @override */
    ORwithDOM(val) {
        this.term.ORwithDOM(val);
    }

    /** @override */
    GetLabel() {
        return 'NOT ' + this.term.GetLabel();
    }
}

/**
 * Linguistic Hedge "VERY" (concentration): squares the term's membership (`DOM^2`).
 * Narrows/sharpens a fuzzy set so only values close to the peak retain high membership.
 */
class FzVery extends FuzzyTerm {
    /** @param {FuzzyTerm} term */
    constructor(term) {
        super();
        this.term = term;
    }

    /** @override */
    GetDOM() {
        const d = this.term.GetDOM();
        return d * d;
    }

    /** @override */
    ClearDOM() {
        this.term.ClearDOM();
    }

    /** @override */
    ORwithDOM(val) {
        this.term.ORwithDOM(val * val);
    }

    /** @override */
    GetLabel() {
        return 'VERY(' + this.term.GetLabel() + ')';
    }
}

/**
 * Linguistic Hedge "FAIRLY" / "SOMEWHAT" (dilation): takes the square root (`sqrt(DOM)`).
 * Broadens a fuzzy set so partial memberships receive higher weight.
 */
class FzFairly extends FuzzyTerm {
    /** @param {FuzzyTerm} term */
    constructor(term) {
        super();
        this.term = term;
    }

    /** @override */
    GetDOM() {
        return Math.sqrt(Math.max(0, this.term.GetDOM()));
    }

    /** @override */
    ClearDOM() {
        this.term.ClearDOM();
    }

    /** @override */
    ORwithDOM(val) {
        this.term.ORwithDOM(Math.sqrt(Math.max(0, val)));
    }

    /** @override */
    GetLabel() {
        return 'FAIRLY(' + this.term.GetLabel() + ')';
    }
}

// #endregion

// #region FuzzyVariable (FLV)

/**
 * A Fuzzy Linguistic Variable (FLV), such as "DistanceToTarget", "AmmoStatus", or "Desirability".
 * Comprises multiple named FuzzySets that partition a continuous numeric range [minRange, maxRange].
 */
class FuzzyVariable {
    /**
     * @param {string} name  Name of the linguistic variable.
     */
    constructor(name) {
        this.name = name;
        /** @type {Object<string, FuzzySet>} Map of set name -> FuzzySet */
        this.sets = {};
        /** @type {FuzzySet[]} Ordered list of sets for iteration and visualization */
        this.setList = [];
        this.minRange = Infinity;
        this.maxRange = -Infinity;
        /** @type {number|null} Last crisp input passed to Fuzzify() */
        this.lastCrispInput = null;
        /** @type {number|null} Last crisp output computed by DeFuzzify*() */
        this.lastCrispOutput = null;
    }

    /**
     * Expands `[minRange, maxRange]` to encompass `[minBound, maxBound]`.
     * @private
     */
    _AdjustRangeToFit(minBound, maxBound) {
        if (minBound < this.minRange) this.minRange = minBound;
        if (maxBound > this.maxRange) this.maxRange = maxBound;
    }

    /**
     * Registers a custom FuzzySet instance in this variable.
     * @param {FuzzySet} fuzzySet
     * @returns {FuzzySet} The added set (usable directly in rules).
     */
    AddSet(fuzzySet) {
        this.sets[fuzzySet.name] = fuzzySet;
        this.setList.push(fuzzySet);
        this._AdjustRangeToFit(fuzzySet.minBound, fuzzySet.maxBound);
        return fuzzySet;
    }

    /**
     * Adds a triangular fuzzy set to this variable.
     * @param {string} name
     * @param {number} minBound
     * @param {number} peak
     * @param {number} maxBound
     * @returns {FuzzySetTriangle}
     */
    AddTriangularSet(name, minBound, peak, maxBound) {
        return this.AddSet(new FuzzySetTriangle(name, minBound, peak, maxBound));
    }

    /**
     * Adds a left-shoulder fuzzy set to this variable.
     * @param {string} name
     * @param {number} minBound
     * @param {number} peak
     * @param {number} maxBound
     * @returns {FuzzySetLeftShoulder}
     */
    AddLeftShoulderSet(name, minBound, peak, maxBound) {
        return this.AddSet(new FuzzySetLeftShoulder(name, minBound, peak, maxBound));
    }

    /**
     * Adds a right-shoulder fuzzy set to this variable.
     * @param {string} name
     * @param {number} minBound
     * @param {number} peak
     * @param {number} maxBound
     * @returns {FuzzySetRightShoulder}
     */
    AddRightShoulderSet(name, minBound, peak, maxBound) {
        return this.AddSet(new FuzzySetRightShoulder(name, minBound, peak, maxBound));
    }

    /**
     * Adds a trapezoidal fuzzy set to this variable.
     * @param {string} name
     * @param {number} minBound
     * @param {number} leftPeak
     * @param {number} rightPeak
     * @param {number} maxBound
     * @returns {FuzzySetTrapezoid}
     */
    AddTrapezoidSet(name, minBound, leftPeak, rightPeak, maxBound) {
        return this.AddSet(new FuzzySetTrapezoid(name, minBound, leftPeak, rightPeak, maxBound));
    }

    /**
     * Adds a singleton fuzzy set to this variable.
     * @param {string} name
     * @param {number} minBound
     * @param {number} peak
     * @param {number} maxBound
     * @returns {FuzzySetSingleton}
     */
    AddSingletonSet(name, minBound, peak, maxBound) {
        return this.AddSet(new FuzzySetSingleton(name, minBound, peak, maxBound));
    }

    /**
     * Adds a smooth S-curve fuzzy set to this variable.
     * @param {string}  name
     * @param {number}  minBound
     * @param {number}  peak
     * @param {number}  maxBound
     * @param {boolean} [rising=true]
     * @returns {FuzzySetSCurve}
     */
    AddSCurveSet(name, minBound, peak, maxBound, rising = true) {
        return this.AddSet(new FuzzySetSCurve(name, minBound, peak, maxBound, rising));
    }

    /**
     * Retrieves a member FuzzySet by name.
     * @param {string} name
     * @returns {FuzzySet|undefined}
     */
    GetSet(name) {
        return this.sets[name];
    }

    /**
     * Fuzzifies a crisp value by calculating and storing the DOM of each set in this variable.
     * Input is automatically clamped to `[minRange, maxRange]`.
     * @param {number} val  Crisp input value.
     */
    Fuzzify(val) {
        if (this.setList.length === 0) return;
        const clamped = Math.max(this.minRange, Math.min(this.maxRange, val));
        this.lastCrispInput = clamped;
        for (let i = 0; i < this.setList.length; i++) {
            const set = this.setList[i];
            set.SetDOM(set.CalculateDOM(clamped));
        }
    }

    /**
     * Defuzzifies the variable using the Maximum Average (Mean of Maxima) method:
     * `Output = Sum(representativeValue * DOM) / Sum(DOM)`.
     * Fast O(N) method recommended by Mat Buckland for real-time game AI.
     * @returns {number} Crisp output value.
     */
    DeFuzzifyMaxAv() {
        let bottom = 0.0;
        let top = 0.0;

        for (let i = 0; i < this.setList.length; i++) {
            const set = this.setList[i];
            const dom = set.GetDOM();
            bottom += dom;
            top += set.representativeValue * dom;
        }

        if (bottom === 0) {
            this.lastCrispOutput = 0.0;
            return 0.0;
        }

        const result = top / bottom;
        this.lastCrispOutput = result;
        return result;
    }

    /**
     * Defuzzifies the variable by sampling the geometric Centroid (Center of Mass)
     * of the Mamdani-clipped output manifold across `numSamples` slices.
     * @param {number} [numSamples=15]  Number of discrete integration steps across the domain.
     * @returns {number} Crisp output value.
     */
    DeFuzzifyCentroid(numSamples = 15) {
        if (this.setList.length === 0 || numSamples <= 0) {
            this.lastCrispOutput = 0.0;
            return 0.0;
        }

        const stepSize = (this.maxRange - this.minRange) / numSamples;
        let totalArea = 0.0;
        let sumOfMoments = 0.0;

        for (let samp = 1; samp <= numSamples; samp++) {
            const position = this.minRange + samp * stepSize - stepSize * 0.5;
            // Under Mamdani implication, the composite curve height at `position`
            // is the maximum across all sets of min(set.GetDOM(), set.CalculateDOM(position)).
            let maxContribution = 0.0;
            for (let i = 0; i < this.setList.length; i++) {
                const set = this.setList[i];
                const clipped = Math.min(set.GetDOM(), set.CalculateDOM(position));
                if (clipped > maxContribution) {
                    maxContribution = clipped;
                }
            }
            totalArea += maxContribution;
            sumOfMoments += position * maxContribution;
        }

        if (totalArea === 0) {
            this.lastCrispOutput = 0.0;
            return 0.0;
        }

        const result = sumOfMoments / totalArea;
        this.lastCrispOutput = result;
        return result;
    }
}

// #endregion

// #region FuzzyRule & FuzzyModule

/**
 * Represents a single IF <antecedent> THEN <consequent> fuzzy production rule.
 */
class FuzzyRule {
    /**
     * @param {FuzzyTerm} antecedent  Condition expression (FuzzySet, FzAnd, FzOr, FzNot, FzVery, etc.).
     * @param {FuzzyTerm} consequent  Output FuzzySet or term to activate when antecedent fires.
     * @param {string}    [label]     Optional custom label for the debug inspector.
     */
    constructor(antecedent, consequent, label = '') {
        this.antecedent = antecedent;
        this.consequent = consequent;
        this.label = label || `IF ${antecedent.GetLabel()} THEN ${consequent.GetLabel()}`;
        /** @type {number} Firing strength [0, 1] from the most recent evaluation. */
        this.lastFiringStrength = 0;
    }

    /**
     * Resets the consequent's DOM prior to rule evaluation.
     */
    SetConfidenceOfConsequentToZero() {
        this.consequent.ClearDOM();
    }

    /**
     * Evaluates the antecedent and accumulates its firing strength into the consequent via OR.
     */
    Calculate() {
        const strength = this.antecedent.GetDOM();
        this.lastFiringStrength = strength;
        this.consequent.ORwithDOM(strength);
    }
}

/**
 * Central Fuzzy Logic controller.
 * Manages Linguistic Variables (FLVs), Fuzzy Rules, Fuzzification, Inference,
 * Defuzzification (MaxAv and Centroid), and real-time canvas visualization.
 *
 * @example
 * const fm = new FuzzyModule();
 * const dist = fm.CreateFLV('Distance');
 * const close = dist.AddLeftShoulderSet('Close', 0, 50, 150);
 * const far   = dist.AddRightShoulderSet('Far', 50, 150, 400);
 *
 * const desirability = fm.CreateFLV('Desirability');
 * const low  = desirability.AddLeftShoulderSet('Undesirable', 0, 25, 50);
 * const high = desirability.AddRightShoulderSet('Desirable', 25, 75, 100);
 *
 * fm.AddRule(close, high);
 * fm.AddRule(far, low);
 *
 * fm.Fuzzify('Distance', 80);
 * const score = fm.DeFuzzify('Desirability');
 */
class FuzzyModule {
    static DefuzzifyMethod = Object.freeze({
        MaxAv: 'MaxAv',
        Centroid: 'Centroid'
    });

    /** Default palette for plotting up to 6 sets per FuzzyVariable. */
    static _SET_COLORS = null;

    static _GetSetColors() {
        if (!FuzzyModule._SET_COLORS && typeof Color !== 'undefined') {
            FuzzyModule._SET_COLORS = [
                new Color(0.22, 0.78, 0.98, 1.0), // cyan-blue
                new Color(0.25, 0.92, 0.48, 1.0), // emerald green
                new Color(1.00, 0.76, 0.18, 1.0), // amber gold
                new Color(0.98, 0.34, 0.42, 1.0), // coral red
                new Color(0.75, 0.45, 0.98, 1.0), // violet
                new Color(0.98, 0.55, 0.22, 1.0)  // orange
            ];
        }
        return FuzzyModule._SET_COLORS;
    }

    constructor() {
        /** @type {Object<string, FuzzyVariable>} */
        this.variables = {};
        /** @type {FuzzyRule[]} */
        this.rules = [];
    }

    /**
     * Creates, registers, and returns a new empty Fuzzy Linguistic Variable (FLV).
     * @param {string} varName
     * @returns {FuzzyVariable}
     */
    CreateFLV(varName) {
        const flv = new FuzzyVariable(varName);
        this.variables[varName] = flv;
        return flv;
    }

    /**
     * Retrieves a registered FuzzyVariable by name.
     * @param {string} varName
     * @returns {FuzzyVariable|undefined}
     */
    GetFLV(varName) {
        return this.variables[varName];
    }

    /**
     * Adds a fuzzy rule `IF antecedent THEN consequent` to the module.
     * @param {FuzzyTerm} antecedent
     * @param {FuzzyTerm} consequent
     * @param {string}    [label='']
     * @returns {FuzzyRule} The created rule.
     */
    AddRule(antecedent, consequent, label = '') {
        const rule = new FuzzyRule(antecedent, consequent, label);
        this.rules.push(rule);
        return rule;
    }

    /**
     * Fuzzifies the specified linguistic variable with a crisp input value.
     * @param {string} flvName  Name of a registered FuzzyVariable.
     * @param {number} val      Crisp input value.
     */
    Fuzzify(flvName, val) {
        const flv = this.variables[flvName];
        if (!flv) {
            throw new Error(`FuzzyModule.Fuzzify: Linguistic variable "${flvName}" not found.`);
        }
        flv.Fuzzify(val);
    }

    /**
     * Zeros the DOMs of all rule consequents before running inference.
     * @private
     */
    _SetConfidencesOfConsequentsToZero() {
        for (let i = 0; i < this.rules.length; i++) {
            this.rules[i].SetConfidenceOfConsequentToZero();
        }
    }

    /**
     * Evaluates all rules and defuzzifies the target linguistic variable into a crisp number.
     * @param {string} flvName         Name of the output FuzzyVariable.
     * @param {string} [method='MaxAv'] `FuzzyModule.DefuzzifyMethod.MaxAv` or `Centroid`.
     * @param {number} [centroidSamples=15] Number of samples when using Centroid method.
     * @returns {number} Crisp output value.
     */
    DeFuzzify(flvName, method = FuzzyModule.DefuzzifyMethod.MaxAv, centroidSamples = 15) {
        const flv = this.variables[flvName];
        if (!flv) {
            throw new Error(`FuzzyModule.DeFuzzify: Linguistic variable "${flvName}" not found.`);
        }

        // 1. Clear all consequent DOMs
        this._SetConfidencesOfConsequentsToZero();

        // 2. Fire all rules
        for (let i = 0; i < this.rules.length; i++) {
            this.rules[i].Calculate();
        }

        // 3. Defuzzify using requested method
        if (method === FuzzyModule.DefuzzifyMethod.Centroid) {
            return flv.DeFuzzifyCentroid(centroidSamples);
        }
        return flv.DeFuzzifyMaxAv();
    }

    // ── Visual Debugging & Classroom Inspection ──────────────────────────────

    /**
     * Draws a compact world-space label near an entity (similar to FSM.DrawDebug / BT.DrawDebug).
     * Renders when global `debugMode` is true or `options.force` is true.
     * @param {Renderer} renderer
     * @param {number}   x
     * @param {number}   y
     * @param {string}   text
     * @param {object}   [options]
     * @param {Color}    [options.color]
     * @param {boolean}  [options.force=false]
     */
    DrawDebug(renderer, x, y, text, options = {}) {
        const isDebug = (typeof debugMode !== 'undefined' && debugMode) || options.force;
        if (!isDebug || !renderer) return;
        const col = options.color || Color.cyan;
        renderer.DrawFillText(text, x, y, 'bold 11px monospace', col, 'center', 'middle');
    }

    /**
     * Renders the membership function curves, active DOM fills, and crisp input/output needle
     * for a single FuzzyVariable onto the canvas.
     *
     * @param {Renderer} renderer
     * @param {string}   flvName    Name of the FuzzyVariable to plot.
     * @param {number}   x          Top-left X in canvas pixels.
     * @param {number}   y          Top-left Y in canvas pixels.
     * @param {number}   width      Width of the graph box.
     * @param {number}   height     Height of the graph box.
     * @param {object}   [options]
     * @param {boolean}  [options.isOutput=false]  If true, draws the defuzzified output needle instead of input.
     * @param {string}   [options.title]           Custom title override.
     * @param {number}   [options.samples=48]      Curve resolution.
     */
    DrawVariableGraph(renderer, flvName, x, y, width, height, options = {}) {
        const flv = this.variables[flvName];
        if (!flv || !renderer || flv.setList.length === 0) return;

        const isOutput = !!options.isOutput;
        const samples = options.samples || 48;
        const colors = FuzzyModule._GetSetColors();

        const headerH = 18;
        const footerH = 16;
        const plotX = x + 24;
        const plotY = y + headerH;
        const plotW = width - 32;
        const plotH = height - headerH - footerH;

        // Background panel
        renderer.DrawFillBasicRectangle(x, y, width, height, new Color(0.06, 0.08, 0.13, 0.90));
        renderer.DrawStrokeBasicRectangle(x, y, width, height, new Color(0.24, 0.32, 0.46, 0.85), 1);

        // Title + live crisp value badge
        const titleText = options.title || `${flv.name} (${isOutput ? 'Output' : 'Input'})`;
        renderer.DrawFillText(titleText, x + 6, y + 10, 'bold 10px monospace', new Color(0.88, 0.93, 1, 1), 'left', 'middle');

        const crispVal = isOutput ? flv.lastCrispOutput : flv.lastCrispInput;
        if (crispVal !== null && crispVal !== undefined) {
            renderer.DrawFillText(
                `= ${crispVal.toFixed(1)}`,
                x + width - 6,
                y + 10,
                'bold 10px monospace',
                isOutput ? new Color(1, 0.84, 0.25, 1) : new Color(0.4, 0.9, 1, 1),
                'right',
                'middle'
            );
        }

        // Plot area frame & Y-axis labels (0 and 1)
        renderer.DrawFillBasicRectangle(plotX, plotY, plotW, plotH, new Color(0.03, 0.05, 0.08, 0.95));
        renderer.DrawStrokeBasicRectangle(plotX, plotY, plotW, plotH, new Color(0.18, 0.24, 0.34, 1), 1);
        renderer.DrawFillText('1', plotX - 4, plotY + 4, '9px monospace', new Color(0.55, 0.65, 0.78, 1), 'right', 'middle');
        renderer.DrawFillText('0', plotX - 4, plotY + plotH - 2, '9px monospace', new Color(0.55, 0.65, 0.78, 1), 'right', 'middle');

        // Midline 0.5 dashed guide
        renderer.DrawLine(plotX, plotY + plotH * 0.5, plotX + plotW, plotY + plotH * 0.5, new Color(0.16, 0.22, 0.30, 0.6), 1);

        const span = Math.max(0.0001, flv.maxRange - flv.minRange);

        // Plot each FuzzySet curve and its active DOM fill
        for (let s = 0; s < flv.setList.length; s++) {
            const set = flv.setList[s];
            const baseCol = colors[s % colors.length];
            const activeDOM = set.GetDOM();

            let prevPx = plotX;
            let prevPy = plotY + plotH - set.CalculateDOM(flv.minRange) * plotH;

            for (let i = 1; i <= samples; i++) {
                const t = i / samples;
                const val = flv.minRange + t * span;
                const dom = set.CalculateDOM(val);
                const px = plotX + t * plotW;
                const py = plotY + plotH - dom * plotH;

                // If this set has active firing strength, shade the clipped area under min(dom, activeDOM)
                if (activeDOM > 0.01 && dom > 0.01) {
                    const clipped = Math.min(dom, activeDOM);
                    const barH = clipped * plotH;
                    const sliceW = plotW / samples + 0.6;
                    renderer.DrawFillBasicRectangle(
                        px - sliceW * 0.5,
                        plotY + plotH - barH,
                        sliceW,
                        barH,
                        new Color(baseCol.r, baseCol.g, baseCol.b, 0.22)
                    );
                }

                renderer.DrawLine(prevPx, prevPy, px, py, baseCol, activeDOM > 0.05 ? 2 : 1.2);
                prevPx = px;
                prevPy = py;
            }

            // Set legend label near its representative peak X
            const repT = Math.max(0.06, Math.min(0.94, (set.representativeValue - flv.minRange) / span));
            const labelX = plotX + repT * plotW;
            const domTag = activeDOM > 0.01 ? `${set.name}:${activeDOM.toFixed(2)}` : set.name;
            renderer.DrawFillText(
                domTag,
                labelX,
                plotY + plotH + 9,
                activeDOM > 0.01 ? 'bold 9px monospace' : '9px monospace',
                 baseCol,
                'center',
                'middle'
            );
        }

        // Draw vertical crisp needle (Input or Defuzzified Output)
        if (crispVal !== null && crispVal !== undefined) {
            const normX = Math.max(0, Math.min(1, (crispVal - flv.minRange) / span));
            const needleX = plotX + normX * plotW;
            const needleCol = isOutput ? new Color(1, 0.85, 0.2, 1) : new Color(1, 1, 1, 0.92);
            renderer.DrawLine(needleX, plotY, needleX, plotY + plotH, needleCol, 1.8);
            renderer.DrawFillCircle(needleX, plotY + (isOutput ? plotH * 0.5 : 3), 3.2, needleCol);
        }
    }

    /**
     * Renders a complete classroom Fuzzy Inspector HUD panel showing variable membership graphs
     * and active Rule firing strengths.
     *
     * @param {Renderer} renderer
     * @param {number}   [startX=12]
     * @param {number}   [startY=52]
     * @param {object}   [options]
     * @param {number}   [options.width=310]
     * @param {string}   [options.title='FUZZY LOGIC INSPECTOR']
     * @param {string[]} [options.variables]   Names of variables to plot (defaults to all).
     * @param {string[]} [options.outputs]     Names of variables that are outputs.
     * @param {boolean}  [options.showRules=true]
     * @param {boolean}  [options.force=false]
     */
    DrawFuzzyInspector(renderer, startX = 12, startY = 52, options = {}) {
        const isDebug = (typeof debugMode !== 'undefined' && debugMode) || options.force;
        if (!isDebug || !renderer) return;

        const width = options.width || 310;
        const title = options.title || 'FUZZY LOGIC INSPECTOR';
        const varNames = options.variables || Object.keys(this.variables);
        const outputSet = new Set(options.outputs || []);
        const showRules = options.showRules !== false;
        const graphH = options.graphHeight || 76;
        const gap = 6;

        const rulesCount = showRules ? this.rules.length : 0;
        const rulesSectionH = showRules && rulesCount > 0 ? 22 + rulesCount * 15 + 6 : 0;
        const totalH = 26 + varNames.length * (graphH + gap) + rulesSectionH + 4;

        // Outer frame
        renderer.DrawFillBasicRectangle(startX, startY, width, totalH, new Color(0.04, 0.06, 0.10, 0.92));
        renderer.DrawStrokeBasicRectangle(startX, startY, width, totalH, new Color(0.28, 0.42, 0.62, 0.9), 1.5);

        // Title bar
        renderer.DrawFillBasicRectangle(startX, startY, width, 22, new Color(0.10, 0.16, 0.26, 0.95));
        renderer.DrawFillText(title, startX + 8, startY + 11, 'bold 11px monospace', new Color(0.45, 0.85, 1.0, 1), 'left', 'middle');

        let curY = startY + 26;
        for (let i = 0; i < varNames.length; i++) {
            const vName = varNames[i];
            this.DrawVariableGraph(renderer, vName, startX + 6, curY, width - 12, graphH, {
                isOutput: outputSet.has(vName)
            });
            curY += graphH + gap;
        }

        // Active rules bar chart
        if (showRules && rulesCount > 0) {
            renderer.DrawFillText('RULE INFERENCE (FIRING STRENGTH):', startX + 8, curY + 8, 'bold 9px monospace', new Color(0.75, 0.84, 0.96, 1), 'left', 'middle');
            curY += 18;

            for (let r = 0; r < this.rules.length; r++) {
                const rule = this.rules[r];
                const strength = rule.lastFiringStrength;
                const active = strength > 0.001;

                const rowX = startX + 8;
                const barW = 54;
                const textX = rowX + barW + 6;

                // Strength bar background & fill
                renderer.DrawFillBasicRectangle(rowX, curY - 5, barW, 10, new Color(0.10, 0.14, 0.20, 1));
                if (active) {
                    const fillCol = strength > 0.65
                        ? new Color(0.25, 0.92, 0.50, 0.95)
                        : new Color(0.98, 0.78, 0.22, 0.95);
                    renderer.DrawFillBasicRectangle(rowX, curY - 5, barW * Math.min(1, strength), 10, fillCol);
                }
                renderer.DrawStrokeBasicRectangle(rowX, curY - 5, barW, 10, new Color(0.24, 0.32, 0.44, 1), 1);
                renderer.DrawFillText(strength.toFixed(2), rowX + barW * 0.5, curY, '8px monospace', Color.white, 'center', 'middle');

                // Rule label truncated cleanly to fit panel
                const maxChars = Math.floor((width - barW - 22) / 5.6);
                const lbl = rule.label.length > maxChars ? rule.label.slice(0, maxChars - 2) + '..' : rule.label;
                renderer.DrawFillText(
                    lbl,
                    textX,
                    curY,
                    active ? 'bold 9px monospace' : '9px monospace',
                    active ? new Color(0.95, 0.98, 1.0, 1) : new Color(0.45, 0.52, 0.62, 1),
                    'left',
                    'middle'
                );

                curY += 15;
            }
        }
    }
}

// #endregion

