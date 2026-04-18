const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:8000';

export async function api(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('arena_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  return res;
}

/**
 * Request an OTP for email-based login
 * @param email User's email address
 */
export async function requestOTP(email: string) {
  const res = await api('/auth/email/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || 'Failed to request OTP');
  }
  return res.json();
}

/**
 * Verify the OTP code sent to email
 * @param email User's email address
 * @param code 6-digit verification code
 */
export async function verifyOTP(email: string, code: string) {
  const res = await api('/auth/email/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || 'Invalid verification code');
  }
  
  const data = await res.json();
  // Persistence is handled by the caller or slice, but we return the data here
  return data;
}

/**
 * Initiates GitHub OAuth flow via backend redirect
 */
export async function loginWithGithub() {
  try {
    const res = await api('/auth/github/login');
    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url;
    } else {
      console.error("Failed to fetch Github URL");
    }
  } catch (error) {
    console.error("Error redirecting to Github", error);
  }
}
