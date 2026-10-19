<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="toast.ascx.cs" Inherits="UTL1.toast" %>


<style>
    /* Toast Notification */
    .toast-container {
        position: fixed;
        /*top: 20px;*/
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1100;
    }

    .custom-toast {
        background: white;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        border-left: 5px solid #0a8a8a;
        overflow: hidden;

        opacity: 0;
        transform: translateY(-15px);
        transition: all 0.35s ease;
    }

    .custom-toast.show {
        opacity: 1;
        transform: translateY(0);
    }

    .custom-toast.hide {
        opacity: 0;
        transform: translateY(-15px);
    }

    .toast-body {
        padding: 1rem 1.25rem;
        font-weight: 500;
        color: #333;
    }
</style>

<!-- Toast Container -->
<div class="toast-container"></div>

<script>
    // Show toast notification
    let toastTimeout = null;
    function showToast(arg1, arg2, arg3) {
        let message, type, duration;

        // =========================
        // MODE 1: Object parameter
        // =========================
        if (typeof arg1 === 'object' && arg1 !== null) {
            ({
                message,
                type = 'success',
                duration = 3000
            } = arg1);
        }
            // =========================
            // MODE 2: Cara lama
            // =========================
        else {
            message = arg1;
            type = arg2 || 'success';
            duration = arg3 || 3000;
        }

        if (!message) return;

        // Hentikan timeout sebelumnya
        if (toastTimeout) {
            clearTimeout(toastTimeout);
            toastTimeout = null;
        }

        // Hapus toast lama
        document.querySelectorAll('.custom-toast').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = 'custom-toast';

        // Default (success)
        let icon = 'bi-check-circle-fill';
        let color = '#0a8a8a';

        switch (type) {
            //case 'success':
            //    icon = 'bi-check-circle-fill';
            //    color = '#0a8a8a';
            //    break;
            case 'error':
                icon = 'bi-exclamation-triangle-fill';
                color = '#dc3545';
                break;
            case 'warning':
                icon = 'bi-x-circle-fill';
                color = '#ffc107';
                break;
            case 'info':
                icon = 'bi-info-circle-fill';
                //color = '#0d6efd';
                color = '#0a6b6b';
                break;
        }

        toast.innerHTML = `
        <div class="toast-body">
            <i class="bi ${icon} me-2" style="color:${color}"></i>
            ${message}
        </div>
        `;
        toast.style.borderLeftColor = color;


        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;

        toastContainer.appendChild(toast);

        // Animasi masuk
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto close
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');

            setTimeout(() => toast.remove(), 350);
        }, duration);
    }
</script>