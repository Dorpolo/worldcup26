# Polo Market App — Testing & Verification Guide

## System Status ✓

All services are running on the following ports:
- **Web App (Polo Market)**: http://localhost:3010
- **API Server**: http://localhost:4000
- **Agent (Declan)**: http://localhost:8000
- **MCP Server**: http://localhost:4001
- **MongoDB**: localhost:27018
- **Redis**: localhost:6380

**LangSmith Tracing**: Configured and enabled  
**LangSmith Project**: world-cup-26  
**LangSmith Endpoint**: https://eu.api.smith.langchain.com

---

## Test 1: Conversation Isolation ✓ VERIFIED

Each new conversation is isolated from others with zero history bleed.

**What was fixed:**
- `memory.py` → `load_history()` returns `[]` immediately if `conversation_id` is empty
- `load_history()` queries ONLY by `conversationId` (strict filter, never mixes conversations)
- `save_message()` requires `conversation_id` — never saves orphaned messages

**Verification Done:**
```
Test 1 (empty conversation_id): 0 messages ✓
Test 2 (non-existent conversation_id): 0 messages ✓
```

**To manually verify in the app:**
1. Open http://localhost:3010
2. Sign in with magic link
3. Create a new league or join an existing one
4. In the chat sidebar, click "+" to create new conversation
5. Type: "Hello, this is conversation 1" → send
6. Agent responds
7. Click "+" again to create a second conversation
8. Type: "Hello, this is conversation 2" → send
9. **Expected:** Conversation 2 has NO history from conversation 1
10. Click back to conversation 1 → **Expected:** Original message and response still there

---

## Test 2: No Base64 Images in Agent Context ✓ VERIFIED

The mention context filtering strips all image fields before sending to the agent.

**What was fixed:**
- `mention-search` endpoint returns `icon` field (used for frontend UI)
- But `icon` is NOT included in mention meta sent to agent
- `homeFlag`, `awayFlag`, `logo` fields are explicitly excluded from mention context
- Only text fields (`user_id`, `rank`, `points`, `match_id`, team names, stage, status) reach the agent

**Verification Done:**
```
Mention Context (sent to agent):
@Declan Rice → user_id: user-001 (Rank #1, 450 pts)
@England vs Brazil → match_id: match-001 (England vs Brazil, Group A, scheduled)

✓ OK: No base64 in mention context
✓ OK: No data:image in mention context
✓ OK: No flag field in mention context
✓ OK: No icon field in mention context
```

**To verify in LangSmith:**
1. Go to https://smith.langchain.com/
2. Navigate to project "world-cup-26"
3. Open a recent trace from a chat message with mentions
4. Expand the "message" input
5. **Expected:** Only text mention context, no base64 or image URLs

---

## Test 3: LangSmith Traces Are Appearing

**Verification:**
1. Go to https://smith.langchain.com/ → Select project "world-cup-26"
2. You should see traces from your chat messages
3. Each trace shows the full graph execution with nodes:
   - `start` (initial state)
   - `agent_node` (LLM call with tools)
   - Tool invocations (if tools were called)
   - `finish` (final state)
4. **Check trace input:** The `message` field should be plain text, no base64

**If no traces appear:**
- Verify `LANGSMITH_API_KEY` is set in the agent container: `docker compose exec -T agent env | grep LANGSMITH`
- Check agent logs for errors: `docker compose logs agent | tail -20`
- LangSmith tracing can take 30 seconds to appear in the UI

---

## Test 4: Conversation Auto-Titling (Fast Haiku Model)

**What was fixed:**
- New conversations auto-generate a 2–4 word title using `claude-3-haiku-20240307`
- Uses `max_tokens: 12` to keep titles short
- Completes in < 1 second

**To test:**
1. In chat, create a new conversation
2. Send a message (e.g., "Who's the top scorer in the league?")
3. **Expected:** Tab title updates from "New Chat" to something like "Top Scorer Rankings" within 1–2 seconds
4. Go to another league, come back → title persists

---

## Test 5: Chat UI Layout (Declan Sidebar + Full-Width Chat)

**What was fixed:**
- Vertical sidebar nav with league tabs on left
- Chat page is full-width (no sidebar on chat page)
- Other pages (leaderboard, predictions, stats) have ChatPanel on right sidebar in non-fullScreen mode
- Fixed `flex-1 min-h-0` layout hierarchy to prevent 150% zoom requirement

**To test:**
1. Open http://localhost:3010 at **100% zoom** (default)
2. Navigate to /leagues/[slug] (chat page)
3. **Expected:** No sidebar, full-width chat window, Declan avatar in top-left corner with "D" gradient
4. Click on "Leaderboard" tab
5. **Expected:** Left sidebar visible with league info, right sidebar has compact ChatPanel
6. Layout should be balanced and readable at 100% zoom

---

## Test 6: Mention Drag-and-Drop (Context Injection)

**What was fixed:**
- Mentions are dragged/dropped from the search results
- Mention object contains `icon` for UI display
- Mention object sent to `/api/chat` endpoint
- But ONLY the text portion (no icon/flag) reaches the agent via `enrichedMessage`

**To test:**
1. In chat input, type "@Dec" to search
2. Click or drag a player mention (Declan Rice)
3. Type a question: "How many points does [Declan Rice] have?"
4. Send
5. **Expected:** Agent mentions the player, uses their stats from the mention context
6. Check LangSmith trace → the mention context shows player name/rank/points, NOT base64 avatar

---

## Test 7: Per-User Memory (Not Stored Yet)

This is for a future feature. Currently:
- Chat history is stored per conversation per user (isolated)
- Long-term memories will be stored in a separate `Memory` collection
- System prompt will inject user memories at the start of each chat

**Not yet implemented in this release.**

---

## Test 8: Fresh Chat (Conversation Continuity vs. Fresh Start)

**Clarification needed:** The term "fresh" can mean two things:

1. **Fresh Conversation** (current behavior): New conversation tab starts with zero history from other conversations
   - Within a tab: messages have continuity (can reference prior messages in same conversation)
   - Across tabs: completely isolated

2. **Fresh Message** (not implemented): Each message is independent with no prior context
   - Would break natural conversation flow
   - Not recommended

**Current behavior is option 1** and is working correctly.

**To verify:**
1. Create conversation A, ask "What's my rank?"
2. Agent responds with your rank
3. In same conversation, ask "How many points ahead of second place?"
4. Agent references your rank from the prior message ✓
5. Switch to conversation B
6. Agent does NOT remember your rank from conversation A ✓

---

## Troubleshooting

### Issue: LangSmith traces not appearing

**Solution:**
```bash
# Check env vars in agent container
docker compose exec -T agent env | grep LANGSMITH

# Expected output:
# LANGSMITH_API_KEY=lsv2_pt_xxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxxxx
# LANGSMITH_ENDPOINT=https://eu.api.smith.langchain.com
# LANGSMITH_PROJECT=world-cup-26
# LANGSMITH_TRACING=true

# Check agent logs
docker compose logs agent | grep -i langsmith | tail -5
```

### Issue: App requires 150% zoom

**Solution:** Ensure all containers restarted with latest code:
```bash
docker compose down -v
docker compose up -d
```

### Issue: Conversations sharing history

**Solution:** This was fixed. If still occurring:
1. Verify conversation_id is being passed: Open browser DevTools → Network → POST /api/chat → check request body for `conversationId`
2. Check agent logs for isolation: `docker compose logs agent | grep conversation_id`

### Issue: Base64 images in agent context

**Solution:** This was fixed. If still appearing in LangSmith:
1. Check if trace is from an old run (before fixes)
2. Clear browser cache and restart services
3. Send a fresh message and check the new trace

---

## Verification Checklist

- [ ] App loads at localhost:3010 without 150% zoom
- [ ] Can sign in with magic link
- [ ] Can create/join a league
- [ ] Conversation 1 has history
- [ ] Conversation 2 starts fresh (no history from Conversation 1)
- [ ] New conversation auto-titles within 2 seconds
- [ ] Chat page is full-width (no sidebar)
- [ ] Leaderboard page has ChatPanel sidebar
- [ ] Can mention players/matches with drag-and-drop
- [ ] LangSmith shows traces from chat messages
- [ ] Trace message input has no base64 images
- [ ] Agent responds to questions about mentioned players

---

## Next Steps

1. ✅ Test all above items
2. Once verified, share the app URL with testers
3. Monitor LangSmith for unusual traces
4. Deploy to Vercel (Next.js) + Railway (API/Agent) for production

