export type VideoKind = "youtube" | "vimeo" | "video" | "page";
export type Accent = "caramel" | "sky" | "pink" | "violet" | "yellow";
export interface Course { id: string; slug: string; title: string; subtitle: string; description: string; cover_url: string | null; hero_url: string | null; accent: Accent; position: number; published: boolean; }
export interface CourseModule { id: string; course_id: string; title: string; description: string; position: number; }
export interface Material { label: string; url: string; }
export interface Lesson { id: string; course_id: string; module_id: string; title: string; description: string; video_kind: VideoKind; video_ref: string; duration_seconds: number; cover_url: string | null; materials: Material[]; position: number; published: boolean; }
export interface Progress { lesson_id: string; position_seconds: number; completed_at: string | null; last_watched_at: string; }
export interface Comment { id: string; lesson_id: string; user_id: string; parent_id: string | null; body: string; author_name: string; author_avatar: string | null; edited: boolean; created_at: string; }
export interface Like { comment_id: string; user_id: string; }
export interface AcademyData { courses: Course[]; modules: CourseModule[]; lessons: Lesson[]; progress: Progress[]; favorites: string[]; admin: boolean; }
export type CourseInput = Omit<Course, "id"> & { id?: string };
export type ModuleInput = Omit<CourseModule, "id"> & { id?: string };
export type LessonInput = Omit<Lesson, "id"> & { id?: string };
