package com.newplace.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.google.android.gms.ads.MobileAds;
import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesConfiguration;
import java.util.ArrayList;
public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // ✅ Inicialización temprana del SDK de AdMob para evitar errores
    MobileAds.initialize(this, initializationStatus -> {
      // Puedes registrar aquí si quieres: Log.d("AdMob", "Inicializado correctamente");
    });
    
    // Initialize RevenueCat Purchases
    String revenueCatAPIKey = "goog_YhBEczdwaWegvjAeukgWXnDDDen"; // Reemplaza con tu API key
    Purchases.setDebugLogsEnabled(true);
    Purchases.configure(
      new PurchasesConfiguration.Builder(this, revenueCatAPIKey).build()
    );
  }

  @Override
  public void onStart() {
    super.onStart();
    // Sync purchases on app start
    Purchases.getSharedInstance().syncPurchases();
  }
}