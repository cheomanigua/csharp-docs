# Architecture

**Building Video Games with Data-Driven Architecture**

This document is a practical reference. It is written for developers who want to build better video games — especially those struggling with messy code, slow iteration, or performance issues — even if you’ve never heard of terms like **Data-Driven Design**, **MVC**, **ECS**, or **Data-Oriented Design (DoD)**.

### Why This Matters for Game Development

Traditional game code often looks like this:  
- Every monster, weapon, or spaceship is a big class with data *and* behavior mixed together.  
- Adding a new weapon or changing balance requires editing code and recompiling.  
- Performance suffers because data is scattered across memory (causing “cache misses” — the CPU keeps waiting for data).

**The solution** is a **data-driven architecture**.  
Think of your game engine as a “smart factory”:  
- The **data files** (like recipes) tell the factory what to build.  
- The **engine code** is the machinery that runs efficiently no matter what recipes you feed it.

**Benefits**:
- Designers and modders can tweak content (stats, items, ships) without touching code.
- The game runs faster because data is organized for the hardware (CPU caches).
- You get moddability and faster iteration for free.



## Core Ideas, Explained Simply

#### 1. Data-Driven Design (The Big Idea)
Instead of hard-coding everything, you store game content in external files (usually JSON).  
The engine reads these files at runtime and builds the game world dynamically.

**Example**: A `definitions.json` file might say:
```json
{
  "ShipClasses": {
    "Interceptor": { "BaseHull": 200, "BaseShields": 150 }
  },
  "Weapons": {
    "PulseLaser": { "Damage": 15, "Cooldown": 0.4 }
  }
}
```
Your code loads this and creates ships/weapons on the fly. Change the JSON → no recompile needed.

#### 2. Data-Oriented Design (DoD) – Organizing for Speed
This is about arranging data in memory so the CPU can process it quickly.  
**Key rule**: Keep related data close together (contiguous arrays) instead of scattered objects.  
This reduces “pointer chasing” and cache misses.

#### 3. Two Practical Patterns

**MVC (Model-View-Controller)** – Great for user interfaces and overall structure.  
- **Model**: The data (health, position, etc.).  
- **View**: What the player sees (sprites, UI).  
- **Controller**: Handles input and orchestrates changes.

**ECS (Entity Component System)** – Great for the high-performance simulation core (physics, combat, AI).  
- **Entity**: Just a unique ID (like a serial number).  
- **Component**: Pure data (e.g., a struct with health, position).  
- **System**: Logic that processes many components at once (e.g., a “DamageSystem” that loops through all entities with health).

You can (and often should) use **both** together: ECS for the heavy game world simulation, and MVC-style layers as thin adapters for UI and input.



## Visual Hierarchy

```
Data-Driven Philosophy (Why)
        ↓
Data-Oriented Design (How to organize data for hardware)
        ↓
ECS (High-performance simulation core)
        ↔
MVC (User interface & input layers)
```

They solve different problems and work well together.



## Why ECS is Extremely Fast

Modern CPUs have tiny but blazing-fast memory areas called **L1 and L2 caches** (usually 32–512 KB per core). Accessing data in these caches is ~10–100x faster than fetching from main RAM. A **cache miss** (when the CPU has to wait for RAM) stalls the processor and kills performance.

**ECS achieves high speed by making cache misses rare**:

- **Flat Arrays (Structure of Arrays)**:  
  Instead of objects scattered randomly in memory, ECS stores all components of the same type in one big contiguous block (a flat array).  
  When a System processes 10,000 ships’ health, it walks sequentially through memory. The CPU can **prefetch** the next chunk of data, keeping everything in the fast L1/L2 cache. This is the opposite of traditional OOP, where following pointers jumps all over RAM.

- **Index Map**:  
  A lookup table that translates a flexible identifier (string name or enum) into a memory offset in the flat array.  
  This gives you the best of both worlds: human-friendly names in your JSON data, while the engine still uses fast integer-based access under the hood.

- **Tags / Bitmasks**:  
  Simple flags or bit patterns attached to entities. They let systems quickly filter “only process entities that have a Weapon AND are Alive” without checking every single entity.  
  This enables fast, often branchless (no `if` statements that slow down the CPU) queries.

### Performance vs. Flexibility

| Layer | Function | Performance Impact |
| --- | --- | --- |
| **Flat Array (`Values[]`)** | Contiguous memory for attributes | Maximum (Zero stall cycles) |
| **Index Map** | Identity to Offset translation | High (O(1) lookup) |
| **JSON Blueprints** | Data-driven initialization | Maximum Flexibility (No recompile) |
| **Tag/Masks** | Replaces inheritance | High (Branchless filtering) |

**Bottom line**: ECS organizes data for the *hardware*, not for human intuition. The result is dramatically higher throughput in simulations with thousands of entities.



## Data-Driven Workflow

1. **Define Blueprints** (JSON files) – designers work here.
2. **Load at Runtime** – engine parses the data.
3. **Build Game Objects** – factory creates entities/components or models.
4. **Run Systems** – logic processes the data efficiently (leveraging caches).
5. **Render & Handle Input** – UI layer reads the data without polluting the core.



## Practical Code Examples

#### Example 1: Simple MVC Style (Good for Smaller Games / UI)

```csharp
// Data from JSON (loaded once)
public class ShipClassConfig { public int BaseHull; /* ... */ }
public class WeaponDefConfig { public string Name; public int Damage; /* ... */ }

// Model - holds live game data
public class ShipModel {
    public string ClassName;
    public int CurrentHull;
    public WeaponDefConfig Weapon; // reference to shared blueprint
}

// Factory
public class ShipFactory { /* ... see previous version */ }

// View
public class ShipView {
    public void Render(ShipModel ship) {
        // Use ship.Weapon.SpritePath etc.
    }
}
```

#### Example 2: ECS Style (Better for Performance-Heavy Games)

```csharp
// Components = pure data (stored in flat arrays)
public struct CombatStats {
    public int EntityId;
    public int Hull;
    public int Shields;
}

public struct WeaponAttachment {
    public int EntityId;
    public int WeaponId;        // index into blueprint array
    public float CooldownTimer;
}

// System - processes contiguous data efficiently
public class WeaponFireSystem {
    private readonly WeaponDefConfig[] _blueprints;

    public void Update(Span<WeaponAttachment> weapons, float deltaTime) {
        for (int i = 0; i < weapons.Length; i++) {
            ref var w = ref weapons[i];
            if (w.CooldownTimer > 0) {
                w.CooldownTimer -= deltaTime;
                continue;
            }
            var bp = _blueprints[w.WeaponId];
            // Fire logic using bp.Damage...
            w.CooldownTimer = bp.Cooldown;
        }
    }
}
```

**Key advantage**: All `CombatStats` live in one big contiguous array → maximum cache efficiency.



## Getting Started – Step-by-Step

1. **Start Small**  
   Create a `definitions.json` with a few items/ships and a simple loader.

2. **Choose Your Core**  
   - Beginners / UI-heavy: Start with MVC + data-driven factories.  
   - Performance / many entities: Move the simulation to ECS.

3. **Core Building Blocks**
   - **Entity Registry**: Central storage using flat arrays.
   - **Command Queue**: Queue actions instead of direct calls.
   - **Dirty Flags**: Mark data as changed so you only recalculate when needed.
   - **Tags/Masks**: For fast filtering.

4. **Separate Concerns**  
   Keep game logic away from rendering. Use Flyweight pattern (shared blueprints referenced by index).

5. **Tools & Techniques**  
   - Prefer structs for components.  
   - Validate JSON at load.  
   - Add a debug inspector for entities.



## Common Trade-offs & Tips

**Pros**: Fast iteration, mod support, excellent performance at scale.  
**Cons**: More upfront design; debugging can feel indirect.  

**Tips**:
- Start with data for stats/items. Add full ECS later.
- Version your JSON schemas.
- Profile with tools to see cache misses.
- Works with Unity (DOTS), Godot, or pure C#.



## Summary & Reference

- **Philosophy**: Externalize content into data. Organize data for the hardware (flat arrays, cache-friendly layouts, index maps, tags/masks).
- **Tools**: JSON blueprints + Factories + Systems.
- **Patterns**: MVC for structure, ECS for performance core.

This architecture scales from simple prototypes to large, moddable games. The explanations above (especially around CPU caches and flat arrays) should help you understand *why* the patterns work, not just *how* to use them.

You now have a solid foundation. Start by implementing a small data-driven ship spawner using the MVC example, then gradually introduce ECS systems as your simulation grows.
