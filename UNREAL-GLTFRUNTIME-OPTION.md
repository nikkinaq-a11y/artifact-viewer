# Alternative: staying in Unreal with glTFRuntime

The route not taken, documented so the choice is on paper — and so whoever inherits the Unreal
project has it written down.

**Read this if:** the Phase 1 web prototype doesn't clear your fidelity bar, or the team decides an
installed Mac/Windows app is preferable to a browser page.

---

## What it does and doesn't buy you

**Solves:** the structural bottleneck. Artifacts load from disk at runtime, so adding one no longer
means hand-placing a `BP_RotatingObject`, re-cooking, and redistributing a 2 GB build. Your Lumen
GI, ray-traced reflections, Virtual Shadow Maps, and Substrate materials all survive untouched —
the gold Quimbaya pieces keep reflecting the real room.

**Does not solve:**
- **No drag-onto-window.** A packaged Unreal app has no native OS file-drop support. The UX is a
  file-picker dialog or a watched folder that's scanned on launch or on a refresh button. This was
  the deciding factor against this route, given the stated priority.
- **No browser.** UE5 removed HTML5 export in 4.24. Pixel Streaming is server-hosted video, not a
  packaged web app.
- **Distribution stays heavy.** ~2 GB installer, per-platform builds, and on macOS eventually
  code-signing and notarization.

---

## Architecture

```
Artifact_Viewer.app
├── Artifact_Viewer            (the packaged build — never changes)
└── Artifacts/                 ← team drops files here
    ├── dogon_mask.fbx
    ├── pulley_figure.glb
    └── new_scan.fbx
```

On launch (or on a Refresh button), the app scans `Artifacts/`, loads each mesh through
glTFRuntime, and populates the same `Objects[]` array that `BP_PhotoViewerController` already
cycles with `O`. **The rest of your Blueprint logic is unchanged** — cameras, pedestal, lights,
rotation, and scale keep working exactly as they do now. You are replacing the *source* of
`Objects[]`, not the viewer.

That's the appeal of this route: it's a targeted change, not a rewrite.

---

## Implementation

### 1. Convert to a C++ project

`glTFRuntimeFBX` requires it. In the editor: **Tools → New C++ Class → None → Create Class**. This
generates a `Source/` folder and makes the project compile-on-open.

- **Windows:** Visual Studio with "Game development with C++"
- **Mac:** Xcode (already installed on your Mac; you'd need it on whichever machine builds)

**Your Blueprints stay Blueprints.** You are not rewriting them — you're adding an empty C++ module
so the plugin can compile. Nothing in `BP_PhotoViewerController` changes because of this step.

Cost: the project no longer opens without a working compiler, and build failures become a category
of problem you didn't have before. Relevant for handoff — whoever inherits it needs a toolchain.

### 2. Install the plugins

```bash
cd "/path/to/Artifact_Setup"
mkdir -p Plugins && cd Plugins
git clone https://github.com/rdeioris/glTFRuntime.git
git clone https://github.com/rdeioris/glTFRuntimeFBX.git
```

Both MIT-licensed. `glTFRuntimeFBX` needs glTFRuntime ≥ `20240427`. Regenerate project files and
rebuild. glTFRuntime is also on Fab if you'd rather take the packaged binary for the base plugin.

### 3. Loader actor

A new Blueprint, `BP_ArtifactLoader`:

1. On `BeginPlay`, list files in `Artifacts/` — glTFRuntime ships Blueprint nodes for directory
   listing, or use `GetFilesInDirectory`.
2. Per file, branch on extension: `.glb`/`.gltf` → `glTFRuntimeAsset` nodes; `.fbx` →
   `glTFRuntimeFBX` nodes.
3. `LoadStaticMeshFromAsset` (or the FBX equivalent) → spawn a `BP_RotatingObject`, assign the
   mesh.
4. Auto-fit: `GetBounds`, normalize the longest axis to your display size, seat the minimum-Z on
   the pedestal top. **Do not skip this** — arbitrary FBX arrive in arbitrary units and pivots, and
   your own library already mixes cm-scale scans with `_NM` variants.
5. Append to `BP_PhotoViewerController`'s `Objects[]`.

`glTFRuntimeAsset` exposes async loading nodes — use them, or the app freezes for the duration of a
137 MB scan.

### 4. Runtime materials

glTFRuntime cannot use your editor-authored material instances. It builds materials at runtime from
a **master material you supply**, with parameters it fills in (base color, normal, metallic,
roughness). You author one `M_RuntimeArtifact` master and hand it to the loader config.

Budget real time here. This is where a runtime-loaded artifact will look different from an
editor-imported one, and it's the least obvious part of the job.

---

## Caveats worth knowing before you commit

- **Textures are the weak point, exactly where your assets are unusual.** glTFRuntimeFBX resolves
  external textures only for files sitting *beside* the FBX. Your scans have textures **embedded
  inline** (verified — JPEG data is present in the FBX). That is the better case in principle, but
  **I could not verify glTFRuntimeFBX handles embedded FBX textures.** Prove this on one file
  before building anything else. If it fails, the team must drop `.glb` instead of `.fbx`, which
  means a Blender conversion step and undercuts the whole premise.
- **No Nanite on runtime meshes.** Runtime-created static meshes can't be Nanite-enabled. Your 5M
  poly / 8K texture Museo scans currently lean on the editor import pipeline; loaded at runtime
  they're raw triangles. Expect to decimate before dropping them in — the same problem the web
  route has, just solved outside the app instead of inside it.
- **No collision** is generated by default. Irrelevant for a fixed-camera viewer, relevant if free
  movement ever returns.
- **Memory.** Nothing unloads unless you make it. Loading 117 artifacts at launch will not work;
  load lazily or cap the folder.
- **Load time.** A 137 MB FBX parsed at runtime is slow. Show progress.

---

## Effort

| Task | Estimate |
|---|---|
| C++ conversion + plugin install + first build | half a day, more if the toolchain fights |
| Prove embedded-texture FBX loading on one file | **do this first** — half a day, and it's a go/no-go |
| `BP_ArtifactLoader` + auto-fit + `Objects[]` wiring | 1–2 days |
| Runtime master material tuned to match current look | 1–2 days |
| Watched folder / refresh UX + progress | half a day |
| Packaging + testing on a clean machine | half a day |

Comparable to the web build, with better fidelity and worse ergonomics. The real difference is at
the ends: this route keeps Lumen, and gives a file dialog instead of drag-and-drop.

---

## If you take this route

Do the texture test **first**. Everything else is ordinary work; that one question is the only
thing that can invalidate the plan, and it costs half a day to answer.

1. Convert to C++, install both plugins, confirm it builds.
2. Load `1976_91_18_Dogon_Mask_85K_poly_4K_tex.fbx` at runtime and check whether the texture
   appears without a sidecar `.jpg`.
3. If yes → build `BP_ArtifactLoader`. If no → decide whether a Blender FBX→GLB step is acceptable
   for the team, and if it isn't, this route is dead and the web app is the answer.

## Sources

- [glTFRuntime](https://github.com/rdeioris/glTFRuntime) — MIT, UE 4.25+
- [glTFRuntimeFBX](https://github.com/rdeioris/glTFRuntimeFBX) — FBX extension via `ufbx`
- [Using Datasmith at Runtime](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-datasmith-at-runtime) — Epic-official alternative, `.udatasmith`/CAD-oriented
- [Product Configurator Template](https://dev.epicgames.com/documentation/unreal-engine/product-configurator-template-in-unreal-engine) — variant/UI system, **not** runtime loading