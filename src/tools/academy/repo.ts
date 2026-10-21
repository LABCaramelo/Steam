import { supabase } from "../../supabase";
import type { AcademyData, Comment, CourseInput, Course, CourseModule, Lesson, LessonInput, Like, ModuleInput, Progress } from "./types";

export interface AcademyRepo {
  load(): Promise<AcademyData>;
  saveProgress(row: Progress): Promise<void>;
  favorite(lessonId: string, value: boolean): Promise<void>;
  lessonData(lessonId: string): Promise<{ note: string; comments: Comment[]; likes: Like[] }>;
  saveNote(lessonId: string, body: string): Promise<void>;
  comment(lessonId: string, body: string, parentId?: string): Promise<Comment>;
  editComment(id: string, body: string): Promise<void>;
  deleteComment(id: string): Promise<void>;
  like(id: string, value: boolean): Promise<void>;
  saveCourse(row: CourseInput): Promise<Course>;
  saveModule(row: ModuleInput): Promise<CourseModule>;
  saveLesson(row: LessonInput): Promise<Lesson>;
  remove(kind: "course" | "module" | "lesson", id: string): Promise<void>;
}

function checked<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

export function createAcademyRepo(userId: string): AcademyRepo {
  return {
    async load() {
      const [courses, modules, lessons, progress, favorites, admin] = await Promise.all([
        supabase.from("academy_courses").select("*").order("position"),
        supabase.from("academy_modules").select("*").order("position"),
        supabase.from("academy_lessons").select("*").order("position"),
        supabase.from("academy_progress").select("lesson_id,position_seconds,completed_at,last_watched_at").eq("user_id", userId),
        supabase.from("academy_favorites").select("lesson_id").eq("user_id", userId),
        supabase.rpc("is_lab_admin"),
      ]);
      return { courses: checked(courses) ?? [], modules: checked(modules) ?? [], lessons: checked(lessons) ?? [], progress: checked(progress) ?? [], favorites: (checked(favorites) ?? []).map((row) => row.lesson_id as string), admin: checked(admin) === true } as AcademyData;
    },
    async saveProgress(row) { checked(await supabase.from("academy_progress").upsert({ ...row, user_id: userId }, { onConflict: "user_id,lesson_id" })); },
    async favorite(lessonId, value) {
      checked(value ? await supabase.from("academy_favorites").upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" }) : await supabase.from("academy_favorites").delete().eq("user_id", userId).eq("lesson_id", lessonId));
    },
    async lessonData(lessonId) {
      const [notes, comments] = await Promise.all([
        supabase.from("academy_notes").select("body").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle(),
        supabase.from("academy_comments").select("*").eq("lesson_id", lessonId).order("created_at").limit(500),
      ]);
      const rows = (checked(comments) ?? []) as Comment[];
      const likes = rows.length ? checked(await supabase.from("academy_comment_likes").select("comment_id,user_id").in("comment_id", rows.map((c) => c.id))) ?? [] : [];
      return { note: checked(notes)?.body ?? "", comments: rows, likes: likes as Like[] };
    },
    async saveNote(lessonId, body) { checked(await supabase.from("academy_notes").upsert({ user_id: userId, lesson_id: lessonId, body, updated_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" })); },
    async comment(lessonId, body, parentId) { return checked(await supabase.from("academy_comments").insert({ lesson_id: lessonId, user_id: userId, body, parent_id: parentId ?? null }).select().single()) as Comment; },
    async editComment(id, body) { checked(await supabase.from("academy_comments").update({ body }).eq("id", id).eq("user_id", userId).select("id").single()); },
    async deleteComment(id) { checked(await supabase.from("academy_comments").delete().eq("id", id).select("id").single()); },
    async like(id, value) { checked(value ? await supabase.from("academy_comment_likes").insert({ comment_id: id, user_id: userId }) : await supabase.from("academy_comment_likes").delete().eq("comment_id", id).eq("user_id", userId)); },
    async saveCourse(row) { return checked(await supabase.from("academy_courses").upsert(row).select().single()) as Course; },
    async saveModule(row) { return checked(await supabase.from("academy_modules").upsert(row).select().single()) as CourseModule; },
    async saveLesson(row) { return checked(await supabase.from("academy_lessons").upsert(row).select().single()) as Lesson; },
    async remove(kind, id) { checked(await supabase.from({ course: "academy_courses", module: "academy_modules", lesson: "academy_lessons" }[kind]).delete().eq("id", id).select("id").single()); },
  };
}
