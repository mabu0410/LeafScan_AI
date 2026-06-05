# Mermaid Diagram Pack For LeafScan AI

This document contains separate Mermaid diagrams for the current LeafScan AI project. The diagrams cover the original Chapter 2 and Chapter 3 thesis sections and the extra modules currently implemented in the repository: home dashboard, care tasks/logs, subscription, VNPAY payment, partner marketplace, admin moderation, Google OAuth, RAG chat, and deployment.

Note: The mobile profile screen calls `PUT /api/v1/users/me`, but the backend currently does not expose a `users` router. That gap is shown explicitly in the profile/API diagrams.

## 2.1 System Requirements Survey And Analysis

### 2.1.1 Potential User Survey Results

```mermaid
mindmap
  root((Potential User Survey))
    Target groups
      Home gardeners
      Small-scale farmers
      Agriculture students
      Plant care sellers
    Main problems
      Hard to identify leaf diseases early
      Limited access to experts
      Forgetting plant care schedules
      Need reliable treatment guidance
      Need scan history for follow-up
    Desired features
      Camera-based leaf scan
      Gallery image selection
      AI diagnosis confidence
      Disease details and treatment plans
      Personal garden management
      Chat assistant after diagnosis
      Marketplace product suggestions
    Quality expectations
      Fast response
      Simple mobile UI
      Vietnamese-first content
      Secure account data
      Clear warning for low-confidence results
```

### 2.1.2 System Actors

```mermaid
flowchart LR
    Farmer["Farmer/User"] --> MobileApp["LeafScan AI Mobile App"]
    Partner["Partner"] --> MobileApp
    Admin["Admin"] --> MobileApp

    MobileApp --> Backend["FastAPI Backend"]

    Backend --> PostgreSQL["PostgreSQL"]
    Backend --> Uploads["Upload Storage"]
    Backend --> ONNX["ONNX Runtime"]
    Backend --> Gemini["Gemini API"]
    Backend --> SMTP["SMTP Mail Server"]
    Backend --> Google["Google OAuth"]
    Backend --> VNPAY["VNPAY"]

    Farmer -->|register, login, scan, chat, manage garden| MobileApp
    Partner -->|register store, manage products, pay membership| MobileApp
    Admin -->|moderate partners and products| MobileApp
```

### 2.1.2.1 Overall Use-Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome

actor "Guest" as Guest
actor "Farmer / User" as User
actor "Partner" as Partner
actor "Admin" as Admin

actor "Google OAuth" as Google
actor "SMTP Mail Server" as SMTP
actor "VNPAY" as VNPAY
actor "Gemini API" as Gemini
actor "ONNX Model" as AIModel

rectangle "LeafScan AI System" {
  usecase "Register" as UC_Register
  usecase "Login" as UC_Login
  usecase "Reset Password" as UC_ResetPassword
  usecase "Manage Account" as UC_ManageAccount

  usecase "View Home Dashboard" as UC_ViewHome
  usecase "Manage Garden" as UC_ManageGarden
  usecase "Scan Leaf" as UC_ScanLeaf
  usecase "View Diagnosis Result" as UC_ViewDiagnosis
  usecase "View Scan History" as UC_ViewHistory
  usecase "Search Disease Info" as UC_SearchDisease
  usecase "Ask Chatbot" as UC_Chat
  usecase "View Care Tips" as UC_ViewCareTips
  usecase "Manage Care Tasks" as UC_ManageCare

  usecase "Manage Subscription" as UC_Subscription
  usecase "Browse Marketplace" as UC_BrowseMarket
  usecase "View Product / Store" as UC_ViewProduct

  usecase "Register Store" as UC_RegisterStore
  usecase "Manage Store Profile" as UC_ManageStore
  usecase "Manage Products" as UC_ManageProducts
  usecase "Pay Partner Membership" as UC_PartnerMembership

  usecase "Moderate Stores" as UC_ModerateStore
  usecase "Moderate Products" as UC_ModerateProduct
  usecase "Manage Care Tips" as UC_ManageTips
}

Guest --> UC_Register
Guest --> UC_Login
Guest --> UC_ResetPassword
Guest --> UC_SearchDisease
Guest --> UC_BrowseMarket

User --> UC_ManageAccount
User --> UC_ViewHome
User --> UC_ManageGarden
User --> UC_ScanLeaf
User --> UC_ViewDiagnosis
User --> UC_ViewHistory
User --> UC_SearchDisease
User --> UC_Chat
User --> UC_ViewCareTips
User --> UC_ManageCare
User --> UC_Subscription
User --> UC_BrowseMarket
User --> UC_ViewProduct

Partner --> UC_RegisterStore
Partner --> UC_ManageStore
Partner --> UC_ManageProducts
Partner --> UC_PartnerMembership

Admin --> UC_ModerateStore
Admin --> UC_ModerateProduct
Admin --> UC_ManageTips

UC_Login --> Google
UC_ResetPassword --> SMTP
UC_Subscription --> VNPAY
UC_PartnerMembership --> VNPAY
UC_Chat --> Gemini
UC_ScanLeaf --> AIModel

UC_ScanLeaf ..> UC_ViewDiagnosis : <<include>>
UC_ScanLeaf ..> UC_ViewHistory : <<include>>
UC_ManageGarden ..> UC_ViewHistory : <<include>>
UC_BrowseMarket ..> UC_ViewProduct : <<include>>
@enduml
```

### 2.1.3 Detailed Functional Requirements

```mermaid
requirementDiagram
    functionalRequirement auth {
        id: FR_01
        text: Users shall register, log in, use JWT authentication, reset passwords with OTP, and optionally use Google OAuth.
        risk: high
        verifymethod: test
    }

    functionalRequirement garden {
        id: FR_02
        text: Users shall create, update, view, delete, and upload images for plants in My Garden.
        risk: medium
        verifymethod: test
    }

    functionalRequirement diagnosis {
        id: FR_03
        text: Users shall capture or select leaf images and receive AI disease diagnosis, confidence, stage forecast, and treatment plan.
        risk: high
        verifymethod: test
    }

    functionalRequirement history {
        id: FR_04
        text: Users shall view scan history globally and by plant.
        risk: medium
        verifymethod: test
    }

    functionalRequirement diseaseManual {
        id: FR_05
        text: Users shall search disease information and view detailed symptoms, causes, treatment, and prevention.
        risk: medium
        verifymethod: test
    }

    functionalRequirement chat {
        id: FR_06
        text: Users shall ask disease-care questions through a RAG chatbot with Gemini and streaming support.
        risk: medium
        verifymethod: test
    }

    functionalRequirement subscription {
        id: FR_07
        text: Users shall view scan quota, pay for subscription plans through VNPAY, and have scan consumption tracked.
        risk: high
        verifymethod: test
    }

    functionalRequirement marketplace {
        id: FR_08
        text: Partners shall register stores, pay membership fees, manage products, and expose approved products in the marketplace.
        risk: high
        verifymethod: test
    }

    functionalRequirement admin {
        id: FR_09
        text: Admin users shall approve or reject partner stores and partner products.
        risk: high
        verifymethod: test
    }

    element MobileApp {
        type: software
    }

    element BackendAPI {
        type: software
    }

    MobileApp - satisfies -> auth
    MobileApp - satisfies -> garden
    MobileApp - satisfies -> diagnosis
    BackendAPI - satisfies -> history
    BackendAPI - satisfies -> diseaseManual
    BackendAPI - satisfies -> chat
    BackendAPI - satisfies -> subscription
    BackendAPI - satisfies -> marketplace
    BackendAPI - satisfies -> admin
```

### 2.1.4 Non-Functional Requirements

```mermaid
mindmap
  root((Non-Functional Requirements))
    Performance
      Diagnosis response should be suitable for mobile usage
      API requests use timeout handling
      Model inference runs on backend
    Reliability
      Low-confidence and invalid-image rejection
      Fallback heuristic when model file is unavailable
      Dry-run cleanup script for uploads
    Security
      JWT protected APIs
      Bcrypt password hashing
      OTP expiration
      Rate limiting for sensitive endpoints
      Secret scanner before push
    Maintainability
      FastAPI routers by domain
      SQLAlchemy domain models
      Zustand stores by app concern
      Separate API client layer
    Usability
      Bottom tab navigation
      Camera and gallery scan input
      Vietnamese-first UI
      Clear result and treatment screens
    Deployability
      Dockerfile
      Render blueprint
      Environment-based configuration
      Gitignored secrets and model artifacts
```

## 2.2 System Architecture Design

### 2.2.1 Three-Tier Overall Architecture

```mermaid
flowchart TB
    subgraph PresentationTier["Presentation Tier"]
        Mobile["React Native + Expo Mobile App"]
        Screens["Screens: Home, Garden, Scan, History, Marketplace, Profile"]
        Stores["Zustand Stores"]
        ApiClient["TypeScript API Client"]
        Mobile --> Screens
        Screens --> Stores
        Screens --> ApiClient
    end

    subgraph ApplicationTier["Application Tier"]
        FastAPI["FastAPI Backend"]
        Routers["REST Routers"]
        Services["Business and AI Services"]
        AuthDeps["JWT, Admin, Rate Limit Dependencies"]
        FastAPI --> Routers
        Routers --> Services
        Routers --> AuthDeps
    end

    subgraph DataTier["Data Tier"]
        PostgreSQL["PostgreSQL Database"]
        Uploads["Uploads Directory"]
        DiseaseDB["disease_db.json"]
        ModelFiles["ONNX/TFLite Model Artifacts"]
        External["Google OAuth, Gemini API, SMTP, VNPAY"]
    end

    ApiClient -->|HTTPS REST + Bearer JWT| FastAPI
    Services --> PostgreSQL
    Services --> Uploads
    Services --> DiseaseDB
    Services --> ModelFiles
    Services --> External
```

### 2.2.2 Backend Service And Module Architecture

```mermaid
flowchart TB
    FastAPI["app.main FastAPI"] --> AuthRouter["Auth Router"]
    FastAPI --> DiagnosisRouter["Diagnosis Router"]
    FastAPI --> PlantsRouter["Plants Router"]
    FastAPI --> HistoryRouter["History Router"]
    FastAPI --> DiseasesRouter["Diseases Router"]
    FastAPI --> CareTipsRouter["Care Tips Router"]
    FastAPI --> HomeRouter["Home Router"]
    FastAPI --> ChatRouter["Chat Router"]
    FastAPI --> PartnersRouter["Partners Router"]
    FastAPI --> SubscriptionsRouter["Subscriptions Router"]

    AuthRouter --> Security["security.py: bcrypt + JWT"]
    AuthRouter --> EmailService["email_service.py"]
    AuthRouter --> GoogleOAuth["Google OAuth verification"]

    DiagnosisRouter --> ImageValidation["image_validation.py"]
    DiagnosisRouter --> ModelService["model_service.py"]
    DiagnosisRouter --> PlantScope["plant_scope_validator.py"]
    DiagnosisRouter --> StageService["stage_service.py"]
    DiagnosisRouter --> TreatmentService["treatment_service.py"]
    DiagnosisRouter --> SubscriptionService["subscription_service.py"]

    ChatRouter --> RAGService["rag_service.py"]
    HomeRouter --> CareTaskLog["CareTask and CareLog services in router"]
    PartnersRouter --> VNPAYService["vnpay_service.py"]
    SubscriptionsRouter --> SubscriptionService

    Security --> Database["SQLAlchemy Session"]
    EmailService --> SMTP["SMTP Mail Server"]
    GoogleOAuth --> Google["Google OAuth"]
    ModelService --> ONNX["ONNX Runtime"]
    RAGService --> Gemini["Gemini API"]
    VNPAYService --> VNPAY["VNPAY"]
    Database --> PostgreSQL["PostgreSQL"]
```

### 2.2.3 RESTful API Map

```mermaid
flowchart LR
    Client["Mobile API Client"] --> API["/api/v1"]

    API --> Auth["Auth"]
    Auth --> A1["POST /auth/register"]
    Auth --> A2["POST /auth/login"]
    Auth --> A3["GET /auth/me"]
    Auth --> A4["POST /auth/change-password"]
    Auth --> A5["POST /auth/forgot-password"]
    Auth --> A6["POST /auth/reset-password"]
    Auth --> A7["DELETE /auth/account"]
    Auth --> A8["POST /auth/google/login"]
    Auth --> A9["POST /auth/google/link"]
    Auth --> A10["POST /auth/google/unlink"]

    API --> Plants["Plants"]
    Plants --> P1["GET /plants"]
    Plants --> P2["POST /plants"]
    Plants --> P3["GET /plants/{id}"]
    Plants --> P4["PUT /plants/{id}"]
    Plants --> P5["DELETE /plants/{id}"]
    Plants --> P6["POST /plants/{id}/image"]

    API --> Diagnosis["Diagnosis"]
    Diagnosis --> D1["GET /health"]
    Diagnosis --> D2["POST /diagnose"]

    API --> Knowledge["Knowledge"]
    Knowledge --> K1["GET /diseases"]
    Knowledge --> K2["GET /diseases/{disease_key}"]
    Knowledge --> K3["GET /care-tips"]
    Knowledge --> K4["GET /care-tips/today"]

    API --> History["History"]
    History --> H1["GET /history"]
    History --> H2["GET /history/plant/{plant_id}"]

    API --> Home["Home"]
    Home --> HM1["GET /home/summary"]
    Home --> HM2["CRUD /home/tasks"]
    Home --> HM3["CRUD /home/care-logs"]

    API --> Chat["Chat"]
    Chat --> C1["POST /chat"]
    Chat --> C2["POST /chat/stream"]

    API --> Subscription["Subscription"]
    Subscription --> S1["GET /subscription/status"]
    Subscription --> S2["POST /user-payments/vnpay/create"]
    Subscription --> S3["GET /user-payments/vnpay/ipn"]
    Subscription --> S4["GET /user-payments/status/{txn_ref}"]

    API --> Marketplace["Marketplace and Partner"]
    Marketplace --> M1["POST /partners/register"]
    Marketplace --> M2["GET/PUT /partners/me"]
    Marketplace --> M3["CRUD /partners/me/products"]
    Marketplace --> M4["GET /marketplace/partners"]
    Marketplace --> M5["GET /marketplace/products"]
    Marketplace --> M6["POST /partner-payments/vnpay/create"]
    Marketplace --> M7["GET /admin/partners"]
    Marketplace --> M8["PATCH /admin/products/{id}/status"]

    Client -.-> Gap["Implementation gap: mobile calls PUT /users/me, backend router is missing"]
```

## 2.3 Database Design

### 2.3.1 Full ERD From Current SQLAlchemy Models

```mermaid
erDiagram
    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string phone
        string avatar
        string role
        string google_id UK
        datetime created_at
    }

    PLANTS {
        int id PK
        int user_id FK
        string name
        string latin_name
        string category
        string image_url
        string thumbnail_url
        string location
        text notes
        float health_score
        datetime created_at
    }

    DISEASES {
        int id PK
        string disease_key UK
        string model_class_name UK
        string name
        string severity
        text description
        json symptoms
        json treatment
        json prevention
        int affected_area_typical
        string image_url
    }

    CARE_TIPS {
        int id PK
        string slug UK
        string title
        text summary
        text content
        string category
        json suitable_plants
        int related_disease_id FK
        int priority
        boolean is_active
        string source_name
        text source_url
        date start_date
        date end_date
        datetime created_at
        datetime updated_at
    }

    PASSWORD_RESET_OTPS {
        int id PK
        string email
        string otp_hash
        datetime expires_at
        boolean used
        datetime created_at
    }

    SCAN_HISTORY {
        int id PK
        int user_id FK
        int plant_id FK
        string disease_key FK
        string image_url
        float confidence
        string predicted_stage
        string forecast_stage_7d
        float affected_area_snapshot
        datetime scan_date
    }

    CARE_TASKS {
        int id PK
        int user_id FK
        int plant_id FK
        string title
        string task_type
        datetime due_at
        string status
        datetime completed_at
        datetime created_at
        datetime updated_at
    }

    CARE_LOGS {
        int id PK
        int user_id FK
        int plant_id FK
        string title
        text description
        string log_type
        datetime performed_at
        datetime created_at
        datetime updated_at
    }

    SUBSCRIPTIONS {
        int id PK
        int user_id FK
        string tier
        datetime started_at
        datetime expires_at
        datetime created_at
        datetime updated_at
    }

    SCAN_QUOTAS {
        int id PK
        int user_id FK
        int remaining_scans
        datetime last_reset_at
        datetime updated_at
    }

    SCAN_CONSUMPTIONS {
        int id PK
        int user_id FK
        int scan_id FK
        datetime consumed_at
    }

    USER_PAYMENT_TRANSACTIONS {
        int id PK
        int user_id FK
        string provider
        string txn_ref UK
        string plan_key
        string tier
        int amount_vnd
        int duration_days
        int daily_scan_limit
        string status
        text payment_url
        string vnp_transaction_no
        string provider_response_code
        json raw_payload
        datetime paid_at
        datetime created_at
        datetime updated_at
    }

    PARTNERS {
        int id PK
        int user_id FK
        string company_name
        string store_name
        text description
        string address
        string logo_url
        string cover_url
        string contact_email UK
        string phone
        string business_license
        string business_license_file_url
        string representative_name
        string representative_role
        string service_area
        text main_products
        boolean advertising_commitment_accepted
        json product_categories
        string website_url
        string contact_url
        string status
        text rejection_reason
        datetime created_at
        datetime updated_at
    }

    PARTNER_MEMBERSHIPS {
        int id PK
        int partner_id FK
        int price_vnd
        int duration_days
        int max_active_products
        string status
        datetime started_at
        datetime expires_at
        int source_transaction_id FK
        datetime created_at
    }

    PAYMENT_TRANSACTIONS {
        int id PK
        int partner_id FK
        string provider
        string txn_ref UK
        int amount_vnd
        string status
        text payment_url
        string vnp_transaction_no
        string provider_response_code
        json raw_payload
        datetime paid_at
        datetime created_at
        datetime updated_at
    }

    PARTNER_PRODUCTS {
        int id PK
        int partner_id FK
        string name
        text description
        string image_url
        string price_range
        json target_diseases
        json target_categories
        string product_url
        boolean is_active
        string moderation_status
        text rejection_reason
        datetime created_at
        datetime updated_at
    }

    PRODUCT_IMPRESSIONS {
        int id PK
        int partner_product_id FK
        int scan_id FK
        int user_id FK
        datetime impressed_at
        boolean clicked
    }

    USERS ||--o{ PLANTS : owns
    USERS ||--o{ SCAN_HISTORY : creates
    USERS ||--o{ CARE_TASKS : schedules
    USERS ||--o{ CARE_LOGS : records
    USERS ||--o| SUBSCRIPTIONS : has
    USERS ||--o| SCAN_QUOTAS : has
    USERS ||--o{ SCAN_CONSUMPTIONS : consumes
    USERS ||--o{ USER_PAYMENT_TRANSACTIONS : pays
    USERS ||--o| PARTNERS : owns
    USERS ||--o{ PRODUCT_IMPRESSIONS : receives
    PLANTS ||--o{ SCAN_HISTORY : scanned_for
    PLANTS ||--o{ CARE_TASKS : has
    PLANTS ||--o{ CARE_LOGS : has
    DISEASES ||--o{ CARE_TIPS : explains
    DISEASES ||--o{ SCAN_HISTORY : diagnosed_as
    SCAN_HISTORY ||--o{ SCAN_CONSUMPTIONS : records
    SCAN_HISTORY ||--o{ PRODUCT_IMPRESSIONS : recommends
    PARTNERS ||--o{ PARTNER_PRODUCTS : lists
    PARTNERS ||--o{ PARTNER_MEMBERSHIPS : subscribes
    PARTNERS ||--o{ PAYMENT_TRANSACTIONS : pays
    PAYMENT_TRANSACTIONS ||--o{ PARTNER_MEMBERSHIPS : activates
    PARTNER_PRODUCTS ||--o{ PRODUCT_IMPRESSIONS : generates
```

### 2.3.2 Compact Core ERD For Thesis Readability

```mermaid
erDiagram
    USERS {
        int id PK
        string email UK
        string password_hash
        string role
        string google_id UK
    }

    PLANTS {
        int id PK
        int user_id FK
        string name
        string category
        float health_score
    }

    DISEASES {
        int id PK
        string disease_key UK
        string model_class_name UK
        string name
        string severity
    }

    SCAN_HISTORY {
        int id PK
        int user_id FK
        int plant_id FK
        string disease_key FK
        string image_url
        float confidence
        string predicted_stage
        string forecast_stage_7d
    }

    CARE_TIPS {
        int id PK
        int related_disease_id FK
        string title
        string category
        boolean is_active
    }

    CARE_TASKS {
        int id PK
        int user_id FK
        int plant_id FK
        string title
        datetime due_at
        string status
    }

    CARE_LOGS {
        int id PK
        int user_id FK
        int plant_id FK
        string title
        datetime performed_at
    }

    USERS ||--o{ PLANTS : owns
    USERS ||--o{ SCAN_HISTORY : creates
    USERS ||--o{ CARE_TASKS : schedules
    USERS ||--o{ CARE_LOGS : records
    PLANTS ||--o{ SCAN_HISTORY : scanned_for
    PLANTS ||--o{ CARE_TASKS : has
    PLANTS ||--o{ CARE_LOGS : has
    DISEASES ||--o{ SCAN_HISTORY : diagnosed_as
    DISEASES ||--o{ CARE_TIPS : has
```

### 2.3.3 Marketplace, Subscription, And Payment ERD Extension

```mermaid
erDiagram
    USERS {
        int id PK
        string email UK
        string role
    }

    SUBSCRIPTIONS {
        int id PK
        int user_id FK
        string tier
        datetime started_at
        datetime expires_at
    }

    SCAN_QUOTAS {
        int id PK
        int user_id FK
        int remaining_scans
        datetime last_reset_at
    }

    SCAN_CONSUMPTIONS {
        int id PK
        int user_id FK
        int scan_id FK
        datetime consumed_at
    }

    USER_PAYMENT_TRANSACTIONS {
        int id PK
        int user_id FK
        string txn_ref UK
        string plan_key
        string tier
        int amount_vnd
        string status
    }

    PARTNERS {
        int id PK
        int user_id FK
        string company_name
        string contact_email UK
        string status
    }

    PARTNER_PRODUCTS {
        int id PK
        int partner_id FK
        string name
        boolean is_active
        string moderation_status
    }

    PAYMENT_TRANSACTIONS {
        int id PK
        int partner_id FK
        string txn_ref UK
        int amount_vnd
        string status
    }

    PARTNER_MEMBERSHIPS {
        int id PK
        int partner_id FK
        int source_transaction_id FK
        string status
        datetime expires_at
    }

    PRODUCT_IMPRESSIONS {
        int id PK
        int partner_product_id FK
        int user_id FK
        int scan_id FK
        boolean clicked
    }

    USERS ||--o| SUBSCRIPTIONS : has
    USERS ||--o| SCAN_QUOTAS : has
    USERS ||--o{ SCAN_CONSUMPTIONS : consumes
    USERS ||--o{ USER_PAYMENT_TRANSACTIONS : pays
    USERS ||--o| PARTNERS : registers
    PARTNERS ||--o{ PARTNER_PRODUCTS : manages
    PARTNERS ||--o{ PAYMENT_TRANSACTIONS : pays
    PARTNERS ||--o{ PARTNER_MEMBERSHIPS : owns
    PAYMENT_TRANSACTIONS ||--o{ PARTNER_MEMBERSHIPS : activates
    PARTNER_PRODUCTS ||--o{ PRODUCT_IMPRESSIONS : receives
    USERS ||--o{ PRODUCT_IMPRESSIONS : sees
```

## 2.4 Detailed Use Case Design

### 2.4.1 Overall Use Case Diagram

```mermaid
flowchart LR
    Farmer["Farmer/User"]
    Partner["Partner"]
    Admin["Admin"]
    Google["Google OAuth"]
    Gemini["Gemini API"]
    SMTP["SMTP Mail Server"]
    VNPAY["VNPAY"]

    subgraph System["LeafScan AI System"]
        UC01(("UC-01 Register account"))
        UC02(("UC-02 Login"))
        UC03(("UC-03 Logout"))
        UC04(("UC-04 Update profile"))
        UC05(("UC-05 Capture leaf image"))
        UC06(("UC-06 Select leaf image"))
        UC07(("UC-07 Receive AI diagnosis"))
        UC08(("UC-08 View disease information"))
        UC09(("UC-09 View treatment plan"))
        UC10(("UC-10 View scan history"))
        UC11(("UC-11 Filter/search history"))
        UC12(("UC-12 View plant scan history"))
        UC13(("UC-13 Browse disease manual"))
        UC14(("UC-14 Search disease manual"))
        UC15(("Subscribe and pay for scan quota"))
        UC16(("Chat with RAG assistant"))
        UC17(("Register partner channel"))
        UC18(("Manage partner products"))
        UC19(("Moderate partner/product"))
        UC20(("Browse marketplace"))
    end

    Farmer --> UC01
    Farmer --> UC02
    Farmer --> UC03
    Farmer --> UC04
    Farmer --> UC05
    Farmer --> UC06
    Farmer --> UC07
    Farmer --> UC08
    Farmer --> UC09
    Farmer --> UC10
    Farmer --> UC11
    Farmer --> UC12
    Farmer --> UC13
    Farmer --> UC14
    Farmer --> UC15
    Farmer --> UC16
    Farmer --> UC20

    Partner --> UC02
    Partner --> UC17
    Partner --> UC18
    Partner --> UC20

    Admin --> UC19

    Google --> UC02
    SMTP --> UC01
    SMTP --> UC02
    Gemini --> UC16
    VNPAY --> UC15
    VNPAY --> UC17
```

### 2.4.2 UC-01 To UC-04 Account And Profile Flows

```mermaid
flowchart TD
    Start([Start]) --> Choose["Choose auth action"]

    Choose --> Register["UC-01 Register with name, email, password, phone, role"]
    Register --> ValidateRegister{"Valid and unique email/phone?"}
    ValidateRegister -- No --> RegisterError["Show validation error"]
    ValidateRegister -- Yes --> HashPassword["Hash password with bcrypt"]
    HashPassword --> CreateUser["Create user in users table"]
    CreateUser --> ReturnJWT["Return JWT and user profile"]

    Choose --> Login["UC-02 Login with email/phone and password"]
    Login --> VerifyPassword{"Credentials valid?"}
    VerifyPassword -- No --> LoginError["Show login error"]
    VerifyPassword -- Yes --> ReturnJWT

    Choose --> GoogleLogin["Google OAuth login/link"]
    GoogleLogin --> VerifyGoogle["Verify Google ID token"]
    VerifyGoogle --> ReturnJWT

    Choose --> Logout["UC-03 Logout"]
    Logout --> ClearStore["Clear auth store token and user"]

    Choose --> UpdateProfile["UC-04 Update personal profile"]
    UpdateProfile --> ProfileGap["Current gap: mobile calls PUT /api/v1/users/me"]
    ProfileGap --> MissingBackend["Backend users router is not implemented"]
    MissingBackend --> MockFallback["Mobile falls back to local mock update"]

    ReturnJWT --> Authenticated([Authenticated])
    ClearStore --> End([End])
    RegisterError --> End
    LoginError --> End
    MockFallback --> End
```

### 2.4.3 UC-05 To UC-09 Scan, Diagnosis, Disease Detail, And Treatment

```mermaid
flowchart TD
    Start([Start]) --> SelectPlant["Select plant scope from garden or supported PlantVillage list"]
    SelectPlant --> ImageSource{"Image source?"}
    ImageSource -- Camera --> Capture["UC-05 Capture leaf image"]
    ImageSource -- Gallery --> Pick["UC-06 Select leaf image"]
    Capture --> Submit["Submit multipart image to POST /diagnose"]
    Pick --> Submit

    Submit --> Validate["Validate file type, size, and leaf quality"]
    Validate --> ValidLeaf{"Valid leaf image?"}
    ValidLeaf -- No --> Reject["Return actionable rejection message"]
    ValidLeaf -- Yes --> Infer["Run ONNX/TFLite inference"]
    Infer --> ScopeGuard["Apply plant-scope guard"]
    ScopeGuard --> ScopeValid{"Confidence, margin, and top-5 scope valid?"}
    ScopeValid -- No --> Reject
    ScopeValid -- Yes --> Stage["Infer disease stage and 7-day forecast"]
    Stage --> Treatment["Select treatment plan by stage"]
    Treatment --> Save["Save scan_history and scan_consumption"]
    Save --> Result["UC-07 Receive AI diagnostic result"]
    Result --> DiseaseInfo["UC-08 View disease information"]
    Result --> TreatmentPlan["UC-09 View treatment plan"]
    DiseaseInfo --> End([End])
    TreatmentPlan --> End
    Reject --> End
```

### 2.4.4 UC-10 To UC-14 History And Disease Manual

```mermaid
flowchart TD
    Start([Start]) --> Menu["Open History or Search"]

    Menu --> History["UC-10 View scan history"]
    History --> LoadHistory["GET /api/v1/history"]
    LoadHistory --> GroupByDate["Group scans by date"]
    GroupByDate --> Filter["UC-11 Filter and search history"]
    Filter --> Detail["UC-12 View plant scan history"]
    Detail --> PlantHistory["GET /api/v1/history/plant/{plant_id}"]

    Menu --> Manual["UC-13 Browse disease manual"]
    Manual --> DiseaseList["GET /api/v1/diseases"]
    DiseaseList --> Search["UC-14 Search disease manual"]
    Search --> DiseaseDetail["GET /api/v1/diseases/{disease_key}"]

    PlantHistory --> End([End])
    DiseaseDetail --> End
```

### 2.4.5 Extra Use Cases Beyond The Original TOC

```mermaid
flowchart LR
    Farmer["Farmer/User"]
    Partner["Partner"]
    Admin["Admin"]

    subgraph ExtraUC["Extra Implemented Use Cases"]
        SubStatus(("View subscription status"))
        PayScanPlan(("Pay user scan plan through VNPAY"))
        Chat(("Consult RAG chatbot"))
        Home(("View dashboard, tasks, and care logs"))
        Marketplace(("Browse marketplace products"))
        PartnerRegister(("Register partner channel"))
        PartnerPayment(("Pay partner membership"))
        ProductManage(("Create/update/delete partner products"))
        AdminPartner(("Approve or reject partner stores"))
        AdminProduct(("Approve or reject products"))
    end

    Farmer --> SubStatus
    Farmer --> PayScanPlan
    Farmer --> Chat
    Farmer --> Home
    Farmer --> Marketplace

    Partner --> PartnerRegister
    Partner --> PartnerPayment
    Partner --> ProductManage

    Admin --> AdminPartner
    Admin --> AdminProduct
```

## 2.5 Activity Diagrams

### 2.5.1 Activity Diagram - Scanning And Diagnosis Process

```mermaid
flowchart TD
    Start([Start]) --> OpenScan["Open Scan screen"]
    OpenScan --> Permission{"Camera/gallery permission granted?"}
    Permission -- No --> RequestPermission["Request permission"]
    RequestPermission --> Permission
    Permission -- Yes --> SelectPlant["Select plant scope"]
    SelectPlant --> ChooseSource{"Capture or gallery?"}
    ChooseSource -- Capture --> CaptureImage["Capture image"]
    ChooseSource -- Gallery --> PickImage["Pick image"]
    CaptureImage --> Upload["Upload image, plant_id, selected_plant_key"]
    PickImage --> Upload
    Upload --> AuthCheck{"JWT valid?"}
    AuthCheck -- No --> AuthError["Return 401 and ask user to log in"]
    AuthCheck -- Yes --> QuotaCheck{"Scan quota available?"}
    QuotaCheck -- No --> QuotaError["Return 402 upgrade required"]
    QuotaCheck -- Yes --> FileValidation["Validate MIME, extension, size"]
    FileValidation --> LeafValidation{"Leaf image valid?"}
    LeafValidation -- No --> Reject["Return rejection response"]
    LeafValidation -- Yes --> Inference["Run model inference"]
    Inference --> ScopeGuard{"Plant scope accepted?"}
    ScopeGuard -- No --> Reject
    ScopeGuard -- Yes --> BuildResult["Build diagnosis, stage forecast, treatment"]
    BuildResult --> Persist["Save scan history and quota consumption"]
    Persist --> ShowResult["Show Result screen"]
    ShowResult --> End([End])
    Reject --> End
    AuthError --> End
    QuotaError --> End
```

### 2.5.2 Activity Diagram - User Authentication And JWT

```mermaid
flowchart TD
    Start([App starts]) --> LoadStore["Load persisted Zustand auth store"]
    LoadStore --> HasToken{"Access token exists?"}
    HasToken -- No --> AuthStack["Show Onboarding/Login/Register stack"]
    HasToken -- Yes --> Refresh["Call GET /api/v1/auth/me"]
    Refresh --> ValidToken{"JWT valid and user exists?"}
    ValidToken -- No --> ClearAuth["Clear local auth state"]
    ClearAuth --> AuthStack
    ValidToken -- Yes --> RoleCheck{"User role is partner/dealer?"}
    RoleCheck -- Yes --> PartnerChannel["Open PartnerChannel screen"]
    RoleCheck -- No --> MainTabs["Open farmer MainTabs"]
    AuthStack --> LoginAction["User registers, logs in, or uses Google OAuth"]
    LoginAction --> BackendVerify["Backend validates credentials or Google token"]
    BackendVerify --> IssueJWT["Issue JWT with expiration"]
    IssueJWT --> PersistJWT["Persist token and user in AsyncStorage"]
    PersistJWT --> RoleCheck
```

### 2.5.3 Activity Diagram - Partner Registration And Product Moderation

```mermaid
flowchart TD
    Start([Start]) --> PartnerLogin["Partner logs in or registers partner account"]
    PartnerLogin --> SubmitProfile["Submit partner profile and required business information"]
    SubmitProfile --> UploadDocs["Upload logo, cover, and business license"]
    UploadDocs --> PendingReview["Partner status becomes pending_review"]
    PendingReview --> AdminReview["Admin opens AdminModeration screen"]
    AdminReview --> ReviewPartner{"Approve partner?"}
    ReviewPartner -- No --> RejectPartner["Set partner status rejected with reason"]
    ReviewPartner -- Yes --> ActivePartner["Set partner status active"]
    ActivePartner --> PayMembership["Partner pays VNPAY membership"]
    PayMembership --> MembershipActive["Membership becomes active after IPN success"]
    MembershipActive --> SubmitProduct["Partner creates product"]
    SubmitProduct --> ProductPending["Product moderation_status pending_review"]
    ProductPending --> ReviewProduct{"Admin approves product?"}
    ReviewProduct -- No --> RejectProduct["Set product rejected"]
    ReviewProduct -- Yes --> PublicProduct["Product appears in marketplace"]
    PublicProduct --> End([End])
    RejectPartner --> End
    RejectProduct --> End
```

### 2.5.4 Activity Diagram - VNPAY Subscription Payment

```mermaid
flowchart TD
    Start([Start]) --> SelectPlan["User selects scan plan"]
    SelectPlan --> CreatePayment["POST /user-payments/vnpay/create"]
    CreatePayment --> BuildURL["Backend creates signed VNPAY payment URL"]
    BuildURL --> OpenVNPAY["Mobile opens VNPAY browser"]
    OpenVNPAY --> UserPays{"Payment completed?"}
    UserPays -- No --> Pending["Transaction remains pending or failed"]
    UserPays -- Yes --> IPN["VNPAY calls backend IPN endpoint"]
    IPN --> VerifySignature{"Signature and amount valid?"}
    VerifySignature -- No --> Invalid["Mark transaction invalid"]
    VerifySignature -- Yes --> Activate["Activate or extend subscription"]
    Activate --> ResetQuota["Set daily scan quota according to plan"]
    ResetQuota --> Status["Mobile checks GET /user-payments/status/{txn_ref}"]
    Pending --> Status
    Invalid --> Status
    Status --> End([End])
```

## 2.6 Sequence Diagrams

### 2.6.1 Sequence Diagram - Complete Disease Diagnosis Flow

```mermaid
sequenceDiagram
    autonumber
    actor U as Farmer/User
    participant App as Mobile App
    participant API as FastAPI Backend
    participant Auth as JWT Dependency
    participant Quota as Subscription Service
    participant Img as Image Validation
    participant Model as ONNX Runtime
    participant Scope as Plant Scope Guard
    participant Stage as Stage Service
    participant DB as PostgreSQL

    U->>App: Capture or select leaf image
    App->>API: POST /api/v1/diagnose with Bearer JWT and multipart image
    API->>Auth: Validate JWT
    Auth-->>API: Current user
    API->>Quota: ensure_can_scan(user_id)
    Quota->>DB: Read subscription and scan quota
    DB-->>Quota: Quota status
    Quota-->>API: Allowed
    API->>API: Save upload file
    API->>Img: Validate leaf quality
    Img-->>API: Metrics and validation result
    alt Invalid image
        API-->>App: success=false with rejection reason
        App-->>U: Show guidance to rescan
    else Valid image
        API->>Model: Predict top classes
        Model-->>API: Top-k predictions
        API->>Scope: Validate confidence, margin, selected plant
        Scope-->>API: Scope result
        alt Scope rejected
            API-->>App: success=false low-confidence or out-of-scope message
        else Scope accepted
            API->>DB: Resolve disease by model_class_name
            API->>Stage: Infer stage and forecast 7 days
            Stage->>DB: Read user/plant scan history
            DB-->>Stage: Previous scan context
            Stage-->>API: Stage, forecast, treatment plan
            API->>DB: Insert scan_history and scan_consumption
            DB-->>API: Commit success
            API-->>App: Diagnosis response
            App-->>U: Show result, treatment, and chat entry
        end
    end
```

### 2.6.2 Sequence Diagram - JWT Authentication Flow When App Starts

```mermaid
sequenceDiagram
    autonumber
    participant App as Mobile App
    participant Store as Zustand Auth Store
    participant API as FastAPI Backend
    participant Auth as JWT Dependency
    participant DB as PostgreSQL

    App->>Store: Load persisted auth-storage
    Store-->>App: accessToken and user, if present
    alt Token missing
        App->>App: Render auth stack
    else Token exists
        App->>API: GET /api/v1/auth/me with Bearer JWT
        API->>Auth: Decode and verify JWT
        Auth->>DB: Find user by subject
        DB-->>Auth: User record
        Auth-->>API: Current user
        API-->>App: User profile
        App->>Store: Update user and isLoggedIn=true
        alt role is partner or dealer
            App->>App: Open PartnerChannel
        else farmer role
            App->>App: Open MainTabs
        end
    end
```

### 2.6.3 Sequence Diagram - RAG Chatbot Flow

```mermaid
sequenceDiagram
    autonumber
    actor U as Farmer/User
    participant App as Chat Screen
    participant API as Chat Router
    participant Auth as JWT Dependency
    participant RAG as RAG Service
    participant KB as disease_db.json
    participant Gemini as Gemini API

    U->>App: Ask disease-care question
    App->>API: POST /api/v1/chat/stream or /chat
    API->>Auth: Validate JWT
    Auth-->>API: Current user
    API->>RAG: Build context from disease key, confidence, history
    RAG->>KB: Retrieve disease chunks
    KB-->>RAG: Relevant context
    RAG->>Gemini: Generate answer with guarded prompt
    alt Streaming request
        Gemini-->>RAG: Partial tokens
        RAG-->>API: SSE chunks
        API-->>App: data chunks
        App-->>U: Append assistant response
    else Non-streaming request
        Gemini-->>RAG: Full answer
        RAG-->>API: Reply text
        API-->>App: JSON reply
        App-->>U: Show assistant response
    end
```

### 2.6.4 Sequence Diagram - VNPAY Payment And IPN Callback Flow

```mermaid
sequenceDiagram
    autonumber
    actor U as Farmer/User
    participant App as Mobile App
    participant API as FastAPI Backend
    participant Pay as VNPAY Service
    participant VNPAY as VNPAY
    participant DB as PostgreSQL

    U->>App: Select paid scan plan
    App->>API: POST /api/v1/user-payments/vnpay/create
    API->>Pay: Build signed payment URL
    Pay-->>API: Payment URL and transaction reference
    API->>DB: Insert user_payment_transactions pending
    DB-->>API: Commit
    API-->>App: payment_url, txn_ref
    App->>VNPAY: Open payment URL in browser
    U->>VNPAY: Complete payment
    VNPAY->>API: GET /api/v1/user-payments/vnpay/ipn
    API->>Pay: Verify secure hash
    Pay-->>API: Signature result
    alt Valid payment
        API->>DB: Mark transaction success
        API->>DB: Activate subscription and update scan quota
        API-->>VNPAY: RspCode 00
    else Invalid payment
        API->>DB: Mark transaction invalid or failed
        API-->>VNPAY: Error response code
    end
    App->>API: GET /api/v1/user-payments/status/{txn_ref}
    API->>DB: Read transaction
    DB-->>API: Current payment status
    API-->>App: Status and plan details
```

### 2.6.5 Sequence Diagram - Admin Moderation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant App as AdminModerationScreen
    participant API as FastAPI Backend
    participant Guard as require_admin
    participant DB as PostgreSQL
    participant Partner as Partner

    Admin->>App: Open moderation screen
    App->>API: GET /api/v1/admin/partners?status=pending_review
    API->>Guard: Check email in ADMIN_EMAILS
    Guard-->>API: Admin allowed
    API->>DB: Query partners
    DB-->>API: Pending partners
    API-->>App: Partner list

    App->>API: GET /api/v1/admin/products?status=pending_review
    API->>Guard: Check admin permission
    API->>DB: Query products
    DB-->>API: Pending products
    API-->>App: Product list

    Admin->>App: Approve or reject item
    App->>API: PATCH admin status endpoint
    API->>Guard: Check admin permission
    API->>DB: Update partner/product status
    DB-->>API: Commit success
    API-->>App: Updated record
    App-->>Partner: Result visible after refresh
```

## 2.7 User Interface And UX Design

### 2.7.1 Mobile Navigation Flow

```mermaid
flowchart TD
    Launch["App launch"] --> AuthState{"isLoggedIn?"}
    AuthState -- No --> Onboarding["Onboarding"]
    Onboarding --> Login["Login"]
    Onboarding --> Register["Register"]
    Login --> Forgot["ForgotPassword"]
    Register --> MainDecision{"Authenticated role?"}
    Login --> MainDecision

    AuthState -- Yes --> MainDecision
    MainDecision -- Partner or Dealer --> PartnerChannel["PartnerChannel"]
    MainDecision -- Farmer/User --> MainTabs["MainTabs"]

    MainTabs --> Home["Home"]
    MainTabs --> Garden["MyGarden"]
    MainTabs --> ScanTab["Scan"]
    MainTabs --> Marketplace["Marketplace"]
    MainTabs --> Profile["Profile"]

    Home --> Search["Search"]
    Home --> DiseaseDetail["DiseaseDetail"]
    Garden --> PlantDetail["PlantDetail"]
    Garden --> AddPlant["AddPlant"]
    PlantDetail --> EditPlant["EditPlant"]
    ScanTab --> Result["Result"]
    Result --> Chat["Chat"]
    Result --> DiseaseDetail
    Profile --> EditProfile["EditProfile"]
    Profile --> ChangePassword["ChangePassword"]
    Profile --> History["History"]
    Profile --> UpgradePlan["UpgradePlan"]
    Profile --> Privacy["PrivacyPolicy"]
    Profile --> Terms["TermsOfUse"]
    Marketplace --> PartnerStore["PartnerStore"]
    Marketplace --> PartnerProductDetail["PartnerProductDetail"]
    PartnerChannel --> AdminModeration["AdminModeration"]
```

### 2.7.2 Farmer Bottom Tab Navigation

```mermaid
flowchart LR
    MainTabs["Farmer MainTabs"] --> Home["Home tab<br/>Dashboard, tips, recent scans"]
    MainTabs --> Garden["Garden tab<br/>Plant CRUD and health summary"]
    MainTabs --> Scan["Scan center action<br/>Camera and gallery diagnosis"]
    MainTabs --> Marketplace["Marketplace tab<br/>Approved partner products"]
    MainTabs --> Profile["Profile tab<br/>Account, settings, security"]

    Home --> Tasks["Care tasks and care logs"]
    Garden --> PlantDetail["Plant detail and plant history"]
    Scan --> Result["Diagnosis result"]
    Result --> Chat["RAG chat"]
    Marketplace --> Store["Partner store detail"]
    Profile --> Upgrade["Subscription upgrade"]
```

### 2.7.3 Partner And Admin Navigation Extension

```mermaid
flowchart TD
    PartnerLogin["Partner login or partner role"] --> PartnerChannel["PartnerChannelScreen"]
    PartnerChannel --> ProfileForm["Store profile and review information"]
    PartnerChannel --> Documents["Logo, cover, business license uploads"]
    PartnerChannel --> PartnerPayment["VNPAY partner membership payment"]
    PartnerChannel --> ProductCRUD["Product create, update, delete, image upload"]
    ProductCRUD --> PendingReview["Products wait for admin approval"]

    AdminEntry["Admin route"] --> AdminModeration["AdminModerationScreen"]
    AdminModeration --> PartnerReview["Review pending partners"]
    AdminModeration --> ProductReview["Review pending products"]
    PartnerReview --> ApproveRejectPartner["Approve or reject partner"]
    ProductReview --> ApproveRejectProduct["Approve or reject product"]
```

## 2.8 AI Model Design

### 2.8.1 EfficientNetV2-S Training And Export Pipeline

```mermaid
flowchart TD
    Dataset["PlantVillage 38-class dataset"] --> Split["Train/validation split"]
    Split --> Preprocess["Resize, crop, normalize, augment"]
    Preprocess --> Backbone["EfficientNetV2-S backbone"]
    Backbone --> FineTune["Fine-tune classifier head and selected layers"]
    FineTune --> Checkpoint["Save best PyTorch checkpoint .pth"]
    Checkpoint --> Evaluate["Evaluate accuracy and confusion patterns"]
    Evaluate --> Export["Export to ONNX"]
    Export --> ValidateONNX["Validate ONNX batch inference"]
    ValidateONNX --> Calibration["Optional temperature scaling calibration.json"]
    Calibration --> DeployArtifact["Deploy model artifact through MODEL_PATH"]
```

### 2.8.2 Backend Inference Pipeline

```mermaid
flowchart TD
    Upload["POST /api/v1/diagnose image upload"] --> FileGuard["MIME, extension, size validation"]
    FileGuard --> Save["Save uploaded image"]
    Save --> LeafGuard["Leaf validation: green ratio, brightness, blur, component density"]
    LeafGuard --> IsLeaf{"Leaf accepted?"}
    IsLeaf -- No --> Reject["Return success=false with guidance"]
    IsLeaf -- Yes --> Preprocess["Center crop, resize 224x224, ImageNet normalization"]
    Preprocess --> BackendChoice{"Model backend available?"}
    BackendChoice -- ONNX --> ONNX["ONNX Runtime inference with TTA flip"]
    BackendChoice -- TFLite --> TFLite["TFLite interpreter inference"]
    BackendChoice -- Missing --> Heuristic["Deterministic heuristic fallback"]
    ONNX --> Softmax["Temperature-scaled softmax"]
    TFLite --> Softmax
    Heuristic --> Softmax
    Softmax --> TopK["Top-k predictions"]
    TopK --> Scope["Plant-scope validation: top-1 confidence, margin, top-5 same-plant count"]
    Scope --> ScopeOK{"Scope accepted?"}
    ScopeOK -- No --> Reject
    ScopeOK -- Yes --> DiseaseMap["Map model_class_name to disease record"]
    DiseaseMap --> Stage["Infer current stage and 7-day forecast"]
    Stage --> Treatment["Select treatment plan by stage"]
    Treatment --> Persist["Persist scan_history and scan_consumption"]
    Persist --> Response["Return diagnosis response"]
```

## 2.9 System Security Design

### 2.9.1 Security Architecture

```mermaid
flowchart TB
    Mobile["Mobile App"] -->|HTTPS REST| API["FastAPI Backend"]

    subgraph Identity["Identity And Access"]
        RegisterLogin["Register/Login"]
        JWT["JWT access token"]
        Google["Google OAuth ID token verification"]
        AdminAllowlist["ADMIN_EMAILS allowlist"]
    end

    subgraph CredentialSecurity["Credential Security"]
        Bcrypt["SHA-256 prehash + bcrypt"]
        OTP["Password reset OTP hash and expiration"]
        SMTP["SMTP Mail Server"]
    end

    subgraph RuntimeProtection["Runtime Protection"]
        RateLimit["In-process rate limiting"]
        UploadValidation["File and leaf-image validation"]
        CORS["CORS configuration"]
        RequestID["Request logging with X-Request-ID"]
    end

    subgraph SecretOps["Secret And Deployment Operations"]
        Env[".env and environment variables"]
        Gitignore["Gitignored secrets, uploads, models"]
        Scanner["scripts/scan_secrets.sh"]
        Docker["Docker and Render env vars"]
    end

    API --> RegisterLogin
    RegisterLogin --> JWT
    RegisterLogin --> Bcrypt
    RegisterLogin --> Google
    RegisterLogin --> OTP
    OTP --> SMTP
    API --> RateLimit
    API --> UploadValidation
    API --> CORS
    API --> RequestID
    API --> AdminAllowlist
    API --> Env
    Env --> Gitignore
    Gitignore --> Scanner
    Env --> Docker
```

### 2.9.2 Threat And Control Map

```mermaid
mindmap
  root((Security Threats And Controls))
    Account takeover
      Bcrypt password hashing
      JWT expiration
      Password reset OTP expiration
      Google ID token verification
    Brute force
      Rate limit login
      Rate limit OTP
      Rate limit chat
    Unauthorized admin access
      ADMIN_EMAILS allowlist
      require_admin dependency
      Bearer JWT required
    Invalid or malicious uploads
      MIME and extension validation
      Max file size
      Leaf image validation
      Upload cleanup CLI
    Secret leakage
      Gitignore .env files
      Secret scanner
      History rewrite documentation
      Render dashboard secret variables
    AI misuse or overconfidence
      Low-confidence rejection
      Plant-scope guard
      Safety notice in treatment output
      Chat prompt downgrade for low confidence
```

## Chapter 3 Application Implementation And Evaluation

### 3.1 Development Environment And Tools Setup

```mermaid
flowchart LR
    Dev["Developer Workstation"] --> BackendEnv["Python 3.12 virtualenv"]
    Dev --> MobileEnv["Node.js, npm, Expo CLI"]
    Dev --> DB["PostgreSQL"]
    Dev --> ModelArtifacts["ONNX/PyTorch model artifacts"]

    BackendEnv --> FastAPI["FastAPI + Uvicorn"]
    BackendEnv --> Pytest["Pytest + Hypothesis"]
    BackendEnv --> SQLAlchemy["SQLAlchemy"]
    BackendEnv --> ONNXRuntime["ONNX Runtime"]

    MobileEnv --> Expo["Expo SDK 54"]
    MobileEnv --> RN["React Native 0.81"]
    MobileEnv --> TypeScript["TypeScript"]
    MobileEnv --> Zustand["Zustand"]

    Dev --> Git["Git"]
    Git --> SecretScanner["scripts/scan_secrets.sh"]
    Git --> Docker["backend/Dockerfile"]
    Docker --> Render["backend/render.yaml"]
```

### 3.2 Backend Implementation Modules

```mermaid
flowchart TB
    Backend["backend/app"] --> Main["main.py<br/>FastAPI app, CORS, router registration, uploads mount"]
    Backend --> Config["config.py<br/>Env and thresholds"]
    Backend --> Database["database.py<br/>SQLAlchemy engine, schema ensure, seed"]
    Backend --> Models["models/domain.py<br/>Database tables"]
    Backend --> Schemas["schemas/<br/>Pydantic contracts"]
    Backend --> Routers["routers/<br/>REST endpoints"]
    Backend --> Services["services/<br/>AI, RAG, treatment, payment, email"]
    Backend --> Dependencies["dependencies/<br/>JWT, admin, rate limit"]
    Backend --> Utils["utils/security.py<br/>bcrypt and JWT"]

    Routers --> Auth["auth.py"]
    Routers --> Diagnosis["diagnosis.py"]
    Routers --> Plants["plants.py"]
    Routers --> History["history.py"]
    Routers --> Diseases["diseases.py"]
    Routers --> Chat["chat.py"]
    Routers --> Home["home.py"]
    Routers --> Partners["partners.py"]
    Routers --> Subscriptions["subscriptions.py"]

    Services --> ModelService["model_service.py"]
    Services --> RAG["rag_service.py"]
    Services --> Stage["stage_service.py"]
    Services --> VNPAY["vnpay_service.py"]
    Services --> Email["email_service.py"]
```

### 3.3 Mobile Implementation Modules

```mermaid
flowchart TB
    Mobile["leafscan-ai"] --> App["App.tsx"]
    App --> Navigation["navigation/<br/>AppNavigator and BottomTabNavigator"]
    App --> Theme["theme/<br/>ThemeProvider and theme tokens"]
    App --> I18N["i18n/<br/>vi/en resources"]

    Mobile --> Screens["screens/"]
    Screens --> AuthScreens["Login, Register, ForgotPassword"]
    Screens --> MainScreens["Home, MyGarden, Scan, History, Profile"]
    Screens --> ResultScreens["Result, DiseaseDetail, Chat"]
    Screens --> PartnerScreens["Marketplace, PartnerChannel, AdminModeration"]
    Screens --> AccountScreens["EditProfile, ChangePassword, UpgradePlan"]

    Mobile --> Components["components/"]
    Components --> HomeComponents["home components"]
    Components --> GardenComponents["garden components"]
    Components --> ScanComponents["scan components"]
    Components --> ProfileComponents["profile components"]

    Mobile --> Stores["stores/"]
    Stores --> AuthStore["authStore"]
    Stores --> PlantsStore["plantsStore"]
    Stores --> HistoryStore["historyStore"]
    Stores --> SettingsStore["settingsStore"]

    Mobile --> API["api/"]
    API --> Client["client.ts"]
    API --> AuthAPI["auth, google-auth, account"]
    API --> DomainAPI["diagnosis, plants, history, diseases, home, chat"]
    API --> CommerceAPI["marketplace, subscription"]
```

### 3.4 Testing And Quality Assurance Pipeline

```mermaid
flowchart LR
    Code["Source code"] --> SecretScan["bash scripts/scan_secrets.sh"]
    Code --> BackendTests["backend: pytest tests/"]
    Code --> MobileTypecheck["mobile: npm run lint (tsc --noEmit)"]
    Code --> ManualModelTests["manual AI scripts in backend/scripts"]
    Code --> CleanupDryRun["cleanup_uploads.py --dry-run"]

    BackendTests --> AuthTests["Auth endpoint tests"]
    BackendTests --> HomeTests["Home dashboard tests"]
    BackendTests --> MarketplaceTests["Partner marketplace and VNPAY tests"]
    BackendTests --> SubscriptionTests["User subscription and quota tests"]
    BackendTests --> ScannerTests["Secret scanner property tests"]
    BackendTests --> CleanupTests["Upload cleanup CLI tests"]

    SecretScan --> QualityGate["Quality gate before push"]
    BackendTests --> QualityGate
    MobileTypecheck --> QualityGate
    CleanupDryRun --> QualityGate
    ManualModelTests --> Evaluation["Model and API evaluation evidence"]
```

### 3.5 Deployment Architecture

```mermaid
flowchart TB
    Repo["GitHub Repository"] --> RenderBlueprint["backend/render.yaml"]
    RenderBlueprint --> WebService["Render Web Service<br/>Docker runtime"]
    RenderBlueprint --> ManagedDB["Render PostgreSQL"]
    WebService --> Dockerfile["backend/Dockerfile"]
    Dockerfile --> Runtime["Uvicorn FastAPI runtime"]
    Runtime --> ManagedDB
    Runtime --> Env["Render environment variables"]
    Runtime --> Uploads["Container uploads directory"]
    Runtime --> External["Gemini API, SMTP, Google OAuth, VNPAY"]

    MobileBuild["Expo mobile app"] --> PublicAPI["EXPO_PUBLIC_API_BASE_URL"]
    PublicAPI --> WebService

    Env --> Secrets["SECRET_KEY, DATABASE_URL, GEMINI_API_KEY, SMTP, GOOGLE_CLIENT_ID, VNPAY"]
    Env --> ModelPath["MODEL_PATH for deployed model artifact"]
```
