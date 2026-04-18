import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth } from '../features/auth/authSlice';

export default function GithubCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      import('../shared/api').then(({ api }) => {
        api(`/auth/github/callback?code=${code}`)
          .then(res => {
            if (!res.ok) throw new Error('Auth failed');
            return res.json();
          })
          .then(data => {
            dispatch(setAuth({ user: data.user, accessToken: data.access_token }));
            navigate('/lobby');
          })
          .catch(e => {
            console.error('Failed to parse user data from callback', e);
            navigate('/login?error=auth_failed');
          });
      });
    } else {
      navigate('/login?error=missing_code');
    }
  }, [searchParams, dispatch, navigate]);

  return (
    <div className="min-h-screen bg-lc-bg flex items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-lc-orange border-t-transparent animate-spin rounded-full mx-auto mb-6"></div>
        <h2 className="text-xl font-bold text-lc-text-primary">Securing Session...</h2>
        <p className="text-lc-text-secondary text-sm mt-2">Authenticating with GitHub</p>
      </div>
    </div>
  );
}
