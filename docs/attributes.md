# Attributes

This is a classic "architectural crossroads" in game development, often referred to as the **Base vs. Derived Stat distinction**. The decision impacts your game's balance and technical complexity.

### The Two Philosophies

1. **The "Fixed Foundation" (Snapshotting)**
* **How it works**: Health is calculated once at creation using base stats.
* **Pros**: Simple to calculate, stable, easier to balance (you don't have to worry about players unequipping an item and suddenly dying because their max health dropped below their current health).
* **Cons**: Items feel less "impactful" because they don't buff the whole character identity.


2. **The "Dynamic Ecosystem" (Calculated Total)**
* **How it works**: Health is a derived stat calculated every time a query is made, or whenever the "dirty flag" is raised.
* **Pros**: Highly rewarding for players (items feel powerful), promotes diverse builds.
* **Cons**: Complex edge cases (e.g., what happens to damage over time effects or life steal when max health fluctuates?).



### The Middle Ground: The "Virtual Attribute" Pattern

If you want the best of both worlds, use **Virtual Attributes**. Instead of storing one `Health` value, split your data into two concepts:

* **`BaseHealth`**: This is what you calculate in `InitStats`. It represents the "natural" vitality of the character.
* **`ModifierBonus`**: This represents additive/multiplicative bonuses from gear (like the Ring of Strength).
* **`TotalHealth`**: This is a calculated property (not stored) that returns `BaseHealth + (ModifierBonus * Multiplier)`.

### How to implement this in your ECS:

You can keep your current `InitStats` as the *Base* calculation, and update your `EntityRegistry` to apply Gear bonuses as **temporary modifiers** rather than permanently altering the `BaseHealth` value.

**Why this is better:**

* You don't need to re-run your `InitStats` formula every time someone equips a ring.
* You preserve the "natural" health (the player knows their base class health).
* Your combat system simply queries the *Total* whenever it needs to check for death.

**Recommendation:**
If your game is complex (with many items), go with the **Dynamic/Dirty Flag approach**. Games like *Diablo* or *World of Warcraft* use this because it prevents bugs where stat initialization logic gets "trapped" in a specific state. It makes the game feel much more responsive to player choices.

Which design feels like it fits the "vibe" of your game better—a world where you build a character up slowly, or one where items are the primary way to define power?
