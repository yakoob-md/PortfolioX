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
    className={cx('relative min-h-screen w-full overflow-hidden', className)}
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
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'top 25%',
              scrub: 1,
            },
          });
          if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        }

        if (i < sections.length - 1) {
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: 'bottom bottom',
              end: 'bottom top',
              pin: true,
              pinSpacing: false,
            }),
          );
        }
      });

      ScrollTrigger.refresh();

      return () => {
        triggers.forEach((t) => t.kill());
      };
    },
    { scope: containerRef, dependencies: [reducedMotion] },
  );

  return (
    <main
      ref={containerRef}
      className="w-full overflow-x-hidden bg-black selection:bg-primary/30"
    >
      {/* SECTION 1: HERO */}
      <FlowSection className="bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-950 via-black to-black">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-4xl">
            <div className="relative inline-block">
                <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse shadow-2xl shadow-primary/20">
                    <Shield className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-cyan-400 border-4 border-black animate-ping" />
            </div>

            <div className="space-y-4">
                <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white">
                    Portfolio<span className="text-primary">X</span>
                </h1>
                <p className="text-xl md:text-3xl text-muted-foreground font-medium max-w-2xl mx-auto leading-tight">
                    The next generation of <span className="text-white">Mutual Fund Intelligence</span> is here.
                </p>
            </div>

            <div className="flex flex-col items-center gap-4 pt-12">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary/60">
                    <Sparkles className="w-4 h-4" />
                    Scroll to Explore
                </div>
                <div className="w-px h-24 bg-gradient-to-b from-primary/60 to-transparent animate-bounce" />
            </div>
        </div>
      </FlowSection>

      {/* SECTION 2: MARKET INTELLIGENCE */}
      <FlowSection className="bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-violet-950/40 via-black to-black">
        <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-6xl">
            <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-wider">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Real-time Intelligence
                </div>
                <h2 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                    Every Fund. <br/>
                    <span className="text-violet-400">Zero Lag.</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                    Track over 2,500+ mutual funds with live NAV updates, 10-year rolling returns, and deep AMC insights.
                </p>
            </div>
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                <div className="relative bg-card/40 backdrop-blur-3xl border border-white/10 p-8 rounded-3xl space-y-6">
                    <div className="h-64 w-full bg-gradient-to-br from-violet-500/10 to-transparent rounded-2xl border border-white/5 flex items-center justify-center">
                        {/* Placeholder for animated graph */}
                        <div className="flex items-end gap-2 h-32">
                            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ height: 0 }}
                                    whileInView={{ height: `${h}%` }}
                                    className="w-4 bg-violet-500/40 rounded-t-sm"
                                    transition={{ delay: i * 0.1 }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Market Status</p>
                            <p className="text-white font-mono">ALL SYSTEMS OPERATIONAL</p>
                        </div>
                        <Sparkles className="text-violet-400 w-6 h-6 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
      </FlowSection>

      {/* SECTION 3: WEALTH PROTECTION */}
      <FlowSection className="bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-950/30 via-black to-black">
        <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-6xl">
            <div className="order-2 lg:order-1 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                <div className="relative bg-card/40 backdrop-blur-3xl border border-white/10 p-12 rounded-3xl text-center space-y-8">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <ShieldCheck className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl font-black text-white">1.5%+</p>
                        <p className="text-sm text-emerald-400 font-bold uppercase tracking-widest">Wealth Leakage Saved</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Calculated based on Direct vs Regular plan switching analysis.</p>
                </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5" />
                    Portfolio Strategy
                </div>
                <h2 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                    Stop the <br/>
                    <span className="text-emerald-400">Commissions.</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                    Our tax-optimization engine and cost-leakage audit identify exactly where you are losing wealth to hidden distributor commissions.
                </p>
            </div>
        </div>
      </FlowSection>

      {/* SECTION 4: AI CO-PILOT */}
      <FlowSection className="bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-950/30 via-black to-black">
        <div className="flex flex-col items-center text-center space-y-12 max-w-4xl">
            <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mx-auto">
                    <Bot className="w-3.5 h-3.5" />
                    Conversational IQ
                </div>
                <h2 className="text-5xl md:text-8xl font-bold text-white tracking-tighter">
                    Meet your <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Co-Pilot.</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Powered by Google Gemini, the PortfolioX Intelligence agent answers complex tax and portfolio questions in human language.
                </p>
            </div>
            
            <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-6 text-left font-mono text-sm space-y-4">
                <div className="flex gap-3">
                    <span className="text-blue-400 font-bold">User:</span>
                    <span className="text-gray-300">"Which of my funds have high overlap?"</span>
                </div>
                <div className="flex gap-3">
                    <span className="text-cyan-400 font-bold">AI:</span>
                    <span className="text-white">"Analyzing... I've detected a **42% overlap** between your HDFC and ICICI Large Cap holdings. Consider consolidating to save costs."</span>
                </div>
            </div>
        </div>
      </FlowSection>

      {/* SECTION 5: FINAL LAUNCH */}
      <FlowSection className="bg-black">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-12">
            <div className="space-y-4">
                <h2 className="text-6xl md:text-8xl font-black text-white tracking-tight">
                    Ready to <br/>Optimize?
                </h2>
                <p className="text-lg text-muted-foreground font-medium">Join thousands of smart investors today.</p>
            </div>

            <Button 
                size="lg" 
                onClick={onLaunch}
                className="group h-20 px-12 rounded-full bg-white text-black hover:bg-primary hover:text-white text-2xl font-black transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
            >
                Launch Dashboard
                <ArrowRight className="ml-4 w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </Button>

            <div className="pt-24 flex flex-col items-center gap-6">
                 <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <span>No Sign-up required</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>Privacy First</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>Real-time Sync</span>
                 </div>
                 <p className="text-[10px] text-muted-foreground/40 font-mono">PORTFOLIO-X v2.4.0 // SYSTEM: ONLINE</p>
            </div>
        </div>
      </FlowSection>
    </main>
  );
};

export default Launcher;
