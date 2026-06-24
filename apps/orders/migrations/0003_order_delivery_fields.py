from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_add_order_status_history'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='delivery_method',
            field=models.CharField(
                blank=True,
                choices=[('self', 'Self Delivery'), ('partner', 'Delivery Partner')],
                max_length=10,
                null=True,
                verbose_name='delivery method',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='courier',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='courier'),
        ),
        migrations.AddField(
            model_name='order',
            name='tracking_number',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='tracking number'),
        ),
    ]
