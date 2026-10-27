var inspectionDashboardInitialized = false;

async function initializeDashboardPage() {
    if (inspectionDashboardInitialized) return;
    inspectionDashboardInitialized = true;
    var data = getLoginData();
    if (data) {
        var userLabel = document.getElementById("lblUserNameDashboard");
        if (userLabel) userLabel.innerText = data.username;
    }
    renderCards();
    await renderInspectionDashboardCards();
    setInterval(function () {
        refreshDashboardCounts();
        renderInspectionDashboardCards();
    }, 15000);
}

document.addEventListener("dbReady", initializeDashboardPage);
document.addEventListener("DOMContentLoaded", function () {
    if (typeof db !== "undefined" && db && db.objectStoreNames) initializeDashboardPage();
});
if (document.readyState !== "loading" && typeof db !== "undefined" && db && db.objectStoreNames) {
    initializeDashboardPage();
}
// document.addEventListener(
    // "DOMContentLoaded",
    // async function () {
		// renderCards();
    // }
// );
function renderCards() {
	let _cardsHTML = "";
	const login = getLoginData().role;
	// WATER
	if (!login.IsWTR) {
		document.getElementById("cardWater").remove();
	}
	// ELECTRIC
	if (!login.IsELC) {
		document.getElementById("cardElectric").remove();
	}
	// GAS
	if (!login.IsGAS) {
		document.getElementById("cardGas").remove();
	}
	// SECTION METER
	if (
		!login.IsWTR &&
		!login.IsELC &&
		!login.IsGAS
	) {
		document.getElementById("sectionMeter").remove();
	}
	// SECTION WORK ORDER
	if (!login.IsWO && !login.IsSPV) {
		document.getElementById("sectionWO").remove();
	}
	else {
		if (login.IsWO) {
		_cardsHTML += 
		`
			<div class="col-12 col-md-6">
				<div class="dashboard-card" id="div_pendingWO" style="cursor:pointer;">
					<div class="dashboard-icon">
						<i class="bi bi-clipboard-check"></i>
					</div>
					<div class="dashboard-content">
						<div class="dashboard-title">
							Pending Work
						</div>
						<div class="dashboard-value"
							 id="pendingWO">
							0
						</div>
					</div>
				</div>
			</div>
			<div class="col-12 col-md-6">
				<div class="dashboard-card">
					<div class="dashboard-icon">
						<i class="bi bi-arrow-repeat"></i>
					</div>
					<div class="dashboard-content">
						<div class="dashboard-title">
							Pending Sync
						</div>
						<div class="dashboard-value"
							 id="syncWO">
							0
						</div>
					</div>
				</div>
			</div>
		`;
		}
		if (login.IsSPV) {
		_cardsHTML +=     
		`
			<div class="col-12 col-md-4">
				<div class="dashboard-card card-pending" id="div_pendingAppr" style="cursor:pointer;">
					<div class="dashboard-icon">
						<i class="bi bi-hourglass-split"></i>
					</div>
					<div class="dashboard-content">
						<div class="dashboard-title">
							Pending Approval
						</div>
						<div class="dashboard-value"
							 id="lblPendingApproval">
							0
						</div>
					</div>
				</div>
			</div>
			<div class="col-12 col-md-4">
				<div class="dashboard-card card-approved">
					<div class="dashboard-icon">
						<i class="bi bi-check-circle-fill"></i>
					</div>
					<div class="dashboard-content">
						<div class="dashboard-title">
							Approved Today
						</div>
						<div class="dashboard-value"
							 id="lblApprovedToday">
							0
						</div>
					</div>
				</div>
			</div>
			<div class="col-12 col-md-4">
				<div class="dashboard-card card-void">
					<div class="dashboard-icon">
						<i class="bi bi-x-octagon-fill"></i>
					</div>
					<div class="dashboard-content">
						<div class="dashboard-title">
							Void
						</div>
						<div class="dashboard-value"
							 id="lblVoid">
							0
						</div>
					</div>
				</div>
			</div>
		`;
		}
		document.getElementById("dashboardCards").innerHTML = _cardsHTML;
	}
    
}


async function renderInspectionDashboardCards() {
    const loginData = getLoginData();
    const role = loginData && loginData.role ? loginData.role : {};
    const section = document.getElementById("sectionInspectionDashboard");
    const host = document.getElementById("inspectionDashboardCards");
    if (!section || !host) return;

    const cards = [];
    if (role.IsWO) {
        cards.push(
            '<div class="col"><a href="inspection.aspx" class="dashboard-card text-reset text-decoration-none h-100">' +
            '<div class="dashboard-icon"><i class="bi bi-arrow-repeat"></i></div>' +
            '<div class="dashboard-content"><div class="dashboard-title">Pending Sync</div>' +
            '<div class="dashboard-value" id="inspectionPendingSync">0</div></div></a></div>'
        );
    }
    if (role.IsSPV) {
        cards.push(
            '<div class="col"><a href="inspection.aspx?mode=approval" class="dashboard-card card-pending text-reset text-decoration-none h-100">' +
            '<div class="dashboard-icon"><i class="bi bi-hourglass-split"></i></div>' +
            '<div class="dashboard-content"><div class="dashboard-title">Pending Approval</div>' +
            '<div class="dashboard-value" id="inspectionPendingApproval">0</div></div></a></div>' +
            '<div class="col"><div class="dashboard-card card-approved h-100">' +
            '<div class="dashboard-icon"><i class="bi bi-check-circle-fill"></i></div>' +
            '<div class="dashboard-content"><div class="dashboard-title">Approved Today</div>' +
            '<div class="dashboard-value" id="inspectionApprovedToday">0</div></div></div></div>' +
            '<div class="col"><div class="dashboard-card card-void h-100">' +
            '<div class="dashboard-icon"><i class="bi bi-x-octagon-fill"></i></div>' +
            '<div class="dashboard-content"><div class="dashboard-title">Void</div>' +
            '<div class="dashboard-value" id="inspectionVoidCount">0</div></div></div></div>'
        );
    }
    if (!cards.length) {
        section.classList.add("d-none");
        return;
    }
    section.classList.remove("d-none");
    host.innerHTML = cards.join("");

    if (role.IsWO && typeof db !== "undefined" && db &&
        db.objectStoreNames.contains("inspection_records")) {
        try {
            const scope = (loginData.curcompany || "").split(";");
            const pending = await new Promise((resolve, reject) => {
                const tx = db.transaction("inspection_records", "readonly");
                const req = tx.objectStore("inspection_records").getAll();
                req.onsuccess = () => resolve((req.result || []).filter(x =>
                    x.OwnerEmployeeID === loginData.employeeid &&
                    x.CompanyID === (scope[0] || "") &&
                    x.LocationID === (scope[1] || "") &&
                    x.Status === "DONE" &&
                    x.SyncStatus !== "SYNCED" &&
                    x.SyncStatus !== "CONFLICT" &&
                    x.SyncStatus !== "DELETE_PENDING").length);
                req.onerror = () => reject(req.error);
            });
            const count = document.getElementById("inspectionPendingSync");
            if (count) count.textContent = pending;
        } catch (err) {
            console.warn("Unable to count local inspection sync queue:", err);
        }
    }

    if (role.IsSPV && navigator.onLine) {
        try {
            const scope = (loginData.curcompany || "").split(";");
            const response = await fetch("inspection.aspx/GetInspectionDashboardSummary", {
                method: "POST",
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({
                    employeeId: loginData.employeeid,
                    companyId: scope[0] || "",
                    locationId: scope[1] || ""
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error("Inspection dashboard summary request failed");
            const result = payload && Object.prototype.hasOwnProperty.call(payload, "d") ? payload.d : payload;
            const pending = document.getElementById("inspectionPendingApproval");
            const approved = document.getElementById("inspectionApprovedToday");
            const voided = document.getElementById("inspectionVoidCount");
            if (pending) pending.textContent = result.pendingApproval || 0;
            if (approved) approved.textContent = result.approvedToday || 0;
            if (voided) voided.textContent = result.voidCount || 0;
        } catch (err) {
            console.warn("Unable to load Inspection dashboard summary:", err);
        }
    }
}
