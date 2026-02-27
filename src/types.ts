// src/types.ts

// טיפוס משתמש, מבוסס על מה שיצרת ב-java.js
export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  approved: boolean;
  role: string;
  /** רשימת מזהי קבוצות שהמשתמש חבר בהן */
  groupIds?: string[];
  /** מפה של מזהה קבוצה -> זמן אחרון שבו המשתמש ראה את בקשות ההצטרפות */
  lastSeenRequests?: { [groupId: string]: string };
}

// טיפוס קבוצה
export interface Group {
  id: string;
  name: string;
  /** ה-UID של המשתמש שפתח את הקבוצה */
  ownerId: string;
  /** רשימת ה-UIDs של חברי הקבוצה */
  members: string[];
  /** רשימת ה-UIDs של מנהלי הקבוצה (יכולים לנהל חברים) */
  admins?: string[];
  /** זמן הבקשה האחרונה לקבוצה */
  lastRequestTimestamp?: string;
  /** רשימת בקשות הצטרפות (ממתינות לאישור) */
  pendingRequests: string[];
}

// טיפוס מחסן
export interface Warehouse {
  id: string;
  name: string;
  /** רשימת קטגוריות שהמחסן תומך בהן (אופציונלי) */
  categories?: string[];
  /** מזהה הקבוצה אליה המחסן משוייך (אופציונלי) */
  groupId?: string;
}

// סוגי הסטטוסים האפשריים לפריט
export type EquipmentStatus = 'available' | 'charging' | 'broken' | 'repair' | 'loaned' | 'missing';

// טיפוס פריט ציוד
export interface EquipmentItem {
  id: string;
  name: string;
  warehouseId: string;
  /** קטגוריה בתוך המחסן (אופציונלי) */
  category?: string | null;
  managerUserId: string;
  status: EquipmentStatus;
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
  status: EquipmentStatus;
}

// טיפוס פעילות
export interface Activity {
  id: string;
  name: string;
  managerUserId: string;
  date: string;
  equipmentRequiredIds: string[];
  equipmentMissingIds: string[];
  /** מזהה הקבוצה אליה הפעילות משוייכת (אופציונלי) */
  groupId?: string;
}