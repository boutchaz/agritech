import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { BlogsService, BlogPost, BlogCategory } from './blogs.service';
import { ConfigService } from '@nestjs/config';

const SUPPORTED_LOCALES = ['fr', 'ar', 'en'];

interface TranslationStrings {
  [key: string]: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  fr: {
    blogTitle: 'Insights pour l\'Agriculture Moderne',
    blogSubtitle: 'Découvrez les dernières tendances, bonnes pratiques et innovations en technologie agricole.',
    featuredArticles: 'Articles à la une',
    allArticles: 'Tous les articles',
    allCategories: 'Toutes',
    prevPage: 'Précédent',
    nextPage: 'Suivant',
    noPosts: 'Aucun article pour le moment.',
    backToBlog: 'Retour au blog',
    share: 'Partager',
    copyLink: 'Copier le lien',
    tableOfContents: 'Sommaire',
    relatedArticles: 'Articles similaires',
    newsletterTitle: 'Newsletter',
    newsletterDescription: 'Recevez les dernières analyses agricoles dans votre boîte mail.',
    emailPlaceholder: 'Votre email',
    subscribe: 'S\'abonner',
    demoTitle: 'Voir une démo',
    demoDescription: 'Découvrez comment AgroGina peut transformer votre exploitation.',
    bookDemo: 'Réserver une démo',
    tryCta: 'Essayer gratuitement',
    ctaTitle: 'Prêt à moderniser votre exploitation ?',
    ctaDescription: 'Rejoignez les agriculteurs qui utilisent AgroGina pour optimiser leur production.',
    authorBio: 'Expert en technologie agricole et transformation digitale des exploitations.',
    footerDescription: 'La suite de gestion agricole tout-en-un pour les exploitations au Maroc.',
    allRightsReserved: 'Tous droits réservés.',
    subscribeSuccess: 'Merci pour votre inscription !',
    subscribeAlready: 'Vous êtes déjà inscrit.',
    subscribeError: 'Erreur lors de l\'inscription.',
  },
  ar: {
    blogTitle: 'رؤى للزراعة الحديثة',
    blogSubtitle: 'اكتشف أحدث الاتجاهات وأفضل الممارسات والابتكارات في التكنولوجيا الزراعية.',
    featuredArticles: 'مقالات مميزة',
    allArticles: 'جميع المقالات',
    allCategories: 'الكل',
    prevPage: 'السابق',
    nextPage: 'التالي',
    noPosts: 'لا توجد مقالات حالياً.',
    backToBlog: 'العودة إلى المدونة',
    share: 'مشاركة',
    copyLink: 'نسخ الرابط',
    tableOfContents: 'الفهرس',
    relatedArticles: 'مقالات ذات صلة',
    newsletterTitle: 'النشرة الإخبارية',
    newsletterDescription: 'احصل على أحدث التحليلات الزراعية في بريدك.',
    emailPlaceholder: 'بريدك الإلكتروني',
    subscribe: 'اشتراك',
    demoTitle: 'عرض توضيحي',
    demoDescription: 'اكتشف كيف يمكن لـ AgroGina تحويل مزرعتك.',
    bookDemo: 'حجز عرض',
    tryCta: 'جرب مجاناً',
    ctaTitle: 'هل أنت مستعد لتحديث مزرعتك؟',
    ctaDescription: 'انضم إلى المزارعين الذين يستخدمون AgroGina لتحسين إنتاجهم.',
    authorBio: 'خبير في تكنولوجيا الزراعة والتحول الرقمي للمزارع.',
    footerDescription: 'الحل الزراعي المتكامل للمزارع في المغرب.',
    allRightsReserved: 'جميع الحقوق محفوظة.',
    subscribeSuccess: 'شكراً لاشتراكك!',
    subscribeAlready: 'أنت مشترك بالفعل.',
    subscribeError: 'خطأ أثناء الاشتراك.',
  },
  en: {
    blogTitle: 'Insights for Modern Agriculture',
    blogSubtitle: 'Discover the latest trends, best practices, and innovations in agricultural technology.',
    featuredArticles: 'Featured Articles',
    allArticles: 'All Articles',
    allCategories: 'All',
    prevPage: 'Previous',
    nextPage: 'Next',
    noPosts: 'No articles yet.',
    backToBlog: 'Back to Blog',
    share: 'Share',
    copyLink: 'Copy link',
    tableOfContents: 'Table of Contents',
    relatedArticles: 'Related Articles',
    newsletterTitle: 'Newsletter',
    newsletterDescription: 'Get the latest agricultural insights delivered to your inbox.',
    emailPlaceholder: 'Your email',
    subscribe: 'Subscribe',
    demoTitle: 'See a Demo',
    demoDescription: 'Discover how AgroGina can transform your farm operations.',
    bookDemo: 'Book a Demo',
    tryCta: 'Try for Free',
    ctaTitle: 'Ready to modernize your farm?',
    ctaDescription: 'Join the farmers using AgroGina to optimize their production.',
    authorBio: 'Agricultural technology expert with experience in farm digital transformation.',
    footerDescription: 'The all-in-one farm management suite for Moroccan farms.',
    allRightsReserved: 'All rights reserved.',
    subscribeSuccess: 'Thanks for subscribing!',
    subscribeAlready: 'You\'re already subscribed.',
    subscribeError: 'Error subscribing.',
  },
};

function getNewsletterScript(apiBase: string): string {
  return `<script>
document.querySelectorAll('.newsletter-form').forEach(function(form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var email = form.querySelector('input[name="email"]').value;
    var source = form.dataset.source || '';
    var lang = document.documentElement.lang || 'fr';
    var msg = form.querySelector('.newsletter-message');
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '...';
    fetch('${apiBase}/api/v1/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, locale: lang, source_slug: source })
    }).then(function(r) { return r.json(); }).then(function(data) {
      msg.style.display = 'block';
      if (data.already_subscribed) {
        msg.style.background = '#fef3c7'; msg.style.color = '#92400e';
        msg.textContent = form.dataset.msgAlready || 'Already subscribed';
      } else {
        msg.style.background = '#dcfce7'; msg.style.color = '#166534';
        msg.textContent = form.dataset.msgSuccess || 'Subscribed!';
      }
      btn.style.display = 'none';
      form.querySelector('input[name="email"]').style.display = 'none';
    }).catch(function() {
      msg.style.display = 'block';
      msg.style.background = '#fee2e2'; msg.style.color = '#991b1b';
      msg.textContent = form.dataset.msgError || 'Error';
      btn.disabled = false;
      btn.textContent = form.dataset.btnText || 'Subscribe';
    });
  });
});
</script>`;
}

const LOCALE_MAP: Record<string, string> = {
  fr: 'fr_FR',
  ar: 'ar_MA',
  en: 'en_US',
};

@Injectable()
export class BlogSsrService implements OnModuleInit {
  private readonly logger = new Logger(BlogSsrService.name);
  private layoutTemplate: Handlebars.TemplateDelegate;
  private listTemplate: Handlebars.TemplateDelegate;
  private detailTemplate: Handlebars.TemplateDelegate;
  private readonly templatesDir: string;
  private readonly appUrl: string;
  private readonly siteUrl: string;
  private markedParse: ((content: string, options?: any) => string | Promise<string>) | null = null;

  constructor(
    private readonly blogsService: BlogsService,
    private readonly configService: ConfigService,
  ) {
    this.templatesDir = path.join(__dirname, 'templates');
    this.appUrl = this.configService.get('FRONTEND_URL') || this.configService.get('APP_URL') || this.configService.get('VITE_APP_URL') || 'https://agritech-dashboard.thebzlab.online';
    this.siteUrl = this.appUrl;
  }

  async onModuleInit() {
    // Dynamic import for ESM-only marked package
    try {
      const markedModule = await (Function('return import("marked")')() as Promise<any>);
      this.markedParse = markedModule.marked || markedModule.default?.marked || markedModule.parse;
    } catch (e) {
      this.logger.warn('Failed to load marked, falling back to raw content');
    }
    this.registerHelpers();
    this.registerPartials();
    this.compileTemplates();
    this.logger.log('Blog SSR templates compiled successfully');
  }

  private registerHelpers() {
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('encodeURI', (str: string) => encodeURIComponent(str || ''));
  }

  private registerPartials() {
    const partialsDir = path.join(this.templatesDir, 'partials');
    const partialFiles = fs.readdirSync(partialsDir);
    for (const file of partialFiles) {
      if (file.endsWith('.hbs')) {
        const name = path.basename(file, '.hbs');
        const content = fs.readFileSync(path.join(partialsDir, file), 'utf-8');
        Handlebars.registerPartial(name, content);
      }
    }
  }

  private compileTemplates() {
    const layoutSrc = fs.readFileSync(path.join(this.templatesDir, 'layouts/base.hbs'), 'utf-8');
    this.layoutTemplate = Handlebars.compile(layoutSrc);

    const listSrc = fs.readFileSync(path.join(this.templatesDir, 'blog-list.hbs'), 'utf-8');
    this.listTemplate = Handlebars.compile(listSrc);

    const detailSrc = fs.readFileSync(path.join(this.templatesDir, 'blog-detail.hbs'), 'utf-8');
    this.detailTemplate = Handlebars.compile(detailSrc);
  }

  private getTranslations(locale: string): TranslationStrings {
    return TRANSLATIONS[locale] || TRANSLATIONS['fr'];
  }

  private formatDate(dateStr: string | undefined, locale: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const localeMap: Record<string, string> = { fr: 'fr-FR', ar: 'ar-MA', en: 'en-US' };
      return date.toLocaleDateString(localeMap[locale] || 'fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  private enrichPost(post: BlogPost, locale: string): any {
    return {
      ...post,
      publishedAtFormatted: this.formatDate(post.publishedAt, locale),
    };
  }

  private extractHeadings(html: string): Array<{ id: string; text: string; level: string }> {
    const headings: Array<{ id: string; text: string; level: string }> = [];
    const regex = /<(h[23])[^>]*>(.*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    let index = 0;
    while ((match = regex.exec(html)) !== null) {
      const id = `heading-${index}`;
      headings.push({ id, text: match[2].replace(/<[^>]+>/g, ''), level: match[1].toLowerCase() });
      index++;
    }
    return headings;
  }

  private addHeadingIds(html: string): string {
    let index = 0;
    return html.replace(/<(h[23])([^>]*)>/gi, (_, tag, attrs) => {
      const id = `heading-${index}`;
      index++;
      return `<${tag}${attrs} id="${id}">`;
    });
  }

  async renderBlogList(locale: string = 'fr', filters: { category?: string; page?: number } = {}): Promise<string> {
    const t = this.getTranslations(locale);
    const isRtl = locale === 'ar';

    let posts: BlogPost[] = [];
    let featuredPosts: BlogPost[] = [];
    let categories: BlogCategory[] = [];
    let pagination: any = null;

    try {
      const [blogsResult, featured, cats] = await Promise.all([
        this.blogsService.getBlogs({
          locale,
          page: filters.page || 1,
          limit: 12,
          category: filters.category,
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        }),
        this.blogsService.getFeaturedBlogs(3, locale),
        this.blogsService.getCategories(locale),
      ]);
      posts = blogsResult.data;
      pagination = {
        ...blogsResult.meta,
        hasPrev: blogsResult.meta.page > 1,
        hasNext: blogsResult.meta.page < blogsResult.meta.pageCount,
        prevPage: blogsResult.meta.page - 1,
        nextPage: blogsResult.meta.page + 1,
      };
      featuredPosts = featured;
      categories = cats;
    } catch (error) {
      this.logger.error('Error fetching blog data for listing:', error);
    }

    const enrichedPosts = posts.map(p => this.enrichPost(p, locale));
    const enrichedFeatured = featuredPosts.map(p => this.enrichPost(p, locale));

    const body = this.listTemplate({
      posts: enrichedPosts,
      featuredPosts: enrichedFeatured,
      categories,
      pagination,
      activeCategory: filters.category || '',
      lang: locale,
      t,
    });

    return this.layoutTemplate({
      lang: locale,
      isRtl,
      metaTitle: `${t.blogTitle} | AgroGina Blog`,
      metaDescription: t.blogSubtitle,
      metaAuthor: 'AgroGina',
      ogType: 'website',
      ogImage: `${this.siteUrl}/og-image.png`,
      ogLocale: LOCALE_MAP[locale] || 'fr_FR',
      canonicalUrl: `${this.siteUrl}/blog`,
      jsonLd: `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'AgroGina Blog',
        description: t.blogSubtitle,
        url: `${this.siteUrl}/blog`,
        publisher: {
          '@type': 'Organization',
          name: 'AgroGina',
          url: this.siteUrl,
        },
      })}</script>`,
      categories,
      appUrl: this.appUrl,
      year: new Date().getFullYear(),
      t,
      body,
      inlineScript: getNewsletterScript(this.siteUrl),
    });
  }

  async renderBlogDetail(slug: string, locale: string = 'fr'): Promise<string | null> {
    const t = this.getTranslations(locale);
    const isRtl = locale === 'ar';

    let post: BlogPost;
    try {
      post = await this.blogsService.getBlogBySlug(slug, locale);
    } catch (error) {
      this.logger.warn(`Blog post not found: ${slug} (${locale})`);
      return null;
    }

    let relatedPosts: BlogPost[] = [];
    let categories: BlogCategory[] = [];
    try {
      [relatedPosts, categories] = await Promise.all([
        this.blogsService.getRelatedBlogs(slug, 3, locale),
        this.blogsService.getCategories(locale),
      ]);
    } catch (error) {
      this.logger.error('Error fetching related data:', error);
    }

    // Render markdown content to HTML
    let contentHtml = '';
    try {
      if (this.markedParse) {
        const result = this.markedParse(post.content || '', { breaks: true, gfm: true });
        contentHtml = typeof result === 'string' ? result : await result;
      } else {
        contentHtml = post.content || '';
      }
    } catch {
      contentHtml = post.content || '';
    }

    const headings = this.extractHeadings(contentHtml);
    contentHtml = this.addHeadingIds(contentHtml);

    const enrichedPost = {
      ...this.enrichPost(post, locale),
      contentHtml,
    };
    const enrichedRelated = relatedPosts.map(p => this.enrichPost(p, locale));

    const canonicalUrl = `${this.siteUrl}/blog/${slug}`;
    const authorInitial = (post.author || 'A').charAt(0).toUpperCase();

    const jsonLdData = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt || post.seo_description || '',
      image: post.featured_image?.url || '',
      author: {
        '@type': 'Person',
        name: post.author || 'AgroGina Team',
      },
      publisher: {
        '@type': 'Organization',
        name: 'AgroGina',
        url: this.siteUrl,
      },
      datePublished: post.publishedAt || post.createdAt,
      dateModified: post.updatedAt,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
    });

    const body = this.detailTemplate({
      post: enrichedPost,
      relatedPosts: enrichedRelated,
      headings,
      authorInitial,
      canonicalUrl,
      lang: locale,
      appUrl: this.appUrl,
      t,
    });

    return this.layoutTemplate({
      lang: locale,
      isRtl,
      metaTitle: post.seo_title || `${post.title} | AgroGina Blog`,
      metaDescription: post.seo_description || post.excerpt || '',
      metaAuthor: post.author || 'AgroGina',
      ogType: 'article',
      ogImage: post.featured_image?.url || `${this.siteUrl}/og-image.png`,
      ogLocale: LOCALE_MAP[locale] || 'fr_FR',
      canonicalUrl,
      jsonLd: `<script type="application/ld+json">${jsonLdData}</script>`,
      categories,
      appUrl: this.appUrl,
      year: new Date().getFullYear(),
      t,
      body,
      inlineScript: getNewsletterScript(this.siteUrl),
    });
  }

  async renderSitemap(): Promise<string> {
    const urls: Array<{ loc: string; lastmod?: string; alternates?: Array<{ lang: string; href: string }> }> = [];

    // Add blog listing page
    urls.push({
      loc: `${this.siteUrl}/blog`,
      alternates: SUPPORTED_LOCALES.map(l => ({
        lang: l,
        href: `${this.siteUrl}/blog?lang=${l}`,
      })),
    });

    // Fetch all posts for each locale
    for (const locale of SUPPORTED_LOCALES) {
      try {
        const result = await this.blogsService.getBlogs({
          locale,
          page: 1,
          limit: 1000,
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        });
        for (const post of result.data) {
          const existing = urls.find(u => u.loc === `${this.siteUrl}/blog/${post.slug}`);
          if (!existing) {
            urls.push({
              loc: `${this.siteUrl}/blog/${post.slug}`,
              lastmod: post.updatedAt ? new Date(post.updatedAt).toISOString().split('T')[0] : undefined,
              alternates: SUPPORTED_LOCALES.map(l => ({
                lang: l,
                href: `${this.siteUrl}/blog/${post.slug}?lang=${l}`,
              })),
            });
          }
        }
      } catch (error) {
        this.logger.error(`Error fetching posts for sitemap (${locale}):`, error);
      }
    }

    const urlEntries = urls.map(u => {
      let entry = `  <url>\n    <loc>${this.escapeXml(u.loc)}</loc>`;
      if (u.lastmod) entry += `\n    <lastmod>${u.lastmod}</lastmod>`;
      if (u.alternates) {
        for (const alt of u.alternates) {
          entry += `\n    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${this.escapeXml(alt.href)}"/>`;
        }
      }
      entry += '\n  </url>';
      return entry;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;
  }

  async renderRss(locale: string = 'fr'): Promise<string> {
    const t = this.getTranslations(locale);
    let posts: BlogPost[] = [];

    try {
      const result = await this.blogsService.getBlogs({
        locale,
        page: 1,
        limit: 20,
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });
      posts = result.data;
    } catch (error) {
      this.logger.error('Error fetching posts for RSS:', error);
    }

    const items = posts.map(post => {
      const link = `${this.siteUrl}/blog/${post.slug}?lang=${locale}`;
      const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : '';
      return `    <item>
      <title>${this.escapeXml(post.title)}</title>
      <link>${this.escapeXml(link)}</link>
      <description>${this.escapeXml(post.excerpt || '')}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${this.escapeXml(link)}</guid>
    </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AgroGina Blog</title>
    <link>${this.siteUrl}/blog</link>
    <description>${this.escapeXml(t.blogSubtitle)}</description>
    <language>${locale}</language>
    <atom:link href="${this.siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
