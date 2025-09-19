#!/usr/bin/env node

/*
 Verifies that the custom access token hook sets claims.role on issued access tokens.

 Requirements (env):
 - NEXT_PUBLIC_SUPABASE_URL
 - NEXT_PUBLIC_SUPABASE_ANON_KEY
 Optional for auto-provisioning a temp user (recommended for non-prod):
 - SUPABASE_SERVICE_ROLE_KEY
 - TEST_EMAIL, TEST_PASSWORD (to use an existing user instead of creating one)

 Usage:
   npm run verify:auth-hook
*/

const fetch = globalThis.fetch;

function b64urlDecode(str) {
  // Node supports base64url from v16. This polyfill is safe.
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad) str += '='.repeat(4 - pad);
  return Buffer.from(str, 'base64').toString('utf8');
}

function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT');
  return JSON.parse(b64urlDecode(parts[1]));
}

function randEmail() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `hook-test+${Date.now()}_${rand}@example.test`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;
  const serviceRole = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  let email = testEmail;
  let password = testPassword;

  const admin = serviceRole ? { key: serviceRole } : null;

  let createdUserId = null;
  // If no credentials provided, create a temporary confirmed user when service role is available
  if ((!email || !password) && admin) {
    email = randEmail();
    password = Math.random().toString(36) + 'A9!';
    console.log(`Creating temp user: ${email}`);
    const resp = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: admin.key,
        Authorization: `Bearer ${admin.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'client' },
        app_metadata: { provider: 'password' },
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('Failed to create temp user:', text);
      process.exit(1);
    }
    const created = await resp.json();
    createdUserId = created?.id || created?.user?.id || null;
  } else if (!email || !password) {
    console.error('Provide TEST_EMAIL and TEST_PASSWORD or SUPABASE_SERVICE_ROLE_KEY to auto-create a temp user.');
    process.exit(1);
  }

  // Sign in to obtain an access token (this triggers the access token hook)
  const tokenResp = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    console.error('Sign-in failed:', text);
    if (createdUserId && admin) {
      await fetch(`${url}/auth/v1/admin/users/${createdUserId}`, {
        method: 'DELETE',
        headers: { apikey: admin.key, Authorization: `Bearer ${admin.key}` },
      });
    }
    process.exit(1);
  }

  const sessionData = await tokenResp.json();
  const accessToken = sessionData?.access_token || sessionData?.session?.access_token;
  if (!accessToken) {
    console.error('No access token returned.');
    if (createdUserId && admin) {
      await admin.auth.admin.deleteUser(createdUserId);
    }
    process.exit(1);
  }

  const claims = decodeJwt(accessToken);
  console.log('Decoded JWT claims:', {
    sub: claims.sub,
    role: claims.role,
    email: claims.email,
    iss: claims.iss,
    exp: claims.exp,
  });

  // Compare with user/app metadata role if available
  // Fetch user
  const userResp = await fetch(`${url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const user = userResp.ok ? await userResp.json() : null;
  const metadataRole = user?.user_metadata?.role || user?.app_metadata?.role;
  if (metadataRole) {
    console.log('Metadata role:', metadataRole);
  }

  if (!claims.role) {
    console.error('ERROR: JWT missing role claim. The access token hook may not be configured or function failed.');
  } else {
    console.log('SUCCESS: JWT includes role claim:', claims.role);
  }

  // Cleanup temp user if created
  if (createdUserId && admin) {
    await fetch(`${url}/auth/v1/admin/users/${createdUserId}`, {
      method: 'DELETE',
      headers: { apikey: admin.key, Authorization: `Bearer ${admin.key}` },
    });
    console.log('Cleaned up temp user');
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
