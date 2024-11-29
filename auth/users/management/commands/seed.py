from typing import Any
from django.core.management.base import BaseCommand, CommandError
from django.core.serializers import deserialize
from django.contrib.auth import get_user_model

raw_users = '[{"model": "users.user", "pk": 6, "fields": {"password": "pbkdf2_sha256$600000$6T8k67qt2DTV7Rz7DJUpTR$AJb/7JePgPeFNADT5W5c2+rWghX0rdzZ2eXoeB9WdPw=", "last_login": null, "is_superuser": false, "username": "ysalmi2", "first_name": "Joseph", "last_name": "Salmi", "is_staff": false, "is_active": true, "email": "ysalmi2@student.1337.ma", "profile_image": "avatars/jst.jsp.webp", "profile_banner": "banners/ysalmi.jpg", "date_joined": "2024-11-15T11:45:23.876Z", "verified": true, "provider": "", "level": 1, "exp": 0, "xp_next_level": 100, "win_streak": 0, "won": 0, "lost": 0, "groups": [], "user_permissions": []}}, {"model": "users.user", "pk": 8, "fields": {"password": "pbkdf2_sha256$600000$6T8k67qt2DTV7Rz7DJUpTR$AJb/7JePgPeFNADT5W5c2+rWghX0rdzZ2eXoeB9WdPw=", "last_login": null, "is_superuser": false, "username": "ysalmi3", "first_name": "Joseph", "last_name": "Salmi", "is_staff": false, "is_active": true, "email": "ysalmi3@gmail.com", "profile_image": "avatars/jst.jsp.webp", "profile_banner": "banners/ysalmi.jpg", "date_joined": "2024-11-15T11:45:23.876Z", "verified": true, "provider": "", "level": 1, "exp": 0, "xp_next_level": 100, "win_streak": 0, "won": 0, "lost": 0, "groups": [], "user_permissions": []}}, {"model": "users.user", "pk": 2, "fields": {"password": "", "last_login": null, "is_superuser": false, "username": "jst.jsp", "first_name": "Joseph", "last_name": "Salmi", "is_staff": false, "is_active": true, "email": "ysalmi@student.1337.ma", "profile_image": "avatars/jst.jsp.webp", "profile_banner": "banners/ysalmi.jpg", "date_joined": "2024-11-15T11:45:23.876Z", "verified": true, "provider": "", "level": 1, "exp": 0, "xp_next_level": 100, "win_streak": 0, "won": 0, "lost": 0, "groups": [], "user_permissions": []}}, {"model": "users.user", "pk": 4, "fields": {"password": "pbkdf2_sha256$600000$hiPF0ZxXwSVPnmLWqjDxE5$oSYVDO5hp0zw+1f0hG5GbHI6E38J2sfjUWUzLjtOa9A=", "last_login": null, "is_superuser": false, "username": "yajallal", "first_name": "yassine", "last_name": "ajallal", "is_staff": false, "is_active": true, "email": "yassineajallal@gmail.com", "profile_image": "", "profile_banner": "", "date_joined": "2024-11-22T14:52:35.378Z", "verified": true, "provider": "", "level": 1, "exp": 0, "xp_next_level": 100, "win_streak": 0, "won": 0, "lost": 0, "groups": [], "user_permissions": []}}, {"model": "users.user", "pk": 5, "fields": {"password": "", "last_login": null, "is_superuser": false, "username": "santos", "first_name": "Yassine", "last_name": "Ajallal", "is_staff": false, "is_active": true, "email": "yajallal@student.1337.ma", "profile_image": "avatars/santos.jpg", "profile_banner": "banners/santos.jpg", "date_joined": "2024-11-22T15:15:54.954Z", "verified": true, "provider": "", "level": 1, "exp": 0, "xp_next_level": 100, "win_streak": 0, "won": 0, "lost": 0, "groups": [], "user_permissions": []}}, {"model": "users.user", "pk": 3, "fields": {"password": "pbkdf2_sha256$600000$9MkdMchcTivgoYaA9QWIKb$xlcXJ2CmrUD1YtnjyxDHnTtIHOo/bYUCbwqh30ObzPQ=", "last_login": null, "is_superuser": false, "username": "gsalmi", "first_name": "youssef", "last_name": "essalmi", "is_staff": false, "is_active": true, "email": "salmi19971@gmail.com", "profile_image": "avatars/gsalmi.jpeg", "profile_banner": "banners/gsalmi.jpg", "date_joined": "2024-11-19T17:16:31.501Z", "verified": true, "provider": "", "level": 1, "exp": 0, "xp_next_level": 100, "win_streak": 0, "won": 0, "lost": 0, "groups": [], "user_permissions": []}}]'

User = get_user_model()
def remove_id(user):
    user.id = None
    return user

class Command(BaseCommand):
    help = "fill default users"
    
    def add_arguments(self, parser):
        parser.add_argument(
            "--database",
            default='default',
            help="Specify the data base to fill",
        )
        
    def handle(self, *args: Any, **options: Any):
        users_generator = deserialize('json', raw_users)
        users = [remove_id(deserialized.object) for deserialized in users_generator]
        User.objects.using(options['database']).bulk_create(users)

