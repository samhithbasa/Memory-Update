console.log('Simple Frontend Editor JavaScript loaded');

class SimpleFrontendEditor {
    constructor() {
        console.log('Constructor called');

        // SIMPLIFIED: Only one file of each type
        this.files = {
            html: { 'index.html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>My Project</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n    <button onclick="showAlert()">Click Me</button>\n</body>\n</html>' },
            css: { 'style.css': 'body {\n    font-family: Arial, sans-serif;\n    padding: 20px;\n    text-align: center;\n}\n\nh1 {\n    color: #333;\n}\n\nbutton {\n    padding: 10px 20px;\n    background: #4CAF50;\n    color: white;\n    border: none;\n    border-radius: 5px;\n    cursor: pointer;\n}' },
            js: { 'script.js': 'function showAlert() {\n    alert("Hello from JavaScript!");\n}\n\ndocument.addEventListener("DOMContentLoaded", function() {\n    console.log("Project loaded!");\n});' }
        };

        this.currentFile = {
            html: 'index.html',
            css: 'style.css',
            js: 'script.js'
        };

        this.isAuthenticated = false;
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        console.log('Simple editor init called');
        this.bindEvents();
        this.updatePreview();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Save button
        const saveProjectBtn = document.getElementById('save-project');
        if (saveProjectBtn) saveProjectBtn.addEventListener('click', () => this.saveProject());

        // Refresh preview
        const refreshPreviewBtn = document.getElementById('refresh-preview');
        if (refreshPreviewBtn) refreshPreviewBtn.addEventListener('click', () => this.updatePreview());

        // Editor listeners
        const htmlEditor = document.getElementById('html-editor');
        const cssEditor = document.getElementById('css-editor');
        const jsEditor = document.getElementById('js-editor');

        const debouncedPreview = this.debounce(() => this.updatePreview(), 500);

        if (htmlEditor) {
            htmlEditor.value = this.files.html['index.html'];
            htmlEditor.addEventListener('input', (e) => {
                this.files.html['index.html'] = e.target.value;
                debouncedPreview();
            });
        }

        if (cssEditor) {
            cssEditor.value = this.files.css['style.css'];
            cssEditor.addEventListener('input', (e) => {
                this.files.css['style.css'] = e.target.value;
                debouncedPreview();
            });
        }

        if (jsEditor) {
            jsEditor.value = this.files.js['script.js'];
            jsEditor.addEventListener('input', (e) => {
                this.files.js['script.js'] = e.target.value;
                debouncedPreview();
            });
        }

        // Auth button
        const authToggleEl = document.getElementById('auth-toggle');
        if (authToggleEl) {
            authToggleEl.addEventListener('click', () => this.handleAuthToggle());
        }

        // Remove asset manager and multi-file buttons (optional)
        const assetsManagerBtn = document.getElementById('assets-manager');
        if (assetsManagerBtn) assetsManagerBtn.style.display = 'none';

        const addFileBtn = document.getElementById('add-file');
        if (addFileBtn) addFileBtn.style.display = 'none';

        const addHtmlBtn = document.getElementById('add-html-file');
        if (addHtmlBtn) addHtmlBtn.style.display = 'none';

        const addCssBtn = document.getElementById('add-css-file');
        if (addCssBtn) addCssBtn.style.display = 'none';

        const addJsBtn = document.getElementById('add-js-file');
        if (addJsBtn) addJsBtn.style.display = 'none';
    }

    debounce(func, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func(...args), delay);
        };
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

    generateSimpleHTML() {
        console.log('Generating simple HTML');

        try {
            const htmlContent = this.files.html['index.html'] || '';
            const cssContent = this.files.css['style.css'] || '';
            const jsContent = this.files.js['script.js'] || '';
            const projectName = document.getElementById('project-name')?.value || 'My Simple Project';

            // DEBUG: Check what's in JS content
            console.log('JS Content (first 100 chars):', jsContent.substring(0, 100));
            console.log('JS Content contains script tag?', jsContent.includes('<script>'));

            // Clean JavaScript content - remove any accidental HTML tags
            let cleanJS = jsContent;

            // Remove <script> tags if they exist (but keep the content)
            if (cleanJS.includes('<script>')) {
                console.log('⚠️ Found <script> tags in JS content, removing them...');
                cleanJS = cleanJS.replace(/<script\b[^>]*>/gi, '').replace(/<\/script>/gi, '');
            }

            // Escape any remaining HTML-like content in JS
            cleanJS = cleanJS
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

            // Generate clean HTML
            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(projectName)}</title>
    <style>
        ${cssContent}
    </style>
</head>
<body>
    ${htmlContent}
    <script>
        // User JavaScript
        ${cleanJS}
    </script>
</body>
</html>`;

            console.log('✅ HTML generated successfully, length:', html.length);
            return html;

        } catch (error) {
            console.error('❌ Error generating HTML:', error);
            return '<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error generating preview</h1></body></html>';
        }
    }

    // Add this helper method to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updatePreview() {
        console.log('Updating preview...');

        try {
            const fullHTML = this.generateSimpleHTML();
            const frame = document.getElementById('preview-frame');

            if (frame) {
                frame.srcdoc = fullHTML;
                frame.onload = () => {
                    console.log('✅ Preview loaded successfully');
                };
            }
        } catch (error) {
            console.error('Preview error:', error);
        }
    }

    getProjectUrl(projectId) {
        if (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1') {
            return `http://localhost:${window.location.port || 3000}/frontend/${projectId}`;
        }
        return `https://${window.location.hostname}/frontend/${projectId}`;
    }

    async saveProject() {
        const token = Cookies.get('token');
        if (!token) {
            alert('Please login to save your project');
            window.location.href = '/login.html';
            return;
        }

        const saveBtn = document.getElementById('save-project');
        const originalText = saveBtn ? saveBtn.innerHTML : 'Save';

        // Add saving state
        if (saveBtn) {
            saveBtn.innerHTML = '💾 Saving...';
            saveBtn.disabled = true;
        }

        const projectNameEl = document.getElementById('project-name');
        const projectName = projectNameEl ? projectNameEl.value.trim() || 'Untitled Project' : 'Untitled Project';

        try {
            const deploymentHTML = this.generateSimpleHTML();

            console.log('Saving project with HTML length:', deploymentHTML.length);

            const response = await fetch('/api/frontend/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: projectName,
                    files: this.files,
                    assets: [], // Empty assets for simple version
                    deploymentHTML: deploymentHTML
                })
            });

            const result = await response.json();

            if (result.success) {
                const shareUrl = this.getProjectUrl(result.projectId);

                // Show success notification
                const notification = document.getElementById('success-notification');
                if (notification) {
                    notification.style.display = 'flex';
                    setTimeout(() => {
                        notification.style.display = 'none';
                    }, 4000);
                }

                // Copy URL to clipboard
                navigator.clipboard.writeText(shareUrl).then(() => {
                    console.log('Share URL copied:', shareUrl);
                });

                if (saveBtn) {
                    saveBtn.innerHTML = '✅ Saved!';
                    setTimeout(() => {
                        saveBtn.innerHTML = originalText;
                    }, 2000);
                }

                console.log('Project saved successfully:', shareUrl);
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
                saveBtn.disabled = false;
            }
        }
    }

    async handleAuthToggle() {
        const token = Cookies.get('token');

        if (token) {
            // Logout
            try {
                await fetch('/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                Cookies.remove('token');
                window.location.reload();
            } catch (error) {
                console.error('Logout error:', error);
                Cookies.remove('token');
                window.location.reload();
            }
        } else {
            // Login
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        }
    }
}

// Initialize editor
document.addEventListener('DOMContentLoaded', () => {
    window.frontendEditor = new SimpleFrontendEditor();
});