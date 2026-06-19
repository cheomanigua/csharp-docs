# Level Design

# Authoring Tool + Data Consumer

To bridge your C# engine logic with Godot’s visual scene editor, you need to treat Godot as an **Authoring Tool** and your C# code as the **Data Consumer**.

### 1. How to use Godot-designed levels in C#

The most efficient way is to design your level as a `Node2D` or `TileMap` in Godot and have a "Bridge" script that exports the necessary metadata into a format your engine understands (like JSON or a custom binary file).

* **The Bridge Script**: Attach a `C#` script to the root node of your level scene. In the `_Ready()` method, iterate through your objects (Spawn Points, Walls, Enemies) and save their positions to a file.
* **Loading in Engine**: Your `Controller.cs` should load this file at startup instead of hardcoding entity positions. Your engine then populates the `SpatialGrid` based on these loaded coordinates.

### 2. How to know the size of the level

In Godot, you can determine the level size programmatically based on the visual elements present.

* **Using a Bound Rectangle**: Place a `ColorRect` or `StaticBody2D` acting as a "Level Bounds" node. In your Bridge script, you can query its size:
```csharp
// Inside your Godot C# script
var bounds = GetNode<ColorRect>("LevelBounds").GetRect();
var levelSize = bounds.Size; // This gives you width and height

```


* **TileMap Bounds**: If you use a `TileMap`, you can use `GetUsedRect()` to find the extents of all painted tiles automatically:
```csharp
var tileMap = GetNode<TileMap>("TileMap");
var rect = tileMap.GetUsedRect();
var size = rect.Size * tileMap.TileSet.TileSize;

```



### 3. Designing with the correct size in mind

To keep your engine and Godot in sync, use a **Grid-based Authoring Workflow**:

* **Define your `CellSize` as a Constant**: If your `EngineConfig` defines `CellSize = 100`, your Godot grid snap should be set to `100` pixels.
* **Visual Guides**: Create a "Master Scene" in Godot that contains a background grid sprite. When designing a level, ensure all static geometry (walls) aligns with this grid.
* **The "Arena" Pattern**: Design levels as "Arenas." Since you know your level size (from Step 2), pass this size to your `EngineDriver` during the loading phase so your `SpatialGrid` can allocate memory for the appropriate number of cells.

### Summary Workflow

1. **Design**: Build the level in Godot using grid-snapping that matches your engine's `CellSize`.
2. **Export**: Attach a "LevelExporter" script to the scene that iterates over nodes (e.g., all `Marker2D` nodes represent spawners) and writes their type and position to an `.json` file.
3. **Consume**: On boot, your `Controller` parses the `.json`, creates your internal entities, and sends them to the `SpatialGrid` via `Add(entityId, position)`.

By keeping the Godot visual data as the "source of truth" and exporting it to data your C# engine consumes, you get the best of both worlds: Godot's visual design tools and your engine's high-performance data-driven processing.

* * *

# Tilemad + Flattened 1D Array

Using a Godot `TileMap` and a flattened 1D array in your C# engine is a **perfect architectural match**.

Since you are moving toward manually generated levels, you can treat the Godot `TileMap` as the "Editor" and your C# array as the "Runtime Execution" structure.

### Why this is a great combo:

1. **Direct Mapping**: A `TileMap` is already a grid. Converting a Godot `(x, y)` tile coordinate to a 1D array index is a simple, high-performance operation: `int index = x + (y * MapWidth)`.
2. **Memory Layout**: By flattening your level into a 1D array, you ensure that the entire level's collision or metadata (e.g., "is this tile solid?") resides in a single, contiguous block of memory. This is extremely cache-friendly for your engine's `Tick` loop.
3. **Ease of Authoring**: You get to draw your levels visually in Godot, use their built-in grid snapping, and then "bake" that data into a simple array for your engine to consume.

### How to implement the bridge:

#### 1. Authoring in Godot

* Keep your **Grid Snap** in Godot the same as your engine’s `CellSize`.
* Assign **Custom Data** to your tiles (e.g., a boolean `is_solid` or an enum `terrain_type`) using Godot’s `TileSet` custom data layers.

#### 2. The Bridge (Exporter)

Create a small C# script in Godot that runs at the end of your design phase to "Export" the level:

```csharp
// Inside Godot
public void ExportLevel() 
{
    var tileMap = GetNode<TileMapLayer>("LevelLayer");
    var rect = tileMap.GetUsedRect();
    
    // Create a flat array representation
    int width = rect.Size.X;
    int height = rect.Size.Y;
    int[] levelData = new int[width * height];
    
    foreach (var pos in tileMap.GetUsedCells()) 
    {
        // Convert 2D coord to 1D index
        int index = (pos.X - rect.Position.X) + ((pos.Y - rect.Position.Y) * width);
        levelData[index] = GetTileId(tileMap, pos);
    }
    // Save levelData to JSON/Binary for your engine to load
}

```

#### 3. Execution in your Engine

When your engine loads this file:

* **Initialize the 1D Array**: Allocate exactly `width * height` slots.
* **Collision Checks**: When an entity checks for collisions, it doesn't need a `Dictionary` or `List`. It just calculates its `x/y` position, converts it to an array index, and checks the value in the array.

### The Performance Advantage

By using this 1D array for **static geometry** (walls, floors) and keeping your `SpatialGrid` (Dictionary-based) only for **dynamic entities** (NPCs, projectiles), you get the best of both worlds:

* **Static Geometry**: Near-instant lookups (no hashing, just index math).
* **Dynamic Entities**: Memory efficiency for objects that move around and don't fit into a grid.

This hybrid approach—**1D Array for the Level (Static) + Dictionary Spatial Grid for Entities (Dynamic)**—is how many high-performance 2D engines are built. Does this clear up how to bridge your level design in Godot with your C# engine's needs?

* * *

# Level Editor + Game Engine

Use Godot Tilemap as a graphical interface to build the data that the Spatial Grid needs.

Think of Godot as your **Level Editor (The "Human" interface)** and your C# `SpatialGrid` + 1D Array system as your **Game Engine (The "Machine" interface)**.

### The Workflow Breakdown

1. **Authoring (Godot)**: You use the `TileMap` to paint walls, floors, and spawn points. You are working in a visual environment where you can immediately see the level flow.
2. **Serialization (The Bridge)**: You create a script that extracts the *data* from that Godot scene—not the visuals. It strips away the sprites and animations and saves only the coordinates and object types into a clean `.json` or binary file.
3. **Consumption (Your C# Engine)**: Your engine ignores Godot entirely at runtime. It loads that data file, populates its internal `SpatialGrid` for dynamic entities (NPCs), and builds a 1D Array for the static level geometry.

### Why this architecture is powerful:

* **Separation of Concerns**: You can change your art, your tile sprites, or even move to a different engine entirely without rewriting your `SpatialGrid` or `CollisionSystem` logic.
* **Debuggability**: If your engine has a "ghost" collision or a bug where entities get stuck, you can verify if the loaded data matches your level design.
* **Procedural Hybridization**: Because your engine consumes "data" rather than "Godot objects," you can choose to load a hand-crafted JSON file (manually designed) OR generate a JSON file via a procedural algorithm (randomly generated). Your engine will treat both exactly the same way.

### One final tip for your "Gauntlet/Vampire Survivors" mix:

When you build these levels in Godot, **use "Groups" or "Custom Data Layers"** to mark tiles. For example:

* `IsSolid`: Boolean.
* `TerrainType`: Integer (0=Floor, 1=Water, 2=Lava).
* `SpawnGroup`: Integer (If it's an enemy spawner).

Your exporter script can read these properties and translate them into your 1D array indices or `SpatialGrid` entry points. This way, the level design in Godot is not just a picture—it’s a fully defined functional map that your engine understands perfectly.

