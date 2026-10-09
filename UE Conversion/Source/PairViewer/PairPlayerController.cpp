#include "PairPlayerController.h"

APairPlayerController::APairPlayerController()
{
	bShowMouseCursor = true;
	DefaultMouseCursor = EMouseCursor::Default;
}

void APairPlayerController::BeginPlay()
{
	Super::BeginPlay();

	FInputModeGameAndUI Mode;
	Mode.SetHideCursorDuringCapture(false);
	Mode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
	SetInputMode(Mode);
}
