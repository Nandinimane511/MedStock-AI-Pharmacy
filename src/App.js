import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './Components/Header';
import Notifications from './Components/Notifications';
import FormPopup from './Components/FormPopup';
import Sidebar from './Components/Sidebar';
import Home from './Components/Home';
import Inventory from './Components/Inventory';
import AdminBilling from './Components/AdminBilling';
import UserBilling from './Components/UserBilling';
import Orders from './Components/Orders';
import Supplier from './Components/Supplier';
import Reports from './Components/Reports';
import Users from './Components/Users';
import AuthForm from './Components/AuthForm';
import Profile from './Components/Profile';
import PrescriptionScanner from './Components/PrescriptionScanner';


import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { RoleProvider, useRole } from './Components/RoleContext';
import ForgotResetPassword from "./Components/ForgotResetPassword";
import toast from 'react-hot-toast';

const SessionManager = () => {
  const navigate = useNavigate();
  const { setRole } = useRole();

  React.useEffect(() => {
    let timeoutId;
    const checkTimeout = () => {
      const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
      if (!savedSettings || !savedSettings.autoLogout || savedSettings.autoLogout === "0") {
        return;
      }
      
      const timeoutMs = parseInt(savedSettings.autoLogout, 10) * 60 * 1000;
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Auto-logout triggered
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        if (setRole) setRole('');
        navigate('/');
        toast.error('Logged out due to inactivity.');
      }, timeoutMs);
    };

    // Events to reset timeout
    const events = ['load', 'mousemove', 'mousedown', 'click', 'scroll', 'keypress'];
    const resetTimer = () => checkTimeout();

    events.forEach(e => window.addEventListener(e, resetTimer));
    checkTimeout(); // Init

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(timeoutId);
    };
  }, [navigate, setRole]);

  return null;
};

const Layout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || location.pathname === '/Signup';

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {!isAuthPage && <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />}
      <div className="AppContainer">
        {!isAuthPage && (
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            closeSidebar={closeSidebar}
          />
        )}
        <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : ''}`}>
          <main className={!isAuthPage ? "pt-[73px]" : ""}>{children}</main>
        </div>
      </div>
      {!isAuthPage && <FormPopup />}
      <Toaster position="top-right" reverseOrder={false} />
    </>
  );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role } = useRole();
  if (!role) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/Home" />;
  return children;
};

function App() {
  React.useEffect(() => {
    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    if (savedSettings && savedSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <div className="App dark:bg-slate-900 dark:text-slate-100 min-h-screen">
      <RoleProvider>
        <Router>
          <SessionManager />
          <Layout>
            <Routes>
              <Route path="/" element={<AuthForm />} />
              <Route path="/Signup" element={<AuthForm />} />

              <Route
                path="/Home"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Inventory"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Inventory />
                  </ProtectedRoute>
                }
              />
              
              {/* AI Prescription Scanner Route */}
              <Route
                path="/PrescriptionScanner"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'User']}>
                    <PrescriptionScanner />
                  </ProtectedRoute>
                }
              />

              {/* Billing Route Based on Role */}
              <Route
                path="/Billing/Admin"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminBilling />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Billing/User"
                element={
                  <ProtectedRoute>
                    <UserBilling />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/Orders"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Supplier"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Supplier />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Users"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Reports"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/Profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<AuthForm />} />
              <Route path="/forgot-password" element={<ForgotResetPassword />} />
              <Route path="/reset-password/:token" element={<ForgotResetPassword />} />
            </Routes>
          </Layout>
        </Router>
      </RoleProvider>
    </div>
  );
}

export default App;
