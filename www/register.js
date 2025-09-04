import { auth, db } from './firebaseConfig.js';
import { initSocial } from './script.js';
import { collection, addDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { 
  createUserWithEmailAndPassword, 
  fetchSignInMethodsForEmail, 
  getAdditionalUserInfo,
  sendEmailVerification, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithCredential,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { showSweetAlert } from './script.js';

const button = document.getElementById('submit');

const form = document.getElementById('form')
const response = document.getElementById('response');
const regexMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
let usuariosCollection = collection(db,'usuarios')
const terms = document.getElementById('terms')
window.addEventListener('load', async () => {
  await initSocial();
  
});
document.addEventListener('DOMContentLoaded',() => {
  const termsAndConditions = `
1. Aceptación de los términos
Al acceder y utilizar la aplicación Ubifind, aceptas cumplir con estos Términos y Condiciones. Si no estás de acuerdo con alguno de los términos aquí establecidos, debes abstenerte de utilizar nuestros servicios.

2. Descripción del servicio
UFind es una plataforma web que permite descubrir y guardar lugares de ocio a través de mapas interactivos. El servicio puede incluir funciones como autenticación de usuarios, almacenamiento de datos en la nube y uso de APIs de terceros como Google Maps.

3. Registro y cuentas de usuario
Para acceder a ciertas funcionalidades, debes registrarte y autenticarte. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades realizadas bajo tu cuenta.

4. Uso aceptable
No está permitido:
- Usar la plataforma con fines ilegales o no autorizados.
- Interferir con el funcionamiento del sistema.
- Compartir contenido que infrinja derechos de terceros.

5. Contenido generado por el usuario
Los datos que ingresas, como rutas personalizadas o lugares guardados, siguen siendo tuyos, pero Ubifind puede almacenarlos, analizarlos o utilizarlos para mejorar el servicio. No compartiremos información personal sin tu consentimiento explícito.

6. Propiedad intelectual
Todos los elementos visuales, logotipos, textos y el diseño general de UFind están protegidos por derechos de autor. No se permite copiar ni reproducir partes del servicio sin autorización previa.

7. API y servicios de terceros
Ubifind integra servicios como Google Maps y Firebase. Al usar Ubifind, también aceptas los términos y políticas de estos proveedores.

8. Cancelación y eliminación de cuenta
Puedes solicitar la eliminación de tu cuenta en cualquier momento. Nos reservamos el derecho de suspender cuentas que violen estos Términos.

9. Modificaciones
Ubifind puede actualizar estos términos en cualquier momento. Las modificaciones se comunicarán a través de la aplicación.
`;

document.getElementById('terms-modal').addEventListener('click', (e) => {
  e.preventDefault();
  showSweetAlert('Términos y Condiciones', termsAndConditions, 'info', 'Ok');
});
})
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
      const user = userCredential.user;
      await updateProfile(user, {displayName: name.value});
      await addDoc(usuariosCollection, placeData);
      const additionalInfo = getAdditionalUserInfo(userCredential);
      const isNewUser = additionalInfo?.isNewUser;
    }
  } catch (error) {
    const friendly = error?.code === 'auth/weak-password' 
      ? 'La contraseña es demasiado débil.'
      : error?.code === 'auth/invalid-email' 
        ? 'El email no es válido.'
        : error?.code === 'auth/email-already-in-use' 
          ? 'Este email ya está registrado.'
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


const buttonGoogle = document.getElementById('login-google');
if (buttonGoogle) {
  buttonGoogle.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (!terms.checked) {
      response.textContent = 'Debes aceptar los términos y condiciones';
      return;
    }
    
    console.log('Iniciando autenticación con Google...');
    response.textContent = 'Iniciando sesión con Google...';

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
        if (!SocialLogin) throw new Error('Social login plugin not available');

        const res = await SocialLogin.login({ provider: 'google' });
        const idToken = res?.result?.idToken;
        
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
        }
      }
      
      // Redirigir al usuario a la página principal después del inicio de sesión exitoso
      window.location.href = 'index.html';
      
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
