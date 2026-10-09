#include "PairPresets.h"
#include "Materials/MaterialInterface.h"

using PairUnits::FromWeb;
using PairUnits::NitsToCandelas;

namespace
{
	FLinearColor Hex(const TCHAR* Srgb) { return FLinearColor(FColor::FromHex(Srgb)); }

	FPairTint Tint(const TCHAR* Name, const TCHAR* Srgb)
	{
		FPairTint T;
		T.Name = Name;
		T.Color = Hex(Srgb);
		return T;
	}

	FPairStudioTheme Theme(const TCHAR* Name, const TCHAR* Wall, const TCHAR* Floor, const TCHAR* Pedestal, float Sky)
	{
		FPairStudioTheme T;
		T.Name = Name;
		T.Wall = Hex(Wall);
		T.Floor = Hex(Floor);
		T.Pedestal = Hex(Pedestal);
		T.SkyLightIntensity = Sky;
		return T;
	}

	/** Web light presets are metres and nits; this takes them as written in presets.ts. */
	FPairLightPreset Light(
		const TCHAR* Id, const TCHAR* Label, const FVector& Location, const FVector& AimAt,
		float WidthM, float HeightM, float Nits, const TCHAR* Srgb, bool bOn)
	{
		FPairLightPreset L;
		L.Id = Id;
		L.Label = Label;
		L.Location = Location;
		L.AimAt = AimAt;
		L.WidthCm = WidthM * 100.f;
		L.HeightCm = HeightM * 100.f;
		L.IntensityCd = NitsToCandelas(Nits, WidthM, HeightM);
		L.Color = Hex(Srgb);
		L.bOn = bOn;
		return L;
	}
}

UPairPresets::UPairPresets()
{
	// presets.ts FOCUS_HEIGHT.
	FocusPoint = FromWeb(0, 1.12, 0);
	const FVector F = FocusPoint;

	// presets.ts CAMERA_PRESETS — "through" views are deliberately a little off-axis: dead on
	// it, the near object eclipses both the far one and its own reflection.
	Cameras = {
		{TEXT("Through to B"), FromWeb(0.75, 1.38, 2.35), FromWeb(0, 1.12, -0.25), 30.f},
		{TEXT("Through to A"), FromWeb(-0.75, 1.38, -2.35), FromWeb(0, 1.12, 0.25), 30.f},
		{TEXT("Over A's shoulder"), FromWeb(0.32, 1.42, 1.3), FromWeb(0, 1.14, -0.45), 32.f},
		{TEXT("Over B's shoulder"), FromWeb(-0.32, 1.42, -1.3), FromWeb(0, 1.14, 0.45), 32.f},
		{TEXT("Three-quarter A"), FromWeb(1.95, 1.3, 1.45), F, 30.f},
		{TEXT("Three-quarter B"), FromWeb(-1.95, 1.3, -1.45), F, 30.f},
		{TEXT("Profile"), FromWeb(2.75, 1.22, 0), F, 30.f},
		{TEXT("High"), FromWeb(1.35, 2.65, 1.5), FromWeb(0, 1.0, 0), 34.f},
		{TEXT("Wide"), FromWeb(2.9, 1.75, 2.7), FromWeb(0, 1.0, 0), 38.f},
	};

	// presets.ts STUDIO_THEMES; envIntensity stands in as sky light intensity.
	Themes = {
		Theme(TEXT("gallery"), TEXT("2a2a30"), TEXT("1b1b20"), TEXT("18181c"), 0.18f),
		Theme(TEXT("light"), TEXT("e8e6e1"), TEXT("b9b6b0"), TEXT("f1efea"), 0.55f),
		Theme(TEXT("void"), TEXT("050507"), TEXT("050507"), TEXT("0a0a0c"), 0.03f),
	};

	SolidMaterial = TSoftObjectPtr<UMaterialInterface>(
		FSoftObjectPath(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial")));
	AcrylicMaterial = TSoftObjectPtr<UMaterialInterface>(
		FSoftObjectPath(TEXT("/Game/Pair/Materials/M_Acrylic.M_Acrylic")));

	// presets.ts TINTS.
	Tints = {
		Tint(TEXT("Amber"), TEXT("ffa630")),
		Tint(TEXT("Red"), TEXT("ef3438")),
		Tint(TEXT("Rose"), TEXT("ff5e98")),
		Tint(TEXT("Violet"), TEXT("9a52ff")),
		Tint(TEXT("Blue"), TEXT("3d7bff")),
		Tint(TEXT("Teal"), TEXT("1fc4c4")),
		Tint(TEXT("Green"), TEXT("3cc75a")),
		Tint(TEXT("Yellow"), TEXT("ffd92e")),
		Tint(TEXT("Smoke"), TEXT("7a7a84")),
		Tint(TEXT("Clear"), TEXT("f4f8fa")),
	};

	// presets.ts LIGHT_PRESETS. OBJ_A / OBJ_B are roughly where each object's mass sits.
	const FVector ObjA = FromWeb(0, 1.15, 0.45);
	const FVector ObjB = FromWeb(0, 1.15, -0.45);
	Lights = {
		Light(TEXT("keyA"), TEXT("Key A"), FromWeb(1.2, 2.05, 1.55), ObjA, 0.7f, 0.9f, 14.f, TEXT("fff4e8"), true),
		Light(TEXT("keyB"), TEXT("Key B"), FromWeb(-1.2, 2.05, -1.55), ObjB, 0.7f, 0.9f, 14.f, TEXT("fff4e8"), true),
		Light(TEXT("faceA"), TEXT("Face A"), FromWeb(0.95, 1.9, 0.1), ObjA, 0.6f, 0.7f, 13.f, TEXT("fff0e0"), true),
		Light(TEXT("faceB"), TEXT("Face B"), FromWeb(-0.95, 1.9, -0.1), ObjB, 0.6f, 0.7f, 13.f, TEXT("fff0e0"), true),
		Light(TEXT("top"), TEXT("Top"), FromWeb(0, 3.0, 0), FromWeb(0, 1.0, 0), 1.4f, 1.4f, 3.f, TEXT("eef2ff"), true),
		Light(TEXT("front"), TEXT("Front"), FromWeb(0.6, 1.4, 2.4), FromWeb(0, 1.15, 0), 0.8f, 0.8f, 8.f, TEXT("fff6ec"), false),
	};

	// Lighting.tsx SHADOW_SPOT: angle 0.5 rad, penumbra 0.9.
	ShadowSpotLocation = FromWeb(1.6, 3.1, 0.35);
	ShadowSpotAimAt = FromWeb(0, 1.0, 0);
	ShadowSpotColor = Hex(TEXT("fff4e8"));
}
