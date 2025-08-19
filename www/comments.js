import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    increment,
    setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { App, auth, db, storage } from "./firebaseConfig.js";



export async function loadComments(placeId) {
    const comentariosRef = collection(db, 'creados', placeId, 'comentarios')
    const snapshot = await getDocs(comentariosRef)
    let container = document.getElementById(`comentarios-${placeId}`)
    if (!container) {
        console.warn(`No se encontró el contenedor: comentarios-${placeId}`);
        return;
      }
    container.innerHTML = ''
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
const commentId = docSnap.id
        const nombreUsuario = data.userName
            ? data.userName.slice(0, 6)
            : data.userId
                ? data.userId.slice(0, 6)
                : 'Usuario';
const esAutor = auth.currentUser.uid === data.userId
const dateTimestamp = data.timestamp?.toDate()
const timeString = dateTimestamp
  ? dateTimestamp.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
  : 'Hora desconocida';
        const html = `
        <div class="comentario" '>
        <div class='text-of-comment'>
         <p><strong style="margin-bottom:4px;">${nombreUsuario}</strong> <br><b style="font-weight:200;"> ${data.texto}</b></p>
        </div>
           
            
            <div class='hour'>
            <small style="color:#fff; align-self:flex-end;">${timeString}</small>
            ${esAutor ? `<button class="btn-delete" data-id="${commentId}" data-place="${placeId}">🗑️</button>`: ''}
            </div>
            
        </div>`;

        container.insertAdjacentHTML('beforeend', html);
        const lastSite = container.lastElementChild
        lastSite.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                
                
                
                const commentId = btn.dataset.id
                const placeId = btn.dataset.place
                
                await deleteComment(placeId,commentId)
               
                await loadComments(placeId);
            })
        })
        
    });
    
 
}




export async function addComment(text, placeId) {
    if (!auth.currentUser) {
        console.error('User not authenticated');
        return;
    }

    try {
        const comentario = {
             userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName,
            texto: text,
            timestamp: serverTimestamp()
        };
       
        
        // Create a reference to the collection
        const comentariosRef = collection(db, 'creados', placeId, 'comentarios');

        // Add the document
        await addDoc(comentariosRef, comentario);
       
        let commentsArray = localStorage.getItem('comentarios') || '[]'
       const lugaresVisitados = commentsArray ? JSON.parse(commentsArray) : '[]'
       localStorage.setItem('comentarios', JSON.stringify(lugaresVisitados))
       lugaresVisitados.push(comentario.texto)
       
       const comentariosSection = document.querySelectorAll('.comentarios-section')
       if(lugaresVisitados.length >= 2){
        comentariosSection.forEach(com => {
            com.classList.add('comentarios-maxed')
        })
    }
        loadComments(placeId)
       
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
}

export async function deleteComment(placeId,commentId){
    if (!auth.currentUser) {
        console.error('User not authenticated');
        return;
    }
    try{
        const comentario = doc(db,'creados',placeId, 'comentarios', commentId)
        await deleteDoc(comentario)
        
        
    }
    catch(error){
        console.log(error)
    }
}


