# Web ↔ Unreal conversion with Claude Code — research notes

Researched 2026-09-24. This is the background for the pair viewer port in this folder
(see README.md and CLAUDE.md).

## The short version

No tool converts a web game into an Unreal project in one step, and none goes the other way.
Conversion is two separate jobs:

1. **3D content** (models, textures, basic materials) moves through standard file formats
   (FBX, glTF), mostly automatically.
2. **Behaviour** (controls, camera, UI, logic) has to be rewritten. JavaScript/React doesn't
   translate into Unreal C++ or Blueprints. This rewrite is where Claude Code helps most.

## Claude Code and Unreal (as of September 2026)

- **UE 5.8 (June 2026) ships an official "Unreal MCP" plugin.** It runs an MCP server inside
  the editor (`http://127.0.0.1:8000/mcp`), so Claude Code can drive the editor directly:
  actors, lighting, material instances and more. Setup:
  1. Enable the *Unreal MCP* and *All Toolsets* plugins.
  2. Run `ModelContextProtocol.GenerateClientConfig ClaudeCode` in the editor console. This
     writes `.mcp.json`.
  3. Start Claude Code in the project root.

  Epic marks it Experimental. It needs 5.8; your `Artifact_Setup` project is 5.7.
- **Epic has an official Claude Code plugin:**
  `/plugin install unreal-engine-skills-for-claude-code@claude-plugins-official`. It teaches
  Claude Unreal's conventions and how to use the MCP tools.
- **C++ vs. Blueprints:** Claude reads and writes C++ as text. Blueprints are binary
  `.uasset` files, which it can only change through MCP.
- **Mac:** Unreal C++ can be edited in VS Code, but compiling needs Xcode, and the Xcode
  version has to match the engine version.

## Web → Unreal

- **Models and textures:** import the source FBX files directly; this project has them in
  `PhotogrammetryFiles/FBX_Files/`. For content that only exists in a Three.js scene,
  `GLTFExporter` writes glTF, and Unreal's Interchange importer turns glTF PBR materials
  into material instances.
- **Code:** each part of the web app maps to an Unreal equivalent:
  - scene presets → Data Asset
  - state store → actor properties
  - OrbitControls and drag → Enhanced Input and a Pawn
  - React UI → HUD or UMG widgets
  - file import and IndexedDB → the editor's Content Browser

## Unreal → web

- **No web export.** HTML5 export was dropped in UE 4.24, and Epic hasn't announced a
  WebGPU replacement. The community SimplyStream project covers UE 5.1–5.4 only.
- **Pixel Streaming 2** (rewritten in 5.7) runs Unreal on a server and streams video to the
  browser. It looks exactly like Unreal, but needs a GPU server for every viewer.
- **glTF Exporter plus a hand-rebuilt web app** is how the three viewer apps were made.
  Simple materials convert directly and complex ones get baked into textures, so custom
  shader effects have to be rebuilt in Three.js. Blueprint logic never exports.

## Recommended loop

Use Unreal to tune the look by hand, and keep the web apps for sharing. Carry tuned values
back into each app's `presets.ts`, and the assets back as glTF.

## Sources

- [Unreal MCP in Unreal Editor (Epic, UE 5.8)](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor)
- [EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)
- [Setting Up VS Code for Unreal Engine (Epic)](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-code-for-unreal-engine)
- [Compile and Debug UE C++ with VS Code on macOS](https://blog.frogley.info/2024/10/30/compile-and-debug-unreal-engine-c-with-vs-code-on-macos/)
- [three.js GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html)
- [Exporting Unreal content to glTF (Epic)](https://dev.epicgames.com/documentation/unreal-engine/exporting-unreal-engine-content-to-gltf)
- [How the glTF Exporter handles Unreal content (Epic)](https://dev.epicgames.com/documentation/en-us/unreal-engine/how-the-gltf-exporter-handles-unreal-engine-content)
- [Pixel Streaming in Unreal Engine (Epic)](https://dev.epicgames.com/documentation/unreal-engine/pixel-streaming-in-unreal-engine)
- [Pixel Streaming vs WebGL vs WebGPU (Vagon)](https://vagon.io/blog/pixel-streaming-vs-webgl-vs-webgpu-the-best-solution-for-unreal-engine-web-deployment)
- [Unreal MCP explained (pixelsdesign)](https://www.pixelsdesign.it/blog/unreal-engine-mcp-claude-code-explained.html)
