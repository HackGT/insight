namespace Index {
	const resume = document.getElementById("resume") as HTMLIFrameElement | null;
	const path = resume?.dataset.path;
	if (resume && path) {
		let options: RequestInit = {
			method: "GET",
			credentials: "include"
		};
		fetch(`/${path}?public=true`, options)
			.then(response => response.json() as Promise<APIResponse>)
			.then(response => {
				if (!resume) return;
				if (!response.success) {
					alert(response.error);
					return;
				}
				let link = window.location.origin + "/uploads/" + response.link;
				link = encodeURIComponent(link);

				if (path.toLowerCase().indexOf(".doc") !== -1) {
					// Special viewer for Word documents
					resume.src = `https://view.officeapps.live.com/op/view.aspx?src=${link}`;
				}
				else {
					// Google Drive Viewer supports a bunch of formats including PDFs, Pages, images
					resume.src = `https://drive.google.com/viewerng/viewer?embedded=true&url=${link}`;
				}
			});
	}

	const resumeUpload = document.getElementById("resume-upload") as HTMLInputElement;
	resumeUpload.addEventListener("change", () => {
		resumeUpload.disabled = true;
		if (!resumeUpload.files) return;
		if (resumeUpload.files.length) {
			const fileNameElement = document.querySelector(".file-name") as HTMLElement;
			fileNameElement.textContent = resumeUpload.files[0].name;
		}
		let xhr = new XMLHttpRequest();
		xhr.upload.onprogress = e => {
			// TODO: add progress bar
			let percent = Math.round(100 * e.loaded / e.total);
			console.log(percent);
		};
		xhr.upload.onerror = () => {
			alert(`Upload error: ${xhr.statusText}`);
			resumeUpload.disabled = false;
		};
		xhr.onload = () => {
			window.location.reload();
		};
		xhr.open("POST", "/uploads");

		let form = new FormData();
		form.append("resume", resumeUpload.files[0]);
		xhr.send(form);
	});
}
