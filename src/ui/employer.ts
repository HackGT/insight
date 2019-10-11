declare const io: typeof import("socket.io");

namespace Employer {
	// Slight differences (due to JSON representation) between these interfaces and the same ones in schema.ts
	interface IVisit {
		_id: string;
		participant: string;
		company: string;
		tags: string[];
		notes: string[];
		time: string;
		scannerID: string | null;
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

	function emptyContainer(element: HTMLElement) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	}

	function generateTag(visitData: IParticipantWithVisit, tag: string): HTMLSpanElement {
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
			if (detailModalManager.isOpen) {
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

	function tagButtonHandler(visitData: IParticipantWithVisit, tagArea: HTMLDivElement, tag?: string): () => Promise<void> {
		return async () => {
			if (!visitData.visit) return;

			if (!tag) {
				tag = (prompt("Tag:") || "").trim().toLowerCase();
				if (!tag || visitData.visit.tags.indexOf(tag) !== -1) return;
			}

			let shouldAdd: boolean = visitData.visit.tags.indexOf(tag) === -1;
			await sendRequest(shouldAdd ? "POST" : "DELETE", `/api/visit/${visitData.visit._id}/tag`, { tag }, false);

			if (shouldAdd) {
				// Gets rid of <em>No tags</em>
				tagArea.querySelector("em")?.remove();
				tagArea.appendChild(generateTag(visitData as IParticipantWithVisit, tag));
				visitData.visit.tags.push(tag);
			}
			else {
				tagArea.querySelector(`.tag[data-tag="${tag}"]`)!.parentElement!.parentElement!.remove();
				visitData.visit.tags = visitData.visit.tags.filter(t => t !== tag);
			}
		}
	}

	class DetailModalManager {
		private readonly modal = document.querySelector(".modal") as HTMLDivElement;
		private openDetail: IParticipantWithPossibleVisit | null = null;

		private readonly name = document.getElementById("detail-name") as HTMLHeadingElement;
		private readonly major = document.getElementById("detail-major") as HTMLHeadingElement;
		private readonly timeframe = document.getElementById("detail-timeframe") as HTMLSpanElement;
		private readonly timeframeComments = document.getElementById("detail-timeframe-comments") as HTMLSpanElement;
		private readonly programmingLanguages = document.getElementById("detail-programming-languages") as HTMLSpanElement;
		private readonly fun1Question = document.getElementById("detail-fun-1") as HTMLSpanElement;
		private readonly fun1Answer = document.getElementById("detail-fun-1-answer") as HTMLSpanElement;
		private readonly fun2Question = document.getElementById("detail-fun-2") as HTMLSpanElement;
		private readonly fun2Answer = document.getElementById("detail-fun-2-answer") as HTMLSpanElement;
		private readonly tags = document.getElementById("detail-tags") as HTMLDivElement;
		private readonly scanner = document.getElementById("detail-scanner") as HTMLSpanElement;
		private readonly notes = document.getElementById("detail-notes") as HTMLUListElement;
		private readonly resume = document.getElementById("detail-resume") as HTMLIFrameElement;
		private readonly delete = document.getElementById("detail-delete") as HTMLButtonElement;
		private readonly addVisit = document.getElementById("detail-add-visit") as HTMLButtonElement;
		private readonly addTag = document.getElementById("detail-add-tag") as HTMLButtonElement;
		private readonly star = document.getElementById("detail-star") as HTMLButtonElement;
		private readonly flag = document.getElementById("detail-flag") as HTMLButtonElement;
		private readonly addNote = document.getElementById("detail-add-note") as HTMLButtonElement;

		constructor() {
			document.querySelector(".modal-background")!.addEventListener("click", () => this.close());
			this.modal.querySelector(".delete")!.addEventListener("click", () => this.close());
			document.getElementById("detail-close")!.addEventListener("click", () => this.close());
			document.addEventListener("keydown", e => { if (e.key === "Escape") this.close() });

			async function updateTables() {
				return Promise.all([
					updateSearchTable(),
					updateScanningTable(),
				]);
			}

			this.delete.addEventListener("click", asyncHandler(async () => {
				if (!this.openDetail?.visit) return;
				if (!confirm("Are you sure that you want to delete this visit? All associated data such as tags and notes will be lost!")) return;
				await sendRequest("DELETE", `/api/visit/${this.openDetail.visit._id}`, undefined, false);
				await updateTables();
				this.close();
			}));
			this.addVisit.addEventListener("click", asyncHandler(async () => {
				if (!this.openDetail) return;

				await sendRequest("POST", "/api/visit", { uuid: this.openDetail.participant.uuid }, false);
				await this.getAndRedraw();
				await updateTables();
			}));
			this.addTag.addEventListener("click", asyncHandler(async () => {
				if (!this.openDetail?.visit) return;
				await tagButtonHandler(this.openDetail as IParticipantWithVisit, this.tags)();
				await updateTables();
			}));
			this.star.addEventListener("click", asyncHandler(async () => {
				if (!this.openDetail?.visit) return;
				await tagButtonHandler(this.openDetail as IParticipantWithVisit, this.tags, "starred")();
				await updateTables();
			}));
			this.flag.addEventListener("click", asyncHandler(async () => {
				if (!this.openDetail?.visit) return;
				await tagButtonHandler(this.openDetail as IParticipantWithVisit, this.tags, "flagged")();
				await updateTables();
			}));
			this.addNote.addEventListener("click", asyncHandler(async () => {
				if (!this.openDetail?.visit) return;

				const note = (prompt("New note:") || "").trim();
				if (!note) return;

				await sendRequest("POST", `/api/visit/${this.openDetail.visit._id}/note`, { note }, false);
				await this.getAndRedraw();
			}));
		}

		public get isOpen(): boolean {
			return this.modal.classList.contains("is-active");
		}

		private async getAndRedraw() {
			if (!this.openDetail) return;

			let options: RequestInit = {
				method: "GET",
				credentials: "include"
			};
			let response: APIResponse = await fetch(`/api/visit/${this.openDetail.participant.uuid}`, options).then(response => response.json());
			if (!response.success) {
				alert(response.error);
				return;
			}
			let newDetails = {
				visit: response.visit,
				participant: response.participant
			} as IParticipantWithVisit;
			this.open(newDetails, false);
		}

		public open(visitData: IParticipantWithPossibleVisit, loadResume = true) {
			this.openDetail = visitData;
			const participant = visitData.participant;

			this.name.textContent = participant.name;
			this.major.textContent = participant.major ?? "Unknown Major";
			if (participant.lookingFor?.timeframe?.length) {
				this.timeframe.textContent = participant.lookingFor.timeframe.join(", ");
			}
			else {
				this.timeframe.innerHTML = "<em>N/A</em>";
			}
			if (participant.lookingFor?.comments) {
				this.timeframeComments.textContent = participant.lookingFor.comments;
			}
			else {
				this.timeframeComments.innerHTML = "<em>N/A</em>";
			}
			const details = participant.interestingDetails;
			if (details) {
				if (details.favoriteLanguages?.length) {
					this.programmingLanguages.textContent = details.favoriteLanguages.join(", ");
				}
				else {
					this.programmingLanguages.innerHTML = "<em>N/A</em>";
				}
				if (details.fun1) {
					this.fun1Question.textContent = details.fun1.question;
					if (details.fun1.answer) {
						this.fun1Answer.textContent = details.fun1.answer;
					}
					else {
						this.fun1Answer.innerHTML = "<em>N/A</em>";
					}
				}
				else {
					this.fun1Question.textContent = "";
					this.fun1Answer.textContent = "";
				}
				if (details.fun2) {
					this.fun2Question.textContent = details.fun2.question;
					if (details.fun2.answer) {
						this.fun2Answer.textContent = details.fun2.answer;
					}
					else {
						this.fun2Answer.innerHTML = "<em>N/A</em>";
					}
				}
				else {
					this.fun2Question.textContent = "";
					this.fun2Answer.textContent = "";
				}
			}

			emptyContainer(this.tags);
			emptyContainer(this.notes);
			if (visitData.visit) {
				this.delete.hidden = false;
				this.addVisit.hidden = true;
				this.addTag.hidden = false;
				this.star.hidden = false;
				this.flag.hidden = false;
				this.addNote.hidden = false;
				if (visitData.visit.tags.length > 0) {
					for (let tag of visitData.visit.tags) {
						this.tags.appendChild(generateTag(visitData as IParticipantWithVisit, tag));
					}
				}
				else {
					this.tags.innerHTML = "<em>No tags</em>";
				}
				this.scanner.textContent = `${visitData.visit.scannerID ?? "Direct add"} → ${visitData.visit.employees.map(e => e.name).join(", ")}`;
				for (let note of visitData.visit.notes) {
					let noteElement = document.createElement("li");
					noteElement.textContent = note;

					let noteActionsTemplate = document.getElementById("note-actions") as HTMLTemplateElement;
					let noteActions = document.importNode(noteActionsTemplate.content, true);
					(noteActions.querySelector(".detail-note-delete") as HTMLButtonElement).addEventListener("click", asyncHandler(async () => {
						if (!this.openDetail?.visit) return;
						if (!confirm("Are you sure that you want to delete this note?")) return;
						await sendRequest("DELETE", `/api/visit/${this.openDetail.visit._id}/note`, { note }, false);
						await this.getAndRedraw();
					}));
					noteElement.appendChild(noteActions);
					this.notes.appendChild(noteElement);
				}
				if (visitData.visit.notes.length === 0) {
					let noteElement = document.createElement("li");
					noteElement.classList.add("no-prefix");
					noteElement.innerHTML = "<em>No notes yet</em>";
					this.notes.appendChild(noteElement);
				}
			}
			else {
				this.delete.hidden = true;
				this.addVisit.hidden = false;
				this.addTag.hidden = true;
				this.star.hidden = true;
				this.flag.hidden = true;
				this.addNote.hidden = true;
				this.scanner.innerHTML = "<em>Not scanned</em>";
			}

			if (loadResume) {
				this.resume.hidden = true;
				if (participant.resume) {
					if (participant.resume.path.toLowerCase().indexOf(".doc") !== -1) {
						// Word documents require a public link so that Microsoft can access the document
						let options: RequestInit = {
							method: "GET",
							credentials: "include"
						};
						fetch(`/${this.openDetail.participant.resume?.path}?public=true`, options)
							.then(response => response.json() as Promise<APIResponse>)
							.then(response => {
								if (!participant.resume) return;
								if (!response.success) {
									alert(response.error);
									return;
								}
								this.resume.src = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(window.location.origin + "/uploads/" + response.link)}`;
								this.resume.hidden = false;
							});
					}
					else {
						// PDFs and images don't require a public link
						this.resume.src = participant.resume.path;
						this.resume.hidden = false;
					}
				}
			}
			this.modal.classList.add("is-active");
		}

		public close() {
			this.openDetail = null;
			this.modal.classList.remove("is-active");
		}
	}

	const detailModalManager = new DetailModalManager();

	class TableManager {
		private readonly tbody: HTMLTableSectionElement;
		private readonly template: HTMLTemplateElement;
		private rows: Map<string, HTMLTableRowElement> = new Map();

		constructor(id: string) {
			const table = document.getElementById(id);
			if (!table) {
				throw new Error(`Could not find table with ID: ${id}`);
			}
			this.tbody = table.querySelector("tbody") as HTMLTableSectionElement;
			this.template = document.getElementById("table-row") as HTMLTemplateElement;
		}

		public addRow(visitData: IParticipantWithPossibleVisit, insertAtTop = false) {
			let rowTemplate = document.importNode(this.template.content, true);

			const timeCell = rowTemplate.getElementById("time") as HTMLTableCellElement;
			const nameCell = rowTemplate.getElementById("name") as HTMLTableCellElement;
			const majorCell = rowTemplate.getElementById("major") as HTMLTableCellElement;
			const addAction = rowTemplate.querySelector(".add-action") as HTMLButtonElement;
			const starAction = rowTemplate.querySelector(".star-action") as HTMLButtonElement;
			const flagAction = rowTemplate.querySelector(".flag-action") as HTMLButtonElement;
			const tagAction = rowTemplate.querySelector(".tag-action") as HTMLButtonElement;
			const githubLink = rowTemplate.querySelector(".github") as HTMLAnchorElement;
			const websiteLink = rowTemplate.querySelector(".website") as HTMLAnchorElement;

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
				const visitDataWithVisit = visitData as IParticipantWithVisit;
				addAction.remove();

				const time = new Date(visitData.visit.time);
				const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
				const hours: string = (time.getHours() < 10 ? "0" : "") + time.getHours();
				const minutes: string = (time.getMinutes() < 10 ? "0" : "") + time.getMinutes();
				timeCell.textContent = `${hours}:${minutes} on ${time.getDate()} ${months[time.getMonth()]}`;

				const tags = rowTemplate.getElementById("tags") as HTMLDivElement;
				// Remove all previous children
				emptyContainer(tags);
				for (let tag of visitData.visit.tags) {
					tags.appendChild(generateTag(visitDataWithVisit, tag));
				}

				starAction.addEventListener("click", asyncHandler(tagButtonHandler(visitDataWithVisit, tags, "starred")));
				flagAction.addEventListener("click", asyncHandler(tagButtonHandler(visitDataWithVisit, tags, "flagged")));
				tagAction.addEventListener("click", asyncHandler(tagButtonHandler(visitDataWithVisit, tags)));
			}
			else {
				timeCell.textContent = "-"
				starAction.remove();
				flagAction.remove();
				tagAction.remove();

				addAction.addEventListener("click", asyncHandler(async () => {
					await sendRequest("POST", "/api/visit", { uuid: visitData.participant.uuid }, false);
					await Promise.all([
						updateSearchTable(),
						updateScanningTable()
					]);
				}));
			}

			const viewAction = rowTemplate.querySelector(".view-action") as HTMLButtonElement;
			viewAction.addEventListener("click", () => {
				detailModalManager.open(visitData);
			});

			const selectCell = rowTemplate.getElementById("select") as HTMLTableCellElement;
			const checkbox = selectCell.querySelector("input") as HTMLInputElement;
			checkbox.dataset.id = visitData.participant.uuid;

			selectCell.addEventListener("click", e => {
				if (e.target === checkbox) return;
				checkbox.checked = !checkbox.checked;
			});

			let row = rowTemplate.querySelector("tr")!;
			row.dataset.id = visitData.participant.uuid;
			let existingRow = this.rows.get(visitData.participant.uuid);
			if (existingRow) {
				this.tbody.replaceChild(row, existingRow);
			}
			else if (insertAtTop) {
				this.tbody.insertBefore(row, this.tbody.firstChild);
				if (this.rows.size >= 20) {
					let removed = this.tbody.removeChild(this.tbody.lastChild!) as HTMLElement;
					if (removed.dataset.id) {
						this.rows.delete(removed.dataset.id);
					}
				}
			}
			else {
				this.tbody.appendChild(row);
			}
			this.rows.set(visitData.participant.uuid, row);
		}

		public empty() {
			emptyContainer(this.tbody);
			this.rows = new Map();
		}
	}

	interface IPagingResponse {
		page: number;
		pageSize: number;
		total: number;
	}
	class PaginationController {
		private readonly nav: HTMLDivElement;
		private readonly previousButton: HTMLAnchorElement;
		private readonly nextButton: HTMLAnchorElement;
		private readonly firstPage: HTMLAnchorElement;
		private readonly firstPageGroup: NodeListOf<HTMLUListElement>;
		private readonly previousPage: HTMLAnchorElement;
		private readonly currentPage: HTMLAnchorElement;
		private readonly nextPage: HTMLAnchorElement;
		private readonly lastPageGroup: NodeListOf<HTMLUListElement>;
		private readonly lastPage: HTMLAnchorElement;
		// Pages are 0 indexed internally
		// Pages are displayed as 1 indexed
		private pageSize: number = 0;
		private page: number = 0;
		private maxPage: number = 0;
		private totalItems: number = 0;

		constructor(container: string, onUpdate: (page?: number) => Promise<void>) {
			this.nav = document.querySelector(`#${container} > nav.pagination`) as HTMLDivElement;
			this.previousButton = this.nav.querySelector(".pagination-previous") as HTMLAnchorElement;
			this.nextButton = this.nav.querySelector(".pagination-next") as HTMLAnchorElement;
			this.firstPage = this.nav.querySelector(".first-page > a") as HTMLAnchorElement;
			this.firstPageGroup = this.nav.querySelectorAll(".first-page");
			this.previousPage = this.nav.querySelector(".previous-page") as HTMLAnchorElement;
			this.currentPage = this.nav.querySelector(".is-current") as HTMLAnchorElement;
			this.nextPage = this.nav.querySelector(".next-page") as HTMLAnchorElement;
			this.lastPageGroup = this.nav.querySelectorAll(".last-page");
			this.lastPage = this.nav.querySelector(".last-page > a") as HTMLAnchorElement;

			const pageHandler = async (e: MouseEvent) => {
				let link = e.currentTarget as HTMLAnchorElement;
				try {
					link.setAttribute("disabled", "disabled");
					let page = 0;
					if (link.textContent === "Previous") {
						page = this.previousPageNumber;
					}
					else if (link.textContent === "Next page") {
						page = this.nextPageNumber;
					}
					else {
						page = parseInt(link.textContent ?? "") - 1;
					}
					await onUpdate(page)
				}
				finally {
					if (link.textContent === "Previous" && this.page === 0) {
						link.setAttribute("disabled", "disabled");
					}
					else if (link.textContent === "Next page" && this.page === this.maxPage) {
						link.setAttribute("disabled", "disabled");
					}
					else {
						link.removeAttribute("disabled");
					}
				}
			};
			this.nextButton.addEventListener("click", pageHandler);
			this.previousButton.addEventListener("click", pageHandler);
			this.firstPage.addEventListener("click", pageHandler);
			this.previousPage.addEventListener("click", pageHandler);
			this.currentPage.addEventListener("click", pageHandler);
			this.nextPage.addEventListener("click", pageHandler);
			this.lastPage.addEventListener("click", pageHandler);
		}

		public get nextPageNumber(): number {
			let nextPage = this.page + 1;
			if (nextPage > this.maxPage) {
				nextPage = this.maxPage;
			}
			return nextPage;
		}
		public get previousPageNumber(): number {
			let previousPage = this.page - 1;
			if (previousPage < 0) {
				previousPage = 0;
			}
			return previousPage;
		}

		update(response: IPagingResponse) {
			this.pageSize = response.pageSize;
			this.page = response.page;
			this.totalItems = response.total;
			this.maxPage = Math.floor(this.totalItems / this.pageSize);

			if (this.page === 0) {
				this.previousButton.setAttribute("disabled", "disabled")
			}
			else {
				this.previousButton.removeAttribute("disabled");
			}
			if (this.page === this.maxPage) {
				this.nextButton.setAttribute("disabled", "disabled")
			}
			else {
				this.nextButton.removeAttribute("disabled");
			}

			if (this.page >= 2) {
				this.firstPage.textContent = "1";
				for (let i = 0; i < this.firstPageGroup.length; i++) {
					this.firstPageGroup[i].hidden = false;
				}
			}
			else {
				for (let i = 0; i < this.firstPageGroup.length; i++) {
					this.firstPageGroup[i].hidden = true;
				}
			}
			if (this.page >= 1) {
				this.previousPage.textContent = this.page.toString();
				this.previousPage.hidden = false;
			}
			else {
				this.previousPage.hidden = true;
			}
			this.currentPage.textContent = (this.page + 1).toString();
			if (this.page < this.maxPage) {
				this.nextPage.textContent = (this.page + 2).toString();
				this.nextPage.hidden = false;
			}
			else {
				this.nextPage.hidden = true;
			}
			if (this.page < this.maxPage - 1) {
				this.lastPage.textContent = (this.maxPage + 1).toString();
				for (let i = 0; i < this.lastPageGroup.length; i++) {
					this.lastPageGroup[i].hidden = false;
				}
			}
			else {
				for (let i = 0; i < this.lastPageGroup.length; i++) {
					this.lastPageGroup[i].hidden = true;
				}
			}
		}
	}

	const scanningTable = new TableManager("scanning-table");
	const scanningPagination = new PaginationController("scanning", updateScanningTable);
	async function updateScanningTable(page: number = 0) {
		scanningTable.empty();
		let options: RequestInit = {
			method: "GET",
			credentials: "include"
		};
		let response: APIResponse & IPagingResponse = await fetch(`/api/visit?page=${page}`, options).then(response => response.json());
		if (!response.success) {
			alert(response.error);
			return;
		}
		scanningPagination.update(response);
		let visits = response.visits as (IVisit & { participantData: IParticipant })[];
		for (let visit of visits) {
			scanningTable.addRow({
				participant: visit.participantData,
				visit
			});
		}
	}

	const searchTable = new TableManager("search-table");
	const searchPagination = new PaginationController("search", updateSearchTable);
	const searchControl = document.getElementById("search-control") as HTMLDivElement;
	const searchBox = document.getElementById("search-box") as HTMLInputElement;

	const debounceTimeout = 500; // Milliseconds to wait before content is rendered to avoid hitting the server for every keystroke
	function debounce(func: (...args: any[]) => void): (...args: any[]) => void {
		let timer: number | null = null;
		return () => {
			searchControl.classList.add("is-loading");
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(func, debounceTimeout) as unknown as number;
		};
	}
	async function updateSearchTable(page: number = 0) {
		searchTable.empty();
		let query = searchBox.value;
		let options: RequestInit = {
			method: "GET",
			credentials: "include"
		};
		let response: APIResponse & IPagingResponse = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`, options).then(response => response.json());
		if (!response.success) {
			alert(response.error);
			return;
		}
		searchPagination.update(response);
		let participants = response.participants as (IParticipant & { visitData?: IVisit })[];
		for (let participant of participants) {
			searchTable.addRow({
				participant,
				visit: participant.visitData
			});
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

	let isDownloadRunning = false;
	const downloadDropdowns = document.querySelectorAll(".dropdown-trigger > .button") as NodeListOf<HTMLButtonElement>;
	function getProgressBar(): HTMLProgressElement {
		let prefix = "";
		if (scanningContent.hidden === false) {
			prefix = "#scanning";
		}
		else if (searchContent.hidden === false) {
			prefix = "#search";
		}
		return document.querySelector(`${prefix} > progress`) as HTMLProgressElement;
	}
	function downloadHandler(buttons: NodeListOf<Element>, handler: () => Promise<void>) {
		for (let i = 0; i < buttons.length; i++) {
			buttons[i].addEventListener("click", async () => {
				if (isDownloadRunning) return;
				for (let j = 0; j < downloadDropdowns.length; j++) {
					downloadDropdowns[j].classList.remove("is-hoverable");
					downloadDropdowns[j].classList.add("is-loading");
				}
				isDownloadRunning = true;
				try {
					await handler();
				}
				finally {
					for (let j = 0; j < downloadDropdowns.length; j++) {
						downloadDropdowns[j].classList.add("is-hoverable");
						downloadDropdowns[j].classList.remove("is-loading");
					}
					isDownloadRunning = false;
				}
			});
		}
	}

	let downloadSelected = document.querySelectorAll(".download-selected");
	downloadHandler(downloadSelected, async () => {
		let prefix = "";
		if (scanningContent.hidden === false) {
			prefix = "#scanning";
		}
		else if (searchContent.hidden === false) {
			prefix = "#search";
		}
		let checkboxes = document.querySelectorAll(`${prefix} input.participant-selection`) as NodeListOf<HTMLInputElement>;
		let selectedUUIDs: string[] = [];
		for (let j = 0; j < checkboxes.length; j++) {
			if (checkboxes[j].checked && checkboxes[j].dataset.id) {
				selectedUUIDs.push(checkboxes[j].dataset.id!);
				checkboxes[j].checked = false;
			}
		}
		if (selectedUUIDs.length > 0) {
			getProgressBar().hidden = false;
			await sendRequest("POST", "/api/export", { type: "selected", ids: JSON.stringify(selectedUUIDs) }, false);
		}
		else {
			alert("Please choose at least one participant to export");
		}
	});

	let downloadVisited = document.querySelectorAll(".download-scanned");
	downloadHandler(downloadVisited, async () => {
		getProgressBar().hidden = false;
		await sendRequest("POST", "/api/export", { type: "visited" }, false);
	});

	let downloadAll = document.querySelectorAll(".download-all");
	downloadHandler(downloadAll, async () => {
		if (!confirm("Are you sure that you want to export all participants? This export will take a while to complete.")) return;
		getProgressBar().hidden = false;
		await sendRequest("POST", "/api/export", { type: "all" }, false);
	});

	const toast = document.querySelector(".message.toast") as HTMLDivElement;
	toast.querySelector(".delete")?.addEventListener("click", () => toast.classList.remove("is-active"));

	class WebSocketManager {
		public static async connect() {
			const socket = io({
				query: await WebSocketManager.authorize()
			});
			socket.on("reconnection_attempt", async () => {
				(socket as any).io.opts.query = await WebSocketManager.authorize();
			});
			return new WebSocketManager(socket);
		}
		public static async authorize(): Promise<GenericObject> {
			let options: RequestInit = {
				method: "GET",
				credentials: "include"
			};
			let response: APIResponse = await fetch("/api/authorize", options).then(response => response.json());

			return {
				uuid: response.uuid as string,
				time: response.time as number,
				token: response.token as string
			}
		}

		private toastCloseTimeout: number | null = null;
		private visit: IParticipantWithVisit | null = null;

		constructor(private readonly socket: SocketIO.Server) {
			this.socket.on("export-progress", (progress: { percentage: number }) => {
				let progressBar = getProgressBar();
				progressBar.value = progress.percentage;
			});
			this.socket.on("export-complete", (progress: { id: string }) => {
				let progressBar = getProgressBar();
				progressBar.removeAttribute("value");
				progressBar.hidden = true;
				window.location.assign(`/api/export?id=${progress.id}`);
			});

			toast.querySelector(".view")!.addEventListener("click", () => {
				if (this.visit) {
					detailModalManager.open(this.visit);
				}
				toast.classList.remove("is-active");
			});
			this.socket.on("visit", (visit: IParticipantWithVisit) => {
				this.visit = visit;
				scanningTable.addRow(visit, true);

				toast.querySelector(".name")!.textContent = visit.participant.name;
				toast.querySelector(".scanner")!.textContent = visit.visit.scannerID;

				toast.classList.add("is-active");
				if (this.toastCloseTimeout) {
					clearTimeout(this.toastCloseTimeout);
				}
				this.toastCloseTimeout = setTimeout(() => {
					toast.classList.remove("is-active");
				}, 5000) as unknown as number;
			});
		}
	}
	WebSocketManager.connect();
}
