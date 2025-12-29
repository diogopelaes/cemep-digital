"""
App Management - Tarefas, HTPC, Avisos
"""
from django.db import models
from django.conf import settings
from apps.core.models import Funcionario
from ckeditor.fields import RichTextField

from datetime import datetime


def get_anexo_path(instance, filename):
    """
    Gera o caminho do arquivo baseado no tipo de anexo, usuário criador e data.
    Estrutura: {tipo}/{username}/{ano}/{mes}/{dia}/{filename}
    """
    model_type = type(instance).__name__
    date_path = datetime.now().strftime('%Y/%m/%d')
    base_folder = 'outros'
    username = 'anonimo'

    if model_type == 'TarefaAnexo':
        base_folder = 'tarefas'
        username = instance.tarefa.criador.username
    elif model_type == 'TarefaRespostaAnexo':
        base_folder = 'tarefas/respostas'
        username = instance.resposta.funcionario.usuario.username
    elif model_type == 'ReuniaoHTPCAnexo':
        base_folder = 'htpc'
        username = instance.reuniao.quem_registrou.username
    elif model_type == 'AvisoAnexo':
        base_folder = 'avisos'
        username = instance.aviso.criador.usuario.username

    return f"{base_folder}/{username}/{date_path}/{filename}"


class Tarefa(models.Model):
    """Tarefa atribuída a funcionários."""
    
    titulo = models.CharField(max_length=200, verbose_name='Título')
    descricao = RichTextField(blank=True, verbose_name='Descrição')
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
    # documento removed (moved to TarefaAnexo)
    
    class Meta:
        verbose_name = 'Tarefa'
        verbose_name_plural = 'Tarefas'
        ordering = ['-prazo']
    
    def __str__(self):
        return f"{self.titulo} (Prazo: {self.prazo.strftime('%d/%m/%Y')})"



class TarefaAnexo(models.Model):
    """Anexo de uma tarefa (arquivo)."""
    
    tarefa = models.ForeignKey(
        Tarefa,
        on_delete=models.CASCADE,
        related_name='anexos'
    )
    arquivo = models.FileField(upload_to=get_anexo_path, verbose_name='Arquivo')
    descricao = models.CharField(max_length=100, blank=True, verbose_name='Descrição')
    
    class Meta:
        verbose_name = 'Anexo da Tarefa'
        verbose_name_plural = 'Anexos da Tarefa'
    
    def __str__(self):
        return self.descricao or self.arquivo.name



class TarefaResposta(models.Model):
    """Resposta de um funcionário a uma tarefa."""
    
    tarefa = models.ForeignKey(
        Tarefa,
        on_delete=models.CASCADE,
        related_name='respostas'
    )
    funcionario = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='respostas_tarefa'
    )
    texto = RichTextField(blank=True, verbose_name='Mensagem/Resposta')
    data_envio = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Resposta da Tarefa'
        verbose_name_plural = 'Respostas da Tarefa'
        ordering = ['-data_envio']
    
    def __str__(self):
        return f"Resposta de {self.funcionario} em {self.tarefa}"



class TarefaRespostaAnexo(models.Model):
    """Anexo da resposta da tarefa."""
    
    resposta = models.ForeignKey(
        TarefaResposta,
        on_delete=models.CASCADE,
        related_name='anexos'
    )
    arquivo = models.FileField(upload_to=get_anexo_path, verbose_name='Arquivo')
    descricao = models.CharField(max_length=100, blank=True, verbose_name='Descrição')
    
    class Meta:
        verbose_name = 'Anexo da Resposta'
        verbose_name_plural = 'Anexos da Resposta'
    
    def __str__(self):
        return self.descricao or self.arquivo.name



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
    pauta = RichTextField(verbose_name='Pauta')
    ata = RichTextField(blank=True, verbose_name='Ata')
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



class ReuniaoHTPCAnexo(models.Model):
    """Anexos da reunião de HTPC (lista de presença, slides, etc)."""
    
    reuniao = models.ForeignKey(
        ReuniaoHTPC,
        on_delete=models.CASCADE,
        related_name='anexos'
    )
    arquivo = models.FileField(upload_to=get_anexo_path, verbose_name='Arquivo')
    descricao = models.CharField(max_length=100, blank=True, verbose_name='Descrição')
    
    class Meta:
        verbose_name = 'Anexo de HTPC'
        verbose_name_plural = 'Anexos de HTPC'
    
    def __str__(self):
        return self.descricao or self.arquivo.name



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
    texto = RichTextField(verbose_name='Texto')
    # documento removed (moved to AvisoAnexo)
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



class AvisoAnexo(models.Model):
    """Anexo de um aviso."""
    
    aviso = models.ForeignKey(
        Aviso,
        on_delete=models.CASCADE,
        related_name='anexos'
    )
    arquivo = models.FileField(upload_to=get_anexo_path, verbose_name='Arquivo')
    descricao = models.CharField(max_length=100, blank=True, verbose_name='Descrição')
    
    class Meta:
        verbose_name = 'Anexo do Aviso'
        verbose_name_plural = 'Anexos do Aviso'
    
    def __str__(self):
        return self.descricao or self.arquivo.name



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

