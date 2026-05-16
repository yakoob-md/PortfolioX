import Link from 'next/link';
import { Shield, Zap, TrendingUp, Share2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-500" />
          <span className="text-2xl font-bold tracking-tight">PortfolioX</span>
        </div>
        <Link href="/analyze" className="btn-primary">
          Analyze Now
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="px-8 py-24 text-center max-w-5xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
            See what's <span className="text-emerald-500">actually</span> inside your portfolio.
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-3xl mx-auto">
            Discover hidden overlap, true sector exposure, and exact cost leakages in your Indian mutual fund portfolio — in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/analyze" className="bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold py-4 px-10 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
              Analyze My Portfolio
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="px-8 py-20 bg-slate-900/50">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-emerald-400" />}
              title="Overlap Detection"
              description="Identify funds that are just buying the same stocks, inflating your costs without adding diversification."
            />
            <FeatureCard 
              icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
              title="Sector Audit"
              description="See your real exposure to sectors like IT, Banking, and FMCG aggregated across all your funds."
            />
            <FeatureCard 
              icon={<Share2 className="w-6 h-6 text-emerald-400" />}
              title="Shareable Reports"
              description="Generate a secure link to your portfolio health report to share with advisors or friends."
            />
          </div>
        </section>

        {/* Stats */}
        <section className="px-8 py-16 border-y border-slate-800">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatItem label="Funds Analyzed" value="20,000+" />
            <StatItem label="Stocks Tracked" value="5,000+" />
            <StatItem label="Metrics" value="40+" />
            <StatItem label="Cost" value="Free" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-8 py-12 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p className="mb-4">© 2026 PortfolioX. Built for Indian Investors.</p>
        <p className="max-w-2xl mx-auto">
          Disclaimer: Not SEBI-registered financial advice. This is an educational tool. 
          Investments in mutual funds are subject to market risks.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="card hover:border-emerald-500/50 transition-colors group">
      <div className="mb-4 bg-slate-700/50 w-fit p-3 rounded-lg group-hover:bg-emerald-500/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-emerald-500 mb-1">{value}</div>
      <div className="text-slate-500 uppercase tracking-widest text-xs font-bold">{label}</div>
    </div>
  );
}
