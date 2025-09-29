# Development Plan

This document outlines the plan to implement the requested features, enhancements, and bug fixes for the application.

## 🗺️ Map & User Interface (UI)

| Task ID | Description | Complexity | Dependencies | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UI-1** | **Display Place Names:** Add labels for locations directly onto the map interface. | Medium | - | To Do |
| **UI-2** | **Full-Screen Mode:** Implement a button or option to view the map in full-screen mode. | Small | - | To Do |
| **UI-3** | **Geolocation on Start:** Upon the user's first visit, prompt for location access. If granted, automatically center the map on the user's current location. | Medium | - | To Do |
| **UI-4** | **Satellite View:** Add a satellite imagery layer to the map as an alternative to the default view. | Medium | - | To Do |
| **UI-5** | **Image Contrast Adjustment:** For the satellite view, provide a tool or slider to adjust the contrast. | Large | UI-4 | To Do |
| **UI-6** | **Heatmap Cropping:** Modify the heatmap display so that it is strictly cropped to the user's defined Area of Interest (AOI). | Large | - | To Do |
| **UI-7** | **Fix UI Overlap:** Resolve the bug where data fields overlap and obscure the map view when a user is adding a new parcel. | Medium | - | To Do |

## 🌱 Farm & Parcel Data Management

| Task ID | Description | Complexity | Dependencies | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DM-1** | **Add New Parcel Fields:** Add `Variety`, `Planting Date`, `Planting Type` to the new parcel form. | Medium | - | To Do |
| **DM-2** | **Automatic Density Calculation:** `Planting Density` should be calculated automatically based on the selected `Planting Type`. | Medium | DM-1 | To Do |
| **DM-3** | **Hierarchical Variety Selection:** Implement a two-level selection system for `Variety` (Family and Variety). | Large | DM-1 | To Do |
| **DM-4** | **FERTIMAP Database Integration:** Investigate and implement an integration with the "FERTIMAP" database to automatically fetch and populate soil data. | X-Large | - | To Do |

## ⚙️ System & Bug Fixes

| Task ID | Description | Complexity | Dependencies | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-1** | **Product Creation Error:** Fix the error that occurs when a user tries to add a new product to the system. | Medium | - | To Do |
| **SYS-1** | **Enable Purchase Functionality:** The "purchase" feature is currently disabled. It needs to be investigated and re-activated. | Large | - | To Do |
| **SYS-2** | **Improve "Structures" Logic:** Ensure every "structure" is linked to a farm and visible at the organization level if applicable. | Large | - | To Do |

## 📊 Development Roadmap

| Task ID | Description | Complexity | Dependencies | Status |
| :--- | :--- | :--- | :--- | :--- |
| **ROAD-1** | **Initial Data Entry for Reports:** Allow for complete input of all farm data before generating initial farm reports. | Large | - | To Do |
| **ROAD-2** | **AI Integration:** Proceed with the development and integration of AI-driven features once foundational data entry and reporting are solid. | X-Large | ROAD-1 | To Do |

## 👥 User Roles

Based on the application's features and business logic, the following user roles are recommended:

| Role | Description | Key Permissions |
| :--- | :--- | :--- |
| **System Admin** | Manages the entire platform and all organizations. This role is for top-level administrators. | - Create, edit, and delete organizations.<br>- Manage system-wide settings.<br>- Access and manage all user accounts.<br>- View platform-wide analytics. |
| **Organization Admin** | Manages a specific organization, including its farms, users, and billing. | - Manage farms within the organization.<br>- Add, edit, and remove users from the organization.<br>- Manage organization-level settings and billing.<br>- View reports for all farms in the organization. |
| **Farm Manager** | Manages the day-to-day operations of a single farm. | - Manage parcels, including creating and updating them.<br>- Manage farm employees and day laborers.<br>- Manage infrastructure, stock, and utilities.<br>- Input data for and generate farm-specific reports.<br>- Manage product applications. |
| **Farm Worker** | A regular employee of a farm with access to specific features relevant to their work. | - View assigned tasks and schedules.<br>- Record activities (e.g., planting, harvesting).<br>- View information for parcels they are assigned to.<br>- Limited access to reports. |
| **Day Laborer** | A temporary worker with very limited access, likely for specific, short-term tasks. | - View daily tasks.<br>- Clock in and out for time tracking.<br>- Minimal data viewing permissions. |
| **Viewer** | A read-only role for stakeholders, consultants, or other observers. | - View farm data, dashboards, and reports.<br>- Cannot create, edit, or delete any data. |
