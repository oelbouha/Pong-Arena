# Generated by Django 4.2.16 on 2024-11-29 00:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shared_models', '0005_match_order'),
    ]

    operations = [
        migrations.AlterField(
            model_name='match',
            name='date',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name='match',
            name='status',
            field=models.CharField(choices=[('PEND', 'Pending'), ('FINISH', 'Finished'), ('ONGOING', 'Ongoing')], default='PEND', max_length=16),
        ),
    ]
