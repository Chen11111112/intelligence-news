'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, Menu, User, Bookmark, CircleHelp } from 'lucide-react';
import { t } from '@/lib/copy';
import { useNotifications } from '@/hooks/useNotifications';

const GUIDE_URL = 'https://hackmd.io/@HyC-1029/Sk_7Ac1VMx';

export function TopAppBar() {
  const pathname = usePathname();
  const { unread } = useNotifications();

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-10 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 dark:bg-gray-900/80 dark:border-gray-800">
      <div className="flex items-center">
        <Link
          href="/"
          className="font-sans text-xl font-bold text-slate-800 cursor-pointer tracking-tight dark:text-gray-100"
        >
          {t('brand.title')} <span className="text-blue-600">{t('brand.accent')}</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex gap-1">
          <NavButton href="/" active={pathname === '/' || pathname.startsWith('/explore')}>
            {t('nav.explore')}
          </NavButton>
          <NavButton href="/channel" active={pathname === '/channel'}>
            {t('nav.channel')}
          </NavButton>
          <NavButton href="/words" active={pathname === '/words'}>
            {t('nav.words')}
          </NavButton>
          <NavButton href="/profile" active={pathname === '/profile'}>
            {t('nav.profile')}
          </NavButton>
          <GuideButton />
        </div>
        <GuideButton className="md:hidden" />
        <Link
          href="/notifications"
          className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors active:scale-95 text-slate-600 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label={t('nav.notifications')}
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

interface NavButtonProps {
  children: React.ReactNode;
  href: string;
  active: boolean;
}

function NavButton({ children, href, active }: NavButtonProps) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
        active
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
          : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  );
}

function GuideButton({ className = '' }: { className?: string }) {
  return (
    <a
      href={GUIDE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800 ${className}`}
      aria-label={t('nav.guide')}
    >
      <CircleHelp className="w-4 h-4" />
      {t('nav.guide')}
    </a>
  );
}

export function BottomNavBar() {
  const pathname = usePathname();
  const { unread } = useNotifications();

  return (
    <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50 flex justify-around items-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-slate-200 dark:border-gray-700 shadow-lg rounded-3xl px-2 h-16">
      <NavItem
        icon={<Search className="w-5 h-5" />}
        label={t('nav.explore')}
        href="/"
        active={pathname === '/' || pathname.startsWith('/explore')}
      />
      <NavItem
        icon={<Menu className="w-5 h-5" />}
        label={t('nav.channel')}
        href="/channel"
        active={pathname === '/channel'}
      />
      {/* <NavItem
        icon={
          <span className="relative">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </span>
        }
        label={t('nav.notifications')}
        href="/notifications"
        active={pathname === '/notifications'}
      /> */}
      <NavItem
        icon={<Bookmark className="w-5 h-5" />}
        label={t('nav.words')}
        href="/words"
        active={pathname === '/words'}
      />
      <NavItem
        icon={<User className="w-5 h-5" />}
        label={t('nav.profile')}
        href="/profile"
        active={pathname === '/profile'}
      />
    </nav>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
}

function NavItem({ icon, label, href, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center active:scale-95 transition-all w-full h-full rounded-2xl ${
        active
          ? 'text-blue-600 dark:text-blue-400 font-bold'
          : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
      }`}
    >
      {icon}
      <span className="text-[10px] mt-0.5 tracking-wide">{label}</span>
    </Link>
  );
}
