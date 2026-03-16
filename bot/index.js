const admin = require('firebase-admin');
const axios = require('axios');

// Configuración de variables de entorno
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
const AGENTMAIL_INBOX_ID = process.env.AGENTMAIL_INBOX_ID || 'legal.protection1@agentmail.to';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'legal.protection1@agentmail.to';

/**
 * Inicializa Firebase Admin utilizando la Service Account proporcionada en los secretos.
 */
function initFirebase() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error('❌ ERROR: La variable FIREBASE_SERVICE_ACCOUNT no está configurada.');
        process.exit(1);
    }

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        console.log('✅ Firebase inicializado correctamente.');
    } catch (error) {
        console.error('❌ ERROR al parsear FIREBASE_SERVICE_ACCOUNT:', error.message);
        process.exit(1);
    }
}

/**
 * Función principal del bot
 */
async function runVigilante() {
    console.log('🚀 --- INICIANDO VIGILANTE DE PRIVACIDAD ---');
    
    initFirebase();
    const db = admin.firestore();

    try {
        // Obtenemos los brokers que están en estado 'pendiente'
        console.log('📡 Buscando brokers pendientes de eliminación...');
        const brokersSnap = await db.collection('brokers')
            .where('status', '==', 'pendiente')
            .get();

        if (brokersSnap.empty) {
            console.log('📭 No hay brokers pendientes para procesar.');
            return;
        }

        console.log(`🔍 Se han encontrado ${brokersSnap.size} brokers para procesar.`);

        for (const doc of brokersSnap.docs) {
            const broker = doc.data();
            const brokerId = doc.id;
            
            console.log(`📧 Enviando requerimiento a: ${broker.name} (${broker.optOutEmail})`);
            
            try {
                // Cambiamos el estado a 'en_proceso' antes de enviar
                await db.collection('brokers').doc(brokerId).update({
                    status: 'en_proceso',
                    lastActionAt: admin.firestore.FieldValue.serverTimestamp()
                });

                const response = await sendRemovalRequest(broker);
                
                if (response.status === 200 || response.status === 201) {
                    console.log(`✅ Éxito con ${broker.name}: Status ${response.status}`);
                    
                    // Actualizamos a 'enviado' después del éxito
                    await db.collection('brokers').doc(brokerId).update({
                        status: 'enviado',
                        sentAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            } catch (error) {
                console.error(`⚠️ Fallo al enviar a ${broker.name}:`, 
                    error.response ? JSON.stringify(error.response.data) : error.message);
                
                // Si falla, lo devolvemos a 'pendiente' o marcamos error
                await db.collection('brokers').doc(brokerId).update({
                    status: 'pendiente',
                    lastError: error.message
                });
            }
        }

    } catch (error) {
        console.error('❌ Error crítico en el bucle principal:', error.message);
    } finally {
        console.log('🏁 --- SESIÓN FINALIZADA ---');
    }
}

/**
 * Envía la solicitud de eliminación vía AgentMail API v0
 */
async function sendRemovalRequest(broker) {
    if (!AGENTMAIL_API_KEY) {
        throw new Error('AGENTMAIL_API_KEY no configurada');
    }

    const messageData = {
        to: broker.optOutEmail,
        subject: `REQUERIMIENTO LEGAL (GDPR): Derecho al Olvido - ${broker.name}`,
        text: `
Estimado equipo de Privacidad de ${broker.name},

Por medio de la presente, en ejercicio de mis derechos bajo el Reglamento General de Protección de Datos (GDPR) y normativas de privacidad vigentes, solicito la supresión definitiva de toda mi información personal de sus bases de datos y sistemas.

Atentamente,
Vigilante de Privacidad (Agente Autónomo)
Identidad de Protección: ${SENDER_EMAIL}
        `.trim()
    };

    const url = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(AGENTMAIL_INBOX_ID)}/messages/send`;
    
    return await axios.post(url, messageData, {
        headers: {
            'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 15000
    });
}

// Ejecutar
runVigilante();
