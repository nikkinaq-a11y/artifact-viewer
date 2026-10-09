# Edit plan: October 2026 (artifact-viewer-web)

Status: **Phase 1 and Phase 2 implemented, 2026-10-08/09.**
All edits are in this app (the baseline viewer). It's the only app with silhouette mode. Nothing
here goes into the reflection or pair apps.

---

## Phase 1: viewer edits

### 1. Snapshot key: `S`
- **Key:** `S` isn't bound yet. Add it to `src/ui/keybinds.ts` and the Tab help list.
- **What it captures:** the 3D canvas only, with no HUD, gallery or help overlay. That gives a clean
  documentation plate.
- **How:** a small `<Snapshot />` component inside `<Canvas>` uses `useThree()` to get `gl`,
  `scene` and `camera`. When `snapshotRequest` changes, it calls `gl.render(scene, camera)`, then
  `gl.domElement.toBlob(...)` right away. Rendering first and reading straight after avoids turning
  on `preserveDrawingBuffer` for the whole app, which would cost performance. Gotcha from
  CLAUDE.md: reading the canvas without this comes back blank.
- **Store:** add `snapshotRequest: number` and `requestSnapshot()` (a counter bump).
- **File name:** `<artifact name> - <camera> - <distance> - <timestamp>.png`, for example
  `Dogon Mask - Upper - Far - 2026-10-08 14-32-05.png`.
- **Resolution:** the canvas's own pixel size (2× on Retina). If larger prints are needed later,
  render once at a fixed scale with `gl.setPixelRatio`.
- **Saving:** go through the same save function the gallery export uses, so the Phase 2 Mac-app
  fix covers snapshots too.
- **Feedback:** a short "Snapshot saved" toast (reuse the `.toast` style, add a neutral variant).

### 2. Remove the walls
- `src/scene/Studio.tsx`: delete the back, left and right wall meshes. Keep only the floor.
- **Background:** the scene's background colour (`STUDIO_THEMES[*].background`) is now the
  backdrop. Check every theme still reads well:
  - dark `#050506` against floor `#0a0a0b`
  - white `#fafafa`
  - horizon: grey `#6e727a` sky against the blue floor. The floor-to-background line becomes the
    horizon, which is the point of the theme.
- **Floor edge:** the floor is 8 × 8 m today, so in the Wide and Far shots its edge would show
  against the background. Enlarge it to about 60 × 60 m, and add `<fog>` matching each theme's
  background colour (starting at roughly 6 m, fully faded by roughly 25 m). The floor then fades
  into the backdrop like a cyclorama instead of ending at a hard line. Fog starts beyond the
  furthest camera (about 4.7 m), so the artifact itself is unaffected. Check with screenshots in
  all four themes.
- `ROOM` constant and its comment: rewrite as a floor-only stage.
- Update the comments in `presets.ts` (horizon theme comment about the floor/wall join).

### 3. Silhouette mode with no floor
- `Studio.tsx`: don't render the floor when `STUDIO_THEMES[theme].backlit` is true.
- With the walls gone, the white lightbox comes from `background: '#ffffff'` alone. Check that the
  background isn't tone-mapped down to grey. If it is, use a large unlit `meshBasicMaterial` plane
  far behind the pedestal with `toneMapped={false}`, which is the same trick the back wall uses
  today.
- Result: a black pedestal and artifact against pure white, with no ground.
- Drop the CSS block `.theme-silhouette .hud / .gallery` with its opaque panels. It exists only
  because the HUD sat across the black floor and the white wall. Check first.
- Contact shadow: hide it in silhouette mode, since there's nothing for it to fall on.

### 4. Third, more dramatic light setting
- **Control:** `F` becomes a three-way cycle: **Studio → Front → Dramatic → Studio**.
- **Data (`presets.ts`, following the "values live as data" rule):**
  - New `LIGHT_PRESETS` entry, `id: 'dramatic'`: a small panel (about 0.32 × 0.38 m) high to the
    left and barely forward (about `[-1.25, 2.05, 0.4]`), aimed at the artifact, warm `#ffe8cc`,
    strong (about 70), `on: false`. Add an optional `aim` field to `LightPreset` so `Lighting.tsx`
    calls `light.lookAt(aim)`. Three.js points a light's −Z toward the target, which is the rect
    light's emitting side.
  - New `DRAMATIC_LIGHTING` record: which studio lights stay on (rim only, raised to about 16),
    ambient 0, and the shadow spot's new position (co-located with the dramatic key), intensity
    (about 30), and a narrower angle with a harder penumbra (about 0.35).
- **Look:** chiaroscuro. One hard side light splits the object into a lit half and a black half,
  with a cool rim keeping the dark edge separate from the background. No fill, no bounce, no
  ambient.
- **Logic (`Lighting.tsx`):** when `lights.dramatic.on`, hide key, fill, bounce and front, apply the
  `keep` intensities, set ambient to 0 and move the spot. Silhouette still overrides everything,
  with the rig off.
- **Store:** replace F's `toggleLight('front')` with `cycleLightMode()`, which keeps `front` and
  `dramatic` mutually exclusive. State stays in the existing `lights` record, so gallery
  save/restore works with no format change. Older galleries simply load with dramatic off.
- **HUD:** replace the "Front light: on" row with `Lighting: studio / front / dramatic`
  (silhouette keeps its own row).
- **Tuning:** take screenshots in all three settings against the dark theme and adjust intensities.

### 5. Three distance stops on `D`
- `CAMERA_DISTANCES` becomes **Standard 1.0 → Middle 1.225 → Far 1.45**: the same nearest and
  farthest as now, with an evenly spaced middle stop. `D` already cycles through however many
  entries there are, and the help text lists them automatically.
- `MAX_DISTANCE` (7 m) already clears Wide × 1.45, so no change there.
- Gallery note: old galleries saved `camDistance: 1` meaning Far, which would now load as Middle.
  Minor. Optionally bump the gallery format and map old 1 to 2.

### 6. One straight-on camera
- Remove `Front High` and `Front Low` from `CAMERA_PRESETS`, along with the `FRONT_SHIFT`
  constant and its comment. Keep `Front` at the artifact's height.
- That leaves **5 presets**: Front, Upper, Lower, Close, Wide. The HUD "of N" updates itself.
- Saved `camIndex` values in old galleries shift by up to two. The index already wraps, so nothing
  breaks.

### 7. Camera-height slider for Upper and Lower
- **Behaviour:** on the Upper (high) and Lower (low) views, a vertical slider moves the camera up
  and down **while keeping the viewing angle**. Camera position and look-at target move by the same
  vertical offset, so the tilt doesn't change. Only where the shot is taken from does.
- **Data:** add `heightAdjustable: true` on those two presets, plus `CAMERA_HEIGHT_RANGE = 0.6` m
  either side. The low end is limited by Lower starting 0.75 m off the floor.
- **Store:** `camHeights: Record<presetName, metres>`, kept separately for each view so high and
  low each remember their own setting. Add `setCamHeight(name, v)`. Include it in
  `captureSettings` / `applySettings` (optional field, clamped on load).
- **CameraRig.tsx:**
  - When arriving at a preset, add the offset to both `toPos.y` and `toTarget.y`.
  - When the slider moves, shift `camera.position.y` and `controls.target.y` by the change and
    call `controls.update()`, and shift the in-flight blend's from/to points if a blend is
    running. Do it instantly, not blended, so the slider feels direct.
- **UI:** a vertical range input on the right edge, vertically centred, shown only when the current
  preset is `heightAdjustable`. It has a label ("Camera height") and a readout in cm (±60). Use the
  existing HUD styling and `on-light` variant. Use `writing-mode: vertical-lr; direction: rtl` so
  up means higher.
  - **Gotcha:** `keybinds.ts` ignores keys while an `<input>` has focus, so after dragging the
    slider every shortcut would stop working. Blur the slider on `pointerup`.
  - Optional double-click to reset to 0.

### Phase 1 wrap-up
- Typecheck (`npx tsc -b`), then run `verify-import.mjs` and `verify-formats.mjs` against the
  dev server. `verify-packaging.mjs` asserts on `theme-light`, so check it still passes.
- Screenshot every theme × light setting, plus the slider at both ends.
- Update the **Handbook HTML → re-print PDF**: 5 views, 3 distances, `S` snapshot, `F` three-way,
  height slider, no walls. Also update CLAUDE.md Status and README controls.
- Commit and push. This republishes the live site.

---

## Phase 2: downloadable Mac app + gallery zip that really saves

### Likely cause of the zip problem (confirm first)
`exportGallery()` already packs every model's original bytes and textures into the zip. Saving
uses `downloadBlob()`, an `<a download>` click. That works in a browser but **does nothing in the
Tauri Mac app's WebKit window**, so in the app the zip (and, after Phase 1, any snapshot) is never
written. First step: reproduce in the built app and check whether the published site's export
also fails with large scans.

### Fix
- Add `tauri-plugin-dialog` and `tauri-plugin-fs` (Rust and JS), with permissions in
  `src-tauri/capabilities/default.json`.
- One `saveFile(blob, suggestedName)` helper. In Tauri (`'__TAURI_INTERNALS__' in window`) it opens a
  native **Save As** dialog and writes the bytes. In the browser it falls back to `downloadBlob`.
  Gallery export and snapshots both use it.
- The zip already holds full copies of the model files under `artifacts/<id>/`, so opening it
  needs nothing online. Verify by exporting, deleting the library, importing the zip with Wi-Fi off,
  and checking that every object renders with textures.
- Large galleries: check memory with the 100+ MB scans. If it's a problem, stream the zip
  (fflate `Zip` streaming) instead of building it in one go.

### Downloadable Mac app
- Copy the pair app's working setup: `../artifact-pair-web/.github/workflows/release-mac.yml`
  (built on GitHub, attached to a GitHub Release, calls the Tauri CLI through `npx`). Adapt the
  name and bundle id (`edu.duke.noma.artifactviewer`) so it installs alongside the others.
- Turn on the `.dmg` target in CI only (it fails locally without a GUI session, per CLAUDE.md), or
  ship a zipped `.app`.
- Unsigned app: the Handbook needs the "right-click → Open" first-launch step for Gatekeeper.
  Apple Developer signing is a separate decision for Nikki.
- Add a "Download for Mac" link in the Handbook and README.
- Note: Tauri's `devUrl`/`beforeDevCommand` use port 5178, which is what's running now.
