# Mawasem — Full Build History

> **مواسم** — A farm-to-consumer marketplace connecting local farmers directly with buyers.
> Django 6 + DRF backend · React 18 + Vite frontend · JWT auth · Arabic/English RTL support

---

## Table of Contents

1. [Phase 1 — Project Bootstrap](#phase-1--project-bootstrap)
2. [Phase 2 — Product Catalog](#phase-2--product-catalog)
3. [Phase 3 — Shopping Cart](#phase-3--shopping-cart)
4. [Phase 4 — Order System & Checkout](#phase-4--order-system--checkout)
5. [Phase 5 — Farmer Dashboard](#phase-5--farmer-dashboard)
6. [Phase 6 — Bug Fixes](#phase-6--bug-fixes)
7. [Phase 7 — Role-Based User System](#phase-7--role-based-user-system)
8. [Phase 8 — Stock Management](#phase-8--stock-management)
9. [API Reference](#api-reference)
10. [Architecture Decisions](#architecture-decisions)
11. [Known Patterns & Conventions](#known-patterns--conventions)

---

## Phase 1 — Project Bootstrap

### What was built
- Django project skeleton with a split settings layout (`core/settings/base.py`)
- Custom `User` model extending `AbstractUser` (required before the first migration)
- DRF installed and configured with `rest_framework_simplejwt`
- `GET /api/v1/health/` endpoint for uptime checks
- CORS configured to allow the Vite dev server (`localhost:5173`)
- SQLite default database; PostgreSQL available via `USE_POSTGRES=true` env var

### Key files
| File | Purpose |
|------|---------|
| `core/settings/base.py` | Single source of truth for all settings |
| `apps/users/models.py` | Custom `User` (initially had `phone_number`, `address`, `is_consumer`) |
| `core/views.py` | `health_check` view |

---

## Phase 2 — Product Catalog

### What was built

#### Models (`apps/products/models.py`)
- **`Category`** — hierarchical (self-referencing FK for parent/children), bilingual `name_en`/`name_ar`, `slug`, optional `image`, `is_active`
- **`Product`** — bilingual names/descriptions, `slug` (unique), `selling_price`, `farm_cost` (internal — never exposed in public API), `discount_price`, `stock`, `low_stock_threshold`, `is_organic`, `is_active`, FK to `Category` and `Farmer`
- **`ProductImage`** — multiple images per product with `sort_order`
- Computed properties: `current_price` (uses discount when active), `is_in_stock`, `is_low_stock`, `gross_profit`, `margin`

#### API endpoints
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/categories/` | Flat list of top-level categories with nested children and `product_count` |
| GET | `/api/v1/products/` | Paginated product list (20/page) |
| GET | `/api/v1/products/{slug}/` | Single product detail |

#### Filtering & search
- `?min_price=` / `?max_price=` — price range
- `?category={slug}` — filters by subcategory; fans out to all children when given a top-level slug
- `?search={term}` — case-insensitive match on `name_en` and `name_ar`
- `?ordering=selling_price` / `?ordering=-stock` — user-controlled sort

#### Performance
- Category list: 2 queries (parent + prefetched children with annotated `product_count`)
- Product list: 3 queries max regardless of page size (COUNT + JOIN SELECT + image prefetch)
- `farm_cost` is excluded from all serializers so internal cost data is never exposed

#### Serializers
- `ProductListSerializer` — compact list view (thumbnail via `main_image` SerializerMethodField)
- `ProductDetailSerializer` — full detail with all images
- `CategorySerializer` — nested children via `FarmerNestedSerializer`-style approach

### Key design decision
`farm_cost` is stored on the model but never included in any public serializer field list. The dashboard's write serializer also excludes it from read responses.

---

## Phase 3 — Shopping Cart

### What was built

#### Models (`apps/carts/models.py`)
- **`Cart`** — one per user (`OneToOneField`), computed `total_price` property
- **`CartItem`** — product + quantity + `total_price` property; unique constraint on `(cart, product)`

#### API endpoints
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/cart/` | Retrieve current user's cart with all items |
| POST | `/api/v1/cart/items/` | Add item to cart (creates cart if needed) |
| PATCH | `/api/v1/cart/items/{id}/` | Update quantity |
| DELETE | `/api/v1/cart/items/{id}/` | Remove item |
| DELETE | `/api/v1/cart/` | Clear entire cart |

#### Frontend (`frontend/src/pages/Cart.jsx`)
- Displays all cart items from the `['cart', 'detail']` query key
- Quantity stepper with **optimistic updates** — UI updates instantly, rolls back on error
- `useRemoveCartItem` — removes item from cache array, updates `item_count` and `total_price` without waiting for refetch
- Shipping address textarea with minimum-length validation (10 chars)
- Checkout button triggers `POST /api/v1/orders/checkout/`
- `OrderSuccess` screen shown after a confirmed order (displays order ID and total)
- `CartSkeleton` loading state with animated pulse

#### React Query hooks (`frontend/src/api/hooks/useCart.js`)
```
useCart()           — GET /api/v1/cart/
useCartCount()      — derived count for the header badge
useAddToCart()      — POST /api/v1/cart/items/
useUpdateCartItem() — PATCH with full optimistic update
useRemoveCartItem() — DELETE with optimistic removal
useClearCart()      — DELETE /api/v1/cart/
```

---

## Phase 4 — Order System & Checkout

### What was built

#### Models (`apps/orders/models.py`)
- **`Order`** — `user`, `status` (TextChoices: `pending/processing/shipped/completed/cancelled`), `total_price` (snapshotted at checkout), `shipping_address`
- **`OrderItem`** — `order`, `product`, `quantity`, `price` (unit price captured at checkout — never changes when product price changes later)
- **`OrderStatusHistory`** — immutable audit log; one row per status transition; `changed_by` nullable (NULL for system transitions)

#### Checkout logic (`apps/orders/serializers.py` — `OrderCheckoutSerializer`)
The checkout is a single `transaction.atomic()` block that:
1. Prefetches cart + items
2. First-pass stock check (fast, before locking)
3. `SELECT FOR UPDATE` on all product rows (PostgreSQL) to prevent overselling under concurrent requests; falls back to plain read on SQLite
4. Second-pass stock check under lock
5. Snapshots `current_price` into `OrderItem.price` so future price edits don't alter history
6. Deducts stock via `F('stock') - quantity` (atomic, no read-modify-write race)
7. Clears the cart
8. The `post_save` signal automatically writes the initial `OrderStatusHistory` row

#### Signal-based audit log (`apps/orders/signals.py`)
Two cooperating signals on `Order`:
- `order_pre_save` — snapshots `instance._pre_save_status` from the DB before the write
- `order_post_save` — compares old vs new status; writes `OrderStatusHistory` only when status actually changed (or on creation)

**Attribution pattern:** callers set `order._changed_by = request.user` before `order.save()`. The signal reads this transient attribute, writes it to the history row, then removes it from the instance dict.

---

## Phase 5 — Farmer Dashboard

### What was built

#### New backend app structure (`apps/farmers/`)
Previously only had the public `FarmerViewSet`. Added three private dashboard viewsets behind `IsFarmerUser` permission:

**`FarmerMeView`** — `GET/PATCH /api/v1/farmer/me/`
- Returns and updates the authenticated farmer's own profile

**`FarmerProductViewSet`** — `GET/POST/PATCH /api/v1/farmer/products/{id}/`
- Lists all products owned by this farmer (including stock, `is_low_stock`, `is_active`)
- `pagination_class = None` — full list needed for the dashboard to compute stats without extra requests
- Create/update return a read-serialized response (so `main_image`, `is_low_stock` etc. are populated immediately)
- Write serializer auto-generates a unique slug from `name_en`
- Accepts optional `image` file via `FormData` — creates a `ProductImage` row

**`FarmerOrderViewSet`** — `GET /api/v1/farmer/orders/`, `PATCH /api/v1/farmer/orders/{id}/status/`
- Lists orders containing at least one of this farmer's products
- `pagination_class = None`
- `update_status` action validates the state machine transition, sets `_changed_by`, saves

#### State machine (`FarmerOrderStatusSerializer`)
```
pending → processing | cancelled
processing → shipped | cancelled
shipped → completed
completed → (terminal)
cancelled → (terminal)
```

#### New serializers
- `FarmerProductReadSerializer` — extends `ProductListSerializer`, adds `stock`, `is_low_stock`, `is_active`
- `FarmerProductWriteSerializer` — slug auto-generation, optional image upload, discount < selling_price validation
- `FarmerOrderStatusSerializer` — validates transitions, rejects invalid moves with a clear error message

#### Frontend (`frontend/src/pages/farmer/Dashboard.jsx`)
Components built:
- `FarmerGuard` (named export) — guards the route; redirects to `/login` if not authenticated, `/` if not a farmer
- `StatCard` — active products, out-of-stock count, pending orders
- `ProductRow` — thumbnail, bilingual name, price with strikethrough, colour-coded stock (red/amber/green), inline active toggle
- `StockEditor` — inline number input + Save button; Enter key saves; only shows Save when value is dirty
- `OrderCard` — order summary with status badge and shipping address preview
- `OrderStatusControl` — dropdown showing only valid next states per the state machine
- `AddProductModal` — full form with bilingual name/description, price fields, category select, image upload, organic checkbox

#### React Query hooks (`frontend/src/api/hooks/useFarmer.js`)
```
useMyFarmerProfile()    — GET /api/v1/farmer/me/   (retry: false — 403 is not an error)
useFarmerProducts()     — GET /api/v1/farmer/products/
useAddProduct()         — POST (FormData for image upload)
useUpdateProduct()      — PATCH (stock, price, is_active)
useFarmerOrders()       — GET /api/v1/farmer/orders/   (refetchOnWindowFocus: true)
useUpdateOrderStatus()  — PATCH /api/v1/farmer/orders/{id}/status/
```

All list hooks have a defensive unwrap:
```js
return Array.isArray(d) ? d : (d.results ?? []);
```
This guards against the global `PageNumberPagination` wrapping the response if `pagination_class = None` is ever removed.

---

## Phase 6 — Bug Fixes

### Bug 1 — Django Admin crash: `TypeError: %d format: a real number is required, not dict`

**Location:** `/admin/products/product/`

**Root cause:** Django's `get_action_choices()` runs every action description string through Python's `%` string formatting with the model's `format_dict` as the argument. The string `"Apply 10% discount"` contains `% d` (percent + space + `d`) which Python's `%` operator interprets as the `%d` integer format specifier. Passing a dict to `%d` raises `TypeError`.

**Fix:** Escaped the percent sign in `apps/products/admin.py`:
```python
# Before
@admin.action(description="Apply 10% discount to selected products")

# After
@admin.action(description="Apply 10%% discount to selected products")
# %% → literal % after Django's formatting pass
```

---

### Bug 2 — Blank white page at `/farmer/dashboard`

**Root cause (two layers):**

1. **Backend:** `core/settings/base.py` sets `DEFAULT_PAGINATION_CLASS = PageNumberPagination` globally. `FarmerProductViewSet` and `FarmerOrderViewSet` did not set `pagination_class = None`, so they returned `{count, next, previous, results: [...]}` instead of a plain array.

2. **Frontend:** `Dashboard.jsx` called `products.filter(...)` directly on the response. When the response was a pagination envelope (not an array), this threw `TypeError: products.filter is not a function`. With no React error boundary, the entire tree unmounted, leaving a blank white page with no visible error.

**Fixes:**
- Backend: Added `pagination_class = None` to both `FarmerProductViewSet` and `FarmerOrderViewSet`
- Frontend: Added defensive unwrap in `useFarmerProducts` and `useFarmerOrders`:
  ```js
  return Array.isArray(d) ? d : (d.results ?? []);
  ```

---

## Phase 7 — Role-Based User System

### Goal
Farmers sign up through a separate flow (like a rider in a delivery app), providing their farm details upfront. Three roles exist: `consumer`, `farmer`, `admin`. The JWT embeds the role so the frontend never needs a separate API call to know who is logged in.

### Backend changes

#### `apps/users/models.py`
Replaced the boolean `is_consumer` field with a `Role` TextChoices field:
```python
class Role(models.TextChoices):
    ADMIN    = 'admin',    _('Admin')
    FARMER   = 'farmer',   _('Farmer')
    CONSUMER = 'consumer', _('Consumer')

role = models.CharField(max_length=10, choices=Role.choices, default=Role.CONSUMER, db_index=True)
```

#### `apps/users/migrations/0002_user_role.py`
Single migration that:
1. Adds the `role` field (default `consumer`)
2. Data-migrates existing users — users with a `farmer_profile` FK get `role='farmer'`, superusers get `role='admin'`
3. Removes the old `is_consumer` field

#### `apps/farmers/models.py`
Added `city = CharField(max_length=100, blank=True)` — required during farmer sign-up so buyers know where produce comes from.

#### `apps/users/serializers.py` (new file)

**`MawasemTokenObtainPairSerializer`**
Subclasses `TokenObtainPairSerializer` to embed `role` and `display_name` into every JWT:
```python
@classmethod
def get_token(cls, user):
    token = super().get_token(user)
    token['role']         = user.role
    token['display_name'] = user.get_full_name() or user.username
    return token
```

**`ConsumerRegisterSerializer`** — ModelSerializer for `User`; validates unique username/email, confirms passwords match, calls `user.set_password()`.

**`FarmerRegisterSerializer`** — plain `Serializer` (not ModelSerializer) to cleanly handle the split User + Farmer profile creation. Wrapped in `@transaction.atomic` — if Farmer profile creation fails, the User row is rolled back.

#### `apps/users/views.py` (new file)
- `MawasemTokenObtainPairView` — replaces the default `TokenObtainPairView`
- `ConsumerRegisterView` — creates user, returns `{access, refresh}` with HTTP 201
- `FarmerRegisterView` — creates user + farmer profile, returns `{access, refresh}` with HTTP 201

#### `apps/users/urls.py` (new file)
```
POST  /api/v1/auth/token/              login (custom JWT with role)
POST  /api/v1/auth/register/consumer/  consumer sign-up
POST  /api/v1/auth/register/farmer/    farmer sign-up
```

#### `apps/farmers/permissions.py`
`IsFarmerUser` updated to check `user.role == 'farmer'` instead of `hasattr(user, 'farmer_profile')`. This is faster (no DB hit) and more explicit.

### Frontend changes

#### `frontend/src/contexts/AuthContext.jsx`
JWT payload decoded client-side using `atob()` — no library needed since JWTs are plain base64 JSON:
```js
function decodeJwt(token) {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}
```
Context now exposes: `isAuthenticated`, `role`, `isFarmer`, `isAdmin`, `login`, `logout`.

#### `frontend/src/pages/auth/SignUp.jsx` (new file)
Three-component flow:
1. **`RoleSelection`** — two cards ("Consumer 🛒" / "Farmer 🌾") to choose role
2. **`ConsumerForm`** — username, email, phone (optional), password + confirm
3. **`FarmerForm`** — all consumer fields + farm name, city (required), bio (optional)

On success, tokens are stored and the user is navigated to `/` (consumer) or `/farmer/dashboard` (farmer).

#### `FarmerGuard` (in `Dashboard.jsx`)
Simplified from an API-based check to a pure in-memory check:
```jsx
// Before: awaited useMyFarmerProfile() — extra API call + loading spinner
// After: instant, no network
export function FarmerGuard({ children }) {
  const { isAuthenticated, isFarmer } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isFarmer)        return <Navigate to="/"      replace />;
  return children;
}
```

#### `Header.jsx`
- Removed `useMyFarmerProfile()` import — "My Farm" nav link now reads `isFarmer` from `useAuth()`
- Added "Sign Up" button for unauthenticated users alongside the existing "Login" button

#### `App.jsx`
Added `/signup` route pointing to the new `SignUp` page.

#### `Login.jsx`
Added "Don't have an account? Sign up" footer link.

---

## Phase 8 — Stock Management

### Goal
Stock should automatically decrease when a consumer places an order and be restored if the order is later cancelled by the farmer.

### How it works

#### On checkout (was already implemented in Phase 4)
Inside the `transaction.atomic()` block in `OrderCheckoutSerializer.create()`:
```python
for item in cart_items:
    Product.objects.filter(pk=item.product_id).update(
        stock=F("stock") - item.quantity
    )
```
`F()` expressions ensure no read-modify-write race condition. The `SELECT FOR UPDATE` lock above this block prevents overselling under concurrent requests on PostgreSQL.

#### On cancellation (new — Phase 8)
Added to `order_post_save` signal in `apps/orders/signals.py`:
```python
if status_changed and instance.status == Order.Status.CANCELLED:
    items = OrderItem.objects.filter(order_id=instance.pk).values("product_id", "quantity")
    for item in items:
        Product.objects.filter(pk=item["product_id"]).update(
            stock=F("stock") + item["quantity"]
        )
```

**Guard:** `status_changed` ensures this only fires on the *transition into* `cancelled`, not on every subsequent save of a cancelled order. Double-restoration is impossible by design.

**Atomicity:** `FarmerOrderViewSet.update_status` now wraps `order.save()` in `transaction.atomic()`. The signal fires within this transaction, so the status change and stock restoration either both commit or both roll back.

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/token/` | — | Login → `{access, refresh}` with `role` claim |
| POST | `/api/v1/auth/token/refresh/` | — | Refresh access token |
| POST | `/api/v1/auth/register/consumer/` | — | Sign up as consumer → `{access, refresh}` |
| POST | `/api/v1/auth/register/farmer/` | — | Sign up as farmer (creates User + Farmer profile) → `{access, refresh}` |

### Public Catalog
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/categories/` | — | All top-level categories with nested children and product counts |
| GET | `/api/v1/products/` | — | Paginated products (20/page); supports `?search`, `?category`, `?min_price`, `?max_price`, `?ordering` |
| GET | `/api/v1/products/{slug}/` | — | Single product detail with all images |

### Public Farmer Profiles
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/farmers/` | — | List all farmer profiles |
| POST | `/api/v1/farmers/` | Required | Create a farmer profile |
| GET | `/api/v1/farmers/{id}/` | — | Farmer detail with active products |
| PATCH | `/api/v1/farmers/{id}/` | Owner | Update own profile |
| DELETE | `/api/v1/farmers/{id}/` | Owner | Delete own profile |

### Cart
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/cart/` | Required | Current cart with items and totals |
| DELETE | `/api/v1/cart/` | Required | Clear entire cart |
| POST | `/api/v1/cart/items/` | Required | Add item (creates cart if needed) |
| PATCH | `/api/v1/cart/items/{id}/` | Required | Update quantity |
| DELETE | `/api/v1/cart/items/{id}/` | Required | Remove item |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/orders/` | Required | Paginated order history with status timeline |
| POST | `/api/v1/orders/checkout/` | Required | Convert cart → order (atomic, deducts stock) |

### Farmer Dashboard (role: farmer)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/farmer/me/` | Farmer | Own profile |
| PATCH | `/api/v1/farmer/me/` | Farmer | Update own profile |
| GET | `/api/v1/farmer/products/` | Farmer | All own products (unpaginated) |
| POST | `/api/v1/farmer/products/` | Farmer | Create product (FormData, optional image) |
| PATCH | `/api/v1/farmer/products/{id}/` | Farmer | Update stock / price / active status |
| GET | `/api/v1/farmer/orders/` | Farmer | Orders containing own products (unpaginated) |
| PATCH | `/api/v1/farmer/orders/{id}/status/` | Farmer | Advance order status (state machine validated) |

---

## Architecture Decisions

### Global pagination opt-out pattern
`core/settings/base.py` sets `DEFAULT_PAGINATION_CLASS = PageNumberPagination` (PAGE_SIZE=20) globally. Any ViewSet that needs an unpaginated response sets `pagination_class = None` at the class level. Currently used by:
- `CategoryViewSet` — flat list; frontend needs all categories at once
- `FarmerProductViewSet` — full list needed to compute stats
- `FarmerOrderViewSet` — full stream for the orders panel

The defensive `.results` unwrap in React hooks guards against this ever being removed accidentally.

### JWT role embedding
The role lives in the JWT payload so the frontend can make role-based decisions (show/hide UI, guard routes) without an additional API call. Decoded via `atob()` — no extra library.

### Stock concurrency
- **Checkout:** `SELECT FOR UPDATE` (PostgreSQL) + double-checked stock validation + `F()` expression update
- **Cancellation:** `F('stock') + quantity` — atomic increment; the state machine prevents double-cancellation so double-restoration is impossible

### Signal-based audit + side effects
All `Order` side effects (status history, stock restoration) live in signals rather than views. This means they fire regardless of whether the change comes from the API, Django Admin, or a management command.

### Transient instance attributes
The pattern `order._changed_by = user` before `order.save()` passes context to signals without adding model fields or extra queries. The signal handler reads the attribute then deletes it from `instance.__dict__` to prevent accidental persistence.

### Bilingual content strategy
All user-facing text fields come in `_en` / `_ar` pairs. The frontend reads `lang` from `LanguageContext` and selects the appropriate field. The `dir` attribute on the `<html>` element is updated reactively, giving full browser-level RTL support.

---

## Known Patterns & Conventions

| Pattern | Location | Reason |
|---------|----------|--------|
| `pagination_class = None` | Dashboard ViewSets | Opt out of global PageNumberPagination |
| `_pre_save_status` transient attribute | `order_pre_save` signal | Detect status change without an extra query in post_save |
| `_changed_by` / `_status_notes` | `FarmerOrderViewSet.update_status` | Pass attribution context to signals cleanly |
| `F('stock') - quantity` | Checkout serializer | Atomic stock deduction with no read-modify-write race |
| `retry: false` on `useMyFarmerProfile` | `useFarmer.js` | 403 from `/farmer/me/` is expected for non-farmers; don't hammer the server |
| `%%` in admin action descriptions | `products/admin.py` | Django's `get_action_choices` runs descriptions through `%` formatting — `%%` → literal `%` |
| `transaction.atomic()` on status update | `FarmerOrderViewSet` | Ensures status save and stock restoration in signals are one atomic unit |
