
import { db } from './src/firebaseConfig';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

async function cleanupBorrowedItems() {
    console.log("Searching for borrowed items...");
    const q = query(collection(db, 'equipment'), where('status', '==', 'borrowed'));
    const snap = await getDocs(q);

    if (snap.empty) {
        console.log("No borrowed items found.");
        return;
    }

    console.log(`Found ${snap.size} borrowed items. Deleting...`);
    for (const d of snap.docs) {
        const data = d.data();
        console.log(`Deleting item: ${data.name} (ID: ${d.id})`);
        await deleteDoc(doc(db, 'equipment', d.id));
    }
    console.log("Cleanup complete.");
}

cleanupBorrowedItems().catch(console.error);
