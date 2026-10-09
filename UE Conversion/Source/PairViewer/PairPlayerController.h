#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "PairPlayerController.generated.h"

/** Keeps the cursor visible and free, since the mouse both orbits and grabs objects. */
UCLASS()
class APairPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	APairPlayerController();

protected:
	virtual void BeginPlay() override;
};
