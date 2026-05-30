from django.test import TestCase

from apps.products.models import Product


class ProductPricingTests(TestCase):
    def make_product(self, selling_price, farm_cost, discount_price=None):
        return Product(
            name_en="Test",
            name_ar="test-ar",
            description_en="",
            description_ar="",
            slug="test",
            selling_price=selling_price,
            farm_cost=farm_cost,
            discount_price=discount_price,
        )

    def test_current_price_without_discount(self):
        p = self.make_product(100, 60)
        assert p.current_price == 100

    def test_current_price_with_valid_discount(self):
        p = self.make_product(100, 60, discount_price=80)
        assert p.current_price == 80

    def test_current_price_discount_higher_than_selling(self):
        p = self.make_product(100, 60, discount_price=120)
        assert p.current_price == 100

    def test_margin(self):
        p = self.make_product(100, 60)
        assert p.margin == 40.0

    def test_is_low_stock(self):
        p = self.make_product(100, 60)
        p.stock = 5
        p.low_stock_threshold = 10
        assert p.is_low_stock is True
