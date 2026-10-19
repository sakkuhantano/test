// let lblFactor = null;
// const lblMaxDigits = document.getElementById('lblMaxDigits');
let companyId = "";
let locationId = "";
let currentType = "";
let currentMeter = null;
let currentMeterIndex = -1;
let currentSort = "MeterNo";
let formDirty = false;
//====================================================
// GLOBAL STATE
//====================================================
let meterList = [];
let filteredMeter = [];
let currentPage = 1;
const pageSize = 20;
let currentKeyword = "";
let currentStatus = "";
let currentPhotoBlob = null;
let currentPhotoFileName = "";
let currentPhotoUrl = null;
let isDetailMode = false;
let highlightedMeter=-1;
let sortAsc=true;
let lastOpenedMeter=null;
let isProcessingBarcode = false;
let scannerSession = 0;
let isScannerActive = false;
// let html5QrCode=null;

function highlightLastOpenedMeter(){

    if(!lastOpenedMeter)
        return;

    const row=$("#row_"+lastOpenedMeter);

    if(!row.length)
        return;

    scrollToMeterRow(row);

    row.addClass("table-primary flash-row");

    setTimeout(function(){

        row.removeClass("table-primary flash-row");

    },2000);

}
function showListMode() {
    isDetailMode = false;
    $("#pnlMeterList").show();
    $("#pnlMeterDetail").hide();
    showPageSticky(true);
    if(!lastOpenedMeter)
        return;

    const row=$("#row_"+lastOpenedMeter);
    highlightLastOpenedMeter();
}

function showDetailMode() {
    isDetailMode = true;
    $("#pnlMeterList").hide();
    $("#pnlMeterDetail").show();
    showPageSticky(false);
    setTimeout(function () {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }, 50);    
    // document
    //     .getElementById("pnlMeterDetail")
    //     .scrollIntoView({
    //         behavior: "smooth",
    //         block: "start"
    //     });
}

// State management for multiple inputs
const readingState = {
    'LWBP': {
        txtPrev: document.getElementById('txtPrevReadingLWBP'),
        txtCurr: document.getElementById('txtCurrentReadingLWBP'),
        lblUsage: document.getElementById('lblUsageLWBP'),
        lblActual: document.getElementById('lblActualUsageLWBP'),
        alert: document.getElementById('alertRolloverLWBP'),
        isRolloverConfirmed: false
    },
    'WBP': {
        txtPrev: document.getElementById('txtPrevReadingWBP'),
        txtCurr: document.getElementById('txtCurrentReadingWBP'),
        lblUsage: document.getElementById('lblUsageWBP'),
        lblActual: document.getElementById('lblActualUsageWBP'),
        alert: document.getElementById('alertRolloverWBP'),
        isRolloverConfirmed: false
    },
    'REG': {
        txtPrev: document.getElementById('txtPrevReading'),
        txtCurr: document.getElementById('txtCurrentReading'),
        lblUsage: document.getElementById('lblUsage'),
        lblActual: document.getElementById('lblActualUsage'),
        alert: document.getElementById('alertRollover'),
        isRolloverConfirmed: false
    },
};

// Modal elements
const modal = document.getElementById('modalRollover');
const modalBeginning = document.getElementById('modalBeginning');
const modalEnding = document.getElementById('modalEnding');
const modalCalcUsage = document.getElementById('modalCalcUsage');
const modalMaxVal = document.getElementById('modalMaxVal');

let activeType = null;

document.addEventListener("DOMContentLoaded",function () {
    currentType = getQueryString("type");
    if(!validatePageAccess(currentType))
        return;
    if (currentType === "WTR")
        currentType = "AIR";
    document.addEventListener("dbReady", async function () {
        // const dataMeter = await getOneByCompanyLocation(companyId, locationId);
        // if (dataMeter && dataMeter.Period) {
        //     ddlPeriod.innerHTML = `<option value="${formatPeriodeTeks(dataMeter.Period)}" selected>${formatPeriodeTeks(dataMeter.Period)}</option>`;
        // } else {
        //     ddlPeriod.innerHTML = `<option value=""></option>`;
        // }
        $("#ddlPeriod").html(
        '<option>'+
        formatMsDate(new Date(getLoginData().lastMeterPeriod))+
        '</option>'
        );        
        [companyId, locationId] = getLoginData().curcompany.split(";");
        ddlPeriod.disabled = true;
        await loadMeterList();
    }, { once:true });
    // Add event listeners for both inputs
    readingState['LWBP'].txtCurr.addEventListener('input', () => calculateUsage('LWBP'));
    readingState['WBP'].txtCurr.addEventListener('input', () => calculateUsage('WBP'));
    readingState['REG'].txtCurr.addEventListener('input', () => calculateUsage('REG'));
    refreshPageTitle();
    resetForm();
    // showListMode();
});
function getTopFixedHeight(){

    let h = 0;

    h += $(".navbar.fixed-top").outerHeight(true) || 0;
    h += $(".sticky-bar-wrapper:visible").outerHeight(true) || 0;

    return h;
}
function scrollToListTop(){

    const sticky =
        $(".sticky-bar-wrapper").outerHeight(true) || 0;

    $("html,body").animate({

        scrollTop:
            $("#meterListTop").offset().top
            - sticky
            - 8

    },250);

}
function scrollToMeterRow(row){

    const top =
        row.offset().top
        - getTopFixedHeight()
        - 60;

    $("html, body").animate({
        scrollTop: top
    },300);

}
function highlightCurrentRow(){

    $("#tblMeterBody tr")
        .removeClass("table-primary flash-row");

    if(highlightedMeter<0)
        return;

    const meter=filteredMeter[highlightedMeter];

    if(!meter)
        return;

    const row=$("#row_"+meter.MeterNo);

    if(!row.length)
        return;

    scrollToMeterRow(row);

    row.addClass("table-primary flash-row");

}
function refreshMeterStatusBadge(status) {

    let css = "bg-secondary";
    let icon = "bi-question-circle";
    let text = status || "-";

    switch (status) {

        case "NEW":

            css = "bg-primary";
            icon = "bi-plus-circle";
            break;

        case "REOPENED":

            css = "bg-info text-dark";
            icon = "bi-arrow-counterclockwise";
            break;

        case "DRAFT":

            css = "bg-warning text-dark";
            icon = "bi-pencil-square";
            break;


        case "SYNCED":

            css = "bg-success";
            icon = "bi-cloud-check";
            break;

        case "ERROR":

            css = "bg-danger";
            icon = "bi-exclamation-triangle";
            break;

    }

    $("#lblStatus")
        .removeClass()
        .addClass("badge " + css)
        .html(
            '<i class="bi ' +
            icon +
            ' me-1"></i>' +
            text
        );

}
// function showScannerMode(){
//     $("#pnlMeterList").hide();
//     $("#pnlMeterDetail").hide();
//     $("#pnlBarcodeScan").show();
//     showPageSticky(false);
// }

function hideScannerMode(){
    isScannerActive = false;
    // invalidate semua callback scanner yang masih tertinggal
    scannerSession++;    
    $("#pnlBarcodeScan").hide();
    $("#pnlMeterList").show();
    showPageSticky(true);
    // await stopBarcode();
}
function renderMeterList() {
    const tbody = $("#tblMeterBody");

    tbody.empty();

    $("#lblRecordCount").text(filteredMeter.length + " Records");
    $("#lblTotalMeter").text(filteredMeter.length);

    if (filteredMeter.length == 0) {

        $("#divNoMeter").show();
        return;

    }

    $("#divNoMeter").hide();

    //------------------------------------------------
    // paging
    //------------------------------------------------

    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredMeter.length);

    for (let i = start; i < end; i++) {

        const m = filteredMeter[i];

        tbody.append(buildMeterRow(m, i));

    }

    renderPager();
    highlightedMeter=
        filteredMeter.length
            ?0
            :-1;

    // highlightCurrentRow();    
}
function renderPager() {

    const totalPage = Math.ceil(filteredMeter.length / pageSize);

    const pagers=$("#meterPager,#meterPagerTop");

    pagers.empty();

    if (totalPage <= 1)
        return;

    function add(page, text, active, disabled) {

        pagers.append(`
<li class="page-item ${active ? "active" : ""} ${disabled ? "disabled" : ""}">
    <a href="#"
       class="page-link meter-page"
       data-page="${page}">
        ${text}
    </a>
</li>`);

    }

    //---------------------------------------
    // FIRST
    //---------------------------------------

    add(1,"«",false,currentPage==1);

    //---------------------------------------
    // PREV
    //---------------------------------------

    add(currentPage-1,"‹",false,currentPage==1);

    //---------------------------------------
    // PAGE WINDOW
    //---------------------------------------

    const windowSize = 2;

    let start =
        Math.max(
            1,
            currentPage-windowSize
        );

    let end =
        Math.min(
            totalPage,
            currentPage+windowSize
        );

    //---------------------------------------
    // leading ...
    //---------------------------------------

    if(start>1){

        add(1,"1");

        if(start>2){

            pagers.append(`
<li class="page-item disabled">
<span class="page-link">...</span>
</li>`);

        }

    }

    //---------------------------------------
    // page
    //---------------------------------------

    for(let i=start;i<=end;i++){

        add(
            i,
            i,
            i==currentPage,
            false
        );

    }

    //---------------------------------------
    // trailing ...
    //---------------------------------------

    if(end<totalPage){

        if(end<totalPage-1){

            pagers.append(`
<li class="page-item disabled">
<span class="page-link">...</span>
</li>`);

        }

        add(
            totalPage,
            totalPage
        );

    }

    //---------------------------------------
    // NEXT
    //---------------------------------------

    add(
        currentPage+1,
        "›",
        false,
        currentPage==totalPage
    );

    //---------------------------------------
    // LAST
    //---------------------------------------

    add(
        totalPage,
        "»",
        false,
        currentPage==totalPage
    );

    renderPagerInfo();

}
function sortMeter(){
    meterList.sort(function(a,b){

        let x=a[currentSort]||"";
        let y=b[currentSort]||"";

        x=x.toString();
        y=y.toString();

        let r=x.localeCompare(y);

        return sortAsc ? r : -r;

    });
}
function renderPagerInfo() {

    if(filteredMeter.length==0){

        $("#pagerInfo,#pagerInfoTop").text(
            "No record"
        );

        return;

    }

    const from =
        (currentPage-1)*pageSize+1;

    const to =
        Math.min(
            currentPage*pageSize,
            filteredMeter.length
        );

    $("#pagerInfo,#pagerInfoTop").text(

        "Showing "

        + from

        + " - "

        + to

        + " of "

        + filteredMeter.length

        + " meter(s)"

    );

}
function buildMeterRow(m, index) {
const rowNo =
    (currentPage-1)*pageSize
    + index
    + 1;    
return `
<tr
    id="row_${m.MeterNo}"
    data-meter="${m.MeterNo}"
    class="meter-row">

<td class="text-center">

${rowNo}

</td>

<td>

<div class="fw-semibold">
${markKeyword(m.MeterNo)}
</div>

<div class="small text-muted">
${getReadingHtml(m)}
</div>

</td>

<td>

${m.RateGroup||"-"}

</td>

<td>

<div>${markKeyword(m.TenantName)}</div>

<div class="small text-muted">
${m.TenantID + ' ' + m.SuiteNo}
</div>

</td>

<td class="meter-status">

${getStatusBadgeHtml(m)}

</td>

</tr>
`;
}
function getStatusBadgeHtml(m){
    switch(m.Status){

        case "NEW":

            return `<span class="badge bg-primary">NEW</span>`;

        case "REOPENED":

            return `<span class="badge bg-info">REOPENED</span>`;

        case "DRAFT":

            return '<span class="badge bg-warning text-dark">DRAFT</span>';

        case "SYNCED":

            return '<span class="badge bg-success">SYNCED</span>';

        case "ERROR":
            return `
            <span
            class="badge bg-danger"
            title="${m.SyncErrorMessage||''}">
            ERROR
            </span>`;

        default:

            return '<span class="badge bg-secondary">-</span>';

    }
}
function getReadingHtml(m){

    if(m.Flag=="Y"){

        return `
LWBP : ${m.Ending1||"-"}<br>
WBP : ${m.Ending2||"-"}
`;

    }

    return m.Ending1 || "-";

}
function getSyncIconHtml(m){

    switch(m.Status){

        case "DRAFT":

            return '<i class="bi bi-cloud-upload text-warning"></i>';

        case "SYNCED":

            return '<i class="bi bi-cloud-check text-success"></i>';

        case "ERROR":

            return '<i class="bi bi-exclamation-triangle text-danger"></i>';

        default:

            return "";

    }

}
function refreshPageTitle() {
    let title="Meter Reading";
    switch(currentType){
        case "ELC":
            title="Electric Meter Reading";
            break;
        case "AIR":
            title="Water Meter Reading";
            break;
        case "GAS":
            title="Gas Meter Reading";
            break;
    }
    $("#pageTitle").text(title);
}
function getMeterMaxValue(beginning){
    const digits = Math.max(beginning.toString().length,1);
    return parseInt("9".repeat(digits));
}
function calculateUsage(type) {
    const state = readingState[type];

    const beginning =
        Number(state.txtPrev.value) || 0;

    // const ending =
    //     Number(state.txtCurr.value);
    const ending =
        state.txtCurr.value.trim()===""
            ? NaN
            : Number(state.txtCurr.value);

    const factor =
        Number(lblFactor.getAttribute("data-factor")) || 1;

    if(isNaN(ending)){

        state.lblUsage.textContent="0";
        state.lblActual.textContent="0";

        state.alert.classList.add("d-none");
        state.alert.classList.remove("d-flex");
        state.lblUsage.classList.remove("text-danger");

        state.isRolloverConfirmed=false;

        return;

    }

    //----------------------------------------
    // rollover belum confirm
    //----------------------------------------

    if(
        ending<beginning &&
        !state.isRolloverConfirmed
    ){

        state.alert.classList.remove("d-none");
        state.alert.classList.add("d-flex");

        state.lblUsage.textContent="???";
        state.lblActual.textContent="???";

        state.lblUsage.classList.add("text-danger");

        return;

    }

    state.alert.classList.add("d-none");
    state.alert.classList.remove("d-flex");

    const usage =
        calculateMeterUsage(
            beginning,
            ending
        );

    updateDisplay(
        state,
        usage,
        factor
    );
}

function updateDisplay(state, usage, factor) {
    state.lblUsage.classList.remove('text-danger');
    state.lblUsage.textContent = usage.toFixed(0);
    state.lblActual.textContent = (usage * factor).toFixed(2);
}

function triggerRolloverModal(type) {
    activeType = type;
    const state = readingState[type];
    const beginning = parseFloat(state.txtPrev.value) || 0;
    const ending = parseFloat(state.txtCurr.value) || 0;
    //const maxVal = parseFloat(lblMaxDigits.getAttribute('data-max')) || 99999;
    const maxVal = getMeterMaxValue(beginning);
        
    modalBeginning.textContent = beginning;
    modalEnding.textContent = ending;
    modalMaxVal.textContent = maxVal;
        
    const calcUsage = (maxVal - beginning + 1) + ending;
    modalCalcUsage.textContent = calcUsage;
        
    modal.style.display = 'block';
}

function closeRolloverModal(confirmed) {
    modal.style.display = 'none';
    if (activeType) {
        if (confirmed) {
            readingState[activeType].isRolloverConfirmed = true;
            calculateUsage(activeType);
        } else {
            readingState[activeType].txtCurr.value = '';
            readingState[activeType].txtCurr.focus();
            calculateUsage(activeType);
        }
    }
}


function validatePageAccess(type) {
    const role = getLoginData().role;    
    if (
        (!role.IsELC && type === "ELC") ||
        (!role.IsWTR && type === "WTR") ||
        (!role.IsGAS && type === "GAS")
       ) {
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
    return true;
}

function resetForm() {
    clearDirty();    
    currentMeter = null;
    currentPhotoBlob = null;
    currentPhotoFileName = "";
    currentMeterIndex = -1;
    refreshPhotoUI();
    $("#imgMeterPhoto").hide();
    $("#photoPlaceholder i").show();
    $("#photoPlaceholder span").show();
    $("#btnPreviewPhoto").prop("disabled",true);    
    $("#btnRetakePhoto").hide();

    hdnMeterNo.value = "";
    hdnFlag.value = "";
    hdnType.value = "";

    lblMeterNo.textContent = "-";
    lblTenantId.textContent = "-";
    lblTenantName.textContent = "-";
    lblSuite.textContent = "-";
    lblFactor.textContent = "-";
    lblRateGroup.textContent = "-";
    $('.recordLastUpdated').text("-");

    refreshMeterStatusBadge();

    txtPrevReadingLWBP.value = "";
    txtCurrentReadingLWBP.value = "";

    txtPrevReadingWBP.value = "";
    txtCurrentReadingWBP.value = "";

    txtPrevReading.value = "";
    txtCurrentReading.value = "";

    lblUsageLWBP.textContent = "-";
    lblActualUsageLWBP.textContent = "-";

    lblUsageWBP.textContent = "-";
    lblActualUsageWBP.textContent = "-";

    lblUsage.textContent = "-";
    lblActualUsage.textContent = "-";

    txtRemarks.value = "";

    readingState.LWBP.isRolloverConfirmed = false;
    readingState.WBP.isRolloverConfirmed = false;

    btnSaveBottom.disabled = true;
    if (currentPhotoUrl) {
        URL.revokeObjectURL(currentPhotoUrl);
        currentPhotoUrl = null;
    }    
    setDetailReadOnly(false);
}
async function loadMeterList(resetPage = true) {
    $("#divLoadingMeter").show();
    $("#divNoMeter").hide();
    try {
        meterList = await getMeterList();
        filteredMeter = meterList.slice();
        if(resetPage)
            currentPage = 1;
        renderMeterList();
    }
    finally {
        $("#divLoadingMeter").hide();
    }
}
function applyFilter() {

    const keyword =
        currentKeyword.trim().toLowerCase();

    filteredMeter = meterList.filter(function (m) {

        //---------------------------------
        // TYPE
        //---------------------------------

        if (m.Type != currentType)
            return false;

        //---------------------------------
        // STATUS
        //---------------------------------

        if (currentStatus != "") {

            if (m.Status != currentStatus)
                return false;

        }

        //---------------------------------
        // KEYWORD
        //---------------------------------

        if (keyword == "")
            return true;

        return (

            (m.MeterNo || "")
                .toLowerCase()
                .indexOf(keyword) >= 0

            ||

            (m.TenantID || "")
                .toLowerCase()
                .indexOf(keyword) >= 0

            ||

            (m.TenantName || "")
                .toLowerCase()
                .indexOf(keyword) >= 0

            ||

            (m.SuiteNo || "")
                .toLowerCase()
                .indexOf(keyword) >= 0

        );

    });

    currentPage = 1;

    renderMeterList();
    refreshSummary();

}
async function getMeterList() {
    return new Promise((resolve, reject) => {
        let tx = db.transaction(["meter"], "readonly");
        let store = tx.objectStore("meter");
        let index = store.index("by_period");
        let range = IDBKeyRange.bound(
            [companyId, locationId],
            [companyId, locationId, []]
        );
        let req = index.getAll(range);
        req.onsuccess = function (e) {
            let rows = e.target.result || [];
            rows = rows.filter(function (x) {
                return x.Type == currentType;
            });            
            rows.sort(function (a, b) {
                return a.MeterNo.localeCompare(b.MeterNo);
            });
            resolve(rows);
        };
        req.onerror = function (e) {
            reject(e.target.error);
        };
    });
}
function refreshPhotoUI() {

    const hasPhoto =
        !!currentPhotoBlob;

    const readOnly =
        currentMeter &&
        (
            currentMeter.Status != "NEW" ||
            currentMeter.Terminated === "Y" ||
            currentMeter.Terminated === true
        );

    //-----------------------------------
    // Retake hanya jika:
    // - ada foto
    // - belum SYNCED
    // - belum Terminated
    //-----------------------------------

    $("#btnRetakePhoto").toggle(
        hasPhoto && !readOnly
    );

    //-----------------------------------
    // Cursor
    //-----------------------------------

    $("#photoPlaceholder")
        .toggleClass("clickable", !readOnly)
        .css(
            "cursor",
            readOnly ? "default" : "pointer"
        );

}
function openMeter(meterNo) {

    const meter = meterList.find(function (x) {

        return x.Type == currentType &&
               String(x.MeterNo).trim() ==
               String(meterNo).trim();

    });

    if (!meter)
        return;

    resetForm();

    currentMeter = meter;

    bindMeterToForm(currentMeter);

    //------------------------------------
    // Meter status
    //------------------------------------

    const readOnly =
        isMeterReadOnly(currentMeter);

    if (
        currentMeter.Terminated === true ||
        String(currentMeter.Terminated || "")
            .trim()
            .toUpperCase() === "Y"
    ) {

        $("#btnSaveBottom").hide();

        showToast(
            "Meter has been terminated.",
            "warning"
        );

    }
    else {

        $("#btnSaveBottom").show();

    }

    //------------------------------------
    // Photo
    //------------------------------------

    refreshPhotoUI();

    //------------------------------------
    // Detail mode
    //------------------------------------

    showDetailMode();

    //------------------------------------
    // Apply readonly + save state
    //------------------------------------

    setDetailReadOnly(readOnly);

    refreshSaveButton();

    //------------------------------------
    // Remember last opened meter
    //------------------------------------

    lastOpenedMeter = meterNo;
}
function focusAndSelect(ctrl) {
    if (!ctrl)
        return;

    setTimeout(function () {

        ctrl.focus();

        if (ctrl.select)
            ctrl.select();

    }, 50);
}
function bindMeterToForm(meter) {
    lblMeterNo.textContent = meter.MeterNo;
    lblTenantId.textContent = meter.TenantID;
    lblTenantName.textContent = meter.TenantName;
    lblSuite.textContent = meter.SuiteNo;
    $('.recordLastUpdated').text(formatMsDate(meter.LastUpdate));
    // lblUpdateDate.textContent = formatMsDate(meter.LastUpdate);

    lblFactor.textContent = meter.MeterFactor;
    lblFactor.setAttribute("data-factor", meter.MeterFactor);

    lblRateGroup.textContent = meter.RateGroup;

    hdnMeterNo.value = meter.MeterNo;
    hdnType.value = meter.Type;
    hdnFlag.value = meter.Flag;

    txtRemarks.value = meter.Remark || "";
    txtRemarks.disabled = (currentMeter.Status === "SYNCED" ||
                           currentMeter.Terminated === "Y" ||
                           currentMeter.Terminated === true);

    //------------------------------------
    // STATUS
    //------------------------------------

    refreshMeterStatusBadge(meter.Status);

    //------------------------------------
    // PHOTO
    //------------------------------------

    currentPhotoBlob = meter.Blob || null;
    currentPhotoFileName = meter.FileName || "";

    if (currentPhotoBlob) {

        // const url = URL.createObjectURL(currentPhotoBlob);
        setPhotoPreview(currentPhotoBlob);

        // $("#imgMeterPhoto")
        //     .attr("src", url)
        //     .show();

        $("#photoPlaceholder").show();

        $("#btnPreviewPhoto")
            .prop("disabled", false);

    }
    else {

        $("#imgMeterPhoto").hide();
        // $("#photoPlaceholder i").show();
        // $("#photoPlaceholder span").show();

        // $("#photoPlaceholder").hide();

        $("#btnPreviewPhoto")
            .prop("disabled", true);

    }

    if (meter.Type === "ELC") {

        $("#div_lwbp").show();
        $("#div_singleMeter").hide();

        if (meter.Flag === "Y") {

            $("#div_wbp").show();

        }
        else {

            $("#div_wbp").hide();

        }
        txtPrevReadingLWBP.value = meter.Beginning1 || "";
        txtCurrentReadingLWBP.value = meter.Ending1 || "";

        txtPrevReadingWBP.value = meter.Beginning2 || "";
        txtCurrentReadingWBP.value = meter.Ending2 || "";

        calculateUsage("LWBP");
        calculateUsage("WBP");

    }
    else {

        $("#div_lwbp").hide();
        $("#div_wbp").hide();
        $("#div_singleMeter").show();

        txtPrevReading.value = meter.Beginning1 || "";
        txtCurrentReading.value = meter.Ending1 || "";

        calculateUsage("REG");
    }
    setTimeout(function () {
        if (meter.Type == "ELC") {
            focusAndSelect(txtCurrentReadingLWBP);
        }
        else {
            focusAndSelect(txtCurrentReading);
        }
    },100);
}
function refreshSaveButton() {

    if (!currentMeter) {

        btnSaveBottom.disabled = true;

        setDetailReadOnly(true);

        return;
    }

    //------------------------------------
    // Check readonly state
    //------------------------------------

    const readOnly =
        isMeterReadOnly(currentMeter);

    setDetailReadOnly(readOnly);

    //------------------------------------
    // Meter sudah tidak boleh diedit
    //------------------------------------

    if (readOnly) {

        btnSaveBottom.disabled = true;

        return;
    }

    //------------------------------------
    // Validasi input lengkap
    //------------------------------------

    let complete = false;

    if (currentMeter.Type === "ELC") {

        if (currentMeter.Flag === "Y") {

            complete =
                txtCurrentReadingLWBP.value.trim() !== "" &&
                txtCurrentReadingWBP.value.trim() !== "";

        }
        else {

            complete =
                txtCurrentReadingLWBP.value.trim() !== "";

        }

    }
    else {

        complete =
            txtCurrentReading.value.trim() !== "";

    }

    //------------------------------------
    // Enable Save
    //------------------------------------

    if (currentMeter.Status !== "NEW") {

        btnSaveBottom.disabled = false;

    }
    else {

        btnSaveBottom.disabled =
            !(formDirty && complete);

    }
}
function isMeterReadOnly(meter) {

    if (!meter)
        return true;

    const status =
        String(meter.Status || "")
            .trim()
            .toUpperCase();

    const terminated =
        meter.Terminated === true ||
        String(meter.Terminated || "")
            .trim()
            .toUpperCase() === "Y";

    return (
        status === "SYNCED" ||
        terminated
    );
}
function updateCurrentMeter() {
    currentMeter.Remark = txtRemarks.value.trim();
    currentMeter.Blob = currentPhotoBlob;
    currentMeter.FileName = currentPhotoFileName;

    if (currentMeter.Type == "ELC") {
        currentMeter.Ending1 =
            txtCurrentReadingLWBP.value===""
                ? null
                : Number(txtCurrentReadingLWBP.value);
        if (currentMeter.Flag == "Y") {
            currentMeter.Ending2 =
                txtCurrentReadingWBP.value===""
                    ? null
                    : Number(txtCurrentReadingWBP.value);
            currentMeter.Usage2 =
                calculateMeterUsage(
                    currentMeter.Beginning2,
                    currentMeter.Ending2
                );
        }
        else {
            currentMeter.Usage2 = 0;
        }
    }
    else {
        currentMeter.Ending1 =
            txtCurrentReading.value===""
                ? null
                : Number(txtCurrentReading.value);
        currentMeter.Usage2 = 0;
    }
    currentMeter.Usage1 =
        calculateMeterUsage(
            currentMeter.Beginning1,
            currentMeter.Ending1
        );
}
function validateMeter() {

    if (!currentMeter) {
        showToast("No meter selected.", "warning");
        return false;
    }

    //------------------------------------------------
    // PHOTO
    //------------------------------------------------

    // if (!currentPhotoBlob) {
    //     showToast("Please capture meter photo.", "warning");
    //     document.getElementById("photoPlaceholder")
    //         .scrollIntoView({
    //             behavior:"smooth",
    //             block:"center"
    //         });        
    //     $("#photoPlaceholder").addClass("shake");
    //     setTimeout(function(){
    //         $("#photoPlaceholder").removeClass("shake");
    //     },2000);
    //     $("#photoPlaceholder").removeClass("shake");
    //     return false;
    // }

    //------------------------------------------------
    // READING
    //------------------------------------------------
    if (currentMeter.Type == "ELC") {

        if ($("#txtCurrentReadingLWBP").val().trim() == "") {

            showToast(
                "Please enter LWBP reading.",
                "warning"
            );

            focusAndSelect(txtCurrentReadingLWBP);

            return false;

        }

        if (
            currentMeter.Flag == "Y" &&
            $("#txtCurrentReadingWBP").val().trim() == ""
        ) {

            showToast(
                "Please enter WBP reading.",
                "warning"
            );

            focusAndSelect(txtCurrentReadingWBP);

            return false;

        }

        if(
            txtCurrentReadingLWBP.value <
            txtPrevReadingLWBP.value &&
            !readingState.LWBP.isRolloverConfirmed
        ){

            showToast(
                "Please confirm LWBP rollover.",
                "warning"
            );

            triggerRolloverModal("LWBP");

            return false;

        }        

        if(
            txtCurrentReadingWBP.value <
            txtPrevReadingWBP.value &&
            !readingState.WBP.isRolloverConfirmed
        ){

            showToast(
                "Please confirm WBP rollover.",
                "warning"
            );

            triggerRolloverModal("WBP");

            return false;

        }        

    }
    else {

        if ($("#txtCurrentReading").val().trim() == "") {

            showToast(
                "Please enter meter reading.",
                "warning"
            );

            focusAndSelect(txtCurrentReading);

            return false;

        }
        if(
            txtCurrentReading.value <
            txtPrevReading.value &&
            !readingState.REG.isRolloverConfirmed
        ){

            showToast(
                "Please confirm rollover.",
                "warning"
            );

            triggerRolloverModal("REG");

            return false;

        }

    }
    if(
        (txtRemarks || '').length >
        500
    ){
        showToast(
            "Remark max length is 500",
            "warning"
        );

        focusAndSelect(txtRemarks);

        return false;
    }
    return true;

}
function prepareStatusBeforeSave() {

    switch (currentMeter.Status) {

        case "NEW":
        case "REOPENED":
        case "SYNCED":
        case "ERROR":

            currentMeter.Status = "DRAFT";
            break;

        case "DRAFT":
            break;
    }

}
function updateListCache(meter) {

    const idx = meterList.findIndex(function (x) {

        return x.CompanyID == meter.CompanyID &&
               x.LocationID == meter.LocationID &&
               x.Type == meter.Type &&
               x.Period == meter.Period &&
               x.MeterNo == meter.MeterNo;

    });

    if (idx >= 0) {

        meterList[idx] = meter;

    }

}
function refreshCurrentRow(meter){
    const idx=filteredMeter.findIndex(function(x){
        return x.Type==meter.Type &&
               String(x.MeterNo).trim()==String(meter.MeterNo).trim();
    });    

    row.replaceWith(
        buildMeterRow(
            meter,
            idx
        )
    );
}
function markDirty() {
    if (!currentMeter)
        return;
    formDirty = true;
    refreshSaveButton();
    refreshDirtyIndicator();
}
function clearDirty() {
    formDirty = false;
    refreshDirtyIndicator();
}

function setPhotoPreview(blob) {

    //------------------------------------
    // revoke url lama
    //------------------------------------

    if (currentPhotoUrl) {

        URL.revokeObjectURL(currentPhotoUrl);

        currentPhotoUrl = null;

    }

    //------------------------------------
    // buat url baru
    //------------------------------------

    currentPhotoUrl =
        URL.createObjectURL(blob);

    $("#imgMeterPhoto")
        .attr("src", currentPhotoUrl)
        .show();
    $("#photoPlaceholder i").hide();
    $("#photoPlaceholder span").hide();
    $("#btnRetakePhoto").show();

    // $("#btnPreviewPhoto")
    //     .prop("disabled", false);

}
function refreshDirtyIndicator(){

    let title;

    switch(currentType){

        case "ELC":
            title="Electric Meter Reading";
            break;

        case "AIR":
            title="Water Meter Reading";
            break;

        case "GAS":
            title="Gas Meter Reading";
            break;

        default:
            title="Meter Reading";

    }

    if(formDirty)
        title+=" *";

    $("#pageTitle").text(title);

}
function refreshSummary(){

    let n=0;
    let d=0;
    let s=0;
    let e=0;

    filteredMeter.forEach(function(x){

        switch(x.Status){

            case "NEW":
                n++;
                break;

            case "DRAFT":
                d++;
                break;

            case "SYNCED":
                s++;
                break;

            case "ERROR":
                e++;
                break;

        }

    });

    $("#lblRecordCount").text(filteredMeter.length+" Meter");
    $("#lblNewCount").text("NEW "+n);
    $("#lblDraftCount").text("DRAFT "+d);
    $("#lblSyncedCount").text("SYNCED "+s);
    $("#lblErrorCount").text("ERROR "+e);

}
function calculateMeterUsage(beginning, ending){
    beginning = Number(beginning) || 0;
    ending    = Number(ending) || 0;
    if(ending >= beginning){
        return ending - beginning;
    }
    const maxVal = getMeterMaxValue(beginning);
    return (maxVal - beginning + 1) + ending;
}
function setDetailReadOnly(readOnly) {

    $("#txtCurrentReading")
        .prop("readonly", readOnly);

    $("#txtCurrentReadingLWBP")
        .prop("readonly", readOnly);

    $("#txtCurrentReadingWBP")
        .prop("readonly", readOnly);

    $("#txtRemarks")
        .prop("readonly", readOnly);

    // Optional: photo tidak boleh diubah jika sudah SYNCED
    $("#fileCamera")
        .prop("disabled", readOnly);

    $("#btnRetakePhoto")
        .prop("disabled", readOnly);
}
async function saveMeter() {
    if (!currentMeter)
        return;
    const latest = await getMeterByKey(
        currentMeter.CompanyID,
        currentMeter.LocationID,
        currentMeter.Type,
        currentMeter.MeterNo
    );
    if(
        latest &&
        latest.Status === "SYNCED"
    ){

        showToast(
            "Meter reading has already been synchronized.",
            "warning"
        );

        currentMeter.Status = "SYNCED";

        refreshMeterStatusBadge();

        refreshPhotoUI();

        refreshSaveButton();

        return;

    }    
    if(latest.Terminated){
        showToast(
            "This meter has been terminated.",
            "danger"
        );
        return;
    }

    btnSaveBottom.disabled = true;
    btnSaveBottom.innerHTML=
    `
    <span class="spinner-border spinner-border-sm"></span>
    Saving...
    `;
    try {

        //------------------------------------------------
        // VALIDASI
        //------------------------------------------------

        if (!validateMeter())
            return;

        //------------------------------------------------
        // COPY FORM -> OBJECT
        //------------------------------------------------

        updateCurrentMeter();

        //------------------------------------------------
        // PREPARE STATUS
        //------------------------------------------------

        prepareStatusBeforeSave();

        //------------------------------------------------
        // UPDATE DATE
        //------------------------------------------------

        // currentMeter.UpdateDate =
        //     new Date().toISOString();

        //------------------------------------------------
        // SAVE INDEXEDDB
        //------------------------------------------------

        await putMeter(currentMeter);

        //------------------------------------------------
        // UPDATE CACHE
        //------------------------------------------------

        updateListCache(currentMeter);
        applyFilter();
        // filteredMeter = meterList.slice();
        // refreshCurrentRow(currentMeter);

        //------------------------------------------------
        // REFRESH DASHBOARD
        //------------------------------------------------

        // await refreshDashboardCounts();

        //------------------------------------------------
        // REFRESH SYNC BADGE
        //------------------------------------------------

        await updateTotalPendingSync();

        //------------------------------------------------
        // SUCCESS
        //------------------------------------------------

        showToast(
            "Meter reading saved.",
            "success"
        );

        //------------------------------------------------
        // RESET
        //------------------------------------------------

        resetForm();
        clearDirty();
        showListMode();

    }
    catch (ex) {

        console.error(ex);

        showToast(
            "Failed to save meter.",
            "danger"
        );

    }
    finally {

        btnSaveBottom.disabled = false;
        btnSaveBottom.innerHTML=`<i class="bi bi-save"></i> Save Draft`;
    }
}
function findAndOpenMeter(keyword){
    currentKeyword=keyword;
    $("#txtSearch").val(keyword);
    applyFilter();
}
function markKeyword(text){
    if(!currentKeyword)
        return text;

    return text.replace(

        new RegExp(

            currentKeyword.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),

            "ig"

        ),

        "<mark>$&</mark>"

    );
}
function getMetersByCompanyLocationType(
    companyId,
    locationId,
    type
) {
    return new Promise(function (resolve, reject) {
        const tx = db.transaction(
            ["meter"],
            "readonly"
        );
        const store =
            tx.objectStore("meter");
        const index =
            store.index("by_company_location_type");
        const range =
            IDBKeyRange.bound(
                [companyId, locationId, type],
                [companyId, locationId, type, []]
            );
        const req =
            index.getAll(range);
        req.onsuccess = function () {
            resolve(req.result || []);
        };
        req.onerror = function (e) {
            reject(e.target.error);
        };
    });
}
async function findMeterFromBarcode(code) {
    try {
        code = normalizeBarcode(code);
        if (!code)
            return;
        hideScannerMode();
        const type = currentType;
        const meters =
            await getMetersByCompanyLocationType(
                companyId,
                locationId,
                type
            );
        const meter =
            meters.find(function (x) {
                return getBarcodeNo(x.MeterNo)
                    .toUpperCase()
                    === code.toUpperCase();
            });
        if (!meter) {
            showToast(
                "Meter not found.",
                "warning"
            );
            return;
        }
        openMeter(meter.MeterNo);
    }
    catch (err) {
        console.error(
            "findMeterFromBarcode error:",
            err
        );
        showToast(
            "Failed to find meter.",
            "danger"
        );
    }
}
function normalizeBarcode(code){
    code=$.trim(code);
    if(code.indexOf("|")>0){
        return code.split("|").pop();
    }
    if(code.indexOf("=")>0){
        return code.split("=").pop();
    }
    return code;
}
async function processPhoto(file){
    try{
        //-----------------------------------
        // Compress
        //-----------------------------------
        const blob =
            await compressImage(file);
        //-----------------------------------
        // Save
        //-----------------------------------
        currentPhotoBlob = blob;
        currentPhotoFileName =
            file.name.replace(/\.\w+$/, ".jpg");
        //-----------------------------------
        // Preview
        //-----------------------------------
        setPhotoPreview(blob);
        refreshPhotoUI();
        //-----------------------------------
        // Dirty
        //-----------------------------------
        markDirty();
        refreshSaveButton();
    }
    catch(ex){
        console.error(ex);
        // compressImage() mungkin sudah menampilkan
        // warning sendiri (mis. ukuran terlalu besar),
        // jadi jangan tampilkan toast ganda.
        if(ex !== "Photo too large"){
            showToast(
                "Failed to process image.",
                "danger"
            );
        }
    }
}
// ------------------------------------
// EVENTS
// ------------------------------------
$("#ddlStatusFilter").on("change", function () {
    currentStatus = $(this).val();
    applyFilter();
});
$("#btnBackToList").on("click", async function () {
    if(formDirty){
        const ok=
        await showConfirmation(
        {
            title:
                "Unsave changes",

            message:
                "Discard unsaved changes ?"
        });
        if(!ok)
            return;

        // if(!confirm("Discard unsaved changes?"))
        //     return;
    }
    resetForm();
    await loadMeterList(false);
    showListMode();
});
$("#tblMeterBody").off("click",".meter-row").on("click",".meter-row",function(){
    openMeter($(this).data("meter"));
});
$("#txtCurrentReadingLWBP").on("input",function(){
    refreshSaveButton();
    markDirty();
});
$("#txtCurrentReadingWBP").on("input",function(){
    refreshSaveButton();
    markDirty();
});
$("#txtRemarks").on("input", function () {
    if (!currentMeter)
        return;
    currentMeter.Remark = this.value;
    markDirty();
});
$("#txtCurrentReading").on("input", function () {
    if (!currentMeter)
        return;
    currentMeter.Ending1 = this.value;
    calculateUsage("REG");
    markDirty();
});
$("#txtCurrentReadingLWBP").on("input", function () {
    if (!currentMeter)
        return;
    currentMeter.Ending1 = this.value;
    calculateUsage("LWBP");
    markDirty();
});
$("#txtCurrentReadingWBP").on("input", function () {
    if (!currentMeter)
        return;
    currentMeter.Ending2 = this.value;
    calculateUsage("WBP");
    markDirty();
});
$("#btnSaveBottom").on("click", async function () {
    await saveMeter();
});

let searchTimer = null;
$("#txtSearch").on("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
        currentKeyword =
            $("#txtSearch").val();

        applyFilter();

    },180);
});
$("#meterPager,#meterPagerTop").off("click",".meter-page").on("click",".meter-page",function(e){
    e.preventDefault();

    const page=
        Number(
            $(this).data("page")
        );

    const totalPage=
        Math.ceil(
            filteredMeter.length/pageSize
        );

    if(page<1)
        return;

    if(page>totalPage)
        return;

    currentPage=page;

    renderMeterList();
    const row=$("#tblMeterBody tr:first");
    // scrollToMeterRow(row);
    scrollToListTop();
});
// $("#btnTakePhoto").on("click", function () {
//     $("#fileCamera").click();
// });
$("#photoPlaceholder").on("click", function () {

    if (
        currentMeter &&
        (
            currentMeter.Status === "SYNCED" ||
            currentMeter.Terminated === "Y" ||
            currentMeter.Terminated === true
        )
    ) {
        if (currentPhotoBlob) {
            $("#imgMeterPhoto").trigger("click");
        }
        return;
    }

    if (currentPhotoBlob) {
        $("#imgMeterPhoto").trigger("click");
        return;
    }

    $("#fileCamera")[0].click();
});
$("#btnRetakePhoto").on("click", function (e) {

    e.preventDefault();
    e.stopPropagation();

    if (
        currentMeter &&
        (
            currentMeter.Status != "NEW" ||
            currentMeter.Terminated === "Y" ||
            currentMeter.Terminated === true
        )
    ) {
        return;
    }

    $("#fileCamera")[0].click();
});
$("#fileCamera").on("change", async function () {
    if (!this.files || !this.files.length)
        return; 
    await processPhoto(this.files[0]);
    // supaya file yang sama bisa dipilih lagi
    this.value = "";
});
$("#photoPlaceholder").on("dragover",function(e){
    e.preventDefault();
    $(this).addClass("drag-over");
}).on("dragleave",function(){
    $(this).removeClass("drag-over");
}).on("drop",async function(e){
    e.preventDefault();
    $(this).removeClass("drag-over");
    const files =
        e.originalEvent.dataTransfer.files;
    if(!files.length)
        return;
    await processPhoto(files[0]);
});
$(document).on("paste",async function(e){
    const items =
        e.originalEvent.clipboardData.items;
    for(let item of items){
        if(item.type.startsWith("image/")){
            const file=item.getAsFile();
            await processPhoto(file);
            break;
        }
    }
});
// $("#btnPreviewPhoto").on("click", function () {
//     if (!currentPhotoBlob)
//         return;

//     $("#imgPreviewPhoto")
//         .attr(
//             "src",
//             $("#imgMeterPhoto").attr("src")
//         );

//     new bootstrap.Modal(
//         document.getElementById("modalPhoto")
//     ).show();
// });
// $("#photoPlaceholder").on("click", function () {
//     if (!currentPhotoBlob)
//         return;

//     $("#btnPreviewPhoto").trigger("click");
// });
$("#imgMeterPhoto").on("click", function (e) {
    // console.log("IMAGE");
    e.stopPropagation();
    if(!currentPhotoBlob)
        return;
    $("#imgPreviewPhoto").attr(
        "src",
        this.src
    );
    new bootstrap.Modal(
        document.getElementById("modalPhoto")
    ).show();
});
$(document).keydown(function(e){
    if(e.ctrlKey && e.key=="s"){
        e.preventDefault();
        if(!btnSaveBottom.disabled)
            saveMeter();
    }
});
$("#txtSearch").keydown(function(e){

    if(e.key=="ArrowDown"){

        e.preventDefault();

        if(highlightedMeter<filteredMeter.length-1){

            highlightedMeter++;

            highlightCurrentRow();

        }

    }

    else if(e.key=="ArrowUp"){

        e.preventDefault();

        if(highlightedMeter>0){

            highlightedMeter--;

            highlightCurrentRow();

        }

    }

    else if(e.key=="Enter"){

        e.preventDefault();

        if(highlightedMeter>=0){

            openMeter(
                filteredMeter[
                    highlightedMeter
                ].MeterNo
            );

        }

    }

});
$("#txtCurrentReadingLWBP").on("keydown", function (e) {
    if (e.key !== "Enter")
        return;
    e.preventDefault();
    //----------------------------------------
    // Kalau ada WBP
    //----------------------------------------
    if (
        currentType === "ELC" &&
        currentMeter.Flag === "Y"
    ) {
        focusAndSelect(txtCurrentReadingWBP);
    }
    else {
        focusAndSelect(txtRemarks);
    }
});
$("#txtCurrentReadingWBP").on("keydown", function (e) {
    if (e.key !== "Enter")
        return;
    e.preventDefault();
    focusAndSelect(txtRemarks);
});
$("#txtCurrentReading").on("keydown", function (e) {
    if (e.key !== "Enter")
        return;
    e.preventDefault();
    focusAndSelect(txtRemarks);
});
$("#txtRemarks").on("keydown", function (e) {
    if (!(e.ctrlKey && e.key === "Enter"))
        return;
    e.preventDefault();
    if (!btnSaveBottom.disabled)
        btnSaveBottom.click();
});
$("#thMeterNo").click(function(){
    if(currentSort=="MeterNo")
        sortAsc=!sortAsc;
    else{

        currentSort="MeterNo";
        sortAsc=true;

    }

    sortMeter();
    applyFilter();
});
$("#thTenant").click(function(){
    if(currentSort=="TenantName")
        sortAsc=!sortAsc;
    else{

        currentSort="TenantName";
        sortAsc=true;

    }

    sortMeter();
    applyFilter();
});
async function handleBarcodeResult(code, session) {

    // callback dari scanner lama → abaikan
    if (!isScannerActive)
        return;

    if (session !== scannerSession)
        return;

    // langsung matikan session
    isScannerActive = false;

    await findMeterFromBarcode(code);
}
$("#btnScanBarcode").click(function () {
    if (scanning)
        return;
    scannerSession++;
    isScannerActive = true;
    const session = scannerSession;
    const modalElement =
        document.getElementById("pnlBarcodeScan");
    const modal =
        bootstrap.Modal.getOrCreateInstance(
            modalElement
        );
    modal.show();
    scanBarcode(
        "barcodeReader",
        async function (code) {
            if (!isScannerActive)
                return;
            if (session !== scannerSession)
                return;
            isScannerActive = false;
            modal.hide();
            await findMeterFromBarcode(code);
        },
        function (err) {
            if (!isScannerActive)
                return;
            if (session !== scannerSession)
                return;
            isScannerActive = false;
            modal.hide();
            showToast(
                err,
                "danger"
            );
        }
    );
});
$("#pnlBarcodeScan").on(
    "hidden.bs.modal",
    function(){
        stopBarcode();
    }
);
$("#btnCloseScanner").click(async function(){
    await stopBarcode();
    hideScannerMode();
});
document.addEventListener(
    "meterSyncCompleted",
    function(e){
        //--------------------------------
        // pastikan company/location sama
        //--------------------------------
        if(
            companyId != e.detail.companyId ||
            locationId != e.detail.locationId
        ){
            return;
        }
        const synced =
            new Set(
                e.detail.syncedMeterNos || []
            );
        if(!synced.size)
            return;
        //--------------------------------
        // update cache
        //--------------------------------
        meterList.forEach(function(m){
            if(
                m.Type == currentType &&
                synced.has(m.MeterNo)
            ){
                m.Status = "SYNCED";
                m.SyncErrorCode = "";
                m.SyncErrorMessage = "";
            }
        });
        //--------------------------------
        // jika meter yg sedang dibuka ikut sync
        //--------------------------------
        if(
            currentMeter &&
            currentMeter.Type == currentType &&
            synced.has(currentMeter.MeterNo)
        ){
            currentMeter.Status = "SYNCED";
            currentMeter.SyncErrorCode = "";
            currentMeter.SyncErrorMessage = "";
            refreshMeterStatusBadge("SYNCED");
            refreshPhotoUI();
            refreshSaveButton();
            setDetailReadOnly(true);
            showToast(
                "Meter berhasil disinkronkan.",
                "success"
            );
        }
        //--------------------------------
        // refresh list
        //--------------------------------
        applyFilter();
    }
);
document.addEventListener(
    "meterDownloadCompleted",
    async function (e) {

        if (
            companyId != e.detail.companyId ||
            locationId != e.detail.locationId
        ) {
            return;
        }

        // hanya refresh jika sedang di halaman list
        if (isDetailMode)
            return;

        await loadMeterList();

    }
);
