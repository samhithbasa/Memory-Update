console.log('Simple Frontend Editor JavaScript loaded');

class SimpleFrontendEditor {
    constructor() {
        this.html = '';
        this.css = '';
        this.js = '';
        this.isAuthenticated = false;
        this.baseUrl = window.location.origin;
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

    generateHTML() {
        const projectName = document.getElementById('project-name')?.value || 'My Project';
        
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
        ${this.js}
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

    // Auth Methods (keep same as before)
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

            // Generate final HTML
            const deploymentHTML = this.generateHTML();

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
            n.style.display = 'flex';
            setTimeout(() => (n.style.display = 'none'), 4000);
        }
    }
}

// Initialize editor
document.addEventListener('DOMContentLoaded', () => {
    window.frontendEditor = new SimpleFrontendEditor();
});