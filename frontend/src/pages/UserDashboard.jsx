import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { logout } from '../store/slices/authSlice';
import { Search, History, LogOut, CheckCircle, ShieldAlert, AlertTriangle, FileText, Loader2, Mail, Minimize2, Download, Zap, Trash2, Send } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import jsPDF from 'jspdf';
import './Dashboard.css';

const UserDashboard = () => {
    const { user, token } = useSelector(state => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [logs, setLogs] = useState([]);
    const [files, setFiles] = useState([]);
    const [verificationResults, setVerificationResults] = useState([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [activeTab, setActiveTab] = useState('verify');
    const [compressFile, setCompressFile] = useState(null);
    const [compressedFile, setCompressedFile] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);

    const ax = axios.create({
        baseURL: '/api',
        // We optionally pass token for user identifying logs
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    useEffect(() => {
        fetchLogs();
    }, [activeTab]);

    const fetchLogs = async () => {
        try {
            if (token && token !== 'null' && token !== 'undefined') {
                const res = await ax.get('/documents/logs');
                setLogs(res.data);
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
            if (err.response?.status === 401) {
                handleLogout();
            }
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
            
            setVerificationResults([]);
            e.target.value = null; // Reset input
        }
    };

    const removeFile = (fileName) => {
        setFiles(prev => prev.filter(f => f.name !== fileName));
    };

    const handleVerify = async () => {
        if (!files || files.length === 0) return;
        setIsVerifying(true);
        
        const results = [];
        for (const file of files) {
            const formData = new FormData();
            formData.append('document', file);
            if (user) formData.append('userId', user.id);

            try {
                const res = await ax.post('/documents/verify', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                results.push({ ...res.data, fileName: file.name, originalFile: file });
            } catch (err) {
                console.error(err);
                results.push({ 
                    status: 'Error', 
                    displayMessage: 'Verification Failed', 
                    message: err.response?.data?.message || 'Server error', 
                    fileName: file.name,
                    originalFile: file
                });
            }
        }
        
        setVerificationResults(results);
        setFiles([]);
        setIsVerifying(false);
    };

    const handleLeaveGroup = async () => {
        try {
            const res = await ax.put('/user/leave-group');
            alert(res.data.message);
            window.location.reload();
        } catch (err) {
            console.error('Leave Group Error:', err);
            alert('Failed to leave group');
        }
    };

    const downloadReport = (resultData, docName) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Smart Document Verification Report', 20, 20);

        doc.setFontSize(12);
        doc.text(`Document Name: ${docName}`, 20, 40);
        doc.text(`Verification Date: ${new Date(resultData.verificationTimestamp || resultData.createdAt).toLocaleString()}`, 20, 50);

        // Check if it's from log or live verify
        const statusStr = resultData.verificationResult || resultData.status;
        const hashStr = resultData.generatedHash || (resultData.documentDetails ? resultData.documentDetails.hashValue : 'N/A');
        const idStr = resultData.documentId || (resultData.documentDetails ? resultData.documentDetails.documentId : 'N/A');

        doc.text(`Hash Value: ${hashStr}`, 20, 60);
        doc.text(`Status: ${statusStr}`, 20, 70);
        if (idStr !== 'N/A') doc.text(`Document ID: ${idStr}`, 20, 80);

        doc.setTextColor(100);
        doc.text('--- System Generated Cryptographic Proof ---', 20, 100);

        doc.save(`${docName}_Verification_Report.pdf`);
    };

    const handleForwardWithFiles = async (resultData) => {
        const docName = resultData.fileName;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Smart Document Verification Report', 20, 20);

        doc.setFontSize(12);
        doc.text(`Document Name: ${docName}`, 20, 40);
        doc.text(`Verification Date: ${new Date(resultData.verificationTimestamp || resultData.createdAt).toLocaleString()}`, 20, 50);

        const statusStr = resultData.verificationResult || resultData.status;
        const hashStr = resultData.generatedHash || (resultData.documentDetails ? resultData.documentDetails.hashValue : 'N/A');
        const idStr = resultData.documentId || (resultData.documentDetails ? resultData.documentDetails.documentId : 'N/A');

        doc.text(`Hash Value: ${hashStr}`, 20, 60);
        doc.text(`Status: ${statusStr}`, 20, 70);
        if (idStr !== 'N/A') doc.text(`Document ID: ${idStr}`, 20, 80);

        doc.setTextColor(100);
        doc.text('--- System Generated Cryptographic Proof ---', 20, 100);

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `${docName}_Verification_Report.pdf`, { type: 'application/pdf' });

        alert('Due to browser security restrictions, files cannot be automatically attached to web email clients. The files have been downloaded to your computer. Please drag and drop them into the email window that just opened.');
        
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const link1 = document.createElement('a');
        link1.href = pdfUrl;
        link1.download = pdfFile.name;
        link1.click();

        if (resultData.originalFile) {
            const origUrl = URL.createObjectURL(resultData.originalFile);
            const link2 = document.createElement('a');
            link2.href = origUrl;
            link2.download = resultData.originalFile.name;
            link2.click();
        }
        
        handleForwardEmail(resultData, docName);
    };

    const handleForwardEmail = (resultData, docName) => {
        const statusStr = resultData.verificationResult || resultData.status;
        const hashStr = resultData.generatedHash || (resultData.documentDetails ? resultData.documentDetails.hashValue : 'N/A');
        const idStr = resultData.documentId || (resultData.documentDetails ? resultData.documentDetails.documentId : 'N/A');
        const timestamp = new Date(resultData.verificationTimestamp || resultData.createdAt).toLocaleString();

        const subject = encodeURIComponent(`SmartDoc Verification Report: ${docName}`);
        const body = encodeURIComponent(
            `Smart Document Verification Details:\n\n` +
            `Document Name: ${docName}\n` +
            `Status: ${statusStr}\n` +
            `Verification Date: ${timestamp}\n` +
            `Document ID: ${idStr}\n` +
            `Hash Value: ${hashStr}\n\n` +
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
                    <Search size={32} />
                    <h2 className="text-xl font-bold tracking-tight text-white">SmartDoc</h2>
                </div>

                <nav className="nav-menu flex flex-col gap-2">
                    {[
                        { id: 'verify', label: 'Verify', icon: <Search size={20} /> },
                        { id: 'history', label: 'History', icon: <History size={20} /> },
                        { id: 'compress', label: 'Compressor', icon: <Minimize2 size={20} /> },
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
                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 p-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium"
                        >
                            <LogOut size={20} />
                            <span>Sign Out</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="flex items-center gap-3 p-3 w-full rounded-xl text-primary hover:bg-primary/10 transition-all font-medium"
                        >
                            <LogOut size={20} className="rotate-180" />
                            <span>Login</span>
                        </button>
                    )}
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
                            {activeTab === 'verify' ? 'Verify Document Authenticity' : 'Your Verification History'}
                        </h1>
                        <p className="text-slate-400 mt-2">
                            {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Secure Document Verification Network'}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-4 bg-white/5 p-2 pr-6 rounded-full border border-white/10"
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                            {user ? user.name.charAt(0) : 'G'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white leading-tight">{user ? user.name : 'Guest User'}</span>
                            <span className="text-xs text-slate-500 uppercase tracking-widest leading-none flex items-center gap-2">
                                {user ? user.role : 'Public View'}
                                {user?.groupId && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span className="text-emerald-400 font-bold">{user.groupId}</span>
                                        <button
                                            onClick={handleLeaveGroup}
                                            className="ml-1 text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase font-black cursor-pointer underline underline-offset-2"
                                        >
                                            Leave
                                        </button>
                                    </>
                                )}
                            </span>
                        </div>
                    </motion.div>
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'verify' && (
                        <motion.div
                            key="verify"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl"
                        >
                            <div className="lg:col-span-7 flex flex-col gap-8">
                                <div className="bg-panel/40 backdrop-blur-md border border-border rounded-3xl p-8 md:p-12 shadow-2xl">
                                <h2 className="text-2xl font-bold text-white mb-2">Instant Verification</h2>
                                <p className="text-slate-400 mb-10 leading-relaxed">
                                    Upload a document to verify its cryptographic hash against the secure registry. The system will instantly determine if the document is authentic, tampered, or expired.
                                </p>

                                <label className="relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-3xl bg-black/20 hover:bg-white/5 hover:border-primary/50 transition-all cursor-pointer group mb-8">
                                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                    <div className="p-6 rounded-full bg-primary/10 text-primary mb-6 group-hover:scale-110 transition-transform">
                                        <Search size={48} />
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
                                    onClick={handleVerify}
                                    disabled={files.length === 0 || isVerifying}
                                >
                                    {isVerifying ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                    {isVerifying ? 'Analyzing Cryptographic Hash...' : 'Verify Authenticity'}
                                </motion.button>
                            </div>

                            <AnimatePresence>
                                {verificationResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-6"
                                    >
                                        {verificationResults.map((result, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-8 rounded-3xl border shadow-2xl ${result.status === 'Verified' ? 'bg-emerald-500/5 border-emerald-500/20' :
                                                    result.status === 'Expired' ? 'bg-amber-500/5 border-amber-500/20' :
                                                        'bg-red-500/5 border-red-500/20'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-6 mb-8">
                                                    <div className={`p-4 rounded-2xl ${result.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        result.status === 'Expired' ? 'bg-amber-500/10 text-amber-400' :
                                                            'bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {result.status === 'Verified' ? <CheckCircle size={40} /> :
                                                            result.status === 'Expired' ? <AlertTriangle size={40} /> :
                                                                <ShieldAlert size={40} />}
                                                    </div>
                                                    <div>
                                                        <h3 className={`text-2xl font-bold ${result.status === 'Verified' ? 'text-emerald-400' :
                                                            result.status === 'Expired' ? 'text-amber-400' :
                                                                'text-red-400'
                                                            }`}>
                                                            {result.displayMessage} - {result.fileName}
                                                        </h3>
                                                        <p className="text-slate-400 mt-2 font-medium">{result.message}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                                        <p className="text-white font-bold">{result.status}</p>
                                                    </div>
                                                    {result.verificationTimestamp && (
                                                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Timestamp</p>
                                                            <p className="text-white font-bold">{new Date(result.verificationTimestamp).toLocaleString()}</p>
                                                        </div>
                                                    )}
                                                    {result.documentDetails && (
                                                        <>
                                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 overflow-hidden">
                                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Document ID</p>
                                                                <p className="text-white font-bold truncate">{result.documentDetails.documentId}</p>
                                                            </div>
                                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Original Filename</p>
                                                                <p className="text-white font-bold truncate">{result.documentDetails.documentName}</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-4 mt-8">
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className="px-8 py-4 rounded-2xl border border-primary/30 text-primary font-bold hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                                                        onClick={() => downloadReport(result, result.fileName)}
                                                    >
                                                        <FileText size={20} /> PDF Report
                                                    </motion.button>

                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className="px-8 py-4 rounded-2xl border border-purple-500/30 text-purple-400 font-bold hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2"
                                                        onClick={() => handleForwardEmail(result, result.fileName)}
                                                    >
                                                        <Mail size={20} /> Forward via Email
                                                    </motion.button>

                                                    {result.originalFile && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className="px-8 py-4 rounded-2xl border border-blue-500/30 text-blue-400 font-bold hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2"
                                                            onClick={() => handleForwardWithFiles(result)}
                                                        >
                                                            <Send size={20} /> Forward with Files
                                                        </motion.button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
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

                    {activeTab === 'history' && (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-panel/40 border border-border rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-border">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Document Name</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-medium italic">No verification history found</td>
                                            </tr>
                                        ) : logs.map((log) => (
                                            <React.Fragment key={log._id}>
                                            <tr onClick={() => setExpandedRow(expandedRow === log._id ? null : log._id)} className="hover:bg-white/5 transition-colors group cursor-pointer">
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
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); downloadReport(log, log.documentName); }}
                                                        className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-primary hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                                                        title="Download PDF"
                                                    >
                                                        <FileText size={14} /> PDF
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleForwardWithFiles({ ...log, fileName: log.documentName }); }}
                                                        className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                                                        title="Forward Report"
                                                    >
                                                        <Send size={14} /> Forward
                                                    </button>
                                                </td>
                                            </tr>
                                            <AnimatePresence>
                                                {expandedRow === log._id && (
                                                    <motion.tr
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                    >
                                                        <td colSpan="4" className="p-0 border-b border-border bg-black/40">
                                                            <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                                                {log.extractedData && Object.keys(log.extractedData).length > 0 ? (
                                                                    Object.entries(log.extractedData).map(([key, value]) => (
                                                                        <div key={key}>
                                                                            <span className="text-slate-500 font-bold uppercase tracking-wider text-xs block mb-1">{key}</span>
                                                                            <span className={`font-medium ${key.toLowerCase() === 'name' ? 'text-emerald-400 font-bold' : 'text-white'}`}>{value}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="col-span-full text-slate-500 italic">No extracted metadata available.</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </AnimatePresence>
                                            </React.Fragment>
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
                            className="max-w-3xl"
                        >
                            <div className="bg-panel/40 backdrop-blur-md border border-border rounded-3xl p-8 md:p-12 mb-8 shadow-2xl">
                                <h2 className="text-2xl font-bold text-white mb-2">Smart Document Compressor</h2>
                                <p className="text-slate-400 mb-10 leading-relaxed">
                                    Easily compress your document files to fit the 1MB limit. This tool optimizes image-based documents while preserving essential details.
                                </p>

                                <label className="relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-3xl bg-black/20 hover:bg-white/5 hover:border-purple-500/50 transition-all cursor-pointer group mb-8">
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
                                    <div className="p-6 rounded-full bg-purple-500/10 text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                                        <Minimize2 size={48} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors text-center">
                                        {compressFile ? compressFile.name : 'Select document to compress'}
                                    </h3>
                                    {compressFile && (
                                        <p className="text-slate-500 text-sm mt-2">
                                            Original Size: {(compressFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    )}
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
                                        {isCompressing ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                                        {isCompressing ? 'Compressing...' : 'Start Compression'}
                                    </motion.button>

                                    {compressedFile && (
                                        <motion.button
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                            onClick={() => {
                                                const url = URL.createObjectURL(compressedFile);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = `compressed_${compressFile.name}`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                URL.revokeObjectURL(url);
                                            }}
                                        >
                                            <Download size={20} />
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

export default UserDashboard;
