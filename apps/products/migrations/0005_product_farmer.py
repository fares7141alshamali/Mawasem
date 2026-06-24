import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("farmers", "0001_initial"),
        ("products", "0004_product_created_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="farmer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="products",
                to="farmers.farmer",
                verbose_name="farmer",
            ),
        ),
    ]
