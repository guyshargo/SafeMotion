# SafeMotion Server Definitions

## Training Set IDs (`Setter.id`)

- `leftHandUp` = Left hand up
- `rightHandUp` = Right hand up
- `bothHandUp` = Both hands up
- `bothHandsDown` = Both hands down (used as relax posture)

## Visibility Requirement IDs (`Trainer.visibilityReqs`)

- `upperBody` = Upper body must be visible
- `lowerBody` = Lower body must be visible
- `head` = Head must be visible

## `Setter` JSON Fields

- `id` = Pose/action ID for the set
- `name` = Display name of the set
- `repeats` = Repetitions inside one set
- `setRepeats` = Number of sets
- `intensity` = Intensity level
- `timer` = Hold time in seconds
- `image` = Optional image URL/path
- `relaxId` = Pose/action ID required between repetitions/sets

## `Trainer` JSON Fields

- `name` = Training program name
- `description` = Training description
- `session` = Array of `Setter` objects
- `avgIntensity` = Average intensity for all sets
- `visibilityReqs` = Required visible body regions list
