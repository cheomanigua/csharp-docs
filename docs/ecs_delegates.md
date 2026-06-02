# ECS Delegates

To understand how **Delegates** would fit into what we have built, we have to look at the architectural philosophy of our Entity Component System (ECS).

In traditional Object-Oriented Programming (OOP), delegates are often used as "Event hooks" (e.g., `onDeath`, `onTakeDamage`). However, attaching C# delegates directly to entities or components in an ECS can introduce subtle architectural traps.

Let’s explore how standard OOP delegates work, why they clash with an ECS memory layout, and how we can implement a **Data-Oriented Event System** (the ECS equivalent of a delegate) that keeps your engine fast and data-driven.

## 1. The Standard OOP Delegate (The Clash)

A C# `delegate` (or `Action` / `Func`) is an object reference under the hood. If you were to add a delegate directly to your component definitions, you would break the flat, cache-friendly data structures we spent time setting up.

```csharp
// ❌ THE BAD CLASH: Attaching a delegate to a structural component
public struct StatsComponent
{
    public int Health;
    public int Mana;
    
    // This turns a pure value struct into a vehicle for hidden reference types!
    public Action<int> OnHealthChanged; 
}
```

#### Why this hurts an ECS engine:

1. **Destroys Cache Locality:** A delegate holds a pointer to a method on an object instance residing somewhere on the **Heap**. When your system loops through the `StatsPool`, instead of purely processing predictable integers, the CPU is forced to look up dynamic heap addresses, inducing CPU cache misses.
2. **Memory Leaks & Garbage Collection:** Every time an object subscribes to a delegate (e.g., `stats.OnHealthChanged += uiView.UpdateDisplay`), it creates a strong reference loop. If an entity is destroyed but the UI view doesn’t explicitly unsubscribe, the entity cannot be cleaned out of memory, causing a classic memory leak.
3. **Breaks Data-Serialization:** You cannot easily save a delegate's state to `savegame.json`. A delegate represents a temporary runtime instruction address, making it impossible to data-drive.

## 2. The ECS Solution: "Reactive" Event Buffers (Data-Oriented Delegates)

Instead of using traditional C# delegates to say *"Hey UI, execute your update method right now because this character took damage,"* an ECS handles events using **Data Markers**.

Instead of an active callback trigger, we push a temporary `struct` into a global array. This is known as a **Reactive Event Pattern**.

#### Step A: Define the Event Component (`Core.cs`)

```csharp
// A pure value-type event notification
public struct DamageEventComponent
{
    public int TargetEntityId;
    public int DamageAmount;
}
```

#### Step B: Raise the Event inside the System (`Systems.cs`)

When your `CombatSystem` reduces an entity's health, it doesn't invoke a delegate function. It writes a record into an event buffer:

```csharp
public class CombatSystem
{
    // A fast queue or pre-allocated array list to hold event data for the frame
    public List<DamageEventComponent> FrameDamageEvents = new();

    public void ProcessAttack(in Entity attacker, in Entity target, string skillId)
    {
        // ... calculation logic ...
        ref var targetStats = ref _registry.StatsPool[target.Id];
        targetStats.Health -= finalDamage;

        // "RAISING THE EVENT": Just record the raw data! Zero heap allocations!
        FrameDamageEvents.Add(new DamageEventComponent 
        { 
            TargetEntityId = target.Id, 
            DamageAmount = finalDamage 
        });
    }
}
```

#### Step C: The View Consumes the Data (`Program.cs` / View Layer)

At the end of the frame execution block, your UI/View system queries this event array buffer. It loops through the recorded events sequentially, updating the display seamlessly:

```csharp
public class UiRenderSystem
{
    public void UpdateVisuals(List<DamageEventComponent> activeEvents)
    {
        // Cache-friendly sequential processing of all events that occurred this frame
        foreach (var evt in activeEvents)
        {
            Console.WriteLine($"[UI ALERT] Entity {evt.TargetEntityId} flash red! Lost {evt.DamageAmount} HP!");
        }
    }
}
```

At the very end of the frame tick, you simply clear the `FrameDamageEvents` list via `.Clear()`. The memory footprint drops back to zero, avoiding any garbage collection stress.

## 3. Where Delegates *Are* Great in Your Architecture

While you shouldn't store delegates inside your components, there is one area where delegates are extremely powerful in a data-driven engine: **The Command Router**.

If you are building your **Crime Investigation Game**, NPCs will want to perform various unique behaviors (e.g., `GoToSleep`, `SearchForClues`, `TalkToWitness`). Instead of writing a massive, hardcoded `switch` block containing hundreds of lines inside an AI system, you can map text keys directly to system delegates inside a dictionary registry at startup:

```csharp
// Maps an action keyword string from a JSON routine to an executable delegate method
private Dictionary<string, Action<Entity>> _aiActionRegistry = new();

public void InitializeAiBehaviors()
{
    // Registering decoupled structural functions as delegates
    _aiActionRegistry["GoToSleep"] = ExecuteSleepRoutine;
    _aiActionRegistry["SearchForClues"] = ExecuteClueSearch;
}

private void ExecuteSleepRoutine(Entity entity)
{
    ref var stats = ref _registry.StatsPool[entity.Id];
    stats.Mana += 10; // Sleep recovers energy resources
    Console.WriteLine($"Entity {entity.Id} is now sleeping.");
}

```

When an NPC’s routine file instructs them to `"GoToSleep"`, your engine queries this dictionary using the text string, retrieves the delegate method pointer, and executes it instantly.

### Summary

* **Inside Components/Pools:** Avoid delegates completely. Use value-type event structures (`struct Event`) to pass notifications downstream via flat arrays. This keeps your game loop zero-allocation and cache-aligned.
* **Inside System Registries:** Use delegates as routing tables to cleanly bind human-readable JSON action keywords directly to your high-performance execution methods at boot time.

* * *

# Godot

You absolutely can bypass Godot’s built-in Signal system entirely and drive the engine solely as a passive View layer using your high-performance, custom reactive event buffers.

In fact, if you want to implement a strict MVC split where your core gameplay engine is written in pure C# (completely separated from Godot's API), avoiding Signals is highly recommended. It keeps your simulation logic entirely decoupled and incredibly fast.

Here is how you can completely replace Godot's traditional event pipeline with your ECS reactive event buffers, how to structure the layout, and the massive advantages it provides for your humble-scope simulation and RPG games.

## The Architecture: Turning Godot into a Passive View

In a standard Godot project, scripts inherit from `Node` or `CharacterBody2D`, and they communicate using C# Events or Godot Signals (`EmitSignal`). This tightly binds your core game rules to Godot's scene tree.

When using Godot strictly as an **MVC View**, Godot ceases to be the "owner" of your game. It becomes a glorified graphics/audio terminal.

1. **Your Pure C# ECS** updates health pools, processes missile routes, tracks crime clues, and populates value-type **Event Buffers**.
2. **Godot Nodes** check those buffers once per frame, look at what changed, update animations, play sounds, and clear the data.

## Step-by-Step Implementation

Let's look at how your pure C# core communicates with a Godot graphic representation without using a single signal.

#### 1. The Pure C# Event Structure (`Core.cs` / Model)

We establish a simple struct to track whenever any entity takes damage inside our decoupled backend simulation space.

```csharp
namespace PureSimulation.Core
{
    // High-performance value type event token
    public struct VisualDamageEvent
    {
        public int EntityId;
        public int DamageAmount;
        public int RemainingHp;
    }
}
```

#### 2. The Pure C# Combat System (`Systems.cs` / Controller)

When an attack processes, the system registers the event data straight into a pre-allocated array list buffer.

```csharp
using System.Collections.Generic;
using PureSimulation.Core;

namespace PureSimulation.Systems
{
    public class CombatSystem
    {
        // Our raw event buffer. Godot will read from this slice of memory.
        public List<VisualDamageEvent> VisualEventsBuffer { get; } = new();

        public void DealDamage(int attackerId, int targetId, int rawDmg)
        {
            // ... calculate dynamic simulation rules ...
            
            // Log the event data flatly
            VisualEventsBuffer.Add(new VisualDamageEvent
            {
                EntityId = targetId,
                DamageAmount = rawDmg,
                RemainingHp = 120 // updated HP data
            });
        }
        
        public void ClearFrameEvents()
        {
            VisualEventsBuffer.Clear(); // Flushes the buffer back to 0 memory overhead
        }
    }
}
```

#### 3. The Godot UI/Entity View (`GodotView.cs` / View)

Instead of subscribing to a Godot signal via code, your main loop script or a specific UI manager node reads the system's event buffer during Godot's default `_Process` loop.

```csharp
using Godot;
using System;
using PureSimulation.Systems;
using PureSimulation.Core;

public partial class BattleScreenView : Node2D
{
    // References to your custom, pure C# backend systems
    private CombatSystem _simulationCombatSystem;

    public override void _Ready()
    {
        // Bootstraps your background C# engine structures
        _simulationCombatSystem = new CombatSystem();
    }

    public override void _Process(double delta)
    {
        // 1. Convert our simulation buffer into a lightning-fast ReadOnlySpan
        // This ensures Godot can inspect the data but can never mutate your engine states!
        ReadOnlySpan<VisualDamageEvent> frameEvents = _simulationCombatSystem.VisualEventsBuffer.ToArray();

        // 2. Consume the events sequentially 
        for (int i = 0; i < frameEvents.Length; i++)
        {
            VisualDamageEvent evt = frameEvents[i];
            
            // 3. Drive Godot visual features directly based on raw data!
            Node2D characterSprite = GetNode<Node2D>($"World/Entity_{evt.EntityId}");
            Label hpLabel = GetNode<Label>($"UI/Entity_{evt.EntityId}/HpBar");

            // Execute Godot rendering changes
            hpLabel.Text = $"HP: {evt.RemainingHp}";
            TriggerDamageFlashEffect(characterSprite); 
            SpawnFloatingTextPopUp(characterSprite.GlobalPosition, evt.DamageAmount);
        }

        // 4. Tell your background engine to wipe the event array clean for the next frame tick
        _simulationCombatSystem.ClearFrameEvents();
    }

    private void TriggerDamageFlashEffect(Node2D target) { /* Godot visual code */ }
    private void SpawnFloatingTextPopUp(Vector2 pos, int amt) { /* Godot UI code */ }
}
```

## Why this is a Massive Win for an Indie Developer

#### 1. Decoupled Automated Testing

Because your game logic contains zero Godot code, zero Godot Nodes, and zero Godot Signals, **you can run your entire simulation outside of the Godot Editor.** You can write formal xUnit tests or run automated simulation scripts inside a basic terminal console (`dotnet run`) to test your *Harpoon* naval rules or your *NPC routine* logic. Your engine becomes completely engine-agnostic; you could swap Godot out for Unity, MonoGame, or Raylib later by just re-writing your `_Process` render hooks.

#### 2. Massively Simplified Save/Load Architecture

Godot Signals can become complex when tracking dynamic runtime object states. If you spawn 100 missiles or 50 NPCs, keeping track of which signals connect to which target objects across memory space during a serialization step is notoriously difficult. With your reactive buffer setup, all game states live inside your clean sequential array pools. Saving your game is as simple as running a JSON serializer over your raw component database; the visual nodes will automatically snap to the correct graphics configuration on the next frame redraw anyway.

#### 3. Elimination of Godot Lifecycle Crashes

A common pitfall with standard Godot signals happens when an object is freed from memory (`QueueFree()`) while a signal is actively flying toward it, causing sudden runtime crashes or null reference errors. By shifting to a pull-based reactive buffer framework, Godot nodes safely query data arrays on their own clock. If a visual entity representation is missing or deleted from the screen, the processing loop simply skips rendering it, resulting in clean, robust code stability.

## Summary

If your game is driven by deep data systems rather than physics-heavy action mechanics, **using reactive buffers instead of Godot Signals is a fantastic architectural strategy.** It allows Godot to do exactly what it excels at (rendering, playing audio, displaying UI) while leaving your pure, high-performance C# code completely in control of the underlying logic and simulation rules.
