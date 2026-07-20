const CHAT_INTENTS = [
  {
    id: "greeting",

    examples: [
      "hello",
      "hey",
      "yo",
      "what's up",
      "how are you",
      "you online?",
    ],

    replies: [
      "yo!",
      "hey what's up",
      "yooo",
      "just chilling, you?",
      "yeah I'm online",
      "what's good?",
    ],
  },

  {
    id: "invite_to_play",

    examples: [
      "want to play?",
      "join my game",
      "let's play together",
      "can you join me?",
      "want to queue?",
      "play some matches with me",
    ],

    replies: [
      "yeah send an invite",
      "I'm down",
      "let's run it",
      "give me a sec and I'll join",
      "what mode?",
      "sure, make a lobby",
    ],
  },

  {
    id: "rank_question",

    examples: [
      "what rank are you?",
      "what's your rating?",
      "do you play ranked?",
      "what division are you?",
      "what's your highest rank?",
    ],

    replies: [
      "I'm still climbing lol",
      "not high enough",
      "ranked has been rough lately",
      "I mostly play casual",
      "what rank are you?",
      "trying to rank up tonight",
    ],
  },

  {
    id: "compliment",

    examples: [
      "nice avatar",
      "your character looks cool",
      "I like your outfit",
      "your profile looks good",
      "nice skin",
      "cool hat",
    ],

    replies: [
      "ty!",
      "thanks, I just changed it",
      "appreciate it",
      "your avatar is clean too",
      "finally saved enough coins for it",
      "thanks, the shop had good stuff today",
    ],
  },

  {
    id: "trade",

    examples: [
      "want to trade?",
      "can I trade with you?",
      "what items do you have?",
      "do you have anything for trade?",
      "send a trade request",
    ],

    replies: [
      "sure, what are you looking for?",
      "send me a trade request",
      "lemme check my inventory",
      "what do you have?",
      "maybe, depends on the offer",
      "I have a few extra items",
    ],
  },

  {
    id: "good_game",

    examples: [
      "good game",
      "gg",
      "that was a great match",
      "nice game",
      "we played well",
    ],

    replies: [
      "gg!",
      "ggs",
      "that was a good one",
      "we were cooking",
      "run it back?",
      "that ending was insane",
    ],
  },

  {
    id: "loss",

    examples: [
      "we lost",
      "that match was terrible",
      "we got destroyed",
      "I played badly",
      "that was rough",
    ],

    replies: [
      "we go again",
      "can't end on a loss",
      "next game is ours",
      "that lobby was cursed",
      "first game doesn't count",
      "we almost had it",
    ],
  },

  {
    id: "lag",

    examples: [
      "I'm lagging",
      "my ping is bad",
      "the server is lagging",
      "my game froze",
      "I disconnected",
    ],

    replies: [
      "same, the server feels weird",
      "your character was teleporting lol",
      "try reconnecting",
      "my ping isn't great either",
      "classic server moment",
      "I'll wait for you to restart",
    ],
  },

  {
    id: "neo_nyke",

    examples: [
      "what is Neo Nyke?",
      "want to play Neo Nyke?",
      "have you played Neo Nyke?",
      "send me the Neo Nyke game",
      "let's do a Neo Nyke run",
    ],

    replies: [
      "yeah let's run it",
      "send me your high score",
      "I'm trying to get a better run",
      "the dungeon keeps destroying me lol",
      "play it here: https://neonyke.davidkozdra.workers.dev/",
      "we need multiplayer Neo Nyke",
    ],
  },

  {
    id: "goodbye",

    examples: [
      "goodbye",
      "I'm leaving",
      "I'm getting offline",
      "see you later",
      "goodnight",
      "I have to go",
    ],

    replies: [
      "later!",
      "ggs, catch you tomorrow",
      "have a good one",
      "night",
      "see ya",
      "message me when you're back",
    ],
  },
];

class ChatOptionsManager {
  get() {
    return CHAT_INTENTS;
  }

  length() {
    return CHAT_INTENTS.length;
  }
}
