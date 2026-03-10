import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    const { isAuthenticated, user } = useSelector(state => state.auth);

    const getDashboardPath = () => {
        return user?.role === 'Admin' ? '/admin' : '/user';
    };

    return (
        <div className="app">
            <Routes>
                <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={getDashboardPath()} />} />
                <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to={getDashboardPath()} />} />

                <Route path="/admin" element={
                    <ProtectedRoute requiredRole="Admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

                <Route path="/user" element={
                    <ProtectedRoute requiredRole="User">
                        <UserDashboard />
                    </ProtectedRoute>
                } />

                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </div>
    );
}

export default App;
