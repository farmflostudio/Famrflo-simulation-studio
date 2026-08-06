FarmFlo Simulation Studio Development Brief

How to use this document
Paste this whole document into the coding assistant inside the project folder and ask it to begin with Sprint One. Work task by task inside each sprint and show working code after each task before moving to the next one. Do not add any comment, README line, commit message, or on screen text anywhere in this project that mentions how the code was produced or which assistant wrote it. Keep every comment and every piece of documentation focused only on the product itself. This does not apply to the Gemini and ADK language layer described in section six, since that is a real, required feature of the finished product and must be documented normally as part of how the system works.

Note on identifiers
A very small number of real addresses and package names must keep a hyphen character in order to work at all, for example the live COSMOS UK API address and some npm package names. These are written exactly as they must be typed. Everywhere else in this brief, plain language is used instead of the hyphen character.

Section one, project summary
FarmFlo Simulation Studio is a smart irrigation scheduling platform for virtual UK farms. A user describes a farm in plain language. The system builds a realistic synthetic environment for that farm, predicts soil moisture with machine learning, plans irrigation with an optimisation based decision engine, and explains the plan in plain language. Build this as a complete full stack web application.

Section two, technology stack
Frontend, React using Vite, plain JavaScript, Tailwind CSS for styling, Recharts for charts.
Backend, Node.js with Express, a REST API, JSON Web Token based authentication.
Database, MongoDB with Mongoose for schema modelling. Do not hardcode a connection string anywhere. Read it from an environment variable named MONGODB_URI. Before running any database command, ask me directly for my MongoDB connection string and my preferred database name, and store the value only in a local dotenv file that is listed in gitignore and is never committed.
Machine learning and simulation, Python, using scikit learn, xgboost, tensorflow or pytorch for the LSTM model, pandas, numpy, and scipy for the optimisation baseline.
Model serving, a small Python service the Node backend can call, or a model format Node can load directly. Propose the simpler option to me before building it.

Section three, existing datasets to use first
Check and use these real, publicly available datasets before generating any synthetic data, so every model is grounded in observed conditions rather than pure invention.
One, COSMOS UK. A UK government funded monitoring network of fifty one field sites recording soil moisture, rainfall, temperature, humidity, and radiation continuously since 2013, through to the present. It is published under the Open Government Licence by the UK Centre for Ecology and Hydrology, downloadable from their Environmental Information Data Centre, and reachable live through an API at https://cosmos-api.ceh.ac.uk. Use this as the primary real UK soil moisture ground truth, both to calibrate the synthetic simulator and to validate that the generated synthetic data has realistic statistical properties.
Two, NASA POWER agroclimatology data and the Open Meteo ERA5 Land historical weather API. Use these for temperature, rainfall, humidity, and radiation reference ranges for the specific UK location a user configures.
Three, two supporting tabular datasets from Kaggle, named Irrigation Water Requirement Prediction Dataset and Soil Moisture Prediction, can be used as an extra sanity check during early model prototyping, before the simulator produces enough synthetic volume on its own. Treat the COSMOS UK data as the primary source of truth at all times.
Write one data access script that downloads or queries each of these three sources, saves a cached local copy, and records in the README exactly where each file came from and under what licence it is used.

Section four, model development and training
Build and train three soil moisture prediction models, Random Forest, XGBoost, and an LSTM network, using the calibrated synthetic dataset together with a held back portion of the real COSMOS UK data for validation. Compare all three on RMSE, MAE, and R squared. Keep the best performing model as the default used by the application, while keeping all three available for side by side comparison inside the dashboard.
After training, save every model file in a compressed, production ready format. Use joblib with compression for Random Forest and XGBoost, and a saved Keras format or an ONNX export for the LSTM. Confirm the total size of every model file you plan to commit is under one hundred megabytes, since GitHub refuses files above that size by default. If a trained file comes out larger than that, reduce it before committing, by lowering tree count or maximum depth for the ensemble models, or by reducing hidden units, applying pruning, or converting to a quantised ONNX version for the LSTM. Never commit a file over that limit and do not set up large file storage for this repository. The goal is a plain clone that works immediately with no extra setup.
Commit the final trained model files directly inside the repository, in a folder named models, together with one small script that loads each file and runs a single sample prediction, so that anyone who clones the repository can run that script right away and see a working prediction without training anything themselves. Record the exact library versions needed to load each file in the README.

Section five, backend and database design
Propose MongoDB collections for farms, simulation runs, datasets, trained model metadata, irrigation schedules, and user accounts. Show me the proposed schema before writing any database code, so I can confirm the fields first. Build REST endpoints for creating a farm from a plain language description, running a simulation, requesting a prediction, requesting a full irrigation schedule, and retrieving past history. Protect every endpoint that changes data with authentication.

Section six, the language layer
Build an agent layer using the Google Agent Development Kit together with Gemini 2.5 Flash, for two jobs. The first job turns a plain language farm description into a structured configuration file. The second job turns a finished irrigation schedule into a short plain language explanation for the farmer. Add a validation step that checks the plain language explanation against the actual verified schedule numbers before it is shown to the user, and falls back to a simple template sentence if the two do not match. Ask me for the Gemini API key the same way as the database credential, through an environment variable, never hardcoded anywhere in the code.

Section seven, frontend and user experience
Build a clean, modern, professional dashboard, not a default template. Choose a calm colour palette suited to agriculture and water, use generous white space, a consistent card based layout throughout, and clear, well labelled charts for soil moisture trends and irrigation schedules. Every screen should feel considered and finished. Build at minimum a farm setup screen, a dashboard screen with live charts, a schedule screen showing the recommended plan alongside its plain language explanation, and a history screen.

Section eight, standards and compliance
Follow OWASP guidance for web application security throughout the backend. Follow ISO or IEC 25010, the 2023 edition, as the software quality reference for the whole build. Follow ISO 31000, the 2018 edition, for how risks are tracked across the project. Follow the NIST AI Risk Management Framework for the language layer specifically. Follow WCAG 2.2 at level AA for accessibility on every screen. Store no personal data beyond what login requires, and keep the whole system working only on synthetic data and public reference data.

Section nine, Sprint One
Goal, a working foundation.
One, set up the repository as three clear parts in one project, the frontend, the backend, and the Python training project.
Two, ask me for my MongoDB connection string and my Gemini API key, and set up the environment file handling and gitignore correctly before writing any other code.
Three, build the data access scripts for COSMOS UK, NASA POWER, and Open Meteo, and produce a first working cached dataset.
Four, build the synthetic simulation engine and calibrate it against the cached COSMOS UK data.
Five, train the three prediction models on the resulting dataset, compare them, and save the trained files under the one hundred megabyte limit as described in section four.
Six, build the MongoDB schema and the core backend endpoints for farms, simulations, and predictions.
Seven, build the farm setup screen and the dashboard screen on the frontend, connected to the real backend endpoints, not mock data.
Deliverable at the end of Sprint One, a running application where a user can describe a farm in plain language, see a generated dataset, and see a soil moisture prediction on screen, produced by a model that is already trained and already committed to the repository.

Section ten, Sprint Two
Goal, the full decision and explanation loop, tested and finished.
One, build the optimisation based decision engine, together with the three comparison baselines, fixed interval, threshold based, and the linear programme baseline.
Two, build the Gemini and ADK language layer for configuration parsing and for explaining the finished schedule, including the guardrail check described in section six.
Three, build the schedule screen and the history screen on the frontend.
Four, write unit tests for the backend endpoints and for the model loading script, and integration tests covering the full path from a farm description to a final schedule.
Five, review the whole application against every standard listed in section eight, and fix anything that falls short.
Six, finish the README with complete setup steps, so a new developer can clone the repository, add their own environment values, and run the whole system immediately with no retraining required.
Deliverable at the end of Sprint Two, a complete, tested, documented application that a client can clone and run from end to end immediately.

Section eleven, before you start
Ask me for my MongoDB connection string and database name.
Ask me for my Gemini API key.
Confirm the Node and Python versions you plan to use.
Then begin Sprint One, one task at a time, showing me each piece of working code before moving on to the next task.
