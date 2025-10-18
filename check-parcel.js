import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvegjdkkbhlhbjpbhpou.supabase.co';
// Use service role key for admin operations
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWdqZGtrYmhsaGJqcGJocG91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODY2Nzg3MSwiZXhwIjoyMDc0MjQzODcxfQ.t_nTRPTskLPPVZLCyOEhJ-X1SV2R-hKZJDLSqCOXPJY';

// Try to use service role key first, fall back to anon key
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWdqZGtrYmhsaGJqcGJocG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Njc4NzEsImV4cCI6MjA3NDI0Mzg3MX0.t5RMzdumbehxq5DRtHEbiNOAW4KstcysOFx2xg4Z67E';

// First check all tables
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkParcel() {
  // Check organizations
  console.log('Checking organizations...');
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .limit(5);

  if (orgError) {
    console.error('Error fetching organizations:', orgError);
  } else {
    console.log('\n=== ORGANIZATIONS ===');
    if (orgs && orgs.length > 0) {
      orgs.forEach(o => console.log(`- ${o.id}: ${o.name} (${o.slug})`));
    } else {
      console.log('No organizations found');
    }
  }

  // Check farms
  console.log('\nChecking farms...');
  const { data: farms, error: farmError } = await supabase
    .from('farms')
    .select('id, name, organization_id')
    .limit(5);

  if (farmError) {
    console.error('Error fetching farms:', farmError);
  } else {
    console.log('\n=== FARMS ===');
    if (farms && farms.length > 0) {
      farms.forEach(f => console.log(`- ${f.id}: ${f.name} (org: ${f.organization_id})`));
    } else {
      console.log('No farms found');
    }
  }

  // Check parcels
  console.log('\nFetching all parcels...');
  const { data: allParcels, error: listError } = await supabase
    .from('parcels')
    .select('*')
    .limit(10);

  if (listError) {
    console.error('Error fetching parcels:', listError);
    return;
  }

  console.log('\n=== ALL PARCELS (first 10) ===');
  if (allParcels && allParcels.length > 0) {
    allParcels.forEach(p => {
      console.log(`\n- ${p.id}: ${p.name}`);
      console.log(`  Farm ID: ${p.farm_id}`);
      console.log(`  Has boundary: ${p.boundary !== null && p.boundary !== undefined}`);
      if (p.boundary) {
        console.log(`  Boundary type: ${typeof p.boundary}`);
        console.log(`  Is array: ${Array.isArray(p.boundary)}`);
        if (Array.isArray(p.boundary)) {
          console.log(`  Points: ${p.boundary.length}`);
          console.log(`  Sample: ${JSON.stringify(p.boundary[0])}`);
        }
      }
    });
  } else {
    console.log('No parcels found');
  }

  // Now try to fetch the specific parcel if it exists
  const parcelId = '48e29a10-0e03-470e-b0ff-347111bb6338';
  const existingParcel = allParcels?.find(p => p.id === parcelId);

  if (existingParcel) {
    console.log('\n=== FOUND TARGET PARCEL ===');
    console.log('ID:', existingParcel.id);
    console.log('Name:', existingParcel.name);
    console.log('Has boundary?', existingParcel.boundary !== null && existingParcel.boundary !== undefined);

    if (existingParcel.boundary) {
      console.log('Boundary type:', typeof existingParcel.boundary);
      console.log('Boundary is array?', Array.isArray(existingParcel.boundary));
      console.log('Boundary length:', existingParcel.boundary.length);
      console.log('First few points:', JSON.stringify(existingParcel.boundary.slice(0, 3), null, 2));
    }
  } else {
    console.log(`\n⚠️  Parcel with ID ${parcelId} not found in the database`);
    console.log('The database appears to be empty. You need to:');
    console.log('1. Create an organization');
    console.log('2. Create a farm');
    console.log('3. Create parcels with boundary data');
    console.log('\nUse the application UI to create these entities or run database migrations.');
  }
}

checkParcel().catch(console.error);