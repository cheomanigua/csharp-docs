# Data Driven Initialization

# Data-Driven Initialization Pipeline

## 1. Overview

The engine utilizes a Data-Driven Initialization pipeline to assemble entity stats at runtime. This architecture decouples character definitions (JSON) from combat logic (C#), allowing for rapid balancing without requiring code recompilation.

## 2. The Initialization Lifecycle

Character assembly occurs in four distinct phases:

1. **Global Data Loading (Startup)**: The `Controller` deserializes configuration files (`races.json`, `classes.json`, `weapons.json`) into memory-resident dictionaries. These serve as the immutable templates for all entities.
2. **Blueprint Request**: When `LoadNPCFromJson` is triggered, an `NPCBlueprintDto` (e.g., "Human Wizard") is passed as the instantiation request.
3. **Runtime Assembly**: The `Controller` fetches the relevant `RaceData` and `ClassData` templates, instantiates a `CharacterStats` struct, and invokes the `FormulaProcessor`.
4. **Mathematical Resolution**: The `FormulaProcessor` executes the `InitStats` operations defined in `combat_formulas.json`. It computes final attributes by combining base values and bonuses, then maps the results directly into the `CharacterStats` memory block.

## 3. Data Schema Example

**`races.json`**
```
{
  "Human": { "RaceStr": 2, "RaceInt": 5 },
  "Orc": { "RaceStr": 10, "RaceInt": 1 }
}
```

**`classes.json`**
```
{
  "Warrior": { 
      "ClassHealth": 150, "ClassMana": 20, "ClassStr": 10, "ClassInt": 5, "PrimarySkillIndex": 1 
  },
  "Wizard": { 
      "ClassHealth": 80, "ClassMana": 120, "ClassStr": 5, "ClassInt": 15, "PrimarySkillIndex": 3 
  }
}
```

**`skills.json`**
```
{
  "1": { "Name": "OneHandedWeapons", "AttributeScale": "Strength" },
  "2": { "Name": "Archery", "AttributeScale": "Strength" },
  "3": { "Name": "Illusion", "AttributeScale": "Intelligence" }
}
```
A **Human Wizard** will be build with `Health: 80`, `Mana: 120`, `Strength: 7`, `Intelligence: 20`, `Primary Skill: Illusion`

As you can see, in the data json files there are not direct references to Health, Strength, etc.

The system maps high-level blueprints to concrete stats through relational lookups.

* **Input Data**:
    * `races.json` defines racial modifiers.
    * `classes.json` defines base attributes.
    * `skills.json` defines attribute scaling.


* **Resulting Assembly**: For a **Human Wizard**, the engine calculates:
    * *Health*: 80 (Class)
    * *Mana*: 120 (Class)
    * *Strength*: 5 (Class) + 2 (Race) = 7
    * *Intelligence*: 15 (Class) + 5 (Race) = 20
    * *Primary Skill*: Illusion (Class)



## 4. Architectural Advantages

| Feature | Technical Benefit |
| --- | --- |
| **Decoupling** | The `Controller` manages data flow, while the `FormulaProcessor` encapsulates mathematical logic, allowing either to change independently. |
| **Data-Driven Flexibility** | Balancing changes (e.g., modifying Orc strength or Wizard mana) are made strictly in JSON, requiring zero C# modifications. |
| **Optimized Performance** | Assembly occurs only during instantiation. The resulting `CharacterStats` struct uses direct memory offsets, ensuring the combat loop remains cache-efficient. |




### Why this is robust:

* **Decoupling**: The `Controller` knows *which* data to load, but it doesn't need to know the math behind it. The `FormulaProcessor` knows *how* to do the math, but it doesn't know where the data came from.
* **No Hard-Coding**: Because you are using `InitStats` in your JSON, you can change the racial bonus for an Orc or the base strength of a Warrior without touching your C# code at all.
* **Speed**: Since this "Assembly" only happens when an NPC is instantiated (and the math is executed via your cached/pre-compiled logic), your game remains extremely performant during actual combat.

You have successfully built a system where the "Source of Truth" is entirely contained in your JSON files, and your C# code simply acts as the engine to process that data.

* * *

# Data-Driven Updating Pipeline

## Dynamic Modifier System (Dirty Flag Pattern)

This document outlines the architecture for handling dynamic attribute modifiers—such as equipping or unequipping items—while maintaining the performance requirements of a high-speed combat engine.

### 1. Overview

To avoid unnecessary re-calculations during every combat frame, the system employs a **Dirty Flag Pattern**. This ensures that stat calculations (which involve traversing equipment and applying bonuses) only occur when an entity's inventory state actually changes, rather than continuously during the combat loop.

### 2. The Modifier Workflow

The system treats the `CharacterStats` struct as a cached state. When an item (like a Ring) is equipped or unequipped, the system invalidates this cache.

#### Step-by-Step State Transition:

1. **Modification Trigger**: An external system (e.g., Inventory System) modifies the `EquipmentComponent` by adding or removing a reference to an item.
2. **Dirty Flag Activation**: The system sets `stats.IsDirty = true` on the target entity’s `CharacterStats` struct.
3. **Deferred Recalculation**: During the next combat tick, the `EntityRegistry` detects the `IsDirty` flag.
4. **Reset & Re-sum**:
* **Reset**: The system reverts the character's attributes to their "Clean" Base Stats (the values originally calculated during the `InitStats` phase).
* **Re-sum**: The system iterates through the updated `EquipmentComponent` list, summing the bonuses from all currently equipped items.
* **Cleanup**: Once the new totals are written to the struct, `stats.IsDirty` is set to `false`.



### 3. Implementation Logic

This process is centralized within the `EntityRegistry.ProcessCombat` loop to ensure consistency:

```csharp
public void ProcessCombat()
{
    var activeIds = GetActiveEntities();
    for (int i = 0; i < activeIds.Length; i++)
    {
        ref var stats = ref _statsSieve.Get(activeIds[i]);
        
        if (stats.IsDirty) 
        {
            // 1. Reset: Revert to Base Stats (Original Class/Race baseline)
            // 2. Re-sum: Iterate through EquipmentComponent to add current bonuses
            // 3. Finalize:
            stats.IsDirty = false;
        }
    }
}

```

### 4. Why This Pattern is Robust

* **Performance (O(1) Check)**: The combat loop only checks a boolean flag (`IsDirty`). If `false`, it skips all math and moves to the next entity, maintaining maximum execution speed.
* **Mathematical Integrity**: By resetting to a "Base" value before re-summing modifiers, the system avoids "subtraction errors" that occur if items are destroyed or overridden while equipped.
* **Decoupling**: The Combat Engine does not need to know the specific mechanics of a "Ring" or "Armor." It only needs to know that the `EquipmentComponent` has changed and that the resulting `CharacterStats` must be re-derived.

### 5. Summary

This architecture ensures that "adding a Ring of Strength" or "removing a Helmet" is a **content-driven event** that the engine handles automatically. You simply update the `EquipmentComponent` and toggle the `IsDirty` flag; the `EntityRegistry` handles the math transition seamlessly during the next update cycle.

* * *

# Data-Driven Performance vs. Schema Flexibility

This document explains the design principles behind the current combat engine architecture, focusing on the trade-offs between reflection-based attribute processing and data-driven entity definitions.

## 1. The Current Architecture: Reflection + Structs

The system utilizes a **Data-Oriented Design (DOD)** approach to ensure high performance while maintaining a data-driven configuration model. The core of this architecture relies on two distinct layers:

| Component Layer | Function |
| --- | --- |
| **Memory Schema (Structs)** | Defines the physical layout of entity data (e.g., `CharacterStats`). This provides direct memory access and cache efficiency. |
| **Reflection Layer** | Binds JSON configuration data to the hard-coded memory structures at runtime, allowing the `FormulaProcessor` to access fields dynamically. |
| **Instance Data (JSON)** | Stores the specific configuration (races, classes) that defines entity instances without altering the underlying engine logic. |

## 2. Why Attribute Changes Require Codebase Updates

In the current system, attributes are defined as members of a C# `struct` using explicit `[FieldOffset]` attributes. This is necessary for **blazing fast performance**:

* **Memory Layout:** By using `struct` with fixed offsets, the system ensures data is tightly packed, minimizing cache misses during combat loops.
* **Compiler Requirements:** C# is a statically typed, compiled language. The compiler must know the memory layout (including field names and offsets) at compile time.
* **Result:** Adding an attribute like `Dexterity` requires adding a field to the `CharacterStats` struct so the memory allocator knows exactly where to store that specific value.

## 3. Why Race/Class Changes Do Not

Adding new entities, such as a new race or class, requires no changes to the C# source code. This is because these entities are **Data-Driven Instances** rather than **Memory Schemas**:

* **Dynamic Dictionaries:** The `Controller` loads races and classes into `Dictionary<string, RaceData>` structures at runtime.
* **Decoupled Logic:** The engine logic does not explicitly reference specific race names. It simply retrieves a `RaceData` object from the dictionary based on a key provided in a JSON blueprint.
* **Conclusion:** Adding an "Elf" race is simply adding a new entry to the `races.json` file; the `JsonSerializer` handles the instantiation, and the engine logic remains identical.

## 4. Summary of Design Philosophy

The system intentionally creates a trade-off between **Schema Rigidity** and **Content Flexibility**:

* **High Performance (Attributes):** By "paying" the one-time cost of updating a C# struct, you gain direct memory access that cannot be matched by dynamic object lookups.
* **High Flexibility (Races/Classes):** By using a dictionary-based loading system, you maintain the ability to iterate on game content (the "recipes") rapidly without recompilation.

This hybrid approach ensures the engine remains performant in the "hot" execution path (combat) while remaining highly configurable in the design layer.

* * *

# Reflection vs The Property Bag

To understand why you might choose one over the other, it helps to view them as two different philosophies for how your code "talks" to your data.

### 1. Reflection: The "Automatic Detective"

Reflection is a feature of C# that allows your code to inspect itself while it is running. It treats your classes as "live" databases.

* **How it works**: You tell the engine, "Look at this `CharacterStats` class, find the property named `Strength`, and tell me its value."
* **The Workflow**: You keep your C# classes structured with explicit properties like `public int Strength { get; set; }`. The code "discovers" these properties at runtime using the `Type` and `FieldInfo` metadata.
* **The "Convenience"**: You have strong, type-safe C# objects. You can use dot-notation (e.g., `stats.Strength`) throughout your code, and the compiler will catch typos at build time.
* **The Drawback**: If you want to add an attribute like "Dexterity," you **must** update the `CharacterStats` class definition in C# and recompile. It is "data-driven" for the *values*, but "code-driven" for the *schema*.

---

### 2. The Property Bag: The "Flexible Container"

The "Property Bag" (or Dictionary-based approach) is a design pattern where you remove the hard-coded structure entirely in favor of a dynamic collection.

* **How it works**: You treat your character as a box that contains a `Dictionary<string, float>`. You don't ask for `stats.Strength`; you ask for `stats.Attributes["Strength"]`.
* **The Workflow**: The engine doesn't need to know what a "Strength" attribute is. If the JSON says it exists, it gets added to the Dictionary. Your code never needs to be updated to support new stats because it never explicitly mentions them by name.
* **The "Convenience"**: You have total schema flexibility. You can add "ElfRace," "Dexterity," "Sanity," or "MagicResist" to your JSON files, and the code will handle them immediately without any changes.
* **The Drawback**: You lose the "dot-notation" safety. If you type `stats.Attributes["Strenth"]` (a typo) in your logic, the compiler won't complain. It will simply fail to find the key and return a default value (like 0) at runtime.

---

### Key Comparison

| Feature | Reflection | Property Bag |
| --- | --- | --- |
| **New Attribute** | Requires C# code change | Zero code change |
| **Compile-time Safety** | High (Compiler checks names) | Low (Dictionary keys are strings) |
| **Performance** | Fast (with caching) | Very Fast (O(1) Dictionary lookup) |
| **Primary Goal** | Keeping existing classes "clean" | Achieving maximum data flexibility |

### Which should you choose?

* **Choose Reflection** if you want your code to remain standard and readable, and you don't mind recompiling when you introduce a major new core stat that the whole game needs to know about (e.g., a new primary attribute like "Constitution").
* **Choose Property Bag** if your game is highly modular or moddable. If you want a designer to be able to add "Weight," "Temperature," or "Stamina" to the game via JSON without ever asking you to open the C# source code, the **Property Bag** is the professional standard for that level of flexibility.

* * *

# Compilation vs Pre-Compilation

If your priority is **blazing execution speed** and you are perfectly fine with recompiling the code when you add new attributes, you have the opportunity to move from "Dynamic Runtime Resolution" to **"Code Generation"**.

Since you have all your formulas in JSON, you can stop using Reflection entirely and generate C# code that the compiler turns into raw machine instructions.

### The "Blazing Speed" Strategy: Source Generators

Instead of parsing JSON at runtime and using Reflection to look up `CharacterStats` fields, you can use a **C# Source Generator**.

1. **The Source Generator** runs when you compile the project (`dotnet build`).
2. It reads your `combat_formulas.json` file.
3. It **writes a new C# file** in the background that looks like this:

```csharp
// This file is auto-generated at compile-time!
public static class CompiledFormulas
{
    public static float MeleeStrike(CharacterStats stats) 
    {
        // This is pure, hard-coded, blazing fast C#
        return stats.BaseWeaponDamage + stats.WeaponBonus + 
               (stats.Strength * 1.5f) + (stats.GearStrengthBonus * 1.5f);
    }
}

```

### Why this beats Reflection + Caching

* **Zero Overhead**: There is no dictionary lookup, no `FieldInfo` dereferencing, and no boxing. It is just `stats.Strength`, which the CPU can execute in a single clock cycle .
* **Type Safety**: If you rename `Strength` to `Str` in your class but forget to update the JSON, the compiler will fail at build time. You will catch the error *before* the game even launches.
* **Inlining**: The C# compiler can "inline" this code directly into your main loop, meaning the function call overhead disappears entirely.

### How to achieve your "One Source of Truth"

1. **JSON as the "Source of Truth"**: Keep your `combat_formulas.json`. It stays as your human-readable config.
2. **Compile-Time Processing**: Use a tool (or a small pre-build script) to transform that JSON into C# code.
3. **Fast Execution**: Your game engine uses the compiled code.

### Should you do this?

If you are worried about the "cost" of the Dictionary/Reflection approach, this is the **ultimate "Pro" architecture**. It is how high-end game engines (like Unreal or custom AAA engines) handle data-driven systems. They take human-readable data and "bake" it into binary data or generated code during the asset cook/build process.

**Summary for your goals:**

* **Reflection-Caching (Current approach)**: 99% fast. Very easy to implement.
* **Code Generation (Next level)**: 100% fast (identical to hard-coding). Takes more initial work to set up the generator.

If your game is not currently lagging, stick with the **Reflection-Caching** you have now. It already gives you the "one source of truth" (JSON) and "blazing speed" (cached access). Only move to Code Generation if you find that the few nanoseconds lost in Dictionary lookups are causing a performance bottleneck in your hot loop.

Does knowing that you are currently at "99% speed" make you feel better about staying with the current approach, or does the idea of "100% speed" via code generation appeal to your need for perfection?
