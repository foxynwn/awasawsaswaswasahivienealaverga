const ESTADOS_MX = {
    'CDMX': { lat: 19.4326, lon: -99.1332 },
    'Jalisco': { lat: 20.6595, lon: -103.3494 },
    'Chiapas': { lat: 16.2381, lon: -91.5000 },
    'Veracruz': { lat: 19.5018, lon: -96.1289 },
    'Yucatán': { lat: 20.5887, lon: -87.3002 },
    'Guanajuato': { lat: 21.0161, lon: -101.2560 },
    'Oaxaca': { lat: 17.0627, lon: -96.7235 },
    'Guerrero': { lat: 17.5507, lon: -101.5505 },
};

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(tab).classList.add('active');
    });
});

// Load states grid
function loadStatesGrid() {
    const grid = document.getElementById('states-grid');
    grid.innerHTML = '';
    
    chrome.storage.sync.get(['allowedStates'], (result) => {
        if (chrome.runtime.lastError) {
            console.warn('Load states failed:', chrome.runtime.lastError);
        }
        const allowed = Array.isArray(result.allowedStates) ? result.allowedStates : Object.keys(ESTADOS_MX);
        
        Object.keys(ESTADOS_MX).forEach(state => {
            const btn = document.createElement('button');
            btn.className = 'state-btn';
            btn.textContent = state;
            if (allowed.includes(state)) btn.classList.add('active');
            
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const newAllowed = Array.from(document.querySelectorAll('.state-btn.active')).map(b => b.textContent);
                chrome.storage.sync.set({ allowedStates: newAllowed });
            });
            
            grid.appendChild(btn);
        });
    });
}

// Save filters
document.getElementById('save-filter').addEventListener('click', () => {
    const keywords = document.getElementById('keywords-input').value
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);
    const verifiedOnly = document.getElementById('verified-only').checked;
    const minLikes = parseInt(document.getElementById('min-likes').value, 10) || 0;
    const minRetweets = parseInt(document.getElementById('min-retweets').value, 10) || 0;
    
    chrome.storage.sync.set({
        keywords,
        verifiedOnly,
        minLikes,
        minRetweets
    }, () => {
        alert('✓ Filtros guardados');
    });
});

// Load settings
function loadSettings() {
    chrome.storage.sync.get(['keywords', 'verifiedOnly', 'minLikes', 'minRetweets', 'autoBlock', 'showHighlights', 'notifyBlocked', 'retention'], (result) => {
        if (chrome.runtime.lastError) {
            console.warn('Storage load failed:', chrome.runtime.lastError);
            return;
        }
        if (Array.isArray(result.keywords)) document.getElementById('keywords-input').value = result.keywords.join(', ');
        if (result.verifiedOnly !== undefined) document.getElementById('verified-only').checked = result.verifiedOnly;
        if (result.minLikes !== undefined) document.getElementById('min-likes').value = result.minLikes;
        if (result.minRetweets !== undefined) document.getElementById('min-retweets').value = result.minRetweets;
        if (result.autoBlock !== undefined) document.getElementById('auto-block').checked = result.autoBlock;
        if (result.showHighlights !== undefined) document.getElementById('show-highlights').checked = result.showHighlights;
        if (result.notifyBlocked !== undefined) document.getElementById('notify-blocked').checked = result.notifyBlocked;
        if (result.retention !== undefined) document.getElementById('retention').value = result.retention;
    });
}

// Save settings
document.getElementById('save-settings').addEventListener('click', () => {
    chrome.storage.sync.set({
        autoBlock: document.getElementById('auto-block').checked,
        showHighlights: document.getElementById('show-highlights').checked,
        notifyBlocked: document.getElementById('notify-blocked').checked,
        retention: parseInt(document.getElementById('retention').value) || 24
    }, () => {
        alert('✓ Ajustes guardados');
    });
});

// Detector tab
document.getElementById('refresh-detector').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            document.getElementById('account-info').textContent = 'No hay pestaña activa disponible';
            return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: 'detectAccount' }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Message error:', chrome.runtime.lastError);
                document.getElementById('account-info').textContent = 'No se pudo detectar la cuenta';
                return;
            }
            if (!response) {
                document.getElementById('account-info').textContent = 'No hay respuesta del contenido';
                return;
            }
            document.getElementById('account-info').innerHTML = `
                <p><strong>Usuario:</strong> ${response.account?.username || 'No detectado'}</p>
                <p><strong>Verificado:</strong> ${response.account?.verified ? '✓' : '✗'}</p>
                <p><strong>Seguidores:</strong> ${response.account?.followers || 'N/A'}</p>
            `;
            
            document.getElementById('location-status').innerHTML = `
                <p><strong>Ubicación estimada:</strong> ${response.location?.state || 'Desconocida'}</p>
                <p><strong>Confianza:</strong> ${response.location?.confidence || 'N/A'}%</p>
            `;
            
            document.getElementById('device-status').innerHTML = `
                <p><strong>Sistema:</strong> ${response.device?.os || 'N/A'}</p>
                <p><strong>Navegador:</strong> ${response.device?.browser || 'Chrome'}</p>
                <p><strong>Idioma:</strong> ${response.device?.language || 'es-MX'}</p>
            `;
        });
    });
});

// Export stats
document.getElementById('export-stats').addEventListener('click', () => {
    chrome.storage.local.get(['tweetStats'], (result) => {
        const data = JSON.stringify(result.tweetStats || {}, null, 2);
        downloadFile(data, 'stats.json');
    });
});

// Clear stats
document.getElementById('clear-stats').addEventListener('click', () => {
    if (confirm('¿Eliminar todas las estadísticas?')) {
        chrome.storage.local.set({ tweetStats: {} });
        alert('✓ Estadísticas eliminadas');
    }
});

// Import/Export config
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-config').click();
});

document.getElementById('import-config').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const config = JSON.parse(evt.target.result);
            chrome.storage.sync.set(config, () => {
                if (chrome.runtime.lastError) {
                    console.warn('Import failed:', chrome.runtime.lastError);
                    return alert('No se pudo importar la configuración');
                }
                alert('✓ Configuración importada');
                loadSettings();
                loadStatesGrid();
                e.target.value = '';
            });
        } catch (err) {
            alert('Error: Archivo JSON inválido');
        }
    };
    reader.readAsText(file);
});

document.getElementById('export-config').addEventListener('click', () => {
    chrome.storage.sync.get(null, (items) => {
        if (chrome.runtime.lastError) {
            console.warn('Export config failed:', chrome.runtime.lastError);
            return alert('No se pudo exportar la configuración');
        }
        const data = JSON.stringify(items, null, 2);
        downloadFile(data, 'config.json');
    });
});

function downloadFile(data, filename) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Load stats display
function loadStats() {
    chrome.storage.local.get(['tweetStats'], (result) => {
        const stats = result.tweetStats || {};
        document.getElementById('stat-tweets').textContent = stats.blocked || 0;
        document.getElementById('stat-allowed').textContent = stats.allowed || 0;
        document.getElementById('stat-filtered').textContent = stats.keywords || 0;
        
        const stateStats = stats.byState || {};
        const html = Object.entries(stateStats)
            .sort(([, a], [, b]) => b - a)
            .map(([state, count]) => `<div class="state-stat-item"><span>${state}</span><strong>${count}</strong></div>`)
            .join('');
        
        document.getElementById('state-stats').innerHTML = html || '<p style="color: #999;">Sin datos</p>';
    });
}

// Initialize
loadStatesGrid();
loadSettings();
loadStats();

setInterval(loadStats, 5000);
