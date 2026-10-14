import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Plane, ShieldCheck, ShieldAlert, Lock, AlertCircle, Key, ArrowRight, UserCheck } from 'lucide-react';
import { loginWithGoogle, loginWithDev } from '../api';

export default function LoginScreen({ authConfig, onLoginSuccess }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(!authConfig?.hasGoogleAuth);
  const [devEmail, setDevEmail] = useState('');
  const [devName, setDevName] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setLoading(true);
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential returned from Google');
      }
      const data = await loginWithGoogle(credentialResponse.credential);
      onLoginSuccess(data.user);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Failed to connect to Google Identity Services. Please try again.');
  };

  const handleDevSubmit = async (e) => {
    e.preventDefault();
    if (!devEmail.trim() || !devEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await loginWithDev(devEmail.trim(), devName.trim());
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const googleClientId = authConfig?.googleClientId || '';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Ambience & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-8 backdrop-blur-xl">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/25 mb-4">
            <Plane className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white m-0">AeroLog</h1>
          <p className="text-xs text-slate-400 mt-1">Private Flight Tracker & 3D Mileage Globe</p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-cyan-400 text-[11px] font-semibold mt-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Restricted Access Protected</span>
          </div>
        </div>

        {/* Error Alert (e.g. Access Denied) */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-300">Access Restricted</div>
                <div className="mt-1 text-slate-300 leading-relaxed">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Google OAuth Section */}
        {authConfig?.hasGoogleAuth && googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center min-h-[80px]">
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 py-2">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying authorization...</span>
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    text="signin_with"
                    width="280"
                  />
                )}
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Only Google accounts listed on the administrator's allowlist will be granted access.
              </p>
            </div>
          </GoogleOAuthProvider>
        ) : (
          /* When Google Client ID is not configured yet */
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-300">
                <Key className="w-3.5 h-3.5" /> Google OAuth Setup Required
              </div>
              <p className="text-slate-300 leading-relaxed">
                Add your <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-400 font-mono">GOOGLE_CLIENT_ID</code> to <code className="bg-slate-950 px-1 py-0.5 rounded text-slate-300">.env</code> to enable the official Google sign-in button.
              </p>
            </div>

            {/* Direct Authorized Email Sign-In */}
            <form onSubmit={handleDevSubmit} className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-300">
                Sign In with Authorized Email:
              </div>
              <div>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Checking...' : (
                  <>
                    <span>Verify & Enter</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-slate-600" />
          <span>Secured with JWT sessions & SQLite allowlist validation</span>
        </div>
      </div>
    </div>
  );
}

