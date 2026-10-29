const sidebarCollapse = document.getElementById('sidebarCollapse');
const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const overlay = document.getElementById('overlay');
let syncRunning = false;
let meterSyncCache = null;
let meterSyncStatistics = {
    draft: 0,
    error: 0,
    synced: 0
};
let totalPendingSync = 0;
window.appFeatures = {
    ELC: getLoginData().role.IsELC,
    GAS: getLoginData().role.IsGAS,
    WTR: getLoginData().role.IsWTR,
    technician: getLoginData().role.IsWO,
    supervisor: getLoginData().role.IsSPV
};		
function toggleSidebar() {
    if (window.innerWidth >= 992) {
        sidebar.classList.toggle('collapsed');
        content.classList.toggle('expanded');
    } else {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}
if(sidebarCollapse) {
    sidebarCollapse.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleSidebar();
    });
}
if(overlay) {
    overlay.addEventListener('click', function() {
        if (window.innerWidth < 992) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
}
function initSidebarState() {
if (window.innerWidth >= 992) {
        // Desktop → collapse default
        sidebar.classList.add('collapsed');
        content.classList.add('expanded');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
    else {
        // Mobile → hidden default
        sidebar.classList.remove('collapsed');
        content.classList.remove('expanded');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}
document.addEventListener(
    "DOMContentLoaded",
    async function () {
        var page = window.location.pathname.toLowerCase();
        /* skip login page */
        if (page.indexOf("login.aspx") >= 0)
            return;
        await checkLogin();
        loadSidebarMenu();
        initSidebarState();
		// INIT DB
		await initIndexedDB();
        await loadCompanyDropdown();
		loadCompanyName();

        //debugger;
		// if(!appFeatures.technician && !appFeatures.ELC && !appFeatures.WTR && !appFeatures.GAS) {
        //     document.querySelector('#connectionStatus div').classList.add("d-none");
		// 	// document
		// 	// 	.getElementById("connectionStatus")
		// 	// 	?.classList.add("d-none");
		// 	// hide sync button
		// 	document
		// 		.getElementById("btnSync")
		// 		?.classList.add("d-none");

		// 	// hide pending sync badge
		// 	document
		// 		.getElementById("syncBadge")
		// 		?.classList.add("d-none");		
		// } 
		// else 
        // {
            document.querySelector('#connectionStatus div').classList.remove("d-none");            
            const summary =
                await getMeterDashboardSummary();

            if (page.indexOf("dashboard.aspx") >= 0) {
                await refreshDashboardCounts(summary);
            }

            await updateTotalPendingSync(summary);
			await updateConnectionStatus();
            setInterval(async () => {
              try {
                let status = await checkConnectionStatus();
                setConnectionStatus(status);
              } catch (error) {
                console.error("Gagal cek koneksi:", error);
              }
            }, 10000); // Jalan setiap 10 detik
            // setInterval(async () => {
            //     try {
            //       await syncAllData();
            //       console.log("Success sync all data");
            //     } catch (error) {
            //       console.error("Gagal sync data:", error);
            //     }
            // }, 180000); 
                        
		// }
		
        //var syncPanel = document.getElementById("syncPanel");
        //if (syncPanel) {
        //    syncPanel.addEventListener("show.bs.offcanvas",function () {
        //        showSyncDetail();
        //    });
        //}
		document.getElementById("btnConfirmYes")?.addEventListener("click", function () {
		    hideConfirmation();
		    if (confirmResolve) {
		        confirmResolve(true);
		        confirmResolve = null;
		    }
		});

		document.getElementById("btnConfirmCancel")?.addEventListener("click", function () {
		    hideConfirmation();
		    if (confirmResolve) {
		        confirmResolve(false);
		        confirmResolve = null;
		    }
		});

		document.getElementById("globalConfirmOverlay")?.addEventListener("click", function (e) {
		    if (e.target.id === "globalConfirmOverlay") {
		        document.getElementById("btnConfirmCancel").click();
		    }
		});
        if (page.indexOf("dashboard.aspx") >= 0) {
            const login = getLoginData().role;
            const inspectionShortcut = document.getElementById("btnDashboardInspection");
            if (inspectionShortcut && !login.IsWO) {
                inspectionShortcut.classList.add("d-none");
            }
            if (login.IsWO) {
                document.getElementById("div_pendingWO")
                    .addEventListener(
                        "click",
                        function () {
                            window.location.href =
                                "workorder.aspx?mode=entry";
                        });
            }

            if (login.IsSPV) {
                document.getElementById("div_pendingAppr")
                    .addEventListener(
                        "click",
                        function () {
                            window.location.href =
                                "workorder.aspx?mode=approval";
                        });
            }
        }

    });

window.addEventListener('resize', function() {
    if (window.innerWidth >= 992) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        if (sidebar.classList.contains('collapsed')) {
            content.classList.add('expanded');
        } else {
            content.classList.remove('expanded');
        }
    } else {
        sidebar.classList.remove('collapsed');
        content.classList.remove('expanded');
    }
});

/* Connection Status */

function loadSidebarMenu() {
    try {
        var role = appFeatures;
        var nav = document.getElementById("sidebarMenu");
        if (!nav) return;

        nav.innerHTML = `
            <a class="nav-link-custom" href="dashboard.aspx">
                <i class="bi bi-speedometer2 me-3 fs-5"></i>
                <span>Dashboard</span>
            </a>`;

        // Parent menus are visible when at least one child is available to this role.
        var canUseWorkOrder = !!(role.technician || role.supervisor);
        var canUseInspection = !!(role.technician || role.supervisor);

        if (canUseWorkOrder) {
            nav.innerHTML += `
                <div class="nav-menu-group">
                    <a class="nav-link-custom nav-parent" href="#menuWorkOrder" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="menuWorkOrder">
                        <i class="bi bi-journal-check me-3 fs-5"></i>
                        <span class="flex-grow-1">Work Order</span>
                        <i class="bi bi-chevron-down nav-chevron"></i>
                    </a>
                    <div class="collapse nav-submenu" id="menuWorkOrder">
                        ${role.technician ? `
                        <a class="nav-link-custom nav-child" href="workorder.aspx?mode=entry">
                            <i class="bi bi-clipboard2-check me-2"></i><span>My Work Order</span>
                        </a>` : ""}
                        ${role.supervisor ? `
                        <a class="nav-link-custom nav-child" href="workorder.aspx?mode=approval">
                            <i class="bi bi-check2-square me-2"></i><span>Approve Work Order</span>
                        </a>` : ""}
                    </div>
                </div>`;
        }

        if (canUseInspection) {
            nav.innerHTML += `
                <div class="nav-menu-group">
                    <a class="nav-link-custom nav-parent" href="#menuInspection" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="menuInspection">
                        <i class="bi bi-clipboard-check me-3 fs-5"></i>
                        <span class="flex-grow-1">Inspection</span>
                        <i class="bi bi-chevron-down nav-chevron"></i>
                    </a>
                    <div class="collapse nav-submenu" id="menuInspection">
                        ${role.technician ? `
                        <a class="nav-link-custom nav-child" href="inspection.aspx">
                            <i class="bi bi-pencil-square me-2"></i><span>Input Inspection</span>
                        </a>` : ""}
                        ${role.supervisor ? `
                        <a class="nav-link-custom nav-child" href="inspection.aspx?mode=approval">
                            <i class="bi bi-check2-square me-2"></i><span>Approve Inspection</span>
                        </a>` : ""}
                    </div>
                </div>`;
        }

        if (role.supervisor) {
            nav.innerHTML += `
                <a class="nav-link-custom" href="template.aspx">
                    <i class="bi bi-journal-check me-3 fs-5"></i><span>Template Check List</span>
                </a>
                <a class="nav-link-custom" href="assignwoemployee.aspx">
                    <i class="bi bi-people me-3 fs-5"></i><span>Assign Employee</span>
                </a>`;
        }

        nav.innerHTML += `
            <a class="nav-link-custom" id="menuLogout" href="#">
                <i class="bi bi-box-arrow-right me-3 fs-5"></i><span>Logout</span>
            </a>`;

        // Expand the relevant parent and highlight the active child for the current URL.
        var currentUrl = window.location.pathname.toLowerCase() + window.location.search.toLowerCase();
        nav.querySelectorAll("a.nav-child").forEach(function (link) {
            var href = (link.getAttribute("href") || "").toLowerCase();
            var path = href.split("?")[0];
            var query = href.indexOf("?") >= 0 ? href.substring(href.indexOf("?")) : "";
            var currentPath = window.location.pathname.toLowerCase();
            var currentQuery = window.location.search.toLowerCase();
            var currentPage = currentPath.substring(currentPath.lastIndexOf("/") + 1);
            var linkPage = path.substring(path.lastIndexOf("/") + 1);
            var isMatch = currentPage === linkPage &&
                (query ? currentQuery === query : currentQuery === "");
            if (isMatch) {
                link.classList.add("active");
                var parent = link.closest(".nav-submenu");
                if (parent) {
                    parent.classList.add("show");
                    var toggle = nav.querySelector('[href="#' + parent.id + '"]');
                    if (toggle) {
                        toggle.classList.add("active");
                        toggle.setAttribute("aria-expanded", "true");
                    }
                }
            }
        });

        setActiveMenu();
        attachLogoutEvent();
    } catch (ex) {
        console.error("Failed to load sidebar menu:", ex);
    }
}
function attachLogoutEvent() {
    var btn = document.getElementById("menuLogout");
    if (!btn) return;
    btn.addEventListener("click", async function (e) {
        e.preventDefault();
        let result = await showConfirmation({
            title: "Logout",
            message: "Are you sure you want to logout?",
            yesText: "Yes, Logout"
        });
        if (result)
            await logoutRoutine();
    });
}
function setActiveMenu() {
    // Match page and query parameters exactly; "inspection.aspx" must not
    // also match "inspection.aspx?mode=approval".
    const currentPath = window.location.pathname.toLowerCase();
    const currentPage = currentPath.substring(currentPath.lastIndexOf("/") + 1);
    const currentQuery = window.location.search.toLowerCase();

    document.querySelectorAll("#sidebarMenu a:not(.nav-parent)").forEach(function (link) {
        const href = (link.getAttribute("href") || "").toLowerCase();
        if (!href || href === "#" || href.charAt(0) === "#") {
            link.classList.remove("active");
            return;
        }

        const parts = href.split("?");
        const linkPage = parts[0].substring(parts[0].lastIndexOf("/") + 1);
        const linkQuery = parts.length > 1 ? "?" + parts.slice(1).join("?") : "";

        const isMatch = currentPage === linkPage &&
            (linkQuery ? currentQuery === linkQuery : currentQuery === "");

        link.classList.toggle("active", isMatch);
    });
}

/* Company */
function loadCompanyName() {
    var data = getLoginData();
    if (!data) return;
    try {
        //var current = data.curcompany;
        document.getElementById("lblCompanyLocation").innerText = data.curcompany;
        document.getElementById("lblNIK").innerText = data.employeeid;
        document.getElementById("lblUserName").innerText = data.username;
        document.getElementById("lblCompany").innerText = data.curcompanyname;
        document.getElementById("lblCompanySidebar").innerHTML = data.curcompanyname;
        document.getElementById("lblUserID").innerHTML = data.userid;
        btnProfileTopBar.title = data.username;
        if (data.theme === "L")
            document.documentElement.setAttribute("data-bs-theme", "light");
        else 
            document.documentElement.setAttribute("data-bs-theme", "dark");
    } catch (ex) { }
}
    
async function loadCompanyDropdown() {
    var ul = document.getElementById("companyMenu");

    ul.innerHTML = `
        <li>
            <h6 class="dropdown-header text-uppercase" style="font-size:10px; letter-spacing:0.1em;">
                Select Company
            </h6>
        </li>`;

    //var list = await getCompanyList();
	var list = getLoginData().companylist;
    var current = document.getElementById("lblCompanyLocation").innerText;
    var hasPending = (getTotalPendingSync() > 0);
    var offline = !navigator.onLine;

    list.forEach(function(c) {
        var isActive = (c.companylocation == current);
        var disabled = hasPending || offline;
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#";
        a.dataset.companylocation=c.companylocation;
        a.dataset.companyname=c.companyname;
        a.className = "dropdown-item" + 
            (isActive ? " active" : "") +
            (disabled ? " disabled" : "");
        a.innerHTML = 
            (isActive
                ? '<i class="bi bi-check2 me-2"></i>'
                : '') +
            c.companyname;

        a.onclick = function(e) {
            e.preventDefault();
            if (disabled) return;
            saveCompany(c.companylocation, c.companyname);
        };
        li.appendChild(a);
        ul.appendChild(li);
    });
}

function logout() {
    localStorage.clear();
    window.location = "Login.aspx";
}

function saveCompany(companyLocation, companyName) {
    var current = document.getElementById("lblCompanyLocation").innerText;
    if (current === companyLocation)
        return;

    var data = getLoginData();
    if (data) {
        try {
            data.curcompany = companyLocation;
            data.curcompanyname = companyName;
            setLoginData(data);
        }
        catch (ex) { }
    }

    window.location.href =
        "dashboard.aspx";
}

/* ======================= */
/* COUNT PENDING SYNC */
/* ======================= */
// async function countPendingEntry(type) {

//     return new Promise((resolve) => {

//         const tx = db.transaction("meter", "readonly");
//         const store = tx.objectStore("meter");

//         let count = 0;

//         store.openCursor().onsuccess = function (e) {

//             const cursor = e.target.result;

//             if (!cursor) {
//                 resolve(count);
//                 return;
//             }

//             const item = cursor.value;

//             if (item.Type == type) {

//                 if (item.Flag == "Y") {

//                     if (!item.Ending1 || !item.Ending2)
//                         count++;

//                 }
//                 else {

//                     if (!item.Ending1)
//                         count++;

//                 }

//             }

//             cursor.continue();

//         };

//     });

// }
async function countPendingSyncMeter(type) {
    return new Promise((resolve) => {
        var tx =
            db.transaction(
                "meter",
                "readonly"
            );

    var store =
        tx.objectStore(
            "meter"
        );

    var count = 0;

    store.openCursor().onsuccess =
    function (e) {
        var cursor =
            e.target.result;
        if (cursor) {
            var item =
                cursor.value;
            if (
                item.Type==type &&
                item.Status=="DRAFT"
            ) {
                count++;
            }
            cursor.continue();
        }
        else {
            resolve(count);
        }
    };
});
}
async function countApproval() {
    var data=getLoginData();
    try {
         const res = await fetch("workorder.aspx/getApprovalCounters", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify({
                    companyLocation: data.curcompany,
                    section: data.section
                })
            });
        if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
        }         
        const result = await res.json();
        let pending = result.d.pending || 0;
        let rejected = result.d.rejected || 0;
        let approved = result.d.approved || 0;

        const localStores = await new Promise((resolve, reject) => {

        // Ganti "namaStoreKamu" dengan nama object store yang kamu gunakan
        const transaction = db.transaction("workorder", "readonly");
        const store = transaction.objectStore("workorder");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        getAllRequest.onerror = () => reject(getAllRequest.error);
        });

        // Only reconcile local approval actions belonging to this exact company/location
        // and an authorized section. IndexedDB is shared by all logins on this device.
        const companyLocation = (data.curcompany || "").split(";");
        const companyId = companyLocation[0] || "";
        const locationId = companyLocation[1] || "";
        const allowedSections = (data.section || "").split(";").filter(Boolean);
        const scopedLocalStores = localStores.filter(item =>
            item.CompanyID === companyId &&
            item.LocationID === locationId &&
            allowedSections.includes(item.SectionID)
        );

        const jmlPendingLokal = scopedLocalStores.filter(
            item => item.StatusSPV === "PENDING"
        ).length;
        const jmlRejectedLokal = scopedLocalStores.filter(
            item => item.StatusSPV === "PENDING" && item.ActionSPV === "VOID"
        ).length;
        const jmlApprovedLokal = scopedLocalStores.filter(
            item => item.StatusSPV === "PENDING" && item.ActionSPV === "APPROVED"
        ).length;

        // 3. Modifikasi nilai counter berdasarkan logika bisnis kamu
        pending = Number(pending) - jmlPendingLokal;
        rejected = Number(rejected) + jmlRejectedLokal;
        approved = Number(approved) + jmlApprovedLokal;

        // Pastikan angka tidak minus jika terjadi anomali data
        if (pending < 0) pending = 0;

        document.getElementById("lblPendingApproval").innerText = `${pending}`;
        document.getElementById("lblApprovedToday").innerText = `${approved}`;
        document.getElementById("lblVoid").innerText = `${rejected}`;
    }
    catch(ex) {
        alert(ex.message);        
    }
}
async function countPendingWO() {
    if (!db) {
        console.warn("DB not ready");
        return 0;
    }
    return new Promise((resolve) => {
        var tx =
            db.transaction(
                "workorder",
                "readonly"
            );

    var store =
        tx.objectStore(
            "workorder"
        );

    var count = 0;

    store.openCursor().onsuccess =
    function (e) {
        var cursor =
            e.target.result;
        if (cursor) {
            var item =
                cursor.value;
            const login = getLoginData();
            const companyLocation = (login && login.curcompany || "").split(";");
            const allowedSections = (login && login.section || "").split(";").filter(Boolean);
            if (
                ["PENDING", "DRAFT"].includes(item.Status) &&
                item.CompanyID === (companyLocation[0] || "") &&
                item.LocationID === (companyLocation[1] || "") &&
                allowedSections.includes(item.SectionID)
            ) {
                count++;
            }
            cursor.continue();
        }
        else {
            resolve(count);
        }
    };
});
}    
async function countPendingSyncWO() {

    return new Promise((resolve, reject) => {

        let tx = db.transaction("workorder", "readonly");
        let store = tx.objectStore("workorder");

        let req = store.getAll();

        req.onsuccess = function () {

            let data = req.result || [];

            const login = getLoginData();
            const companyLocation = (login.curcompany || "").split(";");
            // Count pending records from every section on this shared device.
            // Upload still filters strictly by the recorded owner.
            let pending = data.filter(x =>
                (x.Status === "DONE" || x.StatusSPV === "PENDING") &&
                x.CompanyID === (companyLocation[0] || "") &&
                x.LocationID === (companyLocation[1] || "")
            );

            resolve(pending.length);
        };

        req.onerror = function () {
            reject(req.error);
        };

    });
}
// async function getTotalPendingSync() {
//     var total = 0;
// 	var pending = 0;
//     var login = getLoginData();
//     if (!login)
//         return 0;
//     var role = login.role;
// 	var page = window.location.pathname.toLowerCase();

//     if (role.IsWTR) {
// 		pending = await countPendingSyncMeter("WTR");
//         total += pending;
// 		if (page.indexOf("dashboard.aspx") >= 0) {
// 			document.getElementById("syncWater").textContent = pending;
// 		}
// 	}
//     if (role.IsELC) {
// 		pending = await countPendingSyncMeter("ELC");
//         total += pending;
// 		if (page.indexOf("dashboard.aspx") >= 0) {
// 			document.getElementById("syncElectric").textContent = pending;
// 		}
// 	}

//     if (role.IsGAS) {
// 		pending = await countPendingSyncMeter("GAS");
//         total += pending;
// 		if (page.indexOf("dashboard.aspx") >= 0) {
// 			document.getElementById("syncGas").textContent = pending;
// 		}
// 	}
	
//     if (role.IsWO) {
// 		pending = await countPendingSyncWO();
//         total += pending;
// 		if (page.indexOf("dashboard.aspx") >= 0) {
// 			document.getElementById("syncWO").textContent = pending;
// 		}
// 	}
//     return total;
// }
async function calculateMeterSyncStatistics() {

    meterSyncStatistics = {
        draft: 0,
        error: 0,
        synced: 0
    };

    const login = getLoginData();

    if (!login)
        return meterSyncStatistics;

    if (login.role.IsELC)
        await countMeterStatus("ELC");

    if (login.role.IsWTR)
        await countMeterStatus("WTR");

    if (login.role.IsGAS)
        await countMeterStatus("GAS");

    return meterSyncStatistics;
}
async function countMeterStatus(type) {
    return new Promise((resolve) => {

        let tx = db.transaction("meter", "readonly");
        let store = tx.objectStore("meter");

        let cursor = store.openCursor();

        cursor.onsuccess = function(e){

            let cur = e.target.result;

            if(cur){

                let item = cur.value;

                if(item.Type==type){

                    switch(item.Status){

                        case "DRAFT":
                            meterSyncStatistics.draft++;
                            break;

                        case "ERROR":
                            meterSyncStatistics.error++;
                            break;

                        case "SYNCED":
                            meterSyncStatistics.synced++;
                            break;
                    }

                }

                cur.continue();
            }
            else{
                resolve();
            }

        };

    });

}
// async function calculatePendingSync() {

//     let total = 0;

//     const login = getLoginData();
//     if (!login)
//         return 0;

//     const role = login.role;

//     if (role.IsELC)
//         total += await countPendingSyncMeter("ELC");

//     if (role.IsWTR)
//         total += await countPendingSyncMeter("WTR");

//     if (role.IsGAS)
//         total += await countPendingSyncMeter("GAS");

//     if (role.IsWO)
//         total += await countPendingSyncWO();

//     return total;
// }
function getSyncSummary(){

    return {

        pending:
            syncStatistics.meter.draft +
            syncStatistics.wo.draft,

        error:
            syncStatistics.meter.error +
            syncStatistics.wo.error,

        success:
            syncStatistics.meter.synced +
            syncStatistics.wo.synced

    };

}
async function updateTotalPendingSync() {

    if (!db)
        return 0;

    await calculateMeterSyncStatistics();

    let total =
        meterSyncStatistics.draft +
        meterSyncStatistics.error;

    total += await countPendingSyncWO();
    if (typeof countPendingSyncInspections === "function") {
        total += await countPendingSyncInspections();
    }
    totalPendingSync = total;

    const badge =
        document.getElementById("badgePendingSync");

    if (!badge)
        return total;

    if (total > 0) {

        badge.textContent = total;
        badge.classList.remove("d-none");

    }
    else {

        badge.classList.add("d-none");

    }

    return total;

}
function getTotalPendingSync() {
    return totalPendingSync;
}
async function refreshDashboardCounts(summary = null) {
    var page = window.location.pathname.toLowerCase();
    if (page.indexOf("dashboard.aspx") == -1) {
        return;
    }

    const login = getLoginData();
    const role = login.role;

    summary = summary || await getMeterDashboardSummary();

    if (role.IsWTR) {
        document.getElementById("pendingWater").textContent =
            summary.entry.AIR;
        document.getElementById("syncWater").textContent =
            summary.sync.AIR;
    }

    if (role.IsELC) {
        document.getElementById("pendingElectric").textContent =
            summary.entry.ELC;
        document.getElementById("syncElectric").textContent =
            summary.sync.ELC;
    }

    if (role.IsGAS) {
        document.getElementById("pendingGas").textContent =
            summary.entry.GAS;
        document.getElementById("syncGas").textContent =
            summary.sync.GAS;
    }

    if (role.IsWO) {
        document.getElementById("pendingWO").textContent =
            await countPendingWO();
    }

    if (role.IsSPV) {
        await countApproval();
    }

}
function normalizeMeter(m){
    if(!m.Status)
        m.Status="NEW";

    if(!m.Ending1)
        m.Ending1="";

    if(!m.Ending2)
        m.Ending2="";

    if(!m.Remark)
        m.Remark="";

    if(!m.Blob)
        m.Blob=null;

    if(!m.FileName)
        m.FileName="";

    if(!m.SyncErrorCode)
        m.SyncErrorCode="";

    if(!m.SyncErrorMessage)
        m.SyncErrorMessage="";

    return m;
}

/* ======================= */
/* SHOW SYNC DETAIL */
/* ======================= */
//function showSyncDetail() {
//    countPendingSync();
//    var modal = new bootstrap.Modal(document.getElementById("syncDetailModal"));
//    modal.show();
//}
function showSyncToast() {
    let toastEl =
        document.getElementById("syncToast");
    window.syncToastInstance =
        new bootstrap.Toast(
            toastEl,
            {
                autohide: false
            }
        );
    window.syncToastInstance.show();
}
function hideSyncToast() {
    if (window.syncToastInstance)
        window.syncToastInstance.hide();
}
function updateSyncProgress(current,total,text) {
    let percent = 0;
    if (total > 0) {
        percent =
            Math.floor(
                (current / total) * 100
            );
    }

    document.getElementById("syncText").innerText =
        text +
        " (" +
        current +
        "/" +
        total +
        ")";

    document.getElementById("syncPercentText").innerText = percent + "%";

    let bar = document.getElementById("syncProgressBar");
    bar.style.width = percent + "%";
    bar.setAttribute("aria-valuenow",percent);
}
function setSyncCompleted() {
    document.getElementById("syncSpinner").style.display = "none";
    updateSyncProgress(1,1,"Sync Completed ✔");
}
// function setSyncError() {
//     document.getElementById("syncSpinner").style.display = "none";
//     updateSyncProgress(0,1,"Sync Failed ❌");
// }
function resetSyncToast() {
    document.getElementById("syncSpinner").style.display = "inline-block";
    updateSyncProgress(0,1,"Preparing sync...");
}

async function syncAllData() {
    if (syncRunning)
        return;

    syncRunning = true;    
    try {
        resetSyncToast();
        showSyncToast();
        meterSyncCache = null;
        //await updateTotalPendingSync();
        let login = getLoginData();
        if (!login) return;

        let role = login.role;
        let totalSteps = 0;
        const hasMeterRole = role.IsELC || role.IsWTR || role.IsGAS;

        if (hasMeterRole) totalSteps++; // upload meter
        if (role.IsWO || role.IsSPV) totalSteps++; // upload WO / SPV actions
        if (role.IsSPV) totalSteps++; // sync SPV inspection approvals and prepare offline cache
        if (role.IsELC) totalSteps++;
        if (role.IsWTR) totalSteps++;
        if (role.IsGAS) totalSteps++;
        if (role.IsWO || role.IsSPV) totalSteps += 2; // download WO and WO checklist
        if (role.IsWO) totalSteps += 2; // upload pending inspections and download inspection data

        let step = 0;

        // UPLOAD METER
        if (role.IsELC || role.IsWTR || role.IsGAS) {
            step++;
            updateSyncProgress(step,totalSteps,"Uploading meter");
            await uploadPendingMeter();
            await updateTotalPendingSync();
        }
        if (role.IsWO || role.IsSPV) {
            step++;
            updateSyncProgress(step,totalSteps,"Uploading workorder");
            await uploadPendingWO();
        }
        if (role.IsWO) {
            step++;
            updateSyncProgress(step, totalSteps, "Uploading inspections");
            await uploadPendingInspections();
        }
        if (role.IsSPV) {
            step++;
            updateSyncProgress(step, totalSteps, "Syncing SPV inspection approvals");
            if (typeof window.syncInspectionApprovalOffline !== "function")
                throw new Error("Modul global sync approval inspeksi belum dimuat.");
            const approvalSync = await window.syncInspectionApprovalOffline(login);
            if (approvalSync.conflicts)
                showToast(approvalSync.conflicts + " approval inspeksi konflik; aksi tetap tersimpan untuk diperiksa.", "warning");
        }

        // DOWNLOAD METER
        if (role.IsELC) {
            step++;
            updateSyncProgress(step,totalSteps,"Downloading meter ELC");
            await downloadMeter("ELC");
        }
        if (role.IsWTR) {
            step++;
            updateSyncProgress(step,totalSteps,"Downloading meter WTR");
            await downloadMeter("AIR");
        }
        if (role.IsGAS) {
            step++;
            updateSyncProgress(step,totalSteps,"Downloading meter GAS");
            await downloadMeter("GAS");
        }
        // DOWNLOAD WO
        if (role.IsWO || role.IsSPV) {
            step++;
            updateSyncProgress(step,totalSteps,"Downloading workorder");
            await downloadWorkOrder();
            // step++;
            // updateSyncProgress(step,totalSteps,"Downloading employee");
            // await getEmployees();
            step++;
            updateSyncProgress(step,totalSteps,"Downloading checklist");
            await getCheckList();
            if (role.IsWO) {
                step++;
                updateSyncProgress(step, totalSteps, "Downloading inspection templates");
                await getInspectionData();
            }
            window.dispatchEvent(new CustomEvent("syncCompleted"));
        }

        // FINISH
        updateSyncProgress(totalSteps,totalSteps,"Sync Completed ✔");
        //await updateTotalPendingSync();
        var page = window.location.pathname.toLowerCase();
        const summary =
            await getMeterDashboardSummary();

        if (page.indexOf("dashboard.aspx") >= 0) {
            await refreshDashboardCounts(summary);
        }
        await updateTotalPendingSync(summary);

        hideSyncToast();
    }
    catch (err) {
        console.error(err);
        updateSyncProgress(0,1,"Sync Failed ❌");
    }
    finally {
        syncRunning = false;
    }    
}

async function uploadPendingMeter() {
    //------------------------------------------
    // LOGIN
    //------------------------------------------
    const login = getLoginData();
    const [companyId, locationId] =
        login.curcompany.split(";");
    const userId =
        login.employeeid;
    //------------------------------------------
    // LOAD DRAFT
    //------------------------------------------
    let pendingList =
        await new Promise(function(resolve,reject){
            const tx =
                db.transaction(
                    "meter",
                    "readonly"
                );
            const req =
                tx.objectStore("meter")
                  .index("by_company_location_status")
                  .getAll(
                    IDBKeyRange.only([
                        companyId,
                        locationId,
                        "DRAFT"
                    ])
                  );
            req.onsuccess=function(){
                resolve(req.result||[]);
            };
            req.onerror=function(){
                reject(req.error);
            };
        });
    if(!pendingList.length)
        return;
    //------------------------------------------
    // UPLOAD
    //------------------------------------------
    const batchSize = 50;
    const successMeterNos = [];
    let uploadedCount = 0;
    for(
        let i=0;
        i<pendingList.length;
        i+=batchSize
    ){
        const batch =
            pendingList.slice(
                i,
                i+batchSize
            );
        //--------------------------------------
        // PHOTO
        //--------------------------------------
        const photoList =
            batch
            .filter(m =>
                m.Blob &&
                m.FileName
            )
            .map(m => ({
                FileName:
                    m.FileName,
                OrderNo:
                    m.MeterNo,
                Blob:
                    m.Blob
            }));
        const photos =
            await convertPhotosToBase64(
                photoList
            );
        const photoMap = {};
        photos.forEach(function(p){
            photoMap[p.OrderNo]=
                p.Base64;
        });
        //--------------------------------------
        // BUILD REQUEST
        //--------------------------------------
        const uploadBatch =
            batch.map(function(m){
                const item={...m};
                delete item.Blob;
                item.Base64 =
                    photoMap[m.MeterNo] || "";
                return item;
            });
        //--------------------------------------
        // API
        //--------------------------------------
        let response =
            await fetch(
                "meterreading.aspx/uploadMeter",
                {
                    method:"POST",
                    headers:{
                        "Content-Type":
                            "application/json"
                    },
                    body:JSON.stringify({
                        meterList:
                            uploadBatch,
                        companyId:
                            companyId,
                        locationId:
                            locationId,
                        userId:
                            userId
                    })
                });
        let json =
            await response.json();
        let result =
            json.d;
        //--------------------------------------
        // FAILED
        //--------------------------------------
        const failed =
            new Set(
                (result.FailedItems||[])
                .map(x=>x.MeterNo)
            );
        //--------------------------------------
        // UPDATE INDEXEDDB
        //--------------------------------------
        await new Promise(function(resolve,reject){
            const tx =
                db.transaction(
                    "meter",
                    "readwrite"
                );
            const store =
                tx.objectStore("meter");
            batch.forEach(function(m){
                if(failed.has(m.MeterNo))
                    return;
                m.Status="SYNCED";
                m.SyncErrorCode="";
                m.SyncErrorMessage="";
                store.put(m);
                successMeterNos.push(
                    m.MeterNo
                );
            });
            tx.oncomplete=function(){
                resolve();
            };
            tx.onerror=function(){
                reject(tx.error);
            };
        });
        //--------------------------------------
        // PROGRESS
        //--------------------------------------
        uploadedCount += batch.length;
        updateSyncProgress(
            uploadedCount,
            pendingList.length,
            "Upload Meter"
        );
    }
    //------------------------------------------
    // REFRESH UI
    //------------------------------------------
    document.dispatchEvent(
        new CustomEvent(
            "meterSyncCompleted",
            {
                detail:{
                    companyId,
                    locationId,
                    syncedMeterNos:
                        successMeterNos
                }
            }
        )
    );
}
async function downloadMeter(type) {
    const login = getLoginData();
    const [companyId, locationId] = login.curcompany.split(";");

    try {

        // ===============================
        // Ambil dari server hanya sekali
        // ===============================
        if (meterSyncCache == null) {

            const response = await fetch("meterreading.aspx/getMeter", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    companyId: companyId,
                    locationId: locationId,
                    lastSync: login.lastMeterSync || "",
                    lastPeriod: login.lastMeterPeriod || "",
                    isELC: login.role.IsELC,
                    isWTR: login.role.IsWTR,
                    isGAS: login.role.IsGAS
                })
            });

            if (!response.ok) {
                const text = await response.text();
                console.log(text);
                throw new Error("Download meter failed, Status=" + response.status);
            }

            meterSyncCache = await response.json();
            meterSyncCache = meterSyncCache.d; // hasil WebMethod ASP.NET
        }

        // ===============================
        // Apply data sesuai type
        // ===============================
        await applyMeterType(type, meterSyncCache);

        // ===============================
        // Simpan info sync (cukup sekali)
        // ===============================
        if(type=="GAS" ||
           (!login.role.IsGAS && type=="AIR") ||
           (!login.role.IsGAS && !login.role.IsWTR && type=="ELC")){

            login.lastMeterSync=meterSyncCache.ServerTime;
            if (meterSyncCache.FullDownload && meterSyncCache.Insert.length > 0)
                login.lastMeterPeriod=meterSyncCache.ActivePeriod;

            setLoginData(login);

        }
        document.dispatchEvent(
            new CustomEvent(
                "meterDownloadCompleted",
                {
                    detail: {
                        companyId,
                        locationId
                    }
                }
            )
        );

    }
    catch (err) {
        console.error("downloadMeter error", err);
        throw err; // supaya syncAllData masuk ke catch utama
    }
}
async function applyMeterType(type, result) {
    const inserts = (result.Insert || []).filter(x => x.Type == type);
    const updates = (result.Update || []).filter(x => x.Type == type);
    const deletes = (result.Delete || []).filter(x => x.Type == type);

    // ===============================
    // FULL DOWNLOAD
    // ===============================
    if (result.FullDownload) {

        await deleteAllMeterByType(type, true);

        await new Promise((resolve,reject)=>{

        const tx = db.transaction(["meter"], "readwrite");
        const store = tx.objectStore("meter");

        inserts.forEach(m => {
            // m.Status = "NEW";
            m.BarcodeNo = getBarcodeNo(m.MeterNo);
            store.put(m);
        });

        tx.oncomplete=resolve;
        tx.onerror=reject;

        });

    }
    else {
        // ===============================
        // DELTA - INSERT
        // ===============================
        for (let m of inserts) {
            // m.Status = "NEW";
            m.BarcodeNo = getBarcodeNo(m.MeterNo);
            await putMeter(normalizeMeter(m));
        }

        // ===============================
        // DELTA - UPDATE
        // ===============================

        for (const m of updates) {

            const local = await getMeterByKey(
                m.CompanyID,
                m.LocationID,
                m.Type,
                m.MeterNo
            );
            m.BarcodeNo = getBarcodeNo(m.MeterNo);
            //----------------------------------
            // belum ada
            //----------------------------------

            if (!local) {

                // m.Status = "NEW";

                await putMeter(
                    normalizeMeter(m)
                );

                continue;

            }

            if (m.Status === "REOPENED") {
                await putMeter(m);
                continue;
            }

            //----------------------------------
            // master berubah
            //----------------------------------

            Object.assign(local, m);

            //----------------------------------
            // reset data hasil input teknisi
            //----------------------------------
            resetMeterReading(local);

            await putMeter(
                normalizeMeter(local)
            );

        }

        // ===============================
        // DELTA - DELETE
        // ===============================

        for (const d of deletes) {

            const local = await getMeterByKey(
                d.CompanyID,
                d.LocationID,
                d.Type,
                d.MeterNo
            );

            if (!local)
                continue;

            //----------------------------------
            // draft jangan dihapus
            //----------------------------------

            if (local.Status == "DRAFT") {
                markMeterTerminated(local);
                await putMeter(local);
                continue;
            }

            //----------------------------------
            // selain draft boleh delete
            //----------------------------------

            await deleteMeterByKey(
                d.CompanyID,
                d.LocationID,
                d.Type,
                d.MeterNo,
                d.Period
            );

        }

    }

    await refreshMeterUI();

}
function markMeterTerminated(m){
    m.Status="ERROR";
    m.Terminated=true;
    m.SyncErrorCode="TERMINATED";
    m.SyncErrorMessage=
        "Meter has been terminated.";
    return m;
}
async function deleteAllMeterByType(type, keepDraft){

    const login=getLoginData();

    const [companyId,locationId]=login.curcompany.split(";");

    return new Promise((resolve,reject)=>{

        const tx=db.transaction("meter","readwrite");
        const store=tx.objectStore("meter");

        const index=store.index("by_company_location");

        const req=index.openCursor(
            IDBKeyRange.only([companyId,locationId])
        );

        req.onsuccess=function(e){

            const cursor=e.target.result;

            if(!cursor){
                return;
            }

            if(cursor.value.Type!=type){
                cursor.continue();
                return;
            }

            if(
                keepDraft &&
                cursor.value.Status=="DRAFT"
            ){
                cursor.continue();
                return;
            }

            cursor.delete();
            cursor.continue();

        };

        tx.oncomplete=()=>resolve();

        tx.onerror=e=>reject(e.target.error);

    });

}
function resetMeterReading(m){
    m.Ending1="";
    m.Ending2="";
    m.Remark="";
    m.Blob="";
    m.FileName="";
    m.Status="NEW";
    m.SyncErrorCode="";
    m.SyncErrorMessage="";
    return m;
}
// async function deleteMeterByCompanyLocation(companyId, locationId) {
//     return new Promise((resolve, reject) => {

//         let tx = db.transaction(["meter"], "readwrite");
//         let store = tx.objectStore("meter");
//         let index = store.index("by_company_location");

//         let req = index.openCursor(
//             IDBKeyRange.only([companyId, locationId])
//         );

//         req.onsuccess = function (e) {

//             let cursor = e.target.result;

//             if (cursor) {

//                 cursor.delete();
//                 cursor.continue();

//             }

//         };

//         req.onerror = function (e) {
//             reject(e.target.error);
//         };

//         tx.oncomplete = function () {
//             resolve();
//         };

//         tx.onerror = function (e) {
//             reject(e.target.error);
//         };

//     });

// }
function putMeter(data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["meter"], "readwrite");
        const store = tx.objectStore("meter");
        const req = store.put(data);

        req.onsuccess = () => resolve();
        req.onerror = e => reject(e.target.error);
    });
}

function getMeterByKey(companyId, locationId, type, meterNo) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["meter"], "readonly");
        const store = tx.objectStore("meter");

        const req = store.get([companyId, locationId, type, meterNo]);

        req.onsuccess = () => resolve(req.result);
        req.onerror = e => reject(e.target.error);
    });
}

function deleteMeterByKey(companyId, locationId, type, meterNo, period) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["meter"], "readwrite");
        const store = tx.objectStore("meter");

        const req = store.delete([companyId, locationId, type, meterNo, period]);

        req.onsuccess = () => resolve();
        req.onerror = e => reject(e.target.error);
    });
}
async function downloadWorkOrder() {
    let data = getLoginData();
    let newLastSync = null;
    try {
        if (!navigator.onLine) return;
        updateSyncProgress(0, 1, "Download WorkOrder");

        let response = await fetch("workorder.aspx/getWorkOrders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                companyLocation: data.curcompany,
                section: data.section,
                lastSync: data.lastsyncw,
                isSPV: false,
                status: "",
                keyhd: 0,
                dataRole: data.role
            })
        });

        if (!response.ok) throw new Error("Download WO failed");

        let result = await response.json();
        let workorders = result.d.data;
        newLastSync = result.d.serverTime;
        if (!workorders) return;

        // Simpan semua WONumber server untuk kebutuhan pembersihan/delete lokal nanti
        var serverKeys = new Set();

        // =================================================================
        // PROSES 1: SIMPAN/UPDATE WORKORDERS UTAMA
        // =================================================================
        for (let wo of workorders) {
            serverKeys.add(wo.KeyHD);

            await new Promise((resolve, reject) => {
                let txWO = db.transaction("workorder", "readwrite");
                let storeWO = txWO.objectStore("workorder");

                let getRequest = storeWO.get(wo.KeyHD);
                getRequest.onsuccess = function(event) {
                    let existingData = event.target.result;
                    // if (existingData && existingData.Status != "SYNCED" && 
                    //                      wo.Status === "PENDING") {
                    if (existingData && (
                        wo.Status === "PENDING" ||
                        existingData.Status === "DRAFT" ||
                        existingData.Status === "DONE"
                    )) {
                        // Never overwrite an unsynced local draft/completion with server refresh data.
                        resolve();
                        return;
                    }
                    // if (existingData && wo.StatusSPV != "" && 
                    //     existingData.StatusSPV != "") {
                    //     resolve();
                    //     return;
                    // }
                    // if (existingData && existingData.Status === "" && wo.Status != "" && existingData.StatusSPV != "") {
                    //     resolve();
                    //     return;
                    // }


                    let putRequest = storeWO.put({
                        KeyHD: wo.KeyHD,
                        CompanyID: wo.CompanyID,
                        LocationID: wo.LocationID,
                        WONo: wo.WONo,
                        WODate: wo.WODate,
                        EquipmentCode: wo.EquipmentCode,
                        LocationNo: wo.LocationNo,
                        Description: wo.Description,
                        Status: wo.Status,
                        TemplateWOPM: wo.TemplateWOPM,
                        ReasonVoid: wo.ReasonVoid, 
                        IsCompleteDC: wo.IsCompleteDC,
                        IsSampling: wo.IsSampling,
                        TemplateJSON: wo.TemplateJSON,
                        DataCheckListJSON: wo.DataCheckListJSON,
                        DataPhotoJSON: wo.DataPhotoJSON,
                        EmployeeJSON: wo.EmployeeJSON,
                        SectionID: wo.SectionID,
                        LastUpdated: wo.LastUpdated,
                        StatusSPV: "",
                        ActionSPV: "",
                        // Preserve offline ownership when refreshing server WO data.
                        InspectionOwnerID: (existingData && existingData.InspectionOwnerID) || "",
                        SupervisorActionOwnerID: (existingData && existingData.SupervisorActionOwnerID) || "",
                        ModelCode: wo.ModelCode
                    });

                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = (e) => reject(e.target.error);
                };
                getRequest.onerror = (e) => reject(e.target.error);
            });
        }

        // Protect locally edited/completed WOs from all server-side cache refreshes.
        // The header may already be protected above, but checklist and photo stores
        // must be protected separately because uploadPendingWO reads those stores.
        const protectedLocalKeys = await new Promise((resolve, reject) => {
            const tx = db.transaction("workorder", "readonly");
            const req = tx.objectStore("workorder").getAll();
            req.onsuccess = () => resolve(new Set((req.result || [])
                .filter(localWO => localWO.Status === "DRAFT" || localWO.Status === "DONE")
                .map(localWO => Number(localWO.KeyHD))));
            req.onerror = () => reject(req.error);
        });

        // =================================================================
        // PROSES 2: PROSES FOTO (KHUSUS SPV)
        // =================================================================
        if (data.role.IsSPV || data.role.IsWO) {
            for (let wo of workorders) {
                let photoData = wo.DataPhotoJSON; 
                if (!photoData) continue;

                let keyHD = photoData.KeyHD;
                if (protectedLocalKeys.has(Number(keyHD))) continue;
                let tasks = [];
                if (photoData.PhotoBefore) {
                    photoData.PhotoBefore.forEach(p => tasks.push({ item: p, type: "BEFORE" }));
                }
                if (photoData.PhotoAfter) {
                    photoData.PhotoAfter.forEach(p => tasks.push({ item: p, type: "AFTER" }));
                }

                for (let task of tasks) {
                    let item = task.item;
                    let type = task.type;

                    // Cek duplikasi dengan transaksi jangka pendek
                    // let isDuplicate = await new Promise((resolve) => {
                    //     let txCheck = db.transaction(["wo_photos"], "readonly");
                    //     let storeCheck = txCheck.objectStore("wo_photos");
                    //     let index = storeCheck.index("compositeKey");
                    //     let req = index.get([keyHD, type, item.SeqNo]);
                    //     req.onsuccess = () => resolve(req.result !== undefined);
                    //     req.onerror = () => resolve(false);
                    // });
                    let isDuplicate = await new Promise((resolve) => {
                        let txCheck = db.transaction(["wo_photos"], "readonly");
                        let storeCheck = txCheck.objectStore("wo_photos");
                        
                        // Asumsi Anda punya index biasa bernama "KeyHD"
                        let index = storeCheck.index("KeyHD"); 
                        let request = index.openCursor(IDBKeyRange.only(keyHD));

                        let found = false;
                        request.onsuccess = function(event) {
                            let cursor = event.target.result;
                            if (cursor) {
                                let data = cursor.value;
                                // Cocokkan manual di JavaScript
                                if (data.Type === type && data.OrderNo === item.SeqNo) {
                                    found = true;
                                    resolve(true); // Ketemu duplikat, stop pencarian
                                    return;
                                }
                                cursor.continue();
                            } else {
                                if (!found) resolve(false); // Sampai data habis tidak ketemu
                            }
                        };
                        request.onerror = () => resolve(false);
                    });

                    if (isDuplicate) continue;

                    // Download di luar transaksi agar aman
                    let blob = await urlToBlob(item.imgSrc);
                    if (!blob) continue; 

                    // Simpan dengan transaksi baru yang segar
                    try {
                        await new Promise((resolve, reject) => {
                            let txWrite = db.transaction(["wo_photos"], "readwrite");
                            let storeWrite = txWrite.objectStore("wo_photos");
                            let req = storeWrite.put({
                                KeyHD: keyHD,
                                Type: type,         
                                Blob: blob,         
                                OrderNo: item.SeqNo,
                                FileName: item.FileName || "" 
                            });
                            req.onsuccess = () => resolve();
                            req.onerror = (e) => reject(e.target.error);
                        });
                    } catch (err) {
                        console.error("Gagal simpan foto:", err);
                    }
                }
            }

            // =================================================================
            // PROSES 3: TIMPA DATA CHECKLIST
            // =================================================================
            for (let wo of workorders) {
                let checkListData = wo.DataCheckListJSON; 
                if (!checkListData) continue;
                if (protectedLocalKeys.has(Number(checkListData.KeyHD))) continue;

                try {
                    await new Promise((resolve, reject) => {
                        let txChk = db.transaction(["wo_checklist"], "readwrite");
                        let storeChk = txChk.objectStore("wo_checklist");
                        let req = storeChk.put({
                            KeyHD: checkListData.KeyHD,
                            FollowUp: checkListData.FollowUp,
                            FollowUpSection: checkListData.FollowUpSection,
                            FollowUpRemark: checkListData.FollowUpRemark,
                            Summary: checkListData.Summary,
                            Items: checkListData.Items,
                            RemarkSPV: checkListData.RemarkSPV,
                            StartTime: checkListData.StartTime ?? "",
                            EndTime: checkListData.EndTime ?? ""
                        });
                        req.onsuccess = () => resolve();
                        req.onerror = (e) => reject(e.target.error);
                    });
                } catch (err) {
                    console.error("Gagal simpan checklist:", err);
                }
            }
        }

        // =================================================================
        // PROSES 4: CLEANUP / DELETE LOCAL YANG TIDAK ADA DI SERVER
        // =================================================================
        await new Promise((resolve, reject) => {
            // Buka transaksi untuk ketiga store sekaligus agar bisa didelete bersamaan
            let txClean = db.transaction(["workorder", "wo_checklist", "wo_photos"], "readwrite");
            
            let storeWO = txClean.objectStore("workorder");
            let storeChk = txClean.objectStore("wo_checklist");
            let storePhoto = txClean.objectStore("wo_photos");

            let requestAll = storeWO.getAll();

            requestAll.onsuccess = function () {
                let cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 7);           
                let localList = requestAll.result;
                let keysToDelete = [];

                // 1. Filter KeyHD mana saja yang memenuhi syarat hapus
                localList.forEach(localWO => {
                    let key = localWO.KeyHD;
                    let lastDate = new Date(localWO.LastUpdated);
                    if (!serverKeys.has(key) && localWO.Status === 'SYNCED' && lastDate < cutoff) {
                        keysToDelete.push(key);
                    }
                });

                // 2. Eksekusi penghapusan di semua store terkait
                keysToDelete.forEach(key => {
                    // Hapus dari store utama
                    storeWO.delete(key);
                    
                    // Hapus dari store checklist (berdasarkan Primary Key: KeyHD)
                    storeChk.delete(key);

                    let indexKeyHD = storePhoto.index("KeyHD"); 
                    indexKeyHD.openCursor(IDBKeyRange.only(key)).onsuccess = function(event) {
                        let cursor = event.target.result;
                        if (cursor) {
                            cursor.delete();
                            cursor.continue();
                        }
                    };
                    
                    console.log(`Cleanup berhasil untuk KeyHD: ${key} (WorkOrder, Checklist, & Photos)`);
                });
            };

            txClean.oncomplete = () => resolve();
            txClean.onerror = (event) => reject(event.target.error);
        });

        // =================================================================
        // PROSES Selesai
        // =================================================================
        updateSyncProgress(1, 1, "Download WorkOrder Done");
        data.lastsyncw = newLastSync;
        setLoginData(data);

    } catch (err) {
        console.error("downloadWorkOrders error:", err);
    }
}
async function uploadPendingWO() {
    const login = getLoginData();
    if (!login || !db) return;

    const companyLocation = (login.curcompany || "").split(";");
    const companyId = companyLocation[0] || "";
    const locationId = companyLocation[1] || "";
    const allowedSections = (login.section || "").split(";").filter(Boolean);

    // Retry cleanup for server-confirmed WO uploads left behind by a prior local cleanup interruption.
    const previouslySynced = await new Promise((resolve, reject) => {
        const tx = db.transaction("workorder", "readonly");
        const req = tx.objectStore("workorder").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
    for (const item of previouslySynced.filter(x => x.SyncStatus === "SYNCED" &&
        x.CompanyID === companyId && x.LocationID === locationId && allowedSections.includes(x.SectionID))) {
        await cleanupConfirmedSyncedWO(item);
    }

    const allLocal = await new Promise((resolve, reject) => {
        const tx = db.transaction("workorder", "readonly");
        const req = tx.objectStore("workorder").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });

    const pendingInCompany = allLocal.filter(x =>
        (x.Status === "DONE" || x.StatusSPV === "PENDING") &&
        x.SyncStatus !== "SYNCED" &&
        x.CompanyID === companyId &&
        x.LocationID === locationId
    );
    const pending = pendingInCompany.filter(x => allowedSections.includes(x.SectionID));

    if (pendingInCompany.length > pending.length) {
        showToast("Ada WO offline dari section lain di perangkat ini. Data tersebut tetap disimpan dan tidak dikirim oleh login ini.", "warning");
    }

    const eligible = pending.filter(x => {
        if (x.Status === "DONE") {
            return !!login.employeeid && x.InspectionOwnerID === login.employeeid;
        }
        if (x.StatusSPV === "PENDING") {
            return !!login.employeeid && x.SupervisorActionOwnerID === login.employeeid;
        }
        return false;
    });

    if (pending.length > eligible.length) {
        showToast("Ada WO offline milik teknisi lain atau belum memiliki pemilik. Data tersebut tidak dikirim; login dengan akun pemilik untuk sync.", "warning");
    }
    if (!eligible.length) return;

    /*
     * spUTL_WO_CheckList determines its mode for the WHOLE request:
     * an empty checklist table means SPV action; a non-empty one means technician upload.
     * Never mix these two categories in one request, or a combined-role login could
     * accidentally submit an SPV action through the technician branch (or vice versa).
     */
    const technicianWOs = eligible.filter(x => x.Status === "DONE");
    const supervisorWOs = eligible.filter(x => x.Status !== "DONE" && x.StatusSPV === "PENDING");

    if (technicianWOs.length) {
        await uploadWOGroup(technicianWOs, "TECHNICIAN");
    }
    if (supervisorWOs.length) {
        await uploadWOGroup(supervisorWOs, "SUPERVISOR");
    }
}

async function uploadWOGroup(workOrders, mode) {
    const login = getLoginData();
    if (!login || !workOrders || !workOrders.length) return;

    const rawItems = [];
    for (const wo of workOrders) {
        const checklist = await new Promise((resolve, reject) => {
            const tx = db.transaction("wo_checklist", "readonly");
            const req = tx.objectStore("wo_checklist").get(wo.KeyHD);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!checklist || !Array.isArray(checklist.Items)) {
            showToast("WO " + (wo.WONo || wo.KeyHD) + " belum memiliki data checklist lokal. Data tetap tersimpan dan tidak di-upload.", "warning");
            continue;
        }
        if (mode === "TECHNICIAN" && checklist.Items.length === 0) {
            // The stored procedure infers SPV mode when the entire checklist table is empty.
            // Do not let an empty technician payload be misinterpreted as an SPV action.
            showToast("WO " + (wo.WONo || wo.KeyHD) + " tidak memiliki item checklist. Data tetap pending untuk diperiksa.", "warning");
            continue;
        }
        rawItems.push({ wo, checklist });
    }
    if (!rawItems.length) return;

    const prepared = [];
    for (const itemData of rawItems) {
        const wo = itemData.wo;
        const data = itemData.checklist;
        const itemPayload = {
            wo,
            checklists: [],
            checklistgroups: [],
            checklistsummarys: [{
                KeyHD: wo.KeyHD,
                Summary: data.Summary || "",
                FollowUp: data.FollowUp || "",
                RemarkSPV: data.RemarkSPV || "",
                // Only supervisor batches may carry an SPV action; a stale field on a technician WO must not change server authorization mode.
                ActionSPV: mode === "SUPERVISOR" ? (wo.ActionSPV || "") : "",
                Reason: wo.ReasonVoid || "",
                FollowUpSection: data.FollowUpSection || "",
                FollowUpRemark: data.FollowUpRemark || "",
                StartTime: data.StartTime || "",
                EndTime: data.EndTime || ""
            }],
            photos: []
        };

        if (mode === "TECHNICIAN") {
            for (const item of (data.Items || [])) {
                itemPayload.checklists.push({
                    KeyHD: data.KeyHD,
                    IDItem: item.IDItem,
                    Value: item.Value || "",
                    Remark: item.Remark || item.Remark1 || "",
                    Remark1: item.Remark1 == null ? (item.Remark || "") : item.Remark1,
                    Remark2: item.Remark2 || "",
                    IsAnomali: item.IsAnomali || false
                });
                if (item.Type === "GROUP" && item.Values) {
                    for (const key in item.Values) {
                        itemPayload.checklistgroups.push({
                            KeyHD: data.KeyHD,
                            IDItem: item.IDItem,
                            FieldName: key,
                            Value: item.Values[key]
                        });
                    }
                }
            }

            let before = await getPhotosByWO(wo.KeyHD, "BEFORE");
            let after = await getPhotosByWO(wo.KeyHD, "AFTER");
            before = await convertPhotosToBase64(before);
            after = await convertPhotosToBase64(after);
            before.forEach(photo => itemPayload.photos.push({
                KeyHD: wo.KeyHD, Type: "WO1", FileName: photo.FileName,
                OrderNo: photo.OrderNo, Base64: photo.Base64
            }));
            after.forEach(photo => itemPayload.photos.push({
                KeyHD: wo.KeyHD, Type: "WO2", FileName: photo.FileName,
                OrderNo: photo.OrderNo, Base64: photo.Base64
            }));
        } else {
            let sampling = await getPhotosByWO(wo.KeyHD, "SAMPLING");
            sampling = await convertPhotosToBase64(sampling);
            sampling.forEach(photo => itemPayload.photos.push({
                KeyHD: wo.KeyHD, Type: "WO3", FileName: photo.FileName,
                OrderNo: photo.OrderNo, Base64: photo.Base64
            }));
        }
        prepared.push(itemPayload);
    }
    if (!prepared.length) return;

    // Keep requests conservatively below common IIS/ASP.NET request-size limits.
    // Each batch contains whole WOs, so checklist/photo/summary rows never split across requests.
    const maxRequestChars = 1800000;
    const batches = [];
    let batch = [];
    const payloadFor = items => ({
        checklists: items.flatMap(x => x.checklists),
        checklistgroups: items.flatMap(x => x.checklistgroups),
        photos: items.flatMap(x => x.photos),
        userid: login.employeeid,
        companyLocation: login.curcompany || "",
        checklistsummarys: items.flatMap(x => x.checklistsummarys)
    });

    for (const item of prepared) {
        const candidate = batch.concat([item]);
        const candidateSize = JSON.stringify(payloadFor(candidate)).length;
        if (batch.length && candidateSize > maxRequestChars) {
            batches.push(batch);
            batch = [item];
        } else {
            batch = candidate;
        }
    }
    if (batch.length) batches.push(batch);

    let failedBatchCount = 0;
    for (const batchItems of batches) {
        const body = payloadFor(batchItems);
        const bodyText = JSON.stringify(body);
        if (bodyText.length > maxRequestChars) {
            const labels = batchItems.map(x => x.wo.WONo || x.wo.KeyHD).join(", ");
            failedBatchCount++;
            showToast("Upload WO ditunda karena ukuran foto/data terlalu besar (" + labels + "). Data lokal tetap pending; kecilkan foto atau tinjau batas request server.", "warning");
            continue;
        }

        try {
            const response = await fetch("workorder.aspx/SyncWO", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: bodyText
            });
            const responseText = await response.text();
            let envelope;
            try {
                envelope = JSON.parse(responseText);
            } catch (_) {
                throw new Error("Respons server bukan JSON (HTTP " + response.status + ").");
            }
            const result = envelope && envelope.d ? envelope.d : envelope;
            if (!response.ok || !result || result.success !== true) {
                throw new Error((result && result.message) || ("HTTP " + response.status));
            }

            // Mark only the WOs in this confirmed-success batch. Failed batches remain retryable.
            // Pass the upload mode so a concurrent company/owner change cannot mark another
            // local record as synced merely because its server KeyHD matches.
            for (const item of batchItems) {
                await markWOSynced(item.wo, result.serverTime, mode);
            }
        } catch (ex) {
            failedBatchCount++;
            console.error("WO sync failed; this batch remains pending:", mode, batchItems.map(x => x.wo.KeyHD), ex);
            showToast("Sync WO " + mode + " gagal. Data lokal tetap pending dan akan dicoba lagi. " + ex.message, "warning");
        }
    }
    if (failedBatchCount) {
        throw new Error(failedBatchCount + " batch WO gagal sync; data tersebut tetap tersimpan untuk dicoba lagi.");
    }
}
async function markWOSynced(wo, lastUpdate, mode) {
    // First persist the server-confirmed state. If local cleanup is interrupted,
    // the next Sync can clean this confirmed record without uploading it again.
    await new Promise((resolve, reject) => {
        const tx = db.transaction("workorder", "readwrite");
        const store = tx.objectStore("workorder");
        const getReq = store.get(wo.KeyHD);
        getReq.onsuccess = function () {
            const data = getReq.result;
            if (!data) {
                reject(new Error("WO lokal tidak ditemukan saat konfirmasi sync; status tidak diubah."));
                return;
            }
            const sameScope = data.CompanyID === wo.CompanyID &&
                data.LocationID === wo.LocationID && data.SectionID === wo.SectionID;
            const sameOwner = mode === "TECHNICIAN"
                ? data.InspectionOwnerID === wo.InspectionOwnerID
                : data.SupervisorActionOwnerID === wo.SupervisorActionOwnerID;
            const stillSameStage = mode === "TECHNICIAN"
                ? data.Status === "DONE"
                : data.StatusSPV === "PENDING";
            if (!sameScope || !sameOwner || !stillSameStage) {
                reject(new Error("Scope, pemilik, atau status WO berubah selama sync. Status lokal tidak diubah; periksa dan sync ulang."));
                return;
            }
            data.SyncStatus = "SYNCED";
            data.LastSyncAt = new Date().toISOString();
            if (lastUpdate) data.LastUpdated = lastUpdate;
            const putReq = store.put(data);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error("Gagal menyimpan status sync WO."));
        tx.onabort = () => reject(tx.error || new Error("Penyimpanan status sync WO dibatalkan."));
    });

    await cleanupConfirmedSyncedWO(wo);
}

async function cleanupConfirmedSyncedWO(wo) {
    // Delete only the locally-owned WO transaction after the server confirmed it.
    // The following downloadWorkOrder() refresh repopulates any still-relevant
    // server work-order data. Keep other owners/companies/sections untouched.
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["workorder", "wo_checklist", "wo_photos"], "readwrite");
        const woStore = tx.objectStore("workorder");
        const getReq = woStore.get(wo.KeyHD);
        getReq.onsuccess = function () {
            const current = getReq.result;
            if (!current || current.SyncStatus !== "SYNCED" ||
                current.CompanyID !== wo.CompanyID || current.LocationID !== wo.LocationID ||
                current.SectionID !== wo.SectionID) return;
            woStore.delete(wo.KeyHD);
            tx.objectStore("wo_checklist").delete(wo.KeyHD);
            const photoStore = tx.objectStore("wo_photos");
            const photoReq = photoStore.index("KeyHD").openCursor(IDBKeyRange.only(wo.KeyHD));
            photoReq.onsuccess = function () {
                const cursor = photoReq.result;
                if (!cursor) return;
                cursor.delete();
                cursor.continue();
            };
        };
        getReq.onerror = () => reject(getReq.error);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error("Gagal menghapus cache WO yang sudah sync."));
        tx.onabort = () => reject(tx.error || new Error("Pembersihan cache WO dibatalkan."));
    });
}
// async function cleanupOldWorkOrders() {
//     return new Promise((resolve, reject) => {
//         let cutoff = new Date();
//     cutoff.setDate(
//         cutoff.getDate() - 30
//     );

//     let tx =
//         db.transaction(
//             "workorder",
//             "readwrite"
//         );
//     let store =
//         tx.objectStore(
//             "workorder"
//         );
//     let request =
//         store.getAll();

//     request.onsuccess =
//         function () {
//             let list =
//                 request.result;
//             list.forEach(wo => {
//                 if (!wo.createdDate)
//                     return;
//             let woDate =
//                 new Date(
//                     wo.createdDate
//                 );
//             if (woDate < cutoff) {
//                 store.delete(
//                     wo.WoNumber
//                 );
//             }
//         });
//     resolve();
// };
// request.onerror =
//     function () {
//         reject(
//             request.error
//         );
//     };
// });
// }
// function disableSyncButton() {
//     document.getElementById("btnSync").disabled = true;
// }

// function enableSyncButton() {
//     document.getElementById("btnSync").disabled = false;
// }

document.getElementById("btnSync").addEventListener("click",async function () {
    const summary = await getSyncSummary();
    console.log(summary);    
    await syncAllData();
});
function getMeterSyncSummary() {
    return {
        pending: meterSyncStatistics.draft,
        error: meterSyncStatistics.error,
        synced: meterSyncStatistics.synced
    };
}
async function getWOSyncSummary() {
    return {
        pending: await countPendingSyncWO()
    };
}
async function getSyncSummary() {
    await calculateMeterSyncStatistics();
    return {
        meter: getMeterSyncSummary(),
        wo: await getWOSyncSummary()
    };

}

/* ======================= */
/* AUTO UPDATE BADGE */
/* ======================= */
// window.addEventListener("load", function() {
    // loadCompanyName();
    // setInterval(checkLogin, 60000);
    // setInterval(updateTotalPendingSync,15000);    
// });

//window.addEventListener("storage",function () {
//    countPendingSync();
//});

// GLOBAL VARIABLE
let confirmResolve = null;
window.showConfirmation = function (options) {
    //console.log("showConfirmation called");
    if (confirmResolve)
        return; // dialog masih aktif
    return new Promise((resolve) => {
        confirmResolve = resolve;
    const overlay = document.getElementById("globalConfirmOverlay");
    document.getElementById("confirmTitle").innerText =
        options.title || "Confirm";
    document.getElementById("confirmMessage").innerText =
        options.message || "Are you sure?";
    document.getElementById("btnConfirmYes").innerText =
        options.yesText || "Yes";
    document.getElementById("btnConfirmCancel").innerText =
        options.cancelText || "Cancel";
    overlay.classList.remove("d-none");
    confirmYesCallback = function () {
        confirmResolve(true);
        confirmResolve = null;
        overlay.classList.add("d-none");
    };
    confirmNoCallback = function () {
        confirmResolve(false);
        confirmResolve = null;
        overlay.classList.add("d-none");
    };
});
};

//function showConfirmation(options) {
//    console.log("showConfirmation called");
//    if (confirmResolve)
//        return; // dialog masih aktif
//    return new Promise((resolve) => 
//    {
//        confirmResolve = resolve;
//        const overlay = document.getElementById("globalConfirmOverlay");
//        document.getElementById("confirmTitle").innerText = options.title || "Confirm";
//        document.getElementById("confirmMessage").innerText = options.message || "Are you sure?";
//        document.getElementById("btnConfirmYes").innerText = options.yesText || "Yes";
//        document.getElementById("btnConfirmCancel").innerText = options.cancelText || "Cancel";
//        overlay.classList.remove("d-none");
//        confirmYesCallback = function () { resolve(true); };
//        confirmNoCallback = function () { resolve(false); };
//    });
//}

function hideConfirmation() {
    document.getElementById("globalConfirmOverlay").classList.add("d-none");
}

//document.getElementById("btnConfirmYes").addEventListener("click", function () {
//    hideConfirmation();
//    if (confirmResolve) {
//        confirmResolve(true); // YES = true
//        confirmResolve = null;
//    }
//});

//document.getElementById("btnConfirmCancel").addEventListener("click", function () {
//    hideConfirmation();
//    if (confirmResolve) {
//        confirmResolve(false); // NO = false
//        confirmResolve = null;
//    }
//});

//document.getElementById("globalConfirmOverlay").addEventListener("click", function (e) {
//    if (e.target.id === "globalConfirmOverlay") {
//        document.getElementById("btnConfirmCancel").click();
//    }
//});

btnProfile.addEventListener("click", function () {
    window.location.replace("profilesetting.aspx");
});

btnProfileTopBar.addEventListener("click", function () {
    window.location.href = "profilesetting.aspx";
});

//document.getElementById("menuLogout").addEventListener("click",
//async function (e) {
//    e.preventDefault();
//    let result = await showConfirmation({
//        title: "Logout",
//        message: "Are you sure you want to logout?",
//        yesText: "Yes, Logout"
//    });
//    if (result)
//        await logoutRoutine();
//});

async function logoutRoutine() {
    try {
        console.log("logoutRoutine called");
        // cek pending sync
        // var total = await getTotalPendingSync();
        var total = await updateTotalPendingSync();        
        if (total > 0) {
            let result = await showConfirmation({
                title: "Logout",
                message:
                "Masih ada " + total +
                " data belum sync.\n\nLogout tetap?"
            });
            if (!result)
                return; // keluar kalau No

        }

        // hapus session login
        localStorage.removeItem("loginData");
        // optional:
        //sessionStorage.clear();

        // redirect ke login
        //window.location.href = "Login.aspx";
        showLogin();
    }
    catch (err) {
        console.error(
            "Logout error:",
            err
        );
    }
}

window.addEventListener("online", async () => {
    let status = await checkConnectionStatus();
    setConnectionStatus(status);
});

window.addEventListener("offline", () => {
    setConnectionStatus(false);
});

async function checkConnectionStatus() {
    try {

        // Step 1: cek koneksi network
        if (!navigator.onLine) {
            console.log("Offline (navigator)");
            return false;
        }

        // Step 2: ping webserver
        let controller = new AbortController();
        let timeout =
            setTimeout(
                () => controller.abort(),
                5000 // timeout 5 detik
            );

        let response =
            await fetch(
                "dashboard.aspx/Ping",
                {
                    method: "GET",
                    cache: "no-cache",
                    signal: controller.signal
                }
            );

        clearTimeout(timeout);

        if (response.ok) {
            // console.log(
            //     "Server reachable"
            // );
            return true;
        }
        else {
            console.log(
                "Server response not OK"
            );
            return false;
        }

    }
    catch (err) {
        console.log(
            "Server unreachable:",
            err.message
        );
        return false;
    }
}

async function updateConnectionStatus() {
    // if (!navigator.onLine) {
    //     setConnectionStatus(false);
    //     btnSync.disabled=true;
    //     return;
    // }
    //checkServerConnection();
    let status = await checkConnectionStatus();
    setConnectionStatus(status);
    document.getElementById("btnSync").disabled = !status;
}
async function getMeterDashboardSummary() {
    return new Promise((resolve, reject) => {

        const summary = {

            entry: {
                ELC: 0,
                AIR: 0,
                GAS: 0
            },

            sync: {
                ELC: 0,
                AIR: 0,
                GAS: 0
            }

        };

        const tx = db.transaction("meter", "readonly");
        const store = tx.objectStore("meter");

        const req = store.openCursor();

        req.onsuccess = function (e) {

            const cursor = e.target.result;

            if (!cursor) {
                resolve(summary);
                return;
            }

            const m = cursor.value;

            //---------------------------------
            // Pending Entry
            //---------------------------------

            let pendingEntry = false;

            if (m.Flag == "Y") {

                pendingEntry =
                    !m.Ending1 ||
                    !m.Ending2;

            }
            else {

                pendingEntry =
                    !m.Ending1;

            }

            if (pendingEntry) {

                if (summary.entry[m.Type] != null)
                    summary.entry[m.Type]++;

            }

            //---------------------------------
            // Pending Sync
            //---------------------------------

            if (m.Status == "DRAFT") {

                if (summary.sync[m.Type] != null)
                    summary.sync[m.Type]++;

            }

            cursor.continue();

        };

        req.onerror = e => reject(e.target.error);

    });

}
function setConnectionStatus(isOnline) {
    let label = document.getElementById("lblConnection");

    if (isOnline) {
        label.innerHTML = "Online";
        label.className =
        "badge bg-success";
    } else {
        label.innerHTML = "Offline";
        label.className =
        "badge bg-danger";
    }
}

//function updateConnectionStatus() {
//    var label = document.getElementById("lblConnection");
//    if (navigator.onLine) {
//        label.innerHTML = "Online";
//        label.className =
//        "badge bg-success";
//    }
//    else {
//        label.innerHTML = "Offline";
//        label.className =
//        "badge bg-danger";
//    }
//}
//window.addEventListener("online", updateConnectionStatus);
//window.addEventListener("offline", updateConnectionStatus);


async function refreshMeterUI() {
    await refreshDashboardCounts();
    await updateTotalPendingSync();
}
