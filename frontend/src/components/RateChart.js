import { useState, useEffect } from 'react';
import axios from 'axios';
import './RateChart.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function RateChart() {
  const [baseRate, setBaseRate] = useState(35);
  const [chartData, setChartData] = useState([]);
  const [newBaseRate, setNewBaseRate] = useState(35);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {

    fetchRateChart();
  }, []);

  const fetchRateChart = async () => {
    try {
      const response = await axios.get(`${API}/rate-chart`);
      setBaseRate(response.data.base_rate);
      setChartData(response.data.chart || []);
      setNewBaseRate(response.data.base_rate);
    } catch (error) {
      console.error('Error fetching rate chart:', error);
    }
  };

  const handleUpdateRate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/rate-config`, {
        base_rate: parseFloat(newBaseRate),
        effective_date: effectiveDate,
      });
      alert('Base rate updated successfully');
      fetchRateChart();
    } catch (error) {
      console.error('Error updating rate:', error);
      alert('Error updating rate');
    }
  };

  const snfValues = [8.0, 8.5, 9.0, 9.5, 10.0];
  const fatValues = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];

  return (
    <div className="rate-chart-container" data-testid="rate-chart">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Milk Rate Chart</h2>
          <p className="card-description">Current base rate: ₹{baseRate}</p>
        </div>

        <div className="card" style={{ background: '#f9fafb', marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Update Base Rate</h3>
          <form onSubmit={handleUpdateRate} className="rate-form">
            <div className="form-group">
              <label className="form-label">New Base Rate (₹)</label>
              <input
                data-testid="base-rate-input"
                type="number"
                step="0.01"
                className="form-input"
                value={newBaseRate}
                onChange={(e) => setNewBaseRate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Effective Date</label>
              <input
                data-testid="effective-date-input"
                type="date"
                className="form-input"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
            </div>
            <button data-testid="update-rate-btn" type="submit" className="btn btn-primary">
              Update Rate
            </button>
          </form>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Rate Matrix</h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            Rates calculated based on Fat and SNF percentages
          </p>

          <div className="table-container">
            <table className="rate-table">
              <thead>
                <tr>
                  <th>Fat %</th>
                  {snfValues.map((snf) => (
                    <th key={snf}>SNF {snf}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fatValues.map((fat) => {
                  const rowData = chartData.filter(item => item.fat === fat);
                  return (
                    <tr key={fat}>
                      <td className="fat-cell">{fat}</td>
                      {snfValues.map((snf) => {
                        const cell = rowData.find(item => item.snf === snf);
                        return (
                          <td key={`${fat}-${snf}`} className="rate-cell">
                            {cell ? (
                              <>
                                <div className="rate-value">₹{cell.rate.toFixed(2)}</div>
                                <div className="degree-value">{cell.degree.toFixed(1)}°</div>
                              </>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RateChart;
