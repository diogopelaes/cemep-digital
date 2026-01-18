import json
import os
from paths import DATA_DIR, setup_django

# Configuração do Django
setup_django()

from apps.pedagogical.models import DescritorOcorrenciaPedagogica, DescritorOcorrenciaPedagogicaAnoLetivo
from apps.core.models import AnoLetivo

def import_descritores(json_path):
    """
    Importa descritores de ocorrência pedagógica a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    print(f"Iniciando importação de descritores a partir de {json_path}...")

    with open(json_path, mode='r', encoding='utf-8') as f:
        data = json.load(f)
        
    ano_valor = data.get('ano_letivo')
    try:
        ano_letivo = AnoLetivo.objects.get(ano=ano_valor)
    except AnoLetivo.DoesNotExist:
        print(f"Erro: Ano Letivo {ano_valor} não encontrado no banco de dados.")
        return

    descritores_data = data.get('descritores', [])
    
    contador_base = 0
    contador_rel = 0
    contador_atualizados = 0

    for d_data in descritores_data:
        texto = d_data.get('texto')
        posicao = d_data.get('posicao')
        
        # 1. Garante que o DescritorOcorrenciaPedagogica existe
        descritor_base, created = DescritorOcorrenciaPedagogica.objects.get_or_create(
            texto=texto
        )
        if created:
            contador_base += 1
        
        # 2. Garante a relação com o AnoLetivo e as posições
        rel, rel_created = DescritorOcorrenciaPedagogicaAnoLetivo.objects.update_or_create(
            descritor=descritor_base,
            ano_letivo=ano_letivo,
            defaults={
                'posicao': posicao,
                'is_active': True
            }
        )
        
        if rel_created:
            contador_rel += 1
            print(f"Descritor vinculado ao ano {ano_valor}: {texto[:50]}...")
        else:
            contador_atualizados += 1
            print(f"Descritor atualizado: {texto[:50]}...")

    print(f"\nImportação finalizada!")
    print(f"- Descritores base criados: {contador_base}")
    print(f"- Vínculos com ano criados: {contador_rel}")
    print(f"- Vínculos atualizados: {contador_atualizados}")

if __name__ == "__main__":
    JSON_FILE = DATA_DIR / 'descritores_ocorrendia.json'
    import_descritores(str(JSON_FILE.resolve()))
