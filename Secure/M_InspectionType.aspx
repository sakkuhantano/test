<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPages/MP_Site2_2.Master" AutoEventWireup="true" CodeBehind="M_InspectionType.aspx.cs" Inherits="PIP.Secure.M_InspectionType" %>
<%@ MasterType VirtualPath="~/MasterPages/MP_Site2_2.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
<style>
    .schedule-time-editor { min-width: 0; }
    .schedule-time-chips { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; min-height: 2.25rem; padding-top: .45rem; }
    .schedule-time-chip { display: inline-flex; align-items: center; gap: .45rem; padding: .25rem .55rem; border: 1px solid var(--bs-info-border-subtle, #9eeaf9); border-radius: 999px; background: var(--bs-info-bg-subtle, #cff4fc); color: var(--bs-info-text-emphasis, #055160); font-size: .85rem; line-height: 1.35; }
    .schedule-time-chip-remove { display: inline-flex; align-items: center; justify-content: center; width: 1.15rem; height: 1.15rem; padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit; font-size: 1rem; cursor: pointer; }
    .schedule-time-chip-remove:hover, .schedule-time-chip-remove:focus { background: rgba(0,0,0,.1); outline: none; }
    .schedule-time-empty { color: var(--bs-secondary-color, #6c757d); font-size: .8rem; }
</style>
<script type="text/javascript">
(function () {
    function getTimes() {
        var field = document.getElementById("hidScheduleTimes");
        return (field && field.value ? field.value.split(";") : [])
            .map(function (x) { return x.trim(); })
            .filter(function (x) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(x); })
            .filter(function (x, i, all) { return all.indexOf(x) === i; })
            .sort();
    }
    function renderTimes() {
        var field = document.getElementById("hidScheduleTimes");
        var host = document.getElementById("scheduleTimeChips");
        if (!field || !host) return;
        var times = getTimes();
        field.value = times.join(";");
        host.innerHTML = "";
        if (!times.length) {
            var empty = document.createElement("span");
            empty.className = "schedule-time-empty";
            empty.textContent = "Belum ada jadwal. Pilih jam lalu tekan Tambah.";
            host.appendChild(empty);
            return;
        }
        times.forEach(function (time) {
            var chip = document.createElement("span");
            chip.className = "schedule-time-chip";
            var label = document.createElement("span");
            label.textContent = time;
            var remove = document.createElement("button");
            remove.type = "button";
            remove.className = "schedule-time-chip-remove";
            remove.setAttribute("aria-label", "Hapus jadwal " + time);
            remove.title = "Hapus " + time;
            remove.textContent = "×";
            remove.addEventListener("click", function () {
                field.value = getTimes().filter(function (x) { return x !== time; }).join(";");
                renderTimes();
            });
            chip.appendChild(label);
            chip.appendChild(remove);
            host.appendChild(chip);
        });
    }
    document.addEventListener("DOMContentLoaded", function () {
        var add = document.getElementById("btnAddScheduleTime");
        var input = document.getElementById("scheduleTimeInput");
        if (add && input) add.addEventListener("click", function () {
            var time = input.value;
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
                input.focus();
                return;
            }
            var times = getTimes();
            if (times.indexOf(time) < 0) times.push(time);
            document.getElementById("hidScheduleTimes").value = times.sort().join(";");
            input.value = "";
            renderTimes();
            input.focus();
        });
        if (input) input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") { event.preventDefault(); if (add) add.click(); }
        });
        renderTimes();
    });
})();

function showScheduleModal(scheduleString, detailName) {
    var modalElement = document.getElementById("scheduleListModal");
    var title = document.getElementById("scheduleListModalTitle");
    var host = document.getElementById("scheduleListModalTimes");
    if (!modalElement || !host) return false;
    title.textContent = "Schedule Time — " + (detailName || "Inspection Detail");
    host.innerHTML = "";
    var times = (scheduleString || "").split(";").map(function (x) { return x.trim(); })
        .filter(function (x) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(x); })
        .filter(function (x, i, all) { return all.indexOf(x) === i; }).sort();
    if (!times.length) {
        var empty = document.createElement("span");
        empty.className = "schedule-time-empty";
        empty.textContent = "Belum ada schedule time.";
        host.appendChild(empty);
    } else {
        times.forEach(function (time) {
            var chip = document.createElement("span");
            chip.className = "schedule-time-chip";
            chip.textContent = time;
            host.appendChild(chip);
        });
    }
    if (window.bootstrap && bootstrap.Modal) bootstrap.Modal.getOrCreateInstance(modalElement).show();
    return false;
}
</script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
<table border="0" cellspacing="0" cellpadding="0" style="width:100%;">
<tr class="d-none"><td>
    <asp:TextBox ID="txtConfirmAction" runat="server" AutoPostBack="true" OnTextChanged="TextBox_TextChanged" />
    <asp:TextBox ID="txtIsNew" runat="server" />
    <asp:TextBox ID="txtDetailOriginalCode" runat="server" />
</td></tr>
<tr><td>
<div class="row border rounded shadow-sm" style="margin:auto;"><div class="col">
    <div class="row my-1"><div class="col-sm-6 mb-1">
        <div class="row mt-1"><div class="col-sm-4 d-flex align-items-center">
            <asp:LinkButton ID="lBtnInspectionTypeCode" runat="server" Text="Inspection Type Code" CausesValidation="false"
                title="Click here to select from existing data." onmouseover="window.status='Click here to select from existing data.';return true" onmouseout="window.status='';return true;" />
        </div><div class="col-sm-8">
            <asp:TextBox ID="txtInspectionTypeCode" runat="server" MaxLength="2" AutoPostBack="true" OnTextChanged="TextBox_TextChanged" CssClass="form-control form-control-sm rounded fz-custom1" />
        </div></div>
        <div class="row mt-1"><div class="col-sm-4 d-flex align-items-center">Inspection Type Name</div><div class="col-sm-8">
            <asp:TextBox ID="txtInspectionTypeName" runat="server" MaxLength="100" CssClass="form-control form-control-sm rounded fz-custom1" />
        </div></div>
        <div class="row mt-1"><div class="col-sm-4 d-flex align-items-center">Section ID</div><div class="col-sm-8">
            <asp:TextBox ID="txtSectionID" runat="server" MaxLength="10" CssClass="form-control form-control-sm rounded fz-custom1" />
        </div></div>
        <div class="row mt-1"><div class="col-sm-4 d-flex align-items-center">Active</div><div class="col-sm-8">
            <asp:CheckBox ID="chkHeaderActive" runat="server" Checked="true" />
        </div></div>
    </div></div>
    <asp:Panel ID="pnlDetails" runat="server">
    <div class="row my-1"><div class="col border rounded shadow-sm">
        <div class="row font-weight-bold bg-custom20" style="height:30px;border-bottom:1px solid #dee2e6;">
            <div class="col-9 d-flex align-items-center">Inspection Schedule Details</div>
            <div class="col-3 d-flex justify-content-end align-items-center">
                <asp:LinkButton ID="lBtnCloseDetail" runat="server" CssClass="align-bottom text-secondary fz-custom2" ToolTip="Close" OnClick="lBtn_Click"><i class="fas fa-times"></i></asp:LinkButton>
            </div>
        </div>
        <div class="row my-1">
            <div class="col-sm-3 mb-1"><div class="small">Detail Code</div><asp:TextBox ID="txtDetailCode" runat="server" MaxLength="20" CssClass="form-control form-control-sm rounded fz-custom1" /></div>
            <div class="col-sm-4 mb-1"><div class="small">Description</div><asp:TextBox ID="txtDetailName" runat="server" MaxLength="100" CssClass="form-control form-control-sm rounded fz-custom1" /></div>
            <div class="col-sm-4 mb-1 schedule-time-editor">
                <div class="small">Schedule Time</div>
                <div class="input-group input-group-sm">
                    <input type="time" id="scheduleTimeInput" class="form-control rounded-start fz-custom1" aria-label="Pilih schedule time" />
                    <button type="button" id="btnAddScheduleTime" class="btn btn-outline-info" title="Tambah schedule time"><i class="fas fa-plus"></i> Add</button>
                </div>
                <asp:HiddenField ID="hidScheduleTimes" runat="server" ClientIDMode="Static" />
                <div id="scheduleTimeChips" class="schedule-time-chips" aria-live="polite"></div>
            </div>
            <div class="col-sm-1 mb-1 d-flex align-items-end"><asp:CheckBox ID="chkDetailActive" runat="server" Checked="true" Text="Active" /></div>
            <div class="col-sm-2 mb-1 d-flex align-items-end"><asp:LinkButton ID="lBtnSaveDetail" runat="server" CssClass="btn btn-sm btn-outline-info fz-custom2 btn-custom1" OnClick="lBtn_Click"><i class="fas fa-save"></i> Save</asp:LinkButton></div>
        </div>
        <div class="row"><div class="col">
            <asp:DataGrid ID="gridData" runat="server" AutoGenerateColumns="false" BorderWidth="0" GridLines="None" CssClass="table table-sm table-borderless mb-0 w-100" CellPadding="2" CellSpacing="0" OnItemCommand="gridData_ItemCommand">
                <HeaderStyle HorizontalAlign="left" CssClass="fz-custom1 dtgrdhd-custom1 bg-custom20" />
                <ItemStyle HorizontalAlign="left" VerticalAlign="Top" CssClass="fz-custom1 dtgrddt-custom1" />
                <AlternatingItemStyle HorizontalAlign="left" VerticalAlign="Top" CssClass="fz-custom1 dtgrddtalt-custom1" />
                <Columns>
                    <asp:BoundColumn DataField="InspectionTypeDetailCode" HeaderText="Detail Code" />
                    <asp:BoundColumn DataField="InspectionTypeDetailName" HeaderText="Description" />
                    <asp:TemplateColumn HeaderText="Schedule Time"><ItemTemplate>
                        <div class="small text-secondary"><%# GetScheduleSummary(DataBinder.Eval(Container.DataItem, "ScheduleTime")) %></div>
                        <asp:LinkButton ID="lBtnViewSchedule" runat="server" CausesValidation="false" CssClass="btn btn-sm btn-outline-info mt-1"
                            OnClientClick='<%# GetScheduleClientScript(DataBinder.Eval(Container.DataItem, "ScheduleTime"), DataBinder.Eval(Container.DataItem, "InspectionTypeDetailName")) %>'>View Schedule</asp:LinkButton>
                    </ItemTemplate></asp:TemplateColumn>
                    <asp:TemplateColumn HeaderText="Active"><ItemTemplate><asp:Label ID="lblActive" runat="server" Text='<%# Convert.ToBoolean(DataBinder.Eval(Container.DataItem, "IsActive")) ? "Yes" : "No" %>' /></ItemTemplate></asp:TemplateColumn>
                    <asp:TemplateColumn HeaderText=""><ItemTemplate>
                        <asp:LinkButton ID="lBtnEditDetail" runat="server" CommandName="EditDetail" CommandArgument='<%# DataBinder.Eval(Container.DataItem, "InspectionTypeDetailCode") %>' CausesValidation="false" CssClass="btn btn-sm btn-outline-secondary">Edit</asp:LinkButton>
                        <asp:LinkButton ID="lBtnDeleteDetail" runat="server" CommandName="DeleteDetail" CommandArgument='<%# DataBinder.Eval(Container.DataItem, "InspectionTypeDetailCode") %>' CausesValidation="false" CssClass="btn btn-sm btn-outline-danger" OnClientClick="return confirm('Delete this detail?');">Delete</asp:LinkButton>
                    </ItemTemplate></asp:TemplateColumn>
                </Columns>
            </asp:DataGrid>
        </div></div>
        <div class="modal fade" id="scheduleListModal" tabindex="-1" aria-labelledby="scheduleListModalTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fz-custom1" id="scheduleListModalTitle">Schedule Time</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body"><div id="scheduleListModalTimes" class="schedule-time-chips pt-0"></div></div>
                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button></div>
            </div></div>
        </div>
    </div></div>
    </asp:Panel>
    <div class="row my-1"><div class="col-sm-6 mb-1">
        <asp:LinkButton ID="lBtnAddNewDetail" runat="server" CssClass="btn btn-sm btn-outline-info fz-custom2 btn-custom1" Width="150px" OnClick="lBtn_Click"><i class="fas fa-plus-circle"></i> Add detail</asp:LinkButton>
    </div></div>
</div></div>
</td></tr></table>
</asp:Content>