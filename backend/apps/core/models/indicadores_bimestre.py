'''
Modelos para indicadores bimestres
'''

from django.db import models
from .base import UUIDModel
from .calendario import AnoLetivo


class IndicadorBimestre(UUIDModel):
    """Indicador bimestres para avaliação de estudantes."""
    
    nome = models.CharField(max_length=100, verbose_name='Indicador', unique=True)
    categoria = models.CharField(max_length=100, verbose_name='Categoria')
    
    class Meta:
        verbose_name = 'Indicador Bimestre'
        verbose_name_plural = 'Indicadores Bimestres'
    
    def __str__(self):
        return f"{self.nome} - {self.categoria}"


class IndicadorBimestreAnoLetivo(UUIDModel):
    """Indicador bimestres para avaliação de estudantes."""
    
    indicador = models.ForeignKey(IndicadorBimestre, on_delete=models.CASCADE, verbose_name='Indicador', related_name='indicadores_ano_letivo')
    posicao_categoria = models.IntegerField(verbose_name='Posição da Categoria', default=0)
    posicao = models.IntegerField(verbose_name='Posição do Indicador', default=0)
    is_active = models.BooleanField(verbose_name='Ativo', default=True)
    ano_letivo = models.ForeignKey(AnoLetivo, on_delete=models.CASCADE, verbose_name='Ano Letivo', related_name='indicadores_ano_letivo')
    
    class Meta:
        verbose_name = 'Indicador Bimestre Ano Letivo'
        verbose_name_plural = 'Indicadores Bimestres Ano Letivo'
        unique_together = ('indicador', 'ano_letivo')
        ordering = ['posicao_categoria', 'posicao']
    
    def __str__(self):
        return f"{self.indicador.nome} - {self.ano_letivo.ano}"
    
    def save(self, *args, **kwargs):
        """Override save para reordenar quando o status ativo mudar ou se for novo."""
        is_new = self._state.adding
        mudou_status = False
        
        if not is_new:
            try:
                old = type(self).objects.get(pk=self.pk)
                mudou_status = old.is_active != self.is_active
            except type(self).DoesNotExist:
                pass
        
        # Se for novo e não tiver posição definida (0), coloca no fim da sua categoria
        if is_new and self.posicao == 0:
            cat = self.indicador.categoria
            last = type(self).objects.filter(
                ano_letivo=self.ano_letivo, 
                indicador__categoria=cat,
                is_active=True
            ).order_by('-posicao').first()
            
            if last:
                self.posicao = last.posicao + 1
                self.posicao_categoria = last.posicao_categoria
            else:
                # Categoria nova: pega a última posição de categoria existente
                last_cat = type(self).objects.filter(
                    ano_letivo=self.ano_letivo
                ).order_by('-posicao_categoria').first()
                self.posicao = 1
                self.posicao_categoria = (last_cat.posicao_categoria + 1) if last_cat else 1

        super().save(*args, **kwargs)
        
        if mudou_status:
            self.reordenar_por_ano_letivo(self.ano_letivo)
    
    @classmethod
    def reordenar_por_ano_letivo(cls, ano_letivo):
        """
        Reordena indicadores de um ano letivo usando bulk_update.
        Mantém o agrupamento por categoria e move inativos para o final de cada uma.
        """
        from django.db import transaction
        from collections import OrderedDict
        
        with transaction.atomic():
            indicadores = list(cls.objects.filter(ano_letivo=ano_letivo).select_related('indicador'))
            
            # Agrupa por categoria mantendo ordem de posicao_categoria
            categorias = OrderedDict()
            # Ordena primeiro para garantir que a ordem das categorias seja preservada
            indicadores.sort(key=lambda x: (x.posicao_categoria, x.posicao))
            
            for ind in indicadores:
                cat = ind.indicador.categoria
                if cat not in categorias:
                    categorias[cat] = []
                categorias[cat].append(ind)
            
            to_update = []
            atual_pos_cat = 1
            
            for cat, items in categorias.items():
                # Dentro da categoria: ativos primeiro, depois inativos
                items.sort(key=lambda x: (not x.is_active, x.posicao))
                
                pos_ativa = 1
                pos_inativa = 9001
                
                for ind in items:
                    nova_pos = 0
                    if ind.is_active:
                        nova_pos = pos_ativa
                        pos_ativa += 1
                    else:
                        nova_pos = pos_inativa
                        pos_inativa += 1
                    
                    if ind.posicao != nova_pos or ind.posicao_categoria != atual_pos_cat:
                        ind.posicao = nova_pos
                        ind.posicao_categoria = atual_pos_cat
                        to_update.append(ind)
                
                atual_pos_cat += 1
            
            if to_update:
                cls.objects.bulk_update(to_update, ['posicao', 'posicao_categoria'])
