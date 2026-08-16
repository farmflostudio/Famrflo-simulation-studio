# FarmFlo - Decision Engine and Optimisation

Component owner: Esele Osedebamen Ativie (B01829522)

This is the decision engine slice of the FarmFlo project. It contains:

- The MPC-framed decision engine turning soil moisture predictions into an irrigation schedule: `python-training/service/decision_engine.py`
- Optimisation logic (SciPy SLSQP) and three-baseline benchmarking (fixed-interval, threshold-based, linear programme): `python-training/service/decision_engine.py`
- The GenAI recommendation layer explaining the schedule in plain language, plus its guardrail verification step: `python-training/service/language_layer/explanation_agent.py`, `guardrail.py`
- Backend endpoints for schedule generation and language explanations: `backend/src/controllers/scheduleController.js`, `backend/src/controllers/languageController.js`, and related routes, services, and models
- Frontend schedule and explanation UI: `frontend/src/components/SchedulePlanTable.jsx`, `IrrigationChart.jsx`, `BaselineComparisonTable.jsx`, `ExplanationCard.jsx`, `frontend/src/pages/Schedule.jsx`, `frontend/src/lib/schedulePdf.js`
- Tests covering the decision engine and guardrail: `python-training/tests/test_decision_engine.py`, `test_guardrail.py`, `backend/tests/routes/schedules.test.js`, `language.test.js`

Note: `python-training/service/language_layer/client.py` and `schemas.py` are shared with the simulation component (used by both the explanation agent here and the config parser there). `backend/tests/helpers.js` and `setup.js`, and `python-training/tests/conftest.py`, are shared test support files included so the tests above can run standalone.

This is a partial extract of the full FarmFlo repository, containing only the files owned by this component. It will not run standalone without the rest of the FarmFlo stack (backend app entrypoint, auth, database config, frontend shell, etc).
