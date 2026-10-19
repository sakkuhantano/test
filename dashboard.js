document.addEventListener(
    "dbReady",
    async function () {
        var data = getLoginData();
        if (data)
            document.getElementById("lblUserNameDashboard").innerText = data.username;
		renderCards();
        setInterval(await refreshDashboardCounts(), 15000);
    }
);
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
