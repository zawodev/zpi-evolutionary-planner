from django.urls import path
from . import views

urlpatterns = [
    path(
        'user-preferences/<str:recruitment_id>/<str:user_id>/',
        views.user_preferences_view,
        name='user-preferences'
    ),
    path(
        'constraints/<str:recruitment_id>/',
        views.constraints_view,
        name='constraints'
    ),
    path(
        'aggregate-preferred-timeslots/<str:recruitment_id>/',
        views.aggregate_preferred_timeslots_view,
        name='aggregate-preferred-timeslots'
    ),
]
