import { auth} from "./firebaseConfig.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";



const {App} = window.Capacitor.Plugins

document.addEventListener('DOMContentLoaded', async () => {

    if(!window.Capacitor.isNativePlatform()){
        // Add keyboard event listener for Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const shouldExit = handleBackButton();
                if (shouldExit) {
                    handleBackButton();
                }
            }
        }); 
    }
     else{
        // Handle back button
        App.addListener('backButton', () => {
            const shouldExit = handleBackButton();
            if (shouldExit) App.exitApp();
        })

     }   
        

    function handleBackButton(){
        if(window.location.pathname != '/app'){
            window.location.href = '/app'
            return false
        }
        return true
    }
    
    })


const actionCodeSettings = {
  // URL you want to redirect back to. The domain (www.example.com) for
  // this URL must be whitelisted in the Firebase Console.
  url: 'http://localhost:5501/login.html',
  // This must be true for email link sign-in.
  handleCodeInApp: true,
  
  // The domain must be configured in Firebase Hosting and owned by the project.
  linkDomain: 'custom-domain.com',
};
const send = document.getElementById('submit')


send.addEventListener('click', async (e) => {
  e.preventDefault();
    const response = document.getElementById('response')
  const emailValue = document.getElementById('email').value;

  if (!emailValue) {
    console.warn("Introduce un correo válido");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, emailValue, actionCodeSettings);
    response.textContent = 'Correo enviado. Es posible que el correo se encuentre en la bandeja de Spam.'
    
  } catch (error) {
    console.error("Error al enviar el correo:", error.message);
  }
});
