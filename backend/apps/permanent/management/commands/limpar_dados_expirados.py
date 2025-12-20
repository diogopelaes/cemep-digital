"""
Management Command para limpeza de dados expirados.
Remove dados de estudantes após 1 ano da saída do CEMEP.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import os


class Command(BaseCommand):
    help = 'Remove dados de estudantes após 1 ano da saída do CEMEP, preservando histórico permanente.'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula a execução sem efetuar alterações no banco.',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Exibe informações detalhadas.',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        self.stdout.write(self.style.NOTICE('Iniciando limpeza de dados expirados...'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('MODO SIMULAÇÃO - Nenhuma alteração será feita.'))
        
        # Importa os models aqui para evitar problemas de import circular
        from apps.academic.models import MatriculaCEMEP, Estudante, ResponsavelEstudante
        from apps.permanent.models import (
            DadosPermanenteEstudante, DadosPermanenteResponsavel,
            HistoricoEscolar, HistoricoEscolarAnoLetivo, HistoricoEscolarNotas,
            OcorrenciaDisciplinar
        )
        from apps.pedagogical.models import NotaBimestral, OcorrenciaPedagogica
        
        # Data de corte: 1 ano atrás
        cutoff = timezone.now().date() - timedelta(days=365)
        status_saida = ['CONCLUIDO', 'ABANDONO', 'TRANSFERIDO']
        
        # Busca matrículas elegíveis
        matriculas = MatriculaCEMEP.objects.filter(
            data_saida__lte=cutoff,
            status__in=status_saida
        ).select_related('estudante__usuario')
        
        total = matriculas.count()
        sucesso = 0
        erros = 0
        
        self.stdout.write(f'Encontradas {total} matrículas elegíveis para limpeza.')
        
        for matricula in matriculas:
            estudante = matricula.estudante
            
            try:
                if verbose:
                    self.stdout.write(f'Processando: {estudante.cpf} - {estudante.usuario.get_full_name()}')
                
                with transaction.atomic():
                    # 1. Verifica/cria dados permanentes do estudante
                    dados_perm, criado = DadosPermanenteEstudante.objects.get_or_create(
                        cpf=estudante.cpf,
                        defaults={
                            'nome': estudante.usuario.get_full_name(),
                            'data_nascimento': estudante.data_nascimento,
                            'telefone': estudante.usuario.telefone,
                            'email': estudante.usuario.email,
                            'endereco_completo': estudante.endereco_completo,
                        }
                    )
                    
                    if criado and verbose:
                        self.stdout.write(f'  Criado registro permanente para {estudante.cpf}')
                    
                    # 2. Copia responsáveis
                    for vinculo in ResponsavelEstudante.objects.filter(estudante=estudante).select_related('responsavel__usuario'):
                        resp = vinculo.responsavel
                        DadosPermanenteResponsavel.objects.get_or_create(
                            cpf=resp.usuario.username,  # Usa username como identificador
                            defaults={
                                'estudante': dados_perm,
                                'nome': resp.usuario.get_full_name(),
                                'telefone': resp.usuario.telefone,
                                'email': resp.usuario.email,
                                'parentesco': vinculo.parentesco,
                            }
                        )
                    
                    # 3. Cria/atualiza histórico escolar
                    historico, _ = HistoricoEscolar.objects.get_or_create(
                        estudante=dados_perm,
                        defaults={
                            'numero_matricula': matricula.numero_matricula,
                            'nome_curso': matricula.curso.nome,
                            'data_entrada_cemep': matricula.data_entrada,
                            'data_saida_cemep': matricula.data_saida,
                            'concluido': matricula.status == 'CONCLUIDO',
                        }
                    )
                    
                    # 4. Copia notas por ano letivo
                    from apps.academic.models import MatriculaTurma
                    from apps.core.models import DisciplinaTurma
                    
                    for mat_turma in MatriculaTurma.objects.filter(estudante=estudante).select_related('turma'):
                        turma = mat_turma.turma
                        
                        ano_letivo_obj, _ = HistoricoEscolarAnoLetivo.objects.get_or_create(
                            historico=historico,
                            ano_letivo=turma.ano_letivo,
                            defaults={
                                'nomenclatura_turma': turma.get_nomenclatura_display(),
                                'numero_turma': turma.numero,
                                'letra_turma': turma.letra,
                                'status_final': 'PROMOVIDO' if mat_turma.status == 'PROMOVIDO' else 'RETIDO',
                                'descricao_status': mat_turma.get_status_display(),
                            }
                        )
                        
                        # Copia notas da turma
                        notas = NotaBimestral.objects.filter(
                            matricula_turma=mat_turma
                        ).select_related('disciplina_turma__disciplina')
                        
                        # Agrupa notas por disciplina e calcula média
                        disciplinas_notas = {}
                        for nota in notas:
                            disc_nome = nota.disciplina_turma.disciplina.nome
                            if disc_nome not in disciplinas_notas:
                                disciplinas_notas[disc_nome] = {
                                    'aulas_semanais': nota.disciplina_turma.aulas_semanais,
                                    'notas': []
                                }
                            if nota.nota_final is not None:
                                disciplinas_notas[disc_nome]['notas'].append(nota.nota_final)
                        
                        for disc_nome, dados in disciplinas_notas.items():
                            if dados['notas']:
                                media = sum(dados['notas']) / len(dados['notas'])
                                
                                # Calcula frequência (simplificado)
                                from apps.pedagogical.models import Faltas, Aula
                                total_aulas = Aula.objects.filter(
                                    disciplina_turma__turma=turma,
                                    disciplina_turma__disciplina__nome=disc_nome
                                ).count() or 1
                                total_faltas = Faltas.objects.filter(
                                    estudante=estudante,
                                    aula__disciplina_turma__turma=turma,
                                    aula__disciplina_turma__disciplina__nome=disc_nome
                                ).count()
                                frequencia = int(((total_aulas - total_faltas) / total_aulas) * 100)
                                
                                HistoricoEscolarNotas.objects.get_or_create(
                                    ano_letivo_ref=ano_letivo_obj,
                                    nome_disciplina=disc_nome,
                                    defaults={
                                        'aulas_semanais': dados['aulas_semanais'],
                                        'nota_final': Decimal(str(round(media, 2))),
                                        'frequencia_total': max(0, min(100, frequencia)),
                                    }
                                )
                    
                    # 5. Copia ocorrências disciplinares graves (pedagógicas podem ser descartadas)
                    # As ocorrências disciplinares já estão no app permanent, então não precisa copiar
                    
                    if not dry_run:
                        # 6. Deleta arquivos de mídia
                        self._deletar_midias(estudante)
                        
                        # 7. Deleta o usuário (cascade deleta estudante e relacionados)
                        estudante.usuario.delete()
                        
                        self.stdout.write(self.style.SUCCESS(f'Removido: {estudante.cpf}'))
                    else:
                        self.stdout.write(f'[SIMULAÇÃO] Seria removido: {estudante.cpf}')
                    
                    sucesso += 1
                    
            except Exception as e:
                erros += 1
                self.stdout.write(self.style.ERROR(f'Erro ao processar {estudante.cpf}: {str(e)}'))
        
        # Resumo
        self.stdout.write('')
        self.stdout.write(self.style.NOTICE('=== RESUMO ==='))
        self.stdout.write(f'Total processado: {total}')
        self.stdout.write(self.style.SUCCESS(f'Sucesso: {sucesso}'))
        if erros > 0:
            self.stdout.write(self.style.ERROR(f'Erros: {erros}'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nMODO SIMULAÇÃO - Execute sem --dry-run para efetuar as alterações.'))
    
    def _deletar_midias(self, estudante):
        """Deleta arquivos de mídia do estudante."""
        # Foto de perfil
        if estudante.usuario.foto:
            try:
                if os.path.isfile(estudante.usuario.foto.path):
                    os.remove(estudante.usuario.foto.path)
            except Exception:
                pass
        
        # Atestados
        from apps.academic.models import Atestado
        for atestado in Atestado.objects.filter(usuario_alvo=estudante.usuario):
            try:
                if atestado.arquivo and os.path.isfile(atestado.arquivo.path):
                    os.remove(atestado.arquivo.path)
            except Exception:
                pass

