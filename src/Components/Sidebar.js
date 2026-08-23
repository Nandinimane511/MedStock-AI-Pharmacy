import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import mslogo from '../Assets/mslogo.png';
import { FaBox, FaTruck, FaHome, FaChartBar, FaMoneyBill, FaBell, FaUser, FaFilePrescription } from 'react-icons/fa';
import { useRole } from './RoleContext';

const Sidebar = ({ isSidebarOpen, closeSidebar }) => {
  const location = useLocation();
  const { role } = useRole();

  const sidebarItems = [
    { id: 'inventory', label: 'Inventory', icon: <FaBox />, path: '/Inventory', allowedRoles: ['Admin'] },
    { id: 'scanner', label: 'AI Prescription Scanner', icon: <FaFilePrescription className="text-teal-500" />, path: '/PrescriptionScanner', allowedRoles: ['Admin', 'User'] },
    { id: 'orders', label: 'Orders', icon: <FaTruck />, path: '/Orders', allowedRoles: ['Admin'] },
    { id: 'suppliers', label: 'Suppliers', icon: <FaHome />, path: '/Supplier', allowedRoles: ['Admin'] },
    { id: 'reports', label: 'Reports', icon: <FaChartBar />, path: '/Reports', allowedRoles: ['Admin'] },
    { id: 'billing', label: 'Billing', icon: <FaMoneyBill />, path: role === 'Admin' ? '/Billing/Admin' : '/Billing/User', allowedRoles: ['Admin', 'User'] },
    { id: 'notifications', label: 'Notifications', icon: <FaBell />, path: '/Notifications', allowedRoles: ['Admin', 'User'] },
    { id: 'users', label: 'Users', icon: <FaUser />, path: '/Users', allowedRoles: ['Admin'] },
    { id: 'profile', label: 'Profile', icon: <FaUser />, path: '/Profile', allowedRoles: ['Admin', 'User'] },
  ].filter(item => item.allowedRoles.includes(role));

  return (
    <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 shadow transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 z-50`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <img src={mslogo} alt="Logo" className="w-10 h-10" />
          <span className="font-bold text-xl text-gray-800 dark:text-gray-100">MedStock</span>
        </div>
        <button onClick={closeSidebar} className="text-xl text-gray-600 dark:text-gray-300">
          <FaTimes />
        </button>
      </div>
      <ul className="p-4 space-y-2">
        {sidebarItems.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.path}
              onClick={closeSidebar}
              className={`flex items-center space-x-3 px-4 py-2 rounded-xl transition-all duration-200 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:text-primary-600 dark:hover:text-primary-400 ${location.pathname === item.path ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold shadow-sm' : ''}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
