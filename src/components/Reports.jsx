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
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    // Validate date range
    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
      setError('From date cannot be after To date');
      return;
    }

    setLoading(true);
    setError(null);
    
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.getSalesReport(filters);
        if (result.success) {
          setReportData(result.data);
        } else {
          setError(result.error || 'Failed to load report');
          setReportData(null);
        }
      } catch (err) {
        setError('Error loading report: ' + err.message);
        setReportData(null);
      }
    } else {
      setError('Electron API not available');
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

  const handleExportCSV = () => {
    if (!reportData || !reportData.orders.length) {
      alert('No data to export');
      return;
    }

    // CSV Headers
    const headers = ['Order #', 'Bill #', 'Type', 'Customer', 'Subtotal', 'Tax', 'Total', 'Date'];
    
    // CSV Rows
    const rows = reportData.orders.map(order => [
      order.order_number || '',
      order.bill_number || 'N/A',
      order.order_type || '',
      order.customer_name || 'Walk-in',
      formatCurrency(order.subtotal),
      formatCurrency(order.tax),
      formatCurrency(order.total),
      formatDate(order.created_at)
    ]);

    // Add summary row
    const summaryRow = [
      'SUMMARY',
      '',
      '',
      '',
      formatCurrency(reportData.summary.total_subtotal),
      formatCurrency(reportData.summary.total_tax),
      formatCurrency(reportData.summary.total_sales),
      `Total Orders: ${reportData.summary.total_orders}`
    ];

    // Combine headers, rows, and summary
    const csvContent = [
      ['Sales Report', `From: ${filters.date_from}`, `To: ${filters.date_to}`, '', '', '', '', ''],
      headers,
      ...rows,
      [],
      summaryRow
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-report-${filters.date_from}-to-${filters.date_to}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!reportData) {
      alert('No report data to print');
      return;
    }

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            @page { margin: 1cm; }
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            h1 { color: #2a5298; margin-bottom: 10px; font-size: 24px; }
            .report-info { margin-bottom: 20px; color: #666; font-size: 12px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
            .summary-card h3 { margin: 0 0 10px 0; font-size: 12px; color: #666; text-transform: uppercase; }
            .summary-value { font-size: 20px; font-weight: bold; color: #2a5298; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th { background: #2a5298; color: white; padding: 8px; text-align: left; font-weight: 600; }
            th.text-right { text-align: right; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            td.text-right { text-align: right; }
            .total-row { font-weight: bold; background: #f5f5f5; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Sales Report</h1>
          <div class="report-info">
            <p><strong>Period:</strong> ${filters.date_from} to ${filters.date_to}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div class="summary">
            <div class="summary-card">
              <h3>Total Orders</h3>
              <div class="summary-value">${reportData.summary.total_orders}</div>
            </div>
            <div class="summary-card">
              <h3>Total Sales</h3>
              <div class="summary-value">${formatCurrency(reportData.summary.total_sales)} SAR</div>
            </div>
            <div class="summary-card">
              <h3>Total Tax</h3>
              <div class="summary-value">${formatCurrency(reportData.summary.total_tax)} SAR</div>
            </div>
            <div class="summary-card">
              <h3>Subtotal</h3>
              <div class="summary-value">${formatCurrency(reportData.summary.total_subtotal)} SAR</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Bill #</th>
                <th>Type</th>
                <th>Customer</th>
                <th class="text-right">Subtotal</th>
                <th class="text-right">Tax</th>
                <th class="text-right">Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.orders.map(order => `
                <tr>
                  <td>${order.order_number || ''}</td>
                  <td>${order.bill_number || 'N/A'}</td>
                  <td>${order.order_type || ''}</td>
                  <td>${order.customer_name || 'Walk-in'}</td>
                  <td class="text-right">${formatCurrency(order.subtotal)}</td>
                  <td class="text-right">${formatCurrency(order.tax)}</td>
                  <td class="text-right">${formatCurrency(order.total)}</td>
                  <td>${formatDate(order.created_at)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4"><strong>Total</strong></td>
                <td class="text-right"><strong>${formatCurrency(reportData.summary.total_subtotal)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(reportData.summary.total_tax)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(reportData.summary.total_sales)}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    iframe.contentDocument.open();
    iframe.contentDocument.write(printContent);
    iframe.contentDocument.close();

    // Wait for content to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    };

    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    }, 500);
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
          {reportData && (
            <>
              <button className="btn-export" onClick={handleExportCSV}>📥 Export CSV</button>
              <button className="btn-print" onClick={handlePrint}>🖨️ Print</button>
            </>
          )}
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}
        
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
                    <th className="text-left">Order #</th>
                    <th className="text-left">Bill #</th>
                    <th className="text-left">Type</th>
                    <th className="text-left">Customer</th>
                    <th className="text-right">Subtotal</th>
                    <th className="text-right">Tax</th>
                    <th className="text-right">Total</th>
                    <th className="text-left">Date</th>
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
                        <td className="text-left">{order.order_number}</td>
                        <td className="text-left">{order.bill_number || 'N/A'}</td>
                        <td className="text-left">{order.order_type}</td>
                        <td className="text-left">{order.customer_name || 'Walk-in'}</td>
                        <td className="text-right">{formatCurrency(order.subtotal)}</td>
                        <td className="text-right">{formatCurrency(order.tax)}</td>
                        <td className="total-cell text-right">{formatCurrency(order.total)}</td>
                        <td className="text-left">{formatDate(order.created_at)}</td>
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
