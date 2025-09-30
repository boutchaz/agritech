import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IndexImageRequest {
  aoi: {
    geometry: any;
    name?: string;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
  index: string;
  cloud_coverage?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: IndexImageRequest = await req.json()

    const { aoi, date_range, index, cloud_coverage = 10 } = request

    // For demo purposes, generate a gradient image based on the index type
    // In production, this would call a real satellite imagery service

    const indexColors: Record<string, string[]> = {
      NDVI: ['#8B4513', '#FFD700', '#ADFF2F', '#32CD32', '#006400'],
      NDRE: ['#FF4500', '#FFA500', '#FFFF00', '#9ACD32', '#228B22'],
      NDMI: ['#8B4513', '#D2691E', '#F0E68C', '#87CEEB', '#4169E1'],
      MNDWI: ['#228B22', '#90EE90', '#FFFFE0', '#87CEEB', '#0000FF'],
      GCI: ['#FFB6C1', '#FFFF00', '#ADFF2F', '#32CD32', '#006400'],
      SAVI: ['#D2691E', '#F4A460', '#FFFF00', '#9ACD32', '#228B22'],
      OSAVI: ['#D2691E', '#F4A460', '#FFFF00', '#9ACD32', '#228B22'],
      MSAVI2: ['#D2691E', '#F4A460', '#FFFF00', '#9ACD32', '#228B22'],
      PRI: ['#FF0000', '#FF8C00', '#FFD700', '#ADFF2F', '#32CD32'],
      MSI: ['#0000FF', '#87CEEB', '#FFFFE0', '#FFA500', '#FF4500'],
      MCARI: ['#FFB6C1', '#FFFF00', '#ADFF2F', '#32CD32', '#006400'],
      TCARI: ['#FFB6C1', '#FFFF00', '#ADFF2F', '#32CD32', '#006400']
    }

    // Generate SVG image with gradient representing the vegetation index
    const colors = indexColors[index] || indexColors.NDVI
    const width = 400
    const height = 400

    // Create gradient stops
    const gradientStops = colors.map((color, i) => {
      const offset = (i / (colors.length - 1)) * 100
      return `<stop offset="${offset}%" stop-color="${color}" />`
    }).join('\n')

    // Create a more sophisticated pattern that simulates field variation
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      ${gradientStops}
    </linearGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="5" seed="${Math.floor(Math.random() * 100)}" />
      <feColorMatrix type="saturate" values="0.3"/>
    </filter>
    <pattern id="field-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
      <rect width="100" height="100" fill="url(#grad1)" opacity="0.8"/>
      <rect width="100" height="100" filter="url(#noise)" opacity="0.4"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#field-pattern)" />
  <text x="10" y="30" font-family="Arial" font-size="24" font-weight="bold" fill="white" stroke="black" stroke-width="1">${index}</text>
  <text x="10" y="${height - 10}" font-family="Arial" font-size="12" fill="white" stroke="black" stroke-width="0.5">${date_range.end_date}</text>
  <text x="${width - 100}" y="${height - 10}" font-family="Arial" font-size="10" fill="white" stroke="black" stroke-width="0.5">Cloud: ${cloud_coverage}%</text>
  <rect x="10" y="50" width="30" height="30" fill="orange" opacity="0.8"/>
  <text x="15" y="72" font-family="Arial" font-size="16" font-weight="bold" fill="white">DEMO</text>
</svg>`

    // Convert SVG to data URL
    const imageUrl = `data:image/svg+xml;base64,${btoa(svg)}`

    // Simulate some variation in results
    const hasImages = Math.random() > 0.1 // 90% success rate
    const suitableImages = hasImages ? Math.floor(Math.random() * 5) + 1 : 0

    const response = {
      image_url: imageUrl,
      index: index,
      date: date_range.end_date,
      cloud_coverage: cloud_coverage + Math.random() * 5, // Add some variation
      metadata: {
        available_images: hasImages ? Math.floor(Math.random() * 10) + suitableImages : 0,
        suitable_images: suitableImages,
        demo_mode: true,
        message: "This is a demo visualization. Connect a real satellite service for actual imagery.",
        requested_threshold: cloud_coverage,
        threshold_used: cloud_coverage
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})