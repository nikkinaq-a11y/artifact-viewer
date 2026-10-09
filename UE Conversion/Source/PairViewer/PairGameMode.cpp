#include "PairGameMode.h"
#include "PairHUD.h"
#include "PairPlayerController.h"
#include "PairViewerPawn.h"

APairGameMode::APairGameMode()
{
	DefaultPawnClass = APairViewerPawn::StaticClass();
	PlayerControllerClass = APairPlayerController::StaticClass();
	HUDClass = APairHUD::StaticClass();
}
