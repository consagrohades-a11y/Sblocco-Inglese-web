export const ALL_SPEAKING_LEVELS = Object.freeze(['A0','A1','A1+','A2','B1','B1+','B2','C1','C2']);

export const SPEAKING_IMPORTANCE_LABELS = Object.freeze({
  S: 'Core library',
  A: 'High-value',
  B: 'Variation',
});

export const SPEAKING_IMAGE_SUPPORT_LABELS = Object.freeze({
  required: 'Images required',
  recommended: 'Images recommended',
  optional: 'Images optional',
  none: 'Text-first',
});

const PEDAGOGY = {
  "Agree, Disagree, It Depends": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Ask to Unlock": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "recommended",
    "imageGuidance": "A secret-picture variant is strongly recommended for A0–A1."
  },
  "Bad Advice Only": {
    "importance": "B",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Bad Small Talk / Good Small Talk": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Before / During / After": {
    "importance": "A",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Build My Day": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "recommended",
    "imageGuidance": "Timeline icons or small scene images make routines and times easier to process."
  },
  "Build the Perfect...": {
    "importance": "B",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "optional",
    "imageGuidance": "Visual tiles can make design dimensions easier to compare."
  },
  "Change My Mind": {
    "importance": "A",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Conversation Detective": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Conversation Fork": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Conversation Roulette": {
    "importance": "B",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Convince Me": {
    "importance": "A",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Defend the Opposite": {
    "importance": "A",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Describe Without Adjectives": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "optional",
    "imageGuidance": "Images can provide a rich shared target without extra reading."
  },
  "Don’t Say Yes": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Emergency English": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Explain It Without Saying It": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
      "C2"
    ],
    "imageSupport": "optional",
    "imageGuidance": "Picture targets are particularly useful for A0–A2 variants."
  },
  "Explain the Difference": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
      "C2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Explain Your Choice to Someone Who Disagrees": {
    "importance": "A",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Finish My Thought": {
    "importance": "B",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Five Whys": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Guess My Rule": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Interrupt Me Politely": {
    "importance": "A",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Keep It Going": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Make It Less Direct": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Make It More Direct": {
    "importance": "A",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Make It More Specific": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Make It Sound Like a Person": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Make the Choice": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "recommended",
    "imageGuidance": "Option visuals are strongly recommended at A1 and useful when choices are concrete."
  },
  "Micro Roleplay": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Mini Map Mission": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "required",
    "imageGuidance": "Use a simple map or route visual with visible landmarks; text-only legacy items remain compatible."
  },
  "Number Mission": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "recommended",
    "imageGuidance": "Use ticket, menu, timetable, receipt or booking visuals where possible."
  },
  "Odd One Out — Conversation Edition": {
    "importance": "A",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "optional",
    "imageGuidance": "Image sets are useful for concrete A0–A2 variants."
  },
  "One Detail Is False": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "optional",
    "imageGuidance": "Optional image sequences can support story investigation."
  },
  "One Minute, No Escape": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Oops, Fix Me!": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "recommended",
    "imageGuidance": "A visible ticket/order/appointment card makes the correction task clearer."
  },
  "Pass It Back": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Personalise It": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Phrase Auction": {
    "importance": "A",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Picture Detective": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "required",
    "imageGuidance": "Images are the task. Every option needs a real image and accurate non-spoiling alt text."
  },
  "Problem → Options → Decision": {
    "importance": "S",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Quick Pick": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "recommended",
    "imageGuidance": "At A0–A1, illustrated options reduce reading load and speed up choice."
  },
  "Repair the Conversation": {
    "importance": "S",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Say It Three Ways": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Sell Me Something Useless": {
    "importance": "B",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Story Chain | But Something Changes": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "optional",
    "imageGuidance": "Optional visual twist cards can reduce reading and increase spontaneity."
  },
  "Take a Side": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Tell Me What I Mean": {
    "importance": "S",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "The Awkward Silence": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "The Better Question": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "The Complaint Ladder": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "The Forbidden Easy Word": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "The Missing Detail": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "The Missing Question": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "The Unexpected Follow-Up": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Three Clues": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "recommended",
    "imageGuidance": "A target image can support comprehension or be revealed after the guess."
  },
  "Three Questions Deeper": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Tiny Story Builder": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "recommended",
    "imageGuidance": "WHO / WHERE / ACTION work best as visual cards at lower levels."
  },
  "Trade-Off": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
      "C2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Unpopular Opinion": {
    "importance": "B",
    "recommendedLevels": [
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Upgrade That Answer": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Use These 3 Chunks": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "What Are You Assuming?": {
    "importance": "S",
    "recommendedLevels": [
      "B2",
      "C1",
      "C2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "What Changed?": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "recommended",
    "imageGuidance": "Prefer a before/after visual pair, especially at A0–A1."
  },
  "What Happened Just Before?": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2"
    ],
    "imageSupport": "optional",
    "imageGuidance": "A single strange image is an effective narrative stimulus."
  },
  "What Would You Say?": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "What's the Problem?": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Which One Fits?": {
    "importance": "S",
    "recommendedLevels": [
      "A0",
      "A1",
      "A1+",
      "A2"
    ],
    "imageSupport": "optional",
    "imageGuidance": "A small context image can establish the situation quickly."
  },
  "Which One Sounds More Natural?": {
    "importance": "S",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Who Said It?": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "Would You Rather — No Easy Answers": {
    "importance": "A",
    "recommendedLevels": [
      "A2",
      "B1",
      "B2",
      "C1"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  },
  "You Have 30 Seconds": {
    "importance": "S",
    "recommendedLevels": [
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
      "C2"
    ],
    "imageSupport": "none",
    "imageGuidance": "No dedicated imagery is needed; use images only when they materially improve the specific item."
  }
};

const DEFAULT_PEDAGOGY = Object.freeze({
  importance: 'A',
  recommendedLevels: ['A2','B1','B2'],
  imageSupport: 'none',
  imageGuidance: 'Use imagery only when it materially improves comprehension or the game mechanic.',
});

export function resolveSpeakingActivityPedagogy(activityOrTitle) {
  const title = typeof activityOrTitle === 'string'
    ? activityOrTitle.trim()
    : String(activityOrTitle?.title || '').trim();
  return {
    ...DEFAULT_PEDAGOGY,
    ...(PEDAGOGY[title] || {}),
    title,
    supportedLevels: [...ALL_SPEAKING_LEVELS],
  };
}

export function speakingRelevanceForLevel(activityOrTitle, level) {
  const pedagogy = resolveSpeakingActivityPedagogy(activityOrTitle);
  if (!level || level === 'all' || level === 'Mixed') return 'all';
  return pedagogy.recommendedLevels.includes(level) ? 'recommended' : 'adaptable';
}

export function speakingPriorityScore(activityOrTitle, level = 'all') {
  const pedagogy = resolveSpeakingActivityPedagogy(activityOrTitle);
  const importanceScore = pedagogy.importance === 'S' ? 30 : pedagogy.importance === 'A' ? 20 : 10;
  const relevanceScore = speakingRelevanceForLevel(activityOrTitle, level) === 'recommended' ? 5 : 0;
  return importanceScore + relevanceScore;
}
