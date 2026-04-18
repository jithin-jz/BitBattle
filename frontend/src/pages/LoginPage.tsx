import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setAuth } from '../features/auth/authSlice';
import { requestOTP, verifyOTP, loginWithGithub } from '../shared/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await requestOTP(email);
      setShowOtp(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const data = await verifyOTP(email, otp);
      dispatch(setAuth({ user: data.user, accessToken: data.access_token }));
      navigate('/lobby');
    } catch (e: any) {
      setError(e.message || 'Invalid verification code.');
    }
    setLoading(false);
  };

  const handleOtpInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-lc-bg">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <div className="inline-block w-3 h-12 bg-lc-orange rounded-full mb-6 shadow-[0_0_15px_rgba(255,161,22,0.4)]"></div>
          <h1 className="text-3xl font-bold tracking-tight text-lc-text-primary mb-2">Welcome Back</h1>
          <p className="text-lc-text-secondary text-sm">Empower your coding skills in real-time duels</p>
        </div>

        <div className="lc-card p-8 bg-lc-surface/50 backdrop-blur-sm shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-lc-orange/30 to-transparent"></div>

          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-6">
            {!showOtp ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-semibold text-lc-text-secondary uppercase tracking-wider">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. josh@hacker.com"
                      className="lc-input"
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={handleLogin}
                    disabled={loading || !email}
                    className="w-full lc-button-primary disabled:opacity-30"
                  >
                    {loading ? 'Sending OTP...' : 'Sign In with OTP'}
                  </button>
                </div>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-lc-border"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold">
                    <span className="bg-[#111] px-2 text-lc-text-muted tracking-[0.2em]">Social Fabric</span>
                  </div>
                </div>

                <button
                  onClick={loginWithGithub}
                  className="w-full lc-button-secondary flex items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  GitHub OAuth
                </button>
              </>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-[10px] text-lc-text-secondary uppercase tracking-[0.3em] font-bold mb-2">Check your email</div>
                  <div className="text-xl font-bold text-lc-orange">Secret Code Recieved</div>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={handleOtpInput}
                    placeholder="......"
                    className="lc-input text-center text-4xl font-mono tracking-[0.5em] py-5 border-lc-orange/50 focus:border-lc-orange bg-lc-surface-elevated/50"
                  />
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowOtp(false)}
                      className="flex-1 lc-button-secondary text-xs uppercase"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={loading || otp.length < 6}
                      className="flex-[2] lc-button-primary text-xs uppercase"
                    >
                      {loading ? 'Validating...' : 'Unlock Battle'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-lc-text-muted uppercase tracking-[0.2em] opacity-40">
          Digital Duels &bull; Rapid Solutions &bull; ELO Ascendance
        </p>
      </div>
    </div>
  );
}
