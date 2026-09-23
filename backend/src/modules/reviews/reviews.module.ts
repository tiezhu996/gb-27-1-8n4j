import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseReview } from '../../common/entities/course-review.entity';
import { Course } from '../../common/entities/course.entity';
import { CourseEnrollment } from '../../common/entities/course-enrollment.entity';
import { CourseReviewsController, ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseReview, Course, CourseEnrollment])],
  controllers: [CourseReviewsController, ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
