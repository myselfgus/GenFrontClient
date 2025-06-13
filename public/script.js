class ZeoClient {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.ws = null;
        this.currentJobId = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectWebSocket();
        this.initializeAnimations();
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
    }
    
    setupEventListeners() {
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.audioFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.newTranscriptionBtn.addEventListener('click', () => this.resetToUpload());
        this.exportBtn.addEventListener('click', () => this.exportTranscription());
    }
    
    connectWebSocket() {
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'progress' && data.jobId === this.currentJobId) {
                this.updateProgress(data.progress, data.status, data.transcription);
            }
        };
        
        this.ws.onclose = () => {
            setTimeout(() => this.connectWebSocket(), 3000);
        };
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
            
            const response = await fetch('/upload', {
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
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ZeoClient();
});