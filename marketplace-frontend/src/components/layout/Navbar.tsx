'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, ArrowRight, Menu, X, FileText } from 'lucide-react';
import { CartIcon } from '@/components/CartIcon';
import { NotificationBell } from '@/components/NotificationBell';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { user } = useAuth();

  const navLinks = [
    { href: '/products', label: t('products') },
    { href: '/categories', label: t('categories') },
    { href: '/sellers', label: t('partners') },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">AgriTech</span>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Market</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive(link.href)
                    ? 'text-emerald-600 font-medium'
                    : 'text-gray-600 hover:text-gray-900 transition'
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <CartIcon />
            {user && <NotificationBell />}
            {user ? (
              <>
                <Link
                  href="/quote-requests"
                  className={`flex items-center gap-1.5 transition ${
                    isActive('/quote-requests')
                      ? 'text-emerald-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {t('myQuotes')}
                </Link>
                <Link
                  href="/orders"
                  className={`transition ${
                    isActive('/orders')
                      ? 'text-emerald-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('myOrders')}
                </Link>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                >
                  {t('dashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">
                  {t('login')}
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium flex items-center gap-2"
                >
                  {t('getStarted')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4">
          <div className="max-w-7xl mx-auto px-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={
                  isActive(link.href)
                    ? 'block text-emerald-600 font-medium'
                    : 'block text-gray-600 hover:text-gray-900'
                }
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-gray-100" />
            <div className="flex items-center gap-3">
              <CartIcon />
              <span className="text-sm text-gray-500">{t('cart')}</span>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <span className="text-sm text-gray-500">Notifications</span>
              </div>
            )}
            {user ? (
              <>
                <Link
                  href="/quote-requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 ${
                    isActive('/quote-requests')
                      ? 'text-emerald-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {t('myQuotes')}
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block ${
                    isActive('/orders')
                      ? 'text-emerald-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('myOrders')}
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                >
                  {t('dashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-gray-600 hover:text-gray-900"
                >
                  {t('login')}
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                >
                  {t('getStarted')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
