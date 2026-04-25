import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  terminate, 
  clearIndexedDbPersistence, 
  setLogLevel
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Silenciar logs internos
setLogLevel('silent');

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// RE-HABILITADO PARA EXTRACCIÓN DE DATOS LEGACY
export const db = getFirestore(app);

export const storage = getStorage(app);

// Utility to reset Firestore in case of internal errors
export const resetFirestore = async () => {
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
    window.location.reload();
  } catch (e) {
    console.error("Error resetting Firestore:", e);
    window.location.reload();
  }
};

// Forced GitHub sync
