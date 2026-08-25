# Artifact Viewer → Drag-and-Drop Standalone App

## Context

You built a museum-artifact viewer in Unreal (`Artifact_Setup`, UE 5.7, Blueprint-only) that
displays photogrammetry scans on an adjustable pedestal in a controlled studio room, with
toggleable lights, wall color, object rotation and scale, and fixed camera angles cycled by
keyboard.

**The bottleneck is structural.** The baseline viewer level `LV_BasicObjectCapture1` contains
~24 pre-placed `BP_RotatingObject` actors — one per artifact — which `BP_PhotoViewerController`
cycles with `SetActorHiddenInGame` over an `Objects[]` array. Nothing loads at runtime. Adding an
artifact means opening Unreal, hand-placing an actor, re-cooking, and redistributing a ~2 GB
build.

**The goal, in your words:** an app where objects are added by *dragging and dropping an FBX that
has a texture applied*. Web preferred; a packaged Mac app is acceptable. It has to outlive your
time on the project — the team adds assets without editing the app.

### Why not "build it in Unreal and package it for web"

**UE5 cannot export to the web.** Epic removed HTML5/WebGL export in UE 4.24 (2019) and has not
restored it; UE 5.8 (June 2026) doesn't change this. The only browser path from UE5 is **Pixel
Streaming**, which doesn't package anything for the web — it runs the app on a GPU server and
streams video to the viewer. That means a rented GPU instance running continuously, billed hourly,
maintained by someone after you leave. It's the worst possible property for a handoff.

Runtime asset loading *is* solvable inside Unreal — [glTFRuntime](https://github.com/rdeioris/glTFRuntime)
(MIT, UE 4.25+) plus [glTFRuntimeFBX](https://github.com/rdeioris/glTFRuntimeFBX) (uses `ufbx`)
load meshes from the filesystem at runtime. But that route gives a *file dialog or watched
folder*, not drag-and-drop; requires converting the project to C++; and has the weakest texture
story exactly where your assets are unusual. It was weighed and set aside.

**Decisive asymmetry:** a web app can be wrapped as a Mac `.app` later (Tauri/Electron) if the
team ever wants an installer. Unreal can never become a web app. Building for the browser
preserves both acceptable outcomes.

### Approach: prototype first, then commit

**The direction is not locked yet.** Phase 1 builds the three.js studio scene with one artifact so
you can put it side-by-side against your Unreal render and judge the fidelity gap with your own
eyes rather than from a table. That comparison is the decision gate.

Two deliverables come out of this plan before you commit:
1. **The Phase 1 prototype** — a running web scene to compare against Unreal.
2. **`UNREAL-GLTFRUNTIME-OPTION.md`** — a standalone writeup of the Unreal + glTFRuntime route:
   plugin setup, the C++ project conversion, the FBX extension and its texture caveats, the
   watched-folder UX, and the packaging implications. Written so the choice is on paper, and so
   whoever inherits the Unreal version has it documented. *(Appendix B is the summary; this is the
   full version.)*

If the prototype convinces you, continue to Phases 2–6. If it doesn't, the writeup is the
implementation guide for the Unreal route instead.

### Working assumptions (revisit only if the gate changes them)

- **Web browser**, three.js / React Three Fiber, static site, no backend
- **Drag-and-drop FBX with embedded textures** is the headline feature and the acceptance test
- **Studio-accurate fidelity** — Lumen GI and ray tracing are not reproduced
- **Raw FBX in, auto-optimized on import**, with a progress bar
- **Local per-machine library** — no server, no accounts, works offline
- **Fixed camera presets only** — no free-fly
- **Mirror deferred to v2**, with a clean seam left for it
- **Seed with ~5 artifacts**; everything else imported or removed by hand
- **The Unreal build stays alive temporarily**, until the web app reaches parity

---

## Working split: who does what

**Hard constraint:** Blueprints are compiled binary `.uasset` files. Claude can *read* them (that's
how the keybinding table and pedestal parameters below were recovered) but **cannot author or edit
a Blueprint graph.** Converting the project to C++ to work around this is a bad trade — it doesn't
change the web story, adds a compile toolchain, and is throwaway work.

| Work | Owner |
|---|---|
| Blueprint graph edits — tweaks to existing controls | **You** |
| `Config/*.ini` fixes | Claude |
| Editor Python automation | Claude |
| Packaging / `BuildCookRun` troubleshooting | Claude |
| The whole web app | Claude + you |

**On new Unreal features:** anything genuinely new is a build-it-twice risk, since Unreal is
temporary. Unless you need it working in Unreal within the next few weeks, put it in the web app.

---

## Source of truth

**Use the network drive.** The local copy at `~/Documents/Duke/Artifact Work/` is stale
(March 1) and missing most of what follows.

```
/Volumes/Nicole_Quinn/NOMA General/NOMA Unreal/Artifact_Setup/
    Artifact_Setup_Project.uproject      # note: not Artifact_Setup.uproject
    Content/                             # 5.9 GB, modified Aug 11
      LV_BasicObjectCapture1.umap        # ← the baseline viewer level
      Blueprints/
      Objects/                           # 117 artifact assets
      __ExternalActors__/LV_BasicObjectCapture1/   # 56 actors (World Partition)
```

### Current feature set

Verbatim from the `BP_KeyboardControls` legend widget — this is the spec to match:

| Key | Action |
|---|---|
| `C` | switch camera view |
| `O` | cycle object |
| `R` | rotate |
| `P` | object scale *(Shift+P to reverse)* |
| `H` | pedestal height *(Shift+H)* |
| `K` | pedestal width *(Shift+K)* |
| `L` | pedestal length *(Shift+L)* |
| `I` | pedestal distance from mirror *(Shift+I)* — v2 |
| `Tab` | toggle the controls overlay |

### Blueprints and what each becomes

| Blueprint | Role | Ports to |
|---|---|---|
| `BP_PhotoViewerController` (335 KB) | The app. `Cameras[]`/`CurrentCamIndex` → `SetViewTargetWithBlend`; `Objects[]`/`CurrentObjectIndex` → `SetActorHiddenInGame`; `BlendTime/Exp/Func` | `store.ts` + `CameraRig.tsx` |
| `BP_AdjustablePedestal` (247 KB) | `WidthCm`/`HeightCm`/`LengthCm`, each with Min/Max, plus `DimensionStepCm` | `Pedestal.tsx` — **port the cm values directly** |
| `BP_ScaleObject`, `BP_Rotating_ScalingObject` | `ScaleUp`/`ScaleDown`, `ScaleRule`, `RotationRule` | `ArtifactMesh.tsx` |
| `BP_RoomRig` | Walls / floor | `Studio.tsx` |
| `BP_KeyboardControls` | UMG legend overlay | `HelpOverlay.tsx` |

`BP_AdjustablePedestal` is already parameterized in real centimetres with min/max clamps — a direct
data port, not a re-derivation. The level also holds **13 `CineCameraActor`s** (port their
transforms and FOV verbatim), `Cube`–`Cube5` walls, `Floor`, `DirectionalLightGame`,
`Full_Exposure2`.

### Two things to know

- **Packaging config is stale.** `DefaultGame.ini` has `MapsToCook=(FilePath="Lvl_SingleObjectCapture")`
  and `DefaultEngine.ini` has `GameDefaultMap=LV_SingleObjectCapture` — but that map is now a
  1.3 KB stub and the real viewer is `LV_BasicObjectCapture1`. `GlobalDefaultGameMode` still points
  at `BP_FirstPersonGameMode` while the level overrides to `BP_FlyingGameMode`. **Fixed in Phase 0.**
  Until then don't trust the existing `.app` as a fidelity reference — use the editor.
- **`LV_SingleObjectCapture_Michelle_Edits1.umap` exists** — someone else works in this project.
  Worth settling who inherits the Unreal version.

### Source meshes

`~/Documents/Duke/Artifact Work/PhotogrammetryFiles/FBX_Files/` — verified **binary FBX 7.x with textures
embedded inline** (JPEG data present in the FBX; `.fbm` folders and sidecar `.jpg`s are extracted
duplicates). A lone dropped `.fbx` is self-contained, and three.js `FBXLoader` parses embedded
textures natively. **This is what makes the headline feature work.**

Sizes split sharply: Nasher files are **3–16 MB** and load instantly; Museo/Quimbaya scans and the
new `Museo_de_Amer_August26_Full8K` set run **111–137 MB at ~5M polys with 8K normals** and must be
decimated.

---

## Target architecture

**Vite + React + TypeScript + React Three Fiber.** Static output, no backend.

```
src/
  scene/
    Studio.tsx          # room, walls, floor, wall color — from BP_RoomRig
    Pedestal.tsx        # width/height/length in cm — from BP_AdjustablePedestal
    Lighting.tsx        # RectAreaLight rig + toggles/intensity
    CameraRig.tsx       # 13 presets, blended transitions
    ArtifactMesh.tsx    # active artifact, turntable, scale
    Reflector.tsx       # v2 seam — interface reserved, not implemented
  import/
    DropZone.tsx        # the headline feature
    fbxPipeline.ts      # FBX → optimized GLB (Web Worker)
    autoFit.ts          # normalize scale/orientation, seat on pedestal
    thumbnail.ts        # offscreen render for gallery tiles
  library/
    db.ts               # IndexedDB (idb) — GLB blob + thumb + metadata
    GalleryPanel.tsx    # grid, add, remove, reorder, visibility
  ui/
    ControlPanel.tsx    # on-screen controls
    HelpOverlay.tsx     # Tab — the BP_KeyboardControls legend
    keybinds.ts         # C O R P H K L + Shift, Tab
  store.ts              # Zustand — BP_PhotoViewerController's state
scripts/
  bake-artifacts.mjs    # Node CLI: batch FBX → GLB for the seed set
  unreal/place_artifacts.py   # Phase 0 — Unreal editor automation
```

**Scene parity.** three.js `RectAreaLight` is a direct analogue of your UE `RectLight` — but call
`RectAreaLightUniformsLib.init()` or they render black. Use `ACESFilmicToneMapping` + sRGB output +
a PMREM studio environment, `PCFSoftShadowMap`, and drei `<ContactShadows>` for the grounding you
currently get free from Lumen.

**Camera transitions.** `SetViewTargetWithBlend` becomes a position lerp + quaternion `slerp`,
carrying `BlendTime` and an easing approximating `BlendExp`/`BlendFunc`. Keep the 13 presets as a
data array so adding an angle is an edit, not code.

**Auto-fit is the piece most likely to be underestimated.** Arbitrary FBX arrive in arbitrary
units, orientations, and pivots — your own library mixes cm-scale scans with `_NM` variants. On
import: compute `Box3`, normalize the longest axis to a target display size, center X/Z, seat
minimum-Y on the pedestal top. Persist a per-artifact scale/rotation/offset override so a bad scan
is nudged once and stays fixed.

**Import pipeline** (Web Worker, progress reported to a modal):
1. `File` → `ArrayBuffer` → `FBXLoader.parse()` — embedded textures resolve automatically
2. Normalize: merge geometry, generate vertex normals if absent, drop unused attributes
3. Triangles > ~250k → `meshoptimizer`'s `meshopt_simplify` (wasm)
4. Textures → `createImageBitmap` + canvas downscale to ≤2048 px, re-encode WebP
5. `GLTFExporter` → GLB blob
6. Offscreen thumbnail render
7. Persist to IndexedDB

Steps 3–4 turn a 137 MB scan into ~5–10 MB. Canvas/WebP is chosen over KTX2/Basis deliberately —
in-browser Basis encoding is slow and adds a heavy dependency for little gain at this scale.

---

## Phases

One at a time, each ending somewhere runnable. Start a fresh Claude Code session per phase and
point it at this file.

**Phase 0 — Keep Unreal usable (interim, parallel).**
**Run this one from Claude Code on your Windows/Unreal machine**, not the Mac — then the Python
script can be iterated against real editor errors instead of written blind.

No Blueprint graphs touched: `scripts/unreal/place_artifacts.py` (Editor Python that enumerates
`Content/Objects/`, spawns a `BP_RotatingObject` per artifact into `LV_BasicObjectCapture1`,
applies consistent transforms, populates `Objects[]`, and is idempotent on re-run); fix the stale
packaging config; verify a clean build. Enable **Edit → Plugins → "Python Editor Script Plugin"**
first — a checkbox, no C++ required. You make Blueprint tweaks; Claude does the rest.

While you're on that machine, also capture the two things Phase 1 needs: a **cubemap rendered from
the studio room** (for matching reflections on the gold pieces) and the **light/camera values** from
`LV_BasicObjectCapture1`.

**Phase 1 — Studio scene prototype. ← DECISION GATE**
Vite + R3F skeleton. Room, pedestal, RectAreaLight rig, 13 camera presets, turntable, tonemapping,
one hand-converted `.glb`. Port the light and camera values out of the Unreal level rather than
eyeballing them, so the comparison is fair.

Also produced here: **`UNREAL-GLTFRUNTIME-OPTION.md`**, the standalone writeup of the Unreal route.

*Then stop and compare.* Open the prototype beside your Unreal render — ideally the editor on your
Windows machine, on the same artifact and camera. Include one **gold Quimbaya piece**, since metal
is the harshest test and the one most likely to change your mind. Decide there whether to continue
to Phase 2 or switch to the Unreal route.

**Phase 2 — Drag-and-drop import.** *(ahead of controls — it's the priority)*
Drop zone, Worker pipeline, progress modal, auto-fit. Prove the headline feature early against
both extremes: a 3 MB Nasher mask and a 137 MB Museo scan.

**Phase 3 — Controls.**
`ControlPanel.tsx` covering light toggles + intensity, pedestal width/height/length (reuse the cm
min/max/step from `BP_AdjustablePedestal`), wall color, rotate on/off + speed, object scale, camera
cycling. Wire `keybinds.ts` for C/O/R/P/H/K/L + Shift and Tab, so muscle memory and any demo script
still work.

**Phase 4 — Gallery.**
IndexedDB persistence, thumbnail grid, add/remove/rename/reorder, per-artifact transform overrides.
This is what retires the repackaging loop.

**Phase 5 — Seed set.**
`scripts/bake-artifacts.mjs` (Node, `gltf-transform` + `meshoptimizer`) baking **5 artifacts**.
Suggested — all small, embedded-texture, known-good:
`1976_91_18_Dogon_Mask_85K_poly_4K_tex` (5 MB) · `1975_16_4_Pulley_Figure` (7 MB) ·
`1978_28_8_Male_Twin_Figure` (3.4 MB) · `2015_4_16_1_Wooden_Spoon_100k_polys` (4.1 MB) ·
`1978_48_113_Antelope_100K_polys` (4.2 MB). Keep it general enough to bake any of the other 112.

**Phase 6 — Deploy.**
`vite build` → **GitHub Pages**. Free, permanent, survives graduation, gives you a portfolio URL.
`file://` won't work (ES module CORS), so local use means `npx serve dist` or the hosted URL.
*Optional:* wrap in Tauri for a double-clickable Mac `.app` if the team wants an installer.

---

## Risks

- **The 111–137 MB FBX files are the real test.** `FBXLoader.parse` on a 5M-poly mesh spikes memory
  hard. If a tab dies, route those specific artifacts through the Phase 5 Node CLI instead. Files
  in the 3–16 MB range — most of the Nasher collection — will be fine.
- **`GLTFExporter` in a Worker** can fight you over texture handling. If it does, run the export on
  the main thread behind the progress modal.
- **Fidelity delta.** Missing Lumen bounce shows most on the dark wall behind the artifact. A good
  studio HDRI plus contact shadows closes most of it; budget real Phase 1 time for lighting.
- **Network drive.** Read the Unreal project from `/Volumes/Nicole_Quinn/` for reference values,
  but keep the web project in local git. Don't develop against the share.

---

## Appendix A — Visual fidelity: Unreal vs. three.js

| | Unreal (packaged) | three.js (web) |
|---|---|---|
| Global illumination | Lumen real-time bounce | No true GI — IBL + fill lights approximate |
| Reflections | Ray-traced, shows the actual room | Env-map only — reflects the HDRI you supply |
| Shadows | Virtual Shadow Maps, high-res, stable | PCF/VSM maps — needs tuning, softer |
| Ambient occlusion | Lumen + screen-space | SSAO, or AO baked into the texture |
| Materials | Substrate | Standard PBR metallic/roughness |
| Textures | 8K virtual texture streaming | Downsampled (2K default, 4K for small meshes) |
| Anti-aliasing | TSR (excellent) | SMAA/TAA — slightly softer edges |

**What actually shows up in *your* scene — three things:**

1. **Bounce light on the artifact's underside.** A dark room lit by rect lights is the case where
   Lumen earns its keep: light bounces off the pedestal top back into the artifact's undersides and
   crevices. Without GI those areas go flatter and darker. *Mitigation:* a low-intensity fill light
   plus AO baked into the texture during the Phase 5 bake. **This is the largest single delta.**
2. **The gold Quimbaya pieces.** `45gold_container_quimbaya_culture`, `43/44gold_cinerary_urn` —
   metal is almost entirely reflection, so it renders as whatever it reflects. Unreal ray-traces
   your real dark room; three.js reflects the environment map you hand it. *Mitigation, and a good
   one:* render a cubemap **from your Unreal room** and ship it as the three.js environment. The
   gold then reflects your actual studio. One-time bake, closes most of the gap.
3. **8K → 2K downsampling** on tight camera angles. Your `Full8K` set exists because resolution
   matters. *Mitigation:* the 2K cap is a default chosen for the 137 MB scans, not a hard limit —
   raise it to 4K for meshes under a size threshold.

**What barely changes:** matte ceramic, wood, and terracotta — most of the Nasher collection. Those
are diffuse dielectrics with normal maps, which PBR reproduces nearly identically. Silhouette,
pedestal, framing, and camera behavior are unaffected.

**A capability you'd gain:** `three-gpu-pathtracer` can add a "high-quality still" mode that
path-traces the current view over a few seconds for publication images — better than what your
real-time Unreal build produces for stills.

## Appendix B — Unreal runtime-loading options assessed

| Option | Verdict |
|---|---|
| **Product Configurator template** | Solves a different problem. It uses Level Variant Sets with **Actor switching** — variation between *pre-placed actors*, which is exactly what `SetActorHiddenInGame` already does. "Add variations without Blueprint code" means without editing graphs *in the editor*, not at runtime. Gains a much nicer auto-generated UMG UI; **artifacts still ship inside the build.** |
| **Datasmith Runtime** | Epic-official, Mac + Windows, Blueprint nodes for runtime import. Most credible Unreal-native path — but built around `.udatasmith` and CAD. FBX-at-runtime is *not* clearly documented and could not be verified; Datasmith's FBX support is an editor import path. Medium-high risk. |
| **glTFRuntime + glTFRuntimeFBX** | MIT, mature, explicitly does runtime FBX via `ufbx`. Best odds for FBX specifically. Requires converting to a C++ project; external-texture support limited to files beside the FBX. |
| **Pak / DLC chunk mounting** | Cook artifacts into separate `.pak` files, mount at runtime. Works — but the team needs Unreal installed to cook each new artifact, which defeats the handoff goal. |

**The constraint that applies to all four:** a packaged Unreal app has **no native drag-a-file-onto-
the-window support**. Even with runtime loading solved, the UX is a file-picker dialog or a watched
folder, not drag-and-drop.

**Practical note:** Unreal is not installed on the Mac (no Epic launcher, no engine). Parallels,
the Windows App, and the `X:/…` paths inside the FBX textures indicate Unreal work happens on a
Windows VM or lab machine. Any Unreal path means round-tripping between machines; the web app is
built and run entirely on the Mac.

---

## Verification

**Phase 0 (Unreal interim):**
- `place_artifacts.py` runs clean; artifacts appear in `LV_BasicObjectCapture1` with correct
  transforms and a populated `Objects[]`; re-running doesn't duplicate actors.
- A packaged build launches into the **baseline viewer level**, not the stub, and every key in the
  *Current feature set* table behaves as its legend says.

**Web app:**
1. `npm run dev` — scene renders, no console errors, 60 fps with one artifact loaded.
2. **Fidelity check — this is the Phase 1 gate.** Same artifact, same camera, same lighting, side
   by side against the Unreal *editor* (not the stale `.app`). Use `~/Documents/Artifact Viewer
   Object.jpeg` as a reference if the Windows machine isn't handy. Judge two cases deliberately: a
   matte Nasher piece (should be near-indistinguishable) and a **gold Quimbaya piece** (the hard
   case). Continue to Phase 2 only if the answer is yes.
3. **The headline test.** Drag `FBX_Files/1976_91_18_Dogon_Mask_85K_poly_4K_tex.fbx` from Finder
   onto the page. It must appear **textured**, correctly scaled, seated on the pedestal, within
   seconds — no companion files, no conversion step. Then drop a 137 MB Museo scan and confirm it
   completes without killing the tab.
4. **Parity check.** Every key in the `BP_KeyboardControls` table works, and the pedestal respects
   the same cm min/max limits as `BP_AdjustablePedestal`.
5. **Persistence.** Import, hard-refresh, confirm the artifact survives with thumbnail and
   transform overrides. Remove one; confirm it stays removed.
6. **The actual goal.** Someone who is not you adds a brand-new artifact and removes another,
   without opening Unreal and without instructions beyond "drag it in."
7. Final: `npm run build && npx serve dist`, repeat 3–6 against the production build.
