class InteractiveModule {
    constructor(steps, quiz, onStepUpdate) {
        this.container = document.getElementById('interactive-module');
        this.steps = steps;
        this.quiz = quiz;
        this.currentStep = 0;
        this.onStepUpdate = onStepUpdate;

        this.btnNext = this.container.querySelector('.btn-next');
        this.btnPrev = this.container.querySelector('.btn-prev');
        this.contentDiv = this.container.querySelector('#module-content');
        this.progressContainer = this.container.querySelector('#module-progress');
        this.codeSegments = this.container.querySelectorAll('.code-segment');

        this.btnNext.addEventListener('click', () => this.next());
        this.btnPrev.addEventListener('click', () => this.prev());

        this.initProgressBars();
        this.updateUI();
    }

    initProgressBars() {
        this.progressContainer.innerHTML = '';
        for(let i = 0; i < this.steps.length + 1; i++) {
            const bar = document.createElement('div');
            bar.id = `prog-${i}`;
            bar.className = 'prog-bar prog-bar-inactive';
            this.progressContainer.appendChild(bar);
        }
    }

    next() {
        if (this.currentStep < this.steps.length) {
            this.currentStep++;
            this.updateUI();
        } else {
            // Try to go back exactly one page in the browser's history
            if (window.history.length > 1 && document.referrer !== "") {
                window.history.back();
            } else {
                // Fallback (if opened in a new tab): specifically target the "Back to Chapter" link
                // instead of the main nav home link
                const backLink = document.querySelector('nav.mb-4 a');
                if (backLink) {
                    window.location.href = backLink.getAttribute('href');
                }
            }
        }
    }

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateUI();
        }
    }

    handleQuizAnswer(btn, isCorrect) {
        const buttons = this.container.querySelectorAll('.quiz-btn');
        buttons.forEach(b => b.disabled = true);

        const feedback = this.container.querySelector('.quiz-feedback');
        feedback.classList.remove('d-none');

        if (isCorrect) {
            btn.classList.add('correct');
            feedback.className = 'quiz-feedback mt-3 p-3 rounded alert alert-success small';
            feedback.innerHTML = '<i class="fas fa-check-circle me-2"></i> <strong>Correct!</strong> ' + this.quiz.correctText;
            
            // Show the next button and change it to a "Finish" button
            this.btnNext.classList.remove('d-none');
            this.btnNext.innerHTML = '<i class="fas fa-flag-checkered me-2"></i> Finish Lesson';
        } else {
            btn.classList.add('incorrect');
            feedback.className = 'quiz-feedback mt-3 p-3 rounded alert alert-danger small';
            feedback.innerHTML = '<i class="fas fa-times-circle me-2"></i> <strong>Review Needed.</strong> ' + this.quiz.incorrectText;
        }
    }

    updateUI() {
        const isQuizStep = this.currentStep === this.steps.length;
        this.contentDiv.classList.remove('fade-in');
        
        // Trigger reflow to restart animation
        void this.contentDiv.offsetWidth; 
        
        if (isQuizStep) {
            this.contentDiv.innerHTML = `
                <h3 class="fs-4 fw-bold text-dark mb-3"><i class="fas fa-clipboard-check text-primary me-2"></i> Quick Check</h3>
                <div class="bg-light p-3 rounded font-monospace small mb-4 border text-center shadow-sm">${this.quiz.snippet}</div>
                <p class="mb-3 fw-semibold text-secondary">${this.quiz.question}</p>
                <div class="d-flex flex-column gap-2 quiz-buttons">
                    ${this.quiz.options.map((opt, i) => `
                        <button class="quiz-btn">
                            <span class="d-inline-block fw-bold text-secondary me-2" style="width: 20px;">${['A', 'B', 'C'][i]}</span> ${opt.text}
                        </button>
                    `).join('')}
                </div>
                <div class="quiz-feedback mt-4 p-3 rounded d-none small"></div>
            `;
            const btns = this.container.querySelectorAll('.quiz-btn');
            btns.forEach((btn, index) => {
                btn.addEventListener('click', () => this.handleQuizAnswer(btn, this.quiz.options[index].isCorrect));
            });
        } else {
            const step = this.steps[this.currentStep];
            this.contentDiv.innerHTML = `
                <h3 class="fs-4 fw-bold text-dark mb-3 d-flex align-items-center mt-0"><i class="fas ${step.icon} text-primary me-3 text-center" style="width: 24px;"></i>${step.title}</h3>
                <div class="text-secondary lh-lg">${step.text}</div>
            `;
        }
        this.contentDiv.classList.add('fade-in');

        // Update code highlighting
        this.codeSegments.forEach(seg => {
            const activeSteps = seg.getAttribute('data-steps');
            if (activeSteps && activeSteps.split(',').map(Number).includes(this.currentStep)) {
                seg.classList.remove('step-hidden'); seg.classList.add('step-active');
            } else {
                seg.classList.add('step-hidden'); seg.classList.remove('step-active');
            }
        });

        // Update progress bars
        for(let i = 0; i < this.steps.length + 1; i++) {
            const bar = document.getElementById(`prog-${i}`);
            if(bar) {
                bar.classList.remove('bg-da-primary', 'prog-bar-inactive');
                bar.classList.add(i <= this.currentStep ? 'bg-da-primary' : 'prog-bar-inactive');
            }
        }

        // Update button states
        this.btnPrev.disabled = this.currentStep === 0;
        if (isQuizStep) {
            this.btnNext.classList.add('d-none');
        } else {
            this.btnNext.classList.remove('d-none');
            this.btnNext.innerHTML = 'Next Step <i class="fas fa-arrow-right ms-2"></i>';
        }

        // Fire custom callback if provided
        if (this.onStepUpdate) this.onStepUpdate(this.currentStep);
    }
}