# Artifact Viewer (web)

Browser rebuild of the Unreal `Artifact_Setup` viewer, so museum artifacts can be added by
dragging in an FBX instead of repackaging the whole application.

**Live: <https://nikkinaq-a11y.github.io/artifact-viewer/>**
· repo <https://github.com/nikkinaq-a11y/artifact-viewer>

Opens on any computer with nothing installed. The gallery starts **empty by design** — send a
[gallery `.zip`](#exporting-a-gallery) alongside the link to show a collection.

**Status.** The studio scene, lighting rig, camera presets, orbit, pedestal controls and the
artifact gallery all work. **Artifacts are added by dragging a model onto the window**, persist per
machine, and a curated gallery can be exported as a single file. It installs as an offline web app
and builds as a Mac app. Still to do: an on-screen control panel with sliders, artifact thumbnails,
automatic decimation of very large scans, the seed set, and deployment to a public URL.

### Documentation

| File | For |
|---|---|
| **[CLAUDE.md](CLAUDE.md)** | **Start here in a new Claude session** — status, architecture, and every gotcha found so far |
| [PLAN.md](PLAN.md) | The full plan: findings from the Unreal project, decisions and why, phases |
| [UNREAL-TO-WEB.md](UNREAL-TO-WEB.md) | Plain-language explanation of the translation — safe to send a coworker |
| [UNREAL-GLTFRUNTIME-OPTION.md](UNREAL-GLTFRUNTIME-OPTION.md) | The route not taken: staying in Unreal |
| README (this file) | Running it, controls, formats, packaging, troubleshooting |

## Running it

Node is installed at `/usr/local/bin` but may not be on your `PATH`:

```bash
export PATH="/usr/local/bin:$PATH"
npm install
npm run dev
```

Then open the printed URL. `file://` will not work — ES modules need a server.

## Controls

Matching the `BP_KeyboardControls` legend from Unreal, so muscle memory carries over.

| Key | Action |
|---|---|
| `C` | switch camera view (Shift+C goes back) |
| `O` | cycle object (Shift+O goes back) |
| `R` | rotate 30°, one of 12 steps around a full turn (Shift+R to undo) |
| `P` | object scale (Shift+P to undo) |
| `H` | pedestal height (Shift+H to undo) |
| `K` | pedestal width (Shift+K to undo) |
| `L` | pedestal length (Shift+L to undo) |
| `B` | background — dark / white / horizon |
| `V` | show / hide pedestal (artifact stays where it is, floating) |
| `F` | front light on / off (off by default) |
| `Tab` | controls overlay |

**Click and drag to revolve** around the artifact from wherever the current preset put you;
scroll to zoom. `C` still jumps to the next preset, and dragging cancels an in-flight blend so
the camera never fights the mouse.

`B` and `V` have no Unreal equivalent; everything else matches the `BP_KeyboardControls` legend.

`B` cycles three studio backgrounds rather than toggling two. **Dark** is the gallery default and
**white** is for documentation-style plates. **Horizon** is the odd one out: the floor goes light
blue and the walls grey, so the floor/wall join reads as a hard line instead of disappearing into
one continuous field. Dark and white both paint floor and walls the same colour, which is precisely
what hides that edge — horizon is for when you need to see where the artifact is standing.

`F` is a special case. `BP_PhotoViewerController` already defines `FrontLight`, `bFrontLightOn`
and `SavedFrontIntensity`, but binds them to no key — the logic exists dormant, and the light
itself lives in `LV_ReflectiveObjectCapture` rather than the baseline level. It is reproduced here,
off by default, on `F`. Front-on lighting flattens form, so it is for reading surface detail and
inscriptions rather than general use.
The **gallery** is deliberately not on a key — it sits behind a permanent tab in the top-right
corner, so it is discoverable without knowing a shortcut.

## Adding artifacts

Drag a model from Finder onto the window, or click the **Gallery** tab → **+ Add artifact**.

| Format | Notes |
|---|---|
| `.fbx` | Textures embedded when the exporter did so; otherwise drag the image in alongside |
| `.glb` / `.gltf` | Self-contained by design — the most reliable choice |
| `.obj` | Needs its `.mtl` **and** the texture images dropped in the same selection |
| `.stl` | Geometry only — no UVs or colour exist in the format, always renders untextured |
| `.ply` | Per-vertex colour is used when present, which is common for photogrammetry output |
| `.usdz` / `.usd` / `.usda` / `.usdc` | Via three.js `USDLoader`; newer and less battle-tested than the rest |

### If an artifact imports grey/black

Not every model stores its texture inside the file. Some only record a *path* to a `.jpg` on the
machine that exported them — e.g. `X:/Arthist_305.../Exports/mask.jpg` — which a browser can never
resolve. Those import untextured and are flagged **no texture** in the gallery.

**Fix: select the model and its image together and drag them in as one selection.** The image is
matched by filename, stored with the artifact, and reused on reload. Nothing needs re-exporting.
OBJ works the same way — include the `.mtl` and its images in the selection.

In `~/Documents/Documents/PhotogrammetryFiles/FBX_Files`, 14 of 21 embed their texture. These 7
need their `.jpg` dragged alongside:

```
1975_16_4_Pulley_Figure          1979_43_44_Dan_Mask_200k_polys
1976_79_24_Dan_Mask              1991_6_486_Twin_Figure
1976_80_6_Dan_Mask               1991_6_60_Female_Twin_Figure
1978_28_8_Male_Twin_Figure       2015_4_17_1_Dan_Mask
```

Re-check at any time with `node scripts/check-fbx-textures.mjs <dir>`. The app itself is the
authority though — it reports what actually failed to load.

### Embedding textures at export instead

If you would rather fix the files once:

- **Blender** — File → Export → FBX, then set **Path Mode: Copy** and click the **embed textures**
  icon beside it.
- **Maya** — Export All → FBX, then Embed Media → **Embed Media** checked.
- **3ds Max** — Export → FBX, then Embed Media → **Embed Media** checked.
- **Metashape / RealityCapture** — export as FBX with *embed textures*, or export `.glb` instead;
  glTF always carries its textures inside a `.glb`.

`.glb` is the more reliable choice generally — it is a single self-contained file by design.

Each artifact is stored in IndexedDB **as its original bytes**, so the library survives a reload
and nothing is lossily re-encoded. `G` opens the gallery to switch between or remove them.

Camera presets are ordered so cycling sweeps one side at a time — Front, the left group working
outward, then the right group — rather than swinging across the artifact on every press.

## What to look at during the gate

Compare against the Unreal editor on the same artifact and camera. Two cases matter:

- **A matte Nasher piece** — should be near-indistinguishable.
- **A gold Quimbaya piece** — the hard case. Metal is almost entirely reflection, and right now it
  reflects a generic procedural room rather than your actual studio. Phase 0's cubemap capture is
  what fixes this.

The largest known gap is missing bounce light on the artifact's underside; there is no real GI
here. See PLAN.md Appendix A.

## Scene values are placeholders

`src/scene/presets.ts` holds the camera, light and pedestal values. **These are reconstructions
from the reference render, not the real ones.** The Unreal level has 13 `CineCameraActor`s and a
RectLight rig whose transforms, FOV and intensities should replace them verbatim once captured on
the Windows machine. Everything is plain data so that swap touches one file.

## Packaging and sharing

Three separate things: **publishing** the app, making it run **offline**, and making a curated
**gallery** portable.

### Publishing — already set up

Live at <https://nikkinaq-a11y.github.io/artifact-viewer/>. To publish a change:

```bash
git push
```

`.github/workflows/deploy.yml` rebuilds and republishes on every push to `main`. GitHub runs the
build on its own machines, so nothing depends on a particular laptop being switched on, and the
link keeps working indefinitely.

The repo setting was already made, recorded here in case it ever needs redoing:
**Settings → Pages → Source → GitHub Actions**.

If this is ever repeated on another account:

- `base: './'` in `vite.config.ts` is what lets the app run from a project subfolder like
  `/artifact-viewer/`. Without it every asset 404s on GitHub Pages.
- Pushing needs a **Personal Access Token**, not an account password, and the token must include
  the **workflow** scope — the commit contains `.github/workflows/`, which GitHub otherwise
  refuses. GitHub Desktop or `gh auth login` sidestep this entirely.
- In Terminal, `cd "~/path"` does **not** work; a tilde inside quotes is not expanded. Use the
  full path.

### Installing the app (works offline)

```bash
npm run build
npx serve dist          # or host dist/ anywhere
```

The build includes a service worker and manifest, so Chrome shows an **install** button in the
address bar. Installed, it opens in its own window with no address bar and **works with no
internet** — the whole app is cached on first visit.

Each person installs it themselves from the link; there is no installer file to hand around.

### Building the Mac app

```bash
npx tauri build
```

Produces `src-tauri/target/release/bundle/macos/Artifact Viewer.app` — about 14 MB,
double-clickable, no browser or terminal involved. It uses macOS's own web engine rather than
bundling a copy of Chrome, which is why it is 14 MB and not ~150 MB.

Three things to know:

- **`dragDropEnabled` is `false`** in `src-tauri/tauri.conf.json`, deliberately. Tauri's native
  file-drop handler otherwise swallows drops before the page sees them, which breaks the drag-in
  feature entirely. Do not turn it on.
- **`.dmg` is not built by default.** That step drives Finder through AppleScript and fails
  outside a logged-in GUI session. Add `"dmg"` to `bundle.targets` when you want a disk image to
  hand out, and run the build from a normal Terminal window.
- The app is **unsigned**, so the first launch on someone else's Mac needs right-click → Open.
  Real distribution eventually means an Apple Developer ID and notarization.

If you move the project folder, run `cargo clean` inside `src-tauri/` before rebuilding — Rust
bakes absolute paths into its cache and the build fails confusingly otherwise.

### Exporting a gallery

Open the **Gallery** tab → **Export gallery**. That writes one `.zip` containing:

- every artifact's original file, unmodified
- any sidecar textures that were dropped with them
- the staged scene — pedestal size, which lights are on and how bright, background theme,
  object scale, camera, and per-artifact nudges
- a `README.txt` listing the contents, for anyone opening the zip by hand

**Import gallery** loads one back. Import **replaces** the current library rather than merging,
so a shared gallery arrives as the curated set it was meant to be.

Size is roughly the sum of the artifacts — five Nasher masks is about 25 MB, which emails fine.
A few 137 MB Museo scans will not. The zip is stored uncompressed on purpose: the contents are
already-compressed JPEG and mesh data, so deflating again costs seconds and saves almost nothing.

## Scripts

```bash
# FBX (embedded textures) -> GLB, via Blender headless
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python scripts/fbx2glb.py -- input.fbx public/artifacts/output.glb

# Screenshot the running dev server
node scripts/shoot.mjs out.png http://localhost:5178/ 9000

# Exercise the keybinds and write a screenshot per state
node scripts/verify.mjs ./shots http://localhost:5178/

# End-to-end: import two real FBX scans, cycle, reload, remove
node scripts/verify-import.mjs ./shots http://localhost:5178/

# Formats, pedestal toggle, gallery tab
node scripts/verify-formats.mjs ./shots http://localhost:5178/

# Which FBX files carry their texture inside them
node scripts/check-fbx-textures.mjs ~/Documents/Documents/PhotogrammetryFiles/FBX_Files

# Regenerate the app icons
node scripts/make-icons.mjs

# Packaging: export a gallery, wipe, re-import, then reload with the network cut.
# Needs the production build being served, not the dev server.
npm run build && npx serve -s dist -l 4178 &
node scripts/verify-packaging.mjs ./shots http://localhost:4178/
```

Screenshots need the dev server already running. `verify.mjs` waits for real load rather than a
fixed timeout — headless Chrome's `--virtual-time-budget` fires before a 5 MB GLB finishes
decoding and will silently capture an empty pedestal.

## Notes for whoever picks this up

- **Units.** State is centimetres to stay comparable with `BP_AdjustablePedestal`; three.js works
  in metres. `src/lib/units.ts` converts at the boundary.
- **Rect lights need `RectAreaLightUniformsLib.init()`** or they render black. Done in
  `Lighting.tsx`.
- **Rect lights cannot cast shadows in three.js.** The look and the shadowing are split: the rect
  rig shapes, a targeted spot casts. Unreal does both with one RectLight via Virtual Shadow Maps.
- **Give a spotLight an explicit target.** Without one it aims at the world origin — the floor
  under the pedestal — which lights the pedestal instead of the artifact.
- **glTF defaults `metallicFactor` to 1.0.** Exporters routinely omit it, which makes a
  photogrammetry scan render as a black mirror. `ArtifactMesh.tsx` forces scans to dielectric;
  genuinely metallic artifacts will need that relaxed once a real studio cubemap exists.