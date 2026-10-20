<%@ Page Language="C#" AutoEventWireup="true" MasterPageFile="~/MasterPages/Site1.Master" CodeBehind="template.aspx.cs" Inherits="UTL1.Secure.template" %>
<%@ MasterType VirtualPath="~/MasterPages/Site1.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
    <link rel="Stylesheet" type="text/css" href="../CSSCus/template.css" />
</asp:Content>
<asp:Content ID="Content3" ContentPlaceHolderID="stickybar" runat="server">
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
<div class="module-header">
<div class="d-flex align-items-center gap-2">
<span class="breadcrumb-item">Template Builder</span>
<div class="d-flex align-items-center gap-3">
<%--<button class="btn btn-outline-secondary btn-compact"><i class="bi bi-eye"></i> Preview</button>
<button class="btn btn-outline-secondary btn-compact"><i class="bi bi-files"></i> Duplicate</button>--%>
<button type="button" class="btn btn-outline-secondary btn-compact" onclick="openInspectionTypeManager()"><i class="bi bi-card-checklist"></i> Inspection Types</button>
<button type="button" id="btnSaveAll" class="btn btn-primary btn-compact"><i class="bi bi-floppy"></i> Save All Template</button>
</div>
</div>
</div>
<!-- Mobile Navigation Tabs (visible only on mobile) -->
<div class="mobile-nav-tabs">
<div class="mobile-nav-tab active" onclick="switchTab('explorer')">Explorer</div>
<div class="mobile-nav-tab" onclick="switchTab('builder')">Builder</div>
<div class="mobile-nav-tab" onclick="switchTab('properties')">Properties</div>
</div>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
<asp:ScriptManager ID="ScriptManager1" runat="server" EnablePageMethods="true" />
<div class="module-body">
<!-- Panel 1: Template Explorer -->
<div class="panel panel-explorer" id="panel-explorer">
<div class="panel-header">
                Template Explorer
                <%--<button class="btn btn-primary btn-compact"><i class="bi bi-plus"></i> New</button>--%>
</div>
<div class="explorer-search">
<div class="p-2 border-bottom bg-light">
<div class="input-group input-group-sm">
<input
    id="txtExplorerSearch"
    class="form-control form-control-compact"
    placeholder="Search template..."
    type="text"
    autocomplete="off"/>
<button class="btn btn-outline-secondary btn-compact" type="button"><i class="bi bi-search"></i></button>
</div>
</div>
</div>
<div class="panel-content p-1">
<div class="accordion" id="explorerAccordion">

<%--<!-- ACON Category (Level 1) -->
<div class="accordion-item">
<h2 class="accordion-header" id="headingAcon">
<button aria-controls="collapseAcon" aria-expanded="true" class="category-header w-100 accordion-button" data-bs-target="#collapseAcon" data-bs-toggle="collapse" type="button">
<span><i class="bi bi-building me-1"></i> ACON</span>
<span class="badge bg-secondary text-xs ms-auto me-2">3</span>
</button>
</h2>
<div aria-labelledby="headingAcon" class="accordion-collapse collapse show" id="collapseAcon">
<div class="accordion-body">
<div class="accordion" id="aconGroupsAccordion">
<!-- ACON-001 Group (Level 2) -->
<div class="accordion-item">
<h2 class="accordion-header" id="headingAcon001">
<button aria-controls="collapseAcon001" aria-expanded="true" class="template-group-header w-100 accordion-button" data-bs-target="#collapseAcon001" data-bs-toggle="collapse" type="button">
<div class="d-flex flex-column text-start">
<div class="fw-semibold text-primary" style="font-size: 0.8rem;">Cooling Tower Inspection</div>
<div class="text-muted text-xs">ACON-001</div>
</div>
<span class="badge-status badge-status-active ms-auto me-2">Active</span>
</button>
</h2>
<div aria-labelledby="headingAcon001" class="accordion-collapse collapse show" id="collapseAcon001">
<div class="accordion-body ps-2 border-start ms-2 mb-1">
<!-- ACON-001 Versions (Level 3) -->
<div class="template-version-item">
<div class="d-flex justify-content-between align-items-start">
<div class="fw-semibold text-xs">Version 1.0</div>
<div class="d-flex gap-1 align-items-center">
<span class="text-muted text-xs">Jul 10, 2024</span>
<span class="badge-status badge-status-draft px-1 py-0" style="font-size: 0.55rem;">Inactive</span>
</div>
</div>
<div class="text-muted text-xs fst-italic text-truncate" title="Initial release">Initial release</div>
</div>
<div class="template-version-item active">
<div class="d-flex justify-content-between align-items-start">
<div class="fw-semibold text-xs text-primary">Version 2.0</div>
<div class="d-flex gap-1 align-items-center">
<span class="text-muted text-xs">Sep 15, 2024</span>
<span class="badge-status badge-status-draft px-1 py-0" style="font-size: 0.55rem;">Active</span>
</div>
</div>
<div class="text-muted text-xs fst-italic text-truncate" title="Version 2: additional new section for temperature control measurement">Version 2: additional new section for temperature...</div>
</div>
<div class="template-version-item">
<div class="d-flex justify-content-between align-items-start">
<div class="fw-semibold text-xs text-muted">Version 2.1</div>
<div class="d-flex gap-1 align-items-center">
<span class="badge-status badge-status-draft px-1 py-0" style="font-size: 0.55rem;">Draft</span>
</div>
</div>
<div class="text-muted text-xs fst-italic text-truncate" title="Updating voltage tolerance">Updating voltage tolerance</div>
</div>
</div>
</div>
</div>
<!-- ACON-002 Group (Level 2) -->
<div class="accordion-item">
<h2 class="accordion-header" id="headingAcon002">
<button aria-controls="collapseAcon002" aria-expanded="false" class="template-group-header w-100 accordion-button collapsed" data-bs-target="#collapseAcon002" data-bs-toggle="collapse" type="button">
<div class="d-flex flex-column text-start">
<div class="fw-semibold" style="font-size: 0.8rem;">AHU Inspection</div>
<div class="text-muted text-xs">ACON-002</div>
</div>
<span class="badge-status badge-status-active ms-auto me-2">Active</span>
</button>
</h2>
<div aria-labelledby="headingAcon002" class="accordion-collapse collapse" id="collapseAcon002">
<div class="accordion-body ps-2 border-start ms-2 mb-1">
<div class="template-version-item">
<div class="d-flex justify-content-between align-items-start">
<div class="fw-semibold text-xs">Version 1.0</div>
<span class="text-muted text-xs">Aug 05, 2024</span>
</div>
<div class="text-muted text-xs fst-italic text-truncate" title="Initial AHU checklist">Initial AHU checklist</div>
</div>
</div>
</div>
</div>
<!-- ACON-003 Group (Level 2) -->
<div class="accordion-item">
<h2 class="accordion-header" id="headingAcon003">
<button aria-controls="collapseAcon003" aria-expanded="false" class="template-group-header w-100 accordion-button collapsed" data-bs-target="#collapseAcon003" data-bs-toggle="collapse" type="button">
<div class="d-flex flex-column text-start">
<div class="fw-semibold" style="font-size: 0.8rem;">Chiller Inspection</div>
<div class="text-muted text-xs">ACON-003</div>
</div>
<span class="badge-status badge-status-inactive ms-auto me-2">Inactive</span>
</button>
</h2>
<div aria-labelledby="headingAcon003" class="accordion-collapse collapse" id="collapseAcon003">
<div class="accordion-body ps-2 border-start ms-2 mb-1">
<div class="template-version-item">
<div class="d-flex justify-content-between align-items-start">
<div class="fw-semibold text-xs">Version 1.0</div>
<span class="text-muted text-xs">Jan 12, 2024</span>
</div>
<div class="text-muted text-xs fst-italic text-truncate" title="Deprecated version">Deprecated version</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
<!-- MECH Category (Level 1) -->
<div class="accordion-item">
<h2 class="accordion-header" id="headingMech">
<button aria-controls="collapseMech" aria-expanded="false" class="category-header w-100 accordion-button collapsed" data-bs-target="#collapseMech" data-bs-toggle="collapse" type="button">
<span><i class="bi bi-gear me-1"></i> MECH</span>
<span class="badge bg-secondary text-xs ms-auto me-2">2</span>
</button>
</h2>
<div aria-labelledby="headingMech" class="accordion-collapse collapse" id="collapseMech">
<div class="accordion-body">
<div class="accordion" id="mechGroupsAccordion">
<div class="accordion-item">
<h2 class="accordion-header" id="headingMech001">
<button aria-controls="collapseMech001" aria-expanded="false" class="template-group-header w-100 accordion-button collapsed" data-bs-target="#collapseMech001" data-bs-toggle="collapse" type="button">
<div class="d-flex flex-column text-start">
<div class="fw-semibold" style="font-size: 0.8rem;">Pump Inspection</div>
<div class="text-muted text-xs">MECH-001</div>
</div>
<span class="badge-status badge-status-active ms-auto me-2">Active</span>
</button>
</h2>
<div aria-labelledby="headingMech001" class="accordion-collapse collapse" id="collapseMech001">
<div class="accordion-body ps-2 border-start ms-2 mb-1">
<div class="template-version-item">
<div class="d-flex justify-content-between align-items-start">
<div class="fw-semibold text-xs">Version 1.0</div>
</div>
</div>
</div>
</div>
</div>
<div class="accordion-item">
<h2 class="accordion-header" id="headingMech002">
<button aria-controls="collapseMech002" aria-expanded="false" class="template-group-header w-100 accordion-button collapsed" data-bs-target="#collapseMech002" data-bs-toggle="collapse" type="button">
<div class="d-flex flex-column text-start">
<div class="fw-semibold" style="font-size: 0.8rem;">Compressor Inspection</div>
<div class="text-muted text-xs">MECH-002</div>
</div>
<span class="badge-status badge-status-active ms-auto me-2">Active</span>
</button>
</h2>
<div aria-labelledby="headingMech002" class="accordion-collapse collapse" id="collapseMech002">
<div class="accordion-body ps-2 border-start ms-2 mb-1">
<div class="template-version-item">
<div class="d-flex justify-content-between align-items-start">
<div class="fw-semibold text-xs">Version 1.0</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
<!-- CIVIL Category (Level 1) -->
<div class="accordion-item">
<h2 class="accordion-header" id="headingCivil">
<button aria-controls="collapseCivil" aria-expanded="false" class="category-header w-100 accordion-button collapsed" data-bs-target="#collapseCivil" data-bs-toggle="collapse" type="button">
<span><i class="bi bi-cone-striped me-1"></i> CIVIL</span>
<span class="badge bg-secondary text-xs ms-auto me-2">2</span>
</button>
</h2>
<div aria-labelledby="headingCivil" class="accordion-collapse collapse" id="collapseCivil">
<div class="accordion-body">
<!-- Civil groups would go here -->
</div>
</div>
</div>
<!-- COMM Category (Level 1) -->
<div class="accordion-item">
<h2 class="accordion-header" id="headingComm">
<button aria-controls="collapseComm" aria-expanded="false" class="category-header w-100 accordion-button collapsed" data-bs-target="#collapseComm" data-bs-toggle="collapse" type="button">
<span><i class="bi bi-broadcast me-1"></i> COMM</span>
<span class="badge bg-secondary text-xs ms-auto me-2">1</span>
</button>
</h2>
<div aria-labelledby="headingComm" class="accordion-collapse collapse" id="collapseComm">
<div class="accordion-body">
<!-- Comm groups would go here -->
</div>
</div>
</div>--%>

</div>
</div>

</div>



<!-- Panel 2: Structure Builder -->
<div class="panel panel-builder active-panel" id="panel-builder">
<div class="panel-header">
                Structure Builder
                <div class="d-flex gap-1">
<%--<button class="btn btn-outline-secondary btn-compact"><i class="bi bi-gear"></i> Settings</button>--%>
<button class="btn btn-primary btn-compact" type="button" id="addSectionBtn"><i class="bi bi-plus"></i> Add Category</button>
</div>
</div>
<!-- Template Context Header (Collapsible) -->
<%--<div class="section-box border-0 border-bottom mb-0 rounded-0" style="z-index: 10;">
<div aria-expanded="false" class="section-box-header cursor-pointer bg-white" data-bs-target="#templateConfigCollapse" data-bs-toggle="collapse" style="border-bottom: 1px solid var(--border-color);">
<div class="d-flex align-items-center">
<i class="bi bi-sliders text-muted me-2"></i>
<span class="fw-bold">Template Configuration</span>
</div>
<div class="d-flex gap-1">
<i class="bi bi-chevron-down text-muted px-1 toggle-icon"></i>
</div>
</div>
<div class="collapse" id="templateConfigCollapse">
<div class="p-3 bg-white">
<div class="row g-3 mb-3">
<div class="col-md-6">
<label class="form-label text-xs fw-bold mb-1">Template Name <span class="text-danger">*</span></label>
<input class="form-control form-control-compact fw-bold" type="text" value="Cooling Tower Inspection (ACON-001)"/>
</div>
<div class="col-md-6">
<label class="form-label text-xs fw-bold mb-1">Description</label>
<input class="form-control form-control-compact" type="text" value="Preventive maintenance checklist for cooling tower system"/>
</div>
</div>
<div class="mb-1">
<label class="form-label text-xs fw-bold mb-1">Default Status Options (max 3)</label>
<div class="tag-input-container w-100" id="globalTagsContainer">
<!-- Tags will be dynamically generated here -->
</div>
</div>
</div>
</div>
</div>--%>

<div class="panel-content bg-light p-2" id="sectionsContainer">
<%--<!-- Section 1 -->
<div class="section-box" data-id="1" id="section-1">
<div aria-expanded="true" class="section-box-header cursor-pointer" data-bs-target="#section1Collapse" data-bs-toggle="collapse">
<div class="d-flex align-items-center w-100 me-2">
<i class="bi bi-grip-vertical drag-handle section-drag-handle"></i>
<span class="fw-bold me-1 section-number">1.</span>
<input class="editable-text fw-bold" onclick="event.stopPropagation()" type="text" value="General Information"/>
<span class="badge bg-secondary ms-2 text-xs item-count">5 items</span>
</div>
<div class="d-flex gap-1 align-items-center">
<i class="bi bi-trash text-danger px-1 cursor-pointer delete-section-btn"></i>
<i class="bi bi-chevron-up text-muted px-1 toggle-icon"></i>
</div>
</div>
<div class="collapse show" id="section1Collapse">
<div class="items-container">
<div class="item-row">
<i class="bi bi-grip-vertical drag-handle item-drag-handle"></i>
<span class="text-muted me-2 item-number" style="width: 25px;">1.1</span>
<span class="flex-grow-1"><input class="editable-text" type="text" value="Location / Area"/></span>
<span class="badge-type me-2">OPTION</span>
<span class="text-muted text-center" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="-"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
<div class="item-row">
<i class="bi bi-grip-vertical drag-handle item-drag-handle"></i>
<span class="text-muted me-2 item-number" style="width: 25px;">1.2</span>
<span class="flex-grow-1"><input class="editable-text" type="text" value="Date"/></span>
<span class="badge-type me-2">DATE</span>
<span class="text-muted text-center" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="-"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
<div class="item-row">
<i class="bi bi-grip-vertical drag-handle item-drag-handle"></i>
<span class="text-muted me-2 item-number" style="width: 25px;">1.3</span>
<span class="flex-grow-1"><input class="editable-text" type="text" value="Technician"/></span>
<span class="badge-type me-2">OPTION</span>
<span class="text-muted text-center" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="-"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
<div class="item-row">
<i class="bi bi-grip-vertical drag-handle item-drag-handle"></i>
<span class="text-muted me-2 item-number" style="width: 25px;">1.4</span>
<span class="flex-grow-1"><input class="editable-text" type="text" value="Weather Condition"/></span>
<span class="badge-type me-2">OPTION</span>
<span class="text-muted text-center" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="-"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
<div class="item-row">
<i class="bi bi-grip-vertical drag-handle item-drag-handle"></i>
<span class="text-muted me-2 item-number" style="width: 25px;">1.5</span>
<span class="flex-grow-1"><input class="editable-text" type="text" value="Remarks"/></span>
<span class="badge-type me-2">TEXT</span>
<span class="text-muted text-center" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="-"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
</div>
<div class="p-1 text-center bg-light border-top">
<button class="btn btn-link btn-sm text-decoration-none py-0 text-xs add-item-btn" type="button" data-section-id="section-1"><i class="bi bi-plus"></i> Add Item</button>
</div>
</div>
</div>
<!-- Section 2 -->
<div class="section-box section-box-active" data-id="2" id="section-2">
<div aria-expanded="true" class="section-box-header cursor-pointer" data-bs-target="#section2Collapse" data-bs-toggle="collapse">
<div class="d-flex align-items-center w-100 me-2">
<i class="bi bi-grip-vertical drag-handle section-drag-handle"></i>
<span class="fw-bold me-1 section-number">2.</span>
<input class="editable-text fw-bold" onclick="event.stopPropagation()" type="text" value="Electrical Inspection"/>
<span class="badge bg-secondary ms-2 text-xs item-count">5 items</span>
</div>
<div class="d-flex gap-1 align-items-center">
<i class="bi bi-trash text-danger px-1 cursor-pointer delete-section-btn"></i>
<i class="bi bi-chevron-up text-muted px-1 toggle-icon"></i>
</div>
</div>
<div class="collapse show" id="section2Collapse">
<div class="items-container">
<div class="item-row active-item">
<i class="bi bi-grip-vertical drag-handle item-drag-handle text-primary"></i>
<span class="text-primary fw-bold me-2 item-number" style="width: 25px;">2.1</span>
<span class="flex-grow-1 fw-bold text-primary"><input class="editable-text fw-bold text-primary" type="text" value="Main Voltage"/></span>
<span class="badge-type me-2">GROUP</span>
<span class="text-muted text-center text-xs" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="Volt"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
<div class="item-row">
<i class="bi bi-grip-vertical drag-handle item-drag-handle"></i>
<span class="text-muted me-2 item-number" style="width: 25px;">2.2</span>
<span class="flex-grow-1"><input class="editable-text" type="text" value="Control Voltage"/></span>
<span class="badge-type me-2">RANGE</span>
<span class="text-muted text-center text-xs" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="Volt"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
<div class="item-row">
<i class="bi bi-grip-vertical drag-handle item-drag-handle"></i>
<span class="text-muted me-2 item-number" style="width: 25px;">2.3</span>
<span class="flex-grow-1"><input class="editable-text" type="text" value="Current"/></span>
<span class="badge-type me-2">GROUP</span>
<span class="text-muted text-center text-xs" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="Ampere"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
<div class="item-row">
<i class="bi bi-grip-vertical drag-handle item-drag-handle"></i>
<span class="text-muted me-2 item-number" style="width: 25px;">2.4</span>
<span class="flex-grow-1"><input class="editable-text" type="text" value="Insulation Resistance"/></span>
<span class="badge-type me-2">INPUT</span>
<span class="text-muted text-center text-xs" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="MΩ"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
<div class="item-row">
<i class="bi bi-grip-vertical drag-handle item-drag-handle"></i>
<span class="text-muted me-2 item-number" style="width: 25px;">2.5</span>
<span class="flex-grow-1"><input class="editable-text" type="text" value="Panel Temperature"/></span>
<span class="badge-type me-2">RANGE</span>
<span class="text-muted text-center text-xs" style="width: 30px;"><input class="table-inline-input text-center text-muted" type="text" value="°C"/></span>
<i class="bi bi-trash text-danger ms-2 cursor-pointer delete-item-btn"></i>
</div>
</div>
<div class="p-1 text-center bg-light border-top">
<button class="btn btn-link btn-sm text-decoration-none py-0 text-xs add-item-btn" data-section-id="section-2"><i class="bi bi-plus"></i> Add Item</button>
</div>
</div>
</div>
<!-- Collapsed Sections -->
<div class="section-box" data-id="3" id="section-3">
<div aria-expanded="false" class="section-box-header cursor-pointer" data-bs-target="#section3Collapse" data-bs-toggle="collapse">
<div class="d-flex align-items-center w-100 me-2">
<i class="bi bi-grip-vertical drag-handle section-drag-handle"></i>
<span class="fw-bold me-1 section-number">3.</span>
<input class="editable-text fw-bold" onclick="event.stopPropagation()" type="text" value="Mechanical Inspection"/>
<span class="badge bg-secondary ms-2 text-xs item-count">0 items</span>
</div>
<div class="d-flex gap-1 align-items-center">
<i class="bi bi-trash text-danger px-1 cursor-pointer delete-section-btn"></i>
<i class="bi bi-chevron-down text-muted px-1 toggle-icon"></i>
</div>
</div>
<div class="collapse" id="section3Collapse">
<div class="items-container">
</div>
<div class="p-1 text-center bg-light border-top">
<button class="btn btn-link btn-sm text-decoration-none py-0 text-xs add-item-btn" data-section-id="section-3"><i class="bi bi-plus"></i> Add Item</button>
</div>
</div>
</div>
<div class="section-box" data-id="4" id="section-4">
<div aria-expanded="false" class="section-box-header cursor-pointer" data-bs-target="#section4Collapse" data-bs-toggle="collapse">
<div class="d-flex align-items-center w-100 me-2">
<i class="bi bi-grip-vertical drag-handle section-drag-handle"></i>
<span class="fw-bold me-1 section-number">4.</span>
<input class="editable-text fw-bold" onclick="event.stopPropagation()" type="text" value="Water System Inspection"/>
<span class="badge bg-secondary ms-2 text-xs item-count">0 items</span>
</div>
<div class="d-flex gap-1 align-items-center">
<i class="bi bi-trash text-danger px-1 cursor-pointer delete-section-btn"></i>
<i class="bi bi-chevron-down text-muted px-1 toggle-icon"></i>
</div>
</div>
<div class="collapse" id="section4Collapse">
<div class="items-container">
</div>
<div class="p-1 text-center bg-light border-top">
<button class="btn btn-link btn-sm text-decoration-none py-0 text-xs add-item-btn" data-section-id="section-4"><i class="bi bi-plus"></i> Add Item</button>
</div>
</div>
</div>--%>
</div>

</div>
    
<!-- Panel 3: Properties -->
<div class="panel panel-properties" id="panel-properties">
<%--<div class="panel-header">
                Item Properties
            </div>--%>
<div class="panel-content">

<%--<!-- General Info -->
<div class="prop-group">
<div class="prop-group-header">General Information</div>
<div class="prop-group-body">
<div class="mb-2">
<label class="form-label text-xs fw-bold mb-1">Item Name <span class="text-danger">*</span></label>
<input class="form-control form-control-compact" type="text" value="Main Voltage"/>
</div>
<div class="row g-2 mb-2">
<div class="col-8">
<label class="form-label text-xs fw-bold mb-1">Item Type <span class="text-danger">*</span></label>
<select class="form-select form-select-compact">
<option selected="">GROUP</option>
<option>OPTION</option>
</select>
</div>
<div class="col-4">
<label class="form-label text-xs fw-bold mb-1">Unit</label>
<input class="form-control form-control-compact" type="text" value="Volt"/>
</div>
</div>
<div class="d-flex gap-3 mb-2 mt-3">
<div class="form-check form-switch">
<input checked="" class="form-check-input" id="chkReqRemark" type="checkbox"/>
<label class="form-check-label text-xs" for="chkMandatory">Remark Required</label>
</div>
<div class="form-check form-switch">
<input checked="" class="form-check-input" id="chkReqValue" type="checkbox"/>
<label class="form-check-label text-xs" for="chkActive">Value Required</label>
</div>
</div>
<div class="form-check form-switch">
<input checked="" class="form-check-input" id="chkShowUnit" type="checkbox"/>
<label class="form-check-label text-xs" for="chkActive">Show Unit Measurement</label>
</div>
<div class="form-check form-switch">
<input class="form-check-input" disabled="" id="chkDefault" type="checkbox"/>
<label class="form-check-label text-xs text-muted" for="chkDefault">Use template default option</label>
</div>
</div>
</div>
<!-- Validation Rules -->
<div class="prop-group">
<div class="prop-group-header">Range</div>
<div class="prop-group-body">
<div class="row g-2 mb-2">
<div class="col-4">
<label class="form-label text-xs mb-1">Min Value</label>
<input class="form-control form-control-compact" type="number" value="380"/>
</div>
<div class="col-4">
<label class="form-label text-xs mb-1">Max Value</label>
<input class="form-control form-control-compact" type="number" value="480"/>
</div>
<div class="col-4">
<label class="form-label text-xs mb-1">Decimals</label>
<input class="form-control form-control-compact" type="number" value="0"/>
</div>
</div>
<div class="row g-2 mb-2">
<div class="col-6">
<label class="form-label text-xs mb-1">Tolerance (+/-)</label>
<input class="form-control form-control-compact" type="number" value="5"/>
</div>
<div class="col-6">
<label class="form-label text-xs mb-1">Type</label>
<select class="form-select form-select-compact">
<option selected="">Absolute</option>
<option>Percentage</option>
</select>
</div>
</div>

</div>
</div>
<!-- Option Builder -->
<div class="prop-group">
<div class="prop-group-header">OPTION List Builder</div>
<div class="prop-group-body">
<div class="text-muted text-xs mb-2">Used when Item Type is OPTION</div>
<label class="form-label text-xs fw-bold mb-1">Default Status Options (max 3)</label>
<div class="tag-input-container" id="propTagsContainer">
<!-- Tags will be dynamically generated here -->
</div>
</div>
</div>
<!-- Group Configuration -->
<div class="prop-group">
<div class="prop-group-header d-flex justify-content-between align-items-center">
                        GROUP Configuration
                        <button class="btn btn-sm py-0 px-1 border" id="addGroupBtn"><i class="bi bi-plus"></i></button>
</div>
<div class="prop-group-body p-0">
<div class="text-muted text-xs p-2 bg-light border-bottom">Used when Item Type is GROUP</div>
<table class="table table-sm table-bordered m-0" style="font-size: 0.7rem; table-layout: fixed;">
<thead class="table-light">
<tr>
<th style="width: 25px;"></th>
<th style="width: 20%;">Name</th>
<th>Label 1</th>
<th>Label 2</th>
<th>Label 3</th>
<th style="width: 20%;">Unit</th>
<th style="width: 20px;"></th>
</tr>
</thead>
<tbody id="groupConfigBody">
<!-- Rows generated dynamically -->
</tbody>
</table>
</div>
</div>--%>

</div>
</div>
</div>

<div class="modal fade" id="inspectionTypeModal" tabindex="-1" aria-labelledby="inspectionTypeModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="inspectionTypeModalLabel">Master Inspection Type &amp; Schedule Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="row g-2 mb-3">
                    <div class="col-md-3">
                        <label for="inspectionTypeSection" class="form-label">SectionID</label>
                        <select id="inspectionTypeSection" class="form-select form-select-sm"></select>
                    </div>
                    <div class="col-md-2">
                        <label for="inspectionTypeCode" class="form-label">Type Code (max 2)</label>
                        <input id="inspectionTypeCode" class="form-control form-control-sm text-uppercase" maxlength="2" autocomplete="off" />
                    </div>
                    <div class="col-md-5">
                        <label for="inspectionTypeName" class="form-label">Inspection Type Name</label>
                        <input id="inspectionTypeName" class="form-control form-control-sm" maxlength="100" autocomplete="off" />
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                        <div class="form-check mb-2">
                            <input id="inspectionTypeActive" class="form-check-input" type="checkbox" checked />
                            <label for="inspectionTypeActive" class="form-check-label">Active</label>
                        </div>
                    </div>
                </div>
                <div class="d-flex gap-2 mb-3">
                    <button type="button" class="btn btn-primary btn-sm" onclick="saveInspectionType()">Save Type</button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="resetInspectionTypeForm()">New / Clear</button>
                </div>
                <div id="inspectionTypeList" class="small text-muted mb-3">Select a section to load inspection types.</div>
                <hr />
                <div id="inspectionTypeDetailsPanel" style="display:none;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <h6 class="mb-0">Inspection Schedule Details</h6>
                            <div class="small text-muted">Selected Inspection Type: <strong id="inspectionTypeDetailsHeader"></strong></div>
                        </div>
                        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="resetInspectionTypeDetailForm()">New Detail</button>
                    </div>
                    <div class="row g-2 align-items-end mb-3">
                        <div class="col-md-3">
                            <label for="inspectionTypeDetailCode" class="form-label">Detail Code</label>
                            <input id="inspectionTypeDetailCode" class="form-control form-control-sm text-uppercase" maxlength="20" autocomplete="off" />
                        </div>
                        <div class="col-md-4">
                            <label for="inspectionTypeDetailName" class="form-label">Description / Location</label>
                            <input id="inspectionTypeDetailName" class="form-control form-control-sm" maxlength="100" autocomplete="off" />
                        </div>
                        <div class="col-md-2">
                            <label for="inspectionTypeDetailTime" class="form-label">Schedule Time</label>
                            <input id="inspectionTypeDetailTime" type="time" class="form-control form-control-sm" />
                        </div>
                        <div class="col-md-1">
                            <div class="form-check mb-1">
                                <input id="inspectionTypeDetailActive" class="form-check-input" type="checkbox" checked />
                                <label for="inspectionTypeDetailActive" class="form-check-label">Active</label>
                            </div>
                        </div>
                        <div class="col-md-2 d-flex gap-1">
                            <button type="button" class="btn btn-primary btn-sm" onclick="saveInspectionTypeDetail()">Save Detail</button>
                            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="resetInspectionTypeDetailForm()">Clear</button>
                        </div>
                    </div>
                    <div id="inspectionTypeDetailList" class="small text-muted">Select or save an Inspection Type to manage its details.</div>
                </div>
            </div>
        </div>
    </div>
</div>

    <%--<script type="text/javascript" src="../JSCus/GFC.js"></script>--%>
    <script type="text/javascript" src="../JSCus/template.js"></script>
    <script type="text/javascript" src="../JSCus/sortable.js"></script>
</asp:Content>