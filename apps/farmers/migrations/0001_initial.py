import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Farmer",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("farm_name", models.CharField(max_length=255, verbose_name="farm name")),
                (
                    "location_lat",
                    models.DecimalField(
                        blank=True,
                        decimal_places=6,
                        help_text="GPS latitude coordinate (e.g. 31.963158)",
                        max_digits=9,
                        null=True,
                        verbose_name="latitude",
                    ),
                ),
                (
                    "location_lng",
                    models.DecimalField(
                        blank=True,
                        decimal_places=6,
                        help_text="GPS longitude coordinate (e.g. 35.930359)",
                        max_digits=9,
                        null=True,
                        verbose_name="longitude",
                    ),
                ),
                (
                    "phone_number",
                    models.CharField(blank=True, max_length=20, verbose_name="phone number"),
                ),
                ("bio", models.TextField(blank=True, verbose_name="bio")),
                (
                    "is_verified",
                    models.BooleanField(db_index=True, default=False, verbose_name="verified"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="farmer_profile",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
            ],
            options={
                "verbose_name": "farmer",
                "verbose_name_plural": "farmers",
                "ordering": ["-created_at"],
            },
        ),
    ]
