# Formulae

To calculate the `MeleeStrike` value using the values provided, we follow the order of operations defined in your original string formula:

### 1. Breakdown of Variables

* **BaseWeaponDamage**: 2
* **WeaponBonus**: 1
* **Strength**: 10
* **GearStrengthBonus**: 2
* **TemporaryStrengthBonus**: 1
* **SkillBonus**: 2
* **TemporarySkillBonus**: 0

---

### 2. Step-by-Step Calculation

**Formula**: `BaseWeaponDamage + WeaponBonus + ((Strength + GearStrengthBonus + TemporaryStrengthBonus) * 1.5) + ((SkillBonus + TemporarySkillBonus) * 2.0)`

* **Step A (Base Damage sum)**: 2 + 1 = 3
* **Step B (Strength scaling block)**:
* Sum: (10 + 2 + 1) = 13
* Multiply by 1.5: 13 x 1.5 = 19.5


* **Step C (Skill scaling block)**:
* Sum: (2 + 0) = 2
* Multiply by 2.0: 2 x 2.0 = 4.0


* **Step D (Total Sum)**: 3 + 19.5 + 4.0 = 26.5

**Result**: The `MeleeStrike` value is **26.5**.

### 3. Comparison with your JSON structure

With your new consolidated `combat_formulas.json` structure, the calculation performs the operations linearly. Because the JSON structure effectively separates the base stats from the scaling modifiers, ensure your `FormulaProcessor` handles floating-point math (which it currently does, as `FormulaDto` uses `float` values) so that you don't lose the `.5` precision.

* * *

To calculate the `MeleeStrike` using your new `Operations` structure, we must look at how your `FormulaProcessor.cs` processes these steps.

Based on your current implementation, the processor iterates through the `Operations` list and applies the math to a running total.

### Step-by-Step Calculation (New Structure)

**Input Values**:

* **BaseWeaponDamage**: 2
* **WeaponBonus**: 1
* **Strength**: 10
* **GearStrengthBonus**: 2
* **TemporaryStrengthBonus**: 1
* **SkillBonus**: 2
* **TemporarySkillBonus**: 0

**Formula**:

```json
"MeleeStrike": {
    "Operations": [
      { "Type": "Add", "Stat": "BaseWeaponDamage", "Value": 0.0 },
      { "Type": "Add", "Stat": "WeaponBonus", "Value": 0.0 },
      { "Type": "Multiply", "Stat": "Strength", "Value": 1.5 },
      { "Type": "Multiply", "Stat": "GearStrengthBonus", "Value": 1.5 },
      { "Type": "Multiply", "Stat": "TemporaryStrengthBonus", "Value": 1.5 },
      { "Type": "Multiply", "Stat": "SkillBonus", "Value": 2.0 },
      { "Type": "Multiply", "Stat": "TemporarySkillBonus", "Value": 2.0 }
    ]
  },
```

**Execution Logic**:

1. **Add** `BaseWeaponDamage`: 0 + 2 = 2
2. **Add** `WeaponBonus`: 2 + 1 = 3
3. **Multiply** `Strength` by 1.5: 3 + (10 x 1.5) = 3 + 15 = 18
4. **Multiply** `GearStrengthBonus` by 1.5: 18 + (2 x 1.5) = 18 + 3 = 21
5. **Multiply** `TemporaryStrengthBonus` by 1.5: 21 + (1 x 1.5) = 21 + 1.5 = 22.5
6. **Multiply** `SkillBonus` by 2.0: 22.5 + (2 x 2.0) = 22.5 + 4 = 26.5
7. **Multiply** `TemporarySkillBonus` by 2.0: 26.5 + (0 x 2.0) = 26.5 + 0 = 26.5

**Result**: The `MeleeStrike` value is **26.5**.

### Key Insight

This calculation matches your old string-based result exactly. The reason is that **distributive property** in algebra holds true here:
((A + B + C) x 1.5) = (A x 1.5) + (B x 1.5) + (C x 1.5).

By multiplying each stat individually in the JSON and adding them to the total, you achieve the same mathematical result as summing them first and multiplying later, but your `FormulaProcessor.cs` now handles it more efficiently by avoiding complex string parsing at runtime.

