---
description: Describe when these instructions should be loaded
# applyTo: 'Describe when these instructions should be loaded' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.
- The project is a Final Year Project (FYP) for a Computer Science degree.
BSSE FINAL PROJECT
<Design and Test Specification>

Forensic Timeline Reconstructor: Evidence Organizer


 



Project Advisor

Mr. Ali Haider



Presented by: 
Group ID: F25SE018

Student Reg#			Student Name

                              L1F22BSSE0202                Ali Raza
                              L1F22BSSE0329                Khawaja Faheem ud Din
                              L1F22BSSE0216                Hassan Hanan Khalid


Faculty of Information Technology & Computer Science

University of Central Punjab
Design and Test Specification 
SDP Phase III

Forensic Timeline Reconstructor: Evidence Organizer 
Advisor: Sir. Ali Haider
Team F25SE018
Member Name	Primary Responsibility
Ali Raza	Backend Development(Node.js API, Database Design)
Faheem ud Din	Metadata Extraction(Python Engine, Documentation)
Hassan Hanan Khalid	Application Development(React Native UI, API Integration ,Error handling)
 
Table of Contents
Table of Contents	i
Revision History	i
Previous Phases Feedback	ii
Abstract	1
1.	Introduction	2
1.1	Product	2
1.2	Background	2
1.3	Objective(s)/Aim(s)/Target(s)	2
1.4	Produce complete technical and user documentation Scope	2
1.5	Business Goals	3
1.6	Document Conventions	3
1.7	Miscellaneous	3
2.	Technical Architecture	4
2.1	Application and Data Architecture	6
2.2	Component Interactions and Collaborations	10
2.3	Design Reuse and Design Patterns	18
2.4	Technology Architecture	20
2.5	Architecture Evaluation	22
3.	Detailed/Component Design	23
3.1	Component-Component Interface	23
3.2	Component-External Entities Interface	28
3.3	Component-Human Interface	29
4.	Screenshots/Prototype	30
4.1	Workflow	30
4.2	Screens	32
4.3	Additional Information	36
5.	Other Design Details	36
6.	Test Case Specification	37
6.1	Test Case Specification	37
6.2	Summary of Test Results	42
7.	Revised Project Plan	43
7.1: Project Completion Status	43
8.	References	44
Appendix A: Glossary	45
Appendix B: IV & V Report	47


Revision History
Name	Date	Reason For Changes	Version
Ali Raza	2026-03-18	Phase III document created	2.1
Hassan Hanan	2026-03-24	Added test plan + detailed component design	2.2




Previous Phases Feedback

Idea Defense Feedback (Screenshot)


















Phase 2 (SDS) Feedback (Screenshot)


 
Abstract
Digital forensic investigation depends a lot on analyzing metadata to understand what happened and when it happened. In many cases, investigators have to manually extract metadata from different types of files such as Word documents, PDF files, images, and system log files. This process is slow, repetitive, and sometimes leads to mistakes, especially when dealing with large number of files. Also, many existing forensic tools are either very expensive or too complex for students and small organizations to use.
The Forensic Timeline Reconstructor: Evidence Organizer is developed to solve this problem by providing an automated and easy-to-use desktop application. The system extracts metadata from common digital evidence files, converts different timestamp formats into a single standard format, and generates a chronological forensic timeline. The generated timeline helps investigators and students to easily analyze events and understand their sequence.
This project uses knowledge from digital forensics, software engineering, database management, and full-stack development. Technologies such as React, Node.js, Python, and MongoDB are used to design and implement the system. The expected result of this project is a reliable and user-friendly tool that reduces the effort and time required for manual timeline creation and improves the accuracy of forensic analysis. The system can be useful for forensic investigators, cybersecurity analysts, and students for learning and practical investigation purposes.






1.	Introduction
1.1	Product
Forensic Timeline Reconstructor is a desktop forensic software application designed to automate metadata extraction and timeline generation from digital evidence files. The system solves the problem of manual, inconsistent, and inefficient timeline construction by providing a unified platform for evidence organization and chronological analysis. This software is useful in specific applications.

1.2	Background
Traditional forensic tools such as EnCase, FTK, and Magnet AXIOM offer advanced capabilities but are expensive and complex. Open-source tools like Plaso and Autopsy are powerful but require command-line expertise.
Previous student projects at UCP mainly focused on case management systems or basic forensic utilities, lacking automated timeline reconstruction.
This project differentiates itself by focusing on metadata based timeline reconstruction, offering a GUI based solution that is lightweight, affordable, and easier to use.

1.3	Objective(s)/Aim(s)/Target(s)
•	Automate metadata extraction from DOCX, PDF, images, and log files. 
•	Normalize heterogeneous metadata into a single, well-defined schema. 
•	Generate accurate chronological timelines from extracted events. 
•	Provide an easy-to-use desktop GUI for upload, viewing, filtering, searching, exporting. 
•	Ensure forensic integrity (read-only evidence handling and logging). 
•	Validate the system using realistic datasets (e.g., from Kaggle). 
•	Produce complete technical and user documentation 
1.4	Produce complete technical and user documentation Scope
The system supports:
•	DOCX, PDF, JPEG/PNG, LOG/TXT files
•	Local desktop deployment
•	Timeline visualization, filtering, and export
Out of scope:
•	Disk imaging
•	Memory/network forensics
•	Cloud-based deployment
1.5	Business Goals
•  Reduce investigation time
•  Provide an affordable forensic solution
•  Improve accuracy and consistency of timelines
•  Support forensic education and training
1.6	Document Conventions
•  Headings are bold
•  Code, file types, and APIs use monoscope
•  ISO-8601 format is used for timestamps
•  UML notations follow standard conventions
1.7	Miscellaneous
This document is built upon SDP Phase-II and focuses on design, architecture, and implementation planning.
 
2.	Technical Architecture




















































The Forensic Timeline Reconstructor: Evidence Organizer is a custom-built (non COTS) local-first forensic support application designed to automate evidence metadata extraction and reconstruct a chronological timeline of events for a case. The system performs both interactive/online processing and batch-style processing during extraction (processing multiple files in a single run, iterating file-by file). Operationally, it supports transaction processing (CRUD for cases/files/events and status updates) as well as analytical reporting (timeline viewing, filtering/searching, and exporting structured results as JSON/CSV).
At a high level, the system follows a layered client/server architecture:
•	Presentation layer: React/React Native mobile UI for end users.
•	Application/service layer: Node.js + Express REST API, implementing controllers/services for case management, file handling, extraction control, timeline queries, and exports.
•	Processing layer: Python extraction engine invoked by the backend for format-specific metadata extraction and timestamp normalization.
•	Data layer: MongoDB for persisted case/file/event data, and local filesystem for evidence storage.
The system collects and manages investigation data including:
•	Users (optional authentication), roles
•	Cases (title, description, created_by, timestamps, status)
•	Evidence files (name, type, path, hash, size, upload time, processing status)
•	Timeline events (event type, timestamp, raw timestamp, file link, description)
•	Audit logs (optional) for traceability of actions like upload/extract/export
The implementation uses multiple languages aligned with subsystem responsibilities:
•	TypeScript/JavaScript for the React/React Native frontend and Node.js/Express backend
•	Python for extraction modules (DOCX/PDF/IMAGE/LOG) using libraries such as python-docx, PyPDF2, and ExifTool
The intended hardware platform is a standard investigator workstation/laptop capable of local processing (minimum specs from Phase 1: dual-core CPU, 4GB RAM; recommended: quad-core, 8GB+ RAM, SSD). The database platform is MongoDB (local instance), selected for flexible storage of heterogeneous metadata and events. The end-user interface is a mobile/thick-client style UI (React/React Native app running on device or emulator), communicating with the backend 
through HTTP/JSON REST APIs.
From a networking perspective, the default mode is local/localhost or LAN connectivity (mobile 
device/emulator to local backend). The system is hosted locally (not in an enterprise/external data center in the current scope): Node.js API, Python runtime, MongoDB, and evidence storage run on the 
local machine/lab PC; the mobile app connects over localhost/LAN.
The high-level architecture diagram (produced for Phase 2) illustrates the collaboration between the 
major components: UI ↔ API (REST), API ↔ DB (CRUD), API ↔ filesystem (store/read evidence), API → Python engine (invoke extraction), Python engine → filesystem (read only evidence), and Python engine/ API → DB (store events + update statuses).

2.1	Application and Data Architecture
•	This subsection describes the major processing units and data components reflected in the architecture:
Application components (logical view)
1.	React/React-Native App (UI)
Screens for: dashboard, case management, evidence upload, extraction trigger/status, timeline visualization & filters, and export.
•	Responsible for user input, validation at UI level, and presenting timeline results.
2.	Node.js + Express Backend API
•	CaseController: create/list/view/update cases.
•	FileController: upload evidence, store file metadata, compute hashes, track PENDING/PROCESSED/FAILED.
•	ExtractionController: triggers extraction for a case and returns extraction summaries.
•	TimelineController: returns timeline data and supports filters (date range, type, search).
•	ExportController: generates JSON/CSV export based on active filters.
3.	Python Extraction Engine
•	Strategy-like module set: Docx/PDF/Image/Log extractors
•	Normalizes timestamps to ISO 8601 and maps extracted fields into a unified Event model.
    Data components (physical/logical model)
•	MongoDB collections
•	cases, files, events (core)
•	users, audit_logs (optional)
•	Local evidence storage
•	Evidence files stored on disk; extraction reads files in read-only mode; DB stores paths + hashes rather than modifying originals.
Diagrams to include and briefly describe
•	ERD (MongoDB logical model): shows relationships Case 1..* File and File 1..* Event, plus optional User 1..* Case.
•	Class diagram: shows domain entities and service classes (ExtractionService, TimelineService, ExportService) and the extractor interface/implementations.
•	Component diagram (Phase 3 enhancement): decomposes backend into controllers/services/repositories and shows how Python modules integrate.
•	Activity diagram (Phase 3 enhancement): shows detailed steps for “Extract & Normalize Metadata” and/or “Filter + Export Timeline.”
Entity Relation Diagram:





















Class Diagram:
































Component Diagram:


 






2.2	Component Interactions and Collaborations
The system components collaborate through well-defined interfaces:
•	UI ↔ Backend API (REST): The mobile app issues HTTP/JSON requests for creating cases, uploading files, triggering extraction, retrieving filtered timelines, and requesting exports.
•	Backend API ↔ MongoDB: The backend performs CRUD operations on cases/files/events and applies query filters for timeline retrieval and export generation.
•	Backend API ↔ Local File System: Uploaded evidence is persisted in a controlled directory; file metadata (path/hash/type/status) is stored in MongoDB.
•	Backend API → Python Engine: The backend invokes Python extraction modules per file type, receives extracted metadata/events, normalizes/validates them, and persists them.
•	Python Engine ↔ File System (read-only): Extraction reads original evidence without modification, supporting forensic integrity.
•	Diagrams to include and briefly describe
•	Design-level sequence diagrams (UC-1..UC-4): already cover upload, extraction, view/filter timeline, export; Phase 2 can enrich them with validation, failure branches, and optional auth checks.
•	DFD Level 2 (detailed): include extraction/normalization (already present) and optionally add Level 2 for “Generate & Visualize Timeline” and “Export Timeline.”
•	Collaboration/communication diagram: one diagram showing message flow UI → controller → service → DB/Python → service → UI.












Sequence Diagram:






































































































































DFD diagram
 







	



































	
















































2.3	Design Reuse and Design Patterns
This project emphasizes reuse of proven libraries and applies lightweight design patterns to keep the system maintainable, extensible, and consistent with forensic requirements (e.g., preserving evidence integrity).
Design Reuse (Libraries / Tools Reused)
The system reuses established open-source tools rather than implementing low-level parsing logic from scratch:
•	React/React Native(Frontend UI): Reused to accelerate cross-platform UI development and ensure consistent styling.
•	Node.js + Express (Backend API): Reused to quickly implement REST endpoints, request validation, and controller routing.
•	MongoDB (Persistence Layer): Reused for flexible storage of heterogeneous evidence metadata and event records.
•	Python extraction libraries/tools:
o	PyPDF2 for PDF metadata parsing
o	python-docx for DOCX metadata parsing
o	ExifTool for image EXIF extraction
o	Log parsing utilities (custom parsing logic combined with standard Python string/date utilities)
This reuse reduces development time and improves reliability because the system depends on widely used and tested components.











Design Patterns Applied
The following patterns are used (or explicitly targeted) in the design:
1.	Layered Architecture
The solution is structured into layers:
o	Presentation (React/React Native app)
o	Application/API (Node.js + Express)
o	Processing (Python extraction engine)
o	Data (MongoDB + local filesystem)
This separation makes the system easier to test and evolve independently across layers.
2.	Client–Server Pattern (RESTful Services)
The mobile client communicates with the backend via HTTP/JSON REST. This isolates UI from backend processing and enables future clients (e.g., desktop UI or web UI) without changing core logic.
3.	Controller–Service Decomposition (Backend Organization)
Backend responsibilities are split so that:
o	Controllers handle HTTP routing and request/response formatting
o	Services handle business rules (extraction orchestration, timeline retrieval, export generation)
This improves maintainability and keeps controllers thin.
4.	Strategy Pattern (Metadata Extraction by File Type)
Evidence extraction is implemented using a strategy-based approach:
o	A common MetadataExtractor interface defines an extract() contract.
o	Concrete implementations (DOCX/PDF/IMAGE/LOG) can be swapped based on file type.
This allows new evidence types (e.g., ZIP, EVTX, browser history) to be added with minimal changes, mainly by adding a new extractor implementation.
5.	Adapter/Mapper (Normalization into a Unified Event Model)
Different file types provide different metadata formats. The system normalizes extracted values into a unified Event schema (ISO 8601 timestamps, standard event types, consistent descriptions). This ensures the timeline view and export logic work uniformly across all evidence sources.
2.4	Technology Architecture	

























































The Forensic Timeline Reconstructor system follows a local-first deployment model to ensure evidence is processed within a controlled environment and does not rely on external cloud services. The solution is designed to run primarily on an investigator workstation/lab PC, while the mobile client provides a convenient interface for managing cases, uploading evidence, viewing the reconstructed timeline, and exporting results.


At runtime, the React/React Native application runs on a physical device (connected via Wi Fi/LAN) or an emulator on the same machine. The client communicates with the backend using RESTful HTTP/JSON requests over either localhost (emulator scenario) or the investigator machine’s LAN IP address (physical device scenario).
The investigator workstation hosts the core services:
•	Node.js + Express Backend API, which exposes endpoints for case management, file uploads, timeline queries, and export.
•	Python Extraction Engine, which performs metadata parsing for supported file types (DOCX, PDF, images, and log files) and produces normalized timeline events.
•	MongoDB (local instance), which stores structured application data including cases, file records, and extracted timeline events.
•	Local file system storage, used to store uploaded evidence files and generated export files (CSV/JSON).
Evidence handling is designed with integrity in mind. Uploaded evidence files are stored on the local file system and are treated as read-only during extraction, meaning the Python extraction layer reads file contents for metadata only and does not modify original evidence. A SHA 256 hash can be computed at upload time and stored alongside the file record to support later integrity verification.
Overall, this technology architecture supports both interactive use (case creation, upload, viewing timelines) and batch-like processing (extracting events for a case). It also provides a scalable foundation for future improvements such as authentication, encryption-at-rest, containerized deployment, or remote access via secure VPN/TLS if required.






2.5	Architecture Evaluation	
The Forensic Timeline Reconstructor system follows a local-first deployment model to ensure evidence is processed within a controlled environment and does not rely on external cloud services. The solution is designed to run primarily on an investigator workstation/lab PC, while the mobile client provides a convenient interface for managing cases, uploading evidence, viewing the reconstructed timeline, and exporting results.


At runtime, the React/React Native application runs on a physical device (connected via Wi Fi/LAN) or an emulator on the same machine. The client communicates with the backend using RESTful HTTP/JSON requests over either localhost (emulator scenario) or the investigator machine’s LAN IP address (physical device scenario).
The investigator workstation hosts the core services:
•	Node.js + Express Backend API, which exposes endpoints for case management, file uploads, timeline queries, and export.
•	Python Extraction Engine, which performs metadata parsing for supported file types (DOCX, PDF, images, and log files) and produces normalized timeline events.
•	MongoDB (local instance), which stores structured application data including cases, file records, and extracted timeline events.
•	Local file system storage, used to store uploaded evidence files and generated export files (CSV/JSON).
Evidence handling is designed with integrity in mind. Uploaded evidence files are stored on the local file system and are treated as read-only during extraction, meaning the Python extraction layer reads file contents for metadata only and does not modify original evidence. A SHA 256 hash can be computed at upload time and stored alongside the file record to support later integrity verification.
Overall, this technology architecture supports both interactive use (case creation, upload, viewing timelines) and batch-like processing (extracting events for a case). It also provides a scalable foundation for future improvements such as authentication, encryption-at-rest, containerized deployment, or remote access via secure VPN/TLS if required.
 
3.	Detailed/Component Design
3.1	Component-Component Interface

Sequence Diagram:











































	









































































































































































Class Diagram:





















































3.2	Component-External Entities Interface


















































3.3	Component-Human Interface
•	All UI Screenshots (updated from Phase II):
o	Login screen
o	Dashboard
o	Cases list
o	Create case screen
o	Upload evidence screen (with progress)
o	Extraction status screen
o	Timeline screen (with chart visualization)
o	Filters panel
o	Export modal
•	UI Flow Diagram (swim lane or activity diagram)
o	Shows user actions + system responses
o	Highlights where validation/errors occur
•	HCI Guidelines Applied:
o	Accessibility standards
o	Error messages + recovery
o	Confirmation dialogs for destructive actions





















4.	Screenshots/Prototype 
4.1	Workflow


















































1.	Create Case
o	Investigator opens the app and creates a new case (title/description).
o	App sends requests to Backend API.
o	Backend creates a Case record in MongoDB and returns the caseId.
2.	Upload Evidence Files
o	Investigator selects evidence files (DOCX/PDF/Images/Logs) for the case.
o	App uploads files to Backend API.
o	Backend stores files in the local evidence directory and creates FileRecord entries in MongoDB.
o	Backend computers and stores SHA-256 hash for each uploaded file (integrity support).
3.	Extract Metadata & Generate Events
o	Investigator triggers extraction for a case (or extraction runs automatically after upload).
o	Backend selects extractor strategy based on file type and invokes the Python engine.
o	Python engine reads evidence in read-only mode, extracts metadata, normalizes timestamps, and creates Event objects.
o	Events are stored in MongoDB linked to Case and FileRecord.
4.	View Timeline
o	Investigator opens the timeline screen and applies filters (date range, event type, file type, keyword).
o	App requests filtered timeline from Backend API.
o	Backend queries MongoDB and returns a sorted event list.
5.	Export
o	Investigator exports the timeline to CSV/JSON.
o	Backend generates export file in local Exports folder and returns the export path/name (or download link if implemented).
o	Investigator accesses the exported file for reporting.









4.2	Screens
1.Login Screen




 
















2.Dashboard Screen

 


3.Settings Screen


 









4.Cases List Screen


 


5.Create Case Screen

 







6.Case Detail Screen 

 



7.Timeline Screen 

 










4.3	Additional Information
•	Supported evidence types: DOCX/PDF/Images/Logs
•	Assumptions/constraints: local-first, same LAN required for physical phone, max file size tested, etc.
•	Known limitations: partial metadata coverage, no authentication, limited time zone inference, etc.
•	Test data used: sample files and what was validated.
5.	Other Design Details
5.1 Evidence Integrity
•	Evidence files are treated read-only during extraction.
•	SHA-256 computed at upload time and stored in DB for later integrity checks.
5.2 Timestamp Normalization Rules
•	Store both rawTimestamp and normalized timestampISO.
•	Normalize to ISO 8601; if timezone missing, mark timezone as UNKNOWN and store local assumption in metadata.
5.3 Error Handling & Logging
•	File status set to FAILED with errorReason on extraction failure.
•	Extraction continues with remaining files (partial success).Test Specification and Results













6.	Test Case Specification
6.1	Test Case Specification

Table 6.1: TC-1 (Create Case – Valid)
Identifier	TC-1
Related requirements(s)	UC-1
Short description	Create a new case with valid title
Pre-condition(s)	Backend + MongoDB running
Input data	title="Case A", description="Test case"
Detailed steps	1) Open Create Case screen 2) Enter title 3) Click Save
Expected result(s)	Case created, case Id returned, visible in cases list.
Post-condition(s)	New case record exists in cases
Actual result(s)	Case successfully created, unique case Id generated and displayed in case list.
Test Case Result	Pass


Table 6.1: TC-2 (Create Case – Missing Title)
Identifier	TC-2
Related requirements(s)	UC-1
Short description	Reject case creation when title missing
Pre-condition(s)	Backend + MongoDB running
Input data	title=""
Detailed steps	1) Open Create Case 2) Leave title empty 3) Click Save
Expected result(s)	Validation error “Case title is required”; no DB insert
Post-condition(s)	No new case record created
Actual result(s)	System showed validation error “Case title is required” no record inserted in database.
Test Case Result	Pass






Table 6.1: TC-3 (Upload Evidence – Supported Types)
Identifier	TC-3
Related requirements(s)	UC-1
Short description	Upload DOCX, PDF, JPG, LOG to a case
Pre-condition(s)	Case exists
Input data	1 sample DOCX, 1 PDF, 1 JPG, 1 LOG
Detailed steps	1) Open case 2) Upload files 3) Verify list
Expected result(s)	Files stored, sha256 computed, status=PENDING
Post-condition(s)	Records exist in files
Actual result(s)	Initially file upload failed due to backend handling issue after fix, all supported files uploaded successfully, hashes generated, and status set to Pending.
Test Case Result	Pass

Table 6.1: TC-4 (Upload Evidence – Unsupported Type)
Identifier	TC-1
Related requirements(s)	UC-1
Short description	Reject unsupported file type (.exe)
Pre-condition(s)	Case exists
Input data	file="malware.exe"
Detailed steps	Upload .exe
Expected result(s)	UI shows unsupported type; backend rejects
Post-condition(s)	No file record for .exe
Actual result(s)	System correctly rejected .exe file and displayed unsupported file type message.
Test Case Result	Pass









Table 6.1: TC-5 (Run Extraction – Mixed Files)
Identifier	TC-1
Related requirements(s)	UC-2, NFR-Performance
Short description	Extract metadata for multiple file types
Pre-condition(s)	Files exist with PENDING status; Python deps installed
Input data	DOCX + PDF + JPG + LOG
Detailed steps	Click “Run Extraction”
Expected result(s)	Events created; file statuses updated to PROCESSED; summary shown
Post-condition(s)	events populated
Actual result(s)	Metadata extracted successfully for all supported files statuses updated to processed and timeline events generated.
Test Case Result	Pass


Table 6.1: TC-6 (Extraction Failure – Corrupted File)
Identifier	TC-6
Related requirements(s)	UC-2, NFR-Reliabilty
Short description	Corrupted file should not crash system
Pre-condition(s)	Include corrupted PDF in upload
Input data	corrupted.pdf
Detailed steps	Run extraction
Expected result(s)	That file status=FAILED with reason; others processed normally
Post-condition(s)	Partial success preserved
Actual result(s)	Corrupted file marked as failed with error message other files processed normally without system crash.
Test Case Result	Pass






Table 6.1: TC-7 (Timeline Filter – Date Range)
Identifier	TC-1
Related requirements(s)	UC-3
Short description	Filter timeline by date range metadata for multiple file types
Pre-condition(s)	Events exist
Input data	from=2025-01-01, to=2025-01-31
Detailed steps	Apply date range filter
Expected result(s)	Only events within range displayed
Post-condition(s)	None
Actual result(s)	Date filtering worked correctly only events within selected range displayed. Minor refresh issue observed earlier but resolved
Test Case Result	Pass


Table 6.1: TC-8 (Export – CSV)
Identifier	TC-1
Related requirements(s)	UC-4
Short description	Export filtered timeline to CSV
Pre-condition(s)	Events exist + filter applied
Input data	format=csv, same filters as timeline
Detailed steps	Click Export → CSV
Expected result(s)	CSV downloaded; headers + rows correct
Post-condition(s)	Optional audit log entry
Actual result(s)	CSV file downloaded successfully with correct headers and filtered data.
Test Case Result	Pass














Table 6.1: TC-9 (Performance – 50 Files Under 3 Minutes)
Identifier	TC-9
Related requirements(s)	NFR-Performance (Phase I 4.1)
Short description	Extract batch of 50 files within target time
Pre-condition(s)	Dataset with 50 files available
Input data	50 files ≤10MB
Detailed steps	Upload → Extract; record total time
Expected result(s)	Extraction completes ≤ 3 minutes on standard laptop
Post-condition(s)	Events stored
Actual result(s)	Extraction completed within acceptable time (2.5–3 minutes) on test system.
Test Case Result	Pass

 
6.2	Summary of Test Results

Table 6.2: Summary of Test Results
Module Name	Test cases run	Number of defects found 	Number of defects corrected so far	Number of defects still need to be corrected
Case Management Module	TC-1, TC-2	2 (signout issue,delete case issue)	1	1
FileUpload Module	TC-3, TC-4	1 (upload failure)	1	0
Extraction Engine	TC-5, TC-6	0	0	0
Timeline 
and
Filtering	TC-7, TC-8	1 (page refresh issue)	1	0
Performance Module	TC-9	0	0	0
Complete System	TC-1 -> TC-9	4	3	1
























7.	Revised Project Plan
7.1: Project Completion Status
Module Name	Status 
(Complete, Partially Implemented, Not Implemented)
Case Management	Partially Implemented (Create works, delete case issue unresolved)
Evidence Upload + SHA-256	Complete (upload issue fixed, hashing working)
Python Extractors (DOCX/PDF/IMAGE/LOG)	Complete
Timestamp Normalization	Partially Implemented (Needs improvement)
Timeline Visualization	Complete
Filters/Search	Complete
Export JSON/CSV	Complete
Audit Logs (optional)	Not Implemented
Complete System	Partially Implemented


























8.	References
•	B. Carrier, File System Forensic Analysis. Boston, MA, USA: Addison-Wesley, 2005.

•	“Autopsy: The Sleuth Kit and Autopsy,” Sleuth Kit, Accessed: Nov. 14, 2025. [Online]. Available: https://www.sleuthkit.org

•	“Plaso (log2timeline),” Plaso Project, Accessed: Nov. 14, 2025. [Online]. Available: https://github.com/log2timeline/plaso

•	“Google Charts,” Google Developers, Accessed: Nov. 14, 2025. [Online]. Available: https://developers.google.com/chart

•	“PyPDF2 Documentation,” PyPDF2 Developers, Accessed: Nov. 14, 2025. [Online]. Available: https://pypdf2.readthedocs.io

•	“python-docx Documentation,” python-docx Developers, Accessed: Nov. 14, 2025. [Online]. Available: https://python-docx.readthedocs.io

•	P. Harvey, “ExifTool,” Accessed: Nov. 14, 2025. [Online]. Available: https://exiftool.org

•	“Datasets,” Kaggle, Accessed: Nov. 14, 2025. [Online]. Available: https://www.kaggle.com/datasets
 
Appendix A: Glossary
API (Application Programming Interface)
A set of rules and endpoints that allow different software components (e.g., frontend and backend) to communicate using defined requests and responses.

Case
A logical container in the system that groups evidence files, extracted metadata, and the generated timeline for a specific investigation.

CSV (Comma-Separated Values)
A simple text file format used to store tabular data, often opened in spreadsheet tools like Microsoft Excel.

Digital Forensics
The process of identifying, preserving, analyzing, and presenting digital evidence in a legally acceptable manner.

DOCX
The Microsoft Word document format based on Office Open XML, which can store content and metadata inside a ZIP-based package.

Event
A single time-stamped occurrence derived from metadata (e.g., file creation, modification, access, or a log entry) that appears on the forensic timeline.

EXIF (Exchangeable Image File Format)
A standard for storing metadata in image files, such as the date and time the photo was taken, camera model, and sometimes GPS location.

Frontend
The user-facing part of the application implemented in React/React Native, running in the browser and providing the graphical interface.

JSON (JavaScript Object Notation)
A lightweight text format for structured data, used for communication between frontend and backend and for exporting metadata.

Kaggle
An online platform providing datasets and competitions; used here as a source of sample forensic data for testing and validation.

Log File
A text or structured file that records events or messages produced by software, operating systems, or devices, typically including timestamps and messages.

Metadata
Data that describes other data, such as file creation time, modification time, author, device information, and log timestamps.

MongoDB
A NoSQL, document-oriented database used to store extracted metadata, events, and case information in JSON-like documents.



Node.js
A JavaScript runtime environment used to implement the backend server and REST APIs for the system.

Normalization (Metadata Normalization)
The process of converting metadata from different file types into a consistent structure and a unified timestamp format.


PDF (Portable Document Format)
A widely used document format that can embed metadata such as author, creation date, and modification date.

Python
A programming language used in this project to implement metadata extraction scripts with libraries such as PyPDF2 and python-docx.

React/React Native
A JavaScript library used to build the user interface, composed of reusable components for views like upload and timeline.

REST (Representational State Transfer)
An architectural style for designing networked APIs, typically using HTTP methods (GET, POST, etc.) and JSON payloads.

SRS (Software Requirements Specification)
A formal document that describes the requirements, constraints, and scope of the software system to be developed.



Timeline (Forensic Timeline)
A visual or tabular representation of events ordered by time, used to reconstruct what happened and when in a digital investigation.

Timestamp
A record of the date and time at which an event occurred (e.g., file creation or log entry time).

UI (User Interface)
The visual layout and interactive elements through which users interact with the system (buttons, forms, charts, etc.).

User / Investigator
The primary human actor using the system to upload evidence, generate timelines, and analyze events.


 
Appendix B: IV & V Report
(Independent verification & validation)
IV & V Resource


Name	                                                                        Signature

Ali Raza                                                                         Ali

Khawaja Faheem Ud Din                                                 Faheem

Hassan Hanan Khalid                                                      Hassan




S#	Defect Description	Origin Stage	Status	Fix Time
				Hours	Minutes
1	Timeline export CSV columns mismatch with UI fields	Testing	Fixed	1	00
2	Extraction fails on PDF with missing metadata dictionary	Testing	Fixed	2	00
3	Search filter crashes when keywords contain special characters	Testing	In Progress	0	00
                                     Table 1: List of non-trivial defects

now you know the rules for the FYP project, you can start working on your project and make sure to follow these guidelines to ensure a successful completion. If you have any questions or need further clarification on any of the points mentioned, feel free to ask. Good luck with your project!
i want to make the project according to this as you know about the software autopsy and log2timeline, i want to make a project that is similar to these two software but with a more user-friendly interface and with the ability to extract metadata from a wider range of file types. I will be using React/React Native for the frontend, Node.js + Express for the backend, Python for the extraction engine, and MongoDB for data storage. I will also ensure that the system follows the design patterns and architecture outlined in the guidelines, and I will conduct thorough testing to ensure that the system meets the requirements and performs well.I will start by creating the basic structure of the application, including setting up the frontend and backend frameworks, and then I will implement the core functionalities such as case management, evidence upload, metadata extraction,timeline visualization, and export features. I will also make sure to document the design and implementation process,and I will prepare the necessary diagrams and test cases as outlined in the guidelines. I will keep track of any defects or issues that arise during development and testing, and I will work on fixing them in a timely manner. Overall, I am excited to work on this project and I will strive to create a robust and user-friendly forensic timeline reconstruction tool that can assist investigators in analyzing digital evidence effectively. 