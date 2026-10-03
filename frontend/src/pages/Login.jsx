import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/auth';
import { notifyError } from '../api/errors';
import { dashboardFor, getRole, getToken } from '../api/session';
import { toast } from '../components/Toast';
import { useTheme } from '../components/ThemeProvider';

const NOT_AVAILABLE = {
  sso: 'Single sign-on is not configured for QRepo yet. Please sign in with your email and password.',
  reset: 'Password reset is not available yet. Please contact your administrator.',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  // Already signed in: skip the form
  useEffect(() => {
    if (getToken() && getRole()) navigate(dashboardFor(getRole()), { replace: true });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const user = await authService.login(email.trim(), password, remember);
      navigate(dashboardFor(user.role?.name), { replace: true });
    } catch (err) {
      authService.logout();
      notifyError(err, 'Sign in failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-body-lg text-body-lg text-on-background antialiased selection:bg-primary-fixed selection:text-on-primary-fixed relative bg-inverse-on-surface">
      {/* Theme toggle — floating top-right */}
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors shadow-sm z-20"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: theme === 'light' ? "'FILL' 1" : "'FILL' 0" }}>
          {theme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      {/* Left Pane - Branding & Features (Hidden on mobile/tablet) */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-surface overflow-hidden border-r border-outline-variant">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80")' }}
        >
          <div className="absolute inset-0 bg-surface/85 backdrop-blur-[2px]"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-20 max-w-3xl">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-primary tracking-tight mb-2">QRepo</h1>
            <p className="text-lg font-semibold text-on-surface-variant">Enterprise Assessment Platform</p>
          </div>
          
          <h2 className="text-5xl font-bold text-on-surface leading-tight mb-16 tracking-tight">
            Welcome to smarter<br />academic management.
          </h2>
          
          <div className="space-y-10">
            {/* Feature 1 */}
            <div className="flex gap-5">
              <div className="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-lg">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>library_books</span>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-on-surface mb-1.5">Centralized Resources</h3>
                <p className="text-[15px] text-on-surface-variant leading-relaxed">Access your institution's complete library of subjects, documents, and question banks in one secure location.</p>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="flex gap-5">
              <div className="w-14 h-14 rounded-xl bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0 shadow-sm border border-outline-variant/50">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-on-surface mb-1.5">Advanced Analytics</h3>
                <p className="text-[15px] text-on-surface-variant leading-relaxed">Gain insights into student performance and assessment quality with AI-powered reporting tools.</p>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="flex gap-5">
              <div className="w-14 h-14 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-on-surface mb-1.5">Paper Generator</h3>
                <p className="text-[15px] text-on-surface-variant leading-relaxed">Automatically generate balanced exam papers aligned with curriculum standards and difficulty constraints.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - Form Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        
        {/* Mobile-only header (shows when left pane is hidden) */}
        <div className="lg:hidden text-center mb-8">
          <h1 className="text-4xl font-bold text-primary tracking-tight mb-1">QRepo</h1>
          <p className="text-sm text-on-surface-variant">Enterprise Assessment Platform</p>
        </div>

        {/* Main Card */}
        <main className="w-full max-w-[400px] bg-surface-container-lowest border border-outline-variant rounded-[16px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-1px_rgba(0,0,0,0.06)] overflow-hidden">
          
          {/* Header Section */}
          <div className="px-8 pt-8 pb-4 text-center hidden lg:block">
            <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-1">Sign in</h2>
            <p className="text-sm text-on-surface-variant">Access your account</p>
          </div>
          
          <div className="px-8 pt-6 pb-4 text-center lg:hidden">
            <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-1">Sign in</h2>
          </div>

          {/* Form Section */}
          <div className="px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-on-surface block" htmlFor="email">Email Address</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  placeholder="name@institution.edu"
                  className="w-full h-[40px] px-4 bg-surface-container-low border border-outline-variant rounded text-on-surface text-sm placeholder:text-outline focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              
              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-on-surface block" htmlFor="password">Password</label>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  autoComplete="current-password" 
                  required 
                  placeholder="••••••••"
                  className="w-full h-[40px] px-4 bg-surface-container-low border border-outline-variant rounded text-on-surface text-sm placeholder:text-outline focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              
              {/* Actions Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <input 
                    id="remember-me" 
                    name="remember-me" 
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary bg-surface-container-low cursor-pointer" 
                  />
                  <label className="ml-2 text-sm text-on-surface-variant cursor-pointer" htmlFor="remember-me">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <button type="button" onClick={() => toast.info(NOT_AVAILABLE.reset)} className="text-primary hover:text-primary-container transition-colors">
                    Forgot password?
                  </button>
                </div>
              </div>
              
              {/* Primary Submit Button */}
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-[10px] px-[16px] border border-transparent rounded bg-primary text-on-primary text-sm font-medium shadow-sm hover:bg-surface-tint focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="mt-6 relative">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface-container-lowest text-xs text-on-surface-variant">Or continue with</span>
              </div>
            </div>

            {/* Secondary Login Options */}
            <div className="mt-6 space-y-2">
              <button type="button" onClick={() => toast.info(NOT_AVAILABLE.sso)} className="w-full flex items-center justify-center gap-2 py-[10px] px-[16px] bg-surface-container-lowest border border-outline-variant rounded text-on-surface text-sm font-medium hover:bg-surface-container-low transition-colors active:scale-[0.98]">
                <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                  <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"></path>
                  <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"></path>
                  <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"></path>
                  <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853"></path>
                </svg>
                Google
              </button>
              <button type="button" onClick={() => toast.info(NOT_AVAILABLE.sso)} className="w-full flex items-center justify-center gap-2 py-[10px] px-[16px] bg-surface-container-lowest border border-outline-variant rounded text-on-surface text-sm font-medium hover:bg-surface-container-low transition-colors active:scale-[0.98]">
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
          <div className="bg-surface-container py-2 px-8 border-t border-outline-variant flex items-center justify-center">
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
              Secure Enterprise Login
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
