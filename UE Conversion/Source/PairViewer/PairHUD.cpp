#include "PairHUD.h"
#include "PairStage.h"
#include "PairViewerPawn.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"

namespace
{
	constexpr float Pad = 10.f;
	constexpr float Margin = 16.f;

	const TArray<FString>& HelpLines()
	{
		static const TArray<FString> Lines = {
			TEXT("Keys — Shift reverses"),
			TEXT(""),
			TEXT("C        next camera"),
			TEXT("drag     orbit · on an object: turn it"),
			TEXT("wheel    zoom"),
			TEXT(""),
			TEXT("S 1 2    choose pedestal (or click)"),
			TEXT("O        next object"),
			TEXT("R        reset turn (Shift: both)"),
			TEXT("P        object scale"),
			TEXT("H K L    pedestal height · width · length"),
			TEXT("V        show/hide pedestals"),
			TEXT(""),
			TEXT("A        tint colour"),
			TEXT("T        colour depth"),
			TEXT("Z        reflectance"),
			TEXT("U        finish (polish)"),
			TEXT("G        gap to sheet"),
			TEXT("N J M    sheet width · height · mount height"),
			TEXT(""),
			TEXT("B        room"),
			TEXT("F        front light"),
			TEXT("Tab      this help"),
		};
		return Lines;
	}
}

FVector2D APairHUD::MeasureBlock(const TArray<FString>& Lines)
{
	UFont* Font = GEngine->GetMediumFont();
	float MaxW = 0.f, TotalH = 0.f;
	for (const FString& Line : Lines)
	{
		float W = 0.f, H = 0.f;
		GetTextSize(Line.IsEmpty() ? TEXT(" ") : Line, W, H, Font, TextScale);
		MaxW = FMath::Max(MaxW, W);
		TotalH += H;
	}
	return FVector2D(MaxW + 2 * Pad, TotalH + 2 * Pad);
}

void APairHUD::DrawBlock(const TArray<FString>& Lines, float X, float Y)
{
	UFont* Font = GEngine->GetMediumFont();
	const FVector2D Size = MeasureBlock(Lines);
	DrawRect(PanelColor, X, Y, Size.X, Size.Y);

	float LineY = Y + Pad;
	for (const FString& Line : Lines)
	{
		float W = 0.f, H = 0.f;
		GetTextSize(Line.IsEmpty() ? TEXT(" ") : Line, W, H, Font, TextScale);
		if (!Line.IsEmpty()) DrawText(Line, TextColor, X + Pad, LineY, Font, TextScale);
		LineY += H;
	}
}

void APairHUD::DrawHUD()
{
	Super::DrawHUD();
	if (!Canvas) return;

	const APairViewerPawn* Pawn = Cast<APairViewerPawn>(GetOwningPawn());
	if (!Pawn) return;
	const APairStage* Stage = Pawn->GetStage();

	TArray<FString> Lines;
	Lines.Add(FString::Printf(TEXT("Camera  %s"), *Pawn->GetCameraName()));

	if (Stage)
	{
		for (int32 i = 0; i < 2; ++i)
		{
			const FPairSlot& S = Stage->Slots[i];
			const FPairArtifact* Art = Stage->GetArtifact(i);
			Lines.Add(FString::Printf(TEXT("%s %s  %s  ×%.2f  turn %+.1f°  pedestal %.0f×%.0f×%.0f cm"),
				Stage->Active == i ? TEXT(">") : TEXT(" "),
				i == 0 ? TEXT("A") : TEXT("B"),
				Art ? (Art->Label.IsEmpty() ? *GetNameSafe(Art->Mesh) : *Art->Label) : TEXT("(empty)"),
				S.Scale, S.NudgeDeg, S.PedestalWidthCm, S.PedestalLengthCm, S.PedestalHeightCm));
		}
		Lines.Add(FString::Printf(TEXT("Sheet  %s  depth %.1f  reflect %.2f  polish %.2f"),
			*Stage->GetTintName(), Stage->Depth, Stage->Reflectance, Stage->Polish));
		Lines.Add(FString::Printf(TEXT("       %.0f×%.0f cm, bottom %.0f cm, gap %.0f cm"),
			Stage->PanelWidthCm, Stage->PanelHeightCm, Stage->PanelBottomCm, Stage->GapCm));
		Lines.Add(FString::Printf(TEXT("Room   %s        Tab: keys"), *Stage->GetThemeName()));
	}
	else
	{
		Lines.Add(TEXT("No PairStage in this level."));
	}

	const FVector2D Size = MeasureBlock(Lines);
	DrawBlock(Lines, Margin, Canvas->ClipY - Size.Y - Margin);

	if (Pawn->IsHelpShown())
	{
		const FVector2D HelpSize = MeasureBlock(HelpLines());
		DrawBlock(HelpLines(), (Canvas->ClipX - HelpSize.X) / 2, (Canvas->ClipY - HelpSize.Y) / 2);
	}
}
