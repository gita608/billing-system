import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import './WorkPeriod.css';

function WorkPeriod() {
  const navigate = useNavigate();
  const [activePeriod, setActivePeriod] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [formData, setFormData] = useState({
    operator_name: 'Admin',
    opening_cash: '',
    closing_cash: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivePeriod();
    loadPeriods();
  }, []);

  const loadActivePeriod = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getActiveWorkPeriod();
      if (result.success) {
        setActivePeriod(result.data);
        if (result.data) {
          setFormData({
            operator_name: result.data.operator_name,
            opening_cash: result.data.opening_cash,
            closing_cash: '',
          });
        }
      }
      setLoading(false);
    }
  };

  const loadPeriods = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getWorkPeriods(20);
      if (result.success) {
        setPeriods(result.data);
      }
    }
  };

  const handleStartPeriod = async () => {
    if (!formData.opening_cash) {
      alert('Please enter opening cash amount');
      return;
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.startWorkPeriod({
        operator_name: formData.operator_name,
        opening_cash: parseFloat(formData.opening_cash) || 0,
      });

      if (result.success) {
        await loadActivePeriod();
        await loadPeriods();
        alert('Work period started successfully!');
      } else {
        alert('Error: ' + result.error);
      }
    }
  };

  const handleEndPeriod = async () => {
    if (!activePeriod) return;

    if (!formData.closing_cash) {
      alert('Please enter closing cash amount');
      return;
    }

    if (window.confirm('Are you sure you want to end this work period?')) {
      if (window.electronAPI) {
        const result = await window.electronAPI.endWorkPeriod(activePeriod.id, {
          closing_cash: parseFloat(formData.closing_cash) || 0,
        });

        if (result.success) {
          await loadActivePeriod();
          await loadPeriods();
          alert('Work period ended successfully!');
        } else {
          alert('Error: ' + result.error);
        }
      }
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="work-period-screen">
        <Header title="Work Period" showBackButton={true} onBack={() => navigate('/')} />
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="work-period-screen">
      <Header title="Work Period" showBackButton={true} onBack={() => navigate('/')} />
      
      <div className="work-period-content">
        <div className="period-controls">
          <h2>{activePeriod ? 'Active Work Period' : 'Start New Work Period'}</h2>
          
          {activePeriod ? (
            <div className="active-period-info">
              <div className="info-row">
                <span>Started:</span>
                <span>{formatDateTime(activePeriod.start_time)}</span>
              </div>
              <div className="info-row">
                <span>Operator:</span>
                <span>{activePeriod.operator_name}</span>
              </div>
              <div className="info-row">
                <span>Opening Cash:</span>
                <span>{parseFloat(activePeriod.opening_cash || 0).toFixed(2)} SAR</span>
              </div>
              <div className="info-row">
                <span>Total Sales:</span>
                <span>{parseFloat(activePeriod.total_sales || 0).toFixed(2)} SAR</span>
              </div>
              
              <div className="form-group">
                <label className="field-label">Closing Cash *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.closing_cash}
                  onChange={(e) => setFormData({ ...formData, closing_cash: e.target.value })}
                  placeholder="Enter closing cash amount"
                />
              </div>
              
              <button className="btn-danger" onClick={handleEndPeriod}>
                End Work Period
              </button>
            </div>
          ) : (
            <div className="new-period-form">
              <div className="form-group">
                <label className="field-label">Operator Name</label>
                <input
                  type="text"
                  value={formData.operator_name}
                  onChange={(e) => setFormData({ ...formData, operator_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="field-label">Opening Cash *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.opening_cash}
                  onChange={(e) => setFormData({ ...formData, opening_cash: e.target.value })}
                  placeholder="Enter opening cash amount"
                />
              </div>
              <button className="btn-primary" onClick={handleStartPeriod}>
                Start Work Period
              </button>
            </div>
          )}
        </div>

        <div className="period-history">
          <h2>Recent Work Periods</h2>
          <div className="periods-list">
            {periods.length === 0 ? (
              <div className="empty-state">No work periods found</div>
            ) : (
              periods.map((period) => (
                <div key={period.id} className="period-card">
                  <div className="period-header">
                    <span className={`period-status ${period.status}`}>{period.status}</span>
                    <span className="period-date">{formatDateTime(period.start_time)}</span>
                  </div>
                  <div className="period-details">
                    <div className="detail-item">
                      <span>Operator:</span>
                      <span>{period.operator_name}</span>
                    </div>
                    <div className="detail-item">
                      <span>Opening Cash:</span>
                      <span>{parseFloat(period.opening_cash || 0).toFixed(2)} SAR</span>
                    </div>
                    {period.end_time && (
                      <>
                        <div className="detail-item">
                          <span>Closing Cash:</span>
                          <span>{parseFloat(period.closing_cash || 0).toFixed(2)} SAR</span>
                        </div>
                        <div className="detail-item">
                          <span>Total Sales:</span>
                          <span className="sales-amount">{parseFloat(period.total_sales || 0).toFixed(2)} SAR</span>
                        </div>
                        <div className="detail-item">
                          <span>Ended:</span>
                          <span>{formatDateTime(period.end_time)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkPeriod;
