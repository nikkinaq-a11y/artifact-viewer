# Artifact Viewer (web)

Browser rebuild of the Unreal `Artifact_Setup` viewer, so museum artifacts can be added by
dragging in an FBX instead of repackaging the whole application.

**Live: <https://nikkinaq-a11y.github.io/artifact-viewer/>**
· repo <https://github.com/nikkinaq-a11y/artifact-viewer>

📖 **Not a developer? Read the [Artifact Viewer Handbook](Artifact-Viewer-Handbook.pdf)** — the
plain-English guide for museum staff: the address to visit, how to install it as an offline app
with its own icon, how to drag objects in, and how to send someone a collection. It needs nothing
in this repository and assumes no technical background.

Opens on any computer with nothing installed. The gallery starts **empty by design** — send a
[gallery `.zip`](#exporting-a-gallery) alongside the link to show a collection.

**Status.** The studio scene, lighting rig, 5 front-facing camera presets (each with three
distances on `D`, and a height slider on the tilted views), orbit, pedestal controls and the artifact gallery all work. Four scene modes on
`B`, including a **silhouette** mode that drops the floor, turns the background white and switches the rig off. Two light settings on `L` with a five-step brightness slider, a three-way pedestal on `P`, and PNG snapshots on `I`. **Artifacts
are added by dragging a model onto the window**, persist per machine, and a curated gallery can be
exported as a single file. It installs as an offline web app, downloads as a Mac app, and is deployed
to the public link above. Still to do: an on-screen control panel with sliders, artifact
thumbnails, automatic decimation of very large scans, and the seed set.

### Documentation

| File | For |
|---|---|
| **[Artifact Viewer Handbook.pdf](Artifact-Viewer-Handbook.pdf)** | **Start here if you are not a developer** — opening the viewer, installing it offline, adding objects, sharing a collection. Written for museum staff, and current — five front-facing camera angles, three distances on `D`, the camera height slider, light / stark on `L` with the brightness slider, the white pedestal, `I` snapshots, the new initial-letter keys, and silhouette. Source: [Artifact-Viewer-Handbook.html](Artifact-Viewer-Handbook.html) |
| **README (this file)** | **Start here to *use* the viewer as a developer** — the live link, [controls](#controls), formats, packaging, troubleshooting |
| **[CLAUDE.md](CLAUDE.md)** | **Start here in a new Claude session** — status, architecture, and every gotcha found so far |
| [PLAN.md](PLAN.md) | The full plan: findings from the Unreal project, decisions and why, phases |
| [UNREAL-TO-WEB.md](UNREAL-TO-WEB.md) | Plain-language explanation of the translation — safe to send a coworker |
| [UNREAL-GLTFRUNTIME-OPTION.md](UNREAL-GLTFRUNTIME-OPTION.md) | The route not taken: staying in Unreal |

## Running it

Node is installed at `/usr/local/bin` but may not be on your `PATH`:

```bash
export PATH="/usr/local/bin:$PATH"
npm install
npm run dev
```

Then open the printed URL. `file://` will not work — ES modules need a server.

## Controls

Each key is the initial of what it does. These replaced the Unreal `BP_KeyboardControls` letters
on 2026-10-08 (P was scale, K/L pedestal width/length, V pedestal, F light), so an old demo script
needs updating.

| Key | Action |
|---|---|
| `C` | switch camera view (Shift+C goes back) |
| `D` | camera distance — far / mid / near, holding the view you are on |
| `O` | cycle object (Shift+O goes back) |
| `R` | rotate 30°, one of 12 steps around a full turn (Shift+R to undo) |
| `S` | object scale (Shift+S smaller) |
| `H` | height — pedestal, and the object on it (Shift+H lower) |
| `W` | pedestal width (Shift+W narrower) |
| `Z` | pedestal depth — the z-axis (Shift+Z shallower) |
| `P` | pedestal — standard / hidden (artifact stays where it is, floating) / white |
| `L` | lighting — light / stark; brightness is the slider on the right edge (no effect in silhouette) |
| `B` | scene (background) — dark / white / horizon / silhouette |
| `I` | save an image — PNG snapshot of the scene, no HUD or panels |
| `Tab` | controls overlay |

**Click and drag to revolve** around the artifact from wherever the current preset put you;
scroll to zoom. `C` still jumps to the next preset, and dragging cancels an in-flight blend so
the camera never fights the mouse.

**Camera height.** On the Upper and Lower views a vertical slider appears at the right edge. It
raises and lowers the camera and its target together — ±35 cm — so the angle of the view is kept
and only the vantage height moves. Each view remembers its own setting (saved in gallery files
too); double-click resets it. There is one straight-on view; the old Front High / Front Low
rise-and-fall variants were cut in its favour.

`D` gives three framings of the view you are already on rather than more presets: **Far** (the
default), then **Mid**, then **Near**, each about a third closer than the last. It moves the camera
along its own line of sight and leaves the focal length alone, so the shot reads as the same one
taken from nearer instead of a narrower one. It works on a view you have orbited or
scrolled to as well — it dollies whatever is on screen and never changes which preset is selected.

`B` cycles four studio scenes rather than toggling two. **Dark** is the gallery default and
**white** is for documentation-style plates. **Horizon** puts a light blue floor against a grey
backdrop, so the horizon reads as a clear line instead of disappearing into one continuous field —
it is for when you need to see where the artifact is standing. There are no walls in any scene: the
floor is large and fog in the background colour dissolves its far edge.

**Silhouette** is a lighting state as much as a background. The floor goes, the background turns
pure white and the entire light rig switches off, so nothing lights the artifact and it reads as a
flat black cut-out — profile, openwork and negative space, with no surface detail to compete.
Both halves are required: a lit artifact in front of white is not a silhouette, and an unlit one
against something dark is just invisible. Leaving the mode restores the light setting and level
that were up before — which is also why `L` and the light slider do nothing in silhouette.

**Lighting** is two settings on `L` — **light** and **stark** — and a five-step brightness slider
on the right edge that scales every light in whichever setting is up. All the values are
`LIGHT_SETTINGS` and `LIGHT_LEVELS` in `presets.ts`; `LIGHT_PRESETS` holds only where each panel sits.

- **light** is the everyday setting: shaped light from the upper left, with the front panel (the
  `FrontLight` that `BP_PhotoViewerController` defines but never binds) and a little ambient
  keeping the shadow side readable. It replaced the old studio and front settings, and is gentler
  than either was: pale scans, such as the Dancer Doll and the Yoruba Staff, blew out under the old
  levels. Its middle step is about 12% dimmer than the old studio setting, and its top step stays
  below the old front light.
- **stark** is one small, hard key high at the side, a strong cool rim from behind, and no fill,
  bounce or ambient, so the object splits into a lit half and a black half.

**Why the spot does most of the lighting.** `RectAreaLight` cannot cast shadows, so the cast shadow
comes from a separate spot. Any rect light shines straight into that shadow and lifts it, which is
what made the pedestal shadows pale and patchy when the rect key carried the light. The rect key is
now low, for soft modelling, and the shadow-casting spot carries the key light. The shadow bias is
kept small so the shadow starts at the object's base instead of a few millimetres off it.

Galleries save the setting and the level. Galleries written before 2026-10-11 map across: their
dramatic switch becomes stark, and their saved light intensities are ignored, because there was
never a control for them and they only carried the old, too-bright tuning.

The lower-left **scene readout** collapses: click the camera chip at its top and the panel reduces
to that chip alone, so the artifact has the frame to itself without losing the view you are on.
Click it again to expand. Like the gallery, it is not on a key.

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

In `~/Documents/Duke/Artifact Work/PhotogrammetryFiles/FBX_Files`, 14 of 21 embed their texture. These 7
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

### The Mac app download

**Permanent download link (always the newest version):**
<https://github.com/nikkinaq-a11y/artifact-viewer/releases/latest/download/Artifact-Viewer-Mac.dmg>
It is also linked from the website's Tab help overlay.

GitHub builds it, not a laptop. `.github/workflows/release-mac.yml` runs on a version tag, builds a
universal (Apple Silicon + Intel) app and `.dmg`, attaches them to a GitHub Release, and re-uploads
the `.dmg` as `Artifact-Viewer-Mac.dmg` so the link above never changes. To publish a new version:

```bash
# bump "version" in src-tauri/tauri.conf.json, commit, push, then:
git tag v0.3.0 && git push origin v0.3.0
```

The build is ad-hoc signed, not notarized, so the first launch needs **System Settings → Privacy &
Security → Open Anyway**. Real notarization needs an Apple Developer ID. The starter scans are
gitignored, so the downloaded app opens with an empty gallery, the same as the website.

### Building the Mac app locally

```bash
npx tauri build --bundles app
```

Produces `src-tauri/target/release/bundle/macos/Artifact Viewer.app` — about 14 MB,
double-clickable, no browser or terminal involved. It uses macOS's own web engine rather than
bundling a copy of Chrome, which is why it is 14 MB and not ~150 MB. A local build *does*
include the starter scans in `public/seed/`.

Things to know:

- **Saving goes through a native Save panel.** An `<a download>` click does nothing in the app's
  WebKit window, so gallery exports and snapshots used to silently go nowhere. `src/lib/saveFile.ts`
  detects the app and calls two Rust commands in `src-tauri/src/lib.rs`: one opens the Save panel,
  the other writes the bytes, which are sent raw rather than as JSON because a gallery can be
  hundreds of MB.
- **`@tauri-apps/api` (npm) and the `tauri` crate must be on the same minor version** (both 2.12
  now). The build refuses to run if they drift apart.
- **`dragDropEnabled` is `false`** in `src-tauri/tauri.conf.json`, deliberately. Tauri's native
  file-drop handler otherwise swallows drops before the page sees them, which breaks the drag-in
  feature entirely. Do not turn it on.
- **`.dmg` is in `bundle.targets`** for the GitHub build. Locally, pass `--bundles app`: the `.dmg`
  step drives Finder through AppleScript and fails outside a logged-in GUI session.

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
node scripts/check-fbx-textures.mjs ~/Documents/Duke/Artifact Work/PhotogrammetryFiles/FBX_Files

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