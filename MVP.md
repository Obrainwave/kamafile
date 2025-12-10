📘 MVP IMPLEMENTATION GUIDE (V1.0)
Nigeria Smart Tax Assistant – WhatsApp + Web MVP
A technical working document for the founding team & tech lead
(Focused, build-ready, and aligned with Blueprint v2.2)
________________________________________
1. MVP PURPOSE & SCOPE
This MVP aims to validate:
•	user demand
•	segmentation accuracy
•	conversational tax logic
•	WhatsApp usability
•	early web dashboard utility
•	document OCR relevance
It covers Level 1 (Individuals) and light Level 2 (Freelancers/Sole Traders).
SME features and the marketplace come later.
________________________________________
2. CHANNEL OVERVIEW (MVP)
2.1 WhatsApp – Primary MVP Channel
Identity = phone number
No login
Conversation-first
Zero friction
Stores light profile data
Used for:
•	onboarding
•	tax Q&A
•	guidance
•	checklists
•	reminders
•	document uploads
•	OCR categorization
•	redirect to web for advanced use
________________________________________
2.2 Web App – Secondary MVP Channel
Account creation via phone OTP
PIN for sensitive actions
Used for:
•	seeing saved documents
•	viewing tax calendar
•	viewing income streams
•	small dashboard
•	exporting/checking filing readiness
•	subscription/upgrade
________________________________________
3. CORE MODES OF THE SYSTEM
3.1 ENQUIRY MODE (default)
No profile needed
General tax questions only
No memory beyond 1-hour context
No personalised rules
No storage
No filing logic
No reminders
Triggers: generic questions
“What is VAT?”
“How does PAYE work?”
________________________________________
3.2 PROFILE MODE (opt-in)
Full personalised experience:
•	segmentation
•	state rules
•	income categorisation
•	PIT/VAT/WHT logic
•	form-mapped guidance
•	document OCR + tagging
•	reminders
•	dashboard sync
Triggers:
“I’m a freelancer.”
“I want to calculate my tax.”
“I want reminders.”
“I want to upload my payslip.”
________________________________________
4. MVP USER FLOWS
________________________________________
4.1 WhatsApp Flow (Detailed)
A. Entry
User clicks WhatsApp link → bot greets:
Welcome! I’m your Tax Assistant 🤝  
I can answer general tax questions or personalise guidance for your income.  
Would you like general info or personalised help?
1. General info  
2. Personalised help
If user picks “General info” → Enquiry Mode
If user picks “Personalised help” → onboarding
________________________________________
B. Enquiry Mode Flow
User asks general questions:
•	“What is PIT?”
•	“How does VAT work?”
•	“Explain PAYE.”
Bot answers using RAG + global tax KB.
After 2–3 answers, bot offers upgrade:
If you’d like guidance based on YOUR income and state, I can set up your profile.  
Ready?
If “No” → stay in enquiry mode.
________________________________________
C. Profile Mode Onboarding (60 seconds)
Flow:
1.	Income type
2.	Multi-income check
3.	State of residence/work
4.	Invoicing (freelancers/business)
5.	Staff count (business)
6.	Pension status (optional)
Backend stores tags:
UserType, IncomeStructure, EntityType, State, TaxComplexity
________________________________________
D. Personalised Interaction (Post-Onboarding)
For Individuals / Pensioners (Level 1)
Bot offers:
•	PIT guidance
•	Payslip interpretation
•	State-specific PAYE
•	Simple deductions
•	Reminders
________________________________________
For Freelancers / Sole Traders (Light Level 2)
Bot activates:
•	VAT applicability test
•	WHT detection
•	multi-income categorisation
•	expense tagging
•	OCR for receipts
•	PIT estimation
•	VAT002 checklist
Upgrade trigger:
To save your documents & see your tax calendar, open your secure dashboard → [Web Link].
________________________________________
E. Document Upload Flow (WhatsApp)
User sends photo/PDF → backend OCR
Outputs:
•	amount
•	date
•	category
•	mapped tax relevance (PIT expense/WHT/invoice/VAT logic)
Bot:
I’ve extracted ₦6,200 → Transport expense.  
Added to your 2025 tax year.  
View on your dashboard: [Link]
________________________________________
F. Reminder Flow
Triggered by user profile:
•	PIT deadlines
•	VAT filing dates
•	WHT remittance
•	“Upload missing items”
________________________________________
4.2 Web App Flow (Detailed)
A. Landing Page
Sections:
•	Value proposition
•	Start on WhatsApp (primary CTA)
•	Explore Dashboard (secondary CTA)
________________________________________
B. Dashboard Login
Phone number → OTP
Create 4-digit PIN
Auto-load profile from WhatsApp
________________________________________
C. Dashboard Home
Shows:
•	User type
•	Filing progress %
•	Upcoming deadlines
•	Missing documents
•	Quick actions
________________________________________
D. Income Streams
Add income manually
(only salary + simple freelance in MVP)
________________________________________
E. Document Vault
Uploaded images/PDFs via WhatsApp or Web
OCR summary
Category tagging
Delete/edit
________________________________________
F. Tax Calendar
Shows:
•	PIT deadlines
•	simple VAT reminders
•	WHT reminders
Export to Google/Apple calendar
________________________________________
G. Filing Readiness Summary
Based on FIRS/State form mapping rules:
•	“Your PIT return is 60% complete”
•	Missing fields checklist
•	Download summary PDF
•	(Future: Submit to human consultant)
________________________________________
5. SEGMENTATION ENGINE (MVP VERSION)
Segments by:
•	Individual
•	Pensioner
•	Freelancer
•	Sole trader
•	Micro-business owner (< 3 staff)
Each segment maps internally to FIRS/State form sets:
•	Individual → Form A
•	Self-employed → H1/H2
•	VAT applicability → VAT002
•	WHT (freelancer/business) → WHT schedule
This is NOT visible to the user but drives guidance logic.
________________________________________
6. SESSION MANAGEMENT (MVP)
________________________________________
6.1 Session States
Each user has one of three states:
1. Enquiry Mode
ProfileStatus = “enquiry”
•	General info only
•	No memory
2. Profile Active
ProfileStatus = “active”
•	segmentation
•	stored data
•	reminders
3. Profile Incomplete
ProfileStatus = “incomplete”
Bot prompts user:
Would you like to finish setting up your profile or continue with general questions?
________________________________________
6.2 Shared Device Handling
WhatsApp: safe (phone tied)
Web: protect with
•	OTP login
•	4-digit PIN for sensitive screens
•	auto logout after 10 minutes
________________________________________
6.3 Mode Switching Rules
If user in enquiry mode asks personal questions:
Bot offers switch:
I can answer based on your exact situation.  
Start your 60-second profile now?
If user declines → stay in enquiry.
________________________________________
7. BACKEND REQUIREMENTS (MVP)
User Table
•	phone
•	ProfileStatus
•	tags (UserType, State, IncomeType…)
•	created_at
•	updated_at
OCR Service
•	extract amount/date
•	extract merchant name
•	map category
•	map tax relevance
Segmentation Engine
Produces:
•	Form requirements
•	reminders
•	calculators available
RAG Engine (Light)
Sources:
•	general Nigerian tax rules
•	PIT overview
•	VAT basics
•	PAYE basics
(No deep filing logic yet.)
________________________________________
8. MVP FEATURE LIST (Build Order)
SPRINT 1 – WhatsApp Basic Assistant
•	enquiry mode
•	basic RAG
•	segmentation onboarding
•	user profile table
•	personalised guidance
•	PAYE/PIT logic
SPRINT 2 – OCR & Document Handling
•	WhatsApp upload
•	OCR extraction
•	category tagging
•	document vault (web)
SPRINT 3 – Web Dashboard (Basic)
•	OTP login
•	PIN
•	homepage widgets
•	document list
•	tax calendar
SPRINT 4 – Filing Readiness
•	form-mapping engine (H1/H2/A minimal)
•	checklist
•	progress bar
•	summary PDF
________________________________________
9. OUT OF SCOPE FOR MVP
•	SME dashboard
•	VAT002 full automation
•	WHT schedule generator
•	Human consultant marketplace
•	Payments
•	Subscription system
•	API integration with FIRS/State systems
•	Payroll logic
•	Bank statement parsing
•	Multi-year history
These will come in later phases.

