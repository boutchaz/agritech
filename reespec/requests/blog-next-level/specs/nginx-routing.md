# Nginx Routing

## Blog routes proxied to NestJS

GIVEN a request to /blog or /blog/*
WHEN Nginx receives the request
THEN it proxies to the NestJS backend (port 3001)
AND NestJS returns server-rendered HTML

GIVEN a request to /sitemap.xml
WHEN Nginx receives the request
THEN it proxies to the NestJS backend

GIVEN a request to /rss.xml
WHEN Nginx receives the request
THEN it proxies to the NestJS backend

## SPA routes unchanged

GIVEN a request to any path NOT matching /blog*, /sitemap.xml, /rss.xml
WHEN Nginx receives the request
THEN it serves from the static SPA dist/ directory
AND falls back to index.html for client-side routing (unchanged behavior)

## Static assets still cached

GIVEN a request to /assets/* or static files
WHEN Nginx receives the request
THEN it serves with 1-year cache headers and immutable (unchanged behavior)
