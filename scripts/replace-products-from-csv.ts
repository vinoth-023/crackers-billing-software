import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from 'firebase/firestore';

const csvPath = process.argv[2] || 'C:/Users/madur/Downloads/products.csv';
const email = process.env.FIREBASE_ADMIN_EMAIL;
const password = process.env.FIREBASE_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error('Set FIREBASE_ADMIN_EMAIL and FIREBASE_ADMIN_PASSWORD before running the import.');
}

const env = (name: string, fallback = '') => process.env[name] || fallback;
const firebaseConfig = {
  apiKey: env('VITE_FIREBASE_API_KEY'),
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: env('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('VITE_FIREBASE_APP_ID'),
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
await signInWithEmailAndPassword(auth, email, password);

const source = fs.readFileSync(path.resolve(csvPath), 'utf8');
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { values.push(value); value = ''; continue; }
    value += char;
  }
  values.push(value);
  return values;
}
const csvLines = source.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(csvLines[0]);
const rows = csvLines.slice(1).map((line) => Object.fromEntries(
  parseCsvLine(line).map((value, index) => [headers[index], value]),
));
const codeCounts = new Map<string, number>();

const products = rows.map((row) => {
  const code = String(row.product_code || '').trim();
  const occurrence = (codeCounts.get(code) || 0) + 1;
  codeCounts.set(code, occurrence);
  const barcode = occurrence === 1 ? code : `${code}-${occurrence}`;
  const now = new Date().toISOString();
  const stock = Number(row.product_stock) || 0;
  const sellRate = Number(row.product_sell_price) || 0;

  return {
    id: `csv-${String(row.product_id).trim()}`,
    name: String(row.product_name || '').trim(),
    tamilName: '',
    searchAliases: [],
    isDiscountable: true,
    shortName: String(row.product_name || '').trim().slice(0, 40),
    barcode,
    categoryId: `csv-category-${String(row.product_category_id || 'uncategorized').trim()}`,
    categoryName: 'Imported Products',
    brandName: '',
    subCategory: '',
    brandId: 'brand-imported',
    unit: 'PCS',
    packingType: '1 Piece',
    piecesPerPack: 1,
    purchaseRate: sellRate,
    sellingRate: sellRate,
    mrp: sellRate,
    wholesaleRate: sellRate,
    minimumSellingRate: sellRate,
    openingStock: stock,
    currentStock: stock,
    minimumStockLevel: 0,
    rackLocation: '',
    productImage: String(row.product_image || '').trim(),
    description: String(row.product_description || '').trim(),
    isActive: true,
    createdAt: now,
    updatedAt: now,
    sourceProductId: String(row.product_id || '').trim(),
    sourceCategoryId: String(row.product_category_id || '').trim(),
    sourceSupplierId: String(row.product_supplier_id || '').trim(),
    tax: Number(row.tax) || 0,
  };
});

const existing = await getDocs(collection(db, 'products'));
for (let i = 0; i < existing.docs.length; i += 450) {
  const batch = writeBatch(db);
  existing.docs.slice(i, i + 450).forEach((item) => batch.delete(item.ref));
  await batch.commit();
}

const categoryBatch = writeBatch(db);
categoryBatch.set(doc(db, 'categories', 'csv-category-26'), {
  id: 'csv-category-26', name: 'Imported Products', isActive: true, sortOrder: 1,
  createdAt: new Date().toISOString(),
}, { merge: true });
categoryBatch.set(doc(db, 'brands', 'brand-imported'), {
  id: 'brand-imported', name: 'Imported Brand', isActive: true,
  createdAt: new Date().toISOString(),
}, { merge: true });
await categoryBatch.commit();

for (let i = 0; i < products.length; i += 450) {
  const batch = writeBatch(db);
  products.slice(i, i + 450).forEach((product) => batch.set(doc(db, 'products', product.id), product));
  await batch.commit();
}

const duplicates = [...codeCounts.entries()].filter(([, count]) => count > 1);
console.log(JSON.stringify({ removed: existing.size, imported: products.length, duplicateCodesSuffixed: duplicates }, null, 2));
