// X Auth initialization
export async function initXAuth() {
    try {
        // Initialize X OAuth
        const xAuth = {
            clientId: 'AAAAAAAAAAAAAAAAAAAAAJBkxgEAAAAAy%2FCih1ywViiV%2FAI9bUvrMUBPkzo%3Dx5EwVeMuKAfrGczqGnQResd9DgTQPg4rkrlsIW0Ct9p2dPbjNF',
            redirectUri: `${window.location.origin}/auth/callback`,
            scope: 'read:user',
            authEndpoint: 'https://api.twitter.com/2/oauth2/authorize'
        };

        return {
            signIn: async () => {
                // Generate PKCE challenge
                const codeVerifier = generateRandomString(128);
                const codeChallenge = await generateCodeChallenge(codeVerifier);
                
                // Store code verifier for later use
                sessionStorage.setItem('code_verifier', codeVerifier);
                
                // Build auth URL
                const params = new URLSearchParams({
                    response_type: 'code',
                    client_id: xAuth.clientId,
                    redirect_uri: xAuth.redirectUri,
                    scope: xAuth.scope,
                    code_challenge: codeChallenge,
                    code_challenge_method: 'S256',
                    state: generateRandomString(32)
                });

                // Redirect to X auth page
                window.location.href = `${xAuth.authEndpoint}?${params.toString()}`;
                
                // This promise will resolve after redirect back
                return new Promise((resolve) => {
                    window.addEventListener('message', async (event) => {
                        if (event.data.type === 'X_AUTH_CALLBACK') {
                            const { code } = event.data;
                            const profile = await exchangeCodeForProfile(code, codeVerifier);
                            resolve(profile);
                        }
                    });
                });
            }
        };
    } catch (error) {
        console.error('Failed to initialize X Auth:', error);
        return null;
    }
}

// Helper functions for X Auth
function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function exchangeCodeForProfile(code, verifier) {
    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${window.location.origin}/auth/callback`,
                code_verifier: verifier,
                client_id: process.env.X_CLIENT_ID
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange code for token');
        }

        const { access_token } = await tokenResponse.json();

        // Get user profile
        const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const { data } = await profileResponse.json();
        return {
            username: data.username,
            displayName: data.name,
            profileImage: data.profile_image_url
        };
    } catch (error) {
        console.error('Error exchanging code for profile:', error);
        return null;
    }
}

// X Authentication handler
export async function authenticateWithX() {
    try {
        // Initialize X Auth
        const auth = await initXAuth();
        if (!auth) {
            throw new Error('X authentication failed to initialize');
        }

        // Show loading state
        const xLoginBtn = document.getElementById('xLoginBtn');
        const originalText = xLoginBtn.textContent;
        xLoginBtn.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Connecting...</span>
            </div>
        `;

        // Authenticate with X
        const xProfile = await auth.signIn();
        
        if (!xProfile) {
            throw new Error('Failed to get X profile');
        }

        // Store X profile data
        localStorage.setItem('memepire_x_profile', JSON.stringify({
            username: xProfile.username,
            displayName: xProfile.displayName,
            profileImage: xProfile.profileImage,
            timestamp: Date.now()
        }));

        return true;
    } catch (error) {
        console.error('X authentication error:', error);
        return false;
    }
} 