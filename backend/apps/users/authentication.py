from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailOrUsernameModelBackend(ModelBackend):
    """
    Backend de autenticação customizado que permite login via e-mail ou username.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        
        try:
            # Busca por username ou email (case-insensitive para o e-mail)
            user = User.objects.get(Q(username__iexact=username) | Q(email__iexact=username))
        except User.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a nonexistent user (@see Django docs)
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            # Se por algum motivo houver mais de um usuário com o mesmo e-mail,
            # pega o primeiro para evitar quebra do sistema (embora e-mail deva ser único)
            user = User.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).first()

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
