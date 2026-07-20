/**
 * CAT 930 Manager Pro - Versión 4.0 Industrial
 */

let appState = {
    parts: [],
    currentView: 'dashboard',
    horometro: 8450,
    history: JSON.parse(localStorage.getItem('cat930_history')) || [
        { fecha: '2024-01-10', horometro: 8000, tipo: 'PM 250', nota: 'Servicio inicial de filtros y aceite.' }
    ]
};

const PM_INTERVALS = { 'PM 250': 250, 'PM 500': 500, 'PM 1000': 1000, 'PM 2000': 2000 };

window.onload = async () => {
    await loadDatabase();
    router('dashboard');
};

async function loadDatabase() {
    return new Promise((resolve) => {
        if (typeof RAW_DATA !== 'undefined') {
            Papa.parse(RAW_DATA, {
                header: true, skipEmptyLines: true,
                complete: function(results) {
                    appState.parts = results.data;
                    console.log("Base de datos cargada: " + appState.parts.length);
                    resolve();
                }
            });
        } else {
            console.error("RAW_DATA no definido. Revisa database.js");
            resolve();
        }
    });
}

function router(view) {
    appState.currentView = view;
    const content = document.getElementById('app-content');
    const title = document.getElementById('page-title');
    
    // Limpiar clases de animación para reiniciar
    content.classList.remove('animate__fadeIn');
    void content.offsetWidth; // Truco para reiniciar animación
    
    title.innerText = view.replace('-', ' ').toUpperCase();

    // Mapeo de rutas para evitar errores si haces clic en botones viejos
    switch(view) {
        case 'dashboard': renderDashboard(); break;
        case 'catalogo': renderCatalogo(); break;
        case 'inventario': renderCatalogo(); break; // Redirigir a catálogo
        case 'visual': renderVisual(); break;
        case 'qr-generator': renderQRGenerator(); break;
        case 'hoja-vida': renderHojaVida(); break;
        case 'mantenimiento': renderHojaVida(); break; // Redirigir a Hoja de Vida
        case 'lubricacion': renderLubricacion(); break;
        default: renderDashboard();
    }
    
    content.classList.add('animate__fadeIn');
}

// --- VISTA: DASHBOARD ---
function renderDashboard() {
    const alerts = [];
    Object.keys(PM_INTERVALS).forEach(tipo => {
        const last = [...appState.history].reverse().find(h => h.tipo === tipo);
        if (last) {
            const rest = PM_INTERVALS[tipo] - (appState.horometro - last.horometro);
            if (rest <= 50) alerts.push({ tipo, rest });
        }
    });

    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="stat-card bg-white p-6 rounded-xl border-l-4 border-yellow-500 shadow-sm">
                <p class="text-xs text-gray-500 font-bold uppercase">Horómetro Actual</p>
                <input type="number" value="${appState.horometro}" onchange="appState.horometro=parseInt(this.value);renderDashboard();" class="text-3xl font-bold bg-transparent w-full outline-none">
            </div>
            <div class="md:col-span-2">
                ${alerts.map(a => `<div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 font-bold rounded mb-2 animate__animated animate__headShake">⚠️ Alerta ${a.tipo}: Toca en ${a.rest}h</div>`).join('') || '<div class="p-4 bg-green-100 border-l-4 border-green-500 text-green-700 font-bold rounded">✅ Todos los sistemas están al día</div>'}
            </div>
        </div>
        <div class="bg-black text-white p-12 rounded-3xl text-center shadow-2xl">
            <i class="fa-solid fa-tractor text-6xl text-yellow-500 mb-6"></i>
            <h2 class="text-3xl font-bold mb-2">CAT 930 | SERIAL 41K9061</h2>
            <p class="text-gray-400 max-w-md mx-auto">Gestión de flota y mantenimiento proactivo de nivel industrial.</p>
        </div>
    `;
}

// --- VISTA: CATÁLOGO ---
function renderCatalogo() {
    document.getElementById('app-content').innerHTML = `
        <div class="mb-6"><input type="text" id="searchInput" onkeyup="filterParts()" placeholder="Buscar por nombre o número de parte..." class="w-full p-4 rounded-xl shadow-md border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-yellow-500 outline-none"></div>
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-black text-yellow-500 text-xs uppercase tracking-wider">
                    <tr><th class="p-4">Pieza / Sistema</th><th class="p-4">N° Parte</th><th class="p-4">Stock</th><th class="p-4 text-center">Etiqueta</th></tr>
                </thead>
                <tbody id="tableBody">${generateRows(appState.parts)}</tbody>
            </table>
        </div>
    `;
}

function generateRows(data) {
    if(!data.length) return '<tr><td colspan="4" class="p-8 text-center text-gray-400">No se encontraron repuestos.</td></tr>';
    return data.map(p => `
        <tr class="border-b hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-gray-800">${p['Nombre de la Pieza']}<br><span class="text-[10px] text-gray-400 uppercase font-normal">${p.Sistema}</span></td>
            <td class="p-4 font-mono text-blue-600">${p['Número de Parte']}</td>
            <td class="p-4 text-center font-bold">${p.Cantidad}</td>
            <td class="p-4 text-center"><button onclick="generateSingleQR('${p['SKU/QR']}')" class="text-gray-400 hover:text-yellow-500 transition"><i class="fa-solid fa-qrcode text-xl"></i></button></td>
        </tr>
    `).join('');
}

function filterParts() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = appState.parts.filter(p => p['Nombre de la Pieza'].toLowerCase().includes(q) || p['Número de Parte'].toLowerCase().includes(q));
    document.getElementById('tableBody').innerHTML = generateRows(filtered);
}

// --- VISTA: EXPLORADOR VISUAL ---
function renderVisual() {
    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 relative bg-gray-900 rounded-3xl p-10 flex items-center justify-center min-h-[450px] shadow-2xl border-4 border-gray-800">
                <svg viewBox="0 0 800 400" class="w-full opacity-20"><path d="M150 300 L550 300 L580 200 L400 180 L350 100 L180 100 Z" fill="none" stroke="white" stroke-width="3" /></svg>
                <div class="hotspot" style="top: 35%; left: 30%;" onclick="quickLook('Motor')"></div>
                <div class="hotspot" style="top: 55%; left: 45%;" onclick="quickLook('Transmisión')"></div>
                <div class="hotspot" style="top: 45%; left: 60%;" onclick="quickLook('Hidráulico')"></div>
                <div class="hotspot" style="top: 75%; left: 28%;" onclick="quickLook('Ejes')"></div>
                <div class="absolute bottom-4 left-6 text-white text-[10px] opacity-30 uppercase tracking-widest">Esquema Técnico 41K9061</div>
            </div>
            <div id="quick-panel" class="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 italic text-gray-400">Selecciona un sistema en el diagrama para ver repuestos críticos.</div>
        </div>
    `;
}

function quickLook(sys) {
    const filtered = appState.parts.filter(p => p.Sistema.includes(sys)).slice(0,6);
    let html = `<h4 class="font-black text-2xl text-black mb-6 border-b-4 border-yellow-500 pb-2 inline-block">${sys.toUpperCase()}</h4><div class="space-y-3">`;
    filtered.forEach(p => html += `<div class="p-3 bg-gray-50 rounded-xl text-xs border border-gray-100 shadow-sm"><b class="text-blue-600">${p['Número de Parte']}</b><br>${p['Nombre de la Pieza']}</div>`);
    document.getElementById('quick-panel').innerHTML = html + `</div>`;
}

// --- VISTA: GENERADOR QR ---
function renderQRGenerator() {
    document.getElementById('app-content').innerHTML = `
        <div class="bg-white p-10 rounded-3xl max-w-md mx-auto shadow-2xl text-center border border-gray-100">
            <h3 class="font-black text-xl mb-6">ETIQUETADO QR</h3>
            <select id="qrSelect" class="w-full p-4 rounded-xl border-none ring-1 ring-gray-200 mb-6 outline-none">
                ${appState.parts.map(p => `<option value="${p['SKU/QR']}">${p['Número de Parte']} - ${p.Nombre_Pieza || p['Nombre de la Pieza']}</option>`).join('')}
            </select>
            <div id="qrcode-canvas" class="flex justify-center p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl mb-6 min-h-[240px] items-center"></div>
            <button onclick="makeQR()" class="w-full bg-yellow-500 text-black py-4 rounded-xl font-black hover:bg-black hover:text-white transition shadow-lg">GENERAR ETIQUETA</button>
        </div>
    `;
}

function makeQR() {
    const val = document.getElementById('qrSelect').value;
    const canvas = document.getElementById('qrcode-canvas');
    canvas.innerHTML = '';
    new QRCode(canvas, { text: val, width: 200, height: 200, colorDark : "#000000", colorLight : "#ffffff" });
}

function generateSingleQR(sku) {
    router('qr-generator');
    setTimeout(() => { document.getElementById('qrSelect').value = sku; makeQR(); }, 300);
}

// --- VISTA: HOJA DE VIDA ---
function renderHojaVida() {
    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <h4 class="font-black text-lg mb-6 border-b pb-2">REGISTRO TÉCNICO</h4>
                <div class="space-y-4">
                    <input type="date" id="h-fecha" class="w-full p-3 bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl">
                    <input type="number" id="h-hora" placeholder="Horómetro actual" class="w-full p-3 bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl">
                    <select id="h-tipo" class="w-full p-3 bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl">
                        <option>PM 250</option><option>PM 500</option><option>PM 1000</option><option>PM 2000</option><option>REPARACIÓN</option>
                    </select>
                    <textarea id="h-nota" placeholder="Detalles de la intervención..." class="w-full p-4 bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl h-32"></textarea>
                    <button onclick="saveMaint()" class="w-full bg-black text-white py-4 rounded-xl font-black hover:bg-yellow-500 hover:text-black transition shadow-lg">GUARDAR EN BITÁCORA</button>
                </div>
            </div>
            <div class="lg:col-span-2 bg-white rounded-3xl shadow-xl p-8 overflow-y-auto max-h-[600px] border border-gray-100">
                <h4 class="font-black text-lg mb-6">HISTORIAL DE LA MÁQUINA</h4>
                <div class="space-y-4">
                    ${appState.history.slice().reverse().map(h => `
                        <div class="p-6 border border-gray-100 rounded-2xl flex justify-between items-center hover:bg-gray-50 transition">
                            <div><span class="text-[10px] font-black bg-yellow-400 px-2 py-1 rounded uppercase">${h.tipo}</span><p class="mt-2 text-sm text-gray-700 font-medium">${h.nota}</p></div>
                            <div class="text-right"><div class="text-xl font-black text-black">${h.horometro}h</div><div class="text-[10px] text-gray-400 font-bold">${h.fecha}</div></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function saveMaint() {
    const h = { fecha: document.getElementById('h-fecha').value, horometro: parseInt(document.getElementById('h-hora').value), tipo: document.getElementById('h-tipo').value, nota: document.getElementById('h-nota').value };
    if(!h.fecha || !h.horometro) return alert("Error: Fecha y Horómetro son obligatorios.");
    appState.history.push(h);
    localStorage.setItem('cat930_history', JSON.stringify(appState.history));
    router('hoja-vida');
}

// --- VISTA: LUBRICACION ---
function renderLubricacion() {
    document.getElementById('app-content').innerHTML = `
        <div class="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
            <h3 class="font-black text-2xl mb-6">PLAN DE LUBRICACIÓN DIARIO (10H)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-6 bg-yellow-50 rounded-2xl border border-yellow-100">
                    <h4 class="font-bold text-yellow-800">Puntos de Engrase (Grasa EP2)</h4>
                    <ul class="mt-4 space-y-2 text-sm text-yellow-900">
                        <li>• Articulación Central (Superior e Inferior)</li>
                        <li>• Cilindros de Dirección (4 puntos)</li>
                        <li>• Pasadores del Cucharón y Varillaje</li>
                        <li>• Cilindros de Levante (Boom)</li>
                    </ul>
                </div>
                <div class="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <h4 class="font-bold text-blue-800">Niveles de Aceite</h4>
                    <ul class="mt-4 space-y-2 text-sm text-blue-900">
                        <li>• Motor (Varilla lado derecho) - 15W40</li>
                        <li>• Transmisión (Mirilla motor encendido) - SAE 30</li>
                        <li>• Tanque Hidráulico (Mirilla lado derecho) - SAE 10W</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}
