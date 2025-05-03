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

        // Show quiz parts, hide results
        questionContainer.style.display = 'block';
        optionsContainer.style.display = 'flex';
        feedbackElement.style.display = 'block';
        progressContainer.style.display = 'block';
        resultsContainer.style.display = 'none'; // Explicitly hide results
        navigationButtons.style.display = 'block'; // Show button container
        backToSelectionBtn.style.display = 'inline-block'; // Show in-quiz back
        backToSelectionFromResultsBtn.style.display = 'none'; // Hide results back
        restartBtn.style.display = 'none'; // Hide restart

        removeBackToResultsButton(); // Clean up detail view button

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
            input.name = `options-${currentQuestionIndex}`;
            input.value = key;
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
        submitBtn.disabled = false;
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
        finishBtn.style.display = 'inline-block'; // Keep finish button visible
    }

    // --- Highlight Correct/Incorrect Answers --- (No changes needed)
     function highlightCorrectAnswer(correctAnswer, type, userAnswer) {
        const correctKeys = type === 'multiple' ? correctAnswer.split('') : [correctAnswer];
        const userKeys = (type === 'multiple' && userAnswer) ? userAnswer.split('') : (userAnswer ? [userAnswer] : []);

        correctKeys.forEach(key => {
            const correctInput = document.getElementById(`option-${key}`);
            if (correctInput && correctInput.parentElement) {
                correctInput.parentElement.style.backgroundColor = '#d4edda'; // Light green for correct option
                correctInput.parentElement.style.borderColor = '#c3e6cb';
                correctInput.parentElement.style.fontWeight = 'bold';
            }
        });

        if (userAnswer !== correctAnswer) {
             userKeys.forEach(key => {
                if (!correctKeys.includes(key)) {
                    const userInput = document.getElementById(`option-${key}`);
                    if (userInput && userInput.parentElement) {
                        userInput.parentElement.style.backgroundColor = '#f8d7da'; // Light red for incorrect user choice
                        userInput.parentElement.style.borderColor = '#f5c6cb';
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
        // Hide Question-specific parts
        questionContainer.style.display = 'none';
        optionsContainer.style.display = 'none';
        feedbackElement.style.display = 'none';
        progressContainer.style.display = 'none';
        navigationButtons.style.display = 'none'; // Hide submit/next/finish button container
        backToSelectionBtn.style.display = 'none'; // Hide in-quiz back button

        // Show Results container
        resultsContainer.style.display = 'block';

        // Calculate score
        score = 0; // Recalculate score based on stored answers
        let answeredCount = 0;
        for (let i = 0; i < questions.length; i++) {
            if (questions[i].userAnswer) {
                answeredCount++;
                if (questions[i].isCorrect) {
                    score++;
                }
            }
        }

        // Display score and title
        const percentage = answeredCount === 0 ? 0 : ((score / answeredCount) * 100).toFixed(1);
        resultsTitleElement.innerText = `"${currentQuizName}" 答题结束！`;
        scoreTextElement.textContent = `你的得分: ${score} / ${answeredCount} (答对 ${percentage}%) - 共 ${questions.length} 题`;

        // Generate review list (Restored)
        let reviewListHtml = '<h3>题目回顾 (点击错误或未答题号查看详情):</h3><ul>';
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            if (question.userAnswer) {
                reviewListHtml += `<li data-index="${i}" class="answered`;
                if (!question.isCorrect) {
                    reviewListHtml += ' incorrect" title="点击查看详情 (错误)"'; // Add tooltip
                } else {
                    reviewListHtml += ' correct" title="回答正确"'; // Add tooltip
                }
                reviewListHtml += `>${i + 1}</li>`;
            } else {
                reviewListHtml += `<li data-index="${i}" class="unanswered" title="点击查看详情 (未答)">${i + 1}</li>`; // Mark unanswered & add tooltip
            }
        }
        reviewListHtml += '</ul>';
        resultsSummaryElement.innerHTML = reviewListHtml;

        // Add click listeners (Only for incorrect/unanswered)
        resultsSummaryElement.querySelectorAll('li.incorrect, li.unanswered').forEach(item => {
            item.style.cursor = 'pointer'; // Ensure cursor indicates clickability
            item.addEventListener('click', () => {
                const questionIndex = parseInt(item.getAttribute('data-index'));
                if (questions[questionIndex]) {
                    showQuestionDetails(questionIndex);
                }
            });
        });
         // Style correct answers (no click handler needed here)
        resultsSummaryElement.querySelectorAll('li.correct').forEach(item => {
             item.style.cursor = 'default'; // Indicate no action
        });

        // Show Results buttons
        backToSelectionFromResultsBtn.style.display = 'inline-block';
        restartBtn.style.display = 'inline-block';

        removeBackToResultsButton(); // Clean up detail view button just in case
    }

    // --- Display Question Details --- Shows details for a specific question
    function showQuestionDetails(index) {
        // Hide results and progress
        resultsContainer.style.display = 'none';
        progressContainer.style.display = 'none';
        backToSelectionFromResultsBtn.style.display = 'none'; // Hide results buttons
        restartBtn.style.display = 'none';

        // Show question parts
        questionContainer.style.display = 'block';
        optionsContainer.style.display = 'flex';
        feedbackElement.style.display = 'block';
        navigationButtons.style.display = 'block'; // Show container for the back button
        backToSelectionBtn.style.display = 'none'; // Ensure in-quiz back is hidden

        const question = questions[index];
        questionTextElement.innerText = `${index + 1}. ${question.question}`;
        optionsContainer.innerHTML = ''; // Clear previous options
        feedbackElement.innerHTML = ``; // Clear previous feedback initially
        feedbackElement.className = 'feedback'; // Reset feedback class

        // Display options (disabled)
        const optionKeys = Object.keys(question.options);
        optionKeys.forEach(key => {
             const option = question.options[key];
            const optionId = `option-${key}-detail`; // Use unique ID for detail view inputs
            const label = document.createElement('label');
            label.htmlFor = optionId;
            label.classList.add('option-label');

            const input = document.createElement('input');
            input.id = optionId;
            input.name = `options-detail-${index}`;
            input.value = key;
            input.disabled = true; // Disable interaction in detail view

            if (question.type === 'multiple') {
                input.type = 'checkbox';
                // Check if this option was part of the user's submitted answer
                if (question.userAnswer && question.userAnswer.includes(key)) {
                    input.checked = true;
                }
            } else {
                input.type = 'radio';
                // Check if this option was the user's submitted answer
                if (question.userAnswer === key) {
                    input.checked = true;
                }
            }

            const span = document.createElement('span');
            span.textContent = (question.type === 'truefalse') ? key : `${key}. ${option}`;

            label.appendChild(input);
            label.appendChild(span);
            optionsContainer.appendChild(label);

            // Apply highlighting based on correctness
            const correctKeys = question.type === 'multiple' ? question.answer.split('') : [question.answer];
            const userAnswerKey = question.userAnswer;
            const isCorrect = question.isCorrect;

            // Highlight correct answer(s)
            if (correctKeys.includes(key)) {
                label.style.backgroundColor = '#d4edda'; // Light green for correct option
                label.style.borderColor = '#c3e6cb';
                label.style.fontWeight = 'bold';
            }

            // Highlight user's incorrect choice(s)
            if (!isCorrect) {
                 if ( (question.type === 'multiple' && userAnswerKey && userAnswerKey.includes(key) && !correctKeys.includes(key)) || (question.type !== 'multiple' && userAnswerKey === key) ) {
                    label.style.backgroundColor = '#f8d7da'; // Light red for incorrect user choice
                    label.style.borderColor = '#f5c6cb';
                 }
            }
        });

        // Display feedback about user's answer vs correct answer
        feedbackElement.innerHTML = `你的答案: ${question.userAnswer || '未作答'} | 正确答案: ${question.answer}`;
        feedbackElement.className = question.isCorrect ? 'feedback correct' : 'feedback incorrect';

        // Hide standard quiz navigation buttons within the container
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
        // Reset option highlights before displaying next question
        const labels = optionsContainer.querySelectorAll('.option-label');
        labels.forEach(label => {
            label.style.backgroundColor = '';
            label.style.borderColor = '';
            label.style.fontWeight = '';
        });
        displayQuestion();
    });
    restartBtn.addEventListener('click', restartQuiz); // Restarts the current quiz
    finishBtn.addEventListener('click', showResults);
    backToSelectionBtn.addEventListener('click', displayQuizSelection); // Back from quiz
    backToSelectionFromResultsBtn.addEventListener('click', displayQuizSelection); // Back from results

});