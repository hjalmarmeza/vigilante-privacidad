document.addEventListener('DOMContentLoaded', () => {
    console.log('--- Vigilante Engine: Core Initialized ---');

    // --- ELEMENTOS DEL DOM ---
    const UI = {
        navItems: document.querySelectorAll('.nav-item, .nav-item-mobile'),
        sections: document.querySelectorAll('.view-section'),
        configModal: document.getElementById('configModal'),
        openConfigBtn: document.getElementById('openConfig'),
        closeModalBtn: document.querySelector('.close-modal'),
        // Perfil Form
        profileForm: document.getElementById('profileForm'),
        emailInput: document.getElementById('emailInput'),
        addEmailBtn: document.getElementById('addEmailBtn'),
        emailList: document.getElementById('emailList'),
        // Otros
        scanBtn: document.getElementById('startFullScan'),
    };

    let userEmails = [];

    // --- 1. NAVEGACIÓN (SISTEMA INTEGRAL) ---
    function switchView(viewId) {
        console.log('Navegando a:', viewId);
        
        if (viewId === 'configuracion' || viewId === 'ajustes') {
            if (UI.configModal) UI.configModal.classList.add('active');
            return;
        }

        UI.navItems.forEach(nav => {
            const vid = nav.getAttribute('data-view');
            nav.classList.toggle('active', vid === viewId);
        });

        UI.sections.forEach(sec => {
            sec.classList.toggle('active', sec.id === `${viewId}-view`);
        });

        if (UI.configModal) UI.configModal.classList.remove('active');
    }

    UI.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    // --- 2. GESTIÓN DE MODALES ---
    if (UI.openConfigBtn) UI.openConfigBtn.addEventListener('click', () => UI.configModal.classList.add('active'));
    if (UI.closeModalBtn) UI.closeModalBtn.addEventListener('click', () => UI.configModal.classList.remove('active'));
    
    window.addEventListener('click', (e) => {
        if (e.target === UI.configModal) UI.configModal.classList.remove('active');
    });

    // --- 3. FUNCIONALIDAD: AÑADIR EMAILS (CONFIGURACIÓN) ---
    if (UI.addEmailBtn) {
        UI.addEmailBtn.addEventListener('click', () => {
            const email = UI.emailInput.value.trim();
            if (email && email.includes('@')) {
                if (!userEmails.includes(email)) {
                    userEmails.push(email);
                    renderEmailChips();
                    UI.emailInput.value = '';
                } else {
                    alert('Este correo ya ha sido añadido.');
                }
            } else {
                alert('Por favor, ingresa un correo válido.');
            }
        });
    }

    function renderEmailChips() {
        if (!UI.emailList) return;
        UI.emailList.innerHTML = '';
        userEmails.forEach((email, index) => {
            const chip = document.createElement('div');
            chip.className = 'email-chip';
            chip.style = 'background: rgba(245, 158, 11, 0.1); color: var(--accent); padding: 5px 12px; border-radius: 8px; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; margin: 4px; border: 1px solid rgba(245, 158, 11, 0.2);';
            chip.innerHTML = `
                <span>${email}</span>
                <i class="fas fa-times" style="cursor: pointer;" onclick="window.removeEmail(${index})"></i>
            `;
            UI.emailList.appendChild(chip);
        });
    }

    window.removeEmail = (index) => {
        userEmails.splice(index, 1);
        renderEmailChips();
    };

    // --- 4. FUNCIONALIDAD: GUARDAR PERFIL (FIREBASE) ---
    if (UI.profileForm) {
        UI.profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = UI.profileForm.querySelector('button[type="submit"]');
            const originalText = saveBtn.innerHTML;
            
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            saveBtn.disabled = true;

            const profileData = {
                name: document.getElementById('profileName').value,
                phone: document.getElementById('profilePhone').value,
                emails: userEmails,
                updatedAt: new Date().toISOString()
            };

            try {
                if (window.firebaseDb && window.firestoreTools) {
                    const { doc, setDoc } = window.firestoreTools;
                    await setDoc(doc(window.firebaseDb, "users", "main_user"), profileData);
                    alert('✅ Perfil guardado con éxito en Firebase.');
                    UI.configModal.classList.remove('active');
                } else {
                    throw new Error('Firebase no inicializado correctamente.');
                }
            } catch (err) {
                console.error(err);
                alert('Error al guardar: ' + err.message);
            } finally {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        });
    }

    // --- 5. FUNCIONALIDAD: ESCANEO GLOBAL ---
    if (UI.scanBtn) {
        UI.scanBtn.addEventListener('click', async () => {
            UI.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando brechas...';
            UI.scanBtn.disabled = true;
            UI.scanBtn.style.opacity = '0.7';

            // Simulación de escaneo 
            await new Promise(r => setTimeout(r, 2500));

            UI.scanBtn.innerHTML = '<i class="fas fa-check"></i> Escaneo Completado';
            UI.scanBtn.style.background = 'var(--green)';
            UI.scanBtn.style.opacity = '1';

            setTimeout(() => {
                UI.scanBtn.innerHTML = 'Iniciar Escaneo Global';
                UI.scanBtn.style.background = 'var(--accent)';
                UI.scanBtn.disabled = false;
            }, 3000);
        });
    }

    // --- 6. INTEGRACIÓN FIRESTORE (DASHBOARD REAL-TIME) ---
    const db = window.firebaseDb;
    const tools = window.firestoreTools;

    if (db && tools) {
        const { collection, onSnapshot } = tools;
        onSnapshot(collection(db, "brokers"), (snapshot) => {
            const brokers = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            renderDashboard(brokers);
        });
    }

    function renderDashboard(brokers) {
        // Actualizar Stats
        const total = brokers.length;
        const sent = brokers.filter(b => ['enviado', 'en_proceso'].includes((b.status || '').toLowerCase())).length;
        const deleted = brokers.filter(b => (b.status || '').toLowerCase() === 'eliminado').length;

        setText('.mini-stats:nth-child(1) .mini-value', total);
        setText('.mini-stats:nth-child(2) .mini-value', sent);
        setText('.mini-stats:nth-child(3) .mini-value', deleted);

        // Score
        const score = total > 0 ? Math.round((deleted / total) * 100) : 0;
        const circle = document.querySelector('.circle');
        const pctText = document.querySelector('.percentage');
        if (circle) circle.style.strokeDasharray = `${score}, 100`;
        if (pctText) pctText.textContent = `${score}%`;

        // Tabla
        const tbody = document.querySelector('.broker-table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            if (brokers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay brokers pendientes.</td></tr>';
            }
            brokers.forEach(b => {
                const status = (b.status || 'pendiente').toLowerCase();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong style="color:#fff">${b.name}</strong></td>
                    <td><span class="badge ${b.risk === 'Alto' ? 'high' : 'medium'}">${b.risk}</span></td>
                    <td>${new Date().toLocaleDateString()}</td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                    <td><button class="btn-icon" onclick="window.handleAction('${b.name}')"><i class="fas fa-paper-plane"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    function setText(sel, txt) {
        const el = document.querySelector(sel);
        if (el) el.textContent = txt;
    }
});

// Funciones globales para botones dinámicos
window.handleAction = (name) => {
    alert('Iniciando solicitud de eliminación manual para: ' + name);
};
