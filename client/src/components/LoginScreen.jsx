import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import {
  Plane,
  Globe,
  Calendar,
  ShieldCheck,
  BarChart3,
  Clock,
  RefreshCw
} from 'lucide-react';
import { loginWithGoogle, loginWithDev } from '../api';

export default function LoginScreen({ authConfig, onLoginSuccess, onNavigate }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devName, setDevName] = useState('');
  const [pendingApprovalUser, setPendingApprovalUser] = useState(null);
  const [lastGoogleCredential, setLastGoogleCredential] = useState(null);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setLoading(true);
    try {
      const data = await loginWithGoogle(credentialResponse.credential);
      if (data.status === 'PENDING_APPROVAL') {
        setPendingApprovalUser(data.user || { email: 'your Google account' });
        setLastGoogleCredential(credentialResponse.credential);
        return;
      }
      onLoginSuccess(data.user);
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Authentication failed. Please verify your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in could not be completed. Please try again.');
  };

  const handleDevSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!devEmail) return;
    setError(null);
    setLoading(true);
    try {
      const data = await loginWithDev(devEmail, devName);
      if (data.status === 'PENDING_APPROVAL') {
        setPendingApprovalUser(data.user || { email: devEmail, name: devName });
        return;
      }
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckApprovalStatus = async () => {
    if (lastGoogleCredential) {
      await handleGoogleSuccess({ credential: lastGoogleCredential });
    } else if (devEmail) {
      await handleDevSubmit();
    } else {
      setPendingApprovalUser(null);
    }
  };

  const googleClientId = authConfig?.googleClientId || '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Clean Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md shadow-cyan-500/20 border border-cyan-500/30 shrink-0 bg-slate-900">
            <img src="/logo-120.png" alt="AeroLog Flight Tracker" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">AeroLog</span>
        </div>
      </header>

      {/* Main Hero & Sign-in Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-16 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: App Overview & Purpose */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs">
              <Plane className="w-3.5 h-3.5 text-cyan-400" />
              <span>Personal Flight Logbook &amp; Analytics</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Track your flights.<br className="hidden sm:inline" />
              <span className="text-cyan-400"> Relive your journeys.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              AeroLog is an interactive aviation logbook. Catalog historical flights, calculate true great-circle mileage, explore your routes on a 3D globe, and sync flight itineraries automatically from Google Calendar.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <Globe className="w-4 h-4 text-cyan-400 mb-1" />
                <div className="font-semibold text-xs text-white">3D Route Globe</div>
                <div className="text-[11px] text-slate-400">Great-circle curves &amp; maps</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <Calendar className="w-4 h-4 text-blue-400 mb-1" />
                <div className="font-semibold text-xs text-white">Calendar Import</div>
                <div className="text-[11px] text-slate-400">Automatic flight detection</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <BarChart3 className="w-4 h-4 text-teal-400 mb-1" />
                <div className="font-semibold text-xs text-white">Aviation Stats</div>
                <div className="text-[11px] text-slate-400">Miles, airlines &amp; airports</div>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div id="signin" className="lg:col-span-5 w-full">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 sm:p-7">
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl overflow-hidden border border-cyan-500/30 mb-2.5 bg-slate-950">
                  <img src="/logo-120.png" alt="AeroLog" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-lg font-bold text-white">Sign In to AeroLog</h2>
                <p className="text-xs text-slate-400 mt-0.5">Access your flight logbook and travel statistics</p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                  <span>{error}</span>
                </div>
              )}

              {/* Approval Pending View */}
              {pendingApprovalUser ? (
                <div className="space-y-4 text-center animate-in fade-in">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                      Pending Approval
                    </span>
                    <h3 className="text-sm font-bold text-white mt-2">Access Request Submitted</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                      Login request for <span className="text-cyan-300 font-mono font-semibold">{pendingApprovalUser.email}</span> is awaiting administrator approval.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Administrator Verification</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      All new accounts are manually verified by the administrator before access is unlocked.
                    </p>
                    <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-800">
                      Contact: <a href="mailto:miloverdrive@protonmail.com" className="text-cyan-400 hover:underline">miloverdrive@protonmail.com</a>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={handleCheckApprovalStatus}
                      disabled={loading}
                      className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>{loading ? 'Checking status...' : 'Check Approval Status'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setPendingApprovalUser(null);
                        setLastGoogleCredential(null);
                        setError(null);
                      }}
                      className="w-full py-1.5 text-slate-400 hover:text-white text-xs transition"
                    >
                      Sign in with another account
                    </button>
                  </div>
                </div>
              ) : authConfig?.hasGoogleAuth && googleClientId ? (
                /* Google Sign In */
                <GoogleOAuthProvider clientId={googleClientId}>
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center min-h-[65px]">
                      {loading ? (
                        <div className="flex items-center gap-2 text-xs text-cyan-400 py-1">
                          <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          <span>Signing in with Google...</span>
                        </div>
                      ) : (
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={handleGoogleError}
                          theme="filled_black"
                          shape="pill"
                          size="large"
                          text="signin_with"
                          width="260"
                        />
                      )}
                    </div>

                    <p className="text-[11px] text-center text-slate-400 leading-relaxed">
                      By continuing, you agree to our{' '}
                      <a
                        href="/termsofservice"
                        onClick={(e) => {
                          if (onNavigate) {
                            e.preventDefault();
                            onNavigate('/termsofservice');
                          }
                        }}
                        className="text-cyan-400 hover:underline"
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href="/privacy"
                        onClick={(e) => {
                          if (onNavigate) {
                            e.preventDefault();
                            onNavigate('/privacy');
                          }
                        }}
                        className="text-cyan-400 hover:underline"
                      >
                        Privacy Policy
                      </a>.
                    </p>
                  </div>
                </GoogleOAuthProvider>
              ) : authConfig?.devLoginEnabled ? (
                /* Development Fallback Sign-In (Only active when explicitly enabled on server) */
                <form onSubmit={handleDevSubmit} className="space-y-3">
                  <div>
                    <input
                      type="email"
                      placeholder="Your Email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Your Name (Optional)"
                      value={devName}
                      onChange={(e) => setDevName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-3 text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 rounded-xl transition disabled:opacity-50"
                  >
                    {loading ? 'Signing in...' : 'Sign In (Dev)'}
                  </button>
                </form>
              ) : (
                /* Neither Google nor Dev Login active */
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <p className="text-xs text-amber-300 font-semibold">Sign-In Unavailable</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Google OAuth is not configured on this server, and development direct sign-in is disabled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clean Data Privacy & Google Integration Overview (Google Verification Compliant) */}
        <section className="mt-12 sm:mt-16 pt-8 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Google Calendar Integration &amp; Data Safety</span>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              When you choose to connect Google Calendar, AeroLog requests read-only permission (<code>calendar.readonly</code>) solely to identify airline flight reservations, flight numbers, and airport departure/arrival codes to build your personal flight log.
            </p>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              AeroLog adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google API Services User Data Policy</a>, including Limited Use requirements. Your flight data is never sold, never shared with third parties or advertisers, and never used to train machine learning models. AeroLog is strictly a personal aviation tracking tool and does not generate or process synthetic or AI imagery.
            </p>

            <div className="flex items-center gap-4 pt-1 text-xs text-slate-400">
              <a
                href="/privacy"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate('/privacy');
                  }
                }}
                className="text-cyan-400 hover:underline"
              >
                Read our Privacy Policy &rarr;
              </a>
              <a
                href="/termsofservice"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate('/termsofservice');
                  }
                }}
                className="text-cyan-400 hover:underline"
              >
                Terms of Service &rarr;
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-800/80 py-5 px-4 sm:px-6 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span>&copy; {new Date().getFullYear()} AeroLog &bull; flights.cuteanimegirls.moe</span>
          <div className="flex items-center gap-4">
            <a
              href="/privacy"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/privacy');
                }
              }}
              className="text-slate-400 hover:text-white transition"
            >
              Privacy Policy
            </a>
            <a
              href="/termsofservice"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/termsofservice');
                }
              }}
              className="text-slate-400 hover:text-white transition"
            >
              Terms of Service
            </a>
            <a href="mailto:miloverdrive@protonmail.com" className="text-slate-400 hover:text-white transition">
              Contact Admin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
