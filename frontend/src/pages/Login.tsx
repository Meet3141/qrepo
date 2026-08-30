import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const from = location.state?.from?.pathname || '/splash';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      if (response.success) {
        // Fetch user info to complete login
        localStorage.setItem('token', response.data.access_token);
        const meResponse = await authService.getMe();
        if (meResponse.success) {
          login(response.data.access_token, meResponse.data);
          navigate(from, { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-inverse-on-surface min-h-screen flex items-center justify-center p-margin-mobile md:p-gutter font-body-lg text-body-lg text-on-background antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Main Container */}
      <main className="w-full max-w-[400px] mx-auto bg-surface-container-lowest border border-outline-variant rounded-[16px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-1px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Header Section */}
        <div className="px-xl pt-xl pb-md text-center">
          <h1 className="font-display text-display text-primary tracking-tight mb-xs">QRepo</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Sign in to your account</p>
        </div>
        
        {/* Form Section */}
        <div className="px-xl pb-xl">
          {error && (
            <div className="mb-md p-sm text-center text-error bg-error-container font-label-md rounded border border-error">
              {error}
            </div>
          )}
          
          <form className="space-y-md" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="space-y-sm">
              <label className="font-label-sm text-label-sm text-on-surface block" htmlFor="email">Email Address</label>
              <input 
                autoComplete="email" 
                className="w-full h-[40px] px-md bg-surface-container-low border border-outline-variant rounded text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200" 
                id="email" 
                name="email" 
                placeholder="name@institution.edu" 
                required 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {/* Password Input */}
            <div className="space-y-sm">
              <label className="font-label-sm text-label-sm text-on-surface block" htmlFor="password">Password</label>
              <input 
                autoComplete="current-password" 
                className="w-full h-[40px] px-md bg-surface-container-low border border-outline-variant rounded text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200" 
                id="password" 
                name="password" 
                placeholder="••••••••" 
                required 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {/* Actions Row */}
            <div className="flex items-center justify-between pt-xs">
              <div className="flex items-center">
                <input className="h-[16px] w-[16px] rounded border-outline-variant text-primary focus:ring-primary bg-surface-container-low cursor-pointer" id="remember-me" name="remember-me" type="checkbox"/>
                <label className="ml-sm font-label-md text-label-md text-on-surface-variant cursor-pointer" htmlFor="remember-me">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors" href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}>
                  Forgot password?
                </a>
              </div>
            </div>
            
            {/* Primary Submit Button */}
            <div className="pt-sm">
              <button disabled={loading} className="w-full flex justify-center py-[10px] px-[16px] border border-transparent rounded bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:bg-surface-tint focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed" type="submit">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
            
            <div className="text-center pt-xs">
              <span className="font-label-md text-on-surface-variant mr-1">Don't have an account?</span>
              <a className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors" href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>
                Register
              </a>
            </div>
          </form>
          
          {/* Divider */}
          <div className="mt-lg relative">
            <div aria-hidden="true" className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-md bg-surface-container-lowest font-label-sm text-label-sm text-on-surface-variant">Or continue with</span>
            </div>
          </div>
          
          {/* Secondary Login Options */}
          <div className="mt-lg space-y-sm">
            <button className="w-full flex items-center justify-center gap-sm py-[10px] px-[16px] bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors active:scale-[0.98]" type="button">
              <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"></path>
                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"></path>
                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"></path>
                <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853"></path>
              </svg>
              Google
            </button>
            <button className="w-full flex items-center justify-center gap-sm py-[10px] px-[16px] bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors active:scale-[0.98]" type="button">
              <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 21 21">
                <rect fill="#F25022" height="9" width="9" x="1" y="1"></rect>
                <rect fill="#7FBA00" height="9" width="9" x="11" y="1"></rect>
                <rect fill="#00A4EF" height="9" width="9" x="1" y="11"></rect>
                <rect fill="#FFB900" height="9" width="9" x="11" y="11"></rect>
              </svg>
              Microsoft
            </button>
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="bg-surface-container py-sm px-xl border-t border-outline-variant flex items-center justify-center">
          <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
            Secure Enterprise Login
          </span>
        </div>
      </main>
    </div>
  );
};

export default Login;
