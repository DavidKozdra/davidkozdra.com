# Economy Integration

Economy owns transaction and staged-acquisition mechanics, not currencies or prices.

- Use `stagedAcquisition.js` for multi-step ownership flows and deterministic stage progress.
- Inject wallet readers/writers and validation callbacks.
- Register forge, shop, reward, or prestige formulae as host content/systems.

Recommended keys: `service:economy.wallet`, `system:economy.transaction`, `content:economy.prices`.

NeoNyke's forge escalation and Loop Crystal balance should remain content layered over reusable transaction primitives.
