<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPages/Site1.Master" AutoEventWireup="true" CodeBehind="dashboard.aspx.cs" Inherits="UTL1.Secure.dashboard" %>
<%@ MasterType VirtualPath="~/MasterPages/Site1.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
    <link rel="Stylesheet" type="text/css" href="../CSSCus/dashboard.css" />
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
<div class="mb-4">
<h3 class="display-6 fw-bold mb-1">Technician Overview</h3>
<p class="text-muted small">Welcome back, <span id="lblUserNameDashboard"></span></p>
</div>
<!-- Meter Readings -->
<section id="sectionMeter" class="mb-4">

<div class="d-flex justify-content-between align-items-end mb-3">

<div>
<span class="text-uppercase fw-bold text-primary d-block mb-1"
style="font-size: 10px; letter-spacing: 0.2em;">
Utility Metrics
</span>

<h5 id="titleMeter"
class="fw-bold mb-0">
Meter Readings
</h5>

</div>

<%--<a class="text-decoration-none fw-bold small text-primary d-flex align-items-center gap-1"
href="endingmeter.aspx"
style="font-size: 12px;">
View All
<i class="bi bi-arrow-right"></i>
</a>--%>

</div>

<div id="meterRow" class="row g-3">

<!-- WATER -->
<div id="cardWater"
class="col-12 col-md-4">

<div class="card-custom air-shadow">
<a href="meterreading.aspx?type=WTR" class="text-decoration-none">
<div class="meter-card-header d-flex align-items-center gap-2">

<div class="bg-primary bg-opacity-10 rounded p-1 text-primary">
<i class="bi bi-droplet-fill fs-6"></i>
</div>

<span class="fw-bold small">
Water
</span>

</div>
</a>
<div class="list-group list-group-flush border-0">

<div class="list-group-item d-flex justify-content-between align-items-center px-3 py-2 border-0 border-bottom">

<span class="text-muted small">
Pending Entry
</span>

<span id="pendingWater"
class="fw-bold cursor-pointer">

00

</span>

</div>

<div class="list-group-item d-flex justify-content-between align-items-center px-3 py-2 border-0">

<span class="text-muted small">
Pending Sync
</span>

<span id="syncWater"
class="fw-bold">

00

</span>

</div>

</div>

</div>

</div>

<!-- ELECTRIC -->
<div id="cardElectric"
class="col-12 col-md-4">

<div class="card-custom air-shadow">
<a href="meterreading.aspx?type=ELC" class="text-decoration-none">
<div class="meter-card-header d-flex align-items-center gap-2">

<div class="bg-warning bg-opacity-10 rounded p-1 text-warning">
<i class="bi bi-lightning-fill fs-6"></i>
</div>

<span class="fw-bold small">
Electricity
</span>

</div>
</a>
<div class="list-group list-group-flush border-0">

<div class="list-group-item d-flex justify-content-between align-items-center px-3 py-2 border-0 border-bottom">

<span class="text-muted small">
Pending Entry
</span>

<span id="pendingElectric"
class="fw-bold">

00

</span>

</div>

<div class="list-group-item d-flex justify-content-between align-items-center px-3 py-2 border-0">

<span class="text-muted small">
Pending Sync
</span>

<span id="syncElectric"
class="fw-bold">

00

</span>

</div>

</div>

</div>

</div>

<!-- GAS -->
<div id="cardGas"
class="col-12 col-md-4">

<div class="card-custom air-shadow">
<a href="meterreading.aspx?type=GAS" class="text-decoration-none">
<div class="meter-card-header d-flex align-items-center gap-2">

<div class="bg-danger bg-opacity-10 rounded p-1 text-danger">
<i class="bi bi-fire fs-6"></i>
</div>

<span class="fw-bold small">
Gas
</span>

</div>
</a>
<div class="list-group list-group-flush border-0">

<div class="list-group-item d-flex justify-content-between align-items-center px-3 py-2 border-0 border-bottom">

<span class="text-muted small">
Pending Entry
</span>

<span id="pendingGas"
class="fw-bold">

00

</span>

</div>

<div class="list-group-item d-flex justify-content-between align-items-center px-3 py-2 border-0">

<span class="text-muted small">
Pending Sync
</span>

<span id="syncGas"
class="fw-bold">

00

</span>

</div>

</div>

</div>

</div>

</div>

</section>



<!-- INSPECTION -->
<section id="sectionInspectionDashboard" class="mb-4">
    <div class="d-flex justify-content-between align-items-end mb-3">
        <div>
            <span class="text-uppercase fw-bold text-primary d-block mb-1" style="font-size:10px;letter-spacing:.2em;">Field Operations</span>
            <h5 class="fw-bold mb-0">Inspections</h5>
        </div>
    </div>
    <div id="inspectionDashboardCards" class="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-2"></div>
</section>

<!-- WORK ORDER -->
<section id="sectionWO" class="mb-4">

<div class="d-flex justify-content-between align-items-end mb-3">
<div>
<span class="text-uppercase fw-bold text-primary d-block mb-1" style="font-size: 10px; letter-spacing: 0.2em;">Execution Pipeline</span>
<h5 class="fw-bold mb-0">Work Orders</h5>
</div>
<%--<a class="text-decoration-none fw-bold small text-primary d-flex align-items-center gap-1" href="#" style="font-size: 12px;">
                        Manage Full Schedule <i class="bi bi-arrow-right"></i>
</a>--%>
</div>

<div class="row g-3" id="dashboardCards">

<%--<div class="col-12 col-md-6">
<a href="workorder.aspx" style="border-left: 4px solid var(--primary-container);"
class="text-decoration-none text-dark card-custom air-shadow p-3 d-flex justify-content-between align-items-center">
<div class="d-flex align-items-center gap-3 overflow-hidden">
<div class="rounded-circle bg-light d-flex align-items-center justify-content-center text-primary flex-shrink-0" style="width: 48px; height: 48px;">
<i class="bi bi-calendar-check fs-4"></i>
</div>
<div class="overflow-hidden">
<p class="fw-bold mb-0 text-truncate">Pending Work</p>
<p class="text-muted mb-0 text-truncate" style="font-size: 11px;">Scheduled for today</p>
</div>
</div>
<div class="text-end flex-shrink-0 ms-2">
<span class="h2 fw-bold text-primary mb-0 d-block" id="pendingWO">00</span>
<span class="text-uppercase text-muted fw-bold" style="font-size: 9px; letter-spacing: 0.1em;">Active</span>
</div>
</a>
</div>
<!-- Pending Sync -->
<div class="col-12 col-md-6">
<a class="text-decoration-none text-dark card-custom air-shadow p-3 d-flex justify-content-between align-items-center" href="#" style="border-left: 4px solid #7b4527;">
<div class="d-flex align-items-center gap-3 overflow-hidden">
<div class="rounded-circle bg-light d-flex align-items-center justify-content-center flex-shrink-0" style="width: 48px; height: 48px; color: #7b4527;">
<i class="bi bi-cloud-arrow-up fs-4"></i>
</div>
<div class="overflow-hidden">
<p class="fw-bold mb-0 text-truncate">Pending Sync</p>
<p class="text-muted mb-0 text-truncate" style="font-size: 11px;">Completed but not yet synced</p>
</div>
</div>
<div class="text-end flex-shrink-0 ms-2">
<span class="h2 fw-bold mb-0 d-block" style="color: #7b4527;" id="syncWO">00</span>
<span class="text-uppercase text-muted fw-bold" style="font-size: 9px; letter-spacing: 0.1em;">Queued</span>
</div>
</a>
</div>--%>

</div>

</section>
<script type="text/javascript" src="../JSCus/dashboard.js"></script>
</asp:Content>
