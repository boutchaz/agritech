# Blog SSR Rendering

## Blog listing page

GIVEN a request to GET /blog
WHEN the page is rendered
THEN it returns HTML with status 200
AND the HTML contains og:title "AgroGina Blog"
AND the HTML contains og:type "website"
AND the HTML contains a list of blog post cards from Strapi
AND the HTML contains the lightweight blog nav with logo, Blog link, and CTA button
AND the HTML contains a footer

GIVEN a request to GET /blog?lang=ar
WHEN the page is rendered
THEN Strapi is queried with locale=ar
AND the HTML contains dir="rtl" on the html element
AND the page content is in Arabic

GIVEN a request to GET /blog?category=precision-farming
WHEN the page is rendered
THEN only posts from the "precision-farming" category are shown

## Blog detail page

GIVEN a request to GET /blog/my-article-slug
WHEN the post exists in Strapi
THEN it returns HTML with status 200
AND the HTML contains og:title matching the article title
AND the HTML contains og:description matching the article excerpt
AND the HTML contains og:image matching the featured image URL
AND the HTML contains og:type "article"
AND the HTML contains og:locale matching the requested language
AND the HTML contains JSON-LD Article structured data
AND the HTML contains a canonical link tag
AND the HTML contains the article content rendered from Markdown
AND the HTML contains social share buttons (LinkedIn, X, Facebook, copy link)
AND the HTML contains a sticky sidebar with table of contents
AND the HTML contains a newsletter signup CTA in the sidebar
AND the HTML contains a demo CTA in the sidebar
AND the HTML contains an end-of-article conversion banner
AND the HTML contains related articles section

GIVEN a request to GET /blog/non-existent-slug
WHEN the post does not exist in Strapi
THEN it returns HTML with status 404
AND the HTML contains a "Post not found" message with a link back to /blog

GIVEN a request to GET /blog/my-article-slug?lang=fr
WHEN the page is rendered
THEN Strapi is queried with locale=fr for that slug
