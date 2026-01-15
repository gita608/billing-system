import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import './TaxReport.css';

function TaxReport() {
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

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  return (
    <div className="tax-report-screen">
      <Header title="Tax Report" showBackButton={true} onBack={() => navigate('/')} />
      
      <div className="tax-report-content">
        <div className="report-filters">
          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            />
          </div>
          <button className="btn-primary" onClick={loadReport}>Generate Report</button>
        </div>

        {loading ? (
          <div className="loading">Loading report...</div>
        ) : reportData ? (
          <div className="tax-summary">
            <div className="summary-section">
              <h2>Tax Summary</h2>
              <div className="summary-cards">
                <div className="summary-card">
                  <h3>Total Tax Collected</h3>
                  <p className="tax-amount">{formatCurrency(reportData.summary.total_tax)} SAR</p>
                </div>
                <div className="summary-card">
                  <h3>Total Sales (Excl. Tax)</h3>
                  <p className="sales-amount">{formatCurrency(reportData.summary.total_subtotal)} SAR</p>
                </div>
                <div className="summary-card">
                  <h3>Total Sales (Incl. Tax)</h3>
                  <p className="total-amount">{formatCurrency(reportData.summary.total_sales)} SAR</p>
                </div>
                <div className="summary-card">
                  <h3>Number of Transactions</h3>
                  <p className="transactions-count">{reportData.summary.total_orders}</p>
                </div>
              </div>
            </div>

            <div className="tax-breakdown">
              <h2>Tax Breakdown by Order</h2>
              <div className="tax-table-container">
                <table className="tax-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Subtotal</th>
                      <th>Tax Amount</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.orders.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-state">No transactions found</td>
                      </tr>
                    ) : (
                      reportData.orders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.order_number}</td>
                          <td>{new Date(order.created_at).toLocaleDateString()}</td>
                          <td>{formatCurrency(order.subtotal)}</td>
                          <td className="tax-cell">{formatCurrency(order.tax)}</td>
                          <td className="total-cell">{formatCurrency(order.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TaxReport;
