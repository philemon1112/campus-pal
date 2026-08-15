# Software Requirements Specification (SRS)

## CampusPal — A Campus Navigation, Food Discovery, and AI Assistant Web Application

**Prepared for:** University of Ghana, Legon Campus
**Document Version:** 1.0
**Date:** August 14, 2026

---

## Table of Contents

1. Introduction
2. Overall Description
3. System Features (Functional Requirements)
4. External Interface Requirements
5. Non-Functional Requirements
6. Data Requirements
7. Other Requirements
8. Appendix

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for **CampusPal**, a web application designed to help students, staff, and visitors of the University of Ghana, Legon Campus navigate the campus, discover food joints, and interact with an AI assistant capable of performing tasks within the application. This document is intended for the development team, project stakeholders, and quality assurance personnel, and will serve as the foundation for design, implementation, and testing.

### 1.2 Intended Audience and Reading Suggestions

- **Developers** — for understanding functional scope, data models, and interface requirements.
- **Project Supervisors/Stakeholders** — for reviewing scope and confirming alignment with project goals.
- **Testers/QA** — for deriving test cases from stated requirements.
- **Future Maintainers** — for understanding system behavior and design rationale.

### 1.3 Product Scope

CampusPal is a web-based platform (accessible via desktop and mobile browsers) that centralizes three core services for the University of Ghana, Legon community:

1. **Campus Explorer & Navigation** — locating and getting directions to campus locations (lecture halls, departments, parks/fields, hostels and halls, administration buildings, and other important landmarks).
2. **Food Joint Directory** — discovering and contacting food vendors/joints operating on campus.
3. **AI Assistant** — a conversational assistant, accessible via a persistent icon, that can perform in-app tasks (e.g., searching locations, finding food joints, giving directions) on behalf of the user through natural language chat.

The goal is to reduce the difficulty new students, freshers, and visitors face in orienting themselves on campus and finding food options, while providing a modern conversational interface that ties these features together.

### 1.4 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| SRS | Software Requirements Specification |
| UG | University of Ghana |
| POI | Point of Interest (a location such as a hall, department, or landmark) |
| AI | Artificial Intelligence |
| UI | User Interface |
| UX | User Experience |
| API | Application Programming Interface |
| Admin | Administrator (manages content on the platform) |
| Vendor | A food joint owner/operator listed on the platform |

### 1.5 References

- IEEE Std 830-1998, IEEE Recommended Practice for Software Requirements Specifications.
- University of Ghana, Legon Campus Map (official campus resource).

### 1.6 Document Conventions

Requirements are labeled using the format **FR-X.Y** (Functional Requirement) or **NFR-X** (Non-Functional Requirement) for traceability. Priority is indicated as **[High]**, **[Medium]**, or **[Low]**.

---

## 2. Overall Description

### 2.1 Product Perspective

CampusPal is a new, standalone web application. It is not a replacement for any existing university system but may optionally integrate with or reference publicly available campus data (e.g., building lists, department names). It will consist of:

- A **front-end web client** (responsive, mobile-first design).
- A **back-end server** exposing APIs for locations, food joints, users, and AI chat.
- A **database** storing locations, food joints, users, and chat logs.
- An **AI/NLP integration layer** (e.g., via a large language model API) enabling the conversational assistant to interpret user requests and trigger in-app actions.

### 2.2 Product Functions (Summary)

- Browse, search, and filter campus locations by category.
- View directions/maps to a selected location.
- Browse, search, and filter food joints; view contact details and possibly menus.
- Contact a food joint (via phone link, WhatsApp, or in-app message).
- Chat with an AI assistant that can execute supported in-app actions (e.g., "Find the nearest food joint that sells jollof," "Direct me to the Registry," "Show me all lecture halls near Legon Hall").
- User account management (optional sign-up/login) for personalization (e.g., saved/favorite locations).
- Admin capability to add/edit/remove locations and food joint listings.

### 2.3 User Classes and Characteristics

| User Class | Description | Technical Proficiency |
|---|---|---|
| Student (Guest/Registered) | Primary user; explores campus and food options | Basic to intermediate |
| Staff/Faculty | Uses app to locate departments/offices | Basic to intermediate |
| Visitor | Occasional user, likely first-time | Basic |
| Food Vendor | Manages their own food joint listing | Basic |
| Administrator | Manages overall platform content and users | Intermediate to advanced |

### 2.4 Operating Environment

- **Client side:** Modern web browsers (Chrome, Firefox, Safari, Edge) on desktop, tablet, and mobile devices.
- **Server side:** Cloud-hosted or on-premise server environment supporting the chosen web stack (e.g., Node.js/Express, or similar), with a relational or NoSQL database.
- **Network:** Requires internet connectivity; should be optimized for varying network speeds common on campus.

### 2.5 Design and Implementation Constraints

- Must be a **responsive web application** (no native mobile app required initially).
- Location data must be reasonably accurate for the University of Ghana, Legon campus (verified against official campus maps).
- The AI feature depends on a third-party AI/NLP service or model; requests are subject to that provider's rate limits and terms.
- The system should function on low-to-moderate bandwidth connections typical of a campus environment.

### 2.6 User Documentation

An in-app help/FAQ section and onboarding tutorial (tooltip walkthrough) will be provided to guide first-time users through the two main tabs and the AI icon.

### 2.7 Assumptions and Dependencies

- It is assumed that a reasonably accurate digital map or coordinate dataset of UG Legon Campus locations can be sourced or manually compiled.
- It is assumed food joint vendors are willing to provide accurate contact information and keep it updated.
- The AI feature depends on availability and reliability of an external AI/NLP API.
- Users are assumed to have basic smartphone/browser literacy.

---

## 3. System Features (Functional Requirements)

### 3.1 Feature 1 — Campus Explorer & Directions

**Description:** Allows users to browse, search, and view directions to campus locations grouped into categories (Lecture Halls, Departments, Parks/Fields, Hostels and Halls, Administration, Other Buildings).

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | The system shall display campus locations grouped by category (Lecture Halls, Departments, Parks/Fields, Hostels and Halls, Administration, Other). | High |
| FR-1.2 | The system shall allow users to search for a location by name or keyword. | High |
| FR-1.3 | The system shall display a location's details, including name, category, description, and photo (if available). | Medium |
| FR-1.4 | The system shall show the selected location on an interactive campus map. | High |
| FR-1.5 | The system shall provide walking directions (or an embedded map route, e.g., via Google Maps) from the user's current location (or a chosen starting point) to the selected destination. | High |
| FR-1.6 | The system shall allow users to filter locations by category. | Medium |
| FR-1.7 | The system shall allow registered users to save/bookmark favorite locations. | Low |
| FR-1.8 | The system shall allow an Administrator to add, edit, or remove location listings. | High |

### 3.2 Feature 2 — Food Joint Directory

**Description:** Allows users to browse, search, and contact food joints operating on campus.

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | The system shall display a list of food joints available on campus. | High |
| FR-2.2 | The system shall allow users to search for a food joint by name, food type, or location. | High |
| FR-2.3 | The system shall display each food joint's details: name, location on campus, operating hours, contact number, and (optionally) menu items/prices. | High |
| FR-2.4 | The system shall provide a "Contact" action allowing users to call, WhatsApp, or message the food joint directly from the listing. | High |
| FR-2.5 | The system shall show the food joint's location on the campus map, with directions available. | Medium |
| FR-2.6 | The system shall allow filtering of food joints by category (e.g., local dishes, fast food, drinks/snacks) and by proximity. | Medium |
| FR-2.7 | The system shall allow registered vendors (or Admins on their behalf) to create and update their food joint listing. | Medium |
| FR-2.8 | The system shall allow users to rate or leave feedback on a food joint. | Low |

### 3.3 Feature 3 — AI Assistant

**Description:** A conversational AI assistant, accessible via a persistent icon from anywhere in the app, capable of understanding natural language requests and performing supported in-app tasks on the user's behalf.

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | The system shall provide a persistent AI chat icon accessible from all pages/tabs. | High |
| FR-3.2 | The system shall allow users to type natural-language requests to the AI assistant (e.g., "Where is the School of Engineering?", "Show me food joints near Commonwealth Hall"). | High |
| FR-3.3 | The AI assistant shall be able to search and return campus location results within the chat and offer to navigate the user to that location's detail/map view. | High |
| FR-3.4 | The AI assistant shall be able to search and return food joint results within the chat, including contact options. | High |
| FR-3.5 | The AI assistant shall be able to trigger supported in-app actions on the user's behalf (e.g., open a location's map view, initiate a directions request, open a food joint's contact page) rather than only returning text. | High |
| FR-3.6 | The AI assistant shall gracefully handle requests it cannot fulfill (i.e., tasks outside the app's supported feature set) by informing the user of its limitations. | High |
| FR-3.7 | The system shall maintain conversation context within a session so follow-up questions are understood. | Medium |
| FR-3.8 | The system shall allow users to view a history of their recent AI chat sessions (if logged in). | Low |

### 3.4 Cross-Cutting Feature — User Accounts (Supporting Feature)

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | The system shall allow users to browse core features (Explore, Food Joints) without requiring an account. | Medium |
| FR-4.2 | The system shall allow users to register and log in to access personalized features (favorites, chat history). | Medium |
| FR-4.3 | The system shall allow Administrators to log in to a management dashboard. | High |

---

## 4. External Interface Requirements

### 4.1 User Interfaces

- **Two main tabs:** "Explore" (campus locations) and "Food Joints," accessible via a bottom or top navigation bar.
- **Persistent AI icon:** A floating action button or icon visible on all screens, opening a chat interface (as an overlay/modal or dedicated panel).
- Clean, minimal, mobile-first UI consistent with modern web app design conventions, using UG's brand colors where appropriate.
- Search bars at the top of both the Explore and Food Joints tabs.
- Map view component embedded within location and food-joint detail pages.

### 4.2 Hardware Interfaces

- None beyond standard client device hardware (screen, internet connectivity, optional GPS for location-based features).

### 4.3 Software Interfaces

- **Mapping/Directions API** (e.g., Google Maps API or OpenStreetMap) for map rendering and directions.
- **AI/NLP API** (e.g., a large language model provider) for the AI assistant's natural language understanding and response generation.
- **Messaging interfaces** (e.g., `tel:` links, WhatsApp deep links) for the "Contact" feature on food joints.
- **Database system** for persistent storage of locations, food joints, users, and chat data.

### 4.4 Communication Interfaces

- HTTPS for all client-server communication.
- RESTful (or GraphQL) API between front-end and back-end.

---

## 5. Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-1 | **Usability:** The interface shall be intuitive enough for a first-time user (e.g., a fresher) to find a location or food joint within 3 taps/clicks. | High |
| NFR-2 | **Performance:** Search results (locations or food joints) shall load within 2 seconds under normal network conditions. | High |
| NFR-3 | **AI Response Time:** The AI assistant shall return an initial response within 3–5 seconds of a user query. | Medium |
| NFR-4 | **Availability:** The system shall aim for at least 99% uptime during active academic periods. | Medium |
| NFR-5 | **Scalability:** The system shall support concurrent use by at least 1,000 simultaneous users without significant performance degradation. | Medium |
| NFR-6 | **Responsiveness:** The UI shall render correctly on screen sizes from 320px (mobile) to 1920px (desktop) wide. | High |
| NFR-7 | **Security:** User data (accounts, chat history) shall be stored securely, with passwords hashed and sensitive data transmitted over HTTPS. | High |
| NFR-8 | **Data Accuracy:** Location and food joint data shall be reviewed/verified by an Administrator before publishing. | Medium |
| NFR-9 | **Maintainability:** The codebase shall follow a modular architecture to allow independent updates to the Explore, Food Joints, and AI features. | Medium |
| NFR-10 | **Accessibility:** The UI shall follow basic accessibility guidelines (sufficient color contrast, readable font sizes, alt text for images). | Medium |
| NFR-11 | **Portability:** The web application shall function correctly across major modern browsers without requiring browser-specific code. | Medium |

---

## 6. Data Requirements

### 6.1 Key Data Entities

**Location**
- Location ID, Name, Category (Lecture Hall / Department / Park-Field / Hostel-Hall / Administration / Other), Description, Coordinates (latitude/longitude), Photo(s), Associated Building/Landmark notes.

**Food Joint**
- Food Joint ID, Name, Category (e.g., local dishes, fast food, beverages), Location/Coordinates, Operating Hours, Contact Number(s), WhatsApp link, Menu items (optional), Average Rating (optional).

**User**
- User ID, Name, Email/Phone, Password (hashed), Role (Student/Staff/Vendor/Admin), Saved Favorites, Chat History (optional).

**Chat Session**
- Session ID, User ID (nullable for guests), Messages (timestamped), Actions Triggered.

### 6.2 Data Retention

- Chat history retained only for logged-in users who opt in, with an option to clear history.
- Location and food joint data retained indefinitely unless removed by an Administrator.

---

## 7. Other Requirements

- **Legal/Compliance:** Food joint vendor information (contact numbers) shall only be published with vendor consent.
- **Localization:** Initial release shall support English; future versions may consider local language support.
- **Content Moderation:** Admin shall have the ability to remove inappropriate ratings/feedback on food joints.

---

## 8. Appendix

### 8.1 Sample AI Assistant Use Cases

| User Input | Expected AI Action |
|---|---|
| "Where is the Balme Library?" | Search Locations → return match → offer directions/map view |
| "Show me food joints near Legon Hall" | Search Food Joints → filter by proximity → return list with contact options |
| "Direct me to the School of Engineering Sciences" | Search Locations → trigger map/directions view |
| "What food joints sell waakye?" | Search Food Joints → filter by menu/category → return list |
| "Save the Registry as a favorite" | Trigger save/favorite action (requires login) |

### 8.2 Future Enhancements (Out of Scope for v1.0)

- Native mobile applications (iOS/Android).
- Real-time shuttle/bus tracking integration.
- Push notifications for food joint promotions.
- Multi-language support.
- Indoor navigation within large buildings.

---

*End of Document*
