import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserAuthData {
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    phone?: string;
    timezone: string;
    language: string;
  } | null;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    is_active: boolean;
    currency?: string;
    timezone?: string;
    language?: string;
  }>;
  farms: Array<{
    id: string;
    name: string;
    location: string;
    size: number;
    manager_name: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client - get auth token from request
    // Try both 'Authorization' and 'authorization' (case-insensitive)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

    console.log('Auth header present:', !!authHeader);
    console.log('All headers:', Object.fromEntries(req.headers.entries()));

    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get authenticated user by verifying the JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    console.log('User fetch result:', { user: user?.id, error: userError?.message });

    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          details: userError?.message || 'No user found'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    const { organization_id } = await req.json();

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('id, first_name, last_name, avatar_url, phone, timezone, language')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    // Fetch user organizations with currency, timezone, and language
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organization_users')
      .select(`
        role,
        is_active,
        organizations:organization_id (
          id,
          name,
          slug,
          currency,
          timezone,
          language
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (orgError) {
      console.error('Organizations fetch error:', orgError);
    }

    const organizations = orgData?.map((item: any) => ({
      id: item.organizations.id,
      name: item.organizations.name,
      slug: item.organizations.slug,
      role: item.role,
      is_active: item.is_active,
      currency: item.organizations.currency,
      timezone: item.organizations.timezone,
      language: item.organizations.language,
    })) || [];

    // Fetch farms for the specified organization
    let farms: any[] = [];
    if (organization_id) {
      const { data: farmData, error: farmError } = await supabaseClient
        .from('farms')
        .select('id, name, location, size, manager_name')
        .eq('organization_id', organization_id);

      if (farmError) {
        console.error('Farms fetch error:', farmError);
      } else {
        farms = farmData || [];
      }
    }

    const response: UserAuthData = {
      profile: profile || null,
      organizations,
      farms,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in user-auth-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});