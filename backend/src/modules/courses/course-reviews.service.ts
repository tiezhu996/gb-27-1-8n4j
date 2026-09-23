import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseReview } from '../../common/entities/course-review.entity';
import { Course } from '../../common/entities/course.entity';
import { CourseEnrollment } from '../../common/entities/course-enrollment.entity';
import { UserRole } from '../../common/entities/user.entity';

@Injectable()
export class CourseReviewsService {
  constructor(
    @InjectRepository(CourseReview)
    private readonly reviewRepository: Repository<CourseReview>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
  ) {}

  async createOrUpdate(studentId: string, studentRole: UserRole, courseId: string, rating: number, comment: string) {
    if (studentRole !== UserRole.STUDENT) {
      throw new ForbiddenException('只有学生可以评价课程');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('评分只能取 1 到 5 的整数');
    }
    if (typeof comment !== 'string' || !comment.trim()) {
      throw new BadRequestException('评价内容不能为空');
    }

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });
    if (!enrollment) {
      throw new ForbiddenException('只有已报名该课程的学生才能评价');
    }
    if (Number(enrollment.progress) < 100) {
      throw new ForbiddenException('课程进度达到 100% 后才能评价');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: { studentId, courseId },
    });

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment.trim();
      return this.reviewRepository.save(existingReview);
    }

    const review = this.reviewRepository.create({
      studentId,
      courseId,
      rating,
      comment: comment.trim(),
    });
    return this.reviewRepository.save(review);
  }

  async findByCourse(courseId: string) {
    const reviews = await this.reviewRepository.find({
      where: { courseId },
      relations: ['student'],
      order: { createdAt: 'DESC' },
    });
    // 不向客户端暴露学生敏感信息
    return reviews.map(({ student, ...review }) => ({
      ...review,
      student: student
        ? { id: student.id, name: student.name, avatar: student.avatar }
        : null,
    }));
  }

  async findMyReview(studentId: string, courseId: string) {
    return this.reviewRepository.findOne({
      where: { studentId, courseId },
    });
  }

  async reply(teacherId: string, reviewId: string, reply: string) {
    if (typeof reply !== 'string' || !reply.trim()) {
      throw new BadRequestException('回复内容不能为空');
    }

    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['course'],
    });
    if (!review) {
      throw new NotFoundException('评价不存在');
    }
    if (review.course.teacherId !== teacherId) {
      throw new ForbiddenException('只能回复本人课程的评价');
    }
    if (review.reply) {
      throw new BadRequestException('该评价已回复，不能重复回复');
    }

    review.reply = reply.trim();
    review.repliedAt = new Date();
    return this.reviewRepository.save(review);
  }
}
