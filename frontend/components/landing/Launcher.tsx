'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Shield, Sparkles, TrendingUp, ShieldCheck, Zap, ArrowRight, Bot } from 'lucide-react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface LauncherProps {
  onLaunch: () => void;
}

function FadeInSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const Launcher: React.FC<LauncherProps> = ({ onLaunch }) => {
  const containerRef = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const handleLaunch = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    onLaunch();
  };

  const floatVariants = {
    animate: {
      y: [0, -8, 0],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const },
    },
  };

  const floatVariants2 = {
    animate: {
      y: [0, 6, 0],
      transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' as const, delay: 1 },
    },
  };

  return (
    <main ref={containerRef} className="w-full bg-white text-slate-900 overflow-x-hidden">
      {/* SECTION 1: HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20 bg-gradient-to-b from-blue-50/80 via-white to-white">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto">
          <FadeInSection>
            <div className="relative inline-block mb-8">
              <motion.div
                variants={floatVariants}
                animate="animate"
                className="w-24 h-24 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center shadow-xl shadow-primary/5"
              >
                <Shield className="w-12 h-12 text-primary" />
              </motion.div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 border-4 border-white animate-pulse" />
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="space-y-6">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-slate-900 leading-[0.9]">
                Portfolio<span className="text-primary">X</span>
              </h1>
              <p className="text-xl md:text-2xl lg:text-3xl text-slate-500 font-medium max-w-3xl mx-auto leading-tight">
                The next generation of <span className="text-slate-900 font-semibold">Mutual Fund Intelligence</span> is here.
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <div className="flex flex-col items-center gap-4 pt-12">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                <Sparkles className="w-4 h-4" />
                Scroll to Explore
              </div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-px h-20 bg-gradient-to-b from-primary/40 to-transparent"
              />
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* SECTION 2: MARKET INTELLIGENCE */}
      <section className="relative min-h-screen flex items-center px-6 py-20 bg-gradient-to-b from-white via-blue-50/30 to-white">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full max-w-6xl mx-auto">
          <FadeInSection>
            <div className="space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-bold uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                Real-time Intelligence
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                Every Fund. <br />
                <span className="text-primary">Zero Lag.</span>
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed max-w-md">
                Track over 2,500+ mutual funds with live NAV updates, 10-year rolling returns, and deep AMC insights.
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <motion.div
              variants={floatVariants2}
              animate="animate"
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-[0.08] group-hover:opacity-[0.12] transition duration-1000" />
              <div className="relative bg-white border border-slate-200 p-8 rounded-3xl shadow-2xl shadow-blue-500/5 space-y-6">
                <div className="h-56 w-full bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
                  <div className="flex items-end gap-2 h-32">
                    {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        viewport={{ once: true }}
                        className="w-6 bg-primary/20 rounded-t-sm"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Market Status</p>
                    <p className="text-slate-900 font-mono text-xs">ALL SYSTEMS OPERATIONAL</p>
                  </div>
                  <Sparkles className="text-primary w-6 h-6 animate-pulse" />
                </div>
              </div>
            </motion.div>
          </FadeInSection>
        </div>
      </section>

      {/* SECTION 3: WEALTH PROTECTION */}
      <section className="relative min-h-screen flex items-center px-6 py-20 bg-gradient-to-b from-white via-emerald-50/20 to-white">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full max-w-6xl mx-auto">
          <FadeInSection delay={0.2}>
            <motion.div
              variants={floatVariants}
              animate="animate"
              className="relative group order-2 lg:order-1"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur opacity-[0.08] transition duration-1000" />
              <div className="relative bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-8 shadow-2xl shadow-emerald-500/5">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                  <ShieldCheck className="w-10 h-10 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-5xl font-black text-slate-900">1.5%+</p>
                  <p className="text-sm text-emerald-600 font-bold uppercase tracking-widest">Wealth Leakage Saved</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">Calculated based on Direct vs Regular plan switching analysis for a 20-year horizon.</p>
              </div>
            </motion.div>
          </FadeInSection>

          <FadeInSection className="order-1 lg:order-2">
            <div className="space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                Portfolio Strategy
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                Stop the <br />
                <span className="text-emerald-600">Commissions.</span>
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                Our tax-optimization engine and cost-leakage audit identify exactly where you are losing wealth to hidden distributor commissions.
              </p>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* SECTION 4: AI CO-PILOT */}
      <section className="relative min-h-screen flex items-center px-6 py-20 bg-gradient-to-b from-white via-blue-50/30 to-white">
        <div className="flex flex-col items-center text-center space-y-12 max-w-4xl mx-auto">
          <FadeInSection>
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-bold uppercase tracking-wider mx-auto">
                <Bot className="w-3.5 h-3.5" />
                Conversational IQ
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-8xl font-bold text-slate-900 tracking-tighter">
                Meet your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Co-Pilot.</span>
              </h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Powered by Google Gemini, the PortfolioX Intelligence agent answers complex tax and portfolio questions in human language.
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <div className="w-full max-w-2xl bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left font-mono text-sm space-y-4 shadow-xl">
              <div className="flex gap-3">
                <span className="text-blue-600 font-bold shrink-0">User:</span>
                <span className="text-slate-600">&quot;Which of my funds have high overlap?&quot;</span>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-600 font-bold shrink-0">AI:</span>
                <span className="text-slate-900">Analyzing... I&apos;ve detected a <strong>42% overlap</strong> between your HDFC and ICICI Large Cap holdings. Consider consolidating to save costs.</span>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* SECTION 5: FINAL LAUNCH */}
      <section className="relative min-h-[80vh] flex items-center px-6 py-20 bg-gradient-to-b from-white to-primary/5">
        <div className="flex flex-col items-center text-center space-y-12 max-w-4xl mx-auto">
          <FadeInSection>
            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tight">
                Ready to <br />Optimize?
              </h2>
              <p className="text-lg text-slate-500 font-medium">Join thousands of smart investors today.</p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <Button
              size="lg"
              onClick={handleLaunch}
              className="group h-20 px-12 rounded-full bg-slate-900 text-white hover:bg-primary text-2xl font-black transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl shadow-slate-900/10"
            >
              Launch Dashboard
              <ArrowRight className="ml-4 w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </Button>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <div className="pt-16 flex flex-col items-center gap-6">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>No Sign-up required</span>
                <span className="w-1 h-1 rounded-full bg-slate-200" />
                <span>Privacy First</span>
                <span className="w-1 h-1 rounded-full bg-slate-200" />
                <span>Real-time Sync</span>
              </div>
              <p className="text-[10px] text-slate-400/60 font-mono font-bold tracking-widest">PORTFOLIO-X v2.4.0 // SYSTEM: ONLINE</p>
            </div>
          </FadeInSection>
        </div>
      </section>
    </main>
  );
};

export default Launcher;
