import json
import ast
import os

PERMISSIONS_FILE = r'c:\Projects\cemep-digital\dev_work\views_permissions.json'

def get_custom_actions(file_path, class_name):
    """
    Parses a python file and returns a list of action names for a specific class.
    """
    actions = []
    if not os.path.exists(file_path):
        return actions

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return actions

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == class_name:
            for item in node.body:
                if isinstance(item, ast.FunctionDef):
                    # Check decorators
                    is_action = False
                    for decorator in item.decorator_list:
                        # check for @action(...) which is a Call
                        if isinstance(decorator, ast.Call):
                            func = decorator.func
                            # case: @action(...)
                            if isinstance(func, ast.Name) and func.id == 'action':
                                is_action = True
                            # case: @decorators.action(...) or @some.module.action(...)
                            elif isinstance(func, ast.Attribute) and func.attr == 'action':
                                is_action = True
                    
                    if is_action:
                        actions.append(item.name)
    return actions

def main():
    try:
        with open(PERMISSIONS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Could not read JSON file: {e}")
        return
    
    updates_count = 0

    for app_key, app_modules in data.items():
        for module_name, module_data in app_modules.items():
            file_path = module_data.get('file_path')
            
            if not file_path:
                continue

            for viewset in module_data.get('viewsets', []):
                cls_name = viewset['name']
                actions = get_custom_actions(file_path, cls_name)
                
                if actions:
                    if 'policy' not in viewset:
                        viewset['policy'] = {'custom': {}}
                    if 'custom' not in viewset['policy']:
                        viewset['policy']['custom'] = {}
                    
                    for action_name in actions:
                        if action_name not in viewset['policy']['custom']:
                            # Inicializa com lista vazia para preenchimento posterior
                            viewset['policy']['custom'][action_name] = []
                            print(f"Added action '{action_name}' to {cls_name}")
                            updates_count += 1

    with open(PERMISSIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    
    print(f"\nDone. Added {updates_count} actions to views_permissions.json.")

if __name__ == '__main__':
    main()
