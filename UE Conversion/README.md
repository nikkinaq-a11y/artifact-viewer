# Pair Viewer — Unreal port

The pair viewer (`artifact-pair-web`) rebuilt as an Unreal Engine 5.8 level: C++ for the
behaviour, the Details panel and a Data Asset for tweaking. The web app stays as it is.

**Status:** written on a Mac with no Unreal installed, so **none of this has been compiled
yet.** Expect a round of compile fixes on the first run — that is step 5's job.

## What's here

```
Source/PairViewer/    C++ — copy into the project's Source/<Project>/ folder
  PairTypes.h           structs, and FromWeb(): web metres → Unreal cm
  PairPresets.h/.cpp    every scene value (the web's presets.ts), as a Data Asset
  PairStage.h/.cpp      room, pedestals, objects, sheet, lights — and all the state
  PairViewerPawn.h/.cpp camera presets, orbit, zoom, drag-to-turn, the key legend
  PairPlayerController  cursor stays visible
  PairHUD               lower-left readout, Tab help
  PairGameMode          ties the above together
Scripts/
  create_pair_assets.py makes M_Acrylic and DA_PairPresets
  setup_pair_level.py   stages the pair in the open level
Config/
  DefaultEngine.additions.ini   one setting planar reflections need
CLAUDE.md             context for Claude Code on the Unreal machine
```

## Steps on the 5.8 machine

1. **Copy, don't convert.** Duplicate `Artifact_Setup` from the SMB share to a new folder
   `Artifact_Pair` (rename the `.uproject` to `Artifact_Pair.uproject`). Open the copy in
   UE 5.8 and let it convert. The original stays on 5.7, untouched.
2. **Plugins** (Edit > Plugins), then restart:
   - Unreal MCP, All Toolsets
   - Python Editor Script Plugin
3. **Planar reflections:** Project Settings > Rendering > *Support global clip plane for
   Planar Reflections* → on (or append `Config/DefaultEngine.additions.ini`). Restart.
4. **Add C++ to the project:** Tools > New C++ Class > Actor, name it `PairStage`. This
   makes the module and asks Xcode to compile it. Close the editor, then:
   - delete the wizard's `PairStage.h` / `PairStage.cpp`, wherever it put them
   - copy everything in `Source/PairViewer/` into `Source/Artifact_Pair/`
   - in `Source/Artifact_Pair/Artifact_Pair.Build.cs`, make sure `"EnhancedInput"` is in
     `PublicDependencyModuleNames`

   Check which Xcode version UE 5.8 needs before this step (Epic's 5.8 release notes, macOS
   section). Unreal only builds with specific Xcode versions.
5. **Hand over to Claude Code.** Copy `CLAUDE.md` into the project root. In the editor's
   console run `ModelContextProtocol.GenerateClientConfig ClaudeCode`, then start Claude
   Code in the project root and install Epic's plugin:
   `/plugin install unreal-engine-skills-for-claude-code@claude-plugins-official`.
   Tell it: *"Follow CLAUDE.md: get it compiling, then run the first-session checklist."*
6. **Or by hand:** build, reopen the editor, File > New Level > Empty Level, save it as
   `LV_PairCapture`, then Tools > Execute Python Script… — `create_pair_assets.py` first,
   then `setup_pair_level.py`. Press Play.

## Tweaking

- **Select PairStage** in the level. Every value (pedestals, sheet size, tint, depth,
  reflectance, polish, room, lights on/off, which scans) is in the Details panel under
  *Pair*, and edits show up immediately without pressing Play.
- **Open DA_PairPresets** to change the defaults themselves: camera positions, tint colours,
  light positions and brightness, ranges and step sizes. Click *Reset To Presets* on the
  stage to re-apply.
- **Add scans** to the stage's *Artifacts* list; O cycles through them in Play.
- **During Play,** the keys work as they do on the web; Tab lists them.
