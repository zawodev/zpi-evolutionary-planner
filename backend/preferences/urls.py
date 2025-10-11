from django.urls import path
from . import views

urlpatterns = [
    path(
        'user-preferences/<uuid:recruitment_id>/<int:user_id>/',
        views.user_preferences_view,
        name='user-preferences'
    ),
    path(
        'constraints/<uuid:recruitment_id>/',
        views.constraints_view,
        name='constraints'
    ),
    path(
        'management-preferences/<uuid:recruitment_id>/',
        views.management_preferences_view,
        name='management-preferences'
    ),
]
