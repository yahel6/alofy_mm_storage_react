// src/pages/WarehouseFormPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HeaderNav from '../components/HeaderNav';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { useDialog } from '../contexts/DialogContext';
import { addNewWarehouse, updateWarehouse } from '../firebaseUtils';
import type { Warehouse } from '../types';
import CustomSelect from '../components/CustomSelect';
import '../components/Form.css';

type FormData = {
  name: string;
  /** קלט טקסטואלי עם פסיקים בין קטגוריות: "מטענים, סנסורים, כבלים" */
  categoriesText: string;
  groupId: string;
  isDemo: boolean;
};

export default function WarehouseFormPage() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const isEdit = Boolean(warehouseId);
  const navigate = useNavigate();
  const { isOffline } = useOffline();
  const { showAlert } = useDialog();
  useEffect(() => { if (isOffline) navigate(-1); }, [isOffline, navigate]);

  const { warehouses, groups, isLoading, currentUser } = useDatabase();

  const current: Warehouse | undefined = useMemo(
    () => (isEdit ? warehouses.find(w => w.id === warehouseId) : undefined),
    [isEdit, warehouseId, warehouses]
  );

  const [form, setForm] = useState<FormData>({
    name: '',
    categoriesText: '',
    groupId: '',
    isDemo: false,
  });

  useEffect(() => {
    if (isEdit && current) {
      setForm({
        name: current.name,
        categoriesText: (current.categories ?? []).join(', '),
        groupId: current.groupId || '',
        isDemo: current.isDemo || false,
      });
    }
  }, [isEdit, current]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({ ...prev, [id]: checked }));
    } else {
      setForm(prev => ({ ...prev, [id]: value }));
    }
  };

  const toCategoriesArray = (text: string) =>
    text
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const categories = toCategoriesArray(form.categoriesText);

    if (!name) {
      await showAlert('שם מחסן לא יכול להיות ריק.', 'שגיאה');
      return;
    }

    if (!form.groupId && !form.isDemo) {
      await showAlert('חובה לבחור קבוצה למחסן.', 'שגיאה');
      return;
    }

    if (isEdit && warehouseId) {
      const ok = await updateWarehouse(warehouseId, { name, categories, groupId: form.groupId, isDemo: form.isDemo });
      if (ok) {
        await showAlert('המחסן עודכן בהצלחה');
        navigate(`/warehouses/${warehouseId}`);
      }
    } else {
      const id = await addNewWarehouse({ name, categories, groupId: form.groupId, isDemo: form.isDemo });
      if (id) {
        await showAlert('המחסן נוצר בהצלחה');
        navigate(`/warehouses/${id}`);
      }
    }
  };

  const title = isEdit ? 'עריכת מחסן' : 'הוספת מחסן חדש';

  if (isEdit && isLoading) {
    return <div>טוען...</div>;
  }

  return (
    <div>
      <HeaderNav title={title} />
      <div className="container page-content">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">שם המחסן</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="לדוגמה: מחסן צפון"
              required
            />
          </div>
          {!form.isDemo && (
            <div className="form-group">
              <label htmlFor="groupId">שיוך לקבוצה (חובה)</label>
              <CustomSelect
                value={form.groupId}
                onChange={(val) => setForm(prev => ({ ...prev, groupId: val }))}
                options={groups
                  .filter(group => group.members.includes(currentUser?.uid || ''))
                  .map(group => ({ value: group.id, label: group.name }))}
                placeholder="בחר קבוצה..."
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="categoriesText">
              קטגוריות (אופציונלי) — כתוב פסיקים בין קטגוריות
            </label>
            <input
              id="categoriesText"
              type="text"
              value={form.categoriesText}
              onChange={handleChange}
              placeholder="לדוגמה: מטענים, סנסורים, כבלים"
            />
          </div>

          {currentUser?.role === 'admin' && (
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
              <input
                id="isDemo"
                type="checkbox"
                checked={form.isDemo}
                onChange={handleChange}
                style={{ width: '20px', height: '20px' }}
              />
              <label htmlFor="isDemo" style={{ marginBottom: 0 }}>
                מחסן לדוגמא (גלוי לכלל המשתמשים באפליקציה, ניתן להעתקה בלבד)
              </label>
            </div>
          )}

          <div className="save-bar">
            <button type="submit" className="btn-submit">
              {isEdit ? 'שמור שינויים' : 'שמור מחסן'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
