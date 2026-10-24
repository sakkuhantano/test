using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Linq;
using System.Web;
using System.Web.Services;
using Newtonsoft.Json.Linq;
using WAL;

namespace UTL1.Secure
{
    public partial class inspection : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
        }

        [WebMethod]
        public static object SyncInspections(object inspections, string userId)
        {
            var outcomes = new List<object>();
            if (String.IsNullOrWhiteSpace(userId))
                return new { success = false, message = "Login employee is required.", results = outcomes };

            JArray records;
            try
            {
                records = JArray.FromObject(inspections);
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, results = outcomes };
            }

            foreach (JObject record in records.OfType<JObject>())
            {
                string clientId = TokenString(record, "ClientInspectionID");
                try
                {
                    if (String.IsNullOrWhiteSpace(clientId))
                        throw new Exception("ClientInspectionID is required.");

                    string recordOwner = TokenString(record, "OwnerEmployeeID");
                    if (String.IsNullOrWhiteSpace(recordOwner) ||
                        !String.Equals(recordOwner, userId, StringComparison.OrdinalIgnoreCase))
                        throw new Exception("This offline inspection belongs to another employee. No data was uploaded.");

                    // dbo.Type_N_Tbl_C13: C1=IDItem, C2=ItemLabel, C3=ItemType,
                    // C4=Value, C5=Remark1, C6=IsAnomali, C7=DisplayOrder, C8=Remark2; C9-C13 unused.
                    DataTable items = new DataTable();
                    for (int i = 1; i <= 13; i++)
                        items.Columns.Add("C" + i, typeof(string));

                    // dbo.Type_N_Tbl_C5: C1=IDItem, C2=FieldName, C3=Value; C4-C5 unused.
                    DataTable itemValues = new DataTable();
                    for (int i = 1; i <= 5; i++)
                        itemValues.Columns.Add("C" + i, typeof(string));

                    JArray itemArray = record["Items"] as JArray ?? new JArray();
                    int displayOrder = 0;
                    foreach (JObject item in itemArray.OfType<JObject>())
                    {
                        displayOrder++;
                        DataRow row = items.NewRow();
                        row["C1"] = TokenInt(item, "IDItem").ToString(CultureInfo.InvariantCulture);
                        row["C2"] = Limit(TokenString(item, "ItemLabel"), 500);
                        row["C3"] = Limit(TokenString(item, "Type"), 20);
                        row["C4"] = DbString(Limit(TokenString(item, "Value"), 50));
                        row["C5"] = DbString(Limit((TokenString(item, "Remark1") == "" ? TokenString(item, "Remark") : TokenString(item, "Remark1")), 500));
                        row["C8"] = DbString(Limit(TokenString(item, "Remark2"), 500));
                        row["C6"] = TokenBool(item, "IsAnomali") ? "1" : "0";
                        row["C7"] = (item["DisplayOrder"] == null ? displayOrder : TokenInt(item, "DisplayOrder")).ToString(CultureInfo.InvariantCulture);
                        items.Rows.Add(row);

                        JObject values = item["Values"] as JObject;
                        if (values != null)
                        {
                            foreach (JProperty field in values.Properties())
                            {
                                DataRow valueRow = itemValues.NewRow();
                                valueRow["C1"] = TokenInt(item, "IDItem").ToString(CultureInfo.InvariantCulture);
                                valueRow["C2"] = Limit(field.Name, 100);
                                valueRow["C3"] = DbString(field.Value == null || field.Value.Type == JTokenType.Null ? "" : field.Value.ToString());
                                itemValues.Rows.Add(valueRow);
                            }
                        }
                    }

                    string status = TokenString(record, "Status").ToUpperInvariant();
                    if (status != "DRAFT" && status != "DONE")
                        throw new Exception("Invalid inspection status.");

                    using (var br = new WAL.BR.CF())
                    {
                        DataTable saved = br.EQueryP("spUTL_PIP_T_Inspection_Sync", new SqlParameter[]
                        {
                            new SqlParameter("@p_ClientInspectionID", Limit(clientId, 36)),
                            new SqlParameter("@p_CompanyID", Limit(TokenString(record, "CompanyID"), 10)),
                            new SqlParameter("@p_LocationID", Limit(TokenString(record, "LocationID"), 3)),
                            new SqlParameter("@p_SectionID", Limit(TokenString(record, "SectionID"), 10)),
                            new SqlParameter("@p_InspectionTypeCode", Limit(TokenString(record, "InspectionTypeCode"), 2)),
                            new SqlParameter("@p_InspectionTypeDetailCode", Limit(TokenString(record, "InspectionTypeDetailCode"), 20)),
                            new SqlParameter("@p_ScheduledTime", Limit(TokenString(record, "ScheduledTime"), 5)),
                            new SqlParameter("@p_IDTemplate", TokenInt(record, "IDTemplate")),
                            new SqlParameter("@p_IDVersion", TokenInt(record, "IDVersion")),
                            new SqlParameter("@p_TemplateNo", Limit(TokenString(record, "TemplateNo"), 50)),
                            new SqlParameter("@p_TemplateVersion", Limit(TokenString(record, "TemplateVersion"), 10)),
                            new SqlParameter("@p_InspectionDate", ParseDate(TokenString(record, "InspectionDate"), DateTime.Today)),
                            new SqlParameter("@p_StartDateTime", ParseNullableDate(TokenString(record, "StartDateTime"))),
                            new SqlParameter("@p_EndDateTime", ParseNullableDate(TokenString(record, "EndDateTime"))),
                            new SqlParameter("@p_Status", status),
                            new SqlParameter("@p_Summary", Limit(TokenString(record, "Summary"), 500)),
                            new SqlParameter("@p_UpdateUser", Limit(userId, 50)),
                            new SqlParameter("@p_Items", items),
                            new SqlParameter("@p_ItemValues", itemValues)
                        }, true, true);

                        long inspectionId = saved.Rows.Count > 0 ? Convert.ToInt64(saved.Rows[0]["InspectionID"]) : 0;
                        JArray photoArray = record["Photos"] as JArray ?? new JArray();
                        if (inspectionId > 0 && photoArray.Count > 0)
                        {
                            var photoRows = new List<Tuple<string,string,int,byte[]>>();
                            foreach (JObject photo in photoArray.OfType<JObject>()) {
                                string type=TokenString(photo,"Type").ToUpperInvariant(); if(type!="BEFORE"&&type!="AFTER")throw new Exception("Invalid inspection photo type.");
                                string dataUrl=TokenString(photo,"Data");int comma=dataUrl.IndexOf(',');if(comma>=0)dataUrl=dataUrl.Substring(comma+1);
                                byte[] bytes=Convert.FromBase64String(dataUrl);if(bytes.Length==0||bytes.Length>1024*1024)throw new Exception("Inspection photo must be between 1 byte and 1 MB.");
                                photoRows.Add(Tuple.Create(type,Limit(TokenString(photo,"FileName"),255),TokenInt(photo,"OrderNo"),bytes));
                            }
                            br.EQueryP("DELETE FROM dbo.PIP_T_InspectionPhoto WHERE InspectionID=@InspectionID",new SqlParameter[]{new SqlParameter("@InspectionID",inspectionId)});
                            foreach(var photo in photoRows) br.EQueryP(@"INSERT dbo.PIP_T_InspectionPhoto (InspectionID,PhotoType,FileName,OrderNo,PhotoData,EntryUser,EntryDate) VALUES (@InspectionID,@PhotoType,@FileName,@OrderNo,@PhotoData,@EntryUser,GETDATE())",new SqlParameter[]{new SqlParameter("@InspectionID",inspectionId),new SqlParameter("@PhotoType",photo.Item1),new SqlParameter("@FileName",photo.Item2),new SqlParameter("@OrderNo",photo.Item3),new SqlParameter("@PhotoData",SqlDbType.VarBinary,-1){Value=photo.Item4},new SqlParameter("@EntryUser",Limit(userId,50))});
                        }
                        outcomes.Add(new
                        {
                            ClientInspectionID = clientId,
                            success = true,
                            InspectionID = inspectionId,
                            InspectionNo = saved.Rows.Count > 0 && saved.Columns.Contains("InspectionNo") && saved.Rows[0]["InspectionNo"] != DBNull.Value
                                ? Convert.ToString(saved.Rows[0]["InspectionNo"])
                                : "",
                            message = ""
                        });
                    }
                }
                catch (Exception ex)
                {
                    outcomes.Add(new
                    {
                        ClientInspectionID = clientId,
                        success = false,
                        InspectionID = 0,
                        InspectionNo = "",
                        message = ex.Message
                    });
                }
            }

            bool allSuccess = outcomes.All(x => Convert.ToBoolean(x.GetType().GetProperty("success").GetValue(x, null)));
            return new { success = allSuccess, results = outcomes };
        }

        [WebMethod]
        public static object CheckInspectionDuplicate(string employeeId, string companyId, string locationId,
            string sectionId, string inspectionTypeCode, string inspectionTypeDetailCode,
            string scheduledTime, int templateId, string inspectionDate)
        {
            if (String.IsNullOrWhiteSpace(employeeId) || String.IsNullOrWhiteSpace(companyId) || String.IsNullOrWhiteSpace(locationId))
                throw new HttpException(400, "Employee, company, and location are required.");

            using (var br = new WAL.BR.CF())
            {
                DataTable auth = br.EQueryP(@"
SELECT ISNULL(U.Section,'') Section, ISNULL(U.IsWO,0) IsWO
FROM dbo.UTL_User U
WHERE U.EmployeeID=@EmployeeID
  AND (
      EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
              WHERE C.UserID=U.UserID AND C.AppID='pip'
                AND C.CompanyID=@CompanyID AND C.LocationID=@LocationID)
      OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                 WHERE L.CompanyID=@CompanyID AND L.LocationID=@LocationID)
  )",
                    new SqlParameter[] {
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });

                if (auth.Rows.Count == 0 || !Convert.ToBoolean(auth.Rows[0]["IsWO"]))
                    throw new HttpException(403, "This account is not authorized for Inspection entry.");

                var sections = auth.Rows[0]["Section"].ToString()
                    .Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                if (!sections.Contains(sectionId, StringComparer.OrdinalIgnoreCase))
                    throw new HttpException(403, "This inspection section is not assigned to the current employee.");

                DataTable duplicate = br.EQueryP(@"
SELECT TOP 1 InspectionNo, OwnerEmployeeID, Status
FROM dbo.PIP_T_Inspection
WHERE CompanyID=@CompanyID AND LocationID=@LocationID AND SectionID=@SectionID
  AND InspectionTypeCode=@InspectionTypeCode
  AND InspectionTypeDetailCode=@InspectionTypeDetailCode
  AND ISNULL(ScheduledTime,'')=ISNULL(@ScheduledTime,'')
  AND IDTemplate=@IDTemplate
  AND InspectionDate >= CONVERT(DATETIME, CONVERT(VARCHAR(10), @InspectionDate, 120), 120)
  AND InspectionDate < DATEADD(DAY, 1, CONVERT(DATETIME, CONVERT(VARCHAR(10), @InspectionDate, 120), 120))
ORDER BY InspectionID DESC",
                    new SqlParameter[] {
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId),
                        new SqlParameter("@SectionID", sectionId),
                        new SqlParameter("@InspectionTypeCode", inspectionTypeCode),
                        new SqlParameter("@InspectionTypeDetailCode", inspectionTypeDetailCode),
                        new SqlParameter("@ScheduledTime", scheduledTime ?? ""),
                        new SqlParameter("@IDTemplate", templateId),
                        new SqlParameter("@InspectionDate", ParseDate(inspectionDate, DateTime.Today))
                    });

                return new {
                    success = true,
                    duplicate = duplicate.Rows.Count > 0,
                    InspectionNo = duplicate.Rows.Count > 0 ? Convert.ToString(duplicate.Rows[0]["InspectionNo"]) : "",
                    OwnerEmployeeID = duplicate.Rows.Count > 0 ? Convert.ToString(duplicate.Rows[0]["OwnerEmployeeID"]) : "",
                    Status = duplicate.Rows.Count > 0 ? Convert.ToString(duplicate.Rows[0]["Status"]) : ""
                };
            }
        }

        [WebMethod]
        public static object GetTodayInspectionSlots(string employeeId, string companyId, string locationId)
        {
            if (String.IsNullOrWhiteSpace(employeeId) || String.IsNullOrWhiteSpace(companyId) || String.IsNullOrWhiteSpace(locationId))
                throw new HttpException(400, "Employee, company, and location are required.");

            using (var br = new WAL.BR.CF())
            {
                DataTable auth = br.EQueryP(@"
SELECT ISNULL(U.Section,'') Section, ISNULL(U.IsWO,0) IsWO
FROM dbo.UTL_User U
WHERE U.EmployeeID=@EmployeeID
  AND (EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
               WHERE C.UserID=U.UserID AND C.AppID='pip'
                 AND C.CompanyID=@CompanyID AND C.LocationID=@LocationID)
       OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                  WHERE L.CompanyID=@CompanyID AND L.LocationID=@LocationID))",
                    new SqlParameter[] {
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });
                if (auth.Rows.Count == 0 || !Convert.ToBoolean(auth.Rows[0]["IsWO"]))
                    throw new HttpException(403, "This account is not authorized to view Inspection schedules.");

                var sections = auth.Rows[0]["Section"].ToString()
                    .Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                if (sections.Count == 0)
                    return new { success = true, data = new List<Dictionary<string, object>>() };

                DataTable rows = br.EQueryP(@"
SELECT I.InspectionID, I.ClientInspectionID, I.InspectionNo,
       I.CompanyID, I.LocationID, I.SectionID, I.InspectionTypeCode,
       I.InspectionTypeName, I.InspectionTypeDetailCode, I.InspectionTypeDetailName,
       I.ScheduledTime, I.IDTemplate, I.IDVersion, I.TemplateNo, I.TemplateName,
       I.TemplateVersion, I.InspectionDate, I.StartDateTime, I.EndDateTime,
       I.OwnerEmployeeID, ISNULL(E.Name, I.OwnerEmployeeID) TechnicianName,
       I.Status, I.IsApprove, I.ReasonVoid
FROM dbo.PIP_T_Inspection I
LEFT JOIN dbo.M_HRD_Employee E ON E.EmployeeID=I.OwnerEmployeeID
WHERE I.CompanyID=@CompanyID AND I.LocationID=@LocationID
  AND I.InspectionDate >= CONVERT(DATETIME, CONVERT(VARCHAR(10), GETDATE(), 120), 120)
  AND I.InspectionDate < DATEADD(DAY, 1, CONVERT(DATETIME, CONVERT(VARCHAR(10), GETDATE(), 120), 120))
  AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(@SectionList,';') S WHERE S.val=I.SectionID)
ORDER BY I.InspectionDate, I.ScheduledTime, I.InspectionID",
                    new SqlParameter[] {
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId),
                        new SqlParameter("@SectionList", String.Join(";", sections))
                    });
                var result = new List<Dictionary<string, object>>();
                foreach (DataRow row in rows.Rows)
                {
                    var item = new Dictionary<string, object>();
                    foreach (DataColumn col in rows.Columns)
                        item[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                    result.Add(item);
                }
                return new { success = true, data = result };
            }
        }

        [WebMethod]
        public static object ArchiveInspectionDelete(string employeeId, string companyId, string locationId,
            string clientInspectionId, string conflictReason, string originalTransactionJson)
        {
            if (String.IsNullOrWhiteSpace(employeeId) || String.IsNullOrWhiteSpace(clientInspectionId) ||
                String.IsNullOrWhiteSpace(originalTransactionJson))
                throw new HttpException(400, "Employee, client transaction ID, and transaction snapshot are required.");

            JObject record;
            try { record = JObject.Parse(originalTransactionJson); }
            catch { throw new HttpException(400, "The original inspection snapshot is invalid."); }

            if (!String.Equals(TokenString(record, "LocalInspectionID"), clientInspectionId, StringComparison.OrdinalIgnoreCase) ||
                !String.Equals(TokenString(record, "OwnerEmployeeID"), employeeId, StringComparison.OrdinalIgnoreCase) ||
                !String.Equals(TokenString(record, "CompanyID"), companyId, StringComparison.OrdinalIgnoreCase) ||
                !String.Equals(TokenString(record, "LocationID"), locationId, StringComparison.OrdinalIgnoreCase))
                throw new HttpException(403, "The transaction snapshot does not match the logged-in employee and company/location.");

            if (!String.Equals(TokenString(record, "SyncStatus"), "DELETE_PENDING", StringComparison.OrdinalIgnoreCase) ||
                !String.Equals(TokenString(record, "DeleteOriginalSyncStatus"), "CONFLICT", StringComparison.OrdinalIgnoreCase))
                throw new HttpException(400, "Only a queued local conflict can be archived for deletion.");

            string sectionId = TokenString(record, "SectionID");
            using (var br = new WAL.BR.CF())
            {
                DataTable auth = br.EQueryP(@"
SELECT ISNULL(U.Section,'') Section, ISNULL(U.IsWO,0) IsWO
FROM dbo.UTL_User U
WHERE U.EmployeeID=@EmployeeID
  AND (EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
               WHERE C.UserID=U.UserID AND C.AppID='pip'
                 AND C.CompanyID=@CompanyID AND C.LocationID=@LocationID)
       OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                  WHERE L.CompanyID=@CompanyID AND L.LocationID=@LocationID))",
                    new SqlParameter[] {
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });
                if (auth.Rows.Count == 0 || !Convert.ToBoolean(auth.Rows[0]["IsWO"]))
                    throw new HttpException(403, "This account is not authorized to archive Inspection transactions.");
                var sections = auth.Rows[0]["Section"].ToString()
                    .Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim()).Where(s => s.Length > 0);
                if (!sections.Contains(sectionId, StringComparer.OrdinalIgnoreCase))
                    throw new HttpException(403, "This inspection section is not assigned to the current employee.");

                br.EQueryP(@"
IF NOT EXISTS (SELECT 1 FROM dbo.PIP_T_Inspection_Delete WITH (UPDLOCK, HOLDLOCK) WHERE ClientInspectionID=@ClientInspectionID)
BEGIN
    INSERT dbo.PIP_T_Inspection_Delete
    (ClientInspectionID, ServerInspectionID, InspectionNo, CompanyID, LocationID, SectionID,
     InspectionTypeCode, InspectionTypeDetailCode, IDTemplate, InspectionDate, ScheduledTime,
     OriginalStatus, OriginalSyncStatus, ConflictReason, DeletedBy, OriginalTransactionJson)
    VALUES
    (@ClientInspectionID, @ServerInspectionID, @InspectionNo, @CompanyID, @LocationID, @SectionID,
     @InspectionTypeCode, @InspectionTypeDetailCode, @IDTemplate, @InspectionDate, @ScheduledTime,
     @OriginalStatus, @OriginalSyncStatus, @ConflictReason, @DeletedBy, @OriginalTransactionJson);
END",
                    new SqlParameter[] {
                        new SqlParameter("@ClientInspectionID", Limit(clientInspectionId, 36)),
                        new SqlParameter("@ServerInspectionID", TokenInt(record, "ServerInspectionID") > 0 ? (object)TokenInt(record, "ServerInspectionID") : DBNull.Value),
                        new SqlParameter("@InspectionNo", DbString(Limit(TokenString(record, "InspectionNo"), 10))),
                        new SqlParameter("@CompanyID", Limit(companyId, 10)),
                        new SqlParameter("@LocationID", Limit(locationId, 3)),
                        new SqlParameter("@SectionID", Limit(sectionId, 10)),
                        new SqlParameter("@InspectionTypeCode", Limit(TokenString(record, "InspectionTypeCode"), 2)),
                        new SqlParameter("@InspectionTypeDetailCode", Limit(TokenString(record, "InspectionTypeDetailCode"), 20)),
                        new SqlParameter("@IDTemplate", TokenInt(record, "IDTemplate")),
                        new SqlParameter("@InspectionDate", ParseDate(TokenString(record, "InspectionDate"), DateTime.Today)),
                        new SqlParameter("@ScheduledTime", DbString(Limit(TokenString(record, "ScheduledTime"), 5))),
                        new SqlParameter("@OriginalStatus", DbString(Limit(TokenString(record, "Status"), 10))),
                        new SqlParameter("@OriginalSyncStatus", DbString(Limit(TokenString(record, "DeleteOriginalSyncStatus") == "" ? TokenString(record, "SyncStatus") : TokenString(record, "DeleteOriginalSyncStatus"), 20))),
                        new SqlParameter("@ConflictReason", DbString(Limit(conflictReason, 1000))),
                        new SqlParameter("@DeletedBy", Limit(employeeId, 50)),
                        new SqlParameter("@OriginalTransactionJson", SqlDbType.NVarChar, -1) { Value = originalTransactionJson }
                    }, true, true);

                DataTable confirmed = br.EQueryP(
                    "SELECT COUNT(1) AS SavedCount FROM dbo.PIP_T_Inspection_Delete WHERE ClientInspectionID=@ClientInspectionID AND DeletedBy=@DeletedBy",
                    new SqlParameter[] {
                        new SqlParameter("@ClientInspectionID", Limit(clientInspectionId, 36)),
                        new SqlParameter("@DeletedBy", Limit(employeeId, 50))
                    });
                return new { success = confirmed.Rows.Count > 0 && Convert.ToInt32(confirmed.Rows[0]["SavedCount"]) > 0 };
            }
        }

        [WebMethod]
        public static object GetInspectionEntryList(string employeeId, string companyId, string locationId)
        {
            if (String.IsNullOrWhiteSpace(employeeId) || String.IsNullOrWhiteSpace(companyId) || String.IsNullOrWhiteSpace(locationId))
                throw new HttpException(400, "Employee, company, and location are required.");

            using (var br = new WAL.BR.CF())
            {
                DataTable auth = br.EQueryP(@"
SELECT ISNULL(U.Section,'') Section, ISNULL(U.IsWO,0) IsWO
FROM dbo.UTL_User U
WHERE U.EmployeeID=@EmployeeID
  AND (
      EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
              WHERE C.UserID=U.UserID AND C.AppID='pip'
                AND C.CompanyID=@CompanyID AND C.LocationID=@LocationID)
      OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                 WHERE L.CompanyID=@CompanyID AND L.LocationID=@LocationID)
  )",
                    new SqlParameter[] {
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });

                if (auth.Rows.Count == 0 || !Convert.ToBoolean(auth.Rows[0]["IsWO"]))
                    throw new HttpException(403, "This account is not authorized to view Inspection entry records.");

                var sections = auth.Rows[0]["Section"].ToString()
                    .Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                if (sections.Count == 0)
                    return new { success = true, data = new List<Dictionary<string, object>>() };

                DataTable rows = br.EQueryP(@"
SELECT I.InspectionID, I.ClientInspectionID, I.InspectionNo,
       I.CompanyID, I.LocationID, I.SectionID, I.InspectionTypeCode,
       I.InspectionTypeName, I.InspectionTypeDetailCode, I.InspectionTypeDetailName,
       I.ScheduledTime, I.IDTemplate, I.IDVersion, I.TemplateNo, I.TemplateName,
       I.TemplateVersion, I.InspectionDate, I.StartDateTime, I.EndDateTime,
       I.OwnerEmployeeID, ISNULL(E.Name, I.OwnerEmployeeID) TechnicianName, I.Status
FROM dbo.PIP_T_Inspection I
LEFT JOIN dbo.M_HRD_Employee E ON E.EmployeeID=I.OwnerEmployeeID
WHERE I.CompanyID=@CompanyID AND I.LocationID=@LocationID
  AND I.Status='DONE'
  AND I.InspectionDate >= CONVERT(DATETIME, CONVERT(VARCHAR(10), GETDATE(), 120), 120)
  AND I.InspectionDate < DATEADD(DAY, 1, CONVERT(DATETIME, CONVERT(VARCHAR(10), GETDATE(), 120), 120))
  AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(@SectionList,';') S WHERE S.val=I.SectionID)
ORDER BY I.StartDateTime DESC, I.InspectionID DESC",
                    new SqlParameter[] {
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId),
                        new SqlParameter("@SectionList", String.Join(";", sections))
                    });

                var result = new List<Dictionary<string, object>>();
                foreach (DataRow row in rows.Rows)
                {
                    var item = new Dictionary<string, object>();
                    foreach (DataColumn col in rows.Columns)
                        item[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                    result.Add(item);
                }
                return new { success = true, data = result };
            }
        }

        [WebMethod]
        public static object GetInspectionApprovalQueue(string employeeId, string companyId, string locationId)
        {
            if (String.IsNullOrWhiteSpace(employeeId))
                throw new HttpException(403, "Supervisor identity is required.");

            using (var br = new WAL.BR.CF())
            {
                DataTable rows = br.EQueryP(@"
SELECT I.InspectionID, I.ClientInspectionID, I.InspectionNo, I.CompanyID, I.LocationID, I.SectionID,
       I.InspectionTypeCode, I.InspectionTypeName, I.InspectionTypeDetailCode, I.InspectionTypeDetailName,
       I.IDTemplate, I.IDVersion, I.ScheduledTime, I.TemplateNo, I.TemplateName, I.TemplateVersion,
       I.InspectionDate, I.StartDateTime, I.EndDateTime, I.Summary, I.OwnerEmployeeID, I.Status
FROM dbo.PIP_T_Inspection I
WHERE I.CompanyID=@CompanyID AND I.LocationID=@LocationID
  AND I.Status='DONE' AND I.IsApprove IS NULL AND I.ApprovedBy IS NULL AND I.ApprovedDate IS NULL
  AND EXISTS (
      SELECT 1 FROM dbo.UTL_User U
      WHERE U.EmployeeID=@EmployeeID AND ISNULL(U.IsSPV,0)=1
        AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section,';') S WHERE S.val=I.SectionID)
        AND (
          EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                  WHERE C.UserID=U.UserID AND C.AppID='pip'
                    AND C.CompanyID=I.CompanyID AND C.LocationID=I.LocationID)
          OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                     WHERE L.CompanyID=I.CompanyID AND L.LocationID=I.LocationID)
        )
  )
ORDER BY I.InspectionDate DESC, I.InspectionID DESC",
                    new SqlParameter[] {
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });
                var result = new List<Dictionary<string, object>>();
                foreach (DataRow row in rows.Rows)
                {
                    var item = new Dictionary<string, object>();
                    foreach (DataColumn col in rows.Columns)
                        item[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                    result.Add(item);
                }
                return new { success = true, data = result };
            }
        }

        [WebMethod]
        public static object GetInspectionDashboardSummary(string employeeId, string companyId, string locationId)
        {
            if (String.IsNullOrWhiteSpace(employeeId))
                throw new HttpException(403, "Supervisor identity is required.");
            using (var br = new WAL.BR.CF())
            {
                DataTable rows = br.EQueryP(@"
SELECT
    SUM(CASE WHEN I.Status='DONE' AND I.IsApprove IS NULL AND I.ApprovedBy IS NULL AND I.ApprovedDate IS NULL THEN 1 ELSE 0 END) PendingApproval,
    SUM(CASE WHEN ISNULL(I.IsApprove,0)=1 AND I.ApprovedDate>=CONVERT(DATETIME, CONVERT(VARCHAR(10), GETDATE(), 120), 120) THEN 1 ELSE 0 END) ApprovedToday,
    SUM(CASE WHEN I.IsApprove=0 AND I.ApprovedBy IS NOT NULL AND I.ApprovedDate IS NOT NULL THEN 1 ELSE 0 END) VoidCount
FROM dbo.PIP_T_Inspection I
WHERE I.CompanyID=@CompanyID AND I.LocationID=@LocationID
  AND EXISTS (
      SELECT 1 FROM dbo.UTL_User U
      WHERE U.EmployeeID=@EmployeeID AND ISNULL(U.IsSPV,0)=1
        AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section,';') S WHERE S.val=I.SectionID)
        AND (
          EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                  WHERE C.UserID=U.UserID AND C.AppID='pip'
                    AND C.CompanyID=I.CompanyID AND C.LocationID=I.LocationID)
          OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                     WHERE L.CompanyID=I.CompanyID AND L.LocationID=I.LocationID)
        )
  )",
                    new SqlParameter[] {
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });
                if (rows.Rows.Count == 0)
                    return new { success = true, pendingApproval = 0, approvedToday = 0, voidCount = 0 };
                DataRow row = rows.Rows[0];
                return new {
                    success = true,
                    pendingApproval = row["PendingApproval"] == DBNull.Value ? 0 : Convert.ToInt32(row["PendingApproval"]),
                    approvedToday = row["ApprovedToday"] == DBNull.Value ? 0 : Convert.ToInt32(row["ApprovedToday"]),
                    voidCount = row["VoidCount"] == DBNull.Value ? 0 : Convert.ToInt32(row["VoidCount"])
                };
            }
        }

        [WebMethod]
        public static object GetReturnedInspectionPhotos(string clientInspectionId, string employeeId, string companyId, string locationId)
        {
            if (String.IsNullOrWhiteSpace(clientInspectionId) || String.IsNullOrWhiteSpace(employeeId))
                throw new HttpException(400, "Inspection and technician identity are required.");
            using (var br = new WAL.BR.CF())
            {
                DataTable rows = br.EQueryP(@"
SELECT P.PhotoType, P.FileName, P.OrderNo, P.PhotoData
FROM dbo.PIP_T_InspectionPhoto P
JOIN dbo.PIP_T_Inspection I ON I.InspectionID=P.InspectionID
WHERE I.ClientInspectionID=@ClientInspectionID
  AND I.OwnerEmployeeID=@EmployeeID AND I.CompanyID=@CompanyID AND I.LocationID=@LocationID
  AND I.Status='DRAFT' AND I.IsApprove=0
  AND EXISTS (
      SELECT 1 FROM dbo.UTL_User U
      WHERE U.EmployeeID=@EmployeeID AND ISNULL(U.IsWO,0)=1
        AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section,';') S WHERE S.val=I.SectionID)
        AND (
            EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                    WHERE C.UserID=U.UserID AND C.AppID='pip'
                      AND C.CompanyID=I.CompanyID AND C.LocationID=I.LocationID)
            OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                       WHERE L.CompanyID=I.CompanyID AND L.LocationID=I.LocationID)
        )
  )
ORDER BY P.PhotoType, P.OrderNo",
                    new SqlParameter[] {
                        new SqlParameter("@ClientInspectionID", clientInspectionId),
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });
                var photos = new List<Dictionary<string, object>>();
                foreach (DataRow row in rows.Rows)
                {
                    byte[] bytes = row["PhotoData"] == DBNull.Value ? new byte[0] : (byte[])row["PhotoData"];
                    if (bytes.Length == 0) continue;
                    photos.Add(new Dictionary<string, object> {
                        { "Type", row["PhotoType"] == DBNull.Value ? "" : row["PhotoType"].ToString() },
                        { "FileName", row["FileName"] == DBNull.Value ? "" : row["FileName"].ToString() },
                        { "OrderNo", row["OrderNo"] == DBNull.Value ? 0 : Convert.ToInt32(row["OrderNo"]) },
                        { "Data", "data:image/jpeg;base64," + Convert.ToBase64String(bytes) }
                    });
                }
                return new { success = true, data = photos };
            }
        }

        [WebMethod]
        public static object GetInspectionApprovalDetail(long inspectionId, string employeeId)
        {
            if (String.IsNullOrWhiteSpace(employeeId))
                throw new HttpException(403, "Supervisor identity is required.");

            using (var br = new WAL.BR.CF())
            {
                DataTable header = br.EQueryP(@"
SELECT I.InspectionID, I.CompanyID, I.LocationID, I.SectionID, I.InspectionTypeName,
       I.InspectionTypeDetailName, I.ScheduledTime, I.TemplateNo, I.TemplateVersion,
       I.InspectionDate, I.StartDateTime, I.EndDateTime, I.Summary, I.OwnerEmployeeID
FROM dbo.PIP_T_Inspection I
WHERE I.InspectionID=@InspectionID AND I.Status='DONE'
  AND I.IsApprove IS NULL AND I.ApprovedBy IS NULL AND I.ApprovedDate IS NULL
  AND EXISTS (
      SELECT 1 FROM dbo.UTL_User U
      WHERE U.EmployeeID=@EmployeeID AND ISNULL(U.IsSPV,0)=1
        AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section,';') S WHERE S.val=I.SectionID)
        AND (
          EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                  WHERE C.UserID=U.UserID AND C.AppID='pip'
                    AND C.CompanyID=I.CompanyID AND C.LocationID=I.LocationID)
          OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                     WHERE L.CompanyID=I.CompanyID AND L.LocationID=I.LocationID)
        )
  )",
                    new SqlParameter[] {
                        new SqlParameter("@InspectionID", inspectionId),
                        new SqlParameter("@EmployeeID", employeeId)
                    });
                if (header.Rows.Count == 0)
                    throw new HttpException(404, "Inspection not found or not authorized for approval.");

                DataTable results = br.EQueryP(@"
SELECT R.IDItem, R.ItemLabel, R.ItemType, R.Value, R.Remark1, R.Remark2, R.IsAnomali,
       V.FieldName, V.Value AS FieldValue, R.DisplayOrder
FROM dbo.PIP_T_InspectionResult R
JOIN dbo.PIP_T_Inspection I ON I.InspectionID=R.InspectionID
LEFT JOIN dbo.PIP_T_InspectionResultValue V ON V.InspectionResultID=R.InspectionResultID
WHERE I.InspectionID=@InspectionID
ORDER BY R.DisplayOrder, V.FieldName",
                    new SqlParameter[] { new SqlParameter("@InspectionID", inspectionId) });

                var groupedItems = new Dictionary<int, Dictionary<string, object>>();
                foreach (DataRow row in results.Rows)
                {
                    int itemId = Convert.ToInt32(row["IDItem"]);
                    Dictionary<string, object> item;
                    if (!groupedItems.TryGetValue(itemId, out item))
                    {
                        item = new Dictionary<string, object> {
                            { "IDItem", itemId },
                            { "ItemLabel", row["ItemLabel"] == DBNull.Value ? "" : row["ItemLabel"].ToString() },
                            { "ItemType", row["ItemType"] == DBNull.Value ? "" : row["ItemType"].ToString() },
                            { "Value", row["Value"] == DBNull.Value ? "" : row["Value"].ToString() },
                            { "Remark1", row["Remark1"] == DBNull.Value ? "" : row["Remark1"].ToString() },
                            { "Remark2", row["Remark2"] == DBNull.Value ? "" : row["Remark2"].ToString() },
                            { "IsAnomali", row["IsAnomali"] != DBNull.Value && Convert.ToBoolean(row["IsAnomali"]) },
                            { "DisplayOrder", row["DisplayOrder"] == DBNull.Value ? 0 : Convert.ToInt32(row["DisplayOrder"]) },
                            { "Values", new Dictionary<string, object>() }
                        };
                        groupedItems.Add(itemId, item);
                    }
                    if (row["FieldName"] != DBNull.Value)
                        ((Dictionary<string, object>)item["Values"])[row["FieldName"].ToString()] =
                            row["FieldValue"] == DBNull.Value ? "" : row["FieldValue"].ToString();
                }
                var itemRows = groupedItems.Values.OrderBy(x => Convert.ToInt32(x["DisplayOrder"])).ToList();
                var h = new Dictionary<string, object>();
                foreach (DataColumn col in header.Columns)
                    h[col.ColumnName] = header.Rows[0][col] == DBNull.Value ? null : header.Rows[0][col];
                DataTable photoTable = br.EQueryP(@"
SELECT P.PhotoType, P.FileName, P.OrderNo, P.PhotoData
FROM dbo.PIP_T_InspectionPhoto P
WHERE P.InspectionID=@InspectionID
ORDER BY P.PhotoType, P.OrderNo",
                    new SqlParameter[] { new SqlParameter("@InspectionID", inspectionId) });
                var photos = new List<Dictionary<string, object>>();
                foreach (DataRow photo in photoTable.Rows)
                {
                    byte[] photoBytes = photo["PhotoData"] == DBNull.Value ? new byte[0] : (byte[])photo["PhotoData"];
                    if (photoBytes.Length == 0) continue;
                    photos.Add(new Dictionary<string, object> {
                        { "Type", photo["PhotoType"] == DBNull.Value ? "" : photo["PhotoType"].ToString() },
                        { "FileName", photo["FileName"] == DBNull.Value ? "" : photo["FileName"].ToString() },
                        { "OrderNo", photo["OrderNo"] == DBNull.Value ? 0 : Convert.ToInt32(photo["OrderNo"]) },
                        { "Data", "data:image/jpeg;base64," + Convert.ToBase64String(photoBytes) }
                    });
                }
                return new { success = true, header = h, items = itemRows, photos = photos };
            }
        }

        [WebMethod]
        public static object GetReturnedInspections(string employeeId, string companyId, string locationId)
        {
            if (String.IsNullOrWhiteSpace(employeeId))
                throw new HttpException(403, "Technician identity is required.");
            using (var br = new WAL.BR.CF())
            {
                DataTable headers = br.EQueryP(@"
SELECT I.InspectionID, I.ClientInspectionID, I.InspectionNo, I.CompanyID, I.LocationID, I.SectionID,
       I.InspectionTypeCode, I.InspectionTypeName, I.InspectionTypeDetailCode,
       I.InspectionTypeDetailName, I.ScheduledTime, I.IDTemplate, I.IDVersion,
       I.TemplateNo, I.TemplateName, I.TemplateVersion, I.InspectionDate,
       I.StartDateTime, I.EndDateTime, I.Status, I.Summary, I.OwnerEmployeeID,
       I.ReasonVoid, I.UpdateDate
FROM dbo.PIP_T_Inspection I
WHERE I.OwnerEmployeeID=@EmployeeID AND I.CompanyID=@CompanyID AND I.LocationID=@LocationID
  AND I.Status='DRAFT' AND I.IsApprove=0 AND I.ApprovedBy IS NOT NULL AND I.ApprovedDate IS NOT NULL
  AND EXISTS (SELECT 1 FROM dbo.UTL_User U WHERE U.EmployeeID=@EmployeeID AND ISNULL(U.IsWO,0)=1
              AND EXISTS (SELECT 1 FROM dbo.SplitStringConvertToTable(U.Section,';') S WHERE S.val=I.SectionID)
              AND (
                  EXISTS (SELECT 1 FROM dbo.SysWebUserCompanyLocation C
                          WHERE C.UserID=U.UserID AND C.AppID='pip'
                            AND C.CompanyID=I.CompanyID AND C.LocationID=I.LocationID)
                  OR EXISTS (SELECT 1 FROM dbo.F_SelectOneLogin('pip', U.EmployeeID, '') L
                             WHERE L.CompanyID=I.CompanyID AND L.LocationID=I.LocationID)
              ))
ORDER BY I.UpdateDate DESC",
                    new SqlParameter[] {
                        new SqlParameter("@EmployeeID", employeeId),
                        new SqlParameter("@CompanyID", companyId),
                        new SqlParameter("@LocationID", locationId)
                    });
                var result = new List<Dictionary<string, object>>();
                foreach (DataRow header in headers.Rows)
                {
                    long id = Convert.ToInt64(header["InspectionID"]);
                    DataTable rows = br.EQueryP(@"
SELECT R.IDItem, R.ItemLabel, R.ItemType, R.Value, R.Remark1, R.Remark2, R.IsAnomali, R.DisplayOrder,
       V.FieldName, V.Value AS FieldValue
FROM dbo.PIP_T_InspectionResult R
LEFT JOIN dbo.PIP_T_InspectionResultValue V ON V.InspectionResultID=R.InspectionResultID
WHERE R.InspectionID=@InspectionID
ORDER BY R.DisplayOrder, V.FieldName",
                        new SqlParameter[] { new SqlParameter("@InspectionID", id) });
                    var grouped = new Dictionary<int, Dictionary<string, object>>();
                    foreach (DataRow row in rows.Rows)
                    {
                        int itemId = Convert.ToInt32(row["IDItem"]);
                        Dictionary<string, object> item;
                        if (!grouped.TryGetValue(itemId, out item))
                        {
                            item = new Dictionary<string, object> {
                                { "IDItem", itemId },
                                { "ItemLabel", row["ItemLabel"] == DBNull.Value ? "" : row["ItemLabel"].ToString() },
                                { "Type", row["ItemType"] == DBNull.Value ? "" : row["ItemType"].ToString() },
                                { "Value", row["Value"] == DBNull.Value ? "" : row["Value"].ToString() },
                                { "Remark1", row["Remark1"] == DBNull.Value ? "" : row["Remark1"].ToString() },
                                { "Remark2", row["Remark2"] == DBNull.Value ? "" : row["Remark2"].ToString() },
                                { "IsAnomali", row["IsAnomali"] != DBNull.Value && Convert.ToBoolean(row["IsAnomali"]) },
                                { "DisplayOrder", row["DisplayOrder"] == DBNull.Value ? 0 : Convert.ToInt32(row["DisplayOrder"]) },
                                { "Values", new Dictionary<string, object>() }
                            };
                            grouped.Add(itemId, item);
                        }
                        if (row["FieldName"] != DBNull.Value)
                            ((Dictionary<string, object>)item["Values"])[row["FieldName"].ToString()] =
                                row["FieldValue"] == DBNull.Value ? "" : row["FieldValue"].ToString();
                    }
                    var record = new Dictionary<string, object>();
                    foreach (DataColumn col in headers.Columns)
                        record[col.ColumnName] = header[col] == DBNull.Value ? null : header[col];
                    record["Items"] = grouped.Values.OrderBy(x => Convert.ToInt32(x["DisplayOrder"])).ToList();

                    DataTable meta = br.EQueryP(@"
SELECT T.IDTemplate, T.TemplateNo, T.TemplateName, T.SectionID, T.InspectionTypeCode,
       V.IDVersion, V.Version, V.StatusOption, V.IsRemark1Required VersionIsRemark1Required, V.Remark1Text VersionRemark1Text, V.IsRemark2Required VersionIsRemark2Required, V.Remark2Text VersionRemark2Text, V.RemarkRequiredOptions VersionRemarkRequiredOptions
FROM dbo.PIP_M_CheckListWOPM T
JOIN dbo.PIP_M_CheckListWOPM_Version V ON V.IDTemplate=T.IDTemplate
WHERE T.IDTemplate=@IDTemplate AND V.IDVersion=@IDVersion AND ISNULL(T.TemplateType,'W')='I'",
                        new SqlParameter[] {
                            new SqlParameter("@IDTemplate", Convert.ToInt32(header["IDTemplate"])),
                            new SqlParameter("@IDVersion", Convert.ToInt32(header["IDVersion"]))
                        });
                    if (meta.Rows.Count > 0)
                    {
                        DataRow m = meta.Rows[0];
                        DataTable templateItems = br.EQueryP(@"
SELECT S.IDSection, S.SectionName, S.DisplayOrder AS SectionOrder,
       I.IDItem, I.IDSubSection, ISNULL(SS.SubSectionName,'') AS SubSectionName,
       ISNULL(SS.DisplayOrder,0) AS SubSectionOrder,
       I.ItemLabel, I.ItemType, ISNULL(I.OptionList,'') OptionList,
       I.MinValue, I.MaxValue, ISNULL(I.Unit,'') Unit, I.IsValueRequired,
       I.IsRemark1Required, I.IsRemark2Required, I.Remark1Text, I.Remark2Text, I.IsUseDefaultRemark1, I.IsUseDefaultRemark2, I.UseDefaultOption, ISNULL(I.RemarkRequiredOptions,'') RemarkRequiredOptions, I.DisplayOrder AS ItemOrder, V.StatusOption,
       I.ModelCode, I.MinTolerance, I.MaxTolerance, I.IsToleranceRequired
FROM dbo.PIP_M_CheckListWOPM_Section S
JOIN dbo.PIP_M_CheckListWOPM_Item I ON I.IDSection=S.IDSection
LEFT JOIN dbo.PIP_M_CheckListWOPM_SubSection SS ON SS.IDSubSection=I.IDSubSection
JOIN dbo.PIP_M_CheckListWOPM_Version V ON V.IDVersion=S.IDVersion
WHERE V.IDVersion=@IDVersion
ORDER BY S.DisplayOrder,
         CASE WHEN ISNULL(I.IDSubSection,0)=0 THEN I.DisplayOrder ELSE SS.DisplayOrder END,
         I.DisplayOrder",
                            new SqlParameter[] { new SqlParameter("@IDVersion", Convert.ToInt32(header["IDVersion"])) });
                        DataTable templateGroups = br.EQueryP(@"
SELECT G.IDItem, G.GroupName, G.FieldList, G.Unit, G.DisplayOrder
FROM dbo.PIP_M_CheckListWOPM_ItemGroup G
JOIN dbo.PIP_M_CheckListWOPM_Item I ON I.IDItem=G.IDItem
JOIN dbo.PIP_M_CheckListWOPM_Section S ON S.IDSection=I.IDSection
WHERE S.IDVersion=@IDVersion
ORDER BY G.DisplayOrder",
                            new SqlParameter[] { new SqlParameter("@IDVersion", Convert.ToInt32(header["IDVersion"])) });

                        var sections = templateItems.AsEnumerable()
                            .GroupBy(row => new {
                                IDSection = Convert.ToInt32(row["IDSection"]),
                                SectionName = row["SectionName"].ToString(),
                                SectionOrder = Convert.ToInt32(row["SectionOrder"])
                            })
                            .OrderBy(group => group.Key.SectionOrder)
                            .Select(group => new {
                                idSection = group.Key.IDSection,
                                sectionName = group.Key.SectionName,
                                items = group.Select(itemRow => {
                                    string itemType = itemRow["ItemType"].ToString();
                                    string optionList = itemType == "OPTION"
                                        ? (String.IsNullOrEmpty(itemRow["OptionList"].ToString())
                                            ? itemRow["StatusOption"].ToString() : itemRow["OptionList"].ToString())
                                        : "";
                                    var itemGroups = templateGroups.AsEnumerable()
                                        .Where(g => g["IDItem"].ToString() == itemRow["IDItem"].ToString())
                                        .OrderBy(g => g["DisplayOrder"])
                                        .Select(g => new {
                                            groupName = g["GroupName"].ToString(),
                                            fieldList = g["FieldList"].ToString(),
                                            unit = g["Unit"].ToString()
                                        }).ToList();
                                    return new {
                                        idItem = Convert.ToInt32(itemRow["IDItem"]),
                                        idSubSection = itemRow["IDSubSection"] == DBNull.Value ? 0 : Convert.ToInt32(itemRow["IDSubSection"]),
                                        subSectionName = itemRow["SubSectionName"] == DBNull.Value ? "" : itemRow["SubSectionName"].ToString(),
                                        subSectionOrder = itemRow["SubSectionOrder"] == DBNull.Value ? 0 : Convert.ToInt32(itemRow["SubSectionOrder"]),
                                        itemOrder = itemRow["ItemOrder"] == DBNull.Value ? 0 : Convert.ToInt32(itemRow["ItemOrder"]),
                                        label = itemRow["ItemLabel"].ToString(),
                                        type = itemType,
                                        optionList = optionList,
                                        min = itemRow["MinValue"] == DBNull.Value ? (decimal?)null : Convert.ToDecimal(itemRow["MinValue"]),
                                        max = itemRow["MaxValue"] == DBNull.Value ? (decimal?)null : Convert.ToDecimal(itemRow["MaxValue"]),
                                        unit = itemRow["Unit"].ToString(),
                                        isValueRequired = Convert.ToBoolean(itemRow["IsValueRequired"]),
                                        versionIsRemark1Required = Convert.ToBoolean(m["VersionIsRemark1Required"]),
                                        versionIsRemark2Required = Convert.ToBoolean(m["VersionIsRemark2Required"]),
                                        isRemark1Required = Convert.ToBoolean(m["VersionIsRemark1Required"]) && (Convert.ToBoolean(itemRow["IsUseDefaultRemark1"]) || Convert.ToBoolean(itemRow["IsRemark1Required"])),
                                        isRemark2Required = Convert.ToBoolean(m["VersionIsRemark2Required"]) && (Convert.ToBoolean(itemRow["IsUseDefaultRemark2"]) || Convert.ToBoolean(itemRow["IsRemark2Required"])),
                                        remark1Text = Convert.ToBoolean(itemRow["IsUseDefaultRemark1"]) ? GF.GetString(m["VersionRemark1Text"]) : (itemRow["Remark1Text"] == DBNull.Value ? "Remark" : itemRow["Remark1Text"].ToString()),
                                        remark2Text = Convert.ToBoolean(itemRow["IsUseDefaultRemark2"]) ? GF.GetString(m["VersionRemark2Text"]) : (itemRow["Remark2Text"] == DBNull.Value ? "Remark" : itemRow["Remark2Text"].ToString()),
                                        remarkRequiredOptions = !(Convert.ToBoolean(m["VersionIsRemark1Required"]) || Convert.ToBoolean(m["VersionIsRemark2Required"])) ? new string[0] : (String.IsNullOrWhiteSpace(GF.GetString(m["VersionRemarkRequiredOptions"])) ? new string[0] : GF.GetString(m["VersionRemarkRequiredOptions"]).Split(';')),
                                        isToleranceRequired = itemRow["IsToleranceRequired"] != DBNull.Value && Convert.ToBoolean(itemRow["IsToleranceRequired"]),
                                        mintol = itemRow["MinTolerance"] == DBNull.Value ? (decimal?)null : Convert.ToDecimal(itemRow["MinTolerance"]),
                                        maxtol = itemRow["MaxTolerance"] == DBNull.Value ? (decimal?)null : Convert.ToDecimal(itemRow["MaxTolerance"]),
                                        modelcode = itemRow["ModelCode"] == DBNull.Value ? "" : itemRow["ModelCode"].ToString(),
                                        groups = itemGroups.Count > 0 ? itemGroups : null
                                    };
                                }).ToList()
                            }).ToList();
                        record["TemplateSnapshot"] = new {
                            IDTemplate = Convert.ToInt32(m["IDTemplate"]),
                            IDVersion = Convert.ToInt32(m["IDVersion"]),
                            Version = m["Version"].ToString(),
                            SectionID = m["SectionID"].ToString(),
                            TemplateType = "I",
                            InspectionTypeCode = m["InspectionTypeCode"].ToString(),
                            TemplateNo = m["TemplateNo"].ToString(),
                            TemplateName = m["TemplateName"].ToString(),
                            StatusOption = m["StatusOption"].ToString(),
                            IsRemark1Required = Convert.ToBoolean(m["VersionIsRemark1Required"]),
                            Remark1Text = GF.GetString(m["VersionRemark1Text"]),
                            IsRemark2Required = Convert.ToBoolean(m["VersionIsRemark2Required"]),
                            Remark2Text = GF.GetString(m["VersionRemark2Text"]),
                            RemarkRequiredOptions = String.IsNullOrWhiteSpace(GF.GetString(m["VersionRemarkRequiredOptions"])) ? new string[0] : GF.GetString(m["VersionRemarkRequiredOptions"]).Split(';'),
                            sections = sections
                        };
                    }
                    result.Add(record);
                }
                return new { success = true, data = result };
            }
        }

        [WebMethod]
        public static object ProcessInspectionApproval(long inspectionId, string action, string employeeId,
            string companyId, string locationId, string remark)
        {
            if (String.IsNullOrWhiteSpace(employeeId))
                throw new HttpException(403, "Supervisor identity is required.");
            if (!String.Equals(action, "APPROVE", StringComparison.OrdinalIgnoreCase) &&
                !String.Equals(action, "VOID", StringComparison.OrdinalIgnoreCase))
                throw new HttpException(400, "Invalid inspection action.");
            if (String.Equals(action, "VOID", StringComparison.OrdinalIgnoreCase) &&
                String.IsNullOrWhiteSpace(remark))
                throw new HttpException(400, "Reason for void is required.");

            using (var br = new WAL.BR.CF())
            {
                DataTable saved = br.EQueryP("spUTL_PIP_T_Inspection_Approval", new SqlParameter[] {
                    new SqlParameter("@p_InspectionID", inspectionId),
                    new SqlParameter("@p_Action", action.ToUpperInvariant()),
                    new SqlParameter("@p_EmployeeID", employeeId),
                    new SqlParameter("@p_CompanyID", companyId),
                    new SqlParameter("@p_LocationID", locationId),
                    new SqlParameter("@p_Remark", String.IsNullOrEmpty(remark) ? (object)DBNull.Value : remark)
                }, true, true);
                return new { success = true, action = action.ToUpperInvariant(), inspectionId = inspectionId };
            }
        }

        private static string TokenString(JObject obj, string name)
        {
            JToken token = obj == null ? null : obj[name];
            return token == null || token.Type == JTokenType.Null ? "" : token.ToString();
        }

        private static int TokenInt(JObject obj, string name)
        {
            int value;
            return Int32.TryParse(TokenString(obj, name), out value) ? value : 0;
        }

        private static bool TokenBool(JObject obj, string name)
        {
            bool value;
            return Boolean.TryParse(TokenString(obj, name), out value) && value;
        }

        private static object DbString(string value)
        {
            return String.IsNullOrEmpty(value) ? (object)DBNull.Value : value;
        }

        private static string Limit(string value, int maxLength)
        {
            value = value ?? "";
            return value.Length <= maxLength ? value : value.Substring(0, maxLength);
        }

        private static DateTime ParseDate(string value, DateTime fallback)
        {
            DateTime parsed;
            return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out parsed)
                ? parsed : fallback;
        }

        private static object ParseNullableDate(string value)
        {
            if (String.IsNullOrWhiteSpace(value)) return DBNull.Value;
            DateTime parsed;
            if (!DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out parsed))
                return DBNull.Value;
            return parsed;
        }
    }
}
