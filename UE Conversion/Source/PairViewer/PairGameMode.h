#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "PairGameMode.generated.h"

/** Set as the GameMode Override in LV_PairCapture's World Settings. */
UCLASS()
class APairGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	APairGameMode();
};
