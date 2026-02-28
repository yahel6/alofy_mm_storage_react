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
  /** הקבוצה הדומיננטית של המשתמש (תוצג כברירת מחדל במסך כשירויות) */
  dominantGroupId?: string;
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
  groupId: string;
}

export interface EquipmentComment {
  id: string;
  text: string;
  userId: string;
  userName?: string;
  createdAt: string;
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
  imageUrl?: string;
  /** כל כמה ימים צריך לוודא את הציוד (ברירת מחדל 7) */
  validationDays?: number;
  comments?: EquipmentComment[];
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

// טיפוס כשירות (Competence)
export interface Competence {
  id: string;
  groupId: string;
  name: string;
  /** כל כמה ימים צריך לחדש את הכשירות */
  renewalDays: number;
  /** רשימת UIDs של המשתמשים שהכשירות חלה עליהם במסגרת הקבוצה */
  userIds: string[];
  /** הערות או פירוט על הכשירות */
  notes?: string;
  createdAt: string;
}

// רישום ביצוע כשירות (Competence Record) - מתי בפעם האחרונה משתמש ביצע כשירות מסוימת
export interface CompetenceRecord {
  id: string;
  competenceId: string;
  userId: string;
  /** מזהה קבוצה, כדי שקל יהיה למחוק/לשלוף או למיין */
  groupId: string;
  lastPerformedDate: string;
  expirationDate: string; // lastPerformedDate + renewalDays
}
