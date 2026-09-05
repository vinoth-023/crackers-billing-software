import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { doc, getFirestore, writeBatch } from 'firebase/firestore';
import { INITIAL_BRANDS, INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../src/data/initialData';

const firebaseConfig = {
  apiKey: 'AIzaSyCdoqHbSO8BFyRfD5Q2MEDv5dXdUjUQV6c',
  authDomain: 'college-136ff.firebaseapp.com',
  databaseURL: 'https://college-136ff.firebaseio.com',
  projectId: 'college-136ff',
  storageBucket: 'college-136ff.appspot.com',
  messagingSenderId: '845526939368',
  appId: '1:845526939368:web:b1d7588cad34c2d8d17b5d',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInAnonymously(auth);

const batch = writeBatch(db);
for (const category of INITIAL_CATEGORIES) {
  batch.set(doc(db, 'categories', category.id), category, { merge: true });
}
for (const brand of INITIAL_BRANDS) {
  batch.set(doc(db, 'brands', brand.id), brand, { merge: true });
}
for (const product of INITIAL_PRODUCTS) {
  batch.set(doc(db, 'products', product.id), product, { merge: true });
}

await batch.commit();
console.log(`Seeded ${INITIAL_CATEGORIES.length} categories, ${INITIAL_BRANDS.length} brands, and ${INITIAL_PRODUCTS.length} products.`);
