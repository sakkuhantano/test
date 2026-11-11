using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.Services;
using System.Data.SqlClient;
using System.Data;
using System.Text;
using WAL;
using System.Web.Script.Serialization;

namespace UTL1.Secure
{
    public partial class templatelookup : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {

        }
        [WebMethod]
        public static string GetTemplateLookup(string sectionId, string companyId, string locationId)
        {
            using (var br=new WAL.BR.CF())
            {
                string sql = @"
SELECT
    T.TemplateNo,
    T.TemplateName,
    V.Version,
    V.EffectiveDate,
    V.Remark,
    T.IDTemplate,
    V.IDVersion
FROM PIP_M_CheckListWOPM T
INNER JOIN
PIP_M_CheckListWOPM_Version V
ON
    T.IDTemplate = V.IDTemplate
WHERE
    T.SectionID = @SectionID
AND
    V.Status = 'Active' AND T.CompanyID=@CompanyID AND T.LocationID=@LocationID
ORDER BY T.TemplateNo
";
                var rows = new List<Dictionary<string, object>>(); 
                foreach (DataRow r in br.EQuery(sql, "@SectionID=" + sectionId + GF.Str2 +
                                                     "@CompanyID=" + companyId + GF.Str2 +
                                                     "@LocationID=" + locationId).Rows)
                {
                    var row =
                            new Dictionary<string, object>();

                    row["TemplateNo"] = r["TemplateNo"];
                    row["TemplateName"] = r["TemplateName"];
                    row["Version"] = r["Version"];
                    row["EffectiveDate"] =
                        r["EffectiveDate"] == DBNull.Value
                        ? ""
                        : Convert.ToDateTime(
                            r["EffectiveDate"])
                          .ToString("dd-MMM-yyyy");
                    rows.Add(row);                    
                }
                return new JavaScriptSerializer().Serialize(rows);
            }
        }
        [WebMethod]
        public static string GetTemplatePreview(string templateNo, string version, string companyId, string locationId)
        {
            var result = new Dictionary<string, object>();
            string sqlHeader =
        @"
SELECT TOP 1
    T.TemplateNo,
    T.TemplateName,
    V.Version,
    V.Status,
    V.EffectiveDate,
    V.Remark, V.IDVersion
FROM PIP_M_CheckListWOPM T
INNER JOIN PIP_M_CheckListWOPM_Version V
    ON T.IDTemplate = V.IDTemplate
WHERE
    T.TemplateNo=@TemplateNo AND T.CompanyID=@CompanyID AND T.LocationID=@LocationID
    AND
    (
        (@Version='' OR @Version IS NULL)
        AND V.Status='Active'
        OR
        V.Version=@Version
    )
";

            string sqlSection =
        @"
SELECT
    IDSection,
    SectionName,
    DisplayOrder
FROM PIP_M_CheckListWOPM_Section
WHERE
    IDVersion=@IDVersion
ORDER BY DisplayOrder
";

            string sqlItem =
        @"
SELECT
    IDSection,
    ItemLabel,
    ItemType,
    Unit,
    DisplayOrder
FROM PIP_M_CheckListWOPM_Item
WHERE
    IDSection=@IDSection
ORDER BY
    DisplayOrder
";

            using (var br = new WAL.BR.CF())
            {
                DataTable dt = br.EQuery(sqlHeader, "@TemplateNo=" + templateNo + GF.Str2 +
                                                    "@Version=" + version + GF.Str2 +
                                                    "@CompanyID=" + companyId + GF.Str2 +
                                                    "@LocationID=" + locationId);
                int idVersion = 0;
                int idSection = 0;
                if (dt.Rows.Count > 0)
                {
                    result["TemplateNo"] = dt.Rows[0]["TemplateNo"];
                    result["TemplateName"] = dt.Rows[0]["TemplateName"];
                    result["Version"] = dt.Rows[0]["Version"];
                    result["Status"] = dt.Rows[0]["Status"];
                    result["Remark"] = dt.Rows[0]["Remark"];
                    result["EffectiveDate"] =
                        dt.Rows[0]["EffectiveDate"] == DBNull.Value
                        ? ""
                        : Convert.ToDateTime(
                            dt.Rows[0]["EffectiveDate"])
                          .ToString("dd-MMM-yyyy");
                    idVersion = Convert.ToInt32(dt.Rows[0]["IDVersion"]);
                }
                var sections = new List<Dictionary<string, object>>();
                dt = br.EQuery(sqlSection, "@IDVersion=" + idVersion);
                int totSec = 0, totItem = 0;
                foreach (DataRow r in dt.Rows)
                {
                    totSec++;
                    var sec = new Dictionary<string, object>();
                    sec["IDSection"] = r["IDSection"];
                    sec["SectionName"] = r["SectionName"];
                    var items = new List<Dictionary<string, object>>();
                    idSection = Convert.ToInt32(r["IDSection"]);
                    DataTable dt1 = br.EQuery(sqlItem, "@IDSection=" + idSection);
                    foreach (DataRow rr in dt1.Rows)
                    {
                        totItem++;
                        var item = new Dictionary<string, object>();
                        item["ItemLabel"] = rr["ItemLabel"];
                        item["ItemType"] = rr["ItemType"];
                        item["Unit"] = rr["Unit"];
                        items.Add(item);
                    }
                    sec["Items"] = items;
                    sections.Add(sec);
                }
                dt = br.EQuery(sqlItem, "@IDSection=" + idVersion);
                result["Sections"] = sections;
                result["TotalSection"] = totSec;
                result["TotalItem"] = totItem;

                return new JavaScriptSerializer().Serialize(result);
            }

        }
    }
}
