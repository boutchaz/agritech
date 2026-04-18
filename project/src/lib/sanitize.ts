import DOMPurify from 'dompurify';

/**
 * Sanitize HTML string — strips <script>, event handlers, javascript: URLs, etc.
 * Safe for use with dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Allow standard formatting tags but strip scripts, iframes, forms
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'hr', 'sup', 'sub', 'del', 'ins', 'mark',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'id', 'src', 'alt', 'title',
      'width', 'height', 'style', 'data-route', 'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: true,
  });
}

/**
 * Sanitize markdown-rendered HTML — for chat messages, blog content, etc.
 * More permissive than sanitizeHtml: also allows details/summary and figure.
 */
export function sanitizeMarkdownHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'hr', 'sup', 'sub', 'del', 'ins', 'mark',
      'details', 'summary', 'figure', 'figcaption', 'picture', 'source',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'id', 'src', 'alt', 'title',
      'width', 'height', 'style', 'data-route', 'colspan', 'rowspan',
      'open', 'type', 'media', 'srcset',
    ],
    ALLOW_DATA_ATTR: true,
  });
}

/**
 * Escape HTML entities — for inserting user text into i18n HTML templates.
 * Use this instead of dangerouslySetInnerHTML when interpolating user input.
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
