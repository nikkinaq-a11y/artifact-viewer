#include "PairViewerPawn.h"
#include "PairPresets.h"
#include "PairStage.h"
#include "Camera/CameraComponent.h"
#include "Engine/LocalPlayer.h"
#include "EngineUtils.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/PlayerController.h"
#include "InputAction.h"
#include "InputActionValue.h"
#include "InputMappingContext.h"

namespace
{
	/**
	 * The legend, as in artifact-pair-web/src/ui/keybinds.ts. Shift reverses any stepping key;
	 * Shift+R resets both objects.
	 */
	struct FKeyCommand
	{
		FKey Key;
		const TCHAR* Command;
	};

	TArray<FKeyCommand> KeyTable()
	{
		return {
			{EKeys::C, TEXT("Camera")},
			{EKeys::S, TEXT("SwitchActive")},
			{EKeys::One, TEXT("ActiveA")},
			{EKeys::Two, TEXT("ActiveB")},
			{EKeys::O, TEXT("Object")},
			{EKeys::R, TEXT("ResetNudge")},
			{EKeys::P, TEXT("Scale")},
			{EKeys::H, TEXT("PedestalHeight")},
			{EKeys::K, TEXT("PedestalWidth")},
			{EKeys::L, TEXT("PedestalLength")},
			{EKeys::V, TEXT("PedestalVisible")},
			{EKeys::A, TEXT("Tint")},
			{EKeys::T, TEXT("Depth")},
			{EKeys::Z, TEXT("Reflectance")},
			{EKeys::U, TEXT("Polish")},
			{EKeys::G, TEXT("Gap")},
			{EKeys::N, TEXT("SheetWidth")},
			{EKeys::J, TEXT("SheetHeight")},
			{EKeys::M, TEXT("SheetMount")},
			{EKeys::B, TEXT("Theme")},
			{EKeys::F, TEXT("FrontLight")},
			{EKeys::Tab, TEXT("Help")},
		};
	}

	/** (radius, polar from +Z, azimuth from +X), radians. */
	FVector ToSpherical(const FVector& V)
	{
		const double R = V.Size();
		if (R < UE_KINDA_SMALL_NUMBER) return FVector::ZeroVector;
		return FVector(R, FMath::Acos(FMath::Clamp(V.Z / R, -1.0, 1.0)), FMath::Atan2(V.Y, V.X));
	}

	FVector FromSpherical(const FVector& S)
	{
		const double R = S.X, Polar = S.Y, Az = S.Z;
		return FVector(R * FMath::Sin(Polar) * FMath::Cos(Az), R * FMath::Sin(Polar) * FMath::Sin(Az), R * FMath::Cos(Polar));
	}

	float EaseInOutCubic(float T)
	{
		return T < 0.5f ? 4.f * T * T * T : 1.f - FMath::Pow(-2.f * T + 2.f, 3.f) / 2.f;
	}

	int32 Wrap(int32 I, int32 N) { return N > 0 ? ((I % N) + N) % N : 0; }
}

APairViewerPawn::APairViewerPawn()
{
	PrimaryActorTick.bCanEverTick = true;
	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	RootComponent = Camera;
}

const UPairPresets& APairViewerPawn::Presets() const
{
	return Stage.IsValid() ? Stage->GetPresets() : *GetDefault<UPairPresets>();
}

void APairViewerPawn::BeginPlay()
{
	Super::BeginPlay();
	for (TActorIterator<APairStage> It(GetWorld()); It; ++It)
	{
		Stage = *It;
		break;
	}
	if (!Stage.IsValid()) UE_LOG(LogTemp, Warning, TEXT("PairViewerPawn: no PairStage in the level"));
	JumpToCamera(0, false);
}

// ── Camera ────────────────────────────────────────────────────────────────────

FString APairViewerPawn::GetCameraName() const
{
	const TArray<FPairCameraPreset>& Cams = Presets().Cameras;
	return Cams.Num() ? Cams[Wrap(CamIndex, Cams.Num())].Name : TEXT("—");
}

void APairViewerPawn::StepCamera(int32 Dir)
{
	CamIndex += Dir;
	JumpToCamera(CamIndex, true);
}

void APairViewerPawn::JumpToCamera(int32 Index, bool bBlend)
{
	const UPairPresets& P = Presets();
	if (P.Cameras.Num() == 0) return;
	const FPairCameraPreset& To = P.Cameras[Wrap(Index, P.Cameras.Num())];

	if (!bBlend)
	{
		bBlending = false;
		CamLocation = To.Location;
		CamTarget = To.Target;
		CamVFov = To.VerticalFovDeg;
		ApplyCamera();
		return;
	}

	FromSph = ToSpherical(CamLocation - P.FocusPoint);
	ToSph = ToSpherical(To.Location - P.FocusPoint);
	// Shorter way round: wrap the azimuth difference into (−π, π].
	const double D = ToSph.Z - FromSph.Z;
	ToSph.Z = FromSph.Z + FMath::Atan2(FMath::Sin(D), FMath::Cos(D));

	FromTarget = CamTarget;
	ToTarget = To.Target;
	FromVFov = CamVFov;
	ToVFov = To.VerticalFovDeg;
	BlendT = 0.f;
	bBlending = true;
}

void APairViewerPawn::ApplyCamera()
{
	SetActorLocationAndRotation(CamLocation, (CamTarget - CamLocation).Rotation());

	// Presets carry a vertical FOV; Unreal wants horizontal. Converting from the live aspect
	// keeps the framing the same however the window is shaped.
	int32 W = 16, H = 9;
	if (const APlayerController* PC = GetController<APlayerController>()) PC->GetViewportSize(W, H);
	const double Aspect = H > 0 ? double(W) / H : 16.0 / 9.0;
	const double HalfV = FMath::DegreesToRadians(CamVFov) / 2.0;
	Camera->SetFieldOfView(FMath::RadiansToDegrees(2.0 * FMath::Atan(FMath::Tan(HalfV) * Aspect)));
}

void APairViewerPawn::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	const UPairPresets& P = Presets();

	if (bBlending)
	{
		BlendT = FMath::Min(1.f, BlendT + DeltaSeconds / FMath::Max(P.BlendSeconds, 0.01f));
		const float E = EaseInOutCubic(BlendT);
		CamLocation = P.FocusPoint + FromSpherical(FMath::Lerp(FromSph, ToSph, (double)E));
		CamTarget = FMath::Lerp(FromTarget, ToTarget, (double)E);
		CamVFov = FMath::Lerp(FromVFov, ToVFov, E);
		if (BlendT >= 1.f) bBlending = false;
	}

	APlayerController* PC = GetController<APlayerController>();
	float MX = 0.f, MY = 0.f;
	if (PC && PC->GetMousePosition(MX, MY))
	{
		const FVector2D Mouse(MX, MY);
		if (bMouseDown && DragSlot >= 0 && Stage.IsValid())
		{
			// Moving right turns the object's near face to the right, from any viewpoint:
			// positive Unreal yaw swings the near face left, hence the minus.
			const float Deg = DragStartDeg - (MX - DragStartX) * P.DragDegPerPx;
			Stage->SetNudge(DragSlot, FMath::RoundToFloat(Deg * 10.f) / 10.f);
		}
		else if (bMouseDown)
		{
			int32 W = 0, H = 0;
			PC->GetViewportSize(W, H);
			const FVector2D Delta = Mouse - LastMouse;
			if (H > 0 && !Delta.IsNearlyZero())
			{
				// Turntable feel: drag right and the camera swings left round the target.
				const double K = 2.0 * PI * P.RotateSpeed / H;
				FVector S = ToSpherical(CamLocation - CamTarget);
				S.Z += K * Delta.X;
				S.Y = FMath::Clamp(S.Y - K * Delta.Y, FMath::DegreesToRadians(P.MinPolarDeg), FMath::DegreesToRadians(P.MaxPolarDeg));
				CamLocation = CamTarget + FromSpherical(S);
			}
		}
		else
		{
			// Hover: say the object can be taken hold of.
			PC->CurrentMouseCursor = HitTestObjects() >= 0 ? EMouseCursor::GrabHand : EMouseCursor::Default;
		}
		LastMouse = Mouse;
	}

	ApplyCamera();
}

// ── Input ─────────────────────────────────────────────────────────────────────

void APairViewerPawn::BuildInput()
{
	Mapping = NewObject<UInputMappingContext>(this);

	for (const FKeyCommand& KC : KeyTable())
	{
		UInputAction* Action = NewObject<UInputAction>(this);
		Action->ValueType = EInputActionValueType::Boolean;
		Mapping->MapKey(Action, KC.Key);
		Actions.Add(Action);
		CommandFor.Add(Action, FName(KC.Command));
	}

	ClickAction = NewObject<UInputAction>(this);
	ClickAction->ValueType = EInputActionValueType::Boolean;
	Mapping->MapKey(ClickAction, EKeys::LeftMouseButton);

	WheelAction = NewObject<UInputAction>(this);
	WheelAction->ValueType = EInputActionValueType::Axis1D;
	Mapping->MapKey(WheelAction, EKeys::MouseWheelAxis);
}

void APairViewerPawn::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	if (!Mapping) BuildInput();

	if (const APlayerController* PC = GetController<APlayerController>())
	{
		if (const ULocalPlayer* LP = PC->GetLocalPlayer())
		{
			if (UEnhancedInputLocalPlayerSubsystem* Sub = LP->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
			{
				Sub->AddMappingContext(Mapping, 0);
			}
		}
	}

	UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!EIC)
	{
		UE_LOG(LogTemp, Error, TEXT("PairViewerPawn: needs EnhancedInputComponent as the default input component class"));
		return;
	}
	for (UInputAction* Action : Actions)
	{
		EIC->BindAction(Action, ETriggerEvent::Started, this, &APairViewerPawn::OnCommand);
	}
	EIC->BindAction(ClickAction, ETriggerEvent::Started, this, &APairViewerPawn::OnClickStarted);
	EIC->BindAction(ClickAction, ETriggerEvent::Completed, this, &APairViewerPawn::OnClickCompleted);
	EIC->BindAction(WheelAction, ETriggerEvent::Triggered, this, &APairViewerPawn::OnWheel);
}

void APairViewerPawn::OnCommand(const FInputActionInstance& Instance)
{
	const FName* Command = CommandFor.Find(Instance.GetSourceAction());
	if (!Command) return;
	const APlayerController* PC = GetController<APlayerController>();
	const bool bShift = PC && (PC->IsInputKeyDown(EKeys::LeftShift) || PC->IsInputKeyDown(EKeys::RightShift));
	RunCommand(*Command, bShift);
}

void APairViewerPawn::RunCommand(FName Command, bool bShift)
{
	const int32 Dir = bShift ? -1 : 1;

	if (Command == TEXT("Camera")) { StepCamera(Dir); return; }
	if (Command == TEXT("Help")) { bShowHelp = !bShowHelp; return; }

	APairStage* S = Stage.Get();
	if (!S) return;

	if (Command == TEXT("SwitchActive")) S->SwitchActive();
	else if (Command == TEXT("ActiveA")) S->SetActive(0);
	else if (Command == TEXT("ActiveB")) S->SetActive(1);
	else if (Command == TEXT("Object")) S->StepObject(Dir);
	else if (Command == TEXT("ResetNudge")) S->ResetNudge(bShift);
	else if (Command == TEXT("Scale")) S->AdjustScale(Dir);
	else if (Command == TEXT("PedestalHeight")) S->AdjustPedestal(EPairPedestalDim::Height, Dir);
	else if (Command == TEXT("PedestalWidth")) S->AdjustPedestal(EPairPedestalDim::Width, Dir);
	else if (Command == TEXT("PedestalLength")) S->AdjustPedestal(EPairPedestalDim::Length, Dir);
	else if (Command == TEXT("PedestalVisible")) S->TogglePedestal();
	else if (Command == TEXT("Tint")) S->StepTint(Dir);
	else if (Command == TEXT("Depth")) S->AdjustDepth(Dir);
	else if (Command == TEXT("Reflectance")) S->AdjustReflectance(Dir);
	else if (Command == TEXT("Polish")) S->AdjustPolish(Dir);
	else if (Command == TEXT("Gap")) S->AdjustPanel(EPairPanelDim::Gap, Dir);
	else if (Command == TEXT("SheetWidth")) S->AdjustPanel(EPairPanelDim::Width, Dir);
	else if (Command == TEXT("SheetHeight")) S->AdjustPanel(EPairPanelDim::Height, Dir);
	else if (Command == TEXT("SheetMount")) S->AdjustPanel(EPairPanelDim::Bottom, Dir);
	else if (Command == TEXT("Theme")) S->StepTheme(Dir);
	else if (Command == TEXT("FrontLight")) S->ToggleLight(TEXT("front"));
}

void APairViewerPawn::OnClickStarted(const FInputActionInstance& Instance)
{
	bMouseDown = true;
	if (APlayerController* PC = GetController<APlayerController>())
	{
		float MX = 0.f, MY = 0.f;
		PC->GetMousePosition(MX, MY);
		LastMouse = FVector2D(MX, MY);

		DragSlot = HitTestObjects();
		if (DragSlot >= 0 && Stage.IsValid())
		{
			Stage->SetActive(DragSlot);
			DragStartX = MX;
			DragStartDeg = Stage->Slots[DragSlot].NudgeDeg;
			return;
		}
	}
	// Taking hold of the camera cancels a blend rather than fighting it.
	bBlending = false;
}

void APairViewerPawn::OnClickCompleted(const FInputActionInstance& Instance)
{
	bMouseDown = false;
	DragSlot = -1;
}

void APairViewerPawn::OnWheel(const FInputActionValue& Value)
{
	const float Notches = Value.Get<float>();
	if (FMath::IsNearlyZero(Notches)) return;
	const UPairPresets& P = Presets();

	bBlending = false;
	const FVector Offset = CamLocation - CamTarget;
	const double R = FMath::Clamp(
		Offset.Size() * FMath::Pow(FMath::Pow(0.95, (double)P.ZoomSpeed), (double)Notches),
		(double)P.MinDistanceCm, (double)P.MaxDistanceCm);
	CamLocation = CamTarget + Offset.GetSafeNormal() * R;
}

int32 APairViewerPawn::HitTestObjects() const
{
	const APlayerController* PC = GetController<APlayerController>();
	if (!PC || !Stage.IsValid()) return -1;

	FVector Origin, Dir;
	if (!PC->DeprojectMousePositionToWorld(Origin, Dir)) return -1;
	const FVector End = Origin + Dir * 100000.0;

	// A box per object rather than the scan itself: cheap on huge meshes, easy to grab on thin ones.
	int32 Best = -1;
	double BestDist = TNumericLimits<double>::Max();
	for (int32 i = 0; i < 2; ++i)
	{
		FBox Box;
		if (!Stage->GetArtifactBounds(i, Box)) continue;
		if (!FMath::LineBoxIntersection(Box, Origin, End, End - Origin)) continue;
		const double Dist = FVector::DistSquared(Origin, Box.GetCenter());
		if (Dist < BestDist)
		{
			BestDist = Dist;
			Best = i;
		}
	}
	return Best;
}
