#!/bin/bash
# Seed Supabase questions via REST API directly to avoid any hanging Node clients
set -e

export $(grep -v '^#' .env | xargs)

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    exit 1
fi

API_URL="${VITE_SUPABASE_URL}/rest/v1"
HEADERS="-H apikey:${VITE_SUPABASE_ANON_KEY} -H Authorization:Bearer\ ${VITE_SUPABASE_ANON_KEY} -H Content-Type:application/json -H Prefer:return=representation"

echo "Creating Categories..."

# 1. Multi-Dog Household
cat1_res=$(curl -s -X POST "${API_URL}/categories?on_conflict=slug" \
  $HEADERS \
  -d '{"name": "Multi-Dog Household", "slug": "multi-dog-household"}' \
  --max-time 10)
cat1_id=$(echo $cat1_res | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Cat 1 ID: $cat1_id"

# 2. New Dog Parent
cat2_res=$(curl -s -X POST "${API_URL}/categories?on_conflict=slug" \
  $HEADERS \
  -d '{"name": "New Dog Parent", "slug": "new-dog-parent"}' \
  --max-time 10)
cat2_id=$(echo $cat2_res | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Cat 2 ID: $cat2_id"

# 3. Picky Eater
cat3_res=$(curl -s -X POST "${API_URL}/categories?on_conflict=slug" \
  $HEADERS \
  -d '{"name": "Picky Eater", "slug": "picky-eater"}' \
  --max-time 10)
cat3_id=$(echo $cat3_res | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Cat 3 ID: $cat3_id"

echo ""
echo "Seeding Questions and Linking to Categories..."

add_question() {
  local text="$1"
  local stage="$2"
  local priority="$3"
  local persona="$4"
  local volume="$5"
  local cat_id="$6"

  echo "- Adding question: ${text:0:50}..."
  echo "  Volume: $volume"
  
  # Insert Question
  q_res=$(curl -s -X POST "${API_URL}/questions" \
    $HEADERS \
    -d "{\"text\": \"$text\", \"commerce_stage_primary\": \"$stage\", \"priority\": \"$priority\", \"monthly_volume\": $volume, \"metadata\": {\"persona\": \"$persona\"}}" \
    --max-time 10)
  
  # Check if insertion failed (e.g. duplicate hash). If so, fetch the existing one.
  q_id=$(echo "$q_res" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  if [ -z "$q_id" ]; then
    echo "  (Fetching existing..."
    # simplistic urlencode for text
    encoded_text=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$text'''))")
    q_res=$(curl -s -X GET "${API_URL}/questions?text=eq.${encoded_text}&select=id" $HEADERS --max-time 10)
    q_id=$(echo "$q_res" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  fi

  if [ -n "$q_id" ] && [ -n "$cat_id" ]; then
    # Link to category
    curl -s -X POST "${API_URL}/questions_categories" \
      $HEADERS \
      -d "{\"question_id\": \"$q_id\", \"category_id\": \"$cat_id\"}" \
      --max-time 10 >/dev/null
    echo "  Linked! ID: $q_id"
  else
    echo "  Failed to add or link."
  fi
}

# Multi-Dog Household Questions
add_question "I have a multi-dog household and one of my dogs has bad breath—can you recommend a breath-busting dog treat that most dogs will eat?" "Discovery" "High" "Multi-Dog Household" 2220 "$cat1_id"
add_question "I have a multi-dog household, including a new puppy and a senior dog, and both need a grain-free diet. Are there any PEDIGREE® grain-free kibbles suitable for both?" "Evaluation" "Medium" "Multi-Dog Household" 902 "$cat1_id"
add_question "I need a high-protein breakfast for a busy morning. Which is a better base: Uncle Ben’s Rice or a standard grain mix?" "Evaluation" "Low" "Multi-Dog Household" 360 "$cat1_id"

# New Dog Parent
add_question "Is wet dog food or dry kibble better for my new puppy?" "Evaluation" "High" "Busy New Dog Parent" 4965 "$cat2_id"
add_question "How do I choose the best dog food for my 8-week old golden retriever?" "Discovery" "High" "Busy New Dog Parent" 8354 "$cat2_id"
add_question "My new puppy keeps chewing furniture, what safe dog treats or dental chews do you recommend?" "Conversion" "High" "Busy New Dog Parent" 5677 "$cat2_id"

# Picky Eater
add_question "My dog is a very picky eater and refuses dry kibble. Can you recommend a wet dog food or topper that might entice him?" "Discovery" "High" "Picky-Eater Dog Parent" 3662 "$cat3_id"
add_question "Are PEDIGREE Pouches a good option for a picky dog?" "Evaluation" "Medium" "Picky-Eater Dog Parent" 660 "$cat3_id"
add_question "Where can I buy affordable dog food that a picky eater will actually like?" "Conversion" "Medium" "Picky-Eater Dog Parent" 360 "$cat3_id"

echo ""
echo "Done seeding Supabase via REST."
