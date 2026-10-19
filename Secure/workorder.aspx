<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPages/Site1.Master" AutoEventWireup="true" CodeBehind="workorder.aspx.cs" Inherits="UTL1.Secure.workorder" %>
<%@ MasterType VirtualPath="~/MasterPages/Site1.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
    <link rel="Stylesheet" type="text/css" href="../CSSCus/workorder.css" />
</asp:Content>

<asp:Content ID="Content3" ContentPlaceHolderID="stickybar" runat="server">
<div class="sticky-bar-wrapper w-100">
<div id="headListPage" class="d-flex align-items-center w-100 justify-content-between px-2">
    <div id="globalLoadingOverlay"
     class="position-fixed top-0 start-0 w-100 h-100 d-none"
     style="background: rgba(255,255,255,0.7); z-index:99999;">

    <div class="d-flex flex-column justify-content-center align-items-center h-100">

        <div class="spinner-border text-primary mb-2"></div>

        <div class="loading-text small text-muted">
            Loading...
        </div>

    </div>
    </div>
    <div class="wo-list-header d-flex align-items-center gap-2 w-100 p-2 mt-2 shadow-sm">
        <!-- LEFT -->
        <div class="wo-list-header-left d-flex align-items-center gap-2 gap-sm-3">
            <h5 class="mb-0 text-nowrap">Work Orders</h5>
            <div class="wo-tab-scroll">
            <div class="wo-tab-wrapper">
                <button class="tab-btn active" data-status="PENDING" onclick="filterTab(this)" id="btnTab1">
                    Pending <span id="countTab1">(0)</span>
                </button>
                <button class="tab-btn" data-status="DRAFT" onclick="filterTab(this)" id="btnTab2">
                    Draft <span id="countTab2">(0)</span>
                </button>
                <button class="tab-btn" data-status="DONE;SYNCED" onclick="filterTab(this)" id="btnTab3">
                    Submitted <span id="countTab3">(0)</span>
                </button>
            </div>
            </div>
        </div>
        <!-- RIGHT -->
        <div class="wo-list-header-right d-flex align-items-center gap-2 gap-md-3">
            <div class="position-relative">
                <input type="text"
                       id="txtSearchWO"
                       class="form-control form-control-sm pe-5" 
                       placeholder="Search..."
                       onkeyup="highlightSearch(this.value)">
                <button type="button"
                        class="btn btn-sm position-absolute top-50 end-0 translate-middle-y me-1"
                        onclick="clearSearch()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <button class="btn btn-primary-custom" type="button" onclick="startScan();" id="btnScan">
                <i class="bi bi-qr-code-scan"></i> 
                <span class="scan-text ms-1">SCAN</span>
            </button>
        </div>
    </div>
</div>
<!-- Header Area -->
<div class="d-flex align-items-center w-100 px-2 w-100" id="headDetailPage">
<%--    <div class="d-flex align-items-center justify-content-between gap-2 mt-2 shadow-sm w-100">
        <!-- LEFT -->
        <div class="d-flex align-items-center gap-2 gap-sm-3">
            <h1 class="h6 mb-0 fw-bold text-primary">Work Order #88291</h1>
            <p class="small text-muted mb-0 fw-semibold" style="font-size: 0.75rem;">Industrial Pump PX-900 | Quarterly Maintenance</p>
        </div>
        <!-- RIGHT -->
        <div class="d-flex align-items-center gap-2 gap-md-3">
            <button class="btn btn-sm btn-outline-secondary" onclick="backToList()"> <i class="bi bi-arrow-left"></i></button>
        </div>
    </div>--%>
</div>
<div id="headDetailPage1">
<%--    <div class="d-flex align-items-center gap-2 w-100">
        <!-- LEFT -->
        <div style="flex: 1 1 auto; min-width: 0;">
            <!-- Sticky Navigation -->
            <nav class="nav-fixed-tabs">
            <div class="horizontal-scroll">
                <div class="d-inline-flex">
                <a class="section-tab active" href="#section1">Overview</a>
                <a class="section-tab" href="#sectionSafety">Safety</a>
                <a class="section-tab" href="#sectionMechanical">Mechanical</a>
                <a class="section-tab" href="#sectionElectrical">Electrical</a>
                <a class="section-tab" href="#sectionEnvironmental">Environmental</a>
                </div>
            </div>
            </nav>
        </div>
        <!-- RIGHT -->
        <div style="flex: 0 0 auto; display: flex; align-items: center; height: 100%;">
            <div class="dropdown dropstart flex-shrink-0">
            <button id="btnDropdownSection" class="btn btn-outline-secondary rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center" data-bs-toggle="dropdown" data-bs-boundary="viewport" data-bs-display="dynamic" style="width: 34px; height: 34px; margin-right: 8px; flex-shrink: 0;" type="button">
            <i class="bi bi-plus-lg text-primary"></i>
            </button>
            <ul class="dropdown-menu shadow border-0 mt-2">
            <li><a class="dropdown-item small py-2" href="#">Calibration Data</a></li>
            <li><a class="dropdown-item small py-2" href="#">Spares Inventory</a></li>
            <li><a class="dropdown-item small py-2" href="#">Final Testing</a></li>
            </ul>
            </div>
        </div>
    </div>
    <div class="progress mt-2 w-100" style="height: 4px; pointer-events: none; z-index: 1; position: relative;">
    <div aria-valuemax="100" aria-valuemin="0" aria-valuenow="45" class="progress-bar bg-primary" role="progressbar" style="width: 45%"></div>
    </div>--%>

</div>
</div>
</asp:Content>

<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
<asp:ScriptManager ID="ScriptManager1" runat="server" EnablePageMethods="true" />
<%--<div id="photoPreviewModal" class="photo-preview-modal d-none">
    <div class="preview-overlay">

        <img id="previewImage" />

        <!-- top bar -->
        <div class="preview-toolbar">
            <button id="btnClosePreview" type="button">✕</button>
            <button id="btnDeletePreview" type="button"><i class="bi bi-trash-fill"></i></button>
        </div>

    </div>
</div>--%>
<div class="modal fade" id="voidReasonModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    Void Reason
                </h5>
                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal">
                </button>
            </div>
            <div class="modal-body">
                <div class="text-muted small mb-2">
                    Please enter the reason for voiding this work order.
                </div>
                <textarea
                    id="txtVoidReason"
                    class="form-control"
                    rows="4"
                    maxlength="255"
                    placeholder="Type reason here..."></textarea>
                <div
                    id="voidReasonError"
                    class="text-danger small mt-2 d-none">
                    Reason is required.
                </div>
            </div>
            <div class="modal-footer">
                <button
                    type="button"
                    class="btn btn-light"
                    data-bs-dismiss="modal">
                    Cancel
                </button>
                <button
                    type="button"
                    class="btn btn-danger"
                    onclick="submitVoidWO('0');">
                    OK
                </button>
            </div>
        </div>
    </div>
</div>
<div id="photoPreviewModal"
     class="photo-preview-modal d-none">

    <div class="preview-backdrop">

        <!-- Close -->
        <button id="btnClosePreview" type="button"
                class="preview-btn preview-close">
            <i class="bi bi-x-lg"></i>
        </button>

        <!-- Delete -->
        <button id="btnDeletePreview" type="button"
                class="preview-btn preview-delete">
            <i class="bi bi-trash3-fill"></i>
        </button>

        <!-- Prev -->
        <button id="btnPrevImage" type="button"
                class="preview-nav preview-prev">

            <i class="bi bi-chevron-left"></i>

        </button>

        <!-- Next -->
        <button id="btnNextImage" type="button"
                class="preview-nav preview-next">

            <i class="bi bi-chevron-right"></i>

        </button>

        <!-- Image -->
        <div class="preview-image-wrapper">

            <img id="previewImage"
                 class="preview-image" />

        </div>

        <!-- Counter -->
        <div class="preview-counter">
        </div>

    </div>

</div>

<div class="modal fade" id="woEmployeeModal" tabindex="-1">

<%--    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">

        <div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">

            <!-- Header -->
            <div class="modal-header border-0 bg-primary text-white py-3">

                <div>
                    <h5 class="modal-title fw-bold mb-1">
                        Assigned Employee
                    </h5>

                    <div class="small opacity-75">
                        Work Order #99999
                    </div>
                </div>

                <button type="button"
                        class="btn-close btn-close-white"
                        data-bs-dismiss="modal">
                </button>

            </div>


            <!-- Body -->
            <div class="modal-body bg-light">

                <!-- Employee Item -->
                <div class="card border-0 shadow-sm rounded-4 mb-3">
                    <div class="card-body">

                        <div class="d-flex align-items-start">

                            <!-- Avatar -->
                            <div class="me-3">

                                <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                                     style="width:50px;height:50px;">

                                    AS

                                </div>

                            </div>

                            <!-- Info -->
                            <div class="flex-grow-1">

                                <div class="fw-bold fs-6">
                                    Andi Saputra
                                </div>

                                <div class="small text-muted mb-2">
                                    EMP-0001
                                </div>

                                <span class="badge rounded-pill bg-primary-subtle text-primary px-3 py-2">
                                    Mechanical
                                </span>

                            </div>

                        </div>

                    </div>
                </div>


                <!-- Employee Item -->
                <div class="card border-0 shadow-sm rounded-4 mb-3">
                    <div class="card-body">

                        <div class="d-flex align-items-start">

                            <div class="me-3">

                                <div class="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold"
                                     style="width:50px;height:50px;">

                                    BH

                                </div>

                            </div>

                            <div class="flex-grow-1">

                                <div class="fw-bold fs-6">
                                    Budi Hartono
                                </div>

                                <div class="small text-muted mb-2">
                                    EMP-0002
                                </div>

                                <span class="badge rounded-pill bg-success-subtle text-success px-3 py-2">
                                    Civil
                                </span>

                            </div>

                        </div>

                    </div>
                </div>


                <!-- Employee Item -->
                <div class="card border-0 shadow-sm rounded-4">
                    <div class="card-body">

                        <div class="d-flex align-items-start">

                            <div class="me-3">

                                <div class="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center fw-bold"
                                     style="width:50px;height:50px;">

                                    RW

                                </div>

                            </div>

                            <div class="flex-grow-1">

                                <div class="fw-bold fs-6">
                                    Rina Wijaya
                                </div>

                                <div class="small text-muted mb-2">
                                    EMP-0003
                                </div>

                                <span class="badge rounded-pill bg-danger-subtle text-danger px-3 py-2">
                                    AC Technician
                                </span>

                            </div>

                        </div>

                    </div>
                </div>

            </div>


            <!-- Footer -->
            <div class="modal-footer border-0 bg-white">

                <button type="button"
                        class="btn btn-light rounded-pill px-4"
                        data-bs-dismiss="modal">

                    Close

                </button>

            </div>

        </div>

    </div>--%>
</div>
<div id="woListPage">
<!-- Work Order List -->
<div class="list-group border-0">
<!-- Header -->
<div class="row px-3 mb-1 d-none d-lg-flex">
<div class="col-lg-2 header-label">WO #</div>
<div class="col-lg-2 header-label">Date</div>
<div class="col-lg-2 header-label">Equipment</div>
<div class="col-lg-2 header-label">Location</div>
<div class="col-lg-4 header-label">Description</div>
</div>
<!-- Items -->
<span id="woList"></span>
</div>
<!-- Pagination -->
<nav aria-label="Work order list pagination" class="pagination-custom d-flex justify-content-center">
<ul class="pagination pagination-sm mb-0 flex-nowrap">
<li class="page-item">
<a aria-label="Previous" class="page-link d-flex align-items-center gap-1" href="#" onclick="prevPage()">
<i class="bi bi-chevron-left" style="font-size: 10px;"></i>
<span>Previous</span>
</a>
</li>
<div id="paginationNumbers" class="d-flex flex-nowrap"></div>
<li class="page-item">
<a aria-label="Next" class="page-link d-flex align-items-center gap-1" href="#" onclick="nextPage()">
<span>Next</span>
<i class="bi bi-chevron-right" style="font-size: 10px;"></i>
</a>
</li>
</ul>
</nav>
</div>
<!-- DETAIL PAGE -->
<div id="woDetailPage" style="background-color: var(--bs-body-bg); padding-bottom: 80px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">

<!-- Main Content -->
<div class="container-fluid px-2">
<div id="containerCheckList"></div>

<%--<div class="accordion" id="workOrderAccordion">
<!-- Section 1: General Inspection (VISIBLE) -->
<div class="accordion-item" id="section1">
<h2 class="accordion-header">
<button aria-expanded="true" class="accordion-button" data-bs-target="#collapseOne" data-bs-toggle="collapse" type="button">
<i class="bi bi-gear-fill me-2"></i> SECTION 1: OPERATIONAL CHECK
                    </button>
</h2>
<div class="accordion-collapse collapse show" id="collapseOne">
<div class="accordion-body p-3">
<div class="row g-3">
<!-- OPTION ITEM -->
<div class="col-12" data-item-id="itm-op-mode">
<label class="compact-label">Purge Operating Mode</label>
<div class="row g-2">
<div class="col-md-6">
<div class="btn-group w-100" role="group">
<input checked="" class="btn-check" id="auto" name="opmode" type="radio"/>
<label class="btn btn-outline-primary" for="auto">AUTO</label>
<input class="btn-check" id="manual" name="opmode" type="radio"/>
<label class="btn btn-outline-primary" for="manual">MANUAL</label>
<input class="btn-check" id="adaptive" name="opmode" type="radio"/>
<label class="btn btn-outline-primary" for="adaptive">ADAPTIVE</label>
</div>
</div>
<div class="col-md-6">
<input class="form-control form-control-sm" placeholder="Add remark..." type="text"/>
</div>
</div>
</div>
<!-- RANGE ITEM -->
<div class="col-12" data-item-id="itm-tank-temp">
<label class="compact-label">Oil Tank Temperature (°C)</label>
<div class="row g-2">
<div class="col-md-6">
<div class="range-container">
<input class="form-range range-slider" id="tempRange" max="65" min="45" type="range" value="52"/>
<input class="form-control form-control-sm range-input" oninput="document.getElementById('tempRange').value=this.value" type="number" value="52"/>
</div>
</div>
<div class="col-md-6">
<input class="form-control form-control-sm" placeholder="Remark for temp..." type="text"/>
</div>
</div>
</div>
<!-- NUMERIC ITEM -->
<div class="col-12" data-item-id="itm-pump-press">
<label class="compact-label">Pump Pressure (bar)</label>
<div class="row g-2">
<div class="col-md-6">
<div class="input-group input-group-sm">
<input class="form-control fw-bold" placeholder="0.00" step="0.01" type="number"/>
<span class="input-group-text fw-bold" style="font-size: 0.65rem;">BAR</span>
</div>
</div>
<div class="col-md-6">
<input class="form-control form-control-sm" placeholder="Pressure remark..." type="text"/>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
<!-- Section 2: Electrical -->
<div class="accordion-item border-error" id="sectionElectrical">
<h2 class="accordion-header">
<button class="accordion-button collapsed" data-bs-target="#collapseTwo" data-bs-toggle="collapse" type="button">
<i class="bi bi-lightning-charge-fill me-2 text-danger"></i> SECTION 2: ELECTRICAL LOADS
                    </button>
</h2>
<div class="accordion-collapse collapse show" id="collapseTwo">
<div class="accordion-body p-3">
<div class="mb-3" data-item-id="itm-voltage">
<label class="compact-label">Voltage Measurements (V)</label>
<div class="row g-2 text-center">
<div class="col-4">
<label class="d-block text-muted" style="font-size: 10px; font-weight: 800;">RS</label>
<input class="form-control form-control-sm text-center" type="number"/>
</div>
<div class="col-4">
<label class="d-block text-muted" style="font-size: 10px; font-weight: 800;">RT</label>
<input class="form-control form-control-sm text-center" type="number"/>
</div>
<div class="col-4">
<label class="d-block text-muted" style="font-size: 10px; font-weight: 800;">ST</label>
<input class="form-control form-control-sm text-center" type="number"/>
</div>
</div>
</div>
<div class="mb-3" data-item-id="itm-current">
<label class="compact-label">Current Loads (A)</label>
<div class="row g-2 text-center">
<div class="col-4">
<label class="d-block text-muted" style="font-size: 10px; font-weight: 800;">R-PHASE</label>
<input class="form-control form-control-sm text-center" type="number"/>
</div>
<div class="col-4">
<label class="d-block text-muted" style="font-size: 10px; font-weight: 800;">S-PHASE</label>
<input class="form-control form-control-sm text-center" type="number"/>
</div>
<div class="col-4">
<label class="d-block text-muted" style="font-size: 10px; font-weight: 800;">T-PHASE</label>
<input class="form-control form-control-sm text-center" type="number"/>
</div>
</div>
</div>
<input class="form-control form-control-sm" placeholder="Electrical maintenance remarks..." type="text"/>
</div>
</div>
</div>
</div>--%>

<%--<div class="accordion-item border-secondary">
    
    <!-- HEADER (non-clickable) -->
    <div class="accordion-header">
        <div class="accordion-button">
            <i class="bi bi-camera-fill me-2 text-secondary"></i>
            FIELD DOCUMENTATION
        </div>
    </div>

    <!-- BODY (selalu tampil) -->
    <div class="accordion-body p-3">
        <div class="row g-3">
            <div class="col-md-6">
                <div class="photo-upload" data-role="photo-before">
                    <div class="photo-list d-flex flex-wrap gap-2"></div>
                    <label class="upload-box" >
                        <i class="bi bi-camera-plus"></i>
                        <span class="compact-label mb-0">BEFORE SERVICE</span>
                        <span class="upload-hint">
                            Tap or drag image here
                        </span>
                        <input type="file" data-type="BEFORE" multiple accept="image/*" hidden />
                    </label>
                </div>
            </div>

            <div class="col-md-6">
                <div class="photo-upload" data-role="photo-after">
                    <div class="photo-list d-flex flex-wrap gap-2"></div>
                    <label class="upload-box" >
                        <i class="bi bi-camera-plus"></i>
                        <span class="compact-label mb-0">AFTER SERVICE</span>
                        <span class="upload-hint">
                            Tap or drag image here
                        </span>
                        <input type="file" data-type="AFTER" multiple accept="image/*" hidden />
                    </label>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="accordion-item">
    <div class="accordion-header">
        <div class="accordion-button">
            <i class="bi bi-clipboard-check-fill me-2"></i>
            FINAL INSPECTION SUMMARY
        </div>
    </div>

    <div class="accordion-body p-3">
        <textarea class="form-control form-control-sm"
                  data-role="summary"
                  placeholder="Enter detailed inspection notes..."
                  rows="4"></textarea>
    </div>
</div>--%>
<%--<div id="voidReasonContainer"></div>--%>

<div class="d-flex gap-2" id="sectionAction">
<%--    <button class="btn btn-outline-secondary flex-fill wo-action-btn" type="button" id="btnSaveDraft" onclick="confirmSaveDone(1);">
        <i class="bi bi-save"></i>
        <span>Save Draft</span>
    </button>
    <button class="btn btn-outline-primary flex-fill wo-action-btn" type="button" id="btnDone" onclick="confirmSaveDone(2);">
        <i class="bi bi-check-circle-fill"></i>
        <span>Done</span>
    </button>--%>
</div>

</div>
<!-- Bottom Navigation Bar -->
</div>
<div id="scanPage" class="page-hidden">

    <div class="card shadow-sm">

        <div class="card-header d-flex align-items-center">

            <button class="btn btn-sm btn-outline-secondary me-2"
                    onclick="stopScan()">

                <i class="bi bi-arrow-left"></i>

            </button>

            <div class="fw-bold">
                Scan Barcode
            </div>

        </div>

        <div class="card-body text-center">

            <!-- Camera View -->
            <div id="scannerVideo"
                 style="width:100%; min-height:300px;">
            </div>
<%--            <video id="scannerVideo"
                   width="100%"
                   autoplay></video>--%>

            <div class="mt-2 text-muted small">

                Arahkan kamera ke barcode

            </div>

        </div>

    </div>

</div>
<div id="scrollTools" style="z-index:999; position: fixed;">
    <a id="lbtn_BackToTop" 
        href="" 
        class="btn CUS-btn-PColor-3 CUS-lbtnBackTo shadow" 
        role="button"
        style="border-radius:25px;padding:9px 13px;opacity:0.8;bottom:72px;display:none;"
        >
        <svg xmlns="http://www.w3.org/2000/svg" style="font-weight:bold;margin-bottom:3px;" width="18" height="18" fill="currentColor" class="bi bi-chevron-up" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
        </svg>
    </a>
    <a id="lbtn_BackToBottom" 
        href="" 
        class="btn CUS-btn-PColor-3 CUS-lbtnBackTo shadow" 
        role="button"
        style="border-radius:25px;padding:9px 13px;opacity:0.8;bottom:25px;display:block;"
        >
        <svg xmlns="http://www.w3.org/2000/svg" style="font-weight:bold;margin-bottom:3px;" width="18" height="18" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
        </svg>
    </a>
</div>
<script type="text/javascript" src="../JSCus/workorder.js"></script>
<script type="text/javascript" src="../JSCus/sortable.js"></script>
    <script type="text/javascript" src="../JSCus/html5-qrcode.min.js"></script>
</asp:Content>
