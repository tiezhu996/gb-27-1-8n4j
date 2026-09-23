export enum CourseType {
  FREE = 'free',
  PAID = 'paid',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export interface Course {
  id: string;
  name: string;
  cover: string;
  description: string;
  type: CourseType;
  price: number;
  category: string;
  tags: string[];
  status: CourseStatus;
  teacherId: string;
  teacher?: any;
  lessons?: CourseLesson[];
  averageRating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseReview {
  id: string;
  courseId: string;
  studentId: string;
  rating: number;
  comment: string;
  teacherReply?: string | null;
  teacherRepliedAt?: Date | null;
  student?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseReviewSummary {
  averageRating: number;
  count: number;
  list: CourseReview[];
}

export interface CourseLesson {
  id: string;
  title: string;
  description?: string;
  duration: number;
  order: number;
  videoUrl?: string;
  coursewareUrl?: string;
  isLive: boolean;
  liveStartTime?: Date;
  liveEndTime?: Date;
  isRecordingGenerated: boolean;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  progress: number;
  status: string;
  enrolledAt?: Date;
  course?: Course;
}
