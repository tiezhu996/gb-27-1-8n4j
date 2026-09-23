import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Course, CourseType, CourseStatus } from '../../common/entities/course.entity';
import { CourseLesson } from '../../common/entities/course-lesson.entity';
import { CourseEnrollment, EnrollmentStatus } from '../../common/entities/course-enrollment.entity';
import { CourseReview } from '../../common/entities/course-review.entity';
import { UserRole } from '../../common/entities/user.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseLesson)
    private readonly lessonRepository: Repository<CourseLesson>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(CourseReview)
    private readonly reviewRepository: Repository<CourseReview>,
  ) {}

  private async attachReviewStats(courses: Course[]) {
    if (courses.length === 0) return courses;

    const stats = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.courseId', 'courseId')
      .addSelect('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('review.courseId IN (:...courseIds)', { courseIds: courses.map(c => c.id) })
      .groupBy('review.courseId')
      .getRawMany();

    const statsMap = new Map(
      stats.map((s: any) => [
        s.courseId,
        {
          averageRating: Math.round(Number(s.averageRating) * 10) / 10,
          reviewCount: Number(s.reviewCount),
        },
      ]),
    );

    courses.forEach(course => {
      const stat = statsMap.get(course.id);
      course.averageRating = stat?.averageRating ?? 0;
      course.reviewCount = stat?.reviewCount ?? 0;
    });

    return courses;
  }

  async findAll(query: { category?: string; tag?: string; type?: CourseType; keyword?: string }) {
    const where: any = { status: CourseStatus.PUBLISHED };
    
    if (query.category) where.category = query.category;
    if (query.type) where.type = query.type;
    if (query.keyword) where.name = Like(`%${query.keyword}%`);
    
    const courses = await this.courseRepository.find({
      where,
      relations: ['teacher'],
      order: { createdAt: 'DESC' },
    });
    
    if (query.tag) {
      const filtered = courses.filter(course =>
        course.tags && course.tags.includes(query.tag)
      );
      return this.attachReviewStats(filtered);
    }

    return this.attachReviewStats(courses);
  }

  async findMyCourses(userId: string, role: UserRole) {
    if (role === UserRole.TEACHER) {
      return this.courseRepository.find({
        where: { teacherId: userId },
        relations: ['teacher', 'lessons'],
        order: { createdAt: 'DESC' },
      });
    }
    
    if (role === UserRole.STUDENT) {
      const enrollments = await this.enrollmentRepository.find({
        where: { studentId: userId },
        relations: ['course', 'course.teacher'],
      });
      return enrollments.map(e => e.course);
    }
    
    return [];
  }

  async findOne(id: string) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['teacher', 'lessons'],
    });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    await this.attachReviewStats([course]);
    return course;
  }

  async create(userId: string, courseData: Partial<Course>) {
    const course = this.courseRepository.create({
      ...courseData,
      teacherId: userId,
      status: CourseStatus.DRAFT,
    });
    return this.courseRepository.save(course);
  }

  async update(userId: string, id: string, courseData: Partial<Course>) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    if (course.teacherId !== userId) {
      throw new ForbiddenException('无权修改此课程');
    }
    
    Object.assign(course, courseData);
    return this.courseRepository.save(course);
  }

  async publish(userId: string, id: string) {
    return this.update(userId, id, { status: CourseStatus.PUBLISHED });
  }

  async enroll(studentId: string, courseId: string) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });
    
    if (existingEnrollment) {
      return existingEnrollment;
    }
    
    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
      enrolledAt: new Date(),
    });
    
    return this.enrollmentRepository.save(enrollment);
  }

  async getEnrollment(studentId: string, courseId: string) {
    return this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });
  }

  async updateProgress(studentId: string, courseId: string, progress: number) {
    if (typeof progress !== 'number' || Number.isNaN(progress) || progress < 0 || progress > 100) {
      throw new BadRequestException('进度必须是 0 到 100 之间的数值');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });
    if (!enrollment) {
      throw new ForbiddenException('请先报名该课程');
    }

    // 进度只能向前推进
    if (progress > Number(enrollment.progress)) {
      enrollment.progress = progress;
    }
    if (Number(enrollment.progress) >= 100) {
      enrollment.progress = 100;
      enrollment.status = EnrollmentStatus.COMPLETED;
    }

    return this.enrollmentRepository.save(enrollment);
  }

  async createLesson(userId: string, courseId: string, lessonData: Partial<CourseLesson>) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    if (course.teacherId !== userId) {
      throw new ForbiddenException('无权操作此课程');
    }
    
    const maxOrder = await this.lessonRepository
      .createQueryBuilder('lesson')
      .where('lesson.courseId = :courseId', { courseId })
      .select('MAX(lesson.order)', 'max')
      .getRawOne();
    
    const lesson = this.lessonRepository.create({
      ...lessonData,
      courseId,
      order: (maxOrder?.max || 0) + 1,
    });
    
    return this.lessonRepository.save(lesson);
  }

  async findLesson(id: string) {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });
    if (!lesson) {
      throw new NotFoundException('课时不存在');
    }
    return lesson;
  }
}
