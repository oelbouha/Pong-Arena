# Generated by Django 4.2.16 on 2024-11-25 18:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shared_models', '0002_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='friendship',
            old_name='blocked',
            new_name='user1_blocked',
        ),
        migrations.AddField(
            model_name='friendship',
            name='user2_blocked',
            field=models.BooleanField(default=False),
        ),
    ]