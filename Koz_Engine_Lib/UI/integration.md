# UI Integration

UI owns reusable interaction and screen mechanics; the host owns markup, copy, theme, and widget definitions.

- `tabController.js`: connect tab buttons to panels.
- `controlBindings.js` and `components/controlEditor.js`: edit input maps.
- `characterController.js`: normalize held keyboard or gamepad axes into a
  host-neutral movement vector for directly controlled actors.
- `components/audioSettings.js`: bind volume state to controls.
- `components/hudLayout.js` and `hudPreviewEditor.js`: register host HUD definitions and edit layout.
- `menuShell.js`, `modalPrimitives.js`, and `uiScreenController.js`: compose menus and modal lifecycle.
- Dialogue and speech modules accept host text/content.

Register UI implementations as components, for example `component:hud.preview` or `component:settings.controls`. Keep document queries in the host composition layer when possible.

See [`components/integration.md`](components/integration.md).
