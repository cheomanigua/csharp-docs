# Design Patterns

Written programs need to be flexible, easily maintainable, and reusable. A good program has been designed using GoF's design patterns. Design patterns apply for all OOP languages and all platforms.

In the case of indie game development, there are certain patterns that are used very commonly: Singleton, Composite, Factory, Strategy, State, Observer, Object Pool.  

#### Use case

- Object **Ship** can have dynamically added/removed components like: **Radar**, **Shield**, **Weapon**.
- There are different types of **Weapon**
- Each **Weapon** may have different types of **Ammo**
- **Ship** may be dynamically instantiated many times.

Which design patterns to use in such cases?

This is a classic use case for **composition over inheritance**, where entities like your `Ship` dynamically acquire behaviors via components. In **Godot 4 with C#**, you can apply **design patterns** to make this scalable, flexible, and easy to manage. Here’s a breakdown of relevant patterns and concepts, and how they apply:

### 1. Component Pattern (Composition over Inheritance)

**Use for:** Dynamically adding/removing behaviors like `Radar`, `Shield`, `Weapon`.

**How it works in Godot:**

* Each "component" (e.g., `Radar`, `Shield`, `Weapon`) is a `Node` or `Node2D` (depending on 2D/3D).
* Attach them as children to the `Ship` at runtime.
* Components should implement a common interface or base class like `IShipComponent`.

**C# Interface Example:**

```csharp
public interface IShipComponent
{
    void Initialize(Ship ship);
    void UpdateComponent(float delta);
}
```

Attach like this:

```csharp
public class Ship : Node2D
{
    private List<IShipComponent> _components = new();

    public void AddComponent(Node component)
    {
        AddChild(component);
        if (component is IShipComponent shipComponent)
        {
            shipComponent.Initialize(this);
            _components.Add(shipComponent);
        }
    }

    public override void _Process(double delta)
    {
        foreach (var component in _components)
        {
            component.UpdateComponent((float)delta);
        }
    }
}
```

### 2. Factory Pattern

**Use for:** Creating Weapons, WeaponTypes, AmmoTypes dynamically.

Instead of instantiating directly with `new`, use a factory that abstracts the creation logic based on parameters.

**Example:**

```csharp
public static class WeaponFactory
{
    public static Weapon CreateWeapon(string weaponType)
    {
        switch (weaponType)
        {
            case "Laser":
                return new LaserWeapon();
            case "Missile":
                return new MissileLauncher();
            default:
                throw new ArgumentException("Unknown weapon type");
        }
    }
}
```

You can also extend this by using **Resource-based** configurations in Godot (e.g., load `.tres` files per weapon).

### 3. Strategy Pattern

**Use for:** Weapon behavior (e.g., fire logic) or different ammo logic.

This separates the behavior of a weapon from its data.

```csharp
public interface IFireStrategy
{
    void Fire(Ship ship);
}

public class LaserFireStrategy : IFireStrategy
{
    public void Fire(Ship ship)
    {
        // laser firing logic
    }
}

public class Weapon : Node
{
    public IFireStrategy FireStrategy { get; set; }

    public void Fire()
    {
        FireStrategy?.Fire(this.GetParent<Ship>());
    }
}
```

This lets you plug-and-play firing logic per weapon or ammo type.

### 4. Prototype Pattern

**Use for:** Cloning ship configurations, or ammo/weapon setups.

If you want to duplicate a setup (e.g., same ship with Radar + Weapon A + Shield B), save that as a "prototype".

In Godot, this can be a `.tscn` scene you instantiate, or a C# object you clone.

### 5. Observer/Event Pattern

**Use for:** Communication between components (e.g., Radar detects enemy → Weapon fires).

Avoid tight coupling between components. Use events or signals.

```csharp
public class Radar : Node, IShipComponent
{
    public event Action<Vector3> OnTargetDetected;

    public void Scan()
    {
        // If target found:
        OnTargetDetected?.Invoke(targetPosition);
    }
}
```

Then `Weapon` subscribes to the radar's `OnTargetDetected`.

### 6. Service Locator / Dependency Injection (Optional)

Useful if you have shared services like logging, configuration, or object pooling.

### Bonus: ECS Alternative (Entity-Component-System)

If you want *more advanced* dynamic behavior, you could adopt an **ECS-like** approach (either manually or using 3rd-party Godot ECS libraries like **Godex**), but it’s often overkill for many games unless you're building something massive or simulation-heavy.

### Summary of Patterns to Use

| Pattern            | Use For                                        |
| ------------------ | ---------------------------------------------- |
| **Component**      | Add/remove dynamic behavior like Radar, Shield |
| **Factory**        | Create weapons/ammo types dynamically          |
| **Strategy**       | Vary behavior (like different fire modes)      |
| **Prototype**      | Clone ship configurations                  |
| **Observer/Event** | Decoupled communication between components     |
| (Optional) ECS     | Large-scale, performance-heavy systems         |

## Other Design Patterns

Given your strong alignment with classic software design patterns, your engine is in a fantastic position to expand. Because you have already cleanly separated your architecture using **MVC**, **ECS/Composition**, **Abstract Factory**, and **Command**, you have the perfect structural foundation to layer in a few more specialized patterns.

Here are the most useful design patterns for your specific setup, categorized by the exact architectural problem they solve:

### 1. For the Data-Driven Layer (`definitions.json`)

#### Flyweight Pattern (Structural)

* **The Problem:** Your `definitions.json` defines complex data structures like standard items (e.g., a "Golden Chalice" or "Monk Robe"). If you have dozens of copies of these items scattered across the Abbey, recreating all the static text, description strings, and default weight values for *every single instance* wastes memory and creates messy data duplication.
* **How it helps you:** You split your data into **Intrinsic** state (shared, static data from the JSON) and **Extrinsic** state (dynamic data unique to that specific instance).
* **The Application:** Your `Item` entity in the ECS only holds dynamic data (like an ID, a specific `PositionTrait`, or an `IsStolen` flag). It points to a single, shared `ItemDefinition` object cached in memory that holds the heavy, immutable data (like name, sprite paths, and base values).

### 2. For the MVC View & Real-Time Engine Sync

#### Observer Pattern (Behavioral)

* **The Problem:** Your simulation runs in real time, changing positions, giving NPCs traits, and mutating data. Your Godot visual layer (the View) needs to know *exactly* when these changes happen so it can update animations or move sprites, but you don't want your core C# logic to know anything about Godot nodes.
* **How it helps you:** It establishes a loose, decoupled broadcast system. The Model or Controller broadcasts an event, and anyone listening (the View) reacts.
* **The Application:** You can utilize native C# events or C# Godot Signals inside your components. When a `PositionTrait` updates its `CurrentRoomId`, it fires an `OnRoomChanged` event. Your Godot NPC node listens to that event and instantly triggers a pathfinding path to the new destination.

### 3. For Complex NPC Routines & Behaviors

#### State Pattern (Behavioral)

* **The Problem:** NPCs have different fundamental logic loops depending on what they are doing. An NPC who is "Working" behaves completely differently from an NPC who is "Panicked" or "Interrogated". Handing this with massive `if/else` or `switch` statements inside your `SimulationController` ruins scalability.
* **How it helps you:** It allows an object to alter its behavior when its internal state changes, encapsulating state-specific logic into clean, separate classes.
* **The Application:** Instead of evaluating all behavior globally, you create an abstract `INpcState` interface (e.g., `GatherHerbsState`, `InterrogatedState`, `DeadState`). The `SimulationController` simply calls `activeState.Update(npc, worldState)`. When a dynamic event happens (like a murder discovery), the NPC smoothly transitions to a `PanickedState` class, which completely rewrites how they generate commands.

### 4. For Decoupled Communication Between Systems

#### Mediator Pattern (Behavioral)

* **The Problem:** As your simulation grows, systems start needing to talk to each other. Your `TheftSystem` might need to alert the `AILogicSystem` to make characters suspicious, while simultaneously alerting the `UIConsoleSystem` to log a clue. If systems call each other directly, you get a tangled web of dependencies.
* **How it helps you:** It creates a central hub through which objects communicate, preventing objects from referring to each other explicitly.
* **The Application:** You introduce a `GameEventMediator`. When a theft occurs, the command doesn't call other systems. It simply posts a `TheftOccurredEvent` to the Mediator. The Mediator then distributes that event to any registered system that cares about thefts. Your core systems remain entirely decoupled from one another.

### Summary of Architectural Fit

| Pattern | Where it Lives | What it Optimizes |
| --- | --- | --- |
| **Flyweight** | Model / JSON Deserializer | Stops memory bloat by sharing immutable JSON definition data across multiple live entities. |
| **Observer** | Between Model and View | Seamlessly alerts Godot visual nodes when raw C# data traits change without coupling data to the engine. |
| **State** | Controller / AI Layer | Cleanly encapsulates complex, dynamic NPC behavior changes into modular, swappable routine classes. |
| **Mediator** | Controller / System Layer | Prevents your background simulation systems from tangling together as you add complex features. |

Would you like to look at a code sketch of how one of these specific patterns—like combining the **Observer** pattern with your ECS components to update Godot—would look in practice?
