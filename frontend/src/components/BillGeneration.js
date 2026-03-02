import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import './BillGeneration.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function BillGeneration() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [billData, setBillData] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const generateBill = async () => {
    if (!selectedCustomer || !fromDate || !toDate) {
      alert('Please select customer and date range');
      return;
    }

    try {
      const customerResponse = await axios.get(`${API}/customers/${selectedCustomer}`);
      const customer = customerResponse.data;

      const morningResponse = await axios.get(`${API}/milk-entries`, {
        params: { customer_id: selectedCustomer, from_date: fromDate, to_date: toDate, shift: 'morning' },
      });

      const eveningResponse = await axios.get(`${API}/milk-entries`, {
        params: { customer_id: selectedCustomer, from_date: fromDate, to_date: toDate, shift: 'evening' },
      });

      const feedResponse = await axios.get(`${API}/feed-distributions`, {
        params: { customer_id: selectedCustomer, from_date: fromDate, to_date: toDate },
      });

      const morningEntries = morningResponse.data || [];
      const eveningEntries = eveningResponse.data || [];
      const feedDistributions = feedResponse.data || [];

      let morningTotal = 0;
      for (let i = 0; i < morningEntries.length; i++) {
        morningTotal += morningEntries[i].amount || 0;
      }

      let eveningTotal = 0;
      for (let i = 0; i < eveningEntries.length; i++) {
        eveningTotal += eveningEntries[i].amount || 0;
      }

      let feedTotal = 0;
      for (let i = 0; i < feedDistributions.length; i++) {
        feedTotal += feedDistributions[i].amount || 0;
      }

      const grandTotal = morningTotal + eveningTotal;
      const netAmount = grandTotal - feedTotal;

      setBillData({
        customer: customer,
        fromDate: fromDate,
        toDate: toDate,
        morningEntries: morningEntries,
        eveningEntries: eveningEntries,
        feedDistributions: feedDistributions,
        morningTotal: morningTotal,
        eveningTotal: eveningTotal,
        grandTotal: grandTotal,
        feedTotal: feedTotal,
        netAmount: netAmount,
      });
    } catch (error) {
      console.error('Error generating bill:', error);
      alert('Error generating bill');
    }
  };

  const printBill = () => {
    window.print();
  };

  const renderBillTable = (entries, title) => {
    if (!entries || entries.length === 0) {
      return null;
    }

    return (
      <div className="bill-section">
        <h4>{title}</h4>
        <table className="bill-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Qty (L)</th>
              <th>Fat %</th>
              <th>SNF %</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={index}>
                <td>{format(new Date(entry.date), 'dd-MM-yyyy')}</td>
                <td>{entry.quantity.toFixed(2)}</td>
                <td>{entry.fat.toFixed(1)}</td>
                <td>{entry.snf.toFixed(1)}</td>
                <td>₹{entry.rate.toFixed(2)}</td>
                <td>₹{entry.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bill-container" data-testid="bill-generation">
      <div className="card no-print">
        <div className="card-header">
          <h2 className="card-title">Bill Generation</h2>
          <p className="card-description">Generate 10-day billing statements</p>
        </div>

        <div className="bill-form">
          <div className="form-group">
            <label className="form-label">Select Customer</label>
            <select
              data-testid="bill-customer-select"
              className="form-input"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">Choose a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input
                data-testid="bill-from-date"
                type="date"
                className="form-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">To Date</label>
              <input
                data-testid="bill-to-date"
                type="date"
                className="form-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <button data-testid="generate-bill-btn" onClick={generateBill} className="btn btn-primary">
            Generate Bill
          </button>
        </div>
      </div>

      {billData && (
        <div className="bill-output">
          <div className="bill-header">
            <h1>श्री स्वामी समर्थ दूध संकलन केंद्र </h1>
            <h2>Shree Swami Samarth Dudh Sankalan</h2>
            <h3>Milk Collection Bill</h3>
          </div>

          <div className="bill-info">
            <div className="info-row">
              <span>Customer Name:</span>
              <strong>{billData.customer.name}</strong>
            </div>
            <div className="info-row">
              <span>Phone:</span>
              <strong>{billData.customer.phone}</strong>
            </div>
            <div className="info-row">
              <span>Address:</span>
              <strong>{billData.customer.address}</strong>
            </div>
            <div className="info-row">
              <span>Period:</span>
              <strong>
                {format(new Date(billData.fromDate), 'dd-MM-yyyy')} to {format(new Date(billData.toDate), 'dd-MM-yyyy')}
              </strong>
            </div>
          </div>

          {renderBillTable(billData.morningEntries, 'Morning Shift Entries')}
          {renderBillTable(billData.eveningEntries, 'Evening Shift Entries')}

          <div className="bill-summary">
            <div className="summary-row">
              <span>Morning Total:</span>
              <strong>₹{billData.morningTotal.toFixed(2)}</strong>
            </div>
            <div className="summary-row">
              <span>Evening Total:</span>
              <strong>₹{billData.eveningTotal.toFixed(2)}</strong>
            </div>
            <div className="summary-row">
              <span>Milk Collection Total:</span>
              <strong>₹{billData.grandTotal.toFixed(2)}</strong>
            </div>
            {billData.feedTotal > 0 && (
              <div className="summary-row">
                <span>Feed Deduction:</span>
                <strong className="deduction">- ₹{billData.feedTotal.toFixed(2)}</strong>
              </div>
            )}
            <div className="summary-row grand-total">
              <span>Net Amount Payable:</span>
              <strong>₹{billData.netAmount.toFixed(2)}</strong>
            </div>
          </div>

          <div className="bill-actions no-print">
            <button data-testid="print-bill-btn" onClick={printBill} className="btn btn-primary">
              Print Bill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillGeneration;
