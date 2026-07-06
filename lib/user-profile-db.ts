export {
  getUserProfileFromDb,
  saveUserProfileToDb,
  loadBookmarksFromDb,
  saveBookmarksToDb,
  toggleBookmarkInDb,
  recordAIUsageInDb,
  loadAIUsageFromDb,
  loadAISummariesFromDb,
  persistAISummaryToDb,
  type UserProfileDocument,
} from '@/lib/user/profile-db';
