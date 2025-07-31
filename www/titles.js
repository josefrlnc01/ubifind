import { auth, db } from "./firebaseConfig.js";
import { showSweetAlert } from "./script.js";
import { isPremium } from "./script.js";

// Declare contadorGeneralLogros at the top level
export let contadorGeneralLogros;

import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    where,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const logrosCollection = collection(db, 'logros');

// Función para inicializar el contador general desde Firebase
async function initContadorGeneral() {
    if (!auth.currentUser) {

        return 0;
    }
    try {
        const docRef = doc(db, 'logros', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            contadorGeneralLogros = data.contadorGeneralLogros || 0;
            return contadorGeneralLogros;
        } else {
            // Si no existe el documento, lo creamos con valores iniciales
            await setDoc(docRef, {
                contadorGeneralLogros: 0,
                contadorGuardados: 0,
                contadorVisitados: 0,
                contadorCreados: 0,
                contadorCompartidosGuardados: 0,
                contadorCompartidosCreados: 0,
                lastUpdated: serverTimestamp()
            });
            contadorGeneralLogros = 0;
            return 0;
        }
    } catch (error) {
        console.error('Error al obtener el contador general:', error);
        return 0;
    }
}

// Track if the counter has been initialized
let contadorInitialized = false;

// Export a function to safely get the counter value
export async function getContadorGeneralLogros() {
    if (!contadorInitialized) {
        contadorGeneralLogros = await initContadorGeneral();
        contadorInitialized = true;
    }
    return contadorGeneralLogros || 0; // Ensure we always return a number
}

// Initialize the counter in the background
let initializationPromise = initContadorGeneral().then(value => {
    contadorGeneralLogros = value || 0;
    contadorInitialized = true;
    return contadorGeneralLogros;
}).catch(error => {
    console.warn('Error initializing contadorGeneralLogros:', error);
    contadorGeneralLogros = 0;
    contadorInitialized = true;
    return 0;
});

// Export the promise for other modules to wait on if needed
export { initializationPromise as contadorInitializationPromise };


export async function InitTitlesUi() {
  // Constantes para los niveles de logros
  const LOGROS = {
    ENTUSIASTA: 100,
    VIAJERO: 200,
    EXPLORADOR: 300,
    EXPERTO: 400
  };
  
  const nameTitle = document.getElementById('name-title');
  const imageTitle = document.getElementById('image-profile');
  
  try {
    // Ensure counter is initialized and get its value
    const currentCounter = await getContadorGeneralLogros();
    contadorGeneralLogros = currentCounter; // Ensure the global is set
    
   
    
    
    // Check if elements exist
    if (!nameTitle || !imageTitle) {
      console.warn('Title elements not found in the DOM');
      return;
    }

    if (!isPremium) {
      const premiumLogo = document.getElementById('premium-logo');
      if (premiumLogo) {
        premiumLogo.style.display = 'none';
      }
    }
    
    // Set title and image based on achievements
    if (contadorGeneralLogros >= LOGROS.EXPERTO) {
      nameTitle.textContent = 'EXPERTO';
      imageTitle.setAttribute('src', 'images/mappiexperto.webp');
    } else if (contadorGeneralLogros >= LOGROS.EXPLORADOR) {
      nameTitle.textContent = 'EXPLORADOR';
      imageTitle.setAttribute('src', 'images/mappiexplorador.webp');
    } else if (contadorGeneralLogros >= LOGROS.VIAJERO) {
      nameTitle.textContent = 'VIAJERO';
      imageTitle.setAttribute('src', 'images/mappiviajero.webp');
    } else if (contadorGeneralLogros >= LOGROS.ENTUSIASTA) {
      nameTitle.textContent = 'ENTUSIASTA';
      imageTitle.setAttribute('src', 'images/mappientusiasta.webp');
    } else {
      nameTitle.textContent = 'NOVATO';
      imageTitle.setAttribute('src', 'images/mappinovato.webp');
    }
    
    // Initialize progress bars
    await initBarsSave();
    await initBarsVisit();
    await initBarsCreeate();
    await initBarsShareSave();
    await initBarsShareCreate();
    
  } catch (error) {
    console.warn('Error in InitTitlesUi:', error);
  }


  


  
  
  initBarsSave();
  initBarsVisit();
  initBarsCreeate();
  initBarsShareSave()
  initBarsShareCreate()

  // Establecer título e imagen según logros
  if (contadorGeneralLogros >= LOGROS.EXPERTO) {
    nameTitle.textContent = 'EXPERTO';
    imageTitle.setAttribute('src', 'images/mappiexperto.webp');
    showSweetAlert(
      '🥳 ¡INSIGNIA DE EXPERTO DESBLOQUEADA! 🥳',
      '¡TO-MA YA! Diplomatura en NewPlace, espero que estés disfrutando tu viaje porque sin ello nada de esto tendría sentido. FELICIDADES 🎊💜',
      'success',
      'SEGUIR DESCUBRIENDO EL MUNDO'
    );
  } else if (contadorGeneralLogros >= LOGROS.EXPLORADOR) {
    nameTitle.textContent = 'EXPLORADOR';
    imageTitle.setAttribute('src', 'images/mappiexplorador.webp');
    showSweetAlert(
      '🥳 ¡INSIGNIA DE EXPLORADOR DESBLOQUEADA! 🥳',
      '¡¡¡No se te escapa nada!!! Has llegado muy lejos',
      'success',
      'HASTA EL INFINITO Y MÁS ALLÁ'
    );
  } else if (contadorGeneralLogros >= LOGROS.VIAJERO) {
    nameTitle.textContent = 'VIAJERO';
    imageTitle.setAttribute('src', 'images/mappiviajero.webp');
    showSweetAlert(
      '🥳 ¡INSIGNIA DE VIAJERO DESBLOQUEADA! 🥳',
      '¡WOW! Un nuevo viajero en la comunidad. 😎 ROAD TO THE MOON 😎',
      'success',
      '¡¡GO!!'
    );
  } else if (contadorGeneralLogros >= LOGROS.ENTUSIASTA) {
    nameTitle.textContent = 'ENTUSIASTA';
    imageTitle.setAttribute('src', 'images/mappientusiasta.webp');
    showSweetAlert(
      '🥳 ¡INSIGNIA DE ENTUSIASTA DESBLOQUEADA! 🥳',
      'Has dado un gran paso en la exploración de lugares. ¿Vamos a por más?',
      'success',
      '¡¡VAMOS!!'
    );
  } else {
    nameTitle.textContent = 'NOVATO';
    imageTitle.setAttribute('src', 'images/mappinovato.webp');
  }


}








async function initBarsSave(){
    let count = 0;
    const docRef = doc(db, 'logros', auth.currentUser.uid);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
        count = snapshot.data().contadorGuardados || 0;
    }

    const bar5 = document.querySelector('.bar-save5');
    if (bar5) {
        actualizarBarraProgreso('bar-save5', count, 5);
    }
    
    const bar20 = document.querySelector('.bar-save20');
    if (bar20) {
        actualizarBarraProgreso('bar-save20', count, 20);
    }

    const bar50 = document.querySelector('.bar-save50');
    if (bar50) {
        actualizarBarraProgreso('bar-save50', count, 50);
    }

    const bar100 = document.querySelector('.bar-save100');
    if (bar100) {
        actualizarBarraProgreso('bar-save100', count, 100);
    }

    const bar200 = document.querySelector('.bar-save200');
    if (bar200) {
        actualizarBarraProgreso('bar-save200', count, 200);
    }
}


async function initBarsVisit(){
    let count = 0;
    const docRef = doc(db, 'logros', auth.currentUser.uid);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
        count = snapshot.data().contadorVisitados || 0;
    }

    const bar2 = document.querySelector('.bar-visit2');
    if (bar2) {
        actualizarBarraProgreso('bar-visit2', count, 2);
    }

    const bar5 = document.querySelector('.bar-visit10');
    if (bar5) {
        actualizarBarraProgreso('bar-visit10', count, 10);
    }

    const bar25 = document.querySelector('.bar-visit25');
    if (bar25) {
        actualizarBarraProgreso('bar-visit25', count, 25);
    }

    const bar50 = document.querySelector('.bar-visit50');
    if (bar50) {
        actualizarBarraProgreso('bar-visit50', count, 50);
    }

    const bar100 = document.querySelector('.bar-visit100');
    if (bar100) {
        actualizarBarraProgreso('bar-visit100', count, 100);
    }
}


async function initBarsCreeate(){
    let count = 0;
    const docRef = doc(db, 'logros', auth.currentUser.uid);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
        count = snapshot.data().contadorCreados || 0;
    }

    const bar2 = document.querySelector('.bar-create2');
    if (bar2) {
        actualizarBarraProgreso('bar-create2', count, 2);
    }

    const bar5 = document.querySelector('.bar-create10');
    if (bar5) {
        actualizarBarraProgreso('bar-create10', count, 10);
    }

    const bar25 = document.querySelector('.bar-create20');
    if (bar25) {
        actualizarBarraProgreso('bar-create20', count, 20);
    }

    const bar50 = document.querySelector('.bar-create35');
    if (bar50) {
        actualizarBarraProgreso('bar-create35', count, 35);
    }

    const bar100 = document.querySelector('.bar-create50');
    if (bar100) {
        actualizarBarraProgreso('bar-create50', count, 100);
    }
}

//contadorGeneralLogros++
    //localStorage.setItem('contadorGeneralLogros',contadorGeneralLogros.toString())

export async function incrementarContadorGuardadosLogro(){
    let count = 0
    const docRef = doc(db,'logros',auth.currentUser.uid)
    
    
    const snapshot = await getDoc(docRef)
    if (snapshot.exists()) {
      // El documento existe, puedes actualizarlo
      await updateDoc(docRef, {
        contadorGuardados: increment(1)
      });
      count = snapshot.data().contadorGuardadosLogro
    } else {
      // El documento no existe, créalo primero
      await setDoc(docRef, {
        contadorGuardados: 1
      });
    }

    actualizarBarraProgreso('bar-save5', count, 5);
    actualizarBarraProgreso('bar-save20', count, 20);
    actualizarBarraProgreso('bar-save50', count, 50);
    actualizarBarraProgreso('bar-save100', count, 100);
    actualizarBarraProgreso('bar-save200', count, 200);
  
    document.querySelectorAll('.boxbar').forEach(bar => {
        bar.offsetHeight; // Esto fuerza un reflow
    });
  
}

// Inicializa las barras de progreso para compartidos guardados
export async function initBarsShareSave() {
    let count = 0;
    const docRef = doc(db, 'logros', auth.currentUser.uid);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
        count = snapshot.data().contadorCompartidosGuardados || 0;
    }
    
    // Actualizar barras de progreso
    actualizarBarraProgreso('bar-sharesave2', count, 2);
    actualizarBarraProgreso('bar-sharesave10', count, 10);
    actualizarBarraProgreso('bar-sharesave25', count, 25);
    actualizarBarraProgreso('bar-sharesave40', count, 40);
    actualizarBarraProgreso('bar-sharesave50', count, 50);
  
    // Forzar reflow para asegurar que las animaciones se actualicen
    document.querySelectorAll('.boxbar').forEach(bar => {
        bar.offsetHeight; // Esto fuerza un reflow
    });
}



// Inicializa las barras de progreso para compartidos creados
export async function initBarsShareCreate() {
    let count = 0;
    const docRef = doc(db, 'logros', auth.currentUser.uid);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
        count = snapshot.data().contadorCompartidosCreados || 0;
    }
    
    // Actualizar barras de progreso
    actualizarBarraProgreso('bar-sharecreate2', count, 2);
    actualizarBarraProgreso('bar-sharecreate10', count, 10);
    actualizarBarraProgreso('bar-sharecreate25', count, 25);
    actualizarBarraProgreso('bar-sharecreate40', count, 40);
    actualizarBarraProgreso('bar-sharecreate50', count, 50);

    // Forzar reflow para asegurar que las animaciones se actualicen
    document.querySelectorAll('.boxbar').forEach(bar => {
        bar.offsetHeight; // Esto fuerza un reflow
    });
}

export async function incrementarContadorVisitadosLogro(){
    const docRef = doc(db,'logros',auth.currentUser.uid)
    let count = 0
    const snapshot = await getDoc(docRef)
    if (snapshot.exists()) {
      // El documento existe, podemos actualizarlo
      
      await updateDoc(docRef, {
        contadorVisitados: increment(1)
      });
      count = snapshot.data().contadorGuardadosLogro
    } else {
      // El documento no existe, lo creamos
      await setDoc(docRef, {
        contadorVisitados: 1
      });
    }

    contadorGeneralLogros++
    localStorage.setItem('contadorGeneralLogros',contadorGeneralLogros.toString())
    
    // Actualizar cada barra de progreso según corresponda
    actualizarBarraProgreso('bar-visit2', count, 2);
    actualizarBarraProgreso('bar-visit10', count, 10);
    actualizarBarraProgreso('bar-visit25', count, 25);
    actualizarBarraProgreso('bar-visit50', count, 50);
    actualizarBarraProgreso('bar-visit100', count, 100);
    
    // Forzar actualización del DOM
    document.querySelectorAll('.boxbar').forEach(bar => {
        bar.offsetHeight; // Esto fuerza un reflow
    });
}

export function actualizarBarraProgreso(barClass, valorActual, valorMaximo) {
    const barras = document.querySelectorAll(`.${barClass}`);
    barras.forEach(barra => {
        if (barra) {
            const porcentaje = Math.min((valorActual / valorMaximo) * 100, 100);
            // Usar requestAnimationFrame para asegurar la actualización del DOM
            requestAnimationFrame(() => {
                barra.style.width = `${porcentaje}%`;
                
                
                    barra.style.background= 'linear-gradient(to right,rgb(123, 159, 123) 20%, rgb(82, 156, 82) 50%, rgb(29, 255, 29) 100%)'
               
                
                
            });
        }
    });
}

export async function incrementarContadorCompartidosGuardadosLogro(){
    const docRef = doc(db,'logros',auth.currentUser.uid)
    let count = 0
    const snapshot = await getDoc(docRef)
    if (snapshot.exists()) {
      // El documento existe, podemos actualizarlo
      await updateDoc(docRef, {
        contadorCompartidosGuardados: increment(1)
      });
      count = snapshot.data().contadorCompartidosGuardados
    } else {
      // El documento no existe, lo creamos
      await setDoc(docRef, {
        contadorCompartidosGuardados: 1
      });
    }

    contadorGeneralLogros += 2
    localStorage.setItem('contadorGeneralLogros', contadorGeneralLogros.toString())
    
    actualizarBarraProgreso('bar-sharesave2', count, 2)
    actualizarBarraProgreso('bar-sharesave10', count, 10)
    actualizarBarraProgreso('bar-sharesave25', count, 25)
    actualizarBarraProgreso('bar-sharesave40', count, 40)
    actualizarBarraProgreso('bar-sharesave50', count, 50)
}

export async function incrementarContadorCompartidosCreadosLogros(){
    const docRef = doc(db,'logros',auth.currentUser.uid)
    let count = 0
    const snapshot = await getDoc(docRef)
    if (snapshot.exists()) {
      // El documento existe, podemos actualizarlo
      await updateDoc(docRef, {
        contadorCompartidosCreados: increment(1)
      });
      count = snapshot.data().contadorCompartidosCreados
    } else {
      // El documento no existe, lo creamos
      await setDoc(docRef, {
        contadorCompartidosCreados: 1
      });
    }

    contadorGeneralLogros += 2
    localStorage.setItem('contadorGeneralLogros', contadorGeneralLogros.toString())
    
    actualizarBarraProgreso('bar-sharecreate2', count, 2)
    actualizarBarraProgreso('bar-sharecreate10', count, 10)
    actualizarBarraProgreso('bar-sharecreate25', count, 25)
    actualizarBarraProgreso('bar-sharecreate40', count, 40)
    actualizarBarraProgreso('bar-sharecreate50', count, 50)
}

export async function incrementarContadorCreadosLogro(){
    const docRef = doc(db,'logros',auth.currentUser.uid)
    let count = 0
    const snapshot = await getDoc(docRef)
    if (snapshot.exists()) {
      // El documento existe, podemos actualizarlo
      await updateDoc(docRef, {
        contadorCreados: increment(1),
        contadorGeneralLogros: increment(1)
      });
      count = snapshot.data().contadorCreados
    } else {
      // El documento no existe, lo creamos
      await setDoc(docRef, {
        contadorCreados: 1,
        contadorGeneralLogros: 1
      });
    }

    actualizarBarraProgreso('bar-create2', count, 2)
    actualizarBarraProgreso('bar-create10', count, 10)
    actualizarBarraProgreso('bar-create20', count, 20)
    actualizarBarraProgreso('bar-create35', count , 35)
    actualizarBarraProgreso('bar-create50', count, 50)

    document.querySelectorAll('.boxbar').forEach(bar => {
        bar.offsetHeight; // Esto fuerza un reflow
    });
}

// Initialize local storage counters if they don't exist
if (!localStorage.getItem('contadorGuardadosLogro')) {
  localStorage.setItem('contadorGuardadosLogro', '0');
}
if (!localStorage.getItem('contadorVisitadosLogro')) {
  localStorage.setItem('contadorVisitadosLogro', '0');
}
if (!localStorage.getItem('contadorCreadosLogro')) {
  localStorage.setItem('contadorCreadosLogro', '0');
}


