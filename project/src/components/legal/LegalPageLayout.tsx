import { Link } from '@tanstack/react-router'
import { ArrowLeft, Calendar, FileText, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LegalTocItem {
  id: string
  label: string
}

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  children: import('react').ReactNode
  /** Small label above the title (e.g. "Confidentialité", "CGU"). */
  heroKicker?: string
  /** Optional icon shown next to the title (defaults to a shield). */
  heroIcon?: import('react').ReactNode
  /** Short intro under the title (omit for pages that only need the heading). */
  heroDescription?: string
  /** Optional table of contents (anchors must match heading ids in content). */
  toc?: LegalTocItem[]
}

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
  heroKicker,
  heroIcon,
  heroDescription,
  toc,
}: LegalPageLayoutProps) {
  const hasToc = toc && toc.length > 0

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-primary/[0.06] via-background to-background dark:from-primary/[0.12]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.18),transparent)]"
        aria-hidden
      />

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Retour à l'accueil
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
            <FileText className="h-3.5 w-3.5" />
            Document légal
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
        <div
          className={cn(
            'grid gap-8 lg:gap-12',
            hasToc && 'lg:grid-cols-[minmax(0,1fr)_min(100%,15.5rem)] xl:grid-cols-[minmax(0,1fr)_17rem]',
          )}
        >
          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-lg shadow-primary/5 ring-1 ring-border/40 dark:shadow-primary/10">
              <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent px-6 pb-6 pt-8 dark:from-primary/[0.14] sm:px-8 sm:pb-7 sm:pt-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/25">
                      {heroIcon ?? <Shield className="h-6 w-6" aria-hidden />}
                    </div>
                    <div>
                      {heroKicker ? (
                        <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:bg-muted/20">
                          {heroKicker}
                        </p>
                      ) : null}
                      <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        {title}
                      </h1>
                      {heroDescription ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                          {heroDescription}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground dark:bg-muted/30">
                    <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>Dernière mise à jour : {lastUpdated}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-8 sm:px-8 sm:py-10">
                {hasToc && (
                  <nav
                    aria-label="Sommaire"
                    className="mb-8 lg:hidden"
                  >
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sommaire
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {toc.map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className="shrink-0 rounded-full border border-border/80 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </nav>
                )}

                <div
                  className={cn(
                    'prose prose-neutral max-w-none dark:prose-invert',
                    'prose-lg prose-p:leading-relaxed',
                    'prose-headings:scroll-mt-28 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground',
                    'prose-h2:mt-10 prose-h2:border-b prose-h2:border-border/70 prose-h2:pb-3 prose-h2:text-xl prose-h2:first:mt-0 sm:prose-h2:text-2xl',
                    'prose-h3:mt-6 prose-h3:text-base prose-h3:font-semibold',
                    'prose-p:text-muted-foreground',
                    'prose-li:text-muted-foreground prose-li:marker:text-primary/70',
                    'prose-strong:text-foreground prose-strong:font-semibold',
                  )}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>

          {hasToc && (
            <aside className="hidden lg:block">
              <nav
                aria-label="Sommaire de la page"
                className="sticky top-28 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm dark:bg-card/60"
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sommaire
                </p>
                <ul className="space-y-1 text-sm">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}
        </div>
      </main>

      <footer className="relative border-t border-border/80 bg-muted/30 py-8 text-center text-sm text-muted-foreground dark:bg-muted/20">
        <p>&copy; {new Date().getFullYear()} AgroGina — CodeLovers, Maroc</p>
      </footer>
    </div>
  )
}
