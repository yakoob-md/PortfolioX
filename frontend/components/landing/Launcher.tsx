'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Shield, Sparkles, TrendingUp, ShieldCheck, Zap, ArrowRight, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

function cx(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export interface FlowSectionProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  'aria-label'?: string;
}

export const FlowSection: React.FC<FlowSectionProps> = ({
  className,
  style = {},
  children,
  'aria-label': ariaLabel,
}) => (
  <section
    data-flow-section
    aria-label={ariaLabel}
    className={cx('relative min-h-screen w-full overflow-visible', className)}
  >
    <div
      data-flow-inner
      className={cx(
        'flow-art-container relative flex min-h-screen w-full flex-col justify-center items-center gap-12 px-[8vw] pt-[clamp(2rem,8vw,4vw)] pb-[4vw]',
        'will-change-transform',
      )}
      style={{ transformOrigin: 'bottom left', ...style }}
    >
      {children}
    </div>
  </section>
);

interface LauncherProps {
    onLaunch: () => void;
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

  useGSAP(
    () => {
      if (!containerRef.current || reducedMotion) return;

      const sections = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>('[data-flow-section]'),
      );
      if (sections.length === 0) return;

      const triggers: ScrollTrigger[] = [];

      sections.forEach((section, i) => {
        gsap.set(section, { zIndex: i + 1 });

        const inner = section.querySelector<HTMLElement>('.flow-art-container');
        if (!inner) return;

        if (i > 0) {
          gsap.set(inner, { rotation: 30, transformOrigin: 'bottom left' });
          const tween = gsap.to(inner, {
            rotation: 0,
            ease: 'none',
            force3D: true,
            immediateRender: false,
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'top top',
              scrub: true,
            },
          });
          if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        }

        // Pinning logic for layered effect
        triggers.push(
          ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            pin: true,
            pinSpacing: false,
            pinType: 'fixed',
            anticipatePin: 1,
            invalidateOnRefresh: true,
          }),
        );
      });

      ScrollTrigger.refresh();

      return () => {
        triggers.forEach((t) => t.kill());
      };
    },
    { scope: containerRef, dependencies: [reducedMotion] },
  );

  useEffect(() => {
    // Extra refresh after components mount
    const timer = setTimeout(() => ScrollTrigger.refresh(), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLaunch = () => {
    // Kill all scroll triggers before exiting
    ScrollTrigger.getAll().forEach(t => t.kill());
    // Reset scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    onLaunch();
  };

  return (
    <main
      ref={containerRef}
      className="w-full bg-white selection:bg-primary/20 text-slate-900"
    >
      {/* SECTION 1: HERO */}
      <FlowSection className="bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-50 via-white to-white">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-4xl">
            <div className="relative inline-block">
                <div className="w-24 h-24 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center shadow-xl shadow-primary/5">
                    <Shield className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 border-4 border-white animate-pulse" />
            </div>

            <div className="space-y-4">
                <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-slate-900">
                    Portfolio<span className="text-primary">X</span>
                </h1>
                <p className="text-xl md:text-3xl text-slate-500 font-medium max-w-2xl mx-auto leading-tight">
                    The next generation of <span className="text-slate-900">Mutual Fund Intelligence</span> is here.
                </p>
            </div>

            <div className="flex flex-col items-center gap-4 pt-12">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                    <Sparkles className="w-4 h-4" />
                    Scroll to Explore
                </div>
                <div className="w-px h-24 bg-gradient-to-b from-primary/30 to-transparent" />
            </div>
        </div>
      </FlowSection>

      {/* SECTION 2: MARKET INTELLIGENCE */}
      <FlowSection className="bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white">
        <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-6xl">
            <div className="space-y-8 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-bold uppercase tracking-wider">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Real-time Intelligence
                </div>
                <h2 className="text-5xl md:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                    Every Fund. <br/>
                    <span className="text-primary">Zero Lag.</span>
                </h2>
                <p className="text-lg text-slate-500 leading-relaxed max-w-md">
                    Track over 2,500+ mutual funds with live NAV updates, 10-year rolling returns, and deep AMC insights.
                </p>
            </div>
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-[0.1] group-hover:opacity-[0.15] transition duration-1000" />
                <div className="relative bg-white border border-slate-200 p-8 rounded-3xl shadow-2xl shadow-blue-500/5 space-y-6">
                    <div className="h-64 w-full bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
                        <div className="flex items-end gap-2 h-32">
                            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                                <div 
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className="w-4 bg-primary/20 rounded-t-sm transition-all duration-1000"
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
            </div>
        </div>
      </FlowSection>

      {/* SECTION 3: WEALTH PROTECTION */}
      <FlowSection className="bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-blue-50/30 via-white to-white">
        <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-6xl">
            <div className="order-2 lg:order-1 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur opacity-[0.1] transition duration-1000" />
                <div className="relative bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-8 shadow-2xl shadow-emerald-500/5">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <ShieldCheck className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl font-black text-slate-900">1.5%+</p>
                        <p className="text-sm text-emerald-600 font-bold uppercase tracking-widest">Wealth Leakage Saved</p>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">Calculated based on Direct vs Regular plan switching analysis for a 20-year horizon.</p>
                </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5" />
                    Portfolio Strategy
                </div>
                <h2 className="text-5xl md:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                    Stop the <br/>
                    <span className="text-emerald-600">Commissions.</span>
                </h2>
                <p className="text-lg text-slate-500 leading-relaxed">
                    Our tax-optimization engine and cost-leakage audit identify exactly where you are losing wealth to hidden distributor commissions.
                </p>
            </div>
        </div>
      </FlowSection>

      {/* SECTION 4: AI CO-PILOT */}
      <FlowSection className="bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/40 via-white to-white">
        <div className="flex flex-col items-center text-center space-y-12 max-w-4xl">
            <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-bold uppercase tracking-wider mx-auto">
                    <Bot className="w-3.5 h-3.5" />
                    Conversational IQ
                </div>
                <h2 className="text-5xl md:text-8xl font-bold text-slate-900 tracking-tighter">
                    Meet your <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Co-Pilot.</span>
                </h2>
                <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                    Powered by Google Gemini, the PortfolioX Intelligence agent answers complex tax and portfolio questions in human language.
                </p>
            </div>
            
            <div className="w-full max-w-2xl bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left font-mono text-sm space-y-4 shadow-xl">
                <div className="flex gap-3">
                    <span className="text-blue-600 font-bold">User:</span>
                    <span className="text-slate-600">"Which of my funds have high overlap?"</span>
                </div>
                <div className="flex gap-3">
                    <span className="text-indigo-600 font-bold">AI:</span>
                    <span className="text-slate-900">"Analyzing... I've detected a **42% overlap** between your HDFC and ICICI Large Cap holdings. Consider consolidating to save costs."</span>
                </div>
            </div>
        </div>
      </FlowSection>

      {/* SECTION 5: FINAL LAUNCH */}
      <FlowSection className="bg-white">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-12">
            <div className="space-y-4">
                <h2 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight">
                    Ready to <br/>Optimize?
                </h2>
                <p className="text-lg text-slate-500 font-medium">Join thousands of smart investors today.</p>
            </div>

            <Button 
                size="lg" 
                onClick={handleLaunch}
                className="group h-20 px-12 rounded-full bg-slate-900 text-white hover:bg-primary text-2xl font-black transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl shadow-slate-900/10"
            >
                Launch Dashboard
                <ArrowRight className="ml-4 w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </Button>

            <div className="pt-24 flex flex-col items-center gap-6">
                 <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span>No Sign-up required</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span>Privacy First</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span>Real-time Sync</span>
                 </div>
                 <p className="text-[10px] text-slate-400/60 font-mono font-bold tracking-widest">PORTFOLIO-X v2.4.0 // SYSTEM: ONLINE</p>
            </div>
        </div>
      </FlowSection>
    </main>
  );
};

export default Launcher;
