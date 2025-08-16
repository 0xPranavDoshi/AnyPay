#!/bin/bash

# Test script for the agent API endpoint
# Usage: ./scripts/test-agent.sh

SERVER_URL="http://localhost:3000"
API_ENDPOINT="$SERVER_URL/api/agent"

echo "🧪 Testing Agent API Endpoint"
echo "================================"

# Test data
USER_ID="test-user-123"
SESSION_ID="test-session-$(date +%s)" # Generate unique session ID based on timestamp
PROMPT="What's in this image? Can you analyze it for me?"

# Read and encode tom.jpg image
IMAGE_PATH="$(dirname "$0")/tom.jpg"
if [ ! -f "$IMAGE_PATH" ]; then
  echo "❌ Error: tom.jpg not found at $IMAGE_PATH"
  exit 1
fi

echo "📸 Using image: $IMAGE_PATH"
TEST_IMAGE_BASE64=$(base64 -i "$IMAGE_PATH")

echo "📤 Sending request to: $API_ENDPOINT"
echo "👤 User ID: $USER_ID"
echo "🔗 Session ID: $SESSION_ID"
echo "💬 Prompt: $PROMPT"
echo ""

# Make the API call (FIRST PROMPT with fresh session)
response=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"prompt\": \"$PROMPT\",
    \"user_id\": \"$USER_ID\",
    \"sessionID\": \"$SESSION_ID\",
    \"image\": \"data:image/jpeg;base64,$TEST_IMAGE_BASE64\",
    \"refresh_session\": true
  }")

# Check if request was successful
if [ $? -eq 0 ]; then
  echo "✅ Response received:"
  echo "===================="
  echo "$response" | jq . 2>/dev/null || echo "$response"
  echo ""
  
  # Extract and display just the AI response text
  ai_response=$(echo "$response" | jq -r '.response.text' 2>/dev/null)
  if [ "$ai_response" != "null" ] && [ "$ai_response" != "" ]; then
    echo "🤖 AI Response:"
    echo "==============="
    echo "$ai_response"
    echo ""
  fi
  
  # Test a follow-up message in the same session (TEXT ONLY - testing simpler follow-up)
  echo "🔄 Testing follow-up message..."
  echo "==============================="
  echo "📝 Follow-up prompt (text only - simple question about previous analysis)"
  echo "⏳ Waiting 3 seconds to avoid rate limiting..."
  sleep 3
  
  followup_response=$(curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{
      \"prompt\": \"What color are Tom's eyes in the image?\",
      \"user_id\": \"$USER_ID\",
      \"sessionID\": \"$SESSION_ID\"
    }")
  
  echo "✅ Follow-up response:"
  echo "======================"
  echo "$followup_response" | jq . 2>/dev/null || echo "$followup_response"
  
  followup_ai_response=$(echo "$followup_response" | jq -r '.response.text' 2>/dev/null)
  if [ "$followup_ai_response" != "null" ] && [ "$followup_ai_response" != "" ]; then
    echo ""
    echo "🤖 Follow-up AI Response:"
    echo "========================="
    echo "$followup_ai_response"
  fi
  
else
  echo "❌ Request failed!"
  echo "Response: $response"
fi

echo ""
echo "🏁 Test completed!"
