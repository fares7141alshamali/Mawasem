import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/auth/SignUp';
import Cart from './pages/Cart';
import ProductDetail from './pages/ProductDetail';
import Dashboard, { FarmerGuard } from './pages/farmer/Dashboard';
import Orders from './pages/Orders';
import Addresses from './pages/Addresses';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const ComingSoon = ({ title }) => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-gray-400">
    <span className="text-4xl">🌱</span>
    <p className="text-lg font-medium">{title}</p>
    <p className="text-sm">Coming soon</p>
  </div>
);

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/products" element={<Home />} />

        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/cart"           element={<Cart />} />
        <Route path="/orders"         element={<Orders />} />
        <Route path="/addresses"      element={<Addresses />} />

        {/* /farmers is the farmer portal login; /login is the shared auth entry */}
        <Route path="/farmer/dashboard" element={
          <FarmerGuard><Dashboard /></FarmerGuard>
        } />

        <Route path="/signup"            element={<SignUp />} />
        <Route path="/farmers"           element={<Login />} />
        <Route path="/login"             element={<Login />} />
        <Route path="/verify-email"      element={<VerifyEmail />} />
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/reset-password"    element={<ResetPassword />} />

        <Route path="*" element={<ComingSoon title="404 — Not Found" />} />
      </Routes>
    </Layout>
  );
}
