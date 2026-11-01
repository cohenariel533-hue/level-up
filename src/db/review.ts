/** Saving weekly reviews. */
import { db, type WeeklyReview } from './schema';

export function saveReview(review: Omit<WeeklyReview, 'completedAt'>) {
  const trim = (s: string) => s.trim();
  return db.reviews.put({
    ...review,
    wins: trim(review.wins),
    obstacles: trim(review.obstacles),
    nextGoals: {
      school: trim(review.nextGoals.school),
      gym: trim(review.nextGoals.gym),
      hustle: trim(review.nextGoals.hustle),
      money: trim(review.nextGoals.money),
    },
    completedAt: new Date().toISOString(),
  });
}
