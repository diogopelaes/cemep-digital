from datetime import date, timedelta
from django.db import models
from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver
from django.utils import timezone
from django.core.exceptions import ValidationError
from .base import UUIDModel

class DiaLetivoExtra(UUIDModel):
    """Dia letivo extra. Sábado, Domingo ou feriado que se torna letivo."""
    data = models.DateField(unique=True, verbose_name='Data do Dia Letivo')
    descricao = models.CharField(max_length=255, blank=True, verbose_name='Motivo/Descrição')
    
    class Meta:
        verbose_name = 'Dia Letivo Extra'
        verbose_name_plural = 'Dias Letivos Extras'
        ordering = ['data']
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')}"


class DiaNaoLetivo(UUIDModel):
    """Dia não letivo. Feriados ou ponto facultativo."""
    
    class Tipo(models.TextChoices):
        FERIADO = 'FERIADO', 'Feriado'
        PONTO_FACULTATIVO = 'PONTO_FACULTATIVO', 'Ponto facultativo'
        RECESSO = 'RECESSO', 'Recesso escolar'
        FERIAS = 'FERIAS', 'Férias escolares'
        SUSPENSO = 'SUSPENSO', 'Dia letivo suspenso'
        PLANEJAMENTO = 'PLANEJAMENTO', 'Planejamento'
        OUTROS = 'OUTROS', 'Outros'

    data = models.DateField(unique=True, verbose_name='Data da Ocorrência')
    tipo = models.CharField(
        max_length=30,
        choices=Tipo.choices,
        verbose_name='Categoria do Dia'
    )
    descricao = models.CharField(max_length=255, blank=True, verbose_name='Motivo/Descrição')
    
    class Meta:
        verbose_name = 'Dia Não Letivo'
        verbose_name_plural = 'Dias Não Letivos'
        ordering = ['data']
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')} - {self.get_tipo_display()}"


# -----------------------------------------------------------------------------
# Configurações Padrão de Avaliação (usadas para inicializar o JSON controles)
# -----------------------------------------------------------------------------
AVALIACAO_CONFIG_PADRAO = {
    'valor_maximo': 10.00,
    'media_aprovacao': 6.00,
    'forma_calculo': 'LIVRE_ESCOLHA',
    'regra_arredondamento': 'FAIXAS_MULTIPLOS_05',
    'casas_decimais_bimestral': 1,
    'casas_decimais_avaliacao': 2,
    'livre_escolha_professor': True,
    'pode_criar': False,
}


class AnoLetivo(UUIDModel):
    """Ano letivo escolar."""
    ano = models.PositiveSmallIntegerField(unique=True, verbose_name='Ano')
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    data_inicio_1bim = models.DateField(null=True, blank=True, verbose_name='Data de Início do 1º Bimestre')
    data_fim_1bim = models.DateField(null=True, blank=True, verbose_name='Data de Fim do 1º Bimestre')
    data_inicio_2bim = models.DateField(null=True, blank=True, verbose_name='Data de Início do 2º Bimestre')
    data_fim_2bim = models.DateField(null=True, blank=True, verbose_name='Data de Fim do 2º Bimestre')
    data_inicio_3bim = models.DateField(null=True, blank=True, verbose_name='Data de Início do 3º Bimestre')
    data_fim_3bim = models.DateField(null=True, blank=True, verbose_name='Data de Fim do 3º Bimestre')
    data_inicio_4bim = models.DateField(null=True, blank=True, verbose_name='Início do 4º Bimestre')
    data_fim_4bim = models.DateField(null=True, blank=True, verbose_name='Fim do 4º Bimestre')
    dias_letivos_extras = models.ManyToManyField(DiaLetivoExtra, blank=True, verbose_name='Dias Letivos Especiais')
    dias_nao_letivos = models.ManyToManyField(DiaNaoLetivo, blank=True, verbose_name='Feriados e Recessos')
    
    numero_chamadas_turmas_travadas = models.BooleanField(default=False, verbose_name='Número de chamadas de turmas travadas')
    
    controles = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        verbose_name='Controles'
    )

    datas_liberadas_aulas_faltas = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        verbose_name='Cache de Datas Liberadas (Aulas/Faltas)'
    )

    def bimestre(self, data=None):
        if data is None:
            data = timezone.now().date()
        
        if not self.data_inicio_1bim:
            return None
            
        if data < self.data_inicio_1bim:
            return None
        
        if self.data_fim_1bim and data <= self.data_fim_1bim:
            return 1
        
        if self.data_fim_2bim and data <= self.data_fim_2bim:
            return 2
        
        if self.data_fim_3bim and data <= self.data_fim_3bim:
            return 3
            
        if self.data_fim_4bim and data <= self.data_fim_4bim:
            return 4
        
        return None

    def get_dias_letivos(self, data=None) -> list[date]:
        """
        Retorna os dias letivos do bimestre acessando diretamente o cache JSON (Busca Direta).
        """
        num_bimestre = self.bimestre(data)
        if not num_bimestre:
            return []
        
        # Acessa o cache dentro do JSONField 'controles'
        bim_data = self.controles.get(str(num_bimestre), {})
        cache = bim_data.get('dias_letivos_base', [])
        
        return [date.fromisoformat(d) for d in cache]

    def _calcular_dias_letivos_bimestre(self, num_bimestre, feriados_ano=None, extras_ano=None):
        """Lógica interna para calcular e retornar os dias letivos em formato ISO string."""
        inicio = getattr(self, f'data_inicio_{num_bimestre}bim')
        fim = getattr(self, f'data_fim_{num_bimestre}bim')
        
        if not inicio or not fim:
            return []

        if feriados_ano is None:
            feriados_ano = set(self.dias_nao_letivos.filter(data__range=(inicio, fim)).values_list('data', flat=True))
        else:
            feriados_ano = {d for d in feriados_ano if inicio <= d <= fim}
            
        if extras_ano is None:
            extras_ano = set(self.dias_letivos_extras.filter(data__range=(inicio, fim)).values_list('data', flat=True))
        else:
            extras_ano = {d for d in extras_ano if inicio <= d <= fim}

        dias_uteis = {
            (inicio + timedelta(n))
            for n in range((fim - inicio).days + 1)
            if (inicio + timedelta(n)).weekday() < 5
        }

        dias = sorted(list((dias_uteis - feriados_ano) | extras_ano))
        return [d.isoformat() for d in dias]

    def clean(self):
        bimestres = [
            (self.data_inicio_1bim, self.data_fim_1bim, '1º Bimestre'),
            (self.data_inicio_2bim, self.data_fim_2bim, '2º Bimestre'),
            (self.data_inicio_3bim, self.data_fim_3bim, '3º Bimestre'),
            (self.data_inicio_4bim, self.data_fim_4bim, '4º Bimestre'),
        ]
        
        last_date = None
        for inicio, fim, nome in bimestres:
            if inicio and fim:
                if inicio > fim:
                    raise ValidationError(f'Data de início do {nome} não pode ser posterior à data de fim.')
                if inicio.year != self.ano or fim.year != self.ano:
                    raise ValidationError(f'As datas do {nome} devem pertencer ao ano letivo {self.ano}.')
                if last_date and inicio <= last_date:
                    raise ValidationError(f'O {nome} deve começar após o fim do bimestre anterior.')
                last_date = fim

        # Restrição para alteração da forma de cálculo no controles se houver avaliações
        if self.pk:
            old_obj = AnoLetivo.objects.get(pk=self.pk)
            old_config = old_obj.controles.get('avaliacao', {}) if old_obj.controles else {}
            new_config = self.controles.get('avaliacao', {}) if self.controles else {}
            
            if old_config.get('forma_calculo') != new_config.get('forma_calculo'):
                from apps.evaluation.models import Avaliacao
                if Avaliacao.objects.filter(ano_letivo=self).exists():
                    raise ValidationError(
                        "Não é possível alterar a forma de cálculo do ano letivo pois já existem avaliações "
                        "cadastradas por professores. Remova ou altere as avaliações antes de mudar esta configuração global."
                    )

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            self._criar_controles_iniciais()
        self.atualizar_controles_json()
        self.sincronizar_configuracoes_disciplinas_turmas()
    
    def _criar_controles_iniciais(self):
        controles_a_criar = []
        tipos_bimestres = {
            ControleRegistrosVisualizacao.TipoControle.REGISTRO_AULA: [1, 2, 3, 4],
            ControleRegistrosVisualizacao.TipoControle.REGISTRO_NOTA: [1, 2, 3, 4, 5],
            ControleRegistrosVisualizacao.TipoControle.VISUALIZACAO_BOLETIM: [1, 2, 3, 4, 5],
        }
        
        for tipo, bimestres in tipos_bimestres.items():
            for bimestre in bimestres:
                controles_a_criar.append(
                    ControleRegistrosVisualizacao(
                        ano_letivo=self,
                        bimestre=bimestre,
                        tipo=tipo,
                        data_inicio=None,
                        data_fim=None
                    )
                )
        
        ControleRegistrosVisualizacao.objects.bulk_create(
            controles_a_criar,
            ignore_conflicts=True
        )
    
    def atualizar_controles_json(self):
        controles_db = ControleRegistrosVisualizacao.objects.filter(ano_letivo=self)
        novo_controles = {}
        
        # Otimização: Busca feriados e extras uma única vez para o intervalo total do ano
        datas_referencia = [
            self.data_inicio_1bim, self.data_fim_1bim,
            self.data_inicio_2bim, self.data_fim_2bim,
            self.data_inicio_3bim, self.data_fim_3bim,
            self.data_inicio_4bim, self.data_fim_4bim
        ]
        datas_validas = [d for d in datas_referencia if d]
        
        feriados_ano = set()
        extras_ano = set()
        if datas_validas:
            inicio_ano, fim_ano = min(datas_validas), max(datas_validas)
            feriados_ano = set(self.dias_nao_letivos.filter(data__range=(inicio_ano, fim_ano)).values_list('data', flat=True))
            extras_ano = set(self.dias_letivos_extras.filter(data__range=(inicio_ano, fim_ano)).values_list('data', flat=True))

        # Pré-calcula os dias letivos de todos os bimestres para usar no JSON
        dias_por_bimestre = {
            str(n): self._calcular_dias_letivos_bimestre(n, feriados_ano, extras_ano)
            for n in range(1, 5)
        }

        for controle in controles_db:
            bim_key = str(controle.bimestre)
            if bim_key not in novo_controles:
                # Inicializa o bimestre com a lista base de dias letivos
                novo_controles[bim_key] = {
                    'dias_letivos_base': dias_por_bimestre.get(bim_key, [])
                }
                
            c_data = {
                'data_liberada_inicio': controle.data_inicio.isoformat() if controle.data_inicio else None,
                'data_liberada_fim': controle.data_fim.isoformat() if controle.data_fim else None,
                'digitacao_futura': controle.digitacao_futura
            }
            
            if controle.tipo == ControleRegistrosVisualizacao.TipoControle.REGISTRO_AULA and controle.bimestre in range(1, 5):
                c_data['dias_letivos'] = dias_por_bimestre.get(bim_key, [])
                
            novo_controles[bim_key][controle.tipo] = c_data
            
        # Garante que mesmo bimestres sem controles tenham seus dias letivos base no JSON
        for bim_key, dias in dias_por_bimestre.items():
            if bim_key not in novo_controles:
                novo_controles[bim_key] = {'dias_letivos_base': dias}

        # Configurações de avaliação: preserva existente ou cria com valores padrão
        novo_controles['avaliacao'] = (
            self.controles.get('avaliacao', AVALIACAO_CONFIG_PADRAO.copy())
            if self.controles else AVALIACAO_CONFIG_PADRAO.copy()
        )

        AnoLetivo.objects.filter(pk=self.pk).update(controles=novo_controles)
        self.controles = novo_controles
        self.invalidar_cache_datas_liberadas()

    def sincronizar_configuracoes_disciplinas_turmas(self):
        """
        Sincroniza as configurações de avaliação de todas as disciplinas/turmas deste ano letivo
        sempre que a configuração global do Ano Letivo é alterada.
        """
        from apps.evaluation.models import AvaliacaoConfigDisciplinaTurma
        
        config_av = self.controles.get('avaliacao', {})
        forma_geral = config_av.get('forma_calculo', 'LIVRE_ESCOLHA')

        queryset = AvaliacaoConfigDisciplinaTurma.objects.filter(disciplina_turma__turma__ano_letivo=self.ano)

        if forma_geral == 'LIVRE_ESCOLHA':
            # Se for LIVRE_ESCOLHA, permite alteração e não mexe na forma atual
            queryset.update(pode_alterar=True)
        else:
            # Caso contrário, força a forma geral e bloqueia alteração
            queryset.update(forma_calculo=forma_geral, pode_alterar=False)

    @classmethod
    def obter_ano_letivo_da_data(cls, data):
        """Busca o AnoLetivo correspondente a uma data ou levanta ValidationError."""
        if not data:
            return None
        try:
            return cls.objects.get(ano=data.year)
        except cls.DoesNotExist:
            from django.core.exceptions import ValidationError
            raise ValidationError(f"Não existe um Ano Letivo cadastrado para o ano {data.year}.")

    def validar_periodo_letivo(self, data_inicio, data_fim=None):
        """
        Valida se o período possui dias letivos e se a data_inicio tem bimestre.
        Centraliza a lógica de validação de datas para todo o sistema.
        """
        from django.core.exceptions import ValidationError
        from datetime import timedelta
        
        # 1. O bimestre deve existir para a data_inicio
        if not self.bimestre(data_inicio):
            raise ValidationError(
                f"A data {data_inicio.strftime('%d/%m/%Y')} não pertence a nenhum bimestre no ano {self.ano}."
            )
        
        # 2. Verificar se existe pelo menos um dia letivo no intervalo [data_inicio, data_fim]
        fim_check = data_fim if data_fim else data_inicio
        
        # Otimização: busca O(1) com set
        dias_letivos_set = set(self.get_dias_letivos(data_inicio))
        
        def datas_no_intervalo():
            curr = data_inicio
            while curr <= fim_check:
                yield curr
                curr += timedelta(days=1)
        
        if not any(d in dias_letivos_set for d in datas_no_intervalo()):
            if data_inicio == fim_check:
                msg = f"A data {data_inicio.strftime('%d/%m/%Y')} não é um dia letivo."
            else:
                msg = f"O intervalo de {data_inicio.strftime('%d/%m/%Y')} a {fim_check.strftime('%d/%m/%Y')} não contém nenhum dia letivo."
            raise ValidationError(msg)

    def invalidar_cache_datas_liberadas(self):
        AnoLetivo.objects.filter(pk=self.pk).update(datas_liberadas_aulas_faltas=None)
        self.datas_liberadas_aulas_faltas = None

    class Meta:
        verbose_name = 'Ano Letivo'
        verbose_name_plural = 'Anos Letivos'
        ordering = ['-ano']
    
    def __str__(self):
        return f"{self.ano}"


class ControleRegistrosVisualizacao(UUIDModel):
    """Controle de períodos para registros e visualizações."""
    
    class TipoControle(models.TextChoices):
        REGISTRO_AULA = 'AULA', 'Registro de Aula (falta e conteúdo)'
        REGISTRO_NOTA = 'NOTA', 'Registro de Nota final do bimestre'
        VISUALIZACAO_BOLETIM = 'BOLETIM', 'Visualização do boletim'

    BIMESTRE_CHOICES = [
        (1, '1º Bimestre'),
        (2, '2º Bimestre'),
        (3, '3º Bimestre'),
        (4, '4º Bimestre'),
        (5, 'Resultado Final'),
    ]

    ano_letivo = models.ForeignKey(
        AnoLetivo,
        on_delete=models.CASCADE,
        related_name='controle_registros_visualizacao',
        verbose_name='Ano Letivo'
    )
    bimestre = models.IntegerField(
        verbose_name='Bimestre',
        choices=BIMESTRE_CHOICES,
        default=1
    )
    tipo = models.CharField(
        max_length=10,
        choices=TipoControle.choices,
        default=TipoControle.REGISTRO_AULA,
        verbose_name='Tipo'
    )
    data_inicio = models.DateField(verbose_name='Data de Início', null=True, blank=True)
    data_fim = models.DateField(verbose_name='Data de Fim', null=True, blank=True)
    digitacao_futura = models.BooleanField(
        verbose_name='Permite digitação futura',
        default=True
    )

    def clean(self):
        if self.data_fim and self.data_inicio and self.data_fim < self.data_inicio:
            raise ValidationError('A data de fim deve ser posterior à data de início.')
            
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.ano_letivo.atualizar_controles_json()
        
    def esta_liberado(self, data_referencia=None):
        hoje = timezone.localdate()
        if data_referencia is None:
            data_referencia = hoje
        
        if self.tipo == self.TipoControle.REGISTRO_AULA and not self.digitacao_futura and data_referencia > hoje:
            return False
        
        if not self.data_inicio and not self.data_fim:
            return False
        
        if self.data_inicio and not self.data_fim:
            return data_referencia >= self.data_inicio
        
        if not self.data_inicio and self.data_fim:
            return data_referencia <= self.data_fim
        
        return self.data_inicio <= data_referencia <= self.data_fim

    @property
    def status_liberacao(self):
        if not self.data_inicio and not self.data_fim:
            return 'Bloqueado'
        
        if self.esta_liberado():
            return 'Liberado'
        
        hoje = timezone.localdate()
        if self.data_inicio and hoje < self.data_inicio:
            return 'Aguardando início'
        
        return 'Encerrado'
        
    class Meta:
        verbose_name = 'Controle de Registro/Visualização'
        verbose_name_plural = 'Controles de Registros/Visualizações'
        unique_together = ['ano_letivo', 'bimestre', 'tipo']
        ordering = ['ano_letivo', 'bimestre', 'tipo']

    def __str__(self):
        bimestre_display = dict(self.BIMESTRE_CHOICES).get(self.bimestre, str(self.bimestre))
        return f"{self.ano_letivo.ano} - {bimestre_display} - {self.get_tipo_display()} ({self.status_liberacao})"


# =============================================================================
# SIGNALS PARA SINCRONIZAÇÃO DE CACHE
# =============================================================================

@receiver(m2m_changed, sender=AnoLetivo.dias_nao_letivos.through)
@receiver(m2m_changed, sender=AnoLetivo.dias_letivos_extras.through)
def sync_ano_letivo_days_m2m(sender, instance, action, **kwargs):
    """Atualiza o cache quando feriados/dias extras são vinculados/desvinculados."""
    if action in ["post_add", "post_remove", "post_clear"]:
        instance.atualizar_controles_json()

@receiver(post_save, sender=DiaNaoLetivo)
@receiver(post_save, sender=DiaLetivoExtra)
def sync_related_ano_letivo_on_save(sender, instance, **kwargs):
    """Atualiza o cache de todos os Anos Letivos que utilizam este feriado/dia extra alterado."""
    if sender == DiaNaoLetivo:
        anos = AnoLetivo.objects.filter(dias_nao_letivos=instance)
    else:
        anos = AnoLetivo.objects.filter(dias_letivos_extras=instance)
    
    for ano in anos:
        ano.atualizar_controles_json()
