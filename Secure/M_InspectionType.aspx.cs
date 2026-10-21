using System;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web.UI.WebControls;
using System.Web;
using WAL;

namespace PIP.Secure
{
    public partial class M_InspectionType : WAL.PB, WAL.I_ToolBar_2
    {
        private const string _MenuID = "1530";

        protected void Page_Load(object sender, EventArgs e)
        {
            if (!IsPostBack)
            {
                if (base.AllowRead(_MenuID) == 2) throw new Exception(WAL.GF.MSG_ACCESS_DENIED);
                DataTable menus = ((DataSet)Session[GF.Key_CacheLoggedOnUser]).Tables["UserGroupMenu"];
                string caption = menus.AsEnumerable().Where(a => a["MenuID"].Equals(_MenuID))
                    .Select(a => a["Description"]).FirstOrDefault().ToString();
                Master.Mn_litTitle = WAL.PB.AppID + " -> " + caption;
                InitToolbar();
                _PrepareScreen();
                GF.Focus(this, txtInspectionTypeCode.ClientID);
            }
        }

        public void Toolbar_Click(object sender, ToolBarEventArgs_2 e)
        {
            switch (e.ToolbarItem)
            {
                case ToolbarItem_2.New: _PrepareScreen(); GF.Focus(this, txtInspectionTypeCode.ClientID); break;
                case ToolbarItem_2.Save: _Save(); break;
                case ToolbarItem_2.Delete:
                    txtConfirmAction.Text = "";
                    GF.ConfirmMsg_2(this.Page, txtConfirmAction.ClientID, "Are you sure want delete?", "2");
                    break;
            }
        }

        protected void TextBox_TextChanged(object sender, EventArgs e)
        {
            TextBox control = (TextBox)sender;
            if (control.ID == "txtConfirmAction")
            {
                if (GF.SplitStr(control.Text)[0] == "2") _Delete();
            }
            else if (control.ID == "txtInspectionTypeCode") _Open("1");
            else if (control.ID == "txtSectionID") _OpenSection();
        }

        protected void lBtn_Click(object sender, EventArgs e)
        {
            LinkButton control = (LinkButton)sender;
            switch (control.ID)
            {
                case "lBtnSaveDetail": _SaveDetail(); break;
                case "lBtnCloseDetail": GF.ShowPanel(ref pnlDetails, false); lBtnAddNewDetail.Visible = true; break;
                case "lBtnAddNewDetail":
                    //if (txtInspectionTypeCode.Text.Trim() == "" || txtIsNew.Text == "1") { GF.MsgBox_2(this, "Save or select an Inspection Type header first."); return; }
                    _PrepareDetail();
                    GF.ShowPanel(ref pnlDetails, true);
                    break;
            }
        }

        protected void gridData_ItemCommand(object source, DataGridCommandEventArgs e)
        {
            string detailCode = Convert.ToString(e.CommandArgument);
            if (e.CommandName == "EditDetail")
            {
                using (var br = new WAL.BR.CF())
                {
                    DataTable dt = br.EQueryP(@"SELECT InspectionTypeDetailCode, InspectionTypeDetailName,
ScheduleTime, IsActive
FROM dbo.PIP_M_InspectionTypeDetail WHERE InspectionTypeCode=@Code AND InspectionTypeDetailCode=@DetailCode",
                        new SqlParameter[] { new SqlParameter("@Code", txtInspectionTypeCode.Text.Trim()), new SqlParameter("@DetailCode", detailCode) });
                    if (dt.Rows.Count > 0)
                    {
                        txtDetailOriginalCode.Text = detailCode;
                        txtDetailCode.Text = detailCode;
                        txtDetailName.Text = Convert.ToString(dt.Rows[0]["InspectionTypeDetailName"]);
                        hidScheduleTimes.Value = Convert.ToString(dt.Rows[0]["ScheduleTime"]);
                        //chkDetailActive.Checked = Convert.ToBoolean(dt.Rows[0]["IsActive"]);
                        txtDetailCode.ReadOnly = true;
                        GF.ShowPanel(ref pnlDetails, true);
                        lBtnAddNewDetail.Visible = false;
                    }
                }
            }
            else if (e.CommandName == "DeleteDetail")
            {
                using (var br = new WAL.BR.CF())
                    br.EQueryP("spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType", InspectionTypeParameters("", "3", detailCode), true);
                _PrepareDetail();
                _RefreshDetails();
            }
        }

        private void InitToolbar()
        {
            Master.TB_VisibleToolbar(true);
            Master.TB_VisibleButton(ToolbarItem_2.New, true);
            Master.TB_VisibleButton(ToolbarItem_2.Save, false);
            Master.TB_VisibleButton(ToolbarItem_2.Delete, false);
            Master.TB_VisibleButton(ToolbarItem_2.Previous, false);
            Master.TB_VisibleButton(ToolbarItem_2.Next, false);
            Master.TB_IsConfirmMessage(ToolbarItem_2.Delete, false);
        }

        private void _PrepareScreen(bool clear = true)
        {
            txtIsNew.Text = "1";
            txtDetailOriginalCode.Text = "";
            lBtnInspectionTypeCode.Attributes["onClick"] = GF.JSOpenSearchList_2("154", "Master Inspection Type", txtInspectionTypeCode.ClientID, false, txtInspectionTypeCode.ClientID);
            txtInspectionTypeCode.Attributes["onKeyDown"] = GF.JSOpenSearchList_2("154", "Master Inspection Type", txtInspectionTypeCode.ClientID, true, txtInspectionTypeCode.ClientID);
            lBtnSectionID.Attributes.Add("onClick", GF.JSOpenSearchList_2("32", "Master Section", txtSectionID.ClientID, false, "" + GF.Str + ";" + "" + GF.Str + ";" + "" + GF.Str));
            txtSectionID.Attributes.Add("onKeyDown", GF.JSOpenSearchList_2("32", "Master Section", txtSectionID.ClientID, true, "" + GF.Str + ";" + "" + GF.Str + ";" + "" + GF.Str));
            if (clear)
            {
                txtInspectionTypeCode.Text = txtInspectionTypeName.Text = txtSectionID.Text = txtSectionDesc.Text = "";
                _RefreshDetails();
            }
            Master.TB_VisibleButton(ToolbarItem_2.Save, clear);
            Master.TB_VisibleButton(ToolbarItem_2.Delete, false);
            GF.ShowPanel(ref pnlDetails, false);
            lBtnAddNewDetail.Visible = true;
        }

        // Mirrors M_ScheduleTask.aspx: select the code, then _Open() loads header and detail.
        private void _Open(string strtype = "", RecStatus recStatus = RecStatus.Current)
        {
            DataTable dt = F_SelectSLInspectionType(txtInspectionTypeCode.Text).ToTable();
            if (dt.Rows.Count == 0)
            {
                _PrepareScreen(false);
            }
            else
            {
                txtInspectionTypeCode.Text = dt.Rows[0]["InspectionTypeCode"].ToString();
                txtInspectionTypeName.Text = dt.Rows[0]["InspectionTypeName"].ToString();
                txtSectionID.Text = dt.Rows[0]["SectionID"].ToString();
                _OpenSection();
                Master.TB_VisibleButton(ToolbarItem_2.Save, true);
                Master.TB_VisibleButton(ToolbarItem_2.Delete, true);
                txtIsNew.Text = "0";
            }

            if (strtype.Contains("1") == true)
                _RefreshDetails();

            GF.Focus(this, txtInspectionTypeName.ClientID);
            
        }

        private bool _ValidSave()
        {
            string message = "";
            if (txtInspectionTypeCode.Text.Trim() == "") message = "Inspection Type Code cannot be empty.";
            else if (txtInspectionTypeCode.Text.Trim().Length > 2) message = "Inspection Type Code maximum length is 2.";
            else if (txtInspectionTypeName.Text.Trim() == "") message = "Inspection Type Name cannot be empty.";
            else if (txtSectionID.Text.Trim() == "") message = "Section ID cannot be empty.";
            if (message != "") GF.MsgBox_2(this, message);
            return message == "";
        }

        // Header CRUD uses p_H_Tipe = 1 (insert), 2 (update), 3 (soft-delete).
        private bool _Save()
        {
            if (!_ValidSave()) return false;
            string type = txtIsNew.Text == "1" ? "1" : "2";
            using (var br = new WAL.BR.CF())
                br.EQueryP("spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType", new SqlParameter[] {
                    new SqlParameter("@p_H_Tipe", type), new SqlParameter("@p_D_Tipe", ""),
                    new SqlParameter("@p_H_InspectionTypeCode", txtInspectionTypeCode.Text.Trim().ToUpperInvariant()),
                    new SqlParameter("@p_H_InspectionTypeName", txtInspectionTypeName.Text.Trim()),
                    new SqlParameter("@p_H_SectionID", txtSectionID.Text.Trim()), 
                    new SqlParameter("@p_D_InspectionTypeDetailCode", ""), new SqlParameter("@p_D_InspectionTypeDetailName", ""),
                    new SqlParameter("@p_D_ScheduleTime", ""), new SqlParameter("@p_D_IsActive", false),
                    new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
                }, true);
            _Open();
            return true;
        }

        private bool _Delete()
        {
            if (txtInspectionTypeCode.Text.Trim() == "") { GF.MsgBox_2(this, "Nothing to delete."); return false; }
            using (var br = new WAL.BR.CF())
                br.EQueryP("spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType", new SqlParameter[] {
                    new SqlParameter("@p_H_Tipe", "3"), new SqlParameter("@p_D_Tipe", ""),
                    new SqlParameter("@p_H_InspectionTypeCode", txtInspectionTypeCode.Text.Trim()),
                    new SqlParameter("@p_H_InspectionTypeName", txtInspectionTypeName.Text.Trim()),
                    new SqlParameter("@p_H_SectionID", txtSectionID.Text.Trim()), 
                    new SqlParameter("@p_D_InspectionTypeDetailCode", ""), new SqlParameter("@p_D_InspectionTypeDetailName", ""),
                    new SqlParameter("@p_D_ScheduleTime", ""), new SqlParameter("@p_D_IsActive", false),
                    new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
                }, true);
            _PrepareScreen();
            return true;
        }

        private bool _SaveDetail()
        {
            //if (txtInspectionTypeCode.Text.Trim() == "" || txtIsNew.Text == "1") { GF.MsgBox_2(this, "Save or select an Inspection Type header first."); return false; }
            if (_ValidSave() == false)
                return false;
            string code = txtDetailCode.Text.Trim().ToUpperInvariant(), name = txtDetailName.Text.Trim();
            string time = (hidScheduleTimes.Value ?? "").Trim();
            string[] times = time.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim()).Distinct().OrderBy(x => x).ToArray();

            if (code == "" || name == "" || times.Length == 0) { GF.MsgBox_2(this, "Detail Code, Description and Schedule Time are required."); return false; }
            if (times.Any(x => !System.Text.RegularExpressions.Regex.IsMatch(x, @"^([01]\d|2[0-3]):[0-5]\d$")))
            { GF.MsgBox_2(this, "Schedule Time must use HH:mm format."); return false; }
            time = String.Join(";", times);
            hidScheduleTimes.Value = time;
            string type = txtDetailOriginalCode.Text.Trim() == "" ? "1" : "2";
            using (var br = new WAL.BR.CF())
                br.EQueryP("spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType", new SqlParameter[] {
                    new SqlParameter("@p_H_Tipe", (txtIsNew.Text == "1" ? "1" : "2")), new SqlParameter("@p_D_Tipe", type),
                    new SqlParameter("@p_H_InspectionTypeCode", txtInspectionTypeCode.Text.Trim()),
                    new SqlParameter("@p_H_InspectionTypeName", txtInspectionTypeName.Text), new SqlParameter("@p_H_SectionID", txtSectionID.Text),
                    new SqlParameter("@p_D_InspectionTypeDetailCode", code),
                    new SqlParameter("@p_D_InspectionTypeDetailName", name), new SqlParameter("@p_D_ScheduleTime", time),
                    new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
                }, true);
            _PrepareDetail();
            _RefreshDetails();
            return true;
        }

        private SqlParameter[] InspectionTypeParameters(string headerType, string detailType, string detailCode)
        {
            return new SqlParameter[] {
                new SqlParameter("@p_H_Tipe", headerType), new SqlParameter("@p_D_Tipe", detailType),
                new SqlParameter("@p_H_InspectionTypeCode", txtInspectionTypeCode.Text.Trim()),
                new SqlParameter("@p_H_InspectionTypeName", ""), new SqlParameter("@p_H_SectionID", ""),
                new SqlParameter("@p_H_IsActive", false), new SqlParameter("@p_D_InspectionTypeDetailCode", detailCode),
                new SqlParameter("@p_D_InspectionTypeDetailName", ""), new SqlParameter("@p_D_ScheduleTime", ""),
                new SqlParameter("@p_D_IsActive", false), new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
            };
        }

        private void _PrepareDetail()
        {
            txtDetailOriginalCode.Text = "";
            hidScheduleTimes.Value = "";
            txtDetailCode.Text = txtDetailName.Text = "";
            txtDetailCode.ReadOnly = false;
            lBtnAddNewDetail.Visible = false;
        }
        protected string GetScheduleSummary(object value)
        {
            string[] times = (Convert.ToString(value) ?? "").Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim()).Where(x => x != "").Distinct().OrderBy(x => x).ToArray();
            if (times.Length == 0) return "No schedules";
            string preview = String.Join(", ", times.Take(2));
            if (times.Length > 2) preview += ", …";
            return times.Length + (times.Length == 1 ? " schedule · " : " schedules · ") + preview;
        }

        protected string GetScheduleClientScript(object scheduleValue, object detailNameValue)
        {
            string schedule = HttpUtility.JavaScriptStringEncode(Convert.ToString(scheduleValue) ?? "");
            string detailName = HttpUtility.JavaScriptStringEncode(Convert.ToString(detailNameValue) ?? "");
            return "return showScheduleModal('" + schedule + "', '" + detailName + "');";
        }

        private void _RefreshDetails()
        {
            //if (txtInspectionTypeCode.Text.Trim() == "") { gridData.DataSource = null; gridData.DataBind(); return; }
            using (var br = new WAL.BR.CF())
            {
                gridData.DataSource = br.EQueryP(@"SELECT InspectionTypeDetailCode, InspectionTypeDetailName,
ScheduleTime, IsActive
FROM dbo.PIP_M_InspectionTypeDetail WHERE InspectionTypeCode=@Code
ORDER BY ScheduleTime, InspectionTypeDetailCode",
                    new SqlParameter[] { new SqlParameter("@Code", txtInspectionTypeCode.Text.Trim()) });
                gridData.DataBind();
            }
        }
        public static DataView F_SelectSLInspectionType(
            string p_InspectionType = "",
            string p_MaxRecord = "",
            string p_Condition = "")
        {
            DataView _retval;
            using (var br = new WAL.BR.CF())
            {
                string _Condition = "";
                if (p_InspectionType != "")
                {
                    _Condition += " AND h.InspectionTypeCode='" + p_InspectionType + "'";
                    p_MaxRecord = "1";
                }

                _retval = _retval = new DataView(br.EQuery("SELECT TOP " + (p_MaxRecord == "" ? "50" : p_MaxRecord) + " InspectionTypeCode, InspectionTypeName, SectionID " +
                "FROM pip_m_inspectiontype h WHERE h.isActive=1 " +
                (p_Condition != string.Empty ? " AND " + p_Condition : "") + _Condition +
                " Order By InspectionTypeCode"));
                return _retval;
            }
        }
        private void _OpenSection()
        {
            using (var br = new BRC.PIP_M_Section() { SectionID = txtSectionID.Text })
            {
                if (br.SelectOne().Rows.Count > 0)
                {
                    txtSectionID.Text = br.SectionID;
                    txtSectionDesc.Text = br.Description;
                }
                else
                {
                    txtSectionID.Text = string.Empty;
                    txtSectionDesc.Text = string.Empty;
                }
            }
        }

    }
}
