"""
App Management - Tarefas, HTPC, Avisos
"""
from django.db import models
from django.conf import settings
from apps.core.models import Funcionario


class Tarefa(models.Model):
    """Tarefa atribuída a funcionários."""
    
    titulo = models.CharField(max_length=200, verbose_name='Título')
    descricao = models.TextField(blank=True, verbose_name='Descrição')
    prazo = models.DateTimeField(verbose_name='Prazo')
    funcionarios = models.ManyToManyField(
        Funcionario,
        related_name='tarefas',
        verbose_name='Funcionários Responsáveis'
    )
    concluido = models.BooleanField(default=False, verbose_name='Concluído')
    data_conclusao = models.DateTimeField(null=True, blank=True)
    data_cadastro = models.DateTimeField(auto_now_add=True)
    criador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tarefas_criadas'
    )
    documento = models.FileField(
        upload_to='tarefas/',
        null=True,
        blank=True,
        verbose_name='Documento Anexo'
    )
    
    class Meta:
        verbose_name = 'Tarefa'
        verbose_name_plural = 'Tarefas'
        ordering = ['-prazo']
    
    def __str__(self):
        return f"{self.titulo} (Prazo: {self.prazo.strftime('%d/%m/%Y')})"


class NotificacaoTarefa(models.Model):
    """Notificação de tarefa para funcionário."""
    
    tarefa = models.ForeignKey(
        Tarefa,
        on_delete=models.CASCADE,
        related_name='notificacoes'
    )
    funcionario = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='notificacoes_tarefas'
    )
    visualizado = models.BooleanField(default=False)
    data_visualizacao = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Notificação de Tarefa'
        verbose_name_plural = 'Notificações de Tarefas'
        unique_together = ['tarefa', 'funcionario']
    
    def __str__(self):
        return f"{self.funcionario} - {self.tarefa}"


class ReuniaoHTPC(models.Model):
    """Reunião de HTPC (Hora de Trabalho Pedagógico Coletivo)."""
    
    data_reuniao = models.DateTimeField(verbose_name='Data da Reunião')
    pauta = models.TextField(verbose_name='Pauta')
    ata = models.TextField(blank=True, verbose_name='Ata')
    presentes = models.ManyToManyField(
        Funcionario,
        related_name='htpcs_presentes',
        blank=True,
        verbose_name='Presentes'
    )
    data_registro = models.DateTimeField(auto_now_add=True)
    quem_registrou = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='htpcs_registrados'
    )
    
    class Meta:
        verbose_name = 'Reunião HTPC'
        verbose_name_plural = 'Reuniões HTPC'
        ordering = ['-data_reuniao']
    
    def __str__(self):
        return f"HTPC - {self.data_reuniao.strftime('%d/%m/%Y %H:%M')}"


class NotificacaoHTPC(models.Model):
    """Notificação de HTPC para funcionário."""
    
    reuniao = models.ForeignKey(
        ReuniaoHTPC,
        on_delete=models.CASCADE,
        related_name='notificacoes'
    )
    funcionario = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='notificacoes_htpc'
    )
    visualizado = models.BooleanField(default=False)
    data_visualizacao = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Notificação de HTPC'
        verbose_name_plural = 'Notificações de HTPC'
        unique_together = ['reuniao', 'funcionario']
    
    def __str__(self):
        return f"{self.funcionario} - {self.reuniao}"


class Aviso(models.Model):
    """Aviso/comunicado para usuários."""
    
    titulo = models.CharField(max_length=200, verbose_name='Título')
    texto = models.TextField(verbose_name='Texto')
    documento = models.FileField(
        upload_to='avisos/',
        null=True,
        blank=True,
        verbose_name='Documento Anexo'
    )
    data_aviso = models.DateTimeField(auto_now_add=True)
    criador = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='avisos_criados'
    )
    destinatarios = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='avisos_recebidos',
        verbose_name='Destinatários'
    )
    
    class Meta:
        verbose_name = 'Aviso'
        verbose_name_plural = 'Avisos'
        ordering = ['-data_aviso']
    
    def __str__(self):
        return f"{self.titulo} ({self.data_aviso.strftime('%d/%m/%Y')})"


class AvisoVisualizacao(models.Model):
    """Registro de visualização de aviso."""
    
    aviso = models.ForeignKey(
        Aviso,
        on_delete=models.CASCADE,
        related_name='visualizacoes'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='avisos_visualizados'
    )
    visualizado = models.BooleanField(default=False)
    data_visualizacao = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Visualização de Aviso'
        verbose_name_plural = 'Visualizações de Avisos'
        unique_together = ['aviso', 'usuario']
    
    def __str__(self):
        return f"{self.usuario} - {self.aviso}"

