document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS ---
    const navItems = document.querySelectorAll('.nav-item, .nav-item-mobile');
    const sections = document.querySelectorAll('.view-section');
    const configModal = document.getElementById('configModal');
    const btnOpenConfig = document.getElementById('openConfig');
    const btnCloseModal = document.querySelector('.close-modal');

    // --- NAVEGACIÓN ---
    function switchView(viewId) {
        // Ajustes (Modal)
        if (viewId === 'configuracion') {
            if (configModal) configModal.classList.add('active');
            return;
        }

        // Navegación normal
        navItems.forEach(item => {
            const isMatch = item.getAttribute('data-view') === viewId;
            item.classList.toggle('active', isMatch);
        });

        sections.forEach(section => {
            const isMatch = section.id === `${viewId}-view`;
            section.classList.toggle('active', isMatch);
        });

        // Cerrar modal al navegar a otra vista
        if (configModal) configModal.classList.remove('active');
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.getAttribute('data-view');
            switchView(viewId);
        });
    });

    // --- MODAL ---
    if (btnOpenConfig) btnOpenConfig.addEventListener('click', () => configModal.classList.add('active'));
    if (btnCloseModal) btnCloseModal.addEventListener('click', () => configModal.classList.remove('active'));
    
    window.addEventListener('click', (e) => {
        if (e.target === configModal) configModal.classList.remove('active');
    });

    // --- DATA (FIRESTORE) ---
    const db = window.firebaseDb;
    const tools = window.firestoreTools;

    if (db && tools) {
        const { collection, onSnapshot } = tools;
        onSnapshot(collection(db, "brokers"), (snapshot) => {
            const brokers = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            updateUI(brokers);
        });
    }

    function updateUI(brokers) {
        // Stats
        const total = brokers.length;
        const sent = brokers.filter(b => ['enviado', 'en_proceso'].includes((b.status || '').toLowerCase())).length;
        const deleted = brokers.filter(b => (b.status || '').toLowerCase() === 'eliminado').length;

        const val1 = document.querySelector('.mini-stats:nth-child(1) .mini-value');
        const val2 = document.querySelector('.mini-stats:nth-child(2) .mini-value');
        const val3 = document.querySelector('.mini-stats:nth-child(3) .mini-value');
        
        if (val1) val1.textContent = total;
        if (val2) val2.textContent = sent;
        if (val3) val3.textContent = deleted;

        // Score
        const score = total > 0 ? Math.round((deleted / total) * 100) : 0;
        const circle = document.querySelector('.circle');
        const pctText = document.querySelector('.percentage');
        if (circle) circle.style.strokeDasharray = `${score}, 100`;
        if (pctText) pctText.textContent = `${score}%`;

        // Table
        const tbody = document.querySelector('.broker-table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            brokers.forEach(b => {
                const status = (b.status || 'pendiente').toLowerCase();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${b.name}</strong></td>
                    <td><span class="badge ${b.risk === 'Alto' ? 'high' : 'medium'}">${b.risk || 'Medio'}</span></td>
                    <td>${new Date().toLocaleDateString()}</td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                    <td><button class="btn-icon" onclick="handleAction('${b.name}')"><i class="fas fa-eye"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
});

window.handleAction = (name) => {
    console.log('Action for:', name);
};
