#include "PairStage.h"
#include "PairPresets.h"
#include "Camera/PlayerCameraManager.h"
#include "Components/PlanarReflectionComponent.h"
#include "Components/PostProcessComponent.h"
#include "Components/RectLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/SpotLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
	// M_Acrylic's parameters. Scripts/create_pair_assets.py makes a material with these names.
	const FName ParamTransmittance = TEXT("Transmittance");
	const FName ParamBaseColor = TEXT("BaseColor");
	const FName ParamSpecular = TEXT("Specular");
	const FName ParamMetallic = TEXT("Metallic");
	const FName ParamRoughness = TEXT("Roughness");
	const FName ParamOpacity = TEXT("Opacity");

	/** Unreal's dielectric Specular input (0–1) tops out at F0 = 0.08. */
	constexpr float MaxDielectricF0 = 0.08f;

	int32 Wrap(int32 I, int32 N) { return N > 0 ? ((I % N) + N) % N : 0; }

	/** Reuse the component's MID when it already derives from Base; construction reruns on every edit. */
	UMaterialInstanceDynamic* EnsureMID(UStaticMeshComponent* Comp, UMaterialInterface* Base)
	{
		if (!Comp || !Base) return nullptr;
		if (UMaterialInstanceDynamic* Existing = Cast<UMaterialInstanceDynamic>(Comp->GetMaterial(0)))
		{
			if (Existing->Parent == Base) return Existing;
		}
		return Comp->CreateDynamicMaterialInstance(0, Base);
	}

	void Paint(UStaticMeshComponent* Comp, UMaterialInterface* Base, FName Param, const FLinearColor& Color)
	{
		if (UMaterialInstanceDynamic* MID = EnsureMID(Comp, Base)) MID->SetVectorParameterValue(Param, Color);
	}
}

APairStage::APairStage()
{
	PrimaryActorTick.bCanEverTick = true;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	Root->SetMobility(EComponentMobility::Movable);
	RootComponent = Root;

	// The engine cube is 100 cm and centred, so scale = size / 100.
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));

	auto MakeBox = [this](FName Name) {
		UStaticMeshComponent* C = CreateDefaultSubobject<UStaticMeshComponent>(Name);
		C->SetupAttachment(Root);
		C->SetMobility(EComponentMobility::Movable);
		C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		if (Cube.Succeeded()) C->SetStaticMesh(Cube.Object);
		return C;
	};

	Floor = MakeBox(TEXT("Floor"));
	for (int32 i = 0; i < 4; ++i) Walls.Add(MakeBox(*FString::Printf(TEXT("Wall%d"), i)));

	const TCHAR* SlotNames[2] = {TEXT("A"), TEXT("B")};
	for (int32 i = 0; i < 2; ++i)
	{
		Pedestals.Add(MakeBox(*FString::Printf(TEXT("Pedestal%s"), SlotNames[i])));

		USceneComponent* Pivot = CreateDefaultSubobject<USceneComponent>(*FString::Printf(TEXT("Pivot%s"), SlotNames[i]));
		Pivot->SetupAttachment(Root);
		Pivot->SetMobility(EComponentMobility::Movable);
		ArtifactPivots.Add(Pivot);

		UStaticMeshComponent* Mesh = CreateDefaultSubobject<UStaticMeshComponent>(*FString::Printf(TEXT("Artifact%s"), SlotNames[i]));
		Mesh->SetupAttachment(Pivot);
		Mesh->SetMobility(EComponentMobility::Movable);
		Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		ArtifactMeshes.Add(Mesh);
	}

	Sheet = MakeBox(TEXT("Sheet"));

	Reflection = CreateDefaultSubobject<UPlanarReflectionComponent>(TEXT("Reflection"));
	Reflection->SetupAttachment(Root);

	for (int32 i = 0; i < MaxLights; ++i)
	{
		URectLightComponent* L = CreateDefaultSubobject<URectLightComponent>(*FString::Printf(TEXT("RectLight%d"), i));
		L->SetupAttachment(Root);
		L->SetMobility(EComponentMobility::Movable);
		RectLights.Add(L);
	}

	ShadowSpot = CreateDefaultSubobject<USpotLightComponent>(TEXT("ShadowSpot"));
	ShadowSpot->SetupAttachment(Root);
	ShadowSpot->SetMobility(EComponentMobility::Movable);

	SkyLight = CreateDefaultSubobject<USkyLightComponent>(TEXT("SkyLight"));
	SkyLight->SetupAttachment(Root);
	SkyLight->SetMobility(EComponentMobility::Movable);

	PostProcess = CreateDefaultSubobject<UPostProcessComponent>(TEXT("PostProcess"));
	PostProcess->SetupAttachment(Root);
	PostProcess->bUnbound = true;

	CopyStateFromPresets();
}

// ── Presets and state ─────────────────────────────────────────────────────────

const UPairPresets& APairStage::GetPresets() const
{
	return Presets ? *Presets : *GetDefault<UPairPresets>();
}

void APairStage::CopyStateFromPresets()
{
	const UPairPresets& P = GetPresets();

	// First two artifacts, or the one twice if that is all there is.
	Slots.SetNum(2);
	for (int32 i = 0; i < 2; ++i)
	{
		Slots[i] = P.DefaultSlot;
		Slots[i].ArtifactIndex = (i == 1 && Artifacts.Num() == 1) ? 0 : i;
	}
	Active = 0;
	bPedestalVisible = true;

	PanelWidthCm = P.PanelWidthCm;
	PanelHeightCm = P.PanelHeightCm;
	PanelBottomCm = P.PanelBottomCm;
	GapCm = P.GapCm;

	TintIndex = 0;
	Depth = P.Depth;
	Reflectance = P.Reflectance;
	Polish = P.Polish;
	ThemeIndex = 0;

	LightOn.Reset();
	for (const FPairLightPreset& L : P.Lights) LightOn.Add(L.Id, L.bOn);
}

void APairStage::ResetToPresets()
{
	CopyStateFromPresets();
	ApplyAll(true);
}

const FPairArtifact* APairStage::GetArtifact(int32 Slot) const
{
	if (!Slots.IsValidIndex(Slot)) return nullptr;
	const int32 i = Slots[Slot].ArtifactIndex;
	return Artifacts.IsValidIndex(i) && Artifacts[i].Mesh ? &Artifacts[i] : nullptr;
}

FString APairStage::GetTintName() const
{
	const UPairPresets& P = GetPresets();
	return P.Tints.IsValidIndex(TintIndex) ? P.Tints[TintIndex].Name : TEXT("?");
}

FString APairStage::GetThemeName() const
{
	const UPairPresets& P = GetPresets();
	return P.Themes.IsValidIndex(ThemeIndex) ? P.Themes[ThemeIndex].Name : TEXT("?");
}

bool APairStage::GetArtifactBounds(int32 Slot, FBox& OutBox) const
{
	if (!GetArtifact(Slot) || !ArtifactMeshes.IsValidIndex(Slot)) return false;
	OutBox = ArtifactMeshes[Slot]->Bounds.GetBox();
	return OutBox.IsValid != 0;
}

float APairStage::TargetYaw(int32 Slot) const
{
	const UPairPresets& P = GetPresets();
	const FPairArtifact* Art = GetArtifact(Slot);
	return (Slot == 0 ? P.FacingYawA : P.FacingYawB) + P.ScanFrontYawDeg + (Art ? Art->YawOffsetDeg : 0.f) +
		Slots[Slot].NudgeDeg;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

void APairStage::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	if (Slots.Num() != 2) Slots.SetNum(2);
	ApplyAll(true);
}

void APairStage::BeginPlay()
{
	Super::BeginPlay();
	ApplyAll(true);
}

void APairStage::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	const float Alpha = 1.f - FMath::Exp(-GetPresets().FollowRate * DeltaSeconds);
	for (int32 i = 0; i < 2; ++i)
	{
		if (!GetArtifact(i)) continue;
		CurrentYaw[i] += (TargetYaw(i) - CurrentYaw[i]) * Alpha;
		ArtifactPivots[i]->SetRelativeRotation(FRotator(0.f, CurrentYaw[i], 0.f));
	}

	// The sheet is two-sided: mirror through whichever face the camera is looking at. The
	// reflection plane is the component's local XY, so point its +Z at the camera's side —
	// otherwise, from behind B, the clip plane keeps the wrong half of the room.
	if (const APlayerCameraManager* Cam = UGameplayStatics::GetPlayerCameraManager(this, 0))
	{
		const bool bCameraOnA = GetActorTransform().InverseTransformPosition(Cam->GetCameraLocation()).X < 0.0;
		Reflection->SetRelativeRotation(FRotator(bCameraOnA ? 90.f : -90.f, 0.f, 0.f));
	}
}

// ── Commands ──────────────────────────────────────────────────────────────────

void APairStage::SetActive(int32 Slot) { Active = FMath::Clamp(Slot, 0, 1); }

void APairStage::SwitchActive() { Active = 1 - Active; }

void APairStage::StepObject(int32 Dir)
{
	const int32 N = Artifacts.Num();
	if (N == 0) return;
	FPairSlot& S = Slots[Active];
	S.ArtifactIndex = S.ArtifactIndex < 0 ? (Dir > 0 ? 0 : N - 1) : Wrap(S.ArtifactIndex + Dir, N);
	S.NudgeDeg = 0.f;
	ApplyArtifacts(false);
}

void APairStage::AdjustScale(int32 Dir)
{
	FPairSlot& S = Slots[Active];
	S.Scale = GetPresets().ScaleRange.StepFrom(S.Scale, Dir);
	ApplyArtifacts(false);
}

void APairStage::AdjustPedestal(EPairPedestalDim Dim, int32 Dir)
{
	const UPairPresets& P = GetPresets();
	FPairSlot& S = Slots[Active];
	switch (Dim)
	{
	case EPairPedestalDim::Width: S.PedestalWidthCm = P.PedestalWidthRange.StepFrom(S.PedestalWidthCm, Dir); break;
	case EPairPedestalDim::Length: S.PedestalLengthCm = P.PedestalLengthRange.StepFrom(S.PedestalLengthCm, Dir); break;
	case EPairPedestalDim::Height: S.PedestalHeightCm = P.PedestalHeightRange.StepFrom(S.PedestalHeightCm, Dir); break;
	}
	ApplyPedestals();
	ApplyArtifacts(false);
}

void APairStage::TogglePedestal()
{
	bPedestalVisible = !bPedestalVisible;
	ApplyPedestals();
}

void APairStage::SetNudge(int32 Slot, float Deg)
{
	if (!Slots.IsValidIndex(Slot)) return;
	Slots[Slot].NudgeDeg = Deg; // Tick eases the object there.
}

void APairStage::ResetNudge(bool bBoth)
{
	if (bBoth)
	{
		Slots[0].NudgeDeg = 0.f;
		Slots[1].NudgeDeg = 0.f;
	}
	else
	{
		Slots[Active].NudgeDeg = 0.f;
	}
}

void APairStage::AdjustPanel(EPairPanelDim Dim, int32 Dir)
{
	const UPairPresets& P = GetPresets();
	switch (Dim)
	{
	case EPairPanelDim::Width: PanelWidthCm = P.PanelWidthRange.StepFrom(PanelWidthCm, Dir); break;
	case EPairPanelDim::Height: PanelHeightCm = P.PanelHeightRange.StepFrom(PanelHeightCm, Dir); break;
	case EPairPanelDim::Bottom: PanelBottomCm = P.PanelBottomRange.StepFrom(PanelBottomCm, Dir); break;
	case EPairPanelDim::Gap: GapCm = P.GapRange.StepFrom(GapCm, Dir); break;
	}
	ApplySheet();
	ApplyPedestals();
	ApplyArtifacts(false);
}

void APairStage::StepTint(int32 Dir)
{
	TintIndex = Wrap(TintIndex + Dir, GetPresets().Tints.Num());
	ApplySheet();
}

void APairStage::AdjustDepth(int32 Dir)
{
	Depth = GetPresets().DepthRange.StepFrom(Depth, Dir);
	ApplySheet();
}

void APairStage::AdjustReflectance(int32 Dir)
{
	Reflectance = GetPresets().ReflectanceRange.StepFrom(Reflectance, Dir);
	ApplySheet();
}

void APairStage::AdjustPolish(int32 Dir)
{
	Polish = GetPresets().PolishRange.StepFrom(Polish, Dir);
	ApplySheet();
}

void APairStage::StepTheme(int32 Dir)
{
	ThemeIndex = Wrap(ThemeIndex + Dir, GetPresets().Themes.Num());
	ApplyRoom();
	ApplyPedestals();
}

void APairStage::ToggleLight(FName Id)
{
	bool& On = LightOn.FindOrAdd(Id, true);
	On = !On;
	ApplyLights();
}

// ── Applying state to components ──────────────────────────────────────────────

void APairStage::ApplyAll(bool bSnapYaw)
{
	ApplyRoom();
	ApplyPedestals();
	ApplyArtifacts(bSnapYaw);
	ApplySheet();
	ApplyLights();
	ApplyExposure();
}

void APairStage::ApplyRoom()
{
	const UPairPresets& P = GetPresets();
	const FVector S = P.RoomSizeCm;
	const double T = P.WallThicknessCm;

	Floor->SetRelativeLocation(FVector(0, 0, -T / 2));
	Floor->SetRelativeScale3D(FVector(S.X, S.Y, T) / 100.0);

	// Four walls round the sheet, open above: the camera walks all the way round the pair,
	// and from either side the far wall is what shows through the acrylic.
	const FVector Locations[4] = {{-S.X / 2, 0, S.Z / 2}, {S.X / 2, 0, S.Z / 2}, {0, -S.Y / 2, S.Z / 2}, {0, S.Y / 2, S.Z / 2}};
	const FVector Sizes[4] = {{T, S.Y, S.Z}, {T, S.Y, S.Z}, {S.X, T, S.Z}, {S.X, T, S.Z}};
	for (int32 i = 0; i < Walls.Num(); ++i)
	{
		Walls[i]->SetRelativeLocation(Locations[i]);
		Walls[i]->SetRelativeScale3D(Sizes[i] / 100.0);
	}

	if (!P.Themes.IsValidIndex(ThemeIndex)) return;
	const FPairStudioTheme& Theme = P.Themes[ThemeIndex];
	UMaterialInterface* Solid = P.SolidMaterial.LoadSynchronous();
	Paint(Floor, Solid, P.SolidColorParam, Theme.Floor);
	for (UStaticMeshComponent* Wall : Walls) Paint(Wall, Solid, P.SolidColorParam, Theme.Wall);

	SkyLight->SetIntensity(Theme.SkyLightIntensity);
	SkyLight->RecaptureSky();
}

void APairStage::ApplyPedestals()
{
	const UPairPresets& P = GetPresets();
	UMaterialInterface* Solid = P.SolidMaterial.LoadSynchronous();
	const FPairStudioTheme* Theme = P.Themes.IsValidIndex(ThemeIndex) ? &P.Themes[ThemeIndex] : nullptr;

	for (int32 i = 0; i < 2; ++i)
	{
		const FPairSlot& S = Slots[i];
		UStaticMeshComponent* Ped = Pedestals[i];
		Ped->SetRelativeLocation(FVector(SlotX(i), 0, S.PedestalHeightCm / 2));
		// The web box is [width (x), height (y), length (z)]; web x is Unreal Y, web z is Unreal X.
		Ped->SetRelativeScale3D(FVector(S.PedestalLengthCm, S.PedestalWidthCm, S.PedestalHeightCm) / 100.0);
		// Hidden rather than moved: the object stays seated at the pedestal's height.
		Ped->SetVisibility(bPedestalVisible);
		Ped->SetCastShadow(bPedestalVisible);
		if (Theme) Paint(Ped, Solid, P.SolidColorParam, Theme->Pedestal);
	}
}

void APairStage::ApplyArtifacts(bool bSnapYaw)
{
	const UPairPresets& P = GetPresets();

	for (int32 i = 0; i < 2; ++i)
	{
		const FPairArtifact* Art = GetArtifact(i);
		UStaticMesh* Mesh = Art ? Art->Mesh.Get() : nullptr;
		UStaticMeshComponent* MeshComp = ArtifactMeshes[i];
		MeshComp->SetStaticMesh(Mesh);
		ArtifactPivots[i]->SetRelativeLocation(FVector(SlotX(i), 0, Slots[i].PedestalHeightCm));

		if (!Mesh)
		{
			LastMesh[i] = nullptr;
			continue;
		}

		// Auto-fit: scans arrive in arbitrary units and pivots, so normalise the longest side,
		// centre on X/Y and seat the lowest point on the pedestal top.
		const FBox Box = Mesh->GetBoundingBox();
		const FVector Size = Box.GetSize();
		const double Longest = FMath::Max3(Size.X, Size.Y, Size.Z);
		const double Fit = Longest > UE_KINDA_SMALL_NUMBER ? P.TargetLongestCm / Longest : 1.0;
		const double Scale = Fit * Slots[i].Scale * Art->ScaleMultiplier;
		const FVector Centre = Box.GetCenter();
		MeshComp->SetRelativeScale3D(FVector(Scale));
		MeshComp->SetRelativeLocation(-FVector(Centre.X, Centre.Y, Box.Min.Z) * Scale);

		if (bSnapYaw || LastMesh[i].Get() != Mesh) CurrentYaw[i] = TargetYaw(i);
		LastMesh[i] = Mesh;
		ArtifactPivots[i]->SetRelativeRotation(FRotator(0.f, CurrentYaw[i], 0.f));
	}
}

void APairStage::ApplySheet()
{
	const UPairPresets& P = GetPresets();

	Sheet->SetRelativeLocation(FVector(0, 0, PanelBottomCm + PanelHeightCm / 2));
	Sheet->SetRelativeScale3D(FVector(P.SheetThicknessCm, PanelWidthCm, PanelHeightCm) / 100.0);

	const float Roughness = FMath::Lerp(P.MinRoughness, P.MaxRoughness, Polish);

	// Only the sheet itself should take the planar reflection. Pedestal and object faces
	// parallel to it sit within a few tens of cm, so keep the fade band tight.
	Reflection->SetRelativeLocation(Sheet->GetRelativeLocation());
	Reflection->PrefilterRoughness = Roughness;
	Reflection->DistanceFromPlaneFadeoutStart = 0.5f;
	Reflection->DistanceFromPlaneFadeoutEnd = 1.f;
	Reflection->ScreenPercentage = 100;
	Reflection->MarkRenderStateDirty();

	UMaterialInterface* Acrylic = P.AcrylicMaterial.LoadSynchronous();
	if (!Acrylic)
	{
		if (!bWarnedNoAcrylic)
		{
			UE_LOG(LogTemp, Warning, TEXT("PairStage: no acrylic material at %s — run Scripts/create_pair_assets.py"),
				*P.AcrylicMaterial.ToString());
			bWarnedNoAcrylic = true;
		}
		return;
	}
	UMaterialInstanceDynamic* MID = EnsureMID(Sheet, Acrylic);
	if (!MID) return;

	// Beer–Lambert: twice the depth is the colour squared, so depth deepens and saturates
	// the tint at once instead of just darkening it.
	const FLinearColor Stock = P.Tints.IsValidIndex(TintIndex) ? P.Tints[TintIndex].Color : FLinearColor::White;
	const float D = Depth;
	auto Through = [D](float C) { return FMath::Pow(FMath::Max(C, 1e-4f), D); };
	const FLinearColor Transmit(Through(Stock.R), Through(Stock.G), Through(Stock.B), 1.f);

	// Fresnel F0 up to 0.08 is Specular; past that, Metallic carries the rest (tinting the
	// reflection a little). Thin Translucent applies the Fresnel falloff itself.
	const float Specular = FMath::Clamp(Reflectance / MaxDielectricF0, 0.f, 1.f);
	const float Metallic = FMath::Clamp((Reflectance - MaxDielectricF0) / (1.f - MaxDielectricF0), 0.f, 1.f);

	MID->SetVectorParameterValue(ParamTransmittance, Transmit);
	MID->SetVectorParameterValue(ParamBaseColor, Transmit);
	MID->SetScalarParameterValue(ParamSpecular, Specular);
	MID->SetScalarParameterValue(ParamMetallic, Metallic);
	MID->SetScalarParameterValue(ParamRoughness, Roughness);
	// Opacity is the haze: light scattered inside the sheet, back out in its own colour.
	MID->SetScalarParameterValue(ParamOpacity, P.Haze * FMath::Min(Depth, 1.f));
}

void APairStage::ApplyLights()
{
	const UPairPresets& P = GetPresets();
	bool bKeyOn = false;

	for (int32 i = 0; i < RectLights.Num(); ++i)
	{
		URectLightComponent* L = RectLights[i];
		if (!P.Lights.IsValidIndex(i))
		{
			L->SetVisibility(false);
			continue;
		}
		const FPairLightPreset& Pre = P.Lights[i];
		const bool* Found = LightOn.Find(Pre.Id);
		const bool bOn = Found ? *Found : Pre.bOn;

		L->SetVisibility(bOn);
		// Rect lights emit along local +X, so aiming is just facing the target.
		L->SetRelativeLocationAndRotation(Pre.Location, (Pre.AimAt - Pre.Location).Rotation());
		L->SetSourceWidth(Pre.WidthCm);
		L->SetSourceHeight(Pre.HeightCm);
		L->SetIntensityUnits(ELightUnits::Candelas);
		L->SetIntensity(Pre.IntensityCd);
		L->SetLightColor(Pre.Color);

		if (Pre.Id == TEXT("keyA") || Pre.Id == TEXT("keyB")) bKeyOn |= bOn;
	}

	// The shadow spot follows the key lights, as in the web app.
	ShadowSpot->SetRelativeLocationAndRotation(P.ShadowSpotLocation, (P.ShadowSpotAimAt - P.ShadowSpotLocation).Rotation());
	ShadowSpot->SetIntensityUnits(ELightUnits::Candelas);
	ShadowSpot->SetIntensity(bKeyOn ? P.ShadowSpotIntensityCd : 0.f);
	ShadowSpot->SetOuterConeAngle(P.ShadowSpotOuterConeDeg);
	ShadowSpot->SetInnerConeAngle(P.ShadowSpotInnerConeDeg);
	ShadowSpot->SetAttenuationRadius(1200.f);
	ShadowSpot->SetLightColor(P.ShadowSpotColor);
}

void APairStage::ApplyExposure()
{
	// Fixed exposure, so the room does not brighten or darken as the camera swings round.
	FPostProcessSettings& S = PostProcess->Settings;
	S.bOverride_AutoExposureMethod = true;
	S.AutoExposureMethod = EAutoExposureMethod::AEM_Manual;
	S.bOverride_AutoExposureApplyPhysicalCameraExposure = true;
	S.AutoExposureApplyPhysicalCameraExposure = 0;
	S.bOverride_AutoExposureBias = true;
	S.AutoExposureBias = GetPresets().ExposureCompensation;
}
