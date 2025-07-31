import { app, db } from "./firebaseConfig.js";
import { enablePremium } from "./premium.js";

const params = new URLSearchParams(window.location.search);
  const uid = params.get('uid');

  if (uid) {
   
    enablePremium()

    document.body.innerHTML = '<h2>¡Gracias por tu compra! Ahora eres Premium 🎉</h2>';
  }