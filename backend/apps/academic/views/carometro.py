from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from apps.core.models import Turma
from apps.academic.models import MatriculaTurma
from django.db.models import F
from core_project.permissions import Policy, FUNCIONARIO, NONE


class CarometroViewSet(ViewSet):
    """
    ViewSet para exibir o Fotos (lista de fotos e nomes) de uma turma.
    """
    permission_classes = [Policy(
        create=NONE,
        read=FUNCIONARIO,
        update=NONE,
        delete=NONE,
    )]

    def retrieve(self, request, turma_id=None):
        turma = get_object_or_404(Turma, pk=turma_id)
        
        # Filtra alunos ativos na turma (Cursando, mas talvez incluir outros status se necessário)
        # O usuário pediu "estudantes da turma", geralmente são os ativos.
        matriculas = MatriculaTurma.objects.filter(
            turma=turma,
            status__in=['CURSANDO', 'PROMOVIDO', 'RETIDO'] # Incluindo promovido/retido caso seja histórico, mas foco em cursando
        ).select_related(
            'matricula_cemep__estudante__usuario'
        ).order_by('matricula_cemep__estudante__usuario__first_name')

        data = []
        for mat in matriculas:
            estudante = mat.matricula_cemep.estudante
            usuario = estudante.usuario
            
            photo_url = None
            if usuario.foto:
                photo_url = request.build_absolute_uri(usuario.foto.url)
            
            data.append({
                'id': estudante.id,
                'nome': usuario.get_full_name(),
                'nome_social': estudante.nome_social,
                'data_nascimento': estudante.data_nascimento_formatada,
                'foto': photo_url,
                'status': mat.get_status_display()
            })

        return Response({
            'turma': {
                'id': turma.id,
                'nome': str(turma),
                'ano_letivo': turma.ano_letivo
            },
            'estudantes': data
        })
