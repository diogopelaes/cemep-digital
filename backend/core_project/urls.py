"""
URL configuration for CEMEP Digital project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Authentication
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API Routes
    path('api/v1/', include([
        path('auth/', include('djoser.urls')),
        path('users/', include('apps.users.urls')),
        path('core/', include('apps.core.urls')),
        path('academic/', include('apps.academic.urls')),
        path('pedagogical/', include('apps.pedagogical.urls')),
        path('management/', include('apps.management.urls')),
        path('permanent/', include('apps.permanent.urls')),
    ])),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

