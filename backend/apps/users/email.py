from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from djoser import utils

class PasswordResetEmail:
    """
    Email customizado para reset de senha, sem depender do templated_mail do Djoser.
    """
    template_name = 'emails/password_reset.html'
    subject_template_name = 'emails/password_reset_subject.txt'

    def __init__(self, request=None, context=None):
        self.request = request
        self.context = context or {}
        
        user = self.context.get('user')

        # 1. Generate UID and Token (Crucial for URL)
        # Djoser view passes 'user' but expects email class to generate these.
        if user:
            if 'uid' not in self.context:
                self.context['uid'] = utils.encode_uid(user.pk)
            if 'token' not in self.context:
                self.context['token'] = default_token_generator.make_token(user)

        # 2. Site Name
        if 'site_name' not in self.context:
            self.context['site_name'] = settings.DJOSER.get('SITE_NAME', 'CEMEP Digital')

        # 3. Site URL (needed for logo)
        if 'site_url' not in self.context:
            self.context['site_url'] = settings.SITE_URL.rstrip('/')
            
        # 4. Activation/Reset URL
        if 'url' not in self.context and 'uid' in self.context and 'token' in self.context:
            try:
                # Get the setting path, e.g. "/redefinir-senha/{uid}/{token}"
                confirm_url_format = settings.DJOSER.get('PASSWORD_RESET_CONFIRM_URL')
                
                # Format it with uid and token
                relative_url = confirm_url_format.format(**self.context)
                
                # Combine with site_url (no duplicated slashes)
                site_url = self.context['site_url']
                full_url = f"{site_url.rstrip('/')}/{relative_url.lstrip('/')}"
                
                self.context['url'] = full_url
            except Exception as e:
                self.context['url'] = '#'

    def send(self, to, *args, **kwargs):
        # Garante que 'to' seja uma lista
        if isinstance(to, str):
            to = [to]

        # Renderiza o assunto
        subject = render_to_string(self.subject_template_name, self.context).strip()
        
        # Renderiza o corpo (HTML)
        html_content = render_to_string(self.template_name, self.context)
        
        # Renderiza a versão texto
        text_template = self.template_name.replace('.html', '.txt')
        text_content = render_to_string(text_template, self.context)

        # Cria o objeto de email
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=to
        )
        
        
        # Reabilita o HTML (Correção Final)
        msg.attach_alternative(html_content, "text/html")
        
        # Envia
        msg.send()

