#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PairTypes.h"
#include "PairStage.generated.h"

class UPairPresets;
class UStaticMeshComponent;
class URectLightComponent;
class USpotLightComponent;
class USkyLightComponent;
class UPlanarReflectionComponent;
class UPostProcessComponent;
class UMaterialInterface;
class UMaterialInstanceDynamic;

/**
 * The whole pair setup as one actor: the room, two pedestals with their objects, the sheet
 * of coloured acrylic between them, and the light rig.
 *
 * It holds what the web app's store.ts held. Every value is an editable property, so the
 * scene can be staged by hand in the Details panel (the construction script re-applies on
 * every edit) or live with the keys during Play — the pawn calls the command functions.
 *
 *        A (−X)                    sheet (X = 0)                    B (+X)
 *   camera ●  ───▶  ▓ faces +X          ║          faces −X ▓
 *                   ├───── GapCm ───────╫────── GapCm ──────┤
 *
 * From behind A the camera sees B *through* the tint and A's own face *reflected* off the
 * sheet. With equal gaps the mirror puts A's reflection exactly where B stands, so the two
 * faces overlay. That coincidence is the piece.
 */
UCLASS()
class APairStage : public AActor
{
	GENERATED_BODY()

public:
	APairStage();

	static constexpr int32 MaxLights = 8;

	// ── Data ─────────────────────────────────────────────────────────────────

	/** Leave empty to use the C++ defaults, which match the web app. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pair")
	TObjectPtr<UPairPresets> Presets;

	/** The roster O cycles through. The first two go on A and B. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	TArray<FPairArtifact> Artifacts;

	// ── State ────────────────────────────────────────────────────────────────

	/** [0] is A, [1] is B. */
	UPROPERTY(EditAnywhere, EditFixedSize, BlueprintReadWrite, Category = "Pair|Pedestals")
	TArray<FPairSlot> Slots;

	/** Which pedestal the per-object keys act on. S / 1 / 2 or a click. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Pedestals", meta = (ClampMin = 0, ClampMax = 1))
	int32 Active = 0;

	/** Hides both pedestals without moving the objects, leaving them floating. V. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Pedestals")
	bool bPedestalVisible = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Sheet")
	float PanelWidthCm = 80.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Sheet")
	float PanelHeightCm = 90.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Sheet")
	float PanelBottomCm = 70.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Sheet")
	float GapCm = 45.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Sheet")
	int32 TintIndex = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Sheet")
	float Depth = 1.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Sheet")
	float Reflectance = 0.14f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Sheet")
	float Polish = 0.1f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Room")
	int32 ThemeIndex = 0;

	/** Keyed by light preset Id. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair|Lights")
	TMap<FName, bool> LightOn;

	// ── Commands — the keys call these; Blueprints can too ───────────────────

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void SetActive(int32 Slot);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void SwitchActive();

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void StepObject(int32 Dir);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void AdjustScale(int32 Dir);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void AdjustPedestal(EPairPedestalDim Dim, int32 Dir);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void TogglePedestal();

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void SetNudge(int32 Slot, float Deg);

	/** R resets the active object's drag turn; Shift+R both. */
	UFUNCTION(BlueprintCallable, Category = "Pair")
	void ResetNudge(bool bBoth);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void AdjustPanel(EPairPanelDim Dim, int32 Dir);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void StepTint(int32 Dir);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void AdjustDepth(int32 Dir);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void AdjustReflectance(int32 Dir);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void AdjustPolish(int32 Dir);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void StepTheme(int32 Dir);

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void ToggleLight(FName Id);

	/** Throw away the staged state and start again from the presets. */
	UFUNCTION(CallInEditor, BlueprintCallable, Category = "Pair")
	void ResetToPresets();

	// ── Queries ──────────────────────────────────────────────────────────────

	const UPairPresets& GetPresets() const;
	const FPairArtifact* GetArtifact(int32 Slot) const;
	FString GetTintName() const;
	FString GetThemeName() const;

	/** World-space box round the object on a pedestal — what a click-drag grabs. */
	bool GetArtifactBounds(int32 Slot, FBox& OutBox) const;

	/** −Gap for A, +Gap for B. */
	float SlotX(int32 Slot) const { return Slot == 0 ? -GapCm : GapCm; }

	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

private:
	/** State only — no components touched, so the constructor can call it. */
	void CopyStateFromPresets();

	void ApplyAll(bool bSnapYaw);
	void ApplyExposure();
	void ApplyRoom();
	void ApplyPedestals();
	void ApplyArtifacts(bool bSnapYaw);
	void ApplySheet();
	void ApplyLights();
	float TargetYaw(int32 Slot) const;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TObjectPtr<USceneComponent> Root;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TObjectPtr<UStaticMeshComponent> Floor;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TArray<TObjectPtr<UStaticMeshComponent>> Walls;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TArray<TObjectPtr<UStaticMeshComponent>> Pedestals;

	/** Sits on the pedestal top and turns; the mesh inside it is offset so it is centred and seated. */
	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TArray<TObjectPtr<USceneComponent>> ArtifactPivots;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TArray<TObjectPtr<UStaticMeshComponent>> ArtifactMeshes;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TObjectPtr<UStaticMeshComponent> Sheet;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TObjectPtr<UPlanarReflectionComponent> Reflection;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TArray<TObjectPtr<URectLightComponent>> RectLights;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TObjectPtr<USpotLightComponent> ShadowSpot;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TObjectPtr<USkyLightComponent> SkyLight;

	UPROPERTY(VisibleAnywhere, Category = "Pair|Components")
	TObjectPtr<UPostProcessComponent> PostProcess;

	/** Eased toward TargetYaw each tick, so a drag or a reset glides rather than snaps. */
	float CurrentYaw[2] = {0.f, 0.f};

	/** A new object arrives already facing its partner instead of swinging round. */
	TWeakObjectPtr<UStaticMesh> LastMesh[2];

	bool bWarnedNoAcrylic = false;
};
