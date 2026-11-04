<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPages/Site_BS_5.Master" AutoEventWireup="true" CodeBehind="T_BIR.aspx.cs" Inherits="UTL1.Secure.T_BIR" %>
<%@ MasterType VirtualPath="~/MasterPages/Site_BS_5.Master" %>
<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="server">
    <link rel="stylesheet" href="../../WebFolder/bootstrap/css/bootstrap-datepicker3.css"/>
    <script type="text/javascript" src="../../WebFolder/bootstrap/js/bootstrap-datepicker.min.js"></script>   
    <script type="text/javascript" src="../../WebFolder/Scripts/DataGrid.js"></script>
    <script>
        function doAction(a, b) {
            $("#ContentPlaceHolder1_TextBox6").val(a + ';' + b);
            setTimeout('__doPostBack(\'ctl00$ContentPlaceHolder1$TextBox6\',\'\')', 0);
        }
        function DisplayRemainingChar(txt_RC_CID, txt_RC_maxchar, lbl_RC_CID) {
            var RC_len = $(txt_RC_CID).val().length;

            if (RC_len > txt_RC_maxchar) {
                return false;
            }
            else if (RC_len > 0) {
                $("#" + lbl_RC_CID).html("Remaining characters: " + (txt_RC_maxchar - RC_len));
            }
            else {
                $("#" + lbl_RC_CID).html("Remaining characters: " + (txt_RC_maxchar));
            }
        }
        $(function () {
            $("#ContentPlaceHolder1_pnlComplete").modal({
                backdrop: 'static',
                keyboard: false,
                show: true
            });
            $("#<%= txtQty.ClientID %>").on("change", function () {
                var val = $(this).val();
                $(this).val(val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'));
                if (val.indexOf('.') !== -1) {
                    if (val.split('.')[1].length > 4) {
                        $(this).val(val.substr(0, val.length - 1));
                    }
                }
                $(this).val(parseFloat(val).toFixed(4));
            });

        });
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="server">
    <div class="d-none">
        <asp:TextBox ID="TextBox6" runat="server" AutoPostBack="true" OnTextChanged="TextBox_TextChanged"></asp:TextBox>
		<asp:TextBox    id="txt_H_KeyHD" runat="server"/><asp:TextBox    id="txtSeqNo" runat="server"/>
        <asp:TextBox    id="txtIsUnearned" runat="server"/>
        <asp:TextBox    id="txt_H_UpdateDate" 
					    runat="server" 
					    Width="200px"
					    visible="false"
					    /><asp:Label ID="lblTotItems" runat="server"></asp:Label>
        <asp:Label ID="lbl_Current_UserType" runat="server"></asp:Label>
        <asp:Label ID="lbl_UserType_Active_Max" runat="server" Text="" Visible="false" ></asp:Label>
        <asp:Label ID="lbl_Description1_Tmp" runat="server" Text="" Visible="false" ></asp:Label>
        <asp:Label ID="lbl_Description2_Tmp" runat="server" Text="" Visible="false" ></asp:Label>
    </div>
    <asp:MultiView ID="mv_1" runat="server" ActiveViewIndex="0">
    <asp:View ID="Vw_mv_1_ApprovalMsg" runat="server">
        <table border="0" cellspacing="0" cellpadding="0" style="width:100%;height:100%;">
        <tr>
            <td>
                <div class="row justify-content-center align-items-center" style="margin:auto;height:100%;">
                    <div class="col-sm-8 py-3 d-flex justify-content-center align-items-center">
                        <asp:Panel ID="pnl_Msg_Desc" runat="server" role="alert" style="width:100%;text-align:center;">
                            <h4 class="alert-heading"><asp:Label id="lbl_Msg_Desc" CssClass="ProcessEmailMsg" runat="server" ></asp:Label></h4>
                            <asp:Label CssClass="fz-custom3" id="lbl_Msg_Desc2" runat="server" ></asp:Label>
                        </asp:Panel>
                    </div>
                </div>                
            </td>
        </tr>
        </table>
    </asp:View>
    <asp:View ID="Vw_mv_1_InputReasonDisApproved" runat="server">
        <table border="0" cellspacing="0" cellpadding="0" style="width:100%;height:100%;">
        <tr>
            <td>
                <div class="row justify-content-center align-items-center" style="margin:auto;height:100%;">
                    <div class="col-sm-9 py-3 border shadow-lg" style="border-radius:15px;">
                        <div class="row mt-1">
                            <div class="col-sm text-center">
                                <span style="font-weight: bold;  font-size: 16px; font-family: 'Courier New', Courier, monospace; padding-bottom: 0px; letter-spacing: 2px;">
                                    <asp:Label ID="lblReason" runat="server"></asp:Label>
                                </span>  
                            </div>
                        </div>
                        <div class="row mt-4">
                            <div class="col-sm">
                                <textarea id="txt_ReasonforDisapproved" 
                                          runat="server"
                                          class="form-control form-control-sm fz-custom1 "
                                          rows="10"
                                          placeholder="Enter the Reason"
                                          >   
                                </textarea>
                                <span id='RC_ReasonforDisapproved'></span>
                                <script>
                                    $(document).ready(function () {
                                        var txt_RFD_ID = '#<%= txt_ReasonforDisapproved.ClientID %>';
                                        var txt_RFD_maxchar = parseInt($(txt_RFD_ID).attr('maxlength'));
                                        var lbl_RFD_RC_ID = 'RC_ReasonforDisapproved';
                                        $(txt_RFD_ID).keyup(function () { DisplayRemainingChar(txt_RFD_ID, txt_RFD_maxchar, lbl_RFD_RC_ID); })
                                        DisplayRemainingChar(txt_RFD_ID, txt_RFD_maxchar, lbl_RFD_RC_ID);
                                    });
                                </script>
                            </div>
                        </div>
                        <div class="row mt-3 justify-content-center">
                            <div class="col col-sm-6 text-center">
                                <asp:LinkButton id="lbtn_ContinueVoid"  
                                            Runat="server" 
                                            text="Continue"
                                            Width="46%"
                                            CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                            OnClick="lbtn_ContinueVoid_Click"
                                            >
                                </asp:LinkButton>
                                <asp:LinkButton id="lbtn_CancelVoid"  
                                            Runat="server" 
                                            text="Cancel"
                                            Width="46%"
                                            CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                            OnClick="lbtn_CancelVoid_Click"
                                            >
                                </asp:LinkButton>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
        </table>
    </asp:View>
    <asp:View ID="Vw_mv_1_InputTrans" runat="server">
    <asp:MultiView ID="mv_0" runat="server" ActiveViewIndex="0">
    <asp:View ID="Vw_mv_0_Blank" runat="server">
    </asp:View>
    <asp:View ID="Vw_mv_0_PopupStatus" runat="server">
        <div id="PopupSend" style="text-align:center;top:50%;left:50%;position:fixed; transform: translate(-50%, -50%) rotate(-45deg);opacity:0.4;z-index:10;pointer-events: none;">
            <p style="color:lime;font-size:60px;"><asp:Label runat="server" ID="lblStatus"></asp:Label></p>
        </div>
    </asp:View>
    </asp:MultiView>

    <table border="0" cellspacing="0" cellpadding="0" style="width:100%;">
        <tr>
            <td>
                <div class="row mt-1 py-2 border rounded shadow-sm" style="margin:auto;"> 
                    <div class="col-sm-6 mb-1">
                        <div class="row mt-1">
                            <div class="col-sm-4">
                                <asp:LinkButton id="lBtnBillNo"  
									            Runat="server" CssClass="CUS-lbtn-1"
									            text="Bill No" OnPreRender="lbtn_PreRender" 
									            CausesValidation="False" 
									            onmouseover="window.status='Click here to select from existing data.';return true" 
									            onmouseout="window.status='';return true;"
									            title="Click here to select from existing data.">
                                </asp:LinkButton>

                            </div>
                            <div class="col-sm-8">
                                <div class="input-group">
		                            <asp:TextBox    id="txtBillNo" 
					                                runat="server" 
					                                MaxLength="10" placeholder="Bill No"
					                                AutoPostBack="true" 
                                                    OnTextChanged="TextBox_TextChanged" CssClass="form-control form-control-sm rounded CUS-fz-5 CUS-placeholder-1"
                                                    />
                                    <div class="input-group-append rounded">
                                        <div class="input-group">
                                        <asp:LinkButton ID="lBtnProgressBIR" 
                                                        runat="server"
                                                        ToolTip="BIR Progress" OnPreRender="lbtn_PreRender" 
                                                        class="btn btn-sm CUS-btn-outline-PColor-1 fz-custom2 btn-custom1 focus-ring text-decoration-none text-secondary border rounded px-2"
                                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" style="margin-bottom:1px;" width="14" height="14" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                                              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                                            </svg>
                                        </asp:LinkButton>
                                        <asp:Literal ID="lit_info" runat="server"></asp:Literal>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-1">
                            <div class="col-sm-4">
                                Bill Date
                            </div>
                            <div class="col-sm-8">
                                <div class="input-group">
                                    <asp:TextBox    id="txtBillDate" 
		                                            runat="server" 
		                                            ReadOnly="true" CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
		                                            />
                                    <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                        <span id="txtBillDate_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-1">
                            <div class="col-sm-4">
                                <asp:LinkButton id="lBtnTenantID"  
									            Runat="server" CssClass="CUS-lbtn-1"
									            text="Tenant ID" OnPreRender="lbtn_PreRender" 
									            CausesValidation="False" 
									            onmouseover="window.status='Click here to select from existing data.';return true" 
									            onmouseout="window.status='';return true;"
									            title="Click here to select from existing data.">
                                </asp:LinkButton>
                            </div>
                            <div class="col-sm-8">
                                <div class="input-group">
		                        <asp:TextBox    id="txtTenantID" 
					                            runat="server" 
					                            MaxLength="10" placeholder="Tenant ID" 
					                            AutoPostBack="true" 
                                                OnTextChanged="TextBox_TextChanged" CssClass="form-control form-control-sm rounded fz-custom1 CUS-placeholder-1"
                                                />
                                <div class="input-group-append rounded">
                                    <div class="input-group">
                                    <asp:LinkButton ID="lBtnViewTenant" 
                                                    runat="server" OnClick="lBtnViewTenant_Click"
                                                    ToolTip="Tenant History" OnPreRender="lbtn_PreRender" 
                                                    class="btn btn-sm CUS-btn-outline-PColor-1 fz-custom2 btn-custom1 focus-ring text-decoration-none text-secondary border rounded px-2"
                                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" style="margin-bottom:1px;" width="14" height="14" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                                        </svg>
                                    </asp:LinkButton>
                                    </div>
                                </div>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-1">
                            <div class="col-sm-4">
                                Tenant Name
                            </div>
                            <div class="col-sm-8">
                                <asp:TextBox    id="txtTenantName" placeholder="Tenant Name"
		                                        runat="server" CssClass="form-control form-control-sm rounded fz-custom1 CUS-placeholder-1"
		                                        ReadOnly="true"
		                                        />
                            </div>
                        </div>
                    </div>
                    <div class="col-sm-6 mb-1">
                        <div class="row mt-1" runat="server" id="div_reference">
                            <div class="col-sm-4">
                                Currency
                            </div>
                            <div class="col-sm-8">
                                <asp:DropDownList ID="ddlCurrency" 
                                                    runat="server" 
                                                    CssClass="form-select form-select-sm rounded fz-custom1">
                                </asp:DropDownList>  
                            </div>
                        </div>
                        <div class="row mt-1">
                            <div class="col-sm-4">
                            </div>
                            <div class="col-sm-8 form-check">
                                <asp:CheckBox ID="chkLumpsum" runat="server" CssClass="align-middle fz-custom1" />
                                <label class="form-check-label" for="<%= chkLumpsum.ClientID %>">Lumpsum BIR</label>
                            </div>
                        </div>
                        <div class="row mt-1">
                            <div class="col-sm-4">
                                Closing AR Active Period
                            </div>
                            <div class="col-sm-8">
                                <asp:TextBox    id="txtActivePeriodCAR" 
		                                        runat="server" CssClass="form-control form-control-sm rounded fz-custom1"
		                                        ReadOnly="true"
		                                        />
                            </div>
                        </div>
                    </div>

                </div>

            </td>
        </tr>
        <tr style="height:18px;"><td></td></tr>
        <tr>
            <td>
                <div class="row" style="margin:auto;">
                    <div class="col col-sm border rounded shadow-sm">
                        <div class="row font-weight-bold bg-custom20" style="height:35px;border-bottom: 1px solid #dee2e6;">
                            <div class="col d-flex justify-content-center align-items-center">
                                <asp:LinkButton id="lbtnPrevious"  
                                                Runat="server" 
                                                width="35px"
                                                CssClass="btn btn-sm btn-outline-info fz-custom2 btn-custom1 border-0"
                                                OnClick="lbtnPrevious_Click"
                                                >
                                    <i class="fas fa-angle-double-left"></i>
                                </asp:LinkButton>
                                &nbsp;
                                Section
                                &nbsp;
                                <asp:DropDownList ID="ddlPart" 
                                                    runat="server" 
                                                    AutoPostBack="true" 
                                                    Width="120px"
                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                    OnSelectedIndexChanged="ddlPart_SelectedIndexChanged"
                                                    style="text-align:center;"
                                                    >
                                </asp:DropDownList>
                                &ensp;
                                <asp:LinkButton id="lbtnNext"  
                                                Runat="server" 
                                                width="35px"
                                                CssClass="btn btn-sm btn-outline-info fz-custom2 btn-custom1 border-0"
                                                OnClick="lbtnNext_Click"
                                                >
                                    <i class="fas fa-angle-double-right"></i>
                                </asp:LinkButton>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col d-flex align-items-start">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                <asp:MultiView ID="mv1" runat="server" ActiveViewIndex="0">
                                <asp:View ID="vw0" runat="server">
                                <tr style="height:10px;"><td></td></tr>
                                <asp:panel runat="server" id="pnlAddNewRecord">
                                <tr>
                                    <td>
                                        <div class="row" style="margin:auto;">
                                            <div class="col border rounded shadow-sm">                
                                                <div class="row font-weight-bold bg-custom20" style="height:30px;border-bottom: 1px solid #dee2e6;">
                                                    <div class="col-9 d-flex justify-content-start align-items-center">
                                                        <asp:Label ID="label1" 
                                                                    runat="server" 
                                                                    class="align-middle"
                                                                    Text="Add / Edit record"></asp:Label>
                                                    </div>
                                                    <div class="col-3 d-flex justify-content-end align-items-center">
                                                        <asp:LinkButton id="lBtnCloseGrid" 
                                                                        runat="server"
                                                                        CssClass="align-bottom text-secondary fz-custom2"
                                                                        ToolTip="Close"
                                                                        OnClick="lBtn_D_Close_Click"
                                                                        >
                                                            <i class="fas fa-times"></i>
                                                        </asp:LinkButton>
                                                    </div>
                                                </div>
                                                <div class="row my-1"> 
                                                    <div class="col-sm-6 mb-1">
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">
                                                                <asp:LinkButton id="lBtnIncomeCode"  CssClass="CUS-lbtn-1"
									                                            Runat="server" 
									                                            text="Income Code" 
									                                            CausesValidation="False" 
									                                            onmouseover="window.status='Click here to select from existing data.';return true" 
									                                            onmouseout="window.status='';return true;"
									                                            title="Click here to select from existing data."></asp:LinkButton>

                                                            </div>
                                                            <div class="col-sm-8">
                                                                <div class="input-group">
                                                                <asp:TextBox   ID="txtIncomeCode"
                                                                                    runat="server" style="width:50%;"
                                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                    placeholder="Income Code"
                                                                                    OnTextChanged="TextBox_TextChanged"
                                                                                    AutoPostBack="true"
                                                                                    ></asp:TextBox>
                                                                <asp:TextBox    id="txtIncomeDesc" style="width:50%;"
		                                                                        runat="server" CssClass="form-control form-control-sm rounded fz-custom1"
		                                                                        ReadOnly="true"
		                                                                        />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">                            
                                                                <asp:LinkButton id="lBtnSuiteNo"  CssClass="CUS-lbtn-1"
									                                            Runat="server" 
									                                            text="Suite No" 
									                                            CausesValidation="False" 
									                                            onmouseover="window.status='Click here to select from existing data.';return true" 
									                                            onmouseout="window.status='';return true;"
									                                            title="Click here to select from existing data."></asp:LinkButton>
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <asp:TextBox   ID="txtSuiteNo"
                                                                                    runat="server" 
                                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                    placeholder="Suite No"
                                                                                    OnTextChanged="TextBox_TextChanged"
                                                                                    AutoPostBack="true"
                                                                                    ></asp:TextBox>
                                                            </div>
                                                        </div> 
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">
                                                                From/Thru Date
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <div class="input-group">
                                                                <div style="width:50%;">
                                                                    <div class="input-group w-100">
                                                                        <asp:TextBox   ID="txtFromDate"
                                                                                            runat="server" AutoPostBack="true" OnTextChanged="TextBox_TextChanged"
                                                                                            CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                                            placeholder="From Date"></asp:TextBox>
                                                                        <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                                                            <span id="txtFromDate_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                                                                </svg>
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style="width:50%;">
                                                                    <div class="input-group w-100">
                                                                        <asp:TextBox   ID="txtThruDate"
                                                                                            runat="server" AutoPostBack="true" OnTextChanged="TextBox_TextChanged"
                                                                                            CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                                            placeholder="Thru Date"></asp:TextBox>
                                                                        <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                                                            <span id="txtThruDate_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                                                                </svg>
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                </div>
                                                            </div>
                                                        </div> 
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">                            
                                                                Description
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <asp:TextBox   ID="txtDescription1" MaxLength="100"
                                                                                    runat="server"
                                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                    placeholder="Description"
                                                                                    ></asp:TextBox>
                                                            </div>
                                                        </div>
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">                            
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <asp:TextBox   ID="txtDescription2" MaxLength="100"
                                                                                    runat="server"
                                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                    placeholder="Description"
                                                                                    ></asp:TextBox>
                                                            </div>
                                                        </div>
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">                            
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <asp:TextBox   ID="txtDescription3" MaxLength="100"
                                                                                    runat="server"
                                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                    placeholder="Description"
                                                                                    ></asp:TextBox>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-sm-6 mb-1">
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">                            
                                                                Freq
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <div class="input-group">
                                                                <div style="width: 50%;">
                                                                <asp:TextBox   ID="txtFreq"
                                                                                    runat="server" AutoPostBack="true" OnTextChanged="TextBox_TextChanged" 
                                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                    placeholder="Freq"
                                                                                    ></asp:TextBox>
                                                                </div>
                                                                <div style="width: 50%;">
                                                                <asp:DropDownList ID="ddlFreq" runat="server" CssClass="form-select form-select-sm rounded fz-custom1" OnSelectedIndexChanged="ddlQty_SelectedIndexChanged" AutoPostBack="true">
                                                                </asp:DropDownList>  
                                                                </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">                            
                                                                Quantity
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <div class="input-group">
                                                                <div style="width: 50%;">
                                                                <asp:TextBox   ID="txtQty" 
                                                                                    runat="server" AutoPostBack="true" OnTextChanged="TextBox_TextChanged" 
                                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                    placeholder="Quantity"
                                                                                    ></asp:TextBox>
                                                                </div>
                                                                <div style="width: 50%;">
                                                                <asp:DropDownList ID="ddlQty" runat="server" CssClass="form-select form-select-sm rounded fz-custom1" OnSelectedIndexChanged="ddlQty_SelectedIndexChanged" AutoPostBack="true">
                                                                </asp:DropDownList>  
                                                                </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">
                                                                Price
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <asp:TextBox    id="txtPrice" AutoPostBack="true" OnTextChanged="TextBox_TextChanged"  
		                                                                        runat="server" CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                placeholder="Price"
		                                                                        />
                                                            </div>
                                                        </div>
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">
                                                                Amount
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <asp:TextBox   ID="txtAmount" AutoPostBack="true" OnTextChanged="TextBox_TextChanged" 
                                                                                    runat="server"
                                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                    placeholder="Amount"
                                                                                    ></asp:TextBox>
                                                            </div>
                                                        </div>
                                                        <div class="row mt-1">
                                                            <div class="col-sm-4">
                                                                VAT
                                                            </div>
                                                            <div class="col-sm-8">
                                                                <asp:TextBox   ID="txtVAT" ReadOnly="true"
                                                                                    runat="server"
                                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                                    placeholder="VAT"
                                                                                    ></asp:TextBox>
                                                            </div>
                                                        </div>

                                                    </div>
                                                </div>
                                                <div class="row mt-1 ">
                                                    <div class="col-sm ">
                                                        <hr class="my-0"/>
                                                    </div>
                                                </div>
                                                <div class="row my-1">
                                                    <div class="col d-flex justify-content-start align-items-center">
                                                        <asp:LinkButton ID="lBtn_D_SaveGrid" 
                                                                        runat="server"
                                                                        CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                                        OnClick="lBtn_D_SaveGrid_Click"
                                                                        ToolTip="Save"
                                                                        Width="100px"
                                                                        OnPreRender="lbtn_PreRender"
                                                                        >
                                                            <i class="fas fa-save"></i> Save
                                                        </asp:LinkButton>
                                                        &ensp;
                                                        <asp:LinkButton ID="lbtn_D_Close" 
                                                                        runat="server"
                                                                        CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                                        OnClick="lBtn_D_Close_Click"
                                                                        ToolTip="Close"
                                                                        Width="100px"
                                                                        OnPreRender="lbtn_PreRender"
                                                                        >
                                                            <i class="fas fa-times"></i> Close
                                                        </asp:LinkButton>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr style="height:8px;"><td></td></tr>
                                </asp:panel>
                                <tr>
                                    <td>
                                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td>
                                                    <asp:LinkButton id="lbtn_D_Addnewrecord"  
                                                            Runat="server" 
                                                            CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                            Width="135px" OnClick="lbtn_D_Addnewrecord_Click" OnPreRender="lbtn_PreRender"
                                                            >
                                                    <i class="fas fa-plus-circle"></i>
                                                    Add New Record
                                                    </asp:LinkButton>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div id="ContentPlaceHolder1_divdtgrid" class="mt-1 mb-1 border rounded shadow-sm fz-custom1">
                                                        <asp:Literal ID="litDetail" runat="server"></asp:Literal>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                </asp:View>
                                <asp:View ID="vw1" runat="server">
                                    <tr>
                                        <td>  
                                            &nbsp;<i>The maximum size for all files is up to <asp:Label runat="server" ID="lbl_C_TotalFileSize_InMB" Text="6"></asp:Label> MB</i>
                                        </td>
                                    </tr>
                                    <tr style="height:20px;"><td></td></tr>
                                    <asp:panel runat="server" id="pnl_Att_AddNewRecord">
                                    <tr>
                                        <td>
                                            <div class="row justify-content-center" style="margin:auto;">
                                                <div class="col col-sm-9 border rounded shadow-sm">                
                                                    <div class="row font-weight-bold bg-custom20" style="height:30px;border-bottom: 1px solid #dee2e6;">
                                                        <div class="col-9 d-flex justify-content-start align-items-center">
                                                            <asp:Label ID="label12" 
                                                                        runat="server" 
                                                                        class="align-middle"
                                                                        Text="Add Record"></asp:Label>
                                                        </div>
                                                        <div class="col-3 d-flex justify-content-end align-items-center">
                                                            <asp:LinkButton id="lBtn_Att_Close" 
                                                                            runat="server"
                                                                            CssClass="align-bottom text-secondary fz-custom2"
                                                                            ToolTip="Close"
                                                                            OnClick="lBtn_Att_CloseGrid_Click"
                                                                            >
                                                                <i class="fas fa-times"></i>
                                                            </asp:LinkButton>
                                                        </div>
                                                    </div>
                                                    <div class="row my-1 justify-content-center"> 
                                                        <div class="col-sm mb-1">
                                                            <div class="row mt-1">
                                                                <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                                    <asp:Label ID="Label20" runat="server" Text="Upload File"></asp:Label>
                                                                </div>
                                                                <div class="col-sm-9">
                                                                    <div class="custom-file fz-custom2">
                                                                        <%--<input type="file" id="customFile2" accept="image/*" runat="server" class="custom-file-input"/> accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" --%>
                                                                        <asp:FileUpload ID="FU_H_File" runat="server" CssClass="custom-file-input" style="cursor:pointer;"/>  
                                                                        <label id="lbl_H_File" runat="server" class="custom-file-label" for="FU_H_File">Choose file</label>
                                                                    </div>
                                                                    <script>
                                                                        $("#<%= FU_H_File.ClientID %>").change(function (e) {
                                                                            var V_FileName = $(this).val().split("\\").pop();
                                                                            //$("#<%= lbl_H_File.ClientID %>").html(V_FileName.substr(V_FileName.length - 28));
                                                                            $("#<%= lbl_H_File.ClientID %>").html($(this).val().split("\\").pop());

                                                                            $("#<%= txt_Att_FileName2.ClientID %>").val(V_FileName.split(".")[0]);
                                                                            $("#<%= txt_Att_FileName2.ClientID %>").focus();
                                                                        });
                                                                    </script>
                                                                </div>
                                                            </div>
                                                            <div class="row mt-1">
                                                                <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                                    <asp:Label ID="Label23" runat="server" Text="File Name"></asp:Label>
                                                                </div>
                                                                <div class="col-sm-9">
                                                                    <asp:TextBox id="txt_Att_FileName2" 
					                                                                readonly="false"
					                                                                enabled="True"
								                                                    runat="server" 
								                                                    CssClass="form-control form-control-sm rounded fz-custom1"
								                                                    AutoPostBack="false"
                                                                                    />
                                                                </div>
                                                            </div>
                                                            <div class="row mt-1">
                                                                <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                                </div>
                                                                <div class="col-sm-9 form-check">
                                                                    <asp:CheckBox ID="chkForBilling" runat="server" CssClass="align-middle fz-custom1" />
                                                                    <label class="form-check-label" for="<%= chkForBilling.ClientID %>">For Billing</label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="row" style="height:37px;border-top: 1px solid #dee2e6;">
                                                        <div class="col d-flex justify-content-start align-items-center">
                                                            <asp:LinkButton ID="lBtn_Att_SaveGrid" 
                                                                            runat="server"
                                                                            CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                                            OnClick="lBtn_Att_SaveGrid_Click"
                                                                            ToolTip="Save"
                                                                            Width="90px"
                                                                            OnPreRender="lbtn_PreRender"
                                                                            >
                                                                <i class="fas fa-save"></i> Save
                                                            </asp:LinkButton>
                                                            &nbsp;
                                                            <asp:LinkButton ID="lBtn_Att_CloseGrid" 
                                                                            runat="server"
                                                                            CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                                            OnClick="lBtn_Att_CloseGrid_Click"
                                                                            ToolTip="Close"
                                                                            Width="90px"
                                                                            OnPreRender="lbtn_PreRender"
                                                                            >
                                                                <i class="fas fa-times"></i> Close
                                                            </asp:LinkButton>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr style="height:5px;"><td></td></tr>
                                    </asp:panel>
                                    <tr>
                                        <td>
                                            <table  cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td>
                                                    <asp:LinkButton ID="lbtn_Att_Addnewrecord" 
                                                                    runat="server"
                                                                    CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                                    Width="135px"
                                                                    OnClick="lbtn_Att_Addnewrecord_Click"
                                                                    OnPreRender="lbtn_PreRender"
                                                                    >
                                                        <i class="fas fa-plus-circle"></i> Add New Record
                                                    </asp:LinkButton>
                                                </td>
                                                <td style="text-align:right;vertical-align:bottom;">
                                                    Total File Size :
                                                    <asp:label ID="lbl_Att_TotalFileSize_InMB" 
                                                                runat="server" 
                                                                />
                                                    MB 
                                                    <%--)--%>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2">
                                                    <div id="div1" runat="server" class="mt-1 mb-1 border rounded shadow-sm fz-custom1">
                                                        <asp:Literal ID="lit_att" runat="server"></asp:Literal>
                                                    </div>
                                                </td>
                                            </tr>
                                            </table>
                                        </td>
                                    </tr>

                                </asp:View>
                                </asp:MultiView>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

            </td>
        </tr>
        <tr style="height:5px;"><td></td></tr>
    </table>
    </asp:View>
    <asp:View ID="Vw_mv_1_Approval" runat="server">
    <table border="0" cellspacing="0" cellpadding="0" style="width:100%;">
        <tr runat="server" id="tr_statusapproval">
            <td>
                <div class="row mt-1 py-2 border rounded shadow-sm" style="margin:auto;"> 
                    <div class="col-sm-6 mb-1">
                        <div class="row mt-1">
                            <div class="col-sm-4 d-flex justify-content-start align-items-center">                            
                                <asp:Label ID="lblApproval" runat="server" Text="Status Approval"></asp:Label>
                            </div>
                            <div class="col-sm-8">
                                <asp:DropDownList ID="ddlStatusApproval" 
                                                    runat="server" 
                                                    CssClass="form-select form-select-sm rounded fz-custom1 mx-1"
                                                    AutoPostBack="true"  
                                                    OnTextChanged="ddlStatusApproval_TextChanged">
                                        <asp:ListItem Selected="True" Value="1" Text="Outstanding"></asp:ListItem>
                                        <asp:ListItem Value="2" Text="Approved"></asp:ListItem>
                                        <asp:ListItem Value="3" Text="Reject"></asp:ListItem>
                                </asp:DropDownList>
                            </div>
                        </div>
                    </div>
                    <div class="col-sm-6 mb-1" runat="server" id="div_approval">
                        <div class="row mt-1">
                            <div class="col-sm-4">                            
                                Period
                            </div>
                            <div class="col-sm-8">
                                <div class="input-group" style="width:47%;">
                                    <asp:TextBox ID="txtPeriodApproval"
                                                    runat="server" AutoPostBack="true" OnTextChanged="TextBox_TextChanged"
                                                    CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
                                                    >
                                    </asp:TextBox>
                                    <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                        <span id="txtPeriodApproval_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
        <tr style="height:18px;"><td></td></tr>
        <tr>
            <td>
                <table border="0" cellspacing="0" cellpadding="0" style="width:100%;">
                <tr style="height:10px;"><td></td></tr>
                <asp:panel runat="server" id="pnl_Search" Visible="false">
                <tr>
                    <td>
                        <div id="divsearch" runat="server" class="row justify-content-center" style="margin:auto;">
                            <div class="col col-sm-11 border rounded shadow-sm">                
                                <div class="row font-weight-bold bg-custom20" style="height:30px;border-bottom: 1px solid #dee2e6;">
                                    <div class="col-9 d-flex justify-content-start align-items-center">
                                        <asp:Label ID="label4" 
                                                    runat="server" 
                                                    class="align-middle"
                                                    Text="Search & Sort"></asp:Label>
                                    </div>
                                    <div class="col-3 d-flex justify-content-end align-items-center">
                                        <asp:LinkButton id="lbtn_S_IconClose" 
                                                        runat="server"
                                                        CssClass="align-bottom text-secondary fz-custom2"
                                                        ToolTip="Close"
                                                        OnClick="lbtn_S_Close_Click"
                                                        >
                                            <i class="fas fa-times"></i>
                                        </asp:LinkButton>
                                    </div>
                                </div>
                                <div class="row my-1"> 
                                    <div class="col-sm-6 mb-1">
                                        <!-- Bill No -->
                                        <div class="row mt-1">
                                            <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                Bill No
                                            </div>
                                            <div class="col-sm-9">
                                                <div class="input-group">
                                                    <asp:TextBox    id="txt_S_BillNoStart" runat="server" 
                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                    Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                    />
                                                    <div class="d-flex justify-content-center align-items-center" style="width:6%;">
                                                    -
                                                    </div>
                                                    <asp:TextBox    id="txt_S_BillNoEnd" runat="server" 
                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                    Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Bill Date -->
                                        <div class="row mt-1">
                                            <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                Bill Date
                                            </div>
                                            <div class="col-sm-9">
                                                <div class="input-group">
                                                    <div class="input-group" style="width:47%;">
                                                        <asp:TextBox    id="txt_S_BillStartDate" 
		                                                                runat="server" 
		                                                                CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
		                                                                />
                                                        <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                                            <span id="txt_S_BillStartDate_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                                                </svg>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div class="d-flex justify-content-center align-items-center" style="width:6%;">
                                                    -
                                                    </div>
                                                    <div class="input-group" style="width:47%;">
                                                        <asp:TextBox    id="txt_S_BillEndDate" 
		                                                                runat="server" 
		                                                                CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
		                                                                />
                                                        <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                                            <span id="txt_S_BillEndDate_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                                                </svg>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <!-- AR Bill No -->
                                        <div class="row mt-1">
                                            <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                AR Bill No
                                            </div>
                                            <div class="col-sm-9">
                                                <div class="input-group">
                                                    <asp:TextBox    id="txt_S_ARBillNoStart" runat="server" 
                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                    Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                    />
                                                    <div class="d-flex justify-content-center align-items-center" style="width:6%;">
                                                    -
                                                    </div>
                                                    <asp:TextBox    id="txt_S_ARBillNoEnd" runat="server" 
                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                    Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <!-- AR Bill Date -->
                                        <div class="row mt-1">
                                            <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                AR Bill Date
                                            </div>
                                            <div class="col-sm-9">
                                                <div class="input-group">
                                                    <div class="input-group" style="width:47%;">
                                                        <asp:TextBox    id="txt_S_ARBillStartDate" 
		                                                                runat="server" 
		                                                                CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
		                                                                />
                                                        <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                                            <span id="txt_S_ARBillStartDate_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                                                </svg>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div class="d-flex justify-content-center align-items-center" style="width:6%;">
                                                    -
                                                    </div>
                                                    <div class="input-group" style="width:47%;">
                                                        <asp:TextBox    id="txt_S_ARBillEndDate" 
		                                                                runat="server" 
		                                                                CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
		                                                                />
                                                        <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                                            <span id="txt_S_ARBillEndDate_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                                                </svg>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6 mb-1">
                                        <!-- Inv No -->
                                        <div class="row mt-1">
                                            <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                Invoice No
                                            </div>
                                            <div class="col-sm-9">
                                                <div class="input-group">
                                                    <asp:TextBox    id="txt_S_InvNoStart" runat="server" 
                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                    Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                    />
                                                    <div class="d-flex justify-content-center align-items-center" style="width:6%;">
                                                    -
                                                    </div>
                                                    <asp:TextBox    id="txt_S_InvNoEnd" runat="server" 
                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                    Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Inv Date -->
                                        <div class="row mt-1">
                                            <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                Invoice Date
                                            </div>
                                            <div class="col-sm-9">
                                                <div class="input-group">
                                                    <div class="input-group" style="width:47%;">
                                                        <asp:TextBox    id="txt_S_InvStartDate" 
		                                                                runat="server" 
		                                                                CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
		                                                                />
                                                        <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                                            <span id="txt_S_InvStartDate_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                                                </svg>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div class="d-flex justify-content-center align-items-center" style="width:6%;">
                                                    -
                                                    </div>
                                                    <div class="input-group" style="width:47%;">
                                                        <asp:TextBox    id="txt_S_InvEndDate" 
		                                                                runat="server" 
		                                                                CssClass="form-control form-control-sm rounded fz-custom1" Style="padding-right:30px;z-index:2;min-width:90px;"
		                                                                />
                                                        <div class="input-group-append" style="position: absolute;right:0px;top:1px;z-index:3;">
                                                            <span id="txt_S_InvEndDate_Icon" runat="server" class="input-group-text bg-transparent border-0 fz-custom1" style="cursor:pointer;">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                                                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                                                                </svg>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Tenant ID -->
                                        <div class="row mt-1">
                                            <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                Tenant ID
                                            </div>
                                            <div class="col-sm-9">
                                                <div class="input-group">
                                                    <asp:TextBox    id="txt_S_TenantIDStart" runat="server" 
                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                    Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                    />
                                                    <div class="d-flex justify-content-center align-items-center" style="width:6%;">
                                                    -
                                                    </div>
                                                    <asp:TextBox    id="txt_S_TenantIDEnd" runat="server" 
                                                                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                                    Style="padding-right:30px;z-index:2;min-width:90px;"
                                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Order By -->
                                        <div class="row mt-1">
                                            <div class="col-sm-3 d-flex justify-content-start align-items-center">                            
                                                Order By
                                            </div>
                                            <div class="col-sm-9">
                                                <div class="input-group">
                                                    <asp:DropDownList ID="ddl_S_Sort" 
                                                                        runat="server"  
                                                                        CssClass="form-select form-select-sm rounded fz-custom1"
                                                                        AutoPostBack ="false" 
                                                                        style="width:47%;"
                                                                        >
		                                            </asp:DropDownList>
                                                    <div class="d-flex justify-content-center align-items-center" style="width:6%;">
                                                    </div>
                                                    <asp:DropDownList ID="ddl_S_Sort_AD" 
                                                                        runat="server"  
                                                                        CssClass="form-select form-select-sm rounded fz-custom1"
                                                                        AutoPostBack ="false" 
                                                                        style="width:47%;"
                                                                        >
                                                        <asp:ListItem Value="ASC" Text="ASC" Selected="True"></asp:ListItem>
		                                                <asp:ListItem Value="DESC" Text="DESC"></asp:ListItem>
		                                            </asp:DropDownList>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row mt-1 ">
                                    <div class="col-sm ">
                                        <hr class="my-0"/>
                                    </div>
                                </div>
                                <div class="row my-1">
                                    <div class="col d-flex justify-content-start align-items-center">
                                        <asp:LinkButton ID="lBtn_S_Apply" 
                                                        runat="server"
                                                        CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                        OnClick="lBtn_S_Apply_Click"
                                                        OnPreRender="lbtn_PreRender"
                                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" style="margin-bottom:2px;" width="13" height="13" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
                                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                                            </svg> 
                                            Apply
                                        </asp:LinkButton>
                                        &ensp;
                                        <asp:LinkButton ID="lbtn_S_Reset" 
                                                        runat="server"
                                                        CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                        OnClick="lbtn_S_Reset_Click"
                                                        OnPreRender="lbtn_PreRender"
                                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" style="margin-bottom:2px;" width="13" height="13" fill="currentColor" class="bi bi-eraser-fill" viewBox="0 0 16 16">
                                                <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293z"/>
                                            </svg>
                                            Reset
                                        </asp:LinkButton>
                                        &ensp;
                                        <asp:LinkButton ID="lbtn_S_Close" 
                                                        runat="server"
                                                        CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                        OnClick="lbtn_S_Close_Click"
                                                        OnPreRender="lbtn_PreRender"
                                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" style="margin-bottom:2px;" width="13" height="13" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
                                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z"/>
                                            </svg> 
                                            Close
                                        </asp:LinkButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
                <tr style="height:8px;"><td></td></tr>
                </asp:panel>
                <tr>
                    <td>
                        <div class="row mt-1" style="margin:auto;">
                            <div class="col-sm-4 d-flex justify-content-start align-items-center pl-0">                            
                                <asp:label ID="Label2" Runat="server" Text="Max Record" />
			                    &nbsp;
			                    <asp:TextBox id="txtMaxRecord"
							                    runat="server"
							                    Text="50"
							                    style="text-align:center"
							                    MaxLength="10"
							                    width="50px"
							                    CssClass="form-control form-control-sm rounded fz-custom1"
                                                AutoPostBack="true"                                    
                                                OnTextChanged="txtMaxRecord_TextChanged"
							                    />
                            </div>
                            <div class="col-sm-4 d-flex justify-content-center align-items-center">
                                <asp:linkButton ID="lbtn_Search" 
						                        Runat="server" 
						                        CssClass="btn btn-sm CUS-btn-outline-PColor-1 px-3 fz-custom2 btn-custom1"
                                                OnClick="lbtn_Search_Click"
                                                OnPreRender="lbtn_PreRender"
						                        >
                                    <svg xmlns="http://www.w3.org/2000/svg" style="margin-bottom:2px;" width="13" height="13" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                                    </svg> 
                                    Search
		                        </asp:linkButton>
                            </div>
                            <div class="col-sm-4 d-flex justify-content-end align-items-end pr-0">
                                <asp:label ID="lblSearchResults" Runat="server"/>
                            </div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div id="divdtgrid" runat="server" class="mt-1 mb-1 border rounded shadow-sm fz-custom1 fs-3">
                            <asp:DataGrid	id="grid_App" 
                            runat="server" 
                            AutoGenerateColumns="false"
                            GridLines="None" 
                            CellSpacing="0" 
                            BorderColor="#394376" 
                            BorderWidth="0px" 
                            class="table-sm table-borderless mb-0 w-100"
                            PageSize="20"
                            ShowHeader="true"
                            CellPadding="0"
                            AllowSorting="true"
                            OnItemDataBound="grid_ItemDataBound"
                            OnItemCommand="grid_App_ItemCommand"
                            >
                            <HeaderStyle HorizontalAlign="left" CssClass="CUS-fz-5 dtgrdhd-custom1 CUS-bg-Color-1"/>
                            <ItemStyle HorizontalAlign="left" VerticalAlign="Top" CssClass="CUS-fz-5 dtgrddt-custom1"/>
                            <AlternatingItemStyle HorizontalAlign="left" VerticalAlign="Top" CssClass="CUS-fz-5 dtgrddtalt-custom1"/>
                            <FooterStyle HorizontalAlign="left"  CssClass="CUS-fz-5 dtgrddtalt-custom1"/>
                            <PagerStyle Mode="NumericPages" HorizontalAlign="right" />
                            <Columns>
                            <asp:TemplateColumn runat="server" 
                                            HeaderText="No" 
                                            HeaderStyle-HorizontalAlign="left" 
                                            HeaderStyle-Width = "2%"
                                            ItemStyle-HorizontalAlign="left"
                                            ItemStyle-Width = "2%" 
                                            >
                            <itemtemplate>
                                <asp:label		runat="server" 
                                                Text='<%# DataBinder.Eval(Container.DataItem, "Nomor") %>' 
                                                ID="_lblNomor"
                                                />
                                <asp:label		runat="server" Visible="false"
                                                Text='<%# DataBinder.Eval(Container.DataItem, "KeyHD") %>' 
                                                ID="_lblKeyHd"
                                                />
                            </itemtemplate>
                            </asp:TemplateColumn >															
                            <asp:TemplateColumn runat="server" 
                                            HeaderText="Bill No" 
                                            HeaderStyle-HorizontalAlign="left" 
                                            HeaderStyle-Width = "5%"
                                            ItemStyle-HorizontalAlign="left"
                                            ItemStyle-Width = "5%" 
                                            >
                            <itemtemplate>
                                <asp:LinkButton runat="server" 
                                                id="_lbtnBillNo"
                                                CssClass="text-decoration-none"
                                                Text = '<%# DataBinder.Eval(Container.DataItem, "BillNo") %>'
                                                CommandName="_lbtnBillNo">
                                </asp:LinkButton> 
                            </itemtemplate>
                            </asp:TemplateColumn >															
                            <asp:TemplateColumn runat="server" 
                                                HeaderText="Date" 
                                                HeaderStyle-HorizontalAlign="left" 
                                                HeaderStyle-Width = "8%"
                                                ItemStyle-HorizontalAlign="left"
                                                ItemStyle-Width = "8%" 
                                                >
                                <itemtemplate>
                                    <asp:label		runat="server" 
                                                    Text='<%# Convert.ToDateTime(DataBinder.Eval(Container.DataItem, "BillDate")).ToString(WAL.GF.FormatDate)  %>' 
                                                    ID="_lblBillDate"/>
                                </itemtemplate>
                            </asp:TemplateColumn >
                            <asp:TemplateColumn runat="server" 
                                                HeaderText="Tenant" 
                                                HeaderStyle-HorizontalAlign="left"  
                                                HeaderStyle-Width = "22%" 
                                                ItemStyle-HorizontalAlign="left"
                                                ItemStyle-Width = "22%" 
                                                >
                                <itemtemplate>
                                    <asp:label		runat="server" 
                                                    Text='<%# DataBinder.Eval(Container.DataItem, "TenantID").ToString() %>' 
                                                    ID="_lblTenantID"/>&nbsp;
                                    <asp:label		runat="server" 
                                                    Text='<%# DataBinder.Eval(Container.DataItem, "TenantName").ToString() %>' 
                                                    ID="_lblTenantName"/>
                                </itemtemplate>
                            </asp:TemplateColumn >																		
                            <asp:TemplateColumn runat="server" 
                                                HeaderText="Suite"
                                                HeaderStyle-HorizontalAlign="left" 
                                                HeaderStyle-Width = "5%"
                                                ItemStyle-HorizontalAlign="left"
                                                ItemStyle-Width = "5%" 
                                                >
                                <itemtemplate>
                                    <asp:label		runat="server" 
                                                    Text='<%# DataBinder.Eval(Container.DataItem, "SuiteNo") %>' 
                                                    ID="_lblSuiteNo"/>
                                </itemtemplate>
                            </asp:TemplateColumn >
                            <asp:TemplateColumn runat="server" 
                                                HeaderText="Acc/Dept"
                                                HeaderStyle-HorizontalAlign="left" 
                                                HeaderStyle-Width = "8%"
                                                ItemStyle-HorizontalAlign="left"
                                                ItemStyle-Width = "8%" 
                                                >
                                <itemtemplate>
                                    <asp:label		runat="server" 
                                                    Text='<%# DataBinder.Eval(Container.DataItem, "AccountNo") %>' 
                                                    ID="_lblAccountNo"/>&ensp;
                                    <asp:label		runat="server" 
                                                    Text='<%# DataBinder.Eval(Container.DataItem, "CT") %>' 
                                                    ID="_lblCT"/>
                                </itemtemplate>
                            </asp:TemplateColumn >

                            <asp:TemplateColumn runat="server" 
                                                HeaderText="Description" 
                                                HeaderStyle-HorizontalAlign="left" 
                                                HeaderStyle-Width = "20%"
                                                ItemStyle-HorizontalAlign="left"
                                                ItemStyle-Width = "20%" 
                                                >
                                <itemtemplate>
                                    <asp:label		runat="server" 
                                                    Text='<%# DataBinder.Eval(Container.DataItem, "Description") %>' 
                                                    ID="_lblDescription"/>
                                </itemtemplate>
                            </asp:TemplateColumn >
                            <asp:TemplateColumn runat="server" 
                                                HeaderText="AR Billing" 
                                                HeaderStyle-HorizontalAlign="left" 
                                                HeaderStyle-Width = "10%"
                                                ItemStyle-HorizontalAlign="left"
                                                ItemStyle-Width = "10%" 
                                                >
                                <itemtemplate>
                                    <asp:label		runat="server" 
                                                    Text='<%# DataBinder.Eval(Container.DataItem, "ARBillNo") %>' 
                                                    ID="_lblARBillNo"/><br />
                                    <asp:label		runat="server" 
                                                    Text='<%# Convert.ToDateTime(DataBinder.Eval(Container.DataItem, "ARBillDate")).Year == 1900 ? "" : Convert.ToDateTime(DataBinder.Eval(Container.DataItem, "ARBillDate")).ToString(WAL.GF.FormatDate) %>' 
                                                    ID="_lblARBillDate"/>
                                </itemtemplate>
                            </asp:TemplateColumn >
                            <asp:TemplateColumn runat="server" 
                                                HeaderText="Amount" 
                                                HeaderStyle-HorizontalAlign="left" 
                                                HeaderStyle-Width = "10%"
                                                ItemStyle-HorizontalAlign="left"
                                                ItemStyle-Width = "10%" 
                                                >
                                <itemtemplate>
                                    <asp:label		runat="server" 
                                                    Text='<%# DataBinder.Eval(Container.DataItem, "CurrencyID") %>' 
                                                    ID="_lblCurrencyID"/>&nbsp;
                                    <asp:label		runat="server" 
                                                    Text='<%# Convert.ToDecimal(DataBinder.Eval(Container.DataItem, "Amount")).ToString(WAL.GF.F_FormatCurrency(Convert.ToString(DataBinder.Eval(Container.DataItem, "CurrencyID")), Master.Mn_HomeCurrencyID, Convert.ToInt32(Master.Mn_HomeDecimal), Master.Mn_ForeignCurrencyID, Convert.ToInt32(Master.Mn_ForeignDecimal))) %>' 
                                                    ID="_lblAmount"/>
                                </itemtemplate>
                            </asp:TemplateColumn >																		
                                            	
                            <asp:TemplateColumn runat="server" 
                                                HeaderText="Invoice" 
                                                HeaderStyle-HorizontalAlign="left" 
                                                HeaderStyle-Width = "10%"
                                                ItemStyle-HorizontalAlign="left"
                                                ItemStyle-Width = "10%" 
                                                >
                                <itemtemplate>
                                    <asp:label		runat="server" 
                                                    Text='<%# DataBinder.Eval(Container.DataItem, "InvoiceNo") %>' 
                                                    ID="_lblInvNo"/><br />
                                    <asp:label		runat="server" 
                                                    Text='<%# Convert.ToDateTime(DataBinder.Eval(Container.DataItem, "InvoiceDate")).Year == 1900 ? "" : Convert.ToDateTime(DataBinder.Eval(Container.DataItem, "InvoiceDate")).ToString(WAL.GF.FormatDate) %>' 
                                                    ID="_lblInvDate"/>
                                </itemtemplate>
                            </asp:TemplateColumn >																		
                            </Columns>
                            </asp:DataGrid>

                        </div>
                    </td>
                </tr>
                </table>
            </td>
        </tr>
    </table>

    </asp:View>
    
    </asp:MultiView>
</asp:Content>
