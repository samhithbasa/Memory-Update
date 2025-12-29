console.log('Enhanced Frontend Editor JavaScript loaded');

class SimpleFrontendEditor {
    constructor() {
        this.html = '';
        this.css = '';
        this.js = '';
        this.isAuthenticated = false;
        this.baseUrl = window.location.origin;
        this.currentProjectId = null;
        this.init();
    }

    init() {
        console.log('Simple Editor Initialized');
        this.bindEvents();
        this.checkAuthStatus();
        this.loadFromLocalStorage();
        this.updatePreview();

        // Set initial theme
        this.applyNightTheme();
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
        const showProjectsBtn = document.createElement('button');
        showProjectsBtn.id = 'show-projects';
        showProjectsBtn.className = 'btn btn-secondary';
        showProjectsBtn.innerHTML = '📁 My Projects';
        showProjectsBtn.addEventListener('click', () => this.showProjects());

        const headerRight = document.querySelector('.header-right');
        if (headerRight) {
            const saveBtn = document.getElementById('save-project');
            headerRight.insertBefore(showProjectsBtn, saveBtn.nextSibling);
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
                this.html = e.target.value;
                debouncedSave();
                debouncedPreview();
            });
            this.html = htmlEditor.value;
        }

        if (cssEditor) {
            cssEditor.addEventListener('input', (e) => {
                this.css = e.target.value;
                debouncedSave();
                debouncedPreview();
            });
            this.css = cssEditor.value;
        }

        if (jsEditor) {
            jsEditor.addEventListener('input', (e) => {
                this.js = e.target.value;
                debouncedSave();
                debouncedPreview();
            });
            this.js = jsEditor.value;
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('simpleEditorData');
            if (saved) {
                const data = JSON.parse(saved);
                this.html = data.html || '';
                this.css = data.css || '';
                this.js = data.js || '';

                const htmlEditor = document.getElementById('html-editor');
                const cssEditor = document.getElementById('css-editor');
                const jsEditor = document.getElementById('js-editor');

                if (htmlEditor && this.html) htmlEditor.value = this.html;
                if (cssEditor && this.css) cssEditor.value = this.css;
                if (jsEditor && this.js) jsEditor.value = this.js;

                console.log('Loaded from localStorage');
            }
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
        }
    }

    saveToLocalStorage() {
        try {
            const data = {
                html: this.html,
                css: this.css,
                js: this.js,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('simpleEditorData', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
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

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.tab === tabName)
        );
        document.querySelectorAll('.tab-content').forEach(tab =>
            tab.classList.toggle('active', tab.id === `${tabName}-tab`)
        );
        if (tabName === 'preview') this.updatePreview();
    }

    // ========== UNIVERSAL HTML GENERATION ==========
    generateHTML() {
        const projectName = document.getElementById('project-name')?.value || 'My Project';

        // Auto-wrap JavaScript for preview too
        const processedJS = this.autoWrapJavaScript(this.js);

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <style>
        ${this.css}
    </style>
</head>
<body>
    ${this.html}
    <script>
        // UNIVERSAL PREVIEW - AUTO-WRAPPED
        (function() {
            try {
                // User's original code
                ${this.js}
                
                // Auto-wrapped version
                ${processedJS}
            } catch(error) {
                console.error('JavaScript error:', error);
            }
            
            // Universal event handler for preview
            document.addEventListener('click', function(e) {
                if (e.target.hasAttribute('onclick')) {
                    const onclick = e.target.getAttribute('onclick');
                    try {
                        eval(onclick);
                    } catch(err) {
                        console.error('onclick error:', err);
                    }
                }
            });
        })();
        
        console.log('Preview loaded');
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

    // ========== UNIVERSAL DEPLOYMENT HTML GENERATION ==========
    generateDeploymentHTML(html, css, js) {
        const projectName = document.getElementById('project-name')?.value || 'My Project';

        // AUTO-WRAP JavaScript to make all functions globally available
        const processedJS = this.autoWrapJavaScript(js);

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <style>
        ${css}
    </style>
</head>
<body>
    ${html}
    <script>
        // === AUTO-WRAPPED JAVASCRIPT ===
        // All functions are automatically made global
        
        // 1. Execute the user's original code first
        try {
            (function() {
                // User's original code (preserved for debugging)
                ${js}
            })();
        } catch(error) {
            console.error('User code error:', error);
        }
        
        // 2. AUTO-WRAPPED VERSION - Makes everything work automatically
        (function() {
            // Processed version with auto-wrapped functions
            ${processedJS}
        })();
        
        // 3. Universal event handler for onclick events
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Deployed project loaded: "${projectName}"');
            
            // Auto-bind all onclick handlers
            document.addEventListener('click', function(e) {
                if (e.target.hasAttribute('onclick')) {
                    const handler = e.target.getAttribute('onclick');
                    try {
                        // Try to execute as is
                        eval(handler);
                    } catch(error) {
                        console.warn('onclick handler error:', error);
                        // Try to find and call the function
                        const funcName = handler.replace(/\(.*\)/, '').trim();
                        if (typeof window[funcName] === 'function') {
                            window[funcName]();
                        }
                    }
                }
            });
            
            // Auto-call init() or main() if they exist
            setTimeout(() => {
                if (typeof window.init === 'function') window.init();
                if (typeof window.main === 'function') window.main();
                if (typeof window.onload === 'function') window.onload();
            }, 100);
        });
        
        // 4. Make sure DOMContentLoaded fires even if already loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                console.log('DOMContentLoaded fired');
            });
        } else {
            console.log('DOM already loaded, triggering event');
            document.dispatchEvent(new Event('DOMContentLoaded'));
        }
    </script>
</body>
</html>`;
    }

    // ========== AUTO-WRAP JAVASCRIPT HELPER ==========
    autoWrapJavaScript(js) {
        if (!js.trim()) return js;

        console.log('Auto-wrapping JavaScript for global access...');

        // Keep a copy of original code for reference
        let processed = js;

        // 1. Convert regular function declarations to window assignments
        // Matches: function myFunc() { ... }
        processed = processed.replace(
            /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g,
            (match, funcName, params) => {
                console.log(`Auto-wrapping function: ${funcName}`);
                return `window.${funcName} = function(${params}) {`;
            }
        );

        // 2. Convert const/let/var function assignments
        // Matches: const myFunc = function() { ... }
        // Matches: const myFunc = () => { ... }
        processed = processed.replace(
            /(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?(?:function\s*\(([^)]*)\)|\(([^)]*)\)\s*=>)\s*\{/g,
            (match, declaration, funcName, funcParams, arrowParams) => {
                console.log(`Auto-wrapping variable function: ${funcName}`);
                const params = funcParams || arrowParams || '';
                return `${declaration} ${funcName} = function(${params}) { window.${funcName} = ${funcName};`;
            }
        );

        // 3. Also assign to window at the end of the function
        // This ensures functions declared inside other scopes still become global
        const functionNames = this.extractAllFunctionNames(js);

        // Add window assignments for all detected functions
        if (functionNames.length > 0) {
            console.log(`Found functions to make global: ${functionNames.join(', ')}`);

            // Add at the beginning of the script
            const windowAssignments = functionNames.map(funcName =>
                `if (typeof ${funcName} === 'function' && !window.${funcName}) window.${funcName} = ${funcName};`
            ).join('\n');

            processed = windowAssignments + '\n' + processed;
        }

        return processed;
    }

    // ========== IMPROVED FUNCTION EXTRACTION ==========
    extractAllFunctionNames(js) {
        const functionNames = new Set();

        // 1. Regular function declarations
        const funcRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
        let match;
        while ((match = funcRegex.exec(js)) !== null) {
            functionNames.add(match[1]);
        }

        // 2. Arrow functions assigned to variables
        const arrowRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
        while ((match = arrowRegex.exec(js)) !== null) {
            functionNames.add(match[1]);
        }

        // 3. Function expressions
        const exprRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function/g;
        while ((match = exprRegex.exec(js)) !== null) {
            functionNames.add(match[1]);
        }

        // 4. Method assignments
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

    // ========== SAVE PROJECT METHOD ==========
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
            const htmlContent = this.html;
            const cssContent = this.css;
            const jsContent = this.js;

            // Generate universal deployment HTML
            const deploymentHTML = this.generateDeploymentHTML(htmlContent, cssContent, jsContent);

            const response = await fetch('/api/frontend/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: projectName,
                    files: {
                        html: { 'index.html': htmlContent },
                        css: { 'style.css': cssContent },
                        js: { 'script.js': jsContent }
                    },
                    assets: [],
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

    // ========== AUTH METHODS ==========
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
            background:${type === 'success' ? '#10b981' : '#ef4444'};
            color:#fff; padding:15px 25px; 
            border-radius:10px; z-index:20000;
            box-shadow:0 10px 25px rgba(0,0,0,.2);
            animation:slideInRight .3s ease;
            backdrop-filter:blur(10px);
            border:1px solid rgba(255,255,255,.1);
        `;
        box.textContent = message;
        document.body.appendChild(box);

        setTimeout(() => {
            box.style.animation = 'slideOutRight .3s ease';
            setTimeout(() => box.remove(), 300);
        }, 3000);
    }

    // ========== PROJECT MANAGEMENT ==========
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
            this.html = project.files?.html?.['index.html'] || '';
            this.css = project.files?.css?.['style.css'] || '';
            this.js = project.files?.js?.['script.js'] || '';

            // Update editors
            const htmlEditor = document.getElementById('html-editor');
            const cssEditor = document.getElementById('css-editor');
            const jsEditor = document.getElementById('js-editor');

            if (htmlEditor) htmlEditor.value = this.html;
            if (cssEditor) cssEditor.value = this.css;
            if (jsEditor) jsEditor.value = this.js;

            // Update preview
            this.updatePreview();

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

class AdvancedFrontendEditor extends SimpleFrontendEditor {
    constructor() {
        super();
        this.projectStructure = {
            files: {
                html: {},
                css: {},
                js: {},
                assets: {}
            },
            folders: {},
            mainHtml: 'index.html'
        };
        this.currentFile = null;
        this.initAdvancedFeatures();
    }

    initAdvancedFeatures() {
        this.bindAdvancedEvents();
        this.loadProjectStructure();
        this.renderFileTree();
    }

    bindAdvancedEvents() {
        // File Manager
        document.getElementById('file-manager-btn')?.addEventListener('click', () => this.showFileManager());
        document.querySelector('.close-modal')?.addEventListener('click', () => this.hideFileManager());
        
        // File operations
        document.getElementById('new-file')?.addEventListener('click', () => this.createNewFile());
        document.getElementById('new-folder')?.addEventListener('click', () => this.createNewFolder());
        document.getElementById('save-file')?.addEventListener('click', () => this.saveCurrentFile());
        document.getElementById('delete-file')?.addEventListener('click', () => this.deleteCurrentFile());
        document.getElementById('rename-file')?.addEventListener('click', () => this.renameCurrentFile());
        
        // File selector
        document.getElementById('file-selector')?.addEventListener('change', (e) => this.loadFile(e.target.value));
        
        // Pages preview
        document.getElementById('pages-preview-toggle')?.addEventListener('click', () => this.togglePagesPreview());
        document.getElementById('close-pages')?.addEventListener('click', () => this.hidePagesPreview());
        
        // Upload assets
        document.getElementById('upload-assets')?.addEventListener('click', () => this.uploadAssets());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    loadProjectStructure() {
        const saved = localStorage.getItem('projectStructure');
        if (saved) {
            this.projectStructure = JSON.parse(saved);
        } else {
            // Default structure
            this.projectStructure = {
                files: {
                    html: {
                        'index.html': this.html,
                        'about.html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>About</title>\n</head>\n<body>\n    <h1>About Page</h1>\n    <p>This is the about page.</p>\n</body>\n</html>'
                    },
                    css: {
                        'style.css': this.css,
                        'about.css': 'body { padding: 20px; font-family: Arial; }'
                    },
                    js: {
                        'script.js': this.js,
                        'about.js': 'console.log("About page loaded");'
                    },
                    assets: {}
                },
                folders: {
                    images: { type: 'folder' },
                    fonts: { type: 'folder' }
                },
                mainHtml: 'index.html'
            };
        }
    }

    renderFileTree() {
        const container = document.getElementById('file-tree-container');
        if (!container) return;

        container.innerHTML = this.generateFileTreeHTML();
        
        // Add event listeners
        container.querySelectorAll('.folder-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const folder = header.closest('.folder');
                folder.classList.toggle('open');
            });
        });

        container.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectFile(item.dataset.path);
            });
        });
    }

    generateFileTreeHTML() {
        let html = '<div class="file-tree-root">';
        
        // Root files
        html += this.renderFilesList(this.projectStructure.files, '');
        
        // Folders
        Object.entries(this.projectStructure.folders).forEach(([folderName, folderData]) => {
            html += `
                <div class="folder">
                    <div class="folder-header">
                        <span class="file-icon">📁</span>
                        <span>${folderName}</span>
                    </div>
                    <div class="folder-content">
                        ${this.renderFilesList(folderData.files || {}, folderName)}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    renderFilesList(files, folderPath = '') {
        let html = '';
        
        // HTML files
        if (files.html) {
            Object.keys(files.html).forEach(filename => {
                const path = folderPath ? `${folderPath}/${filename}` : filename;
                html += `
                    <div class="file-item" data-path="${path}" data-type="html">
                        <span class="file-icon">📄</span>
                        <span>${filename}</span>
                    </div>
                `;
            });
        }
        
        // CSS files
        if (files.css) {
            Object.keys(files.css).forEach(filename => {
                const path = folderPath ? `${folderPath}/${filename}` : filename;
                html += `
                    <div class="file-item" data-path="${path}" data-type="css">
                        <span class="file-icon">🎨</span>
                        <span>${filename}</span>
                    </div>
                `;
            });
        }
        
        // JS files
        if (files.js) {
            Object.keys(files.js).forEach(filename => {
                const path = folderPath ? `${folderPath}/${filename}` : filename;
                html += `
                    <div class="file-item" data-path="${path}" data-type="js">
                        <span class="file-icon">⚡</span>
                        <span>${filename}</span>
                    </div>
                `;
            });
        }
        
        // Assets
        if (files.assets) {
            Object.keys(files.assets).forEach(filename => {
                const path = folderPath ? `${folderPath}/${filename}` : filename;
                const ext = filename.split('.').pop().toLowerCase();
                const icon = this.getFileIcon(ext);
                html += `
                    <div class="file-item" data-path="${path}" data-type="asset">
                        <span class="file-icon">${icon}</span>
                        <span>${filename}</span>
                    </div>
                `;
            });
        }
        
        return html;
    }

    getFileIcon(extension) {
        const icons = {
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
            'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵',
            'mp4': '🎬', 'webm': '🎬', 'avi': '🎬',
            'ttf': '🔤', 'otf': '🔤', 'woff': '🔤', 'woff2': '🔤',
            'pdf': '📕', 'doc': '📄', 'docx': '📄',
            'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️'
        };
        return icons[extension] || '📎';
    }

    showFileManager() {
        document.getElementById('file-manager-modal').style.display = 'block';
        this.renderFileTree();
        this.updateFileSelector();
    }

    hideFileManager() {
        document.getElementById('file-manager-modal').style.display = 'none';
    }

    selectFile(filePath) {
        this.currentFile = filePath;
        
        // Update UI
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-path="${filePath}"]`)?.classList.add('active');
        
        this.loadFile(filePath);
    }

    loadFile(filePath) {
        const [folder, filename] = this.parseFilePath(filePath);
        const fileType = this.getFileType(filename);
        
        let content = '';
        if (folder) {
            content = this.projectStructure.folders[folder]?.files?.[fileType]?.[filename] || '';
        } else {
            content = this.projectStructure.files[fileType]?.[filename] || '';
        }
        
        const editor = document.getElementById('file-editor');
        if (editor) {
            editor.value = content;
            editor.dataset.path = filePath;
            editor.dataset.type = fileType;
        }
        
        this.updatePreview();
    }

    saveCurrentFile() {
        const editor = document.getElementById('file-editor');
        if (!editor || !this.currentFile) return;
        
        const content = editor.value;
        const [folder, filename] = this.parseFilePath(this.currentFile);
        const fileType = this.getFileType(filename);
        
        if (folder) {
            if (!this.projectStructure.folders[folder]) {
                this.projectStructure.folders[folder] = { type: 'folder', files: {} };
            }
            if (!this.projectStructure.folders[folder].files[fileType]) {
                this.projectStructure.folders[folder].files[fileType] = {};
            }
            this.projectStructure.folders[folder].files[fileType][filename] = content;
        } else {
            this.projectStructure.files[fileType][filename] = content;
        }
        
        this.saveProjectStructure();
        this.updatePreview();
        this.showNotification('File saved successfully!');
    }

    createNewFile() {
        const name = prompt('Enter file name (with extension):');
        if (!name) return;
        
        const type = this.getFileType(name);
        if (!type) {
            alert('Unsupported file type!');
            return;
        }
        
        const folder = prompt('Enter folder path (leave empty for root):', '');
        
        if (folder) {
            if (!this.projectStructure.folders[folder]) {
                this.projectStructure.folders[folder] = { type: 'folder', files: {} };
            }
            if (!this.projectStructure.folders[folder].files[type]) {
                this.projectStructure.folders[folder].files[type] = {};
            }
            this.projectStructure.folders[folder].files[type][name] = '';
        } else {
            this.projectStructure.files[type][name] = '';
        }
        
        this.saveProjectStructure();
        this.renderFileTree();
        this.updateFileSelector();
    }

    createNewFolder() {
        const name = prompt('Enter folder name:');
        if (!name) return;
        
        this.projectStructure.folders[name] = {
            type: 'folder',
            files: {}
        };
        
        this.saveProjectStructure();
        this.renderFileTree();
    }

    deleteCurrentFile() {
        if (!this.currentFile || !confirm('Are you sure you want to delete this file?')) {
            return;
        }
        
        const [folder, filename] = this.parseFilePath(this.currentFile);
        const fileType = this.getFileType(filename);
        
        if (folder) {
            if (this.projectStructure.folders[folder]?.files?.[fileType]?.[filename]) {
                delete this.projectStructure.folders[folder].files[fileType][filename];
            }
        } else {
            if (this.projectStructure.files[fileType]?.[filename]) {
                delete this.projectStructure.files[fileType][filename];
            }
        }
        
        this.saveProjectStructure();
        this.currentFile = null;
        document.getElementById('file-editor').value = '';
        this.renderFileTree();
        this.updateFileSelector();
        this.updatePreview();
    }

    renameCurrentFile() {
        if (!this.currentFile) return;
        
        const newName = prompt('Enter new file name (with extension):', this.currentFile.split('/').pop());
        if (!newName || newName === this.currentFile.split('/').pop()) return;
        
        const [folder, oldFilename] = this.parseFilePath(this.currentFile);
        const oldFileType = this.getFileType(oldFilename);
        const newFileType = this.getFileType(newName);
        
        if (oldFileType !== newFileType) {
            alert('Cannot rename to different file type!');
            return;
        }
        
        // Get content
        let content = '';
        if (folder) {
            content = this.projectStructure.folders[folder]?.files?.[oldFileType]?.[oldFilename] || '';
        } else {
            content = this.projectStructure.files[oldFileType]?.[oldFilename] || '';
        }
        
        // Delete old
        this.deleteCurrentFile();
        
        // Create new with same content
        if (folder) {
            if (!this.projectStructure.folders[folder].files[newFileType]) {
                this.projectStructure.folders[folder].files[newFileType] = {};
            }
            this.projectStructure.folders[folder].files[newFileType][newName] = content;
        } else {
            this.projectStructure.files[newFileType][newName] = content;
        }
        
        this.saveProjectStructure();
        this.currentFile = folder ? `${folder}/${newName}` : newName;
        this.renderFileTree();
        this.updateFileSelector();
        this.showNotification('File renamed successfully!');
    }

    uploadAssets() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,.pdf,.zip,.mp3,.mp4,.ttf,.woff,.woff2';
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.projectStructure.files.assets[file.name] = {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        content: event.target.result.split(',')[1], // Base64
                        lastModified: new Date().toISOString()
                    };
                    
                    this.saveProjectStructure();
                    this.renderFileTree();
                    this.updateFileSelector();
                    this.showNotification(`Uploaded: ${file.name}`);
                };
                reader.readAsDataURL(file);
            });
        };
        
        input.click();
    }

    updateFileSelector() {
        const selector = document.getElementById('file-selector');
        if (!selector) return;
        
        selector.innerHTML = '<option value="">Select a file to edit</option>';
        
        // Add all HTML files
        Object.keys(this.projectStructure.files.html || {}).forEach(filename => {
            selector.add(new Option(`📄 ${filename}`, filename));
        });
        
        // Add all CSS files
        Object.keys(this.projectStructure.files.css || {}).forEach(filename => {
            selector.add(new Option(`🎨 ${filename}`, filename));
        });
        
        // Add all JS files
        Object.keys(this.projectStructure.files.js || {}).forEach(filename => {
            selector.add(new Option(`⚡ ${filename}`, filename));
        });
        
        // Add files from folders
        Object.entries(this.projectStructure.folders).forEach(([folderName, folderData]) => {
            Object.keys(folderData.files?.html || {}).forEach(filename => {
                selector.add(new Option(`📁 ${folderName}/📄 ${filename}`, `${folderName}/${filename}`));
            });
            Object.keys(folderData.files?.css || {}).forEach(filename => {
                selector.add(new Option(`📁 ${folderName}/🎨 ${filename}`, `${folderName}/${filename}`));
            });
            Object.keys(folderData.files?.js || {}).forEach(filename => {
                selector.add(new Option(`📁 ${folderName}/⚡ ${filename}`, `${folderName}/${filename}`));
            });
        });
    }

    parseFilePath(filePath) {
        if (filePath.includes('/')) {
            const parts = filePath.split('/');
            const filename = parts.pop();
            const folder = parts.join('/');
            return [folder, filename];
        }
        return ['', filePath];
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['html', 'htm'].includes(ext)) return 'html';
        if (ext === 'css') return 'css';
        if (ext === 'js') return 'js';
        return 'assets';
    }

    saveProjectStructure() {
        localStorage.setItem('projectStructure', JSON.stringify(this.projectStructure));
    }

    // Enhanced preview generation for multi-page projects
    generateUniversalHTML() {
        // Collect all files
        const htmlFiles = { ...this.projectStructure.files.html };
        const cssFiles = { ...this.projectStructure.files.css };
        const jsFiles = { ...this.projectStructure.files.js };
        const assets = { ...this.projectStructure.files.assets };
        
        // Add files from folders
        Object.values(this.projectStructure.folders).forEach(folder => {
            Object.assign(htmlFiles, folder.files?.html || {});
            Object.assign(cssFiles, folder.files?.css || {});
            Object.assign(jsFiles, folder.files?.js || {});
        });
        
        // Create navigation between pages
        const navigation = Object.keys(htmlFiles).map(filename => 
            `<li><a href="${filename}" onclick="loadPage('${filename}'); return false;">${filename}</a></li>`
        ).join('');
        
        // Generate main HTML with iframe navigation
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.getElementById('project-name')?.value || 'Multi-page Project'}</title>
    <style>
        body { margin: 0; font-family: Arial; }
        .sidebar { width: 250px; height: 100vh; background: #2d3748; position: fixed; left: 0; top: 0; overflow-y: auto; }
        .content { margin-left: 250px; height: 100vh; }
        iframe { width: 100%; height: 100%; border: none; }
        .nav-list { list-style: none; padding: 20px; }
        .nav-list li { margin: 10px 0; }
        .nav-list a { color: white; text-decoration: none; padding: 8px 12px; display: block; border-radius: 4px; }
        .nav-list a:hover { background: #4a5568; }
        .nav-list a.active { background: #4299e1; }
    </style>
</head>
<body>
    <div class="sidebar">
        <h2 style="color: white; padding: 20px;">Pages</h2>
        <ul class="nav-list">${navigation}</ul>
    </div>
    <div class="content">
        <iframe id="page-frame" src="${this.projectStructure.mainHtml}"></iframe>
    </div>
    
    <script>
        function loadPage(page) {
            document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('page-frame').src = page;
        }
        
        // Make functions globally available
        ${Object.keys(jsFiles).map(filename => `
            // ${filename}
            try {
                ${jsFiles[filename]}
            } catch(e) {
                console.error('Error in ${filename}:', e);
            }
        `).join('\n')}
    </script>
</body>
</html>`;
    }

    // Generate deployment package
    async generateDeploymentPackage() {
        const package = {
            project: this.projectStructure,
            config: {
                mainHtml: this.projectStructure.mainHtml,
                version: '1.0.0',
                createdAt: new Date().toISOString()
            }
        };
        
        // Convert assets to base64
        const assets = {};
        Object.entries(this.projectStructure.files.assets || {}).forEach(([name, asset]) => {
            assets[name] = {
                name: asset.name,
                type: asset.type,
                content: asset.content,
                size: asset.size
            };
        });
        
        package.assets = assets;
        return package;
    }

    // Save and deploy with all files
    async saveProject() {
        const token = Cookies.get('token');
        if (!token) {
            alert('Please login to save your project');
            return;
        }

        const saveBtn = document.getElementById('save-project');
        const originalText = saveBtn.innerHTML;
        
        if (saveBtn) {
            saveBtn.innerHTML = '💾 Saving...';
            saveBtn.disabled = true;
        }

        try {
            const projectName = document.getElementById('project-name')?.value.trim() || 'Untitled Project';
            const deploymentPackage = await this.generateDeploymentPackage();
            
            const response = await fetch('/api/frontend/save-multi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: projectName,
                    package: deploymentPackage,
                    deploymentHTML: this.generateUniversalHTML()
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
                throw new Error(result.error || 'Failed to save project');
            }
        } catch (error) {
            console.error('Error saving project:', error);
            this.showNotification('Error saving project: ' + error.message, 'error');
            if (saveBtn) {
                saveBtn.innerHTML = '❌ Failed';
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                }, 2000);
            }
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
            }
        }
    }

    // Update preview to handle multiple pages
    updatePreview() {
        try {
            // For now, preview the main HTML file
            const mainHtml = this.projectStructure.files.html[this.projectStructure.mainHtml] || 
                           Object.values(this.projectStructure.files.html)[0] || 
                           '<h1>No HTML files found</h1>';
            
            // Get associated CSS and JS for the main page
            const css = this.projectStructure.files.css['style.css'] || '';
            const js = this.projectStructure.files.js['script.js'] || '';
            
            const previewHTML = this.generateDeploymentHTML(mainHtml, css, js);
            const frame = document.getElementById('preview-frame');
            if (frame) {
                frame.srcdoc = previewHTML;
            }
        } catch (error) {
            console.error('Preview update error:', error);
        }
    }

    // Toggle pages preview panel
    togglePagesPreview() {
        document.getElementById('pages-preview').classList.toggle('open');
        this.renderPagesPreview();
    }

    hidePagesPreview() {
        document.getElementById('pages-preview').classList.remove('open');
    }

    renderPagesPreview() {
        const container = document.querySelector('.pages-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.keys(this.projectStructure.files.html || {}).forEach(filename => {
            const html = this.projectStructure.files.html[filename];
            const card = document.createElement('div');
            card.className = 'page-preview-card';
            card.innerHTML = `
                <div class="page-preview-header">
                    <strong>${filename}</strong>
                    <button class="btn-small" onclick="frontendEditor.setMainPage('${filename}')">
                        ${filename === this.projectStructure.mainHtml ? '✅ Main' : 'Set as Main'}
                    </button>
                </div>
                <iframe class="page-preview-frame" srcdoc="${this.escapeHtml(this.generatePagePreviewHTML(html))}"></iframe>
            `;
            container.appendChild(card);
        });
    }

    generatePagePreviewHTML(html) {
        // Simple preview without full CSS/JS
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { padding: 20px; font-family: Arial; }
        img { max-width: 100%; }
    </style>
</head>
<body>${html}</body>
</html>`;
    }

    setMainPage(filename) {
        this.projectStructure.mainHtml = filename;
        this.saveProjectStructure();
        this.updatePreview();
        this.renderPagesPreview();
        this.showNotification(`Main page set to: ${filename}`);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveCurrentFile();
        }
        
        // Ctrl+F to open file manager
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.showFileManager();
        }
    }
}

// Initialize enhanced editor
document.addEventListener('DOMContentLoaded', () => {
    window.frontendEditor = new AdvancedFrontendEditor();
});