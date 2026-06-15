# TODO

# Sequential ID Allocator

To ensure your Entity IDs are strictly sequential, you need to stop generating them randomly and instead use an **ID Allocator** (or "Entity Manager") that tracks which IDs are currently in use and which are free.

### 1. The Sequential ID Allocator

Create a simple class that maintains a "next ID" counter and a stack of "recycled" IDs. This ensures that every time you spawn an entity, it gets the lowest available sequential number.

```csharp
public class EntityAllocator
{
    private int _nextId = 0;
    private readonly Stack<int> _recycledIds = new();

    public int Allocate()
    {
        // If we have recycled IDs, reuse them first to keep the sequence tight
        if (_recycledIds.Count > 0)
            return _recycledIds.Pop();
            
        // Otherwise, issue a new sequential ID
        return _nextId++;
    }

    public void Free(int id)
    {
        _recycledIds.Push(id);
    }
}

```

---

### 2. Integration into your ECS

Your `EntityRegistry` should hold this allocator. When your systems request to spawn an entity, they talk to the registry, which provides the ID.

```csharp
public class EntityRegistry
{
    private readonly EntityAllocator _allocator = new();
    
    public int CreateEntity()
    {
        int id = _allocator.Allocate();
        // Initialize any data structures for this new ID
        return id;
    }

    public void DestroyEntity(int id)
    {
        // Logic to clear entity data
        // ...
        _allocator.Free(id);
    }
}

```

---

### 3. Why this achieves "Perfect Packing"

When you use a random ID (like `1005`), your `Rid[] _entityToRid` array has to be at least 1006 elements long, with 1005 of those slots wasted. By using a sequential allocator:

* **Memory Density**: If you have 100 entities, you only need an array of size 100.
* **Cache Locality**: When you iterate over your entities in a `for` loop (e.g., `for (int i = 0; i < entityCount; i++)`), the CPU hardware prefetcher detects the sequential memory access pattern and loads the next entity data into the cache *before* you even ask for it.

### Essential Rules for Sequential IDs

* **Don't skip**: Never use `ID = 999` for a specific "boss" character. If you need special logic for a boss, store that in a `BossComponent` or a tag, but let the entity ID remain sequential.
* **Reuse**: Always use the `Free()` / `Recycle` pattern shown above. If you just increment `_nextId` forever, you will eventually run out of memory or exceed your array bounds.
* **Initialization**: When your `EngineDriver` starts, the `EntityRegistry` starts the `_nextId` at 0.

By implementing this, your arrays will be perfectly packed, and your `DrawMesh` method will access memory in a smooth, linear fashion, which is the "Gold Standard" for ECS performance.

**Would you like to see how to integrate this `EntityAllocator` into your `EngineDriver` logic so that spawning an entity is handled automatically?**

* * *

# Drawing Canvas

Currently, your `GodotService` code is set up to **position and transform** an entity, but it doesn't have the instructions to actually **draw the visual pixels (the "mesh")** for that entity.

Right now, if you run the game, the `RenderingServer` is creating invisible nodes and moving them around perfectly, but they have no "paint" on them.

### What it is supposed to render

To make your entities visible, you need to add drawing commands inside the `DrawMesh` method. Depending on what you want your entities to look like, you have three common options:

#### 1. A Simple Colored Square (Easiest)

If you want to render a debug box for each NPC/Entity:

```csharp
// Inside your DrawMesh method, after setting the transform:
RenderingServer.CanvasItemClear(canvasItem); // Clear previous frame
RenderingServer.CanvasItemAddRect(
    canvasItem, 
    new Rect2(-16, -16, 32, 32), // 32x32 square centered on the origin
    Colors.White
);

```

#### 2. A Texture (Sprite)

If you want to render an actual image file (like an NPC sprite):

```csharp
// Inside your DrawMesh method:
var texture = GD.Load<Texture2D>("res://assets/npc_sprite.png");
RenderingServer.CanvasItemClear(canvasItem);
RenderingServer.CanvasItemAddTextureRect(
    canvasItem, 
    new Rect2(-16, -16, 32, 32), 
    texture.GetRid()
);

```

#### 3. A Custom Mesh (ECS Style)

If you are doing high-performance rendering for hundreds of entities, you would use `CanvasItemAddMesh`.

---

### Why this is happening

In low-level `RenderingServer` logic, **Transforming** and **Drawing** are two separate steps:

* **`CanvasItemSetTransform`**: Tells the engine *where* the entity is in the world (this is what your code does now).
* **`CanvasItemAdd...`**: Tells the engine *what* the entity looks like (this is what you are missing).


### Key Details

* **`CanvasItemClear(rid)`**: This is critical. If you omit this, `CanvasItemAddRect` will add a *new* rectangle on top of the old one every single frame. Your game would render thousands of squares in the same spot, leading to a massive performance hit and a visual blur.
* **Centered Coordinates**: Using `new Rect2(-16, -16, 32, 32)` ensures the square is drawn centered on the entity's position (the origin). If you used `(0, 0, 32, 32)`, the square would be drawn to the bottom-right of the entity's actual coordinates.
* **Performance Note**: While `Clear` and `AddRect` are very fast, for hundreds of entities, you might eventually want to cache the "Mesh" or "Texture" so you aren't sending the draw command every single frame. For now, this is the most reliable way to get visual feedback.
