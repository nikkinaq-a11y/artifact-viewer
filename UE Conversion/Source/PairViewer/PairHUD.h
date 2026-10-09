#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "PairHUD.generated.h"

/**
 * The lower-left readout and the Tab help overlay, drawn straight to the canvas so nothing
 * needs authoring. Subclass in Blueprint to change colours or scale.
 */
UCLASS()
class APairHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FLinearColor TextColor = FLinearColor(0.92f, 0.92f, 0.9f);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	FLinearColor PanelColor = FLinearColor(0.f, 0.f, 0.f, 0.55f);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pair")
	float TextScale = 1.f;

private:
	/** Draws a block of lines on a translucent panel; X/Y is its top-left corner. */
	void DrawBlock(const TArray<FString>& Lines, float X, float Y);
	FVector2D MeasureBlock(const TArray<FString>& Lines);
};
