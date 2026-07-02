import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext';
import apiClient from '../api/client';

export default function VerifyEmail() {
  const [searchParams]           = useSearchParams();
  const { lang }                 = useLang();
  const ar                       = lang === 'ar';
  const [phase, setPhase]        = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg]  = useState('');
  const didRun                   = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const uid   = searchParams.get('uid');
    const token = searchParams.get('token');

    if (!uid || !token) {
      setPhase('error');
      setErrorMsg(ar ? 'رابط التحقق غير مكتمل.' : 'Incomplete verification link.');
      return;
    }

    apiClient
      .post('/auth/verify-email/', { uid, token })
      .then(() => setPhase('success'))
      .catch((err) => {
        setPhase('error');
        const d = err.response?.data ?? {};
        setErrorMsg(
          d.uid?.[0] ?? d.token?.[0] ?? d.detail ??
          (ar ? 'رابط غير صالح أو منتهي الصلاحية.' : 'Invalid or expired verification link.'),
        );
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg text-center">

        {phase === 'loading' && (
          <>
            <svg className="mx-auto h-10 w-10 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="mt-4 text-sm text-gray-500">
              {ar ? 'جارٍ التحقق من بريدك الإلكتروني…' : 'Verifying your email address…'}
            </p>
          </>
        )}

        {phase === 'success' && (
          <>
            <span className="text-5xl">✅</span>
            <h1 className="mt-4 text-xl font-bold text-gray-800">
              {ar ? 'تم التحقق بنجاح!' : 'Email Verified!'}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {ar
                ? 'تم تفعيل حسابك. يمكنك الآن تسجيل الدخول.'
                : 'Your account is now active. You can sign in.'}
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              {ar ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          </>
        )}

        {phase === 'error' && (
          <>
            <span className="text-5xl">❌</span>
            <h1 className="mt-4 text-xl font-bold text-gray-800">
              {ar ? 'تعذّر التحقق' : 'Verification Failed'}
            </h1>
            <p className="mt-2 text-sm text-red-500">{errorMsg}</p>
            <p className="mt-4 text-sm text-gray-400">
              {ar
                ? 'قد تكون صلاحية الرابط قد انتهت. حاول التسجيل مجدداً.'
                : 'The link may have expired. Try signing up again.'}
            </p>
            <Link
              to="/signup"
              className="mt-6 inline-block rounded-lg border border-green-600 px-6 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50"
            >
              {ar ? 'إنشاء حساب جديد' : 'Create a New Account'}
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
