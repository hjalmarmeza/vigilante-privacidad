document.addEventListener('DOMContentLoaded', () => {
    console.log('Vigilante de Privacidad Dashboard Iniciado');

    const db = window.firebaseDb;
    const { collection, onSnapshot, query, setDoc, doc } = window.firestoreTools;

    // --- LÓGICA DE NAVEGACIÓN ---
    const navItems = document.querySelectorAll('.nav-item');
    const mobileNavItems = document.querySelectorAll('.nav-item-mobile');
    const sections = document.querySelectorAll('.view-section');
    const logo = document.querySelector('.logo');

    function switchView(viewId) {
        console.log(`Cambiando a vista: ${viewId}`);
        
        // Actualizar Nav Items (Ambos: Sidebar y Móvil)
        [...navItems, ...mobileNavItems].forEach(nav => {
            nav.classList.remove('active');
            if (nav.getAttribute('data-view') === viewId) {
                nav.classList.add('active');
            }
        });

        // Actualizar Secciones
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === `${viewId}-view`) {
                section.classList.add('active');
            }
        });

        // Caso especial: Configuración abre el modal pero mantiene vista dashboard
        if (viewId === 'configuracion') {
            const modal = document.getElementById('configModal');
            if (modal) modal.classList.add('active');
            switchView('dashboard'); // Volver al dashboard de fondo
        }
    }

    // Logo vuelve al Dashboard
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => switchView('dashboard'));
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    // --- BARRA DE BÚSQUEDA ---
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('.broker-table tbody tr');
            rows.forEach(row => {
                const nameText = row.querySelector('.broker-name span')?.textContent.toLowerCase() || "";
                row.style.display = nameText.includes(query) ? '' : 'none';
            });
        });
    }

    // --- CONEXIÓN REAL CON FIRESTORE (STATS Y TABLA) ---
    if (db) {
        onSnapshot(collection(db, "brokers"), (snapshot) => {
            const total = snapshot.size;
            const solicitados = snapshot.docs.filter(d => d.data().status === 'enviado' || d.data().status === 'en_proceso').length;
            const eliminados = snapshot.docs.filter(d => d.data().status === 'eliminado').length;

            if (total > 0) {
                document.querySelector('.mini-stats:nth-child(1) .mini-value').textContent = total;
                document.querySelector('.mini-stats:nth-child(2) .mini-value').textContent = solicitados;
                document.querySelector('.mini-stats:nth-child(3) .mini-value').textContent = eliminados;
                
                // --- RENDERIZADO DINÁMICO DE LA TABLA ---
                const tbody = document.querySelector('.broker-table tbody');
                tbody.innerHTML = ''; // Limpiar placeholders

                snapshot.docs.slice(0, 5).forEach(doc => {
                    const data = doc.data();
                    const tr = document.createElement('tr');
                    
                    const statusClass = data.status === 'en_proceso' ? 'status-running' : 
                                      data.status === 'eliminado' ? 'status-done' : 'status-pending';
                    const statusIcon = data.status === 'en_proceso' ? '<i class="fas fa-spinner fa-spin"></i>' : 
                                     data.status === 'eliminado' ? '<i class="fas fa-circle-check"></i>' : '';
                    const actionIcon = data.status === 'pendiente' ? 'fa-paper-plane' : 'fa-eye';

                    tr.innerHTML = `
                        <td>
                            <div class="broker-name">
                                <div class="initial" style="background: var(--primary-gradient);">${data.name.charAt(0)}</div>
                                <span>${data.name}</span>
                            </div>
                        </td>
                        <td><span class="badge ${data.risk === 'Medio' ? 'medium' : 'high'}">${data.risk}</span></td>
                        <td>${new Date(data.createdAt || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td><span class="${statusClass}">${statusIcon} ${data.status.replace('_', ' ').toUpperCase()}</span></td>
                        <td><button class="btn-icon"><i class="fas ${actionIcon}"></i></button></td>
                    `;
                    
                    // Re-vincular eventos a los nuevos botones
                    const btn = tr.querySelector('.btn-icon');
                    btn.addEventListener('click', () => handleAction(data.name, actionIcon === 'fa-paper-plane'));
                    
                    tbody.appendChild(tr);
                });
            }
        });
    }

    async function handleAction(name, isSend) {
        if (isSend) {
            const btn = event.currentTarget;
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            console.log(`Simulando envío de solicitud a ${name}...`);
            
            // Simulación de delay de red
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            alert(`Solicitud de borrado enviada a ${name} vía AgentMail. Podrás ver el seguimiento en la pestaña 'Historial'.`);
            
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.color = 'var(--green)';
            
            // Aquí en el futuro conectaríamos con una Cloud Function que llame a bot/index.js
        } else {
            alert(`Detalles de ${name}: Este broker tiene un perfil de riesgo ALTO debido a la venta de historiales de navegación y datos biométricos.`);
        }
    }

    // --- ESCANEO GLOBAL ---
    const startScanBtn = document.getElementById('startFullScan');
    if (startScanBtn) {
        startScanBtn.addEventListener('click', async () => {
            startScanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escaneando Red...';
            startScanBtn.disabled = true;

            const sources = document.querySelectorAll('.source-item span:last-child');
            const exposureVal = document.querySelector('.exposure-stat .stat-value');
            const statFill = document.querySelector('.stat-fill');

            // Simulación de escaneo progresivo
            for (let i = 0; i < sources.length; i++) {
                sources[i].className = 'status-running';
                sources[i].textContent = 'Buscando...';
                await new Promise(r => setTimeout(r, 1500));
                sources[i].className = 'status-done';
                sources[i].textContent = 'Completado';
                
                // Actualizar números visuales
                if (exposureVal) {
                    const current = parseInt(exposureVal.textContent) || 0;
                    exposureVal.textContent = current + Math.floor(Math.random() * 20);
                }
                if (statFill) {
                    statFill.style.width = `${30 + (i * 20)}%`;
                }
            }

            startScanBtn.innerHTML = '<i class="fas fa-check"></i> Escaneo Finalizado';
            startScanBtn.style.background = 'var(--green)';
            
            setTimeout(() => {
                startScanBtn.innerHTML = 'Iniciar Escaneo Global';
                startScanBtn.style.background = '';
                startScanBtn.disabled = false;
            }, 3000);
        });
    }

    // --- FILTROS DE HISTORIAL ---
    const pills = document.querySelectorAll('.filter-pills .pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const filter = pill.textContent.toLowerCase();
            const items = document.querySelectorAll('.timeline-item');
            
            items.forEach(item => {
                const type = item.querySelector('.msg-type').textContent.toLowerCase();
                if (filter === 'todo') {
                    item.style.display = 'block';
                } else if (filter === 'enviados' && type.includes('enviada')) {
                    item.style.display = 'block';
                } else if (filter === 'respuestas' && type.includes('recibida')) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // --- GESTIÓN DE MÚLTIPLES EMAILS ---
    const emailInput = document.getElementById('emailInput');
    const addEmailBtn = document.getElementById('addEmailBtn');
    const emailListContainer = document.getElementById('emailList');
    let protectedEmails = [];

    function renderEmails() {
        emailListContainer.innerHTML = '';
        protectedEmails.forEach((email, index) => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.innerHTML = `${email} <button type="button" data-index="${index}">&times;</button>`;
            emailListContainer.appendChild(chip);
        });
    }

    if (addEmailBtn) {
        addEmailBtn.addEventListener('click', () => {
            const email = emailInput.value.trim();
            if (email && !protectedEmails.includes(email)) {
                protectedEmails.push(email);
                emailInput.value = '';
                renderEmails();
            }
        });
    }

    emailListContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = e.target.getAttribute('data-index');
            protectedEmails.splice(index, 1);
            renderEmails();
        }
    });

    // --- MANEJO DEL PERFIL (REAL) ---
    const modal = document.getElementById('configModal');
    const openBtn = document.getElementById('openConfig');
    const closeBtn = document.querySelector('.close-modal');
    const profileForm = document.getElementById('profileForm');

    if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            if (protectedEmails.length === 0) {
                alert("Por favor, añade al menos un email para proteger.");
                return;
            }

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando en Firebase...';
            submitBtn.disabled = true;

            const formData = {
                nombre: document.getElementById('profileName').value,
                telefono: document.getElementById('profilePhone').value,
                direccion: profileForm.querySelectorAll('input[type="text"]')[1].value, // El de dirección
                emails: protectedEmails,
                updatedAt: new Date().toISOString()
            };

            try {
                if (db) {
                    await setDoc(doc(db, "config", "user_profile"), formData);
                    console.log('Perfil guardado en Firestore con múltiples emails');
                }

                submitBtn.innerHTML = '<i class="fas fa-check"></i> Guardado Exitoso';
                submitBtn.style.background = '#10b981';

                setTimeout(() => {
                    modal.classList.remove('active');
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;
                    
                    document.querySelector('.percentage').textContent = '100%';
                    document.querySelector('.circle').style.strokeDasharray = '100, 100';
                    document.querySelector('.score-msg').innerHTML = `Perfil activo para <strong>${formData.nombre}</strong> con ${protectedEmails.length} emails protegidos.`;
                }, 1500);
            } catch (error) {
                console.error("Error al guardar:", error);
                alert("Error al conectar con Firebase.");
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
});
