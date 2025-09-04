import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { auth } from "./firebaseConfig.js";
import { applyTranslations, getCurrentLanguage } from "./js/i18n.js";

const form = document.getElementById('form');
const response = document.getElementById('response');

// Get current language
const lang = getCurrentLanguage();

// Password reset form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    response.textContent = '';
    
    const password = document.getElementById('last-password').value;
    const passwordNew = document.getElementById('password-new').value;
    const theNewPassword = document.getElementById('password').value;
    
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        // Validation
        if (!password || !theNewPassword || !passwordNew) {
            response.textContent = translations[lang]['fillFields'] || 'Debes rellenar los campos';
            return;
        }
        
        if (password === theNewPassword) {
            response.textContent = translations[lang]['samePassword'] || 'La nueva contraseña tiene que ser distinta a la anterior';
            return;
        }
        
        if (theNewPassword !== passwordNew) {
            response.textContent = translations[lang]['passwordsDontMatch'] || 'Las contraseñas no coinciden';
            return;
        }
        
        // Reauthenticate and update password
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, theNewPassword);
        
        // Show success message
        response.textContent = translations[lang]['passwordChanged'] || 'Contraseña cambiada correctamente';
        response.style.color = 'green';
        form.reset();
        
    } catch (error) {
        console.error('Error updating password:', error);
        response.textContent = translations[lang]['errorOccurred'] || 'Ocurrió un error';
        response.style.color = 'red';
    }
});


