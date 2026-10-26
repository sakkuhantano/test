<%@ Page Title="Inspection Entry" Language="C#" MasterPageFile="~/MasterPages/Site1.Master" AutoEventWireup="true" CodeBehind="inspection.aspx.cs" Inherits="UTL1.Secure.inspection" %>
<%@ MasterType VirtualPath="~/MasterPages/Site1.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
<style>
    .inspection-card { border: 1px solid var(--bs-border-color); border-radius: .75rem; background: var(--bs-body-bg); }
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
</style>
</asp:Content>

<asp:Content ID="Content3" ContentPlaceHolderID="stickybar" runat="server">
<div class="sticky-bar-wrapper w-100">
    <div class="d-flex align-items-center justify-content-between gap-2 p-2">
        <button type="button" id="btnInspectionPageBack" class="btn btn-sm btn-outline-secondary" onclick="returnFromInspectionPage()">
            <i class="bi bi-arrow-left"></i> Back
        </button>
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
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <div class="text-uppercase text-primary fw-bold inspection-muted">Supervisor</div>
                <h5 class="mb-0">Inspection Approval</h5>
                <div class="inspection-muted">Inspeksi Complete dari teknisi pada section yang menjadi tanggung jawab Anda.</div>
            </div>
            <button type="button" id="btnRefreshInspectionApproval" class="btn btn-sm btn-outline-primary">Refresh</button>
        </div>
        <div id="inspectionApprovalNotice" class="alert alert-info py-2 small">Memuat antrean approval...</div>
        <div class="row g-2 mb-3"><div class="col-12 col-md-4"><label for="selApprovalType" class="form-label small mb-1">Inspection Type</label><select id="selApprovalType" class="form-select form-select-sm"><option value="">All types</option></select></div><div class="col-12 col-md-4"><label for="selApprovalDetail" class="form-label small mb-1">Inspection Detail</label><select id="selApprovalDetail" class="form-select form-select-sm"><option value="">All details</option></select></div><div class="col-12 col-md-4"><label for="selApprovalTemplate" class="form-label small mb-1">Template</label><select id="selApprovalTemplate" class="form-select form-select-sm"><option value="">All templates</option></select></div></div><div class="d-flex flex-wrap align-items-center gap-2 mb-3"><button type="button" id="btnApprovalSelectAll" class="btn btn-sm btn-outline-secondary">Select all filtered</button><button type="button" id="btnBatchApproveInspection" class="btn btn-sm btn-success">Approve selected</button><button type="button" id="btnBatchVoidInspection" class="btn btn-sm btn-outline-danger">Void selected</button></div>
        <div class="row g-3">
            <div class="col-12 col-lg-5"><div id="inspectionApprovalQueue" class="small">Memuat antrean...</div></div>
            <div class="col-12 col-lg-7">
                <div id="inspectionApprovalDetail" class="small text-muted">Pilih inspeksi untuk melihat detail checklist.</div>
                <div id="inspectionApprovalActions" class="d-flex gap-2 mt-3 d-none">
                    <button type="button" id="btnApproveInspection" class="btn btn-success flex-fill">Approve</button>
                    <button type="button" id="btnVoidInspection" class="btn btn-outline-danger flex-fill">Void / Return to Technician</button>
                </div>
            </div>
        </div>
    </div>
    <div id="inspectionNotice" class="alert alert-info py-2 small mb-3">
        Pilih Inspection Type, detail inspeksi, lalu template. Data tersimpan di perangkat dan hanya disinkronkan oleh teknisi pemiliknya.
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
        <ul class="nav nav-tabs mb-3" id="inspectionRecordTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="inspectionDraftTab" data-bs-toggle="tab" data-bs-target="#inspectionDraftPane" type="button" role="tab">DRAFT</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="inspectionSubmittedTab" data-bs-toggle="tab" data-bs-target="#inspectionSubmittedPane" type="button" role="tab">SUBMITTED</button>
            </li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="inspectionDraftPane" role="tabpanel">
                <div id="inspectionDraftList" class="small">
                    <div class="text-muted py-2">Memuat draft...</div>
                </div>
            </div>
            <div class="tab-pane fade" id="inspectionSubmittedPane" role="tabpanel">
                <div id="inspectionSubmittedList" class="small">
                    <div class="text-muted py-2">Memuat inspeksi submitted hari ini...</div>
                </div>
            </div>
        </div>
    </div>

    <div id="inspectionInputPanel" class="d-none">
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
        <div class="inspection-photo-panel mt-3"><div class="fw-bold mb-2"><i class="bi bi-camera-fill me-2"></i>FIELD DOCUMENTATION AFTER</div><div id="inspectionPhotoAfterList" class="d-flex flex-wrap gap-2 mb-2"></div><div class="d-flex align-items-center justify-content-between gap-2"><label class="inspection-muted mb-0">Ambil foto setelah inspeksi</label><button type="button" id="btnAddInspectionAfterPhoto" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('inspectionPhotoAfterInput').click()" disabled><i class="bi bi-camera"></i> Take Picture</button><input id="inspectionPhotoAfterInput" type="file" accept="image/*" capture="environment" multiple hidden /></div><div id="inspectionAfterPhotoCount" class="inspection-muted mt-1">0 foto</div></div>
        <div class="mt-3">
            <label for="txtInspectionSummary" class="form-label small fw-semibold">Summary / Remark</label>
            <textarea id="txtInspectionSummary" class="form-control form-control-sm" rows="3" maxlength="500" placeholder="Catatan inspeksi..."></textarea>
        </div>
        <div class="inspection-photo-panel mt-3" id="inspectionFollowUpPanel">
            <div class="fw-bold mb-2"><i class="bi bi-arrow-left-right me-2"></i>FOLLOW UP WORK ORDER</div>
            <div class="small text-muted mb-2">Pilih apakah temuan inspeksi memerlukan pekerjaan lanjutan di section/divisi lain.</div>
            <div class="btn-group w-100 mb-3" role="group" aria-label="Follow Up recommendation">
                <input type="radio" class="btn-check" name="inspectionFollowUp" id="inspectionFollowUpNo" value="No Follow Up" checked>
                <label class="btn btn-outline-primary" for="inspectionFollowUpNo">No Follow Up</label>
                <input type="radio" class="btn-check" name="inspectionFollowUp" id="inspectionFollowUpYes" value="Recommend Follow Up">
                <label class="btn btn-outline-primary" for="inspectionFollowUpYes">Recommend Follow Up</label>
            </div>
            <div id="inspectionFollowUpDetails" class="d-none">
                <label class="form-label small fw-semibold" for="inspectionFollowUpSection">Responsible Section</label>
                <select id="inspectionFollowUpSection" class="form-select form-select-sm mb-3">
                    <option value="">Pilih section tujuan...</option>
                </select>
                <label class="form-label small fw-semibold" for="txtInspectionFollowUpRemark">Follow Up Work Order Description</label>
                <textarea id="txtInspectionFollowUpRemark" class="form-control form-control-sm" rows="3" maxlength="300" placeholder="Jelaskan pekerjaan lanjutan yang direkomendasikan..."></textarea>
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
