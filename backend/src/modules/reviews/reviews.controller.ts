import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

@Controller('courses/:courseId/reviews')
export class CourseReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findByCourse(@Param('courseId') courseId: string) {
    return this.reviewsService.findByCourse(courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMyReview(
    @Param('courseId') courseId: string,
    @Request() req,
  ) {
    return this.reviewsService.findMyReview(req.user.id, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  submit(
    @Param('courseId') courseId: string,
    @Body() dto: CreateReviewDto,
    @Request() req,
  ) {
    return this.reviewsService.submitReview(req.user, courseId, dto.rating, dto.comment);
  }
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/reply')
  reply(
    @Param('id') reviewId: string,
    @Body() dto: ReplyReviewDto,
    @Request() req,
  ) {
    return this.reviewsService.replyReview(req.user, reviewId, dto.reply);
  }
}
