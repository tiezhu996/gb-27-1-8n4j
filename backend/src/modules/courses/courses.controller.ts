import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CourseReviewsService } from './course-reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CourseType } from '../../common/entities/course.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly reviewsService: CourseReviewsService,
  ) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('type') type?: CourseType,
    @Query('keyword') keyword?: string,
  ) {
    return this.coursesService.findAll({ category, tag, type, keyword });
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMyCourses(@Request() req) {
    return this.coursesService.findMyCourses(req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() courseData: any) {
    return this.coursesService.create(req.user.id, courseData);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() courseData: any, @Request() req) {
    return this.coursesService.update(req.user.id, id, courseData);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  publish(@Param('id') id: string, @Request() req) {
    return this.coursesService.publish(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/enroll')
  enroll(@Param('id') courseId: string, @Request() req) {
    return this.coursesService.enroll(req.user.id, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/enrollment')
  getEnrollment(@Param('id') courseId: string, @Request() req) {
    return this.coursesService.getEnrollment(req.user.id, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/progress')
  updateProgress(
    @Param('id') courseId: string,
    @Body() body: UpdateProgressDto,
    @Request() req,
  ) {
    return this.coursesService.updateProgress(req.user.id, courseId, body.progress);
  }

  @Get(':id/reviews')
  findReviews(@Param('id') courseId: string) {
    return this.reviewsService.findByCourse(courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/reviews/me')
  findMyReview(@Param('id') courseId: string, @Request() req) {
    return this.reviewsService.findMyReview(req.user.id, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reviews')
  submitReview(
    @Param('id') courseId: string,
    @Body() body: CreateReviewDto,
    @Request() req,
  ) {
    return this.reviewsService.createOrUpdate(req.user.id, req.user.role, courseId, body.rating, body.comment);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reviews/:reviewId/reply')
  replyReview(
    @Param('reviewId') reviewId: string,
    @Body() body: ReplyReviewDto,
    @Request() req,
  ) {
    return this.reviewsService.reply(req.user.id, reviewId, body.reply);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/lessons')
  createLesson(
    @Param('id') courseId: string,
    @Body() lessonData: any,
    @Request() req,
  ) {
    return this.coursesService.createLesson(req.user.id, courseId, lessonData);
  }

  @UseGuards(JwtAuthGuard)
  @Get('lessons/:lessonId')
  findLesson(@Param('lessonId') lessonId: string) {
    return this.coursesService.findLesson(lessonId);
  }
}
