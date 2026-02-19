
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { translations, applyTranslations, getCurrentLanguage } from "./js/i18n.js";
import { loadPlaces, initMap, enableCreatePlace, obtainGlobalPlaces, loadSharePlaces, renderPrivateCreatedsPlaces, renderCreatedPlaces, renderNextPlaces } from "./js/interact-places.js";


import { auth, db} from "./firebaseConfig.js";
import { deleteUserAccount } from "./js/delete-user.js";
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


import { addComment, loadComments } from "./js/comments.js";


// Capacitor is available globally via window.Capacitor

//  Leaflet components will be accessed through getGoogleMapsComponents()
let userInitiatedSearch = false;
document.getElementById('search-normal')?.addEventListener('click', () => userInitiatedSearch = true);
document.getElementById('locate-me')?.addEventListener('click', () => userInitiatedSearch = true);

// Variables para almacenar los componentes de  Leaflet


// Inicializa Firebase
export let isPremium = false;


let lang = getCurrentLanguage();


export const appState = {
    home: false,
    map: true,
    create: false
}


// Elementos del DOM
export const elements = {
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
    mapContainer: document.getElementById('map-container'),
    getSitesContainer: document.getElementById('get-sites'),
    getSitesCreatedContainer: document.getElementById('get-createds-sites'),
    sitesList: document.getElementById('sites-list'),
    botonGetSites: document.getElementById('get'),
    closeStorage: document.getElementById('closeStorage'),
    resetStorage: document.getElementById('resetStorage'),
    cityInput: document.getElementById('city'),
    openingSelect: document.getElementById('opening'),
    categorySelect: document.getElementById('category'),
    notificationBannerError: document.getElementById('error-notification-banner'),
    notificationErrorMessage: document.getElementById('error-notification-message'),
    notificationBanner: document.getElementById('notification-banner'),
    closeBanner: document.getElementById('close-notification'),

    notificationMessage: document.getElementById('notification-message'),
    buttonReiniMap: document.getElementById('reini-map')
};






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

export let pendingDeepLinkPlaceId = null
// Asegurarse de que el DOM esté completamente cargado
// --- HISTORY + POPSTATE SETUP ---
function ensureBaseHistory() {
    // Si no hay estado, creamos uno base para evitar salir accidentalmente
    if (!history.state || !history.state.isAppBase) {
      history.replaceState({ isAppBase: true }, '', window.location.pathname + window.location.search);
    }
  }

 

document.addEventListener('DOMContentLoaded', async () => {
   
    
    try {
         showLoadingPrincSpinner()
        ensureBaseHistory()
        await initializeCapacitor()
        
    onAuthStateChanged(auth, async (user) => {
        
        const publicPages = ['login.html', 'register.html'];
        const currentPage = window.location.pathname.split('/').pop();

        const isNative = window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function'
            ? window.Capacitor.isNativePlatform()
            : false;

        if (isNative) {

            if (!user) {
                // Si no hay usuario y está en la app o no es una página pública, redirigir a la landing
                if (currentPage === 'index.html' || currentPage === '' || currentPage === '/') {
                    window.location.href = 'register.html'
                    return
                }

            }
            else {
                if (publicPages.includes(currentPage) || currentPage === '' || currentPage === '/') {
                    window.location.href = '/app/index.html';
                    return
                }

            }
        }
        else {

            if (!user) {
                if (currentPage === '/app/index.html') {
                    window.location.href = 'index.html'
                    return
                }
            }
            else {
                if (publicPages.includes(currentPage)) {
                    window.location.href = '/app/index.html'
                    return
                }

            }
        }

        hideLoadingPrincSpinner()
        if (!user) return
        if (!user.emailVerified) {
            showSweetAlert(`${translations[lang]?.verifyEmailTitle}`, `${translations[lang]?.verifyEmailText}`, 'warning', `${translations[lang]?.confirmButtonText}`)
        }




        if (elements.closeBanner) {
            elements.closeBanner.addEventListener('click', hideNotification);
        }
        if (elements.mapContainer) {
            elements.mapContainer.addEventListener('scroll', () => {
                const { scrollTop, scrollHeight, clientHeight } = elements.mapContainer;
                if (scrollTop + clientHeight >= scrollHeight + 50) {
                    renderNextPlaces()
                }
            })
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
            
               


                //comprobación de que tema tiene elegido el usuario
               
                if (localStorage.getItem('theme') === 'dark') {
                    body.classList.add('dark')


                }
                else {
                    body.classList.remove('dark')
                }
                if (localStorage.getItem('theme') === 'dark') {
                    body.classList.add('dark')
                }
                else {
                    body.classList.remove('dark')
                }





                setupPushNotifications()


                // Modificar estilos del header basado en la plataforma
                const buttonsForm = document.querySelectorAll('.form-buttons')

                const header = document.getElementById('header');
                if (header && buttonsForm) {
                    // Aplicar estilos específicos para web con !important
                    if (window.Capacitor.isNativePlatform()) {
                        // Asegurarse de que en móvil se mantenga el padding original

                        buttonsForm.forEach(btn => {
                            btn.style.paddingBottom = '2rem'
                        })
                        header.style.cssText += 'padding-top: 1.5rem !important;';
                    } else {
                        header.style.cssText += 'padding-top: 0rem !important;';


                    }

                    const textComment = document.querySelectorAll('.site.text-comment')
                    if (textComment) {
                        textComment.forEach(com => {
                            com.style.padding = '10px'
                        })
                    }
                    // Ocultar elementos premium si existen
                    const premiumElements = ['premium-title', 'premium-li', 'show-premium'];
                    premiumElements.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.style.display = 'none';
                    });
                }
        })
    applyTranslations()
            await initMap()

            updateBarFromState()
            await processDeepLinkFromUrl()
            document.getElementById('lang-selector').value = getCurrentLanguage();
            setTimeout(() => {
                hideLoadingPrincSpinner()
            }, 300)

    })
} catch(error){
    console.error('Error al cargar lugares:', error)
    return
}
});





export async function initializeCapacitor() {
    // Handle web deep links (for browsers like Brave)
    if (!window.Capacitor?.isNativePlatform?.()) {
       
        window.addEventListener('popstate', () => {
            const shouldExit = handleBackButton();
            if (shouldExit) {
                handleBackButton();
            }
        })
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


  
    const {App} = window.Capacitor.Plugins;
        // Handle back button
        App.addListener('backButton', () => {
            const shouldExit = handleBackButton();
            if (shouldExit) App.exitApp();
        });

       
   
}

function isVisibleElement (el) {
    return el && el.classList.contains('active')
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
        

        if (!auth.currentUser) {
            sessionStorage.setItem('pendingDeeplink', placeId);
            showErrorNotification(`${translations[lang].mustBeLoggedIn}`);
            window.location.href = 'login.html';
            return;
        }
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
       
    }
}




// Process deep link from URL parameters
async function processDeepLinkFromUrl() {
    // Check for place_id in URL parameters
   
    const placeId = getUrlParameter('creado');
   
    if (placeId) {
        console.log('Processing deep link from URL with place_id:', placeId);
        pendingDeepLinkPlaceId = placeId
        await handleDeepLink(placeId);
        // Clean URL after processing (remove the parameters)
        const cleanUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);
        console.log('parameterURL', placeId)
    }
}


function handleBackButton() {
    const options = document.getElementById('get-options')
    const createdsSitesPanel = document.getElementById('get-createds-sites')
    const privateCreatedsSitesPanel = document.getElementById('get-createds-private-sites')
    if(isVisibleElement(options)){
        if(isVisibleElement(createdsSitesPanel)){
            closeCreatedsPanel()
            return false
        }
        if(isVisibleElement(privateCreatedsSitesPanel)){
            closePrivatesCreatedsPanel()
            return false
        }
        closeMenu()
        return false
    }
   
    
   
    
    
    return true
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

export function isOffensive(phrase) {
    const textoLimpio = phrase.toLowerCase()
    return palabrasOfensivas.some(palabra =>
        textoLimpio.includes(palabra.toLowerCase())
    )

}

// Import the titles system initialization
export async function initSocial() {
    const isNative = !!window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web';
    
    if (isNative) {

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


            await SocialLogin.initialize(config);


            // Add a small delay to ensure initialization is complete
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (e) {
            console.error('SocialLogin initialization failed:', e);
            // Try to reinitialize after a delay if it fails
            setTimeout(initSocial, 2000);
        }
    } else {

    }
}

//actualiza la vista de la barra de principal
export function updateBarFromState() {
    const buttonHome = document.querySelector('.home')

    if (!buttonHome) return
    const buttonMap = document.querySelector('.globe')

    if (!buttonMap) return

    const buttonCreate = document.querySelector('.create')

    if (!buttonCreate) return

    if (appState.map === true) {
        buttonMap.style.fontSize = '1.1em'
        buttonMap.style.opacity = '1'
    }
    else {
        buttonMap.style.fontSize = '1em'
        buttonMap.style.opacity = '.8'
    }
    let startY = 0
    let isPulled = false
    let mapContainer = document.getElementById('map-container')
    if (appState.home === true) {




        //Obtenemos el punto inicial

        mapContainer.addEventListener('touchstart', (e) => {
            if (appState.create !== true && appState.map !== true && elements.mapContainer.scrollTop === 0) {
                startY = e.touches[0].clientY;
                isPulled = true
            }
        })

        //Obtenemos punto actual despues de desplazamiento y comparamos con el anterior
        mapContainer.addEventListener('touchmove', (e) => {
            if (!isPulled) return
            let currentY = e.touches[0].clientY;
            let diff = currentY - startY

            //Si el desplazamiento hacia arriba es mayor que 200 se recarga
            if (diff > 200) {
                location.reload()
                isPulled = false
            }
        })

        //Finaliza sesión de toque 
        mapContainer.addEventListener('touchend', () => {
            isPulled = false
        })

        buttonHome.style.fontSize = '1.1em'
        buttonHome.style.opacity = '1'
    }
    else {
        buttonHome.style.fontSize = '1em'
        buttonHome.style.opacity = '.8'


    }


    if (appState.create === true) {
        //Obtenemos punto actual despues de desplazamiento y comparamos con el anterior

        buttonCreate.style.fontSize = '1.1em'
        buttonCreate.style.opacity = '1'
    }

    else {
        buttonCreate.style.fontSize = '1em'
        buttonCreate.style.opacity = '.8'

    }
}
const body = document.body



const mapBtn = document.getElementById('map-btn')
if (mapBtn) {
    //Se inicia el mapa
    mapBtn.addEventListener('click', async () => {
        try {

            await initMap()


        }
        catch (error) {
            console.error('Error en inicialización del mapa')
            return
        }
    })
}


// Function para validar latitud y longitud
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
            window.location.href = '../login.html';
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




export function showNotification(message, duration = 3000) {
    const elemBanner = elements.notificationBanner
    const elemMessage = elements.notificationMessage
    if (!elemBanner || !elemMessage) {
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
    if (!elemErrorBanner || !elemErrorMessage) {
        console.warn('Error notification elements not found');
        return;
    }

    flashErrorScreen()

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
    history.pushState({ panel: 'publics' }, '', window.location.href);
    if (elements.form) {
        elements.form.style.display = 'flex'
    }
}

function displayCreatedsPrivatePlaces() {
    document.querySelector('.createds-privates-places-panel').classList.add('active')
    renderPrivateCreatedsPlaces()
    history.pushState({ panel: 'privates' }, '', window.location.href);
    if (elements.form) {
        elements.form.style.display = 'flex'
    }

}












function decrementarContadorCreados() {
    let count = parseInt(localStorage.getItem('contadorCreados') || '0')
    count--
    localStorage.setItem('contadorCreados', count.toString())
}



export function showLoadingPrincSpinner() {
    const loader = document.getElementById('loader-princ');
    if (loader) {
        loader.style.opacity = '1'
        loader.style.visibility = 'visible'
    }
}

export function hideLoadingPrincSpinner() {
    const loader = document.getElementById('loader-princ');
    if (loader) {
        loader.style.opacity = '0'
        loader.style.visibility = 'hidden'
    }
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

        return
    }
}

let isSharing = false

export async function shareCreatedPlaceGoogle(place) {
    if (isSharing) return
    isSharing = true
    try {
        const placeUrl = `https://www.google.com/maps/search/?api=1&query=${place.position.lat},${place.position.lng}`
        if (!place.position.lat || !place.position.lng) return
        if (window.Capacitor.isNativePlatform()) {
            const { Share } = window.Capacitor?.Plugins || {}
            if (Share) {
                await Share.share({
                    title: `${place.name} !!`,
                    text: `${translations[lang]?.ubiFinded}`,
                    url: placeUrl,
                    dialogTitle: 'Share'
                });
            }
        }
        else {
            if (navigator && navigator.canShare) {
                const shareData = {
                    title: place.name || '',
                    text: place.address || `${translations[lang]?.ubiFinded}:${place.name}`,
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

export async function shareCreatedPlace(place) {
    try {
        const deepLink = `https://ubifindapp.com/app/?creado=${place.place_id}`;
        const fallbackLink = `https://play.google.com/store/apps/details?id=com.ubifind.app`; // Si no la tiene 
        const message = `📍${translations[lang]?.lookThat}: ${place.name} \n\n🔗 ${deepLink}\n\n ${translations[lang].downloadApp}: ${fallbackLink}`;
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

        return
    }
}



if (elements.buttonShowCreateds) {

    elements.buttonShowCreateds.addEventListener('click', (e) => {
        e.preventDefault()

        displayCreatedsPlaces()


    })
}

if (elements.buttonShowPrivateCreateds) {
    elements.buttonShowPrivateCreateds.addEventListener('click', (e) => {
        e.preventDefault()
        displayCreatedsPrivatePlaces()
    })
}







const buttonToggle = document.getElementById('toggle')

if (buttonToggle) {
    buttonToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark')
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
        if (baseLayer) {
            map.removeLayer(baseLayer)
        }

        baseLayer = L.tileLayer(tileUrl, { attribution: atribution })
        baseLayer.addTo(map);

    })
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







const searchPrivateCreatedCards = document.getElementById('search-createds-private-card')
if (searchPrivateCreatedCards) {
    searchPrivateCreatedCards.addEventListener('input', async () => {
        let timeOutId
        return function(){
            clearTimeout(timeOutId)
            timeOutId = setTimeout(async () => {
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
            }, 500)
        }
        
    })

}



async function getActualPosition() {
    if (navigator.geolocation) {

        const position = await new Promise((resolve, reject) => {
            const options = {
                timeout: 10000,
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






const buttonDeleteAccount = document.getElementById('delete-account')
if (buttonDeleteAccount) {
    buttonDeleteAccount.addEventListener('click', () => {
        showSweetDeleteAlert(`${translations[lang]?.sure}`, `${translations[lang]?.deleteConfirmText}`, 'warning', `${translations[lang]?.deleteConfirmButton}`, `${translations[lang]?.deleteCancelButton}`)

    })
}




export async function toggleLike(placeId, button) {
    const user = auth.currentUser

    if (!button) return
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
        location.reload()
        showNotification(`${translations[lang].placeDeletedSuccess}`)
    }
    catch (error) {
        showErrorNotification(`${translations[lang].deletePlaceError}`)
        console.error(error.code)
    }
}
export async function getLikesCount(placeId) {
    const likesRef = collection(db, 'creados', placeId, 'likes');
    const snapshot = await getDocs(likesRef);
    return snapshot.size; // Número de documentos = número de likes
}




const homeBtn = document.getElementById('home-btn')
if (homeBtn) {
    homeBtn.addEventListener('click', () => {
        obtainGlobalPlaces()



    })

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



if (elements.buttonCreatePlace) {
    elements.buttonCreatePlace.addEventListener('click', async (e) => {
        e.preventDefault()
        appState.create = true
        appState.home = false
        appState.map = false
        updateBarFromState()
        await enableCreatePlace()
    })

}



export function closeCreatedsPanel() {

    document.querySelector('.createds-places-panel').classList.remove('active')
    if (history.state && history.state.panel === 'publics') {
        history.back();
      }

}

if (elements.buttonClosePrivateCreateds) {
    elements.buttonClosePrivateCreateds.addEventListener('click', closePrivatesCreatedsPanel)
}




export function closePrivatesCreatedsPanel() {
    document.querySelector('.createds-privates-places-panel').classList.remove('active')
    if (history.state && history.state.panel === 'privates') {
        history.back();
      }
}


function showMenu() {
    menuOptions.classList.add('active')
    history.pushState({ panel: 'menu' }, '', window.location.href);
}
function closeMenu() {
    menuOptions.classList.remove('active')
    if (history.state && history.state.panel === 'menu') {
        history.back();
      }
}


if (elements.buttonCloseCreateds) {
    elements.buttonCloseCreateds.addEventListener('click', () => {

        closeCreatedsPanel()
    })
}



export const menuOptions = document.getElementById('get-options')


const settingsDropdown = document.getElementById('settings-menu')
document.addEventListener('click', (event) => {
    if (settingsDropdown &&
        settingsDropdown.style.display === 'block' &&
        !event.target.closest('#settings-menu') &&
        !event.target.closest('#settings-button')
    ) {
        closeSettings()
    }
    const mediaQuery = window.matchMedia('(max-width:1024px)')
    if (mediaQuery.matches) return
    if (menuOptions && menuOptions.classList.contains('active') && !event.target.closest('#get-options') && !event.target.closest('#toggle-menu')) {
        closeMenu()
    }
})

const downloadPol = document.getElementById('down-poli')
const downloadTer = document.getElementById('down-term')
if (downloadPol || downloadTer) {
    downloadPol.addEventListener('click', () => {
        window.location.href = '../privacyPolicy.html'
    })

    downloadTer.addEventListener('click', () => {
        window.location.href = '../termsConditions.html'
    })
}


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

                showSweetAlert(notification.title, notification, 'success', 'OK');
            });

            // 6. Acción del usuario sobre la notificación
            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {

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









// Handle URL parameters for web deep links
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}



