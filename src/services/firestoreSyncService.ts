import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { StorageService } from './storageService';
import {
  Product,
  Category,
  Brand,
  Unit,
  Customer,
  Supplier,
  Sale,
  Purchase,
  Expense,
  DayClosing,
  StockMovement,
  ShopProfile,
  ShopSettings,
  HeldBill,
  BillingConfig,
} from '../types';

export type SyncStatus = 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'ERROR';

export interface FirebaseStats {
  productsCount: number;
  customersCount: number;
  salesCount: number;
  purchasesCount: number;
  suppliersCount: number;
  lastSyncTime: string;
  status: SyncStatus;
  errorMessage?: string;
}

class FirestoreSyncManager {
  private status: SyncStatus = 'OFFLINE';
  private lastSyncTime: string = 'Never';
  private errorMessage: string = '';
  private listeners: (() => void)[] = [];
  private statsChangeCallbacks: ((stats: FirebaseStats) => void)[] = [];
  private isInitialized: boolean = false;

  public getStats(): FirebaseStats {
    const products = StorageService.getProducts();
    const customers = StorageService.getCustomers();
    const sales = StorageService.getSales();
    const purchases = StorageService.getPurchases();
    const suppliers = StorageService.getSuppliers();

    return {
      productsCount: products.length,
      customersCount: customers.length,
      salesCount: sales.length,
      purchasesCount: purchases.length,
      suppliersCount: suppliers.length,
      lastSyncTime: this.lastSyncTime,
      status: this.status,
      errorMessage: this.errorMessage,
    };
  }

  public onStatsChange(cb: (stats: FirebaseStats) => void): () => void {
    this.statsChangeCallbacks.push(cb);
    cb(this.getStats());
    return () => {
      this.statsChangeCallbacks = this.statsChangeCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyStats() {
    const stats = this.getStats();
    this.statsChangeCallbacks.forEach((cb) => {
      try {
        cb(stats);
      } catch (err) {
        console.error('Stats callback error', err);
      }
    });
  }

  public async initSync(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      this.status = 'SYNCING';
      this.notifyStats();

      // Check if products exist in Firestore
      const productsRef = collection(db, 'products');
      const prodSnapshot = await getDocs(productsRef);

      if (prodSnapshot.empty) {
        console.log('Firebase products collection is empty. Seeding initial products & inventory to Firestore...');
        await this.pushAllToFirestore();
      } else {
        await this.seedMissingInitialProducts(prodSnapshot);
        console.log(`Found ${prodSnapshot.size} existing products in Firestore. Loading latest cloud data...`);
        await this.pullAllFromFirestore();
      }

      // Attach real-time listeners
      this.setupRealtimeListeners();

      this.status = 'CONNECTED';
      this.lastSyncTime = new Date().toLocaleTimeString();
      this.errorMessage = '';
      this.notifyStats();
    } catch (err: any) {
      console.warn('Firestore initial sync note (running with cached local fallback):', err);
      this.status = 'ERROR';
      this.errorMessage = err?.message || 'Firebase connection error';
      this.notifyStats();
    }
  }

  /** Add only catalog items from initialData.ts that are not in Firestore. */
  private async seedMissingInitialProducts(
    snapshot: Awaited<ReturnType<typeof getDocs>>
  ): Promise<void> {
    const existingIds = new Set(snapshot.docs.map((item) => item.id));
    const missingProducts = INITIAL_PRODUCTS.filter((product) => !existingIds.has(product.id));

    if (missingProducts.length === 0) return;

    const batch = writeBatch(db);
    for (const product of missingProducts) {
      batch.set(doc(db, 'products', product.id), product, { merge: true });
    }
    await batch.commit();
    console.log(`Seeded ${missingProducts.length} missing products from initialData.ts to Firestore.`);
  }

  private setupRealtimeListeners() {
    // Clean old listeners
    this.listeners.forEach((unsub) => unsub());
    this.listeners = [];

    try {
      // 1. Products listener
      const unsubProducts = onSnapshot(
        collection(db, 'products'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Product[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Product);
            });
            if (list.length > 0) {
              StorageService.setDirectProducts(list);
            }
          }
          this.status = 'CONNECTED';
          this.lastSyncTime = new Date().toLocaleTimeString();
          this.notifyStats();
        },
        (err) => {
          console.warn('Firestore products stream error:', err);
        }
      );
      this.listeners.push(unsubProducts);

      // 2. Customers listener
      const unsubCustomers = onSnapshot(
        collection(db, 'customers'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Customer[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Customer);
            });
            if (list.length > 0) {
              StorageService.setDirectCustomers(list);
            }
          }
          this.notifyStats();
        },
        (err) => console.warn('Firestore customers stream error:', err)
      );
      this.listeners.push(unsubCustomers);

      // 3. Sales listener
      const unsubSales = onSnapshot(
        collection(db, 'sales'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Sale[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Sale);
            });
            if (list.length > 0) {
              StorageService.setDirectSales(list);
            }
          }
          this.notifyStats();
        },
        (err) => console.warn('Firestore sales stream error:', err)
      );
      this.listeners.push(unsubSales);
    } catch (err) {
      console.warn('Failed to setup some Firestore listeners:', err);
    }
  }

  // Push all local data to Firestore
  public async pushAllToFirestore(): Promise<{ success: boolean; message: string }> {
    try {
      this.status = 'SYNCING';
      this.notifyStats();

      const batch = writeBatch(db);

      // Products
      const products = StorageService.getProducts();
      for (const p of products) {
        const ref = doc(db, 'products', p.id);
        batch.set(ref, p, { merge: true });
      }

      // Categories
      const categories = StorageService.getCategories();
      for (const c of categories) {
        const ref = doc(db, 'categories', c.id);
        batch.set(ref, c, { merge: true });
      }

      // Brands
      const brands = StorageService.getBrands();
      for (const b of brands) {
        const ref = doc(db, 'brands', b.id);
        batch.set(ref, b, { merge: true });
      }

      // Customers
      const customers = StorageService.getCustomers();
      for (const c of customers) {
        const ref = doc(db, 'customers', c.id);
        batch.set(ref, c, { merge: true });
      }

      // Suppliers
      const suppliers = StorageService.getSuppliers();
      for (const s of suppliers) {
        const ref = doc(db, 'suppliers', s.id);
        batch.set(ref, s, { merge: true });
      }

      // Sales
      const sales = StorageService.getSales();
      for (const s of sales) {
        const ref = doc(db, 'sales', s.id);
        batch.set(ref, s, { merge: true });
      }

      // Purchases
      const purchases = StorageService.getPurchases();
      for (const p of purchases) {
        const ref = doc(db, 'purchases', p.id);
        batch.set(ref, p, { merge: true });
      }

      // Settings
      const settings = StorageService.getSettings();
      const settingsRef = doc(db, 'shopSettings', 'main');
      batch.set(settingsRef, settings, { merge: true });

      await batch.commit();

      this.status = 'CONNECTED';
      this.lastSyncTime = new Date().toLocaleTimeString();
      this.errorMessage = '';
      this.notifyStats();

      return {
        success: true,
        message: `Successfully uploaded ${products.length} products, ${customers.length} customers, ${sales.length} sales to Firebase project "college-136ff"!`,
      };
    } catch (err: any) {
      this.status = 'ERROR';
      this.errorMessage = err?.message || 'Sync failed';
      this.notifyStats();
      return {
        success: false,
        message: `Upload error: ${err?.message || 'Failed to upload to Firestore'}`,
      };
    }
  }

  // Pull all data from Firestore to local
  public async pullAllFromFirestore(): Promise<{ success: boolean; message: string }> {
    try {
      this.status = 'SYNCING';
      this.notifyStats();

      // Products
      const prodSnap = await getDocs(collection(db, 'products'));
      if (!prodSnap.empty) {
        const products: Product[] = [];
        prodSnap.forEach((d) => products.push(d.data() as Product));
        StorageService.setDirectProducts(products);
      }

      // Customers
      const custSnap = await getDocs(collection(db, 'customers'));
      if (!custSnap.empty) {
        const customers: Customer[] = [];
        custSnap.forEach((d) => customers.push(d.data() as Customer));
        StorageService.setDirectCustomers(customers);
      }

      // Categories
      const catSnap = await getDocs(collection(db, 'categories'));
      if (!catSnap.empty) {
        const categories: Category[] = [];
        catSnap.forEach((d) => categories.push(d.data() as Category));
        StorageService.setDirectCategories(categories);
      }

      const brandSnap = await getDocs(collection(db, 'brands'));
      if (!brandSnap.empty) StorageService.setDirectBrands(brandSnap.docs.map((d) => d.data() as Brand));

      const unitSnap = await getDocs(collection(db, 'units'));
      if (!unitSnap.empty) StorageService.setDirectUnits(unitSnap.docs.map((d) => d.data() as Unit));

      const supplierSnap = await getDocs(collection(db, 'suppliers'));
      if (!supplierSnap.empty) StorageService.setDirectSuppliers(supplierSnap.docs.map((d) => d.data() as Supplier));

      // Sales
      const salesSnap = await getDocs(collection(db, 'sales'));
      if (!salesSnap.empty) {
        const sales: Sale[] = [];
        salesSnap.forEach((d) => sales.push(d.data() as Sale));
        StorageService.setDirectSales(sales);
      }

      const purchaseSnap = await getDocs(collection(db, 'purchases'));
      if (!purchaseSnap.empty) StorageService.setDirectPurchases(purchaseSnap.docs.map((d) => d.data() as Purchase));

      const expenseSnap = await getDocs(collection(db, 'expenses'));
      if (!expenseSnap.empty) StorageService.setDirectExpenses(expenseSnap.docs.map((d) => d.data() as Expense));

      const closingSnap = await getDocs(collection(db, 'dayClosings'));
      if (!closingSnap.empty) StorageService.setDirectDayClosings(closingSnap.docs.map((d) => d.data() as DayClosing));

      // Settings
      const settingsSnap = await getDoc(doc(db, 'shopSettings', 'main'));
      if (settingsSnap.exists()) {
        StorageService.saveSettings(settingsSnap.data() as ShopSettings);
      }
      const billingConfigSnap = await getDoc(doc(db, 'billingConfig', 'main'));
      if (billingConfigSnap.exists()) StorageService.updateBillingConfig(billingConfigSnap.data() as BillingConfig);

      this.status = 'CONNECTED';
      this.lastSyncTime = new Date().toLocaleTimeString();
      this.errorMessage = '';
      this.notifyStats();

      return {
        success: true,
        message: 'Successfully pulled latest fireworks data from Firestore!',
      };
    } catch (err: any) {
      this.status = 'ERROR';
      this.errorMessage = err?.message || 'Pull failed';
      this.notifyStats();
      return {
        success: false,
        message: `Download error: ${err?.message || 'Failed to fetch from Firestore'}`,
      };
    }
  }

  // Async Single Document writes
  public async syncProduct(product: Product): Promise<void> {
    try {
      const ref = doc(db, 'products', product.id);
      await setDoc(ref, product, { merge: true });
    } catch (err) {
      console.warn('Firebase sync product note:', err);
    }
  }

  public async deleteProduct(productId: string): Promise<void> {
    try {
      const ref = doc(db, 'products', productId);
      await deleteDoc(ref);
    } catch (err) {
      console.warn('Firebase delete product note:', err);
    }
  }

  public async syncSale(sale: Sale): Promise<void> {
    const ref = doc(db, 'sales', sale.id);
    await setDoc(ref, sale, { merge: true });
  }

  public async syncCustomer(customer: Customer): Promise<void> {
    try {
      const ref = doc(db, 'customers', customer.id);
      await setDoc(ref, customer, { merge: true });
    } catch (err) {
      console.warn('Firebase sync customer note:', err);
    }
  }

  public async syncSupplier(supplier: Supplier): Promise<void> {
    try {
      const ref = doc(db, 'suppliers', supplier.id);
      await setDoc(ref, supplier, { merge: true });
    } catch (err) {
      console.warn('Firebase sync supplier note:', err);
    }
  }

  public async syncPurchase(purchase: Purchase): Promise<void> {
    try {
      const ref = doc(db, 'purchases', purchase.id);
      await setDoc(ref, purchase, { merge: true });
    } catch (err) {
      console.warn('Firebase sync purchase note:', err);
    }
  }

  public async syncSettings(settings: ShopSettings): Promise<void> {
    try {
      const ref = doc(db, 'shopSettings', 'main');
      await setDoc(ref, settings, { merge: true });
    } catch (err) {
      console.warn('Firebase sync settings note:', err);
    }
  }

  public async syncBillingConfig(config: BillingConfig): Promise<void> {
    await setDoc(doc(db, 'billingConfig', 'main'), config, { merge: true });
  }

  public async resetGlobalInvoiceCounter(startingNumber: number): Promise<void> {
    await setDoc(doc(db, 'billingCounters', 'global'), { nextNumber: startingNumber, updatedAt: new Date().toISOString() }, { merge: true });
  }
}

export const FirestoreSync = new FirestoreSyncManager();
