const MAX_FILES = 2;

let defaultTab = null;
let previewList = [];     // semua foto (DOM / data)
let previewIndex = 0;     // posisi sekarang
let isScrolling = false;
let currentWO = null;
function escapeHtmlAttribute(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
let currentTemplate = null;
let itemMap = {};
let pageSize = 10;
let currentPage = 1;
let currentPreviewId = null;
let currentPreviewWrapper = null;
let currentMode = null;
let isSaveDone = false;
let isCanEntry = false;
let startTime = "";
let allWorkOrders = [];
let filteredWO = [];
let sectionFollowUp = 
[
    { Code: "ACON", Name: "Air Cond.", Icon: "bi bi-fan" },
    { Code: "COMM", Name: "Comm.", Icon: "bi bi-broadcast" },
    { Code: "MECH", Name: "Mechanical", Icon: "bi bi-gear" },
    { Code: "ELEC", Name: "Electrical", Icon: "bi bi-lightning-charge" },
    { Code: "CIVIL", Name: "Civil", Icon: "bi bi-building" },
    { Code: "PFIT", Name: "Fit Out", Icon: "bi bi-hammer" },
    { Code: "PHKP", Name: "Housekeeping", Icon: "bi bi-brush" },
    { Code: "PSEC", Name: "Security", Icon: "bi bi-shield-check" }
];
document.addEventListener("DOMContentLoaded",async function () {
        if(!validatePageAccess())
            return;
		currentMode = getQueryString("mode");
        document.addEventListener("dbReady", async function () {
        if (currentMode == "approval") {
            document.getElementById("btnScan").classList.add("d-none");
            document.getElementById("btnTab1").childNodes[0].textContent = "Outstanding";
            document.getElementById("btnTab2").childNodes[0].textContent = "Approved";
            document.getElementById("btnTab2").dataset.status = "APPROVED";
            document.getElementById("btnTab3").childNodes[0].textContent = "Void";
            document.getElementById("btnTab3").dataset.status = "VOID";
            await initApprovalWO("PENDING");
            renderPage(1);
        }
        else {
            await initWorkOrderPage();
        }
        }, { once: true });

        // setWOHeaderPosition();
		// backToList();
		
    }
);		
// document.addEventListener(
    // "dbReady",
    // async function () {
		// if (!validatePageAccess())
			// return;
        // await initWorkOrderPage();
        // backToList();
    // }
// );
window.addEventListener(
    "syncCompleted",
    async function () {
        await initWorkOrderPage();
        if (document.getElementById("woDetailPage").classList.contains('page-hidden')) {
            backToList();
        }
    }
);
async function filterTab(button) {
    // ambil status dari tombol
    //let status = button.getAttribute("data-status");
    let status = button.dataset.status;
    // ubah jadi array
    let statuses = status.split(";");
    // remove active dari semua tab
    document.querySelectorAll(".tab-btn").forEach(btn =>
		btn.classList.remove("active")
	);
    // set active ke tombol yg diklik
    button.classList.add("active");
    // filter data
	if (currentMode === "entry") {
    filteredWO = allWorkOrders.filter(x =>
		statuses.includes(x.Status) &&
        getLoginData().section.includes(x.SectionID)
	);
	}
	else {
        if (document.querySelector('#lblConnection').innerText.toUpperCase() === "ONLINE") {
            await initApprovalWO(status);
        }
	}
    // reset page
    renderPage(1);
    defaultTab = button;
}
async function updateApprovalTabCounters() {
	var data=getLoginData();
	const result = await promisifyPageMethod(
		PageMethods.getApprovalCounters, data.curcompany, data.section
	);	
	let pending = result.pending || 0;
	let rejected = result.rejected || 0;

    const localStores = await new Promise((resolve, reject) => {

    // Ganti "namaStoreKamu" dengan nama object store yang kamu gunakan
    const transaction = db.transaction("workorder", "readonly");
    const store = transaction.objectStore("workorder");
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
    getAllRequest.onerror = () => reject(getAllRequest.error);
    });

    // Kriteria 1: StatusSPV === "PENDING"
    const jmlPendingLokal = localStores.filter(
    item => item.StatusSPV != ""
    ).length;

    // Kriteria 2: StatusSPV === "PENDING" dan ActionSPV === "VOID"
    const jmlRejectedLokal = localStores.filter(
    item => item.StatusSPV === "PENDING" && item.ActionSPV === "VOID"
    ).length;

    // 3. Modifikasi nilai counter berdasarkan logika bisnis kamu
    pending = Number(pending) - jmlPendingLokal;
    rejected = Number(rejected) + jmlRejectedLokal;

    // Pastikan angka tidak minus jika terjadi anomali data
    if (pending < 0) pending = 0;

	document.getElementById("countTab1").innerText = `(${pending})`;
	document.getElementById("countTab2").innerText = "";
	document.getElementById("countTab3").innerText = `(${rejected})`;
}
function updateTabCounters() {
    let pending =
        allWorkOrders.filter(x =>
            x.Status === "PENDING"
        ).length;
    let draft =
        allWorkOrders.filter(x =>
            x.Status === "DRAFT"
        ).length;
	let statuses = ["DONE","SYNCED"];
    let completed =
        allWorkOrders.filter(x =>
			statuses.includes(x.Status)
        ).length;
	document.getElementById("countTab1").innerText = `(${pending})`;
	document.getElementById("countTab2").innerText = `(${draft})`;
	document.getElementById("countTab3").innerText = `(${completed})`;
}
function renderPage(page) {

    currentPage = page;

    let container =
        document.getElementById("woList");

    container.innerHTML = "";

    let start = (page - 1) * pageSize;
    let end = start + pageSize;

    let pageData = 
        filteredWO.slice(start, end);
        
    if (pageData.length === 0) {

        container.innerHTML =
        `
        <div class="text-center text-muted p-4">

        <i class="bi bi-inbox fs-3"></i>

        <div>No Work Orders</div>

        </div>
    `;

        return;

    }
    pageData.forEach(wo => {

        container.innerHTML += createRow(wo);

});

renderPaginationNumbers();
}
function createRow(wo) {

    return `
    <div class="work-order-item clickable-row"
	data-wo-id="${wo.KeyHD}"
    data-wono="${wo.WONo}"
    data-equipment="${wo.EquipmentCode}"
    data-description="${wo.Description}"
    data-issampling="${wo.IsSampling ? 'YES' : ''}"
    onclick="openWO('${wo.KeyHD}', this);">

    <!-- ICON CHEVRON (tanpa kolom) -->
    <div class="chevron-icon">

        <i class="bi bi-chevron-right text-muted"></i>

    </div>

   <div class="row g-2 align-items-start">

       <!-- WO Number -->
       <div class="col-12 col-lg-2">

           <div class="fw-bold">
               ${wo.IsSampling && currentMode === "approval" ? `<i class="bi bi-shield-check me-1 text-primary"></i>` : ``}${wo.WONo}
    </div>

    <!-- Mobile Date -->
    <div class="small text-muted d-lg-none">
        ${formatMsDate(wo.WODate)}
    </div>

</div>

<!-- Desktop Date -->
<div class="col-lg-2 d-none d-lg-block">

    <span class="text-muted small">
       ${formatMsDate(wo.WODate)}
    </span>

</div>

<!-- Equipment -->
<div class="col-12 col-lg-2">

    <div class="fw-semibold">

        <i class="bi bi-gear me-1"></i>

    ${wo.EquipmentCode}

    </div>

</div>

<!-- Location -->
<div class="col-12 col-lg-2">

    <div class="text-secondary small">

        <i class="bi bi-geo-alt me-1"></i>

    ${wo.LocationNo}

    </div>

</div>

<!-- Description -->
<div class="col-12 col-lg-4">

    <div class="small text-muted description-text">

        ${wo.Description}

    </div>

</div>

</div>

</div>
    `;

}
function renderPaginationNumbers() {
    let totalPages = Math.ceil(filteredWO.length / pageSize);

    let html = "";

    for (let i = 1; i <= totalPages; i++) {

        html += `
<li class="page-item ${i === currentPage ? "active" : ""}">
    <a class="page-link" href="#" onclick="renderPage(${i});return false;">${i}</a>
</li>`;
    }
    document.getElementById("paginationNumbers").innerHTML = html;
}
function prevPage() {
    if (currentPage > 1) {
        renderPage(currentPage - 1);
    }
}
function nextPage() {
    let totalPages = Math.ceil(filteredWO.length / pageSize);
    if (currentPage < totalPages) {
        renderPage(currentPage + 1);
    }
}
function updatePrevNextState() {
    let totalPages =
    Math.ceil(filteredWO.length / pageSize);
    document.querySelector(".page-item:first-child").classList.toggle("disabled",currentPage === 1);
    document.querySelector(".page-item:last-child").classList.toggle("disabled",currentPage === totalPages);
}
// window.addEventListener('resize', setWOHeaderPosition);
// function setWOHeaderPosition() {
//     const master = document.getElementById("masterHeader");
//     const height = master.getBoundingClientRect().height;
// 	const woListPage = document.getElementById("woListPage");
// 	const woDetailPage = document.getElementById("woDetailPage");

//     if (woListPage) {
// 		woListPage.style.marginTop = "70px";
// 	}
//     if (woDetailPage) {
// 		woDetailPage.style.marginTop = "120px";
// 	}
// }
function backToList() {
    document.getElementById("woDetailPage").classList.add("page-hidden");
	// document.getElementById("headDetailPage").style.setProperty("display", "none", "important");
	// document.getElementById("headDetailPage1").style.setProperty("display", "none", "important");
	document.getElementById("headDetailPage").classList.add("page-hidden");
	document.getElementById("headDetailPage1").classList.add("page-hidden");
    document.getElementById("scanPage").classList.add("page-hidden");
    document.getElementById("woListPage").classList.remove("page-hidden");
	document.getElementById("headListPage").classList.remove("page-hidden");
	document.getElementById("scrollTools").style.display = "block";
    // setTimeout(setWOHeaderPosition, 50);
	//document.getElementById("woListPage").style.pointerEvents = "auto";
    filterTab(defaultTab);
}
function highlightSearch(keyword) {

    keyword =
        keyword.trim().toLowerCase();

    if (keyword === "") {
        document
            .querySelectorAll(".work-order-item")
            .forEach(r =>
                r.classList.remove("wo-highlight")
            );
        return;
    }

    let rows =
        document.querySelectorAll(".work-order-item");

    let found = false;

    rows.forEach(row => {

        row.classList.remove("wo-highlight");

    if (!found && keyword !== "") {

        let wono =
            row.dataset.wono.toLowerCase();

        let equipment =
            row.dataset.equipment.toLowerCase();

        let desc =
            row.dataset.description.toLowerCase();

        if (
            wono.includes(keyword) ||
            equipment.includes(keyword) ||
            desc.includes(keyword)
        ) {

            row.classList.add("wo-highlight");

            row.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            found = true;

        }

    }

});

}
function clearSearch() {
    let txt = document.getElementById("txtSearchWO");
    txt.value = "";
    highlightSearch("");
}

// ------------------------------------------
// fungsi barcode
// function stopCamera() {
//     if (html5QrCode) {
//         html5QrCode.getState()
//             .then(state => {
//                 if (state === 2) {
//                     html5QrCode.stop()
//                         .then(() => {
//                             html5QrCode.clear();
//         document.getElementById("scannerVideo").innerHTML = "";
//     });
// }
// })
//             .catch(() => {
//                 console.log(
//                     "Scanner not running"
//                 );
// });
// }
// }
// async function testCamera() {

//     try {

//         const stream =
//             await navigator.mediaDevices.getUserMedia({
//                 video: true
//             });

//         alert("Camera OK");

//         const video =
//             document.createElement("video");

//         video.autoplay = true;
//         video.playsInline = true;
//         video.srcObject = stream;

//         document
//             .getElementById("scannerVideo")
//             .appendChild(video);

//     }
//     catch(ex) {

//         alert(
//             "Camera Error : " +
//             ex.message
//         );

//         console.error(ex);
//     }
// }
async function startScan() {
    document.getElementById("woListPage").classList.add("page-hidden");
    document.getElementById("woDetailPage").classList.add("page-hidden");
	document.getElementById("scrollTools").style.display = "none";
    document.getElementById("scanPage").classList.remove("page-hidden");
	document.getElementById("headDetailPage").classList.add("page-hidden");
	document.getElementById("headDetailPage1").classList.add("page-hidden");
	document.getElementById("headListPage").classList.add("page-hidden");
	// document.getElementById("headDetailPage").style.setProperty("display", "none", "important");
	// document.getElementById("headDetailPage1").style.setProperty("display", "none", "important");
	// document.getElementById("headListPage").style.setProperty("display", "none", "important");
    
    /*
    html5QrCode = new Html5Qrcode("scannerVideo");
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: 250
        },
        decodedText => {
            onBarcodeDetected(decodedText);
        }
    ).catch(err => {
        alert(err);
        console.error(err);
    });    
    */
    scanBarcode(
        "scannerVideo",
        function (code) {
            highlightSearch(code);
            backToList();
        },
        function (err) {
            alert(err);
            // backToList();
        }
    );
    // await testCamera();
}
// function stopScan() {
//     backToList();
//     stopCamera();
// }
// function onBarcodeDetected(code) {
//     console.log("Barcode:", code);
//     stopCamera();
//     //openWO(code);
//     highlightSearch(code);
//     backToList();
// }
// ------------------------------------------

// ------------------------------------------
// fungsi UI
// ------------------------------------------
$(window).on('scroll', function () {
	if (!isScrolling) {
		window.requestAnimationFrame(function () {

			let scrollTop = $(window).scrollTop();
			let windowHeight = $(window).height();
			let docHeight = $(document).height();

			$('#lbtn_BackToTop').toggle(scrollTop > 50);
			$('#lbtn_BackToBottom').toggle(scrollTop + windowHeight < docHeight - 50);

			isScrolling = false;
		});

		isScrolling = true;
	}

});
// scroll body to 0px on click
$('#lbtn_BackToTop').click(function () {
	$('body,html').animate({
		scrollTop: 0
	}, 100);
	return false;
});
$('#lbtn_BackToBottom').click(function () {
	$('body,html').animate({
		scrollTop: $(document).height()
	}, 100);
	return false;
});
setTimeout(() => {
    document
        .querySelectorAll(".work-order-item")
        .forEach(r =>
            r.classList.remove("wo-highlight")
        );
}, 5000);
document.querySelectorAll(".pagination a").forEach(link => {
    link.addEventListener(
        "click",
        function (e) {
            e.preventDefault();
        }
    );
});
document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
    new bootstrap.Dropdown(el);
});
function renderHeaderWO(wo) {

    let headerHtml = `
	<div class="d-flex align-items-center justify-content-between gap-2 mt-2 shadow-sm w-100">
		<div class="d-flex align-items-center gap-2 gap-sm-3">
			<h1 class="h6 mb-0 fw-bold text-primary">
			<a href="#"
			   class="text-decoration-none"
			   data-bs-toggle="modal"
			   data-bs-target="#woEmployeeModal">
				Work Order #${wo.WONo}
			</a>
			</h1>

			<p class="small text-muted mb-0 fw-semibold" style="font-size: 0.75rem;">
				${wo.EquipmentCode} | ${wo.Description || ""} | ${wo.TemplateWOPM || ""}
			</p>
		</div>
		<div class="d-flex align-items-center gap-2 gap-md-3">
			<button class="btn btn-sm btn-outline-secondary" onclick="backToList()">
                <i class="bi bi-arrow-left"></i>
			</button>
		</div>
	</div>`;
	document.getElementById("headDetailPage").innerHTML = headerHtml;
	// document.getElementById("headDetailPage").innerHTML = currentWO.HeaderHTML;
	
    // =========================
    // NAV TAB (DARI SECTION)
    // =========================
    let tabHtml = "";
    let dropdownHtml = "";
    let template = wo.TemplateJSON;
    tabHtml = `
        <a class="section-tab active" href="#sec_0" data-bs-toggle="tooltip" onclick="handleTabClick(event, this)" style="scroll-margin-top: 120px;" title="FIELD DOCUMENTATION BEFORE">
            FIELD DOCUMENTATION BEFORE
        </a>
    `;
    dropdownHtml = `
        <li>
            <a class="dropdown-item small py-2" href="#sec_0" onclick="handleTabClick(event, this)">
                FIELD DOCUMENTATION BEFORE
            </a>
        </li>
    `;

    template.sections.forEach((sec, i) => {

        //let active = i === 0 ? "active" : "";
        let active = "";
        tabHtml += `
            <a class="section-tab ${active}" href="#sec_${sec.idSection}" data-bs-toggle="tooltip" onclick="handleTabClick(event, this)" style="scroll-margin-top: 120px;" title="${sec.sectionName}">
                ${sec.sectionName}
            </a>
        `;

        dropdownHtml += `
            <li>
                <a class="dropdown-item small py-2" href="#sec_${sec.idSection}" onclick="handleTabClick(event, this)">
                    ${sec.sectionName}
                </a>
            </li>
        `;
    });
    const nextId = Math.max(...template.sections.map(sec => sec.idSection)) + 1;
    // tabHtml += `
    //     <a class="section-tab" href="#sec_${nextId}" data-bs-toggle="tooltip" onclick="handleTabClick(event, this)" style="scroll-margin-top: 120px;" title="FIELD DOCUMENTATION AFTER">
    //         FIELD DOCUMENTATION AFTER
    //     </a>
    //     <a class="section-tab" href="#sec_${nextId + 1}" data-bs-toggle="tooltip" onclick="handleTabClick(event, this)" style="scroll-margin-top: 120px;" title="FINAL INSPECTION SUMMARY">
    //         FINAL INSPECTION SUMMARY
    //     </a>
    // `;
    // dropdownHtml += `
    //     <li>
    //         <a class="dropdown-item small py-2" href="#sec_${nextId}" onclick="handleTabClick(event, this)">
    //             FIELD DOCUMENTATION AFTER
    //         </a>
    //     </li>
    //     <li>
    //         <a class="dropdown-item small py-2" href="#sec_${nextId + 1}" onclick="handleTabClick(event, this)">
    //             FINAL INSPECTION SUMMARY
    //         </a>
    //     </li>
    // `;


    let navHtml = `
	<div class="d-flex align-items-center gap-2 w-100">
		<!-- LEFT -->
		<div style="flex: 1 1 auto; min-width: 0;">
			<nav class="nav-fixed-tabs">
				<div class="horizontal-scroll">
					<div class="d-inline-flex">
						${tabHtml}
					</div>
				</div>
			</nav>
		</div>
		<!-- RIGHT -->
		<div style="flex: 0 0 auto; display: flex; align-items: center; height: 100%;">
			<div class="dropdown dropstart flex-shrink-0">
				<button id="btnDropdownSection"
						class="btn btn-outline-secondary rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center"
						data-bs-toggle="dropdown"
						style="width: 34px; height: 34px; margin-right: 8px;">
					<i class="bi bi-list text-primary"></i>
				</button>
				<ul class="dropdown-menu shadow border-0 mt-2">
					${dropdownHtml}
				</ul>
			</div>
		</div>
	</div>

	<!-- PROGRESS -->
	<div class="progress mt-2 w-100" style="height: 4px; z-index: 1; position: relative;">
		<div id="progressBar"
			 class="progress-bar bg-primary"
			 role="progressbar"
			 style="width: 0%">
		</div>
	</div>`;

    document.getElementById("headDetailPage1").innerHTML = navHtml;
	// document.getElementById("headDetailPage1").innerHTML = currentWO.Header1HTML;
    
    let employees = currentWO.EmployeeJSON;
    if (employees) {
    let empHTML = `
<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
<div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
<div class="modal-header border-0 bg-primary text-white py-3">
    <div>
        <h5 class="modal-title fw-bold mb-1">
            Assigned Employee
        </h5>
        <div class="small opacity-75">
            Work Order #${currentWO.WONo}
        </div>
    </div>
    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal">
    </button>
</div>
<div class="modal-body bg-light">
    `
    empHTML += employees.map(emp => 
   `
<div class='card border-0 shadow-sm rounded-4 mb-3'>
    <div class='card-body'>
        <div class='d-flex align-items-center mb-3'>
          <div class='me-3'> 
            <div class='rounded-circle bg-${emp.Color} text-white d-flex align-items-center justify-content-center fw-bold' style='width:50px;height:50px;'> 
              ${emp.Initial.toUpperCase()} 
            </div> 
          </div> 
          <div class='flex-grow-1'> 
            <div class='fw-bold fs-6'> ${emp.Name} </div> 
            <div class='small text-muted mb-1'> ${emp.EmployeeID} </div> 
            <span class='badge rounded-pill bg-${emp.Color}-subtle text-${emp.Color} px-3 py-2'> ${emp.SectionName} </span> 
          </div>
        </div>
    </div>
</div>`).join('');
    document.getElementById("woEmployeeModal").innerHTML = empHTML;

    }
	// document.getElementById("woEmployeeModal").innerHTML = currentWO.EmployeeHTML;
}
async function renderChecklist(template, isEntryMode) {
	
    let html = `
<div class="accordion-item border-secondary" id="section_0">
    <div class="accordion-header">
        <div class="accordion-button">
            <i class="bi bi-camera-fill me-2 text-secondary"></i>
            FIELD DOCUMENTATION BEFORE
        </div>
    </div>
    <!-- BODY (selalu tampil) -->
    <div class="accordion-body p-3" id="sec_0">
        <div class="row g-3">
            <div class="col-md-12">
                <div class="photo-upload" data-role="photo-before">
                    <div class="photo-list d-flex flex-wrap gap-2">
                        ${isEntryMode ? 
                        `` : 
                        `
                        <!-- Jika isEntryMode == false, lakukan looping dari array PhotoBefore -->
                        ${(currentWO.DataPhotoJSON?.PhotoBefore || []).map(photo => `
                            <div class="photo-item" data-id="${photo.SeqNo}">
                                <img src="${photo.imgSrc}">
                            </div>
                        `).join("")}
                        `}
                    </div>
                   <label class="upload-box">
                   <i class="bi bi-camera-plus"></i>
                   <span class="compact-label mb-0">BEFORE SERVICE</span>
                   ${isEntryMode ? 
                        `<span class="upload-hint">
                            Tap or drag image here
                        </span>
                        <input type="file" data-type="BEFORE" accept="image/*" hidden="" capture="environment">
                        ` : ""}
                   </label>
                </div>
            </div>
        </div>
    </div>
</div>
    `

    html += `<div class="accordion" id="workOrderAccordion">`;

    template.sections.forEach((section, sIndex) => {

        html += `
        <div class="accordion-item" id="section_${section.idSection}">
            <h2 class="accordion-header">
                <button class="accordion-button aria-expanded="true" ${sIndex === 0 ? "" : "collapsed"}" onclick="event.stopPropagation()"
                        data-bs-toggle="collapse" type="button"
                        data-bs-target="#sec_${section.idSection}">
                    ${section.sectionName}
                </button>
            </h2>

            <div id="sec_${section.idSection}" 
                 class="accordion-collapse collapse show ${sIndex === 0 ? "show" : ""}">
                <div class="accordion-body p-3">
                    <div class="row g-3">
        `;

		let V_Value = "";
		let V_Remark = "";
        let V_GroupValues = null;

        section.items.forEach(item => {
            if (currentWO.DataCheckListJSON) {
                let idItem = currentWO.DataCheckListJSON.Items?.find(x => x.IDItem === item.idItem);
                if (idItem) {
                    V_Value = idItem.Value ?? "";
                    V_Remark = idItem.Remark;
                    V_GroupValues = idItem.Values;
                }
            }
            // =========================
            // OPTION
            // =========================
            if (item.type === "OPTION") {

                let options = item.optionList
                    ? item.optionList.split(";")
                    : [];

                let radios = options.map((opt, i) => `
                    <input class="btn-check" data-role="option"
                           name="opt_${item.idItem}" 
                           id="opt_${item.idItem}_${i}" value="${opt.trim()}"
						   ${opt.trim() === V_Value ? "checked" : ""}
						   ${!isEntryMode ? "disabled" : ""}
                           type="radio">
                    <label class="btn btn-outline-primary" 
                           for="opt_${item.idItem}_${i}">
                        ${opt.trim()}
                    </label>
                `).join("");

                html += `
                <div class="col-12" data-item-id="${item.idItem}">
                    <label class="compact-label">${item.label}</label>

                    <div class="row g-2">
                        <div class="col-md-6">
                            <div class="btn-group w-100">${radios}</div>
                        </div>
                    </div>
                    <div class="row mt-1 g-1">
                        <div class="col-md-12">
                            <input class="form-control form-control-sm" data-role="remark"
                                   placeholder="Remark..." type="text" maxlength="500"
                                   value="${V_Remark}"
                                   ${!isEntryMode ? "disabled" : ""}/>
                        </div>
                    </div>

                </div>`;
            }

            // =========================
            // RANGE
            // =========================
            else if (item.type === "RANGE") {
                const rangeOptions = [
                    {
                        id: "1",
                        label: `&lt; ${item.min}`,
                        // value: item.min,
                        value: "1",
                        isChecked: Number(V_Value) < Number(item.min) && V_Value != ""
                    },
                    {
                        id: "2",
                        label: item.min === item.max ? `${item.min}` : `${item.min} - ${item.max}`,
                        //value: `${item.min}-${item.max}`, 
                        value: "2",
                        isChecked: Number(V_Value) >= Number(item.min) && Number(V_Value) <= Number(item.max) && V_Value != ""
                    },
                    {
                        id: "3",
                        label: `&gt; ${item.max}`,
                        //value: item.max,
                        value: "3",
                        isChecked: Number(V_Value) > Number(item.max) && V_Value != ""
                    }
                ];
                html += `
                <div class="col-12" data-item-id="${item.idItem}">
                    <label class="compact-label">${item.label}</label>
                    <div class="row g-2">
                        <div class="col-md-6 d-flex">
                            ${rangeOptions.map(opt => `
                                <input class="btn-check" 
                                       data-role="option"
                                       name="range_${item.idItem}" 
                                       id="range_${item.idItem}_${opt.id}" 
                                       value="${opt.value}"
                                       ${opt.isChecked ? "checked" : ""}
                                       ${!isEntryMode ? "disabled" : ""}
                                       type="radio">
                                <label class="btn btn-outline-primary flex-fill text-center" for="range_${item.idItem}_${opt.id}">
                                    <span>${opt.label}</span>
                                </label>
                            `).join("")}
                        </div>
                    </div>
                    <div class="row mt-1 g-2">
                        <div class="col-md-6">
                            <div class="input-group input-group-sm" style="width:30%;">
                                <input type="number" data-role="value" class="form-control form-control-sm" 
                                ${item.isValueRequired ? "required" : ""} value="${V_Value}"
                                ${!isEntryMode ? "disabled" : ""}/>
                                ${item.unit ? `<span class="input-group-text">${item.unit}</span>` : ""}
                            </div>
                        </div>
                    </div>
                    <div class="row mt-1 g-2">
                        <div class="col-md-12">
                            <input class="form-control form-control-sm" data-role="remark"
                                   placeholder="Remark..." type="text" value="${V_Remark}"
                                   ${!isEntryMode ? "disabled" : ""}/>
                        </div>
                    </div>
                </div>`;
            }

            // =========================
            // INPUT
            // =========================
            else if (item.type === "INPUT") {

                html += `
                <div class="col-12" data-item-id="${item.idItem}">
                    <label class="compact-label">${item.label}</label>

                    <div class="row g-2">
                        <div class="col-md-6">
                            <div class="input-group input-group-sm">
                                <input type="number" step="0.01" style="width:30%;" class="form-control form-control-sm" data-role="value"
                                ${!isEntryMode ? "disabled" : ""} value="${V_Value}"/>
                                ${item.unit ? `<span class="input-group-text">${item.unit}</span>` : ""}
                            </div>
                        </div>

                    </div>
                    <div class="row mt-1 g-2">
                        <div class="col-md-12">
                            <input class="form-control form-control-sm" data-role="remark"
                                   placeholder="Remark..." type="text" value="${V_Remark}"
                                   ${!isEntryMode ? "disabled" : ""}/>
                        </div>
                    </div>
                </div>`;
            }

            // =========================
            // GROUP
            // =========================
            else if (item.type === "GROUP") {

                let groupHtml = "";

                (item.groups || []).forEach(g => {

                    let fields = g.fieldList.split(";");

                    let inputs = fields.map(f => `
                        <div class="col-4">
                            <label class="d-block text-muted small fw-bold">${f}</label>
                            <input class="form-control form-control-sm text-center" type="number" data-role="value" data-field="${f}"
                            value="${V_GroupValues?.[f] ?? ''}" ${!isEntryMode ? "disabled" : ""}>
                        </div>
                    `).join("");

                    groupHtml += `
                    <div class="mb-2">
                        <label class="compact-label">${g.groupName} (${g.unit})</label>
                        <div class="row g-2 text-center">
                            ${inputs}
                        </div>
                    </div>`;
                });

                html += `
                <div class="col-12" data-item-id="${item.idItem}">
                    <label class="compact-label">${item.label}</label>
                    ${groupHtml}
                </div>`;
            }

        });

        html += `
                    </div>
                </div>
            </div>
        </div>`;
    });
    html += `</div>`;

    const nextId = Math.max(...template.sections.map(sec => sec.idSection)) + 1;

    html += `
<div class="accordion-item border-secondary" id="section_${nextId}">
    <!-- HEADER (non-clickable) -->
    <div class="accordion-header">
        <div class="accordion-button">
            <i class="bi bi-camera-fill me-2 text-secondary"></i>
            FIELD DOCUMENTATION AFTER
        </div>
    </div>
    <!-- BODY (selalu tampil) -->
    <div class="accordion-body p-3" id="sec_${nextId}">
        <div class="row g-3">
            <div class="col-md-12">
                <div class="photo-upload" data-role="photo-after">
                    <div class="photo-list d-flex flex-wrap gap-2">
                        ${isEntryMode ? 
                        `` : 
                        `
                        <!-- Jika isEntryMode == false, lakukan looping dari array PhotoBefore -->
                        ${(currentWO.DataPhotoJSON?.PhotoAfter || []).map(photo => `
                            <div class="photo-item" data-id="${photo.SeqNo}">
                                <img src="${photo.imgSrc}">
                            </div>
                        `).join("")}
                        `}
                    </div>
                    <label class="upload-box">
                        <i class="bi bi-camera-plus"></i>
                        <span class="compact-label mb-0">AFTER SERVICE</span>
                           ${isEntryMode ? 
                                `<span class="upload-hint">
                                    Tap or drag image here
                                </span>
                                <input type="file" data-type="AFTER" accept="image/*" hidden="" capture="environment">
                                ` : ""}
                    </label>
                </div>
            </div>
        </div>
    </div>
</div>`

let optionsFollowUp = ['No Follow Up','Recommend Follow Up'];
let radiosFollowUp = optionsFollowUp.map((opt, i) => `
    <input class="btn-check" data-role="followup"
           name="opt_followup" 
           id="opt_followup_${i}_${i}" value="${opt.trim()}"
           ${opt.trim().toUpperCase() === currentWO.DataCheckListJSON?.FollowUp?.toUpperCase() ? "checked" : ""}
           ${!isEntryMode ? "disabled" : ""}
           type="radio">
    <label class="btn btn-outline-primary" 
           for="opt_followup_${i}_${i}">
        ${opt.trim()}
    </label>
`).join("");

// html += `
// <div class="accordion-item" id="section_${nextId + 1}">
//     <div class="accordion-header">
//         <div class="accordion-button">
//             <i class="bi bi-clipboard-check-fill me-2"></i>
//             FOLLOW UP WORK ORDER RECOMMENDATION
//         </div>
//     </div>
//     <div class="accordion-body p-3" id="sec_${nextId + 1}">
//         <div class="row g-2">
//             <div class="col-12">
//                 <div class="col-md-6" data-role="followup">
//                     <div class="btn-group w-100">${radiosFollowUp}</div>
//                 </div>
//             </div>
//             <div id="followupDetailPanel" ${currentWO.DataCheckListJSON?.FollowUp === "Recommend Follow Up" ? "" : 'class="d-none"'} >
//             <div class="col-12" id="sec_${nextId + 1}_1">
//                 <label class="compact-label">Responsible Section</label>
//                 <div class="row mt-1 g-1">
//                     <div class="col-md-12 d-flex flex-wrap gap-2 justify-content-start" id="followupSectionGroup">

//                     </div>
//                 </div>
//             </div>
//             <div class="col-12 mt-2" id="sec_${nextId + 1}_2">
//                 <label class="compact-label">WO Remark</label>
//                 <div class="row mt-1 g-1">
//                     <div class="col-md-12">
//                         <input class="form-control form-control-sm" id="txtFollowupRemark"
//                                 placeholder="WO Remark.." type="text" 
//                                 maxlength="300" value="${currentWO.DataCheckListJSON?.FollowUpRemark ?? ''}" 
//                                 ${!isEntryMode ? "disabled" : ""}>
//                     </div>
//                 </div>
//             </div>
//             </div>
//         </div>
//     </div>
// </div>`;
html += `
<div class="accordion-item border-warning shadow-sm" id="section_${nextId + 1}">
    <div class="accordion-header">
        <div class="accordion-button bg-warning-subtle text-dark fw-bold">
            <i class="bi bi-lightbulb-fill fs-5 me-2 text-warning"></i>
            <div class="d-flex flex-column">
                <span>FOLLOW UP WORK ORDER RECOMMENDATION</span>
                <small class="text-muted fw-normal">
                    Tentukan apakah diperlukan Work Order lanjutan.
                </small>
            </div>
        </div>
    </div>

    <div class="accordion-body p-3">

        <div class="alert alert-warning py-2 px-3 mb-3 small">
            <i class="bi bi-info-circle-fill me-1"></i>
            Bila ditemukan kerusakan yang memerlukan pekerjaan lanjutan,
            pilih <strong>Recommend Follow Up</strong>, kemudian tentukan
            section yang bertanggung jawab dan isi WO Remark.
        </div>

        <div class="mb-3" data-role="followup">

            <div class="btn-group w-100 shadow-sm">
                ${radiosFollowUp}
            </div>

        </div>

        <div id="followupDetailPanel"
            class="${currentWO.DataCheckListJSON?.FollowUp === "Recommend Follow Up" ? "" : "d-none"}">

            <div class="card border-warning-subtle bg-light mb-3">

                <div class="card-body">

                    <label class="compact-label fw-semibold mb-2">
                        <i class="bi bi-diagram-3-fill me-1"></i>
                        Responsible Section
                    </label>

                    <div id="followupSectionGroup"
                         class="d-flex flex-wrap gap-2">
                    </div>

                </div>

            </div>

            <div class="card border-warning-subtle bg-light">

                <div class="card-body">

                    <label class="compact-label fw-semibold mb-2">
                        <i class="bi bi-card-text me-1"></i>
                        Follow Up Work Order Description
                    </label>

                    <textarea
                        id="txtFollowupRemark"
                        class="form-control"
                        rows="3"
                        maxlength="300"
                        placeholder="Jelaskan pekerjaan lanjutan yang direkomendasikan..."
                        ${!isEntryMode ? "disabled" : ""}>${currentWO.DataCheckListJSON?.FollowUpRemark ?? ""}</textarea>

                    <div class="d-flex justify-content-between align-items-center mt-2">

                        <small class="text-muted">
                            Maksimum 300 karakter.
                        </small>

                        <small
                            class="char-counter text-muted"
                            data-for="summary">
                            ${(currentWO.DataCheckListJSON?.FollowUpRemark ?? "").length} / 300
                        </small>

                    </div>
                </div>

            </div>

        </div>

    </div>

</div>`;

// html += `
// <div class="accordion-item" id="section_${nextId + 2}">
//     <div class="accordion-header">
//         <div class="accordion-button">
//             <i class="bi bi-clipboard-check-fill me-2"></i>
//             FINAL INSPECTION SUMMARY
//         </div>
//     </div>
//     <div class="accordion-body p-3" id="sec_${nextId + 2}">
//         <textarea class="form-control form-control-sm"
//                   data-role="summary" maxlength="500" ${!isEntryMode ? "disabled" : ""}
//                   placeholder="Enter detailed inspection notes..."
//                   rows="4">${currentWO.DataCheckListJSON?.Summary ?? ""}</textarea>
//     </div>
// </div>
// `;
html += `
<div class="accordion-item border-info shadow-sm" id="section_${nextId + 2}">

    <div class="accordion-header">

        <div class="accordion-button bg-info-subtle text-dark fw-bold">

            <i class="bi bi-clipboard2-check-fill fs-5 me-2 text-info"></i>

            <div class="d-flex flex-column">

                <span>FINAL INSPECTION SUMMARY</span>

                <small class="text-muted fw-normal">
                    Ringkasan hasil inspeksi dan pekerjaan yang telah dilakukan.
                </small>

            </div>

        </div>

    </div>

    <div class="accordion-body p-3">

        <div class="alert alert-info py-2 px-3 mb-3 small">

            <i class="bi bi-info-circle-fill me-1"></i>

            Jelaskan secara singkat hasil pemeriksaan, tindakan yang dilakukan,
            serta kondisi akhir unit setelah pekerjaan selesai.

        </div>

        <textarea
            class="form-control"
            data-role="summary"
            maxlength="500"
            rows="5"
            ${!isEntryMode ? "disabled" : ""}
            placeholder="${escapeHtmlAttribute(currentWO.SummarySampleText || "Contoh:\n• Filter AC dibersihkan\n• Tekanan refrigerant normal\n• Tidak ditemukan kebocoran\n• Unit beroperasi normal")}">${currentWO.DataCheckListJSON?.Summary ?? ""}</textarea>

        <div class="d-flex justify-content-between align-items-center mt-2">

            <small class="text-muted">
                Maksimum 500 karakter.
            </small>

            <small
                class="char-counter text-muted"
                data-for="summary">
                ${(currentWO.DataCheckListJSON?.Summary ?? "").length} / 500
            </small>

        </div>

    </div>

</div>
`;

// if (currentMode === "approval" && currentWO.IsSampling) {
//     html += `
// <div class="accordion-item border-secondary" id="section_${nextId + 3}">
//     <!-- HEADER (non-clickable) -->
//     <div class="accordion-header">
//         <div class="accordion-button">
//             <i class="bi bi-camera-fill me-2 text-secondary"></i>
//             RANDOM SAMPLING DOCUMENTATION
//         </div>
//     </div>
//     <!-- BODY (selalu tampil) -->
//     <div class="accordion-body p-3" id="sec_${nextId}">
//         <div class="row g-3">
//             <div class="col-md-12">
//                 <div class="photo-upload" data-role="photo-sampling">
//                     <div class="photo-list d-flex flex-wrap gap-2">
//                         ${!currentWO.IsCompleteDC ? 
//                         `` : 
//                         `
//                         ${(currentWO.DataPhotoJSON?.PhotoSampling || []).map(photo => `
//                             <div class="photo-item" data-id="${photo.SeqNo}">
//                                 <img src="${photo.imgSrc}">
//                             </div>
//                         `).join("")}
//                         `}
//                     </div>
//                     <label class="upload-box">
//                         <i class="bi bi-camera-plus"></i>
//                         <span class="compact-label mb-0">SAMPLING PHOTOS</span>
//                             ${!currentWO.IsCompleteDC ? 
//                             `<span class="upload-hint">
//                                 Tap or drag image here
//                             </span>
//                             <input type="file" data-type="SAMPLING" accept="image/*" hidden="" capture="environment">
//                             ` : ""}
//                     </label>
//                 </div>
//             </div>
//         </div>
//     </div>
// </div>`;
// }
if (currentMode === "approval" && currentWO.IsSampling) {
html += `
<div class="accordion-item border-primary shadow-sm" id="section_${nextId + 3}">

    <div class="accordion-header">
        <div class="accordion-button bg-primary-subtle text-dark fw-bold">

            <i class="bi bi-camera-fill fs-5 me-2 text-primary"></i>

            <div class="d-flex flex-column">

                <span>RANDOM SAMPLING DOCUMENTATION</span>

                <small class="text-muted fw-normal">
                    Supervisor wajib mengambil foto sebagai bukti verifikasi.
                </small>

            </div>

        </div>
    </div>

    <div class="accordion-body p-3">

        <div class="alert alert-primary py-2 px-3 mb-3 small">

            <i class="bi bi-info-circle-fill me-1"></i>

            Approval tidak dapat dilakukan sebelum minimal
            <strong>1 foto sampling</strong> diambil.

        </div>

        <div class="photo-upload decision-card sampling-card"
             data-role="photo-sampling">

            <div class="photo-list d-flex flex-wrap gap-2">

                ${!currentWO.IsCompleteDC ? `` :
                `
                ${(currentWO.DataPhotoJSON?.PhotoSampling || []).map(photo => `
                    <div class="photo-item" data-id="${photo.SeqNo}">
                        <img src="${photo.imgSrc}">
                    </div>
                `).join("")}
                `}

            </div>

            <label class="upload-box">

                <i class="bi bi-camera-plus fs-3"></i>

                <span class="compact-label fw-bold">
                    SAMPLING PHOTOS
                </span>

                ${!currentWO.IsCompleteDC ?
                `
                <span class="upload-hint">
                    Tap here to capture photo
                </span>

                <input
                    type="file"
                    data-type="SAMPLING"
                    accept="image/*"
                    capture="environment"
                    hidden>
                `
                : ""}

            </label>

        </div>

    </div>

</div>`;
}

if (currentMode === "approval") {
// html += `
// <div class="accordion-item" id="section_${nextId + 4}">
//     <div class="accordion-header">
//         <div class="accordion-button">
//             <i class="bi bi-clipboard-check-fill me-2"></i>
//             SUPERVISOR REMARK 
//         </div>
//     </div>
//     <div class="accordion-body p-3" id="sec_${nextId + 4}">
//         <textarea class="form-control form-control-sm"
//                   data-role="remarkspv" maxlength="500" ${currentMode === "entry" ? "disabled" : ""}
//                   placeholder="Enter detailed supervisor notes..."
//                   rows="4">${currentWO.DataCheckListJSON?.RemarkSPV ?? ""}</textarea>
//     </div>
// </div>
// `;
html += `
<div class="accordion-item border-success shadow-sm" id="section_${nextId + 4}">

    <div class="accordion-header">

        <div class="accordion-button bg-success-subtle text-dark fw-bold">

            <i class="bi bi-person-check-fill fs-5 me-2 text-success"></i>

            <div class="d-flex flex-column">

                <span>SUPERVISOR REMARK</span>

                <small class="text-muted fw-normal">

                    Catatan hasil review Supervisor.

                </small>

            </div>

        </div>

    </div>

    <div class="accordion-body p-3">

        <div class="alert alert-success py-2 px-3 mb-3 small">

            <i class="bi bi-chat-left-text-fill me-1"></i>

            Tuliskan hasil pemeriksaan, alasan Approval / Void,
            atau catatan penting lainnya.

        </div>

        <textarea

            class="form-control"

            data-role="remarkspv"

            maxlength="500"

            rows="5"

            placeholder="Supervisor Remark..."

            ${(currentMode === "entry" && currentWO.Status === "SYNCED") || (currentMode != "entry" && currentWO.StatusSPV === "SYNCED") ? "disabled" : ""}>${currentWO.DataCheckListJSON?.RemarkSPV ?? ""}</textarea>



        <div class="d-flex justify-content-between align-items-center mt-2">

            <small class="text-muted">
                Maksimum 500 karakter.
            </small>

            <small
                class="char-counter text-muted"
                data-for="summary">
                ${(currentWO.DataCheckListJSON?.RemarkSPV ?? "").length} / 500
            </small>

        </div>
    </div>

</div>
`;    
}

if (currentWO.ReasonVoid != "") {
    html += 
    `<div class="accordion-item mt-3">
        <div class="accordion-header">
            <div class="accordion-button bg-danger text-white">
                <i class="bi bi-x-circle-fill me-2"></i>
                REASON VOID
            </div>
        </div>
        <div class="accordion-body p-3">
            <textarea id="txtReasonVoid"
                class="form-control form-control-sm"
                disabled
                rows="4">${currentWO.ReasonVoid || ""}</textarea>
        </div>
    </div>`;
}

    document.getElementById("containerCheckList").innerHTML = html;
    renderFollowupSections(currentWO.DataCheckListJSON?.FollowUpSection ?? "");
    initFollowUpEvents();
    initCharCounters();

	// document.getElementById("containerCheckList").innerHTML = currentWO.CheckListHTML;
	// let containerReason = document.getElementById("voidReasonContainer");
	if (isEntryMode || (currentMode === "approval" && currentWO.IsSampling)) {
        await initPhotoSection();
		// let checklist = await getChecklistByWO(currentWO.KeyHD);
		// if (checklist) {
		// 	populateChecklist(currentTemplate, checklist);
		// }
        disableEnableEntryMode();

		// document.querySelectorAll(`input,textarea,select,button.btn-delete`)
		// 	.forEach(el => {
		// 		// skip OK button nanti
		// 		if (el.id === "btnOK")
		// 			return;
		// 		if (el.tagName === "TEXTAREA") {
		// 			el.readOnly = true;
		// 		}
		// 		else {
		// 			el.disabled = true;
		// 		}
		// 	});
		// =====================================
		// DISABLE PHOTO UPLOAD
		// =====================================

		// document
		// 	.querySelectorAll(".upload-box")
		// 	.forEach(box => {
		// 		box.classList.add("upload-box-readonly");
		// 		box.style.pointerEvents = "none";
		// 	});
		// =====================================
		// REMOVE DELETE BUTTON
		// =====================================
		// document.querySelectorAll(".btn-delete")
		// 	.forEach(btn => {
		// 		btn.remove();
		// 	});
		// =====================================
		// HIDE BUTTONS
		// =====================================
		// let btnAction1 = document.getElementById("btnAction1");
		// let btnAction2 = document.getElementById("btnAction2");
		// btnAction1?.classList.add("d-none");
		// btnAction2?.classList.add("d-none");
		// =====================================
		// CREATE OK BUTTON
		// =====================================
		// let footer = btnAction2?.parentElement;
		// if (footer && !document.getElementById("btnOK")) {
		// 	let btnOK =
		// 		document.createElement(
		// 			"button"
		// 		);
		// 	// copy class dari btnAction2
		// 	btnOK.className =
		// 		btnAction2.className;
		// 	btnOK.classList.remove("d-none");
		// 	btnOK.id = "btnOK";
		// 	btnOK.innerHTML = `
		// 		<i class="bi bi-check-circle me-1"></i>
		// 		OK
		// 	`;
		// 	btnOK.addEventListener(
		// 		"click",
		// 		() => {
		// 			backToList();
		// 		}
		// 	);

		// 	footer.appendChild(btnOK);
		// }
		// if (currentWO.ReasonVoid == "") {
		// 	containerReason?.classList.add("d-none");
		// }
		
	} else {
        document.getElementById("btnDeletePreview").classList.add("d-none");
        document.querySelectorAll(".photo-list img")
            .forEach(img => {
                let wrapper = img.closest(".photo-item");
                img.onclick = function () {
                    openPreview(img, wrapper.dataset.id, wrapper);
                };
            }); 
        renderAction();
    }

}
function renderFollowupSections(selectedCode = null) {

    const container =
        document.getElementById("followupSectionGroup");

    container.innerHTML = "";

    sectionFollowUp.forEach(section => {

        const input =
            document.createElement("input");

        input.type = "radio";
        input.className = "btn-check";
        input.name = "followupSection";
        input.id = "sec_" + section.Code;
        input.value = section.Code;
        input.autocomplete = "off";
        input.disabled = (currentMode === "approval");

        if (section.Code === selectedCode)
            input.checked = true;

        const label =
            document.createElement("label");

        label.className =
            "btn btn-outline-primary rounded-3 followup-section-btn";

        label.htmlFor = input.id;

        label.innerHTML = `
            <i class="${section.Icon} fs-5 d-block mb-1"></i>
            <div class="fw-semibold">${section.Code}</div>
            <small class="text-muted">${section.Name}</small>
        `;

        container.appendChild(input);
        container.appendChild(label);

    });

}
function handleTabClick(e, el) {
    e.preventDefault();

    const target = document.querySelector(el.getAttribute("href"));
    if (!target) return;

   document.querySelectorAll(".dropdown-item").forEach(item => {
        item.classList.remove("active");
    });
    el.classList.add("active");

    const header1 = document.getElementById("headDetailPage");
    const header2 = document.getElementById("headDetailPage1");

    const mainNav = document.getElementById("masterHeader");

    const headerHeight =
        (mainNav?.offsetHeight || 0) +
        (header1?.offsetHeight || 0) +
        (header2?.offsetHeight || 0);

    const y = target.getBoundingClientRect().top + window.pageYOffset - headerHeight + 50;

    window.scrollTo({
        top: y,
        behavior: "smooth"
    });

    // ⏳ delay supaya scroll settle dulu
    setTimeout(() => {
        document.querySelectorAll(".section-tab")
            .forEach(t => t.classList.remove("active"));

        el.classList.add("active");
    }, 200);
}
window.addEventListener("scroll", () => {
    const sections = document.querySelectorAll("[id^='section']");
    const tabs = document.querySelectorAll(".section-tab");

    let current = null;

    sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        // console.log(sec.id, rect.top, rect.top <= 182);
        if (rect.top <= 182) {
            current = sec.id.replace("section","sec");
        }
    });
    // console.log("current =", current);

    if (current) {
        tabs.forEach(tab => {
            tab.classList.toggle(
                "active",
                tab.getAttribute("href") === `#${current}`
            );
        });
    }
});
function calculateProgress(template) {
    let total = 0;
    let validCount = 0;

    template.sections.forEach(sec => {
        sec.items.forEach(item => {
            total++;

            let container = document.querySelector(`[data-item-id='${item.idItem}']`);
            if (!container) return;

            let error = validateItem(item, container);

            if (!error) {
                validCount++;
            }
        });
    });

    let percent = total === 0 ? 0 : Math.round((validCount / total) * 100);

    updateProgressBar(percent);

    return percent;
}
function updateProgressBar(percent) {
    let bar = document.querySelector(".progress-bar");

    bar.style.width = percent + "%";
    bar.setAttribute("aria-valuenow", percent);

    bar.classList.remove("bg-danger", "bg-warning", "bg-success");

    if (percent < 50) {
        bar.classList.add("bg-danger");
    } else if (percent < 100) {
        bar.classList.add("bg-warning");
    } else {
        bar.classList.add("bg-success");
    }
}

document.addEventListener("change", async function (e) {
    let container = null;
    if (e.target.type === "file") {
        let input = e.target;
        let files = Array.from(e.target.files);
        if (!files.length) return;

        let type = input.dataset.type; // BEFORE / AFTER
        container = input.closest("[data-role^='photo-']");
        let existingCount = container.querySelectorAll(".photo-item").length;

        for (let file of files) {

            if (existingCount > MAX_FILES) {
                showToast("Maksimal " + MAX_FILES.toString() + " foto");
                break; // stop proses sisa file
            }

            input.disabled = (existingCount >= MAX_FILES);
 

            // ========================
            // VALIDASI TYPE
            // ========================
            if (!file.type.startsWith("image/")) {
                showToast("File harus berupa gambar");
                break;
            }

            try {
                // ========================
                // COMPRESS
                // ========================
                let blob = await compressImage(file);
                             
                let originalName = file.name;
                let lastDotIndex = originalName.lastIndexOf(".");
                if (lastDotIndex !== -1) {
                    let nameWithoutExt = originalName.substring(0, lastDotIndex); 
                    let ext = originalName.substring(lastDotIndex);
                    let cleanName = nameWithoutExt.replace(/\./g, "_");
                    originalName = cleanName + ext;
                }

                // ========================
                // SAVE (IMPORTANT: tunggu selesai)
                // ========================
                let id = await savePhoto(
                    currentWO.KeyHD,
                    type,
                    blob,
                    originalName
                );

                // ========================
                // RENDER UI
                // ========================
                await addPhotoToUI(blob, container, id);
                disableEnableEntryMode();

            } catch (err) {
                console.error(err);
                showToast("Gagal proses foto");
            }
        }

        // ========================
        // RESET INPUT (biar bisa upload file sama lagi)
        // ========================
        input.value = "";
    }

    if (e.target.type === "radio") {

        if (e.target.dataset.role !== "followup") {
            container = e.target.closest("[data-item-id]");
            if (!container) return;

            let item = findItemById(container.dataset.itemId);

            let error = validateItem(item, container);
            applyValidationUI(container, error, item.type === "OPTION" || item.type === "GROUP");

            updateProgressBar(calculateProgress(currentTemplate));
        }
        else {
            const needFollowup = (e.target.value.toUpperCase() === "RECOMMEND FOLLOW UP");

            document
                .getElementById("followupDetailPanel")
                .classList.toggle("d-none", !needFollowup);

            if (!needFollowup) {

                document
                    .querySelectorAll('input[name="followupSection"]')
                    .forEach(r => r.checked = false);

                document
                    .getElementById("txtFollowupRemark")
                    .value = "";
            }

        }


    }

});

function findItemById(idItem) {

    return currentTemplate.sections
        .flatMap(s => s.items)
        .find(i => i.idItem == idItem);
}
document.addEventListener("input", function (e) {

    // 🔥 hanya proses input checklist
    if (!e.target.matches("[data-role='value'], [data-role='remark']")) return;

    let container = e.target.closest("[data-item-id]");
    if (!container) return;

    let itemId = container.dataset.itemId;
    let item = findItemById(itemId);

    let error = validateItem(item, container);
    applyValidationUI(container, error, item.type === "OPTION" || item.type === "GROUP");

    updateProgressBar(calculateProgress(currentTemplate));
});
function removeWOFromList(keyHD) {
    let el = document.querySelector(`[data-wo-id='${keyHD}']`);
    if (!el) return;

    el.style.transition = "all 0.3s ease";
    el.style.opacity = "0";
    el.style.transform = "translateX(-20px)";

    setTimeout(() => {
        el.remove();
    }, 300);
}
async function confirmSaveDone(t) {
    let ok = await showConfirmation({
        title: "Konfirmasi",
        message: (t === 1 ? "Save" : "Done") + " Work Order ini?"
    });

    if (!ok) return;

    isSaveDone = (t === 2);
    const result = validateChecklist();
    if (!result.valid) {
        showToast('Masih ada data yang belum valid / belum diisi.');
        let target = result.firstErrorElement;

        target.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        setTimeout(() => {
            target.querySelector(".is-invalid")?.focus();
        }, 350);

        return;
    }

    let buttons = document.querySelectorAll(".wo-action-btn");
    buttons.forEach(btn => btn.disabled = true);

    try {
		if (t === 1) {
			await onSaveDraft();
		}
        else {
			await onDone();
            //backToList();
		}
    } finally {
        buttons.forEach(btn => btn.disabled = false);
        clearValidationUI();
        initWorkOrderPage();
   }
}
function getHeaderOffset() {


    let selectors = [
        "#masterHeader",        // 🔥 dari masterpage
        "#headDetailPage",    // lokal
        "#headDetailPage1"    // lokal
    ];

    let total = 0;

    selectors.forEach(sel => {
        let el = document.querySelector(sel);
        if (el) total += el.offsetHeight;
    });

    return total;
}
// ------------------------------------------

// ------------------------------------------
// fungsi2 data
async function initApprovalWO(status) {
    let transaction = db.transaction("workorder", "readonly");
    let store = transaction.objectStore("workorder");
    return new Promise((resolve, reject) => {
        let request = store.getAll();
    request.onsuccess = async function () {
        const localStores = request.result || [];

        showLoading();
        var data=getLoginData();
        const result = await promisifyPageMethod(PageMethods.getWorkOrders, data.curcompany, 
                                                                            data.section, 
                                                                            "", 
                                                                            (currentMode === "approval"),
                                                                            status, 0, {'IsSPV': false, 'IsWO': false});
        allWorkOrders = result.data || [];

        const remoteKeyhdSet = new Set(allWorkOrders.map(wo => wo.KeyHD));

        // 2. LOGIKA 1: Jika status "PENDING" -> Hapus dari allWorkOrders jika memenuhi syarat
        if (status === "PENDING") {
            // Buat Set berisi keyhd dari localStore yang memiliki ActionSPV tidak kosong
            const localPendingSet = new Set(
            localStores
              .filter(store => store.StatusSPV && store.StatusSPV !== "")
              .map(store => store.KeyHD)
            );

            // Filter allWorkOrders: buang yang keyhd-nya ada di localPendingSet
            allWorkOrders = allWorkOrders.filter(wo => !localPendingSet.has(wo.KeyHD));
            updateApprovalTabCounters();
        }

        // 3. LOGIKA 2 & 3: Jika status "APPROVED" atau "VOID" -> Tambah record dari store jika memenuhi syarat
        else if (status === "APPROVED" || status === "VOID") {
            localStores.forEach(store => {
            // Cek apakah ActionSPV sesuai dengan status saat ini AND keyhd TIDAK terdaftar di allWorkOrders
            if (store.ActionSPV === status && !remoteKeyhdSet.has(store.KeyHD)) {
              allWorkOrders.push(store); // Tambahkan record store ke allWorkOrders
              remoteKeyhdSet.add(store.KeyHD); // Update set agar tidak terjadi duplikasi jika ada data ganda
            }
            });
        }

        filteredWO = allWorkOrders;
        //defaultTab = document.querySelector('.tab-btn[data-status="${status}"]');
        defaultTab = document.querySelector('.tab-btn.active');

        //filterTab(defaultTab);
        hideLoading();

        resolve(request.result);
        };
    request.onerror = function () {
        reject(request.error);
        };
    });

}
async function initWorkOrderPage() {
    // if (!db) {
        // console.warn("DB not ready");
        // return [];
    // }
    let tx = db.transaction("workorder","readonly");
    let store = tx.objectStore("workorder");

    return new Promise((resolve, reject) => {
        let request = store.getAll();
    request.onsuccess = function () {
        allWorkOrders = request.result;
        updateTabCounters();
        defaultTab =
            document.querySelector('.tab-btn[data-status="PENDING"]');
        filterTab(defaultTab);
        resolve(request.result);
		};
    request.onerror = function () {
        reject(request.error);
		};
	});
}
async function openWO(keyHD, el) {
    startTime = new Date().toISOString();
    let isSampling = el.dataset.issampling;
    let wo = await new Promise((resolve, reject) => {
        let tx = db.transaction("workorder", "readonly");
        let store = tx.objectStore("workorder");
        let request = store.get(Number(keyHD));
        request.onsuccess = function () {
            resolve(request.result);
        };
        request.onerror = function (e) {
            reject(e.target.error);
        };
    });
    if (!wo && currentMode === "approval" && 
        defaultTab.dataset.status === "PENDING" && isSampling === "YES") {
        showToast("WO# " + el.dataset.wono + " not found, please sync the data...");
        //console.error("WO tidak ditemukan:", keyHD);
        return;
    }       

	if (wo && (currentMode === "entry" || (currentMode === "approval" && isSampling === "YES"))) 
    {
    	currentWO = wo;
        if (!currentWO.DataCheckListJSON)
            currentWO.DataCheckListJSON = await getChecklistByWO(currentWO.KeyHD);
    	let template = await getTemplate(currentWO.TemplateWOPM, currentWO.ModelCode);
        currentWO.TemplateJSON = template;
    	// if (!template) {
    	// 	console.error(
    	// 		"Template not found:",
    	// 		wo.TemplateWOPM
    	// 	);
    	// 	return;
    	// }	
        //let template = currentWO.TemplateJSON[0];
    	itemMap = {};
    	template.sections.forEach(sec => {
    		sec.items.forEach(item => {
    			itemMap[item.idItem] = item;
    		});
    	});
    	currentTemplate = template;	
	}
	else {
        showLoading();
        var data=getLoginData();
        wo = allWorkOrders.find(x => x.KeyHD == keyHD);
        const result = await promisifyPageMethod(
            PageMethods.getWorkOrders, data.curcompany, data.section, "", true, "", wo.KeyHD, {'IsSPV': false, 'IsWO': false }
        );  
        if (result) {
            currentTemplate = result.data[0].TemplateJSON;  
            currentWO =  result.data[0];
        }
		hideLoading();
	}
	
	renderHeaderWO(currentWO);
	await renderChecklist(currentTemplate, (currentMode === "entry"));
	document.getElementById("woListPage").classList.add("page-hidden");
	//document.getElementById("headListPage").style.setProperty("display", "none", "important");
	document.getElementById("headListPage").classList.add("page-hidden");
	document.getElementById("woDetailPage").classList.remove("page-hidden");
	document.getElementById("headDetailPage").classList.remove("page-hidden");
	document.getElementById("headDetailPage1").classList.remove("page-hidden");
	document.getElementById("scrollTools").style.display = "block";
	//document.getElementById("woListPage").style.pointerEvents = "none";
	setTimeout(function() {
		let firstSection = document.querySelector(".accordion-item");

		if (firstSection) {
			let headerHeight = getHeaderOffset(); // kamu sudah punya ini

			let y = firstSection.getBoundingClientRect().top 
				  + window.pageYOffset 
				  - headerHeight 
				  - 10;

			window.scrollTo({
				top: y,
				behavior: "smooth"
			});
		}
		document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
				new bootstrap.Popover(el, {
					container: 'body'
				});
			});
		// setWOHeaderPosition();
	}, 100);
	
}
async function getChecklistByWO(keyHD) {
    return new Promise((resolve, reject) => {
        let tx =
            db.transaction("wo_checklist", "readonly");
        let store =
            tx.objectStore("wo_checklist");
        let req = store.get(keyHD);
        req.onsuccess = function () {
            resolve(req.result || null);
        };
        req.onerror = function () {
            reject(req.error);
        };
    });
}
// function populateChecklist(template, data) {

//     if (!data) return;
	
//     data.Items.forEach(saved => {

//         let container = document.querySelector(
//             `[data-item-id='${saved.IDItem}']`
//         );

//         if (!container) return;
		
//         switch (saved.Type) {

//             // =====================
//             // OPTION
//             // =====================
//             case "OPTION":

//                 let radio = container.querySelector(
//                     `input[value='${saved.Value}']`
//                 );

//                 if (radio) {
//                     radio.checked = true;
//                 }

//                 break;

//             // =====================
//             // RANGE / NUMERIC
//             // =====================
//             case "RANGE":
//             case "INPUT":

//                 let valueEl =
//                     container.querySelector("[data-role='value']");

//                 if (valueEl) {
//                     valueEl.value = saved.Value ?? "";
//                 }

//                 break;

//             // =====================
//             // GROUP
//             // =====================
//             case "GROUP":

//                 if (saved.Values) {

//                     Object.keys(saved.Values).forEach(key => {

//                         let input = container.querySelector(
//                             `[data-field='${key}']`
//                         );

//                         if (input) {
//                             input.value = saved.Values[key] ?? "";
//                         }

//                     });

//                 }

//                 break;
//         }

//         // =====================
//         // REMARK
//         // =====================

//         let remarkEl =
//             container.querySelector("[data-role='remark']");

//         if (remarkEl) {
//             remarkEl.value = saved.Remark || "";
//         }
		
//     });
	
//     // =====================
//     // SUMMARY
//     // =====================

//     let summary =
//         document.querySelector("[data-role='summary']");

//     if (summary) {
//         summary.value = data.Summary || "";
//     }
// }
async function getTemplate(templateNo, modelCode) {
    return new Promise((resolve, reject) => {
        let tx = db.transaction("checklist_templates", "readonly");
        let store = tx.objectStore("checklist_templates");
        let req = store.get(templateNo);
        req.onsuccess = () => {
            if (!req.result) {
                reject("Template not found");
                return;
            }
            const template = req.result;
            // ==============================
            // FILTER ITEM BY MODEL CODE
            // ==============================
            const filteredTemplate = {
                ...template,
                sections: (template.sections || [])
                    .map(section => {
                        const filteredItems =
                            (section.items || []).filter(item => {
                                const itemModelCode =
                                    (item.modelcode || "").trim();
                                const currentModelCode =
                                    (modelCode || "").trim();
                                return (
                                    itemModelCode === "" ||
                                    itemModelCode === currentModelCode
                                );
                            }).map(item => ({
                                ...item,
                                remarkRequiredOptions: Array.isArray(item.remarkRequiredOptions)
                                    ? item.remarkRequiredOptions.map(String)
                                    : Array.isArray(item.RemarkRequiredOptions)
                                        ? item.RemarkRequiredOptions.map(String)
                                        : []
                            }));
                        return {
                            ...section,
                            items: filteredItems
                        };
                    })
                    // buang section yang sudah tidak punya item
                    .filter(section =>
                        section.items &&
                        section.items.length > 0
                    )
            };
            resolve(filteredTemplate);
        };
        req.onerror = () => {
            reject("DB error");
        };
    });
}
// function getTemplate(templateNo) {
//     return new Promise((resolve, reject) => {

//         let tx = db.transaction("checklist_templates", "readonly");
//         let store = tx.objectStore("checklist_templates");

//         let req = store.get(templateNo);

//         req.onsuccess = () => {
//             if (req.result) {
//                 resolve(req.result);
//             } else {
//                 reject("Template not found");
//             }
//         };

//         req.onerror = () => reject("DB error");
//     });
// }
function collectData(template, wo) {
    let checkedFollowUp =
        document.querySelector(
            "[data-role='followup'] input[data-role='followup']:checked"
        )?.value || "";
    let data = {
        KeyHD: wo.KeyHD,
        Items: [],
        Summary:
            document.querySelector("[data-role='summary']")?.value || "",
        FollowUp: checkedFollowUp,
        FollowUpSection:
            document.querySelector(
                'input[name="followupSection"]:checked'
            )?.value ?? "",
        FollowUpRemark:
            document.querySelector('#txtFollowupRemark')?.value || "",
        Photos: {},
        Status: "",
        UpdatedAt: null
    };
    template.sections.forEach(sec => {
        sec.items.forEach(item => {
            let container =
                document.querySelector(
                    `[data-item-id='${item.idItem}']`
                );
            if (!container)
                return;
            let obj = {
                IDItem: item.idItem,
                Type: item.type,
                Value: null,
                Values: null,
                Remark:
                    container.querySelector(
                        "[data-role='remark']"
                    )?.value || "",
                // =====================================
                // ANOMALI
                // =====================================
                IsAnomali: false
            };
            switch (item.type) {
                // =====================================
                // OPTION
                // =====================================
                case "OPTION":
                    let checked =
                        container.querySelector(
                            "input[data-role='option']:checked"
                        );
                    obj.Value =
                        checked ? checked.value : null;
                    break;
                // =====================================
                // RANGE / INPUT
                // =====================================
                case "RANGE":
                case "INPUT":
                    let val =
                        container.querySelector(
                            "[data-role='value']"
                        )?.value;
                    obj.Value =
                        val !== ""
                            ? parseFloat(val)
                            : null;
                    // =====================================
                    // CHECK ANOMALI
                    // =====================================
                    const useTolerance =
                        item.isToleranceRequired === true ||
                        item.isToleranceRequired === 1 ||
                        item.isToleranceRequired === "1" ||
                        item.isToleranceRequired === "true";
                    if (
                        useTolerance &&
                        obj.Value !== null &&
                        !isNaN(obj.Value)
                    ) {
                        let minTolerance =
                            parseFloat(item.mintol);
                        let maxTolerance =
                            parseFloat(item.maxtol);
                        if (
                            !isNaN(minTolerance) &&
                            !isNaN(maxTolerance)
                        ) {
                            let lowerLimit;
                            let upperLimit;
                            if (item.type === "RANGE") {
                                // RANGE:
                                // MinValue - MinTolerance
                                // MaxValue + MaxTolerance
                                let minValue =
                                    parseFloat(item.min);
                                let maxValue =
                                    parseFloat(item.max);
                                if (
                                    !isNaN(minValue) &&
                                    !isNaN(maxValue)
                                ) {
                                    lowerLimit =
                                        minValue - minTolerance;
                                    upperLimit =
                                        maxValue + maxTolerance;
                                }
                            }
                            else if (item.type === "INPUT") {
                                // INPUT:
                                // tolerance menjadi batas langsung
                                lowerLimit =
                                    minTolerance;
                                upperLimit =
                                    maxTolerance;
                            }
                            if (
                                lowerLimit !== undefined &&
                                upperLimit !== undefined
                            ) {
                                if (
                                    obj.Value <= lowerLimit ||
                                    obj.Value >= upperLimit
                                ) {
                                    obj.IsAnomali = true;
                                }
                            }
                        }
                    }
                    break;
                // =====================================
                // GROUP
                // =====================================
                case "GROUP":
                    let values = {};
                    let inputs =
                        container.querySelectorAll(
                            "[data-role='value']"
                        );
                    inputs.forEach(input => {
                        let key = input.dataset.field;
                        values[key] =
                            input.value
                                ? parseFloat(input.value)
                                : null;
                    });
                    obj.Values = values;
                    break;
            }
            data.Items.push(obj);
        });
    });
    // ========================
    // PHOTOS
    // ========================
    let beforeContainer =
        document.querySelector(
            "[data-role='photo-before']"
        )?.closest(".photo-upload");
    let afterContainer =
        document.querySelector(
            "[data-role='photo-after']"
        )?.closest(".photo-upload");
    data.Photos.Before =
        beforeContainer?.dataset.file || null;
    data.Photos.After =
        afterContainer?.dataset.file || null;
    return data;
}
function collectDataSpv(template, wo) {
    let data = {
        KeyHD: wo.KeyHD,
        Photos: {},
        RemarkSPV: "",
        ActionSPV: ""
    };
    let samplingContainer = document.querySelector("[data-role='photo-sampling']")?.closest(".photo-upload");
    data.Photos.Sampling = samplingContainer?.dataset.file || null;
    return data;
}

async function saveToIndexedDB(payload) {
    return new Promise((resolve, reject) => {
        let tx = db.transaction(["wo_checklist","workorder"], "readwrite");
        let woStore =
            tx.objectStore("workorder");
        let checklistStore =
            tx.objectStore("wo_checklist");
        // =========================
        // GET EXISTING
        // =========================
        let getReq =
            checklistStore.get(payload.KeyHD);
        getReq.onsuccess = function () {
            let existing = getReq.result || {};
            // =====================
            // BUILD DATA
            // =====================
            let data = {
                KeyHD: payload.KeyHD,
                Items: payload.Items,
                Summary: payload.Summary,
                FollowUp: payload.FollowUp,
                FollowUpSection: payload.FollowUpSection,
                FollowUpRemark: payload.FollowUpRemark,
                StartTime: (existing ? existing.StartTime ?? startTime : startTime),
                EndTime: (payload.Status === "DONE" ? new Date().toISOString() : "")
            };
            checklistStore.put(data);
			let getReq1 = woStore.get(payload.KeyHD);
			getReq1.onsuccess = function () {
				let dataWO = getReq1.result;
				dataWO.Status = payload.Status;
                dataWO.DataCheckListJSON = data;
				woStore.put(dataWO);
			};
			getReq1.onerror = (e) => reject(e);
        };

        getReq.onerror =
            (e) => reject(e);

        tx.oncomplete =
            () => resolve(true);

        tx.onerror =
            (e) => reject(e);
    });
}
async function onDone() {

	valid = await validateExtra();
    if (!valid) {
        return;
    }

    let payload = collectData(currentTemplate, currentWO);

    payload.Status = "DONE";
    payload.UpdatedAt = new Date().toISOString();

    try {
        // 1. save detail
        await saveToIndexedDB(payload);

        // 2. update WO status
        await updateWOStatusAsync(currentWO.KeyHD, "DONE");

        // 3. UI update
        //removeWOFromList(currentWO.KeyHD);
		await initWorkOrderPage();
        backToList();

        showToast("WO Done");

    } catch (err) {
        console.error(err);
        showToast("Gagal simpan ❌");
    }
}
async function onSaveDraft() {

    let payload = collectData(currentTemplate, currentWO);

    payload.Status = "DRAFT";
    payload.UpdatedAt = new Date().toISOString();

    try {
        await saveToIndexedDB(payload);
        showToast("Draft saved 👍");
    } catch (err) {
        console.error(err);
        showToast("Gagal simpan draft ❌");
    }
}
function updateWOStatusAsync(keyHD, status) {
    return new Promise((resolve, reject) => {

        let tx = db.transaction("workorder", "readwrite");
        let store = tx.objectStore("workorder");

        let req = store.get(keyHD);

        req.onsuccess = function () {
            let wo = req.result;
            if (!wo) return reject("WO not found");

            wo.Status = status;

            let updateReq = store.put(wo);

            updateReq.onsuccess = () => resolve(true);
            updateReq.onerror = (e) => reject(e.target.error);
        };

        req.onerror = (e) => reject(e.target.error);
    });
}
// ------------------------------------------

// ------------------------------------------
// fungsi2 validasi data
// ------------------------------------------
function validateChecklist() {
    let allValid = true;
    let firstErrorElement = null;
    clearValidationUI();

    document.querySelectorAll("[data-item-id]").forEach(container => {

        let item = itemMap[container.dataset.itemId];
		if (!item) {
			console.warn("Item not found",container.dataset.itemId);
			return;
		}
		
        let error = validateItem(item, container);

        let valueEl = container.querySelector("[data-role='value']");
        let remarkEl = container.querySelector("[data-role='remark']");

        // reset dulu
        valueEl?.classList.remove("is-invalid");
        remarkEl?.classList.remove("is-invalid");

		// 🔥 hanya cek kalau belum ada error
		if (error) {

			allValid = false;
            applyValidationUI(container, error);
            if (!firstErrorElement)
                firstErrorElement = container;

            if (error === "Remark required" ||
                error === "Remark maximum 500 characters") {

                remarkEl?.classList.add("is-invalid");
            }
            else if (item.type !== "OPTION") {

                valueEl?.classList.add("is-invalid");
            }

		}

    });

    return {
        valid: allValid,
        firstErrorElement
    };
}
function validateItem(item, container) {

    let valueEl =
        container.querySelector("[data-role='value']");

    let remarkEl =
        container.querySelector("[data-role='remark']");

    let error = null;
    let checked = null;
    let num = null;
    let val = null;

    switch (item.type) {

        // =========================
        // OPTION
        // =========================
        case "OPTION":

            checked =
                container.querySelector(
                    "input[type=radio]:checked"
                );

            if (!checked && item.isValueRequired && isSaveDone) {
                error = "Required";
            }

            break;

        // =========================
        // RANGE / INPUT
        // =========================
        case "RANGE":

            checked =
                container.querySelector(
                    "input[type=radio]:checked"
                );

            val = valueEl?.value?.trim();

            if (item.isValueRequired && isSaveDone) {

                if (!checked) {
                    error = "Range required";
                    break;
                }

                if (val === "") {
                    error = "Required";
                    break;
                }
            }

            if (val === "")
                break;

            num = parseFloat(val);

            if (isNaN(num)) {
                error = "Invalid";
                break;
            }

            let selected = checked?.value;

            if (selected == null)
                break;

            if (selected == "1" && num >= item.min)
                error = "Range mismatch (must < " + item.min + ")";

            if (selected == "2"
                && (num < item.min || num > item.max))
                error = "Range mismatch (must between " + item.min + " and " + item.max + ")"

            if (selected == "3" && num <= item.max)
                error = "Range mismatch (must > " + item.max + ")"

            break;


        case "INPUT":

            val = valueEl?.value?.trim();

            // kosong
            if (val === "") {

                // kalau required
                if (item.isValueRequired && isSaveDone) {
                    error = "Required";
                }

                // 🔥 kosong = stop validasi
                break;
            }

            num = parseFloat(val);

            if (isNaN(num)) {
                error = "Invalid";
                break;
            }

            if (item.min != null && num < item.min) {
                error = `< ${item.min}`;
                break;
            }

            if (item.max != null && num > item.max) {
                error = `> ${item.max}`;
                break;
            }

            break;

        // =========================
        // GROUP
        // =========================
        case "GROUP":

            let inputs =
                container.querySelectorAll(
                    "input[data-role='value']"
                );

            let allFilled = true;

            inputs.forEach(i => {

                if (i.value.trim() === "") {
                    allFilled = false;
                }

            });

            if (item.isValueRequired && !allFilled && isSaveDone) {
                error = "Incomplete";
            }

            break;
    }

    // =====================================
    // REMARK REQUIRED
    // =====================================
    const requiredOptionRemarks = Array.isArray(item.remarkRequiredOptions)
        ? item.remarkRequiredOptions
        : Array.isArray(item.RemarkRequiredOptions)
            ? item.RemarkRequiredOptions
            : [];
    const selectedOptionRequiresRemark = item.type === "OPTION" && !!checked &&
        requiredOptionRemarks.map(String).includes(String(checked.value));

    if (!error && (item.isRemarkRequired || selectedOptionRequiresRemark)) {

        let remark = remarkEl?.value?.trim();

        // hanya kalau ada value
        let hasValue = false;

        switch (item.type) {

            case "OPTION":
                hasValue =
                    !!container.querySelector(
                        "input[type=radio]:checked"
                    );
                break;

            case "GROUP":
                hasValue =
                    Array.from(
                        container.querySelectorAll(
                            "input[data-role='value']"
                        )
                    ).some(i => i.value.trim() !== "");
                break;

            default:
                hasValue =
                    valueEl?.value?.trim() !== "";
                break;
        }

        if (hasValue && remark === "" && isSaveDone) {
            error = "Remark required";
        }
        if((remark || '').length > 500) {
            error = "Remark maximum 500 characters";
        }        
    }

    return error;
}
async function validateExtra() {
    let summary = document.querySelector("[data-role='summary']").value;
    let checkedFollowUp = (document.querySelector("[data-role='followup'] input[data-role='followup']:checked")?.value) || '';
    let followup = checkedFollowUp ?? ''

	let beforePhotos = await getPhotosByWO(currentWO.KeyHD, "BEFORE");
	let afterPhotos  = await getPhotosByWO(currentWO.KeyHD, "AFTER");

    let valid = true;

    if (valid && (!followup || followup.trim() === "")) {
        showToast('Follow Up recommendation must be choosed');
        valid = false;
    }
    if (valid && (!summary || summary.trim() === "")) {
		showToast('Final Summary wajib diisi');
        valid = false;
    }
    if(valid && (summary || '').length > 500) {
        showToast('Final Summary maximum 500 characters');
        valid = false;
    }
    if (valid && followup.toUpperCase() === "RECOMMEND FOLLOW UP") {
        const sectionFollowUp = (document.querySelector('input[name="followupSection"]:checked')?.value) || "";
        if (!sectionFollowUp || sectionFollowUp.trim() === "") {
            showToast('Follow Up Section must be choosed');
            valid = false;
        }
        const remarkFollowUp = document.querySelector('#txtFollowupRemark').value || "";
        if (valid && (!remarkFollowUp || remarkFollowUp.trim() === "")) {
            showToast('Follow Up WO Remark must be filled');
            valid = false;
        }
    }

    if (valid && beforePhotos.length === 0) {
		showToast('Foto BEFORE wajib attach');
        valid = false;
    }

    if (valid && afterPhotos.length === 0) {
		showToast('Foto AFTER wajib attach');
        valid = false;
    }

    return valid;
}
function clearValidationUI() {

    document.querySelectorAll(".border-danger")
        .forEach(x => {
            x.classList.remove("border", "border-danger", "rounded");
        });

    document.querySelectorAll(".is-invalid")
        .forEach(x => x.classList.remove("is-invalid"));

    document.querySelectorAll(".error-text")
        .forEach(x => x.remove());

}
function applyValidationUI(container, error, highlightContainer = true) {

    container.classList.remove("border", "border-danger", "rounded");

    container.querySelector(".error-text")?.remove();

    if (!error)
        return;

    if (highlightContainer) {
        container.classList.add(
            "border",
            "border-danger",
            "rounded"
        );
    }

    const el = document.createElement("div");

    el.className =
        "text-danger small mt-1 error-text";

    el.innerText = error;

    container.appendChild(el);
}
// ------------------------------------------

// ------------------------------------------
// fungsi2 foto
// ------------------------------------------
document.addEventListener("click", function (e) {
    let container = e.target.closest(".photo-upload");
    if (!container) return;

    let file = container.dataset.file;
    if (!file) return;

    let img = document.getElementById("previewImage");
    img.src = URL.createObjectURL(file);

    let modal = new bootstrap.Modal(document.getElementById("photoPreviewModal"));
    modal.show();
});
function renderAction() {

    let html = "";
    const isPhotoBefore = document
    .querySelector('[data-role="photo-before"] .photo-list')
    .children
    .length > 0;

    if (currentMode != "entry" && !currentWO.IsCompleteDC && currentWO.ReasonVoid === "" && currentWO.StatusSPV === "") {
        html += 
        `
        <button class="btn btn-outline-primary flex-fill wo-action-btn" type="button" id="btnAction1" onclick="approveVoid(1);">
            <i class="bi bi-check-circle-fill"></i>
            <span>Approve</span>
        </button>
        <button class="btn btn-outline-secondary flex-fill wo-action-btn" type="button" id="btnAction2" onclick="approveVoid(0);">
            <i class="bi bi-save"></i>
            <span>Void</span>
        </button>
        `
    }
    else if (currentMode === "entry" && ["DRAFT", "PENDING"].includes(currentWO.Status) && isPhotoBefore) {
        html += 
        `
        <button class="btn btn-outline-secondary flex-fill wo-action-btn" type="button" id="btnAction1" onclick="confirmSaveDone(1);">
            <i class="bi bi-save"></i>
            <span>Save Draft</span>
        </button>
        <button class="btn btn-outline-primary flex-fill wo-action-btn" type="button" id="btnAction2" onclick="confirmSaveDone(2);">
            <i class="bi bi-check-circle-fill"></i>
            <span>Submit</span>
        </button>
        `
    }
    else {
        html += 
        `
        <button class="btn btn-outline-secondary flex-fill wo-action-btn" type="button" id="btnOK" onclick="backToList();">
            <i class="bi bi-check-circle-fill"></i>
            <span>OK</span>
        </button>
        `
    }
    document.getElementById("sectionAction").innerHTML = html;
}
async function addPhotoToUI(blob, container, id) {

    let wrapper = document.createElement("div");
    wrapper.className = "photo-item";
    wrapper.dataset.id = id;

    let img = document.createElement("img");
    img.src = URL.createObjectURL(blob);
    // 🔥 PREVIEW
    img.onclick = function (e) {
        e.stopPropagation();
        openPreview(img, id, wrapper);
    };

    let btn = document.createElement("button");
    btn.innerHTML = "&times;";
    btn.className = "btn-delete";
	btn.type = "button";

    btn.onclick = async (e) => {
        e.stopPropagation(); // 🔥 penting
        let ok = await showConfirmation({
            title: "Delete Photo",
            message: "Hapus foto ini?"
        });

        if (!ok) return;
		let id = wrapper.dataset.id;
        await deletePhoto(Number(id));
        wrapper.remove();
        disableEnableEntryMode();
    };

    wrapper.appendChild(img);
    wrapper.appendChild(btn);

    container.querySelector(".photo-list").appendChild(wrapper);
}
function disableEnableEntryMode() {
    if (currentMode === "entry") {
        isCanEntry = ["DRAFT", "PENDING"].includes(currentWO.Status);
    }
    else {
        isCanEntry = false;
    }
    const isPhotoBefore = document
    .querySelector('[data-role="photo-before"] .photo-list')
    .children
    .length > 0;

    //document.querySelector("#txtFollowupRemark").disabled = isCanEntry;

    document.querySelectorAll(".upload-box")
     .forEach(box => {
        const boxBeforeAfter = (box.closest('.photo-upload').dataset.role);
         if ((!isCanEntry && boxBeforeAfter != "photo-sampling") || 
            (boxBeforeAfter === "photo-after" && !isPhotoBefore) ||
            currentWO.ActionSPV != "") 
         {
             box.classList.add("upload-box-readonly");
             box.style.pointerEvents = "none";
        }
        else if (isPhotoBefore) {
            box.classList.remove("upload-box-readonly");
            box.style.removeProperty("pointer-events"); 
        }
     });
    document.querySelectorAll('[data-role="photo-before"] .photo-list')
    .forEach(el => {
        el.disabled = !isCanEntry || (isCanEntry && !isPhotoBefore);
    });

    document.querySelectorAll('input:not([type="file"]), textarea, select, [data-role="photo-after"] .photo-list .photo-item button.btn-delete')
        .forEach(el => {
            if (el.tagName === "TEXTAREA") {
                if (el.id === "txtVoidReason" || 
                    (el.dataset.role === "remarkspv" && 
                        currentMode === "approval" && 
                        currentWO.StatusSPV === ""))
                    return;
                else if (el.id === "txtReasonVoid") {
                    el.disabled = (currentMode === "entry" || (currentWO.StatusSPV != ""));
                }
                else {
                    el.disabled = !isCanEntry || !isPhotoBefore;
                }
            }
            else {
                if (el.closest('.photo-upload') && isCanEntry && !isPhotoBefore && currentWO.ActionSPV == "" && el.name != "followupSection") {
                    return;
                }
                el.disabled = !isCanEntry || !isPhotoBefore;
                if (el.classList.contains('btn-delete') && !isCanEntry) {
                    el.classList.add("d-none");
                }
            }
        });
    let btn = document.querySelector('[data-role="photo-before"] .photo-list .photo-item button.btn-delete');
    if (!isCanEntry && btn)
        btn.classList.add("d-none");
    if (currentMode === "approval") {
        if (btn) {
            btn = document.querySelector('[data-role="photo-sampling"] .photo-list .photo-item button.btn-delete');
            if (currentWO.StatusSPV !== "")
                btn.classList.add("d-none");
        }
    }

    renderAction();
}
function deletePhoto(id) {

    return new Promise((resolve, reject) => {

        let tx = db.transaction("wo_photos", "readwrite");
        let store = tx.objectStore("wo_photos");

        // 🔥 ambil dulu data (biar tau KeyHD & Type)
        let getReq = store.get(Number(id));

        getReq.onsuccess = function () {

            let data = getReq.result;
            if (!data) return resolve(false);

            let keyHD = data.KeyHD;
            let type = data.Type;

            // 🔥 delete
            let delReq = store.delete(Number(id));

            delReq.onsuccess = async function () {

                // 🔥 rapihin order setelah delete
                await normalizeOrder(keyHD, type);

                resolve(true);
            };

            delReq.onerror = e => reject(e.target.error);
        };

        getReq.onerror = e => reject(e.target.error);
    });
}
async function normalizeOrder(keyHD, type) {

    let photos = await getPhotosByWO(keyHD, type);

    let tx = db.transaction("wo_photos", "readwrite");
    let store = tx.objectStore("wo_photos");

    photos.forEach((p, index) => {
        p.OrderNo = index + 1;
        store.put(p);
    });
}
async function savePhoto(keyHD, type, blob, fileName) {

    // 🔥 ambil jumlah existing dari DB
    let existing = await getPhotosByWO(keyHD, type);

    let orderNo = existing.length + 1;

    return new Promise((resolve, reject) => {

        let tx = db.transaction("wo_photos", "readwrite");
        let store = tx.objectStore("wo_photos");

        let data = {
            KeyHD: keyHD,
            Type: type,
            FileName: fileName,
            Blob: blob,
            OrderNo: orderNo, // 🔥 penting
            CreatedAt: new Date().toISOString()
        };

        let req = store.add(data);

        req.onsuccess = () => resolve(req.result); // return ID
        req.onerror = e => reject(e.target.error);
    });
}
document.addEventListener("dragover", e => {

    // let container = e.target.closest(".photo-upload");

    // if (!container) return;

    e.preventDefault();

});
document.addEventListener("dragenter", e => {
    const container = e.target.closest(".photo-upload");

    document.querySelectorAll(".photo-upload")
        .forEach(x => x.classList.remove("drag-hover"));

    if (container)
        container.classList.add("drag-hover");
});
document.addEventListener("drop", async e => {

    e.preventDefault();
    let container = e.target.closest(".photo-upload");

    if (!container)
        return;

    document.querySelectorAll(".photo-upload")
    .forEach(x => x.classList.remove("drag-hover"));

    let type = container.dataset.role
        .replace("photo-", "")
        .toUpperCase();

    console.log(type);

        let files = Array.from(e.dataTransfer.files);

        let existing =
            container.querySelectorAll(".photo-item").length;

        for (let file of files) {

            // 🔥 LIMIT TOTAL FOTO
            if (existing >= MAX_FILES) {
                showToast("Maksimal " + MAX_FILES.toString() + " foto");
                break;
            }

            // 🔥 VALIDASI TYPE
            if (!file.type.startsWith("image/")) {
                showToast("File harus berupa gambar");
                continue;
            }

            // 🔥 VALIDASI SIZE
            if (file.size > MAX_SIZE) {
                showToast("Ukuran foto maksimal 2MB");
                continue;
            }

            try {

                let blob = await compressImage(file);

                let id = await savePhoto(
                    currentWO.KeyHD,
                    type,
                    blob,
                    file.name
                );

                await addPhotoToUI(blob, container, id);

                existing++;
                disableEnableEntryMode();

            } catch (err) {

                console.error(err);
                showToast("Gagal upload foto");

            }
        }
});

// document.querySelectorAll("[data-role^='photo-']").forEach(container => {

//     let type = container.dataset.role.replace("photo-", "").toUpperCase();

//     container.addEventListener("dragover", e => {
//         e.preventDefault();
//     });

// 	container.addEventListener("drop", async e => {

// 		e.preventDefault();

// 		container.classList.remove("drag-hover");

// 		let files = Array.from(e.dataTransfer.files);

// 		let existing =
// 			container.querySelectorAll(".photo-item").length;

// 		for (let file of files) {

// 			// 🔥 LIMIT TOTAL FOTO
// 			if (existing >= MAX_FILES) {
// 				showToast("Maksimal " + MAX_FILES.toString() + " foto");
// 				break;
// 			}

// 			// 🔥 VALIDASI TYPE
// 			if (!file.type.startsWith("image/")) {
// 				showToast("File harus berupa gambar");
// 				continue;
// 			}

// 			// 🔥 VALIDASI SIZE
// 			if (file.size > MAX_SIZE) {
// 				showToast("Ukuran foto maksimal 2MB");
// 				continue;
// 			}

// 			try {

// 				let blob = await compressImage(file);

// 				let id = await savePhoto(
// 					currentWO.KeyHD,
// 					type,
// 					blob,
// 					file.name
// 				);

// 				addPhotoToUI(blob, container, id);

// 				existing++;

// 			} catch (err) {

// 				console.error(err);
// 				showToast("Gagal upload foto");

// 			}
// 		}
// 	});
// });
async function initPhotoSection() {

    //initPhotoUpload(wo);
    initPhotoSortable();
	clearPhotoUI();
    await loadExistingPhotos(currentWO);
}
function clearPhotoUI() {
   document.querySelectorAll(".photo-list")
        .forEach(el => {

            el.innerHTML = "";

        });
}
function initPhotoSortable() {

    document.querySelectorAll(".photo-list").forEach(el => {

        new Sortable(el, {
            animation: 150,

            onEnd: function (evt) {

                let items = evt.to.children;

                Array.from(items).forEach((child, index) => {

                    let id = child.dataset.id;

                    updatePhotoOrder(id, index + 1);
                });
            }
        });

    });
}
function updatePhotoOrder(id, orderNo) {

    let tx = db.transaction("wo_photos", "readwrite");
    let store = tx.objectStore("wo_photos");

    let req = store.get(Number(id));

    req.onsuccess = function () {

        let data = req.result;
        if (!data) return;

        data.OrderNo = orderNo;

        store.put(data);
    };
}
async function loadExistingPhotos(wo) {

    let before = await getPhotosByWO(wo.KeyHD, "BEFORE");
    let after  = await getPhotosByWO(wo.KeyHD, "AFTER");
    let samping  = await getPhotosByWO(wo.KeyHD, "SAMPLING");

    let beforeContainer = document.querySelector("[data-role='photo-before']");
    let afterContainer  = document.querySelector("[data-role='photo-after']");
    let samplingContainer  = document.querySelector("[data-role='photo-sampling']");

    before.forEach(p => addPhotoToUI(p.Blob, beforeContainer, p.ID));
    after.forEach(p => addPhotoToUI(p.Blob, afterContainer, p.ID));
    samping.forEach(p => addPhotoToUI(p.Blob, samplingContainer, p.ID));
}
// function initPhotoUpload(wo) {

    // document.querySelectorAll('input[type="file"]').forEach(input => {

        // input.onchange = async function (e) {

            // let files = Array.from(e.target.files);
            // let type = input.dataset.type;
            // let container = input.closest("[data-role^='photo-']");

            // let existing = container.querySelectorAll(".photo-item").length;

            // for (let file of files) {

                // if (existing >= 2) {
                    // showToast("Maksimal " + MAX_FILES.toString() + " foto");
                    // break;
                // }

                // let blob = await compressImage(file);

                // let id = await savePhoto(wo.KeyHD, type, blob, file.name);

                // addPhotoToUI(blob, container, id);

                // existing++;
            // }

            // input.value = "";
        // };
    // });
// }
function openPreview(imgEl, id, wrapper) {

    // 🔥 ambil semua foto dalam container yang sama
    let container = wrapper.closest(".photo-upload");
    let items = container.querySelectorAll(".photo-item img");
    currentPreviewId = id;
    currentPreviewWrapper = wrapper;

    previewList = Array.from(items);
	let counter = document.querySelector(".preview-counter");
    previewIndex = previewList.findIndex(i => i === imgEl);
    // 🔥 cari index yg diklik
    showPreview();
}
// function showPreview(input, blob) {
    // const container = input.closest(".photo-upload") || input.parentElement;

    // container.innerHTML = `<img src="${URL.createObjectURL(blob)}" class="img-fluid rounded"/>`;

    // container.onclick = () => {
        // document.getElementById("previewImg").src = container.querySelector("img").src;
        // new bootstrap.Modal("#photoPreviewModal").show();
    // };
// }
function showPreview() {

    let modal = document.getElementById("photoPreviewModal");
    let previewImg = document.getElementById("previewImage");

    let img = previewList[previewIndex];

    previewImg.src = img.src;
    if (isCanEntry)
        document.getElementById('btnDeletePreview').classList.remove("d-none");
    else
        document.getElementById('btnDeletePreview').classList.add("d-none");

    modal.classList.remove("d-none");
}
document.getElementById("btnClosePreview").onclick = function () {
    document.getElementById("photoPreviewModal").classList.add("d-none");
};
document.getElementById("btnDeletePreview").onclick = async function () {

    let ok = await showConfirmation({
        title: "Hapus Foto",
        message: "Yakin mau hapus foto ini?"
    });

    if (!ok) return;

    await deletePhoto(currentPreviewId);

    // hapus dari UI
    if (currentPreviewWrapper) {
        currentPreviewWrapper.remove();
    }
    disableEnableEntryMode();

    document.getElementById("photoPreviewModal").classList.add("d-none");
};

let touchStartX = 0;
let touchEndX = 0;

const preview = document.getElementById("photoPreviewModal");
function updatePreviewCounter() {

    const counter = document.querySelector(".preview-counter");

    if (!counter) return;
    // jika kosong
    if (previewList.length === 0) {
        counter.innerText = "0 / 0";
        return;
    }
	counter.innerText =
        (previewIndex + 1) +
        " / " +
        previewList.length;	
}
function nextPhoto() {

    if (previewIndex < previewList.length - 1) {
        previewIndex++;
        showPreview();
    }
}

function prevPhoto() {

    if (previewIndex > 0) {
        previewIndex--;
        showPreview();
    }
}
document.getElementById("btnPrevImage").addEventListener("click", function () {
	if (previewList.length === 0) return;
	previewIndex--;
	if (previewIndex < 0) {
		previewIndex = previewList.length - 1;
	}
	showPreview();
	updatePreviewCounter();
});
document.getElementById("btnNextImage").addEventListener("click", function () {
	if (previewList.length === 0) return;
	previewIndex++;
	if (previewIndex >= previewList.length) {
		previewIndex = 0;
	}
	showPreview();
	updatePreviewCounter();
});
// touch start
document.getElementById("previewImage").addEventListener("touchstart",
    function (e) {

        touchStartX =
            e.changedTouches[0].screenX;

    },
    { passive: true }
);
// touch end
document.getElementById("previewImage").addEventListener("touchend",
    function (e) {

        touchEndX =
            e.changedTouches[0].screenX;

        handleSwipeGesture();

    },
    { passive: true }
);
function handleSwipeGesture() {
    const swipeDistance =
        touchEndX - touchStartX;
    const minSwipeDistance = 50;
    // swipe right
    if (swipeDistance > minSwipeDistance) {
        prevPhoto();
    }
    // swipe left
    else if (swipeDistance < -minSwipeDistance) {
        nextPhoto();
    }
}
document.querySelectorAll(".photo-upload").forEach(container => {
    let input =
        container.querySelector("input[type=file]");

    container.addEventListener("click", function (e) {

        // 🔥 jangan trigger kalau klik thumbnail
        if (e.target.closest(".photo-item")) return;

        // 🔥 jangan trigger delete button
        if (e.target.closest(".btn-delete")) return;

        input.click();
    });
});

function validatePageAccess() {
    const requestedMode =
        getQueryString("mode");
	const validModes = ["entry","approval"];
	if(!requestedMode || !validModes.includes(requestedMode)) {
		showToast(
			"Invalid page mode.",
			"warning"
		);
		setTimeout(function () {
			window.location.href =
				"dashboard.aspx";
		}, 1000);
		return false;
	}		
    // =====================================
    // ENTRY MODE (TECHNICIAN)
    // =====================================
    if(requestedMode === "entry") {
        if(!appFeatures.technician) {
            showToast(
                "You do not have access to technician mode.",
                "danger"
            );
            setTimeout(function () {
                window.location.href =
                    "dashboard.aspx";
            }, 1200);
            return false;
        }
    }

    // =====================================
    // APPROVAL MODE (SPV)
    // =====================================
    if(requestedMode === "approval") {
        if(!appFeatures.supervisor) {
            showToast(
                "You do not have access to approval mode.",
                "danger"
            );
            setTimeout(function () {
                window.location.href =
                    "dashboard.aspx";
            }, 1200);
            return false;
        }
    }
	return true;
}

async function approveVoid(type) {
    let remarkspv = document.querySelector("[data-role='remarkspv']").value;
    if (!remarkspv || remarkspv.trim() === "") {
        showToast('Remark Supervisor wajib diisi');
        return;
    }
    if((remarkspv || '').length > 500) {
        showToast('Remark Supervisor maximum 500 characters');
        return;
    }

    if (currentWO.IsSampling) {
        let samplingPhotos = await getPhotosByWO(currentWO.KeyHD, "SAMPLING");
        if (samplingPhotos.length === 0) {
            showToast('Foto SAMPLING wajib attach');
            return;
        }
    }

	let _title = (type == "1" ? "Approve" : "Void");
    let confirm = await showConfirmation({
        title: _title + " Work Order",
        message: "Are you sure want to " + _title + " this work order?",
        yesText: "Yes"
    });

    if (!confirm)
        return;
	if (type == "0") {
		document.getElementById("txtVoidReason").value = "";
		document.getElementById("voidReasonError").classList.add("d-none");

		let modalEl = document.getElementById("voidReasonModal");
		let modal = new bootstrap.Modal(modalEl);

		modalEl.addEventListener(
			"shown.bs.modal",
			function () {
				document.getElementById("txtVoidReason").focus();
			},
			{ once: true }
		);

		modal.show();
		return;
	}
	await submitVoidWO(type);
}
async function submitVoidToIndexedDb(type, reason) {
    return new Promise((resolve, reject) => {
        let tx = db.transaction(["wo_checklist", "workorder"], "readwrite");
        let woStore = tx.objectStore("workorder");
        let checklistStore = tx.objectStore("wo_checklist");
        
        let getReq = checklistStore.get(currentWO.KeyHD);
        
        getReq.onsuccess = function () {
            let existing = getReq.result || {};
            let getReq1 = woStore.get(currentWO.KeyHD);
            
            getReq1.onsuccess = function () {
                let data = getReq1.result;
                if (!data) return reject(new Error("Data workorder tidak ditemukan"));

                data.Status = "";
                data.StatusSPV = "PENDING";
                data.ActionSPV = (type === "0" ? "VOID" : "APPROVED");
                data.ReasonVoid = reason;
                data.DataCheckListJSON.RemarkSPV = document.querySelector("[data-role='remarkspv']")?.value || "";
                
                // 1. Simpan ke woStore terlebih dahulu
                woStore.put(data);
                
                checklistStore.put(data.DataCheckListJSON); 
            };
            
            getReq1.onerror = (e) => reject(e);
        };

        getReq.onerror = (e) => reject(e);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e);
    });
}
async function submitVoidWO(type) {
	let reason = "";
	if (type == "0") {
		reason = document.getElementById("txtVoidReason").value.trim();
		if (!reason) {
			document.getElementById("voidReasonError").classList.remove("d-none");
			showToast("Reason is required","danger");
			return;
		}
        if((reason || '').length > 255) {
            showToast('Reason Void maximum 255 characters');
            return;
        }

	}
    try {
        let remarkspv = document.querySelector("[data-role='remarkspv']").value;
        if (currentWO.IsSampling) {
            await submitVoidToIndexedDb(type,reason);
        } else {
            let res = await fetch("workorder.aspx/approvevoidWorkOrder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    keyhd: currentWO.KeyHD,
                    reason: reason,
                    userid: getLoginData().employeeid,
                    remark: remarkspv
                })
            });
            let text = await res.text();
            let result = JSON.parse(text);
            result = result.d;

            if (!result.success) {
                alert(result.message);
            }
            // await promisifyPageMethod(
            //     PageMethods.approvevoidWorkOrder,
            //     currentWO.KeyHD,
            //     reason,
            //     getLoginData().employeeid,
            //     remarkspv
            // );
        }
        if (type == "0") {
            closeVoidReasonDialog();
            showToast("Work order has been voided","success");
        } else {
            showToast("Work order has been approved","success");
        }
        await initApprovalWO("PENDING");
        renderPage(1);
        backToList();
    }
    catch (ex) {
        alert(
            "FETCH ERROR\n\n" +
            ex.toString()
        );
        // console.error(ex);
        // showToast("Failed to void work order","danger");
    }
}
function closeVoidReasonDialog() {
    let modalEl =
        document.getElementById("voidReasonModal");
    let modal =
        bootstrap.Modal.getInstance(modalEl);
    if (modal)
        modal.hide();
}
function showLoading(text = 'Loading...') {

    let el = document.getElementById('globalLoadingOverlay');

    if (!el)
        return;

    const txt = el.querySelector('.loading-text');

    if (txt)
        txt.innerText = text;

    el.classList.remove('d-none');
}
function hideLoading() {

    let el = document.getElementById('globalLoadingOverlay');

    if (!el)
        return;

    el.classList.add('d-none');
}
function initFollowUpEvents() {

    const panel = document.getElementById("followupDetailPanel");
    if (!panel) return;

    document
        .querySelectorAll("input[name='opt_followup']")
        .forEach(radio => {

            radio.addEventListener("change", function () {

                panel.classList.toggle(
                    "d-none",
                    this.value !== "Recommend Follow Up"
                );

            });

        });

}

function initCharCounters() {

    document
        .querySelectorAll("textarea[maxlength]")
        .forEach(textarea => {

            let counter = textarea
                .closest(".accordion-body")
                ?.querySelector(".char-counter");

            if (!counter)
                return;

            function update() {

                const max = parseInt(textarea.maxLength);
                const len = textarea.value.length;

                counter.textContent = `${len} / ${max}`;

                counter.classList.remove(
                    "text-muted",
                    "text-warning",
                    "text-danger"
                );

                if (len >= max - 20)
                    counter.classList.add("text-danger");
                else if (len >= max - 100)
                    counter.classList.add("text-warning");
                else
                    counter.classList.add("text-muted");

            }

            textarea.removeEventListener("input", update);
            textarea.addEventListener("input", update);

            update();

        });

}