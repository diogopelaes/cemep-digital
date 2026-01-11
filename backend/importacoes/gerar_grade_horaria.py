import json
import os
from datetime import date

def gerar_grade():
    # Caminhos dos arquivos
    base_path = r'c:\Projects\cemep-digital\backend\importacoes\dados_base'
    turmas_file = os.path.join(base_path, 'turmas.json')
    disciplina_turma_file = os.path.join(base_path, 'disciplina_turma.json')
    horarios_file = os.path.join(base_path, 'horario_aula_2026.json')
    output_file = os.path.join(base_path, 'grade_horaria_2026.json')

    # Carregar dados
    with open(turmas_file, 'r', encoding='utf-8') as f:
        turmas_data = json.load(f)
    
    with open(disciplina_turma_file, 'r', encoding='utf-8') as f:
        disciplina_turma_data = json.load(f)
        
    with open(horarios_file, 'r', encoding='utf-8') as f:
        horarios_data = json.load(f)

    # 1. Identificar grupos únicos (numero, letra)
    grupos_turmas = sorted(list(set((t['numero'], t['letra']) for t in turmas_data)))
    
    # 2. Mapear requisitos de disciplinas por grupo
    requisitos_grupo = {}
    disciplinas_alvo = ['MAT', 'GEO', 'HIST']

    for item in disciplina_turma_data:
        t_info = item['turma']
        num = t_info['numero']
        letra = t_info['letra']
        
        grupo = (num, letra)
        if grupo not in requisitos_grupo:
            requisitos_grupo[grupo] = {}
            
        for d in t_info['disciplinas']:
            sigla = d['sigla']
            if sigla in disciplinas_alvo:
                requisitos_grupo[grupo][sigla] = max(requisitos_grupo[grupo].get(sigla, 0), d['aulas_semanais'])

    # 3. Preparar slots disponíveis
    slots_disponiveis = []
    for h in horarios_data:
        num_aula = h['numero']
        for dia in h['dias']:
            slots_disponiveis.append((dia, num_aula))
    
    # Ordenar slots por dia e depois por número da aula
    slots_disponiveis.sort()

    # 4. Alocação com restrição global por disciplina
    # Controle de ocupação:
    # ocupacao_grupos[(num, letra)] = set(slots)
    # ocupacao_disciplinas[sigla] = set(slots)
    
    ocupacao_grupos = {grupo: set() for grupo in grupos_turmas}
    ocupacao_disciplinas = {sigla: set() for sigla in disciplinas_alvo}
    
    alocacoes_finais = {grupo: [] for grupo in grupos_turmas}

    # Para garantir uma distribuição razoável, vamos iterar primeiro pelas disciplinas
    # e depois pelos grupos, tentando encontrar o primeiro slot livre para ambos.
    for sigla in disciplinas_alvo:
        for grupo in grupos_turmas:
            aulas_necessarias = requisitos_grupo.get(grupo, {}).get(sigla, 0)
            
            aulas_alocadas = 0
            for slot in slots_disponiveis:
                if aulas_alocadas >= aulas_necessarias:
                    break
                    
                # Regras de conflito:
                # 1. O grupo não pode ter outra aula nesse slot
                # 2. A disciplina (professor) não pode estar em outro grupo nesse slot
                if slot not in ocupacao_grupos[grupo] and slot not in ocupacao_disciplinas[sigla]:
                    # Aloca
                    alocacoes_finais[grupo].append({
                        "dia_semana": slot[0],
                        "horario_numero": slot[1],
                        "disciplina_sigla": sigla
                    })
                    ocupacao_grupos[grupo].add(slot)
                    ocupacao_disciplinas[sigla].add(slot)
                    aulas_alocadas += 1
            
            if aulas_alocadas < aulas_necessarias:
                print(f"AVISO: Não foi possível alocar todas as aulas de {sigla} para o grupo {grupo}. "
                      f"Faltaram {aulas_necessarias - aulas_alocadas} aulas.")

    # 5. Gerar JSON final
    grade_final = []
    for (num, letra) in grupos_turmas:
        grade_final.append({
            "model": "core.gradehorariavalidade",
            "fields": {
                "ano_letivo": 2026,
                "turma_numero": num,
                "turma_letra": letra,
                "data_inicio": "2026-01-01",
                "data_fim": "2026-12-31"
            },
            "itens": alocacoes_finais[(num, letra)]
        })

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(grade_final, f, indent=4, ensure_ascii=False)
    
    print(f"Arquivo gerado com sucesso: {output_file}")
    print(f"Total de grupos processados: {len(grade_final)}")

if __name__ == "__main__":
    gerar_grade()
