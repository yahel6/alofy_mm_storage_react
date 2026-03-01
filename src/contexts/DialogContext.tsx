import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import './DialogContext.css';

interface DialogOptions {
    title?: string;
    message: string;
    type: 'alert' | 'confirm';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

interface DialogContextType {
    showAlert: (message: string, title?: string) => Promise<void>;
    showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dialogs, setDialogs] = useState<DialogOptions[]>([]);

    const showAlert = useCallback((message: string, title?: string): Promise<void> => {
        return new Promise((resolve) => {
            setDialogs((prev) => [
                ...prev,
                {
                    message,
                    title,
                    type: 'alert',
                    onConfirm: () => {
                        setDialogs((d) => d.slice(1));
                        resolve();
                    },
                    onCancel: () => {
                        setDialogs((d) => d.slice(1));
                        resolve();
                    },
                },
            ]);
        });
    }, []);

    const showConfirm = useCallback((message: string, title?: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogs((prev) => [
                ...prev,
                {
                    message,
                    title,
                    type: 'confirm',
                    onConfirm: () => {
                        setDialogs((d) => d.slice(1));
                        resolve(true);
                    },
                    onCancel: () => {
                        setDialogs((d) => d.slice(1));
                        resolve(false);
                    },
                },
            ]);
        });
    }, []);

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {dialogs.length > 0 && (
                <div className="dialog-overlay active">
                    <div className="dialog-modal">
                        {dialogs[0].title && <h3 className="dialog-title">{dialogs[0].title}</h3>}
                        <p className="dialog-message">{dialogs[0].message}</p>
                        <div className="dialog-actions">
                            {dialogs[0].type === 'confirm' && (
                                <button
                                    className="dialog-btn dialog-btn-cancel"
                                    onClick={dialogs[0].onCancel}
                                >
                                    {dialogs[0].cancelText || 'ביטול'}
                                </button>
                            )}
                            <button
                                className="dialog-btn dialog-btn-confirm"
                                onClick={dialogs[0].onConfirm}
                            >
                                {dialogs[0].confirmText || 'אישור'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
