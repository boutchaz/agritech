import qs from 'qs';

/**
 * Helper to make requests to Strapi API
 */
export async function fetchStrapi(path: string, urlParamsObject = {}, options = {}) {
    // Merge default and user options
    const mergedOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    };

    // Build query string
    const queryString = qs.stringify(urlParamsObject, { arrayFormat: 'brackets' });
    const requestUrl = `${process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337/api'}${path}${queryString ? `?${queryString}` : ''}`;

    // Request API
    const response = await fetch(requestUrl, mergedOptions);

    // Handle Response
    if (!response.ok) {
        console.error(response.statusText);
        throw new Error(`An error occurred please try again`);
    }
    const data = await response.json();
    return data;
}

/**
 * Helper to get Strapi media URL
 */
export function getStrapiMedia(url: string | null) {
    if (url === null) {
        return null;
    }

    // Return the full URL if the media is hosted on an external provider
    if (url.startsWith('http') || url.startsWith('//')) {
        return url;
    }

    // Otherwise prepend the URL path with the Strapi URL
    return `${process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337'}${url}`;
}
