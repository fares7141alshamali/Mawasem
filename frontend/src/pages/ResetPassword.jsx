import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

function PasswordInput({ id, label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 pe-11 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100';
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          dir="ltr"
          autoComplete="new-password"
          className={inputCls}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 end-3 flex items-center text-gray-400 transition hover:text-gray-600"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams]  = useSearchParams();
  const { lang }        = useLang();
  const ar              = lang === 'ar';

  const uid   = searchParams.get('uid')   ?? '';
  const token = searchParams.get('token') ?? '';

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientError,     setClientError]     = useState('');

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: (data) => apiClient.post('/auth/password-reset/confirm/', data),
  });

  const serverErrors = (() => {
    if (!error) return null;
    const d = error.response?.data ?? {};
    return (
      d.uid?.[0] ?? d.token?.[0] ?? d.new_password?.[0] ??
      d.detail ?? d.non_field_errors?.[0] ??
      (error.response
        ? (ar ? 'حدث خطأ. يرجى المحاولة مجدداً.' : 'Something went wrong. Please try again.')
        : (ar ? 'تعذّر الاتصال بالخادم.' : 'Cannot reach the server.'))
    );
  })();

  // Missing params in the URL means the link is broken
  const invalidLink = !uid || !token;

  function handleSubmit(e) {
    e.preventDefault();
    setClientError('');
    if (newPassword !== confirmPassword) {
      setClientError(ar ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }
    mutate({ uid, token, new_password: newPassword });
  }

  if (invalidLink) {
    return (
      <div className="flex min-h-[82vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg text-center">
          <span className="text-5xl">❌</span>
          <h1 className="mt-4 text-xl font-bold text-gray-800">
            {ar ? 'رابط غير صالح' : 'Invalid Link'}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {ar
              ? 'هذا الرابط ليس صحيحاً. يرجى طلب إعادة تعيين كلمة المرور مرة أخرى.'
              : 'This link is not valid. Please request a new password reset.'}
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            {ar ? 'طلب إعادة التعيين' : 'Request Reset'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <span className="text-5xl">🔒</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            {ar ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </h1>
          <p className="mt-1.5 text-sm text-gray-400">
            {ar ? 'اختر كلمة مرور جديدة لحسابك.' : 'Choose a new password for your account.'}
          </p>
        </div>

        {isSuccess ? (
          <div className="rounded-xl bg-green-50 px-5 py-6 text-center">
            <span className="text-4xl">✅</span>
            <p className="mt-3 text-sm font-semibold text-green-800">
              {ar ? 'تم إعادة تعيين كلمة المرور!' : 'Password Reset Successfully!'}
            </p>
            <p className="mt-1.5 text-xs text-green-700">
              {ar ? 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.' : 'You can now sign in with your new password.'}
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              {ar ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <PasswordInput
              id="new_password"
              label={`${ar ? 'كلمة المرور الجديدة' : 'New Password'} *`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={ar ? 'كلمة مرور قوية (8 أحرف+)' : 'Strong password (8+ chars)'}
            />

            <PasswordInput
              id="confirm_password"
              label={`${ar ? 'تأكيد كلمة المرور' : 'Confirm Password'} *`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={ar ? 'أعد إدخال كلمة المرور' : 'Repeat your new password'}
            />

            {(clientError || serverErrors) && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>{clientError || serverErrors}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !newPassword || !confirmPassword}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Spinner />}
              {isPending
                ? (ar ? 'جارٍ الحفظ…' : 'Saving…')
                : (ar ? 'تعيين كلمة المرور الجديدة' : 'Set New Password')}
            </button>

            <p className="text-center text-sm text-gray-400">
              <Link to="/forgot-password" className="font-medium text-green-600 hover:text-green-700">
                {ar ? 'طلب رابط جديد' : 'Request a new link'}
              </Link>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
