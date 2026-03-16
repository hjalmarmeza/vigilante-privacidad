document.addEventListener('DOMContentLoaded', () => {
    console.log('--- Privacy Bot Client Ready ---');

    // Módulos de UI
    const UI = {
        navItems: document.querySelectorAll('.nav-item, .nav-item-mobile'),
        sections: document.querySelectorAll('.view-section'),
        modal: document.getElementById('configModal'),
        openModalBtn: document.getElementById('openConfig'),
        closeModalBtn: document.querySelector('.close-modal')
    };

    // Navegación Principal
    function switchView(viewId) {
        console.log('Switching to view:', viewId);

        // Caso Ajustes/Configuración (Modal)
        if (viewId === 'configuracion') {
            if (UI.modal) UI.modal.classList.add('active');
            return;
        }

        // Toggles normales
        UI.navItems.forEach(item => {
            const isActive = item.getAttribute('data-view') === viewId;
            item.classList.toggle('active', isActive);
        });

        UI.sections.forEach(sec => {
            const isActive = sec.id === `${viewId}-view`;
            sec.classList.toggle('active', isActive);
        });

        // Cerrar modal si se navega a otra parte
        if (UI.modal) UI.modal.classList.remove('active');
    }

    // Bindings de Navegación
    UI.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            if (view) switchView(view);
        });
    });

    // Modales
    if (UI.openModalBtn) UI.openModalBtn.addEventListener('click', () => UI.modal.classList.add('active'));
    if (UI.closeModalBtn) UI.closeModalBtn.addEventListener('click', () => UI.modal.classList.remove('active'));
    
    // Cerrar modal al tocar fuera
    window.addEventListener('click', (e) => {
        if (e.target === UI.modal) UI.modal.classList.remove('active');
    });

    // --- INTEGRACIÓN FIRESTORE ---
    const db = window.firebaseDb;
    const tools = window.firestoreTools;

    if (db && tools) {
        const { collection, onSnapshot } = tools;
        console.log('🔗 Firestore Listener Activo');
        
        onSnapshot(collection(db, "brokers"), (snapshot) => {
            const data = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            updateDashboard(data);
        });
    }

    function updateDashboard(brokers) {
        console.log('Updating UI with', brokers.length, 'brokers');
        
        // Stats
        const total = brokers.length;
        const sent = brokers.filter(b => ['enviado', 'en_proceso'].includes((b.status || '').toLowerCase())).length;
        const deleted = brokers.filter(b => (b.status || '').toLowerCase() === 'eliminado').length;

        setText('.mini-stats:nth-child(1) .mini-value', total);
        setText('.mini-stats:nth-child(2) .mini-value', sent);
        setText('.mini-stats:nth-child(3) .mini-value', deleted);

        // Gráfico Circular
        const score = total > 0 ? Math.round((deleted / total) * 100) : 0;
        const circle = document.querySelector('.circle');
        const percentageText = document.querySelector('.percentage');
        
        if (circle) circle.style.strokeDasharray = `${score}, 100`;
        if (percentageText) percentageText.textContent = `${score}%`;

        // Tabla
        const tbody = document.querySelector('.broker-table tbody');
        if (tbody) {
            tbody.innerHTML = brokers.length ? '' : '<tr><td colspan="5">No hay datos disponibles</td></tr>';
            brokers.slice(0, 10).forEach(broker => {
                const tr = document.createElement('tr');
                const status = (broker.status || 'pendiente').toLowerCase();
                tr.innerHTML = `
                    <td><strong>${broker.name}</strong></td>
                    <td><span class="badge ${broker.risk === 'Alto' ? 'high' : 'medium'}">${broker.risk || 'Medio'}</span></td>
                    <td>${new Date().toLocaleDateString()}</td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                    <td><button class="btn-icon" onclick="globalHandle('${broker.name}')"><i class="fas fa-paper-plane"></i></button></td>
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

// Función Global para botones dinámicos
window.globalHandle = (name) => {
    alert('Acción iniciada para: ' + name);
};
