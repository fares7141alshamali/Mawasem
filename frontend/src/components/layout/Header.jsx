import { useCallback, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import { useCartCount } from '../../api/hooks/useCart';
import { useLogout } from '../../hooks/useLogout';
import NotificationBell from './NotificationBell';

// ─── Icons ────────────────────────────────────────────────────────────────────
function CartIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}

function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

function SearchIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

// ─── CartBadge ────────────────────────────────────────────────────────────────
function CartBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ─── CartButton ───────────────────────────────────────────────────────────────
function CartButton({ t }) {
  const count = useCartCount();

  return (
    <Link
      to="/cart"
      aria-label={`${t.cart}${count ? ` (${count})` : ''}`}
      className="relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-50 hover:text-green-700"
    >
      <CartIcon className="h-5 w-5" />
      <span className="hidden sm:inline">{t.cart}</span>
      <CartBadge count={count} />
    </Link>
  );
}

// ─── LogoutButton ─────────────────────────────────────────────────────────────
// Uses useLogout so it clears both localStorage and the full React Query cache.
function LogoutButton({ t }) {
  const logout = useLogout();

  return (
    <button
      onClick={logout}
      aria-label={t.logout}
      className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-sm font-medium text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
    >
      <LogoutIcon className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">{t.logout}</span>
    </button>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────
function SearchBar({ t }) {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const q = value.trim();
      if (q) navigate(`/products?search=${encodeURIComponent(q)}`);
    },
    [value, navigate],
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-xl flex-1" role="search">
      <div className="relative">
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.searchPlaceholder}
          dir="auto"
          className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 ps-10 pe-4 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100"
        />
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-gray-400">
          <SearchIcon className="h-4 w-4" />
        </span>
      </div>
    </form>
  );
}

// ─── LangToggle ───────────────────────────────────────────────────────────────
function LangToggle({ lang, toggleLang }) {
  return (
    <button
      onClick={toggleLang}
      aria-label="Switch language"
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-green-400 hover:text-green-700"
    >
      {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  );
}

// ─── navLinkClass ─────────────────────────────────────────────────────────────
// Shared className factory for NavLink — active gets a green pill, inactive fades in on hover.
const navLinkClass = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm transition ${
    isActive
      ? 'bg-green-50 font-semibold text-green-700'
      : 'font-medium text-gray-600 hover:bg-green-50 hover:text-green-700'
  }`;

// ─── Header ───────────────────────────────────────────────────────────────────
export default function Header() {
  const { isAuthenticated, isFarmer } = useAuth();
  const { lang, isRTL, t, toggleLang } = useLang();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2 text-green-700">
          <span className="text-xl">🌿</span>
          <span className="text-lg font-bold tracking-tight">{t.appName}</span>
        </Link>

        {/* Nav links — hidden on mobile */}
        <nav className="hidden items-center gap-1.5 md:flex">
          <NavLink to="/" end className={navLinkClass}>{t.home}</NavLink>
          {isAuthenticated && !isFarmer && (
            <NavLink to="/orders" className={navLinkClass}>{t.myOrders}</NavLink>
          )}
          {isAuthenticated && !isFarmer && (
            <NavLink to="/addresses" className={navLinkClass}>{t.addressBook}</NavLink>
          )}
          {isFarmer && (
            <NavLink
              to="/farmer/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                }`
              }
            >
              <span aria-hidden="true">🌾</span>
              {t.myFarm}
            </NavLink>
          )}
        </nav>

        {/* Search */}
        <SearchBar t={t} isRTL={isRTL} />

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LangToggle lang={lang} toggleLang={toggleLang} />

          {isAuthenticated ? (
            <>
              {/* Divider */}
              <span className="hidden h-5 w-px bg-gray-200 sm:block" aria-hidden="true" />

              {/* Cart — badge updates optimistically on add/remove */}
              <CartButton t={t} />

              {/* Notification bell — role-aware: farmer vs consumer endpoint */}
              <NotificationBell />

              {/* Logout — clears cache + redirects */}
              <LogoutButton t={t} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/signup"
                className="rounded-lg border border-green-600 px-3 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50"
              >
                {t.signup}
              </Link>
              <Link
                to="/login"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                {t.login}
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
