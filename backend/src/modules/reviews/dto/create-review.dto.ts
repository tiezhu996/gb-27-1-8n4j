import { IsInt, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: '课程内容很充实，老师讲得很好！' })
  @IsString()
  comment: string;
}
