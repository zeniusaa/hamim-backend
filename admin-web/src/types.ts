// TypeScript types — mencerminkan shape response API admin HAMIM

export interface AdminMe {
  id: string
  email: string
  role: string
  created_at?: string
}

export interface UserListItem {
  id: string
  email: string
  phone_number: string | null
  role: 'USER' | 'ADMIN'
  email_verified: boolean
  is_onboarded: boolean
  deleted_at: string | null
  created_at: string
  profile: { display_name: string | null; avatar_url: string | null } | null
  lives: {
    current_lives: number
    max_lives: number
    is_premium: boolean
    premium_expires_at: string | null
  } | null
  leaderboard_snapshot: { total_juz_completed: number; current_level: number } | null
}

export interface UserLevelHistory {
  id: string
  level: number
  unlocked_at: string | null
}

// 1 baris progress belajar user: juz berapa, surah apa, kelompok ayat berapa.
export interface RecentProgress {
  ayah_id: string
  stage: string
  completed_at: string | null
  ayah_number: number
  juz_number: number
  surah: { id: string; number: number; name_transliteration: string }
  group: {
    audio_order: number
    ayah_start: number
    ayah_end: number
    qari_name: string
  } | null
}

export interface UserDetail extends UserListItem {
  profile: UserListItem['profile'] & {
    bio?: string | null
    city?: string | null
    learning_goal?: string | null
  } | null
  lives: NonNullable<UserListItem['lives']> & { last_life_lost_at: string | null } | null
  leaderboard_snapshot: NonNullable<UserListItem['leaderboard_snapshot']> | null
  language: { code: string; name: string } | null
  stats: { ayah_completed: number; quiz_attempts: number; quiz_correct: number }
  level_history: UserLevelHistory[]
  recent_progress: RecentProgress[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface SurahListItem {
  id: string
  number: number
  name_arabic: string
  name_transliteration: string
  name_translation_id: string
  name_translation_en: string
  juz_start: number
  total_ayah: number
  revelation_type: 'makkiyah' | 'madaniyah'
  _count?: { ayahs: number }
}

export interface SurahDetail extends SurahListItem {
  _count: { ayahs: number; activity_logs: number }
  ayahs: { id: string; ayah_number: number; juz_number: number }[]
  total_groups: number
  groups: {
    audio_id: string
    audio_order: number
    qari_name: string
    duration_seconds: number | null
    ayah_start: number
    ayah_end: number
    ayah_count: number
  }[]
}

export interface AyahListItem {
  id: string
  ayah_number: number
  juz_number: number
  _count?: { quiz_questions: number; audio_files: number }
}

export interface QuizOption {
  id: string
  option_text: string
  is_correct: boolean
  order_index: number
}

export interface QuizQuestion {
  id: string
  type: string
  question_text: string
  language_id: string
  language?: { code: string; name: string } | null
  options: QuizOption[]
  _count?: { attempts: number }
}

export interface AudioFile {
  id: string
  audio_order: number
  qari_name: string
  file_url: string
  duration_seconds: number | null
}

export interface AyahDetail {
  id: string
  ayah_number: number
  juz_number: number
  text_arabic: string
  text_uthmani: string
  translation_id: string | null
  translation_en: string | null
  transliteration: string | null
  surah: { id: string; number: number; name_transliteration: string }
  audio_files: AudioFile[]
  quiz_questions: (QuizQuestion & { language: { code: string } | null })[]
}

export interface AssetBundle {
  id: string
  name: string
  version: number
  total_size_bytes: number | null
  description: string | null
  bundle_items: { id: string; asset_type: string }[]
  _count?: { downloaded_by_users: number }
}

export interface AssetSummary {
  icons: { id: string; name: string; file_url: string; version: number }[]
  backgrounds: { id: string; name: string; file_url: string; version: number }[]
  music: { id: string; name: string; file_url: string; version: number }[]
  bundles: AssetBundle[]
}
