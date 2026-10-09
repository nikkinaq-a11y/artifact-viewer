"""
Stages the pair in whichever level is open. Open (or create) LV_PairCapture first, then:

    Tools > Execute Python Script...  and pick this file

Puts one PairStage at the origin (reusing one that is already there), stands the Dogon
and Gelede masks on A and B as in the web app's seed, assigns DA_PairPresets, and sets
PairGameMode as the level's GameMode Override.
"""
import unreal

EAL = unreal.EditorAssetLibrary
ACTORS = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
EDITOR = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
LEVELS = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)

PRESETS = "/Game/Pair/DA_PairPresets"

# Matched against asset paths, so the "1" suffixes and folder moves in Content/Objects don't matter.
SEED = [("Dogon_Mask", "Dogon Mask"), ("Gelede_Mask", "Gelede Mask")]


def find_mesh(fragment):
    for path in EAL.list_assets("/Game", recursive=True, include_folder=False):
        if fragment.lower() not in path.lower():
            continue
        data = EAL.find_asset_data(path)
        if str(data.asset_class_path.asset_name) == "StaticMesh":
            return EAL.load_asset(path)
    return None


stages = [a for a in ACTORS.get_all_level_actors() if isinstance(a, unreal.PairStage)]
if stages:
    stage = stages[0]
    unreal.log(f"Using the PairStage already in the level: {stage.get_actor_label()}")
else:
    stage = ACTORS.spawn_actor_from_class(unreal.PairStage, unreal.Vector(0, 0, 0))
    stage.set_actor_label("PairStage")

artifacts = []
for fragment, label in SEED:
    mesh = find_mesh(fragment)
    if mesh is None:
        unreal.log_warning(f"No static mesh matching '{fragment}' under /Game — add it to Artifacts by hand")
        continue
    entry = unreal.PairArtifact()
    entry.set_editor_property("mesh", mesh)
    entry.set_editor_property("label", label)
    artifacts.append(entry)
stage.set_editor_property("artifacts", artifacts)

if EAL.does_asset_exist(PRESETS):
    stage.set_editor_property("presets", EAL.load_asset(PRESETS))
else:
    unreal.log_warning(f"{PRESETS} missing — run create_pair_assets.py; using C++ defaults meanwhile")

stage.reset_to_presets()

world_settings = EDITOR.get_editor_world().get_world_settings()
world_settings.set_editor_property("default_game_mode", unreal.PairGameMode)

LEVELS.save_current_level()
unreal.log("Pair staged. Press Play.")
