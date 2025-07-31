import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { auth } from "./firebaseConfig.js";



const form = document.getElementById('form')
const response = document.getElementById('response')


form.addEventListener('submit', async (e) => {
e.preventDefault()
response.textContent = ''
const password = document.getElementById('last-password').value;
const passwordNew = document.getElementById('password-new').value;
const theNewPassword = document.getElementById('password').value;
try{
    
    const user = auth.currentUser;
    if(!user) return
    if(!password || !theNewPassword){
        response.textContent = 'Debes rellenar los campos'
        return
    }
    if(password === theNewPassword){
        response.textContent = 'La nueva contraseña tiene que ser distinta a la anterior'
        return
    }
    if(theNewPassword !== passwordNew){
        response.textContent = 'La contraseña debe ser igual'
    }
    const credential = EmailAuthProvider.credential(user.email,password)
    await reauthenticateWithCredential(user,credential)
    await updatePassword(user,theNewPassword)
    response.textContent = 'Contraseña cambiada correctamente'
    form.reset()
}
catch(error){
    console.log(error)
    response.textContent = 'Ocurrió un error'
}
})