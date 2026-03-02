import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, addDays, parse, startOfMonth, endOfMonth, setDate } from 'date-fns';
import './MilkEntry.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function MilkEntry() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [shift, setShift] = useState('morning');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer && fromDate && toDate) {
      loadEntries();
    }
  }, [selectedCustomer, fromDate, toDate, shift]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
      if (response.data.length > 0) {
        setSelectedCustomer(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleFromDateChange = (date) => {
    setFromDate(date);
    if (date) {
      const dayOfMonth = parseInt(date.split('-')[2]);
      const [year, month] = date.split('-');
      
      if (dayOfMonth === 1) {
        setToDate(`${year}-${month}-10`);
      } else if (dayOfMonth === 11) {
        setToDate(`${year}-${month}-20`);
      } else if (dayOfMonth === 21) {
        const lastDay = endOfMonth(new Date(year, parseInt(month) - 1)).getDate();
        setToDate(`${year}-${month}-${lastDay.toString().padStart(2, '0')}`);
      }
    }
  };

  const loadEntries = async () => {
    if (!selectedCustomer || !fromDate || !toDate) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/milk-entries`, {
        params: {
          customer_id: selectedCustomer,
          from_date: fromDate,
          to_date: toDate,
          shift: shift,
        },
      });
      
      // Create entries for all dates in range
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const dateEntries = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const existing = response.data.find((e) => e.date === dateStr);
        
        dateEntries.push({
          date: dateStr,
          quantity: existing?.quantity || 0,
          fat: existing?.fat || 0,
          snf: existing?.snf || 0,
          degree: existing?.degree || 0,
          rate: existing?.rate || 0,
          amount: existing?.amount || 0,
        });
      }
      
      setEntries(dateEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDegree = (fat, snf) => {
    return parseFloat((4 * (snf - 0.2 * fat - 0.36)).toFixed(2));
  };

  const calculateRate = (fat, snf, baseRate = 35) => {
    return parseFloat((baseRate + (fat - 3.5) * 1 + (snf - 8.5) * 10).toFixed(2));
  };

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = parseFloat(value) || 0;
    
    // Auto-calculate degree, rate, and amount
    if (field === 'fat' || field === 'snf') {
      newEntries[index].degree = calculateDegree(newEntries[index].fat, newEntries[index].snf);
      newEntries[index].rate = calculateRate(newEntries[index].fat, newEntries[index].snf);
    }
    
    newEntries[index].amount = parseFloat(
      (newEntries[index].quantity * newEntries[index].rate).toFixed(2)
    );
    
    setEntries(newEntries);
  };

  const handleKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Find next unfilled field
      const fields = ['quantity', 'fat', 'snf'];
      const currentFieldIndex = fields.indexOf(field);
      
      // Try next field in same row
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        const nextInput = document.querySelector(`[data-field="${nextField}-${index}"]`);
        if (nextInput && nextInput.value === '0') {
          nextInput.focus();
          nextInput.select();
          return;
        }
      }
      
      // Try next row
      if (index < entries.length - 1) {
        const nextInput = document.querySelector(`[data-field="quantity-${index + 1}"]`);
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  const saveEntry = async (index) => {
    const entry = entries[index];
    if (entry.quantity === 0 || entry.fat === 0 || entry.snf === 0) return;
    
    try {
      await axios.post(`${API}/milk-entries`, {
        customer_id: selectedCustomer,
        date: entry.date,
        shift: shift,
        quantity: entry.quantity,
        fat: entry.fat,
        snf: entry.snf,
      });
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const saveAllEntries = async () => {
  const validEntries = entries.filter(
    (e) => e.quantity > 0 && e.fat > 0 && e.snf > 0
  );

  if (validEntries.length === 0) {
    alert("No valid entries to save");
    return;
  }

  try {
    setLoading(true);

    await Promise.all(
      validEntries.map((entry) =>
        axios.post(`${API}/milk-entries`, {
          customer_id: selectedCustomer,
          date: entry.date,
          shift: shift,
          quantity: entry.quantity,
          fat: entry.fat,
          snf: entry.snf,
        })
      )
    );

    alert("All entries saved successfully ✅");
  } catch (error) {
    console.error("Error saving entries:", error);
    alert("Error saving some entries");
  } finally {
    setLoading(false);
  }
};

  const handleBlur = (index) => {
    saveEntry(index);
  };

  const calculateTotal = () => {
    return entries.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2);
  };

  const selectedCustomerData = customers.find((c) => c.id === selectedCustomer);

  return (
    <div className="milk-entry-container" data-testid="milk-entry">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">10-Day Milk Entry Muster</h2>
          <p className="card-description">Record daily milk collection entries</p>
        </div>

        <div className="entry-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                Select Customer
              </label>
              <select
                data-testid="select-customer"
                className="form-input"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                From Date
              </label>
              <input
                data-testid="from-date"
                type="date"
                className="form-input"
                value={fromDate}
                onChange={(e) => handleFromDateChange(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                To Date
              </label>
              <input
                data-testid="to-date"
                type="date"
                className="form-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="shift-group">
            <label className="form-label">Shift</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  data-testid="shift-morning"
                  type="radio"
                  value="morning"
                  checked={shift === 'morning'}
                  onChange={(e) => setShift(e.target.value)}
                />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                Morning
              </label>
              <label className="radio-label">
                <input
                  data-testid="shift-evening"
                  type="radio"
                  value="evening"
                  checked={shift === 'evening'}
                  onChange={(e) => setShift(e.target.value)}
                />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                Evening
              </label>
            </div>
          </div>
        </div>
      </div>

      {selectedCustomerData && fromDate && toDate && (
        <div className="card">
      <div className="entry-header">
  <h3 className="entry-title">
    {selectedCustomerData.name} - {shift.charAt(0).toUpperCase() + shift.slice(1)} Shift
  </h3>

  <div className="entry-total">
    <span>Total:</span>
    <span className="total-amount">₹{calculateTotal()}</span>

    <button
      className="save-all-btn"
      onClick={saveAllEntries}
      disabled={loading}
    >
      {loading ? "Saving..." : "Save All Entries"}
    </button>
  </div>
</div>

          <p className="entry-subtitle">
            {format(new Date(fromDate), 'yyyy-MM-dd')} to {format(new Date(toDate), 'yyyy-MM-dd')}
          </p>

          <div className="table-container">
            <table className="milk-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Quantity (L)</th>
                  <th>Fat (%)</th>
                  <th>SNF (%)</th>
                  <th>Degree</th>
                  <th>Rate (₹)</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center">Loading...</td>
                  </tr>
                ) : (
                  entries.map((entry, index) => (
                    <tr key={index} data-testid={`entry-row-${index}`}>
                      <td>{format(new Date(entry.date), 'dd/MM/yyyy')}</td>
                      <td>
                        <input
                          data-testid={`quantity-${index}`}
                          data-field={`quantity-${index}`}
                          type="number"
                          step="0.01"
                          className="table-input"
                          value={entry.quantity}
                          onChange={(e) => handleEntryChange(index, 'quantity', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                          onBlur={() => handleBlur(index)}
                        />
                      </td>
                      <td>
                        <input
                          data-testid={`fat-${index}`}
                          data-field={`fat-${index}`}
                          type="number"
                          step="0.1"
                          className="table-input"
                          value={entry.fat}
                          onChange={(e) => handleEntryChange(index, 'fat', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'fat')}
                          onBlur={() => handleBlur(index)}
                        />
                      </td>
                      <td>
                        <input
                          data-testid={`snf-${index}`}
                          data-field={`snf-${index}`}
                          type="number"
                          step="0.1"
                          className="table-input"
                          value={entry.snf}
                          onChange={(e) => handleEntryChange(index, 'snf', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'snf')}
                          onBlur={() => handleBlur(index)}
                        />
                      </td>
                      <td>{entry.degree.toFixed(1)}°</td>
                      <td>₹{entry.rate.toFixed(2)}</td>
                      <td>₹{entry.amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default MilkEntry;
