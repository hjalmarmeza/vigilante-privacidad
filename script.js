document.addEventListener('DOMContentLoaded', () => {
    console.log('Vigilante de Privacidad Dashboard Cargado');

    // Simulación de escaneo dinámico
    const percentageEl = document.querySelector('.percentage');
    const circleEl = document.querySelector('.circle');
    let currentScore = 68;

    // Efecto de carga suave para el gráfico circular
    setTimeout(() => {
        circleEl.style.strokeDasharray = `${currentScore}, 100`;
    }, 500);

    // Animación de los puntos de alerta del radar
    const dots = document.querySelectorAll('.dot');
    setInterval(() => {
        dots.forEach(dot => {
            dot.style.opacity = Math.random() > 0.5 ? '1' : '0.3';
        });
    }, 1000);

    // Lógica para el botón de escaneo (simulación)
    const btnScan = document.querySelector('.btn-primary');
    if (btnScan) {
        btnScan.addEventListener('click', () => {
            btnScan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escaneando...';
            btnScan.disabled = true;
            
            setTimeout(() => {
                btnScan.innerHTML = 'Escaneo Completo';
                btnScan.style.background = '#10b981';
                
                // Actualizar stats aleatoriamente
                const miniValues = document.querySelectorAll('.mini-value');
                miniValues.forEach(v => {
                    let val = parseInt(v.textContent);
                    v.textContent = val + Math.floor(Math.random() * 5);
                });

                setTimeout(() => {
                    btnScan.innerHTML = 'Ver Sugerencias';
                    btnScan.style.background = '';
                    btnScan.disabled = false;
                }, 3000);
            }, 4000);
        });
    }

    // Efectos de hover en la tabla
    const rows = document.querySelectorAll('.broker-table tbody tr');
    rows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.background = 'rgba(255, 255, 255, 0.02)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.background = '';
        });
    });
});
