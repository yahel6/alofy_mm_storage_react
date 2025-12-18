import React, { createContext, useContext, useState, type ReactNode } from 'react';

type SelectionSessions = Record<string, Set<string>>;

interface SelectionContextType {
    sessions: SelectionSessions;
    activeScopes: Set<string>;
    toggleSelectionMode: (scopeId: string) => void;
    toggleItemSelection: (scopeId: string, itemId: string) => void;
    isSelectionModeActive: (scopeId: string) => boolean;
    getSelectedItems: (scopeId: string) => Set<string>;
    clearSelection: (scopeId: string) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [sessions, setSessions] = useState<SelectionSessions>({});
    const [activeScopes, setActiveScopes] = useState<Set<string>>(new Set());

    const toggleSelectionMode = (scopeId: string) => {
        setActiveScopes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(scopeId)) {
                newSet.delete(scopeId);
            } else {
                newSet.add(scopeId);
            }
            return newSet;
        });

        // When turning OFF selection mode, we typically want to clear selection.
        // But the user said "remains until cancel is clicked", which implies persistence.
        // If we want it to behave like Validation Mode, we should probably keep selections 
        // as long as the mode is active, and clear when explicitly cancelled.
        if (activeScopes.has(scopeId)) {
            // Turning OFF
            setSessions(prev => {
                const newState = { ...prev };
                delete newState[scopeId];
                return newState;
            });
        } else {
            // Turning ON
            if (!sessions[scopeId]) {
                setSessions(prev => ({ ...prev, [scopeId]: new Set() }));
            }
        }
    };

    const toggleItemSelection = (scopeId: string, itemId: string) => {
        setSessions(prev => {
            const currentSet = prev[scopeId] || new Set();
            const newSet = new Set(currentSet);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return { ...prev, [scopeId]: newSet };
        });
    };

    const isSelectionModeActive = (scopeId: string) => activeScopes.has(scopeId);

    const getSelectedItems = (scopeId: string) => {
        return sessions[scopeId] || new Set();
    };

    const clearSelection = (scopeId: string) => {
        setSessions(prev => {
            const newState = { ...prev };
            delete newState[scopeId];
            return newState;
        });
    };

    return (
        <SelectionContext.Provider value={{
            sessions,
            activeScopes,
            toggleSelectionMode,
            toggleItemSelection,
            isSelectionModeActive,
            getSelectedItems,
            clearSelection
        }}>
            {children}
        </SelectionContext.Provider>
    );
};

export const useSelection = () => {
    const context = useContext(SelectionContext);
    if (context === undefined) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
};
