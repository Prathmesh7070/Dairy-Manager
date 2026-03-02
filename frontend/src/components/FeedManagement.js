import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import './FeedManagement.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function FeedManagement() {
  const [brands, setBrands] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price_per_bag: 0,
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${API}/feed-brands`);
      setBrands(response.data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/feed-brands`, formData);
      fetchBrands();
      closeModal();
    } catch (error) {
      console.error('Error saving brand:', error);
      alert('Error saving feed brand');
    }
  };

  const openModal = () => {
    setFormData({ name: '', price_per_bag: 0 });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ name: '', price_per_bag: 0 });
  };

  return (
    <div className="feed-container" data-testid="feed-management">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Feed Brand Management</h2>
            <p className="card-description">Manage cattle feed brands and pricing</p>
          </div>
          <button data-testid="add-brand-btn" onClick={openModal} className="btn btn-primary">
            <Plus size={18} />
            Add Feed Brand
          </button>
        </div>

        <div className="feed-types-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>Available Feed Types</h3>
          <div className="feed-types-grid">
            <div className="feed-type-badge">Makka Aata</div>
            <div className="feed-type-badge">Wheat Aata</div>
            <div className="feed-type-badge">Sarki Pend</div>
            <div className="feed-type-badge">Goli pend</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Brands List</h3>

          {brands.length === 0 ? (
            <div className="empty-state">
              <p>No feed brands found</p>
              <button onClick={openModal} className="btn btn-primary">
                Add First Brand
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Brand Name</th>
                    <th>Price per Bag (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand) => (
                    <tr key={brand.id} data-testid={`brand-row-${brand.id}`}>
                      <td>{brand.name}</td>
                      <td>₹{brand.price_per_bag.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Feed Brand</h3>
              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Brand Name *</label>
                <input
                  data-testid="brand-name-input"
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Amul Gold"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Price per Bag (₹) *</label>
                <input
                  data-testid="brand-price-input"
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.price_per_bag}
                  onChange={(e) => setFormData({ ...formData, price_per_bag: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button data-testid="save-brand-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Brand
                </button>
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedManagement;
