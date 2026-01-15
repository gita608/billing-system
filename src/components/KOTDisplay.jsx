import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import './KOTDisplay.css';

function KOTDisplay() {
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingOrders();
    const interval = setInterval(loadPendingOrders, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPendingOrders = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getOrders({ status: 'pending', limit: 50 });
      if (result.success) {
        // Fetch items for each order
        const ordersWithItems = await Promise.all(
          result.data.map(async (order) => {
            const orderResult = await window.electronAPI.getOrder(order.id);
            if (orderResult.success) {
              return orderResult.data;
            }
            return { ...order, items: [] };
          })
        );
        setPendingOrders(ordersWithItems);
      }
      setLoading(false);
    }
  };

  const handleMarkComplete = async (orderId) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.updateOrderStatus(orderId, 'completed');
      if (result.success) {
        loadPendingOrders();
      }
    }
  };

  const handlePrintKOT = async (orderId) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.printKOT(orderId);
      if (result.success) {
        alert('KOT printed successfully!');
      } else {
        alert('Print error: ' + result.error);
      }
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString();
  };

  const getTimeSince = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    if (diff < 1) return 'Just now';
    if (diff === 1) return '1 min ago';
    if (diff < 60) return diff + ' mins ago';
    const hours = Math.floor(diff / 60);
    return hours + ' hr ' + (diff % 60) + ' min ago';
  };

  return (
    <div className="kot-display-screen">
      <Header title="KOT Display" showBackButton={true} onBack={() => navigate('/')} />
      
      <div className="kot-content">
        {loading ? (
          <div className="loading">Loading orders...</div>
        ) : (
          <>
            <div className="kot-header">
              <h2>Kitchen Order Tickets ({pendingOrders.length} pending)</h2>
              <button className="btn-refresh" onClick={loadPendingOrders}>🔄 Refresh</button>
            </div>
            
            {pendingOrders.length === 0 ? (
              <div className="empty-state">
                <p>✅ No pending orders</p>
                <p className="empty-subtitle">All caught up!</p>
              </div>
            ) : (
              <div className="kot-grid">
                {pendingOrders.map((order) => (
                  <div key={order.id} className={`kot-card ${getTimeSince(order.created_at).includes('hr') ? 'urgent' : ''}`}>
                    <div className="kot-header-card">
                      <div>
                        <h3>Order #{order.order_number}</h3>
                        <p className="kot-time">{formatDateTime(order.created_at)}</p>
                        <p className="kot-time-since">{getTimeSince(order.created_at)}</p>
                      </div>
                      <span className="kot-type">{order.order_type?.replace('-', ' ')}</span>
                    </div>
                    
                    <div className="kot-customer-info">
                      <p className="kot-customer">👤 {order.customer_name || 'Walk-in Customer'}</p>
                      {order.contact_no && <p className="kot-contact">📞 {order.contact_no}</p>}
                    </div>

                    <div className="kot-items">
                      <h4>Items:</h4>
                      {order.items && order.items.length > 0 ? (
                        <ul className="kot-items-list">
                          {order.items.map((item, index) => (
                            <li key={index} className="kot-item">
                              <span className="item-qty">{item.quantity}x</span>
                              <span className="item-name">{item.item_name}</span>
                              {item.notes && <span className="item-notes">({item.notes})</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-items">No items</p>
                      )}
                    </div>

                    {order.notes && (
                      <div className="kot-notes">
                        <strong>Notes:</strong> {order.notes}
                      </div>
                    )}

                    <div className="kot-actions">
                      <button className="btn-print-kot" onClick={() => handlePrintKOT(order.id)}>
                        🖨️ Print KOT
                      </button>
                      <button className="btn-complete" onClick={() => handleMarkComplete(order.id)}>
                        ✅ Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default KOTDisplay;
