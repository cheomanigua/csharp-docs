This documentation site does not use any framework. It is simple HTML, CSS and Javascript.

The following libraries are used: `marked` and `prism`

### Content

By default, the home page is enums_flags.md. You can change this in `script.js`:

```javascript
const page = window.location.hash.split('/')[0].replace('#', '') || 'enums_flags';
```

To add a new doc page, insert this line in `index.html`:

```html
<li><a href="#mynewpage">My New Page</a></li>
```
The order matters. The menu mimics the order on which the files are placed in `index.html`

### Callouts

The Callouts are custom made. There are six options: Note, Info, Tip, Warning, Danger, Success.

To use an Info callout, simply add this code in your markdown file:

```
[!INFO]
This is the first line. Here is some <strong>bold</strong> text.
This is the second line. Here is some <code>code</code> text.
```

All available Callouts:

[!NOTE]
This is the <strong>NOTE</strong> Callout.
And this is how it looks when using <code>example code</code>

[!INFO]
This is the <strong></strong> Callout.
And this is how it looks when using <code>example code</code>

[!TIP]
This is the <strong>TIP</strong> Callout.
And this is how it looks when using <code>example code</code>

[!WARNING]
This is the <strong>WARNING</strong> Callout.
And this is how it looks when using <code>example code</code>

[!DANGER]
This is the <strong>DANGER</strong> Callout.
And this is how it looks when using <code>example code</code>

[!SUCCESS]
This is the <strong>SUCCESS</strong> Callout.
And this is how it looks when using <code>example code</code>

