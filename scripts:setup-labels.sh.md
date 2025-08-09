#!/usr/bin/env bash
set -euo pipefail

# Requires: gh auth login
# Priority labels
gh label create "P0" -c FF0000 -d "Production blocker" || true
gh label create "P1" -c FF8C00 -d "High priority" || true
gh label create "P2" -c FFD700 -d "Medium priority" || true
gh label create "P3" -c 00CED1 -d "Low priority" || true

# Areas
for L in "area:security" "area:features" "area:ux" "area:i18n" "area:performance" "area:docs" "area:ops" "area:build" ; do
  gh label create "$L" -c 0366D6 -d "$L" || true
done

# Meta
gh label create "type:bug" -c D73A4A -d "Defect" || true
gh label create "type:task" -c 5319E7 -d "Task" || true
gh label create "good first issue" -c 7057ff -d "Starter-friendly" || true
