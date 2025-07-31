import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import bodyParser from 'body-parser';
import { collection } from '@firebase/firestore';

admin.initializeApp();
const db = admin.firestore()
const app = express()

// Usa este código para capturar el rawBody
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));


app.post("/", async (req, res) => {
  const lemonSecret = ''
  const signature = req.get('X-Signature')

  const hmac = crypto
  .createHmac('sha256',lemonSecret)
  .update(req.rawBody)
  .digest('hex')

  if(signature !== hmac){
    console.warn('Firma invalida')
    return res.status(401).send('Firma no valida')
  }




  const event = req.body;

  const eventType = event?.meta?.event_name;
  const email = event?.data?.attributes?.user_email;

  console.log("Webhook recibido:", eventType, email);

  if (!email) {
    return res.status(400).send("Falta email");
  }

  if (["subscription_created", "subscription_updated"].includes(eventType)) {
    try {
      // Buscar usuario en tu colección "usuarios"
      const usersRef = db(collection,'usuarios')
      const snapshot = await usersRef.where("email", "==", email).get();

      if (snapshot.empty) {
        console.warn("No se encontró usuario con el email:", email);
        return res.status(404).send("Usuario no encontrado");
      }
      //actualizamos documentos con el email asignado
      const batch = db.batch()
      snapshot.forEach(doc => batch.update(doc.ref, { premium: true }))
      await batch.commit()
      console.log(`Premium activado para ${email}`);
      return res.status(200).send("Premium actualizado");
    } catch (err) {
      console.error("Error al actualizar premium:", err);
      return res.status(500).send("Error interno");
    }
  }

  res.status(200).send("Evento ignorado");
});

export const lemonWebhook = functions.https.onRequest(app)