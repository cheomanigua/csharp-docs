# Design Patterns

# Design Patterns for Game Development

This documentation breaks down design patterns into two distinct sections: **Classical Design Patterns**—foundational templates derived from Object-Oriented software engineering—and **ECS-Friendly Design Patterns**—re-engineered templates that leverage C# high-performance low-level memory constructs like `struct`, `ref`, `in`, and `Span<T>` to maintain continuous memory data locality and eliminate cache misses.

---

# Classical Design Patterns

## 1. Abstract Factory Pattern

* **Best For:** Creating families of related components or objects without tying your execution pipeline to concrete runtime implementation classes.
* **How It Works:** Your execution systems rely entirely on an interface contract (`IWeaponFactory`). This ensures you can seamlessly alter weapon blueprints, configurations, or engine representations dynamically without modifying your core simulation loop.

```csharp
public interface IWeaponFactory 
{
    IWeaponBehavior CreateLaserBehavior();
    IWeaponBehavior CreateMissileBehavior();
}

public class GameWeaponFactory : IWeaponFactory
{
    public IWeaponBehavior CreateLaserBehavior() => new LaserBehavior();
    public IWeaponBehavior CreateMissileBehavior() => new MissileBehavior();
}

```

## 2. Command Pattern

* **Best For:** Encapsulating specific operational behavior rules into standalone, transactional data capsules to eliminate hard-coded function dependencies.
* **How It Works:** Every simulation shift or input action implements a uniform command blueprint. This decouples the system invoking an action from the objects being manipulated, enabling replay recordings, historical fast-forwarding, or immediate single-shot evaluation.

```csharp
public interface ICommand
{
    void Execute(ref ShipData ship);
}

public class RepairShieldCommand : ICommand
{
    private readonly int _amount;
    public RepairShieldCommand(int amount) => _amount = amount;

    public void Execute(ref ShipData ship)
    {
        ship.ShieldHealth += _amount;
    }
}

```

## 3. Strategy Pattern

* **Best For:** Varying or swapping an object's operational algorithms or modes at runtime without altering the physical structures using them.
* **How It Works:** You isolate an algorithm into its own execution class interface. The calling context retains a reference pointer to that interface and triggers its functionality polymorphically.

```csharp
public interface IFireStrategy
{
    void Fire(int weaponEntityId);
}

public class LaserFireStrategy : IFireStrategy
{
    public void Fire(int weaponEntityId) => Console.WriteLine($"Entity {weaponEntityId} fired Lasers!");
}

public class WeaponSubsystem
{
    public IFireStrategy ActiveFireStrategy { get; set; }
    public void ExecuteAttack(int entityId) => ActiveFireStrategy?.Fire(entityId);
}

```

## 4. Prototype Pattern

* **Best For:** Creating copies or instances of complex configuration archetypes by cloning an existing blueprint rather than recalculating parsing loops from scratch.
* **How It Works:** An object exposes a deep cloning operation. The runtime environment duplicates this configuration template and alters only the distinct properties that are unique to the new instance.

```csharp
public interface IPrototype<T> { T Clone(); }

public class ShipPreset : IPrototype<ShipPreset>
{
    public string HullIdentifier { get; set; }
    public int MaxShieldCapacity { get; set; }
    
    public ShipPreset Clone() => new ShipPreset { HullIdentifier = this.HullIdentifier, MaxShieldCapacity = this.MaxShieldCapacity };
}

```

---

# ECS-Friendly Design Patterns

When building an Entity Component System (ECS), using standard managed objects (`class`) introduces reference pointers that scatter your data randomly across the Managed Heap, triggering catastrophic CPU cache misses.

To preserve **Data Locality**, components must be written as **unmanaged value structures (`struct`)** stored inside sequential, contiguous arrays. Systems then iterate across these structures using `Span<T>` for zero-allocation memory window sub-setting, `ref` parameters to mutate sequential structs directly in-place without stack copies, and `in` modifiers to read data at maximum hardware speed safely without mutation capabilities.

## 1. Flyweight Pattern

* **Best For:** Eliminating memory consumption and performance degradation when processing thousands of active components that share heavy configuration metadata profiles.
* **How It Works:** Component data is divided strictly into **Intrinsic state** (shared, read-only static parameters stored once in a lookup collection) and **Extrinsic state** (lightweight, value-type variables unique to that entity instance).

```csharp
// Intrinsic Data Footprint: Managed asset cached once in memory globally
public class WeaponDefinition { public string SpritePath { get; set; } public float BaseCooldown { get; set; } }

// Extrinsic Data Footprint: Pure value type struct packed continuously inside ECS arrays
public struct WeaponComponent
{
    public int EntityId;
    public int DefinitionIndex; // Direct index pointer to the shared Flyweight asset array
    public float CurrentCooldownTimer;
}

```

## 2. Observer Pattern (Signals / Events)

* **Best For:** Syncing raw data mutations computed by background simulation systems with rendering frameworks (like Godot or UI viewports) without polluting the data layer with visual dependencies.
* **How It Works:** Traditional C# events inside classes break the value semantics of structs and prevent contiguous allocation. Instead, an ECS-friendly observer registers structural dirty states or queues events inside specialized reactive ring buffers that visual systems process sequentially at the end of a simulation frame.

```csharp
public struct ShieldComponent
{
    public int CurrentShields;
    public bool IsDirty; // Structural flag monitored by reactive Viewport systems
}

public class VisualSyncSystem
{
    public void UpdateVisuals(ReadOnlySpan<ShieldComponent> shields, GodotShieldNode[] viewNodes)
    {
        for (int i = 0; i < shields.Length; i++)
        {
            // The 'in' modifier reads the struct by reference, preventing any copy overhead
            in var shield = ref shields[i]; 
            if (shield.IsDirty)
            {
                viewNodes[i].UpdateProgressBar(shield.CurrentShields);
            }
        }
    }
}

```

## 3. Component Tag Pattern (The High-Performance "State" Alternative)

* **Best For:** Implementing dynamic entity states, behaviors, or group classifications without introducing processor branch mutations (`if/else` or `switch` blocks) inside execution loops.
* **How It Works:** Instead of using state classes or enum values inside a data component, states are represented by **empty value structs (Tags)**. Systems query specific memory chunks containing only entities that possess the required tag struct, ensuring linear execution pipelines across uniform arrays.

```csharp
// Zero-sized structural tags used solely for system filtering boundaries
public struct AggressiveTag {}
public struct EvadingTag {}

public struct AggressiveMovementSystem
{
    // This system processes a dense memory span containing ONLY entities with the AggressiveTag
    public void Update(Span<PositionComponent> positions, ReadOnlySpan<AggressiveTag> tags)
    {
        for (int i = 0; i < positions.Length; i++)
        {
            ref var pos = ref positions[i];
            pos.X += 1.5f; // Pure, unbranched stream execution optimized for CPU pipelining
        }
    }
}
```

## 4. Mediator Pattern

* **Best For:** Managing communication pipelines between fully separate simulation managers or job systems while maintaining absolute decoupling across structural data frameworks.
* **How It Works:** Systems do not reference or call into other systems. Instead, systems write simple data structures (events) into native, unmanaged transaction buffers or message queues. A central mediator dispatcher drains these buffers and routes the slices to dependent processing pipelines.

```csharp
public struct CollisionEvent
{
    public int EntityA;
    public int EntityB;
}

public class SystemMessageMediator
{
    // A flat contiguous event channel backing store
    private CollisionEvent[] _collisionQueue = new CollisionEvent[1024];
    private int _eventCount = 0;

    public void BroadcastCollision(in CollisionEvent evt) => _collisionQueue[_eventCount++] = evt;

    public Span<CollisionEvent> FetchCollisions() => _collisionQueue.AsSpan(0, _eventCount);
    public void ClearChannels() => _eventCount = 0;
}
// PhysicsSystem appends collisions to the Mediator; DamageSystem drains the Span sequentially!

```

---

### Summary of Performance Architecture Fit

| Pattern | Where it Lives | C# Implementation Engine | Performance Advantage |
| --- | --- | --- | --- |
| **Flyweight** | Model / Registry | `struct` + `int` indices into data arrays | Eliminates garbage collection pressure and minimizes memory footprint size. |
| **Observer** | Engine Boundaries | `Span<T>` + dirty bits or structural tracking rings | Alerts viewports while ensuring model data arrays remain flat and sequentially dense. |
| **State** | Behavior Systems | `enum` component labels + query filters | Maximizes CPU instruction pipelining by grouping identical state behaviors together. |
| **Mediator** | System Controllers | Flat unmanaged `struct` transaction arrays | Stops interconnected systems from tangling without introducing reference object overhead. |
