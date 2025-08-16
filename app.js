// Wait for the entire web page to load before running the script.
document.addEventListener('DOMContentLoaded', () => {

    // Main application object to hold all data and functions.
    const app = {
        appContainer: document.getElementById('app-container'), // The main container for our content.
        data: null, // This will hold all the course data from database.json.
        navigationStack: [], // Used to handle the "back" button functionality.

        // The starting point of the application.
        async init() {
            try {
                // Fetch the course data from the JSON file.
                const response = await fetch('database.json');
                if (!response.ok) {
                    throw new Error('Network response was not ok.');
                }
                this.data = await response.json();
                
                // Start by rendering the main course list.
                this.renderCourseList();
            } catch (error) {
                // If the data can't be loaded, show an error message.
                this.appContainer.innerHTML = `<p style="text-align:center; color: red;">Error loading content. Please check the console for details.</p>`;
                console.error('Error fetching or parsing database.json:', error);
            }
        },

        // Updates the view and manages the navigation history.
        updateView(title, content, state) {
            this.appContainer.innerHTML = `<h2 class="view-title">${title}</h2>${content}`;
            window.scrollTo(0, 0);
            
            // Add the current state to our history for the back button.
            if (state) {
                this.navigationStack.push(state);
            }
        },

        // Handles the logic for the back button.
        handleBack() {
            // Remove the current page from history.
            this.navigationStack.pop(); 
            
            if (this.navigationStack.length > 0) {
                // Get the previous page state and render it.
                const previousState = this.navigationStack.pop(); // Pop again to get the actual previous view
                this.renderView(previousState);
            } else {
                // If there's no history, go to the homepage.
                this.renderCourseList();
            }
        },
        
        // A helper function to decide which view to render based on a state object.
        renderView(state) {
            switch(state.type) {
                case 'courses':
                    this.renderCourseList();
                    break;
                case 'subjects':
                    this.renderSubjectList(state.courseId);
                    break;
                case 'lessons':
                    this.renderLessonList(state.courseId, state.subjectId);
                    break;
                case 'lesson':
                    this.renderLessonDetail(state.courseId, state.subjectId, state.lessonId);
                    break;
                case 'quiz':
                    this.renderQuiz(state.courseId, state.subjectId, state.lessonId);
                    break;
            }
        },
        
        // Renders the initial list of courses (e.g., Gynecology, Obstetrics).
        renderCourseList() {
            const courseGrid = Object.keys(this.data.courses).map(courseId => {
                const course = this.data.courses[courseId];
                return `
                    <div class="card" data-course-id="${courseId}" style="border-top: 5px solid ${course.color};">
                        <h3 style="color: ${course.color};">${course.title}</h3>
                    </div>
                `;
            }).join('');

            this.updateView('Choose a Course', `<div class="card-grid">${courseGrid}</div>`);
            
            // Add click listeners to each course card.
            this.appContainer.querySelectorAll('.card').forEach(card => {
                card.addEventListener('click', () => {
                    this.renderSubjectList(card.dataset.courseId);
                });
            });
        },
        
        // Renders the list of subjects for a selected course.
        renderSubjectList(courseId) {
            const course = this.data.courses[courseId];
            const subjectGrid = course.subjects.map(subject => {
                return `
                    <div class="card" data-subject-id="${subject.id}">
                        <h3 style="color: ${course.color};">${subject.title}</h3>
                        <p>${subject.shortDescription}</p>
                    </div>
                `;
            }).join('');
            
            const backButton = `<button class="back-btn">&larr; Back to Courses</button>`;
            this.updateView(`${course.title} Subjects`, `${backButton}<div class="card-grid">${subjectGrid}</div>`, {type: 'subjects', courseId});

            this.appContainer.querySelector('.back-btn').addEventListener('click', () => this.handleBack());
            this.appContainer.querySelectorAll('.card').forEach(card => {
                card.addEventListener('click', () => {
                    this.renderLessonList(courseId, card.dataset.subjectId);
                });
            });
        },

        // Renders the list of lessons for a selected subject.
        renderLessonList(courseId, subjectId) {
            const course = this.data.courses[courseId];
            const subject = course.subjects.find(s => s.id === subjectId);
            const lessonGrid = subject.lessons.map(lesson => {
                return `
                    <div class="card" data-lesson-id="${lesson.id}">
                        <h3 style="color: ${course.color};">${lesson.title}</h3>
                        <p>${lesson.shortDescription}</p>
                    </div>
                `;
            }).join('');

            const backButton = `<button class="back-btn">&larr; Back to Subjects</button>`;
            this.updateView(`${subject.title} Topics`, `${backButton}<div class="card-grid">${lessonGrid}</div>`, {type: 'lessons', courseId, subjectId});
            
            this.appContainer.querySelector('.back-btn').addEventListener('click', () => this.handleBack());
            this.appContainer.querySelectorAll('.card').forEach(card => {
                card.addEventListener('click', () => {
                    this.renderLessonDetail(courseId, subjectId, card.dataset.lessonId);
                });
            });
        },

        // Renders the detailed content of a single lesson.
        renderLessonDetail(courseId, subjectId, lessonId) {
            const course = this.data.courses[courseId];
            const subject = course.subjects.find(s => s.id === subjectId);
            const lesson = subject.lessons.find(l => l.id === lessonId);

            let summaryHtml = '';
            for (const key in lesson.summary) {
                summaryHtml += `
                    <h3 style="border-color:${course.color}; color:${course.color};">${key}</h3>
                    <p>${lesson.summary[key]}</p>
                `;
            }

            const lessonHtml = `
                <button class="back-btn">&larr; Back to Topics</button>
                <header class="lesson-header" style="background-color: ${course.color};">
                    <h2>${lesson.title}</h2>
                </header>
                <div class="lesson-content">
                    ${summaryHtml}
                    <div class="test-button-container">
                        <button class="test-button" style="background-color: ${course.color};">Test Yourself</button>
                    </div>
                </div>
            `;
            
            this.updateView('', lessonHtml, {type: 'lesson', courseId, subjectId, lessonId});

            this.appContainer.querySelector('.back-btn').addEventListener('click', () => this.handleBack());
            this.appContainer.querySelector('.test-button').addEventListener('click', () => {
                this.renderQuiz(courseId, subjectId, lessonId);
            });
        },
        
        // Renders the quiz for a selected lesson.
        renderQuiz(courseId, subjectId, lessonId) {
            const course = this.data.courses[courseId];
            const subject = course.subjects.find(s => s.id === subjectId);
            const lesson = subject.lessons.find(l => l.id === lessonId);
            const quizData = lesson.quiz;
            let currentQuestionIndex = 0;
            let userAnswers = new Array(quizData.length).fill(null);
            
            const renderCurrentQuestion = () => {
                const question = quizData[currentQuestionIndex];
                const optionsHtml = question.options.map((option, index) => 
                    `<button class="option-btn" data-index="${index}">${option}</button>`
                ).join('');

                const quizHtml = `
                    <button class="back-btn">&larr; Back to Lesson</button>
                    <div class="quiz-container">
                        <div class="quiz-header">
                            <h3>Quiz: ${lesson.title}</h3>
                            <span id="progress-text">${currentQuestionIndex + 1} / ${quizData.length}</span>
                        </div>
                        <div class="progress-bar-container"><div id="progress-bar" style="width: ${((currentQuestionIndex + 1) / quizData.length) * 100}%"></div></div>
                        <p id="question-stem">${question.stem}</p>
                        <div id="options-grid" class="options-grid">${optionsHtml}</div>
                        <div id="explanation" style="display:none;"></div>
                        <div class="quiz-navigation">
                            <button id="prev-btn" class="nav-btn" ${currentQuestionIndex === 0 ? 'disabled' : ''}>Previous</button>
                            <button id="next-btn" class="nav-btn">${currentQuestionIndex === quizData.length - 1 ? 'Finish Quiz' : 'Next'}</button>
                        </div>
                    </div>
                `;
                this.updateView('', quizHtml, {type: 'quiz', courseId, subjectId, lessonId});
                attachQuizListeners();
            };

            const attachQuizListeners = () => {
                this.appContainer.querySelector('.back-btn').addEventListener('click', () => this.handleBack());
                this.appContainer.querySelector('#options-grid').addEventListener('click', (e) => {
                    if (e.target.classList.contains('option-btn')) {
                        handleAnswerSelection(parseInt(e.target.dataset.index));
                    }
                });
                this.appContainer.querySelector('#next-btn').addEventListener('click', handleNext);
                this.appContainer.querySelector('#prev-btn').addEventListener('click', handlePrev);
            };

            const handleAnswerSelection = (selectedIndex) => {
                userAnswers[currentQuestionIndex] = selectedIndex;
                const question = quizData[currentQuestionIndex];
                const options = this.appContainer.querySelectorAll('.option-btn');
                options.forEach(btn => btn.disabled = true);
                
                if (selectedIndex === question.answerIndex) {
                    options[selectedIndex].classList.add('correct');
                } else {
                    options[selectedIndex].classList.add('incorrect');
                    options[question.answerIndex].classList.add('correct');
                }

                const explanationEl = this.appContainer.querySelector('#explanation');
                explanationEl.innerText = `Explanation: ${question.explanation}`;
                explanationEl.style.display = 'block';
            };

            const handleNext = () => {
                if (currentQuestionIndex < quizData.length - 1) {
                    currentQuestionIndex++;
                    renderCurrentQuestion();
                } else {
                    renderResults();
                }
            };
            
            const handlePrev = () => {
                if (currentQuestionIndex > 0) {
                    currentQuestionIndex--;
                    renderCurrentQuestion();
                }
            };

            const renderResults = () => {
                let correctAnswers = 0;
                let resultsHtml = '';
                quizData.forEach((question, index) => {
                    if(userAnswers[index] === question.answerIndex) {
                        correctAnswers++;
                    } else {
                        resultsHtml += `
                            <div class="incorrect-question">
                                <p><strong>Question:</strong> ${question.stem}</p>
                                <p style="color: var(--incorrect-color);"><strong>Your Answer:</strong> ${userAnswers[index] !== null ? question.options[userAnswers[index]] : 'Not Answered'}</p>
                                <p style="color: var(--correct-color);"><strong>Correct Answer:</strong> ${question.options[question.answerIndex]}</p>
                            </div>
                        `;
                    }
                });

                const scorePercentage = Math.round((correctAnswers / quizData.length) * 100);
                const resultsPageHtml = `
                    <button class="back-btn">&larr; Back to Topics</button>
                    <div class="quiz-container">
                        <h2>Quiz Complete!</h2>
                        <p style="text-align:center; font-size: 1.5rem; font-weight: 600;">Your Score: ${correctAnswers} out of ${quizData.length} (${scorePercentage}%)</p>
                        <div style="margin-top: 2rem;">
                            <h3>Review Your Answers:</h3>
                            ${resultsHtml || '<p>Congratulations, all answers are correct!</p>'}
                        </div>
                        <div class="quiz-navigation" style="justify-content: center; gap: 1rem;">
                           <button id="retry-btn" class="nav-btn">Retry Quiz</button>
                        </div>
                    </div>
                `;
                this.updateView('', resultsPageHtml, this.navigationStack[this.navigationStack.length-2]); // Go back to lesson list state
                this.appContainer.querySelector('.back-btn').addEventListener('click', () => this.handleBack());
                this.appContainer.querySelector('#retry-btn').addEventListener('click', () => this.renderQuiz(courseId, subjectId, lessonId));
            };

            renderCurrentQuestion();
        }
    };

    // Start the application.
    app.init();
});
