"""
Model centralizado para gerenciamento de arquivos do sistema.
"""
import os
import re
import uuid
from datetime import date
from django.db import models
from .base import UUIDModel


def sanitize_path_segment(value: str) -> str:
    """Remove caracteres especiais e espaços de um segmento de path."""
    if not value:
        return ""
    # Remove acentos e caracteres especiais, mantém apenas alfanuméricos e hífen
    value = re.sub(r'[^\w\s-]', '', value)
    value = re.sub(r'\s+', '_', value)
    return value.strip('_').upper()


def build_upload_path(
    base_folder: str,
    ano_letivo: int | str | None = None,
    turma_numero: int | None = None,
    turma_letra: str | None = None,
    disciplina_sigla: str | None = None,
    user_id: str | None = None,
    filename: str = ""
) -> str:
    """
    Gera path organizado para upload de arquivos.
    
    Estrutura: {ano_letivo}/{turma}/{disciplina}/{base_folder}/{YYYY-MM-DD}/{uuid}.{ext}
    
    Partes opcionais são omitidas se não fornecidas.
    Sempre presente: {base_folder}/{YYYY-MM-DD}/{uuid}.{ext}
    """
    ext = os.path.splitext(filename)[1].lower() if filename else ""
    file_uuid = str(uuid.uuid4())
    data_hoje = date.today().strftime('%Y-%m-%d')
    
    segments = []
    
    # Ano letivo (opcional)
    if ano_letivo:
        segments.append(str(ano_letivo))
    
    # Turma: numero + letra (opcional, só se ambos existirem)
    if turma_numero is not None and turma_letra:
        turma_code = f"{turma_numero}{turma_letra.upper()}"
        segments.append(turma_code)
    
    # Disciplina sigla sanitizada (opcional)
    if disciplina_sigla:
        sigla_clean = sanitize_path_segment(disciplina_sigla)
        if sigla_clean:
            segments.append(sigla_clean)
    
    # Peças fixas
    segments.extend([base_folder, data_hoje])
    
    # ID do usuário (opcional se não fornecido)
    if user_id:
        segments.append(str(user_id))
    
    # Nome do arquivo final (UUID)
    segments.append(f"{file_uuid}{ext}")
    
    return "/".join(segments)


def arquivo_upload_path(instance, filename):
    """Função para FileField.upload_to que usa metadados da instância."""
    return build_upload_path(
        base_folder=instance.categoria or "geral",
        ano_letivo=instance.ano_letivo,
        turma_numero=instance.turma_numero,
        turma_letra=instance.turma_letra,
        disciplina_sigla=instance.disciplina_sigla,
        user_id=str(instance.criado_por.id) if instance.criado_por else None,
        filename=filename
    )


class Arquivo(UUIDModel):
    """
    Model centralizado para todos os arquivos do sistema.
    Relacionamentos são feitos via ManyToMany nos models que usam arquivos.
    """
    
    class Categoria(models.TextChoices):
        AVALIACAO = 'avaliacoes', 'Avaliação'
        VISTO = 'vistos', 'Visto'
        ATIVIDADE = 'atividades', 'Atividade'
        REUNIAO = 'reunioes', 'Reunião'
        DOCUMENTO = 'documentos', 'Documento'
        ATESTADO = 'atestados', 'Atestado'
        OCORRENCIA = 'ocorrencias', 'Ocorrência'
        OUTRO = 'outros', 'Outro'
    
    arquivo = models.FileField(
        upload_to=arquivo_upload_path,
        verbose_name='Arquivo'
    )
    nome_original = models.CharField(
        max_length=255,
        verbose_name='Nome Original'
    )
    categoria = models.CharField(
        max_length=20,
        choices=Categoria.choices,
        default=Categoria.OUTRO,
        verbose_name='Categoria'
    )
    
    # Metadados para organização do path (preenchidos antes do save)
    ano_letivo = models.PositiveSmallIntegerField(null=True, blank=True)
    turma_numero = models.PositiveSmallIntegerField(null=True, blank=True)
    turma_letra = models.CharField(max_length=1, null=True, blank=True)
    disciplina_sigla = models.CharField(max_length=20, null=True, blank=True)
    
    # Auditoria
    tamanho = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name='Tamanho (bytes)'
    )
    mime_type = models.CharField(
        max_length=100,
        null=True, blank=True,
        verbose_name='Tipo MIME'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    criado_por = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='arquivos_criados'
    )

    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False

        return self.criado_por == user
    
    class Meta:
        verbose_name = 'Arquivo'
        verbose_name_plural = 'Arquivos'
        ordering = ['-criado_em']
    
    def __str__(self):
        return self.nome_original or str(self.id)
    
    def save(self, *args, **kwargs):
        # Captura nome original e tamanho antes de salvar
        if self.arquivo and not self.nome_original:
            self.nome_original = os.path.basename(self.arquivo.name)
        if self.arquivo and not self.tamanho:
            try:
                self.tamanho = self.arquivo.size
            except Exception:
                pass
        super().save(*args, **kwargs)
    
    def delete(self, *args, user=None, **kwargs):
        """
        Sobrescreve delete para garantir que apenas o criador pode excluir.
        
        Args:
            user: Usuário que está tentando deletar. Se omitido (None), 
                  prossegue (permite deleções via CASCADE do sistema).
            
        Raises:
            PermissionDenied: Se o usuário for informado e não for o criador.
        """
        from django.core.exceptions import PermissionDenied
        
        # Só valida se um usuário for explicitamente passado (ex: via View/Serializer)
        if user is not None:
            if self.criado_por_id:
                if self.criado_por_id != user.id and not getattr(user, 'is_superuser', False):
                    raise PermissionDenied("Apenas o criador do arquivo pode excluí-lo.")
            else:
                # Arquivo sem dono: apenas superusuário
                if not getattr(user, 'is_superuser', False):
                    raise PermissionDenied("Apenas administradores podem deletar este arquivo.")
        
        # O super().delete() dispara o signal post_delete (que limpa o GCS)
        super().delete(*args, **kwargs)


# Signals para limpeza física de arquivos
from django.db.models.signals import post_delete
from django.dispatch import receiver

@receiver(post_delete, sender=Arquivo)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """
    Deleta o arquivo físico do storage quando o objeto Arquivo é deletado.
    Funciona tanto localmente quanto em cloud storage (GCS, S3, etc).
    """
    if instance.arquivo:
        instance.arquivo.delete(save=False)
