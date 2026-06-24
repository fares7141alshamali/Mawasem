import { useLang } from '../../contexts/LanguageContext';
import Header from './Header';

// ─── Layout ───────────────────────────────────────────────────────────────────
// Wraps every page. Sets the dir attribute on the root div so all Tailwind
// logical properties (ps-*, pe-*, ms-*, me-*, start-*, end-*) resolve
// correctly in both Arabic (RTL) and English (LTR).
export default function Layout({ children }) {
  const { dir } = useLang();

  return (
    <div dir={dir} className="min-h-screen bg-gray-50 font-sans antialiased">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="mt-16 border-t border-gray-100 bg-white py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Mawasem — مواسم
      </footer>
    </div>
  );
}
