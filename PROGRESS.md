# AeroClaim - build log (read this first after any reset)

Project: Parametric Travel & Flight Delay Claims (Workflow Automation Engineering final project). Stack: Camunda 8.9 + Spring Boot 3.5 + React/Vite/Tailwind + Docker Compose.

## Done
- [x] Requirements read (TOC + guidelines docx)
- [x] BPMN: parametric-claim-main, flight-verification, payout-settlement + payout-tier.dmn + 2 forms; zero bpmnlint camunda-compat 8.9 findings; PNGs in docs/diagrams
      (generator scripts live in the session scratchpad: gen/bpmngen.py, gen/build_models.py; rebuilt once after a workspace reset)
- [x] Backend: pom, application.yml, config, domain, repositories (rewritten after reset)

## In progress / todo
- [x] Backend complete (DTOs, services, workers, controllers, seeder, unit test) - syntax-checked only; cannot compile without Maven deps here
- [x] Frontend: all pages + mock-server written; vite build passes. TODO: screenshot-check and polish (screens saved to docs/screens)
- [x] Docker: docker-compose.yml, .env(.example), secrets/connector-secrets.env, Dockerfiles, nginx.conf, docker/camunda/application.yaml written (NOT run - no Docker here). README.md written
- [ ] 20-page report .docx (title page: Harshinee Laxmi, RA2411056010167, AQ1 DSBS)
- [ ] Final verification, zip, deliver, answer Docker question (install at the end is fine for writing; needed only to run/demo/Operate screenshots)

## Rules
- Save work to disk AND snapshot to a zip in the outputs folder regularly; the workspace can reset.

## Report (task 6) - decision: Word .docx built with python-docx; generator at docs/build_report.py (survives reset). Output: docs/AeroClaim-Technical-Report.docx
(An empty Docs-type artifact was also created by mistake; ignore it.)
- [x] Report built (20 pages, docs/AeroClaim-Technical-Report.docx + PDF). Placeholders: team names, section 6.4 Operate screenshots. Delivered with project zip.
- 2026-11-16: Docker run showed backend crash (camunda starter 8.9.28 needs Spring Boot 4; was 3.5.7). Fixed: parent 4.0.9, starter-webmvc, removed jackson serialization prop. Not yet re-verified on user's machine. Orchestration+connectors healthy.
- 2026-11-16: Modeler 'template not found' fixed: modelerTemplateVersion HttpJson.v2 -> 13, email.v1 -> 4 (verified vs connectors 8.9.19 source); templates copied to bpmn-models/.camunda/element-templates. Backend Boot4 fix still unverified by user.
- 2026-11-16: user's Modeler is 8.8: models now platform 8.8.0, templates HttpJson v11 / email v3 (8.8.0 source), shipped in bpmn-models/.camunda/element-templates. Runtime stays 8.9.28.
- 2026-11-16: DMN deploy failed (Failed to parse DMN): <description> must precede inputEntry in <rule>; fixed. Note: starting main from Tasklist 'Start process' gives no variables -> use portal.
