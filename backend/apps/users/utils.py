"""
Utilitários para o App Users
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings


def send_credentials_email(email, nome, username, password, tipo_usuario='USUARIO'):
    """
    Envia email com credenciais de acesso para qualquer tipo de usuário.
    
    Args:
        email: Email do destinatário
        nome: Nome do usuário
        username: Nome de usuário para login
        password: Senha (em texto plano, antes de hash)
        tipo_usuario: Tipo do usuário (ESTUDANTE, RESPONSAVEL, FUNCIONARIO, etc.)
    
    Returns:
        dict: {'success': bool, 'message': str}
    """
    if not email:
        return {'success': False, 'message': 'E-mail não informado'}
    
    # Mapeia tipo de usuário para texto amigável
    tipo_display = {
        'ESTUDANTE': 'Estudante',
        'RESPONSAVEL': 'Responsável',
        'GESTAO': 'Gestão',
        'SECRETARIA': 'Secretaria',
        'PROFESSOR': 'Professor',
        'FUNCIONARIO': 'Funcionário',
    }.get(tipo_usuario, 'Usuário')
    
    context = {
        'nome': nome,
        'username': username,
        'password': password,
        'tipo_usuario': tipo_display,
        'site_url': getattr(settings, 'SITE_URL', 'http://localhost:5173'),
        'site_name': getattr(settings, 'SITE_NAME', 'CEMEP Digital'),
        'institution_name': getattr(settings, 'INSTITUTION_NAME', 'CEMEP'),
        'logo_url': f"{getattr(settings, 'SITE_URL', 'http://localhost:5173')}/static/img/{settings.INSTITUTIONAL_DATA['institution']['logo']['filename']}",
    }
    
    try:
        html_message = render_to_string('emails/credentials_email.html', context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=f"{context['site_name']} - Suas Credenciais de Acesso",
            message=plain_message,
            html_message=html_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@cemep.com.br'),
            recipient_list=[email],
            fail_silently=False,
        )
        return {'success': True, 'message': f'E-mail enviado para {email}'}
    except Exception as e:
        return {'success': False, 'message': f'Erro ao enviar e-mail: {str(e)}'}
