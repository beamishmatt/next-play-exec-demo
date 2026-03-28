import { toast as sonnerToast } from "sonner@2.0.3";
import { CheckCircle, XCircle, AlertTriangle, Info, MessageSquare, X } from "lucide-react";
import React from "react";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

interface ToastOptions {
  variant?: ToastVariant;
  duration?: number;
  dismissible?: boolean;
}

interface ToastWithVariant {
  (message: string, options?: ToastOptions): string | number;
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => string | number;
  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => string | number;
  warning: (message: string, options?: Omit<ToastOptions, 'variant'>) => string | number;
  info: (message: string, options?: Omit<ToastOptions, 'variant'>) => string | number;
}

const getToastIcon = (variant: ToastVariant = "default") => {
  switch (variant) {
    case "success":
      return React.createElement(CheckCircle, { size: 16 });
    case "error":
      return React.createElement(XCircle, { size: 16 });
    case "warning":
      return React.createElement(AlertTriangle, { size: 16 });
    case "info":
      return React.createElement(Info, { size: 16 });
    case "default":
    default:
      return React.createElement(MessageSquare, { size: 16 });
  }
};

const getInlineCloseButton = (variant: ToastVariant = "default", toastId: string | number) => {
  const iconColor = variant === "default" ? 'var(--popover-foreground)' : 
                   variant === "success" ? 'var(--success-foreground)' :
                   variant === "error" ? 'var(--destructive-foreground)' :
                   variant === "warning" ? 'var(--warning-foreground)' :
                   'var(--accent-foreground)';

  return React.createElement(
    'button',
    {
      onClick: (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        // Use sonner's dismiss function with the toast ID
        sonnerToast.dismiss(toastId);
      },
      style: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: iconColor,
        opacity: 0.7,
        transition: 'opacity 0.2s ease',
        marginLeft: '8px',
      },
      onMouseEnter: (e: any) => {
        e.target.style.opacity = '1';
        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      },
      onMouseLeave: (e: any) => {
        e.target.style.opacity = '0.7';
        e.target.style.backgroundColor = 'transparent';
      },
    },
    React.createElement(X, { size: 14 })
  );
};

const getToastStyles = (variant: ToastVariant = "default") => {
  const baseStyles = {
    fontSize: 'var(--text-caption)',
    borderRadius: 'var(--radius-card)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    minWidth: '300px',
    maxWidth: '500px',
  };

  switch (variant) {
    case "success":
      return {
        ...baseStyles,
        backgroundColor: 'var(--success)',
        color: 'var(--success-foreground)',
        borderColor: 'var(--success)',
      };
    case "error":
      return {
        ...baseStyles,
        backgroundColor: 'var(--destructive)',
        color: 'var(--destructive-foreground)',
        borderColor: 'var(--destructive)',
      };
    case "warning":
      return {
        ...baseStyles,
        backgroundColor: 'var(--warning)',
        color: 'var(--warning-foreground)',
        borderColor: 'var(--warning)',
      };
    case "info":
      return {
        ...baseStyles,
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
        borderColor: 'var(--accent)',
      };
    case "default":
    default:
      return {
        ...baseStyles,
        backgroundColor: 'var(--popover)',
        color: 'var(--popover-foreground)',
        borderColor: 'var(--border)',
      };
  }
};

const createToast = (message: string, options: ToastOptions = {}) => {
  const { variant = "default", duration = 4000, dismissible = true, ...otherOptions } = options;
  const styles = getToastStyles(variant);
  const icon = getToastIcon(variant);
  
  // Create the toast first to get the ID, then create content with the ID
  const toastId = sonnerToast("", {
    duration,
    dismissible,
    style: styles,
    ...otherOptions,
  });

  // Now create the content with access to the toast ID
  const closeButton = dismissible ? getInlineCloseButton(variant, toastId) : null;
  
  const toastContent = React.createElement(
    'div',
    { 
      style: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        width: '100%',
      } 
    },
    icon,
    React.createElement('span', { 
      style: { 
        flex: 1,
        wordBreak: 'break-word'
      } 
    }, message),
    closeButton
  );

  // Update the toast with the actual content
  sonnerToast(toastContent, {
    id: toastId,
    duration,
    dismissible,
    style: styles,
    ...otherOptions,
  });

  return toastId;
};

export const toast: ToastWithVariant = Object.assign(createToast, {
  success: (message: string, options: Omit<ToastOptions, 'variant'> = {}) => 
    createToast(message, { ...options, variant: "success" }),
  
  error: (message: string, options: Omit<ToastOptions, 'variant'> = {}) => 
    createToast(message, { ...options, variant: "error" }),
  
  warning: (message: string, options: Omit<ToastOptions, 'variant'> = {}) => 
    createToast(message, { ...options, variant: "warning" }),
  
  info: (message: string, options: Omit<ToastOptions, 'variant'> = {}) => 
    createToast(message, { ...options, variant: "info" }),
});