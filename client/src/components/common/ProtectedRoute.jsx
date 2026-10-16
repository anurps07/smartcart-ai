import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [], requireApprovedVendor = false }) {
  const { user, vendor, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Verifying authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-rose-100 rounded-2xl shadow-soft text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500">
          Your current account role (<span className="font-semibold capitalize">{user.role}</span>) does not have permission to view this resource.
        </p>
        <div className="pt-2">
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  if (requireApprovedVendor && user.role === 'vendor') {
    if (!vendor || vendor.approvalStatus !== 'approved') {
      return (
        <div className="max-w-md mx-auto my-16 p-8 bg-white border border-amber-200 rounded-2xl shadow-soft text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Store Approval Pending</h2>
          <p className="text-sm text-slate-600">
            Your vendor application is currently <span className="font-bold text-amber-600">{vendor?.approvalStatus || 'pending'}</span> review by marketplace administrators.
          </p>
        </div>
      );
    }
  }

  return children;
}
