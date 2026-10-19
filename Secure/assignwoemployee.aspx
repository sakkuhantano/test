<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPages/Site1.Master" AutoEventWireup="true" CodeBehind="assignwoemployee.aspx.cs" Inherits="UTL1.Secure.assignwoemployee" %>
<%@ MasterType VirtualPath="~/MasterPages/Site1.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
<link rel="Stylesheet" type="text/css" href="../CSSCus/assignwoemployee.css" />
</asp:Content>
<asp:Content ID="Content3" ContentPlaceHolderID="stickybar" runat="server">
<div class="sticky-bar-wrapper w-100">
<div class="d-flex align-items-center w-100 justify-content-between px-2">
    <div class="d-flex align-items-center gap-2 w-100 p-2 mt-2 shadow-sm overflow-hidden">
        <div class="d-flex align-items-center gap-2 gap-sm-3 flex-grow-1 overflow-hidden">
            <h1 class="h5 mb-0 fw-bold">Assign WO Employee</h1>
        </div>
    </div>
</div>
<div class="d-flex align-items-center px-2 w-100">
<!-- BEGIN: Filter Section -->
<section class="filter-card p-2 p-lg-2 mb-2 mb-lg-2 w-100">
<div class="row g-2 align-items-end">
<!-- Period -->
<div class="col-6 col-lg-auto">
<label class="form-label text-uppercase text-muted small fw-bold mb-2 d-none d-lg-block">Period</label>
<label class="form-label text-muted small mb-1 d-lg-none">Year</label>
<select id="ddlYear" class="form-select form-select-sm"></select>
</div>
<div class="col-6 col-lg-auto">
<label class="form-label text-muted small mb-1 d-lg-none">Week</label>
<select id="ddlWeek" class="form-select form-select-sm"></select>
</div>
<!-- Section -->
<div class="col-12 col-lg-auto flex-lg-grow-1" style="max-width: 250px;">
<label class="form-label text-uppercase text-muted small fw-bold mb-2 d-none d-lg-block">Section</label>
<label class="form-label text-muted small mb-1 d-lg-none">Section</label>
<select id="ddlSection" class="form-select form-select-sm"></select>
</div>
<!-- Status & Keyword (Desktop Only) -->
<div class="col-auto d-none d-lg-block" style="width: 150px;">
<label class="form-label text-uppercase text-muted small fw-bold mb-2">Status</label>
<select id="ddlStatus" class="form-select form-select-sm">
<option value="" selected="">All</option>
<option value="1">Unassigned</option>
<option value="2">Assigned</option>
</select>
</div>
<div class="col-auto d-none d-lg-block flex-grow-1 position-relative">
<label class="form-label text-uppercase text-muted small fw-bold mb-2">Keyword <span class="text-lowercase fw-normal">(Equipment / WO No.)</span></label>
<div class="input-group input-group-sm">
<input id="txtKeyword" class="form-control" placeholder="Search equipment or WO No." type="text">
<span class="input-group-text bg-transparent"><i class="bi bi-search"></i></span>
</div>
<div class="form-check form-check-inline mt-1" style="position: absolute; bottom: -26px;">
    <input class="form-check-input" type="checkbox" id="chkGlobalSearch" style="cursor: pointer;">
    <label class="form-check-label small text-muted" for="chkGlobalSearch" style="cursor: pointer; user-select: none;">
        Global Search
    </label>
</div>
</div>
<!-- Search Action (Mobile) -->
<div class="col-12 d-lg-none mt-3">
<button type="button" onclick="executeWOSearch()" class="btn btn-primary w-100">Search</button>
</div>
<!-- Actions (Desktop) -->
<div class="col-auto d-none d-lg-flex gap-2 ms-auto">
<button id="btnReset" class="btn btn-outline-secondary btn-sm px-4">Reset</button>
<button id="btnSearch" class="btn btn-primary btn-sm px-4">Search</button>
</div>
</div>
<!-- Summary Bar -->
<div class="summary-bar p-2 mt-4 d-flex align-items-center gap-2 flex-nowrap overflow-auto text-nowrap">
<i class="bi bi-clock-history text-primary"></i>
<span><strong>Period:</strong> <span id="lblSummaryPeriod">-</span></span>
<span class="text-muted d-none d-lg-inline">|</span>
<span><strong>Section:</strong> <span id="lblSummarySection">-</span></span>
<span class="text-muted d-none d-lg-inline">|</span>
<span class="d-lg-none">|</span>
<span class=""><strong>Total WO:</strong><span id="lblSummaryTotal">0</span></span>
<span class="text-muted d-none d-lg-inline">|</span>
<span><strong>Selected:</strong><span id="lblSummarySelected">0</span></span>
</div>
</section>
<!-- END: Filter Section -->
</div>
</div>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
<!-- BEGIN: Split Content Area -->

<div class="row g-2 g-lg-2 align-items-stretch" id="woListPage">
<!-- Left Column: Work Order List -->
<div id="woPanel" class="col-12">
<div class="content-panel d-flex flex-column p-3 p-lg-3">
<!-- Header & Actions -->
<div class="d-flex justify-content-between align-items-center mb-2">
<h2 class="h6 mb-0 fw-bold text-uppercase d-flex align-items-center gap-2">
              Work Order List
              <span id="lblWOTotalBadge" class="badge text-bg-primary rounded-pill bg-opacity-10 text-primary border border-primary-subtle">0</span>
</h2>
<div class="d-lg-none">
<button class="btn btn-outline-secondary btn-sm"><i class="bi bi-funnel"></i></button>
</div>
</div>
<div class="d-flex justify-content-between align-items-center mb-2">
<div class="form-check">
<input class="form-check-input" id="selectAllWO" type="checkbox">
<label class="form-check-label small" for="selectAllWO">
                Select Page <span class="badge bg-light text-dark ms-2"><span id="lblCurrentPageSelected">5</span>/<span id="lblCurrentPageCount">20</span></span>
</label>
</div>
<div class="d-none d-lg-flex gap-2">
<button id="btnSelectAllResult" type="button" class="btn btn-outline-primary btn-sm">Select All Result</button>
<button id="btnClearSelection" class="btn btn-outline-secondary btn-sm"><i class="bi bi-x-circle"></i> Clear Selection</button>
</div>
</div>
<!-- Top Pagination -->
<div
    id="desktopPaginationTop"
    class="d-none d-lg-flex justify-content-between align-items-center mb-2">
    <span
        class="small text-muted"
        id="paginationInfoTop"><i class="bi bi-grid-3x3-gap-fill me-1"></i>
    </span>
    <nav aria-label="Page navigation">
        <ul
            class="pagination pagination-sm mb-0"
            id="paginationContainerTop">
        </ul>
    </nav>
</div>
<!-- Desktop Table View -->
<div id="woTableContainer" class="table-responsive d-none d-lg-block flex-grow-1">
<table class="table table-borderless table-hover mb-0 text-nowrap" id="tblWO">
<thead  id="woTableHeader" class="border-bottom small text-muted">
<tr>
<th scope="col" style="width: 40px;"></th>
<th scope="col" class="">WO No.</th>
<th scope="col" class="">Equipment</th>
<th scope="col" class="">Section</th>
<th scope="col" class="">Status</th>
<th scope="col" class="">Employee Assigned</th>
</tr>
</thead>
<tbody class="small" id="tblWOBody">
</tbody>
</table>
</div>
<!-- Mobile Card View -->
<div class="d-lg-none pb-5 pb-lg-0" id="mobileWOList">
</div>
<!-- Pagination (Desktop) -->
<div class="d-none d-lg-flex justify-content-between align-items-center mt-3 pt-3 border-top" id="desktopPagination">
<nav aria-label="Page navigation">
	<ul class="pagination pagination-sm mb-0" id="paginationContainer">
	</ul>
</nav>
<span class="small text-muted" id="paginationInfo"><i class="bi bi-list-ul me-1"></i>
</span>
</div>

</div>
</div>
<div id="mobileBottomAction"
     class="mobile-bottom-action d-lg-none d-none">
    <div class="d-flex align-items-center justify-content-between">
        <div>
            <div class="fw-semibold">
                <span id="lblMobileSelectedCount">0</span>
                Selected
            </div>
            <div class="small text-muted">
                Ready to Assign
            </div>
        </div>
        <div class="d-flex gap-2">
            <button
                id="btnMobileClear"
                class="btn btn-outline-secondary">
                Clear
            </button>
            <button
                id="btnMobileAssign"
                class="btn btn-primary">
                Assign
            </button>
        </div>
    </div>
</div>
<!-- END: Left Column -->

<!-- BEGIN: Right Column: Employee List (Desktop Only) -->
<div id="employeePanel" class="col-12 col-lg-4 col-xl-4 d-none">
<div class="content-panel d-flex flex-column p-3">
<h2 id="panelTitle"
    class="h6 mb-2 fw-bold text-uppercase">

    <button
        type="button"
        id="mobileEmployeeBack"
        class="btn btn-sm btn-light border mobile-employee-back">

        <i class="bi bi-arrow-left"></i>
        Work Orders

    </button>

    <span class="mobile-employee-title">

        <span id="panelTitleText">
            Assigned Employees
        </span>

        <span id="lblEmployeeCount"
              class="badge text-bg-primary rounded-pill bg-opacity-10 text-primary border border-primary-subtle">
            0
        </span>

    </span>

</h2>
<div id="selectedWOInfo" class="alert alert-light py-2 px-3 mb-2"></div>
<div id="assignWarning" class="alert alert-warning py-2 d-none mb-3"></div>
<!--<h6 id="employeeCaption" class="fw-semibold mb-2">Current Assignment</h6>-->
<div class="mb-3">
    <label class="form-label fw-semibold mb-2">
        Operation
    </label>
    <div class="btn-group w-100" role="group">
        <input type="radio"
               class="btn-check"
               name="assignMode"
               id="modeReplace"
               value="REPLACE"
               checked>
        <label class="btn btn-outline-primary btn-sm"
               for="modeReplace">
            Replace
        </label>
        <input type="radio"
               class="btn-check"
               name="assignMode"
               id="modeAdd"
               value="ADD">

        <label class="btn btn-outline-success btn-sm"
               for="modeAdd">
            Add
        </label>
        <input type="radio"
               class="btn-check"
               name="assignMode"
               id="modeRemove"
               value="REMOVE">
        <label class="btn btn-outline-danger btn-sm"
               for="modeRemove">
            Remove
        </label>
    </div>
</div>
<div class="input-group mb-3">

    <input
        id="txtEmployeeSearch"
        class="form-control"
        placeholder="Search employee..." />

    <button class="btn btn-outline-secondary">

        <i class="bi bi-search"></i>

    </button>

</div>
<div class="employee-toolbar">

    <div class="employee-title">

        <h4 class="mb-0">
            EMPLOYEE LIST
        </h4>

        <span id="lblEmployeeListCount"
              class="badge rounded-pill bg-secondary ms-2">
            20
        </span>

    </div>

    <div class="employee-sort">

        <select id="ddlEmployeeSort"
                class="form-select form-select-sm">
            <option value="NAME_ASC" selected>A - Z</option>
            <option value="NAME_DESC">Z - A</option>
            <option value="WO_DESC">Highest Workload</option>
            <option value="WO_ASC">Lowest Workload</option>
        </select>

    </div>

</div>
<div class="d-flex justify-content-between align-items-center mb-2">

    <div class="form-check">

        <input
            id="chkAllEmployee"
            class="form-check-input"
            type="checkbox">

        <label
            class="form-check-label fw-semibold"
            for="chkAllEmployee">

            Select All
        </label>

    </div>

    <small class="text-muted">

        <span id="lblEmployeeSelected">0</span> /
        <span id="lblEmployeeTotal">0</span>

    </small>

</div>
<div id="employeeListContainer" class="flex-grow-1 overflow-auto mt-3">
<ul class="list-group list-group-flush small" id="employeeList" data-loaded="0">
</ul>
</div>
<div class="pt-3 border-top">
<button id="btnAssign" class="btn btn-primary w-100 mt-3">
Save Employee
</button>
</div>
</div>
</div>
</div>
<!-- END: Right Column -->
<!-- END: Split Content Area -->
<!-- BEGIN: Mobile Action Bar -->
<div id="mobilePagination" class="d-lg-none py-2 border-top">
</div>
<!-- END: Mobile Action Bar -->
<asp:ScriptManager ID="ScriptManager1" runat="server" EnablePageMethods="true" />

<script type="text/javascript" src="../JSCus/assignwoemployee.js"></script>
</asp:Content>
