import re
from datetime import date
import json
import os
from paths import DATA_DIR, setup_django

# Configuração do Django
setup_django()

from apps.core.models import AnoLetivo, DiaLetivoExtra, DiaNaoLetivo

def to_date(date_str):
    return date.fromisoformat(date_str) if date_str else None

def import_ano_letivo(json_path):
    """
    Importa os dados do Ano Letivo a partir de um arquivo JSON consolidado.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    ano_val = data.get('ano')
    if not ano_val:
        print("Erro: 'ano' não especificado no JSON.")
        return

    print(f"Iniciando importação do Ano Letivo {ano_val}...")

    bim = data.get('bimestres', {})
    
    # 1. Criar ou Atualizar o AnoLetivo
    ano_letivo, created = AnoLetivo.objects.get_or_create(
        ano=ano_val,
        defaults={
            'is_active': data.get('is_active', True),
            'data_inicio_1bim': to_date(bim.get('1', {}).get('inicio')),
            'data_fim_1bim': to_date(bim.get('1', {}).get('fim')),
            'data_inicio_2bim': to_date(bim.get('2', {}).get('inicio')),
            'data_fim_2bim': to_date(bim.get('2', {}).get('fim')),
            'data_inicio_3bim': to_date(bim.get('3', {}).get('inicio')),
            'data_fim_3bim': to_date(bim.get('3', {}).get('fim')),
            'data_inicio_4bim': to_date(bim.get('4', {}).get('inicio')),
            'data_fim_4bim': to_date(bim.get('4', {}).get('fim')),
        }
    )

    if not created:
        print(f"Ano Letivo {ano_val} já existe. Atualizando dados...")
        ano_letivo.is_active = data.get('is_active', True)
        ano_letivo.data_inicio_1bim = to_date(bim.get('1', {}).get('inicio'))
        ano_letivo.data_fim_1bim = to_date(bim.get('1', {}).get('fim'))
        ano_letivo.data_inicio_2bim = to_date(bim.get('2', {}).get('inicio'))
        ano_letivo.data_fim_2bim = to_date(bim.get('2', {}).get('fim'))
        ano_letivo.data_inicio_3bim = to_date(bim.get('3', {}).get('inicio'))
        ano_letivo.data_fim_3bim = to_date(bim.get('3', {}).get('fim'))
        ano_letivo.data_inicio_4bim = to_date(bim.get('4', {}).get('inicio'))
        ano_letivo.data_fim_4bim = to_date(bim.get('4', {}).get('fim'))
        ano_letivo.save()
    else:
        print(f"Ano Letivo {ano_val} criado com sucesso.")

    # 2. Processar Dias Letivos Extras
    print("Processando dias letivos extras...")
    # Limpa associações atuais para refletir o JSON
    ano_letivo.dias_letivos_extras.clear()
    
    for item in data.get('dias_letivos_extras', []):
        data_str = item.get('data')
        descricao = item.get('descricao', f'Dia letivo extra {ano_val}')
        
        d_extra, _ = DiaLetivoExtra.objects.get_or_create(
            data=data_str,
            defaults={'descricao': descricao}
        )
        # Se a descrição mudou, atualiza
        if d_extra.descricao != descricao:
            d_extra.descricao = descricao
            d_extra.save()
            
        ano_letivo.dias_letivos_extras.add(d_extra)

    # 3. Processar Dias Não Letivos (Feriados/Recessos)
    print("Processando dias não letivos...")
    # Limpa associações atuais para refletir o JSON
    ano_letivo.dias_nao_letivos.clear()
    
    for item in data.get('dias_nao_letivos', []):
        data_str = item.get('data')
        tipo = item.get('tipo', 'FERIADO')
        descricao = item.get('descricao', '')
        
        d_nao_letivo, _ = DiaNaoLetivo.objects.get_or_create(
            data=data_str,
            defaults={
                'tipo': tipo,
                'descricao': descricao
            }
        )
        # Se tipo ou descrição mudaram, atualiza
        if d_nao_letivo.tipo != tipo or d_nao_letivo.descricao != descricao:
            d_nao_letivo.tipo = tipo
            d_nao_letivo.descricao = descricao
            d_nao_letivo.save()
            
        ano_letivo.dias_nao_letivos.add(d_nao_letivo)

    # 4. Atualizar Cache/JSON de Controles
    print("Atualizando configurações de controle e cache de dias letivos...")
    ano_letivo.atualizar_controles_json()

    print(f"\nImportação do Ano Letivo {ano_val} finalizada com sucesso!")

if __name__ == "__main__":
    # O arquivo JSON consolidado
    JSON_FILE = DATA_DIR / 'config_ano_letivo_2026.json'
    
    import_ano_letivo(str(JSON_FILE.resolve()))





