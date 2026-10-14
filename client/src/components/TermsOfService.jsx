import React from 'react';
import { Plane, FileText, ArrowLeft, Mail, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TermsOfService({ onBack }) {
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
            <FileText className="w-3.5 h-3.5" />
            <span>User Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white m-0">Terms of Service</h1>
          <p className="text-sm text-slate-400 mt-2">
            Effective Date: October 14, 2026 • Last updated: October 2026
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">1.</span> Acceptance of Terms
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            By accessing or using the AeroLog application available at <strong className="text-white">flights.cuteanimegirls.moe</strong> ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not access or use the Service.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">2.</span> Description of the Service
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            AeroLog is an aviation logbook, mileage calculation, and interactive flight mapping platform. The Service allows authorized users to log flight records, calculate nautical and statute mileage, view personal flight statistics, visualize flight paths on 3D globes and 2D maps, and sync flight itineraries.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">3.</span> Access and Authentication
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            AeroLog operates on an authorized allowlist model. To access the platform:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-300 pl-2">
            <li>You must authenticate using an authorized Google Account listed on the system allowlist.</li>
            <li>You are responsible for maintaining the confidentiality and security of your Google credentials.</li>
            <li>The administrator reserves the right to grant, modify, or revoke access to the Service at any time.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">4.</span> Google API Integration & Data Use
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            When you sign in with Google or sync your Google Calendar, our use of Google user data adheres strictly to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google API Services User Data Policy</a> and our <a href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</a>. Data obtained from Google APIs is never sold, transferred to third parties, or used for advertising.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">5.</span> Acceptable Use Policy
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            You agree not to engage in any of the following prohibited activities:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-300 pl-2">
            <li>Attempting to bypass security mechanisms, access control lists, or authentication barriers.</li>
            <li>Transmitting malicious code, automated scraping requests, or denial-of-service traffic.</li>
            <li>Submitting false or malicious flight records that infringe upon third-party rights.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">6.</span> Disclaimer of Warranties
          </h2>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              The Service is provided on an <strong className="text-white">"AS IS"</strong> and <strong className="text-white">"AS AVAILABLE"</strong> basis without warranties of any kind, whether express or implied.
            </p>
            <p className="text-slate-400">
              AeroLog is an enthusiast travel logbook and personal visualization tool. It is not an official aviation authority, FAA dispatch tool, or airline reservation system. Mileage figures, flight times, and airport coordinates are calculated estimates and should not be relied upon for critical flight planning or navigation.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">7.</span> Limitation of Liability
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            To the maximum extent permitted by applicable law, in no event shall AeroLog or its operators be liable for any indirect, incidental, consequential, special, or punitive damages arising out of or related to your use of the Service.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">8.</span> Contact Information
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            For any questions or legal inquiries regarding these Terms of Service, please reach out to:
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
            <a href="/privacy" className="text-slate-400 hover:text-white transition">Privacy Policy</a>
            <span>•</span>
            <a href="/termsofservice" className="text-cyan-400 hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

