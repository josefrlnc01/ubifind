import { auth } from './firebaseConfig.js';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, reauthenticateWithCredential, validatePassword, EmailAuthProvider, signInAnonymously, getAdditionalUserInfo} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";



const regexMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const buttonGoogle = document.getElementById('google');
const button = document.getElementById('submit');
button.addEventListener('click', async (e) => {
  e.preventDefault();
  console.log('click')
  
  const response = document.getElementById('response');
  const theEmail = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if(!theEmail || !password){
      response.textContent = `Debes rellenar los campos`
      return
    }
    
    if(!regexMail.test(theEmail)){
      response.textContent = `Debes introducir un email válido`;
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
