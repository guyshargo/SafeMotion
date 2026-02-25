from Setter import SetRightHand, SetLeftHand, SetBothHandsUp
"""
Trainer class - represents a training session
"""
class Trainer:
    """ Constructor """
    def __init__(self, name = 'Default Training', description = '', image='', session = [], visibilityReqs = []) -> None:
        self.name = name                            # The name of the training session
        self.description = description              # The description of the training session
        self.session = session                      # The session of the training session
        self.image = image                          # The image of the training session
        self.visibilityReqs = visibilityReqs        # The visibility requirements of the training session

        avgIntensity = 0
        if len(session) > 0:
            overall = sum(setter.intensity for setter in session)
            avgIntensity = overall // len(session)
            if int(avgIntensity) - avgIntensity > 0.5:
                avgIntensity += 1
        self.avgIntensity = int(avgIntensity)       # The average intensity of the training session

    
    """
    Converts the training session to a JSON object
    @returns {dict} A JSON object representing the training session
    """
    def toJson(self):
        # Convert the session to a JSON object
        sessionJson = [s.toJson() for s in self.session] 
        
        return {
            'name': self.name,
            'description': self.description,
            'session': sessionJson,
            'avgIntensity':self.avgIntensity,
            'visibilityReqs': self.visibilityReqs
        }
    
    """
    Converts the training session to a string
    @returns {str} A string representing the training session
    """
    def __str__(self) -> str:
        trainerStr = f'{self.name} Session:\n'
        trainerStr += f'{self.description}\n\n'
        trainerStr += f'Must show: {self.visibilityReqs}\n\n'
        
        for setter in self.session:
            trainerStr += str(setter)
        
        return trainerStr

"""
StubTrainer class - represents a stub training session
"""
class StubTrainer(Trainer):
    """ Constructor """
    def __init__(self) -> None:
        name = 'Stub'
        description = 'A stub session of checking.'
        session = [SetLeftHand(), SetRightHand(), SetBothHandsUp()]
        visibilityReqs = ['upperBody']

        super().__init__(name, description, '', session, visibilityReqs)