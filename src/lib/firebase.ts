import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Auto-sign in anonymously if not already signed in
// This satisfies the "isAuthenticated()" rule for basic read operations
auth.onAuthStateChanged((user) => {
  if (!user) {
    signInAnonymously(auth).catch(e => {
      if (e.code === 'auth/configuration-not-found') {
        console.error("⚠️ ACCIÓN REQUERIDA: La Autenticación Anónima no está habilitada en Firebase.");
        console.error("Para que los operadores puedan acceder con PIN, debes habilitarla en la consola de Firebase:");
        console.error("1. Ve a https://console.firebase.google.com/project/contarstockv2/authentication/providers");
        console.error("2. Haz clic en 'Añadir nuevo proveedor' o busca 'Anónimo'.");
        console.error("3. Habilita el proveedor 'Anónimo' y guarda los cambios.");
      } else {
        console.error("Firebase Anonymous Auth Error:", e);
      }
    });
  }
});
