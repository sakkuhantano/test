// DOM Elements
const txt_Login_UserID = document.getElementById('txt_Login_UserID');
const passwordInput = document.getElementById('txt_Login_Password');
const passwordToggle = document.getElementById('passwordToggle');
const passwordIcon = document.getElementById('passwordIcon');
const loginButton = document.getElementById('btn_Login');
//const btnText = document.getElementById('btnText');
//const btnIcon = document.getElementById('btnIcon');
//const btnSpinner = document.getElementById('btnSpinner');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    txt_Login_UserID.focus();
});

window.addEventListener("load",async function () {
    var data = getLoginData();
    if (data) {
		var success = await validateSession(data.browserGuid, data.serverGuid, data.token);
		if (success) {
			window.location.href = "Secure/dashboard.aspx";
		}
        //await getEmployees();
    }
});

// Toggle Password Visibility
passwordToggle.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    // Toggle icon
    if (type === 'text') {
        //passwordIcon.classList.remove('bi-eye-slash');
        //passwordIcon.classList.add('bi-eye');
        passwordIcon.classList.remove('bi-eye-slash-fill');
        passwordIcon.classList.add('bi-eye-fill');
    } else {
        //passwordIcon.classList.remove('bi-eye');
        //passwordIcon.classList.add('bi-eye-slash');
        passwordIcon.classList.remove('bi-eye-fill');
        passwordIcon.classList.add('bi-eye-slash-fill');
    }
});


//txt_Login_UserID.addEventListener('keydown', handleEnterLogin);
txt_Login_UserID.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        //hideNumpad();

        setTimeout(() => {
            passwordInput.focus();
            //showNumpad(passwordInput); 
        }, 50);
    }
});
passwordInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        F_Login();
    }
});

// Login Button Handler
loginButton.addEventListener('click', function() {
    F_Login();
});

// Prepare screen
function F_PS() {
    loginButton.classList.remove('btn-loading');
    loginButton.disabled = false;
}

// Process Login
function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x'
                ? r
                : (r & 0x3 | 0x8);
            return v.toString(16);
        });
}

function F_Login() {
    const userid = txt_Login_UserID.value.trim();
    const password = passwordInput.value.trim();
                
    if (!userid) {
        showToast('Please fill in username', 'error');
        txt_Login_UserID.focus();
        return;
    }

    //if (!password) {
    //    showToast('Please fill in password', 'error');
    //    passwordInput.focus();
    //    return;
    //}

    // Show loading
    loginButton.classList.add('btn-loading');
    loginButton.disabled = true;
    //var browserGuid = crypto.randomUUID();
    var browserGuid = generateGUID();
    var deviceName = navigator.userAgent;
    
    fetch('Login.aspx/F_Login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            p_userid: userid,
            p_password: password,
            p_browserGuid: browserGuid,
            p_deviceName: deviceName
        })
    })
    .then(response => response.json())
    .then(async result => {
        const data = result.d;

        if (data.success) {
            var obj = {
                userid: userid,
                browserGuid: browserGuid,
                serverGuid: data.serverguid,
                token: data.token,
                username: data.username,
                curcompany: data.curcompany,
				companylist: data.companylist,
                curcompanyname: data.curcompanyname,
                employeeid: data.employeeid,
                role: data.role,
                jobtitle: data.jobtitle,
                email: data.email,
                profitcenter: data.profitcenter,
                theme: data.theme,
				section: data.section,
                lastsyncw : "",
                lastMeterPeriod : "",
                lastMeterSync : "1900-01-02"
            };

            setLoginData(obj);
            //var encoded = btoa(JSON.stringify(obj));
            //localStorage.setItem("loginData", encoded);
            // INIT DB
            await initIndexedDB();

            // SIMPAN COMPANY
            await saveCompanyList(data.companylist);
            
            const [companyId, locationId] = data.curcompany.split(';');
            await setLastSyncData(companyId, locationId);

            //await getEmployees();
            showToast(data.message);
            window.location.href = "Secure/dashboard.aspx";
        } else {
                        
            showToast(data.message, 'error');
        }
                    
        F_PS();
    })
    .catch(err => {
        console.error(err);
        showToast('Server error, try again', 'error');

        F_PS();
    });
}

//window.addEventListener("load", function() {
//    checkLogin();
//    setInterval(function () {
//        checkLogin();
//    }, 60000);
//});