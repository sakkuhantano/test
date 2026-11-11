<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="templatelookup.aspx.cs" Inherits="UTL1.Secure.templatelookup" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Select PM Checklist Template</title>
    <link rel="stylesheet" type="text/css" href="/WebFolder/bootstrap-5.3.8-dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="/WebFolder/bootstrap-icons-1.11.3/font/bootstrap-icons.min.css"/>
	<link rel="Stylesheet" type="text/css" href="../CSSCus/templatelookup.css" />

    <script type="text/javascript" src="/WebFolder/jquery/jquery-3.7.0.min.js"></script>
    <script type="text/javascript" src="/WebFolder/bootstrap-5.3.0-dist/js/bootstrap.bundle.min.js"></script>
</head>
<body class="bg-light">
<!-- BEGIN: MainModal -->
<input type="hidden" id="hdnTemplateNo">
<input type="hidden" id="hdnVersion">
<div id="templateLookupModal" class="modal d-block position-relative" style="z-index: 1050;" tabindex="-1">
<div class="modal-dialog modal-dialog-centered modal-xl-custom mx-auto">
<div class="modal-content custom-modal-content">
<!-- Modal Header -->
<div class="modal-header">
<h5 class="modal-title modal-title-custom">
<i class="bi bi-card-checklist text-primary me-2"></i>Select PM Checklist Template
        </h5>
<button aria-label="Close" class="btn-close" type="button"></button>
</div>
<!-- Modal Body (Split Layout) -->
<div class="modal-body">

<div class="split-container">
<!-- BEGIN: Left Panel -->
<div class="left-panel">
<!-- Search -->
<div class="search-section d-flex gap-2">
<div class="input-group search-input-group flex-grow-1">
<input
    id="txtSearch"
    autocomplete="off"
    spellcheck="false"
    class="form-control"
    placeholder="Search template..."
    type="search">
<span class="input-group-text"><i class="bi bi-search"></i></span>
</div>
<button class="btn filter-btn"><i class="bi bi-funnel"></i></button>
</div>
<!-- List Header -->
<div class="list-header">
<span id="lblTotalTemplate">Templates (0)</span>
<span id="btnSort">
Sort by :
<b>Template No</b>
<i class="bi bi-arrow-down-short"></i>
</span>
</div>
<!-- Template List -->
<div id="templateList" class="template-list"></div>
<!-- Pagination -->
<div class="pagination-container">
<ul id="pager" class="pagination pagination-sm"></ul>
</ul>
</div>
</div>
<!-- END: Left Panel -->
<!-- BEGIN: Right Panel -->
<div class="right-panel">
<!-- Preview Card -->
<div class="preview-card">
<div class="preview-header" class="preview-header">
                Template Preview (Active Version)
                <span class="status-badge">Active</span>
</div>
<div class="details-grid">
<div>
<div class="detail-row">
<div class="detail-label">Template No</div><div>:</div>
<div id="lblTemplateNo" class="detail-value"></div>
</div>
<div class="detail-row">
<div class="detail-label">Template Name</div><div>:</div>
<div id="lblTemplateName" class="detail-value"></div>
</div>
<div class="detail-row mt-2">
<div class="detail-label">Version</div><div>:</div>
<div id="lblVersion" class="detail-value text-primary-custom"></div>
</div>
</div>
<div>
<div class="detail-row">
<div class="detail-label">Effective Date</div><div>:</div>
<div id="lblEffective" class="detail-value"></div>
</div>
<div class="detail-row mt-3">
<div class="detail-label">Total Category</div><div>:</div>
<div id="lblTotalSection" class="detail-value"></div>
</div>
<div class="detail-row">
<div class="detail-label">Total Item</div><div>:</div>
<div id="lblTotalItem" class="detail-value"></div>
</div>
</div>
</div>
</div>
<!-- Structure Section -->

<div class="structure-panel">
<div class="structure-header">
<div class="structure-title">Checklist Structure (Read Only)</div>
<div class="expand-links">
<a id="btnExpandAll" href="#" data-mode="expand">Expand All</a>
|
<a id="btnCollapseAll" href="#" data-mode="collapse">Collapse All</a>
</div>
</div>
<div class="accordion custom-accordion" id="checklistAccordion"></div>
</div>

</div>
</div>
<!-- END: Right Panel -->
</div>

<div class="modal-footer">
<button id="btnCancel" class="btn btn-cancel" type="button">Cancel</button>
<button id="btnUseTemplate" class="btn btn-use" type="button"><i class="bi bi-check2"></i> Use Template</button>
</div>

</div>
<!-- Modal Footer -->
</div>

</div>
<!-- END: MainModal -->
<!--<script type="text/javascript" src="../JSCus/GFC.js"></script>-->
<script type="text/javascript" src="../JSCus/templatelookup.js"></script>
</body>
</html>
