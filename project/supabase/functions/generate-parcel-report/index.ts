// Follow this setup guide to integrate the Deno runtime:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportRequest {
  parcel_id: string
  template_id: string
  parcel_data: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { parcel_id, template_id, parcel_data }: ReportRequest = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Generate report title
    const templateNames: Record<string, string> = {
      'parcel-analysis': 'Analyse Complète de Parcelle',
      'soil-report': 'Rapport d\'Analyse du Sol',
      'satellite-report': 'Rapport d\'Imagerie Satellite',
    }

    const title = `${templateNames[template_id] || 'Rapport'} - ${parcel_data.parcel.name}`

    // Create HTML content for the report
    const htmlContent = generateReportHTML(template_id, parcel_data, title)

    // TODO: Convert HTML to PDF using a service like Puppeteer/Playwright
    // For now, we'll just store the metadata

    // Insert report record
    const { data: report, error: insertError } = await supabaseClient
      .from('parcel_reports')
      .insert({
        parcel_id,
        template_id,
        title,
        generated_by: user.id,
        status: 'completed',
        metadata: {
          template_id,
          parcel_data,
          html_content: htmlContent,
        },
      })
      .select()
      .single()

    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function generateReportHTML(templateId: string, data: any, title: string): string {
  const { parcel, metrics, analysis } = data

  let content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #16a34a;
          border-bottom: 3px solid #16a34a;
          padding-bottom: 10px;
        }
        h2 {
          color: #059669;
          margin-top: 30px;
        }
        .metric {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        .metric-label {
          font-weight: bold;
        }
        .section {
          margin: 20px 0;
          padding: 15px;
          background: #f9fafb;
          border-radius: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p><strong>Date de génération:</strong> ${new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}</p>
  `

  // Overview section
  content += `
    <div class="section">
      <h2>Vue d'ensemble</h2>
      <div class="metric">
        <span class="metric-label">Parcelle:</span>
        <span>${parcel.name}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Surface:</span>
        <span>${parcel.area || 'Non définie'} hectares</span>
      </div>
      ${parcel.soil_type ? `
      <div class="metric">
        <span class="metric-label">Type de sol:</span>
        <span>${parcel.soil_type}</span>
      </div>
      ` : ''}
      <div class="metric">
        <span class="metric-label">État sanitaire:</span>
        <span>${metrics.health}</span>
      </div>
      <div class="metric">
        <span class="metric-label">NDVI:</span>
        <span>${metrics.ndvi}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Irrigation:</span>
        <span>${metrics.irrigation}%</span>
      </div>
      <div class="metric">
        <span class="metric-label">Rendement prévu:</span>
        <span>${metrics.yield} t/ha</span>
      </div>
    </div>
  `

  // Soil analysis section (if included)
  if (templateId === 'parcel-analysis' || templateId === 'soil-report') {
    content += `
      <div class="section">
        <h2>Analyse du Sol</h2>
        <table>
          <thead>
            <tr>
              <th>Paramètre</th>
              <th>Valeur</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>pH</td>
              <td>${analysis.soil.ph}</td>
            </tr>
            <tr>
              <td>Matière organique</td>
              <td>${analysis.soil.organicMatter}%</td>
            </tr>
            <tr>
              <td>Azote (N)</td>
              <td>${analysis.soil.nitrogen} g/kg</td>
            </tr>
            <tr>
              <td>Phosphore (P)</td>
              <td>${analysis.soil.phosphorus} g/kg</td>
            </tr>
            <tr>
              <td>Potassium (K)</td>
              <td>${analysis.soil.potassium} g/kg</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
  }

  // Recommendations section
  if (analysis.recommendations) {
    content += `
      <div class="section">
        <h2>Recommandations</h2>
        <ul>
          ${analysis.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    `
  }

  content += `
      <div class="footer">
        <p>Rapport généré automatiquement par AgriTech Platform</p>
        <p>© ${new Date().getFullYear()} - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `

  return content
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-parcel-report' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"parcel_id":"123","template_id":"parcel-analysis","parcel_data":{}}'

*/