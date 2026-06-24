from django.db import migrations, models


def set_farmer_roles(apps, schema_editor):
    User   = apps.get_model('users',   'User')
    Farmer = apps.get_model('farmers', 'Farmer')
    farmer_user_ids = set(Farmer.objects.values_list('user_id', flat=True))
    if farmer_user_ids:
        User.objects.filter(pk__in=farmer_user_ids).update(role='farmer')
    User.objects.filter(is_superuser=True).exclude(pk__in=farmer_user_ids).update(role='admin')


class Migration(migrations.Migration):
    dependencies = [
        ('users',   '0001_initial'),
        ('farmers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('admin', 'Admin'), ('farmer', 'Farmer'), ('consumer', 'Consumer')],
                db_index=True,
                default='consumer',
                max_length=10,
                verbose_name='role',
            ),
        ),
        migrations.RunPython(set_farmer_roles, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='user',
            name='is_consumer',
        ),
    ]
