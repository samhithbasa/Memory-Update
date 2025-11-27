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

    init() {
        this.bindEvents();
        this.updateFileTree();
        this.updatePreview();
        this.checkAuthStatus();     // NEW
        this.setupAutoSave();
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
        document.getElementById('auth-toggle')
            .addEventListener('click', () => this.handleAuthToggle());

        // File selectors
        document.getElementById('html-file-selector').addEventListener('change', (e) => {
            this.currentFile.html = e.target.value;
            this.loadFileContent('html', e.target.value);
        });

        document.getElementById('css-file-selector').addEventListener('change', (e) => {
            this.currentFile.css = e.target.value;
            this.loadFileContent('css', e.target.value);
        });

        document.getElementById('js-file-selector').addEventListener('change', (e) => {
            this.currentFile.js = e.target.value;
            this.loadFileContent('js', e.target.value);
        });

        this.setupEditorListeners();

        document.getElementById('save-project').addEventListener('click', () => this.saveProject());
        document.getElementById('show-projects').addEventListener('click', () => this.showProjects());
        document.getElementById('assets-manager').addEventListener('click', () => this.showAssetsManager());

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

        document.getElementById('add-file').addEventListener('click', () => this.showFileModal());
        document.getElementById('create-file').addEventListener('click', () => this.createNewFile());

        document.getElementById('asset-upload').addEventListener('change', (e) => this.handleAssetUpload(e));

        document.getElementById('refresh-preview').addEventListener('click', () => this.updatePreview());
        document.getElementById('fullscreen-preview').addEventListener('click', () => this.toggleFullscreenPreview());
        document.getElementById('preview-size-select').addEventListener('change', (e) => this.setPreviewSize(e.target.value));
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
            authToggle.innerHTML = '⏳ Checking...';
            authToggle.className = 'btn btn-auth-loading';
            authToggle.disabled = true;

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
            authToggle.disabled = false;
        }
    }

    setAuthState(isAuthenticated) {
        this.isAuthenticated = isAuthenticated;
        const btn = document.getElementById('auth-toggle');

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

        authToggle.innerHTML = '⏳ Logging out...';
        authToggle.className = 'btn btn-auth-loading';
        authToggle.disabled = true;

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
            authToggle.disabled = false;
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

        document.getElementById('html-editor').addEventListener('input', (e) => {
            this.saveCurrentFile('html', e.target.value);
            debouncedPreview();
        });

        document.getElementById('css-editor').addEventListener('input', (e) => {
            this.saveCurrentFile('css', e.target.value);
            debouncedPreview();
        });

        document.getElementById('js-editor').addEventListener('input', (e) => {
            this.saveCurrentFile('js', e.target.value);
            debouncedPreview();
        });
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
        fileTree.innerHTML = '';

        Object.keys(this.files.html).forEach(f => this.addFileToTree('html', f));
        Object.keys(this.files.css).forEach(f => this.addFileToTree('css', f));
        Object.keys(this.files.js).forEach(f => this.addFileToTree('js', f));

        this.updateFileSelectors();
    }

    addFileToTree(type, filename) {
        const tree = document.getElementById('file-tree');
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
        this.switchTab(type);
        this.updateFileSelectors();
    }

    loadFileContent(type, filename) {
        document.getElementById(`${type}-editor`).value =
            this.files[type][filename];
    }

    saveCurrentFile(type, value) {
        this.files[type][this.currentFile[type]] = value;
    }

    showFileModal() {
        document.getElementById('file-modal').style.display = 'block';
    }

    createNewFile() {
        const name = document.getElementById('new-file-name').value.trim();
        const type = document.getElementById('new-file-type').value;

        if (!name) return alert("Enter a file name");

        const ext = { html: '.html', css: '.css', js: '.js' };
        const final = name.endsWith(ext[type]) ? name : name + ext[type];

        if (this.files[type][final]) return alert("File already exists");

        const defaults = {
            html: `<!DOCTYPE html><html><head><title>${final}</title></head><body></body></html>`,
            css: `/* ${final} */`,
            js: `// ${final}`
        };

        this.files[type][final] = defaults[type];

        this.updateFileTree();
        this.openFile(type, final);

        document.getElementById('file-modal').style.display = 'none';
        document.getElementById('new-file-name').value = '';
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
        document.getElementById('assets-modal').style.display = 'block';
        this.renderAssetsList();
    }

    handleAssetUpload(e) {
        [...e.target.files].forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                this.assets.push({
                    name: file.name,
                    type: file.type,
                    data: ev.target.result,
                    size: file.size,
                    uploadedAt: new Date()
                });
                this.renderAssetsList();
            };
            reader.readAsDataURL(file);
        });
    }

    renderAssetsList() {
        const list = document.getElementById('assets-list');
        list.innerHTML = '';

        this.assets.forEach((asset, i) => {
            const div = document.createElement('div');
            div.className = 'asset-item';
            const preview = asset.type.startsWith("image/")
                ? `<img src="${asset.data}">`
                : `<div style="font-size:2rem;">📄</div>`;
            div.innerHTML = `
                ${preview}
                <div class="asset-name">${asset.name}</div>
                <div class="asset-actions">
                    <button onclick="frontendEditor.copyAssetUrl('${asset.name}')">📋</button>
                    <button onclick="frontendEditor.deleteAsset(${i})">🗑️</button>
                </div>`;
            list.appendChild(div);
        });
    }

    copyAssetUrl(name) {
        const asset = this.assets.find(a => a.name === name);
        navigator.clipboard.writeText(asset.data).then(() =>
            this.showNotification("Asset URL copied!")
        );
    }

    deleteAsset(i) {
        if (confirm("Delete asset?")) {
            this.assets.splice(i, 1);
            this.renderAssetsList();
        }
    }

    updatePreview() {
        const fullHTML = this.generateFullHTML();
        const frame = document.getElementById('preview-frame');
        const doc = frame.contentDocument || frame.contentWindow.document;

        doc.open();
        doc.write(fullHTML);
        doc.close();
    }

    generateFullHTML() {
        let html = Object.values(this.files.html).join('\n');
        let css = Object.values(this.files.css).join('\n');
        let js = Object.values(this.files.js).join('\n');

        const assets = this.assets
            .map(a => a.type.startsWith("image/") ? `<link rel="preload" href="${a.data}" as="image">` : '')
            .join("");

        const title = document.getElementById('project-name').value || "My Project";

        return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>${css}</style>
${assets}
</head>
<body>
${html}
<script>${js}</script>
</body>
</html>`;
    }

    setPreviewSize(size) {
        const tab = document.getElementById('preview-tab');
        tab.className = `tab-content active preview-${size}`;
        this.updatePreview();
    }

    toggleFullscreenPreview() {
        const tab = document.getElementById('preview-tab');
        const btn = document.getElementById('fullscreen-preview');

        if (tab.classList.contains('preview-fullscreen')) {
            tab.classList.remove('preview-fullscreen');
            btn.textContent = '📺 Fullscreen';
        } else {
            tab.classList.add('preview-fullscreen');
            btn.textContent = '📺 Exit Fullscreen';
        }
    }

    /* ---------------------------------------------
       PROJECT SAVE / LOAD
    --------------------------------------------- */

    async saveProject() {
        const token = Cookies.get('token');
        if (!token) return alert("Please login to save!");

        const btn = document.getElementById('save-project');
        const old = btn.innerHTML;
        btn.innerHTML = "💾 Saving...";
        btn.disabled = true;

        const name = document.getElementById('project-name').value.trim() || "Untitled Project";

        try {
            const res = await fetch('/api/frontend/save', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    files: this.files,
                    assets: this.assets,
                    structure: this.getProjectStructure()
                })
            });

            const result = await res.json();

            if (result.success) {
                this.showSuccessNotification(result.shareUrl);
                btn.innerHTML = "✅ Saved!";
                setTimeout(() => (btn.innerHTML = old), 2000);
            } else {
                alert(result.error);
                btn.innerHTML = old;
            }
        } catch (err) {
            console.error(err);
            alert("Error saving project");
            btn.innerHTML = old;
        }

        btn.disabled = false;
    }

    getProjectStructure() {
        return {
            html: Object.keys(this.files.html),
            css: Object.keys(this.files.css),
            js: Object.keys(this.files.js),
            assets: this.assets.map(a => a.name)
        };
    }

    showSuccessNotification(url) {
        navigator.clipboard.writeText(url).then(() => {
            const n = document.getElementById('success-notification');
            n.style.display = 'flex';
            setTimeout(() => (n.style.display = 'none'), 4000);
        });
    }

    async showProjects() {
        const token = Cookies.get('token');
        if (!token) return alert("Please login");

        try {
            const res = await fetch('/api/frontend/projects', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to load");

            const projects = await res.json();
            this.displayProjects(projects);

            document.getElementById('projects-modal').style.display = 'block';

        } catch (err) {
            console.error(err);
            alert("Error loading projects");
        }
    }

    displayProjects(projects) {
        const list = document.getElementById('projects-list');

        if (projects.length === 0) {
            list.innerHTML = `<p style="text-align:center;padding:20px;">No projects found.</p>`;
            return;
        }

        list.innerHTML = projects.map(p => `
            <div class="project-item">
                <div class="project-info">
                    <h3>${this.escapeHtml(p.name)}</h3>
                    <p><strong>Created:</strong> ${new Date(p.createdAt).toLocaleDateString()} • 
                       <strong>Updated:</strong> ${new Date(p.updatedAt).toLocaleDateString()}</p>

                    <div class="project-link-container">
                        <span>Share Link:</span>
                        <div class="link-copy-group">
                            <input value="${p.shareUrl}" readonly>
                            <button onclick="navigator.clipboard.writeText('${p.shareUrl}')">📋 Copy</button>
                        </div>
                    </div>
                </div>
                <div class="project-actions">
                    <button onclick="frontendEditor.openProject('${p.id}')">Open</button>
                    <button onclick="frontendEditor.deleteProject('${p.id}','${p.name}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async openProject(id) {
        try {
            const response = await fetch(`/api/frontend/project/${id}`);
            const project = await response.json();

            this.files = project.files;
            this.assets = project.assets || [];

            document.getElementById('project-name').value = project.name;

            this.updateFileTree();
            this.openFile('html', Object.keys(this.files.html)[0]);

            this.updatePreview();
            this.switchTab('preview');

            document.getElementById('projects-modal').style.display = 'none';

        } catch (err) {
            console.error(err);
            alert("Error opening project");
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

    escapeHtml(str) {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }
}

/* ----------------------------------------------------
   BOOT EDITOR
---------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    window.frontendEditor = new EnhancedFrontendEditor();
});
