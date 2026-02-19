
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    getDoc,
    doc,
    updateDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { lang } from "./login.js";
import { auth, db } from "../firebaseConfig.js";
import { translations } from "../js/i18n.js";

import { showSweetAlert, showSweetCancelAlert, showNotification, showErrorNotification, appState, updateBarFromState, pendingDeepLinkPlaceId, getLikesCount, isOffensive, toggleLike, shareCreatedPlace, shareCreatedPlaceGoogle, elements, menuOptions, closeCreatedsPanel, showLoadingPrincSpinner, hideLoadingPrincSpinner, closePrivatesCreatedsPanel  } from "../script.js";
import { loadComments } from "./comments.js";
import { applyTranslations } from "../js/i18n.js";

//activar el modo de creación de lugar
let creationMarker = null;
let creationListener = null
export let map;
let markers = [];

let baseLayer;
export async function initMap() {
   
    appState.map = true
    appState.home = false
    appState.create = false
    updateBarFromState()
    //Generamos de nuevo el map container con distintos estilos a la home
    const mapContainer = document.getElementById('map-container')

    mapContainer.innerHTML = '<div id="map" style="width:100%; height:100%;"></div>'
    mapContainer.style.overflowY = 'none'


    map = L.map('map').setView([20, 0], 2)

    const atribution = '<small style="opacity:0.6;">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small>'

    // Selección robusta de tileLayer para establecer nueva capa
    let tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
    if (
        (localStorage.getItem('theme') === 'dark')) {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    }
    //Removemos la capa del mapa anterior
    if (baseLayer) {
        map.removeLayer(baseLayer)
    }
    baseLayer = L.tileLayer(tileUrl, { attribution: atribution })
    baseLayer.addTo(map);


    if (mapContainer) {
        mapContainer.style.width = '75vw'
    }


    try {
        let lat = 2, lng = 0, zoom = 2
       
            try {
                const pos = await getActualPosition()
                lat = pos.lat;
                lng = pos.lng;
                zoom = 13;
                if (!isValidLatLng(lat, lng)) {
                    throw new Error('Invalid latitude or longitude values');
                }
                const userLocationIcon = L.divIcon({
                    className: 'user-location-icon',
                    html: '<div class="pulse"></div>',
                    iconSize: [25, 40],
                    iconAnchor: [12, 40],
                    popupAnchor: [0, -30]
                })
                const marker = L.marker([lat, lng], { icon: userLocationIcon }).addTo(map);
                marker.on('click', () => {
                    showSweetAlert(`${translations[lang].ubiNow}`, `${translations[lang].ubiNowText}`, 'success', 'OK')
                })
                markers.push(marker);

                map.setZoom(10)

            } catch (geoError) {
                showErrorNotification(`${translations[lang].geoFail}`, 5000);
            }
        


        map.setView([lat, lng], zoom)
        const checkMapReady = setInterval(async () => {

            if (map && pendingDeepLinkPlaceId) {

                await handleDeepLink(pendingDeepLinkPlaceId)
                    .then(() => console.log('handleDeepLink completado'))
                    .catch(err => console.error('Error en handleDeepLink:', err));
                pendingDeepLinkPlaceId = null;
                clearInterval(checkMapReady);
            }
        }, 300);
        // Configurar el listener para actualizar marcadores al mover/zoom
        map.on('moveend', () => {
            loadPlaces()
        })
        // Verificar si hay un deep link pendiente después de inicializar el mapa

    } catch (error) {
        console.error('Error al inicializar el mapa:', error);
        showErrorNotification(`${translations[lang].mapLoad}`);
        return
    }
}





let marcadoresCreados = [];

export async function loadPlaces() {
    // Limpiar marcadores existentes

    marcadoresCreados = [];

    // Solo cargar lugares si el zoom es 8 o más
    if (map.getZoom() >= 7) {
        try {
            const bounds = map.getBounds();
            if (!bounds) return;

            // Obtener todos los lugares públicos y privados sin filtros de ubicación
            const qPublicos = query(collection(db, 'creados'),
                where('visibleToAll', '==', true)
            );

            const qPrivados = query(collection(db, 'creados'),
                where('userId', '==', auth.currentUser.uid)
            );

            const [publicSnapshot, personalSnapshot] = await Promise.all([
                getDocs(qPublicos),
                getDocs(qPrivados)
            ]);


            // Procesar lugares públicos
            publicSnapshot.forEach(doc => {
                const place = { id: doc.id, ...doc.data() };

                addMarkerToPlace(place);
                marcadoresCreados.push(place.place_id)

            });

            // Procesar lugares privados (evitando duplicados)
            personalSnapshot.forEach(doc => {
                const place = { id: doc.id, ...doc.data() };
                if (!publicSnapshot.docs.some(d => d.id === place.id)) {
                    addMarkerToPlace(place);
                    marcadoresCreados.push(place.place_id)
                }
            });

        } catch (error) {
            console.error('Error al cargar lugares:', error);
            showErrorNotification(`${translations[lang].placesLoadFail}`);
            return
        }
    }
    else {
        marcadoresCreados.forEach(m => m.setMap(null));
        return;
    }


}





let currentMarker = null;
export async function addMarkerToPlace(place) {
    try {


        // Ensure position is properly formatted
        const position = {
            lat: place.position.lat || place.position.latitude,
            lng: place.position.lng || place.position.longitude
        };
        const iconOpacity = place.visibleToAll ? '1' : '.2';
        const markerHtmlStyles = `
  background-color: #8A2BE2;
  width: 1rem;
  height: 1rem;
  display: block;
  
  top: -1rem;
  opacity: ${iconOpacity};
  position: relative;
  border-radius: 1.5rem 1.5rem 0;
  transform: rotate(45deg);
  border: 2px solid white;
`;

        const icon = L.divIcon({
            className: "custom-marker",
            html: `<span style="${markerHtmlStyles}"></span>`,
        });


        const marker = L.marker(position, { icon: icon }).addTo(map);
        const likesCount = await getLikesCount(place.place_id)
        const likeButton = `<button class='button-likes' data-id=${place.place_id}><img class='action-btn img-share' src='../images/favorite.webp'></button>`;

        // Create popup content
        const popupContent = `
             <div class="card-sites" style="height:450px;max-height:450px; max-width:95vw; overflow:auto;"   data-id='${place.place_id}'>
                
                <h2>${place.name || 'N/D'}</h2>
                <div class='container-createds-card rating'>
                    ${place.visibleToAll ? `<p class='count-likes'>${likesCount}❤️</p>` : ''}
                    <p>${place.rating ? '⭐'.repeat(place.rating) : ''}</p>
                </div>
                <div class='container-createds-card photo'>
                 <a  class='download-btn'>${place.photo ? `<img class="place-photo" style='max-width:100%; object-fit:cover; min-width:100%; max-height:400px; min-height:400px;' loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado\'s photo'}'>` : ''}</a>   
                </div>
                <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                   
                    <button style='border-radius: ${place.visibleToAll ? "initial" : "6px"}' class='share-ubi'><img class='action-btn' src='../images/location.webp' alt='Compartir ubicación'></button>
                    ${place.visibleToAll ? "<button class='share-card'><img class='action-btn' src='../images/share (2).webp' alt='Compartir tarjeta'></button>" : ''}
                    
                </div>
                <div class='container-createds-card comment-card'>
                
                    <p class='coment-place'><strong>${place.visibleToAll ? place.createdBy : ''}</strong>  <span> ${place.comment || ''}</span></p>
                    
                
                 </div>      
    </div>`


        // Configurar el nuevo infowindow

        currentMarker = marker;

        // Configurar el contenido y abrir
        currentMarker.bindPopup(popupContent, {
            maxWidth: 900,
            className: 'custom-popup',
            closeButton: true,
            autoClose: true,
            autoPan: true
        })

        // Configurar eventos del infowindow
        currentMarker.on('popupopen', async function () {

            map.setView(place.position, 13);
            setTimeout(() => {
                map.panBy([0, -275])
            }, 300)
            soundSucces();
            const popup = this.getPopup();
            const popupElement = popup.getElement();

            // Close button
            const closeBtn = popupElement.querySelector('.close-window');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    map.closePopup(popup);
                });
            }

            // Like button
            const likeBtn = popupElement.querySelectorAll('.button-likes');
            if (likeBtn && place.visibleToAll) {
                likeBtn.forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const id = btn.dataset.id
                        await toggleLike(id, btn);
                        const newCount = await getLikesCount(place.place_id);
                        const likeCountElement = popupElement.querySelector('.count-likes');
                        if (likeCountElement) {
                            likeCountElement.textContent = `${newCount} ❤️`;
                        }
                    })
                })

            }

            // Share location button
            const shareUbiBtn = popupElement.querySelector('.share-ubi');
            if (shareUbiBtn) {
                shareUbiBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    shareCreatedPlaceGoogle(place);
                });
            }

            // Share card button
            const shareCardBtn = popupElement.querySelector('.share-card');
            if (shareCardBtn) {
                shareCardBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    shareCreatedPlace(place);
                });
            }

            // Load comments and likes if visible to all
            if (place.visibleToAll) {
                const count = await getLikesCount(place.place_id);
                const likeCountElement = popupElement.querySelector('.count-likes');
                if (likeCountElement) {
                    likeCountElement.textContent = `${count} ❤️`;
                }
                // Add comments section to popup content
                const comentariosSection = `
                    <div class="comentarios-section" data-id="${place.place_id}" id="comentarios-${place.place_id}"></div>
                    <div class='comentarios-input'>
                        <textarea class='text-comment' id="input-comentario-${place.place_id}" placeholder="Escribe tu comentario..."></textarea>
                        <button class="btn-comentar" type='button' data-id="${place.place_id}">
                            <img class='action-btn img-share' src='../images/send.webp' alt='Enviar comentario'>
                        </button>
                    </div>`;

                // Add comments section to popup
                const popupContentElement = popupElement.querySelector('.card-sites');
                if (popupContentElement) {
                    const commentsContainer = document.createElement('div');
                    commentsContainer.className = 'comments-container';
                    if (place.visibleToAll) {

                        commentsContainer.innerHTML = comentariosSection;
                        popupContentElement.appendChild(commentsContainer);
                        applyTranslations()
                        // Load comments
                        loadComments(place.place_id);

                        // Add comment button handler
                        const commentBtn = popupContentElement.querySelector('.btn-comentar');
                        const commentInput = popupContentElement.querySelector('.text-comment');

                        if (commentBtn && commentInput) {
                            const handleComment = async () => {
                                const commentText = commentInput.value.trim();
                                if (commentText) {
                                    await addComment(commentText, place.place_id);
                                    commentInput.value = '';
                                    await loadComments(place.place_id);
                                }
                            };

                            commentBtn.addEventListener('click', handleComment);
                            commentInput.addEventListener('keypress', (e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleComment();
                                }
                            });
                        }
                    }
                }
            }
        });


    } catch (error) {
        console.error('Error adding marker:', error);
        throw error;
    }
}






export async function saveCreatedPlace(position, placeName, comment, rating, photoURL = '') {
    const buttonVisibleToAll = document.getElementById('public')
    const user = auth.currentUser;
    if (!user) {
        showErrorNotification(`${translations[lang].mustBeLoggedIn}`);
        return;
    }

    try {
        // Ensure position has lat and lng methods
        const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
        const lng = typeof position.lng === 'function' ? position.lng() : position.lng;
        const uniqueId = `cmt-${crypto.randomUUID()}`
        const placeData = {
            name: placeName || 'Unnamed Place',
            createdBy: user.displayName || 'Usuario',
            userName: user.displayName || 'Usuario',
            place_id: uniqueId,
            comment: comment,
            rating: rating ? Number(rating) : null,
            photo: photoURL,
            position: {
                lat: lat,
                lng: lng,
                _lat: lat,
                _long: lng
            },
            createdAt: serverTimestamp(),
            timestamp: new Date().toISOString(),
            userId: user.uid,
            saved: true,


            visibleToAll: buttonVisibleToAll.checked ? false : true
        };


        const creadosRef = collection(db, 'creados');
        const q = query(creadosRef,
            where('userId', '==', user.uid),
            where('name', '==', placeName));

        const snapshot = await getDocs(q);



        if (snapshot.empty) {

            const docRef = await addDoc(creadosRef, placeData);
            await updateDoc(docRef, {
                place_id: docRef.id
            });
            showNotification(`${translations[lang].placeCreated}`);
            cancelCreationPlace()
            loadPlaces()
            renderCreatedPlaces();
        } else {
            showErrorNotification(`${translations[lang].duplicatePlaceName}`);
            return;
        }
    } catch (error) {
        console.error('Error saving place:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });

        showErrorNotification(`${translations[lang].savePlaceGeneric}`);
    }
}





const searchCreatedsCard = document.getElementById('search-createds-card')

if (searchCreatedsCard) {
    async function searchCards (){
        const user = auth.currentUser

        if (!user) return
        
        const q = query(collection(db, 'creados'), where('userId', '==', user.uid),
            where('visibleToAll', '==', true))
        const snapshot = await getDocs(q)
        const places = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
        const searchTerm = searchCreatedsCard.value.toLowerCase()
        const findeds = places.filter(res => res.name.toLowerCase().includes(searchTerm))

        const container = elements.createdsSitesList
        container.innerHTML = ''
        let html = ''
        findeds.forEach(async place => {
            const likesCount = await getLikesCount(place.place_id)
            html = `
            <div class="card-sites" style="height:auto;">
            <h3>${place.name || 'N/D'}</h3>
    
        
            <div class='container-createds-card rating'>
             <span>${likesCount}❤️</span>
            <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
           
            </div>
            <div class='container-createds-card photo'>
            
            ${place.photo ? `<img src='${place.photo}' alt='${place.name || 'Lugar creado'}' style='width: 100%; min-width:100%; height: auto; max-height: 400px; min-height:400px; border-radius: 8px; object-fit: cover;'>` : '<p>Sin imagen</p>'}
           
            </div>
            <div class='container-createds-card comment'>
           
            <p>${place.comment || 'N/D'}</p>
            </div>
    
            <div class="btn-renders">
                <button class="btn btn-view-created">Ver en mapa</button>
                
                <button class="btn delete-btn" data-id="${place.id}">Eliminar</button>
            </div>
        </div>
    `;
            container.insertAdjacentHTML('beforeend', html)

            attachVisitButtonListeners(place)
        })
    }
    function debounce(callback, delay){
        let timeoutId 
return function() {
      
      clearTimeout(timeoutId); // cancela el timeout anterior (si existe)
      timeoutId = setTimeout(() => {
        callback()// ejecuta callback después del delay
      }, delay);
    };
    }
    const debouncedSearch = debounce(searchCards, 700)
    searchCreatedsCard.addEventListener('input', debouncedSearch)

}





export async function showDesktopPlaceCreation(position) {


    const bounds = map.getBounds();

    // Limpiar marker anterior si existe
    if (creationMarker) {

        map.removeLayer(creationMarker);
        creationMarker = null;
    }

    const content = `
    <div class='form-creation-place' id='form-creation-place'>
        <div class='inputContainer check'>
            <label class='title-creation' data-i18n="public" for='public'> 
                <small>¿Quieres que el lugar sea privado? Marca esta casilla</small>
            </label>
            <input type='checkbox' name='check' id='public'/>
        </div>
        
        <div class='inputContainer name'>
            <label for='name-desktop' data-i18n="nameForm">Nombre</label>
            <input type='text' name='name-desktop' id='name-desktop' required/>
        </div>

        <div class='inputContainer rate'>
            <label for='rates-desktop' data-i18n="rateForm">Valoración personal (1 a 5)</label>
            <input id='rates-desktop' name='rates-desktop' type='number' min='1' max='5' />
        </div>

        <div class='inputContainer comment-form'>
            <label for='comment-desktop' data-i18n="commentForm">Una frase o texto que describa el lugar</label>
            <textarea id='comment-desktop' name='comment-desktop'></textarea>
        </div>

        <div class='inputContainer photo'>
            <label for="file-upload" class="custom-file-upload">📸</label>
            <input id="file-upload" type="file" accept="image/*" />
        </div>

        <div class='container-buttons-form'>
            <button class='create-place' id='save-desktop' data-i18n="saveForm" type='button'>Guardar</button>
            <button class='cancel-create-place' id='cancel-save-desktop' data-i18n="cancelForm" type='button'>Cancelar</button>
        </div>
    </div>
    `;


    // Ensure position is a proper LatLng object
    const lat = typeof position.lat === 'function' ? position.lat() : parseFloat(position.lat);
    const lng = typeof position.lng === 'function' ? position.lng() : parseFloat(position.lng);



    const latLng = L.latLng(lat, lng);
    bounds.extend(latLng);

    const markerHtmlStyles = `
background-color: #8A2BE2;
width: 1rem;
height: 1rem;
display: block;

top: -1rem;

position: relative;
border-radius: 1.5rem 1.5rem 0;
transform: rotate(45deg);
border: 2px solid white;
`;

    const icon = L.divIcon({
        className: "custom-marker",
        html: `<span style="${markerHtmlStyles}"></span>`,
    });

    creationMarker = L.marker([lat, lng], { icon: icon }).addTo(map);


    // Create popup with the content
    creationMarker.bindPopup(content, {
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        className: 'custom-popup',
        maxWidth: 400,
        minWidth: 300
    });

    map.on('popupopen', function (e) {
        map.panTo(e.popup.getLatLng())
        setTimeout(() => {
            map.panBy([0, -200])
        }, 300)


    });


    // Open the popup immediately
    creationMarker.openPopup();
    applyTranslations()

    // MÉTODO ALTERNATIVO: usar setTimeout simple para asegurar que el DOM esté listo
    setTimeout(() => {


        // Buscar elementos de diferentes maneras
        const popup = creationMarker.getPopup();
        const popupElement = popup ? popup.getElement() : null;



        if (!popupElement) {
            console.error('❌ No popup element found');
            return;
        }


        const fileUpload = popupElement.querySelector('#file-upload');
        const saveDesktop = popupElement.querySelector('#save-desktop');
        const cancelSaveDesktop = popupElement.querySelector('#cancel-save-desktop');
        const nameInput = popupElement.querySelector('#name-desktop');
        const ratingInput = popupElement.querySelector('#rates-desktop');
        const comment = popupElement.querySelector('#comment-desktop');

        const checkBox = popupElement.querySelector('#public');



        // Test básico - agregar listener simple
        saveDesktop.addEventListener('click', async function (e) {
            const photoFile = document.getElementById('file-upload').files[0];
            if (nameInput.value === '') {

                showErrorNotification(`${translations[lang].nameRequired}`)
                return
            }
            if (!checkBox.checked) {
                if (!nameInput.value || !comment.value || !ratingInput.value || !photoFile) {

                    showErrorNotification(`${translations[lang].publicSaveRequirements}`)
                    return
                };

            }
            if (isOffensive(nameInput.value) || isOffensive(comment.value)) {

                showErrorNotification(`${translations[lang].offensiveWords}`)
                return
            }
            if (ratingInput && ratingInput.value.trim() !== '') {
                if (ratingInput.value > 5) {
                    showErrorNotification(`${translations[lang].invalidRating}`)
                    return
                }
                else if (ratingInput.value < 1) {
                    showErrorNotification(`${translations[lang].invalidRating}`)
                    return
                }
            }


            if (!esNombreValido(nameInput.value)) {

                showErrorNotification(`${translations[lang].invalidName}`)
                return
            }

            saveDesktop.textContent = `${translations[lang].saving}`
            let photoURL
            if (photoFile) {
                document.getElementById('file-upload').addEventListener('change', async function (e) {

                    if (photoFile.type.startsWith('image/')) {
                        showSweetAlert('Videos no permitidos', 'Solo es posible subir imagenes de tus lugares', 'warning', 'OK')
                        this.value = ''; // limpia el input
                        return
                    }
                });
                const userId = auth.currentUser.uid;
                const fileName = `${Date.now()}_${photoFile.name}`;
                const filePath = `places/${userId}/${fileName}`;
                const storage = getStorage();
                const storageRef = ref(storage, filePath);

                await uploadBytes(storageRef, photoFile);
                photoURL = await getDownloadURL(storageRef);

            }

            await saveCreatedPlace(position, nameInput.value, comment.value, ratingInput.value, photoURL)
            map.closePopup()
        });

        cancelSaveDesktop.addEventListener('click', function (e) {
            showSweetCancelAlert(`${translations[lang]?.cancelConfirmTitle}`,
                `${translations[lang]?.cancelConfirmText}`,
                `warning`,
                `<i class="fa fa-thumbs-up"></i>`,
                `<i class="fa fa-thumbs-down"></i>`)
        });






    }, 1000); // Aumentar delay para asegurar que todo esté listo

    // MÉTODO ADICIONAL: usar el evento popupopen como backup
    creationMarker.off('popupopen'); // Remover listeners previos
    creationMarker.on('popupopen', function (e) {



    });
}



export async function enableCreatePlace() {
    //Cambio del modo de mapa para una mejora visual
    inGlobal = false


    const mapContainer = document.getElementById('map-container')
    if (window.Capacitor.isNativePlatform()) {
        mapContainer.style.height = '70dvh'
        mapContainer.style.maxHeight = '70dvh'
    }
    mapContainer.innerHTML = '<div id="map" style="width:100%; height:100%;"></div>'
    mapContainer.style.overflowY = 'none'

    try {
        let userLocationIcon
        let marker
        let lat = 20, lng = 0, zoom = 2;
        if (navigator.geolocation) {
            try {
                const pos = await getActualPosition()
                lat = pos.lat;
                lng = pos.lng;
                zoom = 13

                userLocationIcon = L.divIcon({
                    className: 'user-location-icon',
                    html: '<div class="pulse"></div>',
                    iconSize: [25, 40],
                    iconAnchor: [12, 40],
                    popupAnchor: [0, -30]
                })

                marker = L.marker([lat, lng], { icon: userLocationIcon }).addTo(map);
                marker.on('click', () => {
                    showSweetAlert(`${translations[lang].ubiNow}`, `${translations[lang].ubiNowText}`, 'success', 'OK')
                })
            }
            catch (error) {
                console.warn('error en mapa', error)

            }
        }

        map = L.map('map').setView([lat, lng], zoom)
        
        map.on('moveend', () => {
            loadPlaces()
        })
        
        const atribution = '<small style="opacity:0.6;">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small>'

        // Selección robusta de tileLayer
        let tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
        if (
            (localStorage.getItem('theme') === 'dark')
        ) {
            tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
        }
        if (baseLayer) {
            map.removeLayer(baseLayer)
        }
        baseLayer = L.tileLayer(tileUrl, { attribution: atribution })
        baseLayer.addTo(map);


        if (creationMarker) {
            map.removeLayer(creationMarker)
        }
        const handleMapTap = async (event) => {
            try {
                // Get the click position
                const position = {
                    lat: event.latlng.lat,
                    lng: event.latlng.lng
                };

                // Remove existing marker if any
                if (creationMarker) {
                    creationMarker.remove()
                }


                // Show the place creation form
                showDesktopPlaceCreation(position);

            } catch (error) {
                console.error('Error handling map click:', error);
                showErrorNotification(`${translations[lang].errorOccurred}`);
            }
        };

        creationListener = handleMapTap
        map.on('click', creationListener)
        map.on('touchend', creationListener)

        showSweetAlert(`${translations[lang]?.confirmTitle}`, `${translations[lang]?.confirmText}`, 'info', `${translations[lang]?.confirmButton}`)

    }
    catch (error) {
        console.error(error)
        return
    }
}

let inGlobal = false
let globalPlaces = []
let PAGE_SIZE = 3
let currentIndex = 0
let isScrollListener = false
export async function obtainGlobalPlaces() {
    const user = auth.currentUser
    
    if (!user) return

    if (inGlobal) return

    inGlobal = true
    appState.map = false
    appState.create = false
    appState.home = true
    updateBarFromState()
    const map = document.getElementById('map')
    if (map) {
        map.style.display = 'none'
    }

    let mapContainer = document.getElementById('map-container')
    if (mapContainer) {

        mapContainer.style.overflowY = 'auto'

        mapContainer.style.justifyContent = 'initial'
        mapContainer.style.width = '100vw'
    }


    const q = query(collection(db, 'creados'),
        where('visibleToAll', '==', true))


    if (!q) return

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
        showErrorNotification('No hay lugares para mostrar')
        return
    }

    globalPlaces = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }))
    mapContainer.innerHTML = ''
    currentIndex = 0
    renderNextPlaces()


    mapContainer.addEventListener('scroll', async () => {
        const { scrollTop, scrollHeight, clientHeight } = mapContainer;

        if (!isScrollListener && scrollTop + clientHeight >= scrollHeight - 50) {
            if (currentIndex < globalPlaces.length) {
                isScrollListener = true
                showLoadingPrincSpinner()
                await renderNextPlaces()
                hideLoadingPrincSpinner()
                isScrollListener = false
            }
        }
    })




}




export function cancelCreationPlace() {

    if (creationListener) {
        map.off('click', creationListener)
        map.off('touchend', creationListener);
        creationListener = null
    }
    if (creationMarker) {

        creationMarker.remove()
        creationMarker = null

    }

    setTimeout(() => {
        map.invalidateSize()
    }, 300)


}





function esNombreValido(nombre) {
    const largoValido = nombre.length >= 3 && nombre.length <= 50;
    const caracteresPermitidos = /^[a-zA-Z0-9ÁÉÍÓÚáéíóúñÑ\s.,\-()']+$/.test(nombre);
    return largoValido && caracteresPermitidos;
}


export async function renderCreatedPlaces() {
    const user = auth.currentUser;
    if (!user) {
        showErrorNotification(`${translations[lang].mustBeLoggedIn}`)
        return
    }
    // Siempre obtener el contenedor actual del DOM
    const container = elements.createdsSitesList
    if (!container) {
        console.error('No se encontró el contenedor de los lugares creados')
        return
    }

    try {
        container.innerHTML = ''
        const q = query(collection(db, 'creados'),
            where('userId', '==', user.uid),
            where('visibleToAll', '==', true))
        const snapshot = await getDocs(q)
        if (snapshot.empty) {
            container.textContent = `${translations[lang].noPlacesCreated}`
            return
        }

        const placesPromises = snapshot.docs.map(async (docSnap) => {
            const place = docSnap.data()
            const placeId = docSnap.id
            const likesCount = await getLikesCount(place.place_id)
            return { place, placeId, likesCount }
        })

        const placesData = await Promise.all(placesPromises)

        placesData.forEach(({ place, placeId, likesCount }) => {

            const html = `
            <div class="card-sites" style="height:auto; min-height:auto;">
                <h3>${place.name || 'N/D'}</h3>
                <div class='container-createds-card rating'>
                    <span>${likesCount} ❤️</span>
                    <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
                </div>
                <div class='container-createds-card photo'>
                    ${place.photo ? `<img src='${place.photo}' alt='${place.name || 'Lugar creado'}' style='width: 100%; min-width:100%; height: auto; max-height: 400px; min-height:400px;  object-fit: cover;'>` : '<p>Sin imagen</p>'}
                </div>
               
                <div class="btn-renders">
                    <button class="btn btn-view-created" data-i18n="viewOnMap">Ver en mapa</button>
                    <button class="btn delete-btn" data-id="${placeId}" data-i18n="deleteCard">Eliminar</button>
                </div>
            </div>
            `
            container.insertAdjacentHTML('beforeend', html)
            applyTranslations()

            // Asignación segura y directa: solo al último botón añadido
            const lastSite = container.lastElementChild

            lastSite.querySelector('.btn.btn-view-created').addEventListener('click', () => {
                loadSharePlaces(place)
                menuOptions.classList.remove('active')
                closeCreatedsPanel()
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
            })

            lastSite.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const thePlaceId = btn.dataset.id
                    closeCreatedsPanel()
                    closeMenu()
                    Swal.fire({
                        title: `${translations[lang].deleteConfirmTitle}`,
                        text: `${translations[lang].deleteConfirmText}`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: `${translations[lang].deleteConfirmButton}`,
                        cancelButtonText: `${translations[lang].deleteCancelButton}`
                    })
                        .then(async res => {
                            if (res.isConfirmed) {
                                await deleteCreatedPlace(thePlaceId)
                            }
                        });
                })
            })
        })
    }
    catch (error) {
        console.error(error)
        return
    }
}


export async function renderPrivateCreatedsPlaces() {

    const user = auth.currentUser;
    if (!user) {
        showErrorNotification(`${translations[lang].mustBeLoggedIn}`)
        return
    }
    const container = elements.privatesCreatedsSitesList
    if (!container) {
        console.warn('container element not found in the DOM')
    }


    try {
        container.innerHTML = ''
        const q = query(collection(db, 'creados'),
            where('userId', '==', user.uid),
            where('visibleToAll', '==', false))
        const snapshot = await getDocs(q)



        if (snapshot.empty) {
            container.textContent = `${translations[lang].noPlacesCreated}`
            return
        }


        const placesPromises = snapshot.docs.map(async (docSnap) => {
            const place = docSnap.data()
            const placeId = docSnap.id
            return { place, placeId }
        })
        const placesData = await Promise.all(placesPromises)

        const newContainer = container.cloneNode(true)

        container.parentNode.replaceChild(newContainer, container)
        elements.privatesCreatedsSitesList = newContainer
        placesData.forEach(({ place, placeId }) => {
            const html = `
    <div class="card-sites" style="height:auto; min-height:auto;">
        <h3>${place.name || 'N/D'}</h3>

        <div class='container-createds-card rating'>
       
        <p>${place.rating ? '⭐'.repeat(place.rating) : ''}</p>
        </div>

          <div class='container-createds-card photo'>
                    ${place.photo ? `<img src='${place.photo}' alt='${place.name || 'Lugar creado'}' style='width: 100%; height: auto; max-height: 400px; min-height:400px; object-fit: cover;'>` : ''}
                </div>

        <div class="btn-renders">
            <button class="btn btn-view-created" data-i18n="viewOnMap">Ver en mapa</button>
            <button class="btn delete-btn" data-id="${placeId}" data-i18n="deleteCard">Eliminar</button>
        </div>
    </div>
    `

            newContainer.insertAdjacentHTML('beforeend', html)
            applyTranslations()

            // Asignación segura y directa: solo al último botón añadido
            const lastSite = newContainer.lastElementChild

            lastSite.querySelector('.btn.btn-view-created').addEventListener('click', () => {
                loadSharePlaces(place)
                menuOptions.classList.remove('active')
                closePrivatesCreatedsPanel()
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
            })

            lastSite.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const thePlaceId = btn.dataset.id
                    closePrivatesCreatedsPanel()
                    closeMenu()
                    Swal.fire({
                        title: `${translations[lang].deleteConfirmTitle}`,
                        text: `${translations[lang].deleteConfirmText}`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: `${translations[lang].deleteConfirmButton}`,
                        cancelButtonText: `${translations[lang].deleteCancelButton}`
                    })
                        .then(async res => {
                            if (res.isConfirmed) {
                                await deleteCreatedPlace(thePlaceId)
                                location.reload()
                            }
                        });
                })
            })


        })


    }
    catch (error) {
        console.error('Error visualizando lugares privados', error)
        return
    }


}


export async function renderNextPlaces() {
    let mapContainer = document.getElementById('map-container')
    if (!mapContainer) return

    const nextPlaces = globalPlaces.slice(currentIndex, currentIndex + PAGE_SIZE)

    for (const place of nextPlaces) {


        const placeId = place.id


        const likeButton = `<button class='button-likes' data-id='${placeId}'><img class='action-btn img-share' src='../images/favorite.webp'></button>`;

        const likesCount = await getLikesCount(placeId)
        const html = ` <div class="site">
        
                <strong><h2>${place.name || 'N/D'}</h2></strong>
                <div class='container-createds-card rating'>
                    ${place.visibleToAll ? `<p class='count-likes'> ${likesCount}❤️</p>` : ''}
                    <p>${place.rating ? '⭐'.repeat(place.rating) : ''}</p>
                </div>
                <div class='container-createds-card photo'>
                 <a  class='download-btn'>${place.photo ? `<img class="place-photo" style='max-width:100%; object-fit:cover; min-width:100%; max-height:400px; min-height:400px;' loading="lazy" src='${place.photo}' alt='${place.name || 'photo of created place'}'>` : ''}</a>   
                </div>
                <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                    <button class='share-ubi'><img class='action-btn' src='../images/location.webp' alt='Compartir ubicación'></button>
                    <button class='share-card'><img class='action-btn' src='../images/share (2).webp' alt='Compartir tarjeta'></button>
                </div>
                <div class='container-createds-card comment-card'>
                
                    <p class='coment-place'><strong style='opacity:.8;'>${place.visibleToAll ? place.createdBy : ''}</strong> <span> ${place.comment || ''}</span></p>
                    
                     <div class="comentarios-section" data-id="${placeId}" id="comentarios-${place.place_id}"></div>
                    
                        <div class='comentarios-input'>
                            <textarea class='text-comment' id="input-comentario-${placeId}" data-i18n-placeholder="writeYourComment"></textarea>
                            <button class="btn-comentar" type='button' data-id="${placeId}">
                                <img class='action-btn img-share' src='../images/send.webp' alt='Enviar comentario'>
                            </button>
                        </div>
                 </div>      
    </div>`


        
        mapContainer.insertAdjacentHTML('beforeend', html)

        const lastSite = mapContainer.lastElementChild
        let site = document.querySelectorAll('.site')
        if (site) {
            site.forEach(s => {
                s.style.animation = 'none'
            })
        }
        await loadComments(placeId);
        applyTranslations()
        // Like button
        const likeBtn = lastSite.querySelectorAll('.button-likes');
        if (likeBtn && place.visibleToAll) {
            likeBtn.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id
                    await toggleLike(id, btn);
                    const newCount = await getLikesCount(placeId);
                    const likeCountElement = lastSite.querySelector('.count-likes');
                    if (likeCountElement) {
                        likeCountElement.textContent = `${newCount} ❤️`;
                    }
                })
            })


        }

        // Share location button
        const shareUbiBtn = lastSite.querySelectorAll('.share-ubi');
        if (shareUbiBtn) {
            shareUbiBtn.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    shareCreatedPlaceGoogle(place);
                });
            })

        }

        // Share card button
        const shareCardBtn = lastSite.querySelectorAll('.share-card');
        if (shareCardBtn) {
            shareCardBtn.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    shareCreatedPlace(place);
                });
            })

        }

        // Load comments and likes if visible to all

        const count = await getLikesCount(placeId);
        const likeCountElement = lastSite.querySelectorAll('.count-likes');
        if (likeCountElement) {
            likeCountElement.forEach(l => {
                l.textContent = `${count} ❤️`
            })

        }
        // Add comment button handler
        const commentBtn = document.querySelectorAll('.btn-comentar');

        if (commentBtn) {
            commentBtn.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id
                    const input = document.getElementById(`input-comentario-${placeId}`)

                    if (!input) return

                    const commentText = input.value.trim()
                    if (!commentText) return
                    await addComment(commentText, placeId);
                    input.value = ''
                    await loadComments(id)
                })
            })
        }
    }
    currentIndex += nextPlaces.length
}




let currentSharedInfoWindow = null;
export async function loadSharePlaces(places) {

    if (currentSharedInfoWindow) {
        currentSharedInfoWindow.close()
    }
    
    try {
        showLoadingPrincSpinner()
        const snapShot = await getDoc(doc(db, 'creados', places.place_id));
        if (!snapShot.exists()) {
            showErrorNotification(`${translations[lang].loadPlaceGeneric}`);
            return;
        }

        const place = snapShot.data();
        place.place_id = places.place_id;

        // 1. Centrar el mapa y hacer zoom
        if(appState.map === null || appState.map === undefined || appState.map === false){
            await initMap()

        const atribution = '<small style="opacity:0.6;">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small>'

        // Selección robusta de tileLayer
        let tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
        if (
            (localStorage.getItem('theme') === 'dark')
        ) {
            tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
        }
        if (baseLayer) {
            map.removeLayer(baseLayer)
        }
        baseLayer = L.tileLayer(tileUrl, { attribution: atribution })
        baseLayer.addTo(map);

        setTimeout(() => {
            map.invalidateSize(true)
        },100)
        }
        else{
            map.setView(place.position, 17);
            map.setZoom(17);
        }
        

        const iconOpacity = place.visibleToAll ? '1' : '.5';
        const markerHtmlStyles = `
  background-color: #8A2BE2;
  width: 1rem;
  height: 1rem;
  display: block;
  
  top: -1rem;
  opacity: ${iconOpacity};
  position: relative;
  border-radius: 1.5rem 1.5rem 0;
  transform: rotate(45deg);
  border: 2px solid white;
`;

        const icon = L.divIcon({
            className: "custom-marker",
            html: `<span style="${markerHtmlStyles}"></span>`,
        });
        const marker = L.marker(place.position, { icon: icon })
        marker.addTo(map)
        const likesCount = await getLikesCount(place.place_id)
        const likeButton = `<button class='button-likes'><img class='action-btn img-share' src='../images/favorite.webp' alt='Me gusta'></button>`;

        const popupContent = `
            <div class="card-sites" style="height:450px;max-height:450px; overflow:auto;"   data-id='${place.place_id}'>
               
                <h2>${place.name || ''}</h2>
                <div class='container-createds-card rating'>
                    ${place.visibleToAll ? `<p class='count-likes'>${likesCount}</p>` : ''}
                    <p>${place.rating ? '⭐'.repeat(place.rating) : ''}</p>
                </div>
                <div class='container-createds-card photo'>
                    <a >${place.photo ? `<img class="place-photo" loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado\'s photo'}'>` : ''}</a>   
                </div>
                <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                    
                    <button  style='border-radius: ${place.visibleToAll ? "initial" : "6px"}'  class='share-ubi'><img class='action-btn' src='../images/location.webp' alt='Compartir ubicación'></button>
                    ${place.visibleToAll ? "<button class='share-card'><img class='action-btn' src='../images/share (2).webp' alt='Compartir tarjeta'></button>" : ''}
                    
                </div>
                <div class='container-createds-card comment-card'>
                    <p class='coment-place'><strong>${place.visibleToAll ? place.createdBy : ''}</strong><span>${place.comment || ''}</span></p>
                </div>`;

        // Bind popup to marker
        marker.bindPopup(popupContent, {
            maxWidth: 400,
            className: 'custom-popup',
            closeButton: true,
            
            autoClose: true,
            autoPan: true
        });
        hideLoadingPrincSpinner()
        // Handle popup open event
        marker.on('popupopen', async function () {
            document.querySelectorAll('.comment-place').forEach(card => {
                card.style.display = 'flex'
                card.style.flexDirection = 'column'
            })
            map.setView(place.position, 17);
            setTimeout(() => {
                map.panBy([0, -275])
            },200)


            const popup = this.getPopup();
            const popupElement = popup.getElement();

            // Close button
            const closeBtn = popupElement.querySelector('.close-window');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    map.closePopup(popup);
                });
            }

            const likeBtn = popupElement.querySelectorAll('.button-likes');
            if (likeBtn && place.visibleToAll) {
                likeBtn.forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const id = place.place_id
                        await toggleLike(id, btn);
                        const newCount = await getLikesCount(place.place_id);
                        const likeCountElement = popupElement.querySelector('.count-likes');
                        if (likeCountElement) {
                            likeCountElement.textContent = `${newCount} ❤️`;
                        }
                    })
                })

            }

            // Share location button
            const shareUbiBtn = popupElement.querySelector('.share-ubi');
            if (shareUbiBtn) {
                shareUbiBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    shareCreatedPlaceGoogle(place);
                });
            }

            // Share card button
            const shareCardBtn = popupElement.querySelector('.share-card');
            if (shareCardBtn) {
                shareCardBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    shareCreatedPlace(place);
                });
            }

            // Load comments and likes if visible to all
            if (place.visibleToAll) {
                const count = await getLikesCount(place.place_id);
                const likeCountElement = popupElement.querySelector('.count-likes');
                if (likeCountElement) {
                    likeCountElement.textContent = `${count} ❤️`;
                }
                // Add comments section to popup content
                const comentariosSection = `
                    <div class="comentarios-section" data-id="${place.place_id}" id="comentarios-${place.place_id}"></div>
                    <div class='comentarios-input'>
                        <textarea class='text-comment' id="input-comentario-${place.place_id}" placeholder="Escribe tu comentario..."></textarea>
                        <button class="btn-comentar" type='button' data-id="${place.place_id}">
                            <img class='action-btn img-share' src='../images/send.webp' alt='Enviar comentario'>
                        </button>
                    </div>`;

                // Add comments section to popup
                const popupContentElement = popupElement.querySelector('.card-sites');
                if (popupContentElement) {
                    const commentsContainer = document.createElement('div');
                    commentsContainer.className = 'comments-container';
                    if (place.visibleToAll) {

                        commentsContainer.innerHTML = comentariosSection;
                        popupContentElement.appendChild(commentsContainer);
                        applyTranslations()
                        // Load comments
                        loadComments(place.place_id);

                        // Add comment button handler
                        const commentBtn = popupContentElement.querySelector('.btn-comentar');
                        const commentInput = popupContentElement.querySelector('.text-comment');

                        if (commentBtn && commentInput) {
                            const handleComment = async () => {
                                const commentText = commentInput.value.trim();
                                if (commentText) {
                                    await addComment(commentText, place.place_id);
                                    commentInput.value = '';
                                    await loadComments(place.place_id);
                                }
                            };

                            commentBtn.addEventListener('click', handleComment);
                            commentInput.addEventListener('keypress', (e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleComment();
                                }
                            });
                        }
                    }
                }
            }
        });


        // Add marker to the map and open its popup
        marker.addTo(map);

        // Store the marker reference if needed
        currentMarker = marker;

        // Open the popup for this marker
        marker.openPopup();

        // All event listeners are now handled in the popupopen event above
        // No need for additional event listeners here as they're already set up

        // Store the marker to clean up later if needed
        currentMarker = marker;

    } catch (e) {
        console.error('Error in loadSharePlaces:', e);
        showErrorNotification(`${translations[lang].loadPlaceGeneric}`);
    }
}

