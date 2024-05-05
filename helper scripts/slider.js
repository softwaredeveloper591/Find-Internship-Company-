const loginText = document.querySelector(".title-text .registerStudent");
const loginForm = document.querySelector("form.registerStudent");
const loginBtn = document.querySelector("label.registerStudent");
const signupBtn = document.querySelector("label.registerCompany");

signupBtn.onclick = (()=>{
    loginForm.style.marginLeft = "-50%";
    loginText.style.marginLeft = "-50%";
});
loginBtn.onclick = (()=>{
    loginForm.style.marginLeft = "0%";
    loginText.style.marginLeft = "0%";
});