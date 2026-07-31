# ERP/CRM System — Product Requirement Document (PRD)

## 1. Product Overview

| Field | Value |
|---|---|
| **Product Name** | OperoERP |
| **Product Type** | Small Business ERP + CRM Platform |

### Purpose

Build a modern ERP/CRM system that helps small and medium businesses manage:

- Customer relationships
- Sales processes
- Products
- Inventory
- Purchasing
- Finance
- Internal operations

The project goal is both:

1. Build a usable business application
2. Learn enterprise software architecture and business workflows

---

## 2. Problem Statement

Small businesses often manage operations using:

- Excel spreadsheets
- Multiple disconnected tools
- Manual approvals
- Paper documents
- Messaging applications

This creates problems:

- Duplicate data entry
- Lost information
- Lack of visibility
- Difficult reporting
- Slow decision making

The system should provide a **centralized platform**.

---

## 3. Target Users

### Primary Users

**Admin / Owner**
- Business overview
- Financial visibility
- User management
- Reports

**Sales Representative**
- Manage customers
- Track leads
- Create quotations
- Follow up opportunities

**Sales Manager**
- Approve quotations
- Monitor sales performance
- Manage team pipeline

**Warehouse Staff**
- Manage stock
- Receive products
- Deliver products

**Accountant**
- Manage invoices
- Track payments
- Generate financial reports

---

## 4. Product Goals

### MVP Goal

Enable a small business to manage the following flow, with basic reporting:

```
Customer → Quotation → Sales Order → Invoice → Payment
```

---

## 5. MVP Scope

### Included

#### Authentication
- User login
- User registration
- Password management

#### Organization Management
- Company profile
- Departments
- Users

#### CRM — Customer Management

Users can:
- Create customers
- Edit customers
- View customer history
- Add notes

**Customer fields:**
- Company name
- Contact person
- Email
- Phone
- Address
- Tax ID
- Notes

#### Product Management

Users can:
- Create products
- Update products
- Manage pricing

**Product fields:**
- SKU
- Name
- Category
- Cost
- Selling price
- Active status

#### Sales Module

**Quotation**

Features:
- Create quotation
- Add products
- Apply discount
- Apply tax
- Generate PDF

Status flow: `Draft → Sent → Accepted / Rejected`

**Sales Order**

Created from a quotation.

Status: `Pending → Processing → Completed / Cancelled`

**Invoice**

Generated from a sales order.

Status: `Draft → Issued → Paid / Overdue / Cancelled`

#### Dashboard

Displays:
- Total customers
- Revenue
- Open quotations
- Pending invoices
- Recent activities

### Out of Scope (MVP)

Do **NOT** build:

- ❌ Accounting system
- ❌ Payroll
- ❌ Manufacturing
- ❌ Mobile app
- ❌ AI features
- ❌ Workflow builder
- ❌ Multi-company
- ❌ Advanced inventory

---

## 6. Future Versions

### V1

**Inventory**
- Warehouse
- Stock quantity
- Stock movement
- Stock adjustment

**Purchasing**
- Vendors
- Purchase orders
- Goods receiving

**Workflow**
- Approval system
- Manager approval

**Notifications**
- Email
- In-app notifications

### V2

**Finance**
- Chart of accounts
- Accounting entries
- AR/AP

**Advanced CRM**
- Lead pipeline
- Sales forecast
- Activities

**Automation** (example)

```
New customer created → Assign salesperson → Create follow-up task
```

---

## 7. Core Business Workflow

### Sales Flow

```
Lead → Customer → Quotation → Approval → Sales Order → Delivery → Invoice → Payment
```

---

## 8. Non-Functional Requirements

**Security**
- Role-based access control
- Password hashing
- Audit logs

**Performance** — system should support:
- 100 users
- 10,000 customers
- 100,000 transactions

**Availability**
- Automated backup
- Error logging
- Monitoring

**Usability**
- Responsive UI
- Search everywhere
- Clear navigation

---

## 9. Success Criteria

MVP is successful when a small company can:

- ✅ Create customers
- ✅ Create products
- ✅ Create quotations
- ✅ Convert quotations to orders
- ✅ Generate invoices
- ✅ View business dashboard

---

## 10. Product Direction (Locked)

| Decision | Choice |
|---|---|
| **Target Business Type** | General SME (Odoo-style, industry-agnostic) |
| **Business Complexity** | Realistic SME |
| **Main Learning Goal** | System Design + Full-stack |

**Implications of "General SME + Realistic SME":**

This is the hardest combination of the available options, not the easiest — a general/industry-agnostic scope means no domain-specific shortcuts (e.g. no assuming everything has stock, or that there's no approval chain). Realistic complexity means the following can't be hand-waved:

- Multi-step approvals (e.g. quotation → manager approval → order)
- Proper audit trails, not just CRUD timestamps
- Role-based permissions enforced at both UI and API level
- Correctness under concurrency (invoice numbering, stock quantities, payment reconciliation)

The MVP scope in Section 5 is unchanged — this only affects how rigorously each piece is built.

---

## 11. Architecture Direction

Decisions made to serve the system-design learning goal:

### Modular Monolith
Build as a single deployable service with clear internal module boundaries (CRM, Sales, and later Inventory, Finance) rather than true microservices. Microservices would over-engineer a solo/learning project and slow full-stack iteration speed. Module boundaries are enforced in code structure even though everything ships together.

### Domain Boundaries Enforced Early
Modules interact through defined interfaces, not by reaching into each other's internals — e.g. Sales should not query Inventory's tables directly once Inventory exists in V1. Establishing this discipline now avoids a costly retrofit later.

### Status Flows as First-Class State Machines
Quotation, Sales Order, and Invoice status transitions are the most valuable system-design exercise in this app. Model them explicitly as a status transition table (who can transition what, from which state, with what side effects) rather than scattering conditional checks across the codebase.

### Audit Logging as Infrastructure
Since audit logs are a stated non-functional requirement, decide the mechanism up front rather than retrofitting it:
- **Option A:** Lightweight — `created_by` / `updated_by` / `updated_at` fields plus a dedicated changelog table for key entities.
- **Option B:** Event-sourced-ish — log every mutation as an event, derive current state from the event log.

(To be decided — Option A is the pragmatic default for MVP; Option B is a good V1/V2 stretch exercise if the learning goal leans toward deeper system design.)

---

## 12. Next Step

Convert this PRD into Plane **Epics → User Stories → Tasks**, using:
- Section 5 (MVP Scope) as the epic boundary for MVP
- Section 6 (Future Versions) as the epic boundary for V1/V2
- Section 11 (Architecture Direction) as constraints applied across all epics