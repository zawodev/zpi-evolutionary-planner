from django.urls import path
from .views import (
    SubjectView,
    SubjectGroupView,
    RecruitmentView,
    RoomView,
    TagView,
    RoomTagView,
    MeetingView,
    ActiveMeetingsByRoomView,
    UsersByRecruitmentView,
    TagsByRoomView,
)

urlpatterns = [
    path('subjects/', SubjectView.as_view(), name='subjects'),
    path('subjects/<uuid:pk>/', SubjectView.as_view(), name='subject-detail'),

    path('subject-groups/', SubjectGroupView.as_view(), name='subject-groups'),
    path('subject-groups/<uuid:pk>/', SubjectGroupView.as_view(), name='subject-group-detail'),

    path('recruitments/', RecruitmentView.as_view(), name='recruitments'),
    path('recruitments/<uuid:pk>/', RecruitmentView.as_view(), name='recruitment-detail'),
    path('recruitments/<uuid:recruitment_pk>/users/', UsersByRecruitmentView.as_view(), name='recruitment-users'),

    path('rooms/', RoomView.as_view(), name='rooms'),
    path('rooms/<uuid:pk>/', RoomView.as_view(), name='room-detail'),
    path('rooms/<uuid:room_pk>/availability/', ActiveMeetingsByRoomView.as_view(), name='room-availability'),
    path('rooms/<uuid:room_pk>/tags/', TagsByRoomView.as_view(), name='room-tags'),

    path('tags/', TagView.as_view(), name='tags'),
    path('tags/<uuid:pk>/', TagView.as_view(), name='tag-detail'),

    path('room-tags/', RoomTagView.as_view(), name='roomtags'),
    path('room-tags/<uuid:pk>/', RoomTagView.as_view(), name='roomtag-detail'),

    path('meetings/', MeetingView.as_view(), name='meetings'),
    path('meetings/<uuid:pk>/', MeetingView.as_view(), name='meeting-detail'),
]