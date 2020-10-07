namespace Index {
	class SponsorModalManager {
		private readonly modal = document.querySelector(".modal") as HTMLDivElement;

		private readonly name = document.getElementById("sponsor-name") as HTMLHeadingElement;
		private readonly about = document.getElementById("company-about") as HTMLElement;
		private readonly website = document.getElementById("company-website") as HTMLAnchorElement;
		private readonly eventInformation = document.getElementById("company-eventInformation") as HTMLElement;
		private readonly challengeInformation = document.getElementById("company-challengeInformation") as HTMLElement;
		private readonly recruiting = document.getElementById("company-recruiting") as HTMLElement;
		private readonly additionalInfo = document.getElementById("company-additionalInfo") as HTMLElement;
		private readonly participantLink = document.getElementById("company-participantLink") as HTMLAnchorElement;

		constructor() {
			document.querySelector(".modal-background")!.addEventListener("click", () => this.close());
			this.modal.querySelector(".delete")!.addEventListener("click", () => this.close());
			document.getElementById("detail-close")!.addEventListener("click", () => this.close());
			document.addEventListener("keydown", e => { if (e.key === "Escape") this.close() });
		}

		public get isOpen(): boolean {
			return this.modal.classList.contains("is-active");
		}

		public close() {
			this.modal.classList.remove("is-active");
			this.name.innerHTML = "";
			this.about.innerHTML = "";
			this.website.href = "http://insight.hack.gt";
			this.website.innerHTML = "";
			this.eventInformation.innerHTML = "";
			this.challengeInformation.innerHTML = "";
			this.recruiting.innerHTML = "";
			this.additionalInfo.innerHTML = ""
			this.participantLink.href = "http://insight.hack.gt";
		}

		public open(company:string) {
			fetchSpecificSponsor(company).then( (response) => {
				if (response.name) {
					this.name.innerHTML = response.name;
				}
				if (response.about) {
					this.about.innerHTML = response.about;
				}
				if (response.website) {
					this.website.href = response.website;
					this.website.innerHTML = response.website;
				}
				if (response.eventInformation) {
					this.eventInformation.innerHTML = response.eventInformation;
				}
				if (response.challengeInformation) {
					this.challengeInformation.innerHTML = response.challengeInformation;
				}
				if (response.recruiting) {
					this.recruiting.innerHTML = response.recruiting;
				}
				if (response.additionalInfo) {
					this.additionalInfo.innerHTML = response.additionalInfo
				}
				if (response.blueJeansLink) {
					this.participantLink.href = response.blueJeansLink
				}
			});
			this.modal.classList.add("is-active");
		}
	}

	const detailModalManager = new SponsorModalManager();

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
				let link = "/uploads/" + response.link;
				// link = encodeURIComponent(link);

				if (path.toLowerCase().indexOf(".doc") !== -1) {
					// Special viewer for Word documents
					resume.src = `${link}`;
				}
				else {
					// Google Drive Viewer supports a bunch of formats including PDFs, Pages, images
					resume.src = `${link}`;
				}
			});

		let sponsorView = document.getElementById("sponsor-content");
		fetchSponsors().then(response => {
			response.forEach((sponsor) => {
				var name = document.createElement("p");
				name.innerHTML = sponsor.name;
				var box = document.createElement("div");
				box.appendChild(name);
				box.classList.add('button');
				box.classList.add('sponsor');
				box.addEventListener("click", () => {
					console.log("click");
					detailModalManager.open(sponsor.name);
				});

				sponsorView?.appendChild(box);
			})
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
