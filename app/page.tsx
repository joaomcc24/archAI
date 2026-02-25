'use client';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, ReactNode } from 'react';

// ─── Scroll-triggered fade + slide up ──────────────────────────
function FadeIn({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Typewriter effect ─────────────────────────────────────────
function Typewriter({ lines }: { lines: { text: string; color: string }[] }) {
  const [displayedLines, setDisplayedLines] = useState<{ text: string; color: string }[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setStarted(true);
      },
      { threshold: 0.4 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started || currentLine >= lines.length) return;
    const line = lines[currentLine];
    if (currentChar <= line.text.length) {
      const t = setTimeout(() => {
        setDisplayedLines((prev) => {
          const c = [...prev];
          c[currentLine] = { text: line.text.slice(0, currentChar), color: line.color };
          return c;
        });
        setCurrentChar((c) => c + 1);
      }, 20 + Math.random() * 18);
      return () => clearTimeout(t);
    } else {
      setCurrentLine((l) => l + 1);
      setCurrentChar(0);
    }
  }, [started, currentLine, currentChar, lines]);

  return (
    <div ref={ref} className="font-mono text-[13px] leading-relaxed">
      {displayedLines.map((line, i) => (
        <div key={i} style={{ color: line.color }} className="whitespace-pre">
          {line.text}
          {i === currentLine && currentLine < lines.length && (
            <span className="inline-block w-[7px] h-[15px] bg-emerald-400 animate-pulse ml-px align-middle" />
          )}
        </div>
      ))}
      {displayedLines.length === 0 && (
        <div>
          <span className="inline-block w-[7px] h-[15px] bg-emerald-400 animate-pulse align-middle" />
        </div>
      )}
    </div>
  );
}

// ─── Terminal data ─────────────────────────────────────────────
const terminalLines = [
  { text: '# Architecture Overview', color: '#a78bfa' },
  { text: '', color: '' },
  { text: '## Tech Stack', color: '#60a5fa' },
  { text: '  Framework:     Next.js 15 (App Router)', color: '#d4d4d8' },
  { text: '  Language:      TypeScript 5.3', color: '#d4d4d8' },
  { text: '  Database:      Supabase (PostgreSQL)', color: '#d4d4d8' },
  { text: '  Auth:          Supabase + GitHub OAuth', color: '#d4d4d8' },
  { text: '  Styling:       TailwindCSS v4', color: '#d4d4d8' },
  { text: '', color: '' },
  { text: '## Service Architecture', color: '#60a5fa' },
  { text: '  API Layer      → /app/api/** (Route Handlers)', color: '#a1a1aa' },
  { text: '  Services       → /lib/services/** (Business Logic)', color: '#a1a1aa' },
  { text: '  Auth           → /lib/auth.ts (JWT + Supabase)', color: '#a1a1aa' },
  { text: '', color: '' },
  { text: '  ✓ 47 files analyzed  ✓ 3 services detected', color: '#34d399' },
];

// ─── Page ──────────────────────────────────────────────────────
export default function Home() {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const cta = user ? '/dashboard' : '/signup';

  return (
    <div className="landing min-h-screen bg-[var(--landing-bg)] text-[var(--landing-text)] selection:bg-emerald-500/30 overflow-x-hidden">
      {/* ─── Grain texture overlay ─── */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none z-[100]"
        style={{ opacity: 0.018 }}
      >
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* ─── NAV ────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50">
        <div
          className="absolute inset-0 backdrop-blur-2xl border-b border-white/[0.04]"
          style={{ backgroundColor: 'var(--landing-nav)' }}
        />
        <div className="relative max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/favicon.ico"
              alt="RepoLens"
              width={32}
              height={32}
              className="rounded-lg shadow-lg shadow-emerald-500/20"
            />
            <span className="font-semibold text-[15px] tracking-tight">RepoLens</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How it works', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-[13px] text-zinc-500 hover:text-white transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
              {(['light', 'dark'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={theme === option}
                  onClick={() => setTheme(option)}
                  className={`px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase rounded-full transition-colors ${
                    theme === option
                      ? 'bg-white text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                  style={theme === option ? { color: '#0a0a0a' } : undefined}
                >
                  {option === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
            {user ? (
              <Link
                href="/dashboard"
                className="text-[13px] px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
                style={{ color: '#0a0a0a' }}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[13px] text-zinc-400 hover:text-white transition-colors px-3 py-2"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="text-[13px] px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
                  style={{ color: '#0a0a0a' }}
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="relative md:hidden border-t border-white/[0.04] backdrop-blur-2xl pb-4"
            style={{ backgroundColor: 'var(--landing-nav)' }}
          >
            <div className="px-6 pt-4 space-y-3">
              {['Features', 'How it works', 'Pricing'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm text-zinc-400 hover:text-white py-1"
                >
                  {item}
                </a>
              ))}
              <div className="pt-3 border-t border-white/[0.04] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Theme</span>
                  <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
                    {(['light', 'dark'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={theme === option}
                        onClick={() => setTheme(option)}
                        className={`px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase rounded-full transition-colors ${
                          theme === option
                            ? 'bg-white text-black'
                            : 'text-white/70 hover:text-white'
                        }`}
                        style={theme === option ? { color: '#0a0a0a' } : undefined}
                      >
                        {option === 'dark' ? 'Dark' : 'Light'}
                      </button>
                    ))}
                  </div>
                </div>
                {user ? (
                  <Link
                    href="/dashboard"
                    className="text-sm px-4 py-2.5 rounded-lg bg-white text-black font-medium text-center"
                    style={{ color: '#0a0a0a' }}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="text-sm text-zinc-400 hover:text-white py-2">
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="text-sm px-4 py-2.5 rounded-lg bg-white text-black font-medium text-center"
                      style={{ color: '#0a0a0a' }}
                    >
                      Get started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center px-6 pt-16 pb-20 overflow-hidden">
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--landing-grid) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Radial glow */}
        <div
          className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full blur-[140px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, var(--landing-hero-glow) 0%, transparent 70%)' }}
        />
        {/* Secondary glow */}
        <div
          className="absolute top-[60%] right-[10%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, var(--landing-hero-glow-2) 0%, transparent 70%)' }}
        />

        <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-20 items-center">
          {/* ── Left: Copy ── */}
          <div>
            <FadeIn>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] text-[13px] text-emerald-700/80 mb-8 font-mono">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                Now live — drift detection &amp; teams &amp; task planning
              </div>
            </FadeIn>

            <FadeIn delay={0.06}>
              <h1 className="text-[clamp(2.5rem,5.5vw,4.2rem)] font-bold leading-[1.05] tracking-[-0.035em]">
                Stop explaining
                <br />
                your codebase.
              </h1>
            </FadeIn>

            <FadeIn delay={0.12}>
              <p className="mt-3 text-[clamp(1.35rem,3vw,2rem)] font-semibold bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent leading-[1.2]">
                Let it explain itself.
              </p>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="mt-4 h-px w-40 bg-gradient-to-r from-emerald-400/70 via-teal-300/70 to-transparent animate-shimmer" />
            </FadeIn>

            <FadeIn delay={0.18}>
              <p className="mt-7 text-[17px] text-zinc-400 leading-[1.7] max-w-lg">
                Connect a GitHub repo and get a full architecture overview in
                30&nbsp;seconds. Track drift over time. Plan features with&nbsp;AI.
              </p>
            </FadeIn>

            <FadeIn delay={0.24}>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Link
                  href={cta}
                  className="group px-7 py-3.5 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/[0.06]"
                  style={{ color: '#0a0a0a' }}
                >
                  Start for free
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="#how-it-works"
                  className="px-7 py-3.5 rounded-xl text-[15px] font-medium border border-white/[0.12] text-white/70 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all text-center"
                >
                  See how it works
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <p className="mt-5 text-[13px] text-zinc-600 font-mono tracking-tight">
                Free forever &middot; No credit card
              </p>
            </FadeIn>
          </div>

          {/* ── Right: Terminal ── */}
          <FadeIn delay={0.15} className="relative animate-float">
            {/* Outer glow */}
            <div
              className="absolute -inset-8 rounded-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.07) 0%, transparent 70%)' }}
            />
            {/* Gradient border wrapper */}
            <div className="relative p-px rounded-2xl bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-white/[0.02]">
              <div className="rounded-[15px] bg-[#0c0c0f] shadow-2xl shadow-black/50 overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[11px] text-zinc-600 font-mono">architecture.md</span>
                  <div className="w-16" />
                </div>
                {/* Terminal body */}
                <div className="p-6 min-h-[260px]">
                  <Typewriter lines={terminalLines} />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Gradient separator ── */}
      <div
        className="h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--landing-line), transparent)' }}
      />

      {/* ─── FEATURES — Bento Grid ──────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="max-w-xl mb-12">
              <span className="text-[12px] font-medium text-emerald-400 tracking-[0.25em] uppercase font-mono block mb-4">
                Features
              </span>
              <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] leading-[1.15]">
                Every tool your
                <br />
                docs need.
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ── Architecture docs — large card ── */}
            <FadeIn delay={0.05} className="lg:col-span-2 lg:row-span-2">
              <div className="group h-full p-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] transition-all duration-500 relative overflow-hidden flex flex-col">
                <div className="relative z-10 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 tracking-tight">Architecture documentation</h3>
                  <p className="text-[15px] text-zinc-400 leading-relaxed max-w-md">
                    Full <span className="font-mono text-zinc-300">architecture.md</span> generated from your actual codebase.
                    Tech stack, services, data flow — all detected automatically.
                  </p>
                </div>

                {/* Inline code preview */}
                <div className="relative z-10 mt-8 rounded-xl border border-white/[0.06] bg-[#0a0a0e] p-5 font-mono text-[12px] leading-relaxed overflow-hidden">
                  <div className="text-purple-400"># Architecture Overview</div>
                  <div className="text-blue-400 mt-1.5">## Tech Stack</div>
                  <div className="text-zinc-400 ml-2">Framework:&nbsp;&nbsp;&nbsp;Next.js 15</div>
                  <div className="text-zinc-400 ml-2">Database:&nbsp;&nbsp;&nbsp;&nbsp;Supabase</div>
                  <div className="text-zinc-400 ml-2">Auth:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;GitHub OAuth</div>
                  <div className="text-blue-400 mt-1.5">## Services</div>
                  <div className="text-zinc-500 ml-2">API → /app/api/**</div>
                  <div className="text-zinc-500 ml-2">Lib → /lib/services/**</div>
                  <div className="text-emerald-400 mt-1.5">✓ 47 files&nbsp;&nbsp;✓ 3 services</div>
                  {/* Bottom fade */}
                  <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-[#0a0a0e] to-transparent" />
                </div>

                {/* Corner glow */}
                <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-emerald-500/[0.03] rounded-full blur-3xl group-hover:bg-emerald-500/[0.07] transition-all duration-700 pointer-events-none" />
              </div>
            </FadeIn>

            {/* ── Drift detection ── */}
            <FadeIn delay={0.1}>
              <div className="group h-full p-7 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] transition-all duration-500 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-semibold mb-2 tracking-tight">Drift detection</h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed flex-1">
                  Know when code drifts from your last snapshot. Get a score, see exactly what changed.
                </p>
                {/* Mini drift bar */}
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full w-[12%] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">12%</span>
                </div>
              </div>
            </FadeIn>

            {/* ── Task planning ── */}
            <FadeIn delay={0.15}>
              <div className="group h-full p-7 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] transition-all duration-500 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-semibold mb-2 tracking-tight">Task planning</h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed flex-1">
                  Describe a feature in plain English. Get a step-by-step implementation plan.
                </p>
                {/* Mini task list */}
                <div className="mt-6 space-y-2.5 font-mono text-[11px]">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-emerald-400">✓</span> Setup auth middleware
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-emerald-400">✓</span> Add rate limiting
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="text-zinc-700">○</span> Write integration tests
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* ── Team collaboration ── */}
            <FadeIn delay={0.2}>
              <div className="group h-full p-7 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] transition-all duration-500">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-semibold mb-2 tracking-tight">Team collaboration</h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed">
                  Invite members, assign roles, share projects. Same page — literally.
                </p>
                {/* Mini avatar stack */}
                <div className="mt-6 flex items-center">
                  <div className="flex -space-x-2">
                    {[
                      { bg: '#3b82f6', letter: 'J' },
                      { bg: '#8b5cf6', letter: 'A' },
                      { bg: '#ec4899', letter: 'M' },
                      { bg: '#f59e0b', letter: 'S' },
                    ].map((avatar, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full border-2 border-[#111113] flex items-center justify-center text-[10px] font-bold text-white/90"
                        style={{ backgroundColor: avatar.bg, zIndex: 4 - i }}
                      >
                        {avatar.letter}
                      </div>
                    ))}
                  </div>
                  <span className="ml-3 text-[11px] text-zinc-600 font-mono">+ invite</span>
                </div>
              </div>
            </FadeIn>

            {/* ── PDF export ── */}
            <FadeIn delay={0.25}>
              <div className="group h-full p-7 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] transition-all duration-500">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-semibold mb-2 tracking-tight">PDF export</h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed">
                  Download snapshots as clean PDFs. Great for reviews, onboarding, or stakeholders.
                </p>
              </div>
            </FadeIn>

            {/* ── Private & secure ── */}
            <FadeIn delay={0.3}>
              <div className="group h-full p-7 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] transition-all duration-500">
                <div className="w-10 h-10 rounded-xl bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-semibold mb-2 tracking-tight">Private &amp; secure</h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed">
                  GitHub OAuth with minimal scopes. Code processed in memory — never stored.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── Gradient separator ── */}
      <div
        className="h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--landing-line), transparent)' }}
      />

      {/* ─── HOW IT WORKS ───────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <span className="text-[12px] font-medium text-emerald-400 tracking-[0.25em] uppercase font-mono block mb-4">
                How it works
              </span>
              <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em]">
                Three steps. Sixty seconds.
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Connect your repo',
                desc: "Sign in with GitHub, pick a repository and a branch. No config files, no setup.",
              },
              {
                step: '02',
                title: 'Generate docs',
                desc: 'One click. RepoLens parses your file tree, detects your stack, and generates architecture.md.',
              },
              {
                step: '03',
                title: 'Ship with confidence',
                desc: 'Use snapshots for onboarding, track drift over time, and plan features with task generation.',
              },
            ].map((item, i) => (
              <FadeIn key={item.step} delay={0.05 + i * 0.08}>
                <div className="relative h-full">
                  {i < 2 && (
                    <div className="hidden md:block absolute top-14 left-full w-full h-px bg-gradient-to-r from-white/[0.06] to-transparent -translate-x-6 z-0" />
                  )}
                  <div className="relative z-10 h-full p-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] transition-all duration-500">
                    <div
                      className="text-[42px] font-bold leading-none mb-6 font-mono select-none"
                      style={{ color: 'var(--landing-step)' }}
                    >
                      {item.step}
                    </div>
                    <h3 className="text-lg font-semibold mb-3 tracking-tight">{item.title}</h3>
                    <p className="text-[14px] text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Gradient separator ── */}
      <div
        className="h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--landing-line), transparent)' }}
      />

      {/* ─── PRICING ────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="text-[12px] font-medium text-emerald-400 tracking-[0.25em] uppercase font-mono block mb-4">
                Pricing
              </span>
              <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em]">
                Start free. Scale when ready.
              </h2>
              <p className="mt-4 text-zinc-500 text-lg">No surprises. Cancel anytime.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FadeIn delay={0.05}>
              <PricingCard
                name="Free"
                price="€0"
                period=""
                description="For trying things out"
                features={[
                  '1 GitHub repository',
                  '3 snapshots / month',
                  '10 task generations',
                  'Community support',
                ]}
                buttonText="Get started"
                buttonHref="/signup"
                highlighted={false}
              />
            </FadeIn>
            <FadeIn delay={0.1}>
              <PricingCard
                name="Pro"
                price="€19"
                period="/mo"
                description="For individual developers"
                features={[
                  'Up to 5 repositories',
                  'Unlimited snapshots',
                  'Unlimited tasks',
                  'Priority support',
                  'PDF export',
                ]}
                buttonText="Start free trial"
                buttonHref="/signup"
                highlighted={true}
              />
            </FadeIn>
            <FadeIn delay={0.15}>
              <PricingCard
                name="Team"
                price="€49"
                period="/mo"
                description="For engineering teams"
                features={[
                  'Unlimited repositories',
                  'Unlimited everything',
                  'Team collaboration',
                  'Priority support',
                  'PDF export',
                ]}
                buttonText="Get started"
                buttonHref="/signup"
                highlighted={false}
              />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── Gradient separator ── */}
      <div
        className="h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--landing-line), transparent)' }}
      />

      {/* ─── CTA ────────────────────────────────────────────── */}
      <section className="py-20 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.05) 0%, transparent 70%)' }}
        />
        <FadeIn>
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] mb-5">
              Try it on your repo.
            </h2>
            <p className="text-zinc-500 text-lg mb-10">
              Takes 30 seconds. No credit card. No setup.
            </p>
            <Link
              href={cta}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-zinc-100 transition-all shadow-lg shadow-white/[0.06]"
              style={{ color: '#0a0a0a' }}
            >
              Get started free
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <Image
              src="/favicon.ico"
              alt="RepoLens"
              width={24}
              height={24}
              className="rounded-md shadow-lg shadow-emerald-500/20"
            />
            <span className="text-[14px] font-medium text-zinc-500">RepoLens</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-zinc-600">
            <a href="#features" className="hover:text-zinc-300 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-zinc-300 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-zinc-300 transition-colors">Pricing</a>
          </div>
          <p className="text-[13px] text-zinc-700">&copy; 2026 RepoLens</p>
        </div>
      </footer>
    </div>
  );
}

// ─── Pricing card ──────────────────────────────────────────────
function PricingCard({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  buttonHref,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonHref: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`relative h-full p-7 rounded-2xl transition-all duration-500 ${
        highlighted
          ? 'bg-white/[0.04] border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/[0.06]'
          : 'border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1]'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-[11px] font-semibold px-3.5 py-1 rounded-full bg-emerald-500 text-white tracking-wide">
            Most popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-[15px] font-semibold text-zinc-300">{name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white tracking-tight">{price}</span>
          <span className="text-zinc-600 text-sm">{period}</span>
        </div>
        <p className="mt-2 text-[13px] text-zinc-600">{description}</p>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-3">
            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[13px] text-zinc-400">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={buttonHref}
        className={`block w-full py-3 text-center text-[14px] font-semibold rounded-xl transition-all ${
          highlighted
            ? 'bg-white text-black hover:bg-zinc-100 shadow-md shadow-white/[0.06]'
            : 'border border-white/[0.12] text-white/80 hover:bg-white/[0.05] hover:border-white/20 hover:text-white'
        }`}
        style={highlighted ? { color: '#0a0a0a' } : undefined}
      >
        {buttonText}
      </Link>
    </div>
  );
}
