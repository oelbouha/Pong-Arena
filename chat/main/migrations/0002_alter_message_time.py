# Generated by Django 4.2.15 on 2024-11-26 11:49

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0001_chat'),
    ]

    operations = [
        migrations.AlterField(
            model_name='message',
            name='time',
            field=models.DateTimeField(default=datetime.datetime(2024, 11, 26, 11, 49, 31, 610006)),
        ),
    ]