import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js"
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { translations, applyTranslations, getCurrentLanguage } from "./js/i18n.js";
import { App, auth, db, storage } from "./firebaseConfig.js";
import { deleteUserAccount } from "./delete-user.js";
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

import { addComment, loadComments } from "./comments.js";


// Capacitor is available globally via window.Capacitor

// Google Maps components will be accessed through getGoogleMapsComponents()
let userInitiatedSearch = false;
document.getElementById('search-normal')?.addEventListener('click', () => userInitiatedSearch = true);
document.getElementById('locate-me')?.addEventListener('click', () => userInitiatedSearch = true);

// Variables para almacenar los componentes de Google Maps


// Inicializa Firebase
export let isPremium = false;


let lang = getCurrentLanguage();





const appState = {
    home: false,
    map: true,
    create: false
}


// Elementos del DOM
const elements = {
    createdsSitesList: document.getElementById('sites-createds-list'),
    privatesCreatedsSitesList: document.getElementById('sites-createds-privates-list'),
    form: document.getElementById('form'),
    buttonShowCreateds: document.getElementById('get-createds'),
    buttonShowPrivateCreateds: document.getElementById('get-public-createds'),
    buttonCreatePlace: document.getElementById('create-place-btn'),
    buttonCloseCreateds: document.getElementById('close-createds-storage'),
    buttonClosePrivateCreateds: document.getElementById('close-private-createds-storage'),
    logOutButton: document.getElementById('log-out-button'),
    formSearchCard: document.getElementById('form-search-card'),
    pricesFilter: document.getElementById('prices'),
    ratingFilter: document.getElementById('rating'),
    filterQuantity: document.getElementById('quantity'),
    mapContainer: document.getElementById('map'),
    getSitesContainer: document.getElementById('get-sites'),
    getSitesCreatedContainer: document.getElementById('get-createds-sites'),
    sitesList: document.getElementById('sites-list'),
    botonGetSites: document.getElementById('get'),
    closeStorage: document.getElementById('closeStorage'),
    resetStorage: document.getElementById('resetStorage'),
    cityInput: document.getElementById('city'),
    openingSelect: document.getElementById('opening'),
    categorySelect: document.getElementById('category'),
    notificationBannerError : document.getElementById('error-notification-banner'),
    notificationErrorMessage : document.getElementById('error-notification-message'),
    notificationBanner: document.getElementById('notification-banner'),
    closeBanner: document.getElementById('close-notification'),
    
    notificationMessage: document.getElementById('notification-message'),
    buttonReiniMap: document.getElementById('reini-map')
};




let markers = [];
let places = [];
let map;
let infowindow;
// 👈 declaración global







const buttonToggleMenu = document.getElementById('toggle-menu');
const buttonCloseMenu = document.getElementById('close-menu');

if (buttonToggleMenu) {
    buttonToggleMenu.removeEventListener('click', showMenu);
    buttonToggleMenu.addEventListener('click', () => {

        showMenu()
    });
}

if (buttonCloseMenu) {
    buttonCloseMenu.removeEventListener('click', closeMenu);
    buttonCloseMenu.addEventListener('click', closeMenu);
}

let pendingDeepLinkPlaceId = null
// Asegurarse de que el DOM esté completamente cargado

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        
       
        const isNative = !!window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web';

        if (elements.closeBanner) {
            elements.closeBanner.addEventListener('click', hideNotification);
        }
        
        const col = await getDocs(collection(db, 'creados'))
        col.docs.forEach(async docSnap => {
            try {
                const place = docSnap.data()
                const placeId = place.place_id || docSnap.id;

                // Cargar comentarios
                await loadComments(placeId);

                // Configurar el manejador de eventos para el botón de comentar
                const btn = document.querySelector(`.btn-comentar[data-id="${placeId}"]`);
                if (btn) {
                    btn.addEventListener('click', async () => {
                        const input = document.getElementById(`input-comentario-${placeId}`);
                        if (input && input.value.trim()) {
                            await addComment(input.value.trim(), placeId);
                            await loadComments(placeId);
                            input.value = '';
                        }
                    });
                }

            } catch (error) {
                console.error('Error al cargar comentarios:', error);
            }

        })



    });



}







async function handleDeepLink(placeId) {
    console.log('handleDeepLink called with placeId:', placeId);

    // Validate placeId
    if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
        console.error('Invalid placeId provided:', placeId);
        showErrorNotification(`${translations[lang].invalidPlaceId}`);
        return false;
    }

    try {
        // Show loading state
        showLoadingPrincSpinner();


        const placeDoc = await getDoc(doc(db, 'creados', placeId));

        if (!placeDoc.exists()) {
            console.warn('No se encontró el documento con ID:', placeId);
            showErrorNotification(`${translations[lang].placeNotFound}`);
            return false;
        }


        const place = placeDoc.data();

        // Validate and normalize place data
        if (!place) {
            throw new Error('Place data is empty');
        }

        // Ensure we have valid coordinates
        let lat, lng;

        // Check for position in different possible formats
        if (place.position) {
            lat = parseFloat(place.position.lat || place.position._lat || 0);
            lng = parseFloat(place.position.lng || place.position._long || 0);
        } else if (place.location) {
            lat = parseFloat(place.location.lat || place.location._lat || 0);
            lng = parseFloat(place.location.lng || place.location._long || 0);
        } else {
            throw new Error('No se encontraron coordenadas en los datos del lugar');
        }

        // Validate coordinates
        if (!isValidLatLng(lat, lng)) {
            throw new Error(`Coordenadas inválidas: lat=${lat}, lng=${lng}`);
        }


        map.setView([lat, lng]);
        map.setZoom(15);
        // Load the place on the map

        await loadSharePlaces({ place_id: placeId });

        // Center and zoom the map

        
        console.log('Mapa centrado y con zoom en las coordenadas:', { lat, lng });



        return true;

    } catch (error) {
        console.error('Error en handleDeepLink:', error);

        // More specific error messages
        let errorMessage = `${translations[lang].loadPlaceGeneric}`;


        showErrorNotification(errorMessage);
        return false;
    } finally {
        // Always hide loading spinner
        hideLoadingPrincSpinner();
    }
}


const palabrasOfensivas = [
    "Asesinato",
    "asno",
    "bastardo",
    "Bollera",
    "Cabrón",
    "Caca",
    "Chupada",
    "Chupapollas",
    "Chupetón",
    "concha",
    "Concha de tu madre",
    "Coño",
    "Coprofagía",
    "Culo",
    "Drogas",
    "Esperma",
    "Fiesta de salchichas",
    "Follador",
    "Follar",
    "Gilipichis",
    "Gilipollas",
    "Hacer una paja",
    "Haciendo el amor",
    "Heroína",
    "Hija de puta",
    "Hijaputa",
    "Hijo de puta",
    "Hijoputa",
    "Idiota",
    "Imbécil",
    "infierno",
    "Jilipollas",
    "Kapullo",
    "Lameculos",
    "Maciza",
    "Macizorra",
    "maldito",
    "Mamada",
    "Marica",
    "Maricón",
    "Mariconazo",
    "martillo",
    "Mierda",
    "Nazi",
    "Orina",
    "Pedo",
    "Pendejo",
    "Pervertido",
    "Pezón",
    "Pinche",
    "Pis",
    "Prostituta",
    "Puta",
    "Racista",
    "Ramera",
    "Sádico",
    "Semen",
    "Sexo",
    "Sexo oral",
    "Soplagaitas",
    "Soplapollas",
    "Tetas grandes",
    "Tía buena",
    "Travesti",
    "Trio",
    "Verga",
    "vete a la mierda",
    "Vulva"
];

function isOffensive(phrase) {
    const textoLimpio = phrase.toLowerCase()
    return palabrasOfensivas.some(palabra =>
        textoLimpio.includes(palabra.toLowerCase())
    )

}

// Import the titles system initialization
export async function initSocial() {
    const isNative = !!window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web';

    if (isNative) {
        console.log('Initializing Google Sign-In for native platform...');
        const SocialLogin = window.Capacitor?.Plugins?.SocialLogin;
        if (!SocialLogin) {
            console.warn('SocialLogin plugin not available.');
            return;
        }

        try {
            const config = {
                google: {
                    webClientId: '940873643414-856bc0no2p33f06lr9netrff6c77miul.apps.googleusercontent.com',
                    scopes: ['profile', 'email', 'openid'],
                    forceCodeForRefreshToken: true
                }
            };

            console.log('Initializing SocialLogin with config:', config);
            await SocialLogin.initialize(config);
            console.log('SocialLogin initialized successfully for native platform');

            // Add a small delay to ensure initialization is complete
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (e) {
            console.error('SocialLogin initialization failed:', e);
            // Try to reinitialize after a delay if it fails
            setTimeout(initSocial, 2000);
        }
    } else {
        console.log('Running on web, using Firebase web SDK for Google Sign-In');
    }
}


function updateBarFromState(){
    const buttonHome = document.querySelector('.home')

    if(!buttonHome) return
    const buttonMap = document.querySelector('.globe')

    if(!buttonMap) return

    const buttonCreate = document.querySelector('.create')

    if(!buttonCreate) return

    if(appState.map === true){
            buttonMap.style.fontSize = '1.1em'
            buttonMap.style.opacity = '1'
    }
    else{
            buttonMap.style.fontSize = '1em'
            buttonMap.style.opacity = '.8'
        }

    if (appState.home === true) {
            buttonHome.style.fontSize = '1.1em'
            buttonHome.style.opacity = '1'
    }
    else{
        buttonHome.style.fontSize = '1em'
            buttonHome.style.opacity = '.8'
    }
    

    if(appState.create === true){
        buttonCreate.style.fontSize = '1.1em'
        buttonCreate.style.opacity = '1'
    }

    else{
        buttonCreate.style.fontSize = '1em'
        buttonCreate.style.opacity = '.8'
    }
}

window.addEventListener('load', async () => {

    showLoadingPrincSpinner()
    onAuthStateChanged(auth, async (user) => {
        const publicPages = ['login.html', 'register.html'];
        const currentPage = window.location.pathname.split('/').pop();

        if (!user) {
            // Si el usuario no está logueado y no está en una página pública, redirigir a login
            if (!publicPages.includes(currentPage)) {
                window.location.href = 'login.html';
            }
            return;
        } else {
            // Si el usuario está logueado y está en una página pública, redirigir a index
            if (publicPages.includes(currentPage)) {
                window.location.href = 'index.html';
            }
        }

        const params = new URLSearchParams(window.location.search)
        const placeId = params.get('creado')
        if (placeId) {
            console.log('ID de lugar encontrado en la URL:', placeId);
            pendingDeepLinkPlaceId = placeId;
        }
        // Espera a que el mapa esté inicializado

        try {
            document.getElementById('lang-selector').value = getCurrentLanguage();




            if (elements.cityInput) {
                elements.cityInput.value = arrayOfSearches.sort(() => Math.random() - 0.5)[0] || '';
            }

            setTimeout(() => {
                hideLoadingPrincSpinner()
            }, 300)

            try {

                if (localStorage.getItem('theme') === 'dark') {
                    body.classList.add('dark')
                }
                else {
                    body.classList.remove('dark')
                }

                applyTranslations()
                await initMap()
                initializeCapacitor()
                updateBarFromState()


            } catch (error) {
                console.warn('Error al inicializar la interfaz:', error);
            }

            setupPushNotifications()
            isPremium = await isUserPremiumAtStorage();

            // Modificar estilos del header basado en la plataforma
            const header = document.getElementById('header');
            if (header) {
                // Aplicar estilos específicos para web con !important
                if (window.Capacitor.getPlatform() === 'web') {
                    header.style.cssText += 'padding-top: 0 !important;';
                } else {
                    // Asegurarse de que en móvil se mantenga el padding original
                    header.style.cssText += 'padding-top: 8px !important;';
                }
                const buttonsForm = document.querySelectorAll('.form-buttons')
                if(buttonsForm){
                    buttonsForm.forEach(btn => {
                            if(window.Capacitor.getPlatform() === 'web'){
                                
                        btn.style.paddingBottom = '1rem'
                    }
                    else{
                        btn.style.paddingBottom = '2rem'
                        
                    }
                    })
                    
                }
                // Ocultar elementos premium si existen
                const premiumElements = ['premium-title', 'premium-li', 'show-premium'];
                premiumElements.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
            }

            if (isPremium) {
                document.getElementById('premium-title').style.display = 'none'
                document.getElementById('premium-li').style.display = 'none'
                document.getElementById('show-premium').style.display = 'none'
            }


        } catch (err) {
            console.warn('Error interno:', err);
            return
        }
    });
})

const mapBtn = document.getElementById('map-btn')
if (mapBtn) {
    mapBtn.addEventListener('click', async () => {
        // Map init - only if map element exists
        try {
            
            await initMap()
            appState.map = true
            appState.home = false
            appState.create = false
            updateBarFromState()
            
        }
        catch (error) {
            console.error('Error en inicialización del mapa')
            return
        }
    })
}


async function initMap() {
    inGlobal = false
    // Function to validate latitude and longitude values
    function isValidLatLng(lat, lng) {
        return (
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
        );
    }
    const mapContainer = document.getElementById('map-container')
    mapContainer.innerHTML = '<div id="map" style="width:100%; height:100%;"></div>'
    mapContainer.style.overflowY = 'none'
   

    map = L.map('map').setView([20, 0], 2)
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme:dark)')
    const atribution = '<small style="opacity:0.6;">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small>'

    // Selección robusta de tileLayer
    let tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
    if (
        (localStorage.getItem('theme') === 'dark') ||
        (prefersDarkScheme.matches && !localStorage.getItem('theme'))
    ) {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    }
    L.tileLayer(tileUrl, { attribution: atribution }).addTo(map);

    let newMap = document.getElementById('map')
    if (newMap) {
        if (newMap.style.display === 'none') {
            setTimeout(() => {
                newMap.style.display = 'block';
                map.invalidateSize()
            }, 300)
        }
    }

    try {
        let lat = 2, lng = 0, zoom = 2
        if (navigator.geolocation) {
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
                console.warn(geoError)
                showErrorNotification(`${translations[lang].geoFail}`);
            }
        }
        

        map.setView([lat,lng], zoom)
         const checkMapReady = setInterval(() => {

            if (map && pendingDeepLinkPlaceId) {
                console.log('Mapa listo, procesando deeplink:', pendingDeepLinkPlaceId);
                handleDeepLink(pendingDeepLinkPlaceId)
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

function logOutUser() {
    // Save the current language before clearing storage
    const currentLang = localStorage.getItem('lang') || 'es';

    signOut(auth)
        .then(() => {
            // Clear all storage except language preference
            const langToKeep = currentLang;
            localStorage.clear();
            sessionStorage.clear();

            // Restore the language preference
            if (langToKeep) {
                localStorage.setItem('lang', langToKeep);
            }

            // Redirect to login page
            window.location.href = 'login.html';
        })
        .catch((error) => {
            showErrorNotification(`${translations[lang].logoutError}`, error);
        });
}

// Función para manejar el cierre de sesión
document.addEventListener('click', (e) => {
    // Verificar si el clic fue en el botón de cierre de sesión o en un elemento dentro de él
    const logOutButton = e.target.closest('#log-out-button, #log-out-button *');
    if (logOutButton) {
        e.preventDefault();
        logOutUser();
    }
});

// ...

// Función para mostrar alerta con SweetAlert
export function showSweetAlert(title, text, icon, buttonText) {

    const lang = getCurrentLanguage();

    Swal.fire({
        title: title,
        text: text,
        icon: icon || 'info',
        confirmButtonText: 'OK',
        showClass: {
            popup: 'custom-show'
        },
        buttonsStyling: true,
        confirmButtonColor: '#3085d6',
    });
}

// Función para mostrar alerta de confirmación de eliminación
export function showSweetDeleteAlert(title, text, icon, buttonText, cancelButtonText) {
    closeSettings()
    const lang = getCurrentLanguage();

    Swal.fire({
        title: title,
        text: text,
        icon: icon || 'warning',
        showCancelButton: true,
        confirmButtonText: buttonText,
        cancelButtonText: cancelButtonText,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        buttonsStyling: true
    }).then(async (res) => {
        if (res.isConfirmed) {
            await deleteUserAccount();
        }
    });
}


export function showSweetCancelAlert(title, text, icon, buttonText, cancelButtonText) {

    const lang = getCurrentLanguage();

    Swal.fire({
        title: title,
        text: text,
        icon: icon || 'warning',
        showCancelButton: true,
        confirmButtonText: buttonText,
        cancelButtonText: cancelButtonText,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        buttonsStyling: true
    }).then(async (res) => {
        if (res.isConfirmed) {
            cancelCreationPlace();
        }
    });
}




// --- API pública compatible -------------------------
export function showNotification(message,  duration = 3000) {
    const elemBanner = elements.notificationBanner
    const elemMessage = elements.notificationMessage
    if(!elemBanner || !elemMessage) {
        console.warn('Notification elements not found');
        return;
    }
    elemMessage.textContent = message
    elemBanner.classList.add('visible')
    elemBanner.classList.remove('hidden')
    setTimeout(() => {
        hideNotification()
    }, duration)
}

export function showErrorNotification(message, duration = 3000) {
    const elemErrorBanner = elements.notificationBannerError
    const elemErrorMessage = elements.notificationErrorMessage
    if(!elemErrorBanner || !elemErrorMessage) {
        console.warn('Error notification elements not found');
        return;
    }
    elemErrorMessage.textContent = message
    elemErrorBanner.classList.add('visible')
    elemErrorBanner.classList.remove('hidden')
    setTimeout(() => {
        hideErrorNotification()
    }, duration)
}
function flashErrorScreen() {
    document.body.classList.add('flash-error');
    setTimeout(() => document.body.classList.remove('flash-error'), 500);
}

//Ocultar baner de notificación de error
function hideErrorNotification() {
    elements.notificationBannerError.classList.remove('visible')
    elements.notificationBannerError.classList.add('hidden')
}

//Ocultar banner de notificación
function hideNotification() {
    elements.notificationBanner.classList.remove('visible')
    elements.notificationBanner.classList.add('hidden')
}
// Moved to DOMContentLoaded event

//Abrir panel de sitios guardados


function displayCreatedsPlaces() {
    document.querySelector('.createds-places-panel').classList.add('active')
    renderCreatedPlaces()
    if (elements.form) {
        elements.form.style.display = 'flex'
    }
}

function displayCreatedsPrivatePlaces() {
    document.querySelector('.createds-privates-places-panel').classList.add('active')
    renderPrivateCreatedsPlaces()
    if (elements.form) {
        elements.form.style.display = 'flex'
    }

}





function resetearGuardadoYBusquedasDiarias() {
    if (localStorage.getItem('ultimaFecha') !== getHoy()) {
        localStorage.setItem('guardadoIlimitado', 'false')
        localStorage.setItem('busquedasIlimitadas', 'false')
        localStorage.setItem('fechaDesbloqueo', '')
        localStorage.setItem('contadorGuardados', '0')
        localStorage.setItem('contadorTrackings', '0')
        localStorage.setItem('contadorBusquedas', '0')
        localStorage.setItem('ultimaFecha', getHoy())
    }
}



/*
function puedeTrackear() {
    return puedeTrackearMas() && parseInt(localStorage.getItem('contadorTrackings') || '0') < maxTrackings
}

function puedeTrackearMas (){
    const hoy = getHoy()
    const ilimitado = parseInt(localStorage.getItem('busquedasIlimitadas', 'true'))
    const fechaDesbloqueo = localStorage.getItem('fechaDesbloqueo')
    return (ilimitado && fechaDesbloqueo === hoy)
}
export function desbloqueoTrackings() {
    return parseInt(localStorage.setItem('contadorTrackings', ''))
}
function incrementarContadorTrackings() {
    let count = parseInt(localStorage.getItem('contadorTrackings') || '0')
    count++
    return parseInt(localStorage.setItem('contadorTrackings', count))
}

*/
function puedeGuardarMas() {
    const hoy = getHoy()
    const fechaDesbloqueo = localStorage.getItem('fechaDesbloqueo')
    const ilimitado = localStorage.getItem('guardadoIlimitado') === 'true'

    return (ilimitado && fechaDesbloqueo === hoy)
}

function getHoy() {
    return new Date().toISOString().split('T')[0]
}
function puedeGuardar() {


    if (isPremium || puedeGuardarMas()) {
        return true;
    }
    return parseInt(localStorage.getItem('contadorGuardados') || '0') < maxCounterSaveds;
}

function puedeBuscar() {
    return isPremium || puedeBuscarMas() || parseInt(localStorage.getItem('contadorBusquedas') || '0') < maxSearches
}

function puedeBuscarMas() {
    const hoy = getHoy()
    const fechaDesbloqueo = localStorage.getItem('fechaDesbloqueo')
    const ilimitado = localStorage.getItem('guardadoIlimitado') === 'true'

    console.log('Fecha desbloqueo = HOY ?¿')
    console.log(hoy === fechaDesbloqueo)
    return (ilimitado && fechaDesbloqueo === hoy)
}
export function desbloqueoBusquedas() {
    return parseInt(localStorage.setItem('contadorBusquedas', '0')), parseInt(localStorage.setItem('contadorBusquedasSinAnuncios', '0'))
}
export function desbloqueoCreados() {
    return parseInt(localStorage.setItem('contadorCreados', '0'))
}




const maxCounterMenu = 3
function incrementarContadorMenu() {
    let count = parseInt(localStorage.getItem('contadorMenu') || '0')
    count++
    localStorage.setItem('contadorMenu', count.toString())
}

function incrementarContadorCreados() {
    let count = parseInt(localStorage.getItem('contadorCreados') || '0')
    count++
    localStorage.setItem('contadorCreados', count.toString())
}

function decrementarContadorCreados() {
    let count = parseInt(localStorage.getItem('contadorCreados') || '0')
    count--
    localStorage.setItem('contadorCreados', count.toString())
}





function incrementarContadorGuardados() {
    let count = parseInt(localStorage.getItem('contadorGuardados') || '0')
    count++
    counterSaveds = count;  // Actualiza la variable global
    localStorage.setItem('contadorGuardados', count.toString())
    return count;
}
//Eliminar los marcadores
function clearMarkers() {
    markers.forEach(marker => {
        marker.setMap(null); // Elimina el marcador del mapa
        if (marker.infoWindow) {
            marker.infoWindow.close(); // Cierra su infoWindow si existe
        }
    });
    markers = []; // Vacía el array
}
function resetMap() {
    clearMarkers()
    map.setCenter({ lat: 40.463667, lng: -3.74922 });
    map.setZoom(7);
}




export async function isUserPremiumAtStorage() {
    try {
        if (!auth.currentUser) {
            return false
        }
        let premiumInBackend = false

        const q = query(collection(db, 'usuarios'),
            where('userId', '==', auth.currentUser.uid))
        const snapshot = await getDocs(q)
        const doc = snapshot.docs.length > 0 ? snapshot.docs[0] : null

        if (doc && doc.data().premium) {
            premiumInBackend = true
        }
        const Purchases = window.Capacitor?.Plugins?.Purchases
        if (!Purchases) {
            return premiumInBackend
        }
        const purchaserInfo = await Purchases.getCustomerInfo()
        const entitlements = purchaserInfo?.entitlements?.active;

        const isEntitlementActive = entitlements['premium_upgrade'].isActive === true
        return isEntitlementActive || premiumInBackend
    }
    catch (error) {
        console.error('Error checking premium status')
        return false
    }
}





//Función para buscar por mi posición
// Validate latitude and longitude values
function isValidLatLng(lat, lng) {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
}


const COOL_DOWN = 10 * 1000 //10 segundos
const KEY_INTERSTITIAL = 'lastInterstitial'
const setLastTs = (ts = Date.now()) => localStorage.setItem(KEY_INTERSTITIAL, String(ts))
const getLastTs = () => parseInt(localStorage.getItem(KEY_INTERSTITIAL) || '0', 10)
const inCoolDown = () => Date.now() - getLastTs() < COOL_DOWN
const POP_TAG_ID = 'adsterra-popunder-script';
const popRemainingms = () => {
    const elapsed = Date.now() - getLastTs()
    return Math.max(COOL_DOWN - elapsed, 0)
}

function desactivateScriptAdds() {
    const script = document.getElementById(POP_TAG_ID)
    if (script) {
        script.remove()
        localStorage.removeItem(KEY_INTERSTITIAL)
    }
}
function activateScriptAds() {

    if (!inCoolDown()) {

        const scrptAds1 = document.createElement('script');
        scrptAds1.async = true;
        scrptAds1.src = '//earringprecaution.com/fb/fb/45/fbfb45a1fe3a64a392068aa878a6a4b6.js';
        scrptAds1.id = POP_TAG_ID
        scrptAds1.onload = () => setLastTs()

        document.head.appendChild(scrptAds1);
        setTimeout(() => {
            desactivateScriptAdds()
        }, COOL_DOWN)
    }

}
(function resumeScriptAds() {
    const remaining = popRemainingms()
    if (remaining > 0) {
        if (!document.getElementById(POP_TAG_ID)) {
            const scrptAds1 = document.createElement('script');
            scrptAds1.async = true;
            scrptAds1.src = '//earringprecaution.com/fb/fb/45/fbfb45a1fe3a64a392068aa878a6a4b6.js';
            scrptAds1.id = POP_TAG_ID
            document.head.appendChild(scrptAds1);
        }
        setTimeout(() => {
            desactivateScriptAdds()
        }, remaining)
    }
    else {
        localStorage.removeItem(KEY_INTERSTITIAL)
    }
})();

function showLoadingPrincSpinner() {
    const loader = document.getElementById('loader-princ');
    if (loader) {
        loader.style.opacity = '1'
        loader.style.visibility = 'visible'
    }
}

function hideLoadingPrincSpinner() {
    const loader = document.getElementById('loader-princ');
    if (loader) {
        loader.style.opacity = '0'
        loader.style.visibility = 'hidden'
    }
}


let currentSharedInfoWindow = null;
async function loadSharePlaces(places) {
    if (currentSharedInfoWindow) {
        currentSharedInfoWindow.close()
    }
    map.on('viewreset', () => {
        const mapContainer = document.getElementById('map-container')
        mapContainer.innerHTML = '<div id="map" style="width:100%; height:100%;"></div>'
        mapContainer.style.overflowY = 'none'


        map = L.map('map').setView([38.5648, -0.0679], 13)
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme:dark)')
        const atribution = '<small style="opacity:0.6;">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small>'

        // Selección robusta de tileLayer
        let tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
        if (
            (localStorage.getItem('theme') === 'dark') ||
            (prefersDarkScheme.matches && !localStorage.getItem('theme'))
        ) {
            tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
        }
        L.tileLayer(tileUrl, { attribution: atribution }).addTo(map);
    })


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
        if (map) {
            map.setView(place.position, 17);
            map.setZoom(17); // o el zoom que uses para mostrar lugares
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

        const likeButton = `<button class='button-likes'><img class='action-btn img-share' src='images/favorite.webp' alt='Me gusta'></button>`;

        const popupContent = `
            <div class="card-sites" data-id='${place.place_id}'>
                <button class='close-window'>X</button>
                <h2>${place.name || ''}</h2>
                <div class='container-createds-card rating'>
                    ${place.visibleToAll ? `<p class='count-likes'>0 ❤️</p>` : ''}
                    <p>${place.rating ? '⭐'.repeat(place.rating) : ''}</p>
                </div>
                <div class='container-createds-card photo'>
                    <a >${place.photo ? `<img class="place-photo" loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado\'s photo'}'>` : ''}</a>   
                </div>
                <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                    <button class='share-ubi'><img class='action-btn' src='images/location.webp' alt='Compartir ubicación'></button>
                    <button class='share-card'><img class='action-btn' src='images/share (2).webp' alt='Compartir tarjeta'></button>
                </div>
                <div class='container-createds-card comment'>
                    <p class='coment-place'><strong>${place.visibleToAll ? place.userName : ''}</strong>${place.comment || ''}</p>
                </div>`;

        // Bind popup to marker
        marker.bindPopup(popupContent, {
            maxWidth: 400,
            className: 'custom-popup',
            closeButton: false
        });
        hideLoadingPrincSpinner()
        // Handle popup open event
        marker.on('popupopen', async function () {
            map.setView(place.position, 17);
            setTimeout(() => {
                map.panBy([0, -250])
            })


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
                            <img class='action-btn img-share' src='images/send.webp' alt='Enviar comentario'>
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

function randomizaterPlaces(places) {
    return places.sort(() => Math.random() - 0.5)
}

function getPriceLabel(priceLevel) {
    if (priceLevel === undefined || priceLevel === null) return 'Precio desconocido';
    return '€'.repeat(priceLevel + 1); // price_level va de 0 a 4
}



//función para enganchar los listeners
function attachVisitButtonListeners(place) {
    // Selecciona SOLO los botones que acaban de crearse

    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            loadSharePlaces(place)

        })
    })
    document.querySelectorAll('.btn-view-created').forEach(btn => {
        btn.addEventListener('click', () => {
            loadSharePlaces(place)
            closeCreatedsPanel()
            closeMenu()
        })
    })
    document.querySelectorAll('.view-searchcard-btn').forEach(btn => {
        btn.addEventListener('click', () => {

            loadSharePlaces(place)
            closeSavedPlacesView()
            closeMenu()
        })
    })
    document.querySelectorAll('.view-created-searchcard-btn').forEach(btn => {
        btn.addEventListener('click', () => {

            loadSharePlaces(place)
            closeCreatedsPanel()

        })
    })
    document.querySelectorAll('.btn.share-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await sharePlace(place)
        })
    })
    document.querySelectorAll('.btn.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const buttonId = btn.dataset.id

            closeCreatedsPanel()
            closePrivatesCreatedsPanel()
            closeMenu()
            await deleteFromFirebase(buttonId)
        })
    })

    document.querySelectorAll('.delete-searchcard-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const placeId = btn.dataset.id
            await deleteCreatedPlace(placeId)
        })
    })
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await shareCreatedPlaceGoogle(place)
        })
    })

}

//función para borrar un sitio guardado
async function deleteFromFirebase(placeId) {
    try {
        await deleteDoc(doc(db, 'favoritos', placeId))

        renderCreatedPlaces()
        renderPrivateCreatedsPlaces()
    }
    catch (error) {
        console.error(error.message)

        showErrorNotification(`${translations[lang].deletePlaceError}`)
        return
    }

}

// Asume que el mapa está inicializado en otro lugar

// ======================
// FUNCIONES PRINCIPALES
// ======================



async function sharePlace(place) {
    try {
        const placeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
        if (!place.place_id) return
        const shareData = {
            title: place.name || 'Lugar Compartido',
            text: place.address || '¡Mira este lugar!',
            url: placeUrl
        }
        if (!navigator.share) {
            // Copiar enlace al portapapeles
            await navigator.clipboard.writeText(placeUrl);
            showNotification(`${translations[lang].linkCopied}`);
        }
        else if (navigator.share) {
            await navigator.share(shareData)
        }

    }
    catch (error) {
        console.log(error)
    }
}

let isSharing = false

async function shareCreatedPlaceGoogle(place) {
    if (isSharing) return
    isSharing = true
    try {
        const placeUrl = `https://www.google.com/maps/search/?api=1&query=${place.position.lat},${place.position.lng}`
        if (!place.position.lat || !place.position.lng) return
        if (window.Capacitor.isNativePlatform()) {
            const { Share } = window.Capacitor?.Plugins || {}
            if (Share) {
                await Share.share({
                    title: `Destino ${place.name} !!`,
                    text: 'Mira la ubi que he encontrado en UFind!',
                    url: placeUrl,
                    dialogTitle: 'Compartir Ubi'
                });
            }
        }
        else {
            if (navigator && navigator.canShare) {
                const shareData = {
                    title: place.name || 'Lugar Compartido',
                    text: place.address || '¡Mira este lugar!',
                    url: placeUrl
                }
                await navigator.share(shareData)
            }
        }


    }
    catch (err) {

        console.error(err)
        showErrorNotification(`${translations[lang].sharePlaceError}`)
        return
    }

}

async function shareCreatedPlace(place) {
    try {
        const deepLink = `https://ubifindapp.com/?creado=${place.place_id}`;
        const fallbackLink = `https://play.google.com/store/apps/details?id=com.ubifind.app`; // Si no la tiene 
        const message = `📍 ¡Descubre ${place.name} en Ubifind!\n\n🔗 ${deepLink}\n\n¿No tienes la app? Descárgala aquí: ${fallbackLink}`;
        //const placeUrl = `https://www.google.com/maps/search/?api=1&query=${place.position.lat},${place.position.lng}`
        if (!place.position.lat || !place.position.lng) return
        if (navigator.share) {
            const shareData = {
                title: place.name || 'Lugar Compartido',
                text: message,
                url: deepLink
            }

            await navigator.share(shareData)

        }
        else {

            // Copiar enlace al portapapeles
            await navigator.clipboard.writeText(message);
            showNotification(`${translations[lang].linkCopied}`);

        }

    }
    catch (error) {
        console.log(error)
        return
    }
}



if (elements.buttonShowCreateds) {

    elements.buttonShowCreateds.addEventListener('click', (e) => {
        e.preventDefault()

        displayCreatedsPlaces()
        

    })
}
else {
    console.warn('No se encontró el botón de mostrar los sitios creados en el DOM')
}

if (elements.buttonShowPrivateCreateds) {
    elements.buttonShowPrivateCreateds.addEventListener('click', (e) => {
        e.preventDefault()
        displayCreatedsPrivatePlaces()
    })
}
else {
    console.warn('No se encontró el botón de mostrar los sitios creados privados en el DOM')
}



const body = document.body


//comprobación de que tema tiene elegido el usuario
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme:dark)')
if (prefersDarkScheme.matches || localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark')


}
else {
    body.classList.remove('dark')
}







let confettiAnimation = null;

function showSuccessConfetti() {
    const container = document.getElementById('confeti-container');

    // Configurar estilos del contenedor
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    container.style.display = 'block';

    // Si ya existe una animación, la detenemos y la eliminamos
    if (confettiAnimation) {
        confettiAnimation.destroy();
    }

    // Cargar la animación de confeti
    confettiAnimation = lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: 'animaciones/bubble.json',
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice',
            className: 'confetti-animation'
        }
    });

    // Ocultar el contenedor cuando termine la animación
    confettiAnimation.addEventListener('complete', function () {
        container.style.display = 'none';
    });
}

const buttonToggle = document.getElementById('toggle')
if (buttonToggle) {
    buttonToggle.addEventListener('click', () => {
        body.classList.toggle('dark')
        localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light')

        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme:dark)')
        const atribution = '<small style="opacity:0.6;">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small>'

        // Selección robusta de tileLayer
        let tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
        if (
            (localStorage.getItem('theme') === 'dark') ||
            (prefersDarkScheme.matches && !localStorage.getItem('theme'))
        ) {
            tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
        }
        L.tileLayer(tileUrl, { attribution: atribution }).addTo(map);

    })
}
else {
    console.warn('No se encontró el boton toggle')
}




const buttonSettings = document.getElementById('settings-button')
let isInSettings = false
export function closeSettings() {
    const settingsDropdown = document.getElementById('settings-menu')

    if (!settingsDropdown) return; // Exit if settings menu doesn't exist

    if (settingsDropdown.style.display === 'block') {
        if (isInSettings) return
        isInSettings = true
        settingsDropdown.style.zIndex = '0'
        settingsDropdown.style.display = 'none'
    }
    else {
        isInSettings = false
        settingsDropdown.style.display = 'block'
        settingsDropdown.style.zIndex = '100000'
    }
}
if (buttonSettings) {
    buttonSettings.addEventListener('click', () => {
        closeSettings()
        animateButton()
    })
}
else {
    console.warn('No se encontró el boton de settings')
}




const searchCreatedsCard = document.getElementById('search-createds-card')

if (searchCreatedsCard) {
    searchCreatedsCard.addEventListener('input', async () => {
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
            <div class="site">
            <h3>${place.name || 'N/D'}</h3>
    
        
            <div class='container-createds-card rating'>
             <span>${likesCount}❤️</span>
            <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
           
            </div>
            <div class='container-createds-card photo'>
            
            ${place.photo ? `<img src='${place.photo}' alt='${place.name || 'Lugar creado'}' style='width: 100%; height: auto; max-height: 200px; border-radius: 8px; object-fit: cover;'>` : '<p>Sin imagen</p>'}
           
            </div>
            <div class='container-createds-card comment'>
           
            <p>${place.comment || 'N/D'}</p>
            </div>
    
            <div class="btn-renders">
                <button class="btn btn-view-created">Ver en mapa</button>
                <button class="btn share-btn">Compartir</button>
                <button class="btn delete-btn" data-id="${place.id}">Eliminar</button>
            </div>
        </div>
    `;
            container.insertAdjacentHTML('beforeend', html)

            attachVisitButtonListeners(place)
        })
    })

}
else {
    console.warn('No se encontró el searchcreatedscard')
}


const searchPrivateCreatedCards = document.getElementById('search-createds-private-card')
if (searchPrivateCreatedCards) {
    searchPrivateCreatedCards.addEventListener('input', async () => {
        const user = auth.currentUser

        if (!user) return
        const q = query(collection(db, 'creados'), where('userId', '==', user.uid),
            where('visibleToAll', '==', false))
        const snapshot = await getDocs(q)
        const places = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
        const searchTerm = searchCreatedsCard.value.toLowerCase()
        const findeds = places.filter(res => res.name.toLowerCase().includes(searchTerm) || res.address.toLowerCase().includes(searchTerm))

        const container = elements.privatesCreatedsSitesList
        container.innerHTML = ''

        findeds.forEach(place => {
            container.innerHTML += `
            <div class="site">
            <h3>${place.name || 'N/D'}</h3>
    
            <div class='container-createds-card category'>
            <label>Categoría</label>
            <p>${place.category || 'N/D'}
            </div>
    
            
    
            <div class='container-createds-card address'>
            <label>Dirección / Ciudad</label>
            <p>${place.address || 'N/D'}
            </div>
    
            <div class='container-createds-card rating'>
            <label>Valoración privada</label>
            <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
            </div>
    
            <div class='container-createds-card comment'>
            <label>Comentario Personal</label>
            <p>${place.comment || 'N/D'}</p>
            </div>
    
            <div class="btn-renders">
                <button class="btn btn-view-created">Ver en mapa</button>
                <button class="btn share-btn">Compartir</button>
                <button class="btn delete-btn" data-id="${place.id}">Eliminar</button>
            </div>
        </div>
    `;

            attachVisitButtonListeners(place)
        })
    })

}
else {
    console.warn('No se encontró el search de los lugares creados privados')

}


async function getActualPosition() {
    if (navigator.geolocation) {

        const position = await new Promise((resolve, reject) => {
            const options = {
                timeout: 300,
                maximumAge: 0,
                enableHighAccuracy: true
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, options)
        })
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        return { lat, lng }
    }
    else {
        console.error('no ubi')
        return
    }
}

//activar el modo de creación de lugar
let creationMarker = null;
let creationListener = null;

async function enableCreatePlace() {
    //Cambio del modo de mapa para una mejora visual
    inGlobal = false


    const mapContainer = document.getElementById('map-container')
    mapContainer.innerHTML = '<div id="map" style="width:100%; height:100%;"></div>'
    mapContainer.style.overflowY = 'none'

    try {
        let userLocationIcon
        let marker
        let lat = 20, lng = 0, zoom = 2;
        if(navigator.geolocation){
            try{
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
            catch(error){
                console.warn('error en mapa', error)
                
            }
        }
        
        map = L.map('map').setView([lat, lng], zoom)
        
        map.on('moveend', () => {
            loadPlaces()
        })
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme:dark)')
        const atribution = '<small style="opacity:0.6;">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small>'

        // Selección robusta de tileLayer
        let tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
        if (
            (localStorage.getItem('theme') === 'dark') ||
            (prefersDarkScheme.matches && !localStorage.getItem('theme'))
        ) {
            tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
        }
        L.tileLayer(tileUrl, { attribution: atribution }).addTo(map);

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

function cancelCreationPlace() {

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





const buttonDeleteAccount = document.getElementById('delete-account')
if (buttonDeleteAccount) {
    buttonDeleteAccount.addEventListener('click', () => {
        showSweetDeleteAlert(`${translations[lang]?.sure}`, `${translations[lang]?.deleteConfirmText}`, 'warning', `${translations[lang]?.deleteConfirmButton}`, `${translations[lang]?.deleteCancelButton}`)

    })
}
else {
    console.warn('No se encontró el boton de delete account')
}

let downloadURL

async function showDesktopPlaceCreation(position) {


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
                <small>¿Quieres que el lugar sea público? Marca esta casilla</small>
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

        <div class='inputContainer comment'>
            <label for='comment-desktop' data-i18n="commentForm">Una frase o texto que describa el lugar</label>
            <textarea id='comment-desktop' name='comment-desktop'></textarea>
        </div>

        <div class='inputContainer photo'>
            <label for="file-upload" class="custom-file-upload">📸</label>
            <input id="file-upload" type="file" accept="image/*" />
        </div>

        <div class='container-buttons'>
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
            if (checkBox.checked) {
                if (!nameInput.value || !comment.value || !ratingInput.value || !photoFile ) {
                    
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

        fileUpload.addEventListener('change', function (e) {
            console.log('📷 FILE INPUT CHANGED!', e.target.files);
            const file = e.target.files[0];
            if (file) {
                console.log('File selected:', file.name, file.type);
            }
        });




    }, 1000); // Aumentar delay para asegurar que todo esté listo

    // MÉTODO ADICIONAL: usar el evento popupopen como backup
    creationMarker.off('popupopen'); // Remover listeners previos
    creationMarker.on('popupopen', function (e) {



    });
}

// Función de test adicional
function testPopupElements() {
    if (!creationMarker) {
        console.log('No creation marker exists');
        return;
    }

    const popup = creationMarker.getPopup();
    if (!popup) {
        console.log('No popup exists');
        return;
    }

    const popupElement = popup.getElement();
    if (!popupElement) {
        console.log('No popup element exists');
        return;
    }

    console.log('Popup HTML:', popupElement.outerHTML);

    const saveBtn = popupElement.querySelector('#save-desktop');
    console.log('Save button found:', !!saveBtn);

    if (saveBtn) {
        console.log('Save button details:', {
            id: saveBtn.id,
            className: saveBtn.className,
            tagName: saveBtn.tagName,
            disabled: saveBtn.disabled
        });
    }
}

function esNombreValido(nombre) {
    const largoValido = nombre.length >= 3 && nombre.length <= 50;
    const caracteresPermitidos = /^[a-zA-Z0-9ÁÉÍÓÚáéíóúñÑ\s.,\-()']+$/.test(nombre);
    return largoValido && caracteresPermitidos;
}
let marcadoresCreados = [];
let marcador = null
async function loadPlaces() {
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



let currentInfoWindow = null;
let currentMarker = null;
async function addMarkerToPlace(place) {
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
        const likeButton = `<button class='button-likes' data-id=${place.place_id}><img class='action-btn img-share' src='images/favorite.webp'></button>`;

        // Create popup content
        const popupContent = `
            <div class="card-sites" data-id='${place.place_id}'>
                <button class='close-window'>X</button>
                <h2>${place.name || 'N/D'}</h2>
                <div class='container-createds-card rating'>
                    ${place.visibleToAll ? `<p class='count-likes'>${likesCount}❤️</p>` : ''}
                    <p>${place.rating ? '⭐'.repeat(place.rating) : ''}</p>
                </div>
                <div class='container-createds-card photo'>
                 <a  class='download-btn'>${place.photo ? `<img class="place-photo" style='max-width:100%; object-fit:cover; min-width:100%; max-height:400px; min-height:400px; border-radius:12px;' loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado\'s photo'}'>` : ''}</a>   
                </div>
                <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                    <button class='share-ubi'><img class='action-btn' src='images/location.webp' alt='Compartir ubicación'></button>
                    <button class='share-card'><img class='action-btn' src='images/share (2).webp' alt='Compartir tarjeta'></button>
                </div>
                <div class='container-createds-card comment'>
                
                    <p class='coment-place'><strong>${place.visibleToAll ? place.userName : ''}</strong> <br/> <span> ${place.comment || ''}</span></p>
                     <div class="comentarios-section" data-id="${place.place_id}" id="comentarios-${place.place_id}"></div>
                
                 </div>      
    </div>`


        // Configurar el nuevo infowindow

        currentMarker = marker;

        // Configurar el contenido y abrir
        currentMarker.bindPopup(popupContent, {
            maxWidth: 400,
            className: 'custom-popup',
            closeButton: false
        })

        // Configurar eventos del infowindow
        currentMarker.on('popupopen', async function () {

            map.setView(place.position, 13);
            setTimeout(() => {
                map.panBy([0, -250])
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
            const downloadBtn = popupElement.querySelector('.download-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();

                    downloadPhotoAndroid(place.photo)
                        .then((uri) => {
                            console.log('URI de la foto guardada:', uri)
                        })
                        .catch((error) => {
                            console.error('Error al descargar la foto:', error)
                        });
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
                            <img class='action-btn img-share' src='images/send.webp' alt='Enviar comentario'>
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


// Función para descargar fotos en Android
async function downloadPhotoAndroid(filepath) {
    const isNative = window.Capacitor?.isNativePlatform?.();

    if (!isNative) {
        // En navegador: abre directamente
        window.open(filepath, '_blank');
        return;
    }
    const { Filesystem } = window.Capacitor.Plugins
    const { getStorage, ref } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js")


    try {

        // Descargar archivo desde assets
        const storage = getStorage()
        const storageRef = ref(storage, filepath)
        const url = await getDownloadURL(storageRef)

        if (!url) {
            throw new Error('Error al visualizar la url');
            return;
        }

        const filename = `ubifindimg_${Date.now()}.jpeg`

        // Guardar en filesystem (Documentos)
        const result = await Filesystem.downloadFile({
            url,
            path: filename,
            directory: 'DOCUMENTS',

        })

        // Abrir con fileOpener2
        window.cordova.plugins.fileOpener2.open(
            result.path,
            `image/jpeg`,
            {
                error: (e) => {
                    console.error('No se pudo abrir el archivo', e);

                    showErrorNotification(`${translations[lang].downloadPdfError}`);
                },
                success: () => {

                }
            }
        );


    } catch (error) {
        console.error('Error al preparar PDF:', error);

        showErrorNotification(`${translations[lang].downloadPdfError}`);
    }
}



async function getLikesCount(placeId) {
    const likesRef = collection(db, 'creados', placeId, 'likes');
    const snapshot = await getDocs(likesRef);
    return snapshot.size; // Número de documentos = número de likes
}
desbloqueoCreados()

async function saveCreatedPlace(position, placeName, comment, rating, photoURL = '') {
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


            visibleToAll: buttonVisibleToAll.checked
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

async function toggleLike(placeId, button) {
    const user = auth.currentUser
   
    if(!button) return
    const likeRef = doc(db, 'creados', placeId, 'likes', user.uid);
    const docSnap = await getDoc(likeRef)
    
    if (docSnap.exists()) {
        // Si ya dio like, quitarlo
        await deleteDoc(likeRef);
         button.style.filter = 'brightness(1)'

    } else {
        // Si no, agregar like
        await setDoc(likeRef, {
            timestamp: Date.now()
        });
       
            button.style.filter = 'brightness(1.75)'
        
    }

    // (Opcional) actualizar contador total de likes
    await updateDoc(doc(db, 'creados', placeId), {
        likes: increment(docSnap.exists() ? -1 : 1)
    });
}

async function deleteCreatedPlace(placeId) {

    try {
        await deleteDoc(doc(db, 'creados', placeId))
        decrementarContadorCreados()
        renderPrivateCreatedsPlaces()
        renderCreatedPlaces()
        loadPlaces()
        showNotification(`${translations[lang].placeDeletedSuccess}`)
    }
    catch (error) {
        showErrorNotification(`${translations[lang].deletePlaceError}`)
        console.error(error.code)
    }
}



async function renderCreatedPlaces() {
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
            <div class="site">
                <h3>${place.name || 'N/D'}</h3>
                <div class='container-createds-card rating'>
                    <span>${likesCount} ❤️</span>
                    <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
                </div>
                <div class='container-createds-card photo'>
                    ${place.photo ? `<img src='${place.photo}' alt='${place.name || 'Lugar creado'}' style='width: 100%; height: auto; max-height: 200px; border-radius: 8px; object-fit: cover;'>` : '<p>Sin imagen</p>'}
                </div>
                <div class='container-createds-card comment'>
                    <p>${place.comment ? place.comment : 'N/D'}</p>
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


async function renderPrivateCreatedsPlaces() {

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
    <div class="site">
        <h3>${place.name || 'N/D'}</h3>

        <div class='container-createds-card rating'>
       
        <p>${place.rating ? '⭐'.repeat(place.rating) : ''}</p>
        </div>

         <div class='container-createds-card photo'>
            ${place.photo ? `<img loading='lazy' src='${place.photo}' alt='${place.name || 'Lugar creado'}' style='max-width: 100%; height: auto; border-radius: 8px;'>` : ''}
        </div>


        



        <div class='container-createds-card comment'>
        <p>${place.comment ? place.comment : ''}</p>
        </div>

        <div class="btn-renders">
            <button class="btn btn-view-created" data-i18n="viewOnMap">Ver en mapa</button>
            <button class="btn share-btn" data-i18n="share">Compartir</button>
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

            lastSite.querySelector('.share-btn').addEventListener('click', async () => {
                await shareCreatedPlaceGoogle(place)
            })
        })


    }
    catch (error) {
        console.error('Error visualizando lugares privados', error)
        return
    }


}
let inGlobal = false
async function renderGlobalPlaces() {
    const user = auth.currentUser
    if (!user) return
    if (inGlobal) return
    inGlobal = true
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

    if (!snapshot) return
    snapshot.forEach(async docSnap => {
        const place = docSnap.data()
        const placeId = docSnap.id
        const likeButton = `<button class='button-likes' data-id='${placeId}'><img class='action-btn img-share' src='images/favorite.webp'></button>`;
        
        const likesCount = await getLikesCount(place.place_id)
        const html = ` <div class="site">
        
                <strong><h2>${place.name || 'N/D'}</h2></strong>
                <div class='container-createds-card rating'>
                    ${place.visibleToAll ? `<p class='count-likes'> ${likesCount}❤️</p>` : ''}
                    <p>${place.rating ? '⭐'.repeat(place.rating) : ''}</p>
                </div>
                <div class='container-createds-card photo'>
                 <a  class='download-btn'>${place.photo ? `<img class="place-photo" style='max-width:100%; object-fit:cover; min-width:100%; max-height:400px; min-height:400px; border-radius:12px;' loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado\'s photo'}'>` : ''}</a>   
                </div>
                <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                    <button class='share-ubi'><img class='action-btn' src='images/location.webp' alt='Compartir ubicación'></button>
                    <button class='share-card'><img class='action-btn' src='images/share (2).webp' alt='Compartir tarjeta'></button>
                </div>
                <div class='container-createds-card comment'>
                
                    <p class='coment-place'><strong style='opacity:.8;'>${place.visibleToAll ? place.userName : ''}</strong> <br/> <span> ${place.comment || ''}</span></p>
                     <div class="comentarios-section" data-id="${place.place_id}" id="comentarios-${place.place_id}"></div>
                    
                        <div class='comentarios-input'>
                            <textarea class='text-comment' id="input-comentario-${placeId}" data-i18n-placeholder="writeYourComment"></textarea>
                            <button class="btn-comentar" type='button' data-id="${place.place_id}">
                                <img class='action-btn img-share' src='images/send.webp' alt='Enviar comentario'>
                            </button>
                        </div>
                 </div>      
    </div>`


        applyTranslations()
        mapContainer.insertAdjacentHTML('beforeend', html)

        const lastSite = mapContainer.lastElementChild
        let site = document.querySelectorAll('.site')
        if (site) {
            site.forEach(s => {
                s.style.animation = 'none'
            })
        }
        await loadComments(place.place_id);
        const downloadBtn = lastSite.querySelectorAll('.download-btn');
        if (downloadBtn) {
            downloadBtn.forEach(btn => {
                btn.addEventListener('click', (e) => {


                    downloadPhotoAndroid(place.photo)
                        .then((uri) => {
                            console.log('URI de la foto guardada:', uri)
                        })
                        .catch((error) => {
                            console.error('Error al descargar la foto:', error)
                        });
                });
            })

        }
        // Like button
        const likeBtn = lastSite.querySelectorAll('.button-likes');
        if (likeBtn && place.visibleToAll) {
            likeBtn.forEach(btn => {
               btn.addEventListener('click', async  (e) => {
                 e.stopPropagation();
                 const id = btn.dataset.id
                    await toggleLike(id, btn);
                    const newCount = await getLikesCount(place.place_id);
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

        const count = await getLikesCount(place.place_id);
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
                    await addComment(commentText, place.place_id);
                    input.value = ''
                    await loadComments(id)
                })
            })
        }
    })
}

const homeBtn = document.getElementById('home-btn')
if (homeBtn) {
    homeBtn.addEventListener('click', () => {
        renderGlobalPlaces()
        appState.home = true
    appState.map = false
    appState.create = false
    updateBarFromState()
    })
    
}
else {
    console.warn('No se encontró el botón en el DOM')

}



let isRotated = false
function animateButton() {
    if (isRotated) {
        buttonSettings.style.transform = 'rotate(0deg)';
    }
    else {
        buttonSettings.style.transform = 'rotate(180deg)'
    }

    isRotated = !isRotated
}



function showFilters(event) {
    // Si el clic viene de un select, ignorar
    if (event.target.closest('select')) return;


}



if (elements.buttonCreatePlace) {
    elements.buttonCreatePlace.addEventListener('click', async (e) => {
        e.preventDefault()

        await enableCreatePlace()
        appState.create = true
        appState.home = false
        appState.map = false
        updateBarFromState()

    })

}
else {
    console.warn('No se encontró el botón de crear lugar')
}


function closeCreatedsPanel() {
    document.querySelector('.createds-places-panel').classList.remove('active')
}

if (elements.buttonClosePrivateCreateds) {
    elements.buttonClosePrivateCreateds.addEventListener('click', closePrivatesCreatedsPanel)
}
else {
    console.warn('No se encontró el botón de cerrar panel de lugares creados privados')
}




function closePrivatesCreatedsPanel() {

    document.querySelector('.createds-privates-places-panel').classList.remove('active')

}



function showMenu() {
    /*
   const isNative = !!window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web';
  if (parseInt(localStorage.getItem('contadorMenu') || '0') >= maxCounterMenu) {
       if (!isNative) {
           activateScriptAds()
       }
       else {
           showInterstitial()
       }
       localStorage.setItem('contadorMenu', '0')
   }
       */



    menuOptions.classList.add('active')

}
function closeMenu() {
    menuOptions.classList.remove('active')


}
if (elements.buttonCloseCreateds) {
    elements.buttonCloseCreateds.addEventListener('click', () => {

        closeCreatedsPanel()
    })
}
else {
    console.warn('No se encontró el botón de cerrar panel de lugares creados')
}


const menuOptions = document.getElementById('get-options')


const settingsDropdown = document.getElementById('settings-menu')
document.addEventListener('click', (event) => {
    if (settingsDropdown &&
        settingsDropdown.style.display === 'block' &&
        !event.target.closest('#settings-menu') &&
        !event.target.closest('#settings-button')
    ) {
        closeSettings()
    }
    if (menuOptions && menuOptions.classList.contains('active') && !event.target.closest('#get-options') && !event.target.closest('#toggle-menu')) {
        closeMenu()
    }
})

const downloadPol = document.getElementById('down-poli')
const downloadTer = document.getElementById('down-term')


async function downloadPdf(filepath) {
    const isNative = window.Capacitor?.isNativePlatform?.();

    if (!isNative) {
        // En navegador: abre directamente
        window.open(filepath, '_blank');
        return;
    }
    const { Filesystem } = window.Capacitor.Plugins


    try {
        // Descargar archivo desde assets
        const response = await fetch(filepath);
        const blob = await response.blob();
        const base64Data = await convertBlobToBase64(blob);
        const filename = filepath.split('/').pop();

        // Guardar en filesystem (Documentos)
        await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: 'DOCUMENTS'
        });

        const { uri } = await Filesystem.getUri({
            path: filename,
            directory: 'DOCUMENTS'
        });

        // Abrir con fileOpener2
        window.cordova.plugins.fileOpener2.open(
            uri,
            'application/pdf',
            {
                error: (e) => {
                    console.error('No se pudo abrir el archivo', e);

                    showErrorNotification(`${translations[lang].downloadPdfError}`);
                },
                success: () => {

                }
            }
        );

    } catch (error) {
        console.error('Error al preparar PDF:', error);

        showErrorNotification(`${translations[lang].downloadPdfError}`);
    }
}
if (downloadPol || downloadTer) {
    if (lang === 'es') {
        downloadPol.addEventListener('click', () => downloadPdf('terms-politicy/politicas.pdf'))
        downloadTer.addEventListener('click', () => downloadPdf('terms-politicy/terminos.pdf'))
    }
    else if (lang === 'en') {
        downloadPol.addEventListener('click', () => downloadPdf('terms-politicy/privacy-en.pdf'))
        downloadTer.addEventListener('click', () => downloadPdf('terms-politicy/TERMS-AND-CONDITIONS-en.pdf'))
    }
    else if (lang === 'fr') {
        downloadPol.addEventListener('click', () => downloadPdf('terms-politicy/POLITIQUE-DE-CONFIDENTIALITÉ.pdf'))
        downloadTer.addEventListener('click', () => downloadPdf('terms-politicy/CONDITIONS-GÉNÉRALES-fr.pdf'))
    }
    else if (lang === 'de') {
        downloadPol.addEventListener('click', () => downloadPdf('terms-politicy/DATENSCHUTZRICHTLINIE.pdf'))
        downloadTer.addEventListener('click', () => downloadPdf('terms-politicy/ALLGEMEINE-GESCHÄFTSBEDINGUNGEN.pdf'))
    }
    else if (lang === 'it') {
        downloadPol.addEventListener('click', () => downloadPdf('terms-politicy/INFORMATIVA-SULLA-PRIVACY.pdf'))
        downloadTer.addEventListener('click', () => downloadPdf('terms-politicy/TERMINI-E-CONDIZIONI.pdf'))
    }
    else if (lang === 'pt') {
        downloadPol.addEventListener('click', () => downloadPdf('terms-politicy/POLÍTICA-DE-PRIVACIDADE.pdf'))
        downloadTer.addEventListener('click', () => downloadPdf('terms-politicy/TERMOS-E-CONDIÇÕES.pdf'))
    }
}
else {
    console.warn('No se encontraron los botones de descargar pdf')
}

async function showInterstitial() {
    if (!window.Capacitor.isNativePlatform()) return
    const { AdMob } = window.Capacitor.Plugins;
    if (!isPremium) {
        await AdMob.prepareInterstitial({
            adId: 'ca-app-pub-1639698267501945/5948105832',
            isTesting: true
        });

        await AdMob.showInterstitial();
    }
    else {
        return
    }

}

let addsCounter = 0



async function setupPushNotifications() {
    if (window.capacitor) {
        const PushNotifications = window.Capacitor.Plugins.PushNotifications;

        // 1. Pedir permisos
        const permissionResult = await PushNotifications.requestPermissions();

        if (permissionResult) {
            // 2. Registrar el dispositivo
            await PushNotifications.register();

            // 3. Token recibido
            PushNotifications.addListener('registration', (token) => {

                // Aquí podrías enviarlo a tu servidor
            });

            // 4. Error al registrar
            PushNotifications.addListener('registrationError', (err) => {
                console.error('❌ Error al registrar push:', err);
            });

            // 5. Notificación recibida en foreground
            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('🔔 Notificación recibida:', notification);
                showSweetAlert(notification.title, notification, 'success', 'OK');
            });

            // 6. Acción del usuario sobre la notificación
            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                console.log('👆 Notificación tocada:', action.notification);
            });

        }
        else {
            showNotification(`${translations[lang].pushDenied}`)
            return
        }
    }
}





function soundSucces() {
    let sound = new Audio('audios/bubble2.mp3')
    sound.play()
}


async function setFlyerPhoto(url) {
    const imgEl = document.querySelector('#customFlyer .img-flyer');
    if (!imgEl) return;

    if (!url) {
        imgEl.style.display = 'none'; // sin foto -> ocultar
        imgEl.removeAttribute('src');
        return;
    }

    imgEl.style.display = 'block';
    imgEl.crossOrigin = 'anonymous';
    imgEl.referrerPolicy = 'no-referrer';
    imgEl.src = url;

    try {
        if (imgEl.decode) {
            await imgEl.decode();
        } else {
            await new Promise((res, rej) => {
                imgEl.onload = res;
                imgEl.onerror = rej;
            });
        }
    } catch {
        // Fallback CORS: fetch -> blob
        try {
            const resp = await fetch(url, { mode: 'cors' });
            const blob = await resp.blob();
            imgEl.src = URL.createObjectURL(blob);
            await new Promise((res, rej) => {
                imgEl.onload = res;
                imgEl.onerror = rej;
            });
        } catch {
            imgEl.style.display = 'none';
            imgEl.removeAttribute('src');
        }
    }
}

// Devuelve base64 “puro” (sin prefijo)
async function convertBlobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}






// Handle URL parameters for web deep links
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Process deep link from URL parameters
async function processDeepLinkFromUrl() {
    // Check for place_id in URL parameters
    const placeId = getUrlParameter('place_id');
    if (placeId) {
        console.log('Processing deep link from URL with place_id:', placeId);
        await handleDeepLink(placeId);
        // Clean URL after processing (remove the parameters)
        const cleanUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

async function initializeCapacitor() {
    // Handle web deep links (for browsers like Brave)
    if (!window.Capacitor?.isNativePlatform?.()) {
        console.log('Running in web browser, initializing web deep links');

        // Process any existing deep link in the URL
        await processDeepLinkFromUrl();

        // Listen for future URL changes (for single-page applications)
        if (window.history) {
            const originalPushState = history.pushState;
            history.pushState = function () {
                originalPushState.apply(history, arguments);
                processDeepLinkFromUrl();
            };

            window.addEventListener('popstate', processDeepLinkFromUrl);
        }

        // Add keyboard event listener for Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const shouldExit = handleBackButton();
                if (shouldExit) {
                    handleBackButton();
                }
            }
        });

        return;
    }

    // Handle Capacitor deep links (for native apps)
    console.log('Capacitor detected, initializing native deep links');

    const AppPlugin = window.Capacitor?.Plugins?.App;
    if (AppPlugin?.addListener) {
        // Handle back button
        AppPlugin.addListener('backButton', () => {
            const shouldExit = handleBackButton();
            if (shouldExit) AppPlugin.exitApp?.();
        });

        // Handle app URL open events (for deep linking)
        AppPlugin.addListener('appUrlOpen', (data) => {
            console.log('App opened with URL:', data.url);

            // Extract place_id from URL
            const url = new URL(data.url);
            const placeId = url.searchParams.get('place_id');

            if (placeId) {
                console.log('Processing deep link with place_id:', placeId);
                handleDeepLink(placeId);
            }
        });
    } else {
        console.warn('Capacitor App plugin not available');
    }
}

