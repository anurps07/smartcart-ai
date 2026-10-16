import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  ShieldCheck, 
  Store, 
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await login(email, password);
      if (data?.user?.role === 'admin') {
        navigate(from === '/' ? '/admin' : from, { replace: true });
      } else if (data?.user?.role === 'vendor') {
        navigate(from === '/' ? '/vendor' : from, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">
            SmartCart<span className="text-brand-600">AI</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Or{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            create a new buyer or vendor account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-soft rounded-2xl border border-slate-200">
          {/* Quick Demo Credentials Switcher */}
          <div className="mb-6 pb-6 border-b border-slate-100">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              ⚡ Quick Demo Portfolios
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@smartcart.com', 'Admin@123456')}
                className="flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-all text-center group"
              >
                <ShieldCheck className="h-4 w-4 text-brand-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-700">Admin</span>
                <span className="text-[9px] text-slate-400">Platform</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('techworld@smartcart.com', 'Vendor@123456')}
                className="flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-all text-center group"
              >
                <Store className="h-4 w-4 text-brand-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-700">Vendor</span>
                <span className="text-[9px] text-slate-400">TechWorld</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('buyer@smartcart.com', 'Buyer@123456')}
                className="flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-all text-center group"
              >
                <UserIcon className="h-4 w-4 text-brand-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-700">Buyer</span>
                <span className="text-[9px] text-slate-400">Customer</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-brand-600">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
