import { auth, db } from './firebaseConfig.js';
import { initSocial } from './script.js';
import {  translations, getCurrentLanguage } from './i18n.js';
import { collection, addDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { 
  createUserWithEmailAndPassword, 
  fetchSignInMethodsForEmail, 
  
  sendEmailVerification, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithCredential,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { showSweetAlert } from './script.js';


let lang = getCurrentLanguage();
const form = document.getElementById('form')
const response = document.getElementById('response');
const regexMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
let usuariosCollection = collection(db,'usuarios')
const terms = document.getElementById('terms')
window.addEventListener('load', async () => {
  await initSocial();
  
});
document.addEventListener('DOMContentLoaded',() => {
  const termsAndConditionsView = `
${translations[lang]?.termsAndConditionsView}
`;

document.getElementById('terms-modal').addEventListener('click', (e) => {
  e.preventDefault();
  showSweetAlert('Términos y Condiciones', termsAndConditionsView, 'info', 'Ok');
});

if (form) {
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email');
  const name = document.getElementById('name-subname');
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
      response.textContent = `${translations[lang]?.fillFields}`
      return
    }
    if(!name.value || !email.value || !password.value && terms.checked){
      response.textContent = `${translations[lang]?.fillFields}`
      return
    }
    
    
    if (!regexMail.test(email.value.trim())) {
      response.textContent = `${translations[lang]?.invalidEmail}`;
      return;
    }
    
    if (!isPasswordValid) {
      response.textContent = `${translations[lang]?.publicSaveRequirements}`
      return;
    }
    const methods = await fetchSignInMethodsForEmail(auth, email.value);
    if (methods.length > 0) {
      response.textContent= `${translations[lang]?.userAlreadyExists}`;
      return;
    }
    

    
      const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
      const user = userCredential.user;
      await updateProfile(user, {displayName: name.value});
      await sendEmailVerification(user)
      await user.reload();
      await addDoc(usuariosCollection, placeData);
     
     
        localStorage.setItem('firstTime', true)
     
      window.location.href = '/app/index.html'
    
  } catch (error) {
    const friendly = error?.code === 'auth/weak-password' 
      ? `${translations[lang]?.weakPassword}`
      : error?.code === 'auth/invalid-email' 
        ? `${translations[lang]?.invalidEmail}`
        : error?.code === 'auth/email-already-in-use' 
          ?  `${translations[lang]?.userAlreadyExists}`
          : `${translations[lang]?.errorOccurred}`;
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


const buttonGoogle = document.getElementById('login-google');
if (buttonGoogle) {
  buttonGoogle.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (!terms.checked) {
      response.textContent = 'Debes aceptar los términos y condiciones';
      return;
    }
    
    
    

    const isNative = !!window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web';
    const provider = new GoogleAuthProvider();
    
    // Añadir alcances adicionales si son necesarios
    provider.addScope('profile');
    provider.addScope('email');
    
    // Configurar el flujo de autenticación para redirigir en lugar de popup si es necesario
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      let user;
      
      if (!isNative) {
        // WEB: Usar Firebase popup o redirect según prefieras
        const result = await signInWithPopup(auth, provider);
        user = result.user;
        
        // Verificar si el usuario es nuevo
        const isNewUser = result._tokenResponse?.isNewUser;
        
        if (isNewUser) {
          await addDoc(usuariosCollection, {
            email: user.email,
            name: user.displayName || '',
            premium: false,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // NATIVO (Android/iOS): usar el plugin
        const SocialLogin = window.Capacitor.Plugins?.SocialLogin;
        if (!SocialLogin) throw new Error('Google auth plugin not available');

        const res = await SocialLogin.login({ provider: 'google' });
        const idToken = result?.idToken || result?.result?.idToken;
        
        if (!idToken) {
          console.error('No se pudo obtener el token de Google', res);
          throw new Error('Error al autenticar con Google');
        }

        // Crear credencial de Firebase con el idToken de Google
        const cred = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, cred);
        user = userCredential.user;

        // Verificar si el usuario es nuevo
        const isNewUser = userCredential._tokenResponse?.isNewUser;
        
        if (isNewUser) {
          await addDoc(usuariosCollection, {
            email: user.email,
            name: user.displayName || '',
            premium: false,
            createdAt: new Date().toISOString()
          });
          localStorage.setItem('firstTime', true)
        }
      }
     
      // Redirigir al usuario a la página principal después del inicio de sesión exitoso
      window.location.href = '/app/index.html';
      
    } catch (error) {
      console.error('Error en autenticación con Google:', error);
      
      // Manejar errores específicos
      let errorMessage = 'Error al iniciar sesión con Google';
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'Ya existe una cuenta con este correo electrónico';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'La ventana de inicio de sesión se cerró antes de completar el proceso';
      } else if (error.code) {
        errorMessage += `: ${error.message}`;
      }
      
      response.textContent = errorMessage;
    }
  });
}

// Close the form if statement
}

})
