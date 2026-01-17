import json
import os

def create_permissions_json():
    # Caminhos
    views_map_path = r'c:\Projects\cemep-digital\dev_work\views_map.json'
    output_path = r'c:\Projects\cemep-digital\dev_work\views_permissions.json'

    if not os.path.exists(views_map_path):
        print(f"Erro: Arquivo não encontrado: {views_map_path}")
        return

    try:
        with open(views_map_path, 'r', encoding='utf-8') as f:
            views_map = json.load(f)
    except Exception as e:
        print(f"Erro ao ler JSON: {e}")
        return

    permissions_data = {}

    for app_name, app_data in views_map.items():
        # app_name eh algo como "app academic"
        app_key = app_name.replace('app ', '')
        permissions_data[app_key] = {}
        
        # app_data['views'] agora é uma lista de dicionarios:
        # { "file": "path...", "classes": ["NomeViewset"] }
        
        for view_info in app_data.get('views', []):
            file_path = view_info.get('file', '')
            class_names = view_info.get('classes', [])
            
            # Pega o nome do arquivo para usar como chave do modulo, ex "atestado" ou "__init__"
            filename = os.path.basename(file_path)
            module_name = filename.replace('.py', '')

            # Se o arquivo não tiver classes listadas, podemos ignorar ou apenas registrar o arquivo
            if not class_names:
                continue
            
            # Dentro do app, vamos indexar pelo nome do modulo (arquivo)
            # ou podemos indexar direto pelo nome da View, mas geralmente arquivos tem multiplas views
            # O formato anterior era:
            # "atestado": { "file_path": ..., "viewsets": [ { "name": "..." ... } ] }
            
            permissions_data[app_key][module_name] = {
                "file_path": file_path,
                "viewsets": []
            }
            
            for cls_name in class_names:
                viewset_entry = {
                    "name": cls_name,
                    "description": f"Controle de acesso para {cls_name}",
                    "policy": {
                        "create": [],
                        "read": [],
                        "update": [],
                        "delete": [],
                        "custom": {}
                    },
                    "owner_method": "is_owner(self, user)"
                }
                permissions_data[app_key][module_name]["viewsets"].append(viewset_entry)

    # Salva o arquivo final
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(permissions_data, f, indent=4, ensure_ascii=False)
        print(f"Arquivo gerado com sucesso em: {output_path}")
    except Exception as e:
        print(f"Erro ao salvar arquivo: {e}")

if __name__ == "__main__":
    create_permissions_json()
