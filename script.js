document.addEventListener('DOMContentLoaded', () => {
    console.log('--- VIGILANTE ENGINE v4.1 START ---');

    // 1. SELECTORES DE NAVEGACIÓN
    const navButtons = document.querySelectorAll('.nav-item, .nav-item-mobile');
    const sections = document.querySelectorAll('.view-section');
    const modal = document.getElementById('configModal');

    // 2. MOTOR DE NAVEGACIÓN
    function navigate(viewId) {
        console.log('Navitating to:', viewId);

        if (viewId === 'ajustes' || viewId === 'configuracion') {
            modal.classList.add('active');
            return;
        }

        navButtons.forEach(btn => {
            const btnView = btn.getAttribute('data-view');
            btn.classList.toggle('active', btnView === viewId);
        });

        sections.forEach(sec => {
            if (sec.id === `${viewId}-view`) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        if (modal) modal.classList.remove('active');
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-view');
            navigate(target);
        });
    });

    // 3. CONTROL DE MODAL
    const openConfigBtn = document.getElementById('openConfig');
    const closeModalBtn = document.querySelector('.close-modal');

    if (openConfigBtn) openConfigBtn.onclick = () => modal.classList.add('active');
    if (closeModalBtn) closeModalBtn.onclick = () => modal.classList.remove('active');
    
    // Tap outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // 4. FIREBASE BINDING
    function initDataListener() {
        const db = window.firebaseDb;
        const tools = window.firestoreTools;

        if (!db || !tools) {
            console.log('Waiting for Firebase...');
            setTimeout(initDataListener, 500);
            return;
        }

        console.log('🔥 Connecting to Firestore Monitor...');
        tools.onSnapshot(tools.collection(db, "brokers"), (snap) => {
            const brokers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderBrokers(brokers);
        });
    }

    function renderBrokers(brokers) {
        const tbody = document.getElementById('brokerTbody');
        const hCircle = document.getElementById('healthCircle');
        const hPct = document.getElementById('healthPct');
        const sTotal = document.getElementById('statsTotal');
        const sSent = document.getElementById('statsSent');
        const sDeleted = document.getElementById('statsDeleted');

        if (!tbody) return;

        // Stats calculation
        const total = brokers.length;
        const sent = brokers.filter(b => ['enviado', 'en_proceso'].includes((b.status || '').toLowerCase())).length;
        const deleted = brokers.filter(b => (b.status || '').toLowerCase() === 'eliminado').length;
        const score = total > 0 ? Math.round((deleted / total) * 100) : 0;

        // Update UI Elements
        if (sTotal) sTotal.textContent = total;
        if (sSent) sSent.textContent = sent;
        if (sDeleted) sDeleted.textContent = deleted;
        if (hPct) hPct.textContent = `${score}%`;
        if (hCircle) hCircle.style.strokeDasharray = `${score}, 100`;

        tbody.innerHTML = '';
        brokers.forEach(b => {
            const status = (b.status || 'pendiente').toLowerCase();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${b.name}</strong></td>
                <td><span class="badge ${status === 'eliminado' ? 'success' : 'high'}">${b.risk || 'Alto'}</span></td>
                <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                <td><button class="btn-icon" onclick="window.requestAction('${b.id}')"><i class="fas fa-paper-plane"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 5. PROFILE FORM & EMAILS
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
                renderEmails();
                emailInput.value = '';
            }
        };
    }

    function renderEmails() {
        if (!emailList) return;
        emailList.innerHTML = '';
        userEmails.forEach((email, i) => {
            const chip = document.createElement('div');
            chip.className = 'badge';
            chip.style = 'background:rgba(255,159,10,0.1); color:var(--accent); display:inline-flex; align-items:center; gap:8px; padding:8px 12px; margin:4px; border: 1px solid rgba(255,159,10,0.2);';
            chip.innerHTML = `<span>${email}</span><i class="fas fa-times" style="cursor:pointer" onclick="window.removeEmail(${i})"></i>`;
            emailList.appendChild(chip);
        });
    }

    window.removeEmail = (i) => { userEmails.splice(i, 1); renderEmails(); };

    if (profileForm) {
        profileForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = profileForm.querySelector('button[type="submit"]');
            btn.textContent = 'Sincronizando...';
            
            try {
                const db = window.firebaseDb;
                const tools = window.firestoreTools;
                if (!db || !tools) throw new Error('Firebase not ready');

                const userData = {
                    name: document.getElementById('profileName').value,
                    phone: document.getElementById('profilePhone').value,
                    emails: userEmails,
                    updatedAt: new Date().toISOString()
                };

                await tools.setDoc(tools.doc(db, "users", "main_user"), userData, { merge: true });
                btn.textContent = '✅ Completado';
                setTimeout(() => { 
                    btn.textContent = 'Guardar y Sincronizar';
                    modal.classList.remove('active');
                }, 1500);
            } catch (err) {
                console.error(err);
                btn.textContent = '❌ Error';
                setTimeout(() => btn.textContent = 'Sincronizar Datos', 3000);
            }
        };
    }

    // Initialize
    initDataListener();
});

window.requestAction = (id) => alert('Solicitud de eliminación enviada al broker. El bot procesará esto en breve.');
