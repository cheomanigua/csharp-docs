# Core Principles of DoD

To integrate your **Flat Array + Index Map** approach into the documentation, we need to clarify that this is the final layer of your optimization strategy. It replaces the old "hardcoded field" approach (e.g., `stats.Health`) with a data-driven "Index Map" (e.g., `stats.Values[idx]`).

Here is your fully refactored `principles.md` incorporating this pattern.

---

# Core Principles of DoD

This documentation serves as your technical reference for the **System-Based Command Pipeline**, **Registry Pattern**, and **Flat Array + Index Map** architecture.

---

## 1. Core Architecture: System-Based Command Pipeline

The engine operates on a decoupled architecture where data definitions, logic processing, and presentation are strictly separated.

### The Execution Loop

1. **Command Enqueueing**: External sources push `GameCommand` objects into the `CommandQueue`.
2. **System Processing**: During the `Tick(float deltaTime)`, the `EngineDriver` triggers specific `Systems`.
3. **Data Mutation**: Logic results are written to the `EntityRegistry`, which acts as the "Source of Truth."
4. **View Synchronization**: The `RenderSystem` uses a `GameViewAdapter` to project registry data onto the UI.

---

## 2. Structural Patterns

### The Registry Pattern (ECS Foundation)

We use the **Registry Pattern** to manage the entity lifecycle. It abstracts away memory management, providing a stable interface for systems to query entities.

### Flat Array + Index Map (Data-Driven Schema)

This is the heart of your engine’s flexibility. Instead of hardcoding properties like `Strength` or `Intelligence` into your structs (which requires a recompile to change), we use a **Flat Array + Index Map** strategy.

* **Flat Array**: Your `CharacterStats` component contains a single, contiguous array: `int[] Values`.
* **Index Map (`StatRegistry`)**: At startup, the `StatRegistry` parses `StatsDefinition.json` to create a map of `string` names to `int` indices (e.g., "Strength" → `0`, "Intelligence" → `1`).
* **Dynamic Access**: Systems and the View layer look up the index via `StatRegistry` and access the `Values` array at that index. This allows you to add stats (e.g., "Dexterity") purely by modifying JSON, with zero changes to core C# classes.

### The Adapter/DTO Pattern (Decoupling)

To prevent the high-performance `EntityRegistry` from being tightly coupled to UI, we use **Adapters**:

* **GameViewAdapter**: Uses the `StatRegistry` to translate the `Values` array indices back into named properties for the `CharacterSheetDto`. This shields the UI from the underlying storage mechanism.

---

## 3. Data-Driven Initialization Pipeline

We decouple entity blueprints from C# logic, allowing for rapid balancing via JSON.

1. **Blueprint Resolution**: The `StatInitializationSystem` reads the `Class` and `Race` definitions.
2. **Mapping**: Instead of hard-coded property assignment, it iterates through the `StatRegistry` indices, pulling data from JSON records and flattening them into the component's `Values` array.

---

## 4. Dynamic Modifiers (Dirty Flag Pattern)

To maintain $O(1)$ performance, we avoid constant recalculation. When equipment is added, the system sets `IsDirty = true`. The combat engine only performs the heavy lifting of summing equipment modifiers if this flag is set.

---

## 5. Performance vs. Schema Flexibility

| Layer | Function | Performance |
| --- | --- | --- |
| **Flat Array (`Values[]`)** | Contiguous memory for stats. | **Maximum (CPU cache friendly)** |
| **Index Map (`StatRegistry`)** | Maps Names to Indices. | **High (O(1) lookup)** |
| **JSON Definitions** | Runtime Data (Classes/Races). | **Maximum Flexibility** |

### Why This is Robust

By moving from hardcoded properties to the **Flat Array + Index Map** pattern, you have achieved the **Open/Closed Principle**: the system is *open* to adding new attributes (via JSON updates) but *closed* to modifications of the core engine code.

---

## 6. Architectural Patterns Summary

* **Command Pattern**: Enables asynchronous logic and replayability.
* **Strategy Pattern**: `IGameView` implementation allows swapping UI backends without changing engine logic.
* **Adapter Pattern**: The `GameViewAdapter` is the vital translation layer that keeps high-performance memory structures decoupled from the UI's data presentation needs.

---

### The Decoupled Path

* **Registry Pattern** manages *how we store it*.
* **Flat Array + Index Map** manages *how we identify it* dynamically.
* **Adapter/DTO Pattern** manages *how we share it* with the outside world.
* **System-Based Pipeline** manages *how we process it*.
