import json
import os
from paths import DATA_DIR, setup_django

# Configuração do Django
setup_django()

from apps.core.models import IndicadorBimestre, IndicadorBimestreAnoLetivo, AnoLetivo

def import_indicadores(json_path):
    """
    Importa indicadores de bimestre a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    print(f"Iniciando importação de indicadores a partir de {json_path}...")

    with open(json_path, mode='r', encoding='utf-8') as f:
        data = json.load(f)
        
    ano_valor = data.get('ano_letivo')
    try:
        ano_letivo = AnoLetivo.objects.get(ano=ano_valor)
    except AnoLetivo.DoesNotExist:
        print(f"Erro: Ano Letivo {ano_valor} não encontrado no banco de dados.")
        return

    indicadores_data = data.get('indicadores', [])
    
    contador_base = 0
    contador_rel = 0
    contador_atualizados = 0

    for cat_data in indicadores_data:
        categoria = cat_data.get('categoria')
        posicao_categoria = cat_data.get('posicao_categoria')
        itens = cat_data.get('itens', [])
        
        for item in itens:
            nome = item.get('nome')
            posicao = item.get('posicao')
            
            # 1. Garante que o IndicadorBimestre existe
            indicador_base, created = IndicadorBimestre.objects.update_or_create(
                nome=nome,
                defaults={
                    'categoria': categoria
                }
            )
            if created:
                contador_base += 1
            
            # 2. Garante a relação com o AnoLetivo e as posições
            rel, rel_created = IndicadorBimestreAnoLetivo.objects.update_or_create(
                indicador=indicador_base,
                ano_letivo=ano_letivo,
                defaults={
                    'posicao_categoria': posicao_categoria,
                    'posicao': posicao,
                    'is_active': True
                }
            )
            
            if rel_created:
                contador_rel += 1
                print(f"Indicador vinculado ao ano {ano_valor}: {nome[:50]}... [{categoria}]")
            else:
                contador_atualizados += 1
                print(f"Indicador atualizado: {nome[:50]}... [{categoria}]")

    print(f"\nImportação finalizada!")
    print(f"- Indicadores base criados: {contador_base}")
    print(f"- Vínculos com ano criados: {contador_rel}")
    print(f"- Vínculos atualizados: {contador_atualizados}")

if __name__ == "__main__":
    JSON_FILE = DATA_DIR / 'indicadores_bimestre.json'
    import_indicadores(str(JSON_FILE.resolve()))
