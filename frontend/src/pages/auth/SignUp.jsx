import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

import { useLang } from '../../contexts/LanguageContext';
import { JORDAN_CITIES } from '../../constants/jordanCities';

const BASE      = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1/';
const CONSUMER_URL = `${BASE}auth/register/consumer/`;
const FARMER_URL   = `${BASE}auth/register/farmer/`;

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── EyeIcon ──────────────────────────────────────────────────────────────────
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

// ─── RoleSelection ────────────────────────────────────────────────────────────
function RoleSelection({ ar, onSelect }) {
  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg text-center">
          <span className="text-5xl">🌿</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            {ar ? 'أنشئ حسابك' : 'Create your account'}
          </h1>
          <p className="mt-1.5 text-sm text-gray-400">
            {ar ? 'اختر نوع حسابك للمتابعة' : 'Choose your account type to get started'}
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Consumer card */}
            <button
              onClick={() => onSelect('consumer')}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gray-100 bg-gray-50 p-6 transition hover:border-green-400 hover:bg-green-50 group"
            >
              <span className="text-4xl">🛒</span>
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-green-700">
                  {ar ? 'مستهلك' : 'Consumer'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {ar ? 'تسوّق المنتجات الطازجة' : 'Shop fresh local produce'}
                </p>
              </div>
            </button>

            {/* Farmer card */}
            <button
              onClick={() => onSelect('farmer')}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gray-100 bg-gray-50 p-6 transition hover:border-green-400 hover:bg-green-50 group"
            >
              <span className="text-4xl">🌾</span>
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-green-700">
                  {ar ? 'مزارع' : 'Farmer'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {ar ? 'بع محاصيلك مباشرةً' : 'Sell your crops directly'}
                </p>
              </div>
            </button>
          </div>

          <p className="mt-8 text-sm text-gray-400">
            {ar ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
            <Link to="/login" className="font-medium text-green-600 hover:text-green-700">
              {ar ? 'تسجيل الدخول' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── PasswordInput ────────────────────────────────────────────────────────────
function PasswordInput({ id, label, value, onChange, placeholder, autoComplete, inputCls }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
          dir="ltr"
          className={`${inputCls} pe-11`}
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

// ─── ConsumerForm ─────────────────────────────────────────────────────────────
function ConsumerForm({ ar, onBack }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '', phone_number: '' });
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100';

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => axios.post(CONSUMER_URL, data).then((r) => r.data),
    onSuccess: () => setEmailSent(true),
    onError: (err) => {
      const d = err.response?.data ?? {};
      setError(
        d.username?.[0] ?? d.email?.[0] ?? d.password?.[0] ?? d.password2?.[0] ??
        d.non_field_errors?.[0] ?? d.detail ??
        (ar ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.')
      );
    },
  });

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.password2) {
      setError(ar ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }
    mutate(form);
  }

  if (emailSent) {
    return (
      <div className="rounded-xl bg-green-50 px-5 py-8 text-center">
        <span className="text-4xl">📬</span>
        <p className="mt-3 text-sm font-semibold text-green-800">
          {ar ? 'تحقق من بريدك الإلكتروني' : 'Check your inbox'}
        </p>
        <p className="mt-2 text-xs text-green-700 leading-relaxed">
          {ar
            ? `أرسلنا رابط التحقق إلى ${form.email}. انقر فوق الرابط لتفعيل حسابك.`
            : `We sent a verification link to ${form.email}. Click it to activate your account.`}
        </p>
        <Link
          to="/login"
          className="mt-5 inline-block text-sm font-medium text-green-600 hover:text-green-700"
        >
          {ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-gray-700">
          {ar ? 'اسم المستخدم' : 'Username'} *
        </label>
        <input id="username" name="username" type="text" required dir="ltr"
          value={form.username} onChange={handleChange} autoComplete="username"
          placeholder={ar ? 'أدخل اسم المستخدم' : 'Choose a username'}
          className={inputCls} />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
          {ar ? 'البريد الإلكتروني' : 'Email'} *
        </label>
        <input id="email" name="email" type="email" required dir="ltr"
          value={form.email} onChange={handleChange} autoComplete="email"
          placeholder={ar ? 'أدخل بريدك الإلكتروني' : 'your@email.com'}
          className={inputCls} />
      </div>

      <div>
        <label htmlFor="phone_number" className="mb-1.5 block text-sm font-medium text-gray-700">
          {ar ? 'رقم الهاتف' : 'Phone'} ({ar ? 'اختياري' : 'optional'})
        </label>
        <input id="phone_number" name="phone_number" type="tel" dir="ltr"
          value={form.phone_number} onChange={handleChange} autoComplete="tel"
          placeholder={ar ? '+966…' : '+966…'}
          className={inputCls} />
      </div>

      <PasswordInput id="password" label={`${ar ? 'كلمة المرور' : 'Password'} *`}
        value={form.password} onChange={handleChange} inputCls={inputCls}
        placeholder={ar ? 'كلمة مرور قوية (8 أحرف+)' : 'Strong password (8+ chars)'}
        autoComplete="new-password" />

      <PasswordInput id="password2" label={`${ar ? 'تأكيد كلمة المرور' : 'Confirm Password'} *`}
        value={form.password2} onChange={handleChange} inputCls={inputCls}
        placeholder={ar ? 'أعد إدخال كلمة المرور' : 'Repeat your password'}
        autoComplete="new-password" />

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
          {ar ? 'رجوع' : 'Back'}
        </button>
        <button type="submit" disabled={isPending || !form.username || !form.email || !form.password || !form.password2}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
          {isPending && <Spinner />}
          {isPending ? (ar ? 'جاري الإنشاء…' : 'Creating…') : (ar ? 'إنشاء الحساب' : 'Create Account')}
        </button>
      </div>
    </form>
  );
}

// ─── FarmerForm ───────────────────────────────────────────────────────────────
function FarmerForm({ ar, onBack }) {
  const [form, setForm] = useState({
    username: '', email: '', password: '', password2: '',
    phone_number: '', farm_name: '', city: '', bio: '',
  });
  const [error, setError]       = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100';

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => axios.post(FARMER_URL, data).then((r) => r.data),
    onSuccess: () => setEmailSent(true),
    onError: (err) => {
      const d = err.response?.data ?? {};
      setError(
        d.username?.[0] ?? d.email?.[0] ?? d.farm_name?.[0] ?? d.city?.[0] ??
        d.password?.[0] ?? d.password2?.[0] ?? d.non_field_errors?.[0] ?? d.detail ??
        (ar ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.')
      );
    },
  });

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.password2) {
      setError(ar ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }
    mutate(form);
  }

  const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700';

  if (emailSent) {
    return (
      <div className="rounded-xl bg-green-50 px-5 py-8 text-center">
        <span className="text-4xl">📬</span>
        <p className="mt-3 text-sm font-semibold text-green-800">
          {ar ? 'تحقق من بريدك الإلكتروني' : 'Check your inbox'}
        </p>
        <p className="mt-2 text-xs text-green-700 leading-relaxed">
          {ar
            ? `أرسلنا رابط التحقق إلى ${form.email}. انقر فوق الرابط لتفعيل حسابك.`
            : `We sent a verification link to ${form.email}. Click it to activate your account.`}
        </p>
        <Link
          to="/login"
          className="mt-5 inline-block text-sm font-medium text-green-600 hover:text-green-700"
        >
          {ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Account info */}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {ar ? 'معلومات الحساب' : 'Account info'}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="username" className={labelCls}>{ar ? 'اسم المستخدم' : 'Username'} *</label>
          <input id="username" name="username" type="text" required dir="ltr"
            value={form.username} onChange={handleChange} autoComplete="username"
            placeholder={ar ? 'اسم المستخدم' : 'username'}
            className={inputCls} />
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>{ar ? 'البريد الإلكتروني' : 'Email'} *</label>
          <input id="email" name="email" type="email" required dir="ltr"
            value={form.email} onChange={handleChange} autoComplete="email"
            placeholder="farmer@example.com"
            className={inputCls} />
        </div>
      </div>

      <PasswordInput id="password" label={`${ar ? 'كلمة المرور' : 'Password'} *`}
        value={form.password} onChange={handleChange} inputCls={inputCls}
        placeholder={ar ? 'كلمة مرور قوية (8 أحرف+)' : 'Strong password (8+ chars)'}
        autoComplete="new-password" />

      <PasswordInput id="password2" label={`${ar ? 'تأكيد كلمة المرور' : 'Confirm Password'} *`}
        value={form.password2} onChange={handleChange} inputCls={inputCls}
        placeholder={ar ? 'أعد إدخال كلمة المرور' : 'Repeat your password'}
        autoComplete="new-password" />

      {/* Farm info */}
      <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {ar ? 'معلومات المزرعة' : 'Farm info'}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="farm_name" className={labelCls}>{ar ? 'اسم المزرعة' : 'Farm Name'} *</label>
          <input id="farm_name" name="farm_name" type="text" required
            value={form.farm_name} onChange={handleChange}
            placeholder={ar ? 'مثال: مزرعة النور' : 'e.g. Sunrise Farm'}
            className={inputCls} />
        </div>
        <div>
          <label htmlFor="city" className={labelCls}>{ar ? 'المدينة' : 'City'} *</label>
          <select id="city" name="city" required
            value={form.city} onChange={handleChange}
            className={`${inputCls} bg-white`}>
            <option value="">{ar ? 'اختر مدينة…' : 'Select city…'}</option>
            {JORDAN_CITIES.map((c) => (
              <option key={c.en} value={c.en}>
                {ar ? `${c.ar} — ${c.en}` : `${c.en} — ${c.ar}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="phone_number" className={labelCls}>
          {ar ? 'رقم الهاتف' : 'Phone'} ({ar ? 'اختياري' : 'optional'})
        </label>
        <input id="phone_number" name="phone_number" type="tel" dir="ltr"
          value={form.phone_number} onChange={handleChange} autoComplete="tel"
          placeholder="+966…"
          className={inputCls} />
      </div>

      <div>
        <label htmlFor="bio" className={labelCls}>
          {ar ? 'نبذة عن المزرعة' : 'About your farm'} ({ar ? 'اختياري' : 'optional'})
        </label>
        <textarea id="bio" name="bio" rows={2}
          value={form.bio} onChange={handleChange}
          placeholder={ar ? 'أخبر المشترين عن مزرعتك…' : 'Tell buyers about your farm…'}
          className={`${inputCls} resize-none`} />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
          {ar ? 'رجوع' : 'Back'}
        </button>
        <button type="submit"
          disabled={isPending || !form.username || !form.email || !form.password || !form.password2 || !form.farm_name || !form.city}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
          {isPending && <Spinner />}
          {isPending ? (ar ? 'جاري الإنشاء…' : 'Creating…') : (ar ? 'إنشاء حساب المزارع' : 'Create Farmer Account')}
        </button>
      </div>
    </form>
  );
}

// ─── SignUp ───────────────────────────────────────────────────────────────────
export default function SignUp() {
  const { lang } = useLang();
  const ar = lang === 'ar';

  const [role, setRole] = useState(null); // null | 'consumer' | 'farmer'

  if (!role) {
    return <RoleSelection ar={ar} onSelect={setRole} />;
  }

  const isConsumer = role === 'consumer';

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-gray-100 bg-white px-8 py-8 shadow-lg">

          {/* Header */}
          <div className="mb-6 text-center">
            <span className="text-4xl">{isConsumer ? '🛒' : '🌾'}</span>
            <h1 className="mt-3 text-xl font-bold text-gray-800">
              {isConsumer
                ? (ar ? 'حساب مستهلك جديد' : 'New Consumer Account')
                : (ar ? 'حساب مزارع جديد' : 'New Farmer Account')}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {isConsumer
                ? (ar ? 'تسوّق المنتجات الطازجة من المزارعين المحليين' : 'Shop fresh produce from local farmers')
                : (ar ? 'ابدأ ببيع محاصيلك مباشرةً للمستهلكين' : 'Start selling your crops directly to consumers')}
            </p>
          </div>

          {isConsumer
            ? <ConsumerForm ar={ar} onBack={() => setRole(null)} />
            : <FarmerForm   ar={ar} onBack={() => setRole(null)} />
          }

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-400">
            {ar ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
            <Link to="/login" className="font-medium text-green-600 hover:text-green-700">
              {ar ? 'تسجيل الدخول' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
