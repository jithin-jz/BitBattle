import { writable, derived } from 'svelte/store';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:8000';

// Persist user and token in localStorage with safety
let initialUser = null;
let initialToken = null;

if (typeof window !== 'undefined') {
    initialToken = localStorage.getItem('arena_token');
    const storedUser = localStorage.getItem('arena_user');
    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        try {
            initialUser = JSON.parse(storedUser);
        } catch (e) {
            console.error('Failed to parse stored user:', e);
            localStorage.removeItem('arena_user');
        }
    }
}

/** @type {import('svelte/store').Writable<User|null>} */
export const user = writable(initialUser);

/** @type {import('svelte/store').Writable<string|null>} */
export const accessToken = writable(initialToken);


// Update localStorage when stores change
if (typeof window !== 'undefined') {
    user.subscribe(val => {
        if (val) localStorage.setItem('arena_user', JSON.stringify(val));
        else localStorage.removeItem('arena_user');
    });
    accessToken.subscribe(val => {
        if (val) localStorage.setItem('arena_token', val);
        else localStorage.removeItem('arena_token');
    });
}

export const isAuthenticated = derived(user, ($user) => $user !== null);

/**
 * Make an authenticated API request.
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function api(path, options = {}) {
    let token = null;
    accessToken.subscribe((t) => (token = t))();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
            credentials: 'include',
        });
        return res;
    } catch (e) {
        console.error('API request failed:', e);
        throw new Error('Server unreachable. Please check your connection.');
    }
}


/**
 * Request OTP for email.
 * @param {string} email
 */
export async function requestOTP(email) {
    const res = await api('/auth/email/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.detail || 'Failed to send OTP');
    }
    return data;
}


/**
 * Verify OTP and log in.
 * @param {string} email
 * @param {string} code
 */
export async function verifyOTP(email, code) {
    const res = await api('/auth/email/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Verification failed');
    }
    const data = await res.json();
    accessToken.set(data.access_token);
    user.set(data.user);
    return data;
}

/**
 * Start GitHub OAuth.
 */
export async function loginWithGithub() {
    const res = await api('/auth/github/login');
    const data = await res.json();
    window.location.href = data.url;
}

/**
 * Fetch current user profile.
 */
export async function fetchMe() {
    try {
        const res = await api('/auth/me');
        if (res.ok) {
            const data = await res.json();
            user.set(data);
            return data;
        }
    } catch {
        // Not authenticated
    }
    return null;
}

/**
 * Logout.
 */
export async function logout() {
    try {
        await api('/auth/logout', { method: 'POST' });
    } catch (e) {
        console.error('Server logout failed:', e);
    } finally {
        user.set(null);
        accessToken.set(null);
    }
}
