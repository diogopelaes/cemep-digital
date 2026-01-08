"""
View para Dashboard - Estatísticas e Dados Consolidados
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.academic.models import Estudante, MatriculaTurma
from apps.core.models import Turma
from apps.management.models import Tarefa


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet para Dashboard.
    Centraliza endpoints de estatísticas e dados consolidados.
    
    Permissões: Qualquer usuário autenticado (via permission_classes).
    
    Nota: Não usa Mixin pois o Dashboard é acessível por todos os perfis,
    retornando dados específicos conforme o tipo de usuário.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='estatisticas')
    def estatisticas(self, request):
        """
        Retorna estatísticas do Dashboard filtradas pelo ano letivo selecionado.
        
        Dados retornados variam conforme o perfil do usuário:
        - Gestão/Secretaria: Estatísticas completas do sistema
        - Professor: Turmas, disciplinas e alunos específicos
        - Estudante: Dados acadêmicos pessoais
        - Responsável: Dados dos dependentes
        """
        user = request.user
        ano = user.get_ano_letivo_selecionado()
        
        # Dados base para todos
        data = {
            'ano_letivo': ano.ano if ano else None,
            'perfil': user.tipo_usuario,
        }
        
        # Estatísticas por perfil
        if user.is_gestao or user.is_secretaria:
            data.update(self._get_gestao_stats(user, ano))
        elif user.is_professor:
            data.update(self._get_professor_stats(user, ano))
        elif user.is_estudante:
            data.update(self._get_estudante_stats(user, ano))
        elif user.is_responsavel:
            data.update(self._get_responsavel_stats(user, ano))
        
        return Response(data)
    
    def _get_gestao_stats(self, user, ano):
        """
        Estatísticas para perfil de Gestão/Secretaria.
        
        Inclui: estudantes, turmas, tarefas.
        """
        # Contagem de estudantes matriculados no ano selecionado
        if ano:
            ano_num = ano.ano
            total_estudantes = Estudante.objects.filter(
                matriculas_cemep__matriculas_turma__turma__ano_letivo=ano_num
            ).distinct().count()
            total_turmas = Turma.objects.filter(ano_letivo=ano_num).count()
        else:
            total_estudantes = 0
            total_turmas = 0
        
        # Contagem de tarefas (não tem relação com ano letivo)
        tarefas_total = Tarefa.objects.count()
        tarefas_concluidas = Tarefa.objects.filter(concluido=True).count()
        tarefas_pendentes = tarefas_total - tarefas_concluidas
        tarefas_atrasadas = Tarefa.objects.filter(
            concluido=False, 
            prazo__lt=timezone.now()
        ).count()
        
        return {
            'total_estudantes': total_estudantes,
            'total_turmas': total_turmas,
            'tarefas_total': tarefas_total,
            'tarefas_pendentes': tarefas_pendentes,
            'tarefas_concluidas': tarefas_concluidas,
            'tarefas_atrasadas': tarefas_atrasadas,
        }
    
    def _get_professor_stats(self, user, ano):
        """
        Estatísticas para perfil de Professor.
        
        TODO: Implementar quando necessário.
        Sugestões:
        - Turmas que leciona
        - Total de alunos nas suas turmas
        - Próximas aulas
        - Faltas a registrar
        """
        return {
            'mensagem': 'Dashboard do Professor em desenvolvimento.',
        }
    
    def _get_estudante_stats(self, user, ano):
        """
        Estatísticas para perfil de Estudante.
        
        TODO: Implementar quando necessário.
        Sugestões:
        - Turma atual
        - Notas recentes
        - Frequência
        - Próximas provas/atividades
        """
        return {
            'mensagem': 'Dashboard do Estudante em desenvolvimento.',
        }
    
    def _get_responsavel_stats(self, user, ano):
        """
        Estatísticas para perfil de Responsável.
        
        TODO: Implementar quando necessário.
        Sugestões:
        - Lista de dependentes
        - Notas e frequência de cada dependente
        - Avisos não lidos
        """
        return {
            'mensagem': 'Dashboard do Responsável em desenvolvimento.',
        }
