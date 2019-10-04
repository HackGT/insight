namespace Employer {
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

	async function sendRequest(method: "POST" | "DELETE" | "PUT" | "PATCH", url: string, data?: object) {
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
		else {
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
	document.querySelector(".modal-close").addEventListener("click", () => modal.classList.remove("is-active"));
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

		public addRow(id: string, name: string, major?: string, githubUsername?: string, website?: string) {
			let row = document.importNode(this.template.content, true);
			row.getElementById("name").textContent = name;
			row.getElementById("major").textContent = major || "Unknown";
			const githubLink = row.querySelector(".github") as HTMLAnchorElement;
			if (githubUsername) {
				githubLink.href = `https://github.com/${githubUsername}`;
			}
			else {
				githubLink.parentElement!.remove();
			}
			const websiteLink = row.querySelector(".website") as HTMLAnchorElement;
			if (website) {
				websiteLink.href = website;
			}
			else {
				websiteLink.parentElement!.remove();
			}
			const starAction = row.querySelector(".star-action") as HTMLButtonElement;
			const tagAction = row.querySelector(".tag-action") as HTMLButtonElement;
			const viewAction = row.querySelector(".view-action") as HTMLButtonElement;
			viewAction.addEventListener("click", async () => {
				viewAction.disabled = true;
				await this.showModal(id);
				viewAction.disabled = false;
			});

			this.tbody.appendChild(row);
		}

		public async showModal(id: string) {
			let options: RequestInit = {
				method: "GET",
				credentials: "include"
			};
			let response: APIResponse = await fetch(`/api/scan/${id}`, options).then(response => response.json());
			if (!response.success) {
				alert(response.error);
				return;
			}
			console.log(response.visit);
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
		let response: APIResponse = await fetch("/api/scan", options).then(response => response.json());
		if (!response.success) {
			alert(response.error);
			return;
		}
		let visits = response.visits as any[];
		for (let visit of visits) {
			scanningTable.addRow(visit._id, visit.name, visit.major, visit.githubUsername, visit.website);
		}
	}
	updateScanningTable().catch(err => console.error(err));
}
