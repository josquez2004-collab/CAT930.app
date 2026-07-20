/**
 * CAT 930 Manager Pro v5.0 - Industria 4.0
 */

let appState = {
    parts: [],
    currentView: 'dashboard',
    horometro: 8450,
    // Cargar stock modificado de memoria o usar el del CSV por defecto
    modifiedStock: JSON.parse(localStorage.getItem('cat930_stock')) || {},
    history: JSON.parse(localStorage.getItem('cat930_history')) || []
};

window.onload = async () => {
    await loadDatabase();
    router('dashboard');
};

async function loadDatabase() {
    return new Promise((resolve) => {
        Papa.parse(RAW_DATA, {
            header: true, skipEmptyLines: true,
            complete: function(results) {
                // Sincronizar stock de CSV con el modificado en memoria
                appState.parts = results.data.map(p => {
                    if(appState.modifiedStock[p['SKU/QR']] !== undefined) {
                        p.Cantidad = appState.modifiedStock[p['SKU/QR']];
                    }
                    return p;
                });
                resolve();
            }
        });
    });
}

function router(view) {
    appState.currentView = view;
    const content = document.getElementById('app-content');
    document.getElementById('page-title').innerText = view.toUpperCase();
    content.innerHTML = '';

    switch(view) {
        case 'dashboard': renderDashboard(); break;
        case 'explorador': renderExplorador(); break;
        case 'visual': renderVisual(); break;
        case 'bitacora': renderBitacora(); break;
    }
}

// --- DASHBOARD: ENTRADA Y SALIDA ---
function renderDashboard() {
    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate__animated animate__fadeIn">
            <!-- BUSCADOR / ESCANER -->
            <div class="bg-white p-8 rounded-3xl shadow-xl border-t-4 border-yellow-500">
                <h3 class="font-black text-xl mb-6 flex items-center">
                    <i class="fa-solid fa-barcode mr-3 text-yellow-500"></i> OPERACIÓN DE ALMACÉN
                </h3>
                <div class="space-y-6">
                    <div>
                        <label class="text-[10px] font-bold text-gray-400 uppercase">Buscar por SKU o Referencia</label>
                        <input type="text" id="op-search" list="parts-list" placeholder="Ej: 1R-0716..." 
                            class="w-full p-4 bg-gray-50 rounded-2xl border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-yellow-500 transition">
                        <datalist id="parts-list">
                            ${appState.parts.map(p => `<option value="${p['SKU/QR']}">${p['Número de Parte']} - ${p['Nombre de la Pieza']}</option>`).join('')}
                        </datalist>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="processTransaction('out')" class="bg-red-500 text-white p-5 rounded-2xl font-black hover:bg-black transition shadow-lg">
                            <i class="fa-solid fa-minus-circle mr-2"></i> SALIDA
                        </button>
                        <button onclick="processTransaction('in')" class="bg-green-500 text-white p-5 rounded-2xl font-black hover:bg-black transition shadow-lg">
                            <i class="fa-solid fa-plus-circle mr-2"></i> ENTRADA
                        </button>
                    </div>
                    <p class="text-[10px] text-gray-400 text-center italic">Para usar el escáner QR, enfoca el SKU con un lector externo y pégalo en el buscador.</p>
                </div>
            </div>

            <!-- RESUMEN DE ALERTAS -->
            <div class="space-y-6">
                <div class="bg-black text-white p-8 rounded-3xl shadow-xl">
                    <p class="text-yellow-500 font-bold text-xs uppercase tracking-widest mb-2">Estado de Máquina</p>
                    <div class="flex justify-between items-center">
                        <h2 class="text-4xl font-black">${appState.horometro} H</h2>
                        <i class="fa-solid fa-gauge-high text-3xl opacity-20"></i>
                    </div>
                </div>
                <div id="recent-actions" class="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 min-h-[200px]">
                    <h4 class="text-xs font-black mb-4 uppercase">Últimos Movimientos</h4>
                    <div id="log-container" class="text-xs space-y-2"></div>
                </div>
            </div>
        </div>
    `;
}

function processTransaction(type) {
    const sku = document.getElementById('op-search').value;
    const part = appState.parts.find(p => p['SKU/QR'] === sku);
    
    if(!part) return alert("Repuesto no encontrado");

    let qty = parseInt(prompt(`Cantidad para ${type === 'in' ? 'ENTRADA' : 'SALIDA'} de ${part['Nombre de la Pieza']}:`, "1"));
    if(isNaN(qty) || qty <= 0) return;

    if(type === 'out' && part.Cantidad < qty) return alert("Stock insuficiente");

    // Actualizar Stock
    const newQty = type === 'in' ? parseInt(part.Cantidad) + qty : parseInt(part.Cantidad) - qty;
    part.Cantidad = newQty;
    appState.modifiedStock[sku] = newQty;
    localStorage.setItem('cat930_stock', JSON.stringify(appState.modifiedStock));

    // Log visual
    const log = document.getElementById('log-container');
    const msg = `<div class="p-2 ${type === 'in' ? 'bg-green-50' : 'bg-red-50'} rounded border-l-4 ${type === 'in' ? 'border-green-500' : 'border-red-500'}">
        <b>${new Date().toLocaleTimeString()}</b> - ${type.toUpperCase()}: ${qty} und. de ${part['Número de Parte']} (Queda: ${newQty})
    </div>`;
    log.innerHTML = msg + log.innerHTML;
    
    document.getElementById('op-search').value = '';
}

// --- EXPLORADOR DE REPUESTOS: CATALOGO + QR + IMAGEN ---
function renderExplorador() {
    document.getElementById('app-content').innerHTML = `
        <div class="mb-6 flex gap-4">
            <input type="text" id="searchParts" onkeyup="filterParts()" placeholder="Filtrar por sistema, nombre o referencia..." 
                class="flex-1 p-4 rounded-2xl shadow-sm border-none ring-1 ring-gray-200 outline-none">
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate__animated animate__fadeIn" id="explorer-grid">
            ${generatePartCards(appState.parts)}
        </div>
    `;
}

function generatePartCards(data) {
    return data.map(p => `
        <div class="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div class="h-48 bg-gray-200 relative overflow-hidden">
                <!-- Imagen desde Telegram Placeholder -->
                <img src="https://via.placeholder.com/400x300?text=${p['Número de Parte']}" class="w-full h-full object-cover group-hover:scale-110 transition">
                <div class="absolute top-4 right-4 bg-black text-yellow-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    ${p.Sistema}
                </div>
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-black text-gray-800 leading-tight">${p['Nombre de la Pieza']}</h4>
                        <p class="text-blue-600 font-mono text-sm">${p['Número de Parte']}</p>
                    </div>
                    <div class="text-right">
                        <span class="block text-2xl font-black ${p.Cantidad <= 1 ? 'text-red-500' : 'text-gray-800'}">${p.Cantidad}</span>
                        <span class="text-[8px] uppercase font-bold text-gray-400">En Stock</span>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t flex justify-between items-center">
                    <button onclick="showQuickQR('${p['SKU/QR']}')" class="text-gray-400 hover:text-black transition">
                        <i class="fa-solid fa-qrcode text-xl"></i>
                    </button>
                    <span class="text-[10px] text-gray-400 italic">${p['Frecuencia de Cambio']}</span>
                </div>
                <div id="qr-${p['SKU/QR']}" class="hidden mt-4 p-4 bg-gray-50 rounded-xl flex justify-center"></div>
            </div>
        </div>
    `).join('');
}

function showQuickQR(sku) {
    const div = document.getElementById(`qr-${sku}`);
    if(!div.innerHTML) {
        new QRCode(div, { text: sku, width: 120, height: 120 });
    }
    div.classList.toggle('hidden');
}

// --- BLUEPRINT INTERACTIVO (CORREGIDO) ---
function renderVisual() {
    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 animate__animated animate__fadeIn">
            <div class="lg:col-span-3 bg-gray-900 rounded-[3rem] p-10 flex items-center justify-center relative min-h-[500px]">
                <svg viewBox="0 0 800 400" class="w-full h-auto drop-shadow-[0_0_15px_rgba(255,205,0,0.3)]">
                    <path d="M100 300 L600 300 L650 150 L500 120 L400 50 L150 50 Z" fill="none" stroke="#555" stroke-width="2"/>
                    <circle cx="200" cy="300" r="50" fill="none" stroke="#FFCD00" stroke-width="4"/>
                    <circle cx="500" cy="300" r="50" fill="none" stroke="#FFCD00" stroke-width="4"/>
                    <!-- Hotspots corregidos -->
                    <circle cx="250" cy="150" r="15" class="hotspot-pulse cursor-pointer" onclick="filterVisual('Motor')" />
                    <circle cx="400" cy="200" r="15" class="hotspot-pulse cursor-pointer" onclick="filterVisual('Transmisión')" />
                    <circle cx="550" cy="180" r="15" class="hotspot-pulse cursor-pointer" onclick="filterVisual('Hidráulico')" />
                    <circle cx="200" cy="300" r="15" class="hotspot-pulse cursor-pointer" onclick="filterVisual('Ejes')" />
                </svg>
            </div>
            <div id="visual-details" class="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 italic text-gray-400 flex items-center justify-center text-center">
                Toca los puntos amarillos para filtrar repuestos por sistema.
            </div>
        </div>
    `;
}

function filterVisual(sys) {
    const parts = appState.parts.filter(p => p.Sistema.includes(sys)).slice(0,5);
    let html = `<div class="w-full"><h3 class="font-black text-xl mb-4 border-b-4 border-yellow-500 pb-2">${sys.toUpperCase()}</h3>`;
    parts.forEach(p => {
        html += `<div class="p-3 mb-2 bg-gray-50 rounded-xl text-xs flex justify-between">
            <b>${p['Número de Parte']}</b>
            <span class="${p.Cantidad <= 1 ? 'text-red-500' : 'text-green-600'} font-bold">Stk: ${p.Cantidad}</span>
        </div>`;
    });
    document.getElementById('visual-details').innerHTML = html + `</div>`;
}

// --- BITACORA Y HOJA DE VIDA ---
function renderBitacora() {
    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate__animated animate__fadeIn">
            <div class="bg-white p-8 rounded-3xl shadow-xl">
                <h4 class="font-black mb-6">REGISTRAR INTERVENCIÓN</h4>
                <div class="space-y-4">
                    <input type="date" id="log-date" class="w-full p-4 bg-gray-50 rounded-xl border-none ring-1 ring-gray-100">
                    <input type="number" id="log-hour" placeholder="Horas" class="w-full p-4 bg-gray-50 rounded-xl border-none ring-1 ring-gray-100">
                    <select id="log-type" class="w-full p-4 bg-gray-50 rounded-xl border-none ring-1 ring-gray-100">
                        <option>PM 250</option><option>PM 500</option><option>PM 1000</option><option>OVERHAUL</option>
                    </select>
                    <textarea id="log-desc" placeholder="Descripción técnica..." class="w-full p-4 bg-gray-50 rounded-xl border-none ring-1 ring-gray-100 h-32"></textarea>
                    <button onclick="saveLog()" class="w-full bg-black text-white py-4 rounded-xl font-black">GUARDAR EN HOJA DE VIDA</button>
                </div>
            </div>
            <div class="lg:col-span-2 bg-white rounded-3xl shadow-xl p-8 overflow-y-auto max-h-[600px]">
                <h4 class="font-black mb-6 uppercase tracking-widest">Cronología de Mantenimiento</h4>
                <div class="space-y-4">
                    ${appState.history.slice().reverse().map(h => `
                        <div class="flex items-center p-5 border border-gray-100 rounded-2xl">
                            <div class="mr-6 text-center">
                                <span class="block text-2xl font-black">${h.horometro}h</span>
                                <span class="text-[8px] text-gray-400 font-bold uppercase">${h.fecha}</span>
                            </div>
                            <div class="flex-1">
                                <span class="bg-yellow-400 text-[10px] font-black px-2 py-1 rounded-full uppercase">${h.tipo}</span>
                                <p class="text-sm text-gray-600 mt-2 font-medium">${h.nota}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function saveLog() {
    const entry = {
        fecha: document.getElementById('log-date').value,
        horometro: parseInt(document.getElementById('log-hour').value),
        tipo: document.getElementById('log-type').value,
        nota: document.getElementById('log-desc').value
    };
    if(!entry.fecha || !entry.horometro) return alert("Faltan datos");
    appState.history.push(entry);
    localStorage.setItem('cat930_history', JSON.stringify(appState.history));
    router('bitacora');
}
