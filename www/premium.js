
import { auth } from "./firebaseConfig.js";
import { desbloqueoGuardado, 
  showSweetAlert,
  desbloqueoBusquedas, 
  showErrorNotification,
isPremium, 

desbloqueoCreados} from "./script.js";
 let Purchases = window.Capacitor?.Plugins?.Purchases || window.Purchases;



export async function enablePremium() {
  if (auth.currentUser) {
    
    isPremium = true;
    desbloqueoBusquedas();
    desbloqueoGuardado();
    desbloqueoCreados()
    //desbloqueoTrackings();
    localStorage.setItem('isPremium','true')
    const userRef = doc(db, 'usuarios', uid);
    await updateDoc(userRef, {
      premium: true
    });

    
    
  } else {
    showErrorNotification('No estás autenticado');
    return
  }
}

// Función para verificar la configuración de firma
async function checkAppSignature() {
  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const platform = window.Capacitor.getPlatform();
      console.log('Plataforma detectada:', platform);
      
      if (platform === 'android') {
        const { App } = window.Capacitor.Plugins;
        if (App && App.getInfo) {
          const appInfo = await App.getInfo();
          console.log('Información de la aplicación:', appInfo);
          return {
            platform,
            appId: appInfo.id,
            appVersion: appInfo.version,
            appBuild: appInfo.build
          };
        }
      }
    }
  } catch (error) {
    console.error('Error al obtener información de la aplicación:', error);
  }
  return null;
}
const LOG_LEVEL = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  SUPPRESS: "SUPPRESS"
};


const apiKeyGoogle = 'goog_YhBEczdwaWegvjAeukgWXnDDDen';
const containerPremium = document.getElementById('confirm-premium');

async function checkBillingAvailable() {
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases) {
      const { Purchases } = window.Capacitor.Plugins;
      // Intentar obtener información del cliente para verificar la disponibilidad
      await Purchases.getCustomerInfo();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error al verificar facturación:', error);
    return false;
  }
}

localStorage.setItem('contadorBusquedasHoy', '0')
const updateCustomerInformation = async (customerInfo) => {
  const newUser = { items: [], pro: 'false' };
  const entitlement = customerInfo?.entitlements?.active?.premium_upgrade;

  if (entitlement !== undefined) {
    newUser.items.push(entitlement.identifier);
    newUser.pro = 'true';
    enablePremium();
  }

  return newUser;
};

async function loadOfferings() {
  try {
    console.log('=== Cargando ofertas ===');
    // Forzar actualización de la caché
    const forceUpdate = true;
    const offerings = await Purchases.getOfferings(forceUpdate);
    
    if (!offerings) {
      throw new Error('No se pudieron cargar las ofertas');
    }
    
    const currentOffering = offerings.current;
    if (currentOffering) {
      console.log("📦 Paquetes disponibles:", currentOffering.availablePackages);
      return currentOffering.availablePackages;
    } else {
      console.warn('No hay ofertas actuales disponibles');
      return [];
    }
  } catch (err) {
    console.error("❌ Error al cargar ofertas:", err);
    throw err; // Relanzar para manejo en el código que llama
    return
  }
}


// Inicialización cuando el dispositivo esté listo
document.addEventListener('deviceready', () => {
  console.log('Dispositivo listo, inicializando...');
  
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log('Usuario autenticado, inicializando RevenueCat...');
      await initRevenueCat();
      await loadOfferings();
      
    }
  });
  
  const premiumButton = document.getElementById('show-subscriptions');
  premiumButton.addEventListener('click', handlePremiumPurchase)
}, false);

