// src/contexts/DatabaseContext.tsx
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { collection, onSnapshot, doc, setDoc, type DocumentData } from 'firebase/firestore';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { useOffline } from './OfflineContext';
import type { AppUser, Warehouse, EquipmentItem, Activity, Group, Competence, CompetenceRecord, SupportChat } from '../types';

// הגדרת מה ה-Context יספק
interface DatabaseContextState {
  users: AppUser[];
  groups: Group[];
  warehouses: Warehouse[];
  allWarehouses: Warehouse[];
  equipment: EquipmentItem[];
  activities: Activity[];
  allActivities: Activity[];
  competences: Competence[];
  competenceRecords: CompetenceRecord[];
  supportChats: SupportChat[];
  isLoading: boolean;
  currentUser: AppUser | null;
}

// יצירת ה-Context
const DatabaseContext = createContext<DatabaseContextState | undefined>(undefined);

// יצירת ה-"ספק" (Provider)
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [competenceRecords, setRecords] = useState<CompetenceRecord[]>([]);

  // נהפוך את isLoading לאובייקט שעוקב אחרי כל טעינה בנפרד
  const [loadingStates, setLoadingStates] = useState({
    users: true,
    groups: true,
    warehouses: true,
    equipment: true,
    activities: true,
    competences: true,
    competenceRecords: true,
    supportChats: true,
  });

  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);

  // State למשתמש Auth ומשתמש אפליקציה
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // isLoading הכללי יהיה true כל עוד *אחד* מהפריטים עדיין בטעינה
  const isLoading = Object.values(loadingStates).some(state => state === true);

  // הפעלת סימון body.app-offline כדי להשבית כפתורי עריכה ב-CSS
  const { isOffline, updateLastSynced } = useOffline();
  useEffect(() => {
    if (isOffline) {
      document.body.classList.add('app-offline');
    } else {
      document.body.classList.remove('app-offline');
    }
    return () => document.body.classList.remove('app-offline');
  }, [isOffline]);

  // אפקט הסנכרון - מאזין לשינויים ב-Firestore
  useEffect(() => {
    console.log("DatabaseContext: מתחיל האזנה ל-Firebase...");

    const mapSnapshot = <T,>(snapshot: DocumentData): T[] => {
      return snapshot.docs.map((doc: DocumentData) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    };

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = mapSnapshot<AppUser>(snapshot);
      setUsers(usersData);
      setLoadingStates(prev => ({ ...prev, users: false }));
      // Update timestamp only when data comes from server (not from local IndexedDB cache)
      if (!snapshot.metadata.fromCache) updateLastSynced();
    });

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(mapSnapshot<Group>(snapshot));
      setLoadingStates(prev => ({ ...prev, groups: false }));
      if (!snapshot.metadata.fromCache) updateLastSynced();
    });

    const unsubWarehouses = onSnapshot(collection(db, 'warehouses'), (snapshot) => {
      setWarehouses(mapSnapshot<Warehouse>(snapshot));
      setLoadingStates(prev => ({ ...prev, warehouses: false }));
      if (!snapshot.metadata.fromCache) updateLastSynced();
    });

    const unsubEquipment = onSnapshot(collection(db, 'equipment'), (snapshot) => {
      setEquipment(mapSnapshot<EquipmentItem>(snapshot));
      setLoadingStates(prev => ({ ...prev, equipment: false }));
      if (!snapshot.metadata.fromCache) updateLastSynced();
    });

    const unsubActivities = onSnapshot(collection(db, 'activities'), (snapshot) => {
      setActivities(mapSnapshot<Activity>(snapshot));
      setLoadingStates(prev => ({ ...prev, activities: false }));
      if (!snapshot.metadata.fromCache) updateLastSynced();
    });

    const unsubCompetences = onSnapshot(collection(db, 'competences'), (snapshot) => {
      setCompetences(mapSnapshot<Competence>(snapshot));
      setLoadingStates(prev => ({ ...prev, competences: false }));
      if (!snapshot.metadata.fromCache) updateLastSynced();
    });

    const unsubCompetenceRecords = onSnapshot(collection(db, 'competenceRecords'), (snapshot) => {
      setRecords(mapSnapshot<CompetenceRecord>(snapshot));
      setLoadingStates(prev => ({ ...prev, competenceRecords: false }));
      if (!snapshot.metadata.fromCache) updateLastSynced();
    });

    const unsubSupportChats = onSnapshot(collection(db, 'support_chats'), (snapshot) => {
      setSupportChats(mapSnapshot<SupportChat>(snapshot));
      setLoadingStates(prev => ({ ...prev, supportChats: false }));
      if (!snapshot.metadata.fromCache) updateLastSynced();
    });

    // האזנה לשינויי התחברות (Auth)
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user); // שמור את משתמש ה-Auth
    });

    return () => {
      unsubUsers();
      unsubGroups();
      unsubWarehouses();
      unsubEquipment();
      unsubActivities();
      unsubCompetences();
      unsubCompetenceRecords();
      unsubSupportChats();
      unsubAuth();
    };
  }, []); // [] ריק - תריץ רק פעם אחת

  // אפקט חדש ליצירת משתמש
  useEffect(() => {
    // אל תנסה למצוא משתמש עד שרשימת המשתמשים סיימה להיטען
    if (loadingStates.users) return;

    if (authUser && users.length > 0) {
      const appUser = users.find(u => u.uid === authUser.uid);

      if (appUser) {
        setCurrentUser(appUser);
      } else if (navigator.onLine) {
        // Only create a new user document when online.
        // Offline: the user record will either come from IndexedDB cache
        // or will be created the next time they open the app with connectivity.
        console.log("משתמש חדש זוהה! יוצר רשומה ב-Firestore...");

        const newUserData: AppUser = {
          uid: authUser.uid,
          displayName: authUser.displayName || "משתמש חדש",
          email: authUser.email || "",
          approved: false,
          role: 'pending',
          groupIds: []
        };

        const userRef = doc(db, "users", authUser.uid);
        setDoc(userRef, newUserData)
          .then(() => { console.log("משתמש חדש נוצר בהצלחה"); })
          .catch(err => { console.error("שגיאה ביצירת משתמש חדש:", err); });
      }
    } else if (!authUser) {
      setCurrentUser(null);
    }
    // 6. --- התיקון ---
    // הוספנו תלות במצב הטעינה של המשתמשים
  }, [authUser, users, loadingStates.users]);

  // --- לוגיקת סינון לפי קבוצות ---
  const userGroupIds = currentUser?.groupIds || [];
  const isUserAdmin = currentUser?.role === 'admin';

  const filteredWarehouses = useMemo(() => {
    if (isUserAdmin) return warehouses;
    // מחסן לדוגמא (isDemo) גלוי לכולם; שאר המחסנים לפי קבוצות
    return warehouses.filter(w => w.isDemo || (w.groupId && userGroupIds.includes(w.groupId)));
  }, [warehouses, userGroupIds, isUserAdmin]);

  const filteredActivities = useMemo(() => {
    if (isUserAdmin) return activities;
    // רק פעילויות ששייכות לקבוצות של המשתמש
    return activities.filter(a => a.groupId && userGroupIds.includes(a.groupId));
  }, [activities, userGroupIds, isUserAdmin]);

  const filteredEquipment = useMemo(() => {
    if (isUserAdmin) return equipment;
    // פריט ציוד נראה אם המחסן שלו שייך לקבוצה של המשתמש, או שהמחסן הוא לדוגמא
    return equipment.filter(e => {
      const warehouse = warehouses.find(w => w.id === e.warehouseId);
      return warehouse && (warehouse.isDemo || (warehouse.groupId && userGroupIds.includes(warehouse.groupId)));
    });
  }, [equipment, warehouses, userGroupIds, isUserAdmin]);

  // החזרת ה-Provider עם המידע המלא והמסונן
  const value = {
    users,
    groups,
    warehouses: filteredWarehouses,
    allWarehouses: warehouses,
    equipment: filteredEquipment,
    allEquipment: equipment,
    activities: filteredActivities,
    allActivities: activities,
    competences,
    competenceRecords,
    isLoading,
    currentUser,
    supportChats
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

// יצירת Hook מותאם אישית
export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}