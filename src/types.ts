// src/types.ts

// טיפוס משתמש, מבוסס על מה שיצרת ב-java.js
export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  approved: boolean;
  role: string;
}

// טיפוס מחסן
export interface Warehouse {
  id: string;
  name: string;
  /** רשימת קטגוריות שהמחסן תומך בהן (אופציונלי) */
  categories?: string[]; // ["מטענים","סנסורים","כבלים"]
}

// טיפוס פריט ציוד
export interface EquipmentItem {
  id: string;
  name: string;
  warehouseId: string;
  /** קטגוריה בתוך המחסן (אופציונלי) */
  category?: string | null;
  managerUserId: string;
  status: 'available' | 'charging' | 'broken' | 'repair' | 'loaned';
  lastCheckDate: string;
  loanedToUserId: string | null;
  assignedActivityId?: string | null;
  assignedActivityName?: string | null;
  quantity?: number;
  subItems?: SubItem[];
}

export interface SubItem {
  id: string;
  name: string;
  status: 'available' | 'broken' | 'missing' | 'loaned';
}

// טיפוס פעילות
export interface Activity {
  id: string;
  name: string;
  managerUserId: string;
  date: string;
  equipmentRequiredIds: string[];
  equipmentMissingIds: string[];
}