"""
Setter class - represents a training set
"""
class Setter:
    """ Constructor """
    def __init__(self, id = 'default', name = 'Default', repeats = 0, setRepeats = 0, intensity = 0, timer = 0, image = '', relaxId = '') -> None:
        self.id = id                        # The id of the set
        self.name = name                    # The name of the set
        self.repeats = repeats              # The number of repeats in a set
        self.setRepeats = setRepeats        # The number of repeats in a set
        self.intensity = intensity          # The intensity of the set
        self.timer = timer                  # The timer of the set
        self.image = image                  # The image of the set
        self.relaxId = relaxId              # The id of the relax set

    """
    Converts the set to a JSON object
    @returns {dict} A JSON object representing the set
    """
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
    
    """
    Converts the set to a string
    @returns {str} A string representing the set
    """
    def __str__(self) -> str:
        setterStr = f'Training Set (id: {self.id}):\n'
        setterStr += f'\t{self.name} - {self.intensity}\n'
        setterStr += f'\treps: {self.repeats}, sets: {self.setRepeats}'

        return setterStr

"""
SetRightHand class - represents a stub set where the right hand is up
"""
class SetRightHand(Setter):
    """ Constructor """
    def __init__(self) -> None:
        id = 'rightHandUp'
        name = 'Right Hand-up'
        repeats = 2
        setRepeats = 1
        intensity = 0
        timer = 3
        relaxId = 'bothHandsDown'

        super().__init__(id, name, repeats, setRepeats, intensity, timer, '', relaxId)

"""
SetLeftHand class - represents a stub set where the left hand is up
"""
class SetLeftHand(Setter):
    """ Constructor """
    def __init__(self) -> None:
        id = 'leftHandUp'
        name = 'Left Hand-up'
        repeats = 2
        setRepeats = 1
        intensity = 1
        timer = 5
        relaxId = 'bothHandsDown'

        super().__init__(id, name, repeats, setRepeats, intensity, timer, '', relaxId)

"""
SetBothHandsUp class - represents a stub set where both hands are up
"""
class SetBothHandsUp(Setter):
    """ Constructor """
    def __init__(self) -> None:
        id = 'bothHandUp'
        name = 'Both Hands-up'
        repeats = 1
        setRepeats = 1
        intensity = 2
        timer = 3
        relaxId = 'bothHandsDown'

        super().__init__(id, name, repeats, setRepeats, intensity, timer, '', relaxId)