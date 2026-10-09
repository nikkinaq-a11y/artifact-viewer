#pragma once

#include "CoreMinimal.h"
#include "PairTypes.generated.h"

class UStaticMesh;

namespace PairUnits
{
	/**
	 * three.js metres to Unreal centimetres.
	 *
	 * The web app is Y-up with +z pointing toward the viewer; Unreal is Z-up with +X forward.
	 * Web +z (toward the viewer) becomes Unreal −X, web +x (right) becomes +Y and web +y (up)
	 * becomes +Z. Every physical direction survives, so nothing comes out mirrored, and any
	 * position in artifact-pair-web/src/scene/presets.ts can be passed straight through.
	 */
	inline FVector FromWeb(double X, double Y, double Z) { return FVector(-Z, X, Y) * 100.0; }

	/** three.js RectAreaLight intensity is luminance in nits; Unreal rect lights take candelas. */
	inline float NitsToCandelas(float Nits, float WidthM, float HeightM) { return Nits * WidthM * HeightM; }
}

UENUM(BlueprintType)
enum class EPairPedestalDim : uint8
{
	Width,
	Length,
	Height,
};

UENUM(BlueprintType)
enum class EPairPanelDim : uint8
{
	Width,
	Height,
	Bottom,
	Gap,
};

/** A clamped, stepped value — what every adjustment key walks. */
USTRUCT(BlueprintType)
struct FPairRange
{
	GENERATED_BODY()

	FPairRange() = default;
	FPairRange(float InMin, float InMax, float InStep) : Min(InMin), Max(InMax), Step(InStep) {}

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float Min = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float Max = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float Step = 0.1f;

	/** Step in a direction and land on a clean multiple of Step, clamped. */
	float StepFrom(float Value, int32 Dir) const
	{
		const float Next = FMath::RoundToFloat((Value + Dir * Step) / Step) * Step;
		return FMath::Clamp(Next, Min, Max);
	}
};

USTRUCT(BlueprintType)
struct FPairCameraPreset
{
	GENERATED_BODY()

	FPairCameraPreset() = default;
	FPairCameraPreset(const FString& InName, const FVector& InLocation, const FVector& InTarget, float InFov)
		: Name(InName), Location(InLocation), Target(InTarget), VerticalFovDeg(InFov) {}

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FString Name;

	/** World cm. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FVector Location = FVector::ZeroVector;

	/** World cm — what the camera looks at, and what orbiting turns about. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FVector Target = FVector::ZeroVector;

	/**
	 * Vertical, as in three.js. Unreal cameras take a horizontal FOV, so the pawn converts
	 * every frame from the viewport's aspect — the framing stays the same at any window size.
	 */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float VerticalFovDeg = 30.f;
};

USTRUCT(BlueprintType)
struct FPairTint
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FString Name;

	/** Transmission colour at the sheet's nominal depth — white light after passing through. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FLinearColor Color = FLinearColor::White;
};

USTRUCT(BlueprintType)
struct FPairStudioTheme
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FString Name;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FLinearColor Wall = FLinearColor::Gray;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FLinearColor Floor = FLinearColor::Gray;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FLinearColor Pedestal = FLinearColor::Gray;

	/** Stands in for the web app's environment intensity. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float SkyLightIntensity = 0.2f;
};

USTRUCT(BlueprintType)
struct FPairLightPreset
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FName Id;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FString Label;

	/** World cm. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FVector Location = FVector::ZeroVector;

	/** World cm — the light turns to face this point. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FVector AimAt = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float WidthCm = 60.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float HeightCm = 60.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float IntensityCd = 5.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FLinearColor Color = FLinearColor::White;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	bool bOn = true;
};

/** One entry in the roster the O key cycles through. */
USTRUCT(BlueprintType)
struct FPairArtifact
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	TObjectPtr<UStaticMesh> Mesh = nullptr;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FString Label;

	/** Turns this scan on top of the facing yaw, for one that was captured a few degrees off. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float YawOffsetDeg = 0.f;

	/** On top of auto-fit, for a scan that should read larger or smaller than the rest. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float ScaleMultiplier = 1.f;
};

/** One pedestal and what stands on it. Slot 0 is A (on −X), slot 1 is B (on +X). */
USTRUCT(BlueprintType)
struct FPairSlot
{
	GENERATED_BODY()

	/** Index into the stage's Artifacts, or −1 for an empty pedestal. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	int32 ArtifactIndex = -1;

	/** Yaw added by click-dragging the object, degrees. R resets it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float NudgeDeg = 0.f;

	/** Multiplier on auto-fit. P. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float Scale = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float PedestalWidthCm = 35.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float PedestalLengthCm = 35.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float PedestalHeightCm = 95.f;
};
