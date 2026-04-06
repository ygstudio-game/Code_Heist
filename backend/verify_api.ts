import 'dotenv/config';

const API_URL = 'http://localhost:5000/api';

async function verify() {
  console.log('🚀 Starting Code Heist Verification Sequence...');

  try {
    // 1. LOGIN VERIFICATION (Team)
    console.log('--- 1. AUTHENTICATION ---');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessKey: 'PHANTOM_77', password: 'team123' })
    });
    const { token, team } = await loginRes.json();
    if (!token) throw new Error('Team Login Failed');
    console.log(`✅ Team Login Success: ${team.name}`);

    // 2. ADMIN LOGIN
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessKey: 'admin', password: 'admin123' })
    });
    const { token: adminToken } = await adminRes.json();
     if (!adminToken) throw new Error('Admin Login Failed');
    console.log('✅ Admin Login Success');

    // 3. FETCH SNIPPETS
    console.log('--- 2. SNIPPET DISCOVERY ---');
    const snippetsRes = await fetch(`${API_URL}/admin/snippets`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const snippets = await snippetsRes.json();
    console.log(`✅ Fetched ${snippets.length} snippets`);
    const targetSnippet = snippets[0];

    // 4. AUCTION START & BIDDING
    console.log('--- 3. AUCTION & BIDDING ---');
    await fetch(`${API_URL}/admin/auction/start`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ snippetId: targetSnippet.id, duration: 60 })
    });
    console.log('✅ Auction Started');

    const bidRes = await fetch(`${API_URL}/auction/place-bid`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ amount: 150 })
    });
    const bidData = await bidRes.json();
    if (bidData.error) console.error('❌ Bid Failed:', bidData.error);
    else console.log(`✅ Bid Placed: ${bidData.bid.amount} CR. New Credits: ${bidData.team.credits}`);

    // 5. CLAIM MECHANIC
    console.log('--- 4. CLAIM MECHANIC ---');
    const claimRes = await fetch(`${API_URL}/code/claim`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        snippetId: targetSnippet.id, 
        solverName: 'Operator 1', 
        solverRole: 'TEAM_LEADER' 
      })
    });
    const claimData = await claimRes.json();
    if (claimRes.ok) console.log('✅ Sector Claimed Successfully');
    else console.log('❌ Claim Failed (Expected if auction not ended):', claimData.error);

    // 6. CODE SUBMISSION & EXECUTION
    console.log('--- 5. CODE EXECUTION ---');
    const subRes = await fetch(`${API_URL}/code/submit`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        snippetId: targetSnippet.id, 
        code: targetSnippet.buggyCode, 
        solverName: 'Operator 1', 
        solverRole: 'TEAM_LEADER' 
      })
    });
    const subData = await subRes.json();
    console.log(`✅ Submission Status: ${subData.submission?.status || subData.error}`);
    console.log(`✅ Verification Log: ${subData.submission?.stdout || subData.error}`);

    console.log('--- VERIFICATION SEQUENCE COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ VERIFICATION CRITICAL FAILURE:', error);
    process.exit(1);
  }
}

verify();
