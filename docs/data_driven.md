# Data-Driven Game Architecture

A **Data-Driven Architecture** is a software design paradigm where a game's structural content, rules, stats, behaviors, and configurations are externalized into data files (such as JSON, XML, or CSV) rather than being hardcoded into compilation source files (`.cs`).

In a traditional code-driven model, creating a new item or balancing character stats requires changing code, recompiling, and redeploying the application. In a data-driven model, the executable engine acts as an agnostic virtual machine that reads external data structures at runtime to dynamically generate entities, construct environments, and map game parameters.

---

## The Core Data-Driven Workflow

```mermaid
graph LR
    JSON[External Data Blueprint: definitions.json] -->|1. Parsed at Runtime| Engine[Agnostic Logic Core / Factories]
    Engine -->|2. Dynamically Instantiated| ActiveModel[Game Simulation Runtime Memory]

```

### Why Data-Driven Design is Essential

1. **Zero-Recompilation Tweaks:** Game designers can balance weapons, add items, or adjust NPC schedules entirely in text files without requiring programming time or engine recompiles.
2. **Moddability:** The game core naturally supports community mods because the entire catalog of game assets and systems exists transparently outside the binary executable.
3. **Multi-Platform Consistency:** The same binary engine can run vastly different scenarios or total conversion packs simply by feeding it a different folder of JSON data blueprints.

---

# Integrated Blueprints: `definitions.json`

Below is a configuration file that outlines base assets for a sci-fi space simulation game. It includes definitions for ship variants, weapon loadouts, and global equipment profiles.

```json
{
  "ShipClasses": {
    "Interceptor": {
      "BaseHull": 200,
      "BaseShields": 150,
      "DefaultWeaponIndex": 10
    },
    "Cruiser": {
      "BaseHull": 1200,
      "BaseShields": 800,
      "DefaultWeaponIndex": 20
    }
  },
  "WeaponDefinitions": {
    "10": {
      "Name": "Pulse Laser",
      "BaseDamage": 15,
      "Cooldown": 0.4,
      "SpritePath": "res://art/weapons/pulse_laser.png"
    },
    "20": {
      "Name": "Plasma Battery",
      "BaseDamage": 120,
      "Cooldown": 3.5,
      "SpritePath": "res://art/weapons/plasma_battery.png"
    }
  }
}

```

---

# Data-Driven Design in an MVC Context

In a Model-View-Controller (MVC) architecture, data-driven design serves as the foundational mechanism for **Model Initialization** and **Agnostic Presentation Mapping**.

The **Controller** parses the external configuration data file and feeds it into an **Abstract Factory**. The factory outputs populated **Model data objects**. Crucially, the **View layer** uses indices or file pathways defined in the JSON configuration (such as `SpritePath`) to load assets from visual libraries at runtime. This prevents the backend Model or Controller from referencing hardcoded engine rendering pathways.

### C# Implementation: Data-Driven MVC

#### 1. The Strong-Typed Configurations (DTOs)

```csharp
using System.Collections.Generic;

public class GameConfigDto
{
    public Dictionary<string, ShipClassConfig> ShipClasses { get; set; }
    public Dictionary<int, WeaponDefConfig> WeaponDefinitions { get; set; }
}

public class ShipClassConfig
{
    public int BaseHull { get; set; }
    public int BaseShields { get; set; }
    public int DefaultWeaponIndex { get; set; }
}

public class WeaponDefConfig
{
    public string Name { get; set; }
    public int BaseDamage { get; set; }
    public float Cooldown { get; set; }
    public string SpritePath { get; set; }
}

```

#### 2. The Model, View, and Factory Setup

```csharp
using System;

// MVC MODEL: Holds data states, completely separate from Godot/Unity graphics
public class ShipModel
{
    public string ClassName { get; set; }
    public int CurrentHull { get; set; }
    public int CurrentShields { get; set; }
    public WeaponDefConfig WeaponBlueprint { get; set; } // Flyweight configuration reference
}

// MVC FACTORY / CONTROLLER ROUTINE
public class ShipFactory
{
    private readonly GameConfigDto _config;

    public ShipFactory(GameConfigDto loadedConfig) => _config = loadedConfig;

    public ShipModel CreateShip(string className)
    {
        if (!_config.ShipClasses.TryGetValue(className, out var shipClass))
            throw new ArgumentException($"Unknown class: {className}");

        var weaponDef = _config.WeaponDefinitions[shipClass.DefaultWeaponIndex];

        // Hydrates a dynamic Model instance from pure JSON configuration metrics
        return new ShipModel
        {
            ClassName = className,
            CurrentHull = shipClass.BaseHull,
            CurrentShields = shipClass.BaseShields,
            WeaponBlueprint = weaponDef
        };
    }
}

// MVC VIEW: Reads the model to bind graphics without hardcoding pathways
public class ShipViewNode
{
    public void RenderShipSprite(ShipModel model)
    {
        // View extracts the raw asset string path defined inside the data file
        string assetPath = model.WeaponBlueprint.SpritePath;
        Console.WriteLine($"[View Node Engine] Spawning visual sprite from file: {assetPath}");
    }
}

```

---

# Data-Driven Design in an ECS Context

When mapped directly into a pure Entity Component System (ECS), data-driven pipelines unlock massive hardware processing advantages.

Instead of generating separate, complex object allocations per blueprint, the ECS setup decomposes JSON attributes directly into **flat value type structures (`struct`)**. To enforce rigorous data locality and maximize the L1/L2 CPU cache, we apply the **Flyweight Pattern**. Components drop string objects entirely and store simple primitive integer indices pointing to flat configuration arrays. Systems stream through these contiguous value arrays with zero allocations, resolving stats on the fly via cache-friendly array indexing.

### C# Implementation: Data-Driven Performance ECS

```csharp
using System;

namespace DataDrivenEcs
{
    // ECS COMPONENT 1: Packed contiguously inside an array
    public struct CombatStatsComponent
    {
        public int EntityId;
        public int HullHP;
        public int ShieldHP;
    }

    // ECS COMPONENT 2: Employs Flyweight pattern to drop heavy managed reference weights
    public struct WeaponAttachmentComponent
    {
        public int EntityId;
        public int WeaponDefinitionId; // Plain index matching JSON 'WeaponDefinitions' keys
        public float ActiveCooldownTimer;
    }

    // ECS BLANK STATE SYSTEM: Processes flat value blocks sequentially with no cache-stalling pointers
    public class WeaponFireSystem
    {
        private readonly WeaponDefConfig[] _globalConfigLookup;

        public WeaponFireSystem(WeaponDefConfig[] configs) => _globalConfigLookup = configs;

        public void ProcessSystemTick(Span<WeaponAttachmentComponent> weapons, float deltaTime)
        {
            for (int i = 0; i < weapons.Length; i++)
            {
                ref var weapon = ref weapons[i];
                
                if (weapon.ActiveCooldownTimer > 0f)
                {
                    weapon.ActiveCooldownTimer -= deltaTime;
                    continue;
                }

                // Resolves unmanaged metrics on the fly using O(1) array indices loaded from raw JSON
                ref readonly var blueprint = ref _globalConfigLookup[weapon.WeaponDefinitionId];
                
                Console.WriteLine($"Entity {weapon.EntityId} fired data-driven weapon: {blueprint.Name} dealing {blueprint.BaseDamage} damage!");
                
                weapon.ActiveCooldownTimer = blueprint.Cooldown; // Reset timer from layout config
            }
        }
    }
}

```

---

# Summary of Framework Intersect

| Architectural Axis | Role of Data-Driven Configuration Data | Primary System Resolution |
| --- | --- | --- |
| **With MVC** | Decouples world asset layouts and platform graphics from compile-time structures. | **Abstract Factories** translate configuration parameters into decoupled data models and visual paths. |
| **With ECS** | Segregates static properties from runtime properties to protect continuous arrays. | **Flyweight Indices** link structs to layout configurations without splitting data across the Managed Heap. |
