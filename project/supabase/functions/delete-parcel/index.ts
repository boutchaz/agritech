import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteParcelRequest {
  parcel_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client to get user info
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { parcel_id }: DeleteParcelRequest = await req.json();

    if (!parcel_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: parcel_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('🗑️ Starting delete parcel:', parcel_id, 'for user:', user.id);

    // First verify the parcel exists and get farm info
    const { data: existingParcel, error: checkError } = await supabaseAdmin
      .from('parcels')
      .select('id, name, farm_id')
      .eq('id', parcel_id)
      .single();

    if (checkError || !existingParcel) {
      console.error('❌ Error checking parcel:', checkError);
      return new Response(
        JSON.stringify({ error: `Impossible de vérifier la parcelle: ${checkError?.message || 'Parcelle non trouvée'}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingParcel.farm_id) {
      return new Response(
        JSON.stringify({ error: 'La parcelle n\'est associée à aucune ferme' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get farm info to find organization_id
    const { data: farm, error: farmError } = await supabaseAdmin
      .from('farms')
      .select('organization_id')
      .eq('id', existingParcel.farm_id)
      .single();

    if (farmError || !farm) {
      console.error('❌ Error fetching farm:', farmError);
      return new Response(
        JSON.stringify({ error: `Impossible de récupérer les informations de la ferme: ${farmError?.message || 'Ferme non trouvée'}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = farm.organization_id;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Impossible de déterminer l\'organisation de la parcelle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's role in the organization
    const { data: orgUser, error: roleError } = await supabaseAdmin
      .from('organization_users')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (roleError) {
      console.error('❌ Error checking user role:', roleError);
      return new Response(
        JSON.stringify({ error: `Impossible de vérifier votre rôle: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userOrgRole = orgUser?.role;
    console.log('👤 User organization role:', userOrgRole, 'for org:', organizationId);

    // Check subscription status using RPC
    const { data: subscriptionCheck, error: subscriptionError } = await supabaseAdmin
      .rpc('has_valid_subscription', { org_id: organizationId });

    console.log('📋 Subscription check:', { subscriptionCheck, subscriptionError });

    const hasValidSubscription = subscriptionCheck === true || (typeof subscriptionCheck === 'boolean' && subscriptionCheck);

    // Verify permissions according to RLS policy requirements
    const allowedRoles = [
      'system_admin',
      'organization_admin',
      'farm_manager'
    ];

    const hasRequiredRole = userOrgRole && allowedRoles.includes(userOrgRole);

    // Test user_has_role function directly to see what it returns
    const { data: roleCheckResult, error: roleCheckError } = await supabaseAdmin
      .rpc('user_has_role', {
        p_user_id: user.id,
        p_organization_id: organizationId,
        p_role_names: ['system_admin', 'organization_admin', 'farm_manager']
      });

    console.log('🔐 Role check:', { 
      userRole: userOrgRole, 
      hasRequiredRole,
      allowedRoles,
      userHasRoleRPC: roleCheckResult,
      userHasRoleError: roleCheckError
    });

    if (!hasRequiredRole) {
      const roleDisplayNames: Record<string, string> = {
        'system_admin': 'Administrateur Système',
        'organization_admin': 'Administrateur d\'Organisation',
        'farm_manager': 'Gestionnaire de Ferme',
        'farm_worker': 'Ouvrier Agricole',
        'day_laborer': 'Journalier',
        'viewer': 'Observateur'
      };

      const currentRoleDisplay = roleDisplayNames[userOrgRole || ''] || userOrgRole || 'Aucun';

      return new Response(
        JSON.stringify({ 
          error: `Vous n'avez pas le rôle requis pour supprimer des parcelles. Rôle actuel: ${currentRoleDisplay}. Rôles requis: Administrateur Système, Administrateur d'Organisation ou Gestionnaire de Ferme.`
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hasValidSubscription) {
      return new Response(
        JSON.stringify({ 
          error: `Un abonnement actif est requis pour supprimer des parcelles. Statut de l'abonnement: ${hasValidSubscription ? 'Valide' : 'Invalide'}.`
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now delete the parcel using service role (bypasses RLS)
    // The trigger block_parcels_without_sub checks auth.uid() which is NULL with service_role
    // We've already verified permissions and subscription, so we can safely delete
    console.log('🗑️ Deleting parcel:', parcel_id);
    
    // Strategy: Use RPC function if available, otherwise create it on-the-fly
    let { data: deletedParcels, error: deleteError } = await supabaseAdmin
      .rpc('delete_parcel_direct', { p_parcel_id: parcel_id });
    
    // If RPC function doesn't exist, create it and try again
    if (deleteError && (deleteError.code === '42883' || deleteError.code === 'PGRST202')) {
      console.log('⚠️ RPC function not found, creating it on-the-fly...');
      
      // Create the function using raw SQL via PostgREST
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION public.delete_parcel_direct(p_parcel_id UUID)
        RETURNS SETOF public.parcels
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = ''
        AS $$
        DECLARE
          deleted_parcel public.parcels;
        BEGIN
          DELETE FROM public.parcels
          WHERE id = p_parcel_id
          RETURNING * INTO deleted_parcel;
          
          IF deleted_parcel.id IS NOT NULL THEN
            RETURN NEXT deleted_parcel;
          END IF;
          
          RETURN;
        END;
        $$;
      `;

      // Try to create function via direct SQL (might need superuser, so this might fail)
      // For now, just use regular delete - the trigger will block but we'll handle it
      console.log('⚠️ Cannot create function dynamically, using direct delete');
      
      // Use direct DELETE - if trigger blocks it, we'll get an error we can handle
      const { data, error } = await supabaseAdmin
        .from('parcels')
        .delete()
        .eq('id', parcel_id)
        .select();
      
      deletedParcels = data;
      deleteError = error;
      
      // If delete was blocked by trigger, provide helpful error message
      if (deleteError && (deleteError.message?.includes('subscription') || deleteError.code === 'P0001')) {
        console.error('❌ Delete blocked by trigger:', deleteError);
        return new Response(
          JSON.stringify({ 
            error: 'La suppression a été bloquée par la vérification d\'abonnement. Veuillez appliquer la migration 20250203000010_create_delete_parcel_function.sql pour résoudre ce problème.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (deleteError) {
      console.error('❌ Delete error details:', {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code
      });
      return new Response(
        JSON.stringify({ error: `Erreur lors de la suppression: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if any rows were deleted
    // RPC returns a single object or array, handle both cases
    const deletedParcelsArray = Array.isArray(deletedParcels) ? deletedParcels : (deletedParcels ? [deletedParcels] : []);
    
    if (deletedParcelsArray.length === 0) {
      console.warn('⚠️ No parcel deleted - parcel may not exist or was already deleted');
      
      // Verify if parcel still exists
      const { data: verifyParcel, error: verifyError } = await supabaseAdmin
        .from('parcels')
        .select('id')
        .eq('id', parcel_id)
        .maybeSingle();

      if (verifyError) {
        console.error('❌ Error verifying parcel:', verifyError);
        return new Response(
          JSON.stringify({ error: `Erreur lors de la vérification: ${verifyError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (verifyParcel) {
        // Parcel still exists - delete was blocked by something (trigger, constraint, etc.)
        return new Response(
          JSON.stringify({ error: 'La suppression a échoué. La parcelle est peut-être référencée ailleurs ou protégée par une contrainte.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Parcel doesn't exist anymore - might have been deleted already, but that's fine
        console.log('✅ Parcel was already deleted or doesn\'t exist');
        return new Response(
          JSON.stringify({ success: true, message: 'Parcelle supprimée ou déjà absente' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const deletedParcel = deletedParcelsArray[0];
    console.log('✅ Parcel deleted successfully:', deletedParcel.id);

    return new Response(
      JSON.stringify({ success: true, deleted_parcel: deletedParcel }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

