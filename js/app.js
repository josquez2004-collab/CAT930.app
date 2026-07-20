/**
 * CAT 930 Manager Pro - Versión Final Unificada
 */

let appState = {
    parts: [],
    currentView: 'dashboard',
    horometro: 8450,
    history: JSON.parse(localStorage.getItem('cat930_history')) || [
        { fecha: '2024-01-10', horometro: 8000, tipo: 'PM 250', nota: 'Servicio inicial.' }
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

// --- DASHBOARD ---
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
            <div class="stat-card glass-card p-6 rounded-xl border-l-4 border-yellow-500">
                <p class="text-xs text-gray-500 font-bold uppercase">Horómetro</p>
                <input type="number" value="${appState.horometro}" onchange="appState.horometro=parseInt(this.value);renderDashboard();" class="text-3xl font-bold bg-transparent w-full outline-none">
            </div>
            <div class="md:col-span-2">
                ${alerts.map(a => `<div class="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm mb-2">⚠️ Alerta ${a.tipo}: Toca en ${a.rest}h</div>`).join('') || '<p class="text-green-600 font-bold">✅ Sistemas al día</p>'}
            </div>
        </div>
        <div class="bg-gray-900 text-white p-10 rounded-2xl text-center">
            <i class="fa-solid fa-tractor text-5xl text-yellow-500 mb-4"></i>
            <h2 class="text-2xl font-bold">CAT 930 - 41K9061</h2>
            <p class="opacity-50 text-sm">Usa el menú lateral para gestionar repuestos y mantenimiento.</p>
        </div>
    `;
}

// --- CATÁLOGO ---
function renderCatalogo() {
    document.getElementById('app-content').innerHTML = `
        <div class="mb-6"><input type="text" id="searchInput" onkeyup="filterParts()" placeholder="Buscar repuesto..." class="w-full p-4 rounded-xl shadow-sm border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-yellow-500 outline-none"></div>
        <div class="bg-white rounded-xl shadow-lg overflow-x-auto">
            <table class="w-full text-left">
                <thead class="bg-black text-yellow-500 text-xs uppercase">
                    <tr><th class="p-4">Pieza</th><th class="p-4">Referencia</th><th class="p-4">Stock</th><th class="p-4">QR</th></tr>
                </thead>
                <tbody id="tableBody">${generateRows(appState.parts)}</tbody>
            </table>
        </div>
    `;
}

function generateRows(data) {
    return data.map(p => `
        <tr class="border-b hover:bg-gray-50 text-sm">
            <td class="p-4 font-bold">${p['Nombre de la Pieza']}<br><span class="text-[10px] text-gray-400">${p.Sistema}</span></td>
            <td class="p-4 font-mono">${p['Número de Parte']}</td>
            <td class="p-4 text-center">${p.Cantidad}</td>
            <td class="p-4"><button onclick="generateSingleQR('${p['SKU/QR']}')" class="text-yellow-600 hover:text-black"><i class="fa-solid fa-qrcode"></i></button></td>
        </tr>
    `).join('');
}

function filterParts() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = appState.parts.filter(p => p['Nombre de la Pieza'].toLowerCase().includes(q) || p['Número de Parte'].toLowerCase().includes(q));
    document.getElementById('tableBody').innerHTML = generateRows(filtered);
}

// --- VISUAL ---
function renderVisual() {
    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 diagram-container relative min-h-[400px] flex items-center justify-center bg-gray-800 rounded-2xl">
                <svg viewBox="0 0 800 400" class="w-full opacity-30 shadow-inner"><path d="M150 300 L550 300 L580 200 L400 180 L350 100 L180 100 Z" fill="none" stroke="white" stroke-width="2" /></svg>
                <div class="hotspot" style="top: 35%; left: 30%;" onclick="quickLook('Motor')"></div>
                <div class="hotspot" style="top: 55%; left: 45%;" onclick="quickLook('Transmisión')"></div>
                <div class="hotspot" style="top: 45%; left: 60%;" onclick="quickLook('Hidráulico')"></div>
                <div class="hotspot" style="top: 75%; left: 28%;" onclick="quickLook('Ejes')"></div>
            </div>
            <div id="quick-panel" class="glass-card p-6 rounded-xl bg-white shadow-lg">Selecciona un área del diagrama.</div>
        </div>
    `;
}

function quickLook(sys) {
    const filtered = appState.parts.filter(p => p.Sistema.includes(sys)).slice(0,5);
    let html = `<h4 class="font-bold text-yellow-600 mb-4 border-b pb-2">${sys}</h4>`;
    filtered.forEach(p => html += `<div class="p-2 border-b text-xs"><b>${p['Número de Parte']}</b> - ${p['Nombre de la Pieza']}</div>`);
    document.getElementById('quick-panel').innerHTML = html;
}

// --- QR GENERATOR ---
function renderQRGenerator() {
    document.getElementById('app-content').innerHTML = `
        <div class="glass-card p-8 rounded-2xl max-w-md mx-auto text-center bg-white shadow-xl">
            <h3 class="font-bold mb-4">Generador de Etiquetas QR</h3>
            <select id="qrSelect" class="w-full p-3 rounded-lg border mb-4">
                ${appState.parts.map(p => `<option value="${p['SKU/QR']}">${p['Número de Parte']} - ${p['Nombre de la Pieza']}</option>`).join('')}
            </select>
            <div id="qrcode-canvas" class="flex justify-center p-4 bg-white border mb-4 min-h-[200px] items-center"></div>
            <button onclick="makeQR()" class="w-full bg-black text-white py-3 rounded-lg font-bold">Generar QR</button>
        </div>
    `;
}

function makeQR() {
    const val = document.getElementById('qrSelect').value;
    const canvas = document.getElementById('qrcode-canvas');
    canvas.innerHTML = '';
    new QRCode(canvas, { text: val, width: 180, height: 180 });
}

function generateSingleQR(sku) {
    router('qr-generator');
    setTimeout(() => { document.getElementById('qrSelect').value = sku; makeQR(); }, 200);
}

// --- HOJA DE VIDA ---
function renderHojaVida() {
    document.getElementById('app-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="glass-card p-6 rounded-xl bg-white shadow-md">
                <h4 class="font-bold mb-4">Registrar Servicio</h4>
                <input type="date" id="h-fecha" class="w-full p-2 border rounded mb-2">
                <input type="number" id="h-hora" placeholder="Horas" class="w-full p-2 border rounded mb-2">
                <select id="h-tipo" class="w-full p-2 border rounded mb-2"><option>PM 250</option><option>PM 500</option><option>PM 1000</option><option>PM 2000</option><option>REPARACIÓN</option></select>
                <textarea id="h-nota" placeholder="Notas..." class="w-full p-2 border rounded mb-4"></textarea>
                <button onclick="saveMaint()" class="w-full bg-black text-white py-2 rounded font-bold">Guardar</button>
            </div>
            <div class="lg:col-span-2 bg-white rounded-xl shadow-md p-6 overflow-y-auto max-h-[500px]">
                <h4 class="font-bold mb-4">Historial Histórico</h4>
                ${appState.history.slice().reverse().map(h => `
                    <div class="p-3 border-b text-sm flex justify-between">
                        <div><b>${h.tipo}</b> - ${h.nota}</div>
                        <div class="text-right text-gray-400 font-mono">${h.horometro}h <br> ${h.fecha}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function saveMaint() {
    const h = { fecha: document.getElementById('h-fecha').value, horometro: parseInt(document.getElementById('h-hora').value), tipo: document.getElementById('h-tipo').value, nota: document.getElementById('h-nota').value };
    if(!h.fecha || !h.horometro) return alert("Faltan datos");
    appState.history.push(h);
    localStorage.setItem('cat930_history', JSON.stringify(appState.history));
    router('hoja-vida');
}
