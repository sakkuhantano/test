<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPages/MP_Site2_2.Master" AutoEventWireup="true" CodeBehind="M_InspectionType.aspx.cs" Inherits="PIP.Secure.M_InspectionType" %>
<%@ MasterType VirtualPath="~/MasterPages/MP_Site2_2.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server"></asp:Content>
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
            <div class="col-sm-2 mb-1"><div class="small">Schedule Time</div><asp:TextBox ID="txtScheduleTime" runat="server" TextMode="Time" CssClass="form-control form-control-sm rounded fz-custom1" /></div>
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
                    <asp:BoundColumn DataField="ScheduleTime" HeaderText="Schedule Time" />
                    <asp:TemplateColumn HeaderText="Active"><ItemTemplate><asp:Label ID="lblActive" runat="server" Text='<%# Convert.ToBoolean(DataBinder.Eval(Container.DataItem, "IsActive")) ? "Yes" : "No" %>' /></ItemTemplate></asp:TemplateColumn>
                    <asp:TemplateColumn HeaderText=""><ItemTemplate>
                        <asp:LinkButton ID="lBtnEditDetail" runat="server" CommandName="EditDetail" CommandArgument='<%# DataBinder.Eval(Container.DataItem, "InspectionTypeDetailCode") %>' CausesValidation="false" CssClass="btn btn-sm btn-outline-secondary">Edit</asp:LinkButton>
                        <asp:LinkButton ID="lBtnDeleteDetail" runat="server" CommandName="DeleteDetail" CommandArgument='<%# DataBinder.Eval(Container.DataItem, "InspectionTypeDetailCode") %>' CausesValidation="false" CssClass="btn btn-sm btn-outline-danger" OnClientClick="return confirm('Delete this detail?');">Delete</asp:LinkButton>
                    </ItemTemplate></asp:TemplateColumn>
                </Columns>
            </asp:DataGrid>
        </div></div>
    </div></div>
    </asp:Panel>
    <div class="row my-1"><div class="col-sm-6 mb-1">
        <asp:LinkButton ID="lBtnAddNewDetail" runat="server" CssClass="btn btn-sm btn-outline-info fz-custom2 btn-custom1" Width="150px" OnClick="lBtn_Click"><i class="fas fa-plus-circle"></i> Add detail</asp:LinkButton>
    </div></div>
</div></div>
</td></tr></table>
</asp:Content>