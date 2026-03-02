import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Calendar, IndianRupee, Wallet, Package, Activity } from 'lucide-react';
import './Dashboard.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Dashboard() {
  const [stats, setStats] = useState({
    total_customers: 0,
    todays_entries: 0,
    base_rate: 35,
    total_advance: 0,
    monthly_bags: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="dashboard-container" data-testid="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard Overview</h1>
        <p className="dashboard-subtitle">Welcome to your dairy management system</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" data-testid="stat-total-customers">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' }}>
            <Users size={24} color="#2563eb" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Customers</p>
            <p className="stat-value">{stats.total_customers}</p>
          </div>
        </div>

        <div className="stat-card" data-testid="stat-todays-entries">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' }}>
            <Calendar size={24} color="#10b981" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Today's Entries</p>
            <p className="stat-value">{stats.todays_entries}</p>
          </div>
        </div>

        <div className="stat-card" data-testid="stat-base-rate">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
            <IndianRupee size={24} color="#16a34a" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Base Rate</p>
            <p className="stat-value">₹{stats.base_rate}</p>
          </div>
        </div>

        <div className="stat-card" data-testid="stat-total-advance">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)' }}>
            <Wallet size={24} color="#0891b2" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Advance Given</p>
            <p className="stat-value">₹{stats.total_advance.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card" data-testid="stat-monthly-bags">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)' }}>
            <Package size={24} color="#ea580c" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Monthly Bags Sold</p>
            <p className="stat-value">{stats.monthly_bags.toFixed(0)}</p>
          </div>
        </div>

        <div className="stat-card" data-testid="stat-system-status">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' }}>
            <Activity size={24} color="#10b981" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Active System</p>
            <p className="stat-value status-online">Online</p>
          </div>
        </div>
      </div>

     
    </div>
  );
}

export default Dashboard;
