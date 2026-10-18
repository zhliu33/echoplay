import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Info, X } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return context;
}

interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [confirmState, setConfirmState] = useState<ConfirmOptions & { 
    isOpen: boolean;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    title: "",
    message: "",
    resolve: null,
    variant: "warning",
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        isOpen: true,
        resolve,
        variant: options.variant || "warning",
      });
    });
  }, []);

  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
      setConfirmState({ ...confirmState, isOpen: false, resolve: null });
    }
  };

  const handleCancel = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
      setConfirmState({ ...confirmState, isOpen: false, resolve: null });
    }
  };

  const variantStyles = {
    danger: {
      iconBox: "bg-red-100 dark:bg-red-900/30",
      icon: "text-red-500",
      Icon: Trash2,
      confirm: "bg-red-500 hover:bg-red-600 text-white shadow-sm",
    },
    warning: {
      iconBox: "bg-amber-100 dark:bg-amber-900/30",
      icon: "text-amber-500",
      Icon: AlertTriangle,
      confirm: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm",
    },
    info: {
      iconBox: "bg-primary/10",
      icon: "text-primary",
      Icon: Info,
      confirm: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm",
    },
  };

  const currentVariant = variantStyles[confirmState.variant || "warning"];

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      <AnimatePresence>
        {confirmState.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-[clamp(20rem,50vw,28rem)] w-full mx-[5%] pad-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-responsive-md">
                <div
                  className={`flex-shrink-0 w-[clamp(2.25rem,3.5vw,2.75rem)] aspect-square rounded-xl ${currentVariant.iconBox} flex items-center justify-center`}
                >
                  <currentVariant.Icon className={`w-[50%] h-[50%] ${currentVariant.icon}`} />
                </div>
                
                <h3 className="flex-1 text-responsive-xl font-semibold leading-tight truncate">
                  {confirmState.title}
                </h3>

                <button
                  onClick={handleCancel}
                  className="flex-shrink-0 pad-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="icon-sm text-gray-400" />
                </button>
              </div>

              <div className="text-responsive-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line mt-responsive-md">
                {confirmState.message}
              </div>

              <div className="flex items-center justify-end gap-responsive-md mt-responsive-lg">
                <button
                  onClick={handleCancel}
                  className="px-responsive-lg pad-y-md rounded-lg text-responsive-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors"
                >
                  {confirmState.cancelText || "取消"}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-responsive-lg pad-y-md rounded-lg text-responsive-sm font-medium transition-colors ${currentVariant.confirm}`}
                >
                  {confirmState.confirmText || "确认"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}