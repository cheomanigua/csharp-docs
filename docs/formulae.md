# Formulae System

# Data-Driven Formula Architecture

This document outlines the interaction between your data files and the `FormulaProcessor` system, demonstrating how to maintain a scalable and moddable combat architecture.



## 1. System Components

The system is divided into three distinct roles:

* **Data Layer (`.json`)**: Contains raw definitions for entities, biological traits (races), archetypes (classes), and the mathematical instructions for formulas.
* **Initialization Layer (`StatsUpdateSystem.cs`)**: The bridge that triggers the setup of an entity's statistics.
* **Processor Engine (`FormulaProcessor.cs`)**: The logic handler that interprets JSON instructions into executable game code.



## 2. How the System Selects Formulas

Your understanding of the selection mechanism is correct: the `formulas.json` file is essentially a "dumb" data container—it stores various formulas (e.g., `UpdateStats`, `MeleeStrike`) without inherent knowledge of how they are used.

The decision-making process happens within the **calling code**, which directs specific formulas to the appropriate processor method in `FormulaProcessor.cs`:

* **State-Mutating Formulas (`ExecuteUpdate`)**: When the system needs to persist data into the character's stats (like `UpdateStats`), it calls `ExecuteUpdate()`. This method specifically looks for `Target` fields in the JSON to modify the `stats.Values` array.
* **Action-Calculation Formulas (`Execute`)**: When the system needs to calculate a temporary combat result (like `MeleeStrike`), it calls `Execute()`. This method interprets formulas as a chain of operations to produce a return value, without modifying the persistent `stats.Values`.


## 3. Execute() vs ExecuteUpdate()


* **Logic Divergence (Targeting vs. Calculation)**:
    * `ExecuteUpdate()` is designed to **mutate** a `CharacterStats` object directly. It looks for a `Target` field in the JSON and updates that specific index in the `stats.Values` array.
    * `MeleeStrike` is intended to be a **one-off calculation** (a return value), not a state mutation. Your JSON for `MeleeStrike` uses `Stat` instead of `Target`, which `ExecuteUpdate` ignores because it specifically looks for `op.Target`.
* **Mathematical Execution**:
    * `ExecuteUpdate` uses `+=`, `*=`, and `=` operators.
    * In `MeleeStrike`, your intent involves a specific order of operations (grouping multipliers). As written in `ExecuteUpdate`, it would apply these operations sequentially to the value at `stats.Values` for the "Strength" index, rather than calculating a total damage output for an attack action.

## 4. Workflow Examples

### Initialization Workflow (`UpdateStats`)

1. **Trigger**: `StatsUpdateSystem.cs` identifies the entity's `Class` and `Race`.
2. **Dispatch**: It calls `RecalculateStats()`, which explicitly directs the `"UpdateStats"` formula to the `ExecuteUpdate()` method.
3. **Mutation**: `ExecuteUpdate()` processes the `Set`, `Add`, and `Multiply` operations, pulling source values from `classes.json` and `races.json` to populate `stats.Values`.

### Combat Calculation Workflow (`MeleeStrike`)

1. **Trigger**: The combat engine requires a damage calculation for an attack action.
2. **Dispatch**: The engine calls `FormulaProcessor.Execute("MeleeStrike", ...)`, targeting the `Execute()` method.
3. **Result**: `Execute()` interprets the `MeleeStrike` JSON operations to produce a `float` return value representing total damage, leaving the character's core `Strength` and `Intelligence` stats untouched.



## 5. Why This System is Moddable

* **Logic Separation**: By using two distinct processor methods (`Execute` vs `ExecuteUpdate`), the system enforces that formulas are used for their intended purpose—either permanent state mutation or transient action calculation.
* **Data-Driven Flexibility**: You can add new combat moves (e.g., `RangedShot`) or modify how `Health` is calculated in `formulas.json` without modifying the C# logic.
* **Standardized Processing**: The engine remains stable because it simply follows the "contract" defined by the calling function, regardless of which formula name is passed to it.




### Summary of Differences

| Feature | `ExecuteUpdate` | `Execute` |
| --- | --- | --- |
| **Primary Goal** | Permanent Stat Update | Temporary Combat Calculation |
| **Primary Property** | `Target` (Index in array) | `Stat` (Value lookup) |
| **Action** | Modifies `stats.Values` | Returns a `float` result |
| **Usage** | `RecalculateStats` | `CombatSystem` |

By using `ExecuteUpdate` for your `UpdateStats` (which initializes your `CharacterStats` object) and using the `Execute` method for combat formulas, you align the code with your intended logic.


# Example

To calculate the `MeleeStrike` value using the values provided, we follow the order of operations defined in your original string formula:

### 1. Breakdown of Variables

* **BaseWeaponDamage**: 2
* **WeaponBonus**: 1
* **Strength**: 10
* **GearStrengthBonus**: 2
* **TemporaryStrengthBonus**: 1
* **SkillBonus**: 2
* **TemporarySkillBonus**: 0



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

