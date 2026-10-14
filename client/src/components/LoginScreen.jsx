import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import {
  Plane,
  Globe,
  Calendar,
  ShieldCheck,
  Lock,
  ArrowRight,
  BarChart3,
  Award,
  Sparkles,
  CheckCircle2,
  Compass,
  FileText,
  Key,
  ShieldAlert
} from 'lucide-react';
import { loginWithGoogle, loginWithDev } from '../api';

export default function LoginScreen({ authConfig, onLoginSuccess, onNavigate }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devName, setDevName] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setLoading(true);
    try {
      const data = await loginWithGoogle(credentialResponse.credential);
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
    e.preventDefault();
    if (!devEmail) return;
    setError(null);
    setLoading(true);
    try {
      const data = await loginWithDev(devEmail, devName);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const googleClientId = authConfig?.googleClientId || '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/25 border border-cyan-500/40 shrink-0 bg-slate-900">
              <img src="/logo-120.png" alt="AeroLog Flight Tracker" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">AeroLog</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 hidden sm:block">Global Flight Tracker & Aviation Analytics</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-4 text-xs font-semibold">
            <a href="#features" className="text-slate-400 hover:text-white transition hidden md:inline-block">
              Features
            </a>
            <a href="#how-it-works" className="text-slate-400 hover:text-white transition hidden md:inline-block">
              Google Integration
            </a>
            <a
              href="/privacy"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/privacy');
                }
              }}
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition"
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
              className="text-slate-400 hover:text-white hover:underline transition"
            >
              Terms of Service
            </a>
            <a
              href="#signin"
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-sm"
            >
              Sign In
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Hero Left: App Purpose & Overview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>Personal Aviation Logbook & Analytics</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              AeroLog <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Global Flight Tracker & Analytics
              </span>
            </h1>

            <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
              AeroLog is an interactive flight logbook and aviation analytics platform. Catalog your historical flights,
              calculate true great-circle mileage, explore routes on an orthographic 3D globe, and gain personalized insights
              into aircraft types, visited airports, and carbon emissions.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <Globe className="w-5 h-5 text-cyan-400 mb-1.5" />
                <div className="font-bold text-sm text-white">3D Flight Globe</div>
                <div className="text-[11px] text-slate-400">Great-circle route rendering</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <Calendar className="w-5 h-5 text-blue-400 mb-1.5" />
                <div className="font-bold text-sm text-white">Calendar Sync</div>
                <div className="text-[11px] text-slate-400">Automatic flight detection</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <BarChart3 className="w-5 h-5 text-teal-400 mb-1.5" />
                <div className="font-bold text-sm text-white">Aviation Stats</div>
                <div className="text-[11px] text-slate-400">Miles, airlines &amp; fleet analysis</div>
              </div>
            </div>
          </div>

          {/* Hero Right: Sign In Card */}
          <div id="signin" className="lg:col-span-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-cyan-500/20 border border-cyan-500/30 mb-3 bg-slate-900">
                  <img src="/logo-120.png" alt="AeroLog Logo" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-xl font-bold text-white">Sign In to AeroLog</h2>
                <p className="text-xs text-slate-400 mt-1">Access your personalized flight logbook and travel analytics</p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Google OAuth Section */}
              {authConfig?.hasGoogleAuth && googleClientId ? (
                <GoogleOAuthProvider clientId={googleClientId}>
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center min-h-[75px]">
                      {loading ? (
                        <div className="flex items-center gap-2 text-xs text-cyan-400 py-2">
                          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
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
                          width="280"
                        />
                      )}
                    </div>

                    <p className="text-[11px] text-center text-slate-400 leading-relaxed">
                      Sign in securely with your Google account. By continuing, you agree to our{' '}
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
              ) : (
                /* Fallback Sign-In */
                <form onSubmit={handleDevSubmit} className="space-y-3">
                  <div>
                    <input
                      type="email"
                      placeholder="Your Email"
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
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              )}

              {/* Security info */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Protected by cryptographically signed JWT sessions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google API Usage & Compliance Section */}
      <section id="how-it-works" className="border-t border-slate-800 bg-slate-900/40 py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">How AeroLog Uses Google APIs</h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              Transparency and data privacy are core principles of AeroLog. Here is exactly how our Google Calendar integration works:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Calendar Sync for Historic Flights</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When you connect Google Calendar via OAuth, AeroLog requests read-only permission (<code>calendar.readonly</code>)
                strictly to identify airline reservation events, flight numbers, and boarding itineraries. We parse departure
                and arrival airport codes to reconstruct your travel history.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Strict Google Limited Use Compliance</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                AeroLog adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google API Services User Data Policy</a>,
                including the Limited Use requirements. We do <strong>NOT</strong> sell user data, do <strong>NOT</strong> share data with advertisers,
                and do <strong>NOT</strong> train AI or machine learning models on your information.
              </p>
            </div>
          </div>

          {/* Compliance & Acceptable Use Statement */}
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
            <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Google APIs Terms of Service &amp; Safety Compliance</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              AeroLog is purely an aviation tracking and personal flight log utility. AeroLog does <strong>NOT</strong> generate, process, host,
              or facilitate synthetic media, generative AI imagery, or Non-Consensual Intimate Imagery (NCII). Our integration with Google APIs
              is strictly limited to personal aviation logbook functionality.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="py-14 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Application Features</h2>
          <p className="text-sm text-slate-400">Everything you need to catalog, visualize, and analyze your flights</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Interactive 3D Globe</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore your global journeys rendered on an orthographic 3D globe with great-circle curved trajectories and real-time day/night terminators.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Aviation Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Analyze total distance flown in miles and kilometers, hours in the air, visited continents, top airlines, and aircraft fleet distribution.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Achievement Badges</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unlock AvGeek milestones like Continental Hopper, Transatlantic Crossing, Boeing Enthusiast, and Equator Crossings as your logbook grows.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Full Data Portability</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You own your data. Export your entire flight catalog to structured JSON at any time or request immediate account purging.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 sm:px-6 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded overflow-hidden">
              <img src="/logo-120.png" alt="AeroLog" className="w-full h-full object-cover" />
            </div>
            <span>&copy; {new Date().getFullYear()} AeroLog • flights.cuteanimegirls.moe</span>
          </div>

          <div className="flex items-center gap-6">
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
            </a>
            <a
              href="/termsofservice"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/termsofservice');
                }
              }}
              className="text-slate-400 hover:text-white hover:underline transition"
            >
              Terms of Service
            </a>
            <a href="mailto:miloverdrive@protonmail.com" className="text-slate-400 hover:text-white transition">
              Contact: miloverdrive@protonmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
