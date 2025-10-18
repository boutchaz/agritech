import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvegjdkkbhlhbjpbhpou.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWdqZGtrYmhsaGJqcGJocG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Njc4NzEsImV4cCI6MjA3NDI0Mzg3MX0.t5RMzdumbehxq5DRtHEbiNOAW4KstcysOFx2xg4Z67E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestData() {
  console.log('Creating test data in Supabase...\n');

  // Step 1: Create an organization
  console.log('1. Creating organization...');
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Test Organization',
      slug: 'test-org',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (orgError && orgError.code !== '23505') {
    console.error('Error creating organization:', orgError);
    return;
  }

  let orgId;
  if (org) {
    orgId = org.id;
    console.log('✓ Organization created:', org.name, org.id);
  } else {
    // Organization might already exist, fetch it
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select()
      .eq('slug', 'test-org')
      .single();
    orgId = existingOrg?.id;
    console.log('✓ Using existing organization:', existingOrg?.name, orgId);
  }

  // Step 2: Create a farm
  console.log('\n2. Creating farm...');
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .insert({
      organization_id: orgId,
      name: 'Test Farm Morocco',
      location: 'Marrakech, Morocco',
      size: 50,
      manager_name: 'Ahmed Ben Ali',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (farmError && farmError.code !== '23505') {
    console.error('Error creating farm:', farmError);
    return;
  }

  let farmId;
  if (farm) {
    farmId = farm.id;
    console.log('✓ Farm created:', farm.name, farm.id);
  } else {
    // Farm might already exist, fetch it
    const { data: existingFarm } = await supabase
      .from('farms')
      .select()
      .eq('organization_id', orgId)
      .single();
    farmId = existingFarm?.id;
    console.log('✓ Using existing farm:', existingFarm?.name, farmId);
  }

  // Step 3: Create parcels with boundaries
  console.log('\n3. Creating parcels with boundaries...');

  // Parcel 1: Rectangle near Marrakech
  const parcel1Boundary = [
    [-8.0126, 31.6348],
    [-8.0126, 31.6398],
    [-8.0076, 31.6398],
    [-8.0076, 31.6348],
    [-8.0126, 31.6348]  // Close the polygon
  ];

  const { data: parcel1, error: parcel1Error } = await supabase
    .from('parcels')
    .insert({
      id: '48e29a10-0e03-470e-b0ff-347111bb6338',  // Use the specific ID from the URL
      farm_id: farmId,
      name: 'Olive Grove North',
      description: 'Northern section with mature olive trees',
      area: 10.5,
      area_unit: 'hectares',
      boundary: parcel1Boundary,
      soil_type: 'Clay loam',
      irrigation_type: 'drip',
      tree_type: 'Olive',
      tree_count: 420,
      planting_year: 2010,
      variety: 'Picholine Marocaine',
      rootstock: 'Oleaster',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (parcel1Error && parcel1Error.code !== '23505') {
    console.error('Error creating parcel 1:', parcel1Error);
  } else if (parcel1) {
    console.log('✓ Parcel 1 created:', parcel1.name, parcel1.id);
    console.log('  - Boundary points:', parcel1.boundary?.length || 0);
  } else {
    console.log('✓ Parcel 1 already exists');
  }

  // Parcel 2: Irregular polygon
  const parcel2Boundary = [
    [-8.0050, 31.6320],
    [-8.0055, 31.6380],
    [-8.0010, 31.6385],
    [-7.9995, 31.6330],
    [-8.0020, 31.6315],
    [-8.0050, 31.6320]  // Close the polygon
  ];

  const { data: parcel2, error: parcel2Error } = await supabase
    .from('parcels')
    .insert({
      farm_id: farmId,
      name: 'Citrus Field South',
      description: 'Southern field with citrus trees',
      area: 8.2,
      area_unit: 'hectares',
      boundary: parcel2Boundary,
      soil_type: 'Sandy loam',
      irrigation_type: 'sprinkler',
      tree_type: 'Citrus',
      tree_count: 330,
      planting_year: 2015,
      variety: 'Valencia Orange',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (parcel2Error && parcel2Error.code !== '23505') {
    console.error('Error creating parcel 2:', parcel2Error);
  } else if (parcel2) {
    console.log('✓ Parcel 2 created:', parcel2.name, parcel2.id);
    console.log('  - Boundary points:', parcel2.boundary?.length || 0);
  }

  // Parcel 3: Without boundary (to show the warning)
  const { data: parcel3, error: parcel3Error } = await supabase
    .from('parcels')
    .insert({
      farm_id: farmId,
      name: 'New Field East',
      description: 'Newly acquired field - boundaries to be defined',
      area: 5.0,
      area_unit: 'hectares',
      soil_type: 'Silt loam',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (parcel3Error && parcel3Error.code !== '23505') {
    console.error('Error creating parcel 3:', parcel3Error);
  } else if (parcel3) {
    console.log('✓ Parcel 3 created (no boundary):', parcel3.name, parcel3.id);
  }

  // Step 4: Verify the data
  console.log('\n4. Verifying parcels with boundaries...');
  const { data: allParcels, error: verifyError } = await supabase
    .from('parcels')
    .select('id, name, boundary')
    .eq('farm_id', farmId);

  if (verifyError) {
    console.error('Error verifying parcels:', verifyError);
    return;
  }

  console.log('\n=== CREATED PARCELS ===');
  allParcels.forEach(p => {
    const hasBoundary = p.boundary !== null && p.boundary !== undefined;
    const pointCount = hasBoundary && Array.isArray(p.boundary) ? p.boundary.length : 0;
    console.log(`- ${p.name}`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Has boundary: ${hasBoundary}`);
    if (hasBoundary) {
      console.log(`  Boundary points: ${pointCount}`);
    }
  });

  console.log('\n✅ Test data created successfully!');
  console.log('\nYou can now access the parcel at:');
  console.log(`http://agritech-dashboard-g6sumg-2b12b9-5-75-154-125.traefik.me:3002/parcels?parcelId=48e29a10-0e03-470e-b0ff-347111bb6338&tab=satellite`);
}

createTestData().catch(console.error);