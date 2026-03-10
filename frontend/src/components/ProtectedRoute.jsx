import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    // Admin routing check
    if (requiredRole === 'Admin' && user?.role !== 'Admin') {
        return <Navigate to="/user" />;
    }

    // User routing check (Admin can also potentially view user stuff or just isolated)
    if (requiredRole === 'User' && user?.role === 'Admin') {
        // optional logic. By strict definition, Admin goes to /admin.
        return <Navigate to="/admin" />;
    }

    return children;
};

export default ProtectedRoute;
