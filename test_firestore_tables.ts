import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  try {
    // We can't list collections in Web SDK, so we have to guess.
    const tables = ["PRODUCTOS", "PROVEEDORES", "CONFIG_SISTEMA", "PRODUCTS", "products", "productos"];
    for (const table of tables) {
      const snapshot = await getDocs(collection(db, table));
      console.log(`${table} count:`, snapshot.size);
    }
  } catch (e) {
    console.error("Error:", e);
  }
}
run().catch(console.error);
