using System;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web.UI.WebControls;
using WAL;

namespace PIP.Secure
{
    public partial class M_InspectionType : WAL.PB, WAL.I_ToolBar_2
    {
        private const string _MenuID = "TODO_MENU_ID";

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
            else if (control.ID == "txtInspectionTypeCode") _Open();
        }

        protected void lBtn_Click(object sender, EventArgs e)
        {
            LinkButton control = (LinkButton)sender;
            switch (control.ID)
            {
                case "lBtnSaveDetail": _SaveDetail(); break;
                case "lBtnCloseDetail": GF.ShowPanel(ref pnlDetails, false); break;
                case "lBtnAddNewDetail":
                    if (txtInspectionTypeCode.Text.Trim() == "" || txtIsNew.Text == "1") { GF.MsgBox_2(this, "Save or select an Inspection Type header first."); return; }
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
                        chkDetailActive.Checked = Convert.ToBoolean(dt.Rows[0]["IsActive"]);
                        txtDetailCode.ReadOnly = true;
                        GF.ShowPanel(ref pnlDetails, true);
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
            lBtnInspectionTypeCode.Attributes["onClick"] = GF.JSOpenSearchList_2("TODO_SEARCHLIST_ID", "Master Inspection Type", txtInspectionTypeCode.ClientID, false, "");
            txtInspectionTypeCode.Attributes["onKeyDown"] = GF.JSOpenSearchList_2("TODO_SEARCHLIST_ID", "Master Inspection Type", txtInspectionTypeCode.ClientID, true, "");
            if (clear)
            {
                txtInspectionTypeCode.Text = txtInspectionTypeName.Text = txtSectionID.Text = "";
                chkHeaderActive.Checked = true;
                _RefreshDetails();
            }
            txtInspectionTypeCode.ReadOnly = !clear;
            txtInspectionTypeName.ReadOnly = !clear;
            txtSectionID.ReadOnly = !clear;
            Master.TB_VisibleButton(ToolbarItem_2.Save, clear);
            Master.TB_VisibleButton(ToolbarItem_2.Delete, false);
            GF.ShowPanel(ref pnlDetails, false);
            lBtnAddNewDetail.Visible = true;
        }

        // Mirrors M_ScheduleTask.aspx: select the code, then _Open() loads header and detail.
        private void _Open()
        {
            string code = (txtInspectionTypeCode.Text ?? "").Trim();
            if (code == "") { _PrepareScreen(); return; }
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQueryP(@"SELECT InspectionTypeCode, InspectionTypeName, SectionID, IsActive
FROM dbo.PIP_M_InspectionType WHERE InspectionTypeCode=@Code",
                    new SqlParameter[] { new SqlParameter("@Code", code) });
                if (dt.Rows.Count == 0)
                {
                    _PrepareScreen();
                    txtInspectionTypeCode.Text = code;
                    GF.MsgBox_2(this, "Inspection Type not found.");
                    return;
                }
                DataRow row = dt.Rows[0];
                txtInspectionTypeCode.Text = Convert.ToString(row["InspectionTypeCode"]);
                txtInspectionTypeName.Text = Convert.ToString(row["InspectionTypeName"]);
                txtSectionID.Text = Convert.ToString(row["SectionID"]);
                chkHeaderActive.Checked = Convert.ToBoolean(row["IsActive"]);
            }
            txtIsNew.Text = "0";
            txtInspectionTypeCode.ReadOnly = true;
            txtInspectionTypeName.ReadOnly = txtSectionID.ReadOnly = false;
            Master.TB_VisibleButton(ToolbarItem_2.Save, true);
            Master.TB_VisibleButton(ToolbarItem_2.Delete, true);
            _RefreshDetails();
            GF.ShowPanel(ref pnlDetails, true);
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
                    new SqlParameter("@p_H_SectionID", txtSectionID.Text.Trim()), new SqlParameter("@p_H_IsActive", chkHeaderActive.Checked),
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
                    new SqlParameter("@p_H_SectionID", txtSectionID.Text.Trim()), new SqlParameter("@p_H_IsActive", chkHeaderActive.Checked),
                    new SqlParameter("@p_D_InspectionTypeDetailCode", ""), new SqlParameter("@p_D_InspectionTypeDetailName", ""),
                    new SqlParameter("@p_D_ScheduleTime", ""), new SqlParameter("@p_D_IsActive", false),
                    new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
                }, true);
            _PrepareScreen();
            return true;
        }

        private bool _SaveDetail()
        {
            if (txtInspectionTypeCode.Text.Trim() == "" || txtIsNew.Text == "1") { GF.MsgBox_2(this, "Save or select an Inspection Type header first."); return false; }
            string code = txtDetailCode.Text.Trim().ToUpperInvariant(), name = txtDetailName.Text.Trim();
            string time = (hidScheduleTimes.Value ?? "").Trim();
            string[] times = time.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim()).Distinct().OrderBy(x => x).ToArray();
            if (code == "" || name == "" || times.Length == 0) { GF.MsgBox_2(this, "Detail Code, Description and at least one Schedule Time are required."); return false; }
            if (times.Any(x => !System.Text.RegularExpressions.Regex.IsMatch(x, @"^([01]\\d|2[0-3]):[0-5]\\d$")))
            { GF.MsgBox_2(this, "Schedule Time must use HH:mm format."); return false; }
            time = String.Join(";", times);
            hidScheduleTimes.Value = time;
            string type = txtDetailOriginalCode.Text.Trim() == "" ? "1" : "2";
            using (var br = new WAL.BR.CF())
                br.EQueryP("spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType", new SqlParameter[] {
                    new SqlParameter("@p_H_Tipe", ""), new SqlParameter("@p_D_Tipe", type),
                    new SqlParameter("@p_H_InspectionTypeCode", txtInspectionTypeCode.Text.Trim()),
                    new SqlParameter("@p_H_InspectionTypeName", ""), new SqlParameter("@p_H_SectionID", ""),
                    new SqlParameter("@p_H_IsActive", false), new SqlParameter("@p_D_InspectionTypeDetailCode", code),
                    new SqlParameter("@p_D_InspectionTypeDetailName", name), new SqlParameter("@p_D_ScheduleTime", time),
                    new SqlParameter("@p_D_IsActive", chkDetailActive.Checked), new SqlParameter("@p_UpdateUser", Master.Mn_EmployeeID)
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
            txtDetailCode.Text = txtDetailName.Text = "";\n            hidScheduleTimes.Value = "";
            txtDetailCode.ReadOnly = false;
            chkDetailActive.Checked = true;
        }

        private void _RefreshDetails()
        {
            if (txtInspectionTypeCode.Text.Trim() == "") { gridData.DataSource = null; gridData.DataBind(); return; }
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
    }
}