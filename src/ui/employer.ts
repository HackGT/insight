namespace Employer {
	// Slight differences (due to JSON representation) between these interfaces and the same ones in schema.ts
	interface IVisit {
		_id: string;
		participant: string;
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
	interface IParticipant {
		_id: string;
		uuid: string;
		name: string;
		email: string;
		school?: string;
		major?: string;
		githubUsername?: string;
		website?: string;
		lookingFor?: {
			timeframe?: string[];
			comments?: string;
		};
		interestingDetails?: {
			favoriteLanguages?: string[];
			fun1?: {
				question: string;
				answer?: string;
			};
			fun2?: {
				question: string;
				answer?: string;
			};
		};
		resume?: {
			path: string;
			size: number;
			extractedText?: string;
		};
		teammates: string[]; // UUIDs of teammates (can be empty)

		flagForUpdate: boolean; // Can be manually set to true to refresh cached data
	}
	interface IParticipantWithPossibleVisit {
		visit?: IVisit;
		participant: IParticipant;
	}
	interface IParticipantWithVisit {
		visit: IVisit;
		participant: IParticipant;
	}

	const modal = document.querySelector(".modal") as HTMLDivElement;
	document.querySelector(".modal-background")!.addEventListener("click", () => modal.classList.remove("is-active"));
	modal.querySelector(".delete")!.addEventListener("click", () => modal.classList.remove("is-active"));
	document.addEventListener("keydown", e => { if (e.key === "Escape") modal.classList.remove("is-active") });

	class TableManager {
		private readonly tbody: HTMLTableSectionElement;
		private readonly template: HTMLTemplateElement;

		constructor(id: string) {
			const table = document.getElementById(id);
			if (!table) {
				throw new Error(`Could not find table with ID: ${id}`);
			}
			this.tbody = table.querySelector("tbody") as HTMLTableSectionElement;
			this.template = document.getElementById("table-row") as HTMLTemplateElement;
		}

		private generateTag(visitData: IParticipantWithVisit, tag: string): HTMLSpanElement {
			let control = document.createElement("div");
			control.classList.add("control");
			let tagContainer = document.createElement("div");
			tagContainer.classList.add("tags", "has-addons");
			let tagSpan = document.createElement("span");
			tagSpan.textContent = tag;
			tagSpan.dataset.tag = tag;
			tagSpan.dataset.id = visitData.visit._id;
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
				await sendRequest("DELETE", `/api/visit/${visitData.visit._id}/tag`, { tag }, false);
				control.remove();
				visitData.visit.tags = visitData.visit.tags.filter(t => t !== tag);
				if (modal!.classList.contains("is-active")) {
					let tagSpan = document.querySelector(`.tags-column .tag[data-tag="${tag}"][data-id="${visitData.visit._id}"]`);
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

		public addRow(visitData: IParticipantWithPossibleVisit) {
			let row = document.importNode(this.template.content, true);

			const nameCell = row.getElementById("name") as HTMLTableCellElement;
			const majorCell = row.getElementById("major") as HTMLTableCellElement;
			const addAction = row.querySelector(".add-action") as HTMLButtonElement;
			const starAction = row.querySelector(".star-action") as HTMLButtonElement;
			const flagAction = row.querySelector(".flag-action") as HTMLButtonElement;
			const tagAction = row.querySelector(".tag-action") as HTMLButtonElement;
			const githubLink = row.querySelector(".github") as HTMLAnchorElement;
			const websiteLink = row.querySelector(".website") as HTMLAnchorElement;

			nameCell.textContent = visitData.participant.name;
			majorCell.textContent = visitData.participant.major || "Unknown";
			if (visitData.participant.githubUsername) {
				let username = visitData.participant.githubUsername.replace(/https:\/\/(www\.)?github.com\/?/ig, "");
				githubLink.href = `https://github.com/${username}`;
			}
			else {
				githubLink.parentElement!.remove();
			}
			if (visitData.participant.website) {
				websiteLink.href = visitData.participant.website;
			}
			else {
				websiteLink.parentElement!.remove();
			}

			if (visitData.visit) {
				addAction.remove();

				const time = new Date(visitData.visit.time);
				const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
				const hours: string = (time.getHours() < 10 ? "0" : "") + time.getHours();
				const minutes: string = (time.getMinutes() < 10 ? "0" : "") + time.getMinutes();
				row.getElementById("time")!.textContent = `${hours}:${minutes} on ${time.getDate()} ${months[time.getMonth()]}`;

				const tags = row.getElementById("tags") as HTMLDivElement;
				// Remove all previous children
				while (tags.firstChild) {
					tags.removeChild(tags.firstChild);
				}
				for (let tag of visitData.visit.tags) {
					tags.appendChild(this.generateTag(visitData as IParticipantWithVisit, tag));
				}

				const tagButton = async (name: string, e: MouseEvent) => {
					if (!visitData.visit) return;
					let button = e.target as HTMLButtonElement;
					button.disabled = true;
					let shouldAdd: boolean = visitData.visit.tags.indexOf(name) === -1;
					await sendRequest(shouldAdd ? "POST" : "DELETE", `/api/visit/${visitData.visit._id}/tag`, { tag: name }, false);

					if (shouldAdd) {
						tags.appendChild(this.generateTag(visitData as IParticipantWithVisit, name));
						visitData.visit.tags.push(name);
					}
					else {
						tags.querySelector(`.tag[data-tag="${name}"]`)!.parentElement!.parentElement!.remove();
						visitData.visit.tags = visitData.visit.tags.filter(t => t !== name);
					}
					button.disabled = false;
				}

				starAction.addEventListener("click", tagButton.bind(this, "starred"));
				flagAction.addEventListener("click", tagButton.bind(this, "flagged"));
				tagAction.addEventListener("click", async () => {
					if (!visitData.visit) return;
					tagAction.disabled = true;

					let tag = (prompt("Tag:") || "").trim().toLowerCase();
					if (!tag || visitData.visit.tags.indexOf(tag) !== -1) {
						tagAction.disabled = false;
						return;
					}

					await sendRequest("POST", `/api/visit/${visitData.visit._id}/tag`, { tag }, false);
					tags.appendChild(this.generateTag(visitData as IParticipantWithVisit, tag));
					visitData.visit.tags.push(tag);
					tagAction.disabled = false;
				});
			}
			else {
				starAction.remove();
				flagAction.remove();
				tagAction.remove();
			}

			const viewAction = row.querySelector(".view-action") as HTMLButtonElement;
			viewAction.addEventListener("click", async () => {
				viewAction.disabled = true;
				await this.showModal(visitData);
				viewAction.disabled = false;
			});

			this.tbody.appendChild(row);
		}

		public empty() {
			while (this.tbody.firstChild) {
				this.tbody.removeChild(this.tbody.firstChild);
			}
		}

		public async showModal(visitData: IParticipantWithPossibleVisit) {
			const participant = visitData.participant;

			const detailName = document.getElementById("detail-name") as HTMLHeadingElement;
			const detailMajor = document.getElementById("detail-major") as HTMLHeadingElement;
			const detailTimeframe = document.getElementById("detail-timeframe") as HTMLSpanElement;
			const detailTimeframeComments = document.getElementById("detail-timeframe-comments") as HTMLSpanElement;
			const detailProgrammingLanguages = document.getElementById("detail-programming-languages") as HTMLSpanElement;
			const detailFun1Question = document.getElementById("detail-fun-1") as HTMLSpanElement;
			const detailFun1Answer = document.getElementById("detail-fun-1-answer") as HTMLSpanElement;
			const detailFun2Question = document.getElementById("detail-fun-2") as HTMLSpanElement;
			const detailFun2Answer = document.getElementById("detail-fun-2-answer") as HTMLSpanElement;
			const detailTags = document.getElementById("detail-tags") as HTMLDivElement;
			const detailScanner = document.getElementById("detail-scanner") as HTMLSpanElement;
			const detailNotes = document.getElementById("detail-notes") as HTMLUListElement;
			const detailResume = document.getElementById("detail-resume") as HTMLIFrameElement;

			detailName.textContent = participant.name;
			detailMajor.textContent = participant.major || "Unknown Major";
			if (participant.lookingFor && participant.lookingFor.timeframe && participant.lookingFor.timeframe.length > 0) {
				detailTimeframe.textContent = participant.lookingFor.timeframe.join(", ");
			}
			else {
				detailTimeframe.innerHTML = "<em>N/A</em>";
			}
			if (participant.lookingFor && participant.lookingFor.comments) {
				detailTimeframeComments.textContent = participant.lookingFor.comments;
			}
			else {
				detailTimeframeComments.innerHTML = "<em>N/A</em>";
			}
			const details = participant.interestingDetails;
			if (details) {
				if (details.favoriteLanguages && details.favoriteLanguages.length > 0) {
					detailProgrammingLanguages.textContent = details.favoriteLanguages.join(", ");
				}
				else {
					detailProgrammingLanguages.innerHTML = "<em>N/A</em>";
				}
				if (details.fun1) {
					detailFun1Question.textContent = details.fun1.question;
					if (details.fun1.answer) {
						detailFun1Answer.textContent = details.fun1.answer;
					}
					else {
						detailFun1Answer.innerHTML = "<em>N/A</em>";
					}
				}
				else {
					detailFun1Question.textContent = "";
					detailFun1Answer.textContent = "";
				}
				if (details.fun2) {
					detailFun2Question.textContent = details.fun2.question;
					if (details.fun2.answer) {
						detailFun2Answer.textContent = details.fun2.answer;
					}
					else {
						detailFun2Answer.innerHTML = "<em>N/A</em>";
					}
				}
				else {
					detailFun2Question.textContent = "";
					detailFun2Answer.textContent = "";
				}
			}

			while (detailTags.firstChild) {
				detailTags.removeChild(detailTags.firstChild);
			}
			if (visitData.visit) {
				if (visitData.visit.tags.length > 0) {
					for (let tag of visitData.visit.tags) {
						detailTags.appendChild(this.generateTag(visitData as IParticipantWithVisit, tag));
					}
				}
				else {
					detailTags.innerHTML = "<em>No tags</em>";
				}
				detailScanner.textContent = `${visitData.visit.scannerID} → ${visitData.visit.employees.map(e => e.name).join(", ")}`;
				while (detailNotes.firstChild) {
					detailNotes.removeChild(detailNotes.firstChild);
				}
				for (let note of visitData.visit.notes) {
					let noteElement = document.createElement("li");
					noteElement.textContent = note;
					detailNotes.appendChild(noteElement);
				}
				if (visitData.visit.notes.length === 0) {
					let noteElement = document.createElement("li");
					noteElement.innerHTML = "<em>No notes yet</em>";
					detailNotes.appendChild(noteElement);
				}
			}

			if (participant.resume) {
				if (participant.resume.path.toLowerCase().indexOf(".doc") !== -1) {
					detailResume.src = `http://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(window.location.origin + participant.resume.path)}`;
				}
				else {
					detailResume.src = participant.resume.path;
				}
			}
			else {
				detailResume.hidden = true;
			}
			modal!.classList.add("is-active");
		}
	}

	const scanningTable = new TableManager("scanning-table");
	async function updateScanningTable() {
		scanningTable.empty();
		let options: RequestInit = {
			method: "GET",
			credentials: "include"
		};
		let response: APIResponse = await fetch("/api/visit", options).then(response => response.json());
		if (!response.success) {
			alert(response.error);
			return;
		}
		let visits = response.visits as IParticipantWithVisit[];
		for (let visit of visits) {
			scanningTable.addRow(visit);
		}
	}

	const searchTable = new TableManager("search-table");
	const searchControl = document.getElementById("search-control") as HTMLDivElement;
	const searchBox = document.getElementById("search-box") as HTMLInputElement;

	const debounceTimeout = 500; // Milliseconds to wait before content is rendered to avoid hitting the server for every keystroke
	function debounce(func: (...args: unknown[]) => void): (...args: unknown[]) => void {
		let timer: number | null = null;
		return () => {
			searchControl.classList.add("is-loading");
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(func, debounceTimeout) as unknown as number;
		};
	}
	async function updateSearchTable() {
		searchTable.empty();
		let query = searchBox.value;
		let options: RequestInit = {
			method: "GET",
			credentials: "include"
		};
		let response: APIResponse = await fetch(`/api/search?q=${query}`, options).then(response => response.json());
		if (!response.success) {
			alert(response.error);
			return;
		}
		let results = response.results as IParticipantWithPossibleVisit[];
		for (let result of results) {
			searchTable.addRow(result);
		}
		searchControl.classList.remove("is-loading");
	}
	searchBox.addEventListener("keydown", debounce(updateSearchTable));

	enum Tabs {
		Scanning,
		Search,
		Settings,
	}
	const scanningTab = document.getElementById("scanning-tab") as HTMLElement;
	const scanningContent = document.getElementById("scanning") as HTMLElement;
	const searchTab = document.getElementById("search-tab") as HTMLElement;
	const searchContent = document.getElementById("search") as HTMLElement;
	const settingsTab = document.getElementById("settings-tab") as HTMLElement;
	const settingsContent = document.getElementById("settings") as HTMLElement;
	async function setTab(tab: Tabs) {
		if (tab === Tabs.Scanning) {
			scanningTab.classList.add("is-active");
			searchTab.classList.remove("is-active");
			settingsTab.classList.remove("is-active");
			scanningContent.hidden = false;
			searchContent.hidden = true;
			settingsContent.hidden = true;

			await updateScanningTable();
		}
		else if (tab === Tabs.Search) {
			scanningTab.classList.remove("is-active");
			searchTab.classList.add("is-active");
			settingsTab.classList.remove("is-active");
			scanningContent.hidden = true;
			searchContent.hidden = false;
			settingsContent.hidden = true;

			await updateSearchTable();
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
	scanningTab.addEventListener("click", async () => {
		await setTab(Tabs.Scanning);
	});
	searchTab.addEventListener("click", async () => {
		await setTab(Tabs.Search);
	});
	settingsTab.addEventListener("click", async () => {
		await setTab(Tabs.Settings);
	});
	let previousTab = localStorage.getItem("tab");
	if (previousTab) {
		setTab(parseInt(previousTab, 10));
	}

	setUpHandlers("confirm-employee", async dataset => {
		if (!confirm(`Are you sure you want to add ${dataset.email} as an employee? They will have full access to your collected resumes and notes.`)) return;

		await sendRequest("PATCH", `/api/company/${encodeURIComponent(dataset.company || "")}/employee/${encodeURIComponent(dataset.email || "")}`);
	});
	setUpHandlers("remove-employee", async dataset => {
		if (!confirm(`Are you sure you want to remove ${dataset.email}?`)) return;

		await sendRequest("DELETE", `/api/company/${encodeURIComponent(dataset.company || "")}/employee/${encodeURIComponent(dataset.email || "")}`);
	});
	setUpHandlers("set-scanner", async dataset => {
		let scannerID = prompt("Scanner ID:", dataset.scanners);
		if (scannerID === null) return;

		await sendRequest("PATCH", `/api/company/${encodeURIComponent(dataset.company || "")}/employee/${encodeURIComponent(dataset.email || "")}/scanners/${encodeURIComponent(scannerID)}`);
	});
}
