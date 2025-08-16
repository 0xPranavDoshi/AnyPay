#!/bin/bash

# Test script for the bill splitting agent API endpoint
# Usage: ./scripts/test-agent.sh

SERVER_URL="http://localhost:3000"
API_ENDPOINT="$SERVER_URL/api/agent"

echo "🧪 Testing Bill Splitting Agent API"
echo "==================================="

# Test data  
USER_ID="test-user-123"
SESSION_ID="bill-split-$(date +%s)" # Generate unique session ID based on timestamp
echo "🔗 Session ID: $SESSION_ID (will be reused for all steps)"

# Read and encode receipt image
IMAGE_PATH="$(dirname "$0")/receipt.jpg"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "❌ Error: No test image found at $IMAGE_PATH"
  exit 1
fi

echo "📸 Using image: $IMAGE_PATH"
TEST_IMAGE_BASE64=$(base64 -i "$IMAGE_PATH")

echo "📤 Testing complete bill splitting flow..."
echo "👤 User ID: $USER_ID"
echo ""

# Function to make API call and display response
make_api_call() {
  local prompt="$1"
  local include_image="$2"
  local step_name="$3"
  
  echo "📝 Step: $step_name"
  echo "💬 Prompt: $prompt"
  echo "⏳ Making API call..."
  
  # Create temporary file for JSON payload (to handle large images)
  local temp_file=$(mktemp)
  
  if [ "$include_image" = "true" ]; then
    cat > "$temp_file" << EOF
{
  "prompt": "$prompt",
  "user_id": "$USER_ID",
  "sessionID": "$SESSION_ID",
  "image": "data:image/jpeg;base64,$TEST_IMAGE_BASE64",
  "refresh_session": true
}
EOF
  else
    cat > "$temp_file" << EOF
{
  "prompt": "$prompt",
  "user_id": "$USER_ID",
  "sessionID": "$SESSION_ID"
}
EOF
  fi
  
  response=$(curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d @"$temp_file")
  
  # Clean up temp file
  rm "$temp_file"
  
  if [ $? -eq 0 ]; then
    echo "✅ Response received:"
    
    # Extract and display AI response
    ai_response=$(printf '%s' "$response" | jq -r '.response.text // empty' 2>/dev/null)
    if [ -n "$ai_response" ] && [ "$ai_response" != "null" ]; then
      echo ""
      echo "🤖 AI Response:"
      echo "==============="
      echo "$ai_response"
    else
      echo ""
      echo "⚠️ No AI response text found - checking for errors"
      error_msg=$(printf '%s' "$response" | jq -r '.error // empty' 2>/dev/null)
      if [ -n "$error_msg" ]; then
        echo "❌ Error: $error_msg"
      fi
    fi
    
    # Extract conversation state
    state=$(printf '%s' "$response" | jq -r '.billSplitting.state // empty' 2>/dev/null)
    if [ -n "$state" ] && [ "$state" != "null" ]; then
      echo ""
      echo "🔄 Conversation State: $state"
    fi
    
    # Extract usage information
    usage_prompt=$(printf '%s' "$response" | jq -r '.response.usage.promptTokens // 0' 2>/dev/null)
    usage_completion=$(printf '%s' "$response" | jq -r '.response.usage.completionTokens // 0' 2>/dev/null)
    usage_total=$(printf '%s' "$response" | jq -r '.response.usage.totalTokens // 0' 2>/dev/null)
    
    if [ "$usage_total" != "0" ]; then
      echo ""
      echo "📊 Token Usage: Prompt: $usage_prompt | Completion: $usage_completion | Total: $usage_total"
    fi
    
    # Show payment ID if available
    payment_id=$(printf '%s' "$response" | jq -r '.billSplitting.paymentId // empty' 2>/dev/null)
    if [ -n "$payment_id" ]; then
      echo ""
      echo "💾 Payment saved with ID: $payment_id"
    fi
    
    echo ""
    echo "" # Extra line break
  else
    echo "❌ Request failed!"
    echo "Response: $response"
    return 1
  fi
  
  sleep 2 # Wait between requests
  return 0
}

# Test the complete bill splitting conversation flow

# Step 1: Upload receipt image and start bill splitting
echo "🍽️ STEP 1: Upload receipt and start bill splitting"
echo "================================================="
make_api_call "I want to split this bill. Can you help me analyze this receipt?" "true" "Initial Receipt Analysis"

# Step 2: Provide number of people
echo "👥 STEP 2: Specify number of people"
echo "==================================="
make_api_call "3 people are splitting this bill" "false" "Number of People"

# Step 3: Provide usernames and wallet addresses
echo "👤 STEP 3: Provide user details"
echo "==============================="
make_api_call "alice:0x1234567890abcdef1234567890abcdef12345678, bob:0x9876543210fedcba9876543210fedcba98765432, charlie:0xabcdef1234567890abcdef1234567890abcdef12" "false" "User Information"

# Step 4: Specify who paid the bill
echo "💳 STEP 4: Specify who paid"
echo "==========================="
make_api_call "Alice paid the bill" "false" "Who Paid"

# Step 5: Choose split method
echo "⚖️ STEP 5: Choose split method"
echo "=============================="
make_api_call "Split it equally among everyone" "false" "Split Method"

# Step 6: Confirm the settlement
echo "✅ STEP 6: Confirm settlement"
echo "============================="
make_api_call "confirm" "false" "Confirm Settlement"

echo "🎉 BILL SPLITTING TEST COMPLETED!"
echo "================================="
echo "The agent should have guided you through:"
echo "1. ✅ Receipt analysis"
echo "2. ✅ Number of people"
echo "3. ✅ User information collection"
echo "4. ✅ Payment source identification"
echo "5. ✅ Split method selection"
echo "6. ✅ Settlement confirmation and saving"

echo ""
echo "🏁 Complete bill splitting flow test finished!"
echo "Check the MongoDB 'payments' collection for the saved settlement plan."
