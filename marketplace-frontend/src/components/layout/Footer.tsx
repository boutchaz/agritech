'use client';

import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-slate-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AgroGina</span>
            </div>
            <p className="text-sm">
              {t('tagline')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('product')}</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/products" className="hover:text-white transition">{t('allProducts')}</Link></li>
              <li><Link href="/categories" className="hover:text-white transition">{t('categories')}</Link></li>
              <li><Link href="/sellers" className="hover:text-white transition">{t('partners')}</Link></li>
              <li><Link href="/signup" className="hover:text-white transition">{t('becomeSeller')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('support')}</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="#" className="hover:text-white transition">{t('documentation')}</Link></li>
              <li><Link href="#" className="hover:text-white transition">{t('contact')}</Link></li>
              <li><Link href="#" className="hover:text-white transition">{t('faq')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('legal')}</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="#" className="hover:text-white transition">{t('privacy')}</Link></li>
              <li><Link href="#" className="hover:text-white transition">{t('terms')}</Link></li>
              <li><Link href="#" className="hover:text-white transition">{t('legalNotice')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-center">
          {t('copyright')}
        </div>
      </div>
    </footer>
  );
}
