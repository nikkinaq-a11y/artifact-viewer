"""
Creates the two assets the C++ expects. Run it in the Unreal Editor once the C++ has
compiled (needs the Python Editor Script Plugin):

    Tools > Execute Python Script...  and pick this file

Never overwrites: an asset that already exists is left alone and reported.

    /Game/Pair/Materials/M_Acrylic   the sheet — PairStage drives its parameters
    /Game/Pair/DA_PairPresets        every scene value, starting from the C++ defaults
"""
import unreal

EAL = unreal.EditorAssetLibrary
MEL = unreal.MaterialEditingLibrary
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()
MP = unreal.MaterialProperty

MAT_DIR = "/Game/Pair/Materials"
ACRYLIC = MAT_DIR + "/M_Acrylic"
PRESETS_DIR = "/Game/Pair"
PRESETS = PRESETS_DIR + "/DA_PairPresets"


def make_acrylic():
    if EAL.does_asset_exist(ACRYLIC):
        unreal.log_warning(f"{ACRYLIC} already exists; left alone")
        return

    mat = TOOLS.create_asset("M_Acrylic", MAT_DIR, unreal.Material, unreal.MaterialFactoryNew())

    # Thin Translucent multiplies what is behind the sheet by Transmittance and adds a
    # Fresnel reflection on top: the web app's two-pass sheet as one material. It only
    # works with the Surface ForwardShading lighting mode.
    mat.set_editor_property("blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT)
    mat.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_THIN_TRANSLUCENT)
    mat.set_editor_property(
        "translucency_lighting_mode", unreal.TranslucencyLightingMode.TLM_SURFACE_PER_PIXEL_LIGHTING
    )
    mat.set_editor_property("two_sided", True)

    row = [0]

    def param(kind, name, default, prop=None):
        node = MEL.create_material_expression(mat, kind, -500, row[0])
        row[0] += 160
        node.set_editor_property("parameter_name", name)
        node.set_editor_property("default_value", default)
        if prop is not None and not MEL.connect_material_property(node, "", prop):
            unreal.log_error(f"M_Acrylic: could not wire {name} — connect it by hand")
        return node

    amber = unreal.LinearColor(1.0, 0.38, 0.03, 1.0)
    V, S = unreal.MaterialExpressionVectorParameter, unreal.MaterialExpressionScalarParameter
    param(V, "BaseColor", amber, MP.MP_BASE_COLOR)
    param(S, "Specular", 1.0, MP.MP_SPECULAR)
    param(S, "Metallic", 0.0, MP.MP_METALLIC)
    param(S, "Roughness", 0.06, MP.MP_ROUGHNESS)
    param(S, "Opacity", 0.035, MP.MP_OPACITY)
    transmittance = param(V, "Transmittance", amber)

    output_cls = getattr(unreal, "MaterialExpressionThinTranslucentMaterialOutput", None)
    wired = False
    if output_cls is not None:
        output = MEL.create_material_expression(mat, output_cls, -150, row[0])
        wired = MEL.connect_material_expressions(transmittance, "", output, "")
    if not wired:
        unreal.log_error(
            "M_Acrylic: add a 'Thin Translucent Material' output node and wire Transmittance "
            "into its Transmittance Color input by hand"
        )

    MEL.recompile_material(mat)
    EAL.save_asset(ACRYLIC)
    unreal.log(f"Made {ACRYLIC}")


def make_presets():
    if EAL.does_asset_exist(PRESETS):
        unreal.log_warning(f"{PRESETS} already exists; left alone")
        return

    cls = getattr(unreal, "PairPresets", None)
    if cls is None:
        unreal.log_error("PairPresets is not a known class — compile the C++ first")
        return

    factory = unreal.DataAssetFactory()
    factory.set_editor_property("data_asset_class", cls)
    TOOLS.create_asset("DA_PairPresets", PRESETS_DIR, cls, factory)
    EAL.save_asset(PRESETS)
    unreal.log(f"Made {PRESETS}")


make_acrylic()
make_presets()
