// let totalSearchCount = 0
const PageState = {
    INITIAL: 0,
    SEARCH_RESULT: 1,
    ASSIGN_SINGLE: 2,
    ADD_MULTI: 3
};
let currentState = PageState.INITIAL;
let woData = [];
let employeeData = [];
let employeeLoaded = false;
let employeeSectionLoaded = "";
let totalCompletedWO = 0;
const pageContext={
    page:1,
    pageSize:20,
    totalRecord:0,
    totalPage:0,
    totalAssigned:0
};
const selectedWOMap=new Map();
const excludedWOMap = new Map();
let isSelectAllResult = false;
let originalEmployee = [];
const searchContext = {
    year:0,
    week:0,
    section:"",
    status:"",
    keyword:"",
    global:false
};
const woLookup = new Map();
let employeeSortMode = "NAME_ASC";
let assignedEmployeeSummary = [];
//----------------------------------------------------------------------------------
// function isWOSelected(keyHD){
//     if(isSelectAllResult){
//         return !excludedWOMap.has(keyHD);
//     }
//     return selectedWOMap.has(keyHD);
// }
function getAssignMode(){
    return $("input[name=assignMode]:checked").val();
}
function setState(state){
    currentState = state;
    switch(state){
        case PageState.INITIAL:
            renderInitialState();
            break;
        case PageState.SEARCH_RESULT:
            renderSearchState();
            break;
        case PageState.ASSIGN_SINGLE:
            renderAssignState();
            break;
        case PageState.ADD_MULTI:
            renderMultiState();
            break;
    }
}
function renderInitialState(){
    $("#woPanel").removeClass("col-lg-8").addClass("col-12");
    $("#employeePanel").addClass("d-none");
    $("#tblWOBody").empty();
    $("#mobileWOList").empty();
    $("#lblTotalSearchCount").text("0");
    $("#lblCheckedCount").text("0");
    employeeLoaded = false;
    employeeSectionLoaded = "";
    employeeData = [];    
}
function getSelectedEmployee(){
    const arr=[];
    $(".emp-check:checked").each(function(){
        arr.push({
            EmployeeID:this.value,
            Name:$(this).data("name")
        });
    });
    return arr;
}

function refreshWeekDropdown(targetYear) {
    var ddlWeek = $("#ddlWeek");
    ddlWeek.empty(); // Kosongkan isi minggu sebelumnya

    var today = new Date();
    var currentYear = today.getFullYear();
    var defaultWeek = 1;

    // 1. Tentukan batas minggu (tahun tertentu seperti 2020 atau 2026 kadang memiliki 53 minggu)
    var totalWeeks = getNumberOfWeeks(targetYear);

    // 2. Loop & render ulang data minggu beserta range tanggalnya
    for (var w = 1; w <= totalWeeks; w++) {
        var rangeText = getDateRangeOfWeek(w, targetYear);
        var optionText = w + " (" + rangeText + ")";
        ddlWeek.append(new Option(optionText, w));
    }

    // 3. Tentukan default value setelah di-refresh
    if (targetYear === currentYear) {
        // Jika kembali ke tahun ini, set ke minggu berjalan saat ini
        defaultWeek = getTargetISOWeek(today);
    } else {
        // Jika memilih tahun lalu, default ke Minggu 1 (atau minggu ke-52 jika mau dari akhir)
        defaultWeek = 1; 
    }
    
    ddlWeek.val(defaultWeek);
}
// Helper untuk mendeteksi apakah tahun tersebut memiliki 52 atau 53 minggu
function getNumberOfWeeks(year) {
    var d = new Date(year, 11, 31);
    var week = getTargetISOWeek(d);
    return week == 1 ? getTargetISOWeek(new Date(year, 11, 24)) : week;
}
// ==========================================
// 1. INIT COMPONENT (YEAR, WEEK, SECTION)
// ==========================================
function initPageComponents() {
    var today = new Date();
    var currentYear = today.getFullYear();

    // A. Populate Year
    var ddlYear = $("#ddlYear");
    ddlYear.empty();
    ddlYear.append(new Option(currentYear, currentYear));
    ddlYear.append(new Option(currentYear - 1, currentYear - 1));
    ddlYear.val(currentYear); 

    // B. Populate Week (Sekarang tinggal panggil fungsi refresh)
    refreshWeekDropdown(currentYear);

    // C. Populate Section dari Login Session
    var ddlSection = $("#ddlSection");
    ddlSection.empty();
    try {
        var loginData = getLoginData(); 
        if (loginData && loginData.section) {
            var sections = loginData.section.split(';');
            sections.forEach(function (sec) {
                var cleanSec = sec.trim();
                if(cleanSec) ddlSection.append(new Option(cleanSec, cleanSec));
            });
        }
    } catch (e) {
        ddlSection.append(new Option("ALL", "ALL"));
    }

    updateSummaryLabels();
}
// Helper: Memperbarui teks pada Summary Bar
function updateSummaryLabels() {
    var year = $("#ddlYear").val();
    var weekText = $("#ddlWeek option:selected").text();
    var section = $("#ddlSection").val() || "-";

    $("#lblSummaryPeriod").text(year + " - Week " + weekText);
    $("#lblSummarySection").text(section);
}

// Helper: Mendapatkan Nomor Minggu Saat Ini (ISO-8601)
function getTargetISOWeek(date) {
    var tdt = new Date(date.valueOf());
    var dayn = (date.getDay() + 6) % 7;
    tdt.setDate(tdt.getDate() - dayn + 3);
    var firstThursday = tdt.valueOf();
    tdt.setMonth(0, 1);
    if (tdt.getDay() !== 4) {
        tdt.setMonth(0, 1 + ((4 - tdt.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - tdt) / 604800000);
}

// Helper: Mendapatkan Rentang Tanggal dari Nomor Minggu (Format: 16 Jun - 22 Jun)
function getDateRangeOfWeek(weekNo, year) {
    var d = new Date(year, 0, 1);
    var dayNum = d.getDay();
    var diff = weekNo * 7;

    if (dayNum <= 4) {
        diff -= (dayNum - 1);
    } else {
        diff += (8 - dayNum);
    }

    var startOfWeek = new Date(year, 0, diff - 7);
    var endOfWeek = new Date(year, 0, diff - 1);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return startOfWeek.getDate() + " " + months[startOfWeek.getMonth()] + " - " + 
           endOfWeek.getDate() + " " + months[endOfWeek.getMonth()];
}
function clearWOSelection(){
    $(".wo-check").prop("checked",false);
    $("#selectAllWO").prop("checked",false);
    //updatePageLayout();
    selectedWOMap.clear();
}
function getCurrentPageRecords(){
    const desktopVisible =
        $("#woTableContainer").is(":visible");
    if(desktopVisible){
        return $("#tblWOBody .wo-record");
    }
    return $("#mobileWOList .wo-record");
}
function updateWOSelection(){

    const currentPageCount =
        getCurrentPageRecords().length;

    let currentPageSelected = 0;

    getCurrentPageRecords().each(function(){

        const id =
            $(this).data("keyhd");

        if(isSelectAllResult){

            if(!excludedWOMap.has(id))
                currentPageSelected++;

        }
        else{

            if(selectedWOMap.has(id))
                currentPageSelected++;

        }

    });

    const totalSelected =
        isSelectAllResult
            ? pageContext.totalRecord -
              excludedWOMap.size
            : selectedWOMap.size;

    $("#lblCurrentPageSelected")
        .text(currentPageSelected);

    $("#lblCurrentPageCount")
        .text(currentPageCount);

    $("#lblSummarySelected")
        .text(totalSelected);

    $("#selectAllWO").prop(
        "checked",
        currentPageCount > 0 &&
        currentPageSelected === currentPageCount
    );

    refreshMobileBottomBar();

    refreshSelectedWOInfo();

    updateAssignWarning();


    /*
     * ==========================================
     * NO WO SELECTED
     * ==========================================
     */

    if(totalSelected === 0){

        setState(
            PageState.SEARCH_RESULT
        );

        return;

    }


    /*
     * ==========================================
     * MOBILE
     * ==========================================
     *
     * Begitu WO dipilih, langsung pindah
     * ke Employee panel.
     */

    if(isMobileAssignLayout()){

        if(!isSelectAllResult &&
           totalSelected === 1){

            setState(
                PageState.ASSIGN_SINGLE
            );

            return;

        }

        /*
         * Select multiple WO
         * atau Select All Result
         */

        setState(
            PageState.ADD_MULTI
        );

        return;

    }


    /*
     * ==========================================
     * DESKTOP
     * ==========================================
     */

    if(
        !isSelectAllResult &&
        totalSelected === 1
    ){

        setState(
            PageState.ASSIGN_SINGLE
        );

    }
    else{

        setState(
            PageState.ADD_MULTI
        );

    }

}
function getWOFromRow(keyHD){
    return woLookup.get(keyHD) || null;
}
function toggleCurrentPageSelection(isChecked){
    getCurrentPageRecords().each(function(){

        const row = $(this);

        const id = row.data("keyhd");

        row.find(".wo-check").prop("checked", isChecked);

        if(isSelectAllResult){

            if(isChecked){

                excludedWOMap.delete(id);

            }else{

                // excludedWOMap.set(id,true);
                excludedWOMap.set(id, {
                    KeyHD: wo.KeyHD,
                    IsCompleteDC: wo.IsCompleteDC
                });
            }

        }else{

            if(isChecked){

                selectedWOMap.set(
                    id,
                    getWOFromRow(id)
                );

            }else{

                selectedWOMap.delete(id);

            }

        }

    });

    updateWOSelection();
}
function clearAllSelection(){
    isSelectAllResult = false;
    selectedWOMap.clear();
    excludedWOMap.clear();
    $(".wo-check").prop("checked",false);
    $("#selectAllWO").prop("checked",false);
    updateWOSelection();
}
function isDirty(){
    const current =
        getSelectedEmployee()
        .sort();
    return JSON.stringify(current)
        !=
        JSON.stringify(originalEmployee);
}
function getEmployeeLoad(count){
    count = count || 0;
    if(count===0){
        return{
            dot:"bg-secondary",
            badge:'<span class="emp-wo-badge bg-secondary-subtle text-secondary border">Idle</span>'
        };
    }
    if(count<=5){
        return{
            dot:"bg-success",
            badge:`<span class="emp-wo-badge bg-success-subtle text-success border">${count} WO</span>`
        };
    }
    if(count<=10){
        return{
            dot:"bg-info",
            badge:`<span class="emp-wo-badge bg-info-subtle text-info border">${count} WO</span>`
        };
    }
    if(count<=15){
        return{
            dot:"bg-warning",
            badge:`<span class="emp-wo-badge bg-warning-subtle text-warning-emphasis border">${count} WO</span>`
        };
    }
    return{
        dot:"bg-danger",
        badge:`<span class="emp-wo-badge bg-danger-subtle text-danger border">${count} WO</span>`
    };
}
function getEmployeeSummary(list){

    if(!list || list.length===0){
        return {
            text:"-",
            detail:""
        };
    }

    return {
        text:list.length + " Employee" + (list.length>1?"s":""),
        detail:list
            .map(x=>`${x.EmployeeID} - ${x.Name}`)
            .join("<br>")
    };

}
function initEmployeePopover(){
    document
        .querySelectorAll(".employee-summary")
        .forEach(function(el){

            bootstrap.Popover.getInstance(el)?.dispose();

            new bootstrap.Popover(el,{
                container:"body",
                sanitize:false
            });

        });
}
function hasCompletedWO(){
    return getCompletedWOCount() > 0;
}
function getCompletedWOCount(){
    if(isSelectAllResult){
        let total = totalCompletedWO;
        excludedWOMap.forEach(function(wo){
            if(wo.IsCompleteDC)
                total--;
        });
        return Math.max(0,total);
    }
    let total = 0;
    selectedWOMap.forEach(function(wo){
        if(wo.IsCompleteDC)
            total++;
    });
    return total;
}
function updateAssignWarning(){
    const locked = hasCompletedWO();
    $("#btnAssign").prop("disabled", locked);
    $("#btnMobileAssign").prop("disabled", locked);
    $("#txtEmployeeSearch").prop("disabled", locked);
    $("input[name=assignMode]").prop("disabled", locked);
    $("#employeeList input[type=checkbox]")
        .prop("disabled", locked);
    if(!locked){
        $("#assignWarning")
            .addClass("d-none");
        return;
    }
    const completed=getCompletedWOList();
    $("#assignWarning")
        .removeClass("d-none")
        .html(`
<i class="bi bi-lock-fill me-1"></i>
<b>Assignment cannot be modified.</b>
<div class="small mt-1">
${completed.length}
completed Work Order(s) exist in current selection.
</div>
<a href="#"
   id="lnkToggleCompleted"
   class="small">
Show completed Work Orders
</a>
<div
id="completedWOList"
class="mt-2 d-none">
${completed.map(function(x){
return `
<div
class="completed-wo-item border rounded p-2 mb-1 bg-light"
data-keyhd="${x.KeyHD}">
<div class="fw-semibold text-primary">
${x.WONo}
</div>
<div class="small text-muted">
${x.EquipmentName}
</div>
</div>
`;
}).join("")}
</div>
`);
}
function getCurrentSelectedWO(){
    if(selectedWOMap.size===0)
        return null;

    return selectedWOMap.values().next().value;
}
// -----------------------------------------
// RENDER
// -----------------------------------------
function refreshMobileBottomBar(){
    const totalSelected =
        isSelectAllResult
            ? pageContext.totalRecord - excludedWOMap.size
            : selectedWOMap.size;

    if(totalSelected==0){

        $("#mobileBottomAction")
            .addClass("d-none");

        return;
    }

    $("#mobileBottomAction")
        .removeClass("d-none");

    $("#lblMobileSelectedCount")
        .text(totalSelected);
}
function refreshSelectedWOInfo(){
    if(isSelectAllResult){
        const keyword=$("#txtKeyword").val().trim();
        const excluded =
            excludedWOMap.size;        
        const totalSelected =
            pageContext.totalRecord - excludedWOMap.size;

        $("#selectedWOInfo").html(`

    <div class="d-flex align-items-start">

        <i class="bi bi-check-circle-fill
                  text-success
                  me-2
                  mt-1"></i>

        <div>

            <div class="fw-semibold">

                All Search Result Selected

            </div>

            <div class="small text-muted mt-1">

                ${totalSelected} Work Orders

            </div>

            <div class="small mt-2">

                <div>
                    <strong>Period :</strong>
                    ${$("#lblSummaryPeriod").text()}
                </div>

                <div>
                    <strong>Section :</strong>
                    ${$("#lblSummarySection").text()}
                </div>
                ${keyword != "" ? 
                `<div><strong>Keyword :</strong>`+keyword+`</div>`
                : ``}
                ${
                excluded>0 ?
                `
                <div class="text-warning mt-2">
                Excluded :
                ${excluded} Work Orders
                </div>
                `
                :
                ""
                }
            </div>

        </div>

    </div>

    `);

        return;

    }
    const selected = Array.from(selectedWOMap.values());
    let html="";
    if(selected.length==1){
        html+=`
<div class="small text-muted">
Selected Work Order
</div>
<div class="fw-bold">
${selected[0].WONo}
</div>
<div class="text-muted small mb-2">
${selected[0].EquipmentCode}
</div>
`;
    }
    else{
        html+=`
<div class="small text-muted">
${selected.length}
Work Orders Selected
</div>
`;
    html+=`
    <div class="small">${Array.from(selectedWOMap.values())
                        .map(item => item.WONo)
                        .join(', ')}
    </div>`;
        if(selected.length>5){
            html+=`
<div class="small text-muted">
+${selected.length-5} more...
</div>
`;
        }
    }
    $("#selectedWOInfo").html(html);
}
function renderWOListToUI(listWO){
    disposeAllEmployeePopovers();
    woData = listWO;
    totalSearchCount = listWO.length;

    $("#lblCheckedCount").text(0);
    $("#lblTotalSearchCount").text(totalSearchCount);

    renderDesktopWO(listWO);

    renderMobileWO(listWO);

    restoreSelection();      // <-- tambahkan ini

    updateWOSelection();     // <-- baru update summary

    $("#tblWO tbody")
        .hide()
        .fadeIn(120);
}
function renderDesktopWO(listWO) {
    if(!Array.isArray(listWO))
        listWO = [];    
    woData = listWO;
    totalSearchCount = listWO.length;
    $("#lblTotalSearchCount").text(totalSearchCount);
    $("#lblCheckedCount").text(0);
    let html = "";
    if(listWO.length == 0){

            html = `
    <tr>
        <td colspan="6" class="text-center text-muted py-5">

            <i class="bi bi-inbox fs-2 d-block mb-2"></i>

            No Work Order Found

        </td>
    </tr>
    `;
        $("#tblWO tbody").html(html);
        return;
    }

    listWO.forEach(function (wo) {
    const employee = getEmployeeSummary(wo.AssignedEmployee); 
    const employeeTooltip =
    wo.AssignedEmployee
      .map(x=>x.EmpName)
      .join("\n");
        html += `
<tr class="wo-record" data-keyHd="${wo.KeyHD}">
<td>
<input
    class="form-check-input wo-check" 
    type="checkbox">
</td>
<td>${wo.WONo}</td>
<td>${wo.EquipmentName}</td>
<td>
<span class="badge text-bg-light text-primary border">
${wo.SectionID}
</span>
</td>
<td>
<span class="badge ${getStatusBadge(wo.Status)}">
${wo.Status}
</span>
</td>
<td>

<i class="bi bi-people-fill text-primary me-1"></i>

<span
class="employee-summary"
data-bs-toggle="popover"
data-bs-trigger="hover focus"
data-bs-html="true"
data-bs-placement="left"
data-bs-content="${employee.detail}">

${employee.text}

</span>

</td>            
</tr>
`;
    });
    $("#tblWO tbody").html(html);
    updateWOSelection();    
    initEmployeePopover();
}
function renderMobileWO(list){
    if(!Array.isArray(list))
        list = [];
    
    let html="";

    if(list.length==0){

        $("#mobileWOList").html(`
<div class="text-center text-muted py-5">

<i class="bi bi-inbox fs-1"></i>

<div>No Work Order Found</div>

</div>
`);

        return;
    }
    list.forEach(function(wo){
    const employee = getEmployeeSummary(wo.AssignedEmployee);        
        html+=`

<div class="wo-record mobile-wo-card p-3 d-flex align-items-center gap-3" data-keyHd="${wo.KeyHD}">
    <input class="form-check-input wo-check mt-0" type="checkbox">
    <div class="flex-grow-1">
        <div class="d-flex justify-content-between align-items-start mb-1">
            <span class="fw-bold fs-6">${wo.WONo}</span>
            <span class="badge ${getStatusBadge(wo.Status)}">${wo.Status}</span>
        </div>
        <div class="text-muted small mb-1">${wo.EquipmentName}</div>
        <div class="small mt-2">

        <i class="bi bi-people-fill text-primary me-1"></i>

        <span
        class="employee-summary"
        data-bs-toggle="popover"
        data-bs-trigger="click"
        data-bs-html="true"
        data-bs-placement="top"
        data-bs-content="${employee.detail}">

        ${employee.text}

        </span>

        </div>            
    </div>
</div>`;
});
    $("#mobileWOList").html(html);
    document
        .getElementById("mobileWOList")
        .scrollIntoView({
            behavior:"smooth",
            block:"start"
        });    
    // syncWOSelectionUI();
    updateWOSelection();        
    initEmployeePopover();
}
function renderSearchState(){

    $("body")
        .removeClass("mobile-employee-mode");

    $("#woPanel")
        .removeClass("mobile-panel-hidden")
        .removeClass("col-lg-8")
        .addClass("col-12")
        .css({
            "display":"",
            "width":"",
            "max-width":""
        });

    $("#employeePanel")
        .addClass("d-none")
        .removeClass("mobile-panel-hidden")
        .css({
            "display":"",
            "width":"",
            "max-width":""
        });

}
function renderEmployeePanel(assignedEmployeeList){
    const completed = hasCompletedWO();
    // const list = sortEmployeeList(employeeData);
    const list = getFilteredEmployee();
    let html = "";
    list.forEach(function(emp){
        const checked =
            assignedEmployeeList.some(function(x){
                return x.EmployeeID == emp.EmployeeID;
            });
        html += renderEmployeeItem(
            emp,
            checked,
            completed
        );
    });
    $("#employeeList").html(html);
    originalEmployee =
        assignedEmployeeList
            .map(function(x){
                return x.EmployeeID;
            })
            .sort();
    refreshEmployeeSelectionByMode();
    refreshEmployeeSelectAll();
}
function getRemoveEmployeeList(){
    if(isSelectAllResult){
        return assignedEmployeeSummary;
    }
    const map = new Map();
    selectedWOMap.forEach(function(wo){
        (wo.AssignedEmployee || []).forEach(function(emp){
            map.set(emp.EmployeeID, emp);
        });
    });
    return [...map.values()];
}
async function renderAssignState(){
    ensureMobileEmployeeBackButton();
    $("#txtEmployeeSearch").val("");
    $("#woPanel")
        .removeClass("col-12")
        .addClass("col-lg-8");
    $("#employeePanel")
        .removeClass("d-none");
    $("#modeReplace")
        .prop("checked", true);
    const wo = getCurrentSelectedWO();
    if(!wo){
        setState(PageState.SEARCH_RESULT);
        return;
    }
    $("#panelTitle")
        .text("Assign Employee");
    $("#selectedWOInfo").html(`
<div class="fw-bold">
${wo.WONo}
</div>
<div class="small text-muted">
${wo.EquipmentName}
</div>
<div class="mt-2">
<span class="badge bg-warning">
Outstanding
</span>
</div>
`);
    $("#employeeCaption")
        .text("Current Assignment");
    await loadEmployeeIfNeeded();
    renderEmployeePanel(
        wo.AssignedEmployee
    );
    updateAssignWarning();
    // MOBILE
    if(window.innerWidth < 992){

        enterMobileEmployeeMode();

        setTimeout(function(){

            scrollToEmployeePanelMobile();

        }, 100);

    }    
}
function renderEmployeeList(list){
    const completed = hasCompletedWO();
    const wo = getCurrentSelectedWO();
    const assigned =
        wo
            ? (wo.AssignedEmployee || [])
            : [];
    const sorted = sortEmployeeList(list);
    let html = "";
    sorted.forEach(function(emp){
        const checked =
            assigned.some(function(x){
                return x.EmployeeID == emp.EmployeeID;
            });
        html += renderEmployeeItem(
            emp,
            checked,
            completed
        );
    });
    $("#employeeList").html(html);
    refreshEmployeeSelectionByMode();
    refreshEmployeeSelectAll();
    updateEmployeeCount();
}
function renderEmployeeItem(emp,isChecked,isDisabled){
    const load = getEmployeeLoad(emp.OutstandingCount);
    const percent =
        getWorkloadPercent(
            emp.OutstandingCount
        );    
    return `
<li class="list-group-item py-2">
<div class="form-check">
<div class="d-flex align-items-center">
<input
class="form-check-input emp-check me-2"
type="checkbox"
value="${emp.EmployeeID}"
data-name="${emp.Name}"
${isChecked ? "checked" : ""}
${isDisabled ? " disabled" : ""}>
<label class="form-check-label flex-grow-1">
<div class="d-flex justify-content-between align-items-center">
<div>
<div class="fw-semibold d-flex align-items-center">
<span class="emp-load-dot ${load.dot} me-1"></span>
<span class="emp-preview" data-id="${emp.EmployeeID}">
${emp.Name}
</span>
</div>
<div class="small text-muted">
${emp.EmployeeID}
<div class="mt-1">
<div class="progress"
     style="height:4px;">
<div class="progress-bar" style="width:${percent}%">
</div>
</div>
</div>        
</div>
</div>
<span class="emp-preview" data-id="${emp.EmployeeID}">
${load.badge}
</span>
</div>
</label>
</div>
</div>
</li>
`;
}
async function renderMultiState(){
    ensureMobileEmployeeBackButton();
    $("#txtEmployeeSearch").val("");
    $("#employeePanel")
        .removeClass("d-none");
    $("#modeReplace")
        .prop("checked", true);
    $("#woPanel")
        .removeClass("col-12")
        .addClass("col-lg-8");
    $("#panelTitle")
        .text("Add Employee");
    const totalSelected =
        isSelectAllResult
            ? pageContext.totalRecord -
              excludedWOMap.size
            : selectedWOMap.size;
    refreshSelectedWOInfo();
    refreshEmployeeListByMode();
    updateAssignWarning();
    refreshMobileBottomBar();
    if(isSelectAllResult){
        $("#employeeCaption")
            .text("Assign Employee To");
        setState(PageState.ASSIGN_MULTI);
    }
    else{
        $("#employeeCaption")
            .text("Selected Work Orders");
        await loadEmployeeIfNeeded();
    }
    if(getAssignMode()=="REMOVE"){
        await loadAssignedEmployeeSummary();
    }
    refreshEmployeeListByMode();
    const completed = hasCompletedWO();
    $("#btnAssign")
        .prop("disabled",completed);
    /*
     * MOBILE
     */
    enterMobileEmployeeMode();
}
// function renderPagination(){
//     if(pageContext.totalPage <= 1){
//         $("#paginationContainer").empty();
//         $("#mobilePagination").empty();
//         return;
//     }
//     renderDesktopPagination();
//     renderMobilePagination();
// }
function renderPagination(){

    if(pageContext.totalRecord <= pageContext.pageSize){

        $("#desktopPagination").hide();
        $("#desktopPaginationTop").hide();
        $("#mobilePagination").hide();

        return;
    }

    $("#desktopPagination").show();
    $("#desktopPaginationTop").show();
    $("#mobilePagination").show();

    renderDesktopPagination();
    renderMobilePagination();
}
function renderDesktopPagination(){
    let html="";
    const p=pageContext.page;
    const total=pageContext.totalPage;
    html+=`
<li class="page-item ${p==1?'disabled':''}">
<a
class="page-link"
data-page="1">
<i class="bi bi-chevron-double-left"></i>
</a>
</li>
`;
    html+=`
<li class="page-item ${p==1?'disabled':''}">
<a
class="page-link"
data-page="${p-1}">
<i class="bi bi-chevron-left"></i>
</a>
</li>
`;
    const start=Math.max(1,p-2);
    const end=Math.min(total,p+2);
    for(let i=start;i<=end;i++){
        html+=`
<li
class="page-item
${i==p?'active':''}">
<a
class="page-link"
data-page="${i}">
${i}
</a>
</li>
`;
    }
    html+=`
<li class="page-item ${p==total?'disabled':''}">
<a
class="page-link"
data-page="${p+1}">
<i class="bi bi-chevron-right"></i>
</a>
</li>
`;
    html+=`
<li class="page-item ${p==total?'disabled':''}">
<a
class="page-link"
data-page="${total}">
<i class="bi bi-chevron-double-right"></i>
</a>
</li>
`;
    $("#paginationContainer").html(html);
    $("#paginationContainerTop").html(html);
    const startRow=(p-1)*pageContext.pageSize+1;
    const endRow=Math.min(
        p*pageContext.pageSize,
        pageContext.totalRecord
    );
    const info =
        `Showing ${startRow} - ${endRow} of ${pageContext.totalRecord}`;

    $("#paginationInfo").text(info);
    $("#paginationInfoTop").text(info);    
}
function renderMobilePagination(){
    $("#mobilePagination").html(
`
<div class="d-flex justify-content-between align-items-center">
<button class="btn btn-light" ${pageContext.page==1?"disabled":""} data-page="${pageContext.page-1}">
    <i class="bi bi-chevron-left"></i>
</button>
<span>Page${pageContext.page}/${pageContext.totalPage}</span>
<button class="btn btn-light" ${pageContext.page==pageContext.totalPage?"disabled":""} data-page="${pageContext.page+1}">
    <i class="bi bi-chevron-right"></i>
</button>    
</div>
`
    );
}
function captureSearchContext(){
    searchContext.year=
        parseInt($("#ddlYear").val());
    searchContext.week=
        parseInt($("#ddlWeek").val());
    searchContext.section=
        $("#ddlSection").val();
    searchContext.status=
        $("#ddlStatus").val();
    searchContext.keyword=
        $("#txtKeyword").val();
    searchContext.global=
        $("#chkGlobalSearch").is(":checked");
}
function getStatusBadge(status){
    switch((status || "").toUpperCase()){

        case "ASSIGNED":
            return "text-bg-success";

        case "UNASSIGNED":
            return "text-bg-warning";

        default:
            return "text-bg-secondary";
    }
}
function scrollToWOList() {

    const panel = document.getElementById("woPanel");

    if (!panel)
        return;

    // const stickyHeight = 120; // sesuaikan nanti
    const stickyHeight =
        $("#woListHeader").outerHeight(true)
        +
        $(".sticky-bar-wrapper").outerHeight(true);    

    const top =
        panel.getBoundingClientRect().top +
        window.pageYOffset -
        stickyHeight;

    window.scrollTo({
        top: top,
        behavior: "smooth"
    });

}
function restoreSelection(){
    $(".wo-record").each(function(){

        const row = $(this);

        const id = row.data("keyhd");

        let checked;

        if(isSelectAllResult){

            checked = !excludedWOMap.has(id);

        }else{

            checked = selectedWOMap.has(id);

        }

        row.find(".wo-check").prop("checked", checked);

    });
}
function getSelectedWOCount(){
    if(isSelectAllResult){
        return Math.max(0,
            pageContext.totalRecord - excludedWOMap.size);
    }
    return selectedWOMap.size;
}
function hasSelectedWO(){
    return getSelectedWOCount() > 0;
}
function refreshEmployeeListByMode(){
    const mode = getAssignMode();
    if(mode==="REMOVE"){
        renderEmployeeList(
            getRemoveEmployeeList()
        );
    }
    else{
        renderEmployeeList(
            employeeData
        );
    }
    refreshEmployeeSelectionByMode();
}
function refreshEmployeeSelectionByMode(){
    const mode = getAssignMode();
    // reset dulu
    $("#employeeList input[type=checkbox]")
        .prop("checked", false);
    if(mode === "ADD")
        return;
    if(mode === "REMOVE")
        return;
    // hanya REPLACE yg ada pre-check
    if(selectedWOMap.size === 1 && !isSelectAllResult){
        const wo = Array.from(selectedWOMap.values())[0];
        (wo.AssignedEmployee || []).forEach(function(emp){
            $("#emp_" + emp.EmployeeID)
                .prop("checked", true);
        });
    }
}
async function confirmAssignment(){
    const selectedCount = getSelectedWOCount();
    const employeeCount = getSelectedEmployee().length;
    const mode=getAssignMode();

    let title = "";
    let message = "";
    let btnText = "";
    // if(employeeCount == 0){
    if(mode == "REMOVE"){
        title = "Remove Assignment";
        message =
            `Remove employee assignment from ${selectedCount} Work Order(s)?`;
        btnText = "Remove";
    }
    // else if(hasExistingAssignment()){
    else if (mode == "REPLACE") {
        title = "Replace Assignment";
        message =
            `Replace employee assignment for ${selectedCount} Work Order(s)?`;
        btnText = "Replace";
    }
    else{
        title = "Add Employee";
        message =
            `Add ${employeeCount} employee(s) to ${selectedCount} Work Order(s)?`;
        btnText = "Assign";
    }

    return await showConfirmation({
        title:title,
        message:message,
        yesText:btnText
    });
}
function hasExistingAssignment(){
    if(isSelectAllResult){
        return pageContext.totalAssigned > 0;
    }

    return Array
        .from(selectedWOMap.values())
        .some(function(x){

            return x.AssignedEmployee &&
                   x.AssignedEmployee.length>0;

        });
}
function updateAssignModeUI(){
    const mode=getAssignMode();
    switch(mode){
        case "REPLACE":
            $("#employeeCaption")
                .text("Replace Assignment");
            $("#btnAssign")
                .removeClass("btn-success btn-danger")
                .addClass("btn-primary")
                .text("Replace Assignment");
            break;
        case "ADD":
            $("#employeeCaption")
                .text("Add Employee");
            $("#btnAssign")
                .removeClass("btn-primary btn-danger")
                .addClass("btn-success")
                .text("Add Employee");
            break;
        case "REMOVE":
            $("#employeeCaption")
                .text("Remove Employee");
            $("#btnAssign")
                .removeClass("btn-primary btn-success")
                .addClass("btn-danger")
                .text("Remove Employee");
            break;
    }
}
// -----------------------------------------
// EVENTS
// -----------------------------------------
$(document).ready(async function () {
    initPageComponents();
    await executeWOSearch(false);
    
    // Ketika Dropdown Year diganti, refresh isi Dropdown Week otomatis
    $("#ddlYear").change(function () {
        var selectedYear = parseInt($(this).val());
        refreshWeekDropdown(selectedYear);
        updateSummaryLabels();
    });

    // Triger perubahan teks di summary bar saat dropdown lain diubah manual
    $("#ddlWeek, #ddlSection").change(function() {
        updateSummaryLabels();
    });
});
$("#txtEmployeeSearch").on("keyup", function () {
    renderEmployeeList(
        getFilteredEmployee()
    );
});
$("#ddlEmployeeSort").on("change", function () {
    employeeSortMode = $(this).val();
    renderEmployeeList(
        getFilteredEmployee()
    );
});
$(document).on("change",".wo-check", function(){
    const row = $(this).closest(".wo-record");
    const id  = row.data("keyhd");

    if(isSelectAllResult){
        if(this.checked){
            // tadinya dikecualikan, sekarang dipilih lagi
            excludedWOMap.delete(id);
        }else{
            // jangan ikut Select All
            const wo = woLookup.get(id);
            excludedWOMap.set(wo.KeyHD, {
                KeyHD: wo.KeyHD,
                IsCompleteDC: wo.IsCompleteDC
            });
        }
    }else{
        if(this.checked){
            selectedWOMap.set(
                id,
                getWOFromRow(id)
            );
        }else{
            selectedWOMap.delete(id);
        }
    }
    updateAssignWarning();
    updateWOSelection();
});
$(document).on("click", "[data-page]", async function () {

    const page = parseInt($(this).data("page"));

    if (page == pageContext.page)
        return;

    if (page < 1)
        return;

    if (page > pageContext.totalPage)
        return;

    disposeAllEmployeePopovers();

    const $tbody = $("#tblWO tbody");

    $tbody.stop(true, true)
        .animate({
            opacity: 0.35
        }, 100);

    pageContext.page = page;

    await executeWOSearch(true);

    scrollToWOList();

    $tbody.stop(true, true)
        .animate({
            opacity: 1
        }, 180);
});
$("#selectAllWO").change(function(){
    toggleCurrentPageSelection(this.checked);
});
$("#btnAssign").click(async function(e){
    e.preventDefault();
    e.stopPropagation();
    if(getAssignMode()=="REPLACE" &&
       getSelectedEmployee().length===0){
        showToast("Please select at least one employee.");
        return;
    }
    if(getAssignMode()=="ADD" &&
       getSelectedEmployee().length===0){
        showToast("Please select employee(s) to add.");
        return;
    }
    if(getAssignMode()=="REMOVE" &&
       getSelectedEmployee().length===0){
        showToast("Please select employee(s) to remove.");
        return;
    }
    if(!hasSelectedWO())
        return false;

    const ok = await confirmAssignment();
    if(!ok)
        return false;
    await saveAssignment();
    return false;
});
$("#btnMobileAssign").click(async function(e){

    e.preventDefault();
    e.stopPropagation();

    if(!hasSelectedWO())
        return false;

    const ok = await confirmAssignment();

    if(!ok)
        return false;

    await saveAssignment();

    // Scroll kembali ke Employee Panel
    // dengan posisi heading tetap terlihat
    setTimeout(function(){

        const panel = document.getElementById("employeePanel");

        if(!panel)
            return;

        const stickyHeight =
            $(".sticky-bar-wrapper").outerHeight(true) || 0;

        const top =
            panel.getBoundingClientRect().top +
            window.pageYOffset -
            stickyHeight -
            12;

        window.scrollTo({
            top: top,
            behavior: "smooth"
        });

    }, 100);

    return false;
});
$("#btnMobileClear").click(function(e){
    e.preventDefault();
    e.stopPropagation();
    clearAllSelection();
    return false;
});
$("#btnSearch").on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    pageContext.page = 1;
    executeWOSearch(false);
    return false;
});
$("#btnReset").on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    initPageComponents();
    $("#txtKeyword").val("");
    $("#chkGlobalSearch").prop("checked", false);
    pageContext.page = 1;
    selectedWOMap.clear();
    renderInitialState();
    setState(PageState.INITIAL);
    return false;
});
$("#btnClearSelection").on("click", function(e){
    e.preventDefault();
    e.stopPropagation();
    clearAllSelection();
    return false;
});
$("#btnSelectAllResult").click(function(){
    isSelectAllResult = true;
    excludedWOMap.clear();
    restoreSelection();
    updateWOSelection();
    // Langsung masuk mode Assign Multi
    setState(PageState.ASSIGN_MULTI);
    // Load employee bila belum ada
    loadEmployeeIfNeeded().then(function () {
        renderMultiState();
    });    
});
$("#ddlSection").change(function(){
    employeeLoaded = false;
    employeeSectionLoaded = "";
    employeeData = [];
    $("#employeeList").empty();
    $("#lblEmployeeCount").text("0");
});
$("input[name=assignMode]").change(async function(){
    if(getAssignMode()=="REMOVE"){
        await loadAssignedEmployeeSummary();
    }
    refreshEmployeeListByMode();
});
// $("#chkAllEmployee").on("change",function(){
//     $(".emp-check:not(:disabled)")
//         .prop("checked",this.checked);
//     refreshEmployeeSelectAll();
// });
$(document).on("click",".emp-preview",function(e){
    e.preventDefault();
    e.stopPropagation();
    const id=$(this).data("id");
    previewEmployeeWO(id);
});
$(document).on("change",".emp-check",function(){
    refreshEmployeeSelectAll();
});
$("#chkAllEmployee").off("change").on("change", function () {

        const checked = this.checked;

        $("#employeeList .emp-check:not(:disabled)")
            .prop("checked", checked);

        refreshEmployeeSelectAll();
        updateEmployeeCount();
});
$(document).on("click","#lnkToggleCompleted",function(e){
    e.preventDefault();
    $("#completedWOList").toggleClass("d-none");
    $(this).text(
        $("#completedWOList").hasClass("d-none")
        ?
        "Show completed Work Orders"
        :
        "Hide completed Work Orders"
    );
});
$(document).on(
    "click",
    ".completed-wo-item",
    function(){
        const keyHD=$(this).data("keyhd");
        flashWO(keyHD);
    }
);
// -----------------------------------------
// API WebMethod
// -----------------------------------------
async function saveAssignment(){
    if(hasCompletedWO()){
        showToast(
            "Completed Work Order cannot be assigned."
        );
        return;
    }
    let payload = {
        KeyHDList: isSelectAllResult ? [] : Array.from(selectedWOMap.keys()),
        ExcludedKeyHD: Array.from(excludedWOMap.keys()),        
        EmployeeList: getSelectedEmployee().map(a => a.EmployeeID)
    };
    const login = getLoginData();
    const V_SearchContext = 
    login.curcompany+";"+(searchContext.global ? "" : searchContext.section)+";"+
    (searchContext.global ? 0 : searchContext.year)+";"+
    (searchContext.global ? 0 : searchContext.week)+";"+
    (searchContext.global ? "" : searchContext.status)+";"+
    (searchContext.global ? "1" : "0")+";"+
    (searchContext.keyword)+";0;0;"+
    (isSelectAllResult ? "1" : "0")+";"+
    (payload.ExcludedKeyHD.length > 0 ? "1" : "0")

    payload = 
    {
        EmployeeList: payload.EmployeeList.join(';'),
        UpdateUser: login.employeeid,
        SearchContext:V_SearchContext,
        WOList: payload.KeyHDList.map(key => {
                return { KeyHD: key };
                }),
        WOListExcl: payload.ExcludedKeyHD.map(key => {
                return { KeyHD: key };
                }),
        Mode:getAssignMode()
    };

    const result = await promisifyPageMethod(
        PageMethods.SaveAssignment,
        JSON.stringify(payload)
    );
    if(!result.Success){
        showToast(result.Message);
        return;
    }
    showToast(result.Message);
    clearAllSelection();
    await executeWOSearch(true);
}
async function executeWOSearch(useCurrentContext = false) {
    try {
        if (!useCurrentContext) {
            captureSearchContext();
            // pageContext.page = 1;
        }
        employeeLoaded = false;
        employeeSectionLoaded = "";        

        if (searchContext.global && searchContext.keyword.trim() == "") {
            showToast("Untuk Global Search silahkan isi Keyword terlebih dahulu.");
            return;
        }

        if(!useCurrentContext){
            clearAllSelection();
        }        
        $("#employeePanel").addClass("d-none");
        $("#woPanel").removeClass("col-lg-8").addClass("col-12");

        $("#btnSearch").prop("disabled", true);
        const login = getLoginData();
        const payload = {
            CompanyID: login.curcompany.split(";")[0],
            LocationID: login.curcompany.split(";")[1],
            IsGlobalSearch: searchContext.global,
            Keyword: searchContext.keyword,
            Year: searchContext.global ? 0 : searchContext.year,
            Week: searchContext.global ? 0 : searchContext.week,
            Section: searchContext.global ? "" : searchContext.section,
            Status: searchContext.global ? "" : searchContext.status,
            Page: pageContext.page,
            PageSize: pageContext.pageSize
        };

        const result = await promisifyPageMethod(
            PageMethods.GetWorkOrderList,
            payload
        );

        if (!result.Success) {
            alert(result.Message);
            return;
        }

        // ---------- paging ----------
        pageContext.totalRecord=result.TotalRecord;
        pageContext.totalPage=result.TotalPage;
        pageContext.page=result.Page;
        pageContext.pageSize=result.PageSize;
        pageContext.totalAssigned=result.JumlahAssigned;
        totalCompletedWO = result.JumlahComplete || 0;

        // ---------- summary ----------
        $("#lblSummaryTotal").text(result.TotalRecord);
        $("#lblWOTotalBadge").text(result.TotalRecord);

        // ---------- render ----------
        if(!useCurrentContext){
            clearAllSelection();
        }        
        renderWOListToUI(result.ListWO);
        woLookup.clear();

        result.ListWO.forEach(function(wo){
            woLookup.set(wo.KeyHD, wo);
        });        
        renderPagination();
        updateWOSelection();
        setState(PageState.SEARCH_RESULT);
    }
    catch (ex) {
        console.error(ex);
        alert("Terjadi kesalahan saat mengambil Work Order.");
    }
    finally {
        $("#btnSearch").prop("disabled", false);
    }
}
async function loadEmployeeIfNeeded() {
    const currentSection = $("#ddlSection").val();

    if(employeeLoaded &&
       employeeSectionLoaded === currentSection){
        return;
    }

    const login = getLoginData();
    const payload = {
        CompanyID: login.curcompany.split(";")[0],
        LocationID: login.curcompany.split(";")[1],
        SectionID: currentSection
    };

    const result = await promisifyPageMethod(
        PageMethods.GetEmployee,
        payload
    );

    employeeData = result.Employee;
    $("#lblEmployeeCount").text(result.TotalEmp);
    employeeLoaded = true;
    employeeSectionLoaded = currentSection;
    employeeSortMode =
        $("#ddlEmployeeSort").val();    
}
async function loadAssignedEmployeeSummary(){
    captureSearchContext();
    const login = getLoginData();
    const payload = {
        CompanyID: login.curcompany.split(";")[0],
        LocationID: login.curcompany.split(";")[1],
        IsGlobalSearch: searchContext.global,
        Keyword: searchContext.keyword,
        Year: searchContext.global ? 0 : searchContext.year,
        Week: searchContext.global ? 0 : searchContext.week,
        Section: searchContext.global ? "" : searchContext.section,
        Status: searchContext.global ? "" : searchContext.status,
        Page: pageContext.page,
        PageSize: pageContext.pageSize
    };

    const result = await promisifyPageMethod(
        PageMethods.GetAssignedEmployeeSummary,
        payload
    );
    assignedEmployeeSummary = result.ListEmployee || [];
}
function sortEmployeeList(list){
    const arr = [...list];
    switch(employeeSortMode){
        case "NAME_ASC":
            arr.sort(function(a,b){
                return a.Name.localeCompare(b.Name);
            });
            break;
        case "NAME_DESC":
            arr.sort(function(a,b){
                return b.Name.localeCompare(a.Name);
            });
            break;
        case "WO_ASC":
            arr.sort(function(a,b){
                if(a.OutstandingCount!==b.OutstandingCount){
                    return a.OutstandingCount-b.OutstandingCount;
                }
                return a.Name.localeCompare(b.Name);
            });
            break;
        default:
            arr.sort(function(a,b){
                if(a.OutstandingCount!==b.OutstandingCount){
                    return b.OutstandingCount-a.OutstandingCount;
                }
                return a.Name.localeCompare(b.Name);
            });
            break;
    }
    return arr;
}
function getFilteredEmployee(){
    const keyword=$("#txtEmployeeSearch")
        .val()
        .trim()
        .toLowerCase();

    let list=[...employeeData];

    if(keyword!==""){

        list=list.filter(function(emp){

            return emp.EmployeeID
                    .toLowerCase()
                    .includes(keyword)

                ||

                emp.Name
                    .toLowerCase()
                    .includes(keyword);

        });

    }

    return sortEmployeeList(list);
}
function getMaxOutstandingWO(){
    if(employeeData.length===0)
        return 1;
    return Math.max.apply(
        null,
        employeeData.map(function(e){
            return e.OutstandingCount;
        })
    );
}
function getWorkloadPercent(count){
    const max=getMaxOutstandingWO();

    if(max===0)
        return 0;

    return Math.round(
        count*100/max
    );
}
function previewEmployeeWO(employeeId){
    clearAllSelection();
    let firstRow = null;
    $(".wo-record").removeClass("wo-highlight");
    $(".wo-record").each(function(){
        const row = $(this);
        const key = row.data("keyhd");
        const wo = woLookup.get(key);
        if(!wo)
            return;
        const exist =
            (wo.AssignedEmployee || []).some(function(emp){
                return emp.EmployeeID === employeeId;
            });
        if(!exist)
            return;
        row.addClass("wo-highlight");
        row.find(".wo-check")
            .prop("checked",true);
        selectedWOMap.set(
            wo.KeyHD,
            wo
        );
        if(firstRow==null)
            firstRow=row;
    });
    updateWOSelection();
    if(firstRow){
        $("html,body").animate({
            scrollTop:
                firstRow.offset().top
                -
                $(".sticky-bar-wrapper").outerHeight()
                -
                15
        },350);
    }
    showToast(
        selectedWOMap.size +
        " Work Order assigned to employee selected."
    );    
}
function highlightEmployeeWO(employeeId){
    $(".wo-record")
        .removeClass("wo-highlight");
    $(".wo-record").each(function(){
        const row=$(this);
        const key=row.data("keyhd");
        const wo=woLookup.get(key);
        if(!wo)
            return;
        const exist=
            (wo.AssignedEmployee||[])
            .some(function(emp){
                return emp.EmployeeID===employeeId;
            });
        if(exist){
            row.addClass("wo-highlight");
        }
    });
}
function refreshEmployeeSelectAll(){
    const total =
        $("#employeeList .emp-check:not(:disabled)").length;

    const checked =
        $("#employeeList .emp-check:not(:disabled):checked").length;

    $("#lblEmployeeSelected").text(checked);

    const chk = $("#chkAllEmployee")[0];

    if(!chk)
        return;

    chk.checked =
        total > 0 &&
        checked === total;

    chk.indeterminate =
        checked > 0 &&
        checked < total;
}
function getCompletedWOList(){
    let list=[];
    if(isSelectAllResult){
        woData.forEach(function(wo){
            if(wo.IsCompleteDC &&
               !excludedWOMap.has(wo.KeyHD)){
                list.push(wo);
            }
        });
    }else{
        selectedWOMap.forEach(function(wo){
            if(wo.IsCompleteDC){
                list.push(wo);
            }
        });
    }
    return list;
}
function showCompletedWO(){
    const list =
        getCompletedWOList();
    if(list.length===0)
        return;
    let html="";
    list.forEach(function(wo){
        html+=`
<div class="border-bottom py-2">
<div class="fw-semibold">
${wo.WONo}
</div>
<div class="small text-muted">
${wo.EquipmentName}
</div>
</div>
`;
    });
    showInformation({
        title:
            "Completed Work Orders",
        html:
            `<div style="max-height:350px;overflow:auto;">`
            +
            html
            +
            `</div>`
    });
}
function flashWO(keyHD){
    const row=$(".wo-record[data-keyhd='"+keyHD+"']");
    if(row.length===0)
        return;
    row.addClass("wo-flash");
    row[0].scrollIntoView({
        behavior:"smooth",
        block:"center"
    });
    setTimeout(function(){
        row.removeClass("wo-flash");
    },1700);
}
function isMobileAssignLayout(){
    return window.matchMedia(
        "(max-width: 991.98px)"
    ).matches;
}
function enterMobileEmployeeMode(){

    if(!isMobileAssignLayout())
        return;

    $("body")
        .addClass("mobile-employee-mode");

    /*
     * WO panel disembunyikan
     */
    $("#woPanel")
        .addClass("mobile-panel-hidden")
        .removeClass("col-12 col-lg-8");

    /*
     * Employee panel WAJIB visible
     */
    $("#employeePanel")
        .removeClass("d-none")
        .removeClass("mobile-panel-hidden")
        .addClass("col-12");

    /*
     * Pastikan panel benar-benar tampil.
     * Ini mengantisipasi parent/layout Bootstrap
     * yang sebelumnya masih membawa d-none.
     */
    $("#employeePanel").css({
        "display": "flex",
        "width": "100%",
        "max-width": "100%"
    });

    /*
     * Scroll ke employee panel
     */
    setTimeout(function(){

        const panel =
            document.getElementById("employeePanel");

        if(panel){

            panel.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });

        }

    },50);

}
function exitMobileEmployeeMode(){

    $("body")
        .removeClass("mobile-employee-mode");

    /*
     * Tampilkan kembali WO panel
     */
    $("#woPanel")
        .removeClass("mobile-panel-hidden")
        .removeClass("d-none")
        .addClass("col-12")
        .css({
            "display":"",
            "width":"",
            "max-width":""
        });

    /*
     * Sembunyikan Employee panel
     */
    $("#employeePanel")
        .addClass("d-none")
        .removeClass("mobile-panel-hidden")
        .css({
            "display":"",
            "width":"",
            "max-width":""
        });

}
function updateMobileAssignLayout(){
    if(!isMobileAssignLayout()){
        $("body")
            .removeClass("mobile-employee-mode");
        $("#woPanel,#employeePanel")
            .removeClass("mobile-panel-hidden");
        return;
    }
    /*
     * Jika employee panel sedang visible,
     * berarti sedang berada pada assignment step.
     */
    if(
        $("#employeePanel").is(":visible") &&
        !$("#employeePanel").hasClass("d-none")
    ){
        enterMobileEmployeeMode();
    }
}
function ensureMobileEmployeeBackButton(){
    if($("#mobileEmployeeBack").length)
        return;

    const button = `

<button
    type="button"
    id="mobileEmployeeBack"
    class="btn btn-sm btn-light border mobile-employee-back">

    <i class="bi bi-arrow-left"></i>
    Work Orders

</button>

`;
    $("#panelTitle").prepend(button);
}
$(document).on(
    "click",
    "#mobileEmployeeBack",
    function(e){

        e.preventDefault();

        e.stopPropagation();

        /*
         * Kembali ke WO list,
         * tapi selection tetap dipertahankan.
         */

        exitMobileEmployeeMode();

        $("#employeePanel")
            .addClass("d-none");

        $("#woPanel")
            .removeClass("mobile-panel-hidden")
            .removeClass("col-lg-8")
            .addClass("col-12");

        /*
         * Jangan clear selection!
         */

        restoreSelection();

        updateWOSelection();

        scrollToWOList();

    }
);

function scrollToEmployeePanelMobile(){

    if(window.innerWidth >= 992)
        return;

    const panel =
        document.getElementById("employeePanel");

    if(!panel)
        return;

    if(panel.classList.contains("d-none"))
        return;

    const stickyHeight =
        $(".sticky-bar-wrapper").outerHeight(true) || 0;

    const top =
        panel.getBoundingClientRect().top +
        window.pageYOffset -
        stickyHeight -
        12;

    window.scrollTo({
        top: Math.max(0, top),
        behavior:"smooth"
    });
}
function updateEmployeeCount() {

    const total =
        Array.isArray(employeeList)
            ? employeeList.length
            : 0;

    const selected =
        $("#employeeList .emp-check:checked").length;

    $("#lblEmployeeTotal").text(total);

    $("#lblEmployeeSelected").text(selected);

    $("#lblEmployeeListCount").text(total);
}
$("#employeeList").off("change", ".emp-check").on("change", ".emp-check", function () {

        updateEmployeeCount();

        const total =
            $("#employeeList .emp-check").length;

        const checked =
            $("#employeeList .emp-check:checked").length;

        $("#chkAllEmployee").prop(
            "checked",
            total > 0 && checked === total
        );

        $("#chkAllEmployee").prop(
            "indeterminate",
            checked > 0 && checked < total
        );
    });
function disposeAllEmployeePopovers() {
    document
        .querySelectorAll('[data-bs-toggle="popover"]')
        .forEach(function (el) {

            const instance =
                bootstrap.Popover.getInstance(el);

            if (instance) {
                instance.dispose();
            }
        });

    // Bersihkan popover yang sudah terlanjur
    // dibuat Bootstrap di body
    document
        .querySelectorAll(".popover")
        .forEach(function (el) {
            el.remove();
        });
}
