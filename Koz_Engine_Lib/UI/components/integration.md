# UI Components Integration

Components are small controllers that operate on host-provided state and elements.

## HUD Preview

```js
const registry = new HudLayoutRegistry(gameHudDefinitions);
const editor = new HudPreviewEditor({
  root: previewRoot,
  targetClass: 'game-hud-preview',
  registry,
  getState: () => settings.hud,
  setState: state => saveHud(state),
  onChange: () => renderHudPreview(),
});
editor.registerComponents();
```

The target class is the discovery contract. Definitions provide keys/selectors; the host provides save/render hooks.

## Other Components

- `MenuShell`: visibility lifecycle for a host menu element.
- `ControlEditor`: keyboard/control capture against a host binding map.
- `AudioSettings`: normalized volume state and range-input binding.
- `HudLayoutRegistry`: definition registration and normalized layout state.

Components must not contain game copy, game IDs, or balance logic.
