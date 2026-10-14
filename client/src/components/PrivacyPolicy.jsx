import React from 'react';
import { Plane, ShieldCheck, ArrowLeft, Mail, Lock, Database, Calendar, EyeOff } from 'lucide-react';

export default function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/25 border border-cyan-500/40 shrink-0 bg-slate-900">
              <img src="/logo-120.png" alt="AeroLog" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-black text-lg text-white">AeroLog</span>
              <span className="ml-2 text-xs font-mono text-cyan-400">Legal</span>
            </div>
          </div>
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-semibold text-slate-200 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to AeroLog</span>
            </button>
          ) : (
            <a
              href="/"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-semibold text-slate-200 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to AeroLog</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Transparency & Security</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white m-0">Privacy Policy</h1>
          <p className="text-sm text-slate-400 mt-2">
            Effective Date: October 14, 2026 • Last updated: October 2026
          </p>
        </div>

        {/* Overview Card */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <h2 className="text-base font-bold text-cyan-400 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Summary of Our Commitment</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            AeroLog (<strong className="text-white">flights.cuteanimegirls.moe</strong>) is a private, personal flight tracking and aviation statistics application. We are committed to protecting your personal information and being completely transparent about the data we access, how it is used, and how it is secured.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">1.</span> Information We Collect
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We only collect data necessary to provide and secure the AeroLog flight logging service:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-slate-300 pl-2">
            <li>
              <strong className="text-white">Account Information:</strong> When you sign in using Google OAuth, we receive your basic profile details, including your email address and display name, to authenticate your identity against our authorized allowlist and manage your session.
            </li>
            <li>
              <strong className="text-white">Flight & Travel Logs:</strong> Flight details that you manually input, import via JSON/CSV, or scan via boarding passes (flight numbers, airlines, departure/arrival airports, dates, seat numbers, aircraft types, and personal travel notes).
            </li>
            <li>
              <strong className="text-white">Google Calendar Data (Optional):</strong> If you choose to use the automated Calendar Sync feature, with your explicit authorization we read flight reservation events from your primary Google Calendar strictly to parse flight numbers, dates, and airport codes.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">2.</span> How We Use Your Information
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Your data is strictly used for the core functionality of AeroLog:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Flight Mileage & 3D Visualization</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Calculating great-circle distances, flight hours, country counts, and rendering your 3D interactive flight globe and 2D route maps.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Authentication & Access Control</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Verifying your Google identity against the administrator allowlist to safeguard your private logbook from unauthorized access.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">3.</span> Google API Services User Data Policy Compliance
          </h2>
          <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2.5">
            <p className="text-xs sm:text-sm text-cyan-200 leading-relaxed font-semibold">
              AeroLog’s use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300 pl-1">
              <li>We do <strong className="text-white">NOT</strong> sell your personal data or Google user data to any third parties.</li>
              <li>We do <strong className="text-white">NOT</strong> share or transfer your Google user data to data brokers, advertising platforms, or information resellers.</li>
              <li>We do <strong className="text-white">NOT</strong> use Google user data to serve targeted advertisements.</li>
              <li>We do <strong className="text-white">NOT</strong> use Google user data to train generalized AI or machine learning models.</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">4.</span> Data Storage, Retention, and Security
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            All data is stored in secure, private SQLite database records encrypted in transit via Transport Layer Security (HTTPS/TLS). Access is guarded by cryptographically signed JSON Web Tokens (JWT) and restricted strictly to accounts validated on the database allowlist.
          </p>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We retain your flight logs for as long as your account remains active on the allowlist, allowing you to view and export your lifetime flight history.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">5.</span> Data Deletion and User Rights
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            You retain complete ownership over your data at all times:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-300 pl-2">
            <li>
              <strong className="text-white">Export:</strong> You can export your entire flight logbook to a JSON file at any time using the Export button in the navigation bar.
            </li>
            <li>
              <strong className="text-white">Individual Flight Deletion:</strong> You can delete any individual flight record directly from the logbook interface.
            </li>
            <li>
              <strong className="text-white">Complete Account Deletion:</strong> You may request complete erasure of your account and all associated flight records by contacting the administrator at <a href="mailto:miloverdrive@protonmail.com" className="text-cyan-400 hover:underline">miloverdrive@protonmail.com</a>. Upon receipt, all records will be permanently purged within 48 hours.
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">6.</span> Contact Us
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact:
          </p>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <Mail className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="font-bold text-sm text-white">Admin (AeroLog Administrator)</div>
              <a href="mailto:miloverdrive@protonmail.com" className="text-xs font-mono text-cyan-400 hover:underline">
                miloverdrive@protonmail.com
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {new Date().getFullYear()} AeroLog • flights.cuteanimegirls.moe</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</a>
            <span>•</span>
            <a href="/termsofservice" className="text-slate-400 hover:text-white transition">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

