#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "PairViewerPawn.generated.h"

class APairStage;
class UCameraComponent;
class UInputAction;
class UInputMappingContext;
class UPairPresets;
struct FInputActionInstance;
struct FInputActionValue;

/**
 * The viewer: camera presets plus free orbit, click-drag to turn an object, and the shared
 * key legend (C O P H K L V F B, Shift reverses, Tab help) extended for the pair.
 *
 * C blends to the next preset on an arc about the pair's centre — a straight line between
 * opposite presets would fly through the sheet. Dragging on empty space orbits and cancels
 * a blend; dragging on an object turns that object instead and makes its pedestal active.
 *
 * The input actions and mapping are built in code so nothing needs authoring first. To
 * rebind keys, edit KeyTable in the .cpp.
 */
UCLASS()
class APairViewerPawn : public APawn
{
	GENERATED_BODY()

public:
	APairViewerPawn();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

	UFUNCTION(BlueprintCallable, Category = "Pair")
	void StepCamera(int32 Dir);

	APairStage* GetStage() const { return Stage.Get(); }
	FString GetCameraName() const;
	bool IsHelpShown() const { return bShowHelp; }

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Pair")
	TObjectPtr<UCameraComponent> Camera;

private:
	const UPairPresets& Presets() const;
	void JumpToCamera(int32 Index, bool bBlend);
	void ApplyCamera();

	void BuildInput();
	void OnCommand(const FInputActionInstance& Instance);
	void OnClickStarted(const FInputActionInstance& Instance);
	void OnClickCompleted(const FInputActionInstance& Instance);
	void OnWheel(const FInputActionValue& Value);
	void RunCommand(FName Command, bool bShift);

	/** Which pedestal's object is under the cursor, nearest first, or −1. */
	int32 HitTestObjects() const;

	TWeakObjectPtr<APairStage> Stage;

	UPROPERTY(Transient)
	TObjectPtr<UInputMappingContext> Mapping;

	/** Kept here so the actions are not garbage collected; CommandFor maps them to names. */
	UPROPERTY(Transient)
	TArray<TObjectPtr<UInputAction>> Actions;

	TMap<const UInputAction*, FName> CommandFor;

	UPROPERTY(Transient)
	TObjectPtr<UInputAction> ClickAction;

	UPROPERTY(Transient)
	TObjectPtr<UInputAction> WheelAction;

	// Camera state. Location and target are world cm; FOV is vertical, as in the presets.
	int32 CamIndex = 0;
	FVector CamLocation = FVector::ZeroVector;
	FVector CamTarget = FVector::ZeroVector;
	float CamVFov = 30.f;

	// A blend in flight: spherical about the focus point, so it travels round, not through.
	bool bBlending = false;
	float BlendT = 0.f;
	FVector FromSph = FVector::ZeroVector; // (radius, polar, azimuth), radians
	FVector ToSph = FVector::ZeroVector;
	FVector FromTarget = FVector::ZeroVector;
	FVector ToTarget = FVector::ZeroVector;
	float FromVFov = 30.f;
	float ToVFov = 30.f;

	// Mouse gesture state.
	bool bMouseDown = false;
	int32 DragSlot = -1;
	float DragStartX = 0.f;
	float DragStartDeg = 0.f;
	FVector2D LastMouse = FVector2D::ZeroVector;

	bool bShowHelp = false;
};
