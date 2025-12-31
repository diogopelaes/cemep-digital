from djoser import email


class PasswordResetEmail(email.PasswordResetEmail):
    """
    Email customizado para reset de senha usando template do app users.
    """
    template_name = 'emails/password_reset.html'
    subject_template_name = 'emails/password_reset_subject.txt'

