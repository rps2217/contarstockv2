import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  try {
    const snapshot = await getDocs(collection(db, "PRODUCTOS"));
    console.log("PRODUCTOS count:", snapshot.size);
    if (snapshot.size > 0) {
      console.log("Sample:", snapshot.docs[0].data());
    }
  } catch (e) {
    console.error("Error:", e);
  }
}
run().catch(console.error);
