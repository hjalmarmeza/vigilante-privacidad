document.addEventListener('DOMContentLoaded', () => {
    console.log('--- VIGILANTE OS: SYSTEM START ---');

    // 1. SELECTORES DE NAVEGACIÓN
    const navButtons = document.querySelectorAll('.nav-item, .nav-item-mobile');
    const sections = document.querySelectorAll('.view-section');
    const modal = document.getElementById('configModal');

    // 2. MOTOR DE NAVEGACIÓN (DEFINITIVO)
    function navigate(viewId) {
        console.log('Navegando a:', viewId);

        // Caso Ajustes (Abrir Modal)
        if (viewId === 'configuracion' || viewId === 'ajustes') {
            if (modal) modal.classList.add('active');
            return;
        }

        // Toggles de Botones y Secciones
        navButtons.forEach(btn => {
            const btnView = btn.getAttribute('data-view');
            btn.classList.toggle('active', btnView === viewId);
        });

        sections.forEach(sec => {
            // Buscamos la sección por ID (asegurando que coincida con el data-view)
            const sectionTarget = `${viewId}-view`;
            if (sec.id === sectionTarget) {
                sec.classList.add('active');
                sec.style.display = 'block'; // Fuerza visibilidad
            } else {
                sec.classList.remove('active');
                sec.style.display = 'none'; // Fuerza ocultamiento
            }
        });

        // Cerrar modal si se navega a otra sección
        if (modal) modal.classList.remove('active');
    }

    // Vincular Eventos de Navegación
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
    window.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    // 4. FUNCIONALIDAD: AÑADIR EMAILS (PERFIL)
    const addEmailBtn = document.getElementById('addEmailBtn');
    const emailInput = document.getElementById('emailInput');
    const emailList = document.getElementById('emailList');
    let emailsArray = [];

    if (addEmailBtn) {
        addEmailBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const val = emailInput.value.trim();
            if (val && val.includes('@')) {
                if (!emailsArray.includes(val)) {
                    emailsArray.push(val);
                    renderChips();
                    emailInput.value = '';
                }
            }
        });
    }

    function renderChips() {
        emailList.innerHTML = '';
        emailsArray.forEach((em, i) => {
            const chip = document.createElement('div');
            chip.style = 'background:rgba(245,158,11,0.1);color:#f59e0b;padding:5px 10px;border-radius:8px;margin:4px;display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(245,158,11,0.2);font-size:12px;';
            chip.innerHTML = `<span>${em}</span><i class="fas fa-times" style="cursor:pointer" onclick="window.delEm(${i})"></i>`;
            emailList.appendChild(chip);
        });
    }

    window.delEm = (i) => { emailsArray.splice(i, 1); renderChips(); };

    // 5. DATA SYNC (FIRESTORE)
    const db = window.firebaseDb;
    const tools = window.firestoreTools;

    if (db && tools) {
        tools.onSnapshot(tools.collection(db, "brokers"), (snap) => {
            const brokers = snap.docs.map(d => ({id:d.id, ...d.data()}));
            updateUI(brokers);
        });
    }

    function updateUI(brokers) {
        // Stats
        const total = brokers.length;
        const sent = brokers.filter(b => ['enviado', 'en_proceso'].includes((b.status || '').toLowerCase())).length;
        const deleted = brokers.filter(b => (b.status || '').toLowerCase() === 'eliminado').length;

        const updateText = (s, v) => { const el = document.querySelector(s); if(el) el.textContent = v; };
        updateText('.mini-stats:nth-child(1) .mini-value', total);
        updateText('.mini-stats:nth-child(2) .mini-value', sent);
        updateText('.mini-stats:nth-child(3) .mini-value', deleted);

        // Circle
        const score = total > 0 ? Math.round((deleted / total) * 100) : 0;
        const circ = document.querySelector('.circle');
        const pct = document.querySelector('.percentage');
        if (circ) circ.style.strokeDasharray = `${score}, 100`;
        if (pct) pct.textContent = `${score}%`;

        // Table
        const tbody = document.querySelector('.broker-table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            brokers.forEach(b => {
                const status = (b.status || 'pendiente').toLowerCase();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${b.name}</strong></td>
                    <td><span class="badge ${status === 'enviado' ? 'medium' : 'high'}">${b.risk || 'Alto'}</span></td>
                    <td>${new Date().toLocaleDateString()}</td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                    <td><button class="btn-icon" onclick="window.requestAction('${b.name}')"><i class="fas fa-paper-plane"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
});

window.requestAction = (name) => alert('Solicitud enviada para ' + name);
