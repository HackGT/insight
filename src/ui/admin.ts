namespace Admin {
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

	setUpHandlers("add-employee", async dataset => {
		let email = prompt("Email of employee:");
		if (!email) return;

		email = email.trim().toLowerCase();
		await sendRequest("POST", `/api/company/${encodeURIComponent(dataset.company)}/employee/${encodeURIComponent(email)}`);
	});
	setUpHandlers("confirm-employee", async dataset => {
		await sendRequest("PATCH", `/api/company/${encodeURIComponent(dataset.company)}/employee/${encodeURIComponent(dataset.email)}`);
	});
	setUpHandlers("remove-employee", async dataset => {
		if (!confirm(`Are you sure you want to remove ${dataset.email} from ${dataset.company}?`)) return;

		await sendRequest("DELETE", `/api/company/${encodeURIComponent(dataset.company)}/employee/${encodeURIComponent(dataset.email)}`);
	});
	setUpHandlers("rename-company", async dataset => {
		let name = prompt("New name:", dataset.company);
		if (!name) return;

		await sendRequest("PATCH", `/api/company/${encodeURIComponent(dataset.company)}`, { name: name.trim() });
	});
	setUpHandlers("delete-company", async dataset => {
		if (!confirm(`Are you sure you want to delete ${dataset.company}?`)) return;

		await sendRequest("DELETE", `/api/company/${encodeURIComponent(dataset.company)}`);
	});

	// let addApplicationButton = document.getElementById("add-application") as HTMLButtonElement;
	// addApplicationButton.addEventListener("click", async () => {
	// 	try {
	// 		addApplicationButton.disabled = true;
	// 		let nameField = document.getElementById("name") as HTMLInputElement;
	// 		let redirectURIsField = document.getElementById("redirect-uris") as HTMLInputElement;
	// 		let clientType = (document.querySelector(`input[name="client-type"]:checked`) as HTMLInputElement).value;

	// 		let name = nameField.value.trim();
	// 		let redirectURIs = redirectURIsField.value.trim();
	// 		if (!name) {
	// 			alert("Application name cannot be blank");
	// 			return;
	// 		}
	// 		if (!redirectURIs) {
	// 			alert("Application must have at least one redirect URI");
	// 			return;
	// 		}

	// 		await sendRequest("/api/admin/app", { name, redirectURIs, clientType });
	// 	}
	// 	finally {
	// 		addApplicationButton.disabled = false;
	// 	}
	// });


	let addAdminButton = document.getElementById("admin-promote") as HTMLButtonElement;
	addAdminButton.addEventListener("click", async () => {
		let emailField = document.getElementById("admin-email") as HTMLInputElement;
		try {
			addAdminButton.disabled = true;
			let email = emailField.value.trim();
			if (!email) return;

			await sendRequest("POST", "/api/admin", { email });
		}
		finally {
			emailField.value = "";
			addAdminButton.disabled = false;
		}
	});

	setUpHandlers("delete-admin", async dataset => {
		if (!confirm("Are you sure you want to revoke admin privileges from this user?")) return;

		await sendRequest("DELETE", "/api/admin", { email: dataset.email });
	});
}
