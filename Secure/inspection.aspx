<%@ Page Title="Inspection Entry" Language="C#" MasterPageFile="~/MasterPages/Site1.Master" AutoEventWireup="true" CodeBehind="inspection.aspx.cs" Inherits="UTL1.Secure.inspection" %>
<%@ MasterType VirtualPath="~/MasterPages/Site1.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
<style>
    .inspection-card { border: 1px solid var(--bs-border-color); border-radius: .75rem; background: var(--bs-body-bg); }
    .inspection-approval-toolbar { width: 100%; }
    .inspection-filter-control { flex: 1 1 145px; min-width: 125px; }
    .inspection-date-control { flex: 0 1 135px; min-width: 120px; }
    .inspection-approval-tabs { flex: 0 0 auto; white-space: nowrap; }
    .inspection-record-tabbar { flex-wrap: nowrap !important; justify-content: flex-start !important; overflow-x: auto; overflow-y: hidden; }
    #inspectionRecordTabs { flex: 0 0 auto; white-space: nowrap; }
    #inspectionSubmittedFilters:not(.d-none) { display: flex !important; flex: 0 0 auto; flex-wrap: nowrap !important; margin-left: .5rem; white-space: nowrap; }
    #inspectionSubmittedFilters .inspection-date-control { flex: 0 0 135px; min-width: 135px; }
    #inspectionApprovalDateFilters:not(.d-none) { display: flex !important; }
    #inspectionScrollTools { position: fixed; right: 1rem; bottom: 1.25rem; z-index: 2070; flex-direction: column; gap: .5rem; }
    #inspectionScrollTools:not(.d-none) { display: flex; }
    #inspectionScrollTools .btn { width: 42px; height: 42px; border-radius: 50%; opacity: .72; box-shadow: 0 .2rem .6rem rgba(0,0,0,.18); }
    #inspectionScrollTools .btn:hover, #inspectionScrollTools .btn:focus { opacity: 1; }
    @media (min-width: 1200px) {
        .inspection-filter-control { flex-basis: 145px; }
    }
    @media (max-width: 767.98px) {
        .inspection-filter-control { flex: 1 1 130px; }
        .inspection-date-control { flex: 1 1 120px; }
        .inspection-approval-tabs { flex: 1 1 auto; }
    }
    .inspection-step { border-left: 3px solid var(--bs-primary); padding-left: .75rem; }
    .inspection-item { border: 1px solid var(--bs-border-color); border-radius: .65rem; padding: .85rem; margin-bottom: .75rem; }
    .inspection-item.anomaly { border-color: var(--bs-danger); }
    .inspection-item-label { font-weight: 600; margin-bottom: .65rem; display: block; }
    .inspection-muted { font-size: .8rem; color: var(--bs-secondary-color); }
    .inspection-photo-panel { border: 1px solid var(--bs-border-color); border-radius: .65rem; padding: .85rem; }
    .inspection-photo-item { width: 112px; height: 112px; position: relative; border: 1px solid var(--bs-border-color); border-radius: .5rem; overflow: hidden; }
    .inspection-photo-item img { width: 100%; height: 100%; object-fit: cover; }
    .inspection-photo-delete { position: absolute; top: .25rem; right: .25rem; line-height: 1; padding: .1rem .35rem; }
    .inspection-photo-item { cursor: zoom-in; }
    .inspection-photo-item:focus-visible { outline: 3px solid var(--bs-primary); outline-offset: 2px; }
    .inspection-approval-photo-item { display: block; padding: 0; background: transparent; }
    .inspection-followup-section-btn { min-width: 92px; text-align: center; }
    .inspection-followup-section-btn i { font-size: 1.25rem; display: block; margin-bottom: .25rem; }
    #inspectionFollowUpPanel .accordion-button::after,
    #inspectionSummaryPanel .accordion-button::after { display: none; }
    .inspection-photo-viewer-open { overflow: hidden; }
    .inspection-photo-viewer { position: fixed; inset: 0; z-index: 2050; display: flex; flex-direction: column; background: rgba(0,0,0,.94); color: #fff; padding: max(.75rem, env(safe-area-inset-top)) .75rem max(.75rem, env(safe-area-inset-bottom)); }
    .inspection-photo-viewer.d-none { display: none !important; }
    .inspection-photo-viewer-header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; min-height: 44px; }
    .inspection-photo-viewer-stage { display: flex; flex: 1; min-height: 0; align-items: center; justify-content: center; gap: .5rem; touch-action: pan-y; }
    .inspection-photo-viewer-image { display: block; max-width: calc(100vw - 112px); max-height: calc(100dvh - 150px); width: auto; height: auto; object-fit: contain; user-select: none; -webkit-user-drag: none; }
    .inspection-photo-viewer-nav { flex: 0 0 auto; width: 42px; height: 52px; padding: 0; font-size: 1.5rem; }
    .inspection-photo-viewer-footer { text-align: center; padding-top: .5rem; color: rgba(255,255,255,.8); font-size: .9rem; }
    @media (max-width: 480px) {
        .inspection-photo-viewer-stage { gap: .2rem; }
        .inspection-photo-viewer-image { max-width: calc(100vw - 100px); max-height: calc(100dvh - 145px); }
        .inspection-photo-viewer-nav { width: 34px; height: 46px; }
    }
    .inspection-option-choice { min-width: 4.5rem; border-radius: .4rem !important; }
    #inspectionEditorTabs .nav-link.active { font-weight: 700; }
    .inspection-saved-row { border-bottom: 1px solid var(--bs-border-color); padding: .7rem 0; }
    .inspection-saved-row:last-child { border-bottom: 0; }
    #inspectionChecklistHost input, #inspectionChecklistHost select, #inspectionChecklistHost textarea { min-height: 38px; }
    #inspectionFormSubtitle { white-space: pre-line; }

    /* Keep inspection entry and supervisor approval usable on narrow phones. */
    .inspection-card, .inspection-item, .inspection-photo-panel { min-width: 0; }
    .inspection-item-label, .inspection-muted { overflow-wrap: anywhere; }
    .inspection-option-list { min-width: 0; }
    .inspection-option-choice { max-width: 100%; white-space: normal; }
    #inspectionApprovalDetailPanel,
    #inspectionApprovalParameters,
    #inspectionApprovalDetail { min-width: 0; overflow-wrap: anywhere; }
    #inspectionApprovalDetailPanel .table-responsive { max-width: 100%; }

    @media (max-width: 575.98px) {
        .inspection-card { padding: .75rem !important; }
        .inspection-approval-toolbar > .inspection-filter-control {
            flex: 1 1 calc(50% - .5rem);
            min-width: 0;
        }
        #inspectionApprovalDateFilters {
            flex: 1 1 100%;
            flex-wrap: wrap;
            min-width: 0;
        }
        #inspectionApprovalDateFilters .inspection-date-control {
            flex: 1 1 120px;
            min-width: 0;
        }
        .inspection-approval-tabs { flex: 0 0 auto; }
        #inspectionSubmittedFilters { flex: 0 0 auto !important; }
        #inspectionSubmittedFilters .inspection-date-control { flex: 0 0 115px; min-width: 115px; }
        #inspectionApprovalBatchActions { flex: 1 1 100%; }
        #inspectionApprovalBatchActions .btn { flex: 1 1 auto; }
        .inspection-photo-panel .d-flex.align-items-center.justify-content-between {
            flex-wrap: wrap;
        }
        #inspectionFollowUpPanel .btn-group.w-100 {
            flex-direction: column;
            gap: .35rem;
        }
        #inspectionFollowUpPanel .btn-group.w-100 > .btn {
            width: 100%;
            border-radius: .375rem !important;
        }
        #inspectionFormPanel > .d-flex.flex-wrap.gap-2 > .btn {
            flex: 1 1 100%;
        }
        #inspectionApprovalDetailPanel .d-flex.justify-content-end .btn {
            flex: 1 1 auto;
        }
        #inspectionScrollTools { right: .5rem; bottom: .75rem; }
        #inspectionScrollTools .btn { width: 38px; height: 38px; }
    }
</style>
</asp:Content>

<asp:Content ID="Content3" ContentPlaceHolderID="stickybar" runat="server">
<div class="sticky-bar-wrapper w-100">
    <div class="d-flex align-items-center justify-content-between gap-2 p-2">
        <div class="flex-grow-1 text-center">
            <div class="fw-bold">Inspection Entry</div>
            <div class="inspection-muted" id="inspectionConnectionLabel">Offline-ready</div>
        </div>
        <div class="d-flex align-items-center gap-1">
            <span id="inspectionConflictBadge" class="badge rounded-pill text-bg-danger d-none" title="Inspection conflict">!</span>
        </div>
    </div>
</div>
</asp:Content>

<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
<div class="container-fluid px-2 px-md-3 pb-4">
    <div id="inspectionApprovalPanel" class="inspection-card p-3 mb-3 d-none">
        <div id="inspectionApprovalListView">
        <div id="inspectionApprovalListHeader" class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <div class="text-uppercase text-primary fw-bold inspection-muted">Supervisor</div>
                <h5 class="mb-0">Inspection Approval</h5>
                <div class="inspection-muted">Inspeksi Complete dari teknisi pada section yang menjadi tanggung jawab Anda.</div>
            </div>
            <button type="button" id="btnRefreshInspectionApproval" class="btn btn-sm btn-outline-primary">Refresh</button>
        </div>
            <div class="inspection-approval-toolbar mb-3">
                <div class="d-flex flex-wrap align-items-end gap-2 mb-3">
            <div class="inspection-filter-control">
                <label for="selApprovalType" class="form-label small mb-1">Type</label>
                <select id="selApprovalType" class="form-select form-select-sm"><option value="">All types</option></select>
            </div>
            <div class="inspection-filter-control">
                <label for="selApprovalDetail" class="form-label small mb-1">Detail</label>
                <select id="selApprovalDetail" class="form-select form-select-sm"><option value="">All details</option></select>
            </div>
            <div class="inspection-filter-control">
                <label for="selApprovalTemplate" class="form-label small mb-1">Template</label>
                <select id="selApprovalTemplate" class="form-select form-select-sm"><option value="">All templates</option></select>
            </div>
            <div id="inspectionApprovalDateFilters" class="d-none align-items-end gap-2">
                <div class="inspection-date-control"><label for="txtApprovalDateFrom" class="form-label small mb-1">From</label><input type="date" id="txtApprovalDateFrom" class="form-control form-control-sm" aria-label="Approved date from" /></div>
                <div class="inspection-date-control"><label for="txtApprovalDateThru" class="form-label small mb-1">Thru</label><input type="date" id="txtApprovalDateThru" class="form-control form-control-sm" aria-label="Approved date thru" /></div>
                </div>
                </div>
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <ul class="nav nav-tabs inspection-approval-tabs mb-0" id="inspectionApprovalQueueTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button type="button" class="nav-link active" id="btnInspectionApprovalOutstanding" role="tab" aria-selected="true">
                        Outstanding <span id="inspectionApprovalOutstandingCount" class="badge text-bg-secondary ms-1">0</span>
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button type="button" class="nav-link" id="btnInspectionApprovalApproved" role="tab" aria-selected="false">
                        Approved <span id="inspectionApprovalApprovedCount" class="badge text-bg-secondary ms-1">0</span>
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button type="button" class="nav-link" id="btnInspectionApprovalVoid" role="tab" aria-selected="false">
                        Void <span id="inspectionApprovalVoidCount" class="badge text-bg-secondary ms-1">0</span>
                    </button>
                </li>
            </ul>
            <div id="inspectionApprovalBatchActions" class="d-flex flex-wrap align-items-center gap-1">
                <button type="button" id="btnApprovalSelectAll" class="btn btn-sm btn-outline-secondary" title="Select all filtered inspections" aria-label="Select all filtered inspections">Select All</button>
                <button type="button" id="btnBatchApproveInspection" class="btn btn-sm btn-success" title="Approve selected inspections" aria-label="Approve selected inspections">Approve</button>
                <button type="button" id="btnBatchVoidInspection" class="btn btn-sm btn-outline-danger" title="Void selected inspections" aria-label="Void selected inspections">Void</button>
            </div>
                </div>
            </div>
        <div class="table-responsive">
            <table class="table table-sm table-hover align-middle">
                <thead><tr>
                    <th id="thInspectionApprovalSelectAll"><input type="checkbox" id="chkAllInspectionApproval" class="form-check-input" aria-label="Select all filtered inspections"></th>
                    <th>Transaction No.</th><th>Inspection Type</th><th>Inspection Type Detail</th>
                    <th>Date</th><th>Scheduled</th><th>Start – End</th><th>Technician</th>
                </tr></thead>
                <tbody id="inspectionApprovalQueue"><tr><td colspan="8" class="text-muted py-3">Memuat antrean...</td></tr></tbody>
            </table>
        </div>
    </div>

    <div id="inspectionApprovalDetailPanel" class="border-top pt-3 d-none">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <div>
                <h5 class="mb-1">Inspection Detail</h5>
                <div id="inspectionApprovalDetailSubtitle" class="inspection-muted"></div>
            </div>
            <button type="button" id="btnBackToInspectionApprovalList" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Back to List
            </button>
        </div>
        <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item"><button class="nav-link active" id="inspectionApprovalParamTab" data-bs-toggle="tab" data-bs-target="#inspectionApprovalParamPane" type="button" role="tab">PARAMETERS</button></li>
            <li class="nav-item"><button class="nav-link" id="inspectionApprovalChecklistTab" data-bs-toggle="tab" data-bs-target="#inspectionApprovalChecklistPane" type="button" role="tab">CHECKLIST</button></li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="inspectionApprovalParamPane"><div id="inspectionApprovalParameters"></div></div>
            <div class="tab-pane fade" id="inspectionApprovalChecklistPane"><div id="inspectionApprovalDetail" class="small"></div></div>
        </div>
        <div class="mt-4 border-top pt-3" id="inspectionApprovalRemarkPanel">
            <label for="txtInspectionApprovalRemark" class="form-label fw-semibold">Supervisor Remark (optional)</label>
            <textarea id="txtInspectionApprovalRemark" class="form-control" rows="3" maxlength="500" placeholder="Catatan supervisor..."></textarea>
        </div>
        <div class="d-flex flex-wrap justify-content-end gap-2 mt-3">
            <button type="button" id="btnApproveInspection" class="btn btn-success">Approve</button>
            <button type="button" id="btnVoidInspection" class="btn btn-outline-danger">Void</button>
        </div>
    </div>
</div>

    <div class="modal fade" id="inspectionApprovalActionModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title" id="inspectionApprovalActionTitle">Approval action</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
            <div class="modal-body">
                <div id="inspectionApprovalActionDescription" class="small text-muted mb-3"></div>
                <label for="txtInspectionApprovalActionRemark" class="form-label" id="lblInspectionApprovalActionRemark">Remark</label>
                <textarea id="txtInspectionApprovalActionRemark" class="form-control" rows="4" maxlength="500"></textarea>
                <div id="inspectionApprovalActionError" class="text-danger small mt-2 d-none"></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" id="btnConfirmInspectionApprovalAction" class="btn btn-primary">Confirm</button></div>
        </div></div>
    </div>
    <div id="inspectionScrollTools" class="d-none" aria-label="Quick scroll controls">
        <button type="button" id="inspectionScrollTop" class="btn btn-light border d-none" title="Scroll to top" aria-label="Scroll to top"><i class="bi bi-chevron-up"></i></button>
        <button type="button" id="inspectionScrollBottom" class="btn btn-light border" title="Scroll to bottom" aria-label="Scroll to bottom"><i class="bi bi-chevron-down"></i></button>
    </div>

    <div id="inspectionRecordsPanel" class="inspection-card p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
                <div class="text-uppercase text-primary fw-bold inspection-muted">Inspection Records</div>
                <h6 class="mb-0">Daftar inspeksi</h6>
            </div>
            <button type="button" class="btn btn-sm btn-primary" id="btnNewInspection">
                <i class="bi bi-plus-circle"></i> New
            </button>
        </div>
        <div class="inspection-record-tabbar d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
            <ul class="nav nav-tabs mb-0" id="inspectionRecordTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="inspectionDraftTab" data-bs-toggle="tab" data-bs-target="#inspectionDraftPane" type="button" role="tab">DRAFT</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="inspectionSubmittedTab" data-bs-toggle="tab" data-bs-target="#inspectionSubmittedPane" type="button" role="tab">SUBMITTED</button>
                </li>
            </ul>
            <div id="inspectionSubmittedFilters" class="d-none align-items-end gap-2 flex-wrap">
                <div class="inspection-date-control">
                    <label for="txtSubmittedFrom" class="form-label small mb-1">From</label>
                    <input type="date" id="txtSubmittedFrom" class="form-control form-control-sm" />
                </div>
                <div class="inspection-date-control">
                    <label for="txtSubmittedThru" class="form-label small mb-1">Thru</label>
                    <input type="date" id="txtSubmittedThru" class="form-control form-control-sm" />
                </div>
                <button type="button" id="btnFilterSubmitted" class="btn btn-sm btn-primary">
                    <i class="bi bi-search"></i> Filter
                </button>
            </div>
        </div>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="inspectionDraftPane" role="tabpanel">
                <div id="inspectionDraftList" class="small">
                    <div class="text-muted py-2">Memuat draft...</div>
                </div>
            </div>
            <div class="tab-pane fade" id="inspectionSubmittedPane" role="tabpanel">
                <div id="inspectionSubmittedList" class="small">
                    <div class="text-muted py-2">Memuat inspeksi submitted...</div>
                </div>
            </div>
        </div>
    </div>

    <div id="inspectionInputPanel" class="d-none">
    <div class="d-flex justify-content-end mb-2">
        <button type="button" id="btnBackToInspectionRecords" class="btn btn-sm btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> Back to List
        </button>
    </div>
    <div id="inspectionNotice" class="alert alert-info py-2 small mb-3">
        Pilih Inspection Type, detail inspeksi, lalu template. Data tersimpan di perangkat dan hanya disinkronkan oleh teknisi pemiliknya.
    </div>
    <ul id="inspectionEditorTabs" class="nav nav-tabs mb-3 d-none" role="tablist"><li class="nav-item"><button type="button" id="btnInspectionParamTab" class="nav-link" role="tab">PARAM</button></li><li class="nav-item"><button type="button" id="btnInspectionChecklistTab" class="nav-link active" role="tab">CHECKLIST</button></li></ul>
    <div id="inspectionParamsPane">
    <div id="inspectionStartPanel" class="inspection-card p-3 mb-3">
        <div class="inspection-step mb-3">
            <div class="fw-bold">1. Inspection Type</div>
            <div class="inspection-muted">Pilih jenis inspeksi sesuai Section login.</div>
        </div>
        <div class="mb-3">
            <label for="selInspectionType" class="form-label small fw-semibold">Inspection Type</label>
            <select id="selInspectionType" class="form-select form-select-sm">
                <option value="">Pilih Inspection Type...</option>
            </select>
        </div>

        <div class="inspection-step mb-3">
            <div class="fw-bold">2. Inspection Detail</div>
            <div class="inspection-muted">Misalnya lantai, toilet pria/wanita, dan jadwal jam inspeksi.</div>
        </div>
        <div class="mb-3">
            <label for="selInspectionDetail" class="form-label small fw-semibold">Detail / Lokasi / Jadwal</label>
            <select id="selInspectionDetail" class="form-select form-select-sm" disabled>
                <option value="">Pilih detail...</option>
            </select>
            <div id="inspectionScheduleHint" class="inspection-muted mt-1"></div>
        </div>

        <div class="inspection-step mb-3">
            <div class="fw-bold">3. Template</div>
            <div class="inspection-muted">Hanya template Inspection yang sesuai Type dan Section.</div>
        </div>
        <div class="mb-3">
            <label for="selInspectionTemplate" class="form-label small fw-semibold">Inspection Template</label>
            <select id="selInspectionTemplate" class="form-select form-select-sm" disabled>
                <option value="">Pilih template...</option>
            </select>
        </div>
        <div class="mb-3">
            <label for="txtInspectionDate" class="form-label small fw-semibold">Tanggal inspeksi</label>
            <input id="txtInspectionDate" type="date" class="form-control form-control-sm" disabled readonly aria-readonly="true" />
        </div>
        <div id="inspectionStartButtonRow"><button type="button" id="btnStartInspection" class="btn btn-primary w-100" disabled><i class="bi bi-clipboard-check"></i> Start Checklist</button></div>
    </div>
    </div>
    <div id="inspectionChecklistPane" class="d-none">
    <div id="inspectionFormPanel" class="inspection-card p-3 mb-3 d-none">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
            <div>
                <div class="inspection-muted text-uppercase">Active inspection</div>
                <h6 id="inspectionFormTitle" class="mb-1">Checklist</h6>
                <div id="inspectionFormSubtitle" class="inspection-muted"></div>
            </div>
        </div>
        <div class="inspection-photo-panel mb-3"><div class="fw-bold mb-2"><i class="bi bi-camera-fill me-2"></i>FIELD DOCUMENTATION BEFORE</div><div id="inspectionPhotoBeforeList" class="d-flex flex-wrap gap-2 mb-2"></div><div class="d-flex align-items-center justify-content-between gap-2"><label class="inspection-muted mb-0">Ambil foto sebelum inspeksi</label><button type="button" id="btnAddInspectionBeforePhoto" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('inspectionPhotoBeforeInput').click()"><i class="bi bi-camera"></i> Take Picture</button><input id="inspectionPhotoBeforeInput" type="file" accept="image/*" capture="environment" multiple hidden /></div><div id="inspectionBeforePhotoCount" class="inspection-muted mt-1">0 foto</div></div>
        <div id="inspectionChecklistGateMessage" class="alert alert-warning py-2 small"></div><div id="inspectionChecklistHost"></div>
        <div class="inspection-photo-panel mt-3" id="inspectionAfterPhotoPanel"><div class="fw-bold mb-2"><i class="bi bi-camera-fill me-2"></i>FIELD DOCUMENTATION AFTER</div><div id="inspectionPhotoAfterList" class="d-flex flex-wrap gap-2 mb-2"></div><div class="d-flex align-items-center justify-content-between gap-2"><label class="inspection-muted mb-0">Ambil foto setelah inspeksi</label><button type="button" id="btnAddInspectionAfterPhoto" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('inspectionPhotoAfterInput').click()" disabled><i class="bi bi-camera"></i> Take Picture</button><input id="inspectionPhotoAfterInput" type="file" accept="image/*" capture="environment" multiple hidden /></div><div id="inspectionAfterPhotoCount" class="inspection-muted mt-1">0 foto</div></div>
        <div class="accordion-item border-warning shadow-sm mt-3" id="inspectionFollowUpPanel">
            <div class="accordion-header"><div class="accordion-button bg-warning-subtle text-dark fw-bold">
                <i class="bi bi-lightbulb-fill fs-5 me-2 text-warning"></i><div class="d-flex flex-column">
                    <span>FOLLOW UP WORK ORDER RECOMMENDATION</span><small class="text-muted fw-normal">Tentukan apakah diperlukan Work Order lanjutan.</small>
                </div>
            </div></div>
            <div class="accordion-body p-3">
                <div class="alert alert-warning py-2 px-3 mb-3 small"><i class="bi bi-info-circle-fill me-1"></i>
                    Bila ditemukan kerusakan yang memerlukan pekerjaan lanjutan, pilih <strong>Recommend Follow Up</strong>, kemudian tentukan section yang bertanggung jawab dan isi WO Remark.
                </div>
                <div class="mb-3" data-role="followup">
                    <div class="btn-group w-100 shadow-sm" role="group" aria-label="Follow Up recommendation">
                        <input class="btn-check" type="radio" name="inspectionFollowUp" id="inspectionFollowUpNo" value="No Follow Up" checked>
                        <label class="btn btn-outline-primary" for="inspectionFollowUpNo">No Follow Up</label>
                        <input class="btn-check" type="radio" name="inspectionFollowUp" id="inspectionFollowUpYes" value="Recommend Follow Up">
                        <label class="btn btn-outline-primary" for="inspectionFollowUpYes">Recommend Follow Up</label>
                    </div>
                </div>
                <div id="inspectionFollowUpDetails" class="d-none">
                    <div class="card border-warning-subtle bg-light mb-3"><div class="card-body">
                        <label class="form-label small fw-semibold mb-2"><i class="bi bi-diagram-3-fill me-1"></i>Responsible Section</label>
                        <div id="inspectionFollowUpSectionGroup" class="d-flex flex-wrap gap-2"></div>
                        <select id="inspectionFollowUpSection" class="d-none" aria-hidden="true" tabindex="-1"><option value="">Pilih section tujuan...</option></select>
                    </div></div>
                    <div class="card border-warning-subtle bg-light"><div class="card-body">
                        <label class="form-label small fw-semibold mb-2" for="txtInspectionFollowUpRemark"><i class="bi bi-card-text me-1"></i>Follow Up Work Order Description</label>
                        <textarea id="txtInspectionFollowUpRemark" class="form-control" rows="3" maxlength="300" placeholder="Jelaskan pekerjaan lanjutan yang direkomendasikan..."></textarea>
                        <div class="d-flex justify-content-between align-items-center mt-2"><small class="text-muted">Maksimum 300 karakter.</small><small id="inspectionFollowUpRemarkCounter" class="text-muted">0 / 300</small></div>
                    </div></div>
                </div>
            </div>
        </div>
        <div class="accordion-item border-info shadow-sm mt-3" id="inspectionSummaryPanel">
            <div class="accordion-header"><div class="accordion-button bg-info-subtle text-dark fw-bold">
                <i class="bi bi-clipboard2-check-fill fs-5 me-2 text-info"></i><div class="d-flex flex-column">
                    <span>FINAL INSPECTION SUMMARY</span><small class="text-muted fw-normal">Ringkasan hasil inspeksi dan pekerjaan yang telah dilakukan.</small>
                </div>
            </div></div>
            <div class="accordion-body p-3">
                <div class="alert alert-info py-2 px-3 mb-3 small"><i class="bi bi-info-circle-fill me-1"></i>
                    Jelaskan secara singkat hasil pemeriksaan, tindakan yang dilakukan, serta kondisi akhir unit setelah pekerjaan selesai.
                </div>
                <textarea id="txtInspectionSummary" class="form-control" rows="5" maxlength="500" placeholder=""></textarea>
                <div class="d-flex justify-content-between align-items-center mt-2"><small class="text-muted">Maksimum 500 karakter.</small><small id="inspectionSummaryCounter" class="text-muted">0 / 500</small></div>
            </div>
        </div>
        <div class="d-flex flex-wrap gap-2 mt-3">
            <button type="button" id="btnSaveInspectionDraft" class="btn btn-outline-secondary flex-fill">
                <i class="bi bi-save"></i> Save Draft
            </button>
            <button type="button" id="btnDeleteInspectionDraft" class="btn btn-outline-danger flex-fill d-none">
                <i class="bi bi-trash"></i> Delete Draft
            </button>
            <button type="button" id="btnCompleteInspection" class="btn btn-primary flex-fill">
                <i class="bi bi-check-circle"></i> Done
            </button>
        </div>
        <div id="inspectionFormMessage" class="inspection-muted mt-2"></div>
    </div>
    </div>
    </div>
</div>
    <div id="inspectionPhotoViewer" class="inspection-photo-viewer d-none" role="dialog" aria-modal="true" aria-hidden="true" aria-label="Preview foto Inspection">
        <div class="inspection-photo-viewer-header">
            <div id="inspectionPhotoViewerTitle" class="fw-semibold small">FIELD DOCUMENTATION BEFORE</div>
            <button type="button" id="inspectionPhotoViewerClose" class="btn btn-outline-light btn-sm" aria-label="Tutup preview foto"><i class="bi bi-x-lg"></i> Tutup</button>
        </div>
        <div id="inspectionPhotoViewerStage" class="inspection-photo-viewer-stage">
            <button type="button" id="inspectionPhotoViewerPrev" class="btn btn-outline-light inspection-photo-viewer-nav" aria-label="Foto sebelumnya">&#8249;</button>
            <img id="inspectionPhotoViewerImage" class="inspection-photo-viewer-image" alt="" />
            <button type="button" id="inspectionPhotoViewerNext" class="btn btn-outline-light inspection-photo-viewer-nav" aria-label="Foto berikutnya">&#8250;</button>
        </div>
        <div class="inspection-photo-viewer-footer"><span id="inspectionPhotoViewerCount">1 / 1</span><div class="small">Gunakan panah atau geser foto ke kiri/kanan</div></div>
    </div>
<script type="text/javascript" src="../JSCus/inspection.js"></script>
</asp:Content>
