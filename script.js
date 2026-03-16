document.addEventListener('DOMContentLoaded', () => {
    console.log('--- VIGILANTE OS: SECURE CORE INITIALIZED ---');

    // --- 1. ELEMENTOS CORE ---
    const navItems = document.querySelectorAll('.nav-item, .nav-item-mobile');
    const sections = document.querySelectorAll('.view-section');
    const modal = document.getElementById('configModal');
    const profileForm = document.getElementById('profileForm');
    const emailList = document.getElementById('emailList');
    const emailInput = document.getElementById('emailInput');
    const addEmailBtn = document.getElementById('addEmailBtn');
    
    let userEmails = [];

    // --- 2. MOTOR DE NAVEGACIÓN ---
    function navigate(viewId) {
        if (viewId === 'configuracion') {
            modal.classList.add('active');
            return;
        }

        // Actualizar UI de navegación
        navItems.forEach(item => {
            if (item.getAttribute('data-view') === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Cambiar sección visible
        sections.forEach(sec => {
            if (sec.id === `${viewId}-view`) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        // Cerrar modal si se navega a otra vista
        if (modal) modal.classList.remove('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const view = btn.getAttribute('data-view');
            navigate(view);
        });
    });

    // Control Modal
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) closeModalBtn.onclick = () => modal.classList.remove('active');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    // --- 3. CONEXIÓN FIREBASE ---
    function initFirebase() {
        const db = window.firebaseDb;
        const tools = window.firestoreTools;

        if (!db || !tools) {
            setTimeout(initFirebase, 500);
            return;
        }

        console.log('✅ Firebase Bridge Ready');

        // Escuchar cambios en el perfil del usuario para validar el inicio
        tools.onSnapshot(tools.doc(db, "config", "user_profile"), (doc) => {
            if (doc.exists()) {
                const profile = doc.data();
                updateProfileUI(profile);
                // Si hay perfil, activar escucha de brokers
                listenToBrokers(db, tools);
            } else {
                console.log('⚠️ Perfil no encontrado. Esperando configuración.');
                showEmptyState();
            }
        });
    }

    function updateProfileUI(profile) {
        userEmails = profile.emails || [];
        document.getElementById('profileName').value = profile.nombre || '';
        document.getElementById('profilePhone').value = profile.telefono || '';
        document.getElementById('profileAddress').value = profile.direccion || '';
        renderEmailChips();

        const healthPct = 100; // Si tiene perfil, asumimos progreso inicial
        document.getElementById('healthPct').textContent = `${healthPct}%`;
        document.getElementById('healthCircle').style.strokeDasharray = `${healthPct}, 100`;
        document.getElementById('healthMsg').innerHTML = `Protegiendo a <strong>${profile.nombre}</strong> con ${userEmails.length} emails.`;
    }

    function renderEmailChips() {
        emailList.innerHTML = '';
        userEmails.forEach((email, index) => {
            const chip = document.createElement('div');
            chip.className = 'chip-premium';
            chip.innerHTML = `${email} <i class="fas fa-times-circle" onclick="window.removeEmail(${index})"></i>`;
            emailList.appendChild(chip);
        });
    }

    window.removeEmail = (index) => {
        userEmails.splice(index, 1);
        renderEmailChips();
    };

    if (addEmailBtn) {
        addEmailBtn.addEventListener('click', () => {
            const val = emailInput.value.trim();
            if (val && val.includes('@') && !userEmails.includes(val)) {
                userEmails.push(val);
                renderEmailChips();
                emailInput.value = '';
            }
        });
    }

    // --- 4. GESTIÓN DE BROKERS ---
    function listenToBrokers(db, tools) {
        tools.onSnapshot(tools.collection(db, "brokers"), (snapshot) => {
            const brokers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderDashboard(brokers);
        });
    }

    function renderDashboard(brokers) {
        const tbody = document.getElementById('brokerTbody');
        if (!tbody) return;

        const total = brokers.length;
        const sent = brokers.filter(b => ['enviado', 'en_proceso'].includes((b.status || '').toLowerCase())).length;
        const deleted = brokers.filter(b => (b.status || '').toLowerCase() === 'eliminado').length;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statSent').textContent = sent;
        document.getElementById('statDeleted').textContent = deleted;

        tbody.innerHTML = '';
        if (brokers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted)">No se detectaron brokers en riesgo.</td></tr>';
            return;
        }

        brokers.slice(0, 10).forEach(b => {
            const status = (b.status || 'pendiente').toLowerCase();
            const tr = document.createElement('tr');
            
            const statusLabel = status === 'en_proceso' ? '<span class="status-running"><i class="fas fa-spinner fa-spin"></i> EN PROCESO</span>' :
                                status === 'eliminado' ? '<span class="status-done"><i class="fas fa-check-circle"></i> ELIMINADO</span>' :
                                status === 'enviado' ? '<span class="status-done"><i class="fas fa-paper-plane"></i> ENVIADO</span>' :
                                '<span class="status-pending">PENDIENTE</span>';

            tr.innerHTML = `
                <td>
                    <div class="broker-name">
                        <div class="initial" style="background:var(--card-bg); border:1px solid var(--glass-border)">${b.name.charAt(0)}</div>
                        <span>${b.name}</span>
                    </div>
                </td>
                <td><span class="badge ${b.risk === 'Alto' || b.risk === 'Extremadamente Alto' ? 'high' : 'medium'}">${b.risk || 'Alto'}</span></td>
                <td>${b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Detectado'}</td>
                <td>${statusLabel}</td>
                <td><button class="btn-icon" onclick="window.requestRemoval('${b.id}', '${b.name}')"><i class="fas ${status === 'pendiente' ? 'fa-paper-plane' : 'fa-eye'}"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function showEmptyState() {
        document.getElementById('brokerTbody').innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-muted);">Inicia el escaneo completando tu perfil...</td></tr>';
        document.getElementById('statTotal').textContent = '0';
        document.getElementById('statSent').textContent = '0';
        document.getElementById('statDeleted').textContent = '0';
        document.getElementById('healthPct').textContent = '0%';
        document.getElementById('healthCircle').style.strokeDasharray = '0, 100';
    }

    // --- 5. ACCIONES ---
    window.requestRemoval = async (id, name) => {
        alert(`Iniciando protocolo de eliminación para ${name}. El bot procesará la solicitud en el próximo ciclo.`);
        // Aquí podrías forzar el estado a 'pendiente' si no lo está
    };

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = profileForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;

            if (userEmails.length === 0) {
                alert("Debes añadir al menos un email para proteger.");
                return;
            }

            btn.textContent = '🛡️ Sincronizando Blindaje...';
            btn.disabled = true;

            const data = {
                nombre: document.getElementById('profileName').value,
                telefono: document.getElementById('profilePhone').value,
                direccion: document.getElementById('profileAddress').value,
                emails: userEmails,
                updatedAt: new Date().toISOString()
            };

            try {
                const db = window.firebaseDb;
                const tools = window.firestoreTools;
                await tools.setDoc(tools.doc(db, "config", "user_profile"), data);
                
                btn.textContent = '✅ Perfil Sincronizado';
                setTimeout(() => {
                    modal.classList.remove('active');
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
            } catch (err) {
                console.error(err);
                btn.textContent = '❌ Error de Sincronización';
                btn.disabled = false;
            }
        });
    }

    // --- 6. INICIO ---
    window.addEventListener('firebase-ready', initFirebase);
    initFirebase(); // Re-intento manual
});
