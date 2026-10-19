<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPages/Site1.Master" AutoEventWireup="true" CodeBehind="meterreading.aspx.cs" Inherits="UTL1.Secure.meterreading" %>
<%@ MasterType VirtualPath="~/MasterPages/Site1.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
<link rel="Stylesheet" type="text/css" href="../CSSCus/meterreading.css" />
</asp:Content>
<asp:Content ID="Content3" ContentPlaceHolderID="stickybar" runat="server">
<div class="sticky-bar-wrapper w-100" style="font-size:14px;">
<div class="d-flex align-items-center w-100 justify-content-between px-2">
    <div class="d-flex align-items-center gap-2 w-100 p-2 mt-2 shadow-sm overflow-hidden">
        <div class="d-flex align-items-center gap-2 gap-sm-3 flex-grow-1 overflow-hidden">
            <h1 class="h4 mb-1 fw-bold d-flex align-items-center gap-2">
                <span id="pageTitle">Meter Reading</span>
				<span id="lblTotalMeter" class="badge bg-primary">0</span>
            </h1>
        </div>
    </div>
</div>
<div class="card mb-2 border-0 shadow-sm">
<div class="card-body">
<div class="row g-3 align-items-end">
<div class="col-md-3">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Period</label>
<select class="form-select form-select-sm" id="ddlPeriod">
</select>
</div>
<div class="col-md-9 d-flex gap-2">
<div class="input-group input-group-sm">
<span class="input-group-text bg-white border-end-0">
<i class="bi bi-search text-muted"></i>
</span>
<input class="form-control border-start-0 ps-0" placeholder="Search by Tenant or Meter No..." type="text" id="txtSearch"/>
</div>
<div style="width:180px">
<select id="ddlStatusFilter" class="form-select form-select-sm">
<option value="">ALL</option>
<option value="NEW">NEW</option>
<option value="DRAFT">DRAFT</option>
<option value="SYNCED">SYNCED</option>
<option value="ERROR">ERROR</option>
</select>
</div>
<button type="button" class="btn btn-light border btn-sm" id="btnScanBarcode">
<i class="bi bi-qr-code-scan"></i>
</button>
</div>
</div>
<div class="d-flex justify-content-between align-items-center mt-3" id="divRecordInfo">
<div id="divRecordSummary" class="d-flex flex-wrap gap-2">
    <span id="lblRecordCount"
          class="badge bg-secondary">
        0 Meter
    </span>

    <span id="lblNewCount"
          class="badge bg-primary">
        NEW 0
    </span>

    <span id="lblDraftCount"
          class="badge bg-warning text-dark">
        DRAFT 0
    </span>

    <span id="lblSyncedCount"
          class="badge bg-success">
        SYNCED 0
    </span>

    <span id="lblErrorCount"
          class="badge bg-danger">
        ERROR 0
    </span>
</div>
</div>
</div>
</div>
</div>
</asp:Content>

<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
<div id="pnlMeterList">
<div class="main-content flex-grow-1 d-flex flex-column">

<div class="container-fluid p-2">
<div class="card border-0 shadow-sm">
<div class="card-body p-0">
<div class="d-flex justify-content-between align-items-center mb-2">
    <div id="pagerInfoTop"></div>
    <ul
        id="meterPagerTop"
        class="pagination pagination-sm mb-0">
    </ul>
</div>
<div class="table-responsive">
<table class="table table-hover align-middle mb-0" id="tblMeter">
<thead class="table-light">
<tr>
<th style="width:50px">#</th>
<th id="thMeterNo" style="cursor:pointer">
    Meter No
    <i class="bi bi-arrow-down-up"></i>
</th>
<th style="width:120px">Rate Group</th>
<th id="thTenant" style="cursor:pointer">
    Tenant
    <i class="bi bi-arrow-down-up"></i>
</th>
<th style="width:100px">Status</th>
</tr>
</thead>
<tbody id="tblMeterBody">
</tbody>
</table>
<div id="divLoadingMeter" class="text-center py-5" style="display:none;">
    <div class="spinner-border text-primary"></div>
    <div class="small text-muted mt-2">
        Loading meter...
    </div>
</div>
<div id="divNoMeter" class="text-center py-5" style="display:none;">
    <i class="bi bi-inbox fs-1 text-muted"></i>
    <div class="mt-2 fw-semibold">
        No meter found
    </div>
    <small class="text-muted">
        Try another keyword.
    </small>
</div>
</div>
<div class="d-flex
            justify-content-between
            align-items-center
            border-top
            p-2">
    <div id="pagerInfo"></div>
    <ul class="pagination pagination-sm mb-0"
        id="meterPager">
    </ul>
</div>

</div>
</div>
</div>
</div>
</div>

<div id="pnlMeterDetail" class="meter-detail-page" style="display:none;">
<div class="row g-2">
<div class="mb-3">
<button type="button" class="btn btn-outline-secondary btn-sm" id="btnBackToList">
<i class="bi bi-arrow-left"></i>Back to List
</button>
</div>
<div class="col-xl-8 d-flex flex-column gap-2">
<!-- Meter Information Card -->
<div class="card border-0 shadow-sm">
<div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
<h6 class="mb-0 fw-bold d-flex align-items-center gap-2">
<i class="bi bi-info-circle text-primary"></i> Meter Information
</h6>
<span id="lblStatus" class="badge bg-secondary text-uppercase">NO METER</span>
</div>
<div class="card-body">
<div class="row g-4">
<div class="col-6 col-md-4">
<small class="text-muted text-uppercase fw-bold d-block mb-1">Meter Number</small>
<span class="fw-semibold" id="lblMeterNo">-</span>
</div>
<div class="col-6 col-md-4">
<small class="text-muted text-uppercase fw-bold d-block mb-1">Tenant ID</small>
<span id="lblTenantId">-</span>
</div>
<div class="col-6 col-md-4">
	<small class="text-muted text-uppercase fw-bold d-block mb-1">Rate Group</small>
	<span id="lblRateGroup">-</span>

</div>
<div class="col-6 col-md-4">
	<small class="text-muted text-uppercase fw-bold d-block mb-1">Suite</small>
	<span id="lblSuite">-</span>
</div>
<div class="col-6 col-md-4">
	<small class="text-muted text-uppercase fw-bold d-block mb-1">Tenant Name</small>
	<span class="text-truncate d-block" id="lblTenantName">-</span>
</div>
<div class="col-6 col-md-4">
	<small class="text-muted text-uppercase fw-bold d-block mb-1">Multiplier / Factor</small>
	<span data-factor="1" id="lblFactor">-</span>
</div>
</div>
</div>
</div>
<!-- Reading Information Card -->
<div class="card border-0 shadow-sm">
<div class="card-header bg-light py-3">
<h6 class="mb-0 fw-bold d-flex align-items-center gap-2">
<i class="bi bi-pencil-square text-primary"></i> Reading Entry
                        </h6>
</div>

<div class="card-body">
<!-- LWBP Section -->
<div id="div_lwbp">
<div class="mb-4">
<div class="d-flex align-items-center mb-3">
<span class="badge bg-primary me-2">LWBP</span>
<h6 class="mb-0 fw-bold">Luar Waktu Beban Puncak</h6>
</div>
</div>
<!-- LWBP Rollover Alert -->
<div class="alert alert-danger d-none align-items-start gap-3 py-3 mb-3" id="alertRolloverLWBP">
<i class="bi bi-exclamation-triangle-fill mt-1"></i>
<div class="flex-grow-1">
<h6 class="alert-heading fw-bold mb-1">Possible Rollover (LWBP)</h6>
<p class="mb-0 small">Current reading is lower than previous. Verify if the meter rolled over.</p>
</div>
<button type="button" class="btn btn-danger btn-sm text-uppercase fw-bold" onclick="triggerRolloverModal('LWBP')">Verify</button>
</div>
<div class="row g-3">
<div class="col-md-6">
<div class="bg-light p-3 rounded border">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Previous Reading (KWh)</label>
<input class="form-control-plaintext fs-5 font-monospace p-0" id="txtPrevReadingLWBP" readonly="" type="text" value=""/>
<small class="text-muted mt-1 d-block">Recorded: <span class="recordLastUpdated"></span></small>
</div>
</div>
<div class="col-md-6">
<div class="p-3 rounded border border-primary border-2 position-relative h-100">
<label class="form-label small text-primary text-uppercase fw-bold mb-1">Current Reading (KWh) *</label>
<input class="form-control form-control-lg border-0 shadow-none p-0 fs-5 font-monospace bg-transparent" id="txtCurrentReadingLWBP" placeholder="Enter LWBP..." type="number" value=""/>
<i class="bi bi-keyboard position-absolute top-50 end-0 translate-middle-y me-3 text-muted"></i>
</div>
</div>
<div class="col-md-6">
<div class="bg-light p-3 rounded border h-100">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Raw Usage</label>
<div class="d-flex align-items-baseline gap-1">
<span class="fs-5 fw-bold font-monospace" id="lblUsageLWBP">-</span>
<small class="text-muted">KWh</small>
</div>
</div>
</div>
<div class="col-md-6">
<div class="bg-light p-3 rounded border h-100">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Actual Usage (x Factor)</label>
<div class="d-flex align-items-baseline gap-1 text-primary">
<span class="fs-5 fw-bold font-monospace" id="lblActualUsageLWBP">-</span>
<small>KWh</small>
</div>
</div>
</div>
</div>
</div>
<hr class="my-4"/>

<!-- WBP Section -->
<div id="div_wbp">
<div class="mb-4">
<div class="d-flex align-items-center mb-3">
<span class="badge bg-warning text-dark me-2">WBP</span>
<h6 class="mb-0 fw-bold">Waktu Beban Puncak</h6>
</div>
<!-- WBP Rollover Alert -->
<div class="alert alert-danger d-none align-items-start gap-3 py-3 mb-3" id="alertRolloverWBP">
<i class="bi bi-exclamation-triangle-fill mt-1"></i>
<div class="flex-grow-1">
<h6 class="alert-heading fw-bold mb-1">Possible Rollover (WBP)</h6>
<p class="mb-0 small">Current reading is lower than previous. Verify if the meter rolled over.</p>
</div>
<button type="button" class="btn btn-danger btn-sm text-uppercase fw-bold" onclick="triggerRolloverModal('WBP')">Verify</button>
</div>
<div class="row g-3">
<div class="col-md-6">
<div class="bg-light p-3 rounded border">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Previous Reading (KWh)</label>
<input class="form-control-plaintext fs-5 font-monospace p-0" id="txtPrevReadingWBP" readonly="" type="text" value=""/>
<small class="text-muted mt-1 d-block">Recorded: <span class="recordLastUpdated"></span></small>
</div>
</div>
<div class="col-md-6">
<div class="p-3 rounded border border-primary border-2 position-relative h-100">
<label class="form-label small text-primary text-uppercase fw-bold mb-1">Current Reading (KWh) *</label>
<input class="form-control form-control-lg border-0 shadow-none p-0 fs-5 font-monospace bg-transparent" id="txtCurrentReadingWBP" placeholder="Enter WBP..." type="number" value=""/>
<i class="bi bi-keyboard position-absolute top-50 end-0 translate-middle-y me-3 text-muted"></i>
</div>
</div>
<div class="col-md-6">
<div class="bg-light p-3 rounded border h-100">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Raw Usage</label>
<div class="d-flex align-items-baseline gap-1">
<span class="fs-5 fw-bold font-monospace" id="lblUsageWBP">-</span>
<small class="text-muted">KWh</small>
</div>
</div>
</div>
<div class="col-md-6">
<div class="bg-light p-3 rounded border h-100">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Actual Usage (x Factor)</label>
<div class="d-flex align-items-baseline gap-1 text-primary">
<span class="fs-5 fw-bold font-monospace" id="lblActualUsageWBP">-</span>
<small>KWh</small>
</div>
</div>
</div>
</div>
</div>
</div>

<div id="div_singleMeter" style="display:none;">
<div class="mb-4">
<!-- LWBP Rollover Alert -->
<div class="alert alert-danger d-none align-items-start gap-3 py-3 mb-3" id="alertRollover">
<i class="bi bi-exclamation-triangle-fill mt-1"></i>
<div class="flex-grow-1">
<h6 class="alert-heading fw-bold mb-1">Possible Rollover</h6>
<p class="mb-0 small">Current reading is lower than previous. Verify if the meter rolled over.</p>
</div>
<button type="button" class="btn btn-danger btn-sm text-uppercase fw-bold" onclick="triggerRolloverModal('REG')">Verify</button>
</div>
<div class="row g-3">
<div class="col-md-6">
<div class="bg-light p-3 rounded border">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Previous Reading</label>
<input class="form-control-plaintext fs-5 font-monospace p-0" id="txtPrevReading" readonly="" type="text" value=""/>
<small class="text-muted mt-1 d-block">Recorded: <span class="recordLastUpdated"></span></small>
</div>
</div>
<div class="col-md-6">
<div class="p-3 rounded border border-primary border-2 position-relative h-100">
<label class="form-label small text-primary text-uppercase fw-bold mb-1">Current Reading *</label>
<input class="form-control form-control-lg border-0 shadow-none p-0 fs-5 font-monospace bg-transparent" id="txtCurrentReading" placeholder="Enter ..." type="number" value=""/>
<i class="bi bi-keyboard position-absolute top-50 end-0 translate-middle-y me-3 text-muted"></i>
</div>
</div>
<div class="col-md-6">
<div class="bg-light p-3 rounded border h-100">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Raw Usage</label>
<div class="d-flex align-items-baseline gap-1">
<span class="fs-5 fw-bold font-monospace" id="lblUsage">-</span>
</div>
</div>
</div>
<div class="col-md-6">
<div class="bg-light p-3 rounded border h-100">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Actual Usage (x Factor)</label>
<div class="d-flex align-items-baseline gap-1 text-primary">
<span class="fs-5 fw-bold font-monospace" id="lblActualUsage">-</span>
</div>
</div>
</div>
</div>
</div>
</div>
<!--<div class="mb-4">
<div class="d-flex align-items-center mb-3">
<h6 class="mb-0 fw-bold">Remark & Photo Evidence</h6>
</div>
</div>-->
<div class="row g-3 align-items-stretch">
	<div class="col-md-6 d-flex">
		<div class="bg-light p-2 rounded border w-100">
		<label class="form-label small text-primary text-uppercase fw-bold mb-1">Remark</label>
		<textarea
			id="txtRemarks"
			class="form-control"
			rows="4"
			maxlength="500"
			placeholder="Optional remark...">
		</textarea>
		</div>
	</div>
	<div class="col-md-6 d-flex">
		<div class="bg-light p-2 rounded border w-100">
		  <label class="form-label small text-primary text-uppercase fw-bold mb-1">Photo Evidence</label>
		  
		  <div id="photoContainer" class="position-relative w-100 text-center">
			<!-- Area Placeholder / Container Gambar -->
			<div id="photoPlaceholder" class="photo-placeholder w-100 p-2 rounded bg-light">
			  <img id="imgMeterPhoto" class="rounded" style="display:none;" alt="Meter Photo">
			  <i class="bi bi-camera fs-1 text-muted mb-2" id="iconCamera" style="display: none;"></i>
			  <span class="text-muted small text-center" id="textCapture" style="display: none;">Tap to capture meter reading</span>
			</div>

			<!-- Input Camera (Hidden) -->
			<input type="file" id="fileCamera" accept="image/*" capture="environment">

			<!-- Tombol Retake Photo -->
			<button id="btnRetakePhoto" type="button" class="btn btn-sm btn-primary rounded-circle photo-retake" title="Retake Photo">
			  <i class="bi bi-camera-fill"></i>
			</button>
		  </div>
		</div>		
		
		
		<!--<div class="bg-light p-2 rounded border w-100">
		<label class="form-label small text-primary text-uppercase fw-bold mb-1">Photo Evidence</label>
		<div id="photoContainer" class="position-relative w-100 text-center">
		<div class="photo-placeholder w-100 p-2 rounded d-flex flex-column align-items-center justify-content-center bg-light mb-1" id="photoPlaceholder">
		<img id="imgMeterPhoto" style="display:none;" class="rounded"/>
		<i class="bi bi-camera fs-1 text-muted mb-2"></i>
		<input type="file" id="fileCamera" accept="image/*" capture="environment" style="display:none;">
		<span class="text-muted small text-center">Tap to capture meter reading</span>
		</div>
		 <button
				id="btnRetakePhoto"
				type="button"
				class="btn btn-sm btn-primary rounded-circle photo-retake"
				style="display:none;"
				title="Retake Photo">
				<i class="bi bi-camera-fill"></i>
		</button>

		</div>
		</div>-->
	</div>
</div>

<%--<div class="mt-4">
<label class="form-label small text-muted text-uppercase fw-bold mb-1">Remarks / Notes</label>
<textarea class="form-control" id="txtRemarks" placeholder="Add any observations about meter condition..." rows="2" maxlength="500"></textarea>
</div>--%>

</div>
</div>
</div>
<%--<div class="col-xl-4 d-flex flex-column gap-4">
<!-- Photo Evidence Card -->
<div class="card border-0 shadow-sm h-100">
<div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
<h6 class="mb-0 fw-bold d-flex align-items-center gap-2">
<i class="bi bi-camera text-primary"></i> Evidence
                        </h6>
<span class="text-danger small text-uppercase fw-bold">* Required</span>
</div>
<div class="card-body d-flex flex-column align-items-center justify-content-center min-vh-25">
<!-- Placeholder state -->
<div id="photoContainer" class="text-center">
<div class="photo-placeholder w-100 p-2 rounded d-flex flex-column align-items-center justify-content-center bg-light mb-3" id="photoPlaceholder">
<img id="imgMeterPhoto" style="display:none;" class="img-fluid rounded"/>
<i class="bi bi-camera fs-1 text-muted mb-2"></i>
<input type="file" id="fileCamera" accept="image/*" capture="environment" style="display:none;">
<span class="text-muted small text-center">Tap to capture meter reading</span>
</div>
</div>
<!-- Actions -->
<div class="w-100 d-flex gap-2 mt-auto">
<button type="button" class="btn btn-primary flex-grow-1 fw-bold d-flex align-items-center justify-content-center gap-2" id="btnTakePhoto">
	<i class="bi bi-camera-fill"></i> Take Photo
</button>
<button type="button" class="btn btn-outline-secondary d-flex align-items-center justify-content-center" disabled id="btnPreviewPhoto">
	<i class="bi bi-eye"></i>
</button>
</div>
</div>
</div>
</div>--%>

</div>

<!-- BottomNavBar (Mobile Only) -->
<nav class="d-md-none fixed-bottom bg-white border-top shadow d-flex justify-content-around align-items-center py-2 z-3">
<a class="text-decoration-none text-muted text-center flex-grow-1" href="#">
<i class="bi bi-house fs-5 d-block"></i>
<small class="text-uppercase" style="font-size: 10px;">Home</small>
</a>
<a class="text-decoration-none text-muted text-center flex-grow-1" href="#">
<i class="bi bi-clock-history fs-5 d-block"></i>
<small class="text-uppercase" style="font-size: 10px;">History</small>
</a>
<a class="text-decoration-none text-primary text-center flex-grow-1 fw-bold" href="#">
<i class="bi bi-qr-code-scan fs-4 d-block"></i>
<small class="text-uppercase" style="font-size: 10px;">Scan</small>
</a>
<a class="text-decoration-none text-muted text-center flex-grow-1" href="#">
<i class="bi bi-hourglass-split fs-5 d-block"></i>
<small class="text-uppercase" style="font-size: 10px;">Pending</small>
</a>
<a class="text-decoration-none text-muted text-center flex-grow-1" href="#">
<i class="bi bi-person fs-5 d-block"></i>
<small class="text-uppercase" style="font-size: 10px;">Profile</small>
</a>
</nav>
<!-- Desktop Sticky Footer Actions -->
<div class="desktop-footer d-none d-md-flex position-fixed bottom-0 right-0 bg-white border-top shadow-sm w-100 py-3 px-4 justify-content-end gap-2" style="right: 0; width: auto;">
<!--<button type="button" class="btn btn-light border px-4 fw-semibold" id="btnCancel">Cancel</button>-->
<button type="button" class="btn btn-primary px-4 fw-semibold d-flex align-items-center gap-2" id="btnSaveBottom" disabled>
<i class="bi bi-save"></i> Save Draft
    </button>
</div>

</div>
<div class="modal fade" id="modalPhoto" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Meter Photo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center p-3">
                <img id="imgPreviewPhoto" class="img-fluid rounded preview-photo-fit"/>
            </div>
        </div>
    </div>
</div>
<div class="modal fade" id="pnlBarcodeScan" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Scan Meter Barcode</h5>
                <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="barcodeReader" style="width:100%;min-height:320px;"></div>
            </div>
        </div>
    </div>
</div>

<!-- Rollover Confirmation Modal -->
<div class="modal" id="modalRollover" style="background-color: rgba(0,0,0,0.5);" tabindex="-1">
<div class="modal-dialog modal-dialog-centered">
<div class="modal-content border-0 shadow">
<div class="modal-header bg-danger text-white border-bottom-0">
<h5 class="modal-title d-flex align-items-center gap-2 fw-bold">
<i class="bi bi-exclamation-triangle-fill"></i> Confirm Rollover
                </h5>
</div>
<div class="modal-body p-4">
<p class="mb-3">You entered <strong class="text-primary" id="modalEnding">0</strong> which is lower than the previous reading <strong id="modalBeginning">0</strong>.</p>
<p class="mb-4">Has this meter completed its cycle and rolled back to zero?</p>
<div class="bg-light p-3 rounded border mb-4">
<div class="d-flex justify-content-between mb-2">
<span class="text-muted small">Max Meter Digits:</span>
<span class="font-monospace" id="modalMaxVal">99999</span>
</div>
<div class="d-flex justify-content-between border-top pt-2">
<span class="fw-bold small">Calculated Rollover Usage:</span>
<span class="fw-bold text-primary font-monospace" id="modalCalcUsage">0</span>
</div>
</div>
<div class="d-flex justify-content-end gap-2">
<button class="btn btn-light border" onclick="closeRolloverModal(false)" type="button">No, Fix Entry</button>
<button class="btn btn-danger" onclick="closeRolloverModal(true)" type="button">Yes, Confirm Rollover</button>
</div>
</div>
</div>
</div>
</div>

<input type="hidden" id="hdnMeterNo"/>
<input type="hidden" id="hdnType"/>
<input type="hidden" id="hdnFlag"/>
<input type="hidden" id="hdnPeriod"/>
<input type="hidden" id="hdnStatus"/>

<asp:ScriptManager ID="ScriptManager1" runat="server" EnablePageMethods="true" />
<script type="text/javascript" src="../JSCus/meterreading.js"></script>
<script type="text/javascript" src="../JSCus/html5-qrcode.min.js"></script>
</asp:Content>
