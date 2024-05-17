const studentForm = document.querySelector('form.registerStudent');
const companyForm = document.querySelector('form.registerCompany');
borderStyle = "1px solid #ccc";
borderStyleError = '1px solid red';
    
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

	const duplicateError = document.querySelector('.duplicate.error');
	const confirmError = document.querySelector('.confirm.error');
	const emailError = document.querySelector('.email.error');
	const passwordError = document.querySelector('.password.error');
    
    // Reset errors
    duplicateError.textContent = '';
    confirmError.textContent = '';
    emailError.textContent = '';
    passwordError.textContent = '';

    // Hide all error messages
    document.querySelectorAll('.error').forEach(error => {
        error.style.display = 'none';
        //error.textContent = ''
    });

    // Set borders to their pervious state
    const inputs = studentForm.querySelectorAll('input');
    inputs.forEach(input => {
        input.style.border = borderStyle;
    });

    // Get student form values
    const email = studentForm.querySelector('#student-email').value;
    const password = studentForm.querySelector('#student-password').value;
    const confirmPassword = studentForm.querySelector('#student-confirmPassword').value;

    try {
        const res = await fetch('/signup/student', { 
            method: 'POST', 
            body: JSON.stringify({ email, password, confirmPassword }),
            headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if (data.errors) {
            duplicateError.textContent = data.errors.duplicate;
            confirmError.textContent = data.errors.confirmPassword;
            emailError.textContent = data.errors.email;
            passwordError.textContent = data.errors.password;
            // Show only the latest error
            if (duplicateError.textContent !== '') {
                duplicateError.style.display = 'block';
            } else if (confirmError.textContent !== '') {
                confirmError.style.display = 'block';
                studentForm.querySelector('#student-password').style.border = borderStyleError;
                studentForm.querySelector('#student-confirmPassword').style.border = borderStyleError;
            } else if (emailError.textContent !== '') {
                emailError.style.display = 'block';
                studentForm.querySelector('#student-email').style.border = borderStyleError;
            } else if (passwordError.textContent !== '') {
                passwordError.style.display = 'block';
                studentForm.querySelector('#student-password').style.border = borderStyleError;
            }
        }
        if (data.student) {
            location.assign('/student'); 
        }
    } catch (err) {
        emailError.textContent = 'Failed to communicate with the server';
    }
});

companyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
	const duplicateError = document.querySelector('form.registerCompany .duplicate.error');
	const confirmError = document.querySelector('form.registerCompany .confirm.error');
	const emailError = document.querySelector('form.registerCompany .email.error');
	const passwordError = document.querySelector('form.registerCompany .password.error');

    // Reset errors
    duplicateError.textContent = '';
    confirmError.textContent = '';
    emailError.textContent = '';
    passwordError.textContent = '';

    // Hide all error messages
    document.querySelectorAll('.error').forEach(error => {
        error.style.display = 'none';
    });

    // Set borders to their previous state
    const inputs = companyForm.querySelectorAll('input');
    inputs.forEach(input => {
        input.style.border = borderStyle;
    });

    // Get company form values
    const name = companyForm.querySelector('#company-name').value;
    const username = companyForm.querySelector('#representative-name').value;
    const email = companyForm.querySelector('#company-email').value;
    const address = companyForm.querySelector('#company-address').value;
    const password = companyForm.querySelector('#company-password').value;
    const confirmPassword = companyForm.querySelector('#company-confirmPassword').value;

    try {
        const res = await fetch('/signup/company', { 
            method: 'POST', 
            body: JSON.stringify({ name, username, email, address, password, confirmPassword }),
            headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if (data.errors) {
            duplicateError.textContent = data.errors.duplicate;
            confirmError.textContent = data.errors.confirmPassword;
            emailError.textContent = data.errors.email;
            passwordError.textContent = data.errors.password;
            // Show only the latest error
            if (duplicateError.textContent !== '') {
                duplicateError.style.display = 'block';
                companyForm.querySelector('#company-name').style.border = borderStyleError;
                companyForm.querySelector('#company-email').style.border = borderStyleError;
            } else if (confirmError.textContent !== '') {
                confirmError.style.display = 'block';
                companyForm.querySelector('#company-password').style.border = borderStyleError;
                companyForm.querySelector('#company-confirmPassword').style.border = borderStyleError;
            } else if (emailError.textContent !== '') {
                emailError.style.display = 'block';
                companyForm.querySelector('#company-email').style.border = borderStyleError;
            } else if (passwordError.textContent !== '') {
                passwordError.style.display = 'block';
                companyForm.querySelector('#company-password').style.border = borderStyleError;
            }
        }
        if (data.message) {
            alert(data.message);
        }
    } catch (err) {
        emailError.textContent = 'Failed to communicate with the server';
    }
});