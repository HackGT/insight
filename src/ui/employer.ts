namespace Employer {
	// Slight differences (due to JSON representation) between this interface and the same one in schema.ts
	interface IVisit {
		_id: string;
		uuid: string;
		name: string;
		email: string;
		major?: string;
		githubUsername?: string;
		website?: string;
		lookingFor?: {
			timeframe?: string[];
			comments?: string;
		};
		interestingDetails?: {
			favoriteLanguages?: string[];
			proudOf?: string;
			funFact?: string;
		};
		resume?: {
			path: string;
			size: number;
		};
		teammates: string[]; // UUIDs of teammates (can be empty)

		company: string;
		tags: string[];
		notes: string[];
		time: string;
		scannerID: string;
		employees: {
			uuid: string;
			name: string;
			email: string;
		}[]; // Single scanner can be associated with multiple employees
	}

	function serializeQueryString(data: object): string {
		return Object.keys(data).map(key => {
			return encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
		}).join("&");
	}

	interface APIResponse {
		success?: boolean;
		error?: string;
		[other: string]: unknown;
	}

	async function sendRequest(method: "POST" | "DELETE" | "PUT" | "PATCH", url: string, data?: object, reload = true) {
		let options: RequestInit = {
			method,
			credentials: "include"
		};
		if (data) {
			options = {
				...options,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
				},
				body: serializeQueryString(data)
			};
		}

		let response: APIResponse = await fetch(url, options).then(response => response.json());
		if (!response.success) {
			alert(response.error);
		}
		else if (reload) {
			window.location.reload();
		}
	}

	// Before user is associated with a company

	const companySelect = document.getElementById("company-request") as HTMLSelectElement | null;
	const companyRequest = document.getElementById("submit-company-request") as HTMLButtonElement | null;
	if (companySelect && companyRequest) {
		companyRequest.addEventListener("click", async () => {
			companySelect.disabled = true;
			companyRequest.disabled = true;
			try {
				let company = companySelect.value;
				if (!company || company === "Please select") return;

				await sendRequest("POST", `/api/company/${encodeURIComponent(company)}/join`);
			}
			finally {
				companySelect.disabled = false;
				companyRequest.disabled = false;
			}
		});
	}

	// After association
	const modal = document.querySelector(".modal");
	document.querySelector(".modal-background").addEventListener("click", () => modal.classList.remove("is-active"));
	modal.querySelector(".delete").addEventListener("click", () => modal.classList.remove("is-active"));
	document.addEventListener("keydown", e => { if (e.key === "Escape") modal.classList.remove("is-active") });
	class TableManager {
		private readonly tbody: HTMLTableSectionElement;
		private readonly template: HTMLTemplateElement;

		constructor(id: string) {
			const table = document.getElementById(id);
			if (!table) {
				throw new Error(`Could not find table with ID: ${id}`);
			}
			this.tbody = table.querySelector("tbody");
			this.template = document.getElementById("table-row") as HTMLTemplateElement;
		}

		private generateTag(visit: IVisit, tag: string): HTMLSpanElement | null {
			let control = document.createElement("div");
			control.classList.add("control");
			let tagContainer = document.createElement("div");
			tagContainer.classList.add("tags", "has-addons");
			let tagSpan = document.createElement("span");
			tagSpan.textContent = tag;
			tagSpan.dataset.tag = tag;
			tagSpan.dataset.id = visit._id;
			tagSpan.classList.add("tag");
			if (tag === "starred") {
				tagSpan.classList.add("is-warning");
			}
			if (tag === "flagged") {
				tagSpan.classList.add("is-danger");
			}
			let deleteButton = document.createElement("span");
			deleteButton.classList.add("tag", "is-delete");
			let locked = false;
			deleteButton.addEventListener("click", async () => {
				if (locked) return;
				locked = true;
				await sendRequest("DELETE", `/api/visit/${visit._id}/tag`, { tag }, false);
				control.remove();
				visit.tags = visit.tags.filter(t => t !== tag);
				if (modal.classList.contains("is-active")) {
					let tagSpan = document.querySelector(`.tags-column .tag[data-tag="${tag}"][data-id="${visit._id}"]`);
					if (tagSpan) {
						tagSpan.parentElement!.parentElement!.remove();
					}
				}
			});

			tagContainer.appendChild(tagSpan);
			tagContainer.appendChild(deleteButton);
			control.appendChild(tagContainer);

			return control;
		}

		public addRow(visit: IVisit) {
			let row = document.importNode(this.template.content, true);
			const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			const time = new Date(visit.time);
			row.getElementById("time").textContent = `${time.getHours()}:${time.getMinutes()} on ${time.getDate()} ${months[time.getMonth()]}`;
			row.getElementById("name").textContent = visit.name;
			row.getElementById("major").textContent = visit.major || "Unknown";
			const githubLink = row.querySelector(".github") as HTMLAnchorElement;
			if (visit.githubUsername) {
				githubLink.href = `https://github.com/${visit.githubUsername}`;
			}
			else {
				githubLink.parentElement!.remove();
			}
			const websiteLink = row.querySelector(".website") as HTMLAnchorElement;
			if (visit.website) {
				websiteLink.href = visit.website;
			}
			else {
				websiteLink.parentElement!.remove();
			}

			const tags = row.getElementById("tags");
			// Remove all previous children
			while (tags.firstChild) {
				tags.removeChild(tags.firstChild);
			}
			for (let tag of visit.tags) {
				tags.appendChild(this.generateTag(visit, tag));
			}

			const starAction = row.querySelector(".star-action") as HTMLButtonElement;
			starAction.addEventListener("click", async () => {
				starAction.disabled = true;
				let addStar: boolean = visit.tags.indexOf("starred") === -1;
				await sendRequest(addStar ? "POST" : "DELETE", `/api/visit/${visit._id}/tag`, { tag: "starred" }, false);

				if (addStar) {
					tags.appendChild(this.generateTag(visit, "starred"));
					visit.tags.push("starred");
				}
				else {
					tags.querySelector(`.tag[data-tag="starred"]`).parentElement!.parentElement!.remove();
					visit.tags = visit.tags.filter(t => t !== "starred");
				}
				starAction.disabled = false;
			});
			const tagAction = row.querySelector(".tag-action") as HTMLButtonElement;
			tagAction.addEventListener("click", async () => {
				tagAction.disabled = true;

				let tag = (prompt("Tag:") || "").trim().toLowerCase();
				if (!tag) return;
				if (visit.tags.indexOf(tag) !== -1) {
					tagAction.disabled = false;
					return;
				}

				await sendRequest("POST", `/api/visit/${visit._id}/tag`, { tag }, false);
				tags.appendChild(this.generateTag(visit, tag));
				visit.tags.push(tag);
				tagAction.disabled = false;
			});
			const viewAction = row.querySelector(".view-action") as HTMLButtonElement;
			viewAction.addEventListener("click", async () => {
				viewAction.disabled = true;
				await this.showModal(visit._id);
				viewAction.disabled = false;
			});

			this.tbody.appendChild(row);
		}

		public async showModal(id: string) {
			let options: RequestInit = {
				method: "GET",
				credentials: "include"
			};
			let response: APIResponse = await fetch(`/api/visit/${id}`, options).then(response => response.json());
			if (!response.success) {
				alert(response.error);
				return;
			}
			console.log(response.visit);
			let visit = response.visit as IVisit;

			document.getElementById("detail-name").textContent = visit.name;
			document.getElementById("detail-major").textContent = visit.major || "Unknown Major";
			if (visit.lookingFor && visit.lookingFor.timeframe && visit.lookingFor.timeframe.length > 0) {
				document.getElementById("detail-timeframe").textContent = visit.lookingFor.timeframe.join(", ");
			}
			else {
				document.getElementById("detail-timeframe").innerHTML = "<em>N/A</em>";
			}
			if (visit.lookingFor && visit.lookingFor.comments) {
				document.getElementById("detail-timeframe-comments").textContent = visit.lookingFor.comments;
			}
			else {
				document.getElementById("detail-timeframe-comments").innerHTML = "<em>N/A</em>";
			}
			if (visit.interestingDetails && visit.interestingDetails.favoriteLanguages && visit.interestingDetails.favoriteLanguages.length > 0) {
				document.getElementById("detail-programming-languages").textContent = visit.interestingDetails.favoriteLanguages.join(", ");
			}
			else {
				document.getElementById("detail-programming-languages").innerHTML = "<em>N/A</em>";
			}
			const tags = document.getElementById("detail-tags");
			while (tags.firstChild) {
				tags.removeChild(tags.firstChild);
			}
			if (visit.tags.length > 0) {
				for (let tag of visit.tags) {
					tags.appendChild(this.generateTag(visit, tag));
				}
			}
			else {
				tags.innerHTML = "<em>No tags</em>";
			}

			const iframe = document.getElementById("detail-resume") as HTMLIFrameElement;
			if (visit.resume) {
				if (visit.resume.path.indexOf(".doc") !== -1) {
					iframe.src = `http://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(window.location.origin + visit.resume.path)}`;
				}
				else {
					iframe.src = visit.resume.path;
				}
			}
			else {
				iframe.hidden = true;
			}
			modal.classList.add("is-active");
		}
	}

	enum Tabs {
		Scanning,
		Search,
		Settings,
	}
	const scanningTab = document.getElementById("scanning-tab") as HTMLElement | null;
	const scanningContent = document.getElementById("scanning") as HTMLElement | null;
	const searchTab = document.getElementById("search-tab") as HTMLElement | null;
	const searchContent = document.getElementById("search") as HTMLElement | null;
	const settingsTab = document.getElementById("settings-tab") as HTMLElement | null;
	const settingsContent = document.getElementById("settings") as HTMLElement | null;
	function setTab(tab: Tabs) {
		if (tab === Tabs.Scanning) {
			scanningTab.classList.add("is-active");
			searchTab.classList.remove("is-active");
			settingsTab.classList.remove("is-active");
			scanningContent.hidden = false;
			searchContent.hidden = true;
			settingsContent.hidden = true;
		}
		else if (tab === Tabs.Search) {
			scanningTab.classList.remove("is-active");
			searchTab.classList.add("is-active");
			settingsTab.classList.remove("is-active");
			scanningContent.hidden = true;
			searchContent.hidden = false;
			settingsContent.hidden = true;
		}
		else if (tab === Tabs.Settings) {
			scanningTab.classList.remove("is-active");
			searchTab.classList.remove("is-active");
			settingsTab.classList.add("is-active");
			scanningContent.hidden = true;
			searchContent.hidden = true;
			settingsContent.hidden = false;
		}
		localStorage.setItem("tab", tab.toString());
	}
	if (scanningTab) {
		scanningTab.addEventListener("click", () => {
			setTab(Tabs.Scanning);
		});
	}
	if (searchTab) {
		searchTab.addEventListener("click", () => {
			setTab(Tabs.Search);
		});
	}
	if (settingsTab) {
		settingsTab.addEventListener("click", () => {
			setTab(Tabs.Settings);
		});
	}
	let previousTab = localStorage.getItem("tab");
	if (previousTab) {
		setTab(parseInt(previousTab, 10));
	}

	function setUpHandlers(classname: string, handler: (dataset: DOMStringMap) => Promise<void>) {
		let buttons = document.getElementsByClassName(classname) as HTMLCollectionOf<HTMLButtonElement>;
		for (let i = 0; i < buttons.length; i++) {
			buttons[i].addEventListener("click", async e => {
				let button = e.target as HTMLButtonElement;
				button.disabled = true;
				try {
					await handler(button.dataset);
				}
				finally {
					button.disabled = false;
				}
			});
		}
	}

	setUpHandlers("confirm-employee", async dataset => {
		if (!confirm(`Are you sure you want to add ${dataset.email} as an employee? They will have full access to your collected resumes and notes.`)) return;

		await sendRequest("PATCH", `/api/company/${encodeURIComponent(dataset.company)}/employee/${encodeURIComponent(dataset.email)}`);
	});
	setUpHandlers("remove-employee", async dataset => {
		if (!confirm(`Are you sure you want to remove ${dataset.email}?`)) return;

		await sendRequest("DELETE", `/api/company/${encodeURIComponent(dataset.company)}/employee/${encodeURIComponent(dataset.email)}`);
	});
	setUpHandlers("set-scanner", async dataset => {
		let scannerID = prompt("Scanner ID:", dataset.scanners);
		if (scannerID === null) return;

		await sendRequest("PATCH", `/api/company/${encodeURIComponent(dataset.company)}/employee/${encodeURIComponent(dataset.email)}/scanners/${encodeURIComponent(scannerID)}`);
	});

	const scanningTable = new TableManager("scanning-table");
	async function updateScanningTable() {
		let options: RequestInit = {
			method: "GET",
			credentials: "include"
		};
		let response: APIResponse = await fetch("/api/visit", options).then(response => response.json());
		if (!response.success) {
			alert(response.error);
			return;
		}
		let visits = response.visits as IVisit[];
		for (let visit of visits) {
			scanningTable.addRow(visit);
		}
	}
	updateScanningTable().catch(err => console.error(err));
}
