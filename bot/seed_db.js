const admin = require('firebase-admin');

// Usar la variable de entorno para la service account
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('Error: FIREBASE_SERVICE_ACCOUNT not set');
    process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const initialBrokers = [
    { name: "Acxiom Corporation", email: "askprivacy@acxiom.com", risk: "Extremadamente Alto", status: "en_proceso" },
    { name: "Whitepages Inc.", email: "privacy@whitepages.com", risk: "Alto", status: "eliminado" },
    { name: "Spokeo Deep Search", email: "privacy@spokeo.com", risk: "Medio", status: "pendiente" },
    { name: "Oracle America", email: "privacy@oracle.com", risk: "Alto", status: "pendiente" },
    { name: "Epsilon", email: "privacy@epsilon.com", risk: "Alto", status: "en_proceso" }
];

async function seed() {
    console.log('Sembrando base de datos...');
    const batch = db.batch();
    
    initialBrokers.forEach(broker => {
        const ref = db.collection('brokers').doc();
        batch.set(ref, {
            ...broker,
            createdAt: new Date().toISOString()
        });
    });

    await batch.commit();
    console.log('✅ Base de datos sembrada con éxito.');
}

seed().catch(console.error);
