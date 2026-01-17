"""
URL configuration for CEMEP Digital project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.core.views import ProtectedMediaView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Authentication
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Protected Media (requer autenticação)
    path('api/v1/media/<path:file_path>', ProtectedMediaView.as_view(), name='protected_media'),
    
    # API Routes
    path('api/v1/', include([
        path('auth/', include('djoser.urls')),
        path('users/', include('apps.users.urls')),
        path('core/', include('apps.core.urls')),
        path('academic/', include('apps.academic.urls')),
        path('pedagogical/', include('apps.pedagogical.urls')),
        path('management/', include('apps.management.urls')),
        path('permanent/', include('apps.permanent.urls')),
        path('evaluation/', include('apps.evaluation.urls')),
    ])),
]

# Serve static files in development (CSS, JS, etc - não sensíveis)
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    # NOTA: Media files NÃO são servidos aqui!
    # Todos os arquivos de mídia devem passar pelo ProtectedMediaView em /api/v1/media/
