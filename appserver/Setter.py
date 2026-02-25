class Setter:
    def __init__(self, id = 'default', name = 'Default', repeats = 0, setRepeats = 0, intensity = 0, timer = 0, image = '', relaxId = '') -> None:
        self.id = id
        self.name = name
        self.repeats = repeats
        self.setRepeats = setRepeats
        self.intensity = intensity
        self.timer = timer
        self.image = image
        self.relaxId = relaxId

    def toJson(self):
        return {
            'id': self.id,
            'name': self.name,
            'repeats': self.repeats,
            'setRepeats': self.setRepeats,
            'intensity': self.intensity,
            'timer': self.timer,
            'image': self.image,
            'relaxId': self.relaxId
        }
    
    def __str__(self) -> str:
        setterStr = f'Training Set (id: {self.id}):\n'
        setterStr += f'\t{self.name} - {self.intensity}\n'
        setterStr += f'\treps: {self.repeats}, sets: {self.setRepeats}'

        return setterStr

class SetRightHand(Setter):
    def __init__(self) -> None:
        id = 'rightHandUp'
        name = 'Right Hand-up'
        repeats = 2
        setRepeats = 1
        intensity = 0
        timer = 3
        relaxId = 'bothHandsDown'

        super().__init__(id, name, repeats, setRepeats, intensity, timer, '', relaxId)

class SetLeftHand(Setter):
    def __init__(self) -> None:
        id = 'leftHandUp'
        name = 'Left Hand-up'
        repeats = 2
        setRepeats = 1
        intensity = 1
        timer = 5
        relaxId = 'bothHandsDown'

        super().__init__(id, name, repeats, setRepeats, intensity, timer, '', relaxId)

class SetBothHandsUp(Setter):
    def __init__(self) -> None:
        id = 'bothHandUp'
        name = 'Both Hands-up'
        repeats = 1
        setRepeats = 1
        intensity = 2
        timer = 3
        relaxId = 'bothHandsDown'

        super().__init__(id, name, repeats, setRepeats, intensity, timer, '', relaxId)