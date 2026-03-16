document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CORE NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item, .nav-item-mobile');
    const sections = document.querySelectorAll('.view-section');
    const configModal = document.getElementById('configModal');

    function switchView(viewId) {
        if (viewId === 'configuracion' || viewId === 'ajustes') {
            configModal.classList.add('active');
            return;
        }

        navItems.forEach(item => {
            const vid = item.getAttribute('data-view');
            item.classList.toggle('active', vid === viewId);
        });

        sections.forEach(sec => {
            const isMatch = sec.id === `${viewId}-view`;
            sec.classList.toggle('active', isMatch);
        });

        configModal.classList.remove('active');
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    // --- 2. MODAL CONTROLS ---
    const openConfigBtn = document.getElementById('openConfig');
    const closeModalBtn = document.querySelector('.close-modal');

    if (openConfigBtn) openConfigBtn.onclick = () => configModal.classList.add('active');
    if (closeModalBtn) closeModalBtn.onclick = () => configModal.classList.remove('active');
    
    window.onclick = (e) => {
        if (e.target === configModal) configModal.classList.remove('active');
    };

    // --- 3. AÑADIR EMAIL (REPARADO Y AUDITADO) ---
    const addEmailBtn = document.getElementById('addEmailBtn');
    const emailInput = document.getElementById('emailInput');
    const emailList = document.getElementById('emailList');
    let userEmails = [];

    if (addEmailBtn) {
        addEmailBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (email && email.includes('@')) {
                if (!userEmails.includes(email)) {
                    userEmails.push(email);
                    renderEmails();
                    emailInput.value = '';
                }
            } else {
                alert('Ingrese un email válido');
            }
        });
    }

    function renderEmails() {
        emailList.innerHTML = '';
        userEmails.forEach((email, idx) => {
            const chip = document.createElement('div');
            chip.style = 'background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 6px 12px; border-radius: 8px; margin: 4px; display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(245, 158, 11, 0.2); font-size: 13px;';
            chip.innerHTML = `<span>${email}</span><i class="fas fa-times" style="cursor:pointer" onclick="window.delEmail(${idx})"></i>`;
            emailList.appendChild(chip);
        });
    }

    window.delEmail = (idx) => {
        userEmails.splice(idx, 1);
        renderEmails();
    };

    // --- 4. DATA INTEGRATION (FIRESTORE) ---
    const db = window.firebaseDb;
    const tools = window.firestoreTools;

    if (db && tools) {
        tools.onSnapshot(tools.collection(db, "brokers"), (snapshot) => {
            const data = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            updateDashboard(data);
        });
    }

    function updateDashboard(brokers) {
        // Stats
        const total = brokers.length;
        const sent = brokers.filter(b => ['enviado', 'en_proceso'].includes((b.status || '').toLowerCase())).length;
        const deleted = brokers.filter(b => (b.status || '').toLowerCase() === 'eliminado').length;

        // Inyectar con seguridad
        const setVal = (sel, val) => { const el = document.querySelector(sel); if(el) el.textContent = val; };
        setVal('.mini-stats:nth-child(1) .mini-value', total);
        setVal('.mini-stats:nth-child(2) .mini-value', sent);
        setVal('.mini-stats:nth-child(3) .mini-value', deleted);

        // Circular Score
        const score = total > 0 ? Math.round((deleted / total) * 100) : 0;
        const circle = document.querySelector('.circle');
        const pct = document.querySelector('.percentage');
        if (circle) circle.style.strokeDasharray = `${score}, 100`;
        if (pct) pct.textContent = `${score}%`;

        // Render Table
        const tbody = document.querySelector('.broker-table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            brokers.forEach(b => {
                const status = (b.status || 'pendiente').toLowerCase();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong style="color:#fff">${b.name}</strong></td>
                    <td><span class="badge ${b.risk === 'Alto' || b.risk === 'Extremadamente Alto' ? 'high' : 'medium'}">${b.risk}</span></td>
                    <td>${new Date().toLocaleDateString()}</td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                    <td><button class="btn-icon" onclick="window.action('${b.name}')"><i class="fas fa-paper-plane"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
});

window.action = (name) => alert('Solicitud enviada a ' + name);
