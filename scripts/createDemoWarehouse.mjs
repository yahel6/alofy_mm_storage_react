// scripts/createDemoWarehouse.mjs
// Run ONCE with: node scripts/createDemoWarehouse.mjs
// This creates the demo warehouse document in Firestore.

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load .env (Vite uses VITE_ prefix)
const env = dotenv.parse(readFileSync('.env'));

const firebaseConfig = {
    apiKey: env.VITE_API_KEY,
    authDomain: env.VITE_AUTH_DOMAIN,
    projectId: env.VITE_PROJECT_ID,
    storageBucket: env.VITE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_MESSAGING_SENDER_ID,
    appId: env.VITE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const demoWarehouse = {
    name: 'מחסן לדוגמא',
    groupId: '',          // no group — visible to all via isDemo flag
    isDemo: true,
    categories: [],
};

const ref = await addDoc(collection(db, 'warehouses'), demoWarehouse);
console.log('✅ מחסן לדוגמא נוצר! ID:', ref.id);
process.exit(0);
