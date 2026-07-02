import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useLang } from '../contexts/LanguageContext';
import apiClient from '../api/client';

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function ForgotPassword() {
  const { lang } = useLang();
  const ar       = lang === 'ar';
  const [email, setEmail] = useState('');

  const { mutate, isPending, isSuccess, isError, error } = useMutation({
    mutationFn: (data) => apiClient.post('/auth/password-reset/', data),
  });

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100';

  function handleSubmit(e) {
    e.preventDefault();
    mutate({ email });
  }

  const networkError = isError && !error?.response
    ? (ar ? 'تعذّر الاتصال بالخادم.' : 'Cannot reach the server. Make sure Django is running.')
    : null;

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <span className="text-5xl">🔑</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            {ar ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
          </h1>
          <p className="mt-1.5 text-sm text-gray-400">
            {ar
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.'
              : 'Enter your email and we\'ll send you a reset link.'}
          </p>
        </div>

        {isSuccess ? (
          <div className="rounded-xl bg-green-50 px-5 py-6 text-center">
            <span className="text-4xl">📬</span>
            <p className="mt-3 text-sm font-semibold text-green-800">
              {ar ? 'تحقق من بريدك الإلكتروني' : 'Check your inbox'}
            </p>
            <p className="mt-1.5 text-xs text-green-700">
              {ar
                ? 'إذا كان البريد الإلكتروني مرتبطاً بحساب، ستتلقى رابط إعادة التعيين قريباً.'
                : 'If that email is linked to an account, you\'ll receive a reset link shortly.'}
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block text-sm font-medium text-green-600 hover:text-green-700"
            >
              ← {ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                {ar ? 'البريد الإلكتروني' : 'Email address'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                dir="ltr"
                className={inputCls}
              />
            </div>

            {networkError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>{networkError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Spinner />}
              {isPending
                ? (ar ? 'جارٍ الإرسال…' : 'Sending…')
                : (ar ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link')}
            </button>

            <p className="text-center text-sm text-gray-400">
              <Link to="/login" className="font-medium text-green-600 hover:text-green-700">
                ← {ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
              </Link>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
