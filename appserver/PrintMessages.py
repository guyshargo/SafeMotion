def start_action(route, action='Default', params = None):
    print(f"\n- - - Route: {route} - Action: {action} - - -")
    if params:
        if isinstance(params, dict) or isinstance(params, list):
            for key, value in params.items():
                print(f"Param: {key} - Value: {value}")
        else:
            print(f"Param: {params}")

def end_action(route, action='Default', params = None):
    print(f"\n- - - Route: {route} - Action: {action} - - -")
    if params:
        if isinstance(params, dict) or isinstance(params, list):
            for key, value in params.items():
                print(f"Param: {key} - Value: {value}")
        else:
            print(f"Param: {params}")

def error_message(route, error='Default', message=None):
    print(f"\n- - - Route: {route} - Error: {error} - - -")
    if message:
        print(f"Message: {message}")

def info_message(route, message='Default'):
    print(f"\n- - - Route: {route} - - -")
    print(f"\t\t{message}")
