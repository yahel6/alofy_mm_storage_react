// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from './App.tsx'
import LoginPage from './pages/LoginPage.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx';
import { DatabaseProvider } from './contexts/DatabaseContext.tsx';
import { ValidationProvider } from './contexts/ValidationContext.tsx';
import { SelectionProvider } from './contexts/SelectionContext.tsx';

// ... (rest of imports)

// ייבוא כל העמודים שהאפליקציה צריכה
import HomePage from './pages/HomePage.tsx';
import WarehousesPage from './pages/WarehousesPage.tsx';
import WarehouseDetailsPage from './pages/WarehouseDetailsPage.tsx';
import ActivitiesPage from './pages/ActivitiesPage.tsx';
import ActivityDetailsPage from './pages/ActivityDetailsPage.tsx';
import EditActivityEquipmentPage from './pages/EditActivityEquipmentPage.tsx';
import EquipmentFormPage from './pages/EquipmentFormPage.tsx';
import ActivityFormPage from './pages/ActivityFormPage.tsx';
import FilteredEquipmentPage from './pages/FilteredEquipmentPage.tsx';
import WarehouseFormPage from './pages/WarehouseFormPage';
import AdminUsersPage from './pages/AdminUsersPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import AdminOnly from './components/AdminOnlyRoute.tsx';


import './index.css'

// הגדרת הראוטר עם כל הנתיבים
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DatabaseProvider>
          <ValidationProvider>
            <SelectionProvider>
              <App />
            </SelectionProvider>
          </ValidationProvider>
        </DatabaseProvider>
      </ProtectedRoute>
    ),
    // כל הנתיבים כאן יוצגו בתוך ה-<Outlet /> של App.tsx
    children: [
      {
        path: "/", // עמוד הבית
        element: <HomePage />,
      },
      {
        path: "warehouses", // רשימת מחסנים
        element: <WarehousesPage />,
      },
      {
        path: "warehouses/:warehouseId", // פרטי מחסן ספציפי
        element: <WarehouseDetailsPage />,
      },
      {
        path: "warehouses/new", // טופס הוספת מחסן
        element: <WarehouseFormPage />,
      },
      {
        path: "warehouses/:warehouseId/edit", // עריכת מחסן
        element: <WarehouseFormPage />,
      },
      {
        path: "warehouses/edit/:warehouseId", // עריכת מחסן
        element: <WarehouseFormPage />,
      },
      {
        path: "activities", // רשימת פעילויות
        element: <ActivitiesPage />,
      },
      {
        path: "activities/:activityId", // פרטי פעילות
        element: <ActivityDetailsPage />,
      },
      {
        path: "activities/:activityId/edit", // עריכת *ציוד* לפעילות
        element: <EditActivityEquipmentPage />,
      },
      {
        path: "item/new", // טופס הוספת פריט
        element: <EquipmentFormPage />,
      },
      {
        path: "item/edit/:itemId", // טופס עריכת פריט
        element: <EquipmentFormPage />,
      },
      {
        path: "activity/new", // טופס הוספת פעילות
        element: <ActivityFormPage />,
      },
      {
        path: "activities/edit/:activityId", // טופס עריכת *פרטי* פעילות
        element: <ActivityFormPage />,
      },
      {
        path: "items/filter/:filterType", // נתיב לפריטים מסוננים
        element: <FilteredEquipmentPage />,
      },
      {
        path: "admin/users",
        element: (
          <AdminOnly>
            <AdminUsersPage />
          </AdminOnly>
        )
      },
      {
        path: "profile", // פרופיל משתמש
        element: <ProfilePage />,
      }
    ]
  },
  {
    path: "/login", // עמוד הלוגין (מחוץ לאפליקציה המאובטחת)
    element: <LoginPage />,
  },
]);

// רינדור האפליקציה
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)