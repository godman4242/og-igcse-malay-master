export function calculateSM2(quality, interval, ease) {
  const newEase = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  let newInterval;
  if (quality < 3) newInterval = 1;
  else if (interval === 0) newInterval = 1;
  else if (interval === 1) newInterval = 3;
  else newInterval = Math.round(interval * newEase);
  return { interval: newInterval, ease: newEase };
}

export function reviewCard(card, quality) {
  const now = new Date();
  const { interval, ease } = calculateSM2(quality, card.interval || 0, card.ease || 2.5);
  return {
    ...card,
    box: quality >= 3 ? Math.min(5, (card.box || 1) + 1) : 1,
    interval,
    ease,
    lastReview: now.toISOString(),
    nextReview: new Date(now.getTime() + interval * 86400000).toISOString(),
    totalReviews: (card.totalReviews || 0) + 1,
  };
}

export function isDue(card) {
  if (!card.nextReview) return true;
  return new Date(card.nextReview) <= new Date();
}

export function getDueCards(cards) {
  return cards.filter(isDue);
}

export function sortByPriority(cards) {
  return [...cards].sort((a, b) => {
    if (isDue(a) && !isDue(b)) return -1;
    if (!isDue(a) && isDue(b)) return 1;
    return (a.box || 1) - (b.box || 1);
  });
}
