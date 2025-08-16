#!/bin/bash

# Test script for the agent API endpoint
# Usage: ./scripts/test-agent.sh

SERVER_URL="http://localhost:3000"
API_ENDPOINT="$SERVER_URL/api/agent"

echo "🧪 Testing Agent API Endpoint"
echo "================================"

# Test data
USER_ID="test-user-123"
SESSION_ID="test-session-456"
PROMPT="What's in this image? Can you analyze it for me?"

# Create a simple test image (base64 encoded 1x1 pixel PNG)
TEST_IMAGE_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

echo "📤 Sending request to: $API_ENDPOINT"
echo "👤 User ID: $USER_ID"
echo "🔗 Session ID: $SESSION_ID"
echo "💬 Prompt: $PROMPT"
echo ""

# Make the API call
response=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"prompt\": \"$PROMPT\",
    \"user_id\": \"$USER_ID\",
    \"sessionID\": \"$SESSION_ID\",
    \"image\": \"data:image/png;base64,$TEST_IMAGE_BASE64\"
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
  
  # Test a follow-up message in the same session
  echo "🔄 Testing follow-up message..."
  echo "==============================="
  
  followup_response=$(curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{
      \"prompt\": \"Can you tell me more about what you just analyzed?\",
      \"user_id\": \"$USER_ID\",
      \"sessionID\": \"$SESSION_ID\",
      \"image\": \"data:image/png;base64,$TEST_IMAGE_BASE64\"
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
