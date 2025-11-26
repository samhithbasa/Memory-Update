console.log('🔧 Frontend Editor JavaScript loading...');

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

        console.log('📁 Initial files:', this.files);

        // Add message listener for preview with better error handling
        window.addEventListener('message', (event) => {
            console.log('📨 Message received from preview:', event.data);
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

    init() {
        console.log('🔧 Setting up editor...');
        this.bindEvents();
        this.renderFileTree();
        this.createEditorTab('html', 'index.html');
        this.updatePreview();
        this.checkAuth();
        console.log('✅ Editor setup complete');
    }

    updatePreview() {
        console.log('🔄 Updating preview...');
        console.log('📝 Current HTML:', this.files.html[0].content.substring(0, 100) + '...');

        const previewFrame = document.getElementById('preview-frame');
        if (!previewFrame) {
            console.error('❌ Preview frame not found in DOM');
            return;
        }

        try {
            // Get all file contents
            const htmlContent = this.files.html.map(file => file.content).join('\n');
            const cssContent = this.files.css.map(file => file.content).join('\n');
            const jsContent = this.files.js.map(file => file.content).join('\n');

            console.log('📊 Content lengths - HTML:', htmlContent.length, 'CSS:', cssContent.length, 'JS:', jsContent.length);

            const previewDocument = previewFrame.contentDocument || previewFrame.contentWindow.document;
            
            // Clear any existing content
            previewDocument.open();
            
            const previewHTML = `
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
            background: white;
            color: black;
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
        
        /* Make sure iframe content is visible */
        html, body {
            width: 100%;
            height: 100%;
            overflow: auto;
        }
    </style>
</head>
<body>
    <!-- Preview Content -->
    ${htmlContent}
    
    <div id="preview-status" style="display: none; background: #4CAF50; color: white; padding: 10px; margin: 10px; border-radius: 5px;">
        Preview Loaded Successfully
    </div>
    
    <script>
        console.log('🔧 Preview script starting...');
        
        // Show that preview is loaded
        document.getElementById('preview-status').style.display = 'block';
        
        // Error handling for preview
        window.addEventListener('error', function(e) {
            console.error('❌ Preview Error:', e.error);
            console.error('Error details:', e.message, 'at', e.filename, 'line', e.lineno);
            
            // Send error to parent
            if (window.parent) {
                window.parent.postMessage({
                    type: 'preview-error',
                    error: e.message,
                    filename: e.filename,
                    lineno: e.lineno
                }, '*');
            }
        });
        
        // Console redirection with better error handling
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        ['log', 'error', 'warn', 'info'].forEach(method => {
            console[method] = function(...args) {
                originalConsole[method].apply(console, args);
                if (window.parent) {
                    try {
                        window.parent.postMessage({
                            type: 'console',
                            method: method,
                            args: args.map(arg => {
                                try {
                                    if (typeof arg === 'object') {
                                        return JSON.stringify(arg, null, 2);
                                    }
                                    return String(arg);
                                } catch (e) {
                                    return '[Unserializable object]';
                                }
                            })
                        }, '*');
                    } catch (e) {
                        originalConsole.error('Failed to send console message:', e);
                    }
                }
            };
        });
        
        // Load JavaScript with error handling
        try {
            console.log('📜 Executing JavaScript content...');
            ${jsContent}
        } catch (jsError) {
            console.error('❌ JavaScript execution error:', jsError);
        }
        
        // Notify parent that preview is ready
        setTimeout(() => {
            console.log('✅ Preview fully loaded');
            if (window.parent) {
                window.parent.postMessage({ 
                    type: 'preview-ready',
                    timestamp: Date.now()
                }, '*');
            }
        }, 100);
        
        // Test that JavaScript is working
        console.log('🧪 Testing JavaScript execution...');
        if (typeof showAlert === 'function') {
            console.log('✅ showAlert function is available');
        } else {
            console.log('⚠️ showAlert function not found');
        }
    </script>
</body>
</html>`;

            console.log('📄 Writing preview HTML...');
            previewDocument.write(previewHTML);
            previewDocument.close();
            
            console.log('✅ Preview document written and closed');

        } catch (error) {
            console.error('❌ Error updating preview:', error);
            console.error('Error stack:', error.stack);
        }
    }

    // Update the showProjects method to add debugging
    async showProjects() {
        const token = Cookies.get('token');
        console.log('🔐 Token available:', !!token);
        
        if (!token) {
            alert('Please login to view your projects');
            return;
        }

        try {
            console.log('📂 Loading projects from API...');
            
            const response = await fetch('/api/frontend/projects', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('📡 API Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const projects = await response.json();
            console.log(`📁 Loaded ${projects.length} projects:`, projects);
            
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

    // Update the openProject method
    async openProject(projectId) {
        console.log('📂 Opening project:', projectId);
        
        try {
            const response = await fetch(`/api/frontend/project/${projectId}`);
            console.log('📡 Project API response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to load project: ${response.status}`);
            }

            const project = await response.json();
            console.log('📋 Project data loaded:', project);

            // Update project name
            document.getElementById('project-name').value = project.name || 'Untitled Project';
            console.log('📝 Project name set to:', project.name);

            // Update file contents
            this.files.html = [{ name: 'index.html', content: project.html || this.getDefaultHTML() }];
            this.files.css = [{ name: 'style.css', content: project.css || this.getDefaultCSS() }];
            this.files.js = [{ name: 'script.js', content: project.js || this.getDefaultJS() }];
            
            console.log('📁 Files updated:', {
                htmlLength: this.files.html[0].content.length,
                cssLength: this.files.css[0].content.length,
                jsLength: this.files.js[0].content.length
            });

            // Update UI
            this.renderFileTree();
            this.updatePreview();
            this.switchTab('preview');
            this.hideModal();
            
            console.log('✅ Project opened successfully');

        } catch (error) {
            console.error('❌ Error opening project:', error);
            alert('Error opening project: ' + error.message);
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