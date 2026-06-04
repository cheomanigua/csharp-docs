# Modifiers

## Equipment

A character can wear equipment and weapons that produces certain effects, both in the wearer and in the target.

Transitioning to an `AttributeModifierComponent` is exactly how you handle **status effects, curses, and gear bonuses** with a unified, data-driven system. Because it accepts both positive and negative values, you can use the same logic to handle a "Ring of Giant Strength" (+5) and a "Cursed Ring of Weakness" (-5).

### 1. Unified JSON Design

By making the `Value` a signed float, you treat all modifications (buffs/debuffs) identically.

**`Data/Items/accessories.json`**

```json
{
  "501": { 
    "Name": "Ring of Giant Strength", 
    "GrantedComponents": [
      {
        "Tag": "AttributeModifierComponent",
        "Modifiers": [
          { "Target": "Strength", "Value": 5.0 },
          { "Target": "Illusion", "Value": -2.0 }
        ]
      }
    ]
  }
}

```

### 2. Architecture: The Unified Processor

Your engine no longer differentiates between "gear bonuses" and "status effects." They both become `AttributeModifierComponent` attachments.

**`Core/FormulaProcessor.cs`**

```csharp
public float ResolveAttribute(int entityId, string attributeName) {
    float baseVal = GetBaseAttribute(entityId, attributeName);
    float netModifier = 0;

    // Get all modifiers from all sources (Gear, PotionOfMight, Curses)
    var modifiers = GetComponentPool<AttributeModifierComponent>().GetForEntity(entityId);
    
    foreach (var modComponent in modifiers) {
        foreach (var mod in modComponent.Modifiers) {
            if (mod.Target == attributeName) {
                netModifier += mod.Value; // Automatically handles negative values
            }
        }
    }
    return baseVal + netModifier;
}

```

### 3. Why This "Value-Agnostic" Design Wins

* **Uniform Logic**: The `StatusEffectSystem` and the `EquipmentSystem` now share the exact same code path. If a player drinks a `PotionOfMight`, you simply attach an `AttributeModifierComponent` with `{"Target": "Strength", "Value": 5}` for the duration of the spell.
* **Stacking Mechanics**: This design natively supports stacking. If a player wears two rings that both provide `+5 Strength`, the `FormulaProcessor` loop simply sums them to `+10`. You do not need to write extra "stacking logic".
* **Data Flexibility**: You can introduce environmental penalties (e.g., "Heavy Armor" reducing "Agility" by 3) just by creating a new component tag in your data files, without writing a single line of new C# code.

### 4. Implementation Checklist for the Engine

To ensure this works at scale in your ECS:

* **The Sieve**: Your `EntitySieve` should allow you to query for entities that *have* an `AttributeModifierComponent` to identify who needs recalculation when a status effect expires.
* **Invalidation**: When an item is removed or a status effect expires, the system must trigger an "Attribute Dirty" flag, signaling the `FormulaProcessor` to re-cache the total value for the next combat tick.

This approach is highly performant because it avoids complex conditional logic (if-else branches) inside your combat loop, relying instead on a simple linear aggregation of modifiers.


## Dirty Flag

The **"Dirty Flag" system** is to ensure you only recalculate these attribute totals when something actually changes, rather than recalculating them on every single frame?

To implement the **Dirty Flag System**, we need to avoid re-summing modifiers every single frame. We calculate the total only when a component is added, removed, or modified.

### 1. The Dirty Flag Architectural Pattern

We add a `bool _isDirty` flag to the entity's cache. If `true`, the `FormulaProcessor` recalculates the total and caches the result. If `false`, it returns the cached value instantly.

### 2. Implementation

**`Core/EntityRegistry.cs`**

```csharp
public class EntityAttributesCache {
    private struct CacheEntry {
        public float CachedValue;
        public bool IsDirty;
    }
    
    // Maps EntityId -> AttributeName -> Cache
    private Dictionary<int, Dictionary<string, CacheEntry>> _cache = new();

    public void MarkDirty(int entityId) {
        // Logic to set all attributes for this entity to dirty
        foreach (var attr in _cache[entityId].Keys) {
            _cache[entityId][attr] = new CacheEntry { IsDirty = true };
        }
    }
}

```

**`Core/FormulaProcessor.cs` (Optimized)**

```csharp
public float GetAttributeTotal(int entityId, string attributeName) {
    if (_cache[entityId][attributeName].IsDirty) {
        // 1. Perform the expensive summation loop
        // 2. Store in CachedValue
        // 3. Set IsDirty = false
    }
    return _cache[entityId][attributeName].CachedValue; // O(1) return
}

```

### 3. Workflow for State Changes

When you add a "Ring of Giant Strength" or apply a "PotionOfMight":

1. **Component Add**: Your `ComponentFactory` attaches the `AttributeModifierComponent` to the entity.
2. **Notification**: The system calls `registry.MarkDirty(entityId)`.
3. **Lazy Evaluation**: The next time `FormulaProcessor` is called (during an attack or spell), it detects `IsDirty == true`, performs the aggregation once, and updates the cache.

### Why this is a "Production-Ready" Pattern:

* **Frame Budgeting**: You ensure that even if you have 1,000 active status effects across 500 NPCs, the engine does not perform thousands of redundant additions per frame.
* **Predictable Performance**: You move the cost of "recalculation" to the exact moment the game state changes, rather than forcing that cost onto the render loop.
* **Scalability**: This pattern works for anything that requires an expensive calculation (e.g., total weight of inventory, total threat level, or damage resistance).

This completes your high-performance, Data-Driven ECS architecture. You now have a system that is fully moddable, handles dynamic attribute bonuses (positive/negative), and is optimized for real-time performance using dirty flags and sparse indices.

To implement the **Dirty Flag** logic, we need to ensure the system is thread-safe (if necessary) and handles missing entries gracefully. Below is the implementation using your specified steps.

### Implementation

I have assumed that `_cache` is a `Dictionary<int, Dictionary<string, CacheEntry>>` where `CacheEntry` is a struct containing the `CachedValue` and `IsDirty` flag.

```csharp
public float GetAttributeTotal(int entityId, string attributeName)
{
    // Ensure the entity and attribute exist in the cache
    if (!_cache.ContainsKey(entityId) || !_cache[entityId].ContainsKey(attributeName))
    {
        return 0f; // Return default if not found
    }

    ref CacheEntry entry = ref CollectionsMarshal.GetValueRefOrAddDefault(_cache[entityId], attributeName, out _);

    if (entry.IsDirty)
    {
        // 1. Perform the expensive summation loop
        // We aggregate all AttributeModifierComponent values for this entity
        float total = CalculateBaseAttribute(entityId, attributeName);
        var modifiers = GetComponentPool<AttributeModifierComponent>().GetForEntity(entityId);
        
        foreach (var modComponent in modifiers)
        {
            foreach (var mod in modComponent.Modifiers)
            {
                if (mod.Target == attributeName)
                {
                    total += mod.Value;
                }
            }
        }

        // 2. Store in CachedValue
        entry.CachedValue = total;

        // 3. Set IsDirty = false
        entry.IsDirty = false;
    }

    return entry.CachedValue; // O(1) return
}

```

### Key Technical Details

* **`ref` and `CollectionsMarshal**`: In the implementation above, I used `ref` (via `CollectionsMarshal.GetValueRefOrAddDefault` if using modern .NET) to ensure we are modifying the struct directly in the dictionary memory. This avoids copying the struct, modifying the copy, and forgetting to put it back into the dictionary.
* **Lazy Evaluation**: The expensive summation only triggers when `IsDirty` is `true`. Any system modifying an entity's gear or status effects must call `MarkDirty(entityId)` to reset this flag.
* **Performance**: By storing the result in `CachedValue`, subsequent calls to `GetAttributeTotal` are strictly `O(1)` memory access, which is ideal for performance-heavy game loops.

### How to use this with your systems:

Whenever an `AttributeModifierComponent` is added, removed, or has its values changed by an item equip/unequip or status effect change, simply trigger:

```csharp
public void MarkDirty(int entityId) {
    if (_cache.TryGetValue(entityId, out var attributes)) {
        foreach (var key in attributes.Keys) {
            // Use ref to modify the struct directly in the dictionary
            ref var entry = ref CollectionsMarshal.GetValueRefOrNullRef(attributes, key);
            if (!System.Runtime.CompilerServices.Unsafe.IsNullRef(ref entry)) {
                entry.IsDirty = true;
            }
        }
    }
}

```

This design ensures that your combat logic remains performant regardless of how many modifiers or status effects are stacked on your entities. Does this integration fit into your existing `FormulaProcessor` structure, or would you like to see how to handle the `EntityRegistry` notification system to automate the `MarkDirty` calls?


## Weapons

To handle additional effects like Poison or Fire damage, we must move away from "Hardcoded Weapon Attributes" and toward a **Component-Based Weapon System**.

In your ECS, a weapon is just an `Entity` (or a definition in `weapons.json`) that can hold multiple **Effect Components**.

### 1. JSON Design (Composition over Property)

Instead of adding fields like `IsPoisonous` or `FireDamage` to every weapon (which wastes memory), you define an `OnHitEffects` array. The `ComponentFactory` reads this and attaches the corresponding components to the entity upon equipping.

**`Data/Items/weapons.json`**

```json
{
  "12": { 
    "Name": "Spider-Fang Gladius", 
    "Damage": 14, 
    "WeaponType": "OneHandedMelee", 
    "OnHitEffects": [
      {
        "Tag": "PoisonStatusComponent",
        "Properties": { "DamagePerTick": 8.0, "TotalDuration": 5.0, "TickInterval": 1.0 }
      }
    ]
  },
  "25": {
    "Name": "Flaming Brand",
    "Damage": 10,
    "OnHitEffects": [
      {
        "Tag": "FireStatusComponent",
        "Properties": { "DamagePerTick": 5.0, "TotalDuration": 3.0 }
      }
    ]
  }
}

```

### 2. Architecture: The Effect Dispatcher

When the `ActionSystem` performs an "Attack," it doesn't just calculate damage. It checks if the weapon entity has an `OnHitEffects` component.

**`Core/Actions/AttackAction.cs`**

```csharp
public void Execute(int attackerId) {
    var weaponId = registry.GetWeapon(attackerId);
    var effects = weaponData[weaponId].OnHitEffects;

    // 1. Calculate Base Damage (FormulaProcessor)
    // 2. Apply Damage to Target
    
    // 3. Dispatch Effects
    foreach (var effect in effects) {
        // Factory creates a new StatusEffect entity on the Target
        StatusEffectSystem.Apply(targetId, effect.Tag, effect.Properties);
    }
}

```

### 3. Why this design is "Real-Time RPG" ready:

* **Stacking Logic**: If a player uses a "Flaming Oil" item on their sword, you are effectively just adding a `FireStatusComponent` to the weapon's `OnHitEffects` list at runtime. The `AttackAction` loop will automatically detect it and apply both Poison and Fire.
* **Separation of Concerns**: The `weapons.json` only contains data. The `StatusEffectSystem` contains the logic for *how* poison ticks down or *how* fire spreads.
* **No Hardcoding**: You can create a "Frost Sword" by simply creating a new `FrostStatusComponent` in `status_effects.json` and adding it to the `OnHitEffects` array in `weapons.json`. No changes to `AttackAction.cs` are ever needed.

### 4. Implementation Checklist

* **StatusEffectRegistry**: A registry that maps the `Tag` (e.g., `PoisonStatusComponent`) to a specific `IEffect` implementation.
* **Lifecycle Management**: Since these effects have durations (`TotalDuration`), the `StatusEffectSystem` must iterate through all active effects, reduce their `RemainingDuration`, and remove the component from the entity when it hits zero.

This approach creates a **"Plugin" architecture** for your items—where the weapon is just a host for modular combat behaviors. Would you like to see how to implement the `StatusEffectSystem` to ensure it handles multiple overlapping effects (e.g., a target being poisoned AND on fire simultaneously) without performance degradation?

## Status Effect System

To implement a **StatusEffectSystem** that handles multiple concurrent effects (e.g., being both "Poisoned" and "Empowered") without performance degradation, we focus on **Component-based Lifecycle Management**.

### 1. The Design: Component-Based Effects

Instead of a complex list of state variables, we treat every status effect as a **Component** attached to the Entity. If an NPC has three effects, it simply possesses three `StatusEffectComponent` instances in its memory pool.

### 2. Implementation: The System Loop

The `StatusEffectSystem` is responsible for updating these components every tick and removing them when the duration reaches zero.

**`Core/Systems/StatusEffectSystem.cs`**

```csharp
public class StatusEffectSystem {
    public void Update(float deltaTime) {
        // Query only entities that have status effects using the EntitySieve
        var activeEffectEntities = _entitySieve.GetEntitiesWithMask(ComponentMasks.StatusEffect);
        
        foreach (var entityId in activeEffectEntities) {
            var effects = _registry.GetComponents<StatusEffectComponent>(entityId);
            
            foreach (var effect in effects) {
                effect.RemainingDuration -= deltaTime;
                
                if (effect.RemainingDuration <= 0) {
                    _registry.RemoveComponent(entityId, effect);
                    _registry.MarkDirty(entityId); // Trigger re-calculation
                }
            }
        }
    }
}

```

### 3. Why this scales (Performance)

* **Sparse Iteration**: By using the `EntitySieve` (bitmask filtering), the system only iterates over entities that actually have active status effects. It completely ignores NPCs that are healthy, resulting in near-zero cost for idle entities.
* **No "Update" Bottleneck**: Since each effect is a component, the `StatusEffectSystem` is essentially a high-performance tight loop that only performs simple floating-point subtraction, which is highly friendly to CPU cache and branch prediction.
* **Stacking Native Support**: Because you are adding multiple components, "Poison" and "Fire" exist as separate memory blocks. They do not interfere with each other, and they don't require `if-else` chains to manage.

### Summary of the Lifecycle

1. **Application**: When an attack lands, the `AttackAction` dispatches a `StatusEffectComponent` to the target.
2. **Dirty Flag**: The system calls `MarkDirty(entityId)` to invalidate the `AttributeTotal` cache.
3. **Simulation**: The `StatusEffectSystem` subtracts time during every `Update` call.
4. **Removal**: Once `RemainingDuration <= 0`, the component is removed, and the entity is marked as "Dirty" again to revert the attribute bonuses/penalties.

This modular design means that if you want to create a new effect—like "Frost" which slows movement—you just create a `FrostStatusComponent`, define the duration in `status_effects.json`, and the system will handle it automatically without you writing any custom code for that specific effect.

Does this lifecycle satisfy your performance requirements for the RPG combat loop, or would you like to explore how to **serialize** these active status effects (saving the game) in a way that respects your data-driven architecture?
