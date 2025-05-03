document.addEventListener('DOMContentLoaded', () => {
    // --- Get Element References ---
    const quizSelectionContainer = document.getElementById('quiz-selection-container');
    const quizListElement = document.getElementById('quiz-list');
    const quizContainer = document.querySelector('.quiz-container'); // The main quiz/results area
    const quizTitleElement = document.getElementById('quiz-title');
    const questionContainer = document.getElementById('question-container');
    const questionTextElement = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackElement = document.getElementById('feedback');
    const navigationButtons = document.querySelector('.navigation-buttons');
    const submitBtn = document.getElementById('submit-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressTextElement = document.getElementById('progress-text');
    const resultsContainer = document.getElementById('results-container');
    const resultsTitleElement = document.getElementById('results-title');
    const scoreTextElement = document.getElementById('score-text');
    const resultsSummaryElement = document.getElementById('results-summary');
    const restartBtn = document.getElementById('restart-btn');
    const backToSelectionBtn = document.getElementById('back-to-selection-btn'); // Back during quiz
    const backToSelectionFromResultsBtn = document.getElementById('back-to-selection-from-results-btn'); // Back from results

    // --- State Variables ---
    let allQuizzesData = {}; // Will hold all loaded quizzes { name: [questions] }
    let currentQuizName = null; // Name of the currently selected quiz
    let questions = []; // Questions for the current quiz
    let currentQuestionIndex = 0;
    let score = 0;
    let backToResultsBtn = null; // Dynamically created button for returning from detail view

    // --- Fetch All Quizzes Data ---
    fetch('questions.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            allQuizzesData = data;
            if (Object.keys(allQuizzesData).length > 0) {
                displayQuizSelection(); // Start by showing the selection screen
            } else {
                showError("题库文件加载失败或为空对象。", quizSelectionContainer); // Show error in selection container
            }
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            showError(`加载题库时出错: ${error.message}`, quizSelectionContainer);
        });

    // --- Display Quiz Selection --- Shows the list of available quizzes
    function displayQuizSelection() {
        // Hide quiz and results, show selection
        quizContainer.style.display = 'none';
        resultsContainer.style.display = 'none';
        quizSelectionContainer.style.display = 'block';

        quizListElement.innerHTML = ''; // Clear previous list

        const quizNames = Object.keys(allQuizzesData);
        if (quizNames.length === 0) {
             quizListElement.innerHTML = '<p>没有可用的题库。</p>';
             return;
        }

        quizNames.forEach(name => {
            const button = document.createElement('button');
            button.textContent = name;
            button.className = 'quiz-select-btn';
            button.addEventListener('click', () => startQuiz(name));
            quizListElement.appendChild(button);
        });
    }

    // --- Start Quiz --- Initializes and starts a selected quiz
    function startQuiz(quizName) {
        currentQuizName = quizName;
        questions = allQuizzesData[currentQuizName];
        if (!questions || questions.length === 0) {
            showError(`题库 "${quizName}" 为空或加载失败。`, quizContainer); // Show error within quiz container now
            // Hide selection, show quiz container briefly to show error
            quizSelectionContainer.style.display = 'none';
            quizContainer.style.display = 'block';
            resultsContainer.style.display = 'none';
            // Hide specific quiz elements if error shown
            questionContainer.style.display = 'none';
            optionsContainer.style.display = 'none';
            feedbackElement.style.display = 'none';
            navigationButtons.style.display = 'none';
            progressContainer.style.display = 'none';
            return;
        }

        // Reset state for the new quiz
        currentQuestionIndex = 0;
        score = 0;
        // Clear previous results from question objects
        questions.forEach(q => {
            delete q.userAnswer;
            delete q.isCorrect;
        });

        quizTitleElement.innerText = currentQuizName; // Set the quiz title

        // Hide selection, show quiz container parts
        quizSelectionContainer.style.display = 'none';
        resultsContainer.style.display = 'none'; // Ensure results are hidden
        quizContainer.style.display = 'block'; // Show the main quiz area

        // Ensure quiz parts are visible
        questionContainer.style.display = 'block';
        optionsContainer.style.display = 'flex';
        feedbackElement.style.display = 'block';
        navigationButtons.style.display = 'block';
        progressContainer.style.display = 'block';
        backToSelectionBtn.style.display = 'inline-block'; // Show back button for quiz

        displayQuestion(); // Display the first question
    }

    // --- Display Question --- Renders the current question and its options
    function displayQuestion() {
        if (currentQuestionIndex >= questions.length) {
            showResults();
            return;
        }

        // Ensure results are hidden, question parts are visible
        // No need to hide/show quizContainer here, handled by startQuiz/showResults etc.
        resultsContainer.style.display = 'none';
        questionContainer.style.display = 'block';
        optionsContainer.style.display = 'flex';
        feedbackElement.style.display = 'block';
        progressContainer.style.display = 'block';
        navigationButtons.style.display = 'block';
        backToSelectionBtn.style.display = 'inline-block'; // Make sure back button is visible

        removeBackToResultsButton(); // Remove results-related back button if present

        const currentQuestion = questions[currentQuestionIndex];
        questionTextElement.innerText = `${currentQuestionIndex + 1}. ${currentQuestion.question}`;
        optionsContainer.innerHTML = '';
        feedbackElement.innerHTML = '';
        feedbackElement.className = 'feedback';

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
            // Make sure radio/checkbox is not disabled from previous detail view
            input.disabled = false;

            if (currentQuestion.type === 'multiple') {
                input.type = 'checkbox';
            } else {
                input.type = 'radio';
            }

            const span = document.createElement('span');
            span.textContent = (currentQuestion.type === 'truefalse') ? key : `${key}. ${option}`;

            label.appendChild(input);
            label.appendChild(span);
            optionsContainer.appendChild(label);
        });

        updateProgress();
        // Control navigation buttons visibility
        submitBtn.disabled = false; // Re-enable submit button
        submitBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'inline-block';
    }

    // --- Submit Answer --- (No significant changes needed, uses global 'questions')
    function submitAnswer() {
        const currentQuestion = questions[currentQuestionIndex];
        let selectedAnswer;
        let isCorrect = false;

        if (currentQuestion.type === 'multiple') {
            const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
            selectedAnswer = Array.from(checkedBoxes).map(cb => cb.value).sort().join('');
        } else {
            const selectedRadio = optionsContainer.querySelector('input[type="radio"]:checked');
            selectedAnswer = selectedRadio ? selectedRadio.value : null;
        }

        if (selectedAnswer === null || (currentQuestion.type === 'multiple' && selectedAnswer === '')) {
             feedbackElement.innerText = '请至少选择一个选项！';
             feedbackElement.className = 'feedback incorrect';
             return;
        }

        const correctAnswer = currentQuestion.answer;
        isCorrect = selectedAnswer === correctAnswer;

        currentQuestion.userAnswer = selectedAnswer;
        currentQuestion.isCorrect = isCorrect;

        if (isCorrect) {
            score++;
            feedbackElement.innerText = '回答正确！';
            feedbackElement.className = 'feedback correct';
        } else {
            feedbackElement.innerText = `回答错误。正确答案是：${correctAnswer}`;
            feedbackElement.className = 'feedback incorrect';
            highlightCorrectAnswer(correctAnswer, currentQuestion.type, selectedAnswer);
        }

        const inputs = optionsContainer.querySelectorAll('input');
        inputs.forEach(input => input.disabled = true);

        submitBtn.disabled = true;
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
        // Keep finishBtn visible until explicitly hidden in showResults
    }

    // --- Highlight Correct/Incorrect Answers --- (No changes needed)
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

    // --- Update Progress --- (No changes needed)
    function updateProgress() {
        progressTextElement.innerText = `进度: ${currentQuestionIndex + 1} / ${questions.length}`;
     }

    // --- Show Results --- Displays the final score and review list for the current quiz
    function showResults() {
        // Hide question parts & nav buttons, show results container
        questionContainer.style.display = 'none';
        optionsContainer.style.display = 'none';
        feedbackElement.style.display = 'none';
        progressContainer.style.display = 'none';
        navigationButtons.style.display = 'none'; // Hide submit/next/finish
        backToSelectionBtn.style.display = 'none'; // Hide the in-quiz back button
        resultsContainer.style.display = 'block'; // Show results area

        removeBackToResultsButton(); // Clean up question detail back button

        resultsTitleElement.innerText = `"${currentQuizName}" 答题结束！`; // Update results title

        let answeredCount = 0;
        questions.forEach(q => {
            if (q.hasOwnProperty('isCorrect')) {
                answeredCount++;
            }
        });

        const percentage = answeredCount > 0 ? ((score / answeredCount) * 100).toFixed(1) : 0;
        scoreTextElement.innerText = `你的得分: ${score} / ${answeredCount} (答对 ${percentage}%) - 共 ${questions.length} 题`;

        // Build the results summary list (No changes needed in logic here)
        resultsSummaryElement.innerHTML = '';
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
                button.classList.add(question.isCorrect ? 'correct' : 'incorrect');
                button.setAttribute('aria-label', `题目 ${index + 1}: ${question.isCorrect ? '正确' : '错误'}`);
                 if (!question.isCorrect) {
                    button.addEventListener('click', () => displayQuestionDetails(index));
                    button.title = '点击查看详情';
                }
            } else {
                button.classList.add('unanswered');
                button.setAttribute('aria-label', `题目 ${index + 1}: 未作答`);
                button.disabled = true;
                 button.title = '未作答';
            }
            listItem.appendChild(button);
            resultsList.appendChild(listItem);
        });
        resultsSummaryElement.appendChild(resultsList);
        // Make sure the results-specific back button is visible
        backToSelectionFromResultsBtn.style.display = 'inline-block';
        restartBtn.style.display = 'inline-block';
    }

    // --- Display Question Details --- Shows details for a specific question
    function displayQuestionDetails(index) {
        // Hide results, show specific question parts (no progress, no regular nav buttons)
        resultsContainer.style.display = 'none';
        questionContainer.style.display = 'block';
        optionsContainer.style.display = 'flex';
        feedbackElement.style.display = 'block';
        progressContainer.style.display = 'none';
        navigationButtons.style.display = 'block'; // Show div for back-to-results button
        backToSelectionBtn.style.display = 'none'; // Hide regular back button

        const question = questions[index];
        questionTextElement.innerText = `${index + 1}. ${question.question}`;
        optionsContainer.innerHTML = '';
        feedbackElement.innerHTML = `你的答案: ${question.userAnswer || '未作答'} | 正确答案: ${question.answer}`;
        feedbackElement.className = 'feedback incorrect';

        const optionKeys = Object.keys(question.options);
        optionKeys.forEach(key => {
             const option = question.options[key];
            const optionId = `option-${key}-detail`;
            const label = document.createElement('label');
            label.htmlFor = optionId;
            label.classList.add('option-label');

            const input = document.createElement('input');
            input.id = optionId;
            input.name = `options-detail-${index}`;
            input.value = key;
            input.disabled = true; // Disable in detail view

            if (question.type === 'multiple') {
                input.type = 'checkbox';
                if (question.userAnswer && question.userAnswer.includes(key)) input.checked = true;
            } else {
                input.type = 'radio';
                if (question.userAnswer === key) input.checked = true;
            }

            const span = document.createElement('span');
            span.textContent = (question.type === 'truefalse') ? key : `${key}. ${option}`;

            label.appendChild(input);
            label.appendChild(span);
            optionsContainer.appendChild(label);

            // Highlighting logic remains the same
            if (question.userAnswer === key && !question.isCorrect) {
                 label.classList.add('user-answer-incorrect');
            }
            const correctKeys = question.type === 'multiple' ? question.answer.split('') : [question.answer];
            if (correctKeys.includes(key)) {
                 label.classList.add('correct-answer-highlight');
            }
        });

        // Hide standard quiz navigation buttons
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'none';

        // Add "Back to Results" button
        addBackToResultsButton();
    }

     // --- Add Back to Results Button --- Adds button to return from detail view
    function addBackToResultsButton() {
        removeBackToResultsButton(); // Ensure no duplicates
        backToResultsBtn = document.createElement('button');
        backToResultsBtn.textContent = '返回结果列表';
        backToResultsBtn.id = 'back-to-results-btn';
        backToResultsBtn.className = 'btn btn-secondary'; // Use secondary style
        backToResultsBtn.addEventListener('click', () => {
            showResults(); // Go back to the summary view
        });
        // Prepend to navigation buttons so it appears first
        navigationButtons.insertBefore(backToResultsBtn, navigationButtons.firstChild);
    }

    // --- Remove Back to Results Button --- Removes the dynamic back button
    function removeBackToResultsButton() {
        if (backToResultsBtn && backToResultsBtn.parentNode) {
            backToResultsBtn.parentNode.removeChild(backToResultsBtn);
            backToResultsBtn = null;
        }
    }

    // --- Restart Quiz --- Restarts the CURRENT quiz
    function restartQuiz() {
        if (currentQuizName) {
            startQuiz(currentQuizName); // Re-initialize the current quiz
        } else {
            // Should not happen ideally, but fallback to selection
            displayQuizSelection();
        }
    }

    // --- Show Error --- Displays an error message in a specified container
    function showError(message, container = quizContainer) { // Default to quizContainer
        container.innerHTML = `<p style="color: red; font-weight: bold;">${message}</p>`;
         // Ensure only the container with the error is visible
        if (container === quizSelectionContainer) {
            quizContainer.style.display = 'none';
            resultsContainer.style.display = 'none';
            quizSelectionContainer.style.display = 'block';
        } else { // Error in quizContainer
             quizSelectionContainer.style.display = 'none';
             resultsContainer.style.display = 'none';
             quizContainer.style.display = 'block';
             // Hide specific quiz elements if error shown in quizContainer
             questionContainer.style.display = 'none';
             optionsContainer.style.display = 'none';
             feedbackElement.style.display = 'none';
             navigationButtons.style.display = 'none';
             progressContainer.style.display = 'none';
        }
    }

    // --- Event Listeners ---
    submitBtn.addEventListener('click', submitAnswer);
    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });
    restartBtn.addEventListener('click', restartQuiz); // Restarts the current quiz
    finishBtn.addEventListener('click', showResults);
    backToSelectionBtn.addEventListener('click', displayQuizSelection); // Back from quiz
    backToSelectionFromResultsBtn.addEventListener('click', displayQuizSelection); // Back from results

});