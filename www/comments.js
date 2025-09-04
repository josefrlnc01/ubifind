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
    try {
        
        const comentariosRef = collection(db, 'creados', placeId, 'comentarios');
        const snapshot = await getDocs(comentariosRef);
        let container = document.getElementById(`comentarios-${placeId}`);
        
        if (!container) {
            console.warn(`No se encontró el contenedor: comentarios-${placeId}`);
            return false;
        }
        
        // Limpiar el contenedor
        container.innerHTML = '';
        
       

        // Procesar cada comentario
        snapshot.forEach(docSnap => {
            try {
                const data = docSnap.data();
                if (!data) return;
                
                const commentId = docSnap.id;
                const nombreUsuario = data.userName
                    ? data.userName.slice(0, 6)
                    : data.userId
                        ? data.userId.slice(0, 6)
                        : 'Usuario';
                        
                const esAutor = auth.currentUser && auth.currentUser.uid === data.userId;
                const dateTimestamp = data.timestamp?.toDate();
                const timeString = dateTimestamp
                    ? dateTimestamp.toLocaleString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        day: '2-digit', 
                        month: 'short' 
                    })
                    : 'Hora desconocida';
                    
                const commentElement = document.createElement('div');
                commentElement.className = 'comentario';
                commentElement.innerHTML = `
                    <div class='text-of-comment'>
                        <p class='comment-user'><strong style="margin-bottom:4px;">${nombreUsuario}</strong> <br>
                        <span style="font-weight:200;">${data.texto || ''}</span></p>
                    </div>
                    <div class='hour'>
                        <small style="color:#fff; align-self:flex-end; text-align:end">${timeString}</small>
                        ${esAutor ? `<button class="btn-delete" data-id="${commentId}" data-place="${placeId}">🗑️</button>` : ''}
                    </div>`;

                container.appendChild(commentElement);
                
                // Añadir manejador de eventos para el botón de eliminar si es necesario
                if (esAutor) {
                    const btnDelete = commentElement.querySelector('.btn-delete');
                    if (btnDelete) {
                        btnDelete.addEventListener('click', async (e) => {
                            e.stopPropagation();
                           
                                await deleteComment(placeId, commentId);
                                await loadComments(placeId);
                          
                        });
                    }
                }
            } catch (error) {
                console.error('Error procesando comentario:', error);
            }
        });
        
        // Ajustar el scroll al final de los comentarios
        container.scrollTop = container.scrollHeight;
        return true;
        
    } catch (error) {
        console.error('Error al cargar comentarios:', error);
        const container = document.getElementById(`comentarios-${placeId}`);
        if (container) {
            container.innerHTML = '<p class="error-comments">Error al cargar los comentarios</p>';
        }
        return false;
    }
}




export async function addComment(text, placeId) {
    if (!auth.currentUser) {
        console.error('User not authenticated');
        throw new Error('Usuario no autenticado');
    }

    try {
        const comentario = {
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || 'Anónimo',
            texto: text,
            timestamp: serverTimestamp()
        };

        
        
        // Verificar que el texto no esté vacío
        if (!text || typeof text !== 'string' || text.trim() === '') {
            throw new Error('El comentario no puede estar vacío');
        }
        
        // Verificar que el placeId sea válido
        if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
            throw new Error('ID de lugar no válido');
        }
        
        // Crear referencia a la colección de comentarios
        const comentariosRef = collection(db, 'creados', placeId, 'comentarios');
        
        
        // Añadir el documento
        const docRef = await addDoc(comentariosRef, comentario);
        console.log('Comentario añadido con ID:', docRef.id);
        
        // Actualizar la interfaz de usuario
        await loadComments(placeId);
        
        // Opcional: Actualizar localStorage para seguimiento local
        try {
            const commentsArray = JSON.parse(localStorage.getItem('comentarios') || '[]');
            commentsArray.push({
                id: docRef.id,
                placeId,
                text,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('comentarios', JSON.stringify(commentsArray));
        } catch (localError) {
            console.warn('Error al actualizar localStorage:', localError);
            // No es crítico, continuamos
        }
        
        return docRef.id;
        
    } catch (error) {
        console.error('Error al añadir comentario:', error);
        // Mostrar mensaje de error al usuario
        const errorMessage = error.message || 'Error al guardar el comentario';
        alert(errorMessage);
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


