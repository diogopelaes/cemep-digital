from django.db import models
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

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            self._criar_controles_iniciais()
            self._criar_configuracao_avaliacao_geral()
        self.atualizar_controles_json()
    
    def _criar_configuracao_avaliacao_geral(self):
        try:
            from apps.evaluation.models import ConfiguracaoAvaliacaoGeral
            ConfiguracaoAvaliacaoGeral.objects.get_or_create(
                ano_letivo=self,
                defaults={
                    'livre_escolha_professor': True,
                    'numero_casas_decimais_bimestral': 1,
                    'numero_casas_decimais_avaliacao': 2,
                }
            )
        except Exception:
            pass
    
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
        from datetime import timedelta
        
        controles_db = ControleRegistrosVisualizacao.objects.filter(ano_letivo=self)
        novo_controles = {}
        datas_bimestres = {
            1: (self.data_inicio_1bim, self.data_fim_1bim),
            2: (self.data_inicio_2bim, self.data_fim_2bim),
            3: (self.data_inicio_3bim, self.data_fim_3bim),
            4: (self.data_inicio_4bim, self.data_fim_4bim),
        }
        
        feriados = set(d.data for d in self.dias_nao_letivos.all())
        extras = set(d.data for d in self.dias_letivos_extras.all())
        
        for controle in controles_db:
            bim_key = str(controle.bimestre)
            if bim_key not in novo_controles:
                novo_controles[bim_key] = {}
                
            c_data = {
                'data_liberada_inicio': controle.data_inicio.isoformat() if controle.data_inicio else None,
                'data_liberada_fim': controle.data_fim.isoformat() if controle.data_fim else None,
                'digitacao_futura': controle.digitacao_futura
            }
            
            if controle.tipo == ControleRegistrosVisualizacao.TipoControle.REGISTRO_AULA and controle.bimestre in range(1, 5):
                dias_letivos = []
                inicio_bim, fim_bim = datas_bimestres.get(controle.bimestre, (None, None))
                
                if inicio_bim and fim_bim:
                    curr = inicio_bim
                    while curr <= fim_bim:
                        is_weekday = curr.weekday() < 5
                        is_feriado = curr in feriados
                        is_extra = curr in extras
                        
                        if (is_weekday and not is_feriado) or is_extra:
                            dias_letivos.append(curr.isoformat())
                            
                        curr += timedelta(days=1)
                
                c_data['dias_letivos'] = dias_letivos
                
            novo_controles[bim_key][controle.tipo] = c_data
            
        AnoLetivo.objects.filter(pk=self.pk).update(controles=novo_controles)
        self.controles = novo_controles
        self.invalidar_cache_datas_liberadas()

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
