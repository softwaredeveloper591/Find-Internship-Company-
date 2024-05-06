const registerStudentText = document.querySelector(".title-text .registerStudent");
const registerStudentForm = document.querySelector("form.registerStudent");
const registerCompanyForm = document.querySelector("form.registerCompany");
const registerStudentBtn = document.querySelector("label.registerStudent");
const registerCompanyBtn = document.querySelector("label.registerCompany");
borderStyle = "1px solid #ccc";

registerCompanyBtn.onclick = (()=>{
    document.querySelectorAll('.registerStudent .error').forEach(el => el.textContent = '');
    document.querySelectorAll('.registerStudent .error').forEach(el => el.style.display = 'none');
    studentForm.querySelectorAll('input').forEach(input => {input.style.border = borderStyle;});
    registerStudentForm.reset();
    registerStudentForm.style.marginLeft = "-50%";
    registerStudentText.style.marginLeft = "-50%";
});
registerStudentBtn.onclick = (()=>{
    document.querySelectorAll('.registerCompany .error').forEach(el => el.textContent = '');
    document.querySelectorAll('.registerCompany .error').forEach(el => el.style.display = 'none');
    companyForm.querySelectorAll('input').forEach(input => {input.style.border = borderStyle;});
    registerCompanyForm.reset();
    registerStudentForm.style.marginLeft = "0%";
    registerStudentText.style.marginLeft = "0%";
});