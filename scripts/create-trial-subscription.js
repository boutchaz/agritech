/**
 * Quick script to create a trial subscription
 * Usage: node create-trial.js YOUR_EMAIL YOUR_PASSWORD YOUR_ORG_ID
 */

const API_URL = 'https://agritech-api.thebzlab.online';

async function createTrialSubscription() {
  const [email, password, orgId] = process.argv.slice(2);

  if (!email || !password) {
    console.error('❌ Usage: node create-trial.js YOUR_EMAIL YOUR_PASSWORD [ORG_ID]');
    console.error('   If ORG_ID is not provided, the script will try to find it automatically.');
    process.exit(1);
  }

  try {
    // Step 1: Login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      throw new Error(`Login failed: ${error}`);
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access_token;

    if (!accessToken) {
      throw new Error('No access token received');
    }

    console.log('✅ Logged in successfully');

    // Step 2: Get organization ID if not provided
    let organizationId = orgId;

    if (!organizationId) {
      console.log('🔍 Finding your organization...');
      // Try to get user profile which should include organization info
      const profileResponse = await fetch(`${API_URL}/api/v1/auth/profile`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        // You might need to adjust this based on your API response structure
        organizationId = profileData.organization_id || profileData.currentOrganization?.id;
      }

      if (!organizationId) {
        console.error('❌ Could not automatically find organization ID.');
        console.error('   Please provide it as the third argument:');
        console.error('   node create-trial.js YOUR_EMAIL YOUR_PASSWORD YOUR_ORG_ID');
        process.exit(1);
      }
    }

    console.log(`📋 Organization ID: ${organizationId}`);

    // Step 3: Create trial subscription
    console.log('📝 Creating trial subscription (PROFESSIONAL plan)...');
    const trialResponse = await fetch(`${API_URL}/api/v1/subscriptions/trial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        organization_id: organizationId,
        plan_type: 'PROFESSIONAL',
      }),
    });

    if (!trialResponse.ok) {
      const error = await trialResponse.text();
      throw new Error(`Failed to create trial: ${error}`);
    }

    const trialData = await trialResponse.json();

    if (trialData.success) {
      console.log('');
      console.log('✅ ✅ ✅ Trial subscription created successfully! ✅ ✅ ✅');
      console.log('');
      console.log('📊 Subscription Details:');
      console.log(`   Plan: PROFESSIONAL (Trial)`);
      console.log(`   Status: ${trialData.subscription.status}`);
      console.log(`   Start: ${new Date(trialData.subscription.current_period_start).toLocaleDateString()}`);
      console.log(`   End: ${new Date(trialData.subscription.current_period_end).toLocaleDateString()}`);
      console.log('');
      console.log('🎉 You now have full access for 14 days!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Refresh your browser at http://localhost:5173');
      console.log('2. You should now see the dashboard instead of subscription screen');
      console.log('3. Enjoy testing the new features!');
      console.log('');
    } else {
      throw new Error('Trial creation failed: ' + JSON.stringify(trialData));
    }

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

createTrialSubscription();
