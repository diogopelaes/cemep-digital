"""
Serviço para operações de Faltas otimizado para alto volume.

Este módulo centraliza toda a lógica de persistência de faltas,
usando bulk operations para melhor performance em cenários de
auto-save com centenas de professores simultâneos.
"""
from django.db import transaction
from apps.pedagogical.models import Faltas


class FaltasService:
    """
    Serviço centralizado para operações de faltas.
    
    Benefícios:
    - Código único para todas as operações de faltas
    - Bulk operations para melhor performance
    - Transações atômicas garantidas
    """
    
    @staticmethod
    def salvar_falta_unitaria(aula, estudante_id, aulas_faltas):
        """
        Salva falta de UM estudante (auto-save por clique).
        
        Otimizado para alta frequência - usa update_or_create
        que é eficiente para operações unitárias.
        
        Args:
            aula: Instância de Aula
            estudante_id: UUID do estudante
            aulas_faltas: Lista de índices (1-based) das aulas com falta, ou lista vazia
            
        Returns:
            dict: {'acao': 'criado'|'atualizado'|'removido', 'aulas_faltas': list}
        """
        if not aulas_faltas:
            # Sem faltas = remove registro se existir
            deleted, _ = Faltas.objects.filter(
                aula=aula, 
                estudante_id=estudante_id
            ).delete()
            return {
                'acao': 'removido' if deleted else 'nenhuma',
                'aulas_faltas': []
            }
        
        # Com faltas = cria ou atualiza
        falta, criado = Faltas.objects.update_or_create(
            aula=aula,
            estudante_id=estudante_id,
            defaults={'aulas_faltas': aulas_faltas}
        )
        return {
            'acao': 'criado' if criado else 'atualizado',
            'aulas_faltas': aulas_faltas
        }
    
    @staticmethod
    @transaction.atomic
    def salvar_faltas_lote(aula, faltas_data):
        """
        Salva faltas em lote (criação/edição de aula).
        
        Usa bulk_create e bulk_update para minimizar queries.
        Para 30 alunos: ~3-5 queries em vez de ~35.
        
        Args:
            aula: Instância de Aula
            faltas_data: Lista de dicts com {'estudante_id': UUID, 'aulas_faltas': list}
            
        Returns:
            dict: {'criados': int, 'atualizados': int, 'removidos': int}
        """
        # Mapa de estudantes com faltas (ignora listas vazias)
        estudantes_com_faltas = {
            item['estudante_id']: item['aulas_faltas']
            for item in faltas_data 
            if item.get('aulas_faltas')
        }
        
        # 1. Remove faltas de quem não está mais na lista (1 query)
        removidos, _ = Faltas.objects.filter(aula=aula).exclude(
            estudante_id__in=estudantes_com_faltas.keys()
        ).delete()
        
        if not estudantes_com_faltas:
            return {'criados': 0, 'atualizados': 0, 'removidos': removidos}
        
        # 2. Busca registros existentes (1 query)
        existentes = {
            f.estudante_id: f 
            for f in Faltas.objects.filter(
                aula=aula, 
                estudante_id__in=estudantes_com_faltas.keys()
            )
        }
        
        # 3. Separa para criar vs atualizar
        para_criar = []
        para_atualizar = []
        
        for est_id, aulas in estudantes_com_faltas.items():
            if est_id in existentes:
                falta = existentes[est_id]
                if falta.aulas_faltas != aulas:
                    falta.aulas_faltas = aulas
                    para_atualizar.append(falta)
            else:
                para_criar.append(Faltas(
                    aula=aula,
                    estudante_id=est_id,
                    aulas_faltas=aulas
                ))
        
        # 4. Bulk operations (1-2 queries)
        if para_criar:
            Faltas.objects.bulk_create(para_criar)
        if para_atualizar:
            Faltas.objects.bulk_update(para_atualizar, ['aulas_faltas'])
        
        return {
            'criados': len(para_criar),
            'atualizados': len(para_atualizar),
            'removidos': removidos
        }
