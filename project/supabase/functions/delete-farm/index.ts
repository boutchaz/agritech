import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteFarmRequest {
  farm_id: string;
}

interface DeleteFarmResponse {
  success: boolean;
  deleted_farm?: { id: string; name: string };
  error?: string;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { farm_id }: DeleteFarmRequest = await req.json();

    if (!farm_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: farm_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('🗑️ Starting delete farm:', farm_id, 'for user:', user.id);

    // First verify the farm exists and get organization info
    const { data: existingFarm, error: checkError } = await supabaseAdmin
      .from('farms')
      .select('id, name, organization_id')
      .eq('id', farm_id)
      .single();

    if (checkError || !existingFarm) {
      console.error('❌ Error checking farm:', checkError);
      return new Response(
        JSON.stringify({ error: `Impossible de vérifier la ferme: ${checkError?.message || 'Ferme non trouvée'}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = existingFarm.organization_id;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'La ferme n\'est associée à aucune organisation' }),
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
    const allowedRoles = ['system_admin', 'organization_admin'];
    const hasRequiredRole = userOrgRole && allowedRoles.includes(userOrgRole);

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
          error: `Vous n'avez pas le rôle requis pour supprimer des fermes. Rôle actuel: ${currentRoleDisplay}. Rôles requis: Administrateur Système ou Administrateur d'Organisation.`
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check subscription
    const { data: subscriptionCheck, error: subscriptionError } = await supabaseAdmin
      .rpc('has_valid_subscription', { org_id: organizationId });

    const hasValidSubscription = subscriptionCheck === true || (typeof subscriptionCheck === 'boolean' && subscriptionCheck);

    if (subscriptionError || !hasValidSubscription) {
      console.error('❌ Subscription check failed:', subscriptionError);
      return new Response(
        JSON.stringify({ 
          error: `Un abonnement actif est requis pour supprimer des fermes. Statut de l'abonnement: ${hasValidSubscription ? 'Valide' : 'Invalide'}.`
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if farm has sub-farms (if parent_farm_id column exists)
    // Note: This check gracefully handles the case where the column doesn't exist
    try {
      const { data: subFarms, error: subFarmsError } = await supabaseAdmin
        .from('farms')
        .select('id, name')
        .eq('parent_farm_id', farm_id)
        .eq('is_active', true);

      if (subFarmsError) {
        // If column doesn't exist (code 42703), skip the check
        if (subFarmsError.code === '42703') {
          console.log('ℹ️ parent_farm_id column not found, skipping sub-farms check');
        } else {
          console.error('❌ Error checking sub-farms:', subFarmsError);
          // Continue with deletion, but warn
        }
      } else if (subFarms && subFarms.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: `Impossible de supprimer la ferme car elle contient ${subFarms.length} sous-ferme(s). Veuillez supprimer ou réassigner les sous-fermes d'abord.`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error: any) {
      // If parent_farm_id column doesn't exist, skip the check
      if (error?.code === '42703' || error?.message?.includes('parent_farm_id')) {
        console.log('ℹ️ parent_farm_id column not found, skipping sub-farms check');
      } else {
        console.error('❌ Unexpected error checking sub-farms:', error);
        // Continue with deletion
      }
    }

    console.log('🗑️ Deleting farm:', farm_id);
    
    // Use RPC function to bypass the subscription trigger
    let { data: deletedFarms, error: deleteError } = await supabaseAdmin
      .rpc('delete_farm_direct', { p_farm_id: farm_id });
    
    // If RPC function doesn't exist, fallback to direct delete
    if (deleteError && (deleteError.code === '42883' || deleteError.code === 'PGRST202')) {
      console.log('⚠️ RPC function not found, using direct delete (may be blocked by trigger)');
      
      // Fallback to direct delete
      const directDeleteResult = await supabaseAdmin
        .from('farms')
        .delete()
        .eq('id', farm_id)
        .select('id, name');
      
      deletedFarms = directDeleteResult.data;
      deleteError = directDeleteResult.error;
      
      // If delete was blocked by trigger, provide helpful error message
      if (deleteError && (deleteError.message?.includes('subscription') || deleteError.code === 'P0001')) {
        console.error('❌ Delete blocked by trigger:', deleteError);
        return new Response(
          JSON.stringify({ 
            error: 'La suppression a été bloquée par la vérification d\'abonnement. Veuillez appliquer la migration 20250203000011_create_delete_farm_function.sql pour résoudre ce problème.'
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

    const deletedFarmsArray = Array.isArray(deletedFarms) ? deletedFarms : (deletedFarms ? [deletedFarms] : []);
    
    if (deletedFarmsArray.length === 0) {
      console.warn('⚠️ No farm deleted - farm may not exist or was already deleted');
      
      // Verify if farm still exists
      const { data: verifyFarm, error: verifyError } = await supabaseAdmin
        .from('farms')
        .select('id')
        .eq('id', farm_id)
        .maybeSingle();

      if (verifyError) {
        console.error('❌ Error verifying farm:', verifyError);
        return new Response(
          JSON.stringify({ error: `Erreur lors de la vérification: ${verifyError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (verifyFarm) {
        return new Response(
          JSON.stringify({ error: 'La suppression a échoué. La ferme est peut-être référencée ailleurs ou protégée par une contrainte.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('✅ Farm was already deleted or doesn\'t exist');
        return new Response(
          JSON.stringify({ success: true, message: 'Ferme supprimée ou déjà absente' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const deletedFarm = deletedFarmsArray[0];
    console.log('✅ Farm deleted successfully:', deletedFarm.id);

    return new Response(
      JSON.stringify({ success: true, deleted_farm: deletedFarm }),
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

