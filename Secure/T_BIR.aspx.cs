using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

using System.Collections;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using WAL;
using System.IO;
//using Microsoft.VisualBasic;
//using System.Data.OleDb;

namespace UTL1.Secure
{
    public partial class T_BIR : WAL.PB, WAL.I_ToolBar_2
    {
        #region Variables
        private const string _companyIdKTA = "N00042032";
        #endregion


        #region Control Events
        protected void Page_PreInit(object sender, System.EventArgs e)
        {
            if (F_QS_InfoID_PE() != "")
            {
                Master.Mn_VisibleMenu(false);
                Master.Mn_IsByPassLogonUser = true;
            }
        }
        protected void Page_Load(object sender, System.EventArgs e)
        {
            if (F_QS_InfoID_PE() != "")
            {
                if (!IsPostBack)
                {
                    Master.Mn_lit_Title = PB.AppID + " -> Process Email BIR";
                    _PrepareScreenHD();
                    _ProcessEmail();
                }
            }
            else
            {
                if (!IsPostBack)
                {
                    string _infoID = F_QS_InfoID();

                    // 0 : cache null   1 : otorisasi menu (true)   2 : otorisasi menu (false)
                    if (base.AllowRead(F_QS_MenuID()) == 2)
                    {
                        throw new Exception(WAL.GF.MSG_ACCESS_DENIED);
                    }
                    Master.Mn_lit_Title = WAL.PB.AppID + " -> " + ((DataSet)Session[GF.Key_CacheLoggedOnUser]).Tables["UserGroupMenu"].Select("MenuID='" + F_QS_MenuID() + "'")[0]["Description"];

                    lbl_Current_UserType.Text = F_GetUserType(F_QS_MenuID());
                    if (lbl_Current_UserType.Text.ToUpper() == "")
                    {
                        throw new Exception("Current UserType not found.");
                    }
                    F_LoadCurrency();
                    F_LoadDDLPart();
                    GF.SelectListItem(ref ddlStatusApproval, "1");
                    _PrepareScreenHD();
                    if (lbl_Current_UserType.Text.ToUpper() != "USER" && _infoID != "")
                    {
                        if (_infoID.Contains("[Page]_"))
                        {
                            try
                            {
                                if (Convert.ToDecimal(_infoID.Split('_').Last()) >= Convert.ToDecimal(DateTime.Now.ToString(GF.FormatDateTime2)))
                                {
                                    string V_Description = File.ReadAllText((GF.Path_FolerView() + "\\" + Master.Mn_EmployeeID) + "\\" + _infoID + "." + "txt");
                                    lbl_Description1_Tmp.Text = V_Description.Split(new string[] { "_" + GF.Str4 + "_" }, StringSplitOptions.None)[0];
                                    lbl_Description2_Tmp.Text = V_Description.Split(new string[] { "_" + GF.Str4 + "_" }, StringSplitOptions.None)[1];
                                }
                            }
                            catch (Exception) { }

                        }
                        else
                        {
                            Master.Mn_VisibleMenu(false); 
                            using (var owi = new WAL.BR.SysWebInfo())
                            {
                                owi.ID = _infoID;
                                if (owi.SelectOne().Rows.Count > 0 && owi.ExpiredDate > GF.DBSDatetime())
                                {
                                    //if (owi.Description.ToUpper() != ("FAARAppVoidEmail").ToUpper())
                                    //{
                                    //    owi.ExpiredDate = owi.UpdateDate.AddDays(-1);
                                    //    owi.UpdateExpiredDateByID();
                                    //}
                                    if (lbl_Current_UserType.Text.ToUpper() == F_GetUserType_Active_Max(GF.GetValueByCaption(owi.Description2, "KeyHD")))
                                    {
                                        lbl_Description1_Tmp.Text = owi.Description1;
                                        lbl_Description2_Tmp.Text = "1";
                                        if (GF.SplitStr(owi.Description1, GF.Str2)[3] != Master.Mn_EmployeeID)
                                            throw new Exception("UserID not authorized to approve..");
                                    }
                                }

                            }
                        }
                        if (lbl_Description1_Tmp.Text == "")
                        {
                            throw new Exception("YOU ARE NOT AUTHORIZED TO VIEW CONTENTS OF THIS PAGE.");
                        }
                        else
                        {
                            txtBillNo.Text = lbl_Description1_Tmp.Text.Split(new string[] { GF.Str2 }, StringSplitOptions.None)[2];
                            _OpenHD();
                        }

                        //using (var owi = new WAL.BR.SysWebInfo())
                        //{
                        //    owi.ID = _infoID;
                        //    if (owi.SelectOne().Rows.Count > 0 && owi.ExpiredDate > GF.DBSDatetime())
                        //    {
                        //        //if (_infoID == "")
                        //        //    UpdateExpiredDate(_infoID);
                                    
                        //        if (lbl_Current_UserType.Text.ToUpper() == F_GetUserType_Active_Max(GF.GetValueByCaption(owi.Description2, "KeyHD"))) 
                        //        {

                        //            lbl_Description1_Tmp.Text = owi.Description1;
                        //            lbl_Description2_Tmp.Text = "1"; //owi.Description2;

                        //            txtBillNo.Text = GF.SplitStr(lbl_Description1_Tmp.Text, GF.Str2)[2];
                        //            if (GF.SplitStr(owi.Description1, GF.Str2)[3] != Master.Mn_EmployeeID)
                        //                throw new Exception("UserID not authorized to approve..");
                        //            else 
                        //                _OpenHD();
                        //        }
                        //    }
                        //    else
                        //    {
                        //        throw new Exception("YOU ARE NOT AUTHORIZED TO VIEW CONTENTS OF THIS PAGE.");
                        //    }
                        //}
                    }

                    if (lbl_Current_UserType.Text.ToUpper() == "USER" || _infoID != "")
                    {
                        InitToolbar();
                        GF.Focus(this, txtBillNo.ClientID);
                    }

                }
                SetDatePicker();
            }
        }
        protected void lbtn_PreRender(object sender, EventArgs e)
        {
            GF.AddAttdisabled_2(sender);
        }
        public void Toolbar_Click(object sender, ToolBarEventArgs_2 e)
        {
            switch (e.ToolbarItem)
            {
                case ToolbarItem_2.New:
                    _PrepareScreenHD();
                    GF.Focus(this, txtBillNo.ClientID);
                    break;
                //case ToolbarItem.Save:
                //    _SaveHD();
                //    GF.Focus(this, txtReferenceNo.ClientID);
                //    break;
                case ToolbarItem_2.Send:
                    TextBox6.Text = "";
                    WAL.GF.ConfirmMsg(p_AspxPage: this,
                                        p_ControlID: TextBox6.ClientID,
                                        p_Msg: "Are you sure want to send this BIR ?",
                                        p_ReturnValue: "1",
                                        p_MB_VS: "BS-5.3.0");
                    break;
                case ToolbarItem_2.Refresh:
                    break;
                case ToolbarItem_2.Previous:
                    _OpenHD("ALL", "", RecStatus.Previous);
                    GF.Focus(this, txtBillNo.ClientID);
                    break;
                case ToolbarItem_2.Next:
                    _OpenHD("ALL", "", RecStatus.Next);
                    GF.Focus(this, txtBillNo.ClientID);
                    break;
                case ToolbarItem_2.Back:
                    _Back();
                    break;
                case ToolbarItem_2.Approve:
                    TextBox6.Text = "";
                    WAL.GF.ConfirmMsg(p_AspxPage: this,
                                        p_ControlID: TextBox6.ClientID,
                                        p_Msg: "Are you sure want to approve this BIR ?",
                                        p_ReturnValue: "6",
                                        p_MB_VS: "BS-5.3.0");
                    break;
                case ToolbarItem_2.Delete:
                case ToolbarItem_2.Void:
                    txt_ReasonforDisapproved.Value = "";
                    txt_ReasonforDisapproved.Attributes.Add("maxlength", "250");
                    lblReason.Text = (e.ToolbarItem == ToolbarItem_2.Delete ? "Reason for Cancellation" : "Reason for Dissapproved");
                    TextBox6.Text = (e.ToolbarItem == ToolbarItem_2.Delete ? "5" : "0");
                    mv_1.SetActiveView((View)mv_1.FindControl("Vw_mv_1_InputReasonDisApproved"));
                    Master.TB_VisibleToolbar(false);
                    GF.Focus(this, txt_ReasonforDisapproved.ClientID);
                    break;
                case ToolbarItem_2.Print:
                    _Report();
                    break;
            }
        }
        protected void TextBox_TextChanged(object sender, System.EventArgs e)
        {
            TextBox a = (TextBox)sender;
            switch (a.ID)
            {
                case "TextBox6":
                    string _opt = "";
                    string _act = GF.SplitStr(a.Text)[0];
                    switch (_act)
                    {
                        case "1": // send
                            if (_SaveHD() && _ValidSend())
                            {
                                _ApproveVoid(true);
                            }
                            GF.Focus(this, txtBillNo.ClientID);
                            break;
                        case "6": // approve
                            _ApproveVoid(true);
                            GF.Focus(this, txtBillNo.ClientID);
                            break;
                        case "2":
                            _opt = GF.SplitStr(a.Text)[1];
                            TextBox6.Text = "";
                            WAL.GF.ConfirmMsg(p_AspxPage: this,
                                              p_ControlID: TextBox6.ClientID,
                                              p_Msg: "Are you sure want to delete this attachment ?",
                                              p_ReturnValue: "21;" + _opt,
                                              p_MB_VS: "BS-5.3.0");
                            //GF.ConfirmMsg_BS_5(this, TextBox6.ClientID, "Are you sure want to delete this attachment ?", "21;" + _opt);
                            //GF.ConfirmMsg_2(this, TextBox6.ClientID, "Are you sure want to delete this attachment ?", "21;" + _opt);
                            break;
                        case "21":
                            _Delete_Att(Convert.ToInt32(GF.SplitStr(a.Text)[1]));
                            break;
                        case "4":
                            _opt = GF.SplitStr(a.Text)[1];
                            TextBox6.Text = "";
                            WAL.GF.ConfirmMsg(p_AspxPage: this,
                                              p_ControlID: TextBox6.ClientID,
                                              p_Msg: "Are you sure want to delete this detail item ?",
                                              p_ReturnValue: "41;" + _opt,
                                              p_MB_VS: "BS-5.3.0");
                            //GF.ConfirmMsg_BS_5(this, TextBox6.ClientID, "Are you sure want to delete this detail item ?", "41;" + _opt);
                            //GF.ConfirmMsg_2(this, TextBox6.ClientID, "Are you sure want to delete this detail item ?", "41;" + _opt);
                            break;
                        case "41":
                            _DeleteDt(Convert.ToInt32(GF.SplitStr(a.Text)[1]));
                            break;
                        case "3":
                            GF.ShowPanel(ref pnlAddNewRecord, true);
                            lbtn_D_Addnewrecord.Visible = false;
                            _PrepareScreenDt();
                            _OpenDt(GF.SplitStr(a.Text)[1]);
                            break;
                        case "7":
                            _ApproveVoid(true);
                            break;
                        case "99":
                            {
                                string _billNo = "";
                                using (var br = new WAL.BR.CF())
                                {
                                    DataTable dt = br.EQuery("SELECT * FROM PIP_T_H_Billing WHERE CompanyID=@CompanyID AND BillNo=@BillNo",
                                        "@CompanyID=" + Master.Mn_CompanyID + GF.Str2 +
                                        "@BillNo=" + txtBillNo.Text);
                                    _billNo = dt.Rows[0]["ARBillNo"] + "";
                                }
                                using (var br = new BRC.PIP_T_H_Billing())
                                {
                                    br.BillNo = txtBillNo.Text;
                                    br.ARBillNo = _billNo;
                                    br.CompanyID = Master.Mn_CompanyID;
                                    br.LocationID = Master.Mn_LocationID;
                                    br.CopyAttachmentBillingJO();
                                }
                            }
                            break;
                    }
                    break;
                case "txtBillNo":
                    _OpenHD();
                    GF.Focus(this, txtBillNo.ClientID);
                    break;
                case "txtIncomeCode":
                    F_OpenIncome();
                    break;
                case "txtTenantID":
                    F_OpenTenant();
                    break;
                case "txtSuiteNo":
                    F_OpenSuite();
                    break;
                case "txtPeriodApproval":
                    txtPeriodApproval.Text = GFC.PeriodMonthOrYear(GF.CDate(txtPeriodApproval.Text));
                    UpdateViewGridApproval();
                    break;
                case "txtQty":
                case "txtPrice":
                case "txtFreq":
                case "txtFromDate":
                case "txtThruDate":
                case "txtAmount":
                    RefreshDescription(a);
                    break;
            }
        }
        // add detail
        protected void lBtn_D_SaveGrid_Click(object sender, EventArgs e)
        {
            _SaveDt();
            GF.Focus(this, txtIncomeCode.ClientID);
        }
        protected void lBtn_D_Close_Click(object sender, System.EventArgs e)
        {
            F_Close_pnlAddNewRecord();
            TextBox6.Text = "";
            GF.Focus(this, txtBillNo.ClientID);
        }
        protected void lbtn_D_Addnewrecord_Click(object sender, System.EventArgs e)
        {
            if (_ValidAddNewRecord())
            {
                F_SetEnabledHeader("12345", false);
                F_Open_pnlAddNewRecord();
                _PrepareScreenDt("1");
                GF.Focus(this, txtIncomeCode.ClientID);
            }
            else
            {
                GF.Focus(this, lbtn_D_Addnewrecord.ClientID);
            }
        }
        // navigation
        protected void ddlQty_SelectedIndexChanged(object sender, EventArgs e)
        {
            RefreshDescription(txtQty);
        }
        protected void ddlPart_SelectedIndexChanged(object sender, EventArgs e)
        {
            mv1.ActiveViewIndex = Convert.ToInt16(ddlPart.SelectedValue);

            if (sender != null)
            {
                GF.Focus(this, ddlPart.ClientID);
            }
        }
        protected void lbtnPrevious_Click(object sender, EventArgs e)
        {
            ddlPart.SelectedIndex = ((ddlPart.SelectedIndex - 1) < 0 ? 0 : (ddlPart.SelectedIndex - 1));
            GF.Focus(this, lbtnPrevious.ClientID);
            ddlPart_SelectedIndexChanged(null, null);
        }
        protected void lbtnNext_Click(object sender, EventArgs e)
        {
            ddlPart.SelectedIndex = ((ddlPart.SelectedIndex + 1) > (ddlPart.Items.Count - 1) ? (ddlPart.Items.Count - 1) : (ddlPart.SelectedIndex + 1));
            GF.Focus(this, lbtnNext.ClientID);
            ddlPart_SelectedIndexChanged(null, null);
        }
        // attachment
        protected void lbtn_Att_Addnewrecord_Click(object sender, System.EventArgs e)
        {
            if (_ValidAddNewRecord())
            {
                F_SetEnabledHeader("12345", false);
                F_Open_pnl_Att_AddNewRecord();
                _PrepareScreen_Att("1");
                GF.Focus(this, FU_H_File.ClientID);
            }
            else
            {
                GF.Focus(this, lbtn_Att_Addnewrecord.ClientID);
            }
        }
        protected void lBtn_Att_SaveGrid_Click(object sender, EventArgs e)
        {
            _Save_Att();
            GF.Focus(this, FU_H_File.ClientID);
        }
        protected void lBtn_Att_CloseGrid_Click(object sender, System.EventArgs e)
        {
            F_Close_pnl_Att_AddNewRecord();
            GF.Focus(this, lbtn_Att_Addnewrecord.ClientID);
        }
        // approval
        protected void lbtn_Search_Click(object sender, EventArgs e)
        {
            F_Open_pnl_Search();
            GF.Focus(this.Page, txt_S_BillNoStart.ClientID);
        }
        protected void txtMaxRecord_TextChanged(object sender, System.EventArgs e)
        {
            UpdateViewGridApproval();
            GF.Focus(this.Page, txtMaxRecord.ClientID);
        }
        protected void ddlStatusApproval_TextChanged(object sender, EventArgs e)
        {
            div_approval.Visible = ddlStatusApproval.SelectedValue != "1";
            UpdateViewGridApproval();
            GF.Focus(this.Page, txtMaxRecord.ClientID);
        }
        protected void lBtn_S_Apply_Click(object sender, EventArgs e)
        {
            UpdateViewGridApproval();
            GF.Focus(this.Page, txt_S_BillNoStart.ClientID);
        }
        protected void lbtn_S_Reset_Click(object sender, EventArgs e)
        {
            _PrepareScreen_S("1");
            GF.Focus(this.Page, txt_S_BillNoStart.ClientID);
        }
        protected void lbtn_S_Close_Click(object sender, EventArgs e)
        {
            F_Close_pnl_Search();
            GF.Focus(this.Page, lbtn_Search.ClientID);
        }
        // approve/void
        protected void lbtn_CancelVoid_Click(object sender, EventArgs e)
        {
            txt_ReasonforDisapproved.Value = "";
            mv_1.SetActiveView((View)mv_1.FindControl("Vw_mv_1_InputTrans"));
            //Master.TB_VisibleToolbar(true);
            InitToolbar();
        }
        protected void lbtn_ContinueVoid_Click(object sender, EventArgs e)
        {
            if (txt_ReasonforDisapproved.Value == "")
            {
                GF.MsgBox(this, "Reason cannot empty", "BS-5.3.0");
                GF.Focus(this, txt_ReasonforDisapproved.ClientID);
            }
            else
            {
                if (F_QS_InfoID_PE() != "")
                {
                    _ProcessEmail();
                    mv_1.SetActiveView((View)mv_1.FindControl("Vw_mv_1_ApprovalMsg"));
                }
                else
                {
                    if (TextBox6.Text == "5")
                    {
                        _DeleteHD();
                    }
                    else 
                    {
                        _ApproveVoid(false);
                    }
                    TextBox6.Text = "";
                    _Back();
                }
            }
        }

        // others
        protected void lBtnViewTenant_Click(object sender, EventArgs e)
        {
            TextBox6.Text = "VIEWBIR";
            InitToolbar();
            _PrepareScreenHD();
            tr_statusapproval.Visible = false;
        }
        #endregion

        #region Main Function (CRUD)
        private void _ProcessEmail()
        {
            string _strmsg = "";

            string V_QS_InfoID = Request.QueryString["InfoID"];
            string V_QS_KeyHD = "";
            bool V_QS_IsApproved = false;
            string V_QS_MenuID = "";
            string V_QS_Mn_EmployeeID = "";
            string V_QS_LastStatusTransDate = "";
            string V_QS_Url_FolerView = F_Url_FolerView(Context.Request.ApplicationPath);
            string V_QS_Path_FolderAttachments = F_Path_FolderAttachments(Context.Request.ApplicationPath);
            string V_CompanyID = "", V_LocationID = "", V_Token = "", V_FullFolder = "", V_BillNo = "";

            if (V_QS_InfoID.Contains("[Page]_"))
            {
                try
                {
                    V_CompanyID = GF.SplitStr(V_QS_InfoID, "_")[1];
                    V_LocationID = GF.SplitStr(V_QS_InfoID, "_")[2];
                    V_BillNo = GF.SplitStr(V_QS_InfoID, "_")[3];
                    V_QS_Mn_EmployeeID = GF.SplitStr(V_QS_InfoID, "_")[4];
                    string V_FullFolderFileNameType = (GF.Path_FolerView() + "\\UTL\\BIR\\" + V_CompanyID + "_" +
                                                                                            V_LocationID + "\\" +
                                                                                            V_QS_Mn_EmployeeID + "\\" +
                                                                                            V_BillNo + "\\" +
                                                                                            V_QS_InfoID + "." + "txt");
                    V_FullFolder = (GF.Path_FolerView() + "\\UTL\\BIR\\" + V_CompanyID + "_" + V_LocationID + "\\" +
                                                                            V_QS_Mn_EmployeeID + "\\" +
                                                                            V_BillNo);
                    V_Token = File.ReadAllText(V_FullFolderFileNameType);
                    V_QS_MenuID = GF.GetValueByCaption(V_Token, "MenuID");
                    V_QS_KeyHD = GF.GetValueByCaption(V_Token, "KeyHD");
                    V_QS_Mn_EmployeeID = GF.GetValueByCaption(V_Token, "Mn_EmployeeID");
                    V_QS_IsApproved = Convert.ToBoolean(GF.GetValueByCaption(V_Token, "IsApproved"));
                    V_QS_LastStatusTransDate = GF.GetValueByCaption(V_Token, "LastDate");
                }
                catch (Exception) { }
            }
            if (V_QS_Mn_EmployeeID == "" || V_Token == "")
            {
                throw new Exception("YOU ARE NOT AUTHORIZED TO VIEW CONTENTS OF THIS PAGE.");
            }
            else
            {
                if (_strmsg == "")
                {
                    lbl_Current_UserType.Text = F_GetUserType(V_QS_MenuID);
                    if (lbl_Current_UserType.Text.ToUpper() == "")
                    {
                        //throw new Exception("Current UserType not found.");
                        _strmsg = "Current UserType not found.";
                    }
                    //lbl_UserType_Active_Max.Text = F_GetUserType_Active_Max(V_QS_KeyHD);
                }


                if (_strmsg == "")
                {
                    using (var oe = new BRC.PIP_T_H_Billing())
                    {
                        oe.KeyHD = Convert.ToInt32(V_QS_KeyHD);
                        if (oe.SelectOneByKeyHD().Rows.Count > 0)
                        {
                            if (Convert.ToDateTime(V_QS_LastStatusTransDate) != oe.UpdateDate)
                            {
                                _strmsg = "this transaction already Processed";
                            }
                        }
                        else
                        {
                            _strmsg = "this Transaction is not found";
                        }
                    }
                }

                if (_strmsg == "")
                {
                    if (V_QS_IsApproved == false && txt_ReasonforDisapproved.Value == "")
                    {
                        txt_ReasonforDisapproved.Attributes.Add("maxlength", "255");
                        mv_1.SetActiveView((View)mv_1.FindControl("Vw_mv_1_InputReasonDisApproved"));
                        GF.Focus(this, txt_ReasonforDisapproved.ClientID);
                        return;
                    }
                }


                string _StrProcessSuccess = "";

                if (_strmsg == "")
                {
                    if (V_QS_IsApproved)
                    {
                        _StrProcessSuccess = "Process Approved Successfully";
                    }
                    else
                    {
                        _StrProcessSuccess = "Process Disapproved Successfully";
                    }

                    using (var op = new BRC.PIP_T_H_Billing())
                    {
                        op.KeyHD = Convert.ToInt32(V_QS_KeyHD);
                        if (op.SelectOneByKeyHD().Rows.Count > 0)
                        {
                            op.UpdateUser = V_QS_Mn_EmployeeID;

                            _strmsg = op.spUTL_T_BIR_ApproveVoid(lbl_Current_UserType.Text,
                                                                          V_QS_IsApproved,
                                                                          (V_QS_IsApproved ? "" : txt_ReasonforDisapproved.Value),
                                                                          V_QS_Url_FolerView,
                                                                          V_QS_Path_FolderAttachments,
                                                                          "2");

                            if (_strmsg == "")
                            {
                                Directory.Delete(V_FullFolder, true);
                                V_FullFolder = (GF.Path_FolerView() + "\\UTL\\BIR\\" + V_CompanyID + "_" + V_LocationID + "\\" +
                                                                                        V_QS_Mn_EmployeeID.Replace("_", ""));
                                if (Directory.GetFileSystemEntries(V_FullFolder).Length == 0)
                                    Directory.Delete(V_FullFolder, true);
                                _strmsg = _StrProcessSuccess;
                                if (V_QS_IsApproved)
                                {
                                    string _ListEmailAddress_Next_UserType = F_ListEmailAddress_Next_UserType(lbl_Current_UserType.Text.ToUpper(), Convert.ToDecimal(V_QS_KeyHD));
                                    if (_ListEmailAddress_Next_UserType != "")
                                    {
                                        lbl_Msg_Desc2.Text = "<br/> Email sent to : " + _ListEmailAddress_Next_UserType;
                                    }
                                }
                            }
                        }
                        else
                        {
                            _strmsg = "this Transaction is not found.";
                        }
                    }
                }



                if (_strmsg == _StrProcessSuccess)
                {
                    pnl_Msg_Desc.CssClass = "alert alert-success shadow";
                    //lbl_Msg_Desc.ForeColor = System.Drawing.Color.Lime;
                }
                //else if (_strmsg == _StrProcessFailed)
                //{
                //    pnl_Msg_Desc.CssClass = "alert alert-danger shadow";
                //    //lbl_Msg_Desc.ForeColor = System.Drawing.Color.Red;
                //}
                else
                {
                    pnl_Msg_Desc.CssClass = "alert alert-warning shadow";
                    //lbl_Msg_Desc.ForeColor = System.Drawing.Color.Yellow;
                }


                lbl_Msg_Desc.Text = _strmsg;
            }
        }
        private void InitToolbar()
        {
            Master.TB_VisibleToolbar(true);
            if (lbl_Current_UserType.Text.ToUpper() == "USER" && TextBox6.Text == "")
            {
                Master.TB_VisibleButton(ToolbarItem_2.New, true);
                Master.TB_VisibleButton(ToolbarItem_2.Delete, true);
                //Master.TB_VisibleButton(ToolbarItem_2.Refresh, true);
                Master.TB_VisibleButton(ToolbarItem_2.Send, true);
                Master.TB_VisibleButton(ToolbarItem_2.Save, true);
                Master.TB_VisibleButton(ToolbarItem_2.Previous, true);
                Master.TB_VisibleButton(ToolbarItem_2.Next, true);
                Master.TB_VisibleButton(ToolbarItem_2.Back, false);
                //Master.TB_VisibleButton(ToolbarItem_2.Custom_1, true);
                //Master.TB_VisibleButton(ToolbarItem_2.Print, true);
            }
            else 
            {
                //Master.TB_VisibleButton(ToolbarItem_2.Back, F_QS_InfoID() == "");
                Master.TB_VisibleButton(ToolbarItem_2.Back, true);
                //Master.TB_VisibleButton(ToolbarItem_2.Refresh, true);
                Master.TB_VisibleButton(ToolbarItem_2.New, false);
                Master.TB_VisibleButton(ToolbarItem_2.Delete, false);
                Master.TB_VisibleButton(ToolbarItem_2.Save, false);
                Master.TB_VisibleButton(ToolbarItem_2.Previous, false);
                Master.TB_VisibleButton(ToolbarItem_2.Next, false);
                Master.TB_VisibleButton(ToolbarItem_2.Send, false);
                if
                (
                    GF.SplitStr(lbl_Description2_Tmp.Text, GF.Str2)[0] == "1"
                    &&
                    ("[VTLOG][VIEWBIR]").Contains("[" + lbl_Current_UserType.Text.ToUpper() + "]") == false
                    && TextBox6.Text == ""
                )
                {
                    Master.TB_VisibleButton(ToolbarItem_2.Approve, true);
                    Master.TB_VisibleButton(ToolbarItem_2.Void, true);
                }
                else
                {
                    Master.TB_VisibleButton(ToolbarItem_2.Approve, false);
                    Master.TB_VisibleButton(ToolbarItem_2.Void, false);
                }
                //Master.TB_VisibleButton(ToolbarItem_2.Print, true);
            }
            
        }
        private void _PrepareScreenHD()
        {
            if (F_QS_InfoID_PE() != "")
            {
                mv_1.SetActiveView((View)mv_1.FindControl("Vw_mv_1_ApprovalMsg"));
                lbl_Msg_Desc.Text = "";
                txt_ReasonforDisapproved.Value = "";
                lbtn_CancelVoid.Visible = false;
            }
            else if ((lbl_Current_UserType.Text == "USER" || F_QS_InfoID() != "") && TextBox6.Text == "")
            {
                //mv_1.ActiveViewIndex = 1;
                //txt_ReasonforDisapproved.Value = "";
                //Master.TB_VisibleToolbar(false);

                mv_1.SetActiveView((View)mv_1.FindControl("Vw_mv_1_InputTrans"));
                if (Master.Mn_CompanyID == _companyIdKTA || GFC.LocationID_KL().Contains(Master.Mn_LocationID))
                {
                    txtActivePeriodCAR.Text = GF.ActivePeriod("UTL" + Master.Mn_CompanyID + Master.Mn_LocationID).ToString(GF.FormatDate);
                    if (GF.CDate(txtActivePeriodCAR.Text).CompareTo(GF.DBSDatetime().Date) < 0)
                        txtBillDate.Text = txtActivePeriodCAR.Text;
                    else
                        txtBillDate.Text = GF.DBSDatetime().ToString(GF.FormatDate);
                }
                else
                {
                    txtActivePeriodCAR.Text = GF.ActivePeriod("CAR" + Master.Mn_CompanyID + Master.Mn_LocationID).ToString(GF.FormatDate);
                    string p_AutoNumSeqNo = "";
                    DateTime p_BillDate = GF.MinDate();
                    GFC.GetAutoNumBillDateUTL("UTLBIR" + Master.Mn_CompanyID + Master.Mn_LocationID, ref p_BillDate, ref p_AutoNumSeqNo);
                    txtBillDate.Text = p_BillDate.ToString(GF.FormatDate);
                }
                txtBillDate.ReadOnly = !GFC.LocationID_KL().Contains(Master.Mn_LocationID);
                txt_H_KeyHD.Text = lblTotItems.Text = "0";
                txtBillNo.Text = txtTenantID.Text = txtTenantName.Text = txtTenantName.ToolTip = "";
                GF.SelectListItem(ref ddlCurrency, Master.Mn_HomeCurrencyID);
                txt_H_UpdateDate.Text = "";
                chkLumpsum.Checked = false;
                chkLumpsum.Enabled = true;
                txtBillNo.Enabled = true;

                lBtnBillNo.Attributes.Add("onClick", GF.JSOpenSearchList_2("36", "Billing", txtBillNo.ClientID, false, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + GF.Str + ";1" + GF.Str + ";" + Master.Mn_EmployeeID + GF.Str, true, 0, "1000", "600"));
                txtBillNo.Attributes.Add("onKeyDown", GF.JSOpenSearchList_2("36", "Billing", txtBillNo.ClientID, true, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + GF.Str + ";1" + GF.Str + ";" + Master.Mn_EmployeeID + GF.Str, true, 0, "1000", "600"));

                //lBtnTenantID.Attributes.Add("onClick", GF.JSOpenSearchList_2("33", "Master Tenant", txtTenantID.ClientID, false, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + "1" + GF.Str + Master.Mn_EmployeeID + GF.Str, true, 0, "1000", "600"));
                //txtTenantID.Attributes.Add("onKeyDown", GF.JSOpenSearchList_2("33", "Master Tenant", txtTenantID.ClientID, true, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + "1" + GF.Str + Master.Mn_EmployeeID + GF.Str, true, 0, "1000", "600"));
                lBtnTenantID.Attributes.Add("onClick", GF.JSOpenSearchList_2("33", "Master Tenant", txtTenantID.ClientID, false, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + "1" + GF.Str, true, 0, "1000", "600"));
                txtTenantID.Attributes.Add("onKeyDown", GF.JSOpenSearchList_2("33", "Master Tenant", txtTenantID.ClientID, true, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + "1" + GF.Str, true, 0, "1000", "600"));

                
                lBtnProgressBIR.Visible = false;
                txtTenantID.ReadOnly = false;
                //F_LoadDDLPart();
                ddlPart.SelectedValue = "0";
                ddlPart_SelectedIndexChanged(null, null);
                lbtn_D_Addnewrecord.Enabled = true;
                mv_0.SetActiveView((View)mv_0.FindControl("Vw_mv_0_Blank"));

                Master.TB_EnableButton(ToolbarItem_2.Save, false);
                Master.TB_EnableButton(ToolbarItem_2.Delete, false);
                Master.TB_EnableButton(ToolbarItem_2.Send, false);
                Master.TB_EnableButton(ToolbarItem_2.Print, false);

                F_Close_pnlAddNewRecord();
                F_Close_pnl_Att_AddNewRecord();

                _PrepareScreenDt();
                _PrepareScreen_Att();

                lit_info.Text = "";
                using (var br = new WAL.BR.CF())
                {
                    SqlParameter[] _prm = new SqlParameter[] 
                {
                    new SqlParameter("@p_Tipe", "53")
                };
                    DataTable dt = br.EQueryP("spUTL_T_BIR_Update", _prm, true);
                    lit_att.Text = dt.Rows[0]["InfoAttachment"] + "";
                    litDetail.Text = dt.Rows[0]["InfoDetail"] + "";
                }

                if (lbl_Current_UserType.Text.ToUpper() == "USER") // User
                {
                    F_SetEnabledHeader("123", true);

                    lBtn_D_SaveGrid.Enabled = true;
                    lBtn_Att_SaveGrid.Enabled = true;

                }
                else
                {
                    F_SetEnabledHeader("123", false);

                    lBtn_D_SaveGrid.Enabled = false;
                    lBtn_Att_SaveGrid.Enabled = false;

                }
            }
            else
            {
                mv_1.SetActiveView((View)mv_1.FindControl("Vw_mv_1_Approval"));

                if (TextBox6.Text != "VIEWBIR")
                {
                    lBtnBillNo.Enabled = false;
                    lBtnBillNo.Attributes.Remove("onClick");
                    txtBillNo.Enabled = false;
                    txtBillNo.Attributes.Remove("onClick");
                }

                if (("[VTLOG][VIEWBIR]").Contains("[" + lbl_Current_UserType.Text.ToUpper() + "]"))
                {
                    tr_statusapproval.Visible = lbl_Current_UserType.Text.ToUpper() != "USER";
                    if (lbl_Current_UserType.Text == "VIEWBIR")
                    {
                        Master.TB_VisibleToolbar(true);
                        Master.TB_VisibleButton(ToolbarItem_2.Print, true);
                    }
                    //GF.ShowPanel(ref pnlStsApproval, false);
                    //gridApp.Columns[7].Visible = true;
                }
                else
                {
                    tr_statusapproval.Visible = true;
                    //GF.ShowPanel(ref pnlStsApproval, true);
                    //gridApp.Columns[7].Visible = false;
                    txtPeriodApproval.Text = GF.CDate(GFC.PeriodMonthOrYear(GF.DBSDatetime())).ToString(GF.FormatDate);
                }

                _PrepareScreen_S();
            }
        }
        private void _PrepareScreenDt(string strtype = "")
        {
            lBtnIncomeCode.Attributes.Add("onClick", GF.JSOpenSearchList_2("124", "Master Income", txtIncomeCode.ClientID, false, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + txtTenantID.ClientID + ";" + (chkLumpsum.Checked ? "Y" : "") + GF.Str + ";" + Master.Mn_EmployeeID + GF.Str, true, 0, "1000", "600"));
            txtIncomeCode.Attributes.Add("onKeyDown", GF.JSOpenSearchList_2("124", "Master Income", txtIncomeCode.ClientID, true, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + txtTenantID.ClientID + ";" + (chkLumpsum.Checked ? "Y" : "") + GF.Str + ";" + Master.Mn_EmployeeID + GF.Str, true, 0, "1000", "600"));
            lBtnSuiteNo.Attributes.Add("onClick", GF.JSOpenSearchList_2("118", "Master Suite", txtSuiteNo.ClientID, false, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + txtTenantID.ClientID));
            txtSuiteNo.Attributes.Add("onKeyDown", GF.JSOpenSearchList_2("118", "Master Suite", txtSuiteNo.ClientID, true, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + txtTenantID.ClientID));

            F_LoadDDLFreq();
            F_LoadDDLQuantity();
            txtSeqNo.Text = "0";
            txtIncomeCode.Text = txtIncomeDesc.Text = txtSuiteNo.Text = txtDescription1.Text = txtDescription2.Text = txtDescription3.Text = "";
            txtIsUnearned.Text = "";
            txtFromDate.Text = txtThruDate.Text = "";
            txtIncomeCode.ReadOnly = false;
            txtPrice.Text = txtQty.Text = txtFreq.Text = txtVAT.Text = txtAmount.Text = "0.00";
            txtFreq.ReadOnly = txtQty.ReadOnly = txtPrice.ReadOnly = chkLumpsum.Checked;
            ddlFreq.Enabled = ddlQty.Enabled = !chkLumpsum.Checked;
            //txtAmount.ReadOnly = !chkLumpsum.Checked;
            txtFromDate.ReadOnly = txtThruDate.ReadOnly = true;
        }
        private void _PrepareScreen_Att(string strtype = "")
        {
            txt_Att_FileName2.Text = "";
            chkForBilling.Checked = false;
        }
        private void _OpenHD(string p_StrType1 = "ALL",
                             string p_StrType2 = "",
                             RecStatus recStatus = RecStatus.Current)
        {
            using (var br = new WAL.BR.CF())
            {
                SqlParameter[] _prm = new SqlParameter[] 
                {
                    new SqlParameter("@p_H_CompanyID", Master.Mn_CompanyID),
                    new SqlParameter("@p_H_LocationID", Master.Mn_LocationID),
                    new SqlParameter("@p_H_BillNo", lbl_Current_UserType.Text.ToUpper() == "USER" ? txtBillNo.Text : GF.SplitStr(lbl_Description1_Tmp.Text, GF.Str2)[2]),
                    new SqlParameter("@p_UpdateUser", lbl_Current_UserType.Text.ToUpper() == "USER" ? Master.Mn_EmployeeID : GF.SplitStr(lbl_Description1_Tmp.Text, GF.Str2)[3]),
                    new SqlParameter("@p_AV_UserType", lbl_Current_UserType.Text),
                    new SqlParameter("@p_AV_UrlWebFolder", PB.Url_WebFolder1 + Context.Request.ApplicationPath.Replace("/", "")),
                    new SqlParameter("@p_Tipe", "5" + (recStatus == RecStatus.Next ? "1" : (recStatus == RecStatus.Previous ? "2" : "0")))
                };
                DataTable dt = br.EQueryP("spUTL_T_BIR_Update", _prm, true);
                if (dt.Rows.Count > 0)
                {
                    ddlPart.SelectedValue = "0";
                    ddlPart_SelectedIndexChanged(null, null);
                    txtBillNo.Text = dt.Rows[0]["BillNo"] + "";
                    txtBillDate.Text = Convert.ToDateTime(dt.Rows[0]["BillDate"]).ToString(GF.FormatDate);
                    txtTenantID.Text = dt.Rows[0]["TenantID"] + "";
                    F_OpenTenant();
                    lblTotItems.Text = dt.Rows[0]["TotItems"] + "";
                    txt_H_KeyHD.Text = dt.Rows[0]["KeyHD"] + "";
                    txt_H_UpdateDate.Text = Convert.ToDateTime(dt.Rows[0]["UpdateDate"]).ToString("yyyy-MM-dd HH:mm:ss.fff");
                    txt_ReasonforDisapproved.Value = txtIsUnearned.Text = "";
                    GF.SelectListItem(ref ddlCurrency, dt.Rows[0]["CurrencyID"] + "");
                    chkLumpsum.Checked = GF.GetBoolean(dt.Rows[0]["IsLumpsum"]);
                    lbtn_D_Addnewrecord.Enabled = !Convert.ToBoolean(dt.Rows[0]["IsSendUser"]) && Convert.ToBoolean(dt.Rows[0]["IsActive"]);
                    Master.TB_EnableButton(ToolbarItem_2.Print, Convert.ToBoolean(dt.Rows[0]["IsActive"]) && Convert.ToBoolean(dt.Rows[0]["IsSendUser"]));
                    lit_att.Text = dt.Rows[0]["InfoAttachment"] + "";
                    using (var br1 = new BRC.PIP_T_DocumentAttachment())
                    {
                        br1.CompanyID = Master.Mn_CompanyID;
                        br1.LocationID = Master.Mn_LocationID;
                        br1.DocNo = txtBillNo.Text;
                        br1.Type = "BIL";
                        string pathupload = PB.Path_WebFolder1 + Context.Request.ApplicationPath.Replace("/", "") + "\\PIP_T_H_Billing\\" + Master.Mn_CompanyID + "_" + Master.Mn_LocationID + "\\" + txtBillNo.Text + "\\";
                        double V_TotalFileSize = 0;
                        foreach (DataRow dr in br1.SelectAll().Rows)
                        {
                            string _x = "H_FileSize_" + dr["SeqNo"];
                            try
                            {
                                System.IO.FileInfo f = new System.IO.FileInfo(pathupload + dr["FileName"] + "." + dr["FileType"]);
                                lit_att.Text = lit_att.Text.Replace(_x, Convert.ToDecimal(f.Length / 1048576.00).ToString(GF.FormatCurrency2));
                                V_TotalFileSize += f.Length;
                            }
                            catch (Exception)
                            {
                                lit_att.Text = lit_att.Text.Replace(_x, "");
                            }

                        }
                        lbl_Att_TotalFileSize_InMB.Text = Convert.ToDecimal(V_TotalFileSize / 1048576.00).ToString(GF.FormatCurrency2);

                    }


                    litDetail.Text = dt.Rows[0]["InfoDetail"] + "";
                    litDetail.Visible = true;
                    lit_info.Text = dt.Rows[0]["InfoBIR"] + "";
                    lBtnProgressBIR.Visible = true;
                    if (lbl_Current_UserType.Text.ToUpper() == "USER") //User
                    {
                        Master.TB_IsConfirmMessage(ToolbarItem_2.Delete, false);
                        lblStatus.Text = !Convert.ToBoolean(dt.Rows[0]["isActive"]) ? "CANCELLED" : (Convert.ToBoolean(dt.Rows[0]["IsSendUser"]) ? "SENT" : "");
                        Master.TB_EnableButton(ToolbarItem_2.Send, lblStatus.Text == "");
                        Master.TB_EnableButton(ToolbarItem_2.Save, lblStatus.Text == "");
                        Master.TB_EnableButton(ToolbarItem_2.Delete, lblStatus.Text == "");
                        ClientScript.RegisterStartupScript(this.GetType(), "script",
        @"document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'S') {
        $('#ContentPlaceHolder1_TextBox6').val('99');
        __doPostBack('ctl00$ContentPlaceHolder1$TextBox6','');
    }
});", true);
                    }
                    else
                    {
                        InitToolbar();

                        lBtnBillNo.Enabled = false;
                        lBtnBillNo.Attributes.Remove("onClick");
                        txtBillNo.Enabled = false;
                        txtBillNo.Attributes.Remove("onClick");
                        lBtnTenantID.Enabled = false;
                        lBtnTenantID.Attributes.Remove("onClick");
                        txtTenantID.Enabled = false;
                        txtTenantID.Attributes.Remove("onClick");

                        if (("[VTLOG][VIEWBIR]").Contains("[" + lbl_Current_UserType.Text.ToUpper() + "]"))
                        {
                            Master.TB_EnableButton(ToolbarItem_2.Approve, false);
                            Master.TB_EnableButton(ToolbarItem_2.Void, false);
                        }
                        else
                        {
                            bool V_IsApprove = false;
                            using (var ocf = new WAL.BR.CF())
                            {
                                V_IsApprove = Convert.ToBoolean(ocf.EQuery(
                                string.Format("SELECT h.Is{0}Approved As IsApproved FROM PIP_T_H_Billing h WHERE h.KeyHD = {1}", lbl_Current_UserType.Text, txt_H_KeyHD.Text)).Rows[0]["IsApproved"]);
                            }
                            Master.TB_EnableButton(ToolbarItem_2.Approve, !V_IsApprove);
                            Master.TB_EnableButton(ToolbarItem_2.Void, !V_IsApprove);
                            Master.TB_IsConfirmMessage(ToolbarItem_2.Approve, false);
                            Master.TB_IsConfirmMessage(ToolbarItem_2.Void, false);
                            lblStatus.Text = (V_IsApprove ? "APPROVED" : "");
                        }

                    }
                    lBtn_D_SaveGrid.Enabled = lblStatus.Text == "";
                    lBtn_Att_SaveGrid.Enabled = lblStatus.Text == "";
                    lbtn_Att_Addnewrecord.Enabled = lblStatus.Text == "";
                    if (lblStatus.Text != "")
                        mv_0.SetActiveView((View)mv_0.FindControl("Vw_mv_0_PopupStatus"));
                    else
                        mv_0.SetActiveView((View)mv_0.FindControl("Vw_mv_0_Blank"));

                    //Master.TB_EnableButton(ToolbarItem_2.Print, true);

                    lBtnProgressBIR.Attributes.Add("onClick", GF.JSOpenSearchList_2("136", "Progress BIR", TextBox6.ClientID, false, txt_H_KeyHD.ClientID, true, 0, "1000", "600"));

                    //p_strtype1 : ON
                    //p_strtype2 : OFF
                    if (p_StrType1 == "ALL")
                    {
                        F_ON_OFF(p_StrType2, false);
                    }
                    else if (p_StrType2 == "ALL")
                    {
                        F_ON_OFF(p_StrType1, true);
                    }

                    F_SetEnabledHeader("123", Convert.ToInt16(lblTotItems.Text) == 0);
                    lbl_UserType_Active_Max.Text = F_GetUserType_Active_Max(txt_H_KeyHD.Text);

                    if
                    (
                        (lbl_Current_UserType.Text.ToUpper() == "USER" && Master.TB_EnableButton(ToolbarItem_2.Send))
                        ||
                        (!("[VTLOG][USER][VIEWBIR]").Contains("[" + lbl_Current_UserType.Text.ToUpper() + "]") && Master.TB_EnableButton(ToolbarItem_2.Approve))
                    )
                    {
                        string _ListEmailAddress_Next_UserType = F_ListEmailAddress_Next_UserType(lbl_Current_UserType.Text.ToUpper(), Convert.ToDecimal(txt_H_KeyHD.Text));
                        if (lbl_Current_UserType.Text.ToUpper() == "USER") //User
                        {
                            Master.TB_SetConfirmMessage(ToolbarItem_2.Send, true,
                                                        "Are you sure you want to send email ?" +
                                                        "\\n\\n" +
                                                        "Email will be sent to : " +
                                                        _ListEmailAddress_Next_UserType);
                            Master.TB_SetConfirmMessage(ToolbarItem_2.Void, true,
                                                        "Are you sure want to Cancel this BIR ?");
                        }
                        else
                        {
                            Master.TB_SetConfirmMessage(ToolbarItem_2.Approve, true,
                                                        GF.MSG_APPROVE +
                                                        (_ListEmailAddress_Next_UserType != "" ?
                                                        "\\n\\n" +
                                                        "Email will be sent to : " +
                                                        _ListEmailAddress_Next_UserType : ""));
                            Master.TB_SetConfirmMessage(ToolbarItem_2.Void, true,
                                                        "Are you sure want to Void this Billing ?");
                        }

                    }

                }
                else
                {
                    _PrepareScreenHD();
                }
            }
        }
        private void _OpenDt(string ID)
        {
            using (var br = new BRC.PIP_T_H_Billing())
            {
                br.SeqNo = Convert.ToInt32(ID);
                br.KeyHD = Convert.ToInt32(txt_H_KeyHD.Text);
                if (br.SelectOneDetailByKeyHD().Rows.Count > 0)
                {
                    txtSeqNo.Text = br.SeqNo + "";
                    txtIncomeCode.Text = br.IncomeCode;
                    F_OpenIncome();
                    txtSuiteNo.Text = br.SuiteNo;
                    txtQty.Text = br.Quantity.ToString(GF.FormatCurrency2);
                    GF.SelectListItem(ref ddlQty, br.QuantityDesc);
                    txtFreq.Text = br.Freq.ToString(GF.FormatCurrency2);
                    GF.SelectListItem(ref ddlFreq, br.FreqDesc);
                    txtPrice.Text = br.Price.ToString(GF.F_FormatCurrency(ddlCurrency.SelectedValue,
                                                    Master.Mn_HomeCurrencyID,
                                                    Convert.ToInt32(Master.Mn_HomeDecimal),
                                                    Master.Mn_ForeignCurrencyID,
                                                    Convert.ToInt32(Master.Mn_ForeignDecimal)));
                    txtAmount.Text = br.Amount.ToString(GF.F_FormatCurrency(ddlCurrency.SelectedValue,
                                                    Master.Mn_HomeCurrencyID,
                                                    Convert.ToInt32(Master.Mn_HomeDecimal),
                                                    Master.Mn_ForeignCurrencyID,
                                                    Convert.ToInt32(Master.Mn_ForeignDecimal)));
                    txtVAT.Text = br.VAT.ToString(GF.FormatCurrency2);
                    txtFromDate.Text = br.PeriodeFrom.ToString(GF.FormatDate);
                    txtThruDate.Text = br.PeriodeThru.ToString(GF.FormatDate);
                    txtDescription1.Text = br.Description1;
                    txtDescription2.Text = br.Description2;
                    txtDescription3.Text = br.Description3;
                    lBtn_Att_SaveGrid.Enabled = lblStatus.Text == "";
                }
                else
                {
                    _PrepareScreenDt("1");
                }
            }
            TextBox6.Text = "";
        }
        private string _ApproveVoid(bool p_IsApprove, string p_UserStore = "")
        {
            string _retval = "None";

            using (var obr = new BRC.PIP_T_H_Billing())
            {
                obr.KeyHD = (GF.IsNumeric(txt_H_KeyHD.Text) ? Convert.ToInt32(txt_H_KeyHD.Text) : 0);

                if (obr.SelectOneByKeyHD().Rows.Count > 0)
                {
                    obr.UpdateUser = Master.Mn_EmployeeID;
                    obr.UpdateDate = Convert.ToDateTime(txt_H_UpdateDate.Text);
                    if (p_IsApprove)
                    {
                        txt_ReasonforDisapproved.Value = "";
                    }

                    _retval = obr.spUTL_T_BIR_ApproveVoid(lbl_Current_UserType.Text,
                                                        p_IsApprove,
                                                        (p_IsApprove ? "" : txt_ReasonforDisapproved.Value),
                                                        F_Url_FolerView(Context.Request.ApplicationPath),
                                                        F_Path_FolderAttachments(Context.Request.ApplicationPath),
                                                        "2");

                    if (_retval == "")
                    {
                        if (lbl_Current_UserType.Text != "USER")
                        {
                            string V_FullFolder = (GF.Path_FolerView() + "\\UTL\\BIR\\" +
                                                                        Master.Mn_CompanyID + "_" + Master.Mn_LocationID + "\\" +
                                                                        Master.Mn_EmployeeID.Replace("_", "") + "\\" +
                                                                        obr.BillNo);
                            try
                            {
                                if (Directory.Exists(V_FullFolder))
                                {
                                    Directory.Delete(V_FullFolder, true);
                                    V_FullFolder = (GF.Path_FolerView() + "\\UTL\\BIR\\" +
                                                                        Master.Mn_CompanyID + "_" + Master.Mn_LocationID + "\\" +
                                                                        Master.Mn_EmployeeID.Replace("_", ""));
                                    if (Directory.GetFileSystemEntries(V_FullFolder).Length == 0)
                                        Directory.Delete(V_FullFolder, true);
                                }
                                    
                            }
                            catch (Exception) { }
                        }
                        _OpenHD();
                        //string _infoID = F_QS_InfoID();
                        //if (_infoID != "")
                        //    UpdateExpiredDate(_infoID);
                    }
                    else
                    {
                        GF.MsgBox(this, _retval, "BS-5.3.0");
                    }
                }
                else
                {
                    GF.MsgBox(this, "this Transaction is not found.", "BS-5.3.0");
                }
            }

            return _retval;
        }
        private bool _SaveHD()
        {
            if (_ValidSaveHD() == false)
                return false;

            using (var br = new BRC.PIP_T_H_Billing())
            {
                br.CompanyID = Master.Mn_CompanyID;
                br.LocationID = Master.Mn_LocationID;
                br.BillNo = txtBillNo.Text;
                br.KeyHD = (GF.IsNumeric(txt_H_KeyHD.Text) ? Convert.ToInt32(txt_H_KeyHD.Text) : 0);
                br.TenantID = txtTenantID.Text;
                br.CurrencyID = ddlCurrency.SelectedValue;
                br.IsLumpsum = chkLumpsum.Checked;
                br.BillDate = GF.CDate(txtBillDate.Text);
                br.UpdateUser = Master.Mn_EmployeeID;
                br.CancelReason = "";
                br.UpdateDate = (txt_H_UpdateDate.Text == "" ? GF.MinDate() : Convert.ToDateTime(txt_H_UpdateDate.Text));
                DataTable dtTmp = null;
                if (br.spUTL_T_BIR_Update(out dtTmp, p_H_Tipe: "12"))
                {
                    string _errMsg = dtTmp.Rows[0]["ErrMsg"] + "";
                    if (dtTmp.Rows[0]["ErrMsg"] + "" != "")
                    {
                        GF.MsgBox(this, _errMsg, "BS-5.3.0");
                    }
                    else
                    {
                        _OpenHD("", "ALL");
                    }
                }
            }

            return true;
        }

        private bool _SaveDt()
        {
            if (_ValidSaveDt() == false)
                return false;
            if (_ValidSaveHD() == false)
                return false;

            using (var br = new BRC.PIP_T_H_Billing())
            {
                br.CompanyID = Master.Mn_CompanyID;
                br.LocationID = Master.Mn_LocationID;
                br.BillNo = txtBillNo.Text;
                br.KeyHD = (GF.IsNumeric(txt_H_KeyHD.Text) ? Convert.ToInt32(txt_H_KeyHD.Text) : 0);
                br.TenantID = txtTenantID.Text;
                br.CurrencyID = ddlCurrency.SelectedValue;
                br.IsLumpsum = chkLumpsum.Checked;
                br.BillDate = GF.CDate(txtBillDate.Text);
                br.UpdateUser = Master.Mn_EmployeeID;
                br.UpdateDate = (txt_H_UpdateDate.Text == "" ? GF.MinDate() : Convert.ToDateTime(txt_H_UpdateDate.Text));
                br.CancelReason = "";
                br.SeqNo = (GF.IsNumeric(txtSeqNo.Text) ? Convert.ToInt32(txtSeqNo.Text) : 0);
                br.SuiteNo = txtSuiteNo.Text;
                br.IncomeCode = txtIncomeCode.Text;
                br.Quantity = Convert.ToDecimal(txtQty.Text);
                br.QuantityDesc = ddlQty.SelectedValue;
                br.Freq = Convert.ToDecimal(txtFreq.Text);
                br.FreqDesc = ddlFreq.SelectedValue;
                br.Price = Convert.ToDecimal(txtPrice.Text);
                br.VAT = Convert.ToDecimal(txtVAT.Text);
                br.Amount = Convert.ToDecimal(txtAmount.Text);
                br.Description1 = txtDescription1.Text;
                br.Description2 = txtDescription2.Text;
                br.Description3 = txtDescription3.Text;
                if (txtFromDate.Text != "")
                    br.PeriodeFrom = GF.CDate(txtFromDate.Text);
                else
                    br.PeriodeFrom = GF.MinDate();
                if (txtThruDate.Text != "")
                    br.PeriodeThru = GF.CDate(txtThruDate.Text);
                else
                    br.PeriodeThru = GF.MinDate();

                DataTable dtTmp;
                if (br.spUTL_T_BIR_Update(out dtTmp, p_H_Tipe: "12",
                                                 p_D_Tipe: "12"))
                {
                    //txtKeyHD.Text = Convert.ToString(br.KeyHD);
                    string _errMsg = dtTmp.Rows[0]["ErrMsg"] + "";
                    if (dtTmp.Rows[0]["ErrMsg"] + "" != "")
                    {
                        GF.MsgBox(this, _errMsg, "BS-5.3.0");
                    }
                    else
                    {
                        txtBillNo.Text = br.BillNo;
                        txt_H_KeyHD.Text = br.KeyHD + "";
                        _OpenHD("[D_2]", "ALL");
                    }
                }

            }

            return true;
        }
        
        private bool _ValidSaveHD()
        {
            string _strmsg = "";

            if (txtTenantID.Text == "")
            {
                _strmsg = "TenantID cannot empty";
            }

            if (_strmsg.Trim() != string.Empty)
                GF.MsgBox(this, _strmsg, "BS-5.3.0");
            return _strmsg.Trim() == string.Empty;
        }

        private bool _DeleteHD()
        {
            //if (_ValidDeleteHD() == false)
            //    return false;

            using (var br = new BRC.PIP_T_H_Billing())
            {
                br.CompanyID = Master.Mn_CompanyID;
                br.LocationID = Master.Mn_LocationID;
                br.BillNo = txtBillNo.Text;
                br.KeyHD = (GF.IsNumeric(txt_H_KeyHD.Text) ? Convert.ToInt32(txt_H_KeyHD.Text) : 0);
                br.UpdateUser = Master.Mn_EmployeeID;
                br.UpdateDate = (txt_H_UpdateDate.Text == "" ? GF.MinDate() : Convert.ToDateTime(txt_H_UpdateDate.Text));
                br.CancelReason = txt_ReasonforDisapproved.Value;
                DataTable dtTmp;
                if (br.spUTL_T_BIR_Update(out dtTmp, p_H_Tipe: "3",
                                         p_Path_FolderAttachments: F_Path_FolderAttachments(Context.Request.ApplicationPath)))
                {
                    string _errMsg = dtTmp.Rows[0]["ErrMsg"] + "";
                    if (dtTmp.Rows[0]["ErrMsg"] + "" != "")
                    {
                        GF.MsgBox(this, _errMsg, "BS-5.3.0");
                    }
                    else
                    {
                        _OpenHD();
                    }
                }
            }

            return true;
        }
        private bool _DeleteDt(int p_KeyDT)
        {
            using (var br = new BRC.PIP_T_H_Billing())
            {
                br.CompanyID = Master.Mn_CompanyID;
                br.LocationID = Master.Mn_LocationID;
                br.BillNo = txtBillNo.Text;
                br.KeyHD = (GF.IsNumeric(txt_H_KeyHD.Text) ? Convert.ToInt32(txt_H_KeyHD.Text) : 0);
                br.SeqNo = p_KeyDT;
                br.UpdateUser = Master.Mn_EmployeeID;
                br.UpdateDate = (txt_H_UpdateDate.Text == "" ? GF.MinDate() : Convert.ToDateTime(txt_H_UpdateDate.Text));
                DataTable dtTmp;
                if (br.spUTL_T_BIR_Update(out dtTmp, p_H_Tipe: "",
                                                 p_D_Tipe: "3"))
                {
                    string _errMsg = dtTmp.Rows[0]["ErrMsg"] + "";
                    if (dtTmp.Rows[0]["ErrMsg"] + "" != "")
                    {
                        GF.MsgBox(this, _errMsg, "BS-5.3.0");
                    }
                    else
                    {
                        _OpenHD("[D_2]", "ALL");
                    }
                }
            }

            return true;
        }
        private bool _ValidSaveDt()
        {
            string _strmsg = "";

            if (txtIncomeCode.Text == "")
                _strmsg = "Income Code cannot empty";
            else if (txtSuiteNo.Text == "")
                _strmsg = "Suite No cannot empty";
            else if (!GF.IsNumeric(txtQty.Text.Trim()))
                _strmsg = "Qty must be numeric";
            else if (Convert.ToDecimal(txtQty.Text.Trim()) < 0)
                _strmsg = "Qty must be greater than 0";
            else if (Convert.ToDecimal(txtQty.Text.Trim()) == 0 && !chkLumpsum.Checked)
                _strmsg = "Qty must be greater than 0";
            else if (!GF.IsNumeric(txtPrice.Text.Trim()))
                _strmsg = "Price must be numeric";
            else if (Convert.ToDecimal(txtPrice.Text.Trim()) < 0)
                _strmsg = "Price must be greater than 0";
            else if (Convert.ToDecimal(txtPrice.Text.Trim()) == 0 && !chkLumpsum.Checked)
                _strmsg = "Price must be greater than 0";
            else if (!GF.IsNumeric(txtFreq.Text.Trim()))
                _strmsg = "Freq must be numeric";
            else if (Convert.ToDecimal(txtFreq.Text.Trim()) < 0)
                _strmsg = "Freq must be greater than 0";
            else if (Convert.ToDecimal(txtFreq.Text.Trim()) == 0 && !chkLumpsum.Checked)
                _strmsg = "Freq must be greater than 0";
            else if (Convert.ToDecimal(txtAmount.Text.Trim()) <= 0)
                _strmsg = "Amount must be greater than 0";
            else if (txtIsUnearned.Text != "" && (txtFromDate.Text == "" || txtThruDate.Text == ""))
                _strmsg = "Please specify From & Thru Date";
            else if (txtFromDate.Text != "" && txtThruDate.Text != "" && GF.CDate(txtThruDate.Text).CompareTo(GF.CDate(txtFromDate.Text)) < 0)
                _strmsg = "Thru Date must be greater or equal than From Date";
            else if (txtIsUnearned.Text == "" && (ddlFreq.SelectedValue == "" || ddlQty.SelectedValue == "") && !chkLumpsum.Checked)
                _strmsg = "Freq & Quantity Unit must be selected";

            if (_strmsg.Trim() != string.Empty)
                GF.MsgBox(this, _strmsg, "BS-5.3.0");
            return _strmsg.Trim() == string.Empty;
        }
        private bool _Save_Att()
        {
            if (_ValidSaveHD() == false)
                return false;
            if (_ValidSave_Att() == false)
                return false;

            using (var br = new BRC.PIP_T_H_Billing())
            {
                br.CompanyID = Master.Mn_CompanyID;
                br.LocationID = Master.Mn_LocationID;
                br.BillNo = txtBillNo.Text;
                br.KeyHD = (GF.IsNumeric(txt_H_KeyHD.Text) ? Convert.ToInt32(txt_H_KeyHD.Text) : 0);
                br.TenantID = txtTenantID.Text;
                br.CurrencyID = ddlCurrency.SelectedValue;
                br.IsLumpsum = chkLumpsum.Checked;
                br.BillDate = GF.CDate(txtBillDate.Text);
                br.UpdateUser = Master.Mn_EmployeeID;
                br.CancelReason = "";
                br.UpdateDate = (txt_H_UpdateDate.Text == "" ? GF.MinDate() : Convert.ToDateTime(txt_H_UpdateDate.Text));
                string V_FileNameType = FU_H_File.PostedFile.FileName.Split('\\').Last();
                string V_FileType = V_FileNameType.Split('.').Last();
                string V_FileName = V_FileNameType.Split('.')[0];
                V_FileName = (txt_Att_FileName2.Text == "" ? V_FileName : txt_Att_FileName2.Text);
                string V_Alias = V_FileName;

                int V_FileSize = FU_H_File.PostedFile.ContentLength;
                DataTable dtTmp;
                if (br.spUTL_T_BIR_Update(out dtTmp, p_H_Tipe: "12",
                                                 p_Att_Tipe: "1",
                                                 p_Att_Type: (chkForBilling.Checked ? "BIL" : "BIR"), 
                                                 p_Att_FileName: V_FileName,
                                                 p_Att_Alias: V_Alias,
                                                 p_Att_FileType: V_FileType,
                                                 p_fu_Att_oFile1: FU_H_File,
                                                 p_Path_FolderAttachments: F_Path_FolderAttachments(Context.Request.ApplicationPath)))
                {
                    //txtKeyHD.Text = Convert.ToString(br.KeyHD);
                    string _errMsg = dtTmp.Rows[0]["ErrMsg"] + "";
                    if (dtTmp.Rows[0]["ErrMsg"] + "" != "")
                    {
                        GF.MsgBox(this, _errMsg, "BS-5.3.0");
                    }
                    else
                    {
                        txtBillNo.Text = br.BillNo;
                        F_Close_pnl_Att_AddNewRecord();
                        _OpenHD("[Att_2]", "ALL");
                    }
                }
            }

            return true;
        }

        #endregion

        #region Private Functions
        private bool _ValidSend()
        {
            using (WAL.BR.CF ocf = new WAL.BR.CF())
            {
                DataTable dt = ocf.EQueryP("SELECT TOP 1 d2.* " +
                                            "FROM PIP_T_DocumentAttachment d2 " +
                                            "WHERE d2.CompanyID = @CompanyID " +
                                            "AND d2.LocationID = @LocationID " +
                                            "AND d2.[Type] IN ('bil','bir') " +
                                            "AND d2.DocNo = @DocNo ",
                                            new SqlParameter[]
                                                        {
                                                            new SqlParameter("@CompanyID", Master.Mn_CompanyID),
                                                            new SqlParameter("@LocationID", Master.Mn_LocationID),
                                                            new SqlParameter("@DocNo", txtBillNo.Text)
                                                        },false);
                foreach (DataRow dr in dt.Rows)
                {
                    string V_PathFolder = F_Path_FolderAttachments(Context.Request.ApplicationPath) + "\\" + Master.Mn_CompanyID + "_" + Master.Mn_LocationID + "\\" + txtBillNo.Text;
                    string V_FileName = dr["FileName"] + "." + dr["FileType"];
                    if (!System.IO.File.Exists(V_PathFolder + "\\" + V_FileName))
                    {
                        GF.MsgBox(this, "Cannot find " + (V_PathFolder + "\\" + V_FileName), "BS-5.3.0");
                        return false;
                    }
                }
            }

            return true;
        }
        //private void UpdateExpiredDate(string p_ID)
        //{
        //    using (var si = new WAL.BR.SysWebInfo())
        //    {
        //        si.ID = p_ID;
        //        if (si.SelectOne().Rows.Count > 0)
        //        {
        //            si.ExpiredDate = si.UpdateDate.AddDays(-1);
        //            si.UpdateExpiredDateByID();
        //        }
        //    }
        //}
        private string F_GetUserType_Active_Max(string p_H_KeyHD)
        {
            string _retval = "";

            using (var ocf = new WAL.BR.CF())
            {
                try
                {
                    _retval = Convert.ToString(ocf.EQueryP("SELECT TOP 1 x.UserType " +
                                                           "FROM F_UTL_M_WorkFlow (@p_AppID, '1', @p_KeyHD, '', '1',2) x " +
                                                           "WHERE x.IsActiveC = 1 " +
                                                           "ORDER BY x.SeqNo DESC ",
                                                           new SqlParameter[]
                                                           {
                                                               new SqlParameter("@p_KeyHD", (GF.IsNumeric(p_H_KeyHD) ? Convert.ToDecimal(p_H_KeyHD) : 0)),
                                                               new SqlParameter("@p_AppID", PB.AppID)
                                                           }).Rows[0]["UserType"]);
                }
                catch (Exception e) { }
            }

            return _retval;
        }
        private void F_OpenIncome()
        {
            using (var br = new BRC.THD_M_H_Income() { IncomeCode = txtIncomeCode.Text })
            {
                br.CompanyID = Master.Mn_CompanyID;
                br.LocationID = Master.Mn_LocationID;
                if (br.SelectOne(Condition: "tenantid='" + txtTenantID.Text + "' and h.isbilling=1 and h.isjo=0" +
                                            " AND (EXISTS (SELECT * FROM SysWebUserUserGroup swu WHERE swu.UserID='" + Master.Mn_EmployeeID + "' AND swu.UserGroupID='administrator') " +
                                            "     OR " +
                                            "     EXISTS (SELECT * FROM SysWebUserProfit swp WHERE swp.UserID='" + Master.Mn_EmployeeID + "' AND AppID='" + PB.AppID + "' AND ProfitCenterNo='*ALL') " +
                                            "     OR " +
                                            "     EXISTS (SELECT * FROM SysWebUserProfit swp WHERE swp.UserID='" + Master.Mn_EmployeeID + "' AND AppID='" + PB.AppID + "' AND (swp.ProfitCenterNo=h.CTCredit OR swp.ProfitCenterNo=h.CTDebit)) " +
                                            "     OR " +
                                            "     EXISTS (SELECT * FROM M_HRD_Employee AS mhe WHERE mhe.EmployeeID='" + Master.Mn_EmployeeID + "' AND (mhe.ProfitCenterNo=h.CTCredit OR mhe.ProfitCenterNo=h.CTDebit)) " +
                                            "     )").Rows.Count > 0)
                {
                    if (br.IsUnearned && chkLumpsum.Checked)
                    {
                        GF.MsgBox(this, "Cannot choose this income code for lumpsum billing", "BS-5.3.0");
                        txtIncomeCode.Text = "";
                        return;
                    }
                    txtIncomeCode.Text = br.IncomeCode;
                    txtIncomeDesc.Text = br.Description;
                    txtDescription1.Text = br.Description;
                    if (F_IsCasualLeasing(txtIncomeCode.Text))
                    {
                        chkLumpsum.Checked = false;
                        txtFromDate.ReadOnly = txtThruDate.ReadOnly = false;
                        txtQty.ReadOnly = txtPrice.ReadOnly = txtFreq.ReadOnly = true;
                        txtAmount.ReadOnly = false;
                        ddlQty.Enabled = ddlFreq.Enabled = false;
                        lBtnSuiteNo.Attributes.Add("onClick", GF.JSOpenSearchList_2("119", "Master Suite", txtSuiteNo.ClientID, false, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str, true, 0, "1000", "600"));
                        txtSuiteNo.Attributes.Add("onKeyDown", GF.JSOpenSearchList_2("119", "Master Suite", txtSuiteNo.ClientID, true, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str, true, 0, "1000", "600"));
                    }
                    else
                    {
                        txtFromDate.ReadOnly = txtThruDate.ReadOnly = !br.IsUnearned;
                        txtQty.ReadOnly = txtPrice.ReadOnly = txtFreq.ReadOnly = chkLumpsum.Checked;
                        //txtAmount.ReadOnly = !chkLumpsum.Checked;
                        ddlQty.Enabled = ddlFreq.Enabled = !chkLumpsum.Checked;
                        lBtnSuiteNo.Attributes.Add("onClick", GF.JSOpenSearchList_2("118", "Master Suite", txtSuiteNo.ClientID, false, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + txtTenantID.ClientID, true, 0, "1000", "600"));
                        txtSuiteNo.Attributes.Add("onKeyDown", GF.JSOpenSearchList_2("118", "Master Suite", txtSuiteNo.ClientID, true, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str + ";" + txtTenantID.ClientID, true, 0, "1000", "600"));
                    }
                    if (br.IsUnearned)
                        txtFromDate.Text = txtThruDate.Text = "";
                    txtIsUnearned.Text = (br.IsUnearned ? "Y" : "");
                    using (var br1=new WAL.BR.CF())
                    {
                        DataTable dt = br1.EQuery("SELECT * FROM THD_M_D_Income WHERE CompanyID = @CompanyID And LocationID = @LocationID And TenantID = @TenantID And IncomeCode = @IncomeCode",
                        "@CompanyID=" + Master.Mn_CompanyID + GF.Str2 +
                        "@LocationID=" + Master.Mn_LocationID + GF.Str2 +
                        "@TenantID=" + txtTenantID.Text + GF.Str2 +
                        "@IncomeCode=" + txtIncomeCode.Text);
                        if (dt.Rows.Count > 0)
                        {
                            txtVAT.Text = Convert.ToDecimal(dt.Rows[0]["VAT"]).ToString(GF.FormatCurrency2);
                        }
                    }
                }
                else
                {
                    txtIncomeCode.Text = txtIncomeDesc.Text = txtVAT.Text = txtIsUnearned.Text = txtDescription1.Text = "";
                }
                txtFreq.Text = txtPrice.Text = txtAmount.Text = txtQty.Text = "0.00";
                txtDescription2.Text = txtDescription3.Text = txtSuiteNo.Text = txtFromDate.Text = txtThruDate.Text = "";
            }
        }
        private void F_OpenTenant()
        {
            using (var br = new BRC.THD_M_GeneralInformation() { CompanyID = Master.Mn_CompanyID, LocationID = Master.Mn_LocationID, TenantID = txtTenantID.Text })
            {
                if (br.SelectOne().Rows.Count > 0)
                {
                    txtTenantID.Text = br.TenantID;
                    txtTenantName.Text = (Master.Mn_LocationID == "L01" && Master.Mn_CompanyID != _companyIdKTA && !br.IsExhibition ? br.TradeName : br.TenantName);
                    txtTenantName.ToolTip = (Master.Mn_LocationID == "L01" && Master.Mn_CompanyID != _companyIdKTA && !br.IsExhibition ? br.TenantName : br.TradeName);
                }
                else
                {
                    txtTenantID.Text = string.Empty;
                    txtTenantName.Text = txtTenantName.ToolTip = string.Empty;
                }
                GF.Focus(this, txtTenantID.ClientID);
            }
        }
        private void F_OpenSuite()
        {
            if (F_IsCasualLeasing(txtIncomeCode.Text))
            {
                using (var br=new WAL.BR.CF())
                {
                    DataTable dt = br.EQuery("SELECT D.* FROM thd_m_d_suitebir d, thd_m_h_suitebir h WHERE d.id=h.id and h.isactive=1 " +
                    "and h.companyid=@companyid and h.locationid=@locationid and d.suiteno=@suiteno",
                    "@companyid=" + Master.Mn_CompanyID + GF.Str2 +
                    "@locationid=" + Master.Mn_LocationID + GF.Str2 +
                    "@suiteno=" + txtSuiteNo.Text);
                    if (dt.Rows.Count > 0)
                    {
                        decimal _qty = GF.GetDecimal(dt.Rows[0]["LettableArea" + GF.CDate(txtBillDate.Text).Month]);
                        txtSuiteNo.Text = dt.Rows[0]["SuiteNo"] + "";
                        if (_qty != 0)
                            txtQty.Text = _qty.ToString(GF.FormatCurrency2);
                        else
                            txtQty.Text = GF.GetDecimal(dt.Rows[0]["LettableArea"]).ToString(GF.FormatCurrency2);
                    }
                    else
                    {
                        txtSuiteNo.Text = "";
                        txtQty.Text = "0.00";
                    }
                }
            }
            else
            {
                using (var br = new BRC.THD_M_AgreementInformation())
                {
                    br.CompanyID = Master.Mn_CompanyID;
                    br.LocationID = Master.Mn_LocationID;
                    br.TenantID = txtTenantID.Text;
                    br.SuiteNo = txtSuiteNo.Text;
                    if (br.SelectOne().Rows.Count > 0)
                        txtSuiteNo.Text = br.SuiteNo;
                    else
                        txtSuiteNo.Text = string.Empty;
                }
            }

        }
        private bool F_IsCasualLeasing(string p_IncomeCode)
        {
            string _IncomeCode = "";
            using (var br=new WAL.BR.SysWebCommonValue())
            {
                br.AppID = "UTL";
                br.CommonGroup = "CasualLeasing";
                br.ID = "CLE";
                if (br.SelectOneByCommonGroupID().Rows.Count > 0)
                    _IncomeCode = br.Description;
            }
            return p_IncomeCode != "" && p_IncomeCode == _IncomeCode && _IncomeCode != "";
        }
        private bool _ValidAddNewRecord()
        {
            string _strmsg = "";

            if (txtTenantID.Text == "")
                _strmsg = "Tenant ID cannot empty";
            else if (ddlCurrency.SelectedValue == "")
                _strmsg = "Currency cannot empty";
            if (_strmsg.Trim() != string.Empty)
                GF.MsgBox(this, _strmsg, "BS-5.3.0");
            return _strmsg.Trim() == string.Empty;
        }
        private void F_ON_OFF(string p_StrType, bool p_Value)
        {
            if (p_StrType.Contains("[D_1]") == p_Value)
            {
                F_Close_pnlAddNewRecord();
            }

            if (p_StrType.Contains("[D_2]") == p_Value)
            {
                _PrepareScreenDt();
            }

            if (p_StrType.Contains("[Att_1]") == p_Value)
            {
                F_Close_pnl_Att_AddNewRecord();
            }

            if (p_StrType.Contains("[Att_2]") == p_Value)
            {
                _PrepareScreen_Att();
            }

        }
        public static string F_GetUserType(string p_MenuID)
        {
            string _retval = "";

            using (var ocf = new WAL.BR.CF())
            {
                try
                {
                    _retval = Convert.ToString(ocf.EQuery("SELECT " +
                                                          "swcv.ID " +
                                                          "FROM SysWebCommonValue swcv CROSS APPLY dbo.SplitStringConvertToTable(swcv.[Description],';') aa " +
                                                          "WHERE swcv.AppID = '" + PB.AppID + "' AND aa.ID=2 " +
                                                          "AND swcv.CommonGroup = 'MMFUTLWF' " +
                                                          "AND aa.val = '" + p_MenuID + "' " +
                                                          "").Rows[0]["ID"]);
                }
                catch (Exception e) { }
            }

            return _retval;
        }
        private void F_SetEnabledHeader(string str, bool p_Value)
        {
            if (str.Contains("1"))
            {
                ddlCurrency.Enabled = p_Value && Convert.ToInt16(lblTotItems.Text) == 0;
                chkLumpsum.Enabled = ( p_Value && Convert.ToInt16(lblTotItems.Text) == 0);
            }

            if (str.Contains("2"))
            {
                txtTenantID.ReadOnly = !(p_Value && Convert.ToInt16(lblTotItems.Text) == 0);
            }

        }
        private string F_ListEmailAddress_Next_UserType(string p_Current_UserType, decimal p_KeyHD)
        {
            string _retval = "";

            using (WAL.BR.CF ocf = new WAL.BR.CF())
            {
                try
                {
                    _retval = Convert.ToString(ocf.EQueryP("SELECT * INTO #F_CNDN_M_WorkFlow_Tmp1 FROM dbo.F_UTL_M_WorkFlow(@p_AppID, '1', @p_KeyHD, '', '1',2) f " +
                                                            " " +
                                                            "SELECT " +
                                                            "ISNULL(  " +
                                                            "STUFF( " +
                                                            "( " +
                                                            "	SELECT ', ' + mhe.EmailAddress  " +
                                                            "	FROM " +
                                                            "	(  " +
                                                            "		SELECT ss.Val AS EmployeeID " +
                                                            "		FROM " +
                                                            "		(   " +
                                                            "			SELECT TOP 1 wf2.ListEmployeeID " +
                                                            "			FROM #F_CNDN_M_WorkFlow_Tmp1 wf " +
                                                            "			INNER JOIN #F_CNDN_M_WorkFlow_Tmp1 wf2 ON wf2.SeqNo > wf.SeqNo " +
                                                            "			WHERE wf.UserType = @p_Current_UserType " +
                                                            "           AND wf2.IsActiveC = 1 " +
                                                            "			ORDER BY wf2.SeqNo " +
                                                            "		) x " +
                                                            "		CROSS APPLY dbo.SplitStringConvertToTable(x.ListEmployeeID, ';') ss " +
                                                            "		WHERE ss.val <> '' " +
                                                            "	) x " +
                                                            "	INNER JOIN M_HRD_Employee mhe ON mhe.EmployeeID = x.EmployeeID " +
                                                            "	FOR XML PATH('') " +
                                                            ")   " +
                                                            ", 1, 2, '') " +
                                                            ", '') AS ListEmailAddress " +
                                                            " " +
                                                            "DROP TABLE #F_CNDN_M_WorkFlow_Tmp1 ",
                                                            new SqlParameter[]
                                                            {
                                                                new SqlParameter("@p_KeyHD", p_KeyHD),
                                                                new SqlParameter("@p_Current_UserType", lbl_Current_UserType.Text),
                                                                new SqlParameter("@p_AppID", PB.AppID)
                                                            }).Rows[0]["ListEmailAddress"]);

                }
                catch (Exception e)
                {
                    _retval = "";
                }
            }

            return _retval;
        }
        private void _Back()
        {
            if (lbl_Current_UserType.Text == "USER" || TextBox6.Text == "VIEWBIR")
            {
                TextBox6.Text = txt_S_TenantIDStart.Text = txt_S_TenantIDEnd.Text = "";
                lbtn_CancelVoid_Click(null, null);
            }
            //else if (lbl_Current_UserType.Text == "VIEWBIR")
            //{
            //    string V_Path_FolerView = (GF.Path_FolerView() + "\\" + Master.Mn_EmployeeID);

            //    try
            //    {
            //        if (Directory.Exists(V_Path_FolerView))
            //        {
            //            Directory.Delete(V_Path_FolerView, true);
            //        }
            //        Directory.CreateDirectory(V_Path_FolerView);
            //    }
            //    catch (Exception) { }

            //    try
            //    {
            //        string V_FileName = "[Page]_BIR_IT" + "_" + PB.AppID + "_" + DateTime.Now.AddSeconds(PB.ReportExpiresInSeconds).ToString(GF.FormatDateTime2);
            //        string V_FileNameType = V_Path_FolerView + "\\" + V_FileName + "." + "txt";
            //        using (StreamWriter sw = File.CreateText(V_FileNameType))
            //        {
            //            sw.Write(lbl_Description1_Tmp.Text + "_" + GF.Str4 + "_" + lbl_Description2_Tmp.Text);
            //            sw.Flush();
            //            sw.Close();
            //        }

            //        if (File.Exists(V_FileNameType))
            //        {
            //            Response.Redirect("R_ViewInvoiceBIR.aspx?mid=" + F_QS_MenuID() + GF.Str2 + V_FileName);
            //        }
            //    }
            //    catch (Exception) { }
            //}
            else
            {
                txt_ReasonforDisapproved.Value = "";
                mv_1.SetActiveView((View)mv_1.FindControl("Vw_mv_1_Approval"));
                mv_0.SetActiveView((View)mv_0.FindControl("Vw_mv_0_Blank"));
                UpdateViewGridApproval();
                Master.TB_VisibleToolbar(false);
                tr_statusapproval.Visible = lbl_Current_UserType.Text.ToUpper() != "USER";
            }
            
        }
        private void SetDatePicker()
        {
            string DatePickerID = "";
            if (lbl_Current_UserType.Text.ToUpper() == "USER")
            {
                DatePickerID += (txtFromDate.ClientID + ";" +
                                txtThruDate.ClientID +
                                (GFC.LocationID_KL().Contains(Master.Mn_LocationID) ? ";" + txtBillDate.ClientID : ""));
            }
            else
            {
                DatePickerID += (txt_S_BillStartDate.ClientID + ";" +
                                txt_S_BillEndDate.ClientID + ";" +
                                txtPeriodApproval.ClientID);
            }
            GF.RegisterDatePicker_2(this.Page, DatePickerID);
        }
        private void F_LoadDDLPart()
        {
            ddlPart.Items.Clear();
            ddlPart.Items.Add(new ListItem("Detail", "0"));
            ddlPart.Items.Add(new ListItem("Attachments", "1"));
        }
        private bool _ValidSave_Att()
        {
            string _strmsg = "";

            if (Master.Mn_CompanyID == "")
            {
                _strmsg = "CompanyID cannot empty";
            }
            else if (Master.Mn_LocationID == "")
            {
                _strmsg = "LocationID cannot empty";
            }

            if (_strmsg == "")
            {
                string V_FileNameType = FU_H_File.PostedFile.FileName.Split('\\').Last();
                string V_FileType = V_FileNameType.Split('.').Last();
                string V_FileName = V_FileNameType.Split('.')[0];
                V_FileName = (txt_Att_FileName2.Text == "" ? V_FileName : txt_Att_FileName2.Text);

                //string V_C_FileTypeList = "(JPG)(JPEG)(BMP)";

                int V_C_TotalFileSize_InMB = Convert.ToInt32(lbl_C_TotalFileSize_InMB.Text);
                int V_C_TotalFileSize = (V_C_TotalFileSize_InMB * 1048576); //1GB (1073741824) 1MB(1048576) 11MB(11534336)

                int V_File_ContentLength = FU_H_File.PostedFile.ContentLength;

                if (V_FileType.Length == 0)
                {
                    _strmsg = "Attachment File cannot empty";
                }
                //else if (!FileTypeList.Contains("(" + FileType[FileType.Length - 1].ToUpper() + ")"))
                //{
                //    _strmsg = "File Type must be " + FileTypeList;
                //}
                else if (V_FileName.Length > 60)
                {
                    _strmsg = "File Name must be equal or less than 60 character.";
                }

                if (_strmsg == "")
                {
                    //int V_C_FileSize_InMB = Convert.ToInt32(lbl_C_TotalFileSize_InMB.Text);
                    //int V_C_FileSize = (V_C_FileSize_InMB * 1048576); //1GB (1073741824) 1MB(1048576) 11MB(11534336)
                    long V_TotalFileSize = 0;
                    string pathupload = PB.Path_WebFolder1 + Context.Request.ApplicationPath.Replace("/", "") + "\\PIP_T_H_Billing\\" + Master.Mn_CompanyID + "_" + Master.Mn_LocationID + "\\" + GF.Left(txtBillNo.Text, 6) + "\\";
                    using (var ocf = new WAL.BR.CF())
                    {
                        foreach (DataRow dr in ocf.EQueryP(
@"SELECT D2.*
FROM PIP_T_DocumentAttachment d2 JOIN PIP_T_H_Billing h2 ON d2.CompanyID=h2.CompanyID AND d2.LocationID=h2.LocationID AND d2.DocNo=h2.BillNo
WHERE d2.Type='BIL' AND h2.KeyHD = @KeyHD
", new SqlParameter[] 
 { 
    new SqlParameter("@KeyHD", (GF.IsNumeric(txt_H_KeyHD.Text) ? Convert.ToInt32(txt_H_KeyHD.Text) : 0)) 
 }).Rows)
                        {
                            if (System.IO.File.Exists(pathupload + dr["FileName"] + "." + dr["FileType"]))
                                V_TotalFileSize += new System.IO.FileInfo(pathupload + dr["FileName"] + "." + dr["FileType"]).Length;

                        }
                        V_TotalFileSize += V_File_ContentLength;
                        if (V_TotalFileSize > V_C_TotalFileSize && chkForBilling.Checked)
                        {
                            _strmsg = "Total File Size must be equal or less than " + V_C_TotalFileSize_InMB.ToString(GF.FormatCurrency0) + " MB.";
                        }

                    }


                }
            }


            if (_strmsg.Trim() != string.Empty)
                GF.MsgBox(this, _strmsg, "BS-5.3.0");
            return _strmsg.Trim() == string.Empty;
        }
        private void F_Open_pnl_Att_AddNewRecord()
        {
            lbtn_Att_Addnewrecord.Visible = false;
            GF.ShowPanel(ref pnl_Att_AddNewRecord, true);
        }
        private void F_Close_pnl_Att_AddNewRecord()
        {
            lbtn_Att_Addnewrecord.Visible = true;
            GF.ShowPanel(ref pnl_Att_AddNewRecord, false);
        }
        private void F_Close_pnlAddNewRecord()
        {
            F_SetEnabledHeader("12345", true);
            lbtn_D_Addnewrecord.Visible = true;
            GF.ShowPanel(ref pnlAddNewRecord, false);
        }

        private void F_Open_pnl_Search()
        {
            lbtn_Search.Visible = false;
            GF.ShowPanel(ref pnl_Search, true);
        }
        private void F_Close_pnl_Search()
        {
            lbtn_Search.Visible = true;
            GF.ShowPanel(ref pnl_Search, false);
        }
        private void F_LoadDDLFreq()
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt1 = br.ExecuteSQL("select distinct freq from utl_m_bir_freq");
                ddlFreq.Items.Clear();
                ddlFreq.Items.Add(new ListItem(string.Empty, string.Empty));
                foreach (DataRow row in dt1.Rows)
                    ddlFreq.Items.Add(new ListItem(row["freq"].ToString(), row["freq"].ToString()));
            }
        }
        private void F_LoadDDLQuantity()
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt1 = br.ExecuteSQL("select distinct quantity from utl_m_bir_quantity");
                ddlQty.Items.Clear();
                ddlQty.Items.Add(new ListItem(string.Empty, string.Empty));
                foreach (DataRow row in dt1.Rows)
                    ddlQty.Items.Add(new ListItem(row["quantity"].ToString(), row["quantity"].ToString()));
            }
        }
        private void F_LoadCurrency()
        {
            using (var br = new WAL.BR.CF())
            {
                DataTable dt1 = br.ExecuteSQL("select * from m_currency");
                ddlCurrency.Items.Clear();
                ddlCurrency.Items.Add(new ListItem(string.Empty, string.Empty));
                foreach (DataRow row in dt1.Rows)
                    ddlCurrency.Items.Add(new ListItem(row["CurrencyID"].ToString(), row["CurrencyID"].ToString()));
            }
        }
        private void F_LoadSort(ref DropDownList p_ddl_sort)
        {
            using (var ocf = new WAL.BR.CF())
            {
                p_ddl_sort.DataTextField = "Sort_Text";
                p_ddl_sort.DataValueField = "Sort_Value";
                p_ddl_sort.DataSource = ocf.EQuery(
"SELECT '' AS [Sort_Value], 'None' AS [Sort_Text] " +
"UNION ALL " +
"SELECT 'a.BillNo ' AS [Sort_Value], 'Bill No' AS [Sort_Text] " +
"UNION ALL " +
"SELECT 'a.[BillDate] ' AS [Sort_Value], 'Bill Date' AS [Sort_Text] " +
"UNION ALL " +
"SELECT 'a.TenantID ' AS [Sort_Value], 'Tenant ID' AS [Sort_Text]").DefaultView;
                p_ddl_sort.DataBind();
            }
        }
        private void _PrepareScreen_S(string strtype = "")
        {
            txt_S_BillNoStart.Text = "";
            txt_S_BillNoStart.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");
            txt_S_BillNoEnd.Text = "";
            txt_S_BillNoEnd.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");

            if (lbl_Current_UserType.Text == "VIEWBIR")
            {
                txt_S_BillStartDate.Text = GFC.PeriodMonthOrYear(GF.DBSDatetime(), "EarlyMonth");
                txt_S_BillEndDate.Text = GFC.PeriodMonthOrYear(GF.DBSDatetime());
            }
            else
            {
                txt_S_BillStartDate.Text = txt_S_BillEndDate.Text = "";
            }
            txt_S_BillStartDate.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");
            txt_S_BillEndDate.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");

            txt_S_ARBillNoStart.Text = "";
            txt_S_ARBillNoStart.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");
            txt_S_ARBillNoEnd.Text = "";
            txt_S_ARBillNoEnd.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");

            txt_S_ARBillStartDate.Text = "";
            txt_S_ARBillStartDate.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");
            txt_S_ARBillEndDate.Text = "";
            txt_S_ARBillEndDate.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");

            txt_S_InvNoStart.Text = "";
            txt_S_InvNoStart.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");
            txt_S_InvNoEnd.Text = "";
            txt_S_InvNoEnd.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");

            txt_S_InvStartDate.Text = "";
            txt_S_InvStartDate.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");
            txt_S_InvEndDate.Text = "";
            txt_S_InvEndDate.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");

            txt_S_TenantIDStart.Text = "";
            txt_S_TenantIDStart.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");
            txt_S_TenantIDEnd.Text = "";
            txt_S_TenantIDEnd.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");

            if (TextBox6.Text == "VIEWBIR")
            {
                txt_S_TenantIDStart.Text = txt_S_TenantIDEnd.Text = txtTenantID.Text;
            }
            F_LoadSort(ref ddl_S_Sort);
            try
            {
                ddl_S_Sort.SelectedIndex = 1;
            }
            catch (Exception e)
            {
                GF.SelectListItem(ref ddl_S_Sort, "");
            }
            ddl_S_Sort.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");
            try
            {
                ddl_S_Sort_AD.SelectedIndex = 1;
            }
            catch (Exception e) { }
            ddl_S_Sort_AD.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lBtn_S_Apply.ClientID.Replace("ContentPlaceHolder1_", "ctl00$ContentPlaceHolder1$") + "');");

            div_approval.Visible = ddlStatusApproval.SelectedValue != "1";
            if (strtype.Contains("1") == false)
            {
                UpdateViewGridApproval();
            }
        }
        private string F_QS_InfoID_PE()
        {
            string _retval = "";

            try
            {
                _retval = Convert.ToString(Request.QueryString["InfoID"]);
            }
            catch (Exception e) { }

            _retval = (_retval == null ? "" : _retval);

            return _retval;
        }
        private string F_QS_MenuID()
        {
            string _retval = "";

            try
            {
                string[] V_QS = GF.SplitStr(Convert.ToString(Request.QueryString["mid"]), GF.Str2);
                _retval = V_QS[0];
            }
            catch (Exception e) { }

            return _retval;
        }
        private string F_QS_InfoID()
        {
            string _retval = "";

            try
            {
                string[] V_QS = GF.SplitStr(Convert.ToString(Request.QueryString["mid"]), GF.Str2);
                _retval = V_QS[1];
            }
            catch (Exception e) { }

            return _retval;
        }
        private void F_Open_pnlAddNewRecord()
        {
            lbtn_D_Addnewrecord.Visible = false;
            GF.ShowPanel(ref pnlAddNewRecord, true);
        }
        private void RefreshDescription(TextBox _txt)
        {
            string _rsl = "";
            try
            {
                decimal _x;
                decimal.TryParse(txtFreq.Text, out _x);
                txtFreq.Text = _x.ToString(GF.FormatCurrency2);
                decimal.TryParse(txtQty.Text, out _x);
                txtQty.Text = _x.ToString(GF.FormatCurrency2);
                decimal.TryParse(txtPrice.Text, out _x);
                txtPrice.Text = _x.ToString(GF.F_FormatCurrency(ddlCurrency.SelectedValue,
                                                                Master.Mn_HomeCurrencyID,
                                                                Convert.ToInt32(Master.Mn_HomeDecimal),
                                                                Master.Mn_ForeignCurrencyID,
                                                                Convert.ToInt32(Master.Mn_ForeignDecimal)));
                decimal.TryParse(txtAmount.Text, out _x);
                txtAmount.Text = _x.ToString(GF.F_FormatCurrency(ddlCurrency.SelectedValue,
                                                                Master.Mn_HomeCurrencyID,
                                                                Convert.ToInt32(Master.Mn_HomeDecimal),
                                                                Master.Mn_ForeignCurrencyID,
                                                                Convert.ToInt32(Master.Mn_ForeignDecimal)));
                int days = 0;
                bool _isCLE = F_IsCasualLeasing(txtIncomeCode.Text);
                if (txtFromDate.Text != "" && txtThruDate.Text != "")
                {
                    txtDescription3.Text = "";
                    //days = (int)DateAndTime.DateDiff(DateInterval.Day, GF.CDate(txtFromDate.Text), GF.CDate(txtThruDate.Text)) + 1;
                    days = GFC.DateDiff(GF.CDate(txtFromDate.Text), GF.CDate(txtThruDate.Text), GFC.DateInterval.Day) + 1;
                    int months = days / 30;
                    days = days % 30;
                    decimal freq = Convert.ToDecimal(months) + Convert.ToDecimal(days / 30.00);
                    //DateTime date1 = GF.CDate(txtFromDate.Text); // First date
                    //DateTime date2 = GF.CDate(txtThruDate.Text); // Second date
                    //// Ensure date1 is the earlier date
                    //if (date1 > date2)
                    //{
                    //    DateTime temp = date1;
                    //    date1 = date2;
                    //    date2 = temp;
                    //}
                    //// Calculate the difference in years and months
                    //int years = date2.Year - date1.Year;
                    //int months = date2.Month - date1.Month;
                    //days = date2.Day - date1.Day;
                    //// Adjust for negative months or days
                    //if (days < 0)
                    //{
                    //    months--;
                    //    days += DateTime.DaysInMonth(date2.Year, date2.Month);
                    //}
                    //if (months < 0)
                    //{
                    //    years--;
                    //    months += 12;
                    //}
                    //// Total months
                    //totalMonths = years * 12 + months;

                    txtDescription3.Text = "PERIOD : " + GF.CDate(txtFromDate.Text).ToString(GF.FormatDate5) + " - " + GF.CDate(txtThruDate.Text).ToString(GF.FormatDate5);
                    if ((!chkLumpsum.Checked && "txtFromDate;txtThruDate".IndexOf(_txt.ID) != -1) || _isCLE)
                        //txtFreq.Text = (totalMonths + days / 30.00).ToString(GF.FormatCurrency2);
                        txtFreq.Text = freq.ToString(GF.FormatCurrency2);

                    if (!_isCLE && Convert.ToDecimal(txtQty.Text) == 0 && !chkLumpsum.Checked)
                        txtQty.Text = "1";

                    if (Convert.ToDecimal(txtPrice.Text) == 0 || _isCLE)
                        txtPrice.Text = (Convert.ToDecimal(txtAmount.Text) /
                            ((Convert.ToDecimal(txtQty.Text) == 0 ? 1 : Convert.ToDecimal(txtQty.Text)) *
                            (Convert.ToDecimal(txtFreq.Text) == 0 ? 1 : Convert.ToDecimal(txtFreq.Text)))).ToString(GF.F_FormatCurrency(ddlCurrency.SelectedValue,
                                                                                                                                Master.Mn_HomeCurrencyID,
                                                                                                                                Convert.ToInt32(Master.Mn_HomeDecimal),
                                                                                                                                Master.Mn_ForeignCurrencyID,
                                                                                                                                Convert.ToInt32(Master.Mn_ForeignDecimal)));
                }
                if (!chkLumpsum.Checked)
                {
                    if (Convert.ToDecimal(txtFreq.Text) != 0)
                        _rsl += (txtFreq.Text + " " + ddlFreq.SelectedValue);
                    if (Convert.ToDecimal(txtQty.Text) != 0)
                        _rsl += (" X " + txtQty.Text + " " + ddlQty.SelectedValue);
                    if (Convert.ToDecimal(txtPrice.Text) != 0)
                        _rsl += (" X " + ddlCurrency.SelectedValue + " " + txtPrice.Text);
                    if (!_isCLE && Convert.ToDecimal(txtAmount.Text) == 0)
                        txtAmount.Text = (Convert.ToDecimal(txtQty.Text) *
                                          Convert.ToDecimal(txtPrice.Text) *
                                          Convert.ToDecimal(txtFreq.Text)).ToString(GF.F_FormatCurrency(ddlCurrency.SelectedValue,
                                                                                                        Master.Mn_HomeCurrencyID,
                                                                                                        Convert.ToInt32(Master.Mn_HomeDecimal),
                                                                                                        Master.Mn_ForeignCurrencyID,
                                                                                                        Convert.ToInt32(Master.Mn_ForeignDecimal)));
                    txtDescription2.Text = _rsl;
                }
                else
                    txtAmount.Text = Convert.ToDecimal(txtAmount.Text).ToString(GF.F_FormatCurrency(ddlCurrency.SelectedValue,
                                                                                                    Master.Mn_HomeCurrencyID,
                                                                                                    Convert.ToInt32(Master.Mn_HomeDecimal),
                                                                                                    Master.Mn_ForeignCurrencyID,
                                                                                                    Convert.ToInt32(Master.Mn_ForeignDecimal)));

            }
            catch (Exception) {}
        }
        private void _Report()
        {
            using (var br = new BRC.PIP_T_H_Billing())
            {
                br.CompanyID = Master.Mn_CompanyID;
                br.LocationID = Master.Mn_LocationID;
                br.UpdateUser = Master.Mn_EmployeeID;
                br.IncomeCode = "";
                br.Flag = "B";
                string V_FileNameType =
                    br._ExcelListingBIR(
                    v_TenantIDFrom: txt_S_TenantIDStart.Text,
                    v_TenantIDThru: txt_S_TenantIDEnd.Text,
                    v_BillNoFrom: txt_S_ARBillNoStart.Text,
                    v_BillNoThru: txt_S_ARBillNoEnd.Text,
                    v_Period: (txt_S_ARBillStartDate.Text != "" ? GF.CDate(txt_S_ARBillStartDate.Text).ToString(GF.FormatYearMonth) : GF.CDate(GFC.PeriodMonthOrYear(GF.DBSDatetime(), "EarlyMonth")).ToString(GF.FormatYearMonth)),
                    v_UserID: "",
                    v_BillDateFrom: (txt_S_ARBillStartDate.Text != "" ? GF.CDate(txt_S_ARBillStartDate.Text).ToString(GF.FormatDate4) : GF.CDate(GFC.PeriodMonthOrYear(GF.DBSDatetime(), "EarlyMonth")).ToString(GF.FormatDate4)),
                    v_BillDateThru: (txt_S_ARBillEndDate.Text != "" ? GF.CDate(txt_S_ARBillEndDate.Text).ToString(GF.FormatDate4) : GF.CDate(GFC.PeriodMonthOrYear(GF.DBSDatetime())).ToString(GF.FormatDate4)),
                    v_IncludeCancel: "0",
                    v_OrderBy: "1",
                    v_Judul1: "LISTING BIR",
                    v_Judul2: "",
                    v_Judul3: "AS OF " + (txt_S_ARBillStartDate.Text != "" ? GF.CDate(txt_S_ARBillStartDate.Text).ToString(GF.FormatYearMonth4) : GF.CDate(GFC.PeriodMonthOrYear(GF.DBSDatetime(), "EarlyMonth")).ToString(GF.FormatYearMonth4)));

                if (V_FileNameType != "")
                    ClientScript.RegisterStartupScript(this.GetType(), "script", "openWindow('" + (GF.Url_FolerView() + "/" + Master.Mn_EmployeeID + "/" + V_FileNameType) + "', '_blank',800,600,'yes','yes');", true);
                else
                    GF.MsgBox(this, "No Data..", "BS-5.3.0");
            }

        }
        #endregion

        #region DataGrid Command Center
        private void UpdateViewGridApproval()
        {
            txtMaxRecord.Text = (GF.IsNumeric(txtMaxRecord.Text) ? txtMaxRecord.Text : "50");
            //Master.TB_VisibleToolbar(false);
            using (WAL.BR.CF ocf = new WAL.BR.CF())
            {
                string V_ParamField = "";
                string V_ParamOrder = "";
                /*
                 @p_S_ParamField
                 BillNoStart;BillNoEnd;BillStartDate;BillEndDate;ARBillNoStart;ARBillNoEnd;ARBillStartDate;ARBillEndDate;
                 InvNoStart;InvNoEnd;InvStartDate;InvEndDate;TenantIDStart;TenantIDEnd;PeriodAppr
                 @p_S_ParamOrder
                 BillDate|DESC
                 */

                V_ParamField += (txt_S_BillNoStart.Text + ";");
                V_ParamField += (txt_S_BillNoEnd.Text + ";");
                V_ParamField += ((txt_S_BillStartDate.Text != "" ? GF.CDate(txt_S_BillStartDate.Text).ToString(GF.FormatDate4) : "") + ";");
                V_ParamField += ((txt_S_BillEndDate.Text != "" ? GF.CDate(txt_S_BillEndDate.Text).ToString(GF.FormatDate4) : "") + ";");
                V_ParamField += (txt_S_ARBillNoStart.Text + ";");
                V_ParamField += (txt_S_ARBillNoEnd.Text + ";");
                V_ParamField += ((txt_S_ARBillStartDate.Text != "" ? GF.CDate(txt_S_ARBillStartDate.Text).ToString(GF.FormatDate4) : "") + ";");
                V_ParamField += ((txt_S_ARBillEndDate.Text != "" ? GF.CDate(txt_S_ARBillEndDate.Text).ToString(GF.FormatDate4) : "") + ";");
                V_ParamField += (txt_S_InvNoStart.Text + ";");
                V_ParamField += (txt_S_InvNoEnd.Text + ";");
                V_ParamField += ((txt_S_InvStartDate.Text != "" ? GF.CDate(txt_S_InvStartDate.Text).ToString(GF.FormatDate4) : "") + ";");
                V_ParamField += ((txt_S_InvEndDate.Text != "" ? GF.CDate(txt_S_InvEndDate.Text).ToString(GF.FormatDate4) : "") + ";");
                V_ParamField += (txt_S_TenantIDStart.Text + ";");
                V_ParamField += (txt_S_TenantIDEnd.Text + ";");
                V_ParamField += GF.CDate(txtPeriodApproval.Text).ToString(GF.FormatDate4);

                if (ddl_S_Sort.SelectedValue == "")
                    V_ParamOrder = "A.BillDate|DESC";
                else
                    V_ParamOrder += (ddl_S_Sort.SelectedValue + "|" + (ddl_S_Sort.SelectedValue != "" ? ddl_S_Sort_AD.SelectedValue : ""));

                string V_UserType = TextBox6.Text;
                if (TextBox6.Text == "")
                    V_UserType = lbl_Current_UserType.Text;

                grid_App.DataSource = ocf.EQueryP("spUTL_T_BIR_Update",
                                                 new SqlParameter[]
                                                     {
                                                         new SqlParameter("@p_Tipe", "7"), 
                                                         new SqlParameter("@p_H_CompanyID", Master.Mn_CompanyID),
                                                         new SqlParameter("@p_H_LocationID", Master.Mn_LocationID),
                                                         new SqlParameter("@p_AV_StatusApproval", ddlStatusApproval.SelectedValue),
                                                         new SqlParameter("@p_AV_UserType", V_UserType),
                                                         new SqlParameter("@p_MaxRecord", txtMaxRecord.Text),
                                                         new SqlParameter("@p_S_ParamField",V_ParamField),
                                                         new SqlParameter("@p_S_ParamOrder",V_ParamOrder),
                                                         new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
                                                     }, true).DefaultView;

                grid_App.DataBind();
                grid_App.ShowFooter = (grid_App.Items.Count == 0) ? true : false;
            }
            lblSearchResults.Text = "Count : " + grid_App.Items.Count.ToString();

        }
        protected void grid_ItemDataBound(object sender, DataGridItemEventArgs e)
        {
            switch (e.Item.ItemType)
            {
                case ListItemType.Footer:
                    for (int i = 0; i < e.Item.Cells.Count; i++)
                    {
                        if (i == 0)
                        {
                            e.Item.Cells[i].ColumnSpan = e.Item.Cells.Count;
                            e.Item.Cells[i].Text = "<span style=\"font-weight:normal;color:grey;\">No Record Found .....</span>";
                        }
                        else
                        {
                            e.Item.Cells[i].Visible = false;
                        }
                    }
                    break;
            }
        }
        protected void grid_App_ItemCommand(object source, System.Web.UI.WebControls.DataGridCommandEventArgs e)
        {
            switch (e.CommandName)
            {
                case "_lbtnBillNo":
                    LinkButton _lbtnBillNo = (LinkButton)e.Item.FindControl("_lbtnBillNo");
                    Label _lblKeyHd = (Label)e.Item.FindControl("_lblKeyHd");

                    lbl_Description1_Tmp.Text = Master.Mn_CompanyID + GF.Str2 + Master.Mn_LocationID + GF.Str2 + _lbtnBillNo.Text + GF.Str2 + Master.Mn_EmployeeID;
                    lbl_Description2_Tmp.Text = ddlStatusApproval.SelectedValue + GF.Str2 + txtMaxRecord.Text + GF.Str2 + "1";
                    if (TextBox6.Text != "")
                    {
                        txtBillNo.Text = _lbtnBillNo.Text;
                        _Back();
                    }
                    _OpenHD();
                    mv_1.SetActiveView((View)mv_1.FindControl("Vw_mv_1_InputTrans"));
                    break;
            }
        }


        private bool _Delete_Att(int p_SeqNo)
        {
            using (var br = new BRC.PIP_T_H_Billing())
            {
                br.CompanyID = Master.Mn_CompanyID;
                br.LocationID = Master.Mn_LocationID;
                br.BillNo = txtBillNo.Text;
                br.KeyHD = (GF.IsNumeric(txt_H_KeyHD.Text) ? Convert.ToInt32(txt_H_KeyHD.Text) : 0);
                br.BillDate = GF.CDate(txtBillDate.Text);
                br.UpdateUser = Master.Mn_EmployeeID;
                br.UpdateDate = (txt_H_UpdateDate.Text == "" ? GF.MinDate() : Convert.ToDateTime(txt_H_UpdateDate.Text));
                DataTable dtTmp;
                if (br.spUTL_T_BIR_Update(out dtTmp, p_Att_Tipe: "3",
                                                 p_Att_SeqNo: p_SeqNo,
                                                 p_Path_FolderAttachments: F_Path_FolderAttachments(Context.Request.ApplicationPath)))
                {
                    string _errMsg = dtTmp.Rows[0]["ErrMsg"] + "";
                    if (dtTmp.Rows[0]["ErrMsg"] + "" != "")
                    {
                        GF.MsgBox(this, _errMsg, "BS-5.3.0");
                    }
                    else
                    {
                        _OpenHD("[Att_2]", "ALL");
                    }
                }
            }

            return true;
        }
        #endregion
        #region Public Function
        public static string F_Url_FolerView(string p_ApplicationPath)
        {
            string _retval = "";

            _retval = _retval + PB.Url_WebFolder1;
            //_retval = _retval + F_FolderName().Replace("\\", "/");
            _retval = _retval + F_FolderName(p_ApplicationPath).Replace("\\", "/");

            return _retval;
        }
        public static string F_Path_FolderAttachments(string p_ApplicationPath)
        {
            string _retval = "";

            //C:\\inetpub\\wwwroot\\ToolsLib\\
            _retval = _retval + PB.Path_WebFolder1;
            //_retval = _retval + F_FolderName();
            _retval = _retval + F_FolderName(p_ApplicationPath);
            //_retval = _retval + Context.Request.ApplicationPath.Replace("/", "");
            //_retval = _retval + "\\FAAR_T_D_Trans_Attachments";

            return _retval;
        }
        public static string F_FolderName(string p_ApplicationPath)
        {
            string _retval = "";

            //_retval = _retval + Context.Request.ApplicationPath.Replace("/", "");
            _retval = _retval + p_ApplicationPath.Replace("/", "");
            _retval = _retval + "\\PIP_T_H_Billing";

            return _retval;
        }
        public static DataView F_SLProgressBIR(string p_KeyHD, 
                                               string p_MaxRecord = "", 
                                               string p_Condition = "")
        {
            using (var ocf = new WAL.BR.CF())
            {
                return new DataView(ocf.EQueryP("SELECT a.LogDate, swu.UserID, a.[Description], a.LastStatusTransaction, a.Reason " +
                                            "FROM PIP_T_D_Billing_TransactionLog a JOIN SysWebUser AS swu ON a.LogUser=swu.employeeid " +
                                            "WHERE a.KeyHD=@KeyHD " +
                                            (p_Condition != "" ? "WHERE " + p_Condition : " ") +
                                            " Order By a.logdate DESC",
                                            new SqlParameter[] { new SqlParameter("@keyhd", p_KeyHD) }));
            }
        }
        public static DataView F_SLSelectOne_SuiteNoBIR(bool p_IsSelectOne, 
                                                        string p_CompanyID, 
                                                        string p_LocationID, 
                                                        string p_SuiteNo, 
                                                        string p_MaxRecord = "", 
                                                        string p_Condition = "")
        {
            DataView _retval;
            if (p_IsSelectOne)
            {
                p_MaxRecord = "1";
                p_Condition = "d.suiteno = '" + p_SuiteNo + "' ";
            }
            using (var ocf = new WAL.BR.CF())
            {
                _retval = new DataView(ocf.EQueryP("SELECT TOP " + p_MaxRecord + " D.SuiteNo, H.Floor, D.Description " +
                                            "FROM thd_m_d_suitebir d, thd_m_h_suitebir h where d.id=h.id And h.IsActive = 1 and h.companyid=@companyid and h.locationid=@locationid " +
                                            (p_Condition != "" ? "WHERE " + p_Condition : " ") +
                                            " Order By d.suiteno",
                                            new SqlParameter[] {new SqlParameter("@companyid", p_CompanyID),
                                                                new SqlParameter("@locationid", p_LocationID)}));
            }
            return _retval;
        }
        #endregion



    }
}

