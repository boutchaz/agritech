# Quote PDF Generation - Complete ✅

## Overview

Implemented a server-side PDF generation system using Supabase Edge Functions. The system generates professional, branded PDF documents for sales quotes.

## Architecture

### Backend: Supabase Edge Function
- **Location**: `supabase/functions/generate-quote-pdf/index.ts`
- **Runtime**: Deno
- **PDF Generation**: Two modes
  1. **Full PDF Mode** (requires Browserless API)
  2. **HTML Fallback Mode** (client can print to PDF)

### Frontend: React/TypeScript
- **Component**: `billing-quotes.tsx`
- **Handler**: `handleDownloadPDF()`
- **Authentication**: Uses Supabase session token

## Edge Function Implementation

### Features

1. **Authentication & Authorization**
   - Validates user session
   - Ensures user has access to the quote
   - Row-level security enforced

2. **Data Fetching**
   - Fetches quote with all line items
   - Fetches organization details for branding
   - Single query with joins for performance

3. **PDF Template**
   - Professional bilingual layout (French/English)
   - Company branding (logo, contact info)
   - Customer information
   - Itemized table with quantities, rates, taxes
   - Subtotal, tax, and grand total
   - Payment and delivery terms
   - Terms & conditions
   - Status badge
   - Print-friendly design

4. **PDF Generation Modes**

   **Mode 1: Browserless API (Production)**
   ```typescript
   // Requires BROWSERLESS_API_KEY environment variable
   const pdfResponse = await fetch('https://chrome.browserless.io/pdf?token=' + key, {
     method: 'POST',
     body: JSON.stringify({
       html: generatedHTML,
       options: {
         format: 'A4',
         printBackground: true,
         margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
       }
     })
   });
   ```

   **Mode 2: HTML Fallback (Development)**
   ```typescript
   // Returns HTML that client can print to PDF
   return new Response(html, {
     headers: {
       'Content-Type': 'text/html',
       'X-PDF-Generation': 'html-only'
     }
   });
   ```

## PDF Template Details

### Header Section
- Company logo and name
- Company contact information (address, email, phone)
- Tax ID number
- Quote status badge (color-coded)

### Document Information
- Document title (DEVIS / QUOTE)
- Quote number
- Quote date
- Valid until date

### Customer Information
- Customer name
- Customer address
- Customer email and phone
- Payment terms
- Delivery terms

### Line Items Table
| # | Article/Item | Qty | Unit Price | Amount | Tax | Total |
|---|-------------|-----|------------|--------|-----|-------|
| Itemized with descriptions, quantities, rates, and taxes |

### Totals Section
- Subtotal
- Total Tax (TVA)
- **Grand Total** (highlighted in green)

### Terms & Conditions
- Optional terms and conditions text
- Displayed in pre-formatted style

### Footer
- Quote validity reminder (bilingual)
- Thank you message (bilingual)

## Styling Features

1. **Professional Design**
   - Clean, modern layout
   - Green accent color (#10b981)
   - Proper spacing and alignment
   - Print-optimized typography

2. **Responsive Elements**
   - Two-column layout for info sections
   - Flexible table widths
   - Proper page breaks for printing

3. **Color Coding**
   - Status badges with appropriate colors
   - Green for totals and branding
   - Gray for secondary information

4. **Typography**
   - System font stack for compatibility
   - Proper font weights and sizes
   - Letter spacing for headers

## Frontend Implementation

### Download Handler

```typescript
const handleDownloadPDF = async (quote: Quote) => {
  // 1. Get auth session
  const { data: { session } } = await supabase.auth.getSession();

  // 2. Call edge function
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/generate-quote-pdf?quoteId=${quote.id}`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    }
  );

  // 3. Handle response (PDF or HTML)
  const contentType = response.headers.get('Content-Type');

  if (contentType?.includes('application/pdf')) {
    // Download PDF directly
    const blob = await response.blob();
    downloadFile(blob, `quote-${quote.quote_number}.pdf`);
  } else {
    // Open HTML in new tab for printing
    const html = await response.text();
    openHTMLInNewTab(html);
  }
};
```

### User Experience

1. **Success Path (with Browserless)**
   - User clicks "Download PDF"
   - PDF generates on server
   - File downloads automatically
   - Named: `quote-{number}.pdf`

2. **Fallback Path (without Browserless)**
   - User clicks "Download PDF"
   - HTML opens in new tab
   - User sees alert: "Use browser's Print to PDF"
   - User prints to PDF from browser

## Deployment Instructions

### Step 1: Deploy Edge Function

```bash
# From project root
cd project

# Deploy the function
npx supabase functions deploy generate-quote-pdf

# Set environment variables (if using Browserless)
npx supabase secrets set BROWSERLESS_API_KEY=your_api_key_here
```

### Step 2: Configure Environment Variables

**Required:**
- `SUPABASE_URL` - Already configured
- `SUPABASE_ANON_KEY` - Already configured

**Optional (for full PDF mode):**
- `BROWSERLESS_API_KEY` - Get from [browserless.io](https://browserless.io)

### Step 3: Test the Function

```bash
# Test locally
npx supabase functions serve generate-quote-pdf

# Test with curl
curl -X GET \
  'http://localhost:54321/functions/v1/generate-quote-pdf?quoteId=YOUR_QUOTE_ID' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

### Step 4: Frontend Configuration

Ensure `.env` has:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Browserless Setup (Optional but Recommended)

### Why Browserless?

- Server-side PDF generation
- High-quality rendering
- Supports CSS, fonts, images
- Handles complex layouts
- No client-side dependencies

### Setup Steps

1. **Sign up**: Visit [browserless.io](https://browserless.io)
2. **Get API Key**: Copy from dashboard
3. **Set Secret**:
   ```bash
   npx supabase secrets set BROWSERLESS_API_KEY=your_key
   ```
4. **Deploy**: Redeploy edge function

### Pricing

- **Free Tier**: 1,000 requests/month
- **Paid Plans**: Starting at $49/month for 10,000 requests

### Alternatives

If Browserless is not suitable:

1. **Puppeteer in Deno**
   - More complex setup
   - Requires Docker container
   - Self-hosted option

2. **PDF.co API**
   - Similar to Browserless
   - Different pricing model

3. **Client-side jsPDF** (Not recommended)
   - Limited styling capabilities
   - Browser performance impact
   - No server-side caching

## Database Requirements

### Tables Used

```sql
-- quotes table (already exists)
SELECT id, quote_number, quote_date, valid_until, customer_name,
       subtotal, tax_total, grand_total, currency_code, status, terms_conditions
FROM quotes;

-- quote_items table (already exists)
SELECT item_name, description, quantity, rate, amount, tax_amount
FROM quote_items;

-- organizations table (already exists)
SELECT name, email, phone, address, currency, tax_id, logo_url
FROM organizations;
```

No new tables or migrations required!

## Security Considerations

1. **Authentication Required**
   - Only authenticated users can generate PDFs
   - Session token validated on each request

2. **Authorization Enforced**
   - RLS policies ensure users can only access their organization's quotes
   - No direct database access from client

3. **Rate Limiting**
   - Browserless has built-in rate limiting
   - Supabase Edge Functions have limits

4. **Data Privacy**
   - PDFs generated on-demand
   - Not stored on server
   - Immediate download to client

## Testing Checklist

### Manual Testing

- [ ] Deploy edge function successfully
- [ ] Click "Download PDF" button on a quote
- [ ] PDF downloads with correct filename
- [ ] PDF contains all quote information
- [ ] PDF has company branding
- [ ] PDF has proper formatting
- [ ] Line items display correctly
- [ ] Totals calculate correctly
- [ ] Customer information displays
- [ ] Terms and conditions show (if present)
- [ ] Status badge shows correct color
- [ ] Date formats are correct (French locale)
- [ ] Currency displays correctly
- [ ] HTML fallback works (without Browserless key)

### Error Cases

- [ ] Invalid quote ID returns error
- [ ] Unauthorized access returns 401
- [ ] Missing session returns error message
- [ ] Network errors handled gracefully

## Future Enhancements

### 1. Email Integration
```typescript
// Send PDF via email
const sendQuoteEmail = async (quoteId: string, recipientEmail: string) => {
  const pdfBlob = await generatePDF(quoteId);
  await sendEmail({
    to: recipientEmail,
    subject: `Quote ${quoteNumber}`,
    attachments: [{ filename: 'quote.pdf', content: pdfBlob }]
  });
};
```

### 2. PDF Storage
```typescript
// Store PDFs in Supabase Storage
const { data, error } = await supabase.storage
  .from('quote-pdfs')
  .upload(`${quoteId}.pdf`, pdfBlob);
```

### 3. Custom Templates
- Allow organizations to customize PDF templates
- Store templates in database
- Support multiple languages
- Add custom logos and colors

### 4. Batch PDF Generation
- Generate PDFs for multiple quotes
- Zip multiple PDFs together
- Bulk email sending

### 5. Watermarks
- Add "DRAFT" watermark for draft quotes
- Add "COPY" watermark for duplicates
- Timestamp watermarks

### 6. Digital Signatures
- Add digital signature support
- E-signature integration
- Certificate-based signatures

## Troubleshooting

### Issue: "Missing authorization header"
**Solution**: Ensure user is logged in and session is valid

### Issue: "Quote not found"
**Solution**: Check quote ID, verify RLS policies allow access

### Issue: PDF generation fails
**Solution**:
1. Check Browserless API key is set
2. Verify Browserless account has credits
3. Check edge function logs: `npx supabase functions logs`

### Issue: HTML fallback always shows
**Solution**: Set `BROWSERLESS_API_KEY` environment variable

### Issue: Fonts don't render correctly
**Solution**: Use web-safe fonts or include font files in HTML

### Issue: Images not showing in PDF
**Solution**: Use absolute URLs for images, ensure images are publicly accessible

## Performance Metrics

### Expected Performance

- **PDF Generation**: 2-5 seconds (with Browserless)
- **HTML Generation**: < 500ms
- **File Size**: 50-200 KB typical
- **Concurrent Users**: Limited by Browserless plan

### Optimization Tips

1. **Caching**: Cache organization data
2. **Compression**: Enable gzip for HTML
3. **CDN**: Serve static assets via CDN
4. **Pagination**: For long quotes, add page breaks

## Cost Analysis

### With Browserless (Recommended)

| Plan | Price | Requests/Month | Cost per PDF |
|------|-------|----------------|--------------|
| Free | $0 | 1,000 | $0 |
| Starter | $49 | 10,000 | $0.0049 |
| Pro | $149 | 50,000 | $0.003 |

### Without Browserless (HTML Fallback)

| Resource | Cost |
|----------|------|
| Edge Function Invocations | Included in Supabase |
| Bandwidth | Included in Supabase |
| Total | **$0** |

## Monitoring

### Metrics to Track

1. **Success Rate**: % of successful PDF generations
2. **Response Time**: Average time to generate PDF
3. **Error Rate**: % of failed requests
4. **Usage**: PDFs generated per day/month
5. **Browserless Credits**: Remaining credits

### Logging

```typescript
// Edge function logs
console.log('PDF generated for quote:', quoteNumber);
console.error('PDF generation failed:', error);

// View logs
npx supabase functions logs generate-quote-pdf --tail
```

---

## Status: Complete ✅

The quote PDF generation system is fully implemented and ready for use.

- ✅ Edge function created
- ✅ Professional PDF template designed
- ✅ Frontend integration complete
- ✅ Two-mode system (PDF/HTML)
- ✅ Error handling implemented
- ✅ Documentation complete

**Next Step**: Deploy the edge function and test!
