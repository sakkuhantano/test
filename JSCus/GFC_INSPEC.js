/* Shared client helpers for INSPEC Template Editor and WO Employee Assignment. */
(function (window, document) {
    "use strict";
    function context() { return window.INSPEC_CONTEXT || {}; }
    window.getLoginData = function () { return context(); };
    window.getCurrentCompany = function () {
        var c = context();
        return { companyId: c.companyid || "", locationId: c.locationid || "" };
    };
    window.promisifyPageMethod = function (method) {
        var args = Array.prototype.slice.call(arguments, 1);
        return new Promise(function (resolve, reject) {
            if (typeof method !== "function") { reject(new Error("INSPEC PageMethod is unavailable.")); return; }
            args.push(resolve, function (error) {
                var message = "";
                try {
                    if (error && typeof error.get_message === "function") message = error.get_message();
                    else if (error && error.message) message = error.message;
                    else if (typeof error === "string") message = error;
                    else if (error) message = JSON.stringify(error);
                } catch (ignore) { }
                var normalized = error instanceof Error ? error : new Error(message || "The INSPEC request failed.");
                normalized.serverError = error || null;
                reject(normalized);
            });
            method.apply(window.PageMethods || window, args);
        });
    };
    function toastHost() {
        var host = document.getElementById("inspecToastHost");
        if (!host) { host = document.createElement("div"); host.id = "inspecToastHost"; host.className = "toast-container position-fixed top-0 end-0 p-3"; host.style.zIndex = "20000"; document.body.appendChild(host); }
        return host;
    }
    window.showToast = function (message, type) {
        var host = toastHost(), el = document.createElement("div"), kind = String(type || "info").toLowerCase();
        var color = kind === "success" ? "text-bg-success" : (kind === "warning" ? "text-bg-warning" : ((kind === "danger" || kind === "error") ? "text-bg-danger" : "text-bg-secondary"));
        el.className = "toast align-items-center " + color + " border-0"; el.setAttribute("role", "status");
        el.innerHTML = '<div class="d-flex"><div class="toast-body"></div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>';
        el.querySelector(".toast-body").textContent = message == null ? "" : String(message); host.appendChild(el);
        if (window.bootstrap && bootstrap.Toast) { var t = new bootstrap.Toast(el, { delay: 3500 }); el.addEventListener("hidden.bs.toast", function () { el.remove(); }); t.show(); }
        else { window.alert(message == null ? "" : String(message)); el.remove(); }
    };
    function modal(title, bodyHtml, buttons) {
        var el = document.createElement("div"); el.className = "modal fade"; el.tabIndex = -1;
        el.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header py-2"><h5 class="modal-title fs-6"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"></div><div class="modal-footer py-2"></div></div></div>';
        el.querySelector(".modal-title").textContent = title || ""; el.querySelector(".modal-body").innerHTML = bodyHtml || "";
        buttons.forEach(function (b) { var x = document.createElement("button"); x.type = "button"; x.className = b.cls; x.textContent = b.text; x.dataset.result = b.result; el.querySelector(".modal-footer").appendChild(x); });
        document.body.appendChild(el); return el;
    }
    window.showConfirmation = function (options) {
        options = options || {};
        if (!window.bootstrap || !bootstrap.Modal) return Promise.resolve(window.confirm(options.message || "Are you sure?"));
        return new Promise(function (resolve) {
            var el = modal(options.title || "Confirm", "<div></div>", [
                { text: options.cancelText || options.noText || "Cancel", result: "no", cls: "btn btn-outline-secondary btn-sm" },
                { text: options.yesText || "Yes", result: "yes", cls: "btn btn-primary btn-sm" }
            ]);
            el.querySelector(".modal-body div").textContent = options.message || "";
            var instance = new bootstrap.Modal(el, { backdrop: "static" }), done = false;
            function finish(value) { if (done) return; done = true; resolve(value); instance.hide(); }
            el.querySelectorAll("[data-result]").forEach(function (b) { b.addEventListener("click", function () { finish(b.dataset.result === "yes"); }); });
            el.addEventListener("hidden.bs.modal", function () { if (!done) resolve(false); el.remove(); }, { once: true });
            instance.show();
        });
    };
    window.showInformation = function (options) {
        options = options || {};
        if (!window.bootstrap || !bootstrap.Modal) { window.alert((options.html || "").replace(/<[^>]*>/g, " ")); return; }
        var el = modal(options.title || "Information", options.html || "", [{ text: "Close", result: "close", cls: "btn btn-primary btn-sm" }]);
        var instance = new bootstrap.Modal(el); el.querySelector("[data-result]").addEventListener("click", function () { instance.hide(); });
        el.addEventListener("hidden.bs.modal", function () { el.remove(); }, { once: true }); instance.show();
    };
})(window, document);
