"""
Admin para o App Users
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from django.contrib.auth.models import Group

# Remove o model Group do admin
admin.site.unregister(Group)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'tipo_usuario', 'is_active']
    list_filter = ['tipo_usuario', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['first_name', 'last_name']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Informações CEMEP', {
            'fields': ('tipo_usuario', 'telefone', 'foto', 'dark_mode')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Informações CEMEP', {
            'fields': ('tipo_usuario', 'telefone')
        }),
    )

