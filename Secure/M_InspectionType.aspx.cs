using System;
using System.Data;
using System.Data.SqlClient;
using System.Web.UI.WebControls;
using WAL;

namespace UTL1.Secure
{
    public partial class M_InspectionType : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            if (!IsPostBack)
            {
                ResetHeader();
                BindHeaders();
                BindDetails();
            }
        }

        private string CurrentCode { get { return txtInspectionTypeCode.Text.Trim().ToUpperInvariant(); } }

        private void ShowMessage(string message, bool error)
        {
            lblMessage.Text = message;
            lblMessage.CssClass = error ? "small d-block mb-2 text-danger" : "small d-block mb-2 text-success";
        }

        private void BindHeaders(string selectedCode = null)
        {
            using (var br = new WAL.BR.CF())
            {
                gridHeader.DataSource = br.EQueryP("SELECT InspectionTypeCode, InspectionTypeName, SectionID, IsActive FROM dbo.PIP_M_InspectionType ORDER BY InspectionTypeCode");
                gridHeader.DataBind();
            }
            if (!String.IsNullOrEmpty(selectedCode))
            {
                for (int i = 0; i < gridHeader.Rows.Count; i++)
                    if (Convert.ToString(gridHeader.DataKeys[i].Value) == selectedCode)
                    {
                        gridHeader.SelectedIndex = i;
                        break;
                    }
            }
        }

        private void BindDetails(string selectedDetailCode = null)
        {
            if (String.IsNullOrEmpty(CurrentCode))
            {
                gridDetail.DataSource = null;
                gridDetail.DataBind();
                pnlDetail.Enabled = false;
                return;
            }

            pnlDetail.Enabled = true;
            using (var br = new WAL.BR.CF())
            {
                gridDetail.DataSource = br.EQueryP(
                    "SELECT InspectionTypeDetailCode, InspectionTypeDetailName, ScheduleTime, IsActive FROM dbo.PIP_M_InspectionTypeDetail WHERE InspectionTypeCode=@Code ORDER BY ScheduleTime, InspectionTypeDetailCode",
                    new SqlParameter[] { new SqlParameter("@Code", CurrentCode) });
                gridDetail.DataBind();
            }
            if (!String.IsNullOrEmpty(selectedDetailCode))
                for (int i = 0; i < gridDetail.Rows.Count; i++)
                    if (Convert.ToString(gridDetail.DataKeys[i].Value) == selectedDetailCode)
                    {
                        gridDetail.SelectedIndex = i;
                        break;
                    }
        }

        private void ResetHeader()
        {
            txtInspectionTypeCode.Text = "";
            txtInspectionTypeName.Text = "";
            txtSectionID.Text = "";
            chkHeaderActive.Checked = true;
            txtInspectionTypeCode.ReadOnly = false;
            gridHeader.SelectedIndex = -1;
            ResetDetail();
        }

        private void ResetDetail()
        {
            txtDetailCode.Text = "";
            txtDetailName.Text = "";
            txtScheduleTime.Text = "";
            chkDetailActive.Checked = true;
            txtDetailCode.ReadOnly = false;
            gridDetail.SelectedIndex = -1;
        }

        protected void btnNewHeader_Click(object sender, EventArgs e)
        {
            ResetHeader();
            BindDetails();
            ShowMessage("", false);
        }

        protected void btnSaveHeader_Click(object sender, EventArgs e)
        {
            string code = CurrentCode;
            if (code.Length == 0 || code.Length > 2 || txtInspectionTypeName.Text.Trim() == "" || txtSectionID.Text.Trim() == "")
            {
                ShowMessage("Type Code (maks. 2 karakter), Type Name, dan Section ID wajib diisi.", true);
                return;
            }

            string type = txtInspectionTypeCode.ReadOnly ? "2" : "1";
            try
            {
                using (var br = new WAL.BR.CF())
                {
                    br.EQueryP("dbo.spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType", new SqlParameter[]
                    {
                        new SqlParameter("@p_H_Tipe", type), new SqlParameter("@p_D_Tipe", ""),
                        new SqlParameter("@p_H_InspectionTypeCode", code),
                        new SqlParameter("@p_H_InspectionTypeName", txtInspectionTypeName.Text.Trim()),
                        new SqlParameter("@p_H_SectionID", txtSectionID.Text.Trim()),
                        new SqlParameter("@p_H_IsActive", chkHeaderActive.Checked),
                        new SqlParameter("@p_D_InspectionTypeDetailCode", ""),
                        new SqlParameter("@p_D_InspectionTypeDetailName", ""),
                        new SqlParameter("@p_D_ScheduleTime", "00:00"),
                        new SqlParameter("@p_D_IsActive", true),
                        new SqlParameter("@p_UpdateUser", "SYSTEM")
                    }, true);
                }
                txtInspectionTypeCode.ReadOnly = true;
                BindHeaders(code);
                BindDetails();
                ShowMessage("Header berhasil disimpan.", false);
            }
            catch (Exception ex) { ShowMessage(ex.Message, true); }
        }

        protected void btnDeleteHeader_Click(object sender, EventArgs e)
        {
            if (CurrentCode == "") { ShowMessage("Pilih header terlebih dahulu.", true); return; }
            try
            {
                using (var br = new WAL.BR.CF())
                    br.EQueryP("dbo.spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType", new SqlParameter[]
                    {
                        new SqlParameter("@p_H_Tipe", "3"), new SqlParameter("@p_D_Tipe", ""),
                        new SqlParameter("@p_H_InspectionTypeCode", CurrentCode),
                        new SqlParameter("@p_H_InspectionTypeName", txtInspectionTypeName.Text),
                        new SqlParameter("@p_H_SectionID", txtSectionID.Text),
                        new SqlParameter("@p_H_IsActive", false),
                        new SqlParameter("@p_D_InspectionTypeDetailCode", ""),
                        new SqlParameter("@p_D_InspectionTypeDetailName", ""),
                        new SqlParameter("@p_D_ScheduleTime", "00:00"),
                        new SqlParameter("@p_D_IsActive", true),
                        new SqlParameter("@p_UpdateUser", "SYSTEM")
                    }, true);
                ResetHeader(); BindHeaders(); BindDetails(); ShowMessage("Header dinonaktifkan.", false);
            }
            catch (Exception ex) { ShowMessage(ex.Message, true); }
        }

        protected void gridHeader_SelectedIndexChanged(object sender, EventArgs e)
        {
            string code = Convert.ToString(gridHeader.SelectedDataKey.Value);
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQueryP("SELECT InspectionTypeCode, InspectionTypeName, SectionID, IsActive FROM dbo.PIP_M_InspectionType WHERE InspectionTypeCode=@Code",
                    new SqlParameter[] { new SqlParameter("@Code", code) });
                if (dt.Rows.Count > 0)
                {
                    txtInspectionTypeCode.Text = Convert.ToString(dt.Rows[0]["InspectionTypeCode"]);
                    txtInspectionTypeName.Text = Convert.ToString(dt.Rows[0]["InspectionTypeName"]);
                    txtSectionID.Text = Convert.ToString(dt.Rows[0]["SectionID"]);
                    chkHeaderActive.Checked = Convert.ToBoolean(dt.Rows[0]["IsActive"]);
                    txtInspectionTypeCode.ReadOnly = true;
                }
            }
            ResetDetail(); BindDetails(); ShowMessage("", false);
        }

        protected void btnNewDetail_Click(object sender, EventArgs e) { ResetDetail(); }

        protected void btnSaveDetail_Click(object sender, EventArgs e)
        {
            if (CurrentCode == "") { ShowMessage("Simpan/pilih header terlebih dahulu.", true); return; }
            TimeSpan parsedTime;
            if (txtDetailCode.Text.Trim() == "" || txtDetailName.Text.Trim() == "" ||
                !TimeSpan.TryParse(txtScheduleTime.Text, out parsedTime) || parsedTime < TimeSpan.Zero || parsedTime >= TimeSpan.FromDays(1))
            {
                ShowMessage("Detail Code, Description, dan Schedule Time wajib valid.", true); return;
            }
            try
            {
                using (var br = new WAL.BR.CF())
                    br.EQueryP("dbo.spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType", new SqlParameter[]
                    {
                        new SqlParameter("@p_H_Tipe", ""), new SqlParameter("@p_D_Tipe", txtDetailCode.ReadOnly ? "2" : "1"),
                        new SqlParameter("@p_H_InspectionTypeCode", CurrentCode),
                        new SqlParameter("@p_H_InspectionTypeName", txtInspectionTypeName.Text),
                        new SqlParameter("@p_H_SectionID", txtSectionID.Text),
                        new SqlParameter("@p_H_IsActive", chkHeaderActive.Checked),
                        new SqlParameter("@p_D_InspectionTypeDetailCode", txtDetailCode.Text.Trim().ToUpperInvariant()),
                        new SqlParameter("@p_D_InspectionTypeDetailName", txtDetailName.Text.Trim()),
                        new SqlParameter("@p_D_ScheduleTime", parsedTime.ToString(@"hh\:mm")),
                        new SqlParameter("@p_D_IsActive", chkDetailActive.Checked),
                        new SqlParameter("@p_UpdateUser", "SYSTEM")
                    }, true);
                string savedCode = txtDetailCode.Text.Trim().ToUpperInvariant();
                ResetDetail(); BindDetails(savedCode); ShowMessage("Detail berhasil disimpan.", false);
            }
            catch (Exception ex) { ShowMessage(ex.Message, true); }
        }

        protected void gridDetail_SelectedIndexChanged(object sender, EventArgs e)
        {
            string detailCode = Convert.ToString(gridDetail.SelectedDataKey.Value);
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQueryP("SELECT InspectionTypeDetailCode, InspectionTypeDetailName, ScheduleTime, IsActive FROM dbo.PIP_M_InspectionTypeDetail WHERE InspectionTypeCode=@Code AND InspectionTypeDetailCode=@DetailCode",
                    new SqlParameter[] { new SqlParameter("@Code", CurrentCode), new SqlParameter("@DetailCode", detailCode) });
                if (dt.Rows.Count > 0)
                {
                    txtDetailCode.Text = Convert.ToString(dt.Rows[0]["InspectionTypeDetailCode"]);
                    txtDetailName.Text = Convert.ToString(dt.Rows[0]["InspectionTypeDetailName"]);
                    txtScheduleTime.Text = Convert.ToDateTime(dt.Rows[0]["ScheduleTime"]).ToString("HH:mm");
                    chkDetailActive.Checked = Convert.ToBoolean(dt.Rows[0]["IsActive"]);
                    txtDetailCode.ReadOnly = true;
                }
            }
        }

        protected void gridDetail_RowCommand(object sender, GridViewCommandEventArgs e)
        {
            if (e.CommandName != "DeleteDetail") return;
            int index = Convert.ToInt32(e.CommandArgument);
            string detailCode = Convert.ToString(gridDetail.DataKeys[index].Value);
            try
            {
                using (var br = new WAL.BR.CF())
                    br.EQueryP("dbo.spPIP_InsertUpdateDeleteInput_PIP_M_HD_InspectionType", new SqlParameter[]
                    {
                        new SqlParameter("@p_H_Tipe", ""), new SqlParameter("@p_D_Tipe", "3"),
                        new SqlParameter("@p_H_InspectionTypeCode", CurrentCode),
                        new SqlParameter("@p_H_InspectionTypeName", txtInspectionTypeName.Text),
                        new SqlParameter("@p_H_SectionID", txtSectionID.Text),
                        new SqlParameter("@p_H_IsActive", chkHeaderActive.Checked),
                        new SqlParameter("@p_D_InspectionTypeDetailCode", detailCode),
                        new SqlParameter("@p_D_InspectionTypeDetailName", ""),
                        new SqlParameter("@p_D_ScheduleTime", "00:00"),
                        new SqlParameter("@p_D_IsActive", false),
                        new SqlParameter("@p_UpdateUser", "SYSTEM")
                    }, true);
                ResetDetail(); BindDetails(); ShowMessage("Detail dihapus.", false);
            }
            catch (Exception ex) { ShowMessage(ex.Message, true); }
        }
    }
}