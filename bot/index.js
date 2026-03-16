const admin = require('firebase-admin');
const axios = require('axios');

// Configuración de variables de entorno
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
// Usamos el email completo como ID del inbox, que es el estándar de AgentMail v0
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
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
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
        // Simulación de brokers para el MVP
        const brokers = [
            { name: "Acxiom Corporation", optOutEmail: "privacy@acxiom.com" },
        ];

        for (const broker of brokers) {
            console.log(`📡 Procesando reclamación legal para: ${broker.name}`);
            
            try {
                const response = await sendRemovalRequest(broker);
                console.log(`✅ Éxito con ${broker.name}: Status ${response.status}`);
            } catch (error) {
                console.error(`⚠️ Fallo al enviar a ${broker.name}:`, 
                    error.response ? JSON.stringify(error.response.data) : error.message);
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

    // La ruta oficial para enviar es: /v0/inboxes/{id}/messages/send
    const url = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(AGENTMAIL_INBOX_ID)}/messages/send`;
    
    console.log(`📤 Enviando mensaje a través de: ${url}`);

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
