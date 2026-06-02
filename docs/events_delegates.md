# Events and Delegates

## Declaration

There are two types of events: events that return a value and events that don't return a value. They are declared slightly differently:

### Action

Action events don't return a value.

```csharp
public Action<string> MyEvent;
```
is the same as

```csharp
    public delegate void MyEventHandler(string);
    public event MyEventHandler OnMyEvent;
```

### Func

Func events return a value.

```csharp
public Func<int, bool> MyEvent;
```
is the same as

```csharp
    public delegate int MyEventHandler(bool toggle);
    public event MyEventHandler OnMyEvent;
```


## Event manager

We can create an event manager to handle a variety of events. In the example below, we create an event manager to handle attributes changes and event messages.

The attribute to handle is ammunition. When we shoot, we substract one to the total ammo and update a label that shows the ammo available. When we reach 0 ammo, we update another label with the message: "Ammo depleted!".

`EventManager.cs`

```csharp
using System;

public static class EventManager
{
    public static Action AttributeChangeEvent;
    public static Action<string> MessageEvent;
    
    public static void BroadcastAttributeChange()
    {
        AttributeChangeEvent?.Invoke();
    }

    public static void BroadcastMessage(string message)
    {
        MessageEvent?.Invoke(message);
    }
}
```
<br>

`Stats.cs`

```csharp
using Godot;

public partial class Stats : Label
{
    public override void _Ready()
    {
        // Prevent duplicate subscriptions
        EventManager.AttributeChangeEvent -= OnAttributeChange;
        EventManager.AttributeChangeEvent += OnAttributeChange;
    }

    public override void _ExitTree()
    {
        EventManager.AttributeChangeEvent -= OnAttributeChange; // Unsubscribe to prevent memory leaks if node is deleted
    }

    private void OnAttributeChange()
    {
        Text = "";
        foreach (var attrib in Player.attributes)
        {
            if (attrib.Value.VariantType == Variant.Type.Float)
            {
                Text += $"{attrib.Key}: {(float)attrib.Value:F2}\n"; // F2 to limit to two decimals
            }
            else
            {
                Text += $"{attrib.Key}: {attrib.Value}\n";
            }
        }
    }
}
```

<br>

`EventsLabel.cs`

```csharp
using Godot;

public partial class EventsLabel : Label
{

    // Prevent duplicate subscriptions
    public override void _Ready()
    {
        EventManager.MessageEvent -= OnMessageEVent;
        EventManager.MessageEvent += OnMessageEVent;
    }

    public override void _ExitTree()
    {
        EventManager.MessageEvent -= OnAttributeChange; // Unsubscribe to prevent memory leaks if node is deleted
    }

    private void OnMessageEVent(string message)
    {
        Text = message;
    }
    
}
```

<br>

`Player.cs`

```csharp
   void Shoot()
    {
        if (Ammo > 0)
        {
            var new_bullet = Bullet.Instantiate();
            GetParent().AddChild(new_bullet);
            Ammo -= 1;
            EventManager.BroadcastAttributeChange();
        }
        else
        {
            EventManager.BroadcastMessage("Ammo depleted!");
        }
    }
```
