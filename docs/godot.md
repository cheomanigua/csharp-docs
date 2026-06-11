# Godot Integration

To maximize productivity while maintaining the architectural integrity of your DOD/ECS project, embrace Godot features that act as **"Service Providers"** rather than **"Logic Managers."** By treating Godot as a low-level service layer, you avoid the "Node-is-the-Entity" trap and keep your simulation engine engine-agnostic.



### 1. The "Embrace Without Hesitation" List

* **`Input` (The Input Polling Service):** Godot’s input handling is robust and handles hardware abstraction for you. Do not use Node-based signals (`_input` or `_unhandled_input`), as they force you to use the `SceneTree`. Instead, use **polling** (`Input.IsActionPressed`) inside your C# `Controller`. This allows your systems to treat the "Input State" as just another piece of data passed into your loop.
* **`Transform2D` / `Vector2` (The Standardized Math Primitives):** These are pure, stack-allocated math structs. By using them in your ECS, you gain access to optimized rotation and affine transformation logic without any `Node` overhead. Because they are "blittable" (raw data), they serve as the perfect "currency" to pass directly from your C# `MovementSystem` to the `RenderingServer`.
* **`RenderingServer` (The GPU Interface):** Allows you to draw thousands of objects using raw data without touching a `Node`. You can create a `MultiMesh` and update its buffers directly from your C# `Span<Transform2D>`. It is the ultimate separation of View and Model.
* **`NavigationServer2D/3D` (The Spatial Service):** Baking navigation meshes is complex. Use Godot’s editor to define navigation regions, then treat the `NavigationServer` as a black box—query it for path waypoints and feed those back into your own C# `MovementSystem`.
* **`ResourceLoader` & `Resource` (The Data Manager):** Utilize Godot’s world-class asset management for textures, shaders, and audio. Your `Controller` simply uses string IDs to reference these assets, keeping your logic free from engine-specific asset types.
* **`PhysicsServer2D/3D` (The Static Query Service):** Use this **only for static world geometry** (e.g., walls, floors). By performing raycasts or shape-casts against the `PhysicsServer`, you resolve collisions against level geometry without needing to manage `CharacterBody2D` nodes for every single game entity.



### 2. Collision Strategy: PhysicsServer vs. Spatial Grid

A common architectural trap is attempting to use Godot’s physics bodies for high-density entities (like bullets or swarms). Instead, adopt a hybrid collision model:

#### The DOD Alternative: Spatial Grid Partitioning

For high-density dynamic entities (e.g., bullets, swarm enemies), implement a **Spatial Grid** inside your C# `Model`.

* **Why:** `PhysicsServer2D` overhead grows significantly with thousands of dynamic objects due to transformation syncing and collision state management. A Spatial Grid is a pure data-oriented structure ($O(N)$ complexity) that runs entirely in your CPU cache-friendly loops.
* **How:** Divide your world into a grid. Each frame, map `EntityIDs` to their respective grid cells. When resolving collisions, you only check entities within the same or adjacent cells.

#### The Hybrid Rule

| Collision Type | Use Case | Recommended Implementation |
| --- | --- | --- |
| **Dynamic-vs-Dynamic** | Bullets, Swarm Enemies | **C# Spatial Grid** (Custom logic) |
| **Dynamic-vs-Static** | Walls, Obstacles | **Godot `PhysicsServer2D**` (Query-only) |



### 3. The "Bridge" Strategy

To maintain separation, wrap Godot’s features in **Static Helper Facades**. This prevents engine-specific code (`using Godot;`) from infiltrating your core ECS logic.

#### Example: Rendering Facade

Instead of your `Controller` interacting directly with the `RenderingServer`, route data through an abstraction:

```csharp
// Inside your View Layer (Godot-specific code)
public static class ViewFacade {
    public static void SubmitRenderData(Span<Transform2D> transforms, Texture2D sprite) {
        // Here you interact with RenderingServer or MultiMesh
    }
}

```

#### Example: The Input Facade

```csharp
// Inside your View Layer
public static class InputFacade {
    public static bool IsActionTriggered(string action) => Input.IsActionJustPressed(action);
}

```


### Summary Checklist

| Godot Feature | How to embrace it | Why it's safe |
| --- | --- | --- |
| **Input** | `Input` (Polling) | Decouples input state from signals; easy to swap for other engines. |
| **Math Primitives** | `Transform2D` / `Vector2` | Pure math structs; zero overhead; no `SceneTree` dependency.. |
| **Rendering** | `RenderingServer` / `MultiMesh` | Decouples data from Nodes. |
| **Pathfinding** | `NavigationServer` | Only used for path data, not NPC logic. |
| **Assets** | `ResourceLoader` | Just provides data handles (IDs). |
| **Physics** | `PhysicsServer` | Used for querying static geometry only. |
| **Logic** | Spatial Grid (C#) | Optimized for high-density dynamic entities. |
| **Editor** | Inspector/Scene Editor | Use it to set up *static* world data only. |

### The "Golden Rule"

**Use Godot’s editors to define "Static Data" (maps, level layouts) and Godot’s Servers to perform "High-Cost Math" (NavMesh/Static Physics queries).** Never store your game's "Active State" (HP, inventory, bullet positions) in the SceneTree. By following this split—**Static Data in the Editor, Dynamic State in your C# Sieve**—you preserve both maximum performance and future-proof portability.
