document.addEventListener('DOMContentLoaded', () => {
    const db = window.firebaseDb;
    const { collection, onSnapshot, query, setDoc, doc } = window.firestoreTools;

    // --- NAVEGACIÓN ---
    const navItems = document.querySelectorAll('.nav-item, .nav-item-mobile');
    const sections = document.querySelectorAll('.view-section');

    function switchView(viewId) {
        navItems.forEach(nav => {
            nav.classList.toggle('active', nav.getAttribute('data-view') === viewId);
        });
        sections.forEach(section => {
            section.classList.toggle('active', section.id === `${viewId}-view`);
        });
        if (viewId === 'configuracion') {
            document.getElementById('configModal')?.classList.add('active');
            switchView('dashboard');
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.getAttribute('data-view'));
        });
    });

    // --- DASHBOARD REAL-TIME ---
    if (db) {
        onSnapshot(collection(db, "brokers"), (snapshot) => {
            const dataDocs = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            
            // Actualizar Stats
            const total = dataDocs.length;
            const solicitados = dataDocs.filter(d => ['enviado', 'en_proceso'].includes((d.status || '').toLowerCase())).length;
            const eliminados = dataDocs.filter(d => (d.status || '').toLowerCase() === 'eliminado').length;

            const val1 = document.querySelector('.mini-stats:nth-child(1) .mini-value');
            const val2 = document.querySelector('.mini-stats:nth-child(2) .mini-value');
            const val3 = document.querySelector('.mini-stats:nth-child(3) .mini-value');
            
            if (val1) val1.textContent = total;
            if (val2) val2.textContent = solicitados;
            if (val3) val3.textContent = eliminados;

            // Render Tabla
            const tbody = document.querySelector('.broker-table tbody');
            if (tbody) {
                tbody.innerHTML = '';
                dataDocs.slice(0, 10).forEach(data => {
                    const status = (data.status || 'pendiente').toLowerCase();
                    const tr = document.createElement('tr');
                    
                    let statusClass = 'status-pending';
                    let statusIcon = '';
                    if (status === 'en_proceso') {
                        statusClass = 'status-running';
                        statusIcon = '<i class="fas fa-spinner fa-spin"></i> ';
                    } else if (status === 'eliminado' || status === 'enviado') {
                        statusClass = 'status-done';
                        statusIcon = '<i class="fas fa-check"></i> ';
                    }

                    tr.innerHTML = `
                        <td><div class="broker-name"><span>${data.name}</span></div></td>
                        <td><span class="badge ${data.risk === 'Alto' ? 'high' : 'medium'}">${data.risk}</span></td>
                        <td>${new Date().toLocaleDateString()}</td>
                        <td><span class="${statusClass}">${statusIcon}${status.toUpperCase()}</span></td>
                        <td><button class="btn-action" data-id="${data.id}">${status === 'pendiente' ? '<i class="fas fa-paper-plane"></i>' : '<i class="fas fa-eye"></i>'}</button></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
    }

    // --- ESCANEO GLOBAL ---
    document.getElementById('startFullScan')?.addEventListener('click', async () => {
        const btn = document.getElementById('startFullScan');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escaneando...';
        btn.disabled = true;
        
        // Simular escaneo de 3 segundos
        await new Promise(r => setTimeout(r, 3000));
        
        btn.innerHTML = 'Escaneo Completado';
        btn.style.background = '#10b981';
        setTimeout(() => {
            btn.innerHTML = 'Iniciar Escaneo Global';
            btn.style.background = '';
            btn.disabled = false;
        }, 2000);
    });
});
