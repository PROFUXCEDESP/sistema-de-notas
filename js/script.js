// --- CONFIGURAÇÃO ---
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9cvTebnz9iwpPCorijfmorLPU-h1nKhBksdduC0lowsLWOAPb30Lce96Z-wsZPiIhOQy0N08T-wUo/pub?output=csv';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyupx9Onknj43wG1tAbxD2wBiNT_4LBgmhzLr5zEwaPubmBEkOgoAyZWl4sUHJrtKw6/exec';
const FOTO_PADRAO_URL = 'https://i.imgur.com/3c8l2K6.png'; // URL de uma foto padrão/placeholder

// --- ELEMENTOS DO DOM ---
const loginContainer = document.getElementById('login-container');
const passwordSetupContainer = document.getElementById('password-setup-container');
const studentArea = document.getElementById('student-area');
const loginForm = document.getElementById('login-form');
const studentIdInput = document.getElementById('student-id');
const passwordInput = document.getElementById('password');
const loginErrorMessage = document.getElementById('login-error-message');
const loginButton = loginForm.querySelector('button[type="submit"]');

const passwordSetupForm = document.getElementById('password-setup-form');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordErrorMessage = document.getElementById('password-error-message');
const passwordSetupButton = passwordSetupForm.querySelector('button[type="submit"]');

let currentStudentId = null;

// --- FUNÇÕES ---
async function getStudentData() {
    try {
        const response = await fetch(`${GOOGLE_SHEET_URL}&timestamp=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Falha na rede ao buscar dados.');
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.trim());
        const headers = rows[0].split(',').map(h => h.trim());
        const data = rows.slice(1).filter(row => row).map(row => {
            const values = row.split(',');
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] ? values[index].trim() : '';
            });
            return obj;
        });
        return data;
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        loginErrorMessage.textContent = 'Erro de comunicação com a base de dados.';
        return null;
    }
}

// --- EVENT LISTENERS ---
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginErrorMessage.textContent = '';
    loginButton.disabled = true;
    loginButton.textContent = 'Verificando...';

    const studentId = studentIdInput.value.trim();
    const passwordOrCode = passwordInput.value.trim();
    const students = await getStudentData();

    loginButton.disabled = false;
    loginButton.textContent = 'Acessar';

    if (!students) return;
    const student = students.find(s => s.ID_Aluno === studentId);

    if (!student) {
        loginErrorMessage.textContent = 'ID do Aluno não encontrado.';
        return;
    }
    if (student.Senha === '' && student.CodigoTemporario === passwordOrCode) {
        currentStudentId = student.ID_Aluno;
        loginContainer.classList.add('hidden');
        passwordSetupContainer.classList.remove('hidden');
    } else if (student.Senha !== '' && student.Senha === passwordOrCode) {
        loginContainer.classList.add('hidden');
        populateStudentArea(student);
        studentArea.classList.remove('hidden');
    } else {
        loginErrorMessage.textContent = 'Senha ou Código Temporário inválido.';
    }
});

passwordSetupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    // ... (O restante desta função continua exatamente igual)
    passwordErrorMessage.textContent = '';
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword.length !== 4) {
        passwordErrorMessage.textContent = 'A senha deve ter exatamente 4 números.';
        return;
    }
    if (newPassword !== confirmPassword) {
        passwordErrorMessage.textContent = 'As senhas não coincidem.';
        return;
    }

    passwordSetupButton.disabled = true;
    passwordSetupButton.textContent = 'Salvando...';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ studentId: currentStudentId, newPassword: newPassword }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'success') {
            alert('Senha cadastrada com sucesso! Você será redirecionado para a tela de login.');
            window.location.reload();
        } else {
            passwordErrorMessage.textContent = result.message || 'Erro ao salvar a senha.';
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        passwordErrorMessage.textContent = 'Erro de comunicação ao salvar a senha. Verifique a implantação do Apps Script.';
    } finally {
        passwordSetupButton.disabled = false;
        passwordSetupButton.textContent = 'Cadastrar Senha';
    }
});

document.querySelectorAll('.password-toggle-checkbox input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function () {
        const input = this.closest('.input-group').querySelector('input[type="password"], input[type="text"]');
        if (input) {
            input.setAttribute('type', this.checked ? 'text' : 'password');
        }
    });
});

// --- FUNÇÕES DA ÁREA DO ALUNO ---
let performanceChart = null;
const logoutButton = document.getElementById('logout-button');

function populateStudentArea(student) {
    document.getElementById('student-photo').src = student.FotoURL || FOTO_PADRAO_URL;
    document.getElementById('student-name').textContent = student.NomeCompleto;
    document.getElementById('student-course').textContent = student.Curso;
    document.getElementById('student-class').textContent = student.Turma;
    
    const notaUXValue = student.NotaUX || "0";
    const notaHTMLValue = student.NotaHTML || "0";
    const notaProjetoValue = student.NotaProjeto || "0";
    const mediaFinalValue = student.MediaFinal || "0";

    const notaUX = parseFloat(notaUXValue.replace(',', '.'));
    const notaHTML = parseFloat(notaHTMLValue.replace(',', '.'));
    const notaProjeto = parseFloat(notaProjetoValue.replace(',', '.'));
    const mediaFinal = parseFloat(mediaFinalValue.replace(',', '.'));

    document.getElementById('grade-ux').textContent = isNaN(notaUX) ? '0.0' : notaUX.toFixed(1);
    document.getElementById('grade-html').textContent = isNaN(notaHTML) ? '0.0' : notaHTML.toFixed(1);
    document.getElementById('grade-project').textContent = isNaN(notaProjeto) ? '0.0' : notaProjeto.toFixed(1);
    document.getElementById('grade-final').textContent = isNaN(mediaFinal) ? '0.0' : mediaFinal.toFixed(1);
    
    createChart([notaUX, notaHTML, notaProjeto]);
}

function createChart(grades) {
    // ... (Esta função continua exatamente igual)
    const ctx = document.getElementById('performanceChart').getContext('2d');
    if (performanceChart) performanceChart.destroy();
    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['UX UI Design', 'HTML 5 & CSS 3', 'Projeto Final'],
            datasets: [{
                label: 'Nota',
                data: grades,
                backgroundColor: 'rgba(57, 73, 171, 0.7)',
                borderColor: 'rgba(57, 73, 171, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

logoutButton.addEventListener('click', () => {
    // ... (Esta função continua exatamente igual)
    studentArea.classList.add('hidden');
    passwordSetupContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    studentIdInput.value = '';
    passwordInput.value = '';
});