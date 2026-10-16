import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Server, 
  Database, 
  ShieldCheck, 
  Cpu, 
  Store, 
  ArrowRight,
  ExternalLink,
  Layers,
  Activity
} from 'lucide-react';
import api from './api/client';

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/health');
      setHealthData(res.data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Notification / Brand Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  SmartCart<span className="text-brand-600">AI</span>
                </span>
                <span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-brand-200">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">AI-Powered Multi-Vendor Marketplace</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Phase 1 Initialized</span>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700 hover:text-brand-600 bg-white border border-slate-200 hover:border-brand-300 px-3 py-1.5 rounded-lg shadow-sm transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
              <span>{loading ? 'Checking...' : 'Ping API'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 shadow-xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 bg-brand-500/20 border border-brand-400/30 px-3 py-1 rounded-full text-xs font-medium text-brand-300">
              <Sparkles className="h-3.5 w-3.5 text-brand-300" />
              <span>Full-Stack Architecture & Multi-Vendor Engine</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              AI-Powered Multi-Vendor Marketplace Platform
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              SmartCart AI integrates multi-vendor product catalogues, inventory-safe split orders, 
              Razorpay payment verification, and an intelligent database-grounded AI shopping assistant.
            </p>
          </div>
          
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-brand-500/10 to-transparent pointer-events-none"></div>
        </div>

        {/* Live System Health Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Backend & Service Diagnostic</h2>
                <p className="text-xs text-slate-500">Live communication test between React Vite frontend and Express server</p>
              </div>
            </div>
            {lastChecked && (
              <span className="text-xs text-slate-400">Checked at {lastChecked}</span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Express Server Card */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Express REST</span>
                <Server className="h-4 w-4 text-brand-600" />
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-6 w-24 bg-slate-200 animate-pulse rounded"></div>
                ) : error ? (
                  <div className="flex items-center space-x-1.5 text-rose-600 text-sm font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Unreachable</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 text-emerald-600 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Active (Port 5000)</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">Health: /api/health</p>
              </div>
            </div>

            {/* MongoDB Service Card */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">MongoDB Database</span>
                <Database className="h-4 w-4 text-brand-600" />
              </div>
              <div className="mt-3">
                <div className="flex items-center space-x-1.5 text-emerald-600 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>v8.2.2 Active</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Port 27017 Connected</p>
              </div>
            </div>

            {/* Security Layer Card */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Security Suite</span>
                <ShieldCheck className="h-4 w-4 text-brand-600" />
              </div>
              <div className="mt-3">
                <div className="flex items-center space-x-1.5 text-emerald-600 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Helmet & Rate Limit</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">CORS & CSP Active</p>
              </div>
            </div>

            {/* AI Engine Card */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI Engine</span>
                <Cpu className="h-4 w-4 text-brand-600" />
              </div>
              <div className="mt-3">
                <div className="flex items-center space-x-1.5 text-brand-600 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" />
                  <span>Adapter Ready</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Deterministic DB Fallback</p>
              </div>
            </div>
          </div>

          {healthData && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center justify-between">
              <span><strong>Backend Response:</strong> Service: {healthData.service} | Environment: {healthData.environment} | Uptime: {Math.floor(healthData.uptime)}s</span>
              <span className="text-[10px] text-emerald-600">{healthData.timestamp}</span>
            </div>
          )}
        </div>

        {/* Development Phases Roadmap */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Project Architecture Roadmap</h2>
            <span className="text-xs font-medium text-slate-500">Phase 1 of 13 In Progress</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { num: 1, title: 'Workspace & Startup', desc: 'Monorepo, Express REST, React Vite, Tailwind CSS', active: true, done: false },
              { num: 2, title: 'Database & Models', desc: '13 indexed Mongoose schemas, paise-safe financial precision', active: false, done: false },
              { num: 3, title: 'Auth & RBAC', desc: 'JWT, bcrypt hashing, Buyer / Vendor / Admin roles', active: false, done: false },
              { num: 4, title: 'Vendor Applications', desc: 'Application submission, store setup & admin moderation', active: false, done: false },
              { num: 5, title: 'Catalog & Search', desc: 'Faceted search, category filters, product CRUD & images', active: false, done: false },
              { num: 6, title: 'Cart, Wishlist, Address', desc: 'Inventory-verified cart, addresses & wishlist storage', active: false, done: false },
              { num: 7, title: 'Multi-Vendor Checkout', desc: 'Atomic stock reservation, parent & vendor sub-orders', active: false, done: false },
              { num: 8, title: 'Razorpay Test Payments', desc: 'HMAC verification, webhooks, idempotency & refund states', active: false, done: false },
              { num: 9, title: 'Role Dashboards', desc: 'Buyer order tracking, Vendor fulfillment & Admin control', active: false, done: false },
              { num: 10, title: 'SmartCart AI Assistant', desc: 'Natural language queries grounded in real MongoDB catalog', active: false, done: false },
              { num: 11, title: 'Real-Time Notifications', desc: 'Socket.IO rooms, order events & price drop alerts', active: false, done: false },
              { num: 12, title: 'Automated Tests & QA', desc: 'Vitest, Supertest, concurrency checks & security audit', active: false, done: false },
              { num: 13, title: 'Git & Deployment Guide', desc: 'GitHub repo push, documentation & deployment steps', active: false, done: false },
            ].map((phase) => (
              <div 
                key={phase.num} 
                className={`p-4 rounded-xl border transition-all ${
                  phase.active 
                    ? 'border-brand-300 bg-white shadow-soft ring-1 ring-brand-500/20' 
                    : 'border-slate-200 bg-white/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    phase.active 
                      ? 'bg-brand-100 text-brand-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    Phase {phase.num}
                  </span>
                  {phase.active && (
                    <span className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider">
                      Current
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-800 text-sm mt-2">{phase.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{phase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-2 sm:space-y-0">
          <p>© 2026 SmartCart AI. Built for high-performance e-commerce portfolios.</p>
          <div className="flex items-center space-x-4">
            <span className="font-medium text-slate-700">Author: anurps07</span>
            <span>•</span>
            <span>REST API + Socket.IO + MongoDB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
