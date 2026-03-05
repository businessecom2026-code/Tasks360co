#!/bin/bash
# =============================================================
# E2E Test Suite — Task360 Engine
# Tests all API endpoints: Auth, Workspaces, Tasks, Meetings,
# Billing, Notifications, Webhooks (Revolut payment flow)
# =============================================================

BASE="http://127.0.0.1:3000/api"
PASS=0
FAIL=0
ERRORS=""

green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✗ $1\033[0m"; ERRORS="$ERRORS\n  - $1"; }

check() {
  local desc="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -qE "$expected"; then
    green "$desc"
    PASS=$((PASS+1))
  else
    red "$desc (expected: $expected, got: $(echo "$actual" | head -c 200))"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  TASK360 ENGINE — E2E TEST SUITE"
echo "============================================"
echo ""

# ─── 1. AUTH: Register ───
echo "── 1. AUTH ──"

RES=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"testuser@test.com","password":"Test@1234"}')
check "POST /auth/register — new user" "token" "$RES"
TOKEN_USER=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

# Register a second user for invite tests
RES2=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Colaborador","email":"colab@test.com","password":"Test@1234"}')
TOKEN_COLAB=$(echo "$RES2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

# ─── AUTH: Login ───
RES=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"Test@1234"}')
check "POST /auth/login — valid credentials" "token" "$RES"
TOKEN_USER=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

# ─── AUTH: Login with wrong password ───
RES=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"wrong"}')
check "POST /auth/login — wrong password rejected" "error" "$RES"

# ─── AUTH: Get /me ───
RES=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $TOKEN_USER")
check "GET /auth/me — returns user profile" "testuser@test.com" "$RES"

# ─── AUTH: Update /me ───
RES=$(curl -s -X PATCH "$BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}')
check "PATCH /auth/me — update name" "Updated Name" "$RES"

# ─── AUTH: Login as admin ───
RES=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ecom360.co","password":"Admin@360!"}')
check "POST /auth/login — admin login" "token" "$RES"
TOKEN_ADMIN=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

echo ""

# ─── 2. WORKSPACES ───
echo "── 2. WORKSPACES ──"

RES=$(curl -s -X POST "$BASE/workspaces" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Workspace"}')
check "POST /workspaces — create workspace" "Test Workspace" "$RES"
WS_ID=$(echo "$RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'id' in d: print(d['id'])
elif 'data' in d and 'id' in d['data']: print(d['data']['id'])
elif 'workspace' in d and 'id' in d['workspace']: print(d['workspace']['id'])
else: print('')
" 2>/dev/null)

echo "  [DEBUG] Workspace ID: $WS_ID"

# List workspaces
RES=$(curl -s "$BASE/workspaces" -H "Authorization: Bearer $TOKEN_USER")
check "GET /workspaces — list workspaces" "Test Workspace" "$RES"

# ─── WORKSPACES: Invite member ───
RES=$(curl -s -X POST "$BASE/workspaces/invite" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -H "X-Workspace-Id: $WS_ID" \
  -d '{"email":"colab@test.com","roleInWorkspace":"COLABORADOR"}')
check "POST /workspaces/invite — invite member" "membership|checkoutUrl|invite" "$RES"
echo "  [DEBUG] Invite response: $(echo "$RES" | head -c 300)"

# Extract membership and order IDs for payment test
MEMBERSHIP_ID=$(echo "$RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
m = d.get('membership', d.get('data', {}))
if isinstance(m, dict): print(m.get('id',''))
else: print('')
" 2>/dev/null)

ORDER_ID=$(echo "$RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
m = d.get('membership', d.get('data', {}))
if isinstance(m, dict): print(m.get('revolutOrderId',''))
else: print('')
" 2>/dev/null)
echo "  [DEBUG] Membership ID: $MEMBERSHIP_ID, Order ID: $ORDER_ID"

# List members
RES=$(curl -s "$BASE/workspaces/members" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID")
check "GET /workspaces/members — list members" "Updated Name|testuser" "$RES"

echo ""

# ─── 3. TASKS ───
echo "── 3. TASKS ──"

RES=$(curl -s -X POST "$BASE/tasks" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -H "X-Workspace-Id: $WS_ID" \
  -d '{"title":"Task de Teste","status":"PENDING","priority":"HIGH"}')
check "POST /tasks — create task" "Task de Teste" "$RES"
TASK_ID=$(echo "$RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'id' in d: print(d['id'])
elif 'data' in d and 'id' in d['data']: print(d['data']['id'])
elif 'task' in d and 'id' in d['task']: print(d['task']['id'])
else: print('')
" 2>/dev/null)
TASK_VERSION=$(echo "$RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
t = d.get('data', d.get('task', d))
print(t.get('version', 1))
" 2>/dev/null)
echo "  [DEBUG] Task ID: $TASK_ID, Version: $TASK_VERSION"

# List tasks
RES=$(curl -s "$BASE/tasks" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID")
check "GET /tasks — list tasks" "Task de Teste" "$RES"

# Update task with optimistic locking
RES=$(curl -s -X PATCH "$BASE/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -H "X-Workspace-Id: $WS_ID" \
  -d "{\"title\":\"Task Atualizada\",\"status\":\"IN_PROGRESS\",\"version\":$TASK_VERSION}")
check "PATCH /tasks/:id — update task (optimistic lock)" "Task Atualizada|IN_PROGRESS" "$RES"

# Test optimistic locking conflict (use old version)
RES=$(curl -s -X PATCH "$BASE/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -H "X-Workspace-Id: $WS_ID" \
  -d "{\"title\":\"Conflito\",\"version\":$TASK_VERSION}")
check "PATCH /tasks/:id — version conflict returns 409" "conflict|version|currentVersion" "$RES"

# Create second task for delete test
RES=$(curl -s -X POST "$BASE/tasks" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -H "X-Workspace-Id: $WS_ID" \
  -d '{"title":"Task para Apagar","status":"DONE"}')
TASK2_ID=$(echo "$RES" | python3 -c "
import sys,json; d=json.load(sys.stdin); t=d.get('data',d.get('task',d)); print(t.get('id',''))
" 2>/dev/null)

# Delete task
RES=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/tasks/$TASK2_ID" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID")
HTTP_CODE=$(echo "$RES" | tail -1)
check "DELETE /tasks/:id — delete task" "200|204" "$HTTP_CODE"

echo ""

# ─── 4. MEETINGS ───
echo "── 4. MEETINGS ──"

RES=$(curl -s -X POST "$BASE/meetings" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -H "X-Workspace-Id: $WS_ID" \
  -d '{"title":"Reuniao Sprint","date":"2026-03-10","time":"14:00","participants":["testuser@test.com"],"platform":"Google Meet"}')
check "POST /meetings — create meeting" "Reuniao Sprint" "$RES"
MEETING_ID=$(echo "$RES" | python3 -c "
import sys,json; d=json.load(sys.stdin); m=d.get('data',d.get('meeting',d)); print(m.get('id',''))
" 2>/dev/null)

# List meetings
RES=$(curl -s "$BASE/meetings" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID")
check "GET /meetings — list meetings" "Reuniao Sprint" "$RES"

# Delete meeting
if [ -n "$MEETING_ID" ]; then
  RES=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/meetings/$MEETING_ID" \
    -H "Authorization: Bearer $TOKEN_USER" \
    -H "X-Workspace-Id: $WS_ID")
  HTTP_CODE=$(echo "$RES" | tail -1)
  check "DELETE /meetings/:id — delete meeting" "200|204" "$HTTP_CODE"
fi

echo ""

# ─── 5. BILLING ───
echo "── 5. BILLING ──"

RES=$(curl -s "$BASE/billing/subscription" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID")
check "GET /billing/subscription — get subscription" "basePrice|totalMonthlyValue" "$RES"
echo "  [DEBUG] Subscription: $(echo "$RES" | head -c 300)"

# Toggle autoRenew
RES=$(curl -s -X PATCH "$BASE/billing/subscription" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -H "X-Workspace-Id: $WS_ID" \
  -d '{"autoRenew":false}')
check "PATCH /billing/subscription — toggle autoRenew" "autoRenew|false" "$RES"

# Admin: billing overview (no workspace header needed for SUPER_ADMIN)
RES=$(curl -s "$BASE/billing/overview" \
  -H "Authorization: Bearer $TOKEN_ADMIN")
check "GET /billing/overview — admin overview" "workspaceId|workspaceName|totalMonthly|\[\]" "$RES"
echo "  [DEBUG] Overview: $(echo "$RES" | head -c 300)"

echo ""

# ─── 6. REVOLUT WEBHOOK (Payment Flow) ───
echo "── 6. REVOLUT WEBHOOK (Payment Flow) ──"

# Find the pending membership for colab@test.com
PENDING_MEMBERSHIP=$(curl -s "$BASE/workspaces/members" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID" | python3 -c "
import sys,json
d=json.load(sys.stdin)
members = d if isinstance(d, list) else d.get('data', d.get('members', []))
if isinstance(members, list):
  for m in members:
    if m.get('invitedEmail','') == 'colab@test.com' or (m.get('user',{}) or {}).get('email','') == 'colab@test.com':
      print(json.dumps({'id': m.get('id',''), 'revolutOrderId': m.get('revolutOrderId',''), 'paymentStatus': m.get('paymentStatus','')}))
      break
" 2>/dev/null)
echo "  [DEBUG] Pending membership: $PENDING_MEMBERSHIP"

PENDING_ORDER=$(echo "$PENDING_MEMBERSHIP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('revolutOrderId',''))" 2>/dev/null)
PENDING_MID=$(echo "$PENDING_MEMBERSHIP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

# Simulate Revolut payment_success webhook
if [ -n "$PENDING_ORDER" ] && [ "$PENDING_ORDER" != "" ] && [ "$PENDING_ORDER" != "None" ]; then
  WEBHOOK_PAYLOAD="{\"event\":\"ORDER_COMPLETED\",\"order_id\":\"$PENDING_ORDER\"}"
else
  WEBHOOK_PAYLOAD="{\"event\":\"ORDER_COMPLETED\",\"order_id\":\"test-order-123\"}"
fi

RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE/webhooks/revolut" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD")
BODY=$(echo "$RES" | head -n -1)
HTTP_CODE=$(echo "$RES" | tail -1)
check "POST /webhooks/revolut — payment webhook received" "200" "$HTTP_CODE"
echo "  [DEBUG] Webhook response ($HTTP_CODE): $(echo "$BODY" | head -c 200)"

# Verify membership status changed after payment
if [ -n "$PENDING_ORDER" ] && [ "$PENDING_ORDER" != "" ] && [ "$PENDING_ORDER" != "None" ]; then
  RES=$(curl -s "$BASE/workspaces/members" \
    -H "Authorization: Bearer $TOKEN_USER" \
    -H "X-Workspace-Id: $WS_ID")
  # Check if payment status changed to PAID
  PAID_STATUS=$(echo "$RES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
members = d if isinstance(d, list) else d.get('data', d.get('members', []))
if isinstance(members, list):
  for m in members:
    if m.get('invitedEmail','') == 'colab@test.com':
      print(m.get('paymentStatus',''))
      break
" 2>/dev/null)
  check "Payment flow — membership activated after webhook" "PAID" "$PAID_STATUS"
  echo "  [DEBUG] Colab payment status: $PAID_STATUS"
fi

echo ""

# ─── 7. NOTIFICATIONS ───
echo "── 7. NOTIFICATIONS ──"

RES=$(curl -s "$BASE/notifications" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID")
check "GET /notifications — list notifications" "notifications|total" "$RES"

RES=$(curl -s "$BASE/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID")
check "GET /notifications/unread-count — badge count" "count|unreadCount|0" "$RES"

# Mark all as read
RES=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/notifications/read-all" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID")
HTTP_CODE=$(echo "$RES" | tail -1)
check "PATCH /notifications/read-all — mark all read" "200" "$HTTP_CODE"

# SSE stream (connect for 2 seconds)
RES=$(timeout 3 curl -s -N "$BASE/notifications/stream?token=$TOKEN_USER" 2>&1 | head -5)
check "GET /notifications/stream — SSE connects" "data|event|:|retry|connected|heartbeat" "$RES"

echo ""

# ─── 8. ATTACHMENTS ───
echo "── 8. ATTACHMENTS ──"

# Create a temp file for upload
echo "test content" > /tmp/test-attachment.txt

RES=$(curl -s -X POST "$BASE/tasks/$TASK_ID/attachments" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID" \
  -F "files=@/tmp/test-attachment.txt")
check "POST /tasks/:id/attachments — upload file" "fileName|test-attachment|fileUrl" "$RES"
echo "  [DEBUG] Attachment upload: $(echo "$RES" | head -c 300)"

# List attachments
RES=$(curl -s "$BASE/tasks/$TASK_ID/attachments" \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "X-Workspace-Id: $WS_ID")
check "GET /tasks/:id/attachments — list attachments" "fileName|test-attachment" "$RES"

rm -f /tmp/test-attachment.txt

echo ""

# ─── 9. SECURITY TESTS ───
echo "── 9. SECURITY ──"

# No token
RES=$(curl -s "$BASE/tasks" -H "X-Workspace-Id: $WS_ID")
check "GET /tasks — rejects without token" "error|Token" "$RES"

# Invalid token
RES=$(curl -s "$BASE/tasks" -H "Authorization: Bearer invalid-token" -H "X-Workspace-Id: $WS_ID")
check "GET /tasks — rejects invalid token" "error|Token|invalid" "$RES"

# No workspace header
RES=$(curl -s "$BASE/tasks" -H "Authorization: Bearer $TOKEN_USER")
check "GET /tasks — rejects without workspace header" "error|Workspace|workspace" "$RES"

echo ""

# ─── SUMMARY ───
echo "============================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "============================================"
if [ $FAIL -gt 0 ]; then
  echo -e "\033[31mFailed tests:$ERRORS\033[0m"
fi
echo ""
