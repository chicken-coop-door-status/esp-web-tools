# AGENTS instructions for Mother Hen ESP Web Tools fork

## High-level purpose
- This fork ships a pared-down ESP Web Tools landing page tailored to Mother Hen device field recovery (Eggs and Controllers). Focus on keeping the experience deliberate (bold visuals, clear checklist, device selector, two manifest paths per device) rather than reverting to the upstream marketing page.
- Do not modify `main` or any other directories; keep most logic inside `index.html`, `config/eggs.json`, and the manifest files under `static/manifests`.

## Repository layout
- `index.html` now drives the entire field recovery experience, loads `config/eggs.json`, renders a device selector, and wires up the `esp-web-install-button` component. Keep any future UI adjustments here unless we add new build tooling.
- `config/eggs.json` defines the devices array, field checklist items, and manifest variations per device. Add new devices or manifests by extending this file; the UI is data-driven.
- `static/manifests/<device>/...` holds the actual manifest JSON files. Each manifest should honor the Mother Hen partition layout (OTA table at `0x19000`) and point to our S3-hosted binaries in the appropriate device folder (`egg/` or `controller/`).

## Build & deployment
- To regenerate `dist/web/install-button.js`, run `npm install` followed by `script/build`. The hosted page should import the generated modules from `/dist/web/install-button.js` on localhost and fall back to the published `esp-web-tools` CDN when deployed.
- Keep the UI lightweight; avoid bringing in new dependencies unless absolutely necessary. Vanilla JS + the custom element is enough.

## Field recovery guidance
- Any new manifest must include the `new_install_prompt_erase` flag so we can prompt the tech to decide whether to erase. Use the config entries to explain which path to choose (data-safe vs factory reset).
- Keep the field checklist in `config/eggs.json` up to date with browser/cable/boot instructions.
- Both Eggs and Controllers use ESP32-S3 chips with the same partition layout, so the recovery process is identical across device types.
- When adding new devices, create a new entry in the `devices` array in `config/eggs.json` and corresponding manifest files under `static/manifests/<device-id>/`.

## Editing reminders
- Prefer ASCII content; only add new Unicode characters if they serve a clear UX purpose.
- When stretching the UI, maintain the expressive typography and gradient/motion choices already present in `index.html`.
