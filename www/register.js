import { addDoc, collection } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import { auth, db } from './firebaseConfig.js';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, getAdditionalUserInfo, sendEmailVerification, signInAnonymously, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
const button = document.getElementById('submit');
const buttonGoogle = document.getElementById('google')
const form = document.getElementById('form')
const response = document.getElementById('response');
const regexMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
let usuariosCollection = collection(db,'usuarios')
const terms = document.getElementById('terms')
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email');
  const name = document.getElementById('name-subname')
  const password = document.getElementById('password');
  
  try {
    // Validar contraseña manualmente
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{6,}$/;
    const isPasswordValid = passwordRegex.test(password.value);
    const placeData = {
      email : email.value,
      premium : false
    }
    // Verificar si el email ya está registrado
   
    if(!name.value || !email.value || !password.value || !terms.checked){
      response.textContent = 'Debes rellenar los campos'
      return
    }
    if(!name.value || !email.value || !password.value && terms.checked){
      response.textContent = 'Debes rellenar los campos'
      return
    }
    
    
    if (!regexMail.test(email.value.trim())) {
      response.textContent = 'Debes introducir un email válido';
      return;
    }
    
    if (!isPasswordValid) {
      response.textContent = 'Requisitos de la contraseña no cumplidos: la contraseña debe contener al menos 6 caracteres, una letra mayúscula, una letra minúscula, un carácter numérico y un carácter no alfanumérico.';
      return;
    }
    const methods = await fetchSignInMethodsForEmail(auth, email.value);
    if (methods.length > 0) {
      response.textContent= 'Este email ya está registrado';
      return;
    }
    else {
      const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
      const user = userCredential.user
      await updateProfile(user, {displayName : name.value})

      

      
      await addDoc(usuariosCollection,placeData)
      const additionalInfo = getAdditionalUserInfo(userCredential)
      const isNewUser = additionalInfo?.isNewUser
      await sendEmailVerification(user);
      if(isNewUser){
        
        window.localStorage.setItem('firstTime','true')
      response.textContent = '¡Registro completado! Revisa tu email para confirmar tu cuenta.';
      window.localStorage.setItem('emailForSignIn', email.value);
      
      }
      
     window.location.href = 'index.html'
      
    }

  }
  catch(error){
    console.error(error)
    const friendly =
      error?.code === 'auth/weak-password' ? 'La contraseña es demasiado débil.'
      : error?.code === 'auth/invalid-email' ? 'El email no es válido.'
      : error?.code === 'auth/email-already-in-use' ? 'Este email ya está registrado.'
      : 'Ha ocurrido un error. Inténtalo de nuevo.';
    response.textContent = friendly;
    
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
