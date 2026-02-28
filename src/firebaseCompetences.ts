// src/firebaseCompetences.ts

import { collection, addDoc, updateDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { Competence } from './types';

/**
 * יצירת כשירות חדשה
 */
export const createCompetence = async (data: Omit<Competence, 'id'>) => {
    try {
        const docRef = await addDoc(collection(db, 'competences'), data);
        return docRef.id;
    } catch (error) {
        console.error("Error creating competence:", error);
        return null;
    }
};

/**
 * עדכון פרטי כשירות קיימת
 */
export const updateCompetence = async (id: string, updates: Partial<Competence>) => {
    try {
        const docRef = doc(db, 'competences', id);
        await updateDoc(docRef, updates);
        return true;
    } catch (error) {
        console.error("Error updating competence:", error);
        return false;
    }
};

/**
 * מחיקת כשירות.
 * מוחק גם את הכשירות וגם את כל הרישומים המשויכים אליה (CompetenceRecords).
 */
export const deleteCompetence = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק כשירות זו לחלוטין? פעולה זו אינה הפיכה.')) return false;

    try {
        const batch = writeBatch(db);

        // מחיקת הכשירות עצמה
        const compRef = doc(db, 'competences', id);
        batch.delete(compRef);

        // מחיקת כל הרישומים הקשורים
        const recordsQuery = query(collection(db, 'competenceRecords'), where('competenceId', '==', id));
        const recordsSnap = await getDocs(recordsQuery);

        recordsSnap.forEach(rDoc => {
            batch.delete(doc(db, 'competenceRecords', rDoc.id));
        });

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error deleting competence:", error);
        return false;
    }
};

/**
 * אישור ביצוע כשירות על ידי משתמש.
 * יוצר/מעדכן רישום מתי בוצע ומחשב מתי פג תוקף.
 */
export const markCompetencePerformed = async (
    competenceId: string,
    userId: string,
    groupId: string,
    renewalDays: number
) => {
    try {
        // בדוק אם כבר יש רישום כזה למשתמש ולכשירות הזו
        const recordsQuery = query(
            collection(db, 'competenceRecords'),
            where('competenceId', '==', competenceId),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(recordsQuery);

        const now = new Date();
        const performedStr = now.toISOString();

        const expirationDate = new Date(now);
        expirationDate.setDate(now.getDate() + renewalDays);
        const expirationStr = expirationDate.toISOString();

        const dataRecord = {
            competenceId,
            userId,
            groupId,
            lastPerformedDate: performedStr,
            expirationDate: expirationStr
        };

        if (!snapshot.empty) {
            // עדכון קיים
            const docId = snapshot.docs[0].id;
            await updateDoc(doc(db, 'competenceRecords', docId), dataRecord);
        } else {
            // יצירת חדש
            await addDoc(collection(db, 'competenceRecords'), dataRecord);
        }

        return true;
    } catch (error) {
        console.error("Error marking competence performed:", error);
        return false;
    }
};
