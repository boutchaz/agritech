# Newsletter Subscription

## Subscribe endpoint

GIVEN a POST to /api/v1/newsletter/subscribe with body { "email": "test@example.com", "locale": "fr", "source_slug": "precision-farming" }
WHEN the email is valid and not already subscribed
THEN the email is stored in newsletter_subscribers table
AND the response is 201 with { "success": true }

GIVEN a POST to /api/v1/newsletter/subscribe with body { "email": "test@example.com" }
WHEN the email already exists in newsletter_subscribers
THEN the response is 200 with { "success": true, "already_subscribed": true }
AND no duplicate row is created

GIVEN a POST to /api/v1/newsletter/subscribe with body { "email": "invalid" }
WHEN the email format is invalid
THEN the response is 400 with a validation error

## Newsletter form in blog template

GIVEN a blog page is rendered (list or detail)
WHEN the user sees the newsletter CTA
THEN the form contains an email input and a submit button
AND the form submits via fetch() to /api/v1/newsletter/subscribe
AND on success, the form shows a confirmation message
AND on error, the form shows an error message
AND the locale and current page slug are sent as hidden fields

## Database table

GIVEN the newsletter_subscribers table exists
THEN it has columns: id (UUID PK), email (unique), locale, source_slug, subscribed_at (timestamptz), confirmed (boolean default false)
AND it has no organization_id column
AND RLS is not enabled (accessed only by service role)
