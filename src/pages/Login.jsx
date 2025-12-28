import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { login as apiLogin, signup as apiSignup, getMe, forgotPassword, verifyOtp, resetPassword } from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        const { data } = await apiSignup(name, email, password, role);
        if (!data.success) {
          setError(data.error);
          setLoading(false);
          return;
        }
        // Signup successful - switch to login form
        alert('Account created successfully! Please login.');
        setIsSignup(false);
        setName('');
        setPassword('');
        setLoading(false);
        return;
      }

      const { data } = await apiLogin(email, password);
      if (!data.success) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Get user info
      localStorage.setItem('token', data.data.token);
      const { data: meData } = await getMe();
      if (meData.success) {
        login(data.data.token, meData.data);
        navigate(meData.data.role === 'teacher' ? '/teacher' : '/student');
      }
    } catch (err) {
      setError('Something went wrong');
    }
    setLoading(false);
  };

  const [forgotPasswordStep, setForgotPasswordStep] = useState(0); // 0: Login, 1: Email, 2: OTP, 3: New Password
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (forgotPasswordStep === 1) {
        // Send OTP
        const { data } = await forgotPassword(email);
        if (data.success) {
          setForgotPasswordStep(2);
        } else {
          setError(data.error);
        }
      } else if (forgotPasswordStep === 2) {
        // Verify OTP
        const { data } = await verifyOtp(email, resetOtp);
        if (data.success) {
          setForgotPasswordStep(3);
        } else {
          setError(data.error);
        }
      } else if (forgotPasswordStep === 3) {
        // Reset Password
        const { data } = await resetPassword(email, resetOtp, newPassword);
        if (data.success) {
          setForgotPasswordStep(0);
          setError('');
          alert('Password reset successfully! Please login.');
        } else {
          setError(data.error);
        }
      }
    } catch (err) {
      setError('Something went wrong');
    }
    setLoading(false);
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6, 
        ease: "easeOut",
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  const floatAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 overflow-hidden relative">
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Floating Circle 1 - Top Left */}
        <motion.div 
          animate={{ 
            y: [0, 50, 0],
            x: [0, 30, 0], 
            scale: [1, 1.1, 1] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-5%] left-[-5%] w-96 h-96 bg-teal-200/40 rounded-full mix-blend-multiply filter blur-3xl"
        />
        
        {/* Floating Circle 2 - Bottom Right */}
        <motion.div 
          animate={{ 
            y: [0, -60, 0],
            x: [0, -40, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl"
        />

        {/* Floating Circle 3 - Center/Random - "Cloud Ball" style */}
        <motion.div 
          animate={{ 
            x: [0, 100, -100, 0],
            y: [0, -100, 50, 0],
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] left-[20%] w-64 h-64 bg-pink-200/30 rounded-full mix-blend-multiply filter blur-2xl"
        />

        {/* Small drifting particles with fixed positions */}
        {[
          { top: '20%', left: '80%', width: 40, height: 40, duration: 15, delay: 0 },
          { top: '60%', left: '10%', width: 30, height: 30, duration: 18, delay: 2 },
          { top: '80%', left: '60%', width: 50, height: 50, duration: 20, delay: 4 },
          { top: '10%', left: '40%', width: 25, height: 25, duration: 12, delay: 1 },
          { top: '40%', left: '90%', width: 35, height: 35, duration: 16, delay: 3 },
        ].map((particle, i) => (
          <motion.div
            key={i}
            className="absolute bg-teal-400/20 rounded-full blur-md"
            style={{
              width: particle.width,
              height: particle.height,
              top: particle.top,
              left: particle.left,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Main Card */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="bg-white rounded-2xl shadow-2xl overflow-hidden flex max-w-4xl w-full relative z-10"
      >
        
        {/* Left Side - Illustration Panel */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-teal-600 to-teal-800 p-8 flex-col justify-between relative overflow-hidden">
          {/* Decorative Circles Overlay */}
          <div className="absolute top-0 left-0 w-full h-full">
            <motion.div 
              animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full blur-xl" // Fixed: using pure css blur-xl instead of motion filter for perf
            />
            <motion.div 
               animate={{ y: [0, 30, 0], opacity: [0.3, 0.5, 0.3] }}
               transition={{ duration: 7, repeat: Infinity, delay: 1 }}
              className="absolute bottom-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"
            />
          </div>

          {/* Logo */}
          <motion.div 
            variants={itemVariants}
            className="flex items-center gap-3 relative z-10"
          >
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">📚</span>
            </div>
            <span className="text-white text-xl font-bold tracking-wide">Attendance</span>
          </motion.div>

          {/* Welcome Text */}
          <motion.div 
            variants={itemVariants}
            className="text-center my-8 relative z-10"
          >
            <h2 className="text-white text-3xl font-bold mb-2 tracking-tight">Welcome Back!</h2>
            <p className="text-teal-100 text-sm font-medium leading-relaxed">
              {isSignup 
                ? 'Start your journey with us. Create an account to manage your classes.'
                : 'Access your dashboard, track attendance, and stay organized.'}
            </p>
          </motion.div>

          {/* Illustration */}
          <motion.div 
            animate={floatAnimation}
            className="flex-1 flex items-center justify-center relative z-10"
          >
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              src="/login-illustration.png" 
              alt="Student Illustration" 
              className="max-h-64 object-contain drop-shadow-2xl"
            />
          </motion.div>
        </div>



        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 relative">
          <AnimatePresence mode="wait">
            {forgotPasswordStep === 0 ? (
              <motion.div
                key="login-signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col justify-center"
              >
                {/* Login/Signup Header & Toggle */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    {isSignup ? 'Get Started' : 'Hello Again!'}
                  </h1>
                  <p className="text-gray-500">
                    {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      onClick={() => setIsSignup(!isSignup)}
                      className="text-teal-600 hover:text-teal-700 font-semibold transition-colors relative group"
                    >
                     {isSignup ? 'Login' : 'Sign up Free'}
                     <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-teal-600 transition-all group-hover:w-full"></span>
                    </button>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* ... Login/Signup Fields ... */}
                  {isSignup && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <motion.input
                        whileFocus={{ scale: 1.01, borderColor: "#0d9488" }}
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                        required
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <motion.input
                      whileFocus={{ scale: 1.01, borderColor: "#0d9488" }}
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <motion.input
                      whileFocus={{ scale: 1.01, borderColor: "#0d9488" }}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                      required
                      minLength={6}
                    />
                  </div>

                  {isSignup && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="overflow-hidden"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
                      <div className="flex gap-4 p-1 bg-gray-100 rounded-xl">
                        {['student', 'teacher'].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                              role === r ? 'text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {role === r && (
                              <motion.div 
                                layoutId="activeRole"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                            <span className="relative z-10 capitalize flex items-center justify-center gap-2">
                              {r === 'student' ? '🎓' : '👨‍🏫'} {r}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {!isSignup && (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 transition-colors"
                        />
                        <span className="text-sm text-gray-500 group-hover:text-teal-600 transition-colors">Remember me</span>
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setForgotPasswordStep(1)}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </motion.div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {isSignup ? 'Create Account' : 'Sign In'}
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col justify-center"
              >
                <button 
                  onClick={() => {
                    setForgotPasswordStep(0);
                    setError('');
                  }}
                  className="absolute top-8 left-8 text-gray-400 hover:text-gray-600 flex items-center gap-2 transition-colors"
                >
                  ← Back to Login
                </button>

                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
                  <p className="text-gray-500">
                    {forgotPasswordStep === 1 && "Enter your email to receive an OTP."}
                    {forgotPasswordStep === 2 && "Enter the 6-digit OTP sent to your email."}
                    {forgotPasswordStep === 3 && "Create a new strong password."}
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-5">
                   {forgotPasswordStep === 1 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <motion.input
                        whileFocus={{ scale: 1.01, borderColor: "#0d9488" }}
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                        required
                        autoFocus
                      />
                    </div>
                  )}

                  {forgotPasswordStep === 2 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                      <motion.input
                        whileFocus={{ scale: 1.01, borderColor: "#0d9488" }}
                        type="text"
                        placeholder="123456"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all tracking-widest text-center text-lg"
                        required
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                  )}

                  {forgotPasswordStep === 3 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <motion.input
                        whileFocus={{ scale: 1.01, borderColor: "#0d9488" }}
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                        required
                        minLength={6}
                        autoFocus
                      />
                    </div>
                  )}

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </motion.div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {forgotPasswordStep === 1 && "Send OTP"}
                        {forgotPasswordStep === 2 && "Verify OTP"}
                        {forgotPasswordStep === 3 && "Reset Password"}
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
