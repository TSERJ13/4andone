/**
 * Calculates a search relevance score for a dance track based on a user's query.
 * Strict priority order:
 * 1. Song Title (Highest priority)
 * 2. Artist
 * 3. Album
 * 4. Dance Style
 */
export function getTrackRelevanceScore(track: any, query: string): number {
  const q = (query || '').toLowerCase().trim();
  if (!q) return 0;

  const title = (track.title || '').toLowerCase().trim();
  const artist = (track.artist || '').toLowerCase().trim();
  const album = (track.album || '').toLowerCase().trim();
  const style = (track.style || '').toLowerCase().trim();

  let score = 0;

  // 1. Song Title Priority (Highest priority)
  if (title === q) {
    score += 1000;
  } else if (title.startsWith(q)) {
    score += 500;
  } else if (title.split(/[\s\-_(),.]+/).some((w: string) => w.startsWith(q))) {
    score += 350;
  } else if (title.includes(q)) {
    score += 200;
  }

  // 2. Artist Priority (Second priority)
  if (artist) {
    if (artist === q) {
      score += 120;
    } else if (artist.startsWith(q)) {
      score += 90;
    } else if (artist.split(/[\s\-_(),.]+/).some((w: string) => w.startsWith(q))) {
      score += 70;
    } else if (artist.includes(q)) {
      score += 40;
    }
  }

  // 3. Album Priority (Third priority)
  if (album) {
    if (album === q) {
      score += 35;
    } else if (album.startsWith(q)) {
      score += 25;
    } else if (album.includes(q)) {
      score += 15;
    }
  }

  // 4. Dance Style Priority (Fourth priority)
  if (style) {
    if (style === q) {
      score += 10;
    } else if (style.startsWith(q)) {
      score += 8;
    } else if (style.includes(q)) {
      score += 5;
    }
  }

  // Bonus for closer title length (shorter title matching query is cleaner)
  if (score > 0 && title.length > 0) {
    score += Math.max(0, 10 - (title.length - q.length) * 0.1);
  }

  return score;
}
