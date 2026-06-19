# Exporting the Game

# Standalone Binary

Since you have architected your game as a standalone C# engine—where Godot acts as a service provider rather than the host of your entire application—the answer depends on which execution model you choose.

### 1. The Standalone Binary Path (Custom Engine)

Because you are using Godot only for specific services (Physics, Rendering, Input) and maintaining your own `EngineDriver` loop, your game effectively behaves like a **custom C# application**.

* **How to export**: You do not use Godot’s "Export" button. Instead, you use the standard .NET CLI (`dotnet publish`) to compile your C# engine into a platform-specific executable for Windows, Linux, or macOS.
* **Packaging**: You must bundle your compiled executable along with the necessary Godot runtime libraries (if you are dynamically linking to them) and your exported data files (the assets and maps you prepared in Godot).
* **Control**: This gives you total control over the binary and execution environment, keeping your engine logic completely decoupled from Godot’s `SceneTree`.

### 2. The Godot-Hosted Path

If you choose to move your `EngineDriver` loop into a `Node` or `Script` that runs within the Godot runtime, the process becomes much simpler:

* **How to export**: You use Godot’s built-in **Export** menu (File -> Export).
* **Benefits**: Godot handles all the cross-platform boilerplate (window creation, OS integration, filesystem access) for you automatically.
* **Trade-off**: You would be running your simulation inside the Godot `SceneTree`, which may introduce overhead that your current data-oriented design is specifically trying to avoid.

---

### Why your "Sieve" Architecture makes the decision easier

Because you have built an **"Engine-Agnostic Sieve"**, you have significant flexibility:

1. **Portable Logic**: Since your simulation math (`Transform2D`, `MovementSystem`, `SpatialGrid`) is written in pure C# and decoupled from Godot’s Nodes, your core game engine could theoretically run on *any* framework.
2. **Service Delegation**: By wrapping Godot’s services (Physics, Rendering) in an `IEngineBridge` or Facades, you have made it possible to swap Godot for another service provider later without rewriting your combat or physics code.

### Recommendation

If your goal is to maintain the performance of a high-density "Vampire Survivors" style game, **stick to the Standalone Binary Path.** By keeping your simulation outside the `SceneTree` and only using Godot for "headless" geometry queries (`PhysicsServer2D`) and direct buffer updates (`RenderingServer`), you are maintaining the performance benefits of a custom engine. You will eventually package this as a standard C# application, ensuring your engine remains the "Source of Truth" for all your game's active state.

* * *

# `dotnet publish`

Yes, `dotnet publish` is the primary command used to bundle your C# engine, its dependencies, and your data files into a deployable application.

### Why `dotnet publish` is the right choice for your architecture

Since you are bypassing the Godot `SceneTree` and running a standalone C# application that interacts with Godot's services as a "headless library," you are essentially building a standard .NET console or windowed application.

* **Self-Contained Deployment**: You can use `dotnet publish -r <RID> --self-contained` to bundle the .NET runtime with your game. This ensures that the user doesn't need to install .NET separately to play your game.
* **Platform Targeting**: By changing the Runtime Identifier (RID), such as `win-x64`, `linux-x64`, or `osx-x64`, you can generate native executables for any target platform from your development machine.
* **Trimmed Binaries**: You can use the `--trim` flag to strip out unused .NET code, keeping your final game executable smaller and faster.

### The Workflow for Your Standalone Engine

When you are ready to ship, your deployment workflow will look like this:

1. **Compile**: Run `dotnet publish -c Release -r win-x64 --self-contained` to generate your executable.
2. **Package**: Gather the generated files from the `/bin/Release/netX.X/publish/` folder.
3. **Include Data**: Manually copy your `Source/Data` folder (containing your JSON blueprints and level data) into the publish directory so your engine can find them at runtime.
4. **Ship**: Distribute the resulting folder or create an installer.

### One Important Caveat

If you are using Godot as a service provider (linking against Godot's C# libraries or native bindings), you must ensure that the Godot shared libraries (`.dll`, `.so`, or `.dylib` files) are included in your output folder. Your `dotnet publish` command will usually handle this if your project file (`.csproj`) is correctly configured to copy native dependencies to the output directory.

Are you planning to handle the packaging and distribution manually, or were you hoping to use an automated build tool (like GitHub Actions or a CI/CD pipeline) to handle the `dotnet publish` process for you?

Since you are building a custom engine (using C# and Godot as a service), "manual" is actually the professional way to go! You have complete control over your binary, which is exactly what a high-performance engine needs.

Here is your manual **"Ship-it" Checklist** to get your C# game into a playable state:

### 1. Build and Bundle

Instead of a single "Export" button, you will run your build command in your terminal:

```bash
dotnet publish -c Release -r win-x64 --self-contained

```

* **What this does**: It takes your C# code and creates a `publish` folder containing everything you need to run on Windows, including the .NET runtime itself (so the user doesn't have to install it).
* **Platform Variation**: To release for Linux or macOS, you just change the `-r` flag (e.g., `-r linux-x64`).

### 2. The "Data" Bridge

Because your engine is data-driven, your executable won't know where to find your levels and blueprints unless you tell it.

* **The Manual Copy**: You must physically copy your `Source/Data` folder into the `publish` folder created by `dotnet publish`.
* **Why**: Your `Controller.cs` is likely looking for paths like `./Data/npc_blueprint.json`. If that folder isn't next to your executable, the engine will crash on boot.

### 3. Native Bindings (The "Godot" part)

If your C# project relies on Godot’s libraries (like the `GodotSharp` assemblies), `dotnet publish` might not copy the necessary native `.dll` or `.so` files automatically.

* **Manual Check**: Look in your `bin/Debug` or `bin/Release` folder during development. If you see files ending in `.dll` (Windows) or `.so` (Linux) that aren't part of your own code, **you must include these in your `publish` folder.**
* **Tip**: You can add a `<None CopyToOutputDirectory="PreserveNewest">` tag in your `.csproj` file for these native libraries so they always get copied automatically during the build.

### 4. Create your Distribution Folder

Your final "Game" folder that you send to players should look like this:

* `MyGame.exe` (Your compiled engine)
* `/Data` (Your JSON/Map data exported from Godot)
* `GodotNative.dll` (Any required Godot dependencies)

### Why this Manual Workflow is Better

* **It’s Clean**: You aren't shipping any of the "Godot Editor" bloat or unused Godot resources. You are shipping exactly what your engine needs—nothing more.
* **It’s Fast**: You have eliminated the "SceneTree" overhead. Your game will load faster and use less RAM than a standard Godot-exported project.

Does this manual structure make sense, or would you like me to show you how to add a "Post-Build" event to your `.csproj` file so that this copying happens automatically every time you click "Build"?

# Modding Potential

Yes, exactly. When you distribute your game by manually copying your `Data` folder into the `publish` directory, you are leaving those files as **uncompiled, plain-text assets**.

### The Consequences of Distributing JSON

Because JSON is a human-readable format, your users will be able to open those files in any text editor (like Notepad or VS Code) and modify them.

#### 1. The "Modding" Potential (The Benefit)

* **Accessibility**: Your users can easily change entity stats, weapon damage, or level layouts without needing to recompile your engine.
* **Community Engagement**: This is a classic feature in successful games (like *The Binding of Isaac* or *RimWorld*). If you leave these files exposed, players will often start "modding" your game, creating custom levels or balancing changes for you.

#### 2. The "Cheating" Risk (The Downside)

* **Manipulation**: If your game has a leaderboard or competitive multiplayer, users could easily open `npc_blueprint.json` and set their health to 999,999 or change enemy stats to make them harmless.
* **Stability**: If a user introduces a syntax error (e.g., deleting a comma or a bracket in the JSON), your `Controller.cs` data-loading logic will likely crash or fail to parse the file on startup.

### How to manage this (if you want to prevent it)

If you decide you don't want users editing your data, you have three standard options:

1. **Binary Serialization**: Instead of JSON, use a format like **MessagePack** or **Protobuf** to save your `Model.cs` data. These are binary formats that are much harder for a human to edit in a text editor.
2. **Encryption/Obfuscation**: You can "encrypt" your JSON files at build time and have your `Controller.cs` decrypt them into memory when the game boots. This stops casual edits but won't stop a determined reverse-engineer.
3. **Hash Verification**: You can include a `manifest.json` file in your data folder that contains a hash (a digital fingerprint) of all your other data files. On startup, your engine calculates the hash of the files; if they don't match the manifest, the engine knows the files were tampered with and can refuse to load them.

### My Recommendation

Since you are building a custom engine and you are in the early stages, **let them edit it**.

Keeping your data in human-readable JSON while you develop is a massive advantage for **debugging**. If something goes wrong in your level, you can read the JSON file to verify the data exactly as your engine sees it.

Once you are closer to a "finished" release, you can decide if you want to leave it as JSON (to allow modding) or switch to a binary format (to prevent cheating).

