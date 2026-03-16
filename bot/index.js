const admin = require('firebase-admin');
const axios = require('axios');

// Configuración de variables de entorno (GitHub Secrets)
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
const AGENTMAIL_INBOX_ID = 'legal-protection1'; // Tu slug de AgentMail
const SENDER_EMAIL = 'legal.protection1@agentmail.to';

// Inicializar Firebase
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function runVigilante() {
    console.log('🚀 Iniciando escaneo de Privacidad...');
    
    try {
        // En un proyecto real, aquí leeríamos tus datos de Firestore
        // Para este MVP, definimos un ejemplo de reclamación
        
        const brokerTest = {
            name: "Acxiom Corporation",
            optOutEmail: "privacy@acxiom.com"
        };

        console.log(`📡 Enviando reclamación legal a: ${brokerTest.name}`);

        const messageData = {
            inboxId: AGENTMAIL_INBOX_ID,
            to: [brokerTest.optOutEmail],
            subject: "REQUERIMIENTO LEGAL: Derecho al Olvido / Solicitud de Supresión de Datos (GDPR)",
            body: `
Estimado equipo de Privacidad de ${brokerTest.name},

Por medio de la presente, en ejercicio de mis derechos bajo el Reglamento General de Protección de Datos (GDPR) y normativas de privacidad vigentes, solicito la supresión definitiva de toda mi información personal de sus bases de datos y sistemas.

Atentamente,
Legal Privacy Agent
Identidad de Protección: ${SENDER_EMAIL}
            `
        };

        const response = await axios.post('https://api.agentmail.to/v1/messages', messageData, {
            headers: {
                'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 201 || response.status === 200) {
            console.log('✅ Solicitud enviada con éxito a través de AgentMail.');
        }

    } catch (error) {
        console.error('❌ Error en el proceso:', error.response ? error.response.data : error.message);
    }
}

runVigilante();
