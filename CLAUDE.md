# Artifact Viewer — project context

Read this first. Claude Code loads it automatically; it exists so a fresh session starts with
the context the original build accumulated.

## What this is

A browser-based museum artifact viewer, rebuilt from an Unreal Engine 5.7 project. Photogrammetry
scans sit on an adjustable pedestal in a controlled studio; the user cycles camera presets,
adjusts lights and pedestal, rotates and scales the object.

**The point of the rebuild:** in Unreal, every artifact was a pre-placed actor cycled with
`SetActorHiddenInGame`, so adding one meant re-cooking and redistributing a ~2 GB build. Here,
artifacts are dragged onto the window at runtime. That is the whole reason this project exists —
protect it.

**Live at <https://nikkinaq-a11y.github.io/artifact-viewer/>** — published from
<https://github.com/nikkinaq-a11y/artifact-viewer>, rebuilt automatically on every push to `main`.

**There is a sister app: `../artifact-reflection-web/`.** It rebuilds `LV_ReflectiveObjectCapture` —
an object facing a sheet of dark acrylic, seen as a real planar reflection laid over a print. Both
apps are kept, both install, both run at once, and they deliberately share controls, import pipeline
and gallery format. **Do not converge them, and do not add the other one's features here.** This app
rebuilds `LV_BasicObjectCapture1` and has no acrylic and no reflection in it by design.

If a request is about reflections, the acrylic sheet, prints, or anything on port 5179, it is about
that project and not this one — check there before concluding a feature was never built.

## Where things are

| What | Path |
|---|---|
| This project | `~/Documents/Duke/Artifact Work/artifact-viewer-web/` |
| Sister app (reflection) | `~/Documents/Duke/Artifact Work/artifact-reflection-web/` — its own `CLAUDE.md` has the detail |
| Source FBX scans | `~/Documents/Duke/Artifact Work/PhotogrammetryFiles/FBX_Files/` (21 files, 3–16 MB) |
| Larger scans, no materials | `~/Documents/Duke/Artifact Work/PhotogrammetryFiles/No Material/` (incl. 111–137 MB) |
| Unreal project (authoritative) | `/Volumes/Nicole_Quinn/NOMA General/NOMA Unreal/Artifact_Setup/` — Duke SMB share, mount before use |
| Unreal project (stale local copy) | `~/Documents/Duke/Artifact Work/NOMA Unreal/` — March, do not trust |

The folder was renamed from `NOMA/` to `Artifact Work/` mid-build. Paths now contain a space —
quote them. The user runs Unreal on a **separate Windows machine**, not this Mac.

## Docs

- **[Artifact-Viewer-Handbook.pdf](Artifact-Viewer-Handbook.pdf)** — the non-technical guide for
  museum staff: the address, installing it as an offline app, adding objects, sharing a gallery.
  This is the document a curator gets handed, so it is the one that matters most when a user-facing
  control changes. **It has no source file.** Its metadata shows it was printed from an HTML page by
  headless Chrome, and that HTML was not kept, so it cannot be edited — updating it means rebuilding
  the HTML and re-printing. **It is currently out of date:** its key table says thirteen camera
  angles and three backgrounds, from before the 15 presets, the `D` distance toggle and silhouette
  mode. Regenerate it before handing it to anyone.
- **[PLAN.md](PLAN.md)** — full plan: findings from the Unreal project, decisions and why, phases
- **[README.md](README.md)** — how to run, controls, formats, packaging, troubleshooting
- **[UNREAL-TO-WEB.md](UNREAL-TO-WEB.md)** — plain-language translation, safe to hand to a coworker
- **[UNREAL-GLTFRUNTIME-OPTION.md](UNREAL-GLTFRUNTIME-OPTION.md)** — the route not taken

## Status

Working: studio scene, 15 camera presets + a second further-back framing of each on `D` +
click-drag orbit, pedestal in cm, stepped rotation, scale, dark/white/horizon/silhouette scene
modes, collapsible scene readout, pedestal hide, front light, drag-and-drop import (FBX/GLB/glTF/
OBJ/STL/PLY/USD), IndexedDB library with gallery panel, gallery export/import as `.zip`, PWA
offline install, Tauri Mac app.

**Silhouette is a lighting state, not just a background.** `STUDIO_THEMES.silhouette.backlit`
switches the back wall to an unlit white panel *and* switches the whole rig off in `Lighting.tsx`;
either half alone does not produce a silhouette. `overlaysOnLight` is a separate flag on the same
record — it puts the `on-light` class on the root so the HUD and gallery get dark-on-light styling,
which both the white studio and silhouette need. `.theme-light` is still emitted for the light
theme because `verify-packaging.mjs` asserts on it, but it no longer carries any styling.

Deployed to GitHub Pages and verified live in a real browser. Not done: control panel with
sliders (keyboard only so far), artifact thumbnails, automatic decimation of huge scans, the
5-artifact seed set.

**The published gallery starts empty on purpose.** Museum scans are gitignored — they belong to
the collection, and a public repo would make them freely downloadable. Collections travel as
exported gallery `.zip` files instead. Baking artifacts into the build is a collection-rights
decision, not a technical one; do not do it without asking.

**Scene values in `src/scene/presets.ts` are reconstructions from a reference render, not the real
Unreal values.** The level has 13 `CineCameraActor`s and a RectLight rig whose transforms, FOV and
intensities should replace them verbatim once captured on the Windows machine. It is all plain data
so the swap touches one file.

## Architecture

```
src/
  scene/      Studio (room), Pedestal, Lighting, Environment, CameraRig, ArtifactMesh, presets.ts
  import/     loadModel.ts (all formats), useImport.ts, DropZone.tsx
  library/    db.ts (IndexedDB), models.ts (parsed-model cache), galleryFile.ts (zip), GalleryPanel
  ui/         keybinds.ts
  store.ts    Zustand — the state BP_PhotoViewerController held
```

Parsed `THREE.Group`s live in `library/models.ts`, deliberately **outside** React state — they are
large mutable objects and putting them in the store re-renders the tree on every import. The store
holds metadata only; components look models up by id.

State is in **centimetres** to stay comparable with `BP_AdjustablePedestal`; three.js works in
metres. `src/lib/units.ts` converts at the boundary.

## Gotchas — all of these cost real time to find

**Environment**
- Node is at `/usr/local/bin` and not on the default PATH. Prefix commands with
  `export PATH="/usr/local/bin:$PATH"`, and add `$HOME/.cargo/bin` for Tauri.
- **Vite HMR does not reliably apply Zustand store changes.** A new store action can silently be
  missing, so a keypress does nothing with no error. After editing `store.ts`, hard-refresh.

**Rendering**
- `RectAreaLightUniformsLib.init()` must run once or every rect light renders black.
- **`RectAreaLight` cannot cast shadows** in three.js. The look and the shadowing are split: the
  rect rig shapes, a separate targeted `spotLight` casts.
- **A `spotLight` with no `target` aims at the world origin** — the floor under the pedestal — which
  lights the pedestal instead of the artifact and flattens the composition.
- There is no global illumination. The `bounce` light in `presets.ts` is a hand-placed stand-in for
  Lumen's bounce, and is the largest fidelity gap.

**Model loading**
- **glTF defaults `metallicFactor` to 1.0.** Exporters routinely omit it, so a scan renders as a
  black mirror. `normalizeMaterials` forces everything to dielectric.
- **FBXLoader produces `MeshPhongMaterial`**, which three.js does not light with `RectAreaLight`
  and which ignores `scene.environment`. Converted to `MeshStandardMaterial` on import, or FBX
  renders far darker than glTF.
- **Texture images load asynchronously** even when `parse()` returns synchronously. Sidecar blob
  URLs are held for the model's lifetime and revoked in `dropModel`, not after parse.
- **Auto-fit is load-bearing.** Arbitrary files arrive in arbitrary units, orientations and pivots.
  `ArtifactMesh` normalises the longest axis, centres X/Z, and seats min-Y on the pedestal.
- Vertex colours are kept only when there is no colour map — for PLY they are the only colour, but
  against an albedo map they double-darken.

**The FBX texture situation**
- **Only 14 of the 21 files in `FBX_Files/` embed their texture.** The other 7 reference an absolute
  path from the exporting machine (`X:/Arthist_305.../foo.jpg`) that a browser cannot resolve, and
  import grey. Fix: drag the model and its `.jpg` in together.
- Scanning FBX bytes for JPEG magic gives **false positives** — mesh float data contains those
  bytes. `scripts/check-fbx-textures.mjs` validates the segment marker and EOI. The app itself is
  the real authority, via `LoadingManager.onError`.

**Testing**
- Headless Chrome's `--virtual-time-budget` fires **before** a 5 MB GLB finishes decoding and
  silently captures an empty pedestal. Use the puppeteer scripts, which wait on real state.
- **Reading the WebGL canvas gives blank** without `preserveDrawingBuffer`. Measure screenshots.
- IndexedDB is shared across pages in one browser — clear it between test cases.

**Deployment**
- Live at <https://nikkinaq-a11y.github.io/artifact-viewer/>; `git push` to `main` rebuilds and
  republishes via `.github/workflows/deploy.yml`. Pages source is set to GitHub Actions.
- `base: './'` in `vite.config.ts` is what lets the app run from a project subfolder. Without it
  every asset 404s on GitHub Pages.
- Pushing needs a Personal Access Token with the **workflow** scope, because the repo contains
  `.github/workflows/`. An account password will not work.
- `cd "~/path"` does not work in a shell — a tilde inside quotes is not expanded. Use full paths;
  this project's path contains a space.
- Museum scans are gitignored on purpose (collection rights). The live gallery starts empty and
  collections are shared as exported `.zip` files.

**Tauri**
- **`dragDropEnabled` must stay `false`.** Tauri's native file-drop handler swallows drops before
  the page sees them, which breaks the headline feature.
- `.dmg` is off by default; that step drives Finder via AppleScript and fails without a GUI session.
- **Run `cargo clean` in `src-tauri/` after moving the project** — Cargo bakes absolute paths in.

## Commands

```bash
export PATH="/usr/local/bin:$HOME/.cargo/bin:$PATH"

npm run dev                  # dev server
npm run build                # static site -> dist/  (includes PWA service worker)
npx tauri build              # Mac app -> src-tauri/target/release/bundle/macos/
git push                     # rebuilds and republishes the live site
npx tsc -b                   # typecheck

node scripts/verify-import.mjs ./shots http://localhost:5178/     # import, cycle, reload, remove
node scripts/verify-formats.mjs ./shots http://localhost:5178/    # formats, pedestal, gallery tab
node scripts/verify-packaging.mjs ./shots http://localhost:4178/  # export/import + offline (needs dist served)
node scripts/check-fbx-textures.mjs ~/Documents/Duke/Artifact Work/PhotogrammetryFiles/FBX_Files
```

Always typecheck and re-run at least `verify-import.mjs` after changes; the puppeteer scripts catch
rendering regressions that typechecking cannot.

## Conventions

- Scene/light/camera/pedestal values live as plain data in `src/scene/presets.ts`, never inline in
  components, so the real Unreal values can be dropped in without touching logic.
- Keybindings mirror the Unreal `BP_KeyboardControls` legend (C, O, R, P, H, K, L, Shift, Tab) so
  muscle memory and any demo script carry over. `B`, `V` and `F` are additions.
- The gallery is deliberately **not** on a key — it lives behind a permanent tab so it is
  discoverable without knowing a shortcut.