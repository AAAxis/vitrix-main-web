import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts
        .filter((toast) => toast.open !== false)
        .map(function ({ id, title, description, action, onOpenChange, open, ...props }) {
          const handleClose = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dismiss(id);
            if (onOpenChange) {
              onOpenChange(false);
            }
          };

          return (
            <Toast 
              key={id} 
              {...props}
              data-state={open ? "open" : "closed"}
            >
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose onClick={handleClose} />
            </Toast>
          );
        })}
      <ToastViewport />
    </ToastProvider>
  );
} 