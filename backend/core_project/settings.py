"""
Django settings for CEMEP Digital project.
"""

import os
import json
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / '.env')

# Carrega configurações institucionais do JSON (obrigatório)
try:
    with open(BASE_DIR.parent / 'institutional_config.json', 'r', encoding='utf-8') as f:
        INSTITUTIONAL_DATA = json.load(f)
except Exception as e:
    raise Exception(f"ERRO CRÍTICO: Não foi possível carregar 'institutional_config.json'. "
                    f"Este arquivo é obrigatório para o funcionamento do sistema. Detalhes: {e}")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',') if os.getenv('ALLOWED_HOSTS') else []

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'rest_framework',
    'djoser',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    # Project apps
    'apps.users',
    'apps.core',
    'apps.academic',
    'apps.pedagogical',
    'apps.evaluation',
    'apps.management',
    'apps.permanent',
    'ckeditor',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Configurações de Sessão e Cookies (Necessário para Protected Media)
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_HTTPONLY = True  # Proteção contra XSS (JS não acessa cookie)
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 1 semana
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_SAMESITE = 'Lax'  # Proteção CSRF
# Em produção, exige HTTPS
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

ROOT_URLCONF = 'core_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core_project.wsgi.application'
ASGI_APPLICATION = 'core_project.asgi.application'

# Database - PostgreSQL
# ATOMIC_REQUESTS: Cada requisição HTTP é uma transação atômica
# Se qualquer parte falhar, tudo é revertido automaticamente
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'ATOMIC_REQUESTS': True,
    }
}

# Custom User Model
AUTH_USER_MODEL = 'users.User'

AUTHENTICATION_BACKENDS = [
    'apps.users.authentication.EmailOrUsernameModelBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Media files (Uploads)
# SEGURANÇA: Todos os arquivos passam pelo ProtectedMediaView
MEDIA_URL = '/api/v1/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# =============================================================================
# FILE STORAGE CONFIGURATION
# =============================================================================
# Em desenvolvimento (USE_GCS=false): armazena localmente em MEDIA_ROOT
# Em produção (USE_GCS=true): armazena no Google Cloud Storage com Signed URLs
#
# SEGURANÇA: Quando usando GCS, todos os arquivos são PRIVADOS.
# Ninguém acessa diretamente a URL do bucket - o Django gera URLs temporárias
# assinadas após verificar as permissões do usuário em ProtectedMediaView.

USE_GCS = os.getenv('USE_GCS', 'False').lower() == 'true'

if USE_GCS:
    # Adiciona django-storages aos apps (se não estiver)
    if 'storages' not in INSTALLED_APPS:
        INSTALLED_APPS.append('storages')
    
    # Configurações do Google Cloud Storage
    GS_BUCKET_NAME = os.getenv('GS_BUCKET_NAME')
    GS_PROJECT_ID = os.getenv('GS_PROJECT_ID')
    GS_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    GS_DEFAULT_ACL = 'private'  # IMPORTANTE: Todos os arquivos são privados
    GS_SIGNED_URL_EXPIRY = timedelta(minutes=15)  # URLs expiram em 15 min
    
    # Usa o storage customizado para mídia
    DEFAULT_FILE_STORAGE = 'core_project.storage.CEMEPGoogleCloudStorage'
    
    # URL base do bucket (usada internamente, acesso real é via Signed URLs)
    MEDIA_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        # SessionAuthentication permite que o browser envie cookie em requests de imagem
        # JWT continua sendo o método principal para APIs
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    # Rate Limiting (proteção contra brute force)
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    }
}

# Simple JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Djoser Configuration (Password Reset)
# Extrai domínio da URL do sistema (remove http:// ou https://)
_site_url = INSTITUTIONAL_DATA['system']['site_url']
_domain = _site_url.replace('https://', '').replace('http://', '')

DJOSER = {
    'PASSWORD_RESET_CONFIRM_URL': '/redefinir-senha/{uid}/{token}',
    'SEND_ACTIVATION_EMAIL': False,
    'DOMAIN': _domain,
    'SITE_NAME': INSTITUTIONAL_DATA['system']['name'],
    'PASSWORD_RESET_SHOW_EMAIL_NOT_FOUND': False,
    'SERIALIZERS': {
        'user_create': 'apps.users.serializers.UserCreateSerializer',
        'user': 'apps.users.serializers.UserSerializer',
        'current_user': 'apps.users.serializers.UserSerializer',
    },
    'EMAIL': {
        'password_reset': 'apps.users.email.PasswordResetEmail',
    },
}

# CORS Configuration
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
CORS_ALLOW_CREDENTIALS = True

# CSRF Configuration
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]
# Adiciona variantes comuns de localhost para evitar problemas em dev
if 'localhost' in FRONTEND_URL:
    CSRF_TRUSTED_ORIGINS.append('http://127.0.0.1:5173')



# Email Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND')
EMAIL_HOST = os.getenv('EMAIL_HOST')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')

# URL do site (centralizado - altere aqui para refletir em todo o sistema)
SITE_URL = os.getenv('SITE_URL', INSTITUTIONAL_DATA['system']['site_url'])
SITE_NAME = INSTITUTIONAL_DATA['system']['name']
INSTITUTION_NAME = INSTITUTIONAL_DATA['institution']['name_official']

# Create necessary directories
os.makedirs(STATIC_ROOT, exist_ok=True)
os.makedirs(MEDIA_ROOT, exist_ok=True)
os.makedirs(BASE_DIR / 'static', exist_ok=True)

# CKEditor Configuration
CKEDITOR_CONFIGS = {
    'default': {
        'toolbar': 'Custom',
        'toolbar_Custom': [
            ['Bold', 'Italic', 'Underline'],
            ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent'],
            ['Link', 'Unlink'],
            ['RemoveFormat', 'Source']
        ],
        'width': 'auto',
    },
}

# Silenced System Checks
SILENCED_SYSTEM_CHECKS = ['ckeditor.W001']

# Security settings para produção
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000  # 1 ano
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True

