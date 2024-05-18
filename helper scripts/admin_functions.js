function updateAnnouncement(announcementId, isApproved) {
    fetch(`/admin/announcement/${announcementId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        location.reload(); // Reload the page to refresh the content
    })
    .catch(error => {
        console.error("Error processing the request:", error);
        alert("An error occurred. Please try again later.");
    });
}

function updateCompanyRequest(companyId, isApproved) {
    fetch(`/admin/company/${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            location.reload(); // Reload the page to refresh the content
        } else {
            alert("Action failed: " + (data.errors || "Unknown error"));
        }
    })
    .catch(error => {
        console.error("Error processing the request:", error);
        alert("An error occurred. Please try again later.");
    });
}

function updateApplication(applicationId, isApproved) {
	fetch(`/admin/applications/${applicationId}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ isApproved })
	})
	.then(response => response.json())
	.then(data => {
		alert(data.message);
		location.reload(); // Reload the page to refresh the content
	})
	.catch(error => {
		console.error("Error processing the request:", error);
		alert("An error occurred. Please try again later.");
	});
}