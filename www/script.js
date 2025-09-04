
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
        const isNative = !!window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web';

        if (elements.closeBanner) {
            elements.closeBanner.addEventListener('click', hideNotification);
        }
        initializeCapacitor()
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
        showErrorNotification('ID de lugar no válido');
        return false;
    }

    try {
        // Show loading state
        showLoadingPrincSpinner();

       
        const placeDoc = await getDoc(doc(db, 'creados', placeId));

        if (!placeDoc.exists()) {
            console.warn('No se encontró el documento con ID:', placeId);
            showErrorNotification('Lugar no encontrado');
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

        // Ensure the map is loaded
        if (!window.googleMapsLoaded) {
           
            await new Promise(resolve => {
                const checkMap = setInterval(() => {
                    if (window.googleMapsLoaded) {
                        clearInterval(checkMap);
                        resolve();
                    }
                }, 100);

                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkMap);
                    resolve();
                }, 5000);
            });
        }

        // Load the place on the map
       
        await loadSharePlaces({ place_id: placeId });

        // Center and zoom the map
        if (map) {
            map.setView([lat,lng]);
            map.setZoom(15);
            console.log('Mapa centrado y con zoom en las coordenadas:', { lat, lng });
        } else {
            console.warn('El mapa no está disponible aún');
        }

        // Show success message
        showNotification('Lugar cargado correctamente');
        return true;

    } catch (error) {
        console.error('Error en handleDeepLink:', error);

        // More specific error messages
        let errorMessage = 'Error al cargar el lugar';
        if (error.message.includes('coordenadas') || error.message.includes('coordenadas')) {
            errorMessage = 'Las coordenadas del lugar no son válidas';
        } else if (error.message.includes('Firestore')) {
            errorMessage = 'Error al conectar con la base de datos';
        }

        showErrorNotification(errorMessage);
        return false;
    } finally {
        // Always hide loading spinner
        hideLoadingPrincSpinner();
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
              


                // Luego inicializar títulos y logros

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
                    header.style.cssText += 'padding-top: 15px !important;';
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


    // Check if map element exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.warn('Elemento del mapa no encontrado');
        return;
    }

    try {
        const atribution = '<small style="opacity:0.6;">&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small>'
        if (localStorage.getItem('theme') === 'dark') {
            map = L.map('map').setView([38.5648, -0.0679], 13)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
                attribution: atribution
            }).addTo(map)
        }
        else {
            map = L.map('map').setView([38.5648, -0.0679], 13)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
                attribution: atribution
            }).addTo(map)
        }


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
                const userLocationIcon = L.divIcon({
                    className : 'user-location-icon',
                    html: '<div class="pulse"></div>',
                    iconSize: [25, 40],
                    iconAnchor: [12, 40],
                    popupAnchor: [0, -30]
                })
                
                const marker = L.marker([lat, lng], { icon: userLocationIcon }).addTo(map);

                marker.on('click', () => {
                    showSweetAlert('Ubicación actual', 'Aquí te encuentras en este momento', 'success', 'OK')
                })

                markers.push(marker);
                map.setView([lat, lng])
                map.setZoom(10)
                
            } catch (geoError) {
                showErrorNotification('No se pudo obtener la ubicación 😑');

            }
        }

        // Configurar el listener para actualizar marcadores al mover/zoom
        map.on('moveend', () => {
            loadPlaces()
        })

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
            // Limpiar cualquier estado de la aplicación si es necesario
            localStorage.clear();
            sessionStorage.clear();

            // Redirigir a la página de inicio de sesión
            window.location.href = 'login.html';
        })
        .catch((error) => {
            showErrorNotification('Ocurrió un error durante el logout', error);
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
    closeSettings()
    const lang = getCurrentLanguage();
    
    Swal.fire({
        title: title,
        text: text,
        icon: icon || 'info',
        confirmButtonText:  'OK',
        showClass: {
            popup: 'custom-show'
        },
        buttonsStyling: true,
        confirmButtonColor: '#3085d6',
    });
}

// Función para mostrar alerta de confirmación de eliminación
export function showSweetDeleteAlert(title, text, icon) {
    closeSettings()
    const lang = getCurrentLanguage();
    
    Swal.fire({
        title:  translations[lang]?.deleteConfirmTitle,
        text:  translations[lang]?.deleteConfirmText,
        icon: icon || 'warning',
        showCancelButton: true,
        confirmButtonText: translations[lang]?.deleteConfirmButton,
        cancelButtonText: translations[lang]?.deleteCancelButton,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        buttonsStyling: true
    }).then(async (res) => {
        if (res.isConfirmed) {
            await deleteUserAccount();
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


function displayCreatedsPlaces() {
    document.querySelector('.createds-places-panel').classList.add('active')
    document.querySelector('.saved-places-panel').classList.remove('active')
    if (elements.form) {
        elements.form.style.display = 'flex'
    }
}

function displayCreatedsPrivatePlaces() {
    document.querySelector('.createds-privates-places-panel').classList.add('active')
    document.querySelector('.saved-places-panel').classList.remove('active')
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
            map.setView(place.position, 17);
            map.setZoom(17); // o el zoom que uses para mostrar lugares
        }
        soundSucces()

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
        const marker = L.marker(place.position, {icon: icon})
        marker.addTo(map)

        const likeButton = `<button class='button-likes'><img class='action-btn img-share' src='images/mg.webp' alt='Me gusta'></button>`;

        const popupContent = `
            <div class="card-sites" data-id='${place.place_id}'>
                <button class='close-window'>X</button>
                <h2>${place.name || 'N/D'}</h2>
                <div class='container-createds-card rating'>
                    ${place.visibleToAll ? `<p class='count-likes'>0 ❤️</p>` : ''}
                    <p>${place.rating ? '⭐'.repeat(place.rating) : 'N/D'}</p>
                </div>
                <div class='container-createds-card photo'>
                    <a download href='${place.photo}'>${place.photo ? `<img class="place-photo" loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado\'s photo'}'>` : '<p>Sin imagen</p>'}</a>   
                </div>
                <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                    <button class='share-ubi'><img class='action-btn' src='images/ubicacion.webp' alt='Compartir ubicación'></button>
                    <button class='share-card'><img class='action-btn' src='images/share.webp' alt='Compartir tarjeta'></button>
                </div>
                <div class='container-createds-card comment'>
                    <p class='coment-place'><strong>${place.userName || ''}</strong>${place.comment || 'N/D'}</p>
                </div>`;

        // Bind popup to marker
        marker.bindPopup(popupContent, {
            maxWidth: 400,
            className: 'custom-popup',
            closeButton: false
        });

        // Handle popup open event
        marker.on('popupopen', async function () {
            map.setView(place.position, 17);
            setTimeout(() => {
                map.panBy([0, -250])
            })
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
            const likeBtn = popupElement.querySelector('.button-likes');
            if (likeBtn && place.visibleToAll) {
                likeBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await toggleLike(place.place_id);
                    const newCount = await getLikesCount(place.place_id);
                    const likeCountElement = popupElement.querySelector('.count-likes');
                    if (likeCountElement) {
                        likeCountElement.textContent = `${newCount} ❤️`;
                    }
                });
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
                            <img class='action-btn img-share' src='images/mensaje.webp' alt='Enviar comentario'>
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
            showNotification("Enlace copiado al portapapeles");

        }
       
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
        position: place.location,
        content: pinScaled.element,

        zIndex: 100,
    })

    markers.push(marker);

    // Crear contenido del infowindow (con comprobación de campos)
    const content = `
    <div class="card-sites">
    <button class='close-window' type='button'>X</button>
     ${place.rating ? `<p> ${'⭐'.repeat(place.rating)} </p>` : ''}
        <h2>${place.name || "Lugar sin nombre"}</h2>
        ${place.address ? `<p><strong>Dirección:</strong> ${place.address}</p>` : ''}
       
         <button class='show-google'>Ver en Google</button>
             
    </div>
    `;

    infowindow.open(map, marker);

    // Bind popup to marker
    marker.bindPopup(`
        <div class='container-createds-card photo'>
            ${place.photo ? `<img class="place-photo" loading="lazy" src="${place.photo}" alt="${place.name || 'Lugar creado'}">` : '<p>Sin imagen</p>'}
            ${place.comment ? `<p class="comment">${place.comment}</p>` : ''}
        </div>
        <div class="actions">
            <button class="button-visit" data-place-id="${place.place_id}">
                <img src="images/visitar.webp" alt="Visitar">
            </button>
            <button class="button-share" data-place-id="${place.place_id}">
                <img src="images/compartir.webp" alt="Compartir">
            </button>
            ${place.visibleToAll ? likeButton : ''}
        </div>
    </div>`);

    // Handle marker click
    marker.on('click', async (e) => {
        soundSucces();
        if (currentInfoWindow) {
            map.closePopup();
            currentInfoWindow = null;
        }
        infowindow.open(map, marker);
    })

    // Manejar eventos del infowindow
    google.maps.event.addListenerOnce(infowindow, 'domready', async () => {
        const buttonClose = document.querySelectorAll('.close-window')
        const buttonGoogle = document.querySelectorAll('.show-google')
        buttonGoogle.forEach(button => {
            button.addEventListener('click', () => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`, '_blank');
            });
        });
        buttonClose.forEach(button => {
            button.addEventListener('click', () => {
                infowindow.close();
                currentMarker = null; // Asegurar que el marcador actual se limpie
            });
        });




    });
}



if (elements.buttonShowCreateds) {

    elements.buttonShowCreateds.addEventListener('click', (e) => {
        e.preventDefault()

        displayCreatedsPlaces()
        renderCreatedPlaces()

    })
}
else {
    console.warn('No se encontró el botón de mostrar los sitios creados en el DOM')
}

if (elements.buttonShowPrivateCreateds) {
    elements.buttonShowPrivateCreateds.addEventListener('click', (e) => {
        e.preventDefault()

        displayCreatedsPrivatePlaces()
        renderPrivateCreatedsPlaces()

    })
}
else {
    console.warn('No se encontró el botón de mostrar los sitios creados privados en el DOM')
}



const body = document.body


//comprobación de que tema tiene elegido el usuario
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark')


}






//animaciones lottie
const lottieAnim = document.getElementById('lottie-container')
let isToggled = false;
if (lottieAnim) {
    const animation = lottie.loadAnimation({
        container: document.getElementById('lottie-container'),
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: 'animaciones/definitivelytogglebutton.json',
    })
}
else {
    console.warn('No se encontró el botón de animación en el DOM')
}





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

        // Check if the animation element exists before using it
        const animationElement = document.querySelector('.animation');
        if (animationElement && window.animation) {
            window.animation.goToAndStop(0, true);
            window.animation.play();
            window.animation.setDirection(1);
        }

        location.reload()
    })
}
else {
    console.warn('No se encontró el boton toggle')
}




const buttonSettings = document.getElementById('settings-button')

export function closeSettings() {
    const settingsDropdown = document.getElementById('settings-menu')

    if (!settingsDropdown) return; // Exit if settings menu doesn't exist

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
                creationMarker.setMap(null);
            }



            // Show the place creation form
            showDesktopPlaceCreation(position);

        } catch (error) {
            console.error('Error handling map click:', error);
            showErrorNotification('Error al procesar la ubicación');
        }
    };



    creationListener = map.on('click', handleMapTap)
    creationListener = map.on('touchend', handleMapTap)

    showSweetAlert(`${translations[lang]?.confirmTitle}`, `${translations[lang]?.confirmText}`, 'info', `${translations[lang]?.confirmButton}`)
    buttonCancelCreationMode.style.display = 'block'
}
const buttonCancelCreationMode = document.getElementById('cancel')
function cancelCreationPlace() {

    if (creationListener) {

        creationListener = null
    }
    if (creationMarker) {

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
        map.setView([lat, lng], 15);
        map.panBy([-5, -250])
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
        const photoFile = document.getElementById('file-upload').files[0];
        const checkBox = popupElement.querySelector('#public');



        // Test básico - agregar listener simple
        saveDesktop.addEventListener('click', async function (e) {

            if (nameInput.value === '') {

                showErrorNotification('Debes introducir al menos un nombre para guardar el sitio')
                return
            }
            if (checkBox.checked) {
                if (!nameInput.value.trim() || !comment.value.trim() || !ratingInput.value || !photoFile) {
                    showErrorNotification('Debes introducir al menos un nombre, comentario, valoración y una foto para guardar el sitio como público')
                    return
                };

            }
            if (isOffensive(nameInput.value) || isOffensive(comment.value)) {

                showErrorNotification('No introduzcas palabras ofensivas')
                return
            }


            if (!esNombreValido(nameInput.value)) {

                showErrorNotification('Por favor escoge un nombre sin caracteres raros ni emojis y de mas de 3 letras')
                return
            }
            if (!fileUpload || !saveDesktop || !cancelSaveDesktop) {
                console.error('❌ Missing required elements');
                console.log('Popup HTML:', popupElement.innerHTML);
                return;
            }
            saveDesktop.textContent = 'Guardando...'
            let photoURL
            if (photoFile) {
                document.getElementById('file-upload').addEventListener('change', async function (e) {
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
            await saveCreatedPlace(position, nameInput.value, comment.value, ratingInput.value, photoURL)
            map.closePopup()
        });

        cancelSaveDesktop.addEventListener('click', function (e) {

            if (creationMarker) {
                map.removeLayer(creationMarker);
                creationMarker = null;
            }
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



        setTimeout(() => {
            const popup = this.getPopup();
            const popupElement = popup.getElement();
            console.log('🔄 popupopen - trying to find elements again...');

            if (popupElement) {
                const saveBtn = popupElement.querySelector('#save-desktop');
                if (saveBtn && !saveBtn.hasAttribute('data-listener-added')) {

                    saveBtn.setAttribute('data-listener-added', 'true');
                    saveBtn.addEventListener('click', async function () {
                        console.log('💾 Save clicked via popupopen!');

                        alert('¡Funciona via popupopen!');
                    });
                }
            }
        }, 100);
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
            showErrorNotification('Error al cargar los lugares');
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
        const bounds = map.getBounds();

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

        const likeButton = `<button class='button-likes'><img class='action-btn img-share' src='images/mg.webp'></button>`;

        // Create popup content
        const popupContent = `
            <div class="card-sites" data-id='${place.place_id}'>
                <button class='close-window'>X</button>
                <h2>${place.name || 'N/D'}</h2>
                <div class='container-createds-card rating'>
                    ${place.visibleToAll ? `<p class='count-likes'>0 ❤️</p>` : ''}
                    <p>${place.rating ? '⭐'.repeat(place.rating) : ''}</p>
                </div>
                <div class='container-createds-card photo'>
                 <a download class='download-btn' href='${place.photo}'>${place.photo ? `<img class="place-photo" loading="lazy" src='${place.photo}' alt='${place.name || 'Lugar creado\'s photo'}'>` : ''}</a>   
                </div>
                <div class='container-buttons'>
                    ${place.visibleToAll ? likeButton : ''}
                    <button class='share-ubi'><img class='action-btn' src='images/ubicacion.webp' alt='Compartir ubicación'></button>
                    <button class='share-card'><img class='action-btn' src='images/share.webp' alt='Compartir tarjeta'></button>
                </div>
                <div class='container-createds-card comment'>
                    <p class='coment-place'><strong>${place.userName || ''}</strong> <span> ${place.comment || ''}</span></p>
                </div>`;



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
            if (downloadBtn && !window.Capacitor.isNativePlatform()) {
                downloadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    downloadPhotoAndroid(place)
                    .then((uri) => {
                        console.log('URI de la foto guardada:', uri)
                    })
                    .catch((error) => {
                        console.error('Error al descargar la foto:', error)
                    });
                });
            }
            // Like button
            const likeBtn = popupElement.querySelector('.button-likes');
            if (likeBtn && place.visibleToAll) {
                likeBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await toggleLike(place.place_id);
                    const newCount = await getLikesCount(place.place_id);
                    const likeCountElement = popupElement.querySelector('.count-likes');
                    if (likeCountElement) {
                        likeCountElement.textContent = `${newCount} ❤️`;
                    }
                });
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
                                <img class='action-btn img-share' src='images/mensaje.webp' alt='Enviar comentario'>
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


    } catch (error) {
        console.error('Error adding marker:', error);
        throw error;
    }
}


// Función para descargar fotos en Android
async function downloadPhotoAndroid(place) {
    try {
        // Verificar si el plugin de Capacitor está disponible
        if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.Filesystem) {
            console.warn('Capacitor Filesystem plugin not available, opening image in new tab');
            window.open(place.photo, '_blank');
            return;
        }

        const { Filesystem, FilesystemDirectory } = window.Capacitor.Plugins;
        
        // Verificar permisos en Android
        if (window.Capacitor.getPlatform() === 'android') {
            const { requestPermissions } = window.Capacitor.Plugins.Permissions;
            const permission = await requestPermissions(['storage']);
            
            if (permission.state !== 'granted') {
                showErrorNotification('Se requieren permisos de almacenamiento para descargar la imagen');
                return;
            }
        }

        // Descargar la imagen
        const response = await fetch(place.photo);
        if (!response.ok) throw new Error('Error al descargar la imagen');
        
        const blob = await response.blob();
        const base64Data = await convertBlobToBase64(blob);
        const timeStamp = new Date().getTime();
        const fileName = `NewPlace_${timeStamp}.jpg`;
        
        // Guardar el archivo
        const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: FilesystemDirectory.Documents,
            recursive: true
        });
        
        // Mostrar notificación de éxito
        showNotification('Imagen guardada en la carpeta de documentos');
        console.log('Foto guardada:', savedFile.uri);
        return savedFile.uri;
        
    } catch (error) {
        console.error('Error al descargar la foto:', error);
        // Fallback: abrir la imagen en una pestaña nueva si falla la descarga
        showErrorNotification('No se pudo guardar la imagen. Abriendo en el navegador...');
        window.open(place.photo, '_blank');
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
            createdBy: user.displayName || 'Usuario',
            userName: user.displayName || 'Usuario',
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
                Swal.fire({
                    title: '¿ Estas seguro / a ?',
                    text: 'El lugar se eliminará para siempre',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
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
            <button class="btn btn-view-created" data-i18n="viewOnMap">Ver en mapa</button>
            <button class="btn share-btn" data-i18n="share">Compartir</button>
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
            closePrivatesCreatedsPanel()
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        })

        lastSite.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const thePlaceId = btn.dataset.id
                closePrivatesCreatedsPanel()
               
                Swal.fire({
                    title: '¿ Estas seguro / a ?',
                    text: 'El lugar se eliminará para siempre',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
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






function showFilters(event) {
    // Si el clic viene de un select, ignorar
    if (event.target.closest('select')) return;


}



if (elements.buttonCreatePlace) {
    elements.buttonCreatePlace.addEventListener('click', async (e) => {
        e.preventDefault()

        await enableCreatePlace()
        closeMenu()

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
let counterTransitions = 0
let maxTransitionsWithoutAdds = 5
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
   

    appState.home = false
    appState.menuOpen = true
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



const buttonCloseMenu = document.getElementById('close-menu')
const buttonToggleMenu = document.getElementById('toggle-menu')
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


applyTranslations()