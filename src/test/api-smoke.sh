#!/usr/bin/env bash
#
# Slice 6 API smoke tests — requires a running Next.js dev server at localhost:3000.
# Caller is responsible for starting and stopping the server.
#
# Usage:
#   chmod +x src/test/api-smoke.sh
#   ./src/test/api-smoke.sh
#
# Exit 0 when all tests pass; exit 1 when any test fails.

set -u

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1"
  FAIL=$((FAIL + 1))
}

# ---------------------------------------------------------------------------
# Test 1: GET /api/projects — data array, error: null, stale: false
# AC: US-10 cache pattern + US-02 project cards; route always returns HTTP 200
# ---------------------------------------------------------------------------
RESPONSE=$(curl -s "${BASE_URL}/api/projects")
if echo "$RESPONSE" | jq -e \
  '(.data | type == "array") and .error == null and .stale == false' \
  > /dev/null 2>&1
then
  pass "GET /api/projects — data array, error: null, stale: false"
else
  fail "GET /api/projects — data array, error: null, stale: false (got: $(echo "$RESPONSE" | jq -c '{data_type: (.data | type), error, stale}'))"
fi

# ---------------------------------------------------------------------------
# Test 2: GET /api/projects — two calls within 60 s return identical cachedAt
# AC: US-10 in-memory cache hit
# ---------------------------------------------------------------------------
RESPONSE1=$(curl -s "${BASE_URL}/api/projects")
CACHED_AT_1=$(echo "$RESPONSE1" | jq -r '.cachedAt')
sleep 1
RESPONSE2=$(curl -s "${BASE_URL}/api/projects")
CACHED_AT_2=$(echo "$RESPONSE2" | jq -r '.cachedAt')
if [ "$CACHED_AT_1" != "null" ] && [ "$CACHED_AT_1" = "$CACHED_AT_2" ]; then
  pass "GET /api/projects — second call within 60 s returns identical cachedAt (cache hit)"
else
  fail "GET /api/projects — second call within 60 s returns identical cachedAt [got '$CACHED_AT_1' vs '$CACHED_AT_2']"
fi

# ---------------------------------------------------------------------------
# Test 3: GET /api/ddr-pipeline — data array with agent-dashboard entries
# AC: US-03 DDR Pipeline Panel; kanbanColumn values must be from the known set
# ---------------------------------------------------------------------------
RESPONSE=$(curl -s "${BASE_URL}/api/ddr-pipeline")
if echo "$RESPONSE" | jq -e \
  '(.data | type == "array")
   and (.data | any(.repoName == "agent-dashboard"))
   and (.data | all(
     .kanbanColumn == "PROPOSED"
     or .kanbanColumn == "ACCEPTED"
     or .kanbanColumn == "IN SPRINT"
     or .kanbanColumn == "SHIPPED"
     or .kanbanColumn == "UNKNOWN"
   ))' \
  > /dev/null 2>&1
then
  pass "GET /api/ddr-pipeline — data array; agent-dashboard entries present; all kanbanColumn values valid"
else
  fail "GET /api/ddr-pipeline — data array; agent-dashboard entries present; all kanbanColumn values valid (got: $(echo "$RESPONSE" | jq -c '{data_type: (.data | type), agent_dashboard_count: ([.data[] | select(.repoName == "agent-dashboard")] | length)}'  2>/dev/null || echo 'parse error'))"
fi

# ---------------------------------------------------------------------------
# Test 4: GET /api/session-closes — data array, error: null (may be empty)
# AC: US-04 session-close panel; must not error even if no captures exist
# ---------------------------------------------------------------------------
RESPONSE=$(curl -s "${BASE_URL}/api/session-closes")
if echo "$RESPONSE" | jq -e \
  '(.data | type == "array") and .error == null' \
  > /dev/null 2>&1
then
  pass "GET /api/session-closes — data array, error: null"
else
  fail "GET /api/session-closes — data array, error: null (got: $(echo "$RESPONSE" | jq -c '{data_type: (.data | type), error}'))"
fi

# ---------------------------------------------------------------------------
# Test 5: GET /api/activity-feed — data array sorted by timestamp descending
# AC: US-05 unified activity feed; events sorted newest-first
# ---------------------------------------------------------------------------
RESPONSE=$(curl -s "${BASE_URL}/api/activity-feed")
if echo "$RESPONSE" | jq -e \
  '(.data | type == "array")
   and (
     .data | length == 0
     or ([ .[].timestamp ] | . == (sort | reverse))
   )' \
  > /dev/null 2>&1
then
  pass "GET /api/activity-feed — data array sorted by timestamp descending"
else
  fail "GET /api/activity-feed — data array sorted by timestamp descending (got: $(echo "$RESPONSE" | jq -c '{data_type: (.data | type), count: (.data | length)}'  2>/dev/null || echo 'parse error'))"
fi

# ---------------------------------------------------------------------------
# Test 6: GET /api/activity-feed?days=7&type=git-commit — accepted without error
# AC: US-05 v1 note — type param accepted by server but NOT applied server-side;
#     full event list for 7-day window returned regardless of type param
# ---------------------------------------------------------------------------
RESPONSE=$(curl -s "${BASE_URL}/api/activity-feed?days=7&type=git-commit")
if echo "$RESPONSE" | jq -e \
  '(.data | type == "array") and .error == null' \
  > /dev/null 2>&1
then
  pass "GET /api/activity-feed?days=7&type=git-commit — accepted without error; returns data array (type param is not a server-side filter in v1)"
else
  fail "GET /api/activity-feed?days=7&type=git-commit — accepted without error; returns data array (got: $(echo "$RESPONSE" | jq -c '{data_type: (.data | type), error}'))"
fi

# ---------------------------------------------------------------------------
# Test 7: GET /api/agents — each record has switchboardStatus in known set
# AC: US-06 agent status panel; switchboardStatus must never be null
# ---------------------------------------------------------------------------
RESPONSE=$(curl -s "${BASE_URL}/api/agents")
if echo "$RESPONSE" | jq -e \
  '(.data | type == "array")
   and (.data | all(
     .switchboardStatus == "online"
     or .switchboardStatus == "offline"
     or .switchboardStatus == "unknown"
   ))' \
  > /dev/null 2>&1
then
  pass "GET /api/agents — data array; every record has switchboardStatus of 'online', 'offline', or 'unknown'"
else
  fail "GET /api/agents — data array; every record has switchboardStatus of 'online', 'offline', or 'unknown' (got: $(echo "$RESPONSE" | jq -c '{data_type: (.data | type), invalid: [.data[] | select(.switchboardStatus != "online" and .switchboardStatus != "offline" and .switchboardStatus != "unknown") | {name, switchboardStatus}]}'  2>/dev/null || echo 'parse error'))"
fi

# ---------------------------------------------------------------------------
# Test 8: GET /api/open-work — HALTs severity: 'red'; all others severity: 'normal'
# AC: US-07 open work tracker; HALT items must carry red severity
# ---------------------------------------------------------------------------
RESPONSE=$(curl -s "${BASE_URL}/api/open-work")
if echo "$RESPONSE" | jq -e \
  '(.data | type == "array")
   and (.data | all(
     if .type == "halt"
     then .severity == "red"
     else .severity == "normal"
     end
   ))' \
  > /dev/null 2>&1
then
  pass "GET /api/open-work — data array; HALTs have severity 'red'; all other items have severity 'normal'"
else
  fail "GET /api/open-work — data array; HALTs have severity 'red'; all other items have severity 'normal' (got: $(echo "$RESPONSE" | jq -c '[.data[] | select(if .type == "halt" then .severity != "red" else .severity != "normal" end) | {type, severity}]'  2>/dev/null || echo 'parse error'))"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL=$((PASS + FAIL))
echo ""
echo "${PASS}/${TOTAL} tests passed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
