console.log('Enhanced Frontend Editor JavaScript loaded');

class EnhancedFrontendEditor {
    constructor() {
        this.currentProject = null;
        this.files = {
            html: { 'index.html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>My Project</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>' },
            css: { 'style.css': 'body { font-family: Arial, sans-serif; }' },
            js: { 'script.js': 'console.log("Hello World!");' }
        };
        this.assets = [];
        this.currentFile = {
            html: 'index.html',
            css: 'style.css',
            js: 'script.js'
        };
        this.isAuthenticated = false;
        this.init();
    }

    saveAssetsToLocalStorage() {
        try {
            localStorage.setItem('frontendEditor_assets', JSON.stringify(this.assets));
        } catch (error) {
            console.warn('Could not save assets to localStorage:', error);
        }
    }

    debugProjectState() {
        console.log('=== PROJECT DEBUG INFO ===');
        console.log('Current files:', this.files);
        console.log('Current assets:', this.assets);
        console.log('HTML files:', Object.keys(this.files.html));
        console.log('CSS files:', Object.keys(this.files.css));
        console.log('JS files:', Object.keys(this.files.js));
        console.log('Current file selections:', this.currentFile);
        console.log('========================');
    }

    loadAssetsFromLocalStorage() {
        try {
            const savedAssets = localStorage.getItem('frontendEditor_assets');
            if (savedAssets) {
                const parsed = JSON.parse(savedAssets);
                // Filter out any corrupted assets
                this.assets = Array.isArray(parsed) ? parsed.filter(asset =>
                    asset && asset.name && asset.data
                ) : [];
                console.log('Loaded assets from localStorage:', this.assets.length);
            }
        } catch (error) {
            console.warn('Could not load assets from localStorage:', error);
            this.assets = []; // Reset to empty array on error
        }
    }

    init() {
        this.bindEvents();
        this.updateFileTree();
        this.loadAssetsFromLocalStorage(); // Load assets first
        this.updatePreview();
        this.checkAuthStatus();
        this.setupAutoSave();

        // Ensure assets are displayed if assets manager is open
        setTimeout(() => {
            const assetsModal = document.getElementById('assets-modal');
            if (assetsModal && assetsModal.style.display === 'block') {
                this.renderAssetsList();
            }
        }, 100);
    }

    /* ----------------------------------------------------
       EVENT BINDING
    ---------------------------------------------------- */
    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // AUTH BUTTON (NEW)
        const authToggleEl = document.getElementById('auth-toggle');
        if (authToggleEl) {
            authToggleEl.addEventListener('click', () => this.handleAuthToggle());
        }

        // File selectors
        const htmlSelector = document.getElementById('html-file-selector');
        if (htmlSelector) {
            htmlSelector.addEventListener('change', (e) => {
                this.currentFile.html = e.target.value;
                this.loadFileContent('html', e.target.value);
            });
        }

        const cssSelector = document.getElementById('css-file-selector');
        if (cssSelector) {
            cssSelector.addEventListener('change', (e) => {
                this.currentFile.css = e.target.value;
                this.loadFileContent('css', e.target.value);
            });
        }

        const jsSelector = document.getElementById('js-file-selector');
        if (jsSelector) {
            jsSelector.addEventListener('change', (e) => {
                this.currentFile.js = e.target.value;
                this.loadFileContent('js', e.target.value);
            });
        }

        this.setupEditorListeners();

        const saveProjectBtn = document.getElementById('save-project');
        if (saveProjectBtn) saveProjectBtn.addEventListener('click', () => this.saveProject());

        const showProjectsBtn = document.getElementById('show-projects');
        if (showProjectsBtn) showProjectsBtn.addEventListener('click', () => this.showProjects());

        const assetsManagerBtn = document.getElementById('assets-manager');
        if (assetsManagerBtn) assetsManagerBtn.addEventListener('click', () => this.showAssetsManager());

        // Add the new file-add buttons (Option A: sidebar)
        const addHtmlBtn = document.getElementById('add-html-file');
        if (addHtmlBtn) addHtmlBtn.addEventListener('click', () => this.addFile('html'));

        const addCssBtn = document.getElementById('add-css-file');
        if (addCssBtn) addCssBtn.addEventListener('click', () => this.addFile('css'));

        const addJsBtn = document.getElementById('add-js-file');
        if (addJsBtn) addJsBtn.addEventListener('click', () => this.addFile('js'));

        // Modal close
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) modal.style.display = 'none';
            });
        });

        const addFileBtn = document.getElementById('add-file');
        if (addFileBtn) addFileBtn.addEventListener('click', () => this.showFileModal());

        const createFileBtn = document.getElementById('create-file');
        if (createFileBtn) createFileBtn.addEventListener('click', () => this.createNewFile());

        const assetUpload = document.getElementById('asset-upload');
        if (assetUpload) assetUpload.addEventListener('change', (e) => this.handleAssetUpload(e));

        const refreshPreviewBtn = document.getElementById('refresh-preview');
        if (refreshPreviewBtn) refreshPreviewBtn.addEventListener('click', () => this.updatePreview());

        const fullscreenPreviewBtn = document.getElementById('fullscreen-preview');
        if (fullscreenPreviewBtn) fullscreenPreviewBtn.addEventListener('click', () => this.toggleFullscreenPreview());

        const previewSizeSelect = document.getElementById('preview-size-select');
        if (previewSizeSelect) previewSizeSelect.addEventListener('change', (e) => this.setPreviewSize(e.target.value));
    }

    /* ----------------------------------------------------
       AUTH SYSTEM (ADDED)
    ---------------------------------------------------- */

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

    showNotification(message, type = 'success') {
        const box = document.createElement('div');
        box.style.cssText = `
            position:fixed; top:20px; right:20px;
            background:${type === 'success' ? '#4CAF50' : '#f44336'};
            color:#fff; padding:15px 25px; 
            border-radius:8px; z-index:20000;
            box-shadow:0 4px 12px rgba(0,0,0,.2);
            animation:slideInRight .3s ease;
        `;
        box.textContent = message;
        document.body.appendChild(box);

        setTimeout(() => {
            box.style.animation = 'slideOutRight .3s ease';
            setTimeout(() => box.remove(), 300);
        }, 3000);
    }

    /* ----------------------------------------------------
       THE REST OF YOUR ORIGINAL EDITOR CODE (UNCHANGED)
    ---------------------------------------------------- */
    setupEditorListeners() {
        const debounce = (func, delay) => {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => func(...args), delay);
            };
        };

        const debouncedPreview = debounce(() => this.updatePreview(), 500);

        const htmlEditor = document.getElementById('html-editor');
        const cssEditor = document.getElementById('css-editor');
        const jsEditor = document.getElementById('js-editor');

        if (htmlEditor) {
            htmlEditor.addEventListener('input', (e) => {
                this.saveCurrentFile('html', e.target.value);
                debouncedPreview();
            });
        }
        if (cssEditor) {
            cssEditor.addEventListener('input', (e) => {
                this.saveCurrentFile('css', e.target.value);
                debouncedPreview();
            });
        }
        if (jsEditor) {
            jsEditor.addEventListener('input', (e) => {
                this.saveCurrentFile('js', e.target.value);
                debouncedPreview();
            });
        }
    }

    setupAutoSave() {
        setInterval(() => {
            if (this.hasUnsavedChanges()) {
                this.autoSaveProject();
            }
        }, 30000);
    }

    hasUnsavedChanges() { return true; }
    autoSaveProject() { console.log('Auto-saving project...'); }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.tab === tabName)
        );
        document.querySelectorAll('.tab-content').forEach(tab =>
            tab.classList.toggle('active', tab.id === `${tabName}-tab`)
        );
        if (tabName === 'preview') this.updatePreview();
    }

    updateFileTree() {
        const fileTree = document.getElementById('file-tree');
        if (!fileTree) return;
        fileTree.innerHTML = '';

        Object.keys(this.files.html).forEach(f => this.addFileToTree('html', f));
        Object.keys(this.files.css).forEach(f => this.addFileToTree('css', f));
        Object.keys(this.files.js).forEach(f => this.addFileToTree('js', f));

        this.updateFileSelectors();
    }

    addFileToTree(type, filename) {
        const tree = document.getElementById('file-tree');
        if (!tree) return;

        const div = document.createElement('div');
        div.className = 'file-item';
        div.dataset.type = type;
        div.dataset.filename = filename;

        const icons = { html: '📄', css: '🎨', js: '⚡' };

        div.innerHTML = `
            <span class="file-icon">${icons[type]}</span>
            <span class="file-name">${filename}</span>
            <div class="file-actions">
                <button onclick="frontendEditor.renameFile('${type}', '${filename}')">✏️</button>
                <button onclick="frontendEditor.deleteFile('${type}', '${filename}')">🗑️</button>
            </div>`;

        div.addEventListener('click', (e) => {
            if (!e.target.closest('.file-actions')) {
                this.openFile(type, filename);
            }
        });

        tree.appendChild(div);
    }

    updateFileSelectors() {
        this.updateFileSelector('html-file-selector', this.files.html, this.currentFile.html);
        this.updateFileSelector('css-file-selector', this.files.css, this.currentFile.css);
        this.updateFileSelector('js-file-selector', this.files.js, this.currentFile.js);
    }

    updateFileSelector(id, files, selected) {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '';
        Object.keys(files).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (name === selected) opt.selected = true;
            select.appendChild(opt);
        });
    }

    openFile(type, filename) {
        this.currentFile[type] = filename;
        this.loadFileContent(type, filename);

        // Switch to appropriate tab based on file type
        if (type === 'html') this.switchTab('html');
        else if (type === 'css') this.switchTab('css');
        else if (type === 'js') this.switchTab('js');

        this.updateFileSelectors();
    }

    loadFileContent(type, filename) {
        const editor = document.getElementById(`${type}-editor`);
        if (editor && this.files[type] && this.files[type][filename] !== undefined) {
            editor.value = this.files[type][filename];
        } else if (editor) {
            editor.value = '';
        }
    }

    saveCurrentFile(type, value) {
        if (!this.files[type]) this.files[type] = {};
        this.files[type][this.currentFile[type]] = value;
    }

    showFileModal() {
        const modal = document.getElementById('file-modal');
        if (modal) modal.style.display = 'block';
    }

    createNewFile() {
        const nameInput = document.getElementById('new-file-name');
        const typeSelect = document.getElementById('new-file-type');

        if (!nameInput || !typeSelect) return alert("Missing new file form elements");

        const name = nameInput.value.trim();
        const type = typeSelect.value;

        if (!name) return alert("Enter a file name");

        const ext = { html: '.html', css: '.css', js: '.js' };
        const final = name.endsWith(ext[type]) ? name : name + ext[type];

        if (this.files[type] && this.files[type][final]) return alert("File already exists");

        const defaults = {
            html: `<!DOCTYPE html><html><head><title>${final}</title></head><body></body></html>`,
            css: `/* ${final} */`,
            js: `// ${final}`
        };

        if (!this.files[type]) this.files[type] = {};
        this.files[type][final] = defaults[type];

        this.updateFileTree();
        this.openFile(type, final);

        const modal = document.getElementById('file-modal');
        if (modal) modal.style.display = 'none';
        nameInput.value = '';
    }

    // NEW: addFile method (simple prompt-based add, used by sidebar buttons)
    addFile(type) {
        const fileName = prompt(`Enter ${type.toUpperCase()} file name:`);
        if (!fileName) return;

        const extension = { html: '.html', css: '.css', js: '.js' }[type];
        const fullName = fileName.endsWith(extension) ? fileName : fileName + extension;

        if (!this.files[type]) this.files[type] = {};
        if (this.files[type][fullName]) {
            alert('File already exists!');
            return;
        }

        // Default content for new files
        const defaults = {
            html: `<!DOCTYPE html>\n<html>\n<head>\n    <title>${fullName}</title>\n</head>\n<body>\n    <h1>${fileName}</h1>\n</body>\n</html>`,
            css: `/* ${fullName} */\nbody {\n    margin: 0;\n    padding: 20px;\n}`,
            js: `// ${fullName}\nconsole.log('${fileName} loaded');`
        };

        this.files[type][fullName] = defaults[type];
        this.updateFileTree();
        this.updateFileSelectors();

        // Switch to the new file
        this.openFile(type, fullName);
    }

    renameFile(type, oldName) {
        const newName = prompt("Rename file:", oldName);
        if (!newName || newName === oldName) return;

        if (this.files[type][newName]) return alert("File exists");

        this.files[type][newName] = this.files[type][oldName];
        delete this.files[type][oldName];

        if (this.currentFile[type] === oldName) this.currentFile[type] = newName;

        this.updateFileTree();
        this.updateFileSelectors();
    }

    deleteFile(type, name) {
        if (!this.files[type]) return;
        if (Object.keys(this.files[type]).length <= 1)
            return alert("Cannot delete last file");

        if (!confirm(`Delete ${name}?`)) return;

        delete this.files[type][name];

        const first = Object.keys(this.files[type])[0];
        this.currentFile[type] = first;
        this.loadFileContent(type, first);

        this.updateFileTree();
        this.updateFileSelectors();
    }

    showAssetsManager() {
        const modal = document.getElementById('assets-modal');
        if (modal) modal.style.display = 'block';
        // Ensure we're showing the current state
        this.renderAssetsList();
        console.log('Assets manager opened. Current assets:', this.assets.length);
    }

    handleAssetUpload(e) {
        [...e.target.files].forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                // Ensure we have proper base64 data URL
                let dataUrl = ev.target.result;
                if (!dataUrl.startsWith('data:')) {
                    // Convert to base64 data URL
                    dataUrl = `data:${file.type};base64,${btoa(ev.target.result)}`;
                }

                this.assets.push({
                    name: file.name,
                    type: file.type,
                    data: dataUrl,
                    size: file.size,
                    uploadedAt: new Date()
                });

                this.saveAssetsToLocalStorage();
                this.renderAssetsList();
            };

            // Read as data URL
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    }

    renderAssetsList() {
        const assetsList = document.getElementById('assets-list');
        if (!assetsList) return;
        assetsList.innerHTML = '';

        if (this.assets.length === 0) {
            assetsList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No assets uploaded</p>';
            return;
        }

        this.assets.forEach((asset, index) => {
            const assetItem = document.createElement('div');
            assetItem.className = 'asset-item';

            let preview = '';
            if (asset.type && asset.type.startsWith('image/')) {
                preview = `<img src="${asset.data}" alt="${asset.name}" style="max-width: 100%; max-height: 60px; object-fit: contain;">`;
            } else {
                preview = `<div style="font-size: 2rem;">📄</div>`;
            }

            assetItem.innerHTML = `
            ${preview}
            <div class="asset-name" title="${asset.name}">${asset.name.length > 15 ? asset.name.substring(0, 15) + '...' : asset.name}</div>
            <div class="asset-actions">
                <button onclick="frontendEditor.copyAssetUrl('${asset.name}')" title="Copy URL">📋</button>
                <button onclick="frontendEditor.deleteAsset(${index})" title="Delete">🗑️</button>
            </div>
        `;

            assetsList.appendChild(assetItem);
        });
    }

    copyAssetUrl(name) {
        const asset = this.assets.find(a => a.name === name);
        if (!asset) return;
        navigator.clipboard.writeText(asset.data).then(() =>
            this.showNotification("Asset URL copied!")
        );
    }

    deleteAsset(i) {
        if (confirm("Delete asset?")) {
            this.assets.splice(i, 1);
            // Save to localStorage after deletion
            this.saveAssetsToLocalStorage();
            this.renderAssetsList();
        }
    }

    updatePreview() {
        const fullHTML = this.generateFullHTML();
        const frame = document.getElementById('preview-frame');
        if (!frame) return;

        try {
            const doc = frame.contentDocument || frame.contentWindow.document;
            doc.open();
            doc.write(fullHTML);
            doc.close();

            // Add error handling for frame
            frame.onload = () => {
                console.log('Preview frame loaded successfully');
            };

            frame.onerror = (error) => {
                console.error('Preview frame error:', error);
                // Fallback: try to set srcdoc if write fails
                frame.srcdoc = fullHTML;
            };

        } catch (error) {
            console.error('Error updating preview:', error);
            // Fallback method
            frame.srcdoc = fullHTML;
        }
    }

    generateFullHTML() {
        // Get all HTML files
        const htmlFiles = this.files.html || {};
        const cssFiles = this.files.css || {};
        const jsFiles = this.files.js || {};

        const projectName = document.getElementById('project-name')?.value || 'My Project';

        // Create a map of all files for easy access
        const allFiles = {
            html: htmlFiles,
            css: cssFiles,
            js: jsFiles
        };

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <style>
        /* Multi-page navigation styles */
        .project-navigation {
            background: #2c3e50;
            padding: 15px;
            margin-bottom: 20px;
        }
        .nav-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .nav-btn {
            background: #34495e;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
        }
        .nav-btn:hover {
            background: #4a6278;
        }
        .nav-btn.active {
            background: #3498db;
        }
        
        /* Asset handling */
        img {
            max-width: 100%;
            height: auto;
        }
        
        /* CSS from all files */
        ${Object.values(cssFiles).join('\n')}
    </style>
</head>
<body>
    <!-- Dynamic navigation based on HTML files -->
    ${Object.keys(htmlFiles).length > 1 ? `
    <nav class="project-navigation">
        <div class="nav-buttons">
            ${Object.keys(htmlFiles).map(page =>
            `<button class="nav-btn" onclick="loadPage('${page}')">
                    ${page.replace('.html', '')}
                </button>`
        ).join('')}
        </div>
    </nav>
    ` : ''}
    
    <div id="page-content">
        <!-- Content will be loaded here dynamically -->
    </div>

    <script>
        // Store all project data
        const projectData = ${JSON.stringify({
            html: htmlFiles,
            css: cssFiles,
            js: jsFiles,
            assets: this.assets,
            name: projectName
        })};
        
        // Asset handling function
        function getAssetUrl(assetName) {
            const asset = projectData.assets.find(a => a.name === assetName);
            if (asset) {
                return asset.data; // Base64 data URL
            }
            return '';
        }
        
        // Page loading function
        function loadPage(pageName) {
            const html = projectData.html[pageName];
            if (!html) {
                document.getElementById('page-content').innerHTML = 
                    '<h1>Page not found</h1><p>The requested page does not exist.</p>';
                return;
            }
            
            // Update navigation
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent.trim() === pageName.replace('.html', '')) {
                    btn.classList.add('active');
                }
            });
            
            // Load the page content
            document.getElementById('page-content').innerHTML = html;
            
            // Execute any JavaScript for this page
            const scripts = projectData.js;
            Object.values(scripts).forEach(scriptCode => {
                try {
                    // Create a script element
                    const script = document.createElement('script');
                    script.textContent = scriptCode;
                    document.getElementById('page-content').appendChild(script);
                } catch (error) {
                    console.error('Error executing script:', error);
                }
            });
            
            // Update URL without reloading
            history.pushState({ page: pageName }, '', \`?page=\${pageName}\`);
        }
        
        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                loadPage(event.state.page);
            }
        });
        
        // Load initial page from URL or default
        const urlParams = new URLSearchParams(window.location.search);
        const initialPage = urlParams.get('page') || 'index.html';
        
        // Initialize on load
        window.addEventListener('DOMContentLoaded', () => {
            loadPage(initialPage);
        });
        
        // Make loadPage available globally
        window.loadPage = loadPage;
    </script>
</body>
</html>`;
    }

    /* ----------------------------------------------------
   PREVIEW CONTROLS - MISSING METHODS
---------------------------------------------------- */

    toggleFullscreenPreview() {
        const previewFrame = document.getElementById('preview-frame');
        if (!previewFrame) return;

        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (previewFrame.requestFullscreen) {
                previewFrame.requestFullscreen();
            } else if (previewFrame.webkitRequestFullscreen) {
                previewFrame.webkitRequestFullscreen();
            } else if (previewFrame.msRequestFullscreen) {
                previewFrame.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    setPreviewSize(size) {
        const previewFrame = document.getElementById('preview-frame');
        if (!previewFrame) return;

        const previewContainer = previewFrame.parentElement;
        if (!previewContainer) return;

        // Remove existing size classes
        previewContainer.classList.remove('preview-desktop', 'preview-tablet', 'preview-mobile', 'preview-responsive');

        switch (size) {
            case 'desktop':
                previewContainer.classList.add('preview-desktop');
                previewFrame.style.width = '100%';
                previewFrame.style.height = '100%';
                break;
            case 'tablet':
                previewContainer.classList.add('preview-tablet');
                previewFrame.style.width = '768px';
                previewFrame.style.height = '1024px';
                break;
            case 'mobile':
                previewContainer.classList.add('preview-mobile');
                previewFrame.style.width = '375px';
                previewFrame.style.height = '667px';
                break;
            case 'responsive':
                previewContainer.classList.add('preview-responsive');
                previewFrame.style.width = '100%';
                previewFrame.style.height = '100%';
                break;
            default:
                previewFrame.style.width = '100%';
                previewFrame.style.height = '100%';
        }

        // Update preview after size change
        setTimeout(() => this.updatePreview(), 100);
    }

    /* ---------------------------------------------
       PROJECT SAVE / LOAD
    --------------------------------------------- */

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

        const projectNameEl = document.getElementById('project-name');
        const projectName = projectNameEl
            ? projectNameEl.value.trim() || 'Untitled Project'
            : 'Untitled Project';

        try {
            // Ensure all current file content is saved before sending
            const htmlEditor = document.getElementById('html-editor');
            const cssEditor = document.getElementById('css-editor');
            const jsEditor = document.getElementById('js-editor');

            if (htmlEditor) this.saveCurrentFile('html', htmlEditor.value);
            if (cssEditor) this.saveCurrentFile('css', cssEditor.value);
            if (jsEditor) this.saveCurrentFile('js', jsEditor.value);

            // ✅ Ensure assets are properly serialized
            const assetsToSave = this.assets.map(asset => ({
                name: asset.name,
                type: asset.type,
                data: asset.data, // base64 string
                size: asset.size
            }));

            const response = await fetch('/api/frontend/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: projectName,
                    files: this.files,
                    assets: assetsToSave,
                    structure: this.getProjectStructure()
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessNotification(result.shareUrl);

                if (saveBtn) saveBtn.innerHTML = '✅ Saved!';
                setTimeout(() => {
                    if (saveBtn) saveBtn.innerHTML = originalText;
                }, 2000);

                console.log('Project saved with assets:', {
                    projectId: result.projectId,
                    assetsCount: assetsToSave.length,
                    assets: assetsToSave.map(a => a.name)
                });
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


    getProjectStructure() {
        return {
            html: Object.keys(this.files.html || {}),
            css: Object.keys(this.files.css || {}),
            js: Object.keys(this.files.js || {}),
            assets: this.assets.map(a => a.name)
        };
    }

    showSuccessNotification(url) {
        navigator.clipboard.writeText(url).then(() => {
            const n = document.getElementById('success-notification');
            if (n) {
                n.style.display = 'flex';
                setTimeout(() => (n.style.display = 'none'), 4000);
            }
        }).catch(() => {
            // ignore clipboard errors
        });
    }

    async showProjects() {
        const token = Cookies.get('token');

        try {
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch('/api/frontend/projects', {
                headers: headers
            });

            if (!res.ok) {
                throw new Error(`Failed to load projects: ${res.status}`);
            }

            const projects = await res.json();
            console.log('Loaded projects:', projects);
            this.displayProjects(projects);

            const projectsModal = document.getElementById('projects-modal');
            if (projectsModal) projectsModal.style.display = 'block';

        } catch (err) {
            console.error('Error loading projects:', err);
            alert("Error loading projects: " + err.message);
        }
    }

    displayProjects(projects) {
        const list = document.getElementById('projects-list');
        if (!list) return;

        if (!projects || projects.length === 0) {
            list.innerHTML = `<p style="text-align:center;padding:20px;color:#666;">No projects found. Create your first project!</p>`;
            return;
        }

        list.innerHTML = projects.map(p => `
            <div class="project-item">
                <div class="project-info">
                    <h3>${this.escapeHtml(p.name || 'Untitled Project')}</h3>
                    <p class="project-meta">
                        <strong>Created:</strong> ${new Date(p.createdAt || Date.now()).toLocaleDateString()} • 
                        <strong>Files:</strong> ${p.fileCount || 0} • 
                        <strong>Assets:</strong> ${p.assetCount || 0}
                    </p>
                    <div class="project-link-container">
                        <span class="project-link-label">Share Link:</span>
                        <div class="link-copy-group">
                            <input type="text" class="project-link-input" value="${p.shareUrl || ''}" readonly>
                            <button class="btn btn-small" onclick="navigator.clipboard.writeText('${p.shareUrl || ''}')">📋 Copy</button>
                        </div>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-open" onclick="frontendEditor.openProject('${p.id}')">Open</button>
                    <button class="btn btn-delete" onclick="frontendEditor.deleteProject('${p.id}','${p.name || 'Untitled'}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    debugAssets() {
        console.log('=== ASSETS DEBUG INFO ===');
        console.log('Current assets array:', this.assets);
        console.log('Assets length:', this.assets.length);
        console.log('LocalStorage assets:', localStorage.getItem('frontendEditor_assets'));
        console.log('Assets in DOM:', document.querySelectorAll('.asset-item').length);
        console.log('========================');
    }

    async openProject(projectId) {
        try {
            const token = Cookies.get('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch(`/api/frontend/project/${projectId}`, {
                headers: headers
            });

            if (!response.ok) {
                throw new Error('Failed to load project');
            }

            const project = await response.json();

            // Load project data
            document.getElementById('project-name').value = project.name;
            this.files = project.files || { html: {}, css: {}, js: {} };

            // ✅ FIX: Ensure all file types exist
            if (!this.files.html) this.files.html = {};
            if (!this.files.css) this.files.css = {};
            if (!this.files.js) this.files.js = {};

            this.updateFileTree();

            // Set current files to first available files
            const htmlFiles = Object.keys(this.files.html);
            const cssFiles = Object.keys(this.files.css);
            const jsFiles = Object.keys(this.files.js);

            if (htmlFiles.length > 0) {
                this.currentFile.html = htmlFiles[0];
                this.loadFileContent('html', this.currentFile.html);
            }

            if (cssFiles.length > 0) {
                this.currentFile.css = cssFiles[0];
                this.loadFileContent('css', this.currentFile.css);
            }

            if (jsFiles.length > 0) {
                this.currentFile.js = jsFiles[0];
                this.loadFileContent('js', this.currentFile.js);
            }

            // Load assets
            this.assets = project.assets || [];
            this.saveAssetsToLocalStorage();

            this.hideModal();
            this.updatePreview();
            this.updateFileSelectors();
            this.switchTab('preview');

        } catch (error) {
            console.error('Error opening project:', error);
            alert('Error opening project. The project may not exist or you may not have permission to access it.');
        }
    }

    async deleteProject(id, name) {
        const token = Cookies.get('token');
        if (!token) return alert("Please login");

        if (!confirm(`Delete ${name}?`)) return;

        try {
            const res = await fetch(`/api/frontend/project/${id}`, {
                method: "DELETE",
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Delete error");

            this.showNotification(`Project "${name}" deleted`);
            this.showProjects();

        } catch (err) {
            console.error(err);
            alert("Error deleting project");
        }
    }

    hideModal() {
        const projectsModal = document.getElementById('projects-modal');
        if (projectsModal) projectsModal.style.display = 'none';
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Debug method for testing
    async debugProjectSystem() {
        console.log('=== PROJECT SYSTEM DEBUG ===');

        // Test API connectivity
        try {
            const response = await fetch('/api/frontend/projects');
            const projects = await response.json();
            console.log('API Response:', projects);
        } catch (error) {
            console.error('API Error:', error);
        }

        // Test local storage
        console.log('Local Storage Assets:', localStorage.getItem('frontendEditor_assets'));
        console.log('Current Files:', this.files);
        console.log('Current Assets:', this.assets);
    }
}

/* ----------------------------------------------------
   BOOT EDITOR
---------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    window.frontendEditor = new EnhancedFrontendEditor();
});