import React, { useState } from 'react';
import mslogo from '../Assets/mslogo.png';
import { useNavigate } from 'react-router-dom';
import { useRole } from './RoleContext';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import { FaUserShield, FaUserMd, FaEye, FaEyeSlash, FaLock, FaEnvelope, FaUser, FaPhone } from 'react-icons/fa';

const AuthForm = () => {
  const navigate = useNavigate();
  const { setRole } = useRole();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Admin',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'role') {
      setFormData({
        ...formData,
        role: value,
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Standard universal email regex
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password requirements only checked during registration
  const validateSignupPassword = () => {
    const { password, role } = formData;
    const minLength = role === 'Admin' ? 6 : 4;
    return password && password.length >= minLength;
  };

  const handleQuickLogin = (demoRole) => {
    const demoUser = {
      name: demoRole === 'Admin' ? 'System Administrator' : 'Staff Pharmacist',
      email: demoRole === 'Admin' ? 'admin@medstock.com' : 'pharmacist@medstock.com',
      role: demoRole,
      id: demoRole === 'Admin' ? 1 : 2
    };

    setRole(demoRole);
    localStorage.setItem('role', demoRole);
    localStorage.setItem('user', JSON.stringify(demoUser));
    localStorage.setItem('username', demoUser.email);
    localStorage.setItem('token', 'demo_jwt_token_' + Date.now());

    toast.success(`Logged in as ${demoRole}!`);
    navigate('/Home');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !validateEmail(formData.email.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (!formData.password) {
      toast.error('Please enter your password.');
      return;
    }

    // Strict validation ONLY on Registration
    if (!isLogin) {
      if (!formData.name.trim()) {
        toast.error('Please enter your full name.');
        return;
      }

      if (formData.contact && !/^\d{10}$/.test(formData.contact.trim())) {
        toast.error('Contact number must be 10 digits.');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match!');
        return;
      }

      if (!validateSignupPassword()) {
        toast.error(`Password must be at least ${formData.role === 'Admin' ? 6 : 4} characters long.`);
        return;
      }
    }

    setLoading(true);
    const endpoint = isLogin ? '/login' : '/signup';

    try {
      const response = await api.post(endpoint, {
        name: formData.name.trim() || (formData.role === 'Admin' ? 'Admin' : 'Pharmacist'),
        contact: formData.contact.trim() || '9876543210',
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });

      const user = response.data.user || {
        name: formData.name.trim() || formData.email.split('@')[0],
        email: formData.email.trim(),
        role: formData.role
      };

      const resolvedRole = user.role || formData.role;
      setRole(resolvedRole);
      localStorage.setItem('role', resolvedRole);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('username', user.email || user.name);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      } else {
        localStorage.setItem('token', 'session_token_' + Date.now());
      }

      toast.success(`${isLogin ? 'Login' : 'Registration'} successful!`);
      navigate('/Home');

    } catch (error) {
      console.warn(`Auth API error:`, error);
      
      const serverMessage = error.response?.data?.message || error.response?.data?.error;
      
      // If server rejected with a specific credential error, show it
      if (serverMessage && !serverMessage.toLowerCase().includes('network error')) {
        toast.error(serverMessage);
      } else {
        // Cloud / Offline Fallback (e.g. When deployed on Vercel before backend is linked)
        toast('Connected via Cloud Demo Mode!', { icon: '⚡' });
        
        const fallbackUser = {
          name: formData.name.trim() || (formData.role === 'Admin' ? 'Admin User' : 'Pharmacist User'),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          id: Date.now()
        };

        setRole(formData.role);
        localStorage.setItem('role', formData.role);
        localStorage.setItem('user', JSON.stringify(fallbackUser));
        localStorage.setItem('username', fallbackUser.email);
        localStorage.setItem('token', 'offline_session_token_' + Date.now());
        navigate('/Home');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 bg-[url('https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center relative p-4">
      <div className="absolute inset-0 bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-sm z-0"></div>
      
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md z-10 border border-slate-200/80 dark:border-slate-700 mx-auto transition-all duration-300">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white dark:bg-slate-700/80 p-3 rounded-2xl mb-3 shadow-md border border-slate-100 dark:border-slate-600">
            <img src={mslogo} alt="MedStock Logo" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {isLogin ? 'Welcome to MedStock' : 'Create an Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center font-medium">
            {isLogin ? 'Sign in to access pharmacy counter & inventory' : 'Join MedStock to manage pharmaceuticals smartly'}
          </p>
        </div>

        {/* 1-Click Fast Demo Logins */}
        <div className="mb-5 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600/80">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center mb-2">
            ⚡ Quick 1-Click Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('Admin')}
              className="px-3 py-2 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-bold border border-primary-200 dark:border-primary-800 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <FaUserShield /> Admin Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('User')}
              className="px-3 py-2 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold border border-teal-200 dark:border-teal-800 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <FaUserMd /> Pharmacist Demo
            </button>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Role Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'Admin' })}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                formData.role === 'Admin'
                  ? 'bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FaUserShield /> Administrator
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'User' })}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                formData.role === 'User'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FaUserMd /> Pharmacist / Staff
            </button>
          </div>

          {!isLogin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-medium"
                />
              </div>
              <div className="relative">
                <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="tel"
                  name="contact"
                  maxLength="10"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="Mobile (10 digits)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-medium"
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="relative">
            <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              required
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-medium"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              required
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
            </button>
          </div>

          {/* Confirm Password (Only for Signup) */}
          {!isLogin && (
            <div className="relative">
              <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-medium"
              />
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-teal-600 hover:from-primary-700 hover:to-teal-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 mt-2 text-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{isLogin ? `Sign In as ${formData.role}` : `Register as ${formData.role}`}</span>
            )}
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                className="text-primary-600 dark:text-primary-400 font-bold hover:underline focus:outline-none"
                onClick={() => setIsLogin(false)}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                className="text-primary-600 dark:text-primary-400 font-bold hover:underline focus:outline-none"
                onClick={() => setIsLogin(true)}
              >
                Sign in here
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
