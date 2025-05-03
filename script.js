document.addEventListener('DOMContentLoaded', () => {
    const questionTextElement = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackElement = document.getElementById('feedback');
    const submitBtn = document.getElementById('submit-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressTextElement = document.getElementById('progress-text');
    const resultsContainer = document.getElementById('results-container');
    const scoreTextElement = document.getElementById('score-text');
    const restartBtn = document.getElementById('restart-btn');
    const quizContainer = document.querySelector('.quiz-container'); // Main container for questions

    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;

    // --- Fetch Questions --- Fetch questions from the JSON file
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
            input.name = 'options';
            input.value = key;

            if (currentQuestion.type === 'multiple') {
                input.type = 'checkbox';
            } else { // single or truefalse
                input.type = 'radio';
            }

            const span = document.createElement('span');
             // For True/False, use the key; otherwise, format as Key. Text
            span.textContent = (currentQuestion.type === 'truefalse') ? key : `${key}. ${option}`;

            label.appendChild(input);
            label.appendChild(span);
            optionsContainer.appendChild(label);
        });

        updateProgress();
        submitBtn.disabled = false;
        submitBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';
    }

    // --- Submit Answer --- Handles answer submission and feedback
    function submitAnswer() {
        const currentQuestion = questions[currentQuestionIndex];
        let selectedAnswer;

        if (currentQuestion.type === 'multiple') {
            const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
            selectedAnswer = Array.from(checkedBoxes).map(cb => cb.value).sort().join('');
        } else {
            const selectedRadio = optionsContainer.querySelector('input[type="radio"]:checked');
            selectedAnswer = selectedRadio ? selectedRadio.value : null;
        }

        if (selectedAnswer === null && currentQuestion.type !== 'multiple') {
             feedbackElement.innerText = '请选择一个选项！';
             feedbackElement.className = 'feedback incorrect'; // Use incorrect styling for prompt
             return; // Don't proceed if nothing is selected for single/tf
        } else if (currentQuestion.type === 'multiple' && selectedAnswer === '') {
            feedbackElement.innerText = '请至少选择一个选项！';
            feedbackElement.className = 'feedback incorrect'; // Use incorrect styling for prompt
            return; // Don't proceed if nothing is selected for multiple
        }

        const correctAnswer = currentQuestion.answer;
        const isCorrect = selectedAnswer === correctAnswer;

        if (isCorrect) {
            score++;
            feedbackElement.innerText = '回答正确！';
            feedbackElement.className = 'feedback correct';
        } else {
            feedbackElement.innerText = `回答错误。正确答案是：${correctAnswer}`;
            feedbackElement.className = 'feedback incorrect';
            // Optionally highlight the correct answer(s)
            highlightCorrectAnswer(correctAnswer, currentQuestion.type);
        }

        // Disable options after submission
        const inputs = optionsContainer.querySelectorAll('input');
        inputs.forEach(input => input.disabled = true);

        submitBtn.disabled = true;
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
    }

    // --- Highlight Correct Answer --- Visually indicates the correct option(s)
     function highlightCorrectAnswer(correctAnswer, type) {
        const correctKeys = type === 'multiple' ? correctAnswer.split('') : [correctAnswer];
        correctKeys.forEach(key => {
            const correctInput = document.getElementById(`option-${key}`);
            if (correctInput && correctInput.parentElement) {
                correctInput.parentElement.style.backgroundColor = '#d4edda'; // Light green background
                correctInput.parentElement.style.borderColor = '#28a745';
                correctInput.parentElement.style.fontWeight = 'bold';
            }
        });
    }

    // --- Update Progress --- Shows the current question number out of total
    function updateProgress() {
        progressTextElement.innerText = `进度: ${currentQuestionIndex + 1} / ${questions.length}`;
    }

    // --- Show Results --- Displays the final score and restart option
    function showResults() {
        quizContainer.style.display = 'none'; // Hide questions area
        resultsContainer.style.display = 'block';
        const percentage = ((score / questions.length) * 100).toFixed(1);
        scoreTextElement.innerText = `你的得分: ${score} / ${questions.length} (${percentage}%)`;
    }

    // --- Restart Quiz --- Resets the quiz state and starts over
    function restartQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        resultsContainer.style.display = 'none';
        quizContainer.style.display = 'block'; // Show questions area again
        displayQuestion();
    }

    // --- Show Error --- Displays an error message if loading fails
    function showError(message) {
        quizContainer.innerHTML = `<p style="color: red; font-weight: bold;">${message}</p>`;
    }

    // --- Event Listeners ---
    submitBtn.addEventListener('click', submitAnswer);
    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });
    restartBtn.addEventListener('click', restartQuiz);
});
