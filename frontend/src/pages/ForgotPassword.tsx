import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const navigate = useNavigate();

  const handleSendLink = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, call API to send reset link
    setStep(2);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, call API to reset password
    if (newPassword === confirmPassword) {
      navigate('/login', { state: { message: 'Password reset successful!' } });
    }
  };

  return (
    <div className="h-screen bg-surface flex items-center justify-center font-sans antialiased text-on-surface">
      <div className="w-full max-w-md p-lg">
        {/* Brand Header */}
        <div className="text-center mb-xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-container text-on-primary-container mb-md shadow-sm">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '28px' }}>school</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-primary">QRepo</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-sm">Enterprise Assessment Platform</p>
        </div>
        
        {step === 1 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-1px_rgba(0,0,0,0.06)]">
            <div className="mb-lg text-center">
              <h2 className="font-headline-md text-headline-md text-on-surface">Forgot Password</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm">Enter your email address and we'll send you instructions to reset your password.</p>
            </div>
            
            <form className="space-y-lg" onSubmit={handleSendLink}>
              <div className="space-y-sm">
                <label className="block font-label-md text-label-md text-on-surface" htmlFor="email">Email Address</label>
                <input 
                  className="w-full h-10 px-md py-sm rounded border border-outline-variant bg-surface-bright focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md transition-colors" 
                  id="email" 
                  placeholder="name@institution.edu" 
                  required 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button className="w-full h-10 flex items-center justify-center bg-primary text-on-primary font-label-md text-label-md rounded hover:bg-primary-container transition-colors" type="submit">
                  Send Reset Link
              </button>
            </form>
            
            <div className="mt-lg text-center">
              <a className="inline-flex items-center gap-sm font-label-md text-label-md text-secondary hover:text-primary transition-colors" href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                Back to login
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-1px_rgba(0,0,0,0.06)]">
            <div className="mb-lg text-center">
              <h2 className="font-headline-md text-headline-md text-on-surface">Reset Password</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm">Please create a new, secure password for your account.</p>
            </div>
            
            <form className="space-y-lg" onSubmit={handleResetPassword}>
              <div className="space-y-sm">
                <label className="block font-label-md text-label-md text-on-surface" htmlFor="new-password">New Password</label>
                <div className="relative">
                  <input 
                    className="w-full h-10 pl-md pr-10 py-sm rounded border border-outline-variant bg-surface-bright focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md transition-colors" 
                    id="new-password" 
                    required 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button className="absolute inset-y-0 right-0 pr-md flex items-center text-on-surface-variant hover:text-on-surface" type="button">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>visibility_off</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-sm">
                <label className="block font-label-md text-label-md text-on-surface" htmlFor="confirm-password">Confirm Password</label>
                <input 
                  className="w-full h-10 px-md py-sm rounded border border-outline-variant bg-surface-bright focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md transition-colors" 
                  id="confirm-password" 
                  required 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              
              <div className="bg-surface-container p-md rounded-lg border border-outline-variant">
                <h3 className="font-label-md text-label-md text-on-surface mb-sm">Password Requirements:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-sm font-body-md text-body-md text-secondary">
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: '16px' }}>check_circle</span>
                    At least 12 characters
                  </li>
                  <li className="flex items-center gap-sm font-body-md text-body-md text-secondary">
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: '16px' }}>check_circle</span>
                    Uppercase &amp; lowercase letters
                  </li>
                  <li className="flex items-center gap-sm font-body-md text-body-md text-secondary">
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: '16px' }}>check_circle</span>
                    At least one number &amp; symbol
                  </li>
                </ul>
              </div>
              
              <button className="w-full h-10 flex items-center justify-center bg-primary text-on-primary font-label-md text-label-md rounded hover:bg-primary-container transition-colors" type="submit">
                Update Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
