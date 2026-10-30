using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

using System.Collections;
using System.Data;
using System.Diagnostics;

using WAL;
using System.Web.UI.HtmlControls;

using System.Data.SqlClient;
using System.Web.Services;

namespace Web
{
    public partial class Login : WAL.PB
    {
        #region Control Event
        protected void Page_Load(object sender, System.EventArgs e)
        {
            if (!IsPostBack)
            {
                using (var ocf = new WAL.BR.CF())
                {
                    if (ocf.EQuery("SELECT * FROM SysWebCommonValue v WHERE v.AppID = 'ALL' AND v.ID = '" + Context.Request.Url.Host + "' AND v.CommonGroup = 'DomainNonWWW' ").Rows.Count > 0)
                    {
                        Response.Redirect(HttpContext.Current.Request.Url.AbsoluteUri.Replace("://", "://www."));
                    }
                }

                //lit_Title.Text = WAL.PB.AppID + " -> Login";

                _PrepareScreen();
                
            }

            //if (!Page.ClientScript.IsClientScriptBlockRegistered("openfullscreen"))
            //{
            //    Page.ClientScript.RegisterClientScriptBlock(Page.GetType(),
            //                                                "openfullscreen",
            //                                                "<script language=JavaScript> function fullscreen() " +
            //                                                "{ " +
            //                                                "   var hwnd = window.open('Default.aspx', '_FullWindow', 'status=yes,toolbar=no,menubar=no,location=no,resizable=yes,scrollbars=yes'); " +
            //                                                "} " +
            //                                                "</script>");
            //}
        }

        #endregion

        #region Main Functions
        private void _PrepareScreen()
        {
            //txt_Login_UserID.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lbtn_Login.ClientID + "');if(event.keyCode == 13){" + lbtn_Login.ClientID + ".style.display='none';document.getElementById('lbtn_LoginLoading').style.display = '';}");
            //txt_Login_Password.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'" + lbtn_Login.ClientID + "');if(event.keyCode == 13){" + lbtn_Login.ClientID + ".style.display='none';document.getElementById('lbtn_LoginLoading').style.display = '';}");


            //body1.Attributes.Add("onkeypress", "javascript:PostBackCtrlID_Enter(event.keyCode,'lbtnLogon');");

            //string s = "";
            //s += "Browser Capabilities" + Environment.NewLine;
            //s += "Type = " + Request.Browser.Type + ", " + Environment.NewLine;
            //s += "Name = " + Request.Browser.Browser + ", " + Environment.NewLine;
            //s += "Version = " + Request.Browser.Version + ", " + Environment.NewLine;
            //s += "Major Version = " + Request.Browser.MajorVersion + ", " + Environment.NewLine;
            //s += "Minor Version = " + Request.Browser.MinorVersion + ", " + Environment.NewLine;
            //s += "Platform = " + Request.Browser.Platform + ", " + Environment.NewLine;
            //s += "Is Beta = " + Request.Browser.Beta + ", " + Environment.NewLine;
            //s += "Is Crawler = " + Request.Browser.Crawler + ", " + Environment.NewLine;
            //s += "Is AOL = " + Request.Browser.AOL + ", " + Environment.NewLine;
            //s += "Is Win16 = " + Request.Browser.Win16 + ", " + Environment.NewLine;
            //s += "Is Win32 = " + Request.Browser.Win32 + ", " + Environment.NewLine;
            //s += "Supports Frames = " + Request.Browser.Frames + ", " + Environment.NewLine;
            //s += "Supports Tables = " + Request.Browser.Tables + ", " + Environment.NewLine;
            //s += "Supports Cookies = " + Request.Browser.Cookies + ", " + Environment.NewLine;
            //s += "Supports VBScript = " + Request.Browser.VBScript + ", " + Environment.NewLine;
            //s += "Supports JavaScript = " + Request.Browser.EcmaScriptVersion.ToString() + ", " + Environment.NewLine;
            //s += "Supports Java Applets = " + Request.Browser.JavaApplets + ", " + Environment.NewLine;
            //s += "Supports ActiveX Controls = " + Request.Browser.ActiveXControls + ", " + Environment.NewLine;
            //s += "Supports JavaScript Version = " + Request.Browser["JavaScriptVersion"] + Environment.NewLine;
            //lblinfo.ToolTip = s;
            //lblinfo.Text = Request.Browser.Browser + " " + Request.Browser.Version;
        }
        #endregion

        #region Private Functions

        [WebMethod]
        public static bool ValidateSession(
            string browserGuid,
            string serverGuid,
            string token)
        {
            using (var br=new WAL.BR.CF())
            {
                return br.EQuery("SELECT * FROM UserSession WHERE BrowserGuid = @BrowserGuid AND ServerGuid = @ServerGuid " +
                          "AND Token = @Token AND IsActive = 1 AND ExpireTime > GETDATE()",
                          "@BrowserGuid=" + browserGuid + GF.Str2 +
                          "@ServerGuid=" + serverGuid + GF.Str2 +
                          "@Token=" + token).Rows.Count > 0;
            }

        }
        [WebMethod]
        public static object F_Login(string p_userid, string p_password, string p_browserGuid, string p_deviceName)
        {
            string passwordHash;
            using (var oUser = new WAL.BR.CF())
            {
                passwordHash = oUser.GetHashStringSQL(p_password);
            }
            return F_LoginWithHash(p_userid, passwordHash, p_browserGuid, p_deviceName);
        }

        [WebMethod]
        public static object F_LoginByInfoID(string infoID, string p_browserGuid, string p_deviceName)
        {
            if (String.IsNullOrWhiteSpace(infoID) || infoID.Length > 100)
                return new { success = false, message = "Invalid portal login ticket." };

            try
            {
                using (var oUser = new WAL.BR.CF())
                {
                    // Consume the short-lived portal ticket atomically to prevent replay.
                    DataTable dtTicket = oUser.EQuery(
                        @"UPDATE SysWebInfo
                          SET ExpiredDate = GETDATE(), UpdateDate = GETDATE()
                          OUTPUT deleted.Description1 AS EmployeeID,
                                 deleted.Description2 AS PasswordHash
                          WHERE ID = @InfoID
                            AND Type = 'LinkApp'
                            AND AppID = 'WebApp'
                            AND DBName = 'MULIA'
                            AND ExpiredDate > GETDATE()",
                        "@InfoID=" + infoID);

                    if (dtTicket.Rows.Count != 1)
                        return new { success = false, message = "Portal login ticket is invalid, expired, or already used." };

                    string employeeID = Convert.ToString(dtTicket.Rows[0]["EmployeeID"]).Trim();
                    string passwordHash = Convert.ToString(dtTicket.Rows[0]["PasswordHash"]).Trim();
                    if (String.IsNullOrWhiteSpace(employeeID) || String.IsNullOrWhiteSpace(passwordHash))
                        return new { success = false, message = "Portal login ticket does not contain valid user credentials." };

                    DataTable dtUser = oUser.EQuery(
                        @"SELECT TOP 1 UserID
                          FROM UTL_User
                          WHERE EmployeeID = @EmployeeID
                            AND [Password] = @Password
                            AND IsActive = 1",
                        "@EmployeeID=" + employeeID + GF.Str2 +
                        "@Password=" + passwordHash);

                    if (dtUser.Rows.Count != 1)
                        return new { success = false, message = "UTL1 account not found or inactive." };

                    string userID = Convert.ToString(dtUser.Rows[0]["UserID"]).Trim();
                    return F_LoginWithHash(userID, passwordHash, p_browserGuid, p_deviceName);
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = "Portal login could not be completed." };
            }
        }

        [WebMethod]
        private static object F_LoginWithHash(string p_userid, string V_Pwd, string p_browserGuid, string p_deviceName)
        {
            using (var oUser = new WAL.BR.CF())
            {
                DataTable dt = oUser.EQuery("SELECT x.*, JobTitleName, EmailAddress, ProfitCenterNo, ISNULL(us.LastSyncMaster,CAST('' AS SMALLDATETIME)) LastSyncMaster, " +
                                            "UserName1=a.UserName, ISNULL(us.LastSyncWO,CAST('' AS SMALLDATETIME)) LastSyncWO " +
                                            "FROM UTL_User x " +
                                            "LEFT JOIN UserSession us ON us.IsActive=1 AND x.userid=us.userid " +
                                            "CROSS APPLY dbo.F_SelectOneLogin('pip', x.EmployeeID, '') a " +
                                            "WHERE x.UserID=@UserID",
                                            "@UserID=" + p_userid);
                var _arrList = new ArrayList();
                if (dt.Rows.Count > 0)
                {
                    if (Convert.ToString(dt.Rows[0]["Password"]).Trim() == V_Pwd.Trim())
                    {
                        string v_currcompany = "", v_currcompanyname = "", v_jobtitle = "", v_email = "", v_profitcenter = "", v_theme = "";
                        string v_serverguid = Guid.NewGuid().ToString();
                        string v_token = Guid.NewGuid().ToString();
                        string v_username = dt.Rows[0]["UserName1"] + "";
                        string v_section = dt.Rows[0]["Section"] + "";
                        v_jobtitle = dt.Rows[0]["JobTitleName"] + "";
                        v_email = dt.Rows[0]["EmailAddress"] + "";
                        v_profitcenter = dt.Rows[0]["ProfitCenterNo"] + "";
                        v_theme = dt.Rows[0]["Theme"] + "";
                        string V_EmpID = Convert.ToString(dt.Rows[0]["EmployeeID"]).Trim();
                        Dictionary<string, object> role = new Dictionary<string, object>();
                        role["IsELC"] = Convert.ToBoolean(dt.Rows[0]["IsELC"]);
                        role["IsWTR"] = Convert.ToBoolean(dt.Rows[0]["IsWTR"]);
                        role["IsGAS"] = Convert.ToBoolean(dt.Rows[0]["IsGAS"]);
                        role["IsWO"] = Convert.ToBoolean(dt.Rows[0]["IsWO"]);
                        role["IsSPV"] = GF.GetBoolean(dt.Rows[0]["IsSPV"]);
                        foreach (DataRow row in oUser.EQuery(
                            "select companylocation, companyname from (" +
                            "select companylocation, companyname, sourcepriority, " +
                            "ROW_NUMBER() OVER (PARTITION BY companylocation ORDER BY sourcepriority) rn from (" +
                            "SELECT a.companyid+';'+a.locationid companylocation, a.alias companyname, 0 sourcepriority " +
                            "FROM dbo.F_SelectOneLogin('pip', @userid, '') a " +
                            "union all " +
                            "select a.companyid+';'+a.locationid, b.alias, 1 " +
                            "from syswebusercompanylocation a join syswebcompany b on a.companyid=b.companyid where a.userid=@userid and a.appid='pip' " +
                            ") sources " +
                            ") ranked where rn=1 order by sourcepriority, companylocation",
                            "@userid=" + V_EmpID).Rows)
                        {
                            Dictionary<string, object> dict = new Dictionary<string, object>();
                            dict["companylocation"] = row["companylocation"];
                            dict["companyname"] = row["companyname"];
                            if (_arrList.Count == 0)
                            {
                                v_currcompany = row["companylocation"] + "";
                                v_currcompanyname = row["companyname"] + "";
                            }
                            _arrList.Add(dict);
                        };
                        try
                        {
                            oUser.EQuery(
    @"UPDATE UserSession SET IsActive=0 WHERE IsActive=1 AND UserID=@UserID
INSERT UserSession (ID, UserID, BrowserGuid, ServerGuid, Token, LoginTime, ExpireTime, IsActive, DeviceName, LastSyncMaster, LastSyncWO)
VALUES (ISNULL((SELECT MAX(ID) FROM UserSession),0)+1, @UserID, @BrowserGuid, @ServerGuid, @Token, GETDATE(), DATEADD(DAY,2,GETDATE()),1,@DeviceName,'','')
", "@UserID=" + p_userid + GF.Str2 +
       "@BrowserGuid=" + p_browserGuid + GF.Str2 +
       "@ServerGuid=" + v_serverguid + GF.Str2 +
       "@Token=" + v_token + GF.Str2 +
       "@DeviceName=" + p_deviceName
    );
                            return new
                            {
                                success = true,
                                message = "ok",
                                token = v_token,
                                serverguid = v_serverguid,
                                companylist = _arrList,
                                userid = p_userid,
                                username = v_username,
                                curcompany = v_currcompany,
                                curcompanyname = v_currcompanyname,
                                employeeid = V_EmpID,
                                role = role,
                                jobtitle = v_jobtitle,
                                email = v_email,
                                profitcenter = v_profitcenter,
                                theme = v_theme,
                                section = v_section,
                                lastsyncm = Convert.ToDateTime(dt.Rows[0]["LastSyncMaster"]).ToString(GF.FormatDate2),
                                lastsyncw = Convert.ToDateTime(dt.Rows[0]["LastSyncWO"]).ToString(GF.FormatDate2)
                            };
                        }
                        catch (Exception ex)
                        {
                            return new
                            {
                                success = false,
                                message = ex.Message
                            };
                        }

                    }
                    else
                    {
                        return new
                        {
                            success = false,
                            message = "wrong password..."
                        };
                    }
                }
                else
                {
                    return new
                    {
                        success = false,
                        message = "user not found..."
                    };
                }
            }


        }
        #endregion
    }
}