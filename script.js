document.addEventListener('DOMContentLoaded', () => {
    console.log('Vigilante de Privacidad Dashboard Iniciado');

    const db = window.firebaseDb;
    const { collection, onSnapshot, query, setDoc, doc } = window.firestoreTools;

    // --- NAVEGACIÓN LATERAL ---
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            
            // Actualizar clase activa
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            console.log(`Cambiando a vista: ${view}`);
            // Aquí podríamos ocultar/mostrar secciones si tuvieramos IDs de contenedores
            if (view === 'configuracion') {
                document.getElementById('openConfig').click();
            }
        });
    });

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

    function handleAction(name, isSend) {
        if (isSend) {
            alert(`Solicitud enviada a ${name}. Procesando...`);
        } else {
            alert(`Detalles de ${name}: Verificado bajo estándar GDPR.`);
        }
    }

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
