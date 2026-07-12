import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-2xl rounded-lg border border-ink/10 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-black text-ink">Caricamento account...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
