import os
import json

def scan_django_apps(base_path, apps_subdir):
    apps_path = os.path.join(base_path, apps_subdir)
    results = {}

    if not os.path.exists(apps_path):
        print(f"Erro: O diretório {apps_path} não existe.")
        return {}

    # Percorre as pastas dentro de backend/apps
    for app_name in os.listdir(apps_path):
        app_dir = os.path.join(apps_path, app_name)
        
        # Pula se não for um diretório
        if not os.path.isdir(app_dir):
            continue

        app_data = {}
        
        # Verifica models.py ou diretório models
        models_file = os.path.join(app_dir, "models.py")
        models_dir = os.path.join(app_dir, "models")
        
        if os.path.isfile(models_file):
            app_data["models"] = os.path.relpath(models_file, base_path)
        elif os.path.isdir(models_dir):
            app_data["models"] = os.path.relpath(models_dir, base_path) + "\\"

        # Verifica admin.py
        admin_file = os.path.join(app_dir, "admin.py")
        if os.path.isfile(admin_file):
            app_data["admin"] = os.path.relpath(admin_file, base_path)

        # Se encontrou algo, adiciona ao dicionário do app
        if app_data:
            results[app_name] = app_data

    return results

if __name__ == "__main__":
    # Define a raiz do projeto (um nível acima da pasta dev_work)
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    apps_rel_path = os.path.join("backend", "apps")
    
    mapping = scan_django_apps(root_dir, apps_rel_path)
    
    # Exibe o resultado formatado
    print(json.dumps(mapping, indent=4, ensure_ascii=False))
