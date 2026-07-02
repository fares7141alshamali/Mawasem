import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

// ── Token endpoint ─────────────────────────────────────────────────────────────
// Uses a plain axios call (NOT apiClient) so the 401-refresh interceptor in
// client.js never triggers on a wrong-password response.
const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1/';
const TOKEN_URL = `${BASE}auth/token/`;

async function obtainToken({ username, password }) {
  const { data } = await axios.post(TOKEN_URL, { username, password });
  return data; // { access, refresh }
}

// ── EyeIcon ────────────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────
export default function Login() {
  const { login }    = useAuth();
  const { lang }     = useLang();
  const navigate     = useNavigate();

  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const ar = lang === 'ar';

  // ── Mutation ─────────────────────────────────────────────────────────────
  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: obtainToken,
    onSuccess: (tokens) => {
      login(tokens);          // stores in localStorage + updates AuthContext

      // Decode role from the JWT payload so we can redirect before React
      // re-renders with the updated AuthContext (state updates are async).
      let destination = '/';
      try {
        const payload = JSON.parse(
          atob(tokens.access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
        );
        if (payload.role === 'farmer') destination = '/farmer/dashboard';
      } catch { /* malformed token — fall back to home */ }

      navigate(destination, { replace: true });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    reset();                  // clear any previous error before retrying
    mutate({ username, password });
  };

  // ── Error message ─────────────────────────────────────────────────────────
  const errorMsg = (() => {
    if (!error) return null;
    const res = error.response;

    if (!res) {
      return ar
        ? 'تعذّر الاتصال بالخادم. تأكد من تشغيل Django.'
        : 'Cannot reach the server. Make sure Django is running.';
    }
    if (res.status === 401) {
      return ar
        ? 'بيانات الدخول غير صحيحة. يرجى المحاولة مجدداً.'
        : 'Invalid username or password. Please try again.';
    }
    const detail =
      res.data?.detail ??
      res.data?.non_field_errors?.[0] ??
      res.data?.username?.[0] ??
      res.data?.password?.[0];
    if (detail) return detail;
    return ar ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.';
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg">

          {/* Header */}
          <div className="mb-8 text-center">
            <span className="text-5xl">🌿</span>
            <h1 className="mt-4 text-2xl font-bold text-gray-800">
              {ar ? 'مرحباً بعودتك' : 'Welcome back'}
            </h1>
            <p className="mt-1.5 text-sm text-gray-400">
              {ar ? 'سجّل دخولك إلى منصة مواسم' : 'Sign in to your Mawasem account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {ar ? 'اسم المستخدم' : 'Username'}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={ar ? 'أدخل اسم المستخدم' : 'Enter your username'}
                required
                autoComplete="username"
                dir="ltr"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {ar ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={ar ? 'أدخل كلمة المرور' : 'Enter your password'}
                  required
                  autoComplete="current-password"
                  dir="ltr"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 pe-11 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 end-3 flex items-center text-gray-400 transition hover:text-gray-600"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || !username.trim() || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Spinner />}
              {isPending
                ? (ar ? 'جاري تسجيل الدخول…' : 'Signing in…')
                : (ar ? 'تسجيل الدخول' : 'Sign in')}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 space-y-2 text-center text-sm text-gray-400">
            <p>
              <Link to="/forgot-password" className="font-medium text-green-600 transition hover:text-green-700">
                {ar ? 'نسيت كلمة المرور؟' : 'Forgot your password?'}
              </Link>
            </p>
            <p>
              {ar ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
              <Link to="/signup" className="font-medium text-green-600 transition hover:text-green-700">
                {ar ? 'إنشاء حساب' : 'Sign up'}
              </Link>
            </p>
            <p>
              {ar ? 'للعودة إلى المتجر ' : 'Back to the store '}
              <Link to="/" className="font-medium text-green-600 transition hover:text-green-700">
                {ar ? 'تصفّح المنتجات' : 'Browse products'}
              </Link>
            </p>
          </div>
        </div>

        {/* Backend tip — visible only in dev */}
        {import.meta.env.DEV && (
          <p className="mt-4 text-center text-xs text-gray-300">
            Token endpoint: <code className="text-gray-400">{TOKEN_URL}</code>
          </p>
        )}
      </div>
    </div>
  );
}
