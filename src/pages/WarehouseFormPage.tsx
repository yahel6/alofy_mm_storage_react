// src/pages/WarehouseFormPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HeaderNav from '../components/HeaderNav';
import { useDatabase } from '../contexts/DatabaseContext';
import { addNewWarehouse, updateWarehouse } from '../firebaseUtils';
import type { Warehouse } from '../types';
import '../components/Form.css';

type FormData = {
  name: string;
  /** קלט טקסטואלי עם פסיקים בין קטגוריות: "מטענים, סנסורים, כבלים" */
  categoriesText: string;
  groupId: string;
};

export default function WarehouseFormPage() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const isEdit = Boolean(warehouseId);
  const navigate = useNavigate();

  const { warehouses, groups, isLoading, currentUser } = useDatabase();

  const current: Warehouse | undefined = useMemo(
    () => (isEdit ? warehouses.find(w => w.id === warehouseId) : undefined),
    [isEdit, warehouseId, warehouses]
  );

  const [form, setForm] = useState<FormData>({
    name: '',
    categoriesText: '',
    groupId: '',
  });

  useEffect(() => {
    if (isEdit && current) {
      setForm({
        name: current.name,
        categoriesText: (current.categories ?? []).join(', '),
        groupId: current.groupId || '',
      });
    }
  }, [isEdit, current]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
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
      alert('שם מחסן לא יכול להיות ריק.');
      return;
    }

    if (!form.groupId) {
      alert('חובה לבחור קבוצה למחסן.');
      return;
    }

    if (isEdit && warehouseId) {
      const ok = await updateWarehouse(warehouseId, { name, categories, groupId: form.groupId });
      if (ok) {
        alert('המחסן עודכן בהצלחה');
        navigate(`/warehouses/${warehouseId}`);
      }
    } else {
      const id = await addNewWarehouse({ name, categories, groupId: form.groupId });
      if (id) {
        alert('המחסן נוצר בהצלחה');
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
          <div className="form-group">
            <label htmlFor="groupId">שיוך לקבוצה (חובה)</label>
            <select
              id="groupId"
              value={form.groupId}
              onChange={handleChange}
              required
            >
              <option value="" disabled>בחר קבוצה...</option>
              {groups
                .filter(group => group.members.includes(currentUser?.uid || ''))
                .map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
            </select>
          </div>

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
