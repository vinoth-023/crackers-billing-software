import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { AppUser, UserPermissions } from '../types';

export const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  dashboard: false, billing: true, customers: true, salesHistory: false,
  products: false, purchases: false, reports: false, expenses: false,
  settings: false, users: false, stock: false, suppliers: false,
  canEditRate: false, canGiveDiscount: false, canCancelBill: false,
};

export async function getAuthorizedUser(uid: string): Promise<AppUser | null> {
  let admin;
  try { admin = await getDoc(doc(db, 'admins', uid)); } catch (error) {
    console.warn('Unable to read admin authorization record:', error);
    return null;
  }
  // Bootstrap the configured admin record after Firebase Auth has verified the login.
  // The password is never read or stored here.
  if (!admin.exists() && auth.currentUser?.email === 'admin@kannan.com') {
    await setDoc(doc(db, 'admins', uid), {
      uid, name: 'Kannan Admin', email: auth.currentUser.email, role: 'admin', active: true,
      createdAt: serverTimestamp(),
    }, { merge: true });
    admin = await getDoc(doc(db, 'admins', uid));
  }
  if (admin.exists() && admin.data().active !== false) {
    const d = admin.data();
    return { id: uid, username: d.email || '', fullName: d.name || 'Administrator', role: 'ADMIN', email: d.email, isActive: true,
      permissions: { ...DEFAULT_STAFF_PERMISSIONS, ...Object.fromEntries(Object.keys(DEFAULT_STAFF_PERMISSIONS).map(k => [k, true])) } };
  }
  let staff: any = null;
  try {
    const staffMatches = await getDocs(query(collection(db, 'staff'), where('uid', '==', uid)));
    staff = staffMatches.docs[0] || null;
  } catch (error) {
    console.warn('Unable to read staff authorization record:', error);
    return null;
  }
  if (staff && staff.exists() && staff.data().active !== false) {
    const d = staff.data();
    return { id: uid, username: d.email || '', fullName: d.name || 'Staff', role: 'BILLING_STAFF', email: d.email, isActive: true,
      permissions: { ...DEFAULT_STAFF_PERMISSIONS, ...(d.permissions || {}) }, branchId: d.branchId };
  }
  return null;
}

export async function getCurrentAuthorizedUser() {
  return auth.currentUser ? getAuthorizedUser(auth.currentUser.uid) : null;
}

// Legacy staff records used STFxxx as the document ID. Firestore rules need
// a UID-keyed record to validate branch and permissions for authenticated staff.
export async function migrateLegacyStaffRecords(): Promise<void> {
  if (!auth.currentUser) return;
  const admin = await getDoc(doc(db, 'admins', auth.currentUser.uid));
  if (!admin.exists() && auth.currentUser.email !== 'admin@kannan.com') return;
  const snapshot = await getDocs(collection(db, 'staff'));
  await Promise.all(snapshot.docs.map(async (item) => {
    const data: any = item.data();
    if (data.uid && item.id !== data.uid) {
      await setDoc(doc(db, 'staff', data.uid), { ...data, staffId: data.staffId || item.id }, { merge: true });
    }
  }));
}

export async function initializeBillCounters(): Promise<void> {
  if (!auth.currentUser) return;
  const admin = await getDoc(doc(db, 'admins', auth.currentUser.uid));
  if (!admin.exists() && auth.currentUser.email !== 'admin@kannan.com') return;
  const counterRef = doc(db, 'billingCounters', 'global');
  if ((await getDoc(counterRef)).exists()) return;
  const snapshot = await getDocs(collection(db, 'sales'));
  let maximum = 0;
  snapshot.forEach((item) => {
    const data: any = item.data();
    const match = String(data.billNumber || '').match(/(\d+)$/);
    if (match) maximum = Math.max(maximum, Number(match[1]));
  });
  await setDoc(counterRef, { nextNumber: maximum + 1, updatedAt: new Date().toISOString() }, { merge: true });
}
