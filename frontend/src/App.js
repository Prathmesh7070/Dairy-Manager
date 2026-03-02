import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import MilkEntry from './components/MilkEntry';
import RateChart from './components/RateChart';
import FeedManagement from './components/FeedManagement';
import BillGeneration from './components/BillGeneration';
import { Home, Users, Droplet, BarChart3, Package, FileText, LogOut } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Set axios default authorization header
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setActiveTab('dashboard');
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <CustomerManagement />;
      case 'milk-entry':
        return <MilkEntry />;
      case 'rate-chart':
        return <RateChart />;
      case 'feed':
        return <FeedManagement />;
      case 'bills':
        return <BillGeneration />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <h1 className="app-title-marathi">श्री स्वामी समर्थ दूध संकलन केंद्र </h1>
        <h2 className="app-title-english">Shree Swami Samarth Dudh Sankalan Kendra </h2>
      </div>

      <div className="app-layout">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h3 className="sidebar-title">Dairy Management</h3>
            <p className="sidebar-subtitle">Admin Panel</p>
          </div>

          <nav className="sidebar-nav">
            <button
              data-testid="nav-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <Home size={20} />
              <span>Dashboard</span>
            </button>

            <button
              data-testid="nav-customers"
              onClick={() => setActiveTab('customers')}
              className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            >
              <Users size={20} />
              <span>Customer Management</span>
            </button>

            <button
              data-testid="nav-milk-entry"
              onClick={() => setActiveTab('milk-entry')}
              className={`nav-item ${activeTab === 'milk-entry' ? 'active' : ''}`}
            >
              <Droplet size={20} />
              <span>Milk Entry</span>
            </button>

            <button
              data-testid="nav-rate-chart"
              onClick={() => setActiveTab('rate-chart')}
              className={`nav-item ${activeTab === 'rate-chart' ? 'active' : ''}`}
            >
              <BarChart3 size={20} />
              <span>Rate Chart</span>
            </button>

            <button
              data-testid="nav-feed"
              onClick={() => setActiveTab('feed')}
              className={`nav-item ${activeTab === 'feed' ? 'active' : ''}`}
            >
              <Package size={20} />
              <span>Feed Management</span>
            </button>

            <button
              data-testid="nav-bills"
              onClick={() => setActiveTab('bills')}
              className={`nav-item ${activeTab === 'bills' ? 'active' : ''}`}
            >
              <FileText size={20} />
              <span>Bill Generation</span>
            </button>
          </nav>

          <button data-testid="logout-btn" onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
