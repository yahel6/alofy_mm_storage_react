// src/pages/EquipmentFormPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { addNewEquipment, updateEquipmentItem, calculateDerivedStatus } from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import '../components/Form.css'; // ייבוא עיצוב הטופס
import type { EquipmentItem, Warehouse } from '../types';

// הגדרת טיפוס עבור שדות הטופס
type EquipmentFormData = Omit<EquipmentItem, 'id' | 'loanedToUserId'>;

function EquipmentFormPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { equipment, users, warehouses, isLoading, currentUser } = useDatabase();
  const [searchParams] = useSearchParams();

  const isEditMode = !!itemId;

  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    warehouseId: '',
    category: null,
    managerUserId: '',
    status: 'available',
    lastCheckDate: new Date().toISOString().split('T')[0], // ברירת מחדל להיום
    quantity: 1,
    subItems: [],
  });

  // אפקט להגדרת ברירות מחדל (מחסן ומשתמש)
  useEffect(() => {
    if (!isEditMode) {
      const defaultWarehouseId = searchParams.get('warehouseId') || '';
      const defaultManagerId = currentUser?.uid || '';

      if (defaultWarehouseId || defaultManagerId) {
        setFormData(prev => ({
          ...prev,
          warehouseId: prev.warehouseId || defaultWarehouseId,
          managerUserId: prev.managerUserId || defaultManagerId,
        }));
      }
    }
  }, [isEditMode, searchParams, currentUser]);

  // המחסן הנבחר מתוך הרשימה
  const selectedWarehouse: Warehouse | undefined = useMemo(
    () => warehouses.find(w => w.id === formData.warehouseId),
    [warehouses, formData.warehouseId]
  );

  // אפקט למילוי הטופס במצב עריכה
  useEffect(() => {
    if (isEditMode && equipment.length > 0) {
      const itemToEdit = equipment.find(item => item.id === itemId);
      if (itemToEdit) {
        // נמלא את הטופס עם כל השדות הרלוונטיים
        const { id, loanedToUserId, ...editableData } = itemToEdit;
        // ודא שקיים שדה category גם בעריכה ישנה
        setFormData({
          ...editableData,
          category: itemToEdit.category ?? null,
          subItems: itemToEdit.subItems ?? [] // טען רשימה פנימית אם קיימת
        });
      }
    }
  }, [isEditMode, itemId, equipment]);

  // בדיקה שהקטגוריה ששמורה עדיין קיימת במחסן
  useEffect(() => {
    if (!formData.warehouseId) return;

    const warehouse = warehouses.find(w => w.id === formData.warehouseId);
    const warehouseCategories = warehouse?.categories ?? [];

    // אם יש קטגוריה שמורה והיא לא קיימת במחסן → אפס אותה
    if (formData.category && !warehouseCategories.includes(formData.category)) {
      setFormData(prev => ({
        ...prev,
        category: null,
      }));
    }
  }, [warehouses, formData.warehouseId]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;

    // אם המחסן משתנה → ננקה קטגוריה בצורה מבוקרת
    if (id === 'warehouseId') {
      setFormData(prev => ({
        ...prev,
        warehouseId: value,
        category: null, // אפס קטגוריה רק כאן, לא בעריכה הראשונית
      }));
      return;
    }

    let finalValue: any = value;
    if (id === 'quantity') {
      finalValue = Number(value);
    } else if (id === 'category' && value === '') {
      finalValue = null;
    }

    setFormData(prev => ({
      ...prev,
      [id]: finalValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ולידציה בסיסית
    if (!formData.name || !formData.warehouseId || !formData.managerUserId || !formData.lastCheckDate) {
      alert("אנא מלא את כל השדות.");
      return;
    }

    if (isEditMode && itemId) {
      // --- מצב עריכה ---
      const success = await updateEquipmentItem(itemId, formData);
      if (success) {
        // חזור לעמוד המחסן שממנו באנו
        navigate(`/warehouses/${formData.warehouseId}`);
      } else {
        alert("שגיאה בעדכון הפריט.");
      }
    } else {
      // --- מצב הוספה ---
      const newId = await addNewEquipment(formData);
      if (newId) {
        // חזור לרשימת המחסנים
        navigate('/warehouses');
      } else {
        alert("שגיאה בהוספת הפריט.");
      }
    }
  };

  if (isLoading) {
    return <div>טוען נתונים...</div>;
  }

  const title = isEditMode ? 'עריכת פריט' : 'הוסף פריט חדש';
  const categories = selectedWarehouse?.categories ?? []; // רשימת קטגוריות למחסן שנבחר


  return (
    <div>
      <HeaderNav title={title} />
      <div className="container page-content">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">שם הפריט</label>
            <input
              type="text"
              id="name"
              placeholder="לדוגמה: סנסור #104"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity">כמות</label>
            <div className="quantity-selector">
              <button
                type="button"
                className="qty-btn"
                onClick={() => setFormData(p => ({ ...p, quantity: Math.max(1, (Number(p.quantity) || 1) - 1) }))}
              >
                -
              </button>
              <input
                type="number"
                id="quantity"
                className="qty-input"
                value={formData.quantity ?? 1}
                onChange={handleChange}
                min="1"
              />
              <button
                type="button"
                className="qty-btn"
                onClick={() => setFormData(p => ({ ...p, quantity: (Number(p.quantity) || 1) + 1 }))}
              >
                +
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="warehouseId">שייך למחסן</label>
            <select
              id="warehouseId"
              value={formData.warehouseId}
              onChange={handleChange}
              required
            >
              <option value="">בחר מחסן...</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* ⬇️ חדש: בחירת קטגוריה מתוך המחסן (אם קיימות) */}
          {formData.warehouseId && categories.length > 0 && (
            <div className="form-group">
              <label htmlFor="category">קטגוריה במחסן</label>
              <select
                id="category"
                value={formData.category ?? ''}
                onChange={handleChange}
              >
                <option value="">ללא קטגוריה</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <small style={{ color: '#aaa' }}>הקטגוריות מוגדרות במחסן. ערוך אותן במסך המחסן.</small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="managerUserId">אחראי</label>
            <select
              id="managerUserId"
              value={formData.managerUserId}
              onChange={handleChange}
              required
            >
              <option value="">בחר אחראי...</option>
              {users.map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="status">סטטוס התחלתי</label>
            <select
              id="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="available">כשיר</option>
              <option value="charging">בטעינה</option>
              <option value="loaned">בפעילות</option>
              <option value="repair">בתיקון</option>
              <option value="broken">לא כשיר</option>
              <option value="missing">חסר</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="lastCheckDate">תאריך ווידוא אחרון</label>
            <input
              type="date"
              id="lastCheckDate"
              value={formData.lastCheckDate}
              onChange={handleChange}
              required
            />
          </div>

          {/* Internal Equipment List Section */}
          <div className="form-section" style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ fontSize: '1.1em', fontWeight: 'bold' }}>רשימת ציוד פנימית</label>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    subItems: [
                      ...(prev.subItems || []),
                      { id: Math.random().toString(36).substr(2, 9), name: '', status: 'available' }
                    ]
                  }));
                }}
                style={{
                  background: 'var(--action-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
              >
                + הוסף פריט פנימי
              </button>
            </div>

            {(!formData.subItems || formData.subItems.length === 0) ? (
              <p style={{ color: '#aaa', fontSize: '0.9em' }}>אין פריטים ברשימה הפנימית.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {formData.subItems.map((sub, index) => (
                  <div key={sub.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="שם פריט"
                      value={sub.name}
                      onChange={(e) => {
                        const newSubItems = [...(formData.subItems || [])];
                        newSubItems[index] = { ...newSubItems[index], name: e.target.value };
                        setFormData({ ...formData, subItems: newSubItems });
                      }}
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
                      required
                    />
                    <select
                      value={sub.status}
                      onChange={(e) => {
                        const newSubItems = [...(formData.subItems || [])];
                        newSubItems[index] = { ...newSubItems[index], status: e.target.value as any };
                        const derivedStatus = calculateDerivedStatus(newSubItems);
                        setFormData({ ...formData, subItems: newSubItems, status: derivedStatus });
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
                    >
                      <option value="available">כשיר</option>
                      <option value="charging">בטעינה</option>
                      <option value="loaned">בפעילות</option>
                      <option value="repair">בתיקון</option>
                      <option value="broken">לא כשיר</option>
                      <option value="missing">חסר</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`האם אתה בטוח שברצונך להסיר את "${sub.name || 'הפריט'}"?`)) {
                          const newSubItems = formData.subItems?.filter((_, i) => i !== index) || [];
                          const derivedStatus = calculateDerivedStatus(newSubItems);
                          setFormData({ ...formData, subItems: newSubItems, status: derivedStatus });
                        }
                      }}
                      style={{
                        background: 'rgba(255, 69, 58, 0.1)',
                        border: '1px solid rgba(255, 69, 58, 0.4)',
                        color: '#ff453a',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '4px'
                      }}
                      title="הסר פריט פנימי"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="save-bar">
            <button type="submit" className="btn-submit">
              {isEditMode ? 'שמור שינויים' : 'שמור פריט'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EquipmentFormPage;