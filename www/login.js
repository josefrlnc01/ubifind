import { auth, db } from './firebaseConfig.js';
import { initSocial } from './script.js';
import { applyTranslations, getCurrentLanguage } from './js/i18n.js';
import { GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  getAdditionalUserInfo,
  signInWithCredential,
  signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const regexMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Initialize translations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
});

const button = document.getElementById('submit');
button.addEventListener('click', async (e) => {
  e.preventDefault();
  
  const response = document.getElementById('response');
  const theEmail = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  if(!theEmail || !password) {
    response.textContent = translations[getCurrentLanguage()]?.fillFields || 'Please fill in all fields';
    return;
  }
    
  if(!regexMail.test(theEmail)) {
    response.textContent = translations[getCurrentLanguage()]?.invalidEmail || 'Please enter a valid email';
    return;
  }
  try{
    
    const userCredential = await signInWithEmailAndPassword(auth, theEmail, password)
    const user = userCredential.user
    const additionalInfo = getAdditionalUserInfo(userCredential)
    const isNewUser = additionalInfo?.isNewUser
    if(isNewUser){
    window.localStorage.setItem('firstTime','true')
    window.location.href = 'index.html'
  }
  else{
window.location.href = 'index.html'
  }
  }
  catch(error){
    console.error(error.code,error.message)
    if (error.code === 'auth/wrong-password') {
    response.textContent = `Email o contraseña incorrectos`;
  } else if (error.code === 'auth/user-not-found') {
    response.textContent = `No existe una cuenta con este correo`;
  } else {
    response.textContent = `Error: Contraseña incorrecta`;
  }
  }

});



const buttonShowPassword = document.getElementById('show-password')
buttonShowPassword.addEventListener('click', () => {
  const password = document.getElementById('password');
  if(password.getAttribute('type') === 'password'){
    password.setAttribute('type','text')
  }
  else{
    password.setAttribute('type', 'password')
  }
  
  
})


const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

async function saveUserProfile(user) {
    const userRef = doc(db, 'usuarios', user.uid);
    const profile = {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        premium: false // Default value
    };
    // Use setDoc with merge: true to create or update the document
    await setDoc(userRef, profile, { merge: true });
}




window.addEventListener('load', async () => {
  await initSocial();
  try {
    const rr = await getRedirectResult(auth);
    if (rr?.user) {
     
      window.location.href = 'index.html';
    }
  } catch (e) {
    console.error('Redirect result error:', e);
  }
});
const isNative = !!window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web';
const btn = document.getElementById('login-google');
btn.addEventListener('click', async (e) => {
  e.preventDefault();
  btn.disabled = true;
  
  const provider = new GoogleAuthProvider();
  try {
    if (!isNative) {
         // WEB: usar Firebase popup
         const result = await signInWithPopup(auth, provider);
         const user = result.user;
         const additionalUserInfo = getAdditionalUserInfo(result);
         if (additionalUserInfo?.isNewUser) {
            await saveUserProfile(user);
         }
   
       } else {
         // NATIVO (Android/iOS): usar el plugin
         const SocialLogin = window.Capacitor.Plugins?.SocialLogin;
         if (!SocialLogin) throw new Error('Social login plugin not available');
   
         const res = await SocialLogin.login({ provider: 'google' });
   
         
         const idToken = res?.result?.idToken;
         if (!idToken) {
           console.error('Could not find idToken in response', res);
           throw new Error('No se pudo obtener el idToken');
         }
   
         // Crear credencial de Firebase con el idToken de Google
         const cred = GoogleAuthProvider.credential(idToken);
         const userCredential = await signInWithCredential(auth, cred);
         const user = userCredential.user;
         const additionalUserInfo = getAdditionalUserInfo(userCredential);
         if (additionalUserInfo?.isNewUser) {
            await saveUserProfile(user);
         }
   
         
       }
       window.location.href = 'index.html';
  } catch (err) {
    console.error(err);
    alert('Error al iniciar sesión con Google: ' + (err?.message || err));
  } finally {
    btn.disabled = false;
  }
});