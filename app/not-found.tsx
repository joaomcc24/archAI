import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--landing-bg)] text-[var(--landing-text)]">
      <div className="max-w-md w-full text-center">
        <p className="text-xs font-mono tracking-[0.3em] uppercase text-emerald-400 mb-3">
          404
        </p>
        <h1 className="text-2xl font-semibold mb-3">
          Page not found
        </h1>
        <p className="text-sm text-zinc-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-100 transition-colors shadow-sm"
          >
            Go to landing
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-sm font-medium border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

