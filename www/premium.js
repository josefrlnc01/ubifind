
import { auth } from "./firebaseConfig.js";
import { desbloqueoGuardado, 

  showSweetAlert,
  desbloqueoBusquedas, 
  showNotification, 
  showErrorNotification,
isPremium, 
showSweetDeleteAlert,
isUserPremiumAtStorage,
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

    showSweetAlert('¡¡¡PREMIUM ACTIVO!!!', ' ¿ Preparado/a para explorar como nunca antes ? 🎒🤩​','success','¡A TOPE!' )
    
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

async function initRevenueCat() {
  

  try {
    console.log('=== Inicializando RevenueCat ===');
    
    // Verificar disponibilidad de facturación
    const billingAvailable = await checkBillingAvailable();
    if (!billingAvailable) {
      const errorMsg = 'La facturación no está disponible en este dispositivo. Por favor, asegúrate de que:' +
        '\n1. Tienes una cuenta de Google configurada' +
        '\n2. La Play Store está actualizada' +
        '\n3. Tienes conexión a internet';
      console.error(errorMsg);
      showSweetAlert('Error', errorMsg, 'warning', 'OK');
      return;
    }
    
    // Verificar la firma de la aplicación
    const signature = await checkAppSignature();
    console.log('Firma de la aplicación:', signature);
    
    if (!Purchases) {
      const errorMsg = 'RevenueCat no está disponible. Asegúrate de que el plugin esté correctamente instalado.';
      console.error(errorMsg);
      showSweetAlert('Error', errorMsg, 'warning', 'OK');
      return;
    }

    console.log('RevenueCat versión:', Purchases.FRAMEWORK_VERSION);
    
    
    try {
      if (window.Capacitor.getPlatform() === 'android') {
       
        
        const config = {
          apiKey: apiKeyGoogle,
          appUserID: auth.currentUser?.uid || 'anon',
          observerMode: false,
          useAmazon: false
        };
        
        console.log('Configuración de RevenueCat:', config);
        
        await Purchases.configure(config);
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        
        console.log('=== RevenueCat configurado correctamente ===');
      }

      // Habilitar logs detallados
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      console.log('Nivel de log configurado a DEBUG');

      // Verificar la configuración
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('Información del cliente obtenida:', customerInfo);
      updateCustomerInformation(customerInfo);

      // Configurar listener de actualizaciones
      Purchases.addCustomerInfoUpdateListener(info => {
        console.log('Actualización de información del cliente recibida:', info);
        updateCustomerInformation(info);
        if (info.entitlements?.active?.premium) {
          console.log('Usuario ahora tiene acceso premium');
          enablePremium();
        }
      });

    } catch (configError) {
      console.error('Error en la configuración de RevenueCat:', configError);
      console.error('Stack trace:', configError.stack);
      throw new Error(`Error de configuración: ${configError.message}`);
    }

  } catch (error) {
    const errorMsg = `Error en RevenueCat: ${error.message || 'Error desconocido'}`;
    console.error(errorMsg, error);
    showSweetAlert('Error', errorMsg, 'warning','OK')
    return
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

// Función para manejar la compra premium
async function handlePremiumPurchase() {
  try {
    console.log('=== Iniciando flujo de compra premium ===');
    
    // Verificar conexión a internet
    if (!navigator.onLine) {
      const errorMsg = 'No hay conexión a Internet. Por favor, verifica tu conexión e inténtalo de nuevo.';
      console.error(errorMsg);
      showSweetAlert('Error', errorMsg, 'warning','OK')
      
      return;
    }
    
    // Verificar autenticación
    if (!auth.currentUser) {
      const errorMsg = 'Por favor inicia sesión primero';
      console.error(errorMsg);
      showSweetAlert('Error', errorMsg, 'warning','OK')
      return;
    }

    console.log('Usuario autenticado, buscando ofertas...');
    
    // Mostrar indicador de carga
    if (containerPremium) {
      containerPremium.style.display = 'flex';
      containerPremium.style.animation = 'zoomFadeIn .7s both';
    }
    
    try {
      // Obtener ofertas disponibles (forzando actualización)
      console.log('Cargando ofertas...');
      const offerings = await Purchases.getOfferings();
      if(!window.Capacitor.isNativePlatform()){

      }
      
      if (!offerings || offerings.length === 0) {
        throw new Error('No se encontraron paquetes disponibles. Por favor, inténtalo de nuevo más tarde.');
      }
      
      console.log('Paquetes disponibles:', offerings);

      // Buscar el paquete premium
      const pack = offerings.current?.availablePackages?.find(p => p.identifier === 'monthly_uppgrade');
      console.log('🧪 pack (completo):', JSON.stringify(pack, null, 2));
      console.log("📦 Identificadores de paquetes disponibles:");
offerings.current?.availablePackages?.forEach(p => {
  console.log(p.identifier);
});

      console.log('Paquete seleccionado:', pack);
      console.log('Iniciando proceso de compra...');
      
      // Iniciar el flujo de compra
      try {
        if(!pack){
          showSweetAlert('Error', 'No se encontró el paquete', 'warning','OK')
          
          return
        }
        const purchaserInfo = await Purchases.purchasePackage({ aPackage: pack });
        console.log("✅ Compra completada con éxito:", purchaserInfo);
        
        // Actualizar el estado premium
        const customerInfo = await Purchases.getCustomerInfo();
        console.log('Información actualizada del cliente:', customerInfo);
        updateCustomerInformation(customerInfo);
        
        enablePremium()
        
        
      } catch (purchaseError) {
        console.error('❌ Error durante la compra:', purchaseError);
        
        if (purchaseError.userCancelled) {
          console.log('El usuario canceló la compra');
          showSweetAlert('Compra cancelada', 'Tu compra ha sido cancelada correctamente', 'success', 'OK');
          return
        } else {
          const errorMsg = `Error durante la compra: ${purchaseError.message || 'Error desconocido'}`;
          console.error(errorMsg, purchaseError);
          showSweetAlert('Error', errorMsg, 'warning', 'OK');
          return
        }
        return// Relanzar para manejo adicional si es necesario
      }
    } catch (error) {
      console.error('❌ Error en el flujo de compra premium:', error);
      // Mostrar mensaje de error genérico al usuario
      showSweetAlert('Error', 'Ocurrió un error al procesar la compra. Por favor, inténtalo de nuevo más tarde.', 'warning', 'OK');
      
      return
      // Relanzar para manejo adicional si es necesario
    }
  } finally {
    // Ocultar indicador de carga
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

