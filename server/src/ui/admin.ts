namespace Admin {
  setUpHandlers("add-employee", async dataset => {
    let email = prompt("Email of employee:");
    if (!email) return;

    email = email.trim().toLowerCase();
    await sendRequest(
      "POST",
      `/api/company/${encodeURIComponent(dataset.company || "")}/employee/${encodeURIComponent(
        email
      )}`
    );
  });
  setUpHandlers("confirm-employee", async dataset => {
    await sendRequest(
      "PATCH",
      `/api/company/${encodeURIComponent(dataset.company || "")}/employee/${encodeURIComponent(
        dataset.email || ""
      )}`
    );
  });
  setUpHandlers("remove-employee", async dataset => {
    if (!confirm(`Are you sure you want to remove ${dataset.email} from ${dataset.company}?`))
      return;

    await sendRequest(
      "DELETE",
      `/api/company/${encodeURIComponent(dataset.company || "")}/employee/${encodeURIComponent(
        dataset.email || ""
      )}`
    );
  });
  setUpHandlers("set-scanner", async dataset => {
    const scannerID = prompt("Scanner ID:", dataset.scanners);
    if (scannerID === null) return;

    await sendRequest(
      "PATCH",
      `/api/company/${encodeURIComponent(dataset.company || "")}/employee/${encodeURIComponent(
        dataset.email || ""
      )}/scanners/${encodeURIComponent(scannerID)}`
    );
  });
  setUpHandlers("rename-company", async dataset => {
    const name = prompt("New name:", dataset.company);
    if (!name) return;

    await sendRequest("PATCH", `/api/company/${encodeURIComponent(dataset.company || "")}`, {
      name: name.trim(),
    });
  });
  setUpHandlers("delete-company", async dataset => {
    if (!confirm(`Are you sure you want to delete ${dataset.company}?`)) return;

    await sendRequest("DELETE", `/api/company/${encodeURIComponent(dataset.company || "")}`);
  });

  const addCompanyButton = document.getElementById("add-company") as HTMLButtonElement;
  addCompanyButton.addEventListener(
    "click",
    asyncHandler(async () => {
      const nameField = document.getElementById("company-name") as HTMLInputElement;
      const name = nameField.value.trim();
      if (!name) {
        alert("Company name cannot be blank");
        return;
      }

      await sendRequest("POST", `/api/company/${encodeURIComponent(name)}`);
    })
  );

  const addAdminButton = document.getElementById("admin-promote") as HTMLButtonElement;
  addAdminButton.addEventListener(
    "click",
    asyncHandler(async () => {
      const emailField = document.getElementById("admin-email") as HTMLInputElement;
      const email = emailField.value.trim();
      if (!email) return;

      await sendRequest("POST", "/api/admin", { email });
    })
  );

  setUpHandlers("delete-admin", async dataset => {
    if (!confirm("Are you sure you want to revoke admin privileges from this user?")) return;

    await sendRequest("DELETE", "/api/admin", { email: dataset.email || "" });
  });
}
