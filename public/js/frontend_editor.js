console.log('Frontend Editor JavaScript loaded');

class FrontendEditor {
    constructor() {
        this.currentProject = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updatePreview();
        this.checkAuth();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Editor changes
        document.getElementById('html-editor').addEventListener('input', () => this.updatePreview());
        document.getElementById('css-editor').addEventListener('input', () => this.updatePreview());
        document.getElementById('js-editor').addEventListener('input', () => this.updatePreview());

        // Save project
        document.getElementById('save-project').addEventListener('click', () => this.saveProject());

        // Projects modal
        document.getElementById('show-projects').addEventListener('click', () => this.showProjects());
        document.querySelector('.modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('projects-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideModal();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    }

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Update preview when switching to preview tab
        if (tabName === 'preview') {
            this.updatePreview();
        }
    }

    updatePreview() {
        const html = document.getElementById('html-editor').value;
        const css = document.getElementById('css-editor').value;
        const js = document.getElementById('js-editor').value;

        const previewFrame = document.getElementById('preview-frame');
        const previewDocument = previewFrame.contentDocument || previewFrame.contentWindow.document;

        previewDocument.open();
        previewDocument.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>${css}</style>
            </head>
            <body>
                ${html}
                <script>${js}<\/script>
            </body>
            </html>
        `);
        previewDocument.close();
    }

    async saveProject() {
        const token = Cookies.get('token');
        if (!token) {
            alert('Please login to save your project');
            return;
        }

        const saveBtn = document.getElementById('save-project');
        const originalText = saveBtn.innerHTML;

        // Add saving state
        saveBtn.innerHTML = '💾 Saving...';
        saveBtn.classList.add('saving');
        saveBtn.disabled = true;

        const projectName = document.getElementById('project-name').value.trim() || 'Untitled Project';
        const html = document.getElementById('html-editor').value;
        const css = document.getElementById('css-editor').value;
        const js = document.getElementById('js-editor').value;

        try {
            const response = await fetch('/api/frontend/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: projectName,
                    html: html,
                    css: css,
                    js: js
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessNotification(result.shareUrl);
                // Briefly show success state
                saveBtn.innerHTML = '✅ Saved!';
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                }, 2000);
            } else {
                alert('Failed to save project: ' + result.error);
                saveBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error saving project. Please try again.');
            saveBtn.innerHTML = '❌ Failed';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
            }, 2000);
        } finally {
            saveBtn.classList.remove('saving');
            saveBtn.disabled = false;
        }
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
            const response = await fetch('/api/frontend/projects', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load projects');
            }

            const projects = await response.json();
            this.displayProjects(projects);
            document.getElementById('projects-modal').style.display = 'block';
        } catch (error) {
            console.error('Error loading projects:', error);
            alert('Error loading projects. Please try again.');
        }
    }

    displayProjects(projects) {
        const projectsList = document.getElementById('projects-list');

        if (projects.length === 0) {
            projectsList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No projects found. Create your first project!</p>';
            return;
        }

        projectsList.innerHTML = projects.map(project => `
        <div class="project-item">
            <div class="project-info">
                <h3>${this.escapeHtml(project.name)}</h3>
                <p class="project-meta">
                    <strong>Created:</strong> ${new Date(project.createdAt).toLocaleDateString()} • 
                    <strong>Updated:</strong> ${new Date(project.updatedAt).toLocaleDateString()}
                </p>
                <div class="project-link-container">
                    <span class="project-link-label">Share Link:</span>
                    <div class="link-copy-group">
                        <input type="text" class="project-link-input" value="${this.escapeHtml(project.shareUrl)}" readonly>
                        <button class="copy-link-btn" onclick="frontendEditor.copyProjectLink('${this.escapeHtml(project.shareUrl)}', this)">
                            📋 Copy
                        </button>
                    </div>
                </div>
            </div>
            <div class="project-actions">
                <button class="btn btn-open" onclick="frontendEditor.openProject('${this.escapeHtml(project.id)}')">
                    Open
                </button>
                <button class="btn btn-delete" onclick="frontendEditor.deleteProject('${this.escapeHtml(project.id)}', '${this.escapeHtml(project.name)}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
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