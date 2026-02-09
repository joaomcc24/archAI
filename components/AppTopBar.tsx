'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useMemo, useRef, useState } from 'react';

const navLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/billing',
    label: 'Billing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a5 5 0 00-10 0v2m-2 4h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z" />
      </svg>
    ),
  },
];

export function AppTopBar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const activeIndex = useMemo(() => {
    return Math.max(
      0,
      navLinks.findIndex((link) => pathname === link.href)
    );
  }, [pathname]);

  useEffect(() => {
    const el = linkRefs.current[activeIndex];
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setIndicatorStyle({
      left: rect.left - parentRect.left,
      width: rect.width,
    });
  }, [activeIndex]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="app-topbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sm">
          <Image
            src="/favicon.ico"
            alt="RepoLens"
            width={28}
            height={28}
            className="rounded-md"
          />
          RepoLens
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 relative app-topbar-track">
            <span
              className="app-topbar-indicator"
              style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                ref={(node) => {
                  linkRefs.current[index] = node;
                }}
                className={`app-topbar-link inline-flex items-center gap-2 ${
                  index === activeIndex ? 'app-topbar-link-active' : ''
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          <div
            className="flex items-center gap-1 rounded-full px-1 py-1"
            style={{
              backgroundColor: 'var(--dash-toggle-bg)',
              border: '1px solid var(--dash-toggle-border)',
            }}
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
              style={{
                backgroundColor: theme === 'light' ? 'var(--dash-toggle-active-bg)' : 'transparent',
                color: theme === 'light' ? 'var(--dash-toggle-active-text)' : 'var(--dash-toggle-text)',
              }}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? 'var(--dash-toggle-active-bg)' : 'transparent',
                color: theme === 'dark' ? 'var(--dash-toggle-active-text)' : 'var(--dash-toggle-text)',
              }}
            >
              Dark
            </button>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 px-2.5 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                {user?.email ? user.email[0]?.toUpperCase() : 'U'}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50"
                role="menu"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                </div>
                <div className="py-2">
                  <Link
                    href="/account"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Account settings
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
