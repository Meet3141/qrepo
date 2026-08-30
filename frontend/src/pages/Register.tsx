import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.register(email, password);
      if (response.success) {
        navigate('/login', { state: { message: 'Registration successful! Please login.' } });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface text-on-surface antialiased font-body-lg">
      {/* Left Column: Illustration/Features (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-container flex-col relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-multiply" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBiKsVE8oAGDBshNRwa5DTQ5n3bfanYbgoEMW1isyl6Sd1ZXRn-aJAo5Dgw0B0LHXjknF4ljIUdG8wXwbQ0mH9R91nvP6bDbEb18Y5BW1rngvAqJzTaA2J7RH2_41VBK76JtiIBhS7r98Mu98V2ZmsGjeWqveSN6pplxlPPmAsOw5MMWIYwGkNK-TmV5DWHLYFSPuyvzd6NR9FTKbEOI1i9Kh_AC_tKEBQv0b6Jx9qwysg0BIYcIHc')" }}></div>
        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center h-full p-xl max-w-lg mx-auto w-full">
          <div className="mb-lg">
            <span className="text-display font-display text-primary tracking-tight">QRepo</span>
            <span className="block text-headline-md font-headline-md text-on-surface-variant mt-sm">Enterprise Assessment Platform</span>
          </div>
          <h1 className="text-display font-display mb-xl text-on-surface">Welcome to smarter academic management.</h1>
          <div className="space-y-lg">
            <div className="flex items-start gap-md">
              <div className="bg-primary-container text-on-primary-container p-sm rounded-lg flex-shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Centralized Resources</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Access your institution's complete library of subjects, documents, and question banks in one secure location.</p>
              </div>
            </div>
            <div className="flex items-start gap-md">
              <div className="bg-secondary-container text-on-secondary-container p-sm rounded-lg flex-shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Advanced Analytics</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Gain insights into student performance and assessment quality with AI-powered reporting tools.</p>
              </div>
            </div>
            <div className="flex items-start gap-md">
              <div className="bg-tertiary-container text-on-tertiary-container p-sm rounded-lg flex-shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>note_add</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Paper Generator</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Automatically generate balanced exam papers aligned with curriculum standards and difficulty constraints.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Column: Registration Form */}
      <div className="flex flex-col justify-center flex-1 px-margin-mobile sm:px-lg lg:px-xl py-xl bg-surface-bright z-10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Mobile Logo Header */}
          <div className="lg:hidden mb-lg text-center">
            <span className="text-headline-lg-mobile font-headline-lg-mobile text-primary font-bold">QRepo</span>
          </div>
          <h2 className="mt-6 text-center text-display font-display text-on-surface">Create your account</h2>
          <p className="mt-sm text-center text-body-md font-body-md text-on-surface-variant">
            Already have an account? 
            <a className="font-label-md text-label-md text-primary hover:text-primary-fixed-variant transition-colors ml-1" href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign in here</a>
          </p>
        </div>
        
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-surface-container-lowest py-8 px-4 shadow-sm border border-outline-variant rounded-xl sm:px-10">
            {error && (
              <div className="mb-md p-sm text-center text-error bg-error-container font-label-md rounded border border-error">
                {error}
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="name">Full Name</label>
                <div className="mt-1">
                  <input autoComplete="name" className="block w-full h-[40px] appearance-none rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface placeholder-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-md transition-colors" id="name" name="name" required type="text" value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>
              
              {/* Institution Email */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="email">Institution Email</label>
                <div className="mt-1">
                  <input autoComplete="email" className="block w-full h-[40px] appearance-none rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface placeholder-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-md transition-colors" id="email" name="email" required type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">Must use a valid .edu or institutional domain.</p>
              </div>
              
              {/* Role */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="role">Role</label>
                <div className="mt-1 relative">
                  <select className="block w-full h-[40px] appearance-none rounded-md border border-outline-variant bg-surface-container-lowest pl-3 pr-10 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-md transition-colors" id="role" name="role" required value={role} onChange={e => setRole(e.target.value)}>
                    <option disabled value="">Select your role</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                    <option value="student">Student</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <span className="material-symbols-outlined text-outline">expand_more</span>
                  </div>
                </div>
              </div>
              
              {/* Password */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="password">Password</label>
                <div className="mt-1">
                  <input autoComplete="new-password" className="block w-full h-[40px] appearance-none rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface placeholder-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-md transition-colors" id="password" name="password" required type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>
              
              {/* Terms */}
              <div className="flex items-center">
                <input className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary" id="terms" name="terms" required type="checkbox"/>
                <label className="ml-2 block font-body-md text-body-md text-on-surface-variant" htmlFor="terms">
                    I agree to the <a className="text-primary hover:underline" href="#">Terms of Service</a> and <a className="text-primary hover:underline" href="#">Privacy Policy</a>.
                </label>
              </div>
              
              {/* Submit Button */}
              <div>
                <button disabled={loading} className="flex w-full justify-center items-center gap-2 rounded-md bg-primary px-[16px] py-[10px] font-label-md text-label-md text-on-primary shadow-sm hover:bg-on-primary-fixed-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-70" type="submit">
                    {loading ? 'Registering...' : 'Register Account'}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
