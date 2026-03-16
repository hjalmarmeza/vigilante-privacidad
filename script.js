document.addEventListener('DOMContentLoaded', () => {
    console.log('--- VIGILANTE OS: SYSTEM START ---');

    // 1. SELECTORES
    const navButtons = document.querySelectorAll('.nav-item, .nav-item-mobile');
    const sections = document.querySelectorAll('.view-section');
    const modal = document.getElementById('configModal');

    // 2. MOTOR DE NAVEGACIÓN
    function navigate(viewId) {
        if (viewId === 'ajustes' || viewId === 'configuracion') {
            modal.classList.add('active');
            return;
        }

        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
        });

        sections.forEach(sec => {
            sec.classList.toggle('active', sec.id === `${viewId}-view`);
        });

        if (modal) modal.classList.remove('active');
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(btn.getAttribute('data-view'));
        });
    });

    // 3. CONTROL MODAL
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) closeModalBtn.onclick = () => modal.classList.remove('active');
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    // 4. FIREBASE CONNECT (LISTENER REAL)
    function initFirebaseListener() {
        const db = window.firebaseDb;
        const tools = window.firestoreTools;

        if (!db || !tools) {
            setTimeout(initFirebaseListener, 500);
            return;
        }

        tools.onSnapshot(tools.collection(db, "brokers"), (snap) => {
            const brokers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            updateDashboard(brokers);
        });
    }

    function updateDashboard(brokers) {
        const tbody = document.getElementById('brokerTbody');
        const hCircle = document.getElementById('healthCircle');
        const hPct = document.getElementById('healthPct');
        
        const total = brokers.length;
        const sent = brokers.filter(b => ['enviado', 'en_proceso'].includes((b.status || '').toLowerCase())).length;
        const deleted = brokers.filter(b => (b.status || '').toLowerCase() === 'eliminado').length;
        const score = total > 0 ? Math.round((deleted / total) * 100) : 0;

        document.getElementById('statsTotal').textContent = total;
        document.getElementById('statsSent').textContent = sent;
        document.getElementById('statsDeleted').textContent = deleted;
        if (hPct) hPct.textContent = `${score}%`;
        if (hCircle) hCircle.style.strokeDasharray = `${score}, 100`;

        if (!tbody) return;
        tbody.innerHTML = '';
        brokers.forEach(b => {
            const status = (b.status || 'pendiente').toLowerCase();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${b.name}</strong></td>
                <td><span class="badge high">${b.risk || 'Alto'}</span></td>
                <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                <td><button class="btn-icon" onclick="window.requestAction('${b.id}')"><i class="fas fa-paper-plane"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 5. PERFIL Y CHIPS
    const profileForm = document.getElementById('profileForm');
    const emailInput = document.getElementById('emailInput');
    const addEmailBtn = document.getElementById('addEmailBtn');
    const emailList = document.getElementById('emailList');
    let userEmails = [];

    if (addEmailBtn) {
        addEmailBtn.onclick = () => {
            const val = emailInput.value.trim();
            if (val && val.includes('@') && !userEmails.includes(val)) {
                userEmails.push(val);
                renderChips();
                emailInput.value = '';
            }
        };
    }

    function renderChips() {
        emailList.innerHTML = '';
        userEmails.forEach((em, i) => {
            const chip = document.createElement('div');
            chip.style = 'background:rgba(255,159,10,0.1); color:var(--accent); padding:8px 12px; border-radius:10px; font-size:13px; font-weight:600; display:flex; gap:8px; align-items:center;';
            chip.innerHTML = `${em} <i class="fas fa-times" style="cursor:pointer" onclick="window.delEmail(${i})"></i>`;
            emailList.appendChild(chip);
        });
    }

    window.delEmail = (i) => { userEmails.splice(i, 1); renderChips(); };

    profileForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = profileForm.querySelector('button[type="submit"]');
        btn.textContent = 'Sincronizando...';
        
        try {
            const db = window.firebaseDb;
            const tools = window.firestoreTools;
            const data = {
                name: document.getElementById('profileName').value,
                phone: document.getElementById('profilePhone').value,
                emails: userEmails,
                updatedAt: new Date().toISOString()
            };
            await tools.setDoc(tools.doc(db, "users", "main_user"), data, { merge: true });
            btn.textContent = '✅ Completado';
            setTimeout(() => { modal.classList.remove('active'); btn.textContent = 'Guardar y Sincronizar en Firebase'; }, 1000);
        } catch (err) {
            btn.textContent = 'Error al sincronizar';
            console.error(err);
        }
    };

    window.requestAction = (id) => alert('Solicitud enviada al bot de vigilancia.');

    window.addEventListener('firebase-ready', initFirebaseListener);
    initFirebaseListener();
});
