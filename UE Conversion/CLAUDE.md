# Pair Viewer, Unreal port — context for Claude Code

Read this first. It was written on Nikki's Mac, which has no Unreal install, for a session
on the machine that runs UE 5.8.

## What this is

A C++ port of `artifact-pair-web` (React Three Fiber, on Nikki's Mac at
`~/Documents/Duke/Artifact Work/artifact-pair-web/`, not on this machine). Two photogrammetry
scans stand on pedestals **facing each other across a standing sheet of coloured acrylic**.
From behind one object you see the other through the tint, with the near object's face
reflected over it. The pedestals sit the same distance from the sheet, so the reflection
lands exactly where the other object stands and the two faces overlay. That overlay is
the whole piece. Every decision serves it.

The point of the port is that Nikki can tune models, materials, textures, lights and
controls by hand in the editor. So: **logic in C++, every tunable as an editable property.**

**Build alongside, never replace.** This lives in a *copy* of `Artifact_Setup`
(`Artifact_Pair`). Never edit the original project or the web app from here.

## The code has never been compiled

It was written blind against UE 5.x APIs. Your first job is to make it build. Fix API drift
in place and keep the structure. The likeliest trouble spots:

- `UPlanarReflectionComponent` field names (`DistanceFromPlaneFadeoutStart/End`,
  `PrefilterRoughness`, `ScreenPercentage`) in `PairStage.cpp` ApplySheet
- `UInputMappingContext::MapKey` and the runtime-built actions in `PairViewerPawn.cpp`
  BuildInput
- `FPostProcessSettings` auto-exposure fields in ApplyExposure
- `FMath::LineBoxIntersection` overloads in HitTestObjects
- The classes carry no `<MODULE>_API` macro on purpose, so the files work whatever the
  module is called. Add one only if something outside the module needs them.

## Web → Unreal map

| Web (`artifact-pair-web/src/…`) | Here |
|---|---|
| `scene/presets.ts` | `UPairPresets` (C++ defaults) → `DA_PairPresets` |
| `store.ts` | `APairStage` properties + command functions |
| `scene/Acrylic.tsx` (filter pass × reflection pass) | `M_Acrylic` (Thin Translucent) + `UPlanarReflectionComponent` |
| `scene/ArtifactMesh.tsx` auto-fit, facing, eased yaw | `APairStage::ApplyArtifacts`, `Tick` |
| `scene/Pedestal.tsx`, `Studio.tsx`, `Lighting.tsx` | `ApplyPedestals`, `ApplyRoom`, `ApplyLights` |
| `scene/CameraRig.tsx`, `DragRotate.tsx`, `ui/keybinds.ts` | `APairViewerPawn` |
| HUD / help overlay | `APairHUD` |
| import, IndexedDB library, gallery zip, PWA, Tauri | left out: the Content Browser does this job |

## Units and axes

`PairUnits::FromWeb(x, y, z)` = `FVector(-z, x, y) * 100`. Web +z (toward the viewer) is
Unreal −X, so **A stands on −X, B on +X**, and the sheet is the plane X = 0. Every preset
position in `PairPresets.cpp` passes web values through `FromWeb`, so each one can be
checked against `presets.ts`.

Light intensity: web rect lights are in nits, so candelas = nits × width × height (m²).
Exposure is fixed (manual, compensation 0 ≈ the web renderer's exposure 1.0). Expect to
retune by eye; that is what Nikki is here for.

## M_Acrylic parameters (PairStage sets all of them)

`Transmittance` (vector → Thin Translucent output) · `BaseColor` · `Specular` · `Metallic` ·
`Roughness` · `Opacity`. Blend Translucent, shading model Thin Translucent, lighting mode
Surface ForwardShading, two-sided. `Scripts/create_pair_assets.py` builds it. If the script
can't wire the Thin Translucent output node, add it by hand or through MCP.

The C++ does the maths: Beer–Lambert transmittance = tint^depth. Reflectance F0 ≤ 0.08
goes to Specular; anything above spills into Metallic, because Unreal's dielectric specular
tops out at 0.08. Opacity = haze × min(depth, 1).

## First-session checklist

1. The project compiles and the editor opens.
2. Run `Scripts/create_pair_assets.py`, then open an empty level saved as
   `/Game/Pair/LV_PairCapture` and run `Scripts/setup_pair_level.py`.
3. **Check the overlay before anything else.** Use the camera "Through to B". Is the planar
   reflection visible on the sheet at all? Translucent surfaces receiving planar reflections
   is the biggest unknown here. If it doesn't work, try Lumen front-layer translucency
   reflections next; a SceneCapture2D mirror is the fallback. Then move to camera
   "Through to A" (the other side): the reflection must flip. `Tick` rotates the plane's
   normal toward the camera.
4. **Facing.** Both masks should face the sheet. If they all face the same wrong way, set
   `ScanFrontYawDeg` in DA_PairPresets. If just one scan is off, use its `YawOffsetDeg`.
5. **Controls in Play:**
   - C blends round the pair and never through the sheet
   - dragging empty space orbits; dragging an object turns only that object, and its near face follows the mouse
   - the wheel zooms
   - Tab shows help (Slate may swallow Tab; if it does, bind F1 as well)
6. **Colour.** A cycles the tints and T deepens them. Lights crossing the sheet should pick
   up its colour. That's a gain over the web version, where they couldn't.

Take screenshots from all 9 camera presets for Nikki to compare against the web app.

## Known gaps (on purpose, for now)

- **Sheet edges:** the cut edges don't glow. The web draws a separate emissive edge so the
  sheet doesn't vanish edge-on in the Profile view.
- **Pedestals** are engine cubes, not `BP_AdjustablePedestal` (that Blueprint is on the SMB
  copy of Artifact_Setup).
- **No orbit damping.** The web orbit eases; this one stops dead.

## Conventions

- Scene values live in `UPairPresets`, never inline. Staged state lives on `APairStage`.
- Commands on the stage apply only the parts of the scene they change. `OnConstruction`
  re-applies everything, so edits in the Details panel show immediately.
- Key legend follows the web app (C O P H K L V F B, S/1/2, R, A T Z U G N J M, Tab; Shift
  reverses). Rebind keys in `KeyTable()` in `PairViewerPawn.cpp`.
