/**
 * CAT 930 Manager Pro - Full Engineering Suite
 */

let appState = {
    parts: [],
    currentView: 'dashboard',
    horometro: 8450, // Horómetro actual de la máquina
    // Historial de mantenimiento (Hoja de Vida)
    history: JSON.parse(localStorage.getItem('cat930_history')) || [
        { fecha: '2024-01-10', horometro: 8000, tipo: 'PM 250', nota: 'Cambio de aceite y filtros de motor inicial.' },
        { fecha: '2024-03-05', horometro: 8250, tipo: 'PM 500', nota: 'Servicio completo motor y transmisión.' }
    ]
};

// Configuración técnica de intervalos CAT
const PM_INTERVALS = {
    'PM 250': 250,
    'PM 500': 500,
    'PM 1000': 1000,
    'PM 2000': 2000
};

window.onload = async () => {
    await loadDatabase();
    router('dashboard');
};

async function loadDatabase() {
    // Ya no hacemos fetch, usamos la variable RAW_DATA del archivo database.js
    Papa.parse(RAW_DATA, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            appState.parts = results.data;
            console.log("Base de datos cargada localmente.");
        }
    });
}

function router(view) {
    appState.currentView = view;
    const content = document.getElementById('app-content');
    const title = document.getElementById('page-title');
    
    content.innerHTML = '';
    title.innerText = view.replace('-', ' ').toUpperCase();

    switch(view) {
        case 'dashboard': renderDashboard(); break;
        case 'catalogo': renderCatalogo(); break;
        case 'visual': renderVisual(); break;
        case 'qr-generator': renderQRGenerator(); break;
        case 'hoja-vida': renderHojaVida(); break;
    }
}

// --- LOGICA DE MANTENIMIENTO ---
function checkMaintStatus() {
    let alerts = [];
    Object.keys(PM_INTERVALS).forEach(tipo => {
        // Buscar el último registro de este tipo
        const lastService = [...appState.history].reverse().find(h => h.tipo === tipo);
        if (lastService) {
            const horasDesdeServicio = appState.horometro - lastService.horometro;
            const horasRestantes = PM_INTERVALS[tipo] - horasDesdeServicio;
            
            if (horasRestantes <= 50) {
                alerts.push({ tipo, horasRestantes, urgente: horasRestantes <= 10 });
            }
        }
    });
    return alerts;
}

// --- VISTA: DASHBOARD ---
function renderDashboard() {
    const alerts = checkMaintStatus();
    let alertHtml = alerts.map(a => `
        <div class="p-4 ${a.urgente ? 'bg-red-100 border-red-500' : 'bg-yellow-100 border-yellow-500'} border-l-4 rounded-r-lg mb-2 animate__animated animate__pulse animate__infinite">
            <p class="text-sm font-bold ${a.urgente ? 'text-red-700' : 'text-yellow-700'}">
                ⚠️ ALERTA ${a.tipo}: Toca en ${a.horasRestantes}h.
            </p>
        </div>
    `).join('');

    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="stat-card glass-card p-6 rounded-xl border-l-4 border-yellow-500">
                <p class="text-xs text-gray-500 font-bold uppercase">Horómetro Actual</p>
                <input type="number" value="${appState.horometro}" onchange="updateHours(this.value)" class="text-3xl font-bold bg-transparent border-none outline-none w-full">
            </div>
            <div class="lg:col-span-2">${alertHtml || '<p class="text-green-500 font-bold">✅ Todos los sistemas en rango de horas.</p>'}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="glass-card p-6 rounded-xl bg-gray-900 text-white">
                <h4 class="font-bold mb-4 text-yellow-500">Estado de Stock Crítico</h4>
                <div class="text-sm">
                    ${appState.parts.filter(p => p.Cantidad == 0).slice(0,3).map(p => `<li>Falta: ${p['Nombre de la Pieza']}</li>`).join('')}
                </div>
            </div>
            <div class="glass-card p-6 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer" onclick="router('hoja-vida')">
                <div class="text-center">
                    <i class="fa-solid fa-plus-circle text-4xl text-gray-300 mb-2"></i>
                    <p class="text-gray-500 font-bold">Registrar Nuevo Mantenimiento</p>
                </div>
            </div>
        </div>
    `;
}

function updateHours(val) {
    appState.horometro = parseInt(val);
    router('dashboard');
}

// --- VISTA: HOJA DE VIDA ---
function renderHojaVida() {
    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Formulario de Registro -->
            <div class="glass-card p-6 rounded-xl">
                <h3 class="font-bold mb-6 border-b pb-2">Registrar Servicio</h3>
                <div class="space-y-4">
                    <input type="date" id="h-fecha" class="w-full p-3 rounded-lg border">
                    <input type="number" id="h-hora" placeholder="Horómetro" class="w-full p-3 rounded-lg border">
                    <select id="h-tipo" class="w-full p-3 rounded-lg border">
                        <option>PM 250</option>
                        <option>PM 500</option>
                        <option>PM 1000</option>
                        <option>PM 2000</option>
                        <option>REPARACIÓN</option>
                    </select>
                    <textarea id="h-nota" placeholder="Notas técnicas..." class="w-full p-3 rounded-lg border h-32"></textarea>
                    <button onclick="saveMaint()" class="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-yellow-500 hover:text-black transition">Guardar en Historial</button>
                </div>
            </div>

            <!-- Listado Histórico -->
            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                <h3 class="font-bold mb-6">Historial de Intervenciones</h3>
                <div class="space-y-4">
                    ${appState.history.slice().reverse().map(h => `
                        <div class="flex items-start p-4 border-b hover:bg-gray-50">
                            <div class="text-center mr-6">
                                <span class="block font-bold text-lg">${h.horometro}h</span>
                                <span class="text-[10px] text-gray-400 uppercase">${h.fecha}</span>
                            </div>
                            <div class="flex-1">
                                <span class="text-xs font-bold px-2 py-1 bg-yellow-100 text-yellow-800 rounded">${h.tipo}</span>
                                <p class="text-sm mt-2 text-gray-600">${h.nota}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function saveMaint() {
    const newEntry = {
        fecha: document.getElementById('h-fecha').value,
        horometro: parseInt(document.getElementById('h-hora').value),
        tipo: document.getElementById('h-tipo').value,
        nota: document.getElementById('h-nota').value
    };

    if(!newEntry.fecha || !newEntry.horometro) return alert("Completa fecha y horómetro");

    appState.history.push(newEntry);
    localStorage.setItem('cat930_history', JSON.stringify(appState.history));
    router('hoja-vida');
}

// --- (Otras funciones de renderizado: Catalogo, Visual, QR se mantienen igual que la entrega anterior) ---
// ... (Copiar funciones renderCatalogo, renderVisual, renderQRGenerator de la llamada anterior)