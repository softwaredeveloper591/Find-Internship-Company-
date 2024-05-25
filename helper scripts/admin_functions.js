function updateAnnouncement(announcementId, isApproved) {
	const feedback = document.getElementById('feedback').value;
    fetch(`/admin/announcement/${announcementId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved, feedback })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        location.href = '/Admin/announcementRequests';
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

/*function updateApplication(applicationId, isApproved) {
	const feedback = document.getElementById('feedback').value;
	const fileInput = document.getElementById('fileInput');
	const file = fileInput.files[0];
	
	const formData = new FormData();
	formData.append('isApproved', isApproved);
	formData.append('feedback', feedback);
	if (file) {
		formData.append('file', file);
	}

	fetch(`/admin/applications/${applicationId}`, {
		method: "PUT",
		body: formData
	})
	.then(response => response.json())
	.then(data => {
		alert(data.message);
		location.href = '/Admin/applicationRequests';
	})
	.catch(error => {
		console.error("Error processing the request:", error);
		alert("An error occurred. Please try again later.");
	});
}*/

async function downloadButton(applicationId, fileType) {
	try {
		const response = await fetch(`/admin/applications/download/${applicationId}/${fileType}`);
		if (!response.ok) {
			throw new Error('Failed to download file');
		}

		const blob = await response.blob();
		const contentDispositionHeader = response.headers.get('Content-Disposition');
		const filename = contentDispositionHeader.split('filename=')[1].replace(/"/g, '');
		const url = window.URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	} catch (error) {
		console.error('Error downloading file:', error);
	}
}

