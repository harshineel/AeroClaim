# AeroClaim - Parametric Travel & Flight Delay Claims

> Workflow Automation Engineering - final project. Inspired by Helvetia's parametric travel insurance: when verified flight data crosses a delay threshold, the policyholder is paid automatically. No loss adjuster, no proof of loss.

A complete full-stack workflow application: **React** portal, **Spring Boot** backend with strongly typed `@JobWorker`s, **Camunda 8.9** (Zeebe, Operate, Tasklist, Connectors), **PostgreSQL**, all started with one `docker compose up`.

## 1. Project overview

| A traveler... | What happens |
|---|---|
| files a claim (policy, flights, travelers) | Spring Boot saves it and starts the BPMN process `parametric-claim-main` |
| - | policy is validated while a fraud score is computed **in parallel** |
| - | every flight leg is verified by a **child process** (REST connector to the flight data provider), **all legs in parallel** |
| - | a **DMN table** converts delay minutes into a payout tier (25 / 50 / 75 / 100 %) |
| - | payouts of CHF 500 or more (or a high fraud score) need **two sequential reviewers** (four-eyes) |
| - | each traveler is paid by a **child process** (REST + Email connectors), **one after another** |
| - | a declined payment is caught by an **error boundary** and escalated to finance; a slow bank trips a **timer boundary** SLA alert |

### Mandatory BPMN constructs (rubric)

| Construct | Where |
|---|---|
| Main process | `bpmn-models/parametric-claim-main.bpmn` |
| Reusable child processes via Call Activity | `flight-verification.bpmn`, `payout-settlement.bpmn` |
| Multi-instance, **parallel** | `CA_verify` (one flight-verification instance per flight) |
| Multi-instance, **sequential** | `CA_pay` (one payout per traveler), `UT_review` (two reviewers one after another) |
| Sub-process + **Error** boundary | `SP_elig` catches `POLICY_INVALID`; `SP_settle` catches `PAYMENT_FAILED` |
| Sub-process + **Timer** boundary | `SP_settle` non-interrupting SLA timer (`=slaDuration`) |
| Gateways | parallel fork/join, exclusive (trigger, manual review, decision) and explicit merges, so there are no unhandled splits |
| Outbound connectors | REST (flight lookup, bank transfer) and Email (payout receipts, SLA alert, claim outcome) |
| Externalized secrets | `{{secrets.FLIGHT_API_KEY}}`, `{{secrets.PAYMENT_API_KEY}}`, `{{secrets.SMTP_*}}`, `{{secrets.BACKEND_BASE_URL}}` |
| DMN | `payout-tier.dmn` (hit policy FIRST) called by a business rule task |
| Camunda Forms | `claim-review-form.form`, `payment-resolution-form.form` |

All three BPMN files pass `bpmnlint` with the `camunda-compat` rules for Camunda 8.9 (zero findings).

## 2. Repository layout

```
project-repository/
├── bpmn-models/          main + child BPMN, DMN, Camunda Forms
├── backend-springboot/   REST controllers, JPA entities, repositories, services, Zeebe job workers
├── frontend-react/       React + Vite + Tailwind portal (Tasklist UI, live tracker) + mock API for offline demos
├── docker/camunda/       Orchestration cluster configuration
├── secrets/              connector secrets (only *.example is committed)
├── docker-compose.yml    whole solution
├── .env.example
└── README.md
```

## 3. Run it

**Prerequisites:** Docker Desktop (Compose v2), about 4 GB free RAM.

```bash
cp .env.example .env
cp secrets/connector-secrets.env.example secrets/connector-secrets.env
docker compose up --build
```

First start takes a few minutes (image pulls and Maven build). When the backend log says `Started ParametricClaimsApplication`, open:

| What | URL |
|---|---|
| Portal | http://localhost:3000 |
| Camunda Operate / Tasklist | http://localhost:8080/operate - `demo` / `demo` |
| Sent e-mails (Mailpit) | http://localhost:8025 |
| Backend API | http://localhost:8081/api/scenarios |

The BPMN, DMN and forms are packaged into the backend jar and deployed to Camunda automatically on start-up (`@Deployment`). Stop with `docker compose down` (add `-v` to wipe data).

### Try the scenarios

The *File a claim* page lists eight ready-made examples. Each drives a different path:

| Example | Expected path |
|---|---|
| Happy path | paid with no human step |
| Long delay - four-eyes | two sequential review tasks (handler, then senior reviewer) |
| Multi-leg trip | three parallel flight verifications, longest delay decides |
| Cancelled flight | DMN rule 1, 100 % |
| On-time flight | trigger not met, claim closed, e-mail |
| Payment declined | error boundary `PAYMENT_FAILED`, finance user task |
| Slow bank | non-interrupting timer boundary, ops e-mail, claim still paid |
| Expired policy | `ZeebeBpmnError POLICY_INVALID`, claim rejected |

The **Control tower** page edits the simulated flight data provider, so you can change a delay and file a claim to see the new tier.

### Run without Docker (development)

```bash
# UI against the built-in mock API (no Camunda needed)
cd frontend-react && npm install
npm run mock          # terminal 1: mock API on :8081
npm run dev           # terminal 2: UI on :5173

# Real backend with H2 (still needs a Camunda 8.9 cluster on localhost:26500 / 8080)
cd backend-springboot && mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

## 4. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query, bpmn-js (live diagram) |
| Backend | Java 17, Spring Boot 4.0, Spring Data JPA, Bean Validation, Camunda Spring Boot starter 8.9 |
| Workflow | Camunda 8.9 (Zeebe, Operate, Tasklist, Connectors bundle), BPMN 2.0, DMN, FEEL |
| Database | PostgreSQL 15 (H2 profile for local development) |
| Packaging | Docker multi-stage builds, nginx, Docker Compose |

## 5. System architecture

```
 Browser ──► nginx (React SPA, :3000)
               │  /api
               ▼
        Spring Boot (:8081) ──JPA──► PostgreSQL
          │  ▲   ▲
 start    │  │   │ job workers (gRPC 26500)         REST connector calls
 instance │  │   └────────────────────────┐          /api/oracle, /api/payments
 + /v2    ▼  │                            │                ▲
        Camunda 8 orchestration cluster ◄─┘   Connectors runtime ──► Mailpit (SMTP)
        (Zeebe + Operate + Tasklist)
```

* The browser never talks to Camunda. Spring Boot starts instances through the Camunda Java client and reads user tasks, element instances and incidents through the Orchestration Cluster REST API (`/v2`), which powers the custom Tasklist and the live tracker.
* Service tasks are implemented by `@JobWorker` methods (`register-claim`, `validate-policy`, `assess-fraud-risk`, `update-claim-status`, `finalize-claim`). Business errors are thrown as `ZeebeBpmnError` and caught by BPMN error boundaries.
* The flight data provider and the bank are simulated inside the backend (`/api/oracle/**`, `/api/payments`) and protected by bearer API keys that equal the connector secrets.

## 6. FEEL expression dictionary

| Where | Expression | Purpose |
|---|---|---|
| `T_fetch` (REST) url | `="{{secrets.BACKEND_BASE_URL}}/api/oracle/flights/" + flight.flightNumber` | build the provider URL from the multi-instance element |
| `T_fetch` query | `={date: flight.date}` | query parameters as a context |
| `T_fetch` result expression | `={flightStatus: response.body}` | keep only the response body as variable |
| `T_fetch` error expression | `=if error.code = "404" then bpmnError("FLIGHT_NOT_FOUND", "...") else null` | turn HTTP 404 into a BPMN error |
| `T_tier` input | `=flightStatus.delayMinutes`, `=flightStatus.cancelled` | map into the DMN inputs |
| `T_build` | `={flightNumber: ..., tierPercent: tierPercent, triggerMet: tierPercent > 0}` | build the per-leg verification result |
| `CA_verify` multi-instance | input collection `=flights`, element `flight`, output collection `flightResults`, output element `=verification` | parallel fan-out and gather |
| `T_assess` | `max(flightResults.tierPercent)`, `count(flightResults[triggerMet = true])` | aggregate over the gathered list (filter + list functions) |
| `T_assess` | `round half up(policy.benefitPerTraveler * max(flightResults.tierPercent) / 100, 2)` | payout per traveler |
| `G_trigger` flow | `=assessment.triggerMet = true` (default flow otherwise) | parametric trigger decision |
| `G_review` flow | `=assessment.totalPayout >= 500 or fraudScore >= 60` | four-eyes rule |
| `UT_review` multi-instance | `=["claims-handler", "senior-reviewer"]`, sequential, output `={reviewer: reviewerRole, decision: decision, comment: comment}` | sequential reviewers |
| `UT_review` assignment | `=[reviewerRole]` | candidate group per loop iteration |
| `G_decision` flow | `=every r in reviews satisfies r.decision = "APPROVE"` | all reviewers must approve |
| `CA_pay` multi-instance | input `=travelers`, element `traveler`, output `=payment` | sequential payment per traveler |
| `CA_pay` input mapping | `traveler`, `claimId`, `=assessment.payoutPerTraveler`, `=assessment.currency` | explicit scoping into the child process |
| `B_sla` timer | `=slaDuration` | per-claim SLA, ISO-8601 (for example `PT24H`) |
| Email bodies | `="Dear " + traveler.name + ... + string(payoutPerTraveler)` | string building |
| DMN column | `>= 240`, `>= 180`, `>= 120`, `>= 60`, `true` | unary tests, hit policy FIRST |

Child processes receive **only** the variables mapped in (`propagateAllParentVariables="false"`), and return only the mapped output, so scopes never leak.

## 7. Configuration and secrets

* `.env` - image versions and database credentials, read by Docker Compose.
* `secrets/connector-secrets.env` - environment of the connector runtime; every `NAME=value` is available as `{{secrets.NAME}}` in BPMN, so **no credential appears in a model**.
* The backend reads `DB_URL`, `DB_USER`, `DB_PASSWORD`, `CAMUNDA_GRPC_ADDRESS`, `CAMUNDA_REST_ADDRESS`, `FLIGHT_API_KEY`, `PAYMENT_API_KEY`, `CORS_ORIGINS` (see `application.yml`).
* Roles in the portal simulate Camunda candidate groups: `claims-handler`, `senior-reviewer`, `finance-ops`.
* The local Camunda API is open (`unprotectedApi: true`) as in the official developer compose. Do not expose it publicly.

## 8. REST API (Spring Boot)

| Method and path | Purpose |
|---|---|
| `POST /api/claims` | validate, persist and start the process |
| `GET /api/claims`, `GET /api/claims/{id}` | list and read claims |
| `GET /api/claims/{id}/tracker` | live status: element instances, child instances, incidents, audit trail |
| `GET /api/tasks?group=` | custom Tasklist inbox |
| `POST /api/tasks/{key}/assign`, `POST /api/tasks/{key}/complete` | claim and complete a user task |
| `GET /api/policies/{no}`, `GET /api/scenarios`, `GET /api/dashboard` | reference data and KPIs |
| `GET /api/models/{processId}` | deployed BPMN XML (for bpmn-js) |
| `GET /api/flights`, `PUT /api/flights/{id}` | control tower for the simulated data provider |
| `GET /api/oracle/flights/{no}` | flight data provider (REST connector, API key) |
| `POST /api/payments` | simulated bank (REST connector, API key) |

## 9. Tests

`mvn test` in `backend-springboot` validates every demo scenario against the request schema. End-to-end evidence (screenshots, Operate views) is in the technical report.
