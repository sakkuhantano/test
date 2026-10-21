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

namespace PIP.Secure
{
    public partial class M_ScheduleTask : WAL.PB, WAL.I_ToolBar_2
    {
        #region Variables
        private const string _MenuID = "1519";
        #endregion

        #region Control Events
            protected void Page_Load(object sender, System.EventArgs e)
            {
                if (!IsPostBack) 
                {
                    // 0 : cache null   1 : otorisasi menu (true)   2 : otorisasi menu (false)
                    if (base.AllowRead(_MenuID) == 2)
                    {
                        throw new Exception(WAL.GF.MSG_ACCESS_DENIED);
                    }
                    DataTable dt = ((DataSet)Session[GF.Key_CacheLoggedOnUser]).Tables["UserGroupMenu"];
                    string _caption = dt.AsEnumerable().Where(a => a["MenuID"].Equals(_MenuID)).Select(a => a["Description"]).FirstOrDefault().ToString();
                    Master.Mn_litTitle = WAL.PB.AppID + " -> " + _caption;

                    _PrepareScreen();
                    InitToolbar();

                    GF.Focus(this, txtTaskID.ClientID);
		        }
            }
            public void Toolbar_Click(object sender, ToolBarEventArgs_2 e)
            {
                 switch (e.ToolbarItem)
                {
                    case ToolbarItem_2.New:
                        _PrepareScreen();
				        GF.Focus(this, txtTaskID.ClientID);
                        break;
                    case ToolbarItem_2.Save:
                        _Save();
                        break;
                    case ToolbarItem_2.Delete:
                        {
                            string _msg = "Are you sure want delete ?";
                            TextBox6.Text = "";
                            GF.ConfirmMsg_2(this.Page, TextBox6.ClientID, _msg, "2");
                            break;
                        }
                    case ToolbarItem_2.Previous:
                        _Open("1", RecStatus.Previous);
                        GF.Focus(this, txtTaskID.ClientID);
                        break;
                    case ToolbarItem_2.Next:
                        _Open("1", RecStatus.Next);
                        GF.Focus(this, txtTaskID.ClientID);
                        break;
                }
            }
            protected void TextBox_TextChanged(object sender, System.EventArgs e)
            {
                TextBox a = (TextBox)sender;
                switch (a.ID)
                {
                    case "TextBox6":
                        switch (GF.SplitStr(a.Text)[0])
                        {
                            case "1":
                                _DeleteDt(GF.SplitStr(a.Text)[1]);
                                break;
                            case "2":
                                _Delete();
                                break;
                        }
                        break;
                    case "txtTaskID":
                        _Open("1");
                        break;
                }
            }
            protected void lBtn_Click(object sender, System.EventArgs e)
            {
                LinkButton lBtn = (LinkButton)sender;
                switch (lBtn.ID)
                {
                    case "lBtnSaveGrid":
                        if (_SaveDt())
                        {
                            _PrepareScreenDt();
                            GF.Focus(this, txtTaskID.ClientID);
                        }
                        break;
                    case "lBtnCloseGrid":
                        GF.ShowPanel(ref pnlAddNewRecord, false);
                        lbtnAddnewrecord.Visible = txtTaskID.Text == "";
                        GF.Focus(this, txtTaskID.ClientID);
                        break;
                    case "lbtnAddnewrecord":
                        {
                            GF.ShowPanel(ref pnlAddNewRecord, true);
                            lbtnAddnewrecord.Visible = false;
                            _PrepareScreenDt("1");
                        }
                        break;
                }
            }
        #endregion

        #region Main Function (CRUD)
            private void InitToolbar()
            {
                Master.TB_VisibleToolbar(true);
                Master.TB_VisibleButton(ToolbarItem_2.New, true);
                Master.TB_VisibleButton(ToolbarItem_2.Previous, true);
                Master.TB_VisibleButton(ToolbarItem_2.Next, true);
                Master.TB_IsConfirmMessage(ToolbarItem_2.Delete, false);
            }
            private void _PrepareScreen(bool _kosong = true)
            {
                txtKeyHD.Text = "0";
                if (_kosong)
                {
                    lBtnTaskID.Attributes.Add("onClick", GF.JSOpenSearchList_2("148", "Master Task", txtTaskID.ClientID, false, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str));
                    txtTaskID.Attributes.Add("onKeyDown", GF.JSOpenSearchList_2("148", "Master Task", txtTaskID.ClientID, true, Master.Mn_CompanyID + GF.Str + ";" + Master.Mn_LocationID + GF.Str));
                    txtTaskID.Text = string.Empty;
                    txtTaskDescription.Text = string.Empty;
                }

                Master.TB_VisibleButton(ToolbarItem_2.Save, false);
                Master.TB_VisibleButton(ToolbarItem_2.Delete, false);
                GF.ShowPanel(ref pnlAddNewRecord, false);
                lbtnAddnewrecord.Visible = true;
                _PrepareScreenDt();
            }
            private void _PrepareScreenDt(string strtype = "")
            {
                txtTaskItem.Text = txtLocationName.Text = txtSectionName.Text = string.Empty;
                txtNumberStaff.Text = txtSeqNo.Text = "0";
                txtTaskItem.ReadOnly = false;
                if (strtype.Contains("1") == false)
                    UpdateViewGrid();
            }


            private bool _ValidSave()
            {
                string _strmsg = string.Empty;

                if (txtTaskID.Text == string.Empty)
                {
                    _strmsg = "Task ID cannot empty";
                }
                else if (txtTaskDescription.Text == string.Empty)
                {
                    _strmsg = "Description cannot empty";
                }

                if (_strmsg.Trim() != string.Empty)
                    GF.MsgBox(this, _strmsg);
                return _strmsg.Trim() == string.Empty;

            }

            private bool _Save(bool _refresh = true)
            {
                if (_ValidSave() == false)
                    return false;
                using (var br = new WAL.BR.CF())
                {
                    br.EQueryP("[spPIP_InsertUpdateDeleteInput_PIP_M_HD_PMTask]", new SqlParameter[] 
                    {
                        new SqlParameter("@p_H_Tipe", (txtKeyHD.Text == "0" ? "1" : "2")),
                        new SqlParameter("@p_D_Tipe", ""),
                        new SqlParameter("@p_H_KeyHD", Convert.ToInt32(txtKeyHD.Text)),
                        new SqlParameter("@p_H_CompanyID", Master.Mn_CompanyID),
                        new SqlParameter("@p_H_LocationID", Master.Mn_LocationID),
                        new SqlParameter("@p_H_TaskID", txtTaskID.Text),
                        new SqlParameter("@p_H_Description", txtTaskDescription.Text),
                        new SqlParameter("@p_D_TaskItem", ""),
                        new SqlParameter("@p_D_LocationName", ""),
                        new SqlParameter("@p_D_SectionName", ""),
                        new SqlParameter("@p_D_NumberStaff", 0),
                        new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
                    }, true);
                    _Open("1");
                }
                return true;
            }

            private bool _ValidDelete()
            {
                string _strmsg = string.Empty;

                if (txtTaskID.Text.Trim() == string.Empty)
                {
                    _strmsg = "Nothing to delete";
                }
                if (_strmsg == "")
                {
                    using (var br=new WAL.BR.CF())
                    {
                        if (br.EQueryP(
@"SELECT * FROM PIP_T_H_PMTask WHERE CompanyID=@CompanyID AND LocationID=@LocationID AND isActive=1 AND TaskID=@TaskID",
new SqlParameter[] { new SqlParameter("@CompanyID", Master.Mn_CompanyID), new SqlParameter("@LocationID", Master.Mn_LocationID),
new SqlParameter("@TaskID", txtTaskID.Text)}).Rows.Count > 0)
                        {
                            _strmsg = "Cannot delete..<br/>Task ID already in used..";
                        }
                    }
                }

                if (_strmsg.Trim() != string.Empty)
                    GF.MsgBox_2(this, _strmsg);
                return _strmsg.Trim() == string.Empty;
            }
            private bool _ValidDeleteDT()
            {
                bool _retval = true;
                string _strmsg = string.Empty;

                using (var br = new WAL.BR.CF())
                {
                    if (br.EQueryP("select * from PIP_M_D_PMTask where keyhd=@keyhd", new SqlParameter[] { new SqlParameter("@keyhd", Convert.ToInt32(txtKeyHD.Text)) }).Rows.Count == 1)
                        _strmsg = "This is Last record";
                }
                if (_strmsg.Trim() != string.Empty)
                {
                    GF.MsgBox_2(this, _strmsg);
                    _retval = false;
                }

                return _retval;
            }
            private bool _Delete()
            {
                if (_ValidDelete() == false)
                    return false;

                using (var br = new WAL.BR.CF())
                {
                    br.EQueryP("[spPIP_InsertUpdateDeleteInput_PIP_M_HD_PMTask]", new SqlParameter[] 
                    {
                        new SqlParameter("@p_H_Tipe", "3"),
                        new SqlParameter("@p_D_Tipe", ""),
                        new SqlParameter("@p_H_KeyHD", Convert.ToInt32(txtKeyHD.Text)),
                        new SqlParameter("@p_H_CompanyID", Master.Mn_CompanyID),
                        new SqlParameter("@p_H_LocationID", Master.Mn_LocationID),
                        new SqlParameter("@p_H_TaskID", txtTaskID.Text),
                        new SqlParameter("@p_H_Description", txtTaskDescription.Text),
                        new SqlParameter("@p_D_TaskItem", ""),
                        new SqlParameter("@p_D_LocationName", ""),
                        new SqlParameter("@p_D_SectionName", ""),
                        new SqlParameter("@p_D_NumberStaff", 0),
                        new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
                    }, true);
                    _PrepareScreen();
                    GF.Focus(this, txtTaskID.ClientID);
                }
                return true;
            }
            private bool _DeleteDt(string p_TaskItem)
            {
                if (!_ValidDeleteDT())
                    return false;

                using (var br = new WAL.BR.CF())
                {
                    br.EQueryP("spPIP_InsertUpdateDeleteInput_PIP_M_HD_PMTask", new SqlParameter[] 
                    {
                        new SqlParameter("@p_H_Tipe", ""),
                        new SqlParameter("@p_D_Tipe", "3"),
                        new SqlParameter("@p_H_KeyHD", Convert.ToInt32(txtKeyHD.Text)),
                        new SqlParameter("@p_H_CompanyID", Master.Mn_CompanyID),
                        new SqlParameter("@p_H_LocationID", Master.Mn_LocationID),
                        new SqlParameter("@p_H_TaskID", txtTaskID.Text),
                        new SqlParameter("@p_H_Description", ""),
                        new SqlParameter("@p_D_TaskItem", p_TaskItem),
                        new SqlParameter("@p_D_LocationName", ""),
                        new SqlParameter("@p_D_SectionName", ""),
                        new SqlParameter("@p_D_NumberStaff", "0"),
                        new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
                    }, true);
                    UpdateViewGrid();
                    _PrepareScreenDt();
                    GF.Focus(this, txtTaskItem.ClientID);
                }
                return true;
            }
            private bool _ValidSaveDt()
            {
                string _strmsg = string.Empty;

                if (txtSectionName.Text == "")
                    _strmsg = "Section Name cannot empty";
                else if (txtLocationName.Text == string.Empty)
                    _strmsg = "Location Name cannot empty";
                else if (txtNumberStaff.Text == string.Empty)
                    _strmsg = "Number of Staff cannot empty";
                else if (!GF.IsNumeric(txtNumberStaff.Text))
                    _strmsg = "Number of Staff must be numeric";
                else if (Convert.ToInt16(txtNumberStaff.Text) <= 0)
                    _strmsg = "Number of Staff must greater than zero";

                if (_strmsg == "" && Convert.ToInt16(txtSeqNo.Text) == 0)
                {
                    using (var br = new WAL.BR.CF())
                    {
                        if (br.EQueryP("select * from PIP_M_D_PMTask where keyhd=@keyhd and taskitem=@taskitem", 
                        new SqlParameter[] { new SqlParameter("@keyhd", Convert.ToInt32(txtKeyHD.Text)), 
                                             new SqlParameter("@taskitem", txtTaskItem.Text) }).Rows.Count > 0)
                            _strmsg = "Task Item already exists...";
                    }
                }

                if (_strmsg.Trim() != string.Empty)
                    GF.MsgBox_2(this, _strmsg);
                return _strmsg.Trim() == string.Empty;
            }
            private bool _SaveDt()
            {
                if (_ValidSaveDt() == false)
                    return false;
                if (_ValidSave() == false)
                    return false;

                using (var br = new WAL.BR.CF())
                {
                    txtKeyHD.Text = br.EQueryP("spPIP_InsertUpdateDeleteInput_PIP_M_HD_PMTask", new SqlParameter[] 
                    {
                        new SqlParameter("@p_H_Tipe", (Convert.ToInt16(txtKeyHD.Text) == 0 ? "1" : "2")),
                        new SqlParameter("@p_D_Tipe", (Convert.ToInt16(txtSeqNo.Text) == 0 ? "1" : "2")),
                        new SqlParameter("@p_H_KeyHD", Convert.ToInt32(txtKeyHD.Text)),
                        new SqlParameter("@p_H_CompanyID", Master.Mn_CompanyID),
                        new SqlParameter("@p_H_LocationID", Master.Mn_LocationID),
                        new SqlParameter("@p_H_TaskID", txtTaskID.Text),
                        new SqlParameter("@p_H_Description", txtTaskDescription.Text),
                        new SqlParameter("@p_D_TaskItem", txtTaskItem.Text),
                        new SqlParameter("@p_D_LocationName", txtLocationName.Text),
                        new SqlParameter("@p_D_SectionName", txtSectionName.Text),
                        new SqlParameter("@p_D_NumberStaff", Convert.ToInt16(txtNumberStaff.Text)),
                        new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
                    }, true).Rows[0]["KeyHD"].ToString();
                    _PrepareScreenDt();
                    GF.Focus(this, txtTaskItem.ClientID);
                }
                return true;
            }
        #endregion

        #region Private Functions
            private void _Open(string strtype = "", RecStatus recStatus = RecStatus.Current)
            {
                DataTable dt = F_SelectSLTaskID(Master.Mn_CompanyID, Master.Mn_LocationID, txtTaskID.Text).ToTable();
                if (dt.Rows.Count == 0)
                {
                    _PrepareScreen(false);
                }
                else
                {
                    txtTaskID.Text = dt.Rows[0]["taskid"].ToString();
                    txtTaskDescription.Text = dt.Rows[0]["description"].ToString();
                    txtKeyHD.Text = dt.Rows[0]["keyhd"].ToString();
                    Master.TB_VisibleButton(ToolbarItem_2.Save, true);
                    Master.TB_VisibleButton(ToolbarItem_2.Delete, true);
                }

                if (strtype.Contains("1") == true)
                    UpdateViewGrid();
                
                GF.Focus(this, txtTaskDescription.ClientID);
            }
            private void _OpenDT(string PrmKeyDT)
            {
                using (var br=new WAL.BR.CF())
                {
                    DataTable dt = br.EQueryP("SELECT * FROM PIP_M_D_PMTask where keyhd=@keyhd and taskitem=@taskitem",
                    new SqlParameter[] { new SqlParameter("@keyhd", Convert.ToInt32(txtKeyHD.Text)), new SqlParameter("@taskitem", PrmKeyDT) });
                    if (dt.Rows.Count > 0)
                    {
                        txtTaskItem.Text = dt.Rows[0]["taskitem"].ToString();
                        txtSectionName.Text = dt.Rows[0]["sectionname"].ToString();
                        txtLocationName.Text = dt.Rows[0]["locationname"].ToString();
                        txtNumberStaff.Text = Convert.ToInt16(dt.Rows[0]["numberstaff"]).ToString(GF.FormatCurrency0);
                        txtSeqNo.Text = "1";
                        txtTaskItem.ReadOnly = true;
                    }
                    else
                    {
                        _PrepareScreenDt("1");
                    }
                }
            }
        #endregion
        #region Public Functions
            public static DataView F_SelectSLTaskIDItem(string p_CompanyID,
                                                     string p_LocationID,
                                                     string p_TaskID = "",
                                                     string p_TaskItem = "",
                                                     string p_MaxRecord = "",
                                                     string p_Condition = "")
            {
                DataView _retval;
                using (var br = new WAL.BR.CF())
                {
                    string _Condition = "";
                    if (p_TaskItem != "")
                        p_MaxRecord = "1";

                    if (p_TaskID != "")
                        _Condition += " AND h.taskid='" + p_TaskID + "'";
                    if (p_TaskItem != "")
                        _Condition += " AND d.taskitem='" + p_TaskItem + "'";

                    _retval = _retval = new DataView(br.EQueryP("SELECT TOP " + (p_MaxRecord == "" ? "50" : p_MaxRecord) + " TaskItem, SectionName, LocationName, h.TaskID, h.[Description] " +
                    "FROM PIP_M_H_PMTask h JOIN PIP_M_D_PMTask d ON d.KeyHD=h.KeyHD WHERE h.CompanyID = @CompanyID and h.LocationID = @LocationID AND h.isActive=1 " +
                    (p_Condition != string.Empty ? " AND " + p_Condition : "") + _Condition +
                    " Order By h.TaskID, d.TaskItem",
                    new SqlParameter[] { new SqlParameter("@companyid", p_CompanyID), 
                                     new SqlParameter("@locationid", p_LocationID)}));
                    return _retval;
                }
            }

            public static DataView F_SelectSLTaskID(string p_CompanyID,
                                                     string p_LocationID,
                                                     string p_TaskID = "", 
                                                     string p_MaxRecord = "",
                                                     string p_Condition = "")
            {
                DataView _retval;
                using (var br = new WAL.BR.CF())
                {
                    string _Condition = "";
                    if (p_TaskID != "")
                    {
                        _Condition += " AND h.taskid='" + p_TaskID + "'";
                        p_MaxRecord = "1";
                    }

                    _retval = _retval = new DataView(br.EQueryP("SELECT TOP " + (p_MaxRecord == "" ? "50" : p_MaxRecord) + " TaskID, [Description], keyhd " +
                    "FROM PIP_M_H_PMTask h WHERE h.CompanyID = @CompanyID and h.LocationID = @LocationID AND h.isActive=1 " +
                    (p_Condition != string.Empty ? " AND " + p_Condition : "") + _Condition +
                    " Order By TaskID",
                    new SqlParameter[] { new SqlParameter("@companyid", p_CompanyID), 
                                     new SqlParameter("@locationid", p_LocationID)}));
                    return _retval;
                }
            }

        #endregion
        #region DataGrid Command Center
            protected void gridData_ItemCreated(object sender, DataGridItemEventArgs e)
            {
                DataGrid gridData = (DataGrid)sender;
                switch (e.Item.ItemType)
                {
                    case ListItemType.Item:
                    case ListItemType.AlternatingItem:
                        LinkButton _ibtnDelete = (LinkButton)e.Item.FindControl("_ibtnDelete");
                        if ((_ibtnDelete != null))
                            _ibtnDelete.Attributes.Add("OnClick", "javascript: return MsgDeleteRecordInGrid();");
                        break;
                }

            }
            protected void gridData_ItemCommand(object source, DataGridCommandEventArgs e)
            {
                DataGrid gridData = (DataGrid)source;
                Label _lblTaskItem = (Label)e.Item.FindControl("_lblTaskItem");
                switch (e.CommandName)
                {
                    case "_Edit":
                        if (_lblTaskItem.Text.Trim().Length > 0)
                        {
                            GF.ShowPanel(ref pnlAddNewRecord, true);
                            lbtnAddnewrecord.Visible = false;
                            _OpenDT(_lblTaskItem.Text);
                            GF.Focus(this, txtSectionName.ClientID);
                        }
                        break;
                    case "_Delete":
                        if (_lblTaskItem.Text.Length > 0)
                        {
                            TextBox6.Text = "";
                            GF.ConfirmMsg_2(this.Page, TextBox6.ClientID, "Are you sure want to delete this item ?", "1;" + _lblTaskItem.Text);
                        }
                        break;
                }

            }
            private void UpdateViewGrid()
            {
                using (var br = new WAL.BR.CF())
                {
                    gridData.DataSource = br.EQueryP("SELECT *, SeqNo=ROW_NUMBER() OVER (ORDER BY TaskItem) " + 
                    "FROM PIP_M_d_PMTask WHERE KeyHD=@KeyHD", new SqlParameter[] { new SqlParameter("@KeyHD", Convert.ToInt32(txtKeyHD.Text)) });
                    gridData.DataBind();
                }
            }

        #endregion
    }
}

