class ZeoClient {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.ws = null;
        this.currentJobId = null;
        
        // Initialize MSAL
        this.initializeMSAL();
        this.initializeSplashScreen();
    }
    
    initializeMSAL() {
        // MSAL Configuration
        this.msalConfig = {
            auth: {
                clientId: "e406fc3a-55f9-4477-9039-09f27292560e", // ZEO Clinical AI Assistant
                authority: "https://login.microsoftonline.com/c97cb1fb-d321-401b-b372-417a528542ba", // healthhealth.io tenant
                redirectUri: window.location.origin + "/",
                postLogoutRedirectUri: window.location.origin + "/"
            },
            cache: {
                cacheLocation: "sessionStorage",
                storeAuthStateInCookie: false,
            }
        };
        
        this.loginRequest = {
            scopes: ["User.Read", "profile", "openid", "email"]
        };
        
        // Initialize MSAL instance
        this.msalInstance = new msal.PublicClientApplication(this.msalConfig);
        
        // Handle redirect promise
        this.msalInstance.handleRedirectPromise()
            .then((response) => {
                if (response) {
                    this.handleAuthResponse(response);
                }
            })
            .catch((error) => {
                console.error('Auth redirect error:', error);
            });
    }
    
    async initializeSplashScreen() {
        // Show splash screen animation
        await this.animateSplashScreen();
        
        // Initialize main app after splash
        this.initializeElements();
        this.setupEventListeners();
        this.connectWebSocket();
        this.initializeAnimations();
        
        // Show auth modal after splash
        this.showAuthModal();
    }
    
    initializeElements() {
        this.uploadSection = document.getElementById('uploadSection');
        this.processingSection = document.getElementById('processingSection');
        this.resultsSection = document.getElementById('resultsSection');
        
        this.recordBtn = document.getElementById('recordBtn');
        this.audioFileInput = document.getElementById('audioFile');
        
        this.statusBadge = document.getElementById('statusBadge');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.transcriptionContent = document.getElementById('transcriptionContent');
        this.newTranscriptionBtn = document.getElementById('newTranscriptionBtn');
        this.exportBtn = document.getElementById('exportBtn');
        
        // Chat elements
        this.chatToggle = document.getElementById('chatToggle');
        this.chatPanel = document.getElementById('chatPanel');
        this.chatClose = document.getElementById('chatClose');
        this.chatOverlay = document.getElementById('chatOverlay');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.chatSend = document.getElementById('chatSend');
        this.chatTyping = document.getElementById('chatTyping');
        
        // Auth elements
        this.authModal = document.getElementById('authModal');
        this.entraForm = document.getElementById('entraForm');
        this.entraLoginButton = document.getElementById('entraLoginButton');
        this.entraStatus = document.getElementById('entraStatus');
        this.loginInfo = document.getElementById('loginInfo');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');
        this.userEmail = document.getElementById('userEmail');
        this.userTenant = document.getElementById('userTenant');
    }
    
    setupEventListeners() {
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.audioFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.newTranscriptionBtn.addEventListener('click', () => this.resetToUpload());
        this.exportBtn.addEventListener('click', () => this.exportTranscription());
        
        // Chat event listeners
        this.chatToggle.addEventListener('click', () => this.toggleChat());
        this.chatClose.addEventListener('click', () => this.closeChat());
        this.chatOverlay.addEventListener('click', () => this.closeChat());
        this.chatSend.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Auth event listeners
        this.entraLoginButton.addEventListener('click', () => this.handleEntraLogin());
    }
    
    connectWebSocket() {
        // Check if running on Vercel (no WebSocket support)
        const isVercel = window.location.hostname.includes('vercel.app');
        
        if (isVercel) {
            console.log('Running on Vercel - using polling instead of WebSocket');
            this.ws = null;
            this.usePolling = true;
            return;
        }
        
        // WebSocket for local development
        const isProduction = window.location.protocol === 'https:';
        const wsProtocol = isProduction ? 'wss:' : 'ws:';
        const wsHost = 'localhost:8080';
        
        this.ws = new WebSocket(`${wsProtocol}//${wsHost}`);
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'progress' && data.jobId === this.currentJobId) {
                this.updateProgress(data.progress, data.status, data.transcription);
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected, reconnecting...');
            setTimeout(() => this.connectWebSocket(), 3000);
        };
    }
    
    // Polling for Vercel deployment
    startPolling() {
        this.pollingInterval = setInterval(async () => {
            if (!this.currentJobId) {
                clearInterval(this.pollingInterval);
                return;
            }
            
            try {
                const response = await fetch(`/api/status/${this.currentJobId}`);
                const job = await response.json();
                
                this.updateProgress(job.progress, job.status, job.transcription);
                
                if (job.status === 'completed' || job.status === 'error') {
                    clearInterval(this.pollingInterval);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 1000);
    }
    
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/wav' });
                this.uploadAudio(blob, 'gravacao.wav');
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            this.recordBtn.innerHTML = '<i data-lucide="square" class="btn-icon"></i>Parar Gravação';
            lucide.createIcons();
            this.recordBtn.classList.add('recording');
            
        } catch (error) {
            console.error('Erro ao acessar microfone:', error);
            alert('Erro ao acessar o microfone. Verifique as permissões.');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            this.recordBtn.innerHTML = '<i data-lucide="mic" class="btn-icon"></i>Iniciar Gravação';
            lucide.createIcons();
            this.recordBtn.classList.remove('recording');
        }
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.uploadAudio(file, file.name);
        }
    }
    
    async uploadAudio(audioBlob, filename) {
        const formData = new FormData();
        formData.append('audio', audioBlob, filename);
        
        try {
            this.showProcessingSection();
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            if (result.jobId) {
                this.currentJobId = result.jobId;
            } else {
                throw new Error('Falha no upload');
            }
            
        } catch (error) {
            console.error('Erro no upload:', error);
            alert('Erro ao fazer upload do áudio');
            this.resetToUpload();
        }
        
        // Start polling if not using WebSocket
        if (this.usePolling && this.currentJobId) {
            this.startPolling();
        }
    }
    
    showProcessingSection() {
        // Animate out upload section
        gsap.to(this.uploadSection, {
            opacity: 0,
            y: -30,
            duration: 0.5,
            ease: "power2.in",
            onComplete: () => {
                this.uploadSection.classList.add('hidden');
                this.resultsSection.classList.add('hidden');
                this.processingSection.classList.remove('hidden');
                
                // Animate in processing section
                gsap.fromTo(this.processingSection, 
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
                );
            }
        });
        
        this.updateProgress(0, 'processing');
    }
    
    updateProgress(progress, status, transcription = null) {
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `${Math.round(progress)}%`;
        
        if (status === 'completed' && transcription) {
            this.showResults(transcription);
        } else if (status === 'processing') {
            this.statusBadge.textContent = 'Processando...';
            this.statusBadge.className = 'status-badge';
        }
    }
    
    showResults(transcription) {
        // Animate out processing section
        gsap.to(this.processingSection, {
            opacity: 0,
            y: -30,
            duration: 0.5,
            ease: "power2.in",
            onComplete: () => {
                this.processingSection.classList.add('hidden');
                this.resultsSection.classList.remove('hidden');
                
                // Animate in results section
                gsap.fromTo(this.resultsSection, 
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
                );
                
                // Animate transcription text
                this.transcriptionContent.textContent = transcription;
                gsap.fromTo(this.transcriptionContent,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.8, delay: 0.3, ease: "power2.out" }
                );
            }
        });
    }
    
    resetToUpload() {
        // Animate current section out
        const currentSection = this.resultsSection.classList.contains('hidden') ? 
                              this.processingSection : this.resultsSection;
        
        gsap.to(currentSection, {
            opacity: 0,
            y: -30,
            duration: 0.5,
            ease: "power2.in",
            onComplete: () => {
                this.processingSection.classList.add('hidden');
                this.resultsSection.classList.add('hidden');
                this.uploadSection.classList.remove('hidden');
                
                // Animate upload section back in
                gsap.fromTo(this.uploadSection, 
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
                );
            }
        });
        
        this.currentJobId = null;
        this.audioFileInput.value = '';
        
        if (this.isRecording) {
            this.stopRecording();
        }
    }
    
    exportTranscription() {
        const text = this.transcriptionContent.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcricao-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    initializeAnimations() {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Entrance animations
        gsap.set(['.header', '.upload-card'], { opacity: 0, y: 30 });
        
        gsap.timeline()
            .to('.header', { 
                opacity: 1, 
                y: 0, 
                duration: 0.8, 
                ease: "power3.out" 
            })
            .to('.upload-card', { 
                opacity: 1, 
                y: 0, 
                duration: 0.8, 
                ease: "power3.out" 
            }, "-=0.4");
        
        // Add hover animations to buttons
        this.setupButtonAnimations();
    }
    
    setupButtonAnimations() {
        const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
        
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                gsap.to(button, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
            
            button.addEventListener('mouseleave', () => {
                gsap.to(button, {
                    scale: 1,
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
            
            button.addEventListener('mousedown', () => {
                gsap.to(button, {
                    scale: 0.95,
                    duration: 0.1,
                    ease: "power2.out"
                });
            });
            
            button.addEventListener('mouseup', () => {
                gsap.to(button, {
                    scale: 1.05,
                    duration: 0.1,
                    ease: "power2.out"
                });
            });
        });
    }
    
    async animateSplashScreen() {
        return new Promise((resolve) => {
            const tl = gsap.timeline();
            
            // Animate logo title
            tl.to('.splash-title', {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: "power3.out"
            })
            // Animate underline expansion
            .to('.splash-underline', {
                width: '120px',
                duration: 0.8,
                ease: "power2.out"
            }, "-=0.5")
            // Animate tagline
            .to('.splash-tagline', {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power2.out"
            }, "-=0.4")
            // Show loader
            .to('.splash-loader', {
                opacity: 1,
                duration: 0.4,
                ease: "power2.out"
            }, "-=0.2")
            // Wait for effect
            .to({}, { duration: 2 })
            // Complete
            .call(() => resolve());
        });
    }
    
    transitionToMainApp() {
        const splashScreen = document.getElementById('splashScreen');
        const mainApp = document.getElementById('mainApp');
        
        // Fade out splash
        gsap.to(splashScreen, {
            opacity: 0,
            scale: 0.95,
            duration: 0.8,
            ease: "power2.in",
            onComplete: () => {
                splashScreen.classList.add('hidden');
                
                // Show main app
                mainApp.style.opacity = '1';
                mainApp.style.visibility = 'visible';
                
                // Animate main app entrance
                gsap.fromTo(mainApp, 
                    { opacity: 0, scale: 1.05 },
                    { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }
                );
            }
        });
    }
    
    // Chat functionality
    toggleChat() {
        const isHidden = this.chatPanel.classList.contains('hidden');
        
        if (isHidden) {
            this.openChat();
        } else {
            this.closeChat();
        }
    }
    
    openChat() {
        this.chatPanel.classList.remove('hidden');
        this.chatOverlay.classList.remove('hidden');
        this.chatToggle.style.display = 'none';
        
        // Focus input
        setTimeout(() => {
            this.chatInput.focus();
        }, 400);
    }
    
    closeChat() {
        this.chatPanel.classList.add('hidden');
        this.chatOverlay.classList.add('hidden');
        this.chatToggle.style.display = 'flex';
        this.stopPolling();
    }
    
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        // Add user message
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        
        // Show typing indicator
        this.showTyping();
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    context: this.getConversationContext()
                })
            });
            
            const result = await response.json();
            
            this.hideTyping();
            
            if (result.success) {
                this.addMessage(result.response, 'bot');
            } else {
                this.addMessage('Desculpe, ocorreu um erro. Tente novamente.', 'bot');
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTyping();
            this.addMessage('Erro de conexão. Verifique sua internet.', 'bot');
        }
    }
    
    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        
        const time = new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i data-lucide="user" class="avatar-icon"></i>
                </div>
                <div class="message-content">
                    <p>${content}</p>
                    <span class="message-time">${time}</span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i data-lucide="bot" class="avatar-icon"></i>
                </div>
                <div class="message-content">
                    <p>${content}</p>
                    <span class="message-time">${time}</span>
                </div>
            `;
        }
        
        this.chatMessages.appendChild(messageDiv);
        
        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    showTyping() {
        this.chatTyping.classList.remove('hidden');
    }
    
    hideTyping() {
        this.chatTyping.classList.add('hidden');
    }
    
    getConversationContext() {
        // Get context from transcription if available
        const transcription = this.transcriptionContent?.textContent;
        return transcription ? { transcription } : null;
    }
    
    // Auth functionality
    showAuthModal() {
        const splashScreen = document.getElementById('splashScreen');
        
        // Check if user is already logged in
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            this.handleExistingAccount(accounts[0]);
            return;
        }
        
        // Hide splash screen
        gsap.to(splashScreen, {
            opacity: 0,
            scale: 0.95,
            duration: 0.8,
            ease: "power2.in",
            onComplete: () => {
                splashScreen.classList.add('hidden');
                
                // Show auth modal
                this.authModal.classList.remove('hidden');
            }
        });
    }
    
    async handleEntraLogin() {
        this.setAuthLoading(this.entraLoginButton, true);
        this.entraStatus.classList.remove('hidden');
        
        try {
            // Trigger Microsoft login popup
            const response = await this.msalInstance.loginPopup(this.loginRequest);
            this.handleAuthResponse(response);
            
        } catch (error) {
            console.error('Entra login error:', error);
            this.setAuthLoading(this.entraLoginButton, false);
            this.entraStatus.classList.add('hidden');
            this.showAuthError('Falha na autenticação Microsoft. Tente novamente.');
        }
    }
    
    async handleAuthResponse(response) {
        if (response) {
            // Get user info from Graph API
            await this.getUserInfo(response.account);
            this.authenticateUser(response.account);
        }
    }
    
    async handleExistingAccount(account) {
        // User is already logged in, show their info and proceed
        await this.getUserInfo(account);
        this.authenticateUser(account);
    }
    
    async getUserInfo(account) {
        try {
            // Get access token for Graph API
            const tokenRequest = {
                scopes: ["User.Read"],
                account: account
            };
            
            const response = await this.msalInstance.acquireTokenSilent(tokenRequest);
            
            // Call Graph API to get user details
            const userInfo = await this.callGraphAPI(response.accessToken);
            
            // Update UI with user info
            this.displayUserInfo(userInfo, account);
            
        } catch (error) {
            console.error('Error getting user info:', error);
        }
    }
    
    async callGraphAPI(accessToken) {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${accessToken}`);
        
        const response = await fetch("https://graph.microsoft.com/v1.0/me", {
            method: "GET",
            headers: headers
        });
        
        return await response.json();
    }
    
    displayUserInfo(userInfo, account) {
        // Display user information
        this.userName.textContent = userInfo.displayName || account.name;
        this.userEmail.textContent = userInfo.mail || account.username;
        this.userTenant.textContent = `Tenant: ${account.tenantId.substring(0, 8)}...`;
        
        // Create avatar with initials
        const initials = userInfo.displayName 
            ? userInfo.displayName.split(' ').map(n => n[0]).join('').substring(0, 2)
            : account.name.substring(0, 2);
        this.userAvatar.textContent = initials.toUpperCase();
        
        // Show user info
        this.loginInfo.classList.remove('hidden');
        this.entraStatus.classList.add('hidden');
    }
    
    authenticateUser(user) {
        // Store user session
        sessionStorage.setItem('zeo_user', JSON.stringify(user));
        
        // Hide auth modal and show main app
        this.authModal.classList.add('hidden');
        this.transitionToMainApp();
    }
    
    setAuthLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.style.opacity = '0.7';
            const buttonText = button.querySelector('.button-text');
            buttonText.textContent = 'Autenticando...';
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            const buttonText = button.querySelector('.button-text');
            buttonText.textContent = 'Entrar com Microsoft';
        }
    }
    
    showAuthError(message) {
        // Create error message element if it doesn't exist
        let errorEl = document.querySelector('.auth-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'auth-error';
            errorEl.style.cssText = `
                color: #ff6b6b;
                background: rgba(255, 107, 107, 0.1);
                border: 1px solid rgba(255, 107, 107, 0.3);
                padding: 0.75rem 1rem;
                border-radius: 12px;
                font-size: 0.875rem;
                margin-top: 1rem;
                text-align: center;
                font-family: 'Manrope', sans-serif;
            `;
            
            const activeForm = this.entraForm;
            activeForm.appendChild(errorEl);
        }
        
        errorEl.textContent = message;
        
        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorEl && errorEl.parentNode) {
                errorEl.parentNode.removeChild(errorEl);
            }
        }, 5000);
    }
    
    transitionToMainApp() {
        const mainApp = document.getElementById('mainApp');
        
        // Show main app
        mainApp.style.opacity = '1';
        mainApp.style.visibility = 'visible';
        
        // Animate main app entrance
        gsap.fromTo(mainApp, 
            { opacity: 0, scale: 1.05 },
            { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }
        );
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ZeoClient();
});