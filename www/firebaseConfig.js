// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBIwh48ONwPE4er9GGwNwdgOv3OVHHQrMo",
  authDomain: "new-day-459708.firebaseapp.com",
  projectId: "new-day-459708",
  storageBucket: "new-day-459708.firebasestorage.app",
  messagingSenderId: "940873643414",
  appId: "1:940873643414:web:024639ffccecc44c1c99b7"
};



const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage};