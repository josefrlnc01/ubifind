// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyBIwh48ONwPE4er9GGwNwdgOv3OVHHQrMo",
  authDomain: "new-day-459708.firebaseapp.com",
  projectId: "new-day-459708",
  storageBucket: "new-day-459708.firebasestorage.app",
  messagingSenderId: "940873643414",
  appId: "1:940873643414:web:5e179367581a11f21c99b7"
};



const App = initializeApp(firebaseConfig);
const auth = getAuth(App);
const db = getFirestore(App);
const storage = getStorage(App);

export { App, auth, db, storage};