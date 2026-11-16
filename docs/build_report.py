from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os
R = os.path.dirname(os.path.abspath(__file__))
D = Document()
NAVY = RGBColor(0x0B,0x1D,0x3A); AMBER = RGBColor(0xB4,0x6A,0x00)
st = D.styles['Normal']; st.font.name='Calibri'; st.font.size=Pt(11)
st.element.rPr.rFonts.set(qn('w:eastAsia'),'Calibri')
st.paragraph_format.space_after=Pt(6); st.paragraph_format.line_spacing=1.12
for n,s,c in (('Heading 1',20,NAVY),('Heading 2',14,NAVY),('Heading 3',12,AMBER)):
    h=D.styles[n]; h.font.name='Calibri'; h.font.size=Pt(s); h.font.bold=True; h.font.color.rgb=c
    h.element.rPr.rFonts.set(qn('w:eastAsia'),'Calibri')
    h.paragraph_format.space_before=Pt(14 if n!='Heading 1' else 0); h.paragraph_format.space_after=Pt(6)
sec=D.sections[0]
sec.page_width=Inches(8.27); sec.page_height=Inches(11.69)
for m in ('left_margin','right_margin'): setattr(sec,m,Inches(1))
sec.top_margin=Inches(0.9); sec.bottom_margin=Inches(0.9)

def shade(cell,hexc):
    tcPr=cell._tc.get_or_add_tcPr(); s=OxmlElement('w:shd')
    s.set(qn('w:val'),'clear'); s.set(qn('w:color'),'auto'); s.set(qn('w:fill'),hexc); tcPr.append(s)
def P(t='',b=False,i=False,al=None,size=None,color=None,style=None):
    p=D.add_paragraph(style=style); r=p.add_run(t); r.bold=b; r.italic=i
    if size: r.font.size=Pt(size)
    if color: r.font.color.rgb=color
    if al=='c': p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    if al=='j': p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
    return p
def J(t): return P(t,al='j')
def B(items):
    for t in items:
        p=D.add_paragraph(style='List Bullet')
        if '::' in t:
            a,b=t.split('::',1); r=p.add_run(a); r.bold=True; p.add_run(b)
        else: p.add_run(t)
def H1(t): D.add_page_break(); D.add_heading(t,1)
def H2(t): D.add_heading(t,2)
def H3(t): D.add_heading(t,3)
def T(head,rows,widths=None,fs=9.5):
    t=D.add_table(rows=1,cols=len(head)); t.style='Table Grid'; t.alignment=WD_TABLE_ALIGNMENT.CENTER
    for i,h in enumerate(head):
        c=t.rows[0].cells[i]; c.text=''; r=c.paragraphs[0].add_run(h); r.bold=True; r.font.size=Pt(fs); r.font.color.rgb=RGBColor(255,255,255); shade(c,'0B1D3A')
    for k,row in enumerate(rows):
        cs=t.add_row().cells
        for i,v in enumerate(row):
            cs[i].text=''; r=cs[i].paragraphs[0].add_run(str(v)); r.font.size=Pt(fs)
            if k%2: shade(cs[i],'F1F4F9')
    if widths:
        for row in t.rows:
            for i,w in enumerate(widths): row.cells[i].width=Inches(w)
    D.add_paragraph().paragraph_format.space_after=Pt(2)
def IMG(path,w,cap):
    D.add_paragraph().alignment=WD_ALIGN_PARAGRAPH.CENTER
    D.paragraphs[-1].add_run().add_picture(os.path.join(R,path),width=Inches(w))
    D.paragraphs[-1].alignment=WD_ALIGN_PARAGRAPH.CENTER
    P(cap,i=True,al='c',size=9.5)
def CODE(t):
    p=D.add_paragraph(); r=p.add_run(t); r.font.name='Consolas'; r.font.size=Pt(8.5)
    r._element.rPr.rFonts.set(qn('w:eastAsia'),'Consolas')
    pPr=p._p.get_or_add_pPr(); s=OxmlElement('w:shd'); s.set(qn('w:val'),'clear'); s.set(qn('w:fill'),'EEF1F6'); pPr.append(s)
    p.paragraph_format.space_after=Pt(8)
def PLACE(t):
    tb=D.add_table(rows=1,cols=1); tb.style='Table Grid'; c=tb.rows[0].cells[0]; shade(c,'FFF4D6'); c.text=''
    r=c.paragraphs[0].add_run(t); r.italic=True; r.font.size=Pt(10)
    D.add_paragraph()
def field(par,instr):
    r=par.add_run(); a=OxmlElement('w:fldChar'); a.set(qn('w:fldCharType'),'begin'); r._r.append(a)
    r2=par.add_run(); it=OxmlElement('w:instrText'); it.set(qn('xml:space'),'preserve'); it.text=instr; r2._r.append(it)
    r3=par.add_run(); e=OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'),'end'); r3._r.append(e)
# footer page number
fp=sec.footer.paragraphs[0]; fp.alignment=WD_ALIGN_PARAGRAPH.CENTER
x=fp.add_run('AeroClaim - Parametric Travel & Flight Delay Claims   |   Page '); x.font.size=Pt(9)
field(fp,'PAGE')
sec.different_first_page_header_footer=True

# ---------- PAGE 1 title ----------
for _ in range(3): P()
P('SRM INSTITUTE OF SCIENCE AND TECHNOLOGY',b=True,al='c',size=14,color=NAVY)
P('Department of Data Science and Business Systems',al='c',size=11)
P('Workflow Automation Engineering - Final Project',al='c',size=11)
for _ in range(3): P()
P('Parametric Travel & Flight Delay Claims',b=True,al='c',size=30,color=NAVY)
P('(Inspired by Helvetia)',al='c',size=16,color=AMBER)
P()
P('AeroClaim: automated payouts orchestrated with Camunda 8, Spring Boot and React',i=True,al='c',size=13)
P('Technical Documentation and Project Report',b=True,al='c',size=14)
for _ in range(3): P()
T(['Field','Details'],[
 ['Student','Harshinee Laxmi'],['Register number','RA2411056010167'],['Section','AQ1 DSBS'],
 ['Team members','[Add group member names and register numbers]'],
 ['Course','Workflow Automation Engineering'],['Submission','Final report - 18 November 2026']],widths=[1.8,4.2],fs=11)

# ---------- PAGE 2 TOC + abstract ----------
D.add_page_break()
D.add_heading('Table of Contents',1)
toc=[('1  Executive Summary and Business Use Case','3'),('   1.1 Problem statement','3'),('   1.2 Proposed solution and scope','3'),('   1.3 Business value and success metrics','4'),
('2  BPMN Architecture and Failure Handling','5'),('   2.1 Main process','5'),('   2.2 Child processes and multi-instance','6'),('   2.3 Failure handling: error and timer boundaries','7'),('   2.4 FEEL and variable mapping dictionary','8'),
('3  System Architecture and Tech Stack','9'),('   3.1 Logical architecture','9'),('   3.2 Technology stack','10'),('   3.3 Backend design','10'),('   3.4 Frontend design','11'),
('4  Data Contracts and API Dictionary','12'),('   4.1 Request and response contracts','12'),('   4.2 Job worker contracts','13'),('   4.3 REST API dictionary','13'),('   4.4 Persistence model','14'),
('5  Dockerization and Deployment','15'),('   5.1 Container topology','15'),('   5.2 Configuration and secrets','15'),('   5.3 Build and run procedure','16'),('   5.4 Deployment notes','16'),
('6  Testing and Verification Evidence','17'),('   6.1 Test strategy','17'),('   6.2 Scenario results','17'),('   6.3 User interface evidence','18'),('   6.4 Camunda Operate evidence and logs','19'),
('7  Individual Contributions and Conclusion','20'),('   7.1 Team contributions','20'),('   7.2 Challenges','20'),('   7.3 Conclusion','20'),('   7.4 Future work','20')]
import json
PG=json.load(open('/tmp/pages.json')) if os.path.exists('/tmp/pages.json') else {}
tb=D.add_table(rows=0,cols=2)
for a,b in toc:
    k=a.strip().split(' ')[0]; k=k+'.1' if len(k)==1 else k; b=str(PG.get(k,b))
    c=tb.add_row().cells; c[0].width=Inches(5.4); c[1].width=Inches(0.6)
    r=c[0].paragraphs[0].add_run(a); r.font.size=Pt(9); r.bold=not a.startswith('   ')
    r=c[1].paragraphs[0].add_run(b); r.font.size=Pt(9); c[1].paragraphs[0].alignment=WD_ALIGN_PARAGRAPH.RIGHT
    for cc in c: cc.paragraphs[0].paragraph_format.space_after=Pt(0)
D.add_paragraph()
D.add_heading('Abstract',2)
J('Flight delays are a frequent, objectively measurable event, yet traditional travel insurance still asks travelers to document the loss and wait weeks for a loss adjuster. Parametric insurance replaces that process with a trigger: when verified flight data crosses a threshold, a pre-agreed payout is made. This report documents AeroClaim, a complete workflow-automation solution for parametric flight-delay claims inspired by Helvetia. The solution orchestrates the claim lifecycle in Camunda 8.9 using one main BPMN process and two reusable child processes, a DMN payout table and Camunda Forms for human steps. A Spring Boot 4.0 backend exposes REST APIs, persists claims with JPA and implements strongly typed job workers. A React portal provides a dynamic claim builder, a custom Tasklist inbox and a live process tracker. Everything is packaged with Docker Compose. The report explains the architecture, the failure-handling design, the data contracts, the deployment and the verification evidence.')

# ---------- CH1 ----------
H1('1  Executive Summary and Business Use Case')
H2('1.1 Problem statement')
J('A delayed or cancelled flight is one of the most common travel disruptions. Conventional travel insurance is indemnity based: the traveler must collect boarding passes, receipts and airline letters, submit them, and wait for an adjuster to assess the loss. The process is slow (often weeks), expensive for the insurer (manual handling dominates the cost of a small claim) and frustrating for the customer at the moment they need help most.')
J('Parametric insurance changes the question from "how much did you lose?" to "did the agreed event happen?". For flight delays the event is objective and available from flight-data providers: scheduled versus actual departure, or a cancellation flag. Helvetia and other insurers have begun offering products of this kind. The business challenge is therefore not pricing, but orchestration: a claim must be validated, checked for fraud, verified against external data for possibly several flights, converted to a payout, optionally reviewed by humans when the amount or the risk is high, and paid to every insured traveler, with every failure handled gracefully.')
H2('1.2 Proposed solution and scope')
J('AeroClaim automates this end to end. A policyholder files a claim through the web portal by entering the policy number, one or more flights and one or more insured travelers. The backend stores the claim and starts the Camunda process parametric-claim-main. From there the process runs by itself:')
B(['Registration and checks::  the claim is registered, then policy validation and fraud scoring run in parallel.',
'Flight verification::  one child process instance per flight runs in parallel. Each calls the flight data provider through the REST connector and applies the DMN tier table.',
'Assessment::  the longest verified delay decides the payout tier (25, 50, 75 or 100 percent of the benefit per traveler). If no flight reaches the threshold the claim is closed and the customer is informed by e-mail.',
'Four-eyes review::  payouts of CHF 500 or more, or a fraud score of 60 or more, require two sequential approvals (claims handler, then senior reviewer).',
'Settlement::  one payout child process per traveler, sequentially, using the REST connector for the bank transfer and the Email connector for the receipt.',
'Exceptions::  a declined payment raises a business error caught by an error boundary and routed to finance; a slow bank triggers a non-interrupting timer boundary that alerts operations without stopping the payment.'])
J('In scope are the whole claim workflow, the human tasks, the REST and e-mail integrations, persistence, the user interface and containerized deployment. Out of scope are premium pricing, real airline data subscriptions and real bank integration; these are simulated inside the backend behind the same REST contract a real provider would use, so they can be swapped without changing the BPMN models.')
H2('1.3 Business value and success metrics')
T(['Metric','Manual process (typical)','AeroClaim target'],[
 ['Time to payout','Days to weeks','Minutes for automatic claims'],
 ['Human touch per claim','Always','Only for high payout or high fraud score'],
 ['Evidence required from customer','Receipts, letters','None - verified flight data'],
 ['Auditability','Scattered documents','Full instance history in Operate and in the claim event log'],
 ['Failure handling','Ad hoc','Modelled: error and timer boundaries, incidents, finance task']],widths=[2.0,2.1,2.3])
J('The portal reports the achieved values on the Overview page: number of claims, total paid out, average minutes to payout and the automatic approval rate (claims paid with no human step). Because every behavior is defined in BPMN and DMN, business owners can change thresholds, such as the review limit or the delay tiers, without touching Java code.')

# ---------- CH2 ----------
H1('2  BPMN Architecture and Failure Handling')
H2('2.1 Main process')
J('The main process parametric-claim-main (Figure 2.1, landscape page) is the orchestrator. It owns the claim lifecycle and delegates repeated or reusable work to child processes. Its elements are summarized below.')
T(['Element','Type','Purpose'],[
 ['S_claim','Start event','Process started by the backend with the claim payload'],
 ['T_register','Service task (job register-claim)','Persist registration, set status REGISTERED'],
 ['G_fork / G_join','Parallel gateways','Run eligibility and fraud scoring concurrently'],
 ['SP_elig','Sub-process','Contains validate-policy; error boundary POLICY_INVALID'],
 ['T_fraud','Service task (assess-fraud-risk)','Computes fraudScore 0-100'],
 ['CA_verify','Call activity, parallel multi-instance','One flight-verification instance per flight'],
 ['T_assess','Script task (FEEL)','Aggregates results into the assessment object'],
 ['G_trigger','Exclusive gateway','Parametric trigger met or not (default flow: not met)'],
 ['G_review','Exclusive gateway','Four-eyes rule on amount and fraud score'],
 ['UT_review','User task, sequential multi-instance','claims-handler, then senior-reviewer, with form claim-review-form'],
 ['G_decision','Exclusive gateway','Approve only if every reviewer approved'],
 ['SP_settle','Sub-process','Contains CA_pay; timer and error boundaries'],
 ['CA_pay','Call activity, sequential multi-instance','One payout-settlement instance per traveler'],
 ['UT_payfix','User task (finance-ops)','Resolve a declined payment using payment-resolution-form'],
 ['T_final','Service task (finalize-claim)','Close the claim, set final status and totals'],
 ['E_paid / E_closed / terminate','End events','Paid, closed (no trigger), rejected']],widths=[1.5,2.1,2.8],fs=9)
J('Every gateway split has either a condition on each outgoing flow or a default flow, and every exclusive or parallel split is closed by an explicit merge or join, so no token can be lost or left unhandled. The three models pass the bpmnlint camunda-compat rule set for Camunda 8.9 with zero findings.')
# landscape section
ns=D.add_section(WD_SECTION.NEW_PAGE); ns.orientation=WD_ORIENT.LANDSCAPE; ns.page_width=Inches(11.69); ns.page_height=Inches(8.27)
ns.left_margin=ns.right_margin=Inches(0.6); ns.top_margin=Inches(0.7); ns.bottom_margin=Inches(0.7)
D.add_heading('Figure 2.1  Main process: parametric-claim-main',3)
IMG('diagrams/parametric-claim-main.png',9.8,'Figure 2.1 - Main orchestration process (Camunda Modeler layout). Parallel fork, parallel multi-instance verification, four-eyes review, sequential settlement.')
ps=D.add_section(WD_SECTION.NEW_PAGE); ps.orientation=WD_ORIENT.PORTRAIT; ps.page_width=Inches(8.27); ps.page_height=Inches(11.69)
ps.left_margin=ps.right_margin=Inches(1); ps.top_margin=Inches(0.9); ps.bottom_margin=Inches(0.9)
H2('2.2 Child processes and multi-instance')
J('Two child processes are reused through call activities. Both are started with propagateAllParentVariables set to false; only explicitly mapped variables enter, and only the mapped output returns. This enforces variable scoping and keeps the parent free of intermediate variables.')
H3('flight-verification (parallel)')
J('For each flight, CA_verify starts one instance. The REST connector calls GET /api/oracle/flights/{number} with a bearer token taken from the secret FLIGHT_API_KEY. The response is stored as flightStatus, a business rule task evaluates the DMN table payout-tier, and a script task builds the verification result (flight number, delay, cancelled flag, tier percent, triggerMet). Because the multi-instance is parallel, a three-leg trip is verified concurrently; the output collection flightResults is gathered in the parent.')
IMG('diagrams/flight-verification.png',6.4,'Figure 2.2 - Child process flight-verification with FLIGHT_NOT_FOUND error and 60 s timer boundaries')
H3('payout-settlement (sequential)')
J('For each traveler, CA_pay starts one payout-settlement instance, one after another, so that a failure on one traveler is visible before the next payment is attempted. The REST connector posts to /api/payments with the PAYMENT_API_KEY secret; HTTP 402 is converted into the business error PAYMENT_FAILED. A successful payment is followed by an Email connector task sending a receipt through SMTP.')
IMG('diagrams/payout-settlement.png',6.4,'Figure 2.3 - Child process payout-settlement')
H3('Reviewer loop (sequential user task)')
J('UT_review is a sequential multi-instance user task over the FEEL list ["claims-handler","senior-reviewer"]. The candidate group of each iteration is the current element, so the claims handler decides first and the senior reviewer second. Each iteration produces {reviewer, decision, comment}; the gateway G_decision then requires every decision to be APPROVE.')
H2('2.3 Failure handling: error and timer boundaries')
T(['Failure','Detected by','BPMN mechanism','Outcome'],[
 ['Policy expired / unknown','validate-policy worker throws ZeebeBpmnError POLICY_INVALID','Error boundary on SP_elig','Claim rejected, e-mail to claimant, terminate end'],
 ['Flight not in provider','HTTP 404 on REST connector','Error expression bpmnError("FLIGHT_NOT_FOUND") + error boundary','Leg marked unverifiable, other legs continue'],
 ['Provider hangs','No response within 60 s','Timer boundary in flight-verification','Leg marked unverifiable'],
 ['Payment declined','HTTP 402 from bank','Error expression -> PAYMENT_FAILED, error boundary on SP_settle','User task for finance-ops, then retry or reject'],
 ['Bank slow','Settlement exceeds SLA (=slaDuration)','Non-interrupting timer boundary on SP_settle','E-mail to operations; payment continues'],
 ['Technical error in worker','Unexpected exception','Job retries, then incident','Visible in Operate; can be resolved and retried']],widths=[1.3,1.8,1.9,1.4],fs=9)
J('The distinction is deliberate. Business errors (invalid policy, declined payment) are modelled with BPMN errors because the process knows how to continue. Technical errors are left to the engine: the job is retried and finally becomes an incident that an operator can resolve in Operate. The non-interrupting timer is used where the work must continue regardless of the alert.')
H2('2.4 FEEL and variable mapping dictionary')
J('Table 2.1 lists the FEEL expressions used by the models and what each does. The same dictionary is included in the README.')
T(['Where','Expression','Purpose'],[
 ['REST url','="{{secrets.BACKEND_BASE_URL}}/api/oracle/flights/" + flight.flightNumber','Provider URL from the multi-instance element'],
 ['REST query','={date: flight.date}','Query parameters as a context'],
 ['REST result','={flightStatus: response.body}','Keep only the body'],
 ['REST error','=if error.code = "404" then bpmnError("FLIGHT_NOT_FOUND","...") else null','HTTP 404 to BPMN error'],
 ['DMN inputs','=flightStatus.delayMinutes ; =flightStatus.cancelled','Map into the DMN table'],
 ['CA_verify','input =flights, element flight, output flightResults','Parallel fan-out and gather'],
 ['T_assess','max(flightResults.tierPercent) ; count(flightResults[triggerMet = true])','Aggregate list results'],
 ['T_assess','round half up(policy.benefitPerTraveler * max(flightResults.tierPercent) / 100, 2)','Payout per traveler'],
 ['G_trigger','=assessment.triggerMet = true','Trigger decision'],
 ['G_review','=assessment.totalPayout >= 500 or fraudScore >= 60','Four-eyes rule'],
 ['UT_review','=["claims-handler","senior-reviewer"] ; assignee =[reviewerRole]','Sequential reviewers'],
 ['G_decision','=every r in reviews satisfies r.decision = "APPROVE"','All must approve'],
 ['CA_pay','input =travelers, element traveler, output =payment','Sequential payouts'],
 ['B_sla','=slaDuration','ISO-8601 SLA such as PT24H'],
 ['DMN column','>= 240, >= 180, >= 120, >= 60, true','Unary tests, hit policy FIRST']],widths=[1.1,3.4,1.9],fs=8.5)
J('Variable scoping rules: the main process holds claimId, policy, claimant, flights, travelers, slaDuration, fraudScore, flightResults, assessment and reviews. Child processes see only their mapped inputs (for example flight, or traveler, claimId, payoutPerTraveler and currency) and return only a single output element. Local variables (reviewerRole, verification) never leak into the parent.')

# ---------- CH3 ----------
H1('3  System Architecture and Tech Stack')
H2('3.1 Logical architecture')
J('The solution has four tiers: a React single-page application, a Spring Boot backend, the Camunda 8 orchestration cluster with the connectors runtime, and PostgreSQL. The browser talks only to the backend (through nginx); it never talks to Camunda directly, which keeps credentials and the engine API away from the client.')
CODE(""" Browser ──► nginx (React SPA, :3000)
               │  /api
               ▼
        Spring Boot (:8081) ──JPA──► PostgreSQL
          │  ▲   ▲
 start    │  │   │ job workers (gRPC 26500)         REST connector calls
 instance │  │   └────────────────────────┐          /api/oracle, /api/payments
 + /v2    ▼  │                            │                ▲
        Camunda 8 orchestration cluster ◄─┘   Connectors runtime ──► Mailpit (SMTP)
        (Zeebe + Operate + Tasklist)""")
J('Data flow for a claim: (1) the browser posts the claim; (2) the backend validates it with Bean Validation, persists it and starts the process through the Camunda Java client; (3) Zeebe schedules jobs; Spring job workers and the connectors runtime pick them up; (4) the connectors call back into the backend simulators for flights and payments; (5) user tasks are listed and completed through the backend, which calls the Orchestration Cluster REST API (/v2); (6) the live tracker polls element instances and incidents and renders them over the BPMN diagram.')
H2('3.2 Technology stack')
T(['Layer','Technology','Role'],[
 ['Frontend','React 18, Vite 5, Tailwind CSS 3, TanStack Query, react-router, bpmn-js, lucide-react','Portal, Tasklist, live tracker'],
 ['Backend','Java 17, Spring Boot 4.0.9, Spring Data JPA, Bean Validation, Lombok','REST API, persistence, job workers'],
 ['Workflow','Camunda 8.9.28 (Zeebe, Operate, Tasklist), Connectors bundle 8.9.19, BPMN 2.0, DMN, FEEL, Camunda Forms','Orchestration'],
 ['Client library','camunda-spring-boot-starter 8.9.28','@JobWorker, @Deployment, CamundaClient'],
 ['Database','PostgreSQL 15 (H2 profile for development)','Claims, flights, travelers, payments, events'],
 ['Packaging','Docker multi-stage builds, nginx 1.27, Docker Compose','One-command deployment'],
 ['Mail','Mailpit','Capture of outbound e-mails for testing']],widths=[1.1,3.6,1.7],fs=9)
H2('3.3 Backend design')
J('The backend follows a layered structure under the package com.aeroclaim: web (controllers and a global exception handler), service (business logic), repo (Spring Data repositories), domain (JPA entities), dto (request and response records), config (CORS, API-key filter, properties, data seeder) and worker (Zeebe job workers).')
B(['Controllers::  ClaimController, TaskController, ReferenceController, SimulationController and PaymentController provide the REST API. GlobalExceptionHandler turns validation and business errors into consistent JSON problem responses.',
'Services::  ClaimService validates and submits claims and builds the start payload. ProcessGateway wraps the CamundaClient and the /v2 REST calls. TrackerService and TaskService feed the UI; DashboardService computes KPIs; ScenarioService holds eight demonstration scenarios.',
'Job workers::  ClaimWorkers declares strongly typed @JobWorker methods: register-claim, validate-policy, assess-fraud-risk, update-claim-status and finalize-claim. Inputs are bound with @Variable and @VariablesAsType, headers with @CustomHeaders. validate-policy throws ZeebeBpmnError("POLICY_INVALID").',
'Persistence::  Spring Data JPA repositories with targeted @Transactional @Modifying updates so workers never overwrite concurrent changes.',
'Security of integrations::  ApiKeyFilter protects /api/oracle/* and /api/payments with bearer keys that equal the connector secrets.'])
J('The BPMN, DMN and form files are packaged into the jar and deployed to the engine automatically at start-up through the @Deployment annotation, so the running process always matches the repository.')
H2('3.4 Frontend design')
J('The frontend is designed as an airport departure board: a dark palette, amber split-flap displays and clear state colors (go, stop, sky). The pages are:')
B(['Overview::  KPI split-flap board, payout ladder, and live flight monitor.',
'File a claim::  a four-step wizard with dynamic array builders to add and remove flights and travelers, field validation with immediate feedback, and eight one-click example scenarios.',
'Claims and Tracker::  claim list and a live tracker that renders the deployed BPMN with bpmn-js, highlights active, completed and failed elements, shows child process instances and an activity feed, and celebrates a PAID claim.',
'Tasklist::  a custom role-based inbox (claims-handler, senior-reviewer, finance-ops) with claim details and forms generated for each user task.',
'Control tower::  edit the simulated flight provider (delay, cancellation) to drive different outcomes.'])
J('A mock server reproduces the REST contract and animates BPMN element states, so the interface can be demonstrated without the Camunda cluster.')

# ---------- CH4 ----------
H1('4  Data Contracts and API Dictionary')
H2('4.1 Request and response contracts')
J('The claim request is validated by Bean Validation. Table 4.1 gives the rules.')
T(['Field','Type','Validation'],[
 ['policyNumber','string','not blank'],
 ['claimant.name / email','string','not blank; valid e-mail'],
 ['flights[]','1 to 6 items','not empty, maximum 6'],
 ['flights[].flightNumber','string','pattern ^[A-Za-z0-9]{2,3}\\s?\\d{1,4}$ (e.g. LX318)'],
 ['flights[].date','ISO date','required'],
 ['flights[].origin / destination','string','exactly 3 letters (IATA)'],
 ['travelers[]','1 to 8 items','name not blank, valid e-mail'],
 ['slaDuration','ISO-8601 duration','optional; e.g. PT24H or P1D']],widths=[2.2,1.4,2.8],fs=9)
P('Example request (POST /api/claims):',b=True)
CODE("""{
  "policyNumber": "HEL-TRV-1001",
  "claimant": {"name": "Anna Keller", "email": "anna@example.com"},
  "flights": [{"flightNumber": "LX318", "date": "2026-11-03", "origin": "ZRH", "destination": "LHR"}],
  "travelers": [{"name": "Anna Keller", "email": "anna@example.com"}],
  "slaDuration": "PT24H"
}""")
P('Example response (ClaimView, abridged):',b=True)
CODE("""{
  "claimId": "CLM-...", "status": "SUBMITTED", "policyNumber": "HEL-TRV-1001",
  "processInstanceKey": "22517998136...", "totalPayout": null, "currency": "CHF",
  "flights": [{"flightNumber": "LX318", "verifiedStatus": null}],
  "travelers": [{"name": "Anna Keller", "email": "anna@example.com"}]
}""")
J('Errors use HTTP 400 with a field-by-field message list for validation failures and 404 for unknown resources; the payment simulator uses 402 for a declined transfer, which the BPMN converts into PAYMENT_FAILED.')
H2('4.2 Job worker contracts')
T(['Job type','Input variables','Output variables','Errors'],[
 ['register-claim','claimId, policy fields','status REGISTERED','-'],
 ['validate-policy','policyNumber, flights','policy (benefit, currency)','ZeebeBpmnError POLICY_INVALID'],
 ['assess-fraud-risk','claimant, travelers, flights','fraudScore','-'],
 ['update-claim-status','claimId, header status and reason','-','-'],
 ['finalize-claim','claimId, assessment, payments','final status, totals','-']],widths=[1.4,1.8,1.6,1.6],fs=9)
J('Connector contracts: the REST connector (io.camunda:http-json:1) and Email connector (io.camunda:email:1) are configured only through element templates and secrets. The flight response has the fields flightNumber, date, origin, destination, airline, scheduledDeparture, status, delayMinutes and cancelled. The payment request carries reference, beneficiary, amount and currency and returns a payment reference and status.')
H2('4.3 REST API dictionary')
T(['Method and path','Purpose'],[
 ['POST /api/claims','Validate, persist and start the process'],
 ['GET /api/claims, GET /api/claims/{id}','List and read claims'],
 ['GET /api/claims/{id}/tracker','Element instances, child instances, incidents, audit trail'],
 ['GET /api/tasks?group=','Custom Tasklist inbox'],
 ['POST /api/tasks/{key}/assign, /complete','Claim and complete user tasks'],
 ['GET /api/policies/{no}, /api/scenarios, /api/dashboard','Reference data and KPIs'],
 ['GET /api/models/{processId}','Deployed BPMN XML for bpmn-js'],
 ['GET /api/flights, PUT /api/flights/{id}','Control tower for the simulated provider'],
 ['GET /api/oracle/flights/{no}','Flight data provider (API key)'],
 ['POST /api/payments','Simulated bank (API key)']],widths=[3.0,3.4],fs=9)
H2('4.4 Persistence model')
T(['Entity','Key fields'],[
 ['Claim','claimId, policyNumber, claimantName/Email, status, statusReason, processInstanceKey, slaDuration, totalPayout, currency, maxDelayMinutes, fraudScore, timestamps'],
 ['FlightLeg','flightNumber, date, origin, destination, verifiedStatus, verifiedDelayMinutes, tierPercent'],
 ['Traveler','name, email (one claim to many travelers)'],
 ['Payment','reference, beneficiary, amount, currency, status, createdAt'],
 ['ClaimEvent','source, type, message, createdAt (audit trail)'],
 ['Policy','policyNumber, holderName, status, benefitPerTraveler, validFrom/To, maxTravelers'],
 ['FlightRecord','simulated provider data: flight identity, delayMinutes, cancelled']],widths=[1.4,5.0],fs=9)
J('Claim status values progress through SUBMITTED, REGISTERED, VERIFYING, ASSESSED, IN_REVIEW, SETTLING and the terminal states PAID, CLOSED_NO_TRIGGER and REJECTED. A seeder loads four policies and eight flight records at start-up so every scenario works immediately.')

# ---------- CH5 ----------
H1('5  Dockerization and Deployment')
H2('5.1 Container topology')
T(['Service','Image','Ports','Role'],[
 ['camunda-data-init','busybox','-','Prepares the data volume permissions'],
 ['orchestration','camunda/camunda 8.9.28','8080, 26500, 9600','Zeebe, Operate, Tasklist, REST API (H2 secondary storage)'],
 ['connectors','camunda/connectors-bundle 8.9.19','-','Runs REST and Email connectors; secrets from env file'],
 ['postgres','postgres 15','5432 (internal)','Application database'],
 ['mailpit','axllent/mailpit','8025, 1025','SMTP sink and web inbox'],
 ['backend','built from backend-springboot/Dockerfile','8081','Spring Boot API and job workers'],
 ['frontend','built from frontend-react/Dockerfile','3000','nginx serving the SPA and proxying /api']],widths=[1.3,2.0,1.2,1.9],fs=9)
J('Both application images use multi-stage builds. The backend is built with maven:3.9-eclipse-temurin-17 and runs on eclipse-temurin:17-jre as a non-root user; because the models in bpmn-models are bundled into the jar, its build context is the repository root. The frontend is built with node:20-alpine and served by nginx:1.27-alpine, whose configuration proxies /api to the backend and falls back to index.html for client-side routes.')
H2('5.2 Configuration and secrets')
B(['.env::  image versions and database credentials read by Compose.',
'secrets/connector-secrets.env::  environment of the connectors container; each NAME=value is available as {{secrets.NAME}} in BPMN, so no credential appears in any model (FLIGHT_API_KEY, PAYMENT_API_KEY, BACKEND_BASE_URL, SMTP_*).',
'Backend environment::  DB_URL, DB_USER, DB_PASSWORD, CAMUNDA_GRPC_ADDRESS, CAMUNDA_REST_ADDRESS, FLIGHT_API_KEY, PAYMENT_API_KEY, CORS_ORIGINS, DEFAULT_SLA.',
'Git hygiene::  only *.example files are committed; .env and the real secrets file are git-ignored.'])
H2('5.3 Build and run procedure')
CODE("""cp .env.example .env
cp secrets/connector-secrets.env.example secrets/connector-secrets.env
docker compose up --build""")
T(['What','URL'],[['Portal','http://localhost:3000'],['Camunda Operate / Tasklist','http://localhost:8080 (demo / demo)'],['Mailpit','http://localhost:8025'],['Backend API','http://localhost:8081/api/scenarios']],widths=[2.4,4.0],fs=9.5)
J('The first start takes a few minutes for image pulls and the Maven build. When the backend log shows "Started ParametricClaimsApplication", the process models are deployed and the portal is ready. docker compose down stops everything; adding -v removes the data volumes.')
H2('5.4 Deployment notes')
B(['Healthchecks::  the orchestration cluster and PostgreSQL expose healthchecks and dependent services wait for them, so the backend does not start before the engine accepts connections.',
'Development without Docker::  the frontend runs against the mock API (npm run mock) and the backend can run with the H2 profile against any Camunda 8.9 cluster.',
'Security::  the local Camunda API is unprotected, as in the official developer Compose file, and must not be exposed to the internet. For production, enable Camunda authentication, replace the simulators with real providers and move secrets to a secret manager.'])

# ---------- CH6 ----------
H1('6  Testing and Verification Evidence')
H2('6.1 Test strategy')
B(['Static model checks::  bpmnlint with plugin:camunda-compat/camunda-cloud-8-9 on all BPMN files: zero findings. Checks include no unhandled gateway splits, valid connector templates and valid FEEL.',
'Unit test::  ScenarioValidationTest (mvn test) validates all eight demonstration scenarios against the request schema.',
'Frontend build::  vite build compiles and bundles the portal without errors.',
'End-to-end scenarios::  eight scenarios exercise every mandatory construct, run from the portal and observed in the live tracker and in Camunda Operate.'])
H2('6.2 Scenario results')
T(['#','Scenario','Constructs exercised','Expected outcome'],[
 ['1','Happy path','Parallel fork, parallel MI, DMN, sequential MI payout, connectors','PAID, no human step'],
 ['2','Long delay, four-eyes','G_review, sequential MI user task, G_decision','Two review tasks, then PAID'],
 ['3','Multi-leg trip','Parallel multi-instance (3 legs), FEEL aggregation','Longest delay decides tier'],
 ['4','Cancelled flight','DMN rule 1','100 percent payout'],
 ['5','On-time flight','Default flow of G_trigger, e-mail','CLOSED_NO_TRIGGER'],
 ['6','Payment declined','HTTP 402, PAYMENT_FAILED error boundary, finance user task','Escalation then resolution'],
 ['7','Slow bank','Non-interrupting timer boundary, ops e-mail','Alert sent, claim still PAID'],
 ['8','Expired policy','ZeebeBpmnError POLICY_INVALID, error boundary','REJECTED']],widths=[0.3,1.5,3.0,1.6],fs=9)
J('The UI integration run (against the mock API that mirrors the REST contract) was driven with Playwright through a complete four-eyes claim from submission to PAID. The screenshots in section 6.3 come from that run.')
H2('6.3 User interface evidence')
def PAIR(a,b,wa,wb,cap):
    t=D.add_table(rows=1,cols=2); t.alignment=WD_TABLE_ALIGNMENT.CENTER
    for c,(f,w) in zip(t.rows[0].cells,((a,wa),(b,wb))):
        c.text=''; p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run().add_picture(os.path.join(R,f),width=Inches(w))
    P(cap,i=True,al='c',size=9)
PAIR('screens/01-overview.png','screens/03-tracker-running.png',2.7,2.7,'Figure 6.1 - Overview (KPI board, payout ladder, flights)   |   Figure 6.2 - Live tracker with active BPMN element highlighted')
PAIR('screens/02-file-claim.png','screens/04-tasklist.png',3.1,3.1,'Figure 6.3 - File a claim (dynamic builders, validation, scenarios)   |   Figure 6.4 - Custom Tasklist inbox and review form')
PAIR('screens/05-control-tower.png','screens/07-claims.png',3.1,3.1,'Figure 6.5 - Control tower (simulated flight provider)   |   Figure 6.6 - Claims list')
PAIR('screens/06-tracker-paid.png','screens/08-mobile-overview.png',2.6,1.5,'Figure 6.7 - Tracker after PAID with payments and audit trail   |   Figure 6.8 - Responsive phone layout')
H2('6.4 Camunda Operate evidence and logs')
J('This section holds the evidence from the real Camunda stack. It must be captured after running docker compose up --build, and is left as marked placeholders to be filled in with the team\'s own screenshots and log excerpts.')
PLACE('[INSERT SCREENSHOT] Operate - Processes: parametric-claim-main, flight-verification and payout-settlement deployed (version 1).')
PLACE('[INSERT SCREENSHOT] Operate - instance history of a completed happy-path claim, showing the parallel flight-verification instances and sequential payout instances.')
PLACE('[INSERT SCREENSHOT] Operate - the Payment declined scenario: instance on the PAYMENT_FAILED error boundary path / user task for finance-ops.')
PLACE('[INSERT SCREENSHOT] Camunda Tasklist - claim-review-form for the claims-handler.   [INSERT SCREENSHOT] Mailpit inbox with payout receipts.')
PLACE('[INSERT LOG EXCERPT] Backend log: "Started ParametricClaimsApplication" and job worker activations for register-claim, validate-policy, assess-fraud-risk, finalize-claim.')

# ---------- CH7 ----------
H1('7  Individual Contributions and Conclusion')
H2('7.1 Team contributions')
T(['Team member','Register no.','Contribution'],[
 ['Harshinee Laxmi','RA2411056010167','[Describe your contribution, e.g. BPMN design, backend workers, frontend, report]'],
 ['[Member 2]','[Reg. no.]','[Contribution]'],
 ['[Member 3]','[Reg. no.]','[Contribution]'],
 ['[Member 4]','[Reg. no.]','[Contribution]']],widths=[1.7,1.5,3.2],fs=9.5)
H2('7.2 Challenges')
J('Key challenges were keeping variable scopes clean across call activities (solved with explicit input and output mappings), distinguishing business errors from technical failures (BPMN errors versus retries and incidents), making the live tracker accurate (combining element instances, child instances and incidents from the REST API), and keeping secrets out of the models (connector secrets as environment variables).')
H2('7.3 Conclusion')
J('AeroClaim demonstrates that a parametric claim can be handled fully automatically while still keeping humans in the loop where risk or value is high. The solution satisfies the rubric constructs: a main process, reusable call-activity child processes, parallel and sequential multi-instance, sub-processes with error and timer boundaries, balanced gateways, REST and Email connectors with externalized secrets, valid FEEL with correct scoping, a Spring Boot backend with typed job workers, a React interface with dynamic builders, a custom Tasklist and live tracker, and Docker packaging.')
H2('7.4 Future work')
B(['Replace the simulators with a real flight-data API and a real payment service.','Add Camunda authentication and role mapping for production.','Add Optimize dashboards for claim analytics and automated process tests with the Camunda process test library.'])
D.save(os.path.join(R,'AeroClaim-Technical-Report.docx'))
print('saved')
