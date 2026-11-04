using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.Services;
using System.Data;
using WAL;

namespace UTL1
{
    public partial class profilesetting : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {

        }
        [WebMethod]
        public static object SaveSetting(string p_userid, string p_oldpassword, string p_newpassword, string p_theme)
        {
            using (var oUser = new WAL.BR.CF())
            {
                string V_Pwd = oUser.GetHashStringSQL(p_oldpassword);
                DataTable dt = oUser.EQuery("SELECT x.* FROM UTL_User x " +
                                            "WHERE x.UserID=@UserID",
                                            "@UserID=" + p_userid);
                if (dt.Rows.Count > 0)
                {
                    if (p_newpassword != "" && Convert.ToString(dt.Rows[0]["Password"]).Trim() != V_Pwd.Trim())
                    {
                        return new { message = "Wrong password" };
                    }
                    oUser.EQuery("update UTL_User SET Password=CASE WHEN @Password<>'' THEN @Password ELSE Password END, Theme=@Theme WHERE UserID=@UserID",
                        "@UserID=" + p_userid + GF.Str2 +
                        "@Password=" + (p_newpassword != "" ? oUser.GetHashStringSQL(p_newpassword) : "") + GF.Str2 +
                        "@Theme=" + p_theme);
                    return new { message = "ok" };
                }
                else
                {
                    return new { message = "User Not found" };
                }
            }

        }
    }
}