using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

using System.Collections;
using System.Data;
using System.Diagnostics;
using System.Data.SqlClient;
using System.Collections.Generic;
using WAL;

namespace UTL1.BRC
{
    public class PIP_T_WO : WAL.BR.BRInteractionBase
    {
        #region " Main Functions "

        public DataTable SelectOneByKeyHD(SqlConnection conn = null, SqlTransaction Trans = null)
        {
            SqlCommand cmdToExecute = new SqlCommand();
            cmdToExecute.CommandText = @"
SELECT A.*, 
StartTime = ISNULL((SELECT StartDate FROM PIP_T_H_WO_Employee B WHERE B.KeyHD=A.KeyHD),CAST('' AS DATETIME)),
EndTime = ISNULL((SELECT EndDate FROM PIP_T_H_WO_Employee B WHERE B.KeyHD=A.KeyHD),CAST('' AS DATETIME))
FROM PIP_T_WO A WHERE A.KeyHD = @KeyHD AND A.IsDelete = 0 
";
            cmdToExecute.CommandType = CommandType.Text;
            DataTable toReturn = new DataTable("PIP_T_WO");
            SqlDataAdapter adapter = new SqlDataAdapter(cmdToExecute);

            SqlConnection _conn;
            SqlTransaction _trans;
            if (conn == null)
            {
                _mainConnection.Open();
                _conn = _mainConnection;
                _trans = _transaction;
            }
            else
            {
                _conn = conn;
                _trans = Trans;
            }

            try
            {
                cmdToExecute.Connection = _conn;
                cmdToExecute.Transaction = _trans;
                cmdToExecute.Parameters.AddWithValue("@KeyHD", KeyHD);

                // // Execute query.                
                adapter.Fill(toReturn);

                if (toReturn.Rows.Count > 0)
                {
                    KeyHD = Convert.ToInt32(toReturn.Rows[0]["KeyHD"]);
                    CompanyID = (string)toReturn.Rows[0]["CompanyID"];
                    LocationID = (string)toReturn.Rows[0]["LocationID"];
                    WONo = (string)toReturn.Rows[0]["WONo"];
                    WODate = (DateTime)toReturn.Rows[0]["WODate"];
                    StartDate = (DateTime)toReturn.Rows[0]["StartDate"];
                    JONo = (string)toReturn.Rows[0]["JONo"];
                    PMType = (string)toReturn.Rows[0]["PMType"];
                    WOType = (string)toReturn.Rows[0]["WOType"];
                    Description = (string)toReturn.Rows[0]["Description"];
                    LocationNo = (string)toReturn.Rows[0]["LocationNo"];
                    ProfitCenterNo = (string)toReturn.Rows[0]["ProfitCenterNo"];
                    SectionID = (string)toReturn.Rows[0]["SectionID"];
                    RequestedBy = (string)toReturn.Rows[0]["RequestedBy"];
                    CompletedBy = (string)toReturn.Rows[0]["CompletedBy"];
                    CompletedDate = (DateTime)toReturn.Rows[0]["CompletedDate"];
                    CancelReason = (string)toReturn.Rows[0]["CancelReason"];
                    SIIAmount = (decimal)toReturn.Rows[0]["SIIAmount"];
                    IsDelete = (bool)toReturn.Rows[0]["IsDelete"];
                    IsJO = (bool)toReturn.Rows[0]["IsJO"];
                    IsApproved = (bool)toReturn.Rows[0]["IsApproved"];
                    IsPrint = (bool)toReturn.Rows[0]["IsPrint"];
                    ApprovedUser = (string)toReturn.Rows[0]["ApprovedUser"];
                    ApprovedDate = (DateTime)toReturn.Rows[0]["ApprovedDate"];
                    EntryUser = (string)toReturn.Rows[0]["EntryUser"];
                    EntryDate = (DateTime)toReturn.Rows[0]["EntryDate"];
                    UpdateUser = (string)toReturn.Rows[0]["UpdateUser"];
                    UpdateDate = (DateTime)toReturn.Rows[0]["UpdateDate"];
                    RePrint = (byte)toReturn.Rows[0]["RePrint"];
                    Feedback1 = (byte)toReturn.Rows[0]["Feedback1"];
                    Feedback2 = (byte)toReturn.Rows[0]["Feedback2"];
                    Feedback3 = (byte)toReturn.Rows[0]["Feedback3"];
                    Feedback4 = (byte)toReturn.Rows[0]["Feedback4"];
                    Feedback5 = (byte)toReturn.Rows[0]["Feedback5"];
                    EquipmentCode = (string)toReturn.Rows[0]["EquipmentCode"];
                    SectionIDUser = (string)toReturn.Rows[0]["SectionIDUser"];
                    isApprovedDH = (bool)toReturn.Rows[0]["isApprovedDH"];
                    ApprovedDHUser = (string)toReturn.Rows[0]["ApprovedDHUser"];
                    ApprovedDHDate = (DateTime)toReturn.Rows[0]["ApprovedDHDate"];
                    ReasonDH = (string)toReturn.Rows[0]["ReasonDH"];
                    isApprovedHelpDesk = (bool)toReturn.Rows[0]["isApprovedHelpDesk"];
                    ApprovedHelpDeskUser = (string)toReturn.Rows[0]["ApprovedHelpDeskUser"];
                    ApprovedHelpDeskDate = (DateTime)toReturn.Rows[0]["ApprovedHelpDeskDate"];
                    ReasonHelpDesk = (string)toReturn.Rows[0]["ReasonHelpDesk"];
                    isRespondDC = (bool)toReturn.Rows[0]["isRespondDC"];
                    ApprovedRespondDCUser = (string)toReturn.Rows[0]["ApprovedRespondDCUser"];
                    ApprovedRespondDCDate = (DateTime)toReturn.Rows[0]["ApprovedRespondDCDate"];
                    ReasonRespondDC = (string)toReturn.Rows[0]["ReasonRespondDC"];
                    isCompleteDC = (bool)toReturn.Rows[0]["isCompleteDC"];
                    ReasonDC = (string)toReturn.Rows[0]["ReasonDC"];
                    LastStatusTransaction = (string)toReturn.Rows[0]["LastStatusTransaction"];
                    isCompletedUser = (bool)toReturn.Rows[0]["isCompletedUser"];
                    CompletedUser = (string)toReturn.Rows[0]["CompletedUser"];
                    CompletedDateUser = (DateTime)toReturn.Rows[0]["CompletedDateUser"];
                    ReasonUser = (string)toReturn.Rows[0]["ReasonUser"];
                    RemarkTechnician = GF.GetString(toReturn.Rows[0]["RemarkTechnician"]);
                    FollowUpRemark = GF.GetString(toReturn.Rows[0]["FollowUpRemark"]);
                    FollowUpSection = GF.GetString(toReturn.Rows[0]["FollowUpSection"]);
                    IsFollowUp = GF.GetBoolean(toReturn.Rows[0]["IsFollowUp"]);
                    StartTime = GF.GetDateTime(toReturn.Rows[0]["StartTime"]);
                    EndTime = GF.GetDateTime(toReturn.Rows[0]["EndTime"]);
                }

                return toReturn;
            }
            catch (Exception ex)
            {
                // // some error occured. Bubble it to caller and encapsulate Exception object                
                throw new Exception(ex.Message);
            }
            finally
            {
                // // Close connection.                
                if (conn == null)
                    _mainConnection.Close();
                cmdToExecute.Dispose();
                adapter.Dispose();
            }
        }

        #endregion

        #region " Custom Functions "
        public bool UpdateWO_1(string reasonSpv, string remarkSpv, string userId)
        {
            WAL.BR.CF oCommonFunction = new WAL.BR.CF();
            SqlCommand cmdToExecute = new SqlCommand();
            cmdToExecute.CommandText = "spUTL_WO_CheckList";
            cmdToExecute.CommandType = CommandType.StoredProcedure;

            _mainConnection.Open();
            Begintrans();

            try
            {
                cmdToExecute.Connection = _mainConnection;
                cmdToExecute.Transaction = _transaction;

                SelectOneByKeyHD(_mainConnection, _transaction);

                DataTable V_tblTmp_1 = new DataTable();
                for (int i = 1; i <= 13; i++)
                {
                    V_tblTmp_1.Columns.Add("C" + i + "", typeof(System.String));
                }
                DataTable V_tblTmp_2 = new DataTable();
                for (int i = 1; i <= 4; i++)
                {
                    V_tblTmp_2.Columns.Add("C" + i + "", typeof(System.String));
                }
                DataTable V_tblTmp_3 = new DataTable();
                for (int i = 1; i <= 4; i++)
                {
                    V_tblTmp_3.Columns.Add("C" + i + "", typeof(System.String));
                }
                DataTable V_tblTmp_4 = new DataTable();
                for (int i = 1; i <= 10; i++)
                {
                    V_tblTmp_4.Columns.Add("C" + i + "", typeof(System.String));
                }
                DataRow row = V_tblTmp_4.NewRow();
                row["C1"] = KeyHD;
                row["C2"] = RemarkTechnician;
                row["C3"] = (IsFollowUp ? "Recommend Follow Up" : "");
                row["C4"] = remarkSpv;
                row["C5"] = (reasonSpv == "" ? "APPROVED" : "VOID");
                row["C6"] = reasonSpv;
                row["C7"] = FollowUpSection;
                row["C8"] = FollowUpRemark;
                row["C9"] = StartTime.ToString("yyyy-MM-dd HH:mm:ss");
                row["C10"] = EndTime.ToString("yyyy-MM-dd HH:mm:ss");
                V_tblTmp_4.Rows.Add(row);

                cmdToExecute.Parameters.AddWithValue("@p_dt1", V_tblTmp_1);
                cmdToExecute.Parameters.AddWithValue("@p_dt2", V_tblTmp_2);
                cmdToExecute.Parameters.AddWithValue("@p_dt3", V_tblTmp_3);
                cmdToExecute.Parameters.AddWithValue("@p_dt4", V_tblTmp_4);
                cmdToExecute.Parameters.AddWithValue("@p_UpdateUser", userId);

                cmdToExecute.ExecuteNonQuery();

                CommitTrans();
                return true;

            }
            catch (Exception ex)
            {
                // // Rollback all changes                
                RollBackTrans();
                // // some error occured. Bubble it to caller and encapsulate Exception object                
                throw new Exception(ex.Message);
            }
            finally
            {
                Dispose();
                cmdToExecute.Dispose();
                oCommonFunction.Dispose();
                oCommonFunction = null;
            }

        }
        public bool UpdateWO(DataTable dtCheckLists, DataTable dtCheckListGroups, DataTable dtPhotos, DataTable dtSummary)
        {
            _mainConnection.Open();
            Begintrans();

            // SQL transactions cannot roll back filesystem changes. Keep byte-for-byte copies
            // of each affected WO photo folder outside the web-served upload tree until commit.
            string photoRollbackRoot = System.IO.Path.Combine(
                System.IO.Path.GetTempPath(), "UTL_WO_SYNC_ROLLBACK_" + Guid.NewGuid().ToString("N"));
            var originalFilesByFolder = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
            var backupFilesByOriginalPath = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var filesWrittenByThisSync = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            bool commitAttempted = false;

            try
            {
                DataTable V_tblTmp_1 = new DataTable();
                for (int i = 1; i <= 13; i++)
                {
                    V_tblTmp_1.Columns.Add("C" + i + "", typeof(System.String));
                }
                foreach (DataRow r in dtCheckLists.Rows)
                {
                    DataRow row = V_tblTmp_1.NewRow();
                    row["C1"] = r["KeyHD"].ToString();
                    row["C2"] = r["IDItem"].ToString();
                    row["C3"] = r["Value"].ToString();
                    row["C4"] = (r.Table.Columns.Contains("Remark1") ? r["Remark1"] : r["Remark"]).ToString();
                    row["C5"] = r["IsAnomali"].ToString();
                    row["C6"] = r.Table.Columns.Contains("Remark2") ? r["Remark2"].ToString() : "";
                    V_tblTmp_1.Rows.Add(row);
                }
                DataTable V_tblTmp_2 = new DataTable();
                for (int i = 1; i <= 4; i++)
                {
                    V_tblTmp_2.Columns.Add("C" + i + "", typeof(System.String));
                }
                foreach (DataRow r in dtCheckListGroups.Rows)
                {
                    DataRow row = V_tblTmp_2.NewRow();
                    row["C1"] = r["KeyHD"].ToString();
                    row["C2"] = r["IDItem"].ToString();
                    row["C3"] = r["FieldName"].ToString();
                    row["C4"] = r["Value"].ToString();
                    V_tblTmp_2.Rows.Add(row);
                }
                DataTable V_tblTmp_3 = new DataTable();
                for (int i = 1; i <= 4; i++)
                {
                    V_tblTmp_3.Columns.Add("C" + i + "", typeof(System.String));
                }
                foreach (DataRow r in dtPhotos.Rows)
                {
                    DataRow row = V_tblTmp_3.NewRow();
                    row["C1"] = r["KeyHD"].ToString();
                    row["C2"] = r["Type"].ToString();
                    row["C3"] = r["FileName"].ToString();
                    row["C4"] = r["OrderNo"].ToString();
                    //row["C5"] = r["Base64"].ToString();
                    V_tblTmp_3.Rows.Add(row);
                }
                DataTable V_tblTmp_4 = new DataTable();
                for (int i = 1; i <= 10; i++)
                {
                    V_tblTmp_4.Columns.Add("C" + i + "", typeof(System.String));
                }
                foreach (DataRow r in dtSummary.Rows)
                {
                    DataRow row = V_tblTmp_4.NewRow();
                    row["C1"] = r["KeyHD"].ToString();
                    row["C2"] = r["Summary"].ToString();
                    row["C3"] = r["FollowUp"].ToString();
                    row["C4"] = r["RemarkSPV"].ToString();
                    row["C5"] = r["ActionSPV"].ToString();
                    row["C6"] = r["Reason"].ToString();
                    row["C7"] = r["FollowUpSection"].ToString();
                    row["C8"] = r["FollowUpRemark"].ToString();
                    row["C9"] = r["StartTime"].ToString();
                    row["C10"] = r["EndTime"].ToString();
                    V_tblTmp_4.Rows.Add(row);
                }

                using (WAL.BR.CF ocf = new WAL.BR.CF())
                {
                    DataSet v_ds = ocf.EQueryP_DS("spUTL_WO_CheckList",
                    new SqlParameter[] 
                        { 
                            new SqlParameter("@p_dt1", V_tblTmp_1), 
                            new SqlParameter("@p_dt2", V_tblTmp_2), 
                            new SqlParameter("@p_dt3", V_tblTmp_3), 
                            new SqlParameter("@p_dt4", V_tblTmp_4), 
                            new SqlParameter("@p_UpdateUser", UpdateUser)
                        }, true, ref _mainConnection, ref _transaction);
                    DataTable v_dt = v_ds.Tables[0];
                    var distinctQuery = (from row in v_dt.AsEnumerable()
                                         select new
                                         {
                                             CompanyID = row.Field<string>("CompanyID"),
                                             LocationID = row.Field<string>("LocationID"),
                                             DocNo = row.Field<string>("DocNo")
                                         }).Distinct();
                    foreach (var item in distinctQuery)
                    {
                        string v_root = HttpContext.Current.Request.ApplicationPath.Replace("/", "").Replace(PB.AppID, "PIP");
                        string pathupload = PB.Path_WebFolder1 + v_root + "\\PIP_T_WO\\" + item.CompanyID + "_" + item.LocationID + "\\" + GF.Left(item.DocNo, 6) + "\\" + item.DocNo + "\\";

                        if (!System.IO.Directory.Exists(pathupload))
                            //System.IO.Directory.Delete(pathupload, true);
                            System.IO.Directory.CreateDirectory(pathupload);

                        // Snapshot the complete original folder before any physical photo is deleted/replaced.
                        if (!originalFilesByFolder.ContainsKey(pathupload))
                        {
                            string[] originalFiles = System.IO.Directory.GetFiles(pathupload);
                            var originalSet = new HashSet<string>(originalFiles, StringComparer.OrdinalIgnoreCase);
                            originalFilesByFolder[pathupload] = originalSet;
                            string backupFolder = System.IO.Path.Combine(photoRollbackRoot, originalFilesByFolder.Count.ToString());
                            foreach (string originalPath in originalFiles)
                            {
                                System.IO.Directory.CreateDirectory(backupFolder);
                                string backupPath = System.IO.Path.Combine(backupFolder, System.IO.Path.GetFileName(originalPath));
                                System.IO.File.Copy(originalPath, backupPath, true);
                                backupFilesByOriginalPath[originalPath] = backupPath;
                            }
                        }

                        // cleanup files
                        var validFiles = new HashSet<string>(
                            v_dt.AsEnumerable()
                                .Select(row => (row.Field<string>("FileName") ?? "") + "." + (row.Field<string>("FileType") ?? ""))
                                .Where(name => !string.IsNullOrEmpty(name)),
                            StringComparer.OrdinalIgnoreCase
                        );
                        string[] physicalFiles = System.IO.Directory.GetFiles(pathupload);
                        string typeFile = (V_tblTmp_1.Rows.Count == 0 ? "WO3" : "WO1,WO2");
                        foreach (string filePath in physicalFiles)
                        {
                            string fileNameWithExt = System.IO.Path.GetFileName(filePath);
                            DataTable dt = ocf.EQuery("SELECT * FROM PIP_T_DocumentAttachment " +
                            "WHERE CompanyID=@CompanyID AND LocationID=@LocationID AND DocNo=@DocNo " +
                            "AND [FileName]+'.'+[FileType]=@FileNameType AND Type IN ('WO1','WO2','WO3')",
                            "@CompanyID=" + item.CompanyID + GF.Str2 +
                            "@LocationID=" + item.LocationID + GF.Str2 +
                            "@DocNo=" + item.DocNo + GF.Str2 +
                            "@FileNameType=" + fileNameWithExt, false, ref _mainConnection, ref _transaction);
                            if (dt.Rows.Count == 0)
                            {
                                try
                                {
                                    System.IO.File.Delete(filePath);
                                }
                                catch (Exception ex)
                                {
                                }

                            }
                            //if (!validFiles.Contains(fileNameWithExt))
                            //{
                            //}

                        }

                        var joinMethod = v_dt.AsEnumerable().Join(
                                                    dtPhotos.AsEnumerable(),
                                                    t1 => new { Key1 = t1.Field<int>("KeyHD").ToString(), Key2 = t1.Field<string>("Type"), Key3 = t1.Field<string>("Alias") + "." + t1.Field<string>("FileType") },
                                                    t2 => new { Key1 = t2.Field<string>("KeyHD"), Key2 = t2.Field<string>("Type"), Key3 = t2.Field<string>("FileName") }, 
                                                    (t1, t2) => new { t1, t2 })
                                                    .Where(a => a.t1.Field<string>("CompanyID").Equals(item.CompanyID) &&
                                                                a.t1.Field<string>("LocationID").Equals(item.LocationID) &&
                                                                a.t1.Field<string>("DocNo").Equals(item.DocNo))
                                                    .Select(b => new
                                                    {
                                                        // Ubah t1 menjadi b.t1 dan t2 menjadi b.t2
                                                        FileName = b.t1.Field<string>("FileName"),
                                                        FileType = b.t1.Field<string>("FileType"),
                                                        Base64 = b.t2.Field<string>("Base64") // Jika ini data base64 string, pastikan tipenya string, bukan decimal
                                                    });
                        foreach (var item1 in joinMethod)
                        {
                            // remove header
                            try
                            {
                                int idx = item1.Base64.IndexOf(",");
                                string base64 = item1.Base64;
                                if (idx >= 0)
                                {
                                    base64 = base64.Substring(idx + 1);
                                }
                                string targetPhotoPath = System.IO.Path.Combine(pathupload, (item1.FileName + "." + item1.FileType));
                                filesWrittenByThisSync.Add(targetPhotoPath);
                                System.IO.File.WriteAllBytes(
                                    targetPhotoPath,
                                    Convert.FromBase64String(base64)
                                );

                            }
                            catch (Exception ex)
                            {
                                throw new Exception(
                                    "Write Photo Failed\n" +
                                    "FileName : " + item1.FileName + "\n" +
                                    "FileType : " + item1.FileType + "\n" +
                                    "Base64 Length : " + item1.Base64.Length + "\n\n" +
                                    ex.ToString());
                            }
                        }

                        v_dt = v_ds.Tables[1];
                        for (int i = 0; i <= v_dt.Rows.Count - 1; i++)
                        {
                            if (!GF.SendEmail(Convert.ToString(v_dt.Rows[i]["EmailAddressFrom"]),
                                              Convert.ToString(v_dt.Rows[i]["From"]),
                                              Convert.ToString(v_dt.Rows[i]["EmailAddressTo"]),
                                              Convert.ToString(v_dt.Rows[i]["Subject"]),
                                              Convert.ToString(v_dt.Rows[i]["FormEmail"]),
                                              "",
                                              Convert.ToString(v_dt.Rows[i]["BCC_EmailAddress"])))
                            {
                                if (i == 0)
                                {
                                    throw new Exception("Sent email Failed.");
                                }
                            }
                            
                        }

                    }

                }
                commitAttempted = true;
                CommitTrans();

                // Once SQL and photo writes are committed, backup cleanup is best-effort only.
                try
                {
                    if (System.IO.Directory.Exists(photoRollbackRoot))
                        System.IO.Directory.Delete(photoRollbackRoot, true);
                }
                catch (Exception cleanupError)
                {
                    Trace.TraceWarning("WO sync committed, but temporary photo backups remain at {0}: {1}",
                        photoRollbackRoot, cleanupError.Message);
                }
                return true;
            }
            catch (Exception ex)
            {
                Exception transactionRollbackError = null;
                try { RollBackTrans(); }
                catch (Exception rollbackError) { transactionRollbackError = rollbackError; }

                Exception photoRestoreError = null;
                // If CommitTrans was attempted but threw, the commit outcome is uncertain even if
                // RollBackTrans returns. Preserve both current files and backups for manual reconciliation.
                if (commitAttempted && transactionRollbackError == null)
                {
                    photoRestoreError = new Exception("SQL commit outcome is uncertain; photo files were left unchanged.");
                }
                // If SQL rollback itself failed, its commit state is unknown. Do not guess which
                // version of the photos matches the database: retain current files and backups.
                else if (transactionRollbackError == null)
                {
                    try
                    {
                        // Remove only photo paths this request attempted to write (never unrelated
                        // files created concurrently), then restore originals from the snapshot.
                        foreach (string writtenPath in filesWrittenByThisSync)
                        {
                            string folder = System.IO.Path.GetDirectoryName(writtenPath);
                            HashSet<string> originalSet;
                            if (originalFilesByFolder.TryGetValue(folder, out originalSet) && originalSet.Contains(writtenPath))
                                continue;
                            if (System.IO.File.Exists(writtenPath))
                                System.IO.File.Delete(writtenPath);
                        }
                        foreach (KeyValuePair<string, string> backup in backupFilesByOriginalPath)
                        {
                            if (!System.IO.File.Exists(backup.Value))
                                throw new Exception("Missing temporary backup for " + backup.Key);
                            System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(backup.Key));
                            System.IO.File.Copy(backup.Value, backup.Key, true);
                        }
                    }
                    catch (Exception restoreError)
                    {
                        photoRestoreError = restoreError;
                    }
                }

                if (transactionRollbackError == null && photoRestoreError == null)
                {
                    try
                    {
                        if (System.IO.Directory.Exists(photoRollbackRoot))
                            System.IO.Directory.Delete(photoRollbackRoot, true);
                    }
                    catch (Exception cleanupError)
                    {
                        Trace.TraceWarning("WO rollback completed, but temporary photo backups remain at {0}: {1}",
                            photoRollbackRoot, cleanupError.Message);
                    }
                }

                if (transactionRollbackError != null || photoRestoreError != null)
                {
                    string backupNote = System.IO.Directory.Exists(photoRollbackRoot)
                        ? " Temporary photo backups retained at: " + photoRollbackRoot
                        : "";
                    throw new Exception(
                        "WO sync failed and rollback/restore needs manual verification." + backupNote +
                        " Original error: " + ex.Message,
                        new AggregateException(
                            new Exception("SQL rollback", transactionRollbackError ?? new Exception("SQL rollback completed.")),
                            new Exception("Photo restore", photoRestoreError ?? new Exception("Photo restore completed."))));
                }

                throw;
            }
            finally
            {
                Dispose();
            }
        }
        #endregion

        #region " Class Property Declarations "
        public int KeyHD { get; set; }
        public string CompanyID { get; set; }
        public string LocationID { get; set; }
        public string WONo { get; set; }
        public DateTime WODate { get; set; }
        public string WOType { get; set; }
        public DateTime StartDate { get; set; }
        public string JONo { get; set; }
        public string PMType { get; set; }
        public string Description { get; set; }
        public string LocationNo { get; set; }
        public string ProfitCenterNo { get; set; }
        public string SectionID { get; set; }
        public string RequestedBy { get; set; }
        public string ExecutedBy { get; set; }
        public string CompletedBy { get; set; }
        public DateTime CompletedDate { get; set; }
        public string CancelReason { get; set; }
        public decimal SIIAmount { get; set; }
        public bool IsApproved { get; set; }
        public string ApprovedUser { get; set; }
        public DateTime ApprovedDate { get; set; }
        public bool IsDelete { get; set; }
        public bool IsJO { get; set; }
        public string EntryUser { get; set; }
        public DateTime EntryDate { get; set; }
        public string UpdateUser { get; set; }
        public DateTime UpdateDate { get; set; }
        public byte RePrint { get; set; }
        public bool IsPrint { get; set; }
        public byte Feedback1 { get; set; }
        public byte Feedback2 { get; set; }
        public byte Feedback3 { get; set; }
        public byte Feedback4 { get; set; }
        public byte Feedback5 { get; set; }
        public string EquipmentCode { get; set; }
        public string SectionIDUser { get; set; }
        public bool isApprovedDH { get; set; }
        public string ApprovedDHUser { get; set; }
        public DateTime ApprovedDHDate { get; set; }
        public string ReasonDH { get; set; }
        public bool isApprovedHelpDesk { get; set; }
        public string ApprovedHelpDeskUser { get; set; }
        public DateTime ApprovedHelpDeskDate { get; set; }
        public string ReasonHelpDesk { get; set; }
        public bool isRespondDC { get; set; }
        public string ApprovedRespondDCUser { get; set; }
        public DateTime ApprovedRespondDCDate { get; set; }
        public string ReasonRespondDC { get; set; }
        public bool isCompleteDC { get; set; }
        public string ReasonDC { get; set; }
        public string LastStatusTransaction { get; set; }
        public bool isCompletedUser { get; set; }
        public string CompletedUser { get; set; }
        public DateTime CompletedDateUser { get; set; }
        public string ReasonUser { get; set; }
        public string FollowUpSection { get; set; }
        public string FollowUpRemark { get; set; }
        public string RemarkTechnician { get; set; }
        public bool IsFollowUp { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        #endregion
    }
}
