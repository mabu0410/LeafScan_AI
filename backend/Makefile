PYTHON ?= ./.venv/bin/python

.PHONY: install run test build install-dev

install:
	$(PYTHON) -m pip install -r requirements.txt

run:
	$(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	$(PYTHON) -m pytest -q

build:
	$(PYTHON) -m compileall -q app

install-dev:
	$(PYTHON) -m pip install -r requirements-dev.txt
