import { cacheManager } from "./cache.js";


import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js"
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { incrementarContadorCompartidosCreadosLogros, incrementarContadorCompartidosGuardadosLogro, incrementarContadorCreadosLogro, incrementarContadorGuardadosLogro, incrementarContadorVisitadosLogro, InitTitlesUi } from "./titles.js";
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



const VAPID_KEY = `BA586IeX-g7HOksHR2U6FupNrfy7KYDmgl993dRPGCwSDrH7gkrath3Ybe3HZT7eNpEwWCTC3bpdJeRY6AvbK1k`
const favoritosCollection = collection(db, "favoritos");
const placesCollection = collection(db, 'lugares')

const spinner = document.querySelector('.newplace-spinner')





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

    notificationBanner: document.getElementById('notification-banner'),
    closeBanner: document.getElementById('close-notification'),
    notificationBannerError: document.getElementById('notification-banner-error'),
    notificationMessage: document.getElementById('notification-message'),
    buttonReiniMap: document.getElementById('reini-map')
};



const locateMeBtn = document.getElementById('locate-me')
let isSaved = false;
let isVisited = false;
let markers = [];
let places = [];
let map;
let infowindow;
// 👈 declaración global

const PRODUCT_ID = 'android.test.purchased';

// MISMO ID que en Google Play/App Store

const imagenButtonMenu = document.querySelector('.icono.menu')
const imagenAjustesMenu = document.querySelector('.icono.ajustes')
const EN_MODO_PRUEBA = true; // Cambiar a false en producción
const PRODUCTO_ID = EN_MODO_PRUEBA ? 'android.test.purchased' : 'premium_mensual_real';

// store.js
let storeInitialized = false;


function initMenu() {
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
}
let pendingDeepLinkPlaceId = null
// Asegurarse de que el DOM esté completamente cargado

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {

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

        if (elements.closeBanner) {
            elements.closeBanner.addEventListener('click', hideNotification);
        }
        initializeCapacitor()
        const col = await getDocs(collection(db, 'creados'))
        col.forEach(async docSnap => {
            const place = docSnap.data()
            const placeId = place.place_id || docSnap.id;
            loadComments(placeId)

            const comentariosHTML = await loadComments(placeId);
            if (comentariosHTML) {
                document.getElementById(`comentarios-${placeId}`).textContent = comentariosHTML;
                const btn = document.querySelector(`.btn-comentar[data-id="${placeId}"]`);
                btn.addEventListener('click', async () => {
                    const input = document.getElementById(`input-comentario-${placeId}`);
                    if (input.value.trim()) {
                        await addComment(placeId, input.value.trim());
                        const nuevosComentarios = await loadComments(placeId);
                        if (nuevosComentarios) {
                            document.getElementById(`comentarios-${placeId}`).textContent = nuevosComentarios;
                            input.value = '';
                        }

                    }
                });
            }

        })



    });



}







async function handleDeepLink(placeId) {
    console.log('handleDeepLink llamado con placeId:', placeId);
    try {
        console.log('Buscando documento en Firestore...');
        const snapShot = await getDoc(doc(db, 'creados', placeId));

        if (snapShot.exists()) {
            console.log('Documento encontrado en Firestore');
            const place = snapShot.data();


            // Verificar y normalizar la estructura de ubicación
            let normalizedPlace = { ...place };

            // Si tiene position, lo movemos a location para mantener compatibilidad
            if (place.position) {
                console.log('Usando posición del campo position:', place.position);
                const lat = parseFloat(place.position.lat || place.position._lat);
                const lng = parseFloat(place.position.lng || place.position._long);

                if (!isValidLatLng(lat, lng)) {
                    throw new Error('Invalid coordinates in place data');
                }

                normalizedPlace.location = { lat, lng };
                normalizedPlace.position = { lat, lng }; // Ensure position is also valid
                console.log('Ubicación normalizada:', normalizedPlace.location);
            } else {
                throw new Error('Place has no position data');
            }

            try {
                console.log('Intentando cargar el lugar en el mapa...');
                await rePlaces(placeId);
                console.log('Lugar cargado exitosamente en el mapa');

                // Forzar un zoom adecuado
                if (map) {
                    map.setZoom(15);
                    console.log('Zoom establecido a 15');
                } else {
                    console.error('Error: El mapa no está disponible');
                }

                return true;
            } catch (loadError) {
                console.error('Error al cargar el lugar en el mapa:', loadError);
                showErrorNotification('Error al mostrar el lugar en el mapa');
                return false;
            }

        } else {
            console.warn('No se encontró el documento con ID:', placeId);
            showErrorNotification('Lugar no encontrado');
            return false;
        }
    } catch (error) {
        console.error('Error en handleDeepLink:', error);
        showErrorNotification('Error al cargar el lugar');
        return false;
    }
}
const arrayOfSearches = [
    "Restaurantes en Gijón",
    "Bares con terraza en Sevilla",
    "Cafeterías acogedoras en León, España",
    "Miradores en Granada",
    "Parques bonitos en Madrid",
    "Museos gratis en Barcelona",
    "Sitios románticos en Toledo",
    "Puestas de sol en Alicante",
    "Rutas de senderismo en Asturias",
    "Tiendas vintage en Bilbao",
    "Librerías curiosas en Salamanca",
    "Planes con niños en Zaragoza",
    "Restaurantes veganos en Málaga",
    "Lugares históricos en Mérida",
    "Mercados locales en Valencia",
    "Tapas en Logroño",
    "Sitios baratos para comer en Murcia",
    "Callejones con encanto en Cuenca",
    "Cafés con encanto en Medellín",
    "Heladerías artesanales en Buenos Aires",
    "Miradores con vistas en Bogotá",
    "Lugares para ver el atardecer en Cartagena, España",
    "Playas escondidas en Mallorca",
    "Sitios para fotos en Oaxaca",
    "Restaurantes con vistas en Santiago de Chile",
    "Parques naturales en Asturias",
    "Bares secretos en Ciudad de México",
    "Museos gratis en Lima",
    "Tiendas curiosas en Sevilla",
    "Lugares históricos en Quito",
    "Rincones románticos en Granada",
    "Rutas de senderismo en San José, Costa Rica",
    "Mercados locales en Puebla",
    "Hamburgueserías top en Barcelona",
    "Cafeterías instagrammeables en Málaga",
    "Pueblos mágicos cerca de CDMX",
    "Tapas buenas y baratas en Zaragoza",
    "Librerías escondidas en Montevideo",
    "Mejores tacos en Guadalajara",
    "Rooftops con ambiente en Valencia",
    "Brunch deliciosos en Bogotá",
    "Pizzas napolitanas en Madrid",
    "Cascadas cercanas a Medellín",
    "Playas para surfear en Lima",
    "Plan tranquilo en Córdoba, España",
    "Desayunos top en Buenos Aires",
    "Barrios con arte urbano en Santiago",
    "Lugares mágicos en Chiapas"
]

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


window.addEventListener('load', async () => {

    showLoadingPrincSpinner()
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'register.html';
            return;
        }

        const params = new URLSearchParams(window.location.search)
        const placeId = params.get('creado')
        if (placeId) {
            console.log('ID de lugar encontrado en la URL:', placeId);
            pendingDeepLinkPlaceId = placeId;
        }
        // Espera a que el mapa esté inicializado

        try {

            desbloqueoBusquedas()

            const isFirstTime = localStorage.getItem('firstTime');
            if (isFirstTime === 'true') {
                showSweetAlert('¿¿ Nuevo/a por aqui ??', 'Revisa cuando puedas tu correo electrónico para confirmar tu cuenta', 'success', 'OK')

                elements.cityInput.value = 'Lugares tranquilos en Calpe';
                localStorage.setItem('firstTime', 'false');
            }

            if (elements.cityInput) {
                elements.cityInput.value = arrayOfSearches.sort(() => Math.random() - 0.5)[0] || '';
            }



            // Map init - only if map element exists
            const mapElement = document.getElementById('map');
            if (mapElement) {
                const mapObserver = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            initMap();
                            obs.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1 });
                mapObserver.observe(mapElement);
            }

            setTimeout(() => {
                hideLoadingPrincSpinner()
            }, 300)
            if (!location.hash) {
                history.replaceState({ view: 'Home' }, '', '#home')
            }

            try {
                initMenu()
                await InitTitlesUi();


                // Luego inicializar títulos y logros

            } catch (error) {
                console.warn('Error al inicializar la interfaz:', error);
            }
            const showPremiumButton = document.getElementById('show-premium');
            async function showPremium() {
                const containerPremium = document.getElementById('confirm-premium');
                // Mostrar diálogo premium

                containerPremium.style.animation = 'zoomFadeIn .7s both';
                containerPremium.style.top = '0'
                // El listener de compra se añade dentro de deviceready, después de que
                // el SDK Purchases esté disponible.
            }
            showPremiumButton.addEventListener('click', showPremium);


            const buttonClosePremium = document.getElementById('close-premium')
            function closePremium() {
                const containerPremium = document.getElementById('confirm-premium');

                containerPremium.style.animation = 'none';
            }
            buttonClosePremium.addEventListener('click', closePremium)


            setupPushNotifications()
            isPremium = await isUserPremiumAtStorage();
            if (!window.Capacitor.isNativePlatform()) {
                document.getElementById('premium-title').style.display = 'none'
                document.getElementById('premium-li').style.display = 'none'
                document.getElementById('show-premium').style.display = 'none'
            }
            if (!isPremium) {




                resetearGuardadoYBusquedasDiarias();
            }
            if (isPremium) {
                document.getElementById('premium-title').style.display = 'none'
                document.getElementById('premium-li').style.display = 'none'
                document.getElementById('show-premium').style.display = 'none'
            }
            window.addEventListener("resize", () => {
                if (map) {
                    google.maps.event.trigger(map, "resize");
                    map.setCenter(map.getCenter());
                }
            });



        } catch (err) {
            console.warn('Error interno:', err);
            return
        }
    });
})



async function initMap() {
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

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps) {
        console.warn('Google Maps API no está cargada');
        return;
    }

    // Check if map element exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.warn('Elemento del mapa no encontrado');
        return;
    }

    try {
        map = new google.maps.Map(mapElement, {
            center: { lat: 40.463667, lng: -3.74922 },
            zoom: 6,
            mapTypeControl: false,
            streetViewControl: false,
            mapId: '65743a5870e61131c4e7b14f'
        });

        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    const options = {
                        timeout: 10000,
                        maximumAge: 0,
                        enableHighAccuracy: true
                    };

                    navigator.geolocation.getCurrentPosition(resolve, reject, options);
                });

                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                if (!isValidLatLng(lat, lng)) {
                    throw new Error('Invalid latitude or longitude values');
                }
                let { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
                const pinScaled = new PinElement({
                    scale: 1.3,
                    glyph: '😀',
                    background: '#5a4bff',
                    borderColor: '#000'
                });

                const marker = new AdvancedMarkerElement({
                    map,
                    position: { lat, lng },
                    content: pinScaled.element
                });

                markers.push(marker);
                map.setCenter({ lat, lng });
                map.setZoom(17);
            } catch (geoError) {
                showErrorNotification('No se pudo obtener la ubicación 😑');

            }
        }

        // Configurar el listener para actualizar marcadores al mover/zoom
        map.addListener('idle', () => {
            loadPlaces()
        });

        // Verificar si hay un deep link pendiente después de inicializar el mapa
        if (pendingDeepLinkPlaceId) {
            await handleDeepLink(pendingDeepLinkPlaceId);
            pendingDeepLinkPlaceId = null; // Limpiar después de usar
        }

    } catch (error) {
        console.error('Error al inicializar el mapa:', error);
        showErrorNotification('Error al cargar el mapa. Por favor, recarga la página.');
        return
    }
}

function logOutUser() {
    signOut(auth)
        .then(() => {
            window.location.href = 'login.html'
        })
        .catch((error) => {
            showErrorNotification('Ocurrió un error durante el logout', error)
            return
        })
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
    closeSettings()
    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonText: buttonText,
        showClass: {
            popup: 'custom-show'
        }
    });


}

export function showSweetDeleteAlert(title, text, icon) {
    closeSettings()
    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'

    }).then(async res => {
        if (res.isConfirmed) {
            await deleteUserAccount()
        }
    });


}

//Mostrar banner de notificación
export function showNotification(message, duration = 3000) {
    if (elements.notificationMessage && elements.notificationBanner) {
        elements.notificationMessage.textContent = message;
        elements.notificationBanner.classList.remove('hidden');
        elements.notificationBanner.classList.add('visible');
        setTimeout(() => {
            hideNotification();
        }, duration);
    } else {
        console.error('Notification elements not found');
    }
}

//Mostrar banner de notificación de error
export function showErrorNotification(message, duration = 3000) {
    soundError()
    flashErrorScreen();
    if (elements.notificationMessage && elements.notificationBanner) {
        elements.notificationMessage.textContent = message;
        elements.notificationBanner.classList.remove('hidden');
        elements.notificationBanner.classList.add('visibleError');
        setTimeout(() => {
            hideErrorNotification();
        }, duration);
    } else {
        console.warn('Notification elements not found');
    }
}


function flashErrorScreen() {
    document.body.classList.add('flash-error');
    setTimeout(() => document.body.classList.remove('flash-error'), 500);
}


//Ocultar baner de notificación de error
function hideErrorNotification() {
    elements.notificationBanner.classList.remove('visibleError')
    elements.notificationBanner.classList.add('hidden')
}

//Ocultar banner de notificación
function hideNotification() {
    elements.notificationBanner.classList.remove('visible')
    elements.notificationBanner.classList.add('hidden')
}
// Moved to DOMContentLoaded event

//Abrir panel de sitios guardados
export function displaySavedsPlaces() {
    document.querySelector('.saved-places-panel').classList.add('active')
    document.querySelector('.createds-places-panel').classList.remove('active')
    elements.form.style.display = 'flex'
}

function displayCreatedsPlaces() {
    document.querySelector('.createds-places-panel').classList.add('active')
    document.querySelector('.saved-places-panel').classList.remove('active')
    elements.form.style.display = 'flex'
}

function displayCreatedsPrivatePlaces() {
    document.querySelector('.createds-privates-places-panel').classList.add('active')
    document.querySelector('.saved-places-panel').classList.remove('active')

    elements.form.style.display = 'flex'
}

//Cerrar el panel de sitios guardados
function closeSavedPlacesView() {
    try {
        soundClick();
        const savedPanel = document.querySelector('.saved-places-panel');
        const createdPanel = document.querySelector('.createds-places-panel');

        if (savedPanel) savedPanel.classList.remove('active');
        if (createdPanel) createdPanel.classList.remove('active');
        if (searchCard) searchCard.value = '';
    } catch (error) {
        console.warn('Error in closeSavedPlacesView:', error);
    }
}

// Add event listener only if the element exists
if (elements.closeStorage) {
    elements.closeStorage.addEventListener('click', closeSavedPlacesView);
} else {
    console.warn('closeStorage element not found in the DOM');
}


let counterSaveds = parseInt(localStorage.getItem('contadorGuardados') || '0')
let maxCounterSaveds = 3
// Función para guardar lugares en Firestore
async function savePlaces(place, isVisited = false, isSaved = false) {
    renderSavedPlaces()
    places.push(place.place_id)
    try {
        const user = auth.currentUser;

        const placeData = {
            place_id: place.place_id,
            name: place.name,
            userId: user.uid,
            createdAt: serverTimestamp(),
            address: place.formatted_address,
            pricing: parseInt(place.price_level),
            location: {
                lat: place.geometry?.location.lat(),
                lng: place.geometry?.location.lng()
            },
            rating: place.rating || null,
            photos: place.photos
                ? place.photos.map(photo => photo.getUrl({ maxWidth: 400, maxHeight: 300 }))
                : [],
            open_now: place.opening_hours?.isOpen?.() ? 'Si' : 'No',
            timestamp: new Date(),
            visited: isVisited,
            saved: isSaved,
        };

        const q = query(collection(db, 'favoritos'),
            where('userId', '==', user.uid),
            where('place_id', '==', place.place_id));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {



            await addDoc(favoritosCollection, placeData);
            showNotification('¡Lugar guardado correctamente! 🤩​');
            incrementarContadorGuardados();
            incrementarContadorGuardadosLogro()
            soundSave()
            showSuccessConfetti();

            counterSaveds++;
        } else {


            showErrorNotification('Este lugar ya está en tus guardados 🥸​');

            return
        }

    } catch (error) {
        console.error("Error al guardar sin getDetails:", error);

        showErrorNotification("Error guardando el lugar");
    }
}

export function desbloqueoGuardado() {
    const hoy = getHoy()
    localStorage.setItem('guardadoIlimitado', 'true')
    localStorage.setItem('contadorGuardados', '')
    localStorage.setItem('fechaDesbloqueo', hoy)
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


function incrementarContadorBusquedas() {
    let contador = parseInt(localStorage.getItem('contadorBusquedas') || '0')
    contador++
    localStorage.setItem('contadorBusquedas', contador.toString())
}

function incrementarContadorBusquedasSinAnuncios() {
    let contador = parseInt(localStorage.getItem('contadorBusquedasSinAnuncios') || '0')
    contador++
    localStorage.setItem('contadorBusquedasSinAnuncios', contador.toString())
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
// Add event listener for reset map button if it exists
if (elements.buttonReiniMap) {
    elements.buttonReiniMap.addEventListener('click', (e) => {
        e.preventDefault();
        soundClick();
        resetMap();
        if (elements.cityInput) {
            elements.cityInput.value = '';
        }
    });
} else {
    console.warn('buttonReiniMap element not found in the DOM');
}



// Función para mostrar los marcadores
async function displayMarkers(places) {
    const bounds = new google.maps.LatLngBounds();
    const visitedsId = await checkVisitedsPlacesId();
    const savedsId = await checkSavedsPlacesId()
    const user = auth.currentUser

    if (!user) {
        showErrorNotification('No estás registrado')
        return
    }

    for (const place of places) {

        if (!place || !place.place_id || !place.geometry || !place.geometry.location) {
            continue; // Salta al siguiente si falta información
        }




        if (!place.geometry || !place.geometry.location) return;
        if (visitedsId.includes(place.place_id)) {
            place.visited = true
        }
        if (savedsId.includes(place.place_id)) {
            place.saved = true
        }
        if (place && typeof place !== 'undefined') {

            bounds.extend(place.geometry.location);
            let { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

            const pinScaled = new PinElement({
                scale: 1.1,
                glyph: '📍​',
                background: '#FF5A5F',
                glyphColor: "#000",
                borderColor: "#000"
            })
            const marker = new AdvancedMarkerElement({
                map,
                position: place.geometry.location,
                content: pinScaled.element,

                zIndex: 100,
            })
            marker.place_id = place.place_id
            markers.push(marker)


            marker.addListener('click', async () => {
                soundSucces()
                const content = `
            <div class="card-sites" style="overflow:auto">
            <button class='close-window'>X</button>
                <h2 text-align:center;">${place.name}</h2>
                <p><strong>Valoración:</strong> ${place.rating || 'N/A'} ⭐ (${place.user_ratings_total || 0} opiniones)</p>
                ${place.photos && place.photos.length > 0 && place.photos[0]?.getUrl
                        ? `<img src="${place.photos[0].getUrl({ maxWidth: 280 })}" class="marker-photo" alt="${place.name}" loading="lazy" style="width:100%; height:auto;" />`
                        : ''}
                <p><strong>Rango de Precio:</strong> ${place.price_level ? '💶'.repeat(place.price_level) : 'N/D'}</p>
                <p><strong>Dirección:</strong> ${place.formatted_address || place.vicinity}</p>
            
                
                
                <button class='save-btn' data-id="${place.place_id}">${place.saved ? 'Guardado' : 'Guardar'}</button>
                <button class='visit-btn'  data-id="${place.place_id}">${place.visited ? 'Visitado' : 'Marcar como visitado'}</button>
                
                
                <button class="share-btn">Compartir</button>
                 <button class='search' target='blank'>Ver en Google</button>
            </div>
            `;
                if (infowindow) infowindow.close();
                infowindow = new google.maps.InfoWindow()
                infowindow.setContent(content);

                // Abrir el InfoWindow directamente en la posición del marcador
                infowindow.open({
                    anchor: marker,
                    map,
                    shouldFocus: true
                });

                // Ajustar la vista del mapa para asegurar que el InfoWindow sea completamente visible

                // Maneja el evento cuando el contenido del InfoWindow está listo
                google.maps.event.addListenerOnce(infowindow, 'domready', async () => {
                    const saveBtn = document.querySelector('.save-btn')
                    const closeBtn = document.querySelector('.close-window')
                    const goToBtn = document.querySelector('.go-to-btn')
                    const visitBtn = document.querySelectorAll('.visit-btn');
                    const shareBtn = document.querySelector('.share-btn')
                    const confirmAddButton = document.getElementById('yes-publi')
                    const declineAddButton = document.getElementById('no-publi')
                    incrementarCounterClickInCards()
                    if (counterClicksInCards >= maxClickInCardWithoutAdds) {
                        showInterstitial()
                        counterClicksInCards = 0
                        localStorage.setItem('contadorClicksInCards', counterClicksInCards.toString())

                    }
                    if (place.saved) {

                        saveBtn.textContent = 'Guardado'
                    }
                    if (place.visited) {
                        visitBtn.textContent = 'Visitado'
                    }
                    if (visitBtn) {
                        visitBtn.forEach(btn => {
                            btn.addEventListener('click', async () => {
                                btn.disabled = true
                                btn.textContent = 'Visitado'

                                await markVisited(place)



                            })
                        })
                    }

                    closeBtn.addEventListener('click', () => {
                        soundClick()
                        infowindow.close()
                    })
                    saveBtn.addEventListener('click', async () => {

                        if (saveBtn) {

                            confirmAddButton.addEventListener('click', () => {

                                showRewardedAd()

                            })
                            declineAddButton.addEventListener('click', () => {
                                closeBannerRewarded()
                                return
                            })

                            if (!puedeGuardar()) {
                                saveBtn.textContent = 'Guardar'
                            }
                            else {
                                saveBtn.textContent = 'Guardado'
                            }

                            renderSavedPlaces()

                            counterSaveds++


                            const isSaved = true
                            const isVisited = place.visited || false
                            await savePlaces(place, isVisited, isSaved)
                            await markSaved(place.place_id)
                            place.saved = true

                        }

                    })
                    shareBtn.addEventListener('click', async () => {
                        await sharePlace(place)
                    })

                    document.querySelector('.route-btn')?.addEventListener('click', () => {
                        addToRoute(place)
                    })
                    document.querySelector('.search').addEventListener('click', async () => {
                        showPlaceInGoogle(place)
                    });
                });


            })
        }
        map.fitBounds(bounds);
    };
}



function showPlaceInGoogle(place) {
    try {
        // Verifica si place y place_id existen
        if (!place || !place.place_id) {
            console.error('El objeto place o place_id no está definido');

            showErrorNotification('No se pudo obtener la ubicación');
            return;
        }

        // Construye la URL adecuada según la plataforma
        const isCapacitor = typeof window.capacitor !== 'undefined';
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;

        // Abre la URL
        if (window.cordova && window.cordova.InAppBrowser) {
            // Para aplicaciones híbridas con Cordova
            window.cordova.InAppBrowser.open(url, '_system');
        } else if (window.open) {
            // Para navegadores web
            const newWindow = window.open(url, '_blank');
            if (!newWindow) {

                showErrorNotification('Por favor permite ventanas emergentes para esta acción');
                return
            }
        } else {
            // Fallback para dispositivos móviles
            window.location.href = url;
        }
    } catch (error) {
        console.error('Error al abrir Google Maps:', error);
        showErrorNotification('No se pudo abrir Google Maps');
        return
    }
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

//Marcar lugares como visitados y modificar su estado en firebase
async function markVisited(place) {
    if (place.visited) return
    const user = auth.currentUser
    const q = query(collection(db, 'favoritos'),
        where("place_id", "==", place.place_id),
        where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
        const place = docSnap.data()
        if (place.visited) return
    })
    showVisit()
    showNotification('¡Nuevo lugar visitado! 🚀')
    showConffetiForVisit()
    incrementarContadorVisitadosLogro()
    place.visited = true

    if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { visited: true });
        return
    }

}

//Función para marcar como guardado
async function markSaved(placeId) {

    const user = auth.currentUser
    if (!user) return
    const q = query(collection(db, 'favoritos'),
        where('place_id', '==', placeId),
        where('userId', '==', user.uid))
    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { saved: true });
    }
}



//Función para comprobar si está guardado
async function checkSavedsPlacesId() {
    const user = auth.currentUser
    if (!user) return
    const q = query(collection(db, 'favoritos'),
        where('saved', '==', true),
        where('userId', '==', user.uid))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => doc.data().place_id)
}

//Función para comprobar si está visitado
async function checkVisitedsPlacesId() {
    const user = auth.currentUser
    if (!user) return
    const q = query(collection(db, 'favoritos'),
        where('visited', '==', true),
        where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().place_id);
}

// Función para buscar lugares
async function searchPlaces() {
    const opening = elements.openingSelect.value;
    const rating = elements.ratingFilter.value;
    const city = elements.cityInput.value.trim();
    const pricing = elements.pricesFilter.value;

    if (!city) {

        showErrorNotification('Rellena el campo para buscar');
        return;
    }

    resetMap();
    clearMarkers();


    try {
        const [location] = await fetchGeocode(city);
        if (!location) {

            showErrorNotification('No se pudo encontrar la ubicación');
            return;
        }

        const lat = location.geometry.location.lat();
        const lng = location.geometry.location.lng();

        // Asegurarse de que el mapa esté centrado antes de mostrar los marcadores
        map.setCenter({ lat, lng });

        const cacheKey = `${city}-${rating}-${pricing}-${opening}`.toLowerCase();

        try {
            // Usar getOrSet para manejar la caché
            const places = await cacheManager.getOrSet(
                'placesCache',
                cacheKey,
                async () => {
                    const data = await fetchGoogleMapsData(lat, lng, rating, pricing, opening);
                    return Array.isArray(data) ? data : [];
                }
            );

            if (places && places.length > 0) {


                displayMarkers(places);
            } else {
                showErrorNotification('No se encontraron lugares con estas características 😑');
            }
        } catch (cacheError) {
            console.error('Error en la caché:', cacheError);
            // Si hay un error con la caché, intentar sin caché
            try {
                const places = await fetchGoogleMapsData(lat, lng, rating, pricing, opening);
                if (places && places.length > 0) {
                    displayMarkers(places);
                    showNotification(`Se encontraron ${places.length} lugares`);
                } else {
                    showErrorNotification('No se encontraron lugares con estas características');
                }
            } catch (fetchError) {
                console.error('Error al cargar lugares:', fetchError);
                showErrorNotification('Error al cargar los lugares. Intenta de nuevo.');
                return
            }
        }
    } catch (error) {
        console.error('Error en searchPlaces:', error);
        showErrorNotification('Ocurrió un error al buscar lugares. Verifica tu conexión.');
        return
    }
}


const businessCategories = {
    tattoo: {
        types: ['beauty_salon'],
        keywords: ['tattoo', 'tatuaje', 'ink studio'],
        icon: '🖌️'
    },
    barber: {
        types: ['barber'],
        keywords: ['barber', 'barbearía', 'corte masculino'],
        icon: '✂️'
    }
};




const geocodeCache = new Map()
// Función para geocodificar una ciudad
async function fetchGeocode(city) {
    if (geocodeCache.has(city)) {
        return geocodeCache.get(city)
    }

    return new Promise((resolve, reject) => {
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ address: city }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK) {
                resolve(results);
            } else {
                showErrorNotification('Error en la geolocalización 😑')
                reject('Geocode failed: ');
            }
        });
    });
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

async function searchByMyPosition() {
    const permissionStatus = await navigator.permissions?.query({ name: 'geolocation' }).catch(() => null);
    if (permissionStatus?.state === 'denied') {
        showErrorNotification('Activa los permisos de ubicación en ajustes del navegador');
        return;
    }

    try {
        resetMap()
        clearMarkers()
        const city = elements.cityInput

        const opening = elements.openingSelect.value
        const rating = elements.ratingFilter.value
        const pricing = elements.pricesFilter.value




        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                (error) => {
                    showErrorNotification('No se pudo obtener tu ubicación, asegurate de habilitar los permisos.')
                    reject(error)
                },
                { timeout: 10000, enableHighAccuracy: true }
            )
        });

        // Extract coordinates and validate them
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        if (!isValidLatLng(latitude, longitude)) {
            showErrorNotification('Coordenadas inválidas obtenidas de la geolocalización.');
            return;
        }

        // Create valid position object
        const userPosition = {
            lat: latitude,
            lng: longitude
        };
        let { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
        const pinScaled = new PinElement({
            scale: 1.3,
            glyph: '😀',
            background: '#5a4bff',
            borderColor: '#fff'
        });

        const marker = new AdvancedMarkerElement({
            map,
            position: userPosition,
            content: pinScaled.element
        });

        markers.push(marker);

        const cacheKey = `${city}-${rating}-${pricing}-${opening}`
        try {
            const places = await cacheManager.getOrSet(
                'placesCache',
                cacheKey,
                async () => {
                    const data = await fetchGoogleMapsData(latitude, longitude, rating, pricing, opening);
                    // Verificar que los datos sean válidos antes de guardar en caché
                    return Array.isArray(data) ? data : [];
                }
            );

            if (places && places.length > 0) {
                // Pequeño retraso para asegurar que el mapa esté listo
                setTimeout(() => {
                    displayMarkers(places);
                    showNotification(`Se encontraron ${places.length} lugares`);
                }, 300);
            } else {

                showErrorNotification('No se encontraron lugares con estas características 😑');
                return
            }
        } catch (cacheError) {
            console.error('Error en la caché:', cacheError);
            // Intentar cargar datos directamente si hay un error en la caché
            try {
                const places = await fetchGoogleMapsData(lat, lng, rating, pricing, opening);
                if (places && places.length > 0) {
                    displayMarkers(places);
                } else {

                    showErrorNotification('No se encontraron lugares con estas características');
                    return
                }
            } catch (fetchError) {
                console.error('Error al cargar lugares:', fetchError);
                showErrorNotification('Error al cargar los lugares. Intenta de nuevo.');
                return
            }
        }

    }
    catch (error) {
        console.error(error)
        showErrorNotification('No se encontraron lugares con estas características 😑')
        return
    }
}


const COOL_DOWN = 10 * 1000 //10 segundos
const KEY_INTERSTITIAL = 'lastInterstitial'
const setLastTs = (ts = Date.now()) => localStorage.setItem(KEY_INTERSTITIAL, String(ts))
const getLastTs = () => parseInt(localStorage.getItem(KEY_INTERSTITIAL) || '0', 10)
const inCoolDown = () => Date.now() - getLastTs() < COOL_DOWN
const POP_TAG_ID     = 'adsterra-popunder-script';
const popRemainingms = () => {
    const elapsed = Date.now() - getLastTs()
    return Math.max(COOL_DOWN - elapsed, 0)
}

function desactivateScriptAdds(){
    const script = document.getElementById(POP_TAG_ID)
    if(script){
        script.remove()
        localStorage.removeItem(KEY_INTERSTITIAL)
    }
}
function activateScriptAds() {
    const scrptAds1 = document.createElement('script');
    scrptAds1.async = true;
    scrptAds1.src = '//earringprecaution.com/fb/fb/45/fbfb45a1fe3a64a392068aa878a6a4b6.js';
    scrptAds1.id = POP_TAG_ID
    scrptAds1.onload = () => setLastTs()
    scrptAds1.onerror = () => console.error('Error al cargar el script de anuncios')
    document.head.appendChild(scrptAds1);
    setTimeout(() => {
        desactivateScriptAdds()
    }, COOL_DOWN)
}
(function resumeScriptAds(){
    const remaining = popRemainingms()
    if(remaining > 0){
        if(!document.getElementById(POP_TAG_ID)){
            const scrptAds1 = document.createElement('script');
    scrptAds1.async = true;
    scrptAds1.src = '//earringprecaution.com/fb/fb/45/fbfb45a1fe3a64a392068aa878a6a4b6.js';
    scrptAds1.id = POP_TAG_ID
    document.head.appendChild(scrptAds1);
        }
        setTimeout(() => {
         desactivateScriptAdds()   
        },remaining)
    }
    else{
        localStorage.removeItem(KEY_INTERSTITIAL)
    }
})();
async function fetchGoogleMapsData(lat, lng, rating, pricing, opening) {
    showLoadingSpinner();
    const city = elements.cityInput.value;
    const center = new google.maps.LatLng(lat, lng);
    const token = getSessionToken();
    const service = new google.maps.places.PlacesService(map);

    const request = {
        query: city.toLowerCase(),
        location: center,
        radius: 1000,
        sessionToken: token
    };
    if (parseInt(localStorage.getItem('contadorBusquedasSinAnuncios') || '0') >= maxSearchesWithoutAdds) {
                       
        const isNative = window.Capacitor.isNativePlatform()
        if (isNative) {

            showInterstitial()
            if (parseInt(localStorage.getItem('contadorBusquedas') || '0') >= maxSearches) {
                showSweetAlert('¿En busca de las búsquedas? 👀', 'Para buscar ilimitadamente puedes desbloquear premium, si no, puedes esperar 24 horas y podrás volver a realizar 10 búsquedas 😼', 'warning', 'OK')
                return
            }
        }
        else{
            activateScriptAds()
        }


        localStorage.setItem('contadorBusquedasSinAnuncios', '0')
 


}
    try {
        return new Promise((resolve) => {
            service.textSearch(request, (results, status) => {
                if (results && status === google.maps.places.PlacesServiceStatus.OK) {
                    let filteredPlaces = results
                    console.log(parseInt(localStorage.getItem('contadorBusquedasSinAnuncios') || '0'))

                    if (rating !== 'all') {
                        filteredPlaces = filteredPlaces.filter(res => res.rating >= rating)
                    }
                    if (pricing !== 'all') {
                        filteredPlaces = filteredPlaces.filter(res => res.price_level <= pricing)
                    }
                    if (opening !== 'all') {
                        filteredPlaces = filteredPlaces.filter(res => res.opening_hours.open_now)
                    }
                    setTimeout(() => {
                        hideLoadingSpinner()
                    }, 450)

                  
                    finalizarSesionBusqueda();
                    if (filteredPlaces) {

                        incrementarContadorBusquedas()
                        incrementarContadorBusquedasSinAnuncios()
                        setTimeout(() => {
                            soundBubble()
                        }, 450)

                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                        resolve(filteredPlaces)
                    }
                    else {
                        reject([])

                        showErrorNotification('No se encontraron lugares con estas características')
                        return
                    }
                }
            })
        })
    }
    catch (error) {
        console.log(error)
        return
    }
}


function finalizarSesionBusqueda() {
    sessionToken = null; // Se libera el token y se puede crear uno nuevo
}

let sessionToken = null
const SESSION_DURATION = 300000
let sessionStartTime = 0

function getSessionToken() {
    const now = Date.now()
    if (!sessionToken || (now - sessionStartTime) > SESSION_DURATION) {
        sessionToken = new google.maps.places.AutocompleteSessionToken()
        sessionStartTime = now

    }
    return sessionToken
}

let counterSearchesWithoutAdds = parseInt(localStorage.getItem('contadorBusquedasSinAnuncios') || '0')
let counterSearches = parseInt(localStorage.getItem('contadorBusquedas') || '0')
let maxSearchesWithoutAdds = 2
let maxSearches = 10
const maxClickInCardWithoutAdds = 10
let counterClicksInCards = parseInt(localStorage.getItem('contadorClicksInCards') || '0')

function incrementarCounterClickInCards() {
    let count = parseInt(localStorage.getItem('contadorClicksInCards') || '0')
    count++
    localStorage.setItem('contadorClicksInCards', count.toString())
}
// Funciones para manejar el spinner de carga
function showLoadingSpinner() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.opacity = '1'
        loader.style.visibility = 'visible'
    }
}

function hideLoadingSpinner() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.opacity = '0'
        loader.style.visibility = 'hidden'
    }
}

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
let searchedPlaces = [];


let currentSharedInfoWindow = null;
async function loadSharePlaces(places) {
    if (currentSharedInfoWindow) {
        currentSharedInfoWindow.close()
    }
    try {
        const snapShot = await getDoc(doc(db, 'creados', places.place_id));
        if (!snapShot.exists()) {
            showErrorNotification('Lugar no encontrado');
            return;
        }

        const place = snapShot.data();
        place.place_id = places.place_id;

        // 1. Centrar el mapa y hacer zoom
        if (map) {
            map.setCenter(place.position);
            map.setZoom(17); // o el zoom que uses para mostrar lugares
        }
        soundSucces()
        let { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
        const pinScaledVisible = new PinElement({
            scale: .8,
            glyphColor: '#fff',
            background: '#5a4bff',
            borderColor: "#000"
        });
        const pinScaledPrivate = new PinElement({
            scale: .8,
            glyphColor: '#ccc',
            background: '#0843c1',
            borderColor: "#000"
        });

        const marker = new AdvancedMarkerElement({
            position: place.position,
            map: map,
            title: place.name,

            content: place.visibleToAll
                ? pinScaledVisible.element // público
                : pinScaledPrivate.element // privado

        });
        const likeButton = "<button class='button-likes'> <img class='action-btn img-share' src='images/mg.webp'></img></button>"
        const contentInfowindow = `
            <div class="card-sites" data-id='${place.place_id}'>
                <button class='close-window'>X</button>
                <h2>${place.name || 'N/D'}</h2>
                 
                
                <div class='container-createds-card rating'>
                  
                    ${place.visibleToAll ? `<p class='count-likes'></p>` : ''}
                      <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
                </div>
                <div class='container-createds-card photo'>
                    ${place.photo ? `<img class="place-photo" loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado'}'>` : '<p>Sin imagen</p>'}
                </div>
                 <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                  
                    <button class='share-ubi'><img class='action-btn'src='images/ubicacion.webp' ></img></button>
                   <button style="align-self:end;" class='share-photo'><img class='action-btn' src='images/folleto.webp'></img></button>
                </div>
                <div class='container-createds-card comment'>
                    <p class='coment-place'><strong>${auth.currentUser.displayName}</strong>${place.comment || 'N/D'}</p>
                </div>
                ${place.visibleToAll ? `<div class="comentarios-section" data-id="${place.place_id}" id="comentarios-${place.place_id}">
                </div>` : ''}
               ${place.visibleToAll ? `<div class='comentarios-input'>
                 <textarea class='text-comment' id="input-comentario-${place.place_id}" placeholder="Escribe tu comentario..."></textarea> 
                  <button class="btn-comentar" data-id="${place.place_id}"><img class='action-btn img-share' src='images/mensaje.webp'></img></button>
                </div>` : ''}
            </div>`;


        // Crear y abrir la ventana de información

        currentSharedInfoWindow = new google.maps.InfoWindow({
            content: contentInfowindow,

        });

        try {

            currentSharedInfoWindow.open(map, marker);

        } catch (windowError) {

            throw windowError;
        }
        marker.addEventListener('click', () => {
            currentSharedInfoWindow.open(map, marker)
            const pinScaledVisible = new PinElement({
                scale: .8,
                glyphColor: '#fff',
                background: '#5a4bff',
                borderColor: "#000"
            });

        })
        // Add click listener to close button
        // Configurar eventos del infowindow
        google.maps.event.addListenerOnce(currentSharedInfoWindow, 'domready', async () => {

            const closeBtn = document.querySelectorAll('.close-window');
            const likesBtn = document.querySelectorAll('.button-likes');
            const shareBtn = document.querySelectorAll('.share');
            const showLikes = document.querySelectorAll('.count-likes');
            const shareUbiBtn = document.querySelectorAll('.share-ubi');
            const shareCardBtn = document.querySelectorAll('.share-card')
            const btnComment = document.querySelectorAll('.btn-comentar');
            const sharePhoto = document.querySelectorAll('.share-photo')

            const count = await getLikesCount(place.place_id);
            loadComments(place.place_id)
            place.visibleToAll ?
                showLikes.forEach(cnt => {
                    cnt.textContent = `${count} ❤️` || 0
                })
                : ''

            closeBtn.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentSharedInfoWindow.close()
                });
            });

            if (place.visibleToAll && likesBtn) {
                likesBtn.forEach(btn => {
                    btn.addEventListener('click', async () => {
                        await toggleLike(place.place_id);
                        const newCount = await getLikesCount(place.place_id);
                        showLikes.forEach(cnt => {
                            cnt.textContent = `${newCount} ❤️`
                        })
                    })


                })
            }

            btnComment.forEach(button => {
                button.addEventListener('click', async () => {
                    const input = document.getElementById(`input-comentario-${place.place_id}`);
                    const text = input.value.trim();
                    if (text) {
                        await addComment(text, place.place_id);
                        input.value = '';

                    }
                });
            });

            shareUbiBtn.forEach(button => {
                button.addEventListener('click', async () => {
                    await shareCreatedPlaceGoogle(place)
                });
            });
            sharePhoto.forEach(button => {
                button.addEventListener('click', async () => {
                    await shareCanvas(place)
                });
            })
            shareCardBtn.forEach(btn => {
                btn.addEventListener('click', async () => {
                    await shareCreatedPlace(place)
                })
            })
        });

        // Store the marker to clean up later if needed
        currentMarker = marker;

    } catch (e) {
        console.error('Error in loadSharePlaces:', e);
        showErrorNotification('Error al cargar el lugar compartido');
    }
}

function randomizaterPlaces(places) {
    return places.sort(() => Math.random() - 0.5)
}

function getPriceLabel(priceLevel) {
    if (priceLevel === undefined || priceLevel === null) return 'Precio desconocido';
    return '€'.repeat(priceLevel + 1); // price_level va de 0 a 4
}

// Función para mostrar lugares guardados
async function renderSavedPlaces() {

    let saveds = []
    const visitedsId = await checkVisitedsPlacesId();
    const user = auth.currentUser
    if (!user) {
        showNotification('No estas registrado')
        return
    }
    const q = query(collection(db, 'favoritos'),
        where('userId', '==', user.uid),
        where('saved', '==', true))
    const snapshot = await getDocs(q)
    const container = elements.sitesList;
    container.innerHTML = '';

    if (snapshot.empty) {
        container.innerHTML = '<span>Aún no hay sitios guardados</span>';
        return;
    }
    appState.home = false
    snapshot.forEach(docSnap => {
        const place = docSnap.data();


        place.visited = visitedsId.includes(place.place_id);
        saveds.push(place);
        places.push(place);

        // Intentar obtener la URL de la imagen de diferentes maneras
        let imageUrl = '';
        if (place.photo) {
            imageUrl = place.photo;
        } else if (place.photos && place.photos.length > 0) {
            // Si hay un array de fotos, tomar la primera
            imageUrl = place.photos[0];
            if (typeof imageUrl === 'object' && imageUrl.getUrl) {
                // Si es un objeto de Google Maps Photo
                imageUrl = imageUrl.getUrl({ maxWidth: 400 });
            }
        }

        const html = `
        <div class="site">
        <h3>${place.name || 'Sin nombre'}</h3>
         <p class='rating'>Valoración: ${place.rating ? '⭐'.repeat(Math.round(place.rating)) : 'N/D'} </p> 
        
         <p class="price">Rango de Precio: ${place.pricing ? '💶'.repeat(place.pricing) : 'N/D'}</p>
         
        <p>${place.address || 'Dirección no disponible'}</p>
        <div class="btn-renders">
            <button class='visit-save-btn' data-id='${place.place_id}'> ${place.visited ? 'Visitado' : 'Marcar como visitado'}</button>
            <button class="btn btn-view" 
                    data-placeid="${place.place_id}" 
                    data-lat="${place.location?.lat}" 
                    data-lng="${place.location?.lng}">
                Ver en mapa
            </button>
            <button class="btn share-btn">Compartir</button>
            <button class="btn delete-btn" data-id="${docSnap.id}">Eliminar</button>
        </div>
    </div>
`;
        container.insertAdjacentHTML('beforeend', html)
        const lastSite = container.lastElementChild
        lastSite.querySelector('.btn-view').addEventListener('click', () => {
            flyToPlace(place)
            closeSavedPlacesView()
            menuOptions.classList.remove('active')
            javascript
            lTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        })
        lastSite.querySelectorAll('.btn.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const placeId = btn.dataset.id;
                await deleteFromFirebase(placeId)
                renderCreatedPlaces()
                renderSavedPlaces()
            })
        })
        lastSite.querySelectorAll('.visit-save-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                closeSavedPlacesView()
                await markVisited(place.place_id)
                closeMenu()

                showNotification('¡Nuevo lugar visitado! 🚀')
                showConffetiForVisit()
                incrementarContadorVisitadosLogro()

            })
        })

        lastSite.querySelector('.btn.share-btn').addEventListener('click', async () => {
            await sharePlace(place)
        })
        elements.sitesList.addEventListener('click', async (e) => {
            const btn = e.target.closest('button')
            if (!btn) return
            if (btn.classList.contains('visit-save-btn')) {
                const placeId = btn.dataset.id;
                await markVisited(placeId)
                btn.textContent = 'Visitado'
                btn.classList.add('visited-place')
            }
        })

    });

}

//función para enganchar los listeners
function attachVisitButtonListeners(place) {
    // Selecciona SOLO los botones que acaban de crearse

    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const position = place.position
            flyToPlace(place)

        })
    })
    document.querySelectorAll('.btn-view-created').forEach(btn => {
        btn.addEventListener('click', () => {
            loadSharePlaces(place)

        })
    })
    document.querySelectorAll('.view-searchcard-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('click')
            flyToPlace(place)
            closeSavedPlacesView()
            closeMenu()
        })
    })
    document.querySelectorAll('.view-created-searchcard-btn').forEach(btn => {
        btn.addEventListener('click', () => {

            loadSharePlaces(place)
            closeCreatedsPanel()
            closeMenu()
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
        showNotification('¡ Lugar eliminado correctamente ! 🤩 ')
        renderSavedPlaces()
    }
    catch (error) {
        console.error(error.message)

        showErrorNotification('No se pudo eliminar el lugar 😑')
        return
    }

}
const buttonStopRoute = document.getElementById('stop-route');
let directionsRendererGo = null;
let watchId = null;
let destinationMarker = null;
let directionsService = null;
let lastPositions = [];
// Asume que el mapa está inicializado en otro lugar

// ======================
// FUNCIONES PRINCIPALES
// ======================

/**
 * Inicializa los servicios de direcciones
 */
async function initDirectionServices() {
    if (!directionsService) {
        directionsService = new google.maps.DirectionsService();
    }

    if (!directionsRendererGo) {
        directionsRendererGo = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#5a4bff',
                strokeWeight: 6,
                strokeOpacity: 0.8
            }
        });
    }
}

/**
 * Establece un destino y comienza el seguimiento de ruta
 * @param {Object} place - Objeto con la ubicación de destino
 */
/*
let counterTrackings = 0
let maxTrackings = 1
async function setDestination(place) {
    
    counterTrackings++
    if (!puedeTrackear() && !isUserPremiumAtStorage()) {
        containerPremium.style.animation = 'zoomFadeIn .4s'
        return
    }
    else if (puedeTrackear && !isUserPremiumAtStorage() || counterTrackings < maxTrackings ) {
        incrementarContadorTrackings()

        try {      // Inicializar servicios si no están listos
            await initDirectionServices();

            // Configurar destino
            const destination = {
                lat: place.geometry?.location?.lat() || place.lat,
                lng: place.geometry?.location?.lng() || place.lng
            };



            // Crear marcador de destino
            await createDestinationMarker(destination);

            // Iniciar seguimiento de posición
            startPositionTracking(destination);

            buttonStopRoute.style.display = 'block';
            if (infowindow) infowindow.close();

        } catch (error) {
            console.error("Error en setDestination:", error);
            showErrorNotification('Error al configurar el destino');
        }
    }

}

/**
 * Versión para lugares guardados
 */
async function setDestinationInSaved(place) {
    await setDestination({
        geometry: {
            location: {
                lat: () => place.location.lat,
                lng: () => place.location.lng
            }
        }
    });
}

/**
 * Versión para lugares creados
 */
async function setDestinationInCreated(place) {
    await setDestination({
        geometry: {
            location: {
                lat: () => place.position.lat,
                lng: () => place.position.lng
            }
        }
    });
}

// ======================
// FUNCIONES DE APOYO
// ======================

/**
 * Crea un marcador en el destino

async function createDestinationMarker(destination) {
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

    // Eliminar marcador anterior si existe
    if (destinationMarker) {
        destinationMarker.map = null;
    }
    if (markers.length >= 1) {
        clearMarkers()
    }
    const pin = new PinElement({
        background: "#EA4335",
        borderColor: "#FFFFFF",
        glyph: "📍",
        scale: 1.5
    });

    destinationMarker = new AdvancedMarkerElement({
        map: map,
        position: destination,
        content: pin.element,
        title: 'Destino'
    });
}


function startPositionTracking(destination) {
    const UPDATE_INTERVAL = 2000; // Actualizar cada 2 segundos
    let lastUpdate = 0;

    watchId = navigator.geolocation.watchPosition(
        async (position) => {
            // Control de frecuencia de actualización
            const now = Date.now();
            if (now - lastUpdate < UPDATE_INTERVAL) return;
            lastUpdate = now;

            const origin = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            const smoothedPos = smoothPosition(origin);
            await updateRoute(smoothedPos);
            map.setCenter(smoothedPos);
        },
        (error) => {
            console.error("Error en geolocalización:", error);
            showErrorNotification('Error en el seguimiento de ubicación');
        },
        {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 5000
        }
    );
}

/**
 * Suaviza la posición para evitar saltos bruscos

function smoothPosition(newPos) {
    lastPositions.push(newPos);
    if (lastPositions.length > 5) lastPositions.shift();

    return {
        lat: lastPositions.reduce((sum, pos) => sum + pos.lat, 0) / lastPositions.length,
        lng: lastPositions.reduce((sum, pos) => sum + pos.lng, 0) / lastPositions.length
    };
}

/**
 * Actualiza la ruta en el mapa
 
async function updateRoute(origin) {
    if (!directionsService || !destinationMarker?.position) {
        console.error("Servicios no inicializados");
        return;
    }

    try {
        const response = await directionsService.route({
            origin: origin,
            destination: destinationMarker.position,
            travelMode: google.maps.TravelMode.WALKING,
            provideRouteAlternatives: false,
            optimizeWaypoints: true
        });

        if (directionsRendererGo) {
            directionsRendererGo.setOptions({
                preserveViewport: true,
                directions: response,
                map: map
            });
        }
    } catch (error) {
        console.error("Error al calcular ruta:", error);
        showErrorNotification('Error al actualizar la ruta');
    }
}

/**
 * Detiene el seguimiento y limpia los recursos

function stopTracking() {
    // Detener seguimiento de posición
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    // Limpiar renderizador de rutas
    if (directionsRendererGo) {
        directionsRendererGo.setMap(null);
        directionsRendererGo = null;
    }

    // Eliminar marcador de destino
    if (destinationMarker) {
        destinationMarker.map = null;
        destinationMarker = null;
    }

    // Ocultar botón de detener
    buttonStopRoute.style.display = 'none';
    showNotification('Ruta detenida correctamente');
}

*/






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
            showNotification("Enlace copiado al portapapeles");
        }
        else if (navigator.share) {
            await navigator.share(shareData)
        }
        incrementarContadorCompartidosGuardadosLogro()
    }
    catch (error) {
        console.log(error)
    }
}



async function shareCreatedPlaceGoogle(place) {
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


        showErrorNotification('No se pudo compartir el lugar')
        return
    }

}

async function shareCreatedPlace(place) {
    try {
        const deepLink = `https://newplaceapp.com/?creado=${place.place_id}`;
        const fallbackLink = `https://play.google.com/store/apps/details?id=com.newplace.app`; // Si no la tiene 
        const message = `📍 ¡Descubre ${place.name} en NewPlace!\n\n🔗 ${deepLink}\n\n¿No tienes la app? Descárgala aquí: ${fallbackLink}`;
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
            showNotification("Enlace copiado al portapapeles");

        }
        incrementarContadorCompartidosCreadosLogros()
    }
    catch (error) {
        console.log(error)
        return
    }
}

//función para ver en el mapa un sitio guardado
async function flyToPlace(place) {
    // Validación exhaustiva
    if (!place || (!place.location && (!place.lat || !place.lng))) {
        console.error("Datos de ubicación inválidos:", place);

        showErrorNotification("Ubicación no válida 😑");
        return;
    }

    // Obtener coordenadas
    const lat = place.location?.lat || place.lat;
    const lng = place.location?.lng || place.lng;

    if (isNaN(lat) || isNaN(lng)) {
        console.error("Coordenadas no numéricas:", lat, lng);

        showErrorNotification("Coordenadas inválidas 😑");
        return;
    }

    // Limpiar marcadores existentes
    clearMarkers();

    // Centrar el mapa
    const position = { lat: parseFloat(lat), lng: parseFloat(lng) };
    map.setCenter(position);
    map.setZoom(16);
    let { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
    // Crear marcador
    const pinScaled = new PinElement({
        scale: 1.1,
        glyph: '📍​',
        background: '#FF5A5F',
        glyphColor: "#000",
        borderColor: "#000"
    })
    const marker = new AdvancedMarkerElement({
        map,
        position: place.geometry.location,
        content: pinScaled.element,

        zIndex: 100,
    })

    markers.push(marker);

    // Crear contenido del infowindow (con comprobación de campos)
    const content = `
    <div class="card-sites">
    <button class='close-window'>X</button>
     ${place.rating ? `<p> ${'⭐'.repeat(place.rating)} </p>` : ''}
        <h2>${place.name || "Lugar sin nombre"}</h2>
        ${place.address ? `<p><strong>Dirección:</strong> ${place.address}</p>` : ''}
       
         <button class='show-google'>Ver en Google</button>
             
    </div>
    `;

    // Configurar infowindow
    if (infowindow) infowindow.close();

    infowindow = new google.maps.InfoWindow({ content });
    infowindow.open(map, marker);
    marker.addListener('click', () => {
        infowindow.open(map, marker);
    })
    // Manejar eventos del infowindow
    google.maps.event.addListenerOnce(infowindow, 'domready', async () => {

        const closeBtn = document.querySelectorAll('.close-window');
        const likesBtn = document.getElementById('button-likes');
        const shareBtn = document.querySelectorAll('.share');
        const showLikes = document.getElementById('likes-count');
        const shareUbiBtn = document.querySelectorAll('.share-ubi');
        const btnComment = document.querySelectorAll('.btn-comentar');
        const textComment = document.getElementById(`input-comentario-${place.place_id}`).value;
        const count = await getLikesCount(place.place_id);
        loadComments(place.place_id)
        showLikes.textContent = `${count} ❤️`;

        closeBtn.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeCurrentInfoWindow();
                currentMarker = null; // Asegurar que el marcador actual se limpie
            });
        });

        if (place.visibleToAll && likesBtn) {
            likesBtn.addEventListener('click', async () => {
                await toggleLike(place.place_id);
                const newCount = await getLikesCount(place.place_id);
                showLikes.textContent = `${newCount} ❤️`;

            });
        }

        btnComment.forEach(button => {
            button.addEventListener('click', async () => {
                const input = document.getElementById(`input-comentario-${place.place_id}`);
                const text = input.value.trim();
                if (text) {
                    await addComment(text, place.place_id);
                    input.value = '';

                }
            });
        });

        shareUbiBtn.forEach(button => {
            button.addEventListener('click', () => {
                shareCreatedPlaceGoogle(place)
            });
        });

    });
}

if (elements.form) {
    // Event listeners
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        soundClick();
        await searchPlaces();
    });


}
else {
    console.warn('No se encontró el form')
}

if (elements.botonGetSites || elements.buttonShowCreateds || elements.buttonShowPrivateCreateds) {
    elements.botonGetSites.addEventListener('click', (e) => {
        e.preventDefault()
        soundClick()
        renderSavedPlaces();
        displaySavedsPlaces();

    });

    elements.buttonShowCreateds.addEventListener('click', (e) => {
        e.preventDefault()
        soundClick()
        displayCreatedsPlaces()
        renderCreatedPlaces()

    })

    elements.buttonShowPrivateCreateds.addEventListener('click', (e) => {
        e.preventDefault()
        soundClick()
        displayCreatedsPrivatePlaces()
        renderPrivateCreatedsPlaces()

    })
}
else {
    console.warn('No se encontraron los botones de abrir menus en el dom')
}


const body = document.body


//comprobación de que tema tiene elegido el usuario
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark')


}




if (locateMeBtn) {
    locateMeBtn.addEventListener('click', async (e) => {
        e.preventDefault()
        soundClick()
        await searchByMyPosition()
    })
}
else {
    console.warn('No se encontró el botón de buscar por mi posición en el DOM')
}


//animaciones lottie
const lottieAnim = document.getElementById('lottie-container')
let isToggled = false;

const animation = lottie.loadAnimation({
    container: document.getElementById('lottie-container'),
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: 'animaciones/definitivelytogglebutton.json',
})




let confettiVisitAnimation = null

function showConffetiForVisit() {
    const container = document.getElementById('lottie-confeti-container')

    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.right = '0'
    container.style.margin = 'auto'
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    container.style.display = 'block'

    if (confettiVisitAnimation) {
        confettiVisitAnimation.destroy()
    }

    confettiVisitAnimation = lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: 'animaciones/Confetti.json',
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    })



    confettiVisitAnimation.addEventListener('complete', function () {
        container.style.display = 'none'
    })
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
        animation.goToAndStop(0, true);

        // Reproduce desde el inicio
        animation.play();

        // Opcional: Cambia dirección a normal (por si estaba en reversa)
        animation.setDirection(1);
        location.reload()
    })
}
else {
    console.warn('No se encontró el boton toggle')
}




const buttonSettings = document.getElementById('settings-button')

export function closeSettings() {
    const settingsDropdown = document.getElementById('settings-menu')
    soundClick()
    if (settingsDropdown.style.display === 'block') {
        settingsDropdown.style.zIndex = '0'
        settingsDropdown.style.display = 'none'
    }
    else {
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



const searchCard = document.getElementById('search-card')
if (searchCard) {
    searchCard.addEventListener('input', async () => {
        searchCard.setAttribute('placeholder', '')
        const user = auth.currentUser
        if (!user) return

        const searchTerm = searchCard.value.toLowerCase()
        const q = query(collection(db, 'favoritos'), where('userId', '==', user.uid))
        const snapshot = await getDocs(q)
        const places = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        const container = elements.sitesList;
        container.innerHTML = '';

        const equals = places.filter(el => el.name.toLowerCase().includes(searchTerm) || el.address.toLowerCase().includes(searchTerm))
        equals.forEach(place => {
            let imageUrl = ''
            if (place.photo) {
                imageUrl = place.photo;
            } else if (place.photos && place.photos.length > 0) {
                // Si hay un array de fotos, tomar la primera
                imageUrl = place.photos[0];
                if (typeof imageUrl === 'object' && imageUrl.getUrl) {
                    // Si es un objeto de Google Maps Photo
                    imageUrl = imageUrl.getUrl({ maxWidth: 400 });
                }
            }
            const visitedBtnHTML = place.visited
                ? `<button class="btn visit-btn" disabled>Visitado</button>`
                : `<button class="btn visit-btn" data-id="${place.place_id}">Marcar como visitado</button>`;

            container.innerHTML += `
            <div class="site">
            <h3>${place.name}</h3>
            <p class='rating'>Valoración : ${place.rating ? '⭐'.repeat(place.rating) : 'N/D'} </p> 
             
             ${imageUrl ? `
                <div style="text-align: center; margin: 10px 0;">
                    <img 
                        src="${imageUrl}" 
                        alt="${place.name || 'Imagen del lugar'}" 
                        style="width: 100%; height: auto; max-height: 200px; border-radius: 8px; object-fit: cover;"
                        onerror="console.error('Error al cargar la imagen:', this.src); this.parentElement.innerHTML='<div style=\'color:#666;font-style:italic;margin:10px 0;\'>Imagen no disponible</div>';"
                    >
                </div>` :
                    '<div style="text-align: center; color: #666; font-style: italic; margin: 10px 0;">Sin imagen disponible</div>'
                }
             <p class="price">Rango de Precio: ${place.pricing ? '💶'.repeat(place.pricing) : 'N/D'}</p>
            <p>${place.address}</p>
            <div class="btn-renders">
                <button class='visit-save-btn' data-id='${place.place_id}'> ${place.visited ? 'Visitado' : 'Marcar como visitado'}</button>
                <button class="btn view-searchcard-btn" 
                        data-placeid="${place.place_id}" 
                        data-lat="${place.location?.lat}" 
                        data-lng="${place.location?.lng}">
                    Ver en mapa
                </button>
                <button class="btn share-btn">Compartir</button>
                <button class="btn delete-btn" data-id="${place.id}">Eliminar</button>
            </div>
        </div>
    `;
            attachVisitButtonListeners(place)
            const site = document.querySelector('.site')
            site.style.animation = 'floatingRotate 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'

        })


    })
}
else {
    console.warn('No se encontró el searchcard de guardados')
}


const searchCreatedsCard = document.getElementById('search-createds-card')
const createRouteForm = document.getElementById('route-form')
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
        const findeds = places.filter(res => res.name.toLowerCase().includes(searchTerm) || res.address.toLowerCase().includes(searchTerm))

        const container = elements.createdsSitesList
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






//activar el modo de creación de lugar
let creationMarker = null;
let creationListener = null;

async function enableCreatePlace() {
    //Cambio del modo de mapa para una mejora visual
    map.setOptions({ draggableCursor: 'crosshair' })


    if (creationListener) {
        google.maps.removeEventListener(creationListener)
    }

    const handleMapTap = async (event) => {
        try {
            // Get the click position
            const position = {
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
            };

            // Remove existing marker if any
            if (creationMarker) {
                creationMarker.setMap(null);
            }

            // Create a new marker at the clicked position
            const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
            const pinScaled = new PinElement({
                scale: 1.1,
                glyph: '📍',
                glyphColor: '#000',
                borderColor: '#000'
            });

            creationMarker = new AdvancedMarkerElement({
                map,
                position: position,
                content: pinScaled.element,
                title: 'Nuevo lugar'
            });

            // Show the place creation form
            showDesktopPlaceCreation(position);

        } catch (error) {
            console.error('Error handling map click:', error);
            showErrorNotification('Error al procesar la ubicación');
        }
    };



    creationListener = map.addListener('click', handleMapTap)
    creationListener = map.addListener('touchend', handleMapTap)

    showNotification('Haz clic en el mapa')
    buttonCancelCreationMode.style.display = 'block'
}
const buttonCancelCreationMode = document.getElementById('cancel')
function cancelCreationPlace() {
    map.setOptions({ draggableCursor: null })
    if (creationListener) {
        google.maps.event.removeListener(creationListener)
        creationListener = null
    }
    if (creationMarker) {
        creationMarker.setMap(null)
        creationMarker = null

    }
    location.reload()

}
if (buttonCancelCreationMode) {
    buttonCancelCreationMode.addEventListener('click', (e) => {
        cancelCreationPlace()
        return
    })
}
else {
    console.warn('No se encontró el botón de cancel creation mode')
}

async function handleNewlocation(position) {
    //eliminación de marcadores y listeners
    if (creationMarker) {
        creationMarker.setMap(null)
    }
    let { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
    const pinScaled = new PinElement({
        scale: 1.1,
        glyph: '📍​',
        background: '#FF5A5F',
        glyphColor: "#000",
        borderColor: "#000"
    })
    creationMarker = new AdvancedMarkerElement({
        map,
        position: position,
        content: pinScaled.element,

        zIndex: 100,
    })
    console.log('position:', position)
    await showDesktopPlaceCreation(position)

}



const buttonDeleteAccount = document.getElementById('delete-account')
if (buttonDeleteAccount) {
    buttonDeleteAccount.addEventListener('click', () => {
        showSweetDeleteAlert('¿Estas seguro/a?', 'Todos tus datos guardados se borrarán', 'warning')

    })
}
else {
    console.warn('No se encontró el boton de delete account')
}

let downloadURL
function normalizePosition(pos) {
    return {
        lat: typeof pos.lat === 'function' ? parseFloat(pos.lat()) : parseFloat(pos.lat),
        lng: typeof pos.lng === 'function' ? parseFloat(pos.lng()) : parseFloat(pos.lng),
    }
}
async function showDesktopPlaceCreation(position) {
    const bounds = new google.maps.LatLngBounds();
    const content = `
    <div class='form-creation-place'>
    <div class='inputContainer check'>

    <label class='title-creation' for='check'>Lugar público</label>
    <input type='checkbox' name='check' id='public'/>
    </div>
    
    <div class='inputContainer name'>
    <label for='name-desktop'>Nombre</label>
    <input type='text' name='name-desktop' id='name-desktop' required/>
    </div>

   

    <div class='inputContainer rate'>
    <label for='rates-desktop'>Valoración personal (1 a 5) </label>
    <input id='rates-desktop' name='rates-desktop' type='number' min='1' max='5' />
    </div>

   

   

    <div class='inputContainer comment'>
    <label for='comment-desktop'>Una frase o texto que describa el lugar</label>
    <textarea id='comment-desktop' name='comment-desktop'>
    </textarea>
    </div>

     <div class='inputContainer photo'>
    <label for="file-upload" class="custom-file-upload">
  📸 
</label>
<input id="file-upload" type="file" required accept="image" />
    </div>

    

    <div class='container-buttons'>
    <button class='create-place' id='save-desktop'>Guardar</button>
    <button class='cancel-create-place' id='cancel-save-desktop'>Cancelar</button>
    </div>
    </div>
    `
    // Ensure position is a proper LatLng object
    const lat = typeof position.lat === 'function' ? position.lat() : parseFloat(position.lat);
    const lng = typeof position.lng === 'function' ? position.lng() : parseFloat(position.lng);

    const latLng = { lat, lng };

    // Update bounds
    bounds.extend(latLng);

    // Close any existing infowindow
    if (infowindow) infowindow.close();

    // Create new infowindow
    infowindow = new google.maps.InfoWindow({
        content: content,
        pixelOffset: new google.maps.Size(0, 410),
        position: latLng,
        maxWidth: 300,
        disableAutoPan: true
    })
    infowindow.open({
        anchor: creationMarker,
        map,
        shouldFocus: true
    })

    google.maps.event.addListenerOnce(infowindow, 'domready', () => {
        document.getElementById('save-desktop').addEventListener('click', async (e) => {
            e.preventDefault()
            const saveBtn = e.target;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';

            try {

                const rating = document.getElementById('rates-desktop').value
                const placeName = document.getElementById('name-desktop').value
                const comment = document.getElementById('comment-desktop').value
                const checkBox = document.getElementById('public')
                const photoFile = document.getElementById('file-upload').files[0]

                if (placeName === '') {

                    showErrorNotification('Debes introducir al menos un nombre para guardar el sitio')
                    return
                }
                if (checkBox.checked) {
                    if (!placeName.trim()) return showErrorNotification('El nombre del lugar es obligatorio.');
                    if (!comment.trim()) return showErrorNotification('Agrega un comentario para compartir públicamente.');
                    if (!rating || rating < 1 || rating > 5) return showErrorNotification('La valoración debe estar entre 1 y 5.');
                    if (!photoFile) return showErrorNotification('Debes subir una imagen para compartir este lugar.');
                }
                if (isOffensive(placeName) || isOffensive(comment)) {

                    showErrorNotification('No introduzcas palabras ofensivas')
                    return
                }

                let photoURL = '';
                if (!esNombreValido(placeName)) {

                    showErrorNotification('Por favor escoge un nombre sin caracteres raros ni emojis y de mas de 3 letras')
                    return
                }
                if (photoFile) {
                    document.getElementById('file-upload').addEventListener('change', function (e) {
                        const file = this.files[0];
                        if (file && !file.type.startsWith('image/')) {
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

                await saveCreatedPlace(position, placeName, comment, rating, photoURL);
                infowindow.close();
            } catch (error) {
                console.error('Error al guardar el lugar:', error);

                showErrorNotification('Error al guardar el lugar. Por favor, inténtalo de nuevo.');
                return
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar';
            }
        })
        document.getElementById('cancel-save-desktop').addEventListener('click', (e) => {
            e.preventDefault()
            infowindow.close()
            creationMarker.setMap(null)
        })


    })
    map.fitBounds(bounds)
}


function esNombreValido(nombre) {
    const largoValido = nombre.length >= 3 && nombre.length <= 50;
    const caracteresPermitidos = /^[a-zA-Z0-9ÁÉÍÓÚáéíóúñÑ\s.,\-()']+$/.test(nombre);
    return largoValido && caracteresPermitidos;
}
let marcador = null
async function loadPlaces() {
    // Limpiar marcadores existentes

    marcadoresCreados = [];

    // Solo cargar lugares si el zoom es 8 o más
    if (map.getZoom() >= 10) {
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

            // Función para verificar si un lugar está dentro de los límites visibles
            const isWithinBounds = (place) => {
                const position = place.position;
                if (!position) return false;

                const lat = position.lat || position.latitude;
                const lng = position.lng || position.longitude;

                if (lat === undefined || lng === undefined) return false;

                const sw = bounds.getSouthWest();
                const ne = bounds.getNorthEast();

                return (
                    lat >= sw.lat() &&
                    lat <= ne.lat() &&
                    lng >= sw.lng() &&
                    lng <= ne.lng()
                );
            };

            // Procesar lugares públicos
            publicSnapshot.forEach(doc => {
                const place = { id: doc.id, ...doc.data() };
                if (isWithinBounds(place)) {
                    addMarkerToPlace(place);
                    marcadoresCreados.push(place.place_id)
                }
            });

            // Procesar lugares privados (evitando duplicados)
            personalSnapshot.forEach(doc => {
                const place = { id: doc.id, ...doc.data() };
                if (isWithinBounds(place) && !publicSnapshot.docs.some(d => d.id === place.id)) {
                    addMarkerToPlace(place);
                    marcadoresCreados.push(place.place_id)
                }
            });

        } catch (error) {
            console.error('Error al cargar lugares:', error);
            showErrorNotification('Error al cargar los lugares');
            return
        }
    }
    else {
        marcadoresCreados.forEach(m => m.setMap(null));
        return;
    }


}


let marcadoresCreados = [];
let currentInfoWindow = null;
let currentMarker = null;
async function addMarkerToPlace(place) {
    try {


        // Ensure position is properly formatted
        const position = {
            lat: place.position.lat || place.position.latitude,
            lng: place.position.lng || place.position.longitude
        };
        let { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

        const pinScaledVisible = new PinElement({
            scale: .8,
            glyphColor: '#fff',
            background: '#5a4bff',
            borderColor: "#000"
        });
        const pinScaledPrivate = new PinElement({
            scale: .8,
            glyphColor: '#ccc',
            background: '#0843c1',
            borderColor: "#000"
        });

        const marker = new AdvancedMarkerElement({
            position: position,
            map: map,
            title: place.name,

            content: place.visibleToAll
                ? pinScaledVisible.element // público
                : pinScaledPrivate.element // privado

        });

        const likeButton = "<button class='button-likes'> <img class='action-btn img-share' src='images/mg.webp'></img></button>"
        marker.addListener('click', async () => {
            soundSucces()
            // Si ya está abierto este marcador, no hacer nada
            if (currentInfoWindow) {
                currentInfoWindow.close()
                currentInfoWindow = null
            }

            const contentInfowindow = `
            <div class="card-sites" data-id='${place.place_id}'>
                <button class='close-window'>X</button>
                <h2>${place.name || 'N/D'}</h2>
                 
                
                <div class='container-createds-card rating'>
                  
                    ${place.visibleToAll ? `<p class='count-likes'></p>` : ''}
                      <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
                </div>
                <div class='container-createds-card photo'>
                    ${place.photo ? `<img class="place-photo" loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado'}'>` : '<p>Sin imagen</p>'}
                </div>
                 <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                  
                    <button class='share-ubi'><img class='action-btn'src='images/ubicacion.webp' ></img></button>
                   <button style="align-self:end;" class='share-photo'><img class='action-btn' src='images/folleto.webp'></img></button>
                </div>
                <div class='container-createds-card comment'>
                    <p class='coment-place'><strong>${auth.currentUser.displayName}</strong>${place.comment || 'N/D'}</p>
                </div>
                ${place.visibleToAll ? `<div class="comentarios-section" data-id="${place.place_id}" id="comentarios-${place.place_id}">
                </div>` : ''}
               ${place.visibleToAll ? `<div class='comentarios-input'>
                 <textarea class='text-comment' id="input-comentario-${place.place_id}" placeholder="Escribe tu comentario..."></textarea> 
                  <button class="btn-comentar" data-id="${place.place_id}"><img class='action-btn img-share' src='images/mensaje.webp'></img></button>
                </div>` : ''}
            </div>`;



            // Configurar el nuevo infowindow
            currentInfoWindow = new google.maps.InfoWindow();
            currentMarker = marker;
            if (infowindow) infowindow.close()
            // Configurar el contenido y abrir
            currentInfoWindow.setContent(contentInfowindow);
            currentInfoWindow.open({
                anchor: currentMarker,
                map: map,

            });

            // Configurar eventos del infowindow
            google.maps.event.addListenerOnce(currentInfoWindow, 'domready', async () => {

                const closeBtn = document.querySelectorAll('.close-window');
                const likesBtn = document.querySelectorAll('.button-likes');
                const sharePhoto = document.querySelectorAll('.share-photo')
                const showLikes = document.querySelectorAll('.count-likes');
                const shareUbiBtn = document.querySelectorAll('.share-ubi');
                const shareCardBtn = document.querySelectorAll('.share-card')
                const btnComment = document.querySelectorAll('.btn-comentar');

                const count = await getLikesCount(place.place_id);


                loadComments(place.place_id)
                place.visibleToAll ?
                    showLikes.forEach(cnt => {
                        cnt.textContent = `${count} ❤️` || 0
                    })
                    : ''
                sharePhoto.forEach(btn => {
                    btn.addEventListener('click', () => {
                        shareCanvas(place)
                    })
                })
                closeBtn.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        soundClick()
                        currentInfoWindow.close()
                        // Asegurar que el marcador actual se limpie
                    });
                });

                if (place.visibleToAll && likesBtn) {
                    likesBtn.forEach(btn => {
                        btn.addEventListener('click', async () => {
                            await toggleLike(place.place_id);
                            const newCount = await getLikesCount(place.place_id);
                            showLikes.forEach(cnt => {
                                cnt.textContent = `${newCount} ❤️`
                            })
                        })


                    })
                }

                btnComment.forEach(button => {
                    button.addEventListener('click', async () => {
                        const input = document.getElementById(`input-comentario-${place.place_id}`);
                        const text = input.value.trim();
                        if (text) {
                            await addComment(text, place.place_id);
                            input.value = '';

                        }
                    });
                });

                shareUbiBtn.forEach(button => {
                    button.addEventListener('click', async () => {
                        await shareCreatedPlaceGoogle(place)
                    });
                });
                shareCardBtn.forEach(btn => {
                    btn.addEventListener('click', async () => {
                        await shareCreatedPlace(place)
                    })
                })
            });
        });
    } catch (error) {
        console.error('Error adding marker:', error);
        throw error;
    }
}


// Array para almacenar los marcadores creados


function closeCurrentInfoWindow() {
    if (currentInfoWindow) {
        currentInfoWindow.close();
        currentInfoWindow = null;
        currentMarker = null;
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
        showErrorNotification('No hay usuario autenticado');
        return;
    }

    try {
        // Ensure position has lat and lng methods
        const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
        const lng = typeof position.lng === 'function' ? position.lng() : position.lng;

        const placeData = {
            name: placeName || 'Unnamed Place',

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

            showNotification('¡Lugar personal creado correctamente!');
            loadPlaces()
            incrementarContadorCreados()
            incrementarContadorCreadosLogro()
            showSuccessConfetti()
            renderCreatedPlaces();
        } else {


            showErrorNotification('No puedes guardar 2 lugares con el mismo nombre');

            return;
        }
    } catch (error) {
        console.error('Error saving place:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });

        showErrorNotification('Error al guardar el lugar: ' + (error.message || 'Error desconocido'));
    }
}

async function toggleLike(placeId) {
    const user = auth.currentUser
    const likeRef = doc(db, 'creados', placeId, 'likes', user.uid);
    const docSnap = await getDoc(likeRef)
    if (docSnap.exists()) {
        // Si ya dio like, quitarlo
        await deleteDoc(likeRef);
        console.log('Like eliminado');
    } else {
        // Si no, agregar like
        await setDoc(likeRef, {
            timestamp: Date.now()
        });
        console.log('Like agregado');
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
        showNotification('¡ Lugar eliminado correctamente !')
    }
    catch (error) {
        showErrorNotification('No se pudo eliminar el lugar')
        console.error(error.code)
    }
}

async function renderCreatedPlaces() {

    const user = auth.currentUser;
    const container = elements.createdsSitesList
    container.innerHTML = ''
    const q = query(collection(db, 'creados'),
        where('userId', '==', user.uid),
        where('visibleToAll', '==', true))
    const snapshot = await getDocs(q)

    if (!user) {
        showErrorNotification('Debes estar loggeado')
        return
    }

    if (snapshot.empty) {
        container.innerHTML = '<span>Aún no hay sitios creados</span>'
        return
    }
    appState.home = false
    snapshot.forEach(async docSnap => {
        const place = docSnap.data()
        const placeId = docSnap.id
        const likesCount = await getLikesCount(place.place_id)

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
            <button class="btn btn-view-created">Ver en mapa</button>
            
            <button class="btn delete-btn" data-id="${placeId}">Eliminar</button>
        </div>
    </div>
    `
        container.insertAdjacentHTML('beforeend', html)

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
                await deleteCreatedPlace(thePlaceId)

            })
        })


    })


}


async function renderPrivateCreatedsPlaces() {

    const user = auth.currentUser;
    const container = elements.privatesCreatedsSitesList
    container.innerHTML = ''
    const q = query(collection(db, 'creados'),
        where('userId', '==', user.uid),
        where('visibleToAll', '==', false))
    const snapshot = await getDocs(q)

    if (!user) {
        showErrorNotification('Debes estar loggeado')
        return
    }

    if (snapshot.empty) {
        container.innerHTML = '<span>Aún no hay sitios creados</span>'
        return
    }
    appState.home = false
    snapshot.forEach(docSnap => {
        const place = docSnap.data()
        const placeId = docSnap.id

        const html = `
    <div class="site">
        <h3>${place.name || 'N/D'}</h3>

        <div class='container-createds-card rating'>
       
        <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
        </div>

         <div class='container-createds-card photo'>
            ${place.photo ? `<img src='${place.photo}' alt='${place.name || 'Lugar creado'}' style='max-width: 100%; height: auto; border-radius: 8px;'>` : '<p>Sin imagen</p>'}
        </div>


        



        <div class='container-createds-card comment'>
        <label>Comentario Personal</label>
        <p>${place.comment ? place.comment : 'N/D'}</p>
        </div>

        <div class="btn-renders">
            <button class="btn btn-view-created">Ver en mapa</button>
            <button class="btn share-btn">Compartir</button>
            <button class="btn delete-btn" data-id="${placeId}">Eliminar</button>
        </div>
    </div>
    `
        container.insertAdjacentHTML('beforeend', html)

        // Asignación segura y directa: solo al último botón añadido
        const lastSite = container.lastElementChild

        lastSite.querySelector('.btn.btn-view-created').addEventListener('click', () => {
            load
            menuOptions.classList.remove('active')
            closeCreatedsPanel()
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        })

        lastSite.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const thePlaceId = btn.dataset.id
                await deleteCreatedPlace(thePlaceId)

            })
        })

        lastSite.querySelector('.share-btn').addEventListener('click', async () => {
            await shareCreatedPlaceGoogle(place)
        })
    })


}

const markersOfCreateds = []

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

function flyToCreatedPlace(position, place) {

    const user = auth.currentUser;



    const lat = place.position.lat || place.lat
    const lng = place.position.lng || place.lng
    // 2. Extracción segura de coordenadas


    // 3. Validación de coordenadas numéricas
    if (isNaN(lat) || isNaN(lng)) {
        console.error("Coordenadas inválidas:", { lat, lng });
        showErrorNotification("Coordenadas no válidas 😑");
        return;
    }

    if (infowindow) infowindow.close();




    // 5. Centrar mapa
    map.setCenter(position);
    map.setZoom(15); // Añade un zoom adecuado

    // 6. Crear marcador
    creationMarker = new AdvancedMarkerElement({
        map,
        position: place.geometry.location,
        content: pinScaled.element,

        zIndex: 100,
    })


    markersOfCreateds.push(creationMarker);

    // 7. Crear contenido del infowindow
    const likeButton = "<button class='button-likes'> <img class='action-btn img-share' src='images/mg.webp'></img></button>"
    const contentInfowindow = `
    <div class="card-sites" data-id='${place.place_id}'>
        <button class='close-window'>X</button>
        <h2>${place.name || 'N/D'}</h2>
         ${place.visibleToAll ? `<p class='count-likes'></p>` : ''}
        
        <div class='container-createds-card rating'>
            <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
            
        </div>
        <div class='container-createds-card photo'>
            ${place.photo ? `<img class="place-photo" loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado'}'>` : '<p>Sin imagen</p>'}
        </div>
         <div class='container-buttons'>
            ${place.visibleToAll ? likeButton : ''}
          
            <button class='share-ubi'><img class='action-btn'src='images/ubicacion.webp' ></img></button>
           <button style="align-self:end;" class='share-photo'><img class='action-btn' src='images/folleto.webp'></img></button>
        </div>
        <div class='container-createds-card comment'>
            <p class='coment-place'><strong>${auth.currentUser.displayName}</strong>${place.comment || 'N/D'}</p>
        </div>
        ${place.visibleToAll ? `<div class="comentarios-section" data-id="${place.place_id}" id="comentarios-${place.place_id}">
        </div>` : ''}
       ${place.visibleToAll ? `<div class='comentarios-input'>
         <textarea class='text-comment' id="input-comentario-${place.place_id}" placeholder="Escribe tu comentario..."></textarea> 
          <button class="btn-comentar" data-id="${place.place_id}"><img class='action-btn img-share' src='images/mensaje.webp'></img></button>
        </div>` : ''}
    </div>`;

    // 8. Cerrar infowindow anterior si existe
    if (infowindow) {
        infowindow.close();
    }

    // 9. Configurar infowindow
    infowindow = new google.maps.InfoWindow({
        content: contentInfowindow
    });

    // 10. Manejar clic en el marcador
    creationMarker.addListener('click', () => {
        infowindow.open(map, creationMarker);
    });
    infowindow.open(map, creationMarker);


    // 11. Manejar el botón "Cómo llegar"
    google.maps.event.addListenerOnce(infowindow, 'domready', () => {
        document.querySelector('.btn.go-to-btn')?.addEventListener('click', async () => {
            await setDestinationInCreated(place)

        });
        document.querySelector('.close-window').addEventListener('click', () => {
            infowindow.close()
        })
    });

}
const inputFilters = document.querySelector('.input-filters')
const containerSlideFilters = document.querySelector('.container-slide-filters')

const select = document.querySelectorAll('select')

function showFilters(event) {
    // Si el clic viene de un select, ignorar
    if (event.target.closest('select')) return;


}

if (containerSlideFilters) {
    containerSlideFilters.addEventListener('click', showFilters);

}
else {
    console.warn('No se encontró el container de slide filters')
}

//Cerrar al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!containerSlideFilters.contains(e.target)) {
        containerSlideFilters.classList.remove('displayed');

    }
});

elements.buttonCreatePlace.addEventListener('click', async (e) => {
    e.preventDefault()

    await enableCreatePlace()
    closeMenu()

})


function closeCreatedsPanel() {

    document.querySelector('.createds-places-panel').classList.remove('active')

}


elements.buttonClosePrivateCreateds.addEventListener('click', closePrivatesCreatedsPanel)



function closePrivatesCreatedsPanel() {
    soundClick()
    document.querySelector('.createds-privates-places-panel').classList.remove('active')

}
let counterTransitions = 0
let maxTransitionsWithoutAdds = 5
function showMenu() {
    if (!isPremium) {
        if (counterTransitions >= maxTransitionsWithoutAdds) {
            showInterstitial()
            counterTransitions = 0

        }

        counterTransitions++
    }
    if(parseInt(localStorage.getItem('contadorMenu') || '0') >= maxCounterMenu){
        activateScriptAds()
        localStorage.setItem('contadorMenu', '0')
    }
    incrementarContadorMenu()
    soundClick()
    appState.home = false
    appState.menuOpen = true
    menuOptions.classList.add('active')

}
function closeMenu() {
    menuOptions.classList.remove('active')

    closeSavedPlacesView()
    closeCreatedsPanel()
}

elements.buttonCloseCreateds.addEventListener('click', () => {
    soundClick()
    closeCreatedsPanel()
})



const buttonCloseMenu = document.getElementById('close-menu')
const buttonToggleMenu = document.getElementById('toggle-menu')
const menuOptions = document.getElementById('get-options')


const settingsDropdown = document.getElementById('settings-menu')
document.addEventListener('click', (event) => {
    if (

        settingsDropdown.style.display === 'block' &&
        !event.target.closest('#settings-menu') &&
        !event.target.closest('#settings-button')
    ) {
        closeSettings()
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

                    showErrorNotification('No se pudo abrir el PDF');
                },
                success: () => {
                    showNotification('PDF abierto');
                }
            }
        );

    } catch (error) {
        console.error('Error al preparar PDF:', error);

        showErrorNotification('No se pudo abrir el archivo PDF');
    }
}
if (downloadPol || downloadTer) {
    downloadPol.addEventListener('click', () => downloadPdf('terms-politicy/politicas.pdf'))
    downloadTer.addEventListener('click', () => downloadPdf('terms-politicy/terminos.pdf'))

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
            showNotification('Notificaciones denegadas')
            return
        }
    }
}




async function showRewardedAd() {
    const { AdMob } = window.Capacitor.Plugins;
    if (!window.Capacitor.isNativePlatform()) return
    try {
        await AdMob.prepareRewardVideoAd({
            adId: 'ca-app-pub-1639698267501945/1960898980',
            isTesting: true,
            npa: true,
        });

        await AdMob.showRewardVideoAd();
        closeBannerRewarded()
        desbloqueoGuardado()
        showNotification('Guardado ilimitado de lugares desbloqueado por hoy 🥳')
        showSuccessConfetti()
    }
    catch (error) {
        console.error()
    }
}
function soundSave() {
    let sound = new Audio('audios/success.mp3')
    sound.play()
}

function soundClick() {
    let sound = new Audio('audios/click.mp3')
    sound.play()
}

function soundSucces() {
    let sound = new Audio('audios/bubble2.mp3')
    sound.play()
}
function soundError() {
    let sound = new Audio('audios/error.mp3')
    sound.play()
}

function soundBubble() {
    let sound = new Audio('audios/bubble.mp3')
    sound.play()
}

function showVisit() {
    let sound = new Audio('audios/visit.mp3')
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

async function shareCanvas(place) {
    const flyer = document.getElementById('customFlyer');

    try {
        // Mostrar loader
        showLoadingPrincSpinner();

        // Rellenar textos
        document.getElementById('flyer-title').textContent = place.name;
        document.getElementById('flyer-comment').textContent = `"${place.comment || ''}"`;
        document.querySelector('.flyer-rating').textContent = '⭐'.repeat(place.rating || 4);
        document.querySelector('.flyer-user strong').textContent =
            `Creado por ${auth.currentUser?.displayName || 'Usuario'}`;

        // Cargar la foto si existe
        if (place.photo) {
            await setFlyerPhoto(place.photo);
            await new Promise(resolve => setTimeout(resolve, 500))
        } else {
            // Limpiar la imagen si no hay URL
            const imgElement = document.querySelector('.flyer-image img');
            if (imgElement) imgElement.src = '';
        }

        // Mostrar el flyer
        flyer.style.display = 'block';

        // Esperar a que se renderice el contenido
        await new Promise(resolve => setTimeout(resolve, 100));

        // Esperar a que se carguen las fuentes
        if (document.fonts) {
            await document.fonts.ready;
        }

        // Esperar un frame más para asegurar que todo está renderizado
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Configuración de html2canvas
        const scale = Math.min(2, window.devicePixelRatio || 1);

        // Crear el canvas con html2canvas
        const canvas = await html2canvas(flyer, {
            useCORS: true,
            allowTaint: true,
            logging: true,
            backgroundColor: '#ffffff',
            scale: scale,
            onclone: (clonedDoc) => {
                // Asegurarse de que el clon esté visible
                const clonedFlyer = clonedDoc.getElementById('customFlyer');
                if (clonedFlyer) {
                    clonedFlyer.style.display = 'block';
                }
            }
        });

        // Ocultar el flyer después de la captura
        flyer.style.display = 'none';

        // Convertir a blob
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (b) => b ? resolve(b) : reject(new Error('No se pudo generar la imagen')),
                'image/png',
                0.92
            );
        });

        // Manejar la descarga o compartición según la plataforma
        if (window.Capacitor?.isNativePlatform?.()) {
            // Para Android/iOS
            const { Filesystem, Share } = window.Capacitor.Plugins;
            if (!Filesystem || !Share) {
                throw new Error('Funcionalidad de compartir no disponible');
            }

            const fileName = `ufind_${place.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.png`;
            const base64Data = await convertBlobToBase64(blob);

            // Guardar en caché
            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: 'CACHE',
                recursive: true
            });

            // Obtener la URI del archivo
            const fileUri = (await Filesystem.getUri({
                directory: 'CACHE',
                path: fileName
            })).uri;

            // Compartir el archivo
            await Share.share({
                title: `Descubre ${place.name}`,
                text: 'Mira este lugar en UFind!',
                url: fileUri,
                dialogTitle: 'Compartir lugar',
                files: [fileUri]
            });
        } else {
            // Para navegador web
            downloadImage(blob, place.name);
        }

    } catch (error) {
        console.error('Error en shareCanvas:', error);
        showErrorNotification('Error al generar el flyer: ' + (error?.message || 'Error desconocido'));
    } finally {
        // Asegurarse de ocultar el flyer y el loader
        flyer.style.display = 'none';
        hideLoadingPrincSpinner();
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



// Helper function to download the image
function downloadImage(blob, placeName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UFind-${placeName.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Small delay before revoking to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 100);
}


let appState = {
    menuOpen: false,
    home: true
}

function goToHome() {
    appState.home = true
    closeMenu()
    closeSavedPlacesView()
    closeCreatedsPanel()
    closePrivatesCreatedsPanel()
}
function handleBackButton() {
    console.log('Boton de atras presionado')
    if (appState.menuOpen) {
        closeMenu()
        return false
    }
    if (!appState.home) {
        goToHome()
        return false
    }

    //Si estamos en home y no hay menus abiertos, permitimos salir de la app
    return true
}

async function initializeCapacitor() {
    if (window.Capacitor?.isNativePlatform?.()) {
        console.log('Capacitor Detectado')

        // Usar window.Capacitor
        const AppPlugin = window.Capacitor?.Plugins?.App;
        if (AppPlugin?.addListener) {
            AppPlugin.addListener('backButton', () => {
                const shouldExit = handleBackButton();
                if (shouldExit) AppPlugin.exitApp?.();
            });
        }
        else {
            console.warn('Plugin app no disponible')
        }
    }
    else {
        console.log('Capacitor no detectado')

        document.addEventListener('keydown', (event) => {

            if (event.key === 'Escape') {
                const shouldExit = handleBackButton()
                if (shouldExit) {
                    handleBackButton()

                }
            }

        })
    }
}


