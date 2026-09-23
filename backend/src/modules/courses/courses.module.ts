import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../../common/entities/course.entity';
import { CourseLesson } from '../../common/entities/course-lesson.entity';
import { CourseEnrollment } from '../../common/entities/course-enrollment.entity';
import { CourseReview } from '../../common/entities/course-review.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CourseReviewsService } from './course-reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseLesson, CourseEnrollment, CourseReview])],
  controllers: [CoursesController],
  providers: [CoursesService, CourseReviewsService],
  exports: [CoursesService],
})
export class CoursesModule {}
