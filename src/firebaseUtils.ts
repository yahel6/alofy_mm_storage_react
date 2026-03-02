import { doc, updateDoc, deleteDoc, addDoc, getDoc, collection, writeBatch, arrayRemove, query, where, getDocs, arrayUnion, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from './firebaseConfig';
import type { EquipmentItem, Activity, Warehouse, Group, AppUser, SimpleEquipmentItem } from './types';

/**
 * Signs out the current user.
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    return false;
  }
};

// סוגי הסטטוסים האפשריים לפריט (לפי סדר עדיפויות חומרה)
export type EquipmentStatus = 'broken' | 'missing' | 'repair' | 'charging' | 'loaned' | 'available' | 'borrowed';
const STATUS_PRIORITY: EquipmentStatus[] = ['broken', 'missing', 'repair', 'charging', 'loaned', 'available', 'borrowed'];

/**
 * מחשב את הסטטוס הנגזר של פריט על פי תתי-הפריטים שלו
 */
export const calculateDerivedStatus = (subItems: any[]): EquipmentStatus => {
  if (!subItems || subItems.length === 0) return 'available';

  let highestPriorityIndex = STATUS_PRIORITY.length - 1;

  subItems.forEach(sub => {
    const priorityIndex = STATUS_PRIORITY.indexOf(sub.status);
    if (priorityIndex !== -1 && priorityIndex < highestPriorityIndex) {
      highestPriorityIndex = priorityIndex;
    }
  });

  return STATUS_PRIORITY[highestPriorityIndex];
};

// --- פונקציות קיימות (ללא שינוי) ---

/**
 * מעדכן סטטוס של פריט ציוד ספציפי ב-Firebase
 */
export const updateEquipmentStatus = async (itemId: string, newStatus: EquipmentStatus, loanedToUserId: string | null = null) => {
  console.log(`מעדכן סטטוס עבור ${itemId} ל-${newStatus}...`);
  const itemRef = doc(db, 'equipment', itemId);

  const updateData: any = {
    status: newStatus,
    lastCheckDate: new Date().toISOString().split('T')[0]
  };

  if (newStatus === 'loaned') {
    updateData.loanedToUserId = loanedToUserId;
  } else {
    updateData.loanedToUserId = null;
  }

  try {
    await updateDoc(itemRef, updateData);
    console.log("עדכון סטטוס הצליח!");
    await checkForMerge(itemId); // Auto-Merge
    return true;
  } catch (error) {
    console.error("שגיאה בעדכון סטטוס:", error);
    return false;
  }
};

/**
 * מעדכן סטטוס של תת-פריט ומחשב מחדש את סטטוס ההורה
 */
export const updateSubItemStatus = async (itemId: string, subItemId: string, newStatus: EquipmentStatus) => {
  const ref = doc(db, 'equipment', itemId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data() as EquipmentItem;
    const subItems = data.subItems || [];
    const updatedSubItems = subItems.map(sub =>
      sub.id === subItemId ? { ...sub, status: newStatus } : sub
    );

    const derivedStatus = calculateDerivedStatus(updatedSubItems);

    await updateDoc(ref, {
      subItems: updatedSubItems,
      status: derivedStatus,
      lastCheckDate: new Date().toISOString().split('T')[0]
    });
    return true;
  } catch (error) {
    console.error("Error updating sub-item status:", error);
    return false;
  }
};

/**
 * מוחק פריט ציוד ספציפי מ-Firebase
 */
export const deleteEquipmentItem = async (itemId: string) => {
  console.log(`מוחק את פריט ${itemId}...`);
  const itemRef = doc(db, 'equipment', itemId);
  try {
    await deleteDoc(itemRef);
    console.log("מחיקה הצליחה!");
    // TODO: להסיר את הפריט מכל הפעילויות
    return true;
  } catch (error) {
    console.error("שגיאה במחיקת פריט:", error);
    throw new Error("שגיאה במחיקת הפריט.");
  }
};

// --- פונקציות חדשות (מתורגמות מ-database.js) ---

/**
 * מעדכן פריט ציוד קיים
 */
export const updateEquipmentItem = async (equipmentId: string, newData: Omit<EquipmentItem, 'id' | 'loanedToUserId'>) => {
  const itemRef = doc(db, 'equipment', equipmentId);
  try {
    // ניצור אובייקט נקי לעדכון
    const dataToUpdate: any = {
      ...newData,
      name: (newData.name || "").trim(),
      category: newData.category || null,
      assignedActivityId: (newData as any).assignedActivityId || null,
      assignedActivityName: (newData as any).assignedActivityName || null
    };

    if (newData.status !== 'loaned') {
      dataToUpdate.loanedToUserId = null;
    }

    await updateDoc(itemRef, dataToUpdate);
    console.log(`פריט ענן ${equipmentId} עודכן בהצלחה.`);

    // Auto-Merge check
    await checkForMerge(equipmentId);

    return true;
  } catch (error) {
    console.error("שגיאה בעדכון פריט בענן:", error);
    return false;
  }
};

/**
 * מוסיף פריט ציוד חדש
 */
export const addNewEquipment = async (itemData: Omit<EquipmentItem, 'id' | 'loanedToUserId'>) => {
  try {
    // addDoc ייצור ID אוטומטי
    const docRef = await addDoc(collection(db, "equipment"), {
      ...itemData,
      name: itemData.name.trim(),
      loanedToUserId: null,
      assignedActivityId: null,
      assignedActivityName: null
    });
    console.log(`פריט חדש ${docRef.id} נוסף לענן.`);

    // Auto-Merge check
    await checkForMerge(docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("שגיאה בהוספת פריט חדש לענן:", error);
  }
};

/**
 * מוסיף פעילות חדשה
 */
export const addNewActivity = async (activityData: Omit<Activity, 'id' | 'equipmentRequiredIds' | 'equipmentMissingIds'>) => {
  if (!activityData.groupId) {
    throw new Error('חובה לבחור קבוצה לפעילות.');
  }
  try {
    const docRef = await addDoc(collection(db, "activities"), {
      ...activityData,
      date: new Date().toISOString(), // Always use current date/time
      equipmentRequiredIds: [],
      equipmentMissingIds: []
    });
    console.log(`פעילות חדשה ${docRef.id} נוספה לענן.`);
    return docRef.id;
  } catch (error) {
    console.error("שגיאה בהוספת פעילות חדשה לענן:", error);
  }
};

/**
 * מעדכן פרטי פעילות קיימת (שם, אחראי, תאריך)
 */
export const updateActivity = async (activityId: string, newData: Partial<Activity>) => {
  if (newData.groupId === "") {
    throw new Error('חובה לבחור קבוצה לפעילות.');
  }
  const activityRef = doc(db, "activities", activityId);
  try {
    const updateData = {
      ...newData,
      date: new Date().toISOString() // Update date on every edit
    };
    await updateDoc(activityRef, updateData);
    console.log(`פעילות ענן ${activityId} עודכנה בהצלחה.`);
    return true;
  } catch (error) {
    console.error("שגיאה בעדכון פעילות בענן:", error);
    return false;
  }
};

/**
 * מוחק פעילות
 */
export const deleteActivity = async (activityId: string) => {
  const activityRef = doc(db, "activities", activityId);
  try {
    const snap = await getDoc(activityRef);
    if (snap.exists()) {
      const data = snap.data();
      const allIds = [...(data.equipmentRequiredIds || []), ...(data.equipmentMissingIds || [])];

      const batch = writeBatch(db);
      allIds.forEach(id => {
        batch.update(doc(db, 'equipment', id), {
          assignedActivityId: null,
          assignedActivityName: null
        });
      });
      batch.delete(activityRef);
      await batch.commit();

      // Check for merge for all items
      for (const id of allIds) {
        await checkForMerge(id);
      }
    } else {
      await deleteDoc(activityRef);
    }
    console.log(`פעילות ${activityId} נמחקה מהענן.`);
  } catch (error) {
    console.error("שגיאה במחיקת פעילות מהענן:", error);
  }
};

/**
 * מעדכן את רשימת הציוד המשויך לפעילות
 */
export const updateActivityEquipment = async (activityId: string, newEquipmentIds: string[], allEquipment: EquipmentItem[], simpleEquipment?: SimpleEquipmentItem[]) => {
  // לוגיקה זהה לקוד הישן
  const equipmentRequiredIds: string[] = [];
  const equipmentMissingIds: string[] = [];

  newEquipmentIds.forEach(itemId => {
    const item = allEquipment.find(eq => eq.id === itemId);
    if (item) {
      if (item.status === 'available' || item.status === 'charging') {
        equipmentRequiredIds.push(item.id);
      } else {
        equipmentMissingIds.push(item.id);
      }
    }
  });

  const activityRef = doc(db, "activities", activityId);
  const activitySnap = await getDoc(activityRef);
  const activityName = activitySnap.exists() ? activitySnap.data().name : '...';

  try {
    const batch = writeBatch(db);

    // 1. Update activity doc
    batch.update(activityRef, {
      equipmentRequiredIds: equipmentRequiredIds,
      equipmentMissingIds: equipmentMissingIds,
      simpleEquipment: simpleEquipment || [],
      date: new Date().toISOString() // Update date
    });

    // 2. Identify removed items to clear their assignment
    const oldRequired = activitySnap.exists() ? activitySnap.data().equipmentRequiredIds || [] : [];
    const oldMissing = activitySnap.exists() ? activitySnap.data().equipmentMissingIds || [] : [];
    const oldIds = [...oldRequired, ...oldMissing];

    const removedIds = oldIds.filter(id => !newEquipmentIds.includes(id));
    const addedIds = newEquipmentIds.filter(id => !oldIds.includes(id));

    removedIds.forEach(id => {
      const ref = doc(db, 'equipment', id);
      batch.update(ref, { assignedActivityId: null, assignedActivityName: null });
    });

    addedIds.forEach(id => {
      const ref = doc(db, 'equipment', id);
      batch.update(ref, { assignedActivityId: activityId, assignedActivityName: activityName });
    });

    await batch.commit();

    // 3. For removed items, check for merge
    for (const id of removedIds) {
      await checkForMerge(id);
    }

    // 4. Commit batch
    await batch.commit();
    console.log(`ציוד פעילות ענן ${activityId} עודכן בהצלחה.`);
  } catch (error) {
    console.error("שגיאה בעדכון ציוד פעילות בענן:", error);
  }
};

/**
 * מעדכן רק את הרשמ"צ הפשוט של הפעילות
 */
export const updateActivitySimpleEquipment = async (activityId: string, simpleItems: SimpleEquipmentItem[]) => {
  const activityRef = doc(db, "activities", activityId);
  try {
    await updateDoc(activityRef, {
      simpleEquipment: simpleItems,
      date: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error updating simple equipment:", error);
    return false;
  }
};

/** יצירת מחסן חדש (עם/בלי קטגוריות) */
export const addNewWarehouse = async (data: { name: string; categories?: string[]; groupId?: string; isDemo?: boolean }) => {
  const name = (data.name ?? '').trim();
  const categories = (data.categories ?? []).map(c => c.trim()).filter(Boolean);
  const groupId = data.groupId;
  const isDemo = data.isDemo || false;

  if (!name) {
    throw new Error('שם מחסן לא יכול להיות ריק.');
  }
  if (!groupId && !isDemo) {
    throw new Error('חובה לבחור קבוצה למחסן.');
  }

  try {
    const ref = await addDoc(collection(db, 'warehouses'), {
      name,
      groupId,
      isDemo,
      ...(categories.length ? { categories } : {})
    });
    return ref.id;
  } catch (e) {
    console.error('שגיאה בהוספת מחסן:', e);
    throw new Error('אירעה שגיאה בהוספת מחסן');
  }
};

/** עדכון מחסן קיים (כולל עדכון קטגוריות) */
export const updateWarehouse = async (warehouseId: string, data: { name: string; categories?: string[]; groupId?: string; isDemo?: boolean }) => {
  const name = (data.name ?? '').trim();
  const categories = (data.categories ?? []).map(c => c.trim()).filter(Boolean);
  const groupId = data.groupId;
  const isDemo = data.isDemo; // Optional to prevent overwriting if not passed

  if (!warehouseId) {
    throw new Error('שגיאה: חסר מזהה מחסן.');
  }
  if (!name) {
    throw new Error('שם מחסן לא יכול להיות ריק.');
  }
  if (!groupId && !isDemo) {
    throw new Error('חובה לבחור קבוצה למחסן.');
  }

  try {
    const ref = doc(db, 'warehouses', warehouseId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('המחסן לא נמצא.');
    }
    await updateDoc(ref, {
      name,
      groupId,
      ...(isDemo !== undefined ? { isDemo } : {}),
      ...(categories ? { categories } : {})
    });
    return true;
  } catch (e) {
    console.error('שגיאה בעדכון מחסן:', e);
    throw new Error('אירעה שגיאה בעדכון מחסן');
  }
};

/**
 * מוחק מחסן ואת כל תכולתו
 */
export const deleteWarehouseAndContents = async (warehouse: Warehouse, equipment: EquipmentItem[]) => {
  console.log(`מתחיל מחיקת מחסן ${warehouse.id} וכל תכולתו...`);

  const itemsToDelete = equipment.filter(item => item.warehouseId === warehouse.id);

  // השתמש ב-Batch Write למחיקה יעילה
  const batch = writeBatch(db);

  try {
    // 1. הוסף את כל הפריטים למחיקה
    itemsToDelete.forEach(item => {
      const itemDocRef = doc(db, "equipment", item.id);
      batch.delete(itemDocRef);
    });

    // 2. הוסף את המחסן עצמו למחיקה
    const warehouseDocRef = doc(db, "warehouses", warehouse.id);
    batch.delete(warehouseDocRef);

    // 3. בצע את כל פעולות המחיקה בבת אחת
    await batch.commit();

    console.log("מחיקה מקומית הושלמה.");
    return true;

  } catch (error) {
    console.error("שגיאה קריטית במחיקת מחסן ותכולתו:", error);
    throw new Error("אירעה שגיאה במחיקה.");
  }
};
export const validateEquipmentItem = async (itemId: string) => {
  console.log(`מבצע ווידוא עבור ${itemId}...`);
  const itemRef = doc(db, 'equipment', itemId);
  const today = new Date().toISOString().split('T')[0]; // פורמט YYYY-MM-DD

  try {
    await updateDoc(itemRef, {
      lastCheckDate: today
    });
    console.log("ווידוא הצליח!");
  } catch (error) {
    console.error("שגיאה בביצוע ווידוא:", error);
    throw new Error("שגיאה בביצוע הווידוא.");
  }
};
// src/firebaseUtils.ts

/**
 * מבצע Check-out לכל הציוד הכשיר המשויך לפעילות.
 * משנה את הסטטוס שלהם ל-'loaned' ומשייך אותם לאחראי הפעילות.
 */
export const checkoutActivityEquipment = async (
  activity: Activity,
  itemsToCheckout: EquipmentItem[]
) => {
  console.log(`מבצע Check-out עבור פעילות: ${activity.name}`);
  const batch = writeBatch(db);
  const managerId = activity.managerUserId; // האחראי על הפעילות

  itemsToCheckout.forEach(item => {
    // רק פריטים כשירים או בטעינה ניתנים ל-check-out
    if (item.status === 'available' || item.status === 'charging') {
      const itemRef = doc(db, 'equipment', item.id);
      batch.update(itemRef, {
        status: 'loaned',
        loanedToUserId: managerId
      });
    }
  });

  // Update activity date
  const activityRef = doc(db, 'activities', activity.id);
  batch.update(activityRef, { date: new Date().toISOString() });

  try {
    await batch.commit();
    console.log("Check-out הושלם בהצלחה!");
    return true;
  } catch (error) {
    console.error("שגיאה בביצוע Check-out:", error);
    throw new Error("שגיאה בביצוע Check-out.");
  }
};

/**
 * מבצע Check-in לכל הציוד ששוייך לפעילות.
 * מחזיר את הסטטוס שלהם ל-'available' ומנקה את שיוך ההשאלה.
 */
export const checkinActivityEquipment = async (
  activity: Activity,
  itemsToCheckin: EquipmentItem[]
) => {
  console.log(`מבצע Check-in עבור פעילות: ${activity.name}`);
  const batch = writeBatch(db);
  const managerId = activity.managerUserId;

  itemsToCheckin.forEach(item => {
    // נבצע Check-in רק לפריטים שבאמת מושאלים לאחראי הפעילות
    if (item.status === 'loaned' && item.loanedToUserId === managerId) {
      const itemRef = doc(db, 'equipment', item.id);
      batch.update(itemRef, {
        status: 'available', // TODO: להוסיף לוגיקה חכמה (למשל, אם זה מטען, להעביר ל'בטעינה')
        loanedToUserId: null
      });
    }
  });

  // Update activity date
  const activityRef = doc(db, 'activities', activity.id);
  batch.update(activityRef, { date: new Date().toISOString() });

  try {
    await batch.commit();
    console.log("Check-in הושלם בהצלחה!");

    // Auto-Merge for all items checked in
    for (const item of itemsToCheckin) {
      await checkForMerge(item.id);
    }

    return true;
  } catch (error) {
    console.error("שגיאה בביצוע Check-in:", error);
    throw new Error("שגיאה בביצוע Check-in.");
  }
};
export const removeItemFromActivity = async (activityId: string, itemId: string) => {
  console.log(`מסיר את פריט ${itemId} מפעילות ${activityId}`);
  const activityRef = doc(db, 'activities', activityId);

  try {
    const batch = writeBatch(db);

    // 1. Remove from activity
    batch.update(activityRef, {
      equipmentRequiredIds: arrayRemove(itemId),
      equipmentMissingIds: arrayRemove(itemId),
      date: new Date().toISOString() // Update date
    });

    // 2. Clear from item
    const itemRef = doc(db, 'equipment', itemId);
    batch.update(itemRef, {
      assignedActivityId: null,
      assignedActivityName: null
    });

    await batch.commit();

    // 3. Check for merge
    await checkForMerge(itemId);

    console.log("הפריט הוסר בהצלחה מהפעילות!");
    return true;
  } catch (error) {
    console.error("שגיאה בהסרת פריט מפעילות:", error);
    throw new Error("שגיאה בהסרת הפריט.");
  }
};

/**
 * מעדכן קטגוריה למספר פריטים במקביל
 */
export const bulkUpdateCategory = async (itemIds: string[], newCategory: string | null) => {
  if (!itemIds.length) return false;

  console.log(`מבצע עדכון קטגוריה ל-${itemIds.length} פריטים...`);
  const batch = writeBatch(db);

  itemIds.forEach(id => {
    const ref = doc(db, 'equipment', id);
    batch.update(ref, { category: newCategory });
  });

  try {
    await batch.commit();
    console.log("עדכון קטגוריה קבוצתי הושלם.");
    return true;
  } catch (error) {
    console.error("שגיאה בעדכון קטגוריה קבוצתי:", error);
    throw new Error("שגיאה בעדכון הקטגוריות.");
  }
};

/**
 * מעדכן את הפרופיל של המשתמש (שם תצוגה, קבוצה דומיננטית וכו')
 */
export const updateUserProfile = async (uid: string, updates: Partial<AppUser>) => {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, updates);
    console.log(`פרופיל משתמש ${uid} עודכן בהצלחה.`);
    return true;
  } catch (error) {
    console.error("שגיאה בעדכון פרופיל משתמש:", error);
    return false;
  }
};

/**
 * ביצוע ווידוא תקינות למספר פריטים
 */
export const bulkValidateItems = async (itemIds: string[]) => {
  if (!itemIds.length) return false;
  const today = new Date().toISOString().split('T')[0];
  const batch = writeBatch(db);

  itemIds.forEach(id => {
    const ref = doc(db, 'equipment', id);
    batch.update(ref, { lastCheckDate: today });
  });

  try {
    await batch.commit();
    console.log("ווידוא קבוצתי הושלם.");
    return true;
  } catch (error) {
    console.error("error bulk validate:", error);
    return false;
  }
};

/**
 * עדכון סטטוס למספר פריטים
 */
export const bulkUpdateStatus = async (itemIds: string[], newStatus: EquipmentStatus) => {
  if (!itemIds.length) return false;
  const batch = writeBatch(db);

  itemIds.forEach(id => {
    const ref = doc(db, 'equipment', id);
    batch.update(ref, { status: newStatus });
  });

  try {
    await batch.commit();
    console.log("עדכון סטטוס קבוצתי הושלם.");
    for (const id of itemIds) {
      await checkForMerge(id);
    }
    return true;
  } catch (error) {
    console.error("error bulk status:", error);
    return false;
  }
};

/**
 * עדכון ימי וידוא נדרשים למספר פריטים
 */
export const bulkUpdateValidationDays = async (itemIds: string[], newValidationDays: number) => {
  if (!itemIds.length) return false;
  const batch = writeBatch(db);

  itemIds.forEach(id => {
    const ref = doc(db, 'equipment', id);
    batch.update(ref, { validationDays: newValidationDays });
  });

  try {
    await batch.commit();
    console.log("עדכון ימי וידוא קבוצתי הושלם.");
    return true;
  } catch (error) {
    console.error("error bulk validation days:", error);
    return false;
  }
};

/**
 * העברת פריטים למחסן אחר
 */

/**
 * העברת פריטים למחסן אחר (כולל מיזוג חכם)
 */
export const bulkMoveItemsToWarehouse = async (itemIds: string[], targetWarehouseId: string) => {
  if (!itemIds.length) return false;

  console.log(`מעביר ${itemIds.length} פריטים למחסן ${targetWarehouseId} (עם מיזוג)...`);

  const batch = writeBatch(db);
  const itemsRef = collection(db, 'equipment');

  try {
    // 1. Fetch all items to be moved
    const movedItemsQuery = await Promise.all(itemIds.map(id => getDoc(doc(db, 'equipment', id))));
    const movedItems = movedItemsQuery.map(snap => ({ id: snap.id, ...snap.data() } as EquipmentItem));

    // 2. Fetch all items in target warehouse (for matching)
    // Optimization: In a real large app, we might query by name, but here we fetch all in target warehouse.
    // Or we can query individually for each moved item?
    // Let's fetch all items in target warehouse to reduce reads if moving many items, 
    // OR just query for existence for each.
    // Given scope, querying for each might be safer if warehouse is huge, but fetching warehouse is easier code.
    // Let's query matching items by Name/Status/Category for each moved item.

    // Actually, to do it efficiently in a batch without reading too much:
    // We can iterate moved items.

    for (const item of movedItems) {
      if (!item) continue;

      // Logic: Only match activity ID if status is 'loaned'
      const normalizedName = (item.name || "").trim();
      const normalizedCategory = item.category || null;

      let q = query(
        itemsRef,
        where('warehouseId', '==', targetWarehouseId),
        where('name', '==', normalizedName),
        where('status', '==', item.status),
        where('category', '==', normalizedCategory),
        where('assignedActivityId', '==', item.assignedActivityId || null)
      );

      const matchSnap = await getDocs(q);

      if (!matchSnap.empty) {
        // Found a match! Merge.
        const targetItemDoc = matchSnap.docs[0];
        const targetItem = targetItemDoc.data();
        const newQuantity = (targetItem.quantity || 1) + (item.quantity || 1);

        batch.update(targetItemDoc.ref, { quantity: newQuantity });
        batch.delete(doc(db, 'equipment', item.id));

        console.log(`פריט ${item.name} מוזג עם פריט קיים ${targetItemDoc.id}`);
      } else {
        // No match. Just move.
        const itemRef = doc(db, 'equipment', item.id);
        batch.update(itemRef, { warehouseId: targetWarehouseId });
      }
    }

    await batch.commit();
    console.log("העברת פריטים הושלמה.");
    return true;
  } catch (error) {
    console.error("error bulk move:", error);
    return false;
  }
};

/**
 * העתקת פריטים למחסן אחר (הפריטים המקוריים נשארים)
 * אם קיים פריט זהה במחסן היעד — ממזג כמויות (לא יוצר כפילות)
 */
export const bulkCopyItemsToWarehouse = async (itemIds: string[], targetWarehouseId: string) => {
  if (!itemIds.length) return false;

  console.log(`מעתיק ${itemIds.length} פריטים למחסן ${targetWarehouseId}...`);

  const batch = writeBatch(db);
  const itemsRef = collection(db, 'equipment');

  try {
    // 1. Fetch all items to copy
    const snaps = await Promise.all(itemIds.map(id => getDoc(doc(db, 'equipment', id))));
    const items = snaps.map(snap => ({ id: snap.id, ...snap.data() } as EquipmentItem));

    for (const item of items) {
      if (!item) continue;

      const normalizedName = (item.name || "").trim();
      const normalizedCategory = item.category || null;

      // Check if identical item already exists in target warehouse (to merge instead of duplicate)
      const q = query(
        itemsRef,
        where('warehouseId', '==', targetWarehouseId),
        where('name', '==', normalizedName),
        where('status', '==', item.status),
        where('category', '==', normalizedCategory),
        where('assignedActivityId', '==', item.assignedActivityId || null)
      );

      const matchSnap = await getDocs(q);

      if (!matchSnap.empty) {
        // Merge quantities with the matching item
        const targetDoc = matchSnap.docs[0];
        const newQuantity = (targetDoc.data().quantity || 1) + (item.quantity || 1);
        batch.update(targetDoc.ref, { quantity: newQuantity });
        console.log(`פריט ${item.name} מוזג עם פריט קיים במחסן היעד.`);
      } else {
        // No match — create a full copy in the target warehouse
        const newItemRef = doc(collection(db, 'equipment'));
        const { id, ...itemData } = item;
        batch.set(newItemRef, {
          ...itemData,
          warehouseId: targetWarehouseId,
          // Reset loaned user since original warehouse owns that relationship
          loanedToUserId: null,
          assignedActivityId: null,
          assignedActivityName: null,
          // Reset manager to none when copying to a new warehouse
          managerUserId: '',
        });
        console.log(`פריט ${item.name} הועתק כפריט חדש.`);
      }
    }

    await batch.commit();
    console.log("העתקת פריטים הושלמה.");
    return true;
  } catch (error) {
    console.error("error bulk copy:", error);
    return false;
  }
};

/**
 * שיוך פריטים לפעילות
 */
export const bulkAssignItemsToActivity = async (itemIds: string[], targetActivityId: string) => {
  if (!itemIds.length) return false;
  const activityRef = doc(db, 'activities', targetActivityId);

  try {
    const snap = await getDoc(activityRef);
    if (!snap.exists()) return false;

    const currentData = snap.data();
    const currentRequired = currentData.equipmentRequiredIds || [];
    const addedIds = itemIds.filter(id => !currentRequired.includes(id));

    // מיזוג ללא כפילויות
    const newSet = new Set([...currentRequired, ...itemIds]);
    const updatedList = Array.from(newSet);

    const batch = writeBatch(db);
    batch.update(activityRef, {
      equipmentRequiredIds: updatedList,
      date: new Date().toISOString() // Update date
    });

    // Update items
    addedIds.forEach(id => {
      batch.update(doc(db, 'equipment', id), {
        assignedActivityId: targetActivityId,
        assignedActivityName: currentData.name
      });
    });

    await batch.commit();
    console.log("שיוך פריטים לפעילות הושלם.");
    return true;
  } catch (error) {
    console.error("error bulk assign activity:", error);
    return false;
  }
};
/**
 * מפצל פריט ציוד.
 * מקטין את הכמות של הפריט המקורי, ויוצר פריט חדש עם הכמות שפוצלה, ושאר הנתונים ששונו.
 * מחזיר את ה-ID של הפריט החדש.
 */
export const splitItem = async (originalItemId: string, splitQuantity: number, newItemData: Partial<EquipmentItem>) => {
  const itemRef = doc(db, 'equipment', originalItemId);

  try {
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) throw new Error("פריט לא נמצא");

    const originalItem = itemSnap.data() as EquipmentItem;
    const currentQuantity = originalItem.quantity || 1;

    // Safety check
    if (splitQuantity >= currentQuantity) {
      console.warn("Split quantity equal or greater than total. Treating as full update (no split).");
      if (splitQuantity === currentQuantity) {
        // Just update the original item
        await updateDoc(itemRef, newItemData);
        return originalItemId;
      }
      return null;
    }

    const batch = writeBatch(db);

    // 1. Update original item quantity
    batch.update(itemRef, { quantity: currentQuantity - splitQuantity });

    // 2. Create new item
    const newItemRef = doc(collection(db, 'equipment'));
    const newItem: any = {
      ...originalItem,
      ...newItemData,
      quantity: splitQuantity,
    };

    // Ensure we don't accidentally copy ID
    delete newItem.id;

    batch.set(newItemRef, newItem);

    await batch.commit();
    console.log("פריט פוצל בהצלחה.");
    return newItemRef.id;
  } catch (error) {
    console.error("שגיאה בפיצול פריט:", error);
    return null;
  }
};

/**
 * מעדכן סטטוס לכמות מסוימת של פריטים מתוך קבוצת פריטים (אוסף מסמכים)
 * מטפל אוטומטית בעדכון מלא או בפיצול לפי הצורך.
 */
export const updateGroupStatusByQuantity = async (
  items: EquipmentItem[],
  quantityToChange: number,
  newStatus: EquipmentStatus
) => {
  console.log(`מעדכן סטטוס ל-${quantityToChange} פריטים מתוך קבוצה ל-${newStatus}...`);
  const batch = writeBatch(db);
  let remaining = quantityToChange;
  const today = new Date().toISOString().split('T')[0];

  for (const item of items) {
    if (remaining <= 0) break;

    const itemRef = doc(db, 'equipment', item.id);
    const itemQty = Number(item.quantity) || 1;

    if (remaining >= itemQty) {
      // עדכון מלא למסמך הזה
      batch.update(itemRef, {
        status: newStatus,
        loanedToUserId: null,
        lastCheckDate: today
      });
      remaining -= itemQty;
    } else {
      // פיצול המסמך הזה
      const newItemRef = doc(collection(db, 'equipment'));

      // הקטנת הכמות במסמך המקורי
      batch.update(itemRef, {
        quantity: itemQty - remaining
      });

      // יצירת מסמך חדש עם הכמות שפוצלה
      const { id, ...itemData } = item;
      const newItem = {
        ...itemData,
        status: newStatus,
        quantity: remaining,
        loanedToUserId: null,
        lastCheckDate: today
      };
      batch.set(newItemRef, newItem);

      remaining = 0;
    }
  }

  try {
    await batch.commit();
    console.log("עדכון קבוצתי לפי כמות הושלם.");
    return true;
  } catch (error) {
    console.error("Error in updateGroupStatusByQuantity:", error);
    return false;
  }
};

/**
 * בודק אם ניתן למזג פריט זה עם פריט זהה (אותו שם, סטטוס, קטגוריה, מחסן)
 * אם כן: ממזג ומוחק את הפריט הנוכחי.
 */
export const checkForMerge = async (itemId: string) => {
  try {
    const itemRef = doc(db, 'equipment', itemId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) return;

    const item = itemSnap.data() as EquipmentItem;

    // Normalize fields for strict matching
    const normalizedName = (item.name || "").trim();
    const normalizedCategory = item.category || null;
    const normalizedActivityId = item.assignedActivityId || null;

    // Query for identical items in the same warehouse
    // STRICT MATCH on Activity ID
    const q = query(
      collection(db, 'equipment'),
      where('warehouseId', '==', item.warehouseId),
      where('name', '==', normalizedName),
      where('status', '==', item.status),
      where('category', '==', normalizedCategory),
      where('assignedActivityId', '==', normalizedActivityId)
    );

    const matchSnap = await getDocs(q);

    // Find a match that is NOT the item itself
    const matchDoc = matchSnap.docs.find(d => d.id !== itemId);

    if (matchDoc) {
      const matchItem = matchDoc.data();
      const matchId = matchDoc.id;

      console.log(`ממזג פריט ${itemId} אל תוך ${matchId}...`);

      const newQuantity = (matchItem.quantity || 1) + (item.quantity || 1);

      const batch = writeBatch(db);

      // Update target
      batch.update(doc(db, 'equipment', matchId), { quantity: newQuantity });

      // Delete source
      batch.delete(itemRef);

      await batch.commit();
      console.log("מיזוג אוטומטי בוצע בהצלחה.");
    }
  } catch (error) {
    console.error("Error in checkForMerge:", error);
  }
};

// --- קבוצות (Groups) ---

/**
 * יוצר קבוצה חדשה
 */
export const createNewGroup = async (groupName: string, ownerId: string) => {
  try {
    const docRef = await addDoc(collection(db, "groups"), {
      name: groupName.trim(),
      ownerId: ownerId,
      members: [ownerId],
      admins: [], // התחלה עם רשימת מנהלים ריקה
      pendingRequests: []
    });

    // עדכון המשתמש עם ה-groupId החדש
    const userRef = doc(db, "users", ownerId);
    await updateDoc(userRef, {
      groupIds: arrayUnion(docRef.id)
    });

    console.log(`קבוצה חדשה ${docRef.id} נוצרה.`);
    return docRef.id;
  } catch (error) {
    console.error("שגיאה ביצירת קבוצה חדשה:", error);
    return null;
  }
};

/**
 * יצירת קבוצה עם הגדרות ראשוניות (חברים, מחסנים, פעילויות)
 */
export const createGroupDetailed = async (
  name: string,
  ownerId: string,
  initialMembers: string[],
  _initialWarehouses: string[] = [], // Kept for signature compatibility but unused
  _initialActivities: string[] = []  // Kept for signature compatibility but unused
) => {
  try {
    const batch = writeBatch(db);

    const groupRef = doc(collection(db, 'groups'));
    const groupId = groupRef.id;
    const members = Array.from(new Set([ownerId, ...initialMembers]));

    batch.set(groupRef, {
      name: name.trim(),
      ownerId,
      members,
      admins: [],
      pendingRequests: []
    });

    for (const userId of members) {
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        groupIds: arrayUnion(groupId)
      });
    }

    await batch.commit();
    return groupId;
  } catch (error) {
    console.error("שגיאה ביצירת קבוצה מפורטת:", error);
    return null;
  }
};

/**
 * מקדם משתמש לדרגת מנהל בקבוצה
 */
export const promoteToAdmin = async (groupId: string, userId: string) => {
  const groupRef = doc(db, "groups", groupId);
  try {
    await updateDoc(groupRef, {
      admins: arrayUnion(userId)
    });
    console.log(`משתמש ${userId} קודם למנהל בקבוצה ${groupId}`);
    return true;
  } catch (error) {
    console.error("שגיאה בקידום למנהל:", error);
    return false;
  }
};

/**
 * מוריד משתמש מדרגת מנהל לחבר רגיל
 */
export const demoteFromAdmin = async (groupId: string, userId: string) => {
  const groupRef = doc(db, "groups", groupId);
  try {
    await updateDoc(groupRef, {
      admins: arrayRemove(userId)
    });
    console.log(`משתמש ${userId} הורד מדרגת מנהל בקבוצה ${groupId}`);
    return true;
  } catch (error) {
    console.error("שגיאה בהורדה מדרגת מנהל:", error);
    return false;
  }
};

/**
 * עדכון פרטי קבוצה
 */
export const updateGroup = async (groupId: string, data: Partial<Group>) => {
  try {
    const ref = doc(db, 'groups', groupId);
    await updateDoc(ref, data);
    return true;
  } catch (error) {
    console.error("שגיאה בעדכון קבוצה:", error);
    return false;
  }
};

/**
 * בקשת הצטרפות לקבוצה
 */
export const requestToJoinGroup = async (groupId: string, userId: string) => {
  try {
    const ref = doc(db, 'groups', groupId);
    const now = new Date().toISOString();

    await updateDoc(ref, {
      pendingRequests: arrayUnion(userId),
      lastRequestTimestamp: now
    });
    return true;
  } catch (error) {
    console.error("שגיאה בבקשת הצטרפות:", error);
    return false;
  }
};

/**
 * מעדכן את הזמן שבו המשתמש ראה את הבקשות בקבוצה מסוימת
 */
export const updateUserSeenRequests = async (userId: string, groupId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const now = new Date().toISOString();

    await updateDoc(userRef, {
      [`lastSeenRequests.${groupId}`]: now
    });
    return true;
  } catch (error) {
    console.error("שגיאה בעדכון זמן צפייה בבקשות:", error);
    return false;
  }
};

/**
 * אישור בקשת הצטרפות
 */
export const approveJoinRequest = async (groupId: string, userId: string) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const userRef = doc(db, 'users', userId);

    const batch = writeBatch(db);
    batch.update(groupRef, {
      pendingRequests: arrayRemove(userId),
      members: arrayUnion(userId)
    });
    batch.update(userRef, {
      groupIds: arrayUnion(groupId)
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("שגיאה באישור בקשה:", error);
    return false;
  }
};

/**
 * דחיית בקשת הצטרפות
 */
export const rejectJoinRequest = async (groupId: string, userId: string) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      pendingRequests: arrayRemove(userId)
    });
    return true;
  } catch (error) {
    console.error("שגיאה בדחיית בקשה:", error);
    return false;
  }
};

/**
 * הוספת חבר לקבוצה ישירות (ללא תהליך אישור)
 */
export const addMemberToGroup = async (groupId: string, userId: string) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const userRef = doc(db, 'users', userId);

    const batch = writeBatch(db);
    batch.update(groupRef, {
      members: arrayUnion(userId),
      pendingRequests: arrayRemove(userId)
    });
    batch.update(userRef, {
      groupIds: arrayUnion(groupId)
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("שגיאה בהוספת חבר לקבוצה:", error);
    return false;
  }
};

/**
 * הוספת מספר חברים לקבוצה יחד
 */
export const addMembersToGroup = async (groupId: string, userIds: string[]) => {
  if (!userIds || userIds.length === 0) return true;

  try {
    const groupRef = doc(db, 'groups', groupId);
    const batch = writeBatch(db);

    batch.update(groupRef, {
      members: arrayUnion(...userIds),
      pendingRequests: arrayRemove(...userIds)
    });

    for (const uId of userIds) {
      const userRef = doc(db, 'users', uId);
      batch.update(userRef, {
        groupIds: arrayUnion(groupId)
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error("שגיאה בהוספת חברים לקבוצה:", error);
    return false;
  }
};

/**
 * הסרת חבר מקבוצה
 */
export const removeMemberFromGroup = async (groupId: string, userId: string) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return false;

    const group = groupSnap.data() as Group;
    if (group.ownerId === userId) {
      throw new Error("לא ניתן להסיר את בעל הקבוצה.");
    }

    const batch = writeBatch(db);
    batch.update(groupRef, {
      members: arrayRemove(userId),
      admins: arrayRemove(userId)
    });

    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      groupIds: arrayRemove(groupId)
    });

    await batch.commit();
    console.log(`משתמש ${userId} הוסר מהקבוצה ${groupId}`);
    return true;
  } catch (error) {
    console.error("שגיאה בהסרת חבר:", error);
    return false;
  }
};

/**
 * שיוך ישות (מחסן/פעילות) לקבוצה
 */
export const associateEntityWithGroup = async (entityType: 'warehouses' | 'activities', entityId: string, groupId: string | null) => {
  try {
    const ref = doc(db, entityType, entityId);
    await updateDoc(ref, { groupId });
    return true;
  } catch (error) {
    console.error(`שגיאה בשיוך ${entityType} לקבוצה:`, error);
    return false;
  }
};

/**
 * מחיקת קבוצה (ניקוי חברים וישויות קשורות)
 */
export const deleteGroup = async (groupId: string) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) return false;

    const group = snap.data() as Group;
    const batch = writeBatch(db);

    // 1. הסרת הקבוצה מהמשתמשים
    group.members.forEach(userId => {
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        groupIds: arrayRemove(groupId)
      });
    });

    // 2. ניתוק מחסנים
    const warehousesRef = collection(db, 'warehouses');
    const wSnap = await getDocs(query(warehousesRef, where('groupId', '==', groupId)));
    wSnap.forEach(d => {
      batch.update(d.ref, { groupId: null });
    });

    // 3. ניתוק פעילויות
    const activitiesRef = collection(db, 'activities');
    const aSnap = await getDocs(query(activitiesRef, where('groupId', '==', groupId)));
    aSnap.forEach(d => {
      batch.update(d.ref, { groupId: null });
    });

    // 4. מחיקת הקבוצה עצמה
    batch.delete(groupRef);

    await batch.commit();
    return true;
  } catch (error) {
    console.error("שגיאה במחיקת קבוצה:", error);
    return false;
  }
};

// --- Comments & Internal Equipment Actions ---

/**
 * הוספת הערה לפריט ציוד
 */
export const addEquipmentComment = async (itemId: string, text: string, userId: string, userName?: string) => {
  const itemRef = doc(db, 'equipment', itemId);
  try {
    const newComment = {
      id: crypto.randomUUID(),
      text,
      userId,
      userName: userName || 'משתמש',
      createdAt: new Date().toISOString()
    };
    await updateDoc(itemRef, {
      comments: arrayUnion(newComment)
    });
    return true;
  } catch (error) {
    console.error("שגיאה בהוספת הערה:", error);
    return false;
  }
};

/**
 * מחיקת הערה מפריט ציוד
 */
export const deleteEquipmentComment = async (itemId: string, commentId: string) => {
  const itemRef = doc(db, 'equipment', itemId);
  try {
    const snap = await getDoc(itemRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    const comments = data.comments || [];
    const updatedComments = comments.filter((c: any) => c.id !== commentId);

    await updateDoc(itemRef, { comments: updatedComments });
    return true;
  } catch (error) {
    console.error("שגיאה במחיקת הערה:", error);
    return false;
  }
};

/**
 * הוספת תת-פריט (רשמ"צ יחיד) לפריט ציוד
 */
export const addInternalEquipment = async (itemId: string, subItemName: string) => {
  if (!subItemName.trim()) return false;
  const itemRef = doc(db, 'equipment', itemId);

  try {
    const newSubItem = {
      id: crypto.randomUUID(),
      name: subItemName.trim(),
      status: 'available' as EquipmentStatus
    };

    // Using arrayUnion directly might skip checking derivedStatus automatically, 
    // but a newly added 'available' item won't degrade the status.
    await updateDoc(itemRef, {
      subItems: arrayUnion(newSubItem)
    });
    return true;
  } catch (error) {
    console.error("שגיאה בהוספת סעיף רשמצ:", error);
    return false;
  }
};

/**
 * מחיקת תת-פריט מתוך ציוד קיים ומחושב מחדש
 */
export const removeInternalEquipment = async (itemId: string, subItemId: string) => {
  const ref = doc(db, 'equipment', itemId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data() as EquipmentItem;
    const subItems = data.subItems || [];
    const updatedSubItems = subItems.filter(sub => sub.id !== subItemId);

    const derivedStatus = calculateDerivedStatus(updatedSubItems);

    await updateDoc(ref, {
      subItems: updatedSubItems,
      status: derivedStatus,
      lastCheckDate: new Date().toISOString().split('T')[0]
    });
    return true;
  } catch (error) {
    console.error("שגיאה במחיקת תת-פריט:", error);
    return false;
  }
};

/**
 * Sends a message in the support chat.
 */
export const sendSupportMessage = async (userId: string, userName: string, text: string, senderRole: 'user' | 'admin') => {
  const chatRef = doc(db, 'support_chats', userId);
  const timestamp = new Date().toISOString();

  const newMessage = {
    senderId: senderRole === 'admin' ? 'admin' : userId,
    text: text.trim(),
    timestamp
  };

  try {
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
      // Create new chat
      await setDoc(chatRef, {
        id: userId,
        userId,
        userName,
        messages: [newMessage],
        lastMessageTimestamp: timestamp,
        hasUnreadAdmin: senderRole === 'user',
        hasUnreadUser: senderRole === 'admin'
      });
    } else {
      // Update existing chat
      await updateDoc(chatRef, {
        messages: arrayUnion(newMessage),
        lastMessageTimestamp: timestamp,
        hasUnreadAdmin: senderRole === 'user' ? true : snap.data().hasUnreadAdmin,
        hasUnreadUser: senderRole === 'admin' ? true : snap.data().hasUnreadUser,
        userName // Update name in case it changed
      });
    }
    return true;
  } catch (error) {
    console.error("Error sending support message:", error);
    return false;
  }
};

/**
 * Marks a support chat as read by the specified role.
 */
export const markSupportRead = async (userId: string, role: 'user' | 'admin') => {
  const chatRef = doc(db, 'support_chats', userId);
  try {
    await updateDoc(chatRef, {
      [role === 'admin' ? 'hasUnreadAdmin' : 'hasUnreadUser']: false
    });
    return true;
  } catch (error) {
    console.error("Error marking support read:", error);
    return false;
  }
};

/**
 * Initiates a loan request for multiple items.
 * Sets the items to 'pending_borrow' status.
 */
export const bulkLoanItems = async (itemIds: string[], originGroupId: string, originWarehouseId: string, targetGroupId: string, targetWarehouseId: string) => {
  const batch = writeBatch(db);
  const timestamp = new Date().toISOString();

  itemIds.forEach(id => {
    const ref = doc(db, 'equipment', id);
    batch.update(ref, {
      loanInfo: {
        originGroupId,
        originWarehouseId,
        targetGroupId,
        targetWarehouseId,
        status: 'pending_borrow'
      },
      lastCheckDate: timestamp.split('T')[0]
    });
  });

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error initiating bulk loan:", error);
    return false;
  }
};

/**
 * Approves an incoming loan request.
 * Moves items to the target warehouse and sets status to 'borrowed'.
 */
export const approveLoan = async (itemIds: string[], targetWarehouseId: string) => {
  const batch = writeBatch(db);
  const timestamp = new Date().toISOString();

  itemIds.forEach(id => {
    const ref = doc(db, 'equipment', id);
    batch.update(ref, {
      warehouseId: targetWarehouseId,
      status: 'borrowed',
      'loanInfo.status': 'active',
      lastCheckDate: timestamp.split('T')[0]
    });
  });

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error approving loan:", error);
    return false;
  }
};

/**
 * Initiates the return of borrowed items.
 * Sets loan status to 'pending_return'.
 */
export const initiateLoanReturn = async (itemIds: string[]) => {
  const batch = writeBatch(db);
  itemIds.forEach(id => {
    const ref = doc(db, 'equipment', id);
    batch.update(ref, {
      'loanInfo.status': 'pending_return'
    });
  });

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error initiating loan return:", error);
    return false;
  }
};

/**
 * Approves the return of items to their original warehouse.
 */
export const approveLoanReturn = async (items: EquipmentItem[]) => {
  const batch = writeBatch(db);
  const timestamp = new Date().toISOString();

  items.forEach(item => {
    if (!item.loanInfo) return;
    const ref = doc(db, 'equipment', item.id);
    batch.update(ref, {
      warehouseId: item.loanInfo.originWarehouseId,
      status: 'available', // Restore to available
      loanInfo: null, // Clear loan info
      lastCheckDate: timestamp.split('T')[0]
    });
  });

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error approving loan return:", error);
    return false;
  }
};
