import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import './Items.css';

function Items() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category_id: '',
    price: '',
    description: '',
    is_available: true,
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    display_order: 0,
  });

  useEffect(() => {
    loadCategories();
    loadMenuItems();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadMenuItems(selectedCategory);
    } else {
      loadMenuItems();
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getCategories();
      if (result.success) {
        setCategories(result.data);
      }
    }
  };

  const loadMenuItems = async (categoryId = null) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getMenuItems(categoryId);
      if (result.success) {
        setMenuItems(result.data);
      }
    }
  };

  // Item handlers
  const handleAddItem = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      category_id: selectedCategory || '',
      price: '',
      description: '',
      is_available: true,
    });
    setShowItemForm(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      category_id: item.category_id,
      price: item.price,
      description: item.description || '',
      is_available: item.is_available === 1,
    });
    setShowItemForm(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name || !formData.category_id || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    if (window.electronAPI) {
      const itemData = {
        ...formData,
        price: parseFloat(formData.price),
        is_available: formData.is_available ? 1 : 0,
      };

      let result;
      if (editingItem) {
        result = await window.electronAPI.updateMenuItem(editingItem.id, itemData);
      } else {
        result = await window.electronAPI.createMenuItem(itemData);
      }

      if (result.success) {
        setShowItemForm(false);
        loadMenuItems(selectedCategory);
      } else {
        alert('Error: ' + result.error);
      }
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteMenuItem(id);
        if (result.success) {
          loadMenuItems(selectedCategory);
        } else {
          alert('Error: ' + result.error);
        }
      }
    }
  };

  // Category handlers
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      display_order: categories.length + 1,
    });
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category, e) => {
    e.stopPropagation();
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      display_order: category.display_order || 0,
    });
    setShowCategoryForm(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name) {
      alert('Please enter category name');
      return;
    }

    if (window.electronAPI) {
      let result;
      if (editingCategory) {
        result = await window.electronAPI.updateCategory(editingCategory.id, categoryFormData);
      } else {
        result = await window.electronAPI.createCategory(categoryFormData);
      }

      if (result.success) {
        setShowCategoryForm(false);
        loadCategories();
      } else {
        alert('Error: ' + result.error);
      }
    }
  };

  const handleDeleteCategory = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this category?\n\nAll items in this category will also be deleted!')) {
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteCategory(id);
        if (result.success) {
          if (selectedCategory === id) {
            setSelectedCategory(null);
          }
          loadCategories();
          loadMenuItems();
        } else {
          alert('Error: ' + result.error);
        }
      }
    }
  };

  return (
    <div className="items-screen">
      <Header title="Items Management" showBackButton={true} onBack={() => navigate('/')} />
      
      <div className="items-content">
        <div className="items-sidebar">
          <div className="sidebar-header">
            <h2>Categories</h2>
            <button className="btn-add-cat" onClick={handleAddCategory}>+ Add</button>
          </div>
          <div className="category-list">
            <button
              className={`category-btn ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              📋 All Items
            </button>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
              >
                <button
                  className="category-btn-main"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </button>
                <div className="category-actions">
                  <button className="cat-action-btn" onClick={(e) => handleEditCategory(cat, e)} title="Edit">
                    ✏️
                  </button>
                  <button className="cat-action-btn delete" onClick={(e) => handleDeleteCategory(cat.id, e)} title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="items-main">
          <div className="items-header">
            <h2>{selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'All Items'} ({menuItems.length})</h2>
            <button className="btn-primary" onClick={handleAddItem}>+ Add Item</button>
          </div>

          <div className="items-grid">
            {menuItems.length === 0 ? (
              <div className="empty-state">
                <p>📦 No items found</p>
                <p className="empty-subtitle">Click "Add Item" to create one</p>
              </div>
            ) : (
              menuItems.map((item) => (
                <div key={item.id} className="item-card">
                  <div className="item-header">
                    <h3>{item.name}</h3>
                    <span className={`item-status ${item.is_available === 1 ? 'available' : 'unavailable'}`}>
                      {item.is_available === 1 ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="item-details">
                    <p className="item-code">Code: {item.code || 'N/A'}</p>
                    <p className="item-price">{item.price?.toFixed(2) || '0.00'} SAR</p>
                    {item.description && <p className="item-description">{item.description}</p>}
                    {item.category_name && <p className="item-category">📁 {item.category_name}</p>}
                  </div>
                  <div className="item-actions">
                    <button className="btn-edit" onClick={() => handleEditItem(item)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDeleteItem(item.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="modal-overlay" onClick={() => setShowItemForm(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <form className="item-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Price (SAR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  />
                  Available for sale
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowItemForm(false)}>
                  Cancel
                </button>
                <button type="button" className="btn-primary" onClick={handleSaveItem}>
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="modal-overlay" onClick={() => setShowCategoryForm(false)}>
          <div 
            className="modal-content modal-small" 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
            <form className="item-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  value={categoryFormData.display_order}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCategoryForm(false)}>
                  Cancel
                </button>
                <button type="button" className="btn-primary" onClick={handleSaveCategory}>
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Items;
