namespace Employer {
	function serializeQueryString(data: object): string {
		return Object.keys(data).map(key => {
			return encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
		}).join("&");
	}

	interface APIResponse {
		success?: boolean;
		error?: string;
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
}
