import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import './Reports.css';

function Reports() {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    date_from: new Date().toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    if (window.electronAPI) {
      const result = await window.electronAPI.getSalesReport(filters);
      if (result.success) {
        setReportData(result.data);
      }
    }
    setLoading(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="reports-screen">
      <Header title="Sales Reports" showBackButton={true} onBack={() => navigate('/')} />
      
      <div className="reports-content">
        <div className="reports-filters">
          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={loadReport}>Generate Report</button>
        </div>

        {loading ? (
          <div className="loading">Loading report...</div>
        ) : reportData ? (
          <>
            <div className="report-summary">
              <div className="summary-card">
                <h3>Total Orders</h3>
                <p className="summary-value">{reportData.summary.total_orders}</p>
              </div>
              <div className="summary-card">
                <h3>Total Sales</h3>
                <p className="summary-value">{formatCurrency(reportData.summary.total_sales)} SAR</p>
              </div>
              <div className="summary-card">
                <h3>Total Tax</h3>
                <p className="summary-value">{formatCurrency(reportData.summary.total_tax)} SAR</p>
              </div>
              <div className="summary-card">
                <h3>Subtotal</h3>
                <p className="summary-value">{formatCurrency(reportData.summary.total_subtotal)} SAR</p>
              </div>
            </div>

            <div className="report-table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Bill #</th>
                    <th>Type</th>
                    <th>Customer</th>
                    <th>Subtotal</th>
                    <th>Tax</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.orders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-state">No orders found for the selected period</td>
                    </tr>
                  ) : (
                    reportData.orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.order_number}</td>
                        <td>{order.bill_number || 'N/A'}</td>
                        <td>{order.order_type}</td>
                        <td>{order.customer_name || 'Walk-in'}</td>
                        <td>{formatCurrency(order.subtotal)}</td>
                        <td>{formatCurrency(order.tax)}</td>
                        <td className="total-cell">{formatCurrency(order.total)}</td>
                        <td>{formatDate(order.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default Reports;
