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
    .inspection-saved-row { border-bottom: 1px solid var(--bs-border-color); padding: .7rem 0; }
    .inspection-saved-row:last-child { border-bottom: 0; }
    #inspectionChecklistHost input, #inspectionChecklistHost select, #inspectionChecklistHost textarea { min-height: 38px; }
</style>
</asp:Content>

<asp:Content ID="Content3" ContentPlaceHolderID="stickybar" runat="server">
<div class="sticky-bar-wrapper w-100">
    <div class="d-flex align-items-center justify-content-between gap-2 p-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.location.href='dashboard.aspx'">
            <i class="bi bi-arrow-left"></i> Back
        </button>
        <div class="flex-grow-1 text-center">
            <div class="fw-bold">Inspection Entry</div>
            <div class="inspection-muted" id="inspectionConnectionLabel">Offline-ready</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-primary" id="btnInspectionSync">
            <i class="bi bi-cloud-arrow-up"></i> Sync
        </button>
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

    <div class="inspection-card p-3 mb-3">
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
            <input id="txtInspectionDate" type="date" class="form-control form-control-sm" />
        </div>
        <button type="button" id="btnStartInspection" class="btn btn-primary w-100" disabled>
            <i class="bi bi-clipboard-check"></i> Start Checklist
        </button>
    </div>

    <div id="inspectionFormPanel" class="inspection-card p-3 mb-3 d-none">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
            <div>
                <div class="inspection-muted text-uppercase">Active inspection</div>
                <h6 id="inspectionFormTitle" class="mb-1">Checklist</h6>
                <div id="inspectionFormSubtitle" class="inspection-muted"></div>
            </div>
            <button type="button" id="btnCloseInspection" class="btn btn-sm btn-outline-secondary">Close</button>
        </div>
        <div id="inspectionChecklistHost"></div>
        <div class="mt-3">
            <label for="txtInspectionSummary" class="form-label small fw-semibold">Summary / Remark</label>
            <textarea id="txtInspectionSummary" class="form-control form-control-sm" rows="3" maxlength="500" placeholder="Catatan inspeksi..."></textarea>
        </div>
        <div class="d-flex gap-2 mt-3">
            <button type="button" id="btnSaveInspectionDraft" class="btn btn-outline-secondary flex-fill">
                <i class="bi bi-save"></i> Save Draft
            </button>
            <button type="button" id="btnCompleteInspection" class="btn btn-primary flex-fill">
                <i class="bi bi-check-circle"></i> Complete
            </button>
        </div>
        <div id="inspectionFormMessage" class="inspection-muted mt-2"></div>
    </div>
</div>
<script type="text/javascript" src="../JSCus/inspection.js"></script>
</asp:Content>
