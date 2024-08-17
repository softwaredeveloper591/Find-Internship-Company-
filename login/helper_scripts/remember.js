const rmCheck = document.getElementById("remember"),
    emailInput = document.getElementById("email");

if (localStorage.checkbox && localStorage.checkbox !== "") {
  rmCheck.setAttribute("checked", "checked");
  emailInput.value = localStorage.email;
} else {
  rmCheck.removeAttribute("checked");
  emailInput.value = "";
}

function lsRememberMe() {
  	if (rmCheck.checked && emailInput.value !== "") {
    	localStorage.email = emailInput.value;
    	localStorage.checkbox = rmCheck.value;
  	} else {
    	localStorage.email = "";
    	localStorage.checkbox = "";
	}
}