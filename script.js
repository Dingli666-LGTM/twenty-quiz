document.addEventListener('DOMContentLoaded', () => {
    const questionTextElement = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackElement = document.getElementById('feedback');
    const submitBtn = document.getElementById('submit-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    const progressTextElement = document.getElementById('progress-text');
    const resultsContainer = document.getElementById('results-container');
    const scoreTextElement = document.getElementById('score-text');
    const restartBtn = document.getElementById('restart-btn');
    const resultsSummaryElement = document.getElementById('results-summary');
    const navigationButtons = document.querySelector('.navigation-buttons');
    const questionContainer = document.getElementById('question-container');

    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let backToResultsBtn = null;

    // --- Fetch Questions ---
    fetch('questions.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            questions = data;
            if (questions.length > 0) {
                displayQuestion();
            } else {
                showError("题库加载失败或为空。");
            }
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            showError(`加载题库时出错: ${error.message}`);
        });

    // --- Display Question --- Renders the current question and its options
    function displayQuestion() {
        if (currentQuestionIndex >= questions.length) {
            showResults();
            return;
        }

        // Ensure results are hidden, question parts are visible
        resultsContainer.style.display = 'none';
        questionContainer.style.display = 'block';
        optionsContainer.style.display = 'flex'; // Use flex as defined in CSS
        feedbackElement.style.display = 'block';
        progressTextElement.style.display = 'block';
        navigationButtons.style.display = 'block'; // Show nav buttons div

        removeBackToResultsButton(); // Remove back button if present

        const currentQuestion = questions[currentQuestionIndex];
        questionTextElement.innerText = `${currentQuestionIndex + 1}. ${currentQuestion.question}`;
        optionsContainer.innerHTML = ''; // Clear previous options
        feedbackElement.innerHTML = '';
        feedbackElement.className = 'feedback'; // Reset feedback style

        const optionKeys = Object.keys(currentQuestion.options);

        optionKeys.forEach(key => {
            const option = currentQuestion.options[key];
            const optionId = `option-${key}`;
            const label = document.createElement('label');
            label.htmlFor = optionId;
            label.classList.add('option-label');

            const input = document.createElement('input');
            input.id = optionId;
            input.name = `options-${currentQuestionIndex}`; // Unique name per question
            input.value = key;

            if (currentQuestion.type === 'multiple') {
                input.type = 'checkbox';
            } else { // single or truefalse
                input.type = 'radio';
            }

            const span = document.createElement('span');
            span.textContent = (currentQuestion.type === 'truefalse') ? key : `${key}. ${option}`;

            label.appendChild(input);
            label.appendChild(span);
            optionsContainer.appendChild(label);
        });

        updateProgress();
        submitBtn.disabled = false;
        submitBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'inline-block';
        // Restart button is inside results container, so it's hidden now
    }

    // --- Submit Answer --- Handles answer submission and feedback
    function submitAnswer() {
        const currentQuestion = questions[currentQuestionIndex];
        let selectedAnswer;
        let isCorrect = false; // Default to incorrect

        if (currentQuestion.type === 'multiple') {
            const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
            selectedAnswer = Array.from(checkedBoxes).map(cb => cb.value).sort().join('');
        } else {
            const selectedRadio = optionsContainer.querySelector('input[type="radio"]:checked');
            selectedAnswer = selectedRadio ? selectedRadio.value : null;
        }

        // Basic validation
        if (selectedAnswer === null || (currentQuestion.type === 'multiple' && selectedAnswer === '')) {
             feedbackElement.innerText = '请至少选择一个选项！';
             feedbackElement.className = 'feedback incorrect';
             return;
        }

        const correctAnswer = currentQuestion.answer;
        isCorrect = selectedAnswer === correctAnswer;

        // Store results on the question object
        currentQuestion.userAnswer = selectedAnswer;
        currentQuestion.isCorrect = isCorrect;

        if (isCorrect) {
            score++;
            feedbackElement.innerText = '回答正确！';
            feedbackElement.className = 'feedback correct';
        } else {
            feedbackElement.innerText = `回答错误。正确答案是：${correctAnswer}`;
            feedbackElement.className = 'feedback incorrect';
            highlightCorrectAnswer(correctAnswer, currentQuestion.type, selectedAnswer); // Pass user answer for highlighting
        }

        // Disable options after submission
        const inputs = optionsContainer.querySelectorAll('input');
        inputs.forEach(input => input.disabled = true);

        submitBtn.disabled = true;
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
    }

    // --- Highlight Correct/Incorrect Answers --- Visually indicates answers
     function highlightCorrectAnswer(correctAnswer, type, userAnswer) {
        const correctKeys = type === 'multiple' ? correctAnswer.split('') : [correctAnswer];
        const userKeys = (type === 'multiple' && userAnswer) ? userAnswer.split('') : (userAnswer ? [userAnswer] : []);

        // Highlight correct answers
        correctKeys.forEach(key => {
            const correctInput = document.getElementById(`option-${key}`);
            if (correctInput && correctInput.parentElement) {
                correctInput.parentElement.classList.add('correct-answer-highlight');
            }
        });

        // If incorrect, also highlight the user's wrong choice(s)
        if (userAnswer !== correctAnswer) {
             userKeys.forEach(key => {
                // Avoid double-highlighting if a user choice was part of the correct answer (in multiple choice)
                if (!correctKeys.includes(key)) {
                    const userInput = document.getElementById(`option-${key}`);
                    if (userInput && userInput.parentElement) {
                        userInput.parentElement.classList.add('user-answer-incorrect');
                    }
                }
            });
        }
    }

    // --- Update Progress --- Shows the current question number out of total
    function updateProgress() {
        progressTextElement.innerText = `进度: ${currentQuestionIndex + 1} / ${questions.length}`;
    }

    // --- Show Results --- Displays the final score and review list
    function showResults() {
        // Hide question parts, show results container
        questionContainer.style.display = 'none';
        optionsContainer.style.display = 'none';
        feedbackElement.style.display = 'none';
        progressTextElement.style.display = 'none';
        navigationButtons.style.display = 'none'; // Hide the entire nav buttons div
        resultsContainer.style.display = 'block'; // Show results

        removeBackToResultsButton(); // Clean up back button if returning from details

        let answeredCount = 0;
        questions.forEach(q => {
            if (q.hasOwnProperty('isCorrect')) {
                answeredCount++;
            }
        });

        const percentage = answeredCount > 0 ? ((score / answeredCount) * 100).toFixed(1) : 0;
        scoreTextElement.innerText = `你的得分: ${score} / ${answeredCount} (答对 ${percentage}%) - 共 ${questions.length} 题`;

        // Build the results summary list
        resultsSummaryElement.innerHTML = ''; // Clear previous summary
        const summaryTitle = document.createElement('h3');
        summaryTitle.textContent = '题目回顾 (点击错误题号查看详情):';
        resultsSummaryElement.appendChild(summaryTitle);

        const resultsList = document.createElement('ul');
        resultsList.className = 'results-list';

        questions.forEach((question, index) => {
            const listItem = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = index + 1;
            button.classList.add('result-item');

            if (question.hasOwnProperty('isCorrect')) {
                // Answered questions
                button.classList.add(question.isCorrect ? 'correct' : 'incorrect');
                button.setAttribute('aria-label', `题目 ${index + 1}: ${question.isCorrect ? '正确' : '错误'}`);
                 if (!question.isCorrect) {
                    button.addEventListener('click', () => displayQuestionDetails(index));
                    button.title = '点击查看详情'; // Tooltip
                }
            } else {
                // Unanswered questions
                button.classList.add('unanswered'); // Add a new class for styling
                button.setAttribute('aria-label', `题目 ${index + 1}: 未作答`);
                button.disabled = true; // Cannot click unanswered items
                 button.title = '未作答';
            }

            listItem.appendChild(button);
            resultsList.appendChild(listItem);
        });

        resultsSummaryElement.appendChild(resultsList);
    }

    // --- Display Question Details --- Shows details for a specific question
    function displayQuestionDetails(index) {
        // Hide results, show question parts (except progress)
        resultsContainer.style.display = 'none';
        questionContainer.style.display = 'block';
        optionsContainer.style.display = 'flex'; // Use flex as defined in CSS
        feedbackElement.style.display = 'block';
        progressTextElement.style.display = 'none'; // Keep progress hidden
        navigationButtons.style.display = 'block'; // Show nav buttons div for the back button

        const question = questions[index];
        questionTextElement.innerText = `${index + 1}. ${question.question}`;
        optionsContainer.innerHTML = ''; // Clear options area
        feedbackElement.innerHTML = `你的答案: ${question.userAnswer || '未作答'} | 正确答案: ${question.answer}`;
        feedbackElement.className = 'feedback incorrect';

        const optionKeys = Object.keys(question.options);
        optionKeys.forEach(key => {
            const option = question.options[key];
            const optionId = `option-${key}-detail`; // Use different ID for details view
            const label = document.createElement('label');
            label.htmlFor = optionId;
            label.classList.add('option-label');

            const input = document.createElement('input');
            input.id = optionId;
            input.name = `options-detail-${index}`; // Unique name
            input.value = key;
            input.disabled = true; // Always disable in detail view

            if (question.type === 'multiple') {
                input.type = 'checkbox';
                 // Check user's choices
                if (question.userAnswer && question.userAnswer.includes(key)) {
                    input.checked = true;
                }
            } else {
                input.type = 'radio';
                 // Check user's choice
                if (question.userAnswer === key) {
                    input.checked = true;
                }
            }

            const span = document.createElement('span');
            span.textContent = (question.type === 'truefalse') ? key : `${key}. ${option}`;

            label.appendChild(input);
            label.appendChild(span);
            optionsContainer.appendChild(label);

            // Highlight user's incorrect choice and the correct answer
            if (question.userAnswer === key && !question.isCorrect) {
                 label.classList.add('user-answer-incorrect');
            }
             // Handle multiple choice correct parts
            const correctKeys = question.type === 'multiple' ? question.answer.split('') : [question.answer];
            if (correctKeys.includes(key)) {
                 label.classList.add('correct-answer-highlight');
            }
        });

        // Hide standard quiz buttons
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'none';

        // Add "Back to Results" button
        addBackToResultsButton();
    }

     // --- Add Back to Results Button ---
    function addBackToResultsButton() {
        removeBackToResultsButton(); // Ensure no duplicates
        backToResultsBtn = document.createElement('button');
        backToResultsBtn.textContent = '返回结果列表';
        backToResultsBtn.id = 'back-to-results-btn';
        backToResultsBtn.className = 'btn';
        backToResultsBtn.addEventListener('click', () => {
            removeBackToResultsButton(); // Clean up button
            showResults(); // Go back to the summary view
        });
        navigationButtons.appendChild(backToResultsBtn);
    }

    // --- Remove Back to Results Button ---
    function removeBackToResultsButton() {
        if (backToResultsBtn && backToResultsBtn.parentNode) {
            backToResultsBtn.parentNode.removeChild(backToResultsBtn);
            backToResultsBtn = null;
        }
    }

    // --- Restart Quiz --- Resets the quiz state and starts over
    function restartQuiz() {
        questions.forEach(q => {
            delete q.userAnswer;
            delete q.isCorrect;
        });

        currentQuestionIndex = 0;
        score = 0;
        // displayQuestion will handle showing/hiding elements
        displayQuestion();
    }

    // --- Show Error --- Displays an error message if loading fails
    function showError(message) {
        questionContainer.innerHTML = `<p style="color: red; font-weight: bold;">${message}</p>`;
    }

    // --- Event Listeners ---
    submitBtn.addEventListener('click', submitAnswer);
    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });
    restartBtn.addEventListener('click', restartQuiz);
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            showResults();
        });
    } else {
        console.error('Could not find Finish button to attach listener.');
    }
});