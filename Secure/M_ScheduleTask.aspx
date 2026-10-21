<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPages/MP_Site2_2.Master" AutoEventWireup="true" CodeBehind="M_ScheduleTask.aspx.cs" Inherits="PIP.Secure.M_ScheduleTask" %>
<%@ MasterType VirtualPath="~/MasterPages/MP_Site2_2.Master" %>
<%@ Register Src="~/UserControls/UC_FilterSearchList_2.ascx" TagPrefix="uc1" TagName="UC_FilterSearchList_2" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
    <link rel="stylesheet" href="../../WebFolder/bootstrap/css/bootstrap-datepicker3.css"/>
    <script type="text/javascript" src="../../WebFolder/bootstrap/js/bootstrap-datepicker.min.js"></script>   
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
    <table border="0" cellspacing="0" cellpadding="0" style="width:100%;">
    <tr class="d-none">
        <td>
            <asp:TextBox ID="TextBox6" runat="server" AutoPostBack="true" OnTextChanged="TextBox_TextChanged"></asp:TextBox>
		    <asp:TextBox    id="txtKeyHD" runat="server"/><asp:TextBox    id="txtSeqNo" runat="server"/>
        </td>
    </tr>
    <tr>
        <td>
            <div class="row border rounded shadow-sm" style="margin:auto;"> 
                <div class="col">

                    <div class="row my-1">
                        <div class="col-sm-6 mb-1">

                            <div class="row mt-1">
                                <div class="col-sm-4 d-flex justify-content-start align-items-center">
                                    <asp:LinkButton id="lBtnTaskID"  
									                Runat="server" 
									                text="Task ID" 
									                CausesValidation="False" 
									                onmouseover="window.status='Click here to select from existing data.';return true" 
									                onmouseout="window.status='';return true;"
									                title="Click here to select from existing data.">
                                    </asp:LinkButton>
                                </div>
                                <div class="col-sm-8">
                                    <div class="input-group" style="width:125px;">
		                            <asp:TextBox    id="txtTaskID" 
					                                runat="server" 
					                                MaxLength="10"
					                                AutoPostBack="true"
                                                    OnTextChanged="TextBox_TextChanged"
                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                    />
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-1">
                                <div class="col-sm-4 d-flex justify-content-start align-items-center">
                                    Description
                                </div>
                                <div class="col-sm-8">
		                            <asp:TextBox    id="txtTaskDescription" 
					                                runat="server"  
                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                    />
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6 mb-1">
                        </div>
                    </div>
                    <asp:Panel runat="server" ID="pnlAddNewRecord">
                    <div class="row my-1">
                        <div class="col border rounded shadow-sm">                
                            <div class="row font-weight-bold bg-custom20" style="height:30px;border-bottom: 1px solid #dee2e6;">
                                <div class="col-9 d-flex justify-content-start align-items-center">
                                    <asp:Label ID="label18" 
                                                runat="server" 
                                                class="align-middle"
                                                Text="Add / Edit record"></asp:Label>
                                </div>
                                <div class="col-3 d-flex justify-content-end align-items-center">
                                    <asp:LinkButton id="lBtnCloseGrid" 
                                                    runat="server"
                                                    CssClass="align-bottom text-secondary fz-custom2"
                                                    ToolTip="Close"
                                                    OnClick="lBtn_Click"
                                                    >
                                        <i class="fas fa-times"></i>
                                    </asp:LinkButton>
                                </div>
                            </div>
                            <div class="row"> 
                                <div class="col-sm-6 mb-1">
                                    <div class="row mt-1">
                                        <div class="col-sm-4 d-flex justify-content-start align-items-center">
                                            <asp:Label ID="Label2" runat="server" Text="Task Item"></asp:Label>
                                        </div>
                                        <div class="col-sm-8">
                                            <div class="input-group date" style="width:125px;">
		                                    <asp:TextBox    id="txtTaskItem" 
					                                        runat="server" ReadOnly="true" MaxLength="10"
                                                            CssClass="form-control form-control-sm rounded fz-custom1"
                                                            /> 
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row mt-1">
                                        <div class="col-sm-4 d-flex justify-content-start align-items-center">
                                            <asp:Label ID="Label1" runat="server" Text="Number Staff"></asp:Label>
                                        </div>
                                        <div class="col-sm-8">
                                            <div class="input-group date" style="width:125px;">
		                                    <asp:TextBox    id="txtNumberStaff" 
					                                        runat="server" 
                                                            CssClass="form-control form-control-sm rounded fz-custom1"
                                                            /> 
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-sm-6 mb-1">
                                    <div class="row mt-1">
                                        <div class="col-sm-4 d-flex justify-content-start align-items-center">
                                            <asp:Label ID="Label3" runat="server" Text="Section"></asp:Label>
                                        </div>
                                        <div class="col-sm-8">
		                                    <asp:TextBox    id="txtSectionName" 
					                                        runat="server" 
                                                            CssClass="form-control form-control-sm rounded fz-custom1"
                                                            /> 
                                        </div>
                                    </div>
                                    <div class="row mt-1">
                                        <div class="col-sm-4 d-flex justify-content-start align-items-center">
                                            <asp:Label ID="Label4" runat="server" Text="Location"></asp:Label>
                                        </div>
                                        <div class="col-sm-8">
		                                    <asp:TextBox    id="txtLocationName" 
					                                        runat="server" 
                                                            CssClass="form-control form-control-sm rounded fz-custom1"
                                                            /> 
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-sm-6 mb-1">
                                    <div class="row justify-content-end">
                                        <div class="col-8">
                                            <div class="form-inline">
                                                <asp:LinkButton ID="lBtnSaveGrid" 
                                                                runat="server"
                                                                CssClass="btn btn-sm btn-outline-info fz-custom2 btn-custom1"
                                                                OnClick="lBtn_Click"
                                                                ToolTip="Save"
                                                                Width="130px"
                                                                >
                                                    <i class="fas fa-save"></i>
                                                    Save
                                                </asp:LinkButton>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col">
                                    
                                </div>
                            </div>
                        </div>
                    </div>

                    </asp:Panel>
                    <div class="row my-1">
                        <div class="col-sm-6 mb-1">
                            <asp:LinkButton id="lbtnAddnewrecord"  
                                    Runat="server" 
                                    CssClass="btn btn-sm btn-outline-info fz-custom2 btn-custom1"
                                    Width="135px" OnClick="lBtn_Click"
                                    >
                            <i class="fas fa-plus-circle"></i>
                            Add new record
                            </asp:LinkButton>
                        </div>
                    </div>
                    <div class="row mt-1">
                        <div class="col">
                            <asp:DataGrid	id="gridData" 
                                            runat="server" 
				                            BorderColor="#000"
                                            AutoGenerateColumns="False" 
				                            BorderWidth="0"  
				                            GridLines="None"	
				                            class="table table-sm table-borderless mb-0 w-100"
				                            CellPadding="2"
				                            CellSpacing="0"
                                            DataKeyField=""
				                            ShowFooter="false"
				                            ShowHeader="true" 
                                            OnItemCreated="gridData_ItemCreated"
                                            OnItemCommand="gridData_ItemCommand"
                                            >
	                                <HeaderStyle HorizontalAlign="left" CssClass="fz-custom1 dtgrdhd-custom1 bg-custom20"/>
	                                <ItemStyle HorizontalAlign="left" VerticalAlign="Top" CssClass="fz-custom1 dtgrddt-custom1"/>
	                                <AlternatingItemStyle HorizontalAlign="left" VerticalAlign="Top" CssClass="fz-custom1 dtgrddtalt-custom1"/>
	                                <FooterStyle HorizontalAlign="left"  CssClass="fz-custom1 dtgrdhd-custom1"/>
                                    <PagerStyle Mode="NumericPages" HorizontalAlign="right" />
                                    <Columns>		
                                            <asp:TemplateColumn runat="server" 
                                                                HeaderText="Task Item" 
                                                                HeaderStyle-HorizontalAlign="Left" 
                                                                HeaderStyle-Width = "7%"
                                                                ItemStyle-HorizontalAlign="Left"
                                                                ItemStyle-Width = "7%"
                                                                >
                                                <itemtemplate>
                                                    <asp:label		runat="server" 
                                                                    style="margin-left:0;margin-right:2"
                                                                    Text='<%# DataBinder.Eval(Container.DataItem, "TaskItem") %>' 
                                                                    ID="_lblTaskItem"/>
                                                    <asp:label		runat="server" Visible="false"
                                                                    style="margin-left:0;margin-right:2"
                                                                    Text='<%# Convert.ToString(DataBinder.Eval(Container.DataItem, "SeqNo")) %>' 
                                                                    ID="_lblSeqNo"/>
                                                </itemtemplate>
                                            </asp:TemplateColumn >	
                                            <asp:TemplateColumn runat="server" 
                                                                HeaderText="Section" 
                                                                HeaderStyle-HorizontalAlign="Left" 
                                                                HeaderStyle-Width = "30%"
                                                                ItemStyle-HorizontalAlign="Left"
                                                                ItemStyle-Width = "30%" ItemStyle-VerticalAlign="Top"
                                                                >
                                                <itemtemplate>
                                                    <asp:label		runat="server" 
                                                                    style="margin-left:0;margin-right:2"
                                                                    Text='<%# DataBinder.Eval(Container.DataItem, "SectionName") %>' 
                                                                    ID="_lblSectionName"/>
                                                </itemtemplate>
                                            </asp:TemplateColumn >                                        
                                            <asp:TemplateColumn runat="server" 
                                                                HeaderText="Location" 
                                                                HeaderStyle-HorizontalAlign="Left" 
                                                                HeaderStyle-Width = "30%"
                                                                ItemStyle-HorizontalAlign="Left"
                                                                ItemStyle-Width = "30%" ItemStyle-VerticalAlign="Top"
                                                                >
                                                <itemtemplate>
                                                    <asp:label		runat="server" 
                                                                    style="margin-left:0;margin-right:2"
                                                                    Text='<%# DataBinder.Eval(Container.DataItem, "LocationName") %>' 
                                                                    ID="_lblLocationName"/>
                                                </itemtemplate>
                                            </asp:TemplateColumn >                                        
                                        														
                                            <asp:TemplateColumn runat="server" 
                                                                HeaderText="Number Staff" 
                                                                HeaderStyle-HorizontalAlign="Center" 
                                                                HeaderStyle-Width = "30%"
                                                                ItemStyle-HorizontalAlign="Center"
                                                                ItemStyle-Width = "30%"
                                                                >
                                                <itemtemplate>
                                                    <asp:label		runat="server" 
                                                                    style="margin-left:0;margin-right:2"
                                                                    Text='<%# Convert.ToInt16(DataBinder.Eval(Container.DataItem, "NumberStaff")).ToString(WAL.GF.FormatCurrency0) %>' 
                                                                    ID="_lblNumberStaff"/>
                                                </itemtemplate>
                                            </asp:TemplateColumn >
                                            <asp:TemplateColumn runat="server" 
                                                            HeaderText="" 
                                                            HeaderStyle-HorizontalAlign="Left" 
                                                            HeaderStyle-Width = "1%"
                                                            ItemStyle-HorizontalAlign="Left"
                                                            ItemStyle-Width = "1%"
                                                            >
                                                <itemtemplate>
                                                        <asp:LinkButton runat="server" 
                                                                    id="_ibtnEdit"
                                                                    CausesValidation="false"
                                                                    CssClass="align-bottom text-secondary fz-custom2"
                                                                    ToolTip="Edit this record"
                                                                    CommandName="_Edit">
                                                            <i class="far fa-edit"></i>
                                                    </asp:LinkButton>   
                                                </itemtemplate>
                                            </asp:TemplateColumn>	
                                            <asp:TemplateColumn runat="server" 
                                                            HeaderText="" 
                                                            HeaderStyle-HorizontalAlign="Left" 
                                                            HeaderStyle-Width = "1%"
                                                            ItemStyle-HorizontalAlign="Left"
                                                            ItemStyle-Width = "1%"
                                                            >
                                                <itemtemplate>
                                                        <asp:LinkButton runat="server" 
                                                                    id="_ibtnDelete"
                                                                    CausesValidation="false"
                                                                    CssClass="align-bottom text-secondary fz-custom2"
                                                                    ToolTip="Delete this record"
                                                                    CommandName="_Delete">
                                                            <i class="far fa-trash-alt"></i>
                                                    </asp:LinkButton>   
                                                </itemtemplate>
                                            </asp:TemplateColumn>	
                                        
                                            </Columns>
                                </asp:DataGrid>
                        </div>
                    </div>
                </div>
            </div>
        </td>
    </tr>
    </table>

</asp:Content>
