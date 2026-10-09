#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "PairTypes.h"
#include "PairPresets.generated.h"

class UMaterialInterface;

/**
 * Every scene value for the pair setup, as plain data — the Unreal counterpart of
 * artifact-pair-web/src/scene/presets.ts, converted with PairUnits::FromWeb.
 *
 * The C++ defaults are the web app's reconstructions. Make a DA_PairPresets from this class,
 * tune it in the editor, and assign it to the stage; the stage falls back to these defaults
 * when none is assigned. The stage's "Reset To Presets" button re-reads it.
 */
UCLASS(BlueprintType)
class UPairPresets : public UDataAsset
{
	GENERATED_BODY()

public:
	UPairPresets();

	// ── Camera ───────────────────────────────────────────────────────────────

	/** Ordered so C alternates sides, walking round the pair. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	TArray<FPairCameraPreset> Cameras;

	/** The pair's visual centre. Camera blends swing round it rather than cutting through the sheet. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	FVector FocusPoint;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	float BlendSeconds = 0.7f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	float MinDistanceCm = 60.f;

	/** Inside the room's walls from anywhere on the orbit. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	float MaxDistanceCm = 360.f;

	/** Angle from straight up. Keeps the camera above the floor while letting low presets look up. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	float MinPolarDeg = 11.5f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	float MaxPolarDeg = 106.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	float RotateSpeed = 0.55f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	float ZoomSpeed = 0.6f;

	/** Stops of exposure compensation. 0 is close to the web renderer's exposure 1.0. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Camera")
	float ExposureCompensation = 0.f;

	// ── Room ─────────────────────────────────────────────────────────────────

	/** Four walls round the sheet, open above. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Room")
	FVector RoomSizeCm = FVector(800.f, 800.f, 450.f);

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Room")
	float WallThicknessCm = 10.f;

	/** B cycles these. gallery · light · void. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Room")
	TArray<FPairStudioTheme> Themes;

	/** Room and pedestal material; needs a vector parameter named SolidColorParam. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Room")
	TSoftObjectPtr<UMaterialInterface> SolidMaterial;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Room")
	FName SolidColorParam = TEXT("Color");

	// ── Sheet ────────────────────────────────────────────────────────────────

	/** Made by Scripts/create_pair_assets.py. Its parameters are listed in CLAUDE.md. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	TSoftObjectPtr<UMaterialInterface> AcrylicMaterial;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float PanelWidthCm = 80.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float PanelHeightCm = 90.f;

	/** Height of the sheet's bottom edge above the floor. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float PanelBottomCm = 70.f;

	/** Sheet to the centre of *each* pedestal. One gap for both keeps the pair mirrored. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float GapCm = 45.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	FPairRange PanelWidthRange = FPairRange(20.f, 200.f, 5.f);

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	FPairRange PanelHeightRange = FPairRange(20.f, 220.f, 5.f);

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	FPairRange PanelBottomRange = FPairRange(0.f, 160.f, 5.f);

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	FPairRange GapRange = FPairRange(15.f, 150.f, 5.f);

	/** Real cast sheet is 3–10 mm. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float SheetThicknessCm = 0.6f;

	/** Stock cast-acrylic colours. A cycles them. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	TArray<FPairTint> Tints;

	/** 1 is the stock colour, 0 clear, 2 roughly twice the thickness (Beer–Lambert). T. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float Depth = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	FPairRange DepthRange = FPairRange(0.f, 3.f, 0.1f);

	/**
	 * Fresnel F0 — reflectance seen square-on. Honest acrylic is about 0.04; the default
	 * sits higher so the near face's overlay reads against the far one. Z.
	 */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float Reflectance = 0.14f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	FPairRange ReflectanceRange = FPairRange(0.04f, 0.6f, 0.02f);

	/** 0 mirror-sharp, 1 strongly diffused. U. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float Polish = 0.1f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	FPairRange PolishRange = FPairRange(0.f, 1.f, 0.06f);

	/** Roughness at polish 0 and polish 1. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float MinRoughness = 0.02f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float MaxRoughness = 0.4f;

	/** Light scattered inside the sheet back toward the viewer, in its own colour. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sheet")
	float Haze = 0.035f;

	// ── Pedestals and objects ────────────────────────────────────────────────

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	FPairSlot DefaultSlot;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	FPairRange PedestalWidthRange = FPairRange(20.f, 120.f, 5.f);

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	FPairRange PedestalLengthRange = FPairRange(20.f, 120.f, 5.f);

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	FPairRange PedestalHeightRange = FPairRange(40.f, 160.f, 5.f);

	/** Auto-fit normalises every scan's longest side to this. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	float TargetLongestCm = 45.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	FPairRange ScaleRange = FPairRange(0.25f, 3.f, 0.05f);

	/**
	 * Resting yaw so A (on −X) and B (on +X) face each other, assuming a scan's front is +X.
	 * If the imported scans face some other way, fix it once with ScanFrontYawDeg.
	 */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	float FacingYawA = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	float FacingYawB = 180.f;

	/** Added to both. Set to 90 / −90 / 180 if every scan comes in facing the same wrong way. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	float ScanFrontYawDeg = 0.f;

	/** Degrees of turn per pixel of horizontal drag — for small corrections, not spinning. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	float DragDegPerPx = 0.35f;

	/** How quickly an object eases toward its target yaw. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pedestals")
	float FollowRate = 18.f;

	// ── Lights ───────────────────────────────────────────────────────────────

	/** A mirrored rig: a key and a face light per object, a soft top, and F's front light. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lights")
	TArray<FPairLightPreset> Lights;

	/** The shadow-casting spot, high and to one side, wide enough for both pedestals. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lights")
	FVector ShadowSpotLocation;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lights")
	FVector ShadowSpotAimAt;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lights")
	float ShadowSpotIntensityCd = 30.f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lights")
	float ShadowSpotOuterConeDeg = 28.6f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lights")
	float ShadowSpotInnerConeDeg = 2.9f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lights")
	FLinearColor ShadowSpotColor;
};
