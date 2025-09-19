import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, GoogleAuthProvider, reauthenticateWithPopup, reauthenticateWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { auth } from "./firebaseConfig.js";

export async function deleteUserAccount() {
    const user = auth.currentUser;
    if (!user) return;
    const provider = user.providerData[0]?.providerId;
    try {
        
        // Prompt user for their password for re-authentication
        if(provider === 'password'){
            
            const { value: password } = await Swal.fire({
            title: 'Confirmar eliminación',
            text: 'Por seguridad, ingresa tu contraseña para continuar con la eliminación de la cuenta',
            input: 'password',
            inputPlaceholder: 'Ingresa tu contraseña',
            showCancelButton: true,
            confirmButtonText: 'Confirmar eliminación',
            confirmButtonColor: '#d33',
            cancelButtonText: 'Cancelar',
            showLoaderOnConfirm: true,
            preConfirm: (password) => {
                if (!password) {
                    Swal.showValidationMessage('La contraseña es requerida');
                    return false;
                }
                return password;
            },
            allowOutsideClick: () => !Swal.isLoading()
        });

        if (!password) return; // User clicked cancel

        // Re-authenticate user
        const credential = EmailAuthProvider.credential(user.email, password);
        reauthenticateWithCredential(user, credential)
        
        }
        if(provider === 'google'){
             const provider = new GoogleAuthProvider()
            if(!window.capacitor.isNativePlatform()){
               
            reauthenticateWithPopup(user,provider)
            }
            else{
                reauthenticateWithRedirect(user, provider)
                const result = await getRedirectResult(auth)
            }
        }
        
        // If re-authentication is successful, delete the account
        await deleteUser(user);
        
        // Redirect to register page after successful deletion
        window.location.href = 'register.html';
    } catch (error) {
        console.error('Error deleting account:', error);
        let errorMessage = 'Ocurrió un error al intentar eliminar la cuenta.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Contraseña incorrecta. Por favor, inténtalo de nuevo.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'La sesión ha expirado. Por favor, inicia sesión nuevamente e intenta de nuevo.';
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonText: 'Entendido'
        });
    }
}