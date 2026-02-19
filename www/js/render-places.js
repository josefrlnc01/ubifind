import { auth, db } from "../firebaseConfig.js";
import { elements, closePrivatesCreatedsPanel, getLikesCount } from "../script.js";
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { applyTranslations } from "./i18n.js";
