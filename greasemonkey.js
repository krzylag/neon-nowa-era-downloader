// ==UserScript==
// @name     SVG to PNG A4 Converter Script
// @version  5
// @grant    GM_download
// @grant    unsafeWindow
// @require     https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js
// ==/UserScript==
    
console.log('start');

// Funkcja sprawdzająca dostępność Canvas API
function isCanvasSupported() {
    try {
        // Próbuj standardowy sposób
        let canvas = document.createElement('canvas');
        if (canvas.getContext && canvas.getContext('2d')) {
            return true;
        }
        
        // Próbuj przez unsafeWindow
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.document) {
            canvas = unsafeWindow.document.createElement('canvas');
            if (canvas.getContext && canvas.getContext('2d')) {
                return true;
            }
        }
        
        return false;
    } catch (e) {
        console.log('Canvas support check error:', e);
        return false;
    }
}

// Funkcja do pobierania i osadzania obrazów w SVG
async function embedImagesInSvg(svgText, baseUrl) {
    console.log('    Processing embedded images...');
    
    // Znajdź wszystkie referencje do obrazów w SVG - różne formaty
    const patterns = [
        /(href|xlink:href)=["']([^"']+\.(png|jpg|jpeg|gif|bmp|webp|svg))["']/gi,
        /<image[^>]+src=["']([^"']+\.(png|jpg|jpeg|gif|bmp|webp))["']/gi,
        /<use[^>]+(href|xlink:href)=["']([^"']+)["']/gi
    ];
    
    let allMatches = [];
    for (const pattern of patterns) {
        const matches = [...svgText.matchAll(pattern)];
        allMatches = allMatches.concat(matches);
    }
    
    if (allMatches.length === 0) {
        console.log('    No external images found in SVG');
        return svgText;
    }
    
    console.log(`    Found ${allMatches.length} external references to process`);
    let processedSvg = svgText;
    
    for (const match of allMatches) {
        const fullMatch = match[0];
        let imageUrl;
        let attribute;
        
        // Różne formaty matchów w zależności od wzorca
        if (match[2] && match[2].includes('.')) {
            // Format: (href|xlink:href)="url.ext"
            attribute = match[1];
            imageUrl = match[2];
        } else if (match[1] && match[1].includes('.')) {
            // Format: src="url.ext"
            attribute = 'src';
            imageUrl = match[1];
        } else {
            // Format: use href="#id" - pomijamy referencje wewnętrzne
            if (match[2] && match[2].startsWith('#')) {
                continue;
            }
            attribute = match[1] || 'href';
            imageUrl = match[2];
        }
        
        // Pomijaj już osadzone obrazy (data: URLs) i referencje wewnętrzne
        if (!imageUrl || imageUrl.startsWith('data:') || imageUrl.startsWith('#')) {
            continue;
        }
        
        try {
            // Sprawdź czy URL jest względny czy absolutny
            let fullImageUrl;
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                fullImageUrl = imageUrl;
            } else if (imageUrl.startsWith('//')) {
                fullImageUrl = 'https:' + imageUrl;
            } else if (imageUrl.startsWith('/')) {
                // Względny URL od root domain
                const urlParts = baseUrl.split('/');
                fullImageUrl = `${urlParts[0]}//${urlParts[2]}${imageUrl}`;
            } else {
                // Względny URL od bieżącego katalogu
                const baseParts = baseUrl.split('/');
                baseParts.pop(); // Usuń nazwę pliku
                fullImageUrl = baseParts.join('/') + '/' + imageUrl;
            }
            
            console.log(`    Downloading: ${fullImageUrl}`);
            
            const imageResponse = await fetch(fullImageUrl, {
                "credentials": "include",
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
                    "Accept": "image/*,*/*;q=0.8",
                    "Accept-Language": "pl,en-US;q=0.7,en;q=0.3"
                },
                "method": "GET"
            });
            
            if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob();
                const imageBase64 = await blobToBase64(imageBlob);
                
                // Określ MIME type - najpierw z response, potem z rozszerzenia
                let mimeType = imageResponse.headers.get('content-type') || 'image/png';
                if (!mimeType.startsWith('image/')) {
                    const extension = imageUrl.split('.').pop().toLowerCase();
                    switch (extension) {
                        case 'jpg':
                        case 'jpeg':
                            mimeType = 'image/jpeg';
                            break;
                        case 'png':
                            mimeType = 'image/png';
                            break;
                        case 'gif':
                            mimeType = 'image/gif';
                            break;
                        case 'bmp':
                            mimeType = 'image/bmp';
                            break;
                        case 'webp':
                            mimeType = 'image/webp';
                            break;
                        case 'svg':
                            mimeType = 'image/svg+xml';
                            break;
                        default:
                            mimeType = 'image/png';
                    }
                }
                
                const dataUrl = `data:${mimeType};base64,${imageBase64}`;
                const newReference = fullMatch.replace(imageUrl, dataUrl);
                
                processedSvg = processedSvg.replace(fullMatch, newReference);
                console.log(`    ✓ Embedded: ${imageUrl.substring(imageUrl.lastIndexOf('/') + 1)}`);
            } else {
                console.warn(`    ✗ Failed to download: ${imageUrl} (${imageResponse.status})`);
            }
            
        } catch (error) {
            console.warn(`    ✗ Error processing ${imageUrl}:`, error.message);
        }
    }
    
    console.log('    ✓ Image embedding completed');
    return processedSvg;
}

// Funkcja pomocnicza do konwersji Blob na Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Funkcja do zapisywania pliku z różnymi metodami fallback
async function saveFile(blob, filename) {
    console.log(`    Attempting to save file: ${filename}`);
    
    // Metoda 1: Użyj GM_download jeśli dostępne (najlepsze dla Greasemonkey)
    if (typeof GM_download !== 'undefined') {
        try {
            console.log('    Using GM_download method...');
            const dataUrl = await blobToDataUrl(blob);
            GM_download(dataUrl, filename);
            console.log('    ✓ File saved using GM_download');
            return true;
        } catch (e) {
            console.log('    ✗ GM_download failed:', e.message);
        }
    }
    
    // Metoda 2: Użyj FileSaver.js saveAs
    if (typeof saveAs !== 'undefined') {
        try {
            console.log('    Using FileSaver.js saveAs method...');
            saveAs(blob, filename);
            console.log('    ✓ File saved using saveAs');
            return true;
        } catch (e) {
            console.log('    ✗ saveAs failed:', e.message);
        }
    }
    
    // Metoda 3: Użyj standardowy download link
    try {
        console.log('    Using download link method...');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Cleanup URL po krótkim czasie
        setTimeout(() => {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {
                // Ignore cleanup errors
            }
        }, 1000);
        
        console.log('    ✓ File saved using download link');
        return true;
    } catch (e) {
        console.log('    ✗ Download link failed:', e.message);
    }
    
    // Metoda 4: Otwórz w nowej karcie jako ostatnia deska ratunku
    try {
        console.log('    Using new tab method (fallback)...');
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
            console.log('    ✓ File opened in new tab - save manually');
            return true;
        }
    } catch (e) {
        console.log('    ✗ New tab method failed:', e.message);
    }
    
    console.error('    ✗ All save methods failed!');
    return false;
}

// Pomocnicza funkcja do konwersji Blob na Data URL
function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Alternatywna metoda konwersji SVG na PNG używając zewnętrznego serwisu (fallback)
async function svgToPngFallback(svgText, filename) {
    console.log('    Using fallback method - saving as SVG with embedded images');
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
    return svgBlob;
}

async function svgToPng(svgText, width, height) {
    // Sprawdź czy Canvas jest dostępny
    if (!isCanvasSupported()) {
        console.warn('Canvas API not available, using fallback');
        return svgToPngFallback(svgText);
    }

    return new Promise((resolve, reject) => {
        // Sprawdź czy Canvas API jest dostępne
        let doc = document;
        if (!doc || typeof doc.createElement !== 'function') {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.document) {
                doc = unsafeWindow.document;
            } else {
                reject(new Error('Document API not available'));
                return;
            }
        }
        
        let canvas;
        try {
            canvas = doc.createElement('canvas');
            if (!canvas || typeof canvas.getContext !== 'function') {
                throw new Error('Canvas element not properly created');
            }
        } catch (e) {
            reject(new Error('Canvas creation failed: ' + e.message));
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('2D context not available'));
            return;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Białe tło
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Utwórz Image przez właściwy dokument
        const img = new (doc.defaultView || window).Image();
        
        // Zapisz oryginalną funkcję onload
        let originalOnLoad = null;
        
        img.onload = function() {
            try {
                // Skalowanie obrazu do formatu A4 z zachowaniem proporcji
                const scale = Math.min(width / img.width, height / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (width - scaledWidth) / 2;
                const y = (height - scaledHeight) / 2;
                
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                
                // Sprawdź czy toBlob jest dostępne
                if (typeof canvas.toBlob === 'function') {
                    canvas.toBlob(blob => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create blob from canvas'));
                        }
                    }, 'image/png');
                } else {
                    // Fallback - użyj toDataURL
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        const byteString = atob(dataUrl.split(',')[1]);
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        const blob = new Blob([ab], { type: 'image/png' });
                        resolve(blob);
                    } catch (e) {
                        reject(new Error('Failed to convert canvas to blob: ' + e.message));
                    }
                }
            } catch (e) {
                reject(new Error('Error drawing image: ' + e.message));
            }
        };
        
        img.onerror = function(e) {
            reject(new Error('Image load failed: ' + (e.message || 'Unknown error')));
        };
        
        try {
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            img.src = url;
            
            // Cleanup URL po timeout (na wypadek gdyby onload się nie wykonał)
            setTimeout(() => {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 10000);
        } catch (e) {
            reject(new Error('Failed to create SVG blob: ' + e.message));
        }
    });
}

// Funkcja do wyświetlenia dialogu konfiguracji
function showConfigDialog() {
    return new Promise((resolve) => {
        // Utwórz overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;

        // Utwórz dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            text-align: left;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        `;

        dialog.innerHTML = `
            <h2 style="margin-top: 0; color: #333; text-align: center; margin-bottom: 25px;">Konfiguracja pobierania</h2>
            
            <div style="margin-bottom: 20px;">
                <label for="project-id" style="display: block; margin-bottom: 8px; color: #555; font-weight: bold;">ID Projektu:</label>
                <input type="text" id="project-id" value="6217502" style="
                    width: 100%;
                    padding: 10px;
                    border: 2px solid #ddd;
                    border-radius: 5px;
                    font-size: 14px;
                    box-sizing: border-box;
                " placeholder="np. 6217502">
                <small style="color: #888; font-size: 12px;">ID projektu z URL (część po /product/)</small>
            </div>
            
            <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                <div style="flex: 1;">
                    <label for="page-min" style="display: block; margin-bottom: 8px; color: #555; font-weight: bold;">Strona od:</label>
                    <input type="number" id="page-min" value="1" min="1" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #ddd;
                        border-radius: 5px;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
                <div style="flex: 1;">
                    <label for="page-max" style="display: block; margin-bottom: 8px; color: #555; font-weight: bold;">Strona do:</label>
                    <input type="number" id="page-max" value="112" min="1" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #ddd;
                        border-radius: 5px;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 12px; color: #555; font-weight: bold;">Format plików:</label>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <label style="display: flex; align-items: center; cursor: pointer; padding: 10px; border: 2px solid #ddd; border-radius: 5px; background: #f9f9f9;">
                        <input type="radio" name="format" value="PNG" checked style="margin-right: 8px;">
                        <span style="font-weight: bold;">PNG</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; padding: 10px; border: 2px solid #ddd; border-radius: 5px; background: #f9f9f9;">
                        <input type="radio" name="format" value="SVG" style="margin-right: 8px;">
                        <span style="font-weight: bold;">SVG</span>
                    </label>
                </div>
                <small style="color: #888; font-size: 12px; display: block; text-align: center; margin-top: 8px;">
                    PNG - obrazy rastrowe (większe pliki) | SVG - grafika wektorowa (mniejsze pliki)
                </small>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                <button id="btn-start" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    min-width: 120px;
                    transition: all 0.3s ease;
                ">Rozpocznij</button>
                
                <button id="btn-cancel" style="
                    background: #f44336;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    min-width: 120px;
                    transition: all 0.3s ease;
                ">Anuluj</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Dodaj hover effects
        const buttons = dialog.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.opacity = '0.8';
                btn.style.transform = 'scale(1.05)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.opacity = '1';
                btn.style.transform = 'scale(1)';
            });
        });

        // Dodaj hover effects dla radio buttons
        const radioLabels = dialog.querySelectorAll('label:has(input[type="radio"])');
        radioLabels.forEach(label => {
            label.addEventListener('mouseenter', () => {
                label.style.borderColor = '#2196F3';
                label.style.background = '#e3f2fd';
            });
            label.addEventListener('mouseleave', () => {
                const radio = label.querySelector('input[type="radio"]');
                if (!radio.checked) {
                    label.style.borderColor = '#ddd';
                    label.style.background = '#f9f9f9';
                }
            });
        });

        // Obsługa zmiany radio button
        const radioButtons = dialog.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                radioLabels.forEach(label => {
                    const radioInLabel = label.querySelector('input[type="radio"]');
                    if (radioInLabel.checked) {
                        label.style.borderColor = '#2196F3';
                        label.style.background = '#e3f2fd';
                    } else {
                        label.style.borderColor = '#ddd';
                        label.style.background = '#f9f9f9';
                    }
                });
            });
        });

        // Ustaw początkowy stan dla zaznaczonego radio
        radioLabels.forEach(label => {
            const radio = label.querySelector('input[type="radio"]');
            if (radio.checked) {
                label.style.borderColor = '#2196F3';
                label.style.background = '#e3f2fd';
            }
        });

        // Obsługa przycisków
        document.getElementById('btn-start').addEventListener('click', () => {
            const projectId = document.getElementById('project-id').value.trim();
            const pageMin = parseInt(document.getElementById('page-min').value);
            const pageMax = parseInt(document.getElementById('page-max').value);
            const format = document.querySelector('input[name="format"]:checked').value;

            // Walidacja
            if (!projectId) {
                alert('Proszę podać ID projektu');
                return;
            }
            
            if (isNaN(pageMin) || isNaN(pageMax) || pageMin < 1 || pageMax < 1) {
                alert('Proszę podać prawidłowe numery stron (liczby większe od 0)');
                return;
            }
            
            if (pageMin > pageMax) {
                alert('Strona początkowa nie może być większa od końcowej');
                return;
            }

            document.body.removeChild(overlay);
            resolve({
                projectId: projectId,
                pageMin: pageMin,
                pageMax: pageMax,
                format: format
            });
        });

        document.getElementById('btn-cancel').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(null);
        });

        // Obsługa klawisza Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', escapeHandler);
                resolve(null);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Obsługa kliknięcia poza dialogiem
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve(null);
            }
        });
    });
}

async function test() {
    // Zapytaj użytkownika o konfigurację
    const config = await showConfigDialog();
    if (!config) {
        console.log('Pobieranie anulowane przez użytkownika');
        return;
    }
    
    console.log(`Konfiguracja:`, config);
    console.log(`Format: ${config.format}, Projekt: ${config.projectId}, Strony: ${config.pageMin}-${config.pageMax}`);
    
    // Wymiary A4 przy 300 DPI (8.27 x 11.69 cali = 2480 x 3508 pikseli)
    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    
    // Sprawdź dostępność różnych API na początku
    const canvasAvailable = isCanvasSupported();
    console.log('Canvas API available:', canvasAvailable);
    console.log('GM_download available:', typeof GM_download !== 'undefined');
    console.log('saveAs available:', typeof saveAs !== 'undefined');
    console.log('URL.createObjectURL available:', typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function');
    
    // Sprawdź czy wybrany format jest dostępny
    if (config.format === 'PNG' && !canvasAvailable) {
        const fallbackChoice = confirm('Canvas API nie jest dostępne - nie można konwertować do PNG.\nCzy chcesz kontynuować z formatem SVG?');
        if (!fallbackChoice) {
            console.log('Pobieranie anulowane - Canvas API niedostępne');
            return;
        }
        console.warn('Przełączanie na format SVG z powodu braku Canvas API');
        config.format = 'SVG';
    }

    const parts = [
        "https://neon.nowaera.pl/product/",
        "/ONLINE/assets/book/pages/",
        "/",
        ".svg"
    ];
    
    let successfulDownloads = 0;
    let totalAttempts = 0;
    
    let i;
    for(i = config.pageMin; i <= config.pageMax; i++) {
      	console.log('starting '+i);
        totalAttempts++;

        const url = parts[0]+config.projectId+parts[1]+i+parts[2]+i+parts[3];
        const useCanvas = (config.format === 'PNG' && canvasAvailable);
        const fileExtension = useCanvas ? ".png" : ".svg";
        const out = "saved_file_"+(("000" + i).slice (-4))+fileExtension;
    
        try {
            const response = await fetch(url, {
                "credentials": "include",
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "pl,en-US;q=0.7,en;q=0.3",
                    "Alt-Used": "neon.nowaera.pl",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Priority": "u=0, i",
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache"
                },
                "method": "GET"
            });
            
            const originalSvgText = await response.text();
            
            // Osadź zewnętrzne obrazy w SVG
            console.log('    embedding external images...');
            const svgTextWithEmbeddedImages = await embedImagesInSvg(originalSvgText, url);
            
            let blob;
            if (useCanvas) {
                console.log('    converting SVG to PNG for '+out);
                blob = await svgToPng(svgTextWithEmbeddedImages, A4_WIDTH, A4_HEIGHT);
            } else {
                console.log('    preparing SVG with embedded images for '+out);
                blob = await svgToPngFallback(svgTextWithEmbeddedImages, out);
            }
            
            // Sprawdź czy blob został utworzony poprawnie
            if (!blob) {
                console.error('    ✗ Blob creation failed for file', i);
                continue;
            }
            
            console.log(`    ✓ Blob created successfully (size: ${blob.size} bytes, type: ${blob.type})`);
            
            console.log('    saving '+out);
            const saveSuccess = await saveFile(blob, out);
            
            if (!saveSuccess) {
                console.error('    Failed to save file:', out);
            } else {
                successfulDownloads++;
            }
            
            // Krótka pauza między pobieraniami
            await new Promise(resolve => setTimeout(resolve, 1500)); // Zwiększ pauzę z powodu dodatkowych requestów
            
        } catch (error) {
            console.error('Error processing file '+i+':', error);
        }
    }
    
    console.log(`\n=== DOWNLOAD SUMMARY ===`);
    console.log(`Total attempts: ${totalAttempts}`);
    console.log(`Successful downloads: ${successfulDownloads}`);
    console.log(`Failed downloads: ${totalAttempts - successfulDownloads}`);
    
    if (successfulDownloads === 0) {
        console.log('\n🔧 TROUBLESHOOTING TIPS:');
        console.log('1. Check if pop-up blocker is enabled');
        console.log('2. Allow downloads from this domain');
        console.log('3. Check browser download settings');
        console.log('4. Try running script in different browser');
        console.log('5. Check console for specific error messages');
    }
       
}

// Funkcja sprawdzająca obecność iframe neon-visualizer-iframe
function checkForNeonIframe() {
    const iframe = document.getElementById('neon-visualizer-iframe');
    return iframe !== null;
}

// Funkcja oczekująca na załadowanie iframe
function waitForNeonIframe() {
    return new Promise((resolve) => {
        // Sprawdź czy iframe już istnieje
        if (checkForNeonIframe()) {
            console.log('Wykryto iframe neon-visualizer-iframe');
            resolve();
            return;
        }
        
        console.log('Oczekiwanie na załadowanie iframe neon-visualizer-iframe...');
        
        // Utwórz obserwator DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Sprawdź czy dodany został iframe o odpowiednim id
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Sprawdź czy to bezpośrednio iframe
                            if (node.id === 'neon-visualizer-iframe') {
                                console.log('Wykryto iframe neon-visualizer-iframe');
                                observer.disconnect();
                                resolve();
                                return;
                            }
                            // Sprawdź czy iframe jest wewnątrz dodanego elementu
                            const iframe = node.querySelector('#neon-visualizer-iframe');
                            if (iframe) {
                                console.log('Wykryto iframe neon-visualizer-iframe');
                                observer.disconnect();
                                resolve();
                                return;
                            }
                        }
                    });
                }
                
                // Sprawdź też czy nie zmieniono atrybutów (np. id)
                if (mutation.type === 'attributes' && mutation.attributeName === 'id') {
                    if (mutation.target.id === 'neon-visualizer-iframe') {
                        console.log('Wykryto iframe neon-visualizer-iframe (zmiana atrybutu)');
                        observer.disconnect();
                        resolve();
                        return;
                    }
                }
            });
        });
        
        // Rozpocznij obserwację całego dokumentu
        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['id']
        });
        
        // Sprawdzaj również co sekundę jako backup (na wypadek problemów z observerem)
        const intervalCheck = setInterval(() => {
            if (checkForNeonIframe()) {
                console.log('Wykryto iframe neon-visualizer-iframe (sprawdzenie okresowe)');
                observer.disconnect();
                clearInterval(intervalCheck);
                resolve();
            }
        }, 1000);
        
        // Timeout po 30 sekundach (opcjonalne)
        setTimeout(() => {
            observer.disconnect();
            clearInterval(intervalCheck);
            console.warn('Timeout - nie wykryto iframe neon-visualizer-iframe w ciągu 30 sekund');
            // Można zdecydować czy uruchomić skrypt mimo to, czy nie
            // W tym przypadku nie uruchamiamy
        }, 30000);
    });
}

// Główna funkcja inicjalizująca
async function initScript() {
    try {
        console.log('Oczekiwanie na iframe neon-visualizer-iframe...');
        await waitForNeonIframe();
        console.log('Iframe wykryty, uruchamianie skryptu...');
        await test();
    } catch (error) {
        console.error('Błąd podczas inicjalizacji skryptu:', error);
    }
}

// Uruchom skrypt po załadowaniu DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScript);
} else {
    initScript();
}
