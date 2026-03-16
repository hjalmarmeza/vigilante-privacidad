const admin = require('firebase-admin');
const axios = require('axios');

// Configuración de variables de entorno
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
const AGENTMAIL_INBOX_ID = process.env.AGENTMAIL_INBOX_ID || 'legal.protection1@agentmail.to';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'legal.protection1@agentmail.to';

function initFirebase() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error('❌ ERROR: FIREBASE_SERVICE_ACCOUNT no configurada.');
        process.exit(1);
    }
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
    } catch (error) {
        console.error('❌ ERROR Firebase:', error.message);
        process.exit(1);
    }
}

async function runVigilante() {
    initFirebase();
    const db = admin.firestore();
    console.log('🚀 Iniciando escaneo de brokers para envío...');

    try {
        const snapshot = await db.collection('brokers').get();
        const pendingBrokers = snapshot.docs.filter(doc => {
            const status = (doc.data().status || '').toLowerCase();
            return status === 'pendiente';
        });

        if (pendingBrokers.length === 0) {
            console.log('📭 No hay brokers pendientes (status: pendiente) en Firestore.');
            return;
        }

        console.log(`🔍 Encontrados ${pendingBrokers.length} brokers pendientes.`);

        for (const doc of pendingBrokers) {
            const broker = doc.data();
            console.log(`📧 Procesando: ${broker.name}`);
            
            try {
                // Actualizar a en_proceso
                await doc.ref.update({ status: 'en_proceso' });

                const response = await sendRemovalRequest(broker);
                
                if (response.status === 200 || response.status === 201) {
                    await doc.ref.update({ status: 'enviado', sentAt: admin.firestore.FieldValue.serverTimestamp() });
                    console.log(`✅ Enviado a ${broker.name}`);
                }
            } catch (err) {
                console.error(`❌ Error con ${broker.name}:`, err.message);
                await doc.ref.update({ status: 'pendiente' }); // Revertir para reintento
            }
        }
    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

async function sendRemovalRequest(broker) {
    const messageData = {
        to: broker.email || broker.optOutEmail,
        subject: `Solicitud de Eliminación de Datos - ${broker.name}`,
        text: `Solicito la eliminación de mis datos personales de sus sistemas bajo el amparo de las leyes de privacidad vigentes. Email de contacto: ${SENDER_EMAIL}`
    };
    const url = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(AGENTMAIL_INBOX_ID)}/messages/send`;
    return await axios.post(url, messageData, {
        headers: { 'Authorization': `Bearer ${AGENTMAIL_API_KEY}` },
        timeout: 10000
    });
}

runVigilante();
