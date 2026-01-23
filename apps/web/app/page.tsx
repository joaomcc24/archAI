'use client';

import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white scroll-smooth">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.ico" alt="RepoLens" className="w-8 h-8" />
            <span className="font-semibold text-slate-900 text-lg">RepoLens</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: '#0f172a' }}>Features</a>
            <a href="#pricing" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: '#0f172a' }}>Pricing</a>
            <a href="#how-it-works" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: '#0f172a' }}>How it works</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: '#0f172a' }}>
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-600 mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Now with AI-powered task generation
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
            Understand your codebase
            <span className="block text-blue-600">in minutes, not hours</span>
          </h1>
          
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            RepoLens connects to your GitHub repository and generates comprehensive architecture 
            documentation using AI. Stop wasting time onboarding — start building.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={user ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20"
            >
              Start for free
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-3.5 font-medium rounded-xl transition-all"
              style={{ backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }}
            >
              See how it works
            </a>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            No credit card required • Free tier available
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: '#0f172a' }}>
                Documentation that stays in sync
              </h2>
              <p className="text-lg mb-8" style={{ color: '#475569' }}>
                Traditional documentation gets outdated the moment you write it. RepoLens 
                generates fresh documentation directly from your codebase, every time.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0f172a' }}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span style={{ color: '#334155' }}>Works with any GitHub repository — public or private</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0f172a' }}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span style={{ color: '#334155' }}>Understands your tech stack, folder structure, and patterns</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0f172a' }}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span style={{ color: '#334155' }}>Export as Markdown — paste into your repo or share with your team</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl overflow-hidden border shadow-xl" style={{ borderColor: '#e2e8f0' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e2e8f0' }}></div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e2e8f0' }}></div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e2e8f0' }}></div>
                </div>
                <span className="text-xs ml-2" style={{ color: '#64748b' }}>architecture.md</span>
              </div>
              <div className="p-5 font-mono text-sm" style={{ backgroundColor: '#ffffff' }}>
                <p style={{ color: '#94a3b8' }}># Architecture Overview</p>
                <p className="mt-2" style={{ color: '#334155' }}>A Next.js 15 monorepo with Express API backend.</p>
                <p className="mt-3" style={{ color: '#94a3b8' }}>## Tech Stack</p>
                <p style={{ color: '#334155' }}>• React 19 + TypeScript</p>
                <p style={{ color: '#334155' }}>• Supabase for auth & database</p>
                <p style={{ color: '#334155' }}>• TailwindCSS for styling</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16" style={{ color: '#0f172a' }}>
            Up and running in 60 seconds
          </h2>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px" style={{ backgroundColor: '#e2e8f0' }}></div>
            
            <div className="space-y-12">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 relative z-10" style={{ backgroundColor: '#0f172a' }}>1</div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#0f172a' }}>Connect GitHub</h3>
                  <p style={{ color: '#64748b' }}>One-click OAuth. Select any repository you have access to.</p>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 relative z-10" style={{ backgroundColor: '#0f172a' }}>2</div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#0f172a' }}>Generate</h3>
                  <p style={{ color: '#64748b' }}>Click one button. Get a complete architecture overview in ~30 seconds.</p>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 relative z-10" style={{ backgroundColor: '#0f172a' }}>3</div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#0f172a' }}>Use it</h3>
                  <p style={{ color: '#64748b' }}>Copy, download, or generate task plans for new features.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold" style={{ color: '#0f172a' }}>Simple, transparent pricing</h2>
            <p className="mt-4" style={{ color: '#64748b' }}>Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard
              name="Free"
              price="€0"
              period=""
              description="Perfect for trying out RepoLens"
              features={[
                "1 GitHub repository",
                "3 snapshots per month",
                "10 task generations",
                "Community support",
              ]}
              buttonText="Get started"
              buttonHref="/signup"
              highlighted={false}
            />
            <PricingCard
              name="Pro"
              price="€19"
              period="/month"
              description="For developers and small teams"
              features={[
                "Up to 5 repositories",
                "Unlimited snapshots",
                "Unlimited task generations",
                "Priority support",
                "Export to PDF",
              ]}
              buttonText="Start free trial"
              buttonHref="/signup"
              highlighted={true}
            />
            <PricingCard
              name="Team"
              price="€49"
              period="/month"
              description="For growing engineering teams"
              features={[
                "Unlimited repositories",
                "Unlimited everything",
                "Priority support",
                "Team collaboration",
                "Custom integrations",
              ]}
              buttonText="Contact us"
              buttonHref="/signup"
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#0f172a' }}>
            Try it on your repo — it&apos;s free
          </h2>
          <Link
            href={user ? "/dashboard" : "/signup"}
            className="inline-block px-8 py-3.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.ico" alt="RepoLens" className="w-6 h-6" />
            <span className="font-semibold text-slate-900">RepoLens</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 RepoLens. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

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
      className={`relative p-8 rounded-2xl ${
        highlighted
          ? 'bg-slate-900 text-white ring-4 ring-slate-900/10'
          : 'bg-white border border-slate-200'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
            Most popular
          </span>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className={`text-lg font-semibold ${highlighted ? 'text-white' : 'text-slate-900'}`}>{name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={`text-4xl font-bold ${highlighted ? 'text-white' : 'text-slate-900'}`}>{price}</span>
          <span className={highlighted ? 'text-slate-400' : 'text-slate-500'}>{period}</span>
        </div>
        <p className={`mt-2 text-sm ${highlighted ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <svg
              className={`w-5 h-5 flex-shrink-0 ${highlighted ? 'text-emerald-400' : 'text-emerald-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className={`text-sm ${highlighted ? 'text-slate-300' : 'text-slate-600'}`}>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={buttonHref}
        className="block w-full py-3 text-center font-medium rounded-xl transition-all"
        style={
          highlighted
            ? { backgroundColor: '#ffffff', color: '#0f172a' }
            : { backgroundColor: '#0f172a', color: '#ffffff' }
        }
      >
        {buttonText}
      </Link>
    </div>
  );
}