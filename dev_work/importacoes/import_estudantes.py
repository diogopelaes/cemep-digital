from datetime import date
import json
import os
from paths import DATA_DIR, setup_django

# Configuração do Django
setup_django()

from django.contrib.auth import get_user_model
from django.core.files import File
from apps.academic.models import Estudante, MatriculaCEMEP
from apps.core.models import Curso

User = get_user_model()

def to_date(date_str):
    try:
        return date.fromisoformat(date_str) if date_str else None
    except ValueError:
        return None

def import_estudantes(json_path):
    """
    Importa estudantes e seus usuários associados a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de estudantes a partir de {json_path}...")
    
    contador_user_criados = 0
    contador_user_atualizados = 0
    contador_estudante_criados = 0
    contador_estudante_atualizados = 0
    contador_matricula_criadas = 0
    contador_erros = 0

    for item in data:
        try:
            nome_completo = item.get('NOME_COMPLETO')
            email = item.get('EMAIL')
            
            if not email:
                print(f"Aviso: Estudante '{nome_completo}' sem e-mail. Pulando.")
                contador_erros += 1
                continue

            # 1. Gerenciar Usuário
            user = User.objects.filter(username=email).first()
            u_created = False
            
            if not user:
                # Senha aleatória para novos usuários
                from django.utils.crypto import get_random_string
                random_password = get_random_string(12)
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=random_password,
                    first_name=nome_completo,
                    tipo_usuario=User.TipoUsuario.ESTUDANTE
                )
                u_created = True
            else:
                # Atualiza dados básicos se necessário (exceto senha)
                if user.first_name != nome_completo:
                    user.first_name = nome_completo
                    user.save()
                contador_user_atualizados += 1

            if u_created:
                contador_user_criados += 1

            # 1.1 Importar Foto
            foto_nome = item.get('FOTO')
            if foto_nome:
                foto_path = DATA_DIR / 'fotos-estudantes' / foto_nome
                if foto_path.exists():
                    # Importa se o usuário foi criado agora ou se ainda não tem foto
                    if u_created or not user.foto:
                        with open(foto_path, 'rb') as f:
                            user.foto.save(foto_nome, File(f), save=True)
                else:
                    # Opcional: print avisando que a foto não foi encontrada
                    # print(f"Aviso: Foto {foto_nome} não encontrada.")
                    pass
            
            total_processed = contador_user_criados + contador_user_atualizados
            if total_processed % 50 == 0:
                print(f"[{total_processed}] Usuários processados...")

            # 2. Gerenciar Estudante
            # Tratamento de Nulls e campos opcionais
            bolsa_familia = item.get('BOLSA_FAMILIA') == 'Sim'
            pe_de_meia = item.get('PE_DE_MEIA') != 'Não'
            usa_onibus = bool(item.get('LINHA_ONIBUS'))
            
            def clean_val(val):
                return val if val else None

            def clean_digits(val):
                """Remove tudo que não for dígito"""
                if not val:
                    return ''
                import re
                return re.sub(r'[^0-9]', '', str(val))

            def clean_alphanumeric(val):
                """Remove tudo que não for alfanumérico (para matrícula com X)"""
                if not val:
                    return ''
                import re
                return re.sub(r'[^a-zA-Z0-9]', '', str(val)).upper()

            estudante_defaults = {
                'cpf': clean_digits(clean_val(item.get('CPF'))) or None,
                'cin': clean_val(item.get('CIN')) or '',
                'nome_social': '',
                'data_nascimento': to_date(item.get('DATA_NASCIMENTO')),
                'bolsa_familia': bolsa_familia,
                'pe_de_meia': pe_de_meia,
                'usa_onibus': usa_onibus,
                'linha_onibus': item.get('LINHA_ONIBUS') or '',
                'permissao_sair_sozinho': item.get('SAIDA_SOZINHO') == 'Sim',
                'logradouro': item.get('LOGRADOURO') or '',
                'numero': item.get('NUMERO') or '',
                'bairro': item.get('BAIRRO') or '',
                'cidade': item.get('CIDADE') or 'Paulínia',
                'estado': item.get('ESTADO') or 'SP',
                'cep': clean_digits(item.get('CEP')),
                'complemento': item.get('COMPLEMENTO') or '',
                'telefone': clean_digits(item.get('TELEFONE')),
            }

            # Validação mínima
            if not estudante_defaults['data_nascimento']:
                print(f"Erro: Estudante '{nome_completo}' sem data de nascimento válida. Pulando record Estudante.")
                contador_erros += 1
                continue

            estudante, e_created = Estudante.objects.update_or_create(
                usuario=user,
                defaults=estudante_defaults
            )
            
            if e_created:
                contador_estudante_criados += 1
            else:
                contador_estudante_atualizados += 1

            # 3. Gerenciar Matrícula CEMEP
            numero_matricula = item.get('NUMERO_MATRICULA')
            # Força Curso EM e Data 2026-02-01
            sigla_curso = 'EM'
            
            if numero_matricula:
                try:
                    curso = Curso.objects.get(sigla=sigla_curso)
                    
                    matricula_val = clean_alphanumeric(numero_matricula)

                    matricula_defaults = {
                        'data_entrada': date(2026, 2, 1), # Data fixa
                        'data_saida': None,
                        'status': MatriculaCEMEP.Status.MATRICULADO, # Status fixo
                        'numero_matricula': matricula_val
                    }
                    
                    from django.db import IntegrityError
                    try:
                        _, m_created = MatriculaCEMEP.objects.update_or_create(
                            estudante=estudante,
                            curso=curso,
                            defaults=matricula_defaults
                        )
                        if m_created:
                            contador_matricula_criadas += 1
                    except IntegrityError as ie:
                        print(f"Erro de Integridade (Unique) para '{nome_completo}' / Matrícula {numero_matricula}: {str(ie)}")
                        contador_erros += 1
                        
                except Curso.DoesNotExist:
                    print(f"Aviso: Curso '{sigla_curso}' não encontrado para o estudante '{nome_completo}'.")
        except Exception as e:
            import traceback
            print(f"ERRO CRÍTICO no estudante {item.get('NOME_COMPLETO')}: {str(e)}")
            # traceback.print_exc()
            contador_erros += 1

    print(f"\nImportação finalizada!")
    print(f"- Usuários: {contador_user_criados} criados, {contador_user_atualizados} atualizados")
    print(f"- Estudantes: {contador_estudante_criados} criados, {contador_estudante_atualizados} atualizados")
    print(f"- Matrículas CEMEP: {contador_matricula_criadas} criadas/atualizadas")
    print(f"- Erros/Avisos: {contador_erros}")

if __name__ == "__main__":
    JSON_FILE = DATA_DIR / 'estudantes_2025.json'
    import_estudantes(str(JSON_FILE.resolve()))





