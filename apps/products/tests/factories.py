import factory

from apps.products.models import Category, Product, ProductImage


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    name_en = factory.Sequence(lambda n: f"Category {n}")
    name_ar = factory.Sequence(lambda n: f"category-ar-{n}")
    description_en = "Test category description"
    description_ar = "category-desc-ar"
    slug = factory.Sequence(lambda n: f"category-{n}")
    parent = None
    is_active = True


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product

    name_en = factory.Sequence(lambda n: f"Product {n}")
    name_ar = factory.Sequence(lambda n: f"product-ar-{n}")
    description_en = "Test product description"
    description_ar = "product-desc-ar"
    slug = factory.Sequence(lambda n: f"product-{n}")
    category = factory.SubFactory(CategoryFactory)
    farm_cost = "5.00"
    selling_price = "10.00"
    stock = 100
    low_stock_threshold = 10
    is_active = True
    sku = factory.Sequence(lambda n: f"SKU-{n:04d}")
    is_organic = False


class ProductImageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProductImage

    product = factory.SubFactory(ProductFactory)
    image = factory.django.ImageField(filename="test.jpg", color="green", format="JPEG")
    alt_text = "Test product image"
    sort_order = factory.Sequence(int)
