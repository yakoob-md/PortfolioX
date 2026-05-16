import Link from 'next/link';
import {
  Shield, ArrowRight, Layers, BarChart3, IndianRupee,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0f1e] text-slate-200">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#1e293b] bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-100">
              Portfolio<span className="text-emerald-400">X</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">Features</a>
            <a href="#metrics" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">Coverage</a>
          </nav>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold py-2 px-5 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
          >
            Analyze Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-6 pt-24 pb-32 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
          <div className="relative max-w-4xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" />
              <span className="text-xs font-semibold text-emerald-400 tracking-wide">Indian Mutual Fund Intelligence</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              See what&apos;s{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">actually</span>
              <br />inside your portfolio
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover hidden overlap, true sector exposure, and exact cost leakages in your mutual fund portfolio — in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-bold py-4 px-10 rounded-xl transition-all duration-200 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                Analyze My Portfolio <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-24 border-t border-[#1e293b]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-[0.2em] mb-3">Deep Analytics</h2>
              <p className="text-3xl md:text-4xl font-bold text-slate-100 tracking-tight">Everything your portfolio is hiding from you</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard icon={<Layers className="w-5 h-5 text-emerald-400" />} title="Overlap Detection" description="Identify funds buying the same stocks. Inflating costs without adding diversification — spot it instantly." stat="30%+" statLabel="overlap threshold" />
              <FeatureCard icon={<BarChart3 className="w-5 h-5 text-emerald-400" />} title="Sector Audit" description="See your real exposure to IT, Banking, FMCG — aggregated across all your funds, not per-fund." stat="40+" statLabel="metrics tracked" />
              <FeatureCard icon={<IndianRupee className="w-5 h-5 text-emerald-400" />} title="Expense Audit" description="Find cost leakages from regular plans and high expense ratios. Quantify potential yearly savings." stat="₹/yr" statLabel="savings found" />
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section id="metrics" className="px-6 py-20 border-t border-[#1e293b]">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <MetricItem label="Funds Analyzed" value="20,000+" />
            <MetricItem label="Stocks Tracked" value="5,000+" />
            <MetricItem label="Analytics" value="40+" />
            <MetricItem label="Cost" value="Free" />
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-24 border-t border-[#1e293b]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4 tracking-tight">Ready to audit your portfolio?</h2>
            <p className="text-slate-400 text-lg mb-8">No sign-up required. Add your funds, enter units, get insights in seconds.</p>
            <Link
              href="/analyze"
              className="inline-flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-bold py-4 px-10 rounded-xl transition-all duration-200 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-[#1e293b] mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-slate-400">PortfolioX</span>
          </div>
          <p className="text-xs text-slate-500 text-center max-w-xl leading-relaxed">
            Disclaimer: Not SEBI-registered financial advice. This is an educational tool. Investments in mutual funds are subject to market risks. &copy; 2026 PortfolioX
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, stat, statLabel }: { icon: React.ReactNode; title: string; description: string; stat: string; statLabel: string }) {
  return (
    <div className="group relative bg-[#111827] border border-[#1e293b] rounded-xl p-6 hover:border-emerald-500/20 transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/40 transition-all duration-500" />
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/15 transition-colors">{icon}</div>
        <div className="text-right">
          <div className="text-lg font-bold text-emerald-400 data-value">{stat}</div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{statLabel}</div>
        </div>
      </div>
      <h3 className="text-base font-bold text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4">
      <div className="text-3xl md:text-4xl font-bold text-emerald-400 data-value mb-1">{value}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{label}</div>
    </div>
  );
}