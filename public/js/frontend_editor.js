console.log('Enhanced Frontend Editor JavaScript loaded');

class SimpleFrontendEditor {
    constructor() {
        this.files = {
            html: { 'index.html': '' },
            css: { 'style.css': '' },
            js: { 'script.js': '' }
        };
        this.assets = [];
        this.currentFile = 'index.html';
        this.currentFileType = 'html';
        this.isAuthenticated = false;
        this.baseUrl = window.location.origin;
        this.currentProjectId = null;
        this.pendingRename = null;
        this.init();
    }

    init() {
        console.log('Simple Editor Initialized');
        this.bindEvents();
        this.checkAuthStatus();
        this.loadFromLocalStorage();
        this.updatePreview();
        this.applyNightTheme();
        this.setupAssetUpload();
        this.setupRenameModal();
        
        // Initialize editors with content
        setTimeout(() => {
            this.updateEditorContent('html', 'index.html');
            this.updateEditorContent('css', 'style.css');
            this.updateEditorContent('js', 'script.js');
        }, 100);
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Auth button
        const authToggle = document.getElementById('auth-toggle');
        if (authToggle) {
            authToggle.addEventListener('click', () => this.handleAuthToggle());
        }

        // Editor listeners
        this.setupEditorListeners();

        // Save project
        const saveBtn = document.getElementById('save-project');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveProject());

        // Preview controls
        const refreshBtn = document.getElementById('refresh-preview');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.updatePreview());

        const fullscreenBtn = document.getElementById('fullscreen-preview');
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreenPreview());

        // Add My Projects button
        this.addProjectsButton();

        // File management events
        this.setupFileManagerEvents();
    }

    setupFileManagerEvents() {
        // Add new file buttons
        document.getElementById('add-html-file')?.addEventListener('click', () => this.addNewFile('html'));
        document.getElementById('add-css-file')?.addEventListener('click', () => this.addNewFile('css'));
        document.getElementById('add-js-file')?.addEventListener('click', () => this.addNewFile('js'));
        document.getElementById('upload-assets')?.addEventListener('click', () => this.triggerAssetUpload());

        // File selection
        document.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-tree-item');
            if (fileItem && !e.target.classList.contains('btn-rename') && !e.target.classList.contains('btn-delete')) {
                const type = fileItem.dataset.type;
                const filename = fileItem.dataset.filename;
                this.selectFile(type, filename);
            }
        });

        // File rename
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-rename')) {
                const fileItem = e.target.closest('.file-tree-item');
                this.showRenameModal(fileItem);
            }
        });

        // File delete
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete')) {
                const fileItem = e.target.closest('.file-tree-item');
                this.deleteFile(fileItem);
            }
        });
    }

    setupRenameModal() {
        const modal = document.getElementById('rename-modal');
        const input = document.getElementById('rename-input');
        const cancelBtn = document.getElementById('rename-cancel');
        const confirmBtn = document.getElementById('rename-confirm');

        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            this.pendingRename = null;
        });

        confirmBtn.addEventListener('click', () => {
            if (this.pendingRename && input.value) {
                this.renameFile(this.pendingRename, input.value);
                modal.style.display = 'none';
                this.pendingRename = null;
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display !== 'none') {
                modal.style.display = 'none';
                this.pendingRename = null;
            }
        });
    }

    showRenameModal(fileItem) {
        const modal = document.getElementById('rename-modal');
        const input = document.getElementById('rename-input');
        
        input.value = fileItem.dataset.filename;
        this.pendingRename = fileItem;
        modal.style.display = 'flex';
        
        setTimeout(() => input.focus(), 100);
    }

    addProjectsButton() {
        const showProjectsBtn = document.createElement('button');
        showProjectsBtn.id = 'show-projects';
        showProjectsBtn.className = 'btn btn-secondary';
        showProjectsBtn.innerHTML = '📁 My Projects';
        showProjectsBtn.addEventListener('click', () => this.showProjects());

        const headerRight = document.querySelector('.header-right');
        if (headerRight) {
            const saveBtn = document.getElementById('save-project');
            if (saveBtn) {
                headerRight.insertBefore(showProjectsBtn, saveBtn.nextSibling);
            }
        }
    }

    setupEditorListeners() {
        const debounce = (func, delay) => {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => func(...args), delay);
            };
        };

        const debouncedSave = debounce(() => this.saveToLocalStorage(), 1000);
        const debouncedPreview = debounce(() => this.updatePreview(), 500);

        const htmlEditor = document.getElementById('html-editor');
        const cssEditor = document.getElementById('css-editor');
        const jsEditor = document.getElementById('js-editor');

        if (htmlEditor) {
            htmlEditor.addEventListener('input', (e) => {
                if (this.currentFileType === 'html' && this.currentFile) {
                    this.files.html[this.currentFile] = e.target.value;
                    debouncedSave();
                    debouncedPreview();
                }
            });
        }

        if (cssEditor) {
            cssEditor.addEventListener('input', (e) => {
                if (this.currentFileType === 'css' && this.currentFile) {
                    this.files.css[this.currentFile] = e.target.value;
                    debouncedSave();
                    debouncedPreview();
                }
            });
        }

        if (jsEditor) {
            jsEditor.addEventListener('input', (e) => {
                if (this.currentFileType === 'js' && this.currentFile) {
                    this.files.js[this.currentFile] = e.target.value;
                    debouncedSave();
                    debouncedPreview();
                }
            });
        }
    }

    setupAssetUpload() {
        const uploadInput = document.getElementById('asset-upload');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => this.handleAssetUpload(e));
        }
    }

    triggerAssetUpload() {
        document.getElementById('asset-upload').click();
    }

    async handleAssetUpload(event) {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        let uploadedCount = 0;
        
        for (const file of files) {
            try {
                // Check file size (limit to 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    this.showNotification(`File ${file.name} is too large (max 5MB)`, 'error');
                    continue;
                }

                // Convert file to base64
                const base64 = await this.fileToBase64(file);
                
                this.assets.push({
                    id: Date.now() + Math.random(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64,
                    url: URL.createObjectURL(file)
                });

                this.displayAsset(file);
                uploadedCount++;
                
            } catch (error) {
                console.error('Error uploading asset:', error);
                this.showNotification(`Failed to upload ${file.name}`, 'error');
            }
        }

        if (uploadedCount > 0) {
            this.saveToLocalStorage();
            this.showNotification(`Uploaded ${uploadedCount} asset(s) successfully`);
        }

        // Reset input
        event.target.value = '';
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    displayAsset(file) {
        const assetsList = document.getElementById('assets-list');
        if (!assetsList) return;

        const asset = this.assets.find(a => a.name === file.name);
        if (!asset) return;

        const assetItem = document.createElement('div');
        assetItem.className = 'asset-item';
        assetItem.dataset.assetId = asset.id;
        
        let previewHTML = '';
        if (file.type.startsWith('image/')) {
            previewHTML = `<img src="${asset.data}" alt="${file.name}" class="asset-preview">`;
        } else if (file.type.startsWith('audio/')) {
            previewHTML = `<audio controls src="${asset.data}" style="width:100%; max-height: 40px;"></audio>`;
        } else if (file.type.startsWith('video/')) {
            previewHTML = `<video controls src="${asset.data}" style="width:100%; max-height: 80px;"></video>`;
        }

        assetItem.innerHTML = `
            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <strong style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</strong>
                    <span style="font-size: 11px; opacity: 0.7;">(${this.formatFileSize(file.size)})</span>
                </div>
                ${previewHTML}
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn-copy-asset" title="Copy asset URL" data-url="${asset.data}">📋</button>
                <button class="btn-delete-asset" title="Delete asset" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px;">🗑️</button>
            </div>
        `;

        assetsList.appendChild(assetItem);

        // Add event listeners
        assetItem.querySelector('.btn-copy-asset')?.addEventListener('click', (e) => {
            const url = e.target.dataset.url;
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification(`Asset URL copied! Use: src="${file.name}"`);
            });
        });

        assetItem.querySelector('.btn-delete-asset')?.addEventListener('click', (e) => {
            const assetId = assetItem.dataset.assetId;
            this.deleteAsset(assetId, assetItem);
        });
    }

    deleteAsset(assetId, assetElement) {
        if (!confirm('Delete this asset?')) return;

        this.assets = this.assets.filter(a => a.id != assetId);
        assetElement.remove();
        this.saveToLocalStorage();
        this.showNotification('Asset deleted');
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('simpleEditorData');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Load files
                if (data.files) {
                    this.files = data.files;
                    
                    // Clear existing file tree (except default files)
                    const fileTree = document.querySelector('.file-tree');
                    if (fileTree) {
                        const defaultFiles = ['index.html', 'style.css', 'script.js'];
                        const existingItems = Array.from(fileTree.querySelectorAll('.file-tree-item'));
                        
                        existingItems.forEach(item => {
                            const filename = item.dataset.filename;
                            if (!defaultFiles.includes(filename)) {
                                item.remove();
                            }
                        });
                        
                        // Add all files from storage
                        Object.entries(this.files).forEach(([type, fileList]) => {
                            Object.keys(fileList).forEach(filename => {
                                if (!defaultFiles.includes(filename)) {
                                    this.addFileToTree(type, filename);
                                }
                            });
                        });
                    }
                }
                
                // Load assets
                if (data.assets) {
                    this.assets = data.assets;
                    const assetsList = document.getElementById('assets-list');
                    if (assetsList) {
                        assetsList.innerHTML = '';
                        this.assets.forEach(asset => {
                            // Create a dummy file object for display
                            const dummyFile = new File([], asset.name, { type: asset.type });
                            Object.defineProperty(dummyFile, 'size', { value: asset.size });
                            this.displayAsset(dummyFile);
                        });
                    }
                }
                
                // Select last active file
                if (data.currentFile) {
                    // Find the type of the current file
                    let fileType = null;
                    for (const [type, fileList] of Object.entries(this.files)) {
                        if (fileList[data.currentFile]) {
                            fileType = type;
                            break;
                        }
                    }
                    if (fileType) {
                        this.selectFile(fileType, data.currentFile);
                    } else {
                        this.selectFile('html', 'index.html');
                    }
                } else {
                    this.selectFile('html', 'index.html');
                }
                
                console.log('Loaded from localStorage');
            }
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
        }
    }

    saveToLocalStorage() {
        try {
            const data = {
                files: this.files,
                assets: this.assets,
                currentFile: this.currentFile,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('simpleEditorData', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    addNewFile(type) {
        const defaultNames = {
            html: 'new-page.html',
            css: 'styles.css',
            js: 'app.js'
        };
        
        const filename = prompt(`Enter ${type.toUpperCase()} filename:`, defaultNames[type]);
        if (!filename) return;

        // Validate filename
        const validExtensions = {
            html: ['.html', '.htm'],
            css: ['.css'],
            js: ['.js', '.mjs']
        };

        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        if (!validExtensions[type].includes(ext)) {
            alert(`Invalid extension for ${type} file. Use: ${validExtensions[type].join(', ')}`);
            return;
        }

        // Check if file already exists
        if (this.files[type][filename]) {
            alert('File already exists!');
            return;
        }

        // Default content based on type
        let defaultContent = '';
        switch(type) {
            case 'html':
                defaultContent = `<!DOCTYPE html>
<html>
<head>
    <title>${filename.replace('.html', '')}</title>
</head>
<body>
    <h1>${filename.replace('.html', '')}</h1>
</body>
</html>`;
                break;
            case 'css':
                defaultContent = `/* ${filename} */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}`;
                break;
            case 'js':
                defaultContent = `// ${filename}
console.log('${filename} loaded');

function init() {
    console.log('Initializing...');
}`;
                break;
        }

        // Add to files object
        this.files[type][filename] = defaultContent;

        // Add to file tree
        this.addFileToTree(type, filename);
        
        // Select the new file
        this.selectFile(type, filename);
        
        // Save to localStorage
        this.saveToLocalStorage();
        
        this.showNotification(`Created ${filename}`);
    }

    addFileToTree(type, filename) {
        const fileTree = document.querySelector('.file-tree');
        if (!fileTree) return;

        // Check if already exists
        const existing = fileTree.querySelector(`[data-filename="${filename}"]`);
        if (existing) return;

        const fileItem = document.createElement('div');
        fileItem.className = 'file-tree-item';
        fileItem.dataset.type = type;
        fileItem.dataset.filename = filename;
        fileItem.innerHTML = `
            📄 ${filename}
            <span class="file-actions">
                <button class="btn-rename" title="Rename">✏️</button>
                <button class="btn-delete" title="Delete">🗑️</button>
            </span>
        `;

        fileTree.appendChild(fileItem);
    }

    selectFile(type, filename) {
        // Update current file
        this.currentFile = filename;
        this.currentFileType = type;

        // Update UI
        document.querySelectorAll('.file-tree-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`.file-tree-item[data-filename="${filename}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Update editor content
        this.updateEditorContent(type, filename);
        
        // Switch to appropriate tab
        this.switchTab(type);
        
        // Save to localStorage
        this.saveToLocalStorage();
    }

    updateEditorContent(type, filename) {
        const content = this.files[type][filename] || '';
        let editorId;
        
        switch(type) {
            case 'html':
                editorId = 'html-editor';
                break;
            case 'css':
                editorId = 'css-editor';
                break;
            case 'js':
                editorId = 'js-editor';
                break;
        }

        const editor = document.getElementById(editorId);
        if (editor) {
            editor.value = content;
            
            // Dispatch input event to trigger listeners
            setTimeout(() => {
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            }, 0);
        }
    }

    renameFile(fileItem, newName) {
        const oldType = fileItem.dataset.type;
        const oldName = fileItem.dataset.filename;
        
        if (!newName || newName === oldName) return;

        // Validate extension
        const validExtensions = {
            html: ['.html', '.htm'],
            css: ['.css'],
            js: ['.js', '.mjs']
        };

        const ext = newName.substring(newName.lastIndexOf('.')).toLowerCase();
        if (!validExtensions[oldType].includes(ext)) {
            alert(`Invalid extension for ${oldType} file. Use: ${validExtensions[oldType].join(', ')}`);
            return;
        }

        // Check if new name already exists
        if (this.files[oldType][newName]) {
            alert('Filename already exists!');
            return;
        }

        // Rename in files object
        this.files[oldType][newName] = this.files[oldType][oldName];
        delete this.files[oldType][oldName];

        // Update UI
        fileItem.dataset.filename = newName;
        fileItem.querySelector(':first-child').textContent = `📄 ${newName}`;

        // If it's the current file, update currentFile
        if (this.currentFile === oldName) {
            this.currentFile = newName;
        }

        this.saveToLocalStorage();
        this.showNotification(`Renamed to ${newName}`);
    }

    deleteFile(fileItem) {
        const type = fileItem.dataset.type;
        const filename = fileItem.dataset.filename;
        
        // Don't allow deleting index.html
        if (type === 'html' && filename === 'index.html') {
            alert('Cannot delete index.html - it\'s the main file!');
            return;
        }

        if (!confirm(`Delete ${filename}?`)) return;

        // Remove from files object
        delete this.files[type][filename];

        // Remove from UI
        fileItem.remove();

        // If deleted file was current, switch to index.html
        if (this.currentFile === filename) {
            this.selectFile('html', 'index.html');
        }

        this.saveToLocalStorage();
        this.updatePreview();
        this.showNotification(`Deleted ${filename}`);
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.tab === tabName)
        );
        document.querySelectorAll('.tab-content').forEach(tab =>
            tab.classList.toggle('active', tab.id === `${tabName}-tab`)
        );
        if (tabName === 'preview') this.updatePreview();
    }

    toggleTheme() {
        const body = document.body;
        body.classList.toggle('night-mode');
        const isNightMode = body.classList.contains('night-mode');
        localStorage.setItem('editorTheme', isNightMode ? 'night' : 'light');

        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.innerHTML = isNightMode ? '☀️ Light Mode' : '🌙 Night Mode';
        }
    }

    applyNightTheme() {
        const savedTheme = localStorage.getItem('editorTheme') || 'night';
        const body = document.body;
        if (savedTheme === 'night') {
            body.classList.add('night-mode');
            const themeBtn = document.getElementById('theme-toggle');
            if (themeBtn) themeBtn.innerHTML = '☀️ Light Mode';
        }
    }

    generateHTML() {
        const projectName = document.getElementById('project-name')?.value || 'My Project';
        
        // Get all CSS files combined
        let allCSS = '';
        Object.values(this.files.css || {}).forEach(cssContent => {
            allCSS += cssContent + '\n';
        });

        // Get all JS files combined
        let allJS = '';
        Object.values(this.files.js || {}).forEach(jsContent => {
            allJS += jsContent + '\n';
        });

        // Auto-wrap JavaScript
        const processedJS = this.autoWrapJavaScript(allJS);

        // Get main HTML file
        const mainHTML = this.files.html?.['index.html'] || 
                        this.files.html?.[Object.keys(this.files.html || {})[0]] || '';

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <style>
        ${allCSS}
    </style>
</head>
<body>
    ${mainHTML}
    
    <!-- Asset references -->
    ${this.assets.map(asset => 
        asset.type.startsWith('image/') ? 
        `<img src="${asset.data}" alt="${asset.name}" style="display:none;">` : 
        ''
    ).join('\n')}
    
    <script>
        // UNIVERSAL PREVIEW - AUTO-WRAPPED
        (function() {
            try {
                // User's original code
                ${allJS}
                
                // Auto-wrapped version
                ${processedJS}
            } catch(error) {
                console.error('JavaScript error:', error);
            }
            
            // Universal event handler
            document.addEventListener('click', function(e) {
                if (e.target.hasAttribute('onclick')) {
                    try {
                        eval(e.target.getAttribute('onclick'));
                    } catch(err) {
                        console.error('onclick error:', err);
                    }
                }
            });
            
            // Initialize assets
            window.assets = ${JSON.stringify(this.assets)};
        })();
        
        console.log('Preview loaded with ${Object.keys(this.files.html || {}).length} HTML files');
    </script>
</body>
</html>`;
    }

    updatePreview() {
        try {
            const html = this.generateHTML();
            const frame = document.getElementById('preview-frame');
            if (frame) {
                frame.srcdoc = html;
            }
        } catch (error) {
            console.error('Preview update error:', error);
            const frame = document.getElementById('preview-frame');
            if (frame) {
                frame.srcdoc = `<h1 style="color: red;">Preview Error</h1><p>${error.message}</p>`;
            }
        }
    }

    generateDeploymentHTML() {
        const projectName = document.getElementById('project-name')?.value || 'My Project';
        
        // Combine all CSS
        let allCSS = '';
        if (this.files.css) {
            Object.values(this.files.css).forEach(cssContent => {
                allCSS += cssContent + '\n';
            });
        }

        // Combine all JS
        let allJS = '';
        if (this.files.js) {
            Object.values(this.files.js).forEach(jsContent => {
                allJS += jsContent + '\n';
            });
        }

        // Process JS for global access
        const processedJS = this.autoWrapJavaScript(allJS);

        // Get main HTML
        const mainHTML = this.files.html?.['index.html'] || 
                        this.files.html?.[Object.keys(this.files.html || {})[0]] || '';

        // Generate asset references
        const assetRefs = this.generateAssetReferences();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <style>
        ${allCSS}
    </style>
</head>
<body>
    ${mainHTML}
    ${assetRefs}
    
    <script>
        // AUTO-WRAPPED JAVASCRIPT
        (function() {
            // User's original code
            try {
                ${allJS}
            } catch(error) {
                console.error('User code error:', error);
            }
            
            // Processed version with auto-wrapped functions
            ${processedJS}
        })();
        
        // Asset management
        window.projectAssets = ${JSON.stringify(this.assets)};
        
        // Universal event handler
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Project "${projectName}" loaded successfully');
            
            // Handle all onclick events
            document.addEventListener('click', function(e) {
                if (e.target.hasAttribute('onclick')) {
                    try {
                        eval(e.target.getAttribute('onclick'));
                    } catch(error) {
                        console.error('onclick error:', error);
                    }
                }
            });
            
            // Auto-initialize
            if (typeof window.init === 'function') window.init();
            if (typeof window.main === 'function') window.main();
        });
    </script>
</body>
</html>`;
    }

    generateAssetReferences() {
        return this.assets.map(asset => {
            if (asset.type.startsWith('image/')) {
                return `<img src="${asset.data}" alt="${asset.name}" style="display:none;" id="asset-${asset.name.replace(/[^a-z0-9]/gi, '-')}">`;
            } else if (asset.type.startsWith('audio/')) {
                return `<audio src="${asset.data}" controls style="display:none;" id="asset-${asset.name.replace(/[^a-z0-9]/gi, '-')}"></audio>`;
            } else if (asset.type.startsWith('video/')) {
                return `<video src="${asset.data}" controls style="display:none;" id="asset-${asset.name.replace(/[^a-z0-9]/gi, '-')}"></video>`;
            }
            return '';
        }).join('\n');
    }

    autoWrapJavaScript(js) {
        if (!js.trim()) return js;

        console.log('Auto-wrapping JavaScript for global access...');

        let processed = js;

        // 1. Convert regular function declarations to window assignments
        processed = processed.replace(
            /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g,
            (match, funcName, params) => {
                console.log(`Auto-wrapping function: ${funcName}`);
                return `window.${funcName} = function(${params}) {`;
            }
        );

        // 2. Convert const/let/var function assignments
        processed = processed.replace(
            /(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?(?:function\s*\(([^)]*)\)|\(([^)]*)\)\s*=>)\s*\{/g,
            (match, declaration, funcName, funcParams, arrowParams) => {
                console.log(`Auto-wrapping variable function: ${funcName}`);
                const params = funcParams || arrowParams || '';
                return `${declaration} ${funcName} = function(${params}) { window.${funcName} = ${funcName};`;
            }
        );

        // 3. Extract function names for additional window assignments
        const functionNames = this.extractAllFunctionNames(js);

        // Add window assignments for all detected functions
        if (functionNames.length > 0) {
            console.log(`Found functions to make global: ${functionNames.join(', ')}`);

            const windowAssignments = functionNames.map(funcName =>
                `if (typeof ${funcName} === 'function' && !window.${funcName}) window.${funcName} = ${funcName};`
            ).join('\n');

            processed = windowAssignments + '\n' + processed;
        }

        return processed;
    }

    extractAllFunctionNames(js) {
        const functionNames = new Set();

        // Regular function declarations
        const funcRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
        let match;
        while ((match = funcRegex.exec(js)) !== null) {
            functionNames.add(match[1]);
        }

        // Arrow functions assigned to variables
        const arrowRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
        while ((match = arrowRegex.exec(js)) !== null) {
            functionNames.add(match[1]);
        }

        // Function expressions
        const exprRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function/g;
        while ((match = exprRegex.exec(js)) !== null) {
            functionNames.add(match[1]);
        }

        // Method assignments
        const methodRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*function/g;
        while ((match = methodRegex.exec(js)) !== null) {
            functionNames.add(match[1]);
        }

        console.log(`Extracted function names: ${Array.from(functionNames)}`);
        return Array.from(functionNames);
    }

    toggleFullscreenPreview() {
        const previewFrame = document.getElementById('preview-frame');
        if (!previewFrame) return;

        if (!document.fullscreenElement) {
            const container = previewFrame.parentElement;
            if (container) {
                container.classList.add('preview-fullscreen');
                previewFrame.requestFullscreen?.();
            }
        } else {
            document.exitFullscreen?.();
            const container = previewFrame.parentElement;
            if (container) {
                container.classList.remove('preview-fullscreen');
            }
        }
    }

    async saveProject() {
        const token = Cookies.get('token');
        if (!token) {
            alert('Please login to save your project');
            return;
        }

        const saveBtn = document.getElementById('save-project');
        const originalText = saveBtn ? saveBtn.innerHTML : 'Save';

        // Add saving state
        if (saveBtn) {
            saveBtn.innerHTML = '💾 Saving...';
            saveBtn.classList.add('saving');
            saveBtn.disabled = true;
        }

        const projectName = document.getElementById('project-name')?.value.trim() || 'Untitled Project';

        try {
            // Generate deployment HTML
            const deploymentHTML = this.generateDeploymentHTML();

            const response = await fetch('/api/frontend/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: projectName,
                    files: this.files,
                    assets: this.assets,
                    deploymentHTML: deploymentHTML
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentProjectId = result.projectId;
                const shareUrl = result.shareUrl;
                navigator.clipboard.writeText(shareUrl).then(() => {
                    this.showSuccessNotification(shareUrl);
                });

                if (saveBtn) {
                    saveBtn.innerHTML = '✅ Saved!';
                    setTimeout(() => {
                        saveBtn.innerHTML = originalText;
                    }, 2000);
                }
            } else {
                alert('Failed to save project: ' + result.error);
                if (saveBtn) saveBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error saving project. Please try again.');
            if (saveBtn) {
                saveBtn.innerHTML = '❌ Failed';
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                }, 2000);
            }
        } finally {
            if (saveBtn) {
                saveBtn.classList.remove('saving');
                saveBtn.disabled = false;
            }
        }
    }

    showSuccessNotification(url) {
        const n = document.getElementById('success-notification');
        if (n) {
            n.innerHTML = `<span>✓</span> Project saved! Share URL: <a href="${url}" target="_blank" style="color: white; text-decoration: underline;">${url}</a>`;
            n.style.display = 'flex';
            setTimeout(() => (n.style.display = 'none'), 5000);
        }
    }

    showNotification(message, type = 'success') {
        const box = document.createElement('div');
        box.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: #fff;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 20000;
            box-shadow: 0 10px 25px rgba(0,0,0,.2);
            animation: slideInRight 0.3s ease;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,.1);
            max-width: 400px;
            word-wrap: break-word;
        `;
        box.textContent = message;
        document.body.appendChild(box);

        setTimeout(() => {
            box.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => box.remove(), 300);
        }, 3000);
    }

    async checkAuthStatus() {
        const token = Cookies.get('token');
        const authToggle = document.getElementById('auth-toggle');

        if (!token) {
            this.setAuthState(false);
            return;
        }

        try {
            if (authToggle) {
                authToggle.innerHTML = '⏳ Checking...';
                authToggle.className = 'btn btn-auth-loading';
                authToggle.disabled = true;
            }

            const response = await fetch('/verify-token', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) this.setAuthState(true);
            else {
                Cookies.remove('token');
                this.setAuthState(false);
            }

        } catch (err) {
            console.error('Auth check failed:', err);
            Cookies.remove('token');
            this.setAuthState(false);
        } finally {
            if (authToggle) authToggle.disabled = false;
        }
    }

    setAuthState(isAuthenticated) {
        this.isAuthenticated = isAuthenticated;
        const btn = document.getElementById('auth-toggle');
        if (!btn) return;

        if (isAuthenticated) {
            btn.innerHTML = '🚪 Logout';
            btn.className = 'btn btn-logout';
        } else {
            btn.innerHTML = '🔐 Login';
            btn.className = 'btn btn-login';
        }
    }

    async handleAuthToggle() {
        if (this.isAuthenticated) {
            await this.logout();
        } else {
            this.login();
        }
    }

    login() {
        const currentUrl = window.location.pathname + window.location.search;
        window.location.href = `/login.html?redirect=${encodeURIComponent(currentUrl)}`;
    }

    async logout() {
        const token = Cookies.get('token');
        const authToggle = document.getElementById('auth-toggle');

        if (authToggle) {
            authToggle.innerHTML = '⏳ Logging out...';
            authToggle.className = 'btn btn-auth-loading';
            authToggle.disabled = true;
        }

        try {
            if (token) {
                await fetch('/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            Cookies.remove('token');
            this.setAuthState(false);
            this.showNotification('Logged out successfully!');

            setTimeout(() => window.location.reload(), 800);

        } catch (err) {
            console.error('Logout error:', err);
            Cookies.remove('token');
            this.setAuthState(false);
            this.showNotification('Logged out successfully!');
            setTimeout(() => window.location.reload(), 800);
        } finally {
            if (authToggle) authToggle.disabled = false;
        }
    }

    async showProjects() {
        const token = Cookies.get('token');
        if (!token) {
            alert('Please login to view your projects');
            return;
        }

        try {
            const response = await fetch('/api/frontend/projects', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load projects');
            }

            const projects = await response.json();
            this.displayProjectsModal(projects);
        } catch (error) {
            console.error('Error loading projects:', error);
            alert('Error loading projects: ' + error.message);
        }
    }

    displayProjectsModal(projects) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'projects-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--dark-bg, #1e1e1e);
            color: var(--text-color, #e0e0e0);
            padding: 30px;
            border-radius: 15px;
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-color, #444);
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">My Projects</h2>
                <button id="close-projects" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;">×</button>
            </div>
            <div id="projects-list" style="display: grid; gap: 15px;">
                ${projects.length === 0 ?
                '<p style="text-align: center; color: #888; padding: 40px;">No projects found. Create your first project!</p>' :
                projects.map(project => `
                        <div class="project-card" style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 20px; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h3 style="margin: 0 0 10px 0; color: #fff;">${this.escapeHtml(project.name)}</h3>
                                    <p style="margin: 0; color: #aaa; font-size: 14px;">
                                        Created: ${new Date(project.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button class="btn-open" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;" 
                                            onclick="frontendEditor.openProject('${project.id}')">Open</button>
                                    <button class="btn-delete" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;"
                                            onclick="frontendEditor.deleteProject('${project.id}', '${this.escapeHtml(project.name)}')">Delete</button>
                                </div>
                            </div>
                            <div style="margin-top: 15px;">
                                <p style="margin: 5px 0; font-size: 13px; color: #888;">
                                    <strong>Share URL:</strong> <a href="${project.shareUrl}" target="_blank" style="color: #3b82f6; text-decoration: none;">${project.shareUrl}</a>
                                </p>
                            </div>
                        </div>
                    `).join('')}
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close modal events
        const closeBtn = modalContent.querySelector('#close-projects');
        closeBtn.addEventListener('click', () => modal.remove());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Escape key to close
        document.addEventListener('keydown', function closeModalOnEsc(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeModalOnEsc);
            }
        });
    }

    async openProject(projectId) {
        try {
            const token = Cookies.get('token');
            const response = await fetch(`/api/frontend/project/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load project');
            }

            const project = await response.json();

            // Load project data
            document.getElementById('project-name').value = project.name;

            // Load files
            this.files = project.files || { html: {}, css: {}, js: {} };
            
            // Clear and rebuild file tree
            const fileTree = document.querySelector('.file-tree');
            if (fileTree) {
                fileTree.innerHTML = '';
                
                // Add all HTML files
                Object.keys(this.files.html || {}).forEach(filename => {
                    this.addFileToTree('html', filename);
                });
                
                // Add all CSS files
                Object.keys(this.files.css || {}).forEach(filename => {
                    this.addFileToTree('css', filename);
                });
                
                // Add all JS files
                Object.keys(this.files.js || {}).forEach(filename => {
                    this.addFileToTree('js', filename);
                });
            }

            // Load assets
            this.assets = project.assets || [];
            const assetsList = document.getElementById('assets-list');
            if (assetsList) {
                assetsList.innerHTML = '';
                this.assets.forEach(asset => {
                    const dummyFile = new File([], asset.name, { type: asset.type });
                    Object.defineProperty(dummyFile, 'size', { value: asset.size });
                    this.displayAsset(dummyFile);
                });
            }

            // Select first HTML file
            const htmlFiles = Object.keys(this.files.html || {});
            if (htmlFiles.length > 0) {
                this.selectFile('html', htmlFiles[0]);
            } else if (Object.keys(this.files.css || {}).length > 0) {
                const cssFiles = Object.keys(this.files.css || {});
                this.selectFile('css', cssFiles[0]);
            } else if (Object.keys(this.files.js || {}).length > 0) {
                const jsFiles = Object.keys(this.files.js || {});
                this.selectFile('js', jsFiles[0]);
            }

            // Save to localStorage
            this.saveToLocalStorage();

            // Close projects modal
            document.querySelector('.projects-modal')?.remove();

            this.showNotification('Project loaded successfully!');

        } catch (error) {
            console.error('Error opening project:', error);
            alert('Error opening project: ' + error.message);
        }
    }

    async deleteProject(projectId, projectName) {
        if (!confirm(`Are you sure you want to delete "${projectName}"?`)) {
            return;
        }

        try {
            const token = Cookies.get('token');
            const response = await fetch(`/api/frontend/project/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete project');
            }

            // Remove from UI
            const projectCard = document.querySelector(`[onclick*="${projectId}"]`)?.closest('.project-card');
            if (projectCard) {
                projectCard.remove();
            }

            // If no projects left, show message
            const projectsList = document.getElementById('projects-list');
            if (projectsList && projectsList.children.length === 0) {
                projectsList.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No projects found. Create your first project!</p>';
            }

            this.showNotification('Project deleted successfully!');

        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Error deleting project: ' + error.message);
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize editor
document.addEventListener('DOMContentLoaded', () => {
    window.frontendEditor = new SimpleFrontendEditor();
});