import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { logout } from '../store/slices/authSlice';
import { UploadCloud, FileText, Activity, Users, LogOut, CheckCircle, ShieldAlert, FileSearch, Loader2, Trash2, Calendar, TrendingUp, Minimize2, Download, Zap, Mail, Send } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import './Dashboard.css';

const AdminDashboard = () => {
    const { user, token } = useSelector(state => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [stats, setStats] = useState({ totalDocuments: 0, totalVerifications: 0, validVerifications: 0, invalidVerifications: 0 });
    const [adminStats, setAdminStats] = useState({ userStats: [], docStats: [], verificationActivity: [] });
    const [documents, setDocuments] = useState([]);
    const [logs, setLogs] = useState([]);
    const [files, setFiles] = useState([]);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [compressFile, setCompressFile] = useState(null);
    const [compressedFile, setCompressedFile] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);

    const ax = axios.create({
        baseURL: '/api',
        headers: { Authorization: `Bearer ${token}` }
    });

    useEffect(() => {
        fetchStats();
        fetchAdminStats();
        fetchDocuments();
        fetchLogs();
    }, []);

    const fetchAdminStats = async () => {
        try {
            const res = await ax.get('/documents/admin-stats');
            setAdminStats(res.data);
        } catch (err) {
            console.error('Error fetching admin stats:', err);
        }
    };

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await ax.get('/documents/all');
            setDocuments(res.data);
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await ax.get('/documents/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await ax.get('/documents/logs');
            setLogs(res.data);
        } catch (err) {
            console.error('Error fetching logs:', err);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            let sizeError = false;

            setFiles(prevFiles => {
                const newValidFiles = [];
                selectedFiles.forEach(file => {
                    if (file.size > 1 * 1024 * 1024) {
                        sizeError = true;
                    } else if (!prevFiles.some(f => f.name === file.name && f.size === file.size)) {
                        newValidFiles.push(file);
                    }
                });

                if (sizeError) {
                    setTimeout(() => alert('Some individual files exceed the 1MB limit and were ignored.'), 50);
                }

                return [...prevFiles, ...newValidFiles];
            });
            
            setUploadStatus(null);
            e.target.value = null; // Reset input
        }
    };

    const removeFile = (fileName) => {
        setFiles(prev => prev.filter(f => f.name !== fileName));
    };

    const handleUpload = async () => {
        if (!files || files.length === 0) return;
        setIsUploading(true);
        
        let successCount = 0;
        let failCount = 0;
        let lastError = null;

        for (const file of files) {
            const formData = new FormData();
            formData.append('document', file);

            try {
                await ax.post('/documents/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                successCount++;
            } catch (err) {
                failCount++;
                lastError = err.response?.data?.message || 'Upload failed';
            }
        }

        if (failCount === 0) {
            setUploadStatus({ type: 'success', message: `${successCount} document(s) registered successfully!` });
        } else if (successCount > 0) {
            setUploadStatus({ type: 'error', message: `${successCount} registered, ${failCount} failed. Last error: ${lastError}` });
        } else {
            setUploadStatus({ type: 'error', message: `Registration failed. Error: ${lastError}` });
        }
        
        setFiles([]);
        fetchStats();
        fetchDocuments();
        fetchAdminStats();
        setIsUploading(false);
    };

    const handleDeleteDocument = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this document? This action cannot be undone.')) return;
        try {
            await ax.delete(`/documents/${id}`);
            fetchDocuments();
            fetchStats();
            fetchAdminStats();
        } catch (err) {
            alert('Failed to delete document');
        }
    };

    const downloadReport = (log) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Smart Document Verification Report', 20, 20);

        doc.setFontSize(12);
        doc.text(`Document Name: ${log.documentName}`, 20, 40);
        doc.text(`Verification Date: ${new Date(log.createdAt).toLocaleString()}`, 20, 50);
        doc.text(`Generated Hash: ${log.generatedHash}`, 20, 60);
        doc.text(`Status: ${log.verificationResult}`, 20, 70);
        if (log.documentId) doc.text(`Document ID: ${log.documentId}`, 20, 80);

        doc.setTextColor(100);
        doc.text('--- System Generated Cryptographic Proof ---', 20, 100);

        doc.save(`${log.documentName}_Verification_Report.pdf`);
    };

    const handleForwardWithFiles = async (log) => {
        const docName = log.documentName;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Smart Document Verification Report', 20, 20);

        doc.setFontSize(12);
        doc.text(`Document Name: ${docName}`, 20, 40);
        doc.text(`Verification Date: ${new Date(log.createdAt).toLocaleString()}`, 20, 50);
        doc.text(`Generated Hash: ${log.generatedHash}`, 20, 60);
        doc.text(`Status: ${log.verificationResult}`, 20, 70);
        if (log.documentId) doc.text(`Document ID: ${log.documentId}`, 20, 80);

        doc.setTextColor(100);
        doc.text('--- System Generated Cryptographic Proof ---', 20, 100);

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `${docName}_Verification_Report.pdf`, { type: 'application/pdf' });

        alert('Due to browser security restrictions, files cannot be automatically attached to web email clients. The PDF report will be downloaded to your computer. Please drag and drop it into the email window that just opened.');
        
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const link1 = document.createElement('a');
        link1.href = pdfUrl;
        link1.download = pdfFile.name;
        link1.click();
        
        handleForwardEmail(log, docName);
    };

    const handleForwardEmail = (log, docName) => {
        const timestamp = new Date(log.createdAt).toLocaleString();
        const subject = encodeURIComponent(`SmartDoc Verification Report: ${docName}`);
        const body = encodeURIComponent(
            `Smart Document Verification Details:\n\n` +
            `Document Name: ${docName}\n` +
            `Status: ${log.verificationResult}\n` +
            `Verification Date: ${timestamp}\n` +
            `Document ID: ${log.documentId || 'N/A'}\n` +
            `Hash Value: ${log.generatedHash}\n\n` +
            `--- This is a system generated cryptographic proof ---`
        );

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
    };

    return (
        <div className="dashboard-container min-h-screen bg-black text-slate-200 flex flex-col md:flex-row">
            {/* Sidebar */}
            <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                className="sidebar md:w-64 bg-panel/40 backdrop-blur-xl border-r border-border p-6 flex flex-col gap-8 z-20"
            >
                <div className="sidebar-header flex items-center gap-3 text-primary">
                    <ShieldAlert size={32} />
                    <h2 className="text-xl font-bold tracking-tight text-white">SmartDoc</h2>
                </div>

                <nav className="nav-menu flex flex-col gap-2">
                    {[
                        { id: 'dashboard', label: 'Overview', icon: <Activity size={20} /> },
                        { id: 'upload', label: 'Register New', icon: <UploadCloud size={20} /> },
                        { id: 'documents', label: 'Manage Docs', icon: <FileText size={20} /> },
                        { id: 'logs', label: 'History Logs', icon: <FileSearch size={22} /> },
                        { id: 'compress', label: 'Compressor', icon: <Minimize2 size={22} /> },
                    ].map((item) => (
                        <button
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${activeTab === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-border">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 p-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium"
                    >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="main-content flex-1 p-6 md:p-10 overflow-y-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">
                            {activeTab === 'dashboard' ? 'System Overview' : activeTab === 'upload' ? 'Register Document' : activeTab === 'documents' ? 'Document Management' : 'Audit Logs'}
                        </h1>
                        <p className="text-slate-400 mt-2">Welcome back, {user.name.split(' ')[0]}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-4 bg-white/5 p-2 pr-6 rounded-full border border-white/10"
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white leading-tight">{user.name}</span>
                            <span className="text-xs text-slate-500 uppercase tracking-widest">{user.role}</span>
                        </div>
                    </motion.div>
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Total Documents', value: stats.totalDocuments, icon: <FileText size={24} />, color: 'text-primary', bg: 'bg-primary/10' },
                                    { label: 'Total Verifications', value: stats.totalVerifications, icon: <Activity size={24} />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                                    { label: 'Authentic Reads', value: stats.validVerifications, icon: <CheckCircle size={24} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                                ].map((stat, i) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 + 0.2 }}
                                        className="bg-panel/40 border border-border p-6 rounded-2xl flex items-center gap-6 hover:border-primary/50 transition-colors group"
                                    >
                                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                                            <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Registration Trend */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-panel/40 border border-border p-6 rounded-3xl h-[400px] flex flex-col"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <TrendingUp size={20} className="text-primary" />
                                            User Registrations (30d)
                                        </h3>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={adminStats.userStats}>
                                                <defs>
                                                    <linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                <XAxis dataKey="_id" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUser)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </motion.div>

                                {/* Verification Activity (7d) */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-panel/40 border border-border p-6 rounded-3xl h-[400px] flex flex-col"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Activity size={20} className="text-purple-400" />
                                            Verification Activity (7d)
                                        </h3>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={adminStats.verificationActivity}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                <XAxis dataKey="_id" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="count"
                                                    stroke="#a855f7"
                                                    strokeWidth={3}
                                                    dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </motion.div>

                                {/* Document Upload Frequency */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-panel/40 border border-border p-6 rounded-3xl h-[400px] flex flex-col lg:col-span-2"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Calendar size={20} className="text-emerald-400" />
                                            Document Upload Activity (30d)
                                        </h3>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={adminStats.docStats}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                <XAxis dataKey="_id" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: '#ffffff05' }}
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                />
                                                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'upload' && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl"
                        >
                            <div className="lg:col-span-7 flex flex-col gap-8">
                                <div className="bg-panel/40 border border-border rounded-3xl p-8 md:p-12">
                                <h2 className="text-2xl font-bold text-white mb-2">Secure Document Registry</h2>
                                <p className="text-slate-400 mb-10 leading-relaxed">
                                    Upload original documents to the system to generate secure cryptographic hashes. These hashes will be used for future verification.
                                </p>

                                <label className="relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-3xl bg-black/20 hover:bg-white/5 hover:border-primary/50 transition-all cursor-pointer group mb-8">
                                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                    <div className="p-6 rounded-full bg-primary/10 text-primary mb-6 group-hover:scale-110 transition-transform">
                                        <UploadCloud size={48} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors text-center">
                                        {files.length > 0 
                                            ? `${files.length} file(s) selected: ${files.map(f => f.name).join(', ')}`.substring(0, 100) + (files.length > 3 ? '...' : '')
                                            : 'Select or drag documents here'}
                                    </h3>
                                    <p className="text-slate-500 text-sm mt-3">
                                        {files.length > 0
                                            ? `Total size: ${(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB`
                                            : 'Supported formats: PDF, PNG, JPG, DOCX (Max 1MB per file)'}
                                    </p>
                                </label>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    onClick={handleUpload}
                                    disabled={files.length === 0 || isUploading}
                                >
                                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                                    {isUploading ? 'Registering Hash...' : 'Register into System'}
                                </motion.button>
                            </div>

                            <AnimatePresence>
                                {uploadStatus && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className={`p-6 rounded-2xl flex items-center gap-4 ${uploadStatus.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}
                                    >
                                        {uploadStatus.type === 'success' ? <CheckCircle size={24} /> : <ShieldAlert size={24} />}
                                        <span className="font-medium">{uploadStatus.message}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            </div>

                            {/* Right side: Selected Files Card */}
                            <AnimatePresence>
                                {files.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="lg:col-span-5 bg-panel/40 border border-border rounded-3xl p-6 lg:p-8 self-start shadow-2xl flex flex-col max-h-[70vh] sticky top-8"
                                    >
                                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                            <FileText size={20} className="text-primary" />
                                            Selected Files ({files.length})
                                        </h3>
                                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
                                            {files.map((f, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                    <div className="flex items-center gap-4 overflow-hidden">
                                                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="text-white font-medium text-sm truncate">{f.name}</p>
                                                            <p className="text-slate-500 text-xs mt-1">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeFile(f.name)} className="text-slate-500 hover:text-red-400 p-2 transition-colors flex-shrink-0" title="Remove file">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-5 border-t border-border flex justify-between items-center mt-auto">
                                            <span className="text-slate-400 text-sm font-medium">Total Size</span>
                                            <span className="text-primary font-bold text-lg">{(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {activeTab === 'documents' && (
                        <motion.div
                            key="documents"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-panel/40 border border-border rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-border">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Upload Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Document ID</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Name</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Uploaded By</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none text-right">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {documents.map((doc) => (
                                            <tr key={doc._id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 text-sm font-medium text-slate-300">{new Date(doc.uploadDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-primary tracking-tight font-mono">{doc.documentId}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-white uppercase truncate max-w-[200px]">{doc.documentName}</td>
                                                <td className="px-6 py-4 text-sm text-slate-400">
                                                    {doc.uploadedBy?.name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteDocument(doc._id)}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                                        title="Permanently Delete Document"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {documents.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                                    No documents found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'logs' && (
                        <motion.div
                            key="logs"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-panel/40 border border-border rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-border">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Timestamp</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Document Name</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">User IP</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {logs.map((log) => (
                                            <tr key={log._id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 text-sm font-medium text-slate-300">{new Date(log.createdAt).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-white uppercase tracking-tight">{log.documentName}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${log.verificationResult === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        log.verificationResult === 'Expired' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                            'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}>
                                                        {log.verificationResult}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">{log.ipAddress}</td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => downloadReport(log)}
                                                        className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-primary hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                                                        title="Download PDF"
                                                    >
                                                        <FileText size={14} /> PDF
                                                    </button>
                                                    <button
                                                        onClick={() => handleForwardWithFiles(log)}
                                                        className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                                                        title="Forward Report"
                                                    >
                                                        <Send size={14} /> Forward
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'compress' && (
                        <motion.div
                            key="compress"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-4xl"
                        >
                            <div className="bg-panel/40 backdrop-blur-md border border-border rounded-3xl p-8 md:p-12 mb-8 shadow-2xl">
                                <h2 className="text-3xl font-bold text-white mb-2">Smart Document Compressor</h2>
                                <p className="text-slate-400 mb-10 leading-relaxed max-w-2xl">
                                    Admins can use this utility to optimize documents before registration.
                                    Compress high-resolution image-based files to stay within the 1MB platform limit.
                                </p>

                                <label className="relative flex flex-col items-center justify-center p-16 border-2 border-dashed border-border rounded-3xl bg-black/20 hover:bg-white/5 hover:border-blue-500/50 transition-all cursor-pointer group mb-10">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setCompressFile(e.target.files[0]);
                                                setCompressedFile(null);
                                            }
                                        }}
                                    />
                                    <div className="p-8 rounded-full bg-blue-500/10 text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                                        <Minimize2 size={64} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors text-center">
                                        {compressFile ? compressFile.name : 'Choose a file to optimize'}
                                    </h3>
                                    {compressFile && (
                                        <p className="text-slate-500 text-sm mt-3 font-medium">
                                            Current Size: {(compressFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    )}
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 text-lg"
                                        onClick={async () => {
                                            if (!compressFile) return;
                                            setIsCompressing(true);
                                            try {
                                                const options = {
                                                    maxSizeMB: 0.9,
                                                    maxWidthOrHeight: 2048,
                                                    useWebWorker: true,
                                                };
                                                const compressedBlob = await imageCompression(compressFile, options);
                                                setCompressedFile(compressedBlob);
                                            } catch (error) {
                                                console.error('Compression Error:', error);
                                                alert('Failed to compress document');
                                            } finally {
                                                setIsCompressing(false);
                                            }
                                        }}
                                        disabled={!compressFile || isCompressing}
                                    >
                                        {isCompressing ? <Loader2 className="animate-spin" size={24} /> : <Zap size={24} />}
                                        {isCompressing ? 'Optimizing...' : 'Optimize Document'}
                                    </motion.button>

                                    {compressedFile && (
                                        <motion.button
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 text-lg"
                                            onClick={() => {
                                                const url = URL.createObjectURL(compressedFile);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = `optimized_${compressFile.name}`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                URL.revokeObjectURL(url);
                                            }}
                                        >
                                            <Download size={24} />
                                            Download ({(compressedFile.size / (1024 * 1024)).toFixed(2)} MB)
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default AdminDashboard;
