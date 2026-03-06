import React, { createContext, useContext, useState } from 'react';

interface UIContextType {
    shouldHighlightProfile: boolean;
    setShouldHighlightProfile: (val: boolean) => void;
    hasCompletedOnboarding: boolean;
    setHasCompletedOnboarding: (val: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [shouldHighlightProfile, setShouldHighlightProfile] = useState(false);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

    return (
        <UIContext.Provider value={{
            shouldHighlightProfile,
            setShouldHighlightProfile,
            hasCompletedOnboarding,
            setHasCompletedOnboarding
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
