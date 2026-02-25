from Setter import SetRightHand, SetLeftHand, SetBothHandsUp

class Trainer:
    def __init__(self, name = 'Default Training', description = '', image='', session = []) -> None:
        self.name = name
        self.description = description
        self.session = session
        self.image = image

        avgIntensity = 0
        if len(session) > 0:
            overall = sum(setter.intensity for setter in session)
            avgIntensity = overall // len(session)
            if int(avgIntensity) - avgIntensity > 0.5:
                avgIntensity += 1
        self.avgIntensity = int(avgIntensity)
    
    def toJson(self):
        sessionJson = [s.toJson() for s in self.session]
        
        return {
            'name': self.name,
            'description': self.description,
            'session': sessionJson,
            'avgIntensity':self.avgIntensity
        }
    
    def __str__(self) -> str:
        trainerStr = f'{self.name} Session:\n'
        trainerStr += f'{self.description}\n\n'
        
        for setter in self.session:
            trainerStr += str(setter)
        
        return trainerStr

class StubTrainer(Trainer):
    def __init__(self) -> None:
        name = 'Stub'
        description = 'A stub session of checking.'
        session = [SetLeftHand(), SetRightHand(), SetBothHandsUp()]

        super().__init__(name, description, '', session)