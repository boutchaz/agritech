import React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

interface AuthLayoutProps {
  title: string
  subtitle: string
  helperText?: string
  switchLabel: string
  switchHref: string
  switchCta: string
  children: React.ReactNode
  backHref?: string
  backLabel?: string
}

const highlights = [
  {
    title: 'Satellite-powered insights',
    description: 'Track crop health, soil moisture, and growth trends with high-resolution imagery.',
  },
  {
    title: 'Collaborative workflows',
    description: 'Invite your agronomy team to coordinate scouting, irrigation, and field operations.',
  },
  {
    title: 'Secure multi-tenant access',
    description: 'Granular permissions keep every farm, field, and stakeholder on the right page.',
  },
]

export function AuthLayout({
  title,
  subtitle,
  helperText,
  switchLabel,
  switchHref,
  switchCta,
  children,
  backHref,
  backLabel,
}: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen bg-slate-950">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="pointer-events-none absolute -top-1/3 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-emerald-500/30 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 right-[-10%] h-[420px] w-[420px] rounded-full bg-lime-400/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-[380px] w-[380px] rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1f5139_0%,_transparent_55%)] opacity-50" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl lg:flex lg:flex-col">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-200">
              Powered by Agritech
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white">
              Manage your fields with confidence
            </h1>
            <p className="mt-4 max-w-lg text-base text-emerald-100/80">
              Stay ahead of weather swings and crop stress with actionable intelligence, intuitive planning tools, and alerts tailored to your farm operations.
            </p>
            <ul className="mt-8 space-y-5 text-sm text-emerald-100/80">
              {highlights.map((highlight) => (
                <li key={highlight.title} className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-gradient-to-br from-emerald-300 to-lime-200" />
                  <div>
                    <p className="font-medium text-white">{highlight.title}</p>
                    <p className="mt-1 leading-relaxed text-emerald-100/75">{highlight.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center gap-3 pt-10 text-sm text-emerald-100/80">
              <svg
                className="size-10 rounded-xl bg-white/10 p-2 text-emerald-200"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7.5l9-4.5 9 4.5M4.5 8.25L12 12l7.5-3.75M4.5 12.75L12 16.5l7.5-3.75M4.5 17.25L12 21l7.5-3.75"
                />
              </svg>
              <div>
                <p className="font-semibold text-white">Built for modern agronomists</p>
                <p className="text-emerald-100/75">Unified analytics, spatial data, and team workflows.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -m-6 rounded-[32px] bg-gradient-to-br from-emerald-500/20 via-transparent to-lime-400/10 blur-3xl" aria-hidden="true" />
            <div className="relative rounded-[28px] border border-white/40 bg-white/95 p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur">
              {backHref && (
                <div className="mb-6">
                  <Link
                    to={backHref}
                    className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-500"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {backLabel ?? 'Retour à l’accueil'}
                  </Link>
                </div>
              )}
              <div className="flex flex-col gap-10">
                <div className="space-y-4 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {subtitle}
                  </div>
                  <h2 className="text-3xl font-semibold text-slate-900">{title}</h2>
                  {helperText && <p className="text-sm text-slate-500">{helperText}</p>}
                </div>

                {children}

                <div className="flex items-center justify-center gap-1 text-sm text-slate-500">
                  <span>{switchLabel}</span>
                  <Link
                    to={switchHref}
                    className="font-medium text-emerald-600 transition hover:text-emerald-500"
                  >
                    {switchCta}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
