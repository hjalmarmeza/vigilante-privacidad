const admin = require('firebase-admin');
const axios = require('axios');

// Configuración de variables de entorno (Prioridad a Secretos)
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
const AGENTMAIL_INBOX_ID = process.env.AGENTMAIL_INBOX_ID || 'legal.protection1@agentmail.to';
const SENDER_EMAIL = 'legal.protection1@agentmail.to';

function initFirebase() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error('❌ ERROR: FIREBASE_SERVICE_ACCOUNT no configurada.');
        process.exit(1);
    }
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error('❌ ERROR Firebase Initialization:', error.message);
        process.exit(1);
    }
}

async function runVigilante() {
    initFirebase();
    const db = admin.firestore();
    console.log('🚀 SYSTEM: Vigilante Bot Scan Start');

    try {
        // Buscar brokers con estado 'pendiente'
        const snapshot = await db.collection('brokers').where('status', '==', 'pendiente').get();

        if (snapshot.empty) {
            console.log('📭 No hay solicitudes pendientes de envío.');
            return;
        }

        console.log(`🔍 Encontrados ${snapshot.size} brokers para procesar.`);

        for (const doc of snapshot.docs) {
            const broker = doc.data();
            console.log(`📧 Procesando solicitud para: ${broker.name}`);
            
            try {
                // Paso 1: Marcar como en proceso para evitar duplicados
                await doc.ref.update({ status: 'en_proceso' });

                // Paso 2: Enviar vía AgentMail
                const response = await sendRemovalRequest(broker);
                
                if (response.status === 200 || response.status === 201 || response.status === 202) {
                    await doc.ref.update({ 
                        status: 'enviado', 
                        sentAt: admin.firestore.FieldValue.serverTimestamp() 
                    });
                    console.log(`✅ CORREO ENVIADO EXITOSAMENTE A ${broker.name}`);
                } else {
                    throw new Error(`Unexpected Status Code: ${response.status}`);
                }
            } catch (err) {
                console.error(`❌ Error enviando a ${broker.name}:`, err.response ? err.response.data : err.message);
                // Revertir a pendiente para reintento si no es un error fatal
                await doc.ref.update({ status: 'pendiente' });
            }
        }
    } catch (error) {
        console.error('❌ CRITICAL ERROR:', error.message);
    }
}

async function sendRemovalRequest(broker) {
    const targetEmail = broker.email || broker.optOutEmail;
    
    if (!targetEmail) {
        throw new Error('No se encontró email del broker en el documento.');
    }

    // Estructura oficial según última validación de AgentMail API v0
    const messageData = {
        inbox_id: AGENTMAIL_INBOX_ID,
        to: targetEmail,
        subject: `Data Removal Request (GDPR/CCPA) - User: Hjalmar Meza`,
        text: `To whom it may concern at ${broker.name},

Pursuant to privacy regulations, I hereby request the immediate removal of all personal data associated with my identity from your systems and databases.

Please confirm compliance once the process is complete. 
Contact for follow-up: ${SENDER_EMAIL}

Security ID: ${broker.id || 'REF-' + Date.now()}
Best regards,
Vigilante Privacy Shield`
    };

    // Usamos el endpoint global /v0/messages que es más estable
    const url = 'https://api.agentmail.to/v0/messages';
    
    console.log(`📡 Enviando a ${targetEmail} vía ${url}...`);

    return await axios.post(url, messageData, {
        headers: { 
            'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 15000
    });
}

// Ejecutar
runVigilante().then(() => {
    console.log('🏁 SYSTEM: Scan Cycle Complete');
}).catch(err => {
    console.error('💥 SYSTEM: Fatal Error', err);
});
