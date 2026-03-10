import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { ShieldAlert, Fingerprint, Loader2, ArrowLeft } from 'lucide-react';
import './Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector((state) => state.auth);

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(loginStart());
        try {
            const res = await axios.post('/api/auth/login', { email, password });
            dispatch(loginSuccess({ user: res.data.user, token: res.data.token }));
            if (res.data.user.role === 'Admin') {
                navigate('/admin');
            } else {
                navigate('/user');
            }
        } catch (err) {
            console.error('Login error detail:', err.response?.data || err.message);
            dispatch(loginFailure(err.response?.data?.message || 'Server error'));
        }
    };

    return (
        <div className="auth-container min-h-screen flex items-center justify-center bg-black auth-gradient p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="auth-card glass-morphism p-8 w-full max-auto max-w-[420px] rounded-2xl relative overflow-hidden"
            >
                <button
                    className="auth-back-button absolute top-6 left-6 text-slate-400 hover:text-primary transition-all duration-300 flex items-center gap-2 text-sm z-10 hover:-translate-x-1"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft size={18} />
                    <span>Back</span>
                </button>

                <div className="auth-header text-center mb-8 pt-4">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="auth-logo inline-flex p-4 rounded-3xl bg-primary/10 text-primary mb-4 shadow-[0_0_20px_rgba(47,129,247,0.2)]"
                    >
                        <Fingerprint size={48} />
                    </motion.div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Secure Portal</h2>
                    <p className="text-slate-400 mt-2 text-sm">Login to the Smart Document Verification System</p>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="auth-error bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-center gap-3 mb-6 text-sm"
                        >
                            <ShieldAlert size={18} />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="auth-form flex flex-col gap-5">
                    <div className="form-group flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-300">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            className="w-full p-3 bg-black/40 border border-border rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            required
                        />
                    </div>
                    <div className="form-group flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-300">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full p-3 bg-black/40 border border-border rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            required
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="auth-button bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-primary/25 transition-all flex items-center justify-center mt-2"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Authenticate Context'}
                    </motion.button>
                </form>
                <div className="auth-footer text-center mt-8 text-sm text-slate-400">
                    <p>Don't have an account? <Link to="/register" className="text-primary hover:text-blue-400 font-medium underline-offset-4 hover:underline">Register here</Link></p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
