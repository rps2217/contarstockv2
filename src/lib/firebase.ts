import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  terminate, 
  clearIndexedDbPersistence, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Silenciar logs internos
setLogLevel('silent');

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// RE-HABILITADO PARA EXTRACCIÓN DE DATOS LEGACY
export const db = getFirestore(app);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

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

// Auto-sign in anonymously if not already signed in
// This satisfies the "isAuthenticated()" rule for basic read operations
auth.onAuthStateChanged((user) => {
  if (!user) {
    signInAnonymously(auth).catch(e => {
      if (e.code === 'auth/configuration-not-found') {
        console.warn("⚠️ ACCIÓN REQUERIDA: La Autenticación Anónima no está habilitada en Firebase.");
        console.warn("Para mayor seguridad, habilítala en la consola de Firebase:");
        console.warn("https://console.firebase.google.com/project/contarstockv2/authentication/providers");
      } else {
        console.warn("Firebase Anonymous Auth Error:", e);
      }
    });
  }
});

// Forced GitHub sync
