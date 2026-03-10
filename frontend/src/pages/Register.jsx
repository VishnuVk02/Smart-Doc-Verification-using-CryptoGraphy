import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Fingerprint, Loader2, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import './Auth.css';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'User', groupId: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await axios.post('/api/auth/register', formData);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            console.error('Register error detail:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container min-h-screen flex items-center justify-center bg-black auth-gradient p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="auth-card glass-morphism p-8 w-full max-w-[420px] rounded-2xl relative overflow-hidden"
            >
                <button
                    className="auth-back-button absolute top-6 left-6 text-slate-400 hover:text-primary transition-all duration-300 flex items-center gap-2 text-sm z-10 hover:-translate-x-1"
                    onClick={() => navigate('/login')}
                >
                    <ArrowLeft size={18} />
                    <span>Back</span>
                </button>

                <div className="auth-header text-center mb-8 pt-4">
                    <motion.div
                        initial={{ rotate: -10, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="auth-logo inline-flex p-4 rounded-3xl bg-primary/10 text-primary mb-4 shadow-[0_0_20px_rgba(47,129,247,0.2)]"
                    >
                        <Fingerprint size={48} />
                    </motion.div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Create Account</h2>
                    <p className="text-slate-400 mt-2 text-sm">Join the Secure Verification Network</p>
                </div>

                <AnimatePresence mode="wait">
                    {success ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="auth-success text-center py-6 text-emerald-400 flex flex-col items-center gap-4"
                        >
                            <div className="p-4 rounded-full bg-emerald-500/10">
                                <ShieldCheck size={32} />
                            </div>
                            <p className="font-medium">Registration successful! Redirecting...</p>
                        </motion.div>
                    ) : (
                        <motion.div key="form">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="auth-error bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-center gap-3 mb-6 text-sm"
                                >
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                            <form onSubmit={handleSubmit} className="auth-form flex flex-col gap-4">
                                <div className="form-group flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        onChange={handleChange}
                                        className="w-full p-2.5 bg-black/40 border border-border rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                        required
                                    />
                                </div>
                                <div className="form-group flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        onChange={handleChange}
                                        className="w-full p-2.5 bg-black/40 border border-border rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                        required
                                    />
                                </div>
                                <div className="form-group flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        onChange={handleChange}
                                        className="w-full p-2.5 bg-black/40 border border-border rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                        required
                                    />
                                </div>
                                <div className="form-group flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Group ID (Optional)</label>
                                    <input
                                        type="text"
                                        name="groupId"
                                        onChange={handleChange}
                                        placeholder="Enter corporate group ID"
                                        className="w-full p-2.5 bg-black/40 border border-border rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="form-group flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Role</label>
                                    <select
                                        name="role"
                                        onChange={handleChange}
                                        className="w-full p-2.5 bg-black/40 border border-border rounded-lg text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="User" className="bg-panel">User</option>
                                        <option value="Admin" className="bg-panel">Admin</option>
                                    </select>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="submit"
                                    className="auth-button bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center mt-3"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Secure Registration'}
                                </motion.button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="auth-footer text-center mt-8 text-sm text-slate-400">
                    <p>Already have an account? <Link to="/login" className="text-primary hover:text-blue-400 font-medium underline-offset-4 hover:underline">Login here</Link></p>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
