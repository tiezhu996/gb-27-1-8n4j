import { api } from './index';
import { Course, CourseLesson, CourseEnrollment, CourseReview, CourseType } from '@/types/course';

export const courseApi = {
  list: (params?: { category?: string; tag?: string; type?: CourseType; keyword?: string }) =>
    api.get<Course[]>('/courses', { params }).then(res => res.data),
  getMyCourses: () => api.get<Course[]>('/courses/my').then(res => res.data),
  get: (id: string) => api.get<Course>(`/courses/${id}`).then(res => res.data),
  create: (data: Partial<Course>) => api.post<Course>('/courses', data).then(res => res.data),
  update: (id: string, data: Partial<Course>) => api.put<Course>(`/courses/${id}`, data).then(res => res.data),
  publish: (id: string) => api.post<Course>(`/courses/${id}/publish`).then(res => res.data),
  enroll: (id: string) => api.post<CourseEnrollment>(`/courses/${id}/enroll`).then(res => res.data),
  getEnrollment: (id: string) => api.get<CourseEnrollment | null>(`/courses/${id}/enrollment`).then(res => res.data),
  updateProgress: (id: string, progress: number) =>
    api.post<CourseEnrollment>(`/courses/${id}/progress`, { progress }).then(res => res.data),
  createLesson: (courseId: string, data: Partial<CourseLesson>) =>
    api.post<CourseLesson>(`/courses/${courseId}/lessons`, data).then(res => res.data),
  getLesson: (lessonId: string) => api.get<CourseLesson>(`/courses/lessons/${lessonId}`).then(res => res.data),
  getReviews: (courseId: string) =>
    api.get<CourseReview[]>(`/courses/${courseId}/reviews`).then(res => res.data),
  getMyReview: (courseId: string) =>
    api.get<CourseReview | null>(`/courses/${courseId}/reviews/me`).then(res => res.data),
  submitReview: (courseId: string, data: { rating: number; comment: string }) =>
    api.post<CourseReview>(`/courses/${courseId}/reviews`, data).then(res => res.data),
  replyReview: (reviewId: string, reply: string) =>
    api.post(`/courses/reviews/${reviewId}/reply`, { reply }).then(res => res.data),
};
