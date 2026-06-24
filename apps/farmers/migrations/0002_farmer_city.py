from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('farmers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='farmer',
            name='city',
            field=models.CharField(blank=True, default='', max_length=100, verbose_name='city'),
            preserve_default=False,
        ),
    ]
