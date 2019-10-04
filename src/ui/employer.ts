namespace Employer {
	enum Tabs {
		Scanning,
		Search,
		Settings,
	}
	const scanningTab = document.getElementById("scanning-tab");
	const scanningContent = document.getElementById("scanning");
	const searchTab = document.getElementById("search-tab");
	const searchContent = document.getElementById("search");
	const settingsTab = document.getElementById("settings-tab");
	const settingsContent = document.getElementById("settings");
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
	}
	scanningTab.addEventListener("click", () => {
		setTab(Tabs.Scanning);
	});
	searchTab.addEventListener("click", () => {
		setTab(Tabs.Search);
	});
	settingsTab.addEventListener("click", () => {
		setTab(Tabs.Settings);
	});
}
