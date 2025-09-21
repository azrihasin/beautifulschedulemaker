/**
 * Utility functions for automatically generating chat names with emojis
 */

// Common emojis for different topics/keywords
const TOPIC_EMOJIS: Record<string, string[]> = {
  // Academic subjects
  math: ['🔢', '📊', '🧮', '📐'],
  science: ['🔬', '⚗️', '🧪', '🔭'],
  physics: ['⚛️', '🌌', '⚡', '🔬'],
  chemistry: ['⚗️', '🧪', '🔬', '💊'],
  biology: ['🧬', '🦠', '🌱', '🔬'],
  history: ['📜', '🏛️', '⏳', '📚'],
  literature: ['📖', '✍️', '📝', '📚'],
  english: ['📖', '✍️', '📝', '🇬🇧'],
  language: ['🗣️', '📖', '✍️', '🌍'],
  art: ['🎨', '🖼️', '✏️', '🖌️'],
  music: ['🎵', '🎼', '🎹', '🎸'],
  computer: ['💻', '⌨️', '🖥️', '💾'],
  programming: ['💻', '⌨️', '🔧', '🖥️'],
  
  // Time-related
  schedule: ['📅', '⏰', '📋', '🗓️'],
  time: ['⏰', '⏱️', '🕐', '📅'],
  deadline: ['⏰', '📅', '⚠️', '🔔'],
  exam: ['📝', '📚', '⏰', '🎯'],
  test: ['📝', '📊', '✅', '🎯'],
  assignment: ['📝', '📋', '✍️', '📚'],
  homework: ['📚', '✍️', '📝', '🏠'],
  
  // General activities
  study: ['📚', '📖', '✍️', '🎓'],
  learn: ['🧠', '📚', '💡', '🎓'],
  help: ['🤝', '💡', '❓', '🆘'],
  question: ['❓', '🤔', '💭', '💡'],
  plan: ['📋', '📅', '🎯', '📝'],
  organize: ['📋', '🗂️', '📅', '✅'],
  
  // Default fallbacks
  default: ['💬', '🗨️', '💭', '📝', '🤖', '✨', '🎯', '📋']
};

// Question words that might indicate the type of conversation
const QUESTION_INDICATORS = [
  'what', 'when', 'where', 'why', 'how', 'which', 'who',
  'can', 'could', 'should', 'would', 'will', 'do', 'does', 'did'
];

/**
 * Extracts keywords from a message to determine the topic
 */
function extractKeywords(message: string): string[] {
  const words = message.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  return words;
}

/**
 * Finds the most relevant emoji based on message content
 */
function selectEmoji(message: string): string {
  const keywords = extractKeywords(message);
  
  // Check for topic matches
  for (const keyword of keywords) {
    for (const [topic, emojis] of Object.entries(TOPIC_EMOJIS)) {
      if (topic !== 'default' && keyword.includes(topic)) {
        return emojis[Math.floor(Math.random() * emojis.length)];
      }
    }
  }
  
  // Check for partial matches
  for (const keyword of keywords) {
    for (const [topic, emojis] of Object.entries(TOPIC_EMOJIS)) {
      if (topic !== 'default' && topic.includes(keyword)) {
        return emojis[Math.floor(Math.random() * emojis.length)];
      }
    }
  }
  
  // Return a random default emoji
  const defaultEmojis = TOPIC_EMOJIS.default;
  return defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
}

/**
 * Generates a meaningful title from the message content
 */
function generateTitle(message: string): string {
  // Clean the message
  const cleaned = message.trim();
  
  // If it's a question, try to extract the main topic
  const words = cleaned.split(/\s+/);
  
  // Remove common question words from the beginning
  let titleWords = words.filter(word => 
    !QUESTION_INDICATORS.includes(word.toLowerCase())
  );
  
  // If we removed too many words, keep some
  if (titleWords.length === 0) {
    titleWords = words.slice(0, 3);
  }
  
  // Take first 3-4 meaningful words
  const title = titleWords.slice(0, 4).join(' ');
  
  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
}

/**
 * Generates an automatic chat name with emoji based on the first user message
 */
export function generateChatName(firstUserMessage: string): string {
  if (!firstUserMessage || firstUserMessage.trim().length === 0) {
    // Fallback for empty messages
    const emoji = TOPIC_EMOJIS.default[Math.floor(Math.random() * TOPIC_EMOJIS.default.length)];
    return `${emoji} New Chat`;
  }
  
  const emoji = selectEmoji(firstUserMessage);
  const title = generateTitle(firstUserMessage);
  
  // Ensure the title isn't too long
  const maxTitleLength = 25;
  const truncatedTitle = title.length > maxTitleLength 
    ? title.substring(0, maxTitleLength).trim() + '...'
    : title;
  
  return `${emoji} ${truncatedTitle}`;
}

/**
 * Checks if a chat name is a default/temporary name that should be auto-renamed
 */
export function isDefaultChatName(chatName: string): boolean {
  // Treat common placeholder names as default/temporary
  if (!chatName || chatName.trim().length === 0) return true;

  const trimmed = chatName.trim();
  const defaultPattern = /^Chat \d+$/; // e.g., "Chat 1"

  // Also consider "New Chat" (case-insensitive) as a default name
  if (/^new chat$/i.test(trimmed)) return true;

  return defaultPattern.test(trimmed);
}

/**
 * Checks if a chat has any user messages (to determine if it should be auto-renamed)
 */
export function shouldAutoRename(chatName: string, messageCount: number): boolean {
  return isDefaultChatName(chatName) && messageCount === 0;
}