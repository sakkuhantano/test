<%@ Page Language="C#" AutoEventWireup="true" MasterPageFile="~/MasterPages/Site1.Master" CodeBehind="M_InspectionType.aspx.cs" Inherits="UTL1.Secure.M_InspectionType" %>
<%@ MasterType VirtualPath="~/MasterPages/Site1.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server"></asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
<div class="container-fluid py-3">
    <h5 class="mb-3">Master Inspection Type</h5>
    <asp:Label ID="lblMessage" runat="server" CssClass="small d-block mb-2"></asp:Label>
    <asp:Panel ID="pnlHeader" runat="server" CssClass="border rounded shadow-sm p-3 mb-3">
        <h6>Header</h6>
        <div class="row g-2">
            <div class="col-md-2"><label class="form-label">Type Code</label><asp:TextBox ID="txtInspectionTypeCode" runat="server" MaxLength="2" CssClass="form-control form-control-sm"></asp:TextBox></div>
            <div class="col-md-4"><label class="form-label">Type Name</label><asp:TextBox ID="txtInspectionTypeName" runat="server" MaxLength="100" CssClass="form-control form-control-sm"></asp:TextBox></div>
            <div class="col-md-3"><label class="form-label">Section ID</label><asp:TextBox ID="txtSectionID" runat="server" MaxLength="10" CssClass="form-control form-control-sm"></asp:TextBox></div>
            <div class="col-md-3 d-flex align-items-end gap-2">
                <asp:Button ID="btnSaveHeader" runat="server" Text="Save Header" CssClass="btn btn-sm btn-outline-primary" OnClick="btnSaveHeader_Click" />
                <asp:Button ID="btnNewHeader" runat="server" Text="New" CssClass="btn btn-sm btn-outline-secondary" OnClick="btnNewHeader_Click" CausesValidation="false" />
                <asp:Button ID="btnDeleteHeader" runat="server" Text="Deactivate" CssClass="btn btn-sm btn-outline-danger" OnClick="btnDeleteHeader_Click" CausesValidation="false" />
            </div>
        </div>
        <div class="form-check mt-2"><asp:CheckBox ID="chkHeaderActive" runat="server" Text=" Active" Checked="true" /></div>
    </asp:Panel>
    <div class="border rounded shadow-sm p-3 mb-3">
        <h6>Inspection Type List</h6>
        <asp:GridView ID="gridHeader" runat="server" AutoGenerateColumns="false" CssClass="table table-sm table-hover align-middle mb-0" GridLines="None" DataKeyNames="InspectionTypeCode" OnSelectedIndexChanged="gridHeader_SelectedIndexChanged">
            <Columns>
                <asp:BoundField DataField="InspectionTypeCode" HeaderText="Code" />
                <asp:BoundField DataField="InspectionTypeName" HeaderText="Inspection Type" />
                <asp:BoundField DataField="SectionID" HeaderText="Section ID" />
                <asp:CheckBoxField DataField="IsActive" HeaderText="Active" />
                <asp:CommandField ShowSelectButton="true" SelectText="Edit" />
            </Columns>
        </asp:GridView>
    </div>
    <asp:Panel ID="pnlDetail" runat="server" CssClass="border rounded shadow-sm p-3">
        <h6>Schedule Details</h6>
        <div class="row g-2 align-items-end mb-3">
            <div class="col-md-2"><label class="form-label">Detail Code</label><asp:TextBox ID="txtDetailCode" runat="server" MaxLength="20" CssClass="form-control form-control-sm"></asp:TextBox></div>
            <div class="col-md-4"><label class="form-label">Detail Name / Description</label><asp:TextBox ID="txtDetailName" runat="server" MaxLength="100" CssClass="form-control form-control-sm"></asp:TextBox></div>
            <div class="col-md-2"><label class="form-label">Schedule Time</label><asp:TextBox ID="txtScheduleTime" runat="server" TextMode="Time" CssClass="form-control form-control-sm"></asp:TextBox></div>
            <div class="col-md-2"><div class="form-check"><asp:CheckBox ID="chkDetailActive" runat="server" Text=" Active" Checked="true" /></div></div>
            <div class="col-md-2 d-flex gap-2"><asp:Button ID="btnSaveDetail" runat="server" Text="Save Detail" CssClass="btn btn-sm btn-outline-primary" OnClick="btnSaveDetail_Click" /><asp:Button ID="btnNewDetail" runat="server" Text="New" CssClass="btn btn-sm btn-outline-secondary" OnClick="btnNewDetail_Click" CausesValidation="false" /></div>
        </div>
        <asp:GridView ID="gridDetail" runat="server" AutoGenerateColumns="false" CssClass="table table-sm table-hover align-middle mb-0" GridLines="None" DataKeyNames="InspectionTypeDetailCode" OnSelectedIndexChanged="gridDetail_SelectedIndexChanged" OnRowCommand="gridDetail_RowCommand">
            <Columns>
                <asp:BoundField DataField="InspectionTypeDetailCode" HeaderText="Detail Code" />
                <asp:BoundField DataField="InspectionTypeDetailName" HeaderText="Description" />
                <asp:BoundField DataField="ScheduleTime" HeaderText="Schedule" DataFormatString="{0:HH\:mm}" />
                <asp:CheckBoxField DataField="IsActive" HeaderText="Active" />
                <asp:CommandField ShowSelectButton="true" SelectText="Edit" />
                <asp:ButtonField ButtonType="Link" Text="Delete" CommandName="DeleteDetail" />
            </Columns>
        </asp:GridView>
    </asp:Panel>
</div>
</asp:Content>