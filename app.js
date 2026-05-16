"use strict";

const DB_NAME = "secure-coach-local";
const DB_VERSION = 1;
const APP_VERSION = "v1.0.0";
const TOTAL_DAYS = 180;
const SAFETY_NOTE = "Self-guided coaching, not therapy or crisis care. If you might hurt yourself or someone else, call emergency services. In the U.S., call or text 988 for crisis support.";

const app = document.getElementById("app");

let db;
let activeView = "today";
let reminderTimers = [];
let state = {
  profile: null,
  settings: null,
  sessions: [],
  journal: [],
  selfCareLog: {},
  bookmarks: [],
  reminders: {},
  weeklyReviews: []
};

const SELF_CARE_CATEGORIES = [
  "Body care",
  "Emotional care",
  "Environment care",
  "Boundary care",
  "Connection care",
  "Future self care"
];

const SELF_CARE_SUGGESTIONS = [
  "Eat a real meal and drink water before checking for reassurance.",
  "Take a 10-minute walk without using the time to monitor someone else.",
  "Clean one small area so your environment supports your nervous system.",
  "Keep one boundary today without overexplaining it.",
  "Message one safe person for connection that is not about the relationship problem.",
  "Do one task that future you will benefit from tomorrow.",
  "Put the phone away for 30 minutes and return to your own life.",
  "Rest before you try to solve the relationship.",
  "Move your body for five minutes to discharge stress.",
  "Write one sentence of self-respect and act from it.",
  "Choose one essential action and let the rest wait.",
  "Spend 15 quiet minutes in a restorative place without explaining yourself.",
  "Ask one real question before assuming you already know what they mean.",
  "Do one small experiment that supports the life you want to design.",
  "Name one value worth your energy and one worry that is not.",
  "Face one fact kindly and choose the next responsible action."
];

const SELF_CARE_SOURCES = [
  {
    label: "NIMH",
    title: "Caring for Your Mental Health",
    url: "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
    note: "Self-care can support mental health and recovery, while professional care is still important when symptoms worsen."
  },
  {
    label: "CDC",
    title: "Emotional Well-Being",
    url: "https://www.cdc.gov/emotional-well-being/about/index.html",
    note: "Emotional well-being includes dealing with uncertainty, stress, and change."
  },
  {
    label: "WHO",
    title: "Self-care for health and well-being",
    url: "https://www.who.int/news-room/questions-and-answers/item/self-care-for-health-and-well-being",
    note: "Self-care includes actions people take to promote health, maintain health, and cope with illness."
  }
];

const MILESTONES = [
  { days: 1, title: "First Promise Kept", bonus: "Write one sentence thanking yourself for starting." },
  { days: 3, title: "Three-Day Return", bonus: "Choose one pattern you interrupted this week." },
  { days: 7, title: "Week One Anchor", bonus: "Plan one self-care ritual to repeat next week." },
  { days: 14, title: "Two-Week Trust", bonus: "Write how your self-respect is changing." },
  { days: 30, title: "Thirty-Day Foundation", bonus: "Create a personal secure response script." },
  { days: 60, title: "Steady Practice", bonus: "Review what no longer controls you as much." },
  { days: 90, title: "Deepening Security", bonus: "Choose one long-term standard you will keep." },
  { days: 180, title: "Secure Path Completed", bonus: "Write a letter from the version of you who stayed with the work." }
];

const MILESTONE_LETTERS = {
  1: "You started. That matters because change begins when you stop waiting for the relationship to calm you before you care for yourself.",
  3: "You returned more than once. Consistency is not a personality trait here. It is a small choice repeated while life is still imperfect.",
  7: "One week means you have evidence. You can show up for yourself even when a person, mood, or answer feels uncertain.",
  14: "Two weeks gives you a pattern to study. Keep what is working, soften what is harsh, and return to the next honest action.",
  30: "Thirty days is a foundation. You are no longer only learning about security. You are practicing it through your daily choices.",
  60: "Sixty days means the work is becoming part of your life. The goal is not to need nothing. The goal is to stay with yourself while you need.",
  90: "Ninety days is deep practice. Protect the standards, routines, and self-respect that are now proving they can hold you.",
  180: "You completed the path. Keep the notebook open. Security is not a finish line; it is a way of returning to yourself and relating from there."
};

const REWARD_BADGES = [
  { id: "first-session", title: "First Session", goal: "Complete 1 coaching session.", check: () => state.sessions.length >= 1 },
  { id: "three-sessions", title: "Three Returns", goal: "Complete 3 coaching sessions.", check: () => state.sessions.length >= 3 },
  { id: "seven-sessions", title: "Seven-Day Evidence", goal: "Complete 7 coaching sessions.", check: () => state.sessions.length >= 7 },
  { id: "first-journal", title: "Honest Page", goal: "Save your first journal entry.", check: () => state.journal.length >= 1 },
  { id: "five-journals", title: "Pattern Tracker", goal: "Save 5 journal entries.", check: () => state.journal.length >= 5 },
  { id: "first-bookmark", title: "Saved Anchor", goal: "Bookmark a note, script, or exercise.", check: () => state.bookmarks.length >= 1 },
  { id: "weekly-reset", title: "Weekly Reset", goal: "Complete one weekly reset.", check: () => state.weeklyReviews.length >= 1 },
  { id: "self-care-seven", title: "Self-Care Week", goal: "Complete 7 self-care days.", check: () => calculateSelfCareStats().completed >= 7 },
  { id: "steady-streak", title: "Steady Streak", goal: "Reach a 7-day self-care streak.", check: () => calculateSelfCareStats().streak >= 7 }
];

const QUICK_SOS = [
  {
    id: "text",
    title: "I want to text",
    purpose: "Slow the urge before one more message becomes chasing.",
    steps: [
      "Put the phone down for 90 seconds.",
      "Name the fear and the fact separately.",
      "Send one clean message only if it still matters after 20 minutes."
    ],
    script: "I can want connection without proving my worth through another message."
  },
  {
    id: "quiet",
    title: "They went quiet",
    purpose: "Treat silence as information instead of panic.",
    steps: [
      "Do nothing for the first 24 hours unless there is a practical need.",
      "Keep your routine intact.",
      "After 24 hours, send one low-pressure check-in if it still feels appropriate."
    ],
    script: "Hope you are okay. No pressure to talk, just wanted to check in."
  },
  {
    id: "rejected",
    title: "I feel rejected",
    purpose: "Return to self-worth before interpreting the relationship.",
    steps: [
      "Name where rejection lives in the body.",
      "Ask what younger fear may be active.",
      "Choose one action that reminds you your life still belongs to you."
    ],
    script: "This feeling is real, but it is not the full truth of my worth."
  },
  {
    id: "check",
    title: "I want to check or stalk",
    purpose: "Interrupt monitoring and restore self-control.",
    steps: [
      "Close the app or page you want to check.",
      "Move your body for two minutes.",
      "Write what checking is trying to solve and what it will actually cost."
    ],
    script: "Checking gives a short hit of control and a longer loss of peace."
  },
  {
    id: "boundary",
    title: "I need a boundary",
    purpose: "Be soft in tone and firm in standards.",
    steps: [
      "Start with what you understand.",
      "Name what is not okay.",
      "State what you need going forward, then stop."
    ],
    script: "I understand ____. I am not okay with ____. Going forward I need ____."
  }
];

const SITUATION_GUIDES = [
  {
    title: "When they go quiet",
    tags: ["silence", "avoidant", "space", "late reply"],
    purpose: "Respond to distance without panic or punishment.",
    steps: [
      "Do not make silence mean you are worthless.",
      "Give space first, then observe whether repair or return follows.",
      "Keep one normal routine today."
    ],
    script: "I can allow space and still require respectful communication."
  },
  {
    title: "When I want to chase",
    tags: ["texting", "panic", "reassurance", "chasing"],
    purpose: "Stop using pursuit as anxiety relief.",
    steps: [
      "Wait 20 minutes.",
      "Write the fear, fact, and one secure choice.",
      "Send nothing unless the message is clear, necessary, and respectful."
    ],
    script: "I will not negotiate my worth through urgency."
  },
  {
    title: "When I need a boundary",
    tags: ["boundaries", "blocking", "disappearing", "standards"],
    purpose: "Communicate standards without harshness.",
    steps: [
      "Use the formula: I understand X. I am not okay with Y. I need Z.",
      "Do not overexplain after the boundary is clear.",
      "Watch behavior after the boundary."
    ],
    script: "I understand needing space. I am not okay with disappearing. Going forward I need direct communication."
  },
  {
    title: "When I need to let go",
    tags: ["letting go", "breakup", "grief", "release"],
    purpose: "Choose dignity when mutual effort is absent.",
    steps: [
      "Name what you are still hoping will change.",
      "Name what the repeated behavior has already shown.",
      "Choose peace over one more attempt to be chosen."
    ],
    script: "If they can walk away, I can let them walk without abandoning myself."
  },
  {
    title: "When I feel anxious",
    tags: ["anxiety", "trigger", "body", "regulation"],
    purpose: "Regulate before interpreting the relationship.",
    steps: [
      "Breathe slower than the urge.",
      "Name three things you can see, hear, and feel.",
      "Delay any relationship action until your body is calmer."
    ],
    script: "The feeling is urgent. My action does not have to be."
  },
  {
    title: "When I need confidence",
    tags: ["confidence", "self-trust", "discipline", "growth"],
    purpose: "Build confidence through action, not overthinking.",
    steps: [
      "Choose one small promise.",
      "Do it today before confidence arrives.",
      "Record proof so self-trust has evidence."
    ],
    script: "Confidence is built by keeping one promise at a time."
  }
];

const DEFAULT_REMINDERS = {
  enabled: false,
  dailyTime: "09:00",
  eveningTime: "20:30",
  weeklyDay: "Sunday",
  weeklyTime: "18:00"
};

const PHASES = [
  {
    id: "stabilize",
    title: "Stabilize",
    days: [1, 30],
    goal: "Slow down the nervous system before reacting.",
    practice: "pause, name the fear, choose one grounded action"
  },
  {
    id: "understand",
    title: "Understand",
    days: [31, 70],
    goal: "Separate the present moment from old relationship stories.",
    practice: "track patterns, test assumptions, ask cleaner questions"
  },
  {
    id: "practice",
    title: "Practice",
    days: [71, 115],
    goal: "Use secure behavior while emotions are still active.",
    practice: "direct requests, repair, tolerate space, stay self-led"
  },
  {
    id: "strengthen",
    title: "Strengthen",
    days: [116, 150],
    goal: "Build self-trust, boundaries, and emotional independence.",
    practice: "hold standards, reduce checking, choose from values"
  },
  {
    id: "maintain",
    title: "Maintain",
    days: [151, 180],
    goal: "Keep the habits alive after the first strong shift.",
    practice: "weekly review, relapse plan, deeper grounding"
  }
];

const FOCUS_AREAS = {
  anxious: {
    label: "Anxious pursuit",
    keywords: ["anxious", "text", "reply", "respond", "left on read", "cling", "reassurance", "overthink", "abandon", "distance", "quiet", "chase", "obsess"],
    instruction: "Do not chase the feeling. Slow down, name the fear, and take one clean action.",
    examples: [
      "Your partner is slow to reply. The insecure move is to send three more messages. The secure move is to pause, check the facts, and send one clear message later if it still matters.",
      "You notice a colder tone. The insecure move is to assume the relationship is unsafe. The secure move is to ask directly without accusation.",
      "You feel panic after a small change in attention. The secure move is to ground first, then decide whether there is actually a problem to discuss."
    ],
    exercises: [
      "Set a 20-minute timer before sending a second message. During the timer, write the fear and the fact separately.",
      "Write one sentence that asks for clarity without pressure: 'I noticed I felt unsure earlier. Are we okay, or are you just having a full day?'",
      "Practice the one-message rule: say what you mean once, then return to your own day."
    ],
    prompts: [
      "What did I want reassurance to solve today?",
      "What fact did I have, and what story did my anxiety add?",
      "What would I do if I trusted that I can handle the answer?"
    ],
    action: "Send one clean message only if needed, then stop checking for 30 minutes."
  },
  conflict: {
    label: "Conflict repair",
    keywords: ["fight", "argument", "conflict", "anger", "mad", "hurt", "shut down", "avoid", "silent", "repair", "apologize", "defensive", "blame"],
    instruction: "Treat conflict as information, not a verdict on the relationship.",
    examples: [
      "A disagreement gets tense. The insecure move is to prove your point at any cost. The secure move is to slow the pace and name the issue clearly.",
      "Your partner pulls back after a fight. The secure move is to offer repair once, then give space instead of forcing closure.",
      "You feel blamed. The secure move is to ask what part is yours and what part is not yours."
    ],
    exercises: [
      "Write a repair sentence: 'I care about us. My part is ____. What I need next time is ____.'",
      "Before responding, label the emotion under the anger: hurt, fear, shame, disappointment, or confusion.",
      "Use a timeout script: 'I want to handle this well. I need 20 minutes, then I will come back.'"
    ],
    prompts: [
      "What was I protecting during the conflict?",
      "What part of this is mine to own?",
      "What would repair look like without begging or blaming?"
    ],
    action: "Name one repair step and one boundary before continuing the conversation."
  },
  selfWorth: {
    label: "Self-worth",
    keywords: ["not enough", "worth", "value", "ugly", "replace", "better than me", "insecure", "jealous", "compare", "chosen", "unlovable", "rejected"],
    instruction: "Do not let someone else's mood become your measurement of your worth.",
    examples: [
      "Your partner seems distracted. The insecure move is to decide you are less valuable. The secure move is to notice the trigger and return to your own evidence.",
      "You compare yourself to someone else. The secure move is to stop the comparison loop and name one way you showed up with integrity today.",
      "You feel replaceable. The secure move is to ask what you need while remembering that your worth is not on trial."
    ],
    exercises: [
      "Write three pieces of evidence that you are allowed to be loved without performing.",
      "Replace 'I am not enough' with a concrete statement: 'I feel scared right now, and I can still act with self-respect.'",
      "Do one visible act of self-respect today: rest, eat, clean your space, move your body, or keep a boundary."
    ],
    prompts: [
      "Where did I make someone else's behavior mean something about my value?",
      "What would I do today if I believed I was already enough?",
      "What does self-respect ask from me in this situation?"
    ],
    action: "Choose one self-respecting behavior before asking for reassurance."
  },
  boundaries: {
    label: "Boundaries",
    keywords: ["boundary", "people please", "please", "say no", "resent", "drained", "overgive", "needs", "pressure", "control", "space"],
    instruction: "A secure bond does not require you to abandon yourself.",
    examples: [
      "You want to say yes so they stay close. The secure move is to check whether yes is honest before giving it.",
      "You feel resentful after overgiving. The secure move is to identify the boundary you skipped.",
      "Someone pressures you for an answer. The secure move is to take time instead of performing certainty."
    ],
    exercises: [
      "Write one no that is calm and complete: 'I cannot do that tonight. I can talk tomorrow.'",
      "List what you can control, what you can request, and what you must release.",
      "Find the hidden trade: 'I am saying yes because I am afraid of ____.'"
    ],
    prompts: [
      "Where did I trade honesty for closeness?",
      "What boundary would reduce resentment here?",
      "What can I offer without betraying myself?"
    ],
    action: "State one limit clearly without overexplaining it."
  },
  independence: {
    label: "Self-centering",
    keywords: ["healing", "grounding", "center", "independent", "alone", "breakup", "single", "myself", "growth", "continue", "mastered", "maintain"],
    instruction: "Build a life that does not collapse when one relationship feels uncertain.",
    examples: [
      "You wake up scanning for their attention. The secure move is to start with your own routine before checking messages.",
      "You feel lonely. The secure move is to respond to the loneliness directly instead of using the relationship as the only regulator.",
      "You are doing well and want to continue. The secure move is to keep reviewing patterns before stress returns."
    ],
    exercises: [
      "Make a 30-minute self-centering block: movement, cleaning, reading, planning, or seeing someone supportive.",
      "Write the sentence: 'My job today is to stay connected to myself while I stay open to others.'",
      "Choose one value-led action that has nothing to do with your partner."
    ],
    prompts: [
      "Where did I leave myself today?",
      "What part of me needs attention before I seek it from someone else?",
      "What habit keeps me centered when love feels uncertain?"
    ],
    action: "Do one self-led action before checking, asking, or reacting."
  }
};

const COACH_MODULES = {
  stabilize: [
    {
      title: "Stop the spiral",
      instruction: "Your first job is not to solve the relationship. It is to stop feeding the panic.",
      steps: [
        "Put both feet on the floor and lengthen the exhale.",
        "Say the fear in plain words.",
        "Delay the reactive move by 20 minutes."
      ]
    },
    {
      title: "One message rule",
      instruction: "Secure communication says the truth once and lets the other person respond.",
      steps: [
        "Write the message in notes first.",
        "Remove blame, testing, and hidden demands.",
        "Send one clear sentence only if it still matters."
      ]
    },
    {
      title: "Body before meaning",
      instruction: "A dysregulated body will create extreme meanings from small signals.",
      steps: [
        "Name five things you can see.",
        "Relax the jaw and shoulders.",
        "Ask what you know for sure."
      ]
    },
    {
      title: "No emergency from uncertainty",
      instruction: "Uncertainty is uncomfortable, but it is not proof that danger is happening.",
      steps: [
        "Rate the urgency from 1 to 5.",
        "Ask whether action is needed now or later.",
        "Choose the action that protects tomorrow, not just this minute."
      ]
    }
  ],
  understand: [
    {
      title: "Fact versus story",
      instruction: "The facts are usually shorter than the fear story.",
      steps: [
        "Write the observable fact in one line.",
        "Write the meaning your fear added.",
        "Respond only to the fact for now."
      ]
    },
    {
      title: "Trigger map",
      instruction: "Repeated triggers are not random. They point to the place that needs practice.",
      steps: [
        "Name the trigger.",
        "Name the old wound it touches.",
        "Choose one response that is different from the old pattern."
      ]
    },
    {
      title: "Need beneath the strategy",
      instruction: "Chasing, testing, and withdrawing are strategies. Look for the need under them.",
      steps: [
        "Write what you wanted to do.",
        "Ask what need that action was trying to meet.",
        "State the need directly and calmly."
      ]
    },
    {
      title: "Pattern review",
      instruction: "Understanding grows when you review behavior without attacking yourself.",
      steps: [
        "Find one pattern from this week.",
        "Find the cost of that pattern.",
        "Pick one replacement behavior."
      ]
    }
  ],
  practice: [
    {
      title: "Clear request",
      instruction: "A secure request is direct, specific, and does not punish the answer.",
      steps: [
        "Say what happened without exaggerating.",
        "Say how it affected you.",
        "Ask for one concrete change."
      ]
    },
    {
      title: "Repair without collapse",
      instruction: "Repair means owning your part while keeping your self-respect.",
      steps: [
        "Name your part.",
        "Name what matters to you.",
        "Ask how both people can handle it better next time."
      ]
    },
    {
      title: "Space tolerance",
      instruction: "A relationship can have space without abandonment.",
      steps: [
        "Decide how long you will stop checking.",
        "Fill that space with one self-led action.",
        "Return only when your body is calmer."
      ]
    },
    {
      title: "Hard conversation practice",
      instruction: "Do not wait until you are perfect to speak clearly.",
      steps: [
        "Open with care.",
        "Use one issue only.",
        "End with the next practical step."
      ]
    }
  ],
  strengthen: [
    {
      title: "Self-respect first",
      instruction: "The secure choice is the one you can respect after the anxiety passes.",
      steps: [
        "Ask what future you would thank you for.",
        "Choose the action that preserves dignity.",
        "Let short-term discomfort exist."
      ]
    },
    {
      title: "Boundary without apology",
      instruction: "A boundary does not need a long defense to be valid.",
      steps: [
        "State the limit.",
        "State what you can offer.",
        "Stop explaining after the point is clear."
      ]
    },
    {
      title: "Values over monitoring",
      instruction: "Monitoring someone else drains the energy needed to build your own life.",
      steps: [
        "Name the checking behavior.",
        "Name the value you want to practice instead.",
        "Do one visible value-led action."
      ]
    },
    {
      title: "Choose from standards",
      instruction: "Security is not only staying calm. It is choosing relationships that can meet you.",
      steps: [
        "Name what you need consistently.",
        "Notice whether actions match words.",
        "Keep your standard without threatening."
      ]
    }
  ],
  maintain: [
    {
      title: "Relapse plan",
      instruction: "Old patterns may return under stress. Plan the return before it happens.",
      steps: [
        "Name your top warning sign.",
        "Name the first stabilizing action.",
        "Name who or what supports your reset."
      ]
    },
    {
      title: "Weekly review",
      instruction: "Long-term healing needs review, not constant intensity.",
      steps: [
        "List one secure repetition from this week.",
        "List one place you still rushed.",
        "Choose one practice for next week."
      ]
    },
    {
      title: "Deeper self-trust",
      instruction: "Self-trust grows when your actions match your promises to yourself.",
      steps: [
        "Choose one small promise for today.",
        "Make it realistic.",
        "Complete it before seeking reassurance."
      ]
    },
    {
      title: "Stay open and centered",
      instruction: "The goal is not emotional numbness. It is staying connected without losing yourself.",
      steps: [
        "Notice what you feel.",
        "Stay honest about what you need.",
        "Keep one part of the day devoted to your own life."
      ]
    }
  ]
};

const WEEKLY_REVIEW = {
  title: "Weekly secure review",
  instruction: "Today is for review. Healing gets stronger when you can see your repetitions clearly.",
  steps: [
    "Write one moment where you acted more securely than before.",
    "Write one moment where the old pattern still took over.",
    "Choose one small practice to repeat for the next seven days."
  ],
  prompt: "What changed this week, and what still needs repetition?"
};

const LIBRARY = [
  {
    title: "Before sending another text",
    focus: "Anxious pursuit",
    steps: [
      "Put the phone down for 20 minutes.",
      "Write the fear: 'I am afraid that ____.'",
      "Write the fact: 'What I know for sure is ____.'",
      "If a message is still needed, send one clear sentence and stop."
    ],
    script: "I noticed I am feeling unsure. Are we okay, or are you just having a busy day?"
  },
  {
    title: "When your partner gets quiet",
    focus: "Distance and silence",
    steps: [
      "Do not make silence mean rejection immediately.",
      "Ask yourself whether this is a pattern or a single moment.",
      "Ground your body before asking for clarity.",
      "Ask directly without accusing."
    ],
    script: "I noticed you seem quieter today. I do not want to guess. Is something going on, or do you just need space?"
  },
  {
    title: "After conflict",
    focus: "Repair",
    steps: [
      "Regulate before re-entering the conversation.",
      "Own your part without owning everything.",
      "Name what you need next time.",
      "Ask what repair would help both people move forward."
    ],
    script: "I care about how we handle this. My part is ____. Next time I need ____. What would help us repair this?"
  },
  {
    title: "When jealousy hits",
    focus: "Self-worth",
    steps: [
      "Name jealousy as fear, not truth.",
      "Check whether there is actual disrespect or just comparison.",
      "Return to your standards and self-respect.",
      "Ask for reassurance only if there is a real need."
    ],
    script: "I felt insecure earlier. I am working on not making assumptions. Can you give me clarity about ____?"
  },
  {
    title: "When you want to people-please",
    focus: "Boundaries",
    steps: [
      "Pause before saying yes.",
      "Ask whether the yes is honest.",
      "Offer what is real, not what fear demands.",
      "Let discomfort exist without fixing it immediately."
    ],
    script: "I want to be honest. I cannot do that tonight, but I can ____."
  },
  {
    title: "When you are doing better but slipping",
    focus: "Maintenance",
    steps: [
      "Treat the slip as data.",
      "Identify the trigger before judging yourself.",
      "Return to the smallest habit that worked before.",
      "Review your next seven days for pressure points."
    ],
    script: "I am noticing an old pattern. I do not need to panic. I need to return to the next grounded step."
  },
  {
    title: "When you need reassurance",
    focus: "Reassurance without pressure",
    steps: [
      "Ask whether you need connection, clarity, or regulation.",
      "Regulate first if the need is mostly panic.",
      "Ask directly if there is a real relationship need.",
      "Receive the answer without asking the same question five ways."
    ],
    script: "I am feeling a little uncertain and I am working on asking clearly. Can you reassure me about ____?"
  },
  {
    title: "When you want to withdraw",
    focus: "Avoiding shutdown",
    steps: [
      "Notice whether silence is protection or punishment.",
      "Take space without disappearing.",
      "Give a return time.",
      "Come back when you said you would."
    ],
    script: "I care about this conversation. I am overwhelmed and need 30 minutes. I will come back at ____."
  },
  {
    title: "When dating feels uncertain",
    focus: "Early dating",
    steps: [
      "Do not treat early inconsistency as a full identity verdict.",
      "Watch behavior over time.",
      "Keep your routine intact.",
      "Let interest grow through evidence, not fantasy."
    ],
    script: "I like getting to know you. I also move best with consistency, so I pay attention to follow-through."
  },
  {
    title: "When a long-term partner disappoints you",
    focus: "Long-term repair",
    steps: [
      "Name the specific disappointment.",
      "Avoid global words like always and never.",
      "Ask for the repair you actually need.",
      "Watch whether the repair becomes action."
    ],
    script: "When ____ happened, I felt ____. What would help me is ____."
  },
  {
    title: "When healing after a breakup",
    focus: "Breakup grounding",
    steps: [
      "Do not use contact to reopen the wound.",
      "Write what you miss and what was not working.",
      "Protect your nervous system from checking.",
      "Choose one action that returns you to your life."
    ],
    script: "Missing someone does not mean I should abandon myself. Today I return to the next grounded action."
  }
];

const INFLUENCES = [
  {
    author: "Amir Levine and Rachel Heller",
    work: "Attached",
    source: "https://www.attachedthebook.com/",
    theme: "Adult attachment patterns",
    uses: [
      "Help users notice anxious, avoidant, and secure behaviors without turning the labels into identity.",
      "Translate attachment theory into concrete scripts for clarity, reassurance, distance, and repair.",
      "Treat secure behavior as a repeated practice, not a personality type someone either has or lacks."
    ]
  },
  {
    author: "John Gottman and Julie Schwartz Gottman",
    work: "The Seven Principles for Making Marriage Work; Fight Right; Gottman Method Couples Therapy",
    source: "https://www.gottman.com/about/the-gottman-method/",
    theme: "Relationship research, conflict, and repair",
    uses: [
      "Help users notice bids, repair attempts, conflict escalation, and follow-through instead of judging the whole relationship from one hard moment.",
      "Build exercises around calm repair, specific requests, soft starts, and respect during disagreement.",
      "Keep the app focused on behavior that can be observed and practiced, not mind reading."
    ]
  },
  {
    author: "Dr Sue Johnson",
    work: "Hold Me Tight; Emotionally Focused Therapy; Attachment Theory in Practice",
    source: "https://iceeft.com/",
    theme: "Attachment-based couples therapy",
    uses: [
      "Teach users to look underneath protest, shutdown, and criticism for the attachment fear or longing.",
      "Turn conflict into clearer emotional signals: what happened, what it meant, what I need, and what repair would help.",
      "Keep secure connection as a practice of accessibility, responsiveness, and engagement."
    ]
  },
  {
    author: "Kim Bartholomew and Leonard Horowitz",
    work: "Attachment Styles Among Young Adults: A Test of a Four-Category Model",
    source: "https://doi.org/10.1037/0022-3514.61.2.226",
    theme: "Four-category adult attachment model",
    uses: [
      "Ground the attachment tab in secure, anxious/preoccupied, dismissive/avoidant, and fearful/disorganized adult patterns.",
      "Help users distinguish self-view and other-view instead of using labels as insults.",
      "Show how different attachment adaptations create different interpersonal problems and different secure next steps."
    ]
  },
  {
    author: "Cindy Hazan and Phillip Shaver",
    work: "Romantic Love Conceptualized as an Attachment Process",
    source: "https://doi.apa.org/doi/10.1037/0022-3514.52.3.511",
    theme: "Romantic attachment research",
    uses: [
      "Frame adult romantic bonds as attachment systems that can activate fear, pursuit, avoidance, comfort, and repair.",
      "Help users understand why dating or partnership can trigger older safety strategies.",
      "Keep the app focused on building secure behavior inside real romantic pressure."
    ]
  },
  {
    author: "Dr Kristin Neff",
    work: "Self-Compassion research and practices",
    source: "https://self-compassion.org/the-research/",
    theme: "Self-compassion and resilience",
    uses: [
      "Make self-kindness a practical skill when shame, rejection, or comparison is active.",
      "Replace harsh self-attack with honest accountability that does not collapse into self-hate.",
      "Use common humanity and mindful naming so users feel less isolated in difficult emotions."
    ]
  },
  {
    author: "Marsha M. Linehan",
    work: "Dialectical Behavior Therapy and DBT skills training",
    source: "https://sites.uw.edu/dbtclinic/",
    theme: "Emotion regulation and distress tolerance",
    uses: [
      "Give users concrete skills for high-intensity moments before they text, argue, shut down, or self-abandon.",
      "Balance acceptance of the current emotion with one effective action in the present moment.",
      "Separate urges from actions so the user can choose behavior instead of being pulled by panic."
    ]
  },
  {
    author: "Dr Daniel J. Siegel",
    work: "Mindsight and interpersonal neurobiology",
    source: "https://mindsightinstitute.com/about-us/",
    theme: "Self-awareness, integration, and relationships",
    uses: [
      "Help users name inner experience without becoming fused with it.",
      "Connect body, mind, and relationship patterns in simple daily reflections.",
      "Use pause-and-notice exercises so the user can respond from awareness instead of reactivity."
    ]
  },
  {
    author: "Dr Richard C. Schwartz",
    work: "Internal Family Systems; No Bad Parts",
    source: "https://ifs-institute.com/about-us/richard-c-schwartz-phd",
    theme: "Parts work and self-leadership",
    uses: [
      "Treat anxious, avoidant, angry, and shutdown responses as protective parts to understand before redirecting.",
      "Ask what each part is trying to protect, what it fears, and what adult self-led action can happen next.",
      "Reduce shame by helping users relate to inner conflict with curiosity and boundaries."
    ]
  },
  {
    author: "Harriet Lerner, PhD",
    work: "The Dance of Anger; Why Won't You Apologize?",
    source: "https://www.harrietlerner.com/",
    theme: "Anger, boundaries, and apology",
    uses: [
      "Help users read anger as information about boundaries, values, and repeated patterns.",
      "Build scripts that change the user's step in the pattern instead of trying to force the other person to change first.",
      "Teach repair through specific accountability, clear requests, and less overfunctioning."
    ]
  },
  {
    author: "Esther Perel, LMFT",
    work: "Mating in Captivity; Where Should We Begin?",
    source: "https://www.estherperel.com/",
    theme: "Modern relationships, desire, and relational intelligence",
    uses: [
      "Help users hold both closeness and separateness instead of treating distance as automatic danger.",
      "Create prompts about curiosity, story, role, independence, and how pressure changes desire.",
      "Support honest conversation without making one partner responsible for the user's whole identity."
    ]
  },
  {
    author: "Terry Real, LICSW",
    work: "Us; Relational Life Therapy",
    source: "https://www.relationallife.com/",
    theme: "Accountability and relational repair",
    uses: [
      "Keep the user's side of the street visible: what did I do, what impact did it have, and what repair is mine.",
      "Build exercises around moving from protection to connection without dropping boundaries.",
      "Teach that one person can begin changing a pattern by acting with maturity and clarity."
    ]
  },
  {
    author: "Dr Diane Poole Heller",
    work: "The Power of Attachment; DARe",
    source: "https://traumasolutions.com/",
    theme: "Attachment repair and trauma-informed relating",
    uses: [
      "Give users attachment-style language while keeping the focus on moving toward earned security.",
      "Use body-based safety checks before difficult conversations.",
      "Teach that secure attachment grows through repeated experiences of safety, repair, and self-trust."
    ]
  },
  {
    author: "Stan Tatkin, PsyD, MFT",
    work: "Wired for Love; Psychobiological Approach to Couple Therapy",
    source: "https://www.thepactinstitute.com/faculty",
    theme: "Secure functioning in couples",
    uses: [
      "Help users think in terms of a two-person system while still owning their individual behavior.",
      "Build exercises around quick repair, nervous-system awareness, fairness, and mutual protection.",
      "Teach users to notice arousal and threat cues before conversations become unsafe."
    ]
  },
  {
    author: "Tara Brach, PhD",
    work: "Radical Acceptance; Radical Compassion",
    source: "https://www.tarabrach.com/",
    theme: "Mindfulness and compassionate acceptance",
    uses: [
      "Support users in meeting painful emotions without immediately escaping, chasing, or attacking.",
      "Use mindful pauses that name the feeling, soften the body, and choose the next caring action.",
      "Balance acceptance with values-led movement rather than passive resignation."
    ]
  },
  {
    author: "Brene Brown, PhD",
    work: "Daring Greatly; Atlas of the Heart",
    source: "https://brenebrown.com/book/daring-greatly/",
    theme: "Shame, vulnerability, and emotional language",
    uses: [
      "Help users name emotions more precisely so they do not call every discomfort rejection.",
      "Build courage for honest vulnerability without overexposure or emotional dumping.",
      "Teach shame resilience through accurate language, self-respect, and safe connection."
    ]
  },
  {
    author: "Mel Robbins and Sawyer Robbins",
    work: "The Let Them Theory",
    source: "https://www.penguinrandomhouse.com/books/743134/the-let-them-theory-by-mel-robbins/",
    theme: "Control, choice, and response",
    uses: [
      "Separate what other people choose from what the user chooses next.",
      "Reduce chasing, monitoring, proving, and controlling when another person acts differently than hoped.",
      "Turn the focus back to boundaries, standards, and self-led action."
    ]
  },
  {
    author: "Jillian Turecki",
    work: "It Begins with You",
    source: "https://www.jillianturecki.com/book",
    theme: "Self-relationship and accountability",
    uses: [
      "Make the user's relationship with themselves part of every relationship pattern.",
      "Use direct reflection questions that connect love, self-worth, communication, and behavior.",
      "Keep the tone practical: what happened, what did I do, what do I need, what changes now."
    ]
  },
  {
    author: "Gabor Mate",
    work: "The Myth of Normal; In the Realm of Hungry Ghosts; Hold On To Your Kids; When the Body Says No; Scattered Minds",
    source: "https://drgabormate.com/book/",
    theme: "Trauma, stress, attachment, and compassionate self-inquiry",
    uses: [
      "Treat reactions as protective adaptations to understand, not flaws to shame.",
      "Track body signals, hidden stress, emotional suppression, and the cost of abandoning authenticity for attachment.",
      "Build exercises that ask what pain, need, or old survival strategy may be underneath the behavior."
    ]
  },
  {
    author: "Dr Julie Smith",
    work: "Why Has Nobody Told Me This Before?",
    source: "https://books.apple.com/us/book/why-has-nobody-told-me-this-before/id1574160153",
    theme: "Practical emotional skills",
    uses: [
      "Turn emotional spirals into short, concrete coping steps.",
      "Help users name mood, thought, body state, and next action without overcomplicating the moment.",
      "Make mental health skills bite-sized enough to use during relationship stress."
    ]
  },
  {
    author: "Ichiro Kishimi and Fumitake Koga",
    work: "The Courage to Be Disliked",
    source: "https://www.shakespeareandcompany.com/books/the-courage-to-be-disliked",
    theme: "Agency, courage, and separation of tasks",
    uses: [
      "Separate what belongs to the user from what belongs to another person.",
      "Practice acting from values even when approval is not guaranteed.",
      "Reduce people-pleasing by treating discomfort as part of honest living."
    ]
  },
  {
    author: "Charles T. Lee",
    work: "Design Your Good Life",
    source: "https://www.charlestlee.com/design-your-good-life-book-landing-page",
    theme: "Purpose, vision, and life design",
    uses: [
      "Move the user from relationship fixation toward designing a life they respect.",
      "Turn vague healing goals into experiments, routines, and visible next steps.",
      "Ask what kind of life the user is building beyond one relationship outcome."
    ]
  },
  {
    author: "David Brooks",
    work: "How to Know a Person",
    source: "https://www.penguinrandomhouse.com/books/652822/how-to-know-a-person-by-david-brooks/",
    theme: "Deep seeing, listening, and being seen",
    uses: [
      "Teach users to listen for the person in front of them instead of only listening through fear.",
      "Support better questions, less projection, and more accurate understanding.",
      "Balance self-protection with curiosity and real human contact."
    ]
  },
  {
    author: "Susan Cain",
    work: "Quiet: The Power of Introverts in a World That Can't Stop Talking",
    source: "https://susancain.net/book/quiet/",
    theme: "Quiet strength and restorative solitude",
    uses: [
      "Validate users who regulate through quiet, space, depth, and reflection.",
      "Distinguish healthy solitude from avoidant withdrawal.",
      "Encourage restorative niches so users can return to relationships more centered."
    ]
  },
  {
    author: "Nathaniel Branden",
    work: "The Six Pillars of Self-Esteem",
    source: "https://us.macmillan.com/books/9781593971489/thesixpillarsofselfesteem/",
    theme: "Self-esteem as daily practice",
    uses: [
      "Build self-responsibility, self-acceptance, self-assertion, purpose, and integrity into daily work.",
      "Make self-esteem behavioral, not just affirmational.",
      "Help users prove self-respect through repeated choices."
    ]
  },
  {
    author: "Leo Babauta",
    work: "The Power of Less",
    source: "https://books.apple.com/us/book/the-power-of-less/id699048779",
    theme: "Simplicity, limits, and essentials",
    uses: [
      "Reduce overwhelm by choosing one essential action instead of ten emotional reactions.",
      "Keep daily commitments small, visible, and repeatable.",
      "Use limits to protect attention, energy, and healing consistency."
    ]
  },
  {
    author: "Mark Manson",
    work: "The Subtle Art of Not Giving a F*ck",
    source: "https://markmanson.net/books/subtle-art",
    theme: "Values, responsibility, and choosing what matters",
    uses: [
      "Help users stop spending energy on every signal, opinion, or emotional spike.",
      "Ask which problem is worth choosing and which one is just anxiety noise.",
      "Turn responsibility into agency rather than self-blame."
    ]
  },
  {
    author: "Gabor Mate",
    work: "Scattered Minds",
    source: "https://drgabormate.com/book/scattered-minds/",
    theme: "Attention, self-regulation, and compassionate structure",
    uses: [
      "Support users who lose focus when attachment panic or stress takes over.",
      "Use gentle structure rather than shame when attention scatters.",
      "Treat distractibility and impulsive reactions as signals to regulate, not character flaws."
    ]
  },
  {
    author: "Gabor Mate and Daniel Mate",
    work: "The Myth of Normal",
    source: "https://www.penguinrandomhouse.com/books/608273/the-myth-of-normal-by-gabor-mate-md-with-daniel-mate/9780593083888/",
    theme: "Authenticity, culture, stress, and healing",
    uses: [
      "Track where the user trades authenticity for attachment.",
      "Connect emotional suppression, stress, and relational patterns.",
      "Prioritize returning to the self instead of becoming acceptable to everyone."
    ]
  },
  {
    author: "Gabor Mate",
    work: "The Return to Ourselves",
    source: "https://wordery.com/return-to-ourselves-6d-9781683640677",
    theme: "Returning to inherent worth",
    uses: [
      "Help users separate worth from approval, pursuit, achievement, or relationship status.",
      "Use inquiry prompts that lead back to essential value and self-worth.",
      "Frame healing as return, not self-improvement through self-rejection."
    ]
  }
];

const ADDITIONAL_EXERCISE_TRACKS = [
  {
    title: "Warm Clear Stop Protocol",
    lens: "Soft tone, firm standards, and no chasing",
    goal: "Give users exact rules for staying warm without negotiating their worth.",
    exercises: [
      {
        name: "Warm once, clear once, stop",
        steps: [
          "Send one warm message if connection matters.",
          "Send one clear boundary if the behavior needs addressing.",
          "Stop explaining, chasing, or negotiating your worth."
        ],
        prompt: "My warm message is ____. My clear boundary is ____. After that I stop by ____."
      },
      {
        name: "Quiet 24/48 reset",
        steps: [
          "If they go quiet, do nothing for 24 hours.",
          "After 24 hours, send one low-pressure check-in if it still feels appropriate.",
          "If there is no reply for another 48 hours, send nothing and return to your life."
        ],
        prompt: "I can give space without abandoning myself by ____."
      },
      {
        name: "No chase after blocking",
        steps: [
          "Do not chase through other apps.",
          "Write the hurt in your notes, not to them.",
          "If they return, name the boundary once and stop unless they engage maturely."
        ],
        prompt: "Blocking hurts, but chasing it will make me less secure. I will wait by ____."
      },
      {
        name: "Match lightness",
        steps: [
          "If they reach out lightly, respond lightly.",
          "Do not immediately ask for certainty, labels, or explanations.",
          "Watch whether light contact becomes mature follow-through."
        ],
        prompt: "A light response I can send is ____."
      },
      {
        name: "Boundary formula",
        steps: [
          "Start with what you understand.",
          "Name what you are not okay with.",
          "State what you need going forward."
        ],
        prompt: "I understand ____. I am not okay with ____. Going forward I need ____."
      },
      {
        name: "Three-message limit",
        steps: [
          "Send one warm or validating message.",
          "Send one clear need or boundary.",
          "Send one closing message, then stop."
        ],
        prompt: "Message 1: ____. Message 2: ____. Message 3: ____."
      },
      {
        name: "Thirty-day behavior check",
        steps: [
          "List whether blocking, silence, or avoidance reduced.",
          "List whether repair, consistency, and respect increased.",
          "Step back if you are doing all the adapting and becoming less stable."
        ],
        prompt: "The behavior evidence says continue because ____ or step back because ____."
      }
    ]
  },
  {
    title: "Validate Reset Slice",
    lens: "Safe communication under emotional pressure",
    goal: "Help users keep hard talks smaller, safer, and more repairable.",
    exercises: [
      {
        name: "Validate first",
        steps: [
          "Name the part you can understand before defending your position.",
          "Keep validation separate from agreement.",
          "After validation, state your need calmly."
        ],
        prompt: "The part I can validate is ____. My need is ____."
      },
      {
        name: "Reset card",
        steps: [
          "Notice when your wording escalated the moment.",
          "Pause without blaming yourself or them.",
          "Ask to rephrase and start the sentence again."
        ],
        prompt: "I did not say that the best way. Can I rephrase it as ____?"
      },
      {
        name: "Slice it thinner",
        steps: [
          "Do not solve the whole history at once.",
          "Name the single issue directly in front of you.",
          "Validate that part and choose one next step."
        ],
        prompt: "I do want to talk about this. First I want to address ____."
      },
      {
        name: "Safe space to be messy",
        steps: [
          "Allow imperfect words without punishing the person for opening.",
          "Ask one clarifying question instead of cross-examining.",
          "Keep both people emotionally safe enough to keep talking."
        ],
        prompt: "A safer response from me would be ____."
      },
      {
        name: "Loving firmness",
        steps: [
          "Remove contempt, punishment, and harshness from the sentence.",
          "Keep the standard intact.",
          "Say it like both people are on the same side."
        ],
        prompt: "A firm but kind version of the truth is ____."
      }
    ]
  },
  {
    title: "Let Go With Dignity",
    lens: "Self-respect, consistency, and choosing peace",
    goal: "Help users stop fighting for someone's love while still honoring real relationship effort.",
    exercises: [
      {
        name: "Emotional bank account",
        steps: [
          "List what you added to the relationship this week.",
          "List what they added through action, repair, care, or consistency.",
          "Notice whether both people are depositing or one person is carrying the account."
        ],
        prompt: "This week I added ____. This week they added ____. The balance shows ____."
      },
      {
        name: "Fight for the relationship, not for love",
        steps: [
          "Name the relationship issue worth working on together.",
          "Name where you are trying to earn being chosen.",
          "Stop performing and return to authenticity."
        ],
        prompt: "I am willing to fight for ____. I will stop fighting to prove ____."
      },
      {
        name: "Let them walk",
        steps: [
          "Name what the other person appears to be choosing.",
          "Release the urge to block their choice.",
          "Choose one action that protects your dignity."
        ],
        prompt: "If they can walk away, I can let them walk by ____."
      },
      {
        name: "Words and actions audit",
        steps: [
          "Write what they say.",
          "Write what they repeatedly do.",
          "Give more weight to the pattern of action."
        ],
        prompt: "The words say ____. The actions show ____. I will respond to ____."
      },
      {
        name: "Peace over winning",
        steps: [
          "Name the argument, proof, or revenge fantasy pulling your energy.",
          "Ask what peace would choose.",
          "Withdraw energy without drama."
        ],
        prompt: "Winning would cost me ____. Peace asks me to ____."
      },
      {
        name: "Standards, not ultimatums",
        steps: [
          "Write the standard in behavior terms.",
          "Remove threats and punishment.",
          "Decide what you will do if the standard is not met."
        ],
        prompt: "My standard is ____. If it is not met, I will ____."
      }
    ]
  },
  {
    title: "Regulate and Reframe",
    lens: "Awareness, cognitive reappraisal, expression, and body care",
    goal: "Help users regulate emotion before interpreting relationship signals.",
    exercises: [
      {
        name: "Recognize the activation",
        steps: [
          "Name what is happening in your body.",
          "Name the emotion without judging it.",
          "Name the urge that wants to take over."
        ],
        prompt: "My body is ____. The emotion is ____. The urge is ____."
      },
      {
        name: "Allow before action",
        steps: [
          "Acknowledge what is happening.",
          "Let yourself feel it without immediately texting, accusing, or withdrawing.",
          "Wait until the emotion is information, not instruction."
        ],
        prompt: "I can allow this feeling without obeying it by ____."
      },
      {
        name: "Flip the script",
        steps: [
          "Write your first interpretation.",
          "Write one alternative interpretation that is still realistic.",
          "Choose the response that fits the facts, not the fear."
        ],
        prompt: "The fear story is ____. A grounded reframe is ____."
      },
      {
        name: "Express, do not bottle",
        steps: [
          "Choose one outlet: journal, movement, sport, drive, music, or trusted person.",
          "Express the emotion there before putting it into the relationship.",
          "Return to the conversation only when your tone is clearer."
        ],
        prompt: "The outlet I will use before reacting is ____."
      },
      {
        name: "Lean and nourish",
        steps: [
          "Reach one safe person or use one creative outlet.",
          "Support the body with food, water, sleep, or movement.",
          "Reassess the issue after your nervous system is supported."
        ],
        prompt: "My support is ____. My body-care action is ____."
      },
      {
        name: "Set the tone early",
        steps: [
          "Choose one morning anchor: meditation, reading, prayer, movement, or planning.",
          "Slow down on caffeine if your system is already activated.",
          "Set one clear intention for forward momentum."
        ],
        prompt: "Today I set the tone by ____. My intention is ____."
      },
      {
        name: "Rest is regulation",
        steps: [
          "Set aside at least 10 percent of the day for real rest if possible.",
          "Choose rest that regulates, not screen time that numbs.",
          "Use the rest before you are already depleted."
        ],
        prompt: "My real rest today is ____. I will protect it by ____."
      },
      {
        name: "Three senses safety check",
        steps: [
          "Pause and slow your breathing.",
          "Name three things you can see, hear, and feel.",
          "Remind yourself that safety also comes from trusting yourself."
        ],
        prompt: "I see ____. I hear ____. I feel ____. I can trust myself because ____."
      },
      {
        name: "Build a trigger recovery plan",
        steps: [
          "Name the trigger that usually takes over your whole day.",
          "Choose one solo regulation tool and one co-regulation option.",
          "Use what works and write it down for next time."
        ],
        prompt: "When I am triggered, I recover by ____ and I can co-regulate with ____."
      },
      {
        name: "Expand the window",
        steps: [
          "If you are shut down or low-energy, up-regulate with safe movement.",
          "Use sport, walking, stretching, cold water, or music to build capacity.",
          "Stop before intensity becomes punishment."
        ],
        prompt: "The movement that expands my capacity today is ____."
      },
      {
        name: "Evening wind-down",
        steps: [
          "Choose one wind-down ritual: journal, stretch, self-hug, breath, or gratitude.",
          "Name three good things from the day.",
          "Let the body learn that the day can close safely."
        ],
        prompt: "Three good things today were ____, ____, and ____."
      }
    ]
  },
  {
    title: "Release Outcome and Return to Self",
    lens: "Attraction as information, grief, and self-return",
    goal: "Help users turn fixation into self-development instead of control or waiting.",
    exercises: [
      {
        name: "Messenger, not the message",
        steps: [
          "Name what the person activated in you.",
          "Name the quality you want to embody yourself.",
          "Choose one action that builds that quality without needing them."
        ],
        prompt: "They activated ____. The quality I need to build is ____. Today I build it by ____."
      },
      {
        name: "Release the outcome",
        steps: [
          "Name the outcome you are trying to control.",
          "Name what control is costing your peace.",
          "Practice one action that returns power to you."
        ],
        prompt: "I release control over ____. I return to myself by ____."
      },
      {
        name: "Grieve without re-opening",
        steps: [
          "Treat the ending or uncertainty as a real loss.",
          "Let the love have somewhere honest to go: journal, therapy, movement, prayer, or trusted support.",
          "Do not use contact as a way to avoid grief."
        ],
        prompt: "The grief I need to face is ____. I will hold it by ____."
      },
      {
        name: "Build the revealed version",
        steps: [
          "Write the version of yourself this connection revealed.",
          "Choose one habit that person would practice.",
          "Do it today without announcing it."
        ],
        prompt: "The version of me I saw was ____. I build him or her today by ____."
      },
      {
        name: "Move silently until solid",
        steps: [
          "Do not announce emotional breakthroughs prematurely.",
          "Build the habit privately until it has evidence.",
          "Let consistency speak before words do."
        ],
        prompt: "The thing I will build quietly is ____."
      }
    ]
  },
  {
    title: "Trust Freedom and Mutual Effort",
    lens: "Trust, voluntary boundaries, and shared relationship effort",
    goal: "Help users distinguish healthy trust from control and attention from intention.",
    exercises: [
      {
        name: "Trust without monitoring",
        steps: [
          "Name the thing you want to control.",
          "Ask what trust would do instead.",
          "Choose the boundary you control if trust is broken."
        ],
        prompt: "I want to control ____. Trust would choose ____. My boundary is ____."
      },
      {
        name: "Attention versus intention",
        steps: [
          "List the attention you are receiving.",
          "List the intention shown through action.",
          "Respond to intention, not chemistry, attention, or panic."
        ],
        prompt: "The attention is ____. The intention is ____. I will respond to ____."
      },
      {
        name: "Freedom with accountability",
        steps: [
          "Name the freedom each person needs.",
          "Name the emotional consideration the relationship requires.",
          "Separate voluntary care from control."
        ],
        prompt: "Freedom looks like ____. Careful accountability looks like ____."
      },
      {
        name: "Use words before damage",
        steps: [
          "Say what feels wrong before silence turns into distance.",
          "Do not make the other person decode your emotions.",
          "Ask for one repair behavior."
        ],
        prompt: "What I need to say clearly is ____."
      },
      {
        name: "Both willing check",
        steps: [
          "Ask whether both people are willing to try.",
          "Look for repair, communication, and behavior change.",
          "If only one person is working, stop calling that mutual effort."
        ],
        prompt: "The evidence of mutual effort is ____."
      }
    ]
  },
  {
    title: "Critical Self-Analysis and Confidence",
    lens: "Self-trust, perfectionism, control, and action-built confidence",
    goal: "Help users examine their own patterns without shame and build confidence through kept promises.",
    exercises: [
      {
        name: "Potential versus reality",
        steps: [
          "Write what you hoped the person could become.",
          "Write what their current behavior consistently shows.",
          "Respond to reality without attacking the hope."
        ],
        prompt: "The potential I loved was ____. The reality I must face is ____."
      },
      {
        name: "Control or vulnerability",
        steps: [
          "Name where you are micromanaging to avoid hurt.",
          "Name the vulnerable truth underneath the control.",
          "Say the truth directly or choose one action that loosens the grip."
        ],
        prompt: "The control is ____. The vulnerable truth is ____."
      },
      {
        name: "Stop expecting you",
        steps: [
          "Name the standard you hold for yourself.",
          "Ask whether the other person has chosen that same standard.",
          "Stop expecting your inner code from someone who has not built it."
        ],
        prompt: "I expect ____ because I would do ____. Their actual standard appears to be ____."
      },
      {
        name: "Confidence through action",
        steps: [
          "Choose one action you are avoiding because you do not feel ready.",
          "Make the action small enough to do today.",
          "Do it before confidence arrives."
        ],
        prompt: "The action that builds confidence is ____."
      },
      {
        name: "Small promise, self-trust",
        steps: [
          "Pick one promise small enough to keep.",
          "Keep it even if your mood changes.",
          "Record the proof so your nervous system learns self-trust."
        ],
        prompt: "Today I kept this promise to myself: ____."
      },
      {
        name: "Perfectionism loses",
        steps: [
          "Name where you are waiting to be perfect.",
          "Choose messy but honest progress.",
          "Treat the mistake as information, not identity."
        ],
        prompt: "I release perfection by doing ____ imperfectly but honestly."
      }
    ]
  },
  {
    title: "Relationship Repair Lab",
    lens: "Repair, accountability, and pattern change",
    goal: "Help users repair conflict without chasing, blaming, overexplaining, or disappearing.",
    exercises: [
      {
        name: "Soft start, clean request",
        steps: [
          "Describe the event in one observable sentence.",
          "Name the feeling without accusation.",
          "Ask for one behavior that would help next time."
        ],
        prompt: "When ____, I felt ____. Next time, what would help me is ____."
      },
      {
        name: "Own your impact",
        steps: [
          "Name what you did, not what they made you do.",
          "Name the likely impact on the other person.",
          "Offer one specific repair without demanding instant forgiveness."
        ],
        prompt: "My part was ____. The impact may have been ____. The repair I can offer is ____."
      },
      {
        name: "Change your step",
        steps: [
          "Write the repeated dance between you and the other person.",
          "Circle the step that belongs to you.",
          "Choose the smallest mature replacement."
        ],
        prompt: "The old dance is ____. My step is ____. Today I replace it with ____."
      }
    ]
  },
  {
    title: "Attachment Bonding Practice",
    lens: "Secure connection under stress",
    goal: "Help users identify attachment needs and move toward safety without pressure or control.",
    exercises: [
      {
        name: "Find the attachment need",
        steps: [
          "Write the surface complaint.",
          "Ask what fear or longing is underneath.",
          "Turn it into a direct need, not a protest."
        ],
        prompt: "The complaint is ____. Underneath, I fear/want ____. The direct need is ____."
      },
      {
        name: "Safety before solving",
        steps: [
          "Notice your body before the conversation.",
          "Lower intensity with breath, posture, water, or a short pause.",
          "Start the conversation only after you can speak without threat."
        ],
        prompt: "My body signal is ____. I lower intensity by ____. Then I can say ____."
      },
      {
        name: "Secure functioning check",
        steps: [
          "Ask whether your next move protects the relationship and your self-respect.",
          "Remove punishment, testing, or disappearing.",
          "Choose one move that is fair, clear, and kind."
        ],
        prompt: "The fair move is ____. It protects connection by ____ and self-respect by ____."
      }
    ]
  },
  {
    title: "Self-Compassion and Regulation",
    lens: "Coping before reacting",
    goal: "Give users concrete regulation tools that reduce shame and increase choice.",
    exercises: [
      {
        name: "Kind accountability",
        steps: [
          "Name what happened honestly.",
          "Remove insults toward yourself.",
          "Choose one repair or next action."
        ],
        prompt: "The truth is ____. I do not need to call myself ____. The next right action is ____."
      },
      {
        name: "Urge is not action",
        steps: [
          "Name the urge: text, check, argue, withdraw, prove, or please.",
          "Rate the intensity from 1 to 10.",
          "Wait 10 minutes and do one body-based regulation action first."
        ],
        prompt: "The urge is ____. Intensity is ____. Before acting, I will ____."
      },
      {
        name: "Name it to hold it",
        steps: [
          "Name the emotion as precisely as possible.",
          "Name where it lives in the body.",
          "Tell yourself what support is needed right now."
        ],
        prompt: "This is not just upset; it is ____. I feel it in ____. I need ____."
      }
    ]
  },
  {
    title: "Parts, Boundaries, and Inner Leadership",
    lens: "Parts, anger, shame, and courage",
    goal: "Help users listen to inner conflict without letting one protective part run the whole life.",
    exercises: [
      {
        name: "Protector interview",
        steps: [
          "Name the part that wants to react.",
          "Ask what it is trying to protect.",
          "Thank it, then choose the adult-led action."
        ],
        prompt: "The part that is active is ____. It protects me from ____. Adult me chooses ____."
      },
      {
        name: "Anger as information",
        steps: [
          "Write what anger is pointing to.",
          "Separate the boundary from the attack.",
          "State the boundary in one clean sentence."
        ],
        prompt: "My anger points to ____. The boundary is ____."
      },
      {
        name: "Shame to courage",
        steps: [
          "Name the shame story.",
          "Name the more accurate story.",
          "Choose one courageous action that is not overexposure."
        ],
        prompt: "The shame story says ____. The accurate story is ____. Courage today is ____."
      }
    ]
  },
  {
    title: "Emotional Toolkit",
    lens: "Practical coping skills",
    goal: "Give the user quick tools for mood, anxiety, thought spirals, and emotional pressure.",
    exercises: [
      {
        name: "Mood, thought, body, action",
        steps: [
          "Name the mood in one word.",
          "Write the thought driving it.",
          "Locate the body sensation.",
          "Choose one action that lowers harm."
        ],
        prompt: "My mood is ____. The thought is ____. My body feels ____. The next helpful action is ____."
      },
      {
        name: "Spiral interruption",
        steps: [
          "Notice the first sign of the spiral.",
          "Stop adding evidence for the fear.",
          "Do one grounding action before making meaning."
        ],
        prompt: "The spiral begins when ____. I interrupt it by ____."
      },
      {
        name: "Tiny coping menu",
        steps: [
          "Choose one body action, one mind action, and one environment action.",
          "Keep each under five minutes.",
          "Use the menu before texting, checking, or arguing."
        ],
        prompt: "My three tiny supports are body: ____, mind: ____, environment: ____."
      }
    ]
  },
  {
    title: "Courage and Task Separation",
    lens: "Agency under disapproval",
    goal: "Help the user act from values without trying to control another person's approval.",
    exercises: [
      {
        name: "Whose task is this?",
        steps: [
          "Write the worry.",
          "Decide what part belongs to you.",
          "Decide what part belongs to the other person.",
          "Act only on your part."
        ],
        prompt: "My task is ____. Their task is ____. I will stop managing ____."
      },
      {
        name: "Courage to be misunderstood",
        steps: [
          "Name the honest action you are avoiding.",
          "Name whose approval you fear losing.",
          "Choose the respectful action anyway."
        ],
        prompt: "I can be kind and still risk being disliked by ____."
      },
      {
        name: "No approval bargain",
        steps: [
          "Find where you are trading self-respect for acceptance.",
          "Write the price of that trade.",
          "Choose one self-respecting move."
        ],
        prompt: "The approval bargain is ____. The price is ____. I choose ____."
      }
    ]
  },
  {
    title: "Good Life Design",
    lens: "Purpose, vision, execution, and impact",
    goal: "Move healing from relationship management into life design.",
    exercises: [
      {
        name: "Life area reset",
        steps: [
          "Pick one life area outside the relationship.",
          "Name what better would look like in seven days.",
          "Choose one small experiment today."
        ],
        prompt: "The life area I am rebuilding is ____. A seven-day experiment is ____."
      },
      {
        name: "Purpose filter",
        steps: [
          "Write the action you want to take.",
          "Ask whether it builds the life you want.",
          "Choose the action that supports your larger vision."
        ],
        prompt: "This action does or does not fit my vision because ____."
      },
      {
        name: "Impact over obsession",
        steps: [
          "Notice the loop you are stuck in.",
          "Name one person, place, or task you can positively impact today.",
          "Do that before returning to the relationship issue."
        ],
        prompt: "I move from obsession to impact by ____."
      }
    ]
  },
  {
    title: "Deep Seeing and Listening",
    lens: "Knowing a person with curiosity",
    goal: "Teach the user to see others accurately without abandoning themselves.",
    exercises: [
      {
        name: "Curiosity before conclusion",
        steps: [
          "Write the conclusion your fear made.",
          "Write two questions that could reveal more truth.",
          "Ask one question without accusation."
        ],
        prompt: "My conclusion was ____. A better question is ____."
      },
      {
        name: "Make them feel seen",
        steps: [
          "Name what the other person may be feeling.",
          "Reflect it without agreeing to something false.",
          "Then state your own need clearly."
        ],
        prompt: "I can see that you may feel ____. I also need ____."
      },
      {
        name: "Projection check",
        steps: [
          "Separate what they actually said from what you heard through fear.",
          "Name the old story that may be coloring it.",
          "Respond to the present person."
        ],
        prompt: "They said ____. My fear heard ____. The present response is ____."
      }
    ]
  },
  {
    title: "Quiet Strength",
    lens: "Introversion, depth, and restorative quiet",
    goal: "Help users value quiet regulation without using silence as avoidance.",
    exercises: [
      {
        name: "Restorative niche",
        steps: [
          "Choose a quiet place or practice that restores you.",
          "Use it before the conversation, not instead of the conversation.",
          "Return with one clear sentence."
        ],
        prompt: "My restorative niche today is ____. After I return, I will say ____."
      },
      {
        name: "Quiet is not disappearance",
        steps: [
          "Name why you need space.",
          "Give a return time.",
          "Come back when you said you would."
        ],
        prompt: "I need quiet because ____. I will return at ____."
      },
      {
        name: "Depth over performance",
        steps: [
          "Stop trying to sound perfectly healed.",
          "Write the simple truth.",
          "Speak slowly and directly."
        ],
        prompt: "The simple truth is ____."
      }
    ]
  },
  {
    title: "Self-Esteem Pillars",
    lens: "Self-esteem as daily action",
    goal: "Make self-esteem measurable through daily choices.",
    exercises: [
      {
        name: "Live consciously",
        steps: [
          "Name what you are avoiding seeing.",
          "Write the fact without drama.",
          "Choose one action based on reality."
        ],
        prompt: "The fact I need to face is ____. The reality-based action is ____."
      },
      {
        name: "Self-assertion sentence",
        steps: [
          "Name the need.",
          "Remove apology and attack.",
          "State it directly."
        ],
        prompt: "I need ____. I can say it as ____."
      },
      {
        name: "Integrity check",
        steps: [
          "Name your value.",
          "Name today's action.",
          "Check whether they match."
        ],
        prompt: "My value is ____. Today's matching action is ____."
      }
    ]
  },
  {
    title: "The Power of Less",
    lens: "Essential action and limits",
    goal: "Use simplicity to reduce emotional overload and improve consistency.",
    exercises: [
      {
        name: "One essential action",
        steps: [
          "List everything you want to fix.",
          "Cross out everything except one essential action.",
          "Do only that action today."
        ],
        prompt: "The one essential action is ____."
      },
      {
        name: "Limit the loop",
        steps: [
          "Set a time limit for thinking about the relationship.",
          "Choose where your attention goes after the timer.",
          "Keep the limit even if the urge returns."
        ],
        prompt: "My limit is ____ minutes. After that I will ____."
      },
      {
        name: "Small habit repeat",
        steps: [
          "Choose a habit that takes under two minutes.",
          "Attach it to something you already do.",
          "Repeat it for seven days."
        ],
        prompt: "After I ____, I will ____."
      }
    ]
  },
  {
    title: "Values and Responsibility",
    lens: "Choose what matters",
    goal: "Help users stop reacting to everything and choose values worth the cost.",
    exercises: [
      {
        name: "What is worth caring about?",
        steps: [
          "Write what is consuming your attention.",
          "Ask whether it matches your values.",
          "Choose what deserves your energy today."
        ],
        prompt: "This deserves my energy because ____. This does not because ____."
      },
      {
        name: "Choose your problem",
        steps: [
          "Name the problem you are trying to avoid.",
          "Name the problem created by avoiding it.",
          "Choose the problem that builds self-respect."
        ],
        prompt: "I choose the problem of ____ because it leads to ____."
      },
      {
        name: "Responsibility without blame",
        steps: [
          "Name what happened.",
          "Do not decide whose fault it is first.",
          "Ask what you are responsible for next."
        ],
        prompt: "I may not control ____, but I am responsible for ____."
      }
    ]
  }
];

const EXERCISE_TRACKS = [
  {
    title: "Attachment Practice",
    lens: "Inspired by adult attachment theory",
    goal: "Recognize your pattern and practice the next secure behavior.",
    exercises: [
      {
        name: "Pattern snapshot",
        steps: [
          "Write what happened in one observable sentence.",
          "Name the attachment move: chase, protest, shut down, test, avoid, or communicate.",
          "Write the secure replacement behavior in one sentence."
        ],
        prompt: "When I feel unsafe in love, my first move is usually ____. The secure move I am practicing is ____."
      },
      {
        name: "Secure script builder",
        steps: [
          "State the situation without blame.",
          "State the feeling without making it the other person's fault.",
          "Ask for one specific behavior or clarity point."
        ],
        prompt: "The clean request is: 'When ____, I feel ____. What would help me is ____.'"
      },
      {
        name: "Anxious-avoidant loop check",
        steps: [
          "Name what you did when you felt distance.",
          "Name what the other person did when they felt pressure.",
          "Pick one way to slow the loop before it escalates."
        ],
        prompt: "The loop is ____. My first interruption point is ____."
      }
    ]
  },
  {
    title: "Let Them / Let Me",
    lens: "Control, choice, and response",
    goal: "Stop using control as anxiety relief and return to what you can choose.",
    exercises: [
      {
        name: "Let them list",
        steps: [
          "Write what the other person is choosing.",
          "Write what you cannot force, convince, monitor, or manage.",
          "Write what you can choose next."
        ],
        prompt: "Let them ____. Let me ____."
      },
      {
        name: "Control detox",
        steps: [
          "Name the checking or controlling behavior.",
          "Name the fear underneath it.",
          "Replace it with one self-led action for the next 30 minutes."
        ],
        prompt: "I am trying to control ____ because I fear ____. I will choose ____ instead."
      },
      {
        name: "Standards without chasing",
        steps: [
          "Write the behavior you want to see consistently.",
          "Write what you will do if it does not appear.",
          "Make the action about your standard, not punishment."
        ],
        prompt: "My standard is ____. If it is not met, I will ____."
      }
    ]
  },
  {
    title: "It Begins With Me",
    lens: "Self-relationship and accountability",
    goal: "Look at your own role without blaming yourself for everything.",
    exercises: [
      {
        name: "My part, their part",
        steps: [
          "Write what belongs to you.",
          "Write what belongs to them.",
          "Write what belongs to the relationship pattern between you."
        ],
        prompt: "My part is ____. Their part is ____. The pattern is ____."
      },
      {
        name: "Self-abandonment check",
        steps: [
          "Name where you ignored your own need.",
          "Name what you hoped to receive by doing that.",
          "Choose one act of self-loyalty today."
        ],
        prompt: "I left myself when ____. I can return to myself by ____."
      },
      {
        name: "Truth without performance",
        steps: [
          "Write the truth you are avoiding.",
          "Remove the performance, apology, or excessive explanation.",
          "Say the truth in one grounded sentence."
        ],
        prompt: "The honest sentence is ____."
      }
    ]
  },
  {
    title: "Body & Trauma Inquiry",
    lens: "Stress, protection, authenticity, and the body",
    goal: "Understand the protective reaction underneath the relationship behavior.",
    exercises: [
      {
        name: "Body signal map",
        steps: [
          "Notice where the feeling lives in your body.",
          "Name the sensation without explaining it.",
          "Ask what the body is trying to protect you from."
        ],
        prompt: "My body feels ____ in my ____. It may be protecting me from ____."
      },
      {
        name: "Authenticity versus attachment",
        steps: [
          "Write what you wanted to say or do honestly.",
          "Write what you did to keep closeness or avoid rejection.",
          "Choose one honest action that is still respectful."
        ],
        prompt: "I traded honesty for closeness when ____. A more authentic action is ____."
      },
      {
        name: "Compassionate why",
        steps: [
          "Name the behavior you do not like.",
          "Ask why it made sense at one point in your life.",
          "Thank the protection, then choose an adult response."
        ],
        prompt: "This behavior once protected me by ____. Today I can protect myself by ____."
      }
    ]
  },
  {
    title: "Secure Communication",
    lens: "Practical relationship behavior",
    goal: "Practice clear communication before, during, and after hard moments.",
    exercises: [
      {
        name: "One-issue conversation",
        steps: [
          "Pick one issue only.",
          "State the impact.",
          "Ask for one concrete next step."
        ],
        prompt: "The one issue is ____. The impact is ____. The next step I am asking for is ____."
      },
      {
        name: "Repair sentence",
        steps: [
          "Own your part.",
          "Name what matters.",
          "Invite repair without begging."
        ],
        prompt: "My part is ____. I care about ____. Can we repair by ____?"
      },
      {
        name: "Reassurance request",
        steps: [
          "Regulate first.",
          "Ask once and clearly.",
          "Let the answer land before asking again."
        ],
        prompt: "I am feeling ____. Could you reassure me about ____?"
      }
    ]
  },
  {
    title: "Self-Improvement Accountability",
    lens: "Daily self-care and self-respect",
    goal: "Make the user's own growth the first commitment, before fixing or managing the relationship.",
    exercises: [
      {
        name: "One promise to myself",
        steps: [
          "Choose one action that improves your life today.",
          "Make it small enough to complete even if emotions are high.",
          "Write proof after you complete it."
        ],
        prompt: "Today I promised myself ____. I completed it by ____."
      },
      {
        name: "Relationship off-center",
        steps: [
          "Name the person or situation taking over your mind.",
          "Name one area of your own life that still needs you today.",
          "Give that area 15 minutes before taking relationship action."
        ],
        prompt: "I am taking the relationship out of the center by giving attention to ____."
      },
      {
        name: "Future self deposit",
        steps: [
          "Pick one action that will make tomorrow easier.",
          "Do it before checking, chasing, or arguing.",
          "Record how it changed your self-respect."
        ],
        prompt: "Future me benefits because today I ____."
      }
    ]
  }
];

const ALL_EXERCISE_TRACKS = [
  ...EXERCISE_TRACKS,
  ...ADDITIONAL_EXERCISE_TRACKS
];

const PHASE_EXERCISE_TRACKS = {
  stabilize: [
    "Regulate and Reframe",
    "Self-Compassion and Regulation",
    "Emotional Toolkit",
    "Body & Trauma Inquiry",
    "Attachment Practice",
    "The Power of Less",
    "Self-Improvement Accountability"
  ],
  understand: [
    "Attachment Practice",
    "Attachment Bonding Practice",
    "Parts, Boundaries, and Inner Leadership",
    "Deep Seeing and Listening",
    "Self-Esteem Pillars",
    "Body & Trauma Inquiry"
  ],
  practice: [
    "Secure Communication",
    "Relationship Repair Lab",
    "Attachment Bonding Practice",
    "Deep Seeing and Listening",
    "Let Them / Let Me",
    "Courage and Task Separation"
  ],
  strengthen: [
    "Self-Improvement Accountability",
    "It Begins With Me",
    "Self-Esteem Pillars",
    "Values and Responsibility",
    "Good Life Design",
    "The Power of Less"
  ],
  maintain: [
    "Values and Responsibility",
    "Good Life Design",
    "Relationship Repair Lab",
    "Quiet Strength",
    "Self-Improvement Accountability",
    "Courage and Task Separation"
  ]
};

const FOCUS_EXERCISE_TRACKS = {
  anxious: [
    "Let Them / Let Me",
    "Self-Compassion and Regulation",
    "Attachment Bonding Practice"
  ],
  conflict: [
    "Secure Communication",
    "Relationship Repair Lab",
    "Deep Seeing and Listening"
  ],
  boundaries: [
    "It Begins With Me",
    "Values and Responsibility",
    "Courage and Task Separation"
  ],
  independence: [
    "Quiet Strength",
    "Good Life Design",
    "The Power of Less"
  ]
};

const MODULE_EXERCISE_TRACKS = {
  "Stop the spiral": [
    "Regulate and Reframe",
    "Self-Compassion and Regulation",
    "Emotional Toolkit",
    "Body & Trauma Inquiry"
  ],
  "One message rule": [
    "Warm Clear Stop Protocol",
    "Let Them / Let Me",
    "Attachment Practice",
    "The Power of Less"
  ],
  "Body before meaning": [
    "Regulate and Reframe",
    "Body & Trauma Inquiry",
    "Self-Compassion and Regulation",
    "Emotional Toolkit"
  ],
  "No emergency from uncertainty": [
    "Release Outcome and Return to Self",
    "Regulate and Reframe",
    "Emotional Toolkit",
    "The Power of Less",
    "Let Them / Let Me"
  ],
  "Fact versus story": [
    "Regulate and Reframe",
    "Attachment Practice",
    "Deep Seeing and Listening",
    "Emotional Toolkit"
  ],
  "Trigger map": [
    "Body & Trauma Inquiry",
    "Parts, Boundaries, and Inner Leadership",
    "Attachment Practice"
  ],
  "Need beneath the strategy": [
    "Attachment Bonding Practice",
    "Parts, Boundaries, and Inner Leadership",
    "Self-Esteem Pillars"
  ],
  "Pattern review": [
    "Attachment Practice",
    "Deep Seeing and Listening",
    "Parts, Boundaries, and Inner Leadership"
  ],
  "Clear request": [
    "Trust Freedom and Mutual Effort",
    "Validate Reset Slice",
    "Secure Communication",
    "Relationship Repair Lab",
    "Attachment Bonding Practice"
  ],
  "Repair without collapse": [
    "Trust Freedom and Mutual Effort",
    "Validate Reset Slice",
    "Relationship Repair Lab",
    "Secure Communication",
    "Self-Compassion and Regulation"
  ],
  "Space tolerance": [
    "Warm Clear Stop Protocol",
    "Let Them / Let Me",
    "Quiet Strength",
    "Attachment Bonding Practice"
  ],
  "Hard conversation practice": [
    "Trust Freedom and Mutual Effort",
    "Validate Reset Slice",
    "Secure Communication",
    "Deep Seeing and Listening",
    "Relationship Repair Lab"
  ],
  "Self-respect first": [
    "Critical Self-Analysis and Confidence",
    "Let Go With Dignity",
    "Self-Improvement Accountability",
    "Self-Esteem Pillars",
    "It Begins With Me"
  ],
  "Boundary without apology": [
    "Critical Self-Analysis and Confidence",
    "Warm Clear Stop Protocol",
    "Let Go With Dignity",
    "It Begins With Me",
    "Values and Responsibility",
    "Courage and Task Separation"
  ],
  "Values over monitoring": [
    "Critical Self-Analysis and Confidence",
    "Trust Freedom and Mutual Effort",
    "Let Go With Dignity",
    "Values and Responsibility",
    "Let Them / Let Me",
    "Good Life Design"
  ],
  "Choose from standards": [
    "Critical Self-Analysis and Confidence",
    "Trust Freedom and Mutual Effort",
    "Warm Clear Stop Protocol",
    "Let Go With Dignity",
    "Self-Esteem Pillars",
    "Values and Responsibility",
    "It Begins With Me"
  ],
  "Relapse plan": [
    "Let Go With Dignity",
    "Values and Responsibility",
    "Self-Improvement Accountability",
    "The Power of Less"
  ],
  "Weekly review": [
    "Warm Clear Stop Protocol",
    "Self-Improvement Accountability",
    "The Power of Less",
    "Good Life Design"
  ],
  "Deeper self-trust": [
    "Critical Self-Analysis and Confidence",
    "Release Outcome and Return to Self",
    "Let Go With Dignity",
    "Self-Esteem Pillars",
    "It Begins With Me",
    "Good Life Design"
  ],
  "Stay open and centered": [
    "Release Outcome and Return to Self",
    "Trust Freedom and Mutual Effort",
    "Quiet Strength",
    "Attachment Bonding Practice",
    "Deep Seeing and Listening"
  ]
};

const EXTRA_NOTES = [
  {
    title: "Care without self-abandonment",
    phaseIds: ["stabilize", "strengthen"],
    moduleTitles: ["Stop the spiral", "Self-respect first"],
    focusKeys: ["anxious", "boundaries"],
    body: "I can care about someone without lowering myself to keep them. I can like them, love them, and still choose dignity. Missing them does not require me to negotiate away my self-respect.",
    prompt: "Where am I confusing love with lowering myself?",
    script: "I care about you, and I still need to stay honest with myself."
  },
  {
    title: "When someone felt like home",
    phaseIds: ["stabilize"],
    moduleTitles: ["Body before meaning", "No emergency from uncertainty"],
    focusKeys: ["anxious", "independence"],
    body: "I could not let go because I did not know how. They felt like home, and home is hard to release. Today I do not shame the attachment, but I also do not let the attachment make every decision for me.",
    prompt: "What part of this person felt like home, and what part of me needs to become home to myself?",
    script: "I can miss what felt safe and still choose the next grounded step."
  },
  {
    title: "Reaching back after space",
    phaseIds: ["practice"],
    moduleTitles: ["Space tolerance", "Repair without collapse"],
    focusKeys: ["conflict", "anxious"],
    body: "Space works best when it has a respectful return. After recentering, the secure move is not punishment or panic. It is a calm invitation to reconnect if both people are open.",
    prompt: "Did space help me return clearer, or am I using it to avoid honesty?",
    script: "I know I asked for space, and I appreciate you respecting that. I have had time to recenter. If you are open to it, I would like to talk and hear how you are doing."
  },
  {
    title: "Energy needs intention",
    phaseIds: ["understand", "strengthen"],
    moduleTitles: ["Fact versus story", "Choose from standards"],
    focusKeys: ["anxious", "boundaries"],
    body: "Relationship energy without relationship intention can confuse the nervous system. Warmth, attention, chemistry, and history are not the same as readiness, consistency, or commitment.",
    prompt: "Am I responding to clear intention or just emotional energy?",
    script: "I am not here to solve unclear feelings with more words. I need behavior that matches intention."
  },
  {
    title: "Emotionally intelligent confrontation",
    phaseIds: ["practice"],
    moduleTitles: ["Clear request", "Hard conversation practice"],
    focusKeys: ["conflict", "boundaries"],
    body: "Powerful confrontation is emotionally intelligent. Use I-statements, not accusations. Say what you notice, how it lands, and what conversation you are asking for.",
    prompt: "How can I say the truth without attacking?",
    script: "I have noticed some changes in how you speak to me. I feel like something is shifting emotionally, and I want us to talk honestly."
  },
  {
    title: "Transparency is data",
    phaseIds: ["practice", "strengthen"],
    moduleTitles: ["Hard conversation practice", "Choose from standards"],
    focusKeys: ["conflict", "boundaries"],
    body: "If someone consistently responds to healthy communication with anger, deflection, or refusal, that is information. You may not be losing a healthy connection; you may be seeing that the person is not available for honest repair right now.",
    prompt: "Am I seeing repair, or am I repeatedly meeting avoidance and defensiveness?",
    script: "I am willing to talk calmly. I am not willing to keep guessing while healthy communication is refused."
  },
  {
    title: "Love cannot carry avoidance forever",
    phaseIds: ["strengthen"],
    moduleTitles: ["Boundary without apology", "Choose from standards"],
    focusKeys: ["conflict", "boundaries"],
    body: "Patience matters, but patience cannot build a meaningful relationship with someone who is committed to avoiding the very thing that creates meaning. Your compassion needs standards, time limits, and evidence of movement.",
    prompt: "Where is patience becoming waiting without change?",
    script: "I can understand your fear, but I cannot build alone."
  },
  {
    title: "Growth rooted in purpose",
    phaseIds: ["maintain"],
    moduleTitles: ["Deeper self-trust", "Stay open and centered"],
    focusKeys: ["independence", "boundaries"],
    body: "I grew because staying the same would have continued a pattern that no longer matched who I am becoming. Some people will feel inspired by growth, some will feel threatened, and some will turn away. None of that changes what I gained: my center, my standards, and the version of me that no longer negotiates with misalignment.",
    prompt: "What version of myself am I no longer willing to return to?",
    script: "My growth is not a reaction to being chosen. It is a commitment to who I am becoming."
  },
  {
    title: "Boundaries give love structure",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Boundary without apology", "Values over monitoring", "Stay open and centered"],
    focusKeys: ["boundaries", "independence"],
    body: "I can care without carrying someone else's weight. I can empathize without absorbing their emotions. I can be kind and still say no. I can be loving and still walk away. Boundaries give love structure; without them, love becomes chaos.",
    prompt: "What emotion am I carrying that is not mine to carry?",
    script: "I care about you, and I am still responsible for staying grounded in myself."
  },
  {
    title: "Consistency of return",
    phaseIds: ["understand", "practice"],
    moduleTitles: ["Pattern review", "Space tolerance"],
    focusKeys: ["anxious", "conflict"],
    body: "Avoidant patterns do not always fight for connection in obvious ways. They may not chase, explain, or overwhelm you with emotion. One useful signal is consistency of return: do they keep finding small ways back, or do they disappear without meaningful movement?",
    prompt: "Am I seeing a real pattern of return, or am I filling in the blanks with hope?",
    script: "I will watch behavior over time instead of forcing one moment to answer everything."
  },
  {
    title: "Normalize small vulnerability",
    phaseIds: ["practice"],
    moduleTitles: ["Space tolerance", "Stay open and centered"],
    focusKeys: ["anxious", "conflict"],
    body: "When someone with avoidant patterns opens even a little, pressure can make them retreat. If the connection is safe and mutual, respond to small vulnerability with steadiness: do not chase intensity, do not turn it into a big emotional event, and do not abandon your standards.",
    prompt: "How can I receive a small opening without pressuring for a full breakthrough?",
    script: "Thank you for sharing that. I am glad you told me."
  },
  {
    title: "Small effort versus breadcrumbs",
    phaseIds: ["practice", "strengthen"],
    moduleTitles: ["Space tolerance", "Choose from standards"],
    focusKeys: ["anxious", "boundaries"],
    body: "Quiet effort and breadcrumbs are not the same. Quiet effort shows movement, respect, and some willingness to stay connected. Breadcrumbs keep you emotionally hooked without responsibility. Your job is to notice the difference without demanding intensity or accepting emptiness.",
    prompt: "Is this small effort connected to growth, or is it just enough to keep me waiting?",
    script: "I can appreciate small effort, and I still need consistency that matches my needs."
  },
  {
    title: "Avoidance is protection, not your worth",
    phaseIds: ["understand", "practice"],
    moduleTitles: ["Need beneath the strategy", "Space tolerance"],
    focusKeys: ["anxious", "conflict"],
    body: "Avoidance is often protection, not rejection and not a measure of your worth. Seeing that can return power to you: you stop personalizing every distance, regulate your body, and choose the healthiest influence you can have without chasing.",
    prompt: "What changes when I see their distance as protection without making it my job to fix?",
    script: "I do not need to chase to prove my value. I can stay calm and observe what is real."
  },
  {
    title: "Progress, not perfection",
    phaseIds: ["understand", "maintain"],
    moduleTitles: ["Pattern review", "Weekly review", "Relapse plan"],
    focusKeys: ["anxious", "conflict", "independence"],
    body: "Progress is not perfection, intensity, or immediate consistency. Real growth often appears in layers: small expansions, temporary retreats, and repeated choices that slowly move in a better direction. Progress must still be visible in behavior, not only imagined as potential.",
    prompt: "What actual behavior shows movement, and what am I only hoping will appear?",
    script: "I will measure direction by patterns, not by one perfect moment."
  },
  {
    title: "Avoidant distance is not always replacement",
    phaseIds: ["understand", "practice"],
    moduleTitles: ["Fact versus story", "Space tolerance"],
    focusKeys: ["anxious", "conflict"],
    body: "When someone with avoidant patterns creates distance, it does not automatically mean they replaced you or stopped caring. Sometimes they are seeking relief from emotional pressure. Stay grounded: do not compete with imaginary alternatives, do not shrink yourself, and do not ignore reality.",
    prompt: "Am I observing the bigger picture, or am I turning space into a story about being replaced?",
    script: "I can notice distance without making it a verdict on my worth."
  },
  {
    title: "Chosen access, not pressure",
    phaseIds: ["practice", "maintain"],
    moduleTitles: ["Space tolerance", "Stay open and centered"],
    focusKeys: ["anxious", "conflict"],
    body: "When someone with avoidant patterns lets you see more of them, it can be a meaningful signal of trust. Do not romanticize silence as proof by itself. Look for presence, repair, respect, and whether closeness becomes safer over time.",
    prompt: "What access is real, and what am I turning into a story because I want certainty?",
    script: "I can receive vulnerability calmly without demanding more than the moment can hold."
  },
  {
    title: "Closeness, discomfort, distance, return",
    phaseIds: ["understand", "practice"],
    moduleTitles: ["Trigger map", "Pattern review", "Space tolerance"],
    focusKeys: ["anxious", "conflict"],
    body: "The avoidant cycle can look like closeness, then discomfort, then distance, then a desire for closeness again. Without awareness it feels unstable. With awareness it becomes information: is the cycle softening, or is it simply repeating without growth?",
    prompt: "Where are we in the cycle, and what would show real effort this time?",
    script: "I will observe the cycle without becoming the cycle."
  },
  {
    title: "Doing less from self-worth",
    phaseIds: ["practice", "strengthen"],
    moduleTitles: ["One message rule", "Space tolerance", "Values over monitoring"],
    focusKeys: ["anxious", "independence"],
    body: "Sometimes doing less is doing more. Not as a strategy to manipulate someone, but as a commitment to stop proving your value. Stand firmly in your worth and let your routine, friendships, goals, and peace keep moving.",
    prompt: "What would I do today if I did not need their response to confirm my value?",
    script: "I do not need to be instantly available, overexplained, or frantic to be worthy of love."
  },
  {
    title: "Grounded presence, not reactive closeness",
    phaseIds: ["practice", "maintain"],
    moduleTitles: ["Space tolerance", "Stay open and centered"],
    focusKeys: ["anxious", "independence"],
    body: "Giving space is not punishment, a test, or silence filled with anxiety. It is managing your own energy while the other person moves through theirs. Reactive closeness is driven by fear. Grounded presence is driven by self-trust.",
    prompt: "Am I giving space from trust, or withholding from fear?",
    script: "I am not disappearing. I am staying centered while the connection has room."
  },
  {
    title: "Information, not panic",
    phaseIds: ["stabilize", "understand"],
    moduleTitles: ["Stop the spiral", "Fact versus story"],
    focusKeys: ["anxious"],
    body: "An unanswered text, withdrawal, or sudden silence does not need to become panic. It is information. Respond from calm, not fear, and hold your dignity while you watch what the pattern shows.",
    prompt: "What is the information, and what is the fear story I added?",
    script: "My worth is not dependent on their proximity or approval."
  },
  {
    title: "Validate, reset, slice thinner",
    phaseIds: ["practice"],
    moduleTitles: ["Clear request", "Repair without collapse", "Hard conversation practice"],
    focusKeys: ["conflict", "boundaries"],
    body: "Validate first. If you say it badly, reset: ask to rephrase. If the conversation gets too big, slice it thinner and address the one thing in front of you. Make room for both people to be messy without making the moment unsafe.",
    prompt: "What is the one part of this conversation that needs attention first?",
    script: "I do want to talk about this. I want to address what is in front of us first."
  },
  {
    title: "Loving firmness beats harshness",
    phaseIds: ["practice", "strengthen", "maintain"],
    moduleTitles: ["Hard conversation practice", "Boundary without apology", "Deeper self-trust"],
    focusKeys: ["conflict", "boundaries", "independence"],
    body: "There is no redeeming value in harshness. Harshness does nothing that loving firmness does not do better. Being harsh to someone, allowing harshness toward you, and being harsh with yourself all damage safety. Be firm, clear, and kind.",
    prompt: "Where can I replace harshness with loving firmness today?",
    script: "Say it like we are on the same side."
  },
  {
    title: "Consistency protects peace",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Choose from standards", "Weekly review"],
    focusKeys: ["boundaries", "independence"],
    body: "A person who is invested protects the connection with consistency. If jealousy, testing, suspicion, or instability becomes more common than care, do not rush to diagnose the motive. Observe the pattern and protect your peace.",
    prompt: "Does this pattern protect peace, or does it keep me emotionally managing the relationship?",
    script: "I can care about the person and still respond to the pattern."
  },
  {
    title: "Affection waves versus rhythms",
    phaseIds: ["understand", "strengthen"],
    moduleTitles: ["Pattern review", "Choose from standards"],
    focusKeys: ["conflict", "boundaries"],
    body: "Affection that appears only after distance, conflict, suspicion, or testing may be compensation rather than steady intimacy. Genuine care becomes a rhythm. Unstable care appears in waves. Watch patterns, not isolated moments.",
    prompt: "Is the affection becoming a stable rhythm, or only arriving after instability?",
    script: "I will not relax my standards because one warm moment interrupts a cold pattern."
  },
  {
    title: "Projection is a hypothesis, not a verdict",
    phaseIds: ["understand", "practice"],
    moduleTitles: ["Fact versus story", "Hard conversation practice"],
    focusKeys: ["conflict"],
    body: "When someone suddenly accuses, suspects, or hints that you are hiding something, projection is possible, but it is still a hypothesis. Do not counterattack. Ask for specifics, stay calm, and let boundaries remove ambiguity.",
    prompt: "What are the facts, what are the accusations, and what boundary would make this clearer?",
    script: "I am willing to clarify facts. I am not willing to live inside vague suspicion."
  },
  {
    title: "Controlled silence is still information",
    phaseIds: ["understand", "practice"],
    moduleTitles: ["Fact versus story", "Space tolerance"],
    focusKeys: ["anxious", "conflict"],
    body: "Silence can feel calm while still being emotionally distant. Do not panic and do not pretend it is automatically peace. Give room, keep your life moving, and observe whether silence becomes repair, honest communication, or more absence.",
    prompt: "Is this silence creating repair, or is it avoiding closure?",
    script: "I can allow space without calling distance intimacy."
  },
  {
    title: "Mirror without chasing",
    phaseIds: ["practice", "strengthen"],
    moduleTitles: ["Space tolerance", "Values over monitoring"],
    focusKeys: ["anxious", "independence"],
    body: "Mirroring means matching tone and rhythm without overinvesting. It is not mimicry, manipulation, or punishment. It is attunement with self-respect: respond selectively, stay calm, and let your own life remain full.",
    prompt: "How can I match the energy without abandoning my own center?",
    script: "I will respond with calm confidence, not impulsive urgency."
  },
  {
    title: "Timing and reengagement",
    phaseIds: ["practice", "maintain"],
    moduleTitles: ["One message rule", "Space tolerance", "Stay open and centered"],
    focusKeys: ["anxious", "independence"],
    body: "Timing is not a rigid formula. It is observation plus regulation. A poorly timed emotional plea can create pressure. A calm, simple message can invite contact without chasing. Reengagement works best when your life is already full.",
    prompt: "Am I reaching out from grounded presence or from panic?",
    script: "I can invite connection without making my peace depend on the response."
  },
  {
    title: "Attraction as a mirror",
    phaseIds: ["understand", "maintain"],
    moduleTitles: ["Need beneath the strategy", "Deeper self-trust"],
    focusKeys: ["anxious", "independence"],
    body: "The person who captures your attention may be showing you a version of yourself you have not embodied yet. That feeling is not only their magic; it can be your potential becoming visible. Use the pull as information, not instruction.",
    prompt: "What part of myself did this person awaken?",
    script: "They may be the messenger, but the work belongs to me."
  },
  {
    title: "Compass, not destination",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Values over monitoring", "Deeper self-trust", "Stay open and centered"],
    focusKeys: ["independence", "anxious"],
    body: "Not every intense connection is meant to stay. Some people awaken the work and then become the compass, not the destination. The task is not always to get them back. Sometimes it is to become the version of yourself they revealed.",
    prompt: "What version of me is this connection asking me to build?",
    script: "I can let the person go and keep the growth."
  },
  {
    title: "Release the outcome",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Values over monitoring", "Deeper self-trust"],
    focusKeys: ["anxious", "independence"],
    body: "Releasing attachment means surrendering the need to control whether they come back, stay away, or choose someone else. This is not giving up on love. It is refusing to let the outcome control your healing.",
    prompt: "What outcome am I still trying to control?",
    script: "I release the outcome and return to the next right action."
  },
  {
    title: "Space reveals depth",
    phaseIds: ["practice", "maintain"],
    moduleTitles: ["Space tolerance", "Stay open and centered"],
    focusKeys: ["anxious", "conflict"],
    body: "Space does not weaken a real connection. It reveals whether depth, effort, and respect are behind it. Silence may stir desire, but desire is not enough; look for repair, clarity, and steady action.",
    prompt: "What did space reveal: depth, effort, respect, or absence?",
    script: "I can give space and still require behavior that respects me."
  },
  {
    title: "Move silently until solid",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Self-respect first", "Deeper self-trust"],
    focusKeys: ["independence", "boundaries"],
    body: "Do not let excitement make you announce things prematurely. Build quietly until the change has roots. Some growth needs privacy before it has strength.",
    prompt: "What am I tempted to announce before it is solid?",
    script: "I will stay low key and let consistency become the announcement."
  },
  {
    title: "Matched emotional safety",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Choose from standards", "Stay open and centered"],
    focusKeys: ["boundaries", "independence"],
    body: "The self-aware, articulate, emotionally intelligent version of you deserves someone who can meet that energy with safety. Not someone you have to convince to treat you carefully.",
    prompt: "Where am I asking someone to become safe instead of noticing whether they are?",
    script: "My emotional depth deserves a relationship that can hold it responsibly."
  },
  {
    title: "Do not wait for pain to kill love",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Relapse plan", "Deeper self-trust"],
    focusKeys: ["anxious", "independence"],
    body: "Waiting for an external event to finally kill your feelings gives someone else's behavior control over your healing. Grieve the loss directly. Use distance, therapy, movement, journaling, and support as self-return, not as a tactic.",
    prompt: "What grief am I avoiding by waiting for one more painful proof?",
    script: "I do not need another wound to begin healing."
  },
  {
    title: "Trust without control",
    phaseIds: ["practice", "strengthen"],
    moduleTitles: ["Values over monitoring", "Choose from standards"],
    focusKeys: ["anxious", "boundaries"],
    body: "Trust that needs constant evidence is fear pretending to be secure. It is better to trust and risk being wrong than to control and lose yourself. If trust is broken, respond with boundaries, not surveillance.",
    prompt: "Where am I monitoring because I do not feel safe?",
    script: "I am not interested in controlling you. I want to trust character and respond to behavior."
  },
  {
    title: "Power struggle to repair",
    phaseIds: ["understand", "practice"],
    moduleTitles: ["Pattern review", "Repair without collapse", "Hard conversation practice"],
    focusKeys: ["conflict"],
    body: "Many relationships move from attraction into a power struggle where old wounds, control, withdrawal, blame, and fear appear. That does not automatically mean love is gone. It means both people need regulation, repair, truth, and willingness to grow.",
    prompt: "Are we fighting each other, or are old wounds running the conversation?",
    script: "The goal is not to win the fight. The goal is to build repair that makes love safer."
  },
  {
    title: "Teach safety directly",
    phaseIds: ["practice"],
    moduleTitles: ["Clear request", "Hard conversation practice"],
    focusKeys: ["conflict", "boundaries"],
    body: "Healthy love asks and teaches. What makes you feel safe? What makes you feel loved? What makes you feel seen? Real love is not perfection; it is two willing people learning each other and choosing repair.",
    prompt: "What do I need to ask for or teach clearly instead of expecting mind reading?",
    script: "I am not saying I will be perfect. I am saying I am willing to learn with you."
  },
  {
    title: "Always available can become invisible",
    phaseIds: ["strengthen"],
    moduleTitles: ["Boundary without apology", "Values over monitoring"],
    focusKeys: ["anxious", "boundaries"],
    body: "Being always available does not always make you important. Sometimes it makes your energy feel guaranteed. Stop begging for attention from someone unwilling to give it. Protect access to you with dignity.",
    prompt: "Where has my constant availability reduced my self-respect?",
    script: "I can be loving without being endlessly accessible."
  },
  {
    title: "Attention is not intention",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Choose from standards", "Weekly review"],
    focusKeys: ["boundaries", "independence"],
    body: "Attention is not intention. The person for you is not only the person who notices you; it is the person willing to try, repair, communicate, and build. If willingness is absent, attention is not enough.",
    prompt: "What intention is shown beyond attention?",
    script: "I will respond to willingness, not just attention."
  },
  {
    title: "Freedom with care",
    phaseIds: ["practice", "strengthen"],
    moduleTitles: ["Hard conversation practice", "Choose from standards"],
    focusKeys: ["boundaries", "conflict"],
    body: "A relationship is not pure individual freedom without accountability. Care changes behavior voluntarily. Control is imposed; healthy boundaries are communicated. The difference is consent, respect, and choice.",
    prompt: "Is this boundary communicated care, or is it control?",
    script: "I can ask for emotional consideration without trying to own another person."
  },
  {
    title: "Pattern reversal",
    phaseIds: ["maintain"],
    moduleTitles: ["Stay open and centered", "Deeper self-trust"],
    focusKeys: ["independence", "boundaries"],
    body: "Healing is pattern reversal: stop making homes in people who only give hallways. Stop explaining, performing, and handing out blueprints to people not building with you. Peace does not need permission to exist.",
    prompt: "What old pattern am I reversing today?",
    script: "I withdraw my energy without drama and return it to my life."
  },
  {
    title: "Pain stopped leading",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Self-respect first", "Deeper self-trust"],
    focusKeys: ["independence", "boundaries"],
    body: "When people say you seem different, it may be because pain stopped leading and discipline took over. This is not becoming cold. It is letting your standards, habits, and self-respect lead your choices.",
    prompt: "Where is discipline ready to lead instead of pain?",
    script: "I do not need pain to be in charge of my next move."
  },
  {
    title: "Expecting yourself from others",
    phaseIds: ["strengthen"],
    moduleTitles: ["Choose from standards", "Boundary without apology"],
    focusKeys: ["boundaries", "conflict"],
    body: "You may expect a lot from yourself and sometimes too much from others. Hold your standards, but do not assume another person has the same inner code, discipline, timing, or emotional capacity.",
    prompt: "Where am I expecting my standard from someone who has not chosen it?",
    script: "I can keep my standard without projecting my capacity onto them."
  },
  {
    title: "Potential is not reality",
    phaseIds: ["understand", "strengthen"],
    moduleTitles: ["Fact versus story", "Choose from standards"],
    focusKeys: ["anxious", "boundaries"],
    body: "Idealized love attaches to potential and then feels betrayed by reality. Potential can inspire you, but reality is what you date, trust, repair with, and build from.",
    prompt: "Am I in love with who they are or who I believe they could become?",
    script: "I will honor potential, but I will make decisions from reality."
  },
  {
    title: "Loosen the reins",
    phaseIds: ["practice", "strengthen"],
    moduleTitles: ["Space tolerance", "Values over monitoring"],
    focusKeys: ["anxious", "independence"],
    body: "Control can look like strength when vulnerability feels dangerous. But gripping too tightly can keep you stuck. Power often returns when you loosen the reins, tell the truth, and stop managing every outcome.",
    prompt: "What am I gripping because vulnerability feels unsafe?",
    script: "I can loosen control without abandoning myself."
  },
  {
    title: "Quiet fire leadership",
    phaseIds: ["maintain"],
    moduleTitles: ["Deeper self-trust", "Stay open and centered"],
    focusKeys: ["independence"],
    body: "Your leadership does not have to be loud. It can be structure, truth, discipline, and purpose. When you are aligned, you do not compete for admiration; you become the standard through how you live.",
    prompt: "What would quiet leadership look like today?",
    script: "I lead by living aligned, not by chasing recognition."
  },
  {
    title: "Confidence is built",
    phaseIds: ["strengthen", "maintain"],
    moduleTitles: ["Self-respect first", "Deeper self-trust"],
    focusKeys: ["independence", "boundaries"],
    body: "Confidence is not handed to you. It is built through action, kept promises, facing fear, releasing perfectionism, and standing in your own truth even before you feel ready.",
    prompt: "What action would build confidence today?",
    script: "I do not wait to feel ready. I build confidence by doing."
  },
  {
    title: "Kind self-analysis",
    phaseIds: ["understand", "strengthen"],
    moduleTitles: ["Pattern review", "Self-respect first"],
    focusKeys: ["anxious", "independence"],
    body: "Critical self-analysis only helps when it is honest and kind. Pick apart the pattern, not your worth. Study where you shut down, control, idealize, or stay silent, then choose one cleaner action.",
    prompt: "What pattern can I examine without attacking myself?",
    script: "I can be honest with myself without being harsh to myself."
  }
];

const ATTACHMENT_TYPES = [
  {
    title: "Secure",
    coreFear: "Connection can handle honesty, distance, and repair.",
    signs: [
      "Can ask for needs without panic or punishment.",
      "Can give and receive space.",
      "Repairs conflict without collapsing or attacking."
    ],
    underStress: "May still feel hurt, but tends to return to direct communication.",
    secureMove: "Keep communicating clearly and keep your own life intact.",
    partnerClues: "You may be dealing with secure behavior when actions match words, repair is possible, and closeness does not require control."
  },
  {
    title: "Anxious / Preoccupied",
    coreFear: "I may be abandoned, replaced, or not chosen.",
    signs: [
      "Overthinking tone, timing, and small changes.",
      "Repeated reassurance seeking, protest texting, or checking.",
      "Feeling calm only when closeness is immediately confirmed."
    ],
    underStress: "Pursues, escalates, tests, or tries to get certainty fast.",
    secureMove: "Pause before pursuit, separate fact from story, ask once and clearly.",
    partnerClues: "You may be dealing with anxious behavior when the person needs frequent reassurance, reacts strongly to distance, or reads uncertainty as rejection."
  },
  {
    title: "Avoidant / Dismissive",
    coreFear: "Closeness may cost me freedom, control, or peace.",
    signs: [
      "Pulling away when conversations become emotional.",
      "Minimizing needs, discomfort, or dependence.",
      "Preferring distance, logic, or independence over vulnerability."
    ],
    underStress: "Withdraws, delays, shuts down, changes the subject, or becomes cold.",
    secureMove: "Ask for space with a return time and stay honest instead of disappearing.",
    partnerClues: "You may be dealing with avoidant behavior when closeness is followed by distance, emotional talks feel threatening, or independence is used to avoid repair."
  },
  {
    title: "Disorganized / Fearful-Avoidant",
    coreFear: "I want closeness, but closeness also feels unsafe.",
    signs: [
      "Switching between pursuit and withdrawal.",
      "Wanting intimacy but distrusting it once it appears.",
      "Strong reactions that can feel confusing even to the person having them."
    ],
    underStress: "May protest, disappear, test, shut down, or sabotage safety.",
    secureMove: "Slow the pace, ground the body, name the fear, and choose one non-extreme action.",
    partnerClues: "You may be dealing with fearful-avoidant behavior when the person sends mixed signals, craves closeness, then suddenly protects against it."
  }
];

const STAGE_START_DAY = {
  start: 1,
  build: 46,
  maintain: 151
};

const icons = {
  today: "01",
  sos: "02",
  search: "03",
  saved: "04",
  path: "05",
  exercises: "06",
  attachment: "07",
  library: "08",
  journal: "09",
  progress: "10",
  access: "11",
  influences: "12"
};

init();

async function init() {
  db = await openDatabase();
  await loadState();
  registerServiceWorker();
  render();
  scheduleReminderNudges();
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv");
      if (!database.objectStoreNames.contains("sessions")) database.createObjectStore("sessions", { keyPath: "id" });
      if (!database.objectStoreNames.contains("journal")) database.createObjectStore("journal", { keyPath: "id" });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbStore(storeName, mode = "readonly") {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function getKV(key) {
  return new Promise((resolve, reject) => {
    const request = dbStore("kv").get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function setKV(key, value) {
  return new Promise((resolve, reject) => {
    const request = dbStore("kv", "readwrite").put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function addRecord(storeName, record) {
  return new Promise((resolve, reject) => {
    const request = dbStore(storeName, "readwrite").put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

function getAllRecords(storeName) {
  return new Promise((resolve, reject) => {
    const request = dbStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const request = dbStore(storeName, "readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadState() {
  const [profile, settings, selfCareLog, bookmarks, reminders, weeklyReviews, sessions, journal] = await Promise.all([
    getKV("profile"),
    getKV("settings"),
    getKV("selfCareLog"),
    getKV("bookmarks"),
    getKV("reminders"),
    getKV("weeklyReviews"),
    getAllRecords("sessions"),
    getAllRecords("journal")
  ]);

  state = {
    profile,
    settings,
    sessions: sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    journal: journal.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    selfCareLog: selfCareLog || {},
    bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
    reminders: { ...DEFAULT_REMINDERS, ...(reminders || {}) },
    weeklyReviews: Array.isArray(weeklyReviews) ? weeklyReviews : []
  };

  await migrateSettingsIfNeeded();
}

async function migrateSettingsIfNeeded() {
  if (!state.profile || !state.settings) return;

  const contentOffset = Math.max(0, (state.profile.analysis?.startDay || 1) - 1);
  const currentDay = Number(state.settings.currentDay || 1);
  const needsDayModel = state.settings.contentOffset === undefined;
  const migratedDay = needsDayModel && contentOffset > 0
    ? Math.max(1, currentDay - contentOffset)
    : currentDay;

  const nextSettings = {
    ...state.settings,
    currentDay: Math.min(TOTAL_DAYS, migratedDay),
    contentOffset,
    totalDays: TOTAL_DAYS,
    programDayModel: 2
  };

  const changed = JSON.stringify(nextSettings) !== JSON.stringify(state.settings);
  if (!changed) return;

  state.settings = nextSettings;
  await setKV("settings", nextSettings);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

function render() {
  if (!state.profile) {
    renderOnboarding();
    return;
  }

  const viewRenderer = {
    today: renderToday,
    sos: renderSOS,
    search: renderSearch,
    saved: renderSaved,
    path: renderPath,
    exercises: renderExercises,
    attachment: renderAttachmentGuide,
    library: renderLibrary,
    influences: renderInfluences,
    journal: renderJournal,
    progress: renderProgress,
    access: renderAccess
  }[activeView] || renderToday;
  const viewMarkup = viewRenderer();

  app.className = "app-shell layout";
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">S</div>
        <div>
          <p class="brand-title">Secure Coach</p>
          <p class="brand-subtitle">Local-first daily practice · ${APP_VERSION}</p>
        </div>
      </div>
      <nav class="nav" aria-label="Main views">
        ${navButton("today", "Today")}
        ${navButton("sos", "SOS")}
        ${navButton("search", "Search")}
        ${navButton("saved", "Saved")}
        ${navButton("path", "Path")}
        ${navButton("exercises", "Exercises")}
        ${navButton("attachment", "Attachment")}
        ${navButton("library", "Scripts")}
        ${navButton("journal", "Journal")}
        ${navButton("progress", "Progress")}
        ${navButton("access", "Access")}
        ${navButton("influences", "References")}
      </nav>
      <p class="sidebar-note">Private by default. Your intake, journal, and progress are stored on this device unless you export them. ${escapeHTML(SAFETY_NOTE)}</p>
    </aside>
    <main class="main">
      <div class="page">
        ${renderTodayForMe()}
        ${viewMarkup}
      </div>
    </main>
  `;
}

function navButton(view, label) {
  return `
    <button class="nav-button ${activeView === view ? "active" : ""}" type="button" data-view="${view}">
      <span aria-hidden="true">${icons[view]}</span>
      <span>${label}</span>
    </button>
  `;
}

function renderTodayForMe() {
  const todayKey = getTodayKey();
  const entry = state.selfCareLog[todayKey] || {};
  const suggestion = entry.action || pick(SELF_CARE_SUGGESTIONS, state.settings.currentDay - 1);
  const completed = Boolean(entry.completedAt);
  const stats = calculateSelfCareStats();
  const earned = getEarnedMilestones().length;

  return `
    <section class="self-care-panel">
      <div>
        <p class="eyebrow">Today for me</p>
        <h2>What am I doing today to become better for myself?</h2>
        <p class="self-care-principle">The relationship can change. Your self-care, self-respect, health, and daily effort stay with you.</p>
        <p class="notebook-cue">${stats.completed} self-care days logged. ${earned} rewards earned. Return tomorrow to keep the promise small and real.</p>
      </div>
      <form id="selfCareForm" class="self-care-form">
        <div class="field">
          <label for="selfCareAction">One self-care commitment</label>
          <input id="selfCareAction" name="action" required value="${escapeHTML(suggestion)}" placeholder="One specific thing I will do for myself today">
        </div>
        <div class="field">
          <label for="selfCareCategory">Area</label>
          <select id="selfCareCategory" name="category">
            ${SELF_CARE_CATEGORIES.map((category) => `<option ${entry.category === category ? "selected" : ""}>${escapeHTML(category)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="selfCareProof">Proof I did it</label>
          <input id="selfCareProof" name="proof" value="${escapeHTML(entry.proof || "")}" placeholder="Example: walked 10 minutes, ate lunch, kept my boundary">
        </div>
        <label class="check-row">
          <input type="checkbox" name="completed" ${completed ? "checked" : ""}>
          <span>Completed today</span>
        </label>
        <div class="actions">
          <button class="button" type="submit">${entry.action ? "Update today" : "Save today"}</button>
          <span class="hint">${completed ? "Logged. This counts toward self-care consistency." : "Keep it small enough to actually do today."}</span>
        </div>
      </form>
    </section>
  `;
}

function renderOnboarding() {
  app.className = "app-shell onboarding";
  app.innerHTML = `
    <section class="onboarding-shell">
      <div class="intro-band">
        <div>
          <p class="eyebrow">Start where you are</p>
          <h1 class="hero-title">Build your secure path.</h1>
          <p class="lead">Tell the app what is happening right now. It will place you into a long-term practice path and start with the smallest useful step.</p>
        </div>
        <p class="privacy-note">This first version has no accounts, no backend, and no paid AI. Your story stays in this browser unless you export it. ${escapeHTML(SAFETY_NOTE)}</p>
      </div>

      <form id="onboardingForm" class="panel form" autocomplete="off">
        <div class="field">
          <label for="name">Name or nickname</label>
          <input id="name" name="name" maxlength="40" placeholder="Optional">
        </div>

        <fieldset class="field">
          <legend class="screen-reader-only">Current stage</legend>
          <label>Where are you in the process?</label>
          <div class="segmented">
            ${stageOption("start", "Beginning", "I feel overwhelmed or new to this.", true)}
            ${stageOption("build", "Middle", "I know my patterns but still react.")}
            ${stageOption("maintain", "Maintaining", "I want to stay grounded long term.")}
          </div>
        </fieldset>

        <div class="field">
          <label for="happening">What is happening most often?</label>
          <textarea id="happening" name="happening" required placeholder="Example: I panic when they reply late, then I text too much and feel ashamed after."></textarea>
        </div>

        <div class="field">
          <label for="trigger">What triggers you the most?</label>
          <input id="trigger" name="trigger" required placeholder="Late replies, quiet tone, conflict, jealousy, distance">
        </div>

        <div class="field">
          <label for="tried">What have you already tried?</label>
          <input id="tried" name="tried" placeholder="Therapy, journaling, breathing, asking for reassurance, avoiding conflict">
        </div>

        <div class="field">
          <label for="story">Your current story</label>
          <textarea id="story" name="story" rows="10" required placeholder="Write up to 500 words. Include context, relationship patterns, what hurts, and what you want to change."></textarea>
          <div class="counter"><span id="wordCount">0</span>/500 words</div>
        </div>

        <div class="actions">
          <button class="button" type="submit">Build my path</button>
          <span class="hint">You can change your path later by exporting, resetting, or starting again.</span>
        </div>
      </form>
    </section>
  `;
}

function stageOption(value, label, help, checked = false) {
  return `
    <label>
      <input type="radio" name="stage" value="${value}" ${checked ? "checked" : ""}>
      <span class="segment"><strong>${label}</strong><span>${help}</span></span>
    </label>
  `;
}

function renderDailyFlow(content, progress) {
  const steps = [
    {
      title: "Regulate",
      detail: "Start with the body before meaning.",
      action: "Open SOS",
      view: "sos"
    },
    {
      title: "Read today",
      detail: content.extraNote.title,
      action: "Stay here",
      view: "today"
    },
    {
      title: "Do the exercise",
      detail: content.exercise,
      action: "See exercises",
      view: "exercises"
    },
    {
      title: "Journal",
      detail: "Write the honest version and the secure next step.",
      action: "Open journal",
      view: "journal"
    },
    {
      title: "Complete",
      detail: `${progress}% through the path.`,
      action: "Use check-in",
      view: "today"
    }
  ];

  return `
    <section class="panel daily-flow">
      <div>
        <p class="eyebrow">Daily home</p>
        <h2>Five steps. Keep it simple.</h2>
      </div>
      <div class="flow-grid">
        ${steps.map((step, index) => `
          <article class="flow-card">
            <span class="step-number">${index + 1}</span>
            <h3>${escapeHTML(step.title)}</h3>
            <p>${escapeHTML(step.detail)}</p>
            <button class="text-button" type="button" data-view="${escapeHTML(step.view)}">${escapeHTML(step.action)}</button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderToday() {
  const day = state.settings.currentDay;
  const content = getDailyContent(day);
  const programPhase = getPhase(day);
  const routePhase = content.phase;
  const progress = Math.min(100, Math.round(((day - 1) / TOTAL_DAYS) * 100));
  const profileName = state.profile.name ? `${escapeHTML(state.profile.name)}, ` : "";
  const analysis = state.profile.analysis || analyzeProfile(state.profile);
  const routePill = routePhase.id !== programPhase.id
    ? `<span class="pill">Personalized route: ${escapeHTML(routePhase.title)}</span>`
    : "";

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Day ${day} of ${TOTAL_DAYS}</p>
        <h1>${profileName}${escapeHTML(content.title)}</h1>
        <p class="lead">${escapeHTML(programPhase.goal)}</p>
      </div>
      <div class="card stat">
        <span class="small">Current phase</span>
        <strong>${escapeHTML(programPhase.title)}</strong>
        <span class="small">${escapeHTML(programPhase.practice)}</span>
      </div>
    </header>

    ${renderDailyFlow(content, progress)}

    <div class="grid two">
      <section class="panel coach-panel">
        <div class="meta-row">
          <span class="pill">${escapeHTML(analysis.stageLabel || "Beginning")}</span>
          <span class="pill coral">${escapeHTML(analysis.primaryFocusLabel || "Anxious pursuit")}</span>
          <span class="pill">${escapeHTML(content.moduleTitle)}</span>
          ${routePill}
          <span class="pill gold">${progress}% complete</span>
        </div>
        <h2>Today's coaching step</h2>
        <p>${escapeHTML(content.instruction)}</p>
        <ol class="step-list">
          ${content.steps.map((step, index) => `
            <li>
              <span class="step-number">${index + 1}</span>
              <span>${escapeHTML(step)}</span>
            </li>
          `).join("")}
        </ol>
      </section>

      <aside class="grid">
        <section class="card">
          <h3>Real-life example</h3>
          <p class="example"><strong>Situation:</strong> ${escapeHTML(content.example)}</p>
        </section>
        <section class="card">
          <h3>Secure action</h3>
          <p>${escapeHTML(content.action)}</p>
        </section>
        <section class="card">
          <div class="meta-row"><span class="pill">${escapeHTML(content.extraNote.title)}</span></div>
          <h3>Extra note for this chapter</h3>
          <p>${escapeHTML(content.extraNote.body)}</p>
          <p class="example"><strong>Practice:</strong> ${escapeHTML(content.extraNote.script)}</p>
          <p class="small">Journal: ${escapeHTML(content.extraNote.prompt)}</p>
          ${bookmarkButton({
            type: "chapter-note",
            title: content.extraNote.title,
            body: content.extraNote.body,
            meta: content.moduleTitle
          })}
        </section>
        <section class="card">
          <h3>Practice exercise</h3>
          <p><strong>${escapeHTML(content.exercise)}</strong></p>
          <ol class="step-list">
            ${content.exerciseSteps.map((step, index) => `
              <li>
                <span class="step-number">${index + 1}</span>
                <span>${escapeHTML(step)}</span>
              </li>
            `).join("")}
          </ol>
          <p class="small">Aligned track: ${escapeHTML(content.exerciseTrackTitle)}</p>
          ${bookmarkButton({
            type: "exercise",
            title: content.exercise,
            body: content.exerciseSteps.join(" "),
            meta: content.exerciseTrackTitle
          })}
        </section>
        <section class="card">
          <h3>Reference lens</h3>
          <p class="small">${escapeHTML(content.reference.author)} - ${escapeHTML(content.reference.theme)}</p>
          <p>${escapeHTML(content.reference.note)}</p>
        </section>
      </aside>
    </div>

    <section class="panel" style="margin-top: 18px;">
      <h2>Daily check-in</h2>
      <form id="dailyForm" class="form">
        <input type="hidden" name="day" value="${day}">
        <div class="grid three">
          <div class="field">
            <label for="moodBefore">Mood before</label>
            <select id="moodBefore" name="moodBefore" required>
              <option value="">Choose one</option>
              <option>steady</option>
              <option>anxious</option>
              <option>sad</option>
              <option>angry</option>
              <option>numb</option>
              <option>hopeful</option>
            </select>
          </div>
          <div class="field">
            <label for="moodAfter">Mood after</label>
            <select id="moodAfter" name="moodAfter">
              <option value="">Choose after practice</option>
              <option>steadier</option>
              <option>still anxious</option>
              <option>clearer</option>
              <option>softer</option>
              <option>tired but honest</option>
              <option>proud</option>
            </select>
          </div>
          <div class="field">
            <label for="intensity">Intensity before</label>
            <select id="intensity" name="intensity" required>
              <option value="">Choose one</option>
              <option value="1">1 - low</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 - high</option>
            </select>
          </div>
        </div>
        <div class="grid three">
          <div class="field">
            <label for="intensityAfter">Intensity after</label>
            <select id="intensityAfter" name="intensityAfter">
              <option value="">Optional</option>
              <option value="1">1 - low</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 - high</option>
            </select>
          </div>
          <div class="field">
            <label for="dailyTrigger">Trigger</label>
            <input id="dailyTrigger" name="trigger" placeholder="Late reply, silence, conflict, comparison">
          </div>
          <div class="field">
            <label for="keptPromise">Did I keep my promise to myself?</label>
            <select id="keptPromise" name="keptPromise">
              <option value="">Choose tonight or later</option>
              <option value="yes">Yes</option>
              <option value="partly">Partly</option>
              <option value="not_yet">Not yet</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="dailyNote">${escapeHTML(content.prompt)}</label>
          <textarea id="dailyNote" name="note" required placeholder="Write the honest version first. Then write the secure next step."></textarea>
        </div>
        <div class="field">
          <label for="eveningReflection">Tonight reflection</label>
          <textarea id="eveningReflection" name="eveningReflection" placeholder="Did I keep my promise to myself today? What helped? What got in the way? What is the next kind reset?"></textarea>
        </div>
        <div class="actions">
          <button class="button" type="submit">Complete session</button>
          <button class="button secondary" type="button" data-action="skip-day">Skip to next day</button>
        </div>
      </form>
    </section>
  `;
}

function renderPath() {
  const day = state.settings.currentDay;
  const contentDay = getContentDay(day);
  const programPhase = getPhase(day);
  const routePhase = getPhase(contentDay);
  const analysis = state.profile.analysis || analyzeProfile(state.profile);
  const focus = analysis.primaryFocus || "anxious";
  const focusData = FOCUS_AREAS[focus] || FOCUS_AREAS.anxious;
  const content = getDailyContent(day);
  const upcoming = Array.from({ length: 7 }, (_, index) => {
    const nextDay = Math.min(TOTAL_DAYS, day + index);
    return [nextDay, getDailyContent(nextDay).title];
  });
  const progress = Math.min(100, Math.round(((day - 1) / TOTAL_DAYS) * 100));

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Your placement</p>
        <h1>${escapeHTML(analysis.stageLabel || "Beginning")} path</h1>
        <p class="lead">Primary focus: ${escapeHTML(focusData.label)}. You are on program day ${day}, inside the ${escapeHTML(programPhase.title)} phase. Your exercises are personalized to the ${escapeHTML(routePhase.title)} level when your intake shows you are already further along.</p>
      </div>
      <div class="card stat">
        <span class="small">Long-term path</span>
        <strong>${progress}%</strong>
        <div class="progress-track" aria-label="${progress}% complete">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
      </div>
    </header>

    <div class="grid two">
      <section class="panel">
        <h2>180-day structure</h2>
        <div class="phase-map">
          ${PHASES.map((item) => `
            <article class="phase-item ${item.id === programPhase.id ? "active" : ""}">
              <div class="phase-days">${item.days[0]}-${item.days[1]}</div>
              <div>
                <h3>${escapeHTML(item.title)}</h3>
                <p>${escapeHTML(item.goal)}</p>
                <p class="small">Practice: ${escapeHTML(item.practice)}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="panel">
        <h2>What the app noticed</h2>
        <ul class="plain-list">
          <li>Stage: ${escapeHTML(analysis.stageLabel || "Beginning")}</li>
          <li>Main pattern: ${escapeHTML(focusData.label)}</li>
          <li>Current journey phase: ${escapeHTML(programPhase.title)}</li>
          <li>Personalized exercise route: ${escapeHTML(routePhase.title)}</li>
          <li>Current personalized module: ${escapeHTML(content.moduleTitle)}</li>
          <li>Today's aligned exercise track: ${escapeHTML(content.exerciseTrackTitle)}</li>
          <li>Today's extra note: ${escapeHTML(content.extraNote.title)}</li>
          <li>Program day: ${day}</li>
          <li>First priority: ${escapeHTML(focusData.instruction)}</li>
        </ul>
        <h3 style="margin-top: 20px;">Next seven days</h3>
        <ul class="plain-list">
          ${upcoming.map(([nextDay, title]) => `<li>Day ${nextDay}: ${escapeHTML(title)}</li>`).join("")}
        </ul>
        <div class="actions" style="margin-top: 18px;">
          <button class="button secondary" type="button" data-action="previous-day">Previous day</button>
          <button class="button secondary" type="button" data-action="next-day">Next day</button>
        </div>
      </section>
    </div>
  `;
}

function renderLibrary() {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Step-by-step scripts</p>
        <h1>Use these when the moment is active.</h1>
        <p class="lead">Each script is short on purpose. The goal is to stay clear, not to explain yourself into safety.</p>
      </div>
    </header>

    <section class="grid two">
      ${LIBRARY.map((item) => `
        <article class="card">
          <div class="meta-row"><span class="pill">${escapeHTML(item.focus)}</span></div>
          <h2>${escapeHTML(item.title)}</h2>
          <ol class="step-list">
            ${item.steps.map((step, index) => `
              <li>
                <span class="step-number">${index + 1}</span>
                <span>${escapeHTML(step)}</span>
              </li>
            `).join("")}
          </ol>
          <p class="example"><strong>Script:</strong> ${escapeHTML(item.script)}</p>
          ${bookmarkButton({
            type: "script",
            title: item.title,
            body: item.script,
            meta: item.focus
          })}
        </article>
      `).join("")}
    </section>
  `;
}

function renderExercises() {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Dedicated practice tracks</p>
        <h1>Choose the exercise that fits the moment.</h1>
        <p class="lead">These tracks turn the reference ideas into original, repeatable exercises. Use them outside the daily program when a specific pattern is active.</p>
      </div>
    </header>

    <section class="grid two">
      ${ALL_EXERCISE_TRACKS.map((track) => `
        <article class="card">
          <div class="meta-row"><span class="pill">Purpose: ${escapeHTML(track.lens)}</span></div>
          <h2>${escapeHTML(track.title)}</h2>
          <p>${escapeHTML(track.goal)}</p>
          ${track.exercises.map((exercise) => `
            <div class="example">
              <h3>${escapeHTML(exercise.name)}</h3>
              <ol class="step-list">
                ${exercise.steps.map((step, index) => `
                  <li>
                    <span class="step-number">${index + 1}</span>
                    <span>${escapeHTML(step)}</span>
                  </li>
                `).join("")}
              </ol>
              <p><strong>Journal:</strong> ${escapeHTML(exercise.prompt)}</p>
              ${bookmarkButton({
                type: "exercise",
                title: exercise.name,
                body: exercise.prompt,
                meta: track.title
              })}
            </div>
          `).join("")}
        </article>
      `).join("")}
    </section>
  `;
}

function renderSOS() {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Quick SOS</p>
        <h1>Use this before reacting.</h1>
        <p class="lead">Pick the moment you are in. The goal is to regulate first, then choose the smallest secure action.</p>
      </div>
    </header>

    <section class="grid two">
      ${QUICK_SOS.map((item) => `
        <article class="card sos-card">
          <div class="meta-row"><span class="pill">2-minute reset</span></div>
          <h2>${escapeHTML(item.title)}</h2>
          <p>${escapeHTML(item.purpose)}</p>
          <ol class="step-list">
            ${item.steps.map((step, index) => `
              <li>
                <span class="step-number">${index + 1}</span>
                <span>${escapeHTML(step)}</span>
              </li>
            `).join("")}
          </ol>
          <p class="example"><strong>Use:</strong> ${escapeHTML(item.script)}</p>
          <div class="actions">
            <button class="button secondary" type="button" data-action="copy-text" data-text="${escapeHTML(item.script)}">Copy line</button>
            ${bookmarkButton({
              type: "sos",
              title: item.title,
              body: item.script,
              meta: item.purpose
            })}
          </div>
        </article>
      `).join("")}
    </section>

    <section class="panel" style="margin-top: 18px;">
      <h2>Situation library</h2>
      <p>Use these when you need the right page fast.</p>
      <div class="grid three">
        ${SITUATION_GUIDES.map(renderSituationCard).join("")}
      </div>
    </section>
  `;
}

function renderSituationCard(item) {
  return `
    <article class="card">
      <div class="meta-row">${item.tags.slice(0, 3).map((tag) => `<span class="pill">${escapeHTML(tag)}</span>`).join("")}</div>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.purpose)}</p>
      <ol class="step-list">
        ${item.steps.map((step, index) => `
          <li>
            <span class="step-number">${index + 1}</span>
            <span>${escapeHTML(step)}</span>
          </li>
        `).join("")}
      </ol>
      <p class="example"><strong>Line:</strong> ${escapeHTML(item.script)}</p>
      ${bookmarkButton({
        type: "situation",
        title: item.title,
        body: item.script,
        meta: item.purpose
      })}
    </article>
  `;
}

function renderSearch() {
  const query = String(state.settings?.searchQuery || "").trim();
  const results = query ? searchContent(query) : [];
  const suggestions = getSearchSuggestions(query);

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Search</p>
        <h1>Find the right guidance fast.</h1>
        <p class="lead">Search words like blocking, avoidant, boundaries, jealousy, no contact, panic, confidence, or letting go.</p>
      </div>
    </header>

    <section class="panel">
      <form id="searchForm" class="form">
        <div class="field">
          <label for="searchQuery">Search the local library</label>
          <div class="autocomplete">
            <input id="searchQuery" name="query" value="${escapeHTML(query)}" placeholder="Example: boundaries, panic, avoidant, letting go" autocomplete="off">
            ${suggestions.length ? `
              <div class="suggestion-list" role="listbox" aria-label="Search suggestions">
                ${suggestions.map((suggestion) => `
                  <button class="suggestion-item" type="button" data-action="set-search" data-query="${escapeHTML(suggestion)}">
                    ${highlightSuggestion(suggestion, query)}
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </div>
        </div>
        <div class="actions">
          <button class="button" type="submit">Search</button>
          ${["blocking", "panic", "boundaries", "avoidant", "letting go", "confidence"].map((term) => `
            <button class="button secondary" type="button" data-action="set-search" data-query="${escapeHTML(term)}">${escapeHTML(term)}</button>
          `).join("")}
        </div>
      </form>
    </section>

    <section class="grid two" style="margin-top: 18px;">
      ${query
        ? results.length
          ? results.map(renderSearchResult).join("")
          : `<div class="empty">No results yet. Try a simpler word like space, text, repair, or self-worth.</div>`
        : SITUATION_GUIDES.map(renderSituationCard).join("")}
    </section>
  `;
}

function renderSearchResult(item) {
  return `
    <article class="card">
      <div class="meta-row"><span class="pill">${escapeHTML(item.type)}</span>${item.meta ? `<span class="pill coral">${escapeHTML(item.meta)}</span>` : ""}</div>
      <h2>${escapeHTML(item.title)}</h2>
      <p>${escapeHTML(item.body)}</p>
      ${bookmarkButton(item)}
    </article>
  `;
}

function renderSaved() {
  const bookmarks = state.bookmarks;

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Saved</p>
        <h1>Your anchors.</h1>
        <p class="lead">Bookmarked notes, scripts, exercises, and SOS lines stay here for quick access.</p>
      </div>
    </header>

    <section class="grid two">
      ${bookmarks.length ? bookmarks.map((item) => `
        <article class="card">
          <div class="meta-row">
            <span class="pill">${escapeHTML(item.type)}</span>
            ${item.meta ? `<span class="pill coral">${escapeHTML(item.meta)}</span>` : ""}
          </div>
          <h2>${escapeHTML(item.title)}</h2>
          <p>${escapeHTML(item.body)}</p>
          <div class="actions">
            <button class="button secondary" type="button" data-action="copy-text" data-text="${escapeHTML(item.body)}">Copy</button>
            <button class="button warn" type="button" data-action="remove-bookmark" data-bookmark-id="${escapeHTML(item.id)}">Remove</button>
          </div>
        </article>
      `).join("") : `<div class="empty">Nothing saved yet. Use Save this on notes, scripts, exercises, SOS cards, or search results.</div>`}
    </section>
  `;
}

function renderAccess() {
  const reminders = state.reminders || DEFAULT_REMINDERS;

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Access</p>
        <h1>Install, share, back up, and return.</h1>
        <p class="lead">This app is local-first. Install it like an app, share the link, and export backups before changing devices.</p>
      </div>
    </header>

    <section class="grid two">
      <article class="panel">
        <h2>Install on your device</h2>
        <div class="grid">
          <div class="example">
            <h3>iPhone / iPad</h3>
            <p>Open in Safari, tap Share, then Add to Home Screen.</p>
          </div>
          <div class="example">
            <h3>Android</h3>
            <p>Open in Chrome, tap the menu, then Install app or Add to Home screen.</p>
          </div>
          <div class="example">
            <h3>Computer</h3>
            <p>Open in Chrome or Edge and use the install icon in the address bar when available.</p>
          </div>
        </div>
        <div class="actions" style="margin-top: 18px;">
          <button class="button" type="button" data-action="share-app">Share app link</button>
          <button class="button secondary" type="button" data-action="copy-text" data-text="${escapeHTML(location.href)}">Copy link</button>
        </div>
      </article>

      <article class="panel">
        <h2>Backup</h2>
        <p>Progress stays in this browser. Export before clearing data, switching phones, or resetting.</p>
        <div class="actions">
          <button class="button" type="button" data-action="export-data">Export backup</button>
          <label class="button secondary" for="importFileAccess">Import backup</label>
          <input class="screen-reader-only" id="importFileAccess" type="file" accept="application/json" data-action="import-file">
        </div>
      </article>
    </section>

    <section class="panel" style="margin-top: 18px;">
      <h2>Local reminders</h2>
      <p>These reminders are private and stored on this device. They work best while the app or browser is open; installed PWAs may behave differently by browser.</p>
      <form id="reminderForm" class="form">
        <label class="check-row">
          <input type="checkbox" name="enabled" ${reminders.enabled ? "checked" : ""}>
          <span>Enable local nudges</span>
        </label>
        <div class="grid three">
          <div class="field">
            <label for="dailyTime">Daily practice</label>
            <input id="dailyTime" name="dailyTime" type="time" value="${escapeHTML(reminders.dailyTime || "09:00")}">
          </div>
          <div class="field">
            <label for="eveningTime">Evening reflection</label>
            <input id="eveningTime" name="eveningTime" type="time" value="${escapeHTML(reminders.eveningTime || "20:30")}">
          </div>
          <div class="field">
            <label for="weeklyTime">Weekly reset</label>
            <input id="weeklyTime" name="weeklyTime" type="time" value="${escapeHTML(reminders.weeklyTime || "18:00")}">
          </div>
        </div>
        <div class="actions">
          <button class="button" type="submit">Save reminders</button>
          <button class="button secondary" type="button" data-action="request-notifications">Allow notifications</button>
        </div>
      </form>
    </section>
  `;
}

function renderAttachmentGuide() {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Attachment map</p>
        <h1>Where you stand, and who you may be dealing with.</h1>
        <p class="lead">These are patterns, not permanent labels. Use them to understand behavior and choose the next secure move.</p>
      </div>
    </header>

    <section class="grid two">
      ${ATTACHMENT_TYPES.map((type) => `
        <article class="card">
          <div class="meta-row"><span class="pill">${escapeHTML(type.title)}</span></div>
          <h2>${escapeHTML(type.title)}</h2>
          <p class="example"><strong>Core belief/fear:</strong> ${escapeHTML(type.coreFear)}</p>
          <h3>Signs in relationship</h3>
          <ul class="plain-list">
            ${type.signs.map((sign) => `<li>${escapeHTML(sign)}</li>`).join("")}
          </ul>
          <h3 style="margin-top: 16px;">Under stress</h3>
          <p>${escapeHTML(type.underStress)}</p>
          <h3>Secure move</h3>
          <p>${escapeHTML(type.secureMove)}</p>
          <h3>Who you may be dealing with</h3>
          <p>${escapeHTML(type.partnerClues)}</p>
        </article>
      `).join("")}
    </section>
  `;
}

function renderInfluences() {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">References</p>
        <h1>Ideas behind the coach.</h1>
        <p class="lead">These are influence notes, not copied book content. The app turns broad relationship, attachment, trauma, stress, and self-accountability ideas into original daily exercises.</p>
      </div>
    </header>

    <section class="grid two">
      ${INFLUENCES.map((item) => `
        <article class="card">
          <div class="meta-row"><span class="pill">${escapeHTML(item.theme)}</span></div>
          <h2>${escapeHTML(item.author)}</h2>
          <p class="example"><strong>Reference:</strong> ${escapeHTML(item.work)}</p>
          <ul class="plain-list">
            ${item.uses.map((use) => `<li>${escapeHTML(use)}</li>`).join("")}
          </ul>
          <p><a class="text-link" href="${escapeHTML(item.source)}" target="_blank" rel="noreferrer">Source page</a></p>
        </article>
      `).join("")}
    </section>

    <section class="panel" style="margin-top: 18px;">
      <h2>Self-care priority sources</h2>
      <p>These sources support why the app keeps self-care visible on every page: users need daily actions that maintain health, emotional well-being, and capacity regardless of whether a relationship stays or goes.</p>
      <div class="grid three">
        ${SELF_CARE_SOURCES.map((source) => `
          <article class="example">
            <h3>${escapeHTML(source.label)}</h3>
            <p><strong>${escapeHTML(source.title)}</strong></p>
            <p>${escapeHTML(source.note)}</p>
            <p><a class="text-link" href="${escapeHTML(source.url)}" target="_blank" rel="noreferrer">Source page</a></p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderJournal() {
  const content = getDailyContent(state.settings.currentDay);
  const entries = state.journal;

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Private notes</p>
        <h1>Talk to the page clearly.</h1>
        <p class="lead">Use the prompt when you need structure, or write freely when you already know what needs to come out.</p>
      </div>
    </header>

    <div class="grid two">
      <section class="panel">
        <h2>New entry</h2>
        <form id="journalForm" class="form">
          <div class="field">
            <label for="journalPrompt">Prompt</label>
            <input id="journalPrompt" name="prompt" value="${escapeHTML(content.prompt)}">
          </div>
          <div class="field">
            <label for="journalText">Entry</label>
            <textarea id="journalText" name="text" required placeholder="What happened? What did I feel? What story did I tell myself? What is the secure next step?"></textarea>
          </div>
          <button class="button" type="submit">Save entry</button>
        </form>
      </section>

      <section class="panel">
        <h2>Saved entries</h2>
        ${entries.length ? entries.map(renderJournalEntry).join("") : `<div class="empty">No journal entries yet.</div>`}
      </section>
    </div>
  `;
}

function renderJournalEntry(entry) {
  return `
    <article class="journal-entry">
      <div class="meta-row">
        <span class="pill">${formatDate(entry.createdAt)}</span>
        ${entry.day ? `<span class="pill coral">Day ${entry.day}</span>` : ""}
      </div>
      <h3>${escapeHTML(entry.prompt || "Free note")}</h3>
      <p>${escapeHTML(entry.text)}</p>
    </article>
  `;
}

function renderProgress() {
  const day = state.settings.currentDay;
  const completed = state.sessions.length;
  const streak = calculateStreak(state.sessions);
  const selfCareStats = calculateSelfCareStats();
  const summary = getWeeklySummary();
  const recovery = getMissedDayRecovery();
  const earnedMilestones = getEarnedMilestones();
  const badges = getRewardBadges();
  const triggerList = mostCommonTriggers(state.sessions);
  const latest = state.sessions.slice(0, 5);
  const latestReview = state.weeklyReviews[0];
  const recentSelfCare = Object.entries(state.selfCareLog)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5);

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Progress</p>
        <h1>Track the pattern, not perfection.</h1>
        <p class="lead">This view shows consistency and repeated triggers. It is meant to help you choose the next grounded practice.</p>
      </div>
    </header>

    <section class="grid three">
      <div class="card stat"><span class="small">Current day</span><strong>${day}</strong><span class="small">of ${TOTAL_DAYS}</span></div>
      <div class="card stat"><span class="small">Completed sessions</span><strong>${completed}</strong><span class="small">${streak}-day coaching streak</span></div>
      <div class="card stat"><span class="small">Self-care days</span><strong>${selfCareStats.completed}</strong><span class="small">${selfCareStats.streak}-day self-care streak</span></div>
    </section>

    <section class="panel" style="margin-top: 18px;">
      <h2>Reward badges</h2>
      <div class="grid three">
        ${badges.map((badge) => `
          <article class="reward-card ${badge.earned ? "earned" : ""}">
            <div class="meta-row"><span class="pill ${badge.earned ? "gold" : ""}">${badge.earned ? "unlocked" : "locked"}</span></div>
            <h3>${escapeHTML(badge.title)}</h3>
            <p>${escapeHTML(badge.goal)}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="panel" style="margin-top: 18px;">
      <h2>This week's summary</h2>
      <div class="grid three">
        <div class="stat"><span class="small">Coaching sessions</span><strong>${summary.sessions}</strong><span class="small">last 7 days</span></div>
        <div class="stat"><span class="small">Self-care completed</span><strong>${summary.selfCareDone}</strong><span class="small">last 7 days</span></div>
        <div class="stat"><span class="small">Avg intensity shift</span><strong>${summary.averageShift}</strong><span class="small">before to after</span></div>
      </div>
      <div class="grid two" style="margin-top: 18px;">
        <div class="example">
          <h3>Win to keep</h3>
          <p>${escapeHTML(summary.win)}</p>
        </div>
        <div class="example">
          <h3>Next reset</h3>
          <p>${escapeHTML(summary.reset)}</p>
        </div>
      </div>
    </section>

    <section class="panel" style="margin-top: 18px;">
      <h2>Weekly reset</h2>
      <p>Use this once a week. The point is to see the pattern clearly, not to judge yourself.</p>
      <form id="weeklyResetForm" class="form">
        <div class="grid two">
          <div class="field">
            <label for="weeklyImprove">What improved?</label>
            <textarea id="weeklyImprove" name="improved" required placeholder="One secure repetition, one better response, one calmer moment."></textarea>
          </div>
          <div class="field">
            <label for="weeklyChase">Where did I chase or abandon myself?</label>
            <textarea id="weeklyChase" name="chased" required placeholder="Be honest without attacking yourself."></textarea>
          </div>
        </div>
        <div class="grid three">
          <div class="field">
            <label for="weeklyChoose">Where did I choose myself?</label>
            <textarea id="weeklyChoose" name="choseSelf" required></textarea>
          </div>
          <div class="field">
            <label for="weeklyPractice">One practice for next week</label>
            <textarea id="weeklyPractice" name="nextPractice" required></textarea>
          </div>
          <div class="field">
            <label for="weeklyStability">Is this becoming more stable or repeating?</label>
            <textarea id="weeklyStability" name="stability" required></textarea>
          </div>
        </div>
        <button class="button" type="submit">Save weekly reset</button>
      </form>
      ${latestReview ? `
        <div class="example" style="margin-top: 18px;">
          <h3>Latest reset: ${formatDate(latestReview.createdAt)}</h3>
          <p><strong>Improved:</strong> ${escapeHTML(latestReview.improved)}</p>
          <p><strong>Next practice:</strong> ${escapeHTML(latestReview.nextPractice)}</p>
        </div>
      ` : ""}
    </section>

    <section class="panel" style="margin-top: 18px;">
      <h2>Missed-day recovery</h2>
      <p>${escapeHTML(recovery.message)}</p>
      <ol class="step-list">
        ${recovery.steps.map((step, index) => `
          <li>
            <span class="step-number">${index + 1}</span>
            <span>${escapeHTML(step)}</span>
          </li>
        `).join("")}
      </ol>
    </section>

    <section class="panel" style="margin-top: 18px;">
      <h2>Rewards and bonuses</h2>
      <div class="grid two">
        ${MILESTONES.map((milestone) => {
          const earned = earnedMilestones.some((item) => item.days === milestone.days);
          return `
            <article class="reward-card ${earned ? "earned" : ""}">
              <div class="meta-row">
                <span class="pill ${earned ? "gold" : ""}">${earned ? "earned" : "locked"}</span>
                <span class="pill">Day ${milestone.days}</span>
              </div>
              <h3>${escapeHTML(milestone.title)}</h3>
              <p>${escapeHTML(earned ? MILESTONE_LETTERS[milestone.days] : `Complete ${milestone.days} self-care days to unlock this note.`)}</p>
              <p class="small">Bonus: ${escapeHTML(milestone.bonus)}</p>
            </article>
          `;
        }).join("")}
      </div>
    </section>

    <div class="grid two" style="margin-top: 18px;">
      <section class="panel">
        <h2>Repeated triggers</h2>
        ${triggerList.length ? `
          <ul class="plain-list">
            ${triggerList.map(([trigger, count]) => `<li>${escapeHTML(trigger)}: ${count}</li>`).join("")}
          </ul>
        ` : `<div class="empty">Complete daily sessions to see trigger patterns.</div>`}
      </section>

      <section class="panel">
        <h2>Self-care accountability</h2>
        ${recentSelfCare.length ? `
          ${recentSelfCare.map(([date, entry]) => `
            <article class="journal-entry">
              <div class="meta-row">
                <span class="pill">${escapeHTML(date)}</span>
                <span class="pill ${entry.completedAt ? "gold" : "coral"}">${entry.completedAt ? "completed" : "planned"}</span>
              </div>
              <h3>${escapeHTML(entry.category || "Self-care")}</h3>
              <p>${escapeHTML(entry.action || "")}</p>
              ${entry.proof ? `<p class="small">Proof: ${escapeHTML(entry.proof)}</p>` : ""}
            </article>
          `).join("")}
        ` : `<div class="empty">Save today's self-care commitment to begin accountability tracking.</div>`}
      </section>
    </div>

    <div class="grid two" style="margin-top: 18px;">
      <section class="panel">
        <h2>Backup</h2>
        <p>Your data is stored on this device. Export a backup before changing phones, clearing browser data, or resetting the app.</p>
        <div class="actions">
          <button class="button" type="button" data-action="export-data">Export backup</button>
          <label class="button secondary" for="importFile">Import backup</label>
          <input class="screen-reader-only" id="importFile" type="file" accept="application/json" data-action="import-file">
          <button class="button warn" type="button" data-action="reset-app">Reset app</button>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top: 18px;">
      <h2>Recent sessions</h2>
      ${latest.length ? latest.map((session) => `
        <article class="journal-entry">
          <div class="meta-row">
            <span class="pill">${formatDate(session.createdAt)}</span>
            <span class="pill coral">Day ${session.day}</span>
            <span class="pill gold">${escapeHTML(session.mood)}</span>
          </div>
          <p>${escapeHTML(session.note)}</p>
        </article>
      `).join("") : `<div class="empty">No completed sessions yet.</div>`}
    </section>
  `;
}

function getDailyContent(day) {
  const programDay = Math.max(1, Number(day) || 1);
  const contentDay = getContentDay(programDay);
  const phase = getPhase(contentDay);
  const focusKey = state.profile?.analysis?.primaryFocus || "anxious";
  const focus = FOCUS_AREAS[focusKey];
  const dayIndex = Math.max(0, contentDay - 1);
  const phaseDayIndex = Math.max(0, contentDay - phase.days[0]);
  const module = pick(COACH_MODULES[phase.id], Math.floor(phaseDayIndex / 4));
  const isWeeklyReview = programDay % 7 === 0;
  const reference = pick(INFLUENCES, dayIndex);
  const track = getAlignedExerciseTrack(phase.id, focusKey, module.title, phaseDayIndex);
  const trackExercise = pick(track.exercises, phaseDayIndex);
  const extraNote = getChapterExtraNote(phase.id, focusKey, module.title, phaseDayIndex);
  const theme = [
    "Pause before the old pattern",
    "Separate fact from fear",
    "Ask directly without pressure",
    "Return to your own body",
    "Choose self-respect first",
    "Repair without chasing",
    "Let space be space",
    "Tell the truth calmly",
    "Notice the younger wound",
    "Practice one secure repetition",
    "Hold the boundary",
    "Review and reset",
    "Ask for the real need",
    "Stop testing and state it",
    "Keep your routine intact",
    "Repair one clean part",
    "Let discomfort pass through",
    "Choose the value-led action",
    "Notice what has improved",
    "Practice receiving love calmly",
    "Return to your center"
  ][dayIndex % 20];

  return {
    title: isWeeklyReview ? WEEKLY_REVIEW.title : theme,
    phase,
    contentDay,
    moduleTitle: module.title,
    instruction: isWeeklyReview ? WEEKLY_REVIEW.instruction : `${module.instruction} ${focus.instruction}`,
    steps: isWeeklyReview ? WEEKLY_REVIEW.steps : module.steps,
    example: pick(focus.examples, dayIndex),
    exercise: isWeeklyReview ? "Weekly secure review" : trackExercise.name,
    exerciseSteps: isWeeklyReview ? WEEKLY_REVIEW.steps : trackExercise.steps,
    prompt: isWeeklyReview ? WEEKLY_REVIEW.prompt : trackExercise.prompt,
    action: focus.action,
    reference: {
      author: reference.author,
      work: reference.work,
      theme: reference.theme,
      note: pick(reference.uses, dayIndex)
    },
    track,
    exerciseTrackTitle: isWeeklyReview ? "Weekly secure review" : track.title,
    extraNote
  };
}

function getChapterExtraNote(phaseId, focusKey, moduleTitle, phaseDayIndex) {
  const moduleMatches = EXTRA_NOTES.filter((note) => noteMatches(note.moduleTitles, moduleTitle));
  const phaseMatches = EXTRA_NOTES.filter((note) => noteMatches(note.phaseIds, phaseId));
  const focusModuleMatches = moduleMatches.filter((note) => noteMatches(note.focusKeys, focusKey));
  const focusPhaseMatches = phaseMatches.filter((note) => noteMatches(note.focusKeys, focusKey));
  const pool = focusModuleMatches.length
    ? focusModuleMatches
    : moduleMatches.length
      ? moduleMatches
      : focusPhaseMatches.length
        ? focusPhaseMatches
        : phaseMatches.length
          ? phaseMatches
          : EXTRA_NOTES;

  return pick(pool, phaseDayIndex);
}

function noteMatches(values = [], expected) {
  return values.includes(expected);
}

function getAlignedExerciseTrack(phaseId, focusKey, moduleTitle, phaseDayIndex) {
  const moduleTracks = resolveExerciseTracks(MODULE_EXERCISE_TRACKS[moduleTitle]);
  const phaseTracks = resolveExerciseTracks(PHASE_EXERCISE_TRACKS[phaseId]);
  const focusTracks = resolveExerciseTracks(FOCUS_EXERCISE_TRACKS[focusKey]);
  const baseTracks = moduleTracks.length ? moduleTracks : phaseTracks;
  const prioritized = focusTracks.filter((track) => baseTracks.some((item) => item.title === track.title));
  const merged = [...prioritized];

  for (const track of baseTracks) {
    if (!merged.some((item) => item.title === track.title)) merged.push(track);
  }

  return pick(merged.length ? merged : ALL_EXERCISE_TRACKS, phaseDayIndex);
}

function resolveExerciseTracks(titles = []) {
  return titles
    .map((title) => ALL_EXERCISE_TRACKS.find((track) => track.title === title))
    .filter(Boolean);
}

function getPhase(day) {
  return PHASES.find((phase) => day >= phase.days[0] && day <= phase.days[1]) || PHASES[PHASES.length - 1];
}

function getContentDay(programDay) {
  const offset = Number(state.settings?.contentOffset ?? Math.max(0, (state.profile?.analysis?.startDay || 1) - 1));
  const routedDay = Math.max(1, (Number(programDay) || 1) + offset);
  if (routedDay <= TOTAL_DAYS) return routedDay;

  const maintainPhase = PHASES.find((phase) => phase.id === "maintain") || PHASES[PHASES.length - 1];
  const cycleLength = maintainPhase.days[1] - maintainPhase.days[0] + 1;
  const overflowIndex = routedDay - TOTAL_DAYS - 1;
  return maintainPhase.days[0] + (overflowIndex % cycleLength);
}

function pick(items, index) {
  return items[index % items.length];
}

function analyzeProfile(input) {
  const text = `${input.stage} ${input.happening} ${input.trigger} ${input.tried} ${input.story}`.toLowerCase();
  const scores = Object.entries(FOCUS_AREAS).map(([key, value]) => {
    const score = value.keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0);
    return [key, score];
  });
  scores.sort((a, b) => b[1] - a[1]);

  const primaryFocus = scores[0][1] > 0 ? scores[0][0] : "anxious";
  const stage = detectStage(input.stage, text);
  const startDay = STAGE_START_DAY[stage];

  return {
    stage,
    stageLabel: stage === "start" ? "Beginning" : stage === "build" ? "Middle practice" : "Maintenance",
    primaryFocus,
    primaryFocusLabel: FOCUS_AREAS[primaryFocus].label,
    startDay,
    scores
  };
}

function detectStage(selectedStage, text) {
  if (selectedStage === "maintain" || /\b(maintain|mastered|continue|long term|grounded)\b/.test(text)) return "maintain";
  if (selectedStage === "build" || /\b(already|middle|therapy|working on|practice|started)\b/.test(text)) return "build";
  return "start";
}

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function calculateStreak(sessions) {
  const dates = [...new Set(sessions.map((session) => session.createdAt.slice(0, 10)))].sort().reverse();
  if (!dates.length) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const date of dates) {
    const sessionDate = new Date(`${date}T00:00:00`);
    const diff = Math.round((cursor - sessionDate) / 86400000);
    if (diff === streak) {
      streak += 1;
    } else if (streak === 0 && diff === 1) {
      streak = 1;
    } else {
      break;
    }
  }

  return streak;
}

function calculateSelfCareStats() {
  const completedDates = Object.entries(state.selfCareLog)
    .filter(([, entry]) => entry.completedAt)
    .map(([date]) => date)
    .sort()
    .reverse();

  const completed = completedDates.length;
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const date of completedDates) {
    const selfCareDate = new Date(`${date}T00:00:00`);
    const diff = Math.round((cursor - selfCareDate) / 86400000);
    if (diff === streak) {
      streak += 1;
    } else if (streak === 0 && diff === 1) {
      streak = 1;
    } else {
      break;
    }
  }

  return { completed, streak };
}

function getEarnedMilestones() {
  const completed = calculateSelfCareStats().completed;
  return MILESTONES.filter((milestone) => completed >= milestone.days);
}

function getWeeklySummary() {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const recentSessions = state.sessions.filter((session) => new Date(session.createdAt) >= weekStart);
  const recentSelfCare = Object.values(state.selfCareLog).filter((entry) => new Date(`${entry.date}T00:00:00`) >= weekStart);
  const completedSelfCare = recentSelfCare.filter((entry) => entry.completedAt);
  const shifts = recentSessions
    .map((session) => Number(session.intensity) - Number(session.intensityAfter))
    .filter((value) => Number.isFinite(value) && value !== 0);
  const averageShift = shifts.length
    ? (shifts.reduce((total, value) => total + value, 0) / shifts.length).toFixed(1)
    : "n/a";
  const strongestSelfCare = completedSelfCare[0]?.action || "Keep one small promise to yourself and record proof.";
  const repeatedTrigger = mostCommonTriggers(recentSessions)[0]?.[0];

  return {
    sessions: recentSessions.length,
    selfCareDone: completedSelfCare.length,
    averageShift,
    win: completedSelfCare.length
      ? `You showed up for yourself with: ${strongestSelfCare}`
      : "No self-care completion logged this week yet. Make the next promise smaller.",
    reset: repeatedTrigger
      ? `The repeated trigger to watch is "${repeatedTrigger}". Prepare the secure response before it happens again.`
      : "No repeated trigger yet. Keep tracking honestly so the pattern can become visible."
  };
}

function getMissedDayRecovery() {
  const lastActivity = getLastActivityDate();
  if (!lastActivity) {
    return {
      message: "No missed day to repair. Start with one small promise today.",
      steps: ["Choose one action for yourself.", "Make it smaller than your anxiety wants.", "Log proof when it is done."]
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(`${lastActivity}T00:00:00`);
  const missed = Math.max(0, Math.round((today - last) / 86400000) - 1);

  if (missed === 0) {
    return {
      message: "You are current. The next win is not intensity; it is returning tomorrow.",
      steps: ["Keep today's promise simple.", "Log proof instead of perfection.", "Review what helped you return."]
    };
  }

  return {
    message: `You missed ${missed} day${missed === 1 ? "" : "s"}. Nothing is ruined. Recovery counts as practice.`,
    steps: [
      "Do not restart the whole path.",
      "Choose a five-minute self-care action.",
      "Write what interrupted you without shame.",
      "Return today and let that be the win."
    ]
  };
}

function getLastActivityDate() {
  const sessionDates = state.sessions.map((session) => session.createdAt.slice(0, 10));
  const selfCareDates = Object.values(state.selfCareLog)
    .filter((entry) => entry.completedAt)
    .map((entry) => entry.date);
  return [...sessionDates, ...selfCareDates].sort().reverse()[0] || null;
}

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mostCommonTriggers(sessions) {
  const counts = new Map();
  sessions.forEach((session) => {
    const key = (session.trigger || "").trim().toLowerCase();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

document.addEventListener("input", (event) => {
  if (event.target.id === "story") {
    const count = countWords(event.target.value);
    const counter = document.getElementById("wordCount");
    if (counter) counter.textContent = count;
    event.target.setCustomValidity(count > 500 ? "Keep your story to 500 words or less." : "");
    return;
  }

  if (event.target.id === "searchQuery") {
    renderAutocomplete(event.target.value);
  }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (event.target.id === "onboardingForm") {
    await handleOnboarding(event.target);
  }

  if (event.target.id === "dailyForm") {
    await handleDailySession(event.target);
  }

  if (event.target.id === "journalForm") {
    await handleJournalEntry(event.target);
  }

  if (event.target.id === "selfCareForm") {
    await handleSelfCareEntry(event.target);
  }

  if (event.target.id === "searchForm") {
    await handleSearch(event.target);
  }

  if (event.target.id === "reminderForm") {
    await handleReminders(event.target);
  }

  if (event.target.id === "weeklyResetForm") {
    await handleWeeklyReset(event.target);
  }
});

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    activeView = viewButton.dataset.view;
    render();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  await handleAction(actionButton.dataset.action, actionButton);
});

document.addEventListener("change", async (event) => {
  if (event.target.dataset.action === "import-file" && event.target.files?.[0]) {
    await importBackup(event.target.files[0]);
  }
});

async function handleOnboarding(form) {
  const formData = new FormData(form);
  const story = String(formData.get("story") || "");
  if (countWords(story) > 500) {
    showToast("Keep your story to 500 words or less.");
    return;
  }

  const input = {
    name: String(formData.get("name") || "").trim(),
    stage: String(formData.get("stage") || "start"),
    happening: String(formData.get("happening") || "").trim(),
    trigger: String(formData.get("trigger") || "").trim(),
    tried: String(formData.get("tried") || "").trim(),
    story: story.trim()
  };

  const analysis = analyzeProfile(input);
  const profile = {
    ...input,
    analysis,
    createdAt: new Date().toISOString()
  };

  const settings = {
    currentDay: 1,
    contentOffset: Math.max(0, analysis.startDay - 1),
    totalDays: TOTAL_DAYS,
    programDayModel: 2,
    startedAt: new Date().toISOString()
  };

  await Promise.all([
    setKV("profile", profile),
    setKV("settings", settings)
  ]);

  await loadState();
  activeView = "today";
  render();
  showToast(`Path built: ${analysis.stageLabel}, ${analysis.primaryFocusLabel}. Day 1 starts now.`);
}

async function handleDailySession(form) {
  const formData = new FormData(form);
  const day = Number(formData.get("day"));
  const content = getDailyContent(day);
  const session = {
    id: createId(),
    day,
    contentDay: content.contentDay,
    title: content.title,
    mood: String(formData.get("moodBefore") || ""),
    moodBefore: String(formData.get("moodBefore") || ""),
    moodAfter: String(formData.get("moodAfter") || ""),
    intensity: String(formData.get("intensity") || ""),
    intensityAfter: String(formData.get("intensityAfter") || ""),
    trigger: String(formData.get("trigger") || "").trim(),
    note: String(formData.get("note") || "").trim(),
    keptPromise: String(formData.get("keptPromise") || ""),
    eveningReflection: String(formData.get("eveningReflection") || "").trim(),
    createdAt: new Date().toISOString()
  };

  const journalEntry = {
    id: createId(),
    day,
    contentDay: content.contentDay,
    prompt: content.prompt,
    text: [session.note, session.eveningReflection ? `Tonight reflection: ${session.eveningReflection}` : ""].filter(Boolean).join("\n\n"),
    createdAt: session.createdAt,
    source: "daily"
  };

  state.settings.currentDay = Math.min(TOTAL_DAYS, state.settings.currentDay + 1);
  await Promise.all([
    addRecord("sessions", session),
    addRecord("journal", journalEntry),
    setKV("settings", state.settings)
  ]);
  await loadState();
  render();
  showToast("Session saved. Your next step is ready.");
}

async function handleJournalEntry(form) {
  const formData = new FormData(form);
  const entry = {
    id: createId(),
    prompt: String(formData.get("prompt") || "Free note").trim(),
    text: String(formData.get("text") || "").trim(),
    createdAt: new Date().toISOString(),
    source: "journal"
  };

  await addRecord("journal", entry);
  await loadState();
  render();
  showToast("Journal entry saved.");
}

async function handleSelfCareEntry(form) {
  const formData = new FormData(form);
  const todayKey = getTodayKey();
  const existing = state.selfCareLog[todayKey] || {};
  const completed = formData.get("completed") === "on";
  const entry = {
    ...existing,
    date: todayKey,
    action: String(formData.get("action") || "").trim(),
    category: String(formData.get("category") || "Body care"),
    proof: String(formData.get("proof") || "").trim(),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: completed ? existing.completedAt || new Date().toISOString() : null
  };

  state.selfCareLog = {
    ...state.selfCareLog,
    [todayKey]: entry
  };

  await setKV("selfCareLog", state.selfCareLog);
  await loadState();
  render();
  showToast(completed ? "Self-care completed for today." : "Today's self-care commitment saved.");
}

async function handleSearch(form) {
  const formData = new FormData(form);
  state.settings.searchQuery = String(formData.get("query") || "").trim();
  await setKV("settings", state.settings);
  await loadState();
  activeView = "search";
  render();
}

async function handleReminders(form) {
  const formData = new FormData(form);
  state.reminders = {
    enabled: formData.get("enabled") === "on",
    dailyTime: String(formData.get("dailyTime") || "09:00"),
    eveningTime: String(formData.get("eveningTime") || "20:30"),
    weeklyDay: "Sunday",
    weeklyTime: String(formData.get("weeklyTime") || "18:00")
  };

  await setKV("reminders", state.reminders);
  await loadState();
  scheduleReminderNudges();
  render();
  showToast("Reminder settings saved on this device.");
}

async function handleWeeklyReset(form) {
  const formData = new FormData(form);
  const review = {
    id: createId(),
    createdAt: new Date().toISOString(),
    improved: String(formData.get("improved") || "").trim(),
    chased: String(formData.get("chased") || "").trim(),
    choseSelf: String(formData.get("choseSelf") || "").trim(),
    nextPractice: String(formData.get("nextPractice") || "").trim(),
    stability: String(formData.get("stability") || "").trim()
  };

  state.weeklyReviews = [review, ...state.weeklyReviews].slice(0, 52);
  await setKV("weeklyReviews", state.weeklyReviews);
  await loadState();
  render();
  showToast("Weekly reset saved.");
}

async function handleAction(action, element) {
  if (action === "skip-day") {
    state.settings.currentDay = Math.min(TOTAL_DAYS, state.settings.currentDay + 1);
    await setKV("settings", state.settings);
    await loadState();
    render();
    showToast("Moved to the next day.");
  }

  if (action === "previous-day") {
    state.settings.currentDay = Math.max(1, state.settings.currentDay - 1);
    await setKV("settings", state.settings);
    await loadState();
    render();
  }

  if (action === "next-day") {
    state.settings.currentDay = Math.min(TOTAL_DAYS, state.settings.currentDay + 1);
    await setKV("settings", state.settings);
    await loadState();
    render();
  }

  if (action === "export-data") {
    exportBackup();
  }

  if (action === "copy-text") {
    await copyText(element.dataset.text || "");
  }

  if (action === "toggle-bookmark") {
    await toggleBookmarkFromElement(element);
  }

  if (action === "remove-bookmark") {
    await removeBookmark(element.dataset.bookmarkId);
  }

  if (action === "set-search") {
    state.settings.searchQuery = element.dataset.query || "";
    await setKV("settings", state.settings);
    await loadState();
    activeView = "search";
    render();
  }

  if (action === "share-app") {
    await shareAppLink();
  }

  if (action === "request-notifications") {
    await requestNotificationPermission();
  }

  if (action === "reset-app") {
    await resetApp();
  }
}

function bookmarkButton(item) {
  const id = bookmarkId(item);
  const saved = isBookmarked(id);
  return `
    <button class="button secondary" type="button"
      data-action="toggle-bookmark"
      data-bookmark-id="${escapeHTML(id)}"
      data-bookmark-type="${escapeHTML(item.type)}"
      data-bookmark-title="${escapeHTML(item.title)}"
      data-bookmark-body="${escapeHTML(item.body)}"
      data-bookmark-meta="${escapeHTML(item.meta || "")}">
      ${saved ? "Saved" : "Save this"}
    </button>
  `;
}

function bookmarkId(item) {
  return `${item.type}:${item.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isBookmarked(id) {
  return state.bookmarks.some((bookmark) => bookmark.id === id);
}

async function toggleBookmarkFromElement(element) {
  const item = {
    id: element.dataset.bookmarkId,
    type: element.dataset.bookmarkType || "saved",
    title: element.dataset.bookmarkTitle || "Saved item",
    body: element.dataset.bookmarkBody || "",
    meta: element.dataset.bookmarkMeta || "",
    createdAt: new Date().toISOString()
  };

  if (isBookmarked(item.id)) {
    state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.id !== item.id);
    showToast("Removed from saved.");
  } else {
    state.bookmarks = [item, ...state.bookmarks].slice(0, 100);
    showToast("Saved.");
  }

  await setKV("bookmarks", state.bookmarks);
  await loadState();
  render();
}

async function removeBookmark(id) {
  state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.id !== id);
  await setKV("bookmarks", state.bookmarks);
  await loadState();
  render();
  showToast("Removed from saved.");
}

function searchContent(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const index = getSearchIndex();

  return index
    .map((item) => {
      const haystack = `${item.title} ${item.body} ${item.meta || ""} ${item.tags || ""}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 30);
}

function getSearchSuggestions(query) {
  const cleanQuery = normalizeSearchText(query);
  if (cleanQuery.length < 2) return [];
  const terms = getAvailableSearchTerms();

  return terms
    .map((term) => ({
      term,
      normalized: normalizeSearchText(term)
    }))
    .filter((item) => item.normalized.includes(cleanQuery))
    .sort((a, b) => {
      const aStarts = a.normalized.startsWith(cleanQuery) ? 0 : 1;
      const bStarts = b.normalized.startsWith(cleanQuery) ? 0 : 1;
      return aStarts - bStarts || a.term.length - b.term.length || a.term.localeCompare(b.term);
    })
    .slice(0, 10)
    .map((item) => item.term);
}

function getAvailableSearchTerms() {
  const terms = new Set([
    "avoidant",
    "anxious",
    "attachment",
    "blocking",
    "boundaries",
    "confidence",
    "consistency",
    "daily practice",
    "emotional regulation",
    "grief",
    "hard conversation",
    "jealousy",
    "letting go",
    "no contact",
    "panic",
    "reassurance",
    "repair",
    "self-care",
    "self-respect",
    "self-trust",
    "space",
    "trust"
  ]);

  for (const item of getSearchIndex()) {
    terms.add(item.title);
    if (item.meta) {
      String(item.meta).split(",").map((value) => value.trim()).filter(Boolean).forEach((value) => terms.add(value));
    }
  }

  return [...terms]
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .sort((a, b) => a.localeCompare(b));
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function highlightSuggestion(suggestion, query) {
  const cleanQuery = normalizeSearchText(query);
  const cleanSuggestion = suggestion.toLowerCase();
  const index = cleanSuggestion.indexOf(cleanQuery);
  if (index < 0 || !cleanQuery) return escapeHTML(suggestion);

  const before = suggestion.slice(0, index);
  const match = suggestion.slice(index, index + cleanQuery.length);
  const after = suggestion.slice(index + cleanQuery.length);
  return `${escapeHTML(before)}<strong>${escapeHTML(match)}</strong>${escapeHTML(after)}`;
}

function renderAutocomplete(query) {
  const wrapper = document.querySelector(".autocomplete");
  if (!wrapper) return;
  const existing = wrapper.querySelector(".suggestion-list");
  if (existing) existing.remove();

  const suggestions = getSearchSuggestions(query);
  if (!suggestions.length) return;

  const list = document.createElement("div");
  list.className = "suggestion-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Search suggestions");
  list.innerHTML = suggestions.map((suggestion) => `
    <button class="suggestion-item" type="button" data-action="set-search" data-query="${escapeHTML(suggestion)}">
      ${highlightSuggestion(suggestion, query)}
    </button>
  `).join("");
  wrapper.appendChild(list);
}

function getSearchIndex() {
  const situations = SITUATION_GUIDES.map((item) => ({
    type: "situation",
    title: item.title,
    body: `${item.purpose} ${item.script}`,
    meta: item.tags.join(", "),
    tags: item.tags.join(" ")
  }));
  const sos = QUICK_SOS.map((item) => ({
    type: "sos",
    title: item.title,
    body: `${item.purpose} ${item.script}`,
    meta: "quick reset",
    tags: item.id
  }));
  const notes = EXTRA_NOTES.map((item) => ({
    type: "chapter note",
    title: item.title,
    body: `${item.body} ${item.script}`,
    meta: item.moduleTitles.join(", "),
    tags: [...item.phaseIds, ...item.focusKeys].join(" ")
  }));
  const scripts = LIBRARY.map((item) => ({
    type: "script",
    title: item.title,
    body: item.script,
    meta: item.focus,
    tags: item.steps.join(" ")
  }));
  const exercises = ALL_EXERCISE_TRACKS.flatMap((track) => track.exercises.map((exercise) => ({
    type: "exercise",
    title: exercise.name,
    body: exercise.prompt,
    meta: track.title,
    tags: `${track.title} ${track.goal} ${exercise.steps.join(" ")}`
  })));
  const attachments = ATTACHMENT_TYPES.map((type) => ({
    type: "attachment",
    title: type.title,
    body: `${type.coreFear} ${type.underStress} ${type.secureMove}`,
    meta: "attachment map",
    tags: type.signs.join(" ")
  }));

  return [...situations, ...sos, ...notes, ...scripts, ...exercises, ...attachments];
}

function getRewardBadges() {
  return REWARD_BADGES.map((badge) => ({
    ...badge,
    earned: Boolean(badge.check())
  }));
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied.");
  } catch {
    showToast("Copy not available in this browser.");
  }
}

async function shareAppLink() {
  const payload = {
    title: "Secure Coach",
    text: "Private local-first daily secure attachment coach.",
    url: location.href
  };

  if (navigator.share) {
    await navigator.share(payload).catch(() => {});
    return;
  }

  await copyText(location.href);
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("Notifications are not available in this browser.");
    return;
  }

  const permission = await Notification.requestPermission();
  showToast(permission === "granted" ? "Notifications allowed." : "Notifications not allowed.");
}

function scheduleReminderNudges() {
  reminderTimers.forEach((timer) => clearTimeout(timer));
  reminderTimers = [];
  if (!state.reminders?.enabled) return;

  const reminders = [
    { time: state.reminders.dailyTime, title: "Secure Coach", body: "Do today's secure practice." },
    { time: state.reminders.eveningTime, title: "Secure Coach", body: "Evening reflection: did you keep your promise to yourself?" },
    { time: state.reminders.weeklyTime, title: "Secure Coach", body: "Weekly reset: what improved and what needs repetition?", weekly: true }
  ];

  for (const reminder of reminders) {
    const delay = getReminderDelay(reminder.time, reminder.weekly);
    reminderTimers.push(setTimeout(() => showReminder(reminder.title, reminder.body), delay));
  }
}

function getReminderDelay(time, weekly = false) {
  const [hours, minutes] = String(time || "09:00").split(":").map(Number);
  const target = new Date();
  target.setHours(hours || 9, minutes || 0, 0, 0);
  if (weekly) {
    const daysUntilSunday = (7 - target.getDay()) % 7;
    target.setDate(target.getDate() + daysUntilSunday);
  }
  if (target <= new Date()) target.setDate(target.getDate() + (weekly ? 7 : 1));
  return Math.max(1000, target - new Date());
}

function showReminder(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  } else {
    showToast(body);
  }
  scheduleReminderNudges();
}

function exportBackup() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    settings: state.settings,
    selfCareLog: state.selfCareLog,
    bookmarks: state.bookmarks,
    reminders: state.reminders,
    weeklyReviews: state.weeklyReviews,
    sessions: state.sessions,
    journal: state.journal
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `secure-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importBackup(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    showToast("That backup file is not valid JSON.");
    return;
  }

  if (!payload.profile || !payload.settings || !Array.isArray(payload.sessions) || !Array.isArray(payload.journal)) {
    showToast("That backup file does not match Secure Coach data.");
    return;
  }

  const confirmed = window.confirm("Importing replaces the current local data on this device. Continue?");
  if (!confirmed) return;

  await Promise.all([clearStore("kv"), clearStore("sessions"), clearStore("journal")]);
  await Promise.all([
    setKV("profile", payload.profile),
    setKV("settings", payload.settings),
    setKV("selfCareLog", payload.selfCareLog || {}),
    setKV("bookmarks", payload.bookmarks || []),
    setKV("reminders", payload.reminders || DEFAULT_REMINDERS),
    setKV("weeklyReviews", payload.weeklyReviews || []),
    ...payload.sessions.map((session) => addRecord("sessions", session)),
    ...payload.journal.map((entry) => addRecord("journal", entry))
  ]);
  await loadState();
  activeView = "today";
  render();
  showToast("Backup imported.");
}

async function resetApp() {
  const confirmed = window.confirm("This deletes the local intake, sessions, and journal entries from this browser. Export first if you want a backup. Continue?");
  if (!confirmed) return;

  await Promise.all([clearStore("kv"), clearStore("sessions"), clearStore("journal")]);
  await loadState();
  activeView = "today";
  render();
  showToast("Local data reset.");
}
