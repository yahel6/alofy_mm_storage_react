// src/firebaseUtils.ts
import { doc, updateDoc, deleteDoc, addDoc, getDoc, collection, writeBatch, arrayRemove } from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { EquipmentItem, Activity, Warehouse } from './types';

// סוגי הסטטוסים האפשריים
type EquipmentStatus = EquipmentItem['status'];

// --- פונקציות קיימות (ללא שינוי) ---

/**
 * מעדכן סטטוס של פריט ציוד ספציפי ב-Firebase
 */
export const updateEquipmentStatus = async (itemId: string, newStatus: EquipmentStatus) => {
  console.log(`מעדכן סטטוס עבור ${itemId} ל-${newStatus}...`);
  const itemRef = doc(db, 'equipment', itemId);

  const updateData: { status: EquipmentStatus, loanedToUserId?: string | null } = {
    status: newStatus
  };

  if (newStatus !== 'loaned') {
    updateData.loanedToUserId = null;
  }
  // TODO: להוסיף לוגיקה לבחירת משתמש כשהסטטוס הוא 'loaned'

  try {
    await updateDoc(itemRef, updateData);
    console.log("עדכון סטטוס הצליח!");
  } catch (error) {
    console.error("שגיאה בעדכון סטטוס:", error);
    alert("שגיאה בעדכון הסטטוס.");
  }
};

/**
 * מוחק פריט ציוד ספציפי מ-Firebase
 */
export const deleteEquipmentItem = async (itemId: string) => {
  if (!confirm("האם אתה בטוח שברצונך למחוק את הפריט? אין דרך לשחזר פעולה זו.")) {
    return;
  }

  console.log(`מוחק את פריט ${itemId}...`);
  const itemRef = doc(db, 'equipment', itemId);
  try {
    await deleteDoc(itemRef);
    console.log("מחיקה הצליחה!");
    // TODO: להסיר את הפריט מכל הפעילויות
  } catch (error) {
    console.error("שגיאה במחיקת פריט:", error);
    alert("שגיאה במחיקת הפריט.");
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
    const dataToUpdate: any = { ...newData };
    if (newData.status !== 'loaned') {
      dataToUpdate.loanedToUserId = null;
    }

    await updateDoc(itemRef, dataToUpdate);
    console.log(`פריט ענן ${equipmentId} עודכן בהצלחה.`);
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
      loanedToUserId: null // הוספת שדה חסר
    });
    console.log(`פריט חדש ${docRef.id} נוסף לענן.`);
    return docRef.id;
  } catch (error) {
    console.error("שגיאה בהוספת פריט חדש לענן:", error);
  }
};

/**
 * מוסיף פעילות חדשה
 */
export const addNewActivity = async (activityData: Omit<Activity, 'id' | 'equipmentRequiredIds' | 'equipmentMissingIds'>) => {
  try {
    const docRef = await addDoc(collection(db, "activities"), {
      ...activityData,
      equipmentRequiredIds: [], // ברירת מחדל
      equipmentMissingIds: []  // ברירת מחדל
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
  const activityRef = doc(db, "activities", activityId);
  try {
    await updateDoc(activityRef, newData);
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
export const deleteActivity = async (activityId: string, activityName: string) => {
  if (!confirm(`האם אתה בטוח שברצונך למחוק את הפעילות "${activityName}"?`)) {
    return;
  }
  const activityRef = doc(db, "activities", activityId);
  try {
    await deleteDoc(activityRef);
    console.log(`פעילות ${activityId} נמחקה מהענן.`);
  } catch (error) {
    console.error("שגיאה במחיקת פעילות מהענן:", error);
  }
};

/**
 * מעדכן את רשימת הציוד המשויך לפעילות
 */
export const updateActivityEquipment = async (activityId: string, newEquipmentIds: string[], allEquipment: EquipmentItem[]) => {
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
  try {
    await updateDoc(activityRef, {
      equipmentRequiredIds: equipmentRequiredIds,
      equipmentMissingIds: equipmentMissingIds
    });
    console.log(`ציוד פעילות ענן ${activityId} עודכן בהצלחה.`);
  } catch (error) {
    console.error("שגיאה בעדכון ציוד פעילות בענן:", error);
  }
}

/** יצירת מחסן חדש (עם/בלי קטגוריות) */
export const addNewWarehouse = async (data: { name: string; categories?: string[] }) => {
  const name = (data.name ?? '').trim();
  const categories = (data.categories ?? []).map(c => c.trim()).filter(Boolean);
  if (!name) {
    alert('שם מחסן לא יכול להיות ריק.');
    return null;
  }
  try {
    const ref = await addDoc(collection(db, 'warehouses'), {
      name,
      ...(categories.length ? { categories } : {})
    });
    return ref.id;
  } catch (e) {
    console.error('שגיאה בהוספת מחסן:', e);
    alert('אירעה שגיאה בהוספת מחסן');
    return null;
  }
};

/** עדכון מחסן קיים (כולל עדכון קטגוריות) */
export const updateWarehouse = async (warehouseId: string, data: { name: string; categories?: string[] }) => {
  const name = (data.name ?? '').trim();
  const categories = (data.categories ?? []).map(c => c.trim()).filter(Boolean);
  if (!warehouseId) {
    alert('שגיאה: חסר מזהה מחסן.');
    return false;
  }
  if (!name) {
    alert('שם מחסן לא יכול להיות ריק.');
    return false;
  }
  try {
    const ref = doc(db, 'warehouses', warehouseId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      alert('המחסן לא נמצא.');
      return false;
    }
    await updateDoc(ref, {
      name,
      ...(categories ? { categories } : {})
    });
    return true;
  } catch (e) {
    console.error('שגיאה בעדכון מחסן:', e);
    alert('אירעה שגיאה בעדכון מחסן');
    return false;
  }
};

/**
 * מוחק מחסן ואת כל תכולתו
 */
export const deleteWarehouseAndContents = async (warehouse: Warehouse, equipment: EquipmentItem[]) => {
  const confirmation = confirm(
    `האם אתה בטוח שברצונך למחוק את המחסן "${warehouse.name}"?\n\n` +
    `אזהרה: פעולה זו תמחק גם את *כל הפריטים* המשויכים למחסן זה.\n` +
    `אין דרך לשחזר פעולה זו.`
  );

  if (!confirmation) {
    return false;
  }

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
    alert("אירעה שגיאה במחיקה.");
    return false;
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
    alert("שגיאה בביצוע הווידוא.");
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

  try {
    await batch.commit();
    console.log("Check-out הושלם בהצלחה!");
    return true;
  } catch (error) {
    console.error("שגיאה בביצוע Check-out:", error);
    alert("שגיאה בביצוע Check-out.");
    return false;
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

  try {
    await batch.commit();
    console.log("Check-in הושלם בהצלחה!");
    return true;
  } catch (error) {
    console.error("שגיאה בביצוע Check-in:", error);
    alert("שגיאה בביצוע Check-in.");
    return false;
  }
};
export const removeItemFromActivity = async (activityId: string, itemId: string) => {
  console.log(`מסיר את פריט ${itemId} מפעילות ${activityId}`);
  const activityRef = doc(db, 'activities', activityId);

  try {
    await updateDoc(activityRef, {
      // arrayRemove יסיר את ה-ID מהמערך, לא משנה באיזה מהם הוא
      equipmentRequiredIds: arrayRemove(itemId),
      equipmentMissingIds: arrayRemove(itemId)
    });
    console.log("הפריט הוסר בהצלחה מהפעילות!");
    return true;
  } catch (error) {
    console.error("שגיאה בהסרת פריט מפעילות:", error);
    alert("שגיאה בהסרת הפריט.");
    return false;
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
    alert("שגיאה בעדכון הקטגוריות.");
    return false;
  }
};

/**
 * מעדכן את הפרופיל של המשתמש (שם תצוגה)
 */
export const updateUserProfile = async (uid: string, displayName: string) => {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, { displayName });
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
    return true;
  } catch (error) {
    console.error("error bulk status:", error);
    return false;
  }
};

/**
 * העברת פריטים למחסן אחר
 */
export const bulkMoveItemsToWarehouse = async (itemIds: string[], targetWarehouseId: string) => {
  if (!itemIds.length) return false;
  const batch = writeBatch(db);

  itemIds.forEach(id => {
    const ref = doc(db, 'equipment', id);
    batch.update(ref, { warehouseId: targetWarehouseId });
  });

  try {
    await batch.commit();
    console.log("העברת פריטים הושלמה.");
    return true;
  } catch (error) {
    console.error("error bulk move:", error);
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

    // מיזוג ללא כפילויות
    const newSet = new Set([...currentRequired, ...itemIds]);
    const updatedList = Array.from(newSet);

    await updateDoc(activityRef, { equipmentRequiredIds: updatedList });
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
