def start_action(route, action='Default', params = None):
    print(f"\n- - - Route: {route} - Action: {action} - - -\n")
    if params:
        if isinstance(params, dict) or isinstance(params, list):
            for key, value in params.items():
                print(f"Param: {key} - Value: {value}")
        else:
            print(f"Param: {params}")
    print('\n')

def end_action(route, action='Default', params = None):
    print(f"\n- - - Route: {route} - Action: {action} - - -\n")
    if params:
        if isinstance(params, dict) or isinstance(params, list):
            for key, value in params.items():
                print(f"Param: {key} - Value: {value}")
        else:
            print(f"Param: {params}")
    print('\n')

def error_message(route, error='Default', message=None):
    print(f"\n- - - Route: {route} - Error: {error} - - -\n")
    if message:
        print(f"Message: {message}")
    print('\n')