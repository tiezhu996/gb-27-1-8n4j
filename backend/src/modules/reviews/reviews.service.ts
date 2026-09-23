import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseReview } from '../../common/entities/course-review.entity';
import { Course } from '../../common/entities/course.entity';
import { CourseEnrollment } from '../../common/entities/course-enrollment.entity';
import { UserRole } from '../../common/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CourseReview)
    private readonly reviewRepository: Repository<CourseReview>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
  ) {}

  private buildSummary(reviews: CourseReview[]) {
    const count = reviews.length;
    const averageRating =
      count > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
        : 0;
    return { averageRating, count };
  }

  async findByCourse(courseId: string) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    const reviews = await this.reviewRepository.find({
      where: { courseId },
      relations: ['student'],
      order: { createdAt: 'DESC' },
    });

    return {
      ...this.buildSummary(reviews),
      list: reviews,
    };
  }

  async findMyReview(studentId: string, courseId: string) {
    return this.reviewRepository.findOne({
      where: { studentId, courseId },
    });
  }

  async submitReview(user: { id: string; role: UserRole }, courseId: string, rating: number, comment: string) {
    const content = (comment || '').trim();
    if (!content) {
      throw new BadRequestException('评价内容不能为空');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('评分只能取1到5的整数');
    }
    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('只有学生可以评价课程');
    }
    const studentId = user.id;

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });
    if (!enrollment) {
      throw new ForbiddenException('只有报名该课程后才能评价');
    }
    if (Number(enrollment.progress) < 100) {
      throw new ForbiddenException('完成全部课程（进度100%）后才能评价');
    }

    const existing = await this.reviewRepository.findOne({
      where: { studentId, courseId },
    });

    // 同一学生再次提交只更新本人评价，不新增第二条（教师回复保留）
    if (existing) {
      existing.rating = rating;
      existing.comment = content;
      return this.reviewRepository.save(existing);
    }

    const review = this.reviewRepository.create({
      studentId,
      courseId,
      rating,
      comment: content,
    });
    return this.reviewRepository.save(review);
  }

  async replyReview(user: { id: string; role: UserRole }, reviewId: string, reply: string) {
    const content = (reply || '').trim();
    if (!content) {
      throw new BadRequestException('回复内容不能为空');
    }

    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['course'],
    });
    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    if (user.role !== UserRole.TEACHER || review.course.teacherId !== user.id) {
      throw new ForbiddenException('只能回复本人课程的评价');
    }
    if (review.teacherReply) {
      throw new BadRequestException('该评价已回复，不能重复回复');
    }

    review.teacherReply = content;
    review.teacherRepliedAt = new Date();
    return this.reviewRepository.save(review);
  }
}
