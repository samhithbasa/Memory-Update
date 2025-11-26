console.log('Frontend Editor JavaScript loaded');

window.addEventListener('error', function (e) {
    console.error('Global error:', e.error);
});

class FrontendEditor {
    constructor() {
        console.log('🚀 Frontend Editor Initializing...');

        this.currentProject = null;
        this.files = {
            html: [{ name: 'index.html', content: this.getDefaultHTML() }],
            css: [{ name: 'style.css', content: this.getDefaultCSS() }],
            js: [{ name: 'script.js', content: this.getDefaultJS() }],
            assets: []
        };
        this.activeFile = { type: 'html', name: 'index.html' };

        // Add message listener for preview
        window.addEventListener('message', (event) => {
            if (event.data.type === 'preview-ready') {
                console.log('✅ Preview loaded successfully');
            } else if (event.data.type === 'preview-error') {
                console.error('❌ Preview error:', event.data.error);
            } else if (event.data.type === 'console') {
                console[event.data.method]('Preview:', ...event.data.args);
            }
        });

        this.init();
    }

    getDefaultHTML() {
        return `<!DOCTYPE html>
<html>
<head>
    <title>My Project</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Start building your amazing project...</p>
    <button onclick="showAlert()">Click Me!</button>
</body>
</html>`;
    }

    getDefaultCSS() {
        return `body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
}

h1 {
    text-align: center;
    margin-bottom: 30px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

button {
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s ease;
}

button:hover {
    background: #ff5252;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}`;
    }

    getDefaultJS() {
        return `function showAlert() {
    alert('Hello from JavaScript! 🎉');
    
    // Create a new element
    const newElement = document.createElement('div');
    newElement.innerHTML = '<h3>Dynamic Content!</h3><p>This was added by JavaScript.</p>';
    newElement.style.background = 'rgba(255,255,255,0.1)';
    newElement.style.padding = '20px';
    newElement.style.borderRadius = '10px';
    newElement.style.marginTop = '20px';
    
    document.body.appendChild(newElement);
}

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    console.log('Frontend playground loaded!');
});`;
    }

    init() {
        this.bindEvents();
        this.renderFileTree();
        this.createEditorTab('html', 'index.html');
        this.updatePreview();
        this.checkAuth();
    }

    bindEvents() {
        // Existing events
        document.getElementById('save-project').addEventListener('click', () => this.saveProject());
        document.getElementById('show-projects').addEventListener('click', () => this.showProjects());
        document.querySelector('.modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('projects-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideModal();
        });
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // New events
        document.getElementById('add-file').addEventListener('click', () => this.showAddFileModal());
        document.getElementById('upload-asset').addEventListener('click', () => this.showUploadAssetModal());
        document.getElementById('toggle-explorer').addEventListener('click', () => this.toggleExplorer());

        // Folder toggle
        document.querySelectorAll('.folder-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (!e.target.classList.contains('add-file-btn')) {
                    this.toggleFolder(header.dataset.folder);
                }
            });
        });

        // Add file buttons
        document.querySelectorAll('.add-file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                if (type === 'asset') {
                    this.showUploadAssetModal();
                } else {
                    this.showAddFileModal(type);
                }
            });
        });

        // Form submissions
        document.getElementById('add-file-form').addEventListener('submit', (e) => this.handleAddFile(e));
        document.getElementById('upload-asset-form').addEventListener('submit', (e) => this.handleUploadAsset(e));

        // Modal close events
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.hideAllModals());
        });
    }

    renderFileTree() {
        // Render HTML files
        this.renderFileList('html-files', 'html');
        // Render CSS files
        this.renderFileList('css-files', 'css');
        // Render JS files
        this.renderFileList('js-files', 'js');
        // Render assets
        this.renderAssets();
    }

    renderFileList(containerId, fileType) {
        const container = document.getElementById(containerId);
        container.innerHTML = this.files[fileType].map(file => `
            <div class="file-item ${this.activeFile.type === fileType && this.activeFile.name === file.name ? 'active' : ''}" 
                 data-type="${fileType}" data-file="${file.name}">
                <span>${file.name}</span>
                <div class="file-actions">
                    <button class="rename-btn" onclick="frontendEditor.renameFile('${fileType}', '${file.name}')">✏️</button>
                    <button class="delete-btn" onclick="frontendEditor.deleteFile('${fileType}', '${file.name}')">🗑️</button>
                </div>
            </div>
        `).join('');

        // Add click events
        container.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('rename-btn') && !e.target.classList.contains('delete-btn')) {
                    const type = item.dataset.type;
                    const name = item.dataset.file;
                    this.openFile(type, name);
                }
            });
        });
    }

    renderAssets() {
        const container = document.getElementById('asset-files');
        if (this.files.assets.length === 0) {
            container.innerHTML = '<div style="padding: 10px; color: #a0aec0; font-size: 12px; text-align: center;">No assets uploaded</div>';
            return;
        }

        container.innerHTML = this.files.assets.map(asset => `
        <div class="asset-item" data-asset="${asset.name}">
            <div class="asset-preview-container">
                <img src="${asset.url}" alt="${asset.name}" 
                     class="asset-preview" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                <div class="asset-fallback" style="display: none;">📁 ${asset.name}</div>
            </div>
            <div class="asset-info">
                <span class="asset-name" title="${asset.name}">${asset.name}</span>
                <div class="asset-actions">
                    <button class="copy-asset-btn" onclick="frontendEditor.copyAssetName('${asset.name}')" title="Copy name">
                        📋
                    </button>
                    <button class="delete-btn" onclick="frontendEditor.deleteAsset('${asset.name}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    }

    // Add this helper method
    copyAssetName(assetName) {
        navigator.clipboard.writeText(assetName).then(() => {
            // Show quick feedback
            const btn = event.target;
            const original = btn.innerHTML;
            btn.innerHTML = '✅';
            setTimeout(() => {
                btn.innerHTML = original;
            }, 1000);
        });
    }

    openFile(type, name) {
        this.activeFile = { type, name };

        // Update file tree active states
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"][data-file="${name}"]`).classList.add('active');

        // Create or switch to tab
        this.createEditorTab(type, name);
    }

    createEditorTab(type, name) {
        const tabId = `${type}-${name.replace('.', '-')}`;
        let tab = document.querySelector(`[data-tab="${tabId}"]`);

        if (!tab) {
            // Create new tab
            tab = document.createElement('button');
            tab.className = 'tab-btn';
            tab.dataset.tab = tabId;
            tab.innerHTML = `
                ${this.getFileIcon(type)} ${name}
                <button class="tab-close">&times;</button>
            `;

            // Insert before preview tab
            const previewTab = document.querySelector('[data-tab="preview"]');
            previewTab.parentNode.insertBefore(tab, previewTab);

            // Create editor content
            const content = document.createElement('div');
            content.className = 'tab-content';
            content.id = `${tabId}-tab`;

            const file = this.getFile(type, name);
            content.innerHTML = `
                <textarea placeholder="Write your ${type.toUpperCase()} here...">${file ? file.content : ''}</textarea>
            `;

            document.querySelector('.editor-content').insertBefore(content, document.getElementById('preview-tab'));

            // Add event listeners
            tab.querySelector('.tab-close').addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(tabId);
            });

            tab.addEventListener('click', () => this.switchTab(tabId));

            // Add input event to editor
            content.querySelector('textarea').addEventListener('input', (e) => {
                this.updateFileContent(type, name, e.target.value);
                this.updatePreview();
            });
        }

        this.switchTab(tabId);
    }

    getFileIcon(type) {
        const icons = {
            html: '📄',
            css: '🎨',
            js: '⚡',
            asset: '🖼️'
        };
        return icons[type] || '📄';
    }

    getFile(type, name) {
        return this.files[type].find(file => file.name === name);
    }

    updateFileContent(type, name, content) {
        const file = this.getFile(type, name);
        if (file) {
            file.content = content;
        }
    }

    switchTab(tabId) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });

        // Update preview when switching to preview tab
        if (tabId === 'preview') {
            this.updatePreview();
        }
    }

    closeTab(tabId) {
        if (tabId === 'preview') return;

        const tab = document.querySelector(`[data-tab="${tabId}"]`);
        const content = document.getElementById(`${tabId}-tab`);

        if (tab && content) {
            tab.remove();
            content.remove();
        }

        // Switch to preview tab if closing active tab
        if (tab.classList.contains('active')) {
            this.switchTab('preview');
        }
    }

    showAddFileModal(preSelectedType = '') {
        if (preSelectedType) {
            document.getElementById('file-type').value = preSelectedType;
        }
        document.getElementById('add-file-modal').style.display = 'block';
    }

    showUploadAssetModal() {
        document.getElementById('upload-asset-modal').style.display = 'block';
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    handleAddFile(e) {
        e.preventDefault();
        const type = document.getElementById('file-type').value;
        let name = document.getElementById('file-name').value.trim();

        // Add extension if missing
        if (!name.includes('.')) {
            const extensions = { html: '.html', css: '.css', js: '.js' };
            name += extensions[type];
        }

        // Check if file already exists
        if (this.getFile(type, name)) {
            alert('A file with this name already exists!');
            return;
        }

        // Add new file
        this.files[type].push({
            name: name,
            content: this.getDefaultContent(type)
        });

        // Update UI
        this.renderFileTree();
        this.hideAllModals();
        this.openFile(type, name);

        // Reset form
        e.target.reset();
    }

    getDefaultContent(type) {
        const defaults = {
            html: '<div><!-- New HTML file --></div>',
            css: '/* New CSS file */',
            js: '// New JavaScript file'
        };
        return defaults[type] || '';
    }

    async handleUploadAsset(e) {
        e.preventDefault();
        const fileInput = document.getElementById('asset-file');
        const nameInput = document.getElementById('asset-name');

        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file to upload');
            return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid image file (JPEG, PNG, GIF, SVG, WebP)');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        const fileName = nameInput.value.trim() || file.name;

        // Check if asset with same name already exists
        if (this.files.assets.find(asset => asset.name === fileName)) {
            alert('An asset with this name already exists!');
            return;
        }

        try {
            // Convert to base64 for immediate preview
            const base64Data = await this.fileToBase64(file);

            this.files.assets.push({
                name: fileName,
                url: base64Data, // Use base64 for immediate preview
                file: file,
                type: file.type
            });

            // Update UI
            this.renderAssets();
            this.hideAllModals();
            this.updatePreview();

            // Reset form
            e.target.reset();

            console.log('Asset uploaded successfully:', fileName);
        } catch (error) {
            console.error('Error uploading asset:', error);
            alert('Error uploading asset. Please try again.');
        }
    }

    deleteFile(type, name) {
        if (this.files[type].length <= 1) {
            alert(`You must have at least one ${type.toUpperCase()} file!`);
            return;
        }

        if (!confirm(`Delete ${name}?`)) return;

        this.files[type] = this.files[type].filter(file => file.name !== name);

        // Close tab if open
        this.closeTab(`${type}-${name.replace('.', '-')}`);

        // Update UI
        this.renderFileTree();

        // Switch to first file of same type if active file was deleted
        if (this.activeFile.type === type && this.activeFile.name === name) {
            const newFile = this.files[type][0];
            this.openFile(type, newFile.name);
        }
    }

    deleteAsset(name) {
        if (!confirm(`Delete ${name}?`)) return;

        this.files.assets = this.files.assets.filter(asset => asset.name !== name);
        this.renderAssets();
    }

    renameFile(type, oldName) {
        const newName = prompt('Enter new file name:', oldName);
        if (!newName || newName === oldName) return;

        // Add extension if missing
        let finalName = newName;
        if (!finalName.includes('.')) {
            const extensions = { html: '.html', css: '.css', js: '.js' };
            finalName += extensions[type];
        }

        // Check if name already exists
        if (this.getFile(type, finalName)) {
            alert('A file with this name already exists!');
            return;
        }

        const file = this.getFile(type, oldName);
        file.name = finalName;

        // Update active file if this was the active file
        if (this.activeFile.type === type && this.activeFile.name === oldName) {
            this.activeFile.name = finalName;
        }

        // Update UI
        this.renderFileTree();

        // Update tab
        const oldTabId = `${type}-${oldName.replace('.', '-')}`;
        const newTabId = `${type}-${finalName.replace('.', '-')}`;
        const tab = document.querySelector(`[data-tab="${oldTabId}"]`);
        if (tab) {
            tab.dataset.tab = newTabId;
            tab.innerHTML = `
                ${this.getFileIcon(type)} ${finalName}
                <button class="tab-close">&times;</button>
            `;
            tab.querySelector('.tab-close').addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(newTabId);
            });
        }

        const content = document.getElementById(`${oldTabId}-tab`);
        if (content) {
            content.id = `${newTabId}-tab`;
        }
    }

    toggleExplorer() {
        const explorer = document.querySelector('.file-explorer');
        const toggleBtn = document.getElementById('toggle-explorer');

        explorer.classList.toggle('collapsed');
        toggleBtn.textContent = explorer.classList.contains('collapsed') ? '▶' : '◀';
    }

    toggleFolder(folderName) {
        const content = document.querySelector(`[data-folder="${folderName}"]`).nextElementSibling;
        content.classList.toggle('collapsed');
    }

    updatePreview() {
        console.log('🔄 Updating preview...');

        const previewFrame = document.getElementById('preview-frame');
        if (!previewFrame) {
            console.error('❌ Preview frame not found');
            return;
        }

        try {
            // Get all file contents
            const htmlContent = this.files.html.map(file => file.content).join('\n');
            const cssContent = this.files.css.map(file => file.content).join('\n');
            const jsContent = this.files.js.map(file => file.content).join('\n');

            // Create the preview document
            const previewDocument = previewFrame.contentDocument || previewFrame.contentWindow.document;

            previewDocument.open();
            previewDocument.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>
        ${cssContent}
        
        /* Base styles for preview */
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        /* Error boundary styling */
        .preview-error {
            background: #fee;
            color: #c33;
            padding: 20px;
            border-radius: 8px;
            margin: 10px;
            border-left: 4px solid #c33;
        }
    </style>
</head>
<body>
    ${htmlContent}
    
    <script>
        // Error handling for preview
        window.addEventListener('error', function(e) {
            console.error('Preview Error:', e.error);
            // Send error to parent
            if (window.parent) {
                window.parent.postMessage({
                    type: 'preview-error',
                    error: e.error?.message || 'Unknown error',
                    stack: e.error?.stack
                }, '*');
            }
        });
        
        // Console redirection
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };
        
        ['log', 'error', 'warn'].forEach(method => {
            console[method] = function(...args) {
                originalConsole[method].apply(console, args);
                if (window.parent) {
                    window.parent.postMessage({
                        type: 'console',
                        method: method,
                        args: args.map(arg => 
                            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                        )
                    }, '*');
                }
            };
        });
        
        // Load JavaScript
        try {
            ${jsContent}
        } catch (jsError) {
            console.error('JavaScript Error:', jsError);
        }
        
        // Notify parent that preview is ready
        setTimeout(() => {
            if (window.parent) {
                window.parent.postMessage({ type: 'preview-ready' }, '*');
            }
        }, 100);
    </script>
</body>
</html>
        `);
            previewDocument.close();

            console.log('✅ Preview updated successfully');

        } catch (error) {
            console.error('❌ Error updating preview:', error);
        }

        // Listen for console messages from preview
        window.addEventListener('message', (event) => {
            if (event.data.type === 'console') {
                console[event.data.method]('Preview:', ...event.data.args);
            }
        });
    }

    async saveProject() {
        const token = Cookies.get('token');
        if (!token) {
            const currentUrl = encodeURIComponent(window.location.href);
            window.location.href = `/login?redirect=${currentUrl}`;
            return;
        }

        const saveBtn = document.getElementById('save-project');
        const originalText = saveBtn.innerHTML;

        saveBtn.innerHTML = '💾 Saving...';
        saveBtn.disabled = true;

        const projectName = document.getElementById('project-name').value.trim() || 'Untitled Project';

        try {
            // Validate files before saving
            if (!this.files.html || this.files.html.length === 0) {
                throw new Error('Project must contain at least one HTML file');
            }

            // Process assets with size validation
            const assets = await this.processAssets();

            // Limit asset size for preview
            if (assets.length > 0) {
                console.log(`Saving project with ${assets.length} assets`);
            }

            const response = await fetch('/api/frontend/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: projectName,
                    files: this.files,
                    assets: assets
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccessNotification(result.shareUrl);
                saveBtn.innerHTML = '✅ Saved!';
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error saving project: ' + error.message);
            saveBtn.innerHTML = '❌ Failed';
        } finally {
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }, 2000);
        }
    }

    async processAssets() {
        const processedAssets = [];

        for (const asset of this.files.assets) {
            if (asset.file) {
                const base64 = await this.fileToBase64(asset.file);
                processedAssets.push({
                    name: asset.name,
                    data: base64,
                    type: asset.file.type
                });
            } else {
                // Asset already processed (from loaded project)
                processedAssets.push(asset);
            }
        }

        return processedAssets;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    showSuccessNotification(shareUrl) {
        // Copy URL to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            const notification = document.getElementById('success-notification');
            notification.style.display = 'flex';

            setTimeout(() => {
                notification.style.display = 'none';
            }, 4000);
        });
    }

    async showProjects() {
        const token = Cookies.get('token');
        if (!token) {
            alert('Please login to view your projects');
            return;
        }

        try {
            console.log('📂 Loading projects...');

            const response = await fetch('/api/frontend/projects', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const projects = await response.json();
            console.log(`📁 Loaded ${projects.length} projects`);

            this.displayProjects(projects);
            document.getElementById('projects-modal').style.display = 'block';

        } catch (error) {
            console.error('❌ Error loading projects:', error);
            alert('Error loading projects: ' + error.message);

            // Show empty state
            this.displayProjects([]);
            document.getElementById('projects-modal').style.display = 'block';
        }
    }

    displayProjects(projects) {
        const projectsList = document.getElementById('projects-list');

        if (!projectsList) {
            console.error('❌ Projects list element not found');
            return;
        }

        if (!projects || projects.length === 0) {
            projectsList.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                <h3>No Projects Found</h3>
                <p>Create your first project to get started!</p>
                <button onclick="frontendEditor.hideModal()" class="btn btn-primary" style="margin-top: 15px;">
                    Create New Project
                </button>
            </div>
        `;
            return;
        }

        projectsList.innerHTML = projects.map(project => `
        <div class="project-item">
            <div class="project-info">
                <h3>${this.escapeHtml(project.name)}</h3>
                <p class="project-meta">
                    Created: ${new Date(project.createdAt).toLocaleDateString()} • 
                    Files: ${project.fileCount?.html || 0} HTML, 
                    ${project.fileCount?.css || 0} CSS, 
                    ${project.fileCount?.js || 0} JS
                </p>
                <div class="project-link-container">
                    <input type="text" class="project-link-input" 
                           value="${this.escapeHtml(project.shareUrl)}" readonly>
                    <button class="copy-link-btn" 
                            onclick="frontendEditor.copyProjectLink('${this.escapeHtml(project.shareUrl)}', this)">
                        📋 Copy
                    </button>
                </div>
            </div>
            <div class="project-actions">
                <button class="btn btn-open" 
                        onclick="frontendEditor.openProject('${this.escapeHtml(project.id)}')">
                    Open
                </button>
                <button class="btn btn-delete" 
                        onclick="frontendEditor.deleteProject('${this.escapeHtml(project.id)}', '${this.escapeHtml(project.name)}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');

        console.log(`✅ Displayed ${projects.length} projects`);
    }

    copyProjectLink(link, buttonElement) {
        navigator.clipboard.writeText(link).then(() => {
            // Show success feedback
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✅ Copied!';
            buttonElement.style.background = '#4CAF50';

            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.style.background = '';
            }, 2000);

            console.log('Link copied to clipboard:', link);
        }).catch(err => {
            console.error('Failed to copy link:', err);
            alert('Failed to copy link. Please try again.');
        });
    }

    async deleteProject(projectId, projectName) {
        const token = Cookies.get('token');
        if (!token) {
            alert('Please login to delete projects');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/frontend/project/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Remove the project from the UI immediately
                const projectElement = document.querySelector(`[onclick*="${projectId}"]`)?.closest('.project-item');
                if (projectElement) {
                    projectElement.style.opacity = '0.5';
                    setTimeout(() => {
                        projectElement.remove();
                        // Refresh the projects list
                        this.showProjects();
                    }, 300);
                }

                // Show success message
                this.showNotification(`Project "${projectName}" deleted successfully`);

            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete project');
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Error deleting project: ' + error.message);
        }
    }

    showNotification(message) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10001;
        animation: slideInRight 0.3s ease;
    `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    async openProject(projectId) {
        try {
            const response = await fetch(`/api/frontend/project/${projectId}`);
            const project = await response.json();

            document.getElementById('project-name').value = project.name;
            document.getElementById('html-editor').value = project.html;
            document.getElementById('css-editor').value = project.css;
            document.getElementById('js-editor').value = project.js;

            this.hideModal();
            this.updatePreview();
            this.switchTab('preview');
        } catch (error) {
            console.error('Error opening project:', error);
            alert('Error opening project. Please try again.');
        }
    }

    hideModal() {
        document.getElementById('projects-modal').style.display = 'none';
    }

    async checkAuth() {
        const token = Cookies.get('token');
        const logoutBtn = document.getElementById('logout-btn');

        if (!token) {
            if (logoutBtn) logoutBtn.style.display = 'none';
            return;
        }

        try {
            const response = await fetch('/verify-token', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                if (logoutBtn) logoutBtn.style.display = 'block';
            } else {
                Cookies.remove('token');
                if (logoutBtn) logoutBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            Cookies.remove('token');
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    async logout() {
        const token = Cookies.get('token');
        if (token) {
            try {
                await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        Cookies.remove('token');
        window.location.href = '/landing.html';
    }
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.frontendEditor = new FrontendEditor();
});