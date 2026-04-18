# SEO & Feeds

## Sitemap

GIVEN a request to GET /sitemap.xml
WHEN Strapi has published blog posts
THEN it returns XML with Content-Type application/xml
AND the XML contains <urlset> with a <url> entry for each published post
AND each <url> contains <loc> with the full URL to the blog post
AND each <url> contains <lastmod> with the post's updatedAt date
AND posts in all locales are included with <xhtml:link rel="alternate" hreflang="...">

GIVEN a request to GET /sitemap.xml
WHEN Strapi has no published posts
THEN it returns a valid XML sitemap with only the /blog listing URL

## RSS feed

GIVEN a request to GET /rss.xml
WHEN Strapi has published blog posts
THEN it returns XML with Content-Type application/rss+xml
AND the XML is a valid RSS 2.0 feed
AND it contains the latest 20 posts sorted by publishedAt desc
AND each item contains title, link, description (excerpt), pubDate, and guid

## OG tags

GIVEN a social media crawler requests GET /blog/my-article
WHEN the HTML is returned
THEN the <head> contains meta property="og:title" with the article title
AND the <head> contains meta property="og:description" with the excerpt
AND the <head> contains meta property="og:image" with the featured image full URL
AND the <head> contains meta property="og:url" with the canonical URL
AND the <head> contains meta name="twitter:card" with "summary_large_image"
AND the <head> contains meta name="twitter:title" with the article title

## JSON-LD

GIVEN a blog detail page is rendered
WHEN the HTML is returned
THEN it contains a <script type="application/ld+json"> tag
AND the JSON-LD has @type "Article"
AND it includes headline, author, datePublished, dateModified, image, description, publisher
