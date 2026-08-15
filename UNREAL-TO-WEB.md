# How the Unreal viewer became a web app

A plain-language explanation of what moved, what changed, and what was lost. Written for
someone who knows the Unreal project but not web development.

## The one-sentence version

The Unreal viewer was rebuilt as a website so artifacts can be added by dragging a file onto
the page, instead of being baked into a 2 GB build that has to be re-packaged every time the
collection changes.

## Why it had to be rebuilt rather than exported

Unreal 5 cannot export to the web. Epic removed that feature in 2019 and has not brought it
back, so there is no "export to browser" button to press. The scene had to be recreated using
web tools instead.

The good news is that this particular scene is unusually easy to recreate: a dark room, a
pedestal, some lights, and fixed camera angles. There is no character, no physics, no gameplay
— nothing that would have been painful to rebuild.

## What each Unreal piece became

| In Unreal | In the web app | Notes |
|---|---|---|
| `LV_BasicObjectCapture1` (the level) | `src/scene/` | The room, pedestal and lights, written as code instead of placed by hand |
| `BP_PhotoViewerController` | `src/store.ts` | Holds the current camera, object, pedestal size and rotation |
| `BP_AdjustablePedestal` | `src/scene/Pedestal.tsx` | Still measured in centimetres, so the numbers match |
| `BP_RoomRig` (walls, floor) | `src/scene/Studio.tsx` | |
| `BP_RotatingObject` | `src/scene/ArtifactMesh.tsx` | Now steps in fixed 30° increments instead of spinning |
| 13 `CineCameraActor`s | `src/scene/presets.ts` | A simple list of positions — adding an angle is one line |
| `RectLight` actors | `src/scene/Lighting.tsx` | Web has a near-identical rectangular light |
| `BP_KeyboardControls` | `src/ui/keybinds.ts` | Same keys, so muscle memory carries over |
| The 24 pre-placed artifact actors | `src/library/` | **This is the part that changed most — see below** |

## The change that actually mattered

In Unreal, every artifact was a separate actor placed by hand in the level. Switching artifacts
just hid one and showed another. That is why adding a new scan meant opening Unreal, placing
another actor, re-cooking the project, and sending everyone a new 2 GB download.

In the web version there are no pre-placed artifacts. The app reads whatever file you drop onto
it, right at that moment, and adds it to a list stored on your own computer. Adding an artifact
takes a few seconds and requires no rebuild — that was the whole point of the project.

## Where the files live now

Unreal kept everything inside the packaged game. The web app keeps artifacts in the browser's
own storage (called IndexedDB — think of it as a private folder the website is allowed to use).

That means:

- The collection is **per computer**. Two people can each keep their own set.
- Nothing is uploaded anywhere. It works with no internet connection.
- Clearing the browser's site data would clear the collection, so keep the original files.

## What looks different, and why

Unreal renders with Lumen, a system that bounces light around the room the way real light does.
Browsers cannot do this, so the web version fakes it:

- A small extra light stands in for the glow that would bounce off the pedestal.
- The artifact's shadow is drawn by a second, hidden light, because the rectangular lights the
  studio uses cannot cast shadows in a browser.
- Reflections come from a generic room rather than your real studio.

For matte objects — wood, ceramic, terracotta, most of the Nasher collection — the difference is
very hard to see. For shiny gold pieces it is noticeable, because a metal surface is mostly a
mirror, and right now it is mirroring the wrong room. That can be fixed by rendering a picture
of the real Unreal studio and handing it to the web app.

## What the web version gained

- Artifacts added by dragging a file in, with no rebuild.
- Runs from a link, with nothing to install.
- Reads more file types than the Unreal setup did: FBX, GLB, glTF, OBJ, STL, PLY and USD.
- Click and drag to revolve around an object, on top of the fixed camera angles.
- A white-background mode for documentation-style images.
- Can still be turned into an installable Mac or Windows app later if wanted. The reverse was
  never possible — an Unreal project can never become a website.

## What is still to do

- Replace the reconstructed light and camera values with the real ones from the Unreal level.
- Render a reflection image from the real studio so the gold pieces read correctly.
- Shrink very large scans automatically on import (the 137 MB files are slow).
- Publish it to a link so it is not only on one laptop.