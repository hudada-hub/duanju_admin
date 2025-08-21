import Swal from 'sweetalert2';

// 通知类型
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 通知配置接口
interface NotificationOptions {
    duration?: number;
    position?: 'top' | 'top-start' | 'top-end' | 'center' | 'center-start' | 'center-end' | 'bottom' | 'bottom-start' | 'bottom-end';
}

// 默认配置
const defaultOptions: NotificationOptions = {
    duration: 3000,
    position: 'top-end'
};

// 通知工具类
export class Notification {
    // 成功通知
    static success(message: string, options?: NotificationOptions) {
        Swal.fire({
            icon: 'success',
            title: message,
            timer: options?.duration || defaultOptions.duration,
            position: options?.position || defaultOptions.position,
            showConfirmButton: false,
            toast: true
        });
    }

    // 错误通知
    static error(message: string, options?: NotificationOptions) {
        Swal.fire({
            icon: 'error',
            title: message,
            timer: options?.duration || defaultOptions.duration,
            position: options?.position || defaultOptions.position,
            showConfirmButton: false,
            toast: true
        });
    }

    // 警告通知
    static warning(message: string, options?: NotificationOptions) {
        Swal.fire({
            icon: 'warning',
            title: message,
            timer: options?.duration || defaultOptions.duration,
            position: options?.position || defaultOptions.position,
            showConfirmButton: false,
            toast: true
        });
    }

    // 信息通知
    static info(message: string, options?: NotificationOptions) {
        Swal.fire({
            icon: 'info',
            title: message,
            timer: options?.duration || defaultOptions.duration,
            position: options?.position || defaultOptions.position,
            showConfirmButton: false,
            toast: true
        });
    }

    // 加载中通知
    static loading(message: string, options?: NotificationOptions) {
        return Swal.fire({
            title: message,
            timer: options?.duration || defaultOptions.duration,
            position: options?.position || defaultOptions.position,
            showConfirmButton: false,
            toast: true,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    // 自定义通知
    static custom(message: string, type: NotificationType = 'info', options?: NotificationOptions) {
        switch (type) {
            case 'success':
                this.success(message, options);
                break;
            case 'error':
                this.error(message, options);
                break;
            case 'warning':
                this.warning(message, options);
                break;
            default:
                this.info(message, options);
        }
    }

    // 处理响应消息
    static handleResponse(response: { code: number; message: string; }) {
        if (response.code === 0) {
            this.success(response.message);
        } else {
            this.error(response.message);
        }
    }
} 