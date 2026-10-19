using System.Linq;
using Microsoft.VisualBasic;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Net.Mail;
using System.Net;
using System.Net.Http;
using System.Web.UI.WebControls;
using System.Web.Script.Serialization;
using System.Web;
using System.IO;
using System.Security.Cryptography;
using System.Web.UI;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using WAL;
using WAL.BR;
using System.Data.SqlClient;
using CrystalDecisions.CrystalReports.Engine;
using CrystalDecisions.Shared;
using Newtonsoft.Json.Linq;

namespace WAL
{
    public sealed class GFC
    {
        [DllImport("advapi32.DLL", SetLastError = true)]
        public static extern int LogonUser(string lpszUsername, string lpszDomain, string lpszPassword, int dwLogonType, int dwLogonProvider, ref IntPtr phToken);
        #region Variable Others
        public const string PrefixStr = "ctl00$ContentPlaceHolder1$";
        public const string FolderName = "QMS";
        public const string XLSXFolderName = "XLSXs";
        public const string FormatCurrencyAccountIdr = "#,##0_);(#,##0)";
        public const string FormatCurrencyAccountUs = "#,##0.00_);(#,##0.00)";
        public const string V_Sever_DataHO_IP = "192.168.2.30";
        public const string V_Server_DataHO_User = "Administrator";
        public const string V_Server_DataHO_Domain = V_Sever_DataHO_IP;
        public const string V_Server_DataHO_Password = "17081945Property";
        public enum DateInterval
        {
            Day,
            Month,
            Quarter,
            Year,
            Hour,
            Minute,
            Second,
            Millisecond
        }
        #endregion


        #region Function
        public static int DateDiff(DateTime startDate, DateTime endDate, DateInterval interval)
        {
            switch (interval)
            {
                case DateInterval.Day:
                    return (endDate - startDate).Days;
                case DateInterval.Month:
                    return (endDate.Year - startDate.Year) * 12 + (endDate.Month - startDate.Month);
                case DateInterval.Quarter:
                    return (endDate.Year - startDate.Year) * 4 + (endDate.Month / 3 - startDate.Month / 3);
                case DateInterval.Year:
                    return endDate.Year - startDate.Year;
                case DateInterval.Hour:
                    return (endDate - startDate).Hours;
                case DateInterval.Minute:
                    return (endDate - startDate).Minutes;
                case DateInterval.Second:
                    return (endDate - startDate).Seconds;
                case DateInterval.Millisecond:
                    return (endDate - startDate).Milliseconds;
                default:
                    throw new ArgumentOutOfRangeException(interval.GetType().Name, "Interval not supported.");
            }
        }

        public static string PeriodMonthOrYear(DateTime _date, string _type = "Month")
        {
            string _retval = string.Empty;
            switch (_type)
            {
                case "EarlyMonth":
                    _retval = GF.CDate(_date.ToString(GF.FormatYearMonth) + "01", GF.FormatDate4).ToString(GF.FormatDate);
                    break;
                case "Month":
                    _retval = GF.CDate(_date.ToString(GF.FormatYearMonth) + "01", GF.FormatDate4).AddMonths(1).AddDays(-1).ToString(GF.FormatDate);
                    break;
                case "Year":
                    _retval = GF.CDate(_date.ToString(GF.FormatYear) + "1231", GF.FormatDate4).ToString(GF.FormatDate);
                    break;

            }
            return _retval;
        }
        public static DataTable F_ESS_M_ProfitCenterNo()
        {
            DataTable _retval;

            using (WAL.BR.CF pc = new WAL.BR.CF())
            {
                _retval = pc.ExecuteSQL("SELECT " +
                                        "p.* " +
                                        "FROM VW_ESS_M_ProfitCenter p " +
                                        "WHERE p.GroupID = (CASE " +
                                        "                      WHEN " +
                                        "                      ( " +
                                        "                          SELECT ISNULL(local_net_address, '127.0.0.1') " +
                                        "                          FROM sys.dm_exec_connections x " +
                                        "                          WHERE session_id = @@SPID " +
                                        "                      ) = '192.168.34.10' THEN " +
                                        "                          '02' " +
                                        "                      ELSE " +
                                        "                          '01' " +
                                        "                  END)");
            }

            return _retval;
        }
        public static void F_LoadDDLProfitCenterNo(ref DropDownList ddl)
        {
            ddl.Items.Clear();

            using (WAL.BR.CF pc = new WAL.BR.CF())
            {
                ddl.DataTextField = "ProfitCenterName";
                ddl.DataValueField = "ProfitCenterNo";
                ddl.DataSource = F_ESS_M_ProfitCenterNo();
                ddl.DataBind();
            }

            ddl.Items.Add(new ListItem("", ""));
        }
        public static void UpdateExpiredDate(string p_ID)
        {
            using (SysWebInfo si = new SysWebInfo())
            {
                si.ID = p_ID;
                if (si.SelectOne().Rows.Count > 0)
                {
                    si.ExpiredDate = si.UpdateDate.AddDays(-1);
                    si.UpdateExpiredDateByID();
                }
            }
        }

        public static string GetHashStringSQL(string p_str)
        {
            string _retval = "";
            using (var ocf = new WAL.BR.CF())
            {
                _retval = ocf.EQuery("SELECT x.EnStr " +
                                     "FROM dbo.F_GetHashStringSQL(@p_Str, default) x ",
                                     "@p_Str=" + p_str).Rows[0]["EnStr"] + "";

            }
            return _retval;
        }
        public static string GetUserIPAddress()
        {
            System.Web.HttpContext context = System.Web.HttpContext.Current;
            string sIPAddress = context.Request.ServerVariables["HTTP_X_FORWARDED_FOR"];
            if (String.IsNullOrEmpty(sIPAddress))
            {
                return context.Request.ServerVariables["REMOTE_ADDR"];
            }
            else
            {
                return GF.SplitStr(sIPAddress, ",")[0];
            }
        }
        public static string SysWebInfo_Insert_RID(string p_UserID,
                                                   string p_Type,
                                                   string p_Description,
                                                   string p_Description1,
                                                   string p_Description2,
                                                   string p_Description3,
                                                   string p_FolderName = "")
        {
            string _retval = "";
            DateTime V_GetDateTime = GF.DBSDatetime();
            using (var swi = new WAL.BR.SysWebInfo()
            {
                ID = GetHashStringSQL(V_GetDateTime.ToString(GF.FormatDateTime3)),
                UserID = p_UserID,
                IPAddress_User = GetUserIPAddress(),
                AppID = PB.AppID,
                Type = p_Type,
                Description = p_Description,
                Description1 = p_Description1,
                Description2 = p_Description2,
                Description3 = p_Description3,
                ExpiredDate = V_GetDateTime.AddSeconds(PB.ReportExpiresInSeconds)
            })
            {
                if (p_FolderName == "")
                {
                    swi.InsertCustom1();
                    _retval = swi.ID;
                }
                else
                {
                    string FileName = swi.ID + ".txt";
                    try
                    {
                        Directory.Delete(p_FolderName, true);
                    }
                    catch (Exception)
                    {
                    }
                    Directory.CreateDirectory(p_FolderName);
                    StreamWriter sw = File.CreateText(p_FolderName + "\\" + FileName);
                    sw.WriteLine(swi.UserID);
                    sw.WriteLine(swi.IPAddress_User);
                    sw.WriteLine(swi.AppID);
                    sw.WriteLine(swi.Type);
                    sw.WriteLine(swi.Description);
                    sw.WriteLine(swi.Description1);
                    sw.WriteLine(swi.Description2);
                    sw.WriteLine(swi.Description3);
                    sw.Flush();
                    sw.Close();
                    _retval = Path.GetFileName(p_FolderName) + ";" + swi.ID;
                }
            }
            return _retval;
        }
        public static bool F_CR_ExportToDisk(SqlConnection p_conn = null,
                                             SqlTransaction p_Trans = null,
                                             string p_FullPath = "",
                                             string p_FileNameType = "",
                                             string p_SP_Name = "",
                                             string p_RptFileName = "",
                                             SqlParameter[] p_SP_ListParam = null,
                                             string p_Rpt_ListParam = "",
                                             CREFileType p_CREFileType = CREFileType.PDF,
                                             string p_PaperSizeName = "",
                                             string p_PrinterName = "",
                                             string p_AppID = "")
        {
            bool _retval = false;

            using (ReportDocument rd = new ReportDocument())
            {
                //Begin Your .rpt file path will be below
                string _pathWebReports3 = PB.Path_WebReports3;
                if (p_AppID != "")
                {
                    _pathWebReports3 = _pathWebReports3.Replace("\\" + PB.AppID + "\\", "\\" + p_AppID + "\\");
                }
                rd.Load(_pathWebReports3 + p_RptFileName + ".rpt");
                //End Your .rpt file path will be below

                //begin set DataSource to the report . 
                using (var ocf = new WAL.BR.CF())
                {
                    rd.SetDataSource(ocf.EQP(
                        p_CommandText: p_SP_Name,
                        p_ListParam: p_SP_ListParam,
                        p_IsSP: true, p_conn: p_conn, p_Trans: p_Trans
                        ));
                }
                //End set DataSource to the report.

                //Begin Param filed report viewer.
                string[] V_SPV = WAL.GF.SplitStr(p_Rpt_ListParam, WAL.GF.Str2);
                for (int i = 0; i <= V_SPV.Count() - 1; i++)
                {
                    if (V_SPV[i] != "")
                    {
                        rd.SetParameterValue(V_SPV[i].Split('=')[0], V_SPV[i].Split('=')[1] + "");
                    }
                }
                //End Param filed report viewer.

                string V_FullPath_FileNameType = p_FullPath + "\\" + p_FileNameType;

                if (p_PaperSizeName != "")
                {
                    bool V_IsValidPaperSizeName = false;

                    try
                    {
                        if (p_PrinterName == "")
                        {
                            p_PrinterName = GF.DefaultPrinterName;
                            //p_PrinterName = "PDFill PDF&Image Writer";
                        }

                        DataView V_odv;
                        using (var ocf = new WAL.BR.CF())
                        {
                            V_odv = ocf.EQP(
                                p_CommandText: "SELECT x.* " +
                                               "FROM SysWebPrinterSettings x " +
                                               "WHERE x.IPAddress = @IPAddress " +
                                               "AND x.PrinterName = @PrinterName " +
                                               "AND x.PaperSizes = @PaperSizes ",
                                p_ListParam: new SqlParameter[] 
                                                 {
                                                     new SqlParameter("@IPAddress", HttpContext.Current.Request.Url.Host),
                                                     new SqlParameter("@PrinterName", p_PrinterName),
                                                     new SqlParameter("@PaperSizes", p_PaperSizeName)
                                                 },
                                p_IsSP: false, p_conn: p_conn, p_Trans: p_Trans
                                ).DefaultView;
                        }

                        //using (var ocf = new WAL.BR.CF())
                        //{
                        //    ocf.EQueryP("INSERT INTO abc ( testing ) " +
                        //                "SELECT @str ",
                        //                new SqlParameter[] 
                        //            {
                        //                new SqlParameter("@str", "1. Total PrinterSettings " + Convert.ToString(V_odv.Count))
                        //            });
                        //}

                        if (V_odv.Count > 0)
                        {
                            rd.PrintOptions.NoPrinter = false;
                            try
                            {
                                rd.PrintOptions.PaperSize = (CrystalDecisions.Shared.PaperSize)Convert.ToInt32(V_odv[0]["RawKind"]);
                            }
                            catch (Exception ex) { }
                            rd.PrintOptions.PrinterName = p_PrinterName;
                            V_IsValidPaperSizeName = true;

                            //using (var ocf = new WAL.BR.CF())
                            //{
                            //    ocf.EQueryP("INSERT INTO abc ( testing ) " +
                            //                "SELECT @str ",
                            //                new SqlParameter[] 
                            //        {
                            //            new SqlParameter("@str", "2. PrintOptions " + Convert.ToString((CrystalDecisions.Shared.PaperSize)Convert.ToInt32(V_odv[0]["RawKind"])) + " | " + p_PrinterName)
                            //        });
                            //}
                        }
                        else
                        {
                            System.Drawing.Printing.PrintDocument doctoprint = new System.Drawing.Printing.PrintDocument();
                            doctoprint.PrinterSettings.PrinterName = p_PrinterName;
                            foreach (System.Drawing.Printing.PaperSize oPaperSize in doctoprint.PrinterSettings.PaperSizes)
                            {
                                //strlog = strlog + "[" + Convert.ToString(oPaperSize.RawKind) + "] " + oPaperSize.PaperName + "<br/>";
                                if (oPaperSize.PaperName == p_PaperSizeName)
                                {
                                    rd.PrintOptions.NoPrinter = false;
                                    //rd.PrintOptions.PaperSize = (CrystalDecisions.Shared.PaperSize)oPaperSize.RawKind;
                                    try
                                    {
                                        rd.PrintOptions.PaperSize = (CrystalDecisions.Shared.PaperSize)oPaperSize.RawKind;
                                    }
                                    catch (Exception ex) { }
                                    rd.PrintOptions.PrinterName = p_PrinterName;
                                    V_IsValidPaperSizeName = true;

                                    using (var ocf = new WAL.BR.CF())
                                    {
                                        V_odv = ocf.EQP(
                                            p_CommandText: "INSERT INTO SysWebPrinterSettings " +
                                                           "( " +
                                                           "   IPAddress, PrinterName, RawKind, PaperSizes " +
                                                           ") " +
                                                           "SELECT @IPAddress, @PrinterName, @RawKind, @PaperSizes ",
                                            p_ListParam: new SqlParameter[] 
                                                             {
                                                                 new SqlParameter("@IPAddress", HttpContext.Current.Request.Url.Host),
                                                                 new SqlParameter("@PrinterName", p_PrinterName),
                                                                 new SqlParameter("@RawKind", oPaperSize.RawKind),
                                                                 new SqlParameter("@PaperSizes", p_PaperSizeName)
                                                             },
                                            p_IsSP: false, p_conn: p_conn, p_Trans: p_Trans
                                            ).DefaultView;
                                    }

                                    break;
                                }
                            }
                        }
                    }
                    catch (Exception ex) { }

                    if (V_IsValidPaperSizeName == false)
                    {
                        throw new Exception("PrinterName (" + p_PrinterName + ") or PaperSizeName (" + p_PaperSizeName + ") is not found.");
                    }
                }

                if (!Directory.Exists(p_FullPath))
                {
                    Directory.CreateDirectory(p_FullPath);
                }

                if (File.Exists(V_FullPath_FileNameType))
                {
                    // Hapus file yang sudah ada
                    try
                    {
                        File.Delete(V_FullPath_FileNameType);
                    }
                    catch (Exception) { }
                }

                switch (p_CREFileType)
                {
                    case CREFileType.PDF:
                        rd.ExportToDisk(ExportFormatType.PortableDocFormat, V_FullPath_FileNameType);
                        break;
                    case CREFileType.MSWord:
                        rd.ExportToDisk(ExportFormatType.WordForWindows, V_FullPath_FileNameType);
                        break;
                    case CREFileType.RTF:
                        rd.ExportToDisk(ExportFormatType.RichText, V_FullPath_FileNameType);
                        break;
                    case CREFileType.MSExcel:
                        rd.ExportToDisk(ExportFormatType.Excel, V_FullPath_FileNameType);
                        break;
                    case CREFileType.MSExcel_DataOnly:
                        rd.ExportToDisk(ExportFormatType.ExcelRecord, V_FullPath_FileNameType);
                        break;
                    case CREFileType.CSV:
                        rd.ExportToDisk(ExportFormatType.CharacterSeparatedValues, V_FullPath_FileNameType);
                        break;
                }

                _retval = File.Exists(V_FullPath_FileNameType);
            }

            return _retval;
        }
        public static string GetEmailBCC()
        {
            string EmailBCC = string.Empty;

            using (WAL.BR.CF cfoo = new WAL.BR.CF())
            {

                EmailBCC = cfoo.ExecuteSQL("select Description from syswebcommonvalue where CommonGroup = 'BCC' and APPID = 'PIP'").Rows[0]["Description"].ToString();
            }

            return EmailBCC;
        }
        public static string LocationID_KL()
        {
            string _retval = "";
            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery("SELECT " +
                                        "ISNULL(STUFF( " +
                                        "( " +
                                        "  SELECT ',[' + c.ID + ']' " +
                                        "  FROM SysWebCommonValue c " +
                                        "  WHERE c.CommonGroup = 'KLID' " +
                                        "  FOR XML PATH('') " +
                                        ") " +
                                        ", 1, 1, ''),'') AS LocationID");
                _retval = dt.Rows[0][0].ToString();
            }
            return _retval;
        }
        public static void GetAutoNumBillDateUTL(string p_AutoNum, ref DateTime p_BillDate, ref string p_AutoNumSeqNo)
        {
            using (var ug=new WAL.BR.CF())
            {
                DataTable dt = ug.EQueryP("DECLARE @V_tmp VARCHAR(MAX) = '' " +
"EXEC sp_GetGenerateAutoNumID @AutoNum = @p_AutoNum, " +
"							 @IsUpdateSeqNo = 0, " +
"							 @p_IsShowRsl = 0, " +
"							 @p_rsl = @V_tmp OUT " +
"SELECT " +
"(SELECT val FROM dbo.SplitStringConvertToTable(@V_tmp,';') WHERE id=1) AS AutoNumSeqNo, " +
"(SELECT CAST(val AS SMALLDATETIME) FROM dbo.SplitStringConvertToTable(@V_tmp,';') WHERE id=2) AS [Date] ",
new SqlParameter[] { new SqlParameter("@p_AutoNum", p_AutoNum) });
                p_BillDate = GF.GetDateTime(dt.Rows[0][1]);
                p_AutoNumSeqNo = GF.GetString(dt.Rows[0][0]);
            }
        }
        public static bool IsPrint2PDF(string _companyID, string _locationID)
        {
            bool _retval = false;
            using (var br = new WAL.BR.CF())
            {
                _retval = br.EQuery("SELECT * FROM SysWebCommonValue c WHERE c.CommonGroup='UTLPrint2PDF' AND ID=@CompanyID+@LocationID",
                    "@CompanyID=" + _companyID + GF.Str2 +
                    "@LocationID=" + _locationID).Rows.Count > 0;
            }
            return _retval;
        }
        public static bool UploadFilesToServer(
            List<Dictionary<string, string>> fileItems,
            string folderPathServer,
            string fullpathLogFileName
        )
        {
            bool allSuccess = true;
            try
            {
                string url = "http://" + GFC.V_Sever_DataHO_IP + "/WebReports1/Secure/P_UploadFile.ashx?action=copyfile";
                //string url = "http://192.168.23.128/WebReports1/Secure/P_UploadFile.ashx?action=copyfile";

                using (var client = new HttpClient())
                using (var form = new MultipartFormDataContent())
                {
                    // Tambah folder path tujuan
                    form.Add(new StringContent(folderPathServer), "folderPath");

                    // Tambah file
                    int index = 0;
                    foreach (var item in fileItems)
                    {
                        string sourceFile = item["source"];
                        string newFileName = item["newname"];
                        if (!File.Exists(sourceFile))
                        {
                            File.AppendAllText(fullpathLogFileName, "FILE NOT FOUND: " + sourceFile + Environment.NewLine);
                            allSuccess = false;
                            continue;
                        }
                        var fileContent =
                            new StreamContent(File.OpenRead(sourceFile));
                        form.Add(
                            fileContent,
                            "file" + index,
                            Path.GetFileName(sourceFile)
                        );
                        form.Add(
                            new StringContent(newFileName),
                            "newFileNames[" + index + "]"
                        );
                        index++;
                    }
                    if (index == 0)
                    {
                        File.AppendAllText(fullpathLogFileName, "NO FILE TO UPLOAD" + Environment.NewLine);
                        return false;
                    }

                    // Kirim request
                    var response = client.PostAsync(url, form).Result;

                    // Kalau HTTP gagal
                    if (!response.IsSuccessStatusCode)
                    {
                        File.AppendAllText(fullpathLogFileName, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " | HTTP ERROR: " + response.StatusCode + Environment.NewLine);
                        return false;
                    }

                    // Baca JSON result
                    string resultJson = response.Content.ReadAsStringAsync().Result;

                    // Log raw JSON
                    File.AppendAllText(fullpathLogFileName, "RAW JSON: " + resultJson + Environment.NewLine);

                    // Parse JSON
                    JavaScriptSerializer js = new JavaScriptSerializer();

                    Dictionary<string, object> result =
                        js.Deserialize<Dictionary<string, object>>(resultJson);

                    // Generate Batch ID
                    string batchId = DateTime.Now.ToString("yyyyMMddHHmmss");

                    if (result.ContainsKey("files"))
                    {
                        System.Collections.ArrayList files =
                            (System.Collections.ArrayList)result["files"];

                        foreach (object fileObj in files)
                        {
                            Dictionary<string, object> file =
                                (Dictionary<string, object>)fileObj;

                            string fileName =
                                file["fileName"].ToString();

                            string status =
                                file["status"].ToString();

                            string message = "";

                            if (file.ContainsKey("message"))
                            {
                                message =
                                    file["message"].ToString();
                            }

                            string logText =
                                DateTime.Now.ToString(
                                    "yyyy-MM-dd HH:mm:ss")
                                + " | BATCH:"
                                + batchId
                                + " | FILE:"
                                + fileName
                                + " | STATUS:"
                                + status.ToUpper();

                            if (status == "failed")
                            {
                                logText +=
                                    " | MSG:"
                                    + message;
                            }

                            File.AppendAllText(
                                fullpathLogFileName,
                                logText + Environment.NewLine
                            );
                        }
                    }
                }
                return allSuccess;
            }
            catch (Exception ex)
            {
                File.AppendAllText(fullpathLogFileName, "UPLOAD ERROR: " + ex.ToString() + Environment.NewLine);
                return false;
            }
        }
        public static object getData_DS(DataSet ds)
        {
            var listobj = new Dictionary<string, object>();
            foreach (DataTable dt in ds.Tables)
            {
                var list = new List<Dictionary<string, object>>();
                foreach (DataRow row in dt.Rows)
                {
                    var dict = new Dictionary<string, object>();
                    foreach (DataColumn col in dt.Columns)
                    {
                        dict[col.ColumnName] = row[col];
                    }
                    list.Add(dict);
                }
                listobj[dt.TableName] = list;
            }
            return new
            {
                data = listobj
            };

        }
        public static object getData(DataTable dt)
        {
            List<Dictionary<string, object>> list =
                new List<Dictionary<string, object>>();

            foreach (DataRow row in dt.Rows)
            {
                Dictionary<string, object> dict =
                    new Dictionary<string, object>();

                foreach (DataColumn col in dt.Columns)
                {
                    if (col.ColumnName.ToUpper() != "LASTSYNC")
                        dict[col.ColumnName] = row[col];
                }
                list.Add(dict);
            }
            return new
            {
                data = list,
                serverTime = GF.DBSDatetime().ToString("yyyy-MM-ddTHH:mm:ss")
            };

        }
        public static DataTable JsonToDataTable(JArray arr)
        {
            DataTable dt = new DataTable();

            if (arr == null || arr.Count == 0)
                return dt;

            // Sediakan Unix Epoch di awal (Kompatibel C# 5.0 / VS 2013)
            DateTime epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

            // =====================================
            // BUILD COLUMNS
            // =====================================
            foreach (JToken token in arr)
            {
                JObject obj = (JObject)token;

                foreach (var prop in obj.Properties())
                {
                    if (!dt.Columns.Contains(prop.Name))
                    {
                        dt.Columns.Add(
                            prop.Name,
                            typeof(string)
                        );
                    }
                }
            }

            // =====================================
            // ROWS
            // =====================================
            foreach (JToken token in arr)
            {
                JObject obj = (JObject)token;
                DataRow row = dt.NewRow();

                foreach (var prop in obj.Properties())
                {
                    if (prop.Value == null || prop.Value.Type == JTokenType.Null)
                    {
                        row[prop.Name] = "";
                    }
                    else
                    {
                        string valStr = prop.Value.ToString();

                        // TAMBAHAN LOGIK: Cek apakah string berisi format /Date(...)/
                        if (valStr.StartsWith("/Date(") && valStr.EndsWith(")/"))
                        {
                            // 1. Ekstrak angka milidetik dengan Regex
                            string msString = Regex.Match(valStr, @"\d+").Value;
                            long ms = long.Parse(msString);

                            // 2. Hitung DateTime lokal (Aman untuk .NET lama)
                            DateTime dateVal = epoch.AddMilliseconds(ms).ToLocalTime();

                            // 3. Masukkan ke row dengan format tanggal yang Anda inginkan
                            row[prop.Name] = dateVal.ToString("yyyy-MM-dd HH:mm:ss");
                        }
                        else
                        {
                            // Jika bukan tanggal, masukkan string normal seperti biasa
                            row[prop.Name] = valStr;
                        }
                    }
                }

                dt.Rows.Add(row);
            }

            return dt;
        }
        #endregion
    }
}



